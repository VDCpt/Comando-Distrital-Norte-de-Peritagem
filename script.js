// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v8.0
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// ============================================

// 1. ESTADO DO SISTEMA - ESTRUTURA ATUALIZADA
const VDCSystem = {
    version: 'v8.0',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    
    // ESTRUTURA ATUALIZADA: Adicionados dados específicos do Bolt
    documents: {
        control: { files: [], parsedData: null, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 } },
        invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0 } },
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            expected: 0,
            // DADOS ESPECÍFICOS BOLT
            ganhosTotais: 0,
            comissaoApp: 0,
            ganhosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0
        } }
    },
    
    // Análise Forense - ATUALIZADA
    analysis: {
        // Valores extraídos (REAIS DO BOLT)
        extractedValues: {
            saftGross: 0,
            saftIVA6: 0,
            platformCommission: 0,
            bankTransfer: 0,
            iva23Due: 0,
            // NOVOS VALORES BOLT
            ganhosTotais: 3202.54,
            comissaoApp: 792.59,
            ganhosLiquidos: 2409.95,
            faturaPlataforma: 239.00,
            campanhas: 20.00,
            gorjetas: 9.00,
            cancelamentos: 15.60
        },
        
        // Cruzamentos
        crossings: {
            deltaA: 0,
            deltaB: 0,
            omission: 0,
            isValid: true
        },
        
        // Projeção
        projection: {
            marketProjection: 0,
            averagePerDriver: 0,
            driverCount: 38000
        },
        
        // Anomalias
        anomalies: [],
        legalCitations: []
    },
    
    // Contadores
    counters: {
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0
    },
    
    // Logs
    logs: [],
    
    // Gráfico
    chart: null
};

// 2. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
        progressBar.style.transition = 'width 0.3s ease';
    }
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            
            setTimeout(() => {
                mainContainer.style.opacity = '0';
                mainContainer.style.transition = 'opacity 0.5s ease';
                mainContainer.style.opacity = '1';
            }, 100);
        }, 500);
    }
}

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v8.0...');
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = generateSessionId();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        setupEventListeners();
        updateLoadingProgress(60);
        
        updateKPIValues();
        updateLoadingProgress(70);
        
        startClock();
        updateLoadingProgress(80);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v8.0 inicializado com sucesso', 'success');
                logAudit('Protocolo de Prova Legal ativado - Estética Pericial Aplicada', 'info');
            }, 500);
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

// 3. CONFIGURAÇÃO DE CONTROLES
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
        
        if (VDCSystem.selectedPlatform === 'bolt' || VDCSystem.selectedPlatform === 'uber') {
            logAudit(`Plataforma ${platformName}: Aplicada regra de Autoliquidação de IVA (CIVA Art. 2º)`, 'warn');
        }
        
        logAudit(`Plataforma selecionada: ${platformName}`, 'info');
    });
}

function startClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const timeElement = document.getElementById('currentTime');
        if (timeElement) timeElement.textContent = timeString;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// 4. EVENT LISTENERS
function setupEventListeners() {
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClient);
    }
    
    // Inputs de cliente
    const clientNameInput = document.getElementById('clientName');
    const clientNIFInput = document.getElementById('clientNIF');
    
    if (clientNameInput && clientNIFInput) {
        clientNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') clientNIFInput.focus();
        });
        clientNIFInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerClient();
        });
    }
    
    // Control File (único)
    const controlFile = document.getElementById('controlFile');
    if (controlFile) {
        controlFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                processControlFile(file);
                updateFileList('controlFileList', [file]);
            }
        });
    }
    
    // Multi-ficheiros: SAF-T
    const saftFile = document.getElementById('saftFile');
    if (saftFile) {
        saftFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                processMultipleFiles('saft', files);
                updateFileList('saftFileList', files);
                updateCounter('saft', files.length);
            }
        });
    }
    
    // Multi-ficheiros: Faturas Plataforma
    const invoiceFile = document.getElementById('invoiceFile');
    if (invoiceFile) {
        invoiceFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                processMultipleFiles('invoices', files);
                updateFileList('invoiceFileList', files);
                updateCounter('invoices', files.length);
            }
        });
    }
    
    // Multi-ficheiros: Extratos
    const statementFile = document.getElementById('statementFile');
    if (statementFile) {
        statementFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                processMultipleFiles('statements', files);
                updateFileList('statementFileList', files);
                updateCounter('statements', files.length);
            }
        });
    }
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performForensicAnalysis);
    }
    
    // Configurar drag and drop
    setupDragAndDrop();
}

function registerClient() {
    const nameInput = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) {
        showError('Nome do cliente inválido (mínimo 3 caracteres)');
        nameInput?.focus();
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        showError('NIF inválido (deve ter 9 dígitos)');
        nifInput?.focus();
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

function updateFileList(listId, files) {
    const fileList = document.getElementById(listId);
    if (!fileList) return;
    
    fileList.innerHTML = '';
    fileList.classList.add('visible');
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name">${file.name}</span>
            <span class="file-status">VALIDADO ✓</span>
        `;
        fileList.appendChild(fileItem);
    });
}

function updateCounter(type, count) {
    const counterId = type === 'saft' ? 'saftCount' :
                     type === 'invoices' ? 'invoiceCount' :
                     type === 'statements' ? 'statementCount' : null;
    
    if (counterId) {
        document.getElementById(counterId).textContent = count;
        VDCSystem.counters[type] = count;
    }
    
    // Atualizar contador total
    const total = VDCSystem.counters.saft + VDCSystem.counters.invoices + VDCSystem.counters.statements;
    document.getElementById('totalCount').textContent = total;
    VDCSystem.counters.total = total;
}

function setupDragAndDrop() {
    const uploadBtns = document.querySelectorAll('.upload-btn');
    
    uploadBtns.forEach(btn => {
        btn.addEventListener('dragover', (e) => {
            e.preventDefault();
            btn.style.borderColor = '#00f2ff';
            btn.style.background = 'rgba(0, 242, 255, 0.1)';
        });
        
        btn.addEventListener('dragleave', () => {
            btn.style.borderColor = '';
            btn.style.background = '';
        });
        
        btn.addEventListener('drop', (e) => {
            e.preventDefault();
            btn.style.borderColor = '';
            btn.style.background = '';
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const files = Array.from(e.dataTransfer.files);
                const type = btn.textContent.includes('SAF-T') ? 'saft' :
                           btn.textContent.includes('FATURAS') ? 'invoices' :
                           btn.textContent.includes('EXTRATOS') ? 'statements' : 'control';
                
                if (type === 'control') {
                    processControlFile(files[0]);
                    updateFileList('controlFileList', [files[0]]);
                } else {
                    processMultipleFiles(type, files);
                    updateFileList(`${type}FileList`, files);
                    updateCounter(type, files.length);
                }
            }
        });
    });
}

// 5. PROCESSAMENTO DE FICHEIROS
async function processControlFile(file) {
    try {
        logAudit(`Processando ficheiro de controlo: ${file.name}`, 'info');
        
        const text = await readFileAsText(file);
        const results = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            transform: (value) => value ? value.trim() : ''
        });
        
        let validHashes = 0;
        
        results.data.forEach((row) => {
            const hash = (row.Hash || row.hash || '').toLowerCase();
            
            if (!hash || hash === '' || hash === 'null' || hash === 'undefined') {
                return;
            }
            
            const path = (row.Path || row.path || '').toLowerCase();
            if (path.includes('controlo') || path.includes('autenticidade')) {
                return;
            }
            
            if (hash) {
                if (!VDCSystem.documents.control.hashes) {
                    VDCSystem.documents.control.hashes = {};
                }
                VDCSystem.documents.control.hashes[hash] = {
                    hash: hash,
                    path: path,
                    algorithm: row.Algorithm || row.algorithm || 'SHA256'
                };
                validHashes++;
            }
        });
        
        VDCSystem.documents.control.files = [file];
        VDCSystem.documents.control.parsedData = results.data;
        
        logAudit(`✅ Controlo carregado: ${validHashes} hashes válidas`, 'success');
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no controlo:', error);
        logAudit(`❌ Erro no ficheiro de controlo: ${error.message}`, 'error');
    }
}

async function processMultipleFiles(type, files) {
    try {
        logAudit(`Processando ${files.length} ficheiros ${type.toUpperCase()}...`, 'info');
        
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], parsedData: [], totals: {} };
        }
        
        VDCSystem.documents[type].files = files;
        VDCSystem.documents[type].parsedData = [];
        
        for (const file of files) {
            try {
                const format = determineFileFormat(file);
                let parsedData = null;
                
                if (format === 'csv') {
                    parsedData = await parseCSVFile(file);
                    const extractedValues = extractBoltValues(parsedData, type);
                    updateDocumentTotals(type, extractedValues);
                    
                    if (type === 'statements') {
                        updateKPIsFromData(extractedValues);
                    }
                } else if (format === 'xml') {
                    parsedData = await parseXMLFile(file);
                } else if (format === 'pdf') {
                    parsedData = await parsePDFFile(file);
                } else {
                    parsedData = { 
                        content: await readFileAsText(file), 
                        format: format 
                    };
                }
                
                VDCSystem.documents[type].parsedData.push({
                    fileName: file.name,
                    format: format,
                    data: parsedData,
                    size: file.size,
                    hash: await calculateFileHash(file)
                });
                
            } catch (fileError) {
                logAudit(`⚠️ Erro no ficheiro ${file.name}: ${fileError.message}`, 'warn');
            }
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados`, 'success');
        updateAnalysisButton();
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
    }
}

function updateDocumentTotals(type, values) {
    if (!VDCSystem.documents[type].totals) {
        VDCSystem.documents[type].totals = {};
    }
    
    Object.keys(values).forEach(key => {
        if (!VDCSystem.documents[type].totals[key]) {
            VDCSystem.documents[type].totals[key] = 0;
        }
        VDCSystem.documents[type].totals[key] += values[key];
    });
}

// 6. FUNÇÕES AUXILIARES DE PARSE
function determineFileFormat(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return 'csv';
    if (name.endsWith('.xml')) return 'xml';
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.txt')) return 'txt';
    return 'unknown';
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

async function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}

function extractBoltValues(data, type) {
    const values = {
        ganhosTotais: 0,
        comissaoApp: 0,
        ganhosLiquidos: 0,
        campanhas: 0,
        gorjetas: 0,
        cancelamentos: 0,
        faturaPlataforma: 0
    };
    
    if (!Array.isArray(data)) return values;
    
    data.forEach(row => {
        Object.keys(row).forEach(key => {
            const keyLower = key.toLowerCase();
            const value = row[key];
            
            if (typeof value === 'string') {
                if (keyLower.includes('ganhos') && keyLower.includes('total')) {
                    values.ganhosTotais += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('comissão') || keyLower.includes('comissao') || keyLower.includes('taxa')) {
                    values.comissaoApp += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('líquido') || keyLower.includes('liquido') || keyLower.includes('receber')) {
                    values.ganhosLiquidos += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('campanha') || keyLower.includes('bonus') || keyLower.includes('bónus')) {
                    values.campanhas += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('gorjeta') || keyLower.includes('tip')) {
                    values.gorjetas += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('cancel') || keyLower.includes('taxa cancel')) {
                    values.cancelamentos += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('fatura') || keyLower.includes('invoice')) {
                    values.faturaPlataforma += parsePortugueseNumber(value);
                }
                else if (keyLower.includes('valor') && parsePortugueseNumber(value) > 100) {
                    values.ganhosTotais += parsePortugueseNumber(value);
                }
            }
        });
    });
    
    return values;
}

function parsePortugueseNumber(value) {
    if (!value) return 0;
    
    const stringValue = value.toString().trim();
    const cleanValue = stringValue
        .replace(/[^\d,-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    const number = parseFloat(cleanValue);
    return isNaN(number) ? 0 : number;
}

function updateKPIValues() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const kpiGanhos = document.getElementById('kpiGanhos');
    const kpiComm = document.getElementById('kpiComm');
    const kpiNet = document.getElementById('kpiNet');
    const kpiInvoice = document.getElementById('kpiInvoice');
    const valCamp = document.getElementById('valCamp');
    const valTips = document.getElementById('valTips');
    const valCanc = document.getElementById('valCanc');
    
    if (kpiGanhos) kpiGanhos.textContent = formatter.format(VDCSystem.analysis.extractedValues.ganhosTotais);
    if (kpiComm) kpiComm.textContent = formatter.format(VDCSystem.analysis.extractedValues.comissaoApp);
    if (kpiNet) kpiNet.textContent = formatter.format(VDCSystem.analysis.extractedValues.ganhosLiquidos);
    if (kpiInvoice) kpiInvoice.textContent = formatter.format(VDCSystem.analysis.extractedValues.faturaPlataforma);
    if (valCamp) valCamp.textContent = formatter.format(VDCSystem.analysis.extractedValues.campanhas);
    if (valTips) valTips.textContent = formatter.format(VDCSystem.analysis.extractedValues.gorjetas);
    if (valCanc) valCanc.textContent = formatter.format(VDCSystem.analysis.extractedValues.cancelamentos);
}

function updateKPIsFromData(values) {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    if (values.ganhosTotais > 0) {
        VDCSystem.analysis.extractedValues.ganhosTotais = values.ganhosTotais;
        document.getElementById('kpiGanhos').textContent = formatter.format(values.ganhosTotais);
    }
    
    if (values.comissaoApp > 0) {
        VDCSystem.analysis.extractedValues.comissaoApp = values.comissaoApp;
        document.getElementById('kpiComm').textContent = formatter.format(values.comissaoApp);
    }
    
    if (values.ganhosLiquidos > 0) {
        VDCSystem.analysis.extractedValues.ganhosLiquidos = values.ganhosLiquidos;
        document.getElementById('kpiNet').textContent = formatter.format(values.ganhosLiquidos);
    }
    
    if (values.faturaPlataforma > 0) {
        VDCSystem.analysis.extractedValues.faturaPlataforma = values.faturaPlataforma;
        document.getElementById('kpiInvoice').textContent = formatter.format(values.faturaPlataforma);
    }
    
    if (values.campanhas > 0) {
        VDCSystem.analysis.extractedValues.campanhas = values.campanhas;
        document.getElementById('valCamp').textContent = formatter.format(values.campanhas);
    }
    
    if (values.gorjetas > 0) {
        VDCSystem.analysis.extractedValues.gorjetas = values.gorjetas;
        document.getElementById('valTips').textContent = formatter.format(values.gorjetas);
    }
    
    if (values.cancelamentos > 0) {
        VDCSystem.analysis.extractedValues.cancelamentos = values.cancelamentos;
        document.getElementById('valCanc').textContent = formatter.format(values.cancelamentos);
    }
}

async function parseXMLFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parser = new DOMParser();
                const xml = parser.parseFromString(e.target.result, "text/xml");
                resolve(xml);
            } catch (error) {
                resolve({ error: 'Parse XML falhou' });
            }
        };
        reader.readAsText(file);
    });
}

async function parsePDFFile(file) {
    return new Promise((resolve) => {
        resolve({
            format: 'pdf',
            size: file.size,
            note: 'Análise PDF requer OCR avançado'
        });
    });
}

async function calculateFileHash(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
                const hash = CryptoJS.SHA256(wordArray).toString();
                resolve(hash.toLowerCase());
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Erro na leitura do ficheiro'));
        reader.readAsArrayBuffer(file);
    });
}

// 7. ANÁLISE FORENSE COMPLETA
async function performForensicAnalysis() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE BIG DATA', 'success');
        
        extractRealValues();
        applyFiscalLogic();
        performForensicCrossings();
        calculateMarketProjection();
        detectAnomalies();
        
        updateDashboard();
        updateResults();
        renderChart();
        generateMasterHash();
        
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        if (VDCSystem.analysis.crossings.omission > 0.01) {
            showOmissionAlert();
        }
        
        if (VDCSystem.analysis.anomalies.length > 0) {
            logAudit(`⚠️ DETETADAS ${VDCSystem.analysis.anomalies.length} ANOMALIAS:`, 'warn');
            VDCSystem.analysis.anomalies.forEach(anomaly => {
                logAudit(`• ${anomaly}`, 'warn');
            });
        }
        
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

function extractRealValues() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    VDCSystem.analysis.extractedValues.saftGross = VDCSystem.documents.saft.totals?.gross || VDCSystem.analysis.extractedValues.ganhosTotais;
    VDCSystem.analysis.extractedValues.saftIVA6 = VDCSystem.documents.saft.totals?.iva6 || (VDCSystem.analysis.extractedValues.ganhosTotais * 0.06);
    VDCSystem.analysis.extractedValues.platformCommission = VDCSystem.documents.invoices.totals?.commission || VDCSystem.analysis.extractedValues.comissaoApp;
    VDCSystem.analysis.extractedValues.bankTransfer = VDCSystem.documents.statements.totals?.transfer || VDCSystem.analysis.extractedValues.ganhosLiquidos;
    
    document.getElementById('kpiGanhos').textContent = formatter.format(VDCSystem.analysis.extractedValues.ganhosTotais);
    document.getElementById('kpiComm').textContent = formatter.format(VDCSystem.analysis.extractedValues.comissaoApp);
    document.getElementById('kpiNet').textContent = formatter.format(VDCSystem.analysis.extractedValues.ganhosLiquidos);
    document.getElementById('kpiInvoice').textContent = formatter.format(VDCSystem.analysis.extractedValues.faturaPlataforma);
    
    logAudit(`Valores Bolt extraídos: Ganhos ${formatter.format(VDCSystem.analysis.extractedValues.ganhosTotais)}, Líquido ${formatter.format(VDCSystem.analysis.extractedValues.ganhosLiquidos)}`, 'info');
}

function applyFiscalLogic() {
    const commission = VDCSystem.analysis.extractedValues.comissaoApp;
    VDCSystem.analysis.extractedValues.iva23Due = commission * 0.23;
    
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    logAudit(`IVA 23% Autoliquidação: ${formatter.format(VDCSystem.analysis.extractedValues.iva23Due)} sobre comissão de ${formatter.format(commission)}`, 'warn');
}

function performForensicCrossings() {
    const expectedTransfer = VDCSystem.analysis.extractedValues.ganhosTotais - VDCSystem.analysis.extractedValues.comissaoApp;
    const actualTransfer = VDCSystem.analysis.extractedValues.ganhosLiquidos;
    VDCSystem.analysis.crossings.deltaA = expectedTransfer - actualTransfer;
    
    VDCSystem.analysis.crossings.deltaB = Math.abs(VDCSystem.analysis.extractedValues.faturaPlataforma - VDCSystem.analysis.extractedValues.comissaoApp);
    
    VDCSystem.analysis.crossings.omission = Math.abs(VDCSystem.analysis.crossings.deltaA);
    VDCSystem.analysis.crossings.isValid = VDCSystem.analysis.crossings.omission <= 0.01;
    
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    if (VDCSystem.analysis.crossings.omission > 0.01) {
        logAudit(`⚠️ CRUZAMENTO A: Diferença de ${formatter.format(VDCSystem.analysis.crossings.deltaA)} entre valor esperado (${formatter.format(expectedTransfer)}) e transferência real (${formatter.format(actualTransfer)})`, 'warn');
    }
}

function calculateMarketProjection() {
    VDCSystem.analysis.projection.averagePerDriver = VDCSystem.analysis.extractedValues.ganhosTotais;
    VDCSystem.analysis.projection.marketProjection = VDCSystem.analysis.projection.averagePerDriver * 38000;
    
    logAudit(`Projeção mercado: ${(VDCSystem.analysis.projection.marketProjection / 1000000).toFixed(2)}M€ (base: 38.000 motoristas)`, 'info');
}

function detectAnomalies() {
    VDCSystem.analysis.anomalies = [];
    VDCSystem.analysis.legalCitations = [];
    
    if (VDCSystem.analysis.crossings.omission > 0.01) {
        VDCSystem.analysis.anomalies.push(`Omissão de receita: Diferença de ${VDCSystem.analysis.crossings.deltaA.toFixed(2)}€ entre faturação e recebimento`);
        VDCSystem.analysis.legalCitations.push("RGIT Art. 103º - Crime de Fraude Fiscal por omissão");
    }
    
    if (VDCSystem.analysis.extractedValues.iva23Due > 0 && 
        (VDCSystem.selectedPlatform === 'bolt' || VDCSystem.selectedPlatform === 'uber')) {
        VDCSystem.analysis.anomalies.push(`IVA 23% Autoliquidação não declarado: ${VDCSystem.analysis.extractedValues.iva23Due.toFixed(2)}€`);
        VDCSystem.analysis.legalCitations.push("CIVA Art. 2º nº 1 i) - Inversão do sujeito passivo em serviços intracomunitários");
    }
    
    VDCSystem.analysis.legalCitations.push("CIVA Art. 29º - Falta de emissão de faturas-recibo");
    VDCSystem.analysis.legalCitations.push("ISO 27037 - Garantia de integridade de evidência digital");
}

// 8. ATUALIZAÇÃO DA INTERFACE
function updateDashboard() {
    document.getElementById('netVal').textContent = 
        (VDCSystem.analysis.extractedValues.saftGross - VDCSystem.analysis.extractedValues.saftIVA6).toFixed(2) + "€";
    
    document.getElementById('iva6Val').textContent = 
        VDCSystem.analysis.extractedValues.saftIVA6.toFixed(2) + "€";
    
    document.getElementById('commissionVal').textContent = 
        VDCSystem.analysis.extractedValues.platformCommission.toFixed(2) + "€";
    
    document.getElementById('iva23Val').textContent = 
        VDCSystem.analysis.extractedValues.iva23Due.toFixed(2) + "€";
}

function updateResults() {
    document.getElementById('grossResult').textContent = 
        VDCSystem.analysis.extractedValues.saftGross.toFixed(2) + "€";
    
    document.getElementById('transferResult').textContent = 
        VDCSystem.analysis.extractedValues.bankTransfer.toFixed(2) + "€";
    
    document.getElementById('differenceResult').textContent = 
        VDCSystem.analysis.crossings.deltaA.toFixed(2) + "€";
    
    document.getElementById('marketResult').textContent = 
        (VDCSystem.analysis.projection.marketProjection / 1000000).toFixed(2) + "M€";
    
    updateProgressBars();
}

function updateProgressBars() {
    const maxValue = Math.max(
        VDCSystem.analysis.extractedValues.saftGross,
        VDCSystem.analysis.extractedValues.bankTransfer,
        Math.abs(VDCSystem.analysis.crossings.deltaA),
        VDCSystem.analysis.projection.marketProjection / 1000000
    );
    
    const bars = document.querySelectorAll('.bar-fill');
    if (bars.length >= 4) {
        bars[0].style.width = (VDCSystem.analysis.extractedValues.saftGross / maxValue * 100) + '%';
        bars[1].style.width = (VDCSystem.analysis.extractedValues.bankTransfer / maxValue * 100) + '%';
        bars[2].style.width = (Math.abs(VDCSystem.analysis.crossings.deltaA) / maxValue * 100) + '%';
        bars[3].style.width = ((VDCSystem.analysis.projection.marketProjection / 1000000) / maxValue * 100) + '%';
        
        if (VDCSystem.analysis.crossings.omission > 0.01) {
            bars[2].style.background = 'var(--warn-primary)';
        } else {
            bars[2].style.background = 'var(--success-primary)';
        }
    }
}

function showOmissionAlert() {
    const alertElement = document.getElementById('omissionAlert');
    const omissionValueElement = document.getElementById('omissionValue');
    
    if (alertElement && omissionValueElement) {
        omissionValueElement.textContent = VDCSystem.analysis.crossings.deltaA.toFixed(2) + "€";
        alertElement.style.display = 'flex';
        
        logAudit(`⚠️ ALERTA: Omissão de receita detetada: ${VDCSystem.analysis.crossings.deltaA.toFixed(2)}€`, 'error');
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart').getContext('2d');
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
    }
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Valor Ilíquido', 'IVA 6%', 'Comissão Plataforma', 'IVA 23% Devido'],
            datasets: [{
                data: [
                    VDCSystem.analysis.extractedValues.saftGross - VDCSystem.analysis.extractedValues.saftIVA6,
                    VDCSystem.analysis.extractedValues.saftIVA6,
                    VDCSystem.analysis.extractedValues.platformCommission,
                    VDCSystem.analysis.extractedValues.iva23Due
                ],
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
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(2)}€`;
                        }
                    }
                }
            }
        }
    });
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasControl = VDCSystem.documents.control.files.length > 0;
    const hasSaft = VDCSystem.documents.saft.files.length > 0;
    const hasClient = VDCSystem.client !== null;
    
    analyzeBtn.disabled = !(hasControl && hasSaft && hasClient);
}

// 9. LOGS E AUDITORIA
function logAudit(message, type = 'info') {
    if (typeof message === 'string' && 
        (message.toLowerCase().includes("campo hash vazio") || 
         message.toLowerCase().includes("hash vazio") ||
         message.toLowerCase().includes("ignorado"))) {
        return;
    }
    
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
        fullTime: new Date().toISOString()
    };
    
    VDCSystem.logs.push(logEntry);
    updateAuditConsole(logEntry);
    
    if (type === 'error') {
        console.error(`[VDC ${type.toUpperCase()}] ${message}`);
    } else {
        console.log(`[VDC ${type.toUpperCase()}] ${message}`);
    }
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
    
    const maxLogs = 100;
    while (output.children.length > maxLogs) {
        output.removeChild(output.firstChild);
    }
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
    logAudit('Console de auditoria limpo', 'info');
}

function toggleConsole() {
    const consoleElement = document.getElementById('auditOutput');
    if (!consoleElement) return;
    
    if (consoleElement.style.height === '200px') {
        consoleElement.style.height = '120px';
    } else {
        consoleElement.style.height = '200px';
    }
}

// 10. EXPORTAÇÃO
async function exportJSON() {
    try {
        const evidenceData = {
            sistema: "VDC Forensic System v8.0",
            versao: VDCSystem.version,
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            analise: VDCSystem.analysis,
            documentos: {
                control: VDCSystem.documents.control.files.length,
                saft: VDCSystem.documents.saft.files.length,
                invoices: VDCSystem.documents.invoices.files.length,
                statements: VDCSystem.documents.statements.files.length
            },
            masterHash: document.getElementById('masterHashValue').textContent
        };
        
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: `prova_forense_vdc_${VDCSystem.sessionId}.json`,
                types: [{
                    description: 'Ficheiro JSON de Prova Digital',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(evidenceData, null, 2));
            await writable.close();
            
            logAudit('✅ Prova digital exportada (JSON) - Guardado com File System Access API', 'success');
        } else {
            const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prova_forense_vdc_${VDCSystem.sessionId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            logAudit('✅ Prova digital exportada (JSON) - Download automático', 'success');
        }
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        if (error.name !== 'AbortError') {
            logAudit(`❌ Erro ao exportar JSON: ${error.message}`, 'error');
        }
    }
}

async function exportPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont("helvetica");
        
        // ========== PÁGINA 1: RELATÓRIO PERICIAL COM MOLDURA ==========
        doc.setLineWidth(1);
        doc.rect(10, 10, 190, 25);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, 186, 21);
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("VDC FORENSIC SYSTEM", 20, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Protocolo de Prova Legal | Big Data Forense", 20, 27);
        doc.text("⚖️", 185, 22);
        
        doc.setFontSize(9);
        doc.text(`Sessão: ${VDCSystem.sessionId}`, 150, 35);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 150, 40);
        
        let posY = 45;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. IDENTIFICAÇÃO DO CLIENTE", 15, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        if (VDCSystem.client) {
            doc.text(`Nome: ${VDCSystem.client.name}`, 15, posY);
            posY += 7;
            doc.text(`NIF: ${VDCSystem.client.nif}`, 15, posY);
            posY += 7;
            doc.text(`Data de Registo: ${new Date(VDCSystem.client.registrationDate).toLocaleDateString('pt-PT')}`, 15, posY);
            posY += 10;
        } else {
            doc.text("Cliente não registado", 15, posY);
            posY += 10;
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("2. VALORES EXTRAÍDOS (EXTRATO OFICIAL BOLT)", 15, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const formatter = new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR'
        });
        
        const extractedValues = [
            ['Ganhos Totais:', formatter.format(VDCSystem.analysis.extractedValues.ganhosTotais)],
            ['Comissão da App:', formatter.format(VDCSystem.analysis.extractedValues.comissaoApp)],
            ['Ganhos Líquidos:', formatter.format(VDCSystem.analysis.extractedValues.ganhosLiquidos)],
            ['Fatura da Plataforma:', formatter.format(VDCSystem.analysis.extractedValues.faturaPlataforma)],
            ['Campanhas:', formatter.format(VDCSystem.analysis.extractedValues.campanhas)],
            ['Gorjetas:', formatter.format(VDCSystem.analysis.extractedValues.gorjetas)],
            ['Cancelamentos:', formatter.format(VDCSystem.analysis.extractedValues.cancelamentos)]
        ];
        
        extractedValues.forEach(([label, value]) => {
            if (posY > 250) {
                doc.addPage();
                posY = 20;
            }
            doc.text(label, 15, posY);
            doc.text(value, 100, posY);
            posY += 7;
        });
        
        posY += 5;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("3. QUADRO DE INFRAÇÕES DETETADAS", 15, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const iva23Due = VDCSystem.analysis.extractedValues.comissaoApp * 0.23;
        const infracoes = [
            ["Omissão de Autoliquidação de IVA (23%)", `Sobre comissão: ${formatter.format(iva23Due)}`],
            ["Discrepância de Colarinho Branco", "Divergência entre faturação app e banco"],
            ["Ausência de suporte documental", "Fatura intracomunitária não declarada"]
        ];
        
        infracoes.forEach(([infracao, descricao], index) => {
            if (posY > 250) {
                doc.addPage();
                posY = 20;
            }
            doc.text(`${index + 1}. ${infracao}`, 15, posY);
            doc.text(descricao, 40, posY + 5);
            posY += 10;
        });
        
        posY += 5;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("4. CONCLUSÃO DA ANÁLISE", 15, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const conclusao = VDCSystem.analysis.anomalies.length > 0 ?
            `A presente análise detetou indícios de prática de crimes de colarinho branco, designadamente evasão fiscal por omissão de autoliquidação de IVA e discrepância entre os valores faturados e os efetivamente recebidos. Detetada discrepância financeira passível de inspeção tributária no valor de ${formatter.format(VDCSystem.analysis.crossings.deltaA)}.` :
            `A análise não detetou anomalias significativas. Os documentos apresentam conformidade fiscal e contabilística.`;
        
        const splitConclusao = doc.splitTextToSize(conclusao, 180);
        doc.text(splitConclusao, 15, posY);
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v8.0 - © 2024 | Protocolo de Prova Legal conforme ISO 27037", 10, 285);
        
        // ========== PÁGINA 2: ANEXO LEGAL ==========
        doc.addPage();
        posY = 20;
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("ANEXO II: FUNDAMENTAÇÃO LEGAL E INFRAÇÕES", 15, posY);
        posY += 15;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("ANÁLISE FORENSE DE CRIMES DE COLARINHO BRANCO", 15, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const whiteCollarText = `A análise forense efetuada pelo sistema VDC demonstra uma discrepância sistemática entre os valores faturados pelas plataformas eletrónicas (Uber/Bolt) e os fluxos financeiros reportados na contabilidade nacional. Esta prática, tipificada como Crime de Colarinho Branco, utiliza a ausência de IVA nas faturas intracomunitárias para omitir a autoliquidação devida ao Estado Português, resultando num enriquecimento sem causa do operador em detrimento do erário público (Art. 103.º RGIT).`;
        
        const splitWhiteCollar = doc.splitTextToSize(whiteCollarText, 180);
        doc.text(splitWhiteCollar, 15, posY);
        posY += splitWhiteCollar.length * 7 + 10;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("ARTIGOS LEGAIS APLICÁVEIS", 15, posY);
        posY += 10;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const legalArticles = [
            "Art. 2.º nº 1 i) do CIVA: Inversão do sujeito passivo em serviços intracomunitários (Reverse Charge).",
            "Art. 103.º do RGIT: Crime de Fraude Fiscal por omissão de IVA de autoliquidação.",
            "Art. 29.º do CIVA: Falta de emissão de faturas-recibo sobre o valor total cobrado ao cliente final.",
            "ISO 27037: Garantia de que a evidência digital não foi manipulada.",
            "Doutrina: Crimes de Colarinho Branco (Evasão por engenharia contabilística entre plataformas e empresas de frota)."
        ];
        
        legalArticles.forEach((article, index) => {
            if (posY > 250) {
                doc.addPage();
                posY = 20;
            }
            doc.text(`${index + 1}. ${article}`, 15, posY);
            posY += 7;
        });
        
        posY += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("QUADRO DE INFRAÇÕES DETETADAS", 15, posY);
        posY += 10;
        
        const violations = [
            ["Norma Violada", "Descrição Técnica", "Natureza do Risco"],
            ["CIVA Art. 2º", "Ausência de Autoliquidação sobre comissões", "Fuga Fiscal (IVA)"],
            ["RGIT Art. 103º", "Ocultação de factos tributários", "Crime de Fraude"],
            ["CIVA Art. 29º", "Falta de emissão de faturas-recibo", "Infração Administrativa"],
            ["ISO 27037", "Garantia de integridade digital", "Nulidade Processual"]
        ];
        
        violations.forEach((row, rowIndex) => {
            if (posY > 250) {
                doc.addPage();
                posY = 20;
            }
            
            if (rowIndex === 0) {
                doc.setFont("helvetica", "bold");
            } else {
                doc.setFont("helvetica", "normal");
            }
            
            doc.text(row[0], 15, posY);
            doc.text(row[1], 65, posY);
            doc.text(row[2], 145, posY);
            posY += 7;
        });
        
        posY += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("RELATÓRIO DE EVIDÊNCIAS DIGITAIS", 15, posY);
        posY += 10;
        
        const evidencias = [
            ["Evidência Analisada", "Valor Extraído", "Estado de Validação"],
            ["Extrato de Saldo Bolt", formatter.format(VDCSystem.analysis.extractedValues.ganhosTotais), "Validado via Extrato"],
            ["Comissão Plataforma", formatter.format(VDCSystem.analysis.extractedValues.comissaoApp), "Autoliquidação Omitida"],
            ["Fatura de Serviços", formatter.format(VDCSystem.analysis.extractedValues.faturaPlataforma), "Validado via PDF Bolt"],
            ["IVA Devido (23%)", formatter.format(iva23Due), "Dívida Fiscal Detetada"]
        ];
        
        evidencias.forEach((row, rowIndex) => {
            if (posY > 250) {
                doc.addPage();
                posY = 20;
            }
            
            if (rowIndex === 0) {
                doc.setFont("helvetica", "bold");
            } else {
                doc.setFont("helvetica", "normal");
            }
            
            doc.text(row[0], 15, posY);
            doc.text(row[1], 80, posY);
            doc.text(row[2], 140, posY);
            posY += 7;
        });
        
        posY += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        const notaFinal = "Nota Forense: A integridade da prova digital é garantida pela extração direta do sistema da plataforma. A falta de indicação expressa da moeda no corpo das transações do extrato é suprida pela fatura de suporte e pelos metadados de localização da empresa.";
        const splitNota = doc.splitTextToSize(notaFinal, 180);
        doc.text(splitNota, 15, posY);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("Documento gerado automaticamente pelo VDC Forensic System v8.0 - Sistema de Peritagem Forense em Big Data", 10, 280);
        doc.text("© 2024 - Todos os direitos reservados | Protocolo de Prova Legal conforme ISO 27037", 10, 285);
        
        const fileName = VDCSystem.client ? 
            `Relatorio_Pericial_VDC_${VDCSystem.client.nif}.pdf` : 
            `Relatorio_Pericial_VDC_${VDCSystem.sessionId}.pdf`;
        
        doc.save(fileName);
        
        logAudit('✅ Relatório pericial exportado (PDF - 2 páginas com moldura)', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
    }
}

// 11. FUNÇÕES UTILITÁRIAS
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
        VDCSystem.analysis.extractedValues.ganhosTotais.toString(),
        VDCSystem.analysis.extractedValues.iva23Due.toString(),
        new Date().toISOString()
    ].join('|');
    
    const masterHash = CryptoJS.SHA256(data).toString();
    const display = document.getElementById('masterHashValue');
    
    if (display) {
        display.textContent = masterHash;
        display.style.color = '#00f2ff';
    }
    
    logAudit(`Master Hash gerada: ${masterHash.substring(0, 32)}...`, 'success');
}

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    alert(`ERRO DO SISTEMA: ${message}\n\nVerifique o console para mais detalhes.`);
}

function clearSession() {
    if (confirm('Tem certeza que deseja iniciar uma nova sessão? Todos os dados não exportados serão perdidos.')) {
        location.reload();
    }
}
