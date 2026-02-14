/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.5 RETA FINAL
 * ====================================================================
 * MÓDULO DE LEITURA UNIVERSAL + PDF CORRIGIDO
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.5 FINAL CARREGADO');

// ============================================================================
// 1. DADOS DAS PLATAFORMAS & BANCO DE PERGUNTAS
// ============================================================================
const PLATFORM_DATA = {
    bolt: { name: 'Bolt Operations OÜ', address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia', nif: 'EE102090374' },
    uber: { name: 'Uber B.V.', address: 'Strawinskylaan 4117, Amesterdão, Países Baixos', nif: 'NL852071588B01' },
    freenow: { name: 'FREE NOW', address: 'Rua Example, 123, Lisboa, Portugal', nif: 'PT123456789' },
    cabify: { name: 'Cabify', address: 'Avenida da Liberdade, 244, Lisboa, Portugal', nif: 'PT987654321' },
    indrive: { name: 'inDrive', address: 'Rua de São Paulo, 56, Porto, Portugal', nif: 'PT456123789' }
};

const QUESTIONS_CACHE = [
    { id: 1, text: "Qual a lógica algorítmica exata da taxa de serviço no período auditado?", type: "low" },
    { id: 2, text: "Como justifica a discrepância entre o registo de comissão e a fatura emitida?", type: "low" },
    { id: 3, text: "Existem registos de 'Shadow Entries' (entradas sem ID) no sistema?", type: "low" },
    { id: 21, text: "Existe segregação de funções no acesso aos algoritmos de cálculo financeiro?", type: "high" },
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

const formatCurrency = (value) => forensicRound(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross)) return { level: 'INCONCLUSIVO', key: 'low', color: '#8c7ae6', description: 'Dados insuficientes.', percent: '0.00%' };
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toFixed(2) + '%';
    if (pct <= 5) return { level: 'BAIXO RISCO', key: 'low', color: '#44bd32', description: 'Margem de erro operacional.', percent: pctFormatted };
    if (pct <= 15) return { level: 'RISCO MÉDIO', key: 'med', color: '#f59e0b', description: 'Anomalia algorítmica detetada.', percent: pctFormatted };
    return { level: 'CRÍTICO', key: 'high', color: '#ef4444', description: 'Indício de Fraude Fiscal (art. 103.º RGIT).', percent: pctFormatted };
};

const setElementText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
const generateSessionId = () => 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
const readFileAsText = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = e => resolve(e.target.result); reader.onerror = reject; reader.readAsText(file, 'UTF-8'); });

// ============================================================================
// 3. TRADUÇÕES
// ============================================================================
const translations = {
    pt: { startBtn: "INICIAR PERÍCIA v12.5", navDemo: "CASO SIMULADO", langBtn: "EN", headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86", sidebarIdTitle: "IDENTIFICAÇÃO DO SUJEITO PASSIVO", lblClientName: "Nome / Denominação Social", lblNIF: "NIF", btnRegister: "VALIDAR IDENTIDADE", btnAnalyze: "EXECUTAR PERÍCIA FORENSE", btnPDF: "PARECER PERICIAL", cardNet: "VALOR LÍQUIDO RECONSTRUÍDO", cardComm: "COMISSÕES DETETADAS", kpiTitle: "TRIANGULAÇÃO FINANCEIRA", consoleTitle: "LOG DE CUSTÓDIA", modalTitle: "GESTÃO DE EVIDÊNCIAS", uploadSaftText: "FICHEIROS SAF-T (PT)", uploadStatementText: "EXTRATOS BANCÁRIOS", modalSaveBtn: "SELAR EVIDÊNCIAS", pdfTitle: "PARECER PERICIAL", pdfSection1: "1. IDENTIFICAÇÃO", pdfSection2: "2. ANÁLISE FINANCEIRA", pdfSection3: "3. VEREDICTO", pdfLabelName: "Nome", pdfLabelNIF: "NIF", pdfLabelSession: "Perícia n.º", pdfLabelPlatform: "Plataforma", pdfFooterLine1: "Art. 103.º RGIT · ISO/IEC 27037" },
    en: { startBtn: "START FORENSIC EXAM v12.5", navDemo: "SIMULATED CASE", langBtn: "PT", headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86", sidebarIdTitle: "TAXPAYER IDENTIFICATION", lblClientName: "Name", lblNIF: "Tax ID", btnRegister: "VALIDATE IDENTITY", btnAnalyze: "EXECUTE FORENSIC EXAM", btnPDF: "EXPERT REPORT", cardNet: "RECONSTRUCTED NET VALUE", cardComm: "DETECTED COMMISSIONS", kpiTitle: "FINANCIAL TRIANGULATION", consoleTitle: "CUSTODY LOG", modalTitle: "EVIDENCE MANAGEMENT", uploadSaftText: "SAF-T FILES", uploadStatementText: "BANK STATEMENTS", modalSaveBtn: "SEAL EVIDENCE", pdfTitle: "EXPERT REPORT", pdfSection1: "1. IDENTIFICATION", pdfSection2: "2. FINANCIAL ANALYSIS", pdfSection3: "3. VERDICT", pdfLabelName: "Name", pdfLabelNIF: "Tax ID", pdfLabelSession: "Session No.", pdfLabelPlatform: "Platform", pdfFooterLine1: "Art. 103 RGIT · ISO/IEC 27037" }
};
let currentLang = 'pt';

// ============================================================================
// 4. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.5-FINAL',
    sessionId: null,
    selectedPlatform: 'bolt',
    client: null,
    processing: false,
    logs: [],
    masterHash: '',
    documents: {
        saft: { files: [], totals: { bruto: 0, iva: 0, iliquido: 0 } },
        invoices: { files: [], totals: { invoiceValue: 0 } },
        statements: { files: [], totals: { ganhosApp: 0, despesasComissao: 0 } },
        dac7: { files: [], totals: { q1: 0, q2: 0, q3: 0, q4: 0 } },
        control: { files: [] }
    },
    analysis: { extractedValues: {}, verdict: null, evidenceIntegrity: [], selectedQuestions: [] },
    chart: null
};

// ============================================================================
// 5. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupStaticListeners();
    populateAnoFiscal();
    startClockAndDate();
});

function setupStaticListeners() {
    document.getElementById('startSessionBtn')?.addEventListener('click', startGatekeeperSession);
    document.getElementById('langToggleBtn')?.addEventListener('click', switchLanguage);
}

function startGatekeeperSession() {
    document.getElementById('splashScreen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('loadingOverlay').style.display = 'flex';
        loadSystemCore();
    }, 500);
}

function loadSystemCore() {
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    setTimeout(showMainInterface, 1000);
}

function showMainInterface() {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    document.getElementById('mainContainer').style.opacity = '1';
    
    // DESBLOQUEIO TOTAL DE BOTÕES
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
    document.getElementById('exportJSONBtn').disabled = false;
    
    setupMainListeners();
    logAudit('SISTEMA VDC v12.5 ONLINE', 'success');
}

function populateAnoFiscal() {
    const sel = document.getElementById('anoFiscal');
    if(!sel) return;
    for(let y=2030; y>=2018; y--) {
        const opt = document.createElement('option'); opt.value=y; opt.textContent=y;
        if(y===2024) opt.selected=true; sel.appendChild(opt);
    }
}

function startClockAndDate() {
    setInterval(() => {
        const now = new Date();
        setElementText('currentDate', now.toLocaleDateString('pt-PT'));
        setElementText('currentTime', now.toLocaleTimeString('pt-PT'));
    }, 1000);
}

function setupMainListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => document.getElementById('evidenceModal').style.display = 'flex');
    document.getElementById('closeModalBtn')?.addEventListener('click', () => document.getElementById('evidenceModal').style.display = 'none');
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', () => document.getElementById('evidenceModal').style.display = 'none');
    
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn')?.addEventListener('click', () => { localStorage.clear(); location.reload(); });
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => document.getElementById('consoleOutput').innerHTML = '');

    setupUploadListeners();
}

function setupUploadListeners() {
    ['control', 'saft', 'invoice', 'statement', 'dac7'].forEach(type => {
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
    logAudit(`Idioma: ${currentLang.toUpperCase()}`, 'info');
}

// ============================================================================
// 6. CLIENTE & EVIDÊNCIAS
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();
    if (!name || name.length < 3) return showToast('Nome inválido', 'error');
    if (!validateNIF(nif)) return showToast('NIF inválido', 'error');
    
    VDCSystem.client = { name, nif };
    localStorage.setItem('vdc_client_data', JSON.stringify(VDCSystem.client));
    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);
    logAudit(`Cliente: ${name} (NIF ${nif})`, 'success');
}

async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if(files.length === 0) return;
    try {
        for (const file of files) await processFile(file, type);
        updateDashboard();
        updateModulesUI();
        updateCounters();
        showToast(`${files.length} ficheiro(s) processados`, 'success');
    } catch(err) {
        logAudit(`Erro: ${err.message}`, 'error');
    }
}

async function processFile(file, type) {
    const text = await readFileAsText(file);
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes = VDCSystem.documents[type].hashes || {};
    VDCSystem.documents[type].hashes[file.name] = CryptoJS.SHA256(text).toString();
    
    if (type === 'saft') processSAFTFile(text);
    if (type === 'statement') processStatementFile(text);
    if (type === 'invoice') processInvoiceFile(text);
    
    logAudit(`Carregado: ${file.name}`, 'success');
}

// ============================================================================
// 7. PROCESSADORES (LEITURA UNIVERSAL)
// ============================================================================
function processSAFTFile(text) {
    // Regex Universal - Procura números no texto bruto
    let bruto = 0, iva = 0, iliquido = 0;
    
    const creditMatch = text.match(/TotalCredit>\s*([\d\.,]+)/i);
    const debitMatch = text.match(/TotalDebit>\s*([\d\.,]+)/i);
    
    if (creditMatch) bruto = toForensicNumber(creditMatch[1]);
    if (debitMatch) bruto = Math.max(bruto, toForensicNumber(debitMatch[1]));
    
    const taxMatch = text.match(/TaxPayable>\s*([\d\.,]+)/i);
    if (taxMatch) iva = toForensicNumber(taxMatch[1]);
    
    const netMatch = text.match(/NetTotal>\s*([\d\.,]+)/i);
    if (netMatch) iliquido = toForensicNumber(netMatch[1]);
    
    if (iliquido === 0 && bruto > 0) iliquido = bruto - iva;
    
    VDCSystem.documents.saft.totals.bruto = (VDCSystem.documents.saft.totals.bruto || 0) + bruto;
    VDCSystem.documents.saft.totals.iva = (VDCSystem.documents.saft.totals.iva || 0) + iva;
    VDCSystem.documents.saft.totals.iliquido = (VDCSystem.documents.saft.totals.iliquido || 0) + iliquido;
    
    VDCSystem.analysis.extractedValues.saftBruto = VDCSystem.documents.saft.totals.bruto;
    logAudit(`SAF-T Regex: Bruto ${formatCurrency(bruto)}`, 'info');
}

function processStatementFile(text) {
    let ganhos = 0, comissao = 0;
    
    // PapaParse com delimiter automático
    const result = Papa.parse(text, { header: false, skipEmptyLines: true, delimiter: "auto" });
    
    if (result.data) {
        result.data.forEach(row => {
            row.forEach(cell => {
                const txt = (cell || '').toString().toLowerCase();
                const val = toForensicNumber(cell);
                
                if (val !== 0) {
                    // Lógica de keywords
                    if (txt.includes('earning') || txt.includes('ganho') || txt.includes('bolt') || txt.includes('uber') || txt.includes('freenow')) {
                        if (!txt.includes('comiss') && !txt.includes('fee') && !txt.includes('taxa')) {
                            ganhos += Math.abs(val);
                        }
                    }
                    if (txt.includes('comiss') || txt.includes('fee') || txt.includes('service') || txt.includes('taxa')) {
                        comissao += Math.abs(val);
                    }
                }
            });
        });
    }
    
    VDCSystem.documents.statements.totals.ganhosApp = (VDCSystem.documents.statements.totals.ganhosApp || 0) + ganhos;
    VDCSystem.documents.statements.totals.despesasComissao = (VDCSystem.documents.statements.totals.despesasComissao || 0) + comissao;
    
    VDCSystem.analysis.extractedValues.rendimentosBrutos = VDCSystem.documents.statements.totals.ganhosApp;
    VDCSystem.analysis.extractedValues.comissaoApp = -VDCSystem.documents.statements.totals.despesasComissao;
    logAudit(`Extrato: Ganhos ${formatCurrency(ganhos)}`, 'info');
}

function processInvoiceFile(text) {
    const matches = text.match(/(\d{1,3}[.,]\d{2})/g);
    if (matches) {
        const values = matches.map(m => toForensicNumber(m));
        const maxVal = Math.max(...values);
        VDCSystem.documents.invoices.totals.invoiceValue = (VDCSystem.documents.invoices.totals.invoiceValue || 0) + maxVal;
        VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue;
    }
}

// ============================================================================
// 8. UI & DASHBOARD
// ============================================================================
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
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const net = (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0);
    setElementText('statNet', formatCurrency(net));
    setElementText('statComm', formatCurrency(ev.comissaoApp || 0));
    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiNetValue', formatCurrency(net));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));
}

function updateModulesUI() {
    const doc = VDCSystem.documents;
    setElementText('saftBrutoValue', formatCurrency(doc.saft.totals.bruto || 0));
    setElementText('saftIvaValue', formatCurrency(doc.saft.totals.iva || 0));
    setElementText('saftIliquidoValue', formatCurrency(doc.saft.totals.iliquido || 0));
    setElementText('stmtGanhosValue', formatCurrency(doc.statements.totals.ganhosApp || 0));
}

function updateVerdictDisplay(verdict, delta) {
    const d = document.getElementById('verdictDisplay');
    if(d) {
        d.style.display = 'block';
        d.className = `verdict-display active verdict-${verdict.key}`;
    }
    setElementText('verdictLevel', verdict.level);
    document.getElementById('verdictLevel').style.color = verdict.color;
    setElementText('verdictPercentValue', verdict.percent);
    setElementText('verdictDesc', verdict.description);
    
    if(verdict.key === 'high') {
        document.getElementById('bigdataAlert').style.display = 'flex';
        document.getElementById('alertDeltaValue').textContent = `Δ = ${formatCurrency(delta)}`;
    }
}

// ============================================================================
// 9. AUDITORIA
// ============================================================================
function performAudit() {
    if(VDCSystem.processing) return;
    VDCSystem.processing = true;
    logAudit('INICIANDO PERÍCIA...', 'info');
    
    setTimeout(() => {
        const ev = VDCSystem.analysis.extractedValues;
        const saft = ev.saftBruto || 0;
        const app = ev.rendimentosBrutos || 0;
        const fat = ev.faturaPlataforma || 0;
        
        const delta = saft > 0 ? saft - fat : app - fat;
        const gross = saft > 0 ? saft : app;
        const verdict = getRiskVerdict(delta, gross);
        
        VDCSystem.analysis.verdict = verdict;
        ev.diferencialCusto = delta;
        
        updateVerdictDisplay(verdict, delta);
        updateChart();
        
        logAudit(`CONCLUÍDO: ${verdict.level}`, 'success');
        showToast(`Análise concluída: ${verdict.level}`, 'success');
        VDCSystem.processing = false;
    }, 1500);
}

function updateChart() {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return;
    if(VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['SAF-T', 'Ganhos App', 'Comissões', 'Faturado'],
            datasets: [{
                data: [ev.saftBruto||0, ev.rendimentosBrutos||0, Math.abs(ev.comissaoApp||0), ev.faturaPlataforma||0],
                backgroundColor: ['#00e5ff', '#10b981', '#ef4444', '#f59e0b']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// ============================================================================
// 10. DEMO MODE
// ============================================================================
function activateDemoMode() {
    logAudit('CARREGANDO CASO SIMULADO...', 'info');
    
    VDCSystem.client = { name: 'Demo Corp, Lda', nif: '503244732' };
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '503244732';
    registerClient();
    
    VDCSystem.documents.saft.totals.bruto = 12500.00;
    VDCSystem.documents.statements.totals.ganhosApp = 8500.00;
    VDCSystem.documents.statements.totals.despesasComissao = 2125.00;
    VDCSystem.documents.invoices.totals.invoiceValue = 9800.00;
    
    VDCSystem.analysis.extractedValues = {
        saftBruto: 12500.00,
        rendimentosBrutos: 8500.00,
        comissaoApp: -2125.00,
        faturaPlataforma: 9800.00
    };
    
    // Simular ficheiros
    VDCSystem.documents.saft.files = ['demo_saft.xml'];
    VDCSystem.documents.statements.files = ['demo_statement.csv'];
    VDCSystem.documents.invoices.files = ['demo_fatura.pdf'];
    
    updateDashboard();
    updateModulesUI();
    updateCounters();
    generateMasterHash();
    showToast('Caso simulado carregado', 'success');
}

// ============================================================================
// 11. PDF EXPORT (CORRIGIDO E TESTADO)
// ============================================================================
function exportPDF() {
    if (typeof window.jspdf === 'undefined') {
        showToast('Erro: Biblioteca jsPDF não carregada', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const t = translations[currentLang];
    const ev = VDCSystem.analysis.extractedValues;
    const verdict = VDCSystem.analysis.verdict || { level: 'PENDENTE', percent: '0%', description: 'Aguarda análise.', color: '#8c7ae6' };
    const client = VDCSystem.client || { name: 'N/A', nif: 'N/A' };
    
    // Header
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(22);
    doc.text('VDC FORENSE', 105, 15, { align: 'center' });
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(t.pdfTitle, 105, 25, { align: 'center' });
    
    let y = 45;
    
    // Dados
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(12);
    doc.text(t.pdfSection1, 14, y); y += 8;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`${t.pdfLabelName}: ${client.name}`, 14, y); y += 6;
    doc.text(`${t.pdfLabelNIF}: ${client.nif}`, 14, y); y += 6;
    doc.text(`${t.pdfLabelSession}: ${VDCSystem.sessionId}`, 14, y); y += 10;
    
    doc.setTextColor(0, 229, 255);
    doc.text(t.pdfSection2, 14, y); y += 8;
    
    doc.setTextColor(60, 60, 60);
    doc.text(`SAF-T Bruto: ${formatCurrency(ev.saftBruto || 0)}`, 14, y); y += 6;
    doc.text(`Ganhos App: ${formatCurrency(ev.rendimentosBrutos || 0)}`, 14, y); y += 6;
    doc.text(`Delta: ${formatCurrency(ev.diferencialCusto || 0)}`, 14, y); y += 10;
    
    // Veredicto com Lógica de Cor Corrigida
    doc.setTextColor(0, 229, 255);
    doc.text(t.pdfSection3, 14, y); y += 8;
    
    // Lógica de cor simplificada e segura
    let r = 139, g = 92, b = 246; // Roxo default
    if (verdict.color === '#ef4444') { r = 239; g = 68; b = 68; } // Vermelho
    else if (verdict.color === '#f59e0b') { r = 245; g = 158; b = 11; } // Laranja
    else if (verdict.color === '#44bd32') { r = 68; g = 189; b = 50; } // Verde
    
    doc.setTextColor(r, g, b);
    doc.setFontSize(14);
    doc.text(`VEREDICTO: ${verdict.level}`, 14, y); y += 8;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(`Desvio: ${verdict.percent}`, 14, y); y += 20;
    
    // Footer
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(t.pdfFooterLine1, 105, 290, { align: 'center' });
    
    doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
    logAudit('PDF exportado com sucesso', 'success');
    showToast('PDF gerado', 'success');
}

// ============================================================================
// 12. UTILS FINAIS
// ============================================================================
function exportDataJSON() {
    const data = { system: VDCSystem.version, session: VDCSystem.sessionId, analysis: VDCSystem.analysis };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_Export_${VDCSystem.sessionId}.json`;
    a.click();
}

function generateMasterHash() {
    const str = JSON.stringify(VDCSystem.documents) + VDCSystem.sessionId;
    const hash = CryptoJS.SHA256(str).toString();
    setElementText('masterHashValue', hash.substring(0, 24) + '...');
}

function logAudit(msg, type = 'info') {
    const el = document.getElementById('consoleOutput');
    if(!el) return;
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.textContent = `[${time}] ${msg}`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if(!c) return;
    const t = document.createElement('div');
    t.className = `toast-notification ${type}`;
    t.innerHTML = `<i class="fas fa-info-circle"></i><p>${msg}</p>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// FIM
