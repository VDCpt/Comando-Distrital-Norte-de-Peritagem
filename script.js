/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.8 FINAL
 * ====================================================================
 * EXTRAÇÃO OTIMIZADA · SILENCIOSA · RÁPIDA · LEDs DINÂMICOS
 * TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA
 * ====================================================================
 */

'use strict';

console.log('🔬 VDC SCRIPT v12.8 FINAL · EXTRAÇÃO OTIMIZADA ATIVA');

// ============================================================================
// 1. CONFIGURAÇÃO DO PDF.JS
// ============================================================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================================================
// 2. DADOS DAS PLATAFORMAS
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia',
        nif: 'EE102090374',
        country: 'Estónia',
        vatRate: 0.20
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, 1077 ZX Amesterdão, Países Baixos',
        nif: 'NL852071588B01',
        country: 'Países Baixos',
        vatRate: 0.21
    },
    freenow: {
        name: 'FREE NOW',
        address: 'Rua Example, 123, 1000-001 Lisboa, Portugal',
        nif: 'PT123456789',
        country: 'Portugal',
        vatRate: 0.23
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, 1250-149 Lisboa, Portugal',
        nif: 'PT987654321',
        country: 'Portugal',
        vatRate: 0.23
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, 4000-000 Porto, Portugal',
        nif: 'PT456123789',
        country: 'Portugal',
        vatRate: 0.23
    },
    outra: {
        name: 'Plataforma não especificada',
        address: 'A definir',
        nif: '000000000',
        country: 'Desconhecido',
        vatRate: 0.23
    }
};

// ============================================================================
// 3. UTILITÁRIOS FORENSES AVANÇADOS
// ============================================================================

// Dados de extração rápida
const QUICK_EXTRACTION = {
    ganhos: 0,
    comissoes: 0,
    dac7: 0,
    saft: 0,
    boltCount: 0,
    uberCount: 0,
    pdfCount: 0,
    valuesFound: 0
};

// Estatísticas de extração por tipo
const extractionStats = {
    pdfProcessed: 0,
    valuesFound: 0,
    boltFormat: 0,
    uberFormat: 0,
    pdfTables: 0,
    saft: { pdfs: 0, values: 0 },
    invoices: { pdfs: 0, values: 0 },
    statements: { pdfs: 0, values: 0 },
    dac7: { pdfs: 0, values: 0 }
};

const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const parseNumericValue = (str) => {
    if (!str) return 0;
    let clean = str.toString().trim();
    clean = clean.replace(/"/g, '');
    clean = clean.replace(/\s/g, '');
    clean = clean.replace(/[^\d.,-]/g, '');
    
    if (clean.indexOf(',') > -1 && clean.indexOf('.') > -1) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.indexOf(',') > -1) {
        clean = clean.replace(',', '.');
    }
    
    if (clean.indexOf('.') !== clean.lastIndexOf('.')) {
        const parts = clean.split('.');
        const last = parts.pop();
        clean = parts.join('') + '.' + last;
    }
    
    const result = parseFloat(clean) || 0;
    return forensicRound(result);
};

const toForensicNumber = parseNumericValue;

const validateNIF = (nif) => {
    if (!nif || !/^\d{9}$/.test(nif)) return false;
    const first = parseInt(nif[0]);
    if (![1, 2, 3, 5, 6, 8, 9].includes(first)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += parseInt(nif[i]) * (9 - i);
    const mod = sum % 11;
    const checkDigit = (mod < 2) ? 0 : 11 - mod;
    return parseInt(nif[8]) === checkDigit;
};

const formatCurrency = (value) => {
    return forensicRound(value).toLocaleString('pt-PT', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }) + ' €';
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross) || Math.abs(gross) < 0.01) { 
        return { 
            level: 'INCONCLUSIVO', 
            key: 'low', 
            color: '#8c7ae6', 
            description: 'Dados insuficientes para veredicto pericial. Carregue mais evidências.',
            percent: '0.00%' 
        };
    }
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    
    if (pct <= 5) { 
        return { 
            level: 'BAIXO RISCO', 
            key: 'low', 
            color: '#44bd32', 
            description: 'Margem de erro operacional. Monitorização periódica recomendada, sem indícios de fraude.',
            percent: pctFormatted 
        };
    }
    if (pct <= 15) { 
        return { 
            level: 'RISCO MÉDIO', 
            key: 'med', 
            color: '#f59e0b', 
            description: 'Anomalia algorítmica detetada. Auditoria aprofundada recomendada nos termos do art. 63.º LGT.',
            percent: pctFormatted 
        };
    }
    return { 
        level: 'CRÍTICO · FRAUDE', 
        key: 'high', 
        color: '#ef4444', 
        description: 'Indício de Fraude Fiscal (art. 103.º e 104.º RGIT). Participação à Autoridade Tributária obrigatória.',
        percent: pctFormatted 
    };
};

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

const setElementHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

const generateSessionId = () => {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 7).toUpperCase() + '-' +
           Math.floor(Math.random() * 1000).toString().padStart(3, '0');
};

const getForensicMetadata = () => {
    return {
        userAgent: navigator.userAgent,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timestampUnix: Math.floor(Date.now() / 1000),
        timestampISO: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unspecified'
    };
};

// ============================================================================
// 4. ESTADO GLOBAL (INICIALIZADO COM ZEROS)
// ============================================================================
const VDCSystem = {
    version: 'v12.8-FINAL',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPeriodo: 'anual',
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    performanceTiming: { start: 0, end: 0 },
    logs: [],
    masterHash: '',
    analysis: {
        appGains: 0,
        operatorInvoices: 0,
        dac7Value: 0,
        saftTotal: 0,
        extractedValues: {},
        crossings: { delta: 0 },
        verdict: null
    },
    documents: {
        control: { files: [] },
        saft: { files: [] },
        invoices: { files: [] },
        statements: { files: [] },
        dac7: { files: [] }
    },
    forensicMetadata: null,
    chart: null
};

// ============================================================================
// 5. FUNÇÕES DE EXTRAÇÃO OTIMIZADAS
// ============================================================================

/**
 * Processa PDF - Versão Otimizada e Silenciosa
 */
async function processPDF(file, type) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let rawText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            rawText += content.items.map(s => s.str).join(' ');
        }
        
        // Limpeza Binária Forense
        const clean = rawText.replace(/\s+/g, ' ').replace(/"\s*,\s*"/g, '","');
        
        let extracted = false;
        
        // Matcher para EXTRATO (Ganhos na App)
        const gMatch = clean.match(/"Ganhos na app","([\d\s.,]+)"/i) || 
                      clean.match(/Ganhos na app\s*([\d\s.,]+)/i);
        if (gMatch && type === 'statements') {
            const valor = parseNumericValue(gMatch[1]);
            VDCSystem.analysis.appGains += valor;
            QUICK_EXTRACTION.ganhos += valor;
            QUICK_EXTRACTION.valuesFound++;
            extractionStats.statements.values++;
            extractionStats.valuesFound++;
            extracted = true;
        }
        
        // Matcher para Comissões no Extrato
        const cMatch = clean.match(/"Comissão da app","-?([\d\s.,]+)"/i) ||
                      clean.match(/Despesas\s*-?\s*([\d\s.,]+)/i);
        if (cMatch && type === 'statements') {
            const valor = Math.abs(parseNumericValue(cMatch[1]));
            QUICK_EXTRACTION.comissoes += valor;
            extractionStats.statements.values++;
            extractionStats.valuesFound++;
        }
        
        // Matcher para FATURA (Total com IVA)
        const fMatch = clean.match(/"Total com IVA \(EUR\)","([\d\s.,]+)"/i) ||
                      clean.match(/Total com IVA \(EUR\)\s*([\d\s.,]+)/i) ||
                      clean.match(/A pagar[:\s]*€?\s*([\d\s.,]+)/i);
        if (fMatch && type === 'invoices') {
            const valor = parseNumericValue(fMatch[1]);
            VDCSystem.analysis.operatorInvoices += valor;
            QUICK_EXTRACTION.comissoes += valor;
            QUICK_EXTRACTION.valuesFound++;
            extractionStats.invoices.values++;
            extractionStats.valuesFound++;
            extracted = true;
        }
        
        // Matcher para Número da Fatura
        const numMatch = clean.match(/Fatura\s*n\.?º?\s*([A-Z0-9\-\s]+)/i);
        if (numMatch && type === 'invoices') {
            setElementText('invoiceNumero', numMatch[1].trim());
        }
        
        // Matcher para DAC7
        const dMatch = clean.match(/Total de receitas anuais[:\s]*€?\s*([\d\s.,]+)/i);
        if (dMatch && type === 'dac7') {
            const valor = parseNumericValue(dMatch[1]);
            VDCSystem.analysis.dac7Value = valor;
            QUICK_EXTRACTION.dac7 = valor;
            QUICK_EXTRACTION.valuesFound++;
            extractionStats.dac7.values++;
            extractionStats.valuesFound++;
            extracted = true;
        }
        
        // Atualizar contadores de PDFs processados
        extractionStats.pdfProcessed++;
        extractionStats[type].pdfs++;
        
        if (type === 'statements') extractionStats.boltFormat++;
        if (type === 'invoices') extractionStats.uberFormat++;
        
        return extracted;
        
    } catch (error) {
        logAudit(`❌ Erro PDF: ${error.message}`, 'error', true);
        return false;
    }
}

/**
 * Processa CSV de viagens
 */
function processCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                let total = 0;
                let count = 0;
                
                results.data.forEach(row => {
                    const val = row["Preço da viagem"] || 
                               row["Preço da viagem (sem IVA)"] || 
                               row["Total"];
                    if (val) {
                        total += parseNumericValue(val);
                        count++;
                    }
                });
                
                if (total > 0) {
                    VDCSystem.analysis.saftTotal += total;
                    QUICK_EXTRACTION.saft += total;
                    QUICK_EXTRACTION.valuesFound += count;
                    extractionStats.saft.values += count;
                    extractionStats.valuesFound += count;
                    extractionStats.pdfProcessed++;
                }
                
                resolve(true);
            },
            error: () => resolve(false)
        });
    });
}

// ============================================================================
// 6. HANDLE UPLOAD - EXTRAÇÃO IMEDIATA E SILENCIOSA
// ============================================================================

async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    VDCSystem.documents[type].files = files;
    
    showToast(`📂 ${files.length} ficheiro(s)`, 'info', 1500);
    
    for (const file of files) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            await processPDF(file, type);
        } else if (file.name.endsWith('.csv')) {
            await processCSV(file);
        }
    }
    
    extractionStats.valuesFound = QUICK_EXTRACTION.valuesFound;
    
    updateBoxStats(type);
    updateEvidenceSummary();
    renderAll();
    updateAnalysisButton();
}

/**
 * Atualiza estatísticas dentro de cada box do modal
 */
function updateBoxStats(type) {
    const stats = extractionStats[type] || { pdfs: 0, values: 0 };
    
    const pdfElement = document.getElementById(`box${type.charAt(0).toUpperCase() + type.slice(1)}Pdf`);
    const valElement = document.getElementById(`box${type.charAt(0).toUpperCase() + type.slice(1)}Values`);
    
    if (pdfElement) pdfElement.textContent = stats.pdfs;
    if (valElement) valElement.textContent = stats.values;
}

/**
 * Renderiza todos os componentes da interface
 */
function renderAll() {
    setElementText('detailValuesFound', extractionStats.valuesFound);
    setElementText('detailBoltFormat', extractionStats.boltFormat);
    setElementText('detailUberFormat', extractionStats.uberFormat);
    setElementText('detailPdfCount', extractionStats.pdfProcessed);
    
    setElementText('moduleStatsPdf', extractionStats.pdfProcessed);
    setElementText('moduleStatsValues', extractionStats.valuesFound);
    setElementText('moduleStatsBolt', extractionStats.boltFormat);
    
    setElementText('appGainsDisplay', formatCurrency(VDCSystem.analysis.appGains));
    setElementText('operatorInvoicesDisplay', formatCurrency(VDCSystem.analysis.operatorInvoices));
    setElementText('dac7ValueDisplay', formatCurrency(VDCSystem.analysis.dac7Value));
    setElementText('saftTotalDisplay', formatCurrency(VDCSystem.analysis.saftTotal));
    
    setElementText('stmtGanhosValue', formatCurrency(VDCSystem.analysis.appGains));
    setElementText('stmtComissaoValue', formatCurrency(VDCSystem.analysis.operatorInvoices));
    
    setElementText('dac7TotalValue', formatCurrency(VDCSystem.analysis.dac7Value));
    setElementText('dac7Q4Value', formatCurrency(VDCSystem.analysis.dac7Value));
    
    setElementText('saftBrutoValue', formatCurrency(VDCSystem.analysis.saftTotal));
    
    if (VDCSystem.analysis.operatorInvoices > 0) {
        setElementText('invoiceTotal', formatCurrency(VDCSystem.analysis.operatorInvoices));
    }
    
    updateExtractionStatus();
}

// ============================================================================
// 7. FUNÇÕES DE INTERFACE
// ============================================================================

function updateExtractionStatus() {
    const statusIcon = document.getElementById('extractionStatusIcon');
    const statusText = document.getElementById('extractionStatusText');
    
    if (QUICK_EXTRACTION.valuesFound > 0) {
        statusIcon.className = 'status-icon active';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = `${QUICK_EXTRACTION.valuesFound} valor(es) extraídos`;
    } else {
        statusIcon.className = 'status-icon';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = 'AGUARDANDO FICHEIROS';
    }
}

// ============================================================================
// 8. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupStaticListeners();
    populateAnoFiscal();
    startClockAndDate();
    setupKeyboardShortcuts();
    setupUploadListeners();
    
    logAudit('🔬 Sistema VDC v12.8 · Extração otimizada', 'info', false);
    logAudit('📂 Upload rápido e silencioso ativo', 'info', false);
});

function setupStaticListeners() {
    document.getElementById('startSessionBtn')?.addEventListener('click', startGatekeeperSession);
    document.getElementById('langToggleBtn')?.addEventListener('click', switchLanguage);
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'flex';
    });
    document.getElementById('closeHelpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'none';
    });
    
    document.getElementById('clearConsoleBtn')?.addEventListener('click', clearConsole);
    document.getElementById('clearConsoleBtn2')?.addEventListener('click', clearConsole);
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            document.getElementById('openEvidenceModalBtn')?.click();
        }
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (!document.getElementById('analyzeBtn').disabled) {
                document.getElementById('analyzeBtn')?.click();
            }
        }
    });
}

function startGatekeeperSession() {
    const splash = document.getElementById('splashScreen');
    const loading = document.getElementById('loadingOverlay');
    
    if (splash && loading) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            loading.style.display = 'flex';
            setTimeout(loadSystemCore, 500);
        }, 500);
    }
}

function loadSystemCore() {
    updateLoadingProgress(30);
    
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    setElementText('miniHash', VDCSystem.sessionId.substring(0, 8) + '...');
    
    setTimeout(() => {
        updateLoadingProgress(60);
        setupMainListeners();
        
        setTimeout(() => {
            updateLoadingProgress(90);
            generateMasterHash();
            
            setTimeout(() => {
                updateLoadingProgress(100);
                setTimeout(showMainInterface, 300);
            }, 200);
        }, 200);
    }, 200);
}

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `MÓDULO FORENSE v12.8... ${percent}%`;
}

function showMainInterface() {
    const loading = document.getElementById('loadingOverlay');
    const main = document.getElementById('mainContainer');
    
    if (loading && main) {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.style.display = 'none';
            main.style.display = 'block';
            setTimeout(() => main.style.opacity = '1', 50);
        }, 500);
    }
    
    logAudit('✅ Sistema pronto · Faça upload dos documentos', 'success', false);
    
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
    document.getElementById('exportJSONBtn').disabled = false;
    
    updateExtractionStatus();
}

function populateAnoFiscal() {
    const selectAno = document.getElementById('anoFiscal');
    if (!selectAno) return;
    
    const currentYear = new Date().getFullYear();
    selectAno.innerHTML = '';
    
    for (let ano = 2030; ano >= 2018; ano--) {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        if (ano === currentYear) opt.selected = true;
        selectAno.appendChild(opt);
    }
}

function startClockAndDate() {
    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('pt-PT', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        setElementText('currentDate', dateStr);
        setElementText('currentTime', timeStr);
    };
    update();
    setInterval(update, 1000);
}

function setupMainListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', openEvidenceModal);
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn')?.addEventListener('click', resetSystem);
    
    setupModalListeners();
}

function setupModalListeners() {
    const closeModal = () => {
        document.getElementById('evidenceModal').style.display = 'none';
        updateAnalysisButton();
        generateMasterHash();
    };
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeModal);
    document.getElementById('clearAllEvidenceBtn')?.addEventListener('click', clearAllEvidence);
    
    document.getElementById('evidenceModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'evidenceModal') closeModal();
    });
    
    document.getElementById('helpModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'helpModal') {
            document.getElementById('helpModal').style.display = 'none';
        }
    });
}

function setupUploadListeners() {
    const types = ['control', 'saft', 'invoices', 'statements', 'dac7'];
    
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
}

function openEvidenceModal() {
    document.getElementById('evidenceModal').style.display = 'flex';
    updateEvidenceSummary();
}

function updateEvidenceSummary() {
    const types = ['control', 'saft', 'invoices', 'statements', 'dac7'];
    
    types.forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const elId = `summary${k.charAt(0).toUpperCase() + k.slice(1)}`;
        setElementText(elId, count);
    });
    
    const total = types.reduce((sum, k) => sum + (VDCSystem.documents[k]?.files?.length || 0), 0);
    setElementText('summaryTotal', total);
    
    setElementText('controlCountCompact', VDCSystem.documents.control?.files?.length || 0);
    setElementText('saftCountCompact', VDCSystem.documents.saft?.files?.length || 0);
    setElementText('invoiceCountCompact', VDCSystem.documents.invoices?.files?.length || 0);
    setElementText('statementCountCompact', VDCSystem.documents.statements?.files?.length || 0);
    setElementText('dac7CountCompact', VDCSystem.documents.dac7?.files?.length || 0);
    setElementText('evidenceCountTotal', total);
}

function switchLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    document.getElementById('currentLangLabel').textContent = currentLang === 'pt' ? 'EN' : 'PT';
    logAudit(`🌐 Idioma: ${currentLang.toUpperCase()}`, 'info', true);
}

// ============================================================================
// 9. REGISTO DE CLIENTE
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();

    if (!name || name.length < 3) {
        showToast('Nome inválido', 'error');
        return;
    }
    if (!validateNIF(nif)) {
        showToast('NIF inválido', 'error');
        return;
    }

    VDCSystem.client = { name, nif, registeredAt: new Date().toISOString() };
    localStorage.setItem('vdc_client_data', JSON.stringify(VDCSystem.client));

    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);

    logAudit(`👤 Cliente: ${name} (${nif})`, 'success', false);
    showToast('Identidade validada', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 10. LIMPAR EVIDÊNCIAS
// ============================================================================
function clearAllEvidence() {
    if (!confirm('Tem a certeza que deseja limpar todas as evidências?')) return;
    
    VDCSystem.analysis.appGains = 0;
    VDCSystem.analysis.operatorInvoices = 0;
    VDCSystem.analysis.dac7Value = 0;
    VDCSystem.analysis.saftTotal = 0;
    
    QUICK_EXTRACTION.ganhos = 0;
    QUICK_EXTRACTION.comissoes = 0;
    QUICK_EXTRACTION.dac7 = 0;
    QUICK_EXTRACTION.saft = 0;
    QUICK_EXTRACTION.valuesFound = 0;
    
    extractionStats.pdfProcessed = 0;
    extractionStats.valuesFound = 0;
    extractionStats.boltFormat = 0;
    extractionStats.uberFormat = 0;
    extractionStats.saft = { pdfs: 0, values: 0 };
    extractionStats.invoices = { pdfs: 0, values: 0 };
    extractionStats.statements = { pdfs: 0, values: 0 };
    extractionStats.dac7 = { pdfs: 0, values: 0 };
    
    VDCSystem.documents = {
        control: { files: [] },
        saft: { files: [] },
        invoices: { files: [] },
        statements: { files: [] },
        dac7: { files: [] }
    };
    
    ['controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 
     'statementsFileListModal', 'dac7FileListModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    
    setElementText('invoiceNumero', '---');
    setElementText('invoiceTotal', '0,00 €');
    setElementText('invoiceAutoliquidacao', '0,00 €');
    
    ['saft', 'invoices', 'statements', 'dac7'].forEach(type => {
        updateBoxStats(type);
    });
    
    renderAll();
    updateEvidenceSummary();
    generateMasterHash();
    
    logAudit('🗑️ Todas as evidências removidas', 'warn', false);
    showToast('Evidências removidas', 'warning');
}

// ============================================================================
// 11. MODO DEMO
// ============================================================================
function activateDemoMode() {
    if (VDCSystem.processing) return;
    
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;

    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) {
        demoBtn.disabled = true;
        demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO...';
    }

    logAudit('🎮 Ativando caso simulado...', 'info', false);

    document.getElementById('clientNameFixed').value = 'Momento Eficaz - Unip, Lda';
    document.getElementById('clientNIFFixed').value = '517905450';
    registerClient();

    setTimeout(() => {
        VDCSystem.analysis.appGains = 3157.94;
        VDCSystem.analysis.operatorInvoices = 239.00;
        VDCSystem.analysis.dac7Value = 7755.16;
        VDCSystem.analysis.saftTotal = 12500.00;
        
        QUICK_EXTRACTION.ganhos = 3157.94;
        QUICK_EXTRACTION.comissoes = 792.59;
        QUICK_EXTRACTION.dac7 = 7755.16;
        QUICK_EXTRACTION.saft = 12500.00;
        QUICK_EXTRACTION.valuesFound = 15;
        
        extractionStats.pdfProcessed = 3;
        extractionStats.valuesFound = 15;
        extractionStats.boltFormat = 2;
        extractionStats.statements = { pdfs: 1, values: 5 };
        extractionStats.invoices = { pdfs: 1, values: 3 };
        extractionStats.dac7 = { pdfs: 1, values: 7 };
        
        setElementText('invoiceNumero', 'PT1125-3582');
        setElementText('invoiceTotal', formatCurrency(239.00));
        
        renderAll();
        updateEvidenceSummary();
        
        logAudit('✅ Caso simulado carregado', 'success', false);
        
        VDCSystem.processing = false;
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-flask"></i> CASO SIMULADO';
        }
    }, 800);
}

// ============================================================================
// 12. PERÍCIA FORENSE
// ============================================================================
function performAudit() {
    if (!VDCSystem.client) {
        showToast('Registe o cliente primeiro', 'error');
        return;
    }

    if (QUICK_EXTRACTION.valuesFound === 0) {
        showToast('Carregue ficheiros primeiro', 'error');
        return;
    }

    VDCSystem.performanceTiming.start = performance.now();

    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A EXECUTAR...';
    }

    setTimeout(() => {
        try {
            const grossRevenue = VDCSystem.analysis.appGains || QUICK_EXTRACTION.ganhos;
            const platformCommission = -(VDCSystem.analysis.operatorInvoices || QUICK_EXTRACTION.comissoes);
            const faturaPlataforma = VDCSystem.analysis.operatorInvoices || 0;

            performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);
            updateDashboard();
            renderChart();
            showAlerts();

            const duration = (performance.now() - VDCSystem.performanceTiming.start).toFixed(2);
            logAudit(`⚖️ Perícia: ${duration}ms · ${VDCSystem.analysis.verdict.level}`, 'success', false);

        } catch (error) {
            logAudit(`❌ Erro: ${error.message}`, 'error', false);
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="fas fa-search-dollar"></i> EXECUTAR PERÍCIA FORENSE';
            }
        }
    }, 500);
}

function performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma) {
    const ev = VDCSystem.analysis.extractedValues;
    
    ev.rendimentosBrutos = forensicRound(grossRevenue);
    ev.comissaoApp = forensicRound(platformCommission);
    ev.faturaPlataforma = forensicRound(faturaPlataforma);

    const comissaoAbs = forensicRound(Math.abs(ev.comissaoApp));
    const diferencial = forensicRound(Math.abs(comissaoAbs - ev.faturaPlataforma));

    ev.diferencialCusto = diferencial;
    VDCSystem.analysis.crossings.delta = diferencial;

    ev.iva23 = forensicRound(diferencial * 0.23);
    ev.jurosMora = forensicRound(ev.iva23 * 0.04);
    ev.jurosCompensatorios = forensicRound(ev.iva23 * 0.06);
    ev.multaDolo = forensicRound(diferencial * 0.10);
    ev.quantumBeneficio = 38000 * 12 * 7;

    VDCSystem.analysis.verdict = getRiskVerdict(diferencial, ev.rendimentosBrutos);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const netValue = (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0);

    setElementText('statNet', formatCurrency(netValue));
    setElementText('statComm', formatCurrency(Math.abs(ev.comissaoApp || 0)));
    setElementText('statJuros', formatCurrency(ev.diferencialCusto || 0));

    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiCommValue', formatCurrency(Math.abs(ev.comissaoApp || 0)));
    setElementText('kpiNetValue', formatCurrency(netValue));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));

    setElementText('quantumValue', formatCurrency(ev.quantumBeneficio || 0));

    const jurosCard = document.getElementById('jurosCard');
    if (jurosCard) jurosCard.style.display = (ev.diferencialCusto > 0) ? 'block' : 'none';
    
    const quantumBox = document.getElementById('quantumBox');
    if (quantumBox) quantumBox.style.display = (ev.quantumBeneficio > 0) ? 'block' : 'none';
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    const verdictDisplay = document.getElementById('verdictDisplay');
    if (verdictDisplay && VDCSystem.analysis.verdict) {
        verdictDisplay.style.display = 'block';
        verdictDisplay.className = `verdict-display active verdict-${VDCSystem.analysis.verdict.key}`;
        setElementText('verdictLevel', VDCSystem.analysis.verdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.verdict.description);
        setElementText('verdictPercentValue', VDCSystem.analysis.verdict.percent);
        document.getElementById('verdictLevel').style.color = VDCSystem.analysis.verdict.color;
    }

    const bigDataAlert = document.getElementById('bigDataAlert');
    if (bigDataAlert) {
        if (cross.bigDataAlertActive && ev.diferencialCusto > 0.01) {
            bigDataAlert.style.display = 'flex';
            bigDataAlert.classList.add('alert-active');
            setElementText('alertDeltaValue', formatCurrency(ev.diferencialCusto));
        } else {
            bigDataAlert.style.display = 'none';
            bigDataAlert.classList.remove('alert-active');
        }
    }
}

function renderChart() {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;
    if (VDCSystem.chart) VDCSystem.chart.destroy();

    const ev = VDCSystem.analysis.extractedValues;
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto (App)', 'Comissões', 'Líquido', 'Faturado', 'Fosso Fiscal'],
            datasets: [{
                label: 'Valor (€)',
                data: [
                    ev.rendimentosBrutos || QUICK_EXTRACTION.ganhos || 0,
                    Math.abs(ev.comissaoApp || QUICK_EXTRACTION.comissoes || 0),
                    (ev.rendimentosBrutos || QUICK_EXTRACTION.ganhos || 0) - (Math.abs(ev.comissaoApp || QUICK_EXTRACTION.comissoes || 0)),
                    ev.faturaPlataforma || 0,
                    ev.diferencialCusto || 0
                ],
                backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444'],
                borderColor: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: '#b8c6e0',
                        callback: (v) => v.toLocaleString('pt-PT') + ' €'
                    }
                },
                x: { 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { color: '#b8c6e0' } 
                }
            }
        }
    });
}

// ============================================================================
// 13. EXPORTAÇÕES
// ============================================================================
function exportDataJSON() {
    const exportData = {
        metadata: {
            version: 'v12.8',
            sessionId: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            client: VDCSystem.client,
            extractionStats: { ...extractionStats }
        },
        analysis: {
            appGains: VDCSystem.analysis.appGains,
            operatorInvoices: VDCSystem.analysis.operatorInvoices,
            dac7Value: VDCSystem.analysis.dac7Value,
            saftTotal: VDCSystem.analysis.saftTotal,
            verdict: VDCSystem.analysis.verdict,
            extractedValues: VDCSystem.analysis.extractedValues
        },
        quickExtraction: { ...QUICK_EXTRACTION }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    logAudit('📄 JSON exportado', 'success', false);
    showToast('JSON probatório exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Sem cliente registado', 'error');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        logAudit('❌ jsPDF não carregado', 'error', false);
        return;
    }

    logAudit('📑 A gerar PDF...', 'info', false);

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const verdict = VDCSystem.analysis.verdict || { level: 'N/A', percent: '0.00%' };

        let y = 30;

        doc.setFillColor(2, 6, 23);
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(18);
        doc.text('VDC FORENSE', 105, 15, { align: 'center' });
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('PARECER PERICIAL', 105, 22, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`Cliente: ${VDCSystem.client.name}`, 14, y); y += 8;
        doc.text(`NIF: ${VDCSystem.client.nif}`, 14, y); y += 8;
        doc.text(`Sessão: ${VDCSystem.sessionId}`, 14, y); y += 15;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 229, 255);
        doc.text('RESULTADOS DA EXTRAÇÃO', 14, y); y += 8;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Ganhos App: ${formatCurrency(VDCSystem.analysis.appGains)}`, 14, y); y += 6;
        doc.text(`Comissões: ${formatCurrency(VDCSystem.analysis.operatorInvoices)}`, 14, y); y += 6;
        doc.text(`DAC7: ${formatCurrency(VDCSystem.analysis.dac7Value)}`, 14, y); y += 6;
        doc.text(`SAF-T/CSV: ${formatCurrency(VDCSystem.analysis.saftTotal)}`, 14, y); y += 15;
        
        doc.setTextColor(0, 229, 255);
        doc.text('VEREDICTO', 14, y); y += 8;
        
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(14);
        doc.text(`${verdict.level} - ${verdict.percent}`, 14, y); y += 15;
        
        doc.setFillColor(2, 6, 23);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.text(`HASH: ${VDCSystem.masterHash || 'N/A'}`, 105, 287, { align: 'center' });
        doc.text(`Gerado: ${new Date().toLocaleString('pt-PT')}`, 105, 292, { align: 'center' });
        
        doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
        logAudit('✅ PDF exportado', 'success', false);
        showToast('PDF gerado', 'success');

    } catch (error) {
        logAudit(`❌ Erro PDF: ${error.message}`, 'error', false);
    }
}

// ============================================================================
// 14. FUNÇÕES AUXILIARES
// ============================================================================
function generateMasterHash() {
    const data = JSON.stringify({
        client: VDCSystem.client,
        session: VDCSystem.sessionId,
        quick: QUICK_EXTRACTION,
        timestamp: Date.now()
    });
    VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
    setElementText('miniHash', VDCSystem.masterHash.substring(0, 8) + '...');
}

function logAudit(message, type = 'info', showInConsole = true) {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const entry = { timestamp, message, type };
    VDCSystem.logs.push(entry);

    if (showInConsole) {
        const consoleOutput = document.getElementById('consoleOutput');
        if (consoleOutput) {
            const logEl = document.createElement('div');
            logEl.className = `log-entry log-${type}`;
            logEl.textContent = `[${timestamp}] ${message}`;
            consoleOutput.appendChild(logEl);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><p>${message}</p>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function clearConsole() {
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) consoleOutput.innerHTML = '';
    VDCSystem.logs = [];
    logAudit('🧹 Console limpo', 'info', false);
    showToast('Console limpo', 'info');
}

function resetSystem() {
    if (!confirm('Reiniciar sistema? Todos os dados serão perdidos.')) return;
    localStorage.clear();
    location.reload();
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (btn) {
        btn.disabled = !VDCSystem.client || QUICK_EXTRACTION.valuesFound === 0;
    }
}

// ============================================================================
// 15. SEGURANÇA
// ============================================================================
(function initSecurity() {
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.master-hash') || e.target.closest('.session-id')) {
            e.preventDefault();
        }
    });
})();

/* =====================================================================
   FIM DO FICHEIRO SCRIPT.JS · v12.8 FINAL
   EXTRAÇÃO OTIMIZADA · SILENCIOSA · RÁPIDA
   ===================================================================== */
