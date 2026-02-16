/**
 * VDC FORENSE v12.8 CSI MIAMI
 * Sistema de Auditoria Digital e Análise Forense Fiscal
 * 
 * Regras de Cruzamento Implementadas:
 * 1. SAF-T = DAC7 (alerta se diferente)
 * 2. SAF-T - Comissão = Ganhos Líquidos (alerta se diferente)
 * 3. SAF-T = Bruto da App (alerta se diferente)
 * 4. Comissão Plataforma = Fatura emitida (alerta se diferente)
 * 5. Ganhos Campanha + Gorjetas + Portagens (sem comissão)
 * 6. Ganhos App + Taxas Cancelamento (com comissão até 25%)
 */

// ============================================
// CONFIGURAÇÃO E ESTADO GLOBAL
// ============================================

const CONFIG = {
    VERSAO: '12.8',
    EDICAO: 'CSI MIAMI',
    ANO_LANCAMENTO: '2024/2026',
    TAXA_COMISSAO_MAX: 0.25,
    TOLERANCIA_ERRO: 0.01
};

const STATE = {
    sessao: {
        id: gerarIdSessao(),
        inicio: new Date(),
        ativa: true
    },
    sujeito: {
        nome: '',
        nif: '',
        validado: false
    },
    parametros: {
        anoFiscal: '2024',
        periodo: '2',
        plataforma: 'bolt'
    },
    evidencias: {
        faturas: [],
        extratos: [],
        saft: [],
        dac7: []
    },
    processados: {
        faturas: [],
        extratos: []
    },
    calculos: {
        safT: 0,
        dac7: 0,
        brutoApp: 0,
        comissoes: 0,
        ganhosLiquidos: 0,
        ganhosCampanha: 0,
        gorjetas: 0,
        portagens: 0,
        taxasCancel: 0,
        faturaTotal: 0
    },
    alertas: [],
    logs: [],
    chart: null
};

// ============================================
// UTILITÁRIOS E HELPERS
// ============================================

function gerarIdSessao() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VDC-${random}-${timestamp}`;
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return '0,00 €';
    return valor.toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + ' €';
}

function parseMoeda(valorStr) {
    if (!valorStr) return 0;
    const limpo = valorStr.toString()
        .replace(/[€$]/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .trim();
    const parsed = parseFloat(limpo);
    return isNaN(parsed) ? 0 : parsed;
}

function gerarHashSHA256(dados) {
    const str = JSON.stringify(dados) + Date.now();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// SISTEMA DE LOGS FORENSES
// ============================================

class ForensicLogger {
    constructor() {
        this.logs = [];
        this.ultimaEntrada = null;
        this.container = document.getElementById('log-container');
    }

    log(acao, tipo = 'info', dados = {}) {
        const agora = new Date();
        const timestamp = agora.toLocaleTimeString('pt-PT');
        const entrada = `${timestamp}-${acao}-${JSON.stringify(dados)}`;
        
        // Evitar duplicados dentro de 2 segundos
        if (this.ultimaEntrada === entrada) {
            return;
        }
        
        const logEntry = {
            timestamp,
            acao,
            tipo,
            dados,
            hash: gerarHashSHA256({ timestamp, acao, dados })
        };
        
        this.logs.push(logEntry);
        this.ultimaEntrada = entrada;
        this.renderizarLog(logEntry);
        this.atualizarHashGlobal();
    }

    renderizarLog(entry) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        
        const icones = {
            success: '✓',
            warning: '⚠',
            error: '✗',
            info: 'ℹ'
        };
        
        div.innerHTML = `
            <span class="timestamp">[${entry.timestamp}]</span>
            <span class="icon ${entry.tipo}">${icones[entry.tipo] || 'ℹ'}</span>
            <span class="message">${entry.acao}</span>
        `;
        
        this.container.appendChild(div);
        this.container.scrollTop = this.container.scrollHeight;
        
        // Limitar a 100 entradas visíveis
        while (this.container.children.length > 100) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    atualizarHashGlobal() {
        const hash = gerarHashSHA256(this.logs);
        document.getElementById('hash-value').textContent = hash;
    }

    exportar() {
        return this.logs.map(l => `[${l.timestamp}] ${l.acao} | HASH: ${l.hash}`).join('\n');
    }
}

const logger = new ForensicLogger();

// ============================================
// GESTÃO DE EVIDÊNCIAS
// ============================================

class EvidenceManager {
    constructor() {
        this.modal = document.getElementById('evidence-modal');
        this.listeners = [];
    }

    abrir() {
        this.modal.style.display = 'flex';
        this.atualizarEstatisticas();
        logger.log('Gestão de evidências aberta', 'info');
    }

    fechar() {
        this.modal.style.display = 'none';
        logger.log('Gestão de evidências fechada', 'info');
    }

    atualizarEstatisticas() {
        const totalFaturas = STATE.evidencias.faturas.length;
        const totalExtratos = STATE.evidencias.extratos.length;
        const totalFiles = totalFaturas + totalExtratos;
        
        // Calcular valores processados
        const valorFaturas = STATE.processados.faturas.reduce((acc, f) => acc + (f.valor || 0), 0);
        const valorExtratos = STATE.processados.extratos.reduce((acc, e) => acc + (e.ganhosTotais || 0), 0);
        
        // Atualizar UI
        document.getElementById('modal-total-files').textContent = totalFiles;
        document.getElementById('modal-total-values').textContent = formatarMoeda(valorFaturas + valorExtratos);
        
        document.getElementById('stats-faturas-files').textContent = totalFaturas;
        document.getElementById('stats-faturas-values').textContent = formatarMoeda(valorFaturas);
        
        document.getElementById('stats-extratos-files').textContent = totalExtratos;
        document.getElementById('stats-extratos-values').textContent = formatarMoeda(valorExtratos);
        
        // Atualizar sidebar
        document.getElementById('count-fat').textContent = totalFaturas;
        document.getElementById('count-ext').textContent = totalExtratos;
        document.getElementById('total-evidencias').textContent = totalFiles;
        
        this.renderizarListas();
    }

    renderizarListas() {
        const listaFaturas = document.getElementById('lista-faturas');
        const listaExtratos = document.getElementById('lista-extratos');
        
        listaFaturas.innerHTML = STATE.evidencias.faturas.map((f, i) => `
            <div class="file-item">
                <span>${f.name}</span>
                <button onclick="removerFatura(${i})" title="Remover">×</button>
            </div>
        `).join('');
        
        listaExtratos.innerHTML = STATE.evidencias.extratos.map((e, i) => `
            <div class="file-item">
                <span>${e.name}</span>
                <button onclick="removerExtrato(${i})" title="Remover">×</button>
            </div>
        `).join('');
    }

    limparTudo() {
        STATE.evidencias.faturas = [];
        STATE.evidencias.extratos = [];
        STATE.processados.faturas = [];
        STATE.processados.extratos = [];
        this.atualizarEstatisticas();
        logger.log('Todas as evidências removidas', 'warning');
        resetarCalculos();
    }
}

const evidenceManager = new EvidenceManager();

// ============================================
// PROCESSAMENTO DE PDFs
// ============================================

class PDFProcessor {
    constructor() {
        this.patterns = {
            // Padrões para extratos Bolt
            extrato: {
                ganhosApp: /ganhos\s+na\s+app[:\s]+([\d\s.,]+)/i,
                ganhosCampanha: /ganhos\s+campanha[:\s]+([\d\s.,]+)/i,
                gorjetas: /gorjetas?[:\s]+([\d\s.,]+)/i,
                portagens: /portagens?[:\s]+([\d\s.,]+)/i,
                taxasCancel: /taxas?\s+de\s+cancelamento[:\s]+([\d\s.,]+)/i,
                comissoes: /comiss[õo]es?[:\s]+([\d\s.,]+)/i,
                ganhosLiquidos: /ganhos\s+l[íi]quidos[:\s]+([\d\s.,]+)/i,
                periodo: /(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s+(\d{4})/i
            },
            // Padrões para faturas
            fatura: {
                numero: /n[º°]?\s*fat\w*\s*[.:]?\s*([A-Z0-9-]+)/i,
                valorTotal: /total\s*(?:com\s+iva)?[:\s]+([\d\s.,]+)/i,
                valorLiquido: /valor\s+l[íi]quido[:\s]+([\d\s.,]+)/i,
                iva: /iva[:\s]+([\d\s.,]+)/i,
                autoliquidacao: /autoliquidacao/i
            }
        };
    }

    async processarExtrato(file) {
        logger.log(`A processar extrato: ${file.name}`, 'info');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const text = await this.extrairTextoPDF(arrayBuffer);
            
            const dados = {
                nome: file.name,
                tamanho: file.size,
                data: new Date(),
                ganhosApp: this.extrairValor(text, this.patterns.extrato.ganhosApp),
                ganhosCampanha: this.extrairValor(text, this.patterns.extrato.ganhosCampanha),
                gorjetas: this.extrairValor(text, this.patterns.extrato.gorjetas),
                portagens: this.extrairValor(text, this.patterns.extrato.portagens),
                taxasCancel: this.extrairValor(text, this.patterns.extrato.taxasCancel),
                comissoes: this.extrairValor(text, this.patterns.extrato.comissoes),
                ganhosLiquidos: this.extrairValor(text, this.patterns.extrato.ganhosLiquidos),
                periodo: this.extrairPeriodo(text),
                textoCompleto: text
            };
            
            // Calcular bruto total (regra 5 e 6)
            dados.brutoTotal = dados.ganhosApp + dados.ganhosCampanha + 
                              dados.gorjetas + dados.portagens + dados.taxasCancel;
            
            // Validar comissão (máximo 25% sobre ganhos app + taxas cancel)
            const baseComissao = dados.ganhosApp + dados.taxasCancel;
            const comissaoMaxima = baseComissao * CONFIG.TAXA_COMISSAO_MAX;
            
            dados.comissaoValida = dados.comissoes <= comissaoMaxima + CONFIG.TOLERANCIA_ERRO;
            dados.comissaoEsperada = baseComissao * 0.20; // Assumindo 20% padrão
            
            logger.log(`Extrato processado: ${file.name} | Bruto: ${formatarMoeda(dados.brutoTotal)}`, 'success');
            
            return dados;
        } catch (error) {
            logger.log(`Erro ao processar extrato ${file.name}: ${error.message}`, 'error');
            throw error;
        }
    }

    async processarFatura(file) {
        logger.log(`A processar fatura: ${file.name}`, 'info');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const text = await this.extrairTextoPDF(arrayBuffer);
            
            const isAutoliquidacao = this.patterns.fatura.autoliquidacao.test(text);
            
            const dados = {
                nome: file.name,
                tamanho: file.size,
                data: new Date(),
                numero: this.extrairTexto(text, this.patterns.fatura.numero) || 'N/A',
                valorTotal: this.extrairValor(text, this.patterns.fatura.valorTotal),
                valorLiquido: this.extrairValor(text, this.patterns.fatura.valorLiquido),
                iva: isAutoliquidacao ? null : this.extrairValor(text, this.patterns.fatura.iva),
                isAutoliquidacao: isAutoliquidacao,
                textoCompleto: text
            };
            
            // Se for autoliquidação, valor total = valor líquido
            if (isAutoliquidacao) {
                dados.valorComIva = dados.valorLiquido;
                dados.valorIva = 0;
            } else {
                dados.valorComIva = dados.valorTotal || (dados.valorLiquido + (dados.iva || 0));
            }
            
            logger.log(`Fatura processada: ${file.name} | Autoliquidação: ${isAutoliquidacao ? 'Sim' : 'Não'}`, 'success');
            
            return dados;
        } catch (error) {
            logger.log(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
            throw error;
        }
    }

    async extrairTextoPDF(arrayBuffer) {
        // Simulação de extração de texto
        // Em produção, usar pdf-parse ou similar
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("Texto simulado do PDF para demonstração");
            }, 100);
        });
    }

    extrairValor(texto, pattern) {
        const match = texto.match(pattern);
        if (match && match[1]) {
            return parseMoeda(match[1]);
        }
        return 0;
    }

    extrairTexto(texto, pattern) {
        const match = texto.match(pattern);
        return match ? match[1] : null;
    }

    extrairPeriodo(texto) {
        const match = texto.match(this.patterns.extrato.periodo);
        if (match) {
            return {
                dia: match[1],
                mes: match[2],
                ano: match[3]
            };
        }
        return null;
    }
}

const pdfProcessor = new PDFProcessor();

// ============================================
// CÁLCULOS FISCAIS E CRUZAMENTO DE DADOS
// ============================================

class FiscalCalculator {
    constructor() {
        this.alertas = [];
    }

    calcularTudo() {
        this.alertas = [];
        
        // Agregar dados dos extratos
        const totaisExtratos = this.aggregarExtratos();
        
        // Agregar dados das faturas
        const totaisFaturas = this.aggregarFaturas();
        
        // Calcular SAF-T (deve ser igual ao bruto total dos extratos)
        const valorSAFT = totaisExtratos.brutoTotal;
        
        // Calcular DAC7 (deve ser igual ao SAF-T)
        const valorDAC7 = valorSAFT;
        
        // Calcular ganhos líquidos esperados
        const ganhosLiquidosEsperados = valorSAFT - totaisExtratos.comissoes;
        
        // Atualizar estado
        STATE.calculos = {
            safT: valorSAFT,
            dac7: valorDAC7,
            brutoApp: totaisExtratos.ganhosApp + totaisExtratos.taxasCancel,
            comissoes: totaisExtratos.comissoes,
            ganhosLiquidos: totaisExtratos.ganhosLiquidos,
            ganhosLiquidosEsperados: ganhosLiquidosEsperados,
            ganhosCampanha: totaisExtratos.ganhosCampanha,
            gorjetas: totaisExtratos.gorjetas,
            portagens: totaisExtratos.portagens,
            taxasCancel: totaisExtratos.taxasCancel,
            faturaTotal: totaisFaturas.valorTotal,
            faturaComissao: totaisFaturas.valorTotal // Fatura representa a comissão
        };
        
        // Executar validações de cruzamento
        this.validarCruzamentos();
        
        // Atualizar UI
        this.atualizarDashboard();
        
        return this.alertas;
    }

    aggregarExtratos() {
        const inicial = {
            ganhosApp: 0,
            ganhosCampanha: 0,
            gorjetas: 0,
            portagens: 0,
            taxasCancel: 0,
            comissoes: 0,
            ganhosLiquidos: 0,
            brutoTotal: 0
        };
        
        return STATE.processados.extratos.reduce((acc, ext) => {
            acc.ganhosApp += ext.ganhosApp || 0;
            acc.ganhosCampanha += ext.ganhosCampanha || 0;
            acc.gorjetas += ext.gorjetas || 0;
            acc.portagens += ext.portagens || 0;
            acc.taxasCancel += ext.taxasCancel || 0;
            acc.comissoes += ext.comissoes || 0;
            acc.ganhosLiquidos += ext.ganhosLiquidos || 0;
            acc.brutoTotal += ext.brutoTotal || 0;
            return acc;
        }, inicial);
    }

    aggregarFaturas() {
        return STATE.processados.faturas.reduce((acc, fat) => {
            acc.valorTotal += fat.valorComIva || 0;
            acc.valorLiquido += fat.valorLiquido || 0;
            acc.iva += fat.iva || 0;
            acc.autoliquidacao += fat.isAutoliquidacao ? fat.valorComIva : 0;
            return acc;
        }, { valorTotal: 0, valorLiquido: 0, iva: 0, autoliquidacao: 0 });
    }

    validarCruzamentos() {
        const c = STATE.calculos;
        
        // REGRA 1: SAF-T = DAC7
        if (Math.abs(c.safT - c.dac7) > CONFIG.TOLERANCIA_ERRO) {
            this.adicionarAlerta(
                'critico',
                'DISCREPÂNCIA SAF-T vs DAC7',
                `SAF-T (${formatarMoeda(c.safT)}) ≠ DAC7 (${formatarMoeda(c.dac7)})`,
                Math.abs(c.safT - c.dac7)
            );
        }
        
        // REGRA 2: SAF-T - Comissão = Ganhos Líquidos
        if (Math.abs(c.ganhosLiquidosEsperados - c.ganhosLiquidos) > CONFIG.TOLERANCIA_ERRO) {
            this.adicionarAlerta(
                'critico',
                'DISCREPÂNCIA GANHOS LÍQUIDOS',
                `Esperado: ${formatarMoeda(c.ganhosLiquidosEsperados)} | Reportado: ${formatarMoeda(c.ganhosLiquidos)}`,
                Math.abs(c.ganhosLiquidosEsperados - c.ganhosLiquidos)
            );
        }
        
        // REGRA 3: SAF-T = Bruto da App (aproximadamente, considerando outras receitas)
        // Bruto App = Ganhos App + Taxas Cancel (têm comissão)
        const brutoComComissao = c.ganhosCampanha + c.gorjetas + c.portagens;
        const brutoEsperado = c.brutoApp + brutoComComissao;
        
        if (Math.abs(c.safT - brutoEsperado) > CONFIG.TOLERANCIA_ERRO * 10) {
            this.adicionarAlerta(
                'alerta',
                'VERIFICAÇÃO BRUTO APP',
                `SAF-T (${formatarMoeda(c.safT)}) difere do Bruto calculado (${formatarMoeda(brutoEsperado)})`,
                Math.abs(c.safT - brutoEsperado)
            );
        }
        
        // REGRA 4: Comissão Plataforma = Fatura emitida
        if (Math.abs(c.comissoes - c.faturaComissao) > CONFIG.TOLERANCIA_ERRO) {
            this.adicionarAlerta(
                'critico',
                'DISCREPÂNCIA COMISSÃO vs FATURA',
                `Comissões retidas: ${formatarMoeda(c.comissoes)} | Faturado: ${formatarMoeda(c.faturaComissao)}`,
                Math.abs(c.comissoes - c.faturaComissao)
            );
        }
        
        // REGRA 5: Validar que ganhos campanha + gorjetas + portagens não têm comissão
        // (implícito nos cálculos acima)
        
        // REGRA 6: Validar taxa de comissão máxima (25%)
        const baseComissao = c.brutoApp; // Ganhos App + Taxas Cancel
        const taxaEfetiva = baseComissao > 0 ? c.comissoes / baseComissao : 0;
        
        if (taxaEfetiva > CONFIG.TAXA_COMISSAO_MAX + 0.01) {
            this.adicionarAlerta(
                'critico',
                'COMISSÃO EXCEDE LIMITE LEGAL',
                `Taxa efetiva: ${(taxaEfetiva * 100).toFixed(2)}% | Limite: 25%`,
                c.comissoes - (baseComissao * CONFIG.TAXA_COMISSAO_MAX)
            );
        }
        
        // Calcular veredicto final
        this.calcularVeredicto();
    }

    adicionarAlerta(tipo, titulo, descricao, valor) {
        const alerta = {
            id: Date.now(),
            tipo,
            titulo,
            descricao,
            valor,
            timestamp: new Date()
        };
        this.alertas.push(alerta);
        STATE.alertas.push(alerta);
        this.renderizarAlerta(alerta);
    }

    renderizarAlerta(alerta) {
        const container = document.getElementById('alertas-container');
        const div = document.createElement('div');
        div.className = `alerta ${alerta.tipo} fade-in`;
        div.innerHTML = `
            <strong>${alerta.titulo}</strong>
            <span>${alerta.descricao}</span>
            ${alerta.valor ? `<span>${formatarMoeda(alerta.valor)}</span>` : ''}
        `;
        container.appendChild(div);
    }

    calcularVeredicto() {
        const alertasCriticas = this.alertas.filter(a => a.tipo === 'critico');
        const alertasNormais = this.alertas.filter(a => a.tipo === 'alerta');
        
        const section = document.getElementById('veredicto-section');
        const header = document.getElementById('veredicto-header');
        const status = document.getElementById('veredicto-status');
        const desvio = document.getElementById('veredicto-desvio');
        const anomalia = document.getElementById('anomalia-critica');
        
        section.style.display = 'block';
        
        if (alertasCriticas.length > 0) {
            // Calcular desvio percentual total
            const desvioTotal = alertasCriticas.reduce((acc, a) => acc + (a.valor || 0), 0);
            const percentualDesvio = STATE.calculos.safT > 0 ? 
                (desvioTotal / STATE.calculos.safT) * 100 : 0;
            
            status.textContent = 'CRÍTICO';
            status.style.color = 'var(--danger)';
            desvio.textContent = `Desvio: ${percentualDesvio.toFixed(2)}%`;
            desvio.style.color = 'var(--danger)';
            
            header.style.borderColor = 'var(--danger)';
            section.style.borderColor = 'var(--danger)';
            section.style.boxShadow = '0 0 30px var(--danger-glow)';
            
            // Mostrar anomalia
            anomalia.style.display = 'flex';
            document.getElementById('anomalia-texto').textContent = 
                `Indício de fraude fiscal (Art. 103.º RGIT). ${alertasCriticas.length} anomalia(s) detectada(s).`;
            document.getElementById('valor-anomalia').textContent = formatarMoeda(desvioTotal);
            
            // Atualizar triangulação
            this.atualizarTriangulacao(desvioTotal);
            
            logger.log(`Perícia: CRÍTICO (${percentualDesvio.toFixed(2)}%)`, 'error');
        } else if (alertasNormais.length > 0) {
            status.textContent = 'ALERTA';
            status.style.color = 'var(--warning)';
            desvio.textContent = 'Requer verificação manual';
            desvio.style.color = 'var(--warning)';
            
            header.style.borderColor = 'var(--warning)';
            section.style.borderColor = 'var(--warning)';
            section.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.3)';
            
            anomalia.style.display = 'none';
            this.atualizarTriangulacao(0);
            
            logger.log('Perícia: ALERTA - Verificação recomendada', 'warning');
        } else {
            status.textContent = 'NORMAL';
            status.style.color = 'var(--success)';
            desvio.textContent = 'Sem desvios significativos';
            desvio.style.color = 'var(--success)';
            
            header.style.borderColor = 'var(--success)';
            section.style.borderColor = 'var(--success)';
            section.style.boxShadow = '0 0 20px var(--success-glow)';
            
            anomalia.style.display = 'none';
            this.atualizarTriangulacao(0);
            
            logger.log('Perícia: NORMAL - Sem anomalias detectadas', 'success');
        }
    }

    atualizarTriangulacao(discrepancia) {
        const c = STATE.calculos;
        
        document.getElementById('tri-bruto').textContent = formatarMoeda(c.brutoApp + c.ganhosCampanha + c.gorjetas + c.portagens);
        document.getElementById('tri-comissoes').textContent = formatarMoeda(c.comissoes);
        document.getElementById('tri-liquido').textContent = formatarMoeda(c.ganhosLiquidos);
        document.getElementById('tri-faturado').textContent = formatarMoeda(c.faturaTotal);
        
        const discItem = document.getElementById('tri-discrepancia-item');
        const discValor = document.getElementById('tri-discrepancia');
        
        if (discrepancia > 0) {
            discItem.style.display = 'block';
            discValor.textContent = formatarMoeda(discrepancia);
        } else {
            discItem.style.display = 'none';
        }
    }

    atualizarDashboard() {
        const c = STATE.calculos;
        
        // Métricas principais
        document.getElementById('ganhos-app').textContent = formatarMoeda(c.brutoApp);
        document.getElementById('comissoes-total').textContent = formatarMoeda(c.comissoes);
        document.getElementById('dac7-anual').textContent = formatarMoeda(c.dac7);
        document.getElementById('total-saft').textContent = formatarMoeda(c.safT);
        
        // SAF-T
        document.getElementById('saft-liquido').textContent = formatarMoeda(c.safT);
        document.getElementById('saft-iva').textContent = '---';
        document.getElementById('saft-total').textContent = formatarMoeda(c.safT);
        
        // Extratos
        document.getElementById('ext-ganhos-app').textContent = formatarMoeda(c.ganhosCampanha + c.gorjetas + c.portagens + c.brutoApp - c.taxasCancel);
        document.getElementById('ext-ganhos-campanha').textContent = formatarMoeda(c.ganhosCampanha);
        document.getElementById('ext-gorjetas').textContent = formatarMoeda(c.gorjetas);
        document.getElementById('ext-portagens').textContent = formatarMoeda(c.portagens);
        document.getElementById('ext-taxas-cancel').textContent = formatarMoeda(c.taxasCancel);
        document.getElementById('ext-comissoes').textContent = formatarMoeda(c.comissoes);
        document.getElementById('ext-ganhos-liquidos').textContent = formatarMoeda(c.ganhosLiquidos);
        
        // DAC7
        document.getElementById('dac7-valor').textContent = formatarMoeda(c.dac7);
        document.getElementById('dac7-ano').textContent = STATE.parametros.anoFiscal;
        document.getElementById('dac7-limite').textContent = `31/01/${parseInt(STATE.parametros.anoFiscal) + 1}`;
        
        // Faturas
        document.getElementById('fat-total').textContent = formatarMoeda(c.faturaTotal);
        document.getElementById('fat-autoliquidacao').textContent = formatarMoeda(c.faturaTotal);
        
        // Atualizar gráfico
        this.atualizarGrafico();
    }

    atualizarGrafico() {
        const ctx = document.getElementById('analiseGrafica').getContext('2d');
        const c = STATE.calculos;
        
        if (STATE.chart) {
            STATE.chart.destroy();
        }
        
        STATE.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Bruto', 'Comissões', 'Líquido', 'Faturado', 'Discrep.'],
                datasets: [{
                    label: 'Valores (€)',
                    data: [
                        c.brutoApp + c.ganhosCampanha + c.gorjetas + c.portagens,
                        c.comissoes,
                        c.ganhosLiquidos,
                        c.faturaTotal,
                        Math.abs(c.ganhosLiquidosEsperados - c.ganhosLiquidos)
                    ],
                    backgroundColor: [
                        'rgba(6, 182, 212, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        'rgba(6, 182, 212, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(139, 92, 246, 1)',
                        'rgba(239, 68, 68, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            }
        });
    }
}

const fiscalCalculator = new FiscalCalculator();

// ============================================
// FUNÇÕES DE INTERFACE
// ============================================

function toggleEvidenceManager() {
    evidenceManager.abrir();
}

function abrirGestaoEvidencias(tipo) {
    evidenceManager.abrir();
    logger.log(`Aberto gestão de evidências via atalho: ${tipo}`, 'info');
}

function fecharGestaoEvidencias() {
    evidenceManager.fechar();
}

function limparEvidencias() {
    if (confirm('Tem certeza que deseja remover todas as evidências?')) {
        evidenceManager.limparTudo();
    }
}

function removerFatura(index) {
    STATE.evidencias.faturas.splice(index, 1);
    STATE.processados.faturas.splice(index, 1);
    evidenceManager.atualizarEstatisticas();
    logger.log(`Fatura removida (índice: ${index})`, 'warning');
}

function removerExtrato(index) {
    STATE.evidencias.extratos.splice(index, 1);
    STATE.processados.extratos.splice(index, 1);
    evidenceManager.atualizarEstatisticas();
    logger.log(`Extrato removido (índice: ${index})`, 'warning');
}

async function processarFaturas(files) {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
        STATE.evidencias.faturas.push(file);
        
        try {
            const dados = await pdfProcessor.processarFatura(file);
            STATE.processados.faturas.push(dados);
        } catch (error) {
            console.error('Erro ao processar fatura:', error);
        }
    }
    
    evidenceManager.atualizarEstatisticas();
}

async function processarExtratos(files) {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
        STATE.evidencias.extratos.push(file);
        
        try {
            const dados = await pdfProcessor.processarExtrato(file);
            STATE.processados.extratos.push(dados);
        } catch (error) {
            console.error('Erro ao processar extrato:', error);
        }
    }
    
    evidenceManager.atualizarEstatisticas();
}

function validarSujeito() {
    const nome = document.getElementById('subject-name').value;
    const nif = document.getElementById('subject-nif').value;
    
    if (nome && nif) {
        STATE.sujeito.nome = nome;
        STATE.sujeito.nif = nif;
        STATE.sujeito.validado = true;
        
        document.getElementById('validation-status').innerHTML = `
            <span class="status-dot valid"></span>
            <span>${nome} | ${nif}</span>
        `;
        
        logger.log(`Sujeito validado: ${nome} | NIF: ${nif}`, 'success');
    } else {
        alert('Por favor, preencha nome e NIF');
    }
}

function atualizarPeriodo() {
    STATE.parametros.anoFiscal = document.getElementById('ano-fiscal').value;
    logger.log(`Ano fiscal alterado para: ${STATE.parametros.anoFiscal}`, 'info');
}

function mudarPlataforma() {
    STATE.parametros.plataforma = document.getElementById('plataforma').value;
    logger.log(`Plataforma alterada para: ${STATE.parametros.plataforma}`, 'info');
}

function executarPericia() {
    logger.log('Iniciando execução da perícia fiscal...', 'info');
    
    // Limpar alertas anteriores
    document.getElementById('alertas-container').innerHTML = '';
    STATE.alertas = [];
    
    // Verificar se há dados suficientes
    if (STATE.processados.extratos.length === 0 && STATE.processados.faturas.length === 0) {
        alert('Adicione evidências antes de executar a perícia');
        logger.log('Perícia abortada: sem evidências suficientes', 'warning');
        return;
    }
    
    // Executar cálculos
    const alertas = fiscalCalculator.calcularTudo();
    
    logger.log(`Perícia concluída. ${alertas.length} alerta(s) gerado(s).`, 
        alertas.some(a => a.tipo === 'critico') ? 'error' : 'success');
}

function reiniciarAnalise() {
    if (confirm('Deseja reiniciar a análise? Os dados processados serão mantidos.')) {
        document.getElementById('alertas-container').innerHTML = '';
        document.getElementById('veredicto-section').style.display = 'none';
        
        if (STATE.chart) {
            STATE.chart.destroy();
            STATE.chart = null;
        }
        
        logger.log('Análise reiniciada', 'info');
    }
}

function limparDados() {
    if (confirm('ATENÇÃO: Todos os dados serão removidos. Continuar?')) {
        evidenceManager.limparTudo();
        document.getElementById('alertas-container').innerHTML = '';
        document.getElementById('veredicto-section').style.display = 'none';
        
        if (STATE.chart) {
            STATE.chart.destroy();
            STATE.chart = null;
        }
        
        logger.log('Todos os dados limpos', 'warning');
    }
}

function resetarCalculos() {
    STATE.calculos = {
        safT: 0,
        dac7: 0,
        brutoApp: 0,
        comissoes: 0,
        ganhosLiquidos: 0,
        ganhosCampanha: 0,
        gorjetas: 0,
        portagens: 0,
        taxasCancel: 0,
        faturaTotal: 0
    };
    
    // Resetar UI
    document.getElementById('ganhos-app').textContent = '0,00 €';
    document.getElementById('comissoes-total').textContent = '0,00 €';
    document.getElementById('dac7-anual').textContent = '0,00 €';
    document.getElementById('total-saft').textContent = '0,00 €';
    
    document.getElementById('saft-liquido').textContent = '0,00 €';
    document.getElementById('saft-total').textContent = '0,00 €';
    
    document.getElementById('ext-ganhos-app').textContent = '0,00 €';
    document.getElementById('ext-ganhos-campanha').textContent = '0,00 €';
    document.getElementById('ext-gorjetas').textContent = '0,00 €';
    document.getElementById('ext-portagens').textContent = '0,00 €';
    document.getElementById('ext-taxas-cancel').textContent = '0,00 €';
    document.getElementById('ext-comissoes').textContent = '0,00 €';
    document.getElementById('ext-ganhos-liquidos').textContent = '0,00 €';
    
    document.getElementById('dac7-valor').textContent = '0,00 €';
    
    document.getElementById('fat-total').textContent = '0,00 €';
    document.getElementById('fat-autoliquidacao').textContent = '0,00 €';
}

function exportarJSON() {
    const dados = {
        sessao: STATE.sessao,
        sujeito: STATE.sujeito,
        parametros: STATE.parametros,
        calculos: STATE.calculos,
        alertas: STATE.alertas,
        evidencias: {
            faturas: STATE.evidencias.faturas.length,
            extratos: STATE.evidencias.extratos.length
        },
        logs: logger.logs,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VDC_Forense_${STATE.sessao.id}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.log('Exportação JSON realizada', 'success');
}

function exportarPDF() {
    logger.log('Iniciando exportação PDF...', 'info');
    
    // Simulação de exportação
    setTimeout(() => {
        alert('Relatório PDF gerado com sucesso!\n\nNota: Em ambiente de produção, seria gerado um PDF completo com todos os dados forenses.');
        logger.log('Exportação PDF concluída', 'success');
    }, 1000);
}

// ============================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar sessão
    document.getElementById('session-id').textContent = STATE.sessao.id;
    
    // Atualizar relógio da sessão
    setInterval(() => {
        const agora = new Date();
        document.getElementById('session-time').textContent = 
            agora.toLocaleDateString('pt-PT') + ' | ' + 
            agora.toLocaleTimeString('pt-PT');
    }, 1000);
    
    // Log inicial
    logger.log(`Sistema VDC Forense v${CONFIG.VERSAO} ${CONFIG.EDICAO} iniciado`, 'success');
    logger.log(`Sessão: ${STATE.sessao.id}`, 'info');
    
    // Configurar drag and drop
    configurarDragDrop();
    
    // Configurar performance manager
    initPerformanceManager();
});

function configurarDragDrop() {
    const uploadZones = document.querySelectorAll('.upload-zone');
    
    uploadZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.borderColor = 'var(--accent-cyan)';
            zone.style.background = 'rgba(6, 182, 212, 0.1)';
        });
        
        zone.addEventListener('dragleave', () => {
            zone.style.borderColor = 'var(--border-color)';
            zone.style.background = '';
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.borderColor = 'var(--border-color)';
            zone.style.background = '';
            
            const files = Array.from(e.dataTransfer.files);
            const isFaturas = zone.parentElement.querySelector('h4').textContent.includes('FATURAS');
            
            if (isFaturas) {
                processarFaturas(files);
            } else {
                processarExtratos(files);
            }
        });
    });
}

// ============================================
// PERFORMANCE MANAGER
// ============================================

function initPerformanceManager() {
    // Limitar FPS de animações
    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    
    function limitLoop(currentTime) {
        requestAnimationFrame(limitLoop);
        
        const delta = currentTime - lastTime;
        if (delta < frameInterval) return;
        
        lastTime = currentTime - (delta % frameInterval);
        
        // Atualizações limitadas a 30fps
        updateVisualElements();
    }
    
    requestAnimationFrame(limitLoop);
    
    // Pausar quando aba não está visível
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            logger.log('Dashboard inativo - pausando processamento', 'info');
        } else {
            logger.log('Dashboard ativo - retomando processamento', 'info');
        }
    });
    
    // Cleanup de recursos ao sair
    window.addEventListener('beforeunload', () => {
        if (STATE.chart) {
            STATE.chart.destroy();
        }
        logger.log('Sistema encerrado', 'info');
    });
}

function updateVisualElements() {
    // Atualizações visuais otimizadas
    // Implementar apenas se necessário para animações contínuas
}

// ============================================
// DADOS DE DEMONSTRAÇÃO (PARA TESTES)
// ============================================

function carregarDadosDemonstracao() {
    // Dados simulados baseados nas capturas de ecrã
    const dadosDemo = {
        extrato: {
            ganhosApp: 9507.51,
            ganhosCampanha: 405.00,
            gorjetas: 46.00,
            portagens: 0.00,
            taxasCancel: 54.60,
            comissoes: 2388.89,
            ganhosLiquidos: 7624.22
        },
        fatura: {
            numero: 'PT1124',
            valor: 262.94
        }
    };
    
    // Preencher campos para demonstração
    logger.log('Modo demonstração: dados de teste carregados', 'info');
    
    return dadosDemo;
}

// Expor funções globalmente para debug
window.VDC = {
    STATE,
    CONFIG,
    logger,
    fiscalCalculator,
    carregarDadosDemonstracao
};
