## 📁 FICHEIRO 2: script.js

**Implementação:** Motor de Cruzamento, Leitura Universal (Regex), Renderização Imediata e Desbloqueio de PDF.

```javascript
/**
 * VDC FORENSE v12.6 | CYBER CYAN EDITION
 * PROTOCOLO DE CORREÇÃO ABSOLUTA
 * ====================================================================
 */

'use strict';

// ============================================================================
// 1. ESTADO GLOBAL E CONFIGURAÇÃO
// ============================================================================
const VDCSystem = {
    version: 'v12.6-CYBER-CYAN',
    sessionId: 'VDC-' + Date.now().toString(36).toUpperCase(),
    client: null,
    processing: false,
    documents: {
        saft: { files: [], totals: { bruto: 0, faturado: 0 } },
        statements: { files: [], totals: { bruto: 0, comis: 0, liquido: 0 } },
        invoices: { files: [], totals: { value: 0 } }
    },
    analysis: {
        extractedValues: {
            saft_bruto: 0, saft_comis: 0, saft_liquido: 0, saft_faturado: 0,
            ext_bruto: 0, ext_comis: 0, ext_liquido: 0,
            quantum: 0, discrepancy: 0
        },
        verdict: null
    }
};

// ============================================================================
// 2. UTILITÁRIOS FORENSES
// ============================================================================
const log = (msg, type = 'info') => {
    const consoleEl = document.getElementById('consoleOutput');
    if (!consoleEl) return;
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${time}] ${msg}`;
    consoleEl.appendChild(entry);
    consoleEl.scrollTop = consoleEl.scrollHeight;
};

const formatCurrency = (val) => {
    if (isNaN(val)) val = 0;
    return val.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
};

const parseNumber = (str) => {
    if (!str) return 0;
    // Limpeza agressiva: remove tudo exceto números, ponto, vírgula e sinal negativo
    let clean = str.toString().trim().replace(/[^\d.,-]/g, '');
    
    // Detetar formato PT (1.000,50) vs EN (1,000.50)
    if (clean.includes(',') && clean.includes('.')) {
        // Se a vírgula vem depois do ponto final último -> formato EN (ponto = milhares)
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.'); // PT para JS
        } else {
            clean = clean.replace(/,/g, ''); // EN para JS
        }
    } else if (clean.includes(',')) {
        // Apenas vírgula -> assumir decimal PT
        clean = clean.replace(',', '.');
    }
    
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
};

const showToast = (msg, type = 'info') => {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast-notification ${type}`;
    t.innerHTML = `<i class="fas fa-info-circle"></i><p>${msg}</p>`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
};

const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatCurrency(val);
};

// ============================================================================
// 3. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Listeners Estáticos
    document.getElementById('startSessionBtn')?.addEventListener('click', initSystem);
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => {
        document.getElementById('evidenceModal').style.display = 'flex';
    });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        document.getElementById('evidenceModal').style.display = 'none';
    });
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', () => {
        document.getElementById('evidenceModal').style.display = 'none';
        crossReferenceData(); // Executa cruzamento ao fechar modal
    });
    
    // Listeners Dinâmicos
    setupUploadListeners();
    setupToolListeners();
    
    // Inicializações
    populateYears();
    startClock();
    generateMasterHash();
    
    // Botões desbloqueados por defeito
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
});

function initSystem() {
    const splash = document.getElementById('splashScreen');
    const load = document.getElementById('loadingOverlay');
    
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.style.display = 'none';
        load.style.display = 'flex';
        
        // Simular carga de módulos
        let p = 0;
        const interval = setInterval(() => {
            p += 10;
            document.getElementById('loadingProgress').style.width = p + '%';
            if (p >= 100) {
                clearInterval(interval);
                load.style.display = 'none';
                document.getElementById('mainContainer').style.display = 'block';
                log('SISTEMA v12.6 CYBER CYAN ONLINE', 'success');
                log('Motor de Regex Universal Ativo.', 'info');
            }
        }, 100);
    }, 500);
}

function setupUploadListeners() {
    // Mapeamento de botões para inputs e tipos
    const types = [
        { btn: 'saftUploadBtnModal', input: 'saftFileModal', type: 'saft', list: 'saftFileListModal' },
        { btn: 'statementUploadBtnModal', input: 'statementFileModal', type: 'statements', list: 'statementsFileListModal' }
    ];

    types.forEach(t => {
        const btn = document.getElementById(t.btn);
        const input = document.getElementById(t.input);
        
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, t.type, t.list));
        }
    });
}

function setupToolListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', () => {
        const name = document.getElementById('clientNameFixed').value || 'CLIENTE_GENERICO_VDC';
        const nif = document.getElementById('clientNIFFixed').value || '999999990';
        VDCSystem.client = { name, nif };
        document.getElementById('clientStatusFixed').style.display = 'flex';
        document.getElementById('clientNameDisplayFixed').textContent = name;
        log(`Cliente registado: ${name}`, 'success');
    });

    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemo);
    document.getElementById('resetBtn')?.addEventListener('click', () => location.reload());
    document.getElementById('clearConsoleBtn')?.addEventListener('click', () => document.getElementById('consoleOutput').innerHTML = '');
}

// ============================================================================
// 4. GESTÃO DE FICHEIROS E RENDERIZAÇÃO IMEDIATA
// ============================================================================
async function handleFileUpload(e, type, listId) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
        try {
            const text = await readFileAsText(file);
            const hash = CryptoJS.SHA256(text).toString().substring(0, 8);
            
            // 1. Adicionar ao estado
            VDCSystem.documents[type].files.push({ name: file.name, hash, size: file.size });
            
            // 2. RENDERIZAÇÃO IMEDIATA (Prioridade Absoluta)
            renderFileList(listId, file.name, hash);
            
            // 3. Processar conteúdo (Async/Background)
            if (type === 'saft') processSAFT(text);
            if (type === 'statements') processStatement(text);
            
            log(`Ficheiro "${file.name}" carregado e selado.`, 'success');
            updateCounts();
            
        } catch (err) {
            log(`ERRO CRÍTICO em ${file.name}: ${err.message}`, 'error');
        }
    }
    
    // Atualizar cruzamento após upload
    crossReferenceData();
}

function renderFileList(listId, name, hash) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;
    
    // Forçar visibilidade
    listEl.style.display = 'block';
    
    const item = document.createElement('div');
    item.className = 'file-item-visible';
    item.style.cssText = 'display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(0,229,255,0.2); color: #fff; font-family: var(--font-mono); font-size: 0.8rem;';
    item.innerHTML = `
        <span style="color: #00e5ff;"><i class="fas fa-check-circle"></i> ${name}</span>
        <span style="color: #94a3b8;">#${hash}</span>
    `;
    listEl.prepend(item); // Adiciona ao topo
}

const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

// ============================================================================
// 5. MOTORES DE EXTRAÇÃO UNIVERSAL (REGEX)
// ============================================================================

function processSAFT(text) {
    try {
        log("A iniciar Regex de Extração SAF-T...", "info");
        
        // Regex para TotalCredit (Comum em SAF-T PT)
        const creditMatch = text.match(/TotalCredit>\s*([\d\.,]+)/i);
        // Regex para TotalDebit
        const debitMatch = text.match(/TotalDebit>\s*([\d\.,]+)/i);
        // Regex para GrossTotal
        const grossMatch = text.match(/GrossTotal>\s*([\d\.,]+)/i);
        // Regex para TaxPayable (IVA)
        const taxMatch = text.match(/TaxPayable>\s*([\d\.,]+)/i);

        let totalBruto = 0;
        if (creditMatch) totalBruto = parseNumber(creditMatch[1]);
        else if (debitMatch) totalBruto = parseNumber(debitMatch[1]);
        else if (grossMatch) totalBruto = parseNumber(grossMatch[1]);

        const iva = taxMatch ? parseNumber(taxMatch[1]) : 0;

        // Atualizar Estado
        VDCSystem.documents.saft.totals.bruto = totalBruto;
        VDCSystem.documents.saft.totals.faturado = totalBruto; // Assumindo faturado = bruto no SAF-T para este exemplo
        VDCSystem.analysis.extractedValues.saft_bruto = totalBruto;
        VDCSystem.analysis.extractedValues.saft_faturado = totalBruto;
        
        log(`SAF-T Extraído: Bruto ${formatCurrency(totalBruto)}`, "success");

    } catch(e) {
        log(`Falha no Regex SAF-T: ${e.message}`, "error");
    }
}

function processStatement(text) {
    try {
        log("A iniciar Regex de Extração de Extratos...", "info");
        
        let totalBruto = 0;
        let totalComis = 0;
        
        // Tenta PapaParse para CSV/Excel estruturado
        const result = Papa.parse(text, { header: false, skipEmptyLines: true });
        
        if (result.data && result.data.length > 0) {
            result.data.forEach(row => {
                row.forEach(cell => {
                    const txt = (cell || "").toString().toLowerCase();
                    const val = parseNumber(cell);
                    
                    if (val !== 0) {
                        // Lógica de Classificação por Keywords
                        if (txt.includes('fee') || txt.includes('taxa') || txt.includes('service') || txt.includes('commission')) {
                            totalComis += Math.abs(val); // Contabilizar comissão
                        } else if (txt.includes('earnings') || txt.includes('ganho') || txt.includes('deposit') || txt.includes('uber') || txt.includes('bolt')) {
                            totalBruto += Math.abs(val); // Contabilizar bruto
                        }
                    }
                });
            });
        } else {
            // Fallback: Regex Pura no texto bruto
            const earningsMatches = text.match(/earnings[^\d]*([\d\.,]+)/gi);
            const feesMatches = text.match(/fees[^\d]*([\d\.,]+)/gi);
            
            if (earningsMatches) earningsMatches.forEach(m => totalBruto += parseNumber(m.split(/[\s:]+/).pop()));
            if (feesMatches) feesMatches.forEach(m => totalComis += parseNumber(m.split(/[\s:]+/).pop()));
        }

        // Atualizar Estado
        VDCSystem.documents.statements.totals.bruto = totalBruto;
        VDCSystem.documents.statements.totals.comis = totalComis;
        VDCSystem.documents.statements.totals.liquido = totalBruto - totalComis;
        
        VDCSystem.analysis.extractedValues.ext_bruto = totalBruto;
        VDCSystem.analysis.extractedValues.ext_comis = totalComis;
        VDCSystem.analysis.extractedValues.ext_liquido = (totalBruto - totalComis);

        log(`Extrato Extraído: Bruto ${formatCurrency(totalBruto)} | Taxas ${formatCurrency(totalComis)}`, "success");

    } catch(e) {
        log(`Falha no processamento de Extrato: ${e.message}`, "error");
    }
}

// ============================================================================
// 6. MOTOR DE CRUZAMENTO (CORE LOGIC)
// ============================================================================

function crossReferenceData() {
    const saft = VDCSystem.analysis.extractedValues.saft_faturado || 0;
    const ext = VDCSystem.analysis.extractedValues.ext_bruto || 0;
    
    // Cálculo da Discrepância
    const discrepancy = ext - saft;
    VDCSystem.analysis.extractedValues.discrepancy = discrepancy;
    
    // Atualizar UI do Dashboard
    updateDashboard();
    
    log(`CRUZAMENTO: Saf-T(${formatCurrency(saft)}) vs Real(${formatCurrency(ext)}) = Delta ${formatCurrency(discrepancy)}`, 'warn');
}

function updateDashboard() {
    const v = VDCSystem.analysis.extractedValues;
    
    // Módulo SAF-T
    setVal('saft-bruto', v.saft_bruto);
    setVal('saft-faturado', v.saft_faturado);
    
    // Módulo Extratos
    setVal('ext-bruto', v.ext_bruto);
    setVal('ext-comis', v.ext_comis);
    setVal('ext-liquido', v.ext_liquido);
    setVal('ext-faturado', v.discrepancy); // Aqui mostramos a discrepância
    
    // Destaque visual
    const discEl = document.getElementById('ext-faturado');
    if (discEl) {
        discEl.style.color = v.discrepancy > 0 ? '#ef4444' : '#10b981';
    }

    generateMasterHash();
}

// ============================================================================
// 7. ANÁLISE E VEREDICTO
// ============================================================================

function performAudit() {
    log("A EXECUTAR AUDITORIA FORENSE...", "info");
    
    const v = VDCSystem.analysis.extractedValues;
    const discrepancy = v.discrepancy;
    
    // Cálculo Quantum
    const quantum = discrepancy * 1.30; // Coeficiente de Risco Agravado
    v.quantum = quantum;
    
    setVal('quantum-value', quantum);
    
    // Determinar Veredicto
    let verdict = { level: "SEM DADOS", desc: "Introduza ficheiros.", color: "#8c7ae6" };
    
    if (v.ext_bruto > 0 || v.saft_bruto > 0) {
        if (discrepancy > 100) {
            verdict = { level: "CRÍTICO", desc: "Indícios fortes de sub-declaração.", color: "#ef4444" };
        } else if (discrepancy > 0) {
            verdict = { level: "RISCO MÉDIO", desc: "Anomalia algorítmica detetada.", color: "#f59e0b" };
        } else {
            verdict = { level: "CONFORME", desc: "Valores concordantes.", color: "#10b981" };
        }
    }
    
    VDCSystem.analysis.verdict = verdict;
    
    // Renderizar Veredicto
    const vEl = document.getElementById('verdictDisplay');
    vEl.style.display = 'block';
    vEl.className = `verdict-display active`;
    vEl.style.borderColor = verdict.color;
    
    document.getElementById('verdictLevel').textContent = verdict.level;
    document.getElementById('verdictLevel').style.color = verdict.color;
    document.getElementById('verdictDesc').textContent = verdict.desc;
    
    log(`VEREDICTO: ${verdict.level}`, verdict.level === 'CRÍTICO' ? 'error' : 'success');
    showToast(`Perícia Concluída: ${verdict.level}`, 'success');
}

// ============================================================================
// 8. EXPORTAÇÃO PDF (DESBLOQUEADO)
// ============================================================================

function exportPDF() {
    // Desbloqueio: Se cliente nulo, usar genérico
    if (!VDCSystem.client) {
        VDCSystem.client = { name: 'CLIENTE_GENERICO_VDC', nif: '999999990' };
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const v = VDCSystem.analysis.extractedValues;
    const verdict = VDCSystem.analysis.verdict || { level: 'N/A', desc: 'N/A' };
    
    // Header
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(24);
    doc.text('VDC FORENSE v12.6', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('PARECER PERICIAL AUTOMATIZADO', 105, 30, { align: 'center' });
    
    let y = 50;
    
    // Dados
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(12);
    doc.text(`Cliente: ${VDCSystem.client.name}`, 14, y); y += 8;
    doc.text(`NIF: ${VDCSystem.client.nif}`, 14, y); y += 8;
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 14, y); y += 15;
    
    doc.setFontSize(14);
    doc.setTextColor(0, 229, 255);
    doc.text('ANÁLISE DE CRUZAMENTO', 14, y); y += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Bruto Real (App): ${formatCurrency(v.ext_bruto)}`, 14, y); y += 7;
    doc.text(`Faturado (SAF-T): ${formatCurrency(v.saft_faturado)}`, 14, y); y += 7;
    doc.text(`Discrepância: ${formatCurrency(v.discrepancy)}`, 14, y); y += 7;
    doc.text(`Quantum Benefício: ${formatCurrency(v.quantum)}`, 14, y); y += 15;
    
    // Veredicto
    doc.setFontSize(16);
    doc.text(`VEREDICTO: ${verdict.level}`, 14, y); 
    
    doc.save(`Parecer_VDC_${VDCSystem.sessionId}.pdf`);
    log('PDF Gerado com Sucesso', 'success');
}

// ============================================================================
// 9. FUNÇÕES AUXILIARES
// ============================================================================

function activateDemo() {
    log("A CARREGAR CASO SIMULADO...", "info");
    
    VDCSystem.client = { name: 'DEMO CORP, LDA', nif: '503244732' };
    document.getElementById('clientNameFixed').value = 'DEMO CORP, LDA';
    document.getElementById('clientNIFFixed').value = '503244732';
    
    // Dados simulados
    VDCSystem.analysis.extractedValues = {
        saft_bruto: 10000, saft_faturado: 10000,
        ext_bruto: 15000, ext_comis: 2000, ext_liquido: 13000,
        discrepancy: 5000, quantum: 6500
    };
    
    // Render imediato
    updateDashboard();
    performAudit();
    updateCounts();
    
    showToast('Caso Demo Carregado', 'success');
}

function updateCounts() {
    const saftCount = VDCSystem.documents.saft.files.length;
    const stmtCount = VDCSystem.documents.statements.files.length;
    
    document.getElementById('saftCountCompact').textContent = saftCount;
    document.getElementById('statementCountCompact').textContent = stmtCount;
    document.getElementById('evidenceCountTotal').textContent = saftCount + stmtCount;
}

function generateMasterHash() {
    const str = JSON.stringify(VDCSystem.documents) + VDCSystem.sessionId;
    const hash = CryptoJS.SHA256(str).toString();
    document.getElementById('masterHashValue').textContent = hash.substring(0, 24) + '...';
}

function populateYears() {
    const sel = document.getElementById('anoFiscal');
    for (let y = 2030; y >= 2015; y--) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        sel.appendChild(opt);
    }
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-PT');
        document.getElementById('currentTime').textContent = now.toLocaleTimeString('pt-PT');
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
    }, 1000);
}
```
