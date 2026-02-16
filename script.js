/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.2 LASER CROSS
 * PROTOCOLO: ISO/IEC 27037 | NIST SP 800-86
 */

'use strict';

const VDCSystem = {
    version: '12.2',
    sessionId: Math.random().toString(36).substring(2, 10).toUpperCase(),
    client: null,
    documents: {
        invoices: { files: [], data: [], total: 0 },
        statements: { files: [], data: [], total: 0 }
    },
    analysis: { delta: 0, status: 'READY' },
    chart: null
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
    setupEventListeners();
    
    // Simulação de Splash
    setTimeout(() => {
        document.getElementById('splashScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'flex';
            logAudit('Sistema VDC v12.2 Inicializado. Protocolo LASER CROSS ativo.', 'success');
        }, 500);
    }, 2500);
});

function setupEventListeners() {
    const modal = document.getElementById('evidenceModal');
    document.getElementById('openEvidenceModalBtn').onclick = () => modal.style.display = 'flex';
    document.getElementById('closeModalBtn').onclick = () => modal.style.display = 'none';
    document.getElementById('closeAndSaveBtn').onclick = selarEvidencias;
    
    // Leitura de Ficheiros
    document.getElementById('invoiceFileModal').onchange = (e) => processFiles(e.target.files, 'invoices');
    document.getElementById('statementFileModal').onchange = (e) => processFiles(e.target.files, 'statements');
}

// --- MOTOR DE PARSING (Onde a Peritagem Acontece) ---
const toForensicNumber = (v) => {
    if (!v) return 0;
    let str = v.toString().replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(str) || 0;
};

async function processFiles(files, type) {
    for (let file of files) {
        logAudit(`A ler documento: ${file.name}...`, 'info');
        
        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    VDCSystem.documents[type].data.push(...results.data);
                    calcularTotais();
                    logAudit(`Ficheiro CSV processado: ${file.name}`, 'success');
                }
            });
        }
    }
}

function calcularTotais() {
    // Lógica simplificada de peritagem: Procura colunas de 'Total', 'Amount' ou 'Gross'
    let gross = 0;
    VDCSystem.documents.invoices.data.forEach(row => {
        const val = row.Total || row.Amount || row.Valor || 0;
        gross += toForensicNumber(val);
    });
    
    VDCSystem.documents.invoices.total = gross;
    document.getElementById('kpiGrossValue').textContent = gross.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const count = VDCSystem.documents.invoices.data.length + VDCSystem.documents.statements.data.length;
    document.getElementById('evidence-count-solid').textContent = count;
    
    if (count > 0) document.getElementById('analyzeBtn').disabled = false;
    updateChart();
}

function selarEvidencias() {
    const nif = document.getElementById('clientNIFFixed').value;
    if (nif.length < 9) {
        showToast('NIF Inválido para selagem.', 'error');
        return;
    }
    
    VDCSystem.client = { name: document.getElementById('clientNameFixed').value, nif: nif };
    document.getElementById('clientStatusFixed').style.display = 'block';
    document.getElementById('evidenceModal').style.display = 'none';
    generateMasterHash();
    logAudit(`Evidências seladas para o NIF ${nif}. Cadeia de Custódia iniciada.`, 'warn');
}

function generateMasterHash() {
    const data = JSON.stringify(VDCSystem.documents) + VDCSystem.sessionId;
    const hash = CryptoJS.SHA256(data).toString().substring(0, 32).toUpperCase();
    document.getElementById('masterHashValue').textContent = hash;
}

// --- DASHBOARD CSI (Gráficos) ---
function updateChart() {
    const ctx = document.getElementById('forensicChart').getContext('2d');
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Fluxo de Rendimentos (Auditado)',
                data: [VDCSystem.documents.invoices.total, 0, 0, 0, 0, 0],
                borderColor: '#00e5ff',
                backgroundColor: 'rgba(0, 229, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { labels: { color: '#f1f5f9' } } }
        }
    });
}

// --- UTILITÁRIOS ---
function logAudit(msg, type) {
    const output = document.getElementById('auditOutput');
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-${type}`;
    entry.innerHTML = `<span style="color: #64748b;">[${time}]</span> ${msg}`;
    output.prepend(entry);
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function clearConsole() {
    document.getElementById('auditOutput').innerHTML = '';
}
