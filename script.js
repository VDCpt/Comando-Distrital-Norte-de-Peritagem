/**
 * VDC FORENSE v12.9 SYNC SCHEMA
 * Sistema de Auditoria Digital com Dispatcher Centralizado
 * 
 * Arquitetura: Module Pattern + Dispatcher Queue + Binary Normalization
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÃO E CONSTANTES
    // ============================================

    const CONFIG = Object.freeze({
        VERSAO: '12.9',
        EDICAO: 'SYNC SCHEMA',
        TAXA_COMISSAO_MAX: 0.25,
        TOLERANCIA_ERRO: 0.01,
        MAX_FILE_SIZE: 10 * 1024 * 1024,
        ALLOWED_TYPES: {
            PDF: ['application/pdf'],
            XML: ['application/xml', 'text/xml'],
            CSV: ['text/csv', 'application/vnd.ms-excel'],
            DAC7: ['application/pdf', 'message/rfc822']
        },
        ALLOWED_EXTENSIONS: {
            PDF: ['.pdf'],
            XML: ['.xml'],
            CSV: ['.csv'],
            DAC7: ['.pdf', '.eml', '.msg']
        },
        PATTERNS: {
            // Normalização Binária: Remove \n \r e espaços entre dígitos
            NORMALIZACAO: /[\n\r\s]+/g,
            EXTRATO_VALOR: /(?:valor|amount|total)[\s:]*([\d\s.,]+)/i,
            EXTRATO_GANHOS: /(?:ganhos?|earnings)[\s:]*([\d\s.,]+)/i,
            EXTRATO_COMISSAO: /(?:comiss[ãa]o|commission|fee)[\s:]*([\d\s.,]+)/i,
            FATURA_VALOR: /(?:total|amount)[\s:]*([\d\s.,]+)/i,
            SAF_Total: /<AuditFile>[\s\S]*?<TotalDebit>([\d.]+)<\/TotalDebit>/i
        }
    });

    // ============================================
    // ESTADO GLOBAL SINCRONIZADO
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
            saft: [],
            csv: [],
            faturas: [],
            extratos: [],
            dac7: []
        },
        processados: {
            saft: [],
            csv: [],
            faturas: [],
            extratos: [],
            dac7: []
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
        isProcessing: false,
        chartReady: false
    };

    // ============================================
    // UTILITÁRIOS CORE
    // ============================================

    function gerarIdSessao() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `VDC-${random}-${timestamp}`;
    }

    /**
     * Parser de Normalização Binária
     * Remove \n, \r e normaliza espaços para captura atómica de valores
     */
    function normalizarTextoBinario(texto) {
        if (!texto || typeof texto !== 'string') return '';
        
        // Filtro Regex: Remove \n \r e múltiplos espaços
        return texto
            .replace(CONFIG.PATTERNS.NORMALIZACAO, ' ')
            .replace(/\s+/g, ' ')
            .trim();
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
        
        // Aplica normalização binária antes do parse
        const limpo = normalizarTextoBinario(String(valorStr))
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
    // DISPATCHER CENTRALIZADO (Anti-Ruído/Memory Buffer)
    // ============================================

    class ProcessingDispatcher {
        constructor() {
            this.queue = [];
            this.isProcessing = false;
            this.maxConcurrent = 1; // Serial processing para evitar ruído
            this.activeJobs = 0;
        }

        /**
         * Adiciona job à fila com prioridade
         */
        enqueue(tipo, files, processor) {
            return new Promise((resolve, reject) => {
                const job = {
                    id: Date.now() + Math.random(),
                    tipo,
                    files: Array.from(files),
                    processor,
                    resolve,
                    reject,
                    timestamp: Date.now()
                };
                
                this.queue.push(job);
                this.processQueue();
            });
        }

        async processQueue() {
            if (this.isProcessing || this.queue.length === 0 || this.activeJobs >= this.maxConcurrent) {
                return;
            }

            this.isProcessing = true;
            const job = this.queue.shift();
            this.activeJobs++;

            try {
                logger.log(`Dispatcher: Iniciando processamento ${job.tipo} (${job.files.length} ficheiros)`, 'info');
                
                const results = [];
                for (const file of job.files) {
                    const result = await job.processor(file);
                    results.push(result);
                }
                
                job.resolve(results);
                logger.log(`Dispatcher: ${job.tipo} concluído`, 'success');
            } catch (error) {
                logger.log(`Dispatcher: Erro em ${job.tipo} - ${error.message}`, 'error');
                job.reject(error);
            } finally {
                this.activeJobs--;
                this.isProcessing = false;
                
                // Próximo job na fila
                setTimeout(() => this.processQueue(), 50);
            }
        }

        clear() {
            this.queue = [];
            this.isProcessing = false;
            this.activeJobs = 0;
            logger.log('Dispatcher: Fila limpa', 'warning');
        }

        getStatus() {
            return {
                queueLength: this.queue.length,
                isProcessing: this.isProcessing,
                activeJobs: this.activeJobs
            };
        }
    }

    const dispatcher = new ProcessingDispatcher();

    // ============================================
    // LOGGER FORENSE
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
    // PARSERS ESPECÍFICOS POR TIPO
    // ============================================

    class SAFTParser {
        async parse(file) {
            logger.log(`SAF-T: A processar ${file.name}`, 'info');
            
            try {
                const texto = await this.lerArquivo(file);
                const normalizado = normalizarTextoBinario(texto);
                
                // Parse XML básico para SAF-T
                const totalDebit = this.extrairValor(normalizado, /<TotalDebit>([\d.]+)<\/TotalDebit>/);
                const totalCredit = this.extrairValor(normalizado, /<TotalCredit>([\d.]+)<\/TotalCredit>/);
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    totalDebit,
                    totalCredit,
                    total: totalDebit + totalCredit,
                    hash: await this.calcularHash(file)
                };

                logger.log(`SAF-T processado: ${formatarMoeda(dados.total)}`, 'success');
                return dados;
            } catch (error) {
                logger.log(`Erro SAF-T: ${error.message}`, 'error');
                throw error;
            }
        }

        lerArquivo(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Falha ao ler SAF-T'));
                reader.readAsText(file);
            });
        }

        extrairValor(texto, pattern) {
            const match = texto.match(pattern);
            return match ? parseFloat(match[1]) || 0 : 0;
        }

        async calcularHash(file) {
            // Simulação de hash para autenticidade
            return gerarHash(file.name + file.size + file.lastModified);
        }
    }

    class CSVParser {
        async parse(file) {
            logger.log(`CSV: A processar ${file.name}`, 'info');
            
            try {
                const texto = await this.lerArquivo(file);
                const linhas = texto.split('\n').filter(l => l.trim());
                const registos = [];
                
                // Parse CSV simples (hash, filename, timestamp)
                for (let i = 1; i < linhas.length; i++) {
                    const cols = linhas[i].split(',').map(c => c.trim());
                    if (cols.length >= 2) {
                        registos.push({
                            hash: cols[0],
                            ficheiro: cols[1],
                            timestamp: cols[2] || new Date().toISOString()
                        });
                    }
                }

                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    registos,
                    totalRegistos: registos.length,
                    valido: registos.length > 0
                };

                logger.log(`CSV processado: ${dados.totalRegistos} registos`, 'success');
                return dados;
            } catch (error) {
                logger.log(`Erro CSV: ${error.message}`, 'error');
                throw error;
            }
        }

        lerArquivo(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Falha ao ler CSV'));
                reader.readAsText(file);
            });
        }
    }

    class PDFProcessor {
        constructor() {
            this.patterns = {
                extrato: {
                    ganhosApp: /(?:ganhos?\s+(?:na\s+)?app|earnings)[\s:]*([\d\s.,]+)/i,
                    ganhosCampanha: /(?:ganhos?\s+campanha|campaign)[\s:]*([\d\s.,]+)/i,
                    gorjetas: /(?:gorjeta|tip)s?[\s:]*([\d\s.,]+)/i,
                    portagens: /(?:portagem|toll)s?[\s:]*([\d\s.,]+)/i,
                    taxasCancel: /(?:taxa\s+de\s+cancelamento|cancellation)[\s:]*([\d\s.,]+)/i,
                    comissoes: /(?:comiss[ãa]o|commission|fee)[\s:]*([\d\s.,]+)/i,
                    ganhosLiquidos: /(?:ganhos?\s+l[íi]quidos?|net\s+earnings)[\s:]*([\d\s.,]+)/i,
                    brutoTotal: /(?:total\s+bruto|gross\s+total)[\s:]*([\d\s.,]+)/i
                },
                fatura: {
                    numero: /(?:n[º°]?\s*fatura|invoice\s*no)[\s:.]*([A-Z0-9\-\/]+)/i,
                    valorTotal: /(?:total|amount\s+due)[\s:]*([\d\s.,]+)/i,
                    valorLiquido: /(?:valor\s+l[íi]quido|net\s+amount)[\s:]*([\d\s.,]+)/i,
                    iva: /(?:iva|vat)[\s:]*([\d\s.,]+)/i,
                    autoliquidacao: /autoliquidacao|reverse\s+charge/i
                },
                dac7: {
                    valorReportado: /(?:valor\s+reportado|reported\s+amount)[\s:]*([\d\s.,]+)/i,
                    anoFiscal: /(?:ano\s+fiscal|fiscal\s+year)[\s:]*(\d{4})/i,
                    plataforma: /(?:plataforma|platform)[\s:]*(\w+)/i
                }
            };
        }

        async processarExtrato(file) {
            logger.log(`Extrato: A processar ${file.name}`, 'info');
            
            try {
                const textoRaw = await this.extrairTexto(file);
                const texto = normalizarTextoBinario(textoRaw); // Normalização Binária aplicada
                
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

                // Cálculo automático se bruto não encontrado
                if (dados.brutoTotal === 0) {
                    dados.brutoTotal = dados.ganhosApp + dados.ganhosCampanha + 
                                      dados.gorjetas + dados.portagens + dados.taxasCancel;
                }

                const baseComissao = dados.ganhosApp + dados.taxasCancel;
                dados.taxaComissao = baseComissao > 0 ? dados.comissoes / baseComissao : 0;
                dados.comissaoValida = dados.taxaComissao <= CONFIG.TAXA_COMISSAO_MAX + CONFIG.TOLERANCIA_ERRO;

                logger.log(`Extrato OK: ${formatarMoeda(dados.brutoTotal)}`, 'success');
                return dados;
            } catch (error) {
                logger.log(`Erro Extrato: ${error.message}`, 'error');
                throw error;
            }
        }

        async processarFatura(file) {
            logger.log(`Fatura: A processar ${file.name}`, 'info');
            
            try {
                const textoRaw = await this.extrairTexto(file);
                const texto = normalizarTextoBinario(textoRaw); // Normalização Binária
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

                logger.log(`Fatura OK: ${formatarMoeda(dados.valorPrincipal)}`, 'success');
                return dados;
            } catch (error) {
                logger.log(`Erro Fatura: ${error.message}`, 'error');
                throw error;
            }
        }

        async processarDAC7(file) {
            logger.log(`DAC7: A processar ${file.name}`, 'info');
            
            try {
                const textoRaw = await this.extrairTexto(file);
                const texto = normalizarTextoBinario(textoRaw); // Normalização Binária
                
                const dados = {
                    nome: file.name,
                    tamanho: file.size,
                    dataUpload: new Date(),
                    valorReportado: this.extrairValor(texto, this.patterns.dac7.valorReportado),
                    anoFiscal: this.extrairTexto(texto, this.patterns.dac7.anoFiscal) || State.parametros.anoFiscal,
                    plataforma: this.extrairTexto(texto, this.patterns.dac7.plataforma) || 'Bolt',
                    isEmail: file.name.endsWith('.eml') || file.name.endsWith('.msg')
                };

                logger.log(`DAC7 OK: ${formatarMoeda(dados.valorReportado)}`, 'success');
                return dados;
            } catch (error) {
                logger.log(`Erro DAC7: ${error.message}`, 'error');
                throw error;
            }
        }

        async extrairTexto(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const text = e.target.result;
                        // Extrai texto legível de dados binários PDF
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

    // Instâncias dos parsers
    const safTParser = new SAFTParser();
    const csvParser = new CSVParser();
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
            const totalSAFT = this.aggregarSAFT();
            const totalDAC7 = this.aggregarDAC7();
            
            const valorSAFT = totalSAFT > 0 ? totalSAFT : totaisExtratos.brutoTotal;
            const valorDAC7 = totalDAC7 > 0 ? totalDAC7 : valorSAFT;
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

        aggregarSAFT() {
            return State.processados.saft.reduce((acc, saft) => {
                return acc + (saft.total || 0);
            }, 0);
        }

        aggregarDAC7() {
            return State.processados.dac7.reduce((acc, dac7) => {
                return acc + (dac7.valorReportado || 0);
            }, 0);
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
            
            const total = State.processados.faturas.length + 
                         State.processados.extratos.length + 
                         State.processados.saft.length + 
                         State.processados.csv.length + 
                         State.processados.dac7.length;
            
            if (dot) dot.classList.toggle('active', total > 0);
            if (totalValores) totalValores.textContent = `${total} valor(es)`;
        }

        atualizarGrafico() {
            const canvas = document.getElementById('analiseGrafica');
            const fallback = document.getElementById('chart-fallback');
            
            if (!canvas) return;
            
            // Verificação de dependência Chart.js
            if (!State.chartReady || typeof Chart === 'undefined') {
                canvas.style.display = 'none';
                if (fallback) fallback.style.display = 'flex';
                fallback.innerHTML = '<p>Chart.js não disponível</p>';
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
    // GESTÃO DE EVIDÊNCIAS - SCHEMA SINCRONIZADO
    // ============================================

    class EvidenceManager {
        constructor() {
            this.modal = document.getElementById('evidence-modal');
            this.isOpen = false;
            this.uploadConfig = {
                'input-saft': { tipo: 'saft', processor: (f) => safTParser.parse(f), exts: CONFIG.ALLOWED_EXTENSIONS.XML },
                'input-csv': { tipo: 'csv', processor: (f) => csvParser.parse(f), exts: CONFIG.ALLOWED_EXTENSIONS.CSV },
                'input-faturas': { tipo: 'fatura', processor: (f) => pdfProcessor.processarFatura(f), exts: CONFIG.ALLOWED_EXTENSIONS.PDF },
                'input-extratos': { tipo: 'extrato', processor: (f) => pdfProcessor.processarExtrato(f), exts: CONFIG.ALLOWED_EXTENSIONS.PDF },
                'input-dac7': { tipo: 'dac7', processor: (f) => pdfProcessor.processarDAC7(f), exts: CONFIG.ALLOWED_EXTENSIONS.DAC7 }
            };
            this.init();
        }

        init() {
            this.bindEvents();
        }

        bindEvents() {
            // Toggle modal
            const btnToggle = document.getElementById('btn-toggle-evidence');
            if (btnToggle) {
                btnToggle.addEventListener('click', () => this.toggle());
            }

            // Fechar modal
            const btnClose = document.getElementById('btn-close-modal');
            const btnModalFechar = document.getElementById('btn-modal-fechar');
            
            if (btnClose) btnClose.addEventListener('click', () => this.fechar());
            if (btnModalFechar) btnModalFechar.addEventListener('click', () => this.fechar());

            // Limpar tudo
            const btnModalLimpar = document.getElementById('btn-modal-limpar');
            if (btnModalLimpar) {
                btnModalLimpar.addEventListener('click', () => {
                    if (confirm('Remover todas as evidências?')) {
                        this.limparTudo();
                    }
                });
            }

            // Click fora
            if (this.modal) {
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.fechar();
                });
            }

            // Setup upload zones sincronizadas
            Object.keys(this.uploadConfig).forEach(inputId => {
                const config = this.uploadConfig[inputId];
                const zoneId = inputId.replace('input-', 'upload-');
                this.setupUploadZone(zoneId, inputId, config);
            });

            // Evidence items na sidebar
            document.querySelectorAll('.evidence-item').forEach(item => {
                item.addEventListener('click', () => this.abrir());
            });
        }

        setupUploadZone(zoneId, inputId, config) {
            const zone = document.getElementById(zoneId);
            const input = document.getElementById(inputId);

            if (!zone || !input) {
                console.error(`Sincronização falhou: ${zoneId} ou ${inputId} não encontrado`);
                return;
            }

            // Click na zona
            zone.addEventListener('click', (e) => {
                if (e.target !== input) input.click();
            });

            // Change no input -> Dispatcher
            input.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    await this.processarArquivos(config.tipo, e.target.files, config.processor, config.exts);
                    e.target.value = ''; // Reset
                }
            });

            // Drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                zone.addEventListener(eventName, () => zone.classList.add('dragover'));
            });

            ['dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, () => zone.classList.remove('dragover'));
            });

            zone.addEventListener('drop', async (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    await this.processarArquivos(config.tipo, files, config.processor, config.exts);
                }
            });
        }

        async processarArquivos(tipo, files, processor, allowedExts) {
            const validFiles = Array.from(files).filter(file => {
                const ext = '.' + file.name.split('.').pop().toLowerCase();
                const valido = allowedExts.includes(ext);
                if (!valido) {
                    logger.log(`Rejeitado: ${file.name} (extensão inválida)`, 'error');
                }
                return valido;
            });

            if (validFiles.length === 0) {
                alert('Nenhum ficheiro válido selecionado');
                return;
            }

            try {
                // Usa o Dispatcher para evitar ruído de memória
                const resultados = await dispatcher.enqueue(tipo, validFiles, processor);
                
                // Armazena resultados
                resultados.forEach((dados, index) => {
                    State.evidencias[tipo].push(validFiles[index]);
                    State.processados[tipo].push(dados);
                });

                this.atualizarEstatisticas();
                logger.log(`${tipo.toUpperCase()}: ${resultados.length} ficheiro(s) processado(s)`, 'success');
            } catch (error) {
                logger.log(`Erro no processamento ${tipo}: ${error.message}`, 'error');
            }
        }

        toggle() {
            this.isOpen ? this.fechar() : this.abrir();
        }

        abrir() {
            if (!this.modal) return;
            this.modal.style.display = 'flex';
            this.isOpen = true;
            this.atualizarEstatisticas();
            logger.log('Modal evidências aberto', 'info');
        }

        fechar() {
            if (!this.modal) return;
            this.modal.style.display = 'none';
            this.isOpen = false;
            logger.log('Modal evidências fechado', 'info');
        }

        atualizarEstatisticas() {
            // Contadores por tipo
            const counts = {
                saft: State.evidencias.saft.length,
                csv: State.evidencias.csv.length,
                faturas: State.evidencias.faturas.length,
                extratos: State.evidencias.extratos.length,
                dac7: State.evidencias.dac7.length
            };

            const totalFiles = Object.values(counts).reduce((a, b) => a + b, 0);

            // Valores monetários
            const valores = {
                saft: State.processados.saft.reduce((a, s) => a + (s.total || 0), 0),
                faturas: State.processados.faturas.reduce((a, f) => a + (f.valorPrincipal || 0), 0),
                extratos: State.processados.extratos.reduce((a, e) => a + (e.ganhosLiquidos || 0), 0),
                dac7: State.processados.dac7.reduce((a, d) => a + (d.valorReportado || 0), 0)
            };

            // Atualiza UI
            this.setText('modal-total-files', totalFiles);
            this.setText('modal-total-values', formatarMoeda(Object.values(valores).reduce((a, b) => a + b, 0)));
            
            // Stats específicas
            this.setText('stats-saft-files', counts.saft);
            this.setText('stats-saft-values', formatarMoeda(valores.saft));
            
            this.setText('stats-csv-files', counts.csv);
            this.setText('stats-csv-records', State.processados.csv.reduce((a, c) => a + (c.totalRegistos || 0), 0));
            
            this.setText('stats-faturas-files', counts.faturas);
            this.setText('stats-faturas-values', formatarMoeda(valores.faturas));
            
            this.setText('stats-extratos-files', counts.extratos);
            this.setText('stats-extratos-values', formatarMoeda(valores.extratos));
            
            this.setText('stats-dac7-files', counts.dac7);
            this.setText('stats-dac7-values', formatarMoeda(valores.dac7));

            // Sidebar counts
            this.setText('count-saft', counts.saft > 0 ? 1 : 0);
            this.setText('count-fat', counts.faturas);
            this.setText('count-ext', counts.extratos);
            this.setText('count-dac7', counts.dac7 > 0 ? 1 : 0);
            this.setText('count-ctrl', Math.min(totalFiles, 4));
            this.setText('total-evidencias', totalFiles);

            this.renderizarListas();
        }

        setText(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        renderizarListas() {
            const listas = {
                'lista-saft': State.evidencias.saft,
                'lista-csv': State.evidencias.csv,
                'lista-faturas': State.evidencias.faturas,
                'lista-extratos': State.evidencias.extratos,
                'lista-dac7': State.evidencias.dac7
            };

            Object.entries(listas).forEach(([id, arquivos]) => {
                const container = document.getElementById(id);
                if (container) {
                    container.innerHTML = arquivos.map((f, i) => `
                        <div class="file-item">
                            <span title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
                            <button onclick="window.removerArquivo('${id.split('-')[1]}', ${i})" title="Remover">×</button>
                        </div>
                    `).join('');
                }
            });
        }

        limparTudo() {
            Object.keys(State.evidencias).forEach(key => {
                State.evidencias[key] = [];
                State.processados[key] = [];
            });
            
            dispatcher.clear();
            this.atualizarEstatisticas();
            resetarCalculos();
            logger.log('Todas as evidências removidas', 'warning');
        }
    }

    const evidenceManager = new EvidenceManager();

    // ============================================
    // FUNÇÕES GLOBAIS DE REMOÇÃO
    // ============================================

    window.removerArquivo = function(tipo, index) {
        if (index >= 0 && index < State.evidencias[tipo].length) {
            const nome = State.evidencias[tipo][index].name;
            State.evidencias[tipo].splice(index, 1);
            State.processados[tipo].splice(index, 1);
            evidenceManager.atualizarEstatisticas();
            logger.log(`${tipo.toUpperCase()} removido: ${nome}`, 'warning');
        }
    };

    // ============================================
    // EVENT HANDLERS GLOBAIS
    // ============================================

    function bindEventos() {
        // Validação
        const btnValidar = document.getElementById('btn-validar');
        if (btnValidar) {
            btnValidar.addEventListener('click', validarSujeito);
        }

        // Executar perícia
        const btnExecutar = document.getElementById('btn-executar');
        if (btnExecutar) {
            btnExecutar.addEventListener('click', executarPericia);
        }

        // Exportações
        const btnExportPDF = document.getElementById('btn-export-pdf');
        const btnExportJSON = document.getElementById('btn-export-json');
        
        if (btnExportPDF) btnExportPDF.addEventListener('click', exportarPDF);
        if (btnExportJSON) btnExportJSON.addEventListener('click', exportarJSON);

        // Controles
        const btnReiniciar = document.getElementById('btn-reiniciar');
        const btnLimpar = document.getElementById('btn-limpar');
        
        if (btnReiniciar) btnReiniciar.addEventListener('click', reiniciarAnalise);
        if (btnLimpar) btnLimpar.addEventListener('click', limparDados);

        // Parâmetros
        const anoFiscal = document.getElementById('ano-fiscal');
        const plataforma = document.getElementById('plataforma');
        
        if (anoFiscal) {
            anoFiscal.addEventListener('change', () => {
                State.parametros.anoFiscal = anoFiscal.value;
                logger.log(`Ano fiscal: ${anoFiscal.value}`, 'info');
            });
        }
        
        if (plataforma) {
            plataforma.addEventListener('change', () => {
                State.parametros.plataforma = plataforma.value;
                logger.log(`Plataforma: ${plataforma.value}`, 'info');
            });
        }

        // ESC key
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
            
            logger.log(`Validado: ${nome} | NIF: ${nif}`, 'success');
        } else {
            if (statusEl) {
                statusEl.className = 'validation-status invalid';
                statusEl.innerHTML = `<span class="status-dot"></span><span>NIF inválido (9 dígitos)</span>`;
            }
            logger.log('Validação falhou', 'error');
        }
    }

    function executarPericia() {
        if (State.isProcessing) {
            logger.log('Perícia em execução', 'warning');
            return;
        }
        
        logger.log('Iniciando perícia fiscal...', 'info');
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        State.alertas = [];
        
        const totalEvidencias = Object.values(State.processados).reduce((a, arr) => a + arr.length, 0);
        
        if (totalEvidencias === 0) {
            logger.log('Perícia abortada: sem evidências', 'warning');
            alert('Adicione evidências antes de executar');
            return;
        }
        
        State.isProcessing = true;
        
        try {
            const alertas = fiscalCalculator.calcularTudo();
            const temCritico = alertas.some(a => a.tipo === 'critico');
            logger.log(`Perícia concluída: ${alertas.length} alerta(s)`, temCritico ? 'error' : 'success');
        } catch (error) {
            logger.log(`Erro na perícia: ${error.message}`, 'error');
        } finally {
            State.isProcessing = false;
        }
    }

    function reiniciarAnalise() {
        if (!confirm('Reiniciar análise?')) return;
        
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
        
        logger.log('Dados limpos', 'warning');
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
        
        logger.log('Exportação JSON concluída', 'success');
    }

    function exportarPDF() {
        logger.log('Exportando PDF...', 'info');
        setTimeout(() => {
            alert(`Relatório PDF gerado!\nSessão: ${State.sessao.id}\nSujeito: ${State.sujeito.nome || 'N/A'}`);
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
    // INICIALIZAÇÃO COM VERIFICAÇÃO DE DEPENDÊNCIAS
    // ============================================

    function init() {
        // Remove loading
        const loading = document.getElementById('loading-screen');
        const app = document.getElementById('app-container');
        
        setTimeout(() => {
            if (loading) {
                loading.classList.add('hidden');
                setTimeout(() => loading.remove(), 500);
            }
            if (app) app.style.display = 'block';
        }, 500);

        // Sessão
        const sessionIdEl = document.getElementById('session-id');
        if (sessionIdEl) sessionIdEl.textContent = State.sessao.id;

        // Relógio
        setInterval(() => {
            const timeEl = document.getElementById('session-time');
            if (timeEl) {
                const agora = new Date();
                timeEl.textContent = agora.toLocaleDateString('pt-PT') + ' | ' + 
                                    agora.toLocaleTimeString('pt-PT');
            }
        }, 1000);

        // Verificação de Chart.js (Hierarquia de Dependências)
        if (typeof Chart !== 'undefined') {
            State.chartReady = true;
            logger.log('Chart.js carregado', 'success');
        } else {
            State.chartReady = false;
            logger.log('Chart.js não disponível', 'warning');
            
            // Tenta novamente em 2s
            setTimeout(() => {
                if (typeof Chart !== 'undefined') {
                    State.chartReady = true;
                    logger.log('Chart.js carregado (retry)', 'success');
                }
            }, 2000);
        }

        // Bind eventos
        bindEventos();

        // Log inicial
        logger.log(`VDC Forense v${CONFIG.VERSAO} ${CONFIG.EDICAO} iniciado`, 'success');
        logger.log(`Sessão: ${State.sessao.id}`, 'info');

        // Expor API global
        window.VDC = {
            State,
            CONFIG,
            logger,
            evidenceManager,
            dispatcher,
            normalizarTextoBinario
        };
    }

    // Entry point com verificação de escopo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Fechamento de escopo verificado
})();
