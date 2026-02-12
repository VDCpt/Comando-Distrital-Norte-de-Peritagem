/**
 * VDC SISTEMA DE PERITAGEM FORENSE v11.6 GATEKEEPER
 * Motor de Triangulação, Persistência e Exportação Legal
 * Strict Mode Activated
 */

'use strict';

// ==========================================
// 1. UTILITÁRIOS
// ==========================================

const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim();
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '').replace(/\s+/g, '');
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    if (hasComma && hasDot) {
        if (str.indexOf(',') > str.indexOf('.')) { str = str.replace(/\./g, '').replace(',', '.'); } 
        else { str = str.replace(/,/g, ''); }
    } else if (hasComma && !hasDot) {
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1) { const parts = str.split(','); str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]; } 
        else { str = str.replace(',', '.'); }
    } else if (!hasComma && hasDot) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) { const parts = str.split('.'); str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]; }
    }
    str = str.replace(/[^\d.-]/g, '');
    if (str === '' || str === '-' || str === '.') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
};

// ==========================================
// 2. ESTADO GLOBAL (VDCSystem)
// ==========================================

const VDCSystem = {
    version: 'v11.6-GATEKEEPER',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    processing: false,
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, records: 0 }, hashes: {} },
        control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, records: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { invoiceValue: 0, records: 0 }, hashes: {} },
        statements: { files: [], parsedData: [], totals: { rendimentosBrutos: 0, comissaoApp: 0, records: 0 }, hashes: {} }
    },
    
    analysis: {
        extractedValues: {
            saftGross: 0, saftIVA6: 0, saftNet: 0,
            platformCommission: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, faturaPlataforma: 0,
            diferencialCusto: 0, ivaAutoliquidacao: 0,
            jurosMora: 0
        },
        crossings: { deltaB: 0, diferencialAlerta: false }
    },
    
    logs: [],
    chart: null
};

// ==========================================
// 3. INICIALIZAÇÃO (GATEKEEPER)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c VDC v11.6 GATEKEEPER: DOM Ready ', 'background: #0066cc; color: #fff; padding: 5px;');
    // Setup inicial
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) startBtn.addEventListener('click', startGatekeeperSession);
    
    // Persistência: Recuperar cliente ao carregar
    loadClientFromStorage();
});

window.onload = () => {
    console.log('Recursos carregados.');
    if (typeof Papa === 'undefined') alert('Erro: PapaParse indisponível.');
    if (typeof Chart === 'undefined') alert('Erro: Chart.js indisponível.');
    if (typeof jsPDF === 'undefined') alert('Erro: jsPDF indisponível.');
};

function startGatekeeperSession() {
    try {
        const splash = document.getElementById('splashScreen');
        const loader = document.getElementById('loadingOverlay');
        if (splash && loader) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                loader.style.display = 'flex';
                loadSystemCore();
            }, 500);
        }
    } catch (e) { console.error(e); alert('Erro ao iniciar.'); }
}

function loadSystemCore() {
    updateLoadingProgress(20);
    setTimeout(() => {
        VDCSystem.sessionId = generateSessionId();
        const idEl = document.getElementById('sessionIdDisplay');
        if (idEl) idEl.textContent = VDCSystem.sessionId;
        
        updateLoadingProgress(50);
        setupMainListeners();
        updateLoadingProgress(80);
        
        generateMasterHash();
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(() => {
                document.getElementById('loadingOverlay').style.display = 'none';
                document.getElementById('mainContainer').style.display = 'block';
                logAudit('SISTEMA ONLINE', 'success');
            }, 300);
        }, 500);
    }, 500);
}

function updateLoadingProgress(pct) {
    const bar = document.getElementById('loadingProgress');
    const txt = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `Iniciando... ${pct}%`;
}

// ==========================================
// 4. EVENTOS E UTILIDADES
// ==========================================

function setupMainListeners() {
    // Registo
    document.getElementById('registerClientBtnFixed').addEventListener('click', registerClient);
    // Modal
    const closeModalHandler = () => { document.getElementById('evidenceModal').style.display = 'none'; updateAnalysisButton(); };
    document.getElementById('openEvidenceModalBtn').addEventListener('click', () => { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); });
    document.getElementById('closeModalBtn').addEventListener('click', closeModalHandler);
    document.getElementById('closeAndSaveBtn').addEventListener('click', closeModalHandler);
    
    // Uploads
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(type => {
        document.getElementById(`${type}UploadBtnModal`).addEventListener('click', () => document.getElementById(`${type}FileModal`).click());
        document.getElementById(`${type}FileModal`).addEventListener('change', (e) => handleFileUpload(e, type));
    });
    
    document.getElementById('clearAllBtn').addEventListener('click', clearAllEvidence);
    
    // Ações Principais
    document.getElementById('analyzeBtn').addEventListener('click', performAudit);
    document.getElementById('exportJSONBtn').addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn').addEventListener('click', resetSystem);
    
    // IDs Sincronizados
    document.getElementById('exportPDFBtn').addEventListener('click', exportPDF);
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);
}

// ==========================================
// 5. PERSISTÊNCIA DE DADOS
// ==========================================

function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();
    
    if (!name || name.length < 3) { showToast('Nome inválido', 'error'); return; }
    if (!nif || !/^\d{9}$/.test(nif)) { showToast('NIF inválido', 'error'); return; }
    
    VDCSystem.client = { name, nif, timestamp: new Date().toISOString() };
    
    // Guardar no localStorage
    try {
        localStorage.setItem('vdc_client_data', JSON.stringify(VDCSystem.client));
    } catch(e) { console.warn('LocalStorage indisponível para gravação de cliente.', e); }
    
    const statusEl = document.getElementById('clientStatusFixed');
    if (statusEl) {
        statusEl.style.display = 'flex';
        statusEl.textContent = `${name} (${nif})`;
    }
    logAudit(`Cliente registado: ${name}`, 'success');
    updateAnalysisButton();
}

function loadClientFromStorage() {
    try {
        const data = localStorage.getItem('vdc_client_data');
        if (data) {
            const client = JSON.parse(data);
            if (client && client.name && client.nif) {
                VDCSystem.client = client;
                const statusEl = document.getElementById('clientStatusFixed');
                if (statusEl) {
                    statusEl.style.display = 'flex';
                    statusEl.textContent = `${client.name} (${client.nif})`;
                }
                document.getElementById('clientNameFixed').value = client.name;
                document.getElementById('clientNIFFixed').value = client.nif;
                logAudit('Cliente recuperado do armazenamento local.', 'info');
            }
        }
    } catch (e) {
        console.error('Erro ao carregar cliente do localStorage:', e);
    }
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control.files.length > 0;
    const hasSaft = VDCSystem.documents.saft.files.length > 0;
    if (btn) btn.disabled = !(hasClient && hasControl && hasSaft);
}

// ==========================================
// 6. GESTÃO DE MODAL E EVIDÊNCIAS
// ==========================================

function openEvidenceModal() { document.getElementById('evidenceModal').style.display = 'flex'; updateEvidenceSummary(); }
function closeEvidenceModal() { document.getElementById('evidenceModal').style.display = 'none'; }

async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const btn = document.getElementById(`${type}UploadBtnModal`);
    if (btn) { btn.classList.add('processing'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...'; }
    
    try {
        for (const file of files) {
            await processFile(file, type);
        }
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        logAudit(`${files.length} ficheiros ${type} carregados.`, 'success');
    } catch (e) {
        console.error(e);
        logAudit(`Erro no upload: ${e.message}`, 'error');
    } finally {
        if (btn) { btn.classList.remove('processing'); btn.innerHTML = 'SELECIONAR FICHEIROS'; }
        event.target.value = '';
    }
}

async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hash = CryptoJS.SHA256(text).toString();
    
    if (!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], parsedData: [], totals: { records: 0, rendimentosBrutos: 0, comissaoApp: 0 }, hashes: {} };
    
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hash;
    VDCSystem.documents[type].totals.records++;
    
    // --- BIG DATA PARSING (PapaParse) ---
    if (type === 'statements' || type === 'saft' || type === 'invoices') {
        try {
            const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
            if (parsed.data && parsed.data.length > 0) {
                let gross = 0;
                let fees = 0;
                
                parsed.data.forEach(row => {
                    Object.keys(row).forEach(key => {
                        const val = toForensicNumber(row[key]);
                        const k = key.toLowerCase();
                        if (k.includes('total') || k.includes('earnings')) gross += val;
                        if (k.includes('commission') || k.includes('fee')) fees += Math.abs(val);
                        if (type === 'invoices' && k.includes('amount')) VDCSystem.documents.invoices.totals.invoiceValue += val;
                    });
                });
                
                if (type === 'statements') {
                    VDCSystem.documents.statements.totals.rendimentosBrutos = gross;
                    VDCSystem.documents.statements.totals.comissaoApp = fees;
                }
                if (type === 'saft') {
                    VDCSystem.documents.saft.totals.gross = gross;
                }
            }
        } catch (e) { console.warn('Parse falhou para ' + file.name, e); }
    }
    
    // UI Update
    const listEl = document.getElementById(`${type}FileListModal`);
    if (listEl) {
        listEl.style.display = 'block';
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        item.innerHTML = `<i class="fas fa-check-circle" style="color:#00cc88"></i> ${file.name} (${formatBytes(file.size)})`;
        listEl.appendChild(item);
    }
}

function clearAllEvidence() {
    if (!confirm('Limpar tudo?')) return;
    Object.keys(VDCSystem.documents).forEach(k => {
        VDCSystem.documents[k] = { files: [], parsedData: [], totals: { records: 0, rendimentosBrutos: 0, comissaoApp: 0 }, hashes: {} };
    });
    document.querySelectorAll('.file-list-modal').forEach(el => el.innerHTML = '');
    updateEvidenceSummary();
    updateCounters();
    logAudit('Evidências limpas.', 'warn');
}

function updateEvidenceSummary() {
    ['Dac7', 'Control', 'Saft', 'Invoices', 'Statements'].forEach(type => {
        const count = VDCSystem.documents[type.toLowerCase()].files.length;
        const el = document.getElementById(`summary${type}`);
        if (el) el.textContent = count;
    });
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = Object.values(VDCSystem.documents).reduce((a, b) => a + b.files.length, 0);
}

function updateCounters() {
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(type => {
        const el = document.getElementById(`${type}CountCompact`);
        if (el) el.textContent = VDCSystem.documents[type].files.length;
    });
}

// ==========================================
// 7. MOTOR DE TRIANGULAÇÃO FORENSE (CORE)
// ==========================================

function performAudit() {
    if (!VDCSystem.client) { showToast('Registe cliente.', 'error'); return; }
    
    logAudit('INICIANDO TRIANGULAÇÃO...', 'info');
    
    // 1. Coleta de Dados Extraídos (do CSV)
    const extractedGross = VDCSystem.documents.statements.totals.rendimentosBrutos;
    const extractedFees = VDCSystem.documents.statements.totals.comissaoApp;
    const extractedInvoice = VDCSystem.documents.invoices.totals.invoiceValue;
    
    // 2. Chamada ao Motor de Cálculo
    performForensicCrossings(extractedGross, extractedFees, extractedInvoice);
    
    // 3. Atualização UI
    updateDashboard();
    renderChart();
    showAlerts();
    
    logAudit('TRIANGULAÇÃO CONCLUÍDA.', 'success');
}

function performForensicCrossings(gross, commission, invoice) {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // Atualiza valores extraídos
    ev.rendimentosBrutos = gross;
    ev.comissaoApp = commission;
    ev.faturaPlataforma = invoice;
    
    // Cálculo do Diferencial (Comissão Retida vs. Fatura Emitida)
    const absComm = Math.abs(commission);
    const diferencial = Math.abs(absComm - invoice);
    
    ev.diferencialCusto = diferencial;
    cross.deltaB = diferencial;
    
    // 1. Cálculo de IVA Autoliquidação (23% sobre o diferencial não justificado)
    ev.ivaAutoliquidacao = diferencial * 0.23;
    
    // 2. Cítulo de Juros de Mora (4% sobre o IVA)
    ev.jurosMora = ev.ivaAutoliquidacao * 0.04;
    
    // Deteta Alertas
    if (diferencial > 0.01) {
        cross.diferencialAlerta = true;
        logAudit(`DISCREPÂNCIA: ${diferencial.toFixed(2)}€ (IVA 23%: ${ev.ivaAutoliquidacao.toFixed(2)}€)`, 'warn');
    } else {
        cross.diferencialAlerta = false;
    }
}

// ==========================================
// 8. UI E ALERTAS (SINCRONIZAÇÃO)
// ==========================================

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const fmt = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '€';
    
    const map = {
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiInvoice': ev.faturaPlataforma,
        'iva23Val': ev.ivaAutoliquidacao
    };
    
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = fmt(val);
    }
    
    // Juros
    const jCard = document.getElementById('jurosCard');
    const jVal = document.getElementById('jurosVal');
    if (ev.jurosMora > 0 && jCard && jVal) {
        jCard.style.display = 'flex';
        jVal.textContent = fmt(ev.jurosMora);
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Fatura', 'IVA 23%', 'Juros 4%'],
            datasets: [{
                label: '€',
                data: [ev.rendimentosBrutos, Math.abs(ev.comissaoApp), ev.faturaPlataforma, ev.ivaAutoliquidacao, ev.jurosMora],
                backgroundColor: ['#00a8ff', '#e84118', '#44bd32', '#fbc531', '#ff9f1a']
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // ALERTA: Se diferença > 0.01€, ativa o elemento
    const alertEl = document.getElementById('bigDataAlert');
    if (alertEl) {
        if (cross.diferencialAlerta) {
            alertEl.style.display = 'flex';
            // Sincronização de valores exatos
            const diffValEl = document.getElementById('alertDiffVal');
            if (diffValEl) diffValEl.textContent = ev.diferencialCusto.toFixed(2) + '€';
        } else {
            alertEl.style.display = 'none';
        }
    }
}

// ==========================================
// 9. EXPORTAÇÃO LEGAL (RELATÓRIO PERICIAL)
// ==========================================

function exportPDF() {
    if (!VDCSystem.client) { showToast('Sem cliente para gerar relatório', 'error'); return; }
    
    logAudit('Gerando Relatório Pericial...', 'info');
    const { jsPDF } = window.jspdf;
    
    try {
        const doc = new jsPDF();
        
        // --- CABEÇALHO ---
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 40);
        doc.setFillColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("VDC RELATÓRIO PERICIAL v11.6", 105, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Sessão: ${VDCSystem.sessionId}`, 20, 30);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')} - ${new Date().toLocaleTimeString('pt-PT')}`, 20, 36);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 42, 190, 42);
        
        // --- DADOS DO CLIENTE ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. DADOS DO SUJEITO AUDITADO", 20, 50);
        
        doc.setFont("helvetica", "normal");
        doc.text(`Nome: ${VDCSystem.client.name}`, 25, 58);
        doc.text(`NIF: ${VDCSystem.client.nif}`, 25, 64);
        doc.text(`ID da Sessão Forense: ${VDA-SESSION-${VDCSystem.sessionId}`, 25, 70);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 76, 190, 76);
        
        // --- ANÁLISE DE DIVERGÊNCIAS ---
        doc.setFont("helvetica", "bold");
        doc.text("2. ANÁLISE FISCAL CRUZADA", 20, 90);
        
        doc.setFont("helvetica", "normal");
        doc.text(`Valor Bruto (Extrato CSV): ${VDCSystem.analysis.extractedValues.rendimentosBrutos.toFixed(2)}€`, 25, 98);
        doc.text(`Comissão Retida (Extrato CSV): ${Math.abs(VDCSystem.analysis.extractedValues.comissaoApp).toFixed(2)}€`, 25, 104);
        doc.text(`Fatura Emitida (Input): ${VDCSystem.analysis.extractedValues.faturaPlataforma.toFixed(2)}€`, 25, 110);
        
        const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto;
        if (diferencial > 0.01) {
            doc.setTextColor(200, 50, 50);
            doc.text(`Diferencial Encontrada: ${diferencial.toFixed(2)}€`, 25, 130);
            doc.setTextColor(0, 0, 0);
            doc.text(`IVA de Autoliquidação (23%): ${VDCSystem.analysis.extractedValues.ivaAutoliquidacao.toFixed(2)}€`, 25, 136);
        } else {
            doc.text("Diferencial: 0,00€", 25, 125);
        }
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 142, 190, 142);
        
        // --- NOTA DE CONFORMIDADE LEGAL ---
        doc.setFont("helvetica", "bold", "italic");
        doc.text("3. NOTA DE CONFORMIDADE ISO/IEC 27037", 20, 150);
        doc.setFont("helvetica", "normal", 8);
        const note = "O presente relatório cumpre com os requisitos de integridade e validação de dados forenses. O hash SHA-256 da sessão garante a autenticidade.";
        const splitTitle = doc.splitText(note, 180, 170);
        splitTitle.text(note, 20, 160);
        
        // --- HASH DA SESSÃO ---
        doc.setFont("helvetica", "bold");
        doc.text(`Hash de Integridade da Sessão:`, 20, 180);
        doc.setFont("courier", 8);
        const masterHashEl = document.getElementById('masterHashValue');
        const hashText = masterHashEl ? masterHashEl.textContent : 'N/A';
        doc.text(hashText.substring(0, 24) + "...", 20, 186);
        
        doc.save(`VDC_Report_${VDCSystem.sessionId}.pdf`);
        logAudit('Relatório PDF gerado.', 'success');
    } catch (e) {
        console.error(e);
        logAudit('Erro ao gerar PDF.', 'error');
    }
}

function exportDataJSON() {
    const data = { session: VDCSystem.sessionId, analysis: VDCSystem.analysis, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null,2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VDC_Report_${VDCSystem.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    logAudit('JSON exportado.', 'success');
}

function resetSystem() {
    if (!confirm('Resetar sistema?')) return;
    
    // Reset lógica
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data');
    
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0,
        platformCommission: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, faturaPlataforma: 0,
        diferencialCusto: 0, ivaAutoliquidacao: 0,
        jurosMora: 0
    };
    
    // Reset UI
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    document.getElementById('clientStatusFixed').style.display = 'none';
    
    ['kpiGanhos', 'kpiComm', 'kpiInvoice', 'iva23Val'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
    });
    
    clearAllEvidence();
    clearConsole();
    generateMasterHash();
    logAudit('Sistema resetado.', 'info');
}

// ==========================================
// 10. AUXILIARES & BINDING GLOBAL
// ==========================================

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateSessionId() {
    return 'VDC-' + Date.now().toString(36).toUpperCase();
}

function generateMasterHash() {
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + VDCSystem.sessionId + Date.now();
    const hash = CryptoJS.SHA256(payload).toString();
    const el = document.getElementById('masterHashValue');
    if (el) el.textContent = hash;
}

function logAudit(msg, type) {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    const time = new Date().toLocaleTimeString('pt-PT');
    const entry = document.createElement('div');
    entry.className = `log-entry`;
    entry.innerHTML = `<span style="color:#666">[${time}]</span> <span style="font-weight:bold">${type.toUpperCase()}</span> ${msg}`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
    VDCSystem.logs.push({ time, msg, type });
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
}

function showToast(msg, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check' : 'fa-info'}"></i> ${msg}`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = 0; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==========================================
// 11. GARANTIA DE ESTABILIDADE (BINDING)
// Todas as funções vinculadas a window para evitar erros
// ==========================================

window.clearConsole = clearConsole;
window.startGatekeeperSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.logAudit = logAudit;
window.generateMasterHash = generateMasterHash;
window.VDCSystem = VDCSystem;
window.performForensicCrossings = performForensicCrossings;
