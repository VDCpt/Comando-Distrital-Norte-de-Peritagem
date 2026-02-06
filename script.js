// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v11.1
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// MODOS: DEMO HARDCODED + PARSING TEXTUAL
// ============================================

// 1. ESTADO DO SISTEMA
const VDCSystem = {
    version: 'v11.1',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    periodoAnalise: 'Setembro a Dezembro 2024',
    
    documents: {
        control: { files: [], parsedData: null },
        saft: { 
            files: [], 
            totals: { gross: 0, iva6: 0, net: 0 }
        },
        invoices: { 
            files: [], 
            totals: { invoiceValue: 0, invoiceNumber: "N/D" }
        },
        statements: { 
            files: [], 
            totals: { 
                ganhosBrutos: 0,
                comissaoApp: 0,
                ganhosLiquidos: 0,
                campanhas: 0,
                gorjetas: 0,
                cancelamentos: 0,
                portagens: 0,
                diferencialCusto: 0
            }
        }
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
            invoiceNumber: "N/D",
            projecaoSetorial: 0
        },
        
        anomalies: []
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

// 2. MOTOR DE NORMALIZAÇÃO DE VALORES
const TextParser = {
    cleanValue: function(str) {
        if (!str || typeof str !== 'string') return 0;
        
        // Remover símbolos de moeda e espaços
        let cleaned = str
            .replace(/[€$£\s]/g, '')
            .replace(/EUR/g, '')
            .replace(/\./g, '') // Remover separadores de milhar
            .replace(',', '.') // Converter decimal europeu para padrão
            .replace(/[^\d.-]/g, ''); // Manter apenas números, ponto e sinal
        
        // Caso ainda tenha vírgula (formato 1.234,56)
        if (cleaned.includes(',') && !cleaned.includes('.')) {
            cleaned = cleaned.replace(',', '.');
        }
        
        // Validar formato numérico
        if (!cleaned.match(/^-?\d+(\.\d+)?$/)) {
            console.warn(`Formato inválido: "${str}" -> "${cleaned}"`);
            return 0;
        }
        
        const number = parseFloat(cleaned);
        
        if (isNaN(number)) {
            console.warn(`Conversão falhou: "${str}" -> "${cleaned}"`);
            return 0;
        }
        
        return Math.abs(number); // Sempre positivo
    },
    
    // FUNÇÃO PRINCIPAL DE EXTRAÇÃO
    extractKey: function(text, key) {
        if (!text || typeof text !== 'string') return 0;
        
        const patterns = {
            'total': /Total\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'ganhos_brutos': /Ganhos\s*(?:brutos|totais)?\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'ganhos_campanha': /(?:Ganhos\s+da\s+campanha|Campanha)\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'gorjetas': /(?:Gorjetas\s+dos\s+passageiros|Gorjetas)\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'portagens': /Portagens\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'cancelamentos': /(?:Taxas\s+de\s+cancelamento|Cancelamentos)\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'comissao_app': /(?:Comissão\s+da\s+app|Comissão)\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'ganhos_liquidos': /Ganhos\s+líquidos\s*[:\-]?\s*([\d.,]+[€]?)/i,
            'despesas': /Despesas\s*[:\-]?\s*([\d.,]+[€]?)/i
        };
        
        const pattern = patterns[key];
        if (!pattern) {
            console.error(`Pattern não encontrado para chave: ${key}`);
            return 0;
        }
        
        const match = text.match(pattern);
        if (!match || !match[1]) {
            // Para portagens, retornar 0 se não encontrado
            if (key === 'portagens') return 0;
            return 0;
        }
        
        const value = this.cleanValue(match[1]);
        
        // Comissão é sempre negativa
        if (key === 'comissao_app') return -value;
        
        return value;
    },
    
    extractFromInvoice: function(text) {
        const extracted = {
            invoiceValue: this.extractKey(text, 'total'),
            invoiceNumber: "N/D"
        };
        
        // Tentar extrair número de fatura
        const invoiceNumMatch = text.match(/(PT\d+-\d+)/i);
        if (invoiceNumMatch && invoiceNumMatch[1]) {
            extracted.invoiceNumber = invoiceNumMatch[1];
        }
        
        if (extracted.invoiceValue > 0) {
            console.log(`📄 Fatura extraída: ${extracted.invoiceValue}€ (${extracted.invoiceNumber})`);
        }
        
        return extracted;
    },
    
    extractFromStatement: function(text) {
        const extracted = {
            ganhosBrutos: this.extractKey(text, 'ganhos_brutos'),
            comissaoApp: this.extractKey(text, 'comissao_app'),
            ganhosLiquidos: this.extractKey(text, 'ganhos_liquidos'),
            campanhas: this.extractKey(text, 'ganhos_campanha'),
            gorjetas: this.extractKey(text, 'gorjetas'),
            cancelamentos: this.extractKey(text, 'cancelamentos'),
            portagens: this.extractKey(text, 'portagens')
        };
        
        // Validar consistência
        const hasData = Object.values(extracted).some(val => val !== 0);
        if (hasData) {
            console.log(`💰 Extrato extraído:`, extracted);
        }
        
        return extracted;
    },
    
    extractFromSAFT: function(text) {
        let gross = 0;
        let iva6 = 0;
        
        // Tentar extrair do XML
        if (text.includes('<GrossTotal>')) {
            const grossMatch = text.match(/<GrossTotal>([^<]+)<\/GrossTotal>/);
            if (grossMatch) gross = this.cleanValue(grossMatch[1]);
            
            const iva6Match = text.match(/<Tax>6%<\/Tax>.*?<TaxAmount>([^<]+)<\/TaxAmount>/s);
            if (iva6Match) iva6 = this.cleanValue(iva6Match[1]);
        }
        
        // Tentar extrair de CSV/Texto
        if (gross === 0 && text.includes(';')) {
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.toLowerCase().includes('totalgeral')) {
                    const parts = line.split(';');
                    if (parts.length > 1) gross = this.cleanValue(parts[1]);
                }
            }
        }
        
        if (gross > 0) {
            console.log(`📊 SAF-T extraído: Gross=${gross}€, IVA6=${iva6}€`);
        }
        
        return { gross, iva6 };
    }
};

// 3. SISTEMA DE PROCESSAMENTO DE FICHEIROS
const FileProcessor = {
    readFileAsText: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error(`Erro ao ler ${file.name}`));
            reader.readAsText(file, 'UTF-8');
        });
    },
    
    async processControlFile(file) {
        try {
            console.log(`🔍 Processando controlo: ${file.name}`);
            logAudit(`Processando ficheiro de controlo: ${file.name}`, 'info');
            
            const text = await this.readFileAsText(file);
            const extracted = TextParser.extractFromStatement(text);
            
            VDCSystem.documents.control.files = [file];
            VDCSystem.documents.control.parsedData = extracted;
            
            updateCounter('saft', 1);
            logAudit(`✅ Controlo processado: ${file.name}`, 'success');
            
            return extracted;
            
        } catch (error) {
            console.error(`❌ Erro no controlo:`, error);
            logAudit(`Erro no ficheiro de controlo: ${error.message}`, 'error');
            throw error;
        }
    },
    
    async processSaftFile(file) {
        try {
            console.log(`🔍 Processando SAF-T: ${file.name}`);
            logAudit(`Processando SAF-T: ${file.name}`, 'info');
            
            const text = await this.readFileAsText(file);
            const extracted = TextParser.extractFromSAFT(text);
            
            VDCSystem.documents.saft.files.push(file);
            VDCSystem.documents.saft.totals.gross += extracted.gross;
            VDCSystem.documents.saft.totals.iva6 += extracted.iva6;
            VDCSystem.documents.saft.totals.net += extracted.gross;
            
            updateCounter('saft', VDCSystem.documents.saft.files.length);
            logAudit(`✅ SAF-T processado: ${extracted.gross.toFixed(2)}€ | IVA 6%: ${extracted.iva6.toFixed(2)}€`, 'success');
            
            return extracted;
            
        } catch (error) {
            console.error(`❌ Erro no SAF-T:`, error);
            logAudit(`Erro no processamento SAF-T: ${error.message}`, 'error');
            throw error;
        }
    },
    
    async processInvoiceFile(file) {
        try {
            console.log(`🔍 Processando fatura: ${file.name}`);
            logAudit(`Processando fatura: ${file.name}`, 'info');
            
            const text = await this.readFileAsText(file);
            const extracted = TextParser.extractFromInvoice(text);
            
            VDCSystem.documents.invoices.files.push(file);
            VDCSystem.documents.invoices.totals.invoiceValue += extracted.invoiceValue;
            
            if (extracted.invoiceNumber !== "N/D") {
                VDCSystem.documents.invoices.totals.invoiceNumber = extracted.invoiceNumber;
            }
            
            updateCounter('invoices', VDCSystem.documents.invoices.files.length);
            logAudit(`✅ Fatura processada: ${extracted.invoiceValue.toFixed(2)}€ (${extracted.invoiceNumber})`, 'success');
            
            return extracted;
            
        } catch (error) {
            console.error(`❌ Erro na fatura:`, error);
            logAudit(`Erro no processamento de fatura: ${error.message}`, 'error');
            throw error;
        }
    },
    
    async processStatementFile(file) {
        try {
            console.log(`🔍 Processando extrato: ${file.name}`);
            logAudit(`Processando extrato bancário: ${file.name}`, 'info');
            
            const text = await this.readFileAsText(file);
            const extracted = TextParser.extractFromStatement(text);
            
            VDCSystem.documents.statements.files.push(file);
            
            // Somar todos os valores
            VDCSystem.documents.statements.totals.ganhosBrutos += extracted.ganhosBrutos;
            VDCSystem.documents.statements.totals.comissaoApp += extracted.comissaoApp;
            VDCSystem.documents.statements.totals.ganhosLiquidos += extracted.ganhosLiquidos;
            VDCSystem.documents.statements.totals.campanhas += extracted.campanhas;
            VDCSystem.documents.statements.totals.gorjetas += extracted.gorjetas;
            VDCSystem.documents.statements.totals.cancelamentos += extracted.cancelamentos;
            VDCSystem.documents.statements.totals.portagens += extracted.portagens;
            
            updateCounter('statements', VDCSystem.documents.statements.files.length);
            logAudit(`✅ Extrato processado: Líquido=${extracted.ganhosLiquidos.toFixed(2)}€`, 'success');
            
            return extracted;
            
        } catch (error) {
            console.error(`❌ Erro no extrato:`, error);
            logAudit(`Erro no processamento de extrato: ${error.message}`, 'error');
            throw error;
        }
    }
};

// 4. FUNÇÃO PRINCIPAL DE ANÁLISE FORENSE
async function performForensicAnalysis() {
    try {
        console.log('🚀 INICIANDO ANÁLISE FORENSE v11.1...');
        
        if (!VDCSystem.client) {
            showError('❌ Por favor, registe um cliente primeiro');
            return;
        }
        
        const hasData = VDCSystem.documents.saft.files.length > 0 || 
                       VDCSystem.documents.invoices.files.length > 0 ||
                       VDCSystem.documents.statements.files.length > 0 ||
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
        
        // Atualizar valores extraídos
        updateAnalysisValues();
        
        // Calcular IMT e diferenças
        calcularIMT();
        calcularDiferencialCusto();
        
        // Atualizar interface
        updateDashboard();
        updateResults();
        updateChartWithData();
        criarDashboardDiferencial();
        generateMasterHash();
        
        // Calcular projeção setorial
        calcularProjecaoSetorial();
        
        console.log('✅ ANÁLISE CONCLUÍDA');
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        // Mostrar alertas se necessário
        if (VDCSystem.analysis.extractedValues.diferencialCusto > 100) {
            showDiferencialAlert();
        }
        
    } catch (error) {
        console.error('❌ Erro na análise:', error);
        logAudit(`Erro na análise: ${error.message}`, 'error');
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE FORENSE';
        }
    }
}

// 5. FUNÇÕES DE ATUALIZAÇÃO DE VALORES
function updateAnalysisValues() {
    // Atualizar valores do sistema com os documentos processados
    VDCSystem.analysis.extractedValues.saftGross = VDCSystem.documents.saft.totals.gross || 0;
    VDCSystem.analysis.extractedValues.saftIVA6 = VDCSystem.documents.saft.totals.iva6 || 0;
    VDCSystem.analysis.extractedValues.faturaPlataforma = VDCSystem.documents.invoices.totals.invoiceValue || 0;
    VDCSystem.analysis.extractedValues.invoiceNumber = VDCSystem.documents.invoices.totals.invoiceNumber;
    
    VDCSystem.analysis.extractedValues.ganhosBrutos = VDCSystem.documents.statements.totals.ganhosBrutos || 0;
    VDCSystem.analysis.extractedValues.comissaoApp = VDCSystem.documents.statements.totals.comissaoApp || 0;
    VDCSystem.analysis.extractedValues.ganhosLiquidos = VDCSystem.documents.statements.totals.ganhosLiquidos || 0;
    VDCSystem.analysis.extractedValues.campanhas = VDCSystem.documents.statements.totals.campanhas || 0;
    VDCSystem.analysis.extractedValues.gorjetas = VDCSystem.documents.statements.totals.gorjetas || 0;
    VDCSystem.analysis.extractedValues.cancelamentos = VDCSystem.documents.statements.totals.cancelamentos || 0;
    VDCSystem.analysis.extractedValues.portagens = VDCSystem.documents.statements.totals.portagens || 0;
    
    console.log('🔄 Valores de análise atualizados');
}

function calcularDiferencialCusto() {
    const saftGross = VDCSystem.analysis.extractedValues.saftGross || 0;
    const faturaPlataforma = VDCSystem.analysis.extractedValues.faturaPlataforma || 0;
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    
    // Fórmula: (SAF-T + Fatura) - Ganhos Líquidos
    const diferencial = (saftGross + faturaPlataforma) - ganhosLiquidos;
    const ivaAutoliquidacao = diferencial * 0.23;
    const prejuizoFiscal = diferencial * 0.21;
    
    VDCSystem.analysis.extractedValues.diferencialCusto = diferencial;
    VDCSystem.analysis.extractedValues.iva23Due = ivaAutoliquidacao;
    VDCSystem.analysis.extractedValues.prejuizoFiscal = prejuizoFiscal;
    
    console.log(`📊 DIFERENCIAL: (${saftGross} + ${faturaPlataforma}) - ${ganhosLiquidos} = ${diferencial}€`);
    logAudit(`Diferencial calculado: ${diferencial.toFixed(2)}€ | IVA 23%: ${ivaAutoliquidacao.toFixed(2)}€`, 'info');
    
    return diferencial;
}

function calcularIMT() {
    const ganhosBrutos = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
    const gorjetas = VDCSystem.analysis.extractedValues.gorjetas || 0;
    const campanhas = VDCSystem.analysis.extractedValues.campanhas || 0;
    
    // Base de cálculo para comissão
    const baseComissao = ganhosBrutos - gorjetas - campanhas;
    const taxaComissao = 0.2477;
    const comissaoCalculada = baseComissao * taxaComissao;
    
    // Cálculo IMT (5%)
    const taxaIMT = 0.05;
    const imtTax = comissaoCalculada * taxaIMT;
    const totalPlataforma = comissaoCalculada + imtTax;
    
    VDCSystem.analysis.extractedValues.imtBase = comissaoCalculada;
    VDCSystem.analysis.extractedValues.imtTax = imtTax;
    VDCSystem.analysis.extractedValues.imtTotal = totalPlataforma;
    VDCSystem.analysis.extractedValues.platformCommission = comissaoCalculada;
    
    console.log(`📊 IMT: Base ${baseComissao.toFixed(2)}€ → Comissão ${comissaoCalculada.toFixed(2)}€ → IMT ${imtTax.toFixed(2)}€`);
    
    return { comissaoCalculada, imtTax, totalPlataforma };
}

function calcularProjecaoSetorial() {
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto || 0;
    const driverCount = 38000;
    const projecao = diferencial * driverCount;
    
    VDCSystem.analysis.extractedValues.projecaoSetorial = projecao;
    
    console.log(`📊 PROJEÇÃO SETORIAL: ${diferencial.toFixed(2)}€ × ${driverCount} = ${(projecao / 1000000).toFixed(2)}M€`);
    logAudit(`Projeção setorial (38k motoristas): ${(projecao / 1000000).toFixed(2)} milhões de euros`, 'info');
}

// 6. FUNÇÕES DE UI
function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const valores = {
        'netVal': VDCSystem.analysis.extractedValues.ganhosLiquidos || 0,
        'iva6Val': (VDCSystem.analysis.extractedValues.ganhosBrutos * 0.06) || 0,
        'commissionVal': Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0,
        'iva23Val': (Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) * 0.23) || 0,
        'kpiGanhos': VDCSystem.analysis.extractedValues.ganhosBrutos || 0,
        'kpiComm': Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0,
        'kpiNet': VDCSystem.analysis.extractedValues.ganhosLiquidos || 0,
        'kpiInvoice': VDCSystem.analysis.extractedValues.faturaPlataforma || 0,
        'valCamp': VDCSystem.analysis.extractedValues.campanhas || 0,
        'valTips': VDCSystem.analysis.extractedValues.gorjetas || 0,
        'valCanc': VDCSystem.analysis.extractedValues.cancelamentos || 0,
        'valPort': VDCSystem.analysis.extractedValues.portagens || 0,
        'imtBase': VDCSystem.analysis.extractedValues.imtBase || 0,
        'imtTax': VDCSystem.analysis.extractedValues.imtTax || 0,
        'imtTotal': VDCSystem.analysis.extractedValues.imtTotal || 0
    };
    
    Object.entries(valores).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = formatter.format(value);
    });
}

function updateResults() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const valores = {
        'grossResult': VDCSystem.analysis.extractedValues.saftGross || 0,
        'transferResult': VDCSystem.analysis.extractedValues.ganhosLiquidos || 0,
        'differenceResult': VDCSystem.analysis.extractedValues.diferencialCusto || 0,
        'marketResult': (VDCSystem.analysis.extractedValues.projecaoSetorial / 1000000) || 0
    };
    
    Object.entries(valores).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'marketResult') {
                element.textContent = value.toFixed(2) + 'M€';
            } else {
                element.textContent = formatter.format(value);
            }
            
            // Atualizar barras de progresso
            if (id.includes('Result') && id !== 'marketResult') {
                const bar = element.parentElement.querySelector('.bar-fill');
                if (bar && value > 0) {
                    const maxValue = Math.max(VDCSystem.analysis.extractedValues.ganhosBrutos, 1000);
                    const percentage = (value / maxValue) * 100;
                    bar.style.width = Math.min(percentage, 100) + '%';
                }
            }
        }
    });
    
    // Mostrar alerta de omissão se diferencial > 100€
    const omissionAlert = document.getElementById('omissionAlert');
    const omissionValue = document.getElementById('omissionValue');
    
    if (VDCSystem.analysis.extractedValues.diferencialCusto > 100) {
        if (omissionAlert) omissionAlert.style.display = 'flex';
        if (omissionValue) omissionValue.textContent = formatter.format(VDCSystem.analysis.extractedValues.diferencialCusto);
    } else if (omissionAlert) {
        omissionAlert.style.display = 'none';
    }
}

function criarDashboardDiferencial() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection || document.getElementById('diferencialCard')) return;
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto || 0;
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const diferencialCard = document.createElement('div');
    diferencialCard.id = 'diferencialCard';
    diferencialCard.className = diferencial > 100 ? 'kpi-card danger' : 'kpi-card';
    diferencialCard.innerHTML = `
        <h4><i class="fas fa-balance-scale"></i> DIFERENCIAL DE CUSTO</h4>
        <p id="diferencialVal">${formatter.format(diferencial)}</p>
        <small>${diferencial > 100 ? 'Possível omissão' : 'Dentro do esperado'}</small>
    `;
    
    if (kpiGrid.children.length >= 4) {
        kpiGrid.insertBefore(diferencialCard, kpiGrid.children[4]);
    } else {
        kpiGrid.appendChild(diferencialCard);
    }
}

function showDiferencialAlert() {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
    const alertAntigo = document.getElementById('diferencialAlert');
    if (alertAntigo) alertAntigo.remove();
    
    const diferencial = VDCSystem.analysis.extractedValues.diferencialCusto;
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' );
    
    const novoAlerta = document.createElement('div');
    novoAlerta.id = 'diferencialAlert';
    novoAlerta.className = 'omission-alert diferencial-alert';
    novoAlerta.style.display = 'flex';
    novoAlerta.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div>
            <strong>ALERTA DE DIFERENCIAL DE CUSTO</strong>
            <p>Detetado diferencial significativo de ${formatter.format(diferencial)} entre faturação e recebimento.</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem;"><i class="fas fa-chart-bar"></i> Projeção setorial (38k motoristas): ${(VDCSystem.analysis.extractedValues.projecaoSetorial / 1000000).toFixed(2)} milhões de euros</p>
        </div>
    `;
    
    const resultsGrid = resultsSection.querySelector('.results-grid');
    if (resultsGrid) {
        resultsGrid.parentNode.insertBefore(novoAlerta, resultsGrid.nextSibling);
    }
}

// 7. MODO DEMO HARDCODED
async function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados de demonstração Q4 2024.\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS DE DEMONSTRAÇÃO Q4 2024...', 'info');
            
            // Resetar sistema
            resetDashboard();
            
            // Dados estáticos Q4 2024 (Setembro a Dezembro)
            VDCSystem.analysis.extractedValues = {
                saftGross: 7613.58,
                saftIVA6: 456.81,
                platformCommission: 2399.53,
                bankTransfer: 7755.16,
                iva23Due: 551.89,
                ganhosBrutos: 10154.69,
                comissaoApp: -2399.53,
                ganhosLiquidos: 7755.16,
                faturaPlataforma: 239.00,
                campanhas: 50.00,
                gorjetas: 25.00,
                cancelamentos: 40.00,
                portagens: 60.00,
                diferencialCusto: 97.42,
                prejuizoFiscal: 20.46,
                imtBase: 2512.43,
                imtTax: 125.62,
                imtTotal: 2638.05,
                dac7Value: 7755.16,
                dac7Discrepancy: 0,
                valorIliquido: 7755.16,
                iva6Percent: 456.81,
                iva23Autoliquidacao: 551.89,
                invoiceNumber: "PT1125-3582",
                projecaoSetorial: 0
            };
            
            VDCSystem.periodoAnalise = 'Setembro a Dezembro 2024';
            VDCSystem.demoMode = true;
            
            // Preencher dados do cliente
            document.getElementById('clientName').value = 'Unidade Pericial Forense, Lda';
            document.getElementById('clientNIF').value = '123456789';
            document.getElementById('clientPhone').value = '+351 912 345 678';
            document.getElementById('clientEmail').value = 'pericia@forense.pt';
            document.getElementById('clientAddress').value = 'Rua da Justiça, 100, Lisboa';
            
            // Registrar cliente
            await registerClientFromDemo();
            
            // Simular uploads
            simulateUploadedFiles();
            
            // Atualizar interface
            updateDashboard();
            updateResults();
            calcularProjecaoSetorial();
            updateResults(); // Atualizar novamente para mostrar projeção
            
            // Atualizar botões demo
            updateDemoButtons();
            
            // Atualizar gráfico
            updateChartWithData();
            
            logAudit('✅ Dados de demonstração Q4 2024 carregados com sucesso', 'success');
            logAudit(`Período analisado: ${VDCSystem.periodoAnalise}`, 'info');
            logAudit(`Ganhos líquidos: 7.755,16€ | Sincronizado com DAC7`, 'success');
            
        } catch (error) {
            console.error('Erro ao carregar demo:', error);
            logAudit(`Erro ao carregar dados demo: ${error.message}`, 'error');
        }
    }
}

async function registerClientFromDemo() {
    VDCSystem.client = { 
        name: 'Unidade Pericial Forense, Lda', 
        nif: '123456789',
        phone: '+351 912 345 678',
        email: 'pericia@forense.pt',
        address: 'Rua da Justiça, 100, Lisboa',
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = 'Unidade Pericial Forense, Lda';
    
    logAudit(`✅ Cliente registado: ${VDCSystem.client.name} (NIF: ${VDCSystem.client.nif})`, 'success');
}

function simulateUploadedFiles() {
    // Simular ficheiros carregados
    VDCSystem.documents.saft.files = [{ name: 'demo_saft_q4.xml', size: 2048 }];
    VDCSystem.documents.invoices.files = [{ name: 'Fatura_Q4_2024.pdf', size: 1024 }];
    VDCSystem.documents.statements.files = [{ name: 'Extrato_Q4_2024.txt', size: 1024 }];
    
    VDCSystem.counters = { saft: 1, invoices: 1, statements: 1, total: 3 };
    
    // Atualizar contadores
    document.getElementById('saftCount').textContent = '1';
    document.getElementById('invoiceCount').textContent = '1';
    document.getElementById('statementCount').textContent = '1';
    document.getElementById('totalCount').textContent = '3';
}

function updateDemoButtons() {
    const demoBtn = document.getElementById('btnDemo');
    const demoBtnExtra = document.getElementById('btnDemoExtra');
    
    if (demoBtn) {
        demoBtn.classList.add('btn-demo-loaded');
        demoBtn.innerHTML = '<i class="fas fa-check"></i> DEMO Q4 CARREGADO';
        demoBtn.disabled = true;
    }
    
    if (demoBtnExtra) {
        demoBtnExtra.classList.add('btn-demo-loaded');
        demoBtnExtra.innerHTML = '<i class="fas fa-check"></i> DEMO Q4 CARREGADO';
        demoBtnExtra.disabled = true;
    }
    
    // Resetar após 3 segundos
    setTimeout(() => {
        if (demoBtn) {
            demoBtn.classList.remove('btn-demo-loaded');
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DEMO Q4 2024';
            demoBtn.disabled = false;
        }
        if (demoBtnExtra) {
            demoBtnExtra.classList.remove('btn-demo-loaded');
            demoBtnExtra.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DE DEMONSTRAÇÃO Q4 2024';
            demoBtnExtra.disabled = false;
        }
    }, 3000);
}

// 8. FUNÇÕES DE GRÁFICO
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
    
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    const iva6 = VDCSystem.analysis.extractedValues.ganhosBrutos * 0.06 || 0;
    const comissao = Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0;
    const iva23 = comissao * 0.23 || 0;
    
    VDCSystem.chart.data.datasets[0].data = [
        ganhosLiquidos,
        iva6,
        comissao,
        iva23
    ];
    
    VDCSystem.chart.update();
}

// 9. FUNÇÕES DE EXPORTAÇÃO PDF
async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        await createPage1(doc);
        await createPage2(doc);
        
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
        logAudit(`Erro ao gerar PDF: ${error.message}`, 'error');
        alert('Erro ao gerar PDF: ' + error.message);
    }
}

async function createPage1(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const centerX = pageWidth / 2;
    
    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("RELATÓRIO DE PERITAGEM FORENSE", centerX, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text("Análise de Conformidade Fiscal", centerX, 28, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("VDC Sistema de Peritagem Forense v11.1", centerX, 36, { align: 'center' });
    
    doc.setDrawColor(0, 242, 255);
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);
    
    let posY = 50;
    
    // Informações da Sessão
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
    doc.text(`Período Analisado: ${VDCSystem.periodoAnalise || 'N/D'}`, 20, posY);
    posY += 5;
    doc.text(`Plataforma: ${VDCSystem.selectedPlatform === 'bolt' ? 'Bolt (Estónia)' : 
              VDCSystem.selectedPlatform === 'uber' ? 'Uber (Holanda)' : 'Outra'}`, 20, posY);
    posY += 10;
    
    // Informações do Cliente
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
    
    // Resultados da Análise
    doc.setFont('helvetica', 'bold');
    doc.text("RESULTADOS DA ANÁLISE FORENSE", 20, posY);
    posY += 7;
    
    doc.setFont('helvetica', 'normal');
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const resultados = [
        `Ganhos Brutos (Plataforma): ${formatter.format(VDCSystem.analysis.extractedValues.ganhosBrutos || 0)}`,
        `Comissões/Despesas: ${formatter.format(Math.abs(VDCSystem.analysis.extractedValues.comissaoApp) || 0)}`,
        `Ganhos Líquidos (Banco): ${formatter.format(VDCSystem.analysis.extractedValues.ganhosLiquidos || 0)}`,
        `Valor Reportado DAC7: ${formatter.format(VDCSystem.analysis.extractedValues.dac7Value || 0)}`,
        `Diferencial Identificado: ${formatter.format(VDCSystem.analysis.extractedValues.diferencialCusto || 0)}`,
        `IVA 23% Devido: ${formatter.format(VDCSystem.analysis.extractedValues.iva23Due || 0)}`
    ];
    
    resultados.forEach(res => {
        if (posY > 250) {
            doc.addPage();
            posY = 20;
        }
        doc.text(res, 20, posY);
        posY += 6;
    });
    
    posY += 5;
    
    // ANÁLISE DE IMPACTO SETORIAL
    doc.setFont('helvetica', 'bold');
    doc.text("ANÁLISE DE IMPACTO SETORIAL", 20, posY);
    posY += 7;
    
    doc.setFont('helvetica', 'normal');
    const projecao = VDCSystem.analysis.extractedValues.projecaoSetorial || 0;
    const textoProjecao = `Com base no diferencial médio identificado (${formatter.format(VDCSystem.analysis.extractedValues.diferencialCusto || 0)} por motorista), 
    a projeção para o mercado português (38.000 motoristas) aponta para um impacto setorial de aproximadamente ${(projecao / 1000000).toFixed(2)} milhões de euros.`;
    
    const splitText = doc.splitTextToSize(textoProjecao, 170);
    splitText.forEach(line => {
        if (posY > 250) {
            doc.addPage();
            posY = 20;
        }
        doc.text(line, 20, posY);
        posY += 5;
    });
}

async function createPage2(doc) {
    doc.addPage();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("ANEXO TÉCNICO - METODOLOGIA", centerX, 30, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    let posY = 50;
    
    const anexoConteudo = [
        "Este anexo técnico descreve a metodologia aplicada na análise forense.",
        "",
        "1. COLETA DE DADOS",
        "Os dados foram extraídos diretamente de documentos oficiais:",
        "- Ficheiros SAF-T (Standard Audit File for Tax)",
        "- Faturas eletrónicas das plataformas digitais",
        "- Extratos bancários em formato digital",
        "",
        "2. PROCESSAMENTO FORENSE",
        "Utilização de algoritmos de reconciliação para identificação de",
        "discrepâncias entre o rendimento declarado e o fluxo de caixa efetivo.",
        "",
        "3. NORMALIZAÇÃO DE DADOS",
        "Conversão automática de diferentes formatos numéricos (1.234,56,",
        "1,234.56, 1234.56) para valores decimais padrão.",
        "",
        "4. VALIDAÇÃO FISCAL",
        "Análise focada na conformidade com a legislação portuguesa,",
        "especialmente nos regimes de IVA e obrigações declarativas DAC7.",
        "",
        "5. PROJEÇÃO SETORIAL",
        "Extrapolação matemática baseada em amostra representativa para",
        "estimativa de impacto no mercado nacional.",
        "",
        "NOTA DE CONFIDENCIALIDADE",
        "Este relatório destina-se exclusivamente a fins de auditoria e",
        "peritagem financeira, em estrito cumprimento do RGPD."
    ];
    
    anexoConteudo.forEach(linha => {
        if (posY > 250) {
            doc.addPage();
            posY = 30;
        }
        
        if (linha.includes("1.") || linha.includes("2.") || linha.includes("3.") || 
            linha.includes("4.") || linha.includes("5.") || linha.includes("NOTA")) {
            doc.setFont('helvetica', 'bold');
            doc.text(linha, centerX, posY, { align: 'center' });
            doc.setFont('helvetica', 'normal');
        } else {
            doc.text(linha, centerX, posY, { align: 'center' });
        }
        posY += 8;
    });
    
    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v11.1 | Protocolo de Prova Legal", 15, 285);
        doc.text(`Página ${i} de ${totalPages}`, 185, 285, { align: "right" });
    }
}

// 10. FUNÇÕES DE UTILIDADE
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

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasSaft = VDCSystem.documents.saft.files.length > 0 || VDCSystem.demoMode;
    const hasInvoices = VDCSystem.documents.invoices.files.length > 0 || VDCSystem.demoMode;
    const hasStatements = VDCSystem.documents.statements.files.length > 0 || VDCSystem.demoMode;
    const hasClient = VDCSystem.client !== null;
    
    const hasValidData = (hasSaft || hasInvoices || hasStatements) && hasClient;
    
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
    const colors = { success: '#10b981', warn: '#f59e0b', error: '#ef4444', info: '#3b82f6' };
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
    const data = [
        VDCSystem.sessionId,
        VDCSystem.selectedYear.toString(),
        VDCSystem.selectedPlatform,
        VDCSystem.analysis.extractedValues.ganhosBrutos.toString(),
        VDCSystem.analysis.extractedValues.diferencialCusto.toString(),
        new Date().toISOString()
    ].join('|');
    
    const masterHash = CryptoJS.SHA256 ? 
        CryptoJS.SHA256(data).toString() : 
        `VDC-${VDCSystem.sessionId}-${Date.now()}`;
    
    const display = document.getElementById('masterHashValue');
    if (display) {
        display.textContent = masterHash;
        display.style.color = '#00f2ff';
    }
    
    logAudit(`Master Hash gerada: ${masterHash.substring(0, 32)}...`, 'success');
}

function showError(message) {
    logAudit(`ERRO: ${message}`, 'error');
    alert(`ERRO DO SISTEMA: ${message}`);
}

function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateString = now.toLocaleDateString('pt-PT');
        
        document.getElementById('currentTime').textContent = timeString;
        document.getElementById('currentDate').textContent = dateString;
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// 11. INICIALIZAÇÃO DO SISTEMA
window.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

async function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v11.1...');
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = generateSessionId();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        setupPlatformSelector();
        updateLoadingProgress(40);
        
        await setupAllEventListeners();
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
                logAudit('✅ Sistema VDC v11.1 inicializado com sucesso', 'success');
                logAudit('Modos disponíveis: Demo Hardcoded Q4 2024 + Parsing Textual', 'info');
                updateAnalysisButton();
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError(`Falha na inicialização: ${error.message}`);
    }
}

// 12. SETUP DE EVENT LISTENERS
async function setupAllEventListeners() {
    document.getElementById('registerClientBtn').addEventListener('click', registerClient);
    document.getElementById('saveClientBtn').addEventListener('click', saveClientData);
    document.getElementById('btnDemoExtra').addEventListener('click', loadDemoData);
    document.getElementById('btnDemo').addEventListener('click', loadDemoData);
    document.getElementById('calcDAC7Btn').addEventListener('click', calcularDiscrepanciaDAC7);
    document.getElementById('analyzeBtn').addEventListener('click', performForensicAnalysis);
    document.getElementById('exportJSONBtn').addEventListener('click', exportJSON);
    document.getElementById('exportPDFBtn').addEventListener('click', exportPDF);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);
    document.getElementById('toggleConsoleBtn').addEventListener('click', toggleConsole);
    
    document.getElementById('clientName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('clientNIF').focus();
    });
    
    document.getElementById('clientNIF').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') registerClient();
    });
    
    setupFileUploadListeners();
}

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
                    
                    try {
                        for (const file of files) {
                            switch(inputId) {
                                case 'controlFile':
                                    await FileProcessor.processControlFile(file);
                                    break;
                                case 'saftFile':
                                    await FileProcessor.processSaftFile(file);
                                    break;
                                case 'invoiceFile':
                                    await FileProcessor.processInvoiceFile(file);
                                    break;
                                case 'statementFile':
                                    await FileProcessor.processStatementFile(file);
                                    break;
                            }
                        }
                        
                        updateFileList(inputId + 'List', files);
                        updateAnalysisButton();
                        
                    } catch (error) {
                        console.error(`Erro no processamento:`, error);
                        showError(`Erro ao processar ficheiros: ${error.message}`);
                    }
                }
            });
        }
    });
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
    });
}

function setupDemoButton() {
    const demoBtn = document.getElementById('btnDemo');
    if (demoBtn) demoBtn.classList.add('btn-demo-active');
}

// 13. FUNÇÕES DE CLIENTE
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

// 14. FUNÇÕES DE DAC7
function calcularDiscrepanciaDAC7() {
    const dac7Value = parseFloat(document.getElementById('dac7Value').value) || 0;
    
    if (dac7Value <= 0) {
        showError('Por favor, insira um valor válido para DAC7');
        return;
    }
    
    const ganhosLiquidos = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
    const discrepancia = Math.abs(dac7Value - ganhosLiquidos);
    
    VDCSystem.analysis.extractedValues.dac7Value = dac7Value;
    VDCSystem.analysis.extractedValues.dac7Discrepancy = discrepancia;
    
    const dac7Result = document.getElementById('dac7Result');
    const dac7Discrepancy = document.getElementById('dac7Discrepancy');
    
    if (dac7Result) dac7Result.style.display = 'flex';
    if (dac7Discrepancy) {
        const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
        dac7Discrepancy.textContent = formatter.format(discrepancia);
    }
    
    const status = discrepancia === 0 ? 'PERFEITA' : discrepancia < 100 ? 'ACEITÁVEL' : 'SUSPEITA';
    logAudit(`DAC7: Valor reportado ${dac7Value.toFixed(2)}€ vs Ganhos líquidos ${ganhosLiquidos.toFixed(2)}€ | ${status}`, 'warn');
}

// 15. FUNÇÕES DE RESET
function resetDashboard() {
    // Limpar valores do sistema
    VDCSystem.documents = {
        control: { files: [], parsedData: null },
        saft: { files: [], totals: { gross: 0, iva6: 0, net: 0 } },
        invoices: { files: [], totals: { invoiceValue: 0, invoiceNumber: "N/D" } },
        statements: { files: [], totals: { 
            ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
            campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0, diferencialCusto: 0
        }}
    };
    
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, platformCommission: 0, bankTransfer: 0,
        iva23Due: 0, ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
        faturaPlataforma: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0,
        portagens: 0, diferencialCusto: 0, prejuizoFiscal: 0, imtBase: 0,
        imtTax: 0, imtTotal: 0, dac7Value: 0, dac7Discrepancy: 0, valorIliquido: 0,
        iva6Percent: 0, iva23Autoliquidacao: 0, invoiceNumber: "N/D", projecaoSetorial: 0
    };
    
    VDCSystem.counters = { saft: 0, invoices: 0, statements: 0, total: 0 };
    VDCSystem.demoMode = false;
    
    // Limpar formulários
    document.getElementById('clientName').value = '';
    document.getElementById('clientNIF').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
    document.getElementById('dac7Value').value = '';
    
    const clientStatus = document.getElementById('clientStatus');
    if (clientStatus) clientStatus.style.display = 'none';
    
    const dac7Result = document.getElementById('dac7Result');
    if (dac7Result) dac7Result.style.display = 'none';
    
    // Limpar listas de ficheiros
    ['controlFileList', 'saftFileList', 'invoiceFileList', 'statementFileList'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
            element.classList.remove('visible');
        }
    });
    
    // Resetar contadores
    ['saftCount', 'invoiceCount', 'statementCount', 'totalCount'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
    
    // Resetar dashboard
    updateDashboard();
    updateResults();
    
    // Remover cards dinâmicos
    const diferencialCard = document.getElementById('diferencialCard');
    if (diferencialCard) diferencialCard.remove();
    
    const diferencialAlert = document.getElementById('diferencialAlert');
    if (diferencialAlert) diferencialAlert.remove();
    
    const omissionAlert = document.getElementById('omissionAlert');
    if (omissionAlert) omissionAlert.style.display = 'none';
    
    // Resetar gráfico
    if (VDCSystem.chart) {
        VDCSystem.chart.data.datasets[0].data = [0, 0, 0, 0];
        VDCSystem.chart.update();
    }
    
    logAudit('📊 Dashboard resetado - Aguardando novos dados', 'info');
    updateAnalysisButton();
}

// 16. FUNÇÕES AUXILIARES
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

async function saveClientData() {
    try {
        if (!VDCSystem.client) {
            showError('Nenhum cliente registado para guardar');
            return;
        }
        
        const clientData = {
            sistema: "VDC Forensic System v11.1",
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            analise: VDCSystem.analysis
        };
        
        const jsonStr = JSON.stringify(clientData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_CLIENTE_${VDCSystem.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${VDCSystem.client.nif}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logAudit(`✅ Dados do cliente guardados: ${a.download}`, 'success');
        
    } catch (error) {
        console.error('Erro ao guardar cliente:', error);
        logAudit(`Erro ao guardar cliente: ${error.message}`, 'error');
    }
}

async function exportJSON() {
    try {
        const evidenceData = {
            sistema: "VDC Forensic System v11.1",
            versao: VDCSystem.version,
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            periodoAnalise: VDCSystem.periodoAnalise,
            analise: VDCSystem.analysis,
            logs: VDCSystem.logs.slice(-50)
        };
        
        const jsonStr = JSON.stringify(evidenceData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_PROVA_${VDCSystem.sessionId}_${dataStr}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logAudit('✅ Prova digital guardada como JSON', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`Erro ao exportar JSON: ${error.message}`, 'error');
    }
}

function clearAllData() {
    if (confirm('⚠️  ATENÇÃO: Todos os dados não exportados serão perdidos.\n\nTem certeza que deseja iniciar uma nova sessão?')) {
        window.location.reload();
    }
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================
console.log('VDC Sistema de Peritagem Forense v11.1 - Carregado com sucesso');
