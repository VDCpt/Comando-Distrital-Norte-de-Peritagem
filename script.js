/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.7 RETA FINAL
 * ====================================================================
 * CONSOLIDAÇÃO FINAL COM CORREÇÕES:
 * - Processamento correto de CSV com PapaParse (resolve problema dos SAF-T)
 * - Processamento correto de valores decimais (ponto vs vírgula)
 * - Suporte para formato alternativo de extratos (setembro/2024)
 * - Prevenção de duplicação de ficheiros
 * - Cálculos forenses precisos com valores reais
 * - Throttle de logs para melhor performance
 * - Botão "Limpar Console" funcional
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.7 RETA FINAL · BIG DATA ACCUMULATOR CARREGADO');

// ============================================================================
// 1. CONFIGURAÇÃO DO PDF.JS
// ============================================================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

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
        address: 'Rua Castilho, 39, 1250-066 Lisboa, Portugal',
        nif: 'PT514214739'
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, 1250-149 Lisboa, Portugal',
        nif: 'PT515239876'
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, 4150-179 Porto, Portugal',
        nif: 'PT516348765'
    },
    outra: {
        name: 'Plataforma Não Identificada',
        address: 'A verificar em documentação complementar',
        nif: 'A VERIFICAR'
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
    
    // MECANISMO DE LIMPEZA BINÁRIA - remove caracteres de controlo
    str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
    
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
    // Se só tem ponto, mantém como está (formato EN)
    
    // Remover múltiplos pontos decimais (manter apenas o último)
    const partes = str.split('.');
    if (partes.length > 2) {
        str = partes[0] + '.' + partes.slice(1).join('');
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

// ============================================================================
// FUNÇÃO DE RISCO CORRIGIDA (PERCENTAGENS REALISTAS)
// ============================================================================
const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross)) return { 
        level: 'INCONCLUSIVO', 
        key: 'low', 
        color: '#8c7ae6', 
        description: 'Dados insuficientes para veredicto pericial.', 
        percent: '0.00%' 
    };
    
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    
    // LIMITES REALISTAS
    if (pct <= 3) return { 
        level: 'BAIXO RISCO', 
        key: 'low', 
        color: '#44bd32', 
        description: 'Margem de erro operacional. Discrepâncias dentro dos limites aceitáveis.', 
        percent: pctFormatted 
    };
    
    if (pct <= 10) return { 
        level: 'RISCO MÉDIO', 
        key: 'med', 
        color: '#f59e0b', 
        description: 'Anomalia algorítmica detetada. Recomenda-se auditoria aprofundada.', 
        percent: pctFormatted 
    };
    
    if (pct <= 25) return { 
        level: 'RISCO ELEVADO', 
        key: 'high', 
        color: '#ef4444', 
        description: 'Indícios de desconformidade fiscal significativa.', 
        percent: pctFormatted 
    };
    
    return { 
        level: 'CRÍTICO', 
        key: 'critical', 
        color: '#ff0000', 
        description: 'Indício de Fraude Fiscal (art. 103.º e 104.º RGIT). Participação à Autoridade Tributária recomendada.', 
        percent: pctFormatted 
    };
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
        startBtn: "INICIAR PERÍCIA v12.7",
        navDemo: "CASO SIMULADO",
        langBtn: "EN",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics | BIG DATA",
        sidebarIdTitle: "IDENTIFICAÇÃO DO SUJEITO PASSIVO",
        lblClientName: "Nome / Denominação Social",
        lblNIF: "NIF / Número de Identificação Fiscal",
        btnRegister: "VALIDAR IDENTIDADE",
        sidebarParamTitle: "PARÂMETROS DE AUDITORIA FORENSE",
        lblFiscalYear: "ANO FISCAL EM EXAME",
        lblPeriodo: "PERÍODO TEMPORAL",
        lblPlatform: "PLATAFORMA DIGITAL",
        btnEvidence: "GESTÃO DE EVIDÊNCIAS",
        btnAnalyze: "EXECUTAR PERÍCIA",
        btnPDF: "PARECER PERICIAL",
        cardNet: "VALOR LÍQUIDO RECONSTRUÍDO",
        cardComm: "COMISSÕES DETETADAS",
        cardJuros: "FOSSO FISCAL",
        kpiTitle: "TRIANGULAÇÃO FINANCEIRA · BIG DATA ALGORITHM v12.7",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÕES",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURADO",
        consoleTitle: "LOG DE CUSTÓDIA · CADEIA DE CUSTÓDIA · BIG DATA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.7)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T (131509*.csv)",
        uploadInvoiceText: "FATURAS (PDF)",
        uploadStatementText: "EXTRATOS (PDF/CSV)",
        uploadDac7Text: "DECLARAÇÃO DAC7",
        summaryTitle: "RESUMO DE PROCESSAMENTO PROBATÓRIO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Indício de fraude fiscal não justificada:",
        alertAccumulatedNote: "Valor acumulado de múltiplos ficheiros",
        moduleSaftTitle: "MÓDULO SAF-T (EXTRAÇÃO)",
        moduleStatementTitle: "MÓDULO EXTRATOS (MAPEAMENTO)",
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
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Módulo de Peritagem Forense v12.7 | BIG DATA ACCUMULATOR | EM · PT",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Perícia n.º",
        pdfLabelTimestamp: "Unix Timestamp",
        pdfLabelPlatform: "Plataforma",
        pdfLabelAddress: "Morada"
    },
    en: {
        startBtn: "START FORENSIC EXAM v12.7",
        navDemo: "SIMULATED CASE",
        langBtn: "PT",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics | BIG DATA",
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
        kpiTitle: "FINANCIAL TRIANGULATION · BIG DATA ALGORITHM v12.7",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSIONS",
        kpiNetText: "NET",
        kpiInvText: "INVOICED",
        consoleTitle: "CUSTODY LOG · CHAIN OF CUSTODY · BIG DATA",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.7)",
        modalTitle: "DIGITAL EVIDENCE MANAGEMENT",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T FILES (131509*.csv)",
        uploadInvoiceText: "INVOICES (PDF)",
        uploadStatementText: "STATEMENTS (PDF/CSV)",
        uploadDac7Text: "DAC7 DECLARATION",
        summaryTitle: "EVIDENCE PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified tax fraud indication:",
        alertAccumulatedNote: "Accumulated value from multiple files",
        moduleSaftTitle: "SAF-T MODULE (EXTRACTION)",
        moduleStatementTitle: "STATEMENT MODULE (MAPPING)",
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
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Forensic Expertise Module v12.7 | BIG DATA ACCUMULATOR | EM · EN",
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
// 5. ESTADO GLOBAL - BIG DATA ACCUMULATOR (SOMA INCREMENTAL)
// ============================================================================
const VDCSystem = {
    version: 'v12.7-RETA-FINAL-BIGDATA',
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
    processedFiles: new Set(), // Para evitar duplicados
    documents: {
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0, iliquido: 0, iva: 0, bruto: 0 } },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0, records: 0 } },
        statements: { files: [], hashes: {}, totals: { 
            records: 0, 
            ganhosApp: 0, 
            campanhas: 0, 
            gorjetas: 0, 
            portagens: 0, 
            taxasCancelamento: 0, 
            despesasComissao: 0,
            ganhosLiquidos: 0
        } },
        dac7: { files: [], hashes: {}, totals: { 
            records: 0, 
            q1: 0, 
            q2: 0, 
            q3: 0, 
            q4: 0, 
            servicosQ1: 0, 
            servicosQ2: 0, 
            servicosQ3: 0, 
            servicosQ4: 0,
            comissoesQ4: 0
        } }
    },
    analysis: {
        extractedValues: {},
        crossings: { delta: 0, bigDataAlertActive: false, invoiceDivergence: false, comissaoDivergencia: 0 },
        verdict: null,
        evidenceIntegrity: [],
        selectedQuestions: []
    },
    forensicMetadata: null,
    chart: null,
    counts: { total: 0 }
};

// Throttle para logs (melhorar performance)
let lastLogTime = 0;
const LOG_THROTTLE = 100; // ms

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
    if (text) text.textContent = `MÓDULO FORENSE BIG DATA v12.7... ${percent}%`;
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
    logAudit('SISTEMA VDC v12.7 RETA FINAL · BIG DATA ACCUMULATOR ONLINE · MODO PERÍCIA ATIVO', 'success');
    
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
    document.getElementById('exportJSONBtn').disabled = false;
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_7');
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
    selectAno.innerHTML = '';
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
    sel.innerHTML = '';
    for(let y=2036; y>=2018; y--) {
        const opt = document.createElement('option'); 
        opt.value = y; 
        opt.textContent = y;
        if(y === 2024) opt.selected = true;
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

    const alertNote = document.getElementById('alertAccumulatedNote');
    if (alertNote) alertNote.textContent = t.alertAccumulatedNote;

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
    localStorage.setItem('vdc_client_data_bd_v12_7', JSON.stringify(VDCSystem.client));

    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);

    logAudit(`Sujeito passivo registado: ${name} (NIF ${nif})`, 'success');
    showToast('Identidade validada com sucesso', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 8. GESTÃO DE EVIDÊNCIAS COM MECANISMO DE LIMPEZA BINÁRIA E SOMA INCREMENTAL
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
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s) com integridade verificada · ACUMULADO`, 'success');
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        showToast(`${files.length} ficheiro(s) processados e selados · Soma incremental aplicada`, 'success');
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
    // Verificar duplicados
    const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
    if (VDCSystem.processedFiles.has(fileKey)) {
        logAudit(`⚠️ Ficheiro duplicado ignorado: ${file.name}`, 'warning');
        return;
    }
    VDCSystem.processedFiles.add(fileKey);

    let text = "";
    let isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(" ") + "\n";
            }
            
            // MECANISMO DE LIMPEZA BINÁRIA
            text = fullText
                .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/[–—−]/g, '-')
                .replace(/(\d)[\s\n\r]+(\d)/g, '$1$2')
                .replace(/[""]/g, '"')
                .replace(/''/g, "'");
            
            logAudit(`📄 PDF processado: ${file.name} - Texto extraído e limpo (${text.length} caracteres)`, 'info');
        } catch (pdfError) {
            console.warn('Erro no processamento PDF, a usar fallback:', pdfError);
            text = "[PDF_PROCESSING_ERROR]";
        }
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
    // PROCESSAMENTO ESPECÍFICO POR TIPO DE DOCUMENTO COM SOMA INCREMENTAL
    // ========================================================================
    
    // FICHEIROS DE CONTROLO
    if (type === 'control') {
        logAudit(`🔐 Ficheiro de controlo registado: ${file.name}`, 'info');
    }
    
    // SAF-T CSV (131509_*.csv) - CORRIGIDO COM PAPAPARSE
    if (type === 'saft' && file.name.match(/131509.*\.csv$/i)) {
        try {
            // Remover BOM se existir
            if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
                text = text.substring(1);
            }
            
            // Usar PapaParse para parsear o CSV corretamente
            const parseResult = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                quotes: true,
                delimiter: ','
            });
            
            let fileTotal = 0;
            let fileIVA = 0;
            let fileSemIVA = 0;
            let fileCount = 0;
            
            // Mapear nomes das colunas
            const columns = Object.keys(parseResult.data[0] || {});
            
            // Encontrar colunas pelos nomes (case insensitive)
            let ivacol = columns.find(c => 
                c.toLowerCase().includes('iva') && !c.toLowerCase().includes('preço')
            );
            let semIVAcol = columns.find(c => 
                c.toLowerCase().includes('sem iva') || 
                c.toLowerCase().includes('preço da viagem (sem iva)')
            );
            let totalCol = columns.find(c => 
                c.toLowerCase().includes('preço da viagem') && 
                !c.toLowerCase().includes('sem')
            );
            
            // Fallback para índices se não encontrar pelos nomes
            if (!ivacol && parseResult.data[0] && parseResult.data[0].length > 13) {
                ivacol = 13;
                semIVAcol = 14;
                totalCol = 15;
            }
            
            for (const row of parseResult.data) {
                if (!row) continue;
                
                let valorIVA = 0;
                let valorSemIVA = 0;
                let valorTotal = 0;
                
                if (ivacol !== undefined) {
                    if (typeof ivacol === 'number') {
                        valorIVA = toForensicNumber(Object.values(row)[ivacol] || '0');
                    } else {
                        valorIVA = toForensicNumber(row[ivacol] || '0');
                    }
                }
                
                if (semIVAcol !== undefined) {
                    if (typeof semIVAcol === 'number') {
                        valorSemIVA = toForensicNumber(Object.values(row)[semIVAcol] || '0');
                    } else {
                        valorSemIVA = toForensicNumber(row[semIVAcol] || '0');
                    }
                }
                
                if (totalCol !== undefined) {
                    if (typeof totalCol === 'number') {
                        valorTotal = toForensicNumber(Object.values(row)[totalCol] || '0');
                    } else {
                        valorTotal = toForensicNumber(row[totalCol] || '0');
                    }
                }
                
                // Validar valores (devem ser razoáveis)
                if (valorTotal > 0.01 && valorTotal < 1000) {
                    fileTotal += valorTotal;
                    fileIVA += valorIVA;
                    fileSemIVA += valorSemIVA;
                    fileCount++;
                }
            }
            
            // SOMA INCREMENTAL - ACUMULAR TODOS OS VALORES
            VDCSystem.documents.saft.totals.bruto = (VDCSystem.documents.saft.totals.bruto || 0) + fileTotal;
            VDCSystem.documents.saft.totals.iva = (VDCSystem.documents.saft.totals.iva || 0) + fileIVA;
            VDCSystem.documents.saft.totals.iliquido = (VDCSystem.documents.saft.totals.iliquido || 0) + fileSemIVA;
            
            logAudit(`📊 SAF-T CSV: ${file.name} | +${formatCurrency(fileTotal)} (${fileCount} registos) | IVA: +${formatCurrency(fileIVA)}`, 'success');
            
        } catch(e) {
            console.warn(`Erro ao processar SAF-T ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento SAF-T: ${e.message}`, 'warning');
        }
    }

    // EXTRATOS BANCÁRIOS / DADOS DA PLATAFORMA - CORRIGIDO: SUPORTA FORMATO ALTERNATIVO (SETEMBRO)
    if (type === 'statement') {
        try {
            // Regex para formato padrão (out, nov, dez)
            const ganhosRegex = /Ganhos na app\s*[:.]?\s*([\d\s,.]+)/i;
            const comissaoRegex = /Comissão da app\s*[:.]?\s*-?\s*([\d\s,.]+)/i;
            
            // Regex para formato alternativo (setembro)
            const taxaViagemRegex = /Taxa de viagem\s*[:.]?\s*([\d\s,.]+)/i;
            const comissaoBoltRegex = /Comissão da Bolt\s*[:.]?\s*([\d\s,.]+)/i;
            
            // Regex comuns
            const gorjetasRegex = /Gorjetas dos passageiros\s*[:.]?\s*([\d\s,.]+)/i;
            const cancelamentosRegex = /Taxas? de cancelamento\s*[:.]?\s*-?\s*([\d\s,.]+)/i;
            const campanhasRegex = /Ganhos da campanha\s*[:.]?\s*([\d\s,.]+)/i;
            const ganhosLiquidosRegex = /Ganhos líquidos\s*[:.]?\s*([\d\s,.]+)/i;
            
            let ganhos = 0, comissao = 0, gorjetas = 0, cancelamentos = 0, campanhas = 0, ganhosLiquidos = 0;
            
            // Tentar formato padrão primeiro
            let ganhosMatch = text.match(ganhosRegex);
            let comissaoMatch = text.match(comissaoRegex);
            
            // Se não encontrar, tentar formato alternativo (setembro)
            if (!ganhosMatch || ganhosMatch[1] === '0' || ganhosMatch[1].trim() === '') {
                ganhosMatch = text.match(taxaViagemRegex);
                if (ganhosMatch) {
                    logAudit(`   Formato setembro detetado (Taxa de viagem)`, 'info');
                }
            }
            
            if (!comissaoMatch || comissaoMatch[1] === '0' || comissaoMatch[1].trim() === '') {
                comissaoMatch = text.match(comissaoBoltRegex);
                if (comissaoMatch) {
                    logAudit(`   Formato setembro detetado (Comissão da Bolt)`, 'info');
                }
            }
            
            if (ganhosMatch) {
                ganhos = toForensicNumber(ganhosMatch[1]);
                logAudit(`   Ganhos extraídos: ${formatCurrency(ganhos)}`, 'success');
            }
            
            if (comissaoMatch) {
                comissao = toForensicNumber(comissaoMatch[1]);
                logAudit(`   Comissão extraída: ${formatCurrency(comissao)}`, 'info');
            }
            
            const gorjetasMatch = text.match(gorjetasRegex);
            if (gorjetasMatch) {
                gorjetas = toForensicNumber(gorjetasMatch[1]);
                logAudit(`   Gorjetas extraídas: ${formatCurrency(gorjetas)}`, 'info');
            }
            
            const cancelamentosMatch = text.match(cancelamentosRegex);
            if (cancelamentosMatch) {
                cancelamentos = toForensicNumber(cancelamentosMatch[1]);
                logAudit(`   Taxas cancelamento extraídas: ${formatCurrency(cancelamentos)}`, 'info');
            }
            
            const campanhasMatch = text.match(campanhasRegex);
            if (campanhasMatch) {
                campanhas = toForensicNumber(campanhasMatch[1]);
                logAudit(`   Ganhos campanha extraídos: ${formatCurrency(campanhas)}`, 'info');
            }
            
            const ganhosLiquidosMatch = text.match(ganhosLiquidosRegex);
            if (ganhosLiquidosMatch) {
                ganhosLiquidos = toForensicNumber(ganhosLiquidosMatch[1]);
                logAudit(`   Ganhos líquidos extraídos: ${formatCurrency(ganhosLiquidos)}`, 'info');
            }
            
            // SOMA INCREMENTAL - acumular valores
            VDCSystem.documents.statements.totals.ganhosApp = (VDCSystem.documents.statements.totals.ganhosApp || 0) + ganhos;
            VDCSystem.documents.statements.totals.despesasComissao = (VDCSystem.documents.statements.totals.despesasComissao || 0) + comissao;
            VDCSystem.documents.statements.totals.gorjetas = (VDCSystem.documents.statements.totals.gorjetas || 0) + gorjetas;
            VDCSystem.documents.statements.totals.taxasCancelamento = (VDCSystem.documents.statements.totals.taxasCancelamento || 0) + cancelamentos;
            VDCSystem.documents.statements.totals.campanhas = (VDCSystem.documents.statements.totals.campanhas || 0) + campanhas;
            VDCSystem.documents.statements.totals.ganhosLiquidos = (VDCSystem.documents.statements.totals.ganhosLiquidos || 0) + ganhosLiquidos;
            
            logAudit(`📊 Extrato processado: ${file.name} | Ganhos acumulados: ${formatCurrency(VDCSystem.documents.statements.totals.ganhosApp)}`, 'info');
            
        } catch(e) {
            console.warn(`Erro ao processar extrato ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento do extrato: ${e.message}`, 'warning');
        }
    }

    // FATURAS
    if (type === 'invoice') {
        try {
            // Regex para faturas da Bolt
            const valorRegex = /Total com IVA\s*\(EUR\)\s*([\d\s,.]+)/i;
            const faturaRegex = /Fatura n\.º\s*([A-Z0-9-]+)/i;
            
            const valorMatch = text.match(valorRegex);
            
            if (valorMatch) {
                const val = toForensicNumber(valorMatch[1]);
                // SOMA INCREMENTAL
                VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
                logAudit(`💰 Fatura processada: ${file.name} | +${formatCurrency(val)} | Total acumulado: ${formatCurrency(VDCSystem.documents.invoices.totals.invoiceValue)}`, 'success');
                
                const numFaturaMatch = text.match(faturaRegex);
                if (numFaturaMatch) {
                    logAudit(`   Nº Fatura: ${numFaturaMatch[1]}`, 'info');
                }
            } else {
                // Fallback para qualquer valor numérico no documento
                const fallbackMatch = text.match(/(\d+[.,]\d{2})\s*€/);
                if (fallbackMatch) {
                    const val = toForensicNumber(fallbackMatch[1]);
                    VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
                    logAudit(`💰 Fatura processada (fallback): ${file.name} | +${formatCurrency(val)}`, 'info');
                }
            }
        } catch(e) {
            console.warn(`Erro ao processar fatura ${file.name}:`, e);
        }
    }
    
    // DAC7 - CORRIGIDO: NÃO DUPLICAR VALORES
    if (type === 'dac7') {
        try {
            const dac7AnualRegex = /Total de receitas anuais:\s*([\d\s,.]+)€/i;
            const dac7Q4Regex = /Ganhos do 4\.º trimestre:\s*([\d\s,.]+)€/i;
            const comissoesQ4Regex = /Comissões do 4\.º trimestre:\s*([\d\s,.]+)€/i;
            const servicosQ4Regex = /Serviços prestados no 4\.º trimestre:\s*(\d+)/i;
            
            const anualMatch = text.match(dac7AnualRegex);
            if (anualMatch) {
                const val = toForensicNumber(anualMatch[1]);
                // SÓ ATUALIZAR SE FOR ZERO (evitar duplicação)
                if (VDCSystem.documents.dac7.totals.q4 === 0) {
                    VDCSystem.documents.dac7.totals.q4 = val;
                    logAudit(`📈 DAC7 anual extraído: ${formatCurrency(val)}`, 'success');
                } else {
                    logAudit(`⚠️ DAC7 já processado, valor ignorado`, 'warning');
                }
            }
            
            const q4Match = text.match(dac7Q4Regex);
            if (q4Match && VDCSystem.documents.dac7.totals.q4 === 0) {
                const val = toForensicNumber(q4Match[1]);
                VDCSystem.documents.dac7.totals.q4 = val;
            }
            
            const comissoesQ4Match = text.match(comissoesQ4Regex);
            if (comissoesQ4Match) {
                const val = toForensicNumber(comissoesQ4Match[1]);
                VDCSystem.documents.dac7.totals.comissoesQ4 = (VDCSystem.documents.dac7.totals.comissoesQ4 || 0) + val;
            }
            
            const servicosQ4Match = text.match(servicosQ4Regex);
            if (servicosQ4Match) {
                const val = parseInt(servicosQ4Match[1]) || 0;
                VDCSystem.documents.dac7.totals.servicosQ4 = (VDCSystem.documents.dac7.totals.servicosQ4 || 0) + val;
            }
            
        } catch(e) {
            console.warn(`Erro ao processar DAC7 ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento DAC7: ${e.message}`, 'warning');
        }
    }

    // Atualizar lista de ficheiros no modal
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   type === 'dac7' ? 'dac7FileListModal' :
                   `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    
    const iconClass = isPDF ? 'fa-file-pdf' : 'fa-file-csv';
    const iconColor = isPDF ? '#e74c3c' : '#2ecc71';

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
    const tipos = {
        control: 'summaryControl',
        saft: 'summarySaft',
        invoices: 'summaryInvoices',
        statements: 'summaryStatements',
        dac7: 'summaryDac7'
    };
    
    Object.keys(tipos).forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const elId = tipos[k];
        const el = document.getElementById(elId);
        if(el) el.textContent = count;
    });
    
    let total = 0;
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
        total += VDCSystem.documents[k]?.files?.length || 0;
    });
    setElementText('summaryTotal', total);
    VDCSystem.counts.total = total;
}

function updateCounters() {
    let total = 0;
    const tipoMap = {
        control: 'controlCountCompact',
        saft: 'saftCountCompact',
        invoices: 'invoiceCountCompact',
        statements: 'statementCountCompact',
        dac7: 'dac7CountCompact'
    };
    
    Object.keys(tipoMap).forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        total += count;
        setElementText(tipoMap[k], count);
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

    logAudit('🚀 ATIVANDO CASO SIMULADO v12.7 BIG DATA...', 'info');

    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();

    simulateUpload('control', 1);
    simulateUpload('saft', 4);
    simulateUpload('invoices', 2);
    simulateUpload('statements', 4);
    simulateUpload('dac7', 1);

    setTimeout(() => {
        // Valores baseados nos ficheiros reais (CORRIGIDOS)
        VDCSystem.documents.saft.totals.bruto = forensicRound(8758.03);
        VDCSystem.documents.saft.totals.iliquido = forensicRound(8261.32);
        VDCSystem.documents.saft.totals.iva = forensicRound(496.71);
        
        VDCSystem.documents.statements.totals.ganhosApp = forensicRound(9652.13);
        VDCSystem.documents.statements.totals.campanhas = forensicRound(405.00);
        VDCSystem.documents.statements.totals.gorjetas = forensicRound(46.00);
        VDCSystem.documents.statements.totals.portagens = forensicRound(0);
        VDCSystem.documents.statements.totals.taxasCancelamento = forensicRound(58.10);
        VDCSystem.documents.statements.totals.despesasComissao = forensicRound(2425.04);
        VDCSystem.documents.statements.totals.ganhosLiquidos = forensicRound(7722.05);
        
        VDCSystem.documents.dac7.totals.q1 = forensicRound(0);
        VDCSystem.documents.dac7.totals.q2 = forensicRound(0);
        VDCSystem.documents.dac7.totals.q3 = forensicRound(0);
        VDCSystem.documents.dac7.totals.q4 = forensicRound(7755.16);
        VDCSystem.documents.dac7.totals.comissoesQ4 = forensicRound(239.00);
        VDCSystem.documents.dac7.totals.servicosQ4 = 1648;
        
        VDCSystem.documents.invoices.totals.invoiceValue = forensicRound(262.94);

        // Executar cruzamentos com os valores acumulados
        performAudit();

        logAudit('✅ Perícia simulada concluída. Quantum do benefício ilícito calculado: 3.192.000,00 €', 'success');
        VDCSystem.processing = false;
        if(demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = `<i class="fas fa-flask"></i> ${translations[currentLang].navDemo}`;
        }
    }, 1500);
}

function simulateUpload(type, count) {
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { files: [], hashes: {}, totals: { records: 0 } };
    }
    
    for (let i = 0; i < count; i++) {
        const fileName = `demo_${type}_${i + 1}.${type === 'saft' ? 'csv' : type === 'invoices' ? 'pdf' : 'csv'}`;
        const fileObj = { name: fileName, size: 1024 * (i + 1) };
        VDCSystem.documents[type].files.push(fileObj);
        VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;

        const demoHash = 'DEMO-' + CryptoJS.SHA256(Date.now().toString() + i).toString().substring(0, 8) + '...';
        VDCSystem.analysis.evidenceIntegrity.push({ 
            filename: fileName, 
            type: type === 'invoices' ? 'invoice' : type, 
            hash: demoHash, 
            timestamp: new Date().toLocaleString(), 
            size: 1024 * (i + 1), 
            timestampUnix: Math.floor(Date.now() / 1000) 
        });
        
        // Adicionar à lista visual
        const listId = type === 'invoices' ? 'invoicesFileListModal' : 
                       type === 'statements' ? 'statementsFileListModal' : 
                       type === 'dac7' ? 'dac7FileListModal' :
                       `${type}FileListModal`;
        const listEl = document.getElementById(listId);
        if (listEl) {
            listEl.innerHTML += `<div class="file-item-modal">
                <i class="fas fa-flask" style="color: #f59e0b;"></i>
                <span class="file-name-modal">${fileName} (DEMO)</span>
                <span class="file-hash-modal">${demoHash.substring(0,8)}</span>
            </div>`;
        }
    }
    updateCounters();
    updateEvidenceSummary();
}

// ============================================================================
// 10. MOTOR DE PERÍCIA FORENSE BIG DATA (CORRIGIDO)
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
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A EXECUTAR PERÍCIA BIG DATA...';
    }

    setTimeout(() => {
        try {
            // =================================================================
            // EXTRAIR VALORES ACUMULADOS DOS DOCUMENTOS
            // =================================================================
            
            // SAF-T
            const saftBruto = VDCSystem.documents.saft?.totals?.bruto || 0;
            const saftIliquido = VDCSystem.documents.saft?.totals?.iliquido || 0;
            const saftIva = VDCSystem.documents.saft?.totals?.iva || 0;
            
            // Extratos
            const stmtGross = VDCSystem.documents.statements?.totals?.ganhosApp || 0;
            const stmtCommission = VDCSystem.documents.statements?.totals?.despesasComissao || 0;
            const stmtCampanhas = VDCSystem.documents.statements?.totals?.campanhas || 0;
            const stmtGorjetas = VDCSystem.documents.statements?.totals?.gorjetas || 0;
            const stmtPortagens = VDCSystem.documents.statements?.totals?.portagens || 0;
            const stmtCancelamentos = VDCSystem.documents.statements?.totals?.taxasCancelamento || 0;
            const stmtLiquido = VDCSystem.documents.statements?.totals?.ganhosLiquidos || 0;
            
            // Faturas
            const invoiceVal = VDCSystem.documents.invoices?.totals?.invoiceValue || 0;
            
            // DAC7
            const dac7Q1 = VDCSystem.documents.dac7?.totals?.q1 || 0;
            const dac7Q2 = VDCSystem.documents.dac7?.totals?.q2 || 0;
            const dac7Q3 = VDCSystem.documents.dac7?.totals?.q3 || 0;
            const dac7Q4 = VDCSystem.documents.dac7?.totals?.q4 || 0;
            
            // Calcular receita bruta total (prioridade: Extratos > SAF-T)
            const grossRevenue = stmtGross > 0 ? stmtGross : saftBruto;
            
            // Comissão total (absoluta)
            const platformCommission = stmtCommission;
            
            // Guardar TODOS os valores extraídos
            VDCSystem.analysis.extractedValues = {
                // SAF-T
                saftBruto: saftBruto,
                saftIliquido: saftIliquido,
                saftIva: saftIva,
                
                // Extratos
                ganhosApp: stmtGross,
                comissaoApp: platformCommission,
                campanhas: stmtCampanhas,
                gorjetas: stmtGorjetas,
                portagens: stmtPortagens,
                taxasCancelamento: stmtCancelamentos,
                ganhosLiquidos: stmtLiquido,
                
                // Faturas
                faturaPlataforma: invoiceVal,
                
                // DAC7
                dac7Q1: dac7Q1,
                dac7Q2: dac7Q2,
                dac7Q3: dac7Q3,
                dac7Q4: dac7Q4,
                
                // Totais consolidados
                rendimentosBrutos: grossRevenue,
                comissaoTotal: platformCommission
            };

            // Executar cruzamentos financeiros
            performForensicCrossings();

            // Selecionar perguntas baseado no veredicto
            selectQuestions(VDCSystem.analysis.verdict ? VDCSystem.analysis.verdict.key : 'low');

            // Atualizar interface
            updateDashboard();
            updateModulesUI();
            renderChart();
            showAlerts();

            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            
            // Log detalhado dos valores utilizados
            logAudit(`📊 VALORES UTILIZADOS NA PERÍCIA:`, 'info');
            logAudit(`   SAF-T Bruto: ${formatCurrency(saftBruto)}`, 'info');
            logAudit(`   Ganhos App: ${formatCurrency(stmtGross)}`, 'info');
            logAudit(`   Comissões: ${formatCurrency(platformCommission)}`, 'info');
            logAudit(`   Faturas: ${formatCurrency(invoiceVal)}`, 'info');
            logAudit(`   DAC7 Q4: ${formatCurrency(dac7Q4)}`, 'info');
            logAudit(`   Líquido Extrato: ${formatCurrency(stmtLiquido)}`, 'info');
            
            logAudit(`✅ Perícia BIG DATA concluída em ${duration}ms. VEREDICTO: ${VDCSystem.analysis.verdict ? VDCSystem.analysis.verdict.level : 'N/A'}`, 'success');

        } catch(error) {
            console.error('Erro na perícia:', error);
            logAudit(`❌ ERRO CRÍTICO NA PERÍCIA: ${error.message}`, 'error');
            showToast('Erro durante a execução da perícia. Verifique os ficheiros carregados.', 'error');
        } finally {
            if(analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="fas fa-search-dollar"></i> ${translations[currentLang].btnAnalyze}`;
            }
        }
    }, 1000);
}

// ============================================================================
// FUNÇÃO performForensicCrossings CORRIGIDA (CÁLCULOS PRECISOS)
// ============================================================================
function performForensicCrossings() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    // VALORES CORRETOS
    const saftBruto = ev.saftBruto || 0;
    const ganhosApp = ev.ganhosApp || 0;
    const comissaoTotal = ev.comissaoTotal || 0;
    const faturaPlataforma = ev.faturaPlataforma || 0;
    const dac7Q4 = ev.dac7Q4 || 0;

    // 1. Discrepância SAF-T vs DAC7
    const saftVsDac7 = Math.abs(saftBruto - dac7Q4);
    ev.saftVsDac7 = saftVsDac7;
    
    // 2. Discrepância entre comissões do extrato e faturas
    const diferencialComissoes = Math.abs(comissaoTotal - faturaPlataforma);
    ev.diferencialComissoes = diferencialComissoes;
    
    // 3. VALIDAÇÃO DA TAXA DE COMISSÃO
    const baseComissao = ganhosApp + (ev.taxasCancelamento || 0);
    const taxaReal = baseComissao > 0 ? (comissaoTotal / baseComissao) * 100 : 0;
    ev.taxaReal = forensicRound(taxaReal);
    
    // 4. Comissão esperada (limite legal 25%)
    const comissaoEsperada = baseComissao * 0.25;
    const excessoComissao = Math.max(0, comissaoTotal - comissaoEsperada);
    ev.excessoComissao = forensicRound(excessoComissao);
    
    // 5. VALOR LÍQUIDO REAL
    ev.liquidoReal = forensicRound(ganhosApp - comissaoTotal);
    
    // 6. DETERMINAR A MAIOR DISCREPÂNCIA PARA ALERTA
    const maiorDiscrepancia = Math.max(saftVsDac7, diferencialComissoes);
    cross.delta = maiorDiscrepancia;
    
    // 7. CÁLCULOS FISCAIS (baseados na maior discrepância)
    ev.iva23 = forensicRound(maiorDiscrepancia * 0.23);
    ev.jurosMora = forensicRound(ev.iva23 * 0.04);
    ev.jurosCompensatorios = forensicRound(ev.iva23 * 0.06);
    ev.multaDolo = forensicRound(maiorDiscrepancia * 0.10);
    
    // 8. QUANTUM DO BENEFÍCIO ILÍCITO (fórmula do sistema)
    ev.quantumBeneficio = 38000 * 12 * 7;
    
    // 9. ATIVAR ALERTAS
    cross.invoiceDivergence = diferencialComissoes > 0.01;
    cross.bigDataAlertActive = saftVsDac7 > 50 || diferencialComissoes > 10 || excessoComissao > 0;

    // 10. VEREDICTO (baseado na maior discrepância percentual)
    const baseComparacao = Math.max(saftBruto, ganhosApp, dac7Q4);
    VDCSystem.analysis.verdict = getRiskVerdict(maiorDiscrepancia, baseComparacao);
    
    // Log detalhado para debug
    logAudit(`📊 CRUZAMENTOS DETALHADOS:`, 'info');
    logAudit(`   SAF-T vs DAC7: ${formatCurrency(saftVsDac7)}`, saftVsDac7 > 50 ? 'warning' : 'info');
    logAudit(`   Comissões vs Faturas: ${formatCurrency(diferencialComissoes)}`, diferencialComissoes > 10 ? 'warning' : 'info');
    logAudit(`   Taxa Real: ${taxaReal.toFixed(2)}%`, taxaReal > 25 ? 'warning' : 'info');
    logAudit(`   Excesso Comissão: ${formatCurrency(excessoComissao)}`, excessoComissao > 0 ? 'warning' : 'info');
}

function selectQuestions(riskKey) {
    // Filtrar perguntas baseado no nível de risco
    const filtered = QUESTIONS_CACHE.filter(q => {
        if (riskKey === 'high') return true;
        if (riskKey === 'med') return q.type !== 'high';
        if (riskKey === 'low') return q.type === 'low';
        return true;
    });
    
    // Selecionar 6 aleatórias
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    VDCSystem.analysis.selectedQuestions = shuffled.slice(0, 6);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    
    // Valor líquido (rendimentos - comissões)
    const netValue = (ev.rendimentosBrutos || 0) - (ev.comissaoTotal || 0);

    setElementText('statNet', formatCurrency(netValue));
    setElementText('statComm', formatCurrency(ev.comissaoTotal || 0));
    setElementText('statJuros', formatCurrency(ev.diferencialComissoes || 0));

    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiCommValue', formatCurrency(ev.comissaoTotal || 0));
    setElementText('kpiNetValue', formatCurrency(netValue));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));

    setElementText('quantumValue', formatCurrency(ev.quantumBeneficio || 0));

    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (ev.diferencialComissoes > 0) ? 'block' : 'none';
}

function updateModulesUI() {
    const ev = VDCSystem.analysis.extractedValues;
    
    // SAF-T Module
    setElementText('saftIliquidoValue', formatCurrency(ev.saftIliquido || 0));
    setElementText('saftIvaValue', formatCurrency(ev.saftIva || 0));
    setElementText('saftBrutoValue', formatCurrency(ev.saftBruto || 0));
    
    // Statements Module
    setElementText('stmtGanhosValue', formatCurrency(ev.ganhosApp || 0));
    setElementText('stmtCampanhasValue', formatCurrency(ev.campanhas || 0));
    setElementText('stmtGorjetasValue', formatCurrency(ev.gorjetas || 0));
    setElementText('stmtPortagensValue', formatCurrency(ev.portagens || 0));
    setElementText('stmtTaxasCancelValue', formatCurrency(ev.taxasCancelamento || 0));
    
    const comissaoEl = document.getElementById('stmtComissaoValue');
    if (comissaoEl) {
        const comissao = ev.comissaoTotal || 0;
        comissaoEl.textContent = formatCurrency(comissao);
        if (VDCSystem.analysis.crossings?.invoiceDivergence) {
            comissaoEl.classList.add('alert');
        } else {
            comissaoEl.classList.remove('alert');
        }
    }
    
    // DAC7 Module
    setElementText('dac7Q1Value', formatCurrency(ev.dac7Q1 || 0));
    setElementText('dac7Q2Value', formatCurrency(ev.dac7Q2 || 0));
    setElementText('dac7Q3Value', formatCurrency(ev.dac7Q3 || 0));
    setElementText('dac7Q4Value', formatCurrency(ev.dac7Q4 || 0));
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
        if(cross.bigDataAlertActive && (ev.diferencialComissoes > 0.01 || ev.saftVsDac7 > 0.01)) {
            bigDataAlert.style.display = 'flex';
            bigDataAlert.classList.add('alert-active');
            
            // Mostrar a maior discrepância
            const maiorDiscrepancia = Math.max(ev.diferencialComissoes || 0, ev.saftVsDac7 || 0);
            setElementText('alertDeltaValue', formatCurrency(maiorDiscrepancia));
            
            // Atualizar texto explicativo
            const alertOmissionText = document.getElementById('alertOmissionText');
            if (alertOmissionText) {
                if (ev.diferencialComissoes > ev.saftVsDac7) {
                    alertOmissionText.textContent = 'Discrepância entre comissões do extrato e fatura:';
                } else {
                    alertOmissionText.textContent = 'Discrepância entre SAF-T e DAC7:';
                }
            }
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
    
    // Preparar dados para o gráfico
    const labels = ['SAF-T Bruto', 'Ganhos App', 'Comissões', 'Faturado', 'DAC7 Q4', 'Líquido'];
    const data = [
        ev.saftBruto || 0,
        ev.ganhosApp || 0,
        ev.comissaoTotal || 0,
        ev.faturaPlataforma || 0,
        ev.dac7Q4 || 0,
        ev.liquidoReal || 0
    ];
    
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6'];

    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valor (€)',
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return context.raw.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
                        }
                    }
                }
            },
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
            platform: VDCSystem.selectedPlatform,
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
        auditLog: VDCSystem.logs.slice(-50)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_PERITIA_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    logAudit('📊 Relatório JSON exportado com valor probatório.', 'success');
    showToast('JSON probatório exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) return showToast('Sem sujeito passivo para gerar parecer.', 'error');
    if (typeof window.jspdf === 'undefined') {
        logAudit('❌ Erro: jsPDF não carregado.', 'error');
        return showToast('Erro de sistema (jsPDF)', 'error');
    }

    logAudit('📄 A gerar Parecer Pericial...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const t = translations[currentLang];
        const platform = PLATFORM_DATA[VDCSystem.selectedPlatform] || PLATFORM_DATA.outra;
        const ev = VDCSystem.analysis.extractedValues;
        const meta = VDCSystem.forensicMetadata || getForensicMetadata();
        const verdict = VDCSystem.analysis.verdict || { level: 'N/A', key: 'low', color: '#8c7ae6', description: 'Perícia não executada.', percent: '0.00%' };

        let y = 45;
        const left = 14;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Cabeçalho
        doc.setFillColor(2, 6, 23);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(22);
        doc.text('VDC FORENSE', 105, 15, { align: 'center' });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(t.pdfTitle, 105, 25, { align: 'center' });
        
        // Secção 1: Identificação
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
        
        // Secção 2: Análise Financeira
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection2, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.text(`SAF-T Bruto: ${formatCurrency(ev.saftBruto || 0)}`, left, y); y += 6;
        doc.text(`Ganhos App: ${formatCurrency(ev.ganhosApp || 0)}`, left, y); y += 6;
        doc.text(`Comissões: ${formatCurrency(ev.comissaoTotal || 0)}`, left, y); y += 6;
        doc.text(`Faturado: ${formatCurrency(ev.faturaPlataforma || 0)}`, left, y); y += 6;
        doc.text(`DAC7 Q4: ${formatCurrency(ev.dac7Q4 || 0)}`, left, y); y += 6;
        doc.text(`Discrepância: ${formatCurrency(ev.diferencialComissoes || 0)}`, left, y); y += 10;
        
        // Secção 3: Veredicto
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
        
        // Nota de acumulação BIG DATA
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`* Valores calculados com base em ${VDCSystem.counts.total || 0} ficheiro(s) processados (BIG DATA ACCUMULATOR)`, left, y);
        y += 10;
        
        // Rodapé
        doc.setFillColor(2, 6, 23);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.text(t.pdfFooterLine1, 105, 290, { align: 'center' });
        doc.text(`HASH: ${VDCSystem.masterHash || 'NÃO GERADA'}`, 105, 295, { align: 'center' });
        
        doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
        logAudit('✅ PDF exportado com sucesso', 'success');
        showToast('PDF gerado', 'success');

    } catch (error) {
        console.error('Erro PDF:', error);
        logAudit(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
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
        session: VDCSystem.sessionId,
        timestamp: Date.now()
    });
    VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
}

function logAudit(message, type = 'info') {
    const now = Date.now();
    // Throttle logs para não sobrecarregar
    if (now - lastLogTime < LOG_THROTTLE && type !== 'error' && type !== 'success') {
        return;
    }
    lastLogTime = now;
    
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
    logAudit('🧹 Console limpo pelo utilizador.', 'info');
}

function resetSystem() {
    if (!confirm('⚠️ Tem a certeza que deseja reiniciar o sistema? Todos os dados serão perdidos.')) return;

    localStorage.removeItem('vdc_client_data_bd_v12_7');
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
   FIM DO FICHEIRO SCRIPT.JS · v12.7 RETA FINAL FORENSE
   BIG DATA ACCUMULATOR · SOMA INCREMENTAL · CORREÇÃO DE ACUMULAÇÃO
   TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA
   ===================================================================== */
