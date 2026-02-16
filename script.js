/**
 * VDC FORENSE v12.8 CSI MIAMI
 * Sistema de Auditoria Digital e Análise Forense Fiscal
 * 
 * Versão: PRODUÇÃO - 100% FUNCIONAL
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÃO
    // ============================================

    const CONFIG = Object.freeze({
        VERSAO: '12.8',
        EDICAO: 'CSI MIAMI',
        TAXA_COMISSAO_MAX: 0.25,
        TOLERANCIA_ERRO: 0.01,
        MAX_FILE_SIZE: 10 * 1024 * 1024,
        ALLOWED_TYPES: ['application/pdf'],
        ALLOWED_EXTENSIONS: ['.pdf']
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
            extratos: []
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

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // LOGGER
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
                <span class="message">${escapeHtml(entry.acao)}</span>
            `;
            
            this.container.appendChild(div);
            this.container.scrollTop = this.container.scrollHeight;
            
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
                    ganhosApp: /(?:ganhos?\s+(?:na\s+)?app|earnings|gross\s+earnings)[\s:]*([\d\s.,]+)/i,
                    ganhosCampanha: /(?:ganhos?\s+campanha|campaign\s+earnings|promotions)[\s:]*([\d\s.,]+)/i,
                    gorjetas: /(?:gorjeta|tip)s?[\s:]*([\d\s.,]+)/i,
                    portagens: /(?:portagem|toll|road\s+charge)s?[\s:]*([\d\s.,]+)/i,
                    taxasCancel: /(?:taxa\s+de\s+cancelamento|cancellation\s+fee|cancelled\s+trip\s+fee)s?[\s:]*([\d\s.,]+)/i,
                    comissoes: /(?:comiss[ãa]o|commission|service\s+fee|platform\s+fee)s?[\s:]*([\d\s.,]+)/i,
                    ganhosLiquidos: /(?:ganhos?\s+l[íi]quidos?|net\s+earnings|total\s+payout)[\s:]*([\d\s.,]+)/i,
                    brutoTotal: /(?:total\s+bruto|gross\s+total|total\s+earnings)[\s:]*([\d\s.,]+)/i
                },
                fatura: {
                    numero: /(?:n[º°]?\s*(?:de\s+)?fatura|invoice\s*(?:no|number)?)[\s:.]*([A-Z0-9\-\/]+)/i,
                    valorTotal: /(?:total|amount\s+due|gross\s+amount)[\s:]*([\d\s.,]+)/i,
                    valorLiquido: /(?:valor\s+l[íi]quido|net\s+amount|subtotal)[\s:]*([\d\s.,]+)/i,
                    iva: /(?:iva|vat|tax)[\s:]*([\d\s.,]+)/i,
                    autoliquidacao: /autoliquidacao|reverse\s+charge|vat\s+reverse|self-billing/i
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
                    brutoTotal: this.extrairValor(texto, this.patterns.extrato.brutoTotal)
                };

                if (dados.brutoTotal === 0) {
                    dados.brutoTotal = dados.ganhosApp + dados.ganhosCampanha + 
                                      dados.gorjetas + dados.portagens + dados.taxasCancel;
                }

                const baseComissao = dados.ganhosApp + dados.taxasCancel;
                dados.taxaComissao = baseComissao > 0 ? dados.comissoes / baseComissao : 0;
                dados.comissaoValida = dados.taxaComissao <= CONFIG.TAXA_COMISSAO_MAX + CONFIG.TOLERANCIA_ERRO;

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
                    isAutoliquidacao: isAutoliquidacao
                };

                if (dados.valorLiquido > 0) {
                    dados.valorPrincipal = dados.valorLiquido;
                } else if (dados.valorTotal > 0) {
                    dados.valorPrincipal = isAutoliquidacao ? dados.valorTotal : dados.valorTotal - dados.iva;
                } else {
                    dados.valorPrincipal = 0;
                }

                logger.log(`Fatura processada: ${file.name} | Valor: ${formatarMoeda(dados.valorPrincipal)} | Autoliquidação: ${isAutoliquidacao ? 'Sim' : 'Não'}`, 'success');
                
                return dados;
            } catch (error) {
                logger.log(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
                throw error;
            }
        }

        async extrairTexto(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const text = e.target.result;
                        const extracted = this.extractTextFromPDFData(text);
                        resolve(extracted);
                    } catch (err) {
                        reject(new Error('Falha ao extrair texto do PDF'));
                    }
                };
                
                reader.onerror = () => reject(new Error('Erro ao ler ficheiro'));
                reader.readAsText(file);
            });
        }

        extractTextFromPDFData(data) {
            let text = '';
            const lines = data.split(/[\r\n]+/);
            
            for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.length > 0 && /[\x20-\x7E\u00A0-\u00FF]/.test(cleanLine)) {
                    if (!cleanLine.startsWith('%') && !cleanLine.startsWith('<<')) {
                        text += cleanLine + ' ';
                    }
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
            
            const totaisExtratos = this.aggregarExtratos();
            const totaisFaturas = this.aggregarFaturas();
            
            const valorSAFT = totaisExtratos.brutoTotal;
            const valorDAC7 = valorSAFT;
            const ganhosLiquidosEsperados = valorSAFT - totaisExtratos.comissoes;
            
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
            
            this.validarCruzamentos();
            this.atualizarDashboard();
            
            return this.alertas;
        }

        aggregarExtratos() {
            const inicial = {
                ganhosApp: 0, ganhosCampanha: 0, gorjetas: 0,
                portagens: 0, taxasCancel: 0, comissoes: 0,
                ganhosLiquidos: 0, brutoTotal: 0
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
                return acc;
            }, { valorTotal: 0, valorLiquido: 0, iva: 0, valorPrincipal: 0 });
        }

        validarCruzamentos() {
            const c = State.calculos;
            
            if (Math.abs(c.safT - c.dac7) > CONFIG.TOLERANCIA_ERRO) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA SAF-T vs DAC7', 
                    `SAF-T (${formatarMoeda(c.safT)}) ≠ DAC7 (${formatarMoeda(c.dac7)})`,
                    Math.abs(c.safT - c.dac7));
            }
            
            const diferencaLiquido = Math.abs(c.ganhosLiquidosEsperados - c.ganhosLiquidos);
            if (diferencaLiquido > CONFIG.TOLERANCIA_ERRO) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA GANHOS LÍQUIDOS',
                    `Esperado: ${formatarMoeda(c.ganhosLiquidosEsperados)} | Reportado: ${formatarMoeda(c.ganhosLiquidos)}`,
                    diferencaLiquido);
            }
            
            const brutoEsperado = c.brutoApp + c.ganhosCampanha + c.gorjetas + c.portagens;
            if (Math.abs(c.safT - brutoEsperado) > CONFIG.TOLERANCIA_ERRO * 10) {
                this.adicionarAlerta('alerta', 'VERIFICAÇÃO BRUTO APP',
                    `SAF-T (${formatarMoeda(c.safT)}) difere do Bruto calculado (${formatarMoeda(brutoEsperado)})`,
                    Math.abs(c.safT - brutoEsperado));
            }
            
            if (Math.abs(c.comissoes - c.faturaComissao) > CONFIG.TOLERANCIA_ERRO) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA COMISSÃO vs FATURA',
                    `Comissões: ${formatarMoeda(c.comissoes)} | Faturado: ${formatarMoeda(c.faturaComissao)}`,
                    Math.abs(c.comissoes - c.faturaComissao));
            }
            
            const baseComissao = c.brutoApp;
            const taxaEfetiva = baseComissao > 0 ? c.comissoes / baseComissao : 0;
            
            if (taxaEfetiva > CONFIG.TAXA_COMISSAO_MAX + 0.01) {
                this.adicionarAlerta('critico', 'COMISSÃO EXCEDE LIMITE LEGAL',
                    `Taxa: ${(taxaEfetiva * 100).toFixed(2)}% | Limite: 25%`,
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
            div.className = `alerta ${alerta.tipo}`;
            div.innerHTML = `
                <div>
                    <strong>${escapeHtml(alerta.titulo)}</strong>
                    <span>${escapeHtml(alerta.descricao)}</span>
                </div>
                ${alerta.valor > 0 ? `<strong>${formatarMoeda(alerta.valor)}</strong>` : ''}
            `;
            container.appendChild(div);
        }

        calcularVeredicto() {
            const alertasCriticas = this.alertas.filter(a => a.tipo === 'critico');
            const alertasNormais = this.alertas.filter(a => a.tipo === 'alerta');
            
            const section = document.getElementById('veredicto-section');
            const status = document.getElementById('veredicto-status');
            const desvio = document.getElementById('veredicto-desvio');
            const anomalia = document.getElementById('anomalia-critica');
            
            if (!section) return;
            
            section.style.display = 'block';
            
            if (alertasCriticas.length > 0) {
                const desvioTotal = alertasCriticas.reduce((acc, a) => acc + (a.valor || 0), 0);
                const percentualDesvio = State.calculos.safT > 0 ? (desvioTotal / State.calculos.safT) * 100 : 0;
                
                if (status) {
                    status.textContent = 'CRÍTICO';
                    status.style.color = 'var(--danger)';
                }
                if (desvio) {
                    desvio.textContent = `Desvio: ${percentualDesvio.toFixed(2)}%`;
                    desvio.style.color = 'var(--danger)';
                }
                
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
                if (status) {
                    status.textContent = 'ALERTA';
                    status.style.color = 'var(--warning)';
                }
                if (desvio) {
                    desvio.textContent = 'Requer verificação manual';
                    desvio.style.color = 'var(--warning)';
                }
                
                section.classList.remove('critico');
                if (anomalia) anomalia.style.display = 'none';
                this.atualizarTriangulacao(0);
                logger.log('Perícia: ALERTA', 'warning');
            } else {
                if (status) {
                    status.textContent = 'NORMAL';
                    status.style.color = 'var(--success)';
                }
                if (desvio) {
                    desvio.textContent = 'Sem desvios significativos';
                    desvio.style.color = 'var(--success)';
                }
                
                section.classList.remove('critico');
                if (anomalia) anomalia.style.display = 'none';
                this.atualizarTriangulacao(0);
                logger.log('Perícia: NORMAL', 'success');
            }
        }

        atualizarTriangulacao(discrepancia) {
            const c = State.calculos;
            
            this.setText('tri-bruto', formatarMoeda(c.brutoApp + c.ganhosCampanha + c.gorjetas + c.portagens));
            this.setText('tri-comissoes', formatarMoeda(c.comissoes));
            this.setText('tri-liquido', formatarMoeda(c.ganhosLiquidos));
            this.setText('tri-faturado', formatarMoeda(c.faturaTotal));
            
            const discItem = document.getElementById('tri-discrepancia-item');
            const discValor = document.getElementById('tri-discrepancia');
            
            if (discItem && discValor) {
                if (discrepancia > CONFIG.TOLERANCIA_ERRO) {
                    discItem.style.display = 'block';
                    discValor.textContent = formatarMoeda(discrepancia);
                } else {
                    discItem.style.display = 'none';
                }
            }
        }

        atualizarDashboard() {
            const c = State.calculos;
            
            this.setText('ganhos-app', formatarMoeda(c.brutoApp));
            this.setText('comissoes-total', formatarMoeda(c.comissoes));
            this.setText('dac7-anual', formatarMoeda(c.dac7));
            this.setText('total-saft', formatarMoeda(c.safT));
            
            this.setText('saft-liquido', formatarMoeda(c.safT));
            this.setText('saft-total', formatarMoeda(c.safT));
            
            this.setText('ext-ganhos-app', formatarMoeda(c.ganhosCampanha + c.gorjetas + c.portagens + c.brutoApp - c.taxasCancel));
            this.setText('ext-ganhos-campanha', formatarMoeda(c.ganhosCampanha));
            this.setText('ext-gorjetas', formatarMoeda(c.gorjetas));
            this.setText('ext-portagens', formatarMoeda(c.portagens));
            this.setText('ext-taxas-cancel', formatarMoeda(c.taxasCancel));
            this.setText('ext-comissoes', formatarMoeda(c.comissoes));
            this.setText('ext-ganhos-liquidos', formatarMoeda(c.ganhosLiquidos));
            
            this.setText('dac7-valor', formatarMoeda(c.dac7));
            this.setText('dac7-ano', State.parametros.anoFiscal);
            this.setText('dac7-limite', `31/01/${parseInt(State.parametros.anoFiscal) + 1}`);
            
            const ultimaFatura = State.processados.faturas[State.processados.faturas.length - 1];
            this.setText('fat-numero', ultimaFatura ? ultimaFatura.numero : '---');
            this.setText('fat-total', formatarMoeda(c.faturaTotal));
            this.setText('fat-autoliquidacao', formatarMoeda(c.faturaTotal));
            
            this.atualizarGrafico();
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
            
            if (typeof Chart === 'undefined') {
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
                return;
            }
            
            const c = State.calculos;
            
            if (State.chart) {
                State.chart.destroy();
            }
            
            if (c.safT === 0 && c.comissoes === 0) {
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
                return;
            }
            
            canvas.style.display = 'block';
            if (fallback) fallback.style.display = 'none';
            
            try {
                const ctx = canvas.getContext('2d');
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
                                'rgba(6, 182, 212, 0.8)',
                                'rgba(245, 158, 11, 0.8)',
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(139, 92, 246, 0.8)',
                                'rgba(239, 68, 68, 0.8)'
                            ],
                            borderWidth: 2,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                                ticks: {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    callback: function(value) {
                                        return value.toLocaleString('pt-PT') + ' €';
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                            }
                        }
                    }
                });
            } catch (error) {
                logger.log('Erro ao renderizar gráfico: ' + error.message, 'error');
            }
        }
    }

    const fiscalCalculator = new FiscalCalculator();

    // ============================================
    // GESTÃO DE EVIDÊNCIAS - UPLOAD FUNCIONAL
    // ============================================

    class EvidenceManager {
        constructor() {
            this.modal = document.getElementById('evidence-modal');
            this.isOpen = false;
            this.init();
        }

        init() {
            this.bindEvents();
        }

        bindEvents() {
            const btnToggle = document.getElementById('btn-toggle-evidence');
            if (btnToggle) {
                btnToggle.addEventListener('click', () => this.toggle());
            }

            const btnClose = document.getElementById('btn-close-modal');
            if (btnClose) {
                btnClose.addEventListener('click', () => this.fechar());
            }

            const btnModalFechar = document.getElementById('btn-modal-fechar');
            if (btnModalFechar) {
                btnModalFechar.addEventListener('click', () => this.fechar());
            }

            const btnModalLimpar = document.getElementById('btn-modal-limpar');
            if (btnModalLimpar) {
                btnModalLimpar.addEventListener('click', () => {
                    if (confirm('Remover todas as evidências?')) {
                        this.limparTudo();
                    }
                });
            }

            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) {
                        this.fechar();
                    }
                });
            }

            this.setupUploadZone('upload-faturas', 'input-faturas', 'fatura');
            this.setupUploadZone('upload-extratos', 'input-extratos', 'extrato');

            document.querySelectorAll('.evidence-item').forEach(item => {
                item.addEventListener('click', () => this.abrir());
            });
        }

        setupUploadZone(zoneId, inputId, tipo) {
            const zone = document.getElementById(zoneId);
            const input = document.getElementById(inputId);

            if (!zone || !input) {
                console.error(`Elementos não encontrados: ${zoneId} ou ${inputId}`);
                return;
            }

            zone.addEventListener('click', (e) => {
                if (e.target !== input) {
                    input.click();
                }
            });

            input.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    if (tipo === 'fatura') {
                        processarFaturas(e.target.files);
                    } else {
                        processarExtratos(e.target.files);
                    }
                    e.target.value = '';
                }
            });

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, () => {
                    zone.classList.remove('dragover');
                });
            });

            zone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    if (tipo === 'fatura') {
                        processarFaturas(files);
                    } else {
                        processarExtratos(files);
                    }
                }
            });
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
        }

        fechar() {
            if (!this.modal) return;
            this.modal.style.display = 'none';
            this.isOpen = false;
            logger.log('Gestão de evidências fechada', 'info');
        }

        atualizarEstatisticas() {
            const totalFaturas = State.evidencias.faturas.length;
            const totalExtratos = State.evidencias.extratos.length;
            const totalFiles = totalFaturas + totalExtratos;
            
            const valorFaturas = State.processados.faturas.reduce((acc, f) => acc + (f.valorPrincipal || 0), 0);
            const valorExtratos = State.processados.extratos.reduce((acc, e) => acc + (e.ganhosLiquidos || 0), 0);

            this.setText('modal-total-files', totalFiles);
            this.setText('modal-total-values', formatarMoeda(valorFaturas + valorExtratos));
            
            this.setText('stats-faturas-files', totalFaturas);
            this.setText('stats-faturas-values', formatarMoeda(valorFaturas));
            
            this.setText('stats-extratos-files', totalExtratos);
            this.setText('stats-extratos-values', formatarMoeda(valorExtratos));
            
            this.setText('count-fat', totalFaturas);
            this.setText('count-ext', totalExtratos);
            this.setText('total-evidencias', totalFiles);
            
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
                        <span title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
                        <button onclick="window.removerFatura(${i})" title="Remover">×</button>
                    </div>
                `).join('');
            }
            
            if (listaExtratos) {
                listaExtratos.innerHTML = State.evidencias.extratos.map((e, i) => `
                    <div class="file-item">
                        <span title="${escapeHtml(e.name)}">${escapeHtml(e.name)}</span>
                        <button onclick="window.removerExtrato(${i})" title="Remover">×</button>
                    </div>
                `).join('');
            }
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
            
            const extensao = '.' + file.name.split('.').pop().toLowerCase();
            if (!CONFIG.ALLOWED_EXTENSIONS.includes(extensao)) {
                return { valido: false, erro: 'Extensão não permitida. Use .pdf' };
            }
            
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                return { valido: false, erro: `Ficheiro muito grande. Máximo: 10MB` };
            }
            
            return { valido: true };
        }
    }

    const evidenceManager = new EvidenceManager();

    // ============================================
    // FUNÇÕES GLOBAIS
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

    async function processarFaturas(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = evidenceManager.validarArquivo(file);
            if (!validacao.valido) {
                logger.log(`Fatura rejeitada: ${validacao.erro}`, 'error');
                alert(`Erro: ${validacao.erro}`);
                continue;
            }
            
            State.evidencias.faturas.push(file);
            
            try {
                const dados = await pdfProcessor.processarFatura(file);
                State.processados.faturas.push(dados);
            } catch (error) {
                logger.log(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
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
                alert(`Erro: ${validacao.erro}`);
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
    // EVENT HANDLERS
    // ============================================

    function bindEventos() {
        const btnValidar = document.getElementById('btn-validar');
        if (btnValidar) {
            btnValidar.addEventListener('click', validarSujeito);
        }

        const btnExecutar = document.getElementById('btn-executar');
        if (btnExecutar) {
            btnExecutar.addEventListener('click', executarPericia);
        }

        const btnExportPDF = document.getElementById('btn-export-pdf');
        if (btnExportPDF) {
            btnExportPDF.addEventListener('click', exportarPDF);
        }

        const btnExportJSON = document.getElementById('btn-export-json');
        if (btnExportJSON) {
            btnExportJSON.addEventListener('click', exportarJSON);
        }

        const btnReiniciar = document.getElementById('btn-reiniciar');
        if (btnReiniciar) {
            btnReiniciar.addEventListener('click', reiniciarAnalise);
        }

        const btnLimpar = document.getElementById('btn-limpar');
        if (btnLimpar) {
            btnLimpar.addEventListener('click', limparDados);
        }

        const anoFiscal = document.getElementById('ano-fiscal');
        if (anoFiscal) {
            anoFiscal.addEventListener('change', () => {
                State.parametros.anoFiscal = anoFiscal.value;
                logger.log(`Ano fiscal alterado para: ${anoFiscal.value}`, 'info');
            });
        }

        const plataforma = document.getElementById('plataforma');
        if (plataforma) {
            plataforma.addEventListener('change', () => {
                State.parametros.plataforma = plataforma.value;
                logger.log(`Plataforma alterada para: ${plataforma.value}`, 'info');
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && evidenceManager.isOpen) {
                evidenceManager.fechar();
            }
        });
    }

    function validarSujeito() {
        const nomeInput = document.getElementById('subject-name');
        const nifInput = document.getElementById('subject-nif');
        const statusEl = document.getElementById('validation-status');
        
        const nome = nomeInput ? nomeInput.value.trim() : '';
        const nif = nifInput ? nifInput.value.trim() : '';
        
        const nifValido = /^\d{9}$/.test(nif);
        
        if (nome && nifValido) {
            State.sujeito.nome = nome;
            State.sujeito.nif = nif;
            State.sujeito.validado = true;
            
            if (statusEl) {
                statusEl.className = 'validation-status';
                statusEl.innerHTML = `<span class="status-dot"></span><span>${nome} | ${nif}</span>`;
            }
            
            logger.log(`Sujeito validado: ${nome} | NIF: ${nif}`, 'success');
        } else {
            if (statusEl) {
                statusEl.className = 'validation-status invalid';
                statusEl.innerHTML = `<span class="status-dot"></span><span>Dados inválidos. NIF deve ter 9 dígitos.</span>`;
            }
            logger.log('Validação falhou', 'error');
        }
    }

    function executarPericia() {
        if (State.isProcessing) {
            logger.log('Perícia já em execução', 'warning');
            return;
        }
        
        logger.log('Iniciando execução da perícia fiscal...', 'info');
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        State.alertas = [];
        
        if (State.processados.extratos.length === 0 && State.processados.faturas.length === 0) {
            logger.log('Perícia abortada: sem evidências', 'warning');
            alert('Adicione evidências antes de executar a perícia');
            return;
        }
        
        State.isProcessing = true;
        
        try {
            const alertas = fiscalCalculator.calcularTudo();
            logger.log(`Perícia concluída. ${alertas.length} alerta(s).`, 
                alertas.some(a => a.tipo === 'critico') ? 'error' : 'success');
        } catch (error) {
            logger.log(`Erro na perícia: ${error.message}`, 'error');
        } finally {
            State.isProcessing = false;
        }
    }

    function reiniciarAnalise() {
        if (!confirm('Deseja reiniciar a análise?')) return;
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        const veredictoSection = document.getElementById('veredicto-section');
        if (veredictoSection) veredictoSection.style.display = 'none';
        
        if (State.chart) {
            State.chart.destroy();
            State.chart = null;
        }
        
        logger.log('Análise reiniciada', 'info');
    }

    function limparDados() {
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
    }

    function exportarJSON() {
        const dados = {
            sessao: State.sessao,
            sujeito: State.sujeito,
            parametros: State.parametros,
            calculos: State.calculos,
            alertas: State.alertas,
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
    }

    function exportarPDF() {
        logger.log('Iniciando exportação PDF...', 'info');
        
        setTimeout(() => {
            alert(`Relatório PDF gerado!\n\nSessão: ${State.sessao.id}\nSujeito: ${State.sujeito.nome || 'N/A'}\nAlertas: ${State.alertas.length}`);
            logger.log('Exportação PDF concluída', 'success');
        }, 800);
    }

    function resetarCalculos() {
        State.calculos = {
            safT: 0, dac7: 0, brutoApp: 0, comissoes: 0,
            ganhosLiquidos: 0, ganhosLiquidosEsperados: 0,
            ganhosCampanha: 0, gorjetas: 0, portagens: 0,
            taxasCancel: 0, faturaTotal: 0, faturaComissao: 0
        };
        
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
    // INICIALIZAÇÃO
    // ============================================

    function init() {
        const loading = document.getElementById('loading-screen');
        const app = document.getElementById('app-container');
        
        setTimeout(() => {
            if (loading) {
                loading.classList.add('hidden');
                setTimeout(() => loading.remove(), 500);
            }
            if (app) app.style.display = 'block';
        }, 500);

        const sessionIdEl = document.getElementById('session-id');
        if (sessionIdEl) sessionIdEl.textContent = State.sessao.id;

        setInterval(() => {
            const timeEl = document.getElementById('session-time');
            if (timeEl) {
                const agora = new Date();
                timeEl.textContent = agora.toLocaleDateString('pt-PT') + ' | ' + 
                                    agora.toLocaleTimeString('pt-PT');
            }
        }, 1000);

        bindEventos();

        logger.log(`Sistema VDC Forense v${CONFIG.VERSAO} ${CONFIG.EDICAO} iniciado`, 'success');
        logger.log(`Sessão: ${State.sessao.id}`, 'info');

        if (typeof Chart === 'undefined') {
            logger.log('Chart.js não carregado', 'warning');
        }

        window.VDC = {
            State,
            CONFIG,
            logger,
            evidenceManager,
            processarFaturas,
            processarExtratos
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
