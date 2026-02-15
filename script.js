'use strict';

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const VDC = {
    totals: { ganhos: 0, gorjetas: 0, comissoes: 0, dac7Q4: 0, saft: 0 },
    files: [],
    client: null
};

// --- INICIALIZAÇÃO ---
document.getElementById('startSessionBtn').onclick = () => {
    document.getElementById('splashScreen').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'flex';
    document.getElementById('sessionIdDisplay').textContent = 'VDC-' + Math.random().toString(36).toUpperCase().substring(2, 9);
};

document.getElementById('openEvidenceModalBtn').onclick = () => document.getElementById('evidenceModal').style.display = 'flex';
document.getElementById('closeAndSaveBtn').onclick = () => document.getElementById('evidenceModal').style.display = 'none';

document.getElementById('registerClientBtnFixed').onclick = () => {
    const name = document.getElementById('clientNameFixed').value;
    if(name) {
        VDC.client = name;
        document.getElementById('analyzeBtn').disabled = false;
        log('Cliente validado: ' + name, 'success');
    }
};

// --- MOTOR DE EXTRAÇÃO PDF / CSV ---
document.getElementById('universalFileModal').onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
        log(`A processar: ${file.name}...`, 'info');
        
        if (file.type === "application/pdf") {
            await extractTextFromPDF(file);
        } else {
            const text = await file.text();
            parseContent(text);
        }
        
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        item.innerHTML = `✓ ${file.name}`;
        document.getElementById('fileListDisplay').appendChild(item);
    }
    updateDashboard();
};

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ");
    }
    parseContent(fullText);
}

function parseContent(text) {
    // Normalização para evitar erros de vírgula/ponto
    const clean = (val) => parseFloat(val.replace(/\./g, '').replace(',', '.'));

    // RegEx específicas para os teus exemplos
    const patterns = {
        ganhos: /Ganhos na app\s+(\d+[.,]\d{2})/i,
        gorjetas: /Gorjetas dos passageiros\s+(\d+[.,]\d{2})/i,
        comissao: /Despesas \(Comissoes\)\s+(-?\d+[.,]\d{2})/i,
        dac7: /Ganhos do 4\.º trimestre:\s+(\d+[.,]\d{2})/i,
        fatura: /Total com IVA \(EUR\)\s+(\d+[.,]\d{2})/i
    };

    if (patterns.ganhos.test(text)) VDC.totals.ganhos += clean(text.match(patterns.ganhos)[1]);
    if (patterns.gorjetas.test(text)) VDC.totals.gorjetas += clean(text.match(patterns.gorjetas)[1]);
    if (patterns.comissao.test(text)) VDC.totals.comissoes += Math.abs(clean(text.match(patterns.comissao)[1]));
    if (patterns.dac7.test(text)) VDC.totals.dac7Q4 += clean(text.match(patterns.dac7)[1]);
    if (patterns.fatura.test(text)) VDC.totals.saft += clean(text.match(patterns.fatura)[1]);

    log("Dados extraídos com sucesso do documento.", "success");
}

function updateDashboard() {
    document.getElementById('stmtGanhosValue').textContent = VDC.totals.ganhos.toLocaleString('pt-PT') + " €";
    document.getElementById('stmtGorjetasValue').textContent = VDC.totals.gorjetas.toLocaleString('pt-PT') + " €";
    document.getElementById('stmtComissaoValue').textContent = VDC.totals.comissoes.toLocaleString('pt-PT') + " €";
    document.getElementById('dac7Q4Value').textContent = VDC.totals.dac7Q4.toLocaleString('pt-PT') + " €";
}

function log(msg, type) {
    const out = document.getElementById('consoleOutput');
    const entry = document.createElement('div');
    entry.style.color = type === 'success' ? '#10b981' : '#94a3b8';
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    out.prepend(entry);
}

document.getElementById('analyzeBtn').onclick = () => {
    log("A gerar relatório pericial final...", "success");
    // Aqui entra a lógica do Chart.js
};
