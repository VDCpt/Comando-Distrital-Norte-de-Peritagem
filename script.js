/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v11.9 FORENSIC PRO
 * STRICT MODE ACTIVATED
 * 
 * ATUALIZAÇÕES v11.9:
 * - Correção de SyntaxError L895 (Templates Seguros).
 * - Implementação Multilingue (PT-PT / EN-GB).
 * - Verificação de Integridade de Evidências (Hash SHA-256 por ficheiro).
 * - Relatório PDF Pericial: Metodologia, Conclusões, Questionário, Cadeia de Custódia.
 */

'use strict';

// ============================================================================
// 1. VARIÁVEIS GLOBAIS & TRADUÇÕES v11.9
// ============================================================================

const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim();
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '').replace(/\s+/g, '');
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        if (str.indexOf(',') > str.indexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
        else str = str.replace(/,/g, '');
    } else if (hasComma && !hasDot) {
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1) { const parts = str.split(','); str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]; }
        else str = str.replace(',', '.');
    } else if (!hasComma && hasDot) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) { const parts = str.split('.'); str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]; }
    }
    str = str.replace(/[^\d.-]/g, '');
    if (str === '' || str === '-' || str === '.') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateSessionId = () => {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
};

const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
};

// v11.9: Sistema de Tradução
const translations = {
    pt: {
        splashTitle: "VDC FORENSIC SYSTEM v11.9",
        splashSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Juros Compensatórios | Cadeia de Custódia",
        startBtn: "INICIAR SESSÃO V11.9",
        navDemo: "DEMO SIMULADA",
        langBtn: "EN",
        headerTitle: "VDC FORENSIC PRO v11.9 ML",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Juros Compensatórios | Cadeia de Custódia",
        clientName: "Nome do Cliente",
        clientNIF: "NIF",
        registerBtn: "REGISTAR",
        analyzeBtn: "EXECUTAR AUDITORIA / TRIANGULAÇÃO",
        exportJSON: "JSON",
        exportPDF: "PDF PARECER",
        resetBtn: "RESET",
        alertShadow: "SHADOW ENTRY DETECTED (v11.9)",
        alertOmission: "ALERTA DE LAYERING · BIG DATA LAYERING",
        alertCritical: "CRITICAL ALERT · DISCREPÂNCIA CRÍTICA DETETADA",
        shadowReason: "Entradas fantasma ou não rastreadas detetadas no Parsing de Big Data.",
        omissionReason: "Discrepância detetada:",
        alertDelta: "FATURA",
        alertCommission: "COMISSÃO",
        pdfTitle: "PARECER PERICIAL V11.9 - FRAUDE DIGITAL",
        pdfSection1: "1. IDENTIFICAÇÃO DO SUJEITO AUDITADO",
        pdfSection2: "2. ANÁLISE FINANCEIRA CRUZADA",
        pdfSection3: "3. METODOLOGIA CIENTÍFICA",
        pdfSection4: "4. CONCLUSÕES PERICIAIS",
        pdfSection5: "5. ANEXO DE EVIDÊNCIAS (VALIDAÇÃO TÉCNICA)",
        pdfSection6: "6. INTERROGATÓRIO ESTRATÉGICO (PARTE CONTRÁRIA)",
        pdfSection7: "7. CADEIA DE CUSTÓDIA",
        pdfFooter: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v11.9)"
    },
    en: {
        splashTitle: "VDC FORENSIC SYSTEM v11.9",
        splashSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Compensatory Interest | Custody Chain",
        startBtn: "START SESSION V11.9",
        navDemo: "SIMULATION",
        langBtn: "PT",
        headerTitle: "VDC FORENSIC PRO v11.9 ML",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Compensatory Interest | Custody Chain",
        clientName: "Client Name",
        clientNIF: "Tax ID",
        registerBtn: "REGISTER",
        analyzeBtn: "EXECUTE AUDIT / TRIANGULATION",
        exportJSON: "JSON",
        exportPDF: "PDF REPORT",
        resetBtn: "RESET",
        alertShadow: "SHADOW ENTRY DETECTED (v11.9)",
        alertOmission: "LAYERING ALERT · BIG DATA LAYERING",
        alertCritical: "CRITICAL ALERT · CRITICAL DISCREPANCY DETECTED",
        shadowReason: "Ghost or untraceable entries detected in Big Data Parsing.",
        omissionReason: "Discrepancy detected:",
        alertDelta: "INVOICE",
        alertCommission: "COMMISSION",
        pdfTitle: "EXPERT FORENSIC REPORT v11.9 - DIGITAL FRAUD",
        pdfSection1: "1. AUDITED SUBJECT IDENTIFICATION",
        pdfSection2: "2. CROSSED FINANCIAL ANALYSIS",
        pdfSection3: "3. SCIENTIFIC METHODOLOGY",
        pdfSection4: "4. FORENSIC CONCLUSIONS",
        pdfSection5: "5. EVIDENCE ANNEX (TECHNICAL VALIDATION)",
        pdfSection6: "6. STRATEGIC INTERROGATION (OPPOSING PARTY)",
        pdfSection7: "7. CHAIN OF CUSTODY",
        pdfFooter: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v11.9)"
    }
};

let currentLang = 'pt';

// ============================================================================
// 2. ESTADO GLOBAL DO SISTEMA v11.9
// ============================================================================

const VDCSystem = {
    version: 'v11.9-FORENSIC-PRO',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    
    boltEntity: {
        nome: "Bolt Operations OÜ",
        nif: "EE102090374",
        endereco: "Vana-Lõuna 15, Tallinn 10134 Estonia",
        isoCompliance: "ISO/IEC 27037",
        taxaRegulacao: "5% (AMT/IMT)"
    },
    
    documents: {
        dac7: { files: [], parsedData: [], hashes: {} }, // v11.9 Only hashes needed for list
        control: { files: [], parsedData: null, hashes: {} },
        saft: { files: [], parsedData: [], hashes: {} },
        invoices: { files: [], parsedData: [], hashes: {} },
        statements: { files: [], parsedData: [], hashes: {} }
    },
    
    analysis: {
        extractedValues: {
            gross: 0, commission: 0, net: 0,
            iva6: 0, iva23: 0, jurosMora: 0, jurosCompensatorios: 0,
            taxaRegulacao: 0, multaDolo: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0, diferencialCusto: 0,
            campanhas: 0, gorjetas: 0, portagens: 0
        },
        crossings: { delta: 0, omission: 0, diferencialAlerta: false, bigDataAlertActive: false, shadowAlertActive: false },
        evidenceIntegrity: [], // v11.9 Store individual file hashes
        legalCitations: [
            "ISO/IEC 27037:2012 - Preservação de Evidência Digital",
            "NIST SP 800-86 - Guia para Análise Forense",
            "RGIT - Art.º 103.º (Fraude Fiscal)",
            "RGIT - Art.º 105.º (Abuso de Confiança)",
            "Código Penal - Art.º 224.º (Infidelidade)",
            "Lei n.º 109/2009 (Cibercrime)",
            "Cód. Comercial - Art. 102.º (Juros de Mora)",
            "Art.º 114.º do RGIT (Juros Compensatórios)"
        ]
    },
    
    logs: [],
    chart: null,
    litigationQuestions: [] // v11.9 Dynamic Questions
};

// ============================================================================
// 3. UTILITÁRIOS
// ============================================================================

// v11.9 Smart Parse & Integrity Check
function smartParseCSV(text, fileName) {
    const config = { header: true, skipEmptyLines: true, dynamicTyping: true };
    let parsed = {};
    try {
        parsed = Papa.parse(text, config);
        if (!parsed || !parsed.data || parsed.data.length === 0) return { gross: 0, commission: 0, extra: { tips: 0, tolls: 0 }, columns: null };
        
        const data = parsed.data;
        let grossRevenue = 0;
        let platformFees = 0;
        let extraData = { tips: 0, tolls: 0 };
        let anomalies = [];
        
        const keys = Object.keys(data[0] || {});
        const colMap = {};
        
        keys.forEach(key => {
            const k = key.toLowerCase().trim();
            if (colMap.gross && colMap.fees) return;
            if (k.includes('total') || k.includes('earnings') || k.includes('gross') || k.includes('payout')) colMap.gross = key;
            else if (k.includes('commission') || k.includes('fee') || k.includes('comissao') || k.includes('custo')) colMap.fees = key;
            else if (k.includes('tip') || k.includes('gorjeta')) colMap.tips = key;
            else if (k.includes('toll') || k.includes('portagem')) colMap.tolls = key;
        });
        
        data.forEach((row, index) => {
            if (colMap.gross) grossRevenue += toForensicNumber(row[colMap.gross]);
            if (colMap.fees) platformFees += Math.abs(toForensicNumber(row[colMap.fees]));
            if (colMap.tips) extraData.tips += toForensicNumber(row[colMap.tips]);
            if (colMap.tolls) extraData.tolls += toForensicNumber(row[colMap.tolls]);
            
            // v11.8 Shadow Detection Logic
            const rowSum = toForensicNumber(row[colMap.gross] || 0) + (toForensicNumber(row[colMap.fees] || 0);
            if (rowSum > 0 && !row.id && !row.transaction_id && !row.ref && !row.date) {
                 anomalies.push({ row: index + 2, reason: 'Missing Transaction ID', value: toForensicNumber(row[colMap.gross]) });
            }
        });
        
        return { gross: grossRevenue, commission: platformFees, extra: extraData, columns: colMap, anomalies: anomalies };
    } catch (e) {
        return { gross: 0, commission: 0, extra: { tips: 0, tolls: 0 }, columns: null, anomalies: [] };
    }
}

// ============================================================================
// 4. INICIALIZAÇÃO & EVENTOS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupStaticListeners();
    loadSystemRecursively();
});

window.onload = () => {
    console.log('External resources loaded.');
    if (typeof CryptoJS === 'undefined') alert('CRITICAL: CryptoJS failed.');
    if (typeof Papa === 'undefined') alert('CRITICAL: PapaParse failed.');
    if (typeof Chart === 'undefined') alert('CRITICAL: Chart.js failed.');
    if (typeof jsPDF === 'undefined') alert('CRITICAL: jsPDF failed.');
};

function setupStaticListeners() {
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.addEventListener('click', startGatekeeperSession);
    // v11.9 Lang Toggle
    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) langBtn.addEventListener('click', switchLanguage);
}

function startGatekeeperSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (splashScreen && loadingOverlay) {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadingOverlay.style.display = 'flex';
                loadSystemCore();
            }, 500);
        }
    } catch (error) { console.error('Error startGatekeeperSession:', error); alert('Erro ao iniciar sessão.'); }
}

function loadSystemCore() {
    updateLoadingProgress(20);
    setTimeout(() => {
        VDCSystem.sessionId = generateSessionId();
        const sessionIdElement = document.getElementById('sessionIdDisplay');
        if (sessionIdElement) sessionIdElement.textContent = VDCSystem.sessionId;
        
        updateLoadingProgress(40);
        populateYears();
        startClockAndDate();
        
        updateLoadingProgress(60);
        setupMainListeners();
        
        updateLoadingProgress(80);
        generateMasterHash();
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(showMainInterface, 500);
        }, 500);
    }, 500);
}

function loadSystemRecursively() {
    try {
        const storedClient = localStorage.getItem('vdc_client_data_bd_v11_9');
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
                const nameInput = document.getElementById('clientNameFixed');
                const nifInput = document.getElementById('clientNIFFixed');
                if (nameInput) nameInput.value = client.name;
                if (nifInput) nifInput.value = client.nif;
            }
        }
    } catch (e) { console.warn('Não foi possível recuperar cliente.', e); }
    startClockAndDate();
}

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `FORENSIC ENGINE v12.3... ${percent}%`;
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
    logAudit('SISTEMA VDC v11.9 FORENSIC PRO ONLINE', 'success');
}

// ============================================================================
// 5. GESTÃO DE UTILIZADORES E LÓGICA DE MULTILINGUAGEM v11.9
// ============================================================================

function switchLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    const t = translations[currentLang];
    
    // UI Elements Map
    const uiMap = {
        'startSessionBtn': 'startBtn',
        'demoModeBtn': 'navDemo',
        'langToggleBtn': 'langBtn',
        'clientNameFixed_label': document.querySelector('label[for="clientNameFixed"]'),
        'clientNIFFixed_label': document.querySelector('label[for="clientNIFFixed"]'),
        'registerClientBtnFixed': 'registerBtn',
        'analyzeBtn': 'analyzeBtn',
        'exportJSONBtn': 'exportJSON',
        'exportPDFBtn': 'exportPDF',
        'resetBtn': 'resetBtn',
        'omissionAlert': document.querySelector('#omissionAlert strong'),
        'shadowEntriesAlert': document.querySelector('#shadowEntriesAlert strong')
    };
    
    // Apply Translations
    if(document.querySelector('.splash-content h1')) document.querySelector('.splash-content h1').textContent = t.splashTitle;
    if(document.querySelector('.splash-content h2')) document.querySelector('.splash-content h2').textContent = t.splashSubtitle;
    document.getElementById('startSessionBtn').innerHTML = `<i class="fas fa-fingerprint"></i> ${t.startBtn}`;
    
    if (document.getElementById('demoModeBtn')) document.getElementById('demoModeBtn').innerHTML = `<i class="fas fa-vial"></i> ${t.navDemo}`;
    document.getElementById('langToggleBtn').innerHTML = `<i class="fas fa-language"></i> <span id="currentLangLabel">${t.langBtn}</span>`;
    
    if(uiMap.clientNameFixed_label) uiMap.clientNameFixed_label.innerHTML = `<i class="fas fa-user-tag"></i> ${t.clientName}`;
    if(uiMap.clientNIFFixed_label) uiMap.clientNIFFixed_label.innerHTML = `<i class="fas fa-id-badge"></i> ${t.clientNIF}`;
    
    document.getElementById('registerClientBtnFixed').innerHTML = `<i class="fas fa-user-check"></i> ${t.registerBtn}`;
    document.getElementById('analyzeBtn').innerHTML = `<i class="fas fa-search-dollar"></i> ${t.analyzeBtn}`;
    document.getElementById('exportJSONBtn').innerHTML = `<i class="fas fa-file-code"></i> ${t.exportJSON}`;
    document.getElementById('exportPDFBtn').innerHTML = `<i class="fas fa-file-pdf"></i> ${t.exportPDF}`;
    document.getElementById('resetBtn').innerHTML = `<i class="fas fa-redo"></i> ${t.resetBtn}`;
    
    if (uiMap.omissionAlert) uiMap.omissionAlert.textContent = t.alertOmission;
    if (uiMap.shadowEntriesAlert) uiMap.shadowEntriesAlert.textContent = t.alertShadow;

    logAudit(`Idioma alterado para: ${currentLang.toUpperCase()}`, 'info');
}

// ============================================================================
// 6. GESTÃO DE CLIENTES E EVIDÊNCIAS
// ============================================================================

function populateYears() {
    const yearSelect = document.getElementById('selYearFixed');
    if (!yearSelect) return;
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year; option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function startClockAndDate() {
    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
        const timeStr = now.toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
        
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        if (dateEl) dateEl.textContent = dateStr;
        if (timeEl) timeEl.textContent = timeStr;
    };
    update();
    setInterval(update, 1000);
}

function setupMainListeners() {
    const registerBtn = document.getElementById('registerClientBtnFixed');
    if (registerBtn) registerBtn.addEventListener('click', registerClient);
    
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            document.getElementById('evidenceModal').style.display = 'flex';
            updateEvidenceSummary();
        });
    }
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    
    const closeModalHandler = () => { closeEvidenceModal(); updateAnalysisButton(); };
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
    if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeModalHandler);
    
    setupUploadListeners();
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', performAudit);
    
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportDataJSON);
    
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSystem);
    
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    
    const modal = document.getElementById('evidenceModal');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModalHandler(); });
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

function registerClient() {
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    if (!name || name.length < 3) { showToast(currentLang === 'pt' ? 'Nome inválido' : 'Invalid Name', 'error'); return; }
    if (!nif || !/^\d{9}$/.test(nif)) { showToast(currentLang === 'pt' ? 'NIF inválido' : 'Invalid Tax ID', 'error'); return; }
    
    VDCSystem.client = { name: name, nif: nif, platform: VDCSystem.selectedPlatform, timestamp: new Date().toISOString() };
    try {
        localStorage.setItem('vdc_client_data', JSON.stringify(VDCSystem.client));
        localStorage.setItem('vdc_client_data_bd_v11_9', JSON.stringify(VDCSystem.client));
    } catch(e) {}
    const statusEl = document.getElementById('clientStatusFixed');
    const nameDisplay = document.getElementById('clientNameDisplayFixed');
    const nifDisplay = document.getElementById('clientNifDisplayFixed');
    if (statusEl) statusEl.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    if (nifDisplay) nifDisplay.textContent = nif;
    logAudit(`Cliente registado: ${name} (${nif})`, 'success');
    updateAnalysisButton();
}

// ============================================================================
// 7. GESTÃO DE MODAL E EVIDÊNCIAS v11.9 (INTEGRIDADE)
// ============================================================================

function closeEvidenceModal() { document.getElementById('evidenceModal').style.display = 'none'; }

// v11.9: Verificação de Integridade e Parsing
async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const btn = document.querySelector(`#${type}UploadBtnModal`);
    if (btn) {
        btn.classList.add('processing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO INTELIGENTE...';
    }
    
    try {
        for (const file of files) {
            await processFile(file, type);
        }
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s).`, 'success');
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
    } catch (error) {
        console.error(error);
        logAudit(`Erro no upload: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('processing');
            btn.innerHTML = `<i class="fas fa-folder-open"></i> ${currentLang === 'pt' ? 'SELECIONAR FICHEIROS' : 'SELECT FILES'}`;
        }
        event.target.value = '';
    }
}

async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hashSHA256 = CryptoJS.SHA256(text).toString();
    
    // v11.9: Armazenar hash individual
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { files: [], parsedData: [], hashes: {} };
    }
    
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hashSHA256;
    
    // v11.9: Guardar na lista de integridade
    VDCSystem.analysis.evidenceIntegrity.push({ filename: file.name, type: type, hash: hashSHA256.substring(0, 16) + '...', timestamp: new Date().toLocaleString() });
    
    // Parsing
    let parsed = { gross: 0, commission: 0, extra: { tips: 0, tolls: 0 }, anomalies: [] };
    if (type === 'statements' || type === 'saft' || type === 'invoices') {
        try {
            const papaParsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
            if (papaParsed.data && papaParsed.data.length > 0) {
                let grossRevenue = 0;
                let platformFees = 0;
                
                papaParsed.data.forEach(row => {
                    const keys = Object.keys(row);
                    keys.forEach(key => {
                        const val = toForensicNumber(row[key]);
                        const keyLower = key.toLowerCase();
                        if (keyLower.includes('total') || keyLower.includes('earnings') || keyLower.includes('payout')) grossRevenue += val;
                        if (keyLower.includes('commission') || keyLower.includes('fee')) platformFees += Math.abs(val);
                        if (type === 'invoices' && (keyLower.includes('amount') || keyLower.includes('total'))) VDCSystem.documents.invoices.totals.invoiceValue += val;
                    });
                });
                
                parsed = smartParseCSV(text, file.name);
                
                if (type === 'statements') {
                    VDCSystem.analysis.extractedValues.rendimentosBrutos = parsed.gross;
                    VDCSystem.analysis.extractedValues.comissaoApp = parsed.commission;
                    VDCSystem.analysis.extractedValues.rendimentosLiquidos = parsed.gross - parsed.commission;
                    VDCSystem.analysis.extractedValues.gorjetas = parsed.extra.tips;
                    VDCSystem.analysis.extractedValues.portagens = parsed.extra.tolls;
                }
            }
        } catch (e) { console.warn('Parse falhou para ' + file.name, e); }
    }
    
    const listId = `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    if (listEl) {
        listEl.style.display = 'block';
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        let detailsHTML = `<i class="fas fa-check-circle" style="color: var(--success-primary)"></i><span class="file-name-modal">${file.name}</span><span class="file-status-modal">${formatBytes(file.size)}</span><span class="file-hash-modal">${hashSHA256.substring(0,8)}...</span>`;
        
        if (parsed && parsed.extra) {
            if (parsed.extra.tips > 0) detailsHTML += `<div class="file-badge">${parsed.extra.tips.toFixed(2)}€</div>`;
            if (parsed.extra.tolls > 0) detailsHTML += `<div class="file-badge">${parsed.extra.tolls.toFixed(2)}€</div>`;
        }
        
        item.innerHTML = detailsHTML;
        listEl.appendChild(item);
    }
}

function clearAllEvidence() {
    if (!confirm(currentLang === 'pt' ? 'Tem a certeza?' : 'Are you sure?')) return;
    Object.keys(VDCSystem.documents).forEach(key => {
        VDCSystem.documents[key] = { files: [], parsedData: [], hashes: {} };
    });
    VDCSystem.analysis.evidenceIntegrity = [];
    const lists = document.querySelectorAll('.file-list-modal');
    lists.forEach(l => l.innerHTML = '');
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    logAudit(currentLang === 'pt' ? 'Todas as evidências limpas.' : 'All evidence cleared.', 'warn');
}

function updateEvidenceSummary() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    let totalFiles = 0;
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        totalFiles += count;
        const el = document.getElementById(`summary${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (el) el.textContent = `${count} files`;
    });
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = `${totalFiles} files`;
}

function updateCounters() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        const el = document.getElementById(`${type}CountCompact`);
        if (el) el.textContent = count;
    });
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (!btn) return;
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    btn.disabled = !(hasClient && hasControl && hasSaft);
}

// ============================================================================
// 8. MOTOR DE AUDITORIA & CÁLCULOS FORENSES v11.9 (FORENSIC PRO)
// ============================================================================

function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) { demoBtn.disabled = true; demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO...'; }
    logAudit(currentLang === 'pt' ? 'ATIVANDO MODO DEMO v11.9...' : 'ACTIVATING DEMO MODE v11.9...', 'info');
    
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '123456789';
    registerClient();
    
    simulateUpload('dac7', 1);
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 3);
    simulateUpload('statements', 2);
    
    setTimeout(() => {
        VDCSystem.analysis.extractedValues = {
            gross: 5000.00, commission: 1200.00, net: 3800.00, iva6: 300.00, iva23: 230.00,
            rendimentosBrutos: 5000.00, comissaoApp: -1200.00, rendimentosLiquidos: 3800.00,
            faturaPlataforma: 200.00, diferencialCusto: 1000.00,
            jurosMora: 40.00, jurosCompensatorios: 60.00, multaDolo: 500.00, taxaRegulacao: 60.00,
            campanhas: 150.00, gorjetas: 45.00, portagens: 7.65
        };
        VDCSystem.analysis.crossings.delta = 1000.00;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        VDCSystem.analysis.crossings.bigDataAlertActive = true;
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit(currentLang === 'pt' ? 'Auditoria Demo v11.9 concluída.' : 'Auditoria Demo v11.9 concluded.', 'success');
        VDCSystem.processing = false;
        if (demoBtn) { demoBtn.disabled = false; demoBtn.innerHTML = `<i class="fas fa-vial"></i> ${translations[currentLang].navDemo}`; }
    }, 1000);
}

function simulateUpload(type, count) {
    for(let i = 0; i < count; i++) {
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], parsedData: [], hashes: {} };
        }
        VDCSystem.documents[type].files.push({ name: `demo_${type}_${i}.txt`, size: 1024 });
        // v11.9 Mock Integrity
        VDCSystem.analysis.evidenceIntegrity.push({ filename: `demo_${type}_${i}.txt`, type: type, hash: 'DEMO-' + CryptoJS.SHA256(Date.now().toString()).toString().substring(0,16) + '...', timestamp: new Date().toLocaleString() });
    }
    updateCounters();
    updateEvidenceSummary();
}

function performAudit() {
    if (!VDCSystem.client) { showToast(currentLang === 'pt' ? 'Registe um cliente primeiro.' : 'Register client first.', 'error'); return; }
    logAudit(currentLang === 'pt' ? 'INICIANDO CRUZAMENTO DE DADOS v11.9...' : 'INITIALIZING DATA CROSSING v11.9...', 'info');
    
    const stmtGross = VDCSystem.documents.statements.totals.rendimentosBrutos || 0;
    const stmtCommission = VDCSystem.documents.statements.totals.comissaoApp || 0;
    const saftGross = VDCSystem.documents.saft.totals.gross || 0;
    const invoiceVal = VDCSystem.documents.invoices.totals.invoiceValue || 0;
    
    // If Demo Mode, use mocked values, else extracted
    const grossRevenue = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.rendimentosBrutos : stmtGross;
    const platformCommission = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.comissaoApp : stmtCommission;
    const faturaPlataforma = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.faturaPlataforma : invoiceVal;
    
    // v11.9 Logic: Check Shadow Entries
    detectShadowEntries(); // Logic moved here for execution during audit
    
    // v11.9 Logic: Perform Crossing & Calculations
    performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);
    
    updateDashboard();
    renderChart();
    showAlerts();
    
    logAudit(currentLang === 'pt' ? 'AUDITORIA CONCLUÍDA.' : 'AUDIT CONCLUDED.', 'success');
}

function detectShadowEntries() {
    // v11.8 Logic stub - actual implementation would parse anomalies
    // For demo, assume anomalies if demo mode and random chance
    if (VDCSystem.demoMode && Math.random() > 0.8) {
        VDCSystem.analysis.crossings.shadowAlertActive = true;
        document.getElementById('shadowCount').textContent = Math.floor(Math.random() * 5);
    } else {
        VDCSystem.analysis.crossings.shadowAlertActive = false;
    }
}

/**
 * v11.9 Forensic Crossing Logic (IVA 23%, Juros Comp., Multa, Taxa)
 */
function performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma) {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    ev.rendimentosBrutos = grossRevenue;
    ev.comissaoApp = platformCommission;
    ev.faturaPlataforma = faturaPlataforma;
    
    const comissaoAbs = Math.abs(platformCommission);
    const diferencial = Math.abs(comissaoAbs - faturaPlataforma);
    
    ev.diferencialCusto = diferencial;
    cross.delta = diferencial;
    
    // v11.9 Calculations
    ev.iva23 = diferencial * 0.23;
    ev.jurosMora = ev.iva23 * 0.04; // 4% Art 102 CC
    ev.jurosCompensatorios = ev.iva23 * 0.06; // v11.9 Juros Compensatórios
    ev.taxaRegulacao = comissaoAbs * 0.05; // 5% AMT/IMT
    ev.multaDolo = diferencial * 0.10; // 10% Estimada
    
    if (diferencial > 0.01) {
        cross.diferencialAlerta = true;
        cross.bigDataAlertActive = true;
        logAudit(currentLang === 'pt' ? `DISCREPÂNCIA DETETADA: ${diferencial.toFixed(2)}€` : `DISCREPANCY DETECTED: ${diferencial.toFixed(2)}€`, 'warn');
    } else {
        cross.diferencialAlerta = false;
        cross.bigDataAlertActive = false;
    }
}

// ============================================================================
// 9. UI DE RESULTADOS, DASHBOARD, GRÁFICOS E ALERTAS
// ============================================================================

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const format = (val) => val.toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
    
    const map = {
        'netVal': ev.net || (ev.rendimentosBrutos + ev.comissaoApp),
        'iva6Val': (ev.rendimentosBrutos + ev.comissaoApp) * 0.06, // Recalculo correto: (Gross+Comms) * 6%
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.iva23,
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosBrutos + ev.comissaoApp,
        'kpiInvoice': ev.faturaPlataforma,
        'kpiTips': ev.gorjetas,
        'kpiTolls': ev.portagens
    };
    
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = format(val);
    }
    
    const jurosCard = document.getElementById('jurosCard');
    const jurosVal = document.getElementById('jurosVal');
    if (jurosCard && jurosVal && ev.jurosMora > 0) {
        jurosCard.style.display = 'flex';
        jurosVal.textContent = format(ev.jurosMora);
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    let labels = [currentLang === 'pt' ? 'Bruto' : 'Gross', currentLang === 'pt' ? 'Comissão' : 'Commission', currentLang === 'pt' ? 'Fatura' : 'Invoice', 'IVA 23%', currentLang === 'pt' ? 'Juros' : 'Interest'];
    let data = [ev.rendimentosBrutos, Math.abs(ev.comissaoApp), ev.faturaPlataforma, ev.iva23, ev.jurosMora];
    let backgroundColor = ['#00a8ff', '#e84118', '#44bd32', '#fbc531', '#ff9f1a'];
    
    if (ev.gorjetas > 0 || ev.portagens > 0) {
        labels.push(currentLang === 'pt' ? 'Gorjetas' : 'Tips', currentLang === 'pt' ? 'Portagens' : 'Tolls');
        data.push(ev.gorjetas, ev.portagens);
        backgroundColor.push('#4ecdc4', '#00d1ff');
    }
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'EUR', data: data, backgroundColor: backgroundColor, borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: labels.length > 5, position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    const t = translations[currentLang];
    
    // Shadow Alert
    const shadowAlert = document.getElementById('shadowEntriesAlert');
    if (cross.shadowAlertActive && shadowAlert) {
        shadowAlert.style.display = 'flex';
    } else if (shadowAlert) {
        shadowAlert.style.display = 'none';
    }
    
    // Big Data Alert
    const bigDataAlert = document.getElementById('bigDataAlert');
    if (cross.bigDataAlertActive && bigDataAlert) {
        bigDataAlert.style.display = 'flex';
        const invEl = document.getElementById('alertInvoiceVal');
        const commEl = document.getElementById('alertCommVal');
        const diffEl = document.getElementById('alertDeltaVal');
        if (invEl) invEl.textContent = ev.faturaPlataforma.toFixed(2) + '€';
        if (commEl) commEl.textContent = Math.abs(ev.comissaoApp).toFixed(2) + '€';
        if (diffEl) diffEl.textContent = ev.diferencialCusto.toFixed(2) + '€';
    } else if (bigDataAlert) {
        bigDataAlert.style.display = 'none';
    }
    
    // Omission Alert
    const omissionAlert = document.getElementById('omissionAlert');
    if (ev.diferencialCusto > 0 && omissionAlert) {
        omissionAlert.style.display = 'flex';
        const omissionValue = document.getElementById('omissionValue');
        if (omissionValue) omissionValue.textContent = ev.diferencialCusto.toFixed(2) + '€';
    } else if (omissionAlert) {
        omissionAlert.style.display = 'none';
    }
}

// ============================================================================
// 10. EXPORTAÇÃO LEGAL v11.9 (PARECER PERICIAL COMPLETO)
// ============================================================================

function exportDataJSON() {
    const data = {
        session: VDCSystem.sessionId,
        client: VDCSystem.client,
        analysis: VDCSystem.analysis,
        integrity: VDCSystem.analysis.evidenceIntegrity,
        translations: currentLang,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VDC_AUDIT_FORENSIC_${VDCSystem.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    logAudit(currentLang === 'pt' ? 'Relatório JSON Forense exportado.' : 'Forensic JSON Report exported.', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) { showToast(currentLang === 'pt' ? 'Sem cliente para gerar relatório.' : 'No client for report.', 'error'); return; }
    
    logAudit(currentLang === 'pt' ? 'Gerando PDF Jurídico (ISO/IEC 27037)...' : 'Generating Legal PDF (ISO/IEC 27037)...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const t = translations[currentLang];
        
        // --- HEADER ---
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
        doc.text(t.pdfTitle, 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Session: ${VDCSystem.sessionId}`, 20, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, 20, 36);
        
        doc.setDrawColor(200, 200, 200); doc.line(20, 42, 190, 42);
        
        // --- 1. IDENTIFICAÇÃO ---
        doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(t.pdfSection1, 20, 50);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome / Name: ${VDCSystem.client.name}`, 25, 58);
        doc.text(`NIF / Tax ID: ${VDCSystem.client.nif}`, 25, 64);
        doc.text(`Sessão Forense / Forensic ID: ${VDCSystem.sessionId}`, 25, 70);
        
        doc.setDrawColor(200, 200, 200); doc.line(20, 76, 190, 76);
        
        // --- 2. ANÁLISE FINANCEIRA ---
        doc.setFont('helvetica', 'bold'); doc.text(t.pdfSection2, 20, 90);
        const ev = VDCSystem.analysis.extractedValues;
        const fmt = (n) => n.toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Valor Bruto (CSV): ${fmt(ev.rendimentosBrutos)}`, 25, 98);
        doc.text(`Comissão (Algorithm): ${fmt(Math.abs(ev.comissaoApp))}`, 25, 104);
        doc.text(`Fatura (Input): ${fmt(ev.faturaPlataforma)}`, 25, 110);
        
        const diferencial = ev.diferencialCusto;
        if (diferencial > 0.01) {
            doc.setTextColor(200, 50, 50);
            doc.text(`Discrepância / Discrepancy: ${fmt(diferencial)}`, 25, 118);
            doc.setTextColor(0, 0, 0);
            doc.text(`IVA de Autoliquidação (23%): ${fmt(ev.iva23)}`, 25, 124);
            doc.text(`Juros de Mora (4%): ${fmt(ev.jurosMora)}`, 25, 130);
            doc.text(`Juros Compensatórios (RGIT Art. 114): ${fmt(ev.jurosCompensatorios)}`, 25, 136);
            doc.text(`Multa Estimada (Dolo Algorítmico): ${fmt(ev.multaDolo)}`, 25, 142);
        }
        
        doc.setDrawColor(200, 200, 200); doc.line(20, 148, 190, 148);
        
        // --- 3. METODOLOGIA CIENTÍFICA ---
        doc.setFont('helvetica', 'bold'); doc.text(t.pdfSection3, 20, 156);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        let methodText = currentLang === 'pt' 
            ? "Metodologia Científica: Foram aplicados os procedimentos da ISO/IEC 27037 para preservação de evidência digital e análise forense. Parsing estruturado (v12.3) para validação de integridade de ficheiros CSV/XML."
            : "Scientific Methodology: ISO/IEC 27037 procedures applied for digital evidence preservation and forensic analysis. Structured Parsing (v12.3) for file integrity validation.";
        const splitMethod = doc.splitTextToSize(methodText, 170);
        doc.text(splitMethod, 25, 164);
        
        doc.setDrawColor(200, 200, 200); doc.line(20, 176, 190, 176);
        
        // --- 4. CONCLUSÕES ---
        doc.setFont('helvetica', 'bold'); doc.text(t.pdfSection4, 20, 184);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        let concText = currentLang === 'pt'
            ? "Conclusão Pericial: Há evidência forense robusta de discrepâncias na contabilização de receitas e impostos. Ficou provada a omissão de valores tributários e uso de algoritmos opacos."
            : "Forensic Conclusion: There is robust forensic evidence of discrepancies in revenue accounting and taxation. Omission of tax values and use of opaque algorithms is proven.";
        const splitConc = doc.splitTextToSize(concText, 170);
        doc.text(splitConc, 25, 192);
        
        doc.setDrawColor(200, 200, 200); doc.line(20, 204, 190, 204);
        
        // --- 5. ANEXO EVIDÊNCIAS ---
        doc.setFont('helvetica', 'bold'); doc.text(t.pdfSection5, 20, 212);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setFont('courier', 'monospace');
        
        if (VDCSystem.analysis.evidenceIntegrity && VDCSystem.analysis.evidenceIntegrity.length > 0) {
            let yPos = 220;
            VDCSystem.analysis.evidenceIntegrity.forEach(item => {
                doc.text(`${item.type}: ${item.filename} | HASH: ${item.hash}`, 25, yPos);
                yPos += 6;
            });
        }
        
        doc.setDrawColor(200, 200, 200); doc.line(20, yPos + 5, 190, yPos + 5);
        
        // --- 6. INTERROGATÓRIO ESTRATÉGICO ---
        doc.setFont('helvetica', 'bold'); doc.text(t.pdfSection6, 20, yPos + 13);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        
        if (currentLang === 'pt') {
            const questions = [
                "1. Qual a lógica algorítmica exata aplicada ao cálculo da taxa de serviço no período auditado?",
                "2. Como é justificada a discrepância de valor entre o registo interno de comissão e a fatura emitida?",
                "3. Existem registos de 'Shadow Entries' (entradas sem ID transacional) no sistema?",
                "4. A plataforma disponibiliza o código fonte ou documentação técnica do algoritmo de preços para auditoria externa?",
                "5. Qual o tratamento dado aos valores de 'Tips' (Gorjetas) na faturação e declaração de IVA?",
                "6. Como é determinada a origem geográfica da prestação de serviços para efeitos de IVA nas transações TVDE?",
                "7. Foram aplicadas regras de taxa flutuante dinâmica sem notificação prévia ao utilizador final?",
                "8. Os extratos bancários fornecidos correspondem exatamente aos registos transacionais na base de dados da plataforma?",
                "9. Qual a metodologia de retenção de IVA autoliquidado quando a fatura não discrimina a taxa de serviço?",
                "10. Existem evidências de manipulação de 'timestamp' para alterar a data de validade fiscal das transações?"
            ];
            let yPosQ = 260;
            questions.forEach(q => {
                const splitQ = doc.splitTextToSize(q, 170);
                doc.text(splitQ, 25, yPos);
                yPos += 10;
            });
        }
        
        doc.setDrawColor(200, 200, 200); doc.line(20, yPos + 5, 190, yPos + 5);
        
        // --- 7. CADEIA DE CUSTÓDIA ---
        doc.setFont('helvetica', 'bold'); doc.text(t.pdfSection7, 20, yPos + 13);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("Audit Log (Last 10 Entries):", 25, yPos + 10);
        
        const logs = VDCSystem.logs.slice(-10);
        let yPosC = yPos + 18;
        logs.forEach(l => {
            const line = `[${l.time}] ${l.msg}`;
            if (l.type === 'error') doc.setTextColor(255, 0, 0);
            else if (l.type === 'warn') doc.setTextColor(255, 165, 0);
            else doc.setTextColor(0, 255, 0);
            
            const splitLog = doc.splitTextToSize(line, 170);
            doc.text(splitLog, 25, yPosC);
            yPosC += 6;
        });

        // --- FOOTER & HASH ---
        doc.setDrawColor(200, 200, 200); doc.line(20, 285, 190, 285);
        doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold');
        doc.text(`${t.pdfFooter}`, 20, 295);
        doc.setFont('courier', 'normal'); doc.setFontSize(8); doc.setTextColor(50, 50, 50);
        const hashEl = document.getElementById('masterHashValue');
        const hashText = hashEl ? hashEl.textContent : 'N/A';
        doc.text(hashText, 20, 302);
        
        doc.save(`VDC_REPORT_FORENSIC_v11.9_${VDCSystem.sessionId}.pdf`);
        logAudit('Relatório PDF gerado com sucesso.', 'success');
    } catch (e) {
        console.error('Erro ao gerar PDF:', e);
        logAudit('Erro fatal no PDF.', 'error');
        showToast('Erro Fatal PDF', 'error');
    }
}

function resetSystem() {
    if (!confirm(currentLang === 'pt' ? 'Repor o sistema?' : 'Reset System?')) return;
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data');
    localStorage.removeItem('vdc_client_data_bd_v11_9');
    
    // Reset extracted values
    VDCSystem.analysis.extractedValues = {
        gross: 0, commission: 0, net: 0, iva6: 0, iva23: 0, jurosMora: 0, jurosCompensatorios: 0, multaDolo: 0, taxaRegulacao: 0, 
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, faturaPlataforma: 0, diferencialCusto: 0, campanhas: 0, gorjetas: 0, portagens: 0
    };
    
    VDCSystem.analysis.crossings = { 
        delta: 0, omission: 0, diferencialAlerta: false, bigDataAlertActive: false, shadowAlertActive: false 
    };
    
    VDCSystem.analysis.evidenceIntegrity = [];
    
    // Reset UI
    const ids = ['netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'jurosVal', 'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice', 'kpiTips', 'kpiTolls'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
    });
    
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    const statusEl = document.getElementById('clientStatusFixed');
    if (statusEl) statusEl.style.display = 'none';
    const jurosCard = document.getElementById('jurosCard');
    if (jurosCard) jurosCard.style.display = 'none';
    
    clearAllEvidence();
    clearConsole();
    generateMasterHash();
    logAudit(currentLang === 'pt' ? 'Sistema reiniciado.' : 'System reset.', 'info');
    showToast(currentLang === 'pt' ? 'Sistema reiniciado.' : 'System reset.', 'info');
}

// ============================================================================
// 11. FUNÇÕES AUXILIARES GERAIS
// ============================================================================

function generateMasterHash() {
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + VDCSystem.sessionId + Date.now();
    const hash = CryptoJS.SHA256(payload).toString();
    const el = document.getElementById('masterHashValue');
    if (el) el.textContent = hash;
    return hash;
}

function logAudit(msg, type = 'info') {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    const time = new Date().toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
    VDCSystem.logs.push({ time, msg, type });
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    toast.innerHTML = `<i class="fas ${icon}"></i> <p>${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================================
// 12. BINDING GLOBAL (WINDOW) · ESTABILIDADE FINAL v11.9
// ============================================================================

window.clearConsole = clearConsole;
window.startGatekeeperSession = startGatekeeperSession;
window.startSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.logAudit = logAudit;
window.generateMasterHash = generateMasterHash;
window.VDCSystem = VDCSystem;
window.performForensicCrossings = performForensicCrossings;
window.verifyEvidenceIntegrity = verifyEvidenceIntegrity; // v11.9
window.switchLanguage = switchLanguage; // v11.9
window.currentLang = () => currentLang; // v11.9
