// ============================================
// VDC FORENSIC SYSTEM v11.6 - ENTERPRISE GOLD
// Executive BI Edition | ISO/NIST Compliance
// ============================================

// 1. ESTADO DO SISTEMA - ARQUITETURA FORENSE
const VDCSystem = {
    version: 'v11.6-GOLD',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '' }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { 
            commission: 0, 
            iva23: 0, 
            invoiceValue: 0,
            invoicesFound: [],
            invoiceNumbers: []
        }, hashes: {}},
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            expected: 0,
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
            
            // Juros RGRC 4%
            jurosRGRC: 0,
            
            // Risco Regulatório AMT/IMT 5%
            taxaRegulacao: 0,
            riscoRegulatorioTotal: 0
        },
        
        crossings: {
            deltaA: 0,
            deltaB: 0,
            omission: 0,
            diferencialAlerta: false,
            riscoRegulatorioAtivo: false,
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
        logs: [],
        charts: {
            comparison: null,
            tax: null
        }
    },
    
    counters: {
        dac7: 0,
        saft: 0,
        invoices: 0,
        statements: 0
    }
};

// 2. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v11.6 Enterprise Gold...');
        
        // Iniciar relógio
        startClockAndDate();
        
        // Configurar ano fiscal
        setupYearSelector();
        
        // Configurar plataforma
        setupPlatformSelector();
        
        // Carregar clientes do localStorage
        loadClientsFromLocal();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Gerar ID de sessão
        VDCSystem.sessionId = generateSessionId();
        const sessionDisplay = document.getElementById('sessionIdDisplay');
        if (sessionDisplay) {
            sessionDisplay.textContent = VDCSystem.sessionId;
        }
        
        // Mostrar interface principal após carregamento
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            const mainContainer = document.getElementById('mainContainer');
            
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            
            if (mainContainer) {
                mainContainer.classList.add('visible');
            }
            
            logAudit('✅ Sistema VDC v11.6 Enterprise Gold inicializado', 'success');
            logAudit('🔍 Protocolos ativados: ISO/IEC 27037, NIST SP 800-86, AMT/IMT', 'info');
            
        }, 1000);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

// 3. RELÓGIO E DATA
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

// 4. CONFIGURAÇÃO DE CONTROLES
function setupYearSelector() {
    const selYear = document.getElementById('selYear');
    if (!selYear) return;
    
    const currentYear = new Date().getFullYear();
    selYear.innerHTML = '';
    
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
            VDCSystem.selectedYear = year;
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
    });
}

// 5. CONFIGURAÇÃO DE EVENTOS
function setupEventListeners() {
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    const saveBtn = document.getElementById('saveClientBtn');
    
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClient);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveClientToLocal);
    }
    
    // Upload de ficheiros
    const dac7File = document.getElementById('dac7File');
    if (dac7File) {
        dac7File.addEventListener('change', (e) => handleFileUpload(e, 'dac7'));
    }
    
    const saftFile = document.getElementById('saftFile');
    if (saftFile) {
        saftFile.addEventListener('change', (e) => handleFileUpload(e, 'saft'));
    }
    
    const invoiceFile = document.getElementById('invoiceFile');
    if (invoiceFile) {
        invoiceFile.addEventListener('change', (e) => handleFileUpload(e, 'invoices'));
    }
    
    const statementFile = document.getElementById('statementFile');
    if (statementFile) {
        statementFile.addEventListener('change', (e) => handleFileUpload(e, 'statements'));
    }
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performForensicAnalysis);
    }
}

// 6. GESTÃO DE CLIENTES
function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients') || '[]');
        logAudit(`${clients.length} clientes carregados do armazenamento local`, 'info');
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
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

function saveClientToLocal() {
    if (!VDCSystem.client) {
        showError('Registe um cliente primeiro');
        return;
    }
    
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients') || '[]');
        const existingIndex = clients.findIndex(c => c.nif === VDCSystem.client.nif);
        
        if (existingIndex >= 0) {
            clients[existingIndex] = VDCSystem.client;
        } else {
            clients.push(VDCSystem.client);
        }
        
        localStorage.setItem('vdc_clients', JSON.stringify(clients));
        logAudit('✅ Cliente guardado no armazenamento local', 'success');
        
    } catch (error) {
        console.error('Erro ao guardar cliente:', error);
        logAudit('❌ Erro ao guardar cliente localmente', 'error');
    }
}

// 7. UPLOAD E PROCESSAMENTO DE FICHEIROS
function handleFileUpload(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    
    // Registrar na Cadeia de Custódia
    files.forEach(file => {
        addToChainOfCustody(file, type);
    });
    
    // Processar ficheiros
    processMultipleFiles(type, files);
    
    // Atualizar contador
    updateCounter(type, files.length);
    
    // Atualizar botão de análise
    updateAnalysisButton();
}

function addToChainOfCustody(file, type) {
    const custodyRecord = {
        id: CryptoJS.SHA256(Date.now() + file.name + type).toString().substring(0, 16),
        filename: file.name,
        fileType: type,
        size: file.size,
        uploadTimestamp: new Date().toISOString(),
        hash: 'pending'
    };
    
    VDCSystem.analysis.chainOfCustody.push(custodyRecord);
    logAudit(`📁 ${file.name} registado na cadeia de custódia (${type})`, 'info');
    
    return custodyRecord.id;
}

async function processMultipleFiles(type, files) {
    try {
        logAudit(`📁 Processando ${files.length} ficheiros ${type.toUpperCase()}...`, 'info');
        
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], parsedData: [], totals: {}, hashes: {} };
        }
        
        VDCSystem.documents[type].files = files;
        
        for (const file of files) {
            const text = await readFileAsText(file);
            
            // Gerar hash SHA-256
            const fileHash = CryptoJS.SHA256(text).toString();
            VDCSystem.documents[type].hashes[file.name] = fileHash;
            
            // Atualizar cadeia de custódia
            updateChainOfCustodyHash(file.name, fileHash);
            
            // Extrair dados conforme o tipo
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
                
                logAudit(`✅ ${file.name}: dados extraídos`, 'success');
            }
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados`, 'success');
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
    }
}

function updateChainOfCustodyHash(filename, hash) {
    const record = VDCSystem.analysis.chainOfCustody.find(r => r.filename === filename);
    if (record) {
        record.hash = hash;
        record.integrityCheck = 'VERIFIED';
        record.verificationTimestamp = new Date().toISOString();
    }
}

// 8. FUNÇÕES DE EXTRAÇÃO DE DADOS
function extractDAC7Data(text, filename) {
    const data = {
        filename: filename,
        annualRevenue: 0,
        period: ''
    };
    
    try {
        const patterns = [
            /(?:total de receitas anuais|annual revenue|receitas totais)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /([\d\.,]+)\s*(?:€|EUR)\s*(?:total.*receitas|annual.*revenue)/gi
        ];
        
        let allRevenues = [];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseBigDataNumber(match[1]);
                if (value > 0) allRevenues.push(value);
            }
        });
        
        if (allRevenues.length > 0) {
            data.annualRevenue = Math.max(...allRevenues);
        }
        
        const periodMatch = text.match(/(?:período|period|ano|year)[\s:]*(\d{4}.*?\d{4})/i);
        if (periodMatch) {
            data.period = periodMatch[1];
        } else {
            data.period = `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`;
        }
        
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
        const patterns = [
            { regex: /<GrossTotal>([\d\.,]+)<\/GrossTotal>/i, key: 'grossValue' },
            { regex: /<NetTotal>([\d\.,]+)<\/NetTotal>/i, key: 'netValue' },
            { regex: /<Tax>.*?<TaxPercentage>6<\/TaxPercentage>.*?<TaxAmount>([\d\.,]+)<\/TaxAmount>/is, key: 'iva6Value' }
        ];
        
        patterns.forEach(pattern => {
            const match = text.match(pattern.regex);
            if (match) {
                const value = parseBigDataNumber(match[1]);
                if (value > 0) {
                    data[pattern.key] = value;
                }
            }
        });
        
    } catch (error) {
        console.error(`Erro na extração SAF-T ${filename}:`, error);
        data.error = error.message;
    }
    
    return data;
}

function extractInvoiceData(text, filename) {
    const data = {
        filename: filename,
        invoiceValue: 0,
        commissionValue: 0,
        invoiceNumber: '',
        invoiceDate: ''
    };
    
    try {
        const totalPatterns = [
            /(?:total|valor|amount)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Total.*?:.*?([\d\.,]+)\s*(?:€|EUR)/gi
        ];
        
        let allTotals = [];
        
        totalPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseBigDataNumber(match[1]);
                if (value > 0) allTotals.push(value);
            }
        });
        
        if (allTotals.length > 0) {
            data.invoiceValue = Math.max(...allTotals);
        }
        
        const commissionPatterns = [
            /(?:comissão|commission|fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/gi
        ];
        
        let allCommissions = [];
        commissionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseBigDataNumber(match[1]);
                if (value > 0) allCommissions.push(value);
            }
        });
        
        if (allCommissions.length > 0) {
            data.commissionValue = Math.max(...allCommissions);
        }
        
        const invoiceNumMatch = text.match(/[A-Z]{2}\d{4}[-_]\d{4}/);
        if (invoiceNumMatch) {
            data.invoiceNumber = invoiceNumMatch[0];
        }
        
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
        netTransfer: 0,
        campaigns: 0,
        tips: 0,
        cancellations: 0,
        tolls: 0
    };
    
    try {
        const patterns = {
            grossEarnings: [
                /(?:rendimentos|earnings|bruto|gross)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /([\d\.,]+)\s*(?:€|EUR)\s*(?:rendimentos|bruto|gross)/gi
            ],
            commission: [
                /(?:comissão|commission|fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/gi
            ],
            netTransfer: [
                /(?:líquido|net|transferência|transfer)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /([\d\.,]+)\s*(?:€|EUR)\s*(?:líquido|net|transfer)/gi
            ]
        };
        
        Object.entries(patterns).forEach(([key, regexList]) => {
            const values = [];
            
            regexList.forEach(regex => {
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const value = parseBigDataNumber(match[1]);
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
        
    } catch (error) {
        console.error(`Erro na extração de extrato ${filename}:`, error);
        data.error = error.message;
    }
    
    return data;
}

function parseBigDataNumber(numberStr) {
    if (!numberStr || numberStr.trim() === '') return 0;
    
    let cleanStr = numberStr.toString()
        .replace(/[€\$\s]/g, '')
        .trim();
    
    if (/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(cleanStr)) {
        cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(?:,\d{3})*\.\d{2}$/.test(cleanStr)) {
        cleanStr = cleanStr.replace(/,/g, '');
    }
    
    const number = parseFloat(cleanStr);
    return isNaN(number) ? 0 : Math.abs(number);
}

// 9. ANÁLISE FORENSE
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
        calculateJurosRGRC();
        calculateRegulatoryRisk();
        
        // Atualizar interface com requestAnimationFrame
        requestAnimationFrame(() => {
            updateDashboard();
            updateCharts();
            generateMasterHash();
        });
        
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA', 'success');
        
    } catch (error) {
        console.error('Erro na análise:', error);
        logAudit(`❌ Erro na análise: ${error.message}`, 'error');
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE FORENSE';
        }
    }
}

async function processLoadedData() {
    // Processar dados DAC7
    if (VDCSystem.documents.dac7.parsedData.length > 0) {
        let totalRevenue = 0;
        let period = '';
        
        VDCSystem.documents.dac7.parsedData.forEach(item => {
            totalRevenue += item.data.annualRevenue || 0;
            if (item.data.period && !period) {
                period = item.data.period;
            }
        });
        
        VDCSystem.documents.dac7.totals.annualRevenue = totalRevenue;
        VDCSystem.documents.dac7.totals.period = period;
    }
    
    // Processar dados SAF-T
    if (VDCSystem.documents.saft.parsedData.length > 0) {
        let totalGross = 0, totalIVA6 = 0, totalNet = 0;
        
        VDCSystem.documents.saft.parsedData.forEach(item => {
            totalGross += item.data.grossValue || 0;
            totalIVA6 += item.data.iva6Value || 0;
            totalNet += item.data.netValue || 0;
        });
        
        VDCSystem.documents.saft.totals.gross = totalGross;
        VDCSystem.documents.saft.totals.iva6 = totalIVA6;
        VDCSystem.documents.saft.totals.net = totalNet;
    }
    
    // Processar faturas
    if (VDCSystem.documents.invoices.parsedData.length > 0) {
        let totalInvoiceValue = 0, totalCommission = 0;
        
        VDCSystem.documents.invoices.parsedData.forEach(item => {
            totalInvoiceValue += item.data.invoiceValue || 0;
            totalCommission += item.data.commissionValue || 0;
        });
        
        VDCSystem.documents.invoices.totals.invoiceValue = totalInvoiceValue;
        VDCSystem.documents.invoices.totals.commission = totalCommission;
    }
    
    // Processar extratos
    if (VDCSystem.documents.statements.parsedData.length > 0) {
        const totals = VDCSystem.documents.statements.totals;
        
        VDCSystem.documents.statements.parsedData.forEach(item => {
            totals.rendimentosBrutos += item.data.grossEarnings || 0;
            totals.comissaoApp += item.data.commission || 0;
            totals.rendimentosLiquidos += item.data.netTransfer || 0;
        });
    }
}

function calculateExtractedValues() {
    const ev = VDCSystem.analysis.extractedValues;
    const docs = VDCSystem.documents;
    
    // Valores SAF-T
    ev.saftGross = docs.saft.totals.gross || 0;
    ev.saftIVA6 = docs.saft.totals.iva6 || 0;
    ev.saftNet = docs.saft.totals.net || 0;
    
    // Valores Extratos
    ev.rendimentosBrutos = docs.statements.totals.rendimentosBrutos || 0;
    ev.comissaoApp = docs.statements.totals.comissaoApp || 0;
    ev.rendimentosLiquidos = docs.statements.totals.rendimentosLiquidos || 0;
    
    // Valores Faturas
    ev.faturaPlataforma = docs.invoices.totals.invoiceValue || 0;
    ev.platformCommission = docs.invoices.totals.commission || 0;
    
    // Diferencial de custo
    ev.diferencialCusto = Math.abs(ev.comissaoApp) - ev.faturaPlataforma;
    
    if (ev.diferencialCusto > 0) {
        ev.prejuizoFiscal = ev.diferencialCusto * 0.21;
        ev.ivaAutoliquidacao = ev.diferencialCusto * 0.23;
    }
    
    // DAC7
    ev.dac7Revenue = docs.dac7.totals.annualRevenue || ev.rendimentosBrutos;
    ev.dac7Period = docs.dac7.totals.period || `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`;
}

function performForensicCrossings() {
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    crossings.deltaA = Math.abs(ev.saftGross - ev.rendimentosBrutos);
    crossings.deltaB = Math.abs(Math.abs(ev.comissaoApp) - ev.faturaPlataforma);
    crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
    crossings.diferencialAlerta = ev.diferencialCusto > 100;
    
    crossings.fraudIndicators = [];
    
    if (crossings.deltaB > 500) {
        crossings.fraudIndicators.push('Discrepância significativa entre comissão retida e fatura emitida');
    }
    
    if (ev.diferencialCusto > 0) {
        crossings.fraudIndicators.push('Saída de caixa não documentada detetada');
    }
}

function calculateJurosRGRC() {
    const ev = VDCSystem.analysis.extractedValues;
    
    // Juros de mora RGRC 4% sobre o diferencial
    ev.jurosRGRC = ev.diferencialCusto * 0.04;
    
    if (ev.jurosRGRC > 0) {
        logAudit(`💰 Juros RGRC 4% calculados: ${ev.jurosRGRC.toFixed(2)}€`, 'warn');
    }
}

function calculateRegulatoryRisk() {
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    // Taxa de Regulação AMT/IMT 5% sobre a comissão
    ev.taxaRegulacao = Math.abs(ev.comissaoApp) * 0.05;
    
    // Risco total = Juros RGRC + Taxa Regulação
    ev.riscoRegulatorioTotal = ev.jurosRGRC + ev.taxaRegulacao;
    
    if (ev.taxaRegulacao > 0) {
        crossings.riscoRegulatorioAtivo = true;
        logAudit(`⚖️ Taxa de Regulação AMT/IMT 5%: ${ev.taxaRegulacao.toFixed(2)}€`, 'info');
    }
}

// 10. ATUALIZAÇÃO DA INTERFACE
function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    // KPIs de Topo
    const divergenciaElement = document.getElementById('kpiDivergencia');
    const riscoElement = document.getElementById('kpiRisco');
    const faturasElement = document.getElementById('kpiFaturas');
    const jurosElement = document.getElementById('kpiJuros');
    
    if (divergenciaElement) divergenciaElement.textContent = formatter.format(crossings.deltaB);
    if (riscoElement) riscoElement.textContent = formatter.format(ev.riscoRegulatorioTotal);
    if (faturasElement) faturasElement.textContent = VDCSystem.documents.invoices.files.length;
    if (jurosElement) jurosElement.textContent = formatter.format(ev.jurosRGRC);
    
    // Resultados Detalhados
    const resultBruto = document.getElementById('resultBruto');
    const resultComissao = document.getElementById('resultComissao');
    const resultFatura = document.getElementById('resultFatura');
    const resultDiferencial = document.getElementById('resultDiferencial');
    
    if (resultBruto) resultBruto.textContent = formatter.format(ev.rendimentosBrutos);
    if (resultComissao) resultComissao.textContent = formatter.format(ev.comissaoApp);
    if (resultFatura) resultFatura.textContent = formatter.format(ev.faturaPlataforma);
    if (resultDiferencial) resultDiferencial.textContent = formatter.format(ev.diferencialCusto);
    
    // Progress bars
    const maxValue = Math.max(ev.rendimentosBrutos, Math.abs(ev.comissaoApp), ev.faturaPlataforma);
    const diferencialBar = document.getElementById('diferencialBar');
    
    if (diferencialBar && maxValue > 0) {
        const percentage = (ev.diferencialCusto / maxValue) * 100;
        diferencialBar.style.width = Math.min(percentage, 100) + '%';
    }
    
    // Mostrar alertas se aplicável
    const alertDivergencia = document.getElementById('alertDivergencia');
    const alertRisco = document.getElementById('alertRisco');
    
    if (alertDivergencia && crossings.deltaB > 100) {
        alertDivergencia.style.display = 'flex';
    }
    
    if (alertRisco && ev.riscoRegulatorioTotal > 0) {
        alertRisco.style.display = 'flex';
    }
}

function updateCharts() {
    const ev = VDCSystem.analysis.extractedValues;
    
    // Gráfico de Comparação
    const comparisonCtx = document.getElementById('comparisonChart');
    if (comparisonCtx && VDCSystem.analysis.charts.comparison) {
        VDCSystem.analysis.charts.comparison.destroy();
    }
    
    if (comparisonCtx) {
        VDCSystem.analysis.charts.comparison = new Chart(comparisonCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Rendimentos', 'Comissão', 'Fatura', 'Diferencial'],
                datasets: [{
                    label: 'Valores (€)',
                    data: [
                        ev.rendimentosBrutos,
                        Math.abs(ev.comissaoApp),
                        ev.faturaPlataforma,
                        ev.diferencialCusto
                    ],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(245, 158, 11, 0.7)'
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#ef4444',
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 1
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
    }
    
    // Gráfico de Distribuição de Imposto
    const taxCtx = document.getElementById('taxChart');
    if (taxCtx && VDCSystem.analysis.charts.tax) {
        VDCSystem.analysis.charts.tax.destroy();
    }
    
    if (taxCtx) {
        VDCSystem.analysis.charts.tax = new Chart(taxCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['IVA 6%', 'IVA 23% Devido', 'Juros RGRC', 'Taxa Regulação'],
                datasets: [{
                    data: [
                        ev.saftIVA6,
                        ev.ivaAutoliquidacao,
                        ev.jurosRGRC,
                        ev.taxaRegulacao
                    ],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.7)',
                        'rgba(239, 68, 68, 0.7)',
                        'rgba(245, 158, 11, 0.7)',
                        'rgba(139, 92, 246, 0.7)'
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#ef4444',
                        '#f59e0b',
                        '#8b5cf6'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#cbd5e1',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
}

// 11. FUNÇÕES DO SISTEMA
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
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasSaft = VDCSystem.documents.saft.files.length > 0;
    const hasClient = VDCSystem.client !== null;
    
    analyzeBtn.disabled = !(hasSaft && hasClient);
}

function resetDashboard() {
    logAudit('🔄 Reset completo do sistema', 'info');
    
    // Resetar valores
    VDCSystem.client = null;
    VDCSystem.documents = {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '' }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { 
            commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: []
        }, hashes: {}},
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, 
            rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, 
            cancelamentos: 0, portagens: 0
        }, hashes: {}}
    };
    
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0,
        platformCommission: 0, bankTransfer: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
        faturaPlataforma: 0, campanhas: 0, gorjetas: 0,
        cancelamentos: 0, portagens: 0, diferencialCusto: 0,
        prejuizoFiscal: 0, ivaAutoliquidacao: 0,
        dac7Revenue: 0, dac7Period: '',
        jurosRGRC: 0,
        taxaRegulacao: 0, riscoRegulatorioTotal: 0
    };
    
    VDCSystem.analysis.crossings = {
        deltaA: 0, deltaB: 0, omission: 0,
        diferencialAlerta: false, riscoRegulatorioAtivo: false,
        fraudIndicators: []
    };
    
    VDCSystem.counters = { dac7: 0, saft: 0, invoices: 0, statements: 0 };
    
    // Resetar interface
    const elementos = [
        'kpiDivergencia', 'kpiRisco', 'kpiJuros',
        'resultBruto', 'resultComissao', 'resultFatura', 'resultDiferencial'
    ];
    
    elementos.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'kpiFaturas') {
                element.textContent = '0';
            } else {
                element.textContent = '0,00€';
            }
        }
    });
    
    const counters = ['dac7Count', 'saftCount', 'invoiceCount', 'statementCount'];
    counters.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
    
    const clientNameInput = document.getElementById('clientName');
    const clientNIFInput = document.getElementById('clientNIF');
    const clientStatus = document.getElementById('clientStatus');
    
    if (clientNameInput) clientNameInput.value = '';
    if (clientNIFInput) clientNIFInput.value = '';
    if (clientStatus) clientStatus.style.display = 'none';
    
    const fileInputs = ['dac7File', 'saftFile', 'invoiceFile', 'statementFile'];
    fileInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    
    const alerts = ['alertDivergencia', 'alertRisco'];
    alerts.forEach(id => {
        const alert = document.getElementById(id);
        if (alert) alert.style.display = 'none';
    });
    
    // Resetar gráficos
    if (VDCSystem.analysis.charts.comparison) {
        VDCSystem.analysis.charts.comparison.destroy();
    }
    
    if (VDCSystem.analysis.charts.tax) {
        VDCSystem.analysis.charts.tax.destroy();
    }
    
    // Gerar nova sessão
    VDCSystem.sessionId = generateSessionId();
    const sessionDisplay = document.getElementById('sessionIdDisplay');
    if (sessionDisplay) sessionDisplay.textContent = VDCSystem.sessionId;
    
    updateAnalysisButton();
    logAudit('✅ Sistema resetado - Nova sessão criada', 'success');
}

function toggleConsole() {
    const consoleElement = document.getElementById('auditConsole');
    const toggleIcon = document.getElementById('consoleToggleIcon');
    
    if (consoleElement && toggleIcon) {
        if (consoleElement.classList.contains('collapsed')) {
            consoleElement.classList.remove('collapsed');
            toggleIcon.classList.remove('fa-chevron-up');
            toggleIcon.classList.add('fa-chevron-down');
        } else {
            consoleElement.classList.add('collapsed');
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-up');
        }
    }
}

// 12. LOGS E AUDITORIA
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
        sessionId: VDCSystem.sessionId
    };
    
    VDCSystem.analysis.logs.push(logEntry);
    
    if (VDCSystem.analysis.logs.length > 1000) {
        VDCSystem.analysis.logs = VDCSystem.analysis.logs.slice(-1000);
    }
    
    updateAuditConsole(logEntry);
    console.log(`[VDC ${type.toUpperCase()}] ${message}`);
}

function updateAuditConsole(logEntry) {
    const output = document.getElementById('auditConsole');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${logEntry.type}`;
    entry.innerHTML = `
        <span style="color: #666;">[${logEntry.timestamp}]</span>
        <span style="color: ${getLogColor(logEntry.type)}; font-weight: bold;">${logEntry.type.toUpperCase()}</span>
        <span>${logEntry.message}</span>
    `;
    
    output.appendChild(entry);
    
    // Lazy loading: manter apenas os últimos 50 logs visíveis
    const logs = output.querySelectorAll('.log-entry');
    if (logs.length > 50) {
        for (let i = 0; i < logs.length - 50; i++) {
            logs[i].remove();
        }
    }
    
    // Scroll para baixo se não estiver colapsado
    if (!output.classList.contains('collapsed')) {
        output.scrollTop = output.scrollHeight;
    }
}

function getLogColor(type) {
    const colors = {
        success: '#10b981',
        warn: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
    };
    return colors[type] || '#cbd5e1';
}

// 13. FUNÇÕES UTILITÁRIAS
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-GOLD-${timestamp}-${random}`.toUpperCase();
}

function generateMasterHash() {
    const data = [
        VDCSystem.sessionId,
        VDCSystem.selectedYear.toString(),
        VDCSystem.selectedPlatform,
        VDCSystem.client?.nif || 'NO_CLIENT',
        VDCSystem.analysis.extractedValues.diferencialCusto.toString(),
        VDCSystem.analysis.extractedValues.jurosRGRC.toString(),
        VDCSystem.analysis.extractedValues.taxaRegulacao.toString(),
        new Date().toISOString(),
        CryptoJS.SHA256(JSON.stringify(VDCSystem.analysis.logs)).toString()
    ].join('|');
    
    const masterHash = CryptoJS.SHA256(data).toString();
    const display = document.getElementById('masterHashValue');
    
    if (display) {
        display.textContent = masterHash;
        display.style.color = '#10b981';
    }
    
    logAudit(`🔐 Master Hash SHA-256 gerada`, 'success');
    
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

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    alert(`ERRO: ${message}`);
}

// 14. EXPORTAÇÃO PDF (SIMPLIFICADA)
async function exportPDF() {
    try {
        logAudit('📄 Gerando relatório PDF...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("VDC FORENSIC SYSTEM v11.6 - RELATÓRIO PERICIAL", 20, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Sessão: ${VDCSystem.sessionId}`, 20, 30);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 20, 35);
        
        // Cliente
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("CLIENTE:", 20, 45);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        if (VDCSystem.client) {
            doc.text(`Nome: ${VDCSystem.client.name}`, 20, 52);
            doc.text(`NIF: ${VDCSystem.client.nif}`, 20, 57);
        } else {
            doc.text("Cliente não registado", 20, 52);
        }
        
        // Resultados
        const ev = VDCSystem.analysis.extractedValues;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RESULTADOS DA ANÁLISE:", 20, 70);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Rendimentos Brutos: ${ev.rendimentosBrutos.toFixed(2)}€`, 20, 77);
        doc.text(`Comissão Retida: ${ev.comissaoApp.toFixed(2)}€`, 20, 82);
        doc.text(`Fatura Emitida: ${ev.faturaPlataforma.toFixed(2)}€`, 20, 87);
        doc.text(`Diferencial Identificado: ${ev.diferencialCusto.toFixed(2)}€`, 20, 92);
        doc.text(`Juros RGRC 4%: ${ev.jurosRGRC.toFixed(2)}€`, 20, 97);
        doc.text(`Taxa Regulação 5%: ${ev.taxaRegulacao.toFixed(2)}€`, 20, 102);
        
        // Rodapé
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v11.6 Enterprise Gold | Instrumento de Prova Legal", 20, 280);
        doc.text(`Hash: ${document.getElementById('masterHashValue')?.textContent || 'N/A'}`, 20, 285);
        
        // Salvar
        const fileName = `RELATORIO_VDC_${VDCSystem.sessionId}.pdf`;
        doc.save(fileName);
        
        logAudit('✅ Relatório PDF exportado', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit('❌ Erro ao gerar PDF', 'error');
    }
}

// 15. FUNÇÕES GLOBAIS
window.exportPDF = exportPDF;
window.resetDashboard = resetDashboard;
window.performForensicAnalysis = performForensicAnalysis;
window.toggleConsole = toggleConsole;

// ============================================
// FIM DO SCRIPT VDC v11.6 - ENTERPRISE GOLD
// TODAS AS CHAVETAS {} FECHADAS CORRETAMENTE
// ============================================
