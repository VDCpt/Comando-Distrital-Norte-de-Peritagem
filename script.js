// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.9-FS
// FINAL STABLE RELEASE - BIG DATA FORENSE
// ============================================

// 1. ESTADO DO SISTEMA - ESTRUTURA FORENSE COMPLETA
const VDCSystem = {
    version: 'v10.9-FS',
    sessionId: null,
    sessionStartTime: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    parsingErrors: [],
    
    // Otimização: Flag para controlar updates
    needsDashboardUpdate: false,
    lastUpdateTime: 0,
    updateInterval: 100, // ms entre updates
    
    // Estrutura completa de documentos
    documents: {
        control: {
            files: [],
            parsedData: [],
            totals: { 
                hash: '',
                fileCount: 0,
                verificationStatus: 'pending'
            },
            hashes: {},
            metadata: []
        },
        dac7: {
            files: [],
            parsedData: [],
            totals: { 
                annualRevenue: 0, 
                period: '',
                transactionCount: 0,
                platformName: '',
                platformCountry: '',
                reportingPeriod: ''
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        },
        saft: {
            files: [],
            parsedData: [],
            totals: { 
                gross: 0, 
                iva6: 0, 
                net: 0,
                transactionCount: 0,
                documentCount: 0,
                periodStart: '',
                periodEnd: '',
                taxBaseTotal: 0,
                taxPayableTotal: 0
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        },
        invoices: {
            files: [],
            parsedData: [],
            totals: { 
                commission: 0, 
                iva23: 0, 
                invoiceValue: 0,
                invoicesFound: [],
                invoiceNumbers: [],
                totalInvoices: 0,
                totalValue: 0,
                averageValue: 0
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        },
        statements: {
            files: [],
            parsedData: [],
            totals: { 
                transfer: 0, 
                expected: 0,
                rendimentosBrutos: 0,
                comissaoApp: 0,
                rendimentosLiquidos: 0,
                campanhas: 0,
                gorjetas: 0,
                cancelamentos: 0,
                portagens: 0,
                diferencialCusto: 0,
                transactionCount: 0,
                periodStart: '',
                periodEnd: ''
            },
            hashes: {},
            metadata: [],
            columnsFound: [],
            columnsMissing: [],
            validationStatus: 'pending'
        }
    },
    
    // Análise forense completa (mantém-se igual)
    // ... (manter toda a estrutura analysis igual)
    
    // Contadores completos
    counters: {
        dac7: 0,
        control: 0,
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0,
        parsed: 0,
        failed: 0,
        validated: 0
    },
    
    // Logs do sistema
    logs: [],
    maxLogEntries: 1000,
    
    // Componentes UI
    chart: null,
    chartInstance: null,
    
    // Clientes pré-registados
    preRegisteredClients: [],
    clientDatabase: [],
    
    // Intervalos de alerta
    bigDataAlertInterval: null,
    discrepanciaAlertaInterval: null,
    jurosAlertInterval: null,
    
    // Estado de processamento
    processingQueue: [],
    isProcessing: false,
    
    // Configurações do sistema
    config: {
        autoValidate: true,
        strictParsing: true,
        generateHashes: true,
        maintainChainOfCustody: true,
        enableAlerts: true,
        logLevel: 'info',
        maxFileSize: 104857600, // 100MB
        allowedExtensions: {
            dac7: ['.html', '.htm', '.eml', '.txt', '.pdf', '.xml', '.csv', '.json'],
            control: ['.csv', '.xml', '.pdf', '.txt', '.json'],
            saft: ['.xml', '.csv', '.txt', '.json'],
            invoices: ['.pdf', '.csv', '.xml', '.jpg', '.png', '.jpeg', '.txt'],
            statements: ['.pdf', '.csv', '.txt', '.ofx', '.qif', '.mt940', '.xml']
        },
        validationRules: {
            requireControlFile: true,
            validateSAFTStructure: true,
            validateDAC7Fields: true,
            crossValidateDocuments: true,
            calculateJurosMora: true,
            calculateTaxaRegulacao: true
        }
    },
    
    // Templates de erro
    errorTemplates: {
        missingColumn: (fileType, columnName) => 
            `COLUNA CRÍTICA AUSENTE: ${columnName} não encontrada no ficheiro ${fileType}. Análise interrompida por violação ISO/IEC 27037.`,
        parsingError: (fileType, error) => 
            `ERRO DE PARSING ${fileType}: ${error}. Sistema requer estrutura de dados conforme normativo SAF-T PT.`,
        hashMismatch: (filename) => 
            `INCONSISTÊNCIA DE HASH: ${filename} - Hash SHA-256 não corresponde à cadeia de custódia.`,
        fileSizeExceeded: (filename, maxSize) => 
            `TAMANHO EXCEDIDO: ${filename} excede o limite de ${maxSize} bytes.`,
        invalidFormat: (filename, expectedFormat) => 
            `FORMATO INVÁLIDO: ${filename} - Formato esperado: ${expectedFormat}.`
    }
};

// 2. FUNÇÕES DE HIGIENIZAÇÃO E VALIDAÇÃO DE DADOS (mantêm-se iguais)
// ... (manter funções cleanCurrencyValue, validateNIF, etc.)

// 3. INICIALIZAÇÃO DO SISTEMA COM OPTIMIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 VDC Forensic System v10.9-FS - Initializing (Optimized)...');
    initializeSystem();
    
    // Iniciar loop de renderização otimizado
    requestAnimationFrame(optimizedUpdateLoop);
});

function optimizedUpdateLoop() {
    const now = Date.now();
    
    // Verificar se precisa de update e se passou tempo suficiente
    if (VDCSystem.needsDashboardUpdate && (now - VDCSystem.lastUpdateTime) > VDCSystem.updateInterval) {
        updateDashboardOptimized();
        VDCSystem.needsDashboardUpdate = false;
        VDCSystem.lastUpdateTime = now;
    }
    
    // Continuar o loop
    requestAnimationFrame(optimizedUpdateLoop);
}

function initializeSystem() {
    try {
        VDCSystem.sessionStartTime = new Date();
        updateSessionInfo();
        
        // OTIMIZAÇÃO: Usar event delegation em vez de listeners individuais
        setupEventDelegation();
        
        startClockAndDate();
        logAudit('✅ Sistema VDC v10.9-FS inicializado com otimizações de performance', 'success');
        logAudit(`🔐 Configuração: Modo Estrito ${VDCSystem.config.strictParsing ? 'ATIVADO' : 'DESATIVADO'}`, 'info');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha crítica na inicialização: ${error.message}`);
    }
}

// OTIMIZAÇÃO: Event Delegation para reduzir número de listeners
function setupEventDelegation() {
    const mainContainer = document.getElementById('mainContainer');
    if (!mainContainer) return;
    
    // Listeners globais usando delegation
    mainContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const id = target.id;
        
        // Mapeamento de botões para funções
        const buttonHandlers = {
            'startSessionBtn': startForensicSession,
            'registerClientBtn': registerClient,
            'saveClientBtn': saveClientToJSON,
            'demoModeBtn': activateDemoMode,
            'analyzeBtn': performForensicAnalysis,
            'exportJSONBtn': exportJSON,
            'exportPDFBtn': exportPDF,
            'resetBtn': resetDashboard,
            'clearConsoleBtn': clearConsole,
            'custodyBtn': showChainOfCustody,
            'exportLogBtn': exportLogs,
            'controlUploadBtn': () => document.getElementById('controlFile')?.click(),
            'dac7UploadBtn': () => document.getElementById('dac7File')?.click(),
            'saftUploadBtn': () => document.getElementById('saftFile')?.click(),
            'invoiceUploadBtn': () => document.getElementById('invoiceFile')?.click(),
            'statementUploadBtn': () => document.getElementById('statementFile')?.click()
        };
        
        if (buttonHandlers[id]) {
            e.preventDefault();
            buttonHandlers[id]();
        }
    });
    
    // Listeners para inputs usando delegation
    mainContainer.addEventListener('change', (e) => {
        const target = e.target;
        
        if (target.matches('.year-select')) {
            VDCSystem.selectedYear = parseInt(target.value);
            logAudit(`📅 Ano fiscal alterado para: ${VDCSystem.selectedYear}`, 'info');
            updateSessionInfo();
            scheduleDashboardUpdate();
        }
        
        if (target.matches('.platform-select')) {
            VDCSystem.selectedPlatform = target.value;
            const platformName = target.options[target.selectedIndex].text;
            logAudit(`🖥️ Plataforma selecionada: ${platformName}`, 'info');
            resetAnalysisData();
            updateSessionInfo();
            scheduleDashboardUpdate();
        }
        
        // Handlers para upload de ficheiros
        if (target.matches('.file-input')) {
            const type = target.id.replace('File', '');
            handleFileUpload({ target }, type);
        }
    });
    
    // Listeners para inputs do cliente
    const clientNameInput = document.getElementById('clientName');
    const clientNIFInput = document.getElementById('clientNIF');
    
    if (clientNameInput) {
        clientNameInput.addEventListener('input', handleClientAutocomplete);
        clientNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const clientNIF = document.getElementById('clientNIF');
                if (clientNIF) clientNIF.focus();
            }
        });
    }
    
    if (clientNIFInput) {
        clientNIFInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') registerClient();
        });
    }
}

// 4. CONFIGURAÇÃO DE CONTROLES (mantém-se igual)
// ... (manter initializeYearSelector, startClockAndDate, etc.)

// 5. FUNÇÃO OTIMIZADA DE UPDATE DO DASHBOARD
function scheduleDashboardUpdate() {
    VDCSystem.needsDashboardUpdate = true;
}

function updateDashboardOptimized() {
    if (VDCSystem.processing) return;
    
    const formatter = new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    const ev = VDCSystem.analysis.extractedValues;
    
    // Atualizar apenas elementos visíveis
    const updateElements = {
        'netVal': ev.saftNet,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao,
        'jurosVal': ev.jurosMora,
        'taxaRegVal': ev.taxaRegulacao,
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosLiquidos,
        'kpiInvoice': ev.faturaPlataforma,
        'valCamp': ev.campanhas,
        'valTips': ev.gorjetas,
        'valCanc': ev.cancelamentos,
        'valTolls': ev.portagens,
        'grossResult': ev.saftGross,
        'transferResult': ev.rendimentosLiquidos,
        'differenceResult': VDCSystem.analysis.crossings.deltaB,
        'marketResult': VDCSystem.analysis.projection.marketProjection.toFixed(2) + 'M€'
    };
    
    // Batch update usando DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
    Object.entries(updateElements).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            const span = document.createElement('span');
            span.textContent = typeof value === 'number' ? formatter.format(value) : value;
            
            // Clonar elemento e atualizar apenas o conteúdo
            const clone = elemento.cloneNode(false);
            clone.textContent = span.textContent;
            
            // Preservar classes especiais
            if (id === 'iva23Val' && value > 0) clone.classList.add('alert-text');
            if (id === 'jurosVal' && value > 0) clone.classList.add('regulatory-text');
            if (id === 'taxaRegVal' && value > 0) clone.classList.add('regulatory-text');
            
            tempDiv.appendChild(clone);
            elemento.parentNode.replaceChild(clone, elemento);
        }
    });
    
    // Atualizar barras de progresso
    updateProgressBarsOptimized();
    
    // Mostrar/ocultar cards especiais
    const jurosCard = document.getElementById('jurosCard');
    const taxaRegCard = document.getElementById('taxaRegCard');
    
    if (jurosCard) {
        jurosCard.style.display = ev.jurosMora > 0 ? 'flex' : 'none';
    }
    
    if (taxaRegCard) {
        taxaRegCard.style.display = ev.taxaRegulacao > 0 ? 'flex' : 'none';
    }
    
    // Atualizar alertas visuais se necessário
    const discrepancia = VDCSystem.analysis.crossings.deltaB;
    if (discrepancia > 50 && !VDCSystem.analysis.crossings.discrepanciaAlertaAtiva) {
        activateDiscrepancyAlert();
    }
}

function updateProgressBarsOptimized() {
    const ev = VDCSystem.analysis.extractedValues;
    const maxValue = Math.max(ev.saftGross, ev.rendimentosBrutos, Math.abs(ev.comissaoApp));
    const differenceBar = document.getElementById('differenceBar');
    
    if (differenceBar && maxValue > 0) {
        const percentage = (VDCSystem.analysis.crossings.deltaB / maxValue) * 100;
        differenceBar.style.width = Math.min(percentage, 100) + '%';
        
        // Colorir baseado na severidade
        if (percentage > 30) {
            differenceBar.style.backgroundColor = 'var(--warn-primary)';
        } else if (percentage > 15) {
            differenceBar.style.backgroundColor = 'var(--warn-secondary)';
        } else if (percentage > 5) {
            differenceBar.style.backgroundColor = 'var(--regulatory-orange)';
        }
    }
}

// 6. UPLOAD E PROCESSAMENTO DE FICHEIROS (mantém-se igual, mas com scheduleDashboardUpdate)
async function handleFileUpload(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    
    // Validação inicial (mantém-se igual)
    for (const file of files) {
        if (!validateFileType(file, VDCSystem.config.allowedExtensions[type])) {
            showError(`Tipo de ficheiro inválido para ${type}: ${file.name}`);
            return;
        }
        
        if (!validateFileSize(file, VDCSystem.config.maxFileSize)) {
            showError(`Ficheiro demasiado grande: ${file.name} (limite: 100MB)`);
            return;
        }
    }
    
    // Atualizar UI do botão (mantém-se igual)
    const uploadBtn = document.querySelector(`#${type}UploadBtn`);
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO ${files.length} FICHEIROS...`;
        uploadBtn.disabled = true;
    }
    
    try {
        // Registro na cadeia de custódia (mantém-se igual)
        files.forEach(file => {
            addToChainOfCustody(file, type);
        });
        
        // Processamento em lote (mantém-se igual)
        await processMultipleFiles(type, files);
        
        // Atualização da UI (mantém-se igual)
        updateFileList(`${type}FileList`, VDCSystem.documents[type].files);
        updateCounter(type, VDCSystem.documents[type].files.length);
        
        // Atualização do botão de análise
        if (VDCSystem.client) {
            updateAnalysisButton();
        }
        
        logAudit(`✅ ${files.length} ficheiros ${type.toUpperCase()} processados com sucesso`, 'success');
        updateSessionInfo();
        
        // OTIMIZAÇÃO: Agendar update do dashboard em vez de imediato
        scheduleDashboardUpdate();
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        logAudit(`❌ Erro no processamento de ${type}: ${error.message}`, 'error');
        showError(`Erro no processamento de ${type}: ${error.message}`);
    } finally {
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            const icon = type === 'control' ? 'fa-file-shield' :
                        type === 'dac7' ? 'fa-file-contract' :
                        type === 'saft' ? 'fa-file-code' :
                        type === 'invoices' ? 'fa-file-invoice-dollar' :
                        'fa-file-contract';
            const text = type === 'control' ? 'FICHEIRO DE CONTROLO' :
                        type === 'dac7' ? 'UPLOAD DAC7' :
                        type === 'saft' ? 'SAF-T / XML / CSV' :
                        type === 'invoices' ? 'FATURAS DA PLATAFORMA' :
                        'EXTRATOS BANCÁRIOS';
            uploadBtn.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
            uploadBtn.disabled = false;
        }
    }
}

// 7. CADEIA DE CUSTÓDIA (mantém-se igual)
// 8. EXTRACÇÃO DE DADOS (mantém-se igual)
// 9. REGISTRO E GESTÃO DE CLIENTES (mantém-se igual)
// 10. MODO DEMO FORENSE (com scheduleDashboardUpdate)

// 11. ANÁLISE FORENSE COMPLETA (com otimizações)
async function performForensicAnalysis() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO BIG DATA (ISO/IEC 27037)...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE LAYERING BIG DATA', 'success');
        
        // Usar setTimeout para não bloquear a UI
        setTimeout(async () => {
            try {
                // Processar dados carregados (mantém-se igual)
                await processAllLoadedData();
                
                // Calcular valores extraídos (mantém-se igual)
                calculateAllExtractedValues();
                
                // Realizar cruzamentos forenses (mantém-se igual)
                performComprehensiveCrossings();
                
                // Calcular projeções de mercado (mantém-se igual)
                calculateCompleteMarketProjection();
                
                // Calcular juros de mora (mantém-se igual)
                calculateJurosMoraComplete();
                
                // Calcular risco regulatório (mantém-se igual)
                calculateRegulatoryRiskComplete();
                
                // OTIMIZAÇÃO: Agendar update em vez de executar imediatamente
                scheduleDashboardUpdate();
                
                // Criar cards especiais (mantém-se igual)
                createDiferencialCard();
                createRegulatoryCard();
                
                // Gerar hash master (mantém-se igual)
                generateMasterHashComplete();
                
                // Gerar quesitos estratégicos (mantém-se igual)
                generateStrategicQuestionsComplete();
                
                // Verificar discrepâncias para alertas (mantém-se igual)
                const discrepancia = Math.abs(Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) - 
                                             VDCSystem.analysis.extractedValues.faturaPlataforma);
                
                if (discrepancia > 50) {
                    triggerBigDataAlert(
                        VDCSystem.analysis.extractedValues.faturaPlataforma,
                        Math.abs(VDCSystem.analysis.extractedValues.comissaoApp),
                        discrepancia
                    );
                    
                    activateDiscrepancyAlert();
                }
                
                logAudit('✅ ANÁLISE FORENSE BIG DATA CONCLUÍDA COM SUCESSO (ISO/IEC 27037)', 'success');
                
                // Mostrar alertas baseados nos resultados (mantém-se igual)
                if (VDCSystem.analysis.crossings.diferencialAlerta) {
                    showDiferencialAlert();
                }
                
                if (VDCSystem.analysis.crossings.riscoRegulatorioAtivo) {
                    showRegulatoryAlert();
                }
                
                if (VDCSystem.analysis.extractedValues.jurosMora > 0) {
                    showJurosMoraAlert();
                }
                
                if (VDCSystem.analysis.crossings.omission > 100) {
                    showOmissionAlert();
                }
                
                // Mostrar cadeia de custódia (mantém-se igual)
                showChainOfCustody();
                
            } catch (error) {
                console.error('Erro na análise:', error);
                logAudit(`❌ Erro na análise Big Data: ${error.message}`, 'error');
                showError(`Erro na análise forense: ${error.message}`);
            } finally {
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE BIG DATA';
                }
            }
        }, 10); // Pequeno delay para não bloquear UI
                
    } catch (error) {
        console.error('Erro ao iniciar análise:', error);
        logAudit(`❌ Erro ao iniciar análise: ${error.message}`, 'error');
        showError(`Erro ao iniciar análise: ${error.message}`);
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE BIG DATA';
        }
    }
}

// 12. ATUALIZAÇÃO DO DASHBOARD (substituir chamadas diretas por scheduleDashboardUpdate)
function updateCompleteDashboard() {
    scheduleDashboardUpdate();
}

function updateKPIResultsComplete() {
    scheduleDashboardUpdate();
}

function updateKPIResults() {
    // Esta função agora será chamada pelo updateDashboardOptimized
    scheduleDashboardUpdate();
}

// 13. GRÁFICO (mantém-se igual, mas pode ser otimizado se necessário)
// 14. ALERTAS E NOTIFICAÇÕES (mantêm-se iguais)
// 15. GERAÇÃO DE QUESTÕES ESTRATÉGICAS (mantém-se igual)
// 16. EXPORTAÇÃO PDF COMPLETA (mantém-se igual)
// 17. EXPORTAÇÃO JSON (mantém-se igual)
// 18. FUNÇÕES DE LOG E AUDITORIA (mantêm-se iguais)
// 19. FUNÇÕES DE UTILIDADE (mantêm-se iguais, exceto updateDashboard)
// 20. FUNÇÕES DE RESET E LIMPEZA (com scheduleDashboardUpdate)

function resetDashboard() {
    if (!confirm('Tem a certeza que pretende reiniciar o dashboard? Todos os dados serão perdidos.')) {
        return;
    }
    
    try {
        // Resetar estado do sistema (mantém-se igual)
        VDCSystem.client = null;
        VDCSystem.demoMode = false;
        VDCSystem.processing = false;
        VDCSystem.sessionStartTime = new Date();
        
        // Limpar documentos (mantém-se igual)
        const documentTypes = ['control', 'dac7', 'saft', 'invoices', 'statements'];
        documentTypes.forEach(type => {
            VDCSystem.documents[type] = {
                files: [],
                parsedData: [],
                totals: {},
                hashes: {},
                metadata: [],
                columnsFound: [],
                columnsMissing: [],
                validationStatus: 'pending'
            };
        });
        
        // Resetar análise (mantém-se igual)
        resetAnalysisData();
        
        // Resetar contadores (mantém-se igual)
        VDCSystem.counters = {
            dac7: 0,
            control: 0,
            saft: 0,
            invoices: 0,
            statements: 0,
            total: 0,
            parsed: 0,
            failed: 0,
            validated: 0
        };
        
        // Resetar intervalos (mantém-se igual)
        if (VDCSystem.bigDataAlertInterval) {
            clearInterval(VDCSystem.bigDataAlertInterval);
            VDCSystem.bigDataAlertInterval = null;
        }
        
        if (VDCSystem.discrepanciaAlertaInterval) {
            clearInterval(VDCSystem.discrepanciaAlertaInterval);
            VDCSystem.discrepanciaAlertaInterval = null;
        }
        
        // Atualizar UI (com otimização)
        scheduleDashboardUpdate();
        updateSessionInfo();
        generateMasterHash();
        clearConsole();
        
        // Limpar listas de ficheiros (mantém-se igual)
        const fileListIds = ['controlFileList', 'dac7FileList', 'saftFileList', 'invoiceFileList', 'statementFileList'];
        fileListIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.classList.remove('visible');
            }
        });
        
        // Resetar contadores visuais (mantém-se igual)
        const counterIds = ['controlCount', 'dac7Count', 'saftCount', 'invoiceCount', 'statementCount', 'totalCount'];
        counterIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
        
        // Resetar inputs de cliente (mantém-se igual)
        const clientName = document.getElementById('clientName');
        const clientNIF = document.getElementById('clientNIF');
        const clientStatus = document.getElementById('clientStatus');
        
        if (clientName) {
            clientName.value = '';
            clientName.classList.remove('success', 'error');
        }
        
        if (clientNIF) {
            clientNIF.value = '';
            clientNIF.classList.remove('success', 'error');
        }
        
        if (clientStatus) clientStatus.style.display = 'none';
        
        // Resetar botão de análise
        updateAnalysisButton();
        
        // Resetar gráfico (mantém-se igual)
        if (VDCSystem.chartInstance) {
            VDCSystem.chartInstance.destroy();
            VDCSystem.chartInstance = null;
        }
        
        // Resetar alertas (mantém-se igual)
        const alertIds = ['omissionAlert', 'diferencialAlert', 'regulatoryAlert', 'jurosAlert', 'bigDataAlert'];
        alertIds.forEach(id => {
            const alert = document.getElementById(id);
            if (alert) alert.style.display = 'none';
        });
        
        // Resetar cards especiais (mantém-se igual)
        const jurosCard = document.getElementById('jurosCard');
        const taxaRegCard = document.getElementById('taxaRegCard');
        const diferencialCard = document.getElementById('diferencialCard');
        const regulatoryCardKPI = document.getElementById('regulatoryCardKPI');
        
        if (jurosCard) jurosCard.style.display = 'none';
        if (taxaRegCard) taxaRegCard.style.display = 'none';
        if (diferencialCard) diferencialCard.remove();
        if (regulatoryCardKPI) regulatoryCardKPI.remove();
        
        logAudit('🔄 Dashboard reiniciado com sucesso', 'success');
        logAudit('📊 Sistema pronto para nova análise forense', 'info');
        showToast('Dashboard reiniciado com sucesso', 'success');
        
    } catch (error) {
        console.error('Erro ao resetar dashboard:', error);
        logAudit(`❌ Erro ao resetar dashboard: ${error.message}`, 'error');
        showError('Erro ao resetar dashboard');
    }
}

// 21. EXPORTAÇÃO DE DADOS COMPLETA (mantém-se igual)
// 22. INICIALIZAÇÃO FINAL (com otimização)

function finalizeInitialization() {
    // Atualizar análise após carregamento completo
    setTimeout(() => {
        scheduleDashboardUpdate();
        updateSessionInfo();
        generateMasterHash();
        
        logAudit('🎯 Sistema VDC v10.9-FS completamente inicializado (Otimizado)', 'success');
        logAudit('⚖️ Protocolos ISO/NIST ativos: 27037, 800-86, RGRC 4%, AMT/IMT', 'info');
        logAudit('📊 Dashboard forense pronto para análise Big Data de layering', 'success');
    }, 1000);
}

// Inicialização final
setTimeout(finalizeInitialization, 500);

// ============================================
// FIM DO SCRIPT VDC v10.9-FS (OTIMIZADO)
// ============================================
