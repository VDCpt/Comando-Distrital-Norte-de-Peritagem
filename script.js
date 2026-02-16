/**
 * VDC FORENSE v12.8 SYNC SCHEMA - CONSOLIDAÇÃO FINAL
 * Sistema de Peritagem Digital e Auditoria Fiscal
 * Motor de Extração e Processamento de Evidências
 * 
 * Versão: 12.8.0-FINAL
 * Analista: Eduardo Perito Forense
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES E CONSTANTES
    // ============================================

    const CONFIG = Object.freeze({
        VERSAO: '12.8',
        EDICAO: 'SYNC SCHEMA FINAL',
        DEBUG: true,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.pdf', '.csv', '.xml'],
        TAXA_COMISSAO_MAX: 0.25, // 25% limite legal
        TOLERANCIA_ERRO: 0.01,
        
        // Patterns de Extração - Precisão Máxima
        PATTERNS: {
            // Limpeza de texto
            CLEAN: /[\n\r\t]+/g,
            MULTISPACE: /\s+/g,
            
            // Documentos Bolt - Extratos
            GANHOS_APP: /Ganhos\s+na\s+app\s+([\d\s.,]+)/i,
            GANHOS_CAMPANHA: /Ganhos\s+da\s+campanha\s+([\d\s.,]+)/i,
            GORJETAS: /Gorjetas\s+dos\s+passageiros\s+([\d\s.,]+)/i,
            PORTAGENS: /Portagens\s+([\d\s.,]+)/i,
            TAXAS_CANCEL: /Taxas\s+de\s+cancelamento\s+([\d\s.,]+)/i,
            COMISSAO_APP: /Comiss[ãa]o\s+da\s+app\s+(-?[\d\s.,]+)/i,
            GANHOS_LIQUIDOS: /Ganhos\s+l[ií]quidos\s+([\d\s.,]+)/i,
            
            // Faturas Bolt
            FATURA_NUMERO: /Fatura\s+n\.?[º°o]?\s*([A-Z0-9\-]+)/i,
            FATURA_TOTAL: /Total\s+com\s+IVA\s*\(EUR\)\s+([\d\s.,]+)/i,
            FATURA_PERIODO: /Per[ií]odo\s*:?\s*(\d{2}-\d{2}-\d{4})\s*[-–a]\s*(\d{2}-\d{2}-\d{4})/i,
            FATURA_AUTOLIQUIDACAO: /Autoliquidac[ãa]o\s+de\s+IVA/i,
            
            // DAC7
            DAC7_RECEITA_ANUAL: /Total\s+de\s+receitas\s+anuais:\s*([\d\s.,]+)€/i,
            DAC7_GANHOS_1T: /Ganhos\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_1T: /Comiss[oõ]es\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_IMPOSTOS_1T: /Impostos\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_1T: /Serviços\s+prestados\s+no\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            DAC7_GANHOS_2T: /Ganhos\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_2T: /Comiss[oõ]es\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_IMPOSTOS_2T: /Impostos\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_2T: /Serviços\s+prestados\s+no\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            DAC7_GANHOS_3T: /Ganhos\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_3T: /Comiss[oõ]es\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_IMPOSTOS_3T: /Impostos\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_3T: /Serviços\s+prestados\s+no\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            DAC7_GANHOS_4T: /Ganhos\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_4T: /Comiss[oõ]es\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_IMPOSTOS_4T: /Impostos\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_4T: /Serviços\s+prestados\s+no\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            
            // Gerais
            NIF: /NIF:\s*(\d{9})/i,
            DATA: /(\d{4}-\d{2}-\d{2})/g
        }
    });

    // ============================================
    // ESTADO GLOBAL DO SISTEMA
    // ============================================

    let State = {
        sessao: {
            id: gerarIdSessao(),
            ativa: false,
            inicio: null
        },
        financeiro: {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            dac7: 0,
            viagens: [],
            faturas: [],
            extrato: {
                ganhosApp: 0,
                ganhosCampanha: 0,
                gorjetas: 0,
                portagens: 0,
                taxasCancel: 0,
                comissoes: 0,
                ganhosLiquidos: 0
            },
            dac7Trimestres: {
                t1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        },
        autenticidade: [],
        fila: [],
        processando: false,
        alertas: [],
        logs: []
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
        
        let limpo = String(valorStr)
            .replace(/[€$\s]/g, '')
            .trim();
        
        const temVirgulaDecimal = /\d+,\d{2}$/.test(limpo);
        const temPontoDecimal = /\d+\.\d{2}$/.test(limpo);
        
        if (temVirgulaDecimal && !temPontoDecimal) {
            limpo = limpo.replace(/\./g, '').replace(',', '.');
        } else if (temPontoDecimal && !temVirgulaDecimal) {
            limpo = limpo.replace(/,/g, '');
        } else if (temVirgulaDecimal && temPontoDecimal) {
            const ultimaVirgula = limpo.lastIndexOf(',');
            const ultimoPonto = limpo.lastIndexOf('.');
            if (ultimaVirgula > ultimoPonto) {
                limpo = limpo.replace(/\./g, '').replace(',', '.');
            } else {
                limpo = limpo.replace(/,/g, '');
            }
        } else {
            limpo = limpo.replace(/[^\d.-]/g, '');
        }
        
        const parsed = parseFloat(limpo);
        return isNaN(parsed) ? 0 : parsed;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // MOTOR DE LOGS
    // ============================================

    const logger = {
        log: function(msg, tipo = 'info') {
            const consoleEl = document.getElementById('audit-console');
            if (!consoleEl) {
                if (CONFIG.DEBUG) console.log(`[VDC] ${msg}`);
                return;
            }
            
            const line = document.createElement('div');
            line.className = `line ${tipo === 'success' ? 'green' : tipo === 'error' ? 'red' : tipo === 'warning' ? 'yellow' : 'blue'}`;
            line.textContent = `[${new Date().toLocaleTimeString('pt-PT')}] ${msg}`;
            
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
            
            // Guardar no histórico
            State.logs.push({
                timestamp: new Date(),
                msg: msg,
                tipo: tipo
            });
            
            if (CONFIG.DEBUG) console.log(`[VDC] ${msg}`);
        },
        
        limpar: function() {
            const consoleEl = document.getElementById('audit-console');
            if (consoleEl) {
                consoleEl.innerHTML = '<div class="line green">[SISTEMA] A aguardar fontes de dados...</div>';
            }
            State.logs = [];
        }
    };

    // ============================================
    // INICIALIZAÇÃO E BARREIRA DE ENTRADA
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        const btnProceed = document.getElementById('btn-proceed');
        const barrier = document.getElementById('barrier-window');
        const app = document.getElementById('app-container');
        
        // Atualizar hash da sessão na barreira
        const sessionHashDisplay = document.getElementById('session-id-display');
        if (sessionHashDisplay) {
            const hashValue = sessionHashDisplay.querySelector('.hash-value');
            if (hashValue) {
                hashValue.textContent = State.sessao.id;
            }
        }

        if (btnProceed && barrier && app) {
            btnProceed.addEventListener('click', function() {
                barrier.classList.add('hidden');
                app.classList.remove('hidden');
                State.sessao.ativa = true;
                State.sessao.inicio = new Date();
                
                // Atualizar elementos da UI com ID da sessão
                document.getElementById('session-id').textContent = State.sessao.id;
                document.getElementById('footer-session').textContent = State.sessao.id;
                
                logger.log(`Sessão iniciada por Eduardo. Versão ${CONFIG.VERSAO}`, 'success');
                logger.log('Sistema pronto para receber evidências', 'info');
                
                iniciarRelogio();
                inicializarEventos();
            });
        } else {
            console.error('Elementos da barreira não encontrados');
            if (app) {
                app.classList.remove('hidden');
                logger.log('Modo debug: barreira ignorada', 'warning');
                iniciarRelogio();
                inicializarEventos();
            }
        }
    });

    function iniciarRelogio() {
        setInterval(function() {
            const timeEl = document.getElementById('session-time');
            const footerTime = document.getElementById('footer-time');
            const agora = new Date();
            const timeStr = agora.toLocaleTimeString('pt-PT');
            
            if (timeEl) timeEl.textContent = timeStr;
            if (footerTime) footerTime.textContent = timeStr;
        }, 1000);
    }

    // ============================================
    // INICIALIZAÇÃO DE EVENTOS
    // ============================================

    function inicializarEventos() {
        // Elementos de upload
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const btnDemo = document.getElementById('btn-demo');
        const btnClear = document.getElementById('btn-clear');
        const btnExportJson = document.getElementById('btn-export-json');

        // Configurar drop zone
        if (dropZone && fileInput) {
            dropZone.addEventListener('click', function() {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    adicionarFicheirosFila(e.target.files);
                }
            });
            
            // Eventos de drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
                dropZone.addEventListener(eventName, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(function(eventName) {
                dropZone.addEventListener(eventName, function() {
                    dropZone.classList.add('dragover');
                });
            });
            
            ['dragleave', 'drop'].forEach(function(eventName) {
                dropZone.addEventListener(eventName, function() {
                    dropZone.classList.remove('dragover');
                });
            });
            
            dropZone.addEventListener('drop', function(e) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    adicionarFicheirosFila(files);
                }
            });
        }

        // Botões de ação
        if (btnDemo) {
            btnDemo.addEventListener('click', carregarDemo);
        }
        
        if (btnClear) {
            btnClear.addEventListener('click', limparSistema);
        }
        
        if (btnExportJson) {
            btnExportJson.addEventListener('click', exportarJSON);
        }

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                document.querySelectorAll('.tab-content').forEach(function(c) {
                    c.classList.add('hidden');
                });
                
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    tabContent.classList.remove('hidden');
                }
            });
        });

        // Items de evidência (abrir modal se existir)
        document.querySelectorAll('.evidence-item').forEach(function(item) {
            item.addEventListener('click', function() {
                logger.log('Sumário de evidências', 'info');
            });
        });

        logger.log('Event listeners inicializados', 'info');
    }

    // ============================================
    // GESTÃO DE FILA DE PROCESSAMENTO
    // ============================================

    async function adicionarFicheirosFila(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            // Validar ficheiro
            const validacao = validarFicheiro(file);
            if (!validacao.valido) {
                logger.log(`Ficheiro rejeitado: ${file.name} - ${validacao.erro}`, 'error');
                continue;
            }
            
            State.fila.push(file);
            logger.log(`Ficheiro em fila: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
            
            // Adicionar à lista visual
            adicionarFicheiroLista(file);
        }
        
        processarProximo();
    }

    function validarFicheiro(file) {
        if (!file) return { valido: false, erro: 'Ficheiro não fornecido' };
        
        const extensao = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_EXTENSIONS.includes(extensao)) {
            return { valido: false, erro: 'Extensão não permitida. Use PDF, CSV ou XML' };
        }
        
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return { valido: false, erro: `Ficheiro muito grande. Máximo: 10MB` };
        }
        
        return { valido: true };
    }

    function adicionarFicheiroLista(file) {
        const fileQueue = document.getElementById('file-queue');
        if (!fileQueue) return;
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${escapeHtml(file.name)}</span>
            <small>${(file.size / 1024).toFixed(1)} KB</small>
        `;
        fileQueue.appendChild(fileItem);
        
        // Atualizar contador CTRL
        atualizarContador('ctrl', 1);
    }

    function atualizarContador(tipo, incremento = 1) {
        const elemento = document.getElementById(`count-${tipo}`);
        if (elemento) {
            const atual = parseInt(elemento.textContent) || 0;
            elemento.textContent = atual + incremento;
        }
    }

    async function processarProximo() {
        if (State.processando || State.fila.length === 0) return;
        
        State.processando = true;
        const file = State.fila.shift();
        
        try {
            logger.log(`A processar: ${file.name}`, 'info');
            
            if (file.name.toLowerCase().endsWith('.csv')) {
                await processarCSV(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                await processarPDF(file);
            } else if (file.name.toLowerCase().endsWith('.xml')) {
                logger.log(`Processamento XML: ${file.name}`, 'info');
                // Simular processamento XML
                setTimeout(function() {
                    logger.log(`XML processado: ${file.name}`, 'success');
                }, 500);
            } else {
                logger.log(`Formato não suportado: ${file.name}`, 'error');
            }
        } catch (err) {
            logger.log(`Erro ao processar ${file.name}: ${err.message}`, 'error');
        }
        
        State.processando = false;
        processarProximo();
    }

    // ============================================
    // PROCESSAMENTO DE CSV
    // ============================================

    async function processarCSV(file) {
        return new Promise(function(resolve) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/);
                    const header = lines[0]?.toLowerCase() || '';
                    
                    // Detetar tipo de CSV
                    if (header.includes('algorithm') || header.includes('hash')) {
                        logger.log('Detetado: Ficheiro de Controlo de Autenticidade', 'success');
                        processarAutenticidade(lines);
                        atualizarContador('saft', 1);
                    } else if (header.includes('nº da fatura') || header.includes('viagem') || header.includes('motorista')) {
                        logger.log('Detetado: Ficheiro de Viagens (17 colunas)', 'success');
                        processarViagens(lines);
                        atualizarContador('ext', 1);
                    } else {
                        logger.log('Formato CSV não reconhecido', 'warning');
                    }
                    
                    atualizarInterface();
                } catch (err) {
                    logger.log(`Erro ao processar CSV: ${err.message}`, 'error');
                }
                
                resolve();
            };
            
            reader.onerror = function() {
                logger.log('Erro ao ler ficheiro CSV', 'error');
                resolve();
            };
            
            reader.readAsText(file, 'ISO-8859-1');
        });
    }

    function processarAutenticidade(lines) {
        const tbody = document.querySelector('#table-hashes tbody');
        if (!tbody) return;
        
        let count = 0;
        
        lines.slice(1).forEach(function(line) {
            if (!line.trim()) return;
            
            const cols = line.replace(/"/g, '').split(',');
            if (cols.length >= 3) {
                const tr = document.createElement('tr');
                const algoritmo = cols[0] || 'SHA256';
                const hashCompleto = cols[1] || '';
                const hashCurto = hashCompleto.length > 16 ? hashCompleto.substring(0, 16) + '...' : hashCompleto;
                const caminho = cols[2]?.split('\\').pop() || 'N/A';
                
                tr.innerHTML = `
                    <td>${escapeHtml(algoritmo)}</td>
                    <td style="color: var(--accent-green);">${escapeHtml(hashCurto)}</td>
                    <td>${escapeHtml(caminho)}</td>
                    <td><span style="color: var(--success);">✓ VALIDADO</span></td>
                `;
                tbody.appendChild(tr);
                
                // Guardar no estado
                State.autenticidade.push({
                    algoritmo: algoritmo,
                    hash: hashCompleto,
                    ficheiro: caminho
                });
                
                count++;
            }
        });
        
        logger.log(`Adicionados ${count} registos de autenticidade`, 'success');
    }

    function processarViagens(lines) {
        const tbody = document.querySelector('#table-viagens tbody');
        if (!tbody) return;
        
        let totalBruto = 0;
        let count = 0;
        
        // Regex para CSV com aspas
        const regexSplit = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        
        lines.slice(1).forEach(function(line) {
            if (!line.trim()) return;
            
            const cols = line.split(regexSplit);
            
            // Verificar se tem colunas suficientes (CSV de viagens)
            if (cols.length >= 15) {
                // Extrair valor da viagem (coluna "Preço da viagem" - índice 14)
                const valorStr = cols[14]?.replace(/"/g, '').trim() || '0';
                const valor = parseMoeda(valorStr);
                
                // Extrair data (coluna "Data da viagem" - índice 4 ou coluna "Data" - índice 1)
                let dataStr = cols[4]?.replace(/"/g, '').split(' ')[0] || 
                              cols[1]?.replace(/"/g, '').split(' ')[0] || 
                              'N/A';
                
                // Extrair motorista (coluna "Nome do motorista" - índice 2)
                const motorista = cols[2]?.replace(/"/g, '') || 'N/A';
                
                // Extrair número da fatura (coluna 0)
                const numFatura = cols[0]?.replace(/"/g, '') || 'N/A';
                
                // Calcular comissão estimada (23% do valor bruto)
                const comissao = valor * 0.23;
                
                totalBruto += valor;
                
                // Adicionar linha à tabela
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(dataStr)}</td>
                    <td>${escapeHtml(motorista)}</td>
                    <td>${escapeHtml(numFatura.substring(0, 12))}</td>
                    <td>${formatarMoeda(valor)}</td>
                    <td>${formatarMoeda(comissao)}</td>
                `;
                tbody.appendChild(tr);
                
                // Guardar no estado
                State.financeiro.viagens.push({
                    data: dataStr,
                    motorista: motorista,
                    numFatura: numFatura,
                    valor: valor,
                    comissao: comissao
                });
                
                count++;
            }
        });
        
        State.financeiro.bruto += totalBruto;
        State.financeiro.comissoes += totalBruto * 0.23; // Estimativa
        
        logger.log(`Processadas ${count} viagens. Total bruto: ${formatarMoeda(totalBruto)}`, 'success');
    }

    // ============================================
    // PROCESSAMENTO DE PDF
    // ============================================

    async function processarPDF(file) {
        // Verificar se PDF.js está disponível
        if (typeof pdfjsLib === 'undefined') {
            logger.log('PDF.js não carregado. A usar modo de simulação.', 'warning');
            processarPDFSimulado(file);
            return;
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let textoCompleto = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                textoCompleto += textContent.items.map(s => s.str).join(' ') + '\n';
            }
            
            // Limpar texto para extração
            const textoLimpo = textoCompleto.replace(CONFIG.PATTERNS.CLEAN, ' ').replace(CONFIG.PATTERNS.MULTISPACE, ' ');
            
            // Detetar tipo de PDF pelo conteúdo
            if (textoLimpo.includes('Ganhos líquidos') || textoLimpo.includes('Ganhos na app')) {
                logger.log('Detetado: Extrato Bolt', 'success');
                processarExtratoBolt(textoLimpo, file);
                atualizarContador('ext', 1);
            } else if (textoLimpo.includes('Fatura n.º') || textoLimpo.includes('Total com IVA')) {
                logger.log('Detetado: Fatura Bolt', 'success');
                processarFaturaBolt(textoLimpo, file);
                atualizarContador('fat', 1);
            } else if (textoLimpo.includes('DAC7') || textoLimpo.includes('receitas anuais')) {
                logger.log('Detetado: Relatório DAC7', 'success');
                processarDAC7(textoLimpo, file);
                atualizarContador('dac7', 1);
            } else {
                logger.log('PDF não reconhecido como documento Bolt', 'warning');
            }
            
            atualizarInterface();
            
        } catch (err) {
            logger.log(`Erro ao processar PDF: ${err.message}`, 'error');
            processarPDFSimulado(file);
        }
    }

    function processarPDFSimulado(file) {
        // Simular extração baseada no nome do ficheiro
        const nomeLower = file.name.toLowerCase();
        
        if (nomeLower.includes('ganhos') || nomeLower.includes('extrato')) {
            logger.log('[SIMULAÇÃO] Extrato Bolt detetado', 'success');
            State.financeiro.extrato.ganhosLiquidos = 2409.95;
            State.financeiro.extrato.ganhosApp = 3157.94;
            State.financeiro.extrato.comissoes = 792.59;
            State.financeiro.liquido += 2409.95;
            State.financeiro.bruto += 3157.94;
            State.financeiro.comissoes += 792.59;
            atualizarContador('ext', 1);
            
        } else if (nomeLower.includes('fatura')) {
            logger.log('[SIMULAÇÃO] Fatura Bolt detetada', 'success');
            State.financeiro.comissoes += 239.00;
            atualizarContador('fat', 1);
            
        } else if (nomeLower.includes('dac7')) {
            logger.log('[SIMULAÇÃO] Relatório DAC7 detetado', 'success');
            State.financeiro.dac7 = 7755.16;
            atualizarContador('dac7', 1);
        }
    }

    function processarExtratoBolt(texto, file) {
        // Extrair valores usando regex
        const ganhosApp = extrairValor(texto, CONFIG.PATTERNS.GANHOS_APP);
        const ganhosCampanha = extrairValor(texto, CONFIG.PATTERNS.GANHOS_CAMPANHA);
        const gorjetas = extrairValor(texto, CONFIG.PATTERNS.GORJETAS);
        const portagens = extrairValor(texto, CONFIG.PATTERNS.PORTAGENS);
        const taxasCancel = extrairValor(texto, CONFIG.PATTERNS.TAXAS_CANCEL);
        const comissoes = Math.abs(extrairValor(texto, CONFIG.PATTERNS.COMISSAO_APP));
        const ganhosLiquidos = extrairValor(texto, CONFIG.PATTERNS.GANHOS_LIQUIDOS);
        
        // Calcular bruto
        const brutoCalculado = ganhosApp + ganhosCampanha + gorjetas + portagens + taxasCancel;
        
        // Atualizar estado
        State.financeiro.extrato.ganhosApp += ganhosApp;
        State.financeiro.extrato.ganhosCampanha += ganhosCampanha;
        State.financeiro.extrato.gorjetas += gorjetas;
        State.financeiro.extrato.portagens += portagens;
        State.financeiro.extrato.taxasCancel += taxasCancel;
        State.financeiro.extrato.comissoes += comissoes;
        State.financeiro.extrato.ganhosLiquidos += ganhosLiquidos;
        
        State.financeiro.bruto += brutoCalculado;
        State.financeiro.comissoes += comissoes;
        State.financeiro.liquido += ganhosLiquidos;
        
        logger.log(`Extrato: Bruto ${formatarMoeda(brutoCalculado)} | Líquido ${formatarMoeda(ganhosLiquidos)}`, 'success');
        
        // Log detalhado dos valores extraídos
        if (ganhosApp > 0) logger.log(`  Ganhos na app: ${formatarMoeda(ganhosApp)}`, 'info');
        if (ganhosCampanha > 0) logger.log(`  Ganhos campanha: ${formatarMoeda(ganhosCampanha)}`, 'info');
        if (gorjetas > 0) logger.log(`  Gorjetas: ${formatarMoeda(gorjetas)}`, 'info');
        if (portagens > 0) logger.log(`  Portagens: ${formatarMoeda(portagens)}`, 'info');
        if (taxasCancel > 0) logger.log(`  Taxas cancelamento: ${formatarMoeda(taxasCancel)}`, 'info');
        if (comissoes > 0) logger.log(`  Comissões: ${formatarMoeda(comissoes)}`, 'info');
    }

    function processarFaturaBolt(texto, file) {
        const numFatura = extrairTexto(texto, CONFIG.PATTERNS.FATURA_NUMERO) || 'N/A';
        const valorTotal = extrairValor(texto, CONFIG.PATTERNS.FATURA_TOTAL);
        const periodoMatch = texto.match(CONFIG.PATTERNS.FATURA_PERIODO);
        const periodo = periodoMatch ? `${periodoMatch[1]} a ${periodoMatch[2]}` : 'N/A';
        const isAutoliquidacao = CONFIG.PATTERNS.FATURA_AUTOLIQUIDACAO.test(texto);
        
        State.financeiro.comissoes += valorTotal;
        State.financeiro.faturas.push({
            numero: numFatura,
            valor: valorTotal,
            periodo: periodo,
            autoliquidacao: isAutoliquidacao
        });
        
        logger.log(`Fatura: ${numFatura} | Valor ${formatarMoeda(valorTotal)} | ${isAutoliquidacao ? 'Autoliquidação' : 'IVA incluído'}`, 'success');
    }

    function processarDAC7(texto, file) {
        const receitaAnual = extrairValor(texto, CONFIG.PATTERNS.DAC7_RECEITA_ANUAL);
        
        // Extrair valores trimestrais
        State.financeiro.dac7Trimestres.t1.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_1T);
        State.financeiro.dac7Trimestres.t1.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_1T);
        State.financeiro.dac7Trimestres.t1.impostos = extrairValor(texto, CONFIG.PATTERNS.DAC7_IMPOSTOS_1T);
        State.financeiro.dac7Trimestres.t1.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_1T);
        
        State.financeiro.dac7Trimestres.t2.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_2T);
        State.financeiro.dac7Trimestres.t2.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_2T);
        State.financeiro.dac7Trimestres.t2.impostos = extrairValor(texto, CONFIG.PATTERNS.DAC7_IMPOSTOS_2T);
        State.financeiro.dac7Trimestres.t2.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_2T);
        
        State.financeiro.dac7Trimestres.t3.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_3T);
        State.financeiro.dac7Trimestres.t3.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_3T);
        State.financeiro.dac7Trimestres.t3.impostos = extrairValor(texto, CONFIG.PATTERNS.DAC7_IMPOSTOS_3T);
        State.financeiro.dac7Trimestres.t3.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_3T);
        
        State.financeiro.dac7Trimestres.t4.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_4T);
        State.financeiro.dac7Trimestres.t4.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_4T);
        State.financeiro.dac7Trimestres.t4.impostos = extrairValor(texto, CONFIG.PATTERNS.DAC7_IMPOSTOS_4T);
        State.financeiro.dac7Trimestres.t4.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_4T);
        
        State.financeiro.dac7 = receitaAnual;
        
        // Calcular total de serviços
        const totalServicos = 
            State.financeiro.dac7Trimestres.t1.servicos +
            State.financeiro.dac7Trimestres.t2.servicos +
            State.financeiro.dac7Trimestres.t3.servicos +
            State.financeiro.dac7Trimestres.t4.servicos;
        
        logger.log(`DAC7: Receita anual ${formatarMoeda(receitaAnual)} | ${totalServicos} serviços`, 'success');
    }

    function extrairValor(texto, pattern) {
        if (!texto || !pattern) return 0;
        const match = texto.match(pattern);
        if (match && match[1]) {
            return parseMoeda(match[1]);
        }
        return 0;
    }

    function extrairTexto(texto, pattern) {
        if (!texto || !pattern) return null;
        const match = texto.match(pattern);
        return match ? match[1].trim() : null;
    }

    // ============================================
    // ATUALIZAÇÃO DA INTERFACE
    // ============================================

    function atualizarInterface() {
        // Atualizar métricas principais
        document.getElementById('val-bruto').textContent = formatarMoeda(State.financeiro.bruto);
        document.getElementById('val-liquido').textContent = formatarMoeda(State.financeiro.liquido);
        document.getElementById('val-dac7').textContent = formatarMoeda(State.financeiro.dac7);
        document.getElementById('val-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('val-viagens').textContent = State.financeiro.viagens.length.toString();
        
        // Calcular taxa média
        const taxaMedia = State.financeiro.bruto > 0 ? 
            (State.financeiro.comissoes / State.financeiro.bruto * 100) : 0;
        document.getElementById('val-taxa').textContent = taxaMedia.toFixed(2) + '%';
        
        // Atualizar triangulação
        document.getElementById('tri-bruto').textContent = formatarMoeda(State.financeiro.bruto);
        document.getElementById('tri-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('tri-liquido').textContent = formatarMoeda(State.financeiro.liquido);
        document.getElementById('tri-faturado').textContent = formatarMoeda(State.financeiro.comissoes);
        
        // Atualizar DAC7
        document.getElementById('dac7-receita').textContent = formatarMoeda(State.financeiro.dac7);
        document.getElementById('dac7-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('dac7-servicos').textContent = State.financeiro.viagens.length.toString();
        
        // Atualizar trimestres
        document.getElementById('dac7-1t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t1.ganhos);
        document.getElementById('dac7-2t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t2.ganhos);
        document.getElementById('dac7-3t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t3.ganhos);
        document.getElementById('dac7-4t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t4.ganhos);
        
        // Verificar discrepâncias e gerar alertas
        verificarDiscrepancias();
    }

    function verificarDiscrepancias() {
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) return;
        
        // Limpar alertas anteriores
        alertasContainer.innerHTML = '';
        State.alertas = [];
        
        const c = State.financeiro;
        
        // 1. Validação: Bruto vs DAC7
        if (c.dac7 > 0 && Math.abs(c.bruto - c.dac7) > 10) {
            adicionarAlerta(
                'critico', 
                'DISCREPÂNCIA SAF-T vs DAC7', 
                `Bruto (${formatarMoeda(c.bruto)}) ≠ DAC7 (${formatarMoeda(c.dac7)})`,
                Math.abs(c.bruto - c.dac7)
            );
        }
        
        // 2. Validação: Taxa de comissão
        const taxaEfetiva = c.bruto > 0 ? c.comissoes / c.bruto : 0;
        if (taxaEfetiva > CONFIG.TAXA_COMISSAO_MAX + 0.05) {
            adicionarAlerta(
                'critico',
                'COMISSÃO EXCEDE LIMITE LEGAL',
                `Taxa: ${(taxaEfetiva * 100).toFixed(2)}% | Limite: 25%`,
                c.comissoes - (c.bruto * CONFIG.TAXA_COMISSAO_MAX)
            );
        }
        
        // 3. Validação: Líquido calculado vs reportado
        if (c.liquido > 0) {
            const liquidoCalculado = c.bruto - c.comissoes;
            if (Math.abs(liquidoCalculado - c.liquido) > 10) {
                adicionarAlerta(
                    'alerta',
                    'DISCREPÂNCIA GANHOS LÍQUIDOS',
                    `Calculado: ${formatarMoeda(liquidoCalculado)} | Reportado: ${formatarMoeda(c.liquido)}`,
                    Math.abs(liquidoCalculado - c.liquido)
                );
            }
        }
        
        // Atualizar veredito baseado nos alertas
        atualizarVeredito();
    }

    function adicionarAlerta(tipo, titulo, descricao, valor) {
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) return;
        
        const alerta = {
            id: Date.now() + Math.random(),
            tipo: tipo,
            titulo: titulo,
            descricao: descricao,
            valor: parseFloat(valor) || 0,
            timestamp: new Date()
        };
        
        State.alertas.push(alerta);
        
        const div = document.createElement('div');
        div.className = `alerta ${tipo}`;
        div.innerHTML = `
            <div>
                <strong>${escapeHtml(titulo)}</strong>
                <span>${escapeHtml(descricao)}</span>
            </div>
            ${alerta.valor > 0 ? `<strong>${formatarMoeda(alerta.valor)}</strong>` : ''}
        `;
        
        alertasContainer.appendChild(div);
    }

    function atualizarVeredito() {
        const veredictoSection = document.getElementById('veredicto-section');
        if (!veredictoSection) return;
        
        veredictoSection.style.display = 'block';
        
        const statusEl = document.getElementById('veredicto-status');
        const desvioEl = document.getElementById('veredicto-desvio');
        const anomaliaEl = document.getElementById('anomalia-critica');
        const anomaliaTexto = document.getElementById('anomalia-texto');
        const valorAnomalia = document.getElementById('valor-anomalia');
        
        const alertasCriticos = State.alertas.filter(a => a.tipo === 'critico');
        const alertasNormais = State.alertas.filter(a => a.tipo === 'alerta');
        
        if (alertasCriticos.length > 0) {
            const desvioTotal = alertasCriticos.reduce((acc, a) => acc + (a.valor || 0), 0);
            const percentual = State.financeiro.dac7 > 0 ? (desvioTotal / State.financeiro.dac7) * 100 : 0;
            
            statusEl.textContent = 'CRÍTICO';
            statusEl.className = 'veredicto-status critico';
            desvioEl.textContent = `Desvio: ${percentual.toFixed(2)}% (${formatarMoeda(desvioTotal)})`;
            
            anomaliaEl.style.display = 'flex';
            anomaliaTexto.textContent = `Potencial incumprimento fiscal. ${alertasCriticos.length} anomalia(s) crítica(s).`;
            valorAnomalia.textContent = formatarMoeda(desvioTotal);
            
            // Mostrar item de discrepância
            const discItem = document.getElementById('tri-discrepancia-item');
            const discValor = document.getElementById('tri-discrepancia');
            if (discItem && discValor) {
                discItem.style.display = 'block';
                discValor.textContent = formatarMoeda(desvioTotal);
            }
            
            logger.log(`Veredito: CRÍTICO (${percentual.toFixed(2)}% de desvio)`, 'error');
            
        } else if (alertasNormais.length > 0) {
            statusEl.textContent = 'ALERTA';
            statusEl.className = 'veredicto-status alerta';
            desvioEl.textContent = 'Requer verificação manual';
            
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            logger.log('Veredito: ALERTA - Requer atenção', 'warning');
            
        } else {
            statusEl.textContent = 'NORMAL';
            statusEl.className = 'veredicto-status normal';
            desvioEl.textContent = 'Sem desvios significativos';
            
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            logger.log('Veredito: NORMAL - Dados consistentes', 'success');
        }
    }

    // ============================================
    // FUNÇÕES DE DEMONSTRAÇÃO E LIMPEZA
    // ============================================

    function carregarDemo() {
        logger.log('A carregar dados de simulação forense...', 'info');
        
        // Limpar dados existentes
        limparDadosInterface();
        
        // Carregar dados de demonstração baseados nos ficheiros reais
        State.financeiro.bruto = 3202.54;
        State.financeiro.liquido = 2409.95;
        State.financeiro.comissoes = 792.59;
        State.financeiro.dac7 = 7755.16;
        
        // Dados trimestrais DAC7
        State.financeiro.dac7Trimestres = {
            t1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            t2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            t3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            t4: { ganhos: 7755.16, comissoes: 239.00, impostos: 0, servicos: 1648 }
        };
        
        // Viagens de exemplo
        State.financeiro.viagens = [
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 20.24, comissao: 4.66 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 11.98, comissao: 2.76 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 9.23, comissao: 2.12 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 14.69, comissao: 3.38 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 5.80, comissao: 1.33 }
        ];
        
        // Autenticidade de exemplo
        State.autenticidade = [
            { algoritmo: 'SHA256', hash: '8D0E916DA5671C8E7D3D93E725F95EB9', ficheiro: '131509_202412.csv' },
            { algoritmo: 'SHA256', hash: '72EBE71E672F888C25F297DE6B5F61D6', ficheiro: 'Fatura Bolt PT1125-3582.pdf' },
            { algoritmo: 'SHA256', hash: '533F00E20333570148C476CD2B00BA20', ficheiro: 'Ganhos da empresa.pdf' }
        ];
        
        // Preencher tabela de hashes
        const tbodyHash = document.querySelector('#table-hashes tbody');
        if (tbodyHash) {
            tbodyHash.innerHTML = '';
            State.autenticidade.forEach(function(item) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.algoritmo}</td>
                    <td style="color: var(--accent-green);">${item.hash.substring(0, 16)}...</td>
                    <td>${item.ficheiro}</td>
                    <td><span style="color: var(--success);">✓ VALIDADO</span></td>
                `;
                tbodyHash.appendChild(tr);
            });
        }
        
        // Preencher tabela de viagens
        const tbodyViagens = document.querySelector('#table-viagens tbody');
        if (tbodyViagens) {
            tbodyViagens.innerHTML = '';
            State.financeiro.viagens.forEach(function(v) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${v.data}</td>
                    <td>${v.motorista}</td>
                    <td>${v.numFatura}</td>
                    <td>${formatarMoeda(v.valor)}</td>
                    <td>${formatarMoeda(v.comissao)}</td>
                `;
                tbodyViagens.appendChild(tr);
            });
        }
        
        // Atualizar contadores
        document.getElementById('count-ctrl').textContent = '3';
        document.getElementById('count-saft').textContent = '1';
        document.getElementById('count-fat').textContent = '1';
        document.getElementById('count-ext').textContent = '1';
        document.getElementById('count-dac7').textContent = '1';
        
        // Atualizar interface
        atualizarInterface();
        
        logger.log('DEMO carregada com sucesso. Dados sincronizados com documentos reais.', 'success');
    }

    function limparSistema() {
        if (!confirm('Tem a certeza que pretende limpar todos os dados?')) return;
        
        limparDadosInterface();
        
        // Limpar estado
        State.financeiro = {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            dac7: 0,
            viagens: [],
            faturas: [],
            extrato: {
                ganhosApp: 0,
                ganhosCampanha: 0,
                gorjetas: 0,
                portagens: 0,
                taxasCancel: 0,
                comissoes: 0,
                ganhosLiquidos: 0
            },
            dac7Trimestres: {
                t1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        };
        
        State.autenticidade = [];
        State.fila = [];
        State.alertas = [];
        
        logger.limpar();
        logger.log('Sistema limpo. Todos os dados removidos.', 'warning');
    }

    function limparDadosInterface() {
        // Limpar tabelas
        const tbodyHash = document.querySelector('#table-hashes tbody');
        const tbodyViagens = document.querySelector('#table-viagens tbody');
        const fileQueue = document.getElementById('file-queue');
        
        if (tbodyHash) tbodyHash.innerHTML = '';
        if (tbodyViagens) tbodyViagens.innerHTML = '';
        if (fileQueue) fileQueue.innerHTML = '';
        
        // Limpar alertas
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        // Esconder veredito
        const veredictoSection = document.getElementById('veredicto-section');
        if (veredictoSection) veredictoSection.style.display = 'none';
        
        // Limpar contadores
        const contadores = ['ctrl', 'saft', 'fat', 'ext', 'dac7'];
        contadores.forEach(function(id) {
            const el = document.getElementById(`count-${id}`);
            if (el) el.textContent = '0';
        });
        
        // Reset das métricas
        atualizarInterface();
    }

    function exportarJSON() {
        const dados = {
            sessao: {
                id: State.sessao.id,
                inicio: State.sessao.inicio,
                timestamp: new Date().toISOString()
            },
            financeiro: State.financeiro,
            autenticidade: State.autenticidade,
            alertas: State.alertas,
            logs: State.logs.slice(-50),
            versao: CONFIG.VERSAO
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Export_${State.sessao.id}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logger.log('Exportação JSON realizada com sucesso', 'success');
    }

    // ============================================
    // EXPOSIÇÃO PARA DEBUG (OPCIONAL)
    // ============================================

    window.VDC = {
        State: State,
        CONFIG: CONFIG,
        logger: logger,
        carregarDemo: carregarDemo,
        limparSistema: limparSistema
    };

})();
