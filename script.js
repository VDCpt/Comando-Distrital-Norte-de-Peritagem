/**
 * VDC FORENSE v12.6 | CYBER CYAN EDITION
 * LÓGICA BIG DATA E CRUZAMENTO FORENSE
 */

'use strict';

// ============================================================================
// 1. ESTADO GLOBAL E CONFIGURAÇÃO
// ============================================================================
const VDC = {
    version: 'v12.6-FINAL',
    session: 'VDC-' + Date.now().toString(36).toUpperCase(),
    client: null,
    files: {
        saft: [],
        invoice: [],
        statement: []
    },
    data: {
        saft: { bruto: 0, comis: 0, liquido: 0, faturado: 0 },
        ext: { bruto: 0, comis: 0, liquido: 0, faturado: 0 },
        delta: 0
    },
    verdict: { level: 'AGUARDANDO', color: '#64748b' }
};

// ============================================================================
// 2. UTILITÁRIOS
// ============================================================================
const log = (msg, type = 'info') => {
    const el = document.getElementById('consoleOutput');
    if (!el) return;
    const line = document.createElement('div');
    line.className = `log-${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
};

const formatCurr = (v) => {
    if (isNaN(v) || v === null) v = 0;
    return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
};

const parseNum = (str) => {
    if (!str) return 0;
    // Limpa tudo exceto números, ponto, vírgula, hífen
    let c = String(str).replace(/[^\d.,-]/g, '');
    // Detecta formato PT (1.000,50) vs EN (1,000.50)
    if (c.includes(',') && c.includes('.')) {
        // Se vírgula depois do ponto -> PT (ponto é milhares)
        if (c.lastIndexOf(',') > c.lastIndexOf('.')) c = c.replace(/\./g, '').replace(',', '.');
        // Senão -> EN (vírgula é milhares)
        else c = c.replace(/,/g, '');
    } else if (c.includes(',')) c = c.replace(',', '.');
    
    let n = parseFloat(c);
    return isNaN(n) ? 0 : n;
};

const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatCurr(val);
};

const show = (id) => document.getElementById(id).style.display = 'flex';
const hide = (id) => document.getElementById(id).style.display = 'none';

// ============================================================================
// 3. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Splash Screen
    document.getElementById('startSessionBtn')?.addEventListener('click', () => {
        document.getElementById('splashScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'block';
            initSystem();
        }, 500);
    });

    // Modal Listeners
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => show('evidenceModal'));
    document.getElementById('closeModalBtn')?.addEventListener('click', () => hide('evidenceModal'));
    document.getElementById('sealEvidenceBtn')?.addEventListener('click', () => {
        hide('evidenceModal');
        crossData(); // Executa cruzamento ao selar
    });

    // Upload Listeners (Conectando botões aos inputs)
    setupUpload('uploadSaftBtn', 'inputSaft', 'saft', 'saftFileList');
    setupUpload('uploadInvoiceBtn', 'inputInvoice', 'invoice', 'invoiceFileList');
    setupUpload('uploadStatementBtn', 'inputStatement', 'statement', 'statementFileList');

    // Ações
    document.getElementById('registerClientBtn')?.addEventListener('click', registerClient);
    document.getElementById('analyzeBtn')?.addEventListener('click', analyze);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('clearBtn')?.addEventListener('click', () => location.reload());
    document.getElementById('demoModeBtn')?.addEventListener('click', runDemo);
    
    // Preencher Anos
    const yearSel = document.getElementById('yearSelect');
    for(let y=2030; y>=2015; y--) yearSel.appendChild(new Option(y, y));
    yearSel.value = new Date().getFullYear();
});

function initSystem() {
    log('SISTEMA VDC v12.6 INICIADO', 'success');
    log('Motor de Regex Universal pronto.', 'info');
    document.getElementById('sessionIdDisplay').textContent = VDC.session;
}

function registerClient() {
    const name = document.getElementById('clientName').value || 'CLIENTE_GENÉRICO';
    const nif = document.getElementById('clientNIF').value || '999999990';
    VDC.client = { name, nif };
    document.getElementById('clientStatus').textContent = `Validado: ${name}`;
    document.getElementById('clientStatus').style.display = 'block';
    log(`Cliente validado: ${name}`, 'success');
}

// ============================================================================
// 4. GESTÃO DE FICHEIROS (UPLOAD E RENDER)
// ============================================================================

function setupUpload(btnId, inputId, type, listId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    btn.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => handleFiles(e.target.files, type, listId));
}

async function handleFiles(files, type, listId) {
    for (const file of files) {
        try {
            const text = await readFile(file);
            const hash = CryptoJS.SHA256(text).toString().substring(0,8);
            
            // 1. Guardar no Estado
            VDC.files[type].push({ name: file.name, hash, text });
            
            // 2. RENDERIZAÇÃO IMEDIATA (OBRIGATÓRIO)
            renderFileList(listId, file.name, hash);

            // 3. Processar Dados (Regex)
            if (type === 'saft') processSaft(text);
            if (type === 'statement') processStatement(text);
            
            log(`Ficheiro "${file.name}" processado.`, 'success');
            
            // 4. Desbloquear PDF
            document.getElementById('exportPDFBtn').disabled = false;
            updateBadge();

        } catch (err) {
            log(`Erro em ${file.name}: ${err}`, 'error');
        }
    }
    // Atualizar Dashboard após loop
    updateDashboard();
}

function renderFileList(listId, name, hash) {
    const list = document.getElementById(listId);
    if (!list) return;

    // Cria item visual imediatamente
    const item = document.createElement('div');
    item.className = 'file-item-visible';
    item.innerHTML = `
        <span><i class="fas fa-check-circle"></i> ${name}</span>
        <small>#${hash}</small>
    `;
    
    // Anexa ao container
    list.appendChild(item);
    
    // Garante visibilidade
    list.style.display = 'block';
}

const readFile = (file) => {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.onerror = rej;
        reader.readAsText(file);
    });
};

function updateBadge() {
    const total = VDC.files.saft.length + VDC.files.invoice.length + VDC.files.statement.length;
    document.getElementById('fileCountBadge').textContent = total;
}

// ============================================================================
// 5. MOTORES DE EXTRAÇÃO (REGEX UNIVERSAL)
// ============================================================================

function processSaft(text) {
    log("Extraindo dados SAF-T via Regex...", "info");
    
    // Tenta encontrar TotalCredit ou TotalDebit
    const creditMatch = text.match(/TotalCredit>\s*([\d\.,]+)/i);
    const debitMatch = text.match(/TotalDebit>\s*([\d\.,]+)/i);
    const grossMatch = text.match(/GrossTotal>\s*([\d\.,]+)/i);
    
    let val = 0;
    if (creditMatch) val = parseNum(creditMatch[1]);
    else if (debitMatch) val = parseNum(debitMatch[1]);
    else if (grossMatch) val = parseNum(grossMatch[1]);
    
    // Se não achar tags, procura por totais genéricos
    if (val === 0) {
        const genMatch = text.match(/Total\s*[:=]?\s*([\d\.,]+)/i);
        if (genMatch) val = parseNum(genMatch[1]);
    }

    // Atualiza Estado
    VDC.data.saft.bruto = val;
    VDC.data.saft.faturado = val; // Assumindo que bruto = faturado para cruzamento
    log(`SAF-T Extraído: ${formatCurr(val)}`, "info");
}

function processStatement(text) {
    log("Extraindo dados Extrato via Regex...", "info");
    
    let total = 0;
    let fees = 0;
    
    // Tenta CSV Parse primeiro
    const result = Papa.parse(text, { header: false, skipEmptyLines: true });
    
    if (result.data.length > 0) {
        result.data.forEach(row => {
            row.forEach(cell => {
                const str = String(cell).toLowerCase();
                const n = parseNum(cell);
                
                if (n !== 0) {
                    // Classificação por Keyword
                    if (str.includes('fee') || str.includes('commission') || str.includes('service')) {
                        fees += Math.abs(n);
                    } else if (str.includes('total') || str.includes('earning') || str.includes('credit') || str.includes('deposit')) {
                        // Evita somar o total geral se tivermos valores unitários, mas aqui assumimos extração bruta
                        // Lógica simplificada: soma tudo que parece valor positivo
                         total += n > 0 ? n : 0;
                    } else {
                        // Fallback: Soma valores positivos genéricos
                         total += n > 0 ? n : 0;
                    }
                }
            });
        });
    }
    
    // Regex Fallback
    if (total === 0) {
        const vals = text.match(/(\d{1,3}[.,]\d{2})/g);
        if (vals) vals.forEach(v => total += parseNum(v));
    }

    VDC.data.ext.bruto = total;
    VDC.data.ext.comis = fees;
    VDC.data.ext.liquido = total - fees;
    log(`Extrato Extraído: Bruto ${formatCurr(total)}`, "info");
}

// ============================================================================
// 6. CRUZAMENTO E UI
// ============================================================================

function crossData() {
    log("A executar cruzamento de dados...", "warn");
    
    // Cálculo da Discrepância
    // Faturado (SAF-T) vs Bruto Real (Extratos)
    const saftVal = VDC.data.saft.faturado;
    const extVal = VDC.data.ext.bruto;
    
    const delta = extVal - saftVal;
    VDC.data.delta = delta;
    
    // Atualiza Janela B (Ext Faturado/Discrepância)
    setVal('extFaturado', delta);
    
    // Muda cor se houver discrepância significativa
    const discEl = document.getElementById('extFaturado');
    if (Math.abs(delta) > 0.01) {
        discEl.style.color = '#ef4444'; // Vermelho
        discEl.style.fontWeight = '900';
        log("DISCREPÂNCIA DETETADA!", "error");
    } else {
        discEl.style.color = '#10b981'; // Verde
        log("Valores concordantes.", "success");
    }
    
    analyze(); // Atualiza Veredicto
}

function updateDashboard() {
    // Janela A
    setVal('saftBruto', VDC.data.saft.bruto);
    setVal('saftComissoes', VDC.data.saft.comis);
    setVal('saftLiquido', VDC.data.saft.liquido);
    setVal('saftFaturado', VDC.data.saft.faturado);

    // Janela B
    setVal('extBruto', VDC.data.ext.bruto);
    setVal('extComissoes', VDC.data.ext.comis);
    setVal('extLiquido', VDC.data.ext.liquido);
}

function analyze() {
    const delta = VDC.data.delta;
    let verdict = { level: 'SEM DADOS', color: '#64748b' };
    
    if (VDC.data.ext.bruto > 0 || VDC.data.saft.bruto > 0) {
        if (delta > 0.01) {
            verdict = { level: 'CRÍTICO: SUB-DECLARAÇÃO', color: '#ef4444' };
        } else if (delta < -0.01) {
            verdict = { level: 'ALERTA: SOBRE-DECLARAÇÃO', color: '#f59e0b' };
        } else {
            verdict = { level: 'CONFORME', color: '#10b981' };
        }
    }
    
    VDC.verdict = verdict;
    
    document.getElementById('verdictText').textContent = verdict.level;
    document.getElementById('verdictText').style.color = verdict.color;
    document.getElementById('verdictBox').style.borderColor = verdict.color;
}

// ============================================================================
// 7. RELATÓRIO PDF
// ============================================================================

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(22);
    doc.text('VDC FORENSE v12.6', 105, 20, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('RELATÓRIO DE CRUZAMENTO DE DADOS', 105, 30, { align: 'center' });
    
    // Body
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    
    let y = 50;
    doc.text(`Cliente: ${VDC.client?.name || 'NÃO DEFINIDO'}`, 14, y); y+=10;
    doc.text(`Sessão: ${VDC.session}`, 14, y); y+=15;
    
    doc.setTextColor(0, 229, 255);
    doc.text('ANÁLISE SAF-T', 14, y); y+=7;
    doc.setTextColor(50, 50, 50);
    doc.text(`Bruto Declarado: ${formatCurr(VDC.data.saft.bruto)}`, 14, y); y+=15;
    
    doc.setTextColor(0, 229, 255);
    doc.text('ANÁLISE EXTRATOS', 14, y); y+=7;
    doc.setTextColor(50, 50, 50);
    doc.text(`Bruto Real: ${formatCurr(VDC.data.ext.bruto)}`, 14, y); y+=10;
    
    doc.setTextColor(239, 68, 68); // Vermelho
    doc.setFontSize(14);
    doc.text(`DISCREPÂNCIA: ${formatCurr(VDC.data.delta)}`, 14, y); y+=20;
    
    doc.setFontSize(16);
    doc.text(`VEREDICTO: ${VDC.verdict.level}`, 14, y);
    
    doc.save(`VDC_Relatorio_${VDC.session}.pdf`);
    log('PDF Exportado com Sucesso', 'success');
}

// ============================================================================
// 8. DEMO
// ============================================================================

function runDemo() {
    VDC.client = { name: 'DEMONSTRAÇÃO LDA', nif: '999999990' };
    document.getElementById('clientName').value = VDC.client.name;
    registerClient();
    
    // Simular Dados
    VDC.data.saft.bruto = 5000;
    VDC.data.saft.faturado = 5000;
    
    VDC.data.ext.bruto = 7500;
    VDC.data.ext.comis = 500;
    VDC.data.ext.liquido = 7000;
    
    // Render Fake Files
    renderFileList('saftFileList', 'demo_saft.xml', 'a1b2c3d4');
    renderFileList('statementFileList', 'demo_bank.csv', 'e5f6g7h8');
    updateBadge();
    
    updateDashboard();
    crossData();
    
    showToast('Caso Simulado Carregado', 'success');
}

function showToast(msg, type) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
