/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.1 BTF (BIG TECH FORENSIC)
 * ====================================================================
 * PROTOCOLO: ISO/IEC 27037:2022 | NIST SP 800-86 | INTERPOL DFP
 * UPGRADE: Motor de Interrogatório Dinâmico + PDF Profissional
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. DADOS DAS PLATAFORMAS & BANCO DE PERGUNTAS (BTF INTELLIGENCE)
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
    }
};

// BANCO DE 30 PERGUNTAS ESTRATÉGICAS (Classificadas por Tipo de Risco)
const FORENSIC_QUESTIONS_BANK = [
    // RISCO BAIXO - Administrativo/Consistência
    { q: "1. Existe concordância exata entre o 'Gross Earnings' do extrato bancário e o valor reportado no DAC7 para o período em análise?", type: 'low', cat: 'Consistência' },
    { q: "2. A taxa de serviço aplicada corresponde à percentagem contratual divulgada ao condutor no momento da prestação?", type: 'low', cat: 'Contrato' },
    { q: "3. Foram emitidas faturas recibo por todas as transações constantes no extrato de pagamentos da plataforma?", type: 'low', cat: 'Documentação' },
    { q: "4. Os comprovativos de retenção na fonte (se aplicável) foram deduzidos corretamente no valor líquido transferido?", type: 'low', cat: 'Fiscalidade' },
    { q: "5. O sistema de gestão interna bloqueia transações duplicadas antes da geração do relatório final?", type: 'low', cat: 'Sistema' },
    { q: "6. Existe um registro auditável (log) de alterações de preços durante o período da viagem?", type: 'low', cat: 'Logs' },
    { q: "7. A moeda de conversão nos pagamentos internacionais respeita a taxa de câmbio do BCE no dia da transação?", type: 'low', cat: 'Câmbio' },
    { q: "8. As gorjetas ('tips') são claramente discriminadas e separadas do rendimento de serviço no relatório?", type: 'low', cat: 'Segregação' },
    
    // RISCO MÉDIO - Algorítmico/Processual
    { q: "9. O algoritmo de precificação dinâmica ('surge pricing') foi aplicado de forma proporcional à taxa de serviço final?", type: 'med', cat: 'Algoritmo' },
    { q: "10. Existem registos de 'Shadow Entries' (entradas sem ID transacional) na base de dados exportada?", type: 'med', cat: 'Integridade' },
    { q: "11. A plataforma fornece o código fonte ou pseudocódigo da lógica de cálculo de comissões para verificação externa?", type: 'med', cat: 'Auditoria' },
    { q: "12. Como são tratadas as diferenças de arredondamento (centavos) no somatório das faturas vs extrato global?", type: 'med', cat: 'Matemática' },
    { q: "13. Foram detetados padrões de cancelamento de viagens que poderiam indicar ocultação de rendimentos (viagens fantasmas)?", type: 'med', cat: 'Padrões' },
    { q: "14. A taxa de serviço varia consoante o método de pagamento utilizado pelo cliente final?", type: 'med', cat: 'Pagamentos' },
    { q: "15. O timestamp das transações no extrato é sincronizado com o fuso horário local ou UTC, para fins de auditoria?", type: 'med', cat: 'Temporal' },
    { q: "16. Existem discrepâncias entre o valor bruto reportado no SAF-T e o extrato bancário superior a 1%?", type: 'med', cat: 'Conciliação' },
    { q: "17. A geolocalização da prestação de serviço coincide com a jurisdição fiscal declarada na fatura?", type: 'med', cat: 'Jurisdição' },
    { q: "18. Os bónus de 'pontos de fidelidade' ou 'promoções' têm tratamento fiscal autónomo ou são deduzidos ao bruto?", type: 'med', cat: 'Promoções' },
    
    // RISCO CRÍTICO - Dolo/Evasão
    { q: "19. Identificaram-se transferências para contas bancárias não tituladas pelo prestador de serviço?", type: 'high', cat: 'Lavagem' },
    { q: "20. Existe evidência de manipulação retroativa de registos ('timestamping fraud') após a data de fecho contabilístico?", type: 'high', cat: 'Fraude' },
    { q: "21. A discrepância entre o IVA declarado e o IVA calculado sobre o volume de negócios reconstruído excede o limiar legal?", type: 'high', cat: 'IVA' },
    { q: "22. Foram detetadas transações em paraísos fiscais sem justificação económica substancial?", type: 'high', cat: 'Offshore' },
    { q: "23. O sistema omite automaticamente transações de valor inferior a determinado montante no relatório de fim de mês?", type: 'high', cat: 'Omissão' },
    { q: "24. A taxa de serviço real aplicada excede em mais de 20% a taxa contratada, configurando cláusula abusiva ou desvio de fundos?", type: 'high', cat: 'Desvio' },
    { q: "25. Existem indícios de conluio entre o prestador e a plataforma para simulação de viagens não realizadas?", type: 'high', cat: 'Conluio' },
    { q: "26. A plataforma retenha valores superiores ao contratado sob a designação genérica de 'Taxas Regulatórias'?", type: 'high', cat: 'Transparência' },
    { q: "27. A análise forense revelou a existência de 'backdoors' ou contas de administrador com acesso não auditado aos dados?", type: 'high', cat: 'Segurança' },
    { q: "28. O volume de transações canceladas pelo sistema é compatível com a média histórica ou sugere eliminação seletiva?", type: 'high', cat: 'Eliminação' },
    { q: "29. Os metadados dos ficheiros CSV/XML fornecidos indicam data de criação posterior ao período fiscal em análise?", type: 'high', cat: 'Metadados' },
    { q: "30. Existe um padrão sistemático de omissão de declaração de gorjetas superiores a 50€?", type: 'high', cat: 'Gorjetas' }
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
    let str = v.toString().trim().replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '');
    
    if (str.includes(',') && str.includes('.')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
        else str = str.replace(/,/g, '');
    } else if (str.includes(',')) {
        const c = (str.match(/,/g) || []).length;
        if (c > 1) { const p = str.split(','); str = p.slice(0, -1).join('') + '.' + p[p.length - 1]; }
        else str = str.replace(',', '.');
    }
    
    str = str.replace(/[^\d.-]/g, '');
    if (str === '' || str === '-' || str === '.') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
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

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross) || isNaN(delta)) return { level: 'INCONCLUSIVO', color: '#8c7ae6', description: 'Dados insuficientes.', className: 'verdict-low', key: 'low' };
    const pct = Math.abs((delta / gross) * 100);
    if (pct <= 5) return { level: 'BAIXO RISCO', color: '#00e676', description: 'Margem de erro operacional. Monitorização recomendada.', className: 'verdict-low', key: 'low' };
    if (pct <= 15) return { level: 'RISCO MÉDIO', color: '#ff9f1a', description: 'Anomalia sistémica detetada. Auditoria técnica recomendada.', className: 'verdict-med', key: 'med' };
    return { level: 'CRÍTICO', color: '#e84118', description: 'Indício de Dolo Fiscal. Participação Criminal recomendada.', className: 'verdict-high', key: 'high' };
};

const formatCurrency = (value) => {
    return forensicRound(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
};

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// ============================================================================
// 3. SISTEMA DE TRADUÇÕES
// ============================================================================

const translations = {
    pt: {
        startBtn: "INICIAR v12.1 BTF",
        navDemo: "SIMULAÇÃO CSI",
        langBtn: "EN",
        headerSubtitle: "Big Tech Forensic Module | ISO/IEC 27037",
        sidebarIdTitle: "IDENTIFICAÇÃO",
        lblClientName: "Nome",
        lblNIF: "NIF",
        btnRegister: "VALIDAR",
        sidebarParamTitle: "PARÂMETROS",
        lblYear: "Ano",
        lblPlatform: "Plataforma",
        btnEvidence: "EVIDÊNCIAS",
        btnAnalyze: "ANÁLISE FORENSE",
        btnPDF: "EXPORTAR PARECER",
        cardNet: "LÍQUIDO",
        cardComm: "COMISSÃO",
        cardJuros: "JUROS",
        kpiTitle: "TRIANGULAÇÃO",
        kpiGross: "BRUTO",
        kpiCommText: "COMISSÃO",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURA",
        consoleTitle: "LOG FORENSE",
        footerHashTitle: "MASTER HASH SHA-256",
        modalTitle: "EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA CRÍTICA",
        alertOmissionText: "Discrepância:",
        
        pdfTitle: "PARECER PERICIAL DIGITAL",
        pdfSection1: "1. IDENTIFICAÇÃO E METADADOS",
        pdfSection2: "2. ANÁLISE ECONÓMICA",
        pdfSection3: "3. VEREDICTO DE RISCO",
        pdfSection4: "4. INTERROGATÓRIO ESTRATÉGICO",
        pdfSection5: "5. CÁLCULOS FISCAIS",
        pdfSection6: "6. ASSINATURA",
        pdfWatermark: "CÓPIA CONTROLADA",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.1 | Todos os Direitos Reservados | EM",
        pdfLabelName: "Nome",
        pdfLabelNIF: "NIF",
        pdfLabelSession: "Sessão",
        pdfLabelGross: "Bruto",
        pdfLabelComm: "Comissão",
        pdfLabelInv: "Faturado",
        pdfLabelDiff: "Fosso Fiscal",
        pdfLabelIVA23: "IVA (23%)",
        pdfLabelMulta: "Coima Estimada",
        pdfProcTime: "Tempo Proc.",
        pdfGlossaryTitle: "GLOSSÁRIO"
    },
    en: {
        startBtn: "START v12.1 BTF",
        navDemo: "CSI SIMULATION",
        langBtn: "PT",
        headerSubtitle: "Big Tech Forensic Module | ISO/IEC 27037",
        sidebarIdTitle: "IDENTIFICATION",
        lblClientName: "Name",
        lblNIF: "Tax ID",
        btnRegister: "VALIDATE",
        sidebarParamTitle: "PARAMETERS",
        lblYear: "Year",
        lblPlatform: "Platform",
        btnEvidence: "EVIDENCE",
        btnAnalyze: "FORENSIC ANALYSIS",
        btnPDF: "EXPORT REPORT",
        cardNet: "NET",
        cardComm: "COMMISSION",
        cardJuros: "INTEREST",
        kpiTitle: "TRIANGULATION",
        kpiGross: "GROSS",
        kpiCommText: "COMMISSION",
        kpiNetText: "NET",
        kpiInvText: "INVOICE",
        consoleTitle: "FORENSIC LOG",
        footerHashTitle: "MASTER HASH SHA-256",
        modalTitle: "EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ANOMALY",
        alertOmissionText: "Discrepancy:",

        pdfTitle: "DIGITAL FORENSIC REPORT",
        pdfSection1: "1. IDENTIFICATION & METADATA",
        pdfSection2: "2. ECONOMIC ANALYSIS",
        pdfSection3: "3. RISK VERDICT",
        pdfSection4: "4. STRATEGIC INTERROGATION",
        pdfSection5: "5. TAX CALCULATIONS",
        pdfSection6: "6. SIGNATURE",
        pdfWatermark: "CONTROLLED COPY",
        pdfFooter: "VDC Systems International © 2024 / 2026 | Forensic Compliance Module CSI v12.1 | All Rights Reserved | EM",
        pdfLabelName: "Name",
        pdfLabelNIF: "Tax ID",
        pdfLabelSession: "Session",
        pdfLabelGross: "Gross",
        pdfLabelComm: "Commission",
        pdfLabelInv: "Invoiced",
        pdfLabelDiff: "Tax Gap",
        pdfLabelIVA23: "VAT (23%)",
        pdfLabelMulta: "Estimated Fine",
        pdfProcTime: "Proc. Time",
        pdfGlossaryTitle: "GLOSSARY"
    }
};

let currentLang = 'pt';

// ============================================================================
// 4. ESTADO GLOBAL
// ============================================================================

const VDCSystem = {
    version: 'v12.1-BTF-ELITE',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    processing: false,
    performanceTiming: { start: 0, end: 0 },
    
    logs: [],
    masterHash: '',
    
    documents: {
        dac7: { files: [], hashes: {} },
        control: { files: [], hashes: {} },
        saft: { files: [], hashes: {} },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0 } },
        statements: { files: [], hashes: {}, totals: { rendimentosBrutos: 0, comissaoApp: 0 } }
    },
    
    analysis: {
        extractedValues: {},
        crossings: { delta: 0 },
        riskVerdict: null,
        evidenceIntegrity: [],
        selectedQuestions: [] // BTF: Perguntas Selecionadas
    },
    
    chart: null
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
    VDCSystem.sessionId = 'BTF-' + Date.now().toString(36).toUpperCase();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    generateMasterHash();
    
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
            const main = document.getElementById('mainContainer');
            main.style.display = 'flex';
            setTimeout(() => main.style.opacity = '1', 50);
        }, 500);
        setupMainListeners();
        logAudit('Sistema BTF v12.1 Carregado', 'success');
    }, 1000);
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_0');
        if (stored) {
            const client = JSON.parse(stored);
            if (client && client.name) {
                VDCSystem.client = client;
                document.getElementById('clientStatusFixed').style.display = 'flex';
                setElementText('clientNameDisplayFixed', client.name);
                setElementText('clientNifDisplayFixed', client.nif);
                document.getElementById('clientNameFixed').value = client.name;
                document.getElementById('clientNIFFixed').value = client.nif;
            }
        }
    } catch(e) {}
}

function setupMainListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);
    
    document.getElementById('selPlatformFixed')?.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        logAudit(`Plataforma: ${e.target.value.toUpperCase()}`, 'info');
    });
    
    const closeModal = () => {
        document.getElementById('evidenceModal').style.display = 'none';
        updateAnalysisButton();
    };
    
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => document.getElementById('evidenceModal').style.display = 'flex');
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeModal);
    document.getElementById('evidenceModal')?.addEventListener('click', (e) => { if(e.target.id === 'evidenceModal') closeModal(); });
    
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('resetBtn')?.addEventListener('click', resetSystem);
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => document.getElementById('consoleOutput').innerHTML = '');
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
    document.getElementById('currentLangLabel').textContent = t.langBtn;
    logAudit(`Idioma: ${currentLang.toUpperCase()}`, 'info');
}

function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();
    if (!name || name.length < 3) return showToast('Nome inválido', 'error');
    if (!validateNIF(nif)) return showToast('NIF inválido', 'error');
    
    VDCSystem.client = { name, nif, platform: VDCSystem.selectedPlatform };
    localStorage.setItem('vdc_client_data_bd_v12_0', JSON.stringify(VDCSystem.client));
    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);
    logAudit(`Cliente: ${name}`, 'success');
    updateAnalysisButton();
}

// ============================================================================
// 7. GESTÃO DE EVIDÊNCIAS
// ============================================================================

async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if(files.length === 0) return;
    for (const file of files) {
        const text = await readFileAsText(file);
        const hash = CryptoJS.SHA256(text).toString();
        if(!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], hashes: {} };
        VDCSystem.documents[type].files.push(file);
        VDCSystem.documents[type].hashes[file.name] = hash;
        VDCSystem.analysis.evidenceIntegrity.push({ filename: file.name, type, hash, timestamp: new Date().toISOString() });
        
        // Parsing Simples
        if (type === 'invoice') {
            const val = toForensicNumber(text.match(/(\d+[.,]\d{2})/)?.[0] || 0);
            VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
        }
        if (type === 'statement') {
            const g = toForensicNumber(text.match(/Gross: (\d+)/i)?.[1] || 0);
            const c = toForensicNumber(text.match(/Commission: (\d+)/i)?.[1] || 0);
            VDCSystem.documents.statements.totals.rendimentosBrutos = (VDCSystem.documents.statements.totals.rendimentosBrutos || 0) + g;
            VDCSystem.documents.statements.totals.comissaoApp = (VDCSystem.documents.statements.totals.comissaoApp || 0) + c;
        }
    }
    generateMasterHash();
    updateCounters();
    logAudit(`${files.length} ficheiros carregados`, 'success');
}

const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
});

function updateCounters() {
    let total = 0;
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        total += count;
        setElementText(`${k.includes('invoice') ? 'invoice' : k.includes('statement') ? 'statement' : k}CountCompact`, count);
    });
    document.querySelectorAll('.evidence-count-solid').forEach(el => el.textContent = total);
}

function clearAllEvidence() {
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(k => VDCSystem.documents[k] = { files: [], hashes: {}, totals: {} });
    VDCSystem.analysis.evidenceIntegrity = [];
    generateMasterHash();
    logAudit('Sistema limpo', 'warn');
}

// ============================================================================
// 8. DEMO MODE
// ============================================================================

function activateDemoMode() {
    logAudit('Demo BTF Ativa', 'info');
    document.getElementById('clientNameFixed').value = 'Demo Corp';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();
    VDCSystem.documents.invoices.totals.invoiceValue = 250;
    VDCSystem.documents.statements.totals.rendimentosBrutos = 8500;
    VDCSystem.documents.statements.totals.comissaoApp = 1955;
    VDCSystem.documents.control.files.push({name: 'demo.xml'});
    VDCSystem.documents.saft.files.push({name: 'demo.xml'});
    updateCounters();
    performAudit();
}

// ============================================================================
// 9. MOTOR DE AUDITORIA (BTF)
// ============================================================================

function performAudit() {
    if(!VDCSystem.client) return showToast('Sem cliente', 'error');
    
    VDCSystem.performanceTiming.start = performance.now();
    document.querySelector('.chart-section')?.classList.add('scanning');
    
    setTimeout(() => {
        const g = VDCSystem.documents.statements.totals.rendimentosBrutos || 0;
        const c = VDCSystem.documents.statements.totals.comissaoApp || 0;
        const i = VDCSystem.documents.invoices.totals.invoiceValue || 0;
        
        const net = forensicRound(g - c);
        const delta = forensicRound(net - i);
        
        // BTF: Cálculos Avançados
        const taxGap = Math.abs(delta);
        const ivaEstimate = forensicRound(taxGap * 0.23);
        const multaMin = forensicRound(taxGap * 1.0); // 100% Coima Mínima RGIT
        const multaMax = forensicRound(taxGap * 4.0); // 400% Coima Máxima Dolo
        
        VDCSystem.analysis.extractedValues = {
            gross: g, comm: -c, net, inv: i, delta,
            taxGap, ivaEstimate, multaMin, multaMax
        };
        
        VDCSystem.analysis.crossings.delta = delta;
        VDCSystem.analysis.riskVerdict = getRiskVerdict(delta, g);
        
        // BTF: Seleção de Perguntas Inteligentes
        selectIntelligentQuestions(VDCSystem.analysis.riskVerdict.key);
        
        VDCSystem.performanceTiming.end = performance.now();
        const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit(`Análise BTF concluída em ${duration}ms`, 'success');
        document.querySelector('.chart-section')?.classList.remove('scanning');
    }, 1000);
}

function selectIntelligentQuestions(riskKey) {
    // Filtrar perguntas baseadas no risco
    let pool = FORENSIC_QUESTIONS_BANK.filter(q => q.type === riskKey);
    
    // Se houver poucas do nível exato, incluir níveis adjacentes ou aleatórias
    if (pool.length < 6) {
        const others = FORENSIC_QUESTIONS_BANK.filter(q => q.type !== riskKey);
        // Priorizar 'med' se risco for 'high' ou 'low'
        const secondary = others.filter(q => q.type === 'med');
        pool = [...pool, ...secondary];
    }
    
    // Embaralhar (Shuffle)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    // Selecionar 6
    VDCSystem.analysis.selectedQuestions = pool.slice(0, 6);
}

function updateDashboard() {
    const v = VDCSystem.analysis.extractedValues;
    setElementText('statNet', formatCurrency(v.net));
    setElementText('statComm', formatCurrency(v.comm));
    setElementText('kpiGrossValue', formatCurrency(v.gross));
    setElementText('kpiNetValue', formatCurrency(v.net));
    setElementText('kpiInvValue', formatCurrency(v.inv));
    
    const jCard = document.getElementById('jurosCard');
    if(Math.abs(v.delta) > 100) {
        jCard.style.display = 'flex';
        setElementText('statJuros', formatCurrency(v.ivaEstimate));
    } else {
        jCard.style.display = 'none';
    }
}

function showAlerts() {
    const vEl = document.getElementById('verdictSection');
    const aEl = document.getElementById('bigDataAlert');
    
    if(VDCSystem.analysis.riskVerdict) {
        vEl.style.display = 'block';
        vEl.className = `verdict-display active ${VDCSystem.analysis.riskVerdict.className}`;
        setElementText('verdictLevel', VDCSystem.analysis.riskVerdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.riskVerdict.description);
    }
    
    if(Math.abs(VDCSystem.analysis.crossings.delta) > 100) {
        aEl.style.display = 'flex';
        aEl.classList.add('alert-active');
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
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Gap'],
            datasets: [{
                label: 'Valores €',
                data: [v.gross, Math.abs(v.comm), v.net, v.inv, v.taxGap],
                backgroundColor: ['#2979ff', '#ff9f1a', '#00e676', '#6c5ce7', '#e84118']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ============================================================================
// 10. GERAÇÃO PDF (BTF PROFESSIONAL)
// ============================================================================

async function exportPDF() {
    if(!VDCSystem.client) return showToast('Sem dados', 'error');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const t = translations[currentLang];
    const platform = PLATFORM_DATA[VDCSystem.selectedPlatform];
    const v = VDCSystem.analysis.extractedValues;
    
    let y = 20;
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;
    
    // --- HEADER PROFISSIONAL (MOLDURA) ---
    doc.setDrawColor(0, 102, 204); // Azul BTF
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 30); // Caixa de Identificação
    
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(16);
    doc.text(t.pdfTitle, 15, 20);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 15, 26);
    doc.text(`Data: ${new Date().toLocaleString()}`, 15, 30);
    doc.text(`Motor: VDC BTF v12.1`, 15, 34);
    
    // --- 1. IDENTIFICAÇÃO ---
    y = 45;
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection1, 10, y); y += 6;
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(10, y, 200, y); // Linha separadora
    y += 4;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    // Dados Plataforma Dinâmicos
    const idData = [
        `${t.pdfLabelName}: ${VDCSystem.client.name}`,
        `${t.pdfLabelNIF}: ${VDCSystem.client.nif}`,
        `Entidade Auditada: ${platform.name}`,
        `NIF Plataforma: ${platform.nif}`,
        `Sede: ${platform.address}`,
        `${t.pdfProcTime}: ${(VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2)} ms`
    ];
    
    idData.forEach(d => { doc.text(d, 12, y); y += 4; });
    
    // --- 2. ANÁLISE ECONÔMICA ---
    y += 4;
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection2, 10, y); y += 6;
    doc.line(10, y, 200, y); y += 4;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    const finData = [
        `${t.pdfLabelGross}: ${formatCurrency(v.gross)}`,
        `${t.pdfLabelComm}: ${formatCurrency(v.comm)}`,
        `${t.pdfLabelNet}: ${formatCurrency(v.net)}`,
        `${t.pdfLabelInv}: ${formatCurrency(v.inv)}`,
        `${t.pdfLabelDiff}: ${formatCurrency(v.taxGap)}`
    ];
    finData.forEach(d => { doc.text(d, 12, y); y += 4; });
    
    // --- 3. VEREDICTO ---
    y += 4;
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection3, 10, y); y += 6;
    doc.line(10, y, 200, y); y += 4;
    
    if(VDCSystem.analysis.riskVerdict) {
        const vr = VDCSystem.analysis.riskVerdict;
        // Cor do Veredicto
        if(vr.key === 'high') doc.setTextColor(232, 65, 24);
        else if(vr.key === 'med') doc.setTextColor(255, 159, 26);
        else doc.setTextColor(0, 230, 118);
        
        doc.setFont(undefined, 'bold');
        doc.text(`VEREDICTO: ${vr.level}`, 12, y); y += 5;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(vr.description, 12, y, {maxWidth: 180}); y += 8;
    }
    
    // --- 5. CÁLCULOS FISCAIS (BTF) ---
    y += 2;
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection5, 10, y); y += 6;
    doc.line(10, y, 200, y); y += 4;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.text(`IVA em Falta (23%): ${formatCurrency(v.ivaEstimate)}`, 12, y); y += 4;
    doc.text(`Coima Mínima (RGIT): ${formatCurrency(v.multaMin)}`, 12, y); y += 4;
    doc.text(`Coima Máxima (Dolo): ${formatCurrency(v.multaMax)}`, 12, y); y += 4;
    
    // --- 4. INTERROGATÓRIO (DINÂMICO) ---
    // Nova página se necessário
    if(y > 220) { doc.addPage(); y = 20; }
    
    y += 4;
    doc.setTextColor(0, 102, 204);
    doc.setFontSize(12);
    doc.text(t.pdfSection4, 10, y); y += 6;
    doc.line(10, y, 200, y); y += 4;
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(8);
    
    VDCSystem.analysis.selectedQuestions.forEach(q => {
        const lines = doc.splitTextToSize(q.q, 180);
        doc.text(lines, 12, y);
        y += (lines.length * 3) + 2;
    });
    
    // --- 6. ASSINATURA ---
    if(y > 250) { doc.addPage(); y = 20; }
    
    y += 15;
    doc.setDrawColor(0);
    doc.line(20, y, 80, y);
    y += 5;
    doc.setFontSize(9);
    doc.text(`Perito Forense Digital`, 20, y);
    
    // --- MARCA DE ÁGUA (BACKGROUND LAYER) ---
    // Adicionar em todas as páginas
    const pageCount = doc.internal.getNumberOfPages();
    for(let i=1; i<=pageCount; i++) {
        doc.setPage(i);
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(50);
        doc.setGState && doc.setGState(new doc.GState({opacity: 0.03})); // Opacity se suportado
        doc.text(t.pdfWatermark, pageW/2, pageH/2, {align: 'center', angle: 45});
        
        // --- FOOTER ---
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        // Linha Separador
        doc.setDrawColor(200, 200, 200);
        doc.line(10, pageH - 15, pageW - 10, pageH - 15);
        
        doc.text(`Master Hash: ${VDCSystem.masterHash}`, 10, pageH - 10);
        doc.text(t.pdfFooter, pageW/2, pageH - 5, {align: 'center'});
    }
    
    doc.save(`VDC_Report_BTF_${VDCSystem.sessionId}.pdf`);
    logAudit('PDF BTF Gerado', 'success');
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
