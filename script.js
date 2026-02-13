/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.1 TERMINAL EDITION
 * ====================================================================
 * UPGRADE: INTELIGÊNCIA DE INTERROGATÓRIO + COMANDO PDF + FOSSO FISCAL
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

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross)) return { level: 'INCONCLUSIVO', key: 'low', desc: 'Dados insuficientes.' };
    const pct = Math.abs((delta / gross) * 100);
    if (pct <= 5) return { level: 'BAIXO RISCO', key: 'low', desc: 'Margem de erro operacional.' };
    if (pct <= 20) return { level: 'RISCO MÉDIO', key: 'med', desc: 'Anomalia algorítmica detetada.' };
    return { level: 'CRÍTICO', key: 'high', desc: 'Indício de Dolo Fiscal.' };
};

// ============================================================================
// 3. ESTADO GLOBAL
// ============================================================================

const VDCSystem = {
    version: 'v12.1-TERMINAL',
    sessionId: 'VDC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    selectedPlatform: 'bolt',
    client: null,
    masterHash: '',
    performanceTiming: { start: 0, end: 0 },
    documents: { control: { files: [] }, saft: { files: [] }, invoices: { totals: {} }, statements: { totals: {} } },
    analysis: { extractedValues: {}, crossings: {}, verdict: null, selectedQuestions: [] }
};

// ============================================================================
// 4. INICIALIZAÇÃO
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    setupListeners();
    populateYears();
    startClock();
    generateHash();
});

function setupListeners() {
    document.getElementById('startSessionBtn')?.addEventListener('click', () => {
        document.getElementById('splashScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('mainContainer').style.opacity = '1';
            document.getElementById('mainContainer').style.display = 'flex';
            log('Sistema Iniciado', 'success');
        }, 500);
    });
    
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', runDemo);
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => document.getElementById('evidenceModal').style.display = 'flex');
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', () => document.getElementById('evidenceModal').style.display = 'none');
    document.getElementById('selPlatformFixed')?.addEventListener('change', (e) => VDCSystem.selectedPlatform = e.target.value);
    
    // Upload Listeners Simplificados
    ['dac7', 'control', 'saft', 'invoice', 'statement'].forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        if(btn) btn.onclick = () => document.getElementById(`${type}FileModal`).click();
        const input = document.getElementById(`${type}FileModal`);
        if(input) input.onchange = (e) => handleUpload(e, type);
    });
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

function startClock() {
    setInterval(() => {
        const now = new Date();
        setElementText('currentDate', now.toLocaleDateString('pt-PT'));
        setElementText('currentTime', now.toLocaleTimeString('pt-PT'));
    }, 1000);
}

// ============================================================================
// 5. LÓGICA DE NEGÓCIO
// ============================================================================

function registerClient() {
    const name = document.getElementById('clientNameFixed').value;
    const nif = document.getElementById('clientNIFFixed').value;
    if (!name || !validateNIF(nif)) return alert('Nome ou NIF inválido.');
    
    VDCSystem.client = { name, nif };
    localStorage.setItem('vdc_client', JSON.stringify({ name, nif }));
    
    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);
    log(`Cliente validado: ${name}`, 'success');
    updateButtons();
}

async function handleUpload(e, type) {
    const file = e.target.files[0];
    if(!file) return;
    // Simulação de parsing
    const val = file.name.includes('invoice') ? 500 : 10000; // Mock
    if(type === 'invoice') VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + val;
    if(type === 'statement') {
        VDCSystem.documents.statements.totals.rendimentosBrutos = 10000;
        VDCSystem.documents.statements.totals.comissaoApp = 2000;
    }
    VDCSystem.documents[type].files.push(file);
    log(`Ficheiro ${file.name} carregado`, 'info');
    generateHash();
    updateButtons();
}

function runDemo() {
    log('MODO DEMO ATIVADO', 'warn');
    document.getElementById('clientNameFixed').value = 'Demo Corp';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();
    
    VDCSystem.documents.control.files.push({name: 'ctrl.xml'});
    VDCSystem.documents.saft.files.push({name: 'saft.xml'});
    VDCSystem.documents.invoices.totals.invoiceValue = 250;
    VDCSystem.documents.statements.totals.rendimentosBrutos = 8500;
    VDCSystem.documents.statements.totals.comissaoApp = 1955;
    
    updateButtons();
    performAudit();
}

function performAudit() {
    VDCSystem.performanceTiming.start = performance.now();
    document.querySelector('.chart-section')?.classList.add('scanning');
    
    // Cálculos
    const g = VDCSystem.documents.statements.totals.rendimentosBrutos || 0;
    const c = VDCSystem.documents.statements.totals.comissaoApp || 0;
    const i = VDCSystem.documents.invoices.totals.invoiceValue || 0;
    
    const net = forensicRound(g - c);
    const delta = forensicRound(net - i);
    const taxGap = Math.abs(delta);
    
    // Cálculo Penal/Fiscal (BTF)
    const iva = forensicRound(taxGap * 0.23);
    const multaMin = forensicRound(taxGap * 1.0);
    const multaMax = forensicRound(taxGap * 4.0);
    
    VDCSystem.analysis.extractedValues = { gross: g, comm: c, net, inv: i, delta, taxGap, iva, multaMin, multaMax };
    VDCSystem.analysis.verdict = getRiskVerdict(delta, g);
    
    // IA: Seleção de Perguntas
    selectQuestions(VDCSystem.analysis.verdict.key);
    
    VDCSystem.performanceTiming.end = performance.now();
    
    updateUI();
    renderChart();
    
    document.querySelector('.chart-section')?.classList.remove('scanning');
    log(`Análise concluída em ${(VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(0)}ms`, 'success');
}

// LÓGICA IA: SELEÇÃO DE PERGUNTAS
function selectQuestions(riskKey) {
    // Priorizar perguntas do nível de risco, depois adjacentes
    let pool = QUESTIONS_CACHE.filter(q => q.type === riskKey);
    if (pool.length < 6) {
        const others = QUESTIONS_CACHE.filter(q => q.type !== riskKey);
        pool = [...pool, ...others];
    }
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    VDCSystem.analysis.selectedQuestions = pool.slice(0, 6);
}

function updateUI() {
    const v = VDCSystem.analysis.extractedValues;
    const vr = VDCSystem.analysis.verdict;
    
    setElementText('statNet', formatCurrency(v.net));
    setElementText('statComm', formatCurrency(v.comm));
    setElementText('statJuros', formatCurrency(v.taxGap));
    
    setElementText('kpiGrossValue', formatCurrency(v.gross));
    setElementText('kpiNetValue', formatCurrency(v.net));
    setElementText('kpiInvValue', formatCurrency(v.inv));
    
    if(v.taxGap > 0) {
        document.getElementById('jurosCard').style.display = 'flex';
        document.getElementById('bigDataAlert').style.display = 'flex';
        setElementText('alertDeltaValue', formatCurrency(v.taxGap));
    }
    
    if(vr) {
        document.getElementById('verdictSection').style.display = 'block';
        document.getElementById('verdictSection').className = `verdict-display active verdict-${vr.key}`;
        setElementText('verdictLevel', vr.level);
        setElementText('verdictDesc', vr.desc);
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
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Fosso Fiscal'],
            datasets: [{
                label: '€',
                data: [v.gross, v.comm, v.net, v.inv, v.taxGap],
                backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ============================================================================
// 6. PDF REPORT (COMMAND BOX STYLE)
// ============================================================================

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const v = VDCSystem.analysis.extractedValues;
    const vr = VDCSystem.analysis.verdict;
    const p = PLATFORM_DATA[VDCSystem.selectedPlatform];
    
    let y = 20;
    
    // 1. HEADER FBI (Black Bar)
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 220, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("PARECER PERICIAL FORENSE", 105, 25, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(10);
    doc.text("VDC SYSTEMS INTERNATIONAL · CONFIDENTIAL", 105, 33, { align: 'center' });
    
    y = 50;
    
    // 2. COMMAND BOX (Metadados)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, y, 190, 35, 3, 3, 'S'); // Caixa Arredondada
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    
    // Linhas dentro da caixa
    doc.text(`SESSÃO: ${VDCSystem.sessionId}`, 15, y + 8);
    doc.text(`PERITO: Sistema Automatizado v12.1`, 15, y + 14);
    doc.text(`DATA: ${new Date().toLocaleString()}`, 15, y + 20);
    doc.text(`TEMPO PROC: ${(VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(0)} ms`, 15, y + 26);
    
    doc.text(`SUJEITO: ${VDCSystem.client.name}`, 120, y + 8);
    doc.text(`NIF: ${VDCSystem.client.nif}`, 120, y + 14);
    doc.text(`PLATAFORMA: ${p.name}`, 120, y + 20);
    doc.text(`NIF PLAT: ${p.nif}`, 120, y + 26);
    
    y += 45;
    
    // 3. ANÁLISE ECONÔMICA
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("1. ANÁLISE ECONÔMICA TRIANGULAR", 10, y); y += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Valor Bruto (Extrato): ${formatCurrency(v.gross)}`, 15, y); y += 5;
    doc.text(`Comissão Algorítmica: ${formatCurrency(v.comm)}`, 15, y); y += 5;
    doc.text(`Valor Líquido Real: ${formatCurrency(v.net)}`, 15, y); y += 5;
    doc.text(`Valor Faturado: ${formatCurrency(v.inv)}`, 15, y); y += 5;
    
    doc.setTextColor(200, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`FOSSO FISCAL (Tax Gap): ${formatCurrency(v.taxGap)}`, 15, y); y += 10;
    
    // 4. CÁLCULOS FINANCEIROS
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text("2. CÁLCULOS DE RECUPERAÇÃO FISCAL", 10, y); y += 6;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`IVA em Falta (23%): ${formatCurrency(v.iva)}`, 15, y); y += 5;
    doc.text(`Coima Mínima (RGIT 100%): ${formatCurrency(v.multaMin)}`, 15, y); y += 5;
    doc.text(`Coima Máxima (Dolo 400%): ${formatCurrency(v.multaMax)}`, 15, y); y += 10;
    
    // 5. VEREDICTO
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("3. VEREDICTO DE RISCO", 10, y); y += 6;
    
    // Caixa Colorida do Veredicto
    if(vr.key === 'high') doc.setFillColor(255, 230, 230);
    else if(vr.key === 'med') doc.setFillColor(255, 245, 220);
    else doc.setFillColor(230, 255, 230);
    
    doc.roundedRect(10, y, 190, 15, 2, 2, 'F');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(vr.level, 105, y + 10, { align: 'center' });
    y += 20;
    
    // 6. INTERROGATÓRIO ESTRATÉGICO (IA)
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("4. INTERROGATÓRIO ESTRATÉGICO (Dinâmico)", 10, y); y += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    
    VDCSystem.analysis.selectedQuestions.forEach((q, i) => {
        if(y > 270) { doc.addPage(); y = 20; }
        doc.text(`${i+1}. ${q.text}`, 10, y, { maxWidth: 180 });
        y += 10;
    });
    
    // MARCA DE ÁGUA (Background)
    const pageCount = doc.internal.getNumberOfPages();
    for(let i=1; i<=pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(150, 150, 150);
        doc.line(10, 285, 200, 285); // Linha Footer
        
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        doc.text("VDC Systems International © 2024 / 2026 | Forensic Compliance | EM", 105, 290, { align: 'center' });
        
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`MASTER HASH: ${VDCSystem.masterHash}`, 105, 294, { align: 'center' });
        
        // Watermark
        doc.setTextColor(240, 240, 240);
        doc.setFontSize(60);
        doc.text("CÓPIA CONTROLADA", 105, 150, { align: 'center', angle: 45 });
    }
    
    doc.save(`Parecer_Pericial_${VDCSystem.sessionId}.pdf`);
    log('PDF Gerado com Sucesso', 'success');
}

// ============================================================================
// 7. AUXILIARES
// ============================================================================

function generateHash() {
    const str = JSON.stringify(VDCSystem.documents) + VDCSystem.sessionId;
    VDCSystem.masterHash = CryptoJS.SHA256(str).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
}

function updateButtons() {
    const hasClient = VDCSystem.client !== null;
    const hasDocs = VDCSystem.documents.control.files.length > 0 && VDCSystem.documents.saft.files.length > 0;
    const analyzeBtn = document.getElementById('analyzeBtn');
    if(analyzeBtn) analyzeBtn.disabled = !(hasClient && hasDocs);
    
    const pdfBtn = document.getElementById('exportPDFBtn');
    if(pdfBtn) pdfBtn.disabled = !hasClient;
}

function log(msg, type='info') {
    const el = document.getElementById('consoleOutput');
    if(!el) return;
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.textContent = `[${time}] ${msg}`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}
