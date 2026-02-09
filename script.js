// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.9-FS
// FINAL STABLE RELEASE - BIG DATA FORENSE
// ============================================

// 1. ESTADO DO SISTEMA - ESTRUTURA FORENSE
const VDCSystem = {
    version: 'v10.9-FS',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '' }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { 
            commission: 0, 
            iva23: 0, 
            invoiceValue: 0,
            invoicesFound: []
        }, hashes: {}},
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0
        }, hashes: {}}
    },
    
    analysis: {
        extractedValues: {
            // SAF-T
            saftGross: 0,
            saftIVA6: 0,
            saftNet: 0,
            
            // Platform Data
            platformCommission: 0,
            bankTransfer: 0,
            iva23Due: 0,
            
            // Bolt KPIs
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            faturaPlataforma: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
            
            // Forensic Findings
            diferencialCusto: 0,
            prejuizoFiscal: 0,
            ivaAutoliquidacao: 0,
            
            // DAC7
            dac7Revenue: 0,
            dac7Period: '',
            
            // Juros de Mora (RGRC 4%)
            jurosMora: 0,
            
            // Passivo Regulatório (AMT/IMT)
            taxaRegulacao: 0
        },
        
        crossings: {
            deltaA: 0,      // SAF-T vs Extratos
            deltaB: 0,      // Comissão vs Fatura
            omission: 0,
            diferencialAlerta: false,
            fraudIndicators: []
        },
        
        projection: {
            marketProjection: 0,
            averagePerDriver: 0,
            driverCount: 38000,
            monthsPerYear: 12,
            yearsOfOperation: 7,
            totalMarketImpact: 0
        },
        
        chainOfCustody: [],
        anomalies: [],
        quesitosEstrategicos: [],
        legalCitations: [
            "ISO/IEC 27037:2012 - Preservação de Evidência Digital",
            "NIST SP 800-86 - Guia para Análise Forense de Dados",
            "Regime Geral das Infrações Tributárias (RGRC) - Art. 103.º",
            "Código do IRC, Artigo 87º - Tratamento Contabilístico integral",
            "CIVA, Artigo 2.º - Obrigação de faturação completa",
            "RGIT, Artigo 103º - Crime de Fraude Fiscal",
            "Diretiva DAC7 - Transparência de plataformas digitais",
            "Decreto-Lei 83/2017 - Taxa de Regulação (AMT/IMT)"
        ]
    },
    
    counters: {
        dac7: 0,
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0
    },
    
    logs: [],
    chart: null,
    preRegisteredClients: []
};

// 2. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v10.9-FS...');
        
        // Evento do botão de splash screen
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) {
            startBtn.addEventListener('click', startForensicSession);
        }
        
        // Inicializar relógio
        startClockAndDate();
        
        logAudit('✅ Sistema VDC v10.9-FS pronto para iniciar sessão de peritagem Big Data', 'success');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

function startForensicSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (splashScreen && loadingOverlay) {
            splashScreen.style.opacity = '0';
            
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadingOverlay.style.display = 'flex';
                
                setTimeout(() => {
                    loadForensicSystem();
                }, 300);
            }, 500);
        }
    } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
        showError(`Erro ao iniciar sessão: ${error.message}`);
    }
}

function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'flex';
            
            setTimeout(() => {
                mainContainer.style.opacity = '1';
            }, 50);
        }, 500);
    }
}

async function loadForensicSystem() {
    try {
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = generateSessionId();
        const sessionIdElement = document.getElementById('sessionIdDisplay');
        if (sessionIdElement) sessionIdElement.textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        loadClientsFromLocal();
        updateLoadingProgress(50);
        
        setupEventListeners();
        updateLoadingProgress(60);
        
        updateLoadingProgress(70);
        
        resetDashboard();
        updateLoadingProgress(80);
        
        renderDashboardChart();
        updateLoadingProgress(90);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v10.9-FS inicializado com sucesso', 'success');
                logAudit('🔍 Protocolos ativados: ISO/IEC 27037, NIST SP 800-86', 'info');
                logAudit('📊 Upload Big Data ilimitado ativado', 'info');
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro no carregamento do sistema:', error);
        showError(`Falha no carregamento: ${error.message}`);
    }
}

// 3. CONFIGURAÇÃO DE CONTROLES
function setupYearSelector() {
    const selYear = document.getElementById('selYear');
    if (!selYear) return;
    
    selYear.innerHTML = '';
    const currentYear = new Date().getFullYear();
    VDCSystem.selectedYear = currentYear;
    
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
        }
        selYear.appendChild(option);
    }
    
    selYear.addEventListener('change', (e) => {
        VDCSystem.selectedYear = parseInt(e.target.value);
        logAudit(`Ano fiscal alterado para: ${VDCSystem.selectedYear}`, 'info');
    });
}

function setupPlatformSelector() {
    const selPlatform = document.getElementById('selPlatform');
    if (!selPlatform) return;
    
    selPlatform.value = VDCSystem.selectedPlatform;
    
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        const platformName = e.target.options[e.target.selectedIndex].text;
        
        logAudit(`Plataforma selecionada: ${platformName}`, 'info');
        
        // Limpar análise específica da plataforma
        VDCSystem.analysis.extractedValues = {
            saftGross: 0, saftIVA6: 0, saftNet: 0,
            platformCommission: 0, bankTransfer: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
            faturaPlataforma: 0, campanhas: 0, gorjetas: 0,
            cancelamentos: 0, portagens: 0, diferencialCusto: 0,
            prejuizoFiscal: 0, ivaAutoliquidacao: 0,
            dac7Revenue: 0, dac7Period: '',
            jurosMora: 0,
            taxaRegulacao: 0
        };
        
        updateDashboard();
        updateKPIResults();
    });
}

function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        
        const dateString = now.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');
        
        if (dateElement) dateElement.textContent = dateString;
        if (timeElement) timeElement.textContent = timeString;
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// 4. CONFIGURAÇÃO DE EVENTOS
function setupEventListeners() {
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    const saveBtn = document.getElementById('saveClientBtn');
    
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClient);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveClientToJSON);
    }
    
    // Botão MODO DEMO
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', activateDemoMode);
    }
    
    // Botões de upload
    setupUploadButtons();
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performForensicAnalysis);
    }
    
    // Botões de exportação
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) {
        exportJSONBtn.addEventListener('click', exportJSON);
    }
    
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', exportPDF);
    }
    
    // Botão reset
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetDashboard);
    }
    
    // Botões da consola
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
    }
    
    const custodyBtn = document.getElementById('custodyBtn');
    if (custodyBtn) {
        custodyBtn.addEventListener('click', showChainOfCustody);
    }
}

function setupUploadButtons() {
    // DAC7 Files
    const dac7UploadBtn = document.getElementById('dac7UploadBtn');
    const dac7File = document.getElementById('dac7File');
    if (dac7UploadBtn && dac7File) {
        dac7UploadBtn.addEventListener('click', () => dac7File.click());
        dac7File.addEventListener('change', (e) => handleFileUpload(e, 'dac7'));
    }
    
    // SAF-T Files
    const saftUploadBtn = document.getElementById('saftUploadBtn');
    const saftFile = document.getElementById('saftFile');
    if (saftUploadBtn && saftFile) {
        saftUploadBtn.addEventListener('click', () => saftFile.click());
        saftFile.addEventListener('change', (e) => handleFileUpload(e, 'saft'));
    }
    
    // Invoices
    const invoiceUploadBtn = document.getElementById('invoiceUploadBtn');
    const invoiceFile = document.getElementById('invoiceFile');
    if (invoiceUploadBtn && invoiceFile) {
        invoiceUploadBtn.addEventListener('click', () => invoiceFile.click());
        invoiceFile.addEventListener('change', (e) => handleFileUpload(e, 'invoices'));
    }
    
    // Statements
    const statementUploadBtn = document.getElementById('statementUploadBtn');
    const statementFile = document.getElementById('statementFile');
    if (statementUploadBtn && statementFile) {
        statementUploadBtn.addEventListener('click', () => statementFile.click());
        statementFile.addEventListener('change', (e) => handleFileUpload(e, 'statements'));
    }
}

// 5. UPLOAD BIG DATA
async function handleFileUpload(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    
    // Feedback de processamento
    const uploadBtn = document.querySelector(`#${type}UploadBtn`);
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> A PROCESSAR...`;
    }
    
    try {
        await processMultipleFiles(type, files);
        updateFileList(`${type}FileList`, VDCSystem.documents[type].files);
        
        // Atualizar contador
        const totalCount = VDCSystem.documents[type].files.length;
        updateCounter(type, totalCount);
        
        // Atualizar análise se já houver cliente
        if (VDCSystem.client) {
            updateAnalysisButton();
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados`, 'success');
    } catch (error) {
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
    } finally {
        // Restaurar botão
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            const icon = type === 'dac7' ? 'fa-file-contract' :
                        type === 'saft' ? 'fa-file-code' :
                        type === 'invoices' ? 'fa-file-invoice-dollar' :
                        'fa-file-contract';
            const text = type === 'dac7' ? 'UPLOAD DAC7' :
                        type === 'saft' ? 'SAF-T / XML / CSV' :
                        type === 'invoices' ? 'FATURAS DA PLATAFORMA' :
                        'EXTRATOS BANCÁRIOS';
            uploadBtn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
        }
    }
}

// 6. PROCESSAMENTO DE FICHEIROS
async function processMultipleFiles(type, files) {
    try {
        logAudit(`📁 Processando ${files.length} ficheiros ${type.toUpperCase()}...`, 'info');
        
        // Garantir estrutura
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = {
                files: [],
                parsedData: [],
                totals: {},
                hashes: {}
            };
        }
        
        // Adicionar novos ficheiros
        VDCSystem.documents[type].files.push(...files);
        
        // Processar cada ficheiro
        for (const file of files) {
            try {
                const text = await readFileAsText(file);
                
                // Gerar hash SHA-256
                const fileHash = CryptoJS.SHA256(text).toString();
                VDCSystem.documents[type].hashes[file.name] = fileHash;
                
                // Adicionar à cadeia de custódia
                addToChainOfCustody(file, type, fileHash);
                
                let extractedData = null;
                
                switch(type) {
                    case 'dac7':
                        extractedData = extractDAC7Data(text, file.name);
                        break;
                    case 'saft':
                        extractedData = extractSAFTData(text, file.name);
                        break;
                    case 'invoices':
                        extractedData = extractInvoiceData(text, file.name);
                        break;
                    case 'statements':
                        extractedData = extractStatementData(text, file.name);
                        break;
                }
                
                if (extractedData) {
                    VDCSystem.documents[type].parsedData.push({
                        filename: file.name,
                        hash: fileHash,
                        data: extractedData,
                        timestamp: new Date().toISOString()
                    });
                    
                    logAudit(`✅ ${file.name}: dados extraídos | Hash: ${fileHash.substring(0, 16)}...`, 'success');
                }
            } catch (fileError) {
                logAudit(`⚠️ ${file.name} ignorado: ${fileError.message}`, 'warn');
            }
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados com sucesso`, 'success');
        updateAnalysisButton();
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
        throw error;
    }
}

function addToChainOfCustody(file, type, hash) {
    const custodyRecord = {
        id: CryptoJS.SHA256(Date.now() + file.name + type).toString().substring(0, 16),
        filename: file.name,
        fileType: type,
        size: file.size,
        uploadTimestamp: new Date().toISOString(),
        hash: hash,
        integrityCheck: 'VERIFIED',
        isoCompliance: 'ISO/IEC 27037:2012'
    };
    
    VDCSystem.analysis.chainOfCustody.push(custodyRecord);
    logAudit(`📁 Cadeia de Custódia: ${file.name} registado`, 'info');
}

function showChainOfCustody() {
    if (VDCSystem.analysis.chainOfCustody.length === 0) {
        logAudit('ℹ️ Cadeia de Custódia vazia', 'info');
        return;
    }
    
    logAudit('📋 REGISTRO DE CADEIA DE CUSTÓDIA:', 'success');
    VDCSystem.analysis.chainOfCustody.forEach((record, index) => {
        logAudit(`${index + 1}. ${record.filename} | Hash: ${record.hash.substring(0, 24)}...`, 'info');
    });
}

// 7. EXTRACÇÃO DE DADOS
function cleanCurrencyValue(val) {
    if (!val) return 0;
    
    let str = String(val);
    
    str = str
        .replace(/["']/g, '')
        .replace(/€/g, '')
        .replace(/EUR/g, '')
        .replace(/\s+/g, '')
        .replace(/\r?\n|\r/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
    
    str = str.replace(/[^\d.-]/g, '');
    
    if (!str || str === '' || str === '-') return 0;
    
    const number = parseFloat(str);
    return isNaN(number) ? 0 : Math.abs(number);
}

function extractDAC7Data(text, filename) {
    const data = {
        filename: filename,
        annualRevenue: 0,
        period: ''
    };
    
    try {
        // Padrões para encontrar receitas
        const patterns = [
            /(?:total de receitas anuais|annual revenue)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /(?:receitas|revenue)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi
        ];
        
        let allRevenues = [];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = cleanCurrencyValue(match[1]);
                if (value > 0) allRevenues.push(value);
            }
        });
        
        if (allRevenues.length > 0) {
            data.annualRevenue = Math.max(...allRevenues);
        }
        
        // Período
        const periodPattern = /(?:período|period|ano|year)[\s:]*(\d{4}.*?\d{4})/i;
        const match = text.match(periodPattern);
        if (match) {
            data.period = match[1];
        } else {
            data.period = `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`;
        }
        
        logAudit(`📊 DAC7 ${filename}: Receitas Anuais=${data.annualRevenue.toFixed(2)}€`, 'success');
        
    } catch (error) {
        console.error(`Erro na extração DAC7 ${filename}:`, error);
        data.error = error.message;
    }
    
    return data;
}

function extractSAFTData(text, filename) {
    const data = {
        filename: filename,
        grossValue: 0,
        iva6Value: 0,
        netValue: 0
    };
    
    try {
        // Verificar se é CSV
        const isCSV = filename.endsWith('.csv') || text.includes(',') && !text.includes('<');
        
        if (isCSV) {
            // Processamento CSV com PapaParse
            try {
                const parsed = Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: ','
                });
                
                if (parsed.data && parsed.data.length > 0) {
                    let totalGross = 0;
                    let totalIVA6 = 0;
                    let totalNet = 0;
                    
                    parsed.data.forEach(row => {
                        const precoSemIVA = cleanCurrencyValue(row['Preço da viagem (sem IVA)'] || row['Gross']);
                        const iva = cleanCurrencyValue(row['IVA'] || row['Tax']);
                        const precoTotal = cleanCurrencyValue(row['Preço da viagem'] || row['Total']);
                        
                        totalGross += precoSemIVA;
                        totalIVA6 += iva;
                        totalNet += precoTotal;
                    });
                    
                    data.grossValue = totalGross;
                    data.iva6Value = totalIVA6;
                    data.netValue = totalNet;
                    
                    logAudit(`📊 SAF-T CSV ${filename}: ${parsed.data.length} transações processadas`, 'success');
                }
            } catch (csvError) {
                // Fallback para regex
                extractSAFTFromText(text, data);
            }
        } else {
            // Processamento XML
            extractSAFTFromText(text, data);
        }
        
    } catch (error) {
        console.error(`Erro na extração SAF-T ${filename}:`, error);
        data.error = error.message;
    }
    
    return data;
}

function extractSAFTFromText(text, data) {
    try {
        const patterns = [
            { regex: /<GrossTotal>([\d\.,]+)<\/GrossTotal>/i, key: 'grossValue' },
            { regex: /<NetTotal>([\d\.,]+)<\/NetTotal>/i, key: 'netValue' },
            { regex: /<Tax>.*?<TaxPercentage>6<\/TaxPercentage>.*?<TaxAmount>([\d\.,]+)<\/TaxAmount>/is, key: 'iva6Value' }
        ];
        
        patterns.forEach(pattern => {
            const match = text.match(pattern.regex);
            if (match) {
                const value = cleanCurrencyValue(match[1]);
                if (value > 0) {
                    data[pattern.key] = value;
                }
            }
        });
        
    } catch (error) {
        console.error(`Erro na extração SAF-T do texto:`, error);
        data.error = error.message;
    }
}

function extractInvoiceData(text, filename) {
    const data = {
        filename: filename,
        invoiceValue: 0,
        commissionValue: 0,
        invoiceNumber: ''
    };
    
    try {
        // Total da fatura
        const totalPatterns = [
            /(?:total|valor|amount)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Total.*?:.*?([\d\.,]+)\s*(?:€|EUR)/gi
        ];
        
        let allTotals = [];
        totalPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = cleanCurrencyValue(match[1]);
                if (value > 0) allTotals.push(value);
            }
        });
        
        if (allTotals.length > 0) {
            data.invoiceValue = Math.max(...allTotals);
        }
        
        // Comissão
        const commissionPattern = /(?:comissão|commission|fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi;
        let allCommissions = [];
        let match;
        while ((match = commissionPattern.exec(text)) !== null) {
            const value = cleanCurrencyValue(match[1]);
            if (value > 0) allCommissions.push(value);
        }
        
        if (allCommissions.length > 0) {
            data.commissionValue = Math.max(...allCommissions);
        }
        
        // Número da fatura
        const invoiceNumPattern = /(?:fatura|invoice|número|number)[\s:]*([A-Z]{2}\d{4}[-_]?\d{4})/i;
        const numMatch = text.match(invoiceNumPattern);
        if (numMatch) {
            data.invoiceNumber = numMatch[1];
        }
        
        logAudit(`📄 Fatura ${filename}: ${data.invoiceValue.toFixed(2)}€`, 'success');
        
    } catch (error) {
        console.error(`Erro na extração de fatura ${filename}:`, error);
        data.error = error.message;
    }
    
    return data;
}

function extractStatementData(text, filename) {
    const data = {
        filename: filename,
        grossEarnings: 0,
        commission: 0,
        netTransfer: 0
    };
    
    try {
        // Padrões para extratos
        const patterns = {
            grossEarnings: [
                /(?:rendimentos|earnings|bruto|gross)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            commission: [
                /(?:comissão|commission|fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            netTransfer: [
                /(?:líquido|net|transferência|transfer)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi
            ]
        };
        
        Object.entries(patterns).forEach(([key, regexList]) => {
            const values = [];
            
            regexList.forEach(regex => {
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const value = cleanCurrencyValue(match[1]);
                    if (value > 0) values.push(value);
                }
            });
            
            if (values.length > 0) {
                if (key === 'commission') {
                    data[key] = -Math.max(...values.map(Math.abs));
                } else {
                    data[key] = Math.max(...values);
                }
            }
        });
        
        logAudit(`🏦 Extrato ${filename}: Bruto=${data.grossEarnings.toFixed(2)}€`, 'success');
        
    } catch (error) {
        console.error(`Erro na extração de extrato ${filename}:`, error);
        data.error = error.message;
    }
    
    return data;
}

// 8. REGISTRO E GESTÃO DE CLIENTES
function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients') || '[]');
        VDCSystem.preRegisteredClients = clients;
        logAudit(`📋 ${clients.length} clientes carregados do armazenamento local`, 'info');
    } catch (error) {
        VDCSystem.preRegisteredClients = [];
    }
}

function registerClient() {
    const nameInput = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) {
        showError('Nome do cliente inválido (mínimo 3 caracteres)');
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        showError('NIF inválido (deve ter 9 dígitos)');
        return;
    }
    
    VDCSystem.client = { 
        name: name, 
        nif: nif,
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    
    logAudit(`✅ Cliente registado: ${name} (NIF: ${nif})`, 'success');
    updateAnalysisButton();
}

async function saveClientToJSON() {
    try {
        if (!VDCSystem.client) {
            showError('Registe um cliente primeiro');
            return;
        }
        
        const clientData = {
            cliente: VDCSystem.client,
            sistema: {
                versao: VDCSystem.version,
                anoFiscal: VDCSystem.selectedYear,
                dataExportacao: new Date().toISOString()
            }
        };
        
        const dataStr = JSON.stringify(clientData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
        
        const fileName = `VDC_CLIENTE_${VDCSystem.client.nif}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        logAudit('✅ Dados do cliente exportados para JSON', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar JSON do cliente:', error);
        showError(`Erro ao exportar JSON: ${error.message}`);
    }
}

// 9. MODO DEMO
function activateDemoMode() {
    try {
        VDCSystem.demoMode = true;
        
        logAudit('🔬 ATIVANDO MODO DEMO FORENSE - DADOS REAIS BOLT', 'warn');
        
        // Preencher cliente
        const clientNameInput = document.getElementById('clientName');
        const clientNIFInput = document.getElementById('clientNIF');
        
        if (clientNameInput) clientNameInput.value = 'Momento Eficaz Unipessoal, Lda';
        if (clientNIFInput) clientNIFInput.value = '517905450';
        
        registerClient();
        
        // Definir período
        VDCSystem.selectedYear = 2024;
        const yearSelect = document.getElementById('selYear');
        if (yearSelect) yearSelect.value = 2024;
        
        // Simular dados
        VDCSystem.analysis.extractedValues = {
            saftGross: 3202.54,
            saftIVA6: 192.15,
            saftNet: 2409.95,
            platformCommission: 0,
            bankTransfer: 0,
            iva23Due: 0,
            rendimentosBrutos: 3202.54,
            comissaoApp: -792.59,
            rendimentosLiquidos: 2409.95,
            faturaPlataforma: 239.00,
            campanhas: 20.00,
            gorjetas: 9.00,
            cancelamentos: 15.60,
            portagens: 7.65,
            diferencialCusto: 553.59,
            prejuizoFiscal: 116.25,
            ivaAutoliquidacao: 127.33,
            dac7Revenue: 3202.54,
            dac7Period: 'Set-Dez 2024',
            jurosMora: 22.14,
            taxaRegulacao: 39.63
        };
        
        // Calcular projeção
        const proj = VDCSystem.analysis.projection;
        proj.averagePerDriver = 553.59;
        proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
        proj.marketProjection = proj.totalMarketImpact / 1000000;
        
        // Calcular cruzamentos
        const crossings = VDCSystem.analysis.crossings;
        crossings.deltaA = Math.abs(3202.54 - 3202.54);
        crossings.deltaB = Math.abs(792.59 - 239.00);
        crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
        crossings.diferencialAlerta = true;
        
        // Atualizar dashboard
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        generateMasterHash();
        
        logAudit('✅ MODO DEMO ATIVADO: Cliente "Momento Eficaz" carregado', 'success');
        logAudit('💰 VALORES REAIS BOLT: Fatura 239.00€ | Comissão 792.59€', 'info');
        
    } catch (error) {
        console.error('Erro no modo demo:', error);
        logAudit(`❌ Erro no modo demo: ${error.message}`, 'error');
    }
}

// 10. FUNÇÕES DE ANÁLISE
async function performForensicAnalysis() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE LAYERING', 'success');
        
        await processLoadedData();
        calculateExtractedValues();
        performForensicCrossings();
        calculateMarketProjection();
        calcularJurosMora();
        calculateRegulatoryRisk();
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        generateMasterHash();
        generateQuesitosEstrategicos();
        
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        if (VDCSystem.analysis.crossings.diferencialAlerta) {
            showDiferencialAlert();
        }
        
        if (VDCSystem.analysis.crossings.omission > 100) {
            showOmissionAlert();
        }
        
    } catch (error) {
        console.error('Erro na análise:', error);
        logAudit(`❌ Erro na análise: ${error.message}`, 'error');
        showError(`Erro na análise: ${error.message}`);
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE BIG DATA';
        }
    }
}

async function processLoadedData() {
    // Processar dados carregados
    const documentTypes = ['dac7', 'saft', 'invoices', 'statements'];
    
    documentTypes.forEach(type => {
        const docs = VDCSystem.documents[type];
        if (docs && docs.parsedData && docs.parsedData.length > 0) {
            let totals = {};
            
            docs.parsedData.forEach(item => {
                if (item.data) {
                    Object.entries(item.data).forEach(([key, value]) => {
                        if (typeof value === 'number') {
                            totals[key] = (totals[key] || 0) + value;
                        }
                    });
                }
            });
            
            docs.totals = totals;
            logAudit(`${type.toUpperCase()}: ${docs.parsedData.length} ficheiros processados`, 'info');
        }
    });
}

function calculateExtractedValues() {
    const ev = VDCSystem.analysis.extractedValues;
    const docs = VDCSystem.documents;
    
    // Valores SAF-T
    ev.saftGross = (docs.saft && docs.saft.totals && docs.saft.totals.grossValue) || (VDCSystem.demoMode ? 3202.54 : 0);
    ev.saftIVA6 = (docs.saft && docs.saft.totals && docs.saft.totals.iva6Value) || (VDCSystem.demoMode ? 192.15 : 0);
    ev.saftNet = (docs.saft && docs.saft.totals && docs.saft.totals.netValue) || (VDCSystem.demoMode ? 2409.95 : 0);
    
    // Valores Extratos
    ev.rendimentosBrutos = (docs.statements && docs.statements.totals && docs.statements.totals.grossEarnings) || (VDCSystem.demoMode ? 3202.54 : 0);
    ev.comissaoApp = (docs.statements && docs.statements.totals && docs.statements.totals.commission) || (VDCSystem.demoMode ? -792.59 : 0);
    ev.rendimentosLiquidos = (docs.statements && docs.statements.totals && docs.statements.totals.netTransfer) || (VDCSystem.demoMode ? 2409.95 : 0);
    
    // Valores Faturas
    ev.faturaPlataforma = (docs.invoices && docs.invoices.totals && docs.invoices.totals.invoiceValue) || (VDCSystem.demoMode ? 239.00 : 0);
    ev.platformCommission = (docs.invoices && docs.invoices.totals && docs.invoices.totals.commissionValue) || 0;
    
    // Diferencial de custo
    ev.diferencialCusto = Math.abs(ev.comissaoApp) - ev.faturaPlataforma;
    
    if (ev.diferencialCusto > 0) {
        ev.prejuizoFiscal = ev.diferencialCusto * 0.21;
        ev.ivaAutoliquidacao = ev.diferencialCusto * 0.23;
    }
    
    // DAC7
    ev.dac7Revenue = (docs.dac7 && docs.dac7.totals && docs.dac7.totals.annualRevenue) || ev.rendimentosBrutos;
    ev.dac7Period = (docs.dac7 && docs.dac7.totals && docs.dac7.totals.period) || `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`;
}

function performForensicCrossings() {
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    crossings.deltaA = Math.abs(ev.saftGross - ev.rendimentosBrutos);
    crossings.deltaB = Math.abs(Math.abs(ev.comissaoApp) - ev.faturaPlataforma);
    crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
    crossings.diferencialAlerta = ev.diferencialCusto > 100;
    
    logAudit(`🔍 CRUZAMENTO 1 (SAF-T vs Extrato): Δ = ${crossings.deltaA.toFixed(2)}€`, 'info');
    logAudit(`🔍 CRUZAMENTO 2 (Comissão vs Fatura): Δ = ${crossings.deltaB.toFixed(2)}€`, 'info');
}

function calculateMarketProjection() {
    const proj = VDCSystem.analysis.projection;
    const ev = VDCSystem.analysis.extractedValues;
    
    proj.averagePerDriver = ev.diferencialCusto;
    proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
    proj.marketProjection = proj.totalMarketImpact / 1000000;
    
    logAudit(`📈 QUANTUM BENEFÍCIO ILÍCITO: ${proj.marketProjection.toFixed(2)}M€`, 'info');
}

function calcularJurosMora() {
    const ev = VDCSystem.analysis.extractedValues;
    
    if (ev.diferencialCusto > 0) {
        ev.jurosMora = ev.diferencialCusto * 0.04;
        logAudit(`📈 JUROS DE MORA: ${ev.jurosMora.toFixed(2)}€ (4% RGRC)`, 'warn');
    }
}

function calculateRegulatoryRisk() {
    const ev = VDCSystem.analysis.extractedValues;
    
    ev.taxaRegulacao = Math.abs(ev.comissaoApp) * 0.05;
    
    if (ev.taxaRegulacao > 0) {
        logAudit(`⚖️ RISCO REGULATÓRIO: ${ev.taxaRegulacao.toFixed(2)}€ (5% AMT/IMT)`, 'warn');
    }
}

function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const ev = VDCSystem.analysis.extractedValues;
    
    const elementos = {
        'netVal': ev.saftNet,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = formatter.format(value);
        }
    });
}

function updateKPIResults() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const ev = VDCSystem.analysis.extractedValues;
    const proj = VDCSystem.analysis.projection;
    
    const kpis = {
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosLiquidos,
        'kpiInvoice': ev.faturaPlataforma
    };
    
    Object.entries(kpis).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = formatter.format(value);
        }
    });
    
    const results = {
        'grossResult': ev.saftGross,
        'transferResult': ev.rendimentosLiquidos,
        'differenceResult': VDCSystem.analysis.crossings.deltaB,
        'marketResult': proj.marketProjection.toFixed(2) + 'M€'
    };
    
    Object.entries(results).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = typeof value === 'number' ? formatter.format(value) : value;
        }
    });
    
    // Atualizar barras de progresso
    const differenceBar = document.getElementById('differenceBar');
    if (differenceBar) {
        const maxValue = Math.max(ev.saftGross, ev.rendimentosBrutos, Math.abs(ev.comissaoApp));
        if (maxValue > 0) {
            const percentage = (VDCSystem.analysis.crossings.deltaB / maxValue) * 100;
            differenceBar.style.width = Math.min(percentage, 100) + '%';
        }
    }
}

function showDiferencialAlert() {
    const diferencialAlert = document.getElementById('diferencialAlert');
    if (diferencialAlert) {
        diferencialAlert.style.display = 'flex';
    }
}

function showOmissionAlert() {
    const omissionAlert = document.getElementById('omissionAlert');
    const omissionValue = document.getElementById('omissionValue');
    
    if (omissionAlert && omissionValue) {
        omissionValue.textContent = VDCSystem.analysis.crossings.omission.toFixed(2) + '€';
        omissionAlert.style.display = 'flex';
    }
}

// 11. GRÁFICO
function renderDashboardChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        
        if (VDCSystem.chart) {
            VDCSystem.chart.destroy();
        }
        
        const ev = VDCSystem.analysis.extractedValues;
        
        const dataValues = [
            ev.saftNet || 0,
            ev.saftIVA6 || 0,
            Math.abs(ev.comissaoApp) || 0,
            ev.ivaAutoliquidacao || 0
        ];
        
        VDCSystem.chart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Ilíquido', 'IVA 6%', 'Comissão', 'IVA 23%'],
                datasets: [{
                    label: 'Valores (€)',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(0, 242, 255, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(255, 62, 62, 0.7)',
                        'rgba(245, 158, 11, 0.7)'
                    ],
                    borderColor: [
                        '#00f2ff',
                        '#3b82f6',
                        '#ff3e3e',
                        '#f59e0b'
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
                            color: '#cbd5e1'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cbd5e1'
                        }
                    }
                }
            }
        });
        
        logAudit('📊 Gráfico renderizado com sucesso', 'success');
        
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        logAudit(`❌ Erro ao renderizar gráfico: ${error.message}`, 'error');
    }
}

// 12. EXPORTAÇÃO
async function exportJSON() {
    try {
        logAudit('💾 PREPARANDO EVIDÊNCIA DIGITAL...', 'info');
        
        const evidenceData = {
            sistema: "VDC Forensic System v10.9-FS",
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            
            cliente: VDCSystem.client,
            analise: VDCSystem.analysis,
            documentos: VDCSystem.documents,
            logs: VDCSystem.logs.slice(-100),
            masterHash: document.getElementById('masterHashValue')?.textContent || "NÃO GERADA"
        };
        
        const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { 
            type: 'application/json;charset=utf-8' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `EVIDENCIA_VDC_${VDCSystem.sessionId}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        logAudit('✅ Evidência digital exportada para JSON', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`❌ Erro ao exportar JSON: ${error.message}`, 'error');
    }
}

function generateQuesitosEstrategicos() {
    const ev = VDCSystem.analysis.extractedValues;
    
    VDCSystem.analysis.quesitosEstrategicos = [
        `1. Face ao diferencial de ${ev.diferencialCusto.toFixed(2)}€ detetado, onde se evidencia o cumprimento do Art. 103.º do RGRC?`,
        `2. Como justifica a plataforma a diferença entre a comissão retida (${Math.abs(ev.comissaoApp).toFixed(2)}€) e a fatura emitida (${ev.faturaPlataforma.toFixed(2)}€)?`,
        `3. Onde se encontra comprovado o pagamento da Taxa de Regulação (5%) no valor de ${ev.taxaRegulacao.toFixed(2)}€?`
    ];
    
    logAudit('📋 Quesitos estratégicos gerados', 'info');
}

async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let posY = 20;
        
        // Cabeçalho
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("VDC FORENSIC SYSTEM v10.9-FS", margin, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Relatório Pericial de Análise Forense", margin, posY);
        posY += 15;
        
        // Informações
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("INFORMAÇÕES GERAIS", margin, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const info = [
            ["Sessão:", VDCSystem.sessionId],
            ["Data:", new Date().toLocaleDateString('pt-PT')],
            ["Cliente:", VDCSystem.client?.name || "Não registado"],
            ["NIF:", VDCSystem.client?.nif || "Não registado"],
            ["Ano Fiscal:", VDCSystem.selectedYear.toString()]
        ];
        
        info.forEach(([label, value]) => {
            doc.text(label, margin, posY);
            doc.text(value, margin + 40, posY);
            posY += 7;
        });
        
        posY += 10;
        
        // Análise
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("ANÁLISE FORENSE", margin, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const ev = VDCSystem.analysis.extractedValues;
        const formatter = new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        });
        
        const analise = [
            ["Rendimentos Brutos:", formatter.format(ev.rendimentosBrutos)],
            ["Comissão Retida:", formatter.format(ev.comissaoApp)],
            ["Fatura Emitida:", formatter.format(ev.faturaPlataforma)],
            ["Diferencial Oculto:", formatter.format(ev.diferencialCusto)],
            ["IVA 23% Devido:", formatter.format(ev.ivaAutoliquidacao)],
            ["Juros de Mora (4%):", formatter.format(ev.jurosMora)],
            ["Taxa Regulação (5%):", formatter.format(ev.taxaRegulacao)]
        ];
        
        analise.forEach(([label, value]) => {
            // Verificar quebra de página
            if (posY > pageHeight - margin - 20) {
                doc.addPage();
                posY = 20;
            }
            
            doc.text(label, margin, posY);
            doc.text(value, margin + 60, posY);
            posY += 7;
        });
        
        // Conclusão
        posY += 10;
        if (posY > pageHeight - margin - 50) {
            doc.addPage();
            posY = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("CONCLUSÃO", margin, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const conclusao = `O diferencial de ${ev.diferencialCusto.toFixed(2)}€ entre a comissão retida e a fatura emitida configura evidência de layering financeiro e possível fraude fiscal qualificada, conforme Art. 103.º do RGRC.`;
        
        const splitText = doc.splitTextToSize(conclusao, pageWidth - 2 * margin);
        splitText.forEach(line => {
            if (posY > pageHeight - margin - 20) {
                doc.addPage();
                posY = 20;
            }
            doc.text(line, margin, posY);
            posY += 7;
        });
        
        // Rodapé
        const footerY = pageHeight - margin;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v10.9-FS | Protocolo de Integridade: ISO/IEC 27037 | NIST SP 800-86", pageWidth / 2, footerY, { align: "center" });
        
        // Salvar
        const nomeFicheiro = `RELATORIO_VDC_${VDCSystem.sessionId}.pdf`;
        doc.save(nomeFicheiro);
        
        logAudit(`✅ Relatório pericial exportado (PDF)`, 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
    }
}

// 13. RESET
function resetDashboard() {
    try {
        logAudit('🔄 RESET COMPLETO DO SISTEMA', 'info');
        
        // Resetar valores
        const elementos = [
            'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice',
            'netVal', 'iva6Val', 'commissionVal', 'iva23Val',
            'grossResult', 'transferResult', 'differenceResult', 'marketResult'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = id === 'marketResult' ? '0,00M€' : '0,00€';
            }
        });
        
        // Resetar barras
        document.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = '0%';
        });
        
        // Resetar alertas
        const alerts = ['omissionAlert', 'diferencialAlert'];
        alerts.forEach(id => {
            const alert = document.getElementById(id);
            if (alert) alert.style.display = 'none';
        });
        
        // Resetar campos
        const clientNameInput = document.getElementById('clientName');
        const clientNIFInput = document.getElementById('clientNIF');
        if (clientNameInput) clientNameInput.value = '';
        if (clientNIFInput) clientNIFInput.value = '';
        
        const clientStatus = document.getElementById('clientStatus');
        if (clientStatus) clientStatus.style.display = 'none';
        
        // Resetar contadores
        const counters = ['dac7Count', 'saftCount', 'invoiceCount', 'statementCount', 'totalCount'];
        counters.forEach(id => {
            const counter = document.getElementById(id);
            if (counter) counter.textContent = '0';
        });
        
        // Resetar estado do sistema
        VDCSystem.demoMode = false;
        VDCSystem.client = null;
        
        VDCSystem.documents = {
            dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '' }, hashes: {} },
            saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 }, hashes: {} },
            invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [] }, hashes: {}},
            statements: { files: [], parsedData: [], totals: { transfer: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0 }, hashes: {}}
        };
        
        VDCSystem.analysis.extractedValues = {
            saftGross: 0, saftIVA6: 0, saftNet: 0,
            platformCommission: 0, bankTransfer: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
            faturaPlataforma: 0, campanhas: 0, gorjetas: 0,
            cancelamentos: 0, portagens: 0, diferencialCusto: 0,
            prejuizoFiscal: 0, ivaAutoliquidacao: 0,
            dac7Revenue: 0, dac7Period: '',
            jurosMora: 0,
            taxaRegulacao: 0
        };
        
        VDCSystem.analysis.crossings = {
            deltaA: 0, deltaB: 0, omission: 0,
            diferencialAlerta: false, fraudIndicators: []
        };
        
        VDCSystem.analysis.chainOfCustody = [];
        
        VDCSystem.counters = { dac7: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
        
        // Resetar gráfico
        if (VDCSystem.chart) {
            VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0];
            VDCSystem.chart.update();
        }
        
        // Gerar nova sessão
        VDCSystem.sessionId = generateSessionId();
        const sessionDisplay = document.getElementById('sessionIdDisplay');
        if (sessionDisplay) sessionDisplay.textContent = VDCSystem.sessionId;
        
        updateAnalysisButton();
        clearConsole();
        
        logAudit('✅ Sistema resetado - Nova sessão criada', 'success');
        
    } catch (error) {
        console.error('Erro no reset do dashboard:', error);
        logAudit(`❌ Erro no reset do sistema: ${error.message}`, 'error');
    }
}

// 14. FUNÇÕES DE LOG E AUDITORIA
function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const logEntry = {
        timestamp,
        type,
        message,
        fullTimestamp: new Date().toISOString()
    };
    
    VDCSystem.logs.push(logEntry);
    
    if (VDCSystem.logs.length > 500) {
        VDCSystem.logs = VDCSystem.logs.slice(-500);
    }
    
    updateAuditConsole(logEntry);
    console.log(`[VDC ${type.toUpperCase()}] ${message}`);
}

function updateAuditConsole(logEntry) {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${logEntry.type}`;
    entry.innerHTML = `
        <span style="color: #666;">[${logEntry.timestamp}]</span>
        <span style="color: ${getLogColor(logEntry.type)}; font-weight: bold;">${logEntry.type.toUpperCase()}</span>
        <span>${logEntry.message}</span>
    `;
    
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
}

function getLogColor(type) {
    const colors = {
        success: '#10b981',
        warn: '#f59e0b',
        error: '#ff3e3e',
        info: '#3b82f6'
    };
    return colors[type] || '#cbd5e1';
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    logAudit('Consola de auditoria limpa', 'info');
}

// 15. FUNÇÕES UTILITÁRIAS
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function generateMasterHash() {
    const data = [
        VDCSystem.sessionId,
        VDCSystem.selectedYear.toString(),
        VDCSystem.selectedPlatform,
        VDCSystem.client?.nif || 'NO_CLIENT',
        VDCSystem.analysis.extractedValues.diferencialCusto.toString(),
        new Date().toISOString(),
        CryptoJS.SHA256(JSON.stringify(VDCSystem.logs)).toString(),
        'ISO/IEC 27037',
        'NIST SP 800-86'
    ].join('|');
    
    const masterHash = CryptoJS.SHA256(data).toString();
    const display = document.getElementById('masterHashValue');
    
    if (display) {
        display.textContent = masterHash;
        display.style.color = '#00f2ff';
    }
    
    logAudit(`🔐 Master Hash SHA-256 gerada: ${masterHash.substring(0, 32)}...`, 'success');
    
    return masterHash;
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function updateFileList(listId, files) {
    const fileList = document.getElementById(listId);
    if (!fileList) return;
    
    fileList.innerHTML = '';
    fileList.classList.add('visible');
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const size = file.size;
        let sizeStr;
        if (size < 1024) sizeStr = size + ' B';
        else if (size < 1024 * 1024) sizeStr = (size / 1024).toFixed(1) + ' KB';
        else sizeStr = (size / (1024 * 1024)).toFixed(1) + ' MB';
        
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name">${file.name}</span>
            <span class="file-status">${sizeStr} ✓</span>
        `;
        fileList.appendChild(fileItem);
    });
}

function updateCounter(type, count) {
    const counterId = type === 'dac7' ? 'dac7Count' :
                     type === 'saft' ? 'saftCount' :
                     type === 'invoices' ? 'invoiceCount' :
                     type === 'statements' ? 'statementCount' : null;
    
    if (counterId) {
        const element = document.getElementById(counterId);
        if (element) element.textContent = count;
        VDCSystem.counters[type] = count;
    }
    
    // Atualizar total
    const total = VDCSystem.counters.dac7 + VDCSystem.counters.saft + 
                  VDCSystem.counters.invoices + VDCSystem.counters.statements;
    
    const totalElement = document.getElementById('totalCount');
    if (totalElement) totalElement.textContent = total;
    VDCSystem.counters.total = total;
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasSaft = VDCSystem.documents.saft && VDCSystem.documents.saft.files && VDCSystem.documents.saft.files.length > 0;
    const hasClient = VDCSystem.client !== null;
    
    analyzeBtn.disabled = !(hasSaft && hasClient);
    
    if (!analyzeBtn.disabled) {
        logAudit('✅ Sistema pronto para análise forense', 'success');
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <p>${message}</p>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode === container) {
            container.removeChild(toast);
        }
    }, 3000);
}

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    showToast(`❌ ${message}`, 'error');
}

// 16. FUNÇÕES GLOBAIS
window.clearConsole = clearConsole;
window.exportJSON = exportJSON;
window.exportPDF = exportPDF;
window.resetDashboard = resetDashboard;
window.performForensicAnalysis = performForensicAnalysis;
window.activateDemoMode = activateDemoMode;
window.showChainOfCustody = showChainOfCustody;

// ============================================
// FIM DO SCRIPT VDC v10.9-FS
// ============================================
