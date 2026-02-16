/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.8 CSI MIAMI EDITION
 * ====================================================================
 * EXTRAÇÃO OTIMIZADA · SILENCIOSA · PRECISÃO FORENSE
 * ====================================================================
 */

'use strict';

console.log('🔬 VDC FORENSE v12.8 CSI MIAMI · Sistema Inicializado');

// ============================================================================
// CONFIGURAÇÃO DO PDF.JS
// ============================================================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================================================
// ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.8-CSI-MIAMI',
    sessionId: null,
    client: null,
    processing: false,
    logs: [],
    masterHash: '',
    analysis: {
        appGains: 0,
        operatorInvoices: 0,
        dac7Value: 0,
        saftTotal: 0,
        extrato: {
            ganhosApp: 0,
            ganhosCampanha: 0,
            gorjetas: 0,
            portagens: 0,
            taxasCancelamento: 0,
            comissoes: 0,
            ganhosLiquidos: 0
        },
        fatura: {
            numero: '',
            periodo: '',
            totalIVA: 0,
            autoliquidacao: 0
        },
        dac7: {
            totalAnual: 0,
            trimestres: {
                q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        }
    },
    documents: {
        control: { files: [], fileNames: [] },
        saft: { files: [], fileNames: [] },
        invoices: { files: [], fileNames: [] },
        statements: { files: [], fileNames: [] },
        dac7: { files: [], fileNames: [] }
    },
    chart: null
};

const extractionStats = {
    pdfProcessed: 0,
    valuesFound: 0,
    saft: { count: 0, values: 0 },
    invoices: { count: 0, values: 0 },
    statements: { count: 0, values: 0 },
    dac7: { count: 0, values: 0 }
};

// ============================================================================
// UTILITÁRIOS FORENSES
// ============================================================================
const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const parseNumericValue = (str) => {
    if (!str) return 0;
    let clean = str.toString().trim();
    
    // Remover símbolos de moeda e espaços
    clean = clean.replace(/[€$£¥]/g, '');
    clean = clean.replace(/\s/g, '');
    clean = clean.replace(/[^\d.,-]/g, '');
    
    // Detectar formato europeu vs americano
    if (clean.indexOf(',') > -1 && clean.indexOf('.') > -1) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.indexOf(',') > -1 && clean.indexOf('.') === -1) {
        const parts = clean.split(',');
        if (parts[1] && parts[1].length === 2) {
            clean = clean.replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    }
    
    const result = parseFloat(clean) || 0;
    return forensicRound(result);
};

const formatCurrency = (value) => {
    return forensicRound(value).toLocaleString('pt-PT', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }) + ' €';
};

const validateNIF = (nif) => {
    if (!nif || !/^\d{9}$/.test(nif)) return false;
    const first = parseInt(nif[0]);
    if (![1, 2, 3, 5, 6, 8, 9].includes(first)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += parseInt(nif[i]) * (9 - i);
    const mod = sum % 11;
    const checkDigit = (mod < 2) ? 0 : 11 - mod;
    return parseInt(nif[8]) === checkDigit;
};

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

const generateSessionId = () => {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 7).toUpperCase();
};

// ============================================================================
// EXTRAÇÃO DE PDF - OTIMIZADA E SILENCIOSA
// ============================================================================
async function processPDF(file, type) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let rawText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            // Normalização agressiva para evitar "barulho" de caracteres invisíveis
            rawText += content.items.map(s => s.str).join(' ') + " ";
        }
        
        // Limpeza forense do texto
        const clean = rawText.replace(/\s+/g, ' ');
        
        let extracted = false;

        // Matcher Flexível para Ganhos na App (Extrato Bolt)
        const gMatch = clean.match(/Ganhos na app\D*([\d\s.,]+)/i);
        if (gMatch && type === 'statements') {
            const valor = parseNumericValue(gMatch[1]);
            VDCSystem.analysis.extrato.ganhosApp = valor;
            VDCSystem.analysis.appGains = valor;
            extractionStats.statements.values++;
            extractionStats.valuesFound++;
            logAudit(`✓ Ganhos App extraídos: ${formatCurrency(valor)}`, 'success');
            extracted = true;
        }

        // Matcher para Ganhos da Campanha
        const campMatch = clean.match(/Ganhos da campanha\D*([\d\s.,]+)/i);
        if (campMatch && type === 'statements') {
            VDCSystem.analysis.extrato.ganhosCampanha = parseNumericValue(campMatch[1]);
            extracted = true;
        }

        // Matcher para Gorjetas
        const gorjMatch = clean.match(/Gorjetas dos passageiros\D*([\d\s.,]+)/i);
        if (gorjMatch && type === 'statements') {
            VDCSystem.analysis.extrato.gorjetas = parseNumericValue(gorjMatch[1]);
            extracted = true;
        }

        // Matcher para Portagens
        const portMatch = clean.match(/Portagens\D*([\d\s.,]+)/i);
        if (portMatch && type === 'statements') {
            VDCSystem.analysis.extrato.portagens = parseNumericValue(portMatch[1]);
            extracted = true;
        }

        // Matcher para Taxas de Cancelamento
        const cancelMatch = clean.match(/Taxas de cancelamento\D*([\d\s.,]+)/i);
        if (cancelMatch && type === 'statements') {
            VDCSystem.analysis.extrato.taxasCancelamento = parseNumericValue(cancelMatch[1]);
            extracted = true;
        }

        // Matcher para Comissão da App
        const comisMatch = clean.match(/Comissão da app\D*(-?[\d\s.,]+)/i);
        if (comisMatch && type === 'statements') {
            VDCSystem.analysis.extrato.comissoes = Math.abs(parseNumericValue(comisMatch[1]));
            extracted = true;
        }

        // Matcher para Ganhos Líquidos
        const liqMatch = clean.match(/Ganhos líquidos\D*([\d\s.,]+)/i);
        if (liqMatch && type === 'statements') {
            VDCSystem.analysis.extrato.ganhosLiquidos = parseNumericValue(liqMatch[1]);
            extracted = true;
        }

        // Matcher Flexível para Faturas (Total com IVA)
        const fMatch = clean.match(/Total com IVA \(EUR\)\D*([\d\s.,]+)/i);
        if (fMatch && type === 'invoices') {
            const valor = parseNumericValue(fMatch[1]);
            VDCSystem.analysis.fatura.totalIVA = valor;
            VDCSystem.analysis.operatorInvoices = valor;
            extractionStats.invoices.values++;
            extractionStats.valuesFound++;
            logAudit(`✓ Fatura extraída: ${formatCurrency(valor)}`, 'success');
            extracted = true;
        }

        // Extrair Número da Fatura
        const numMatch = clean.match(/Fatura\s*n\.?[º°]?\s*([A-Z0-9\-]+)/i);
        if (numMatch && type === 'invoices') {
            VDCSystem.analysis.fatura.numero = numMatch[1].trim();
            extracted = true;
        }

        // Extrair Período da Fatura
        const perMatch = clean.match(/Período[:\s]*(\d{2}[-/]\d{2}[-/]\d{4}[^a-zA-Z]*?\d{2}[-/]\d{2}[-/]\d{4})/i) ||
                        clean.match(/relativas ao período de\s+(\d{2}[-/]\d{2}[-/]\d{4}[^a-zA-Z]*?\d{2}[-/]\d{2}[-/]\d{4})/i);
        if (perMatch && type === 'invoices') {
            VDCSystem.analysis.fatura.periodo = perMatch[1].trim();
            extracted = true;
        }

        // Extrair Autoliquidação
        const autoMatch = clean.match(/A pagar[:\s]*€?\s*([\d\s.,]+)/i);
        if (autoMatch && type === 'invoices') {
            VDCSystem.analysis.fatura.autoliquidacao = parseNumericValue(autoMatch[1]);
            extracted = true;
        }

        // Matcher para DAC7 (Total de receitas anuais)
        const dMatch = clean.match(/Total de receitas anuais[:\s]*€?\s*([\d\s.,]+)/i);
        if (dMatch && type === 'dac7') {
            const valor = parseNumericValue(dMatch[1]);
            VDCSystem.analysis.dac7.totalAnual = valor;
            VDCSystem.analysis.dac7Value = valor;
            extractionStats.dac7.values++;
            extractionStats.valuesFound++;
            logAudit(`✓ DAC7 Total extraído: ${formatCurrency(valor)}`, 'success');
            extracted = true;
        }

        // Extrair dados trimestrais DAC7
        if (type === 'dac7') {
            const trimestres = [
                { num: '1', key: 'q1' },
                { num: '2', key: 'q2' },
                { num: '3', key: 'q3' },
                { num: '4', key: 'q4' }
            ];

            trimestres.forEach(({ num, key }) => {
                // Ganhos do trimestre
                const ganhosRegex = new RegExp(`Ganhos do ${num}[º°o]?\\s*trimestre[\\s:]*€?\\s*([\\d\\s.,]+)`, 'i');
                const ganhosMatch = clean.match(ganhosRegex);
                if (ganhosMatch) {
                    VDCSystem.analysis.dac7.trimestres[key].ganhos = parseNumericValue(ganhosMatch[1]);
                }

                // Comissões do trimestre
                const comRegex = new RegExp(`Comissões do ${num}[º°o]?\\s*trimestre[\\s:]*€?\\s*([\\d\\s.,]+)`, 'i');
                const comMatch = clean.match(comRegex);
                if (comMatch) {
                    VDCSystem.analysis.dac7.trimestres[key].comissoes = parseNumericValue(comMatch[1]);
                }

                // Impostos do trimestre
                const impRegex = new RegExp(`Impostos do ${num}[º°o]?\\s*trimestre[\\s:]*€?\\s*([\\d\\s.,]+)`, 'i');
                const impMatch = clean.match(impRegex);
                if (impMatch) {
                    VDCSystem.analysis.dac7.trimestres[key].impostos = parseNumericValue(impMatch[1]);
                }

                // Serviços prestados
                const servRegex = new RegExp(`Serviços prestados no ${num}[º°o]?\\s*trimestre[\\s:]*([\\d\\s.,]+)`, 'i');
                const servMatch = clean.match(servRegex);
                if (servMatch) {
                    VDCSystem.analysis.dac7.trimestres[key].servicos = parseInt(servMatch[1].replace(/\D/g, '')) || 0;
                }
            });
        }

        extractionStats.pdfProcessed++;
        
        // IMPORTANTE: Renderizar apenas uma vez no final para estabilizar o buffer
        if (extracted) {
            renderAll();
        }
        
        return extracted;
        
    } catch (error) {
        logAudit(`❌ Erro ao processar PDF: ${error.message}`, 'error');
        return false;
    }
}

// ============================================================================
// PROCESSAMENTO DE CSV (SAF-T)
// ============================================================================
function processCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                let total = 0;
                let count = 0;
                
                results.data.forEach(row => {
                    const val = row["Preço da viagem"] || 
                               row["Preço da viagem (sem IVA)"] || 
                               row["Total"] ||
                               row["Valor"];
                    if (val) {
                        total += parseNumericValue(val);
                        count++;
                    }
                });
                
                if (total > 0) {
                    VDCSystem.analysis.saftTotal += total;
                    extractionStats.saft.values += count;
                    extractionStats.valuesFound++;
                    logAudit(`✓ SAF-T processado: ${formatCurrency(total)}`, 'success');
                    renderAll();
                }
                
                resolve(true);
            },
            error: () => resolve(false)
        });
    });
}

// ============================================================================
// HANDLE UPLOAD - SILENCIOSO E ESTÁVEL
// ============================================================================
async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Guardar ficheiros
    VDCSystem.documents[type].files.push(...files);
    files.forEach(f => VDCSystem.documents[type].fileNames.push(f.name));
    
    showToast(`📂 A processar ${files.length} ficheiro(s)...`, 'info', 1500);
    
    // Processar sequencialmente para evitar sobrecarga
    for (const file of files) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            await processPDF(file, type);
        } else if (file.name.endsWith('.csv')) {
            await processCSV(file);
        }
    }
    
    // Atualizar estatísticas dos boxes
    updateBoxStats(type);
    updateCompactCounters();
    updateAnalysisButton();
    generateMasterHash();
    
    showToast(`✅ ${files.length} ficheiro(s) processado(s)`, 'success', 2000);
}

// ============================================================================
// ATUALIZAR INTERFACE
// ============================================================================
function updateBoxStats(type) {
    const count = VDCSystem.documents[type].files.length;
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    
    const countEl = document.getElementById(`box${typeCapitalized}Count`);
    if (countEl) countEl.textContent = count;
    
    const valuesEl = document.getElementById(`box${typeCapitalized}Values`);
    if (valuesEl) {
        let values = 0;
        switch(type) {
            case 'saft': values = extractionStats.saft.values; break;
            case 'invoices': values = extractionStats.invoices.values; break;
            case 'statements': values = extractionStats.statements.values; break;
            case 'dac7': values = extractionStats.dac7.values; break;
        }
        valuesEl.textContent = values;
    }
    
    updateFileList(type);
}

function updateFileList(type) {
    const listId = {
        'control': 'controlFileListModal',
        'saft': 'saftFileListModal',
        'invoices': 'invoicesFileListModal',
        'statements': 'statementsFileListModal',
        'dac7': 'dac7FileListModal'
    }[type];
    
    const listEl = document.getElementById(listId);
    if (!listEl) return;
    
    listEl.innerHTML = '';
    VDCSystem.documents[type].fileNames.forEach((name, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span class="file-item-name">${name}</span>
            <button class="file-item-remove" onclick="removeFile('${type}', ${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        listEl.appendChild(item);
    });
}

function removeFile(type, index) {
    VDCSystem.documents[type].files.splice(index, 1);
    VDCSystem.documents[type].fileNames.splice(index, 1);
    updateBoxStats(type);
    updateCompactCounters();
}

function updateCompactCounters() {
    setElementText('controlCountCompact', VDCSystem.documents.control.files.length);
    setElementText('saftCountCompact', VDCSystem.documents.saft.files.length);
    setElementText('invoiceCountCompact', VDCSystem.documents.invoices.files.length);
    setElementText('statementCountCompact', VDCSystem.documents.statements.files.length);
    setElementText('dac7CountCompact', VDCSystem.documents.dac7.files.length);
    
    const total = Object.values(VDCSystem.documents).reduce((acc, doc) => acc + doc.files.length, 0);
    setElementText('evidenceCountTotal', total);
}

// ============================================================================
// RENDERIZAR TODA A INTERFACE - ÚNICA CHAMADA
// ============================================================================
function renderAll() {
    // Resultados gerais (Dashboard topo)
    setElementText('appGainsDisplay', formatCurrency(VDCSystem.analysis.appGains));
    setElementText('operatorInvoicesDisplay', formatCurrency(VDCSystem.analysis.operatorInvoices));
    setElementText('dac7ValueDisplay', formatCurrency(VDCSystem.analysis.dac7Value));
    setElementText('saftTotalDisplay', formatCurrency(VDCSystem.analysis.saftTotal));
    
    // Módulo Extrato - valores detalhados
    setElementText('stmtGanhosApp', formatCurrency(VDCSystem.analysis.extrato.ganhosApp));
    setElementText('stmtGanhosCampanha', formatCurrency(VDCSystem.analysis.extrato.ganhosCampanha));
    setElementText('stmtGorjetas', formatCurrency(VDCSystem.analysis.extrato.gorjetas));
    setElementText('stmtPortagens', formatCurrency(VDCSystem.analysis.extrato.portagens));
    setElementText('stmtTaxasCancel', formatCurrency(VDCSystem.analysis.extrato.taxasCancelamento));
    setElementText('stmtComissao', formatCurrency(VDCSystem.analysis.extrato.comissoes));
    setElementText('stmtLiquido', formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos));
    
    // Módulo Fatura
    setElementText('invoiceNumero', VDCSystem.analysis.fatura.numero || '---');
    setElementText('invoiceTotal', formatCurrency(VDCSystem.analysis.fatura.totalIVA));
    setElementText('invoiceAutoliquidacao', formatCurrency(VDCSystem.analysis.fatura.autoliquidacao));
    
    // Módulo DAC7 - Total
    setElementText('dac7TotalValue', formatCurrency(VDCSystem.analysis.dac7.totalAnual));
    
    // DAC7 - Trimestres
    const trimestres = ['q1', 'q2', 'q3', 'q4'];
    trimestres.forEach(q => {
        const data = VDCSystem.analysis.dac7.trimestres[q];
        setElementText(`dac7${q.toUpperCase()}Value`, formatCurrency(data.ganhos));
        setElementText(`dac7${q.toUpperCase()}Comissoes`, `Comis: ${formatCurrency(data.comissoes)}`);
        setElementText(`dac7${q.toUpperCase()}Impostos`, `Imp: ${formatCurrency(data.impostos)}`);
        setElementText(`dac7${q.toUpperCase()}Servicos`, `Serv: ${data.servicos}`);
    });
    
    // Status de extração
    updateExtractionStatus();
}

function updateExtractionStatus() {
    const statusIcon = document.getElementById('extractionStatusIcon');
    const statusText = document.getElementById('extractionStatusText');
    
    if (extractionStats.valuesFound > 0) {
        statusIcon.className = 'status-icon active';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = `${extractionStats.valuesFound} valor(es)`;
        statusText.style.color = 'var(--csi-green)';
    } else {
        statusIcon.className = 'status-icon';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = 'AGUARDANDO';
        statusText.style.color = 'var(--text-secondary)';
    }
}

// ============================================================================
// EVENT LISTENERS E INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    populateAnoFiscal();
    startClock();
    logAudit('🔬 Sistema Forense v12.8 CSI MIAMI pronto', 'info');
});

function setupEventListeners() {
    // Splash
    document.getElementById('startSessionBtn')?.addEventListener('click', startSession);
    
    // Modal evidências
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', openEvidenceModal);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeEvidenceModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeEvidenceModal);
    document.getElementById('clearAllEvidenceBtn')?.addEventListener('click', clearAllEvidence);
    
    // Uploads
    setupUploadButtons();
    
    // Cliente
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    
    // Análise e exportações
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportJSON);
    
    // Outros
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'flex';
    });
    document.getElementById('closeHelpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'none';
    });
    document.getElementById('resetBtn')?.addEventListener('click', resetSystem);
    document.getElementById('clearConsoleBtn')?.addEventListener('click', clearConsole);
    document.getElementById('clearConsoleBtn2')?.addEventListener('click', clearConsole);
    
    // Fechar modais ao clicar fora
    document.getElementById('evidenceModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'evidenceModal') closeEvidenceModal();
    });
    document.getElementById('helpModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'helpModal') document.getElementById('helpModal').style.display = 'none';
    });
}

function setupUploadButtons() {
    const types = [
        { btn: 'controlUploadBtnModal', input: 'controlFileModal', type: 'control' },
        { btn: 'saftUploadBtnModal', input: 'saftFileModal', type: 'saft' },
        { btn: 'invoiceUploadBtnModal', input: 'invoiceFileModal', type: 'invoices' },
        { btn: 'statementUploadBtnModal', input: 'statementFileModal', type: 'statements' },
        { btn: 'dac7UploadBtnModal', input: 'dac7FileModal', type: 'dac7' }
    ];
    
    types.forEach(({ btn, input, type }) => {
        const button = document.getElementById(btn);
        const fileInput = document.getElementById(input);
        
        if (button && fileInput) {
            button.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
}

// ============================================================================
// SESSÃO
// ============================================================================
function startSession() {
    const splash = document.getElementById('splashScreen');
    const loading = document.getElementById('loadingOverlay');
    
    splash.style.opacity = '0';
    setTimeout(() => {
        splash.style.display = 'none';
        loading.style.display = 'flex';
        simulateLoading();
    }, 500);
}

function simulateLoading() {
    let progress = 0;
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    
    const interval = setInterval(() => {
        progress += 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(showMainInterface, 300);
        }
        
        bar.style.width = progress + '%';
        text.textContent = `${progress}%`;
    }, 100);
}

function showMainInterface() {
    const loading = document.getElementById('loadingOverlay');
    const main = document.getElementById('mainContainer');
    
    loading.style.opacity = '0';
    setTimeout(() => {
        loading.style.display = 'none';
        main.style.display = 'flex';
        setTimeout(() => main.style.opacity = '1', 50);
    }, 500);
    
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    setElementText('miniHash', VDCSystem.sessionId.substring(0, 12) + '...');
    
    logAudit('✅ Sessão iniciada: ' + VDCSystem.sessionId, 'success');
}

// ============================================================================
// MODAL EVIDÊNCIAS
// ============================================================================
function openEvidenceModal() {
    document.getElementById('evidenceModal').style.display = 'flex';
    logAudit('📂 Gestão de evidências aberta', 'info');
}

function closeEvidenceModal() {
    document.getElementById('evidenceModal').style.display = 'none';
    updateAnalysisButton();
    logAudit('📂 Gestão de evidências fechada', 'info');
}

function clearAllEvidence() {
    if (!confirm('Limpar TODAS as evidências?')) return;
    
    // Reset dados
    VDCSystem.analysis.appGains = 0;
    VDCSystem.analysis.operatorInvoices = 0;
    VDCSystem.analysis.dac7Value = 0;
    VDCSystem.analysis.saftTotal = 0;
    VDCSystem.analysis.extrato = { ganhosApp: 0, ganhosCampanha: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, comissoes: 0, ganhosLiquidos: 0 };
    VDCSystem.analysis.fatura = { numero: '', periodo: '', totalIVA: 0, autoliquidacao: 0 };
    VDCSystem.analysis.dac7 = { totalAnual: 0, trimestres: { q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 } } };
    
    Object.keys(VDCSystem.documents).forEach(key => {
        VDCSystem.documents[key] = { files: [], fileNames: [] };
    });
    
    Object.keys(extractionStats).forEach(key => {
        if (typeof extractionStats[key] === 'number') {
            extractionStats[key] = 0;
        } else {
            extractionStats[key] = { count: 0, values: 0 };
        }
    });
    
    ['controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 'statementsFileListModal', 'dac7FileListModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(type => updateBoxStats(type));
    updateCompactCounters();
    renderAll();
    updateAnalysisButton();
    generateMasterHash();
    
    logAudit('🗑️ Evidências removidas', 'warn');
    showToast('Evidências removidas', 'warning');
}

// ============================================================================
// CLIENTE
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();
    
    if (!name || name.length < 3) {
        showToast('Nome inválido', 'error');
        return;
    }
    
    if (!validateNIF(nif)) {
        showToast('NIF inválido', 'error');
        return;
    }
    
    VDCSystem.client = { name, nif, registeredAt: new Date().toISOString() };
    
    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);
    
    logAudit(`👤 Cliente: ${name} (${nif})`, 'success');
    showToast('Cliente validado', 'success');
    updateAnalysisButton();
}

// ============================================================================
// MODO DEMO
// ============================================================================
function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.processing = true;
    
    const btn = document.getElementById('demoModeBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A CARREGAR...';
    
    document.getElementById('clientNameFixed').value = 'Momento Eficaz - Unip, Lda';
    document.getElementById('clientNIFFixed').value = '517905450';
    registerClient();
    
    // Dados do exemplo fornecido
    VDCSystem.analysis.extrato.ganhosApp = 3157.94;
    VDCSystem.analysis.appGains = 3157.94;
    VDCSystem.analysis.extrato.ganhosCampanha = 20.00;
    VDCSystem.analysis.extrato.gorjetas = 9.00;
    VDCSystem.analysis.extrato.portagens = 15.50;
    VDCSystem.analysis.extrato.taxasCancelamento = 15.60;
    VDCSystem.analysis.extrato.comissoes = 792.59;
    VDCSystem.analysis.extrato.ganhosLiquidos = 2409.95;
    
    VDCSystem.analysis.fatura.numero = 'PT1125-3582';
    VDCSystem.analysis.fatura.periodo = '01-10-2024 a 31-12-2024';
    VDCSystem.analysis.fatura.totalIVA = 239.00;
    VDCSystem.analysis.operatorInvoices = 239.00;
    VDCSystem.analysis.fatura.autoliquidacao = 0.00;
    
    VDCSystem.analysis.dac7.totalAnual = 7755.16;
    VDCSystem.analysis.dac7Value = 7755.16;
    VDCSystem.analysis.dac7.trimestres.q1 = { ganhos: 0.00, comissoes: 0.00, impostos: 0.00, servicos: 0 };
    VDCSystem.analysis.dac7.trimestres.q2 = { ganhos: 0.00, comissoes: 0.00, impostos: 0.00, servicos: 0 };
    VDCSystem.analysis.dac7.trimestres.q3 = { ganhos: 0.00, comissoes: 23.94, impostos: 0.00, servicos: 26 };
    VDCSystem.analysis.dac7.trimestres.q4 = { ganhos: 7755.16, comissoes: 239.00, impostos: 0.00, servicos: 1648 };
    
    extractionStats.pdfProcessed = 3;
    extractionStats.valuesFound = 15;
    extractionStats.statements = { count: 1, values: 7 };
    extractionStats.invoices = { count: 1, values: 3 };
    extractionStats.dac7 = { count: 1, values: 8 };
    
    setTimeout(() => {
        renderAll();
        updateCompactCounters();
        updateAnalysisButton();
        generateMasterHash();
        
        btn.innerHTML = '<i class="fas fa-flask"></i> CASO SIMULADO';
        VDCSystem.processing = false;
        
        logAudit('🎮 Caso simulado carregado', 'success');
        showToast('Caso simulado ativo', 'success');
    }, 500);
}

// ============================================================================
// PERÍCIA FORENSE
// ============================================================================
function performAudit() {
    if (!VDCSystem.client) {
        showToast('Registe o cliente primeiro', 'error');
        return;
    }
    
    if (extractionStats.valuesFound === 0) {
        showToast('Carregue ficheiros primeiro', 'error');
        return;
    }
    
    const btn = document.getElementById('analyzeBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A ANALISAR...';
    
    setTimeout(() => {
        const extratoTotal = VDCSystem.analysis.extrato.ganhosApp + 
                            VDCSystem.analysis.extrato.ganhosCampanha + 
                            VDCSystem.analysis.extrato.gorjetas;
        
        const faturaTotal = VDCSystem.analysis.fatura.totalIVA;
        const dac7Total = VDCSystem.analysis.dac7.totalAnual;
        
        let discrepancia = 0;
        let percentagem = 0;
        
        if (dac7Total > 0 && extratoTotal > 0) {
            discrepancia = Math.abs(dac7Total - extratoTotal);
            percentagem = (discrepancia / dac7Total) * 100;
        }
        
        let nivel = 'BAIXO RISCO';
        let cor = 'var(--csi-green)';
        let descricao = 'Conformidade fiscal verificada.';
        let classe = 'verdict-low';
        
        if (percentagem > 5 && percentagem <= 15) {
            nivel = 'RISCO MÉDIO';
            cor = 'var(--csi-amber)';
            descricao = 'Discrepâncias detetadas. Auditoria recomendada.';
            classe = 'verdict-med';
        } else if (percentagem > 15) {
            nivel = 'CRÍTICO';
            cor = 'var(--csi-red)';
            descricao = 'Indício de fraude fiscal (Art. 103.º RGIT).';
            classe = 'verdict-high';
        }
        
        const verdictDisplay = document.getElementById('verdictDisplay');
        verdictDisplay.style.display = 'block';
        verdictDisplay.className = `verdict-display active ${classe}`;
        
        setElementText('verdictLevel', nivel);
        document.getElementById('verdictLevel').style.color = cor;
        setElementText('verdictPercentValue', `Desvio: ${percentagem.toFixed(2)}%`);
        setElementText('verdictDesc', descricao);
        
        if (percentagem > 5) {
            document.getElementById('bigDataAlert').style.display = 'flex';
            setElementText('alertDeltaValue', formatCurrency(discrepancia));
        }
        
        setElementText('statNet', formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos));
        setElementText('statComm', formatCurrency(VDCSystem.analysis.extrato.comissoes));
        setElementText('statJuros', formatCurrency(discrepancia));
        document.getElementById('jurosCard').style.display = 'block';
        
        setElementText('kpiGrossValue', formatCurrency(extratoTotal));
        setElementText('kpiCommValue', formatCurrency(VDCSystem.analysis.extrato.comissoes));
        setElementText('kpiNetValue', formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos));
        setElementText('kpiInvValue', formatCurrency(faturaTotal));
        
        renderChart(extratoTotal, VDCSystem.analysis.extrato.comissoes, 
                   VDCSystem.analysis.extrato.ganhosLiquidos, faturaTotal, discrepancia);
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search-dollar"></i> EXECUTAR PERÍCIA';
        
        logAudit(`⚖️ Perícia: ${nivel} (${percentagem.toFixed(2)}%)`, 'success');
        showToast('Análise concluída', 'success');
        
    }, 800);
}

// ============================================================================
// GRÁFICO
// ============================================================================
function renderChart(bruto, comissoes, liquido, faturado, discrepancia) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissões', 'Líquido', 'Faturado', 'Discrep.'],
            datasets: [{
                label: '€',
                data: [bruto, comissoes, liquido, faturado, discrepancia],
                backgroundColor: [
                    'rgba(0, 245, 255, 0.7)',
                    'rgba(255, 170, 0, 0.7)',
                    'rgba(0, 255, 136, 0.7)',
                    'rgba(255, 0, 255, 0.7)',
                    'rgba(255, 51, 51, 0.7)'
                ],
                borderColor: [
                    'rgba(0, 245, 255, 1)',
                    'rgba(255, 170, 0, 1)',
                    'rgba(0, 255, 136, 1)',
                    'rgba(255, 0, 255, 1)',
                    'rgba(255, 51, 51, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: '#a0b8d0',
                        callback: (v) => v.toLocaleString('pt-PT') + ' €'
                    }
                },
                x: { 
                    grid: { display: false }, 
                    ticks: { color: '#a0b8d0' } 
                }
            }
        }
    });
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================
function exportJSON() {
    const exportData = {
        metadata: {
            version: VDCSystem.version,
            sessionId: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            client: VDCSystem.client
        },
        analysis: VDCSystem.analysis,
        extractionStats: extractionStats
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VDC_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    logAudit('📄 JSON exportado', 'success');
    showToast('JSON exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Sem cliente registado', 'error');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        showToast('jsPDF não carregado', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(5, 10, 20);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(0, 245, 255);
    doc.setFontSize(18);
    doc.text('VDC FORENSE', 105, 12, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('PARECER PERICIAL', 105, 20, { align: 'center' });
    
    let y = 35;
    
    doc.setTextColor(0, 245, 255);
    doc.setFontSize(11);
    doc.text('DADOS DO SUJEITO', 14, y); y += 7;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Nome: ${VDCSystem.client.name}`, 14, y); y += 6;
    doc.text(`NIF: ${VDCSystem.client.nif}`, 14, y); y += 6;
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 14, y); y += 10;
    
    doc.setTextColor(0, 245, 255);
    doc.text('RESULTADOS', 14, y); y += 7;
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Ganhos App: ${formatCurrency(VDCSystem.analysis.extrato.ganhosApp)}`, 14, y); y += 6;
    doc.text(`Comissões: ${formatCurrency(VDCSystem.analysis.fatura.totalIVA)}`, 14, y); y += 6;
    doc.text(`DAC7: ${formatCurrency(VDCSystem.analysis.dac7.totalAnual)}`, 14, y); y += 10;
    
    doc.setFillColor(5, 10, 20);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(160, 184, 208);
    doc.setFontSize(8);
    doc.text(`HASH: ${VDCSystem.masterHash || 'N/A'}`, 105, 287, { align: 'center' });
    doc.text(`Gerado: ${new Date().toLocaleString('pt-PT')}`, 105, 292, { align: 'center' });
    
    doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
    
    logAudit('📑 PDF exportado', 'success');
    showToast('PDF gerado', 'success');
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================
function generateMasterHash() {
    const data = JSON.stringify({
        client: VDCSystem.client,
        session: VDCSystem.sessionId,
        timestamp: Date.now(),
        analysis: VDCSystem.analysis
    });
    
    if (typeof CryptoJS !== 'undefined') {
        VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
        setElementText('masterHashValue', VDCSystem.masterHash);
        setElementText('miniHash', VDCSystem.masterHash.substring(0, 12) + '...');
    }
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    const btnPDF = document.getElementById('exportPDFBtn');
    const hasData = extractionStats.valuesFound > 0;
    const hasClient = VDCSystem.client !== null;
    
    btn.disabled = !hasData || !hasClient;
    btnPDF.disabled = !hasClient;
}

function populateAnoFiscal() {
    const select = document.getElementById('anoFiscal');
    if (!select) return;
    
    const currentYear = new Date().getFullYear();
    select.innerHTML = '';
    
    for (let ano = currentYear + 1; ano >= 2018; ano--) {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        if (ano === currentYear) opt.selected = true;
        select.appendChild(opt);
    }
}

function startClock() {
    const update = () => {
        const now = new Date();
        setElementText('currentDate', now.toLocaleDateString('pt-PT'));
        setElementText('currentTime', now.toLocaleTimeString('pt-PT'));
    };
    update();
    setInterval(update, 1000);
}

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const entry = { timestamp, message, type };
    VDCSystem.logs.push(entry);
    
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
        const logEl = document.createElement('div');
        logEl.className = `log-entry log-${type}`;
        logEl.textContent = `[${timestamp}] ${message}`;
        consoleOutput.appendChild(logEl);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><p>${message}</p>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function clearConsole() {
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) consoleOutput.innerHTML = '';
    VDCSystem.logs = [];
    logAudit('🧹 Console limpo', 'info');
}

function resetSystem() {
    if (!confirm('Reiniciar sistema?')) return;
    location.reload();
}

// ============================================================================
// SEGURANÇA
// ============================================================================
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.master-hash') || e.target.closest('.session-id')) {
        e.preventDefault();
    }
});

/* =====================================================================
   FIM DO SCRIPT · v12.8 CSI MIAMI EDITION
   ===================================================================== */
