/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.8 FINAL
 * ====================================================================
 * EXTRAÇÃO INSTANTÂNEA · SEM DEPENDÊNCIA DO BOTÃO ANALISAR
 * TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.8 FINAL · EXTRAÇÃO INSTANTÂNEA ATIVA');

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

// Estatísticas de extração
const extractionStats = {
    pdfProcessed: 0,
    valuesFound: 0,
    boltFormat: 0,
    uberFormat: 0,
    pdfTables: 0
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
// 4. SISTEMA DE TRADUÇÕES (SIMPLIFICADO)
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR PERÍCIA v12.8",
        navDemo: "CASO SIMULADO",
        langBtn: "EN",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics",
        sidebarIdTitle: "IDENTIFICAÇÃO DO SUJEITO PASSIVO",
        lblClientName: "Nome / Denominação Social",
        lblNIF: "NIF / Número de Identificação Fiscal",
        btnRegister: "VALIDAR IDENTIDADE",
        sidebarParamTitle: "PARÂMETROS DE AUDITORIA FORENSE",
        lblFiscalYear: "ANO FISCAL EM EXAME",
        lblPeriodo: "PERÍODO TEMPORAL",
        lblPlatform: "PLATAFORMA DIGITAL",
        btnEvidence: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        btnAnalyze: "EXECUTAR PERÍCIA FORENSE",
        btnPDF: "PARECER PERICIAL",
        cardNet: "VALOR LÍQUIDO RECONSTRUÍDO",
        cardComm: "COMISSÕES DETETADAS",
        cardJuros: "FOSSO FISCAL",
        kpiTitle: "TRIANGULAÇÃO FINANCEIRA · ALGORITMO FORENSE v12.8",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÕES",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURADO",
        consoleTitle: "LOG DE CUSTÓDIA · CADEIA DE CUSTÓDIA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.8)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T (PT) / CSV VIAGENS",
        uploadInvoiceText: "FATURAS BOLT (PDF)",
        uploadStatementText: "EXTRATOS BOLT (PDF)",
        uploadDac7Text: "DECLARAÇÃO DAC7 (PDF)",
        summaryTitle: "RESUMO DE PROCESSAMENTO PROBATÓRIO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Indício de fraude fiscal não justificada:",
        moduleSaftTitle: "MÓDULO SAF-T (EXTRAÇÃO)",
        moduleStatementTitle: "MÓDULO EXTRATOS (BOLT)",
        moduleDac7Title: "MÓDULO DAC7 (DECOMPOSIÇÃO)",
        saftIliquido: "Valor Ilíquido Total",
        saftIva: "Total IVA",
        saftBruto: "Valor Bruto Total",
        stmtGanhos: "Ganhos na App",
        stmtCampanhas: "Campanhas",
        stmtGorjetas: "Gorjetas",
        stmtPortagens: "Portagens",
        stmtTaxasCancel: "Taxas Cancelamento",
        dac7Q1: "1.º Trimestre",
        dac7Q2: "2.º Trimestre",
        dac7Q3: "3.º Trimestre",
        dac7Q4: "4.º Trimestre",
        quantumTitle: "QUANTUM DO BENEFÍCIO ILÍCITO (ART. 103.º RGIT)",
        quantumFormula: "Fórmula: 38.000 motoristas × 12 meses × 7 anos",
        quantumNote: "Impacto Global Estimado de Mercado (Acumulado 7 Anos)",
        verdictPercent: "Desvio Calculado"
    },
    en: {
        startBtn: "START FORENSIC EXAM v12.8",
        navDemo: "SIMULATED CASE",
        langBtn: "PT",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics",
        sidebarIdTitle: "TAXPAYER IDENTIFICATION",
        lblClientName: "Name / Corporate Name",
        lblNIF: "Tax ID / NIF",
        btnRegister: "VALIDATE IDENTITY",
        sidebarParamTitle: "FORENSIC AUDIT PARAMETERS",
        lblFiscalYear: "FISCAL YEAR UNDER EXAM",
        lblPeriodo: "TIME PERIOD",
        lblPlatform: "DIGITAL PLATFORM",
        btnEvidence: "DIGITAL EVIDENCE MANAGEMENT",
        btnAnalyze: "EXECUTE FORENSIC EXAM",
        btnPDF: "EXPERT REPORT",
        cardNet: "RECONSTRUCTED NET VALUE",
        cardComm: "DETECTED COMMISSIONS",
        cardJuros: "TAX GAP",
        kpiTitle: "FINANCIAL TRIANGULATION · FORENSIC ALGORITHM v12.8",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSIONS",
        kpiNetText: "NET",
        kpiInvText: "INVOICED",
        consoleTitle: "CUSTODY LOG · CHAIN OF CUSTODY",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.8)",
        modalTitle: "DIGITAL EVIDENCE MANAGEMENT",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T FILES (PT) / CSV TRIPS",
        uploadInvoiceText: "BOLT INVOICES (PDF)",
        uploadStatementText: "BOLT STATEMENTS (PDF)",
        uploadDac7Text: "DAC7 DECLARATION (PDF)",
        summaryTitle: "EVIDENCE PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified tax fraud indication:",
        moduleSaftTitle: "SAF-T MODULE (EXTRACTION)",
        moduleStatementTitle: "STATEMENT MODULE (BOLT)",
        moduleDac7Title: "DAC7 MODULE (BREAKDOWN)",
        saftIliquido: "Total Net Value",
        saftIva: "Total VAT",
        saftBruto: "Total Gross Value",
        stmtGanhos: "App Earnings",
        stmtCampanhas: "Campaigns",
        stmtGorjetas: "Tips",
        stmtPortagens: "Tolls",
        stmtTaxasCancel: "Cancellation Fees",
        dac7Q1: "1st Quarter",
        dac7Q2: "2nd Quarter",
        dac7Q3: "3rd Quarter",
        dac7Q4: "4th Quarter",
        quantumTitle: "ILLICIT BENEFIT AMOUNT (ART. 103 RGIT)",
        quantumFormula: "Formula: 38,000 drivers × 12 months × 7 years",
        quantumNote: "Estimated Global Market Impact (7-Year Cumulative)",
        verdictPercent: "Calculated Deviation"
    }
};

let currentLang = 'pt';

// ============================================================================
// 5. ESTADO GLOBAL (INICIALIZADO COM ZEROS)
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
        dac7Total: 0,
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
// 6. FUNÇÕES DE EXTRAÇÃO ESPECÍFICAS
// ============================================================================

/**
 * Processa PDF de Extrato Bolt - Extração Imediata
 */
async function processBoltStatement(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + ' ';
        }
        
        const cleanText = fullText.replace(/\s+/g, ' ');
        
        let extracted = false;
        
        const gainsMatch = cleanText.match(/"Ganhos na app"\s*,\s*"([\d\s.,]+)"/i);
        if (gainsMatch) {
            const valor = parseNumericValue(gainsMatch[1]);
            VDCSystem.analysis.appGains += valor;
            QUICK_EXTRACTION.ganhos += valor;
            extractionStats.valuesFound++;
            extracted = true;
            logAudit(`Extrato: Ganhos na app = ${formatCurrency(valor)}`, 'success');
        }
        
        if (!gainsMatch) {
            const gainsSimple = cleanText.match(/Ganhos na app\s*([\d\s.,]+)/i);
            if (gainsSimple) {
                const valor = parseNumericValue(gainsSimple[1]);
                VDCSystem.analysis.appGains += valor;
                QUICK_EXTRACTION.ganhos += valor;
                extractionStats.valuesFound++;
                extracted = true;
                logAudit(`Extrato: Ganhos na app (simples) = ${formatCurrency(valor)}`, 'success');
            }
        }
        
        const expensesMatch = cleanText.match(/Despesas\s*-?\s*([\d\s.,]+)/i);
        if (expensesMatch) {
            const valor = Math.abs(parseNumericValue(expensesMatch[1]));
            QUICK_EXTRACTION.comissoes += valor;
            extractionStats.valuesFound++;
            logAudit(`Extrato: Despesas/Comissões = ${formatCurrency(valor)}`, 'success');
        }
        
        const campaignMatch = cleanText.match(/Ganhos da campanha\s*([\d\s.,]+)/i);
        if (campaignMatch) {
            const valor = parseNumericValue(campaignMatch[1]);
            extractionStats.valuesFound++;
            logAudit(`Extrato: Campanhas = ${formatCurrency(valor)}`, 'info');
        }
        
        const tipsMatch = cleanText.match(/Gorjetas dos passageiros\s*([\d\s.,]+)/i);
        if (tipsMatch) {
            const valor = parseNumericValue(tipsMatch[1]);
            extractionStats.valuesFound++;
            logAudit(`Extrato: Gorjetas = ${formatCurrency(valor)}`, 'info');
        }
        
        const cancelMatch = cleanText.match(/Taxas de cancelamento\s*([\d\s.,]+)/i);
        if (cancelMatch) {
            const valor = parseNumericValue(cancelMatch[1]);
            extractionStats.valuesFound++;
            logAudit(`Extrato: Taxas cancelamento = ${formatCurrency(valor)}`, 'info');
        }
        
        extractionStats.boltFormat++;
        
        return extracted;
        
    } catch (error) {
        logAudit(`Erro ao processar extrato: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Processa PDF de Fatura Bolt - Extração Imediata
 */
async function processBoltInvoice(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + ' ';
        }
        
        const cleanText = fullText.replace(/\s+/g, ' ');
        
        const invoiceMatch = cleanText.match(/"Total com IVA \(EUR\)"\s*,\s*"([\d\s.,]+)"/i);
        if (invoiceMatch) {
            const valor = parseNumericValue(invoiceMatch[1]);
            VDCSystem.analysis.operatorInvoices += valor;
            QUICK_EXTRACTION.comissoes += valor;
            extractionStats.valuesFound++;
            logAudit(`Fatura: Total com IVA = ${formatCurrency(valor)}`, 'success');
            return true;
        }
        
        const paymentMatch = cleanText.match(/A pagar[:\s]*€?\s*([\d\s.,]+)/i);
        if (paymentMatch) {
            const valor = parseNumericValue(paymentMatch[1]);
            VDCSystem.analysis.operatorInvoices += valor;
            QUICK_EXTRACTION.comissoes += valor;
            extractionStats.valuesFound++;
            logAudit(`Fatura: A pagar = ${formatCurrency(valor)}`, 'success');
            return true;
        }
        
        return false;
        
    } catch (error) {
        logAudit(`Erro ao processar fatura: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Processa PDF DAC7 - Extração Imediata
 */
async function processDac7(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + ' ';
        }
        
        const cleanText = fullText.replace(/\s+/g, ' ');
        
        const dac7Match = cleanText.match(/Total de receitas anuais[:\s]*€?\s*([\d\s.,]+)/i);
        if (dac7Match) {
            const valor = parseNumericValue(dac7Match[1]);
            VDCSystem.analysis.dac7Total = valor;
            QUICK_EXTRACTION.dac7 = valor;
            extractionStats.valuesFound++;
            logAudit(`DAC7: Total anual = ${formatCurrency(valor)}`, 'success');
            return true;
        }
        
        return false;
        
    } catch (error) {
        logAudit(`Erro ao processar DAC7: ${error.message}`, 'error');
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
                    const val = row["Preço da viagem"] || row["Preço da viagem (sem IVA)"] || row["Total"];
                    if (val) {
                        total += parseNumericValue(val);
                        count++;
                    }
                });
                
                if (total > 0) {
                    VDCSystem.analysis.saftTotal += total;
                    QUICK_EXTRACTION.saft += total;
                    extractionStats.valuesFound += count;
                    logAudit(`CSV: ${count} registos, total ${formatCurrency(total)}`, 'success');
                }
                
                resolve(true);
            },
            error: () => resolve(false)
        });
    });
}

// ============================================================================
// 7. FUNÇÃO PRINCIPAL DE HANDLE UPLOAD (EXTRAÇÃO INSTANTÂNEA)
// ============================================================================

/**
 * HANDLE UPLOAD CORRIGIDO - Extração imediata sem esperar pelo botão
 */
async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    VDCSystem.documents[type].files = files;
    logAudit(`${files.length} ficheiro(s) de ${type.toUpperCase()} carregados.`, 'info');
    
    showToast(`A processar ${type.toUpperCase()}...`, 'info');
    
    extractionStats.pdfProcessed += files.length;
    
    for (const file of files) {
        if (type === 'statement' && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            await processBoltStatement(file);
        } else if (type === 'invoice' && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            await processBoltInvoice(file);
        } else if (type === 'dac7' && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            await processDac7(file);
        } else if (file.name.endsWith('.csv')) {
            await processCSV(file);
        }
    }
    
    renderAll();
    
    updateAnalysisButton();
    showToast(`Processamento concluído. ${QUICK_EXTRACTION.valuesFound} valores extraídos.`, 'success');
}

/**
 * Renderiza todos os componentes da interface
 */
function renderAll() {
    setElementText('resGanhos', formatCurrency(QUICK_EXTRACTION.ganhos));
    setElementText('resComissao', formatCurrency(QUICK_EXTRACTION.comissoes));
    setElementText('resDac7', formatCurrency(QUICK_EXTRACTION.dac7));
    setElementText('resSaft', formatCurrency(QUICK_EXTRACTION.saft));
    
    setElementText('stmtGanhosValue', formatCurrency(QUICK_EXTRACTION.ganhos));
    setElementText('stmtComissaoValue', formatCurrency(QUICK_EXTRACTION.comissoes));
    setElementText('dac7TotalValue', formatCurrency(QUICK_EXTRACTION.dac7));
    setElementText('dac7Q4Value', formatCurrency(QUICK_EXTRACTION.dac7));
    setElementText('saftBrutoValue', formatCurrency(QUICK_EXTRACTION.saft));
    
    if (VDCSystem.analysis.operatorInvoices > 0) {
        setElementText('invoiceTotal', formatCurrency(VDCSystem.analysis.operatorInvoices));
    }
    
    setElementText('statsPdfCount', extractionStats.pdfProcessed);
    setElementText('statsValuesFound', extractionStats.valuesFound);
    setElementText('statsBoltFormat', extractionStats.boltFormat);
    
    setElementText('detailValuesFound', extractionStats.valuesFound);
    setElementText('detailBoltFormat', extractionStats.boltFormat);
    setElementText('detailPdfCount', extractionStats.pdfProcessed);
    
    updateExtractionStatus();
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
    setupQuickUpload();
    
    logAudit('Sistema VDC v12.8 inicializado · Extração instantânea ativa', 'success');
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

function setupQuickUpload() {
    const quickArea = document.getElementById('quickUploadArea');
    const quickInput = document.getElementById('quickUpload');
    const quickBtn = document.getElementById('quickUploadBtn');
    
    if (quickArea) {
        quickArea.addEventListener('click', () => quickInput.click());
        quickArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            quickArea.style.borderColor = 'var(--accent-primary)';
            quickArea.style.background = 'rgba(0, 229, 255, 0.05)';
        });
        quickArea.addEventListener('dragleave', () => {
            quickArea.style.borderColor = '#334155';
            quickArea.style.background = 'transparent';
        });
        quickArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            quickArea.style.borderColor = '#334155';
            quickArea.style.background = 'transparent';
            const files = Array.from(e.dataTransfer.files);
            await handleQuickUpload(files);
        });
    }
    
    if (quickBtn) {
        quickBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            quickInput.click();
        });
    }
    
    if (quickInput) {
        quickInput.addEventListener('change', async (e) => {
            await handleQuickUpload(Array.from(e.target.files));
        });
    }
}

async function handleQuickUpload(files) {
    for (const file of files) {
        logAudit(`Quick upload: ${file.name}`, 'info');
        
        if (file.name.includes('Ganhos') || file.name.includes('extrato')) {
            await processBoltStatement(file);
        } else if (file.name.includes('Fatura') || file.name.includes('invoice')) {
            await processBoltInvoice(file);
        } else if (file.name.includes('DAC7')) {
            await processDac7(file);
        } else if (file.name.endsWith('.csv')) {
            await processCSV(file);
        }
    }
    
    renderAll();
    logAudit(`Processamento rápido concluído.`, 'success');
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
    
    logAudit('SISTEMA VDC v12.8 ONLINE · EXTRAÇÃO INSTANTÂNEA', 'success');
    logAudit('Sessão: ' + VDCSystem.sessionId, 'info');
    logAudit('Carregue ficheiros - os dados aparecem automaticamente', 'info');
    
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
    document.getElementById('clearConsoleBtn')?.addEventListener('click', clearConsole);
    
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
    const types = ['control', 'saft', 'invoice', 'statement', 'dac7'];
    
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
    updateExtractionStatsModal();
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
}

function updateExtractionStatsModal() {
    setElementText('statsPdfCount', extractionStats.pdfProcessed);
    setElementText('statsValuesFound', extractionStats.valuesFound);
    setElementText('statsBoltFormat', extractionStats.boltFormat);
    setElementText('statsUberFormat', extractionStats.uberFormat || 0);
}

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

function switchLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    const t = translations[currentLang];
    
    document.getElementById('currentLangLabel').textContent = currentLang === 'pt' ? 'EN' : 'PT';
    logAudit(`Idioma alterado para: ${currentLang.toUpperCase()}`, 'info');
}

// ============================================================================
// 9. REGISTO DE CLIENTE
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();

    if (!name || name.length < 3) {
        showToast('Nome inválido (mínimo 3 caracteres)', 'error');
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

    logAudit(`Sujeito passivo registado: ${name} (NIF ${nif})`, 'success');
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
    VDCSystem.analysis.dac7Total = 0;
    VDCSystem.analysis.saftTotal = 0;
    
    QUICK_EXTRACTION.ganhos = 0;
    QUICK_EXTRACTION.comissoes = 0;
    QUICK_EXTRACTION.dac7 = 0;
    QUICK_EXTRACTION.saft = 0;
    QUICK_EXTRACTION.valuesFound = 0;
    
    extractionStats.pdfProcessed = 0;
    extractionStats.valuesFound = 0;
    extractionStats.boltFormat = 0;
    
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
    
    renderAll();
    generateMasterHash();
    
    logAudit('Todas as evidências foram removidas', 'warn');
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

    logAudit('ATIVANDO CASO SIMULADO...', 'info');

    document.getElementById('clientNameFixed').value = 'Momento Eficaz - Unip, Lda';
    document.getElementById('clientNIFFixed').value = '517905450';
    registerClient();

    setTimeout(() => {
        QUICK_EXTRACTION.ganhos = 3157.94;
        QUICK_EXTRACTION.comissoes = 792.59;
        QUICK_EXTRACTION.dac7 = 7755.16;
        QUICK_EXTRACTION.saft = 12500.00;
        QUICK_EXTRACTION.valuesFound = 15;
        
        extractionStats.pdfProcessed = 3;
        extractionStats.valuesFound = 15;
        extractionStats.boltFormat = 2;
        
        VDCSystem.analysis.appGains = 3157.94;
        VDCSystem.analysis.operatorInvoices = 239.00;
        VDCSystem.analysis.dac7Total = 7755.16;
        VDCSystem.analysis.saftTotal = 12500.00;
        
        setElementText('invoiceNumero', 'PT1125-3582');
        setElementText('invoiceTotal', formatCurrency(239.00));
        
        renderAll();
        
        logAudit('Caso simulado carregado com sucesso', 'success');
        
        VDCSystem.processing = false;
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-flask"></i> CASO SIMULADO';
        }
    }, 1000);
}

// ============================================================================
// 12. PERÍCIA FORENSE
// ============================================================================
function performAudit() {
    if (!VDCSystem.client) {
        showToast('Registe o sujeito passivo primeiro.', 'error');
        return;
    }

    if (QUICK_EXTRACTION.valuesFound === 0) {
        showToast('Carregue ficheiros antes de executar a perícia.', 'error');
        return;
    }

    VDCSystem.performanceTiming.start = performance.now();

    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A EXECUTAR PERÍCIA...';
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
            logAudit(`Perícia concluída em ${duration}ms. VEREDICTO: ${VDCSystem.analysis.verdict.level}`, 'success');

        } catch (error) {
            logAudit(`ERRO NA PERÍCIA: ${error.message}`, 'error');
            showToast('Erro durante a execução', 'error');
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
            dac7Total: VDCSystem.analysis.dac7Total,
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

    logAudit('JSON exportado', 'success');
    showToast('JSON probatório exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Sem sujeito passivo', 'error');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        logAudit('Erro: jsPDF não carregado.', 'error');
        return;
    }

    logAudit('A gerar PDF...', 'info');

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
        doc.text(`Ganhos App: ${formatCurrency(VDCSystem.analysis.appGains || QUICK_EXTRACTION.ganhos)}`, 14, y); y += 6;
        doc.text(`Comissões: ${formatCurrency(VDCSystem.analysis.operatorInvoices || QUICK_EXTRACTION.comissoes)}`, 14, y); y += 6;
        doc.text(`DAC7: ${formatCurrency(VDCSystem.analysis.dac7Total || QUICK_EXTRACTION.dac7)}`, 14, y); y += 6;
        doc.text(`SAF-T/CSV: ${formatCurrency(VDCSystem.analysis.saftTotal || QUICK_EXTRACTION.saft)}`, 14, y); y += 15;
        
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
        logAudit('PDF exportado', 'success');
        showToast('PDF gerado', 'success');

    } catch (error) {
        logAudit(`Erro PDF: ${error.message}`, 'error');
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

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const entry = { timestamp, message, type };
    VDCSystem.logs.push(entry);

    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
        const logEl = document.createElement('div');
        logEl.className = `log-entry log-${type}`;
        logEl.textContent = `[${timestamp}] ${message}`;
        consoleOutput.appendChild(logEl);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

function showToast(message, type = 'info') {
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
    }, 4000);
}

function clearConsole() {
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) consoleOutput.innerHTML = '';
    VDCSystem.logs = [];
    logAudit('Console limpo.', 'info');
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
   EXTRAÇÃO INSTANTÂNEA · SEM DEPENDÊNCIA DO BOTÃO
   ===================================================================== */
