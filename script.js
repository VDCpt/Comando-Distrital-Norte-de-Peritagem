const vdc = {
    sessao: { cliente: '', nif: '', ativa: false },
    refHashes: {},
    locHashes: {},
    valido: { saft: false, invoice: false, statement: false }
};

// Iniciar Sessão
function iniciarSessao() {
    const nome = document.getElementById('clientName').value;
    if (nome.length < 3) return alert("Insira o nome do cliente.");
    vdc.sessao.cliente = nome;
    vdc.sessao.nif = document.getElementById('clientNIF').value;
    vdc.sessao.ativa = true;
    document.getElementById('btnSessao').style.background = "#10b981";
    document.getElementById('btnSessao').innerText = "SESSÃO REGISTADA";
}

// Processar CSV de Controlo
document.getElementById('controlFile').addEventListener('change', function(e) {
    if (!vdc.sessao.ativa) return alert("Registe a sessão primeiro.");
    
    Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => {
                const path = (row.Path || row.Arquivo || "").toLowerCase();
                const hash = (row.Hash || "").toLowerCase().trim();
                if (path.includes('saft')) vdc.refHashes.saft = hash;
                if (path.includes('fatura') || path.includes('invoice')) vdc.refHashes.invoice = hash;
                if (path.includes('extrato') || path.includes('statement')) vdc.refHashes.statement = hash;
            });
            document.getElementById('controlStatus').innerText = "✓ AUTENTICIDADE CARREGADA";
            document.getElementById('controlStatus').style.color = "#10b981";
            document.querySelectorAll('.card').forEach(c => c.classList.remove('disabled'));
            document.querySelectorAll('.card input').forEach(i => i.disabled = false);
        }
    });
});

// Hashing Assíncrono
async function getHash(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const wa = CryptoJS.lib.WordArray.create(e.target.result);
            resolve(CryptoJS.SHA256(wa).toString());
        };
        reader.readAsArrayBuffer(file);
    });
}

// Handler de Upload
async function processarFicheiro(tipo, file) {
    const box = document.getElementById(`hash-${tipo}`);
    const msg = document.getElementById(`msg-${tipo}`);
    const card = document.getElementById(`card-${tipo}`);

    box.innerText = "A PROCESSAR...";
    const hashLocal = await getHash(file);
    vdc.locHashes[tipo] = hashLocal;
    box.innerText = hashLocal;

    if (hashLocal === vdc.refHashes[tipo]) {
        msg.innerText = "✓ INTEGRIDADE CONFIRMADA";
        msg.style.color = "#10b981";
        vdc.valido[tipo] = true;
    } else {
        msg.innerText = "✗ DIVERGÊNCIA DE HASH";
        msg.style.color = "#ef4444";
        vdc.valido[tipo] = false;
    }
    gerarMasterHash();
}

// Listeners
document.getElementById('file-saft').onchange = e => processarFicheiro('saft', e.target.files[0]);
document.getElementById('file-invoice').onchange = e => processarFicheiro('invoice', e.target.files[0]);
document.getElementById('file-statement').onchange = e => processarFicheiro('statement', e.target.files[0]);

function gerarMasterHash() {
    const stringHashes = Object.values(vdc.locHashes).sort().join('|');
    const mHash = CryptoJS.SHA256(stringHashes).toString();
    document.getElementById('mHashValue').innerText = mHash;
    document.getElementById('btnRelatorio').disabled = false;
}

// Geração de Relatório PDF
function gerarRelatorio() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.text("PARECER TÉCNICO DE AUDITORIA FORENSE", 20, 20);
    doc.setFontSize(10);
    doc.text(`Cliente: ${vdc.sessao.cliente} | NIF: ${vdc.sessao.nif}`, 20, 30);
    doc.text(`Data: ${new Date().toLocaleString()}`, 20, 35);
    
    doc.line(20, 40, 190, 40);
    
    let y = 50;
    doc.text("ANÁLISE DE EVIDÊNCIAS:", 20, y);
    y += 10;
    
    ["saft", "invoice", "statement"].forEach(t => {
        const st = vdc.valido[t] ? "CONFIRMADO" : "FALHOU / NÃO CARREGADO";
        doc.text(`${t.toUpperCase()}: ${st}`, 25, y);
        y += 7;
        doc.setFontSize(7);
        doc.text(`Hash: ${vdc.locHashes[t] || "N/A"}`, 25, y);
        doc.setFontSize(10);
        y += 10;
    });

    doc.setFont("courier", "bold");
    doc.text(`MASTER HASH DE SESSÃO: ${document.getElementById('mHashValue').innerText}`, 20, y + 10);
    
    doc.addPage();
    doc.text("ANEXO II - INFORMAÇÃO GERAL DE EVIDÊNCIAS", 20, 20);
    doc.setFont("helvetica", "normal");
    doc.text("Este documento certifica a integridade dos dados processados.", 20, 30);
    doc.text("A validação foi efetuada via algoritmo SHA-256.", 20, 37);

    doc.save(`Parecer_VDC_${vdc.sessao.cliente}.pdf`);
}
