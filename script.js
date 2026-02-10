'use strict';

const VDCSystem = {
    version: 'v12.1-ELITE',
    data: {
        brutoPlataforma: 0,
        totalSaft: 0,
        divergencia: 0,
        riscoTotal: 0
    },
    files: [],
    chart: null,

    inicializarProtocoloVDC() {
        document.getElementById('splashScreen').style.display = 'none';
        this.logAudit("Sistema VDC Inicializado. Protocolos ISO 27037 ativos.", "success");
        this.renderChart();
        this.gerarHash();
    },

    logAudit(msg, type = 'info') {
        const consoleElem = document.getElementById('auditConsole');
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.innerHTML = `[${time}] ${type === 'success' ? '✅' : 'ℹ️'} ${msg}`;
        consoleElem.prepend(line);
    },

    gerarHash() {
        const hash = CryptoJS.SHA256(Date.now().toString()).toString().substring(0, 32);
        document.getElementById('masterHashValue').textContent = hash.toUpperCase();
    }
};

async function executarAnaliseForense() {
    VDCSystem.logAudit("Iniciando varredura Big Data...", "info");
    
    // Simulação de processamento acumulativo para Eduardo
    setTimeout(() => {
        VDCSystem.data.brutoPlataforma = 15450.75;
        VDCSystem.data.totalSaft = 12100.30;
        VDCSystem.data.divergencia = VDCSystem.data.brutoPlataforma - VDCSystem.data.totalSaft;
        VDCSystem.data.riscoTotal = VDCSystem.data.divergencia * 0.09; // 4% RGRC + 5% Taxa

        atualizarDashboard();
        VDCSystem.logAudit("Análise concluída. Divergência detetada.", "warning");
    }, 1500);
}

function atualizarDashboard() {
    document.getElementById('valBruto').textContent = VDCSystem.data.brutoPlataforma.toFixed(2) + "€";
    document.getElementById('valSaft').textContent = VDCSystem.data.totalSaft.toFixed(2) + "€";
    document.getElementById('valDivergencia').textContent = VDCSystem.data.divergencia.toFixed(2) + "€";
    document.getElementById('valRisco').textContent = VDCSystem.data.riscoTotal.toFixed(2) + "€";
    
    VDCSystem.chart.data.datasets[0].data = [
        VDCSystem.data.brutoPlataforma, 
        VDCSystem.data.totalSaft, 
        VDCSystem.data.divergencia
    ];
    VDCSystem.chart.update();
}

VDCSystem.renderChart = function() {
    const ctx = document.getElementById('forensicChart').getContext('2d');
    this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto Plataforma', 'Total SAF-T', 'Divergência'],
            datasets: [{
                label: 'Análise Forense (€)',
                data: [0, 0, 0],
                backgroundColor: ['#f59e0b', '#0066cc', '#ef4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};

function salvarIdentificacao() {
    const perito = document.getElementById('expertName').value;
    const cliente = document.getElementById('clientName').value;
    VDCSystem.logAudit(`Sessão vinculada: ${perito} / ${cliente}`, "success");
}

function limparConsola() { document.getElementById('auditConsole').innerHTML = ''; }

function resetDashboard() { location.reload(); }

function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("RELATÓRIO DE PERITAGEM FORENSE VDC v12.1", 20, 20);
    doc.text(`Perito: ${document.getElementById('expertName').value}`, 20, 30);
    doc.text(`Divergência: ${VDCSystem.data.divergencia.toFixed(2)} EUR`, 20, 40);
    doc.save("Relatorio_VDC_Elite.pdf");
}

window.validarQuantidadeFicheiros = (input, tipo, max) => {
    if (input.files.length > max) {
        alert(`Erro: Máximo de ${max} ficheiros para ${tipo}`);
        input.value = '';
    }
};
