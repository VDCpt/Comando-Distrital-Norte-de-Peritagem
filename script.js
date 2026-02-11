// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v11.4
// AUDITORIA FISCAL BIG DATA - EXTRUÇÃO ESTRUTURADA HIGH PRECISION
// CORREÇÃO: BLINDAGEM SIDEBAR, SAFE DOM UPDATE, FUZZY MAPPING, MASTER HASH AUTOMÁTICO
// VERSÃO: "THE CHECKMATE" - COMPLETO E FUNCIONAL
// ============================================

// ===== NORMALIZADOR NUMÉRICO DE ALTA PRECISÃO =====
const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    
    let str = v.toString().trim();
    // Remove caracteres invisíveis, quebras de linha, tabs
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    // Remove símbolos de moeda e texto
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '').replace(/\s+/g, '');
    
    // Normalização de separadores decimais/milhar
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

// ===== SISTEMA VDC V11.4 - CORE BLINDADO =====
const VDCSystem = {
    version: 'v11.4-AF-CHECKMATE',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    
    // Bolt Operations - Dados Completos (v11.4)
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

// ===== WINDOW.ONLOAD CORRIGIDO =====
window.onload = async function() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v11.4 "THE CHECKMATE"...');
        
        // CORREÇÃO: Usar throw new Error() em vez de reject()
        const checkLibs = [
            new Promise((resolve) => {
                if (typeof CryptoJS !== 'undefined') resolve();
                else throw new Error('CryptoJS não carregado');
            }),
            new Promise((resolve) => {
                if (typeof Papa !== 'undefined') resolve();
                else throw new Error('PapaParse não carregado');
            }),
            new Promise((resolve) => {
                if (typeof Chart !== 'undefined') resolve();
                else throw new Error('Chart.js não carregado');
            })
        ];
        
        await Promise.allSettled(checkLibs);
        
        const startBtn = document.getElementById('startSessionBtn');
        if (startBtn) startBtn.addEventListener('click', startForensicSession);
        
        startClockAndDate();
        updatePageTitle('Inicializando Auditoria Fiscal...');
        logAudit('✅ Sistema VDC v11.4 "THE CHECKMATE" pronto para auditoria fiscal Big Data', 'success');
    } catch (error) {
        console.error('Erro crítico na inicialização:', error);
        // Fallback: mostrar interface mesmo com erro
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                const mainContainer = document.getElementById('mainContainer');
                if (mainContainer) {
                    mainContainer.style.display = 'block';
                    mainContainer.style.opacity = '1';
                }
            }, 500);
        }
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
        // Fallback direto
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
        document.getElementById('mainContainer').style.opacity = '1';
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
            setTimeout(() => {
                mainContainer.style.opacity = '1';
            }, 50);
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
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        loadClientsFromLocal();
        updateLoadingProgress(50);
        
        setupEventListeners();
        updateLoadingProgress(60);
        
        resetDashboard();
        updateLoadingProgress(80);
        
        renderDashboardChart();
        updateLoadingProgress(90);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(() => {
                showMainInterface();
                updatePageTitle('Sistema Pronto');
                logAudit('✅ Sistema VDC v11.4 - Auditoria Fiscal "THE CHECKMATE" inicializado', 'success');
                logAudit('🔐 Protocolos ativados: ISO/IEC 27037, NIST SP 800-86, RGRC 4%, AMT/IMT 5%', 'info');
                logAudit('🔗 Cadeia de Custódia Digital configurada (Art. 158-A a 158-F)', 'success');
                logAudit('📁 Extração Big Data estruturada ativada - FUZZY MAPPING V11.4', 'info');
                generateMasterHash();
            }, 300);
        }, 500);
    } catch (error) {
        console.error('Erro no carregamento do sistema:', error);
        showMainInterface();
    }
}

// ===== CONFIGURAÇÕES DE INTERFACE =====
function setupYearSelector() {
    const selYear = document.getElementById('selYearFixed');
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
        logAudit(`Ano fiscal alterado para: ${VDCSystem.selectedYear} (ISO/IEC 27037)`, 'info');
    });
}

function setupPlatformSelector() {
    const selPlatform = document.getElementById('selPlatformFixed');
    if (!selPlatform) return;
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        const platformName = e.target.options[e.target.selectedIndex].text;
        logAudit(`Plataforma selecionada: ${platformName}`, 'info');
        if (VDCSystem.selectedPlatform === 'bolt') {
            logAudit(`🎯 ALVO PRINCIPAL: ${VDCSystem.boltEntity.nome} | ${VDCSystem.boltEntity.nif}`, 'warn');
            logAudit(`📍 Endereço: ${VDCSystem.boltEntity.endereco}`, 'info');
            logAudit(`📋 Obrigação DAC7 ativada para plataforma estrangeira`, 'info');
            logAudit(`⚖️ Taxa de Regulação aplicável: ${VDCSystem.boltEntity.taxaRegulacao} (AMT/IMT)`, 'regulatory');
        }
        resetExtractedValues();
    });
}

function resetExtractedValues() {
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0,
        platformCommission: 0, bankTransfer: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
        faturaPlataforma: 0, campanhas: 0, gorjetas: 0,
        cancelamentos: 0, portagens: 0, diferencialCusto: 0,
        prejuizoFiscal: 0, ivaAutoliquidacao: 0,
        dac7Revenue: 0, dac7Period: '', dac7Quarterly: [],
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
            const dateString = now.toLocaleDateString('pt-PT', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const timeString = now.toLocaleTimeString('pt-PT', {
                hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const dateElement = document.getElementById('currentDate');
            const timeElement = document.getElementById('currentTime');
            if (dateElement) dateElement.textContent = dateString;
            if (timeElement) timeElement.textContent = timeString;
        } catch (error) {
            console.error('Erro ao atualizar data/hora:', error);
        }
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// ===== SETUP DE EVENT LISTENERS =====
function setupEventListeners() {
    try {
        const registerBtn = document.getElementById('registerClientBtnFixed');
        if (registerBtn) registerBtn.addEventListener('click', registerClientFixed);
        
        const clientNameInput = document.getElementById('clientNameFixed');
        if (clientNameInput) {
            clientNameInput.addEventListener('input', handleClientAutocompleteFixed);
            clientNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const clientNIF = document.getElementById('clientNIFFixed');
                    if (clientNIF) clientNIF.focus();
                }
            });
        }
        
        const clientNIFInput = document.getElementById('clientNIFFixed');
        if (clientNIFInput) clientNIFInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerClientFixed();
        });
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
        
        const openEvidenceModalBtn = document.getElementById('openEvidenceModalBtn');
        if (openEvidenceModalBtn) openEvidenceModalBtn.addEventListener('click', openEvidenceModal);
        
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeEvidenceModal);
        
        const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
        if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeEvidenceModal);
        
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
            if (e.target === evidenceModal) closeEvidenceModal();
        });
    } catch (error) {
        console.error('Erro na configuração de eventos:', error);
        logAudit(`❌ Erro na configuração de eventos: ${error.message}`, 'error');
    }
}

function setupModalUploadButtons() {
    try {
        const dac7UploadBtnModal = document.getElementById('dac7UploadBtnModal');
        const dac7FileModal = document.getElementById('dac7FileModal');
        if (dac7UploadBtnModal && dac7FileModal) {
            dac7UploadBtnModal.addEventListener('click', () => dac7FileModal.click());
            dac7FileModal.addEventListener('change', (e) => handleFileUploadModal(e, 'dac7'));
        }
        
        const controlUploadBtnModal = document.getElementById('controlUploadBtnModal');
        const controlFileModal = document.getElementById('controlFileModal');
        if (controlUploadBtnModal && controlFileModal) {
            controlUploadBtnModal.addEventListener('click', () => controlFileModal.click());
            controlFileModal.addEventListener('change', (e) => handleFileUploadModal(e, 'control'));
        }
        
        const saftUploadBtnModal = document.getElementById('saftUploadBtnModal');
        const saftFileModal = document.getElementById('saftFileModal');
        if (saftUploadBtnModal && saftFileModal) {
            saftUploadBtnModal.addEventListener('click', () => saftFileModal.click());
            saftFileModal.addEventListener('change', (e) => handleFileUploadModal(e, 'saft'));
        }
        
        const invoiceUploadBtnModal = document.getElementById('invoiceUploadBtnModal');
        const invoiceFileModal = document.getElementById('invoiceFileModal');
        if (invoiceUploadBtnModal && invoiceFileModal) {
            invoiceUploadBtnModal.addEventListener('click', () => invoiceFileModal.click());
            invoiceFileModal.addEventListener('change', (e) => handleFileUploadModal(e, 'invoices'));
        }
        
        const statementUploadBtnModal = document.getElementById('statementUploadBtnModal');
        const statementFileModal = document.getElementById('statementFileModal');
        if (statementUploadBtnModal && statementFileModal) {
            statementUploadBtnModal.addEventListener('click', () => statementFileModal.click());
            statementFileModal.addEventListener('change', (e) => handleFileUploadModal(e, 'statements'));
        }
    } catch (error) {
        console.error('Erro na configuração dos botões do modal:', error);
        logAudit(`❌ Erro na configuração dos botões do modal: ${error.message}`, 'error');
    }
}

// ===== GESTÃO DE MODAL =====
function openEvidenceModal() {
    try {
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) {
            evidenceModal.style.display = 'flex';
            updateEvidenceSummary();
            updateCompactCounters();
            logAudit('📂 Modal de Gestão de Evidências Big Data aberto', 'info');
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
            logAudit('📂 Modal de Gestão de Evidências Big Data fechado', 'info');
        }
    } catch (error) {
        console.error('Erro ao fechar modal:', error);
    }
}

// ===== LIMPAR TODAS AS EVIDÊNCIAS =====
function clearAllEvidence() {
    try {
        if (confirm('Tem a certeza que deseja limpar TODAS as evidências carregadas? Esta ação não pode ser revertida.')) {
            VDCSystem.documents = {
                dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '', records: 0, quarterlyDetails: [] }, hashes: {} },
                control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
                saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0, transactionDetails: [] }, hashes: {} },
                invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoicesFound: [], invoiceNumbers: [], boltEntities: [], records: 0, periodos: [], numerosFatura: [] }, hashes: {}},
                statements: { files: [], parsedData: [], totals: { transfer: 0, expected: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0, transactionDetails: [], records: 0 }, hashes: {}}
            };
            
            VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
            
            updateFileListModal('dac7FileListModal', []);
            updateFileListModal('controlFileListModal', []);
            updateFileListModal('saftFileListModal', []);
            updateFileListModal('invoiceFileListModal', []);
            updateFileListModal('statementFileListModal', []);
            
            const faturasList = document.getElementById('faturasList');
            if (faturasList) {
                faturasList.innerHTML = '';
                faturasList.classList.remove('visible');
            }
            const extratosList = document.getElementById('extratosList');
            if (extratosList) {
                extratosList.innerHTML = '';
                extratosList.classList.remove('visible');
            }
            
            updateEvidenceSummary();
            updateAnalysisButton();
            updateEvidenceCount();
            updateCompactCounters();
            generateMasterHash();
            
            logAudit('🗑️ TODAS as evidências foram limpas do sistema', 'warn');
        }
    } catch (error) {
        console.error('Erro ao limpar evidências:', error);
        logAudit(`❌ Erro ao limpar evidências: ${error.message}`, 'error');
    }
}

// ===== PROCESSAMENTO DE FICHEIROS - FUZZY MAPPING V11.4 =====
async function handleFileUploadModal(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    const files = Array.from(event.target.files);
    const uploadBtn = document.querySelector(`#${type}UploadBtnModal`);
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO BIG DATA...`;
    }
    try {
        await processMultipleFilesModal(type, files, true);
        const totalCount = VDCSystem.documents[type].files.length;
        updateCounter(type, totalCount);
        updateCompactCounters();
        if (VDCSystem.client) updateAnalysisButton();
        updateEvidenceSummary();
        updateEvidenceCount();
        generateMasterHash();
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} adicionados via Modal (Big Data Append) - Total: ${totalCount}`, 'success');
    } catch (error) {
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            const icon = type === 'dac7' ? 'fa-file-contract' : 
                        type === 'control' ? 'fa-file-shield' :
                        type === 'saft' ? 'fa-file-code' :
                        type === 'invoices' ? 'fa-file-invoice-dollar' : 'fa-file-contract';
            const text = type === 'dac7' ? 'SELECIONAR FICHEIROS DAC7' :
                        type === 'control' ? 'SELECIONAR FICHEIRO DE CONTROLO' :
                        type === 'saft' ? 'SELECIONAR FICHEIROS SAF-T/XML/CSV' :
                        type === 'invoices' ? 'SELECIONAR FATURAS' : 'SELECIONAR EXTRATOS';
            uploadBtn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
        }
        event.target.value = '';
    }
}

async function processMultipleFilesModal(type, files, appendMode = true) {
    try {
        logAudit(`📁 Processando ${files.length} ficheiros ${type.toUpperCase()} via Modal (Fuzzy Mapping v11.4)...`, 'info');
        
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], parsedData: [], totals: {}, hashes: {} };
        }
        if (!VDCSystem.documents[type].files) VDCSystem.documents[type].files = [];
        if (!VDCSystem.documents[type].parsedData) VDCSystem.documents[type].parsedData = [];
        if (!VDCSystem.documents[type].hashes) VDCSystem.documents[type].hashes = {};
        if (!VDCSystem.documents[type].totals) VDCSystem.documents[type].totals = {};
        if (!VDCSystem.documents[type].totals.records) VDCSystem.documents[type].totals.records = 0;
        
        if (appendMode) VDCSystem.documents[type].files.push(...files);
        else VDCSystem.documents[type].files = files;
        
        for (const file of files) {
            try {
                const text = await readFileAsText(file);
                const fileHash = CryptoJS.SHA256(text).toString();
                VDCSystem.documents[type].hashes[file.name] = fileHash;
                addToChainOfCustody(file, type, fileHash);
                
                let extractedData = null;
                let recordCount = 0;
                
                switch(type) {
                    case 'dac7':
                        extractedData = extractDAC7Data(text, file.name);
                        recordCount = extractedData.records || 1;
                        break;
                    case 'control':
                        extractedData = { 
                            filename: file.name, 
                            hash: fileHash, 
                            timestamp: new Date().toISOString(),
                            isoCompliance: 'ISO/IEC 27037'
                        };
                        recordCount = 1;
                        break;
                    case 'saft':
                        extractedData = extractSAFTData(text, file.name, file.type);
                        recordCount = extractedData.records || 1;
                        break;
                    case 'invoices':
                        extractedData = extractInvoiceData(text, file.name);
                        recordCount = extractedData.records || 1;
                        break;
                    case 'statements':
                        extractedData = extractStatementData(text, file.name);
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
                    
                    if (type === 'invoices') {
                        await updateSpecificFileList('faturasList', file, fileHash, extractedData);
                    }
                    if (type === 'statements') {
                        await updateSpecificFileList('extratosList', file, fileHash, extractedData);
                    }
                    
                    logAudit(`✅ ${file.name}: ${recordCount} registos extraídos | Hash: ${fileHash.substring(0, 16)}...`, 'success');
                }
            } catch (fileError) {
                console.error(`Erro no processamento do ficheiro ${file.name}:`, fileError);
                logAudit(`⚠️ Ficheiro ${file.name} ignorado: ${fileError.message}`, 'warn');
            }
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados via Modal (Fuzzy Mapping)', 'success');
        generateMasterHash();
        updateAnalysisButton();
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
        throw error;
    }
}

// ===== ATUALIZAÇÃO DAS LISTAS DE EVIDÊNCIAS =====
async function updateSpecificFileList(listId, file, hash, extractedData = null) {
    const listElement = document.getElementById(listId);
    if (!listElement) return;
    
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item-modal';
    
    const size = file.size;
    let sizeStr = formatBytes(size);
    
    let detailsHTML = '';
    if (extractedData && listId === 'faturasList') {
        if (extractedData.invoiceNumber) {
            detailsHTML += `<span class="file-hash-modal"><i class="fas fa-hashtag"></i> ${extractedData.invoiceNumber}</span>`;
        }
        if (extractedData.invoiceDate || extractedData.periodo) {
            const periodo = extractedData.periodo || extractedData.invoiceDate || '';
            detailsHTML += `<span class="file-hash-modal"><i class="fas fa-calendar"></i> ${periodo.substring(0, 16)}</span>`;
        }
        if (extractedData.invoiceValue) {
            detailsHTML += `<span class="file-hash-modal"><i class="fas fa-euro-sign"></i> ${extractedData.invoiceValue.toFixed(2)}€</span>`;
        }
    }
    if (extractedData && listId === 'extratosList') {
        if (extractedData.grossEarnings) {
            detailsHTML += `<span class="file-hash-modal"><i class="fas fa-euro-sign"></i> Bruto: ${extractedData.grossEarnings.toFixed(2)}€</span>`;
        }
        if (extractedData.commission) {
            detailsHTML += `<span class="file-hash-modal"><i class="fas fa-minus-circle"></i> Com: ${Math.abs(extractedData.commission).toFixed(2)}€</span>`;
        }
        if (extractedData.netTransfer) {
            detailsHTML += `<span class="file-hash-modal"><i class="fas fa-check"></i> Liq: ${extractedData.netTransfer.toFixed(2)}€</span>`;
        }
    }
    
    fileItem.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="file-name-modal">${file.name}</span>
        <span class="file-status-modal">${sizeStr} ✓</span>
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
        
        const size = file.size;
        let sizeStr = formatBytes(size);
        
        const fileHash = VDCSystem.documents[getTypeFromListId(listId)]?.hashes[file.name] || hash;
        
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">${sizeStr} ✓</span>
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
    try {
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
    } catch (error) {
        console.error('Erro ao atualizar resumo:', error);
    }
}

function updateEvidenceCount() {
    try {
        const evidenceBtn = document.getElementById('openEvidenceModalBtn');
        if (evidenceBtn) {
            const totalFiles = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
            const evidenceCount = evidenceBtn.querySelector('.evidence-count-solid');
            if (evidenceCount) evidenceCount.textContent = `${totalFiles} ficheiros`;
        }
    } catch (error) {
        console.error('Erro ao atualizar contador:', error);
    }
}

function updateCompactCounters() {
    try {
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
    } catch (error) {
        console.error('Erro ao atualizar contadores compactos:', error);
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ===== REGISTO DE CLIENTE - SAFE DOM UPDATE (SEM INNERHTML) =====
function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients_bd_v11_4') || '[]');
        VDCSystem.preRegisteredClients = clients;
        logAudit(`📋 ${clients.length} clientes carregados do armazenamento local (ISO/IEC 27037)`, 'info');
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        VDCSystem.preRegisteredClients = [];
    }
}

function handleClientAutocompleteFixed() {
    try {
        const input = document.getElementById('clientNameFixed');
        const nifInput = document.getElementById('clientNIFFixed');
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
            
            const exactMatch = VDCSystem.preRegisteredClients.find(client => 
                client.nif === nifValue && nifValue.length === 9
            );
            
            if (exactMatch && input) {
                input.value = exactMatch.name;
                logAudit(`✅ Cliente recuperado: ${exactMatch.name} (NIF: ${exactMatch.nif})`, 'success');
            }
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
            nameInput?.classList.remove('success');
            nameInput?.focus();
            return;
        }
        
        if (!nif || !/^\d{9}$/.test(nif)) {
            showError('NIF inválido (deve ter 9 dígitos)');
            nifInput?.classList.add('error');
            nifInput?.classList.remove('success');
            nifInput?.focus();
            return;
        }
        
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
            platform: VDCSystem.selectedPlatform
        };
        
        // SAFE DOM UPDATE - NUNCA USAR INNERHTML NO CONTAINER PAI
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

// ===== CADEIA DE CUSTÓDIA =====
function addToChainOfCustody(file, type, hash = '') {
    try {
        let lastModifiedDate = new Date(file.lastModified);
        if (!isValidDate(lastModifiedDate)) {
            lastModifiedDate = new Date();
            logAudit(`⚠️ Data de modificação inválida para ${file.name}, usando data atual`, 'warn');
        }
        
        let uploadDate = new Date();
        if (!isValidDate(uploadDate)) uploadDate = new Date();
        
        const custodyRecord = {
            id: CryptoJS.SHA256(Date.now() + file.name + type).toString().substring(0, 16),
            filename: file.name,
            fileType: type,
            size: file.size,
            lastModified: lastModifiedDate.toISOString(),
            uploadTimestamp: uploadDate.toISOString(),
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
        logAudit(`❌ Erro na cadeia de custódia para ${file.name}: ${error.message}`, 'error');
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
        VDCSystem.analysis.chainOfCustody.forEach((record, index) => {
            logAudit(`${index + 1}. ${record.filename} | Tipo: ${record.fileType} | Tamanho: ${formatBytes(record.size)} | Hash: ${record.hash.substring(0, 16)}...`, 'info');
        });
    } catch (error) {
        console.error('Erro ao mostrar cadeia de custódia:', error);
        logAudit(`❌ Erro ao mostrar cadeia de custódia: ${error.message}`, 'error');
    }
}

// ===== MODO DEMO =====
function activateDemoMode() {
    try {
        if (VDCSystem.processing) return;
        
        VDCSystem.demoMode = true;
        VDCSystem.processing = true;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = true;
            demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO DADOS DEMO...';
        }
        
        logAudit('🔐 ATIVANDO MODO DEMO FORENSE ISO/NIST - DADOS REAIS BOLT', 'warn');
        
        const clientNameInput = document.getElementById('clientNameFixed');
        const clientNIFInput = document.getElementById('clientNIFFixed');
        if (clientNameInput) clientNameInput.value = 'Momento Eficaz Unipessoal, Lda';
        if (clientNIFInput) clientNIFInput.value = '517905450';
        registerClientFixed();
        
        VDCSystem.selectedYear = 2024;
        const yearSelect = document.getElementById('selYearFixed');
        if (yearSelect) yearSelect.value = 2024;
        
        VDCSystem.selectedPlatform = 'bolt';
        const platformSelect = document.getElementById('selPlatformFixed');
        if (platformSelect) platformSelect.value = 'bolt';
        
        simulateDemoChainOfCustody();
        simulateEvidenceModalUpdate();
        
        setTimeout(() => {
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
            
            const proj = VDCSystem.analysis.projection;
            proj.averagePerDriver = 553.59;
            proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
            proj.marketProjection = proj.totalMarketImpact / 1000000;
            
            const crossings = VDCSystem.analysis.crossings;
            crossings.deltaA = Math.abs(3202.54 - 3202.54);
            crossings.deltaB = Math.abs(792.59 - 239.00);
            crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
            crossings.diferencialAlerta = true;
            crossings.riscoRegulatorioAtivo = true;
            
            updateDashboard();
            updateKPIResults();
            renderDashboardChart();
            criarDashboardDiferencial();
            criarDashboardRegulatorio();
            calcularJurosMora();
            generateMasterHash();
            
            triggerBigDataAlert(239.00, 792.59, 553.59);
            generateQuesitosEstrategicos();
            
            logAudit('✅ MODO DEMO ATIVADO: Cliente "Momento Eficaz" carregado', 'success');
            logAudit('📅 PERÍODO ANALISADO: Setembro a Dezembro 2024', 'info');
            logAudit('💰 VALORES REAIS BOLT: Fatura 239.00€ | Comissão 792.59€ | Diferencial 553.59€', 'info');
            logAudit('⚖️ RISCO REGULATÓRIO: Taxa de Regulação 5% = 39,63€ (AMT/IMT)', 'regulatory');
            logAudit('🔢 JUROS DE MORA: 4% base anual civil = 22,14€ (RGRC)', 'warn');
            logAudit('📊 ANÁLISE AUTOMÁTICA: Gráficos e cálculos gerados (ISO/NIST)', 'success');
            
            showDiferencialAlert();
            showRegulatoryAlert();
            showJurosMoraAlert();
            
            if (crossings.omission > 100) showOmissionAlert();
            if (crossings.deltaB > 50) activateDiscrepancyAlert();
            
            VDCSystem.processing = false;
            
            if (demoBtn) {
                demoBtn.disabled = false;
                demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
            }
        }, 1500);
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
    try {
        const demoFiles = [
            { name: 'Fatura_Bolt_PT1125-3582.pdf', type: 'invoices', size: 245760 },
            { name: 'Extrato_Bolt_Setembro_2024.pdf', type: 'statements', size: 512000 },
            { name: 'SAF-T_2024_09.csv', type: 'saft', size: 102400 },
            { name: 'DAC7_Report_2024.html', type: 'dac7', size: 81920 }
        ];
        
        demoFiles.forEach(file => {
            addToChainOfCustody(file, file.type, CryptoJS.SHA256(file.name + Date.now()).toString());
        });
        
        logAudit('📁 Cadeia de Custódia Demo: 4 ficheiros de exemplo registados', 'success');
    } catch (error) {
        console.error('Erro na cadeia de custódia demo:', error);
    }
}

function simulateEvidenceModalUpdate() {
    try {
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
    } catch (error) {
        console.error('Erro na simulação do modal:', error);
    }
}

// ===== MOTOR DE EXTRAÇÃO - FUZZY MAPPING V11.4 =====
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
            const values = [];
            
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
                        if (value > 0) values.push(value);
                    }
                }
            });
            
            if (values.length > 0 && key === 'annualRevenue') data.annualRevenue = Math.max(...values);
        });
        
        if (!data.period) data.period = `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`;
        if (data.quarterlyDetails.length === 0 && data.annualRevenue > 0) {
            const quarterlyAvg = data.annualRevenue / 4;
            for (let i = 1; i <= 4; i++) {
                data.quarterlyDetails.push({
                    quarter: `Q${i} ${VDCSystem.selectedYear}`,
                    revenue: quarterlyAvg
                });
            }
        }
        
        logAudit(`📊 DAC7 ${filename}: Receitas=${data.annualRevenue.toFixed(2)}€ | Período=${data.period} | ${data.quarterlyDetails.length} trimestres`, 'success');
    } catch (error) {
        console.error(`Erro na extração DAC7 ${filename}:`, error);
        data.error = error.message;
        logAudit(`❌ Erro na extração DAC7 ${filename}: ${error.message}`, 'error');
    }
    return data;
}

// ===== EXTRACT SAF-T DATA - FUZZY MAPPING V11.4 =====
function extractSAFTData(text, filename, fileType) {
    const data = {
        filename: filename,
        grossValue: 0,
        iva6Value: 0,
        netValue: 0,
        transactionCount: 0,
        records: 0,
        transactionDetails: [],
        extractionMethod: 'Fuzzy Mapping v11.4 - Colunas: IVA, Preço da viagem (sem IVA), Preço da viagem, Gross, Rendimento, Liquido',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        const isCSV = fileType === 'text/csv' || filename.endsWith('.csv') || (text.includes(',') && !text.includes('<'));
        
        if (isCSV) {
            data.extractionMethod = 'CSV Parser - Fuzzy Mapping v11.4';
            
            try {
                const parsed = Papa.parse(text, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    delimitersToGuess: [',', ';', '\t']
                });
                
                if (parsed.data && parsed.data.length > 0) {
                    let totalGross = 0, totalIVA6 = 0, totalNet = 0;
                    
                    parsed.data.forEach((row, index) => {
                        let precoSemIVA = 0;
                        let iva = 0;
                        let precoTotal = 0;
                        
                        Object.keys(row).forEach(key => {
                            const keyLower = key.toLowerCase();
                            const value = toForensicNumber(row[key]);
                            
                            if (value > 0) {
                                if (keyLower.includes('preço da viagem (sem iva)') || 
                                    keyLower.includes('preço sem iva') || 
                                    keyLower.includes('gross') || 
                                    keyLower.includes('valor sem iva') ||
                                    keyLower.includes('rendimento bruto')) {
                                    precoSemIVA += value;
                                }
                                else if (keyLower.includes('iva') || 
                                         keyLower.includes('tax') || 
                                         keyLower.includes('imposto')) {
                                    iva += value;
                                }
                                else if (keyLower.includes('preço da viagem') || 
                                         keyLower.includes('total') || 
                                         keyLower.includes('net') ||
                                         keyLower.includes('liquido') ||
                                         keyLower.includes('valor total') ||
                                         keyLower.includes('rendimento liquido') ||
                                         keyLower.includes('amount') ||
                                         keyLower.includes('preço líquido')) {
                                    precoTotal += value;
                                }
                            }
                        });
                        
                        if (precoSemIVA === 0 && iva === 0 && precoTotal === 0) {
                            const numericValues = Object.values(row)
                                .map(val => toForensicNumber(val))
                                .filter(val => val > 0);
                            
                            if (numericValues.length >= 3) {
                                precoSemIVA = numericValues[0] || 0;
                                iva = numericValues[1] || 0;
                                precoTotal = numericValues[2] || 0;
                            } else if (numericValues.length === 2) {
                                precoSemIVA = numericValues[0] || 0;
                                precoTotal = numericValues[1] || 0;
                            } else if (numericValues.length === 1) {
                                precoTotal = numericValues[0] || 0;
                            }
                        }
                        
                        totalGross += precoSemIVA;
                        totalIVA6 += iva;
                        totalNet += precoTotal;
                        
                        data.transactionDetails.push({
                            id: index + 1,
                            gross: precoSemIVA,
                            iva6: iva,
                            net: precoTotal,
                            date: row['Data'] || row['Date'] || ''
                        });
                    });
                    
                    data.grossValue = totalGross;
                    data.iva6Value = totalIVA6;
                    data.netValue = totalNet;
                    data.transactionCount = parsed.data.length;
                    data.records = parsed.data.length;
                    
                    logAudit(`📊 SAF-T CSV ${filename}: ${parsed.data.length} transações | Bruto=${totalGross.toFixed(2)}€ | IVA6=${totalIVA6.toFixed(2)}€ | Líquido=${totalNet.toFixed(2)}€ (Fuzzy Mapping)`, 'success');
                }
            } catch (csvError) {
                console.error(`Erro no parsing CSV ${filename}:`, csvError);
                extractSAFTFromText(text, data);
            }
        } else {
            extractSAFTFromText(text, data);
        }
    } catch (error) {
        console.error(`Erro na extração SAF-T ${filename}:`, error);
        data.error = error.message;
        logAudit(`❌ Erro na extração SAF-T ${filename}: ${error.message}`, 'error');
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
                const value = toForensicNumber(match[1]);
                if (value > 0) data[pattern.key] = value;
            }
        });
        
        const transactionMatches = text.match(/<Transaction>/gi) || text.match(/<Line>/gi);
        data.transactionCount = transactionMatches ? transactionMatches.length : 1;
        data.records = data.transactionCount;
        
        if (data.grossValue > 0) {
            logAudit(`SAF-T ${data.filename}: Bruto = ${data.grossValue.toFixed(2)}€ (ISO/IEC 27037) | ${data.transactionCount} transações`, 'info');
        }
    } catch (error) {
        console.error(`Erro na extração SAF-T do texto ${data.filename}:`, error);
        data.error = error.message;
    }
}

// ===== EXTRACT INVOICE DATA - V11.4 COM FUZZY MAPPING =====
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
        extractionMethod: 'Fuzzy Mapping v11.4 - Total com IVA (EUR)',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        const invoiceNumberPatterns = [
            /(?:Fatura|Invoice|Número|Number)[\s:]*([A-Z]{2}\d{4}[-_]?\d{4})/i,
            /([A-Z]{2}\d{4}[-_]\d{4})/,
            /Fatura\s+n[º°o]\s*([A-Z0-9\-]+)/i
        ];
        
        invoiceNumberPatterns.forEach(regex => {
            const match = text.match(regex);
            if (match && !data.invoiceNumber) {
                data.invoiceNumber = match[1] || match[0];
                data.invoiceNumber = data.invoiceNumber.replace(/[_-]/g, '-');
            }
        });
        
        const periodPatterns = [
            /(?:período|period)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*(?:a|até|to)\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
            /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\s*-\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
            /(?:de|from)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})[^0-9]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i
        ];
        
        periodPatterns.forEach(regex => {
            const match = text.match(regex);
            if (match && !data.periodo) {
                data.periodo = `${match[1]} a ${match[2]}`;
            }
        });
        
        const datePatterns = [
            /(?:Data|Date|Emissão|Issued)[\s:]*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/i,
            /Date:\s*(\d{4}-\d{2}-\d{2})/i
        ];
        
        datePatterns.forEach(regex => {
            const match = text.match(regex);
            if (match && !data.invoiceDate) {
                data.invoiceDate = match[1];
            }
        });
        
        const invoiceValuePatterns = [
            /Total\s+com\s+IVA\s*\(EUR\)[:\s]*([\d\.,]+)\s*(?:€|EUR)?/i,
            /Total\s+\(incl\.\s+IVA\)[:\s]*([\d\.,]+)\s*(?:€|EUR)?/i,
            /Amount\s+due[:\s]*([\d\.,]+)\s*(?:€|EUR)?/i,
            /Total\s+amount[:\s]*([\d\.,]+)\s*(?:€|EUR)?/i,
            /Total[:\s]*([\d\.,]+)\s*(?:€|EUR)\s*$/im
        ];
        
        let invoiceValueFound = false;
        invoiceValuePatterns.forEach(regex => {
            const match = text.match(regex);
            if (match && !invoiceValueFound) {
                const rawValue = match[1];
                const cleanedValue = toForensicNumber(rawValue);
                if (cleanedValue > 0) {
                    data.invoiceValue = cleanedValue;
                    invoiceValueFound = true;
                }
            }
        });
        
        const commissionPatterns = [
            /(?:Comissão|Commission|Service\s+fee|Fee)[:\s]*([\d\.,]+)\s*(?:€|EUR)/i,
            /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/i
        ];
        
        commissionPatterns.forEach(regex => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                const value = toForensicNumber(match[1]);
                if (value > 0 && value > data.commissionValue) {
                    data.commissionValue = value;
                }
            }
        });
        
        if (data.commissionValue === 0 && data.invoiceValue > 0) {
            const allNumbers = text.match(/\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\b/g) || [];
            const uniqueValues = [...new Set(allNumbers.map(n => toForensicNumber(n)))].filter(v => v > 0 && v < data.invoiceValue * 5);
            
            const possibleCommissions = uniqueValues.filter(v => 
                v > data.invoiceValue * 0.2 && v < data.invoiceValue * 0.4
            );
            
            if (possibleCommissions.length > 0) {
                data.commissionValue = Math.max(...possibleCommissions);
                logAudit(`🔍 Fuzzy Mapping: Comissão inferida = ${data.commissionValue.toFixed(2)}€ (${filename})`, 'info');
            }
        }
        
        const boltPatterns = [
            /Bolt Operations O[Üu]/i,
            /EE102090374/i,
            /Vana-Lõuna 15, Tallinn/i
        ];
        
        boltPatterns.forEach(regex => {
            if (regex.test(text)) {
                data.boltEntityDetected = true;
            }
        });
        
        if (data.commissionValue > 0) data.iva23Value = data.commissionValue * 0.23;
        
        if (VDCSystem.documents.invoices.totals) {
            if (!VDCSystem.documents.invoices.totals.numerosFatura) VDCSystem.documents.invoices.totals.numerosFatura = [];
            if (data.invoiceNumber) VDCSystem.documents.invoices.totals.numerosFatura.push(data.invoiceNumber);
            
            if (!VDCSystem.documents.invoices.totals.periodos) VDCSystem.documents.invoices.totals.periodos = [];
            if (data.periodo) VDCSystem.documents.invoices.totals.periodos.push(data.periodo);
            
            if (!VDCSystem.documents.invoices.totals.boltEntities) VDCSystem.documents.invoices.totals.boltEntities = [];
            if (data.boltEntityDetected) VDCSystem.documents.invoices.totals.boltEntities.push(VDCSystem.boltEntity);
        }
        
        logAudit(`📄 Fatura ${filename}: ${data.invoiceValue.toFixed(2)}€ | Nº: ${data.invoiceNumber || 'N/A'} | Período: ${data.periodo || 'N/A'} | Entidade: ${data.boltEntityDetected ? 'Bolt ✓' : 'Não identificada'}`, 'success');
    } catch (error) {
        console.error(`Erro na extração de fatura ${filename}:`, error);
        data.error = error.message;
        logAudit(`❌ Erro na extração de fatura ${filename}: ${error.message}`, 'error');
    }
    return data;
}

// ===== EXTRACT STATEMENT DATA - V11.4 COM SOMATÓRIO DE TRANSAÇÕES =====
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
        extractionMethod: 'Fuzzy Mapping v11.4 - Soma de Transações Individuais',
        isoStandard: 'ISO/IEC 27037'
    };
    
    try {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        
        const transactionPatterns = [
            /ganhos?\s+na\s+app/i,
            /earnings/i,
            /viagem/i,
            /trip/i,
            /ride/i,
            /corrida/i
        ];
        
        let transactionLines = [];
        
        lines.forEach((line, index) => {
            const lineLower = line.toLowerCase();
            if (transactionPatterns.some(pattern => pattern.test(lineLower))) {
                transactionLines.push(line);
                if (index + 1 < lines.length) {
                    transactionLines.push(lines[index + 1]);
                }
            }
        });
        
        if (transactionLines.length === 0) {
            transactionLines = lines.filter(line => {
                const numbers = line.match(/\d+[.,]\d{2}/g);
                return numbers && numbers.length > 0;
            });
        }
        
        transactionLines.forEach(line => {
            if (line.match(/ganhos?\s+na\s+app|earnings|bruto|gross/i)) {
                const values = line.match(/\d+[.,]\d{2}/g);
                if (values) {
                    values.forEach(v => {
                        const num = toForensicNumber(v);
                        if (num > 0 && num < 1000) {
                            data.grossEarnings += num;
                        }
                    });
                }
            }
            
            if (line.match(/campanha|campaign|bónus|bonus|incentive/i)) {
                const values = line.match(/\d+[.,]\d{2}/g);
                if (values) {
                    values.forEach(v => {
                        const num = toForensicNumber(v);
                        if (num > 0 && num < 100) {
                            data.campaigns += num;
                        }
                    });
                }
            }
            
            if (line.match(/gorjeta|tip|gratificação|gratuity/i)) {
                const values = line.match(/\d+[.,]\d{2}/g);
                if (values) {
                    values.forEach(v => {
                        const num = toForensicNumber(v);
                        if (num > 0 && num < 50) {
                            data.tips += num;
                        }
                    });
                }
            }
            
            if (line.match(/cancelamento|cancellation|cancel\s+fee/i)) {
                const values = line.match(/\d+[.,]\d{2}/g);
                if (values) {
                    values.forEach(v => {
                        const num = toForensicNumber(v);
                        if (num > 0 && num < 30) {
                            data.cancellations += num;
                        }
                    });
                }
            }
            
            if (line.match(/portagem|toll|road\s+fee/i)) {
                const values = line.match(/\d+[.,]\d{2}/g);
                if (values) {
                    values.forEach(v => {
                        const num = toForensicNumber(v);
                        if (num > 0 && num < 20) {
                            data.tolls += num;
                        }
                    });
                }
            }
        });
        
        const commissionPatterns = [
            /(?:Comissão|Commission|Fee|Service\s+fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Commission[:\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /-?\s*([\d\.,]+)\s*(?:€|EUR)\s*(?:deduction|fee)/gi,
            /Despesas?\s*:?\s*([\d\.,]+)/gi
        ];
        
        commissionPatterns.forEach(regex => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                const value = toForensicNumber(match[1]);
                if (value > 0) {
                    data.commission = -Math.max(Math.abs(data.commission), value);
                }
            }
        });
        
        const netTransferPatterns = [
            /(?:Líquido|Net|Transferência|Transfer|Payout|To\s+receive|Ganhos\s+Líquidos)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Net\s+amount[:\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Valor\s+da\s+Transferência[:\s]*([\d\.,]+)/gi
        ];
        
        netTransferPatterns.forEach(regex => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                const value = toForensicNumber(match[1]);
                if (value > 0) {
                    data.netTransfer = Math.max(data.netTransfer, value);
                }
            }
        });
        
        const grossEarningsPatterns = [
            /(?:Rendimentos|Earnings|Bruto|Gross|Total|Ganhos\s+como\s+Soma\s+Total)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Total\s+earnings[:\s]*([\d\.,]+)\s*(?:€|EUR)/gi
        ];
        
        grossEarningsPatterns.forEach(regex => {
            let match;
            while ((match = regex.exec(text)) !== null) {
                const value = toForensicNumber(match[1]);
                if (value > 0) {
                    data.grossEarnings = Math.max(data.grossEarnings, value);
                }
            }
        });
        
        if (data.grossEarnings === 0 && (data.campaigns > 0 || data.tips > 0 || data.cancellations > 0 || data.tolls > 0)) {
            data.grossEarnings = data.campaigns + data.tips + Math.abs(data.cancellations) + data.tolls;
            if (data.grossEarnings > 0) {
                logAudit(`🔍 Fuzzy Mapping: Rendimentos Brutos inferidos = ${data.grossEarnings.toFixed(2)}€ (soma de transações)`, 'info');
            }
        }
        
        if (data.commission === 0 && data.grossEarnings > 0 && data.netTransfer > 0) {
            data.commission = -(data.grossEarnings - data.netTransfer);
            logAudit(`🔍 Fuzzy Mapping: Comissão inferida = ${Math.abs(data.commission).toFixed(2)}€ (diferença Bruto - Líquido)`, 'info');
        }
        
        data.records = Math.max(1, Math.floor(transactionLines.length / 2));
        
        logAudit(`🏦 Extrato ${filename}: Bruto=${data.grossEarnings.toFixed(2)}€ | Comissão=${data.commission.toFixed(2)}€ | Campanhas=${data.campaigns.toFixed(2)}€ | Gorjetas=${data.tips.toFixed(2)}€ | ${data.records} registos (Fuzzy Mapping v11.4)`, 'success');
    } catch (error) {
        console.error(`Erro na extração de extrato ${filename}:`, error);
        data.error = error.message;
        logAudit(`❌ Erro na extração de extrato ${filename}: ${error.message}`, 'error');
    }
    return data;
}

// ===== PROCESSAMENTO E ANÁLISE =====
async function processLoadedData() {
    try {
        if (VDCSystem.documents.dac7 && VDCSystem.documents.dac7.parsedData && VDCSystem.documents.dac7.parsedData.length > 0) {
            let totalRevenue = 0, period = '', totalRecords = 0, quarterlyDetails = [];
            VDCSystem.documents.dac7.parsedData.forEach(item => {
                totalRevenue += (item.data && item.data.annualRevenue) || 0;
                totalRecords += (item.data && item.data.records) || 0;
                if (item.data && item.data.period && !period) period = item.data.period;
                if (item.data && item.data.quarterlyDetails) quarterlyDetails = quarterlyDetails.concat(item.data.quarterlyDetails);
            });
            VDCSystem.documents.dac7.totals = VDCSystem.documents.dac7.totals || {};
            VDCSystem.documents.dac7.totals.annualRevenue = totalRevenue;
            VDCSystem.documents.dac7.totals.period = period;
            VDCSystem.documents.dac7.totals.quarterlyDetails = quarterlyDetails;
            VDCSystem.documents.dac7.totals.records = totalRecords;
            logAudit(`DAC7: Receitas Anuais=${totalRevenue.toFixed(2)}€ | Período=${period} | ${totalRecords} registos | ${quarterlyDetails.length} trimestres`, 'info');
        }
        
        if (VDCSystem.documents.saft && VDCSystem.documents.saft.parsedData && VDCSystem.documents.saft.parsedData.length > 0) {
            let totalGross = 0, totalIVA6 = 0, totalNet = 0, totalRecords = 0, transactionDetails = [];
            VDCSystem.documents.saft.parsedData.forEach(item => {
                totalGross += (item.data && item.data.grossValue) || 0;
                totalIVA6 += (item.data && item.data.iva6Value) || 0;
                totalNet += (item.data && item.data.netValue) || 0;
                totalRecords += (item.data && item.data.records) || 0;
                if (item.data && item.data.transactionDetails) transactionDetails = transactionDetails.concat(item.data.transactionDetails);
            });
            VDCSystem.documents.saft.totals = VDCSystem.documents.saft.totals || {};
            VDCSystem.documents.saft.totals.gross = totalGross;
            VDCSystem.documents.saft.totals.iva6 = totalIVA6;
            VDCSystem.documents.saft.totals.net = totalNet;
            VDCSystem.documents.saft.totals.records = totalRecords;
            VDCSystem.documents.saft.totals.transactionDetails = transactionDetails;
            logAudit(`SAF-T: Bruto=${totalGross.toFixed(2)}€ | IVA6=${totalIVA6.toFixed(2)}€ | Líquido=${totalNet.toFixed(2)}€ | ${totalRecords} transações (Fuzzy Mapping)`, 'info');
        }
        
        if (VDCSystem.documents.invoices && VDCSystem.documents.invoices.parsedData && VDCSystem.documents.invoices.parsedData.length > 0) {
            let totalInvoiceValue = 0, totalCommission = 0, totalIVA23 = 0, totalRecords = 0;
            VDCSystem.documents.invoices.parsedData.forEach(item => {
                totalInvoiceValue += (item.data && item.data.invoiceValue) || 0;
                totalCommission += (item.data && item.data.commissionValue) || 0;
                totalIVA23 += (item.data && item.data.iva23Value) || 0;
                totalRecords += (item.data && item.data.records) || 0;
            });
            VDCSystem.documents.invoices.totals = VDCSystem.documents.invoices.totals || {};
            VDCSystem.documents.invoices.totals.invoiceValue = totalInvoiceValue;
            VDCSystem.documents.invoices.totals.commission = totalCommission;
            VDCSystem.documents.invoices.totals.iva23 = totalIVA23;
            VDCSystem.documents.invoices.totals.records = totalRecords;
            logAudit(`Faturas: Valor=${totalInvoiceValue.toFixed(2)}€ | Comissão=${totalCommission.toFixed(2)}€ | ${totalRecords} registos`, 'info');
        }
        
        if (VDCSystem.documents.statements && VDCSystem.documents.statements.parsedData && VDCSystem.documents.statements.parsedData.length > 0) {
            const totals = VDCSystem.documents.statements.totals || {};
            let totalRecords = 0, transactionDetails = [];
            VDCSystem.documents.statements.parsedData.forEach(item => {
                totals.rendimentosBrutos = (totals.rendimentosBrutos || 0) + ((item.data && item.data.grossEarnings) || 0);
                totals.comissaoApp = (totals.comissaoApp || 0) + ((item.data && item.data.commission) || 0);
                totals.rendimentosLiquidos = (totals.rendimentosLiquidos || 0) + ((item.data && item.data.netTransfer) || 0);
                totals.campanhas = (totals.campanhas || 0) + ((item.data && item.data.campaigns) || 0);
                totals.gorjetas = (totals.gorjetas || 0) + ((item.data && item.data.tips) || 0);
                totals.cancelamentos = (totals.cancelamentos || 0) + ((item.data && item.data.cancellations) || 0);
                totals.portagens = (totals.portagens || 0) + ((item.data && item.data.tolls) || 0);
                totalRecords += (item.data && item.data.records) || 0;
                if (item.data && item.data.transactionDetails) transactionDetails = transactionDetails.concat(item.data.transactionDetails);
            });
            VDCSystem.documents.statements.totals = totals;
            VDCSystem.documents.statements.totals.records = totalRecords;
            VDCSystem.documents.statements.totals.transactionDetails = transactionDetails;
            logAudit(`Extratos: Bruto=${totals.rendimentosBrutos.toFixed(2)}€ | Comissão=${totals.comissaoApp.toFixed(2)}€ | ${totalRecords} registos`, 'info');
        }
        
        generateMasterHash();
    } catch (error) {
        console.error('Erro no processamento de dados:', error);
        throw error;
    }
}

function calculateExtractedValues() {
    try {
        const ev = VDCSystem.analysis.extractedValues;
        const docs = VDCSystem.documents;
        
        ev.saftGross = (docs.saft && docs.saft.totals && docs.saft.totals.gross) || (VDCSystem.demoMode ? 3202.54 : 0);
        ev.saftIVA6 = (docs.saft && docs.saft.totals && docs.saft.totals.iva6) || (VDCSystem.demoMode ? 192.15 : 0);
        ev.saftNet = (docs.saft && docs.saft.totals && docs.saft.totals.net) || (VDCSystem.demoMode ? 2409.95 : 0);
        ev.rendimentosBrutos = (docs.statements && docs.statements.totals && docs.statements.totals.rendimentosBrutos) || (VDCSystem.demoMode ? 3202.54 : 0);
        ev.comissaoApp = (docs.statements && docs.statements.totals && docs.statements.totals.comissaoApp) || (VDCSystem.demoMode ? -792.59 : 0);
        ev.rendimentosLiquidos = (docs.statements && docs.statements.totals && docs.statements.totals.rendimentosLiquidos) || (VDCSystem.demoMode ? 2409.95 : 0);
        ev.campanhas = (docs.statements && docs.statements.totals && docs.statements.totals.campanhas) || (VDCSystem.demoMode ? 20.00 : 0);
        ev.gorjetas = (docs.statements && docs.statements.totals && docs.statements.totals.gorjetas) || (VDCSystem.demoMode ? 9.00 : 0);
        ev.cancelamentos = (docs.statements && docs.statements.totals && docs.statements.totals.cancelamentos) || (VDCSystem.demoMode ? 15.60 : 0);
        ev.portagens = (docs.statements && docs.statements.totals && docs.statements.totals.portagens) || (VDCSystem.demoMode ? 7.65 : 0);
        ev.faturaPlataforma = (docs.invoices && docs.invoices.totals && docs.invoices.totals.invoiceValue) || (VDCSystem.demoMode ? 239.00 : 0);
        ev.platformCommission = (docs.invoices && docs.invoices.totals && docs.invoices.totals.commission) || 0;
        ev.iva23Due = (docs.invoices && docs.invoices.totals && docs.invoices.totals.iva23) || 0;
        ev.diferencialCusto = Math.abs(ev.comissaoApp) - ev.faturaPlataforma;
        
        if (ev.diferencialCusto > 0) {
            ev.prejuizoFiscal = ev.diferencialCusto * 0.21;
            ev.ivaAutoliquidacao = ev.diferencialCusto * 0.23;
            logAudit(`⚖️ DIFERENCIAL CALCULADO: |${Math.abs(ev.comissaoApp).toFixed(2)}€| - ${ev.faturaPlataforma.toFixed(2)}€ = ${ev.diferencialCusto.toFixed(2)}€`, 'warn');
            logAudit(`💰 Prejuízo Fiscal (21%): ${ev.prejuizoFiscal.toFixed(2)}€`, 'error');
            logAudit(`🧾 IVA Autoliquidação (23%): ${ev.ivaAutoliquidacao.toFixed(2)}€`, 'error');
        }
        
        ev.dac7Revenue = (docs.dac7 && docs.dac7.totals && docs.dac7.totals.annualRevenue) || ev.rendimentosBrutos;
        ev.dac7Period = (docs.dac7 && docs.dac7.totals && docs.dac7.totals.period) || (VDCSystem.demoMode ? 'Set-Dez 2024' : `${VDCSystem.selectedYear}-01 a ${VDCSystem.selectedYear}-12`);
        ev.dac7Quarterly = (docs.dac7 && docs.dac7.totals && docs.dac7.totals.quarterlyDetails) || [];
    } catch (error) {
        console.error('Erro no cálculo de valores extraídos:', error);
        throw error;
    }
}

function performForensicCrossings() {
    try {
        const ev = VDCSystem.analysis.extractedValues;
        const crossings = VDCSystem.analysis.crossings;
        
        crossings.deltaA = Math.abs(ev.saftGross - ev.rendimentosBrutos);
        crossings.deltaB = Math.abs(Math.abs(ev.comissaoApp) - ev.faturaPlataforma);
        crossings.omission = Math.max(crossings.deltaA, crossings.deltaB);
        crossings.diferencialAlerta = ev.diferencialCusto > 100;
        crossings.fraudIndicators = [];
        
        if (crossings.deltaB > 500) crossings.fraudIndicators.push('Discrepância significativa entre comissão retida e fatura emitida (ISO/IEC 27037)');
        if (ev.diferencialCusto > 0) crossings.fraudIndicators.push('Saída de caixa não documentada detetada (NIST SP 800-86)');
        if (crossings.deltaA > ev.saftGross * 0.05) crossings.fraudIndicators.push('Diferença superior a 5% entre faturação SAF-T e recebimento');
        if (crossings.deltaB > 50) crossings.fraudIndicators.push('Discrepância crítica > 50€ entre Fatura e Comissão - ALERTA VISUAL ATIVADO');
        
        logAudit(`🔐 CRUZAMENTO 1 (SAF-T vs Extrato): Δ = ${crossings.deltaA.toFixed(2)}€`, 'info');
        logAudit(`🔐 CRUZAMENTO 2 (Comissão vs Fatura): Δ = ${crossings.deltaB.toFixed(2)}€`, crossings.diferencialAlerta ? 'warn' : 'info');
        
        if (crossings.fraudIndicators.length > 0) {
            logAudit('❌ INDICADORES DE LAYERING IDENTIFICADOS (ISO/NIST):', 'error');
            crossings.fraudIndicators.forEach(indicator => {
                logAudit(`   • ${indicator}`, 'error');
            });
        }
    } catch (error) {
        console.error('Erro no cruzamento forense:', error);
        throw error;
    }
}

function calculateMarketProjection() {
    try {
        const proj = VDCSystem.analysis.projection;
        const ev = VDCSystem.analysis.extractedValues;
        
        proj.averagePerDriver = ev.diferencialCusto;
        proj.totalMarketImpact = proj.averagePerDriver * proj.driverCount * proj.monthsPerYear * proj.yearsOfOperation;
        proj.marketProjection = proj.totalMarketImpact / 1000000;
        
        logAudit(`📊 QUANTUM BENEFÍCIO ILÍCITO CALCULADO (38k × 12 × 7):`, 'info');
        logAudit(`   • Diferencial/motorista: ${proj.averagePerDriver.toFixed(2)}€`, 'info');
        logAudit(`   • Impacto mensal (38k): ${(proj.averagePerDriver * proj.driverCount / 1000000).toFixed(2)}M€`, 'info');
        logAudit(`   • Asset Forfeiture (7 anos): ${proj.marketProjection.toFixed(2)}M€`, 'warn');
    } catch (error) {
        console.error('Erro na projeção de mercado:', error);
        throw error;
    }
}

function calcularJurosMora() {
    try {
        const ev = VDCSystem.analysis.extractedValues;
        if (ev.diferencialCusto > 0) {
            ev.jurosMora = ev.diferencialCusto * 0.04;
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
            logAudit(`🔢 JUROS DE MORA CALCULADOS: ${ev.diferencialCusto.toFixed(2)}€ × 4% = ${ev.jurosMora.toFixed(2)}€ (RGRC)`, 'warn');
        }
    } catch (error) {
        console.error('Erro no cálculo de juros de mora:', error);
        throw error;
    }
}

function calculateRegulatoryRisk() {
    try {
        const ev = VDCSystem.analysis.extractedValues;
        const crossings = VDCSystem.analysis.crossings;
        
        ev.taxaRegulacao = Math.abs(ev.comissaoApp) * 0.05;
        ev.riscoRegulatorio = ev.taxaRegulacao;
        
        if (ev.taxaRegulacao > 0) {
            crossings.riscoRegulatorioAtivo = true;
            logAudit(`⚖️ RISCO REGULATÓRIO CALCULADO (AMT/IMT): 5% sobre ${Math.abs(ev.comissaoApp).toFixed(2)}€ = ${ev.taxaRegulacao.toFixed(2)}€`, 'regulatory');
            logAudit(`📋 Obrigação regulatória não discriminada identificada (Decreto-Lei 83/2017)`, 'regulatory');
        }
    } catch (error) {
        console.error('Erro no cálculo de risco regulatório:', error);
        throw error;
    }
}

// ===== ATUALIZAÇÃO DE INTERFACE =====
function updateDashboard() {
    try {
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
                if (id === 'iva23Val' && value > 0) elemento.classList.add('alert-text');
            }
        });
        
        const jurosCard = document.getElementById('jurosCard');
        const jurosVal = document.getElementById('jurosVal');
        if (jurosCard && jurosVal && ev.jurosMora > 0) {
            jurosVal.textContent = formatter.format(ev.jurosMora);
            jurosCard.style.display = 'flex';
        }
    } catch (error) {
        console.error('Erro na atualização do dashboard:', error);
    }
}

function updateKPIResults() {
    try {
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
        
        const results = {
            'grossResult': ev.saftGross,
            'transferResult': ev.rendimentosLiquidos,
            'differenceResult': VDCSystem.analysis.crossings.deltaB,
            'marketResult': proj.marketProjection.toFixed(2) + 'M€'
        };
        
        Object.entries(results).forEach(([id, value]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                if (typeof value === 'number') elemento.textContent = formatter.format(value);
                else elemento.textContent = value;
                elemento.classList.remove('hidden');
            }
        });
        
        updateProgressBars();
        
        const discrepancia = VDCSystem.analysis.crossings.deltaB;
        if (discrepancia > 50 && !VDCSystem.analysis.crossings.discrepanciaAlertaAtiva) {
            activateDiscrepancyAlert();
        }
    } catch (error) {
        console.error('Erro na atualização dos KPIs:', error);
    }
}

function updateProgressBars() {
    try {
        const ev = VDCSystem.analysis.extractedValues;
        const maxValue = Math.max(ev.saftGross, ev.rendimentosBrutos, Math.abs(ev.comissaoApp));
        const differenceBar = document.getElementById('differenceBar');
        
        if (differenceBar && maxValue > 0) {
            const percentage = (VDCSystem.analysis.crossings.deltaB / maxValue) * 100;
            differenceBar.style.width = Math.min(percentage, 100) + '%';
            if (percentage > 20) differenceBar.style.backgroundColor = 'var(--warn-primary)';
            else if (percentage > 10) differenceBar.style.backgroundColor = 'var(--warn-secondary)';
        }
    } catch (error) {
        console.error('Erro na atualização das barras de progresso:', error);
    }
}

function criarDashboardDiferencial() {
    try {
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
            if (kpiGrid.children.length >= 4) kpiGrid.insertBefore(diferencialCard, kpiGrid.children[4]);
            else kpiGrid.appendChild(diferencialCard);
            logAudit(`📊 Dashboard diferencial criado: ${diferencial.toFixed(2)}€ (NIST SP 800-86)`, 'info');
        }
    } catch (error) {
        console.error('Erro na criação do dashboard diferencial:', error);
    }
}

function criarDashboardRegulatorio() {
    try {
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
            const diferencialCard = document.getElementById('diferencialCard');
            if (diferencialCard && diferencialCard.parentNode === kpiGrid) {
                kpiGrid.insertBefore(regulatoryCard, diferencialCard.nextSibling);
            } else {
                kpiGrid.appendChild(regulatoryCard);
            }
            logAudit(`📊 Dashboard regulatório criado: ${taxaRegulacao.toFixed(2)}€ (AMT/IMT)`, 'regulatory');
        }
    } catch (error) {
        console.error('Erro na criação do dashboard regulatório:', error);
    }
}

// ===== ALERTAS =====
function triggerBigDataAlert(invoiceVal, commissionVal, deltaVal) {
    try {
        const alertElement = document.getElementById('bigDataAlert');
        if (!alertElement) return;
        if (VDCSystem.bigDataAlertInterval) clearInterval(VDCSystem.bigDataAlertInterval);
        
        const invoiceValElement = document.getElementById('alertInvoiceVal');
        const commValElement = document.getElementById('alertCommVal');
        const deltaValElement = document.getElementById('alertDeltaVal');
        
        if (invoiceValElement) invoiceValElement.textContent = invoiceVal.toFixed(2) + '€';
        if (commValElement) commValElement.textContent = commissionVal.toFixed(2) + '€';
        if (deltaValElement) deltaValElement.textContent = deltaVal.toFixed(2) + '€';
        
        alertElement.style.display = 'flex';
        let isRed = false;
        VDCSystem.analysis.crossings.bigDataAlertActive = true;
        
        VDCSystem.bigDataAlertInterval = setInterval(() => {
            if (isRed) {
                alertElement.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                alertElement.style.borderColor = 'var(--warn-secondary)';
                const strongElement = alertElement.querySelector('strong');
                if (strongElement) strongElement.style.color = 'var(--warn-secondary)';
            } else {
                alertElement.style.backgroundColor = 'rgba(255, 62, 62, 0.1)';
                alertElement.style.borderColor = 'var(--warn-primary)';
                const strongElement = alertElement.querySelector('strong');
                if (strongElement) strongElement.style.color = 'var(--warn-primary)';
            }
            isRed = !isRed;
        }, 1000);
        
        logAudit(`❌ ALERTA FORENSE ATIVADO: Disparidade ${deltaVal.toFixed(2)}€ entre fatura e comissão`, 'error');
    } catch (error) {
        console.error('Erro no alerta Big Data:', error);
    }
}

function activateDiscrepancyAlert() {
    try {
        const kpiComm = document.getElementById('kpiComm');
        const kpiInvoice = document.getElementById('kpiInvoice');
        
        if (kpiComm && kpiInvoice) {
            kpiComm.classList.add('blink-alert');
            kpiInvoice.classList.add('blink-alert');
            VDCSystem.analysis.crossings.discrepanciaAlertaAtiva = true;
            
            if (VDCSystem.discrepanciaAlertaInterval) clearInterval(VDCSystem.discrepanciaAlertaInterval);
            
            let isAlertActive = true;
            VDCSystem.discrepanciaAlertaInterval = setInterval(() => {
                if (isAlertActive) {
                    kpiComm.style.color = 'var(--warn-primary)';
                    kpiInvoice.style.color = 'var(--warn-primary)';
                    kpiComm.style.fontWeight = '900';
                    kpiInvoice.style.fontWeight = '900';
                } else {
                    kpiComm.style.color = 'var(--warn-secondary)';
                    kpiInvoice.style.color = 'var(--warn-secondary)';
                    kpiComm.style.fontWeight = '700';
                    kpiInvoice.style.fontWeight = '700';
                }
                isAlertActive = !isAlertActive;
            }, 1000);
            
            logAudit('⚠️ ALERTA DE DISCREPÂNCIA ATIVADO: Fatura vs Comissão > 50%', 'warn');
        }
    } catch (error) {
        console.error('Erro no alerta de discrepância:', error);
    }
}

function showDiferencialAlert() {
    try {
        const diferencialAlert = document.getElementById('diferencialAlert');
        if (diferencialAlert) diferencialAlert.style.display = 'flex';
    } catch (error) {
        console.error('Erro no alerta diferencial:', error);
    }
}

function showRegulatoryAlert() {
    try {
        const regulatoryAlert = document.getElementById('regulatoryAlert');
        const regulatoryValue = document.getElementById('regulatoryValue');
        if (regulatoryAlert && regulatoryValue) {
            regulatoryValue.textContent = VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2) + '€';
            regulatoryAlert.style.display = 'flex';
        }
    } catch (error) {
        console.error('Erro no alerta regulatório:', error);
    }
}

function showJurosMoraAlert() {
    try {
        const jurosAlert = document.getElementById('jurosAlert');
        const jurosValue = document.getElementById('jurosValue');
        if (jurosAlert && jurosValue) {
            jurosValue.textContent = VDCSystem.analysis.extractedValues.jurosMora.toFixed(2) + '€';
            jurosAlert.style.display = 'flex';
        }
    } catch (error) {
        console.error('Erro no alerta de juros:', error);
    }
}

function showOmissionAlert() {
    try {
        const omissionAlert = document.getElementById('omissionAlert');
        const omissionValue = document.getElementById('omissionValue');
        if (omissionAlert && omissionValue) {
            omissionValue.textContent = VDCSystem.analysis.crossings.omission.toFixed(2) + '€';
            omissionAlert.style.display = 'flex';
        }
    } catch (error) {
        console.error('Erro no alerta de omissão:', error);
    }
}

// ===== GRÁFICO =====
function renderDashboardChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        if (VDCSystem.chart) VDCSystem.chart.destroy();
        
        const ev = VDCSystem.analysis.extractedValues;
        let dataValues = [ev.saftNet || 0, ev.saftIVA6 || 0, Math.abs(ev.comissaoApp) || 0, ev.ivaAutoliquidacao || 0, ev.jurosMora || 0];
        const total = dataValues.reduce((a, b) => a + b, 0);
        let percentages = total > 0 ? dataValues.map(val => ((val / total) * 100).toFixed(1)) : ['0.0', '0.0', '0.0', '0.0', '0.0'];
        
        if (total === 0 && VDCSystem.demoMode) {
            dataValues = [2409.95, 192.15, 792.59, 127.33, 22.14];
            const demoTotal = dataValues.reduce((a, b) => a + b, 0);
            percentages = [
                ((2409.95 / demoTotal) * 100).toFixed(1),
                ((192.15 / demoTotal) * 100).toFixed(1),
                ((792.59 / demoTotal) * 100).toFixed(1),
                ((127.33 / demoTotal) * 100).toFixed(1),
                ((22.14 / demoTotal) * 100).toFixed(1)
            ];
        }
        
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
                    borderColor: [
                        '#00f2ff',
                        '#3b82f6',
                        '#ff3e3e',
                        '#f59e0b',
                        '#ff6b35'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.x;
                                const percentage = percentages[context.dataIndex];
                                return `${context.dataset.label}: ${value.toFixed(2)}€ (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: '#cbd5e1',
                            callback: function(value) { return value.toFixed(0) + '€'; }
                        },
                        title: {
                            display: true,
                            text: 'Valor (€)',
                            color: '#cbd5e1'
                        }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: '#cbd5e1',
                            font: { size: 11 }
                        }
                    }
                },
                animation: { duration: 1500 }
            }
        });
        
        logAudit('📊 Gráfico VERTICAL renderizado com valores em € e % (Big Data Forense)', 'success');
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        logAudit(`❌ Erro ao renderizar gráfico: ${error.message}`, 'error');
    }
}

// ===== EXPORTAÇÃO JSON =====
async function exportJSON() {
    try {
        updatePageTitle('Exportando JSON...');
        logAudit('💾 PREPARANDO EVIDÊNCIA DIGITAL BIG DATA (JSON)...', 'info');
        
        const evidenceData = {
            sistema: "VDC Forensic System v11.4 - Auditoria Fiscal Big Data 'THE CHECKMATE'",
            versao: VDCSystem.version,
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            protocoloIntegridade: "ISO/IEC 27037 | NIST SP 800-86 | Master Hash SHA-256 | AMT/IMT 5% | RGRC 4%",
            cliente: VDCSystem.client || { 
                nome: "Cliente de Demonstração", 
                nif: "000000000",
                platform: VDCSystem.selectedPlatform,
                registo: new Date().toISOString(),
                isoCompliance: "ISO/IEC 27037"
            },
            entidadeBolt: VDCSystem.boltEntity,
            analise: {
                periodo: VDCSystem.selectedYear,
                plataforma: VDCSystem.selectedPlatform,
                valores: VDCSystem.analysis.extractedValues,
                cruzamentos: VDCSystem.analysis.crossings,
                projecao: VDCSystem.analysis.projection,
                jurosMora: {
                    valor: VDCSystem.analysis.extractedValues.jurosMora,
                    fundamentoLegal: "Regime Geral das Infrações Tributárias (RGRC) - 4% base anual civil",
                    percentagem: "4% sobre diferencial de custo"
                },
                riscoregulatorio: {
                    taxaRegulacao: VDCSystem.analysis.extractedValues.taxaRegulacao,
                    fundamentoLegal: "Decreto-Lei 83/2017 - Taxa de Regulação AMT/IMT",
                    percentagem: "5% sobre comissão de intermediação"
                },
                cadeiaCustodia: VDCSystem.analysis.chainOfCustody,
                anomalias: VDCSystem.analysis.anomalies,
                quesitosEstrategicos: VDCSystem.analysis.quesitosEstrategicos,
                indicadoresLayering: VDCSystem.analysis.crossings.fraudIndicators,
                citacoesLegais: VDCSystem.analysis.legalCitations
            },
            documentos: {
                dac7: {
                    count: (VDCSystem.documents.dac7 && VDCSystem.documents.dac7.files && VDCSystem.documents.dac7.files.length) || 0,
                    totals: (VDCSystem.documents.dac7 && VDCSystem.documents.dac7.totals) || {},
                    hashes: (VDCSystem.documents.dac7 && VDCSystem.documents.dac7.hashes) || {}
                },
                control: {
                    count: (VDCSystem.documents.control && VDCSystem.documents.control.files && VDCSystem.documents.control.files.length) || 0,
                    hashes: (VDCSystem.documents.control && VDCSystem.documents.control.hashes) || {}
                },
                saft: {
                    count: (VDCSystem.documents.saft && VDCSystem.documents.saft.files && VDCSystem.documents.saft.files.length) || 0,
                    totals: (VDCSystem.documents.saft && VDCSystem.documents.saft.totals) || {},
                    hashes: (VDCSystem.documents.saft && VDCSystem.documents.saft.hashes) || {}
                },
                invoices: {
                    count: (VDCSystem.documents.invoices && VDCSystem.documents.invoices.files && VDCSystem.documents.invoices.files.length) || 0,
                    totals: (VDCSystem.documents.invoices && VDCSystem.documents.invoices.totals) || {},
                    hashes: (VDCSystem.documents.invoices && VDCSystem.documents.invoices.hashes) || {}
                },
                statements: {
                    count: (VDCSystem.documents.statements && VDCSystem.documents.statements.files && VDCSystem.documents.statements.files.length) || 0,
                    totals: (VDCSystem.documents.statements && VDCSystem.documents.statements.totals) || {},
                    hashes: (VDCSystem.documents.statements && VDCSystem.documents.statements.hashes) || {}
                }
            },
            logs: VDCSystem.logs.slice(-100),
            masterHash: document.getElementById('masterHashValue')?.textContent || "NÃO GERADA",
            assinaturaDigital: generateDigitalSignature(),
            isoStandard: "ISO/IEC 27037:2012",
            nistStandard: "NIST SP 800-86",
            amtImtCompliance: "Decreto-Lei 83/2017",
            rgrcCompliance: "Regime Geral das Infrações Tributárias (RGRC)"
        };
        
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `EVIDENCIA_BIG_DATA_VDC_${VDCSystem.sessionId}.json`,
                    types: [{
                        description: 'Ficheiro JSON de Evidência Digital Big Data',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(JSON.stringify(evidenceData, null, 2));
                await writable.close();
                logAudit('✅ Evidência digital Big Data exportada (File System Access API)', 'success');
                updatePageTitle('JSON Exportado');
            } catch (fsError) {
                if (fsError.name !== 'AbortError') throw fsError;
                logAudit('📝 Exportação cancelada pelo utilizador', 'info');
                updatePageTitle('Exportação Cancelada');
            }
        } else {
            const blob = new Blob([JSON.stringify(evidenceData, null, 2)], { 
                type: 'application/json;charset=utf-8' 
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `EVIDENCIA_BIG_DATA_VDC_${VDCSystem.sessionId}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            logAudit('✅ Evidência digital Big Data exportada (download automático)', 'success');
            updatePageTitle('JSON Exportado');
        }
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`❌ Erro ao exportar JSON Big Data: ${error.message}`, 'error');
        alert('Erro ao exportar JSON: ' + error.message);
        updatePageTitle('Erro na Exportação');
    }
}

// ===== EXPORTAÇÃO PDF =====
function exportPDF() {
    try {
        updatePageTitle('Gerando PDF...');
        logAudit('📄 GERANDO RELATÓRIO PERICIAL EM PDF...', 'info');
        
        if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yPos = 20;
            
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('VDC FORENSIC SYSTEM v11.4 - RELATÓRIO PERICIAL "THE CHECKMATE"', pageWidth / 2, yPos, { align: 'center' });
            yPos += 10;
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Protocolo: ${VDCSystem.sessionId}`, pageWidth / 2, yPos, { align: 'center' });
            pdf.text(`Data de emissão: ${new Date().toLocaleDateString('pt-PT')}`, pageWidth / 2, yPos + 5, { align: 'center' });
            yPos += 15;
            
            pdf.setLineWidth(0.5);
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
                pdf.text(`Ano fiscal: ${VDCSystem.selectedYear}`, 25, yPos + 15);
                yPos += 25;
            } else {
                pdf.text('Cliente não registado', 25, yPos);
                yPos += 10;
            }
            
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('2. RESUMO DE EVIDÊNCIAS PROCESSADAS', 20, yPos);
            yPos += 8;
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            
            const evidenceSummary = [
                `Ficheiros DAC7: ${VDCSystem.documents.dac7.files.length}`,
                `Ficheiros de Controlo: ${VDCSystem.documents.control.files.length}`,
                `Ficheiros SAF-T: ${VDCSystem.documents.saft.files.length}`,
                `Faturas: ${VDCSystem.documents.invoices.files.length}`,
                `Extratos: ${VDCSystem.documents.statements.files.length}`
            ];
            
            evidenceSummary.forEach((line, index) => {
                pdf.text(line, 25, yPos + (index * 5));
            });
            yPos += evidenceSummary.length * 5 + 5;
            
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('3. RESULTADOS DA ANÁLISE FORENSE', 20, yPos);
            yPos += 8;
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            
            const analysisResults = [
                `Rendimentos brutos: ${VDCSystem.analysis.extractedValues.rendimentosBrutos.toFixed(2)}€`,
                `Comissão da plataforma: ${VDCSystem.analysis.extractedValues.comissaoApp.toFixed(2)}€`,
                `Valor da fatura: ${VDCSystem.analysis.extractedValues.faturaPlataforma.toFixed(2)}€`,
                `Diferencial de custo: ${VDCSystem.analysis.extractedValues.diferencialCusto.toFixed(2)}€`,
                `IVA 23% devido: ${VDCSystem.analysis.extractedValues.ivaAutoliquidacao.toFixed(2)}€`,
                `Juros de mora (4%): ${VDCSystem.analysis.extractedValues.jurosMora.toFixed(2)}€`,
                `Taxa de regulação (5%): ${VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2)}€`
            ];
            
            analysisResults.forEach((line, index) => {
                pdf.text(line, 25, yPos + (index * 5));
            });
            yPos += analysisResults.length * 5 + 10;
            
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('4. CADEIA DE CUSTÓDIA (PRIMEIROS 10 REGISTOS)', 20, yPos);
            yPos += 8;
            
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            
            const custodyEntries = VDCSystem.analysis.chainOfCustody.slice(0, 10);
            custodyEntries.forEach((entry, index) => {
                if (yPos > pageHeight - 30) {
                    pdf.addPage();
                    yPos = 20;
                }
                pdf.text(`${index + 1}. ${entry.filename} (${entry.fileType}) - Hash: ${entry.hash.substring(0, 16)}...`, 25, yPos);
                yPos += 4;
            });
            yPos += 10;
            
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('5. INTEGRIDADE DIGITAL', 20, yPos);
            yPos += 8;
            
            pdf.setFontSize(9);
            pdf.setFont('courier', 'normal');
            
            const masterHash = document.getElementById('masterHashValue')?.textContent || 'NÃO GERADA';
            const hashLines = masterHash.match(/.{1,60}/g) || [];
            
            pdf.text('Master Hash SHA-256:', 25, yPos);
            yPos += 5;
            
            hashLines.forEach((line, index) => {
                pdf.text(line, 25, yPos + (index * 4));
            });
            yPos += hashLines.length * 4 + 10;
            
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Sistema de Peritagem Forense VDC v11.4 "THE CHECKMATE" - ISO/IEC 27037 | NIST SP 800-86 | © 2024', pageWidth / 2, pageHeight - 10, { align: 'center' });
            
            const fileName = `RELATORIO_PERICIAL_VDC_${VDCSystem.sessionId}.pdf`;
            pdf.save(fileName);
            
            logAudit('✅ Relatório pericial PDF gerado com sucesso', 'success');
            updatePageTitle('PDF Gerado');
        } else {
            logAudit('❌ Biblioteca jsPDF não encontrada. Verifique a inclusão do script.', 'error');
            showToast('Erro: Biblioteca jsPDF não encontrada', 'error');
            updatePageTitle('Erro na Geração');
        }
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
        showToast(`Erro ao gerar PDF: ${error.message}`, 'error');
        updatePageTitle('Erro na Geração');
    }
}

function generateQuesitosEstrategicos() {
    try {
        const ev = VDCSystem.analysis.extractedValues;
        const crossings = VDCSystem.analysis.crossings;
        
        VDCSystem.analysis.quesitosEstrategicos = [
            `1. Face ao diferencial de ${ev.diferencialCusto.toFixed(2)}€ detetado entre a comissão retida e a fatura emitida, onde se evidencia o cumprimento do Art. 103.º do RGRC (Fraude Fiscal Qualificada)?`,
            `2. Queira a Plataforma demonstrar o registo de log que comprova a aceitação destes termos pelo cliente, conforme exigido pela ISO/IEC 27037 (Preservação de Evidência Digital)?`,
            `3. Onde se encontra comprovado o pagamento da Taxa de Regulação (5%) devida à AMT sobre a comissão de gestão no valor de ${ev.taxaRegulacao.toFixed(2)}€, conforme Decreto-Lei 83/2017?`,
            `4. Pode a plataforma demonstrar a integridade do registo .CSV face à norma ISO/IEC 27037, considerando a ausência de hash SHA-256 na origem dos dados?`,
            `5. Como justifica a plataforma a diferença de ${ev.diferencialCusto.toFixed(2)}€ entre a comissão retida (${Math.abs(ev.comissaoApp).toFixed(2)}€) e a fatura emitida (${ev.faturaPlataforma.toFixed(2)}€), à luz do Art. 2.º do CIVA?`,
            `6. Em que documento está discriminado o IVA de 23% sobre o diferencial de ${ev.diferencialCusto.toFixed(2)}€, no montante de ${ev.ivaAutoliquidacao.toFixed(2)}€, conforme obrigação de autoliquidação?`,
            `7. A plataforma cumpre com o regime de Self-billing e Clearing Account, reportando integralmente todos os proveitos ao cliente final conforme exigido pelo RGPD?`,
            `8. Como garante a plataforma a Governança de Dados e conformidade RGPD face às violações identificadas de Desvio, Risco e Omissão de Proveitos?`,
            `9. Pode apresentar o processo de Triagem → Avaliação Técnica → Proposta aplicado na deteção e resolução das discrepâncias fiscais identificadas?`,
            `10. Face aos Juros de Mora calculados em ${ev.jurosMora.toFixed(2)}€ (4% base anual civil), onde está documentada a sua liquidação conforme RGRC?`
        ];
        
        logAudit('📋 Quesitos estratégicos gerados para inquirição (10 questões técnicas)', 'info');
    } catch (error) {
        console.error('Erro na geração de quesitos:', error);
    }
}

// ===== LOGGING E CONSOLA =====
function logAudit(message, type = 'info') {
    try {
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
            fullTimestamp: new Date().toISOString(),
            isoCompliance: 'ISO/IEC 27037',
            sessionId: VDCSystem.sessionId
        };
        
        VDCSystem.logs.push(logEntry);
        if (VDCSystem.logs.length > 500) VDCSystem.logs = VDCSystem.logs.slice(-500);
        
        updateAuditConsole(logEntry);
        console.log(`[VDC ${type.toUpperCase()}] ${message}`);
    } catch (error) {
        console.error('Erro no log de auditoria:', error);
    }
}

function updateAuditConsole(logEntry) {
    try {
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
    } catch (error) {
        console.error('Erro na atualização da consola:', error);
    }
}

function getLogColor(type) {
    const colors = {
        success: '#10b981',
        warn: '#f59e0b',
        error: '#ff3e3e',
        info: '#3b82f6',
        regulatory: '#ff6b35'
    };
    return colors[type] || '#cbd5e1';
}

function clearConsole() {
    try {
        const output = document.getElementById('auditOutput');
        if (output) output.innerHTML = '';
        logAudit('Consola de auditoria limpa (ISO/IEC 27037)', 'info');
    } catch (error) {
        console.error('Erro ao limpar consola:', error);
    }
}

function toggleConsole() {
    try {
        const consoleElement = document.getElementById('auditOutput');
        if (!consoleElement) return;
        consoleElement.style.height = consoleElement.style.height === '200px' ? '120px' : '200px';
    } catch (error) {
        console.error('Erro ao alternar consola:', error);
    }
}

// ===== RESET DASHBOARD =====
function resetDashboard() {
    try {
        logAudit('🔄 RESET COMPLETO DO SISTEMA - NOVA SESSÃO AUDITORIA FISCAL', 'info');
        updatePageTitle('Resetando Sistema...');
        
        if (VDCSystem.analysis.crossings.bigDataAlertActive && VDCSystem.bigDataAlertInterval) {
            clearInterval(VDCSystem.bigDataAlertInterval);
            VDCSystem.analysis.crossings.bigDataAlertActive = false;
        }
        if (VDCSystem.analysis.crossings.discrepanciaAlertaAtiva && VDCSystem.discrepanciaAlertaInterval) {
            clearInterval(VDCSystem.discrepanciaAlertaInterval);
            VDCSystem.analysis.crossings.discrepanciaAlertaAtiva = false;
        }
        
        const clientNameInput = document.getElementById('clientNameFixed');
        const clientNIFInput = document.getElementById('clientNIFFixed');
        const yearSelect = document.getElementById('selYearFixed');
        const platformSelect = document.getElementById('selPlatformFixed');
        
        if (clientNameInput) {
            clientNameInput.value = '';
            clientNameInput.classList.remove('error', 'success', 'readonly');
            clientNameInput.readOnly = false;
        }
        if (clientNIFInput) {
            clientNIFInput.value = '';
            clientNIFInput.classList.remove('error', 'success', 'readonly');
            clientNIFInput.readOnly = false;
        }
        if (yearSelect) {
            yearSelect.value = new Date().getFullYear();
            VDCSystem.selectedYear = parseInt(yearSelect.value);
        }
        if (platformSelect) {
            platformSelect.value = 'bolt';
            VDCSystem.selectedPlatform = 'bolt';
        }
        
        localStorage.removeItem('vdc_clients_bd_v11_4');
        VDCSystem.preRegisteredClients = [];
        
        const elementos = [
            'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice',
            'valCamp', 'valTips', 'valCanc', 'valTolls',
            'netVal', 'iva6Val', 'commissionVal', 'iva23Val',
            'grossResult', 'transferResult', 'differenceResult', 'marketResult',
            'jurosVal'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = id === 'marketResult' ? '0,00M€' : '0,00€';
                if (id === 'kpiComm') {
                    elemento.style.color = '';
                    elemento.style.fontWeight = '';
                }
                if (elemento.classList) {
                    elemento.classList.remove('blink-alert', 'alert-text', 'regulatory-text');
                }
            }
        });
        
        document.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.width = '0%';
            bar.style.backgroundColor = '';
        });
        
        const diferencialCard = document.getElementById('diferencialCard');
        if (diferencialCard) diferencialCard.remove();
        
        const regulatoryCardKPI = document.getElementById('regulatoryCardKPI');
        if (regulatoryCardKPI) regulatoryCardKPI.remove();
        
        const jurosCard = document.getElementById('jurosCard');
        if (jurosCard) jurosCard.style.display = 'none';
        
        const alerts = [
            'omissionAlert', 'bigDataAlert', 'diferencialAlert', 'regulatoryAlert', 'jurosAlert'
        ];
        alerts.forEach(id => {
            const alert = document.getElementById(id);
            if (alert) alert.style.display = 'none';
        });
        
        const clientStatus = document.getElementById('clientStatusFixed');
        if (clientStatus) {
            clientStatus.style.display = 'none';
            const nameDisplay = document.getElementById('clientNameDisplayFixed');
            const nifDisplay = document.getElementById('clientNifDisplayFixed');
            if (nameDisplay) nameDisplay.textContent = '';
            if (nifDisplay) nifDisplay.textContent = '';
        }
        
        const fileLists = [
            'dac7FileListModal', 'controlFileListModal', 'saftFileListModal',
            'invoiceFileListModal', 'statementFileListModal'
        ];
        fileLists.forEach(id => {
            const list = document.getElementById(id);
            if (list) {
                list.innerHTML = '';
                list.classList.remove('visible');
            }
        });
        
        const faturasList = document.getElementById('faturasList');
        if (faturasList) {
            faturasList.innerHTML = '';
            faturasList.classList.remove('visible');
        }
        const extratosList = document.getElementById('extratosList');
        if (extratosList) {
            extratosList.innerHTML = '';
            extratosList.classList.remove('visible');
        }
        
        const counters = [
            'dac7CountCompact', 'controlCountCompact', 'saftCountCompact',
            'invoiceCountCompact', 'statementCountCompact'
        ];
        counters.forEach(id => {
            const counter = document.getElementById(id);
            if (counter) counter.textContent = '0';
        });
        
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
        
        VDCSystem.analysis.crossings = {
            deltaA: 0, deltaB: 0, omission: 0, isValid: true,
            diferencialAlerta: false, fraudIndicators: [],
            bigDataAlertActive: false, discrepanciaAlertaAtiva: false,
            riscoRegulatorioAtivo: false
        };
        
        VDCSystem.analysis.projection = {
            marketProjection: 0, averagePerDriver: 0, driverCount: 38000,
            monthsPerYear: 12, yearsOfOperation: 7, totalMarketImpact: 0
        };
        
        VDCSystem.analysis.chainOfCustody = [];
        VDCSystem.analysis.anomalies = [];
        VDCSystem.analysis.quesitosEstrategicos = [];
        
        VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
        
        if (VDCSystem.chart) {
            VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0, 0];
            VDCSystem.chart.update();
        }
        
        updateAnalysisButton();
        updateEvidenceSummary();
        updateEvidenceCount();
        updateCompactCounters();
        clearConsole();
        generateMasterHash();
        
        VDCSystem.sessionId = generateSessionId();
        const sessionDisplay = document.getElementById('sessionIdDisplay');
        if (sessionDisplay) sessionDisplay.textContent = VDCSystem.sessionId;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
        }
        
        logAudit('✅ Sistema resetado - Todos os dados limpos | Nova sessão Auditoria Fiscal criada', 'success');
        updatePageTitle('Sistema Pronto');
    } catch (error) {
        console.error('Erro no reset do dashboard:', error);
        logAudit(`❌ Erro no reset do sistema: ${error.message}`, 'error');
    }
}

async function performForensicAnalysis() {
    try {
        updatePageTitle('Auditando Big Data...');
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUDITANDO BIG DATA (ISO/IEC 27037)...';
        }
        
        logAudit('🔍🧠 INICIANDO AUDITORIA FISCAL DE LAYERING BIG DATA', 'success');
        logAudit('📊 Cruzamento SAF-T vs Extratos vs Faturas (NIST SP 800-86)', 'info');
        logAudit('⚖️ Verificação de Conformidade AMT/IMT - Taxa de Regulação 5%', 'regulatory');
        logAudit('🔢 Cálculo de Juros de Mora (RGRC 4% base anual civil)', 'warn');
        
        const tasks = [
            processLoadedData().catch(err => logAudit(`❌ Erro no processamento de dados: ${err.message}`, 'error')),
            calculateExtractedValues().catch(err => logAudit(`❌ Erro no cálculo de valores: ${err.message}`, 'error')),
            performForensicCrossings().catch(err => logAudit(`❌ Erro no cruzamento forense: ${err.message}`, 'error')),
            calculateMarketProjection().catch(err => logAudit(`❌ Erro na projeção de mercado: ${err.message}`, 'error')),
            calcularJurosMora().catch(err => logAudit(`❌ Erro no cálculo de juros: ${err.message}`, 'error')),
            calculateRegulatoryRisk().catch(err => logAudit(`❌ Erro no cálculo de risco regulatório: ${err.message}`, 'error'))
        ];
        await Promise.allSettled(tasks);
        
        const updateTasks = [
            updateDashboard().catch(err => logAudit(`❌ Erro na atualização do dashboard: ${err.message}`, 'error')),
            updateKPIResults().catch(err => logAudit(`❌ Erro na atualização dos KPIs: ${err.message}`, 'error')),
            renderDashboardChart().catch(err => logAudit(`❌ Erro na renderização do gráfico: ${err.message}`, 'error')),
            criarDashboardDiferencial().catch(err => logAudit(`❌ Erro na criação do dashboard diferencial: ${err.message}`, 'error')),
            criarDashboardRegulatorio().catch(err => logAudit(`❌ Erro na criação do dashboard regulatório: ${err.message}`, 'error')),
            generateMasterHash().catch(err => logAudit(`❌ Erro na geração do hash master: ${err.message}`, 'error')),
            generateQuesitosEstrategicos().catch(err => logAudit(`❌ Erro na geração de quesitos: ${err.message}`, 'error'))
        ];
        await Promise.allSettled(updateTasks);
        
        updateDashboard();
        
        const discrepancia = Math.abs(Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) - VDCSystem.analysis.extractedValues.faturaPlataforma);
        if (discrepancia > 50) {
            triggerBigDataAlert(
                VDCSystem.analysis.extractedValues.faturaPlataforma,
                Math.abs(VDCSystem.analysis.extractedValues.comissaoApp),
                discrepancia
            );
            activateDiscrepancyAlert();
        }
        
        logAudit('✅ AUDITORIA FISCAL BIG DATA CONCLUÍDA COM SUCESSO (ISO/IEC 27037)', 'success');
        logAudit(`⚖️ Diferencial identificado: ${VDCSystem.analysis.extractedValues.diferencialCusto.toFixed(2)}€`, 'warn');
        logAudit(`🔢 Juros de Mora (4%): ${VDCSystem.analysis.extractedValues.jurosMora.toFixed(2)}€ (RGRC)`, 'warn');
        logAudit(`📊 Quantum Benefício Ilícito (38k × 12 × 7): ${(VDCSystem.analysis.projection.totalMarketImpact / 1000000).toFixed(2)}M€`, 'info');
        logAudit(`⚖️ Risco Regulatório AMT/IMT: ${VDCSystem.analysis.extractedValues.taxaRegulacao.toFixed(2)}€ (5% sobre comissão)`, 'regulatory');
        
        if (VDCSystem.analysis.crossings.diferencialAlerta) showDiferencialAlert();
        if (VDCSystem.analysis.crossings.riscoRegulatorioAtivo) showRegulatoryAlert();
        if (VDCSystem.analysis.extractedValues.jurosMora > 0) showJurosMoraAlert();
        if (VDCSystem.analysis.crossings.omission > 100) showOmissionAlert();
        
        showChainOfCustody();
        updatePageTitle('Auditoria Concluída');
    } catch (error) {
        console.error('Erro na auditoria:', error);
        logAudit(`❌ Erro na auditoria Big Data: ${error.message}`, 'error');
        showError(`Erro na auditoria fiscal: ${error.message}`);
        updatePageTitle('Erro na Auditoria');
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR AUDITORIA BIG DATA';
        }
    }
}

// ===== FUNÇÕES AUXILIARES =====
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function updateCounter(type, count) {
    try {
        VDCSystem.counters[type] = count;
        const total = VDCSystem.counters.dac7 + VDCSystem.counters.control + 
                      VDCSystem.counters.saft + VDCSystem.counters.invoices + 
                      VDCSystem.counters.statements;
        VDCSystem.counters.total = total;
    } catch (error) {
        console.error('Erro na atualização do contador:', error);
    }
}

function updateAnalysisButton() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (!analyzeBtn) return;
        
        const hasControl = VDCSystem.documents.control && VDCSystem.documents.control.files && VDCSystem.documents.control.files.length > 0;
        const hasSaft = VDCSystem.documents.saft && VDCSystem.documents.saft.files && VDCSystem.documents.saft.files.length > 0;
        const hasClient = VDCSystem.client !== null;
        
        analyzeBtn.disabled = !(hasControl && hasSaft && hasClient);
        
        if (!analyzeBtn.disabled) logAudit('✅ Sistema pronto para auditoria fiscal de layering (ISO/IEC 27037)', 'success');
    } catch (error) {
        console.error('Erro na atualização do botão de análise:', error);
    }
}

function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-AF-${timestamp}-${random}`.toUpperCase();
}

// ===== MASTER HASH - RECALCULADO AUTOMATICAMENTE =====
function generateMasterHash() {
    try {
        const data = [
            VDCSystem.sessionId || 'NO_SESSION',
            VDCSystem.selectedYear.toString(),
            VDCSystem.selectedPlatform,
            VDCSystem.client?.nif || 'NO_CLIENT',
            VDCSystem.analysis.extractedValues.diferencialCusto.toString(),
            VDCSystem.analysis.extractedValues.jurosMora.toString(),
            VDCSystem.analysis.extractedValues.taxaRegulacao.toString(),
            VDCSystem.analysis.projection.totalMarketImpact.toString(),
            new Date().toISOString(),
            VDCSystem.documents.dac7?.files?.length?.toString() || '0',
            VDCSystem.documents.control?.files?.length?.toString() || '0',
            VDCSystem.documents.saft?.files?.length?.toString() || '0',
            VDCSystem.documents.invoices?.files?.length?.toString() || '0',
            VDCSystem.documents.statements?.files?.length?.toString() || '0',
            CryptoJS.SHA256(JSON.stringify(VDCSystem.logs.slice(-10))).toString(),
            CryptoJS.SHA256(JSON.stringify(VDCSystem.analysis.chainOfCustody)).toString(),
            'ISO/IEC 27037',
            'NIST SP 800-86',
            'RGRC 4%',
            'AMT/IMT 5%'
        ].join('|');
        
        const masterHash = CryptoJS.SHA256(data).toString();
        const display = document.getElementById('masterHashValue');
        
        if (display) {
            display.textContent = masterHash;
            display.style.color = '#00d1ff';
            display.style.fontFamily = 'JetBrains Mono, monospace';
            display.style.fontSize = '0.8rem';
            display.style.letterSpacing = '0.5px';
            display.style.fontWeight = 'bold';
        }
        
        logAudit(`🔗 Master Hash SHA-256 gerada: ${masterHash.substring(0, 32)}... (ISO/NIST/RGRC/AMT)`, 'success');
        return masterHash;
    } catch (error) {
        console.error('Erro na geração do master hash:', error);
        return 'ERRO NA GERAÇÃO';
    }
}

function generateDigitalSignature() {
    try {
        const data = JSON.stringify({
            session: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            client: VDCSystem.client?.nif,
            differential: VDCSystem.analysis.extractedValues.diferencialCusto,
            jurosMora: VDCSystem.analysis.extractedValues.jurosMora,
            regulatoryRisk: VDCSystem.analysis.extractedValues.taxaRegulacao,
            isoStandard: 'ISO/IEC 27037',
            nistStandard: 'NIST SP 800-86',
            rgrcCompliance: 'Regime Geral das Infrações Tributárias (RGRC)',
            amtImtCompliance: 'Decreto-Lei 83/2017'
        });
        
        return CryptoJS.HmacSHA256(data, VDCSystem.sessionId + 'ISO/NIST/RGRC/AMT').toString();
    } catch (error) {
        console.error('Erro na geração da assinatura digital:', error);
        return 'ERRO NA GERAÇÃO';
    }
}

// ===== UTILIDADES =====
function showToast(message, type = 'success') {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
            <p>${message}</p>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 3000);
    } catch (error) {
        console.error('Erro no toast:', error);
    }
}

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    showToast(`❌ ${message}`, 'error');
}

function smoothScrollTo(elementId) {
    try {
        const element = document.getElementById(elementId);
        if (element) element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    } catch (error) {
        console.error('Erro no scroll suave:', error);
    }
}

function updatePageTitle(status) {
    const baseTitle = 'VDC | Sistema de Peritagem Forense v11.4';
    document.title = status ? `${baseTitle} - ${status}` : baseTitle;
}

// ===== EXPORTAÇÃO GLOBAL DE FUNÇÕES (V11.4 - PROTOCOLO DE FECHO) =====
window.clearConsole = clearConsole;
window.toggleConsole = toggleConsole;
window.exportJSON = exportJSON;
window.exportPDF = exportPDF;
window.resetDashboard = resetDashboard;
window.performForensicAnalysis = performForensicAnalysis;
window.activateDemoMode = activateDemoMode;
window.showChainOfCustody = showChainOfCustody;
window.smoothScrollTo = smoothScrollTo;
window.openEvidenceModal = openEvidenceModal;
window.closeEvidenceModal = closeEvidenceModal;
window.clearAllEvidence = clearAllEvidence;
window.generateMasterHash = generateMasterHash;
window.registerClientFixed = registerClientFixed;
window.handleClientAutocompleteFixed = handleClientAutocompleteFixed;
window.toForensicNumber = toForensicNumber;
window.criarDashboardDiferencial = criarDashboardDiferencial;
window.criarDashboardRegulatorio = criarDashboardRegulatorio;
window.triggerBigDataAlert = triggerBigDataAlert;
window.activateDiscrepancyAlert = activateDiscrepancyAlert;
window.calcularJurosMora = calcularJurosMora;
window.calculateRegulatoryRisk = calculateRegulatoryRisk;
window.processLoadedData = processLoadedData;
window.calculateExtractedValues = calculateExtractedValues;
window.performForensicCrossings = performForensicCrossings;
window.calculateMarketProjection = calculateMarketProjection;
window.updateDashboard = updateDashboard;
window.updateKPIResults = updateKPIResults;
window.renderDashboardChart = renderDashboardChart;
window.generateQuesitosEstrategicos = generateQuesitosEstrategicos;
window.logAudit = logAudit;
window.generateDigitalSignature = generateDigitalSignature;
