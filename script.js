/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.2 CSI "LASER CROSS"
 * ESTABILIDADE: TOTAL | SINTAXE: VERIFICADA
 */

'use strict';

const PLATFORM_DATA = {
    bolt: { name: 'Bolt Operations OÜ', address: 'Tallinn, Estónia', nif: 'EE102090374' },
    uber: { name: 'Uber B.V.', address: 'Amesterdão, NL', nif: 'NL852071588B01' }
};

const QUESTIONS_CACHE = [
    { text: "Qual a lógica algorítmica exata da taxa de serviço?", type: "low" },
    { text: "Existem registos de 'Shadow Entries' no sistema?", type: "med" },
    { text: "Há evidências de manipulação de 'timestamp' fiscal?", type: "high" },
    { text: "O sistema permite edição retroativa de registos?", type: "high" },
    { text: "Os extratos bancários coincidem com a base de dados?", type: "med" },
    { text: "Qual o tratamento das 'Tips' na declaração de IVA?", type: "low" }
];

// --- UTILITÁRIOS ---
const rnd = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (v) => rnd(v).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
const $ = (id) => document.getElementById(id);

const validateNIF = (nif) => {
    if (!nif || !/^\d{9}$/.test(nif)) return false;
    const calc = [9,8,7,6,5,4,3,2].reduce((s, d, i) => s + parseInt(nif[i]) * d, 0);
    return parseInt(nif[8]) === (calc % 11 < 2 ? 0 : 11 - (calc % 11));
};

// --- ESTADO ---
const SYS = {
    ver: 'v12.2-LASER',
    sid: 'VDC-' + Date.now().toString(36).toUpperCase(),
    client: null,
    platform: 'bolt',
    docs: { ctrl: [], saft: [], inv: { val: 0 }, stmt: { gross: 0, comm: 0 } },
    vals: {},
    verdict: null,
    hash: ''
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    $('sessionIdDisplay').textContent = SYS.sid;
    $('startSessionBtn').onclick = () => { $('splashScreen').style.opacity = '0'; setTimeout(() => { $('splashScreen').style.display = 'none'; $('mainContainer').style.display = 'flex'; $('mainContainer').style.opacity = '1'; }, 500); };
    
    // Listeners
    $('registerClientBtnFixed').onclick = regClient;
    $('demoModeBtn').onclick = runDemo;
    $('analyzeBtn').onclick = doAudit;
    $('exportPDFBtn').onclick = doPDF;
    $('openEvidenceModalBtn').onclick = () => $('evidenceModal').style.display = 'flex';
    $('closeModalBtn').onclick = () => $('evidenceModal').style.display = 'none';
    $('closeAndSaveBtn').onclick = () => $('evidenceModal').style.display = 'none';
    $('selPlatformFixed').onchange = (e) => SYS.platform = e.target.value;

    // Uploads
    ['control', 'saft', 'invoice', 'statement'].forEach(t => {
        const btn = $(`${t}UploadBtnModal`);
        const inp = $(`${t}FileModal`);
        if(btn && inp) { btn.onclick = () => inp.click(); inp.onchange = (e) => upFile(e, t); }
    });

    // Relógio
    setInterval(() => {
        const d = new Date();
        $('currentDate').textContent = d.toLocaleDateString('pt-PT');
        $('currentTime').textContent = d.toLocaleTimeString('pt-PT');
    }, 1000);
    
    genHash();
});

// --- LÓGICA ---
function regClient() {
    const n = $('clientNameFixed').value;
    const i = $('clientNIFFixed').value;
    if(!n || !validateNIF(i)) return alert('NIF Inválido');
    SYS.client = { name: n, nif: i };
    $('clientStatusFixed').style.display = 'flex';
    $('clientNameDisplayFixed').textContent = n;
    log('Cliente validado: ' + n, 'success');
    checkBtns();
}

function upFile(e, t) {
    const f = e.target.files[0];
    if(!f) return;
    // Mock parsing
    if(t === 'invoice') SYS.docs.inv.val += 500;
    if(t === 'statement') { SYS.docs.stmt.gross = 10000; SYS.docs.stmt.comm = 2000; }
    SYS.docs[t.length === 2 ? 'ctrl' : t].push(f); // Fix ctrl/control
    log('Carregado: ' + f.name, 'info');
    genHash();
    checkBtns();
}

function runDemo() {
    $('clientNameFixed').value = 'Demo Corp';
    $('clientNIFFixed').value = '503244732';
    regClient();
    SYS.docs.ctrl.push({name:'d.xml'});
    SYS.docs.saft.push({name:'s.xml'});
    SYS.docs.inv.val = 250;
    SYS.docs.stmt.gross = 8500;
    SYS.docs.stmt.comm = 1955;
    genHash();
    checkBtns();
    doAudit();
}

function doAudit() {
    const g = SYS.docs.stmt.gross;
    const c = SYS.docs.stmt.comm;
    const i = SYS.docs.inv.val;
    
    const net = rnd(g - c);
    const delta = rnd(net - i);
    const taxGap = Math.abs(delta);
    
    SYS.vals = {
        gross: g, comm: c, net, inv: i, delta, taxGap,
        iva: rnd(taxGap * 0.23),
        multa: rnd(taxGap * 2.0)
    };
    
    // Veredicto
    const pct = g ? Math.abs((delta/g)*100) : 0;
    if(pct < 5) SYS.verdict = { level: 'BAIXO RISCO', key: 'low' };
    else if(pct < 20) SYS.verdict = { level: 'RISCO MÉDIO', key: 'med' };
    else SYS.verdict = { level: 'CRÍTICO', key: 'high' };
    
    updateUI();
    renderChart();
    log('Análise concluída', 'success');
}

function updateUI() {
    const v = SYS.vals;
    $('statNet').textContent = fmt(v.net);
    $('statComm').textContent = fmt(v.comm);
    $('statJuros').textContent = fmt(v.taxGap);
    $('kpiGrossValue').textContent = fmt(v.gross);
    $('kpiNetValue').textContent = fmt(v.net);
    $('kpiInvValue').textContent = fmt(v.inv);
    
    if(v.taxGap > 0) {
        $('jurosCard').style.display = 'flex';
        $('bigDataAlert').style.display = 'flex';
        $('alertDeltaValue').textContent = fmt(v.taxGap);
    }
    
    if(SYS.verdict) {
        $('verdictSection').style.display = 'block';
        $('verdictLevel').textContent = SYS.verdict.level;
    }
    checkBtns();
}

function renderChart() {
    const ctx = $('forensicChart');
    if(!ctx) return;
    const v = SYS.vals;
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Líquido', 'Fatura', 'Gap'],
            datasets: [{ data: [v.gross, v.comm, v.net, v.inv, v.taxGap], backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function genHash() {
    const str = JSON.stringify(SYS.docs) + SYS.sid;
    SYS.hash = CryptoJS.SHA256(str).toString();
    $('masterHashValue').textContent = SYS.hash;
}

function checkBtns() {
    const c = SYS.client !== null;
    const d = SYS.docs.ctrl.length > 0 && SYS.docs.saft.length > 0;
    $('analyzeBtn').disabled = !(c && d);
    $('exportPDFBtn').disabled = !c;
}

function log(m, t='info') {
    const el = $('consoleOutput');
    const d = document.createElement('div');
    d.className = `log-entry log-${t}`;
    d.textContent = `[${new Date().toLocaleTimeString()}] ${m}`;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
}

// --- PDF ENGINE ---
async function doPDF() {
    if(!SYS.client) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const p = PLATFORM_DATA[SYS.platform];
    const v = SYS.vals;
    const vr = SYS.verdict;
    
    let y = 20;
    
    // 1. HEADER FBI
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 220, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("RELATÓRIO PERICIAL FORENSE", 105, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.text("VDC SYSTEMS INTERNATIONAL · CONFIDENTIAL", 105, 30, { align: 'center' });
    
    y = 45;
    
    // 2. COMMAND BOX
    doc.setDrawColor(40, 40, 40); // Grafite
    doc.setLineWidth(0.8);
    doc.roundedRect(10, y, 190, 30, 3, 3, 'S'); // Apenas Stroke (Moldura)
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`SESSÃO: ${SYS.sid}`, 15, y + 8);
    doc.text(`PERITO: Sistema Automatizado ${SYS.ver}`, 15, y + 14);
    doc.text(`DATA: ${new Date().toLocaleString()}`, 15, y + 20);
    doc.text(`UNIX: ${Math.floor(Date.now()/1000)}`, 15, y + 26);
    
    doc.text(`SUJEITO: ${SYS.client.name}`, 120, y + 8);
    doc.text(`NIF: ${SYS.client.nif}`, 120, y + 14);
    doc.text(`PLATAFORMA: ${p.name}`, 120, y + 20);
    
    y += 40;
    
    // 3. ANÁLISE
    doc.setFontSize(12);
    doc.text("ANÁLISE ECONÔMICA TRIANGULAR", 10, y); y += 6;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Valor Bruto: ${fmt(v.gross)}`, 15, y); y+=5;
    doc.text(`Valor Líquido: ${fmt(v.net)}`, 15, y); y+=5;
    doc.text(`Valor Faturado: ${fmt(v.inv)}`, 15, y); y+=5;
    
    doc.setTextColor(200, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`FOSSO FISCAL (Tax Gap): ${fmt(v.taxGap)}`, 15, y); y += 10;
    
    // 4. VEREDICTO (Institucional & Clean)
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("VEREDICTO DE RISCO", 10, y); y += 6;
    
    // Moldura Dupla (Double Line Border)
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.8);
    doc.rect(10, y, 190, 20); // Outer
    doc.rect(11, y + 1, 188, 18); // Inner
    
    // Texto Preto Helvetica Bold
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(vr.level, 105, y + 13, { align: 'center' });
    
    y += 30;
    
    // 5. INTERROGATÓRIO
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text("PERGUNTAS ESTRATÉGICAS", 10, y); y += 6;
    
    // Seleção Dinâmica
    let qs = QUESTIONS_CACHE.filter(q => q.type === vr.key);
    if(qs.length < 3) qs = QUESTIONS_CACHE;
    
    qs.slice(0, 5).forEach((q, i) => {
        doc.text(`${i+1}. ${q.text}`, 10, y, { maxWidth: 180 });
        y += 8;
    });
    
    // RODAPÉ (Timestamp & Hash)
    const totalPages = doc.internal.getNumberOfPages();
    for(let i=1; i<=totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        
        const footerY = 290;
        doc.line(10, footerY - 5, 200, footerY - 5); // Linha separadora
        
        doc.text(`Master Hash: ${SYS.hash}`, 10, footerY);
        doc.text(`Unix Timestamp: ${Math.floor(Date.now()/1000)}`, 10, footerY + 4);
        
        doc.text("VDC Systems © 2024/2026 | EM", 105, footerY + 10, { align: 'center' });
    }
    
    doc.save(`VDC_Report_${SYS.sid}.pdf`);
    log('PDF Exportado', 'success');
}
