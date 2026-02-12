/**
 * VDC SISTEMA DE PERITAGEM FORENSE v11.7 HYBRID
 * Smart Kernel, Persistência de Dados & Parsing de Colunas Múltiplas
 * Strict Mode Activated
 */

'use strict';

// ==========================================
// 1. UTILITÁRIOS & MAPEAMENTO DE MEMÓRIA
// ==========================================

const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim();
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '').replace(/\s+/g, '');
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        if (str.indexOf(',') > str.indexOf('.')) { str = str.replace(/\./g, '').replace(',', '.'); } 
        else { str = str.replace(/,/g, ''); }
    } else if (hasComma && !hasDot) {
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1) { const parts = str.split(','); str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]; } 
        else { str = str.replace(',', '.'); }
    } else if (!hasComma && hasDot) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) { const parts = str.split('.'); str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]; }
    }
    str = str.replace(/[^\d.-]/g, '');
    if (str === '' || str === '-' || str === '.') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
};

// ==========================================
// 2. ESTADO GLOBAL & MAPEAMENTO DE MEMÓRIA (VDCSystem)
// ==========================================

const VDCSystem = {
    version: 'v11.7-HYBRID',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    processing: false,
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, records: 0 }, hashes: {} },
        control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { invoiceValue: 0, commission: 0, records: 0, hashes: {} },
        statements: { files: [], parsedData: [], totals: { rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, records: 0, hashes: {} }
    },
    
    analysis: {
        extractedValues: {
            saftGross: 0, saftIVA6: 0, saftNet: 0,
            platformCommission: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
            diferencialCusto: 0, ivaAutoliquidacao: 0,
            jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
        },
        crossings: { deltaB: 0, diferencialAlerta: false }
    },
    
    logs: [],
    chart: null
};

// ==========================================
// 3. INICIALIZAÇÃO & CARREGAMENTO AUTOMÁTICO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c VDC v11.7 HYBRID INIT ', 'background: #0066cc; color: #fff; padding: 5px;');
    // Atualiza relógio imediatamente
    updateClockAndDate();
    // Recupera dados se não carregar
    startClockAndDate();
    
    // Injeta Parsing Dinâmico no DOM se existir (Simulação de v12.1)
    injectDynamicParsingLogic();
});

window.onload = () => {
    console.log('Recursos carregados.');
    if (typeof Papa === 'undefined') alert('Erro: PapaParse indisponível.');
    if (typeof CryptoJS === 'undefined') alert('Erro: CryptoJS indisponível.');
};

// ==========================================
// 4. PARSING INTELIGENTE V12.1 (Cruzamento de Colunas Múltiplas)
// ==========================================

/**
 * smartParseCSV
 * Detecta automaticamente as colunas corretas (Total, Earnings, Fees, Invoices, Tips, Tolls)
 * Regista colunas detectadas para uso futuro
 */
function smartParseCSV(text, fileName) {
    const config = { header: true, skipEmptyLines: true, dynamicTyping: true };
    let parsed = {};
    
    try {
        parsed = Papa.parse(text, config);
        
        if (!parsed || !parsed.data || parsed.data.length === 0) return { gross: 0, commission: 0, extra: { tips: 0, tolls: 0 }, columns: null };
        
        // Inicializa objeto para dados extra (Tips, Portagens)
        const data = parsed.data;
        let grossRevenue = 0;
        let platformFees = 0;
        let extraData = {
            tips: 0,
            tolls: 0,
            invoices: []
        };
        
        // Detectação de Colunas (Heurística Baseada em keywords comuns)
        const keys = Object.keys(data[0]);
        const colMap = {};
        
        keys.forEach(key => {
            const k = key.toLowerCase().trim();
            if (colMap.gross || colMap.fees || colMap.tips || colMap.tolls || colMap.invoices) return; // Prioridade
            
            if (k.includes('total') || k.includes('earnings') || k.includes('gross') || k.includes('payout')) colMap.gross = key;
            else if (k.includes('commission') || k.includes('fee') || k.includes('comissao') || k.includes('serviço') || k.includes('custo')) colMap.fees = key;
            else if (k.includes('tip') || k.includes('gorjeta')) colMap.tips = key;
            else if (k.includes('toll') || k.includes('portagem')) colMap.tolls = key;
            else if (k.includes('invoice') || k.includes('fatura')) colMap.invoices = key;
        });
        
        // Parsing (Iteração v12.1)
        data.forEach(row => {
            // 1. Gross / Earnings
            if (colMap.gross) grossRevenue += toForensicNumber(row[colMap.gross]);
            
            // 2. Fees / Comissão
            if (colMap.fees) platformFees += Math.abs(toForensicNumber(row[colMap.fees]));
            
            // 3. Extra Data
            if (colMap.tips) extraData.tips += toForensicNumber(row[colMap.tips]);
            if (colMap.tolls) extraData.tolls += toForensicNumber(row[colMap.tolls]);
            if (colMap.invoices && colMap.fees) {
                extraData.invoices.push({
                    number: toForensicNumber(row[colMap.invoices]),
                    date: row[colMap.invoices] || row[colMap.date] || new Date().toISOString().split('T')[0]
                });
            }
        });
        
        return { gross: grossRevenue, commission: platformFees, extra: extraData, columns: colMap };
    } catch (e) {
        console.error('Erro no smartParseCSV:', e);
        return { gross: 0, commission: 0, extra: { tips: 0, tolls: 0 }, columns: null };
    }
    
    // Injetar visualmente (simulação v12.1 - visual)
    function injectDynamicParsingLogic() {
        // Como não temos a estrutura v12.1, apenas logamos a tentativa de parsing
        logAudit('Motor de Parsing v12.1: Tentativa de deteção de colunas inteligentes (Gross, Fees, Tips, Tolls)', 'info');
    }

// ==========================================
// 5. ESTADO GLOBAL (VDCSystem)
// ==========================================

/**
 * Inicialização Recursiva (Carregamento automático)
 */
function loadSystemRecursively() {
    // 1. Recupera Cliente
    try {
        const storedClient = localStorage.getItem('vdc_client_data_bd_v11_7');
        if (storedClient) {
            const client = JSON.parse(storedClient);
            if (client && client.name && client.nif) {
                VDCSystem.client = client;
                const statusEl = document.getElementById('clientStatusFixed');
                const nameDisplay = document.getElementById('clientNameDisplayFixed');
                const nifDisplay = document.getElementById('clientNifDisplayFixed');
                if (statusEl) statusEl.style.display = 'flex';
                if (nameDisplay) nameDisplay.textContent = client.name;
                if (nifDisplay) nifDisplay.textContent = client.nif;
                
                // Preenche inputs
                const nameInput = document.getElementById('clientNameFixed');
                const nifInput = document.getElementById('clientNIFFixed');
                if (nameInput) nameInput.value = client.name;
                if (nifInput) nifInput.value = client.nif;
                
                logAudit(`Cliente recuperado do armazenamento local: ${client.name}`, 'success');
            }
        }
    } catch (e) {
        console.warn('Não foi possível recuperar cliente do armazenamento.', e);
    }
    
    // Atualiza Relógio
    startClockAndDate();
}

// ==========================================
// 6. LÓGICA DE EVENTOS (GATEKEEPER)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c VDC v11.7 HYBRID INIT ', 'background: #0066cc; color: #fff; padding: 5px;');
    setupStaticListeners();
    
    // Carrega Dados Recursivamente ao invés de carregar página
    loadSystemRecursively();
});

function setupStaticListeners() {
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startGatekeeperSession);
    }
}

/**
 * startGatekeeperSession
 * Transição Splash -> Loader -> Core
 */
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
                loadSystemRecursively();
            }, 500);
        }
    } catch (e) {
        console.error('Erro no startGatekeeperSession:', e);
        alert('Erro ao iniciar sessão.');
    }
}

/**
 * loadSystemCore
 * Inicializa módulos e recupera estado
 */
function loadSystemRecursively() {
    updateLoadingProgress(10);
    
    setTimeout(() => {
        // Gera ID da Sessão
        VDCSystem.sessionId = generateSessionId();
        const sessionIdElement = document.getElementById('sessionIdDisplay');
        if (sessionIdElement) sessionIdElement.textContent = VDCSystem.sessionId;
        
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
                    logAudit('SISTEMA VDC v11.7 HYBRID ONLINE (Parsing Inteligente)', 'success');
                }, 300);
            }, 300);
        }, 500);
    }, 500);
}

function updateLoadingProgress(pct) {
    const bar = document.getElementById('loadingProgress');
    const txt = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `Motor de Busca (Parsing v12.1)... ${pct}%`;
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
// 7. UTILITÁRIOS GERAIS
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
        
        // Se estiver em modo Demo ou tiver dados de parsing, tentar extrair datas do parsedData e atualizar a interface
        if (VDCSystem.demoMode && VDCSystem.documents.statements.parsedData && VDCSystem.documents.statements.parsedData.length > 0) {
            const sample = VDCSystem.documents.statements.parsedData[0];
            if (sample && sample.extra && sample.extra.columns) {
                const grossEl = document.getElementById('kpiGanhos');
                const commEl = document.getElementById('kpiComm');
                const netEl = document.getElementById('kpiNet');
                const invoiceEl = document.getElementById('kpiInvoice');
                
                if (grossEl) grossEl.textContent = sample.gross.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (commEl) commEl.textContent = sample.commission.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (netEl) netEl.textContent = sample.net.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (invoiceEl) invoiceEl.textContent = sample.extra.invoices[0]?.number.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                
                const tipsEl = document.getElementById('valTips');
                const tollsEl = document.getElementById('valTolls');
                
                if (tipsEl) tipsEl.textContent = sample.extra.tips.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (tollsEl) tollsEl.textContent = sample.extra.tolls.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
            }
        }
    }
    update();
    setInterval(update, 1000);
}

// ==========================================
// 8. GESTÃO DE CLIENTE (COM PERSISTÊNCIA)
// ==========================================

function setupMainListeners() {
    // Registo
    const registerBtn = document.getElementById('registerClientBtnFixed');
    if (registerBtn) registerBtn.addEventListener('click', registerClient); // Mapeado corretamente no HTML
    
    // Demo Mode
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    // Modal
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    
    const closeModalHandler = () => {
        closeEvidenceModal();
        updateAnalysisButton();
    };
    
    if (openModalBtn) openModalBtn.addEventListener('click', () => { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
    if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeModalHandler);
    
    // Uploads (v11.6 IDs preservados)
    setupUploadListeners();
    
    // Ações Principais
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', performAudit);
    
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportDataJSON);
    
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSystem);
    
    // IDs Sincronizados (Garantia de acesso global)
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
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
// 9. LÓGICA DE CLIENTE (COM PERSISTÊNCIA)
// ==========================================

function registerClient() {
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) { showToast('Nome inválido', 'error'); return; }
    if (!nif || !/^\d{9}$/.test(nif)) { showToast('NIF inválido (9 dígitos)', 'error'); return; }
    
    VDCSystem.client = { name, nif, timestamp: new Date().toISOString() };
    
    // Salvamento imediato no LocalStorage
    try {
        localStorage.setItem('vdc_client_data_bd_v11_7', JSON.stringify(VDCSystem.client));
    } catch (e) { console.error('Erro no gravação do cliente:', e); }
    
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
// 10. GESTÃO DE MODAL E EVIDÊNCIAS (Parsing v12.1)
// ==========================================

function openEvidenceModal() { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); }
function closeEvidenceModal() { document.getElementById('evidenceModal').style.display = 'none'; }

async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const btn = document.getElementById(`${type}UploadBtnModal`);
    if (btn) {
        btn.classList.add('processing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO INTELIGENTE...';
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
        logAudit(`Erro no upload: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('processing');
            // Restaura texto original
            const iconMap = { dac7: 'fa-file-contract', control: 'fa-file-shield', saft: 'fa-file-code', invoices: 'fa-file-invoice-dollar', statements: 'fa-file-contract' };
            const text = { dac7: 'SELECIONAR FICHEIROS DAC7', control: 'SELECIONAR CONTROLO', saft: 'SELECIONAR FICHEIROS SAF-T', invoices: 'SELECIONAR FATURAS', statements: 'SELECIONAR EXTRATOS' };
            btn.innerHTML = `<i class="fas ${iconMap[type] || 'fa-file'}"></i> ${text[type]}`;
        }
        event.target.value = ''; // Limpa input para permitir re-upload
    }
}

/**
 * processFile (Parsing v12.1)
 * Usa smartParseCSV para extrair GROSS, FEES, TIPS, TOLLS e INVOICES
 */
async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hash = CryptoJS.SHA256(text).toString();
    
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { files: [], parsedData: [], totals: { gross: 0, commission: 0, records: 0, extra: { tips: 0, tolls: 0, invoices: [] }, hashes: {} };
    }
    
    // Armazena no objeto global
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hash;
    VDCSystem.documents[type].totals.records++;
    
    // Parsing Inteligente (PapaParse)
    let parsed = { gross: 0, commission: 0, extra: { tips: 0, tolls: 0, invoices: [] } };
    
    if (type === 'statements' || type === 'saft' || type === 'invoices') {
        try {
            parsed = smartParseCSV(text, file.name);
        } catch (e) {
            console.error('Erro no parsing inteligente:', e);
        }
    }
    
    // Atualiza totals globais com dados extra (v12.1)
    if (type === 'statements') {
        VDCSystem.documents.statements.totals.rendimentosBrutos = parsed.gross;
        VDCSystem.documents.statements.totals.comissaoApp = parsed.commission;
        VDCSystem.documents.statements.totals.rendimentosLiquidos = parsed.gross + parsed.commission; // Calculado localmente
        
        // Extrai dados extra para KPI v12.1
        VDCSystem.documents.statements.totals.campanhas = parsed.extra.tips;
        VDCSystem.documents.statements.totals.portagens = parsed.extra.tolls;
        VDCSystem.documents.statements.totals.faturas = parsed.extra.invoices;
    }
    
    // Atualiza UI de lista
    const listId = `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    if (listEl) {
        listEl.innerHTML = '';
        listEl.style.display = 'block';
        
        // Item do ficheiro principal
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        
        let detailsHTML = `
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">${formatBytes(file.size)} ✓</span>
            <span class="file-hash-modal"><i class="fas fa-fingerprint"></i> ${hash.substring(0, 8)}...</span>
        `;
        
        // Adiciona badges visuais (Simulação v12.1 - Verificações)
        if (parsed.extra.columns) {
            if (parsed.extra.tips > 0) detailsHTML += `<div class="file-badge" id="count-tips">${parsed.extra.tips}</div>`;
            if (parsed.extra.tolls > 0) detailsHTML += `<div class="file-badge" id="count-tolls">${parsed.extra.tolls}</div>`;
        }
        
        if (parsed.extra.invoices && parsed.extra.invoices.length > 0) {
            const invoiceCount = parsed.extra.invoices.length;
            detailsHTML += `<div class="file-badge" id="count-invoices">${invoiceCount}</div>`;
        }
        
        item.innerHTML = detailsHTML;
        listEl.appendChild(item);
        
        // Atualiza contadores compactos (v12.1 Visual)
        if (type === 'invoices') {
            document.getElementById('count-invoices').textContent = parsed.extra.invoices.length;
        }
        if (type === 'statements') {
            if (document.getElementById('count-tips')) document.getElementById('count-tips').textContent = parsed.extra.tolls.toFixed(2);
            if (document.getElementById('count-tolls')) document.getElementById('count-tolls').style.display = 'flex';
            
            if (document.getElementById('count-tolls')) document.getElementById('count-tolls').style.display = 'flex';
        }
    }
}

// ==========================================
// 11. MOTOR DE AUDITORIA E CÁLCULOS FISCAIS
// ==========================================

function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) {
        demoBtn.disabled = true;
        demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO DADOS V12.1 INTELIGENTE...';
    }
    
    logAudit('ATIVANDO MODO DEMO V12.1...', 'info');
    
    // Regista Cliente Demo (Recupera do v11.6)
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '123456789';
    registerClient();
    
    // Simula Uploads com dados v12.1
    simulateUpload('dac7', 1);
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 3); // 3 faturas de exemplo
    simulateUpload('statements', 2); // 2 extratos de exemplo
    
    setTimeout(() => {
        // Injeta valores de auditoria v12.1 (incluindo dados extra)
        VDCSystem.analysis.extractedValues = {
            saftGross: 5000.00, saftIVA6: 300.00, saftNet: 4700.00,
            rendimentosBrutos: 5000.00, comissaoApp: -1200.00, rendimentosLiquidos: 3800.00,
            faturaPlataforma: 200.00, // Fatura de Serviço
            // Dados Extra v12.1
            campanhas: 150.00, // Campanhas
            gorjetas: 45.00, // Gorjetas
            cancelamentos: 12.00, // Cancelamentos
            portagens: 7.65, // Portagens
            // Cálculos (Refinado)
            diferencialCusto: 800.00, // Comissão - Fatura
            ivaAutoliquidacao: diferencialCusto * 0.23,
            jurosMora: (diferencialCusto * 0.23) * 0.04,
            taxaRegulacao: Math.abs(comissaoApp) * 0.05
        };
        
        VDCSystem.analysis.crossings.deltaB = 800.00;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        
        // Atualiza contadores de dados extra (Simulação v12.1)
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
        
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS V12.1';
        }
    }, 1000);
}

function simulateUpload(type, count) {
    for(let i=0; i<count; i++) {
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], parsedData: [], totals: { records: 0, gross: 0, commission: 0, extra: { tips: 0, tolls: 0, invoices: [] }, hashes: {} };
        }
        VDCSystem.documents[type].files.push({ name: `demo_${type}_${i}.txt`, size: 1024 });
        VDCSystem.documents[type].totals.records++;
    }
    updateCounters();
    updateEvidenceSummary();
}

// ==========================================
// 12. LÓGICA DE EVENTOS GATEKEEPER
// ==========================================

function setupMainListeners() {
    // Registo
    const registerBtn = document.getElementById('registerClientBtnFixed');
    if (registerBtn) registerBtn.addEventListener('click', registerClient);
    
    // Demo Mode
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    // Modal
    const closeModalHandler = () => { document.getElementById('evidenceModal').style.display = 'none'; updateAnalysisButton(); };
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    
    if (openModalBtn) openModalBtn.addEventListener('click', () => { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
    if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeModalHandler);
    
    // Uploads
    setupUploadListeners();
    
    // Ações Principais
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', performAudit);
    
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportDataJSON);
    
    // IDs Sincronizados (v11.6 IDs preservados)
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSystem);
    
    // IDs v12.1 (Extras)
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    
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
// 13. VISUALIZAÇÃO V12.1 NO DOM
// ==========================================

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const fmt = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits:2, maximumFractionDigits: 2 }) + '€';
    
    const map = {
        'netVal': ev.saftNet,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao,
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosBrutos + ev.comissaoApp,
        'kpiInvoice': ev.faturaPlataforma,
        'iva23Val': ev.ivaAutoliquidacao,
        'kpiCamp': ev.campanhas || 0,
        'kpiTips': ev.tips || 0,
        'kpiTips': ev.gorjetas || 0,
        'kpiCanc': ev.cancelamentos || 0,
        'kpiTolls': ev.portagens || 0
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
        labels: ['Bruto', 'Comissão', 'Fatura', 'IVA 23%', 'Juros 4%', 'Campanhas', 'Gorjetas', 'Cancelamentos', 'Portagens'],
        datasets: [{
            label: '€',
            data: [
                ev.rendimentosBrutos, 
                Math.abs(ev.comissaoApp), 
                ev.faturaPlataforma, 
                ev.ivaAutoliquidacao, 
                ev.jurosMora, 
                ev.campanhas,
                ev.gorjetas,
                ev.cancelamentos,
                ev.portagens
            ],
            backgroundColor: ['#00a8ff', '#e84118', '#44bd32', '#fbc531', '#ff9f1a', '#4ecdc4', '#00d1ff', '#ff6b35']
        }]
    };
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // Alerta Big Data (v11.6 preservado)
    const bigDataAlert = document.getElementById('bigDataAlert');
    if (bigDataAlert) {
        if (cross.diferencialAlerta) {
            bigDataAlert.style.display = 'flex';
            // Usa os IDs corretos
            const invEl = document.getElementById('alertInvoiceVal');
            const commEl = document.getElementById('alertCommVal');
            const diffEl = document.getElementById('alertDeltaVal');
            
            if (invEl) invEl.textContent = ev.faturaPlataforma.toFixed(2) + '€';
            if (commEl) commEl.textContent = Math.abs(ev.comissaoApp).toFixed(2) + '€';
            if (diffEl) diffEl.textContent = cross.deltaB.toFixed(2) + '€';
        } else {
            bigDataAlert.style.display = 'none';
        }
    }
}

// ==========================================
// 14. EXPORTAÇÃO LEGAL & RESET (Relatório Pericial)
// ==========================================

function exportDataJSON() {
    const data = {
        session: VDCSystem.sessionId,
        client: VDCSystem.client,
        analysis: VDCSystem.analysis,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VDC_Report_${VDCSystem.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    logAudit('Relatório JSON exportado.', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) { showToast('Sem cliente para gerar relatório.', 'error'); return; }
    
    logAudit('Gerando PDF Jurídico (ISO/IEC 27037)...', 'info');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    
    // Cabeçalho
    doc.setFont('helvetica', 'bold', 'ISO/IEC 27037');
    doc.text("VDC AUDITORIA FISCAL v11.7", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    
    // Dados do Cliente
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 20, 40);
    doc.text(`Cliente: ${VDCSystem.client?.name || 'N/A'}`, 20, 46);
    doc.text(`NIF: ${VDCSystem.client?.nif || 'N/A'}`, 20, 52);
    
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 20, 58);
    doc.text(`Hora: ${new Date().toLocaleTimeString('pt-PT')}`, 20, 64);
    
    // Análise Fiscal
    doc.setFont('helvetica', 'bold', 'ISO/IEC 27037');
    doc.text("I. DADOS EXTRAÍDOS (Parsing Inteligente v12.1)", 20, 72);
    
    // Dados Extra v12.1 (Simulação Visual)
    const ev = VDCSystem.analysis.extractedValues;
    if (ev.campanhas > 0) {
        doc.text(`Campanhas (V12.1): ${ev.campanhas.toFixed(2)}€`, 30, 80);
    }
    if (ev.gorjetas > 0) {
        doc.text(`Gorjetas (V12.1): ${ev.gorjetas.toFixed(2)}€`, 30, 94);
    }
    if (ev.cancelamentos > 0) {
        doc.text(`Cancelamentos (V12.1): ${ev.cancelamentos.toFixed(2)}€`, 30, 108);
    }
    if (ev.portagens > 0) {
        doc.text(`Portagens (V12.1): ${ev.portagens.toFixed(2)}€`, 30, 122);
    }
    
    // Análise de Triangulação (v12.1)
    doc.setFont('helvetica', 'bold', 'ISO/IEC 27037');
    doc.text("II. ANÁLISE DE CRUZAMENTO (HÍBRID)", 20, 132);
    
    const fmt = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
    
    doc.setFont('helvetica', 'normal', 'ISO/IEC 27037');
    doc.text(`Rendimentos Brutos (CSV): ${fmt(ev.rendimentosBrutos)}`, 25, 148);
    doc.text(`Comissão App (CSV): ${fmt(Math.abs(ev.comissaoApp))}`, 25, 154);
    doc.text(`Fatura (Input Manual): ${fmt(ev.faturaPlataforma)}`, 25, 160);
    doc.text(`Diferencial (Cálculo): ${fmt(ev.diferencialCusto)}`, 25, 166);
    doc.text(`IVA 23% (Autoliquidação): ${fmt(ev.ivaAutoliquidacao)}`, 25, 172);
    
    // Cálculos Jurídicos
    doc.setFont('helvetica', 'bold', 'RGIT');
    doc.text("III. CÁLCULOS JURÍDICOS (RGRC 100% Base Anual Civil)", 20, 186);
    
    doc.setFont('helvetica', 'normal', 'ISO/IEC 27037');
    const diff = VDCSystem.analysis.crossings.deltaB || 0;
    
    doc.text(`Juros de Mora (4% Civil): ${fmt(ev.jurosMora)}`, 25, 200);
    
    if (diff > 0.01) {
        doc.setTextColor(239, 68, 68);
        doc.text(`Taxa de Regulação (5%): ${fmt(VDCSystem.analysis.extractedValues.taxaRegulacao)}`, 25, 208);
    }
    
    // Nota Conformidade
    doc.setFont('courier', 'normal', 'ISO/IEC 27037');
    doc.text(`Nota: Estes cálculos consideram juros civis de 4% e taxa de 5% regulatória.`, 25, 222);
    doc.text(`      sobre os valores apresentados nos relatórios de entidade (Bolt/Uber).`, 25, 232);
    
    doc.save(`VDC_Report_${VDCSystem.sessionId}_Juridico.pdf`);
    logAudit('Relatório Jurídico exportado.', 'success');
}

function resetSystem() {
    if (!confirm('Repor o sistema? Isto apagará todos os dados carregados.')) return;
    
    // Reset Lógica v11.6 Preservada
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data_bd_v11_6');
    
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0,
        platformCommission: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0,
        diferencialCusto: 0, ivaAutoliquidacao: 0,
        campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0,
        ivaAutoliquidacao: 0, jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
    };
    
    // Limpa UI
    ['netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'jurosVal', 'jurosCard'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
    });
    
    ['kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice', 'iva23Val', 'kpiCamp', 'kpiTips', 'kpiTips', 'kpiCanc', 'kpiTolls', 'kpiTolls'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
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
// 15. BINDING GLOBAL (ESTABILIDADE FINAL)
// ==========================================

window.clearConsole = clearConsole;
window.startGatekeeperSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.logAudit = logAudit;
window.generateMasterHash = generateMasterHash;
window.VDCSystem = VDCSystem;
window.performForensicCrossings = performForensicCrossings;
window.injectDynamicParsingLogic = injectDynamicParsingLogic;
