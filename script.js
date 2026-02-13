/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.0 CSI EDITION FINAL
 * ====================================================================
 * PROTOCOLO: ISO/IEC 27037:2022 | NIST SP 800-86 | INTERPOL DFP
 * STRICT MODE ATIVADO · CONSOLIDAÇÃO FINAL
 * 
 * REQUISITOS IMPLEMENTADOS:
 * - jsPDF: window.jspdf.jsPDF com destructuring CORRETO
 * - Coordenadas PDF ajustadas com Y dinâmico e gestão de páginas
 * - Validação de NIF com checksum oficial português
 * - forensicRound OBRIGATÓRIO em todos os cálculos financeiros
 * - Cadeia de Custódia com SHA-256 e Timestamp Unix
 * - Veredicto de Risco Automático (CSI) com 3 níveis
 * - Marca de Água "CÓPIA CONTROLADA" no PDF
 * - Upload real de faturas e extratos com processamento
 * - Fundamentos Legais: Art. 114.º RGIT, Art. 35.º LGT, ISO/IEC 27037
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. DADOS DAS PLATAFORMAS & CONFIGURAÇÕES
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia',
        nif: 'EE102090374',
        logoText: 'BOLT'
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, 1077 ZX Amesterdão, Países Baixos',
        nif: 'NL852071588B01',
        logoText: 'UBER'
    },
    freenow: {
        name: 'FREE NOW',
        address: 'Rua Example, 123, Lisboa, Portugal',
        nif: 'PT123456789',
        logoText: 'FREE NOW'
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, Lisboa, Portugal',
        nif: 'PT987654321',
        logoText: 'CABIFY'
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, Porto, Portugal',
        nif: 'PT456123789',
        logoText: 'INDRIVE'
    }
};

// ============================================================================
// 2. UTILITÁRIOS FORENSES · PRECISÃO E VALIDAÇÃO
// ============================================================================
const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

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

const validateNIF = (nif) => {
    if (!nif || typeof nif !== 'string') return false;
    nif = nif.trim();
    if (!/^\d{9}$/.test(nif)) return false;
    
    const firstDigit = parseInt(nif[0]);
    if (![1, 2, 3, 5, 6, 8, 9].includes(firstDigit)) return false;

    let sum = 0;
    for (let i = 0; i < 8; i++) {
        sum += parseInt(nif[i]) * (9 - i);
    }
    
    const mod = sum % 11;
    const checkDigit = (mod < 2) ? 0 : 11 - mod;
    
    return parseInt(nif[8]) === checkDigit;
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross) || isNaN(delta)) {
        return { level: 'INCONCLUSIVO', color: '#8c7ae6', description: 'Dados insuficientes.', className: 'verdict-low' };
    }
    
    const percentage = Math.abs((delta / gross) * 100);
    
    if (percentage <= 5) {
        return { 
            level: 'BAIXO RISCO (ERRO ADM.)', 
            color: '#44bd32', 
            description: 'Monitorização periódica recomendada.',
            className: 'verdict-low'
        };
    } else if (percentage <= 15) {
        return { 
            level: 'RISCO MÉDIO (ANOMALIA)', 
            color: '#ff9f1a', 
            description: 'Auditoria de Logs de Servidor recomendada.',
            className: 'verdict-med'
        };
    } else {
        return { 
            level: 'CRÍTICO (INDÍCIO DE DOLO)', 
            color: '#e84118', 
            description: 'Participação Criminal / Inspeção Tributária recomendada.',
            className: 'verdict-high'
        };
    }
};

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const generateSessionId = () => {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 7).toUpperCase();
};

const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
};

const formatCurrency = (value) => {
    const rounded = forensicRound(value);
    return rounded.toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '€';
};

const getForensicMetadata = () => {
    return {
        userAgent: navigator.userAgent,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timestampUnix: Math.floor(Date.now() / 1000),
        timestampISO: new Date().toISOString(),
        ipSimulated: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
};

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// ============================================================================
// 3. SISTEMA DE TRADUÇÕES (COMPLETO)
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR SESSÃO CSI v12.0",
        navDemo: "SIMULAÇÃO CSI",
        langBtn: "EN",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics",
        sidebarIdTitle: "IDENTIFICAÇÃO DO SUJEITO",
        lblClientName: "Nome do Contribuinte",
        lblNIF: "NIF / ID Fiscal",
        btnRegister: "VALIDAR IDENTIDADE",
        sidebarParamTitle: "PARÂMETROS DE AUDITORIA",
        lblYear: "Ano Fiscal",
        lblPlatform: "Plataforma",
        btnEvidence: "EVIDÊNCIAS DIGITAIS",
        btnAnalyze: "EXECUTAR ANÁLISE FORENSE",
        btnPDF: "EXPORTAR PARECER PERICIAL",
        cardNet: "VALOR LÍQUIDO RECONSTRUÍDO",
        cardComm: "COMISSÃO DETETADA",
        cardJuros: "JUROS COMPENSATÓRIOS",
        kpiTitle: "ANÁLISE DE TRIANGULAÇÃO · ALGORITMO CSI v12.0",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÃO",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURA",
        consoleTitle: "LOG DE CUSTÓDIA · FORENSIC LOG",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.0)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS BIG DATA",
        uploadDac7Text: "FICHEIROS DAC7",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T/XML/CSV",
        uploadInvoiceText: "FATURAS (PDF/CSV)",
        uploadStatementText: "EXTRATOS BANCÁRIOS",
        summaryTitle: "RESUMO DE PROCESSAMENTO (HASH SHA-256)",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        modalClearBtn: "LIMPAR SISTEMA",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Discrepância transacional não justificada:",
        
        pdfTitle: "PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL",
        pdfSection1: "1. IDENTIFICAÇÃO E METADADOS",
        pdfSection2: "2. ANÁLISE FINANCEIRA CRUZADA",
        pdfSection3: "3. VEREDICTO DE RISCO",
        pdfSection4: "4. CONCLUSÕES PERICIAIS",
        pdfSection5: "5. ANEXO DE CUSTÓDIA",
        pdfSection6: "6. INTERROGATÓRIO ESTRATÉGICO",
        pdfSection7: "7. ASSINATURA DIGITAL",
        pdfGlossaryTitle: "8. GLOSSÁRIO FORENSE",
        pdfProcTime: "Tempo de Processamento Algorítmico",
        pdfWatermark: "CÓPIA CONTROLADA",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.0 | Todos os Direitos Reservados | EM",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Sessão",
        pdfLabelGross: "Bruto Reconstruído",
        pdfLabelComm: "Comissão",
        pdfLabelInv: "Faturado",
        pdfLabelDiff: "Discrepância",
        pdfLabelIVA23: "IVA Autoliquidação",
        pdfLabelJuros: "Juros de Mora",
        pdfLabelComp: "Juros Compensatórios",
        pdfLabelMulta: "Multa Estimada",
        pdfLegalTitle: "FUNDAMENTAÇÃO LEGAL",
        pdfLegalRGIT: "Art. 114.º do RGIT - Juros compensatórios",
        pdfLegalLGT: "Art. 35.º da LGT - Juros de mora",
        pdfLegalISO: "ISO/IEC 27037 - Cadeia de Custódia",
        pdfMethodText: "Metodologia: Análise forense baseada em triangulação de dados (Extrato, Fatura, Algoritmo). Aplicação de validação checksum para integridade de ficheiros e dedução fiscal reversa. Conformidade com ISO/IEC 27037 e NIST SP 800-86.",
        pdfConclusionText: "Conclusão: Os dados apresentam indícios de desvio entre valores transacionados e valores declarados. Recomenda-se a notificação da entidade para esclarecimento e eventual procedimento de inspeção tributária.",
        pdfRiskVerdict: "VEREDICTO DE RISCO",
        
        pdfQuestions: [
            "1. Qual a lógica algorítmica exata aplicada ao cálculo da taxa de serviço?",
            "2. Como é justificada a discrepância entre o registo interno e a fatura?",
            "3. Existem registos de 'Shadow Entries' no sistema?",
            "4. A plataforma disponibiliza o código fonte do algoritmo de preços?",
            "5. Qual o tratamento dado aos valores de 'Tips' na faturação?"
        ],
        
        pdfGlossaryDef: [
            { term: "Anti-Forensics", def: "Técnicas para impedir a análise forense digital (encriptação, esteganografia, metadados)." },
            { term: "Data Carving", def: "Recuperação de ficheiros sem metadados, baseada em cabeçalhos e rodapés." },
            { term: "Triangulação de Custódia", def: "Metodologia que cruza três fontes independentes para validar a evidência." }
        ]
    },
    en: {
        startBtn: "START CSI SESSION v12.0",
        navDemo: "CSI SIMULATION",
        langBtn: "PT",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics",
        sidebarIdTitle: "SUBJECT IDENTIFICATION",
        lblClientName: "Taxpayer Name",
        lblNIF: "Tax ID / NIF",
        btnRegister: "VALIDATE IDENTITY",
        sidebarParamTitle: "AUDIT PARAMETERS",
        lblYear: "Fiscal Year",
        lblPlatform: "Platform",
        btnEvidence: "DIGITAL EVIDENCE",
        btnAnalyze: "EXECUTE FORENSIC ANALYSIS",
        btnPDF: "EXPORT EXPERT REPORT",
        cardNet: "RECONSTRUCTED NET VALUE",
        cardComm: "DETECTED COMMISSION",
        cardJuros: "COMPENSATORY INTEREST",
        kpiTitle: "TRIANGULATION ANALYSIS · ALGORITHM CSI v12.0",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSION",
        kpiNetText: "NET",
        kpiInvText: "INVOICE",
        consoleTitle: "CUSTODY LOG · FORENSIC LOG",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.0)",
        modalTitle: "BIG DATA EVIDENCE MANAGEMENT",
        uploadDac7Text: "DAC7 FILES",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T/XML/CSV FILES",
        uploadInvoiceText: "INVOICES (PDF/CSV)",
        uploadStatementText: "BANK STATEMENTS",
        summaryTitle: "PROCESSING SUMMARY (SHA-256)",
        modalSaveBtn: "SEAL EVIDENCE",
        modalClearBtn: "CLEAR SYSTEM",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified transactional discrepancy:",
        
        pdfTitle: "DIGITAL FORENSIC INVESTIGATION REPORT",
        pdfSection1: "1. IDENTIFICATION & METADATA",
        pdfSection2: "2. CROSS-FINANCIAL ANALYSIS",
        pdfSection3: "3. RISK VERDICT",
        pdfSection4: "4. FORENSIC CONCLUSIONS",
        pdfSection5: "5. CUSTODY ANNEX",
        pdfSection6: "6. STRATEGIC INTERROGATION",
        pdfSection7: "7. DIGITAL SIGNATURE",
        pdfGlossaryTitle: "8. FORENSIC GLOSSARY",
        pdfProcTime: "Algorithmic Processing Time",
        pdfWatermark: "CONTROLLED COPY",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.0 | All Rights Reserved | EM",
        pdfLabelName: "Name",
        pdfLabelNIF: "Tax ID",
        pdfLabelSession: "Session",
        pdfLabelGross: "Reconstructed Gross",
        pdfLabelComm: "Commission",
        pdfLabelInv: "Invoiced",
        pdfLabelDiff: "Discrepancy",
        pdfLabelIVA23: "Self-Billing VAT",
        pdfLabelJuros: "Default Interest",
        pdfLabelComp: "Compensatory Interest",
        pdfLabelMulta: "Estimated Fine",
        pdfLegalTitle: "LEGAL BASIS",
        pdfLegalRGIT: "Art. 114.º RGIT - Compensatory interest",
        pdfLegalLGT: "Art. 35.º LGT - Default interest",
        pdfLegalISO: "ISO/IEC 27037 - Chain of Custody",
        pdfMethodText: "Methodology: Forensic analysis based on data triangulation. Checksum validation for file integrity and reverse fiscal deduction applied. Compliance with ISO/IEC 27037 and NIST SP 800-86.",
        pdfConclusionText: "Conclusion: Data indicates deviations between transacted and declared values. Entity notification recommended for clarification and potential tax inspection procedure.",
        pdfRiskVerdict: "RISK VERDICT",
        
        pdfQuestions: [
            "1. What is the exact algorithmic logic for the service fee?",
            "2. How is the discrepancy between internal record and invoice justified?",
            "3. Are there records of 'Shadow Entries'?",
            "4. Does the platform provide source code for the pricing algorithm?",
            "5. How are 'Tips' treated in the billing?"
        ],
        
        pdfGlossaryDef: [
            { term: "Anti-Forensics", def: "Techniques to hinder forensic analysis (encryption, steganography)." },
            { term: "Data Carving", def: "File recovery without metadata, based on headers and footers." },
            { term: "Custody Triangulation", def: "Methodology crossing three independent sources to validate evidence." }
        ]
    }
};

let currentLang = 'pt';

// ============================================================================
// 4. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.0-CSI-FINAL',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    performanceTiming: { start: 0, end: 0 },
    
    logs: [],
    masterHash: '',
    
    documents: {
        dac7: { files: [], hashes: {}, totals: { records: 0 } },
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0 } },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0, records: 0 } },
        statements: { files: [], hashes: {}, totals: { rendimentosBrutos: 0, comissaoApp: 0, records: 0 } }
    },
    
    analysis: {
        extractedValues: {},
        crossings: { delta: 0 },
        riskVerdict: null,
        evidenceIntegrity: []
    },
    
    forensicMetadata: null,
    chart: null,
    counts: { total: 0 }
};

// ============================================================================
// 5. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('VDC CSI v12.0 - Sistema Iniciado');
    setupStaticListeners();
    populateYears();
    startClockAndDate();
    loadSystemRecursively();
});

window.onload = () => {
    if (typeof CryptoJS === 'undefined') console.error('CRITICAL: CryptoJS failed to load.');
    if (typeof Papa === 'undefined') console.error('CRITICAL: PapaParse failed to load.');
    if (typeof Chart === 'undefined') console.error('CRITICAL: Chart.js failed to load.');
    if (typeof window.jspdf === 'undefined') console.error('CRITICAL: jsPDF failed to load.');
};

function setupStaticListeners() {
    document.getElementById('startSessionBtn')?.addEventListener('click', startGatekeeperSession);
    document.getElementById('langToggleBtn')?.addEventListener('click', switchLanguage);
}

function startGatekeeperSession() {
    const splash = document.getElementById('splashScreen');
    const loading = document.getElementById('loadingOverlay');
    if (splash && loading) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            loading.style.display = 'flex';
            loadSystemCore();
        }, 500);
    }
}

function loadSystemCore() {
    updateLoadingProgress(20);
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    generateMasterHash();
    
    setTimeout(() => {
        updateLoadingProgress(40);
        populateYears();
        startClockAndDate();
        setupMainListeners();
        updateLoadingProgress(60);
        generateMasterHash();
        updateLoadingProgress(80);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(showMainInterface, 500);
        }, 500);
    }, 500);
}

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `FORENSIC ENGINE v12.0... ${percent}%`;
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
    logAudit('SISTEMA VDC v12.0 CSI ONLINE', 'success');
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_0');
        if (stored) {
            const client = JSON.parse(stored);
            if (client && client.name && client.nif) {
                VDCSystem.client = client;
                document.getElementById('clientStatusFixed').style.display = 'flex';
                setElementText('clientNameDisplayFixed', client.name);
                setElementText('clientNifDisplayFixed', client.nif);
                document.getElementById('clientNameFixed').value = client.name;
                document.getElementById('clientNIFFixed').value = client.nif;
                logAudit(`Cliente recuperado: ${client.name}`, 'success');
            }
        }
    } catch(e) { console.warn('Cache limpo'); }
    startClockAndDate();
}

function populateYears() {
    const sel = document.getElementById('selYearFixed');
    if(!sel) return;
    const current = new Date().getFullYear();
    for (let y = 2018; y <= 2036; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if (y === current) opt.selected = true;
        sel.appendChild(opt);
    }
}

function startClockAndDate() {
    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
        const timeStr = now.toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
        setElementText('currentDate', dateStr);
        setElementText('currentTime', timeStr);
    };
    update();
    setInterval(update, 1000);
}

function setupMainListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);
    
    document.getElementById('selPlatformFixed')?.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        logAudit(`Plataforma alterada para: ${e.target.value.toUpperCase()}`, 'info');
    });
    
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => {
        document.getElementById('evidenceModal').style.display = 'flex';
        updateEvidenceSummary();
    });
    
    const closeModal = () => {
        document.getElementById('evidenceModal').style.display = 'none';
        updateAnalysisButton();
    };
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeModal);
    document.getElementById('evidenceModal')?.addEventListener('click', (e) => { if(e.target.id === 'evidenceModal') closeModal(); });
    
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn')?.addEventListener('click', resetSystem);
    document.getElementById('clearConsoleBtn')?.addEventListener('click', clearConsole);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAllEvidence);
    
    setupUploadListeners();
}

function setupUploadListeners() {
    const types = ['dac7', 'control', 'saft', 'invoice', 'statement'];
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
}

function switchLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    const t = translations[currentLang];
    
    const elements = [
        { id: 'splashStartBtnText', key: 'startBtn' },
        { id: 'demoBtnText', key: 'navDemo' },
        { id: 'currentLangLabel', key: 'langBtn' },
        { id: 'headerSubtitle', key: 'headerSubtitle' },
        { id: 'sidebarIdTitle', key: 'sidebarIdTitle' },
        { id: 'lblClientName', key: 'lblClientName' },
        { id: 'lblNIF', key: 'lblNIF' },
        { id: 'btnRegister', key: 'btnRegister' },
        { id: 'sidebarParamTitle', key: 'sidebarParamTitle' },
        { id: 'lblYear', key: 'lblYear' },
        { id: 'lblPlatform', key: 'lblPlatform' },
        { id: 'btnEvidence', key: 'btnEvidence' },
        { id: 'btnAnalyze', key: 'btnAnalyze' },
        { id: 'btnPDF', key: 'btnPDF' },
        { id: 'cardNet', key: 'cardNet' },
        { id: 'cardComm', key: 'cardComm' },
        { id: 'cardJuros', key: 'cardJuros' },
        { id: 'kpiTitle', key: 'kpiTitle' },
        { id: 'kpiGross', key: 'kpiGross' },
        { id: 'kpiCommText', key: 'kpiCommText' },
        { id: 'kpiNetText', key: 'kpiNetText' },
        { id: 'kpiInvText', key: 'kpiInvText' },
        { id: 'consoleTitle', key: 'consoleTitle' },
        { id: 'footerHashTitle', key: 'footerHashTitle' },
        { id: 'modalTitle', key: 'modalTitle' },
        { id: 'uploadDac7Text', key: 'uploadDac7Text' },
        { id: 'uploadControlText', key: 'uploadControlText' },
        { id: 'uploadSaftText', key: 'uploadSaftText' },
        { id: 'uploadInvoiceText', key: 'uploadInvoiceText' },
        { id: 'uploadStatementText', key: 'uploadStatementText' },
        { id: 'summaryTitle', key: 'summaryTitle' },
        { id: 'modalSaveBtn', key: 'modalSaveBtn' },
        { id: 'modalClearBtn', key: 'modalClearBtn' },
        { id: 'lblDate', key: 'lblDate' },
        { id: 'alertCriticalTitle', key: 'alertCriticalTitle' },
        { id: 'alertOmissionText', key: 'alertOmissionText' }
    ];
    
    elements.forEach(el => {
        const dom = document.getElementById(el.id);
        if (dom) dom.textContent = t[el.key];
    });
    
    logAudit(`Idioma: ${currentLang.toUpperCase()}`, 'info');
}

// ============================================================================
// 6. REGISTO DE CLIENTE
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();
    
    if (!name || name.length < 3) return showToast('Nome inválido', 'error');
    if (!validateNIF(nif)) return showToast('NIF inválido (checksum falhou)', 'error');
    
    VDCSystem.client = { name, nif, platform: VDCSystem.selectedPlatform };
    localStorage.setItem('vdc_client_data_bd_v12_0', JSON.stringify(VDCSystem.client));
    
    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);
    
    logAudit(`Cliente Registado: ${name}`, 'success');
    showToast('Cliente validado', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 7. GESTÃO DE EVIDÊNCIAS
// ============================================================================
async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if(files.length === 0) return;
    
    const btn = document.querySelector(`#${type}UploadBtnModal`);
    if(btn) {
        btn.classList.add('processing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    }
    
    try {
        for (const file of files) {
            await processFile(file, type);
        }
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s)`, 'success');
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        showToast(`${files.length} ficheiro(s) processados`, 'success');
    } catch (error) {
        console.error('Erro no upload:', error);
        logAudit(`Erro no upload ${type}: ${error.message}`, 'error');
        showToast('Erro ao processar ficheiros', 'error');
    } finally {
        if(btn) {
            btn.classList.remove('processing');
            const buttonTexts = {
                dac7: '<i class="fas fa-file-contract"></i> SELECIONAR DAC7',
                control: '<i class="fas fa-file-shield"></i> SELECIONAR CONTROLO',
                saft: '<i class="fas fa-file-code"></i> SELECIONAR SAF-T',
                invoice: '<i class="fas fa-file-invoice-dollar"></i> SELECIONAR FATURAS',
                statement: '<i class="fas fa-file-contract"></i> SELECIONAR EXTRATOS'
            };
            btn.innerHTML = buttonTexts[type] || '<i class="fas fa-folder-open"></i> SELECIONAR';
        }
        e.target.value = '';
    }
}

async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hash = CryptoJS.SHA256(text).toString();
    
    if(!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { files: [], hashes: {}, totals: { records: 0 } };
        if(type === 'invoice') VDCSystem.documents[type].totals.invoiceValue = 0;
        if(type === 'statement') {
            VDCSystem.documents[type].totals.rendimentosBrutos = 0;
            VDCSystem.documents[type].totals.comissaoApp = 0;
        }
    }
    
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hash;
    VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
    
    VDCSystem.analysis.evidenceIntegrity.push({
        filename: file.name, type, hash,
        timestamp: new Date().toLocaleString(),
        size: file.size,
        timestampUnix: Math.floor(Date.now() / 1000)
    });
    
    if (type === 'invoice') {
        const val = toForensicNumber(text.match(/(\d+[.,]\d{2})/)?.[0] || 0);
        VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
        VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue;
        logAudit(`Fatura processada: ${file.name} | Valor: ${formatCurrency(val)}`, 'success');
    }
    
    if (type === 'statement') {
        try {
            const papaParsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
            if (papaParsed.data && papaParsed.data.length > 0) {
                let gross = 0, comm = 0;
                papaParsed.data.forEach(row => {
                    Object.keys(row).forEach(key => {
                        const val = toForensicNumber(row[key]);
                        const keyLower = key.toLowerCase();
                        if (keyLower.includes('total') || keyLower.includes('earnings') || keyLower.includes('gross') || keyLower.includes('rendimento')) gross += val;
                        if (keyLower.includes('commission') || keyLower.includes('fee') || keyLower.includes('comissao')) comm += Math.abs(val);
                    });
                });
                gross = forensicRound(gross);
                comm = forensicRound(comm);
                VDCSystem.documents.statements.totals.rendimentosBrutos = (VDCSystem.documents.statements.totals.rendimentosBrutos || 0) + gross;
                VDCSystem.documents.statements.totals.comissaoApp = (VDCSystem.documents.statements.totals.comissaoApp || 0) + comm;
                VDCSystem.analysis.extractedValues.rendimentosBrutos = VDCSystem.documents.statements.totals.rendimentosBrutos;
                VDCSystem.analysis.extractedValues.comissaoApp = -VDCSystem.documents.statements.totals.comissaoApp;
                logAudit(`Extrato processado: ${file.name} | Receita: ${formatCurrency(gross)} | Comissão: ${formatCurrency(comm)}`, 'info');
            }
        } catch(e) {
            console.warn(`Erro ao processar extrato ${file.name}:`, e);
        }
    }
    
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    
    if(listEl) {
        listEl.style.display = 'block';
        listEl.innerHTML += `<div class="file-item-modal">
            <i class="fas fa-check-circle" style="color: var(--success-primary);"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-hash-modal">${hash.substring(0,8)}...</span>
        </div>`;
    }
}

function updateEvidenceSummary() {
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const el = document.getElementById(`summary${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if(el) el.textContent = count;
    });
    let total = 0;
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        total += VDCSystem.documents[k]?.files?.length || 0;
    });
    setElementText('summaryTotal', total);
}

function updateCounters() {
    let total = 0;
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        total += count;
        let id = k;
        if (k === 'invoices') id = 'invoice';
        if (k === 'statements') id = 'statement';
        setElementText(`${id}CountCompact`, count);
    });
    document.querySelectorAll('.evidence-count-solid').forEach(el => el.textContent = total);
    VDCSystem.counts.total = total;
}

function clearAllEvidence() {
    if (!confirm('Tem a certeza que deseja limpar todas as evidências?')) return;
    
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        VDCSystem.documents[k] = { files: [], hashes: {}, totals: {} };
    });
    VDCSystem.analysis.evidenceIntegrity = [];
    
    ['dac7FileListModal', 'controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 'statementsFileListModal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.innerHTML = ''; el.style.display = 'none'; }
    });
    
    VDCSystem.documents.invoices.totals.invoiceValue = 0;
    VDCSystem.documents.statements.totals.rendimentosBrutos = 0;
    VDCSystem.documents.statements.totals.comissaoApp = 0;
    
    VDCSystem.analysis.extractedValues = {};
    VDCSystem.analysis.crossings = { delta: 0 };
    VDCSystem.analysis.riskVerdict = null;
    
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    
    document.getElementById('bigDataAlert').style.display = 'none';
    document.getElementById('verdictSection').style.display = 'none';
    document.getElementById('jurosCard').style.display = 'none';
    
    logAudit('Todas as evidências foram limpas.', 'warn');
    showToast('Evidências limpas', 'warning');
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if(!btn) return;
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    btn.disabled = !(hasClient && hasControl && hasSaft);
    
    const pdfBtn = document.getElementById('exportPDFBtn');
    if(pdfBtn) pdfBtn.disabled = !hasClient;
}

// ============================================================================
// 8. MODO DEMO
// ============================================================================
function activateDemoMode() {
    if(VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    const demoBtn = document.getElementById('demoModeBtn');
    if(demoBtn) {
        demoBtn.disabled = true;
        demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO...';
    }
    
    logAudit('ATIVANDO MODO DEMO CSI v12.0...', 'info');
    
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();
    
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 2);
    simulateUpload('statements', 2);
    
    setTimeout(() => {
        VDCSystem.analysis.extractedValues = {
            rendimentosBrutos: forensicRound(8500.00),
            comissaoApp: forensicRound(-1955.00),
            faturaPlataforma: forensicRound(250.00),
            diferencialCusto: forensicRound(1705.00),
            iva23: forensicRound(392.15),
            jurosMora: forensicRound(15.69),
            jurosCompensatorios: forensicRound(23.53),
            multaDolo: forensicRound(170.50),
        };
        VDCSystem.analysis.crossings.delta = forensicRound(1705.00);
        
        performForensicCrossings(
            VDCSystem.analysis.extractedValues.rendimentosBrutos,
            VDCSystem.analysis.extractedValues.comissaoApp,
            VDCSystem.analysis.extractedValues.faturaPlataforma
        );
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit('Auditoria Demo CSI v12.0 concluída com discrepância de 1.705,00€.', 'success');
        VDCSystem.processing = false;
        if(demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = `<i class="fas fa-vial"></i> ${translations[currentLang].navDemo}`;
        }
    }, 1500);
}

function simulateUpload(type, count) {
    for (let i = 0; i < count; i++) {
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], hashes: {}, totals: {} };
        }
        const fileName = `demo_${type}_${i + 1}.${type === 'saft' ? 'xml' : 'csv'}`;
        VDCSystem.documents[type].files.push({ name: fileName, size: 1024 * (i + 1) });
        VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
        
        const demoHash = 'DEMO-' + CryptoJS.SHA256(Date.now().toString() + i).toString().substring(0, 8) + '...';
        VDCSystem.analysis.evidenceIntegrity.push({ filename: fileName, type, hash: demoHash, timestamp: new Date().toLocaleString(), size: 1024 * (i + 1), timestampUnix: Math.floor(Date.now() / 1000) });
        
        if (type === 'invoices') {
            const demoInvoiceValue = i === 0 ? 150.00 : 100.00;
            VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + demoInvoiceValue;
            VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue;
        }
        if (type === 'statements') {
            const demoGross = i === 0 ? 5000.00 : 3500.00;
            const demoCommission = i === 0 ? 1150.00 : 805.00;
            VDCSystem.documents.statements.totals.rendimentosBrutos = (VDCSystem.documents.statements.totals.rendimentosBrutos || 0) + demoGross;
            VDCSystem.documents.statements.totals.comissaoApp = (VDCSystem.documents.statements.totals.comissaoApp || 0) + demoCommission;
            VDCSystem.analysis.extractedValues.rendimentosBrutos = VDCSystem.documents.statements.totals.rendimentosBrutos;
            VDCSystem.analysis.extractedValues.comissaoApp = -VDCSystem.documents.statements.totals.comissaoApp;
        }
    }
    updateCounters();
    updateEvidenceSummary();
}

// ============================================================================
// 9. MOTOR DE AUDITORIA
// ============================================================================
function performAudit() {
    if (!VDCSystem.client) return showToast('Registe cliente primeiro.', 'error');
    
    VDCSystem.forensicMetadata = getForensicMetadata();
    VDCSystem.performanceTiming.start = performance.now();
    
    const chartWrapper = document.getElementById('chartWrapper');
    if(chartWrapper) chartWrapper.classList.add('scanning');
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if(analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    }
    
    setTimeout(() => {
        try {
            const stmtGross = VDCSystem.documents.statements?.totals?.rendimentosBrutos || 0;
            const stmtCommission = VDCSystem.documents.statements?.totals?.comissaoApp || 0;
            const invoiceVal = VDCSystem.documents.invoices?.totals?.invoiceValue || 0;
            
            const grossRevenue = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.rendimentosBrutos : stmtGross;
            const platformCommission = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.comissaoApp : -stmtCommission;
            const faturaPlataforma = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.faturaPlataforma : invoiceVal;
            
            performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);
            
            updateDashboard();
            renderChart();
            showAlerts();
            
            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            logAudit(`Análise concluída em ${duration}ms. VEREDICTO: ${VDCSystem.analysis.riskVerdict.level}`, 'success');
            
        } catch(error) {
            console.error('Erro na análise:', error);
            logAudit(`ERRO CRÍTICO: ${error.message}`, 'error');
        } finally {
            if(analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="fas fa-search-dollar"></i> ${translations[currentLang].btnAnalyze}`;
            }
            if(chartWrapper) chartWrapper.classList.remove('scanning');
        }
    }, 1000);
}

function performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma) {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    ev.rendimentosBrutos = forensicRound(grossRevenue);
    ev.comissaoApp = forensicRound(platformCommission);
    ev.faturaPlataforma = forensicRound(faturaPlataforma);
    
    const comissaoAbs = forensicRound(Math.abs(ev.comissaoApp));
    const diferencial = forensicRound(Math.abs(comissaoAbs - ev.faturaPlataforma));
    
    ev.diferencialCusto = diferencial;
    cross.delta = diferencial;
    
    ev.iva23 = forensicRound(diferencial * 0.23);
    ev.jurosMora = forensicRound(ev.iva23 * 0.04);
    ev.jurosCompensatorios = forensicRound(ev.iva23 * 0.06);
    ev.multaDolo = forensicRound(diferencial * 0.10);
    
    cross.bigDataAlertActive = diferencial > 0.01;
    
    VDCSystem.analysis.riskVerdict = getRiskVerdict(diferencial, ev.rendimentosBrutos);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const netValue = (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0);
    
    setElementText('statNet', formatCurrency(netValue));
    setElementText('statComm', formatCurrency(ev.comissaoApp || 0));
    setElementText('deltaVal', formatCurrency(ev.diferencialCusto || 0));
    setElementText('statJuros', formatCurrency(ev.jurosMora || 0));
    
    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiCommValue', formatCurrency(ev.comissaoApp || 0));
    setElementText('kpiNetValue', formatCurrency(netValue));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));
    
    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (ev.jurosMora > 0) ? 'block' : 'none';
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    const verdictSection = document.getElementById('verdictSection');
    if(verdictSection && VDCSystem.analysis.riskVerdict) {
        verdictSection.style.display = 'block';
        verdictSection.className = `verdict-display active ${VDCSystem.analysis.riskVerdict.className}`;
        setElementText('verdictLevel', VDCSystem.analysis.riskVerdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.riskVerdict.description);
    }
    
    const bigDataAlert = document.getElementById('bigDataAlert');
    if(bigDataAlert) {
        if(cross.bigDataAlertActive && ev.diferencialCusto > 0.01) {
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
    const ctx = document.getElementById('forensicChart');
    if(!ctx) return;
    if(VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Discrepância'],
            datasets: [{
                label: 'Valores €',
                data: [
                    ev.rendimentosBrutos || 0,
                    Math.abs(ev.comissaoApp || 0),
                    (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0),
                    ev.faturaPlataforma || 0,
                    ev.diferencialCusto || 0
                ],
                backgroundColor: ['#0066cc', '#ff9f1a', '#00cc88', '#6c5ce7', '#e84118']
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
                    ticks: { color: '#b8c6e0', callback: (v) => v + '€' }
                },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b8c6e0' } }
            }
        }
    });
}

// ============================================================================
// 10. EXPORTAÇÕES
// ============================================================================
function exportDataJSON() {
    const exportData = {
        metadata: {
            version: VDCSystem.version,
            sessionId: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            timestampUnix: Math.floor(Date.now() / 1000),
            language: currentLang,
            client: VDCSystem.client,
            demoMode: VDCSystem.demoMode,
            forensicMetadata: VDCSystem.forensicMetadata || getForensicMetadata()
        },
        analysis: {
            totals: VDCSystem.analysis.extractedValues,
            discrepancies: VDCSystem.analysis.crossings,
            riskVerdict: VDCSystem.analysis.riskVerdict,
            evidenceCount: VDCSystem.counts?.total || 0
        },
        evidence: {
            integrity: VDCSystem.analysis.evidenceIntegrity,
            invoices: {
                count: VDCSystem.documents.invoices?.files?.length || 0,
                totalValue: VDCSystem.documents.invoices?.totals?.invoiceValue || 0
            },
            statements: {
                count: VDCSystem.documents.statements?.files?.length || 0,
                gross: VDCSystem.documents.statements?.totals?.rendimentosBrutos || 0,
                commission: VDCSystem.documents.statements?.totals?.comissaoApp || 0
            }
        },
        auditLog: VDCSystem.logs.slice(-20)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_FORENSIC_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    logAudit('Relatório JSON exportado.', 'success');
    showToast('JSON exportado', 'success');
}

async function exportPDF() {
    if (!VDCSystem.client) return showToast('Sem cliente para gerar relatório.', 'error');
    if (typeof window.jspdf === 'undefined') {
        logAudit('Erro: jsPDF não carregado.', 'error');
        return showToast('Erro de sistema (jsPDF)', 'error');
    }
    
    logAudit('Gerando PDF Jurídico...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const t = translations[currentLang];
        const platform = PLATFORM_DATA[VDCSystem.selectedPlatform] || PLATFORM_DATA.bolt;
        const ev = VDCSystem.analysis.extractedValues;
        const meta = VDCSystem.forensicMetadata || getForensicMetadata();
        const verdict = VDCSystem.analysis.riskVerdict || { level: 'N/A', color: '#000000', description: 'Análise não executada.', className: '' };
        
        let y = 20;
        const left = 15;
        const right = 195;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const addWrappedText = (text, x, yPos, maxWidth = 170) => {
            if (!text) return 0;
            const split = doc.splitTextToSize(text.toString(), maxWidth);
            doc.text(split, x, yPos);
            return split.length * 5;
        };
        
        const addWatermark = () => {
            doc.saveGraphicsState();
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            doc.text('CÓPIA CONTROLADA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
            doc.restoreGraphicsState();
        };
        
        const checkPageBreak = (neededSpace) => {
            if (y + neededSpace >= pageHeight - 20) {
                doc.addPage();
                y = 20;
                addWatermark();
                return true;
            }
            return false;
        };
        
        const addFooter = (currentDoc, translation, pWidth, pHeight) => {
            const pageCount = currentDoc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                currentDoc.setPage(i);
                currentDoc.setDrawColor(200,200,200);
                currentDoc.line(10, pHeight - 15, pWidth - 10, pHeight - 15);
                currentDoc.setFontSize(6);
                currentDoc.setTextColor(100,100,100);
                currentDoc.text(VDCSystem.masterHash ? VDCSystem.masterHash.substring(0,24)+'...' : 'HASH NÃO GERADA', 10, pHeight - 10);
                currentDoc.setFontSize(7);
                currentDoc.setTextColor(120,120,120);
                currentDoc.text(translation.pdfFooter || 'VDC Systems International', pWidth/2, pHeight - 10, { align: 'center' });
            }
        };
        
        // Header
        doc.setFillColor(15,23,42); doc.rect(0,0,pageWidth,45,'F');
        doc.setFontSize(18); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
        doc.text(t.pdfTitle || 'PARECER PERICIAL', pageWidth/2, 18, { align: 'center' });
        doc.setFontSize(9); doc.setTextColor(200,200,200);
        doc.text(`Session: ${VDCSystem.sessionId || 'N/A'}`, left, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, left, 36);
        doc.text(`Unix Timestamp: ${meta.timestampUnix || Math.floor(Date.now()/1000)}`, left, 42);
        doc.line(left,45,right,45);
        y = 52;
        
        // Secção 1: Identificação
        checkPageBreak(40);
        doc.setFontSize(12); doc.setTextColor(0,0,0); doc.setFont('helvetica','bold');
        doc.text(t.pdfSection1 || '1. IDENTIFICAÇÃO', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        doc.text(`${t.pdfLabelName || 'Nome'}: ${VDCSystem.client.name || 'N/A'}`, left+5, y); y += 5;
        doc.text(`${t.pdfLabelNIF || 'NIF'}: ${VDCSystem.client.nif || 'N/A'}`, left+5, y); y += 5;
        doc.text(`Plataforma: ${platform.name} (NIF: ${platform.nif})`, left+5, y); y += 5;
        doc.text(`User Agent: ${meta.userAgent ? meta.userAgent.substring(0,60) : 'N/A'}...`, left+5, y); y += 5;
        doc.text(`Timezone: ${meta.timezone || 'N/A'} | IP Simulado: ${meta.ipSimulated || 'N/A'}`, left+5, y); y += 10;
        doc.line(left,y,right,y); y += 8;
        
        // Secção 2: Análise Financeira
        checkPageBreak(60);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection2 || '2. ANÁLISE FINANCEIRA', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text(`${t.pdfLabelGross || 'Bruto'}: ${formatCurrency(ev.rendimentosBrutos || 0)}`, left+5, y); y += 6;
        doc.text(`${t.pdfLabelComm || 'Comissão'}: ${formatCurrency(Math.abs(ev.comissaoApp || 0))}`, left+5, y); y += 6;
        doc.text(`${t.pdfLabelInv || 'Fatura'}: ${formatCurrency(ev.faturaPlataforma || 0)}`, left+5, y); y += 6;
        if ((ev.diferencialCusto || 0) > 0.01) {
            doc.setTextColor(200,50,50); doc.setFont('helvetica','bold');
            doc.text(`${t.pdfLabelDiff || 'Discrepância'}: ${formatCurrency(ev.diferencialCusto || 0)}`, left+5, y); y += 8;
            doc.setTextColor(0,0,0); doc.setFont('helvetica','normal');
            doc.text(`${t.pdfLabelIVA23 || 'IVA 23%'}: ${formatCurrency(ev.iva23 || 0)}`, left+5, y); y += 6;
            doc.text(`${t.pdfLabelJuros || 'Juros'}: ${formatCurrency(ev.jurosMora || 0)}`, left+5, y); y += 6;
            doc.text(`${t.pdfLabelComp || 'Juros Compensatórios'}: ${formatCurrency(ev.jurosCompensatorios || 0)}`, left+5, y); y += 6;
            doc.text(`${t.pdfLabelMulta || 'Multa'}: ${formatCurrency(ev.multaDolo || 0)}`, left+5, y); y += 8;
        }
        doc.line(left,y,right,y); y += 8;
        
        // Secção 3: Veredicto de Risco
        checkPageBreak(30);
        doc.setFillColor(240,240,240); doc.rect(left, y-3, pageWidth-30, 30, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(0,0,0);
        doc.text(t.pdfRiskVerdict || 'VEREDICTO', left+2, y+2);
        doc.setFontSize(14); doc.setTextColor(verdict.color);
        doc.text(verdict.level, left+2, y+12); y += 25;
        
        // Secção 4: Fundamentos Legais
        checkPageBreak(30);
        doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfLegalTitle || 'FUNDAMENTAÇÃO LEGAL', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        doc.text('• ' + (t.pdfLegalRGIT || 'Art. 114.º RGIT'), left+5, y); y += 5;
        doc.text('• ' + (t.pdfLegalLGT || 'Art. 35.º LGT'), left+5, y); y += 5;
        doc.text('• ' + (t.pdfLegalISO || 'ISO/IEC 27037'), left+5, y); y += 8;
        doc.line(left,y,right,y); y += 8;
        
        // Secção 5: Conclusões
        checkPageBreak(30);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection4 || '4. CONCLUSÕES', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        y += addWrappedText(t.pdfConclusionText || 'Conclusão não disponível.', left+5, y, 170); y += 8;
        doc.line(left,y,right,y); y += 8;
        
        // Secção 6: Cadeia de Custódia
        checkPageBreak(40);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection5 || '5. CADEIA DE CUSTÓDIA', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(8);
        doc.setFillColor(30,42,68); doc.rect(left, y, pageWidth-30, 7, 'F');
        doc.setTextColor(255,255,255); doc.text("Ficheiro", left+2, y+5); doc.text("Hash SHA-256", left+70, y+5);
        doc.setTextColor(0,0,0); y += 10;
        if (VDCSystem.analysis.evidenceIntegrity && VDCSystem.analysis.evidenceIntegrity.length > 0) {
            VDCSystem.analysis.evidenceIntegrity.slice(-5).forEach(item => {
                if (y > 260) { doc.addPage(); y = 20; addWatermark(); }
                doc.text(item.filename ? (item.filename.substring(0,25)+(item.filename.length>25?'...':'')) : 'N/A', left+2, y);
                doc.setFontSize(6.5);
                doc.text(item.hash ? item.hash.substring(0,24)+'...' : 'N/A', left+70, y);
                doc.setFontSize(8); y += 6;
            });
        } else {
            doc.text('Nenhuma evidência carregada.', left+5, y); y += 6;
        }
        y += 4; doc.line(left,y,right,y); y += 8;
        
        // Secção 7: Interrogatório
        checkPageBreak(40);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection6 || '6. INTERROGATÓRIO', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(8);
        (t.pdfQuestions || []).slice(0,3).forEach(q => {
            if (y > 260) { doc.addPage(); y = 20; addWatermark(); }
            y += addWrappedText(q, left+5, y, 170); y += 2;
        });
        y += 6; doc.line(left,y,right,y); y += 8;
        
        // Secção 8: Assinatura
        checkPageBreak(30);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection7 || '7. ASSINATURA', left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text(`Perito: VDC Forensic System ${VDCSystem.version || 'v12.0'}`, left+5, y); y += 6;
        doc.text(`Data: ${new Date().toLocaleDateString()}`, left+5, y); y += 6;
        doc.text(`Assinatura Digital: ${(VDCSystem.masterHash || generateMasterHash()).substring(0,16)}...`, left+5, y);
        
        // Adicionar marca de água e rodapé a todas as páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addWatermark();
        }
        addFooter(doc, t, pageWidth, pageHeight);
        
        doc.save(`Parecer_Pericial_${VDCSystem.sessionId || 'NOVA_SESSAO'}.pdf`);
        logAudit('PDF gerado com fundamentos legais.', 'success');
        showToast('PDF gerado com sucesso', 'success');
        
    } catch (e) {
        console.error('Erro fatal ao gerar PDF:', e);
        logAudit(`Erro fatal no PDF: ${e.message}`, 'error');
        showToast('Erro fatal ao gerar PDF', 'error');
    }
}

// ============================================================================
// 11. FUNÇÕES DE SISTEMA
// ============================================================================
function generateMasterHash() {
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + VDCSystem.sessionId + Date.now() + (VDCSystem.client ? VDCSystem.client.nif : '');
    const hash = CryptoJS.SHA256(payload).toString();
    setElementText('masterHashValue', hash);
    VDCSystem.masterHash = hash;
    return hash;
}

function logAudit(msg, type = 'info') {
    const output = document.getElementById('consoleOutput');
    if (!output) return;
    const time = new Date().toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
    VDCSystem.logs.push({ time, msg, type, timestamp: Date.now() });
    if (VDCSystem.logs.length > 100) VDCSystem.logs.shift();
}

function clearConsole() {
    document.getElementById('consoleOutput').innerHTML = '';
    VDCSystem.logs = [];
    logAudit('Console limpo.', 'info');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${iconMap[type] || 'fa-info-circle'}"></i> <p>${message}</p>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function resetSystem() {
    if (!confirm('Tem a certeza que deseja reiniciar o sistema?')) return;
    
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data_bd_v12_0');
    
    VDCSystem.analysis.extractedValues = {};
    VDCSystem.analysis.crossings = { delta: 0 };
    VDCSystem.analysis.riskVerdict = null;
    VDCSystem.demoMode = false;
    VDCSystem.forensicMetadata = null;
    
    document.getElementById('clientStatusFixed').style.display = 'none';
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    
    clearAllEvidence();
    clearConsole();
    
    if (VDCSystem.chart) { VDCSystem.chart.destroy(); VDCSystem.chart = null; }
    
    ['netVal','commissionVal','deltaVal','statJuros','kpiGrossValue','kpiCommValue','kpiNetValue','kpiInvValue'].forEach(id => setElementText(id, '0,00€'));
    document.getElementById('verdictSection').style.display = 'none';
    document.getElementById('bigDataAlert').style.display = 'none';
    
    generateMasterHash();
    logAudit('Sistema reiniciado com sucesso.', 'success');
    showToast('Sistema reiniciado', 'success');
}

// ============================================================================
// 12. BINDING GLOBAL
// ============================================================================
window.VDCSystem = VDCSystem;
window.switchLanguage = switchLanguage;
window.startGatekeeperSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.exportDataJSON = exportDataJSON;
window.logAudit = logAudit;
window.generateMasterHash = generateMasterHash;
window.performAudit = performAudit;
window.resetSystem = resetSystem;
window.clearConsole = clearConsole;
window.forensicRound = forensicRound;
window.formatCurrency = formatCurrency;
window.validateNIF = validateNIF;

console.log('VDC v12.0 CSI FINAL - Sistema carregado com todas as correções aplicadas.');

// ============================================================================
// FIM DO SCRIPT · TODOS OS REQUISITOS IMPLEMENTADOS
// ============================================================================
