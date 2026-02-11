/**
 * VDC SISTEMA DE PERITAGEM FORENSE v11.6 "GATEKEEPER"
 * AUDITORIA FISCAL BIG DATA - CORREÇÃO DE ENGENHARIA FORENSE
 * =========================================================
 * 1. GATEKEEPER: Splash apenas por clique manual
 * 2. Eventos: document único e robusto
 * 3. Parsing PT: PapaParse prioritário ;
 * 4. Demo: limpeza de memória antes de injetar
 * 5. IDs 100% alinhados com HTML
 */

(function() {
    'use strict';

    // =============================================
    // NAMESPACE GLOBAL ÚNICO - VDCSystem
    // =============================================
    window.VDCSystem = window.VDCSystem || {
        // Estado do sistema
        sessionActive: false,
        sessionId: null,
        masterHash: null,
        
        // Documentos e evidências
        documents: {
            dac7: [],
            control: [],
            saft: [],
            invoices: [],
            statements: []
        },
        
        // Dados processados
        processedData: {
            grossIncome: 0,
            platformCommission: 0,
            netReceived: 0,
            invoiceAmount: 0,
            vat6: 0,
            vat23: 0,
            jurosMora: 0,
            campaigns: 0,
            tips: 0,
            cancellations: 0,
            tolls: 0,
            omissionAmount: 0,
            clientName: '',
            clientNif: '',
            selectedYear: new Date().getFullYear(),
            selectedPlatform: 'bolt'
        },
        
        // Configurações de parsing
        parsingConfig: {
            csvDelimiter: ';',      // PRIORIDADE: Portugal
            fallbackDelimiter: ',',  // Fallback
            boltInvoiceRegex: /Total\s+com\s+IVA\s*[:\s]*([0-9]+[.,][0-9]{2})/i
        }
    };

    // =============================================
    // DOMContentLoaded - ÚNICO EVENTO PRINCIPAL
    // =============================================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔐 VDC v11.6 GATEKEEPER: Inicializando...');
        
        // 1. POPULATE YEARS
        populateYears();
        
        // 2. GERAR SESSION ID
        generateSessionId();
        
        // 3. ATUALIZAR DATA/HORA
        updateDateTime();
        setInterval(updateDateTime, 1000);
        
        // 4. GATEKEEPER: SPLASH SOMENTE POR CLIQUE
        setupGatekeeper();
        
        // 5. CONFIGURAR TODOS OS EVENT LISTENERS
        setupAllEventListeners();
        
        // 6. CARREGAR SUGESTÕES DE CLIENTES
        loadClientSuggestions();
        
        console.log('✅ VDC v11.6 GATEKEEPER: Pronto para auditoria.');
    });

    // =============================================
    // GATEKEEPER - SPLASH MANUAL OBRIGATÓRIO
    // =============================================
    function setupGatekeeper() {
        const splashScreen = document.getElementById('splashScreen');
        const mainContainer = document.getElementById('mainContainer');
        const startBtn = document.getElementById('startSessionBtn');
        
        if (!splashScreen || !mainContainer || !startBtn) {
            console.error('❌ GATEKEEPER: Elementos críticos não encontrados!');
            return;
        }
        
        // REMOVER QUALQUER setTimeout AUTOMÁTICO (herdado)
        // Garantir estado inicial correto
        splashScreen.style.display = 'flex';
        splashScreen.style.opacity = '1';
        mainContainer.style.display = 'none';
        mainContainer.classList.remove('visible');
        
        // ÚNICA FORMA DE ENTRAR: CLIQUE NO BOTÃO
        startBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔑 GATEKEEPER: Acesso autorizado pelo Perito.');
            
            // Ativar loading
            showLoading('Inicializando ambiente forense...');
            
            // Simular progresso
            setTimeout(() => {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    mainContainer.style.display = 'flex';
                    // Forçar reflow e mostrar
                    setTimeout(() => {
                        mainContainer.classList.add('visible');
                        hideLoading();
                        
                        // Gerar Master Hash
                        if (typeof window.generateMasterHash === 'function') {
                            window.generateMasterHash();
                        } else {
                            generateMasterHash();
                        }
                        
                        // Log de acesso
                        logAudit('🔐 Acesso ao sistema autorizado pelo Perito.', 'success');
                        logAudit('VDC v11.6 GATEKEEPER - Sessão iniciada: ' + window.VDCSystem.sessionId, 'info');
                        
                        // Habilitar botão de análise se houver dados
                        updateAnalyzeButtonState();
                    }, 50);
                }, 300);
            }, 500);
        });
    }

    // =============================================
    // CONFIGURAÇÃO DE TODOS OS EVENT LISTENERS
    // =============================================
    function setupAllEventListeners() {
        console.log('🎯 Configurando Event Listeners...');
        
        // === BOTÕES PRINCIPAIS ===
        attachListener('demoModeBtn', 'click', handleDemoMode);
        attachListener('registerClientBtnFixed', 'click', handleRegisterClient);
        attachListener('openEvidenceModalBtn', 'click', openEvidenceModal);
        attachListener('closeModalBtn', 'click', closeEvidenceModal);
        attachListener('closeAndSaveBtn', 'click', closeAndSaveEvidence);
        attachListener('clearAllBtn', 'click', clearAllEvidence);
        
        // === BOTÕES DE UPLOAD (ABRIR FILE DIALOG) ===
        attachListener('dac7UploadBtnModal', 'click', () => {
            document.getElementById('dac7FileModal').click();
        });
        attachListener('controlUploadBtnModal', 'click', () => {
            document.getElementById('controlFileModal').click();
        });
        attachListener('saftUploadBtnModal', 'click', () => {
            document.getElementById('saftFileModal').click();
        });
        attachListener('invoiceUploadBtnModal', 'click', () => {
            document.getElementById('invoiceFileModal').click();
        });
        attachListener('statementUploadBtnModal', 'click', () => {
            document.getElementById('statementFileModal').click();
        });
        
        // === INPUTS DE FICHEIRO (CHANGE) - PARSING IMEDIATO ===
        attachListener('dac7FileModal', 'change', (e) => handleFileUploadModal(e, 'dac7'));
        attachListener('controlFileModal', 'change', (e) => handleFileUploadModal(e, 'control'));
        attachListener('saftFileModal', 'change', (e) => handleFileUploadModal(e, 'saft'));
        attachListener('invoiceFileModal', 'change', (e) => handleFileUploadModal(e, 'invoices'));
        attachListener('statementFileModal', 'change', (e) => handleFileUploadModal(e, 'statements'));
        
        // === BOTÕES DE FERRAMENTAS ===
        attachListener('analyzeBtn', 'click', runForensicAudit);
        attachListener('exportJSONBtn', 'click', exportToJSON);
        attachListener('exportPDFBtn', 'click', exportToPDF);
        attachListener('resetBtn', 'click', resetSession);
        
        // === CONSOLE ===
        attachListener('clearConsoleBtn', 'click', clearConsole);
        attachListener('toggleConsoleBtn', 'click', toggleConsole);
        attachListener('custodyBtn', 'click', showCustodyChain);
        
        // === CLIENTE INPUTS ===
        const clientName = document.getElementById('clientNameFixed');
        const clientNif = document.getElementById('clientNIFFixed');
        if (clientName) clientName.addEventListener('input', validateClientForm);
        if (clientNif) clientNif.addEventListener('input', validateClientForm);
        
        // === PLATAFORMA E ANO ===
        const platformSelect = document.getElementById('selPlatformFixed');
        const yearSelect = document.getElementById('selYearFixed');
        if (platformSelect) platformSelect.addEventListener('change', (e) => {
            window.VDCSystem.processedData.selectedPlatform = e.target.value;
        });
        if (yearSelect) yearSelect.addEventListener('change', (e) => {
            window.VDCSystem.processedData.selectedYear = parseInt(e.target.value);
        });
        
        console.log('✅ Event Listeners configurados com sucesso.');
    }

    // =============================================
    // UTILITÁRIO: ANEXAR LISTENER COM SEGURANÇA
    // =============================================
    function attachListener(elementId, eventType, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            console.warn(`⚠️ Elemento não encontrado: #${elementId}`);
        }
    }

    // =============================================
    // HANDLE DEMO MODE - COM LIMPEZA DE MEMÓRIA
    // =============================================
    function handleDemoMode() {
        console.log('📊 Modo Demo: Carregando dados de teste...');
        
        // LIMPAR MEMÓRIA PRIMEIRO
        clearAllEvidenceData();
        
        // Atualizar UI para mostrar limpeza
        updateEvidenceCounters();
        updateEvidenceSummary();
        
        // INJETAR DADOS DEMO "MOMENTO EFICAZ"
        window.VDCSystem.processedData.clientName = 'Momento Eficaz Unipessoal, Lda';
        window.VDCSystem.processedData.clientNif = '517905450';
        
        // Preencher campos
        const clientNameField = document.getElementById('clientNameFixed');
        const clientNifField = document.getElementById('clientNIFFixed');
        if (clientNameField) clientNameField.value = 'Momento Eficaz Unipessoal, Lda';
        if (clientNifField) clientNifField.value = '517905450';
        
        // Mostrar status
        showClientStatus('Momento Eficaz Unipessoal, Lda', '517905450');
        
        // Dados financeiros demo (baseados em caso real)
        window.VDCSystem.processedData.grossIncome = 45287.35;
        window.VDCSystem.processedData.platformCommission = 6785.50;
        window.VDCSystem.processedData.netReceived = 38501.85;
        window.VDCSystem.processedData.invoiceAmount = 42500.00;
        window.VDCSystem.processedData.vat6 = 2717.24;
        window.VDCSystem.processedData.vat23 = 1560.67;
        window.VDCSystem.processedData.omissionAmount = 3998.15;
        
        // Dados secundários
        window.VDCSystem.processedData.campaigns = 450.00;
        window.VDCSystem.processedData.tips = 1230.50;
        window.VDCSystem.processedData.cancellations = 320.75;
        window.VDCSystem.processedData.tolls = 890.25;
        
        // Juros de mora (4% ao ano sobre omissão)
        window.VDCSystem.processedData.jurosMora = window.VDCSystem.processedData.omissionAmount * 0.04;
        
        // Atualizar Dashboard
        updateDashboard();
        updateKPIs();
        updateResults();
        updateChart();
        
        // Habilitar botão de análise
        document.getElementById('analyzeBtn').disabled = false;
        
        // Log
        logAudit('📊 Dados demo carregados: Momento Eficaz (NIF: 517905450)', 'success');
        logAudit(`💰 Valores: Bruto €${formatCurrency(window.VDCSystem.processedData.grossIncome)} | Omissão €${formatCurrency(window.VDCSystem.processedData.omissionAmount)}`, 'warn');
        
        showToast('Dados demo carregados com sucesso!', 'success');
    }

    // =============================================
    // HANDLE FILE UPLOAD - PARSING PRIORITÁRIO PT
    // =============================================
    function handleFileUploadModal(event, type) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        logAudit(`📎 Processando ${files.length} ficheiro(s) do tipo: ${type.toUpperCase()}`, 'info');
        
        // Array para armazenar os ficheiros processados
        const fileArray = Array.from(files).map(file => ({
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            hash: null,
            status: 'processing',
            data: null
        }));
        
        // Adicionar ao namespace
        window.VDCSystem.documents[type] = [...window.VDCSystem.documents[type], ...fileArray];
        
        // Atualizar UI imediatamente
        updateFileListModal(type);
        updateEvidenceCounters();
        updateEvidenceSummary();
        
        // Processar cada ficheiro baseado no tipo
        fileArray.forEach((fileObj, index) => {
            const file = fileObj.file;
            
            // Gerar hash SHA-256
            generateFileHash(file).then(hash => {
                fileObj.hash = hash;
                fileObj.status = 'completed';
                
                // Parsing específico por tipo
                if (type === 'saft' && file.name.toLowerCase().endsWith('.csv')) {
                    parseCSVWithPTPriority(file, (data) => {
                        fileObj.data = data;
                        processSaftData(data);
                        updateFileListModal(type);
                    });
                } else if (type === 'invoices') {
                    extractInvoiceValue(file, (value) => {
                        fileObj.extractedValue = value;
                        processInvoiceData(value);
                        updateFileListModal(type);
                    });
                } else if (type === 'statements') {
                    parseStatementFile(file, (total) => {
                        fileObj.extractedTotal = total;
                        processStatementData(total);
                        updateFileListModal(type);
                    });
                } else {
                    updateFileListModal(type);
                }
                
                // Verificar se todos foram processados
                const allCompleted = window.VDCSystem.documents[type].every(doc => doc.status === 'completed');
                if (allCompleted) {
                    logAudit(`✅ Todos os ficheiros ${type.toUpperCase()} processados.`, 'success');
                    updateAnalyzeButtonState();
                }
            }).catch(err => {
                console.error(`Erro ao processar hash: ${file.name}`, err);
                fileObj.status = 'error';
                fileObj.error = err.message;
                updateFileListModal(type);
            });
        });
        
        // Limpar input para permitir re-upload
        event.target.value = '';
    }

    // =============================================
    // PARSING CSV COM PRIORIDADE PT (;)
    // =============================================
    function parseCSVWithPTPriority(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            
            // TENTAR PRIMEIRO COM PONTO E VÍRGULA (PT)
            PapaParse.parse(content, {
                delimiter: ';',
                header: true,
                skipEmptyLines: true,
                complete: (result) => {
                    if (result.data && result.data.length > 0 && Object.keys(result.data[0]).length > 1) {
                        console.log('✅ CSV parsed with ; delimiter (PT)');
                        callback(result.data);
                    } else {
                        // FALLBACK: VÍRGULA
                        console.log('⚠️ Trying comma delimiter as fallback...');
                        PapaParse.parse(content, {
                            delimiter: ',',
                            header: true,
                            skipEmptyLines: true,
                            complete: (result2) => {
                                callback(result2.data);
                            }
                        });
                    }
                },
                error: () => {
                    // Fallback com vírgula
                    PapaParse.parse(content, {
                        delimiter: ',',
                        header: true,
                        skipEmptyLines: true,
                        complete: (result2) => {
                            callback(result2.data);
                        }
                    });
                }
            });
        };
        reader.readAsText(file);
    }

    // =============================================
    // EXTRAÇÃO DE VALOR DE FATURA BOLT
    // =============================================
    function extractInvoiceValue(file, callback) {
        if (file.type === 'application/pdf') {
            // Simulação de extração de PDF - em produção usaria PDF.js
            // Para demo, extrai do nome do ficheiro ou usa valor padrão
            const fileName = file.name.toLowerCase();
            let extractedValue = 0;
            
            // Regex para encontrar valores no nome do ficheiro (fallback)
            const valueMatch = fileName.match(/(\d+[.,]\d{2})/);
            if (valueMatch) {
                extractedValue = parseFloat(valueMatch[1].replace(',', '.'));
            }
            
            // Em produção, aqui faria OCR/text extraction
            // Por enquanto, simula valores baseados em padrões Bolt
            if (fileName.includes('bolt') || fileName.includes('Bolt')) {
                extractedValue = 15.75; // Valor médio demo
            }
            
            callback(extractedValue);
        } else {
            // Para CSV/XML, processar conteúdo
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                
                // Regex para "Total com IVA" com quebras de linha
                const regex = /Total\s+com\s+IVA\s*[:\s]*([0-9]+[.,][0-9]{2})/i;
                const match = content.match(regex);
                
                if (match) {
                    const value = parseFloat(match[1].replace(',', '.'));
                    callback(value);
                } else {
                    callback(0);
                }
            };
            reader.readAsText(file);
        }
    }

    // =============================================
    // PARSING DE EXTRATO BANCÁRIO - SOMA LINHA A LINHA
    // =============================================
    function parseStatementFile(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let total = 0;
            
            // Tentar parsear como CSV primeiro
            PapaParse.parse(content, {
                delimiter: ';',
                header: true,
                skipEmptyLines: true,
                complete: (result) => {
                    if (result.data && result.data.length > 0) {
                        // Procurar coluna de valor
                        const firstRow = result.data[0];
                        let valueColumn = null;
                        
                        // Possíveis nomes de coluna para valores
                        const possibleColumns = ['Valor', 'Total', 'Amount', 'Value', 'Montante', 'Crédito'];
                        
                        for (const col of possibleColumns) {
                            if (firstRow[col] !== undefined) {
                                valueColumn = col;
                                break;
                            }
                        }
                        
                        if (valueColumn) {
                            // Somar todos os valores positivos (créditos)
                            result.data.forEach(row => {
                                const val = parseFloat(String(row[valueColumn] || '0').replace(',', '.'));
                                if (!isNaN(val) && val > 0) {
                                    total += val;
                                }
                            });
                        } else {
                            // FALLBACK: somar todas as colunas numéricas
                            result.data.forEach(row => {
                                Object.values(row).forEach(value => {
                                    const num = parseFloat(String(value || '').replace(',', '.'));
                                    if (!isNaN(num)) {
                                        total += num;
                                    }
                                });
                            });
                        }
                    }
                    callback(total);
                },
                error: () => {
                    // Se falhar, tentar extrair valores com regex
                    const numbers = content.match(/\d+[.,]\d{2}/g);
                    if (numbers) {
                        total = numbers.reduce((acc, num) => {
                            return acc + parseFloat(num.replace(',', '.'));
                        }, 0);
                    }
                    callback(total);
                }
            });
        };
        reader.readAsText(file);
    }

    // =============================================
    // PROCESSAMENTO DE DADOS ESPECÍFICOS
    // =============================================
    function processSaftData(data) {
        // Extrair totais do SAF-T
        let totalGross = 0;
        
        data.forEach(row => {
            // Procurar por colunas de valor
            Object.values(row).forEach(value => {
                if (typeof value === 'string' && value.includes(',')) {
                    const num = parseFloat(value.replace(',', '.'));
                    if (!isNaN(num) && num > 0 && num < 100000) {
                        totalGross += num;
                    }
                }
            });
        });
        
        if (totalGross > 0) {
            window.VDCSystem.processedData.grossIncome = totalGross;
            window.VDCSystem.processedData.vat6 = totalGross * 0.06;
            updateDashboard();
        }
    }

    function processInvoiceData(value) {
        if (value > 0) {
            window.VDCSystem.processedData.invoiceAmount += value;
            updateKPIs();
            checkDiscrepancies();
        }
    }

    function processStatementData(total) {
        if (total > 0) {
            window.VDCSystem.processedData.netReceived = total;
            window.VDCSystem.processedData.platformCommission = 
                window.VDCSystem.processedData.grossIncome - total;
            updateDashboard();
            updateKPIs();
            checkDiscrepancies();
        }
    }

    // =============================================
    // VERIFICAÇÃO DE DISCREPÂNCIAS (LAYERING)
    // =============================================
    function checkDiscrepancies() {
        const invoice = window.VDCSystem.processedData.invoiceAmount;
        const commission = window.VDCSystem.processedData.platformCommission;
        
        if (invoice > 0 && commission > 0) {
            const delta = commission - invoice;
            window.VDCSystem.processedData.omissionAmount = Math.max(0, delta);
            
            // Atualizar alertas
            const omissionAlert = document.getElementById('omissionAlert');
            const bigDataAlert = document.getElementById('bigDataAlert');
            const diferencialAlert = document.getElementById('diferencialAlert');
            
            if (omissionAlert) {
                document.getElementById('omissionValue').textContent = 
                    formatCurrency(window.VDCSystem.processedData.omissionAmount);
                omissionAlert.style.display = window.VDCSystem.processedData.omissionAmount > 10 ? 'flex' : 'none';
            }
            
            if (bigDataAlert) {
                document.getElementById('alertInvoiceVal').textContent = formatCurrency(invoice);
                document.getElementById('alertCommVal').textContent = formatCurrency(commission);
                document.getElementById('alertDeltaVal').textContent = formatCurrency(delta);
                bigDataAlert.style.display = Math.abs(delta) > 10 ? 'flex' : 'none';
            }
            
            if (diferencialAlert) {
                diferencialAlert.style.display = commission > invoice ? 'flex' : 'none';
            }
            
            // Calcular juros de mora (4%)
            if (window.VDCSystem.processedData.omissionAmount > 0) {
                window.VDCSystem.processedData.jurosMora = 
                    window.VDCSystem.processedData.omissionAmount * 0.04;
                
                const jurosCard = document.getElementById('jurosCard');
                const jurosAlert = document.getElementById('jurosAlert');
                
                if (jurosCard) {
                    document.getElementById('jurosVal').textContent = 
                        formatCurrency(window.VDCSystem.processedData.jurosMora);
                    jurosCard.style.display = 'flex';
                }
                
                if (jurosAlert) {
                    document.getElementById('jurosValue').textContent = 
                        formatCurrency(window.VDCSystem.processedData.jurosMora);
                    jurosAlert.style.display = 'flex';
                }
            }
        }
    }

    // =============================================
    // ATUALIZAÇÃO DE UI
    // =============================================
    function updateDashboard() {
        const p = window.VDCSystem.processedData;
        setText('netVal', formatCurrency(p.grossIncome));
        setText('iva6Val', formatCurrency(p.vat6));
        setText('commissionVal', formatCurrency(p.platformCommission));
        setText('iva23Val', formatCurrency(p.vat23));
    }

    function updateKPIs() {
        const p = window.VDCSystem.processedData;
        setText('kpiGanhos', formatCurrency(p.grossIncome));
        setText('kpiComm', formatCurrency(p.platformCommission));
        setText('kpiNet', formatCurrency(p.netReceived));
        setText('kpiInvoice', formatCurrency(p.invoiceAmount));
        setText('valCamp', formatCurrency(p.campaigns));
        setText('valTips', formatCurrency(p.tips));
        setText('valCanc', formatCurrency(p.cancellations));
        setText('valTolls', formatCurrency(p.tolls));
    }

    function updateResults() {
        const p = window.VDCSystem.processedData;
        setText('grossResult', formatCurrency(p.grossIncome));
        setText('transferResult', formatCurrency(p.netReceived));
        
        const difference = p.grossIncome - p.netReceived;
        setText('differenceResult', formatCurrency(difference));
        
        // Quantum benefício ilícito (em milhões)
        const quantum = p.omissionAmount / 1000000;
        setText('marketResult', quantum.toFixed(2).replace('.', ',') + 'M€');
        
        // Barras de progresso
        const maxVal = Math.max(p.grossIncome, p.netReceived, difference, p.omissionAmount) || 1;
        setBarWidth('grossResult', p.grossIncome / maxVal * 100);
        setBarWidth('transferResult', p.netReceived / maxVal * 100);
        setBarWidth('differenceResult', difference / maxVal * 100);
        setBarWidth('marketResult', p.omissionAmount / maxVal * 100);
    }

    function updateChart() {
        const ctx = document.getElementById('forensicChart')?.getContext('2d');
        if (!ctx) return;
        
        const p = window.VDCSystem.processedData;
        
        // Destruir gráfico existente
        if (window.forensicChart instanceof Chart) {
            window.forensicChart.destroy();
        }
        
        window.forensicChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Valor Ilíquido', 'IVA 6%', 'Comissão', 'IVA 23%', 'Juros 4%'],
                datasets: [{
                    label: 'Valor (€)',
                    data: [
                        p.grossIncome,
                        p.vat6,
                        p.platformCommission,
                        p.vat23,
                        p.jurosMora
                    ],
                    backgroundColor: ['#00f2ff', '#3b82f6', '#ff3e3e', '#f59e0b', '#ff6b35'],
                    borderWidth: 0
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
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // =============================================
    // LIMPEZA TOTAL DE MEMÓRIA
    // =============================================
    function clearAllEvidenceData() {
        // Resetar arrays de documentos
        window.VDCSystem.documents = {
            dac7: [],
            control: [],
            saft: [],
            invoices: [],
            statements: []
        };
        
        // Resetar dados processados (mantendo plataforma/ano)
        const platform = window.VDCSystem.processedData.selectedPlatform;
        const year = window.VDCSystem.processedData.selectedYear;
        
        window.VDCSystem.processedData = {
            grossIncome: 0,
            platformCommission: 0,
            netReceived: 0,
            invoiceAmount: 0,
            vat6: 0,
            vat23: 0,
            jurosMora: 0,
            campaigns: 0,
            tips: 0,
            cancellations: 0,
            tolls: 0,
            omissionAmount: 0,
            clientName: '',
            clientNif: '',
            selectedYear: year || new Date().getFullYear(),
            selectedPlatform: platform || 'bolt'
        };
        
        // Limpar UI
        setText('evidence-count-solid', '0 ficheiros');
        setText('controlCountCompact', '0');
        setText('saftCountCompact', '0');
        setText('invoiceCountCompact', '0');
        setText('statementCountCompact', '0');
        setText('dac7CountCompact', '0');
        
        // Resetar todos os campos
        ['netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'jurosVal',
         'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice',
         'valCamp', 'valTips', 'valCanc', 'valTolls',
         'grossResult', 'transferResult', 'differenceResult', 'marketResult',
         'omissionValue', 'alertInvoiceVal', 'alertCommVal', 'alertDeltaVal',
         'jurosValue'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id.includes('Val') || id.includes('Result') || id.includes('Value')) {
                    el.textContent = '0,00€';
                }
            }
        });
        
        // Esconder alertas
        ['omissionAlert', 'bigDataAlert', 'diferencialAlert', 'jurosAlert', 'jurosCard'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Resetar client status
        const clientStatus = document.getElementById('clientStatusFixed');
        if (clientStatus) clientStatus.style.display = 'none';
        
        logAudit('🧹 Memória completamente limpa.', 'info');
    }

    // =============================================
    // UTILITÁRIOS
    // =============================================
    function setText(elementId, text) {
        const el = document.getElementById(elementId);
        if (el) el.textContent = text;
    }

    function setBarWidth(elementId, percentage) {
        const parent = document.getElementById(elementId)?.parentElement?.parentElement;
        if (parent) {
            const bar = parent.querySelector('.bar-fill');
            if (bar) bar.style.width = Math.min(100, Math.max(0, percentage)) + '%';
        }
    }

    function formatCurrency(value) {
        return (value || 0).toFixed(2).replace('.', ',') + '€';
    }

    function generateSessionId() {
        window.VDCSystem.sessionId = 'VDC-' + 
            Math.random().toString(36).substring(2, 8).toUpperCase();
        const el = document.getElementById('sessionIdDisplay');
        if (el) el.textContent = window.VDCSystem.sessionId;
    }

    function updateDateTime() {
        const now = new Date();
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('pt-PT');
        }
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('pt-PT');
        }
    }

    function populateYears() {
        const select = document.getElementById('selYearFixed');
        if (!select) return;
        
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            select.appendChild(option);
        }
        window.VDCSystem.processedData.selectedYear = currentYear;
    }

    function loadClientSuggestions() {
        // Datalist para sugestões
        const datalist = document.getElementById('clientSuggestions');
        if (datalist) {
            const suggestions = [
                'Momento Eficaz Unipessoal, Lda',
                'Transportes Rápidos, SA',
                'Mobilidade Urbana, Lda',
                'Expresso Digital Unipessoal'
            ];
            suggestions.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                datalist.appendChild(option);
            });
        }
    }

    function validateClientForm() {
        const name = document.getElementById('clientNameFixed')?.value.trim();
        const nif = document.getElementById('clientNIFFixed')?.value.trim();
        const registerBtn = document.getElementById('registerClientBtnFixed');
        
        if (registerBtn) {
            registerBtn.disabled = !(name && nif && nif.length === 9 && /^\d+$/.test(nif));
        }
    }

    function showClientStatus(name, nif) {
        const statusDiv = document.getElementById('clientStatusFixed');
        const nameSpan = document.getElementById('clientNameDisplayFixed');
        const nifSpan = document.getElementById('clientNifDisplayFixed');
        
        if (statusDiv && nameSpan && nifSpan) {
            nameSpan.textContent = name;
            nifSpan.textContent = nif;
            statusDiv.style.display = 'flex';
        }
    }

    function handleRegisterClient() {
        const name = document.getElementById('clientNameFixed')?.value.trim();
        const nif = document.getElementById('clientNIFFixed')?.value.trim();
        
        if (name && nif && nif.length === 9 && /^\d+$/.test(nif)) {
            window.VDCSystem.processedData.clientName = name;
            window.VDCSystem.processedData.clientNif = nif;
            showClientStatus(name, nif);
            logAudit(`👤 Cliente registado: ${name} (NIF: ${nif})`, 'success');
            showToast('Cliente registado com sucesso!', 'success');
            updateAnalyzeButtonState();
        }
    }

    function updateAnalyzeButtonState() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (!analyzeBtn) return;
        
        const hasClient = window.VDCSystem.processedData.clientName && 
                         window.VDCSystem.processedData.clientNif;
        const hasEvidence = Object.values(window.VDCSystem.documents)
            .some(arr => arr.length > 0);
        
        analyzeBtn.disabled = !(hasClient && hasEvidence);
    }

    // =============================================
    // FUNÇÕES DO MODAL DE EVIDÊNCIAS
    // =============================================
    function openEvidenceModal() {
        const modal = document.getElementById('evidenceModal');
        if (modal) {
            modal.style.display = 'flex';
            updateAllFileLists();
            logAudit('📁 Modal de gestão de evidências aberto.', 'info');
        }
    }

    function closeEvidenceModal() {
        const modal = document.getElementById('evidenceModal');
        if (modal) modal.style.display = 'none';
    }

    function closeAndSaveEvidence() {
        closeEvidenceModal();
        updateEvidenceCounters();
        updateEvidenceSummary();
        updateAnalyzeButtonState();
        logAudit('💾 Evidências guardadas e modal fechado.', 'success');
        showToast('Evidências atualizadas com sucesso!', 'success');
    }

    function clearAllEvidence() {
        if (confirm('⚠️ TEM CERTEZA? Esta ação irá LIMPAR TODAS as evidências carregadas.')) {
            clearAllEvidenceData();
            updateAllFileLists();
            updateEvidenceCounters();
            updateEvidenceSummary();
            updateAnalyzeButtonState();
            logAudit('🗑️ Todas as evidências foram removidas.', 'warn');
            showToast('Todas as evidências foram removidas.', 'warning');
        }
    }

    function updateFileListModal(type) {
        const listDiv = document.getElementById(`${type}FileListModal`);
        if (!listDiv) return;
        
        const files = window.VDCSystem.documents[type] || [];
        listDiv.innerHTML = '';
        
        if (files.length === 0) {
            listDiv.style.display = 'none';
            return;
        }
        
        listDiv.style.display = 'block';
        
        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item-modal';
            
            const statusIcon = file.status === 'completed' ? 
                '<i class="fas fa-check-circle"></i>' : 
                '<i class="fas fa-spinner fa-spin"></i>';
            
            const hashShort = file.hash ? 
                file.hash.substring(0, 8) + '...' : 
                'processando...';
            
            item.innerHTML = `
                ${statusIcon}
                <span class="file-name-modal">${file.name}</span>
                <span class="file-hash-modal">SHA256: ${hashShort}</span>
                <span class="file-status-modal">${file.status === 'completed' ? 'OK' : '...'}</span>
            `;
            
            listDiv.appendChild(item);
        });
    }

    function updateAllFileLists() {
        ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(type => {
            updateFileListModal(type);
        });
    }

    function updateEvidenceCounters() {
        const counts = {
            control: window.VDCSystem.documents.control.length,
            saft: window.VDCSystem.documents.saft.length,
            invoices: window.VDCSystem.documents.invoices.length,
            statements: window.VDCSystem.documents.statements.length,
            dac7: window.VDCSystem.documents.dac7.length
        };
        
        setText('controlCountCompact', counts.control);
        setText('saftCountCompact', counts.saft);
        setText('invoiceCountCompact', counts.invoices);
        setText('statementCountCompact', counts.statements);
        setText('dac7CountCompact', counts.dac7);
        
        const totalFiles = Object.values(counts).reduce((a, b) => a + b, 0);
        setText('evidence-count-solid', totalFiles + ' ficheiros');
    }

    function updateEvidenceSummary() {
        const counts = {
            dac7: window.VDCSystem.documents.dac7.length,
            control: window.VDCSystem.documents.control.length,
            saft: window.VDCSystem.documents.saft.length,
            invoices: window.VDCSystem.documents.invoices.length,
            statements: window.VDCSystem.documents.statements.length
        };
        
        setText('summaryDac7', `${counts.dac7} ficheiros | 0 registos`);
        setText('summaryControl', `${counts.control} ficheiros`);
        setText('summarySaft', `${counts.saft} ficheiros | 0 registos`);
        setText('summaryInvoices', `${counts.invoices} ficheiros | 0 registos`);
        setText('summaryStatements', `${counts.statements} ficheiros | 0 registos`);
        
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        setText('summaryTotal', `${total} ficheiros | 0 registos`);
    }

    // =============================================
    // FUNÇÕES DE AUDITORIA E EXPORTAÇÃO
    // =============================================
    function runForensicAudit() {
        logAudit('🔍 INICIANDO AUDITORIA FORENSE BIG DATA...', 'warn');
        
        // Recalcular tudo
        updateDashboard();
        updateKPIs();
        updateResults();
        updateChart();
        checkDiscrepancies();
        
        // Gerar novo master hash
        generateMasterHash();
        
        logAudit('✅ Auditoria concluída. Discrepâncias calculadas.', 'success');
        showToast('Auditoria executada com sucesso!', 'success');
    }

    function exportToJSON() {
        const data = {
            session: {
                id: window.VDCSystem.sessionId,
                timestamp: new Date().toISOString(),
                masterHash: window.VDCSystem.masterHash
            },
            client: {
                name: window.VDCSystem.processedData.clientName,
                nif: window.VDCSystem.processedData.clientNif,
                year: window.VDCSystem.processedData.selectedYear,
                platform: window.VDCSystem.processedData.selectedPlatform
            },
            financial: {
                grossIncome: window.VDCSystem.processedData.grossIncome,
                platformCommission: window.VDCSystem.processedData.platformCommission,
                netReceived: window.VDCSystem.processedData.netReceived,
                invoiceAmount: window.VDCSystem.processedData.invoiceAmount,
                omissionAmount: window.VDCSystem.processedData.omissionAmount,
                vat6: window.VDCSystem.processedData.vat6,
                vat23: window.VDCSystem.processedData.vat23,
                jurosMora: window.VDCSystem.processedData.jurosMora
            },
            evidence: {
                counts: {
                    dac7: window.VDCSystem.documents.dac7.length,
                    control: window.VDCSystem.documents.control.length,
                    saft: window.VDCSystem.documents.saft.length,
                    invoices: window.VDCSystem.documents.invoices.length,
                    statements: window.VDCSystem.documents.statements.length
                }
            }
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Auditoria_${window.VDCSystem.sessionId}.json`;
        a.click();
        
        logAudit('📄 Relatório JSON exportado.', 'success');
        showToast('JSON exportado com sucesso!', 'success');
    }

    function exportToPDF() {
        logAudit('📑 Gerando relatório pericial em PDF...', 'info');
        showToast('Função PDF será implementada em produção.', 'info');
    }

    function resetSession() {
        if (confirm('⚠️ Confirmar NOVA SESSÃO? Todos os dados serão perdidos.')) {
            clearAllEvidenceData();
            window.VDCSystem.sessionId = null;
            generateSessionId();
            generateMasterHash();
            logAudit('🔄 Nova sessão iniciada. Sistema limpo.', 'info');
            showToast('Nova sessão iniciada.', 'success');
        }
    }

    // =============================================
    // CONSOLE DE AUDITORIA
    // =============================================
    function logAudit(message, type = 'info') {
        const consoleOutput = document.getElementById('auditOutput');
        if (!consoleOutput) return;
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString('pt-PT');
        entry.textContent = `[${timestamp}] ${message}`;
        
        consoleOutput.appendChild(entry);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Manter apenas últimas 100 entradas
        while (consoleOutput.children.length > 100) {
            consoleOutput.removeChild(consoleOutput.firstChild);
        }
    }

    function clearConsole() {
        const consoleOutput = document.getElementById('auditOutput');
        if (consoleOutput) consoleOutput.innerHTML = '';
        logAudit('🧹 Consola limpa.', 'info');
    }

    function toggleConsole() {
        const consoleOutput = document.getElementById('auditOutput');
        const btn = document.getElementById('toggleConsoleBtn');
        if (consoleOutput) {
            if (consoleOutput.style.height === '300px') {
                consoleOutput.style.height = '120px';
                btn.innerHTML = '<i class="fas fa-expand-alt"></i>';
            } else {
                consoleOutput.style.height = '300px';
                btn.innerHTML = '<i class="fas fa-compress-alt"></i>';
            }
        }
    }

    function showCustodyChain() {
        const hash = window.VDCSystem.masterHash || 'NÃO GERADO';
        logAudit(`🔗 CADEIA DE CUSTÓDIA: Master Hash = ${hash}`, 'regulatory');
        showToast('Cadeia de custódia exibida na consola.', 'info');
    }

    // =============================================
    // HASH E INTEGRIDADE
    // =============================================
    function generateFileHash(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
                const hash = CryptoJS.SHA256(wordArray).toString();
                resolve(hash);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function generateMasterHash() {
        const data = JSON.stringify({
            session: window.VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            client: window.VDCSystem.processedData.clientName,
            nif: window.VDCSystem.processedData.clientNif,
            gross: window.VDCSystem.processedData.grossIncome,
            omission: window.VDCSystem.processedData.omissionAmount
        });
        
        window.VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
        const hashEl = document.getElementById('masterHashValue');
        if (hashEl) {
            hashEl.textContent = window.VDCSystem.masterHash;
        }
        
        return window.VDCSystem.masterHash;
    }

    // =============================================
    // LOADING E TOAST
    // =============================================
    function showLoading(message = 'Carregando...') {
        const overlay = document.getElementById('loadingOverlay');
        const progress = document.getElementById('loadingProgress');
        if (overlay) overlay.style.display = 'flex';
        if (progress) progress.style.width = '0%';
        
        let width = 0;
        const interval = setInterval(() => {
            width += 5;
            if (progress) progress.style.width = width + '%';
            if (width >= 100) clearInterval(interval);
        }, 50);
        
        window.loadingInterval = interval;
    }

    function hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
        if (window.loadingInterval) clearInterval(window.loadingInterval);
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';
        
        toast.innerHTML = `<i class="fas ${icon}"></i><p>${message}</p>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // =============================================
    // EXPOR FUNÇÕES PARA ACESSO GLOBAL
    // =============================================
    window.populateYears = populateYears;
    window.generateMasterHash = generateMasterHash;
    window.logAudit = logAudit;
    window.handleDemoMode = handleDemoMode;
    window.handleFileUploadModal = handleFileUploadModal;
    window.formatCurrency = formatCurrency;
    window.updateDashboard = updateDashboard;
    window.updateKPIs = updateKPIs;
    window.updateResults = updateResults;
    window.updateChart = updateChart;

    console.log('✅ VDC v11.6 GATEKEEPER: Script carregado e pronto.');
})();
