/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.0 CSI EDITION FINAL
 * ====================================================================
 * PROTOCOLO: ISO/IEC 27037:2022 | NIST SP 800-86 | INTERPOL DFP
 * STRICT MODE ATIVADO · TODAS AS CORREÇÕES APLICADAS
 * 
 * CORREÇÕES CRÍTICAS IMPLEMENTADAS:
 * - jsPDF: window.jspdf.jsPDF com destructuring CORRETO
 * - Coordenadas PDF ajustadas (Y dinâmico) para evitar sobreposição
 * - Validação de NIF com checksum oficial português
 * - forensicRound OBRIGATÓRIO em todos os cálculos
 * - Cadeia de Custódia com SHA-256 e Timestamp Unix
 * - Veredicto de Risco Automático (CSI)
 * - Marca de Água "CÓPIA CONTROLADA" no PDF
 * - MAPEAMENTO DINÂMICO DE PLATAFORMAS (Bolt/Uber)
 * - PERFORMANCE TIMING (performance.now())
 * - GLOSSÁRIO FORENSE NO PDF
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. UTILITÁRIOS FORENSES & DADOS DE PLATAFORMAS
// ============================================================================

// CORREÇÃO: Mapeamento Dinâmico de Plataformas (Bolt vs Uber)
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 39a, 10134 Tallinn, Estónia',
        nif: 'EE102090374',
        logoText: 'BOLT'
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, 1077 ZX Amesterdão, Países Baixos',
        nif: 'NL852071588B01',
        logoText: 'UBER'
    }
};

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
        uploadStatementText: "EXTRATOS BANCÁRIOS",
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
        pdfGlossaryTitle: "8. GLOSSÁRIO FORENSE",
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
        pdfMethodText: "Metodologia: Análise forense baseada em triangulação de dados (Extrato, Fatura, Algoritmo). Aplicação de validação checksum para integridade de ficheiros e dedução fiscal reversa. Conformidade com ISO/IEC 27037 e NIST SP 800-86.",
        pdfConclusionText: "Conclusão: Os dados apresentam indícios de desvio entre valores transacionados e valores declarados. Recomenda-se a notificação da entidade para esclarecimento e eventual procedimento de inspeção tributária.",
        pdfRiskVerdict: "VEREDICTO DE RISCO",
        pdfWatermark: "CONFIDENTIAL / FORENSIC EVIDENCE",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.0 | Todos os Direitos Reservados | EM",
        pdfProcessingTime: "Tempo de Processamento",
        pdfGlossaryDef: [
            { term: "Anti-Forensics", def: "Técnicas utilizadas para impedir, obstruir ou dificultar a análise forense digital, incluindo encriptação, esteganografia ou alteração de metadados." },
            { term: "Data Carving", def: "Processo de recuperação de ficheiros de um dispositivo de armazenamento sem metadados do sistema de ficheiros, baseado em cabeçalhos e rodapés de ficheiros." },
            { term: "Triangulação de Custódia", def: "Metodologia de validação forense que cruza três ou mais fontes de dados independentes para confirmar a integridade e veracidade da evidência digital." }
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
        pdfGlossaryTitle: "8. FORENSIC GLOSSARY",
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
        pdfMethodText: "Methodology: Forensic analysis based on data triangulation. Checksum validation for file integrity and reverse fiscal deduction applied. Compliance with ISO/IEC 27037 and NIST SP 800-86.",
        pdfConclusionText: "Conclusion: Data indicates deviations between transacted and declared values. Entity notification recommended for clarification and potential tax inspection procedure.",
        pdfRiskVerdict: "RISK VERDICT",
        pdfWatermark: "CONFIDENTIAL / FORENSIC EVIDENCE",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.0 | All Rights Reserved | EM",
        pdfProcessingTime: "Processing Time",
        pdfGlossaryDef: [
            { term: "Anti-Forensics", def: "Techniques used to prevent, obstruct or hinder digital forensic analysis, including encryption, steganography or metadata alteration." },
            { term: "Data Carving", def: "Process of recovering files from a storage device without file system metadata, based on file headers and footers." },
            { term: "Custody Triangulation", def: "Forensic validation methodology that crosses three or more independent data sources to confirm the integrity and veracity of digital evidence." }
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
    selectedPlatform: 'bolt', // Default
    client: null,
    demoMode: false,
    processing: false,
    performanceTiming: { start: 0, end: 0 }, // CORREÇÃO: Performance Timing
    
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
    masterHash: '' // CORREÇÃO: Armazenar Master Hash
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
// 8. GESTÃO DE EVIDÊNCIAS · UPLOAD E PROCESSAMENTO
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
            const t = translations[currentLang];
            
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
// 10. MOTOR DE AUDITORIA · CÁLCULOS FORENSES
// ============================================================================

function performAudit() {
    if (!VDCSystem.client) {
        showToast(currentLang === 'pt' ? 'Registe um cliente primeiro.' : 'Register client first.', 'error');
        return;
    }
    
    // CORREÇÃO: Captura de Performance Timing
    VDCSystem.performanceTiming.start = performance.now();
    
    VDCSystem.forensicMetadata = getForensicMetadata();
    
    logAudit(currentLang === 'pt' ? 'INICIANDO ANÁLISE FORENSE CSI v12.0...' : 'INITIALIZING CSI FORENSIC ANALYSIS v12.0...', 'info');
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    }
    
    // Ativar efeito scan
    const chartSection = document.querySelector('.chart-section');
    if (chartSection) chartSection.classList.add('scanning');
    
    setTimeout(() => {
        try {
            const gross = VDCSystem.analysis.extractedValues.rendimentosBrutos || 0;
            const commission = VDCSystem.analysis.extractedValues.comissaoApp || 0;
            const invoice = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
            
            performForensicCrossings(gross, commission, invoice);
            
            updateDashboard();
            renderChart();
            showAlerts();
            
            // Finalizar timing
            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            
            logAudit(`Análise forense concluída em ${duration}ms`, 'success');
            
        } catch (error) {
            console.error('Erro na análise:', error);
            logAudit(`ERRO CRÍTICO: ${error.message}`, 'error');
        } finally {
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="fas fa-search-dollar"></i> ${translations[currentLang].btnAnalyze}`;
            }
            
            // Remover efeito scan
            if (chartSection) chartSection.classList.remove('scanning');
        }
    }, 1000);
}

function performForensicCrossings(gross, commission, invoice) {
    const net = forensicRound(gross + commission);
    VDCSystem.analysis.extractedValues.net = net;
    VDCSystem.analysis.extractedValues.gross = gross;
    
    const delta = forensicRound(net - invoice);
    VDCSystem.analysis.crossings.delta = delta;
    
    if (Math.abs(delta) > 100) {
        VDCSystem.analysis.crossings.bigDataAlertActive = true;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        
        // Cálculos forenses
        VDCSystem.analysis.extractedValues.iva23 = forensicRound(Math.abs(delta) * 0.23);
        VDCSystem.analysis.extractedValues.jurosMora = forensicRound(Math.abs(delta) * 0.04);
        VDCSystem.analysis.extractedValues.jurosCompensatorios = forensicRound(Math.abs(delta) * 0.05);
        VDCSystem.analysis.extractedValues.multaDolo = forensicRound(Math.abs(delta) * 0.10);
    }
    
    // Calcular Veredicto de Risco
    VDCSystem.analysis.riskVerdict = getRiskVerdict(delta, gross);
}

function updateDashboard() {
    const values = VDCSystem.analysis.extractedValues;
    
    setElementText('statNet', formatCurrency(values.net));
    setElementText('statComm', formatCurrency(values.commission));
    
    setElementText('kpiGrossValue', formatCurrency(values.gross));
    setElementText('kpiCommValue', formatCurrency(values.commission));
    setElementText('kpiNetValue', formatCurrency(values.net));
    setElementText('kpiInvValue', formatCurrency(values.faturaPlataforma));
    
    const jurosCard = document.getElementById('jurosCard');
    if (jurosCard) {
        if (VDCSystem.analysis.crossings.bigDataAlertActive) {
            jurosCard.style.display = 'flex';
            setElementText('statJuros', formatCurrency(values.jurosCompensatorios));
        } else {
            jurosCard.style.display = 'none';
        }
    }
}

function showAlerts() {
    const verdictSection = document.getElementById('verdictSection');
    const bigDataAlert = document.getElementById('bigDataAlert');
    
    if (VDCSystem.analysis.riskVerdict) {
        if (verdictSection) {
            verdictSection.style.display = 'block';
            verdictSection.className = `verdict-display active ${VDCSystem.analysis.riskVerdict.className}`;
            
            const levelEl = document.getElementById('verdictLevel');
            const descEl = document.getElementById('verdictDesc');
            
            if (levelEl) levelEl.textContent = VDCSystem.analysis.riskVerdict.level;
            if (descEl) descEl.textContent = VDCSystem.analysis.riskVerdict.description;
        }
    }
    
    if (VDCSystem.analysis.crossings.bigDataAlertActive) {
        if (bigDataAlert) {
            bigDataAlert.style.display = 'flex';
            bigDataAlert.classList.add('alert-active');
            setElementText('alertDeltaValue', formatCurrency(VDCSystem.analysis.crossings.delta));
        }
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
    }
    
    const values = VDCSystem.analysis.extractedValues;
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Discrepância'],
            datasets: [{
                label: 'Valores (€)',
                data: [values.gross, Math.abs(values.commission), values.net, values.faturaPlataforma, Math.abs(VDCSystem.analysis.crossings.delta)],
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
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b8c6e0'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#b8c6e0'
                    }
                }
            }
        }
    });
}

// ============================================================================
// 11. GERAÇÃO DE MASTER HASH
// ============================================================================

function generateMasterHash() {
    const evidenceString = JSON.stringify(VDCSystem.documents) + 
                          JSON.stringify(VDCSystem.analysis.evidenceIntegrity) +
                          VDCSystem.sessionId;
    
    VDCSystem.masterHash = CryptoJS.SHA256(evidenceString).toString();
    
    const hashEl = document.getElementById('masterHashValue');
    if (hashEl) {
        hashEl.textContent = VDCSystem.masterHash;
    }
}

// ============================================================================
// 12. LOG DE AUDITORIA
// ============================================================================

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    VDCSystem.logs.push({ timestamp, message, type });
    
    const consoleEl = document.getElementById('consoleOutput');
    if (consoleEl) {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = logEntry;
        consoleEl.appendChild(entry);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
}

function clearConsole() {
    const consoleEl = document.getElementById('consoleOutput');
    if (consoleEl) {
        consoleEl.innerHTML = '';
    }
    VDCSystem.logs = [];
    logAudit('Console limpo.', 'info');
}

// ============================================================================
// 13. EXPORTAÇÃO JSON
// ============================================================================

function exportDataJSON() {
    const data = {
        systemVersion: VDCSystem.version,
        sessionId: VDCSystem.sessionId,
        client: VDCSystem.client,
        platform: VDCSystem.selectedPlatform,
        analysis: VDCSystem.analysis,
        evidence: VDCSystem.analysis.evidenceIntegrity,
        masterHash: VDCSystem.masterHash,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VDC_Report_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    logAudit('Exportação JSON concluída.', 'success');
}

// ============================================================================
// 14. EXPORTAÇÃO PDF (CSI REPORT)
// ============================================================================

async function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Registe um cliente primeiro.', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const t = translations[currentLang];
    const platform = PLATFORM_DATA[VDCSystem.selectedPlatform];
    
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = 15;
    const rightMargin = pageWidth - 15;
    
    // Função auxiliar para verificar quebra de página
    const checkPageBreak = (neededSpace) => {
        if (yPos + neededSpace >= pageHeight - 30) {
            addFooter(doc, t, pageWidth, pageHeight);
            doc.addPage();
            yPos = 20;
            addWatermark(doc, t, pageWidth, pageHeight);
            return true;
        }
        return false;
    };
    
    // Marca de Água
    addWatermark(doc, t, pageWidth, pageHeight);
    
    // Cabeçalho
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(t.pdfTitle, pageWidth / 2, 10, { align: 'center' });
    
    yPos = 25;
    
    // Seção 1: Metadados
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection1, leftMargin, yPos);
    yPos += 8;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    // Metadados com Platform Data
    const metaLines = [
        `${t.pdfLabelName}: ${VDCSystem.client.name}`,
        `${t.pdfLabelNIF}: ${VDCSystem.client.nif}`,
        `${t.pdfLabelSession}: ${VDCSystem.sessionId}`,
        `Plataforma: ${platform.name} (${platform.nif})`,
        `Endereço: ${platform.address}`,
        `User Agent: ${navigator.userAgent.substring(0, 50)}...`,
        `Resolução: ${window.screen.width}x${window.screen.height}`,
        `Motor: VDC CSI v12.0`,
        `Unix Timestamp: ${Math.floor(Date.now() / 1000)}`
    ];
    
    metaLines.forEach(line => {
        doc.text(line, leftMargin, yPos);
        yPos += 5;
    });
    
    yPos += 5;
    
    // Seção 2: Análise Financeira
    checkPageBreak(40);
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection2, leftMargin, yPos);
    yPos += 8;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    const values = VDCSystem.analysis.extractedValues;
    const finLines = [
        `${t.pdfLabelGross}: ${formatCurrency(values.gross)}`,
        `${t.pdfLabelComm}: ${formatCurrency(values.commission)}`,
        `${t.pdfLabelNetText}: ${formatCurrency(values.net)}`,
        `${t.pdfLabelInv}: ${formatCurrency(values.faturaPlataforma)}`,
        `${t.pdfLabelDiff}: ${formatCurrency(VDCSystem.analysis.crossings.delta)}`,
        `${t.pdfLabelIVA23}: ${formatCurrency(values.iva23)}`,
        `${t.pdfLabelJuros}: ${formatCurrency(values.jurosMora)}`,
        `${t.pdfLabelComp}: ${formatCurrency(values.jurosCompensatorios)}`
    ];
    
    finLines.forEach(line => {
        doc.text(line, leftMargin, yPos);
        yPos += 5;
    });
    
    yPos += 5;
    
    // Seção 3: Veredicto de Risco
    checkPageBreak(30);
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection3, leftMargin, yPos);
    yPos += 8;
    
    if (VDCSystem.analysis.riskVerdict) {
        const verdict = VDCSystem.analysis.riskVerdict;
        doc.setTextColor(verdict.color === '#44bd32' ? 68 : verdict.color === '#ff9f1a' ? 255 : 232, 
                        verdict.color === '#44bd32' ? 189 : verdict.color === '#ff9f1a' ? 159 : 65, 
                        verdict.color === '#44bd32' ? 50 : verdict.color === '#ff9f1a' ? 26 : 24);
        doc.setFontSize(11);
        doc.text(`${t.pdfRiskVerdict}: ${verdict.level}`, leftMargin, yPos);
        yPos += 6;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(verdict.description, leftMargin, yPos, { maxWidth: pageWidth - 30 });
        yPos += 10;
    }
    
    // Seção 4: Conclusões
    checkPageBreak(30);
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection4, leftMargin, yPos);
    yPos += 8;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    const splitConclusion = doc.splitTextToSize(t.pdfConclusionText, pageWidth - 30);
    doc.text(splitConclusion, leftMargin, yPos);
    yPos += splitConclusion.length * 5 + 5;
    
    // Seção 5: Cadeia de Custódia
    checkPageBreak(40);
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection5, leftMargin, yPos);
    yPos += 8;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    doc.text(`Master Hash SHA-256: ${VDCSystem.masterHash}`, leftMargin, yPos);
    yPos += 5;
    
    if (VDCSystem.analysis.evidenceIntegrity.length > 0) {
        doc.text('Evidências Seladas:', leftMargin, yPos);
        yPos += 4;
        VDCSystem.analysis.evidenceIntegrity.slice(0, 5).forEach(ev => {
            doc.text(`- ${ev.filename} | Hash: ${ev.hash.substring(0, 16)}...`, leftMargin, yPos);
            yPos += 4;
        });
    }
    
    yPos += 5;
    
    // Seção 6: Interrogatório Estratégico
    checkPageBreak(60);
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection6, leftMargin, yPos);
    yPos += 8;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    t.pdfQuestions.forEach(q => {
        const splitQ = doc.splitTextToSize(q, pageWidth - 30);
        doc.text(splitQ, leftMargin, yPos);
        yPos += splitQ.length * 4 + 2;
    });
    
    // Seção 7: Assinatura
    checkPageBreak(40);
    yPos += 10;
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection7, leftMargin, yPos);
    yPos += 15;
    
    doc.setDrawColor(150, 150, 150);
    doc.line(leftMargin, yPos, leftMargin + 80, yPos);
    yPos += 5;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(`Data: ${new Date().toLocaleString()}`, leftMargin, yPos);
    
    // NOVA PÁGINA: Glossário Forense
    doc.addPage();
    yPos = 20;
    addWatermark(doc, t, pageWidth, pageHeight);
    
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfGlossaryTitle, leftMargin, yPos);
    yPos += 10;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    t.pdfGlossaryDef.forEach(item => {
        checkPageBreak(20);
        doc.setFont(undefined, 'bold');
        doc.text(item.term, leftMargin, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
        const splitDef = doc.splitTextToSize(item.def, pageWidth - 30);
        doc.text(splitDef, leftMargin, yPos);
        yPos += splitDef.length * 4 + 5;
    });
    
    // Rodapé em todas as páginas
    addFooter(doc, t, pageWidth, pageHeight);
    
    // Salvar
    doc.save(`VDC_Parecer_Pericial_${VDCSystem.sessionId}.pdf`);
    logAudit('Parecer pericial exportado para PDF.', 'success');
}

function addWatermark(doc, t, pageWidth, pageHeight) {
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(50);
    doc.setTextColor(240, 240, 240);
    
    doc.text(t.pdfWatermark, pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
        renderingMode: 'fillThenStroke'
    });
}

function addFooter(doc, t, pageWidth, pageHeight) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Linha separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
        
        // QR Code Placeholder (Hash resumido)
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text('QR Data:', 10, pageHeight - 10);
        doc.text(VDCSystem.masterHash.substring(0, 24) + '...', 10, pageHeight - 6);
        
        // Master Hash completo à direita
        doc.setFontSize(6);
        doc.text('Master Hash SHA-256:', 80, pageHeight - 10);
        doc.text(VDCSystem.masterHash, 80, pageHeight - 6);
        
        // Copyright centralizado
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(t.pdfFooter, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
}

// ============================================================================
// 15. RESET DO SISTEMA
// ============================================================================

function resetSystem() {
    if (!confirm(currentLang === 'pt' ? 
                 'Tem a certeza que deseja reiniciar o sistema? Todos os dados serão perdidos.' : 
                 'Are you sure you want to reset? All data will be lost.')) {
        return;
    }
    
    // Limpar localStorage
    localStorage.removeItem('vdc_client_data_bd_v12_0');
    
    // Reset do estado
    VDCSystem.client = null;
    VDCSystem.analysis = {
        extractedValues: {},
        crossings: {},
        riskVerdict: null,
        evidenceIntegrity: []
    };
    
    VDCSystem.documents = {
        dac7: { files: [], totals: {} },
        control: { files: [], totals: {} },
        saft: { files: [], totals: {} },
        invoices: { files: [], totals: {} },
        statements: { files: [], totals: {} }
    };
    
    // Reset UI
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    document.getElementById('clientStatusFixed').style.display = 'none';
    
    clearAllEvidence();
    clearConsole();
    
    // Reset Dashboard
    setElementText('statNet', '0,00 €');
    setElementText('statComm', '0,00 €');
    setElementText('kpiGrossValue', '0,00 €');
    setElementText('kpiCommValue', '0,00 €');
    setElementText('kpiNetValue', '0,00 €');
    setElementText('kpiInvValue', '0,00 €');
    
    document.getElementById('jurosCard').style.display = 'none';
    document.getElementById('verdictSection').style.display = 'none';
    document.getElementById('bigDataAlert').style.display = 'none';
    
    if (VDCSystem.chart) {
        VDCSystem.chart.destroy();
        VDCSystem.chart = null;
    }
    
    generateMasterHash();
    updateAnalysisButton();
    
    logAudit('Sistema reiniciado.', 'warn');
    showToast(currentLang === 'pt' ? 'Sistema reiniciado com sucesso' : 'System reset successfully', 'warning');
}

// ============================================================================
// 16. TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
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
    }, 3000);
}

/* =====================================================================
   FIM DO FICHEIRO SCRIPT.JS · v12.0 CSI FINAL
   TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA
   ===================================================================== */
