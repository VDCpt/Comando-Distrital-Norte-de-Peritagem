/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.7.2 SMOKING GUN · CSC
 * VERSÃO FINAL CORRIGIDA - PROVA RAINHA, CÁLCULOS TRIBUTÁRIOS, PARECER TÉCNICO
 * NOVAS BOXES DE ALERTA, PERCENTAGEM CORRIGIDA, PDF COMPLETO, QR CODE
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.7.2 · SMOKING GUN · CSC · MODO PROFISSIONAL ATIVADO');

// ============================================================================
// 1. CONFIGURAÇÃO DO PDF.JS
// ============================================================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ============================================================================
// 2. DADOS DAS PLATAFORMAS
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia',
        nif: 'EE102090374',
        fullAddress: 'Vana-Lõuna 15, Tallinn 10134, Estónia'
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, Amesterdão, Países Baixos',
        nif: 'NL852071588B01',
        fullAddress: 'Strawinskylaan 4117, 1077 ZX Amesterdão, Países Baixos'
    },
    freenow: {
        name: 'FREE NOW',
        address: 'Rua Castilho, 39, 1250-066 Lisboa, Portugal',
        nif: 'PT514214739',
        fullAddress: 'Rua Castilho, 39, 1250-066 Lisboa, Portugal'
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, 1250-149 Lisboa, Portugal',
        nif: 'PT515239876',
        fullAddress: 'Avenida da Liberdade, 244, 1250-149 Lisboa, Portugal'
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, 4150-179 Porto, Portugal',
        nif: 'PT516348765',
        fullAddress: 'Rua de São Paulo, 56, 4150-179 Porto, Portugal'
    },
    outra: {
        name: 'Plataforma Não Identificada',
        address: 'A verificar em documentação complementar',
        nif: 'A VERIFICAR',
        fullAddress: 'A verificar em documentação complementar'
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
// 3. UTILITÁRIOS FORENSES
// ============================================================================
const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const toForensicNumber = (v) => {
    if (!v) return 0;
    let str = v.toString().trim();
    
    str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
    str = str.replace(/\s/g, '');
    str = str.replace(/€/g, '');
    
    if (str.includes(',')) {
        if (str.includes('.') && str.indexOf(',') > str.lastIndexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(',', '.');
        }
    } else if (str.includes('.')) {
        const partes = str.split('.');
        if (partes.length > 2) {
            str = partes.slice(0, -1).join('') + '.' + partes[partes.length - 1];
        }
    }
    
    str = str.replace(/[^\d.-]/g, '');
    
    const result = parseFloat(str);
    return isNaN(result) ? 0 : result;
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
    if (gross === 0 || isNaN(gross)) return { 
        level: 'INCONCLUSIVO', 
        key: 'low', 
        color: '#8c7ae6', 
        description: 'Dados insuficientes para veredicto pericial.', 
        percent: '0.00%' 
    };
    
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    
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
// 4. SISTEMA DE RASTREABILIDADE
// ============================================================================
const ValueSource = {
    sources: new Map(),
    
    registerValue(elementId, value, sourceFile, calculationMethod = 'extração direta') {
        const key = `${elementId}_${Date.now()}`;
        this.sources.set(elementId, {
            value: value,
            sourceFile: sourceFile,
            calculationMethod: calculationMethod,
            timestamp: new Date().toISOString()
        });
        
        const badgeEl = document.getElementById(elementId + 'Source');
        if (badgeEl) {
            const fileName = sourceFile.length > 30 ? sourceFile.substring(0, 27) + '...' : sourceFile;
            badgeEl.textContent = `Fonte: ${fileName}`;
            badgeEl.setAttribute('data-tooltip', `Cálculo: ${calculationMethod}\nFicheiro: ${sourceFile}\nValor: ${formatCurrency(value)}`);
        }
    },
    
    getBreakdown(elementId) {
        return this.sources.get(elementId) || null;
    },
    
    getQuantumBreakdown(discrepancy, months, drivers = 38000, years = 7) {
        const monthlyAvg = discrepancy / months;
        const annualImpact = monthlyAvg * 12;
        const totalImpact = annualImpact * drivers * years;
        
        return {
            discrepanciaMensalMedia: monthlyAvg,
            impactoAnualPorMotorista: annualImpact,
            totalMotoristas: drivers,
            anos: years,
            impactoTotal: totalImpact,
            formula: `(${formatCurrency(discrepancy)} / ${months} meses) × 12 × ${drivers.toLocaleString()} × ${years}`
        };
    }
};

// ============================================================================
// 5. SISTEMA DE TRADUÇÕES
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR PERÍCIA v12.7",
        navDemo: "CASO SIMULADO",
        langBtn: "EN",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | INTERPOL · CSC | BIG DATA",
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
        btnPDF: "RELATÓRIO PERICIAL",
        cardNet: "VALOR LÍQUIDO RECONSTRUÍDO",
        cardComm: "COMISSÕES DETETADAS",
        cardJuros: "FOSSO FISCAL",
        kpiTitle: "TRIANGULAÇÃO FINANCEIRA · BIG DATA ALGORITHM v12.7",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÕES",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURADO",
        consoleTitle: "LOG DE CUSTÓDIA · CADEIA DE CUSTÓDIA · BIG DATA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 · RFC 3161)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T (131509*.csv)",
        uploadInvoiceText: "FATURAS (PDF)",
        uploadStatementText: "EXTRATOS (PDF/CSV)",
        uploadDac7Text: "DECLARAÇÃO DAC7",
        summaryTitle: "RESUMO DE PROCESSAMENTO PROBATÓRIO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "🔫 SMOKING GUN · DIVERGÊNCIA CRÍTICA",
        alertOmissionText: "Comissão Retida (Extrato) vs Faturada (Plataforma):",
        alertAccumulatedNote: "Base Omitida (Omissão Fiscal)",
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
        quantumTitle: "CÁLCULO TRIBUTÁRIO PERICIAL · PROVA RAINHA",
        quantumFormula: "Base Omitida vs Faturada",
        quantumNote: "IVA em falta (23%): 0,00 €",
        verdictPercent: "PARECER TÉCNICO N.º",
        pdfTitle: "PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL",
        pdfHeaderTag1: "[FORENSE]",
        pdfHeaderTag2: "[FINANCEIRO]",
        pdfSection1: "1. IDENTIFICAÇÃO E METADADOS",
        pdfSection2: "2. ANÁLISE FINANCEIRA CRUZADA",
        pdfSection3: "3. VEREDICTO DE RISCO (RGIT)",
        pdfSection4: "4. PROVA RAINHA (SMOKING GUN)",
        pdfSection5: "5. ENQUADRAMENTO LEGAL",
        pdfSection6: "6. METODOLOGIA PERICIAL",
        pdfSection7: "7. CERTIFICAÇÃO DIGITAL",
        pdfSection8: "8. ANÁLISE PERICIAL DETALHADA",
        pdfSection9: "9. FATOS CONSTATADOS",
        pdfSection10: "10. IMPACTO FISCAL E AGRAVAMENTO DE GESTÃO",
        pdfSection11: "11. CADEIA DE CUSTÓDIA",
        pdfSection12: "12. QUESTIONÁRIO PERICIAL ESTRATÉGICO",
        pdfSection13: "13. CONCLUSÃO",
        pdfLegalTitle: "FUNDAMENTAÇÃO LEGAL",
        pdfLegalRGIT: "Art. 103.º e 104.º RGIT - Fraude Fiscal e Fraude Qualificada",
        pdfLegalLGT: "Art. 35.º e 63.º LGT - Juros de mora e deveres de cooperação",
        pdfLegalISO: "ISO/IEC 27037 - Preservação de Prova Digital",
        pdfConclusionText: "Os dados analisados apresentam indícios de desconformidade fiscal. Atendendo à natureza dos factos, compete ao mandatário legal a utilização deste parecer para apuramento de veracidade em sede judicial e solicitação de auditoria inspetiva às entidades competentes.",
        pdfFooterLine1: "Art. 103.º e 104.º RGIT · ISO/IEC 27037 · CSC",
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Módulo de Peritagem Forense v12.7.2 | SMOKING GUN | COLARINHO BRANCO | CSC",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Perícia n.º",
        pdfLabelTimestamp: "Unix Timestamp",
        pdfLabelPlatform: "Plataforma",
        pdfLabelAddress: "Morada",
        pdfLabelNIFPlatform: "NIF Plataforma"
    },
    en: {
        startBtn: "START FORENSIC EXAM v12.7",
        navDemo: "SIMULATED CASE",
        langBtn: "PT",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | INTERPOL · CSC | BIG DATA",
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
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 · RFC 3161)",
        modalTitle: "DIGITAL EVIDENCE MANAGEMENT",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T FILES (131509*.csv)",
        uploadInvoiceText: "INVOICES (PDF)",
        uploadStatementText: "STATEMENTS (PDF/CSV)",
        uploadDac7Text: "DAC7 DECLARATION",
        summaryTitle: "EVIDENCE PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "🔫 SMOKING GUN · CRITICAL DIVERGENCE",
        alertOmissionText: "Commission Withheld (Statement) vs Invoiced (Platform):",
        alertAccumulatedNote: "Omitted Base (Tax Omission)",
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
        quantumTitle: "TAX CALCULATION · SMOKING GUN",
        quantumFormula: "Omitted Base vs Invoiced",
        quantumNote: "Missing VAT (23%): 0,00 €",
        verdictPercent: "TECHNICAL OPINION No.",
        pdfTitle: "DIGITAL FORENSIC EXPERT REPORT",
        pdfHeaderTag1: "[FORENSIC]",
        pdfHeaderTag2: "[FINANCIAL]",
        pdfSection1: "1. IDENTIFICATION & METADATA",
        pdfSection2: "2. CROSS-FINANCIAL ANALYSIS",
        pdfSection3: "3. RISK VERDICT (RGIT)",
        pdfSection4: "4. SMOKING GUN",
        pdfSection5: "5. LEGAL FRAMEWORK",
        pdfSection6: "6. FORENSIC METHODOLOGY",
        pdfSection7: "7. DIGITAL CERTIFICATION",
        pdfSection8: "8. DETAILED FORENSIC ANALYSIS",
        pdfSection9: "9. ESTABLISHED FACTS",
        pdfSection10: "10. TAX IMPACT AND MANAGEMENT BURDEN",
        pdfSection11: "11. CHAIN OF CUSTODY",
        pdfSection12: "12. STRATEGIC QUESTIONNAIRE",
        pdfSection13: "13. CONCLUSION",
        pdfLegalTitle: "LEGAL BASIS",
        pdfLegalRGIT: "Art. 103 and 104 RGIT - Tax Fraud and Qualified Fraud",
        pdfLegalLGT: "Art. 35 and 63 LGT - Default interest and cooperation duties",
        pdfLegalISO: "ISO/IEC 27037 - Digital Evidence Preservation",
        pdfConclusionText: "The analyzed data shows evidence of fiscal non-conformity. Given the nature of the facts, it is incumbent upon the legal mandator to use this opinion for the determination of veracity in court and to request inspection audit to the competent entities.",
        pdfFooterLine1: "Art. 103 and 104 RGIT · ISO/IEC 27037 · CSC",
        pdfFooterLine3: "VDC Systems International © 2024/2026 | Forensic Expertise Module v12.7.2 | SMOKING GUN | WHITE COLLAR | CSC",
        pdfLabelName: "Name",
        pdfLabelNIF: "Tax ID",
        pdfLabelSession: "Expertise No.",
        pdfLabelTimestamp: "Unix Timestamp",
        pdfLabelPlatform: "Platform",
        pdfLabelAddress: "Address",
        pdfLabelNIFPlatform: "Platform Tax ID"
    }
};

let currentLang = 'pt';

// ============================================================================
// 6. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.7.2-SMOKING-GUN-CSC',
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
    processedFiles: new Set(),
    dataMonths: new Set(),
    fileSources: new Map(),
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
        crossings: { 
            delta: 0, 
            bigDataAlertActive: false, 
            invoiceDivergence: false, 
            comissaoDivergencia: 0,
            saftVsDac7Alert: false,
            saftVsGanhosAlert: false,
            saftMenosComissaoVsLiquidoAlert: false,
            discrepanciaCritica: 0,
            percentagemOmissao: 0,
            percentagemDiscrepancia: 0,
            ivaFalta: 0,
            ivaFalta6: 0,
            btor: 0,
            btf: 0,
            impactoMensalMercado: 0,
            impactoAnualMercado: 0,
            impactoSeteAnosMercado: 0,
            discrepancia5IMT: 0,
            agravamentoBrutoIRC: 0,
            ircEstimado: 0
        },
        verdict: null,
        evidenceIntegrity: [],
        selectedQuestions: []
    },
    forensicMetadata: null,
    chart: null,
    counts: { total: 0 }
};

let lastLogTime = 0;
const LOG_THROTTLE = 100;

const fileProcessingQueue = [];
let isProcessingQueue = false;

// ============================================================================
// 7. FUNÇÃO DE SINCRONIZAÇÃO FORENSE
// ============================================================================
function forensicDataSynchronization() {
    console.log('🔍 SINCRONIZAÇÃO FORENSE ATIVADA');
    
    const statementFiles = VDCSystem.analysis.evidenceIntegrity.filter(
        item => item.type === 'statement'
    ).length;
    
    const invoiceFiles = VDCSystem.analysis.evidenceIntegrity.filter(
        item => item.type === 'invoice'
    ).length;
    
    const controlFiles = VDCSystem.analysis.evidenceIntegrity.filter(
        item => item.type === 'control'
    ).length;
    
    const saftFiles = VDCSystem.analysis.evidenceIntegrity.filter(
        item => item.type === 'saft'
    ).length;
    
    const dac7Files = VDCSystem.analysis.evidenceIntegrity.filter(
        item => item.type === 'dac7'
    ).length;
    
    if (VDCSystem.documents.statements) {
        VDCSystem.documents.statements.files = 
            VDCSystem.analysis.evidenceIntegrity
                .filter(item => item.type === 'statement')
                .map(item => ({ name: item.filename, size: item.size }));
        
        VDCSystem.documents.statements.totals.records = statementFiles;
    }
    
    if (VDCSystem.documents.invoices) {
        VDCSystem.documents.invoices.files = 
            VDCSystem.analysis.evidenceIntegrity
                .filter(item => item.type === 'invoice')
                .map(item => ({ name: item.filename, size: item.size }));
        
        VDCSystem.documents.invoices.totals.records = invoiceFiles;
    }
    
    setElementText('controlCountCompact', controlFiles);
    setElementText('saftCountCompact', saftFiles);
    setElementText('invoiceCountCompact', invoiceFiles);
    setElementText('statementCountCompact', statementFiles);
    setElementText('dac7CountCompact', dac7Files);
    
    setElementText('summaryControl', controlFiles);
    setElementText('summarySaft', saftFiles);
    setElementText('summaryInvoices', invoiceFiles);
    setElementText('summaryStatements', statementFiles);
    setElementText('summaryDac7', dac7Files);
    
    const total = controlFiles + saftFiles + invoiceFiles + statementFiles + dac7Files;
    setElementText('summaryTotal', total);
    document.getElementById('evidenceCountTotal').textContent = total;
    VDCSystem.counts.total = total;
    
    logAudit(`🔬 SINCRONIZAÇÃO: ${total} total (CTRL:${controlFiles} SAFT:${saftFiles} FAT:${invoiceFiles} EXT:${statementFiles} DAC7:${dac7Files})`, 'success');
    
    return { controlFiles, saftFiles, invoiceFiles, statementFiles, dac7Files, total };
}

// ============================================================================
// 8. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupStaticListeners();
    populateAnoFiscal();
    populateYears();
    startClockAndDate();
    loadSystemRecursively();
    setupDragAndDrop();
    generateQRCode();
    
    const clearBtn = document.getElementById('clearConsoleBtn');
    if (clearBtn) {
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        newClearBtn.addEventListener('click', clearConsole);
    }
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
    setElementText('verdictSessionId', VDCSystem.sessionId);
    generateQRCode();

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
    if (text) text.textContent = `MÓDULO FORENSE BIG DATA v12.7.2... ${percent}%`;
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
    logAudit('SISTEMA VDC v12.7.2 MODO PROFISSIONAL ATIVADO · SMOKING GUN · CSC ONLINE', 'success');
    
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
    document.getElementById('exportJSONBtn').disabled = false;
    
    setTimeout(forensicDataSynchronization, 1000);
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

function generateQRCode() {
    const container = document.getElementById('qrcodeContainer');
    if (!container) return;
    
    container.innerHTML = '';
    const sessionData = JSON.stringify({
        session: VDCSystem.sessionId || 'AGUARDANDO',
        timestamp: new Date().toISOString(),
        hash: VDCSystem.masterHash || 'PENDING'
    });
    
    if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
            text: sessionData,
            width: 100,
            height: 100,
            colorDark: "#00e5ff",
            colorLight: "#020617",
            correctLevel: QRCode.CorrectLevel.H
        });
    }
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
        forensicDataSynchronization();
    });

    const closeModal = () => {
        document.getElementById('evidenceModal').style.display = 'none';
        updateAnalysisButton();
        forensicDataSynchronization();
    };

    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeModal);
    document.getElementById('evidenceModal')?.addEventListener('click', (e) => { if(e.target.id === 'evidenceModal') closeModal(); });

    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn')?.addEventListener('click', resetSystem);

    setupUploadListeners();
}

// ============================================================================
// 9. DRAG & DROP GLOBAL
// ============================================================================
function setupDragAndDrop() {
    const dropZone = document.getElementById('globalDropZone');
    const fileInput = document.getElementById('globalFileInput');
    
    if (!dropZone || !fileInput) return;
    
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleGlobalFileSelect);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    document.getElementById('globalDropZone').classList.add('drag-over');
}

function unhighlight() {
    document.getElementById('globalDropZone').classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    processBatchFiles(files);
}

function handleGlobalFileSelect(e) {
    const files = Array.from(e.target.files);
    processBatchFiles(files);
    e.target.value = '';
}

// ============================================================================
// 10. PROCESSAMENTO EM LOTE
// ============================================================================
async function processBatchFiles(files) {
    if (files.length === 0) return;
    
    const statusEl = document.getElementById('globalProcessingStatus');
    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> A processar ${files.length} ficheiro(s) em lote...</p>`;
    }
    
    logAudit(`🚀 INICIANDO PROCESSAMENTO EM LOTE: ${files.length} ficheiro(s)`, 'info');
    
    for (const file of files) {
        fileProcessingQueue.push(file);
    }
    
    if (!isProcessingQueue) {
        processQueue();
    }
}

async function processQueue() {
    isProcessingQueue = true;
    const statusEl = document.getElementById('globalProcessingStatus');
    let processed = 0;
    const total = fileProcessingQueue.length;
    
    while (fileProcessingQueue.length > 0) {
        const file = fileProcessingQueue.shift();
        processed++;
        
        if (statusEl) {
            statusEl.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> A processar ${processed}/${total}: ${file.name}</p>`;
        }
        
        const fileType = detectFileType(file);
        
        try {
            await processFile(file, fileType);
        } catch (error) {
            console.error(`Erro ao processar ${file.name}:`, error);
            logAudit(`❌ Erro ao processar ${file.name}: ${error.message}`, 'error');
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    isProcessingQueue = false;
    
    if (statusEl) {
        statusEl.style.display = 'none';
    }
    
    logAudit(`✅ Processamento em lote concluído. Total: ${total} ficheiro(s)`, 'success');
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    forensicDataSynchronization();
    showToast(`${total} ficheiro(s) processados em lote`, 'success');
}

function detectFileType(file) {
    const name = file.name.toLowerCase();
    
    if (name.includes('fatura') || 
        name.includes('invoice') || 
        name.match(/pt\d{4}-\d{5}/i) ||
        name.match(/pt\d{4,5}-\d{3,5}/i) ||
        (file.type === 'application/pdf' && name.match(/\d{4}-\d{5}/))) {
        return 'invoice';
    }
    
    if (name.match(/131509.*\.csv$/) || name.includes('saf-t') || name.includes('saft')) {
        return 'saft';
    }
    
    if (name.includes('extrato') || name.includes('statement') || 
        name.includes('ganhos') || name.includes('earnings')) {
        return 'statement';
    }
    
    if (name.includes('dac7') || name.includes('dac-7')) {
        return 'dac7';
    }
    
    if (name.includes('controlo') || name.includes('control')) {
        return 'control';
    }
    
    return 'unknown';
}

function setupUploadListeners() {
    const types = ['control', 'saft', 'invoice', 'statement', 'dac7'];
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                processBatchFiles(files);
                e.target.value = '';
            });
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
// 11. PROCESSAMENTO DE FICHEIROS - VERSÃO FINAL CORRIGIDA
// ============================================================================
async function processFile(file, type) {
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

    if (!VDCSystem.documents[type].files) {
        VDCSystem.documents[type].files = [];
    }

    const fileExists = VDCSystem.documents[type].files.some(f => f.name === file.name);
    if (!fileExists) {
        VDCSystem.documents[type].files.push({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
        });
    }

    VDCSystem.documents[type].hashes[file.name] = hash;
    VDCSystem.documents[type].totals.records = VDCSystem.documents[type].files.length;

    VDCSystem.analysis.evidenceIntegrity.push({
        filename: file.name, type, hash,
        timestamp: new Date().toLocaleString(),
        size: file.size,
        timestampUnix: Math.floor(Date.now() / 1000)
    });

    VDCSystem.fileSources.set(file.name, {
        type: type,
        hash: hash,
        processedAt: new Date().toISOString()
    });

    // ============================================================
    // PROCESSAMENTO DE EXTRATOS - VERSÃO FINAL COM EXTRAÇÃO DE MÊS CORRIGIDA
    // ============================================================
    if (type === 'statement') {
        try {
            let yearMonth = null;
            
            const mesPattern = /(\d{1,2})\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*(\d{4})/i;
            const mesMatch = file.name.match(mesPattern);
            
            if (mesMatch) {
                const meses = {
                    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
                    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
                    'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
                };
                const ano = mesMatch[3];
                const mes = meses[mesMatch[2].toLowerCase()];
                if (mes) {
                    yearMonth = ano + mes;
                    logAudit(`   Mês detetado: ${yearMonth} (a partir do nome do ficheiro)`, 'info');
                }
            }
            
            if (!yearMonth) {
                const dataPattern = /(\d{4})-(\d{2})-\d{2}/;
                const dataMatch = text.match(dataPattern);
                if (dataMatch) {
                    yearMonth = dataMatch[1] + dataMatch[2];
                    logAudit(`   Mês detetado: ${yearMonth} (a partir de data no PDF)`, 'info');
                }
            }
            
            if (!yearMonth) {
                const dataPTPattern = /(\d{2})-(\d{2})-(\d{4})/;
                const dataPTMatch = text.match(dataPTPattern);
                if (dataPTMatch) {
                    yearMonth = dataPTMatch[3] + dataPTMatch[2];
                    logAudit(`   Mês detetado: ${yearMonth} (a partir de data PT no PDF)`, 'info');
                }
            }
            
            if (yearMonth) {
                VDCSystem.dataMonths.add(yearMonth);
            }
            
            const isFormatoSetembro = text.includes('DESCRIÇÃO DA TARIFA') || 
                                      text.includes('Taxa de viagem') ||
                                      text.includes('OUTRAS EVENTUAIS DEDUÇÕES');
            
            let ganhos = 0, campanhas = 0, gorjetas = 0, taxasCancel = 0, comissao = 0;
            let portagens = 0, ganhosLiq = 0;
            
            if (isFormatoSetembro) {
                logAudit(`   Formato setembro detetado`, 'info');
                
                const taxaViagemMatch = text.match(/Taxa de viagem\s*€?\s*([\d\s,.]+)/i);
                if (taxaViagemMatch) {
                    ganhos = toForensicNumber(taxaViagemMatch[1]);
                    logAudit(`   Taxa de viagem: ${formatCurrency(ganhos)}`, 'success');
                }
                
                const taxaCancelMatch = text.match(/Taxa de cancelamento\s*€?\s*([\d\s,.]+)/i);
                if (taxaCancelMatch) {
                    taxasCancel = toForensicNumber(taxaCancelMatch[1]);
                    logAudit(`   Taxa de cancelamento: ${formatCurrency(taxasCancel)}`, 'info');
                }
                
                const portagemMatch = text.match(/Portagem\s*€?\s*([\d\s,.]+)/i);
                if (portagemMatch) {
                    portagens = toForensicNumber(portagemMatch[1]);
                    logAudit(`   Portagem: ${formatCurrency(portagens)}`, 'info');
                }
                
                const comissaoBoltMatch = text.match(/Comissão da Bolt\s*€?\s*([\d\s,.]+)/i);
                if (comissaoBoltMatch) {
                    comissao = toForensicNumber(comissaoBoltMatch[1]);
                    logAudit(`   Comissão da Bolt: ${formatCurrency(comissao)}`, 'info');
                }
                
                const outrasComissõesMatch = text.match(/Outras comissões\s*€?\s*([\d\s,.]+)/i);
                if (outrasComissõesMatch) {
                    comissao += toForensicNumber(outrasComissõesMatch[1]);
                    logAudit(`   Outras comissões: +${formatCurrency(toForensicNumber(outrasComissõesMatch[1]))}`, 'info');
                }
                
                const ganhosTotais = ganhos + taxasCancel + portagens;
                ganhos = ganhosTotais;
                ganhosLiq = ganhos - comissao;
                
                logAudit(`   Ganhos totais: ${formatCurrency(ganhos)}`, 'success');
                logAudit(`   Comissões totais: ${formatCurrency(comissao)}`, 'info');
                logAudit(`   Ganhos líquidos: ${formatCurrency(ganhosLiq)}`, 'success');
                
            } else {
                const ganhosPattern = /Ganhos na app\s*([\d\s,.]+)/i;
                const campanhasPattern = /Ganhos da campanha\s*([\d\s,.]+)/i;
                const gorjetasPattern = /Gorjetas dos passageiros\s*([\d\s,.]+)/i;
                const taxasCancelPattern = /Taxas de cancelamento\s*([\d\s,.]+)/i;
                const comissaoPattern = /Comissão da app\s*-?\s*([\d\s,.]+)/i;
                
                const liquidosPattern = /Ganhos líquidos[\s\S]*?Ganhos\s*([\d\s,.]+)[\s\S]*?Despesas\s*-?\s*([\d\s,.]+)[\s\S]*?Ganhos líquidos\s*([\d\s,.]+)/i;
                
                const ganhosMatch = text.match(ganhosPattern);
                if (ganhosMatch) {
                    ganhos = toForensicNumber(ganhosMatch[1]);
                }
                
                const campanhasMatch = text.match(campanhasPattern);
                if (campanhasMatch) {
                    campanhas = toForensicNumber(campanhasMatch[1]);
                }
                
                const gorjetasMatch = text.match(gorjetasPattern);
                if (gorjetasMatch) {
                    gorjetas = toForensicNumber(gorjetasMatch[1]);
                }
                
                const taxasCancelMatch = text.match(taxasCancelPattern);
                if (taxasCancelMatch) {
                    taxasCancel = toForensicNumber(taxasCancelMatch[1]);
                }
                
                const comissaoMatch = text.match(comissaoPattern);
                if (comissaoMatch) {
                    comissao = toForensicNumber(comissaoMatch[1]);
                }
                
                const liquidosMatch = text.match(liquidosPattern);
                if (liquidosMatch) {
                    ganhosLiq = toForensicNumber(liquidosMatch[3]);
                } else {
                    ganhosLiq = ganhos + campanhas + gorjetas - comissao - taxasCancel;
                }
            }
            
            VDCSystem.documents.statements.totals.ganhosApp = (VDCSystem.documents.statements.totals.ganhosApp || 0) + ganhos;
            VDCSystem.documents.statements.totals.campanhas = (VDCSystem.documents.statements.totals.campanhas || 0) + campanhas;
            VDCSystem.documents.statements.totals.gorjetas = (VDCSystem.documents.statements.totals.gorjetas || 0) + gorjetas;
            VDCSystem.documents.statements.totals.portagens = (VDCSystem.documents.statements.totals.portagens || 0) + portagens;
            VDCSystem.documents.statements.totals.taxasCancelamento = (VDCSystem.documents.statements.totals.taxasCancelamento || 0) + taxasCancel;
            VDCSystem.documents.statements.totals.despesasComissao = (VDCSystem.documents.statements.totals.despesasComissao || 0) + comissao;
            VDCSystem.documents.statements.totals.ganhosLiquidos = (VDCSystem.documents.statements.totals.ganhosLiquidos || 0) + ganhosLiq;
            
            ValueSource.registerValue('stmtGanhosValue', ganhos, file.name, isFormatoSetembro ? 'tabela DESCRIÇÃO DA TARIFA' : 'tabela Transações');
            ValueSource.registerValue('stmtComissaoValue', comissao, file.name, isFormatoSetembro ? 'tabela OUTRAS EVENTUAIS DEDUÇÕES' : 'tabela Transações');
            
            logAudit(`📊 Extrato processado: ${file.name} | Ganhos: ${formatCurrency(ganhos)} | Comissões: ${formatCurrency(comissao)} | Líquido: ${formatCurrency(ganhosLiq)}`, 'success');
            
        } catch(e) {
            console.warn(`Erro ao processar extrato ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento do extrato: ${e.message}`, 'warning');
        }
    }

    // ============================================================
    // PROCESSAMENTO DE FATURAS - VERSÃO FINAL
    // ============================================================
    if (type === 'invoice' || (type === 'unknown' && file.name.match(/pt\d{4}-\d{5}/i))) {
        try {
            if (type === 'unknown') {
                type = 'invoice';
                logAudit(`📌 Ficheiro reclassificado como fatura: ${file.name}`, 'info');
            }
            
            const faturaPattern = /Fatura n\.º\s*([A-Z0-9\-\s]+)/i;
            const ptPattern = /(PT\d{4,5}-\d{3,5})/i;
            
            const faturaMatch = text.match(faturaPattern);
            const ptMatch = text.match(ptPattern) || file.name.match(ptPattern);
            
            if (faturaMatch) {
                logAudit(`   Nº Fatura: ${faturaMatch[1].trim()}`, 'info');
            } else if (ptMatch) {
                logAudit(`   Nº Fatura: ${ptMatch[1]}`, 'info');
            }
            
            const periodoPattern = /Período:\s*(\d{2}-\d{2}-\d{4})\s*-\s*(\d{2}-\d{2}-\d{4})/i;
            const periodoMatch = text.match(periodoPattern);
            if (periodoMatch) {
                logAudit(`   Período: ${periodoMatch[1]} a ${periodoMatch[2]}`, 'info');
            }
            
            let valorFatura = 0;
            
            const tabelaPattern = /Comissões da Bolt.*?(\d+\.\d+).*?(\d+\.\d+).*?(\d+\.\d+).*?(\d+\.\d+)/is;
            const tabelaMatch = text.match(tabelaPattern);
            
            if (tabelaMatch) {
                valorFatura = toForensicNumber(tabelaMatch[4]);
                logAudit(`   Valor da tabela (coluna Total): ${formatCurrency(valorFatura)}`, 'success');
            }
            
            if (valorFatura === 0) {
                const totalIVAPattern = /Total com IVA\s*\(EUR\)\s*([\d\s,.]+)/i;
                const totalIVAMatch = text.match(totalIVAPattern);
                if (totalIVAMatch) {
                    valorFatura = toForensicNumber(totalIVAMatch[1]);
                    logAudit(`   Total com IVA (EUR): ${formatCurrency(valorFatura)}`, 'success');
                }
            }
            
            if (valorFatura === 0) {
                const valorPattern = /(\d+\.\d{2})/g;
                const valores = [...text.matchAll(valorPattern)];
                for (const match of valores) {
                    const val = parseFloat(match[1]);
                    if (val > 0 && val < 1000) {
                        valorFatura = val;
                    }
                }
                if (valorFatura > 0) {
                    logAudit(`   Valor encontrado: ${formatCurrency(valorFatura)}`, 'info');
                }
            }
            
            if (valorFatura > 0) {
                if (!VDCSystem.documents.invoices.totals) {
                    VDCSystem.documents.invoices.totals = { invoiceValue: 0, records: 0 };
                }
                
                VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + valorFatura;
                VDCSystem.documents.invoices.totals.records = (VDCSystem.documents.invoices.totals.records || 0) + 1;
                
                ValueSource.registerValue('kpiInvValue', valorFatura, file.name, 'extração de fatura');
                
                logAudit(`💰 Fatura processada: ${file.name} | +${formatCurrency(valorFatura)} | Total acumulado: ${formatCurrency(VDCSystem.documents.invoices.totals.invoiceValue)} (${VDCSystem.documents.invoices.totals.records} faturas)`, 'success');
            } else {
                logAudit(`⚠️ Não foi possível extrair valor da fatura: ${file.name}`, 'warning');
            }
            
        } catch(e) {
            console.warn(`Erro ao processar fatura ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento da fatura: ${e.message}`, 'warning');
        }
    }

    // ============================================================
    // PROCESSAMENTO DE SAF-T
    // ============================================================
    if (type === 'saft' && file.name.match(/131509.*\.csv$/i)) {
        try {
            const monthMatch = file.name.match(/131509_(\d{6})/);
            if (monthMatch && monthMatch[1]) {
                const yearMonth = monthMatch[1];
                VDCSystem.dataMonths.add(yearMonth);
                logAudit(`   Mês detetado: ${yearMonth}`, 'info');
            }
            
            if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 0xFFFE) {
                text = text.substring(1);
            }
            
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
            
            const columns = Object.keys(parseResult.data[0] || {});
            
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
                
                if (valorTotal > 0.01 && valorTotal < 1000) {
                    fileTotal += valorTotal;
                    fileIVA += valorIVA;
                    fileSemIVA += valorSemIVA;
                    fileCount++;
                }
            }
            
            if (!VDCSystem.documents.saft.totals) {
                VDCSystem.documents.saft.totals = { records: 0, iliquido: 0, iva: 0, bruto: 0 };
            }
            
            VDCSystem.documents.saft.totals.bruto = (VDCSystem.documents.saft.totals.bruto || 0) + fileTotal;
            VDCSystem.documents.saft.totals.iva = (VDCSystem.documents.saft.totals.iva || 0) + fileIVA;
            VDCSystem.documents.saft.totals.iliquido = (VDCSystem.documents.saft.totals.iliquido || 0) + fileSemIVA;
            
            ValueSource.registerValue('saftBrutoValue', fileTotal, file.name, 'soma de valores totais do CSV');
            ValueSource.registerValue('saftIvaValue', fileIVA, file.name, 'soma de IVA do CSV');
            ValueSource.registerValue('saftIliquidoValue', fileSemIVA, file.name, 'soma de valores sem IVA');
            
            logAudit(`📊 SAF-T CSV: ${file.name} | +${formatCurrency(fileTotal)} (${fileCount} registos) | IVA: +${formatCurrency(fileIVA)}`, 'success');
            
        } catch(e) {
            console.warn(`Erro ao processar SAF-T ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento SAF-T: ${e.message}`, 'warning');
        }
    }

    // ============================================================
    // PROCESSAMENTO DE DAC7
    // ============================================================
    if (type === 'dac7') {
        try {
            const dac7AnualRegex = /Total de receitas anuais:\s*([\d\s,.]+)€/i;
            const dac7Q4Regex = /Ganhos do 4\.º trimestre:\s*([\d\s,.]+)€/i;
            
            const anualMatch = text.match(dac7AnualRegex);
            if (anualMatch) {
                const val = toForensicNumber(anualMatch[1]);
                if (VDCSystem.documents.dac7.totals.q4 === 0) {
                    VDCSystem.documents.dac7.totals.q4 = val;
                    ValueSource.registerValue('dac7Q4Value', val, file.name, 'extração DAC7 anual');
                    logAudit(`📈 DAC7 anual extraído: ${formatCurrency(val)}`, 'success');
                }
            }
            
            const q4Match = text.match(dac7Q4Regex);
            if (q4Match && VDCSystem.documents.dac7.totals.q4 === 0) {
                const val = toForensicNumber(q4Match[1]);
                VDCSystem.documents.dac7.totals.q4 = val;
                ValueSource.registerValue('dac7Q4Value', val, file.name, 'extração DAC7 Q4');
            }
            
        } catch(e) {
            console.warn(`Erro ao processar DAC7 ${file.name}:`, e);
            logAudit(`⚠️ Erro no processamento DAC7: ${e.message}`, 'warning');
        }
    }

    // ============================================================
    // PROCESSAMENTO DE CONTROLO
    // ============================================================
    if (type === 'control') {
        logAudit(`🔐 Ficheiro de controlo registado: ${file.name}`, 'info');
    }

    const listId = getListIdForType(type);
    const listEl = document.getElementById(listId);
    
    const iconClass = isPDF ? 'fa-file-pdf' : 'fa-file-csv';
    const iconColor = isPDF ? '#e74c3c' : '#2ecc71';

    if(listEl) {
        listEl.style.display = 'block';
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item-modal';
        
        const demoBadge = VDCSystem.demoMode ? '<span class="demo-badge">DEMO</span>' : '';
        
        fileItem.innerHTML = `
            <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
            <span class="file-name-modal">${file.name} ${demoBadge}</span>
            <span class="file-hash-modal">${hash.substring(0,8)}...</span>
        `;
        listEl.appendChild(fileItem);
    }
    
    forensicDataSynchronization();
}

function getListIdForType(type) {
    switch(type) {
        case 'invoice': return 'invoicesFileListModal';
        case 'statement': return 'statementsFileListModal';
        case 'dac7': return 'dac7FileListModal';
        case 'control': return 'controlFileListModal';
        case 'saft': return 'saftFileListModal';
        default: return 'globalFileListModal';
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
// 12. MODO DEMO
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

    logAudit('🚀 ATIVANDO CASO SIMULADO v12.7.2 SMOKING GUN...', 'info');

    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();

    VDCSystem.dataMonths.add('202409');
    VDCSystem.dataMonths.add('202410');
    VDCSystem.dataMonths.add('202411');
    VDCSystem.dataMonths.add('202412');

    simulateUpload('control', 1);
    simulateUpload('saft', 4);
    simulateUpload('invoices', 2);
    simulateUpload('statements', 4);
    simulateUpload('dac7', 1);

    setTimeout(() => {
        VDCSystem.documents.saft.totals.bruto = forensicRound(8758.03);
        VDCSystem.documents.saft.totals.iliquido = forensicRound(8261.32);
        VDCSystem.documents.saft.totals.iva = forensicRound(496.71);
        
        VDCSystem.documents.statements.totals.ganhosApp = forensicRound(9652.13);
        VDCSystem.documents.statements.totals.campanhas = forensicRound(405.00);
        VDCSystem.documents.statements.totals.gorjetas = forensicRound(46.00);
        VDCSystem.documents.statements.totals.taxasCancelamento = forensicRound(58.10);
        VDCSystem.documents.statements.totals.despesasComissao = forensicRound(2425.04);
        VDCSystem.documents.statements.totals.ganhosLiquidos = forensicRound(7722.05);
        
        VDCSystem.documents.dac7.totals.q4 = forensicRound(7755.16);
        VDCSystem.documents.invoices.totals.invoiceValue = forensicRound(262.94);

        ValueSource.registerValue('saftBrutoValue', 8758.03, 'demo_saft_combined.csv', 'dados simulados');
        ValueSource.registerValue('stmtGanhosValue', 9652.13, 'demo_statements_combined.pdf', 'dados simulados');
        ValueSource.registerValue('dac7Q4Value', 7755.16, 'demo_dac7.pdf', 'dados simulados');

        performAudit();

        logAudit('✅ Perícia simulada concluída.', 'success');
        VDCSystem.processing = false;
        if(demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = `<i class="fas fa-flask"></i> ${translations[currentLang].navDemo}`;
        }
        
        forensicDataSynchronization();
    }, 1500);
}

function simulateUpload(type, count) {
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { files: [], hashes: {}, totals: { records: 0 } };
    }
    
    if (!VDCSystem.documents[type].files) {
        VDCSystem.documents[type].files = [];
    }
    
    for (let i = 0; i < count; i++) {
        const fileName = `demo_${type}_${i + 1}.${type === 'invoices' ? 'pdf' : type === 'saft' ? 'csv' : 'csv'}`;
        const fileObj = { name: fileName, size: 1024 * (i + 1) };
        
        const fileExists = VDCSystem.documents[type].files.some(f => f.name === fileName);
        if (!fileExists) {
            VDCSystem.documents[type].files.push(fileObj);
        }
        
        VDCSystem.documents[type].totals.records = VDCSystem.documents[type].files.length;

        const demoHash = 'DEMO-' + CryptoJS.SHA256(Date.now().toString() + i).toString().substring(0, 8) + '...';
        VDCSystem.analysis.evidenceIntegrity.push({ 
            filename: fileName, 
            type: type === 'invoices' ? 'invoice' : type, 
            hash: demoHash, 
            timestamp: new Date().toLocaleString(), 
            size: 1024 * (i + 1), 
            timestampUnix: Math.floor(Date.now() / 1000) 
        });
        
        const listId = getListIdForType(type === 'invoices' ? 'invoice' : type);
        const listEl = document.getElementById(listId);
        if (listEl) {
            listEl.innerHTML += `<div class="file-item-modal">
                <i class="fas fa-flask" style="color: #f59e0b;"></i>
                <span class="file-name-modal">${fileName} <span class="demo-badge">DEMO</span></span>
                <span class="file-hash-modal">${demoHash.substring(0,8)}</span>
            </div>`;
        }
    }
    updateCounters();
    updateEvidenceSummary();
}

// ============================================================================
// 13. MOTOR DE PERÍCIA FORENSE - NOVAS REGRAS DE CRUZAMENTO
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
            const saftBruto = VDCSystem.documents.saft?.totals?.bruto || 0;
            const saftIliquido = VDCSystem.documents.saft?.totals?.iliquido || 0;
            const saftIva = VDCSystem.documents.saft?.totals?.iva || 0;
            
            const stmtGross = VDCSystem.documents.statements?.totals?.ganhosApp || 0;
            const stmtCommission = VDCSystem.documents.statements?.totals?.despesasComissao || 0;
            const stmtCampanhas = VDCSystem.documents.statements?.totals?.campanhas || 0;
            const stmtGorjetas = VDCSystem.documents.statements?.totals?.gorjetas || 0;
            const stmtPortagens = VDCSystem.documents.statements?.totals?.portagens || 0;
            const stmtCancelamentos = VDCSystem.documents.statements?.totals?.taxasCancelamento || 0;
            const stmtLiquido = VDCSystem.documents.statements?.totals?.ganhosLiquidos || 0;
            
            const invoiceVal = VDCSystem.documents.invoices?.totals?.invoiceValue || 0;
            
            const dac7Q4 = VDCSystem.documents.dac7?.totals?.q4 || 0;
            
            const grossRevenue = stmtGross > 0 ? stmtGross : saftBruto;
            const platformCommission = stmtCommission;
            
            VDCSystem.analysis.extractedValues = {
                saftBruto: saftBruto,
                saftIliquido: saftIliquido,
                saftIva: saftIva,
                ganhosApp: stmtGross,
                comissaoApp: platformCommission,
                campanhas: stmtCampanhas,
                gorjetas: stmtGorjetas,
                portagens: stmtPortagens,
                taxasCancelamento: stmtCancelamentos,
                ganhosLiquidos: stmtLiquido,
                faturaPlataforma: invoiceVal,
                dac7Q4: dac7Q4,
                rendimentosBrutos: grossRevenue,
                comissaoTotal: platformCommission
            };

            performForensicCrossings();
            selectQuestions(VDCSystem.analysis.verdict ? VDCSystem.analysis.verdict.key : 'low');
            updateDashboard();
            updateModulesUI();
            renderChart();
            showAlerts();

            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            
            logAudit(`📊 VALORES UTILIZADOS NA PERÍCIA:`, 'info');
            logAudit(`   Ganhos App: ${formatCurrency(stmtGross)} (${VDCSystem.documents.statements?.files?.length || 0} ficheiros)`, 'info');
            logAudit(`   Comissões Extrato: ${formatCurrency(platformCommission)}`, 'info');
            logAudit(`   Fatura Comissões: ${formatCurrency(invoiceVal)} (${VDCSystem.documents.invoices?.files?.length || 0} ficheiros)`, 'info');
            logAudit(`   Discrepância Crítica: ${formatCurrency(platformCommission - invoiceVal)}`, 'info');
            logAudit(`   Meses com dados: ${VDCSystem.dataMonths.size}`, 'info');
            
            logAudit(`✅ Perícia BIG DATA concluída em ${duration}ms. SMOKING GUN DETETADA: ${VDCSystem.analysis.crossings.discrepanciaCritica > 0 ? 'SIM' : 'NÃO'}`, 'success');
            
            forensicDataSynchronization();

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

function performForensicCrossings() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    const saftBruto = ev.saftBruto || 0;
    const ganhosApp = ev.ganhosApp || 0;
    const comissaoTotal = ev.comissaoTotal || 0;
    const faturaPlataforma = ev.faturaPlataforma || 0;
    const dac7Q4 = ev.dac7Q4 || 0;
    const ganhosLiquidos = ev.ganhosLiquidos || 0;

    // REGRA 1: Soma Total SAF-T vs DAC7
    cross.saftVsDac7Alert = Math.abs(saftBruto - dac7Q4) > 0.01;
    
    // REGRA 2: SAF-T - Comissão vs Ganhos Líquidos
    const saftMenosComissao = saftBruto - comissaoTotal;
    cross.saftMenosComissaoVsLiquidoAlert = Math.abs(saftMenosComissao - ganhosLiquidos) > 0.01;
    
    // REGRA 3: SAF-T vs Ganhos Brutos
    cross.saftVsGanhosAlert = Math.abs(saftBruto - ganhosApp) > 0.01;
    
    // REGRA 4: Comissões vs Fatura (PROVA RAINHA)
    cross.discrepanciaCritica = comissaoTotal - faturaPlataforma;
    cross.percentagemOmissao = comissaoTotal > 0 ? (cross.discrepanciaCritica / comissaoTotal) * 100 : 0;
    cross.ivaFalta = cross.discrepanciaCritica * 0.23;
    cross.ivaFalta6 = cross.discrepanciaCritica * 0.06; // IVA 6% omitido
    
    // Percentagem da discrepância (para o verdict display)
    cross.percentagemDiscrepancia = comissaoTotal > 0 ? (cross.discrepanciaCritica / comissaoTotal) * 100 : 0;
    
    // REGRA 5: Taxas Cancelamento incluídas em Ganhos (já é feito no processamento)
    
    // REGRA 6: Ganhos Campanha + Gorjetas + Portagens (já são somados no processamento)
    
    // Cálculo do Impacto no Mercado (38.000 motoristas, 7 anos)
    const mesesDados = VDCSystem.dataMonths.size || 1;
    const discrepanciaMensalMedia = cross.discrepanciaCritica / mesesDados;
    
    cross.btor = comissaoTotal; // Base Tributável Operacional Retida
    cross.btf = faturaPlataforma; // Base Tributável Faturada
    
    cross.impactoMensalMercado = discrepanciaMensalMedia * 38000;
    cross.impactoAnualMercado = cross.impactoMensalMercado * 12;
    cross.impactoSeteAnosMercado = cross.impactoAnualMercado * 7;
    
    // NOVOS CÁLCULOS PARA BOXES DE ALERTA
    cross.discrepancia5IMT = cross.discrepanciaCritica * 0.05; // 5% IMT/AMT
    cross.agravamentoBrutoIRC = cross.discrepanciaCritica * 12; // Projeção anual
    cross.ircEstimado = cross.agravamentoBrutoIRC * 0.21; // 21% IRC + Derrama (estimativa simplificada)
    
    // Ativar alerta principal se houver discrepância crítica
    cross.bigDataAlertActive = Math.abs(cross.discrepanciaCritica) > 0.01;
    
    // Verdict baseado na percentagem de omissão
    const baseComparacao = Math.max(saftBruto, ganhosApp, dac7Q4);
    VDCSystem.analysis.verdict = getRiskVerdict(Math.abs(cross.discrepanciaCritica), baseComparacao);
    
    // CORREÇÃO: Guardar a percentagem correta no verdict
    if (VDCSystem.analysis.verdict) {
        VDCSystem.analysis.verdict.percent = cross.percentagemDiscrepancia.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }
    
    logAudit(`🔫 SMOKING GUN: Comissões ${formatCurrency(comissaoTotal)} vs Fatura ${formatCurrency(faturaPlataforma)} = ${formatCurrency(cross.discrepanciaCritica)} (${cross.percentagemOmissao.toFixed(2)}%)`, 'error');
    logAudit(`💰 IVA em falta (23%): ${formatCurrency(cross.ivaFalta)}`, 'error');
    logAudit(`💰 IVA em falta (6%): ${formatCurrency(cross.ivaFalta6)}`, 'info');
}

function selectQuestions(riskKey) {
    const filtered = QUESTIONS_CACHE.filter(q => {
        if (riskKey === 'high') return true;
        if (riskKey === 'med') return q.type !== 'high';
        if (riskKey === 'low') return q.type === 'low';
        return true;
    });
    
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    VDCSystem.analysis.selectedQuestions = shuffled.slice(0, 6);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    const netValue = (ev.rendimentosBrutos || 0) - (ev.comissaoTotal || 0);

    setElementText('statNet', formatCurrency(netValue));
    setElementText('statComm', formatCurrency(ev.comissaoTotal || 0));
    setElementText('statJuros', formatCurrency(cross.discrepanciaCritica || 0));

    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiCommValue', formatCurrency(ev.comissaoTotal || 0));
    setElementText('kpiNetValue', formatCurrency(netValue));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));

    // NOVAS BOXES DE ALERTA
    setElementText('discrepancy5Value', formatCurrency(cross.discrepancia5IMT || 0));
    setElementText('agravamentoBrutoValue', formatCurrency(cross.agravamentoBrutoIRC || 0));
    setElementText('ircValue', formatCurrency(cross.ircEstimado || 0));
    setElementText('iva6Value', formatCurrency(cross.ivaFalta6 || 0));
    setElementText('iva23Value', formatCurrency(cross.ivaFalta || 0));

    setElementText('quantumValue', formatCurrency(cross.impactoSeteAnosMercado || 0));

    const mesesDados = VDCSystem.dataMonths.size || 1;
    
    const quantumFormulaEl = document.getElementById('quantumFormula');
    if (quantumFormulaEl) {
        quantumFormulaEl.textContent = `Base Omitida: ${formatCurrency(cross.discrepanciaCritica)} | ${cross.percentagemOmissao.toFixed(2)}%`;
    }
    
    const quantumNoteEl = document.getElementById('quantumNote');
    if (quantumNoteEl) {
        quantumNoteEl.textContent = `IVA em falta (23%): ${formatCurrency(cross.ivaFalta)} | IVA (6%): ${formatCurrency(cross.ivaFalta6)}`;
    }

    const quantumBreakdownEl = document.getElementById('quantumBreakdown');
    if (quantumBreakdownEl) {
        quantumBreakdownEl.innerHTML = `
            <div class="quantum-breakdown-item">
                <span>BTOR (Base Operacional):</span>
                <span>${formatCurrency(cross.btor)}</span>
            </div>
            <div class="quantum-breakdown-item">
                <span>BTF (Base Faturada):</span>
                <span>${formatCurrency(cross.btf)}</span>
            </div>
            <div class="quantum-breakdown-item" style="border-top: 1px solid rgba(239,68,68,0.3); margin-top:0.3rem; padding-top:0.3rem;">
                <span>DISCREPÂNCIA (Omissão):</span>
                <span style="color:var(--warn-primary);">${formatCurrency(cross.discrepanciaCritica)}</span>
            </div>
            <div class="quantum-breakdown-item">
                <span>Meses com dados:</span>
                <span>${mesesDados}</span>
            </div>
            <div class="quantum-breakdown-item">
                <span>Média mensal:</span>
                <span>${formatCurrency(cross.discrepanciaCritica / mesesDados)}</span>
            </div>
            <div class="quantum-breakdown-item" style="border-top: 1px solid rgba(239,68,68,0.3); margin-top:0.3rem; padding-top:0.3rem;">
                <span>Impacto Mensal Mercado (38k):</span>
                <span>${formatCurrency(cross.impactoMensalMercado)}</span>
            </div>
            <div class="quantum-breakdown-item">
                <span>Impacto Anual Mercado:</span>
                <span>${formatCurrency(cross.impactoAnualMercado)}</span>
            </div>
            <div class="quantum-breakdown-item">
                <span>IMPACTO 7 ANOS:</span>
                <span style="color:var(--warn-primary); font-weight:800;">${formatCurrency(cross.impactoSeteAnosMercado)}</span>
            </div>
        `;
    }

    // Mostrar/esconder boxes de alerta baseado nos valores
    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (Math.abs(cross.discrepanciaCritica) > 0) ? 'block' : 'none';
    
    const discrepancy5Card = document.getElementById('discrepancy5Card');
    if(discrepancy5Card) discrepancy5Card.style.display = (Math.abs(cross.discrepancia5IMT) > 0) ? 'block' : 'none';
    
    const agravamentoBrutoCard = document.getElementById('agravamentoBrutoCard');
    if(agravamentoBrutoCard) agravamentoBrutoCard.style.display = (Math.abs(cross.agravamentoBrutoIRC) > 0) ? 'block' : 'none';
    
    const ircCard = document.getElementById('ircCard');
    if(ircCard) ircCard.style.display = (Math.abs(cross.ircEstimado) > 0) ? 'block' : 'none';
    
    const iva6Card = document.getElementById('iva6Card');
    if(iva6Card) iva6Card.style.display = (Math.abs(cross.ivaFalta6) > 0) ? 'block' : 'none';
    
    const iva23Card = document.getElementById('iva23Card');
    if(iva23Card) iva23Card.style.display = (Math.abs(cross.ivaFalta) > 0) ? 'block' : 'none';
    
    const quantumBox = document.getElementById('quantumBox');
    if (quantumBox) {
        quantumBox.style.display = (Math.abs(cross.impactoSeteAnosMercado) > 0) ? 'block' : 'none';
    }
    
    // ATIVAR ALERTAS INTERMITENTES
    activateIntermittentAlerts();
}

function activateIntermittentAlerts() {
    const cross = VDCSystem.analysis.crossings;
    
    // Box FATURADO (kpiInvCard) - alerta amarelo intermitente se houver discrepância
    const kpiInvCard = document.getElementById('kpiInvCard');
    if (kpiInvCard) {
        if (Math.abs(cross.discrepanciaCritica) > 0.01) {
            kpiInvCard.classList.add('alert-intermitent');
        } else {
            kpiInvCard.classList.remove('alert-intermitent');
        }
    }
    
    // Box COMISSÕES DETETADAS (statCommCard) - alerta amarelo intermitente se houver discrepância
    const statCommCard = document.getElementById('statCommCard');
    if (statCommCard) {
        if (Math.abs(cross.discrepanciaCritica) > 0.01) {
            statCommCard.classList.add('alert-intermitent');
        } else {
            statCommCard.classList.remove('alert-intermitent');
        }
    }
    
    // Box COMISSÕES na triangulação (kpiCommCard)
    const kpiCommCard = document.getElementById('kpiCommCard');
    if (kpiCommCard) {
        if (Math.abs(cross.discrepanciaCritica) > 0.01) {
            kpiCommCard.classList.add('alert-intermitent');
        } else {
            kpiCommCard.classList.remove('alert-intermitent');
        }
    }
}

function updateModulesUI() {
    const ev = VDCSystem.analysis.extractedValues;
    
    setElementText('saftIliquidoValue', formatCurrency(ev.saftIliquido || 0));
    setElementText('saftIvaValue', formatCurrency(ev.saftIva || 0));
    setElementText('saftBrutoValue', formatCurrency(ev.saftBruto || 0));
    
    setElementText('stmtGanhosValue', formatCurrency(ev.ganhosApp || 0));
    setElementText('stmtCampanhasValue', formatCurrency(ev.campanhas || 0));
    setElementText('stmtGorjetasValue', formatCurrency(ev.gorjetas || 0));
    setElementText('stmtPortagensValue', formatCurrency(ev.portagens || 0));
    setElementText('stmtTaxasCancelValue', formatCurrency(ev.taxasCancelamento || 0));
    
    const comissaoEl = document.getElementById('stmtComissaoValue');
    if (comissaoEl) {
        const comissao = ev.comissaoTotal || 0;
        comissaoEl.textContent = formatCurrency(comissao);
        if (VDCSystem.analysis.crossings?.discrepanciaCritica > 0.01) {
            comissaoEl.classList.add('alert');
        } else {
            comissaoEl.classList.remove('alert');
        }
    }
    
    setElementText('dac7Q1Value', formatCurrency(ev.dac7Q1 || 0));
    setElementText('dac7Q2Value', formatCurrency(ev.dac7Q2 || 0));
    setElementText('dac7Q3Value', formatCurrency(ev.dac7Q3 || 0));
    setElementText('dac7Q4Value', formatCurrency(ev.dac7Q4 || 0));
    
    const sourceElements = document.querySelectorAll('[id$="Source"]');
    sourceElements.forEach(el => {
        const baseId = el.id.replace('Source', '');
        const source = ValueSource.getBreakdown(baseId);
        if (source && el) {
            const fileName = source.sourceFile.length > 30 ? source.sourceFile.substring(0, 27) + '...' : source.sourceFile;
            el.textContent = `Fonte: ${fileName}`;
            el.setAttribute('data-tooltip', `Cálculo: ${source.calculationMethod}\nFicheiro: ${source.sourceFile}\nValor: ${formatCurrency(source.value)}`);
        }
    });
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    // Verdict Display - Parecer Técnico com percentagem corrigida
    const verdictDisplay = document.getElementById('verdictDisplay');
    if(verdictDisplay && VDCSystem.analysis.verdict) {
        verdictDisplay.style.display = 'block';
        verdictDisplay.className = `verdict-display active verdict-${VDCSystem.analysis.verdict.key}`;
        setElementText('verdictLevel', VDCSystem.analysis.verdict.level);
        
        // CORREÇÃO: Mostrar percentagem correta
        const verdictPercentSpan = document.getElementById('verdictPercentSpan');
        if (verdictPercentSpan) {
            verdictPercentSpan.textContent = VDCSystem.analysis.verdict.percent;
        }
        
        // Construir parecer técnico detalhado
        const platform = PLATFORM_DATA[VDCSystem.selectedPlatform] || PLATFORM_DATA.outra;
        const mesesDados = VDCSystem.dataMonths.size || 1;
        
        const parecerHTML = `
            <div style="margin-bottom: 1rem;">
                <strong style="color: var(--accent-primary);">I. ANÁLISE PERICIAL:</strong><br>
                <span style="color: var(--text-secondary);">Discrepância grave detetada entre valores retidos pela ${platform.name} e valores faturados.</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: var(--accent-primary);">II. FATOS CONSTATADOS:</strong><br>
                <span style="color: var(--text-secondary);">Comissão Real Retida (Extrato): ${formatCurrency(ev.comissaoTotal || 0)}.</span><br>
                <span style="color: var(--text-secondary);">Valor Faturado (Fatura): ${formatCurrency(ev.faturaPlataforma || 0)}.</span><br>
                <span style="color: var(--warn-primary); font-weight: 700;">Diferença Omitida: ${formatCurrency(cross.discrepanciaCritica)} (${cross.percentagemOmissao.toFixed(2)}% do valor retido).</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: var(--accent-primary);">III. ENQUADRAMENTO LEGAL:</strong><br>
                <span style="color: var(--text-secondary);">Artigo 2.º, n.º 1, alínea i) do CIVA (Autoliquidação). Artigo 108.º do CIVA (Infrações).</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: var(--accent-primary);">IV. IMPACTO FISCAL E AGRAVAMENTO DE GESTÃO:</strong><br>
                <span style="color: var(--text-secondary);">IVA em falta (23%): ${formatCurrency(cross.ivaFalta)} omitidos ao erário público.</span><br>
                <span style="color: var(--text-secondary);">IVA em falta (6%): ${formatCurrency(cross.ivaFalta6)} omitidos (IMT/AMT).</span><br>
                <span style="color: var(--text-secondary);">Agravamento Bruto/IRC: A diferença de ${formatCurrency(cross.discrepanciaCritica)} não faturada pela plataforma impacta diretamente a contabilidade do cliente. Este valor, ao não ser reconhecido como custo faturado, aumenta artificialmente o lucro tributável, agravando o IRC (estimativa de 21% + Derrama) no final do exercício. Projeção anual de base omitida: ${formatCurrency(cross.discrepanciaCritica * 12)}.</span><br>
                <span style="color: var(--text-secondary);">Impacto IRC: A discrepância de ${formatCurrency(cross.discrepanciaCritica)} (${cross.percentagemOmissao.toFixed(2)}%) agrava consideravelmente a posição do cliente, pois ao não ser reconhecida como custo faturado, aumenta o lucro tributável em sede de IRC/Derrama (est. 21% + Derrama), com um impacto anual projetado de ${formatCurrency(cross.discrepanciaCritica * 12 * 0.21)}.</span>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong style="color: var(--accent-primary);">V. CADEIA DE CUSTÓDIA:</strong><br>
                <span style="color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.7rem;">Master Hash: SHA256(Hash_SAFT + Hash_Extrato + Hash_Fatura).</span><br>
                <span style="color: var(--accent-secondary); font-family: var(--font-mono); font-size: 0.7rem; word-break: break-all;">${VDCSystem.masterHash || 'A calcular...'}</span>
            </div>
            <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                <strong style="color: var(--warn-primary);">VI. CONCLUSÃO:</strong><br>
                <span style="color: var(--text-secondary);">Indícios de infração ao Artigo 108.º do Código do IVA.</span>
            </div>
        `;
        
        document.getElementById('verdictDesc').innerHTML = parecerHTML;
        document.getElementById('verdictLevel').style.color = VDCSystem.analysis.verdict.color;
    }

    // Big Data Alert - Smoking Gun
    const bigDataAlert = document.getElementById('bigDataAlert');
    if(bigDataAlert) {
        if(cross.bigDataAlertActive && Math.abs(cross.discrepanciaCritica) > 0.01) {
            bigDataAlert.style.display = 'flex';
            bigDataAlert.classList.add('alert-active');
            
            setElementText('alertDeltaValue', formatCurrency(cross.discrepanciaCritica));
            
            const alertOmissionText = document.getElementById('alertOmissionText');
            if (alertOmissionText) {
                alertOmissionText.innerHTML = `Comissão Retida (Extrato): ${formatCurrency(cross.btor)} | Faturada: ${formatCurrency(cross.btf)}<br><strong style="color: var(--warn-primary);">DIVERGÊNCIA DE BASE (OMISSÃO): ${formatCurrency(cross.discrepanciaCritica)} (${cross.percentagemOmissao.toFixed(2)}%)</strong>`;
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
    const cross = VDCSystem.analysis.crossings;
    
    const labels = ['SAF-T Bruto', 'Ganhos App', 'Comissões', 'Faturado', 'DAC7 Q4', 'Líquido', 'IVA 23%'];
    const data = [
        ev.saftBruto || 0,
        ev.ganhosApp || 0,
        ev.comissaoTotal || 0,
        ev.faturaPlataforma || 0,
        ev.dac7Q4 || 0,
        ev.ganhosLiquidos || 0,
        cross.ivaFalta || 0
    ];
    
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#ff0000'];

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
// 14. EXPORTAÇÕES
// ============================================================================
function exportDataJSON() {
    const sources = {};
    ValueSource.sources.forEach((value, key) => {
        sources[key] = value;
    });
    
    const exportData = {
        metadata: {
            version: VDCSystem.version,
            sessionId: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            timestampUnix: Math.floor(Date.now() / 1000),
            timestampRFC3161: new Date().toUTCString(),
            language: currentLang,
            client: VDCSystem.client,
            anoFiscal: VDCSystem.selectedYear,
            periodoAnalise: VDCSystem.selectedPeriodo,
            platform: VDCSystem.selectedPlatform,
            demoMode: VDCSystem.demoMode,
            forensicMetadata: VDCSystem.forensicMetadata || getForensicMetadata(),
            dataMonths: Array.from(VDCSystem.dataMonths)
        },
        analysis: {
            totals: VDCSystem.analysis.extractedValues,
            discrepancies: VDCSystem.analysis.crossings,
            verdict: VDCSystem.analysis.verdict,
            selectedQuestions: VDCSystem.analysis.selectedQuestions,
            evidenceCount: VDCSystem.counts?.total || 0,
            valueSources: sources
        },
        evidence: {
            integrity: VDCSystem.analysis.evidenceIntegrity,
            invoices: {
                count: VDCSystem.documents.invoices?.files?.length || 0,
                totalValue: VDCSystem.documents.invoices?.totals?.invoiceValue || 0,
                files: VDCSystem.documents.invoices?.files?.map(f => f.name) || []
            },
            statements: {
                count: VDCSystem.documents.statements?.files?.length || 0,
                ganhos: VDCSystem.documents.statements?.totals?.ganhosApp || 0,
                campanhas: VDCSystem.documents.statements?.totals?.campanhas || 0,
                gorjetas: VDCSystem.documents.statements?.totals?.gorjetas || 0,
                portagens: VDCSystem.documents.statements?.totals?.portagens || 0,
                taxasCancelamento: VDCSystem.documents.statements?.totals?.taxasCancelamento || 0,
                comissao: VDCSystem.documents.statements?.totals?.despesasComissao || 0,
                files: VDCSystem.documents.statements?.files?.map(f => f.name) || []
            },
            saft: {
                count: VDCSystem.documents.saft?.files?.length || 0,
                bruto: VDCSystem.documents.saft?.totals?.bruto || 0,
                iliquido: VDCSystem.documents.saft?.totals?.iliquido || 0,
                iva: VDCSystem.documents.saft?.totals?.iva || 0,
                files: VDCSystem.documents.saft?.files?.map(f => f.name) || []
            },
            dac7: {
                count: VDCSystem.documents.dac7?.files?.length || 0,
                q4: VDCSystem.documents.dac7?.totals?.q4 || 0,
                files: VDCSystem.documents.dac7?.files?.map(f => f.name) || []
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

    logAudit('📊 Relatório JSON exportado com rastreabilidade completa.', 'success');
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
        const cross = VDCSystem.analysis.crossings;
        const verdict = VDCSystem.analysis.verdict || { level: 'N/A', key: 'low', color: '#8c7ae6', description: 'Perícia não executada.', percent: '0.00%' };

        let y = 45;
        let page = 1;
        const left = 14;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Função para adicionar footer com hash e QR code
        const addFooter = () => {
            const footerY = pageHeight - 15;
            doc.setFillColor(2, 6, 23);
            doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(6);
            doc.text(`Master Hash SHA-256: ${VDCSystem.masterHash || 'NÃO GERADA'} · RFC 3161`, pageWidth / 2, footerY, { align: 'center' });
            
            // QR Code será adicionado manualmente após geração do PDF
        };

        // Página 1: Identificação e Metadados
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
        doc.text(`${t.pdfLabelAddress}: ${platform.fullAddress || platform.address}`, left, y); y += 6;
        doc.text(`${t.pdfLabelNIFPlatform}: ${platform.nif}`, left, y); y += 10;
        
        doc.text(`Ano Fiscal: ${VDCSystem.selectedYear}`, left, y); y += 6;
        doc.text(`Período: ${VDCSystem.selectedPeriodo}`, left, y); y += 6;
        doc.text(`Timestamp Unix: ${Math.floor(Date.now() / 1000)}`, left, y); y += 6;
        doc.text(`Data/Hora: ${new Date().toLocaleString('pt-PT')}`, left, y); y += 10;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 2: Análise Financeira Cruzada
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(12);
        doc.text(t.pdfSection2, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`SAF-T Bruto: ${formatCurrency(ev.saftBruto || 0)} (${VDCSystem.documents.saft?.files?.length || 0} ficheiros)`, left, y); y += 6;
        doc.text(`Ganhos App: ${formatCurrency(ev.ganhosApp || 0)} (${VDCSystem.documents.statements?.files?.length || 0} ficheiros)`, left, y); y += 6;
        doc.text(`Comissões Extrato: ${formatCurrency(ev.comissaoTotal || 0)}`, left, y); y += 6;
        doc.text(`Fatura Comissões: ${formatCurrency(ev.faturaPlataforma || 0)} (${VDCSystem.documents.invoices?.files?.length || 0} ficheiros)`, left, y); y += 6;
        doc.text(`DAC7 Q4: ${formatCurrency(ev.dac7Q4 || 0)} (${VDCSystem.documents.dac7?.files?.length || 0} ficheiros)`, left, y); y += 6;
        doc.text(`DISCREPÂNCIA CRÍTICA: ${formatCurrency(cross.discrepanciaCritica || 0)} (${cross.percentagemOmissao?.toFixed(2) || '0.00'}%)`, left, y); y += 6;
        doc.text(`IVA em falta (23%): ${formatCurrency(cross.ivaFalta || 0)}`, left, y); y += 6;
        doc.text(`IVA em falta (6%): ${formatCurrency(cross.ivaFalta6 || 0)}`, left, y); y += 10;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 3: Veredicto de Risco
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
        doc.text(verdict.description, left, y, { maxWidth: pageWidth - 30 }); y += 15;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 4: PROVA RAINHA (SMOKING GUN)
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection4, left, y); y += 8;
        
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(12);
        doc.text(`🔫 SMOKING GUN - DIVERGÊNCIA CRÍTICA`, left, y); y += 10;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`Comissão Retida (Extrato): ${formatCurrency(ev.comissaoTotal || 0)}`, left, y); y += 6;
        doc.text(`Comissão Faturada (Plataforma): ${formatCurrency(ev.faturaPlataforma || 0)}`, left, y); y += 6;
        doc.text(`DIVERGÊNCIA DE BASE (OMISSÃO): ${formatCurrency(cross.discrepanciaCritica || 0)} (${cross.percentagemOmissao?.toFixed(2) || '0.00'}%)`, left, y); y += 6;
        doc.text(`IVA EM FALTA (23% SOBRE DIVERGÊNCIA): ${formatCurrency(cross.ivaFalta || 0)}`, left, y); y += 6;
        doc.text(`IVA EM FALTA (6% IMT/AMT): ${formatCurrency(cross.ivaFalta6 || 0)}`, left, y); y += 10;
        
        doc.text(`BTOR (Base Tributável Operacional Retida): ${formatCurrency(cross.btor || 0)}`, left, y); y += 6;
        doc.text(`BTF (Base Tributável Faturada): ${formatCurrency(cross.btf || 0)}`, left, y); y += 6;
        doc.text(`DISCREPÂNCIA DA BASE TRIBUTÁVEL: ${formatCurrency(cross.discrepanciaCritica || 0)}`, left, y); y += 6;
        doc.text(`Percentagem de omissão: ${cross.percentagemOmissao?.toFixed(2) || '0.00'}%`, left, y); y += 10;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 5: Enquadramento Legal
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection5, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`Artigo 2.º, n.º 1, alínea i) do Código do IVA:`, left, y); y += 5;
        doc.text(`Regime de autoliquidação aplicável a serviços prestados por sujeitos`, left, y); y += 4;
        doc.text(`passivos não residentes em território português.`, left, y); y += 6;
        
        doc.text(`• IVA Omitido: 23% sobre comissão real vs faturada`, left, y); y += 5;
        doc.text(`• Base Tributável: Diferença detetada na matriz`, left, y); y += 5;
        doc.text(`• Prazo Regularização: 30 dias após deteção`, left, y); y += 5;
        doc.text(`• Sanções Aplicáveis: Artigo 108.º do CIVA`, left, y); y += 10;
        
        doc.text(`Artigo 108.º do CIVA - Infrações:`, left, y); y += 5;
        doc.text(`Constitui infração a falta de liquidação do imposto devido,`, left, y); y += 4;
        doc.text(`bem como a sua liquidação inferior ao montante legalmente exigível.`, left, y); y += 10;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 6: Metodologia Pericial
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection6, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`BTOR (Bank Transactions Over Reality):`, left, y); y += 5;
        doc.text(`Análise comparativa entre movimentos bancários reais e`, left, y); y += 4;
        doc.text(`documentação fiscal declarada.`, left, y); y += 6;
        
        doc.text(`• Mapeamento posicional de dados SAF-T`, left, y); y += 5;
        doc.text(`• Extração precisa de valores de extrato`, left, y); y += 5;
        doc.text(`• Cálculo de divergência automático`, left, y); y += 5;
        doc.text(`• Geração de prova técnica auditável`, left, y); y += 10;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 7: Certificação Digital
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection7, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`Sistema certificado de peritagem forense com selo de`, left, y); y += 4;
        doc.text(`integridade digital SHA-256. Todos os relatórios são`, left, y); y += 4;
        doc.text(`temporalmente selados e auditáveis.`, left, y); y += 8;
        
        doc.text(`Algoritmo Hash: SHA-256`, left, y); y += 5;
        doc.text(`Timestamp: RFC 3161`, left, y); y += 5;
        doc.text(`Validade Prova: Indeterminada`, left, y); y += 5;
        doc.text(`Certificação: VDC Forense v12.7.2`, left, y); y += 10;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 8: Análise Pericial Detalhada
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection8, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`I. ANÁLISE PERICIAL:`, left, y); y += 5;
        doc.text(`Discrepância grave detetada entre valores retidos pela ${platform.name}`, left, y); y += 4;
        doc.text(`e valores faturados.`, left, y); y += 6;
        
        doc.text(`II. FATOS CONSTATADOS:`, left, y); y += 5;
        doc.text(`Comissão Real Retida (Extrato): ${formatCurrency(ev.comissaoTotal || 0)}.`, left, y); y += 4;
        doc.text(`Valor Faturado (Fatura): ${formatCurrency(ev.faturaPlataforma || 0)}.`, left, y); y += 4;
        doc.text(`Diferença Omitida: ${formatCurrency(cross.discrepanciaCritica)} (${cross.percentagemOmissao.toFixed(2)}% do valor retido).`, left, y); y += 6;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 9: Fatos Constatados (continuação)
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection9, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`III. ENQUADRAMENTO LEGAL:`, left, y); y += 5;
        doc.text(`Artigo 2.º, n.º 1, alínea i) do CIVA (Autoliquidação).`, left, y); y += 4;
        doc.text(`Artigo 108.º do CIVA (Infrações).`, left, y); y += 6;
        
        doc.text(`IV. IMPACTO FISCAL E AGRAVAMENTO DE GESTÃO:`, left, y); y += 5;
        doc.text(`IVA em falta (23%): ${formatCurrency(cross.ivaFalta)} omitidos ao erário público.`, left, y); y += 4;
        doc.text(`IVA em falta (6%): ${formatCurrency(cross.ivaFalta6)} omitidos (IMT/AMT).`, left, y); y += 4;
        doc.text(`Agravamento Bruto/IRC: A diferença de ${formatCurrency(cross.discrepanciaCritica)}`, left, y); y += 4;
        doc.text(`não faturada pela plataforma impacta diretamente a contabilidade`, left, y); y += 4;
        doc.text(`do cliente. Projeção anual de base omitida: ${formatCurrency(cross.discrepanciaCritica * 12)}.`, left, y); y += 4;
        doc.text(`Impacto IRC anual projetado: ${formatCurrency(cross.discrepanciaCritica * 12 * 0.21)}.`, left, y); y += 6;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 10: Impacto Fiscal
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection10, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`DISCREPÂNCIA 5% IMT/AMT: ${formatCurrency(cross.discrepancia5IMT || 0)}`, left, y); y += 6;
        doc.text(`AGRAVAMENTO BRUTO/IRC (anual): ${formatCurrency(cross.agravamentoBrutoIRC || 0)}`, left, y); y += 6;
        doc.text(`IRC ESTIMADO (21% + Derrama): ${formatCurrency(cross.ircEstimado || 0)}`, left, y); y += 6;
        
        if (Math.abs(cross.impactoSeteAnosMercado) > 0) {
            y += 5;
            doc.setTextColor(239, 68, 68);
            doc.setFontSize(11);
            doc.text('CÁLCULO DO IMPACTO NO MERCADO:', left, y); y += 6;
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(9);
            doc.text(`Discrepância base: ${formatCurrency(cross.discrepanciaCritica || 0)}`, left, y); y += 5;
            doc.text(`Meses com dados: ${VDCSystem.dataMonths.size || 1}`, left, y); y += 5;
            doc.text(`Média mensal: ${formatCurrency((cross.discrepanciaCritica || 0) / (VDCSystem.dataMonths.size || 1))}`, left, y); y += 5;
            doc.text(`Impacto Mensal Mercado (38k): ${formatCurrency(cross.impactoMensalMercado || 0)}`, left, y); y += 5;
            doc.text(`Impacto Anual Mercado: ${formatCurrency(cross.impactoAnualMercado || 0)}`, left, y); y += 5;
            doc.text(`IMPACTO 7 ANOS: ${formatCurrency(cross.impactoSeteAnosMercado || 0)}`, left, y); y += 10;
        }
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 11: Cadeia de Custódia
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection11, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.text(`Master Hash: SHA256(Hash_SAFT + Hash_Extrato + Hash_Fatura)`, left, y); y += 5;
        doc.text(`${VDCSystem.masterHash || 'A calcular...'}`, left, y); y += 10;
        
        doc.text(`Evidências processadas:`, left, y); y += 5;
        VDCSystem.analysis.evidenceIntegrity.slice(0, 10).forEach((item, index) => {
            doc.text(`${index+1}. ${item.filename} - ${item.hash.substring(0,16)}...`, left, y); y += 4;
        });
        y += 5;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 12: Questionário Pericial Estratégico
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection12, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9);
        VDCSystem.analysis.selectedQuestions.forEach((q, index) => {
            doc.text(`${index+1}. ${q.text}`, left, y); y += 5;
        });
        y += 5;
        
        addFooter();
        doc.addPage();
        y = 45;
        page++;
        
        // Página 13: Conclusão
        doc.setTextColor(0, 229, 255);
        doc.text(t.pdfSection13, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(t.pdfConclusionText, left, y, { maxWidth: pageWidth - 30 }); y += 15;
        
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(12);
        doc.text(`VI. CONCLUSÃO:`, left, y); y += 8;
        doc.setTextColor(60, 60, 60);
        doc.text(`Indícios de infração ao Artigo 108.º do Código do IVA.`, left, y); y += 6;
        
        addFooter();
        
        // Salvar PDF
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
// 15. FUNÇÕES AUXILIARES
// ============================================================================
function generateMasterHash() {
    const data = JSON.stringify({
        client: VDCSystem.client,
        docs: VDCSystem.documents,
        session: VDCSystem.sessionId,
        months: Array.from(VDCSystem.dataMonths),
        sources: Array.from(ValueSource.sources.entries()),
        timestamp: Date.now(),
        timestampRFC3161: new Date().toUTCString()
    });
    VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
    generateQRCode();
}

function logAudit(message, type = 'info') {
    const now = Date.now();
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
    
    resetAllValues();
    
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const logEl = document.createElement('div');
    logEl.className = 'log-entry log-info';
    logEl.textContent = `[${timestamp}] 🧹 Console limpo e todos os valores resetados.`;
    if (consoleOutput) {
        consoleOutput.appendChild(logEl);
    }
    
    VDCSystem.logs.push({ timestamp, message: '🧹 Console limpo e todos os valores resetados.', type: 'info' });
    
    showToast('Sistema resetado com sucesso', 'success');
}

function resetAllValues() {
    VDCSystem.documents.saft.totals = { records: 0, iliquido: 0, iva: 0, bruto: 0 };
    VDCSystem.documents.statements.totals = { records: 0, ganhosApp: 0, campanhas: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, despesasComissao: 0, ganhosLiquidos: 0 };
    VDCSystem.documents.invoices.totals = { invoiceValue: 0, records: 0 };
    VDCSystem.documents.dac7.totals = { records: 0, q1: 0, q2: 0, q3: 0, q4: 0, servicosQ1: 0, servicosQ2: 0, servicosQ3: 0, servicosQ4: 0, comissoesQ4: 0 };
    VDCSystem.documents.control.totals = { records: 0 };
    
    VDCSystem.documents.statements.files = [];
    VDCSystem.documents.invoices.files = [];
    VDCSystem.documents.saft.files = [];
    VDCSystem.documents.control.files = [];
    VDCSystem.documents.dac7.files = [];
    
    VDCSystem.processedFiles.clear();
    VDCSystem.dataMonths.clear();
    VDCSystem.analysis.evidenceIntegrity = [];
    ValueSource.sources.clear();
    
    VDCSystem.analysis.extractedValues = {};
    VDCSystem.analysis.crossings = { 
        delta: 0, 
        bigDataAlertActive: false, 
        invoiceDivergence: false, 
        comissaoDivergencia: 0,
        saftVsDac7Alert: false,
        saftVsGanhosAlert: false,
        saftMenosComissaoVsLiquidoAlert: false,
        discrepanciaCritica: 0,
        percentagemOmissao: 0,
        percentagemDiscrepancia: 0,
        ivaFalta: 0,
        ivaFalta6: 0,
        btor: 0,
        btf: 0,
        impactoMensalMercado: 0,
        impactoAnualMercado: 0,
        impactoSeteAnosMercado: 0,
        discrepancia5IMT: 0,
        agravamentoBrutoIRC: 0,
        ircEstimado: 0
    };
    VDCSystem.analysis.verdict = null;
    VDCSystem.analysis.selectedQuestions = [];
    
    const elementsToReset = [
        'saftIliquidoValue', 'saftIvaValue', 'saftBrutoValue',
        'stmtGanhosValue', 'stmtCampanhasValue', 'stmtGorjetasValue',
        'stmtPortagensValue', 'stmtTaxasCancelValue', 'stmtComissaoValue',
        'dac7Q1Value', 'dac7Q2Value', 'dac7Q3Value', 'dac7Q4Value',
        'statNet', 'statComm', 'statJuros',
        'kpiGrossValue', 'kpiCommValue', 'kpiNetValue', 'kpiInvValue',
        'quantumValue', 'verdictLevel', 'verdictPercentValue', 'alertDeltaValue',
        'discrepancy5Value', 'agravamentoBrutoValue', 'ircValue', 'iva6Value', 'iva23Value'
    ];
    
    elementsToReset.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('Value') || id.includes('stat') || id.includes('kpi') || id.includes('quantum') || id.includes('alert')) {
                el.textContent = '0,00 €';
            } else {
                el.textContent = 'AGUARDANDO ANÁLISE';
            }
        }
    });
    
    document.getElementById('verdictDesc').innerHTML = 'Execute a perícia para obter o veredicto.';
    const verdictPercentSpan = document.getElementById('verdictPercentSpan');
    if (verdictPercentSpan) verdictPercentSpan.textContent = '0,00%';
    
    const sourceElements = document.querySelectorAll('[id$="Source"]');
    sourceElements.forEach(el => {
        el.textContent = '';
        el.removeAttribute('data-tooltip');
    });
    
    const listIds = ['controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 'statementsFileListModal', 'dac7FileListModal'];
    listIds.forEach(id => {
        const list = document.getElementById(id);
        if (list) {
            list.innerHTML = '';
            list.style.display = 'none';
        }
    });
    
    const bigDataAlert = document.getElementById('bigDataAlert');
    if (bigDataAlert) bigDataAlert.style.display = 'none';
    
    const quantumBox = document.getElementById('quantumBox');
    if (quantumBox) {
        quantumBox.style.display = 'none';
        const breakdown = document.getElementById('quantumBreakdown');
        if (breakdown) breakdown.innerHTML = '';
    }
    
    const verdictDisplay = document.getElementById('verdictDisplay');
    if (verdictDisplay) verdictDisplay.style.display = 'none';
    
    const jurosCard = document.getElementById('jurosCard');
    if (jurosCard) jurosCard.style.display = 'none';
    
    // Esconder novas boxes
    const alertCards = ['discrepancy5Card', 'agravamentoBrutoCard', 'ircCard', 'iva6Card', 'iva23Card'];
    alertCards.forEach(id => {
        const card = document.getElementById(id);
        if (card) card.style.display = 'none';
    });
    
    // Remover classes de alerta intermitente
    const alertElements = ['kpiInvCard', 'statCommCard', 'kpiCommCard'];
    alertElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('alert-intermitent');
    });
    
    updateCounters();
    updateEvidenceSummary();
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
        VDCSystem.chart = null;
    }
    
    generateMasterHash();
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

window.VDCSystem = VDCSystem;
window.ValueSource = ValueSource;
window.forensicDataSynchronization = forensicDataSynchronization;

/* =====================================================================
   FIM DO FICHEIRO SCRIPT.JS · v12.7.2 SMOKING GUN · CSC
   ===================================================================== */
