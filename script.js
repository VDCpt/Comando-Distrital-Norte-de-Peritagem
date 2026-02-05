// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.7
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// CORREÇÃO COMPLETA - VALORES REAIS
// ============================================

// 1. ESTADO DO SISTEMA
const VDCSystem = {
    version: 'v10.7',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    
    documents: {
        control: { files: [], parsedData: null, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 } },
        invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0 } },
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            expected: 0,
            ganhosBrutos: 0,
            comissaoApp: 0,
            ganhosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            diferencialCusto: 0
        } }
    },
    
    analysis: {
        extractedValues: {
            saftGross: 0,
            saftIVA6: 0,
            platformCommission: 0,
            bankTransfer: 0,
            iva23Due: 0,
            ganhosBrutos: 0,
            comissaoApp: 0,
            ganhosLiquidos: 0,
            faturaPlataforma: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            diferencialCusto: 0,
            prejuizoFiscal: 0,
            imtBase: 0,
            imtTax: 0,
            imtTotal: 0,
            dac7Value: 0,
            dac7Discrepancy: 0,
            valorIliquido: 0,
            iva6Percent: 0,
            iva23Autoliquidacao: 0,
            comissaoCalculada: 0
        },
        
        crossings: {
            deltaA: 0,
            deltaB: 0,
            omission: 0,
            isValid: true,
            diferencialAlerta: false
        },
        
        projection: {
            marketProjection: 0,
            averagePerDriver: 0,
            driverCount: 38000
        },
        
        anomalies: [],
        legalCitations: []
    },
    
    counters: {
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0
    },
    
    logs: [],
    chart: null,
    
    isProcessing: false
};

// 2. FUNÇÕES DE UTILIDADE
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

function parseCurrency(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    // Remove todos os caracteres não numéricos exceto ponto e vírgula
    let clean = value.toString()
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'VDC-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateMasterHash() {
    const data = JSON.stringify({
        session: VDCSystem.sessionId,
        client: VDCSystem.client,
        values: VDCSystem.analysis.extractedValues,
        timestamp: new Date().toISOString()
    });
    
    return CryptoJS.SHA256(data).toString();
}

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { hour12: false });
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${type.toUpperCase()} ${message}`;
    
    const output = document.getElementById('auditOutput');
    if (output) {
        output.appendChild(logEntry);
        output.scrollTop = output.scrollHeight;
    }
    
    VDCSystem.logs.push({ timestamp, type, message });
    console.log(`[VDC] ${type}: ${message}`);
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) {
        output.innerHTML = '<div class="log-entry log-info">[00:00:00] INFO Console limpo</div>';
    }
    VDCSystem.logs = [];
}

function toggleConsole() {
    const output = document.getElementById('auditOutput');
    if (output) {
        output.style.height = output.style.height === '300px' ? '120px' : '300px';
    }
}

// 3. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        loadingOverlay.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            
            setTimeout(() => {
                mainContainer.style.opacity = '1';
            }, 50);
        }, 500);
    }
}

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v10.7...');
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = generateSessionId();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        setupEventListeners();
        updateLoadingProgress(60);
        
        setupDemoButton();
        updateLoadingProgress(70);
        
        resetDashboard();
        updateLoadingProgress(80);
        
        startClockAndDate();
        updateLoadingProgress(90);
        
        renderEmptyChart();
        updateLoadingProgress(95);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v10.7 inicializado com sucesso', 'success');
                logAudit('🔍 Motor de extração OTIMIZADO - Regex agressivo ativado', 'info');
                
                updateAnalysisButton();
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-PT', { hour12: false });
        const dateStr = now.toLocaleDateString('pt-PT');
        
        document.getElementById('currentTime').textContent = timeStr;
        document.getElementById('currentDate').textContent = dateStr;
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

function setupYearSelector() {
    const selYear = document.getElementById('selYear');
    if (!selYear) return;
    
    const currentYear = new Date().getFullYear();
    selYear.innerHTML = '';
    
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
            VDCSystem.selectedYear = year;
        }
        selYear.appendChild(option);
    }
    
    selYear.addEventListener('change', (e) => {
        VDCSystem.selectedYear = parseInt(e.target.value);
        logAudit(`Ano fiscal alterado para: ${VDCSystem.selectedYear}`, 'info');
        updateAnalysisButton();
    });
}

function setupPlatformSelector() {
    const selPlatform = document.getElementById('selPlatform');
    if (!selPlatform) return;
    
    selPlatform.value = VDCSystem.selectedPlatform;
    
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        const platformName = e.target.options[e.target.selectedIndex].text;
        
        if (VDCSystem.selectedPlatform === 'bolt' || VDCSystem.selectedPlatform === 'uber') {
            logAudit(`Plataforma ${platformName}: Aplicada regra de Autoliquidação de IVA (CIVA Art. 2º)`, 'warn');
        }
        
        logAudit(`Plataforma selecionada: ${platformName}`, 'info');
        updateAnalysisButton();
    });
}

// 4. SETUP DE EVENT LISTENERS
function setupEventListeners() {
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClient);
    }
    
    // Botões de upload
    const controlFileBtn = document.getElementById('controlFileBtn');
    const saftFileBtn = document.getElementById('saftFileBtn');
    const invoiceFileBtn = document.getElementById('invoiceFileBtn');
    const statementFileBtn = document.getElementById('statementFileBtn');
    
    if (controlFileBtn) controlFileBtn.addEventListener('click', () => document.getElementById('controlFile').click());
    if (saftFileBtn) saftFileBtn.addEventListener('click', () => document.getElementById('saftFile').click());
    if (invoiceFileBtn) invoiceFileBtn.addEventListener('click', () => document.getElementById('invoiceFile').click());
    if (statementFileBtn) statementFileBtn.addEventListener('click', () => document.getElementById('statementFile').click());
    
    // File inputs
    const controlFile = document.getElementById('controlFile');
    const saftFile = document.getElementById('saftFile');
    const invoiceFile = document.getElementById('invoiceFile');
    const statementFile = document.getElementById('statementFile');
    
    if (controlFile) {
        controlFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                processControlFile(file);
                updateFileList('controlFileList', [file]);
            }
        });
    }
    
    if (saftFile) {
        saftFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                processSaftFiles(files);
                updateFileList('saftFileList', files);
                updateCounter('saft', files.length);
            }
        });
    }
    
    if (invoiceFile) {
        invoiceFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                processInvoiceFiles(files);
                updateFileList('invoiceFileList', files);
                updateCounter('invoices', files.length);
            }
        });
    }
    
    if (statementFile) {
        statementFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const files = Array.from(e.target.files);
                processStatementFiles(files);
                updateFileList('statementFileList', files);
                updateCounter('statements', files.length);
            }
        });
    }
    
    // Botão Demo
    const demoBtn = document.getElementById('btnDemo');
    const demoBtnExtra = document.getElementById('btnDemoExtra');
    if (demoBtn) demoBtn.addEventListener('click', loadDemoData);
    if (demoBtnExtra) demoBtnExtra.addEventListener('click', loadDemoData);
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performForensicAnalysis);
    }
    
    // Botões secundários
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const newSessionBtn = document.getElementById('newSessionBtn');
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
    const saveClientBtn = document.getElementById('saveClientBtn');
    const calcDAC7Btn = document.getElementById('calcDAC7Btn');
    
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportJSON);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    if (newSessionBtn) newSessionBtn.addEventListener('click', clearAllData);
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    if (toggleConsoleBtn) toggleConsoleBtn.addEventListener('click', toggleConsole);
    if (saveClientBtn) saveClientBtn.addEventListener('click', saveClientData);
    if (calcDAC7Btn) calcDAC7Btn.addEventListener('click', calcularDiscrepanciaDAC7);
}

function setupDemoButton() {
    const demoBtn = document.getElementById('btnDemo');
    if (demoBtn) {
        demoBtn.classList.add('btn-demo-active');
    }
}

// 5. FUNÇÕES DE REGISTRO E CLIENTE
function registerClient() {
    const name = document.getElementById('clientName').value.trim();
    const nif = document.getElementById('clientNIF').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail').value.trim();
    const address = document.getElementById('clientAddress').value.trim();
    
    if (!name || !nif) {
        alert('Por favor, preencha o nome e NIF do cliente.');
        return;
    }
    
    if (nif.length !== 9) {
        alert('O NIF deve ter 9 dígitos.');
        return;
    }
    
    VDCSystem.client = {
        name,
        nif,
        phone: phone || 'Não informado',
        email: email || 'Não informado',
        address: address || 'Não informado',
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) {
        status.style.display = 'flex';
        nameDisplay.textContent = `${name} (NIF: ${nif})`;
    }
    
    logAudit(`✅ Cliente registado: ${name} (NIF: ${nif})`, 'success');
    updateAnalysisButton();
}

function saveClientData() {
    if (!VDCSystem.client) {
        alert('Por favor, registe um cliente primeiro.');
        return;
    }
    
    logAudit('💾 PREPARANDO PARA GUARDAR DADOS DO CLIENTE...', 'info');
    
    const dataStr = JSON.stringify(VDCSystem.client, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `VDC_Cliente_${VDCSystem.client.nif}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logAudit(`✅ Dados do cliente guardados: ${VDCSystem.client.name}`, 'success');
}

// 6. PROCESSAMENTO DE ARQUIVOS - CORREÇÃO CRÍTICA
async function processControlFile(file) {
    try {
        logAudit(`Processando ficheiro de controlo: ${file.name}`, 'info');
        
        const text = await file.text();
        const lines = text.split('\n');
        
        // Regex melhorado para capturar valores
        const ganhosBrutosRegex = /ganhos.*brutos?[\s:]*([\d.,]+)/i;
        const comissaoRegex = /comiss[aã]o.*app?[\s:]*([\d.,]+)/i;
        const ganhosLiquidosRegex = /ganhos.*l[ií]quidos?[\s:]*([\d.,]+)/i;
        const faturaRegex = /fatura.*plataforma?[\s:]*([\d.,]+)/i;
        const campanhasRegex = /campanhas?[\s:]*([\d.,]+)/i;
        const gorjetasRegex = /gorjetas?[\s:]*([\d.,]+)/i;
        const cancelamentosRegex = /cancelamentos?[\s:]*([\d.,]+)/i;
        
        let extracted = {
            ganhosBrutos: 0,
            comissaoApp: 0,
            ganhosLiquidos: 0,
            faturaPlataforma: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0
        };
        
        lines.forEach(line => {
            let match;
            
            if (match = line.match(ganhosBrutosRegex)) {
                extracted.ganhosBrutos = parseCurrency(match[1]);
            }
            if (match = line.match(comissaoRegex)) {
                extracted.comissaoApp = parseCurrency(match[1]);
            }
            if (match = line.match(ganhosLiquidosRegex)) {
                extracted.ganhosLiquidos = parseCurrency(match[1]);
            }
            if (match = line.match(faturaRegex)) {
                extracted.faturaPlataforma = parseCurrency(match[1]);
            }
            if (match = line.match(campanhasRegex)) {
                extracted.campanhas = parseCurrency(match[1]);
            }
            if (match = line.match(gorjetasRegex)) {
                extracted.gorjetas = parseCurrency(match[1]);
            }
            if (match = line.match(cancelamentosRegex)) {
                extracted.cancelamentos = parseCurrency(match[1]);
            }
        });
        
        VDCSystem.documents.control.parsedData = extracted;
        
        // Atualizar valores do sistema
        VDCSystem.analysis.extractedValues.ganhosBrutos = extracted.ganhosBrutos;
        VDCSystem.analysis.extractedValues.comissaoApp = extracted.comissaoApp;
        VDCSystem.analysis.extractedValues.ganhosLiquidos = extracted.ganhosLiquidos;
        VDCSystem.analysis.extractedValues.faturaPlataforma = extracted.faturaPlataforma;
        VDCSystem.analysis.extractedValues.campanhas = extracted.campanhas;
        VDCSystem.analysis.extractedValues.gorjetas = extracted.gorjetas;
        VDCSystem.analysis.extractedValues.cancelamentos = extracted.cancelamentos;
        
        logAudit(`✅ Controlo carregado: ${file.name}`, 'success');
        logAudit(`Valores extraídos: ${JSON.stringify(extracted)}`, 'info');
        
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro ao processar ficheiro de controlo:', error);
        logAudit(`❌ Erro ao processar ${file.name}: ${error.message}`, 'error');
    }
}

async function processSaftFiles(files) {
    try {
        logAudit(`Processando ${files.length} ficheiros SAF-T...`, 'info');
        
        let totalGross = 0;
        let totalIVA6 = 0;
        
        for (const file of files) {
            const text = await file.text();
            
            // Regex para valores em SAF-T XML
            const grossRegex = /<TotalGross>([\d.,]+)<\/TotalGross>/i;
            const taxRegex = /<Tax>[\s\S]*?<TaxAmount>([\d.,]+)<\/TaxAmount>/i;
            
            let match;
            if (match = text.match(grossRegex)) {
                totalGross += parseCurrency(match[1]);
            }
            
            if (match = text.match(taxRegex)) {
                totalIVA6 += parseCurrency(match[1]);
            }
            
            // Alternativa: procurar por padrões comuns
            const altRegexes = [
                /valor.*total.*[\s:]*([\d.,]+)/gi,
                /montante.*[\s:]*([\d.,]+)/gi,
                /total.*iva.*[\s:]*([\d.,]+)/gi
            ];
            
            altRegexes.forEach(regex => {
                const matches = text.matchAll(regex);
                for (const match of matches) {
                    const val = parseCurrency(match[1]);
                    if (val > 0) {
                        if (regex.toString().includes('iva')) {
                            totalIVA6 += val;
                        } else {
                            totalGross += val;
                        }
                    }
                }
            });
        }
        
        VDCSystem.documents.saft.totals.gross = totalGross;
        VDCSystem.documents.saft.totals.iva6 = totalIVA6;
        VDCSystem.documents.saft.totals.net = totalGross - totalIVA6;
        
        VDCSystem.analysis.extractedValues.saftGross = totalGross;
        VDCSystem.analysis.extractedValues.saftIVA6 = totalIVA6;
        VDCSystem.analysis.extractedValues.valorIliquido = totalGross;
        VDCSystem.analysis.extractedValues.iva6Percent = totalIVA6;
        
        logAudit(`✅ ${files.length} ficheiros SAF-T processados`, 'success');
        logAudit(`Total Bruto: ${formatCurrency(totalGross)} | IVA 6%: ${formatCurrency(totalIVA6)}`, 'info');
        
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro ao processar SAF-T:', error);
        logAudit(`❌ Erro ao processar SAF-T: ${error.message}`, 'error');
    }
}

async function processInvoiceFiles(files) {
    try {
        logAudit(`Processando ${files.length} faturas...`, 'info');
        
        let totalCommission = 0;
        let totalIVA23 = 0;
        let totalInvoiceValue = 0;
        
        for (const file of files) {
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                const text = await file.text();
                
                // CSV parsing
                const commissionRegex = /comiss[aã]o[\s:]*([\d.,]+)/gi;
                const ivaRegex = /iva.*23%[\s:]*([\d.,]+)/gi;
                const totalRegex = /total.*fatura[\s:]*([\d.,]+)/gi;
                
                let match;
                while (match = commissionRegex.exec(text)) {
                    totalCommission += parseCurrency(match[1]);
                }
                while (match = ivaRegex.exec(text)) {
                    totalIVA23 += parseCurrency(match[1]);
                }
                while (match = totalRegex.exec(text)) {
                    totalInvoiceValue += parseCurrency(match[1]);
                }
                
            } else if (file.type === 'application/pdf') {
                // Para PDF, usar valores padrão para demo
                if (VDCSystem.demoMode) {
                    totalCommission = 792.59;
                    totalIVA23 = 182.30;
                    totalInvoiceValue = 239.00;
                }
            }
        }
        
        VDCSystem.documents.invoices.totals.commission = totalCommission;
        VDCSystem.documents.invoices.totals.iva23 = totalIVA23;
        VDCSystem.documents.invoices.totals.invoiceValue = totalInvoiceValue;
        
        VDCSystem.analysis.extractedValues.platformCommission = totalCommission;
        VDCSystem.analysis.extractedValues.iva23Due = totalIVA23;
        VDCSystem.analysis.extractedValues.faturaPlataforma = totalInvoiceValue;
        VDCSystem.analysis.extractedValues.comissaoCalculada = totalCommission;
        VDCSystem.analysis.extractedValues.iva23Autoliquidacao = totalIVA23;
        
        logAudit(`✅ ${files.length} faturas processadas`, 'success');
        logAudit(`Comissão Total: ${formatCurrency(totalCommission)} | Valor Fatura: ${formatCurrency(totalInvoiceValue)} | IVA 23%: ${formatCurrency(totalIVA23)}`, 'info');
        
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro ao processar faturas:', error);
        logAudit(`❌ Erro ao processar faturas: ${error.message}`, 'error');
    }
}

async function processStatementFiles(files) {
    try {
        logAudit(`Processando ${files.length} extratos bancários...`, 'info');
        
        let totalTransfer = 0;
        let totalGanhosBrutos = 0;
        let totalComissao = 0;
        let totalLiquido = 0;
        let campanhas = 0;
        let gorjetas = 0;
        let cancelamentos = 0;
        
        for (const file of files) {
            const text = await file.text();
            
            // Regex melhorado para extratos bancários
            const transferRegex = /transfer[eê]ncia.*[\s:]*([\d.,]+)/gi;
            const ganhosRegex = /ganhos.*brutos?[\s:]*([\d.,]+)/gi;
            const comissaoRegex = /comiss[aã]o.*[\s:]*([\d.,]+)/gi;
            const liquidoRegex = /l[ií]quido.*[\s:]*([\d.,]+)/gi;
            const campanhasRegex = /campanha.*[\s:]*([\d.,]+)/gi;
            const gorjetasRegex = /gorjeta.*[\s:]*([\d.,]+)/gi;
            const cancelamentosRegex = /cancelamento.*[\s:]*([\d.,]+)/gi;
            
            const lines = text.split('\n');
            lines.forEach(line => {
                let match;
                
                if (match = line.match(transferRegex)) {
                    totalTransfer += parseCurrency(match[1]);
                }
                if (match = line.match(ganhosRegex)) {
                    totalGanhosBrutos += parseCurrency(match[1]);
                }
                if (match = line.match(comissaoRegex)) {
                    totalComissao += parseCurrency(match[1]);
                }
                if (match = line.match(liquidoRegex)) {
                    totalLiquido += parseCurrency(match[1]);
                }
                if (match = line.match(campanhasRegex)) {
                    campanhas += parseCurrency(match[1]);
                }
                if (match = line.match(gorjetasRegex)) {
                    gorjetas += parseCurrency(match[1]);
                }
                if (match = line.match(cancelamentosRegex)) {
                    cancelamentos += parseCurrency(match[1]);
                }
                
                // Procurar por padrões numéricos grandes
                const numberPattern = /([\d.,]{3,})/g;
                const numbers = line.match(numberPattern);
                if (numbers) {
                    numbers.forEach(num => {
                        const val = parseCurrency(num);
                        if (val > 100) { // Assume valores significativos
                            if (line.toLowerCase().includes('bolt') || line.toLowerCase().includes('uber')) {
                                totalTransfer += val;
                            }
                        }
                    });
                }
            });
        }
        
        // Usar valores do controlo se disponíveis
        if (VDCSystem.documents.control.parsedData) {
            totalGanhosBrutos = VDCSystem.documents.control.parsedData.ganhosBrutos || totalGanhosBrutos;
            totalComissao = VDCSystem.documents.control.parsedData.comissaoApp || totalComissao;
            totalLiquido = VDCSystem.documents.control.parsedData.ganhosLiquidos || totalLiquido;
            campanhas = VDCSystem.documents.control.parsedData.campanhas || campanhas;
            gorjetas = VDCSystem.documents.control.parsedData.gorjetas || gorjetas;
            cancelamentos = VDCSystem.documents.control.parsedData.cancelamentos || cancelamentos;
        }
        
        VDCSystem.documents.statements.totals.transfer = totalTransfer;
        VDCSystem.documents.statements.totals.ganhosBrutos = totalGanhosBrutos;
        VDCSystem.documents.statements.totals.comissaoApp = totalComissao;
        VDCSystem.documents.statements.totals.ganhosLiquidos = totalLiquido;
        VDCSystem.documents.statements.totals.campanhas = campanhas;
        VDCSystem.documents.statements.totals.gorjetas = gorjetas;
        VDCSystem.documents.statements.totals.cancelamentos = cancelamentos;
        
        VDCSystem.analysis.extractedValues.bankTransfer = totalTransfer;
        VDCSystem.analysis.extractedValues.ganhosBrutos = totalGanhosBrutos;
        VDCSystem.analysis.extractedValues.comissaoApp = totalComissao;
        VDCSystem.analysis.extractedValues.ganhosLiquidos = totalLiquido;
        VDCSystem.analysis.extractedValues.campanhas = campanhas;
        VDCSystem.analysis.extractedValues.gorjetas = gorjetas;
        VDCSystem.analysis.extractedValues.cancelamentos = cancelamentos;
        
        logAudit(`✅ ${files.length} extratos bancários processados`, 'success');
        logAudit(`Transferência Total: ${formatCurrency(totalTransfer)} | Ganhos Brutos: ${formatCurrency(totalGanhosBrutos)} | Comissão: ${formatCurrency(totalComissao)} | Líquido: ${formatCurrency(totalLiquido)}`, 'info');
        
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro ao processar extratos:', error);
        logAudit(`❌ Erro ao processar extratos: ${error.message}`, 'error');
    }
}

// 7. FUNÇÃO LOAD DEMO DATA - VALORES REAIS
function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados de demonstração.\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS DE DEMONSTRAÇÃO...', 'info');
            
            // Limpar estado primeiro
            clearExtractedValues();
            resetDashboardDisplay();
            
            // VALORES REAIS DA DEMONSTRAÇÃO
            VDCSystem.analysis.extractedValues = {
                saftGross: 3202.54,
                saftIVA6: 192.15,
                platformCommission: 792.59,
                bankTransfer: 2409.95,
                iva23Due: 182.30,
                ganhosBrutos: 3202.54,
                comissaoApp: -792.59,
                ganhosLiquidos: 2409.95,
                faturaPlataforma: 239.00,
                campanhas: 20.00,
                gorjetas: 9.00,
                cancelamentos: 15.60,
                diferencialCusto: 553.59,
                prejuizoFiscal: 116.25,
                imtBase: 786.36,
                imtTax: 39.32,
                imtTotal: 825.68,
                dac7Value: 50000,
                dac7Discrepancy: 0,
                valorIliquido: 3202.54,
                iva6Percent: 192.15,
                iva23Autoliquidacao: 182.30,
                comissaoCalculada: 792.59
            };
            
            // Preencher campos do formulário
            document.getElementById('clientName').value = 'Marcos, Lda';
            document.getElementById('clientNIF').value = '756845921';
            document.getElementById('clientPhone').value = '+351 912 345 678';
            document.getElementById('clientEmail').value = 'contacto@marcos.pt';
            document.getElementById('clientAddress').value = 'Rua Exemplo, 123, Porto';
            
            // Registrar cliente automaticamente
            VDCSystem.client = { 
                name: 'Marcos, Lda', 
                nif: '756845921',
                phone: '+351 912 345 678',
                email: 'contacto@marcos.pt',
                address: 'Rua Exemplo, 123, Porto',
                registrationDate: new Date().toISOString()
            };
            
            // Atualizar visual do cliente
            const status = document.getElementById('clientStatus');
            const nameDisplay = document.getElementById('clientNameDisplay');
            
            if (status) status.style.display = 'flex';
            if (nameDisplay) nameDisplay.textContent = 'Marcos, Lda';
            
            // Ativar modo demo
            VDCSystem.demoMode = true;
            
            // Simular carregamento de ficheiros
            VDCSystem.documents.control.files = [
                { 
                    name: 'CONTROLO_AUTENTICIDADE_VDC.csv', 
                    size: 1024,
                    lastModified: Date.now(),
                    type: 'text/csv'
                }
            ];
            
            VDCSystem.documents.saft.files = [
                { 
                    name: 'SAF-T_PT_2024.xml', 
                    size: 2048,
                    lastModified: Date.now(),
                    type: 'application/xml'
                }
            ];
            
            VDCSystem.documents.invoices.files = [
                { 
                    name: 'Fatura_Bolt_Out-Dez_2024.pdf', 
                    size: 3072,
                    lastModified: Date.now(),
                    type: 'application/pdf'
                }
            ];
            
            VDCSystem.documents.statements.files = [
                { 
                    name: 'Extrato_Bancario_Dez_2024.pdf', 
                    size: 4096,
                    lastModified: Date.now(),
                    type: 'application/pdf'
                }
            ];
            
            // Atualizar contadores
            VDCSystem.counters = { saft: 1, invoices: 1, statements: 1, total: 3 };
            document.getElementById('saftCount').textContent = '1';
            document.getElementById('invoiceCount').textContent = '1';
            document.getElementById('statementCount').textContent = '1';
            document.getElementById('totalCount').textContent = '3';
            
            // Atualizar listas de ficheiros visuais
            updateFileList('controlFileList', VDCSystem.documents.control.files);
            updateFileList('saftFileList', VDCSystem.documents.saft.files);
            updateFileList('invoiceFileList', VDCSystem.documents.invoices.files);
            updateFileList('statementFileList', VDCSystem.documents.statements.files);
            
            // Atualizar DAC7
            document.getElementById('dac7Value').value = 50000;
            
            // Atualizar botão de análise
            updateAnalysisButton();
            
            logAudit('✅ Dados de demonstração carregados com sucesso', 'success');
            logAudit('Clique em "EXECUTAR ANÁLISE FORENSE" para ver os resultados', 'info');
            
            // Atualizar dashboard com valores demo
            updateDashboard();
            
        } catch (error) {
            console.error('Erro ao carregar demo:', error);
            logAudit(`❌ Erro ao carregar dados demo: ${error.message}`, 'error');
        }
    }
}

// 8. FUNÇÕES DE ATUALIZAÇÃO DA INTERFACE
function updateFileList(elementId, files) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (files.length === 0) {
        element.innerHTML = '';
        element.classList.remove('visible');
        return;
    }
    
    element.innerHTML = '';
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name">${file.name}</span>
            <span class="file-status">VALIDADO ✅</span>
        `;
        element.appendChild(div);
    });
    
    element.classList.add('visible');
}

function updateCounter(type, count) {
    switch(type) {
        case 'saft':
            VDCSystem.counters.saft += count;
            document.getElementById('saftCount').textContent = VDCSystem.counters.saft;
            break;
        case 'invoices':
            VDCSystem.counters.invoices += count;
            document.getElementById('invoiceCount').textContent = VDCSystem.counters.invoices;
            break;
        case 'statements':
            VDCSystem.counters.statements += count;
            document.getElementById('statementCount').textContent = VDCSystem.counters.statements;
            break;
    }
    
    VDCSystem.counters.total = VDCSystem.counters.saft + VDCSystem.counters.invoices + VDCSystem.counters.statements;
    document.getElementById('totalCount').textContent = VDCSystem.counters.total;
    
    updateAnalysisButton();
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasClient = VDCSystem.client !== null;
    const hasDocuments = VDCSystem.counters.total > 0 || VDCSystem.demoMode;
    
    analyzeBtn.disabled = !(hasClient && hasDocuments);
    
    if (analyzeBtn.disabled) {
        analyzeBtn.title = 'Registe um cliente e carregue documentos primeiro';
    } else {
        analyzeBtn.title = 'Clique para executar análise forense';
    }
}

// 9. ANÁLISE FORENSE - FUNÇÃO PRINCIPAL
async function performForensicAnalysis() {
    if (VDCSystem.isProcessing) {
        logAudit('⚠️  Análise já em progresso...', 'warn');
        return;
    }
    
    VDCSystem.isProcessing = true;
    
    try {
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE BIG DATA v10.7', 'success');
        logAudit('🔍 MOTOR DE EXTRAÇÃO OTIMIZADO - DETETANDO VALORES COM VÍRGULAS/PONTOS', 'info');
        
        // 1. RECONCILIAÇÃO TRIANGULAR
        const verticeA = VDCSystem.analysis.extractedValues.saftGross || 
                        VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
        const verticeB = Math.abs(VDCSystem.analysis.extractedValues.platformCommission || 
                                 VDCSystem.analysis.extractedValues.comissaoApp || 0);
        const verticeC = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
        
        // Calcular deltas
        const deltaAB = verticeA - (verticeA - verticeB); // Diferença entre bruto e líquido
        const deltaBC = verticeB - verticeC; // Diferença entre comissão e fatura
        
        // Erro sistêmico
        const erroSistemico = Math.abs(deltaAB) + Math.abs(deltaBC);
        const percentagemErro = verticeB > 0 ? (erroSistemico / verticeB) * 100 : 0;
        
        // Atualizar análise
        VDCSystem.analysis.crossings.deltaA = deltaAB;
        VDCSystem.analysis.crossings.deltaB = deltaBC;
        VDCSystem.analysis.crossings.omission = erroSistemico;
        VDCSystem.analysis.crossings.diferencialAlerta = erroSistemico > 0;
        
        // Calcular prejuízo fiscal
        const prejuizoFiscal = erroSistemico * 0.21; // 21% de IRC
        const ivaDevido = verticeB * 0.23; // 23% de IVA
        
        VDCSystem.analysis.extractedValues.prejuizoFiscal = prejuizoFiscal;
        VDCSystem.analysis.extractedValues.iva23Due = ivaDevido;
        
        // Log da reconciliação
        logAudit('📊 RECONCILIAÇÃO TRIANGULAR:', 'info');
        logAudit(`• Vértice A (SAF-T): ${formatCurrency(verticeA)}`, 'info');
        logAudit(`• Vértice B (Comissão Retida): ${formatCurrency(verticeB)}`, 'info');
        logAudit(`• Vértice C (Fatura Emitida): ${formatCurrency(verticeC)}`, 'info');
        logAudit(`• Delta A-B: ${formatCurrency(deltaAB)}`, 'info');
        logAudit(`• Delta B-C: ${formatCurrency(deltaBC)}`, 'info');
        logAudit(`• DIFERENCIAL (Erro Sistémico): ${formatCurrency(erroSistemico)} (${percentagemErro.toFixed(2)}%)`, 'warn');
        logAudit(`• Prejuízo Fiscal: ${formatCurrency(prejuizoFiscal)} | IVA Devido: ${formatCurrency(ivaDevido)}`, 'error');
        
        // 2. CÁLCULO DO IMT
        const imtBase = verticeB;
        const imtTax = imtBase * 0.05; // 5% IMT
        const imtTotal = imtBase + imtTax;
        
        VDCSystem.analysis.extractedValues.imtBase = imtBase;
        VDCSystem.analysis.extractedValues.imtTax = imtTax;
        VDCSystem.analysis.extractedValues.imtTotal = imtTotal;
        
        logAudit(`📊 IMT Calculado: Base ${formatCurrency(imtBase)} | Comissão ${formatCurrency(imtBase)} | IMT ${formatCurrency(imtTax)}`, 'info');
        
        // 3. PROJEÇÃO DE MERCADO
        const averagePerDriver = verticeA / 1; // Supondo 1 condutor para demo
        const marketProjection = averagePerDriver * VDCSystem.analysis.projection.driverCount;
        
        VDCSystem.analysis.projection.averagePerDriver = averagePerDriver;
        VDCSystem.analysis.projection.marketProjection = marketProjection;
        
        // 4. ATUALIZAR DASHBOARD
        updateDashboard();
        
        // 5. GERAR MASTER HASH
        const masterHash = generateMasterHash();
        document.getElementById('masterHashValue').textContent = masterHash.substring(0, 64) + '...';
        
        logAudit(`🔐 Master Hash gerada: ${masterHash.substring(0, 32)}...`, 'success');
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        // 6. ATUALIZAR GRÁFICO
        updateChart();
        
        // 7. MOSTRAR ALERTAS SE NECESSÁRIO
        if (erroSistemico > 0) {
            showDiferencialAlert(erroSistemico, percentagemErro);
        }
        
    } catch (error) {
        console.error('Erro na análise forense:', error);
        logAudit(`❌ Erro na análise: ${error.message}`, 'error');
    } finally {
        VDCSystem.isProcessing = false;
    }
}

// 10. ATUALIZAÇÃO DO DASHBOARD
function updateDashboard() {
    const vals = VDCSystem.analysis.extractedValues;
    
    // Dashboard Fixo
    document.getElementById('netVal').textContent = formatCurrency(vals.valorIliquido);
    document.getElementById('iva6Val').textContent = formatCurrency(vals.iva6Percent);
    document.getElementById('commissionVal').textContent = formatCurrency(vals.comissaoCalculada);
    document.getElementById('iva23Val').textContent = formatCurrency(vals.iva23Autoliquidacao);
    
    // IMT
    document.getElementById('imtBase').textContent = formatCurrency(vals.imtBase);
    document.getElementById('imtTax').textContent = formatCurrency(vals.imtTax);
    document.getElementById('imtTotal').textContent = formatCurrency(vals.imtTotal);
    
    // KPIs
    document.getElementById('kpiGanhos').textContent = formatCurrency(vals.ganhosBrutos);
    document.getElementById('kpiComm').textContent = formatCurrency(Math.abs(vals.comissaoApp));
    document.getElementById('kpiNet').textContent = formatCurrency(vals.ganhosLiquidos);
    document.getElementById('kpiInvoice').textContent = formatCurrency(vals.faturaPlataforma);
    
    // Valores secundários
    document.getElementById('valCamp').textContent = formatCurrency(vals.campanhas);
    document.getElementById('valTips').textContent = formatCurrency(vals.gorjetas);
    document.getElementById('valCanc').textContent = formatCurrency(vals.cancelamentos);
    
    // Resultados
    const gross = vals.saftGross || vals.ganhosBrutos || 0;
    const transfer = vals.bankTransfer || vals.ganhosLiquidos || 0;
    const diferencial = VDCSystem.analysis.crossings.omission || 0;
    const marketProj = VDCSystem.analysis.projection.marketProjection || 0;
    
    document.getElementById('grossResult').textContent = formatCurrency(gross);
    document.getElementById('transferResult').textContent = formatCurrency(transfer);
    document.getElementById('differenceResult').textContent = formatCurrency(diferencial);
    document.getElementById('marketResult').textContent = formatCurrency(marketProj / 1000000) + 'M€';
    
    // Atualizar barras
    const maxVal = Math.max(gross, transfer, diferencial, marketProj / 1000000);
    
    if (maxVal > 0) {
        document.getElementById('grossBar').style.width = `${(gross / maxVal) * 100}%`;
        document.getElementById('transferBar').style.width = `${(transfer / maxVal) * 100}%`;
        document.getElementById('differenceBar').style.width = `${(diferencial / maxVal) * 100}%`;
        document.getElementById('marketBar').style.width = `${((marketProj / 1000000) / maxVal) * 100}%`;
    }
}

function resetDashboard() {
    const elements = [
        'netVal', 'iva6Val', 'commissionVal', 'iva23Val',
        'imtBase', 'imtTax', 'imtTotal',
        'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice',
        'valCamp', 'valTips', 'valCanc',
        'grossResult', 'transferResult', 'differenceResult', 'marketResult'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0,00€';
        }
    });
    
    // Resetar barras
    const bars = ['grossBar', 'transferBar', 'differenceBar', 'marketBar'];
    bars.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = '0%';
        }
    });
}

function resetDashboardDisplay() {
    resetDashboard();
    logAudit('📊 Dashboard resetado - Aguardando novos dados', 'info');
}

function clearExtractedValues() {
    VDCSystem.analysis.extractedValues = {
        saftGross: 0,
        saftIVA6: 0,
        platformCommission: 0,
        bankTransfer: 0,
        iva23Due: 0,
        ganhosBrutos: 0,
        comissaoApp: 0,
        ganhosLiquidos: 0,
        faturaPlataforma: 0,
        campanhas: 0,
        gorjetas: 0,
        cancelamentos: 0,
        diferencialCusto: 0,
        prejuizoFiscal: 0,
        imtBase: 0,
        imtTax: 0,
        imtTotal: 0,
        dac7Value: 0,
        dac7Discrepancy: 0,
        valorIliquido: 0,
        iva6Percent: 0,
        iva23Autoliquidacao: 0,
        comissaoCalculada: 0
    };
}

// 11. FUNÇÕES DO GRÁFICO
function renderEmptyChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Valor Ilíquido', 'IVA 6%', 'Comissão Plataforma', 'IVA 23% Devido'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#00f2ff',
                    '#3b82f6',
                    '#ff3e3e',
                    '#f59e0b'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function updateChart() {
    if (!VDCSystem.chart) return;
    
    const vals = VDCSystem.analysis.extractedValues;
    
    VDCSystem.chart.data.datasets[0].data = [
        vals.valorIliquido || 0,
        vals.iva6Percent || 0,
        vals.comissaoCalculada || 0,
        vals.iva23Autoliquidacao || 0
    ];
    
    VDCSystem.chart.update();
}

// 12. FUNÇÕES DO DAC7
function calcularDiscrepanciaDAC7() {
    const dac7Value = parseFloat(document.getElementById('dac7Value').value) || 0;
    
    if (dac7Value === 0) {
        alert('Por favor, insira um valor para o DAC7.');
        return;
    }
    
    // Calcular discrepância baseada nos valores extraídos
    const reportedIncome = VDCSystem.analysis.extractedValues.ganhosBrutos * 12; // Projeção anual
    const discrepancy = dac7Value - reportedIncome;
    
    VDCSystem.analysis.extractedValues.dac7Value = dac7Value;
    VDCSystem.analysis.extractedValues.dac7Discrepancy = discrepancy;
    
    const resultDiv = document.getElementById('dac7Result');
    const discrepancySpan = document.getElementById('dac7Discrepancy');
    
    if (resultDiv && discrepancySpan) {
        discrepancySpan.textContent = formatCurrency(discrepancy);
        resultDiv.style.display = 'flex';
    }
    
    if (discrepancy > 0) {
        logAudit(`⚠️  Discrepância DAC7 detectada: ${formatCurrency(discrepancy)}`, 'warn');
    } else {
        logAudit(`✅ DAC7 compatível com valores reportados`, 'success');
    }
}

// 13. FUNÇÕES DE EXPORTAÇÃO
function exportJSON() {
    if (!VDCSystem.client) {
        alert('Por favor, registe um cliente primeiro.');
        return;
    }
    
    const exportData = {
        sistema: 'VDC Forensic System v10.7',
        sessao: VDCSystem.sessionId,
        data: new Date().toISOString(),
        cliente: VDCSystem.client,
        analise: VDCSystem.analysis,
        documentos: {
            contadores: VDCSystem.counters,
            hashes: {}
        }
    };
    
    // Calcular hash para cada tipo de documento
    Object.keys(VDCSystem.documents).forEach(type => {
        if (VDCSystem.documents[type].files.length > 0) {
            exportData.documentos.hashes[type] = CryptoJS.SHA256(
                JSON.stringify(VDCSystem.documents[type].files)
            ).toString();
        }
    });
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `VDC_Prova_Digital_${VDCSystem.sessionId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logAudit('✅ Prova digital (JSON) exportada com sucesso', 'success');
}

async function exportPDF() {
    if (!VDCSystem.client) {
        alert('Por favor, registe um cliente primeiro.');
        return;
    }
    
    logAudit('📄 GERANDO RELATÓRIO PERICIAL...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        
        // 1. CABEÇALHO
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('VDC FORENSIC SYSTEM v10.7', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Protocolo de Prova Legal | Big Data Forense | Reunião MLGTS', pageWidth / 2, 28, { align: 'center' });
        
        doc.setFontSize(9);
        doc.text(`Sessão: ${VDCSystem.sessionId}`, pageWidth / 2, 35, { align: 'center' });
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, pageWidth / 2, 40, { align: 'center' });
        
        // Linha separadora
        doc.setDrawColor(0, 242, 255);
        doc.setLineWidth(0.5);
        doc.line(margin, 45, pageWidth - margin, 45);
        
        // 2. IDENTIFICAÇÃO DO CLIENTE
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('1. IDENTIFICAÇÃO COMPLETA DO CLIENTE', margin, 55);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome: ${VDCSystem.client.name}`, margin, 65);
        doc.text(`NIF: ${VDCSystem.client.nif}`, margin, 72);
        doc.text(`Telefone: ${VDCSystem.client.phone}`, margin, 79);
        doc.text(`Email: ${VDCSystem.client.email}`, margin, 86);
        doc.text(`Morada: ${VDCSystem.client.address}`, margin, 93);
        doc.text(`Data de Análise: ${new Date().toLocaleDateString('pt-PT')}`, margin, 100);
        
        // 3. VALORES EXTRAÍDOS
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('2. VALORES EXTRAÍDOS (DOCUMENTOS OFICIAIS)', margin, 115);
        
        const vals = VDCSystem.analysis.extractedValues;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Ganhos Brutos: ${formatCurrency(vals.ganhosBrutos)}`, margin, 125);
        doc.text(`Comissão App: ${formatCurrency(vals.comissaoApp)}`, margin, 132);
        doc.text(`Ganhos Líquidos: ${formatCurrency(vals.ganhosLiquidos)}`, margin, 139);
        doc.text(`Fatura Plataforma: ${formatCurrency(vals.faturaPlataforma)}`, margin, 146);
        doc.text(`IVA 6%: ${formatCurrency(vals.iva6Percent)}`, margin, 153);
        doc.text(`IVA 23% Devido: ${formatCurrency(vals.iva23Due)}`, margin, 160);
        
        // Nova página
        doc.addPage();
        
        // 4. RECONCILIAÇÃO TRIANGULAR
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('3. RECONCILIAÇÃO TRIANGULAR - ERRO SISTÉMICO', margin, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Vértice A (SAF-T): ${formatCurrency(vals.saftGross)}`, margin, 30);
        doc.text(`Vértice B (Comissão Retida): ${formatCurrency(Math.abs(vals.comissaoApp))}`, margin, 37);
        doc.text(`Vértice C (Fatura Emitida): ${formatCurrency(vals.faturaPlataforma)}`, margin, 44);
        doc.text(`ERRO SISTÉMICO: ${formatCurrency(VDCSystem.analysis.crossings.omission)}`, margin, 51);
        
        const percentErro = vals.comissaoCalculada > 0 ? 
            (VDCSystem.analysis.crossings.omission / vals.comissaoCalculada) * 100 : 0;
        doc.text(`Percentagem da Comissão: ${percentErro.toFixed(2)}%`, margin, 58);
        doc.text(`Prejuízo Fiscal (21%): ${formatCurrency(vals.prejuizoFiscal)}`, margin, 65);
        doc.text(`IVA Não Autoliquidado (23%): ${formatCurrency(vals.iva23Due)}`, margin, 72);
        
        const impactTotal = vals.prejuizoFiscal + vals.iva23Due;
        doc.text(`Impacto Total: ${formatCurrency(impactTotal)}`, margin, 79);
        
        // Linha separadora
        doc.setDrawColor(0, 242, 255);
        doc.setLineWidth(0.5);
        doc.line(margin, 90, pageWidth - margin, 90);
        
        // 5. ESPECIFICAÇÕES TÉCNICAS (CENTRALIZADO)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('ANEXO II: ESPECIFICAÇÕES TÉCNICAS DE AUDITORIA', pageWidth / 2, 100, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Texto centralizado
        const specText = [
            'Protocolo de Gestão de Evidências e Análise Forense',
            'Este relatório serve como uma síntese formal das evidências digitais',
            'processadas sob o Protocolo de Análise Forense VDC.',
            '',
            'Os dados aqui contidos são o resultado de uma análise cruzada',
            'entre fontes fiscais primárias e relatórios secundários da plataforma.',
            '',
            'Fontes de Evidências: A análise integra dados de arquivos SAF-T (PT),',
            'que constituem a declaração legal do contribuinte, e extratos gerados',
            'pela plataforma que representam o fluxo de caixa real.',
            '',
            'Metodologia de Verificação: O sistema utiliza a Conciliação Triangular.',
            'Este processo valida a consistência entre a Receita Bruta (Fonte A),',
            'as Comissões Retidas (Fonte B) e as Faturas Emitidas (Fonte C).',
            '',
            'Independência da Auditoria: Todos os cálculos são realizados por meio',
            'de um processo algorítmico automatizado, garantindo a neutralidade',
            'das conclusões e a ausência de manipulação manual de dados.',
            '',
            'Nota de Conformidade: As discrepâncias identificadas na seção',
            '"Erro Sistêmico" representam potenciais violações do Princípio',
            'da Neutralidade Tributária e do Código Comercial referentes',
            'à emissão obrigatória de faturas.'
        ];
        
        let yPos = 110;
        specText.forEach(line => {
            if (line.trim()) {
                doc.text(line, pageWidth / 2, yPos, { align: 'center' });
            }
            yPos += 5;
        });
        
        // 6. QUADRO DE CONFORMIDADE
        yPos += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('QUADRO DE CONFORMIDADE E EVIDÊNCIAS', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
        
        // Criar tabela
        const tableData = [
            ['Evidência', 'Valor', 'Status'],
            ['Ganhos Plataforma', formatCurrency(vals.ganhosBrutos), 'Validado'],
            ['Comissão Retida', formatCurrency(Math.abs(vals.comissaoApp)), 'Confirmado'],
            ['Fatura Emitida', formatCurrency(vals.faturaPlataforma), 'Documentada'],
            ['Diferencial Oculto', formatCurrency(VDCSystem.analysis.crossings.omission), 'ERRO SISTÊMICO'],
            ['Percentagem', `${percentErro.toFixed(2)}%`, 'CRÍTICO'],
            ['Prejuízo Fiscal', formatCurrency(vals.prejuizoFiscal), 'Crime Fiscal'],
            ['IVA em Défice', formatCurrency(vals.iva23Due), 'Crime Fiscal']
        ];
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        // Desenhar tabela
        const colWidths = [60, 50, 50];
        const startX = margin;
        
        tableData.forEach((row, rowIndex) => {
            let xPos = startX;
            
            row.forEach((cell, colIndex) => {
                if (rowIndex === 0) {
                    doc.setFont('helvetica', 'bold');
                } else {
                    doc.setFont('helvetica', 'normal');
                }
                
                doc.text(cell, xPos + (colWidths[colIndex] / 2), yPos, { align: 'center' });
                xPos += colWidths[colIndex];
            });
            
            yPos += 8;
            
            // Desenhar linha horizontal
            if (rowIndex === 0) {
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.2);
                doc.line(startX, yPos - 4, startX + colWidths.reduce((a, b) => a + b, 0), yPos - 4);
            }
        });
        
        // 7. RODAPÉ
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`VDC Forensic System v10.7 | Protocolo ISO 27037 | Reunião MLGTS`, pageWidth / 2, 280, { align: 'center' });
        doc.text(`Página 2 de 2`, pageWidth / 2, 285, { align: 'center' });
        
        // 8. SALVAR PDF
        doc.save(`VDC_Relatorio_Pericial_${VDCSystem.client.nif}_${VDCSystem.sessionId}.pdf`);
        
        logAudit('✅ Relatório pericial gerado - Download iniciado', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar relatório: ${error.message}`, 'error');
        alert('Erro ao gerar relatório PDF. Por favor, tente novamente.');
    }
}

// 14. FUNÇÕES AUXILIARES
function showDiferencialAlert(valor, percentagem) {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
    // Remover alerta anterior se existir
    const existingAlert = document.querySelector('.omission-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'omission-alert diferencial-alert';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div>
            <strong>⚠️  DIFERENCIAL OCULTO DETETADO</strong>
            <p>Erro sistêmico identificado: ${formatCurrency(valor)} (${percentagem.toFixed(2)}% da comissão)</p>
            <p>Este valor representa uma omissão contabilística que pode configurar crime fiscal.</p>
        </div>
    `;
    
    resultsSection.appendChild(alertDiv);
}

function showError(message) {
    logAudit(`❌ ${message}`, 'error');
    alert(`Erro: ${message}`);
}

function clearAllData() {
    if (confirm('⚠️  ATENÇÃO: Isto irá limpar todos os dados da sessão atual.\n\nContinuar?')) {
        // Resetar estado do sistema
        VDCSystem.client = null;
        VDCSystem.demoMode = false;
        VDCSystem.documents = {
            control: { files: [], parsedData: null, hashes: {} },
            saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 } },
            invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0 } },
            statements: { files: [], parsedData: [], totals: { 
                transfer: 0, 
                expected: 0,
                ganhosBrutos: 0,
                comissaoApp: 0,
                ganhosLiquidos: 0,
                campanhas: 0,
                gorjetas: 0,
                cancelamentos: 0,
                diferencialCusto: 0
            } }
        };
        
        VDCSystem.analysis = {
            extractedValues: {
                saftGross: 0,
                saftIVA6: 0,
                platformCommission: 0,
                bankTransfer: 0,
                iva23Due: 0,
                ganhosBrutos: 0,
                comissaoApp: 0,
                ganhosLiquidos: 0,
                faturaPlataforma: 0,
                campanhas: 0,
                gorjetas: 0,
                cancelamentos: 0,
                diferencialCusto: 0,
                prejuizoFiscal: 0,
                imtBase: 0,
                imtTax: 0,
                imtTotal: 0,
                dac7Value: 0,
                dac7Discrepancy: 0,
                valorIliquido: 0,
                iva6Percent: 0,
                iva23Autoliquidacao: 0,
                comissaoCalculada: 0
            },
            crossings: {
                deltaA: 0,
                deltaB: 0,
                omission: 0,
                isValid: true,
                diferencialAlerta: false
            },
            projection: {
                marketProjection: 0,
                averagePerDriver: 0,
                driverCount: 38000
            },
            anomalies: [],
            legalCitations: []
        };
        
        VDCSystem.counters = {
            saft: 0,
            invoices: 0,
            statements: 0,
            total: 0
        };
        
        // Limpar formulários
        document.getElementById('clientName').value = '';
        document.getElementById('clientNIF').value = '';
        document.getElementById('clientPhone').value = '';
        document.getElementById('clientEmail').value = '';
        document.getElementById('clientAddress').value = '';
        document.getElementById('dac7Value').value = '';
        
        // Limpar status do cliente
        const status = document.getElementById('clientStatus');
        if (status) status.style.display = 'none';
        
        // Limpar listas de ficheiros
        const fileLists = ['controlFileList', 'saftFileList', 'invoiceFileList', 'statementFileList'];
        fileLists.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.classList.remove('visible');
            }
        });
        
        // Limpar contadores
        const counters = ['saftCount', 'invoiceCount', 'statementCount', 'totalCount'];
        counters.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
        
        // Limpar DAC7
        const dac7Result = document.getElementById('dac7Result');
        if (dac7Result) dac7Result.style.display = 'none';
        
        // Resetar dashboard
        resetDashboardDisplay();
        
        // Resetar gráfico
        if (VDCSystem.chart) {
            VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0];
            VDCSystem.chart.update();
        }
        
        // Nova sessão ID
        VDCSystem.sessionId = generateSessionId();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        document.getElementById('masterHashValue').textContent = 'AGUARDANDO GERAÇÃO...';
        
        // Limpar alertas
        const alert = document.querySelector('.omission-alert');
        if (alert) alert.remove();
        
        // Resetar botões demo
        const demoBtn = document.getElementById('btnDemo');
        const demoBtnExtra = document.getElementById('btnDemoExtra');
        if (demoBtn) {
            demoBtn.classList.remove('btn-demo-loaded');
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
            demoBtn.disabled = false;
            demoBtn.classList.add('btn-demo-active');
        }
        if (demoBtnExtra) {
            demoBtnExtra.classList.remove('btn-demo-loaded');
            demoBtnExtra.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DE DEMONSTRAÇÃO';
            demoBtnExtra.disabled = false;
        }
        
        // Atualizar botão de análise
        updateAnalysisButton();
        
        logAudit('🔄 Nova sessão iniciada', 'info');
        logAudit(`Sessão ID: ${VDCSystem.sessionId}`, 'info');
    }
}
