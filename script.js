// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.8
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// REFACTORING COMPLETO COM PARSING HEURÍSTICO
// ============================================

// 1. ESTADO DO SISTEMA - TOTALMENTE ZERADO
const VDCSystem = {
    version: 'v10.8',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    
    documents: {
        control: { files: [], parsedData: null, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 } },
        invoices: { files: [], parsedData: [], totals: { commission: 0, iva23: 0, invoiceValue: 0, invoiceNumber: "N/D" } },
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            expected: 0,
            ganhosBrutos: 0,
            comissaoApp: 0,
            ganhosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
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
            portagens: 0,
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
            comissaoCalculada: 0,
            invoiceNumber: "N/D"
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
    fileProcessingPromises: []
};

// 2. MOTOR DE PARSING HEURÍSTICO - VDC v10.8 (REGRAS DO PERITO)
const RegexEngine = {
    // Padrões heurísticos para extração de valores - ATUALIZADOS COM REGRAS DO PERITO
    patterns: {
        // REGRAS DE FATURA (Total\s*([\d.,]+))
        totalFatura: /Total\s*([\d.,]+)/i,
        
        // REGRAS DE EXTRATO (Ganhos, Despesas, Ganhos líquidos)
        ganhos: /Ganhos\s*(?:Brutos)?\s*[:=]?\s*([\d.,]+)/i,
        despesas: /Despesas\s*[:=]?\s*([\d.,]+)/i,
        ganhosLiquidos: /Ganhos\s+L[ií]quidos\s*[:=]?\s*([\d.,]+)/i,
        
        // REGRAS DE TRANSAÇÕES
        campanhas: /Ganhos\s+da\s+campanha\s*[:=]?\s*([\d.,]+)/i,
        gorjetas: /Gorjetas\s+dos\s+passageiros\s*[:=]?\s*([\d.,]+)/i,
        cancelamentos: /Taxas\s+de\s+cancelamento\s*[:=]?\s*([\d.,]+)/i,
        portagens: /Portagens\s*[:=]?\s*([\d.,]+)/i,
        
        // Número da fatura
        numeroFatura: /(PT\d+-\d+)/i,
        
        // Transferência bancária
        transferencia: /Transfer[êe]ncia\s*(?:.*?)(?:Bolt|Uber|Plataforma)\s*([\d.,]+)/i
    },
    
    // FUNÇÃO DE NORMALIZAÇÃO (REMOVE SÍMBOLOS, CONVERTE , EM .)
    cleanValue: function(val) {
        if (!val || val === '') return 0;
        
        // Remove símbolos de moeda e espaços
        let clean = val.replace(/[€$\s]/g, '');
        
        // Substitui pontos de milhar (1.000 → 1000)
        clean = clean.replace(/\./g, '');
        
        // Substitui vírgula decimal por ponto (239,00 → 239.00)
        clean = clean.replace(',', '.');
        
        const number = parseFloat(clean);
        return isNaN(number) ? 0 : number;
    },
    
    // Extração de valores por âncora específica
    extractByAnchor: function(text, anchorType) {
        const pattern = this.patterns[anchorType];
        if (!pattern) return 0;
        
        const match = text.match(pattern);
        if (!match || !match[1]) return 0;
        
        return this.cleanValue(match[1]);
    },
    
    // Extração específica para faturas (PDF-to-Text) - REGRAS DO PERITO
    extractFromInvoice: function(text) {
        const extracted = {
            invoiceValue: 0,
            commission: 0,
            invoiceNumber: "N/D"
        };
        
        // Tentar encontrar o número da fatura
        const invoiceMatch = text.match(this.patterns.numeroFatura);
        if (invoiceMatch && invoiceMatch[1]) {
            extracted.invoiceNumber = invoiceMatch[1];
        }
        
        // REGRA DO PERITO: Total\s*([\d.,]+)
        const totalMatch = text.match(this.patterns.totalFatura);
        if (totalMatch && totalMatch[1]) {
            extracted.invoiceValue = this.cleanValue(totalMatch[1]);
        }
        
        // Fallback: procurar qualquer número grande
        if (extracted.invoiceValue === 0) {
            const numberPattern = /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g;
            const matches = text.match(numberPattern);
            if (matches) {
                const numbers = matches.map(match => this.cleanValue(match));
                const validNumbers = numbers.filter(n => n >= 10 && n <= 10000);
                if (validNumbers.length > 0) {
                    extracted.invoiceValue = Math.max(...validNumbers);
                }
            }
        }
        
        return extracted;
    },
    
    // Extração específica para extratos bancários - REGRAS DO PERITO
    extractFromStatement: function(text) {
        const extracted = {
            ganhosBrutos: 0,
            comissaoApp: 0,
            ganhosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
            bankTransfer: 0
        };
        
        // REGRAS DO PERITO: Ganhos, Despesas, Ganhos líquidos
        extracted.ganhosBrutos = this.extractByAnchor(text, 'ganhos');
        extracted.comissaoApp = -this.extractByAnchor(text, 'despesas'); // Negativo
        extracted.ganhosLiquidos = this.extractByAnchor(text, 'ganhosLiquidos');
        
        // REGRAS DO PERITO: Transações específicas
        extracted.campanhas = this.extractByAnchor(text, 'campanhas');
        extracted.gorjetas = this.extractByAnchor(text, 'gorjetas');
        extracted.cancelamentos = this.extractByAnchor(text, 'cancelamentos');
        extracted.portagens = this.extractByAnchor(text, 'portagens');
        
        // Transferência bancária
        extracted.bankTransfer = this.extractByAnchor(text, 'transferencia');
        
        // Se não encontrou transferência, usar ganhos líquidos
        if (extracted.bankTransfer === 0 && extracted.ganhosLiquidos > 0) {
            extracted.bankTransfer = extracted.ganhosLiquidos;
        }
        
        return extracted;
    }
};

// 3. SISTEMA DE LEITURA DE FICHEIROS COM PROMISES
const FileSystem = {
    readFileAsText: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    },
    
    processFilesSequentially: async function(files, processor) {
        const results = [];
        for (const file of files) {
            try {
                const text = await this.readFileAsText(file);
                const result = processor(text);
                results.push(result);
            } catch (error) {
                console.error(`Erro no ficheiro ${file.name}:`, error);
                results.push(null);
            }
        }
        return results;
    }
};

// 4. INICIALIZAÇÃO DO SISTEMA - COM DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v10.8...');
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = generateSessionId();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        // Configurar todos os event listeners
        await setupAllEventListeners();
        updateLoadingProgress(60);
        
        // Ativar botão demo
        setupDemoButton();
        updateLoadingProgress(70);
        
        // Inicializar com valores zerados
        resetDashboard();
        updateLoadingProgress(80);
        
        // Iniciar relógio e data
        startClockAndDate();
        updateLoadingProgress(90);
        
        // Renderizar gráfico vazio
        renderEmptyChart();
        updateLoadingProgress(95);
        
        setTimeout(async () => {
            updateLoadingProgress(100);
            
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v10.8 inicializado com sucesso', 'success');
                logAudit('Protocolo de Prova Legal ativado - Motor Heurístico Ativo', 'info');
                
                // Atualizar botão inicial
                updateAnalysisButton();
                
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

// 5. SETUP DE TODOS OS EVENT LISTENERS - CONSOLIDADO
async function setupAllEventListeners() {
    // Registro de cliente
    document.getElementById('registerClientBtn').addEventListener('click', registerClient);
    document.getElementById('saveClientBtn').addEventListener('click', saveClientData);
    
    // Botões Demo
    document.getElementById('btnDemoExtra').addEventListener('click', loadDemoData);
    document.getElementById('btnDemo').addEventListener('click', loadDemoData);
    
    // DAC7
    document.getElementById('calcDAC7Btn').addEventListener('click', calcularDiscrepanciaDAC7);
    
    // Upload de ficheiros
    setupFileUploadListeners();
    
    // Análise e Exportação
    document.getElementById('analyzeBtn').addEventListener('click', performForensicAnalysis);
    document.getElementById('exportJSONBtn').addEventListener('click', exportJSON);
    document.getElementById('exportPDFBtn').addEventListener('click', exportPDF);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
    
    // Console
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);
    document.getElementById('toggleConsoleBtn').addEventListener('click', toggleConsole);
    
    // Inputs de cliente (Enter para navegação)
    document.getElementById('clientName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('clientNIF').focus();
    });
    
    document.getElementById('clientNIF').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') registerClient();
    });
}

// 6. SETUP DE UPLOAD DE FICHEIROS
function setupFileUploadListeners() {
    const fileInputs = {
        'controlFileBtn': 'controlFile',
        'saftFileBtn': 'saftFile',
        'invoiceFileBtn': 'invoiceFile',
        'statementFileBtn': 'statementFile'
    };
    
    Object.entries(fileInputs).forEach(([btnId, inputId]) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            
            input.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const files = Array.from(e.target.files);
                    
                    // Adicionar à lista de processamento
                    VDCSystem.fileProcessingPromises.push(
                        processFilesByType(inputId, files)
                    );
                    
                    // Atualizar lista visual
                    updateFileList(inputId + 'List', files);
                    
                    // Atualizar contadores
                    updateCounter(inputId.replace('File', ''), files.length);
                    
                    // Aguardar processamento antes de atualizar botão
                    await Promise.all(VDCSystem.fileProcessingPromises);
                    updateAnalysisButton();
                }
            });
        }
    });
}

// 7. PROCESSAMENTO DE FICHEIROS POR TIPO
async function processFilesByType(type, files) {
    switch (type) {
        case 'controlFile':
            await processControlFile(files[0]);
            break;
        case 'saftFile':
            await processSaftFiles(files);
            break;
        case 'invoiceFile':
            await processInvoiceFiles(files);
            break;
        case 'statementFile':
            await processStatementFiles(files);
            break;
    }
}

// 8. FUNÇÕES DE PROCESSAMENTO COM PARSING HEURÍSTICO
async function processControlFile(file) {
    try {
        logAudit(`🔍 Processando ficheiro de controlo: ${file.name}`, 'info');
        
        const text = await FileSystem.readFileAsText(file);
        const extractedValues = RegexEngine.extractFromStatement(text);
        
        // Injetar valores extraídos
        Object.assign(VDCSystem.analysis.extractedValues, extractedValues);
        
        logAudit(`✅ Controlo processado: ${file.name}`, 'success');
        logAudit(`Valores extraídos: Ganhos ${extractedValues.ganhosBrutos}€, Líquido ${extractedValues.ganhosLiquidos}€`, 'info');
        
        VDCSystem.documents.control.files = [file];
        VDCSystem.documents.control.parsedData = extractedValues;
        
    } catch (error) {
        console.error('Erro no controlo:', error);
        logAudit(`❌ Erro no ficheiro de controlo: ${error.message}`, 'error');
    }
}

async function processSaftFiles(files) {
    try {
        logAudit(`🔍 Processando ${files.length} ficheiros SAF-T...`, 'info');
        
        let totalGross = 0;
        let totalIVA6 = 0;
        
        const results = await FileSystem.processFilesSequentially(files, (text) => {
            // Extrair do XML/CSV do SAF-T
            const values = extractFromSaft(text);
            return values;
        });
        
        results.forEach(values => {
            totalGross += values.gross || 0;
            totalIVA6 += values.iva6 || 0;
        });
        
        VDCSystem.analysis.extractedValues.saftGross = totalGross;
        VDCSystem.analysis.extractedValues.saftIVA6 = totalIVA6;
        
        logAudit(`✅ ${files.length} SAF-T processados: ${totalGross.toFixed(2)}€ | IVA 6%: ${totalIVA6.toFixed(2)}€`, 'success');
        
        VDCSystem.documents.saft.files = files;
        
    } catch (error) {
        console.error('Erro no SAF-T:', error);
        logAudit(`❌ Erro no processamento SAF-T: ${error.message}`, 'error');
    }
}

async function processInvoiceFiles(files) {
    try {
        logAudit(`🔍 Processando ${files.length} faturas...`, 'info');
        
        // Limpar acumuladores
        VDCSystem.documents.invoices.totals = { commission: 0, iva23: 0, invoiceValue: 0, invoiceNumber: "N/D" };
        VDCSystem.analysis.extractedValues.platformCommission = 0;
        VDCSystem.analysis.extractedValues.faturaPlataforma = 0;
        VDCSystem.analysis.extractedValues.invoiceNumber = "N/D";
        
        const results = await FileSystem.processFilesSequentially(files, (text) => {
            return RegexEngine.extractFromInvoice(text);
        });
        
        results.forEach(extracted => {
            VDCSystem.documents.invoices.totals.commission += extracted.commission;
            VDCSystem.documents.invoices.totals.invoiceValue += extracted.invoiceValue;
            
            if (extracted.invoiceNumber !== "N/D") {
                VDCSystem.documents.invoices.totals.invoiceNumber = extracted.invoiceNumber;
                VDCSystem.analysis.extractedValues.invoiceNumber = extracted.invoiceNumber;
            }
            
            VDCSystem.analysis.extractedValues.platformCommission += extracted.commission;
            VDCSystem.analysis.extractedValues.faturaPlataforma += extracted.invoiceValue;
        });
        
        logAudit(`✅ ${files.length} faturas processadas`, 'success');
        if (VDCSystem.analysis.extractedValues.invoiceNumber !== "N/D") {
            logAudit(`📄 Número da fatura identificado: ${VDCSystem.analysis.extractedValues.invoiceNumber}`, 'info');
        }
        
        VDCSystem.documents.invoices.files = files;
        
    } catch (error) {
        console.error('Erro nas faturas:', error);
        logAudit(`❌ Erro no processamento de faturas: ${error.message}`, 'error');
    }
}

async function processStatementFiles(files) {
    try {
        logAudit(`🔍 Processando ${files.length} extratos bancários...`, 'info');
        
        let totalTransfer = 0;
        
        const results = await FileSystem.processFilesSequentially(files, (text) => {
            return RegexEngine.extractFromStatement(text);
        });
        
        results.forEach(extracted => {
            totalTransfer += extracted.bankTransfer;
            
            // Combinar valores extraídos
            Object.keys(extracted).forEach(key => {
                if (extracted[key] > 0) {
                    VDCSystem.analysis.extractedValues[key] = 
                        (VDCSystem.analysis.extractedValues[key] || 0) + extracted[key];
                }
            });
        });
        
        VDCSystem.analysis.extractedValues.bankTransfer = totalTransfer;
        
        logAudit(`✅ ${files.length} extratos processados: ${totalTransfer.toFixed(2)}€`, 'success');
        
        VDCSystem.documents.statements.files = files;
        
    } catch (error) {
        console.error('Erro nos extratos:', error);
        logAudit(`❌ Erro no processamento de extratos: ${error.message}`, 'error');
    }
}

// 9. FUNÇÕES AUXILIARES DE PARSING
function extractFromSaft(text) {
    const values = { gross: 0, iva6: 0 };
    
    // Tentar XML primeiro
    if (text.includes('<GrossTotal>')) {
        const grossMatch = text.match(/<GrossTotal>([\d,]+\.?\d*)<\/GrossTotal>/);
        if (grossMatch) values.gross = RegexEngine.cleanValue(grossMatch[1]);
        
        const iva6Match = text.match(/<Tax>6%<\/Tax>.*?<TaxAmount>([\d,]+\.?\d*)<\/TaxAmount>/s);
        if (iva6Match) values.iva6 = RegexEngine.cleanValue(iva6Match[1]);
    }
    // Tentar CSV
    else if (text.includes(';')) {
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.includes('TotalGeral')) {
                const parts = line.split(';');
                if (parts.length > 1) {
                    values.gross = RegexEngine.cleanValue(parts[1]);
                }
            }
        });
    }
    
    return values;
}

// 10. FUNÇÃO LOAD DEMO DATA
async function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados de demonstração.\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS DE DEMONSTRAÇÃO...', 'info');
            
            // Limpar estado primeiro
            clearExtractedValues();
            resetDashboardDisplay();
            
            // Dados de demo com valores realistas
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
                portagens: 15.60,
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
                comissaoCalculada: 792.59,
                invoiceNumber: "PT1125-3582"
            };
            
            // Preencher campos do formulário
            document.getElementById('clientName').value = 'Momento Eficaz, Lda';
            document.getElementById('clientNIF').value = '123456789';
            document.getElementById('clientPhone').value = '+351 912 345 678';
            document.getElementById('clientEmail').value = 'contacto@momentoeficaz.pt';
            document.getElementById('clientAddress').value = 'Rua Principal, 123, Lisboa';
            
            // Registrar cliente automaticamente
            await registerClientFromDemo();
            
            // Ativar modo demo
            VDCSystem.demoMode = true;
            
            // Simular ficheiros carregados
            simulateUploadedFiles();
            
            // Atualizar botões demo
            updateDemoButtons();
            
            // Atualizar botão de análise
            updateAnalysisButton();
            
            logAudit('✅ Dados de demonstração carregados com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar demo:', error);
            logAudit(`❌ Erro ao carregar dados demo: ${error.message}`, 'error');
        }
    }
}

async function registerClientFromDemo() {
    VDCSystem.client = { 
        name: 'Momento Eficaz, Lda', 
        nif: '123456789',
        phone: '+351 912 345 678',
        email: 'contacto@momentoeficaz.pt',
        address: 'Rua Principal, 123, Lisboa',
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = 'Momento Eficaz, Lda';
}

function simulateUploadedFiles() {
    VDCSystem.documents.control.files = [
        { name: 'demo_control.csv', size: 1024, lastModified: Date.now() }
    ];
    
    VDCSystem.documents.saft.files = [
        { name: 'demo_saft.xml', size: 2048, lastModified: Date.now() }
    ];
    
    VDCSystem.documents.invoices.files = [
        { name: 'Fatura_Bolt_PT1125-3582.pdf', size: 2048, lastModified: Date.now() }
    ];
    
    VDCSystem.documents.statements.files = [
        { name: 'Extrato_Bolt_Dezembro2024.pdf', size: 2048, lastModified: Date.now() }
    ];
    
    VDCSystem.counters = { saft: 1, invoices: 1, statements: 1, total: 3 };
    
    updateFileList('controlFileList', VDCSystem.documents.control.files);
    updateFileList('saftFileList', VDCSystem.documents.saft.files);
    updateFileList('invoiceFileList', VDCSystem.documents.invoices.files);
    updateFileList('statementFileList', VDCSystem.documents.statements.files);
    
    document.getElementById('saftCount').textContent = '1';
    document.getElementById('invoiceCount').textContent = '1';
    document.getElementById('statementCount').textContent = '1';
    document.getElementById('totalCount').textContent = '3';
}

// 11. ANÁLISE FORENSE
async function performForensicAnalysis() {
    try {
        console.log('🚀 INICIANDO ANÁLISE FORENSE v10.8...');
        
        // Verificações de segurança
        if (!VDCSystem.client) {
            showError('❌ Por favor, registe um cliente primeiro');
            return;
        }
        
        const hasData = VDCSystem.documents.control.files.length > 0 || 
                       VDCSystem.documents.saft.files.length > 0 ||
                       VDCSystem.demoMode;
        
        if (!hasData) {
            showError('❌ Por favor, carregue ficheiros ou use dados demo');
            return;
        }
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE BIG DATA', 'success');
        
        // Cálculos dinâmicos
        const imtCalculos = calcularIMT();
        const diferencial = calcularDiferencialCusto();
        
        // Verificação de fraude por âncora
        await verificarFraudePorAncora();
        
        // Atualizações de interface
        updateDashboardWithExtractedValues();
        updateDashboard();
        updateResults();
        updateIMTDisplay(imtCalculos);
        updateChartWithData();
        criarDashboardDiferencial();
        generateMasterHash();
        
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        // Alertas se necessário
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

// 12. VERIFICAÇÃO DE FRAUDE POR ÂNCORA
async function verificarFraudePorAncora() {
    const ganhos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const portagens = VDCSystem.analysis.extractedValues.portagens || 0;
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const liquido = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    // Fórmula: (A + B) - Comissão != Líquido -> ALERTA DE FRAUDE
    const calculado = (ganhos + portagens) - comissao;
    const diferenca = Math.abs(calculado - liquido);
    
    if (diferenca > 0.01) {
        logAudit(`⚠️ ALERTA DE FRAUDE DETETADO!`, 'error');
        logAudit(`Fórmula: (${ganhos.toFixed(2)} + ${portagens.toFixed(2)}) - ${comissao.toFixed(2)} = ${calculado.toFixed(2)}`, 'error');
        logAudit(`Líquido real: ${liquido.toFixed(2)} | Diferença: ${diferenca.toFixed(2)}`, 'error');
        
        VDCSystem.analysis.anomalies.push({
            tipo: 'FRAUDE_POR_ANCORA',
            formula: `(Ganhos + Portagens) - Comissão ≠ Líquido`,
            valores: { ganhos, portagens, comissao, liquido, calculado, diferenca },
            timestamp: new Date().toISOString()
        });
    } else {
        logAudit(`✓ Fórmula verificada: (${ganhos.toFixed(2)} + ${portagens.toFixed(2)}) - ${comissao.toFixed(2)} = ${liquido.toFixed(2)}`, 'success');
    }
}

// 13. FUNÇÕES DE EXPORTAÇÃO PDF - COM CENTRALIZAÇÃO
async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // PÁGINA 1: RELATÓRIO PERICIAL
        await createPage1(doc);
        
        // PÁGINA 2: ANEXO TÉCNICO (CENTRALIZADO)
        await createPage2(doc);
        
        // DOWNLOAD
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = pdfUrl;
        
        const clienteNome = VDCSystem.client?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'CLIENTE';
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_RELATORIO_${clienteNome}_${dataStr}.pdf`;
        
        document.body.appendChild(a);
        a.click();
        
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

// FUNÇÃO: PÁGINA 1 DO RELATÓRIO
async function createPage1(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const centerX = pageWidth / 2;
    
    // CABEÇALHO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("VDC SISTEMA DE PERITAGEM FORENSE v10.8", centerX, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("Protocolo de Prova Legal | Big Data Forense | Gráfico Ativo", centerX, 30, { align: 'center' });
    
    // LINHA SEPARADORA
    doc.setDrawColor(0, 242, 255);
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);
    
    let posY = 50;
    
    // INFORMAÇÕES DA SESSÃO
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("INFORMAÇÕES DA SESSÃO", 20, posY);
    posY += 7;
    
    doc.setFont('helvetica', 'normal');
    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-PT');
    const horaStr = now.toLocaleTimeString('pt-PT');
    
    doc.text(`Data da Análise: ${dataStr} ${horaStr}`, 20, posY);
    posY += 5;
    doc.text(`Sessão: ${VDCSystem.sessionId || 'N/D'}`, 20, posY);
    posY += 5;
    doc.text(`Ano Fiscal Analisado: ${VDCSystem.selectedYear || 'N/D'}`, 20, posY);
    posY += 5;
    doc.text(`Plataforma: ${VDCSystem.selectedPlatform === 'bolt' ? 'Bolt (Estónia)' : 
              VDCSystem.selectedPlatform === 'uber' ? 'Uber (Holanda)' : 'Outra'}`, 20, posY);
    posY += 10;
    
    // INFORMAÇÕES DO CLIENTE
    doc.setFont('helvetica', 'bold');
    doc.text("INFORMAÇÕES DO CLIENTE", 20, posY);
    posY += 7;
    
    doc.setFont('helvetica', 'normal');
    if (VDCSystem.client) {
        doc.text(`Nome: ${VDCSystem.client.name || 'N/D'}`, 20, posY);
        posY += 5;
        doc.text(`NIF: ${VDCSystem.client.nif || 'N/D'}`, 20, posY);
        posY += 5;
        doc.text(`Telefone: ${VDCSystem.client.phone || 'N/D'}`, 20, posY);
        posY += 5;
        doc.text(`Email: ${VDCSystem.client.email || 'N/D'}`, 20, posY);
        posY += 5;
        doc.text(`Morada: ${VDCSystem.client.address || 'N/D'}`, 20, posY);
        posY += 10;
    } else {
        doc.text("Cliente não registado", 20, posY);
        posY += 10;
    }
    
    // RESUMO DA ANÁLISE
    doc.setFont('helvetica', 'bold');
    doc.text("RESUMO DA ANÁLISE FORENSE", 20, posY);
    posY += 7;
    
    doc.setFont('helvetica', 'normal');
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const numeroFatura = VDCSystem.analysis.extractedValues.invoiceNumber || "N/D";
    
    const textoResumo = `Esta peritagem foi realizada sobre os documentos financeiros do período acima indicado, 
    com foco na reconciliação entre a contabilidade oficial (SAF-T) e os extratos da plataforma digital.

    Fatura analisada: ${numeroFatura}
    Ganhos Brutos: ${formatter.format(VDCSystem.analysis.extractedValues.ganhosBrutos || 0)}
    Comissão da Plataforma: ${formatter.format(Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0)}
    Ganhos Líquidos: ${formatter.format(VDCSystem.analysis.extractedValues.ganhosLiquidos || 0)}
    Diferencial Identificado: ${formatter.format(VDCSystem.analysis.extractedValues.diferencialCusto || 0)}
    
    Metodologia: Análise algorítmica forense com cruzamento de dados entre documentos oficiais,
    aplicação de padrões heurísticos para extração de valores e verificação de conformidade fiscal.`;
    
    const splitText = doc.splitTextToSize(textoResumo, 170);
    splitText.forEach(line => {
        if (posY > 250) {
            doc.addPage();
            posY = 20;
        }
        doc.text(line, 20, posY);
        posY += 5;
    });
}

// FUNÇÃO: PÁGINA 2 DO RELATÓRIO (ANEXO TÉCNICO CENTRALIZADO)
async function createPage2(doc) {
    doc.addPage();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    
    // TÍTULO CENTRALIZADO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("ANNEX: INFORMAÇÃO GERAL SOBRE AS EVIDÊNCIAS", centerX, 30, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let posY = 50;
    
    // CONTEÚDO DO ANEXO (TEXTO CENTRALIZADO)
    const anexoConteudo = [
        "Este anexo técnico descreve a metodologia de processamento de dados aplicada.",
        "",
        "Integridade da Fonte: Os dados brutos foram extraídos diretamente de ficheiros",
        "PDF oficiais (Faturas de Plataforma e Extratos) e ficheiros SAF-T (PT).",
        "",
        "Processamento Forense: O sistema utiliza algoritmos de reconciliação para",
        "identificar discrepâncias entre o rendimento declarado e o fluxo de caixa efetivo.",
        "",
        "Protocolo de Validação: A análise foca-se na neutralidade fiscal, comparando",
        "os vértices de faturação própria, comissões retidas e recebimentos bancários.",
        "",
        "Nota de Confidencialidade: Este relatório é para uso exclusivo em contexto",
        "de auditoria e peritagem financeira."
    ];
    
    // DESENHAR CADA LINHA CENTRALIZADA
    anexoConteudo.forEach(linea => {
        if (posY > 250) {
            doc.addPage();
            posY = 30;
        }
        
        doc.text(linea, centerX, posY, { align: 'center' });
        posY += 8;
    });
    
    // RODAPÉ EM TODAS AS PÁGINAS
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v10.8 | Protocolo de Prova Legal", 15, 285);
        doc.text(`Página ${i} de ${totalPages}`, 185, 285, { align: "right" });
    }
}

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) progressBar.style.width = percent + '%';
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            setTimeout(() => mainContainer.style.opacity = '1', 50);
        }, 500);
    }
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
        logAudit(`Plataforma selecionada: ${platformName}`, 'info');
        updateAnalysisButton();
    });
}

function setupDemoButton() {
    const demoBtn = document.getElementById('btnDemo');
    if (demoBtn) demoBtn.classList.add('btn-demo-active');
}

function clearExtractedValues() {
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, platformCommission: 0, bankTransfer: 0,
        iva23Due: 0, ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
        faturaPlataforma: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0,
        portagens: 0, diferencialCusto: 0, prejuizoFiscal: 0, imtBase: 0,
        imtTax: 0, imtTotal: 0, dac7Value: 0, dac7Discrepancy: 0, valorIliquido: 0,
        iva6Percent: 0, iva23Autoliquidacao: 0, comissaoCalculada: 0, invoiceNumber: "N/D"
    };
}

function resetDashboardDisplay() {
    // Resetar valores de exibição
    ['kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice', 'valCamp', 'valTips', 'valCanc',
     'netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'grossResult', 'transferResult',
     'differenceResult', 'marketResult', 'imtBase', 'imtTax', 'imtTotal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = id === 'marketResult' ? '0,00M€' : '0,00€';
    });
    
    document.querySelectorAll('.bar-fill').forEach(bar => bar.style.width = '0%');
    
    const diferencialCard = document.getElementById('diferencialCard');
    if (diferencialCard) diferencialCard.remove();
    
    const omissionAlert = document.getElementById('omissionAlert');
    if (omissionAlert) omissionAlert.style.display = 'none';
    
    const diferencialAlert = document.getElementById('diferencialAlert');
    if (diferencialAlert) diferencialAlert.remove();
    
    const dac7Result = document.getElementById('dac7Result');
    if (dac7Result) dac7Result.style.display = 'none';
    
    if (VDCSystem.chart) {
        VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0];
        VDCSystem.chart.update();
    }
}

function resetDashboard() {
    resetDashboardDisplay();
    
    document.getElementById('clientName').value = '';
    document.getElementById('clientNIF').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
    
    const clientStatus = document.getElementById('clientStatus');
    if (clientStatus) clientStatus.style.display = 'none';
    
    VDCSystem.client = null;
    VDCSystem.demoMode = false;
    
    ['controlFileList', 'saftFileList', 'invoiceFileList', 'statementFileList'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    ['saftCount', 'invoiceCount', 'statementCount', 'totalCount'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
    
    logAudit('📊 Dashboard resetado - Aguardando novos dados', 'info');
    updateAnalysisButton();
}

async function registerClient() {
    const name = document.getElementById('clientName')?.value.trim();
    const nif = document.getElementById('clientNIF')?.value.trim();
    const phone = document.getElementById('clientPhone')?.value.trim();
    const email = document.getElementById('clientEmail')?.value.trim();
    const address = document.getElementById('clientAddress')?.value.trim();
    
    if (!name || name.length < 3) {
        showError('Nome do cliente inválido (mínimo 3 caracteres)');
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        showError('NIF inválido (deve ter 9 dígitos)');
        return;
    }
    
    VDCSystem.client = { 
        name, nif, 
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
    updateAnalysisButton();
}

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
    const counterId = {
        'saft': 'saftCount',
        'invoices': 'invoiceCount',
        'statements': 'statementCount'
    }[type];
    
    if (counterId) {
        const element = document.getElementById(counterId);
        if (element) element.textContent = count;
        VDCSystem.counters[type] = count;
    }
    
    const total = VDCSystem.counters.saft + VDCSystem.counters.invoices + VDCSystem.counters.statements;
    const totalElement = document.getElementById('totalCount');
    if (totalElement) totalElement.textContent = total;
    VDCSystem.counters.total = total;
}

function calcularDiscrepanciaDAC7() {
    const dac7Value = parseFloat(document.getElementById('dac7Value').value) || 0;
    
    if (dac7Value <= 0) {
        showError('Por favor, insira um valor válido para DAC7');
        return;
    }
    
    const comissaoReal = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const comissaoRealAnual = comissaoReal * 12;
    const discrepancia = Math.abs(dac7Value - comissaoRealAnual);
    
    VDCSystem.analysis.extractedValues.dac7Value = dac7Value;
    VDCSystem.analysis.extractedValues.dac7Discrepancy = discrepancia;
    
    const dac7Result = document.getElementById('dac7Result');
    const dac7Discrepancy = document.getElementById('dac7Discrepancy');
    
    if (dac7Result) dac7Result.style.display = 'flex';
    if (dac7Discrepancy) {
        const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
        dac7Discrepancy.textContent = formatter.format(discrepancia);
    }
    
    logAudit(`📊 DAC7: Valor declarado ${dac7Value.toFixed(2)}€ vs Real ${comissaoRealAnual.toFixed(2)}€ | Discrepância: ${discrepancia.toFixed(2)}€`, 'warn');
}

function calcularIMT() {
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const gorjetas = VDCSystem.analysis.extractedValues.gorjetas || 0;
    const campanhas = VDCSystem.analysis.extractedValues.campanhas || 0;
    
    const baseComissao = ganhosBrutos - gorjetas - campanhas;
    const taxaComissao = 0.2477;
    const comissaoCalculada = baseComissao * taxaComissao;
    
    const taxaIMT = 0.05;
    const imtTax = comissaoCalculada * taxaIMT;
    const totalPlataforma = comissaoCalculada + imtTax;
    
    VDCSystem.analysis.extractedValues.imtBase = comissaoCalculada;
    VDCSystem.analysis.extractedValues.imtTax = imtTax;
    VDCSystem.analysis.extractedValues.imtTotal = totalPlataforma;
    
    return { baseComissao, comissaoCalculada, imtTax, totalPlataforma };
}

function calcularDiferencialCusto() {
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const fatura = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    
    const diferencial = Math.abs(comissao) - fatura;
    const prejuizoFiscal = diferencial * 0.21;
    const ivaAutoliquidacao = diferencial * 0.23;
    
    VDCSystem.analysis.extractedValues.diferencialCusto = diferencial;
    VDCSystem.analysis.extractedValues.prejuizoFiscal = prejuizoFiscal;
    VDCSystem.analysis.extractedValues.iva23Due = ivaAutoliquidacao;
    VDCSystem.analysis.crossings.diferencialAlerta = diferencial > 0;
    
    logAudit(`📊 DIFERENCIAL: ${diferencial.toFixed(2)}€ | Prejuízo Fiscal: ${prejuizoFiscal.toFixed(2)}€ | IVA: ${ivaAutoliquidacao.toFixed(2)}€`, 'warn');
    
    return diferencial;
}

function criarDashboardDiferencial() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection || document.getElementById('diferencialCard')) return;
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
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
    
    logAudit(`📊 Dashboard diferencial criado: ${diferencial.toFixed(2)}€`, 'info');
}

function renderEmptyChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        
        if (VDCSystem.chart) VDCSystem.chart.destroy();
        
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
                borderColor: ['#00f2ff', '#3b82f6', '#ff3e3e', '#f59e0b'],
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
                plugins: { legend: { display: false } }
            }
        });
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
    }
}

function updateChartWithData() {
    if (!VDCSystem.chart) return;
    
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

function updateDashboardWithExtractedValues() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
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
        if (element) element.textContent = formatter.format(value);
    });
}

function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
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
        if (elemento) elemento.textContent = formatter.format(value);
    });
}

function updateIMTDisplay(imtCalculos) {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const elementos = {
        'imtBase': imtCalculos.comissaoCalculada,
        'imtTax': imtCalculos.imtTax,
        'imtTotal': imtCalculos.totalPlataforma
    };
    
    Object.entries(elementos).forEach(([id, value]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = formatter.format(value);
    });
    
    logAudit(`📊 IMT Calculado: Base ${imtCalculos.baseComissao.toFixed(2)}€ | Comissão ${imtCalculos.comissaoCalculada.toFixed(2)}€ | IMT ${imtCalculos.imtTax.toFixed(2)}€`, 'info');
}

function updateResults() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
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
                formatter.format(value) : value + (id === 'marketResult' ? 'M€' : '€');
        }
    });
}

function showDiferencialAlert() {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
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

async function saveClientData() {
    try {
        if (!VDCSystem.client) {
            showError('Nenhum cliente registado para guardar');
            return;
        }
        
        logAudit('💾 PREPARANDO PARA GUARDAR DADOS DO CLIENTE...', 'info');
        
        const clientData = {
            sistema: "VDC Forensic System v10.8",
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            analise: {
                valores: VDCSystem.analysis.extractedValues,
                cruzamentos: VDCSystem.analysis.crossings
            }
        };
        
        const jsonStr = JSON.stringify(clientData, null, 2);
        
        if ('showSaveFilePicker' in window) {
            try {
                const options = {
                    suggestedName: `VDC_CLIENTE_${VDCSystem.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${VDCSystem.client.nif}.json`,
                    types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }]
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
        
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_CLIENTE_${VDCSystem.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${VDCSystem.client.nif}.json`;
        
        document.body.appendChild(a);
        a.click();
        
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

async function exportJSON() {
    try {
        logAudit('💾 PREPARANDO PROVA DIGITAL (JSON)...', 'info');
        
        const evidenceData = {
            sistema: "VDC Forensic System v10.8",
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
        
        if ('showSaveFilePicker' in window) {
            try {
                const options = {
                    suggestedName: `VDC_PROVA_${VDCSystem.sessionId}.json`,
                    types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }]
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
        
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_PROVA_${VDCSystem.sessionId}_${dataStr}.json`;
        
        document.body.appendChild(a);
        a.click();
        
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

function clearAllData() {
    if (confirm('⚠️  ATENÇÃO: Todos os dados não exportados serão perdidos.\n\nTem certeza que deseja iniciar uma nova sessão?')) {
        window.location.reload();
    }
}

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { 
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    const logEntry = { timestamp, type, message };
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
    const colors = { success: '#10b981', warn: '#f59e0b', error: '#ff3e3e', info: '#3b82f6' };
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

function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function generateMasterHash() {
    // Verificar se CryptoJS está disponível
    if (typeof CryptoJS === 'undefined') {
        console.warn('CryptoJS não está disponível. Usando fallback para hash.');
        const fallbackHash = `VDC-${VDCSystem.sessionId}-${Date.now()}`;
        const display = document.getElementById('masterHashValue');
        if (display) {
            display.textContent = fallbackHash;
            display.style.color = '#00f2ff';
        }
        logAudit(`🔐 Master Hash gerada (fallback): ${fallbackHash}`, 'success');
        return;
    }
    
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

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasControl = VDCSystem.documents.control.files.length > 0 || VDCSystem.demoMode;
    const hasSaft = VDCSystem.documents.saft.files.length > 0 || VDCSystem.demoMode;
    const hasClient = VDCSystem.client !== null;
    
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

function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
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

// Funções auxiliares para botões demo
function updateDemoButtons() {
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
    
    // Reativar após 3 segundos
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
}
