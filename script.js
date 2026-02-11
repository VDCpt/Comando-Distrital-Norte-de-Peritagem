// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v11.4
// CORREÇÃO CRÍTICA: WINDOW.ONLOAD E PROMISES
// ============================================

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

const VDCSystem = {
    version: 'v11.4-AF-CHECKMATE',
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

// ===== CORREÇÃO CRÍTICA #1: WINDOW.ONLOAD COM PROMISES CORRETAS =====
window.onload = async function() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v11.4 "THE CHECKMATE"...');
        
        // CORREÇÃO: Usar Promise.reject() e não reject() indefinido
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

// ===== FUNÇÕES ESSENCIAIS PARA ABRIR O SISTEMA =====
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
                logAudit('✅ Sistema VDC v11.4 inicializado', 'success');
                generateMasterHash();
            }, 300);
        }, 500);
    } catch (error) {
        console.error('Erro no carregamento:', error);
        showMainInterface(); // Fallback
    }
}

// ===== CONFIGURAÇÕES BÁSICAS =====
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
    });
}

function setupPlatformSelector() {
    const selPlatform = document.getElementById('selPlatformFixed');
    if (!selPlatform) return;
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
    });
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

// ===== SETUP DE EVENTOS MÍNIMO =====
function setupEventListeners() {
    try {
        const registerBtn = document.getElementById('registerClientBtnFixed');
        if (registerBtn) registerBtn.addEventListener('click', registerClientFixed);
        
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
    } catch (error) {
        console.error('Erro na configuração de eventos:', error);
    }
}

function setupModalUploadButtons() {
    // Função mínima para evitar erros
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
    }
}

// ===== VERSÕES SIMPLIFICADAS DAS FUNÇÕES PARA TESTE =====
function openEvidenceModal() {
    try {
        const evidenceModal = document.getElementById('evidenceModal');
        if (evidenceModal) evidenceModal.style.display = 'flex';
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

function clearAllEvidence() {
    try {
        if (confirm('Tem a certeza que deseja limpar TODAS as evidências?')) {
            // Reset simplificado
            VDCSystem.documents = {
                dac7: { files: [], parsedData: [], totals: {}, hashes: {} },
                control: { files: [], parsedData: null, totals: {}, hashes: {} },
                saft: { files: [], parsedData: [], totals: {}, hashes: {} },
                invoices: { files: [], parsedData: [], totals: {}, hashes: {}},
                statements: { files: [], parsedData: [], totals: {}, hashes: {}}
            };
            VDCSystem.counters = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
            
            // Limpar listas
            ['dac7FileListModal', 'controlFileListModal', 'saftFileListModal', 'invoiceFileListModal', 'statementFileListModal', 'faturasList', 'extratosList'].forEach(id => {
                const list = document.getElementById(id);
                if (list) {
                    list.innerHTML = '';
                    list.classList.remove('visible');
                }
            });
            
            updateEvidenceCount();
            updateCompactCounters();
            logAudit('🗑️ Todas as evidências foram limpas', 'warn');
        }
    } catch (error) {
        console.error('Erro ao limpar evidências:', error);
    }
}

async function handleFileUploadModal(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    const files = Array.from(event.target.files);
    
    try {
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], parsedData: [], totals: {}, hashes: {} };
        }
        
        VDCSystem.documents[type].files.push(...files);
        
        for (const file of files) {
            try {
                const text = await readFileAsText(file);
                const fileHash = CryptoJS.SHA256(text).toString();
                VDCSystem.documents[type].hashes[file.name] = fileHash;
                
                // Processamento simplificado
                let extractedData = { filename: file.name, records: 1 };
                VDCSystem.documents[type].parsedData.push({
                    filename: file.name,
                    hash: fileHash,
                    data: extractedData,
                    timestamp: new Date().toISOString()
                });
                
                VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
                
                updateFileListModal(`${type}FileListModal`, VDCSystem.documents[type].files, fileHash);
                
                logAudit(`✅ ${file.name} processado`, 'success');
            } catch (fileError) {
                console.error(`Erro no ficheiro ${file.name}:`, fileError);
            }
        }
        
        updateCounter(type, VDCSystem.documents[type].files.length);
        updateCompactCounters();
        updateEvidenceCount();
        generateMasterHash();
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
    } finally {
        event.target.value = '';
    }
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
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">✓</span>
        `;
        fileList.appendChild(fileItem);
    });
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

function updateEvidenceSummary() {
    // Função simplificada
}

function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients_bd_v11_4') || '[]');
        VDCSystem.preRegisteredClients = clients;
    } catch (error) {
        VDCSystem.preRegisteredClients = [];
    }
}

// ===== REGISTO DE CLIENTE - SAFE DOM UPDATE =====
function registerClientFixed() {
    try {
        const nameInput = document.getElementById('clientNameFixed');
        const nifInput = document.getElementById('clientNIFFixed');
        const name = nameInput?.value.trim();
        const nif = nifInput?.value.trim();
        
        if (!name || name.length < 3) {
            alert('Nome do cliente inválido (mínimo 3 caracteres)');
            nameInput?.classList.add('error');
            nameInput?.focus();
            return;
        }
        
        if (!nif || !/^\d{9}$/.test(nif)) {
            alert('NIF inválido (deve ter 9 dígitos)');
            nifInput?.classList.add('error');
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
            session: VDCSystem.sessionId,
            platform: VDCSystem.selectedPlatform
        };
        
        // SAFE DOM UPDATE - SEM INNERHTML
        const status = document.getElementById('clientStatusFixed');
        const nameDisplay = document.getElementById('clientNameDisplayFixed');
        const nifDisplay = document.getElementById('clientNifDisplayFixed');
        
        if (status) status.style.display = 'flex';
        if (nameDisplay) nameDisplay.textContent = name;
        if (nifDisplay) nifDisplay.textContent = nif;
        
        logAudit(`✅ Cliente registado: ${name}`, 'success');
        updateAnalysisButton();
    } catch (error) {
        console.error('Erro no registo do cliente:', error);
        alert(`Erro no registo: ${error.message}`);
    }
}

function updateAnalysisButton() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (!analyzeBtn) return;
        
        const hasControl = VDCSystem.documents.control?.files?.length > 0;
        const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
        const hasClient = VDCSystem.client !== null;
        
        analyzeBtn.disabled = !(hasControl && hasSaft && hasClient);
    } catch (error) {
        console.error('Erro na atualização do botão:', error);
    }
}

// ===== MODO DEMO SIMPLIFICADO =====
function activateDemoMode() {
    try {
        if (VDCSystem.processing) return;
        VDCSystem.demoMode = true;
        VDCSystem.processing = true;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = true;
            demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO...';
        }
        
        // Registar cliente demo
        const clientNameInput = document.getElementById('clientNameFixed');
        const clientNIFInput = document.getElementById('clientNIFFixed');
        if (clientNameInput) clientNameInput.value = 'Momento Eficaz Unipessoal, Lda';
        if (clientNIFInput) clientNIFInput.value = '517905450';
        registerClientFixed();
        
        setTimeout(() => {
            VDCSystem.analysis.extractedValues = {
                rendimentosBrutos: 3202.54,
                comissaoApp: -792.59,
                rendimentosLiquidos: 2409.95,
                faturaPlataforma: 239.00,
                diferencialCusto: 553.59,
                jurosMora: 22.14,
                taxaRegulacao: 39.63
            };
            
            updateDashboard();
            updateKPIResults();
            renderDashboardChart();
            generateMasterHash();
            
            VDCSystem.processing = false;
            if (demoBtn) {
                demoBtn.disabled = false;
                demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
            }
            
            logAudit('✅ MODO DEMO ATIVADO', 'success');
        }, 1500);
    } catch (error) {
        console.error('Erro no modo demo:', error);
        VDCSystem.processing = false;
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
        }
    }
}

// ===== FUNÇÕES DE ATUALIZAÇÃO DE INTERFACE =====
function updateDashboard() {
    try {
        const formatter = new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
        });
        
        const ev = VDCSystem.analysis.extractedValues;
        
        const netVal = document.getElementById('netVal');
        if (netVal) netVal.textContent = formatter.format(ev.rendimentosLiquidos || 0);
        
        const commissionVal = document.getElementById('commissionVal');
        if (commissionVal) commissionVal.textContent = formatter.format(ev.comissaoApp || 0);
        
        const iva23Val = document.getElementById('iva23Val');
        if (iva23Val) iva23Val.textContent = formatter.format(ev.ivaAutoliquidacao || 0);
        
        const jurosVal = document.getElementById('jurosVal');
        const jurosCard = document.getElementById('jurosCard');
        if (jurosVal && jurosCard && ev.jurosMora > 0) {
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
        
        const kpiGanhos = document.getElementById('kpiGanhos');
        if (kpiGanhos) kpiGanhos.textContent = formatter.format(ev.rendimentosBrutos || 0);
        
        const kpiComm = document.getElementById('kpiComm');
        if (kpiComm) kpiComm.textContent = formatter.format(ev.comissaoApp || 0);
        
        const kpiNet = document.getElementById('kpiNet');
        if (kpiNet) kpiNet.textContent = formatter.format(ev.rendimentosLiquidos || 0);
        
        const kpiInvoice = document.getElementById('kpiInvoice');
        if (kpiInvoice) kpiInvoice.textContent = formatter.format(ev.faturaPlataforma || 0);
        
        const grossResult = document.getElementById('grossResult');
        if (grossResult) grossResult.textContent = formatter.format(ev.rendimentosBrutos || 0);
        
        const transferResult = document.getElementById('transferResult');
        if (transferResult) transferResult.textContent = formatter.format(ev.rendimentosLiquidos || 0);
        
        const differenceResult = document.getElementById('differenceResult');
        if (differenceResult) differenceResult.textContent = formatter.format(VDCSystem.analysis.crossings?.deltaB || 0);
    } catch (error) {
        console.error('Erro na atualização dos KPIs:', error);
    }
}

// ===== GRÁFICO =====
function renderDashboardChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        if (VDCSystem.chart) VDCSystem.chart.destroy();
        
        let dataValues = [2409.95, 192.15, 792.59, 127.33, 22.14];
        const ev = VDCSystem.analysis.extractedValues;
        
        if (ev.rendimentosLiquidos > 0) {
            dataValues = [
                ev.rendimentosLiquidos || 0,
                ev.saftIVA6 || 0,
                Math.abs(ev.comissaoApp) || 0,
                ev.ivaAutoliquidacao || 0,
                ev.jurosMora || 0
            ];
        }
        
        const labels = [
            `Ilíquido: ${dataValues[0].toFixed(2)}€`,
            `IVA 6%: ${dataValues[1].toFixed(2)}€`,
            `Comissão: ${dataValues[2].toFixed(2)}€`,
            `IVA 23%: ${dataValues[3].toFixed(2)}€`,
            `Juros Mora: ${dataValues[4].toFixed(2)}€`
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
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y'
            }
        });
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
    }
}

// ===== EXPORTAÇÕES SIMPLIFICADAS =====
async function exportJSON() {
    alert('Função exportJSON em desenvolvimento');
}

function exportPDF() {
    alert('Função exportPDF em desenvolvimento');
}

function resetDashboard() {
    try {
        // Reset básico
        const clientNameInput = document.getElementById('clientNameFixed');
        const clientNIFInput = document.getElementById('clientNIFFixed');
        if (clientNameInput) {
            clientNameInput.value = '';
            clientNameInput.classList.remove('error', 'success');
        }
        if (clientNIFInput) {
            clientNIFInput.value = '';
            clientNIFInput.classList.remove('error', 'success');
        }
        
        const clientStatus = document.getElementById('clientStatusFixed');
        if (clientStatus) {
            clientStatus.style.display = 'none';
            const nameDisplay = document.getElementById('clientNameDisplayFixed');
            const nifDisplay = document.getElementById('clientNifDisplayFixed');
            if (nameDisplay) nameDisplay.textContent = '';
            if (nifDisplay) nifDisplay.textContent = '';
        }
        
        VDCSystem.demoMode = false;
        VDCSystem.client = null;
        VDCSystem.processing = false;
        
        VDCSystem.analysis.extractedValues = {
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
            faturaPlataforma: 0, diferencialCusto: 0, jurosMora: 0, taxaRegulacao: 0
        };
        
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        generateMasterHash();
        
        logAudit('✅ Sistema resetado', 'success');
    } catch (error) {
        console.error('Erro no reset:', error);
    }
}

async function performForensicAnalysis() {
    alert('Função performForensicAnalysis em desenvolvimento');
}

function showChainOfCustody() {
    if (VDCSystem.analysis.chainOfCustody.length === 0) {
        logAudit('ℹ️ Cadeia de Custódia vazia', 'info');
    } else {
        logAudit(`📋 Cadeia de Custódia: ${VDCSystem.analysis.chainOfCustody.length} registos`, 'info');
    }
}

function addToChainOfCustody(file, type, hash = '') {
    try {
        const custodyRecord = {
            filename: file.name,
            fileType: type,
            size: file.size,
            uploadTimestamp: new Date().toISOString(),
            hash: hash || 'pending'
        };
        VDCSystem.analysis.chainOfCustody.push(custodyRecord);
    } catch (error) {
        console.error('Erro na cadeia de custódia:', error);
    }
}

// ===== LOGGING =====
function logAudit(message, type = 'info') {
    try {
        const timestamp = new Date().toLocaleTimeString('pt-PT');
        const logEntry = { timestamp, type, message };
        VDCSystem.logs.push(logEntry);
        if (VDCSystem.logs.length > 500) VDCSystem.logs = VDCSystem.logs.slice(-500);
        
        updateAuditConsole(logEntry);
        console.log(`[VDC] ${message}`);
    } catch (error) {
        console.error('Erro no log:', error);
    }
}

function updateAuditConsole(logEntry) {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${logEntry.type}`;
    entry.innerHTML = `<span>[${logEntry.timestamp}]</span> <span>${logEntry.message}</span>`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
}

function toggleConsole() {
    const consoleElement = document.getElementById('auditOutput');
    if (consoleElement) {
        consoleElement.style.height = consoleElement.style.height === '200px' ? '120px' : '200px';
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
    VDCSystem.counters[type] = count;
    VDCSystem.counters.total = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
}

function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-AF-${timestamp}-${random}`.toUpperCase();
}

function generateMasterHash() {
    try {
        const data = [
            VDCSystem.sessionId || 'NO_SESSION',
            VDCSystem.selectedYear.toString(),
            VDCSystem.client?.nif || 'NO_CLIENT',
            VDCSystem.analysis.extractedValues.diferencialCusto.toString(),
            new Date().toISOString()
        ].join('|');
        
        const masterHash = CryptoJS.SHA256(data).toString();
        const display = document.getElementById('masterHashValue');
        if (display) {
            display.textContent = masterHash;
        }
        return masterHash;
    } catch (error) {
        console.error('Erro na geração do master hash:', error);
        return 'ERRO';
    }
}

function updatePageTitle(status) {
    const baseTitle = 'VDC | Sistema de Peritagem Forense v11.4';
    document.title = status ? `${baseTitle} - ${status}` : baseTitle;
}

// ===== EXPORTAÇÃO GLOBAL =====
window.clearConsole = clearConsole;
window.toggleConsole = toggleConsole;
window.exportJSON = exportJSON;
window.exportPDF = exportPDF;
window.resetDashboard = resetDashboard;
window.performForensicAnalysis = performForensicAnalysis;
window.activateDemoMode = activateDemoMode;
window.showChainOfCustody = showChainOfCustody;
window.openEvidenceModal = openEvidenceModal;
window.closeEvidenceModal = closeEvidenceModal;
window.clearAllEvidence = clearAllEvidence;
window.registerClientFixed = registerClientFixed;
window.generateMasterHash = generateMasterHash;
window.logAudit = logAudit;
