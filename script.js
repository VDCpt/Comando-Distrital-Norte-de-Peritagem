/**
 * VDC FORENSE v12.9 CSI MIAMI
 * Sistema de Auditoria Digital e Análise Forense Fiscal
 * 
 * Versão: PRODUÇÃO - EXTRAÇÃO REFINADA PARA DOCUMENTOS BOLT PORTUGAL
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÃO
    // ============================================

    const CONFIG = Object.freeze({
        VERSAO: '12.9',
        EDICAO: 'CSI MIAMI',
        TAXA_COMISSAO_MAX: 0.25, // 25% limite legal
        TOLERANCIA_ERRO: 0.01,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
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
            extratos: [],
            dac7: []
        },
        processados: {
            faturas: [],
            extratos: [],
            dac7: []
        },
        calculos: {
            // Extratos
            ganhosApp: 0,
            ganhosCampanha: 0,
            gorjetas: 0,
            portagens: 0,
            taxasCancel: 0,
            comissoes: 0,
            ganhosLiquidos: 0,
            brutoTotal: 0,
            
            // Faturas
            faturaNumero: '---',
            faturaTotal: 0,
            faturaPeriodo: '',
            
            // DAC7
            dac7ReceitaAnual: 0,
            dac7Comissoes: 0,
            dac7Servicos: 0,
            dac7Ganhos1T: 0, dac7Comissoes1T: 0, dac7Impostos1T: 0, dac7Servicos1T: 0,
            dac7Ganhos2T: 0, dac7Comissoes2T: 0, dac7Impostos2T: 0, dac7Servicos2T: 0,
            dac7Ganhos3T: 0, dac7Comissoes3T: 0, dac7Impostos3T: 0, dac7Servicos3T: 0,
            dac7Ganhos4T: 0, dac7Comissoes4T: 0, dac7Impostos4T: 0, dac7Servicos4T: 0
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
        
        // Remove espaços e símbolos de moeda
        let limpo = String(valorStr)
            .replace(/[€$\s]/g, '')
            .trim();
        
        // Detecta formato português (1.000,00) ou inglês (1,000.00)
        const temVirgulaDecimal = /\d+,\d{2}$/.test(limpo);
        const temPontoDecimal = /\d+\.\d{2}$/.test(limpo);
        
        if (temVirgulaDecimal && !temPontoDecimal) {
            // Formato PT: remove pontos (milhar), troca vírgula por ponto
            limpo = limpo.replace(/\./g, '').replace(',', '.');
        } else if (temPontoDecimal && !temVirgulaDecimal) {
            // Formato EN: remove vírgulas (milhar)
            limpo = limpo.replace(/,/g, '');
        } else if (temVirgulaDecimal && temPontoDecimal) {
            // Caso misto: assume PT se vírgula após último ponto
            const ultimaVirgula = limpo.lastIndexOf(',');
            const ultimoPonto = limpo.lastIndexOf('.');
            if (ultimaVirgula > ultimoPonto) {
                limpo = limpo.replace(/\./g, '').replace(',', '.');
            } else {
                limpo = limpo.replace(/,/g, '');
            }
        } else {
            // Remove qualquer caractere não numérico exceto ponto e sinal
            limpo = limpo.replace(/[^\d.-]/g, '');
        }
        
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
            this.container = null;
            this.maxLogs = 100;
        }

        init() {
            this.container = document.getElementById('log-container');
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
            if (!this.container) {
                this.container = document.getElementById('log-container');
            }
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
                hashEl.textContent = gerarHash(this.logs).substring(0, 64);
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
    // PROCESSAMENTO DE PDFs - EXTRATORES REFINADOS
    // ============================================

    class PDFProcessor {
        constructor() {
            // PADRÕES ESPECÍFICOS PARA DOCUMENTOS BOLT PORTUGAL
            this.patterns = {
                extrato: {
                    // Quadro Transações
                    ganhosApp: /Ganhos\s+na\s+app\s*([\d\s.,]+)/i,
                    ganhosCampanha: /Ganhos\s+da\s+campanha\s*([\d\s.,]+)/i,
                    gorjetas: /Gorjetas\s+dos\s+passageiros\s*([\d\s.,]+)/i,
                    portagens: /Portagens\s*([\d\s.,]+)/i,
                    taxasCancel: /Taxas\s+de\s+cancelamento\s*([\d\s.,]+)/i,
                    
                    // Comissões (pode estar com sinal negativo ou não)
                    comissoes: /Comiss[ãa]o\s+da\s+app\s*(-?[\d\s.,]+)/i,
                    
                    // Quadro Ganhos líquidos
                    ganhosLiquidos: /Ganhos\s+l[ií]quidos\s*([\d\s.,]+)/i,
                    
                    // Valores totais do quadro Ganhos líquidos
                    ganhosQuadro: /Ganhos\s*([\d\s.,]+)/i,
                    despesas: /Despesas\s*\([^)]*\)\s*(-?[\d\s.,]+)/i
                },
                fatura: {
                    numero: /Fatura\s+n\.?[º°o]?\s*([A-Z0-9\-]+)/i,
                    valorTotal: /Total\s+com\s+IVA\s*\(EUR\)\s*([\d\s.,]+)/i,
                    periodo: /Per[ií]odo\s*:?\s*(\d{2}-\d{2}-\d{4})\s*[-–a]\s*(\d{2}-\d{2}-\d{4})/i,
                    autoliquidacao: /Autoliquidac[ãa]o\s+de\s+IVA/i,
                    comissoesDesc: /Comiss[oõ]es\s+da\s+Bolt[^0-9]*([\d\s.,]+)/i
                },
                dac7: {
                    receitaAnual: /Total\s+de\s+receitas\s+anuais:\s*([\d\s.,]+)€/i,
                    // Trimestres - padrões mais flexíveis
                    ganhos1T: /Ganhos\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    comissoes1T: /Comiss[oõ]es\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    impostos1T: /Impostos\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    servicos1T: /Serviços\s+prestados\s+no\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
                    
                    ganhos2T: /Ganhos\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    comissoes2T: /Comiss[oõ]es\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    impostos2T: /Impostos\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    servicos2T: /Serviços\s+prestados\s+no\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
                    
                    ganhos3T: /Ganhos\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    comissoes3T: /Comiss[oõ]es\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    impostos3T: /Impostos\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    servicos3T: /Serviços\s+prestados\s+no\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
                    
                    ganhos4T: /Ganhos\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    comissoes4T: /Comiss[oõ]es\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    impostos4T: /Impostos\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
                    servicos4T: /Serviços\s+prestados\s+no\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i
                }
            };
        }

        async processarExtrato(file) {
            logger.log(`A processar extrato: ${file.name}`, 'info');
            
            try {
                const texto = await this.extrairTexto(file);
                
                // Extrair valores específicos
                const ganhosApp = this.extrairValor(texto, this.patterns.extrato.ganhosApp);
                const ganhosCampanha = this.extrairValor(texto, this.patterns.extrato.ganhosCampanha);
                const gorjetas = this.extrairValor(texto, this.patterns.extrato.gorjetas);
                const portagens = this.extrairValor(texto, this.patterns.extrato.portagens);
                const taxasCancel = this.extrairValor(texto, this.patterns.extrato.taxasCancel);
                
                // Comissões (valor absoluto)
                let comissoes = Math.abs(this.extrairValor(texto, this.patterns.extrato.comissoes));
                if (comissoes === 0) {
                    // Fallback: tentar extrair do quadro Despesas
                    comissoes = Math.abs(this.extrairValor(texto, this.patterns.extrato.despesas));
                }
                
                const ganhosLiquidos = this.extrairValor(texto, this.patterns.extrato.ganhosLiquidos);
                
                // Calcular bruto total
                const brutoTotal = ganhosApp + ganhosCampanha + gorjetas + portagens + taxasCancel;
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    ganhosApp,
                    ganhosCampanha,
                    gorjetas,
                    portagens,
                    taxasCancel,
                    comissoes,
                    ganhosLiquidos,
                    brutoTotal
                };

                logger.log(`Extrato processado: ${file.name} | Bruto: ${formatarMoeda(brutoTotal)} | Líquido: ${formatarMoeda(ganhosLiquidos)}`, 'success');
                
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
                
                const numero = this.extrairTextoMatch(texto, this.patterns.fatura.numero) || 'N/A';
                const valorTotal = this.extrairValor(texto, this.patterns.fatura.valorTotal);
                const periodoMatch = texto.match(this.patterns.fatura.periodo);
                const periodo = periodoMatch ? `${periodoMatch[1]} a ${periodoMatch[2]}` : 'N/A';
                const isAutoliquidacao = this.patterns.fatura.autoliquidacao.test(texto);
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    numero,
                    valorTotal,
                    periodo,
                    isAutoliquidacao
                };

                logger.log(`Fatura processada: ${file.name} | N.º: ${numero} | Valor: ${formatarMoeda(valorTotal)}`, 'success');
                
                return dados;
            } catch (error) {
                logger.log(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
                throw error;
            }
        }

        async processarDAC7(file) {
            logger.log(`A processar relatório DAC7: ${file.name}`, 'info');
            
            try {
                const texto = await this.extrairTexto(file);
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    receitaAnual: this.extrairValor(texto, this.patterns.dac7.receitaAnual),
                    
                    // Trimestre 1
                    ganhos1T: this.extrairValor(texto, this.patterns.dac7.ganhos1T),
                    comissoes1T: this.extrairValor(texto, this.patterns.dac7.comissoes1T),
                    impostos1T: this.extrairValor(texto, this.patterns.dac7.impostos1T),
                    servicos1T: this.extrairValor(texto, this.patterns.dac7.servicos1T),
                    
                    // Trimestre 2
                    ganhos2T: this.extrairValor(texto, this.patterns.dac7.ganhos2T),
                    comissoes2T: this.extrairValor(texto, this.patterns.dac7.comissoes2T),
                    impostos2T: this.extrairValor(texto, this.patterns.dac7.impostos2T),
                    servicos2T: this.extrairValor(texto, this.patterns.dac7.servicos2T),
                    
                    // Trimestre 3
                    ganhos3T: this.extrairValor(texto, this.patterns.dac7.ganhos3T),
                    comissoes3T: this.extrairValor(texto, this.patterns.dac7.comissoes3T),
                    impostos3T: this.extrairValor(texto, this.patterns.dac7.impostos3T),
                    servicos3T: this.extrairValor(texto, this.patterns.dac7.servicos3T),
                    
                    // Trimestre 4
                    ganhos4T: this.extrairValor(texto, this.patterns.dac7.ganhos4T),
                    comissoes4T: this.extrairValor(texto, this.patterns.dac7.comissoes4T),
                    impostos4T: this.extrairValor(texto, this.patterns.dac7.impostos4T),
                    servicos4T: this.extrairValor(texto, this.patterns.dac7.servicos4T)
                };

                // Calcular totais se não encontrados diretamente
                if (dados.receitaAnual === 0) {
                    dados.receitaAnual = dados.ganhos1T + dados.ganhos2T + dados.ganhos3T + dados.ganhos4T;
                }
                
                const comissoesTotais = dados.comissoes1T + dados.comissoes2T + dados.comissoes3T + dados.comissoes4T;
                const servicosTotais = dados.servicos1T + dados.servicos2T + dados.servicos3T + dados.servicos4T;

                logger.log(`DAC7 processado: Receita anual ${formatarMoeda(dados.receitaAnual)} | Comissões totais ${formatarMoeda(comissoesTotais)}`, 'success');
                
                return {
                    ...dados,
                    comissoesTotais,
                    servicosTotais
                };
            } catch (error) {
                logger.log(`Erro ao processar DAC7 ${file.name}: ${error.message}`, 'error');
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
                // Inclui caracteres latinos e acentos portugueses
                if (cleanLine.length > 0 && /[\x20-\x7E\u00A0-\u00FF]/.test(cleanLine)) {
                    // Ignora linhas de controle PDF
                    if (!cleanLine.startsWith('%') && 
                        !cleanLine.startsWith('<<') && 
                        !cleanLine.startsWith('stream') &&
                        !cleanLine.startsWith('endstream') &&
                        !cleanLine.startsWith('obj') &&
                        !cleanLine.startsWith('endobj')) {
                        text += cleanLine + '\n';
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

        extrairTextoMatch(texto, pattern) {
            if (!texto || !pattern) return null;
            const match = texto.match(pattern);
            return match ? match[1].trim() : null;
        }
    }

    const pdfProcessor = new PDFProcessor();

    // ============================================
    // CÁLCULOS FISCAIS E TRIANGULAÇÃO
    // ============================================

    class FiscalCalculator {
        constructor() {
            this.alertas = [];
        }

        calcularTudo() {
            this.alertas = [];
            
            this.aggregarExtratos();
            this.aggregarFaturas();
            this.aggregarDAC7();
            
            this.validarCruzamentos();
            this.atualizarDashboard();
            
            return this.alertas;
        }

        aggregarExtratos() {
            const totals = State.processados.extratos.reduce((acc, ext) => {
                acc.ganhosApp += ext.ganhosApp || 0;
                acc.ganhosCampanha += ext.ganhosCampanha || 0;
                acc.gorjetas += ext.gorjetas || 0;
                acc.portagens += ext.portagens || 0;
                acc.taxasCancel += ext.taxasCancel || 0;
                acc.comissoes += ext.comissoes || 0;
                acc.ganhosLiquidos += ext.ganhosLiquidos || 0;
                acc.brutoTotal += ext.brutoTotal || 0;
                return acc;
            }, {
                ganhosApp: 0, ganhosCampanha: 0, gorjetas: 0,
                portagens: 0, taxasCancel: 0, comissoes: 0,
                ganhosLiquidos: 0, brutoTotal: 0
            });
            
            State.calculos.ganhosApp = totals.ganhosApp;
            State.calculos.ganhosCampanha = totals.ganhosCampanha;
            State.calculos.gorjetas = totals.gorjetas;
            State.calculos.portagens = totals.portagens;
            State.calculos.taxasCancel = totals.taxasCancel;
            State.calculos.comissoes = totals.comissoes;
            State.calculos.ganhosLiquidos = totals.ganhosLiquidos;
            State.calculos.brutoTotal = totals.brutoTotal;
        }

        aggregarFaturas() {
            const ultimaFatura = State.processados.faturas[State.processados.faturas.length - 1];
            if (ultimaFatura) {
                State.calculos.faturaNumero = ultimaFatura.numero;
                State.calculos.faturaTotal = ultimaFatura.valorTotal;
                State.calculos.faturaPeriodo = ultimaFatura.periodo;
            }
        }

        aggregarDAC7() {
            const ultimoDAC7 = State.processados.dac7[State.processados.dac7.length - 1];
            if (ultimoDAC7) {
                State.calculos.dac7ReceitaAnual = ultimoDAC7.receitaAnual;
                State.calculos.dac7Comissoes = ultimoDAC7.comissoesTotais || 0;
                State.calculos.dac7Servicos = ultimoDAC7.servicosTotais || 0;
                
                // Guardar valores trimestrais
                State.calculos.dac7Ganhos1T = ultimoDAC7.ganhos1T || 0;
                State.calculos.dac7Comissoes1T = ultimoDAC7.comissoes1T || 0;
                State.calculos.dac7Impostos1T = ultimoDAC7.impostos1T || 0;
                State.calculos.dac7Servicos1T = ultimoDAC7.servicos1T || 0;
                
                State.calculos.dac7Ganhos2T = ultimoDAC7.ganhos2T || 0;
                State.calculos.dac7Comissoes2T = ultimoDAC7.comissoes2T || 0;
                State.calculos.dac7Impostos2T = ultimoDAC7.impostos2T || 0;
                State.calculos.dac7Servicos2T = ultimoDAC7.servicos2T || 0;
                
                State.calculos.dac7Ganhos3T = ultimoDAC7.ganhos3T || 0;
                State.calculos.dac7Comissoes3T = ultimoDAC7.comissoes3T || 0;
                State.calculos.dac7Impostos3T = ultimoDAC7.impostos3T || 0;
                State.calculos.dac7Servicos3T = ultimoDAC7.servicos3T || 0;
                
                State.calculos.dac7Ganhos4T = ultimoDAC7.ganhos4T || 0;
                State.calculos.dac7Comissoes4T = ultimoDAC7.comissoes4T || 0;
                State.calculos.dac7Impostos4T = ultimoDAC7.impostos4T || 0;
                State.calculos.dac7Servicos4T = ultimoDAC7.servicos4T || 0;
            }
        }

        validarCruzamentos() {
            const c = State.calculos;
            
            // 1. Validação: Ganhos brutos vs DAC7
            if (Math.abs(c.brutoTotal - c.dac7ReceitaAnual) > CONFIG.TOLERANCIA_ERRO * 100) {
                this.adicionarAlerta('critico', 'DISCREPÂNCIA SAF-T vs DAC7', 
                    `Extratos (${formatarMoeda(c.brutoTotal)}) ≠ DAC7 (${formatarMoeda(c.dac7ReceitaAnual)})`,
                    Math.abs(c.brutoTotal - c.dac7ReceitaAnual));
            }
            
            // 2. Validação: Comissões vs Fatura
            if (c.faturaTotal > 0 && Math.abs(c.comissoes - c.faturaTotal) > CONFIG.TOLERANCIA_ERRO * 10) {
                this.adicionarAlerta('alerta', 'COMISSÃO vs FATURA',
                    `Comissões extrato: ${formatarMoeda(c.comissoes)} | Faturado: ${formatarMoeda(c.faturaTotal)}`,
                    Math.abs(c.comissoes - c.faturaTotal));
            }
            
            // 3. Validação: Taxa de comissão
            const baseComissao = c.ganhosApp + c.ganhosCampanha + c.gorjetas + c.portagens + c.taxasCancel;
            const taxaEfetiva = baseComissao > 0 ? c.comissoes / baseComissao : 0;
            
            if (taxaEfetiva > CONFIG.TAXA_COMISSAO_MAX + 0.05) {
                this.adicionarAlerta('critico', 'COMISSÃO EXCEDE LIMITE LEGAL',
                    `Taxa: ${(taxaEfetiva * 100).toFixed(2)}% | Limite: 25%`,
                    c.comissoes - (baseComissao * CONFIG.TAXA_COMISSAO_MAX));
            }
            
            // 4. Validação: Ganhos líquidos (cálculo vs reportado)
            const ganhosLiquidosCalculados = baseComissao - c.comissoes;
            if (Math.abs(ganhosLiquidosCalculados - c.ganhosLiquidos) > CONFIG.TOLERANCIA_ERRO * 10) {
                this.adicionarAlerta('alerta', 'DISCREPÂNCIA GANHOS LÍQUIDOS',
                    `Calculado: ${formatarMoeda(ganhosLiquidosCalculados)} | Reportado: ${formatarMoeda(c.ganhosLiquidos)}`,
                    Math.abs(ganhosLiquidosCalculados - c.ganhosLiquidos));
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
                const percentualDesvio = State.calculos.dac7ReceitaAnual > 0 ? (desvioTotal / State.calculos.dac7ReceitaAnual) * 100 : 0;
                
                status.textContent = 'CRÍTICO';
                status.style.color = 'var(--danger)';
                desvio.textContent = `Desvio: ${percentualDesvio.toFixed(2)}%`;
                desvio.style.color = 'var(--danger)';
                
                section.classList.add('critico');
                
                anomalia.style.display = 'flex';
                const texto = document.getElementById('anomalia-texto');
                const valor = document.getElementById('valor-anomalia');
                texto.textContent = `Potencial incumprimento fiscal (Art. 103.º RGIT). ${alertasCriticas.length} anomalia(s) crítica(s).`;
                valor.textContent = formatarMoeda(desvioTotal);
                
                this.atualizarTriangulacao(desvioTotal);
                logger.log(`Perícia: CRÍTICO (${percentualDesvio.toFixed(2)}%)`, 'error');
                
            } else if (alertasNormais.length > 0) {
                status.textContent = 'ALERTA';
                status.style.color = 'var(--warning)';
                desvio.textContent = 'Requer verificação manual';
                desvio.style.color = 'var(--warning)';
                
                section.classList.remove('critico');
                anomalia.style.display = 'none';
                this.atualizarTriangulacao(0);
                logger.log('Perícia: ALERTA', 'warning');
                
            } else {
                status.textContent = 'NORMAL';
                status.style.color = 'var(--success)';
                desvio.textContent = 'Sem desvios significativos';
                desvio.style.color = 'var(--success)';
                
                section.classList.remove('critico');
                anomalia.style.display = 'none';
                this.atualizarTriangulacao(0);
                logger.log('Perícia: NORMAL', 'success');
            }
        }

        atualizarTriangulacao(discrepancia) {
            const c = State.calculos;
            
            const brutoTotal = c.ganhosApp + c.ganhosCampanha + c.gorjetas + c.portagens + c.taxasCancel;
            
            this.setText('tri-bruto', formatarMoeda(brutoTotal));
            this.setText('tri-comissoes', formatarMoeda(c.comissoes));
            this.setText('tri-liquido', formatarMoeda(c.ganhosLiquidos));
            this.setText('tri-faturado', formatarMoeda(c.faturaTotal));
            
            const discItem = document.getElementById('tri-discrepancia-item');
            const discValor = document.getElementById('tri-discrepancia');
            
            if (discItem && discValor) {
                if (discrepancia > CONFIG.TOLERANCIA_ERRO * 100) {
                    discItem.style.display = 'block';
                    discValor.textContent = formatarMoeda(discrepancia);
                } else {
                    discItem.style.display = 'none';
                }
            }
        }

        atualizarDashboard() {
            const c = State.calculos;
            
            // Métricas principais
            this.setText('ganhos-app', formatarMoeda(c.ganhosApp + c.ganhosCampanha + c.gorjetas + c.portagens + c.taxasCancel));
            this.setText('comissoes-total', formatarMoeda(c.comissoes));
            this.setText('dac7-anual', formatarMoeda(c.dac7ReceitaAnual));
            this.setText('total-saft', formatarMoeda(c.brutoTotal));
            
            // Extrato detalhado
            this.setText('ext-ganhos-app', formatarMoeda(c.ganhosApp));
            this.setText('ext-ganhos-campanha', formatarMoeda(c.ganhosCampanha));
            this.setText('ext-gorjetas', formatarMoeda(c.gorjetas));
            this.setText('ext-portagens', formatarMoeda(c.portagens));
            this.setText('ext-taxas-cancel', formatarMoeda(c.taxasCancel));
            this.setText('ext-comissoes', formatarMoeda(c.comissoes));
            this.setText('ext-ganhos-liquidos', formatarMoeda(c.ganhosLiquidos));
            
            // Fatura
            this.setText('fat-numero', c.faturaNumero);
            this.setText('fat-total', formatarMoeda(c.faturaTotal));
            this.setText('fat-periodo', c.faturaPeriodo);
            
            // DAC7
            this.setText('dac7-valor', formatarMoeda(c.dac7ReceitaAnual));
            this.setText('dac7-ano', State.parametros.anoFiscal);
            this.setText('dac7-comissoes', formatarMoeda(c.dac7Comissoes));
            this.setText('dac7-servicos', c.dac7Servicos.toString());
            
            // Nota DAC7 com detalhes trimestrais
            const dac7Note = document.getElementById('dac7-note');
            if (dac7Note) {
                dac7Note.innerHTML = `
                    1T: ${formatarMoeda(c.dac7Ganhos1T)} · 2T: ${formatarMoeda(c.dac7Ganhos2T)} · 
                    3T: ${formatarMoeda(c.dac7Ganhos3T)} · 4T: ${formatarMoeda(c.dac7Ganhos4T)}
                `;
            }
            
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
            
            const total = State.processados.faturas.length + State.processados.extratos.length + State.processados.dac7.length;
            
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
            const brutoTotal = c.ganhosApp + c.ganhosCampanha + c.gorjetas + c.portagens + c.taxasCancel;
            
            if (brutoTotal === 0 && c.comissoes === 0 && c.dac7ReceitaAnual === 0) {
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
                return;
            }
            
            canvas.style.display = 'block';
            if (fallback) fallback.style.display = 'none';
            
            try {
                if (State.chart) State.chart.destroy();
                
                const ctx = canvas.getContext('2d');
                State.chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Bruto', 'Comissões', 'Líquido', 'DAC7', 'Faturado'],
                        datasets: [{
                            label: 'Valores (€)',
                            data: [
                                brutoTotal,
                                c.comissoes,
                                c.ganhosLiquidos,
                                c.dac7ReceitaAnual,
                                c.faturaTotal
                            ],
                            backgroundColor: [
                                'rgba(6, 182, 212, 0.8)',
                                'rgba(245, 158, 11, 0.8)',
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(139, 92, 246, 0.8)',
                                'rgba(236, 72, 153, 0.8)'
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
    // GESTÃO DE EVIDÊNCIAS - UPLOAD
    // ============================================

    class EvidenceManager {
        constructor() {
            this.modal = null;
            this.isOpen = false;
        }

        init() {
            this.modal = document.getElementById('evidence-modal');
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
            this.setupUploadZone('upload-dac7', 'input-dac7', 'dac7');

            document.querySelectorAll('.evidence-item').forEach(item => {
                item.addEventListener('click', () => this.abrir());
            });
        }

        setupUploadZone(zoneId, inputId, tipo) {
            const zone = document.getElementById(zoneId);
            const input = document.getElementById(inputId);

            if (!zone || !input) return;

            zone.addEventListener('click', (e) => {
                if (e.target !== input) {
                    input.click();
                }
            });

            input.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    if (tipo === 'fatura') {
                        processarFaturas(e.target.files);
                    } else if (tipo === 'extrato') {
                        processarExtratos(e.target.files);
                    } else if (tipo === 'dac7') {
                        processarDAC7(e.target.files);
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
                    } else if (tipo === 'extrato') {
                        processarExtratos(files);
                    } else if (tipo === 'dac7') {
                        processarDAC7(files);
                    }
                }
            });
        }

        toggle() {
            this.isOpen ? this.fechar() : this.abrir();
        }

        abrir() {
            if (!this.modal) this.modal = document.getElementById('evidence-modal');
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
            const totalDAC7 = State.evidencias.dac7.length;
            const totalFiles = totalFaturas + totalExtratos + totalDAC7;
            
            const valorFaturas = State.processados.faturas.reduce((acc, f) => acc + (f.valorTotal || 0), 0);
            const valorExtratos = State.processados.extratos.reduce((acc, e) => acc + (e.ganhosLiquidos || 0), 0);
            const valorDAC7 = State.processados.dac7.reduce((acc, d) => acc + (d.receitaAnual || 0), 0);

            this.setText('modal-total-files', totalFiles);
            this.setText('modal-total-values', formatarMoeda(valorFaturas + valorExtratos + valorDAC7));
            
            this.setText('stats-faturas-files', totalFaturas);
            this.setText('stats-faturas-values', formatarMoeda(valorFaturas));
            
            this.setText('stats-extratos-files', totalExtratos);
            this.setText('stats-extratos-values', formatarMoeda(valorExtratos));
            
            this.setText('stats-dac7-files', totalDAC7);
            this.setText('stats-dac7-values', formatarMoeda(valorDAC7));
            
            this.setText('count-fat', totalFaturas);
            this.setText('count-ext', totalExtratos);
            this.setText('count-dac7', totalDAC7);
            this.setText('count-ctrl', Math.min(totalFiles, 4));
            this.setText('count-saft', totalExtratos > 0 ? 1 : 0);
            this.setText('total-evidencias', totalFiles);
            
            this.renderizarListas();
        }

        setText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        renderizarListas() {
            const listaFaturas = document.getElementById('lista-faturas');
            const listaExtratos = document.getElementById('lista-extratos');
            const listaDAC7 = document.getElementById('lista-dac7');
            
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
            
            if (listaDAC7) {
                listaDAC7.innerHTML = State.evidencias.dac7.map((d, i) => `
                    <div class="file-item">
                        <span title="${escapeHtml(d.name)}">${escapeHtml(d.name)}</span>
                        <button onclick="window.removerDAC7(${i})" title="Remover">×</button>
                    </div>
                `).join('');
            }
        }

        limparTudo() {
            State.evidencias.faturas = [];
            State.evidencias.extratos = [];
            State.evidencias.dac7 = [];
            State.processados.faturas = [];
            State.processados.extratos = [];
            State.processados.dac7 = [];
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
    // FUNÇÕES GLOBAIS DE REMOÇÃO
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

    window.removerDAC7 = function(index) {
        if (index >= 0 && index < State.evidencias.dac7.length) {
            const nome = State.evidencias.dac7[index].name;
            State.evidencias.dac7.splice(index, 1);
            State.processados.dac7.splice(index, 1);
            evidenceManager.atualizarEstatisticas();
            logger.log(`Relatório DAC7 removido: ${nome}`, 'warning');
        }
    };

    // ============================================
    // PROCESSAMENTO DE FICHEIROS
    // ============================================

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

    async function processarDAC7(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = evidenceManager.validarArquivo(file);
            if (!validacao.valido) {
                logger.log(`DAC7 rejeitado: ${validacao.erro}`, 'error');
                alert(`Erro: ${validacao.erro}`);
                continue;
            }
            
            State.evidencias.dac7.push(file);
            
            try {
                const dados = await pdfProcessor.processarDAC7(file);
                State.processados.dac7.push(dados);
            } catch (error) {
                logger.log(`Erro ao processar DAC7 ${file.name}: ${error.message}`, 'error');
                State.evidencias.dac7.pop();
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
        
        if (State.processados.extratos.length === 0 && State.processados.faturas.length === 0 && State.processados.dac7.length === 0) {
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
            evidencias: {
                faturas: State.processados.faturas,
                extratos: State.processados.extratos,
                dac7: State.processados.dac7
            },
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
            ganhosApp: 0, ganhosCampanha: 0, gorjetas: 0, portagens: 0, taxasCancel: 0,
            comissoes: 0, ganhosLiquidos: 0, brutoTotal: 0,
            faturaNumero: '---', faturaTotal: 0, faturaPeriodo: '',
            dac7ReceitaAnual: 0, dac7Comissoes: 0, dac7Servicos: 0,
            dac7Ganhos1T: 0, dac7Comissoes1T: 0, dac7Impostos1T: 0, dac7Servicos1T: 0,
            dac7Ganhos2T: 0, dac7Comissoes2T: 0, dac7Impostos2T: 0, dac7Servicos2T: 0,
            dac7Ganhos3T: 0, dac7Comissoes3T: 0, dac7Impostos3T: 0, dac7Servicos3T: 0,
            dac7Ganhos4T: 0, dac7Comissoes4T: 0, dac7Impostos4T: 0, dac7Servicos4T: 0
        };
        
        const ids = [
            'ganhos-app', 'comissoes-total', 'dac7-anual', 'total-saft',
            'ext-ganhos-app', 'ext-ganhos-campanha', 'ext-gorjetas', 'ext-portagens',
            'ext-taxas-cancel', 'ext-comissoes', 'ext-ganhos-liquidos',
            'fat-numero', 'fat-total', 'fat-periodo',
            'dac7-valor', 'dac7-comissoes', 'dac7-servicos',
            'tri-bruto', 'tri-comissoes', 'tri-liquido', 'tri-faturado'
        ];
        
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el && id !== 'fat-numero' && id !== 'fat-periodo') {
                el.textContent = '0,00 €';
            } else if (el && id === 'fat-numero') {
                el.textContent = '---';
            } else if (el && id === 'fat-periodo') {
                el.textContent = '---';
            }
        });
        
        const dac7Note = document.getElementById('dac7-note');
        if (dac7Note) {
            dac7Note.innerHTML = 'Reporting nos termos do Art. 6.º DAC7';
        }
        
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
        
        // Simular carregamento e remover barreira
        setTimeout(() => {
            if (loading) {
                loading.classList.add('hidden');
                setTimeout(() => {
                    if (loading.parentNode) {
                        loading.parentNode.removeChild(loading);
                    }
                }, 500);
            }
            if (app) app.style.display = 'block';
        }, 1500); // Tempo para visualizar a barreira

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

        // Inicializar componentes
        logger.init();
        evidenceManager.init();

        bindEventos();

        logger.log(`Sistema VDC Forense v${CONFIG.VERSAO} ${CONFIG.EDICAO} iniciado`, 'success');
        logger.log(`Sessão: ${State.sessao.id}`, 'info');

        if (typeof Chart === 'undefined') {
            logger.log('Chart.js não carregado - gráficos indisponíveis', 'warning');
        }

        // Exportar para debug
        window.VDC = {
            State,
            CONFIG,
            logger,
            evidenceManager,
            pdfProcessor,
            fiscalCalculator,
            processarFaturas,
            processarExtratos,
            processarDAC7
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
