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
            logAudit(`❌ Erro ao carregar dados demo: ${error.message
