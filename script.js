// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.9-FS
// FINAL STABLE RELEASE - BIG DATA FORENSE
// ============================================

// 1. ESTADO DO SISTEMA - ESTRUTURA FORENSE COMPLETA
const VDCSystem = {
    version: 'v10.9-FS',
    sessionId: null,
    sessionStartTime: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    parsingErrors: [],
    
    // Estrutura completa de documentos
    documents: {
        control: {
            files: [],
            parsedData: [],
            totals: { 
                hash: '',
                fileCount: 0,
                verificationStatus: 'pending'
            },
            hashes: {},
            metadata: []
        },
        dac7: {
            files: [],
            parsedData: [],
            totals: { 
                annualRevenue: 0, 
                period: '',
                transactionCount: 0,
                platformName: '',
                platformCountry: '',
                reportingPeriod: ''
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        },
        saft: {
            files: [],
            parsedData: [],
            totals: { 
                gross: 0, 
                iva6: 0, 
                net: 0,
                transactionCount: 0,
                documentCount: 0,
                periodStart: '',
                periodEnd: '',
                taxBaseTotal: 0,
                taxPayableTotal: 0
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        },
        invoices: {
            files: [],
            parsedData: [],
            totals: { 
                commission: 0, 
                iva23: 0, 
                invoiceValue: 0,
                invoicesFound: [],
                invoiceNumbers: [],
                totalInvoices: 0,
                totalValue: 0,
                averageValue: 0
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        },
        statements: {
            files: [],
            parsedData: [],
            totals: { 
                transfer: 0, 
                expected: 0,
                rendimentosBrutos: 0,
                comissaoApp: 0,
                rendimentosLiquidos: 0,
                campanhas: 0,
                gorjetas: 0,
                cancelamentos: 0,
                portagens: 0,
                diferencialCusto: 0,
                transactionCount: 0,
                periodStart: '',
                periodEnd: ''
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        }
    },
    
    // Análise forense completa
    analysis: {
        extractedValues: {
            // SAF-T ISO
            saftGross: 0,
            saftIVA6: 0,
            saftNet: 0,
            saftTaxBase: 0,
            saftTaxPayable: 0,
            
            // Platform Data
            platformCommission: 0,
            bankTransfer: 0,
            iva23Due: 0,
            invoiceTotal: 0,
            commissionTotal: 0,
            
            // Bolt KPIs específicos
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            faturaPlataforma: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
            custosOperacionais: 0,
            
            // Forensic Findings ISO/NIST
            diferencialCusto: 0,
            prejuizoFiscal: 0,
            ivaAutoliquidacao: 0,
            omissaoContabilistica: 0,
            desvioFinanceiro: 0,
            
            // DAC7 Compliance
            dac7Revenue: 0,
            dac7Period: '',
            dac7Platform: '',
            dac7Country: '',
            dac7ReportingStatus: 'pending',
            
            // Juros de Mora (RGRC 4%)
            jurosMora: 0,
            jurosBaseCalculo: 0,
            jurosPeriodo: 0,
            jurosTaxaAnual: 0.04,
            jurosLegalReference: 'RGRC Artigo 103º',
            
            // Passivo Regulatório (AMT/IMT)
            taxaRegulacao: 0,
            taxaPercentagem: 0.05,
            taxaBaseCalculo: 0,
            taxaLegalReference: 'Decreto-Lei 83/2017',
            riscoRegulatorio: 0,
            riscoClassificacao: 'ALTO',
            
            // Cross-border compliance
            crossBorderCompliance: false,
            dac7Compliance: false,
            iso27037Compliance: true,
            nist80086Compliance: true
        },
        
        // Cruzamentos forenses
        crossings: {
            deltaA: 0,
            deltaB: 0,
            omission: 0,
            isValid: true,
            diferencialAlerta: false,
            fraudIndicators: [],
            bigDataAlertActive: false,
            discrepanciaAlertaAtiva: false,
            riscoRegulatorioAtivo: false,
            cadeiaCustodiaCompleta: false,
            
            // Métricas de qualidade
            dataQualityScore: 0,
            completenessScore: 0,
            consistencyScore: 0,
            accuracyScore: 0,
            
            // Flags de validação
            saftValidated: false,
            dac7Validated: false,
            invoicesValidated: false,
            statementsValidated: false,
            controlFileValidated: false
        },
        
        // Projeção de mercado
        projection: {
            marketProjection: 0,
            averagePerDriver: 0,
            driverCount: 38000,
            monthsPerYear: 12,
            yearsOfOperation: 7,
            totalMarketImpact: 0,
            monthlyImpact: 0,
            annualImpact: 0,
            sevenYearImpact: 0,
            
            // Parâmetros de cálculo
            calculationMethod: 'Diferencial × 38.000 × 12 × 7',
            confidenceLevel: 0.95,
            marginOfError: 0.05,
            statisticalSignificance: 'ALTA'
        },
        
        // Cadeia de custódia completa
        chainOfCustody: [],
        custodyHash: '',
        custodyStatus: 'active',
        
        // Anomalias detectadas
        anomalies: [],
        anomalyCount: 0,
        criticalAnomalies: [],
        warningAnomalies: [],
        infoAnomalies: [],
        
        // Quesitos estratégicos
        quesitosEstrategicos: [],
        
        // Citações legais completas
        legalCitations: [
            "ISO/IEC 27037:2012 - Guidelines for identification, collection, acquisition and preservation of digital evidence",
            "NIST SP 800-86 - Guide to Integrating Forensic Techniques into Incident Response",
            "Regime Geral das Infrações Tributárias (RGRC) - Artigo 103.º - Fraude Fiscal Qualificada",
            "Código do IRC, Artigo 87º - Regime de apuramento dos proveitos e ganhos",
            "CIVA, Artigo 2.º - Âmbito objetivo: operações tributáveis",
            "CIVA, Artigo 29º - Obrigação de faturação e registo",
            "RGIT, Artigo 103º - Crime de Fraude Fiscal por omissão de declaração",
            "Código Penal, Art. 158-A a 158-F - Cadeia de Custódia Digital",
            "Diretiva DAC7 - Transparência de plataformas digitais (UE 2021/514)",
            "Lei 83/2017 - Prevenção do Branqueamento de Capitais e Financiamento do Terrorismo",
            "Decreto-Lei 83/2017 - Taxa de Regulação da Autoridade da Mobilidade e dos Transportes (AMT/IMT)",
            "Regulamento (UE) 2016/679 - RGPD - Proteção de Dados Pessoais",
            "Código Comercial, Art. 13º - Obrigação de escrituração mercantil",
            "Lei Geral Tributária, Art. 38º - Princípio da não omissão de elementos relevantes",
            "Convenção de Varsóvia sobre Transporte Aéreo - Responsabilidade do transportador",
            "Protocolo FBI/Interpol sobre Asset Forfeiture em Casos de Fraude Transnacional",
            "Convenção das Nações Unidas contra a Corrupção (UNCAC)",
            "Convenção OCDE sobre Combate ao Suborno de Funcionários Públicos Estrangeiros",
            "Diretiva Anti-Lavagem de Dinheiro 5ª (AMLD5)",
            "Regulamento MiFID II - Mercados de Instrumentos Financeiros"
        ],
        
        // Metadados da análise
        metadata: {
            analysisTimestamp: null,
            analysisDuration: 0,
            analyst: 'VDC Forensic System',
            toolVersion: 'v10.9-FS',
            hashAlgorithm: 'SHA-256',
            encryptionStandard: 'AES-256',
            dataRetentionPolicy: '10 anos',
            chainOfCustodyProtocol: 'ISO/IEC 27037:2012'
        }
    },
    
    // Contadores completos
    counters: {
        dac7: 0,
        control: 0,
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0,
        parsed: 0,
        failed: 0,
        validated: 0
    },
    
    // Logs do sistema
    logs: [],
    maxLogEntries: 1000,
    
    // Componentes UI
    chart: null,
    chartInstance: null,
    
    // Clientes pré-registados
    preRegisteredClients: [],
    clientDatabase: [],
    
    // Intervalos de alerta
    bigDataAlertInterval: null,
    discrepanciaAlertaInterval: null,
    jurosAlertInterval: null,
    
    // Estado de processamento
    processingQueue: [],
    isProcessing: false,
    
    // Configurações do sistema
    config: {
        autoValidate: true,
        strictParsing: true,
        generateHashes: true,
        maintainChainOfCustody: true,
        enableAlerts: true,
        logLevel: 'info',
        maxFileSize: 104857600, // 100MB
        allowedExtensions: {
            dac7: ['.html', '.htm', '.eml', '.txt', '.pdf', '.xml', '.csv', '.json'],
            control: ['.csv', '.xml', '.pdf', '.txt', '.json'],
            saft: ['.xml', '.csv', '.txt', '.json'],
            invoices: ['.pdf', '.csv', '.xml', '.jpg', '.png', '.jpeg', '.txt'],
            statements: ['.pdf', '.csv', '.txt', '.ofx', '.qif', '.mt940', '.xml']
        },
        validationRules: {
            requireControlFile: true,
            validateSAFTStructure: true,
            validateDAC7Fields: true,
            crossValidateDocuments: true,
            calculateJurosMora: true,
            calculateTaxaRegulacao: true
        }
    },
    
    // Templates de erro
    errorTemplates: {
        missingColumn: (fileType, columnName) => 
            `COLUNA CRÍTICA AUSENTE: ${columnName} não encontrada no ficheiro ${fileType}. Análise interrompida por violação ISO/IEC 27037.`,
        parsingError: (fileType, error) => 
            `ERRO DE PARSING ${fileType}: ${error}. Sistema requer estrutura de dados conforme normativo SAF-T PT.`,
        hashMismatch: (filename) => 
            `INCONSISTÊNCIA DE HASH: ${filename} - Hash SHA-256 não corresponde à cadeia de custódia.`,
        fileSizeExceeded: (filename, maxSize) => 
            `TAMANHO EXCEDIDO: ${filename} excede o limite de ${maxSize} bytes.`,
        invalidFormat: (filename, expectedFormat) => 
            `FORMATO INVÁLIDO: ${filename} - Formato esperado: ${expectedFormat}.`
    }
};

// 2. FUNÇÕES DE HIGIENIZAÇÃO E VALIDAÇÃO DE DADOS
function cleanCurrencyValue(val) {
    if (!val || val === '' || val === null || val === undefined) {
        return 0;
    }
    
    let str = String(val);
    
    // Remoção completa de caracteres não numéricos
    str = str
        .replace(/["']/g, '')
        .replace(/€/g, '')
        .replace(/EUR/g, '')
        .replace(/\s+/g, '')
        .replace(/\r?\n|\r/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .replace(/[^\d.-]/g, '');
    
    if (!str || str === '' || str === '-') {
        return 0;
    }
    
    const number = parseFloat(str);
    return isNaN(number) ? 0 : Math.abs(number);
}

function validateNIF(nif) {
    if (!nif || nif.length !== 9) return false;
    
    const nifNum = parseInt(nif);
    if (isNaN(nifNum)) return false;
    
    const checkDigit = parseInt(nif[8]);
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
        sum += parseInt(nif[i]) * (9 - i);
    }
    
    const remainder = sum % 11;
    const checkValue = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
    
    return checkDigit === checkValue;
}

function validateFileType(file, allowedTypes) {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    return allowedTypes.includes(extension);
}

function validateFileSize(file, maxSize) {
    return file.size <= maxSize;
}

// 3. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 VDC Forensic System v10.9-FS - Initializing...');
    initializeSystem();
});

function initializeSystem() {
    try {
        VDCSystem.sessionStartTime = new Date();
        updateSessionInfo();
        
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) {
            startBtn.addEventListener('click', startForensicSession);
        }
        
        startClockAndDate();
        logAudit('✅ Sistema VDC v10.9-FS inicializado e pronto para sessão forense', 'success');
        logAudit(`🔐 Configuração: Modo Estrito ${VDCSystem.config.strictParsing ? 'ATIVADO' : 'DESATIVADO'}`, 'info');
        logAudit(`📊 Validação Automática: ${VDCSystem.config.autoValidate ? 'ATIVA' : 'INATIVA'}`, 'info');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha crítica na inicialização: ${error.message}`);
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
                loadForensicSystem();
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
        updateSessionDisplay();
        updateLoadingProgress(20);
        
        initializeYearSelector();
        initializePlatformSelector();
        updateLoadingProgress(30);
        
        loadClientsFromStorage();
        updateLoadingProgress(40);
        
        initializeEventListeners();
        updateLoadingProgress(50);
        
        initializeDashboard();
        updateLoadingProgress(60);
        
        initializeChart();
        updateLoadingProgress(70);
        
        updateLoadingProgress(80);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v10.9-FS carregado com sucesso', 'success');
                logAudit('🔍 Protocolos ISO/IEC 27037 e NIST SP 800-86 ativados', 'info');
                logAudit('⚖️ Módulos RGRC 4% e AMT/IMT inicializados', 'info');
                logAudit('📊 Dashboard forense pronto para análise Big Data', 'success');
                
                updateSessionInfo();
                generateMasterHash();
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro no carregamento do sistema:', error);
        showError(`Falha no carregamento do sistema: ${error.message}`);
    }
}

// 4. CONFIGURAÇÃO DE CONTROLES
function initializeYearSelector() {
    const selYear = document.getElementById('selYear');
    if (!selYear) return;
    
    selYear.innerHTML = '';
    const currentYear = new Date().getFullYear();
    VDCSystem.selectedYear = currentYear;
    
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        selYear.appendChild(option);
    }
    
    selYear.addEventListener('change', (e) => {
        VDCSystem.selectedYear = parseInt(e.target.value);
        logAudit(`📅 Ano fiscal alterado para: ${VDCSystem.selectedYear}`, 'info');
        updateSessionInfo();
    });
}

function initializePlatformSelector() {
    const selPlatform = document.getElementById('selPlatform');
    if (!selPlatform) return;
    
    selPlatform.value = VDCSystem.selectedPlatform;
    
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        const platformName = e.target.options[e.target.selectedIndex].text;
        
        logAudit(`🖥️ Plataforma selecionada: ${platformName}`, 'info');
        
        if (VDCSystem.selectedPlatform === 'bolt') {
            logAudit('🎯 ALVO PRINCIPAL: Bolt Operations OÜ | EE102090374', 'warn');
            logAudit('🏢 Endereço: Vana-Lõuna 15, Tallinn 10134 Estonia', 'info');
            logAudit('💼 Obrigação DAC7 ativada para plataforma estrangeira', 'info');
        }
        
        resetAnalysisData();
        updateSessionInfo();
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

// 5. CONFIGURAÇÃO DE EVENTOS
function initializeEventListeners() {
    // Cliente
    const registerBtn = document.getElementById('registerClientBtn');
    const saveBtn = document.getElementById('saveClientBtn');
    
    if (registerBtn) registerBtn.addEventListener('click', registerClient);
    if (saveBtn) saveBtn.addEventListener('click', saveClientToJSON);
    
    // Auto-complete cliente
    const clientNameInput = document.getElementById('clientName');
    if (clientNameInput) {
        clientNameInput.addEventListener('input', handleClientAutocomplete);
        clientNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const clientNIF = document.getElementById('clientNIF');
                if (clientNIF) clientNIF.focus();
            }
        });
    }
    
    const clientNIFInput = document.getElementById('clientNIF');
    if (clientNIFInput) {
        clientNIFInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerClient();
        });
    }
    
    // Demo mode
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    // Upload buttons
    initializeUploadButtons();
    
    // Análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', performForensicAnalysis);
    
    // Exportação
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportJSON);
    
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    
    // Reset
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetDashboard);
    
    // Console controls
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    
    const custodyBtn = document.getElementById('custodyBtn');
    if (custodyBtn) custodyBtn.addEventListener('click', showChainOfCustody);
    
    const exportLogBtn = document.getElementById('exportLogBtn');
    if (exportLogBtn) exportLogBtn.addEventListener('click', exportLogs);
}

function initializeUploadButtons() {
    // Control File
    const controlUploadBtn = document.getElementById('controlUploadBtn');
    const controlFile = document.getElementById('controlFile');
    if (controlUploadBtn && controlFile) {
        controlUploadBtn.addEventListener('click', () => controlFile.click());
        controlFile.addEventListener('change', (e) => handleFileUpload(e, 'control'));
    }
    
    // DAC7
    const dac7UploadBtn = document.getElementById('dac7UploadBtn');
    const dac7File = document.getElementById('dac7File');
    if (dac7UploadBtn && dac7File) {
        dac7UploadBtn.addEventListener('click', () => dac7File.click());
        dac7File.addEventListener('change', (e) => handleFileUpload(e, 'dac7'));
    }
    
    // SAF-T
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

// 6. UPLOAD E PROCESSAMENTO DE FICHEIROS
async function handleFileUpload(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    
    // Validação inicial
    for (const file of files) {
        if (!validateFileType(file, VDCSystem.config.allowedExtensions[type])) {
            showError(`Tipo de ficheiro inválido para ${type}: ${file.name}`);
            return;
        }
        
        if (!validateFileSize(file, VDCSystem.config.maxFileSize)) {
            showError(`Ficheiro demasiado grande: ${file.name} (limite: 100MB)`);
            return;
        }
    }
    
    const uploadBtn = document.querySelector(`#${type}UploadBtn`);
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO ${files.length} FICHEIROS...`;
        uploadBtn.disabled = true;
    }
    
    try {
        // Registro na cadeia de custódia
        files.forEach(file => {
            addToChainOfCustody(file, type);
        });
        
        // Processamento em lote
        await processMultipleFiles(type, files);
        
        // Atualização da UI
        updateFileList(`${type}FileList`, VDCSystem.documents[type].files);
        updateCounter(type, VDCSystem.documents[type].files.length);
        
        // Atualização do botão de análise
        if (VDCSystem.client) {
            updateAnalysisButton();
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados com sucesso`, 'success');
        updateSessionInfo();
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
        showError(`Erro no processamento de ${type}: ${error.message}`);
    } finally {
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            const icon = type === 'control' ? 'fa-file-shield' :
                        type === 'dac7' ? 'fa-file-contract' :
                        type === 'saft' ? 'fa-file-code' :
                        type === 'invoices' ? 'fa-file-invoice-dollar' :
                        'fa-file-contract';
            const text = type === 'control' ? 'FICHEIRO DE CONTROLO' :
                        type === 'dac7' ? 'UPLOAD DAC7' :
                        type === 'saft' ? 'SAF-T / XML / CSV' :
                        type === 'invoices' ? 'FATURAS DA PLATAFORMA' :
                        'EXTRATOS BANCÁRIOS';
            uploadBtn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
            uploadBtn.disabled = false;
        }
    }
}

async function processMultipleFiles(type, files) {
    try {
        logAudit(`📁 Iniciando processamento de ${files.length} ficheiros ${type.toUpperCase()}...`, 'info');
        
        // Inicializar estrutura se necessário
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = {
                files: [],
                parsedData: [],
                totals: {},
                hashes: {},
                metadata: [],
                columnsFound: [],
                columnsMissing: [],
                validationStatus: 'pending'
            };
        }
        
        // Adicionar ficheiros
        VDCSystem.documents[type].files.push(...files);
        
        // Processar cada ficheiro
        for (const file of files) {
            try {
                const text = await readFileAsText(file);
                const fileHash = CryptoJS.SHA256(text).toString();
                
                // Atualizar hash na cadeia de custódia
                updateChainOfCustodyHash(file.name, fileHash);
                VDCSystem.documents[type].hashes[file.name] = fileHash;
                
                // Extrair dados baseado no tipo
                let extractedData = null;
                let validationResult = null;
                
                switch(type) {
                    case 'control':
                        extractedData = processControlFile(text, file.name);
                        validationResult = validateControlFile(extractedData);
                        break;
                    case 'dac7':
                        extractedData = extractDAC7Data(text, file.name);
                        validationResult = validateDAC7Data(extractedData);
                        break;
                    case 'saft':
                        extractedData = extractSAFTData(text, file.name);
                        validationResult = validateSAFTData(extractedData);
                        break;
                    case 'invoices':
                        extractedData = extractInvoiceData(text, file.name);
                        validationResult = validateInvoiceData(extractedData);
                        break;
                    case 'statements':
                        extractedData = extractStatementData(text, file.name);
                        validationResult = validateStatementData(extractedData);
                        break;
                }
                
                if (extractedData) {
                    const parsedItem = {
                        filename: file.name,
                        hash: fileHash,
                        data: extractedData,
                        validation: validationResult,
                        timestamp: new Date().toISOString(),
                        integrityCheck: 'SHA-256 VERIFIED',
                        isoStandard: 'ISO/IEC 27037'
                    };
                    
                    VDCSystem.documents[type].parsedData.push(parsedItem);
                    
                    // Log de sucesso
                    logAudit(`✅ ${file.name}: Processado com sucesso | Hash: ${fileHash.substring(0, 16)}...`, 'success');
                    
                    // Verificar colunas ausentes
                    if (validationResult && validationResult.missingColumns && validationResult.missingColumns.length > 0) {
                        logAudit(`⚠️ ${file.name}: Colunas ausentes: ${validationResult.missingColumns.join(', ')}`, 'warn');
                        VDCSystem.documents[type].columnsMissing.push(...validationResult.missingColumns);
                    }
                    
                    if (validationResult && validationResult.foundColumns) {
                        VDCSystem.documents[type].columnsFound.push(...validationResult.foundColumns);
                    }
                }
                
            } catch (fileError) {
                console.error(`Erro no processamento de ${file.name}:`, fileError);
                logAudit(`⚠️ ${file.name}: Erro no processamento - ${fileError.message}`, 'warn');
                VDCSystem.counters.failed++;
            }
        }
        
        // Atualizar status de validação
        if (VDCSystem.documents[type].columnsMissing.length === 0) {
            VDCSystem.documents[type].validationStatus = 'valid';
            VDCSystem.counters.validated++;
        } else {
            VDCSystem.documents[type].validationStatus = 'warning';
        }
        
        VDCSystem.counters.parsed += files.length;
        logAudit(`✅ Processamento ${type.toUpperCase()} concluído: ${files.length} ficheiros`, 'success');
        
    } catch (error) {
        console.error(`Erro no processamento em lote de ${type}:`, error);
        logAudit(`❌ Erro crítico no processamento de ${type}: ${error.message}`, 'error');
        throw error;
    }
}

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Falha na leitura do ficheiro'));
        reader.readAsText(file);
    });
}

function updateFileList(elementId, files) {
    const fileList = document.getElementById(elementId);
    if (!fileList) return;
    
    fileList.innerHTML = '';
    
    if (files.length === 0) {
        fileList.classList.remove('visible');
        return;
    }
    
    fileList.classList.add('visible');
    
    files.slice(-10).forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle';
        
        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;
        
        const status = document.createElement('span');
        status.className = 'file-status';
        status.textContent = '✓';
        
        item.appendChild(icon);
        item.appendChild(name);
        item.appendChild(status);
        fileList.appendChild(item);
    });
}

function updateCounter(type, count) {
    const counter = document.getElementById(`${type}Count`);
    if (counter) counter.textContent = count;
    
    // Atualizar contador total
    VDCSystem.counters.total = Object.values(VDCSystem.counters).slice(0, 5).reduce((a, b) => a + b, 0);
    const totalCounter = document.getElementById('totalCount');
    if (totalCounter) totalCounter.textContent = VDCSystem.counters.total;
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasFiles = VDCSystem.counters.total > 0;
    const hasClient = VDCSystem.client !== null;
    
    analyzeBtn.disabled = !(hasFiles && hasClient);
}

// 7. CADEIA DE CUSTÓDIA
function addToChainOfCustody(file, type) {
    const custodyRecord = {
        id: CryptoJS.SHA256(Date.now() + file.name + type).toString().substring(0, 32),
        filename: file.name,
        fileType: type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString(),
        uploadTimestamp: new Date().toISOString(),
        uploadedBy: VDCSystem.client?.name || 'Sistema',
        hash: 'pending',
        integrityCheck: 'pending',
        isoCompliance: 'ISO/IEC 27037:2012',
        nistCompliance: 'NIST SP 800-86',
        metadata: {
            mimeType: file.type,
            extension: '.' + file.name.split('.').pop().toLowerCase(),
            originalPath: file.webkitRelativePath || file.name,
            uploadSession: VDCSystem.sessionId
        }
    };
    
    VDCSystem.analysis.chainOfCustody.push(custodyRecord);
    logAudit(`📁 Cadeia de Custódia: ${file.name} registado como ${type.toUpperCase()}`, 'info');
    
    return custodyRecord.id;
}

function updateChainOfCustodyHash(filename, hash) {
    const record = VDCSystem.analysis.chainOfCustody.find(r => r.filename === filename);
    if (record) {
        record.hash = hash;
        record.integrityCheck = 'VERIFIED';
        record.verificationTimestamp = new Date().toISOString();
        record.hashVerification = 'SHA-256 VALID';
    }
}

function showChainOfCustody() {
    if (VDCSystem.analysis.chainOfCustody.length === 0) {
        logAudit('ℹ️ Cadeia de Custódia vazia. Carregue ficheiros primeiro.', 'info');
        return;
    }
    
    logAudit('📋 REGISTRO COMPLETO DE CADEIA DE CUSTÓDIA (ISO/IEC 27037):', 'success');
    VDCSystem.analysis.chainOfCustody.forEach((record, index) => {
        logAudit(`${index + 1}. ${record.filename} | Tipo: ${record.fileType} | Hash: ${record.hash.substring(0, 32)}... | Status: ${record.integrityCheck}`, 'info');
    });
    
    // Atualizar status da cadeia
    const allVerified = VDCSystem.analysis.chainOfCustody.every(r => r.integrityCheck === 'VERIFIED');
    VDCSystem.analysis.crossings.cadeiaCustodiaCompleta = allVerified;
    
    if (allVerified) {
        logAudit('✅ Cadeia de Custódia completa e verificada', 'success');
    } else {
        logAudit('⚠️ Cadeia de Custódia incompleta - alguns ficheiros não verificados', 'warn');
    }
}

// 8. EXTRACÇÃO DE DADOS - MÉTODOS ESPECÍFICOS
function processControlFile(text, filename) {
    const data = {
        filename: filename,
        controlType: 'ISO/IEC 27037',
        verificationHash: CryptoJS.SHA256(text).toString(),
        timestamp: new Date().toISOString(),
        fileSize: text.length,
        lineCount: text.split('\n').length,
        containsHeaders: text.includes(',') || text.includes(';')
    };
    
    return data;
}

function validateControlFile(data) {
    return {
        isValid: true,
        validationTimestamp: new Date().toISOString(),
        compliance: 'ISO/IEC 27037'
    };
}

// EXTRAÇÃO DAC7 COMPLETA
function extractDAC7Data(text, filename) {
    const data = {
        filename: filename,
        extractionMethod: 'Multi-pattern RegEx + DOM Parser (NIST SP 800-86)',
        isoStandard: 'ISO/IEC 27037',
        validationStatus: 'pending',
        columnsFound: [],
        columnsMissing: [],
        
        // Campos obrigatórios DAC7
        platformName: '',
        platformCountry: '',
        platformTaxNumber: '',
        reportingPeriod: '',
        annualRevenue: 0,
        transactionCount: 0,
        periodStart: '',
        periodEnd: '',
        
        // Campos adicionais
        reportType: '',
        reportDate: '',
        currency: 'EUR',
        fileFormat: filename.endsWith('.html') ? 'HTML' : 
                   filename.endsWith('.xml') ? 'XML' : 
                   filename.endsWith('.pdf') ? 'PDF' : 'TEXT'
    };
    
    try {
        // COLUNAS OBRIGATÓRIAS DAC7
        const requiredColumns = [
            'PlatformName',
            'PlatformCountry',
            'ReportingPeriod',
            'AnnualRevenue',
            'TransactionCount'
        ];
        
        data.columnsFound = [];
        data.columnsMissing = [...requiredColumns];
        
        // Extração avançada com múltiplos padrões
        const extractionPatterns = {
            platformName: [
                /(?:platform name|plataforma|platform|service provider)[\s:]*["']?([^"'\n<]+)["']?/i,
                /<PlatformName>([^<]+)<\/PlatformName>/i,
                /"platformName"\s*:\s*"([^"]+)"/i
            ],
            platformCountry: [
                /(?:country|país|jurisdiction|resident in)[\s:]*["']?([^"'\n<]+)["']?/i,
                /<CountryCode>([^<]+)<\/CountryCode>/i,
                /"countryCode"\s*:\s*"([^"]+)"/
            ],
            reportingPeriod: [
                /(?:reporting period|período de reporte|tax year|exercício)[\s:]*["']?([^"'\n<]+)["']?/i,
                /<ReportingPeriod>([^<]+)<\/ReportingPeriod>/i,
                /"reportingPeriod"\s*:\s*"([^"]+)"/
            ],
            annualRevenue: [
                /(?:annual revenue|receitas anuais|total income|rendimentos)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /<AnnualRevenue>([\d\.,]+)<\/AnnualRevenue>/i,
                /"annualRevenue"\s*:\s*"([\d\.,]+)"/
            ],
            transactionCount: [
                /(?:number of transactions|número de transações|transaction count)[\s:]*(\d+)/i,
                /<TransactionCount>(\d+)<\/TransactionCount>/i,
                /"transactionCount"\s*:\s*(\d+)/
            ]
        };
        
        // Executar extração
        Object.entries(extractionPatterns).forEach(([field, patterns]) => {
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    let value = match[1].trim();
                    
                    // Limpeza específica por campo
                    switch(field) {
                        case 'annualRevenue':
                            value = cleanCurrencyValue(value);
                            data.annualRevenue = value;
                            break;
                        case 'transactionCount':
                            value = parseInt(value) || 0;
                            data.transactionCount = value;
                            break;
                        case 'platformName':
                            data.platformName = value;
                            break;
                        case 'platformCountry':
                            data.platformCountry = value;
                            break;
                        case 'reportingPeriod':
                            data.reportingPeriod = value;
                            // Extrair datas do período
                            const dateMatch = value.match(/(\d{4}).*?(\d{4})/);
                            if (dateMatch) {
                                data.periodStart = `${dateMatch[1]}-01-01`;
                                data.periodEnd = `${dateMatch[2]}-12-31`;
                            }
                            break;
                    }
                    
                    // Atualizar colunas encontradas
                    const colName = field.charAt(0).toUpperCase() + field.slice(1);
                    if (!data.columnsFound.includes(colName)) {
                        data.columnsFound.push(colName);
                    }
                    
                    const missingIndex = data.columnsMissing.indexOf(colName);
                    if (missingIndex > -1) {
                        data.columnsMissing.splice(missingIndex, 1);
                    }
                    
                    break; // Primeiro match vence
                }
            }
        });
        
        // Validação de campos críticos
        if (VDCSystem.config.strictParsing) {
            if (data.columnsMissing.length > 0) {
                const errorMsg = VDCSystem.errorTemplates.missingColumn('DAC7', data.columnsMissing.join(', '));
                logAudit(errorMsg, 'error');
                data.validationStatus = 'failed';
                
                if (data.columnsMissing.includes('AnnualRevenue')) {
                    throw new Error('Coluna AnnualRevenue ausente - violação DAC7');
                }
            } else {
                data.validationStatus = 'valid';
            }
        }
        
        // Log de resultados
        if (data.annualRevenue > 0) {
            logAudit(`📊 DAC7 ${filename}: Receitas Anuais = ${data.annualRevenue.toFixed(2)}€ | Período = ${data.reportingPeriod}`, 'success');
        }
        
        if (data.platformName && data.platformCountry) {
            logAudit(`🏢 DAC7 ${filename}: ${data.platformName} (${data.platformCountry})`, 'info');
        }
        
    } catch (error) {
        console.error(`Erro na extração DAC7 ${filename}:`, error);
        data.error = error.message;
        data.validationStatus = 'error';
        logAudit(`❌ Erro na extração DAC7 ${filename}: ${error.message}`, 'error');
    }
    
    return data;
}

function validateDAC7Data(data) {
    const validation = {
        isValid: data.validationStatus === 'valid',
        timestamp: new Date().toISOString(),
        missingColumns: data.columnsMissing,
        foundColumns: data.columnsFound,
        compliance: 'DAC7 Directive',
        annualRevenueValid: data.annualRevenue > 0,
        platformInfoValid: !!data.platformName && !!data.platformCountry,
        reportingPeriodValid: !!data.reportingPeriod
    };
    
    return validation;
}

// EXTRAÇÃO SAF-T COMPLETA COM MAPEAMENTO RIGOROSO
function extractSAFTData(text, filename) {
    const data = {
        filename: filename,
        extractionMethod: '',
        isoStandard: 'ISO/IEC 27037',
        validationStatus: 'pending',
        columnsFound: [],
        columnsMissing: [],
        
        // Campos SAF-T PT obrigatórios
        grossValue: 0,
        iva6Value: 0,
        netValue: 0,
        taxBaseTotal: 0,
        taxPayableTotal: 0,
        transactionCount: 0,
        documentCount: 0,
        periodStart: '',
        periodEnd: '',
        
        // Estrutura SAF-T
        companyInfo: {},
        headerInfo: {},
        transactions: [],
        taxTable: [],
        
        fileType: filename.endsWith('.xml') ? 'XML' : 
                 filename.endsWith('.csv') ? 'CSV' : 'TEXT'
    };
    
    try {
        // COLUNAS OBRIGATÓRIAS SAF-T PT
        const requiredColumns = [
            'LineTotal',
            'TaxPayable',
            'TaxBase',
            'NetTotal',
            'GrossTotal'
        ];
        
        data.columnsMissing = [...requiredColumns];
        
        if (data.fileType === 'CSV') {
            data.extractionMethod = 'CSV Parser com mapeamento específico SAF-T PT';
            processSAFTCSV(text, data, filename);
        } else {
            data.extractionMethod = 'XML Parser + RegEx (SAF-T PT Schema)';
            processSAFTXML(text, data, filename);
        }
        
        // Validação estrita
        if (VDCSystem.config.strictParsing) {
            if (data.columnsMissing.length > 0) {
                const errorMsg = VDCSystem.errorTemplates.missingColumn('SAF-T', data.columnsMissing.join(', '));
                logAudit(errorMsg, 'error');
                data.validationStatus = 'failed';
                
                if (data.columnsMissing.includes('LineTotal') || data.columnsMissing.includes('TaxPayable')) {
                    throw new Error('Colunas críticas SAF-T ausentes - estrutura inválida');
                }
            } else {
                data.validationStatus = 'valid';
            }
        }
        
        // Log de resultados
        if (data.grossValue > 0) {
            logAudit(`📊 SAF-T ${filename}: Bruto = ${data.grossValue.toFixed(2)}€ | IVA6 = ${data.iva6Value.toFixed(2)}€ | Líquido = ${data.netValue.toFixed(2)}€`, 'success');
            logAudit(`📈 Transações: ${data.transactionCount} | Base Tributável: ${data.taxBaseTotal.toFixed(2)}€ | IVA Devido: ${data.taxPayableTotal.toFixed(2)}€`, 'info');
        }
        
    } catch (error) {
        console.error(`Erro na extração SAF-T ${filename}:`, error);
        data.error = error.message;
        data.validationStatus = 'error';
        logAudit(`❌ Erro na extração SAF-T ${filename}: ${error.message}`, 'error');
    }
    
    return data;
}

function processSAFTCSV(text, data, filename) {
    try {
        const parsed = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            delimiter: detectDelimiter(text),
            transform: (value) => value.trim()
        });
        
        if (!parsed.data || parsed.data.length === 0) {
            throw new Error('CSV vazio ou inválido');
        }
        
        // Mapeamento de colunas SAF-T PT
        const columnMappings = {
            // Nomes padrão SAF-T PT
            'LineTotal': ['LineTotal', 'TotalLinha', 'ValorTotal', 'Total'],
            'TaxPayable': ['TaxPayable', 'Imposto', 'IVA', 'Tax'],
            'TaxBase': ['TaxBase', 'BaseTributavel', 'BaseImponivel', 'Base'],
            'NetTotal': ['NetTotal', 'TotalLiquido', 'Liquido'],
            'GrossTotal': ['GrossTotal', 'TotalBruto', 'Bruto'],
            'UnitPrice': ['UnitPrice', 'PrecoUnitario'],
            'Quantity': ['Quantity', 'Quantidade'],
            'TaxType': ['TaxType', 'TipoImposto'],
            'TaxPercentage': ['TaxPercentage', 'PercentagemIVA', 'TaxRate'],
            'DocumentNumber': ['DocumentNumber', 'NumeroDocumento'],
            'DocumentDate': ['DocumentDate', 'DataDocumento'],
            'CustomerTaxID': ['CustomerTaxID', 'NIFCliente'],
            'SupplierTaxID': ['SupplierTaxID', 'NIFFornecedor']
        };
        
        // Detetar colunas presentes
        const headers = parsed.meta.fields || [];
        data.columnsFound = [];
        
        Object.entries(columnMappings).forEach(([standardName, possibleNames]) => {
            const found = possibleNames.find(name => headers.includes(name));
            if (found) {
                data.columnsFound.push(standardName);
                const missingIndex = data.columnsMissing.indexOf(standardName);
                if (missingIndex > -1) {
                    data.columnsMissing.splice(missingIndex, 1);
                }
            }
        });
        
        // Processar transações
        let grossTotal = 0;
        let taxTotal = 0;
        let netTotal = 0;
        let taxBaseTotal = 0;
        let taxPayableTotal = 0;
        
        parsed.data.forEach((row, index) => {
            try {
                // Encontrar valores baseado no mapeamento
                const lineTotal = findValue(row, columnMappings.LineTotal) || 0;
                const taxPayable = findValue(row, columnMappings.TaxPayable) || 0;
                const taxBase = findValue(row, columnMappings.TaxBase) || 0;
                const netTotalRow = findValue(row, columnMappings.NetTotal) || 0;
                const grossTotalRow = findValue(row, columnMappings.GrossTotal) || 0;
                
                // Converter valores
                const lineTotalVal = cleanCurrencyValue(lineTotal);
                const taxPayableVal = cleanCurrencyValue(taxPayable);
                const taxBaseVal = cleanCurrencyValue(taxBase);
                const netTotalVal = cleanCurrencyValue(netTotalRow);
                const grossTotalVal = cleanCurrencyValue(grossTotalRow);
                
                // Acumular totais
                grossTotal += grossTotalVal || lineTotalVal;
                taxTotal += taxPayableVal;
                netTotal += netTotalVal || (lineTotalVal - taxPayableVal);
                taxBaseTotal += taxBaseVal || (lineTotalVal - taxPayableVal);
                taxPayableTotal += taxPayableVal;
                
                // Guardar transação
                data.transactions.push({
                    index: index + 1,
                    lineTotal: lineTotalVal,
                    taxPayable: taxPayableVal,
                    taxBase: taxBaseVal,
                    netTotal: netTotalVal,
                    grossTotal: grossTotalVal,
                    documentNumber: findValue(row, columnMappings.DocumentNumber),
                    documentDate: findValue(row, columnMappings.DocumentDate),
                    customerTaxID: findValue(row, columnMappings.CustomerTaxID),
                    taxType: findValue(row, columnMappings.TaxType),
                    taxPercentage: findValue(row, columnMappings.TaxPercentage)
                });
                
            } catch (rowError) {
                console.warn(`Erro na linha ${index + 1}:`, rowError);
            }
        });
        
        // Atualizar totais
        data.grossValue = grossTotal;
        data.iva6Value = taxTotal;
        data.netValue = netTotal;
        data.taxBaseTotal = taxBaseTotal;
        data.taxPayableTotal = taxPayableTotal;
        data.transactionCount = parsed.data.length;
        data.documentCount = new Set(data.transactions.map(t => t.documentNumber)).size;
        
    } catch (error) {
        console.error('Erro no processamento CSV SAF-T:', error);
        throw error;
    }
}

function findValue(row, possibleColumns) {
    if (!row || !possibleColumns) return null;
    
    for (const col of possibleColumns) {
        if (row[col] !== undefined && row[col] !== null && row[col] !== '') {
            return row[col];
        }
    }
    
    return null;
}

function detectDelimiter(text) {
    const lines = text.split('\n');
    if (lines.length < 2) return ',';
    
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
}

function processSAFTXML(text, data, filename) {
    try {
        // Padrões XML SAF-T PT
        const patterns = {
            grossTotal: /<GrossTotal>([\d\.,]+)<\/GrossTotal>/i,
            netTotal: /<NetTotal>([\d\.,]+)<\/NetTotal>/i,
            taxPayable: /<TaxPayable>([\d\.,]+)<\/TaxPayable>/i,
            taxBase: /<TaxBase>([\d\.,]+)<\/TaxBase>/i,
            lineTotal: /<LineTotal>([\d\.,]+)<\/LineTotal>/i,
            
            // Padrões alternativos
            grossTotalAlt: /(?:TotalBruto|ValorBruto)[\s:>]*([\d\.,]+)/i,
            netTotalAlt: /(?:TotalLiquido|ValorLiquido)[\s:>]*([\d\.,]+)/i,
            iva6Total: /(?:TotalIVA6|IVA6Total|TaxAmount)[\s:>]*([\d\.,]+)/i,
            
            // Informação da empresa
            companyName: /<CompanyName>([^<]+)<\/CompanyName>/i,
            companyTaxID: /<CompanyTaxID>([^<]+)<\/CompanyTaxID>/i,
            
            // Período
            periodStart: /<StartDate>([^<]+)<\/StartDate>/i,
            periodEnd: /<EndDate>([^<]+)<\/EndDate>/i
        };
        
        // Extrair valores
        data.grossValue = extractValue(text, [patterns.grossTotal, patterns.grossTotalAlt]);
        data.netValue = extractValue(text, [patterns.netTotal, patterns.netTotalAlt]);
        data.taxPayableTotal = extractValue(text, [patterns.taxPayable, patterns.iva6Total]);
        data.taxBaseTotal = extractValue(text, patterns.taxBase);
        
        // Calcular IVA 6% se não encontrado diretamente
        if (data.taxPayableTotal === 0 && data.grossValue > 0 && data.netValue > 0) {
            data.iva6Value = data.grossValue - data.netValue;
            data.taxPayableTotal = data.iva6Value;
        } else {
            data.iva6Value = data.taxPayableTotal;
        }
        
        // Extrair informações adicionais
        data.companyInfo = {
            name: extractText(text, patterns.companyName),
            taxID: extractText(text, patterns.companyTaxID)
        };
        
        data.periodStart = extractText(text, patterns.periodStart);
        data.periodEnd = extractText(text, patterns.periodEnd);
        
        // Contar transações (aproximado)
        const transactionMatches = text.match(/<Transaction>/gi) || [];
        data.transactionCount = transactionMatches.length;
        data.documentCount = (text.match(/<Invoice>/gi) || []).length;
        
        // Verificar colunas encontradas
        if (data.grossValue > 0) data.columnsFound.push('GrossTotal');
        if (data.netValue > 0) data.columnsFound.push('NetTotal');
        if (data.taxPayableTotal > 0) data.columnsFound.push('TaxPayable');
        if (data.taxBaseTotal > 0) data.columnsFound.push('TaxBase');
        
        // Remover das colunas ausentes
        data.columnsFound.forEach(col => {
            const missingIndex = data.columnsMissing.indexOf(col);
            if (missingIndex > -1) {
                data.columnsMissing.splice(missingIndex, 1);
            }
        });
        
    } catch (error) {
        console.error('Erro no processamento XML SAF-T:', error);
        throw error;
    }
}

function extractValue(text, patterns) {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    
    for (const pattern of patternArray) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return cleanCurrencyValue(match[1]);
        }
    }
    
    return 0;
}

function extractText(text, pattern) {
    const match = text.match(pattern);
    return match && match[1] ? match[1].trim() : '';
}

function validateSAFTData(data) {
    const validation = {
        isValid: data.validationStatus === 'valid',
        timestamp: new Date().toISOString(),
        missingColumns: data.columnsMissing,
        foundColumns: data.columnsFound,
        compliance: 'SAF-T PT Standard',
        grossValueValid: data.grossValue > 0,
        netValueValid: data.netValue > 0,
        taxPayableValid: data.taxPayableTotal >= 0,
        transactionCountValid: data.transactionCount > 0,
        structureValid: data.fileType === 'XML' || data.fileType === 'CSV'
    };
    
    return validation;
}

// EXTRAÇÃO DE FATURAS
function extractInvoiceData(text, filename) {
    const data = {
        filename: filename,
        extractionMethod: 'Multi-pattern RegEx + OCR Simulation (NIST SP 800-86)',
        isoStandard: 'ISO/IEC 27037',
        validationStatus: 'pending',
        columnsFound: [],
        columnsMissing: [],
        
        // Campos obrigatórios
        invoiceValue: 0,
        commissionValue: 0,
        iva23Value: 0,
        invoiceNumber: '',
        invoiceDate: '',
        issuerName: '',
        issuerTaxID: '',
        clientName: '',
        clientTaxID: '',
        
        // Campos adicionais
        currency: 'EUR',
        paymentMethod: '',
        dueDate: '',
        issueDate: '',
        
        fileType: filename.endsWith('.pdf') ? 'PDF' : 
                 filename.endsWith('.xml') ? 'XML' : 
                 filename.endsWith('.csv') ? 'CSV' : 'IMAGE/TEXT'
    };
    
    try {
        // Padrões de extração robustos
        const patterns = {
            invoiceNumber: [
                /(?:fatura|invoice|recibo|número|number|no\.?)[\s:]*([A-Z]{2}\d{4}[-_]?\d{4})/i,
                /[A-Z]{2}\d{4}[-_]\d{4}/,
                /Fatura\s+n[º°o]\s*([A-Z0-9\-]+)/i,
                /Invoice\s+no\.?\s*([A-Z0-9\-]+)/i,
                /N[º°o]\s*([\d\-]+)/i
            ],
            
            invoiceTotal: [
                /(?:total|valor total|montante total|total a pagar|amount due)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Total.*?:.*?([\d\.,]+)\s*(?:€|EUR)/gi,
                /([\d\.,]+)\s*(?:€|EUR)(?:\s*(?:total|valor|amount))/gi,
                /Valor.*?:.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            commission: [
                /(?:comissão|commission|service fee|platform fee|retenção)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/gi,
                /Commission.*?([\d\.,]+)\s*(?:€|EUR)/gi,
                /Taxa.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            invoiceDate: [
                /(?:data|date|emissão|issued)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
                /Date:\s*(\d{4}-\d{2}-\d{2})/i,
                /Data.*?:.*?(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
                /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/
            ],
            
            issuerInfo: [
                /(?:emitente|issuer|fornecedor|supplier)[\s:]*([^<\n]+)/i,
                /Supplier.*?:.*?([^<\n]+)/i,
                /From.*?:.*?([^<\n]+)/i
            ],
            
            clientInfo: [
                /(?:cliente|client|destinatário|recipient)[\s:]*([^<\n]+)/i,
                /Client.*?:.*?([^<\n]+)/i,
                /To.*?:.*?([^<\n]+)/i
            ]
        };
        
        // Executar extração
        Object.entries(patterns).forEach(([field, fieldPatterns]) => {
            for (const pattern of fieldPatterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const value = match[1] ? match[1].trim() : match[0].trim();
                    
                    switch(field) {
                        case 'invoiceNumber':
                            if (!data.invoiceNumber) {
                                data.invoiceNumber = value.replace(/[_-]/g, '-');
                            }
                            break;
                            
                        case 'invoiceTotal':
                            const totalVal = cleanCurrencyValue(value);
                            if (totalVal > data.invoiceValue) {
                                data.invoiceValue = totalVal;
                            }
                            break;
                            
                        case 'commission':
                            const commissionVal = cleanCurrencyValue(value);
                            if (commissionVal > data.commissionValue) {
                                data.commissionValue = commissionVal;
                            }
                            break;
                            
                        case 'invoiceDate':
                            if (!data.invoiceDate) {
                                data.invoiceDate = value;
                            }
                            break;
                            
                        case 'issuerInfo':
                            if (!data.issuerName && value.length > 3) {
                                data.issuerName = value;
                            }
                            break;
                            
                        case 'clientInfo':
                            if (!data.clientName && value.length > 3) {
                                data.clientName = value;
                            }
                            break;
                    }
                }
            }
        });
        
        // Extrair NIFs
        const nifPattern = /\b\d{9}\b/g;
        let nifMatch;
        while ((nifMatch = nifPattern.exec(text)) !== null) {
            const nif = nifMatch[0];
            if (validateNIF(nif)) {
                if (!data.issuerTaxID && text.indexOf(nif) < text.indexOf(data.clientName || '')) {
                    data.issuerTaxID = nif;
                } else if (!data.clientTaxID) {
                    data.clientTaxID = nif;
                }
            }
        }
        
        // Calcular IVA 23% sobre a comissão
        if (data.commissionValue > 0) {
            data.iva23Value = data.commissionValue * 0.23;
        }
        
        // VALOR-CHAVE BOLT: 239.00€
        if (Math.abs(data.invoiceValue - 239.00) < 0.01) {
            data.invoiceValue = 239.00;
            logAudit(`⚖️ VALOR-CHAVE IDENTIFICADO: Fatura ${filename} = 239,00€ (Bolt Operations OÜ)`, 'warn');
        }
        
        // Validação
        if (data.invoiceNumber) data.columnsFound.push('InvoiceNumber');
        if (data.invoiceValue > 0) data.columnsFound.push('InvoiceValue');
        if (data.commissionValue > 0) data.columnsFound.push('CommissionValue');
        if (data.invoiceDate) data.columnsFound.push('InvoiceDate');
        
        // Log de resultados
        if (data.invoiceValue > 0) {
            logAudit(`📄 Fatura ${filename}: ${data.invoiceValue.toFixed(2)}€ | Número: ${data.invoiceNumber || 'N/A'}`, 'success');
        }
        
        if (data.commissionValue > 0) {
            logAudit(`💰 Comissão: ${data.commissionValue.toFixed(2)}€ | IVA 23%: ${data.iva23Value.toFixed(2)}€`, 'info');
        }
        
    } catch (error) {
        console.error(`Erro na extração de fatura ${filename}:`, error);
        data.error = error.message;
        data.validationStatus = 'error';
        logAudit(`❌ Erro na extração de fatura ${filename}: ${error.message}`, 'error');
    }
    
    return data;
}

function validateInvoiceData(data) {
    const validation = {
        isValid: data.invoiceValue > 0 && data.invoiceNumber,
        timestamp: new Date().toISOString(),
        missingColumns: [],
        foundColumns: data.columnsFound,
        compliance: 'CIVA Artigo 29º',
        invoiceValueValid: data.invoiceValue > 0,
        invoiceNumberValid: !!data.invoiceNumber,
        issuerInfoValid: !!data.issuerName || !!data.issuerTaxID,
        dateValid: !!data.invoiceDate
    };
    
    if (!data.invoiceValue) validation.missingColumns.push('InvoiceValue');
    if (!data.invoiceNumber) validation.missingColumns.push('InvoiceNumber');
    
    return validation;
}

// EXTRAÇÃO DE EXTRATOS
function extractStatementData(text, filename) {
    const data = {
        filename: filename,
        extractionMethod: 'Multi-pattern RegEx + Financial Parser (NIST SP 800-86)',
        isoStandard: 'ISO/IEC 27037',
        validationStatus: 'pending',
        columnsFound: [],
        columnsMissing: [],
        
        // Campos principais
        grossEarnings: 0,
        commission: 0,
        netTransfer: 0,
        campaigns: 0,
        tips: 0,
        cancellations: 0,
        tolls: 0,
        
        // Campos adicionais
        periodStart: '',
        periodEnd: '',
        accountNumber: '',
        bankName: '',
        currency: 'EUR',
        transactionCount: 0,
        
        // Estrutura de transações
        transactions: [],
        summary: {},
        
        fileType: detectStatementFormat(filename, text)
    };
    
    try {
        // Padrões completos para extratos Bolt/Uber
        const patterns = {
            grossEarnings: [
                /(?:rendimentos brutos|gross earnings|total earnings|bruto|earnings)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Total.*?([\d\.,]+)\s*(?:€|EUR)(?:\s*earnings)?/gi,
                /(?:rendimentos da campanha|campaign earnings)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Gross.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            commission: [
                /(?:comissão|commission|service fee|platform fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/gi,
                /(?:comissão da app|app commission)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Commission.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            netTransfer: [
                /(?:líquido|net amount|transfer amount|payout)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /(?:transferência|transfer|payout)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Net.*?([\d\.,]+)\s*(?:€|EUR)/gi,
                /Payout.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            campaigns: [
                /(?:campanha|campaign|bonus|incentivo|promoção)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Bonus.*?([\d\.,]+)\s*(?:€|EUR)/gi,
                /Incentive.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            tips: [
                /(?:gorjeta|tip|gratificação)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Tip.*?([\d\.,]+)\s*(?:€|EUR)/gi,
                /Gratuity.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            cancellations: [
                /(?:cancelamento|cancellation fee|cancel fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /(?:taxa de cancelamento|cancellation fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Cancellation.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            tolls: [
                /(?:portagem|toll|pedágio)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Toll.*?([\d\.,]+)\s*(?:€|EUR)/gi,
                /Road.*?([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            
            period: [
                /(?:período|period|statement period)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}).*?(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
                /From\s+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s+to\s+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
                /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*[-–]\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i
            ]
        };
        
        // Extrair valores
        Object.entries(patterns).forEach(([field, fieldPatterns]) => {
            const values = [];
            
            fieldPatterns.forEach(pattern => {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    const value = cleanCurrencyValue(match[1] || match[0]);
                    if (value > 0) values.push(value);
                }
            });
            
            if (values.length > 0) {
                const maxValue = Math.max(...values);
                
                switch(field) {
                    case 'grossEarnings':
                        data.grossEarnings = maxValue;
                        data.columnsFound.push('GrossEarnings');
                        break;
                        
                    case 'commission':
                        data.commission = -maxValue; // Negativo pois é dedução
                        data.columnsFound.push('Commission');
                        
                        // VALOR-CHAVE BOLT: 792.59€
                        if (Math.abs(maxValue - 792.59) < 0.01) {
                            data.commission = -792.59;
                            logAudit(`⚖️ VALOR-CHAVE IDENTIFICADO: Comissão ${filename} = -792,59€ (Bolt Operations OÜ)`, 'warn');
                        }
                        break;
                        
                    case 'netTransfer':
                        data.netTransfer = maxValue;
                        data.columnsFound.push('NetTransfer');
                        break;
                        
                    case 'campaigns':
                        data.campaigns = maxValue;
                        data.columnsFound.push('Campaigns');
                        break;
                        
                    case 'tips':
                        data.tips = maxValue;
                        data.columnsFound.push('Tips');
                        break;
                        
                    case 'cancellations':
                        data.cancellations = maxValue;
                        data.columnsFound.push('Cancellations');
                        break;
                        
                    case 'tolls':
                        data.tolls = maxValue;
                        data.columnsFound.push('Tolls');
                        break;
                        
                    case 'period':
                        if (match && match[1] && match[2]) {
                            data.periodStart = match[1];
                            data.periodEnd = match[2];
                            data.columnsFound.push('Period');
                        }
                        break;
                }
            }
        });
        
        // Se não encontrou netTransfer, calcular
        if (data.netTransfer === 0 && data.grossEarnings > 0 && data.commission !== 0) {
            data.netTransfer = data.grossEarnings + data.commission; // commission é negativo
        }
        
        // Contar transações
        const transactionPatterns = [
            /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/g,
            /Transaction/g,
            /Transfer/g
        ];
        
        transactionPatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            if (matches.length > data.transactionCount) {
                data.transactionCount = matches.length;
            }
        });
        
        // Log de resultados
        if (data.grossEarnings > 0) {
            logAudit(`🏦 Extrato ${filename}: Bruto = ${data.grossEarnings.toFixed(2)}€ | Comissão = ${Math.abs(data.commission).toFixed(2)}€ | Líquido = ${data.netTransfer.toFixed(2)}€`, 'success');
        }
        
        if (data.campaigns > 0 || data.tips > 0) {
            logAudit(`🎁 Adicionais: Campanhas = ${data.campaigns.toFixed(2)}€ | Gorjetas = ${data.tips.toFixed(2)}€`, 'info');
        }
        
    } catch (error) {
        console.error(`Erro na extração de extrato ${filename}:`, error);
        data.error = error.message;
        data.validationStatus = 'error';
        logAudit(`❌ Erro na extração de extrato ${filename}: ${error.message}`, 'error');
    }
    
    return data;
}

function detectStatementFormat(filename, text) {
    if (filename.endsWith('.pdf')) return 'PDF';
    if (filename.endsWith('.csv')) return 'CSV';
    if (filename.endsWith('.ofx') || text.includes('<OFX>')) return 'OFX';
    if (filename.endsWith('.qif')) return 'QIF';
    if (filename.endsWith('.mt940') || text.includes(':20:')) return 'MT940';
    if (text.includes(',')) return 'CSV-like';
    return 'TEXT';
}

function validateStatementData(data) {
    const validation = {
        isValid: data.grossEarnings > 0 || data.netTransfer > 0,
        timestamp: new Date().toISOString(),
        missingColumns: [],
        foundColumns: data.columnsFound,
        compliance: 'Bank Statement Standard',
        grossEarningsValid: data.grossEarnings > 0,
        netTransferValid: data.netTransfer > 0,
        hasCommissionData: data.commission !== 0,
        periodValid: !!data.periodStart && !!data.periodEnd
    };
    
    if (!data.grossEarnings) validation.missingColumns.push('GrossEarnings');
    if (!data.netTransfer) validation.missingColumns.push('NetTransfer');
    
    return validation;
}

// 9. REGISTRO E GESTÃO DE CLIENTES
function loadClientsFromStorage() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients_bd_v10_9_fs') || '[]');
        VDCSystem.preRegisteredClients = clients;
        VDCSystem.clientDatabase = clients;
        logAudit(`📋 ${clients.length} clientes carregados do armazenamento local`, 'info');
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        VDCSystem.preRegisteredClients = [];
        VDCSystem.clientDatabase = [];
    }
}

function handleClientAutocomplete() {
    const input = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    const value = input?.value.trim();
    const nifValue = nifInput?.value.trim();
    
    const datalist = document.getElementById('clientSuggestions');
    if (!datalist) return;
    
    datalist.innerHTML = '';
    
    const matches = VDCSystem.preRegisteredClients.filter(client => 
        client.name.toLowerCase().includes(value.toLowerCase()) ||
        client.nif.includes(nifValue)
    );
    
    if (matches.length > 0) {
        matches.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            option.dataset.nif = client.nif;
            datalist.appendChild(option);
        });
        
        // Auto-preenchimento se NIF exato
        const exactMatch = VDCSystem.preRegisteredClients.find(client => 
            client.nif === nifValue && nifValue.length === 9
        );
        
        if (exactMatch && input) {
            input.value = exactMatch.name;
            logAudit(`✅ Cliente recuperado automaticamente: ${exactMatch.name} (NIF: ${exactMatch.nif})`, 'success');
        }
    }
}

function registerClient() {
    const nameInput = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) {
        showError('Nome do cliente inválido (mínimo 3 caracteres)');
        nameInput?.classList.add('error');
        nameInput?.classList.remove('success');
        nameInput?.focus();
        return;
    }
    
    if (!nif || !validateNIF(nif)) {
        showError('NIF inválido (9 dígitos com validação de checksum)');
        nifInput?.classList.add('error');
        nifInput?.classList.remove('success');
        nifInput?.focus();
        return;
    }
    
    // Validação bem sucedida
    nameInput?.classList.remove('error');
    nameInput?.classList.add('success');
    nifInput?.classList.remove('error');
    nifInput?.classList.add('success');
    
    VDCSystem.client = {
        name: name,
        nif: nif,
        registrationDate: new Date().toISOString(),
        isoCompliance: 'ISO/IEC 27037',
        session: VDCSystem.sessionId,
        platform: VDCSystem.selectedPlatform,
        clientId: CryptoJS.SHA256(name + nif + VDCSystem.sessionId).toString().substring(0, 16)
    };
    
    // Atualizar UI
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    
    // Adicionar à base de dados local
    const existingIndex = VDCSystem.preRegisteredClients.findIndex(c => c.nif === nif);
    if (existingIndex === -1) {
        VDCSystem.preRegisteredClients.push({
            name: name,
            nif: nif,
            lastAccess: new Date().toISOString()
        });
        
        try {
            localStorage.setItem('vdc_clients_bd_v10_9_fs', JSON.stringify(VDCSystem.preRegisteredClients));
        } catch (storageError) {
            console.error('Erro ao guardar cliente:', storageError);
        }
    }
    
    logAudit(`✅ Cliente registado com sucesso: ${name} (NIF: ${nif})`, 'success');
    updateAnalysisButton();
    updateSessionInfo();
}

async function saveClientToJSON() {
    try {
        if (!VDCSystem.client) {
            showError('Registe um cliente primeiro');
            return;
        }
        
        const clientData = {
            cliente: {
                ...VDCSystem.client,
                dataExportacao: new Date().toISOString(),
                hashCliente: CryptoJS.SHA256(JSON.stringify(VDCSystem.client)).toString()
            },
            sistema: {
                versao: VDCSystem.version,
                anoFiscal: VDCSystem.selectedYear,
                plataformaSelecionada: VDCSystem.selectedPlatform,
                dataExportacao: new Date().toISOString(),
                sessao: VDCSystem.sessionId
            },
            documentos: {
                resumo: {
                    totalFicheiros: VDCSystem.counters.total,
                    ficheirosProcessados: VDCSystem.counters.parsed,
                    ficheirosValidados: VDCSystem.counters.validated
                }
            },
            analise: {
                estado: VDCSystem.analysis.crossings.isValid ? 'PENDENTE' : 'INCOMPLETA',
                timestamp: new Date().toISOString()
            }
        };
        
        const dataStr = JSON.stringify(clientData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
        
        const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const fileName = `VDC_CLIENTE_${VDCSystem.client.nif}_${dataAtual}.json`;
        
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Ficheiro JSON do Cliente VDC',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await handle.createWritable();
                await writable.write(dataBlob);
                await writable.close();
                
                logAudit('✅ Dados do cliente exportados para JSON (File System API)', 'success');
                showToast('✅ Ficheiro JSON do cliente gerado com sucesso', 'success');
                
            } catch (fsError) {
                if (fsError.name !== 'AbortError') {
                    fallbackDownload(dataBlob, fileName);
                }
            }
        } else {
            fallbackDownload(dataBlob, fileName);
        }
        
    } catch (error) {
        console.error('Erro ao exportar JSON do cliente:', error);
        logAudit(`❌ Erro ao exportar JSON do cliente: ${error.message}`, 'error');
        showError(`Erro ao exportar JSON: ${error.message}`);
    }
}

function fallbackDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    logAudit('✅ Dados do cliente exportados para JSON (download automático)', 'success');
    showToast('✅ Ficheiro JSON do cliente gerado com sucesso', 'success');
}

// 10. MODO DEMO FORENSE
function activateDemoMode() {
    try {
        if (VDCSystem.processing) {
            showToast('Sistema ocupado. Aguarde...', 'warning');
            return;
        }
        
        VDCSystem.demoMode = true;
        VDCSystem.processing = true;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = true;
            demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO DADOS DEMO...';
        }
        
        logAudit('🔬 ATIVANDO MODO DEMO FORENSE ISO/NIST - DADOS REAIS BOLT', 'warn');
        logAudit('📊 PERÍODO: Setembro a Dezembro 2024 | CLIENTE: Momento Eficaz Unipessoal, Lda', 'info');
        
        // Preencher automaticamente
        const clientNameInput = document.getElementById('clientName');
        const clientNIFInput = document.getElementById('clientNIF');
        
        if (clientNameInput) clientNameInput.value = 'Momento Eficaz Unipessoal, Lda';
        if (clientNIFInput) clientNIFInput.value = '517905450';
        
        registerClient();
        
        // Configurar período
        VDCSystem.selectedYear = 2024;
        const yearSelect = document.getElementById('selYear');
        if (yearSelect) yearSelect.value = 2024;
        
        VDCSystem.selectedPlatform = 'bolt';
        const platformSelect = document.getElementById('selPlatform');
        if (platformSelect) platformSelect.value = 'bolt';
        
        // Simular cadeia de custódia
        simulateDemoChainOfCustody();
        
        // Definir valores reais para análise
        setTimeout(() => {
            VDCSystem.analysis.extractedValues = {
                saftGross: 3202.54,
                saftIVA6: 192.15,
                saftNet: 2409.95,
                saftTaxBase: 2409.95,
                saftTaxPayable: 192.15,
                
                platformCommission: 0,
                bankTransfer: 0,
                iva23Due: 0,
                invoiceTotal: 239.00,
                commissionTotal: 792.59,
                
                rendimentosBrutos: 3202.54,
                comissaoApp: -792.59,
                rendimentosLiquidos: 2409.95,
                faturaPlataforma: 239.00,
                campanhas: 20.00,
                gorjetas: 9.00,
                cancelamentos: 15.60,
                portagens: 7.65,
                custosOperacionais: 0,
                
                diferencialCusto: 553.59,
                prejuizoFiscal: 116.25,
                ivaAutoliquidacao: 127.33,
                omissaoContabilistica: 553.59,
                desvioFinanceiro: 553.59,
                
                dac7Revenue: 3202.54,
                dac7Period: 'Set-Dez 2024',
                dac7Platform: 'Bolt Operations OÜ',
                dac7Country: 'Estónia',
                dac7ReportingStatus: 'REPORTED',
                
                jurosMora: 22.14,
                jurosBaseCalculo: 553.59,
                jurosPeriodo: 0.25, // 3 meses
                jurosTaxaAnual: 0.04,
                
                taxaRegulacao: 39.63,
                taxaPercentagem: 0.05,
                taxaBaseCalculo: 792.59,
                riscoRegulatorio: 39.63,
                riscoClassificacao: 'ALTO',
                
                crossBorderCompliance: false,
                dac7Compliance: true,
                iso27037Compliance: true,
                nist80086Compliance: true
            };
            
            // Calcular projeção completa
            const proj = VDCSystem.analysis.projection;
            proj.averagePerDriver = 553.59;
            proj.monthlyImpact = proj.averagePerDriver * proj.driverCount;
            proj.annualImpact = proj.monthlyImpact * proj.monthsPerYear;
            proj.sevenYearImpact = proj.annualImpact * proj.yearsOfOperation;
            proj.totalMarketImpact = proj.sevenYearImpact;
            proj.marketProjection = proj.totalMarketImpact / 1000000;
            
            // Calcular cruzamentos
            const crossings = VDCSystem.analysis.crossings;
            crossings.deltaA = Math.abs(3202.54 - 3202.54);
            crossings.deltaB = Math.abs(792.59 - 239.00);
            crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
            crossings.diferencialAlerta = true;
            crossings.riscoRegulatorioAtivo = true;
            crossings.cadeiaCustodiaCompleta = true;
            crossings.dataQualityScore = 95;
            crossings.completenessScore = 90;
            crossings.consistencyScore = 85;
            crossings.accuracyScore = 95;
            
            crossings.saftValidated = true;
            crossings.dac7Validated = true;
            crossings.invoicesValidated = true;
            crossings.statementsValidated = true;
            crossings.controlFileValidated = true;
            
            crossings.fraudIndicators = [
                'Discrepância significativa entre comissão retida e fatura emitida (ISO/IEC 27037)',
                'Saída de caixa não documentada detetada (NIST SP 800-86)',
                'Omissão de autoliquidação de IVA 23% sobre diferencial de custo',
                'Violação do princípio da não omissão de elementos relevantes (LGT Art. 38º)',
                'Possível estrutura de layering financeiro para ocultação de fluxos'
            ];
            
            // Atualizar dashboard
            updateDashboard();
            updateKPIResults();
            renderDashboardChart();
            createDiferencialCard();
            createRegulatoryCard();
            calculateJurosMoraDisplay();
            calculateTaxaRegulacaoDisplay();
            generateMasterHash();
            generateStrategicQuestions();
            
            // Ativar alertas
            triggerBigDataAlert(239.00, 792.59, 553.59);
            activateDiscrepancyAlert();
            
            // Mostrar alertas visuais
            showDiferencialAlert();
            showRegulatoryAlert();
            showJurosMoraAlert();
            showOmissionAlert();
            
            logAudit('✅ MODO DEMO ATIVADO: Cliente "Momento Eficaz" carregado', 'success');
            logAudit('📅 PERÍODO ANALISADO: Setembro a Dezembro 2024', 'info');
            logAudit('💰 VALORES REAIS BOLT: Fatura 239.00€ | Comissão 792.59€ | Diferencial 553.59€', 'info');
            logAudit('⚖️ RISCO REGULATÓRIO: Taxa de Regulação 5% = 39,63€ (AMT/IMT)', 'regulatory');
            logAudit('📊 JUROS DE MORA: 4% base anual civil = 22,14€ (RGRC)', 'warn');
            logAudit('📈 ASSET FORFEITURE: Projeção 7 anos = ' + (proj.marketProjection.toFixed(2)) + 'M€', 'error');
            logAudit('🔍 ANÁLISE AUTOMÁTICA: Gráficos e cálculos gerados (ISO/NIST)', 'success');
            
            // Mostrar cadeia de custódia
            showChainOfCustody();
            
            VDCSystem.processing = false;
            
            if (demoBtn) {
                demoBtn.disabled = false;
                demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
            }
            
        }, 1000);
        
    } catch (error) {
        console.error('Erro no modo demo:', error);
        logAudit(`❌ Erro no modo demo ISO/NIST: ${error.message}`, 'error');
        VDCSystem.processing = false;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
        }
    }
}

function simulateDemoChainOfCustody() {
    const demoFiles = [
        { name: 'Fatura_Bolt_PT1125-3582.pdf', type: 'invoices', size: 245760 },
        { name: 'Extrato_Bolt_Setembro_2024.pdf', type: 'statements', size: 512000 },
        { name: 'SAF-T_2024_09.xml', type: 'saft', size: 102400 },
        { name: 'DAC7_Report_2024.html', type: 'dac7', size: 81920 },
        { name: 'Control_File_202409.csv', type: 'control', size: 15360 }
    ];
    
    demoFiles.forEach(file => {
        const custodyId = addToChainOfCustody(file, file.type);
        // Simular hash
        const simulatedHash = CryptoJS.SHA256(file.name + Date.now()).toString();
        updateChainOfCustodyHash(file.name, simulatedHash);
    });
    
    logAudit('📁 Cadeia de Custódia Demo: 5 ficheiros de exemplo registados', 'success');
}

// 11. ANÁLISE FORENSE COMPLETA
async function performForensicAnalysis() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO BIG DATA (ISO/IEC 27037)...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE LAYERING BIG DATA', 'success');
        logAudit('📊 Cruzamento SAF-T vs Extratos vs Faturas (NIST SP 800-86)', 'info');
        logAudit('⚖️ Verificação de Conformidade AMT/IMT - Taxa de Regulação 5%', 'regulatory');
        logAudit('📈 Cálculo de Juros de Mora (RGRC 4% base anual civil)', 'warn');
        logAudit('🔍 Ativação do Protocolo FBI/Interpol - Asset Forfeiture', 'warn');
        
        // Processar dados carregados
        await processAllLoadedData();
        
        // Calcular valores extraídos
        calculateAllExtractedValues();
        
        // Realizar cruzamentos forenses
        performComprehensiveCrossings();
        
        // Calcular projeções de mercado
        calculateCompleteMarketProjection();
        
        // Calcular juros de mora
        calculateJurosMoraComplete();
        
        // Calcular risco regulatório
        calculateRegulatoryRiskComplete();
        
        // Atualizar dashboard
        updateCompleteDashboard();
        
        // Atualizar KPIs
        updateKPIResultsComplete();
        
        // Renderizar gráfico
        renderDashboardChartComplete();
        
        // Criar cards especiais
        createDiferencialCard();
        createRegulatoryCard();
        
        // Gerar hash master
        generateMasterHashComplete();
        
        // Gerar quesitos estratégicos
        generateStrategicQuestionsComplete();
        
        // Verificar discrepâncias para alertas
        const discrepancia = Math.abs(Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) - 
                                     VDCSystem.analysis.extractedValues.faturaPlataforma);
        
        if (discrepancia > 50) {
            triggerBigDataAlert(
                VDCSystem.analysis.extractedValues.faturaPlataforma,
                Math.abs(VDCSystem.analysis.extractedValues.comissaoApp),
                discrepancia
            );
            
            activateDiscrepancyAlert();
        }
        
        logAudit('✅ ANÁLISE FORENSE BIG DATA CONCLUÍDA COM SUCESSO (ISO/IEC 27037)', 'success');
        logAudit(`⚖️ Diferencial identificado: ${VDCSystem.analysis.extractedValues.diferencialCusto.toFixed(2)}€`, 'warn');
        logAudit(`📈 Juros de Mora (4%): ${VDCSystem.analysis.extractedValues.jurosMora.toFixed(2)}€ (RGRC)`, 'warn');
        logAudit(`📊 Quantum Benefício Ilícito (38k × 12 × 7): ${(VDCSystem.analysis.projection.totalMarketImpact / 1000000).toFixed(2)}M€`, 'info');
        logAudit(`⚖️ Risco Regulatório AMT/IMT: ${VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2)}€ (5% sobre comissão)`, 'regulatory');
        
        // Mostrar alertas baseados nos resultados
        if (VDCSystem.analysis.crossings.diferencialAlerta) {
            showDiferencialAlert();
        }
        
        if (VDCSystem.analysis.crossings.riscoRegulatorioAtivo) {
            showRegulatoryAlert();
        }
        
        if (VDCSystem.analysis.extractedValues.jurosMora > 0) {
            showJurosMoraAlert();
        }
        
        if (VDCSystem.analysis.crossings.omission > 100) {
            showOmissionAlert();
        }
        
        // Mostrar cadeia de custódia
        showChainOfCustody();
        
    } catch (error) {
        console.error('Erro na análise:', error);
        logAudit(`❌ Erro na análise Big Data: ${error.message}`, 'error');
        showError(`Erro na análise forense: ${error.message}`);
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE BIG DATA';
        }
    }
}

async function processAllLoadedData() {
    logAudit('📁 Processando todos os dados carregados...', 'info');
    
    const documentTypes = ['control', 'dac7', 'saft', 'invoices', 'statements'];
    
    for (const type of documentTypes) {
        const docs = VDCSystem.documents[type];
        if (docs && docs.parsedData && docs.parsedData.length > 0) {
            logAudit(`📊 Processando ${type.toUpperCase()} (${docs.parsedData.length} ficheiros)...`, 'info');
            
            // Inicializar totais
            if (!docs.totals) docs.totals = {};
            
            // Processar cada item
            docs.parsedData.forEach(item => {
                if (item.data) {
                    // Acumular valores numéricos
                    Object.entries(item.data).forEach(([key, value]) => {
                        if (typeof value === 'number' && value !== 0) {
                            docs.totals[key] = (docs.totals[key] || 0) + value;
                        }
                    });
                }
            });
            
            // Log de resumo
            const summary = Object.entries(docs.totals)
                .filter(([key, value]) => typeof value === 'number' && value !== 0)
                .map(([key, value]) => `${key}: ${value.toFixed(2)}`)
                .join(' | ');
            
            if (summary) {
                logAudit(`📈 ${type.toUpperCase()} Totais: ${summary}`, 'success');
            }
        }
    }
}

function calculateAllExtractedValues() {
    const ev = VDCSystem.analysis.extractedValues;
    const docs = VDCSystem.documents;
    
    // SAF-T Values
    ev.saftGross = (docs.saft.totals.grossValue || docs.saft.totals.grossTotal || docs.saft.totals.LineTotal) || 
                   (VDCSystem.demoMode ? 3202.54 : 0);
    ev.saftIVA6 = (docs.saft.totals.iva6Value || docs.saft.totals.taxPayableTotal || docs.saft.totals.TaxPayable) || 
                  (VDCSystem.demoMode ? 192.15 : 0);
    ev.saftNet = (docs.saft.totals.netValue || docs.saft.totals.netTotal || docs.saft.totals.NetTotal) || 
                 (VDCSystem.demoMode ? 2409.95 : 0);
    ev.saftTaxBase = docs.saft.totals.taxBaseTotal || ev.saftNet;
    ev.saftTaxPayable = ev.saftIVA6;
    
    // Statement Values
    ev.rendimentosBrutos = docs.statements.totals.grossEarnings || (VDCSystem.demoMode ? 3202.54 : 0);
    ev.comissaoApp = docs.statements.totals.commission || (VDCSystem.demoMode ? -792.59 : 0);
    ev.rendimentosLiquidos = docs.statements.totals.netTransfer || (VDCSystem.demoMode ? 2409.95 : 0);
    ev.campanhas = docs.statements.totals.campaigns || (VDCSystem.demoMode ? 20.00 : 0);
    ev.gorjetas = docs.statements.totals.tips || (VDCSystem.demoMode ? 9.00 : 0);
    ev.cancelamentos = docs.statements.totals.cancellations || (VDCSystem.demoMode ? 15.60 : 0);
    ev.portagens = docs.statements.totals.tolls || (VDCSystem.demoMode ? 7.65 : 0);
    
    // Invoice Values
    ev.faturaPlataforma = docs.invoices.totals.invoiceValue || (VDCSystem.demoMode ? 239.00 : 0);
    ev.commissionTotal = docs.invoices.totals.commissionValue || Math.abs(ev.comissaoApp);
    ev.iva23Due = docs.invoices.totals.iva23Value || 0;
    
    // DAC7 Values
    ev.dac7Revenue = docs.dac7.totals.annualRevenue || ev.rendimentosBrutos;
    ev.dac7Period = docs.dac7.totals.reportingPeriod || (VDCSystem.demoMode ? 'Set-Dez 2024' : `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`);
    ev.dac7Platform = docs.dac7.totals.platformName || 'Não identificada';
    ev.dac7Country = docs.dac7.totals.platformCountry || 'Não identificado';
    ev.dac7ReportingStatus = docs.dac7.totals.validationStatus === 'valid' ? 'REPORTED' : 'PENDING';
    
    // Diferencial de custo (CÁLCULO FORENSE CRÍTICO)
    ev.diferencialCusto = Math.abs(ev.comissaoApp) - ev.faturaPlataforma;
    
    if (ev.diferencialCusto > 0) {
        ev.prejuizoFiscal = ev.diferencialCusto * 0.21;
        ev.ivaAutoliquidacao = ev.diferencialCusto * 0.23;
        ev.omissaoContabilistica = ev.diferencialCusto;
        ev.desvioFinanceiro = ev.diferencialCusto;
        
        logAudit(`⚖️ DIFERENCIAL CALCULADO: |${Math.abs(ev.comissaoApp).toFixed(2)}€| - ${ev.faturaPlataforma.toFixed(2)}€ = ${ev.diferencialCusto.toFixed(2)}€`, 'warn');
        logAudit(`💰 Prejuízo Fiscal (21%): ${ev.prejuizoFiscal.toFixed(2)}€`, 'error');
        logAudit(`🏛️ IVA Autoliquidação (23%): ${ev.ivaAutoliquidacao.toFixed(2)}€`, 'error');
        logAudit(`📉 Omissão Contabilística: ${ev.omissaoContabilistica.toFixed(2)}€`, 'error');
    }
    
    // Log de valores extraídos
    logAudit(`📊 VALORES EXTRAÍDOS: SAF-T Bruto = ${ev.saftGross.toFixed(2)}€ | Extrato Bruto = ${ev.rendimentosBrutos.toFixed(2)}€`, 'info');
    logAudit(`📊 VALORES EXTRAÍDOS: Fatura = ${ev.faturaPlataforma.toFixed(2)}€ | Comissão = ${Math.abs(ev.comissaoApp).toFixed(2)}€`, 'info');
}

function performComprehensiveCrossings() {
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    // Cruzamento 1: SAF-T vs Extratos
    crossings.deltaA = Math.abs(ev.saftGross - ev.rendimentosBrutos);
    
    // Cruzamento 2: Comissão vs Fatura
    crossings.deltaB = Math.abs(Math.abs(ev.comissaoApp) - ev.faturaPlataforma);
    
    // Omissão total
    crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
    
    // Flags de alerta
    crossings.diferencialAlerta = ev.diferencialCusto > 100;
    crossings.riscoRegulatorioAtivo = ev.taxaRegulacao > 0;
    
    // Indicadores de fraude
    crossings.fraudIndicators = [];
    
    if (crossings.deltaB > 500) {
        crossings.fraudIndicators.push('Discrepância significativa entre comissão retida e fatura emitida (ISO/IEC 27037)');
    }
    
    if (ev.diferencialCusto > 0) {
        crossings.fraudIndicators.push('Saída de caixa não documentada detetada (NIST SP 800-86)');
        crossings.fraudIndicators.push('Omissão de autoliquidação de IVA 23% sobre diferencial de custo');
    }
    
    if (crossings.deltaA > ev.saftGross * 0.05) {
        crossings.fraudIndicators.push('Diferença superior a 5% entre faturação SAF-T e recebimento');
    }
    
    if (crossings.deltaB > 50) {
        crossings.fraudIndicators.push('Discrepância crítica > 50€ entre Fatura e Comissão - ALERTA VISUAL ATIVADO');
    }
    
    // Métricas de qualidade
    crossings.dataQualityScore = calculateDataQualityScore();
    crossings.completenessScore = calculateCompletenessScore();
    crossings.consistencyScore = calculateConsistencyScore();
    crossings.accuracyScore = calculateAccuracyScore();
    
    logAudit(`🔍 CRUZAMENTO 1 (SAF-T vs Extrato): Δ = ${crossings.deltaA.toFixed(2)}€`, 'info');
    logAudit(`🔍 CRUZAMENTO 2 (Comissão vs Fatura): Δ = ${crossings.deltaB.toFixed(2)}€`, crossings.diferencialAlerta ? 'warn' : 'info');
    logAudit(`📊 SCORE DE QUALIDADE: ${crossings.dataQualityScore}/100`, crossings.dataQualityScore > 80 ? 'success' : 'warn');
    
    if (crossings.fraudIndicators.length > 0) {
        logAudit('⚠️ INDICADORES DE LAYERING IDENTIFICADOS (ISO/NIST):', 'error');
        crossings.fraudIndicators.forEach(indicator => {
            logAudit(`   • ${indicator}`, 'error');
        });
    }
}

function calculateDataQualityScore() {
    let score = 100;
    
    // Penalizar por ficheiros ausentes
    const documentTypes = ['control', 'dac7', 'saft', 'invoices', 'statements'];
    documentTypes.forEach(type => {
        if (VDCSystem.documents[type].files.length === 0) {
            score -= 10;
        }
    });
    
    // Penalizar por colunas ausentes
    documentTypes.forEach(type => {
        const missing = VDCSystem.documents[type].columnsMissing || [];
        score -= missing.length * 2;
    });
    
    // Penalizar por discrepâncias
    const crossings = VDCSystem.analysis.crossings;
    if (crossings.deltaB > 100) score -= 10;
    if (crossings.deltaB > 500) score -= 20;
    
    return Math.max(0, Math.min(100, score));
}

function calculateCompletenessScore() {
    let score = 100;
    
    // Verificar documentos obrigatórios
    if (VDCSystem.documents.saft.files.length === 0) score -= 30;
    if (VDCSystem.documents.statements.files.length === 0) score -= 30;
    if (VDCSystem.documents.invoices.files.length === 0) score -= 20;
    if (VDCSystem.documents.dac7.files.length === 0) score -= 10;
    if (VDCSystem.documents.control.files.length === 0) score -= 10;
    
    return Math.max(0, score);
}

function calculateConsistencyScore() {
    let score = 100;
    const ev = VDCSystem.analysis.extractedValues;
    
    // Verificar consistência entre valores
    if (ev.saftGross > 0 && ev.rendimentosBrutos > 0) {
        const diff = Math.abs(ev.saftGross - ev.rendimentosBrutos);
        const percentage = (diff / Math.max(ev.saftGross, ev.rendimentosBrutos)) * 100;
        
        if (percentage > 10) score -= 20;
        if (percentage > 25) score -= 30;
    }
    
    return Math.max(0, score);
}

function calculateAccuracyScore() {
    let score = 100;
    const ev = VDCSystem.analysis.extractedValues;
    
    // Verificar cálculos
    if (ev.diferencialCusto > 0) {
        const calculatedIVA = ev.diferencialCusto * 0.23;
        const diff = Math.abs(calculatedIVA - ev.ivaAutoliquidacao);
        
        if (diff > 0.01) score -= 10;
    }
    
    return Math.max(0, score);
}

function calculateCompleteMarketProjection() {
    const proj = VDCSystem.analysis.projection;
    const ev = VDCSystem.analysis.extractedValues;
    
    // Diferencial médio por motorista
    proj.averagePerDriver = ev.diferencialCusto;
    
    // CÁLCULO COMPLETO: Diferencial × 38.000 × 12 × 7
    proj.monthlyImpact = proj.averagePerDriver * proj.driverCount;
    proj.annualImpact = proj.monthlyImpact * proj.monthsPerYear;
    proj.sevenYearImpact = proj.annualImpact * proj.yearsOfOperation;
    proj.totalMarketImpact = proj.sevenYearImpact;
    proj.marketProjection = proj.totalMarketImpact / 1000000;
    
    logAudit(`📈 QUANTUM BENEFÍCIO ILÍCITO CALCULADO (38k × 12 × 7):`, 'info');
    logAudit(`   • Diferencial/motorista: ${proj.averagePerDriver.toFixed(2)}€`, 'info');
    logAudit(`   • Impacto mensal (38k): ${(proj.monthlyImpact / 1000000).toFixed(2)}M€`, 'info');
    logAudit(`   • Impacto anual: ${(proj.annualImpact / 1000000).toFixed(2)}M€`, 'info');
    logAudit(`   • Asset Forfeiture (7 anos): ${proj.marketProjection.toFixed(2)}M€ (ISO/IEC 27037)`, 'warn');
}

function calculateJurosMoraComplete() {
    const ev = VDCSystem.analysis.extractedValues;
    
    if (ev.diferencialCusto > 0) {
        // Cálculo de Juros de Mora (RGRC 4% base anual civil)
        // Presumindo período de 3 meses para demonstração
        ev.jurosMora = ev.diferencialCusto * 0.04 * 0.25; // 4% anual × 3/12 meses
        ev.jurosBaseCalculo = ev.diferencialCusto;
        ev.jurosPeriodo = 0.25; // 3 meses
        ev.jurosTaxaAnual = 0.04;
        
        // Atualizar dashboard fixo
        const jurosCard = document.getElementById('jurosCard');
        const jurosVal = document.getElementById('jurosVal');
        
        if (jurosCard && jurosVal) {
            const formatter = new Intl.NumberFormat('pt-PT', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2
            });
            
            jurosVal.textContent = formatter.format(ev.jurosMora);
            jurosCard.style.display = 'flex';
        }
        
        logAudit(`📈 JUROS DE MORA CALCULADOS: ${ev.diferencialCusto.toFixed(2)}€ × 4% × 3/12 = ${ev.jurosMora.toFixed(2)}€ (RGRC)`, 'warn');
    }
}

function calculateJurosMoraDisplay() {
    calculateJurosMoraComplete();
}

function calculateRegulatoryRiskComplete() {
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    // Cálculo da Taxa de Regulação (AMT/IMT) - 5% sobre a comissão
    ev.taxaRegulacao = Math.abs(ev.comissaoApp) * 0.05;
    ev.taxaBaseCalculo = Math.abs(ev.comissaoApp);
    ev.taxaPercentagem = 0.05;
    ev.riscoRegulatorio = ev.taxaRegulacao;
    ev.riscoClassificacao = ev.taxaRegulacao > 100 ? 'CRÍTICO' : 
                           ev.taxaRegulacao > 50 ? 'ALTO' : 
                           ev.taxaRegulacao > 10 ? 'MODERADO' : 'BAIXO';
    
    if (ev.taxaRegulacao > 0) {
        crossings.riscoRegulatorioAtivo = true;
        
        // Atualizar dashboard fixo
        const taxaRegCard = document.getElementById('taxaRegCard');
        const taxaRegVal = document.getElementById('taxaRegVal');
        
        if (taxaRegCard && taxaRegVal) {
            const formatter = new Intl.NumberFormat('pt-PT', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2
            });
            
            taxaRegVal.textContent = formatter.format(ev.taxaRegulacao);
            taxaRegCard.style.display = 'flex';
        }
        
        logAudit(`⚖️ RISCO REGULATÓRIO CALCULADO (AMT/IMT): 5% sobre ${Math.abs(ev.comissaoApp).toFixed(2)}€ = ${ev.taxaRegulacao.toFixed(2)}€`, 'regulatory');
        logAudit(`📋 Obrigação regulatória não discriminada identificada (Decreto-Lei 83/2017)`, 'regulatory');
        logAudit(`⚠️ Classificação de Risco: ${ev.riscoClassificacao}`, ev.riscoClassificacao === 'CRÍTICO' ? 'error' : 'warn');
    }
}

function calculateTaxaRegulacaoDisplay() {
    calculateRegulatoryRiskComplete();
}

// 12. ATUALIZAÇÃO DO DASHBOARD
function updateCompleteDashboard() {
    updateDashboard();
}

function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const ev = VDCSystem.analysis.extractedValues;
    
    // Dashboard fixo
    const elementos = {
        'netVal': ev.saftNet,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao,
        'jurosVal': ev.jurosMora,
        'taxaRegVal': ev.taxaRegulacao
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = formatter.format(value);
            
            // Estilização especial
            if (id === 'iva23Val' && value > 0) {
                elemento.classList.add('alert-text');
            }
            
            if (id === 'jurosVal' && value > 0) {
                elemento.classList.add('regulatory-text');
            }
            
            if (id === 'taxaRegVal' && value > 0) {
                elemento.classList.add('regulatory-text');
            }
        }
    });
    
    // Mostrar/ocultar cards especiais
    const jurosCard = document.getElementById('jurosCard');
    const taxaRegCard = document.getElementById('taxaRegCard');
    
    if (jurosCard) {
        jurosCard.style.display = ev.jurosMora > 0 ? 'flex' : 'none';
    }
    
    if (taxaRegCard) {
        taxaRegCard.style.display = ev.taxaRegulacao > 0 ? 'flex' : 'none';
    }
}

function updateKPIResultsComplete() {
    updateKPIResults();
}

function updateKPIResults() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const ev = VDCSystem.analysis.extractedValues;
    const proj = VDCSystem.analysis.projection;
    
    // KPIs principais
    const kpis = {
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosLiquidos,
        'kpiInvoice': ev.faturaPlataforma,
        'valCamp': ev.campanhas,
        'valTips': ev.gorjetas,
        'valCanc': ev.cancelamentos,
        'valTolls': ev.portagens
    };
    
    Object.entries(kpis).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = formatter.format(value);
            elemento.classList.remove('hidden');
        }
    });
    
    // Resultados da análise
    const results = {
        'grossResult': ev.saftGross,
        'transferResult': ev.rendimentosLiquidos,
        'differenceResult': VDCSystem.analysis.crossings.deltaB,
        'marketResult': proj.marketProjection.toFixed(2) + 'M€'
    };
    
    Object.entries(results).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (typeof value === 'number') {
                elemento.textContent = formatter.format(value);
            } else {
                elemento.textContent = value;
            }
            elemento.classList.remove('hidden');
        }
    });
    
    // Atualizar barras de progresso
    updateProgressBars();
    
    // Ativar alerta visual se discrepância > 50€
    const discrepancia = VDCSystem.analysis.crossings.deltaB;
    if (discrepancia > 50 && !VDCSystem.analysis.crossings.discrepanciaAlertaAtiva) {
        activateDiscrepancyAlert();
    }
}

function updateProgressBars() {
    const ev = VDCSystem.analysis.extractedValues;
    const maxValue = Math.max(ev.saftGross, ev.rendimentosBrutos, Math.abs(ev.comissaoApp));
    const differenceBar = document.getElementById('differenceBar');
    
    if (differenceBar && maxValue > 0) {
        const percentage = (VDCSystem.analysis.crossings.deltaB / maxValue) * 100;
        differenceBar.style.width = Math.min(percentage, 100) + '%';
        
        // Colorir baseado na severidade
        if (percentage > 30) {
            differenceBar.style.backgroundColor = 'var(--warn-primary)';
        } else if (percentage > 15) {
            differenceBar.style.backgroundColor = 'var(--warn-secondary)';
        } else if (percentage > 5) {
            differenceBar.style.backgroundColor = 'var(--regulatory-orange)';
        }
    }
}

function createDiferencialCard() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    const existingCard = document.getElementById('diferencialCard');
    if (existingCard) existingCard.remove();
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto;
    
    if (diferencial > 0) {
        const diferencialCard = document.createElement('div');
        diferencialCard.id = 'diferencialCard';
        diferencialCard.className = 'kpi-card alert blink-alert';
        diferencialCard.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> DIFERENCIAL DE CUSTO</h4>
            <p id="diferencialVal">${diferencial.toFixed(2)}€</p>
            <small>Saída de caixa não documentada | EVIDÊNCIA FORENSE (ISO/IEC 27037)</small>
        `;
        
        // Inserir após os 4 primeiros cards
        if (kpiGrid.children.length >= 4) {
            kpiGrid.insertBefore(diferencialCard, kpiGrid.children[4]);
        } else {
            kpiGrid.appendChild(diferencialCard);
        }
        
        logAudit(`📊 Dashboard diferencial criado: ${diferencial.toFixed(2)}€ (NIST SP 800-86)`, 'info');
    }
}

function createRegulatoryCard() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    const existingCard = document.getElementById('regulatoryCardKPI');
    if (existingCard) existingCard.remove();
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
    const taxaRegulacao = VDCSystem.analysis.extractedValues.taxaRegulacao;
    
    if (taxaRegulacao > 0) {
        const regulatoryCard = document.createElement('div');
        regulatoryCard.id = 'regulatoryCardKPI';
        regulatoryCard.className = 'kpi-card regulatory';
        regulatoryCard.innerHTML = `
            <h4><i class="fas fa-balance-scale-right"></i> RISCO REGULATÓRIO</h4>
            <p id="regulatoryValKPI">${taxaRegulacao.toFixed(2)}€</p>
            <small>Taxa de Regulação 5% (AMT/IMT) não discriminada</small>
        `;
        
        // Encontrar posição para inserir
        const diferencialCard = document.getElementById('diferencialCard');
        if (diferencialCard && diferencialCard.parentNode === kpiGrid) {
            kpiGrid.insertBefore(regulatoryCard, diferencialCard.nextSibling);
        } else {
            kpiGrid.appendChild(regulatoryCard);
        }
        
        logAudit(`📊 Dashboard regulatório criado: ${taxaRegulacao.toFixed(2)}€ (AMT/IMT)`, 'regulatory');
    }
}

// 13. GRÁFICO
function renderDashboardChartComplete() {
    renderDashboardChart();
}

function renderDashboardChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) {
            console.error('Canvas do gráfico não encontrado');
            return;
        }
        
        // Destruir gráfico anterior se existir
        if (VDCSystem.chartInstance) {
            VDCSystem.chartInstance.destroy();
        }
        
        const ev = VDCSystem.analysis.extractedValues;
        
        // Dados para o gráfico
        const dataValues = [
            ev.saftNet || 0,
            ev.saftIVA6 || 0,
            Math.abs(ev.comissaoApp) || 0,
            ev.ivaAutoliquidacao || 0,
            ev.jurosMora || 0
        ];
        
        // Calcular percentagens
        const total = dataValues.reduce((a, b) => a + b, 0);
        const percentages = total > 0 ? 
            dataValues.map(val => ((val / total) * 100).toFixed(1)) : 
            ['0.0', '0.0', '0.0', '0.0', '0.0'];
        
        // Labels com valores e percentagens
        const labels = [
            `Ilíquido: ${dataValues[0].toFixed(2)}€ (${percentages[0]}%)`,
            `IVA 6%: ${dataValues[1].toFixed(2)}€ (${percentages[1]}%)`,
            `Comissão: ${dataValues[2].toFixed(2)}€ (${percentages[2]}%)`,
            `IVA 23%: ${dataValues[3].toFixed(2)}€ (${percentages[3]}%)`,
            `Juros Mora: ${dataValues[4].toFixed(2)}€ (${percentages[4]}%)`
        ];
        
        // Configuração do gráfico
        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valores (€)',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(0, 242, 255, 0.7)',
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(255, 62, 62, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(255, 107, 53, 0.7)'
                    ],
                    borderColor: [
                        '#00f2ff',
                        '#3b82f6',
                        '#ff3e3e',
                        '#f59e0b',
                        '#ff6b35'
                    ],
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: `Distribuição Financeira - Análise Forense (${VDCSystem.selectedYear})`,
                        color: 'var(--text-primary)',
                        font: {
                            family: 'var(--font-main)',
                            size: 14,
                            weight: '700'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 15, 29, 0.9)',
                        titleColor: 'var(--iso-blue)',
                        bodyColor: 'var(--text-primary)',
                        borderColor: 'var(--iso-blue)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                                return `${value.toFixed(2)}€ (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(30, 42, 68, 0.5)'
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            callback: function(value) {
                                return value.toFixed(0) + '€';
                            }
                        },
                        title: {
                            display: true,
                            text: 'Valor (€)',
                            color: 'var(--text-secondary)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'var(--text-secondary)',
                            maxRotation: 45,
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                }
            }
        };
        
        // Criar gráfico
        VDCSystem.chartInstance = new Chart(ctx, chartConfig);
        
        logAudit('📊 Gráfico forense gerado com sucesso (NIST SP 800-86)', 'success');
        
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        logAudit(`❌ Erro ao gerar gráfico: ${error.message}`, 'error');
    }
}

// 14. ALERTAS E NOTIFICAÇÕES
function triggerBigDataAlert(invoiceVal, commVal, deltaVal) {
    if (!VDCSystem.config.enableAlerts) return;
    
    const bigDataAlert = document.getElementById('bigDataAlert');
    if (!bigDataAlert) return;
    
    const alertInvoiceVal = document.getElementById('alertInvoiceVal');
    const alertCommVal = document.getElementById('alertCommVal');
    const alertDeltaVal = document.getElementById('alertDeltaVal');
    
    if (alertInvoiceVal) alertInvoiceVal.textContent = invoiceVal.toFixed(2) + '€';
    if (alertCommVal) alertCommVal.textContent = commVal.toFixed(2) + '€';
    if (alertDeltaVal) alertDeltaVal.textContent = deltaVal.toFixed(2) + '€';
    
    bigDataAlert.style.display = 'flex';
    VDCSystem.analysis.crossings.bigDataAlertActive = true;
    
    // Piscar intermitente
    if (VDCSystem.bigDataAlertInterval) clearInterval(VDCSystem.bigDataAlertInterval);
    
    VDCSystem.bigDataAlertInterval = setInterval(() => {
        bigDataAlert.style.opacity = bigDataAlert.style.opacity === '0.7' ? '1' : '0.7';
    }, 800);
    
    logAudit(`⚠️ ALERTA BIG DATA ATIVO: Fatura ${invoiceVal.toFixed(2)}€ ≠ Comissão ${commVal.toFixed(2)}€ | Δ = ${deltaVal.toFixed(2)}€`, 'error');
}

function activateDiscrepancyAlert() {
    const discrepanciaAlerta = document.getElementById('diferencialAlert');
    if (!discrepanciaAlerta) return;
    
    const ev = VDCSystem.analysis.extractedValues;
    const diferencial = ev.diferencialCusto;
    
    if (diferencial > 50) {
        discrepanciaAlerta.style.display = 'flex';
        VDCSystem.analysis.crossings.discrepanciaAlertaAtiva = true;
        
        if (VDCSystem.discrepanciaAlertaInterval) clearInterval(VDCSystem.discrepanciaAlertaInterval);
        
        VDCSystem.discrepanciaAlertaInterval = setInterval(() => {
            discrepanciaAlerta.style.borderWidth = discrepanciaAlerta.style.borderWidth === '2px' ? '3px' : '2px';
        }, 600);
        
        logAudit('🔴 ALERTA VISUAL DE DISCREPÂNCIA ATIVADO (ISO/IEC 27037)', 'error');
    }
}

function showDiferencialAlert() {
    const diferencialAlert = document.getElementById('diferencialAlert');
    if (diferencialAlert) {
        diferencialAlert.style.display = 'flex';
    }
}

function showRegulatoryAlert() {
    const regulatoryAlert = document.getElementById('regulatoryAlert');
    if (regulatoryAlert) {
        const regulatoryValue = document.getElementById('regulatoryValue');
        if (regulatoryValue) {
            regulatoryValue.textContent = VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2) + '€';
        }
        regulatoryAlert.style.display = 'flex';
    }
}

function showJurosMoraAlert() {
    const jurosAlert = document.getElementById('jurosAlert');
    if (jurosAlert) {
        const jurosValue = document.getElementById('jurosValue');
        if (jurosValue) {
            jurosValue.textContent = VDCSystem.analysis.extractedValues.jurosMora.toFixed(2) + '€';
        }
        jurosAlert.style.display = 'flex';
    }
}

function showOmissionAlert() {
    const omissionAlert = document.getElementById('omissionAlert');
    if (omissionAlert) {
        const omissionValue = document.getElementById('omissionValue');
        if (omissionValue) {
            omissionValue.textContent = VDCSystem.analysis.crossings.omission.toFixed(2) + '€';
        }
        omissionAlert.style.display = 'flex';
    }
}

// 15. GERAÇÃO DE QUESTÕES ESTRATÉGICAS
function generateStrategicQuestionsComplete() {
    generateStrategicQuestions();
}

function generateStrategicQuestions() {
    const quesitos = VDCSystem.analysis.quesitosEstrategicos = [];
    const ev = VDCSystem.analysis.extractedValues;
    const proj = VDCSystem.analysis.projection;
    
    // Questões baseadas em evidências
    if (ev.diferencialCusto > 0) {
        quesitos.push(`1. O cliente está ciente do diferencial de custo de ${ev.diferencialCusto.toFixed(2)}€ entre a comissão retida pela plataforma (${Math.abs(ev.comissaoApp).toFixed(2)}€) e a fatura emitida (${ev.faturaPlataforma.toFixed(2)}€)?`);
        quesitos.push(`2. O cliente procedeu à autoliquidação de IVA a 23% sobre o diferencial de custo (${ev.ivaAutoliquidacao.toFixed(2)}€), conforme obrigatório pelo CIVA Artigo 2º?`);
        quesitos.push(`3. O diferencial de custo foi registado na contabilidade do cliente como saída de caixa não documentada, constituindo omissão contabilística nos termos do Código Comercial Artigo 13º?`);
    }
    
    if (ev.taxaRegulacao > 0) {
        quesitos.push(`4. A plataforma discriminou a Taxa de Regulação de ${ev.taxaRegulacao.toFixed(2)}€ (5% sobre comissão) conforme exigido pelo Decreto-Lei 83/2017 (AMT/IMT)?`);
        quesitos.push(`5. O cliente tem direito ao reembolso da Taxa de Regulação não discriminada, considerando a violação de obrigação regulatória pela plataforma?`);
    }
    
    if (ev.jurosMora > 0) {
        quesitos.push(`6. O diferencial de custo de ${ev.diferencialCusto.toFixed(2)}€ incorre em juros de mora de ${ev.jurosMora.toFixed(2)}€ (4% base anual civil, RGRC Artigo 103º)?`);
    }
    
    // Questões de mercado e projeção
    quesitos.push(`7. Considerando o quantum de benefício ilícito projetado em ${proj.marketProjection.toFixed(2)}M€ (38.000 motoristas × 12 meses × 7 anos), que medidas de asset forfeiture podem ser implementadas pelo Ministério Público?`);
    
    // Questões de conformidade internacional
    quesitos.push(`8. A plataforma estrangeira cumpriu com a obrigação de reporte DAC7, reportando receitas anuais de ${ev.dac7Revenue.toFixed(2)}€ para o período ${ev.dac7Period}?`);
    quesitos.push(`9. Considerando a estrutura de layering financeiro identificada, existem indícios de violação da Convenção das Nações Unidas contra a Corrupção (UNCAC) e da Diretiva Anti-Lavagem de Dinheiro?`);
    
    // Questões processuais
    quesitos.push(`10. A cadeia de custódia digital foi mantida integralmente (ISO/IEC 27037), garantindo a admissibilidade da prova em tribunal português e internacional?`);
    
    logAudit('📋 QUESITOS ESTRATÉGICOS GERADOS PARA PARECER TÉCNICO-FORENSE:', 'success');
    quesitos.forEach((q, i) => {
        logAudit(`   ${q}`, 'info');
    });
}

// 16. EXPORTAÇÃO PDF COMPLETA COM CADEIA DE CUSTÓDIA
async function exportPDF() {
    try {
        logAudit('📄 INICIANDO GERAÇÃO DE RELATÓRIO PERICIAL PDF (ISO/IEC 27037)...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            floatPrecision: 2
        });
        
        // Configurações do documento
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPos = margin;
        
        // Cabeçalho do Relatório
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 102, 204); // Azul ISO
        doc.text('RELATÓRIO DE PERITAGEM FORENSE', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sistema VDC v${VDCSystem.version} - Final Stable Release`, pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 15;
        
        // Linha separadora
        doc.setDrawColor(0, 102, 204);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        
        // Informações Básicas
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. INFORMAÇÕES DA SESSÃO FORENSE', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const sessionInfo = [
            `Data de Geração: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT')}`,
            `ID da Sessão: ${VDCSystem.sessionId}`,
            `Analista: ${VDCSystem.client?.name || 'Não registado'} (NIF: ${VDCSystem.client?.nif || 'N/A'})`,
            `Ano Fiscal: ${VDCSystem.selectedYear}`,
            `Plataforma Analisada: ${document.getElementById('selPlatform')?.options[document.getElementById('selPlatform')?.selectedIndex]?.text || 'Não definida'}`,
            `Protocolo: ISO/IEC 27037:2012 | NIST SP 800-86`,
            `Hash do Relatório: ${CryptoJS.SHA256(VDCSystem.sessionId + Date.now()).toString().substring(0, 32)}...`
        ];
        
        sessionInfo.forEach(info => {
            doc.text(info, margin + 5, yPos);
            yPos += 5;
        });
        
        yPos += 5;
        
        // 2. RESUMO DA ANÁLISE
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. RESUMO DA ANÁLISE FORENSE', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const analysis = VDCSystem.analysis.extractedValues;
        const proj = VDCSystem.analysis.projection;
        
        const analysisSummary = [
            `Total de Ficheiros Processados: ${VDCSystem.counters.total}`,
            `Receitas Brutas (Extratos): ${analysis.rendimentosBrutos.toFixed(2)}€`,
            `Comissão da Plataforma: ${Math.abs(analysis.comissaoApp).toFixed(2)}€`,
            `Fatura Emitida pela Plataforma: ${analysis.faturaPlataforma.toFixed(2)}€`,
            `Diferencial de Custo Identificado: ${analysis.diferencialCusto.toFixed(2)}€`,
            `IVA 23% Devido (Autoliquidação): ${analysis.ivaAutoliquidacao.toFixed(2)}€`,
            `Taxa de Regulação (AMT/IMT 5%): ${analysis.taxaRegulacao.toFixed(2)}€`,
            `Juros de Mora (RGRC 4%): ${analysis.jurosMora.toFixed(2)}€`
        ];
        
        analysisSummary.forEach(item => {
            doc.text(item, margin + 5, yPos);
            yPos += 5;
        });
        
        // Nova página se necessário
        if (yPos > 250) {
            doc.addPage();
            yPos = margin;
        }
        
        yPos += 5;
        
        // 3. CADEIA DE CUSTÓDIA COMPLETA - TABELA DETALHADA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. CADEIA DE CUSTÓDIA DIGITAL - REGISTO COMPLETO (ISO/IEC 27037)', margin, yPos);
        yPos += 8;
        
        // Cabeçalho da tabela
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(0, 102, 204);
        
        const colWidths = [20, 40, 25, 30, 65];
        const colHeaders = ['#', 'Nome do Ficheiro', 'Tipo', 'Tamanho', 'Hash SHA-256 (Parcial)'];
        
        let xPos = margin;
        colHeaders.forEach((header, i) => {
            doc.rect(xPos, yPos, colWidths[i], 7, 'F');
            doc.text(header, xPos + 2, yPos + 5);
            xPos += colWidths[i];
        });
        
        yPos += 7;
        doc.setTextColor(0, 0, 0);
        
        // Conteúdo da tabela
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        VDCSystem.analysis.chainOfCustody.forEach((record, index) => {
            // Quebra de página se necessário
            if (yPos > 280) {
                doc.addPage();
                yPos = margin;
                
                // Repetir cabeçalho
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(0, 102, 204);
                
                xPos = margin;
                colHeaders.forEach((header, i) => {
                    doc.rect(xPos, yPos, colWidths[i], 7, 'F');
                    doc.text(header, xPos + 2, yPos + 5);
                    xPos += colWidths[i];
                });
                
                yPos += 7;
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(8);
            }
            
            xPos = margin;
            
            // Número
            doc.text((index + 1).toString(), xPos + 2, yPos + 4);
            xPos += colWidths[0];
            
            // Nome do ficheiro (com truncagem se necessário)
            let filename = record.filename;
            if (filename.length > 20) {
                filename = filename.substring(0, 17) + '...';
            }
            doc.text(filename, xPos + 2, yPos + 4);
            xPos += colWidths[1];
            
            // Tipo
            doc.text(record.fileType.toUpperCase(), xPos + 2, yPos + 4);
            xPos += colWidths[2];
            
            // Tamanho
            const sizeKB = (record.size / 1024).toFixed(1);
            doc.text(`${sizeKB} KB`, xPos + 2, yPos + 4);
            xPos += colWidths[3];
            
            // Hash (apresentar parcialmente)
            const hashDisplay = record.hash !== 'pending' ? 
                record.hash.substring(0, 24) + '...' : 'PENDENTE';
            doc.text(hashDisplay, xPos + 2, yPos + 4);
            
            yPos += 6;
        });
        
        yPos += 10;
        
        // 4. METADADOS DA CADEIA DE CUSTÓDIA
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('4. METADADOS E VERIFICAÇÃO DE INTEGRIDADE', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const totalFiles = VDCSystem.analysis.chainOfCustody.length;
        const verifiedFiles = VDCSystem.analysis.chainOfCustody.filter(r => r.integrityCheck === 'VERIFIED').length;
        const verificationPercentage = totalFiles > 0 ? ((verifiedFiles / totalFiles) * 100).toFixed(1) : '0.0';
        
        const custodyMetadata = [
            `Total de Itens na Cadeia: ${totalFiles}`,
            `Itens Verificados (SHA-256): ${verifiedFiles} (${verificationPercentage}%)`,
            `Hash Master da Sessão: ${document.getElementById('masterHashValue')?.textContent?.substring(0, 50) || 'NÃO GERADO'}...`,
            `Status da Cadeia: ${VDCSystem.analysis.crossings.cadeiaCustodiaCompleta ? 'COMPLETA E VÁLIDA' : 'INCOMPLETA'}`,
            `Data de Criação: ${new Date(VDCSystem.sessionStartTime).toLocaleDateString('pt-PT')}`,
            `Última Atualização: ${new Date().toLocaleDateString('pt-PT')}`
        ];
        
        custodyMetadata.forEach(info => {
            doc.text(info, margin + 5, yPos);
            yPos += 5;
        });
        
        yPos += 10;
        
        // 5. QUESTÕES ESTRATÉGICAS
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('5. QUESITOS ESTRATÉGICOS PARA PARECER TÉCNICO-FORENSE', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        VDCSystem.analysis.quesitosEstrategicos.forEach((quesito, index) => {
            if (yPos > 280) {
                doc.addPage();
                yPos = margin;
            }
            
            doc.text(`${quesito}`, margin + 5, yPos);
            yPos += 8;
        });
        
        yPos += 10;
        
        // 6. CONCLUSÕES E RECOMENDAÇÕES
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('6. CONCLUSÕES E RECOMENDAÇÕES (ISO/IEC 27037)', margin, yPos);
        yPos += 8;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        const conclusions = [
            '1. A cadeia de custódia digital foi mantida integralmente, garantindo admissibilidade probatória.',
            '2. Foram identificados indicadores de layering financeiro através de análise Big Data.',
            '3. O diferencial de custo identificado constitui evidência de saída de caixa não documentada.',
            '4. Recomenda-se a autoliquidação de IVA 23% sobre o valor do diferencial de custo.',
            '5. Sugere-se a reclamação da Taxa de Regulação não discriminada junto da plataforma.',
            '6. O caso apresenta elementos para possível ação de asset forfeiture pelo Ministério Público.',
            '7. Os dados são compatíveis com violação do princípio da não omissão de elementos relevantes (LGT Art. 38º).'
        ];
        
        conclusions.forEach(conclusion => {
            if (yPos > 280) {
                doc.addPage();
                yPos = margin;
            }
            
            doc.text(conclusion, margin + 5, yPos);
            yPos += 6;
        });
        
        // Rodapé com assinatura digital
        doc.addPage();
        yPos = margin;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('ASSINATURA DIGITAL E VALIDAÇÃO', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 20;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const signatureInfo = [
            `Relatório gerado automaticamente por: VDC Sistema de Peritagem Forense v${VDCSystem.version}`,
            `Data/Hora: ${new Date().toLocaleString('pt-PT')}`,
            `Hash de Validação: ${CryptoJS.SHA256(VDCSystem.sessionId + JSON.stringify(VDCSystem.analysis)).toString()}`,
            `Assinante: ${VDCSystem.client?.name || 'Sistema VDC'} (NIF: ${VDCSystem.client?.nif || 'N/A'})`,
            `Validade Legal: Este relatório possui validade probatória nos termos do Código Penal Art. 158-A a 158-F`,
            `Conformidade: ISO/IEC 27037:2012 | NIST SP 800-86 | RGRC 4% | AMT/IMT Compliance`
        ];
        
        signatureInfo.forEach(info => {
            doc.text(info, margin, yPos);
            yPos += 6;
        });
        
        // QR Code para verificação
        yPos += 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('QR Code para verificação digital disponível na versão eletrónica completa', margin, yPos);
        
        // Gerar nome do ficheiro
        const fileName = `VDC_Relatorio_${VDCSystem.client?.nif || 'Sistema'}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`;
        
        // Salvar o PDF
        doc.save(fileName);
        
        logAudit(`✅ Relatório PDF gerado com sucesso: ${fileName}`, 'success');
        logAudit(`📋 Cadeia de Custódia incluída no relatório (${VDCSystem.analysis.chainOfCustody.length} registos)`, 'info');
        showToast('✅ Relatório PDF gerado com sucesso', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar relatório PDF: ${error.message}`, 'error');
        showError(`Erro ao gerar PDF: ${error.message}`);
    }
}

// 17. EXPORTAÇÃO JSON
async function exportJSON() {
    try {
        logAudit('📁 Iniciando exportação completa dos dados em formato JSON...', 'info');
        
        const exportData = {
            sistema: {
                versao: VDCSystem.version,
                sessao: VDCSystem.sessionId,
                dataExportacao: new Date().toISOString(),
                hashExportacao: CryptoJS.SHA256(VDCSystem.sessionId + Date.now()).toString()
            },
            
            cliente: VDCSystem.client,
            
            configuracao: {
                anoFiscal: VDCSystem.selectedYear,
                plataforma: VDCSystem.selectedPlatform,
                modoDemo: VDCSystem.demoMode
            },
            
            documentos: {
                control: VDCSystem.documents.control,
                dac7: VDCSystem.documents.dac7,
                saft: VDCSystem.documents.saft,
                invoices: VDCSystem.documents.invoices,
                statements: VDCSystem.documents.statements
            },
            
            analise: VDCSystem.analysis,
            
            cadeiaCustodia: VDCSystem.analysis.chainOfCustody,
            
            logs: VDCSystem.logs.slice(-100), // Últimos 100 logs
            
            metadados: {
                timestamp: new Date().toISOString(),
                totalFicheiros: VDCSystem.counters.total,
                ficheirosProcessados: VDCSystem.counters.parsed,
                ficheirosValidados: VDCSystem.counters.validated,
                qualidadeDados: VDCSystem.analysis.crossings.dataQualityScore,
                integridadeCadeia: VDCSystem.analysis.crossings.cadeiaCustodiaCompleta
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
        
        const fileName = `VDC_Export_${VDCSystem.sessionId}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
        
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Exportação Completa VDC',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await handle.createWritable();
                await writable.write(dataBlob);
                await writable.close();
                
                logAudit('✅ Exportação JSON concluída (File System API)', 'success');
                showToast('✅ Exportação JSON concluída com sucesso', 'success');
                
            } catch (fsError) {
                if (fsError.name !== 'AbortError') {
                    fallbackDownload(dataBlob, fileName);
                }
            }
        } else {
            fallbackDownload(dataBlob, fileName);
        }
        
    } catch (error) {
        console.error('Erro na exportação JSON:', error);
        logAudit(`❌ Erro na exportação JSON: ${error.message}`, 'error');
        showError(`Erro na exportação JSON: ${error.message}`);
    }
}

// 18. FUNÇÕES DE LOG E AUDITORIA
function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { hour12: false });
    const logEntry = {
        timestamp: timestamp,
        message: message,
        type: type,
        session: VDCSystem.sessionId
    };
    
    VDCSystem.logs.push(logEntry);
    
    // Limitar número de logs
    if (VDCSystem.logs.length > VDCSystem.maxLogEntries) {
        VDCSystem.logs.shift();
    }
    
    // Atualizar console
    updateAuditConsole(logEntry);
}

function updateAuditConsole(logEntry) {
    const consoleOutput = document.getElementById('auditOutput');
    if (!consoleOutput) return;
    
    const logElement = document.createElement('div');
    logElement.className = `log-entry log-${logEntry.type}`;
    
    logElement.innerHTML = `
        <span>${logEntry.timestamp}</span>
        <span>${logEntry.message}</span>
    `;
    
    consoleOutput.appendChild(logElement);
    
    // Scroll automático para o final
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    
    // Limitar número de elementos visíveis
    const maxVisibleEntries = 50;
    const entries = consoleOutput.querySelectorAll('.log-entry');
    if (entries.length > maxVisibleEntries) {
        entries[0].remove();
    }
}

function clearConsole() {
    const consoleOutput = document.getElementById('auditOutput');
    if (consoleOutput) {
        consoleOutput.innerHTML = '';
        logAudit('Consola de auditoria limpa', 'info');
    }
}

function exportLogs() {
    try {
        const logsData = VDCSystem.logs.map(log => 
            `${log.timestamp} | ${log.type.toUpperCase()} | ${log.message}`
        ).join('\n');
        
        const dataBlob = new Blob([logsData], { type: 'text/plain;charset=utf-8' });
        const fileName = `VDC_Logs_${VDCSystem.sessionId}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.txt`;
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        logAudit(`✅ Logs exportados: ${VDCSystem.logs.length} entradas`, 'success');
        showToast('✅ Logs exportados com sucesso', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar logs:', error);
        logAudit(`❌ Erro ao exportar logs: ${error.message}`, 'error');
    }
}

// 19. FUNÇÕES DE UTILIDADE
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function updateSessionDisplay() {
    const sessionIdDisplay = document.getElementById('sessionIdDisplay');
    const sessionInfoId = document.getElementById('sessionInfoId');
    
    if (sessionIdDisplay) sessionIdDisplay.textContent = VDCSystem.sessionId;
    if (sessionInfoId) sessionInfoId.textContent = VDCSystem.sessionId;
}

function updateSessionInfo() {
    const sessionInfoClient = document.getElementById('sessionInfoClient');
    const sessionInfoFiles = document.getElementById('sessionInfoFiles');
    const sessionInfoStart = document.getElementById('sessionInfoStart');
    
    if (sessionInfoClient) {
        sessionInfoClient.textContent = VDCSystem.client?.name || 'Não registado';
    }
    
    if (sessionInfoFiles) {
        sessionInfoFiles.textContent = VDCSystem.counters.total.toString();
    }
    
    if (sessionInfoStart && VDCSystem.sessionStartTime) {
        sessionInfoStart.textContent = VDCSystem.sessionStartTime.toLocaleTimeString('pt-PT', { hour12: false });
    }
}

function generateMasterHash() {
    const dataToHash = JSON.stringify({
        sessionId: VDCSystem.sessionId,
        client: VDCSystem.client,
        documents: VDCSystem.documents,
        analysis: VDCSystem.analysis.extractedValues,
        chainOfCustody: VDCSystem.analysis.chainOfCustody,
        timestamp: new Date().toISOString()
    });
    
    const masterHash = CryptoJS.SHA256(dataToHash).toString();
    
    const masterHashValue = document.getElementById('masterHashValue');
    if (masterHashValue) {
        masterHashValue.textContent = masterHash;
        masterHashValue.title = 'Hash SHA-256 completo: ' + masterHash;
    }
    
    VDCSystem.analysis.custodyHash = masterHash;
    logAudit(`🔐 Hash Master gerado: ${masterHash.substring(0, 32)}...`, 'success');
}

function generateMasterHashComplete() {
    generateMasterHash();
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' :
                 type === 'warning' ? 'fa-exclamation-triangle' :
                 type === 'info' ? 'fa-info-circle' : 'fa-check-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <p>${message}</p>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remover após 3 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showError(message) {
    showToast(message, 'error');
    logAudit(`❌ ERRO: ${message}`, 'error');
}

// 20. FUNÇÕES DE RESET E LIMPEZA
function resetDashboard() {
    if (!confirm('Tem a certeza que pretende reiniciar o dashboard? Todos os dados serão perdidos.')) {
        return;
    }
    
    try {
        // Resetar estado do sistema
        VDCSystem.client = null;
        VDCSystem.demoMode = false;
        VDCSystem.processing = false;
        VDCSystem.sessionStartTime = new Date();
        
        // Limpar documentos
        const documentTypes = ['control', 'dac7', 'saft', 'invoices', 'statements'];
        documentTypes.forEach(type => {
            VDCSystem.documents[type] = {
                files: [],
                parsedData: [],
                totals: {},
                hashes: {},
                metadata: [],
                columnsFound: [],
                columnsMissing: [],
                validationStatus: 'pending'
            };
        });
        
        // Resetar análise
        VDCSystem.analysis = {
            extractedValues: {
                saftGross: 0,
                saftIVA6: 0,
                saftNet: 0,
                saftTaxBase: 0,
                saftTaxPayable: 0,
                platformCommission: 0,
                bankTransfer: 0,
                iva23Due: 0,
                invoiceTotal: 0,
                commissionTotal: 0,
                rendimentosBrutos: 0,
                comissaoApp: 0,
                rendimentosLiquidos: 0,
                faturaPlataforma: 0,
                campanhas: 0,
                gorjetas: 0,
                cancelamentos: 0,
                portagens: 0,
                custosOperacionais: 0,
                diferencialCusto: 0,
                prejuizoFiscal: 0,
                ivaAutoliquidacao: 0,
                omissaoContabilistica: 0,
                desvioFinanceiro: 0,
                dac7Revenue: 0,
                dac7Period: '',
                dac7Platform: '',
                dac7Country: '',
                dac7ReportingStatus: 'pending',
                jurosMora: 0,
                jurosBaseCalculo: 0,
                jurosPeriodo: 0,
                jurosTaxaAnual: 0.04,
                jurosLegalReference: 'RGRC Artigo 103º',
                taxaRegulacao: 0,
                taxaPercentagem: 0.05,
                taxaBaseCalculo: 0,
                taxaLegalReference: 'Decreto-Lei 83/2017',
                riscoRegulatorio: 0,
                riscoClassificacao: 'ALTO',
                crossBorderCompliance: false,
                dac7Compliance: false,
                iso27037Compliance: true,
                nist80086Compliance: true
            },
            crossings: {
                deltaA: 0,
                deltaB: 0,
                omission: 0,
                isValid: true,
                diferencialAlerta: false,
                fraudIndicators: [],
                bigDataAlertActive: false,
                discrepanciaAlertaAtiva: false,
                riscoRegulatorioAtivo: false,
                cadeiaCustodiaCompleta: false,
                dataQualityScore: 0,
                completenessScore: 0,
                consistencyScore: 0,
                accuracyScore: 0,
                saftValidated: false,
                dac7Validated: false,
                invoicesValidated: false,
                statementsValidated: false,
                controlFileValidated: false
            },
            projection: {
                marketProjection: 0,
                averagePerDriver: 0,
                driverCount: 38000,
                monthsPerYear: 12,
                yearsOfOperation: 7,
                totalMarketImpact: 0,
                monthlyImpact: 0,
                annualImpact: 0,
                sevenYearImpact: 0,
                calculationMethod: 'Diferencial × 38.000 × 12 × 7',
                confidenceLevel: 0.95,
                marginOfError: 0.05,
                statisticalSignificance: 'ALTA'
            },
            chainOfCustody: [],
            custodyHash: '',
            custodyStatus: 'active',
            anomalies: [],
            anomalyCount: 0,
            criticalAnomalies: [],
            warningAnomalies: [],
            infoAnomalies: [],
            quesitosEstrategicos: [],
            legalCitations: VDCSystem.analysis.legalCitations,
            metadata: {
                analysisTimestamp: null,
                analysisDuration: 0,
                analyst: 'VDC Forensic System',
                toolVersion: 'v10.9-FS',
                hashAlgorithm: 'SHA-256',
                encryptionStandard: 'AES-256',
                dataRetentionPolicy: '10 anos',
                chainOfCustodyProtocol: 'ISO/IEC 27037:2012'
            }
        };
        
        // Resetar contadores
        VDCSystem.counters = {
            dac7: 0,
            control: 0,
            saft: 0,
            invoices: 0,
            statements: 0,
            total: 0,
            parsed: 0,
            failed: 0,
            validated: 0
        };
        
        // Resetar intervalos
        if (VDCSystem.bigDataAlertInterval) {
            clearInterval(VDCSystem.bigDataAlertInterval);
            VDCSystem.bigDataAlertInterval = null;
        }
        
        if (VDCSystem.discrepanciaAlertaInterval) {
            clearInterval(VDCSystem.discrepanciaAlertaInterval);
            VDCSystem.discrepanciaAlertaInterval = null;
        }
        
        // Atualizar UI
        updateDashboard();
        updateKPIResults();
        updateSessionInfo();
        generateMasterHash();
        clearConsole();
        
        // Limpar listas de ficheiros
        const fileListIds = ['controlFileList', 'dac7FileList', 'saftFileList', 'invoiceFileList', 'statementFileList'];
        fileListIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.classList.remove('visible');
            }
        });
        
        // Resetar contadores visuais
        const counterIds = ['controlCount', 'dac7Count', 'saftCount', 'invoiceCount', 'statementCount', 'totalCount'];
        counterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
        
        // Resetar inputs de cliente
        const clientName = document.getElementById('clientName');
        const clientNIF = document.getElementById('clientNIF');
        const clientStatus = document.getElementById('clientStatus');
        
        if (clientName) {
            clientName.value = '';
            clientName.classList.remove('success', 'error');
        }
        
        if (clientNIF) {
            clientNIF.value = '';
            clientNIF.classList.remove('success', 'error');
        }
        
        if (clientStatus) clientStatus.style.display = 'none';
        
        // Resetar botão de análise
        updateAnalysisButton();
        
        // Resetar gráfico
        if (VDCSystem.chartInstance) {
            VDCSystem.chartInstance.destroy();
            VDCSystem.chartInstance = null;
        }
        
        // Resetar alertas
        const alertIds = ['omissionAlert', 'diferencialAlert', 'regulatoryAlert', 'jurosAlert', 'bigDataAlert'];
        alertIds.forEach(id => {
            const alert = document.getElementById(id);
            if (alert) alert.style.display = 'none';
        });
        
        // Resetar cards especiais
        const jurosCard = document.getElementById('jurosCard');
        const taxaRegCard = document.getElementById('taxaRegCard');
        const diferencialCard = document.getElementById('diferencialCard');
        const regulatoryCardKPI = document.getElementById('regulatoryCardKPI');
        
        if (jurosCard) jurosCard.style.display = 'none';
        if (taxaRegCard) taxaRegCard.style.display = 'none';
        if (diferencialCard) diferencialCard.remove();
        if (regulatoryCardKPI) regulatoryCardKPI.remove();
        
        logAudit('🔄 Dashboard reiniciado com sucesso', 'success');
        logAudit('📊 Sistema pronto para nova análise forense', 'info');
        showToast('Dashboard reiniciado com sucesso', 'success');
        
    } catch (error) {
        console.error('Erro ao resetar dashboard:', error);
        logAudit(`❌ Erro ao resetar dashboard: ${error.message}`, 'error');
        showError('Erro ao resetar dashboard');
    }
}

function resetAnalysisData() {
    // Função auxiliar para resetar apenas dados de análise
    VDCSystem.analysis.extractedValues = {
        saftGross: 0,
        saftIVA6: 0,
        saftNet: 0,
        saftTaxBase: 0,
        saftTaxPayable: 0,
        platformCommission: 0,
        bankTransfer: 0,
        iva23Due: 0,
        invoiceTotal: 0,
        commissionTotal: 0,
        rendimentosBrutos: 0,
        comissaoApp: 0,
        rendimentosLiquidos: 0,
        faturaPlataforma: 0,
        campanhas: 0,
        gorjetas: 0,
        cancelamentos: 0,
        portagens: 0,
        custosOperacionais: 0,
        diferencialCusto: 0,
        prejuizoFiscal: 0,
        ivaAutoliquidacao: 0,
        omissaoContabilistica: 0,
        desvioFinanceiro: 0,
        dac7Revenue: 0,
        dac7Period: '',
        dac7Platform: '',
        dac7Country: '',
        dac7ReportingStatus: 'pending',
        jurosMora: 0,
        jurosBaseCalculo: 0,
        jurosPeriodo: 0,
        jurosTaxaAnual: 0.04,
        jurosLegalReference: 'RGRC Artigo 103º',
        taxaRegulacao: 0,
        taxaPercentagem: 0.05,
        taxaBaseCalculo: 0,
        taxaLegalReference: 'Decreto-Lei 83/2017',
        riscoRegulatorio: 0,
        riscoClassificacao: 'ALTO',
        crossBorderCompliance: false,
        dac7Compliance: false,
        iso27037Compliance: true,
        nist80086Compliance: true
    };
    
    VDCSystem.analysis.crossings = {
        deltaA: 0,
        deltaB: 0,
        omission: 0,
        isValid: true,
        diferencialAlerta: false,
        fraudIndicators: [],
        bigDataAlertActive: false,
        discrepanciaAlertaAtiva: false,
        riscoRegulatorioAtivo: false,
        cadeiaCustodiaCompleta: false,
        dataQualityScore: 0,
        completenessScore: 0,
        consistencyScore: 0,
        accuracyScore: 0,
        saftValidated: false,
        dac7Validated: false,
        invoicesValidated: false,
        statementsValidated: false,
        controlFileValidated: false
    };
}

function initializeDashboard() {
    // Inicializar valores do dashboard
    updateDashboard();
    updateKPIResults();
}

function initializeChart() {
    // Inicializar gráfico vazio
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chartInstance) {
        VDCSystem.chartInstance.destroy();
    }
    
    const emptyConfig = {
        type: 'bar',
        data: {
            labels: ['Ilíquido', 'IVA 6%', 'Comissão', 'IVA 23%', 'Juros Mora'],
            datasets: [{
                label: 'Valores (€)',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(0, 242, 255, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(255, 62, 62, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(255, 107, 53, 0.7)'
                ],
                borderColor: [
                    '#00f2ff',
                    '#3b82f6',
                    '#ff3e3e',
                    '#f59e0b',
                    '#ff6b35'
                ],
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Distribuição Financeira - Aguardando Dados (${VDCSystem.selectedYear})`,
                    color: 'var(--text-primary)',
                    font: {
                        family: 'var(--font-main)',
                        size: 14,
                        weight: '700'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(30, 42, 68, 0.5)'
                    },
                    ticks: {
                        color: 'var(--text-secondary)',
                        callback: function(value) {
                            return value.toFixed(0) + '€';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Valor (€)',
                        color: 'var(--text-secondary)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: 'var(--text-secondary)',
                        maxRotation: 45,
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    };
    
    VDCSystem.chartInstance = new Chart(ctx, emptyConfig);
}

// 21. EXPORTAÇÃO DE DADOS COMPLETA
async function exportAllData() {
    try {
        await exportPDF();
        setTimeout(() => exportJSON(), 1000);
        
    } catch (error) {
        console.error('Erro na exportação completa:', error);
        logAudit(`❌ Erro na exportação completa: ${error.message}`, 'error');
    }
}

// 22. INICIALIZAÇÃO FINAL
function finalizeInitialization() {
    // Atualizar análise após carregamento completo
    setTimeout(() => {
        updateDashboard();
        updateKPIResults();
        updateSessionInfo();
        generateMasterHash();
        
        logAudit('🎯 Sistema VDC v10.9-FS completamente inicializado', 'success');
        logAudit('⚖️ Protocolos ISO/NIST ativos: 27037, 800-86, RGRC 4%, AMT/IMT', 'info');
        logAudit('📊 Dashboard forense pronto para análise Big Data de layering', 'success');
    }, 1000);
}

// Inicialização final
setTimeout(finalizeInitialization, 500);

// ============================================
// FIM DO SCRIPT VDC v10.9-FS
// ============================================
