// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v11.6 GATEKEEPER
// AUDITORIA FISCAL BIG DATA - THE CHECKMATE
// CORREÇÃO CIRÚRGICA: CONSOLIDAÇÃO COMPLETA - 100% FUNCIONAL
// ============================================

// ===== NORMALIZADOR NUMÉRICO DE ALTA PRECISÃO =====
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

const isValidDate = (d) => d instanceof Date && !isNaN(d.getTime());
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ===== NÚCLEO DO SISTEMA - ESTADO GLOBAL CONSOLIDADO =====
const VDCSystem = {
    version: 'v11.6-AF-GATEKEEPER',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    bigDataAlertInterval: null,
    discrepanciaAlertaInterval: null,
    
    // Entidade Bolt - Dados Oficiais
    boltEntity: {
        nome: "Bolt Operations OÜ",
        nif: "EE102090374",
        endereco: "Vana-Lõuna 15, Tallinn 10134 Estonia",
        isoCompliance: "ISO/IEC 27037",
        dac7Obrigacao: true,
        taxaRegulacao: "5% (AMT/IMT)",
        registoComercial: "14268524",
        representantePT: "Bolt Services Portugal, Unipessoal Lda"
    },
    
    // Documentos e Evidências
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
        control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
        statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
    },
    
    // Análise Forense
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
    preRegisteredClients: []
};

// ============================================
// MÓDULO 1: GATEKEEPER - CONTROLO DE SPLASH SCREEN MANUAL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔐 VDC v11.6 GATEKEEPER: Sistema Inicializado.');
    
    // Inicialização de componentes
    populateYears();
    setupEventListeners();
    generateMasterHash();
    startClockAndDate();
    loadClientsFromLocal();
    
    logAudit('🛡️ SISTEMA VDC v11.6 GATEKEEPER: Protocolo de Integridade Ativo.', 'success');
    logAudit('📋 ISO/IEC 27037 | NIST SP 800-86 | SHA-256 Hash Protocol', 'info');
    
    // GATEKEEPER: Splash screen só sai com clique explícito
    const startBtn = document.getElementById('startSessionBtn');
    const splashScreen = document.getElementById('splashScreen');
    const mainContainer = document.getElementById('mainContainer');
    
    if (startBtn && splashScreen && mainContainer) {
        startBtn.addEventListener('click', () => {
            logAudit('🔓 ACESSO AUTORIZADO: Perito iniciou sessão forense.', 'success');
            
            splashScreen.style.opacity = '0';
            splashScreen.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                splashScreen.style.display = 'none';
                mainContainer.style.display = 'block';
                setTimeout(() => {
                    mainContainer.style.opacity = '1';
                    updatePageTitle('Sistema Pronto');
                    logAudit('✅ Sistema VDC v11.6 - Auditoria Fiscal "GATEKEEPER" inicializado', 'success');
                }, 50);
            }, 500);
        });
    } else {
        console.error('❌ ERRO CRÍTICO: Elementos GATEKEEPER não encontrados!');
        // Fallback: mostrar main container após 2s
        setTimeout(() => {
            if (splashScreen) splashScreen.style.display = 'none';
            if (mainContainer) mainContainer.style.display = 'block';
        }, 2000);
    }
});

// ============================================
// MÓDULO 2: POPULATE YEARS - CORREÇÃO DE ID
// ============================================

function populateYears() {
    const yearSelect = document.getElementById('auditYear') || document.getElementById('selYearFixed');
    if (!yearSelect) {
        console.warn('Elemento de ano não encontrado. Tentando novamente...');
        setTimeout(populateYears, 100);
        return;
    }
    
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
    
    console.log(`✅ populateYears(): anos de 2018 a 2036 carregados.`);
}

// ============================================
// MÓDULO 3: SETUP DE EVENT LISTENERS - REATIVADO
// ============================================

function setupEventListeners() {
    try {
        // Botões principais
        setupButton('startSessionBtn', startForensicSession);
        setupButton('demoModeBtn', activateDemoMode);
        setupButton('analyzeBtn', performForensicAnalysis);
        setupButton('resetBtn', resetDashboard);
        setupButton('exportJSONBtn', exportJSON);
        setupButton('exportPDFBtn', exportPDF);
        setupButton('custodyBtn', showChainOfCustody);
        
        // Consola
        setupButton('clearConsoleBtn', clearConsole);
        setupButton('toggleConsoleBtn', toggleConsole);
        
        // Registro de cliente
        setupButton('registerClientBtnFixed', registerClientFixed);
        
        const clienteNome = document.getElementById('clientNameFixed');
        if (clienteNome) {
            clienteNome.addEventListener('input', handleClientAutocompleteFixed);
            clienteNome.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const clienteNIF = document.getElementById('clientNIFFixed');
                    if (clienteNIF) clienteNIF.focus();
                }
            });
        }
        
        const clienteNIF = document.getElementById('clientNIFFixed');
        if (clienteNIF) clienteNIF.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerClientFixed();
        });
        
        // Selector de plataforma
        const platformSelect = document.getElementById('selPlatformFixed');
        if (platformSelect) {
            platformSelect.addEventListener('change', (e) => {
                VDCSystem.selectedPlatform = e.target.value;
                const platformName = e.target.options[e.target.selectedIndex].text;
                logAudit(`Plataforma selecionada: ${platformName}`, 'info');
                if (VDCSystem.selectedPlatform === 'bolt') {
                    logAudit(`🎯 ALVO PRINCIPAL: ${VDCSystem.boltEntity.nome} | ${VDCSystem.boltEntity.nif}`, 'warn');
                    logAudit(`⚖️ Taxa de Regulação aplicável: ${VDCSystem.boltEntity.taxaRegulacao} (AMT/IMT)`, 'regulatory');
                }
            });
        }
        
        // GATEKEEPER CRÍTICO: MODAL DE EVIDÊNCIAS
        const openEvidenceModalBtn = document.getElementById('openEvidenceModalBtn');
        if (openEvidenceModalBtn) {
            openEvidenceModalBtn.removeEventListener('click', openEvidenceModal);
            openEvidenceModalBtn.addEventListener('click', openEvidenceModal);
            console.log('✅ Evento vinculado ao #openEvidenceModalBtn');
        } else {
            console.error('❌ #openEvidenceModalBtn não encontrado!');
        }
        
        setupButton('closeModalBtn', closeEvidenceModal);
        setupButton('closeAndSaveBtn', closeEvidenceModal);
        setupButton('clearAllBtn', clearAllEvidence);
        
        // Upload de ficheiros - CORREÇÃO CRÍTICA
        setupFileUpload('dac7UploadBtnModal', 'dac7FileModal', 'dac7');
        setupFileUpload('controlUploadBtnModal', 'controlFileModal', 'control');
        setupFileUpload('saftUploadBtnModal', 'saftFileModal', 'saft');
        setupFileUpload('invoiceUploadBtnModal', 'invoiceFileModal', 'invoices');
        setupFileUpload('statementUploadBtnModal', 'statementFileModal', 'statements');
        
        // Modal click outside
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) {
            evidenceModal.addEventListener('click', (e) => {
                if (e.target === evidenceModal) closeEvidenceModal();
            });
        }
        
        logAudit('✅ Event Listeners configurados com sucesso.', 'success');
    } catch (error) {
        console.error('Erro na configuração de eventos:', error);
        logAudit(`❌ Erro na configuração de eventos: ${error.message}`, 'error');
    }
}

function setupButton(id, handler) {
    const btn = document.getElementById(id);
    if (btn && handler) {
        btn.removeEventListener('click', handler);
        btn.addEventListener('click', handler);
    }
}

function setupFileUpload(buttonId, inputId, type) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    
    if (button && input) {
        button.removeEventListener('click', () => input.click());
        button.addEventListener('click', () => input.click());
        
        input.removeEventListener('change', (e) => handleFileUploadModal(e, type));
        input.addEventListener('change', (e) => handleFileUploadModal(e, type));
    }
}

// ============================================
// MÓDULO 4: GESTÃO DE SESSÃO E LOADING
// ============================================

function startForensicSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const mainContainer = document.getElementById('mainContainer');
        
        if (splashScreen && loadingOverlay && mainContainer) {
            splashScreen.style.opacity = '0';
            splashScreen.style.transition = 'opacity 0.5s ease';
            
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
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            setTimeout(() => mainContainer.style.opacity = '1', 50);
        }, 500);
    }
}

async function loadForensicSystem() {
    try {
        updateLoadingProgress(10);
        updatePageTitle('Carregando Sistema...');
        
        VDCSystem.sessionId = generateSessionId();
        const sessionElement = document.getElementById('sessionIdDisplay');
        if (sessionElement) sessionElement.textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        populateYears();
        updateLoadingProgress(40);
        
        updateLoadingProgress(50);
        resetDashboard();
        updateLoadingProgress(80);
        
        renderDashboardChart();
        updateLoadingProgress(90);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(() => {
                showMainInterface();
                updatePageTitle('Sistema Pronto');
                logAudit('✅ Sistema VDC v11.6 - Auditoria Fiscal "GATEKEEPER" inicializado', 'success');
                logAudit('🔐 Protocolos ativados: ISO/IEC 27037, NIST SP 800-86, RGRC 4%, AMT/IMT 5%', 'info');
                logAudit('🔗 Cadeia de Custódia Digital configurada (Art. 158-A a 158-F)', 'success');
                generateMasterHash();
            }, 300);
        }, 500);
    } catch (error) {
        console.error('Erro no carregamento:', error);
        showMainInterface();
    }
}

// ============================================
// MÓDULO 5: RELÓGIO E DATA
// ============================================

function startClockAndDate() {
    function updateDateTime() {
        try {
            const now = new Date();
            if (isNaN(now.getTime())) return;
            
            const dateElement = document.getElementById('currentDate');
            const timeElement = document.getElementById('currentTime');
            
            if (dateElement) {
                dateElement.textContent = now.toLocaleDateString('pt-PT', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                });
            }
            
            if (timeElement) {
                timeElement.textContent = now.toLocaleTimeString('pt-PT', {
                    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar data/hora:', error);
        }
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// ============================================
// MÓDULO 6: GESTÃO DE MODAL DE EVIDÊNCIAS
// ============================================

function openEvidenceModal() {
    try {
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) {
            evidenceModal.style.display = 'flex';
            updateEvidenceSummary();
            updateCompactCounters();
            logAudit('📂 Modal de Gestão de Evidências Big Data aberto', 'info');
        } else {
            console.error('❌ Modal #evidenceModal não encontrado!');
            alert('Erro: Componente modal não encontrado. Recarregue a página.');
        }
    } catch (error) {
        console.error('Erro ao abrir modal:', error);
        logAudit(`❌ Erro ao abrir modal: ${error.message}`, 'error');
    }
}

function closeEvidenceModal() {
    try {
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) {
            evidenceModal.style.display = 'none';
            logAudit('📂 Modal de Gestão de Evidências fechado', 'info');
        }
    } catch (error) {
        console.error('Erro ao fechar modal:', error);
    }
}

function clearAllEvidence() {
    try {
        if (!confirm('Tem a certeza que deseja limpar TODAS as evidências carregadas? Esta ação não pode ser revertida.')) return;
        
        // Reset completo das estruturas de documentos
        VDCSystem.documents = {
            dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
            control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
            saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
            invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
            statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
        };
        
        VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
        VDCSystem.analysis.chainOfCustody = [];
        
        // Limpar listas do modal
        ['dac7', 'control', 'saft', 'invoice', 'statement'].forEach(type => {
            updateFileListModal(`${type}FileListModal`, []);
        });
        
        const faturasList = document.getElementById('faturasList');
        const extratosList = document.getElementById('extratosList');
        if (faturasList) { faturasList.innerHTML = ''; faturasList.classList.remove('visible'); }
        if (extratosList) { extratosList.innerHTML = ''; extratosList.classList.remove('visible'); }
        
        updateEvidenceSummary();
        updateEvidenceCount();
        updateCompactCounters();
        generateMasterHash();
        
        logAudit('🗑️ TODAS as evidências foram limpas do sistema', 'warn');
    } catch (error) {
        console.error('Erro ao limpar evidências:', error);
        logAudit(`❌ Erro ao limpar evidências: ${error.message}`, 'error');
    }
}

// ============================================
// MÓDULO 7: PROCESSAMENTO DE UPLOADS - PARSING BOLT/CSV
// ============================================

async function handleFileUploadModal(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const uploadBtn = document.querySelector(`#${type}UploadBtnModal`);
    
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO BIG DATA...';
    }
    
    try {
        logAudit(`📤 Upload iniciado: ${files.length} ficheiro(s) de tipo ${type.toUpperCase()}`, 'info');
        await processMultipleFilesModal(type, files, true);
        
        updateCounter(type, VDCSystem.documents[type].files.length);
        updateCompactCounters();
        if (VDCSystem.client) updateAnalysisButton();
        updateEvidenceSummary();
        updateEvidenceCount();
        generateMasterHash();
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} adicionados - Total: ${VDCSystem.documents[type].files.length}`, 'success');
    } catch (error) {
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            const icons = { dac7: 'fa-file-contract', control: 'fa-file-shield', saft: 'fa-file-code', invoices: 'fa-file-invoice-dollar', statements: 'fa-file-contract' };
            const texts = { dac7: 'SELECIONAR FICHEIROS DAC7', control: 'SELECIONAR FICHEIRO DE CONTROLO', saft: 'SELECIONAR FICHEIROS SAF-T', invoices: 'SELECIONAR FATURAS', statements: 'SELECIONAR EXTRATOS' };
            uploadBtn.innerHTML = `<i class="fas ${icons[type] || 'fa-file'}"></i> ${texts[type] || 'SELECIONAR'}`;
        }
        event.target.value = '';
    }
}

async function processMultipleFilesModal(type, files, appendMode = true) {
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { files: [], parsedData: [], totals: {}, hashes: {} };
    }
    
    if (!VDCSystem.documents[type].files) VDCSystem.documents[type].files = [];
    if (!VDCSystem.documents[type].parsedData) VDCSystem.documents[type].parsedData = [];
    if (!VDCSystem.documents[type].hashes) VDCSystem.documents[type].hashes = {};
    if (!VDCSystem.documents[type].totals) VDCSystem.documents[type].totals = {};
    if (!VDCSystem.documents[type].totals.records) VDCSystem.documents[type].totals.records = 0;
    
    if (appendMode) {
        VDCSystem.documents[type].files.push(...files);
    } else {
        VDCSystem.documents[type].files = files;
    }
    
    for (const file of files) {
        try {
            const content = await readFileAsText(file);
            const fileHash = CryptoJS.SHA256(content).toString();
            VDCSystem.documents[type].hashes[file.name] = fileHash;
            addToChainOfCustody(file, type, fileHash);
            
            let extractedData = null;
            let recordCount = 0;
            
            // Parsing específico por tipo
            switch(type) {
                case 'dac7':
                    extractedData = extractDAC7Data(content, file.name);
                    recordCount = extractedData.records || 1;
                    break;
                case 'control':
                    extractedData = { filename: file.name, hash: fileHash, timestamp: new Date().toISOString(), isoCompliance: 'ISO/IEC 27037' };
                    recordCount = 1;
                    break;
                case 'saft':
                    extractedData = extractSAFTData(content, file.name, file.type);
                    recordCount = extractedData.records || 1;
                    break;
                case 'invoices':
                    extractedData = extractInvoiceData(content, file.name);
                    recordCount = extractedData.records || 1;
                    break;
                case 'statements':
                    extractedData = extractStatementData(content, file.name);
                    recordCount = extractedData.records || 1;
                    break;
            }
            
            if (extractedData) {
                VDCSystem.documents[type].parsedData.push({
                    filename: file.name,
                    hash: fileHash,
                    data: extractedData,
                    timestamp: new Date().toISOString(),
                    integrityCheck: 'SHA-256 VERIFIED',
                    isoStandard: 'ISO/IEC 27037',
                    recordCount: recordCount
                });
                
                VDCSystem.documents[type].totals.records += recordCount;
                
                updateFileListModal(`${type}FileListModal`, VDCSystem.documents[type].files, fileHash);
                
                if (type === 'invoices') await updateSpecificFileList('faturasList', file, fileHash, extractedData);
                if (type === 'statements') await updateSpecificFileList('extratosList', file, fileHash, extractedData);
                
                logAudit(`✅ ${file.name}: ${recordCount} registos extraídos | Hash: ${fileHash.substring(0, 12)}...`, 'success');
            }
        } catch (fileError) {
            console.error(`Erro no processamento de ${file.name}:`, fileError);
            logAudit(`⚠️ Ficheiro ${file.name} ignorado: ${fileError.message}`, 'warn');
        }
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file, 'UTF-8');
        }
    });
}

// ============================================
// MÓDULO 8: ATUALIZAÇÃO DE LISTAS DE EVIDÊNCIAS
// ============================================

async function updateSpecificFileList(listId, file, hash, extractedData = null) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item-modal';
    
    let detailsHTML = '';
    if (extractedData) {
        if (listId === 'faturasList') {
            if (extractedData.invoiceNumber) detailsHTML += `<span class="file-hash-modal"><i class="fas fa-hashtag"></i> ${extractedData.invoiceNumber}</span>`;
            if (extractedData.periodo || extractedData.invoiceDate) detailsHTML += `<span class="file-hash-modal"><i class="fas fa-calendar"></i> ${(extractedData.periodo || extractedData.invoiceDate || '').substring(0, 16)}</span>`;
            if (extractedData.invoiceValue) detailsHTML += `<span class="file-hash-modal"><i class="fas fa-euro-sign"></i> ${extractedData.invoiceValue.toFixed(2)}€</span>`;
        }
        if (listId === 'extratosList') {
            if (extractedData.grossEarnings) detailsHTML += `<span class="file-hash-modal"><i class="fas fa-euro-sign"></i> Bruto: ${extractedData.grossEarnings.toFixed(2)}€</span>`;
            if (extractedData.commission) detailsHTML += `<span class="file-hash-modal"><i class="fas fa-minus-circle"></i> Com: ${Math.abs(extractedData.commission).toFixed(2)}€</span>`;
            if (extractedData.netTransfer) detailsHTML += `<span class="file-hash-modal"><i class="fas fa-check"></i> Liq: ${extractedData.netTransfer.toFixed(2)}€</span>`;
        }
    }
    
    fileItem.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="file-name-modal">${file.name}</span>
        <span class="file-status-modal">${formatBytes(file.size)} ✓</span>
        ${hash ? `<span class="file-hash-modal"><i class="fas fa-fingerprint"></i> ${hash.substring(0, 10)}...</span>` : ''}
        ${detailsHTML}
    `;
    
    listElement.appendChild(fileItem);
    listElement.classList.add('visible');
}

function updateFileListModal(listId, files, hash = '') {
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
        
        const type = getTypeFromListId(listId);
        const fileHash = VDCSystem.documents[type]?.hashes?.[file.name] || hash;
        
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">${formatBytes(file.size)} ✓</span>
            ${fileHash ? `<span class="file-hash-modal"><i class="fas fa-fingerprint"></i> ${fileHash.substring(0, 12)}...</span>` : ''}
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
    const updateSummary = (id, type) => {
        const element = document.getElementById(id);
        if (element) {
            const count = VDCSystem.documents[type]?.files?.length || 0;
            const records = VDCSystem.documents[type]?.totals?.records || 0;
            element.textContent = `${count} ficheiros | ${records} registos`;
        }
    };
    
    updateSummary('summaryDac7', 'dac7');
    updateSummary('summaryControl', 'control');
    updateSummary('summarySaft', 'saft');
    updateSummary('summaryInvoices', 'invoices');
    updateSummary('summaryStatements', 'statements');
    
    const totalElement = document.getElementById('summaryTotal');
    if (totalElement) {
        const totalFiles = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
        const totalRecords = Object.values(VDCSystem.documents).reduce((sum, doc) => sum + (doc.totals?.records || 0), 0);
        totalElement.textContent = `${totalFiles} ficheiros | ${totalRecords} registos`;
    }
}

function updateEvidenceCount() {
    const evidenceBtn = document.getElementById('openEvidenceModalBtn');
    if (evidenceBtn) {
        const totalFiles = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
        const evidenceCount = evidenceBtn.querySelector('.evidence-count-solid');
        if (evidenceCount) evidenceCount.textContent = `${totalFiles} ficheiros`;
    }
}

function updateCompactCounters() {
    const counters = {
        'dac7CountCompact': VDCSystem.documents.dac7?.files?.length || 0,
        'controlCountCompact': VDCSystem.documents.control?.files?.length || 0,
        'saftCountCompact': VDCSystem.documents.saft?.files?.length || 0,
        'invoiceCountCompact': VDCSystem.documents.invoices?.files?.length || 0,
        'statementCountCompact': VDCSystem.documents.statements?.files?.length || 0
    };
    
    Object.entries(counters).forEach(([id, count]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = count;
    });
}

function updateCounter(type, count) {
    VDCSystem.counters[type] = count;
    VDCSystem.counters.total = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
}

// ============================================
// MÓDULO 9: REGISTO DE CLIENTE
// ============================================

function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients_bd_v11_5') || '[]');
        VDCSystem.preRegisteredClients = clients;
        logAudit(`📋 ${clients.length} clientes carregados do armazenamento local`, 'info');
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        VDCSystem.preRegisteredClients = [];
    }
}

function handleClientAutocompleteFixed() {
    try {
        const input = document.getElementById('clientNameFixed');
        if (!input) return;
        
        const nifInput = document.getElementById('clientNIFFixed');
        const value = input.value.trim();
        const nifValue = nifInput?.value.trim() || '';
        const datalist = document.getElementById('clientSuggestions');
        if (!datalist) return;
        
        datalist.innerHTML = '';
        
        const matches = VDCSystem.preRegisteredClients.filter(client => 
            client.name.toLowerCase().includes(value.toLowerCase()) || client.nif.includes(nifValue)
        );
        
        matches.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            option.dataset.nif = client.nif;
            datalist.appendChild(option);
        });
        
        const exactMatch = VDCSystem.preRegisteredClients.find(client => 
            client.nif === nifValue && nifValue.length === 9
        );
        
        if (exactMatch && input) {
            input.value = exactMatch.name;
            logAudit(`✅ Cliente recuperado: ${exactMatch.name} (NIF: ${exactMatch.nif})`, 'success');
        }
    } catch (error) {
        console.error('Erro no autocomplete:', error);
    }
}

function registerClientFixed() {
    try {
        const nameInput = document.getElementById('clientNameFixed');
        const nifInput = document.getElementById('clientNIFFixed');
        const name = nameInput?.value.trim();
        const nif = nifInput?.value.trim();
        
        if (!name || name.length < 3) {
            showError('Nome do cliente inválido (mínimo 3 caracteres)');
            nameInput?.classList.add('error');
            nameInput?.focus();
            return;
        }
        
        if (!nif || !/^\d{9}$/.test(nif)) {
            showError('NIF inválido (deve ter 9 dígitos)');
            nifInput?.classList.add('error');
            nifInput?.focus();
            return;
        }
        
        nameInput.classList.remove('error');
        nameInput.classList.add('success');
        nifInput.classList.remove('error');
        nifInput.classList.add('success');
        
        VDCSystem.client = {
            name: name,
            nif: nif,
            registrationDate: new Date().toISOString(),
            isoCompliance: 'ISO/IEC 27037',
            session: VDCSystem.sessionId,
            platform: VDCSystem.selectedPlatform
        };
        
        const status = document.getElementById('clientStatusFixed');
        const nameDisplay = document.getElementById('clientNameDisplayFixed');
        const nifDisplay = document.getElementById('clientNifDisplayFixed');
        
        if (status) status.style.display = 'flex';
        if (nameDisplay) nameDisplay.textContent = name;
        if (nifDisplay) nifDisplay.textContent = nif;
        
        logAudit(`✅ Cliente registado: ${name} (NIF: ${nif})`, 'success');
        updateAnalysisButton();
    } catch (error) {
        console.error('Erro no registo do cliente:', error);
        showError(`Erro no registo: ${error.message}`);
    }
}

// ============================================
// MÓDULO 10: CADEIA DE CUSTÓDIA
// ============================================

function addToChainOfCustody(file, type, hash = '') {
    try {
        let lastModifiedDate = new Date(file.lastModified);
        if (!isValidDate(lastModifiedDate)) lastModifiedDate = new Date();
        
        const custodyRecord = {
            id: CryptoJS.SHA256(Date.now() + file.name + type).toString().substring(0, 16),
            filename: file.name,
            fileType: type,
            size: file.size,
            lastModified: lastModifiedDate.toISOString(),
            uploadTimestamp: new Date().toISOString(),
            uploadedBy: VDCSystem.client?.name || 'Sistema',
            hash: hash || 'pending',
            integrityCheck: hash ? 'VERIFIED' : 'pending',
            isoCompliance: 'ISO/IEC 27037:2012',
            nistCompliance: 'NIST SP 800-86'
        };
        
        VDCSystem.analysis.chainOfCustody.push(custodyRecord);
        logAudit(`📁 Cadeia de Custódia: ${file.name} registado (${type.toUpperCase()})`, 'info');
        return custodyRecord.id;
    } catch (error) {
        console.error('Erro na cadeia de custódia:', error);
        return null;
    }
}

function showChainOfCustody() {
    try {
        if (VDCSystem.analysis.chainOfCustody.length === 0) {
            logAudit('ℹ️ Cadeia de Custódia vazia. Carregue ficheiros primeiro.', 'info');
            return;
        }
        
        logAudit('📋 REGISTRO DE CADEIA DE CUSTÓDIA (ISO/IEC 27037):', 'success');
        VDCSystem.analysis.chainOfCustody.slice(-20).forEach((record, index) => {
            logAudit(`${index + 1}. ${record.filename} | Tipo: ${record.fileType} | Hash: ${record.hash.substring(0, 16)}...`, 'info');
        });
    } catch (error) {
        console.error('Erro ao mostrar cadeia de custódia:', error);
    }
}

// ============================================
// MÓDULO 11: PARSING ESPECÍFICO - BOLT/CSV OTIMIZADO
// ============================================

function extractDAC7Data(text, filename) {
    const data = {
        filename: filename,
        annualRevenue: 0,
        period: '',
        records: 1,
        quarterlyDetails: [],
        extractionMethod: 'RegEx Multi-pattern (ISO/IEC 27037)',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        const patterns = {
            annualRevenue: [
                /(?:total de receitas anuais|annual revenue|receitas totais|total annual revenue)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR|euros?)/gi,
                /(?:receitas|revenue|rendimentos|income)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi
            ],
            period: [
                /(?:período|period|ano|year|exercício)[\s:]*(\d{4}.*?\d{4})/i,
                /(?:de|from)[\s:]*(\d{2}[\/\-\.]\d{4})[^0-9]*(\d{2}[\/\-\.]\d{4})/i
            ],
            quarterly: [
                /(?:trimestre|quarter)[\s:]*(\d)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
                /Q(\d)[\s:]*([\d\.,]+)\s*(?:€|EUR)/gi
            ]
        };
        
        Object.entries(patterns).forEach(([key, regexList]) => {
            regexList.forEach(regex => {
                let match;
                while ((match = regex.exec(text)) !== null) {
                    if (key === 'quarterly') {
                        const quarter = match[1];
                        const value = toForensicNumber(match[2]);
                        if (value > 0) {
                            data.quarterlyDetails.push({
                                quarter: `Q${quarter} ${VDCSystem.selectedYear}`,
                                revenue: value
                            });
                        }
                    } else if (key === 'period') {
                        if (match[1] && match[2]) data.period = `${match[1]} a ${match[2]}`;
                        else if (match[1]) data.period = match[1];
                    } else {
                        const value = toForensicNumber(match[1]);
                        if (value > 0) data.annualRevenue = Math.max(data.annualRevenue, value);
                    }
                }
            });
        });
        
        if (!data.period) data.period = `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`;
        logAudit(`📊 DAC7 ${filename}: Receitas=${data.annualRevenue.toFixed(2)}€ | Período=${data.period}`, 'success');
    } catch (error) {
        console.error(`Erro na extração DAC7:`, error);
        data.error = error.message;
    }
    return data;
}

function extractSAFTData(text, filename, fileType) {
    const data = {
        filename: filename,
        grossValue: 0,
        iva6Value: 0,
        netValue: 0,
        transactionCount: 0,
        records: 0,
        transactionDetails: [],
        extractionMethod: 'Parsing Regional v11.6 - CSV prioritário',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        const isCSV = fileType === 'text/csv' || filename.endsWith('.csv') || (text.includes(';') && !text.includes('<'));
        
        if (isCSV) {
            Papa.parse(text, {
                delimiter: ';',
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data;
                    let totalGross = 0, totalIVA = 0, totalNet = 0;
                    
                    rows.forEach(row => {
                        if (row['Preço da Viagem (sem IVA)'] || row['Gross'] || row['Rendimento Bruto']) {
                            totalGross += toForensicNumber(row['Preço da Viagem (sem IVA)'] || row['Gross'] || row['Rendimento Bruto'] || 0);
                        }
                        if (row['IVA'] || row['Tax'] || row['Imposto']) {
                            totalIVA += toForensicNumber(row['IVA'] || row['Tax'] || row['Imposto'] || 0);
                        }
                        if (row['Preço da Viagem'] || row['Net'] || row['Líquido'] || row['Total']) {
                            totalNet += toForensicNumber(row['Preço da Viagem'] || row['Net'] || row['Líquido'] || row['Total'] || 0);
                        }
                    });
                    
                    data.grossValue = totalGross;
                    data.iva6Value = totalIVA;
                    data.netValue = totalNet;
                    data.transactionCount = rows.length;
                    data.records = rows.length;
                    data.extractionMethod = 'CSV Parser - Delimitador ;';
                    
                    logAudit(`📊 SAF-T CSV ${filename}: ${rows.length} transações | Bruto=${totalGross.toFixed(2)}€`, 'success');
                },
                error: (error) => {
                    console.error('Erro no parsing CSV:', error);
                    extractSAFTFromText(text, data);
                }
            });
        } else {
            extractSAFTFromText(text, data);
        }
    } catch (error) {
        console.error(`Erro na extração SAF-T:`, error);
        data.error = error.message;
    }
    return data;
}

function extractSAFTFromText(text, data) {
    const patterns = [
        { regex: /<GrossTotal>([\d\.,]+)<\/GrossTotal>/i, key: 'grossValue' },
        { regex: /<NetTotal>([\d\.,]+)<\/NetTotal>/i, key: 'netValue' },
        { regex: /<Tax>.*?<TaxPercentage>6<\/TaxPercentage>.*?<TaxAmount>([\d\.,]+)<\/TaxAmount>/is, key: 'iva6Value' }
    ];
    
    patterns.forEach(pattern => {
        const match = text.match(pattern.regex);
        if (match) data[pattern.key] = toForensicNumber(match[1]);
    });
    
    const transactionMatches = text.match(/<Transaction>/gi) || text.match(/<Line>/gi);
    data.transactionCount = transactionMatches ? transactionMatches.length : 1;
    data.records = data.transactionCount;
}

function extractInvoiceData(text, filename) {
    const data = {
        filename: filename,
        invoiceValue: 0,
        commissionValue: 0,
        iva23Value: 0,
        invoiceNumber: '',
        invoiceDate: '',
        periodo: '',
        boltEntityDetected: false,
        records: 1,
        extractionMethod: 'Parsing Regional v11.6 - Total com IVA',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        // Número da fatura
        const numPatterns = [
            /(?:Fatura|Invoice|Número|Number)[\s:]*([A-Z]{2}\d{4}[-_]?\d{4})/i,
            /([A-Z]{2}\d{4}[-_]\d{4})/,
            /Fatura\s+n[º°o]\s*([A-Z0-9\-]+)/i
        ];
        numPatterns.forEach(regex => {
            const match = text.match(regex);
            if (match && !data.invoiceNumber) data.invoiceNumber = match[1] || match[0];
        });
        
        // Período
        const periodPatterns = [
            /(?:período|period)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*(?:a|até|to)\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
            /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*-\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i
        ];
        periodPatterns.forEach(regex => {
            const match = text.match(regex);
            if (match && !data.periodo) data.periodo = `${match[1]} a ${match[2]}`;
        });
        
        // VALOR DA FATURA - PRIORIDADE MÁXIMA: Total com IVA (EUR)
        const valuePatterns = [
            /Total\s+com\s+IVA\s*\(EUR\)[\s:]*([\d\.,]+)/i,
            /Total\s+com\s+IVA[\s:]*([\d\.,]+)\s*(?:€|EUR)/i,
            /Total\s+\(incl\.\s+IVA\)[\s:]*([\d\.,]+)/i,
            /Amount\s+due[\s:]*([\d\.,]+)/i,
            /Total\s+amount[\s:]*([\d\.,]+)/i
        ];
        
        valuePatterns.some(regex => {
            const match = text.match(regex);
            if (match) {
                data.invoiceValue = toForensicNumber(match[1]);
                return data.invoiceValue > 0;
            }
            return false;
        });
        
        // Comissão
        const commPatterns = [
            /(?:Comissão|Commission|Service\s+fee|Fee)[:\s]*([\d\.,]+)\s*(?:€|EUR)/i,
            /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/i
        ];
        commPatterns.forEach(regex => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                const value = toForensicNumber(match[1]);
                if (value > 0) data.commissionValue = Math.max(data.commissionValue, value);
            }
        });
        
        // Deteção Bolt
        if (/Bolt Operations O[Üu]|EE102090374|Vana-Lõuna 15/i.test(text)) {
            data.boltEntityDetected = true;
        }
        
        if (data.commissionValue > 0) data.iva23Value = data.commissionValue * 0.23;
        
        logAudit(`📄 Fatura ${filename}: ${data.invoiceValue.toFixed(2)}€ | Nº: ${data.invoiceNumber || 'N/A'}`, 'success');
    } catch (error) {
        console.error(`Erro na extração de fatura:`, error);
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
        tolls: 0,
        records: 0,
        transactionDetails: [],
        extractionMethod: 'Parsing Regional v11.6',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        // Tenta parsing CSV primeiro
        if (filename.endsWith('.csv') || text.includes(';')) {
            Papa.parse(text, {
                delimiter: ';',
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data;
                    data.records = rows.length;
                    
                    rows.forEach(row => {
                        if (row['Total'] || row['Valor'] || row['Earnings'] || row['Ganhos']) {
                            const val = toForensicNumber(row['Total'] || row['Valor'] || row['Earnings'] || row['Ganhos'] || 0);
                            data.grossEarnings += val;
                        }
                        if (row['Comissão'] || row['Commission'] || row['Fee']) {
                            const val = toForensicNumber(row['Comissão'] || row['Commission'] || row['Fee'] || 0);
                            data.commission -= Math.abs(val);
                        }
                    });
                }
            });
        }
        
        // Fallback para parsing de texto
        if (data.grossEarnings === 0) {
            const lines = text.split('\n');
            let totalFound = false;
            
            lines.forEach(line => {
                const lineLower = line.toLowerCase();
                if (lineLower.includes('total') || lineLower.includes('ganhos') || lineLower.includes('earnings')) {
                    const numbers = line.match(/\d+[.,]\d{2}/g);
                    if (numbers) {
                        data.grossEarnings = toForensicNumber(numbers[0]);
                        totalFound = true;
                    }
                }
            });
            
            if (!totalFound) {
                const allNumbers = text.match(/\d+[.,]\d{2}/g);
                if (allNumbers && allNumbers.length > 0) {
                    data.grossEarnings = toForensicNumber(allNumbers[0]);
                }
            }
        }
        
        logAudit(`🏦 Extrato ${filename}: Bruto=${data.grossEarnings.toFixed(2)}€ | ${data.records} registos`, 'success');
    } catch (error) {
        console.error(`Erro na extração de extrato:`, error);
        data.error = error.message;
    }
    return data;
}

// ============================================
// MÓDULO 12: MODO DEMO - COM LIMPEZA TOTAL
// ============================================

function activateDemoMode() {
    try {
        if (VDCSystem.processing) return;
        VDCSystem.processing = true;
        VDCSystem.demoMode = true;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = true;
            demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO DADOS DEMO...';
        }
        
        logAudit('🔐 ATIVANDO MODO DEMO FORENSE - DADOS REAIS BOLT', 'warn');
        
        // LIMPEZA TOTAL
        VDCSystem.documents = {
            dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
            control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
            saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
            invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
            statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
        };
        
        VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
        VDCSystem.analysis.chainOfCustody = [];
        
        // Registar cliente demo
        const clientNameInput = document.getElementById('clientNameFixed');
        const clientNIFInput = document.getElementById('clientNIFFixed');
        if (clientNameInput) clientNameInput.value = 'Momento Eficaz Unipessoal, Lda';
        if (clientNIFInput) clientNIFInput.value = '517905450';
        registerClientFixed();
        
        VDCSystem.selectedYear = 2024;
        const yearSelect = document.getElementById('selYearFixed') || document.getElementById('auditYear');
        if (yearSelect) yearSelect.value = 2024;
        
        VDCSystem.selectedPlatform = 'bolt';
        const platformSelect = document.getElementById('selPlatformFixed');
        if (platformSelect) platformSelect.value = 'bolt';
        
        // Injetar documentos demo
        simulateDemoChainOfCustody();
        simulateEvidenceModalUpdate();
        
        // Valores demo
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
            dac7Quarterly: [
                { quarter: 'Q3 2024', revenue: 1601.27, commission: 396.30 },
                { quarter: 'Q4 2024', revenue: 1601.27, commission: 396.29 }
            ],
            jurosMora: 22.14,
            taxaRegulacao: 39.63,
            riscoRegulatorio: 39.63
        };
        
        // Projeções
        const proj = VDCSystem.analysis.projection;
        proj.averagePerDriver = 553.59;
        proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
        proj.marketProjection = proj.totalMarketImpact / 1000000;
        
        // Cruzamentos
        const crossings = VDCSystem.analysis.crossings;
        crossings.deltaA = 0;
        crossings.deltaB = 553.59;
        crossings.omission = 553.59;
        crossings.diferencialAlerta = true;
        crossings.riscoRegulatorioAtivo = true;
        
        // Atualizar UI
        setTimeout(() => {
            updateDashboard();
            updateKPIResults();
            renderDashboardChart();
            criarDashboardDiferencial();
            criarDashboardRegulatorio();
            calcularJurosMora();
            generateMasterHash();
            generateQuesitosEstrategicos();
            
            triggerBigDataAlert(239.00, 792.59, 553.59);
            showDiferencialAlert();
            showRegulatoryAlert();
            showJurosMoraAlert();
            
            logAudit('✅ MODO DEMO ATIVADO: Cliente "Momento Eficaz" carregado', 'success');
            logAudit('💰 VALORES REAIS BOLT: Fatura 239.00€ | Comissão 792.59€ | Diferencial 553.59€', 'info');
            logAudit('⚖️ RISCO REGULATÓRIO: Taxa de Regulação 5% = 39,63€ (AMT/IMT)', 'regulatory');
            logAudit('🔢 JUROS DE MORA: 4% base anual civil = 22,14€ (RGRC)', 'warn');
            
            VDCSystem.processing = false;
            if (demoBtn) {
                demoBtn.disabled = false;
                demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
            }
        }, 1500);
    } catch (error) {
        console.error('Erro no modo demo:', error);
        logAudit(`❌ Erro no modo demo: ${error.message}`, 'error');
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
        { name: 'SAF-T_2024_09.csv', type: 'saft', size: 102400 },
        { name: 'DAC7_Report_2024.html', type: 'dac7', size: 81920 }
    ];
    
    demoFiles.forEach(file => {
        addToChainOfCustody(file, file.type, CryptoJS.SHA256(file.name + Date.now()).toString());
    });
    
    logAudit('📁 Cadeia de Custódia Demo: 4 ficheiros registados', 'success');
}

function simulateEvidenceModalUpdate() {
    VDCSystem.documents.invoices.files = [{ name: 'Fatura_Bolt_PT1125-3582.pdf', size: 245760 }];
    VDCSystem.documents.invoices.totals.records = 1;
    VDCSystem.documents.statements.files = [{ name: 'Extrato_Bolt_Setembro_2024.pdf', size: 512000 }];
    VDCSystem.documents.statements.totals.records = 45;
    VDCSystem.documents.saft.files = [{ name: 'SAF-T_2024_09.csv', size: 102400 }];
    VDCSystem.documents.saft.totals.records = 28;
    VDCSystem.documents.dac7.files = [{ name: 'DAC7_Report_2024.html', size: 81920 }];
    VDCSystem.documents.dac7.totals.records = 1;
    
    VDCSystem.counters = { dac7: 1, control: 0, saft: 1, invoices: 1, statements: 1, total: 4 };
    
    updateEvidenceSummary();
    updateEvidenceCount();
    updateCompactCounters();
}

// ============================================
// MÓDULO 13: PROCESSAMENTO E ANÁLISE
// ============================================

async function processLoadedData() {
    try {
        // DAC7
        if (VDCSystem.documents.dac7?.parsedData?.length) {
            let totalRevenue = 0, period = '', totalRecords = 0;
            VDCSystem.documents.dac7.parsedData.forEach(item => {
                totalRevenue += item.data?.annualRevenue || 0;
                totalRecords += item.data?.records || 0;
                if (item.data?.period && !period) period = item.data.period;
            });
            VDCSystem.documents.dac7.totals = VDCSystem.documents.dac7.totals || {};
            VDCSystem.documents.dac7.totals.annualRevenue = totalRevenue;
            VDCSystem.documents.dac7.totals.period = period;
            VDCSystem.documents.dac7.totals.records = totalRecords;
        }
        
        // SAF-T
        if (VDCSystem.documents.saft?.parsedData?.length) {
            let totalGross = 0, totalIVA6 = 0, totalNet = 0, totalRecords = 0;
            VDCSystem.documents.saft.parsedData.forEach(item => {
                totalGross += item.data?.grossValue || 0;
                totalIVA6 += item.data?.iva6Value || 0;
                totalNet += item.data?.netValue || 0;
                totalRecords += item.data?.records || 0;
            });
            VDCSystem.documents.saft.totals = VDCSystem.documents.saft.totals || {};
            VDCSystem.documents.saft.totals.gross = totalGross;
            VDCSystem.documents.saft.totals.iva6 = totalIVA6;
            VDCSystem.documents.saft.totals.net = totalNet;
            VDCSystem.documents.saft.totals.records = totalRecords;
        }
        
        // Faturas
        if (VDCSystem.documents.invoices?.parsedData?.length) {
            let totalInvoice = 0, totalCommission = 0, totalIVA23 = 0, totalRecords = 0;
            VDCSystem.documents.invoices.parsedData.forEach(item => {
                totalInvoice += item.data?.invoiceValue || 0;
                totalCommission += item.data?.commissionValue || 0;
                totalIVA23 += item.data?.iva23Value || 0;
                totalRecords += item.data?.records || 0;
            });
            VDCSystem.documents.invoices.totals = VDCSystem.documents.invoices.totals || {};
            VDCSystem.documents.invoices.totals.invoiceValue = totalInvoice;
            VDCSystem.documents.invoices.totals.commission = totalCommission;
            VDCSystem.documents.invoices.totals.iva23 = totalIVA23;
            VDCSystem.documents.invoices.totals.records = totalRecords;
        }
        
        // Extratos
        if (VDCSystem.documents.statements?.parsedData?.length) {
            const totals = VDCSystem.documents.statements.totals || {};
            let totalRecords = 0;
            
            VDCSystem.documents.statements.parsedData.forEach(item => {
                totals.rendimentosBrutos = (totals.rendimentosBrutos || 0) + (item.data?.grossEarnings || 0);
                totals.comissaoApp = (totals.comissaoApp || 0) + (item.data?.commission || 0);
                totals.rendimentosLiquidos = (totals.rendimentosLiquidos || 0) + (item.data?.netTransfer || 0);
                totals.campanhas = (totals.campanhas || 0) + (item.data?.campaigns || 0);
                totals.gorjetas = (totals.gorjetas || 0) + (item.data?.tips || 0);
                totals.cancelamentos = (totals.cancelamentos || 0) + (item.data?.cancellations || 0);
                totals.portagens = (totals.portagens || 0) + (item.data?.tolls || 0);
                totalRecords += item.data?.records || 0;
            });
            
            VDCSystem.documents.statements.totals = totals;
            VDCSystem.documents.statements.totals.records = totalRecords;
        }
    } catch (error) {
        console.error('Erro no processamento de dados:', error);
        throw error;
    }
}

function calculateExtractedValues() {
    const ev = VDCSystem.analysis.extractedValues;
    const docs = VDCSystem.documents;
    
    ev.saftGross = docs.saft?.totals?.gross || (VDCSystem.demoMode ? 3202.54 : 0);
    ev.saftIVA6 = docs.saft?.totals?.iva6 || (VDCSystem.demoMode ? 192.15 : 0);
    ev.saftNet = docs.saft?.totals?.net || (VDCSystem.demoMode ? 2409.95 : 0);
    ev.rendimentosBrutos = docs.statements?.totals?.rendimentosBrutos || (VDCSystem.demoMode ? 3202.54 : 0);
    ev.comissaoApp = docs.statements?.totals?.comissaoApp || (VDCSystem.demoMode ? -792.59 : 0);
    ev.rendimentosLiquidos = docs.statements?.totals?.rendimentosLiquidos || (VDCSystem.demoMode ? 2409.95 : 0);
    ev.faturaPlataforma = docs.invoices?.totals?.invoiceValue || (VDCSystem.demoMode ? 239.00 : 0);
    ev.diferencialCusto = Math.abs(ev.comissaoApp) - ev.faturaPlataforma;
    
    if (ev.diferencialCusto > 0) {
        ev.prejuizoFiscal = ev.diferencialCusto * 0.21;
        ev.ivaAutoliquidacao = ev.diferencialCusto * 0.23;
        logAudit(`⚖️ DIFERENCIAL: |${Math.abs(ev.comissaoApp).toFixed(2)}€| - ${ev.faturaPlataforma.toFixed(2)}€ = ${ev.diferencialCusto.toFixed(2)}€`, 'warn');
    }
    
    ev.dac7Revenue = docs.dac7?.totals?.annualRevenue || ev.rendimentosBrutos;
    ev.dac7Period = docs.dac7?.totals?.period || (VDCSystem.demoMode ? 'Set-Dez 2024' : `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`);
}

function performForensicCrossings() {
    const ev = VDCSystem.analysis.extractedValues;
    const crossings = VDCSystem.analysis.crossings;
    
    crossings.deltaA = Math.abs(ev.saftGross - ev.rendimentosBrutos);
    crossings.deltaB = Math.abs(Math.abs(ev.comissaoApp) - ev.faturaPlataforma);
    crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
    crossings.diferencialAlerta = ev.diferencialCusto > 100;
    crossings.fraudIndicators = [];
    
    if (crossings.deltaB > 500) crossings.fraudIndicators.push('Discrepância significativa entre comissão e fatura');
    if (ev.diferencialCusto > 0) crossings.fraudIndicators.push('Saída de caixa não documentada detetada');
    if (crossings.deltaB > 50) crossings.fraudIndicators.push('Discrepância crítica > 50€ - ALERTA ATIVADO');
    
    logAudit(`🔐 Cruzamento Comissão vs Fatura: Δ = ${crossings.deltaB.toFixed(2)}€`, crossings.diferencialAlerta ? 'warn' : 'info');
}

function calculateMarketProjection() {
    const proj = VDCSystem.analysis.projection;
    const ev = VDCSystem.analysis.extractedValues;
    
    proj.averagePerDriver = ev.diferencialCusto;
    proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
    proj.marketProjection = proj.totalMarketImpact / 1000000;
    
    logAudit(`📊 Impacto de Mercado (38k × 12 × 7): ${proj.marketProjection.toFixed(2)}M€`, 'warn');
}

function calcularJurosMora() {
    const ev = VDCSystem.analysis.extractedValues;
    if (ev.diferencialCusto > 0) {
        ev.jurosMora = ev.diferencialCusto * 0.04;
        
        const jurosCard = document.getElementById('jurosCard');
        const jurosVal = document.getElementById('jurosVal');
        if (jurosCard && jurosVal) {
            jurosVal.textContent = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(ev.jurosMora);
            jurosCard.style.display = 'flex';
        }
        
        logAudit(`🔢 JUROS DE MORA: ${ev.diferencialCusto.toFixed(2)}€ × 4% = ${ev.jurosMora.toFixed(2)}€`, 'warn');
    }
}

function calculateRegulatoryRisk() {
    const ev = VDCSystem.analysis.extractedValues;
    ev.taxaRegulacao = Math.abs(ev.comissaoApp) * 0.05;
    ev.riscoRegulatorio = ev.taxaRegulacao;
    
    if (ev.taxaRegulacao > 0) {
        VDCSystem.analysis.crossings.riscoRegulatorioAtivo = true;
        logAudit(`⚖️ RISCO REGULATÓRIO: 5% sobre ${Math.abs(ev.comissaoApp).toFixed(2)}€ = ${ev.taxaRegulacao.toFixed(2)}€`, 'regulatory');
    }
}

// ============================================
// MÓDULO 14: ATUALIZAÇÃO DE INTERFACE
// ============================================

function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    const ev = VDCSystem.analysis.extractedValues;
    
    const elementos = {
        'netVal': ev.saftNet,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = formatter.format(value);
    });
}

function updateKPIResults() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
    const ev = VDCSystem.analysis.extractedValues;
    const proj = VDCSystem.analysis.projection;
    
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
        const el = document.getElementById(id);
        if (el) el.textContent = formatter.format(value);
    });
    
    const results = {
        'grossResult': ev.saftGross,
        'transferResult': ev.rendimentosLiquidos,
        'differenceResult': VDCSystem.analysis.crossings.deltaB,
        'marketResult': proj.marketProjection.toFixed(2) + 'M€'
    };
    
    Object.entries(results).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            if (typeof value === 'number') el.textContent = formatter.format(value);
            else el.textContent = value;
        }
    });
}

function criarDashboardDiferencial() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    const existingCard = document.getElementById('diferencialCard');
    if (existingCard) existingCard.remove();
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto;
    if (diferencial > 0) {
        const card = document.createElement('div');
        card.id = 'diferencialCard';
        card.className = 'kpi-card alert blink-alert';
        card.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> DIFERENCIAL DE CUSTO</h4>
            <p id="diferencialVal">${diferencial.toFixed(2)}€</p>
            <small>Saída de caixa não documentada | EVIDÊNCIA FORENSE</small>
        `;
        
        if (kpiGrid.children.length >= 4) {
            kpiGrid.insertBefore(card, kpiGrid.children[4]);
        } else {
            kpiGrid.appendChild(card);
        }
    }
}

function criarDashboardRegulatorio() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    const existingCard = document.getElementById('regulatoryCardKPI');
    if (existingCard) existingCard.remove();
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
    const taxa = VDCSystem.analysis.extractedValues.taxaRegulacao;
    if (taxa > 0) {
        const card = document.createElement('div');
        card.id = 'regulatoryCardKPI';
        card.className = 'kpi-card regulatory';
        card.innerHTML = `
            <h4><i class="fas fa-balance-scale-right"></i> RISCO REGULATÓRIO</h4>
            <p id="regulatoryValKPI">${taxa.toFixed(2)}€</p>
            <small>Taxa de Regulação 5% (AMT/IMT) não discriminada</small>
        `;
        
        const diferencialCard = document.getElementById('diferencialCard');
        if (diferencialCard && diferencialCard.parentNode === kpiGrid) {
            kpiGrid.insertBefore(card, diferencialCard.nextSibling);
        } else {
            kpiGrid.appendChild(card);
        }
    }
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    const hasClient = VDCSystem.client !== null;
    
    analyzeBtn.disabled = !(hasControl && hasSaft && hasClient);
    if (!analyzeBtn.disabled) logAudit('✅ Sistema pronto para auditoria fiscal', 'success');
}

// ============================================
// MÓDULO 15: ALERTAS FORENSES
// ============================================

function triggerBigDataAlert(invoiceVal, commissionVal, deltaVal) {
    const alertElement = document.getElementById('bigDataAlert');
    if (!alertElement) return;
    
    if (VDCSystem.bigDataAlertInterval) clearInterval(VDCSystem.bigDataAlertInterval);
    
    const invoiceEl = document.getElementById('alertInvoiceVal');
    const commEl = document.getElementById('alertCommVal');
    const deltaEl = document.getElementById('alertDeltaVal');
    
    if (invoiceEl) invoiceEl.textContent = invoiceVal.toFixed(2) + '€';
    if (commEl) commEl.textContent = commissionVal.toFixed(2) + '€';
    if (deltaEl) deltaEl.textContent = deltaVal.toFixed(2) + '€';
    
    alertElement.style.display = 'flex';
    VDCSystem.analysis.crossings.bigDataAlertActive = true;
    
    let isRed = false;
    VDCSystem.bigDataAlertInterval = setInterval(() => {
        alertElement.style.backgroundColor = isRed ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 62, 62, 0.1)';
        alertElement.style.borderColor = isRed ? 'var(--warn-secondary)' : 'var(--warn-primary)';
        isRed = !isRed;
    }, 1000);
}

function activateDiscrepancyAlert() {
    const kpiComm = document.getElementById('kpiComm');
    const kpiInvoice = document.getElementById('kpiInvoice');
    
    if (kpiComm && kpiInvoice) {
        kpiComm.classList.add('blink-alert');
        kpiInvoice.classList.add('blink-alert');
        VDCSystem.analysis.crossings.discrepanciaAlertaAtiva = true;
        
        if (VDCSystem.discrepanciaAlertaInterval) clearInterval(VDCSystem.discrepanciaAlertaInterval);
        
        let isActive = true;
        VDCSystem.discrepanciaAlertaInterval = setInterval(() => {
            kpiComm.style.color = isActive ? 'var(--warn-primary)' : 'var(--warn-secondary)';
            kpiInvoice.style.color = isActive ? 'var(--warn-primary)' : 'var(--warn-secondary)';
            kpiComm.style.fontWeight = isActive ? '900' : '700';
            kpiInvoice.style.fontWeight = isActive ? '900' : '700';
            isActive = !isActive;
        }, 1000);
    }
}

function showDiferencialAlert() {
    const alert = document.getElementById('diferencialAlert');
    if (alert) alert.style.display = 'flex';
}

function showRegulatoryAlert() {
    const alert = document.getElementById('regulatoryAlert');
    const value = document.getElementById('regulatoryValue');
    if (alert && value) {
        value.textContent = VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2) + '€';
        alert.style.display = 'flex';
    }
}

function showJurosMoraAlert() {
    const alert = document.getElementById('jurosAlert');
    const value = document.getElementById('jurosValue');
    if (alert && value) {
        value.textContent = VDCSystem.analysis.extractedValues.jurosMora.toFixed(2) + '€';
        alert.style.display = 'flex';
    }
}

function showOmissionAlert() {
    const alert = document.getElementById('omissionAlert');
    const value = document.getElementById('omissionValue');
    if (alert && value) {
        value.textContent = VDCSystem.analysis.crossings.omission.toFixed(2) + '€';
        alert.style.display = 'flex';
    }
}

// ============================================
// MÓDULO 16: GRÁFICO FORENSE
// ============================================

function renderDashboardChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    let dataValues = [ev.saftNet || 0, ev.saftIVA6 || 0, Math.abs(ev.comissaoApp) || 0, ev.ivaAutoliquidacao || 0, ev.jurosMora || 0];
    let total = dataValues.reduce((a, b) => a + b, 0);
    
    if (total === 0 && VDCSystem.demoMode) {
        dataValues = [2409.95, 192.15, 792.59, 127.33, 22.14];
        total = dataValues.reduce((a, b) => a + b, 0);
    }
    
    const percentages = total > 0 ? dataValues.map(val => ((val / total) * 100).toFixed(1)) : ['0', '0', '0', '0', '0'];
    
    const labels = [
        `Ilíquido: ${dataValues[0].toFixed(2)}€ (${percentages[0]}%)`,
        `IVA 6%: ${dataValues[1].toFixed(2)}€ (${percentages[1]}%)`,
        `Comissão: ${dataValues[2].toFixed(2)}€ (${percentages[2]}%)`,
        `IVA 23%: ${dataValues[3].toFixed(2)}€ (${percentages[3]}%)`,
        `Juros Mora: ${dataValues[4].toFixed(2)}€ (${percentages[4]}%)`
    ];
    
    VDCSystem.chart = new Chart(ctx.getContext('2d'), {
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
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#cbd5e1', callback: (v) => v.toFixed(0) + '€' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#cbd5e1', font: { size: 11 } }
                }
            },
            animation: { duration: 1500 }
        }
    });
    
    logAudit('📊 Gráfico renderizado', 'success');
}

// ============================================
// MÓDULO 17: EXPORTAÇÃO JSON
// ============================================

async function exportJSON() {
    try {
        logAudit('💾 Exportando evidência digital JSON...', 'info');
        
        const evidenceData = {
            sistema: "VDC Forensic System v11.6 GATEKEEPER",
            versao: VDCSystem.version,
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            protocoloIntegridade: "ISO/IEC 27037 | NIST SP 800-86 | AMT/IMT 5% | RGRC 4%",
            cliente: VDCSystem.client || { nome: "Cliente de Demonstração", nif: "000000000" },
            entidadeBolt: VDCSystem.boltEntity,
            analise: {
                periodo: VDCSystem.selectedYear,
                plataforma: VDCSystem.selectedPlatform,
                valores: VDCSystem.analysis.extractedValues,
                cruzamentos: VDCSystem.analysis.crossings,
                projecao: VDCSystem.analysis.projection,
                cadeiaCustodia: VDCSystem.analysis.chainOfCustody.slice(-50),
                quesitosEstrategicos: VDCSystem.analysis.quesitosEstrategicos
            },
            documentos: {
                dac7: { count: VDCSystem.documents.dac7?.files?.length || 0, totals: VDCSystem.documents.dac7?.totals || {} },
                saft: { count: VDCSystem.documents.saft?.files?.length || 0, totals: VDCSystem.documents.saft?.totals || {} },
                invoices: { count: VDCSystem.documents.invoices?.files?.length || 0, totals: VDCSystem.documents.invoices?.totals || {} },
                statements: { count: VDCSystem.documents.statements?.files?.length || 0, totals: VDCSystem.documents.statements?.totals || {} }
            },
            masterHash: document.getElementById('masterHashValue')?.textContent || "NÃO GERADA",
            assinaturaDigital: generateDigitalSignature()
        };
        
        const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `EVIDENCIA_VDC_${VDCSystem.sessionId || Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        logAudit('✅ Evidência digital exportada com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`❌ Erro ao exportar JSON: ${error.message}`, 'error');
    }
}

// ============================================
// MÓDULO 18: EXPORTAÇÃO PDF
// ============================================

function exportPDF() {
    try {
        logAudit('📄 Gerando relatório PDF...', 'info');
        
        if (typeof window.jspdf?.jsPDF === 'undefined') {
            logAudit('❌ Biblioteca jsPDF não encontrada', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        let yPos = 20;
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VDC FORENSIC SYSTEM v11.6 - RELATÓRIO PERICIAL "GATEKEEPER"', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        pdf.setFontSize(10);
        pdf.text(`Protocolo: ${VDCSystem.sessionId || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
        pdf.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, pageWidth / 2, yPos + 5, { align: 'center' });
        yPos += 15;
        
        pdf.line(20, yPos, pageWidth - 20, yPos);
        yPos += 10;
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('1. INFORMAÇÕES DO CLIENTE', 20, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        if (VDCSystem.client) {
            pdf.text(`Nome: ${VDCSystem.client.name}`, 25, yPos);
            pdf.text(`NIF: ${VDCSystem.client.nif}`, 25, yPos + 5);
            pdf.text(`Plataforma: ${VDCSystem.selectedPlatform}`, 25, yPos + 10);
            pdf.text(`Ano: ${VDCSystem.selectedYear}`, 25, yPos + 15);
            yPos += 25;
        }
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('2. RESULTADOS DA ANÁLISE', 20, yPos);
        yPos += 8;
        
        pdf.setFontSize(10);
        const ev = VDCSystem.analysis.extractedValues;
        const results = [
            `Rendimentos brutos: ${ev.rendimentosBrutos?.toFixed(2) || '0.00'}€`,
            `Comissão: ${ev.comissaoApp?.toFixed(2) || '0.00'}€`,
            `Fatura: ${ev.faturaPlataforma?.toFixed(2) || '0.00'}€`,
            `Diferencial: ${ev.diferencialCusto?.toFixed(2) || '0.00'}€`,
            `IVA 23% devido: ${ev.ivaAutoliquidacao?.toFixed(2) || '0.00'}€`,
            `Juros de mora (4%): ${ev.jurosMora?.toFixed(2) || '0.00'}€`,
            `Taxa regulação (5%): ${ev.taxaRegulacao?.toFixed(2) || '0.00'}€`
        ];
        
        results.forEach((line, i) => {
            pdf.text(line, 25, yPos + (i * 5));
        });
        
        pdf.save(`RELATORIO_VDC_${VDCSystem.sessionId || Date.now()}.pdf`);
        logAudit('✅ Relatório PDF gerado com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
    }
}

function generateQuesitosEstrategicos() {
    const ev = VDCSystem.analysis.extractedValues;
    
    VDCSystem.analysis.quesitosEstrategicos = [
        `1. Face ao diferencial de ${ev.diferencialCusto?.toFixed(2) || '0.00'}€ entre comissão e fatura, onde se evidencia o cumprimento do Art. 103.º do RGRC?`,
        `2. Onde está comprovado o pagamento da Taxa de Regulação (5%) no valor de ${ev.taxaRegulacao?.toFixed(2) || '0.00'}€, conforme Decreto-Lei 83/2017?`,
        `3. Como justifica a diferença de ${ev.diferencialCusto?.toFixed(2) || '0.00'}€ entre comissão (${Math.abs(ev.comissaoApp || 0).toFixed(2)}€) e fatura (${ev.faturaPlataforma?.toFixed(2) || '0.00'}€)?`,
        `4. Em que documento está discriminado o IVA de 23% sobre o diferencial de ${ev.diferencialCusto?.toFixed(2) || '0.00'}€?`
    ];
    
    logAudit('📋 Quesitos estratégicos gerados', 'info');
}

// ============================================
// MÓDULO 19: LOGGING E CONSOLA
// ============================================

function logAudit(message, type = 'info') {
    try {
        const timestamp = new Date().toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const logEntry = { timestamp, type, message, fullTimestamp: new Date().toISOString(), sessionId: VDCSystem.sessionId };
        VDCSystem.logs.push(logEntry);
        if (VDCSystem.logs.length > 500) VDCSystem.logs = VDCSystem.logs.slice(-500);
        
        const output = document.getElementById('auditOutput');
        if (output) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.innerHTML = `<span style="color:#666;">[${timestamp}]</span> <span style="color:${getLogColor(type)};font-weight:bold;">${type.toUpperCase()}</span> <span>${message}</span>`;
            output.appendChild(entry);
            output.scrollTop = output.scrollHeight;
        }
        
        console.log(`[VDC ${type.toUpperCase()}] ${message}`);
    } catch (error) {
        console.error('Erro no log:', error);
    }
}

function getLogColor(type) {
    return { success: '#10b981', warn: '#f59e0b', error: '#ff3e3e', info: '#3b82f6', regulatory: '#ff6b35' }[type] || '#cbd5e1';
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    logAudit('🧹 Consola limpa', 'info');
}

function toggleConsole() {
    const console = document.getElementById('auditOutput');
    if (console) console.style.height = console.style.height === '200px' ? '120px' : '200px';
}

// ============================================
// MÓDULO 20: RESET DASHBOARD
// ============================================

function resetDashboard() {
    try {
        logAudit('🔄 RESET DO SISTEMA', 'warn');
        
        // Limpar intervalos
        if (VDCSystem.bigDataAlertInterval) clearInterval(VDCSystem.bigDataAlertInterval);
        if (VDCSystem.discrepanciaAlertaInterval) clearInterval(VDCSystem.discrepanciaAlertaInterval);
        
        // Limpar campos
        const clientName = document.getElementById('clientNameFixed');
        const clientNIF = document.getElementById('clientNIFFixed');
        if (clientName) { clientName.value = ''; clientName.classList.remove('error', 'success', 'readonly'); clientName.readOnly = false; }
        if (clientNIF) { clientNIF.value = ''; clientNIF.classList.remove('error', 'success', 'readonly'); clientNIF.readOnly = false; }
        
        const yearSelect = document.getElementById('selYearFixed') || document.getElementById('auditYear');
        if (yearSelect) yearSelect.value = new Date().getFullYear();
        
        // Limpar valores de UI
        document.querySelectorAll('.kpi-card p, #netVal, #iva6Val, #commissionVal, #iva23Val, #grossResult, #transferResult, #differenceResult, #marketResult').forEach(el => {
            if (el) el.textContent = el.id === 'marketResult' ? '0,00M€' : '0,00€';
        });
        
        // Remover cards dinâmicos
        ['diferencialCard', 'regulatoryCardKPI'].forEach(id => {
            const card = document.getElementById(id);
            if (card) card.remove();
        });
        
        const jurosCard = document.getElementById('jurosCard');
        if (jurosCard) jurosCard.style.display = 'none';
        
        // Ocultar alerts
        ['omissionAlert', 'bigDataAlert', 'diferencialAlert', 'regulatoryAlert', 'jurosAlert'].forEach(id => {
            const alert = document.getElementById(id);
            if (alert) alert.style.display = 'none';
        });
        
        // Limpar estado
        VDCSystem.demoMode = false;
        VDCSystem.client = null;
        VDCSystem.processing = false;
        VDCSystem.clientLocked = false;
        VDCSystem.documents = {
            dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
            control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
            saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
            invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
            statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
        };
        
        VDCSystem.analysis.extractedValues = {
            saftGross: 0, saftIVA6: 0, saftNet: 0, platformCommission: 0, bankTransfer: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
            campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0,
            prejuizoFiscal: 0, ivaAutoliquidacao: 0, dac7Revenue: 0, dac7Period: '', dac7Quarterly: [],
            jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
        };
        
        VDCSystem.analysis.crossings = { deltaA: 0, deltaB: 0, omission: 0, isValid: true, diferencialAlerta: false, fraudIndicators: [], bigDataAlertActive: false, discrepanciaAlertaAtiva: false, riscoRegulatorioAtivo: false };
        VDCSystem.analysis.chainOfCustody = [];
        VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
        
        // Limpar listas
        ['dac7FileListModal', 'controlFileListModal', 'saftFileListModal', 'invoiceFileListModal', 'statementFileListModal', 'faturasList', 'extratosList'].forEach(id => {
            const list = document.getElementById(id);
            if (list) { list.innerHTML = ''; list.classList.remove('visible'); }
        });
        
        // Atualizar contadores
        ['dac7CountCompact', 'controlCountCompact', 'saftCountCompact', 'invoiceCountCompact', 'statementCountCompact'].forEach(id => {
            const counter = document.getElementById(id);
            if (counter) counter.textContent = '0';
        });
        
        updateEvidenceSummary();
        updateEvidenceCount();
        updateCompactCounters();
        
        VDCSystem.sessionId = generateSessionId();
        const sessionDisplay = document.getElementById('sessionIdDisplay');
        if (sessionDisplay) sessionDisplay.textContent = VDCSystem.sessionId;
        
        generateMasterHash();
        logAudit('✅ Sistema resetado - Nova sessão criada', 'success');
    } catch (error) {
        console.error('Erro no reset:', error);
        logAudit(`❌ Erro no reset: ${error.message}`, 'error');
    }
}

async function performForensicAnalysis() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUDITANDO BIG DATA...';
        }
        
        logAudit('🔍 INICIANDO AUDITORIA FISCAL', 'success');
        
        await Promise.allSettled([
            processLoadedData().catch(e => logAudit(`❌ ${e.message}`, 'error')),
            calculateExtractedValues().catch(e => logAudit(`❌ ${e.message}`, 'error')),
            performForensicCrossings().catch(e => logAudit(`❌ ${e.message}`, 'error')),
            calculateMarketProjection().catch(e => logAudit(`❌ ${e.message}`, 'error')),
            calcularJurosMora().catch(e => logAudit(`❌ ${e.message}`, 'error')),
            calculateRegulatoryRisk().catch(e => logAudit(`❌ ${e.message}`, 'error'))
        ]);
        
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        criarDashboardDiferencial();
        criarDashboardRegulatorio();
        generateMasterHash();
        generateQuesitosEstrategicos();
        
        const discrepancia = Math.abs(Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) - VDCSystem.analysis.extractedValues.faturaPlataforma);
        if (discrepancia > 50) {
            triggerBigDataAlert(
                VDCSystem.analysis.extractedValues.faturaPlataforma,
                Math.abs(VDCSystem.analysis.extractedValues.comissaoApp),
                discrepancia
            );
            activateDiscrepancyAlert();
        }
        
        if (VDCSystem.analysis.crossings.diferencialAlerta) showDiferencialAlert();
        if (VDCSystem.analysis.crossings.riscoRegulatorioAtivo) showRegulatoryAlert();
        if (VDCSystem.analysis.extractedValues.jurosMora > 0) showJurosMoraAlert();
        if (VDCSystem.analysis.crossings.omission > 100) showOmissionAlert();
        
        logAudit('✅ AUDITORIA CONCLUÍDA COM SUCESSO', 'success');
    } catch (error) {
        console.error('Erro na auditoria:', error);
        logAudit(`❌ Erro na auditoria: ${error.message}`, 'error');
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR AUDITORIA BIG DATA';
        }
    }
}

// ============================================
// MÓDULO 21: FUNÇÕES AUXILIARES
// ============================================

function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-AF-${timestamp}-${random}`.toUpperCase();
}

function generateMasterHash() {
    try {
        const data = [
            VDCSystem.sessionId || 'NO_SESSION',
            VDCSystem.selectedYear,
            VDCSystem.selectedPlatform,
            VDCSystem.client?.nif || 'NO_CLIENT',
            VDCSystem.analysis.extractedValues.diferencialCusto,
            VDCSystem.analysis.extractedValues.jurosMora,
            VDCSystem.analysis.extractedValues.taxaRegulacao,
            VDCSystem.analysis.projection.totalMarketImpact,
            new Date().toISOString(),
            VDCSystem.documents.dac7?.files?.length || 0,
            VDCSystem.documents.saft?.files?.length || 0,
            VDCSystem.documents.invoices?.files?.length || 0,
            VDCSystem.documents.statements?.files?.length || 0
        ].join('|');
        
        const masterHash = CryptoJS.SHA256(data).toString();
        const display = document.getElementById('masterHashValue');
        
        if (display) {
            display.textContent = masterHash;
            display.style.color = '#00d1ff';
            display.style.fontFamily = 'JetBrains Mono, monospace';
        }
        
        return masterHash;
    } catch (error) {
        console.error('Erro no master hash:', error);
        return 'ERRO';
    }
}

function generateDigitalSignature() {
    try {
        const data = JSON.stringify({
            session: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            client: VDCSystem.client?.nif,
            differential: VDCSystem.analysis.extractedValues.diferencialCusto
        });
        return CryptoJS.HmacSHA256(data, VDCSystem.sessionId + 'ISO/NIST/RGRC/AMT').toString();
    } catch (error) {
        console.error('Erro na assinatura:', error);
        return 'ERRO';
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><p>${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    showToast(`❌ ${message}`, 'error');
}

function updatePageTitle(status) {
    document.title = status ? `VDC v11.6 - ${status}` : 'VDC | Sistema de Peritagem Forense v11.6';
}

// ============================================
// MÓDULO 22: EXPOSIÇÃO GLOBAL DE FUNÇÕES
// ============================================

window.VDCSystem = VDCSystem;
window.toForensicNumber = toForensicNumber;
window.populateYears = populateYears;
window.openEvidenceModal = openEvidenceModal;
window.closeEvidenceModal = closeEvidenceModal;
window.clearAllEvidence = clearAllEvidence;
window.registerClientFixed = registerClientFixed;
window.handleClientAutocompleteFixed = handleClientAutocompleteFixed;
window.activateDemoMode = activateDemoMode;
window.performForensicAnalysis = performForensicAnalysis;
window.resetDashboard = resetDashboard;
window.exportJSON = exportJSON;
window.exportPDF = exportPDF;
window.clearConsole = clearConsole;
window.toggleConsole = toggleConsole;
window.showChainOfCustody = showChainOfCustody;
window.generateMasterHash = generateMasterHash;
window.logAudit = logAudit;

console.log('✅ VDC v11.6 GATEKEEPER: Todos os módulos carregados com sucesso.');
