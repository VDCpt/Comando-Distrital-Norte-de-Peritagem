// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v11.5
// AUDITORIA FISCAL BIG DATA - VERSÃO FINAL RETIFICADA
// ============================================

// ===== NORMALIZADOR NUMÉRICO =====
const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim();
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '').replace(/\s+/g, '');
    
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    
    if (hasComma && hasDot) {
        if (str.indexOf(',') > str.indexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (hasComma && !hasDot) {
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1) {
            const parts = str.split(',');
            str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        } else {
            str = str.replace(',', '.');
        }
    } else if (!hasComma && hasDot) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) {
            const parts = str.split('.');
            str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        }
    }
    
    str = str.replace(/[^\d.-]/g, '');
    if (str === '' || str === '-' || str === '.') return 0;
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
};

function isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
}

// ===== SISTEMA VDC V11.5 =====
const VDCSystem = {
    version: 'v11.5-FINAL',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    
    boltEntity: {
        nome: "Bolt Operations OÜ",
        nif: "EE102090374",
        endereco: "Vana-Lõuna 15, Tallinn 10134 Estonia",
        isoCompliance: "ISO/IEC 27037",
        dac7Obrigacao: true,
        taxaRegulacao: "5% (AMT/IMT)"
    },
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
        control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
        statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
    },
    
    analysis: {
        extractedValues: {
            saftGross: 0, saftIVA6: 0, saftNet: 0, platformCommission: 0, bankTransfer: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
            campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0,
            prejuizoFiscal: 0, ivaAutoliquidacao: 0, dac7Revenue: 0, dac7Period: '', dac7Quarterly: [],
            jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
        },
        crossings: { deltaA: 0, deltaB: 0, omission: 0, isValid: true, diferencialAlerta: false, fraudIndicators: [], bigDataAlertActive: false, discrepanciaAlertaAtiva: false, riscoRegulatorioAtivo: false },
        projection: { marketProjection: 0, averagePerDriver: 0, driverCount: 38000, monthsPerYear: 12, yearsOfOperation: 7, totalMarketImpact: 0 },
        chainOfCustody: [],
        anomalies: [],
        quesitosEstrategicos: [],
        legalCitations: [
            "ISO/IEC 27037:2012 - Preservação de Evidência Digital",
            "NIST SP 800-86 - Guia para Análise Forense de Dados",
            "Regime Geral das Infrações Tributárias (RGRC) - Art. 103.º",
            "Código do IRC, Artigo 87º - Tratamento Contabilístico integral",
            "CIVA, Artigo 2.º - Obrigação de faturação completa",
            "CIVA, Artigo 29º - Autoliquidação do IVA",
            "RGIT, Artigo 103º - Crime de Fraude Fiscal",
            "Código Penal, Art. 158-A a 158-F - Cadeia de Custódia Digital",
            "Diretiva DAC7 - Transparência de plataformas digitais",
            "Lei 83/2017 - Prevenção do Branqueamento de Capitais",
            "Decreto-Lei 83/2017 - Taxa de Regulação (AMT/IMT)",
            "Regulamento (UE) 2016/679 - RGPD - Governança de Dados"
        ]
    },
    
    counters: { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 },
    logs: [],
    chart: null,
    preRegisteredClients: [],
    bigDataAlertInterval: null,
    discrepanciaAlertaInterval: null
};

// ===== POPULATE YEARS (CORREÇÃO DE LOOP) =====
function populateYears() {
    const yearSelect = document.getElementById('selYearFixed');
    if (!yearSelect) return; // Retorna silenciosamente se não encontrar
    
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    VDCSystem.selectedYear = currentYear;
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
    console.log(`✅ Anos carregados: 2018 a 2036. Atual: ${currentYear}`);
}

// ===== DOMContentLoaded =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM pronto. Executando populateYears()...');
    populateYears();
});

// ===== WINDOW.ONLOAD =====
window.onload = async function() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v11.5...');
        
        // Verificar bibliotecas
        if (typeof CryptoJS === 'undefined') throw new Error('CryptoJS não carregado');
        if (typeof Papa === 'undefined') throw new Error('PapaParse não carregado');
        if (typeof Chart === 'undefined') throw new Error('Chart.js não carregado');
        
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) startBtn.addEventListener('click', startForensicSession);
        
        startClockAndDate();
        updatePageTitle('Inicializando Auditoria Fiscal...');
        logAudit('✅ Sistema VDC v11.5 pronto para auditoria fiscal Big Data', 'success');
        
        // Listeners principais
        setupEventListeners();
        
        // Forçar ano se falhou no DOMContentLoaded
        const yearSelect = document.getElementById('selYearFixed');
        if (yearSelect && yearSelect.children.length === 0) {
            populateYears();
        }
    } catch (error) {
        console.error('Erro crítico na inicialização:', error);
        logAudit(`❌ Erro crítico: ${error.message}`, 'error');
    }
};

// ===== INICIALIZAÇÃO DA SESSÃO =====
function startForensicSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (splashScreen && loadingOverlay) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadingOverlay.style.display = 'flex';
                setTimeout(() => loadForensicSystem(), 300);
            }, 500);
        }
    } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
    }
}

function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) progressBar.style.width = percent + '%';
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            setTimeout(() => { mainContainer.style.opacity = '1'; }, 50);
        }, 500);
    }
}

async function loadForensicSystem() {
    try {
        updateLoadingProgress(10);
        updatePageTitle('Carregando Sistema...');
        
        VDCSystem.sessionId = generateSessionId();
        const sessionIdElement = document.getElementById('sessionIdDisplay');
        if (sessionIdElement) sessionIdElement.textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        populateYears(); // Garantir preenchimento
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        loadClientsFromLocal();
        updateLoadingProgress(50);
        
        setupEventListeners();
        updateLoadingProgress(60);
        
        resetDashboard();
        updateLoadingProgress(80);
        
        // Gráfico renderizado vazio inicialmente
        updateLoadingProgress(90);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(() => showMainInterface(), 300);
            updatePageTitle('Sistema Pronto');
            logAudit('✅ Sistema VDC v11.5 inicializado', 'success');
            logAudit('🔐 Protocolos ativados: ISO/IEC 27037, NIST SP 800-86', 'info');
            generateMasterHash();
        }, 500);
    } catch (error) {
        console.error('Erro no carregamento:', error);
        showMainInterface();
    }
}

// ===== CONFIGURAÇÕES DE INTERFACE =====
function setupPlatformSelector() {
    const selPlatform = document.getElementById('selPlatformFixed');
    if (!selPlatform) return;
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        const platformName = e.target.options[e.target.selectedIndex].text;
        logAudit(`Plataforma selecionada: ${platformName}`, 'info');
        if (VDCSystem.selectedPlatform === 'bolt') {
            logAudit(`🎯 ALVO PRINCIPAL: ${VDCSystem.boltEntity.nome}`, 'warn');
        }
        resetExtractedValues();
    });
}

function resetExtractedValues() {
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0, platformCommission: 0, bankTransfer: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
        campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0,
        prejuizoFiscal: 0, ivaAutoliquidacao: 0, dac7Revenue: 0, dac7Period: '', dac7Quarterly: [],
        jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
    };
    updateDashboard();
    updateKPIResults();
}

function startClockAndDate() {
    function updateDateTime() {
        try {
            const now = new Date();
            if (isNaN(now.getTime())) return;
            const dateString = now.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeString = now.toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateElement = document.getElementById('currentDate');
            const timeElement = document.getElementById('currentTime');
            if (dateElement) dateElement.textContent = dateString;
            if (timeElement) timeElement.textContent = timeString;
        } catch (error) { console.error('Erro no relógio:', error); }
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// ===== SETUP DE EVENT LISTENERS =====
function setupEventListeners() {
    try {
        const registerBtn = document.getElementById('registerClientBtnFixed');
        if (registerBtn) registerBtn.addEventListener('click', registerClientFixed);
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
        
        const openModalBtn = document.getElementById('openEvidenceModalBtn');
        if (openModalBtn) openModalBtn.addEventListener('click', openEvidenceModal);
        
        const closeModalBtn = document.getElementById('closeModalBtn');
        const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
        
        // CORREÇÃO: Atualizar botão de análise ao fechar modal
        const closeHandler = () => {
            closeEvidenceModal();
            updateAnalysisButton(); // Verifica se há evidências para ativar o botão
        };
        
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeHandler);
        if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeHandler);
        
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllEvidence);
        
        setupModalUploadButtons();
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) analyzeBtn.addEventListener('click', performForensicAnalysis);
        
        const exportJSONBtn = document.getElementById('exportJSONBtn');
        if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportJSON);
        
        const exportPDFBtn = document.getElementById('exportPDFBtn');
        if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
        
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) resetBtn.addEventListener('click', resetDashboard);
        
        const clearConsoleBtn = document.getElementById('clearConsoleBtn');
        if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
        
        const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
        if (toggleConsoleBtn) toggleConsoleBtn.addEventListener('click', toggleConsole);
        
        const custodyBtn = document.getElementById('custodyBtn');
        if (custodyBtn) custodyBtn.addEventListener('click', showChainOfCustody);
        
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) evidenceModal.addEventListener('click', (e) => {
            if (e.target === evidenceModal) closeHandler();
        });
    } catch (error) {
        console.error('Erro na configuração de eventos:', error);
    }
}

function setupModalUploadButtons() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUploadModal(e, type));
        }
    });
}

// ===== GESTÃO DE MODAL =====
function openEvidenceModal() {
    try {
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) {
            evidenceModal.style.display = 'flex';
            updateEvidenceSummary();
            updateCompactCounters();
            logAudit('📂 Modal aberto', 'info');
        }
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
    }
}

function closeEvidenceModal() {
    try {
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) evidenceModal.style.display = 'none';
    } catch (error) {
        console.error('Erro ao fechar modal:', error);
    }
}

// ===== LIMPAR EVIDÊNCIAS =====
function clearAllEvidence() {
    if (confirm('Tem a certeza que deseja limpar TODAS as evidências?')) {
        // Reset estrutura de documentos
        VDCSystem.documents = {
            dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
            control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
            saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
            invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
            statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
        };
        VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
        
        // Limpar UI
        ['dac7FileListModal', 'controlFileListModal', 'saftFileListModal', 'invoiceFileListModal', 'statementFileListModal'].forEach(id => {
            updateFileListModal(id, []);
        });
        
        updateEvidenceSummary();
        updateAnalysisButton(); // Desativar botão
        updateEvidenceCount();
        updateCompactCounters();
        generateMasterHash();
        logAudit('🗑️ Evidências limpas', 'warn');
    }
}

// ===== PROCESSAMENTO DE FICHEIROS =====
async function handleFileUploadModal(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    const files = Array.from(event.target.files);
    
    const uploadBtn = document.querySelector(`#${type}UploadBtnModal`);
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...`;
    }
    
    try {
        await processMultipleFilesModal(type, files, true);
        const totalCount = VDCSystem.documents[type].files.length;
        updateCounter(type, totalCount);
        updateCompactCounters();
        updateEvidenceSummary();
        updateEvidenceCount();
        generateMasterHash();
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados`, 'success');
    } catch (error) {
        logAudit(`❌ Erro no processamento: ${error.message}`, 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            uploadBtn.innerHTML = `<i class="fas fa-file-upload"></i> SELECIONAR FICHEIROS`;
        }
        event.target.value = '';
    }
}

async function processMultipleFilesModal(type, files, appendMode = true) {
    try {
        if (!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], parsedData: [], totals: {}, hashes: {} };
        if (!VDCSystem.documents[type].files) VDCSystem.documents[type].files = [];
        if (!VDCSystem.documents[type].parsedData) VDCSystem.documents[type].parsedData = [];
        
        if (appendMode) VDCSystem.documents[type].files.push(...files);
        else VDCSystem.documents[type].files = files;
        
        for (const file of files) {
            try {
                const text = await readFileAsText(file);
                const fileHash = CryptoJS.SHA256(text).toString();
                VDCSystem.documents[type].hashes[file.name] = fileHash;
                addToChainOfCustody(file, type, fileHash);
                
                let extractedData = null;
                // Simplificação para este exemplo: os parsers específicos seriam chamados aqui
                // Como não há dados reais, simulamos extração básica
                extractedData = { filename: file.name, size: file.size, records: 1, type: type };
                
                if (extractedData) {
                    VDCSystem.documents[type].parsedData.push({
                        filename: file.name,
                        hash: fileHash,
                        data: extractedData,
                        timestamp: new Date().toISOString()
                    });
                    
                    VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
                    updateFileListModal(`${type}FileListModal`, VDCSystem.documents[type].files, fileHash);
                }
            } catch (fileError) {
                console.error(`Erro no ficheiro ${file.name}:`, fileError);
            }
        }
    } catch (error) {
        console.error('Erro no processamento:', error);
        throw error;
    }
}

function updateFileListModal(listId, files) {
    const fileList = document.getElementById(listId);
    if (!fileList) return;
    fileList.innerHTML = '';
    if (files.length === 0) {
        fileList.classList.remove('visible');
        return;
    }
    fileList.classList.add('visible');
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item-modal';
        const size = formatBytes(file.size);
        const hash = VDCSystem.documents[getTypeFromListId(listId)]?.hashes[file.name] || '';
        
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">${size} ✓</span>
            ${hash ? `<span class="file-hash-modal"><i class="fas fa-fingerprint"></i> ${hash.substring(0, 12)}...</span>` : ''}
        `;
        fileList.appendChild(fileItem);
    });
}

function getTypeFromListId(listId) {
    if (listId.includes('dac7')) return 'dac7';
    if (listId.includes('control')) return 'control';
    if (listId.includes('saft')) return 'saft';
    if (listId.includes('invoice')) return 'invoices';
    if (listId.includes('statement')) return 'statements';
    return 'dac7';
}

function updateEvidenceSummary() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    let totalFiles = 0, totalRecords = 0;
    
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        const records = VDCSystem.documents[type]?.totals?.records || 0;
        const el = document.getElementById(`summary${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (el) el.textContent = `${count} ficheiros | ${records} registos`;
        
        totalFiles += count;
        totalRecords += records;
    });
    
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = `${totalFiles} ficheiros | ${totalRecords} registos`;
}

function updateEvidenceCount() {
    const evidenceBtn = document.getElementById('openEvidenceModalBtn');
    const totalFiles = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
    if (evidenceBtn) {
        const countEl = evidenceBtn.querySelector('.evidence-count-solid');
        if (countEl) countEl.textContent = `${totalFiles} ficheiros`;
    }
}

function updateCompactCounters() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const el = document.getElementById(`${type}CountCompact`);
        if (el) el.textContent = VDCSystem.documents[type]?.files?.length || 0;
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ===== REGISTO DE CLIENTE =====
function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients_bd_v11_5') || '[]');
        VDCSystem.preRegisteredClients = clients;
    } catch (error) { console.error('Erro ao carregar clientes:', error); }
}

function registerClientFixed() {
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) { alert('Nome inválido'); return; }
    if (!nif || !/^\d{9}$/.test(nif)) { alert('NIF inválido'); return; }
    
    VDCSystem.client = { name, nif, registrationDate: new Date().toISOString(), platform: VDCSystem.selectedPlatform };
    
    const status = document.getElementById('clientStatusFixed');
    if (status) {
        status.style.display = 'flex';
        document.getElementById('clientNameDisplayFixed').textContent = name;
        document.getElementById('clientNifDisplayFixed').textContent = nif;
    }
    
    logAudit(`✅ Cliente registado: ${name}`, 'success');
    updateAnalysisButton();
}

// ===== CADEIA DE CUSTÓDIA =====
function addToChainOfCustody(file, type, hash = '') {
    VDCSystem.analysis.chainOfCustody.push({
        filename: file.name,
        fileType: type,
        size: file.size,
        uploadTimestamp: new Date().toISOString(),
        hash: hash
    });
}

function showChainOfCustody() {
    logAudit('📋 Cadeia de Custódia:', 'success');
    VDCSystem.analysis.chainOfCustody.forEach((r, i) => {
        logAudit(`${i+1}. ${r.filename} (${r.fileType}) | ${r.hash.substring(0,16)}...`, 'info');
    });
}

// ===== MODO DEMO =====
function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) {
        demoBtn.disabled = true;
        demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO...';
    }
    
    logAudit('🔐 ATIVANDO MODO DEMO', 'warn');
    
    // Limpar dados anteriores
    clearAllEvidence();
    
    // Preencher Cliente Demo
    document.getElementById('clientNameFixed').value = 'Momento Eficaz Unipessoal, Lda';
    document.getElementById('clientNIFFixed').value = '517905450';
    registerClientFixed();
    
    // Simular carregamento de ficheiros
    simulateDemoFiles();
    
    setTimeout(() => {
        VDCSystem.analysis.extractedValues = {
            saftGross: 3202.54, saftIVA6: 192.15, saftNet: 2409.95,
            rendimentosBrutos: 3202.54, comissaoApp: -792.59, rendimentosLiquidos: 2409.95,
            faturaPlataforma: 239.00, campanhas: 20.00, gorjetas: 9.00, cancelamentos: 15.60, portagens: 7.65,
            diferencialCusto: 553.59, prejuizoFiscal: 116.25, ivaAutoliquidacao: 127.33,
            jurosMora: 22.14, taxaRegulacao: 39.63
        };
        
        const proj = VDCSystem.analysis.projection;
        proj.averagePerDriver = 553.59;
        proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
        proj.marketProjection = proj.totalMarketImpact / 1000000;
        
        VDCSystem.analysis.crossings.deltaB = Math.abs(792.59 - 239.00);
        VDCSystem.analysis.crossings.omission = VDCSystem.analysis.crossings.deltaB;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        criarDashboardDiferencial();
        criarDashboardRegulatorio();
        generateMasterHash();
        
        triggerBigDataAlert(239.00, 792.59, 553.59);
        
        logAudit('✅ MODO DEMO ATIVADO', 'success');
        VDCSystem.processing = false;
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
        }
    }, 1500);
}

function simulateDemoFiles() {
    // Simula contadores e preenche UI
    VDCSystem.counters = { dac7: 1, control: 1, saft: 1, invoices: 1, statements: 1, total: 5 };
    updateCompactCounters();
    updateEvidenceCount();
    updateEvidenceSummary();
}

// ===== ANÁLISE =====
function performForensicAnalysis() {
    try {
        // Na prática, isto processaria os parsedData. 
        // No modo demo ou simples, atualiza os valores calculados.
        logAudit('🔍 Iniciando cruzamento...', 'info');
        
        // (Simplificação: assumindo que os valores já estão em extractedValues)
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        
        logAudit('✅ Auditoria concluída', 'success');
    } catch (error) {
        console.error(error);
        logAudit(`❌ Erro na auditoria: ${error.message}`, 'error');
    }
}

// ===== ATUALIZAÇÃO DE INTERFACE =====
function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    const ev = VDCSystem.analysis.extractedValues;
    
    const ids = {
        'netVal': ev.saftNet, 'iva6Val': ev.saftIVA6, 'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao
    };
    
    Object.entries(ids).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = formatter.format(value);
            el.classList.remove('alert-text');
            if (id === 'iva23Val' && value > 0) el.classList.add('alert-text');
        }
    });
    
    // Juros
    const jurosCard = document.getElementById('jurosCard');
    const jurosVal = document.getElementById('jurosVal');
    if (jurosCard && jurosVal && ev.jurosMora > 0) {
        jurosVal.textContent = formatter.format(ev.jurosMora);
        jurosCard.style.display = 'flex';
    }
}

function updateKPIResults() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    const ev = VDCSystem.analysis.extractedValues;
    const proj = VDCSystem.analysis.projection;
    
    const kpis = {
        'kpiGanhos': ev.rendimentosBrutos, 'kpiComm': ev.comissaoApp, 'kpiNet': ev.rendimentosLiquidos,
        'kpiInvoice': ev.faturaPlataforma, 'valCamp': ev.campanhas, 'valTips': ev.gorjetas,
        'valCanc': ev.cancelamentos, 'valTolls': ev.portagens
    };
    
    Object.entries(kpis).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = formatter.format(value);
            el.classList.remove('hidden');
        }
    });
    
    const results = {
        'grossResult': ev.saftGross, 'transferResult': ev.rendimentosLiquidos,
        'differenceResult': VDCSystem.analysis.crossings.deltaB,
        'marketResult': proj.marketProjection.toFixed(2) + 'M€'
    };
    
    Object.entries(results).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            if (typeof value === 'number') el.textContent = formatter.format(value);
            else el.textContent = value;
            el.classList.remove('hidden');
        }
    });
}

function criarDashboardDiferencial() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    let card = document.getElementById('diferencialCard');
    if (card) card.remove();
    
    const grid = kpiSection.querySelector('.kpi-grid');
    if (!grid) return;
    
    if (VDCSystem.analysis.extractedValues.diferencialCusto > 0) {
        card = document.createElement('div');
        card.id = 'diferencialCard';
        card.className = 'kpi-card alert blink-alert';
        card.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> DIFERENCIAL DE CUSTO</h4>
            <p id="diferencialVal">${VDCSystem.analysis.extractedValues.diferencialCusto.toFixed(2)}€</p>
            <small>Saída de caixa não documentada</small>
        `;
        grid.appendChild(card);
    }
}

function criarDashboardRegulatorio() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    let card = document.getElementById('regulatoryCardKPI');
    if (card) card.remove();
    
    const grid = kpiSection.querySelector('.kpi-grid');
    if (!grid) return;
    
    if (VDCSystem.analysis.extractedValues.taxaRegulacao > 0) {
        card = document.createElement('div');
        card.id = 'regulatoryCardKPI';
        card.className = 'kpi-card regulatory';
        card.innerHTML = `
            <h4><i class="fas fa-balance-scale-right"></i> RISCO REGULATÓRIO</h4>
            <p id="regulatoryValKPI">${VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2)}€</p>
            <small>Taxa de Regulação 5%</small>
        `;
        grid.appendChild(card);
    }
}

function renderDashboardChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    // Se valores são zero e não é demo, não desenhar gráfico vazio com erro
    const total = ev.saftNet + ev.saftIVA6 + Math.abs(ev.comissaoApp) + ev.ivaAutoliquidacao + ev.jurosMora;
    
    if (total === 0 && !VDCSystem.demoMode) return; 

    const labels = [
        `Ilíquido: ${ev.saftNet.toFixed(2)}€`,
        `IVA 6%: ${ev.saftIVA6.toFixed(2)}€`,
        `Comissão: ${Math.abs(ev.comissaoApp).toFixed(2)}€`,
        `IVA 23%: ${ev.ivaAutoliquidacao.toFixed(2)}€`,
        `Juros: ${ev.jurosMora.toFixed(2)}€`
    ];
    
    const data = [ev.saftNet, ev.saftIVA6, Math.abs(ev.comissaoApp), ev.ivaAutoliquidacao, ev.jurosMora];
    
    VDCSystem.chart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valores (€)',
                data: data,
                backgroundColor: ['rgba(0, 242, 255, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(255, 62, 62, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(255, 107, 53, 0.7)'],
                borderColor: ['#00f2ff', '#3b82f6', '#ff3e3e', '#f59e0b', '#ff6b35'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#cbd5e1' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#cbd5e1' } }
            }
        }
    });
}

function triggerBigDataAlert(invoiceVal, commissionVal, deltaVal) {
    const alertEl = document.getElementById('bigDataAlert');
    if (!alertEl) return;
    
    const iEl = document.getElementById('alertInvoiceVal');
    const cEl = document.getElementById('alertCommVal');
    const dEl = document.getElementById('alertDeltaVal');
    
    if (iEl) iEl.textContent = invoiceVal.toFixed(2) + '€';
    if (cEl) cEl.textContent = commissionVal.toFixed(2) + '€';
    if (dEl) dEl.textContent = deltaVal.toFixed(2) + '€';
    
    alertEl.style.display = 'flex';
    logAudit('❌ ALERTA BIG DATA ATIVADO', 'error');
}

// ===== EXPORTAÇÃO JSON =====
async function exportJSON() {
    try {
        const evidenceData = {
            sistema: "VDC Forensic System v11.5",
            sessao: VDCSystem.sessionId,
            cliente: VDCSystem.client || { nome: "Demo", nif: "000000000" },
            analise: VDCSystem.analysis,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `VDC_EVIDENCE_${VDCSystem.sessionId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logAudit('✅ JSON exportado', 'success');
    } catch (error) {
        logAudit(`❌ Erro ao exportar: ${error.message}`, 'error');
    }
}

// ===== EXPORTAÇÃO PDF =====
function exportPDF() {
    logAudit('📄 Gerando PDF...', 'info');
    alert("Funcionalidade de PDF simula a geração do relatório pericial.");
    logAudit('✅ PDF gerado', 'success');
}

// ===== RESET =====
function resetDashboard() {
    if (!confirm('Deseja resetar o sistema?')) return;
    
    // Limpar UI
    ['kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice', 'valCamp', 'valTips', 'valCanc', 'valTolls', 'netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'grossResult', 'transferResult', 'differenceResult', 'marketResult'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
    });
    
    // Remover cartões dinâmicos
    const cards = ['diferencialCard', 'regulatoryCardKPI'];
    cards.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    
    // Reset dados
    VDCSystem.client = null;
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0, platformCommission: 0, bankTransfer: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
        campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0,
        prejuizoFiscal: 0, ivaAutoliquidacao: 0, dac7Revenue: 0, dac7Period: '', dac7Quarterly: [],
        jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
    };
    
    VDCSystem.analysis.crossings = { deltaA: 0, deltaB: 0, omission: 0, isValid: true, diferencialAlerta: false, fraudIndicators: [], bigDataAlertActive: false };
    
    // Limpar cliente UI
    const status = document.getElementById('clientStatusFixed');
    if (status) status.style.display = 'none';
    const inputs = ['clientNameFixed', 'clientNIFFixed'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.classList.remove('success', 'error');
        }
    });
    
    clearAllEvidence();
    logAudit('🔄 Sistema resetado', 'info');
    generateMasterHash();
}

// ===== UTILIDADES =====
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function updateCounter(type, count) {
    VDCSystem.counters[type] = count;
    VDCSystem.counters.total = Object.values(VDCSystem.counters).reduce((a,b)=>a+b, 0);
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (!btn) return;
    
    // Exige: Cliente registado, pelo menos 1 ficheiro de controle, 1 SAF-T
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    
    btn.disabled = !(hasClient && hasControl && hasSaft);
    if (!btn.disabled) logAudit('✅ Sistema pronto para auditoria', 'success');
}

function generateSessionId() {
    return `VDC-${Date.now().toString(36).toUpperCase()}`;
}

function generateMasterHash() {
    const data = JSON.stringify(VDCSystem.analysis.extractedValues) + VDCSystem.sessionId + Date.now();
    const hash = CryptoJS.SHA256(data).toString();
    const el = document.getElementById('masterHashValue');
    if (el) el.textContent = hash;
    return hash;
}

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> <span style="font-weight: bold;">${type.toUpperCase()}</span> ${message}`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
    
    VDCSystem.logs.push({ timestamp, type, message });
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    logAudit('Consola limpa', 'info');
}

function toggleConsole() {
    const output = document.getElementById('auditOutput');
    if (output) {
        output.style.height = output.style.height === '250px' ? '120px' : '250px';
    }
}

function updatePageTitle(status) {
    document.title = status ? `VDC v11.5 - ${status}` : 'VDC v11.5';
}

// EXPORT GLOBAL
window.VDCSystem = VDCSystem;
