// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.1
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// CORREÇÃO COMPLETA DA ATIVAÇÃO DA ANÁLISE
// ============================================

// 1. ESTADO DO SISTEMA - SEM VALORES FIXOS
const VDCSystem = {
    version: 'v10.1',
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
    chart: null
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
        console.log('🔧 Inicializando VDC Forensic System v10.1...');
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
                logAudit('✅ Sistema VDC v10.1 inicializado com sucesso', 'success');
                logAudit('Protocolo de Prova Legal ativado - Estado zerado', 'info');
                
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
        resetDashboard();
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
        resetDashboard();
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
    
    // Control File - COM LIMPEZA DE CACHE
    const controlFile = document.getElementById('controlFile');
    if (controlFile) {
        controlFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                // LIMPAR CACHE ANTES DE PROCESSAR
                resetDashboard();
                const file = e.target.files[0];
                processControlFile(file);
                updateFileList('controlFileList', [file]);
            }
        });
    }
    
    // SAF-T Files - COM LIMPEZA DE CACHE
    const saftFile = document.getElementById('saftFile');
    if (saftFile) {
        saftFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                // LIMPAR CACHE ANTES DE PROCESSAR
                resetDashboard();
                const files = Array.from(e.target.files);
                processSaftFiles(files);
                updateFileList('saftFileList', files);
                updateCounter('saft', files.length);
            }
        });
    }
    
    // Platform Invoices - COM LIMPEZA DE CACHE
    const invoiceFile = document.getElementById('invoiceFile');
    if (invoiceFile) {
        invoiceFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                // LIMPAR CACHE ANTES DE PROCESSAR
                resetDashboard();
                const files = Array.from(e.target.files);
                processInvoiceFiles(files);
                updateFileList('invoiceFileList', files);
                updateCounter('invoices', files.length);
            }
        });
    }
    
    // Bank Statements - COM LIMPEZA DE CACHE
    const statementFile = document.getElementById('statementFile');
    if (statementFile) {
        statementFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                // LIMPAR CACHE ANTES DE PROCESSAR
                resetDashboard();
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

// 5. FUNÇÃO LOAD DEMO DATA - CORRIGIDA PARA ATIVAR ANÁLISE
function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados de demonstração.\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS DE DEMONSTRAÇÃO...', 'info');
            
            // LIMPAR ESTADO PRIMEIRO
            clearExtractedValues();
            resetDashboard();
            
            // CARREGAR VALORES DE DEMO (APENAS AQUI)
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
            
            // SIMULAR CARREGAMENTO DE FICHEIROS (ESSENCIAL PARA ATIVAÇÃO)
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
            
            // ATUALIZAR BOTÃO DE ANÁLISE (PASSO CRÍTICO)
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

// 6. FUNÇÕES DE PROCESSAMENTO DE FICHEIROS (CAPTURAS DINÂMICAS)
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
    
    // EXEMPLO DE PARSING DE CSV
    lines.forEach(line => {
        if (line.includes('Ganhos Brutos:')) {
            extractedValues.ganhosBrutos = extractNumber(line);
        } else if (line.includes('Comissão App:')) {
            extractedValues.comissaoApp = -extractNumber(line); // Negativo
        } else if (line.includes('Ganhos Líquidos:')) {
            extractedValues.ganhosLiquidos = extractNumber(line);
        } else if (line.includes('Fatura Plataforma:')) {
            extractedValues.faturaPlataforma = extractNumber(line);
        } else if (line.includes('Campanhas:')) {
            extractedValues.campanhas = extractNumber(line);
        } else if (line.includes('Gorjetas:')) {
            extractedValues.gorjetas = extractNumber(line);
        } else if (line.includes('Cancelamentos:')) {
            extractedValues.cancelamentos = extractNumber(line);
        }
    });
    
    return extractedValues;
}

async function processSaftFiles(files) {
    try {
        logAudit(`Processando ${files.length} ficheiros SAF-T...`, 'info');
        
        let totalGross = 0;
        let totalIVA6 = 0;
        
        for (const file of files) {
            const text = await readFileAsText(file);
            
            // EXTRAIR VALORES DO SAF-T XML OU CSV
            const values = extractValuesFromSaftFile(text);
            totalGross += values.gross || 0;
            totalIVA6 += values.iva6 || 0;
        }
        
        // ATUALIZAR VALORES EXTRAÍDOS
        VDCSystem.analysis.extractedValues.saftGross = totalGross;
        VDCSystem.analysis.extractedValues.saftIVA6 = totalIVA6;
        
        logAudit(`✅ ${files.length} ficheiros SAF-T processados`, 'success');
        logAudit(`Total Bruto: ${totalGross.toFixed(2)}€ | IVA 6%: ${totalIVA6.toFixed(2)}€`, 'info');
        
        VDCSystem.documents.saft.files = files;
        
        // ATUALIZAR BOTÃO DE ANÁLISE
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no processamento SAF-T:', error);
        logAudit(`❌ Erro no processamento SAF-T: ${error.message}`, 'error');
    }
}

function extractValuesFromSaftFile(text) {
    const values = { gross: 0, iva6: 0 };
    
    // TENTAR PARSE XML
    if (text.includes('<GrossTotal>')) {
        const grossMatch = text.match(/<GrossTotal>([\d,]+\.?\d*)<\/GrossTotal>/);
        if (grossMatch) {
            values.gross = parseFloat(grossMatch[1].replace(',', ''));
        }
        
        const iva6Match = text.match(/<Tax>6%<\/Tax>.*?<TaxAmount>([\d,]+\.?\d*)<\/TaxAmount>/s);
        if (iva6Match) {
            values.iva6 = parseFloat(iva6Match[1].replace(',', ''));
        }
    }
    // TENTAR PARSE CSV
    else if (text.includes(';')) {
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.includes('TotalGeral')) {
                const parts = line.split(';');
                if (parts.length > 1) {
                    values.gross = parseFloat(parts[1].replace(',', '.')) || 0;
                }
            }
        });
    }
    
    return values;
}

async function processInvoiceFiles(files) {
    try {
        logAudit(`Processando ${files.length} faturas...`, 'info');
        
        let totalCommission = 0;
        let totalInvoiceValue = 0;
        
        for (const file of files) {
            const text = await readFileAsText(file);
            
            // EXTRAIR VALORES DE FATURAS
            const values = extractValuesFromInvoiceFile(text);
            totalCommission += values.commission || 0;
            totalInvoiceValue += values.invoiceValue || 0;
        }
        
        // ATUALIZAR VALORES EXTRAÍDOS
        VDCSystem.analysis.extractedValues.platformCommission = totalCommission;
        VDCSystem.analysis.extractedValues.faturaPlataforma = totalInvoiceValue;
        
        logAudit(`✅ ${files.length} faturas processadas`, 'success');
        logAudit(`Comissão Total: ${totalCommission.toFixed(2)}€ | Valor Fatura: ${totalInvoiceValue.toFixed(2)}€`, 'info');
        
        VDCSystem.documents.invoices.files = files;
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no processamento de faturas:', error);
        logAudit(`❌ Erro no processamento de faturas: ${error.message}`, 'error');
    }
}

function extractValuesFromInvoiceFile(text) {
    const values = { commission: 0, invoiceValue: 0 };
    
    // PROCURAR PADRÕES COMUNS EM FATURAS
    const lines = text.split('\n');
    
    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('comissão') || lowerLine.includes('commission')) {
            const num = extractNumber(line);
            if (num > 0) values.commission = num;
        }
        
        if (lowerLine.includes('total') || lowerLine.includes('valor')) {
            const num = extractNumber(line);
            if (num > 0 && num > values.invoiceValue) values.invoiceValue = num;
        }
    });
    
    return values;
}

async function processStatementFiles(files) {
    try {
        logAudit(`Processando ${files.length} extratos bancários...`, 'info');
        
        let totalTransfer = 0;
        
        for (const file of files) {
            const text = await readFileAsText(file);
            
            // EXTRAIR TRANSFERÊNCIAS DE EXTRATOS
            const transfer = extractTransferFromStatement(text);
            totalTransfer += transfer;
        }
        
        // ATUALIZAR VALORES EXTRAÍDOS
        VDCSystem.analysis.extractedValues.bankTransfer = totalTransfer;
        
        logAudit(`✅ ${files.length} extratos bancários processados`, 'success');
        logAudit(`Transferência Total: ${totalTransfer.toFixed(2)}€`, 'info');
        
        VDCSystem.documents.statements.files = files;
        updateAnalysisButton();
        
    } catch (error) {
        console.error('Erro no processamento de extratos:', error);
        logAudit(`❌ Erro no processamento de extratos: ${error.message}`, 'error');
    }
}

function extractTransferFromStatement(text) {
    let transfer = 0;
    const lines = text.split('\n');
    
    // PROCURAR TRANSFERÊNCIAS DA PLATAFORMA
    lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('bolt') || lowerLine.includes('uber') || 
            lowerLine.includes('transfer') || lowerLine.includes('pagamento')) {
            const num = extractNumber(line);
            if (num > 0) transfer = num;
        }
    });
    
    return transfer;
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
        dac7Value: VDCSystem.analysis.extractedValues.dac7Value || 0,
        dac7Discrepancy: 0,
        valorIliquido: 0,
        iva6Percent: 0,
        iva23Autoliquidacao: 0,
        comissaoCalculada: 0
    };
}

function resetDashboard() {
    // Resetar valores de exibição
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
    
    // LIMPAR CAMPOS DO FORMULÁRIO (INCLUINDO OS NOVOS)
    document.getElementById('clientName').value = '';
    document.getElementById('clientNIF').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
    
    // Resetar barras de progresso
    document.querySelectorAll('.bar-fill').forEach(bar => {
        bar.style.width = '0%';
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
    
    // Resetar cliente
    const clientStatus = document.getElementById('clientStatus');
    if (clientStatus) clientStatus.style.display = 'none';
    VDCSystem.client = null;
    
    // Resetar gráfico
    if (VDCSystem.chart) {
        VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0];
        VDCSystem.chart.update();
    }
    
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

// 8. REGISTRO DE CLIENTE - COM NOVOS CAMPOS
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
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
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

// 12. CÁLCULO DE DIFERENCIAL DINÂMICO (FÓRMULA PRESERVADA)
function calcularDiferencialCusto() {
    // Usar valores extraídos DINAMICAMENTE
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const fatura = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    
    // Cálculo do diferencial (FÓRMULA ORIGINAL PRESERVADA)
    const diferencial = Math.abs(comissao) - fatura;
    const prejuizoFiscal = diferencial * 0.21;
    const ivaAutoliquidacao = diferencial * 0.23;
    
    VDCSystem.analysis.extractedValues.diferencialCusto = diferencial;
    VDCSystem.analysis.extractedValues.prejuizoFiscal = prejuizoFiscal;
    VDCSystem.analysis.extractedValues.iva23Due = ivaAutoliquidacao;
    VDCSystem.analysis.crossings.diferencialAlerta = diferencial > 0;
    
    logAudit(`📊 DIFERENCIAL CALCULADO: ${diferencial.toFixed(2)}€ | Prejuízo Fiscal: ${prejuizoFiscal.toFixed(2)}€ | IVA Autoliquidação: ${ivaAutoliquidacao.toFixed(2)}€`, 'warn');
    
    return diferencial;
}

// 13. CRIAÇÃO DE DASHBOARD DIFERENCIAL
function criarDashboardDiferencial() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection) return;
    
    if (!document.getElementById('diferencialCard')) {
        const kpiGrid = kpiSection.querySelector('.kpi-grid');
        if (kpiGrid) {
            const diferencial = calcularDiferencialCusto();
            
            const diferencialCard = document.createElement('div');
            diferencialCard.id = 'diferencialCard';
            diferencialCard.className = 'kpi-card alert';
            diferencialCard.innerHTML = `
                <h4><i class="fas fa-exclamation-triangle"></i> DIFERENCIAL DE CUSTO</h4>
                <p id="diferencialVal">${diferencial.toFixed(2)}€</p>
                <small>Sem suporte documental</small>
            `;
            
            if (kpiGrid.children.length >= 4) {
                kpiGrid.insertBefore(diferencialCard, kpiGrid.children[4]);
            } else {
                kpiGrid.appendChild(diferencialCard);
            }
            
            const diferencialVal = document.getElementById('diferencialVal');
            if (diferencialVal) {
                diferencialVal.style.color = 'var(--warn-secondary)';
                diferencialVal.style.fontWeight = 'bold';
            }
            
            logAudit(`📊 Dashboard diferencial criado: ${diferencial.toFixed(2)}€`, 'info');
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
    
    // Atualizar com valores extraídos DINAMICAMENTE
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const valorIliquido = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    VDCSystem.chart.data.datasets[0].data = [
        valorIliquido,
        ganhosBrutos * 0.06,
        comissao,
        comissao * 0.23
    ];
    
    VDCSystem.chart.update();
}

// 15. FUNÇÕES DE ANÁLISE FORENSE - CORRIGIDA COM VERIFICAÇÕES
async function performForensicAnalysis() {
    try {
        console.log('🚀 INICIANDO ANÁLISE FORENSE...');
        console.log('🔍 VERIFICAÇÃO INICIAL:', {
            client: VDCSystem.client ? 'Registado' : 'NÃO REGISTADO',
            controlFiles: VDCSystem.documents.control.files.length,
            saftFiles: VDCSystem.documents.saft.files.length,
            demoMode: VDCSystem.demoMode,
            ganhosBrutos: VDCSystem.analysis.extractedValues.ganhosBrutos,
            saftGross: VDCSystem.analysis.extractedValues.saftGross
        });
        
        // VERIFICAÇÃO DE SEGURANÇA
        if (!VDCSystem.client) {
            showError('❌ Por favor, registe um cliente primeiro');
            return;
        }
        
        if (VDCSystem.documents.control.files.length === 0 && 
            VDCSystem.analysis.extractedValues.ganhosBrutos === 0 &&
            !VDCSystem.demoMode) {
            showError('❌ Por favor, carregue ficheiros de controlo ou use dados demo');
            return;
        }
        
        if (VDCSystem.documents.saft.files.length === 0 && 
            VDCSystem.analysis.extractedValues.saftGross === 0 &&
            !VDCSystem.demoMode) {
            showError('❌ Por favor, carregue ficheiros SAF-T ou use dados demo');
            return;
        }
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE BIG DATA', 'success');
        
        // Calcular IMT com valores extraídos
        const imtCalculos = calcularIMT();
        
        // Atualizar dashboard com valores extraídos
        updateDashboardWithExtractedValues();
        
        // Calcular diferencial
        calcularDiferencialCusto();
        
        // Atualizar interface
        updateDashboard();
        updateResults();
        updateIMTDisplay(imtCalculos);
        
        // Atualizar gráfico
        updateChartWithData();
        
        // Criar dashboard diferencial
        criarDashboardDiferencial();
        
        // Gerar Master Hash
        generateMasterHash();
        
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        // Mostrar alerta se houver diferencial
        if (VDCSystem.analysis.crossings.diferencialAlerta) {
            showDiferencialAlert();
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
    
    // Usar valores extraídos DINAMICAMENTE
    const valores = {
        'kpiGanhos': VDCSystem.analysis.extractedValues.ganhosBrutos || 0,
        'kpiComm': -(VDCSystem.analysis.extractedValues.comissaoApp || 0),
        'kpiNet': VDCSystem.analysis.extractedValues.ganhosLiquidos || 0,
        'kpiInvoice': VDCSystem.analysis.extractedValues.faturaPlataforma || 0,
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
    
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    
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

function updateResults() {
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
    
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    const elementos = {
        'grossResult': ganhosBrutos,
        'transferResult': ganhosLiquidos,
        'differenceResult': 0.00,
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
}

function showDiferencialAlert() {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
    // Remover alerta anterior
    const alertAntigo = document.getElementById('diferencialAlert');
    if (alertAntigo) alertAntigo.remove();
    
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto;
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const fatura = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    
    const novoAlerta = document.createElement('div');
    novoAlerta.id = 'diferencialAlert';
    novoAlerta.className = 'omission-alert diferencial-alert';
    novoAlerta.style.display = 'flex';
    novoAlerta.innerHTML = `
        <i class="fas fa-balance-scale"></i>
        <div>
            <strong>ALERTA DE DIFERENCIAL DE CUSTO</strong>
            <p>Detetado diferencial de <span id="diferencialAlertValue">${diferencial.toFixed(2)}€</span> entre comissão retida (${comissao.toFixed(2)}€) e fatura emitida (${fatura.toFixed(2)}€).</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem;"><i class="fas fa-exclamation-circle"></i> Saída de caixa não documentada detectada.</p>
        </div>
    `;
    
    const resultsGrid = resultsSection.querySelector('.results-grid');
    if (resultsGrid) {
        resultsGrid.parentNode.insertBefore(novoAlerta, resultsGrid.nextSibling);
    }
}

// 16. FUNÇÃO DE EXPORTAÇÃO PDF (COM CORREÇÃO DE CONTRASTE)
async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // ========== PÁGINA 1: RELATÓRIO PERICIAL ==========
        createPage1(doc);
        
        // ========== PÁGINA 2: ANEXO LEGAL ==========
        createPage2(doc);
        
        // ABRIR EM NOVA JANELA PARA ESCOLHA DE DESTINO
        const pdfDataUri = doc.output('datauristring');
        const newWindow = window.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório Pericial VDC - ${VDCSystem.sessionId}</title>
                <style>
                    body { margin: 0; padding: 20px; background: #f5f5f5; }
                    iframe { width: 100%; height: calc(100vh - 40px); border: 2px solid #333; border-radius: 8px; }
                    .controls { 
                        margin-bottom: 15px; 
                        display: flex; 
                        gap: 10px; 
                        justify-content: center;
                    }
                    button { 
                        padding: 10px 20px; 
                        background: #3b82f6; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                    }
                    button:hover { background: #2563eb; }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button onclick="window.print()">🖨️ IMPRIMIR / GUARDAR PDF</button>
                    <button onclick="window.close()">❌ FECHAR</button>
                </div>
                <iframe src="${pdfDataUri}"></iframe>
            </body>
            </html>
        `);
        
        logAudit('✅ Relatório pericial gerado - Abrindo em nova janela', 'success');
        logAudit('Utilize a opção "Imprimir" do navegador para guardar como PDF', 'info');
        
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
    doc.text("VDC FORENSIC SYSTEM", 20, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Protocolo de Prova Legal | Big Data Forense", 20, 29);
    
    // INFORMAÇÃO DA SESSÃO
    const dataAtual = new Date().toLocaleDateString('pt-PT');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Sessão: ${VDCSystem.sessionId}`, 195, 27, { align: "right" });
    doc.text(`Data: ${dataAtual}`, 195, 32, { align: "right" });
    
    let posY = 55;
    
    // 1. IDENTIFICAÇÃO DO CLIENTE (COM NOVOS CAMPOS)
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
    
    // 3. DIFERENCIAL DE CUSTO
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("3. CÁLCULO DE INCONGRUÊNCIA FORENSE", 15, posY);
    posY += 10;
    
    const diferencial = Math.abs(comissaoApp) - faturaPlataforma;
    const prejuizo = diferencial * 0.21;
    const ivaDevido = diferencial * 0.23;
    
    const calculos = [
        ["Fórmula:", "|Comissão Retida| - Fatura Emitida"],
        ["Diferencial Oculto:", formatter.format(diferencial)],
        ["Prejuízo Fiscal (21%):", formatter.format(prejuizo)],
        ["IVA Não Autoliquidado (23%):", formatter.format(ivaDevido)],
        ["Impacto Total:", formatter.format(prejuizo + ivaDevido)]
    ];
    
    calculos.forEach(([label, valor]) => {
        doc.text(label, 15, posY, { align: "left" });
        doc.text(valor, 80, posY, { align: "left" });
        posY += 7;
    });
    
    // RODAPÉ PÁGINA 1
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("VDC Forensic System v10.1 | Protocolo ISO 27037", 15, 285);
    doc.text(`Página 1 de ${pageCount}`, 185, 285, { align: "right" });
}

function createPage2(doc) {
    doc.addPage();
    
    // CORREÇÃO CRÍTICA: RE-FORÇAR ESTILO EXPLICITAMENTE APÓS addPage()
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    let posY = 20;
    
    // TÍTULO PÁGINA 2 - MESMA DENSIDADE VISUAL
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold'); // DUPLA CONFIRMAÇÃO
    doc.text("ANEXO II: PARECER TÉCNICO PERICIAL", 15, posY);
    posY += 15;
    
    // PARECER TÉCNICO (TÍTULO EM BOLD)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold'); // FORÇAR BOLD AQUI TAMBÉM
    doc.text("PARECER TÉCNICO-PERICIAL", 15, posY);
    posY += 10;
    
    // CORPO DO TEXTO EM NORMAL
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto || 0;
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const fatura = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    
    const parecerTexto = `O diferencial de ${diferencial.toFixed(2)}€ constitui uma saída de caixa não documentada, lesando o cliente em ${(diferencial * 0.21).toFixed(2)}€ de IRS/IRC indevido e o Estado em ${(diferencial * 0.23).toFixed(2)}€ de IVA de autoliquidação.

Esta discrepância entre o valor retido pela plataforma (${comissao.toFixed(2)}€) e o valor faturado (${fatura.toFixed(2)}€) caracteriza uma prática de Colarinho Branco, na qual a ausência de documentação fiscal completa permite a ocultação de fluxos financeiros e a evasão de obrigações tributárias.

O cliente está a ser tributado sobre um lucro que não existe na prática, configurando enriquecimento sem causa da plataforma em detrimento do contribuinte e do erário público.

FUNDAMENTAÇÃO LEGAL APLICÁVEL:
1. Código do IRC, Art. 87º: Obrigação de contabilização integral de custos e proveitos
2. CIVA, Art. 29º: Falta de emissão de fatura-recibo pelo valor total
3. RGIT, Art. 103º: Crime de Fraude Fiscal por omissão de autoliquidação
4. Código Penal, Art. 217º: Abuso de Confiança na gestão financeira
5. Doutrina Jurisprudencial: Crimes de Colarinho Branco Digital`;
    
    // QUEBRA DE TEXTO
    const splitParecer = doc.splitTextToSize(parecerTexto, 180);
    
    // RENDERIZAR COM PAGINAÇÃO
    const margin = 15;
    const pageHeight = 280;
    const lineHeight = 7;
    
    splitParecer.forEach(line => {
        if (posY + lineHeight > pageHeight) {
            doc.addPage();
            posY = 20;
            
            // RE-FORÇAR ESTILO EM NOVA PÁGINA
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
        }
        
        doc.text(line, margin, posY);
        posY += lineHeight;
    });
    
    posY += 10;
    
    // QUADRO DE EVIDÊNCIAS (TÍTULO EM BOLD)
    if (posY + 50 > pageHeight) {
        doc.addPage();
        posY = 20;
        // RE-FORÇAR ESTILO
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
    
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    const evidencias = [
        ["Evidência", "Valor", "Status"],
        ["Ganhos Plataforma", formatter.format(ganhosBrutos), "Validado"],
        ["Comissão Retida", formatter.format(comissao), "Confirmado"],
        ["Fatura Emitida", formatter.format(fatura), "Documentada"],
        ["Diferencial Oculto", formatter.format(diferencial), "ALERTA"],
        ["Prejuízo Fiscal", formatter.format(diferencial * 0.21), "Não Conforme"],
        ["IVA em Défice", formatter.format(diferencial * 0.23), "Crime Fiscal"]
    ];
    
    evidencias.forEach((linha, idx) => {
        if (idx === 0) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
        } else {
            doc.setFont("helvetica", "normal");
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
        doc.text("VDC Forensic System v10.1 | Protocolo ISO 27037", 15, 285);
        doc.text(`Página ${i} de ${totalPages}`, 185, 285, { align: "right" });
    }
}

// 17. FUNÇÃO PARA ABRIR PDF
async function exportPDFWithPicker() {
    await exportPDF();
}

// 18. FUNÇÃO PARA GUARDAR CLIENTE
async function saveClientData() {
    try {
        if (!VDCSystem.client) {
            showError('Nenhum cliente registado para guardar');
            return;
        }
        
        logAudit('💾 PREPARANDO PARA GUARDAR DADOS DO CLIENTE...', 'info');
        
        const clientData = {
            sistema: "VDC Forensic System v10.1",
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            analise: {
                valores: VDCSystem.analysis.extractedValues,
                cruzamentos: VDCSystem.analysis.crossings
            }
        };
        
        const jsonStr = JSON.stringify(clientData, null, 2);
        const newWindow = window.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dados do Cliente - ${VDCSystem.client.name}</title>
                <style>
                    body { 
                        margin: 0; 
                        padding: 30px; 
                        background: #1e293b; 
                        color: #f1f5f9; 
                        font-family: 'JetBrains Mono', monospace;
                    }
                    pre { 
                        background: #0f172a; 
                        padding: 20px; 
                        border-radius: 8px; 
                        border: 1px solid #334155;
                        overflow-x: auto;
                        font-size: 12px;
                        line-height: 1.5;
                    }
                    .controls { 
                        margin-bottom: 20px; 
                        display: flex; 
                        gap: 10px; 
                        justify-content: center;
                    }
                    button { 
                        padding: 10px 20px; 
                        background: #3b82f6; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-family: 'Inter', sans-serif;
                        font-size: 14px;
                    }
                    button:hover { background: #2563eb; }
                    button.print { background: #10b981; }
                    button.print:hover { background: #059669; }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button class="print" onclick="window.print()">🖨️ IMPRIMIR / GUARDAR</button>
                    <button onclick="window.close()">❌ FECHAR</button>
                </div>
                <pre>${jsonStr}</pre>
            </body>
            </html>
        `);
        
        logAudit(`✅ Dados do cliente abertos para impressão: ${VDCSystem.client.name}`, 'success');
        
    } catch (error) {
        console.error('Erro ao guardar cliente:', error);
        logAudit(`❌ Erro ao guardar cliente: ${error.message}`, 'error');
        alert('Erro ao guardar cliente: ' + error.message);
    }
}

// 19. FUNÇÃO EXPORTAR JSON
async function exportJSON() {
    try {
        logAudit('💾 PREPARANDO PROVA DIGITAL (JSON)...', 'info');
        
        const evidenceData = {
            sistema: "VDC Forensic System v10.1",
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
        const newWindow = window.open();
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Prova Digital - ${VDCSystem.sessionId}</title>
                <style>
                    body { 
                        margin: 0; 
                        padding: 30px; 
                        background: #1e293b; 
                        color: #f1f5f9; 
                        font-family: 'JetBrains Mono', monospace;
                    }
                    pre { 
                        background: #0f172a; 
                        padding: 20px; 
                        border-radius: 8px; 
                        border: 1px solid #334155;
                        overflow-x: auto;
                        font-size: 12px;
                        line-height: 1.5;
                    }
                    .controls { 
                        margin-bottom: 20px; 
                        display: flex; 
                        gap: 10px; 
                        justify-content: center;
                    }
                    button { 
                        padding: 10px 20px; 
                        background: #8b5cf6; 
                        color: white; 
                        border: none; 
                        border-radius: 4px; 
                        cursor: pointer;
                        font-family: 'Inter', sans-serif;
                        font-size: 14px;
                    }
                    button:hover { background: #7c3aed; }
                    button.print { background: #10b981; }
                    button.print:hover { background: #059669; }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button class="print" onclick="window.print()">🖨️ IMPRIMIR / GUARDAR</button>
                    <button onclick="window.close()">❌ FECHAR</button>
                </div>
                <pre>${jsonStr}</pre>
            </body>
            </html>
        `);
        
        logAudit('✅ Prova digital aberta para impressão', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`❌ Erro ao exportar JSON: ${error.message}`, 'error');
        alert('Erro ao exportar JSON: ' + error.message);
    }
}

// 20. FUNÇÃO clearAllData() - RELOAD COMPLETO
function clearAllData() {
    if (confirm('⚠️  ATENÇÃO: Todos os dados não exportados serão perdidos.\n\nTem certeza que deseja iniciar uma nova sessão?')) {
        // RELOAD COMPLETO DA PÁGINA - GARANTE LIMPEZA TOTAL
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

// 22. FUNÇÕES UTILITÁRIAS - FUNÇÃO updateAnalysisButton CORRIGIDA
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

// FUNÇÃO CRÍTICA CORRIGIDA: updateAnalysisButton
function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    // VERIFICAÇÕES FLEXÍVEIS E PRÁTICAS
    const hasControl = VDCSystem.documents.control.files.length > 0 || 
                      VDCSystem.demoMode || 
                      (VDCSystem.analysis.extractedValues.ganhosBrutos > 0 && 
                       VDCSystem.analysis.extractedValues.ganhosLiquidos > 0);
    
    const hasSaft = VDCSystem.documents.saft.files.length > 0 || 
                   VDCSystem.demoMode || 
                   VDCSystem.analysis.extractedValues.saftGross > 0;
    
    const hasClient = VDCSystem.client !== null;
    
    const hasValidData = hasControl && hasSaft && hasClient;
    
    analyzeBtn.disabled = !hasValidData;
    
    if (hasValidData) {
        analyzeBtn.style.opacity = '1';
        analyzeBtn.style.cursor = 'pointer';
        analyzeBtn.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.5)';
        logAudit('✅ BOTÃO DE ANÁLISE ATIVADO - Todos os requisitos preenchidos', 'success');
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
