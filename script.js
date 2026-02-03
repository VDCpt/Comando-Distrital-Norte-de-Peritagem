const vdc = {
    sessao: { ativa: false, cliente: '', nif: '' },
    refHashes: {},
    locHashes: {},
    valido: { saft: false, invoice: false, statement: false }
};

function iniciarSessao() {
    const nome = document.getElementById('clientName').value;
    if (nome.length < 3) return alert("Nome do cliente obrigatório.");
    vdc.sessao.cliente = nome;
    vdc.sessao.nif = document.getElementById('clientNIF').value;
    vdc.sessao.ativa = true;
    document.getElementById('btnSessao').style.background = "#10b981";
    document.getElementById('btnSessao').innerText = "SESSÃO OK";
}

document.getElementById('controlFile').addEventListener('change', function(e) {
    if (!vdc.sessao.ativa) return alert("Registe a sessão primeiro.");
    Papa.parse(e.target.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(r) {
            r.data.forEach(row => {
                const path = (row.Path || row.Arquivo || "").toLowerCase();
                const hash = (row.Hash || "").toLowerCase().trim();
                if (path.includes('saft')) vdc.refHashes.saft = hash;
                if (path.includes('fatura') || path.includes('invoice')) vdc.refHashes.invoice = hash;
                if (path.includes('extrato') || path.includes('statement')) vdc.refHashes.statement = hash;
            });
            document.getElementById('controlStatus').innerText = "✓ AUTENTICIDADE CARREGADA";
            document.querySelectorAll('.card').forEach(c => c.classList.remove('disabled'));
            document.querySelectorAll('.card input').forEach(i => i.disabled = false);
        }
    });
});

async function calcularHash(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
            const wa = CryptoJS.lib.WordArray.create(e.target.result);
            resolve(CryptoJS.SHA256(wa).toString());
        };
        reader.readAsArrayBuffer(file);
    });
}

async function handleUpload(tipo, file) {
    const display = document.getElementById(`hash-${tipo}`);
    const msg = document.getElementById(`msg-${tipo}`);
    const card = document.getElementById(`card-${tipo}`);

    display.innerText = "A PROCESSAR...";
    const hash = await calcularHash(file);
    vdc.locHashes[tipo] = hash;
    display.innerText = hash;

    if (hash === vdc.refHashes[tipo]) {
        msg.innerText = "✓ AUTENTICIDADE CONFIRMADA";
        msg.style.color = "#10b981";
        card.classList.add('valid');
        vdc.valido[tipo] = true;
    } else {
        msg.innerText = "✗ DIVERGÊNCIA DETETADA";
        msg.style.color = "#ef4444";
        card.classList.add('invalid');
        vdc.valido[tipo] = false;
    }
    selarSessao();
}

document.getElementById('file-saft').onchange = e => handleUpload('saft', e.target.files[0]);
document.getElementById('file-invoice').onchange = e => handleUpload('invoice', e.target.files[0]);
document.getElementById('file-statement').onchange = e => handleUpload('statement', e.target.files[0]);

function selarSessao() {
    const hashes = Object.values(vdc.locHashes).sort().join('|');
    const master = CryptoJS.SHA256(hashes).toString();
    document.getElementById('mHashValue').innerText = master;
    document.getElementById('btnRelatorio').disabled = false;
}

function gerarRelatorio() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("PARECER TÉCNICO VDC v5.2", 20, 20);
    doc.setFontSize(10);
    doc.text(`Cliente: ${vdc.sessao.cliente} | NIF: ${vdc.sessao.nif}`, 20, 30);
    doc.text(`Master Hash: ${document.getElementById('mHashValue').innerText}`, 20, 40);
    doc.save(`Parecer_${vdc.sessao.cliente}.pdf`);
}
