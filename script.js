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
 * - PDF CORRIGIDO: Função addFooter definida antes de ser usada
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. UTILITÁRIOS FORENSES · PRECISÃO E VALIDAÇÃO
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
        return { level: 'INCONCLUSIVO', color: '#8c7ae6', description: 'Dados insuficientes para análise de risco.', className: 'verdict-low' };
    }
    
    const percentage = Math.abs((delta / gross) * 100);
    
    if (percentage <= 5) {
        return { 
            level: 'BAIXO RISCO (ERRO ADM.)', 
            color: '#44bd32', 
            description: 'Discrepância dentro da margem de erro operacional (0-5%). Monitorização periódica recomendada.',
            className: 'verdict-low'
        };
    } else if (percentage <= 15) {
        return { 
            level: 'RISCO MÉDIO (ANOMALIA)', 
            color: '#ff9f1a', 
            description: 'Indícios de falha algorítmica ou erro contabilístico reiterado. Auditoria de Logs de Servidor recomendada.',
            className: 'verdict-med'
        };
    } else {
        return { 
            level: 'CRÍTICO (INDÍCIO DE DOLO)', 
            color: '#e84118', 
            description: 'Discrepância crítica (>15%). Alto risco de "Layering" ou omissão de receitas. Participação Criminal / Inspeção Tributária recomendada.',
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
// 2. SISTEMA DE TRADUÇÕES (PT/EN)
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
        uploadStatementText: "EXTRATOS",
        summaryTitle: "RESUMO DE PROCESSAMENTO (HASH SHA-256)",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        modalClearBtn: "LIMPAR SISTEMA",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Discrepância transacional não justificada:",
        
        pdfTitle: "PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL",
        pdfSection1: "1. IDENTIFICAÇÃO E METADADOS DE AQUISIÇÃO",
        pdfSection2: "2. ANÁLISE FINANCEIRA CRUZADA (TRIANGULAÇÃO)",
        pdfSection3: "3. VEREDICTO DE RISCO E CLASSIFICAÇÃO",
        pdfSection4: "4. CONCLUSÕES PERICIAIS",
        pdfSection5: "5. ANEXO DE CUSTÓDIA (INTEGRIDADE SHA-256)",
        pdfSection6: "6. INTERROGATÓRIO ESTRATÉGICO",
        pdfSection7: "7. ASSINATURA DIGITAL DO PERITO",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Sessão Forense",
        pdfLabelGross: "Valor Bruto Reconstruído",
        pdfLabelComm: "Comissão Algorítmica",
        pdfLabelInv: "Valor Faturado",
        pdfLabelDiff: "Discrepância Não Justificada",
        pdfLabelIVA23: "IVA de Autoliquidação (23%)",
        pdfLabelJuros: "Juros de Mora (4%)",
        pdfLabelComp: "Juros Compensatórios (Art. 35.º LGT)",
        pdfLabelMulta: "Multa Estimada (Dolo)",
        pdfLegalTitle: "FUNDAMENTAÇÃO LEGAL",
        pdfLegalRGIT: "Art. 114.º do RGIT - Juros compensatórios",
        pdfLegalLGT: "Art. 35.º da LGT - Juros de mora",
        pdfLegalISO: "ISO/IEC 27037 - Cadeia de Custódia",
        pdfMethodText: "Metodologia: Análise forense baseada em triangulação de dados (Extrato, Fatura, Algoritmo). Aplicação de validação checksum para integridade de ficheiros e dedução fiscal reversa. Conformidade com ISO/IEC 27037 e NIST SP 800-86.",
        pdfConclusionText: "Conclusão: Os dados apresentam indícios de desvio entre valores transacionados e valores declarados. Recomenda-se a notificação da entidade para esclarecimento e eventual procedimento de inspeção tributária.",
        pdfRiskVerdict: "VEREDICTO DE RISCO",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.0 | Todos os Direitos Reservados | EM",
        pdfQuestions: [
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
        pdfSection1: "1. IDENTIFICATION & ACQUISITION METADATA",
        pdfSection2: "2. CROSS-FINANCIAL ANALYSIS (TRIANGULATION)",
        pdfSection3: "3. RISK VERDICT & CLASSIFICATION",
        pdfSection4: "4. FORENSIC CONCLUSIONS",
        pdfSection5: "5. CUSTODY ANNEX (SHA-256 INTEGRITY)",
        pdfSection6: "6. STRATEGIC INTERROGATION",
        pdfSection7: "7. EXPERT DIGITAL SIGNATURE",
        pdfLabelName: "Name",
        pdfLabelNIF: "Tax ID",
        pdfLabelSession: "Forensic Session",
        pdfLabelGross: "Reconstructed Gross Value",
        pdfLabelComm: "Algorithmic Commission",
        pdfLabelInv: "Invoiced Value",
        pdfLabelDiff: "Unjustified Discrepancy",
        pdfLabelIVA23: "Self-Billing VAT (23%)",
        pdfLabelJuros: "Default Interest (4%)",
        pdfLabelComp: "Compensatory Interest (Art. 35.º LGT)",
        pdfLabelMulta: "Estimated Fine (Intent)",
        pdfLegalTitle: "LEGAL BASIS",
        pdfLegalRGIT: "Art. 114.º RGIT - Compensatory interest",
        pdfLegalLGT: "Art. 35.º LGT - Default interest",
        pdfLegalISO: "ISO/IEC 27037 - Chain of Custody",
        pdfMethodText: "Methodology: Forensic analysis based on data triangulation. Checksum validation for file integrity and reverse fiscal deduction applied. Compliance with ISO/IEC 27037 and NIST SP 800-86.",
        pdfConclusionText: "Conclusion: Data indicates deviations between transacted and declared values. Entity notification recommended for clarification and potential tax inspection procedure.",
        pdfRiskVerdict: "RISK VERDICT",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.0 | All Rights Reserved | EM",
        pdfQuestions: [
            "1. What is the exact algorithmic logic for the service fee in the audited period?",
            "2. How is the discrepancy between internal commission and invoice justified?",
            "3. Are there records of 'Shadow Entries' (no transaction ID)?",
            "4. Does the platform provide source code for pricing algorithm?",
            "5. How are 'Tips' treated in VAT declaration?",
            "6. How is service origin determined for VAT in TVDE?",
            "7. Were dynamic rates applied without user notification?",
            "8. Do bank statements match transaction logs exactly?",
            "9. Methodology for retaining VAT when invoice omits fees?",
            "10. Evidence of timestamp manipulation?"
        ]
    }
};

let currentLang = 'pt';

// ============================================================================
// 3. ESTADO GLOBAL DO SISTEMA v12.0 CSI
// ============================================================================

const VDCSystem = {
    version: 'v12.0-CSI-FORENSIC-FINAL',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    
    logs: [],
    
    documents: {
        dac7: { files: [], parsedData: [], hashes: {}, totals: { records: 0 } },
        control: { files: [], parsedData: null, hashes: {}, totals: { records: 0 } },
        saft: { files: [], parsedData: [], hashes: {}, totals: { records: 0 } },
        invoices: { 
            files: [], 
            parsedData: [], 
            hashes: {},
            totals: { invoiceValue: 0, records: 0 }
        },
        statements: { 
            files: [], 
            parsedData: [], 
            hashes: {},
            totals: { rendimentosBrutos: 0, comissaoApp: 0, records: 0 }
        }
    },
    
    analysis: {
        extractedValues: {
            gross: 0,
            commission: 0,
            net: 0,
            iva6: 0,
            iva23: 0,
            jurosMora: 0,
            jurosCompensatorios: 0,
            taxaRegulacao: 0,
            multaDolo: 0,
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            faturaPlataforma: 0,
            diferencialCusto: 0,
            campanhas: 0,
            gorjetas: 0,
            portagens: 0
        },
        crossings: {
            delta: 0,
            omission: 0,
            diferencialAlerta: false,
            bigDataAlertActive: false,
            shadowAlertActive: false
        },
        riskVerdict: null,
        evidenceIntegrity: []
    },
    
    forensicMetadata: null,
    chart: null,
    masterHash: ''
};

// ============================================================================
// 4. INICIALIZAÇÃO DO SISTEMA
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('VDC CSI v12.0 - Inicializando sistema forense...');
    setupStaticListeners();
    loadSystemRecursively();
});

window.onload = () => {
    if (typeof CryptoJS === 'undefined') console.error('CRITICAL: CryptoJS failed to load.');
    if (typeof Papa === 'undefined') console.error('CRITICAL: PapaParse failed to load.');
    if (typeof Chart === 'undefined') console.error('CRITICAL: Chart.js failed to load.');
    if (typeof window.jspdf === 'undefined') console.error('CRITICAL: jsPDF failed to load.');
};

function setupStaticListeners() {
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.addEventListener('click', startGatekeeperSession);
    
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
    } catch (error) {
        console.error('Erro no startGatekeeperSession:', error);
        alert('Erro ao iniciar sessão. Verifique a consola.');
    }
}

function loadSystemCore() {
    updateLoadingProgress(20);
    
    setTimeout(() => {
        VDCSystem.sessionId = generateSessionId();
        setElementText('sessionIdDisplay', VDCSystem.sessionId);
        
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

function loadSystemRecursively() {
    try {
        const storedClient = localStorage.getItem('vdc_client_data_bd_v12_0');
        
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
                
                logAudit(`Cliente recuperado: ${client.name}`, 'success');
            }
        }
    } catch (e) {
        console.warn('Não foi possível recuperar cliente persistido.', e);
    }
    
    startClockAndDate();
}

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `FORENSIC ENGINE v12.0... ${percent}%`;
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            
            setTimeout(() => {
                mainContainer.style.opacity = '1';
            }, 50);
        }, 500);
    }
    
    logAudit('SISTEMA VDC v12.0 CSI ONLINE', 'success');
}

// ============================================================================
// 5. MULTILINGUAGEM
// ============================================================================

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
    
    logAudit(`Idioma alterado para: ${currentLang.toUpperCase()}`, 'info');
}

// ============================================================================
// 6. FUNÇÕES AUXILIARES DO SISTEMA
// ============================================================================

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
        const dateStr = now.toLocaleDateString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
        const timeStr = now.toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB');
        
        setElementText('currentDate', dateStr);
        setElementText('currentTime', timeStr);
    };
    
    update();
    setInterval(update, 1000);
}

function setupMainListeners() {
    const registerBtn = document.getElementById('registerClientBtnFixed');
    if (registerBtn) registerBtn.addEventListener('click', registerClient);
    
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    const platformSelect = document.getElementById('selPlatformFixed');
    if (platformSelect) {
        platformSelect.addEventListener('change', (e) => {
            VDCSystem.selectedPlatform = e.target.value;
            logAudit(`Plataforma selecionada: ${e.target.value.toUpperCase()}`, 'info');
        });
    }
    
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            const modal = document.getElementById('evidenceModal');
            if (modal) {
                modal.style.display = 'flex';
                updateEvidenceSummary();
            }
        });
    }
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    
    const closeModalHandler = () => {
        closeEvidenceModal();
        updateAnalysisButton();
    };
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
    if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeModalHandler);
    
    setupUploadListeners();
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', performAudit);
    
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportDataJSON);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSystem);
    
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllEvidence);
    
    const modal = document.getElementById('evidenceModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModalHandler();
        });
    }
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

function closeEvidenceModal() {
    const modal = document.getElementById('evidenceModal');
    if (modal) modal.style.display = 'none';
}

// ============================================================================
// 7. REGISTO DE CLIENTE COM VALIDAÇÃO DE NIF
// ============================================================================

function registerClient() {
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    
    if (!nameInput || !nifInput) {
        showToast('Erro: Campos de cliente não encontrados', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const nif = nifInput.value.trim();
    
    if (!name || name.length < 3) {
        showToast(currentLang === 'pt' ? 'Nome inválido (mínimo 3 caracteres)' : 'Invalid name (minimum 3 characters)', 'error');
        nameInput.classList.add('error');
        nameInput.classList.remove('success');
        return;
    }
    
    if (!validateNIF(nif)) {
        showToast(currentLang === 'pt' ? 'NIF inválido (checksum falhou)' : 'Invalid Tax ID (checksum failed)', 'error');
        nifInput.classList.add('error');
        nifInput.classList.remove('success');
        logAudit(`ALERTA: Tentativa de registo com NIF inválido (${nif})`, 'error');
        return;
    }
    
    nameInput.classList.remove('error');
    nifInput.classList.remove('error');
    nameInput.classList.add('success');
    nifInput.classList.add('success');
    
    VDCSystem.client = {
        name: name,
        nif: nif,
        platform: VDCSystem.selectedPlatform,
        timestamp: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('vdc_client_data_bd_v12_0', JSON.stringify(VDCSystem.client));
    } catch(e) {
        console.warn('Não foi possível persistir cliente:', e);
    }
    
    const statusEl = document.getElementById('clientStatusFixed');
    const nameDisplay = document.getElementById('clientNameDisplayFixed');
    const nifDisplay = document.getElementById('clientNifDisplayFixed');
    
    if (statusEl) statusEl.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    if (nifDisplay) nifDisplay.textContent = nif;
    
    logAudit(`Cliente registado: ${name} (NIF: ${nif})`, 'success');
    showToast(currentLang === 'pt' ? 'Cliente registado com sucesso' : 'Client registered successfully', 'success');
    
    updateAnalysisButton();
}

// ============================================================================
// 8. GESTÃO DE EVIDÊNCIAS · UPLOAD E PROCESSAMENTO REAL
// ============================================================================

async function handleFileUpload(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    
    const btn = document.querySelector(`#${type}UploadBtnModal`);
    if (btn) {
        btn.classList.add('processing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    }
    
    try {
        for (const file of files) {
            await processFile(file, type);
        }
        
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s) e processados.`, 'success');
        
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        
        showToast(`${files.length} ficheiro(s) processados`, 'success');
    } catch (error) {
        console.error('Erro no upload:', error);
        logAudit(`Erro no upload ${type}: ${error.message}`, 'error');
        showToast(currentLang === 'pt' ? 'Erro ao processar ficheiros' : 'Error processing files', 'error');
    } finally {
        if (btn) {
            btn.classList.remove('processing');
            
            const buttonTexts = {
                dac7: `<i class="fas fa-file-contract"></i> SELECIONAR DAC7`,
                control: `<i class="fas fa-file-shield"></i> SELECIONAR CONTROLO`,
                saft: `<i class="fas fa-file-code"></i> SELECIONAR SAF-T`,
                invoice: `<i class="fas fa-file-invoice-dollar"></i> SELECIONAR FATURAS`,
                statement: `<i class="fas fa-file-contract"></i> SELECIONAR EXTRATOS`
            };
            
            btn.innerHTML = buttonTexts[type] || '<i class="fas fa-folder-open"></i> SELECIONAR';
        }
        
        event.target.value = '';
    }
}

async function processFile(file, type) {
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { 
            files: [], 
            parsedData: [], 
            hashes: {},
            totals: { records: 0, invoiceValue: 0, rendimentosBrutos: 0, comissaoApp: 0 }
        };
    }
    
    const text = await readFileAsText(file);
    
    const hashSHA256 = CryptoJS.SHA256(text).toString();
    
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hashSHA256;
    VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
    
    VDCSystem.analysis.evidenceIntegrity.push({
        filename: file.name,
        type: type,
        hash: hashSHA256,
        timestamp: new Date().toLocaleString(),
        size: file.size,
        timestampUnix: Math.floor(Date.now() / 1000)
    });
    
    let grossRevenue = 0;
    let platformFees = 0;
    let invoiceTotal = 0;
    
    // PROCESSAMENTO REAL DE FATURAS
    if (type === 'invoice' || type === 'invoices') {
        try {
            if (file.name.toLowerCase().endsWith('.csv')) {
                const papaParsed = Papa.parse(text, { 
                    header: true, 
                    skipEmptyLines: true, 
                    dynamicTyping: true 
                });
                
                if (papaParsed.data && papaParsed.data.length > 0) {
                    papaParsed.data.forEach(row => {
                        const keys = Object.keys(row);
                        keys.forEach(key => {
                            const val = toForensicNumber(row[key]);
                            const keyLower = key.toLowerCase();
                            
                            if (keyLower.includes('total') || 
                                keyLower.includes('amount') || 
                                keyLower.includes('value') ||
                                keyLower.includes('invoice') ||
                                keyLower.includes('fatura')) {
                                invoiceTotal += val;
                            }
                        });
                    });
                }
            } else {
                const extractedValue = extractMonetaryValue(text);
                if (extractedValue > 0) {
                    invoiceTotal = extractedValue;
                }
            }
            
            VDCSystem.documents.invoices.totals.invoiceValue = 
                (VDCSystem.documents.invoices.totals.invoiceValue || 0) + forensicRound(invoiceTotal);
            
            VDCSystem.analysis.extractedValues.faturaPlataforma = 
                VDCSystem.documents.invoices.totals.invoiceValue;
            
            logAudit(`Fatura processada: ${file.name} | Valor: ${formatCurrency(invoiceTotal)}`, 'success');
        } catch (e) {
            console.warn(`Erro ao processar fatura ${file.name}:`, e);
        }
    }
    
    // PROCESSAMENTO REAL DE EXTRATOS
    if (type === 'statement' || type === 'statements') {
        try {
            const papaParsed = Papa.parse(text, { 
                header: true, 
                skipEmptyLines: true, 
                dynamicTyping: true 
            });
            
            if (papaParsed.data && papaParsed.data.length > 0) {
                papaParsed.data.forEach(row => {
                    const keys = Object.keys(row);
                    
                    keys.forEach(key => {
                        const val = toForensicNumber(row[key]);
                        const keyLower = key.toLowerCase();
                        
                        if (keyLower.includes('total') || 
                            keyLower.includes('earnings') || 
                            keyLower.includes('gross') || 
                            keyLower.includes('payout') ||
                            keyLower.includes('rendimento')) {
                            grossRevenue += val;
                        }
                        
                        if (keyLower.includes('commission') || 
                            keyLower.includes('fee') || 
                            keyLower.includes('comissao') ||
                            keyLower.includes('service')) {
                            platformFees += Math.abs(val);
                        }
                    });
                });
                
                grossRevenue = forensicRound(grossRevenue);
                platformFees = forensicRound(platformFees);
                
                VDCSystem.documents.statements.totals.rendimentosBrutos = 
                    (VDCSystem.documents.statements.totals.rendimentosBrutos || 0) + grossRevenue;
                
                VDCSystem.documents.statements.totals.comissaoApp = 
                    (VDCSystem.documents.statements.totals.comissaoApp || 0) + platformFees;
                
                VDCSystem.analysis.extractedValues.rendimentosBrutos = 
                    VDCSystem.documents.statements.totals.rendimentosBrutos;
                
                VDCSystem.analysis.extractedValues.comissaoApp = 
                    -VDCSystem.documents.statements.totals.comissaoApp;
                
                VDCSystem.analysis.extractedValues.rendimentosLiquidos = 
                    forensicRound(VDCSystem.analysis.extractedValues.rendimentosBrutos + 
                                 VDCSystem.analysis.extractedValues.comissaoApp);
                
                logAudit(`Extrato processado: ${file.name} | Receita: ${formatCurrency(grossRevenue)} | Comissão: ${formatCurrency(platformFees)}`, 'info');
            }
        } catch (e) {
            console.warn(`Erro ao processar extrato ${file.name}:`, e);
            logAudit(`Falha no parsing do extrato: ${file.name}`, 'error');
        }
    }
    
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    
    if (listEl) {
        listEl.style.display = 'block';
        
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        item.innerHTML = `<i class="fas fa-check-circle" style="color: var(--success-primary);"></i>
                         <span class="file-name-modal">${file.name}</span>
                         <span class="file-status-modal">${formatBytes(file.size)}</span>
                         <span class="file-hash-modal">${hashSHA256.substring(0, 8)}...</span>`;
        listEl.appendChild(item);
    }
}

function extractMonetaryValue(text) {
    if (!text || typeof text !== 'string') return 0;
    
    let total = 0;
    
    const patterns = [
        /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€/g,
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*EUR/gi,
        /€\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
        /total[:\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/gi,
        /amount[:\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/gi
    ];
    
    for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        
        for (const match of matches) {
            let valueStr = match[1] || match[0];
            valueStr = valueStr.replace(/\./g, '').replace(',', '.');
            const value = parseFloat(valueStr);
            
            if (!isNaN(value) && value > 0 && value < 1000000) {
                total = forensicRound(total + value);
            }
        }
    }
    
    return total;
}

function clearAllEvidence() {
    if (!confirm(currentLang === 'pt' ? 
                 'Tem a certeza que deseja limpar todas as evidências?' : 
                 'Are you sure you want to clear all evidence?')) {
        return;
    }
    
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    
    types.forEach(key => {
        VDCSystem.documents[key] = { 
            files: [], 
            parsedData: [], 
            hashes: {},
            totals: { records: 0, invoiceValue: 0, rendimentosBrutos: 0, comissaoApp: 0 }
        };
    });
    
    VDCSystem.analysis.evidenceIntegrity = [];
    
    const listIds = ['dac7FileListModal', 'controlFileListModal', 'saftFileListModal', 
                     'invoicesFileListModal', 'statementsFileListModal'];
    
    listIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            el.style.display = 'none';
        }
    });
    
    VDCSystem.documents.invoices.totals.invoiceValue = 0;
    VDCSystem.documents.statements.totals.rendimentosBrutos = 0;
    VDCSystem.documents.statements.totals.comissaoApp = 0;
    
    VDCSystem.analysis.extractedValues.faturaPlataforma = 0;
    VDCSystem.analysis.extractedValues.rendimentosBrutos = 0;
    VDCSystem.analysis.extractedValues.comissaoApp = 0;
    VDCSystem.analysis.extractedValues.rendimentosLiquidos = 0;
    VDCSystem.analysis.extractedValues.diferencialCusto = 0;
    VDCSystem.analysis.extractedValues.iva23 = 0;
    VDCSystem.analysis.extractedValues.jurosMora = 0;
    VDCSystem.analysis.extractedValues.jurosCompensatorios = 0;
    
    VDCSystem.analysis.crossings.delta = 0;
    VDCSystem.analysis.crossings.bigDataAlertActive = false;
    VDCSystem.analysis.crossings.diferencialAlerta = false;
    VDCSystem.analysis.riskVerdict = null;
    
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    
    const bigDataAlert = document.getElementById('bigDataAlert');
    const verdictSection = document.getElementById('verdictSection');
    const jurosCard = document.getElementById('jurosCard');
    
    if (bigDataAlert) {
        bigDataAlert.style.display = 'none';
        bigDataAlert.classList.remove('alert-active');
    }
    if (verdictSection) verdictSection.style.display = 'none';
    if (jurosCard) jurosCard.style.display = 'none';
    
    logAudit(currentLang === 'pt' ? 'Todas as evidências foram limpas.' : 'All evidence cleared.', 'warn');
    showToast(currentLang === 'pt' ? 'Evidências limpas' : 'Evidence cleared', 'warning');
}

function updateEvidenceSummary() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    let totalFiles = 0;
    
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        totalFiles += count;
        
        const summaryId = `summary${type.charAt(0).toUpperCase() + type.slice(1)}`;
        const el = document.getElementById(summaryId);
        if (el) el.textContent = count;
    });
    
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = totalFiles;
}

function updateCounters() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    let total = 0;
    
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        total += count;
        
        let compactId = type;
        if (type === 'invoices') compactId = 'invoice';
        if (type === 'statements') compactId = 'statement';
        
        const el = document.getElementById(`${compactId}CountCompact`);
        if (el) el.textContent = count;
    });
    
    const evidenceBadges = document.querySelectorAll('.evidence-count-solid');
    evidenceBadges.forEach(el => {
        el.textContent = total;
    });
    
    VDCSystem.counts = VDCSystem.counts || {};
    VDCSystem.counts.total = total;
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (!btn) return;
    
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    
    btn.disabled = !(hasClient && hasControl && hasSaft);
    
    const pdfBtn = document.getElementById('exportPDFBtn');
    if (pdfBtn) {
        pdfBtn.disabled = !hasClient;
    }
}

// ============================================================================
// 9. MODO DEMO
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
    
    logAudit(currentLang === 'pt' ? 'ATIVANDO MODO DEMO CSI v12.0...' : 'ACTIVATING CSI DEMO MODE v12.0...', 'info');
    
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
            rendimentosLiquidos: forensicRound(6545.00),
            faturaPlataforma: forensicRound(250.00),
            diferencialCusto: forensicRound(1705.00),
            iva23: forensicRound(392.15),
            jurosMora: forensicRound(15.69),
            jurosCompensatorios: forensicRound(23.53),
            multaDolo: forensicRound(170.50),
            iva6: forensicRound(392.70),
            gross: 8500.00,
            commission: -1955.00,
            net: 6545.00
        };
        
        VDCSystem.analysis.crossings.delta = forensicRound(1705.00);
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        VDCSystem.analysis.crossings.bigDataAlertActive = true;
        
        performForensicCrossings(
            VDCSystem.analysis.extractedValues.rendimentosBrutos,
            VDCSystem.analysis.extractedValues.comissaoApp,
            VDCSystem.analysis.extractedValues.faturaPlataforma
        );
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit(currentLang === 'pt' ? 'Auditoria Demo CSI v12.0 concluída com discrepância de 1.705,00€.' : 'CSI Demo Audit v12.0 completed with discrepancy of 1.705,00€.', 'success');
        
        VDCSystem.processing = false;
        
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = `<i class="fas fa-vial"></i> ${translations[currentLang].navDemo}`;
        }
    }, 1500);
}

function simulateUpload(type, count) {
    for (let i = 0; i < count; i++) {
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { 
                files: [], 
                parsedData: [], 
                hashes: {},
                totals: { records: 0, invoiceValue: 0, rendimentosBrutos: 0, comissaoApp: 0 }
            };
        }
        
        const fileName = `demo_${type}_${i + 1}.${type === 'saft' ? 'xml' : 'csv'}`;
        VDCSystem.documents[type].files.push({ 
            name: fileName, 
            size: 1024 * (i + 1) 
        });
        
        VDCSystem.documents[type].totals.records = 
            (VDCSystem.documents[type].totals.records || 0) + 1;
        
        const demoHash = 'DEMO-' + CryptoJS.SHA256(Date.now().toString() + i).toString().substring(0, 8) + '...';
        
        VDCSystem.analysis.evidenceIntegrity.push({ 
            filename: fileName, 
            type: type, 
            hash: demoHash, 
            timestamp: new Date().toLocaleString(),
            size: 1024 * (i + 1),
            timestampUnix: Math.floor(Date.now() / 1000)
        });
        
        if (type === 'invoices') {
            const demoInvoiceValue = i === 0 ? 150.00 : 100.00;
            VDCSystem.documents.invoices.totals.invoiceValue = 
                (VDCSystem.documents.invoices.totals.invoiceValue || 0) + demoInvoiceValue;
            VDCSystem.analysis.extractedValues.faturaPlataforma = 
                VDCSystem.documents.invoices.totals.invoiceValue;
        }
        
        if (type === 'statements') {
            const demoGross = i === 0 ? 5000.00 : 3500.00;
            const demoCommission = i === 0 ? 1150.00 : 805.00;
            
            VDCSystem.documents.statements.totals.rendimentosBrutos = 
                (VDCSystem.documents.statements.totals.rendimentosBrutos || 0) + demoGross;
            
            VDCSystem.documents.statements.totals.comissaoApp = 
                (VDCSystem.documents.statements.totals.comissaoApp || 0) + demoCommission;
            
            VDCSystem.analysis.extractedValues.rendimentosBrutos = 
                VDCSystem.documents.statements.totals.rendimentosBrutos;
            
            VDCSystem.analysis.extractedValues.comissaoApp = 
                -VDCSystem.documents.statements.totals.comissaoApp;
            
            VDCSystem.analysis.extractedValues.rendimentosLiquidos = 
                VDCSystem.analysis.extractedValues.rendimentosBrutos + 
                VDCSystem.analysis.extractedValues.comissaoApp;
        }
    }
    
    updateCounters();
    updateEvidenceSummary();
}

// ============================================================================
// 10. MOTOR DE AUDITORIA · CÁLCULOS FORENSES COM forensicRound
// ============================================================================

function performAudit() {
    if (!VDCSystem.client) {
        showToast(currentLang === 'pt' ? 'Registe um cliente primeiro.' : 'Register client first.', 'error');
        return;
    }
    
    VDCSystem.forensicMetadata = getForensicMetadata();
    
    logAudit(currentLang === 'pt' ? 'INICIANDO ANÁLISE FORENSE CSI v12.0...' : 'INITIALIZING CSI FORENSIC ANALYSIS v12.0...', 'info');
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    }
    
    const chartWrapper = document.getElementById('chartWrapper');
    if (chartWrapper) chartWrapper.classList.add('scanning');
    
    setTimeout(() => {
        try {
            const stmtGross = VDCSystem.documents.statements?.totals?.rendimentosBrutos || 0;
            const stmtCommission = VDCSystem.documents.statements?.totals?.comissaoApp || 0;
            const invoiceVal = VDCSystem.documents.invoices?.totals?.invoiceValue || 0;
            
            const grossRevenue = VDCSystem.demoMode ? 
                VDCSystem.analysis.extractedValues.rendimentosBrutos : stmtGross;
            
            const platformCommission = VDCSystem.demoMode ? 
                VDCSystem.analysis.extractedValues.comissaoApp : -stmtCommission;
            
            const faturaPlataforma = VDCSystem.demoMode ? 
                VDCSystem.analysis.extractedValues.faturaPlataforma : invoiceVal;
            
            performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);
            
            updateDashboard();
            renderChart();
            showAlerts();
            
            logAudit(currentLang === 'pt' ? `ANÁLISE CONCLUÍDA. VEREDICTO: ${VDCSystem.analysis.riskVerdict.level}` : `ANALYSIS COMPLETED. VERDICT: ${VDCSystem.analysis.riskVerdict.level}`, 'success');
            
        } catch (error) {
            console.error('Erro na análise:', error);
            logAudit(`ERRO CRÍTICO: ${error.message}`, 'error');
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="fas fa-search-dollar"></i> ${translations[currentLang].btnAnalyze}`;
            }
            if (chartWrapper) chartWrapper.classList.remove('scanning');
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
    ev.taxaRegulacao = forensicRound(comissaoAbs * 0.05);
    ev.multaDolo = forensicRound(diferencial * 0.10);
    
    const netValue = ev.rendimentosBrutos + ev.comissaoApp;
    ev.iva6 = forensicRound(netValue * 0.06);
    
    if (diferencial > 0.01) {
        cross.diferencialAlerta = true;
        cross.bigDataAlertActive = true;
    } else {
        cross.diferencialAlerta = false;
        cross.bigDataAlertActive = false;
    }
    
    VDCSystem.analysis.riskVerdict = getRiskVerdict(diferencial, ev.rendimentosBrutos);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    
    const netValue = ev.rendimentosBrutos + ev.comissaoApp;
    
    setElementText('netVal', formatCurrency(netValue));
    setElementText('commissionVal', formatCurrency(ev.comissaoApp));
    setElementText('deltaVal', formatCurrency(ev.diferencialCusto));
    setElementText('jurosVal', formatCurrency(ev.jurosMora));
    
    setElementText('kpiGanhos', formatCurrency(ev.rendimentosBrutos));
    setElementText('kpiComm', formatCurrency(ev.comissaoApp));
    setElementText('kpiNet', formatCurrency(netValue));
    setElementText('kpiInvoice', formatCurrency(ev.faturaPlataforma));
    
    const jurosCard = document.getElementById('jurosCard');
    if (jurosCard) {
        if (ev.jurosMora > 0) {
            jurosCard.style.display = 'block';
        } else {
            jurosCard.style.display = 'none';
        }
    }
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    const verdictSection = document.getElementById('verdictSection');
    if (verdictSection && VDCSystem.analysis.riskVerdict) {
        verdictSection.style.display = 'block';
        verdictSection.className = `verdict-display active ${VDCSystem.analysis.riskVerdict.className}`;
        
        setElementText('verdictLevel', VDCSystem.analysis.riskVerdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.riskVerdict.description);
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
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
    }
    
    const ev = VDCSystem.analysis.extractedValues;
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Discrepância'],
            datasets: [{
                label: 'Valores (€)',
                data: [
                    ev.rendimentosBrutos, 
                    Math.abs(ev.comissaoApp), 
                    ev.rendimentosBrutos + ev.comissaoApp, 
                    ev.faturaPlataforma, 
                    ev.diferencialCusto
                ],
                backgroundColor: [
                    'rgba(0, 102, 204, 0.8)',
                    'rgba(255, 159, 26, 0.8)',
                    'rgba(0, 204, 136, 0.8)',
                    'rgba(108, 92, 231, 0.8)',
                    'rgba(232, 65, 24, 0.8)'
                ],
                borderColor: [
                    '#0066cc',
                    '#ff9f1a',
                    '#00cc88',
                    '#6c5ce7',
                    '#e84118'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: '#b8c6e0',
                        callback: (value) => value + '€'
                    }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#b8c6e0' }
                }
            }
        }
    });
}

// ============================================================================
// 11. EXPORTAÇÕES · JSON E PDF COM FUNDAMENTOS LEGAIS (VERSÃO CORRIGIDA)
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `VDC_FORENSIC_${VDCSystem.sessionId}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    
    logAudit(currentLang === 'pt' ? 'Relatório JSON exportado.' : 'JSON Report exported.', 'success');
    showToast(currentLang === 'pt' ? 'JSON exportado' : 'JSON exported', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast(currentLang === 'pt' ? 'Sem cliente para gerar relatório.' : 'No client for report.', 'error');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        logAudit('Erro: jsPDF não carregado.', 'error');
        showToast('Erro de sistema (jsPDF)', 'error');
        return;
    }
    
    logAudit(currentLang === 'pt' ? 'Gerando PDF Jurídico (fundamentos legais)...' : 'Generating Legal PDF (legal basis)...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const t = translations[currentLang];
        const ev = VDCSystem.analysis.extractedValues;
        const meta = VDCSystem.forensicMetadata || getForensicMetadata();
        const verdict = VDCSystem.analysis.riskVerdict || { 
            level: 'N/A', 
            color: '#000000', 
            description: 'Análise não executada.',
            className: ''
        };
        
        let y = 20;
        const left = 15;
        const right = 195;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Função auxiliar para adicionar texto com quebra de linha
        const addWrappedText = (text, x, yPos, maxWidth = 170) => {
            try {
                if (!text) return 0;
                const split = doc.splitTextToSize(text.toString(), maxWidth);
                doc.text(split, x, yPos);
                return split.length * 5;
            } catch(e) {
                console.warn('Erro ao adicionar texto:', e);
                return 0;
            }
        };
        
        // Função para adicionar marca de água
        const addWatermark = () => {
            doc.saveGraphicsState();
            doc.setTextColor(220, 220, 220);
            doc.setFontSize(40);
            doc.setFont('helvetica', 'bold');
            doc.text('CÓPIA CONTROLADA', pageWidth / 2, pageHeight / 2, { 
                align: 'center', 
                angle: 45,
                renderingMode: 'fill'
            });
            doc.restoreGraphicsState();
        };
        
        // Função para verificar quebra de página
        const checkPageBreak = (neededSpace) => {
            if (y + neededSpace >= pageHeight - 20) {
                doc.addPage();
                y = 20;
                addWatermark();
                return true;
            }
            return false;
        };
        
        // Função para adicionar rodapé (DEFINIDA ANTES DE SER USADA)
        const addFooter = (currentDoc, translation, pWidth, pHeight) => {
            const pageCount = currentDoc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                currentDoc.setPage(i);
                currentDoc.setDrawColor(200, 200, 200);
                currentDoc.line(10, pHeight - 15, pWidth - 10, pHeight - 15);
                currentDoc.setFontSize(6);
                currentDoc.setTextColor(100, 100, 100);
                currentDoc.text(VDCSystem.masterHash ? VDCSystem.masterHash.substring(0, 24) + '...' : 'HASH NÃO GERADA', 10, pHeight - 10);
                currentDoc.setFontSize(7);
                currentDoc.setTextColor(120, 120, 120);
                currentDoc.text(translation.pdfFooter || 'VDC Systems International', pWidth / 2, pHeight - 10, { align: 'center' });
            }
        };
        
        // Cabeçalho
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setFontSize(18);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(t.pdfTitle || 'PARECER PERICIAL', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text(`Session: ${VDCSystem.sessionId || 'N/A'}`, left, 30);
        doc.text(`Date: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, left, 36);
        doc.text(`Unix Timestamp: ${meta.timestampUnix || Math.floor(Date.now() / 1000)}`, left, 42);
        
        doc.setDrawColor(100, 100, 100);
        doc.line(left, 45, right, 45);
        
        y = 52;
        
        // Seção 1: Metadados
        checkPageBreak(40);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(t.pdfSection1 || '1. IDENTIFICAÇÃO', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`${t.pdfLabelName || 'Nome'}: ${VDCSystem.client.name || 'N/A'}`, left + 5, y);
        y += 5;
        doc.text(`${t.pdfLabelNIF || 'NIF'}: ${VDCSystem.client.nif || 'N/A'}`, left + 5, y);
        y += 5;
        doc.text(`User Agent: ${meta.userAgent ? meta.userAgent.substring(0, 60) : 'N/A'}...`, left + 5, y);
        y += 5;
        doc.text(`Timezone: ${meta.timezone || 'N/A'} | IP Simulado: ${meta.ipSimulated || 'N/A'}`, left + 5, y);
        y += 10;
        doc.line(left, y, right, y);
        y += 8;
        
        // Seção 2: Análise Financeira
        checkPageBreak(60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(t.pdfSection2 || '2. ANÁLISE FINANCEIRA', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`${t.pdfLabelGross || 'Bruto'}: ${formatCurrency(ev.rendimentosBrutos || 0)}`, left + 5, y);
        y += 6;
        doc.text(`${t.pdfLabelComm || 'Comissão'}: ${formatCurrency(Math.abs(ev.comissaoApp || 0))}`, left + 5, y);
        y += 6;
        doc.text(`${t.pdfLabelInv || 'Fatura'}: ${formatCurrency(ev.faturaPlataforma || 0)}`, left + 5, y);
        y += 8;
        
        if ((ev.diferencialCusto || 0) > 0.01) {
            doc.setTextColor(200, 50, 50);
            doc.setFont('helvetica', 'bold');
            doc.text(`${t.pdfLabelDiff || 'Discrepância'}: ${formatCurrency(ev.diferencialCusto || 0)}`, left + 5, y);
            y += 8;
            
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text(`${t.pdfLabelIVA23 || 'IVA 23%'}: ${formatCurrency(ev.iva23 || 0)}`, left + 5, y);
            y += 6;
            doc.text(`${t.pdfLabelJuros || 'Juros'}: ${formatCurrency(ev.jurosMora || 0)}`, left + 5, y);
            y += 6;
            doc.text(`${t.pdfLabelComp || 'Juros Compensatórios'}: ${formatCurrency(ev.jurosCompensatorios || 0)}`, left + 5, y);
            y += 6;
            doc.text(`${t.pdfLabelMulta || 'Multa'}: ${formatCurrency(ev.multaDolo || 0)}`, left + 5, y);
            y += 8;
        }
        
        doc.line(left, y, right, y);
        y += 8;
        
        // Seção 3: Veredicto de Risco
        checkPageBreak(30);
        doc.setFillColor(240, 240, 240);
        doc.rect(left, y - 3, pageWidth - 30, 30, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(t.pdfRiskVerdict || 'VEREDICTO', left + 2, y + 2);
        
        doc.setFontSize(14);
        doc.setTextColor(verdict.color);
        doc.text(verdict.level, left + 2, y + 12);
        y += 25;
        
        // Seção 4: Fundamentos Legais
        checkPageBreak(30);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(t.pdfLegalTitle || 'FUNDAMENTAÇÃO LEGAL', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('• ' + (t.pdfLegalRGIT || 'Art. 114.º RGIT'), left + 5, y);
        y += 5;
        doc.text('• ' + (t.pdfLegalLGT || 'Art. 35.º LGT'), left + 5, y);
        y += 5;
        doc.text('• ' + (t.pdfLegalISO || 'ISO/IEC 27037'), left + 5, y);
        y += 8;
        doc.line(left, y, right, y);
        y += 8;
        
        // Seção 5: Conclusões
        checkPageBreak(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(t.pdfSection4 || '4. CONCLUSÕES', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        y += addWrappedText(t.pdfConclusionText || 'Conclusão não disponível.', left + 5, y, 170);
        y += 8;
        doc.line(left, y, right, y);
        y += 8;
        
        // Seção 6: Cadeia de Custódia
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(t.pdfSection5 || '5. CADEIA DE CUSTÓDIA', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        doc.setFillColor(30, 42, 68);
        doc.rect(left, y, pageWidth - 30, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text("Ficheiro", left + 2, y + 5);
        doc.text("Hash SHA-256", left + 70, y + 5);
        doc.setTextColor(0, 0, 0);
        y += 10;
        
        if (VDCSystem.analysis.evidenceIntegrity && VDCSystem.analysis.evidenceIntegrity.length > 0) {
            const evidenceToShow = VDCSystem.analysis.evidenceIntegrity.slice(-5);
            
            evidenceToShow.forEach(item => {
                if (y > 260) {
                    doc.addPage();
                    y = 20;
                    addWatermark();
                }
                
                doc.text(item.filename ? (item.filename.substring(0, 25) + (item.filename.length > 25 ? '...' : '')) : 'N/A', left + 2, y);
                doc.setFontSize(6.5);
                doc.text(item.hash ? item.hash.substring(0, 24) + '...' : 'N/A', left + 70, y);
                doc.setFontSize(8);
                y += 6;
            });
        } else {
            doc.text('Nenhuma evidência carregada.', left + 5, y);
            y += 6;
        }
        
        y += 4;
        doc.line(left, y, right, y);
        y += 8;
        
        // Seção 7: Interrogatório Estratégico
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(t.pdfSection6 || '6. INTERROGATÓRIO', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const questionsToShow = t.pdfQuestions ? t.pdfQuestions.slice(0, 3) : [];
        questionsToShow.forEach(q => {
            if (y > 260) {
                doc.addPage();
                y = 20;
                addWatermark();
            }
            y += addWrappedText(q, left + 5, y, 170);
            y += 2;
        });
        
        y += 6;
        doc.line(left, y, right, y);
        y += 8;
        
        // Seção 8: Assinatura
        checkPageBreak(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(t.pdfSection7 || '7. ASSINATURA', left, y);
        y += 8;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Perito: VDC Forensic System ${VDCSystem.version || 'v12.0'}`, left + 5, y);
        y += 6;
        doc.text(`Data: ${new Date().toLocaleDateString()}`, left + 5, y);
        y += 6;
        
        const masterHash = VDCSystem.masterHash || generateMasterHash();
        doc.text(`Assinatura Digital: ${masterHash.substring(0, 16)}...`, left + 5, y);
        
        // Adicionar marca de água em todas as páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addWatermark();
        }
        
        // Adicionar rodapé em todas as páginas
        addFooter(doc, t, pageWidth, pageHeight);
        
        // Salvar o PDF
        doc.save(`Parecer_Pericial_${VDCSystem.sessionId || 'NOVA_SESSAO'}.pdf`);
        
        logAudit('PDF gerado com fundamentos legais e cadeia de custódia.', 'success');
        showToast(currentLang === 'pt' ? 'PDF gerado com sucesso' : 'PDF generated successfully', 'success');
        
    } catch (e) {
        console.error('Erro fatal ao gerar PDF:', e);
        logAudit(`Erro fatal no PDF: ${e.message}`, 'error');
        showToast(currentLang === 'pt' ? 'Erro fatal ao gerar PDF' : 'Fatal error generating PDF', 'error');
    }
}

// ============================================================================
// 12. FUNÇÕES DE SISTEMA
// ============================================================================

function generateMasterHash() {
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + 
                    VDCSystem.sessionId + 
                    Date.now() + 
                    (VDCSystem.client ? VDCSystem.client.nif : '');
    
    const hash = CryptoJS.SHA256(payload).toString();
    setElementText('masterHashValue', hash);
    
    VDCSystem.masterHash = hash;
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
    
    VDCSystem.logs.push({ time, msg, type, timestamp: Date.now() });
    if (VDCSystem.logs.length > 100) VDCSystem.logs.shift();
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    
    VDCSystem.logs = [];
    logAudit(currentLang === 'pt' ? 'Console limpo.' : 'Console cleared.', 'info');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const icon = iconMap[type] || 'fa-info-circle';
    
    toast.innerHTML = `<i class="fas ${icon}"></i> <p>${message}</p>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function resetSystem() {
    if (!confirm(currentLang === 'pt' ? 
                 'Tem a certeza que deseja reiniciar o sistema?' : 
                 'Are you sure you want to reset the system?')) {
        return;
    }
    
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data_bd_v12_0');
    
    VDCSystem.analysis.extractedValues = {
        gross: 0, commission: 0, net: 0,
        iva6: 0, iva23: 0, jurosMora: 0, jurosCompensatorios: 0,
        taxaRegulacao: 0, multaDolo: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
        faturaPlataforma: 0, diferencialCusto: 0,
        campanhas: 0, gorjetas: 0, portagens: 0
    };
    
    VDCSystem.analysis.crossings = {
        delta: 0, omission: 0,
        diferencialAlerta: false,
        bigDataAlertActive: false,
        shadowAlertActive: false
    };
    
    VDCSystem.analysis.riskVerdict = null;
    VDCSystem.demoMode = false;
    VDCSystem.forensicMetadata = null;
    
    const statusEl = document.getElementById('clientStatusFixed');
    if (statusEl) statusEl.style.display = 'none';
    
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    
    if (nameInput) {
        nameInput.value = '';
        nameInput.classList.remove('success', 'error');
    }
    
    if (nifInput) {
        nifInput.value = '';
        nifInput.classList.remove('success', 'error');
    }
    
    clearAllEvidence();
    clearConsole();
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
        VDCSystem.chart = null;
    }
    
    const ids = ['netVal', 'commissionVal', 'deltaVal', 'jurosVal',
                 'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice'];
    
    ids.forEach(id => {
        setElementText(id, '0,00€');
    });
    
    const verdictSection = document.getElementById('verdictSection');
    if (verdictSection) verdictSection.style.display = 'none';
    
    generateMasterHash();
    
    logAudit(currentLang === 'pt' ? 'Sistema reiniciado com sucesso.' : 'System reset successfully.', 'success');
    showToast(currentLang === 'pt' ? 'Sistema reiniciado' : 'System reset', 'success');
}

// ============================================================================
// 13. BINDING GLOBAL
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
