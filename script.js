/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.2 LASER CROSS
 * ====================================================================
 * CONSOLIDAÇÃO FINAL: INTELIGÊNCIA DE INTERROGATÓRIO + COMANDO PDF
 * Módulos: Forense, IA, PDF, Traduções, Utilitários
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. DADOS DAS PLATAFORMAS & BANCO DE PERGUNTAS (IA CACHE 30)
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, Tallinn, Estónia',
        nif: 'EE102090374'
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, Amesterdão, Países Baixos',
        nif: 'NL852071588B01'
    },
    freenow: {
        name: 'FREE NOW',
        address: 'Rua Example, 123, Lisboa, Portugal',
        nif: 'PT123456789'
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, Lisboa, Portugal',
        nif: 'PT987654321'
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, Porto, Portugal',
        nif: 'PT456123789'
    }
};

// CACHE DE 30 PERGUNTAS (Classificadas por Risco)
const QUESTIONS_CACHE = [
    // RISCO BAIXO (Processo/Admin)
    { id: 1, text: "Qual a lógica algorítmica exata da taxa de serviço no período auditado?", type: "low" },
    { id: 2, text: "Como justifica a discrepância entre o registo de comissão e a fatura emitida?", type: "low" },
    { id: 3, text: "Existem registos de 'Shadow Entries' (entradas sem ID) no sistema?", type: "low" },
    { id: 4, text: "A plataforma disponibiliza o código-fonte do algoritmo de preços para auditoria?", type: "low" },
    { id: 5, text: "Qual o tratamento das 'Tips' (Gorjetas) na faturação e declaração de IVA?", type: "low" },
    { id: 6, text: "Como é determinada a origem geográfica para efeitos de IVA nas transações?", type: "low" },
    { id: 7, text: "Houve aplicação de taxa flutuante dinâmica sem notificação ao utilizador?", type: "low" },
    { id: 8, text: "Os extratos bancários coincidem com os registos na base de dados?", type: "low" },
    { id: 9, text: "Qual a metodologia de retenção de IVA quando a fatura é omissa na taxa?", type: "low" },
    { id: 10, text: "Há evidências de manipulação de 'timestamp' para alterar a validade fiscal?", type: "low" },
    // RISCO MÉDIO (Técnico/Processual)
    { id: 11, text: "O sistema permite a edição retroativa de registos de faturação já selados?", type: "med" },
    { id: 12, text: "Qual o protocolo de redundância quando a API de faturação falha em tempo real?", type: "med" },
    { id: 13, text: "Como são conciliados os cancelamentos com as faturas retificativas?", type: "med" },
    { id: 14, text: "Existem fluxos de capital para contas não declaradas na jurisdição nacional?", type: "med" },
    { id: 15, text: "O algoritmo de 'Surge Pricing' discrimina a margem de lucro operacional?", type: "med" },
    { id: 16, text: "Qual o nível de acesso dos administradores à base de dados transacional?", type: "med" },
    { id: 17, text: "Existe algum 'script' de limpeza automática de logs de erro de sincronização?", type: "med" },
    { id: 18, text: "Como é processada a autoliquidação de IVA em serviços intracomunitários?", type: "med" },
    { id: 19, text: "As taxas de intermediação seguem o regime de isenção ou tributação plena?", type: "med" },
    { id: 20, text: "Qual a justificação técnica para o desvio detetado na triangulação VDC?", type: "med" },
    // RISCO ALTO (Dolo/Fraude)
    { id: 21, text: "Existe segregação de funções no acesso aos algoritmos de cálculo financeiro?", type: "high" },
    { id: 22, text: "Como são validados os NIFs de clientes em faturas automáticas?", type: "high" },
    { id: 23, text: "O sistema utiliza 'dark patterns' para ocultar taxas adicionais?", type: "high" },
    { id: 24, text: "Há registo de transações em 'offline mode' sem upload posterior?", type: "high" },
    { id: 25, text: "Qual a política de retenção de dados brutos antes do parsing contabilístico?", type: "high" },
    { id: 26, text: "Existem discrepâncias de câmbio não justificadas em faturas multimoeda?", type: "high" },
    { id: 27, text: "Como é garantida a imutabilidade dos logs de acesso ao sistema financeiro?", type: "high" },
    { id: 28, text: "Os valores reportados à AT via SAFT-PT coincidem com este relatório?", type: "high" },
    { id: 29, text: "Qual o impacto da latência da API no valor final cobrado ao cliente?", type: "high" },
    { id: 30, text: "Existe evidência de sub-declaração de receitas via algoritmos de desconto?", type: "high" }
];

// ============================================================================
// 2. UTILITÁRIOS FORENSES
// ============================================================================
const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim().replace(/[^\d.,-]/g, '');
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
        else str = str.replace(/,/g, '');
    } else if (str.includes(',')) str = str.replace(',', '.');
    return parseFloat(str) || 0;
};

const validateNIF = (nif) => {
    if (!nif || !/^\d{9}$/.test(nif)) return false;
    const first = parseInt(nif[0]);
    if (![1, 2, 3, 5, 6, 8, 9].includes(first)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += parseInt(nif[i]) * (9 - i);
    const mod = sum % 11;
    return parseInt(nif[8]) === ((mod < 2) ? 0 : 11 - mod);
};

const formatCurrency = (value) => {
    return forensicRound(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross)) return { level: 'INCONCLUSIVO', key: 'low', color: '#8c7ae6', description: 'Dados insuficientes para veredicto.' };
    const pct = Math.abs((delta / gross) * 100);
    if (pct <= 5) return { level: 'BAIXO RISCO', key: 'low', color: '#44bd32', description: 'Margem de erro operacional. Monitorização periódica recomendada.' };
    if (pct <= 15) return { level: 'RISCO MÉDIO', key: 'med', color: '#f59e0b', description: 'Anomalia algorítmica detetada. Auditoria de Logs de Servidor recomendada.' };
    return { level: 'CRÍTICO', key: 'high', color: '#ef4444', description: 'Indício de Dolo Fiscal. Participação Criminal / Inspeção Tributária recomendada.' };
};

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
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

const getForensicMetadata = () => {
    return {
        userAgent: navigator.userAgent,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timestampUnix: Math.floor(Date.now() / 1000),
        timestampISO: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
};

// ============================================================================
// 3. SISTEMA DE TRADUÇÕES (COMPLETO)
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR SESSÃO CSI v12.2",
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
        cardJuros: "FOSSO FISCAL",
        kpiTitle: "ANÁLISE DE TRIANGULAÇÃO · ALGORITMO CSI v12.2",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÃO",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURA",
        consoleTitle: "LOG DE CUSTÓDIA · FORENSIC LOG",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.2)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS BIG DATA",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T",
        uploadInvoiceText: "FATURAS (PDF/CSV)",
        uploadStatementText: "EXTRATOS BANCÁRIOS",
        summaryTitle: "RESUMO DE PROCESSAMENTO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Discrepância transacional não justificada:",
        pdfTitle: "PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL",
        pdfSection1: "1. IDENTIFICAÇÃO E METADADOS",
        pdfSection2: "2. ANÁLISE FINANCEIRA CRUZADA",
        pdfSection3: "3. VEREDICTO DE RISCO",
        pdfSection4: "4. CONCLUSÕES PERICIAIS",
        pdfSection5: "5. CADEIA DE CUSTÓDIA",
        pdfSection6: "6. INTERROGATÓRIO ESTRATÉGICO",
        pdfSection7: "7. ASSINATURA DIGITAL",
        pdfLegalTitle: "FUNDAMENTAÇÃO LEGAL",
        pdfLegalRGIT: "Art. 114.º RGIT - Juros compensatórios",
        pdfLegalLGT: "Art. 35.º LGT - Juros de mora",
        pdfLegalISO: "ISO/IEC 27037 - Cadeia de Custódia",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Sessão",
        pdfLabelGross: "Bruto Reconstruído",
        pdfLabelComm: "Comissão",
        pdfLabelInv: "Faturado",
        pdfLabelDiff: "Discrepância",
        pdfLabelIVA23: "IVA 23%",
        pdfLabelJuros: "Juros de Mora",
        pdfLabelComp: "Juros Compensatórios",
        pdfLabelMulta: "Multa Estimada",
        pdfConclusionText: "Conclusão: Os dados apresentam indícios de desvio entre valores transacionados e valores declarados. Recomenda-se a notificação da entidade para esclarecimento e eventual procedimento de inspeção tributária.",
        pdfRiskVerdict: "VEREDICTO DE RISCO",
        pdfQuestions: [
            "1. Qual a lógica algorítmica exata da taxa de serviço no período auditado?",
            "2. Como justifica a discrepância entre o registo de comissão e a fatura emitida?",
            "3. Existem registos de 'Shadow Entries' (entradas sem ID) no sistema?",
            "4. A plataforma disponibiliza o código-fonte do algoritmo de preços para auditoria?",
            "5. Qual o tratamento das 'Tips' (Gorjetas) na faturação e declaração de IVA?"
        ],
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.2 | Todos os Direitos Reservados | EM"
    },
    en: {
        startBtn: "START CSI SESSION v12.2",
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
        cardJuros: "TAX GAP",
        kpiTitle: "TRIANGULATION ANALYSIS · ALGORITHM CSI v12.2",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSION",
        kpiNetText: "NET",
        kpiInvText: "INVOICE",
        consoleTitle: "CUSTODY LOG · FORENSIC LOG",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.2)",
        modalTitle: "BIG DATA EVIDENCE MANAGEMENT",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T FILES",
        uploadInvoiceText: "INVOICES (PDF/CSV)",
        uploadStatementText: "BANK STATEMENTS",
        summaryTitle: "PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified transactional discrepancy:",
        pdfTitle: "DIGITAL FORENSIC INVESTIGATION REPORT",
        pdfSection1: "1. IDENTIFICATION & METADATA",
        pdfSection2: "2. CROSS-FINANCIAL ANALYSIS",
        pdfSection3: "3. RISK VERDICT",
        pdfSection4: "4. FORENSIC CONCLUSIONS",
        pdfSection5: "5. CHAIN OF CUSTODY",
        pdfSection6: "6. STRATEGIC INTERROGATION",
        pdfSection7: "7. DIGITAL SIGNATURE",
        pdfLegalTitle: "LEGAL BASIS",
        pdfLegalRGIT: "Art. 114.º RGIT - Compensatory interest",
        pdfLegalLGT: "Art. 35.º LGT - Default interest",
        pdfLegalISO: "ISO/IEC 27037 - Chain of Custody",
        pdfLabelName: "Name",
        pdfLabelNIF: "Tax ID",
        pdfLabelSession: "Session",
        pdfLabelGross: "Reconstructed Gross",
        pdfLabelComm: "Commission",
        pdfLabelInv: "Invoiced",
        pdfLabelDiff: "Discrepancy",
        pdfLabelIVA23: "VAT 23%",
        pdfLabelJuros: "Default Interest",
        pdfLabelComp: "Compensatory Interest",
        pdfLabelMulta: "Estimated Fine",
        pdfConclusionText: "Conclusion: Data indicates deviations between transacted and declared values. Entity notification recommended for clarification and potential tax inspection procedure.",
        pdfRiskVerdict: "RISK VERDICT",
        pdfQuestions: [
            "1. What is the exact algorithmic logic for the service fee?",
            "2. How is the discrepancy between internal record and invoice justified?",
            "3. Are there records of 'Shadow Entries'?",
            "4. Does the platform provide source code for the pricing algorithm?",
            "5. How are 'Tips' treated in the billing?"
        ],
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.2 | All Rights Reserved | EM"
    }
};

let currentLang = 'pt';

// ============================================================================
// 4. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.2-LASER-CROSS',
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
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0 } },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0, records: 0 } },
        statements: { files: [], hashes: {}, totals: { rendimentosBrutos: 0, comissaoApp: 0, records: 0 } }
    },
    analysis: {
        extractedValues: {},
        crossings: { delta: 0 },
        verdict: null,
        evidenceIntegrity: [],
        selectedQuestions: []
    },
    forensicMetadata: null,
    chart: null,
    counts: { total: 0 }
};

// ============================================================================
// 5. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupStaticListeners();
    populateYears();
    startClockAndDate();
    loadSystemRecursively();
});

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
    if (text) text.textContent = `FORENSIC ENGINE v12.2... ${percent}%`;
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
    logAudit('SISTEMA VDC v12.2 LASER CROSS ONLINE', 'success');
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_2');
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
    for(let y=2030; y>=2018; y--) {
        const opt = document.createElement('option'); opt.value=y; opt.textContent=y;
        if(y===2024) opt.selected=true;
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

    setupUploadListeners();
}

function setupUploadListeners() {
    const types = ['control', 'saft', 'invoice', 'statement'];
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
        { id: 'uploadControlText', key: 'uploadControlText' },
        { id: 'uploadSaftText', key: 'uploadSaftText' },
        { id: 'uploadInvoiceText', key: 'uploadInvoiceText' },
        { id: 'uploadStatementText', key: 'uploadStatementText' },
        { id: 'summaryTitle', key: 'summaryTitle' },
        { id: 'modalSaveBtn', key: 'modalSaveBtn' },
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
    localStorage.setItem('vdc_client_data_bd_v12_2', JSON.stringify(VDCSystem.client));

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
    ['control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const el = document.getElementById(`summary${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if(el) el.textContent = count;
    });
    let total = 0;
    ['control', 'saft', 'invoices', 'statements'].forEach(k => {
        total += VDCSystem.documents[k]?.files?.length || 0;
    });
    setElementText('summaryTotal', total);
}

function updateCounters() {
    let total = 0;
    ['control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        total += count;
        let id = k;
        if (k === 'invoices') id = 'invoice';
        if (k === 'statements') id = 'statement';
        setElementText(`${id}CountCompact`, count);
    });
    document.getElementById('evidenceCountTotal').textContent = total;
    VDCSystem.counts.total = total;
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

    logAudit('ATIVANDO MODO DEMO CSI v12.2...', 'info');

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

        selectQuestions(VDCSystem.analysis.verdict.key);

        updateDashboard();
        renderChart();
        showAlerts();

        logAudit('Auditoria Demo CSI v12.2 concluída com discrepância de 1.705,00€.', 'success');
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

            selectQuestions(VDCSystem.analysis.verdict.key);

            updateDashboard();
            renderChart();
            showAlerts();

            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            logAudit(`Análise concluída em ${duration}ms. VEREDICTO: ${VDCSystem.analysis.verdict.level}`, 'success');

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

    VDCSystem.analysis.verdict = getRiskVerdict(diferencial, ev.rendimentosBrutos);
}

function selectQuestions(riskKey) {
    let pool = QUESTIONS_CACHE.filter(q => q.type === riskKey);
    if (pool.length < 6) {
        const others = QUESTIONS_CACHE.filter(q => q.type !== riskKey);
        pool = [...pool, ...others];
    }
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    VDCSystem.analysis.selectedQuestions = pool.slice(0, 6);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const netValue = (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0);

    setElementText('statNet', formatCurrency(netValue));
    setElementText('statComm', formatCurrency(ev.comissaoApp || 0));
    setElementText('statJuros', formatCurrency(ev.diferencialCusto || 0));

    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiCommValue', formatCurrency(ev.comissaoApp || 0));
    setElementText('kpiNetValue', formatCurrency(netValue));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));

    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (ev.diferencialCusto > 0) ? 'block' : 'none';
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    const verdictSection = document.getElementById('verdictSection');
    if(verdictSection && VDCSystem.analysis.verdict) {
        verdictSection.style.display = 'block';
        verdictSection.className = `verdict-display active verdict-${VDCSystem.analysis.verdict.key}`;
        setElementText('verdictLevel', VDCSystem.analysis.verdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.verdict.description);
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
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Fosso Fiscal'],
            datasets: [{
                label: '€',
                data: [
                    ev.rendimentosBrutos || 0,
                    Math.abs(ev.comissaoApp || 0),
                    (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0),
                    ev.faturaPlataforma || 0,
                    ev.diferencialCusto || 0
                ],
                backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444']
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
            verdict: VDCSystem.analysis.verdict,
            selectedQuestions: VDCSystem.analysis.selectedQuestions,
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
        const verdict = VDCSystem.analysis.verdict || { level: 'N/A', key: 'low', description: 'Análise não executada.', color: '#8c7ae6' };

        let y = 20;
        const left = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const checkPageBreak = (neededSpace) => {
            if (y + neededSpace >= pageHeight - 20) {
                doc.addPage();
                y = 20;
                return true;
            }
            return false;
        };

        const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(100,100,100);
                doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
                doc.setFontSize(6);
                doc.setTextColor(100,100,100);
                doc.text(VDCSystem.masterHash ? VDCSystem.masterHash.substring(0,24)+'...' : 'HASH NÃO GERADA', 10, pageHeight - 10);
                doc.setFontSize(7);
                doc.setTextColor(120,120,120);
                doc.text(t.pdfFooter, pageWidth/2, pageHeight - 10, { align: 'center' });
            }
        };

        doc.setFillColor(15,23,42); doc.rect(0,0,pageWidth,45,'F');
        doc.setFontSize(18); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold');
        doc.text(t.pdfTitle, pageWidth/2, 18, { align: 'center' });
        doc.setFontSize(9); doc.setTextColor(200,200,200);
        doc.text(`Session: ${VDCSystem.sessionId || 'N/A'}`, left, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, left, 36);
        doc.text(`Unix Timestamp: ${meta.timestampUnix || Math.floor(Date.now()/1000)}`, left, 42);
        doc.line(left,45,pageWidth-15,45);
        y = 52;

        checkPageBreak(40);
        doc.setFontSize(12); doc.setTextColor(0,0,0); doc.setFont('helvetica','bold');
        doc.text(t.pdfSection1, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        doc.text(`${t.pdfLabelName}: ${VDCSystem.client.name || 'N/A'}`, left+5, y); y += 5;
        doc.text(`${t.pdfLabelNIF}: ${VDCSystem.client.nif || 'N/A'}`, left+5, y); y += 5;
        doc.text(`Plataforma: ${platform.name} (NIF: ${platform.nif})`, left+5, y); y += 5;
        doc.text(`User Agent: ${meta.userAgent ? meta.userAgent.substring(0,60) : 'N/A'}...`, left+5, y); y += 5;
        doc.text(`Timezone: ${meta.timezone || 'N/A'}`, left+5, y); y += 10;
        doc.line(left,y,pageWidth-15,y); y += 8;

        checkPageBreak(60);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection2, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text(`${t.pdfLabelGross}: ${formatCurrency(ev.rendimentosBrutos || 0)}`, left+5, y); y += 6;
        doc.text(`${t.pdfLabelComm}: ${formatCurrency(Math.abs(ev.comissaoApp || 0))}`, left+5, y); y += 6;
        doc.text(`${t.pdfLabelInv}: ${formatCurrency(ev.faturaPlataforma || 0)}`, left+5, y); y += 6;
        if ((ev.diferencialCusto || 0) > 0.01) {
            doc.setTextColor(200,50,50); doc.setFont('helvetica','bold');
            doc.text(`${t.pdfLabelDiff}: ${formatCurrency(ev.diferencialCusto || 0)}`, left+5, y); y += 8;
            doc.setTextColor(0,0,0); doc.setFont('helvetica','normal');
            doc.text(`${t.pdfLabelIVA23}: ${formatCurrency(ev.iva23 || 0)}`, left+5, y); y += 6;
            doc.text(`${t.pdfLabelJuros}: ${formatCurrency(ev.jurosMora || 0)}`, left+5, y); y += 6;
            doc.text(`${t.pdfLabelComp}: ${formatCurrency(ev.jurosCompensatorios || 0)}`, left+5, y); y += 6;
            doc.text(`${t.pdfLabelMulta}: ${formatCurrency(ev.multaDolo || 0)}`, left+5, y); y += 8;
        }
        doc.line(left,y,pageWidth-15,y); y += 8;

        checkPageBreak(30);
        doc.setFillColor(240,240,240); doc.rect(left, y-3, pageWidth-30, 25, 'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(0,0,0);
        doc.text(t.pdfRiskVerdict, left+2, y);
        doc.setFontSize(14); doc.setTextColor(verdict.color);
        doc.text(verdict.level, left+2, y+10); y += 30;

        checkPageBreak(30);
        doc.setTextColor(0,0,0); doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfLegalTitle, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        doc.text('• ' + t.pdfLegalRGIT, left+5, y); y += 5;
        doc.text('• ' + t.pdfLegalLGT, left+5, y); y += 5;
        doc.text('• ' + t.pdfLegalISO, left+5, y); y += 8;
        doc.line(left,y,pageWidth-15,y); y += 8;

        checkPageBreak(40);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection4, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(9);
        const split = doc.splitTextToSize(t.pdfConclusionText, 170);
        doc.text(split, left+5, y); y += (split.length * 5) + 5;
        doc.line(left,y,pageWidth-15,y); y += 8;

        checkPageBreak(40);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection5, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(7);
        if (VDCSystem.analysis.evidenceIntegrity && VDCSystem.analysis.evidenceIntegrity.length > 0) {
            VDCSystem.analysis.evidenceIntegrity.slice(-5).forEach(item => {
                if (y > 260) { doc.addPage(); y = 20; }
                doc.text(item.filename ? (item.filename.substring(0,30)+(item.filename.length>30?'...':'')) : 'N/A', left+5, y);
                doc.text(item.hash ? item.hash.substring(0,16)+'...' : 'N/A', left+100, y);
                y += 5;
            });
        } else {
            doc.text('Nenhuma evidência carregada.', left+5, y); y += 5;
        }
        y += 5; doc.line(left,y,pageWidth-15,y); y += 8;

        checkPageBreak(40);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection6, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(8);
        (VDCSystem.analysis.selectedQuestions.length ? VDCSystem.analysis.selectedQuestions : t.pdfQuestions.slice(0,3)).forEach((q, i) => {
            if (y > 260) { doc.addPage(); y = 20; }
            const qText = typeof q === 'object' ? q.text : q;
            const qLines = doc.splitTextToSize(`${i+1}. ${qText}`, 160);
            doc.text(qLines, left+5, y); y += (qLines.length * 4) + 2;
        });
        y += 5; doc.line(left,y,pageWidth-15,y); y += 8;

        checkPageBreak(30);
        doc.setFont('helvetica','bold'); doc.setFontSize(12);
        doc.text(t.pdfSection7, left, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(10);
        doc.text(`Perito: VDC Forensic System ${VDCSystem.version}`, left+5, y); y += 6;
        doc.text(`Data: ${new Date().toLocaleDateString()}`, left+5, y); y += 6;
        doc.text(`Assinatura Digital: ${VDCSystem.masterHash.substring(0,16)}...`, left+5, y);

        addFooter();

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

function resetSystem() {
    if (!confirm('Tem a certeza que deseja reiniciar o sistema?')) return;

    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data_bd_v12_2');

    VDCSystem.analysis.extractedValues = {};
    VDCSystem.analysis.crossings = { delta: 0 };
    VDCSystem.analysis.verdict = null;
    VDCSystem.analysis.selectedQuestions = [];
    VDCSystem.demoMode = false;
    VDCSystem.forensicMetadata = null;

    document.getElementById('clientStatusFixed').style.display = 'none';
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';

    ['control', 'saft', 'invoices', 'statements'].forEach(k => {
        VDCSystem.documents[k] = { files: [], hashes: {}, totals: {} };
    });
    VDCSystem.analysis.evidenceIntegrity = [];

    ['controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 'statementsFileListModal'].forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.innerHTML = ''; el.style.display = 'none'; }
    });

    VDCSystem.documents.invoices.totals.invoiceValue = 0;
    VDCSystem.documents.statements.totals.rendimentosBrutos = 0;
    VDCSystem.documents.statements.totals.comissaoApp = 0;

    updateEvidenceSummary();
    updateCounters();
    clearConsole();

    if (VDCSystem.chart) { VDCSystem.chart.destroy(); VDCSystem.chart = null; }

    ['statNet','statComm','statJuros','kpiGrossValue','kpiCommValue','kpiNetValue','kpiInvValue','alertDeltaValue'].forEach(id => setElementText(id, '0,00€'));
    document.getElementById('verdictSection').style.display = 'none';
    document.getElementById('bigDataAlert').style.display = 'none';
    document.getElementById('jurosCard').style.display = 'none';

    generateMasterHash();
    logAudit('Sistema reiniciado com sucesso.', 'success');
    showToast('Sistema reiniciado', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 12. BINDING GLOBAL
// ============================================================================
window.VDCSystem = VDCSystem;
window.switchLanguage = switchLanguage;
window.exportPDF = exportPDF;
window.performAudit = performAudit;
window.resetSystem = resetSystem;
window.logAudit = logAudit;
window.forensicRound = forensicRound;
window.formatCurrency = formatCurrency;
window.validateNIF = validateNIF;

console.log('VDC v12.2 LASER CROSS - Sistema carregado com todas as correções aplicadas.');

// ============================================================================
// FIM DO SCRIPT · TODOS OS REQUISITOS IMPLEMENTADOS
// ============================================================================
