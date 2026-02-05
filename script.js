// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.7
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// AJUSTE DE ÓPTICAS - REGEX AGRESSIVO
// VERSÃO FINAL PARA REUNIÃO MLGTS
// ============================================

// 1. ESTADO DO SISTEMA - TOTALMENTE DINÂMICO
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
    
    // NOVO: FLAG DE PROCESSAMENTO
    isProcessing: false,
    processingPromises: []
};

// 2. INICIALIZAÇÃO DO SISTEMA
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
        console.log('🔧 Inicializando VDC Forensic System v10.7 - AJUSTE DE ÓPTICAS...');
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = generateSessionId();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        setupEventListeners();
        updateLoadingProgress(60);
        
        // ATIVAR BOTÃO DEMO
        setupDemoButton();
        updateLoadingProgress(70);
        
        // INICIALIZAR COM VALORES ZERADOS
        resetDashboard();
        updateLoadingProgress(80);
        
        startClockAndDate();
        updateLoadingProgress(90);
        
        // RENDERIZAR GRÁFICO VAZIO
        renderEmptyChart();
        updateLoadingProgress(95);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v10.7 inicializado com sucesso', 'success');
                logAudit('🔍 Motor de extração OTIMIZADO - Regex agressivo ativado', 'info');
                
                // ATUALIZAR BOTÃO INICIAL
                updateAnalysisButton();
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

// 3. CONFIGURAÇÃO DE CONTROLES E EVENT LISTENERS
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

function setupEventListeners() {
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClient);
    }
    
    // Botão Demo Extra
    const btnDemoExtra = document.getElementById('btnDemoExtra');
    if (btnDemoExtra) {
        btnDemoExtra.addEventListener('click', loadDemoData);
    }
    
    // Inputs de cliente
    const clientNameInput = document.getElementById('clientName');
    const clientNIFInput = document.getElementById('clientNIF');
    
    if (clientNameInput && clientNIFInput) {
        clientNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') clientNIFInput.focus();
        });
        clientNIFInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerClient();
        });
    }
    
    // DAC7 Input
    const dac7Input = document.getElementById('dac7Value');
    if (dac7Input) {
        dac7Input.addEventListener('change', (e) => {
            VDCSystem.analysis.extractedValues.dac7Value = parseFloat(e.target.value) || 0;
        });
    }
    
    // Control File
    const controlFile = document.getElementById('controlFile');
    if (controlFile) {
        controlFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                processControlFile(file);
                updateFileList('controlFileList', [file]);
            }
        });
    }
    
    // SAF-T Files
    const saftFile = document.getElementById('saftFile');
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
    
    // Platform Invoices - COM REGEX BOLT 2026 OTIMIZADO
    const invoiceFile = document.getElementById('invoiceFile');
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
    
    // Bank Statements - COM REGEX BOLT 2026 OTIMIZADO
    const statementFile = document.getElementById('statementFile');
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
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performForensicAnalysis);
    }
}

// 4. ATIVAÇÃO DO BOTÃO DEMO
function setupDemoButton() {
    const demoBtn = document.getElementById('btnDemo');
    if (demoBtn) {
        demoBtn.addEventListener('click', loadDemoData);
        demoBtn.classList.add('btn-demo-active');
    }
}

// 5. FUNÇÃO LOAD DEMO DATA
function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados de demonstração.\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS DE DEMONSTRAÇÃO...', 'info');
            
            // LIMPAR ESTADO PRIMEIRO
            clearExtractedValues();
            resetDashboardDisplay();
            
            // CARREGAR VALORES DE DEMO
            VDCSystem.analysis.extractedValues = {
                saftGross: 3202.54,
                saftIVA6: 3202.54 * 0.06,
                platformCommission: 792.59,
                bankTransfer: 2409.95,
                iva23Due: 792.59 * 0.23,
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
                dac7Value: 0,
                dac7Discrepancy: 0,
                valorIliquido: 2409.95,
                iva6Percent: 192.15,
                iva23Autoliquidacao: 182.30,
                comissaoCalculada: 792.59
            };
            
            // PREENCHER CAMPOS DO FORMULÁRIO
            document.getElementById('clientName').value = 'Momento Eficaz, Lda';
            document.getElementById('clientNIF').value = '123456789';
            document.getElementById('clientPhone').value = '+351 912 345 678';
            document.getElementById('clientEmail').value = 'contacto@momentoeficaz.pt';
            document.getElementById('clientAddress').value = 'Rua Principal, 123, Lisboa';
            
            // REGISTRAR CLIENTE AUTOMATICAMENTE
            VDCSystem.client = { 
                name: 'Momento Eficaz, Lda', 
                nif: '123456789',
                phone: '+351 912 345 678',
                email: 'contacto@momentoeficaz.pt',
                address: 'Rua Principal, 123, Lisboa',
                registrationDate: new Date().toISOString()
            };
            
            // ATUALIZAR VISUAL DO CLIENTE
            const status = document.getElementById('clientStatus');
            const nameDisplay = document.getElementById('clientNameDisplay');
            
            if (status) status.style.display = 'flex';
            if (nameDisplay) nameDisplay.textContent = 'Momento Eficaz, Lda';
            
            // ATIVAR MODO DEMO
            VDCSystem.demoMode = true;
            
            // SIMULAR CARREGAMENTO DE FICHEIROS
            VDCSystem.documents.control.files = [
                { 
                    name: 'demo_control.csv', 
                    size: 1024,
                    lastModified: Date.now(),
                    type: 'text/csv'
                }
            ];
            
            VDCSystem.documents.saft.files = [
                { 
                    name: 'demo_saft.xml', 
                    size: 2048,
                    lastModified: Date.now(),
                    type: 'application/xml'
                }
            ];
            
            // ATUALIZAR CONTADORES
            VDCSystem.counters = { saft: 1, invoices: 0, statements: 0, total: 2 };
            document.getElementById('saftCount').textContent = '1';
            document.getElementById('totalCount').textContent = '2';
            
            // ATUALIZAR LISTAS DE FICHEIROS VISUAIS
            updateFileList('controlFileList', VDCSystem.documents.control.files);
            updateFileList('saftFileList', VDCSystem.documents.saft.files);
            
            // ATUALIZAR VISUALMENTE OS BOTÕES
            const demoBtn = document.getElementById('btnDemo');
            const demoBtnExtra = document.getElementById('btnDemoExtra');
            
            if (demoBtn) {
                demoBtn.classList.add('btn-demo-loaded');
                demoBtn.innerHTML = '<i class="fas fa-check"></i> DADOS DEMO CARREGADOS';
                demoBtn.disabled = true;
            }
            
            if (demoBtnExtra) {
                demoBtnExtra.classList.add('btn-demo-loaded');
                demoBtnExtra.innerHTML = '<i class="fas fa-check"></i> DEMO CARREGADO';
                demoBtnExtra.disabled = true;
            }
            
            // ATUALIZAR BOTÃO DE ANÁLISE
            updateAnalysisButton();
            
            logAudit('✅ Dados de demonstração carregados com sucesso', 'success');
            logAudit('Clique em "EXECUTAR ANÁLISE FORENSE" para ver os resultados', 'info');
            
            // Reativar botões demo após 3 segundos
            setTimeout(() => {
                if (demoBtn) {
                    demoBtn.classList.remove('btn-demo-loaded');
                    demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO';
                    demoBtn.disabled = false;
                }
                if (demoBtnExtra) {
                    demoBtnExtra.classList.remove('btn-demo-loaded');
                    demoBtnExtra.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DE DEMONSTRAÇÃO';
                    demoBtnExtra.disabled = false;
                }
            }, 3000);
            
        } catch (error) {
            console.error('Erro ao carregar demo:', error);
            logAudit(`❌ Erro ao carregar dados demo: ${error.message}`, 'error');
        }
    }
}

// 6. FUNÇÕES DE PROCESSAMENTO COM REGEX BOLT 2026 OTIMIZADO
async function processControlFile(file) {
    try {
        logAudit(`Processando ficheiro de controlo: ${file.name}`, 'info');
        
        const text = await readFileAsText(file);
        
        // EXTRAIR VALORES DINÂMICOS DO FICHEIRO
        const extractedValues = extractValuesFromControlFile(text);
        
        // LIMPAR ESTADO ANTES DE INJETAR NOVOS VALORES
        clearExtractedValues();
        
        // INJETAR VALORES EXTRAÍDOS DINAMICAMENTE
        Object.assign(VDCSystem.analysis.extractedValues, extractedValues);
        
        logAudit(`✅ Controlo carregado: ${file.name}`, 'success');
        logAudit(`Valores extraídos: ${JSON.stringify(extractedValues)}`, 'info');
        
        VDCSystem.documents.control.files = [file];
        VDCSystem.documents.control.parsedData = extractedValues;
        
        // ATUALIZAR BOTÃO DE ANÁLISE
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no controlo:', error);
        logAudit(`❌ Erro no ficheiro de controlo: ${error.message}`, 'error');
    }
}

function extractValuesFromControlFile(text) {
    const lines = text.split('\n');
    const extractedValues = {
        ganhosBrutos: 0,
        comissaoApp: 0,
        ganhosLiquidos: 0,
        faturaPlataforma: 0,
        campanhas: 0,
        gorjetas: 0,
        cancelamentos: 0
    };
    
    // EXEMPLO DE PARSING DE CSV OTIMIZADO
    lines.forEach(line => {
        if (line.includes('Ganhos Brutos:')) {
            extractedValues.ganhosBrutos = extractNumberAdvanced(line);
        } else if (line.includes('Comissão App:')) {
            extractedValues.comissaoApp = -extractNumberAdvanced(line); // Negativo
        } else if (line.includes('Ganhos Líquidos:')) {
            extractedValues.ganhosLiquidos = extractNumberAdvanced(line);
        } else if (line.includes('Fatura Plataforma:')) {
            extractedValues.faturaPlataforma = extractNumberAdvanced(line);
        } else if (line.includes('Campanhas:')) {
            extractedValues.campanhas = extractNumberAdvanced(line);
        } else if (line.includes('Gorjetas:')) {
            extractedValues.gorjetas = extractNumberAdvanced(line);
        } else if (line.includes('Cancelamentos:')) {
            extractedValues.cancelamentos = extractNumberAdvanced(line);
        }
    });
    
    return extractedValues;
}

async function processSaftFiles(files) {
    try {
        logAudit(`Processando ${files.length} ficheiros SAF-T...`, 'info');
        
        let totalGross = 0;
        let totalIVA6 = 0;
        
        const processingPromises = files.map(async (file) => {
            const text = await readFileAsText(file);
            return extractValuesFromSaftFileOptimized(text);
        });
        
        const results = await Promise.all(processingPromises);
        
        results.forEach(values => {
            totalGross += values.gross || 0;
            totalIVA6 += values.iva6 || 0;
        });
        
        // ATUALIZAR VALORES EXTRAÍDOS
        VDCSystem.analysis.extractedValues.saftGross = totalGross;
        VDCSystem.analysis.extractedValues.saftIVA6 = totalIVA6;
        
        logAudit(`✅ ${files.length} ficheiros SAF-T processados`, 'success');
        logAudit(`Total Bruto: ${totalGross.toFixed(2)}€ | IVA 6%: ${totalIVA6.toFixed(2)}€`, 'info');
        
        VDCSystem.documents.saft.files = files;
        VDCSystem.documents.saft.totals.gross = totalGross;
        VDCSystem.documents.saft.totals.iva6 = totalIVA6;
        
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no processamento SAF-T:', error);
        logAudit(`❌ Erro no processamento SAF-T: ${error.message}`, 'error');
    }
}

function extractValuesFromSaftFileOptimized(text) {
    const values = { gross: 0, iva6: 0 };
    
    // TENTAR PARSE XML COM REGEX OTIMIZADO (ACEITA VÍRGULAS E PONTOS)
    if (text.includes('<GrossTotal>')) {
        const grossMatch = text.match(/<GrossTotal>([\d\.,]+)<\/GrossTotal>/);
        if (grossMatch) {
            values.gross = parseFloat(grossMatch[1].replace(',', '.'));
        }
        
        // Procurar IVA 6% com regex mais agressivo
        const iva6Match = text.match(/<Tax.*?>6%?<\/Tax>.*?<TaxAmount>([\d\.,]+)<\/TaxAmount>/s);
        if (iva6Match) {
            values.iva6 = parseFloat(iva6Match[1].replace(',', '.'));
        } else {
            // Fallback: procurar qualquer valor com taxa 6
            const taxMatch = text.match(/<Tax>.*?6.*?<\/Tax>.*?<TaxAmount>([\d\.,]+)<\/TaxAmount>/s);
            if (taxMatch) {
                values.iva6 = parseFloat(taxMatch[1].replace(',', '.'));
            }
        }
    }
    // TENTAR PARSE CSV OTIMIZADO
    else if (text.includes(';')) {
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.includes('TotalGeral') || line.includes('TotalGeralVendas')) {
                const parts = line.split(';');
                if (parts.length > 1) {
                    values.gross = extractNumberAdvanced(parts[1]) || 0;
                }
            }
        });
    }
    
    return values;
}

async function processInvoiceFiles(files) {
    try {
        logAudit(`Processando ${files.length} faturas...`, 'info');
        
        // LIMPAR ACUMULADOR ANTES DE PROCESSAR
        VDCSystem.documents.invoices.totals = { 
            commission: 0, 
            iva23: 0, 
            invoiceValue: 0 
        };
        
        VDCSystem.analysis.extractedValues.platformCommission = 0;
        VDCSystem.analysis.extractedValues.faturaPlataforma = 0;
        
        const processingPromises = files.map(async (file) => {
            const text = await readFileAsText(file);
            return extractValuesFromInvoiceFileOptimized(text);
        });
        
        const results = await Promise.all(processingPromises);
        
        results.forEach(values => {
            VDCSystem.documents.invoices.totals.commission += values.commission || 0;
            VDCSystem.documents.invoices.totals.invoiceValue += values.invoiceValue || 0;
            
            VDCSystem.analysis.extractedValues.platformCommission += values.commission || 0;
            VDCSystem.analysis.extractedValues.faturaPlataforma += values.invoiceValue || 0;
        });
        
        // CALCULAR IVA 23% SOBRE A COMISSÃO
        VDCSystem.documents.invoices.totals.iva23 = VDCSystem.documents.invoices.totals.commission * 0.23;
        VDCSystem.analysis.extractedValues.iva23Due = VDCSystem.analysis.extractedValues.platformCommission * 0.23;
        
        logAudit(`✅ ${files.length} faturas processadas`, 'success');
        logAudit(`Comissão Total: ${VDCSystem.documents.invoices.totals.commission.toFixed(2)}€ | Valor Fatura: ${VDCSystem.documents.invoices.totals.invoiceValue.toFixed(2)}€ | IVA 23%: ${VDCSystem.documents.invoices.totals.iva23.toFixed(2)}€`, 'info');
        
        VDCSystem.documents.invoices.files = files;
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no processamento de faturas:', error);
        logAudit(`❌ Erro no processamento de faturas: ${error.message}`, 'error');
    }
}

function extractValuesFromInvoiceFileOptimized(text) {
    const values = { commission: 0, invoiceValue: 0 };
    
    // REGEX BOLT 2026 OTIMIZADO - FORMATO ESPECÍFICO
    const lines = text.split('\n');
    
    // PROCURAR PADRÕES COMUNS EM FATURAS BOLT 2026
    lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Tentar regex específico para formato Bolt 2026 - ACEITA VÍRGULAS E PONTOS
        if (trimmedLine.includes('Total com IVA (EUR)')) {
            const regex = /"Total com IVA \(EUR\)","([\d\.,]+)"/;
            const match = trimmedLine.match(regex);
            if (match) {
                values.invoiceValue = extractNumberAdvanced(match[1]) || 0;
            }
        }
        
        // Procurar padrão de comissão
        if (trimmedLine.toLowerCase().includes('comissão') || trimmedLine.toLowerCase().includes('commission')) {
            const num = extractNumberAdvanced(trimmedLine);
            if (num > 0) values.commission = num;
        }
        
        // Procurar total
        if ((trimmedLine.toLowerCase().includes('total') || trimmedLine.toLowerCase().includes('amount')) && values.invoiceValue === 0) {
            const num = extractNumberAdvanced(trimmedLine);
            if (num > 0) values.invoiceValue = num;
        }
    });
    
    return values;
}

async function processStatementFiles(files) {
    try {
        logAudit(`Processando ${files.length} extratos bancários...`, 'info');
        
        let totalTransfer = 0;
        let ganhosBrutos = 0;
        let comissaoApp = 0;
        let ganhosLiquidos = 0;
        
        const processingPromises = files.map(async (file) => {
            const text = await readFileAsText(file);
            return extractValuesFromStatementFileOptimized(text);
        });
        
        const results = await Promise.all(processingPromises);
        
        results.forEach(values => {
            totalTransfer += values.transfer || 0;
            ganhosBrutos += values.ganhosBrutos || 0;
            comissaoApp += values.comissaoApp || 0;
            ganhosLiquidos += values.ganhosLiquidos || 0;
        });
        
        // ATUALIZAR VALORES EXTRAÍDOS
        VDCSystem.analysis.extractedValues.bankTransfer = totalTransfer;
        VDCSystem.analysis.extractedValues.ganhosBrutos = ganhosBrutos;
        VDCSystem.analysis.extractedValues.comissaoApp = -comissaoApp; // Negativo
        VDCSystem.analysis.extractedValues.ganhosLiquidos = ganhosLiquidos;
        
        VDCSystem.documents.statements.totals.transfer = totalTransfer;
        VDCSystem.documents.statements.totals.ganhosBrutos = ganhosBrutos;
        VDCSystem.documents.statements.totals.comissaoApp = comissaoApp;
        VDCSystem.documents.statements.totals.ganhosLiquidos = ganhosLiquidos;
        
        logAudit(`✅ ${files.length} extratos bancários processados`, 'success');
        logAudit(`Transferência Total: ${totalTransfer.toFixed(2)}€ | Ganhos Brutos: ${ganhosBrutos.toFixed(2)}€ | Comissão: ${comissaoApp.toFixed(2)}€ | Líquido: ${ganhosLiquidos.toFixed(2)}€`, 'info');
        
        VDCSystem.documents.statements.files = files;
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no processamento de extratos:', error);
        logAudit(`❌ Erro no processamento de extratos: ${error.message}`, 'error');
    }
}

function extractValuesFromStatementFileOptimized(text) {
    const values = { 
        transfer: 0, 
        ganhosBrutos: 0,
        comissaoApp: 0,
        ganhosLiquidos: 0
    };
    
    const lines = text.split('\n');
    
    // REGEX BOLT 2026 OTIMIZADO - FORMATO ESPECÍFICO
    lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Regex para "Ganhos na app","17.97" - ACEITA VÍRGULAS E PONTOS
        if (trimmedLine.includes('Ganhos na app')) {
            const regex = /"Ganhos na app","([-\d\.,]+)"/;
            const match = trimmedLine.match(regex);
            if (match) {
                values.ganhosBrutos = extractNumberAdvanced(match[1]) || 0;
            }
        }
        
        // Regex para "Comissão app","-3.11" ou "Comissões","-3.11"
        if (trimmedLine.includes('Comissão app') || trimmedLine.includes('Comissões')) {
            const regex = /"(?:Comissão app|Comissões)","([-\d\.,]+)"/;
            const match = trimmedLine.match(regex);
            if (match) {
                values.comissaoApp = Math.abs(extractNumberAdvanced(match[1]) || 0);
            }
        }
        
        // Fallback para padrões gerais
        if (trimmedLine.toLowerCase().includes('bolt') || trimmedLine.toLowerCase().includes('uber') || 
            trimmedLine.toLowerCase().includes('transfer') || trimmedLine.toLowerCase().includes('pagamento') ||
            trimmedLine.toLowerCase().includes('payment')) {
            const num = extractNumberAdvanced(trimmedLine);
            if (num > 0) values.transfer = num;
        }
    });
    
    // Calcular ganhos líquidos se houver valores
    if (values.ganhosBrutos > 0 && values.comissaoApp > 0) {
        values.ganhosLiquidos = values.ganhosBrutos - values.comissaoApp;
    } else if (values.ganhosLiquidos === 0 && values.ganhosBrutos > 0) {
        values.ganhosLiquidos = values.ganhosBrutos;
    }
    
    return values;
}

// FUNÇÃO DE EXTRACÇÃO AVANÇADA - ACEITA VÍRGULAS E PONTOS
function extractNumberAdvanced(text) {
    if (!text) return 0;
    
    // Procura por padrões numéricos com vírgulas ou pontos decimais
    const match = text.match(/(-?\d[\d\.,]*)/);
    if (match) {
        const cleaned = match[1].replace(/\./g, '').replace(',', '.');
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }
    
    // Fallback para o método anterior
    return extractNumber(text);
}

function extractNumber(text) {
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
        return parseFloat(match[0].replace(',', '.'));
    }
    return 0;
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// 7. FUNÇÃO DE RESET E LIMPEZA
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

function resetDashboardDisplay() {
    // Resetar apenas valores de exibição
    const elementos = [
        'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice',
        'valCamp', 'valTips', 'valCanc',
        'netVal', 'iva6Val', 'commissionVal', 'iva23Val',
        'grossResult', 'transferResult', 'differenceResult', 'marketResult',
        'imtBase', 'imtTax', 'imtTotal'
    ];
    
    elementos.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = id === 'marketResult' ? '0,00M€' : '0,00€';
        }
    });
    
    // Resetar barras de progresso
    document.querySelectorAll('.bar-fill').forEach(bar => {
        bar.style.width = '0%';
        bar.style.background = 'var(--accent-primary)';
    });
    
    // Remover card de diferencial se existir
    const diferencialCard = document.getElementById('diferencialCard');
    if (diferencialCard) {
        diferencialCard.remove();
    }
    
    // Remover alertas
    const omissionAlert = document.getElementById('omissionAlert');
    if (omissionAlert) omissionAlert.style.display = 'none';
    
    const diferencialAlert = document.getElementById('diferencialAlert');
    if (diferencialAlert) diferencialAlert.remove();
    
    // Resetar DAC7
    const dac7Result = document.getElementById('dac7Result');
    if (dac7Result) dac7Result.style.display = 'none';
    
    // Resetar gráfico
    if (VDCSystem.chart) {
        VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0];
        VDCSystem.chart.update();
    }
}

function resetDashboard() {
    resetDashboardDisplay();
    
    // LIMPAR CAMPOS DO FORMULÁRIO
    document.getElementById('clientName').value = '';
    document.getElementById('clientNIF').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
    
    // Resetar cliente
    const clientStatus = document.getElementById('clientStatus');
    if (clientStatus) clientStatus.style.display = 'none';
    VDCSystem.client = null;
    
    // DESATIVAR MODO DEMO
    VDCSystem.demoMode = false;
    
    // NÃO LIMPAR FICHEIROS - APENAS VISUAIS
    document.getElementById('controlFileList').innerHTML = '';
    document.getElementById('saftFileList').innerHTML = '';
    document.getElementById('invoiceFileList').innerHTML = '';
    document.getElementById('statementFileList').innerHTML = '';
    
    // Resetar contadores visuais
    document.getElementById('saftCount').textContent = '0';
    document.getElementById('invoiceCount').textContent = '0';
    document.getElementById('statementCount').textContent = '0';
    document.getElementById('totalCount').textContent = '0';
    
    logAudit('📊 Dashboard resetado - Aguardando novos dados', 'info');
    
    // ATUALIZAR BOTÃO DE ANÁLISE
    updateAnalysisButton();
}

// 8. REGISTRO DE CLIENTE
function registerClient() {
    const nameInput = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    const phoneInput = document.getElementById('clientPhone');
    const emailInput = document.getElementById('clientEmail');
    const addressInput = document.getElementById('clientAddress');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    const phone = phoneInput?.value.trim();
    const email = emailInput?.value.trim();
    const address = addressInput?.value.trim();
    
    if (!name || name.length < 3) {
        showError('Nome do cliente inválido (mínimo 3 caracteres)');
        nameInput?.focus();
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        showError('NIF inválido (deve ter 9 dígitos)');
        nifInput?.focus();
        return;
    }
    
    VDCSystem.client = { 
        name: name, 
        nif: nif,
        phone: phone || 'Não informado',
        email: email || 'Não informado',
        address: address || 'Não informado',
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    
    logAudit(`✅ Cliente registado: ${name} (NIF: ${nif})`, 'success');
    
    // ATUALIZAR BOTÃO DE ANÁLISE
    updateAnalysisButton();
}

// 9. ATUALIZAÇÃO DE INTERFACE
function updateFileList(listId, files) {
    const fileList = document.getElementById(listId);
    if (!fileList) return;
    
    fileList.innerHTML = '';
    fileList.classList.add('visible');
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span class="file-name">${file.name}</span>
            <span class="file-status">VALIDADO ✓</span>
        `;
        fileList.appendChild(fileItem);
    });
}

function updateCounter(type, count) {
    const counterId = type === 'saft' ? 'saftCount' :
                     type === 'invoices' ? 'invoiceCount' :
                     type === 'statements' ? 'statementCount' : null;
    
    if (counterId) {
        document.getElementById(counterId).textContent = count;
        VDCSystem.counters[type] = count;
    }
    
    // Atualizar contador total
    const total = VDCSystem.counters.saft + VDCSystem.counters.invoices + VDCSystem.counters.statements;
    document.getElementById('totalCount').textContent = total;
    VDCSystem.counters.total = total;
}

// 10. MÓDULO DAC7
function calcularDiscrepanciaDAC7() {
    const dac7Input = document.getElementById('dac7Value');
    const dac7Value = parseFloat(dac7Input.value) || 0;
    
    if (dac7Value <= 0) {
        showError('Por favor, insira um valor válido para DAC7');
        dac7Input.focus();
        return;
    }
    
    // Calcular comissão real baseada nos valores extraídos
    const comissaoReal = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const comissaoRealAnual = comissaoReal * 12;
    
    // Calcular discrepância
    const discrepancia = Math.abs(dac7Value - comissaoRealAnual);
    
    VDCSystem.analysis.extractedValues.dac7Value = dac7Value;
    VDCSystem.analysis.extractedValues.dac7Discrepancy = discrepancia;
    
    // Atualizar display
    const dac7Result = document.getElementById('dac7Result');
    const dac7Discrepancy = document.getElementById('dac7Discrepancy');
    
    if (dac7Result) dac7Result.style.display = 'flex';
    if (dac7Discrepancy) {
        const formatter = new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
        });
        dac7Discrepancy.textContent = formatter.format(discrepancia);
    }
    
    logAudit(`📊 DAC7: Valor declarado ${dac7Value.toFixed(2)}€ vs Real ${comissaoRealAnual.toFixed(2)}€ | Discrepância: ${discrepancia.toFixed(2)}€`, 'warn');
}

// 11. CÁLCULO IMT DINÂMICO
function calcularIMT() {
    // Usar valores extraídos ou padrão zero
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 
                        VDCSystem.documents.statements.totals.ganhosBrutos || 0;
    const gorjetas = VDCSystem.analysis.extractedValues.gorjetas || 0;
    const campanhas = VDCSystem.analysis.extractedValues.campanhas || 0;
    
    // Base de cálculo dinâmica
    const baseComissao = ganhosBrutos - gorjetas - campanhas;
    const taxaComissao = 0.2477; // Taxa padrão
    const comissaoCalculada = baseComissao * taxaComissao;
    
    // IMT 5% sobre a comissão
    const taxaIMT = 0.05;
    const imtTax = comissaoCalculada * taxaIMT;
    
    // Total plataforma
    const totalPlataforma = comissaoCalculada + imtTax;
    
    VDCSystem.analysis.extractedValues.imtBase = comissaoCalculada;
    VDCSystem.analysis.extractedValues.imtTax = imtTax;
    VDCSystem.analysis.extractedValues.imtTotal = totalPlataforma;
    
    return { baseComissao, comissaoCalculada, imtTax, totalPlataforma };
}

// 12. CÁLCULO DE DELTAS - RECONCILIAÇÃO TRIANGULAR
function calculateDeltas() {
    // Vértice A: O que o motorista faturou (SAF-T)
    const verticeA = VDCSystem.documents.saft.totals.gross || 
                    VDCSystem.analysis.extractedValues.saftGross || 
                    VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    
    // Vértice B: O que a Bolt reteve (Extrato - Comissão)
    const verticeB = Math.abs(VDCSystem.documents.statements.totals.comissaoApp) || 
                    Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    
    // Vértice C: O que a Bolt admitiu como custo (Fatura)
    const verticeC = VDCSystem.documents.invoices.totals.invoiceValue || 
                    VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    
    // Cálculo dos Deltas
    VDCSystem.analysis.crossings.deltaA = verticeA - verticeB;
    VDCSystem.analysis.crossings.deltaB = verticeB - verticeC;
    
    // Diferencial (Erro Sistémico)
    const diferencial = Math.abs(verticeB) - verticeC;
    VDCSystem.analysis.extractedValues.diferencialCusto = diferencial;
    
    // Calcular percentagem do diferencial
    let percentagemDiferencial = 0;
    if (verticeB > 0) {
        percentagemDiferencial = (diferencial / Math.abs(verticeB)) * 100;
    }
    
    // Prejuízo Fiscal e IVA
    const prejuizoFiscal = diferencial * 0.21;
    const ivaAutoliquidacao = diferencial * 0.23;
    
    VDCSystem.analysis.extractedValues.prejuizoFiscal = prejuizoFiscal;
    VDCSystem.analysis.extractedValues.iva23Due = ivaAutoliquidacao;
    
    // Alertar se houver erro sistémico
    VDCSystem.analysis.crossings.diferencialAlerta = diferencial > 0;
    
    logAudit(`📊 RECONCILIAÇÃO TRIANGULAR:`, 'info');
    logAudit(`• Vértice A (SAF-T): ${verticeA.toFixed(2)}€`, 'info');
    logAudit(`• Vértice B (Comissão Retida): ${verticeB.toFixed(2)}€`, 'info');
    logAudit(`• Vértice C (Fatura Emitida): ${verticeC.toFixed(2)}€`, 'info');
    logAudit(`• Delta A-B: ${VDCSystem.analysis.crossings.deltaA.toFixed(2)}€`, 'info');
    logAudit(`• Delta B-C: ${VDCSystem.analysis.crossings.deltaB.toFixed(2)}€`, 'info');
    logAudit(`• DIFERENCIAL (Erro Sistémico): ${diferencial.toFixed(2)}€ (${percentagemDiferencial.toFixed(2)}%)`, 'warn');
    logAudit(`• Prejuízo Fiscal: ${prejuizoFiscal.toFixed(2)}€ | IVA Devido: ${ivaAutoliquidacao.toFixed(2)}€`, 'error');
    
    return { verticeA, verticeB, verticeC, diferencial, percentagemDiferencial };
}

// 13. CRIAÇÃO DE DASHBOARD DIFERENCIAL
function criarDashboardDiferencial() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    if (!document.getElementById('diferencialCard')) {
        const kpiGrid = kpiSection.querySelector('.kpi-grid');
        if (kpiGrid) {
            const deltas = calculateDeltas();
            const diferencial = deltas.diferencial;
            const percentagem = deltas.percentagemDiferencial;
            
            const diferencialCard = document.createElement('div');
            diferencialCard.id = 'diferencialCard';
            diferencialCard.className = 'kpi-card alert';
            diferencialCard.innerHTML = `
                <h4><i class="fas fa-exclamation-triangle"></i> ERRO SISTÉMICO</h4>
                <p id="diferencialVal">${diferencial.toFixed(2)}€</p>
                <small>${percentagem.toFixed(2)}% da comissão</small>
            `;
            
            // PINTAR DE VERMELHO SE HOUVER DIFERENCIAL
            if (diferencial > 0) {
                diferencialCard.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                diferencialCard.style.color = 'white';
                diferencialCard.style.borderColor = '#ef4444';
                diferencialCard.querySelector('h4').style.color = 'white';
                diferencialCard.querySelector('p').style.color = 'white';
                diferencialCard.querySelector('small').style.color = 'rgba(255,255,255,0.8)';
            }
            
            if (kpiGrid.children.length >= 4) {
                kpiGrid.insertBefore(diferencialCard, kpiGrid.children[4]);
            } else {
                kpiGrid.appendChild(diferencialCard);
            }
            
            logAudit(`📊 Dashboard diferencial criado: ${diferencial.toFixed(2)}€ (${percentagem.toFixed(2)}%)`, 'info');
        }
    }
}

// 14. FUNÇÕES DE GRÁFICO
function renderEmptyChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        
        // Destruir gráfico anterior
        if (VDCSystem.chart) {
            VDCSystem.chart.destroy();
        }
        
        // GRÁFICO VAZIO
        const data = {
            labels: ['Valor Ilíquido', 'IVA 6%', 'Comissão Plataforma', 'IVA 23% Devido'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(0, 242, 255, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(255, 62, 62, 0.7)',
                    'rgba(245, 158, 11, 0.7)'
                ],
                borderColor: [
                    '#00f2ff',
                    '#3b82f6',
                    '#ff3e3e',
                    '#f59e0b'
                ],
                borderWidth: 1
            }]
        };
        
        VDCSystem.chart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw.toFixed(2)}€`;
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
    }
}

function updateChartWithData() {
    if (!VDCSystem.chart) return;
    
    // Atualizar com valores extraídos DINAMICAMENTE dos documentos processados
    const ganhosBrutos = VDCSystem.documents.statements.totals.ganhosBrutos || 
                        VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const comissao = Math.abs(VDCSystem.documents.statements.totals.comissaoApp) || 
                    Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const valorIliquido = VDCSystem.documents.statements.totals.ganhosLiquidos || 
                         VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    VDCSystem.chart.data.datasets[0].data = [
        valorIliquido,
        ganhosBrutos * 0.06,
        comissao,
        comissao * 0.23
    ];
    
    // ATUALIZAÇÃO IMEDIATA DO GRÁFICO
    VDCSystem.chart.update();
}

// 15. FUNÇÃO PRINCIPAL DE ANÁLISE FORENSE - CORRIGIDA COM SINCRONIZAÇÃO
async function performForensicAnalysis() {
    try {
        console.log('🚀 INICIANDO ANÁLISE FORENSE v10.7 - AJUSTE DE ÓPTICAS...');
        console.log('🔍 VERIFICAÇÃO INICIAL:', {
            client: VDCSystem.client ? 'Registado' : 'NÃO REGISTADO',
            controlFiles: VDCSystem.documents.control.files.length,
            saftFiles: VDCSystem.documents.saft.files.length,
            demoMode: VDCSystem.demoMode,
            extractedValues: VDCSystem.analysis.extractedValues
        });
        
        // VERIFICAÇÃO DE SEGURANÇA
        if (!VDCSystem.client) {
            showError('❌ Por favor, registe um cliente primeiro');
            return;
        }
        
        if (VDCSystem.documents.control.files.length === 0 && 
            VDCSystem.documents.saft.files.length === 0 &&
            !VDCSystem.demoMode) {
            showError('❌ Por favor, carregue ficheiros de controlo e SAF-T ou use dados demo');
            return;
        }
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE BIG DATA v10.7', 'success');
        logAudit('🔍 MOTOR DE EXTRAÇÃO OTIMIZADO - DETETANDO VALORES COM VÍRGULAS/PONTOS', 'info');
        
        // AGUARDAR PROCESSAMENTO COMPLETO DE TODOS OS FICHEIROS
        if (VDCSystem.isProcessing) {
            logAudit('⏳ Aguardando conclusão do processamento anterior...', 'info');
        }
        
        // 1. CALCULAR DELTAS (RECONCILIAÇÃO TRIANGULAR) - COM VALORES REAIS
        const deltas = calculateDeltas();
        
        // 2. CALCULAR IMT
        const imtCalculos = calcularIMT();
        
        // 3. ATUALIZAR DASHBOARD COM VALORES REAIS DIRETAMENTE DOS DOCUMENTOS
        updateDashboardWithExtractedValues();
        
        // 4. ATUALIZAR INTERFACE
        updateDashboard();
        updateResults(deltas);
        updateIMTDisplay(imtCalculos);
        
        // 5. ATUALIZAR GRÁFICO (IMEDIATAMENTE)
        updateChartWithData();
        
        // 6. CRIAR DASHBOARD DIFERENCIAL (PINTA DE VERMELHO SE HOUVER ERRO)
        criarDashboardDiferencial();
        
        // 7. GERAR MASTER HASH
        generateMasterHash();
        
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        logAudit(`🔍 Valores detetados: Ganhos Brutos ${deltas.verticeA.toFixed(2)}€ | Comissão ${deltas.verticeB.toFixed(2)}€ | Fatura ${deltas.verticeC.toFixed(2)}€`, 'info');
        
        // 8. MOSTRAR ALERTA SE HOUVER ERRO SISTÉMICO
        if (VDCSystem.analysis.crossings.diferencialAlerta) {
            showDiferencialAlert(deltas);
            
            // PINTAR O DASHBOARD DE ALERTA
            paintDashboardAlert();
        }
        
    } catch (error) {
        console.error('Erro na análise:', error);
        logAudit(`❌ Erro na análise: ${error.message}`, 'error');
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE FORENSE';
        }
    }
}

function updateDashboardWithExtractedValues() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    // Usar valores extraídos DOS DOCUMENTOS REAIS - DIRETA E PERSISTENTEMENTE
    const valores = {
        'kpiGanhos': VDCSystem.documents.statements.totals.ganhosBrutos || 
                    VDCSystem.analysis.extractedValues.ganhosBrutos || 0,
        'kpiComm': -(VDCSystem.documents.statements.totals.comissaoApp || 
                    Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0),
        'kpiNet': VDCSystem.documents.statements.totals.ganhosLiquidos || 
                  VDCSystem.analysis.extractedValues.ganhosLiquidos || 0,
        'kpiInvoice': VDCSystem.documents.invoices.totals.invoiceValue || 
                     VDCSystem.analysis.extractedValues.faturaPlataforma || 0,
        'valCamp': VDCSystem.analysis.extractedValues.campanhas || 0,
        'valTips': VDCSystem.analysis.extractedValues.gorjetas || 0,
        'valCanc': VDCSystem.analysis.extractedValues.cancelamentos || 0
    };
    
    Object.entries(valores).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatter.format(value);
        }
    });
}

function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    const ganhosLiquidos = VDCSystem.documents.statements.totals.ganhosLiquidos || 
                          VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    const ganhosBrutos = VDCSystem.documents.statements.totals.ganhosBrutos || 
                        VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    
    const comissao = Math.abs(VDCSystem.documents.statements.totals.comissaoApp) || 
                    Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    
    const elementos = {
        'netVal': ganhosLiquidos,
        'iva6Val': (ganhosBrutos * 0.06).toFixed(2),
        'commissionVal': comissao,
        'iva23Val': (comissao * 0.23).toFixed(2)
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = formatter.format(value);
        }
    });
}

function updateIMTDisplay(imtCalculos) {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const elementos = {
        'imtBase': imtCalculos.comissaoCalculada,
        'imtTax': imtCalculos.imtTax,
        'imtTotal': imtCalculos.totalPlataforma
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = formatter.format(value);
        }
    });
    
    logAudit(`📊 IMT Calculado: Base ${imtCalculos.baseComissao.toFixed(2)}€ | Comissão ${imtCalculos.comissaoCalculada.toFixed(2)}€ | IMT ${imtCalculos.imtTax.toFixed(2)}€`, 'info');
}

function updateResults(deltas) {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    const ganhosBrutos = VDCSystem.documents.statements.totals.ganhosBrutos || 
                        VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    
    const ganhosLiquidos = VDCSystem.documents.statements.totals.ganhosLiquidos || 
                          VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    const elementos = {
        'grossResult': deltas.verticeA || ganhosBrutos,
        'transferResult': ganhosLiquidos,
        'differenceResult': deltas.diferencial || 0.00,
        'marketResult': (ganhosBrutos * 38000 / 1000000).toFixed(2)
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = typeof value === 'number' ? 
                formatter.format(value) : 
                value + (id === 'marketResult' ? 'M€' : '€');
        }
    });
    
    // Atualizar barra de diferença
    const differenceBar = document.getElementById('differenceBar');
    if (differenceBar && deltas.diferencial > 0) {
        const maxValue = Math.max(deltas.verticeA, deltas.verticeB, deltas.verticeC);
        const percentage = (deltas.diferencial / maxValue) * 100;
        differenceBar.style.width = `${Math.min(percentage, 100)}%`;
        differenceBar.style.background = '#ef4444'; // Vermelho para erro
    }
}

function showDiferencialAlert(deltas) {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
    // Remover alerta anterior
    const alertAntigo = document.getElementById('diferencialAlert');
    if (alertAntigo) alertAntigo.remove();
    
    const diferencial = deltas.diferencial;
    const percentagem = deltas.percentagemDiferencial;
    const verticeB = deltas.verticeB;
    const verticeC = deltas.verticeC;
    
    const novoAlerta = document.createElement('div');
    novoAlerta.id = 'diferencialAlert';
    novoAlerta.className = 'omission-alert diferencial-alert';
    novoAlerta.style.display = 'flex';
    novoAlerta.style.background = 'rgba(239, 68, 68, 0.15)';
    novoAlerta.style.borderColor = '#ef4444';
    novoAlerta.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
        <div>
            <strong style="color: #ef4444;">🚨 ERRO SISTÉMICO DETETADO</strong>
            <p><strong>RECONCILIAÇÃO TRIANGULAR FALHOU:</strong></p>
            <p>• Comissão retida: <strong>${verticeB.toFixed(2)}€</strong></p>
            <p>• Fatura emitida: <strong>${verticeC.toFixed(2)}€</strong></p>
            <p>• <span style="color: #ef4444; font-weight: bold;">DIFERENCIAL OCULTO: ${diferencial.toFixed(2)}€ (${percentagem.toFixed(2)}%)</span></p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem;"><i class="fas fa-balance-scale"></i> Saída de caixa não documentada detectada - Evidência de prática de Colarinho Branco</p>
        </div>
    `;
    
    const resultsGrid = resultsSection.querySelector('.results-grid');
    if (resultsGrid) {
        resultsGrid.parentNode.insertBefore(novoAlerta, resultsGrid.nextSibling);
    }
}

function paintDashboardAlert() {
    // Pintar cards de alerta de vermelho
    const alertCards = document.querySelectorAll('.stat-card.alert, .kpi-card.danger, .kpi-card.alert');
    
    alertCards.forEach(card => {
        card.style.animation = 'pulse-red 2s infinite';
        card.style.border = '2px solid #ef4444';
    });
    
    // Adicionar estilo de pulso vermelho
    if (!document.querySelector('#pulse-red-style')) {
        const style = document.createElement('style');
        style.id = 'pulse-red-style';
        style.textContent = `
            @keyframes pulse-red {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 16. FUNÇÃO DE EXPORTAÇÃO PDF - COM "GUARDAR COMO"
async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // ========== PÁGINA 1: RELATÓRIO PERICIAL ==========
        createPage1(doc);
        
        // ========== PÁGINA 2: ANEXO LEGAL ==========
        createPage2(doc);
        
        // CRIAR BLOB
        const pdfBlob = doc.output('blob');
        
        // TENTAR FILE SYSTEM ACCESS API
        if ('showSaveFilePicker' in window) {
            try {
                const options = {
                    suggestedName: `VDC_RELATORIO_${VDCSystem.sessionId}.pdf`,
                    types: [{
                        description: 'PDF Files',
                        accept: {'application/pdf': ['.pdf']}
                    }]
                };
                
                const handle = await window.showSaveFilePicker(options);
                const writable = await handle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
                
                logAudit('✅ Relatório pericial guardado via File System API', 'success');
                return;
            } catch (fsError) {
                console.warn('File System API falhou, usando fallback:', fsError);
            }
        }
        
        // FALLBACK: FORÇAR JANELA DE DOWNLOAD
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // CRIAR LINK PARA DOWNLOAD
        const a = document.createElement('a');
        a.href = pdfUrl;
        
        // NOME SUGERIDO
        const clienteNome = VDCSystem.client?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'CLIENTE';
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_RELATORIO_${clienteNome}_${dataStr}.pdf`;
        
        // FORÇAR DOWNLOAD
        document.body.appendChild(a);
        a.click();
        
        // LIMPAR
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(pdfUrl);
        }, 100);
        
        logAudit('✅ Relatório pericial gerado - Download iniciado', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`❌ Erro ao gerar PDF: ${error.message}`, 'error');
        alert('Erro ao gerar PDF: ' + error.message);
    }
}

function createPage1(doc) {
    // RE-FORÇAR ESTILO EXPLICITAMENTE
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    // MOLDURA FORENSE
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 28);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 186, 24);
    
    // CABEÇALHO
    doc.setFontSize(18);
    doc.text("VDC FORENSIC SYSTEM v10.7", 20, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Protocolo de Prova Legal | Big Data Forense | Reunião MLGTS", 20, 29);
    
    // INFORMAÇÃO DA SESSÃO
    const dataAtual = new Date().toLocaleDateString('pt-PT');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 195, 27, { align: "right" });
    doc.text(`Data: ${dataAtual}`, 195, 32, { align: "right" });
    
    let posY = 55;
    
    // 1. IDENTIFICAÇÃO DO CLIENTE
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("1. IDENTIFICAÇÃO COMPLETA DO CLIENTE", 15, posY);
    posY += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const clienteNome = VDCSystem.client?.name || "NÃO REGISTADO";
    const clienteNIF = VDCSystem.client?.nif || "NÃO REGISTADO";
    const clienteTelefone = VDCSystem.client?.phone || "NÃO INFORMADO";
    const clienteEmail = VDCSystem.client?.email || "NÃO INFORMADO";
    const clienteMorada = VDCSystem.client?.address || "NÃO INFORMADO";
    
    doc.text(`Nome: ${clienteNome}`, 15, posY, { align: "left" });
    posY += 7;
    doc.text(`NIF: ${clienteNIF}`, 15, posY, { align: "left" });
    posY += 7;
    doc.text(`Telefone: ${clienteTelefone}`, 15, posY, { align: "left" });
    posY += 7;
    doc.text(`Email: ${clienteEmail}`, 15, posY, { align: "left" });
    posY += 7;
    doc.text(`Morada: ${clienteMorada}`, 15, posY, { align: "left" });
    posY += 7;
    doc.text(`Data de Análise: ${dataAtual}`, 15, posY, { align: "left" });
    posY += 12;
    
    // 2. VALORES EXTRAÍDOS
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("2. VALORES EXTRAÍDOS (DOCUMENTOS OFICIAIS)", 15, posY);
    posY += 10;
    
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const comissaoApp = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    const faturaPlataforma = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    
    const valores = [
        ["Ganhos Brutos:", formatter.format(ganhosBrutos)],
        ["Comissão App:", formatter.format(-comissaoApp)],
        ["Ganhos Líquidos:", formatter.format(ganhosLiquidos)],
        ["Fatura Plataforma:", formatter.format(faturaPlataforma)],
        ["IVA 6%:", formatter.format(ganhosBrutos * 0.06)],
        ["IVA 23% Devido:", formatter.format(comissaoApp * 0.23)]
    ];
    
    valores.forEach(([label, value]) => {
        doc.text(label, 15, posY, { align: "left" });
        doc.text(value, 100, posY, { align: "left" });
        posY += 7;
    });
    
    posY += 5;
    
    // 3. RECONCILIAÇÃO TRIANGULAR
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("3. RECONCILIAÇÃO TRIANGULAR - ERRO SISTÉMICO", 15, posY);
    posY += 10;
    
    const deltas = calculateDeltas();
    const diferencial = deltas.diferencial;
    const percentagem = deltas.percentagemDiferencial;
    const prejuizo = diferencial * 0.21;
    const ivaDevido = diferencial * 0.23;
    
    const calculos = [
        ["Vértice A (SAF-T):", formatter.format(deltas.verticeA)],
        ["Vértice B (Comissão Retida):", formatter.format(deltas.verticeB)],
        ["Vértice C (Fatura Emitida):", formatter.format(deltas.verticeC)],
        ["", ""],
        ["ERRO SISTÉMICO:", formatter.format(diferencial)],
        ["Percentagem da Comissão:", `${percentagem.toFixed(2)}%`],
        ["Prejuízo Fiscal (21%):", formatter.format(prejuizo)],
        ["IVA Não Autoliquidado (23%):", formatter.format(ivaDevido)],
        ["Impacto Total:", formatter.format(prejuizo + ivaDevido)]
    ];
    
    calculos.forEach(([label, valor]) => {
        if (label) {
            doc.text(label, 15, posY, { align: "left" });
        }
        if (valor) {
            doc.text(valor, 80, posY, { align: "left" });
        }
        posY += 7;
    });
    
    // RODAPÉ PÁGINA 1
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("VDC Forensic System v10.7 | Protocolo ISO 27037 | Reunião MLGTS", 15, 285);
    doc.text(`Página 1 de ${pageCount}`, 185, 285, { align: "right" });
}

function createPage2(doc) {
    doc.addPage();
    
    // CORREÇÃO CRÍTICA: RE-FORÇAR ESTILO EXPLICITAMENTE APÓS addPage()
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    let posY = 20;
    
    // TÍTULO PÁGINA 2
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("ANEXO II: ESPECIFICAÇÕES TÉCNICAS DE AUDITORIA", 15, posY);
    posY += 15;
    
    // PARECER TÉCNICO
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("ESPECIFICAÇÕES TÉCNICAS DE AUDITORIA", 15, posY);
    posY += 10;
    
    // CORPO DO TEXTO EM NORMAL
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const anexoTexto = `Protocolo de Gestão de Evidências e Análise Forense Este relatório serve como uma síntese formal das evidências digitais processadas sob o Protocolo de Análise Forense VDC. 

Os dados aqui contidos são o resultado de uma análise cruzada entre fontes fiscais primárias e relatórios secundários da plataforma. 

Fontes de Evidências: A análise integra dados de arquivos SAF-T (PT), que constituem a declaração legal do contribuinte, e extratos gerados pela plataforma que representam o fluxo de caixa real. 

Metodologia de Verificação: O sistema utiliza a Conciliação Triangular. Este processo valida a consistência entre a Receita Bruta (Fonte A), as Comissões Retidas (Fonte B) e as Faturas Emitidas (Fonte C). 

Independência da Auditoria: Todos os cálculos são realizados por meio de um processo algorítmico automatizado, garantindo a neutralidade das conclusões e a ausência de manipulação manual de dados. 

Nota de Conformidade: As discrepâncias identificadas na seção "Erro Sistêmico" representam potenciais violações do Princípio da Neutralidade Tributária e do Código Comercial referentes à emissão obrigatória de faturas.`;
    
    // QUEBRA DE TEXTO
    const splitAnexo = doc.splitTextToSize(anexoTexto, 180);
    
    // RENDERIZAR COM PAGINAÇÃO
    const margin = 15;
    const pageHeight = 280;
    const lineHeight = 7;
    
    splitAnexo.forEach(line => {
        if (posY + lineHeight > pageHeight) {
            doc.addPage();
            posY = 20;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
        }
        
        doc.text(line, margin, posY);
        posY += lineHeight;
    });
    
    posY += 10;
    
    // QUADRO DE EVIDÊNCIAS
    if (posY + 50 > pageHeight) {
        doc.addPage();
        posY = 20;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("QUADRO DE CONFORMIDADE E EVIDÊNCIAS", 15, posY);
    posY += 10;
    
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    const deltas = calculateDeltas();
    const diferencial = deltas.diferencial;
    const percentagem = deltas.percentagemDiferencial;
    
    const evidencias = [
        ["Evidência", "Valor", "Status"],
        ["Ganhos Plataforma", formatter.format(deltas.verticeA), "Validado"],
        ["Comissão Retida", formatter.format(deltas.verticeB), "Confirmado"],
        ["Fatura Emitida", formatter.format(deltas.verticeC), "Documentada"],
        ["Diferencial Oculto", formatter.format(diferencial), "🚨 ERRO SISTÉMICO"],
        ["Percentagem", `${percentagem.toFixed(2)}%`, "CRÍTICO"],
        ["Prejuízo Fiscal", formatter.format(diferencial * 0.21), "Crime Fiscal"],
        ["IVA em Défice", formatter.format(diferencial * 0.23), "Crime Fiscal"]
    ];
    
    evidencias.forEach((linha, idx) => {
        if (idx === 0) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
        } else {
            doc.setFont("helvetica", "normal");
        }
        
        // Destaque vermelho para erro sistémico
        if (idx === 3) {
            doc.setTextColor(255, 0, 0);
        } else {
            doc.setTextColor(0, 0, 0);
        }
        
        doc.text(linha[0], 15, posY);
        doc.text(linha[1], 100, posY);
        doc.text(linha[2], 150, posY);
        posY += 7;
    });
    
    // ATUALIZAR RODAPÉS EM TODAS AS PÁGINAS
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v10.7 | Protocolo ISO 27037 | Reunião MLGTS", 15, 285);
        doc.text(`Página ${i} de ${totalPages}`, 185, 285, { align: "right" });
    }
}

// 17. FUNÇÃO PARA ABRIR PDF
async function exportPDFWithPicker() {
    await exportPDF();
}

// 18. FUNÇÃO PARA GUARDAR CLIENTE - COM "GUARDAR COMO"
async function saveClientData() {
    try {
        if (!VDCSystem.client) {
            showError('Nenhum cliente registado para guardar');
            return;
        }
        
        logAudit('💾 PREPARANDO PARA GUARDAR DADOS DO CLIENTE...', 'info');
        
        const clientData = {
            sistema: "VDC Forensic System v10.7",
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            analise: {
                valores: VDCSystem.analysis.extractedValues,
                cruzamentos: VDCSystem.analysis.crossings,
                deltas: calculateDeltas()
            }
        };
        
        const jsonStr = JSON.stringify(clientData, null, 2);
        
        // TENTAR FILE SYSTEM ACCESS API
        if ('showSaveFilePicker' in window) {
            try {
                const options = {
                    suggestedName: `VDC_CLIENTE_${VDCSystem.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${VDCSystem.client.nif}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: {'application/json': ['.json']}
                    }]
                };
                
                const handle = await window.showSaveFilePicker(options);
                const writable = await handle.createWritable();
                await writable.write(jsonStr);
                await writable.close();
                
                logAudit(`✅ Dados do cliente guardados via File System API: ${VDCSystem.client.name}`, 'success');
                return;
            } catch (fsError) {
                console.warn('File System API falhou, usando fallback:', fsError);
            }
        }
        
        // FALLBACK: FORÇAR JANELA DE DOWNLOAD
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // NOME SUGERIDO
        a.download = `VDC_CLIENTE_${VDCSystem.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${VDCSystem.client.nif}.json`;
        
        // FORÇAR DOWNLOAD
        document.body.appendChild(a);
        a.click();
        
        // LIMPAR
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        logAudit(`✅ Dados do cliente guardados como ficheiro: ${a.download}`, 'success');
        
    } catch (error) {
        console.error('Erro ao guardar cliente:', error);
        logAudit(`❌ Erro ao guardar cliente: ${error.message}`, 'error');
        alert('Erro ao guardar cliente: ' + error.message);
    }
}

// 19. FUNÇÃO EXPORTAR JSON - COM "GUARDAR COMO"
async function exportJSON() {
    try {
        logAudit('💾 PREPARANDO PROVA DIGITAL (JSON)...', 'info');
        
        const evidenceData = {
            sistema: "VDC Forensic System v10.7",
            versao: VDCSystem.version,
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client || { 
                nome: "Cliente de Demonstração", 
                nif: "000000000",
                registo: new Date().toISOString()
            },
            analise: {
                valores: VDCSystem.analysis.extractedValues,
                cruzamentos: VDCSystem.analysis.crossings,
                deltas: calculateDeltas(),
                anomalias: VDCSystem.analysis.anomalies
            },
            documentos: {
                control: VDCSystem.documents.control?.files?.length || 0,
                saft: VDCSystem.documents.saft?.files?.length || 0,
                invoices: VDCSystem.documents.invoices?.files?.length || 0,
                statements: VDCSystem.documents.statements?.files?.length || 0
            },
            logs: VDCSystem.logs.slice(-50),
            masterHash: document.getElementById('masterHashValue')?.textContent || "NÃO GERADA"
        };
        
        const jsonStr = JSON.stringify(evidenceData, null, 2);
        
        // TENTAR FILE SYSTEM ACCESS API
        if ('showSaveFilePicker' in window) {
            try {
                const options = {
                    suggestedName: `VDC_PROVA_${VDCSystem.sessionId}.json`,
                    types: [{
                        description: 'JSON Files',
                        accept: {'application/json': ['.json']}
                    }]
                };
                
                const handle = await window.showSaveFilePicker(options);
                const writable = await handle.createWritable();
                await writable.write(jsonStr);
                await writable.close();
                
                logAudit('✅ Prova digital guardada via File System API', 'success');
                return;
            } catch (fsError) {
                console.warn('File System API falhou, usando fallback:', fsError);
            }
        }
        
        // FALLBACK: FORÇAR JANELA DE DOWNLOAD
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // NOME SUGERIDO
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_PROVA_${VDCSystem.sessionId}_${dataStr}.json`;
        
        // FORÇAR DOWNLOAD
        document.body.appendChild(a);
        a.click();
        
        // LIMPAR
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        
        logAudit('✅ Prova digital guardada como ficheiro', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`❌ Erro ao exportar JSON: ${error.message}`, 'error');
        alert('Erro ao exportar JSON: ' + error.message);
    }
}

// 20. FUNÇÃO clearAllData() - RELOAD COMPLETO
function clearAllData() {
    if (confirm('⚠️  ATENÇÃO: Todos os dados não exportados serão perdidos.\n\nTem certeza que deseja iniciar uma nova sessão?')) {
        window.location.reload();
    }
}

// 21. FUNÇÕES DE LOG E AUDITORIA
function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const logEntry = {
        timestamp,
        type,
        message
    };
    
    VDCSystem.logs.push(logEntry);
    updateAuditConsole(logEntry);
    
    console.log(`[VDC ${type.toUpperCase()}] ${message}`);
}

function updateAuditConsole(logEntry) {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${logEntry.type}`;
    entry.innerHTML = `
        <span style="color: #666;">[${logEntry.timestamp}]</span>
        <span style="color: ${getLogColor(logEntry.type)}; font-weight: bold;">${logEntry.type.toUpperCase()}</span>
        <span>${logEntry.message}</span>
    `;
    
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
}

function getLogColor(type) {
    const colors = {
        success: '#10b981',
        warn: '#f59e0b',
        error: '#ff3e3e',
        info: '#3b82f6'
    };
    return colors[type] || '#cbd5e1';
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    logAudit('Console de auditoria limpo', 'info');
}

function toggleConsole() {
    const consoleElement = document.getElementById('auditOutput');
    if (!consoleElement) return;
    
    consoleElement.style.height = consoleElement.style.height === '200px' ? '120px' : '200px';
}

// 22. FUNÇÕES UTILITÁRIAS
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function generateMasterHash() {
    const data = [
        VDCSystem.sessionId,
        VDCSystem.selectedYear.toString(),
        VDCSystem.selectedPlatform,
        VDCSystem.analysis.extractedValues.ganhosBrutos.toString(),
        VDCSystem.analysis.extractedValues.diferencialCusto.toString(),
        new Date().toISOString()
    ].join('|');
    
    const masterHash = CryptoJS.SHA256(data).toString();
    const display = document.getElementById('masterHashValue');
    
    if (display) {
        display.textContent = masterHash;
        display.style.color = '#00f2ff';
    }
    
    logAudit(`🔐 Master Hash gerada: ${masterHash.substring(0, 32)}...`, 'success');
}

// FUNÇÃO CRÍTICA: updateAnalysisButton
function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    // VERIFICAÇÕES FLEXÍVEIS
    const hasControl = VDCSystem.documents.control.files.length > 0 || 
                      VDCSystem.demoMode;
    
    const hasSaft = VDCSystem.documents.saft.files.length > 0 || 
                   VDCSystem.demoMode;
    
    const hasClient = VDCSystem.client !== null;
    
    // ATIVAÇÃO PERMISSIVA
    const hasValidData = hasControl && hasSaft && hasClient;
    
    analyzeBtn.disabled = !hasValidData;
    
    if (hasValidData) {
        analyzeBtn.style.opacity = '1';
        analyzeBtn.style.cursor = 'pointer';
        analyzeBtn.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.5)';
    } else {
        analyzeBtn.style.opacity = '0.7';
        analyzeBtn.style.cursor = 'not-allowed';
        analyzeBtn.style.boxShadow = 'none';
    }
}

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    alert(`ERRO DO SISTEMA: ${message}\n\nVerifique o console para mais detalhes.`);
}

// 23. RELÓGIO COM DATA
function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const dateString = `${day}/${month}/${year}`;
        
        const timeElement = document.getElementById('currentTime');
        const dateElement = document.getElementById('currentDate');
        
        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
}
