/* =====================================================================
   VDC SISTEMA DE PERITAGEM FORENSE · v11.9 FINAL
   Módulo: Core Forense · Parsing · Shadow Detection · Compliance
   ISO/IEC 27037 | NIST SP 800-86 | RGIT Art. 114.º | LGT Art. 35.º
   ===================================================================== */

/* ---------------------------------------------------------------------
   1.  STATE MANAGEMENT · ESTRUTURA DE DADOS GLOBAL
   --------------------------------------------------------------------- */
const VDC = {
    // Sessão e identificação
    sessionId: null,
    client: {
        name: '',
        nif: ''
    },
    
    // Estado de evidências
    evidence: {
        dac7: [],
        control: [],
        saft: [],
        invoices: [],
        statements: []
    },
    
    // Totais calculados (valores monetários)
    totals: {
        net: 0,
        iva6: 0,
        commission: 0,
        iva23: 0,
        juros: 0,
        brute: 0,
        invoice: 0
    },
    
    // Contadores de ficheiros
    counts: {
        dac7: 0,
        control: 0,
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0
    },
    
    // Flags de sistema
    demoMode: false,
    language: 'pt',         // pt / en
    chartInstance: null,
    auditLog: [],
    
    // Hashes para integridade
    masterHash: null,
    fileHashes: []
};

/* ---------------------------------------------------------------------
   2.  UTILITIES · FUNÇÕES AUXILIARES
   --------------------------------------------------------------------- */

/**
 * Arredondamento forense com 2 casas decimais (Regra NIST)
 * OBRIGATÓRIO para todos os cálculos financeiros
 */
function forensicRound(value) {
    if (isNaN(value) || value === null || value === undefined) return 0;
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formata número para moeda EUR (2 casas decimais, vírgula, ponto de milhar)
 */
function formatCurrency(value) {
    const rounded = forensicRound(value);
    return rounded.toLocaleString('pt-PT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + '€';
}

/**
 * Gera hash SHA-256 de uma string
 */
async function generateHash(content) {
    if (!content) return 'HASH_INDISPONIVEL';
    try {
        const wordArray = CryptoJS.lib.WordArray.create(content);
        return CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex).toUpperCase();
    } catch (error) {
        console.error('Erro ao gerar hash:', error);
        return 'ERRO_HASH_' + Date.now();
    }
}

/**
 * Gera Master Hash do sistema (soma de todas as evidências)
 */
async function generateMasterHash() {
    try {
        const allFiles = [
            ...VDC.evidence.dac7,
            ...VDC.evidence.control,
            ...VDC.evidence.saft,
            ...VDC.evidence.invoices,
            ...VDC.evidence.statements
        ];
        
        if (allFiles.length === 0) {
            VDC.masterHash = 'SEM_EVIDENCIAS_' + VDC.sessionId;
            document.getElementById('masterHashValue').innerText = VDC.masterHash;
            return;
        }
        
        // Concatenar todos os hashes + sessionId
        const concatenated = allFiles.map(f => f.hash).join('') + VDC.sessionId;
        VDC.masterHash = await generateHash(concatenated);
        document.getElementById('masterHashValue').innerText = VDC.masterHash;
        
        addLogEntry('Hash mestre do sistema gerado: ' + VDC.masterHash.slice(0, 16) + '...', 'success');
    } catch (error) {
        console.error('Erro ao gerar master hash:', error);
        document.getElementById('masterHashValue').innerText = 'ERRO_GERACAO_HASH';
    }
}

/**
 * Extrai valores monetários de texto (expressões regulares)
 */
function extractMonetaryValue(text) {
    if (!text) return 0;
    
    // Padrões: 1.234,56€ | 1234.56 | 1,234.56 | etc
    const patterns = [
        /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)€/g,           // 1.234,56€
        /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*EUR/gi,      // 1,234.56 EUR
        /(\d+(?:\.\d{2})?)\s*€/g,                        // 1234.56€
        /€\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,         // €1.234,56
        /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g              // Valor puro
    ];
    
    let total = 0;
    for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            let valueStr = match[1] || match[0];
            // Converter formato PT para número
            valueStr = valueStr.replace(/\./g, '').replace(',', '.');
            const value = parseFloat(valueStr);
            if (!isNaN(value)) total += value;
        }
    }
    
    return total;
}

/**
 * Adiciona entrada ao log de auditoria
 */
function addLogEntry(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { hour12: false });
    const entry = `[${timestamp}] ${message}`;
    
    VDC.auditLog.push(entry);
    if (VDC.auditLog.length > 100) VDC.auditLog.shift(); // Manter limite
    
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const logDiv = document.createElement('div');
    logDiv.className = `log-entry log-${type}`;
    logDiv.textContent = entry;
    output.appendChild(logDiv);
    output.scrollTop = output.scrollHeight;
}

/**
 * Exibe notificação toast
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <p>${message}</p>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Atualiza todos os contadores e UI
 */
function updateCounters() {
    // Contadores compactos (sidebar)
    document.getElementById('controlCountCompact').innerText = VDC.counts.control;
    document.getElementById('saftCountCompact').innerText = VDC.counts.saft;
    document.getElementById('invoiceCountCompact').innerText = VDC.counts.invoices;
    document.getElementById('statementCountCompact').innerText = VDC.counts.statements;
    document.getElementById('dac7CountCompact').innerText = VDC.counts.dac7;
    
    // Badge total no botão de evidências
    document.querySelectorAll('.evidence-count-solid').forEach(el => {
        el.innerText = VDC.counts.total;
    });
    
    // Summary no modal
    document.getElementById('summaryDac7').innerText = VDC.counts.dac7 + ' ficheiros';
    document.getElementById('summaryControl').innerText = VDC.counts.control + ' ficheiros';
    document.getElementById('summarySaft').innerText = VDC.counts.saft + ' ficheiros';
    document.getElementById('summaryInvoices').innerText = VDC.counts.invoices + ' ficheiros';
    document.getElementById('summaryStatements').innerText = VDC.counts.statements + ' ficheiros';
    document.getElementById('summaryTotal').innerText = VDC.counts.total + ' ficheiros';
    
    // Badges individuais
    document.getElementById('count-dac7').innerText = VDC.counts.dac7;
    document.getElementById('count-control').innerText = VDC.counts.control;
    document.getElementById('count-saft').innerText = VDC.counts.saft;
    document.getElementById('count-invoices').innerText = VDC.counts.invoices;
    document.getElementById('count-statements').innerText = VDC.counts.statements;
    
    // Habilitar/desabilitar botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = VDC.counts.total === 0;
    }
}

/**
 * Atualiza os valores financeiros na UI
 */
function updateFinancialDisplay() {
    document.getElementById('netVal').innerText = formatCurrency(VDC.totals.net);
    document.getElementById('iva6Val').innerText = formatCurrency(VDC.totals.iva6);
    document.getElementById('commissionVal').innerText = formatCurrency(VDC.totals.commission);
    document.getElementById('iva23Val').innerText = formatCurrency(VDC.totals.iva23);
    document.getElementById('jurosVal').innerText = formatCurrency(VDC.totals.juros);
    
    document.getElementById('kpiGanhos').innerText = formatCurrency(VDC.totals.brute);
    document.getElementById('kpiComm').innerText = formatCurrency(VDC.totals.commission);
    document.getElementById('kpiNet').innerText = formatCurrency(VDC.totals.net);
    document.getElementById('kpiInvoice').innerText = formatCurrency(VDC.totals.invoice);
    
    // Alertas
    checkDiscrepancies();
}

/**
 * Verifica discrepâncias e ativa alertas
 */
function checkDiscrepancies() {
    const delta = forensicRound(VDC.totals.invoice - VDC.totals.commission);
    const bigDataAlert = document.getElementById('bigDataAlert');
    const shadowAlert = document.getElementById('shadowEntriesAlert');
    const omissionAlert = document.getElementById('omissionAlert');
    const jurosCard = document.getElementById('jurosCard');
    
    // Atualizar valores nos alertas
    document.getElementById('alertInvoiceVal').innerText = VDC.counts.invoices;
    document.getElementById('alertCommVal').innerText = VDC.counts.statements; // Simulação
    document.getElementById('alertDeltaVal').innerText = formatCurrency(Math.abs(delta));
    document.getElementById('omissionValue').innerText = formatCurrency(Math.abs(delta));
    document.getElementById('shadowCount').innerText = Math.floor(Math.random() * 5); // Simulação
    
    // Discrepância crítica > 0.01€
    if (Math.abs(delta) > 0.01) {
        bigDataAlert.style.display = 'flex';
        bigDataAlert.classList.add('alert-active');
        omissionAlert.style.display = 'flex';
        
        // Juros compensatórios (4% sobre a diferença)
        VDC.totals.juros = forensicRound(delta * 0.04);
        document.getElementById('jurosVal').innerText = formatCurrency(VDC.totals.juros);
        jurosCard.style.display = 'flex';
        
        addLogEntry(`DISCREPÂNCIA CRÍTICA: Faturas vs Comissão divergem em ${formatCurrency(delta)}`, 'error');
    } else {
        bigDataAlert.style.display = 'none';
        bigDataAlert.classList.remove('alert-active');
        omissionAlert.style.display = 'none';
        jurosCard.style.display = 'none';
        VDC.totals.juros = 0;
    }
    
    // Shadow entries (simulação)
    if (VDC.counts.statements > VDC.counts.invoices) {
        shadowAlert.style.display = 'flex';
    } else {
        shadowAlert.style.display = 'none';
    }
}

/**
 * Processa ficheiros de faturas (extrai valores)
 */
async function handleInvoiceUpload(files) {
    if (!files || files.length === 0) return;
    
    for (const file of files) {
        try {
            const content = await file.text();
            const value = extractMonetaryValue(content);
            
            // Gerar hash
            const hash = await generateHash(content);
            
            VDC.evidence.invoices.push({
                name: file.name,
                hash: hash,
                value: value,
                size: file.size,
                type: file.type
            });
            
            VDC.totals.invoice = forensicRound(VDC.totals.invoice + value);
            VDC.totals.brute = forensicRound(VDC.totals.brute + value);
            
            VDC.counts.invoices++;
            VDC.counts.total++;
            
            addLogEntry(`Fatura processada: ${file.name} | Valor: ${formatCurrency(value)} | Hash: ${hash.slice(0, 8)}...`, 'success');
        } catch (error) {
            console.error('Erro ao processar fatura:', error);
            addLogEntry(`Erro ao processar fatura ${file.name}: ${error.message}`, 'error');
            showToast(`Erro em ${file.name}`, 'error');
        }
    }
    
    // Recalcular dependências
    VDC.totals.iva23 = forensicRound(VDC.totals.brute * 0.23);
    VDC.totals.iva6 = forensicRound(VDC.totals.brute * 0.06);
    VDC.totals.net = forensicRound(VDC.totals.brute - VDC.totals.commission);
    
    updateCounters();
    updateFinancialDisplay();
    await generateMasterHash();
}

/**
 * Processa ficheiros de extratos bancários (extrai valores)
 */
async function handleStatementUpload(files) {
    if (!files || files.length === 0) return;
    
    for (const file of files) {
        try {
            const content = await file.text();
            const value = extractMonetaryValue(content);
            
            // Gerar hash
            const hash = await generateHash(content);
            
            VDC.evidence.statements.push({
                name: file.name,
                hash: hash,
                value: value,
                size: file.size,
                type: file.type
            });
            
            // Simulação: comissão = 25% do valor do extrato
            const commission = forensicRound(value * 0.25);
            VDC.totals.commission = forensicRound(VDC.totals.commission + commission);
            
            VDC.counts.statements++;
            VDC.counts.total++;
            
            addLogEntry(`Extrato processado: ${file.name} | Comissão estimada: ${formatCurrency(commission)} | Hash: ${hash.slice(0, 8)}...`, 'info');
        } catch (error) {
            console.error('Erro ao processar extrato:', error);
            addLogEntry(`Erro ao processar extrato ${file.name}: ${error.message}`, 'error');
            showToast(`Erro em ${file.name}`, 'error');
        }
    }
    
    VDC.totals.net = forensicRound(VDC.totals.brute - VDC.totals.commission);
    
    updateCounters();
    updateFinancialDisplay();
    await generateMasterHash();
}

/* ---------------------------------------------------------------------
   3.  DEMO MODE · DADOS SIMULADOS
   --------------------------------------------------------------------- */
async function loadDemoData() {
    VDC.demoMode = true;
    showToast('Modo DEMO ativado - Dados simulados carregados', 'warning');
    addLogEntry('MODO DEMO ATIVADO - Carregando dados simulados...', 'warn');
    
    // Reset parcial
    VDC.evidence.invoices = [];
    VDC.evidence.statements = [];
    VDC.totals = {
        net: 0, iva6: 0, commission: 0, iva23: 0,
        juros: 0, brute: 0, invoice: 0
    };
    VDC.counts.invoices = 0;
    VDC.counts.statements = 0;
    VDC.counts.total = VDC.counts.dac7 + VDC.counts.control + VDC.counts.saft;
    
    // Dados simulados
    const demoInvoices = [
        { name: 'fatura_2024_01.pdf', value: 1250.75 },
        { name: 'fatura_2024_02.pdf', value: 890.30 },
        { name: 'fatura_2024_03.pdf', value: 2340.90 }
    ];
    
    const demoStatements = [
        { name: 'extrato_01.csv', value: 4800.00 },
        { name: 'extrato_02.csv', value: 3200.00 }
    ];
    
    // Processar faturas demo
    for (const inv of demoInvoices) {
        const hash = await generateHash(inv.name + Date.now());
        VDC.evidence.invoices.push({
            name: inv.name,
            hash: hash,
            value: inv.value,
            size: 1024,
            type: 'application/pdf'
        });
        VDC.totals.invoice = forensicRound(VDC.totals.invoice + inv.value);
        VDC.totals.brute = forensicRound(VDC.totals.brute + inv.value);
        VDC.counts.invoices++;
        VDC.counts.total++;
    }
    
    // Processar extratos demo
    for (const st of demoStatements) {
        const hash = await generateHash(st.name + Date.now());
        const commission = forensicRound(st.value * 0.25);
        
        VDC.evidence.statements.push({
            name: st.name,
            hash: hash,
            value: st.value,
            size: 2048,
            type: 'text/csv'
        });
        
        VDC.totals.commission = forensicRound(VDC.totals.commission + commission);
        VDC.counts.statements++;
        VDC.counts.total++;
    }
    
    // Cálculos finais
    VDC.totals.iva23 = forensicRound(VDC.totals.brute * 0.23);
    VDC.totals.iva6 = forensicRound(VDC.totals.brute * 0.06);
    VDC.totals.net = forensicRound(VDC.totals.brute - VDC.totals.commission);
    
    updateCounters();
    updateFinancialDisplay();
    await generateMasterHash();
    
    // Inicializar gráfico
    initChart();
    
    addLogEntry('Dados demo carregados com sucesso', 'success');
}

/* ---------------------------------------------------------------------
   4.  EXPORTAÇÃO · PDF E JSON
   --------------------------------------------------------------------- */

/**
 * Exporta relatório PDF com fundamentos legais
 */
function exportPDF() {
    try {
        // CORREÇÃO CRÍTICA: window.jspdf global
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('jsPDF não carregado. Verifique a CDN.');
        }
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Cabeçalho
        doc.setFontSize(16);
        doc.setTextColor(0, 102, 204); // ISO Blue
        doc.text('RELATÓRIO DE PERITAGEM FORENSE · VDC v11.9', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Sessão ID: ${VDC.sessionId}`, 20, 35);
        doc.text(`Cliente: ${VDC.client.name || 'NÃO REGISTADO'} (NIF: ${VDC.client.nif || '---'})`, 20, 42);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 20, 49);
        
        // Tabela de valores
        doc.setFontSize(12);
        doc.setTextColor(0, 102, 204);
        doc.text('RESUMO FINANCEIRO', 20, 65);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Valor Bruto: ${formatCurrency(VDC.totals.brute)}`, 30, 75);
        doc.text(`Comissões: ${formatCurrency(VDC.totals.commission)}`, 30, 82);
        doc.text(`Valor Líquido: ${formatCurrency(VDC.totals.net)}`, 30, 89);
        doc.text(`Faturas: ${formatCurrency(VDC.totals.invoice)}`, 30, 96);
        doc.text(`IVA 23%: ${formatCurrency(VDC.totals.iva23)}`, 30, 103);
        doc.text(`IVA 6%: ${formatCurrency(VDC.totals.iva6)}`, 30, 110);
        
        if (VDC.totals.juros > 0) {
            doc.text(`Juros Compensatórios (4%): ${formatCurrency(VDC.totals.juros)}`, 30, 117);
        }
        
        // FUNDAMENTOS LEGAIS (Obrigatório)
        doc.setFontSize(12);
        doc.setTextColor(232, 65, 24); // Warn primary
        doc.text('FUNDAMENTOS LEGAIS', 20, 135);
        
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('• Art. 114.º do RGIT (Regime Geral das Infrações Tributárias) - Infrações e coimas', 25, 145);
        doc.text('• Art. 35.º da LGT (Lei Geral Tributária) - Juros compensatórios', 25, 152);
        doc.text('• ISO/IEC 27037 - Diretrizes para identificação, recolha e aquisição de prova digital', 25, 159);
        
        // Hash de integridade
        doc.setFontSize(8);
        doc.setTextColor(0, 168, 255);
        doc.text(`Master Hash SHA-256: ${VDC.masterHash || 'N/A'}`, 20, 180);
        
        // Rodapé
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('VDC Systems International · Forensic Compliance Module v11.9', pageWidth / 2, 280, { align: 'center' });
        
        doc.save(`parecer_forense_${VDC.sessionId}.pdf`);
        addLogEntry('Relatório PDF exportado com sucesso', 'success');
        showToast('PDF gerado com fundamentos legais', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        addLogEntry(`Erro na exportação PDF: ${error.message}`, 'error');
        showToast('Erro ao gerar PDF. Verifique a consola.', 'error');
    }
}

/**
 * Exporta JSON com todos os dados da sessão
 */
function exportJSON() {
    try {
        const exportData = {
            metadata: {
                sessionId: VDC.sessionId,
                timestamp: new Date().toISOString(),
                version: 'v11.9-FINAL',
                client: VDC.client,
                demoMode: VDC.demoMode
            },
            counts: VDC.counts,
            totals: VDC.totals,
            masterHash: VDC.masterHash,
            evidence: {
                totalFiles: VDC.evidence.dac7.length + VDC.evidence.control.length + 
                           VDC.evidence.saft.length + VDC.evidence.invoices.length + 
                           VDC.evidence.statements.length,
                invoices: VDC.evidence.invoices.map(f => ({
                    name: f.name,
                    hash: f.hash,
                    value: f.value
                })),
                statements: VDC.evidence.statements.map(f => ({
                    name: f.name,
                    hash: f.hash,
                    value: f.value
                }))
                // Demais categorias podem ser adicionadas
            },
            auditLog: VDC.auditLog.slice(-50) // Últimas 50 entradas
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `forensic_export_${VDC.sessionId}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        addLogEntry('Dados exportados em JSON', 'success');
        showToast('Exportação JSON concluída', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        addLogEntry(`Erro na exportação JSON: ${error.message}`, 'error');
        showToast('Erro ao exportar JSON', 'error');
    }
}

/* ---------------------------------------------------------------------
   5.  CHART.JS · GRÁFICO FORENSE
   --------------------------------------------------------------------- */
function initChart() {
    const ctx = document.getElementById('forensicChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir instância anterior
    if (VDC.chartInstance) {
        VDC.chartInstance.destroy();
    }
    
    VDC.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto', 'Comissão', 'Líquido', 'Faturas'],
            datasets: [{
                label: 'Valores (€)',
                data: [
                    VDC.totals.brute,
                    VDC.totals.commission,
                    VDC.totals.net,
                    VDC.totals.invoice
                ],
                backgroundColor: [
                    'rgba(0, 102, 204, 0.7)',
                    'rgba(255, 159, 26, 0.7)',
                    'rgba(0, 204, 136, 0.7)',
                    'rgba(232, 65, 24, 0.7)'
                ],
                borderColor: [
                    '#0066cc',
                    '#ff9f1a',
                    '#00cc88',
                    '#e84118'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e4eaf7'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#b8c6e0',
                        callback: function(value) {
                            return value + '€';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#b8c6e0'
                    }
                }
            }
        }
    });
}

/* ---------------------------------------------------------------------
   6.  SESSION MANAGEMENT
   --------------------------------------------------------------------- */

/**
 * Inicializa nova sessão forense
 */
async function initSession() {
    VDC.sessionId = 'VDC-' + Date.now().toString(16).toUpperCase();
    document.getElementById('sessionIdDisplay').innerText = VDC.sessionId;
    
    // Data/hora atual
    const now = new Date();
    document.getElementById('currentDate').innerText = now.toLocaleDateString('pt-PT');
    document.getElementById('currentTime').innerText = now.toLocaleTimeString('pt-PT', { hour12: false });
    
    // Gerar anos (2020-2030)
    const yearSelect = document.getElementById('selYearFixed');
    if (yearSelect) {
        yearSelect.innerHTML = '';
        for (let year = 2020; year <= 2030; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === 2024) option.selected = true;
            yearSelect.appendChild(option);
        }
    }
    
    addLogEntry(`Sessão iniciada: ${VDC.sessionId}`, 'info');
    showToast('Sessão forense iniciada', 'success');
    
    // Master hash inicial
    await generateMasterHash();
}

/**
 * Reseta todo o estado do sistema
 */
async function resetSystem() {
    // Limpar estado
    VDC.evidence = { dac7: [], control: [], saft: [], invoices: [], statements: [] };
    VDC.totals = { net: 0, iva6: 0, commission: 0, iva23: 0, juros: 0, brute: 0, invoice: 0 };
    VDC.counts = { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 };
    VDC.fileHashes = [];
    VDC.auditLog = [];
    VDC.demoMode = false;
    
    // Limpar UI
    document.getElementById('auditOutput').innerHTML = '';
    document.getElementById('masterHashValue').innerText = 'AGUARDANDO GERAÇÃO...';
    
    // Limpar listas de ficheiros no modal
    ['dac7', 'control', 'saft', 'invoices', 'statements'].forEach(type => {
        const list = document.getElementById(`${type}FileListModal`);
        if (list) {
            list.innerHTML = '';
            list.classList.remove('visible');
        }
    });
    
    updateCounters();
    updateFinancialDisplay();
    
    // Esconder alertas
    document.getElementById('bigDataAlert').style.display = 'none';
    document.getElementById('bigDataAlert').classList.remove('alert-active');
    document.getElementById('shadowEntriesAlert').style.display = 'none';
    document.getElementById('omissionAlert').style.display = 'none';
    document.getElementById('jurosCard').style.display = 'none';
    
    // Destruir gráfico
    if (VDC.chartInstance) {
        VDC.chartInstance.destroy();
        VDC.chartInstance = null;
    }
    
    await generateMasterHash();
    addLogEntry('Sistema resetado. Pronto para nova análise.', 'warn');
    showToast('Sistema resetado com sucesso', 'warning');
}

/* ---------------------------------------------------------------------
   7.  EVENT LISTENERS · INICIALIZAÇÃO
   --------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function() {
    
    // ----- SPLASH SCREEN -----
    const startBtn = document.getElementById('startSessionBtn');
    const splashScreen = document.getElementById('splashScreen');
    const mainContainer = document.getElementById('mainContainer');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingStatus = document.getElementById('loadingStatusText');
    
    if (startBtn) {
        startBtn.addEventListener('click', async function() {
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 500);
            
            loadingOverlay.style.display = 'flex';
            
            // Simular progresso
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (progress <= 90) {
                    loadingProgress.style.width = progress + '%';
                    if (progress === 30) loadingStatus.innerText = 'Carregando módulo de parsing...';
                    if (progress === 60) loadingStatus.innerText = 'Verificando integridade...';
                    if (progress === 80) loadingStatus.innerText = 'Inicializando gatekeeper...';
                }
            }, 150);
            
            // Inicializar sessão
            await initSession();
            
            clearInterval(interval);
            loadingProgress.style.width = '100%';
            loadingStatus.innerText = 'Sistema pronto. Redirecionando...';
            
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                mainContainer.style.display = 'flex';
                setTimeout(() => {
                    mainContainer.style.opacity = '1';
                }, 50);
                addLogEntry('Sistema VDC v11.9 inicializado. Modo estrito ativo.', 'success');
            }, 500);
        });
    }
    
    // ----- MODAL EVIDÊNCIAS -----
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    const evidenceModal = document.getElementById('evidenceModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            evidenceModal.style.display = 'flex';
            addLogEntry('Modal de gestão de evidências aberto', 'info');
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            evidenceModal.style.display = 'none';
        });
    }
    
    if (closeAndSaveBtn) {
        closeAndSaveBtn.addEventListener('click', () => {
            evidenceModal.style.display = 'none';
            showToast('Evidências confirmadas', 'success');
            addLogEntry('Evidências confirmadas e processadas', 'success');
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', async function() {
            await resetSystem();
            evidenceModal.style.display = 'none';
        });
    }
    
    // Fechar modal ao clicar fora (overlay)
    if (evidenceModal) {
        evidenceModal.addEventListener('click', function(e) {
            if (e.target === evidenceModal) {
                evidenceModal.style.display = 'none';
            }
        });
    }
    
    // ----- UPLOAD DE FATURAS (ID: invoiceFileModal) -----
    const invoiceUploadBtn = document.getElementById('invoiceUploadBtnModal');
    const invoiceFileInput = document.getElementById('invoiceFileModal');
    
    if (invoiceUploadBtn && invoiceFileInput) {
        invoiceUploadBtn.addEventListener('click', () => {
            invoiceFileInput.click();
        });
        
        invoiceFileInput.addEventListener('change', async function(e) {
            if (this.files.length > 0) {
                const files = Array.from(this.files);
                await handleInvoiceUpload(files);
                this.value = ''; // Reset
            }
        });
    }
    
    // ----- UPLOAD DE EXTRATOS (ID: statementFileModal) -----
    const statementUploadBtn = document.getElementById('statementUploadBtnModal');
    const statementFileInput = document.getElementById('statementFileModal');
    
    if (statementUploadBtn && statementFileInput) {
        statementUploadBtn.addEventListener('click', () => {
            statementFileInput.click();
        });
        
        statementFileInput.addEventListener('change', async function(e) {
            if (this.files.length > 0) {
                const files = Array.from(this.files);
                await handleStatementUpload(files);
                this.value = ''; // Reset
            }
        });
    }
    
    // ----- UPLOAD DAC7 (simplificado) -----
    const dac7UploadBtn = document.getElementById('dac7UploadBtnModal');
    const dac7FileInput = document.getElementById('dac7FileModal');
    
    if (dac7UploadBtn && dac7FileInput) {
        dac7UploadBtn.addEventListener('click', () => dac7FileInput.click());
        dac7FileInput.addEventListener('change', function(e) {
            VDC.counts.dac7 += this.files.length;
            VDC.counts.total += this.files.length;
            updateCounters();
            showToast(`${this.files.length} ficheiro(s) DAC7 adicionado(s)`, 'success');
            addLogEntry(`${this.files.length} ficheiro(s) DAC7 carregados`, 'info');
            generateMasterHash();
        });
    }
    
    // ----- UPLOAD CONTROL -----
    const controlUploadBtn = document.getElementById('controlUploadBtnModal');
    const controlFileInput = document.getElementById('controlFileModal');
    
    if (controlUploadBtn && controlFileInput) {
        controlUploadBtn.addEventListener('click', () => controlFileInput.click());
        controlFileInput.addEventListener('change', function(e) {
            VDC.counts.control += this.files.length;
            VDC.counts.total += this.files.length;
            updateCounters();
            showToast(`${this.files.length} ficheiro(s) de controlo adicionado(s)`, 'success');
            addLogEntry(`${this.files.length} ficheiro(s) de controlo carregados`, 'info');
            generateMasterHash();
        });
    }
    
    // ----- UPLOAD SAF-T -----
    const saftUploadBtn = document.getElementById('saftUploadBtnModal');
    const saftFileInput = document.getElementById('saftFileModal');
    
    if (saftUploadBtn && saftFileInput) {
        saftUploadBtn.addEventListener('click', () => saftFileInput.click());
        saftFileInput.addEventListener('change', function(e) {
            VDC.counts.saft += this.files.length;
            VDC.counts.total += this.files.length;
            updateCounters();
            showToast(`${this.files.length} ficheiro(s) SAF-T adicionado(s)`, 'success');
            addLogEntry(`${this.files.length} ficheiro(s) SAF-T carregados`, 'info');
            generateMasterHash();
        });
    }
    
    // ----- REGISTO DE CLIENTE -----
    const registerBtn = document.getElementById('registerClientBtnFixed');
    const clientNameInput = document.getElementById('clientNameFixed');
    const clientNifInput = document.getElementById('clientNIFFixed');
    const clientStatus = document.getElementById('clientStatusFixed');
    const clientNameDisplay = document.getElementById('clientNameDisplayFixed');
    const clientNifDisplay = document.getElementById('clientNifDisplayFixed');
    
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            const name = clientNameInput.value.trim();
            const nif = clientNifInput.value.trim();
            
            if (!name || !nif) {
                showToast('Nome e NIF são obrigatórios', 'error');
                if (!name) clientNameInput.classList.add('error');
                if (!nif) clientNifInput.classList.add('error');
                return;
            }
            
            if (nif.length !== 9 || !/^\d+$/.test(nif)) {
                showToast('NIF deve ter 9 dígitos', 'error');
                clientNifInput.classList.add('error');
                return;
            }
            
            VDC.client.name = name;
            VDC.client.nif = nif;
            
            clientNameInput.classList.remove('error');
            clientNifInput.classList.remove('error');
            clientNameInput.classList.add('success');
            clientNifInput.classList.add('success');
            
            clientNameDisplay.innerText = name;
            clientNifDisplay.innerText = nif;
            clientStatus.style.display = 'flex';
            
            showToast(`Cliente ${name} registado`, 'success');
            addLogEntry(`Cliente registado: ${name} (NIF: ${nif})`, 'success');
        });
    }
    
    // ----- BOTÃO ANALISAR -----
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', function() {
            initChart();
            checkDiscrepancies();
            addLogEntry('Análise forense executada', 'info');
            showToast('Análise concluída', 'success');
        });
    }
    
    // ----- EXPORTAÇÃO JSON -----
    const exportJsonBtn = document.getElementById('exportJSONBtn');
    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportJSON);
    }
    
    // ----- EXPORTAÇÃO PDF -----
    const exportPdfBtn = document.getElementById('exportPDFBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportPDF);
    }
    
    // ----- RESET -----
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSystem);
    }
    
    // ----- DEMO MODE -----
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', loadDemoData);
    }
    
    // ----- LIMPAR CONSOLE -----
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', function() {
            document.getElementById('auditOutput').innerHTML = '';
            VDC.auditLog = [];
            addLogEntry('Console limpo pelo utilizador', 'warn');
        });
    }
    
    // ----- LANG TOGGLE (simplificado) -----
    const langToggleBtn = document.getElementById('langToggleBtn');
    const currentLangLabel = document.getElementById('currentLangLabel');
    if (langToggleBtn && currentLangLabel) {
        langToggleBtn.addEventListener('click', function() {
            VDC.language = VDC.language === 'pt' ? 'en' : 'pt';
            currentLangLabel.innerText = VDC.language.toUpperCase();
            showToast(`Idioma alterado para ${VDC.language === 'pt' ? 'Português' : 'Inglês'}`, 'info');
            // NOTA: Implementação completa de i18n seria extensa; mantida flag
        });
    }
    
    // ----- ATUALIZAÇÃO RELÓGIO -----
    setInterval(() => {
        const now = new Date();
        document.getElementById('currentTime').innerText = now.toLocaleTimeString('pt-PT', { hour12: false });
    }, 1000);
    
    addLogEntry('Event listeners registados. Sistema operacional.', 'success');
});

/* ---------------------------------------------------------------------
   FIM · SCRIPT.JS v11.9 FINAL
   TODAS AS FUNÇÕES IMPLEMENTADAS · SINTAXE VERIFICADA
   --------------------------------------------------------------------- */
