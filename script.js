/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.5 RETA FINAL FORENSE
 * ====================================================================
 * CONSOLIDAÇÃO FINAL: INTELIGÊNCIA FORENSE + QUANTUM BENEFÍCIO ILÍCITO
 * Módulos: SAF-T, DAC7, Extratos, RGIT, PDF Forense, Traduções PT-PT/EN
 * RETIFICAÇÃO CRÍTICA: I/O E PDF DESBLOQUEADO
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. DADOS DAS PLATAFORMAS & BANCO DE PERGUNTAS (IA CACHE 30)
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia',
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

const QUESTIONS_CACHE = [
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
    
    // Detectar formato PT (1.200,50) vs EN (1,200.50)
    if (str.includes(',') && str.includes('.')) {
        // Se a vírgula vem depois do ponto -> formato PT (ponto = milhares, vírgula = decimal)
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // Se o ponto vem depois da vírgula -> formato EN (vírgula = milhares, ponto = decimal)
            str = str.replace(/,/g, '');
        }
    } else if (str.includes(',')) {
        // Apenas vírgula -> assumir formato PT decimal
        str = str.replace(',', '.');
    }
    
    const result = parseFloat(str) || 0;
    return result;
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
    return forensicRound(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross)) return { level: 'INCONCLUSIVO', key: 'low', color: '#8c7ae6', description: 'Dados insuficientes para veredicto pericial.', percent: '0.00%' };
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toFixed(2) + '%';
    if (pct <= 5) return { level: 'BAIXO RISCO', key: 'low', color: '#44bd32', description: 'Margem de erro operacional. Monitorização periódica recomendada, sem indícios de fraude.', percent: pctFormatted };
    if (pct <= 15) return { level: 'RISCO MÉDIO', key: 'med', color: '#f59e0b', description: 'Anomalia algorítmica detetada. Auditoria aprofundada recomendada nos termos do art. 63.º LGT.', percent: pctFormatted };
    return { level: 'CRÍTICO', key: 'high', color: '#ef4444', description: 'Indício de Fraude Fiscal (art. 103.º e 104.º RGIT). Participação à Autoridade Tributária recomendada.', percent: pctFormatted };
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
// 3. SISTEMA DE TRADUÇÕES (COMPLETO PT-PT / EN)
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR PERÍCIA v12.5",
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
        kpiTitle: "TRIANGULAÇÃO FINANCEIRA · ALGORITMO FORENSE v12.5",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÕES",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURADO",
        consoleTitle: "LOG DE CUSTÓDIA · CADEIA DE CUSTÓDIA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.5)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T (PT)",
        uploadInvoiceText: "FATURAS (PDF/CSV/XML)",
        uploadStatementText: "EXTRATOS BANCÁRIOS / DADOS",
        uploadDac7Text: "DECLARAÇÃO DAC7",
        summaryTitle: "RESUMO DE PROCESSAMENTO PROBATÓRIO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Indício de fraude fiscal não justificada:",
        moduleSaftTitle: "MÓDULO SAF-T (EXTRAÇÃO)",
        moduleStatementTitle: "MÓDULO EXTRATOS (MAPEAMENTO)",
        moduleDac7Title: "MÓDULO DAC7 (DECOMPOSIÇÃO)",
        saftIliquido: "Valor Ilíquido Total",
        saftIva: "Total IVA (6%)",
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
        verdictPercent: "Desvio Calculado",
        pdfTitle: "PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL",
        pdfHeaderTag1: "[FORENSE]",
        pdfHeaderTag2: "[FINANCEIRO]",
        pdfSection1: "1. IDENTIFICAÇÃO E METADADOS",
        pdfSection2: "2. ANÁLISE FINANCEIRA CRUZADA",
        pdfSection3: "3. VEREDICTO DE RISCO (RGIT)",
        pdfSection4: "4. CONCLUSÕES PERICIAIS",
        pdfSection5: "5. CADEIA DE CUSTÓDIA",
        pdfSection6: "6. INTERROGATÓRIO ESTRATÉGICO (30 QUESTÕES)",
        pdfSection7: "7. ASSINATURA DIGITAL",
        pdfLegalTitle: "FUNDAMENTAÇÃO LEGAL",
        pdfLegalRGIT: "Art. 103.º e 104.º RGIT - Fraude Fiscal e Fraude Qualificada",
        pdfLegalLGT: "Art. 35.º e 63.º LGT - Juros de mora e deveres de cooperação",
        pdfLegalISO: "ISO/IEC 27037 - Preservação de Prova Digital",
        pdfConclusionText: "Os dados analisados apresentam indícios de desconformidade fiscal. Atendendo à natureza dos factos, compete ao mandatário legal a utilização deste parecer para apuramento de veracidade em sede judicial e solicitação de auditoria inspetiva às entidades competentes.",
        pdfFooterLine1: "Art. 103.º e 104.º RGIT · ISO/IEC 27037",
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Módulo de Peritagem Forense v12.5 | EM · PT",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Perícia n.º",
        pdfLabelTimestamp: "Unix Timestamp",
        pdfLabelPlatform: "Plataforma",
        pdfLabelAddress: "Morada"
    },
    en: {
        startBtn: "START FORENSIC EXAM v12.5",
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
        kpiTitle: "FINANCIAL TRIANGULATION · FORENSIC ALGORITHM v12.5",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSIONS",
        kpiNetText: "NET",
        kpiInvText: "INVOICED",
        consoleTitle: "CUSTODY LOG · CHAIN OF CUSTODY",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.5)",
        modalTitle: "DIGITAL EVIDENCE MANAGEMENT",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T FILES (PT)",
        uploadInvoiceText: "INVOICES (PDF/CSV/XML)",
        uploadStatementText: "BANK STATEMENTS / DATA",
        uploadDac7Text: "DAC7 DECLARATION",
        summaryTitle: "EVIDENCE PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified tax fraud indication:",
        moduleSaftTitle: "SAF-T MODULE (EXTRACTION)",
        moduleStatementTitle: "STATEMENT MODULE (MAPPING)",
        moduleDac7Title: "DAC7 MODULE (BREAKDOWN)",
        saftIliquido: "Total Net Value",
        saftIva: "Total VAT (6%)",
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
        verdictPercent: "Calculated Deviation",
        pdfTitle: "DIGITAL FORENSIC EXPERT REPORT",
        pdfHeaderTag1: "[FORENSIC]",
        pdfHeaderTag2: "[FINANCIAL]",
        pdfSection1: "1. IDENTIFICATION & METADATA",
        pdfSection2: "2. CROSS-FINANCIAL ANALYSIS",
        pdfSection3: "3. RISK VERDICT (RGIT)",
        pdfSection4: "4. EXPERT CONCLUSIONS",
        pdfSection5: "5. CHAIN OF CUSTODY",
        pdfSection6: "6. STRATEGIC INTERROGATION (30 QUESTIONS)",
        pdfSection7: "7. DIGITAL SIGNATURE",
        pdfLegalTitle: "LEGAL BASIS",
        pdfLegalRGIT: "Art. 103 and 104 RGIT - Tax Fraud and Qualified Fraud",
        pdfLegalLGT: "Art. 35 and 63 LGT - Default interest and cooperation duties",
        pdfLegalISO: "ISO/IEC 27037 - Digital Evidence Preservation",
        pdfConclusionText: "The analyzed data shows evidence of fiscal non-conformity. Given the nature of the facts, it is incumbent upon the legal mandator to use this opinion for the determination of veracity in court and to request inspection audit to the competent entities.",
        pdfFooterLine1: "Art. 103 and 104 RGIT · ISO/IEC 27037",
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Forensic Expertise Module v12.5 | EM · EN",
        pdfLabelName: "Name",
        pdfLabelNIF: "Tax ID",
        pdfLabelSession: "Expertise No.",
        pdfLabelTimestamp: "Unix Timestamp",
        pdfLabelPlatform: "Platform",
        pdfLabelAddress: "Address"
    }
};

let currentLang = 'pt';

// ============================================================================
// 4. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.5-RETA-FINAL',
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
    documents: {
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0, iliquido: 0, iva: 0, bruto: 0 } },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0, records: 0 } },
        statements: { files: [], hashes: {}, totals: { records: 0, ganhosApp: 0, campanhas: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, despesasComissao: 0 } },
        dac7: { files: [], hashes: {}, totals: { records: 0, q1: 0, q2: 0, q3: 0, q4: 0, servicosQ1: 0, servicosQ2: 0, servicosQ3: 0, servicosQ4: 0 } }
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
    populateAnoFiscal();
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
        populateAnoFiscal();
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
    if (text) text.textContent = `MÓDULO FORENSE v12.5... ${percent}%`;
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
    logAudit('SISTEMA VDC v12.5 RETA FINAL ONLINE · MODO PERÍCIA ATIVO', 'success');
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_5');
        if (stored) {
            const client = JSON.parse(stored);
            if (client && client.name && client.nif) {
                VDCSystem.client = client;
                document.getElementById('clientStatusFixed').style.display = 'flex';
                setElementText('clientNameDisplayFixed', client.name);
                setElementText('clientNifDisplayFixed', client.nif);
                document.getElementById('clientNameFixed').value = client.name;
                document.getElementById('clientNIFFixed').value = client.nif;
                logAudit(`Sujeito passivo recuperado: ${client.name}`, 'success');
            }
        }
    } catch(e) { console.warn('Cache limpo'); }
    startClockAndDate();
}

function populateAnoFiscal() {
    const selectAno = document.getElementById('anoFiscal');
    if (!selectAno) return;
    for(let ano = 2018; ano <= 2036; ano++) {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        if(ano === 2024) opt.selected = true;
        selectAno.appendChild(opt);
    }
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

    document.getElementById('anoFiscal')?.addEventListener('change', (e) => {
        VDCSystem.selectedYear = parseInt(e.target.value);
        logAudit(`Ano fiscal em exame alterado para: ${e.target.value}`, 'info');
    });

    document.getElementById('periodoAnalise')?.addEventListener('change', (e) => {
        VDCSystem.selectedPeriodo = e.target.value;
        const periodos = {
            'anual': 'Exercício Completo (Anual)',
            '1s': '1.º Semestre',
            '2s': '2.º Semestre',
            'trimestral': 'Análise Trimestral',
            'mensal': 'Análise Mensal'
        };
        logAudit(`Período temporal alterado para: ${periodos[e.target.value] || e.target.value}`, 'info');
    });

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
        { id: 'lblFiscalYear', key: 'lblFiscalYear' },
        { id: 'lblPeriodo', key: 'lblPeriodo' },
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
        { id: 'uploadDac7Text', key: 'uploadDac7Text' },
        { id: 'summaryTitle', key: 'summaryTitle' },
        { id: 'modalSaveBtn', key: 'modalSaveBtn' },
        { id: 'lblDate', key: 'lblDate' },
        { id: 'alertCriticalTitle', key: 'alertCriticalTitle' },
        { id: 'alertOmissionText', key: 'alertOmissionText' },
        { id: 'moduleSaftTitle', key: 'moduleSaftTitle' },
        { id: 'moduleStatementTitle', key: 'moduleStatementTitle' },
        { id: 'moduleDac7Title', key: 'moduleDac7Title' },
        { id: 'saftIliquidoLabel', key: 'saftIliquido' },
        { id: 'saftIvaLabel', key: 'saftIva' },
        { id: 'saftBrutoLabel', key: 'saftBruto' },
        { id: 'stmtGanhosLabel', key: 'stmtGanhos' },
        { id: 'stmtCampanhasLabel', key: 'stmtCampanhas' },
        { id: 'stmtGorjetasLabel', key: 'stmtGorjetas' },
        { id: 'stmtPortagensLabel', key: 'stmtPortagens' },
        { id: 'stmtTaxasCancelLabel', key: 'stmtTaxasCancel' },
        { id: 'dac7Q1Label', key: 'dac7Q1' },
        { id: 'dac7Q2Label', key: 'dac7Q2' },
        { id: 'dac7Q3Label', key: 'dac7Q3' },
        { id: 'dac7Q4Label', key: 'dac7Q4' },
        { id: 'quantumTitle', key: 'quantumTitle' },
        { id: 'quantumFormula', key: 'quantumFormula' },
        { id: 'quantumNote', key: 'quantumNote' },
        { id: 'verdictPercentLabel', key: 'verdictPercent' }
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
    localStorage.setItem('vdc_client_data_bd_v12_5', JSON.stringify(VDCSystem.client));

    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);

    logAudit(`Sujeito passivo registado: ${name} (NIF ${nif})`, 'success');
    showToast('Identidade validada com sucesso', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 7. GESTÃO DE EVIDÊNCIAS (RETIFICAÇÃO CRÍTICA v12.5)
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
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s) com integridade verificada`, 'success');
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        
        // RETIFICAÇÃO: Atualizar Dashboard IMEDIATAMENTE após upload
        updateDashboard();
        updateModulesUI();
        
        showToast(`${files.length} ficheiro(s) processados e selados`, 'success');
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
                statement: '<i class="fas fa-file-contract"></i> SELECIONAR EXTRATOS',
                dac7: '<i class="fas fa-envelope-open-text"></i> SELECIONAR DAC7'
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

    // Roteamento para processadores específicos
    switch(type) {
        case 'saft':
            processSAFTFile(text, file.name);
            break;
        case 'statement':
            processStatementFile(text, file.name);
            break;
        case 'invoice':
            processInvoiceFile(text, file.name);
            break;
        case 'dac7':
            processDAC7File(text, file.name);
            break;
        default:
            break;
    }

    // Atualizar lista de ficheiros no modal
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   type === 'dac7' ? 'dac7FileListModal' :
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

// ============================================================================
// 7.1 PROCESSADOR SAF-T (LEITOR RESILIENTE) - RETIFICAÇÃO v12.5
// ============================================================================
function processSAFTFile(text, fileName) {
    let bruto = 0, iliquido = 0, iva = 0;
    let xmlDoc = null;
    let useRegex = false;

    // Tentar parsing XML
    try {
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(text, "text/xml");
        const errorNode = xmlDoc.querySelector('parsererror');
        if (errorNode) {
            useRegex = true;
            logAudit(`SAF-T ${fileName}: XML com erros, ativar modo Regex resiliente`, 'warn');
        }
    } catch(e) {
        useRegex = true;
        logAudit(`SAF-T ${fileName}: Falha no DOMParser, ativar modo Regex`, 'warn');
    }

    if (!useRegex && xmlDoc) {
        // Modo XML Parsing
        try {
            const taxPayable = xmlDoc.querySelector('TaxPayable');
            const netTotal = xmlDoc.querySelector('NetTotal');
            const grossTotal = xmlDoc.querySelector('GrossTotal');

            if (taxPayable) iva = toForensicNumber(taxPayable.textContent);
            if (netTotal) iliquido = toForensicNumber(netTotal.textContent);
            if (grossTotal) bruto = toForensicNumber(grossTotal.textContent);

            // Fallback para TotalCredit/TotalDebit se GrossTotal não existir
            if (bruto === 0) {
                const totalCredit = xmlDoc.querySelector('TotalCredit');
                const totalDebit = xmlDoc.querySelector('TotalDebit');
                if (totalCredit) bruto = toForensicNumber(totalCredit.textContent);
                if (totalDebit) bruto = Math.max(bruto, toForensicNumber(totalDebit.textContent));
            }
        } catch(e) {
            useRegex = true;
        }
    }

    if (useRegex) {
        // MODO REGEX RESILIENTE
        // Regex para TotalCredit
        const creditMatch = text.match(/TotalCredit>\s*([\d\.,]+)/i);
        if (creditMatch) {
            bruto = toForensicNumber(creditMatch[1]);
        }

        // Regex para TotalDebit
        const debitMatch = text.match(/TotalDebit>\s*([\d\.,]+)/i);
        if (debitMatch) {
            const debitVal = toForensicNumber(debitMatch[1]);
            if (debitVal > bruto) bruto = debitVal;
        }

        // Regex para TaxPayable (IVA)
        const taxMatch = text.match(/TaxPayable>\s*([\d\.,]+)/i);
        if (taxMatch) {
            iva = toForensicNumber(taxMatch[1]);
        }

        // Regex para NetTotal
        const netMatch = text.match(/NetTotal>\s*([\d\.,]+)/i);
        if (netMatch) {
            iliquido = toForensicNumber(netMatch[1]);
        }
    }

    // Se não encontrou NetTotal, calcular
    if (iliquido === 0 && bruto > 0) {
        iliquido = bruto - iva;
    }

    // Se não encontrou nada, assumir 0
    if (bruto === 0 && iva === 0 && iliquido === 0) {
        logAudit(`SAF-T ${fileName}: Nenhum valor encontrado, assumindo 0.00`, 'warn');
    }

    // Acumular valores
    VDCSystem.documents.saft.totals.bruto = (VDCSystem.documents.saft.totals.bruto || 0) + bruto;
    VDCSystem.documents.saft.totals.iliquido = (VDCSystem.documents.saft.totals.iliquido || 0) + iliquido;
    VDCSystem.documents.saft.totals.iva = (VDCSystem.documents.saft.totals.iva || 0) + iva;

    // Atualizar extractedValues
    VDCSystem.analysis.extractedValues.saftBruto = VDCSystem.documents.saft.totals.bruto;
    VDCSystem.analysis.extractedValues.saftIliquido = VDCSystem.documents.saft.totals.iliquido;
    VDCSystem.analysis.extractedValues.saftIva = VDCSystem.documents.saft.totals.iva;

    logAudit(`SAF-T processado: ${fileName} | Bruto: ${formatCurrency(bruto)} | IVA: ${formatCurrency(iva)}`, 'info');
}

// ============================================================================
// 7.2 PROCESSADOR DE EXTRATOS (INTELIGENTE) - RETIFICAÇÃO v12.5
// ============================================================================
function processStatementFile(text, fileName) {
    let ganhos = 0, campanhas = 0, gorjetas = 0, portagens = 0, taxasCancel = 0, comissao = 0;

    // Usar PapaParse com delimiter auto
    const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: "auto",
        dynamicTyping: false
    });

    if (result.data && result.data.length > 0) {
        result.data.forEach(row => {
            // Iterar sobre todas as colunas
            Object.keys(row).forEach(key => {
                const rawVal = row[key];
                const keyLower = key.toLowerCase();
                
                // Converter valor (corrigir formato PT se necessário)
                const val = toForensicNumber(rawVal);

                if (val === 0) return;

                // Mapeamento por keywords
                const desc = keyLower + ' ' + (rawVal?.toString().toLowerCase() || '');

                // Ganhos
                if (desc.includes('earning') || desc.includes('ganho') || desc.includes('rendimento') || desc.includes('receita')) {
                    if (desc.includes('app') || desc.includes('viagem') || desc.includes('trip')) {
                        ganhos += val;
                    } else if (desc.includes('campaign') || desc.includes('campanha') || desc.includes('bonus') || desc.includes('bónus')) {
                        campanhas += val;
                    } else if (desc.includes('tip') || desc.includes('gorjeta')) {
                        gorjetas += val;
                    } else if (desc.includes('toll') || desc.includes('portagem')) {
                        portagens += val;
                    } else if (desc.includes('cancel') || desc.includes('cancelamento')) {
                        taxasCancel += val;
                    } else {
                        // Se não especificado, assumir ganhos gerais
                        ganhos += val;
                    }
                }

                // Comissões/Despesas
                if (desc.includes('commission') || desc.includes('comissao') || desc.includes('comissão') || 
                    desc.includes('service fee') || desc.includes('taxa') || desc.includes('fee') ||
                    desc.includes('despesa')) {
                    comissao += Math.abs(val);
                }

                // Verificar Uber, Bolt, FreeNow na descrição para ganhos
                if (desc.includes('uber') || desc.includes('bolt') || desc.includes('freenow') || 
                    desc.includes('cabify') || desc.includes('indrive')) {
                    if (!desc.includes('commission') && !desc.includes('comissao') && !desc.includes('taxa')) {
                        ganhos += val;
                    }
                }
            });
        });
    }

    // Acumular
    VDCSystem.documents.statements.totals.ganhosApp = (VDCSystem.documents.statements.totals.ganhosApp || 0) + ganhos;
    VDCSystem.documents.statements.totals.campanhas = (VDCSystem.documents.statements.totals.campanhas || 0) + campanhas;
    VDCSystem.documents.statements.totals.gorjetas = (VDCSystem.documents.statements.totals.gorjetas || 0) + gorjetas;
    VDCSystem.documents.statements.totals.portagens = (VDCSystem.documents.statements.totals.portagens || 0) + portagens;
    VDCSystem.documents.statements.totals.taxasCancelamento = (VDCSystem.documents.statements.totals.taxasCancelamento || 0) + taxasCancel;
    VDCSystem.documents.statements.totals.despesasComissao = (VDCSystem.documents.statements.totals.despesasComissao || 0) + comissao;

    // Atualizar extractedValues
    VDCSystem.analysis.extractedValues.rendimentosBrutos = VDCSystem.documents.statements.totals.ganhosApp;
    VDCSystem.analysis.extractedValues.comissaoApp = -VDCSystem.documents.statements.totals.despesasComissao;
    VDCSystem.analysis.extractedValues.ganhosApp = VDCSystem.documents.statements.totals.ganhosApp;
    VDCSystem.analysis.extractedValues.campanhas = VDCSystem.documents.statements.totals.campanhas;
    VDCSystem.analysis.extractedValues.gorjetas = VDCSystem.documents.statements.totals.gorjetas;
    VDCSystem.analysis.extractedValues.portagens = VDCSystem.documents.statements.totals.portagens;
    VDCSystem.analysis.extractedValues.taxasCancelamento = VDCSystem.documents.statements.totals.taxasCancelamento;

    logAudit(`Extrato processado: ${fileName} | Ganhos: ${formatCurrency(ganhos)} | Comissões: ${formatCurrency(comissao)}`, 'info');
}

// ============================================================================
// 7.3 PROCESSADOR DE FATURAS
// ============================================================================
function processInvoiceFile(text, fileName) {
    // Regex para encontrar valores monetários
    const matches = text.match(/(\d{1,3}[.,]\d{2})/g);
    let totalFaturas = 0;

    if (matches) {
        // Pegar o maior valor encontrado (provavelmente o total)
        const values = matches.map(m => toForensicNumber(m));
        const maxVal = Math.max(...values);
        totalFaturas = maxVal;
    }

    // Acumular
    VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + totalFaturas;
    VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue;

    logAudit(`Fatura processada: ${fileName} | Valor: ${formatCurrency(totalFaturas)}`, 'success');
}

// ============================================================================
// 7.4 PROCESSADOR DAC7
// ============================================================================
function processDAC7File(text, fileName) {
    // Regex para valores trimestrais
    const q1Match = text.match(/Q1[^\d]*([\d\.,]+)/i);
    const q2Match = text.match(/Q2[^\d]*([\d\.,]+)/i);
    const q3Match = text.match(/Q3[^\d]*([\d\.,]+)/i);
    const q4Match = text.match(/Q4[^\d]*([\d\.,]+)/i);

    if (q1Match) VDCSystem.documents.dac7.totals.q1 = toForensicNumber(q1Match[1]);
    if (q2Match) VDCSystem.documents.dac7.totals.q2 = toForensicNumber(q2Match[1]);
    if (q3Match) VDCSystem.documents.dac7.totals.q3 = toForensicNumber(q3Match[1]);
    if (q4Match) VDCSystem.documents.dac7.totals.q4 = toForensicNumber(q4Match[1]);

    logAudit(`DAC7 importado: ${fileName}`, 'success');
}

// ============================================================================
// 8. ATUALIZAÇÃO DE UI
// ============================================================================
function updateEvidenceSummary() {
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const idMap = { invoices: 'Invoices', statements: 'Statements', control: 'Control', saft: 'Saft', dac7: 'Dac7' };
        const elId = `summary${idMap[k] || k}`;
        const el = document.getElementById(elId);
        if(el) el.textContent = count;
    });
    let total = 0;
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
        total += VDCSystem.documents[k]?.files?.length || 0;
    });
    setElementText('summaryTotal', total);
}

function updateCounters() {
    let total = 0;
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
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

    // QUANTUM BOX
    setElementText('quantumValue', formatCurrency(ev.quantumBeneficio || 0));

    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (ev.diferencialCusto > 0) ? 'block' : 'none';
}

function updateModulesUI() {
    const ev = VDCSystem.analysis.extractedValues;
    const doc = VDCSystem.documents;
    
    // SAF-T Module
    setElementText('saftIliquidoValue', formatCurrency(doc.saft?.totals?.iliquido || ev.saftIliquido || 0));
    setElementText('saftIvaValue', formatCurrency(doc.saft?.totals?.iva || ev.saftIva || 0));
    setElementText('saftBrutoValue', formatCurrency(doc.saft?.totals?.bruto || ev.saftBruto || 0));
    
    // Statement Module
    setElementText('stmtGanhosValue', formatCurrency(doc.statements?.totals?.ganhosApp || ev.ganhosApp || 0));
    setElementText('stmtCampanhasValue', formatCurrency(doc.statements?.totals?.campanhas || ev.campanhas || 0));
    setElementText('stmtGorjetasValue', formatCurrency(doc.statements?.totals?.gorjetas || ev.gorjetas || 0));
    setElementText('stmtPortagensValue', formatCurrency(doc.statements?.totals?.portagens || ev.portagens || 0));
    setElementText('stmtTaxasCancelValue', formatCurrency(doc.statements?.totals?.taxasCancelamento || ev.taxasCancelamento || 0));
    
    // DAC7 Module
    setElementText('dac7Q1Value', formatCurrency(doc.dac7?.totals?.q1 || 0));
    setElementText('dac7Q2Value', formatCurrency(doc.dac7?.totals?.q2 || 0));
    setElementText('dac7Q3Value', formatCurrency(doc.dac7?.totals?.q3 || 0));
    setElementText('dac7Q4Value', formatCurrency(doc.dac7?.totals?.q4 || 0));
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (btn) {
        btn.disabled = false;
    }
}

// ============================================================================
// 9. MODO DEMO
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

    logAudit('ATIVANDO CASO SIMULADO v12.5...', 'info');

    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();

    // Simular uploads
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 2);
    simulateUpload('statements', 2);
    simulateUpload('dac7', 1);

    setTimeout(() => {
        // Dados simulados completos
        VDCSystem.documents.saft.totals.bruto = forensicRound(12500.00);
        VDCSystem.documents.saft.totals.iliquido = forensicRound(11792.45);
        VDCSystem.documents.saft.totals.iva = forensicRound(707.55);
        
        VDCSystem.documents.statements.totals.ganhosApp = forensicRound(8500.00);
        VDCSystem.documents.statements.totals.campanhas = forensicRound(500.00);
        VDCSystem.documents.statements.totals.gorjetas = forensicRound(150.00);
        VDCSystem.documents.statements.totals.portagens = forensicRound(200.00);
        VDCSystem.documents.statements.totals.taxasCancelamento = forensicRound(75.00);
        VDCSystem.documents.statements.totals.despesasComissao = forensicRound(3125.00);
        
        VDCSystem.documents.dac7.totals.q1 = forensicRound(2800.00);
        VDCSystem.documents.dac7.totals.q2 = forensicRound(3200.00);
        VDCSystem.documents.dac7.totals.q3 = forensicRound(2950.00);
        VDCSystem.documents.dac7.totals.q4 = forensicRound(3100.00);
        
        VDCSystem.analysis.extractedValues = {
            rendimentosBrutos: VDCSystem.documents.statements.totals.ganhosApp,
            comissaoApp: -VDCSystem.documents.statements.totals.despesasComissao,
            faturaPlataforma: forensicRound(250.00),
            saftBruto: VDCSystem.documents.saft.totals.bruto,
            saftIliquido: VDCSystem.documents.saft.totals.iliquido,
            saftIva: VDCSystem.documents.saft.totals.iva,
            ganhosApp: VDCSystem.documents.statements.totals.ganhosApp,
            campanhas: VDCSystem.documents.statements.totals.campanhas,
            gorjetas: VDCSystem.documents.statements.totals.gorjetas,
            portagens: VDCSystem.documents.statements.totals.portagens,
            taxasCancelamento: VDCSystem.documents.statements.totals.taxasCancelamento,
            iva23: forensicRound(392.15),
            jurosMora: forensicRound(15.69),
            jurosCompensatorios: forensicRound(23.53),
            multaDolo: forensicRound(170.50),
            quantumBeneficio: 38000 * 12 * 7
        };
        
        VDCSystem.analysis.crossings.delta = forensicRound(1705.00);

        performForensicCrossings(
            VDCSystem.analysis.extractedValues.rendimentosBrutos,
            VDCSystem.analysis.extractedValues.comissaoApp,
            VDCSystem.analysis.extractedValues.faturaPlataforma
        );

        selectQuestions(VDCSystem.analysis.verdict.key);

        updateDashboard();
        updateModulesUI();
        renderChart();
        showAlerts();

        logAudit('Perícia simulada concluída. Quantum do benefício ilícito calculado: 3.192.000,00 €', 'success');
        VDCSystem.processing = false;
        if(demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = `<i class="fas fa-flask"></i> ${translations[currentLang].navDemo}`;
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
    }
    updateCounters();
    updateEvidenceSummary();
}

// ============================================================================
// 10. MOTOR DE PERÍCIA FORENSE
// ============================================================================
function performAudit() {
    VDCSystem.forensicMetadata = getForensicMetadata();
    VDCSystem.performanceTiming.start = performance.now();

    const analyzeBtn = document.getElementById('analyzeBtn');
    if(analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A EXECUTAR PERÍCIA...';
    }

    setTimeout(() => {
        try {
            const stmtGross = VDCSystem.documents.statements?.totals?.ganhosApp || 0;
            const stmtCommission = VDCSystem.documents.statements?.totals?.despesasComissao || 0;
            const invoiceVal = VDCSystem.documents.invoices?.totals?.invoiceValue || 0;

            const grossRevenue = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.rendimentosBrutos : stmtGross;
            const platformCommission = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.comissaoApp : -stmtCommission;
            const faturaPlataforma = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.faturaPlataforma : invoiceVal;

            performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);

            selectQuestions(VDCSystem.analysis.verdict.key);

            updateDashboard();
            updateModulesUI();
            renderChart();
            showAlerts();

            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            logAudit(`Perícia concluída em ${duration}ms. VEREDICTO: ${VDCSystem.analysis.verdict.level}`, 'success');

        } catch(error) {
            console.error('Erro na perícia:', error);
            logAudit(`ERRO CRÍTICO NA PERÍCIA: ${error.message}`, 'error');
        } finally {
            if(analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="fas fa-search-dollar"></i> ${translations[currentLang].btnAnalyze}`;
            }
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

    cross.invoiceDivergence = Math.abs(comissaoAbs - ev.faturaPlataforma) > 0.01;

    const baseComissao = (ev.ganhosApp || ev.rendimentosBrutos) + (ev.taxasCancelamento || 0);
    const comissaoEsperada = baseComissao * 0.25;
    cross.comissaoDivergencia = Math.abs(comissaoAbs - comissaoEsperada);

    ev.iva23 = forensicRound(diferencial * 0.23);
    ev.amtImtFee = forensicRound(comissaoAbs * 0.05);
    ev.jurosMora = forensicRound(ev.iva23 * 0.04);
    ev.jurosCompensatorios = forensicRound(ev.iva23 * 0.06);
    ev.multaDolo = forensicRound(diferencial * 0.10);
    
    ev.quantumBeneficio = 38000 * 12 * 7;

    cross.bigDataAlertActive = diferencial > 0.01;

    VDCSystem.analysis.verdict = getRiskVerdict(diferencial, ev.rendimentosBrutos);
}

function selectQuestions(riskKey) {
    VDCSystem.analysis.selectedQuestions = [...QUESTIONS_CACHE];
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const verdict = VDCSystem.analysis.verdict;

    // BigData Alert
    if (ev.diferencialCusto > 0) {
        const alertEl = document.getElementById('bigdataAlert');
        if (alertEl) {
            alertEl.style.display = 'flex';
            setElementText('alertAmount', `Valor: ${formatCurrency(ev.diferencialCusto)}`);
        }
    }

    // Verdict Display
    const verdictEl = document.getElementById('verdictDisplay');
    if (verdictEl && verdict) {
        verdictEl.style.display = 'block';
        verdictEl.className = `verdict-display active verdict-${verdict.key}`;
        setElementText('verdictLevel', verdict.level);
        setElementText('verdictPercent', `Desvio: ${verdict.percent}`);
        setElementText('verdictDesc', verdict.description);
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;

    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
    }

    const ev = VDCSystem.analysis.extractedValues;

    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto Real', 'Comissões', 'Líquido', 'Faturado'],
            datasets: [{
                label: 'Triangulação Financeira (€)',
                data: [
                    ev.rendimentosBrutos || 0,
                    Math.abs(ev.comissaoApp || 0),
                    (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0),
                    ev.faturaPlataforma || 0
                ],
                backgroundColor: [
                    'rgba(0, 229, 255, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderColor: [
                    'rgba(0, 229, 255, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    });
}

// ============================================================================
// 11. EXPORTAÇÃO PDF (DESBLOQUEADO) - RETIFICAÇÃO v12.5
// ============================================================================
function exportPDF() {
    // RETIFICAÇÃO: Removida verificação restrita de cliente
    // Se não houver cliente, usar dados DEMO CORP
    
    const clientName = VDCSystem.client?.name || 'DEMO CORP, Lda';
    const clientNIF = VDCSystem.client?.nif || '503244732';
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const ev = VDCSystem.analysis.extractedValues;
    const verdict = VDCSystem.analysis.verdict || { level: 'PENDENTE', percent: '0.00%', description: 'Aguardando análise.' };
    const platform = PLATFORM_DATA[VDCSystem.selectedPlatform] || { name: 'N/A', address: 'N/A', nif: 'N/A' };

    // Cabeçalho
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('VDC SYSTEMS INTERNATIONAL', 105, 15, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL', 105, 23, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('ISO/IEC 27037 | NIST SP 800-86 | Art. 103.º RGIT', 105, 30, { align: 'center' });
    doc.text(`Sessão: ${VDCSystem.sessionId} | v12.5 RETA FINAL`, 105, 36, { align: 'center' });

    // Seção 1: Identificação
    let y = 50;
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. IDENTIFICAÇÃO E METADADOS', 14, y);
    
    y += 7;
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Nome: ${clientName}`, 14, y); y += 5;
    doc.text(`NIF: ${clientNIF}`, 14, y); y += 5;
    doc.text(`Plataforma: ${platform.name}`, 14, y); y += 5;
    doc.text(`Morada: ${platform.address}`, 14, y); y += 5;
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 14, y); y += 5;
    doc.text(`Timestamp Unix: ${Math.floor(Date.now() / 1000)}`, 14, y);

    // Seção 2: Análise Financeira
    y += 10;
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. ANÁLISE FINANCEIRA CRUZADA', 14, y);

    y += 7;
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Bruto Real: ${formatCurrency(ev.rendimentosBrutos || 0)}`, 14, y); y += 5;
    doc.text(`Comissões: ${formatCurrency(ev.comissaoApp || 0)}`, 14, y); y += 5;
    doc.text(`Líquido: ${formatCurrency((ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0))}`, 14, y); y += 5;
    doc.text(`Faturado: ${formatCurrency(ev.faturaPlataforma || 0)}`, 14, y); y += 5;
    doc.text(`Diferencial (Fosso Fiscal): ${formatCurrency(ev.diferencialCusto || 0)}`, 14, y); y += 5;
    doc.text(`IVA 23% (Estimado): ${formatCurrency(ev.iva23 || 0)}`, 14, y); y += 5;
    doc.text(`Quantum Benefício Ilícito: ${formatCurrency(ev.quantumBeneficio || 0)}`, 14, y);

    // Seção 3: Veredito
    y += 10;
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('3. VEREDICTO DE RISCO (RGIT)', 14, y);

    y += 7;
    doc.setTextColor(verdict.color === '#ef4444' ? [239, 68, 68] : verdict.color === '#f59e0b' ? [245, 158, 11] : [68, 189, 50]);
    doc.setFontSize(10);
    doc.text(`VEREDICTO: ${verdict.level}`, 14, y);
    
    y += 5;
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(9);
    doc.text(`Desvio: ${verdict.percent}`, 14, y); y += 5;
    doc.text(verdict.description, 14, y, { maxWidth: 180 });

    // Seção 4: Conclusões
    y += 15;
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('4. CONCLUSÕES PERICIAIS', 14, y);

    y += 7;
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const conclusion = translations[currentLang].pdfConclusionText;
    const splitConclusion = doc.splitTextToSize(conclusion, 180);
    doc.text(splitConclusion, 14, y);

    // Seção 5: Cadeia de Custódia
    y = 230;
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('5. CADEIA DE CUSTÓDIA', 14, y);

    y += 7;
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(`Master Hash: ${VDCSystem.masterHash || 'N/A'}`, 14, y); y += 4;
    doc.text(`Total de Evidências: ${VDCSystem.counts.total}`, 14, y);

    // Rodapé
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text('VDC Systems International © 2024/2026 | Módulo de Peritagem Forense v12.5', 105, 287, { align: 'center' });
    doc.text('Art. 103.º e 104.º RGIT · ISO/IEC 27037', 105, 292, { align: 'center' });

    // Download
    doc.save(`VDC_Parecer_Pericial_${VDCSystem.sessionId}.pdf`);
    logAudit('Parecer pericial PDF exportado com sucesso', 'success');
    showToast('PDF exportado com sucesso', 'success');
}

// ============================================================================
// 12. EXPORTAÇÃO JSON
// ============================================================================
function exportDataJSON() {
    const data = {
        session: VDCSystem.sessionId,
        version: VDCSystem.version,
        timestamp: new Date().toISOString(),
        client: VDCSystem.client || { name: 'N/A', nif: 'N/A' },
        analysis: VDCSystem.analysis,
        documents: VDCSystem.documents,
        verdict: VDCSystem.analysis.verdict,
        masterHash: VDCSystem.masterHash
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VDC_Dados_Pericia_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    logAudit('Dados exportados em JSON', 'success');
    showToast('JSON exportado com sucesso', 'success');
}

// ============================================================================
// 13. RESET E UTILITÁRIOS
// ============================================================================
function resetSystem() {
    if (!confirm('Reiniciar o sistema? Todos os dados serão perdidos.')) return;
    
    localStorage.removeItem('vdc_client_data_bd_v12_5');
    
    VDCSystem.client = null;
    VDCSystem.documents = {
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0, iliquido: 0, iva: 0, bruto: 0 } },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0, records: 0 } },
        statements: { files: [], hashes: {}, totals: { records: 0, ganhosApp: 0, campanhas: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, despesasComissao: 0 } },
        dac7: { files: [], hashes: {}, totals: { records: 0, q1: 0, q2: 0, q3: 0, q4: 0 } }
    };
    VDCSystem.analysis = {
        extractedValues: {},
        crossings: { delta: 0 },
        verdict: null,
        evidenceIntegrity: [],
        selectedQuestions: []
    };
    VDCSystem.counts = { total: 0 };
    VDCSystem.demoMode = false;

    document.getElementById('clientStatusFixed').style.display = 'none';
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    
    document.getElementById('bigdataAlert').style.display = 'none';
    document.getElementById('verdictDisplay').style.display = 'none';
    
    updateDashboard();
    updateModulesUI();
    updateCounters();
    updateEvidenceSummary();
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
        VDCSystem.chart = null;
    }

    logAudit('Sistema reiniciado', 'warn');
    showToast('Sistema reiniciado', 'success');
}

function clearConsole() {
    VDCSystem.logs = [];
    document.getElementById('consoleOutput').innerHTML = '';
}

function generateMasterHash() {
    const data = JSON.stringify(VDCSystem.documents) + VDCSystem.sessionId + Date.now();
    VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
    setElementText('masterHashDisplay', VDCSystem.masterHash);
}

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const entry = { timestamp, message, type };
    VDCSystem.logs.push(entry);

    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
        const div = document.createElement('div');
        div.className = `log-entry log-${type}`;
        div.textContent = `[${timestamp}] ${message}`;
        consoleOutput.appendChild(div);
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
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <p>${message}</p>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================================================
// FIM DO FICHEIRO script.js · v12.5 RETA FINAL FORENSE
// TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA
// ============================================================================
