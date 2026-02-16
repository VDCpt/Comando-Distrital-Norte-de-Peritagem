/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.8 CSI MIAMI EDITION
 * ====================================================================
 * EXTRAÇÃO INTELIGENTE · SILENCIOSA · FORENSE DIGITAL
 * Documentos suportados: Extratos Bolt, Faturas Bolt, DAC7
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
// DADOS DAS PLATAFORMAS
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia',
        nif: 'EE102090374',
        country: 'Estónia',
        vatRate: 0.20
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, 1077 ZX Amesterdão, Países Baixos',
        nif: 'NL852071588B01',
        country: 'Países Baixos',
        vatRate: 0.21
    },
    freenow: {
        name: 'FREE NOW',
        address: 'Rua Example, 123, 1000-001 Lisboa, Portugal',
        nif: 'PT123456789',
        country: 'Portugal',
        vatRate: 0.23
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, 1250-149 Lisboa, Portugal',
        nif: 'PT987654321',
        country: 'Portugal',
        vatRate: 0.23
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, 4000-000 Porto, Portugal',
        nif: 'PT456123789',
        country: 'Portugal',
        vatRate: 0.23
    },
    outra: {
        name: 'Plataforma não especificada',
        address: 'A definir',
        nif: '000000000',
        country: 'Desconhecido',
        vatRate: 0.23
    }
};

// ============================================================================
// ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.8-CSI-MIAMI',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPeriodo: 'anual',
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    logs: [],
    masterHash: '',
    analysis: {
        // Extrato Bolt
        extrato: {
            ganhosApp: 0,
            ganhosCampanha: 0,
            gorjetas: 0,
            portagens: 0,
            taxasCancelamento: 0,
            comissoes: 0,
            ganhosLiquidos: 0
        },
        // Fatura Bolt
        fatura: {
            numero: '',
            periodo: '',
            totalIVA: 0,
            autoliquidacao: 0
        },
        // DAC7
        dac7: {
            totalAnual: 0,
            trimestres: {
                q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        },
        // SAF-T/CSV
        saftTotal: 0,
        verdict: null
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

// Estatísticas de extração
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
    
    // Detectar formato (1.234,56 vs 1,234.56)
    if (clean.indexOf(',') > -1 && clean.indexOf('.') > -1) {
        if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
            // Formato europeu: 1.234,56
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            // Formato americano: 1,234.56
            clean = clean.replace(/,/g, '');
        }
    } else if (clean.indexOf(',') > -1 && clean.indexOf('.') === -1) {
        // Pode ser 1234,56 ou 1,234
        const parts = clean.split(',');
        if (parts[1] && parts[1].length === 2) {
            // Provavelmente decimal: 1234,56
            clean = clean.replace(',', '.');
        } else {
            // Provavelmente separador de milhares: 1,234
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
// EXTRAÇÃO DE PDF - FUNÇÃO PRINCIPAL
// ============================================================================
async function extractPDFContent(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }
        
        return fullText.trim();
    } catch (error) {
        console.error('Erro ao extrair PDF:', error);
        return '';
    }
}

// ============================================================================
// EXTRAÇÃO DE EXTRATO BOLT
// ============================================================================
function extractStatementData(text) {
    const data = {
        ganhosApp: 0,
        ganhosCampanha: 0,
        gorjetas: 0,
        portagens: 0,
        taxasCancelamento: 0,
        comissoes: 0,
        ganhosLiquidos: 0
    };
    
    // Normalizar texto
    const normalized = text.replace(/\s+/g, ' ');
    
    // Padrões de extração para Extrato Bolt
    const patterns = {
        ganhosApp: [
            /Ganhos na app\s+([\d\s.,]+)/i,
            /"Ganhos na app"\s*,\s*"([\d\s.,]+)"/i,
            /Ganhos na app[\s\S]*?(\d[\d\s.,]+)/i
        ],
        ganhosCampanha: [
            /Ganhos da campanha\s+([\d\s.,]+)/i,
            /"Ganhos da campanha"\s*,\s*"([\d\s.,]+)"/i,
            /Ganhos da campanha[\s\S]*?(\d[\d\s.,]+)/i
        ],
        gorjetas: [
            /Gorjetas dos passageiros\s+([\d\s.,]+)/i,
            /"Gorjetas dos passageiros"\s*,\s*"([\d\s.,]+)"/i,
            /Gorjetas[\s\S]*?(\d[\d\s.,]+)/i
        ],
        portagens: [
            /Portagens\s+([\d\s.,]+)/i,
            /"Portagens"\s*,\s*"([\d\s.,]+)"/i
        ],
        taxasCancelamento: [
            /Taxas de cancelamento\s+([\d\s.,]+)/i,
            /"Taxas de cancelamento"\s*,\s*"([\d\s.,]+)"/i,
            /Taxas de cancelamento[\s\S]*?(\d[\d\s.,]+)/i
        ],
        comissoes: [
            /Comissão da app\s+(-?[\d\s.,]+)/i,
            /"Comissão da app"\s*,\s*"(-?[\d\s.,]+)"/i,
            /Despesas[\s\S]*?(-?[\d\s.,]+)/i
        ],
        ganhosLiquidos: [
            /Ganhos líquidos[\s\S]*?(\d[\d\s.,]+)(?:\s*$|\s*Pagamento)/i,
            /Ganhos líquidos\s+([\d\s.,]+)/i
        ]
    };
    
    // Extrair cada valor
    for (const [key, regexList] of Object.entries(patterns)) {
        for (const regex of regexList) {
            const match = normalized.match(regex);
            if (match && match[1]) {
                data[key] = parseNumericValue(match[1]);
                break;
            }
        }
    }
    
    // Se não encontrou ganhos líquidos, calcular
    if (data.ganhosLiquidos === 0) {
        const ganhos = data.ganhosApp + data.ganhosCampanha + data.gorjetas + data.portagens + data.taxasCancelamento;
        data.ganhosLiquidos = ganhos - Math.abs(data.comissoes);
    }
    
    return data;
}

// ============================================================================
// EXTRAÇÃO DE FATURA BOLT
// ============================================================================
function extractInvoiceData(text) {
    const data = {
        numero: '',
        periodo: '',
        totalIVA: 0,
        autoliquidacao: 0
    };
    
    const normalized = text.replace(/\s+/g, ' ');
    
    // Extrair número da fatura
    const numMatch = text.match(/Fatura\s*n\.?[º°]?\s*([A-Z0-9\-]+)/i);
    if (numMatch) {
        data.numero = numMatch[1].trim();
    }
    
    // Extrair período
    const periodoMatch = text.match(/Período[:\s]*(\d{2}[-/]\d{2}[-/]\d{4}\s*(?:a|to|-)\s*\d{2}[-/]\d{2}[-/]\d{4})/i) ||
                         text.match(/relativas ao período de\s+(\d{2}[-/]\d{2}[-/]\d{4}\s*a\s*\d{2}[-/]\d{2}[-/]\d{4})/i);
    if (periodoMatch) {
        data.periodo = periodoMatch[1].trim();
    }
    
    // Extrair Total com IVA
    const totalMatch = text.match(/Total com IVA[\s\(EUR\)]*\s*([\d\s.,]+)/i) ||
                       text.match(/Total\s+IVA\s*0%\s*\n?\s*([\d\s.,]+)/i) ||
                       text.match(/Soma total\s+([\d\s.,]+)/i);
    if (totalMatch) {
        data.totalIVA = parseNumericValue(totalMatch[1]);
    }
    
    // Extrair Autoliquidação (A pagar)
    const autoMatch = text.match(/A pagar[:\s]*€?\s*([\d\s.,]+)/i) ||
                      text.match(/Autoliquidação[\s\S]*?([\d\s.,]+)\s*€/i);
    if (autoMatch) {
        data.autoliquidacao = parseNumericValue(autoMatch[1]);
    }
    
    return data;
}

// ============================================================================
// EXTRAÇÃO DE DAC7
// ============================================================================
function extractDAC7Data(text) {
    const data = {
        totalAnual: 0,
        trimestres: {
            q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
        }
    };
    
    const normalized = text.replace(/\s+/g, ' ');
    
    // Extrair total anual
    const totalMatch = text.match(/Total de receitas anuais[:\s]*€?\s*([\d\s.,]+)/i) ||
                      text.match(/Total de receitas anuais[\s\S]*?(\d[\d\s.,]+)\s*€/i);
    if (totalMatch) {
        data.totalAnual = parseNumericValue(totalMatch[1]);
    }
    
    // Extrair dados por trimestre
    const trimestres = ['1', '2', '3', '4'];
    const trimestreKeys = ['q1', 'q2', 'q3', 'q4'];
    
    trimestres.forEach((num, idx) => {
        const key = trimestreKeys[idx];
        
        // Padrões para cada trimestre
        const ganhosRegex = new RegExp(`Ganhos do ${num}[º°o]?\\s*trimestre[\\s:]*€?\\s*([\\d\\s.,]+)`, 'i');
        const comissoesRegex = new RegExp(`Comissões do ${num}[º°o]?\\s*trimestre[\\s:]*€?\\s*([\\d\\s.,]+)`, 'i');
        const impostosRegex = new RegExp(`Impostos do ${num}[º°o]?\\s*trimestre[\\s:]*€?\\s*([\\d\\s.,]+)`, 'i');
        const servicosRegex = new RegExp(`Serviços prestados no ${num}[º°o]?\\s*trimestre[\\s:]*([\\d\\s.,]+)`, 'i');
        
        const ganhosMatch = text.match(ganhosRegex);
        const comissoesMatch = text.match(comissoesRegex);
        const impostosMatch = text.match(impostosRegex);
        const servicosMatch = text.match(servicosRegex);
        
        if (ganhosMatch) data.trimestres[key].ganhos = parseNumericValue(ganhosMatch[1]);
        if (comissoesMatch) data.trimestres[key].comissoes = parseNumericValue(comissoesMatch[1]);
        if (impostosMatch) data.trimestres[key].impostos = parseNumericValue(impostosMatch[1]);
        if (servicosMatch) data.trimestres[key].servicos = parseInt(servicosMatch[1].replace(/\D/g, '')) || 0;
    });
    
    return data;
}

// ============================================================================
// PROCESSAMENTO DE FICHEIROS
// ============================================================================
async function processPDFFile(file, type) {
    const text = await extractPDFContent(file);
    if (!text) return null;
    
    extractionStats.pdfProcessed++;
    
    let extractedData = null;
    
    switch(type) {
        case 'statements':
            extractedData = extractStatementData(text);
            if (extractedData.ganhosApp > 0 || extractedData.ganhosLiquidos > 0) {
                // Acumular valores
                VDCSystem.analysis.extrato.ganhosApp += extractedData.ganhosApp;
                VDCSystem.analysis.extrato.ganhosCampanha += extractedData.ganhosCampanha;
                VDCSystem.analysis.extrato.gorjetas += extractedData.gorjetas;
                VDCSystem.analysis.extrato.portagens += extractedData.portagens;
                VDCSystem.analysis.extrato.taxasCancelamento += extractedData.taxasCancelamento;
                VDCSystem.analysis.extrato.comissoes += Math.abs(extractedData.comissoes);
                VDCSystem.analysis.extrato.ganhosLiquidos += extractedData.ganhosLiquidos;
                
                extractionStats.statements.values += Object.values(extractedData).filter(v => v > 0).length;
                extractionStats.valuesFound++;
            }
            break;
            
        case 'invoices':
            extractedData = extractInvoiceData(text);
            if (extractedData.totalIVA > 0) {
                VDCSystem.analysis.fatura.numero = extractedData.numero || VDCSystem.analysis.fatura.numero;
                VDCSystem.analysis.fatura.periodo = extractedData.periodo || VDCSystem.analysis.fatura.periodo;
                VDCSystem.analysis.fatura.totalIVA += extractedData.totalIVA;
                VDCSystem.analysis.fatura.autoliquidacao += extractedData.autoliquidacao;
                
                extractionStats.invoices.values++;
                extractionStats.valuesFound++;
            }
            break;
            
        case 'dac7':
            extractedData = extractDAC7Data(text);
            if (extractedData.totalAnual > 0) {
                VDCSystem.analysis.dac7.totalAnual = extractedData.totalAnual;
                VDCSystem.analysis.dac7.trimestres = extractedData.trimestres;
                
                extractionStats.dac7.values += 1 + Object.values(extractedData.trimestres).reduce((acc, t) => 
                    acc + (t.ganhos > 0 ? 1 : 0) + (t.comissoes > 0 ? 1 : 0) + (t.servicos > 0 ? 1 : 0), 0);
                extractionStats.valuesFound++;
            }
            break;
    }
    
    return extractedData;
}

// ============================================================================
// PROCESSAMENTO DE CSV (SAF-T)
// ============================================================================
function processCSVFile(file) {
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
                               row["Valor"] ||
                               row["Net"];
                    if (val) {
                        total += parseNumericValue(val);
                        count++;
                    }
                });
                
                if (total > 0) {
                    VDCSystem.analysis.saftTotal += total;
                    extractionStats.saft.values += count;
                    extractionStats.valuesFound++;
                }
                
                resolve({ total, count });
            },
            error: () => resolve({ total: 0, count: 0 })
        });
    });
}

// ============================================================================
// HANDLE UPLOAD
// ============================================================================
async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // Guardar ficheiros
    VDCSystem.documents[type].files = [...VDCSystem.documents[type].files, ...files];
    VDCSystem.documents[type].fileNames = files.map(f => f.name);
    
    showToast(`📂 A processar ${files.length} ficheiro(s)...`, 'info', 2000);
    
    for (const file of files) {
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            await processPDFFile(file, type);
        } else if (file.name.endsWith('.csv') || file.name.endsWith('.xml')) {
            await processCSVFile(file);
        }
    }
    
    // Atualizar estatísticas do box
    updateBoxStats(type);
    
    // Atualizar contadores compactos
    updateCompactCounters();
    
    // Renderizar interface
    renderInterface();
    
    // Atualizar botão de análise
    updateAnalysisButton();
    
    // Gerar hash
    generateMasterHash();
    
    showToast(`✅ ${files.length} ficheiro(s) processado(s)`, 'success', 2000);
}

// ============================================================================
// ATUALIZAR ESTATÍSTICAS DOS BOXES
// ============================================================================
function updateBoxStats(type) {
    const count = VDCSystem.documents[type].files.length;
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    
    // Atualizar contador de ficheiros
    const countEl = document.getElementById(`box${typeCapitalized}Count`);
    if (countEl) countEl.textContent = count;
    
    // Atualizar valores extraídos
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
    
    // Atualizar lista de ficheiros no modal
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
// RENDERIZAR INTERFACE
// ============================================================================
function renderInterface() {
    // Resultados gerais
    setElementText('appGainsDisplay', formatCurrency(VDCSystem.analysis.extrato.ganhosApp));
    setElementText('operatorInvoicesDisplay', formatCurrency(VDCSystem.analysis.fatura.totalIVA));
    setElementText('dac7ValueDisplay', formatCurrency(VDCSystem.analysis.dac7.totalAnual));
    setElementText('saftTotalDisplay', formatCurrency(VDCSystem.analysis.saftTotal));
    
    // Módulo Extrato - valores detalhados
    setElementText('stmtGanhosApp', formatCurrency(VDCSystem.analysis.extrato.ganhosApp));
    setElementText('stmtGanhosCampanha', formatCurrency(VDCSystem.analysis.extrato.ganhosCampanha));
    setElementText('stmtGorjetas', formatCurrency(VDCSystem.analysis.extrato.gorjetas));
    setElementText('stmtPortagens', formatCurrency(VDCSystem.analysis.extrato.portagens));
    setElementText('stmtTaxasCancel', formatCurrency(VDCSystem.analysis.extrato.taxasCancelamento));
    setElementText('stmtComissao', formatCurrency(VDCSystem.analysis.extrato.comissoes));
    setElementText('stmtLiquido', formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos));
    
    // Estatísticas do módulo extrato
    setElementText('moduleStatsPdf', extractionStats.statements.count);
    setElementText('moduleStatsValues', extractionStats.statements.values);
    setElementText('moduleStatsBolt', extractionStats.statements.count);
    
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
        setElementText(`dac7${q.toUpperCase()}Impostos`, `Impostos: ${formatCurrency(data.impostos)}`);
        setElementText(`dac7${q.toUpperCase()}Servicos`, `Serv: ${data.servicos}`);
    });
    
    // Detalhes da extração
    setElementText('detailValuesFound', extractionStats.valuesFound);
    setElementText('detailBoltFormat', extractionStats.statements.count);
    setElementText('detailUberFormat', extractionStats.invoices.count);
    setElementText('detailPdfCount', extractionStats.pdfProcessed);
    
    // Status de extração
    updateExtractionStatus();
}

function updateExtractionStatus() {
    const statusIcon = document.getElementById('extractionStatusIcon');
    const statusText = document.getElementById('extractionStatusText');
    
    if (extractionStats.valuesFound > 0) {
        statusIcon.className = 'status-icon active';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = `${extractionStats.valuesFound} valor(es) extraído(s)`;
        statusText.style.color = 'var(--csi-green)';
    } else {
        statusIcon.className = 'status-icon';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = 'AGUARDANDO FICHEIROS';
        statusText.style.color = 'var(--text-secondary)';
    }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    populateAnoFiscal();
    startClock();
    logAudit('🔬 VDC Forense v12.8 CSI MIAMI · Sistema pronto', 'info', false);
});

function setupEventListeners() {
    // Splash screen
    document.getElementById('startSessionBtn')?.addEventListener('click', startSession);
    
    // Modal de evidências
    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', openEvidenceModal);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeEvidenceModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeEvidenceModal);
    document.getElementById('clearAllEvidenceBtn')?.addEventListener('click', clearAllEvidence);
    
    // Upload buttons
    setupUploadButtons();
    
    // Cliente
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    
    // Análise
    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    
    // Exportações
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
// SESSÃO E INICIALIZAÇÃO
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
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            setTimeout(showMainInterface, 500);
        }
        
        bar.style.width = progress + '%';
        text.textContent = `MÓDULO FORENSE v12.8... ${Math.floor(progress)}%`;
    }, 200);
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
    
    // Gerar ID de sessão
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    setElementText('miniHash', VDCSystem.sessionId.substring(0, 12) + '...');
    
    logAudit('✅ Sessão iniciada: ' + VDCSystem.sessionId, 'success', false);
}

// ============================================================================
// MODAL DE EVIDÊNCIAS
// ============================================================================
function openEvidenceModal() {
    document.getElementById('evidenceModal').style.display = 'flex';
    logAudit('📂 Gestão de evidências aberta', 'info', false);
}

function closeEvidenceModal() {
    document.getElementById('evidenceModal').style.display = 'none';
    updateAnalysisButton();
    logAudit('📂 Gestão de evidências fechada', 'info', false);
}

function clearAllEvidence() {
    if (!confirm('Tem a certeza que deseja limpar TODAS as evidências?')) return;
    
    // Resetar dados
    VDCSystem.analysis.extrato = { ganhosApp: 0, ganhosCampanha: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, comissoes: 0, ganhosLiquidos: 0 };
    VDCSystem.analysis.fatura = { numero: '', periodo: '', totalIVA: 0, autoliquidacao: 0 };
    VDCSystem.analysis.dac7 = { totalAnual: 0, trimestres: { q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 } } };
    VDCSystem.analysis.saftTotal = 0;
    
    // Resetar documentos
    Object.keys(VDCSystem.documents).forEach(key => {
        VDCSystem.documents[key] = { files: [], fileNames: [] };
    });
    
    // Resetar estatísticas
    Object.keys(extractionStats).forEach(key => {
        if (typeof extractionStats[key] === 'number') {
            extractionStats[key] = 0;
        } else {
            extractionStats[key] = { count: 0, values: 0 };
        }
    });
    
    // Limpar listas de ficheiros
    ['controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 'statementsFileListModal', 'dac7FileListModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    
    // Atualizar boxes
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(type => updateBoxStats(type));
    updateCompactCounters();
    renderInterface();
    updateAnalysisButton();
    generateMasterHash();
    
    logAudit('🗑️ Todas as evidências removidas', 'warn', false);
    showToast('Evidências removidas', 'warning');
}

// ============================================================================
// REGISTO DE CLIENTE
// ============================================================================
function registerClient() {
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    
    const name = nameInput.value.trim();
    const nif = nifInput.value.trim();
    
    if (!name || name.length < 3) {
        showToast('Nome inválido (mínimo 3 caracteres)', 'error');
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
    
    logAudit(`👤 Cliente registado: ${name} (${nif})`, 'success', false);
    showToast('Cliente registado com sucesso', 'success');
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
    
    // Preencher dados do exemplo
    document.getElementById('clientNameFixed').value = 'Momento Eficaz - Unip, Lda';
    document.getElementById('clientNIFFixed').value = '517905450';
    registerClient();
    
    // Dados do extrato
    VDCSystem.analysis.extrato = {
        ganhosApp: 3157.94,
        ganhosCampanha: 20.00,
        gorjetas: 9.00,
        portagens: 15.50,
        taxasCancelamento: 15.60,
        comissoes: 792.59,
        ganhosLiquidos: 2409.95
    };
    
    // Dados da fatura
    VDCSystem.analysis.fatura = {
        numero: 'PT1125-3582',
        periodo: '01-10-2024 a 31-12-2024',
        totalIVA: 239.00,
        autoliquidacao: 0.00
    };
    
    // Dados DAC7
    VDCSystem.analysis.dac7 = {
        totalAnual: 7755.16,
        trimestres: {
            q1: { ganhos: 0.00, comissoes: 0.00, impostos: 0.00, servicos: 0 },
            q2: { ganhos: 0.00, comissoes: 0.00, impostos: 0.00, servicos: 0 },
            q3: { ganhos: 0.00, comissoes: 23.94, impostos: 0.00, servicos: 26 },
            q4: { ganhos: 7755.16, comissoes: 239.00, impostos: 0.00, servicos: 1648 }
        }
    };
    
    // Estatísticas
    extractionStats.pdfProcessed = 3;
    extractionStats.valuesFound = 15;
    extractionStats.statements = { count: 1, values: 7 };
    extractionStats.invoices = { count: 1, values: 3 };
    extractionStats.dac7 = { count: 1, values: 8 };
    
    setTimeout(() => {
        renderInterface();
        updateCompactCounters();
        updateAnalysisButton();
        generateMasterHash();
        
        btn.innerHTML = '<i class="fas fa-flask"></i> CASO SIMULADO';
        VDCSystem.processing = false;
        
        logAudit('🎮 Modo demo ativado com dados de exemplo', 'success', false);
        showToast('Caso simulado carregado', 'success');
    }, 800);
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
        // Calcular discrepâncias
        const extratoTotal = VDCSystem.analysis.extrato.ganhosApp + 
                            VDCSystem.analysis.extrato.ganhosCampanha + 
                            VDCSystem.analysis.extrato.gorjetas;
        
        const faturaTotal = VDCSystem.analysis.fatura.totalIVA;
        const dac7Total = VDCSystem.analysis.dac7.totalAnual;
        
        // Determinar veredicto
        let discrepancia = 0;
        let percentagem = 0;
        
        if (dac7Total > 0 && extratoTotal > 0) {
            discrepancia = Math.abs(dac7Total - extratoTotal);
            percentagem = (discrepancia / dac7Total) * 100;
        }
        
        // Definir nível de risco
        let nivel = 'BAIXO RISCO';
        let cor = 'var(--csi-green)';
        let descricao = 'Sem anomalias detetadas. Conformidade fiscal verificada.';
        let classe = 'verdict-low';
        
        if (percentagem > 5 && percentagem <= 15) {
            nivel = 'RISCO MÉDIO';
            cor = 'var(--csi-amber)';
            descricao = 'Discrepâncias detetadas. Recomenda-se auditoria aprofundada.';
            classe = 'verdict-med';
        } else if (percentagem > 15) {
            nivel = 'CRÍTICO · FRAUDE';
            cor = 'var(--csi-red)';
            descricao = 'Indício de fraude fiscal (Art. 103.º RGIT). Participação obrigatória à AT.';
            classe = 'verdict-high';
        }
        
        // Atualizar veredicto
        const verdictDisplay = document.getElementById('verdictDisplay');
        verdictDisplay.style.display = 'block';
        verdictDisplay.className = `verdict-display active ${classe}`;
        
        setElementText('verdictLevel', nivel);
        document.getElementById('verdictLevel').style.color = cor;
        setElementText('verdictPercentValue', `Desvio: ${percentagem.toFixed(2)}%`);
        setElementText('verdictDesc', descricao);
        
        // Mostrar alerta se necessário
        if (percentagem > 5) {
            document.getElementById('bigDataAlert').style.display = 'flex';
            setElementText('alertDeltaValue', formatCurrency(discrepancia));
        }
        
        // Atualizar dashboard
        setElementText('statNet', formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos));
        setElementText('statComm', formatCurrency(VDCSystem.analysis.extrato.comissoes));
        setElementText('statJuros', formatCurrency(discrepancia));
        document.getElementById('jurosCard').style.display = 'block';
        
        // Atualizar KPIs
        setElementText('kpiGrossValue', formatCurrency(extratoTotal));
        setElementText('kpiCommValue', formatCurrency(VDCSystem.analysis.extrato.comissoes));
        setElementText('kpiNetValue', formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos));
        setElementText('kpiInvValue', formatCurrency(faturaTotal));
        
        // Mostrar quantum se fraude
        if (percentagem > 15) {
            document.getElementById('quantumBox').style.display = 'block';
            setElementText('quantumValue', formatCurrency(discrepancia * 12 * 7)); // Estimativa
        }
        
        // Renderizar gráfico
        renderChart(extratoTotal, VDCSystem.analysis.extrato.comissoes, 
                   VDCSystem.analysis.extrato.ganhosLiquidos, faturaTotal, discrepancia);
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search-dollar"></i> EXECUTAR PERÍCIA FORENSE';
        
        logAudit(`⚖️ Perícia concluída: ${nivel} (${percentagem.toFixed(2)}%)`, 'success', false);
        showToast('Análise forense concluída', 'success');
        
    }, 1000);
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
            labels: ['Bruto App', 'Comissões', 'Líquido', 'Faturado', 'Discrepância'],
            datasets: [{
                label: 'Valor (€)',
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
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
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
    
    logAudit('📄 JSON exportado', 'success', false);
    showToast('JSON probatório exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Sem cliente registado', 'error');
        return;
    }
    
    if (typeof window.jspdf === 'undefined') {
        showToast('Biblioteca jsPDF não carregada', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFillColor(5, 10, 20);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(0, 245, 255);
    doc.setFontSize(20);
    doc.text('VDC FORENSE', 105, 15, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('PARECER PERICIAL DIGITAL', 105, 25, { align: 'center' });
    
    let y = 45;
    
    // Dados do cliente
    doc.setTextColor(0, 245, 255);
    doc.setFontSize(11);
    doc.text('DADOS DO SUJEITO PASSIVO', 14, y); y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Nome: ${VDCSystem.client.name}`, 14, y); y += 6;
    doc.text(`NIF: ${VDCSystem.client.nif}`, 14, y); y += 6;
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 14, y); y += 12;
    
    // Resultados
    doc.setTextColor(0, 245, 255);
    doc.text('RESULTADOS DA EXTRAÇÃO', 14, y); y += 8;
    
    doc.setTextColor(0, 0, 0);
    doc.text(`Ganhos na App: ${formatCurrency(VDCSystem.analysis.extrato.ganhosApp)}`, 14, y); y += 6;
    doc.text(`Ganhos da Campanha: ${formatCurrency(VDCSystem.analysis.extrato.ganhosCampanha)}`, 14, y); y += 6;
    doc.text(`Gorjetas: ${formatCurrency(VDCSystem.analysis.extrato.gorjetas)}`, 14, y); y += 6;
    doc.text(`Comissões: ${formatCurrency(VDCSystem.analysis.extrato.comissoes)}`, 14, y); y += 6;
    doc.text(`Ganhos Líquidos: ${formatCurrency(VDCSystem.analysis.extrato.ganhosLiquidos)}`, 14, y); y += 10;
    
    doc.text(`Fatura N.º: ${VDCSystem.analysis.fatura.numero}`, 14, y); y += 6;
    doc.text(`Total c/ IVA: ${formatCurrency(VDCSystem.analysis.fatura.totalIVA)}`, 14, y); y += 10;
    
    doc.text(`DAC7 Total Anual: ${formatCurrency(VDCSystem.analysis.dac7.totalAnual)}`, 14, y); y += 12;
    
    // Rodapé
    doc.setFillColor(5, 10, 20);
    doc.rect(0, 280, 210, 17, 'F');
    
    doc.setTextColor(160, 184, 208);
    doc.setFontSize(8);
    doc.text(`HASH: ${VDCSystem.masterHash || 'N/A'}`, 105, 287, { align: 'center' });
    doc.text(`Gerado: ${new Date().toLocaleString('pt-PT')}`, 105, 292, { align: 'center' });
    
    doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
    
    logAudit('📑 PDF exportado', 'success', false);
    showToast('PDF gerado com sucesso', 'success');
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
    const hasData = extractionStats.valuesFound > 0;
    const hasClient = VDCSystem.client !== null;
    
    btn.disabled = !hasData || !hasClient;
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

function logAudit(message, type = 'info', showInConsole = true) {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const entry = { timestamp, message, type };
    VDCSystem.logs.push(entry);
    
    if (showInConsole) {
        const consoleOutput = document.getElementById('consoleOutput');
        if (consoleOutput) {
            const logEl = document.createElement('div');
            logEl.className = `log-entry log-${type}`;
            logEl.textContent = `[${timestamp}] ${message}`;
            consoleOutput.appendChild(logEl);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
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
    logAudit('🧹 Console limpo', 'info', false);
}

function resetSystem() {
    if (!confirm('Reiniciar sistema? Todos os dados serão perdidos.')) return;
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
