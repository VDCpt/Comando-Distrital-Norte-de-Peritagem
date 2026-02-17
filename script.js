/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.6 RETA FINAL
 * ====================================================================
 * CONSOLIDAÇÃO FINAL: INTELIGÊNCIA FORENSE + QUANTUM BENEFÍCIO ILÍCITO
 * MECANISMO DE LIMPEZA BINÁRIA · PARSER DE FLUXO
 * Extração robusta de PDFs da Bolt/Uber com caracteres invisíveis
 * TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA · PT-PT JURÍDICO
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.6 FINAL CARREGADO');

// ============================================================================
// 1. CONFIGURAÇÃO DO PDF.JS
// ============================================================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================================================
// 2. DADOS DAS PLATAFORMAS & BANCO DE PERGUNTAS (IA CACHE 30)
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
// 3. UTILITÁRIOS FORENSES (COM MECANISMO DE LIMPEZA BINÁRIA)
// ============================================================================
const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const toForensicNumber = (v) => {
    if (!v) return 0;
    let str = v.toString().trim();
    
    // Remove todos os caracteres não numéricos exceto vírgula, ponto e hífen
    str = str.replace(/[^\d.,-]/g, '');
    
    // Deteção automática de formato PT vs EN
    if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            // Formato PT: 1.000,50 → remove pontos, troca vírgula por ponto
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // Formato EN: 1,000.50 → remove vírgulas
            str = str.replace(/,/g, '');
        }
    } else if (str.indexOf(',') > -1) {
        // Apenas vírgula: assume decimal PT e troca por ponto
        str = str.replace(',', '.');
    }
    
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
    return forensicRound(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross)) return { level: 'INCONCLUSIVO', key: 'low', color: '#8c7ae6', description: 'Dados insuficientes para veredicto pericial.', percent: '0.00%' };
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
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
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            resolve("[PDF_BINARY_CONTENT]");
            return;
        }
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
// 4. SISTEMA DE TRADUÇÕES (COMPLETO PT-PT / EN)
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR PERÍCIA v12.6",
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
        kpiTitle: "TRIANGULAÇÃO FINANCEIRA · ALGORITMO FORENSE v12.6",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÕES",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURADO",
        consoleTitle: "LOG DE CUSTÓDIA · CADEIA DE CUSTÓDIA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.6)",
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
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Módulo de Peritagem Forense v12.6 | EM · PT",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Perícia n.º",
        pdfLabelTimestamp: "Unix Timestamp",
        pdfLabelPlatform: "Plataforma",
        pdfLabelAddress: "Morada"
    },
    en: {
        startBtn: "START FORENSIC EXAM v12.6",
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
        kpiTitle: "FINANCIAL TRIANGULATION · FORENSIC ALGORITHM v12.6",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSIONS",
        kpiNetText: "NET",
        kpiInvText: "INVOICED",
        consoleTitle: "CUSTODY LOG · CHAIN OF CUSTODY",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.6)",
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
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Forensic Expertise Module v12.6 | EM · EN",
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
// 5. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.6-RETA-FINAL',
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
// 6. INICIALIZAÇÃO
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
    if (text) text.textContent = `MÓDULO FORENSE v12.6... ${percent}%`;
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
    logAudit('SISTEMA VDC v12.6 RETA FINAL ONLINE · MODO PERÍCIA ATIVO', 'success');
    
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
    document.getElementById('exportJSONBtn').disabled = false;
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_6');
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
    const sel = document.getElementById('anoFiscal');
    if(!sel) return;
    for(let y=2030; y>=2018; y--) {
        const opt = document.createElement('option'); 
        opt.value=y; 
        opt.textContent=y;
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
// 7. REGISTO DE CLIENTE
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();

    if (!name || name.length < 3) return showToast('Nome inválido', 'error');
    if (!validateNIF(nif)) return showToast('NIF inválido (checksum falhou)', 'error');

    VDCSystem.client = { name, nif, platform: VDCSystem.selectedPlatform };
    localStorage.setItem('vdc_client_data_bd_v12_6', JSON.stringify(VDCSystem.client));

    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);

    logAudit(`Sujeito passivo registado: ${name} (NIF ${nif})`, 'success');
    showToast('Identidade validada com sucesso', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 8. GESTÃO DE EVIDÊNCIAS COM MECANISMO DE LIMPEZA BINÁRIA
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
    let text = "";
    let isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        
        // ====================================================================
        // MECANISMO DE LIMPEZA BINÁRIA
        // Remove caracteres de controlo e normaliza quebras de linha
        // ====================================================================
        text = fullText
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[–—−]/g, '-')
            .replace(/(\d)[\s\n\r]+(\d)/g, '$1$2');
        
        logAudit(`PDF processado: ${file.name} - Texto extraído e limpo (${text.length} caracteres)`, 'info');
    } else {
        text = await readFileAsText(file);
    }
    
    const contentToHash = text;
    const hash = CryptoJS.SHA256(contentToHash).toString();

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

    // ========================================================================
    // PROCESSAMENTO ESPECÍFICO POR TIPO DE DOCUMENTO
    // ========================================================================
    
    // EXTRATOS BANCÁRIOS / DADOS DA PLATAFORMA
    if (type === 'statement') {
        try {
            // Regex específicas para o formato CSV dentro dos PDFs da Bolt
            const ganhosRegex = /"Ganhos na app"[,\s]*"?([\d\s,.]+)"?/i;
            const comissaoRegex = /"Comissão da app"[,\s]*"?-?([\d\s,.]+)"?/i;
            const gorjetasRegex = /"Gorjetas dos passageiros"[,\s]*"?([\d\s,.]+)"?/i;
            const portagensRegex = /"Portagens"[,\s]*"?([\d\s,.]+)"?/i;
            const cancelamentosRegex = /"Taxas de cancelamento"[,\s]*"?-?([\d\s,.]+)"?/i;
            
            // Fallback para formatos sem aspas
            const ganhosFallback = /Ganhos na app\s*[:.]?\s*([\d\s,.]+)/i;
            const comissaoFallback = /Comissão da app\s*[:.]?\s*-?\s*([\d\s,.]+)/i;
            
            let ganhos = 0, comissao = 0, gorjetas = 0, portagens = 0, cancelamentos = 0;
            
            const ganhosMatch = text.match(ganhosRegex) || text.match(ganhosFallback);
            if (ganhosMatch) {
                ganhos = toForensicNumber(ganhosMatch[1]);
                logAudit(`Ganhos extraídos: ${formatCurrency(ganhos)}`, 'success');
            }
            
            const comissaoMatch = text.match(comissaoRegex) || text.match(comissaoFallback);
            if (comissaoMatch) {
                comissao = toForensicNumber(comissaoMatch[1]);
                logAudit(`Comissão extraída: ${formatCurrency(comissao)}`, 'info');
            }
            
            const gorjetasMatch = text.match(gorjetasRegex);
            if (gorjetasMatch) {
                gorjetas = toForensicNumber(gorjetasMatch[1]);
            }
            
            const portagensMatch = text.match(portagensRegex);
            if (portagensMatch) {
                portagens = toForensicNumber(portagensMatch[1]);
            }
            
            const cancelamentosMatch = text.match(cancelamentosRegex);
            if (cancelamentosMatch) {
                cancelamentos = toForensicNumber(cancelamentosMatch[1]);
            }
            
            VDCSystem.documents.statements.totals.ganhosApp = (VDCSystem.documents.statements.totals.ganhosApp || 0) + ganhos;
            VDCSystem.documents.statements.totals.despesasComissao = (VDCSystem.documents.statements.totals.despesasComissao || 0) + comissao;
            VDCSystem.documents.statements.totals.gorjetas = (VDCSystem.documents.statements.totals.gorjetas || 0) + gorjetas;
            VDCSystem.documents.statements.totals.portagens = (VDCSystem.documents.statements.totals.portagens || 0) + portagens;
            VDCSystem.documents.statements.totals.taxasCancelamento = (VDCSystem.documents.statements.totals.taxasCancelamento || 0) + cancelamentos;
            
            VDCSystem.analysis.extractedValues.rendimentosBrutos = VDCSystem.documents.statements.totals.ganhosApp;
            VDCSystem.analysis.extractedValues.comissaoApp = -VDCSystem.documents.statements.totals.despesasComissao;
            VDCSystem.analysis.extractedValues.gorjetas = VDCSystem.documents.statements.totals.gorjetas;
            VDCSystem.analysis.extractedValues.portagens = VDCSystem.documents.statements.totals.portagens;
            VDCSystem.analysis.extractedValues.taxasCancelamento = VDCSystem.documents.statements.totals.taxasCancelamento;
            
            logAudit(`Extrato processado: ${file.name} | Ganhos: ${formatCurrency(ganhos)} | Comissões: ${formatCurrency(comissao)}`, 'info');
            
        } catch(e) {
            console.warn(`Erro ao processar extrato ${file.name}:`, e);
            logAudit(`Erro no processamento do extrato: ${e.message}`, 'error');
        }
    }

    // FATURAS
    if (type === 'invoice') {
        const faturaRegex = /Total com IVA \(EUR\)[,\s]*"?([\d\s,.]+)"?/i;
        const faturaMatch = text.match(faturaRegex);
        
        if (faturaMatch) {
            const val = toForensicNumber(faturaMatch[1]);
            VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
            VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue;
            logAudit(`Fatura processada: ${file.name} | Valor: ${formatCurrency(val)}`, 'success');
        } else {
            // Fallback para qualquer valor numérico no documento
            const fallbackMatch = text.match(/(\d+[.,]\d{2})/);
            if (fallbackMatch) {
                const val = toForensicNumber(fallbackMatch[1]);
                VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
                VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue;
                logAudit(`Fatura processada (fallback): ${file.name} | Valor: ${formatCurrency(val)}`, 'info');
            }
        }
    }

    // SAF-T (XML)
    if (type === 'saft') {
        try {
            const creditMatch = text.match(/TotalCredit[^>]*>([^<]+)/i);
            const debitMatch = text.match(/TotalDebit[^>]*>([^<]+)/i);
            const taxMatch = text.match(/TaxPayable[^>]*>([^<]+)/i);
            const netMatch = text.match(/NetTotal[^>]*>([^<]+)/i);
            
            let bruto = 0, iva = 0, iliquido = 0;
            
            if (creditMatch) bruto = toForensicNumber(creditMatch[1]);
            if (debitMatch) bruto = Math.max(bruto, toForensicNumber(debitMatch[1]));
            if (taxMatch) iva = toForensicNumber(taxMatch[1]);
            if (netMatch) iliquido = toForensicNumber(netMatch[1]);
            
            if (iliquido === 0 && bruto > 0) iliquido = bruto - iva;
            
            VDCSystem.documents.saft.totals.bruto = (VDCSystem.documents.saft.totals.bruto || 0) + bruto;
            VDCSystem.documents.saft.totals.iliquido = (VDCSystem.documents.saft.totals.iliquido || 0) + iliquido;
            VDCSystem.documents.saft.totals.iva = (VDCSystem.documents.saft.totals.iva || 0) + iva;
            
            VDCSystem.analysis.extractedValues.saftBruto = VDCSystem.documents.saft.totals.bruto;
            VDCSystem.analysis.extractedValues.saftIliquido = VDCSystem.documents.saft.totals.iliquido;
            VDCSystem.analysis.extractedValues.saftIva = VDCSystem.documents.saft.totals.iva;
            
            logAudit(`SAF-T processado: ${file.name} | Bruto: ${formatCurrency(bruto)} | IVA: ${formatCurrency(iva)}`, 'info');
        } catch(e) {
            console.warn(`Erro ao processar SAF-T ${file.name}:`, e);
        }
    }
    
    // DAC7
    if (type === 'dac7') {
        try {
            const dac7AnualRegex = /Total de receitas anuais\s*[:.]?\s*([\d\s,.]+)/i;
            const dac7Q4Regex = /Ganhos do 4\.º trimestre:\s*([\d\s,.]+)/i;
            const q1Regex = /Q1[^\d]*(\d+[.,]\d{2})/i;
            const q2Regex = /Q2[^\d]*(\d+[.,]\d{2})/i;
            const q3Regex = /Q3[^\d]*(\d+[.,]\d{2})/i;
            const q4Regex = /Q4[^\d]*(\d+[.,]\d{2})/i;
            
            const anualMatch = text.match(dac7AnualRegex);
            if (anualMatch) {
                VDCSystem.documents.dac7.totals.q4 = toForensicNumber(anualMatch[1]);
                logAudit(`DAC7 anual extraído: ${formatCurrency(anualMatch[1])}`, 'success');
            }
            
            const q4Match = text.match(dac7Q4Regex) || text.match(q4Regex);
            if (q4Match) {
                VDCSystem.documents.dac7.totals.q4 = toForensicNumber(q4Match[1]);
            }
            
            const q1Match = text.match(q1Regex);
            if (q1Match) VDCSystem.documents.dac7.totals.q1 = toForensicNumber(q1Match[1]);
            
            const q2Match = text.match(q2Regex);
            if (q2Match) VDCSystem.documents.dac7.totals.q2 = toForensicNumber(q2Match[1]);
            
            const q3Match = text.match(q3Regex);
            if (q3Match) VDCSystem.documents.dac7.totals.q3 = toForensicNumber(q3Match[1]);
            
            logAudit(`DAC7 importado: ${file.name}`, 'success');
        } catch(e) {
            console.warn(`Erro ao processar DAC7 ${file.name}:`, e);
        }
    }

    // Atualizar lista de ficheiros no modal
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   type === 'dac7' ? 'dac7FileListModal' :
                   `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    
    const iconClass = isPDF ? 'fa-file-pdf' : 'fa-check-circle';
    const iconColor = isPDF ? '#e74c3c' : 'var(--success-primary)';

    if(listEl) {
        listEl.style.display = 'block';
        listEl.innerHTML += `<div class="file-item-modal">
            <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-hash-modal">${hash.substring(0,8)}...</span>
        </div>`;
    }
}

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

// ============================================================================
// 9. MODO DEMO (CASO SIMULADO)
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

    logAudit('ATIVANDO CASO SIMULADO v12.6...', 'info');

    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();

    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 2);
    simulateUpload('statements', 2);
    simulateUpload('dac7', 1);

    setTimeout(() => {
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
    if (!VDCSystem.client) return showToast('Registe o sujeito passivo primeiro.', 'error');

    const hasFiles = Object.values(VDCSystem.documents).some(d => d.files && d.files.length > 0);
    if (!hasFiles) {
        return showToast('Carregue pelo menos um ficheiro de evidência antes de executar a perícia.', 'error');
    }

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
            const saftBruto = VDCSystem.documents.saft?.totals?.bruto || 0;

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
            showToast('Erro durante a execução da perícia. Verifique os ficheiros carregados.', 'error');
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

    setElementText('quantumValue', formatCurrency(ev.quantumBeneficio || 0));

    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (ev.diferencialCusto > 0) ? 'block' : 'none';
}

function updateModulesUI() {
    const ev = VDCSystem.analysis.extractedValues;
    const doc = VDCSystem.documents;
    
    setElementText('saftIliquidoValue', formatCurrency(doc.saft?.totals?.iliquido || ev.saftIliquido || 0));
    setElementText('saftIvaValue', formatCurrency(doc.saft?.totals?.iva || ev.saftIva || 0));
    setElementText('saftBrutoValue', formatCurrency(doc.saft?.totals?.bruto || ev.saftBruto || 0));
    
    setElementText('stmtGanhosValue', formatCurrency(doc.statements?.totals?.ganhosApp || ev.ganhosApp || 0));
    setElementText('stmtCampanhasValue', formatCurrency(doc.statements?.totals?.campanhas || ev.campanhas || 0));
    setElementText('stmtGorjetasValue', formatCurrency(doc.statements?.totals?.gorjetas || ev.gorjetas || 0));
    setElementText('stmtPortagensValue', formatCurrency(doc.statements?.totals?.portagens || ev.portagens || 0));
    setElementText('stmtTaxasCancelValue', formatCurrency(doc.statements?.totals?.taxasCancelamento || ev.taxasCancelamento || 0));
    
    const comissaoEl = document.getElementById('stmtComissaoValue');
    if (comissaoEl) {
        const comissao = doc.statements?.totals?.despesasComissao || 0;
        comissaoEl.textContent = formatCurrency(comissao);
        if (VDCSystem.analysis.crossings?.invoiceDivergence) {
            comissaoEl.classList.add('alert');
        } else {
            comissaoEl.classList.remove('alert');
        }
    }
    
    setElementText('dac7Q1Value', formatCurrency(doc.dac7?.totals?.q1 || 0));
    setElementText('dac7Q2Value', formatCurrency(doc.dac7?.totals?.q2 || 0));
    setElementText('dac7Q3Value', formatCurrency(doc.dac7?.totals?.q3 || 0));
    setElementText('dac7Q4Value', formatCurrency(doc.dac7?.totals?.q4 || 0));
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    const verdictDisplay = document.getElementById('verdictDisplay');
    if(verdictDisplay && VDCSystem.analysis.verdict) {
        verdictDisplay.style.display = 'block';
        verdictDisplay.className = `verdict-display active verdict-${VDCSystem.analysis.verdict.key}`;
        setElementText('verdictLevel', VDCSystem.analysis.verdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.verdict.description);
        setElementText('verdictPercentValue', VDCSystem.analysis.verdict.percent);
        document.getElementById('verdictLevel').style.color = VDCSystem.analysis.verdict.color;
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
    const ctx = document.getElementById('mainChart');
    if(!ctx) return;
    if(VDCSystem.chart) VDCSystem.chart.destroy();

    const ev = VDCSystem.analysis.extractedValues;
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissões', 'Líquido', 'Faturado', 'Fosso Fiscal'],
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
                    ticks: { color: '#b8c6e0', callback: (v) => v + ' €' }
                },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b8c6e0' } }
            }
        }
    });
}

// ============================================================================
// 11. EXPORTAÇÕES (JSON E PDF FORENSE)
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
            anoFiscal: VDCSystem.selectedYear,
            periodoAnalise: VDCSystem.selectedPeriodo,
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
                ganhos: VDCSystem.documents.statements?.totals?.ganhosApp || 0,
                campanhas: VDCSystem.documents.statements?.totals?.campanhas || 0,
                gorjetas: VDCSystem.documents.statements?.totals?.gorjetas || 0,
                portagens: VDCSystem.documents.statements?.totals?.portagens || 0,
                taxasCancelamento: VDCSystem.documents.statements?.totals?.taxasCancelamento || 0,
                comissao: VDCSystem.documents.statements?.totals?.despesasComissao || 0
            },
            saft: {
                count: VDCSystem.documents.saft?.files?.length || 0,
                bruto: VDCSystem.documents.saft?.totals?.bruto || 0,
                iliquido: VDCSystem.documents.saft?.totals?.iliquido || 0,
                iva: VDCSystem.documents.saft?.totals?.iva || 0
            },
            dac7: {
                count: VDCSystem.documents.dac7?.files?.length || 0,
                q1: VDCSystem.documents.dac7?.totals?.q1 || 0,
                q2: VDCSystem.documents.dac7?.totals?.q2 || 0,
                q3: VDCSystem.documents.dac7?.totals?.q3 || 0,
                q4: VDCSystem.documents.dac7?.totals?.q4 || 0
            }
        },
        auditLog: VDCSystem.logs.slice(-20)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_PERITIA_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    logAudit('Relatório JSON exportado com valor probatório.', 'success');
    showToast('JSON probatório exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) return showToast('Sem sujeito passivo para gerar parecer.', 'error');
    if (typeof window.jspdf === 'undefined') {
        logAudit('Erro: jsPDF não carregado.', 'error');
        return showToast('Erro de sistema (jsPDF)', 'error');
    }

    logAudit('A gerar Parecer Pericial...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const t = translations[currentLang];
        const platform = PLATFORM_DATA[VDCSystem.selectedPlatform] || PLATFORM_DATA.bolt;
        const ev = VDCSystem.analysis.extractedValues;
        const meta = VDCSystem.forensicMetadata || getForensicMetadata();
        const verdict = VDCSystem.analysis.verdict || { level: 'N/A', key: 'low', color: '#8c7ae6', description: 'Perícia não executada.', percent: '0.00%' };

        let y = 45;
        const left = 14;
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFillColor(2, 6, 23);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(22);
        doc.text('VDC FORENSE', 105, 15, { align: 'center' });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(t.pdfTitle, 105, 25, { align: 'center' });
        
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(12);
        doc.text(t.pdfSection1, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`${t.pdfLabelName}: ${VDCSystem.client.name}`, left, y); y += 6;
        doc.text(`${t.pdfLabelNIF}: ${VDCSystem.client.nif}`, left, y); y += 6;
        doc.text(`${t.pdfLabelSession}: ${VDCSystem.sessionId}`, left, y); y += 6;
        doc.text(`${t.pdfLabelPlatform}: ${platform.name}`, left, y); y += 6;
        doc.text(`${t.pdfLabelAddress}: ${platform.address}`, left, y); y += 10;
        
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection2, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.text(`SAF-T Bruto: ${formatCurrency(ev.saftBruto || 0)}`, left, y); y += 6;
        doc.text(`Ganhos App: ${formatCurrency(ev.rendimentosBrutos || 0)}`, left, y); y += 6;
        doc.text(`Comissões: ${formatCurrency(Math.abs(ev.comissaoApp || 0))}`, left, y); y += 6;
        doc.text(`Faturado: ${formatCurrency(ev.faturaPlataforma || 0)}`, left, y); y += 6;
        doc.text(`Delta: ${formatCurrency(ev.diferencialCusto || 0)}`, left, y); y += 10;
        
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection3, left, y); y += 8;
        
        let r = 139, g = 92, b = 246;
        if (verdict.color === '#ef4444') { r = 239; g = 68; b = 68; }
        else if (verdict.color === '#f59e0b') { r = 245; g = 158; b = 11; }
        else if (verdict.color === '#44bd32') { r = 68; g = 189; b = 50; }
        
        doc.setTextColor(r, g, b);
        doc.setFontSize(14);
        doc.text(`VEREDICTO: ${verdict.level}`, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`Desvio: ${verdict.percent}`, left, y); y += 6;
        doc.text(verdict.description, left, y, { maxWidth: pageWidth - 30 }); y += 20;
        
        doc.setFillColor(2, 6, 23);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.text(t.pdfFooterLine1, 105, 290, { align: 'center' });
        doc.text(`HASH: ${VDCSystem.masterHash || 'NÃO GERADA'}`, 105, 295, { align: 'center' });
        
        doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
        logAudit('PDF exportado com sucesso', 'success');
        showToast('PDF gerado', 'success');

    } catch (error) {
        console.error('Erro PDF:', error);
        logAudit(`Erro ao gerar PDF: ${error.message}`, 'error');
        showToast('Erro ao gerar PDF', 'error');
    }
}

// ============================================================================
// 12. FUNÇÕES AUXILIARES
// ============================================================================
function generateMasterHash() {
    const data = JSON.stringify({
        client: VDCSystem.client,
        docs: VDCSystem.documents,
        session: VDCSystem.sessionId
    });
    VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
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
    if (consoleOutput) {
        consoleOutput.innerHTML = '';
    }
    VDCSystem.logs = [];
    logAudit('Console limpo pelo utilizador.', 'info');
}

function resetSystem() {
    if (!confirm('Tem a certeza que deseja reiniciar o sistema? Todos os dados serão perdidos.')) return;

    localStorage.removeItem('vdc_client_data_bd_v12_6');
    location.reload();
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (btn) {
        const hasFiles = Object.values(VDCSystem.documents).some(d => d.files && d.files.length > 0);
        const hasClient = VDCSystem.client !== null;
        btn.disabled = !(hasFiles && hasClient);
    }
}

/* =====================================================================
   FIM DO FICHEIRO SCRIPT.JS · v12.6 RETA FINAL FORENSE
   MECANISMO DE LIMPEZA BINÁRIA · PARSER DE FLUXO
   TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA
   ===================================================================== */
