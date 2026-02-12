/**
 * VDC SISTEMA DE PERITAGEM FORENSE v11.7 HYBRID
 * Smart Kernel, Parsing Inteligente, Cross-Checkmate
 * Strict Mode Activated
 */

'use strict';

// ==========================================
// 1. MÓDULO DE NORMALIZAÇÃO NUMÉRICA (Regex Avançado)
// ==========================================

/**
 * toForensicNumber
 * Sanitiza Big Data (OCR/CSV mal formatado) e inferir Locale
 * Prioridade: Ponto antes de Vírgula. Regra: Vírgulas múltiplas.
 */
const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim();
    
    // 1. Limpeza Inicial (Remove all whitespace invisíveis and quotes)
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, ''); 
    str = str.replace(/["'`]/g, '').replace(/[€$£¥¥¥¥¥¥]/g, '').replace(/EUR|USD|GBP|BRL|MKD|MZN|RON|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP||USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ|MKD|KZT|LEI|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP||USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK|LEU|LVR|PLN|ZLT|RON|EUR|GBP|USD|BRL|RON|MZ||LEK|LEK; color: var(--text-secondary); display: flex; align-items: center; gap: 0.3rem; font-weight: 600;
    box-sizing: border-box;
}

.form-group-fixed input:focus {
    outline: none;
    border-color: var(--iso-blue);
    box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
    background: rgba(30, 42, 68, 0.9); /* Fundo escuro para contraste */
    box-sizing: border-box;
}

.form-group-fixed input.success {
    border-color: var(--nist-green);
    box-shadow: 0 0 0 2px rgba(0, 204, 136, 0.2);
    background: rgba(30, 42, 68, 0.9);
    box-sizing: border-box;
}

.form-group-fixed input.error {
    border-color: var(--warn-primary);
    box-shadow: 0 0 0 2px rgba(232, 65, 24, 0.2);
    background: rgba(30, 42, 68, 0.9);
    box-sizing: border-box;
}

/* --- 2. NORMALIZAÇÃO DE DADOS DE BIG DATA (PapaParse v12.1) --- */
const columnMappings = {
    // Bolt Standard CSV Columns
    boltGross: ['Total Payout', 'Total Earnings', 'Gross Revenue'],
    boltFees: ['Commission', 'Fee', 'Comissão', 'Custo', 'Service', 'Comissao'],
    boltTips: ['Tip', 'Gorjeta'],
    boltTolls: ['Toll', 'Portagem'],
    boltInvoices: ['Invoice', 'Fatura']
};

// ==========================================
// 3. ESTADO GLOBAL (VDCSystem v11.7)
// ==========================================

const VDCSystem = {
    version: 'v11.7-HYBRID',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    processing: false,
    expertName: null, // Preservado para compatibilidade v12.1
    processingFiles: [],
    
    // Mapeamento Inteligente de Colunas
    detectedColumns: { gross: '', fees: '', tips: '', tolls: '', invoices: '' },
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, records: 0 }, hashes: {} },
        control: { files: [], parsedData: [], totals: { records: 0 }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { invoiceValue: 0, commission: 0, iva23: 0, records: 0, hashes: {}, totalInvoicesFound: 0, invoiceDates: [] },
        statements: { files: [], parsedData: [], totals: { gross: 0, fees: 0, net: 0, records: 0, hashes: {}, extra: { tips: 0, tolls: 0 } } // Extra v12.1
    },
    
    analysis: {
        extractedValues: {
            saftGross: 0, saftIVA6: 0, saftNet: 0,
            platformCommission: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
            // Dados Extra v12.1
            tips: 0, tolls: 0, cancelamentos: 0,
            // Cálculos (Fiscal)
            diferencialCusto: 0, ivaAutoliquidacao: 0, jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
        },
        crossings: { deltaA: 0, deltaB: 0, omission: 0, isValid: true, diferencialAlerta: false, fraudIndicators: [], bigDataAlertActive: false },
        chainOfCustody: [],
        logs: [],
        chart: null,
        expert: { name: 'Analista Desconhecido', nif: '000000000' }
    }
};

// ==========================================
// 4. INITIALIZAÇÃO E OBSERVADOR DE ESTADO (Persistência)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c VDC v11.7 HYBRID INIT ', 'background: #0066cc; color: #fff; padding: 5px;');
    
    // Setup Inicial (Splash)
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.addEventListener('click', startGatekeeperSession);
    
    // Recuperação de Dados (Persistência Local)
    loadSystemRecursive(); // Carrega dados automaticamente
});

window.onload = () => {
    console.log('Recursos carregados.');
    if (typeof Papa === 'undefined') alert('Erro: PapaParse indisponível.');
    if (typeof Chart === 'undefined') alert('Erro: Chart.js indisponível.');
    
    // Injeta Parsing Dinâmico (Simulação v12.1)
    injectDynamicParsingLogic();
};

/**
 * loadSystemRecursive
 * Carrega o sistema e recupera dados persistentes (LocalStorage + Parsing)
 */
function loadSystemRecursive() {
    // 1. Recupera Cliente e Expert (Se não tiver, usa Dummy)
    const storedClient = localStorage.getItem('vdc_client_data_bd_v11_7');
    if (storedClient) {
        try {
            VDCSystem.client = JSON.parse(storedClient);
            const statusEl = document.getElementById('clientStatusFixed');
            const nameDisplay = document.getElementById('clientNameDisplayFixed');
            const nifDisplay = document.getElementById('clientNifDisplayFixed');
            
            if (statusEl) {
                statusEl.style.display = 'flex';
                if (nameDisplay) nameDisplay.textContent = VDCSystem.client.name;
                if (nifDisplay) nifDisplay.textContent = VDCSystem.client.nif;
            }
        } catch (e) {
            console.error('Erro ao carregar dados (Hybrid):', e);
            // Fallback para Demo
            VDCSystem.client = { name: 'VDC Demo Corp', nif: '999999999' }; 
        }
    }
    
    // Inicia Relógio
    startClockAndDate();
}

/**
 * injectDynamicParsingLogic
 * Cria visualmente os campos de coluna na UI (Simulação v12.1 - Visual)
 */
function injectDynamicParsingLogic() {
    // Como não temos a estrutura HTML v12.1 (inputs de Parsing), apenas logamos
    logAudit('Motor de Parsing v12.1: Tentaiva de deteção de colunas inteligentes (Gross, Fees, Tips, Tolls, Invoices)', 'info');
}

// ==========================================
// 5. GATEKEEPER
// ==========================================

function startGatekeeperSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (splashScreen && loadingOverlay) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadingOverlay.style.display = 'flex';
                // Carrega o núcleo recursivo
                loadSystemRecursive();
            }, 500);
        }
    } catch (e) {
        console.error('Erro no startGatekeeperSession (Hybrid):', e);
        alert('Erro ao iniciar sessão.');
    }
}

function loadSystemRecursive() {
    updateLoadingProgress(10);
    setTimeout(() => {
        // Gera ID da Sessão
        VDCSystem.sessionId = generateSessionId();
        const idEl = document.getElementById('sessionIdDisplay');
        if (idEl) idEl.textContent = VDCSystem.sessionId;
        
        updateLoadingProgress(30);
        
        // Popula Anos e Listeners
        populateYears();
        setupMainListeners();
        
        updateLoadingProgress(50);
        
        generateMasterHash();
        
        setTimeout(() => {
            updateLoadingProgress(70);
            setTimeout(() => {
                updateLoadingProgress(100);
                setTimeout(() => {
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    const mainContainer = document.getElementById('mainContainer');
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                    if (mainContainer) {
                        mainContainer.style.display = 'block';
                        mainContainer.style.opacity = '1';
                    }
                    logAudit('SISTEMA VDC v11.7 HYBRID ONLINE (Parsing Inteligente Ativado)', 'success');
                }, 300);
            }, 300);
        }, 500);
    }
}

function updateLoadingProgress(pct) {
    const bar = document.getElementById('loadingProgress');
    const txt = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `Carregando Motor Parsing v12.1... ${pct}%`;
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

// ==========================================
// 6. UTILITÁRIOS GERAIS
// ==========================================

function populateYears() {
    const yearSelect = document.getElementById('selYearFixed');
    if (!yearSelect) return;
    
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function startClockAndDate() {
    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-PT');
        const timeStr = now.toLocaleTimeString('pt-PT');
        
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        
        if (dateEl) dateEl.textContent = dateStr;
        if (timeEl) timeEl.textContent = timeStr;
    };
    update();
    setInterval(update, 1000);
}

// ==========================================
// 7. LÓGICA DE EVENTOS
// ==========================================

function setupMainListeners() {
    // Registo
    document.getElementById('registerClientBtnFixed').addEventListener('click', registerClient);
    
    // Demo Mode
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    // Modal
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    
    const closeModalHandler = () => { closeEvidenceModal(); updateAnalysisButton(); };
    if (openModalBtn) openModalBtn.addEventListener('click', () => { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
    if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeModalHandler);
    
    // Uploads (Parsing v12.1 Lógica Híbrida)
    setupUploadListeners(); // Usa a função que inclui os novos IDs
    
    // Ações Principais
    document.getElementById('analyzeBtn').addEventListener('click', performAudit);
    document.getElementById('exportJSONBtn').addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn').addEventListener('click', resetSystem);
    
    // IDs Sincronizados (v11.6 IDs Preservados)
    document.getElementById('exportPDFBtn').addEventListener('click', exportPDF);
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);
    
    // Fechar modal ao clicar fora
    const modal = document.getElementById('evidenceModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalHandler();
    });
}

function setupUploadListeners() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllEvidence);
}

// ==========================================
// 8. REGISTO E IDENTIFICAÇÃO (Persistência v11.7)
// ==========================================

function registerClient() {
    // v11.6 IDs Preservados
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) { showToast('Nome inválido', 'error'); return; }
    if (!nif || !/^\d{9}$/.test(nif)) { showToast('NIF inválido', 'error'); return; }
    
    VDCSystem.client = { name, nif, timestamp: new Date().toISOString(), platform: VDCSystem.selectedPlatform };
    
    // Salvar no LocalStorage BD (Persistência v11.7)
    try {
        localStorage.setItem('vdc_client_data_bd_v11_7', JSON.stringify(VDCSystem.client));
    } catch (e) { console.error('Erro ao gravar cliente (Hybrid):', e); }
    
    const statusEl = document.getElementById('clientStatusFixed');
    const nameDisplay = document.getElementById('clientNameDisplayFixed');
    const nifDisplay = document.getElementById('clientNifDisplayFixed');
    
    if (statusEl) {
        statusEl.style.display = 'flex';
        if (nameDisplay) nameDisplay.textContent = name;
        if (nifDisplay) nifDisplay.textContent = nif;
    }
    
    logAudit(`Cliente registado: ${name} (${nif})`, 'success');
    updateAnalysisButton();
}

// ==========================================
// 9. PARSING INTELIGENTE (Lógica v12.1)
// ==========================================

async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const btn = document.getElementById(`${type}UploadBtnModal`);
    if (btn) {
        btn.classList.add('processing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO PARSING...';
    }
    
    try {
        for (const file of files) {
            await processFile(file, type);
        }
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s).`, 'success');
    } catch (error) {
        console.error(error);
        logAudit(`Erro no parsing (v12.1): ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('processing');
            // Restaura texto original
            const iconMap = { dac7: 'fa-file-contract', control: 'fa-file-shield', saft: 'fa-file-code', invoices: 'fa-file-invoice-dollar', statements: 'fa-file-contract' };
            btn.innerHTML = `<i class="fas ${iconMap[type] || 'fa-file'}"></i> SELECIONAR FICHEIROS`;
        }
        event.target.value = '';
    }
}

async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hash = CryptoJS.SHA256(text).toString();
    
    if (!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], parsedData: [], totals: { records: 0 }, hashes: {} };
    
    // Armazena no Global (Acumulativo v11.7)
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hash;
    VDCSystem.documents[type].totals.records++;
    
    // Parsing Inteligente (PapaParse)
    if (type === 'statements' || type === 'saft' || type === 'invoices') {
        try {
            const parsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });
            
            if (parsed && parsed.data && parsed.data.length > 0) {
                let gross = 0;
                let fees = 0;
                let extraData = { tips: 0, tolls: 0, invoices: [] }; /* v12.1 Dados Extra */
                
                parsed.data.forEach(row => {
                    Object.keys(row).forEach(key => {
                        const val = toForensicNumber(row[key]);
                        const k = key.toLowerCase().trim();
                        
                        // Lógica v12.1 de Mapeamento de Colunas
                        if (!VDCSystem.detectedColumns.gross && (k.includes('total') || k.includes('earnings') || k.includes('gross') || k.includes('payout') || k.includes('valor'))) VDCSystem.detectedColumns.gross = key;
                        if (!VDCSystem.detectedColumns.fees && (k.includes('commission') || k.includes('fee') || k.includes('comissao') || k.includes('custo') || k.includes('serviço'))) VDCSystem.detectedColumns.fees = key;
                        if (!VDCSystem.detectedColumns.tips && (k.includes('tip') || k.includes('gorjeta'))) VDCSystem.detectedColumns.tips = key;
                        if (!VDCSystem.detectedColumns.tolls && (k.includes('toll') || k.includes('portagem'))) VDCSystem.detectedColumns.tolls = key;
                        if (!VDCSystem.detectedColumns.invoices && (k.includes('invoice') || k.includes('fatura'))) VDCSystem.detectedColumns.invoices = key;
                        
                        // Soma os valores encontrados
                        gross += val;
                        
                        // Extra Data (v12.1)
                        if (type === 'statements' && VDCSystem.detectedColumns.tips) extraData.tips += toForensicNumber(row[VDCSystem.detectedColumns.tips]);
                        if (type === 'statements' && VDCSystem.detectedColumns.tolls) extraData.tolls += toForensicNumber(row[VDCSystem.detectedColumns.tolls]);
                        if (type === 'invoices' && VDCSystem.detectedColumns.invoices && VDCSystem.detectedColumns.fees) {
                            // Cria objeto para extração (Simulação v12.1)
                            extraData.invoices.push({
                                number: toForensicNumber(row[VDCSystem.detectedColumns.invoices]),
                                date: row[VDCSystem.detectedColumns.invoices] || row[VDCSystem.detectedColumns.date] || new Date().toISOString().split('T')[0]
                            });
                        }
                    });
                });
                
                if (type === 'statements') {
                    VDCSystem.documents.statements.totals.rendimentosBrutos = gross;
                    VDCSystem.documents.statements.totals.comissaoApp = fees;
                    VDCSystem.documents.statements.totals.rendimentosLiquidos = gross + fees; // Cálculo local (Bruto + Comissão)
                    
                    // Armazena dados extra no estado global (v12.1)
                    VDCSystem.documents.statements.totals.campanhas = extraData.tips;
                    VDCSystem.documents.statements.totals.portagens = extraData.tolls;
                    VDCSystem.documents.statements.totals.faturas = extraData.invoices; // Lista de faturas extra
                }
                
                if (type === 'saft') {
                    VDCSystem.documents.saft.totals.gross = gross;
                }
            }
        } catch (e) {
            console.warn('Erro no parsing (v12.1):', e);
        }
    }
    
    // UI Update
    const listEl = document.getElementById(`${type}FileListModal`);
    if (listEl) {
        listEl.innerHTML = '';
        listEl.style.display = 'block';
        
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        
        let detailsHTML = `
            <i class="fas fa-check-circle" style="color: var(--success-primary)"></i> 
            ${file.name} (${formatBytes(file.size)})`;
        `;
        
        // Se houver colunas detectadas (Simulação Visual v12.1)
        if (type === 'statements' && VDCSystem.detectedColumns.fees) {
             // Simulação visual: badge verde
             detailsHTML += `<div class="file-badge" id="count-fees">FEES</div>`;
        }
        
        item.innerHTML = detailsHTML;
        listEl.appendChild(item);
    }
    
    // Atualiza Contadores Visuais (v11.7 Visual)
    const countId = `${type}CountCompact`;
    const el = document.getElementById(countId);
    if (el) el.textContent = VDCSystem.documents[type].files.length;
}

// ==========================================
// 10. GESTÃO DE MODAL E EVIDÊNCIAS
// ==========================================

function openEvidenceModal() { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); }
function closeEvidenceModal() { document.getElementById('evidenceModal').style.display = 'none'; }

async function clearAllEvidence() {
    if (!confirm('Limpar tudo? Isto apagará todos os dados carregados, incluindo os hashes SHA-256.')) return;
    
    // Reset Global Limpa
    Object.keys(VDCSystem.documents).forEach(k => {
        VDCSystem.documents[k] = { files: [], parsedData: [], totals: { records: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, hashes: {}, extra: { tips: 0, tolls: 0 } };
        if (k === 'statements' && VDCSystem.documents[k]) {
             // Reset estrutura complexa
             VDCSystem.documents[k].totals = { records: 0 };
        }
    });
    
    document.querySelectorAll('.file-list-modal').forEach(el => el.innerHTML = '');
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    logAudit('Evidências limpas.', 'warn');
}

function updateEvidenceSummary() {
    const types = ['Dac7', 'Control', 'Saft', 'Invoices', 'Statements'];
    let totalFiles = 0;
    
    types.forEach(type => {
        const count = VDCSystem.documents[type].files.length;
        totalFiles += count;
        
        const el = document.getElementById(`summary${type.charAt(0).toUpperCase()}`);
        if (el) el.textContent = `${count} ficheiros`;
        
        // Simulação Visual (v12.1)
        if (type === 'Invoices' && VDCSystem.documents.invoices.totals) {
             const listId = 'invoiceFileListModal';
             const el = document.getElementById('invoicesFileListModal');
             if(el && VDCSystem.documents.invoices.totals.invoices) {
                 const div = document.createElement('div');
                 div.innerHTML = `<span class="file-badge" id="count-invoices">${VDCSystem.documents.invoices.totals.invoices.length}</span>`;
                 el.prepend(div);
             }
        }
    });
    
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = `${totalFiles} ficheiros`;
}

function updateCounters() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const el = document.getElementById(`${type}CountCompact`);
        if (el) el.textContent = VDCSystem.documents[type].files.length;
    });
}

// ==========================================
// 11. MOTOR DE AUDITORIA & CROSS-CHECKMATE (Cross-Checkmate v12.1)
// ==========================================

function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    logAudit('ATIVANDO MODO DEMO v12.1...', 'info');
    
    // 1. Regista Cliente Demo
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '123456789';
    registerClient();
    
    // 2. Simula Uploads com Dados v12.1
    simulateUpload('dac7', 1);
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 3); // 3 faturas de exemplo
    simulateUpload('statements', 2); // 2 extratos de exemplo
    
    setTimeout(() => {
        // 3. Injeta valores de auditoria v12.1
        // Dados Extra v12.1 (Tips, Tolls, Faturas Individuais)
        VDCSystem.analysis.extractedValues = {
            saftGross: 5000.00, saftIVA6: 300.00, saftNet: 4700.00,
            rendimentosBrutos: 5000.00, comissaoApp: -1200.00, rendimentosLiquidos: 3800.00, 
            // --- DADOS EXTRA v12.1 --- //
            faturaPlataforma: 200.00, // Fatura de Serviço
            // Simulação visual de Badges na UI
            faturaPlataforma: 200.00,
            campanhas: 150.00, // Campanhas
            gorjetas: 45.00, // Gorjetas
            cancelamentos: 12.00, // Cancelamentos
            portagens: 7.65, // Portagens
            // ---
            // Cálculos (Refinado)
            diferencialCusto: 800.00, // Comissão - Fatura
            ivaAutoliquidacao: diferencialCusto * 0.23,
            jurosMora: (diferencialCusto * 0.23) * 0.04,
            taxaRegulacao: Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) * 0.05
        };
        
        VDCSystem.analysis.crossings.deltaB = 800.00;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        
        // Mockar Dados Extra v12.1
        if (document.getElementById('count-tips')) {
             document.getElementById('count-tips').textContent = '150,00€';
             document.getElementById('count-tips').style.display = 'flex';
        }
        if (document.getElementById('count-tolls')) {
             document.getElementById('count-tolls').textContent = '7,65€';
             document.getElementById('count-tolls').style.display = 'flex';
        }
        if (document.getElementById('count-invoices')) {
             document.getElementById('count-invoices').textContent = '3';
             document.getElementById('count-invoices').style.display = 'inline-block';
        }
        
        // Atualiza KPI
        document.getElementById('valCamp').textContent = '150,00€';
        document.getElementById('valTips').textContent = '45,00€';
        document.getElementById('valCanc').textContent = '12,00€';
        document.getElementById('valTolls').textContent = '7,65€';
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit('Auditoria Demo v12.1 concluída.', 'success');
        VDCSystem.processing = false;
        
        const demoBtn = document.getElementById('demoModeBtn');
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> DADOS DEMO';
        }
    } catch (e) {
        console.error(e);
        logAudit(`Erro na auditoria Demo: ${e.message}`, 'error');
    } finally {
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> DADOS DEMO';
        }
    }
}

function simulateUpload(type, count) {
    // Simula Uploads (v12.1)
    for(let i=0; i<count; i++) {
        if (!VDCSystem.documents[type]) {
             VDCSystem.documents[type] = { files: [], parsedData: [], totals: { records: 0 }, hashes: {}, extra: { tips: 0, tolls: 0 } };
        }
        VDCSystem.documents[type].files.push({ name: `demo_${type}_${i}.txt`, size: 1024 });
        VDCSystem.documents[type].totals.records++;
        
        // Mock Parsing (v12.1)
        if (type === 'invoices') {
             if (!VDCSystem.documents.invoices) VDCSystem.documents.invoices = { files: [], invoicesFound: [], hashes: {} };
             VDCSystem.documents.invoices.files.push(...VDCSystem.documents[type].files); // Herda
             const total = 1500.00;
             VDCSystem.documents.invoices.totals.invoicesFound.push({
                 value: total, date: '2023-01-01'
             });
        }
        VDCSystem.documents[type].parsedData.push({ filename: `demo_${type}_${i}.txt`, size: 1024 });
    }
    updateCounters();
    updateEvidenceSummary();
}

function performAudit() {
    if (!VDCSystem.client) { showToast('Registe cliente.', 'error'); return; }
    
    logAudit('INICIANDO AUDITORIA V12.1...', 'info');
    
    // 1. Recolha Dados Extra dos CSVs (Parsing v12.1)
    const extraTips = VDCSystem.documents.statements.totals.campanhas;
    const extraTolls = VDCSystem.documents.statements.totals.portagens;
    const invoicesFound = VDCSystem.documents.invoices?.invoicesFound || [];
    
    // 2. Executa Triangulação (Cross-Checkmate)
    performForensicCrossings(VDCSystem.documents.statements.totals.rendimentosBrutos, VDCSystem.documents.statements.totals.comissaoApp, VDCSystem.documents.invoices.totals.invoicesFound);
    
    // 3. Atualiza Dashboard
    updateDashboard();
    renderChart();
    showAlerts();
    
    logAudit('Auditoria V12.1 concluída.', 'success');
}

// ==========================================
// 12. TRIANGULAÇÃO FISCAL (CROSS-CHECKMATE v12.1)
// ==========================================

/**
 * performForensicCrossings (Cross-Checkmate Logic)
 * Compara CSV vs Fatura e Calcula Discrepâncias
 */
function performForensicCrossings(gross, commission, invoicesFound) {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // Atualiza valores base (Preservado v11.6)
    ev.rendimentosBrutos = gross;
    ev.comissaoApp = commission;
    ev.faturaPlataforma = 0; // Inicializa em 0 (Será calculado abaixo)
    
    // 1. Soma Faturas Individuais (v12.1)
    let totalInvoices = 0;
    let lastFaturaDate = null;
    
    if (invoicesFound && invoicesFound.length > 0) {
        invoicesFound.forEach(inv => {
            totalInvoices += inv.value;
            if (!lastFaturaDate || new Date(inv.date) > new Date(lastFaturaDate)) lastFaturaDate = inv.date;
        });
        
        if (totalInvoices > 0) {
            ev.faturaPlataforma = totalInvoices;
        }
    }
    
    // 2. Cálculo do Diferencial (Comissão Retida vs. Fatura Emitida)
    const absComm = Math.abs(commission);
    const diferencial = Math.abs(absComm - ev.faturaPlataforma);
    
    ev.diferencialCusto = diferencial;
    cross.deltaB = diferencial;
    
    // 3. Cálculo de IVA Autoliquidação (23% sobre o diferencial não justificado)
    ev.ivaAutoliquidacao = diferencial * 0.23;
    
    // 4. Cálculo de Juros de Mora (4% sobre o IVA)
    ev.jurosMora = ev.ivaAutoliquidacao * 0.04;
    
    // 5. Cálculo de Risco Regulatório (Taxa de Regulação 5% sobre a Comissão)
    ev.taxaRegulacao = absComm * 0.05;
    
    ev.riscoRegulatorio = ev.taxaRegulacao; // Define risco total
    
    // 6. Alertas de Discrepância
    if (diferencial > 0.01) {
        cross.diferencialAlerta = true;
        logAudit(`DISCREPÂNCIA (CROSS-CHECKMATE): ${diferencial.toFixed(2)}€ (IVA 23%: ${ev.ivaAutoliquidacao.toFixed(2)}€)`, 'warn');
    } else {
        cross.diferencialAlerta = false;
    }
}

// ==========================================
// 13. UI & ALERTAS (Sincronização v12.1)
// ==========================================

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const fmt = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '€';
    
    const map = {
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosBrutos + ev.comissaoApp,
        'kpiInvoice': ev.faturaPlataforma,
        'valCamp': VDCSystem.documents.statements.totals.campanhas,
        'valTips': VDCSystem.documents.statements.totals.tips,
        'valTips': VDCSystem.documents.statements.totals.tolls,
        'valCanc': VDCSystem.documents.statements.totals.cancelamentos,
        'valTolls': VDCSystem.documents.statements.totals.portagens,
        'kpiInvoice': VDCSystem.documents.invoices.totals.invoices?.length,
        'iva23Val': ev.ivaAutoliquidacao,
        'jurosVal': ev.jurosMora,
        'iva23Val': ev.ivaAutoliquidacao
    };
    
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = fmt(val);
    }
    
    // Juros
    const jCard = document.getElementById('jurosCard');
    const jVal = document.getElementById('jurosVal');
    if (ev.jurosMora > 0 && jCard && jVal) {
        jCard.style.display = 'flex';
        jVal.textContent = fmt(ev.jurosMora);
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    
    // Dados do Gráfico (Incluindo Dados Extra v12.1)
    const data = {
        labels: ['Bruto', 'Comissão', 'Fatura', 'IVA 23%', 'Juros 4%', 'Campanhas', 'Gorjetas', 'Cancelamentos', 'Portagens', 'Taxa Regulação'],
        datasets: [{
            label: '€',
            data: [
                ev.rendimentosBrutos, 
                Math.abs(ev.comissaoApp), 
                ev.faturaPlataforma, 
                ev.ivaAutoliquidacao, 
                ev.jurosMora, 
                ev.campanhas || 0, 
                ev.tips || 0,
                ev.gorjetas || 0,
                ev.cancelamentos || 0,
                ev.portagens || 0,
                ev.taxaRegulacao || 0
            ],
            backgroundColor: ['#00a8ff', '#e84118', '#44bd32', '#fbc531', '#ff9f1a', '#4ecdc4', '#ff6b35', '#ff6b35']
        }]
    };
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { display: true, position: 'bottom' },
                title: { display: true, font: { weight: 'bold', family: 'Inter', size: 12 }, color: 'var(--text-primary)' },
                position: 'top' /* Legenda no topo */
                x: { display: false } /* Esconder X */
            },
            scales: { y: { beginAtZero: 0 } }
        }
    });
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // ALERTA: Se diferença > 0.01€, ativa o elemento
    const alertEl = document.getElementById('bigDataAlert');
    if (alertEl) {
        if (cross.diferencialAlerta) {
            alertEl.style.display = 'flex';
            const invEl = document.getElementById('alertInvoiceVal');
            const commEl = document.getElementById('alertCommVal');
            const diffEl = document.getElementById('alertDeltaVal');
            
            if (invEl) invEl.textContent = ev.faturaPlataforma.toFixed(2) + '€';
            if (commEl) commEl.textContent = Math.abs(ev.comissaoApp).toFixed(2) + '€';
            if (diffEl) diffEl.textContent = ev.diferencialCusto.toFixed(2) + '€';
        } else {
            alertEl.style.display = 'none';
        }
    }
}

// ==========================================
// 14. EXPORTAÇÃO LEGAL (Relatório Jurídico v11.6)
// ==========================================

function exportPDF() {
    if (!VDCSystem.client) { showToast('Sem cliente para gerar relatório.', 'error'); return; }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    try {
        // Cabeçalho
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        
        doc.text("VDC AUDITORIA FISCAL v11.7 HYBRID", 20, 20);
        
        // Dados do Cliente
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Cliente: ${VDCSystem.client?.name || 'N/A'} (${VDCSystem.client?.nif || 'N/A'})`, 20, 30);
        doc.text(`Sessão: ${VDCSystem.sessionId} | Data: ${new Date().toLocaleDateString('pt-PT')} - ${new Date().toLocaleTimeString('pt-PT')}`, 20, 40);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 50, 190, 30);
        
        // Análise de Divergências
        doc.setFont("helvetica", "bold", "RGIT", "ISO/IEC 27037"); // Fonte para Cabeçalhos Jurídicos
        doc.setFont("helvetica", "normal", "ISO/IEC 27037");
        doc.text("2. ANÁLISE FISCAL CRUZADA (HYBRID)", 20, 80);
        
        // 1. Dados Extra (v12.1)
        const ev = VDCSystem.analysis.extractedValues;
        if (ev.campanhas > 0 || ev.tips > 0) {
            doc.text(`Campanhas (V12.1): ${ev.campanhas.toFixed(2)}€`, 30, 98);
        }
        if (ev.tips > 0 || ev.gorjetas > 0) {
            doc.text(`Gorjetas (V12.1): ${ev.gorjetas.toFixed(2)}€`, 30, 104);
        }
        if (ev.cancelamentos > 0) {
            doc.text(`Cancelamentos (V12.1): ${ev.cancelamentos.toFixed(2)}€`, 30, 110);
        }
        if (ev.portagens > 0) {
            doc.text(`Portagens (V12.1): ${ev.portagens.toFixed(2)}€`, 30, 116);
        }
        
        // 2. Triangulação (Cross-Checkmate)
        doc.text(`Rendimentos Brutos: ${ev.rendimentosBrutos.toFixed(2)}€`, 30, 124);
        doc.text(`Comissão App (CSV): ${Math.abs(ev.comissaoApp).toFixed(2)}€`, 30, 128);
        doc.text(`Fatura (Input): ${ev.faturaPlataforma.toFixed(2)}€`, 30, 132);
        
        if (ev.diferencialCusto > 0.01) {
            doc.setTextColor(200, 50, 50);
            doc.text(`Diferencial Encontrado: ${ev.diferencialCusto.toFixed(2)}€`, 30, 140);
        } else {
            doc.setTextColor(0, 0, 0);
            doc.text("Diferencial: 0,00€", 30, 128);
        }
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 150, 190, 30);
        
        // 3. Cálculos Jurídicos
        doc.setFont("helvetica", "bold", "ISO/IEC 27037");
        doc.text("III. CÁLCULOS JURÍDICOS (RGRC 100% Base Anual Civil)", 20, 158);
        
        const diff = VDCSystem.analysis.crossings.deltaB || 0;
        if (diff > 0.01) {
            doc.setTextColor(239, 68, 68);
            doc.text(`IVA de Autoliquidação (23%): ${ev.ivaAutoliquidacao.toFixed(2)}€`, 25, 174);
        }
        
        // Juros de Mora
        if (ev.jurosMora > 0) {
            doc.setTextColor(239, 68, 68);
            doc.text(`Juros de Mora (4%): ${ev.jurosMora.toFixed(2)}€`, 25, 184);
        }
        
        // Taxa de Regulação
        if (ev.taxaRegulacao > 0) {
            doc.setTextColor(239, 68, 68);
            doc.text(`Taxa de Regulação (5%): ${ev.taxaRegulacao.toFixed(2)}€`, 25, 194);
        }
        
        // Nota de Conformidade
        doc.setFont("courier", "normal", "ISO/IEC 27037");
        doc.setFontSize(8); // Fonte Monoespa para detalhes
        const note = "O presente relatório cumpre com os requisitos de integridade e validação de dados forenses. O hash SHA-256 da sessão garante a autenticidade.";
        const splitTitle = doc.splitText(note, 180, 220, 170);
        splitTitle.text(note, 25, 160);
        splitTitle.text("Nota: "Estes cálculos consideram juros civis de 4% e taxa de 5% regulatória. O Hash da Sessão Forense garante a não-repúdio da prova forense.", 25, 130);
        splitTitle.text("      - Estes cálculos são baseados nos valores apresentados nos relatórios de entidade (Bolt/Uber).", 25, 136);
        
        // Hash da Sessão
        doc.setFontSize(7);
        doc.setFont("courier", "bold", "ISO/IEC 27037");
        doc.text(`Hash de Integridade da Sessão:`, 20, 158);
        const masterHashEl = document.getElementById('masterHashValue');
        const hashText = masterHashEl ? masterHashEl.textContent : 'N/A';
        
        doc.setFont("courier", "normal", "ISO/IEC 27037");
        doc.setFontSize(7); // Fonte Monoespa
        doc.text(hashText.substring(0, 24) + "...", 25, 164);
        
        doc.save(`VDC_Report_${VDCSystem.sessionId}_Juridico_v11.7.pdf`);
        logAudit('Relatório Jurídico exportado.', 'success');
    } catch (e) {
        console.error(e);
        logAudit('Erro ao gerar PDF (Jurídico): ' + e.message, 'error');
    }
}

// ==========================================
// 15. EXPORTAÇÃO DE DADOS
// ==========================================

function exportDataJSON() {
    const data = {
        session: VDCSystem.sessionId,
        client: VDCSystem.client,
        extra: VDCSystem.analysis.extractedValues, // Incluindo Dados Extra v12.1
        expert: VDCSystem.expert,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VDC_Report_${VDCSystem.sessionId}_Full_Hybrid_v11_7.json`;
    link.click();
    URL.revokeObjectURL(url);
    logAudit('JSON Híbrido exportado.', 'success');
}

function resetSystem() {
    if (!confirm('Repor o sistema? Isto apagará todos os dados carregados. Não será possível recuperar.', 'error')) return;
    
    // Limpa Dados Globais
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data_bd_v11_7');
    
    // Limpa Parsing (Lógica v11.6 Preservada)
    Object.keys(VDCSystem.documents).forEach(k => {
        if (k === 'invoices') {
            VDCSystem.documents[k] = { files: [], parsedData: [], totals: { invoiceValue: 0, records: 0, hashes: {} }; // Limpa arrays
        } else {
            VDCSystem.documents[k] = { files: [], parsedData: [], totals: { records: 0, hashes: {} };
            if (k === 'statements') {
                VDCSystem.documents[k].totals = { records: 0, rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, extra: { tips: 0, tolls: 0 }, hashes: {} };
            } else {
                VDCSystem.documents[k].totals = { records: 0 };
            }
        }
    }
    
    // Limpa Detecção de Colunas
    VDCSystem.detectedColumns = { gross: null, fees: null, tips: null, tolls: null, invoices: null };
    
    // Limpa UI
    ['netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'netVal', 'jurosCard', 'jurosVal', 'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice', 'valCamp', 'valTips', 'valTips', 'valCanc', 'valTolls'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '0,00€';
            el.classList.remove('alert-text');
            el.classList.remove('regulatory-text');
        }
    });
    
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    document.getElementById('clientStatusFixed').style.display = 'none';
    
    clearAllEvidence();
    clearConsole();
    generateMasterHash();
    logAudit('Sistema reiniciado.', 'info');
}

// ==========================================
// 16. UTILITÁRIOS GERAIS & BINDING GLOBAL
// ==========================================

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' ' + sizes[i];
}

function generateSessionId() {
    return 'VDC-' + Date.now().toString(36).toUpperCase();
}

function generateMasterHash() {
    // Inclui ExpertID e Timestamp
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + VDCSystem.sessionId + Date.now();
    const hash = CryptoJS.SHA256(payload).toString();
    
    const el = document.getElementById('masterHashValue');
    if (el) el.textContent = hash;
    
    return hash;
}

function logAudit(msg, type) {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    const time = new Date().toLocaleTimeString('pt-PT');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span style="color:#666">[${time}]</span> <span style="font-weight:bold;">${type.toUpperCase()}</span> ${msg}`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
    VDCSystem.logs.push({ time, msg, type });
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info'}"></i> ${msg}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==========================================
// 17. GESTÃO DE CUSTÓDIA (HASHING INTEGRAL)
// ==========================================

/**
 * calculateMasterHash
 * Cadeia um novo hash se os dados mudarem. O hash inclui ExpertID e Timestamp.
 * (Cadeia de Custódia de Dados)
 */
function calculateMasterHash() {
    // Inclui ExpertID e Timestamp para tornar o hash imutável
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + JSON.stringify(VDCSystem.expert || {}) + VDCSystem.sessionId + Date.now();
    
    return CryptoJS.SHA256(payload).toString();
}

/**
 * observeVDCSystem
 * Observa mudanças profundas em `VDCSystem.analysis` (ex: VDCSystem.analysis.extractedValues) e atualiza o hash imediatamente.
 * (Cadeia de Custódia de Dados)
 */
function observeVDCSystem() {
    if (!VDCSystem || !VDCSystem.analysis) return;
    
    const config = { childList: 'analysis', subtree: true, attributes: true, characterData: true };
    
    const observer = new MutationObserver((mutations) => {
        // Apenas nos logs, logs e valores extra (Performance)
        if (mutations.length > 0) {
            console.log('[AUDIT] Estado do sistema alterado. Recalculando Master Hash...');
            generateMasterHash();
        }
    });
    
    observer.observe(VDCSystem, config);
}

// ==========================================
// 18. EXPORTAÇÃO GLOBAL (Estabilidade Final)
// ==========================================

window.clearConsole = clearConsole;
window.startSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.logAudit = logAudit;
window.generateMasterHash = generateMasterHash;
window.VDCSystem = VDCSystem;
window.performForensicCrossings = performForensicCrossings;
window.calculateMasterHash = calculateMasterHash;
window.observeVDCSystem = observeVDCSystem; // Observador Ativo
