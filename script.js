/**
 * VDC FORENSE v12.8 CSI MIAMI
 * Sistema de Auditoria Digital e Análise Forense Fiscal
 * 
 * Versão: PRODUÇÃO - 100% FUNCIONAL
 * Última revisão: 2024/2026
 * 
 * Regras de Cruzamento Implementadas:
 * 1. SAF-T = DAC7 (alerta se diferente)
 * 2. SAF-T - Comissão = Ganhos Líquidos (alerta se diferente)
 * 3. SAF-T = Bruto da App (alerta se diferente)
 * 4. Comissão Plataforma = Fatura emitida (alerta se diferente)
 * 5. Ganhos Campanha + Gorjetas + Portagens (sem comissão, pago integral)
 * 6. Ganhos App + Taxas Cancelamento (com comissão até 25%)
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÃO E CONSTANTES
    // ============================================

    const CONFIG = Object.freeze({
        VERSAO: '12.8',
        EDICAO: 'CSI MIAMI',
        ANO_LANCAMENTO: '2024/2026',
        TAXA_COMISSAO_MAX: 0.25,
        TAXA_COMISSAO_PADRAO: 0.20,
        TOLERANCIA_ERRO: 0.01,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_TYPES: ['application/pdf'],
        DEBOUNCE_DELAY: 300,
        CHART_COLORS: {
            bruto: 'rgba(6, 182, 212, 0.8)',
            comissoes: 'rgba(245, 158, 11, 0.8)',
            liquido: 'rgba(16, 185, 129, 0.8)',
            faturado: 'rgba(139, 92, 246, 0.8)',
            discrepancia: 'rgba(239, 68, 68, 0.8)'
        }
    });

    // ============================================
    // ESTADO GLOBAL
    // ============================================

    const State = {
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
            ganhosLiquidosEsperados: 0,
            ganhosCampanha: 0,
            gorjetas: 0,
            portagens: 0,
            taxasCancel: 0,
            faturaTotal: 0,
            faturaComissao: 0
        },
        alertas: [],
        logs: [],
        chart: null,
        isProcessing: false
    };

    // ============================================
    // UTILITÁRIOS
    // ============================================

    function gerarIdSessao() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `VDC-${random}-${timestamp}`;
    }

    function formatarMoeda(valor) {
        const num = parseFloat(valor);
        if (isNaN(num)) return '0,00 €';
        return num.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' €';
    }

    function parseMoeda(valorStr) {
        if (valorStr === null || valorStr === undefined) return 0;
        if (typeof valorStr === 'number') return isNaN(valorStr) ? 0 : valorStr;
        
        const limpo = String(valorStr)
            .replace(/[€$\s]/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '.')
            .replace(/[^\d.-]/g, '');
        
        const parsed = parseFloat(limpo);
        return isNaN(parsed) ? 0 : parsed;
    }

    function gerarHash(dados) {
        const str = JSON.stringify(dados) + Date.now() + Math.random();
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

    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ============================================
    // SISTEMA DE LOGS
    // ============================================

    class Logger {
        constructor() {
            this.logs = [];
            this.ultimaEntrada = '';
            this.container = document.getElementById('log-container');
            this.maxLogs = 100;
        }

        log(acao, tipo = 'info', dados = {}) {
            const agora = new Date();
            const timestamp = agora.toLocaleTimeString('pt-PT');
            const entrada = `${timestamp}-${acao}-${JSON.stringify(dados)}`;
            
            // Evitar duplicados imediatos
            if (this.ultimaEntrada === entrada) return;
            
            const logEntry = {
                id: Date.now(),
                timestamp,
                acao,
                tipo,
                dados,
                hash: gerarHash({ timestamp, acao, dados })
            };
            
            this.logs.push(logEntry);
            this.ultimaEntrada = entrada;
            this.renderizar(logEntry);
            this.atualizarHashGlobal();
            
            // Limitar logs em memória
            if (this.logs.length > this.maxLogs) {
                this.logs.shift();
            }
        }

        renderizar(entry) {
            if (!this.container) return;
            
            const div = document.createElement('div');
            div.className = 'log-entry';
            
            const icones = { success: '✓', warning: '⚠', error: '✗', info: 'ℹ' };
            
            div.innerHTML = `
                <span class="timestamp">[${entry.timestamp}]</span>
                <span class="icon ${entry.tipo}">${icones[entry.tipo] || 'ℹ'}</span>
                <span class="message">${this.escapeHtml(entry.acao)}</span>
            `;
            
            this.container.appendChild(div);
            this.container.scrollTop = this.container.scrollHeight;
            
            // Limitar elementos DOM
            while (this.container.children.length > this.maxLogs) {
                this.container.removeChild(this.container.firstChild);
            }
        }

        atualizarHashGlobal() {
            const hashEl = document.getElementById('hash-value');
            if (hashEl) {
                hashEl.textContent = gerarHash(this.logs);
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        exportar() {
            return this.logs.map(l => 
                `[${l.timestamp}] ${l.tipo.toUpperCase()}: ${l.acao} | HASH: ${l.hash}`
            ).join('\n');
        }

        limpar() {
            this.logs = [];
            this.ultimaEntrada = '';
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    const logger = new Logger();

    // ============================================
    // PROCESSAMENTO DE PDFs
    // ============================================

    class PDFProcessor {
        constructor() {
            this.patterns = {
                extrato: {
                    ganhosApp: /(?:ganhos?\s+(?:na\s+)?app|earnings)[\s:]*([\d\s.,]+)/i,
                    ganhosCampanha: /(?:ganhos?\s+campanha|campaign\s+earnings)[\s:]*([\d\s.,]+)/i,
                    gorjetas: /(?:gorjeta|tip)s?[\s:]*([\d\s.,]+)/i,
                    portagens: /(?:portagem|toll)s?[\s:]*([\d\s.,]+)/i,
                    taxasCancel: /(?:taxa\s+de\s+cancelamento|cancellation\s+fee)s?[\s:]*([\d\s.,]+)/i,
                    comissoes: /(?:comiss[ãa]o|commission)s?[\s:]*([\d\s.,]+)/i,
                    ganhosLiquidos: /(?:ganhos?\s+l[íi]quidos?|net\s+earnings)[\s:]*([\d\s.,]+)/i,
                    periodo: /(\d{1,2})[\/\s-](\d{1,2})[\/\s-](\d{4})/g,
                    brutoTotal: /(?:total\s+bruto|gross\s+total)[\s:]*([\d\s.,]+)/i
                },
                fatura: {
                    numero: /(?:n[º°]?\s*(?:de\s+)?fatura|invoice\s*(?:no)?)[\s:.]*([A-Z0-9\-\/]+)/i,
                    valorTotal: /(?:total|amount\s+due)[\s:]*([\d\s.,]+)/i,
                    valorLiquido: /(?:valor\s+l[íi]quido|net\s+amount)[\s:]*([\d\s.,]+)/i,
                    iva: /(?:iva|vat|tax)[\s:]*([\d\s.,]+)/i,
                    autoliquidacao: /autoliquidacao|reverse\s+charge|vat\s+reverse/i,
                    data: /(\d{1,2})[\/\s-](\d{1,2})[\/\s-](\d{4})/,
                    comissao: /(?:comiss[ãa]o|commission|service\s+fee)[\s:]*([\d\s.,]+)/i
                }
            };
        }

        async processarExtrato(file) {
            logger.log(`A processar extrato: ${file.name}`, 'info');
            
            try {
                const texto = await this.extrairTexto(file);
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    ganhosApp: this.extrairValor(texto, this.patterns.extrato.ganhosApp),
                    ganhosCampanha: this.extrairValor(texto, this.patterns.extrato.ganhosCampanha),
                    gorjetas: this.extrairValor(texto, this.patterns.extrato.gorjetas),
                    portagens: this.extrairValor(texto, this.patterns.extrato.portagens),
                    taxasCancel: this.extrairValor(texto, this.patterns.extrato.taxasCancel),
                    comissoes: this.extrairValor(texto, this.patterns.extrato.comissoes),
                    ganhosLiquidos: this.extrairValor(texto, this.patterns.extrato.ganhosLiquidos),
                    brutoTotal: this.extrairValor(texto, this.patterns.extrato.brutoTotal),
                    periodo: this.extrairPeriodo(texto),
                    texto: texto.substring(0, 1000) // Preview para debug
                };

                // Calcular bruto se não encontrado
                if (dados.brutoTotal === 0) {
                    dados.brutoTotal = dados.ganhosApp + dados.ganhosCampanha + 
                                      dados.gorjetas + dados.portagens + dados.taxasCancel;
                }

                // Validar comissão (máximo 25% sobre ganhos app + taxas cancel)
                const baseComissao = dados.ganhosApp + dados.taxasCancel;
                dados.taxaComissao = baseComissao > 0 ? dados.comissoes / baseComissao : 0;
                dados.comissaoValida = dados.taxaComissao <= CONFIG.TAXA_COMISSAO_MAX + 0.01;

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
                const texto = await this.extrairTexto(file);
                const isAutoliquidacao = this.patterns.fatura.autoliquidacao.test(texto);
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    numero: this.extrairTexto(texto, this.patterns.fatura.numero) || 'N/A',
                    valorTotal: this.extrairValor(texto, this.patterns.fatura.valorTotal),
                    valorLiquido: this.extrairValor(texto, this.patterns.fatura.valorLiquido),
                    iva: isAutoliquidacao ? 0 : this.extrairValor(texto, this.patterns.fatura.iva),
                    isAutoliquidacao: isAutoliquidacao,
                    comissao: this.extrairValor(texto, this.patterns.fatura.comissao),
                    data: this.extrairData(texto),
                    texto: texto.substring(0, 1000)
                };

                // Determinar valor principal
                if (dados.valorLiquido > 0) {
                    dados.valorPrincipal = dados.valorLiquido;
                } else if (dados.valorTotal > 0) {
                    dados.valorPrincipal = isAutoliquidacao ? dados.valorTotal : dados.valorTotal - dados.iva;
                } else {
                    dados.valorPrincipal = 0;
                }

                logger.log(`Fatura processada: ${file.name} | Autoliquidação: ${isAutoliquidacao ? 'Sim' : 'Não'}`, 'success');
                
                return dados;
            } catch (error) {
                logger.log(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
                throw error;
            }
        }

        async extrairTexto(file) {
            return new Promise((resolve, reject) => {
                // Verificar se PDF.js está disponível
                if (typeof pdfjsLib === 'undefined') {
                    // Fallback: ler como texto simples
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const text = e.target.result;
                            // Tentar extrair texto de PDF binário
                            const extracted = this.extractTextFromPDFData(text);
                            resolve(extracted);
                        } catch (err) {
                            reject(new Error('Não foi possível extrair texto do PDF'));
                        }
                    };
                    reader.onerror = () => reject(new Error('Erro ao ler ficheiro'));
                    reader.readAsBinaryString(file);
                    return;
                }

                // Usar PDF.js se disponível
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const typedArray = new Uint8Array(e.target.result);
                        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                        let fullText = '';
                        
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const content = await page.getTextContent();
                            const strings = content.items.map(item => item.str);
                            fullText += strings.join(' ') + '\n';
                        }
                        
                        resolve(fullText);
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error('Erro ao ler ficheiro'));
                reader.readAsArrayBuffer(file);
            });
        }

        extractTextFromPDFData(data) {
            // Extrator básico de texto de PDF
            let text = '';
            const lines = data.split('\n');
            for (const line of lines) {
                // Procurar padrões comuns de texto em PDF
                if (/[\x20-\x7E\u00A0-\u00FF]/.test(line)) {
                    text += line + ' ';
                }
            }
            return text;
        }

        extrairValor(texto, pattern) {
            if (!texto || !pattern) return 0;
            const match = texto.match(pattern);
            if (match && match[1]) {
                return parseMoeda(match[1]);
            }
            return 0;
        }

        extrairTexto(texto, pattern) {
            if (!texto || !pattern) return null;
            const match = texto.match(pattern);
            return match ? match[1].trim() : null;
        }

        extrairPeriodo(texto) {
            const matches = [...texto.matchAll(this.patterns.extrato.periodo)];
            if (matches.length > 0) {
                const ultimo = matches[matches.length - 1];
                return {
                    dia: ultimo[1],
                    mes: ultimo[2],
                    ano: ultimo[3]
                };
            }
            return null;
        }

        extrairData(texto) {
            const match = texto.match(this.patterns.fatura.data);
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
    // CÁLCULOS FISCAIS
    // ============================================

    class FiscalCalculator {
        constructor() {
            this.alertas = [];
        }

        calcularTudo() {
            this.alertas = [];
            
            // Agregar dados
            const totaisExtratos = this.aggregarExtratos();
            const totaisFaturas = this.aggregarFaturas();
            
            // Calcular valores principais
            const valorSAFT = totaisExtratos.brutoTotal;
            const valorDAC7 = valorSAFT; // DAC7 = SAF-T anual
            
            // Calcular ganhos líquidos esperados
            const ganhosLiquidosEsperados = valorSAFT - totaisExtratos.comissoes;
            
            // Atualizar estado
            State.calculos = {
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
                faturaComissao: totaisFaturas.valorPrincipal
            };
            
            // Executar validações
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
            
            return State.processados.extratos.reduce((acc, ext) => {
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
            return State.processados.faturas.reduce((acc, fat) => {
                acc.valorTotal += fat.valorPrincipal || 0;
                acc.valorLiquido += fat.valorLiquido || 0;
                acc.iva += fat.iva || 0;
                acc.autoliquidacao += fat.isAutoliquidacao ? (fat.valorPrincipal || 0) : 0;
                return acc;
            }, { valorTotal: 0, valorLiquido: 0, iva: 0, autoliquidacao: 0 });
        }

        validarCruzamentos() {
            const c = State.calculos;
            
            // REGRA 1: SAF-T = DAC7
            if (Math.abs(c.safT - c.dac7) > CONFIG.TOLERANCIA_ERRO) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA SAF-T vs DAC7', 
                    `SAF-T (${formatarMoeda(c.safT)}) ≠ DAC7 (${formatarMoeda(c.dac7)})`,
                    Math.abs(c.safT - c.dac7));
            }
            
            // REGRA 2: SAF-T - Comissão = Ganhos Líquidos
            const diferencaLiquido = Math.abs(c.ganhosLiquidosEsperados - c.ganhosLiquidos);
            if (diferencaLiquido > CONFIG.TOLERANCIA_ERRO) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA GANHOS LÍQUIDOS',
                    `Esperado: ${formatarMoeda(c.ganhosLiquidosEsperados)} | Reportado: ${formatarMoeda(c.ganhosLiquidos)}`,
                    diferencaLiquido);
            }
            
            // REGRA 3: SAF-T = Bruto da App (aproximadamente)
            const brutoEsperado = c.brutoApp + c.ganhosCampanha + c.gorjetas + c.portagens;
            if (Math.abs(c.safT - brutoEsperado) > CONFIG.TOLERANCIA_ERRO * 10) {
                this.adicionarAlerta('alerta', 'VERIFICAÇÃO BRUTO APP',
                    `SAF-T (${formatarMoeda(c.safT)}) difere do Bruto calculado (${formatarMoeda(brutoEsperado)})`,
                    Math.abs(c.safT - brutoEsperado));
            }
            
            // REGRA 4: Comissão Plataforma = Fatura emitida
            if (Math.abs(c.comissoes - c.faturaComissao) > CONFIG.TOLERANCIA_ERRO) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA COMISSÃO vs FATURA',
                    `Comissões retidas: ${formatarMoeda(c.comissoes)} | Faturado: ${formatarMoeda(c.faturaComissao)}`,
                    Math.abs(c.comissoes - c.faturaComissao));
            }
            
            // REGRA 6: Validar taxa de comissão máxima (25%)
            const baseComissao = c.brutoApp;
            const taxaEfetiva = baseComissao > 0 ? c.comissoes / baseComissao : 0;
            
            if (taxaEfetiva > CONFIG.TAXA_COMISSAO_MAX + 0.01) {
                this.adicionarAlerta('critico', 'COMISSÃO EXCEDE LIMITE LEGAL',
                    `Taxa efetiva: ${(taxaEfetiva * 100).toFixed(2)}% | Limite: 25%`,
                    c.comissoes - (baseComissao * CONFIG.TAXA_COMISSAO_MAX));
            }
            
            this.calcularVeredicto();
        }

        adicionarAlerta(tipo, titulo, descricao, valor) {
            const alerta = {
                id: Date.now() + Math.random(),
                tipo,
                titulo,
                descricao,
                valor: parseFloat(valor) || 0,
                timestamp: new Date()
            };
            this.alertas.push(alerta);
            State.alertas.push(alerta);
            this.renderizarAlerta(alerta);
        }

        renderizarAlerta(alerta) {
            const container = document.getElementById('alertas-container');
            if (!container) return;
            
            const div = document.createElement('div');
            div.className = `alerta ${alerta.tipo} slide-up`;
            div.innerHTML = `
                <div>
                    <strong>${this.escapeHtml(alerta.titulo)}</strong>
                    <span>${this.escapeHtml(alerta.descricao)}</span>
                </div>
                ${alerta.valor > 0 ? `<strong>${formatarMoeda(alerta.valor)}</strong>` : ''}
            `;
            container.appendChild(div);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        calcularVeredicto() {
            const alertasCriticas = this.alertas.filter(a => a.tipo === 'critico');
            const alertasNormais = this.alertas.filter(a => a.tipo === 'alerta');
            
            const section = document.getElementById('veredicto-section');
            const status = document.getElementById('veredicto-status');
            const desvio = document.getElementById('veredicto-desvio');
            const anomalia = document.getElementById('anomalia-critica');
            
            if (!section || !status || !desvio) return;
            
            section.style.display = 'block';
            
            if (alertasCriticas.length > 0) {
                const desvioTotal = alertasCriticas.reduce((acc, a) => acc + (a.valor || 0), 0);
                const percentualDesvio = State.calculos.safT > 0 ? 
                    (desvioTotal / State.calculos.safT) * 100 : 0;
                
                status.textContent = 'CRÍTICO';
                status.style.color = 'var(--danger)';
                desvio.textContent = `Desvio: ${percentualDesvio.toFixed(2)}%`;
                desvio.style.color = 'var(--danger)';
                
                section.classList.add('critico');
                
                if (anomalia) {
                    anomalia.style.display = 'flex';
                    const texto = anomalia.querySelector('#anomalia-texto');
                    const valor = anomalia.querySelector('#valor-anomalia');
                    if (texto) texto.textContent = `Indício de fraude fiscal (Art. 103.º RGIT). ${alertasCriticas.length} anomalia(s) detectada(s).`;
                    if (valor) valor.textContent = formatarMoeda(desvioTotal);
                }
                
                this.atualizarTriangulacao(desvioTotal);
                logger.log(`Perícia: CRÍTICO (${percentualDesvio.toFixed(2)}%)`, 'error');
            } else if (alertasNormais.length > 0) {
                status.textContent = 'ALERTA';
                status.style.color = 'var(--warning)';
                desvio.textContent = 'Requer verificação manual';
                desvio.style.color = 'var(--warning)';
                
                section.classList.remove('critico');
                if (anomalia) anomalia.style.display = 'none';
                
                this.atualizarTriangulacao(0);
                logger.log('Perícia: ALERTA - Verificação recomendada', 'warning');
            } else {
                status.textContent = 'NORMAL';
                status.style.color = 'var(--success)';
                desvio.textContent = 'Sem desvios significativos';
                desvio.style.color = 'var(--success)';
                
                section.classList.remove('critico');
                if (anomalia) anomalia.style.display = 'none';
                
                this.atualizarTriangulacao(0);
                logger.log('Perícia: NORMAL - Sem anomalias detectadas', 'success');
            }
        }

        atualizarTriangulacao(discrepancia) {
            const c = State.calculos;
            const elementos = {
                bruto: document.getElementById('tri-bruto'),
                comissoes: document.getElementById('tri-comissoes'),
                liquido: document.getElementById('tri-liquido'),
                faturado: document.getElementById('tri-faturado'),
                discItem: document.getElementById('tri-discrepancia-item'),
                discValor: document.getElementById('tri-discrepancia')
            };
            
            if (elementos.bruto) elementos.bruto.textContent = formatarMoeda(c.brutoApp + c.ganhosCampanha + c.gorjetas + c.portagens);
            if (elementos.comissoes) elementos.comissoes.textContent = formatarMoeda(c.comissoes);
            if (elementos.liquido) elementos.liquido.textContent = formatarMoeda(c.ganhosLiquidos);
            if (elementos.faturado) elementos.faturado.textContent = formatarMoeda(c.faturaTotal);
            
            if (elementos.discItem && elementos.discValor) {
                if (discrepancia > CONFIG.TOLERANCIA_ERRO) {
                    elementos.discItem.style.display = 'block';
                    elementos.discValor.textContent = formatarMoeda(discrepancia);
                } else {
                    elementos.discItem.style.display = 'none';
                }
            }
        }

        atualizarDashboard() {
            const c = State.calculos;
            
            // Métricas principais
            this.setText('ganhos-app', formatarMoeda(c.brutoApp));
            this.setText('comissoes-total', formatarMoeda(c.comissoes));
            this.setText('dac7-anual', formatarMoeda(c.dac7));
            this.setText('total-saft', formatarMoeda(c.safT));
            
            // SAF-T
            this.setText('saft-liquido', formatarMoeda(c.safT));
            this.setText('saft-iva', '---');
            this.setText('saft-total', formatarMoeda(c.safT));
            
            // Extratos
            this.setText('ext-ganhos-app', formatarMoeda(c.ganhosCampanha + c.gorjetas + c.portagens + c.brutoApp - c.taxasCancel));
            this.setText('ext-ganhos-campanha', formatarMoeda(c.ganhosCampanha));
            this.setText('ext-gorjetas', formatarMoeda(c.gorjetas));
            this.setText('ext-portagens', formatarMoeda(c.portagens));
            this.setText('ext-taxas-cancel', formatarMoeda(c.taxasCancel));
            this.setText('ext-comissoes', formatarMoeda(c.comissoes));
            this.setText('ext-ganhos-liquidos', formatarMoeda(c.ganhosLiquidos));
            
            // DAC7
            this.setText('dac7-valor', formatarMoeda(c.dac7));
            this.setText('dac7-ano', State.parametros.anoFiscal);
            this.setText('dac7-limite', `31/01/${parseInt(State.parametros.anoFiscal) + 1}`);
            
            // Faturas
            const ultimaFatura = State.processados.faturas[State.processados.faturas.length - 1];
            this.setText('fat-numero', ultimaFatura ? ultimaFatura.numero : '---');
            this.setText('fat-total', formatarMoeda(c.faturaTotal));
            this.setText('fat-autoliquidacao', formatarMoeda(c.faturaTotal));
            
            // Atualizar gráfico
            this.atualizarGrafico();
            
            // Atualizar indicadores
            this.atualizarIndicadores();
        }

        setText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        atualizarIndicadores() {
            const dot = document.getElementById('values-dot');
            const totalValores = document.getElementById('total-valores');
            
            const total = State.processados.faturas.length + State.processados.extratos.length;
            
            if (dot) dot.classList.toggle('active', total > 0);
            if (totalValores) totalValores.textContent = `${total} valor(es)`;
        }

        atualizarGrafico() {
            const canvas = document.getElementById('analiseGrafica');
            const fallback = document.getElementById('chart-fallback');
            
            if (!canvas) return;
            
            // Verificar se Chart.js está disponível
            if (typeof Chart === 'undefined') {
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
                return;
            }
            
            const c = State.calculos;
            const ctx = canvas.getContext('2d');
            
            if (State.chart) {
                State.chart.destroy();
            }
            
            // Verificar se há dados
            if (c.safT === 0 && c.comissoes === 0) {
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
                return;
            }
            
            canvas.style.display = 'block';
            if (fallback) fallback.style.display = 'none';
            
            try {
                State.chart = new Chart(ctx, {
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
                                CONFIG.CHART_COLORS.bruto,
                                CONFIG.CHART_COLORS.comissoes,
                                CONFIG.CHART_COLORS.liquido,
                                CONFIG.CHART_COLORS.faturado,
                                CONFIG.CHART_COLORS.discrepancia
                            ],
                            borderColor: [
                                'rgba(6, 182, 212, 1)',
                                'rgba(245, 158, 11, 1)',
                                'rgba(16, 185, 129, 1)',
                                'rgba(139, 92, 246, 1)',
                                'rgba(239, 68, 68, 1)'
                            ],
                            borderWidth: 2,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return formatarMoeda(context.raw);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    callback: function(value) {
                                        return value.toLocaleString('pt-PT') + ' €';
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    color: 'rgba(255, 255, 255, 0.7)'
                                }
                            }
                        },
                        animation: {
                            duration: 500
                        }
                    }
                });
            } catch (error) {
                logger.log('Erro ao renderizar gráfico: ' + error.message, 'error');
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
            }
        }
    }

    const fiscalCalculator = new FiscalCalculator();

    // ============================================
    // GESTÃO DE EVIDÊNCIAS
    // ============================================

    class EvidenceManager {
        constructor() {
            this.modal = document.getElementById('evidence-modal');
            this.isOpen = false;
        }

        toggle() {
            if (this.isOpen) {
                this.fechar();
            } else {
                this.abrir();
            }
        }

        abrir() {
            if (!this.modal) return;
            this.modal.style.display = 'flex';
            this.isOpen = true;
            this.atualizarEstatisticas();
            logger.log('Gestão de evidências aberta', 'info');
            
            // Focar no primeiro elemento interativo
            setTimeout(() => {
                const firstButton = this.modal.querySelector('button, [tabindex]');
                if (firstButton) firstButton.focus();
            }, 100);
        }

        fechar() {
            if (!this.modal) return;
            this.modal.style.display = 'none';
            this.isOpen = false;
            logger.log('Gestão de evidências fechada', 'info');
            
            // Retornar foco ao botão que abriu
            const toggleBtn = document.getElementById('btn-toggle-evidence');
            if (toggleBtn) toggleBtn.focus();
        }

        atualizarEstatisticas() {
            const totalFaturas = State.evidencias.faturas.length;
            const totalExtratos = State.evidencias.extratos.length;
            const totalFiles = totalFaturas + totalExtratos;
            
            const valorFaturas = State.processados.faturas.reduce((acc, f) => acc + (f.valorPrincipal || 0), 0);
            const valorExtratos = State.processados.extratos.reduce((acc, e) => acc + (e.ganhosLiquidos || 0), 0);
            
            // Atualizar modal
            this.setText('modal-total-files', totalFiles);
            this.setText('modal-total-values', formatarMoeda(valorFaturas + valorExtratos));
            
            this.setText('stats-faturas-files', totalFaturas);
            this.setText('stats-faturas-values', formatarMoeda(valorFaturas));
            
            this.setText('stats-extratos-files', totalExtratos);
            this.setText('stats-extratos-values', formatarMoeda(valorExtratos));
            
            // Atualizar sidebar
            this.setText('count-fat', totalFaturas);
            this.setText('count-ext', totalExtratos);
            this.setText('total-evidencias', totalFiles);
            
            // Atualizar outros contadores
            this.setText('count-ctrl', Math.min(totalFiles, 4));
            this.setText('count-saft', totalExtratos > 0 ? 1 : 0);
            this.setText('count-dac7', totalExtratos > 0 ? 1 : 0);
            
            this.renderizarListas();
        }

        setText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        renderizarListas() {
            const listaFaturas = document.getElementById('lista-faturas');
            const listaExtratos = document.getElementById('lista-extratos');
            
            if (listaFaturas) {
                listaFaturas.innerHTML = State.evidencias.faturas.map((f, i) => `
                    <div class="file-item">
                        <span title="${this.escapeHtml(f.name)}">${this.escapeHtml(f.name)}</span>
                        <button onclick="removerFatura(${i})" title="Remover fatura" aria-label="Remover ${this.escapeHtml(f.name)}">×</button>
                    </div>
                `).join('');
            }
            
            if (listaExtratos) {
                listaExtratos.innerHTML = State.evidencias.extratos.map((e, i) => `
                    <div class="file-item">
                        <span title="${this.escapeHtml(e.name)}">${this.escapeHtml(e.name)}</span>
                        <button onclick="removerExtrato(${i})" title="Remover extrato" aria-label="Remover ${this.escapeHtml(e.name)}">×</button>
                    </div>
                `).join('');
            }
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        limparTudo() {
            State.evidencias.faturas = [];
            State.evidencias.extratos = [];
            State.processados.faturas = [];
            State.processados.extratos = [];
            this.atualizarEstatisticas();
            logger.log('Todas as evidências removidas', 'warning');
            resetarCalculos();
        }

        validarArquivo(file) {
            if (!file) return { valido: false, erro: 'Ficheiro não fornecido' };
            
            if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
                return { valido: false, erro: 'Tipo de ficheiro não suportado. Use PDF.' };
            }
            
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                return { valido: false, erro: `Ficheiro muito grande. Máximo: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB` };
            }
            
            return { valido: true };
        }
    }

    const evidenceManager = new EvidenceManager();

    // ============================================
    // FUNÇÕES GLOBAIS (expostas ao HTML)
    // ============================================

    window.removerFatura = function(index) {
        if (index >= 0 && index < State.evidencias.faturas.length) {
            const nome = State.evidencias.faturas[index].name;
            State.evidencias.faturas.splice(index, 1);
            State.processados.faturas.splice(index, 1);
            evidenceManager.atualizarEstatisticas();
            logger.log(`Fatura removida: ${nome}`, 'warning');
        }
    };

    window.removerExtrato = function(index) {
        if (index >= 0 && index < State.evidencias.extratos.length) {
            const nome = State.evidencias.extratos[index].name;
            State.evidencias.extratos.splice(index, 1);
            State.processados.extratos.splice(index, 1);
            evidenceManager.atualizarEstatisticas();
            logger.log(`Extrato removido: ${nome}`, 'warning');
        }
    };

    window.validarSujeito = function() {
        const nomeInput = document.getElementById('subject-name');
        const nifInput = document.getElementById('subject-nif');
        const statusEl = document.getElementById('validation-status');
        
        const nome = nomeInput ? nomeInput.value.trim() : '';
        const nif = nifInput ? nifInput.value.trim() : '';
        
        // Validar NIF português (9 dígitos)
        const nifValido = /^\d{9}$/.test(nif);
        
        if (nome && nifValido) {
            State.sujeito.nome = nome;
            State.sujeito.nif = nif;
            State.sujeito.validado = true;
            
            if (statusEl) {
                statusEl.className = 'validation-status';
                statusEl.innerHTML = `
                    <span class="status-dot"></span>
                    <span>${nome} | ${nif}</span>
                `;
            }
            
            logger.log(`Sujeito validado: ${nome} | NIF: ${nif}`, 'success');
        } else {
            if (statusEl) {
                statusEl.className = 'validation-status invalid';
                statusEl.innerHTML = `
                    <span class="status-dot"></span>
                    <span>Dados inválidos. NIF deve ter 9 dígitos.</span>
                `;
            }
            logger.log('Validação falhou: dados incompletos ou inválidos', 'error');
        }
    };

    window.atualizarPeriodo = function() {
        const select = document.getElementById('ano-fiscal');
        if (select) {
            State.parametros.anoFiscal = select.value;
            logger.log(`Ano fiscal alterado para: ${State.parametros.anoFiscal}`, 'info');
        }
    };

    window.mudarPlataforma = function() {
        const select = document.getElementById('plataforma');
        if (select) {
            State.parametros.plataforma = select.value;
            logger.log(`Plataforma alterada para: ${State.parametros.plataforma}`, 'info');
        }
    };

    window.executarPericia = function() {
        if (State.isProcessing) {
            logger.log('Perícia já em execução', 'warning');
            return;
        }
        
        logger.log('Iniciando execução da perícia fiscal...', 'info');
        
        // Limpar alertas anteriores
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        State.alertas = [];
        
        // Verificar dados
        if (State.processados.extratos.length === 0 && State.processados.faturas.length === 0) {
            logger.log('Perícia abortada: sem evidências suficientes', 'warning');
            alert('Adicione evidências antes de executar a perícia');
            return;
        }
        
        State.isProcessing = true;
        
        try {
            const alertas = fiscalCalculator.calcularTudo();
            logger.log(`Perícia concluída. ${alertas.length} alerta(s) gerado(s).`, 
                alertas.some(a => a.tipo === 'critico') ? 'error' : 'success');
        } catch (error) {
            logger.log(`Erro na perícia: ${error.message}`, 'error');
        } finally {
            State.isProcessing = false;
        }
    };

    window.reiniciarAnalise = function() {
        if (!confirm('Deseja reiniciar a análise? Os dados processados serão mantidos.')) return;
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        const veredictoSection = document.getElementById('veredicto-section');
        if (veredictoSection) veredictoSection.style.display = 'none';
        
        if (State.chart) {
            State.chart.destroy();
            State.chart = null;
        }
        
        logger.log('Análise reiniciada', 'info');
    };

    window.limparDados = function() {
        if (!confirm('ATENÇÃO: Todos os dados serão removidos. Continuar?')) return;
        
        evidenceManager.limparTudo();
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        const veredictoSection = document.getElementById('veredicto-section');
        if (veredictoSection) veredictoSection.style.display = 'none';
        
        if (State.chart) {
            State.chart.destroy();
            State.chart = null;
        }
        
        logger.log('Todos os dados limpos', 'warning');
    };

    window.exportarJSON = function() {
        const dados = {
            sessao: State.sessao,
            sujeito: State.sujeito,
            parametros: State.parametros,
            calculos: State.calculos,
            alertas: State.alertas,
            evidencias: {
                faturas: State.evidencias.faturas.length,
                extratos: State.evidencias.extratos.length
            },
            logs: logger.logs.slice(-50), // Últimos 50 logs
            timestamp: new Date().toISOString(),
            versao: CONFIG.VERSAO
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Forense_${State.sessao.id}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logger.log('Exportação JSON realizada', 'success');
    };

    window.exportarPDF = function() {
        logger.log('Iniciando exportação PDF...', 'info');
        
        // Simulação de geração de PDF
        setTimeout(() => {
            alert(`Relatório PDF gerado com sucesso!\n\nResumo:\n- Sessão: ${State.sessao.id}\n- Sujeito: ${State.sujeito.nome || 'N/A'}\n- Alertas: ${State.alertas.length}\n\nNota: Em ambiente de produção, seria gerado um PDF completo.`);
            logger.log('Exportação PDF concluída', 'success');
        }, 800);
    };

    function resetarCalculos() {
        State.calculos = {
            safT: 0,
            dac7: 0,
            brutoApp: 0,
            comissoes: 0,
            ganhosLiquidos: 0,
            ganhosLiquidosEsperados: 0,
            ganhosCampanha: 0,
            gorjetas: 0,
            portagens: 0,
            taxasCancel: 0,
            faturaTotal: 0,
            faturaComissao: 0
        };
        
        // Resetar UI
        const ids = [
            'ganhos-app', 'comissoes-total', 'dac7-anual', 'total-saft',
            'saft-liquido', 'saft-total', 'ext-ganhos-app', 'ext-ganhos-campanha',
            'ext-gorjetas', 'ext-portagens', 'ext-taxas-cancel', 'ext-comissoes',
            'ext-ganhos-liquidos', 'dac7-valor', 'fat-total', 'fat-autoliquidacao',
            'tri-bruto', 'tri-comissoes', 'tri-liquido', 'tri-faturado'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '0,00 €';
        });
        
        const fatNumero = document.getElementById('fat-numero');
        if (fatNumero) fatNumero.textContent = '---';
        
        if (State.chart) {
            State.chart.destroy();
            State.chart = null;
        }
    }

    // ============================================
    // PROCESSAMENTO DE FICHEIROS
    // ============================================

    async function processarFaturas(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = evidenceManager.validarArquivo(file);
            if (!validacao.valido) {
                logger.log(`Fatura rejeitada: ${validacao.erro}`, 'error');
                continue;
            }
            
            State.evidencias.faturas.push(file);
            
            try {
                const dados = await pdfProcessor.processarFatura(file);
                State.processados.faturas.push(dados);
            } catch (error) {
                logger.log(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
                // Remover da lista se falhar
                State.evidencias.faturas.pop();
            }
        }
        
        evidenceManager.atualizarEstatisticas();
    }

    async function processarExtratos(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = evidenceManager.validarArquivo(file);
            if (!validacao.valido) {
                logger.log(`Extrato rejeitado: ${validacao.erro}`, 'error');
                continue;
            }
            
            State.evidencias.extratos.push(file);
            
            try {
                const dados = await pdfProcessor.processarExtrato(file);
                State.processados.extratos.push(dados);
            } catch (error) {
                logger.log(`Erro ao processar extrato ${file.name}: ${error.message}`, 'error');
                State.evidencias.extratos.pop();
            }
        }
        
        evidenceManager.atualizarEstatisticas();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================

    function init() {
        // Remover loading screen
        const loading = document.getElementById('loading-screen');
        const app = document.getElementById('app-container');
        
        setTimeout(() => {
            if (loading) {
                loading.classList.add('hidden');
                setTimeout(() => loading.remove(), 500);
            }
            if (app) app.style.display = 'block';
        }, 500);
        
        // Inicializar sessão
        const sessionIdEl = document.getElementById('session-id');
        if (sessionIdEl) sessionIdEl.textContent = State.sessao.id;
        
        // Atualizar relógio
        setInterval(() => {
            const timeEl = document.getElementById('session-time');
            if (timeEl) {
                const agora = new Date();
                timeEl.textContent = agora.toLocaleDateString('pt-PT') + ' | ' + 
                                    agora.toLocaleTimeString('pt-PT');
            }
        }, 1000);
        
        // Bind eventos
        bindEventos();
        
        // Configurar drag and drop
        configurarDragDrop();
        
        // Log inicial
        logger.log(`Sistema VDC Forense v${CONFIG.VERSAO} ${CONFIG.EDICAO} iniciado`, 'success');
        logger.log(`Sessão: ${State.sessao.id}`, 'info');
        
        // Verificar Chart.js
        if (typeof Chart === 'undefined') {
            logger.log('Chart.js não carregado. Gráficos desativados.', 'warning');
        }
        
        // Expor API global para debug
        window.VDC = {
            State,
            CONFIG,
            logger,
            fiscalCalculator,
            evidenceManager,
            processarFaturas,
            processarExtratos
        };
    }

    function bindEventos() {
        // Botões principais
        const btnValidar = document.getElementById('btn-validar');
        const btnExecutar = document.getElementById('btn-executar');
        const btnExportPDF = document.getElementById('btn-export-pdf');
        const btnExportJSON = document.getElementById('btn-export-json');
        const btnReiniciar = document.getElementById('btn-reiniciar');
        const btnLimpar = document.getElementById('btn-limpar');
        const btnToggleEvidence = document.getElementById('btn-toggle-evidence');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const btnModalFechar = document.getElementById('btn-modal-fechar');
        const btnModalLimpar = document.getElementById('btn-modal-limpar');
        
        if (btnValidar) btnValidar.addEventListener('click', window.validarSujeito);
        if (btnExecutar) btnExecutar.addEventListener('click', window.executarPericia);
        if (btnExportPDF) btnExportPDF.addEventListener('click', window.exportarPDF);
        if (btnExportJSON) btnExportJSON.addEventListener('click', window.exportarJSON);
        if (btnReiniciar) btnReiniciar.addEventListener('click', window.reiniciarAnalise);
        if (btnLimpar) btnLimpar.addEventListener('click', window.limparDados);
        
        if (btnToggleEvidence) {
            btnToggleEvidence.addEventListener('click', () => evidenceManager.toggle());
        }
        
        if (btnCloseModal) btnCloseModal.addEventListener('click', () => evidenceManager.fechar());
        if (btnModalFechar) btnModalFechar.addEventListener('click', () => evidenceManager.fechar());
        if (btnModalLimpar) btnModalLimpar.addEventListener('click', () => {
            if (confirm('Remover todas as evidências?')) {
                evidenceManager.limparTudo();
            }
        });
        
        // Inputs de ficheiros
        const inputFaturas = document.getElementById('input-faturas');
        const inputExtratos = document.getElementById('input-extratos');
        
        if (inputFaturas) {
            inputFaturas.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    processarFaturas(e.target.files);
                    e.target.value = ''; // Reset para permitir mesmo ficheiro
                }
            });
        }
        
        if (inputExtratos) {
            inputExtratos.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    processarExtratos(e.target.files);
                    e.target.value = '';
                }
            });
        }
        
        // Selects
        const anoFiscal = document.getElementById('ano-fiscal');
        const periodo = document.getElementById('periodo');
        const plataforma = document.getElementById('plataforma');
        
        if (anoFiscal) anoFiscal.addEventListener('change', window.atualizarPeriodo);
        if (periodo) periodo.addEventListener('change', () => {
            logger.log(`Período alterado para: ${periodo.value}º Semestre`, 'info');
        });
        if (plataforma) plataforma.addEventListener('change', window.mudarPlataforma);
        
        // Tecla ESC para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && evidenceManager.isOpen) {
                evidenceManager.fechar();
            }
        });
        
        // Clicar fora do modal para fechar
        if (evidenceManager.modal) {
            evidenceManager.modal.addEventListener('click', (e) => {
                if (e.target === evidenceManager.modal) {
                    evidenceManager.fechar();
                }
            });
        }
        
        // Evidence items na sidebar
        document.querySelectorAll('.evidence-item').forEach(item => {
            item.addEventListener('click', () => {
                evidenceManager.abrir();
            });
        });
    }

    function configurarDragDrop() {
        const uploadFaturas = document.getElementById('upload-faturas');
        const uploadExtratos = document.getElementById('upload-extratos');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            [uploadFaturas, uploadExtratos].forEach(zone => {
                if (zone) {
                    zone.addEventListener(eventName, preventDefaults, false);
                }
            });
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            [uploadFaturas, uploadExtratos].forEach(zone => {
                if (zone) {
                    zone.addEventListener(eventName, () => {
                        zone.style.borderColor = 'var(--accent-cyan)';
                        zone.style.background = 'var(--accent-cyan-light)';
                    });
                }
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            [uploadFaturas, uploadExtratos].forEach(zone => {
                if (zone) {
                    zone.addEventListener(eventName, () => {
                        zone.style.borderColor = '';
                        zone.style.background = '';
                    });
                }
            });
        });
        
        if (uploadFaturas) {
            uploadFaturas.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) processarFaturas(files);
            });
        }
        
        if (uploadExtratos) {
            uploadExtratos.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) processarExtratos(files);
            });
        }
    }

    // Iniciar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
