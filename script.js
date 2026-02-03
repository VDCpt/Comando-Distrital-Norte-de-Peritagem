let sessao = { cliente: "", hashesRef: {}, hashesLoc: {} };

function iniciarSessao() {
    const nome = document.getElementById('clientName').value;
    if(!nome) return alert("Defina o cliente.");
    sessao.cliente = nome;
    document.getElementById('btnSessao').innerText = "REGISTADA";
    document.getElementById('btnSessao').style.background = "#10b981";
}

document.getElementById('controlFile').addEventListener('change', function(e) {
    Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            results.data.forEach(row => {
                const p = (row.Path || row.Arquivo || "").toLowerCase();
                const h = (row.Hash || "").toLowerCase().trim();
                if(p.includes('saft')) sessao.hashesRef.saft = h;
                if(p.includes('fatura')) sessao.hashesRef.invoice = h;
                if(p.includes('extrato')) sessao.hashesRef.statement = h;
            });
            document.getElementById('controlStatus').innerText = "CSV VALIDADO";
            document.querySelectorAll('.ev-card input').forEach(i => i.disabled = false);
        }
    });
});

async function calcHash(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(CryptoJS.SHA256(CryptoJS.lib.WordArray.create(e.target.result)).toString());
        reader.readAsArrayBuffer(file);
    });
}

async function handleFile(tipo, file) {
    const hash = await calcHash(file);
    sessao.hashesLoc[tipo] = hash;
    document.getElementById(`hash-${tipo}`).innerText = hash;
    
    const isOk = hash === sessao.hashesRef[tipo];
    const msg = document.getElementById(`msg-${tipo}`);
    msg.innerText = isOk ? "✓ VÁLIDO" : "✗ DIVERGENTE";
    msg.style.color = isOk ? "#10b981" : "#ef4444";
    
    const totalHashes = Object.values(sessao.hashesLoc).join('|');
    const master = CryptoJS.SHA256(totalHashes).toString();
    document.getElementById('mHashValue').innerText = master;
    document.getElementById('btnRelatorio').disabled = false;
}

document.getElementById('file-saft').onchange = e => handleFile('saft', e.target.files[0]);
document.getElementById('file-invoice').onchange = e => handleFile('invoice', e.target.files[0]);
document.getElementById('file-statement').onchange = e => handleFile('statement', e.target.files[0]);

function gerarRelatorio() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("PARECER TECNICO VDC", 20, 20);
    doc.text(`Cliente: ${sessao.cliente}`, 20, 30);
    doc.text(`Master Hash: ${document.getElementById('mHashValue').innerText}`, 20, 40);
    doc.save(`VDC_${sessao.cliente}.pdf`);
}
