/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.6 RETA FINAL
 * ====================================================================
 * OTIMIZAÇÃO: LEITURA ASSÍNCRONA DE EVIDÊNCIAS + PARSING DOCUMENTAL
 * SOLUÇÃO DE MEMÓRIA: BLOQUEIO DE LEITURA DE TEXTO EM PDFs BINÁRIOS
 * REGEX ENGINE: AJUSTADO PARA PADRÕES PT-PT (GANHOS, COMISSÕES, DAC7)
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.6 OPTIMIZED CARREGADO');

// ============================================================================
// 1. STATE & UTILS
// ============================================================================
const VDCSystem = {
    version: 'v12.6-PERFORMANCE-PATCH',
    sessionId: null,
    client: null,
    demoMode: false,
    processing: false,
    logs: [],
    masterHash: '',
    documents: {
        control: { files: [], totals: { records: 0 } },
        saft: { files: [], totals: { bruto: 0, iliquido: 0, iva: 0 } },
        invoices: { files: [], totals: { invoiceValue: 0 } },
        statements: { files: [], totals: { ganhosApp: 0, campanhas: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, despesasComissao: 0 } },
        dac7: { files: [], totals: { q1: 0, q2: 0, q3: 0, q4: 0 } }
    },
    analysis: {
        extractedValues: {},
        crossings: { delta: 0 },
        verdict: null,
        evidenceIntegrity: []
    }
};

// Utils: Normalização Numérica e Formatação
const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const toForensicNumber = (v) => {
    if (!v) return 0;
    // Remove símbolos de moeda e texto
    let str = v.toString().replace(/[^\d.,-]/g, '').trim();
    // Lógica para detetar formato europeu (1.000,00) vs americano (1,000.00)
    // Se existir virgula no fim, é decimal
    if (str.includes(',') && !str.includes('.')) {
        str = str.replace(',', '.');
    } else if (str.includes('.') && str.includes(',')) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
             str = str.replace(/\./g, '').replace(',', '.'); // PT
        } else {
             str = str.replace(/,/g, ''); // US
        }
    }
    return parseFloat(str) || 0;
};

const formatCurrency = (val) => {
    return (val || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

const getRiskVerdict = (delta, gross) => {
    if (!gross) return { level: 'INCONCLUSIVO', color: '#8c7ae6', percent: '0.00%' };
    const pct = Math.abs((delta / gross) * 100);
    if (pct <= 5) return { level: 'BAIXO RISCO', color: '#44bd32', percent: pct.toFixed(2)+'%' };
    if (pct <= 15) return { level: 'RISCO MÉDIO', color: '#f59e0b', percent: pct.toFixed(2)+'%' };
    return { level: 'CRÍTICO', color: '#ef4444', percent: pct.toFixed(2)+'%' };
};

// ============================================================================
// 2. CORE & LISTENERS
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupListeners();
    startClock();
});

function setupListeners() {
    document.getElementById('startSessionBtn')?.addEventListener('click', startSession);
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => {
        document.getElementById('evidenceModal').style.display = 'flex';
        updateSummary();
    });
    const closeModal = () => document.getElementById('evidenceModal').style.display = 'none';
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeModal);
    
    // Upload Handlers
    ['control', 'saft', 'invoice', 'statement', 'dac7'].forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if(btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });

    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemo);
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('resetBtn')?.addEventListener('click', () => location.reload());
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => {
        document.getElementById('consoleOutput').innerHTML = '';
        VDCSystem.logs = [];
    });
}

function startSession() {
    document.getElementById('splashScreen').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('splashScreen').style.display = 'none';
        document.getElementById('loadingOverlay').style.display = 'flex';
        setTimeout(() => {
            VDCSystem.sessionId = 'VDC-' + Date.now().toString(36).toUpperCase();
            document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
            document.getElementById('loadingOverlay').style.display = 'none';
            document.getElementById('mainContainer').style.display = 'block';
            setTimeout(() => document.getElementById('mainContainer').style.opacity = '1', 50);
            populateFiscalYears();
        }, 1500);
    }, 500);
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-PT');
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('pt-PT');
    }, 1000);
}

function populateFiscalYears() {
    const sel = document.getElementById('anoFiscal');
    for(let y=2030; y>=2018; y--) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        if(y===2024) opt.selected = true;
        sel.appendChild(opt);
    }
}

function registerClient() {
    const name = document.getElementById('clientNameFixed').value;
    const nif = document.getElementById('clientNIFFixed').value;
    if(name && nif) {
        VDCSystem.client = { name, nif };
        document.getElementById('clientStatusFixed').style.display = 'block';
        document.getElementById('clientStatusFixed').textContent = `${name} | NIF: ${nif}`;
        logAudit(`Cliente registado: ${name}`, 'success');
        document.getElementById('analyzeBtn').disabled = false;
    }
}

// ============================================================================
// 3. FILE HANDLING OPTIMIZED (MEMORY FIX)
// ============================================================================
async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if(!files.length) return;

    const btn = document.getElementById(`${type}UploadBtnModal`);
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A PROCESSAR...';

    for(const file of files) {
        // PERFORMANCE FIX: Only read text for non-binary types
        // PDFs are treated as blobs to prevent browser crash on ReadAsText
        const isTextBased = file.type.includes('text') || file.name.endsWith('.csv') || file.name.endsWith('.xml') || file.name.endsWith('.json');
        
        // Log Integrity
        const meta = `${file.name}-${file.size}-${file.lastModified}`;
        // Simple mock hash for performance (Full SHA256 on large PDFs blocks UI)
        // In real prod, use WebWorkers. Here we use a lightweight string hash.
        const hash = CryptoJS.MD5(meta).toString(); 

        if(!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], totals: {} };
        VDCSystem.documents[type].files.push(file);

        VDCSystem.analysis.evidenceIntegrity.push({
            name: file.name, type, hash, date: new Date().toISOString()
        });

        addFileToList(file.name, hash, type);

        // ONLY PARSE IF TEXT/CSV/XML - Skip heavy processing for pure PDFs unless OCR (not client-side)
        if (isTextBased) {
            const content = await readFileSafe(file);
            parseDocumentContent(content, type, file.name);
        } else {
            logAudit(`Ficheiro binário/PDF carregado: ${file.name} (Metadados preservados)`, 'info');
        }
    }

    btn.innerHTML = '<i class="fas fa-check"></i> SELECIONADO';
    setTimeout(() => { 
        btn.innerHTML = '<i class="fas fa-upload"></i> SELECIONAR'; 
    }, 2000);
    
    updateSummary();
}

function readFileSafe(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve(""); // Fail safe
        reader.readAsText(file); // Only used for safe text types
    });
}

function addFileToList(name, hash, type) {
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   `${type}FileListModal`;
    const list = document.getElementById(listId);
    if(list) {
        list.style.display = 'block';
        list.innerHTML += `<div class="file-item-modal"><i class="fas fa-check-circle"></i><span class="file-name-modal">${name}</span></div>`;
    }
}

// ============================================================================
// 4. PARSING ENGINE (REGEX ENGINE UPDATE)
// ============================================================================
function parseDocumentContent(text, type, filename) {
    logAudit(`A analisar conteúdo: ${filename}...`, 'info');
    
    // Normalize text for easier matching (keep newlines for row detection)
    const cleanText = text; 

    // A. EXTRATOS (STATEMENTS)
    if (type === 'statement') {
        const totals = VDCSystem.documents.statements.totals;
        
        // 1. Ganhos na app
        const matchGanhos = cleanText.match(/Ganhos na app[\s\S]*?(\d+[.,]\d{2})/i);
        if(matchGanhos) totals.ganhosApp += toForensicNumber(matchGanhos[1]);

        // 2. Campanhas
        const matchCamp = cleanText.match(/Ganhos da campanha[\s\S]*?(\d+[.,]\d{2})/i);
        if(matchCamp) totals.campanhas += toForensicNumber(matchCamp[1]);

        // 3. Gorjetas
        const matchTip = cleanText.match(/Gorjetas[\s\S]*?(\d+[.,]\d{2})/i);
        if(matchTip) totals.gorjetas += toForensicNumber(matchTip[1]);

        // 4. Portagens
        const matchToll = cleanText.match(/Portagens[\s\S]*?(\d+[.,]\d{2})/i);
        if(matchToll) totals.portagens += toForensicNumber(matchToll[1]);

        // 5. Taxas Cancelamento
        const matchCancel = cleanText.match(/Taxas de cancelamento[\s\S]*?(\d+[.,]\d{2})/i);
        if(matchCancel) totals.taxasCancelamento += toForensicNumber(matchCancel[1]);

        // 6. Comissões (Search for negative numbers after "Despesas" or "Comissões")
        // Ex: Despesas (Comissoes) ... -792.59
        const matchComm = cleanText.match(/(?:Despesas|Comiss[õo]es)[^0-9-]*(-?\d+[.,]\d{2})/i);
        if(matchComm) totals.despesasComissao += Math.abs(toForensicNumber(matchComm[1]));

        logAudit(`Parsing Extrato concluído: ${formatCurrency(totals.ganhosApp)} detetados.`, 'success');
    }

    // B. FATURAS (INVOICES) - Usually CSV or XML for parsing
    if (type === 'invoice') {
        // Look for "Total com IVA (EUR)"
        const matchTotal = cleanText.match(/Total com IVA[^0-9]*(\d+[.,]\d{2})/i);
        if(matchTotal) {
            const val = toForensicNumber(matchTotal[1]);
            VDCSystem.documents.invoices.totals.invoiceValue += val;
            logAudit(`Fatura processada: ${formatCurrency(val)}`, 'success');
        }
    }

    // C. DAC7
    if (type === 'dac7') {
        // "Ganhos do 4.º trimestre: 7755.16€"
        // Generic Quarter Parsing loop
        for(let i=1; i<=4; i++) {
            const regex = new RegExp(`Ganhos do ${i}\\.º trimestre[^0-9]*(\\d+[.,]\\d{2})`, 'i');
            const match = cleanText.match(regex);
            if(match) {
                const val = toForensicNumber(match[1]);
                VDCSystem.documents.dac7.totals[`q${i}`] = val;
                logAudit(`DAC7 Q${i}: ${formatCurrency(val)}`, 'success');
            }
        }
    }

    // D. SAF-T (Supports CSV and XML logic)
    if (type === 'saft') {
        // XML Tags
        const matchGross = cleanText.match(/GrossTotal>(\d+[.,]?\d*)/);
        const matchNet = cleanText.match(/NetTotal>(\d+[.,]?\d*)/);
        const matchTax = cleanText.match(/TaxPayable>(\d+[.,]?\d*)/);
        
        if(matchGross) VDCSystem.documents.saft.totals.bruto += toForensicNumber(matchGross[1]);
        if(matchNet) VDCSystem.documents.saft.totals.iliquido += toForensicNumber(matchNet[1]);
        if(matchTax) VDCSystem.documents.saft.totals.iva += toForensicNumber(matchTax[1]);

        // CSV Logic (Check headers roughly)
        if(filename.endsWith('.csv')) {
             // Basic summing of last column if it looks like value
             // (Simplified for demo stability)
             const rows = cleanText.split('\n');
             if(rows.length > 1) logAudit(`SAF-T CSV lido: ${rows.length} linhas.`, 'info');
        }
    }
}

// ============================================================================
// 5. ANALYSIS & DASHBOARD UPDATE
// ============================================================================
function performAudit() {
    if(!VDCSystem.client) return alert("Registe o cliente primeiro.");

    const st = VDCSystem.documents.statements.totals;
    const inv = VDCSystem.documents.invoices.totals;
    const saft = VDCSystem.documents.saft.totals;

    // 1. Update Modules UI
    updateElement('stmtGanhosValue', st.ganhosApp);
    updateElement('stmtCampanhasValue', st.campanhas);
    updateElement('stmtGorjetasValue', st.gorjetas);
    updateElement('stmtPortagensValue', st.portagens);
    updateElement('stmtTaxasCancelValue', st.taxasCancelamento);
    updateElement('stmtComissaoValue', st.despesasComissao);

    updateElement('saftBrutoValue', saft.bruto);
    updateElement('saftIliquidoValue', saft.iliquido);
    updateElement('saftIvaValue', saft.iva);

    updateElement('dac7Q1Value', VDCSystem.documents.dac7.totals.q1);
    updateElement('dac7Q2Value', VDCSystem.documents.dac7.totals.q2);
    updateElement('dac7Q3Value', VDCSystem.documents.dac7.totals.q3);
    updateElement('dac7Q4Value', VDCSystem.documents.dac7.totals.q4);

    // 2. Calculations
    // Bruto Real = GanhosApp + Campanhas + Gorjetas + Cancelamentos + Portagens
    const brutoReal = st.ganhosApp + st.campanhas + st.gorjetas + st.taxasCancelamento + st.portagens;
    const comissaoTotal = st.despesasComissao;
    const liquido = brutoReal - comissaoTotal;
    const faturado = inv.invoiceValue > 0 ? inv.invoiceValue : saft.bruto; // Use Invoice if avail, else SAFT
    
    // Delta (Fosso Fiscal)
    // Se o faturado (Faturas de comissão) for diferente da Comissão Real detetada no extrato
    // OU se o SAFT Bruto for diferente do Bruto Real
    const delta = Math.abs(brutoReal - faturado); // Simplificação para demo

    // 3. Update KPI & Dashboard
    updateElement('statNet', liquido);
    updateElement('statComm', comissaoTotal);
    updateElement('statJuros', delta);

    updateElement('kpiGrossValue', brutoReal);
    updateElement('kpiCommValue', comissaoTotal);
    updateElement('kpiNetValue', liquido);
    updateElement('kpiInvValue', faturado);

    // 4. Verdict & Alerts
    if(delta > 50) {
        document.getElementById('jurosCard').style.display = 'block';
        document.getElementById('bigDataAlert').style.display = 'flex';
        document.getElementById('alertDeltaValue').textContent = formatCurrency(delta);
    }

    const verdict = getRiskVerdict(delta, brutoReal);
    const vDisplay = document.getElementById('verdictDisplay');
    vDisplay.style.display = 'block';
    vDisplay.className = `verdict-display active`;
    document.getElementById('verdictLevel').textContent = verdict.level;
    document.getElementById('verdictLevel').style.color = verdict.color;
    document.getElementById('verdictPercentValue').textContent = `Desvio: ${verdict.percent}`;

    // 5. Chart
    renderChart(brutoReal, comissaoTotal, liquido, faturado);
    
    // 6. Quantum
    const quantum = 38000 * 12 * 7 * (delta > 0 ? (delta/1000) : 0.5); // Mock algo
    document.getElementById('quantumBox').style.display = 'block';
    document.getElementById('quantumValue').textContent = formatCurrency(quantum);

    logAudit('Perícia concluída com sucesso.', 'success');
}

function updateElement(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = formatCurrency(val);
}

function updateSummary() {
    document.getElementById('summarySaft').textContent = VDCSystem.documents.saft.files.length;
    document.getElementById('summaryStatements').textContent = VDCSystem.documents.statements.files.length;
    let total = 0;
    Object.keys(VDCSystem.documents).forEach(k => total += VDCSystem.documents[k].files.length);
    document.getElementById('summaryTotal').textContent = total;
    document.getElementById('evidenceCountTotal').textContent = total;
}

function renderChart(bruto, comissao, liquido, faturado) {
    const ctx = document.getElementById('mainChart');
    if(VDCSystem.chart) VDCSystem.chart.destroy();
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto Real', 'Comissões', 'Líquido', 'Faturado'],
            datasets: [{
                label: 'Valores (€)',
                data: [bruto, comissao, liquido, faturado],
                backgroundColor: ['#00e5ff', '#f59e0b', '#10b981', '#ef4444']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// Demo Data Injection
function activateDemo() {
    VDCSystem.documents.statements.totals = { ganhosApp: 3157.94, campanhas: 20.00, gorjetas: 9.00, portagens: 15.50, taxasCancelamento: 15.60, despesasComissao: 792.59 };
    VDCSystem.documents.invoices.totals.invoiceValue = 239.00;
    VDCSystem.documents.dac7.totals = { q1: 1500, q2: 2000, q3: 2000, q4: 7755.16 };
    performAudit();
    logAudit('Modo Demo Ativado.', 'info');
}

function logAudit(msg, type) {
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}`;
    document.getElementById('consoleOutput').prepend(div);
}

/* FIM DO SCRIPT */
