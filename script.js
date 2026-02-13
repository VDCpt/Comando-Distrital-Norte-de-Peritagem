/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.0 CSI EDITION FINAL
 * ====================================================================
 * PROTOCOLO: ISO/IEC 27037:2022 | NIST SP 800-86 | INTERPOL DFP
 * RETIFICAÇÃO FINAL: Dinamismo de Plataforma, PDF Pericial, Glossário
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. DADOS DAS PLATAFORMAS & CONFIGURAÇÕES
// ============================================================================

// CORREÇÃO: Mapeamento Dinâmico para Bolt vs Uber
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
    }
};

// ============================================================================
// 2. UTILITÁRIOS FORENSES
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
        kpiTitle: "ANÁLISE DE TRIANGULAÇÃO",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÃO",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURA",
        consoleTitle: "LOG DE CUSTÓDIA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS",
        uploadDac7Text: "FICHEIROS DAC7",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T/XML",
        uploadInvoiceText: "FATURAS (PDF/CSV)",
        uploadStatementText: "EXTRATOS BANCÁRIOS",
        summaryTitle: "RESUMO DE PROCESSAMENTO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        modalClearBtn: "LIMPAR SISTEMA",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Discrepância não justificada:",
        
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
        kpiTitle: "TRIANGULATION ANALYSIS",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSION",
        kpiNetText: "NET",
        kpiInvText: "INVOICE",
        consoleTitle: "CUSTODY LOG",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH)",
        modalTitle: "EVIDENCE MANAGEMENT",
        uploadDac7Text: "DAC7 FILES",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T/XML FILES",
        uploadInvoiceText: "INVOICES",
        uploadStatementText: "BANK STATEMENTS",
        summaryTitle: "PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        modalClearBtn: "CLEAR SYSTEM",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified discrepancy:",

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
    selectedPlatform: 'bolt', // Default Bolt
    client: null,
    processing: false,
    performanceTiming: { start: 0, end: 0 }, // PERFORMANCE
    
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
    
    chart: null
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
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    generateMasterHash();
    
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
            const main = document.getElementById('mainContainer');
            main.style.display = 'flex'; // Flex para layout correto
            setTimeout(() => main.style.opacity = '1', 50);
        }, 500);
        setupMainListeners();
        logAudit('Sistema VDC v12.0 CSI ONLINE', 'success');
    }, 1000);
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
            }
        }
    } catch(e) { console.warn('Cache limpo'); }
}

function setupMainListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);
    
    // CORREÇÃO: Listener para troca de plataforma
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
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => { document.getElementById('consoleOutput').innerHTML = ''; });
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAllEvidence);
    
    setupUploadListeners();
}

function setupUploadListeners() {
    ['dac7', 'control', 'saft', 'invoice', 'statement'].forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
}

// ============================================================================
// 6. FUNÇÕES AUXILIARES
// ============================================================================

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
    setInterval(() => {
        const now = new Date();
        setElementText('currentDate', now.toLocaleDateString(currentLang === 'pt' ? 'pt-PT' : 'en-GB'));
        setElementText('currentTime', now.toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB'));
    }, 1000);
}

function switchLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    const t = translations[currentLang];
    // Atualizar UI (simplificado para essenciais)
    document.getElementById('splashStartBtnText').textContent = t.startBtn;
    document.getElementById('currentLangLabel').textContent = t.langBtn;
    document.getElementById('btnRegister').textContent = t.btnRegister;
    document.getElementById('btnAnalyze').innerHTML = `<i class="fas fa-search-dollar"></i> ${t.btnAnalyze}`;
    document.getElementById('btnPDF').innerHTML = `<i class="fas fa-file-pdf"></i> ${t.btnPDF}`;
    logAudit(`Idioma: ${currentLang.toUpperCase()}`, 'info');
}

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
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    
    for (const file of files) {
        const text = await readFileAsText(file);
        const hash = CryptoJS.SHA256(text).toString();
        
        if(!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], hashes: {}, totals: {} };
        VDCSystem.documents[type].files.push(file);
        VDCSystem.documents[type].hashes[file.name] = hash;
        VDCSystem.analysis.evidenceIntegrity.push({ filename: file.name, type, hash, timestamp: new Date().toISOString() });
        
        // Parsing simples (Demo assume CSV/Text)
        if (type === 'invoice') {
            const val = toForensicNumber(text.match(/(\d+[.,]\d{2})/)?.[0] || 0);
            VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
        }
        if (type === 'statement') {
            // Simulação de parsing de extrato
            const gross = toForensicNumber(text.match(/Gross: (\d+)/i)?.[1] || 0);
            const comm = toForensicNumber(text.match(/Commission: (\d+)/i)?.[1] || 0);
            VDCSystem.documents.statements.totals.rendimentosBrutos = (VDCSystem.documents.statements.totals.rendimentosBrutos || 0) + gross;
            VDCSystem.documents.statements.totals.comissaoApp = (VDCSystem.documents.statements.totals.comissaoApp || 0) + comm;
        }
        
        const list = document.getElementById(`${type}FileListModal`) || document.getElementById(`${type}sFileListModal`);
        if(list) {
            list.style.display = 'block';
            list.innerHTML += `<div class="file-item-modal"><i class="fas fa-check"></i> ${file.name} <span style="opacity:0.5">${hash.substring(0,8)}...</span></div>`;
        }
    }
    
    if(btn) btn.innerHTML = '<i class="fas fa-upload"></i> SELECIONAR';
    generateMasterHash();
    updateEvidenceSummary();
    updateCounters();
    logAudit(`${files.length} ficheiro(s) ${type} carregado(s)`, 'success');
}

function updateEvidenceSummary() {
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const el = document.getElementById(`summary${k.charAt(0).toUpperCase() + k.slice(1)}`);
        if(el) el.textContent = count;
    });
}

function updateCounters() {
    let total = 0;
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        total += count;
        const id = k.includes('invoice') ? 'invoice' : k.includes('statement') ? 'statement' : k;
        setElementText(`${id}CountCompact`, count);
    });
    document.querySelectorAll('.evidence-count-solid').forEach(el => el.textContent = total);
}

function clearAllEvidence() {
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        VDCSystem.documents[k] = { files: [], hashes: {}, totals: {} };
    });
    VDCSystem.analysis.evidenceIntegrity = [];
    updateCounters();
    updateEvidenceSummary();
    generateMasterHash();
    logAudit('Evidências limpas', 'warn');
}

// ============================================================================
// 8. DEMO MODE
// ============================================================================

function activateDemoMode() {
    logAudit('ativANDO DEMO...', 'info');
    document.getElementById('clientNameFixed').value = 'Demo Corp';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();
    
    // Simular dados
    VDCSystem.documents.invoices.totals.invoiceValue = 250.00;
    VDCSystem.documents.statements.totals.rendimentosBrutos = 8500.00;
    VDCSystem.documents.statements.totals.comissaoApp = 1955.00;
    VDCSystem.documents.control.files.push({name: 'demo_ctrl.xml'});
    VDCSystem.documents.saft.files.push({name: 'demo_saft.xml'});
    
    updateCounters();
    updateEvidenceSummary();
    updateAnalysisButton();
    performAudit();
}

// ============================================================================
// 9. MOTOR DE AUDITORIA
// ============================================================================

function performAudit() {
    if(!VDCSystem.client) return showToast('Registe cliente', 'error');
    
    VDCSystem.performanceTiming.start = performance.now(); // INÍCIO
    
    const chartSection = document.querySelector('.chart-section');
    if(chartSection) chartSection.classList.add('scanning'); // EFEITO SCAN
    
    const btn = document.getElementById('analyzeBtn');
    if(btn) btn.disabled = true;
    
    setTimeout(() => {
        const gross = VDCSystem.documents.statements.totals.rendimentosBrutos || 0;
        const comm = VDCSystem.documents.statements.totals.comissaoApp || 0;
        const inv = VDCSystem.documents.invoices.totals.invoiceValue || 0;
        
        const net = forensicRound(gross - comm);
        const delta = forensicRound(net - inv);
        
        VDCSystem.analysis.extractedValues = {
            gross, comm: -comm, net, inv,
            delta,
            iva23: forensicRound(Math.abs(delta) * 0.23),
            juros: forensicRound(Math.abs(delta) * 0.04)
        };
        
        VDCSystem.analysis.crossings.delta = delta;
        VDCSystem.analysis.riskVerdict = getRiskVerdict(delta, gross);
        
        VDCSystem.performanceTiming.end = performance.now(); // FIM
        const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit(`Análise concluída em ${duration}ms`, 'success');
        
        if(chartSection) chartSection.classList.remove('scanning');
        if(btn) btn.disabled = false;
        
    }, 1000);
}

function updateDashboard() {
    const v = VDCSystem.analysis.extractedValues;
    setElementText('statNet', formatCurrency(v.net));
    setElementText('statComm', formatCurrency(v.comm));
    setElementText('kpiGrossValue', formatCurrency(v.gross));
    setElementText('kpiNetValue', formatCurrency(v.net));
    setElementText('kpiInvValue', formatCurrency(v.inv));
    
    const jurosCard = document.getElementById('jurosCard');
    if(Math.abs(v.delta) > 100) {
        jurosCard.style.display = 'flex';
        setElementText('statJuros', formatCurrency(v.juros));
    } else {
        jurosCard.style.display = 'none';
    }
}

function showAlerts() {
    const verdictEl = document.getElementById('verdictSection');
    const alertEl = document.getElementById('bigDataAlert');
    
    if(VDCSystem.analysis.riskVerdict) {
        verdictEl.style.display = 'block';
        verdictEl.className = `verdict-display active ${VDCSystem.analysis.riskVerdict.className}`;
        setElementText('verdictLevel', VDCSystem.analysis.riskVerdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.riskVerdict.description);
    }
    
    if(Math.abs(VDCSystem.analysis.crossings.delta) > 100) {
        alertEl.style.display = 'flex';
        alertEl.classList.add('alert-active');
        setElementText('alertDeltaValue', formatCurrency(VDCSystem.analysis.crossings.delta));
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if(!ctx) return;
    if(VDCSystem.chart) VDCSystem.chart.destroy();
    
    const v = VDCSystem.analysis.extractedValues;
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Discrepância'],
            datasets: [{
                label: 'Valores €',
                data: [v.gross, Math.abs(v.comm), v.net, v.inv, Math.abs(v.delta)],
                backgroundColor: ['#0066cc', '#ff9f1a', '#00cc88', '#6c5ce7', '#e84118']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ============================================================================
// 10. GERAÇÃO PDF (RETIFICADO COM PLATAFORMAS)
// ============================================================================

async function exportPDF() {
    if(!VDCSystem.client) return showToast('Sem cliente', 'error');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const t = translations[currentLang];
    const platform = PLATFORM_DATA[VDCSystem.selectedPlatform]; // DINAMISMO
    
    let y = 20;
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    
    // 1. Watermark
    addWatermark(doc, t.pdfWatermark, pageW, pageH);
    
    // Header
    doc.setFillColor(0, 102, 204);
    doc.rect(0, 0, pageW, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(t.pdfTitle, pageW/2, 10, {align: 'center'});
    
    y = 25;
    
    // 1. Identificação
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection1, 15, y); y += 8;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    const meta = [
        `${t.pdfLabelName}: ${VDCSystem.client.name}`,
        `${t.pdfLabelNIF}: ${VDCSystem.client.nif}`,
        `Plataforma: ${platform.name} (NIF: ${platform.nif})`,
        `Endereço: ${platform.address}`,
        `Sessão: ${VDCSystem.sessionId}`,
        `Motor: VDC CSI v12.0`,
        `Timestamp Unix: ${Math.floor(Date.now()/1000)}`,
        `${t.pdfProcTime}: ${(VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2)} ms`
    ];
    
    meta.forEach(m => { doc.text(m, 15, y); y += 5; });
    y += 5;
    
    // 2. Análise Financeira
    doc.setTextColor(0, 102, 204);
    doc.text(t.pdfSection2, 15, y); y += 8;
    doc.setTextColor(50, 50, 50);
    
    const v = VDCSystem.analysis.extractedValues;
    const fin = [
        `${t.pdfLabelGross}: ${formatCurrency(v.gross)}`,
        `${t.pdfLabelComm}: ${formatCurrency(v.comm)}`,
        `${t.pdfLabelNet}: ${formatCurrency(v.net)}`,
        `${t.pdfLabelInv}: ${formatCurrency(v.inv)}`,
        `${t.pdfLabelDiff}: ${formatCurrency(v.delta)}`,
        `${t.pdfLabelIVA23}: ${formatCurrency(v.iva23)}`
    ];
    fin.forEach(f => { doc.text(f, 15, y); y += 5; });
    y += 5;
    
    // 3. Veredicto
    doc.setTextColor(0, 102, 204);
    doc.text(t.pdfSection3, 15, y); y += 8;
    
    if(VDCSystem.analysis.riskVerdict) {
        const vr = VDCSystem.analysis.riskVerdict;
        doc.setTextColor(vr.color === '#44bd32' ? 68 : vr.color === '#ff9f1a' ? 255 : 232, 
                         vr.color === '#44bd32' ? 189 : vr.color === '#ff9f1a' ? 159 : 65, 
                         vr.color === '#44bd32' ? 50 : vr.color === '#ff9f1a' ? 26 : 24);
        doc.text(`${t.pdfSection3}: ${vr.level}`, 15, y); y += 6;
        doc.setTextColor(100, 100, 100);
        doc.text(vr.description, 15, y, {maxWidth: pageW - 30}); y += 10;
    }
    
    // 4. Interrogatório
    y += 5;
    doc.setTextColor(0, 102, 204);
    doc.text(t.pdfSection6, 15, y); y += 8;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    t.pdfQuestions.forEach(q => { doc.text(q, 15, y); y += 4; });
    
    // 5. Glossário (Nova Página)
    doc.addPage();
    addWatermark(doc, t.pdfWatermark, pageW, pageH);
    y = 20;
    
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfGlossaryTitle, 15, y); y += 10;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    t.pdfGlossaryDef.forEach(g => {
        doc.setFont(undefined, 'bold');
        doc.text(g.term, 15, y); y += 5;
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(g.def, pageW - 30);
        doc.text(lines, 15, y); y += (lines.length * 4) + 5;
    });
    
    // Footer em todas as páginas
    const pageCount = doc.internal.getNumberOfPages();
    for(let i=1; i<=pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        
        // Master Hash por extenso no rodapé
        doc.text(`Master Hash SHA-256: ${VDCSystem.masterHash}`, 15, pageH - 10, {maxWidth: pageW - 30});
        
        // Copyright
        doc.text(t.pdfFooter, pageW/2, pageH - 5, {align: 'center'});
    }
    
    doc.save(`VDC_Report_${VDCSystem.sessionId}.pdf`);
    logAudit('PDF Exportado', 'success');
}

function addWatermark(doc, text, w, h) {
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(50);
    // Opacidade simulada via cor clara (jsPDF vanilla não suporta setGState facilmente sem plugins)
    doc.text(text, w/2, h/2, {align: 'center', angle: 45});
}

function generateMasterHash() {
    const str = JSON.stringify(VDCSystem.documents) + VDCSystem.sessionId;
    VDCSystem.masterHash = CryptoJS.SHA256(str).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if(!btn) return;
    const hasClient = VDCSystem.client !== null;
    const hasCtrl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    
    btn.disabled = !(hasClient && hasCtrl && hasSaft);
    document.getElementById('exportPDFBtn').disabled = !hasClient;
}

function exportDataJSON() {
    const data = {
        meta: { version: VDCSystem.version, session: VDCSystem.sessionId, platform: VDCSystem.selectedPlatform },
        client: VDCSystem.client,
        analysis: VDCSystem.analysis,
        masterHash: VDCSystem.masterHash
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_Data_${VDCSystem.sessionId}.json`;
    a.click();
}

function resetSystem() {
    localStorage.removeItem('vdc_client_data_bd_v12_0');
    location.reload();
}

function logAudit(msg, type='info') {
    const ts = new Date().toLocaleTimeString();
    const el = document.getElementById('consoleOutput');
    if(el) {
        const div = document.createElement('div');
        div.className = `log-entry log-${type}`;
        div.textContent = `[${ts}] ${msg}`;
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }
}

function showToast(msg, type='info') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast-notification ${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i><p>${msg}</p>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

console.log('VDC v12.0 CSI FINAL - Sistema carregado com todas as correções aplicadas.');
