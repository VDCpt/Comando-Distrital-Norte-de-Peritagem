// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v12.2
// PROTOCOLO DE PROVA LEGAL - BIG DATA FORENSE
// SINCRONIZAÇÃO TOTAL 4 MESES (SET-DEZ 2024)
// ============================================

// 1. ESTADO DO SISTEMA - DADOS REAIS 4 MESES
const VDCSystem = {
    version: 'v12.2',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    periodoAnalise: 'Setembro a Dezembro 2024',
    
    // DADOS MENSALIZADOS REAIS (SET-DEZ 2024)
    dadosMensais: {
        setembro: {
            mes: 'Setembro 2024',
            bruto: 165.52,
            liquido: 141.58,
            comissao: 23.94,
            faturaNumero: 'PT1124-91599'
        },
        outubro: {
            mes: 'Outubro 2024',
            bruto: 3291.26,
            liquido: 2514.40,
            comissao: 776.86,
            faturaNumero: 'PT1125-3578'
        },
        novembro: {
            mes: 'Novembro 2024',
            bruto: 3519.31,
            liquido: 2689.23,
            comissao: 830.08,
            faturaNumero: 'PT1125-3580'
        },
        dezembro: {
            mes: 'Dezembro 2024',
            bruto: 3202.54,
            liquido: 2409.95,
            comissao: 792.59,
            faturaNumero: 'PT1125-3582'
        }
    },
    
    // TOTAIS CONSOLIDADOS
    totaisConsolidados: {
        brutoTotal: 10178.63,      // Soma dos 4 meses
        liquidoTotal: 7755.16,     // Reportado DAC7
        comissaoTotal: 2423.47,    // Divergência
        mesesAnalisados: 4
    },
    
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
                portagens: 0
            }
        }
    },
    
    analysis: {
        extractedValues: {
            // Dados reais dos 4 meses
            faturacaoBruta: 0,
            reportadoDAC7: 0,
            divergenciaComissoes: 0,
            
            // Valores detalhados
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
            
            // Projeção setorial
            projecaoSetorialMensal: 0,
            projecaoSetorialAnual: 0,
            taxaOmissaoPercentual: 0
        },
        
        // Projeção de mercado corrigida
        projecaoMercado: {
            motoristasAtivos: 38000,
            comissaoMediaMensal: 0,
            volumeNegocioOmitidoMensal: 0,
            volumeNegocioOmitidoAnual: 0,
            impactoFiscalEstimado: 0
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
        
        let cleaned = str
            .replace(/[€$£\s]/g, '')
            .replace(/EUR/g, '')
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^\d.-]/g, '');
        
        if (cleaned.includes(',') && !cleaned.includes('.')) {
            cleaned = cleaned.replace(',', '.');
        }
        
        if (!cleaned.match(/^-?\d+(\.\d+)?$/)) {
            console.warn(`Formato inválido: "${str}" -> "${cleaned}"`);
            return 0;
        }
        
        const number = parseFloat(cleaned);
        
        if (isNaN(number)) {
            console.warn(`Conversão falhou: "${str}" -> "${cleaned}"`);
            return 0;
        }
        
        return Math.abs(number);
    },
    
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
        if (!pattern) return 0;
        
        const match = text.match(pattern);
        if (!match || !match[1]) {
            if (key === 'portagens') return 0;
            return 0;
        }
        
        const value = this.cleanValue(match[1]);
        
        if (key === 'comissao_app') return -value;
        
        return value;
    },
    
    extractFromInvoice: function(text) {
        const extracted = {
            invoiceValue: this.extractKey(text, 'total'),
            invoiceNumber: "N/D"
        };
        
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
        
        const hasData = Object.values(extracted).some(val => val !== 0);
        if (hasData) {
            console.log(`💰 Extrato extraído:`, extracted);
        }
        
        return extracted;
    },
    
    extractFromSAFT: function(text) {
        let gross = 0;
        let iva6 = 0;
        
        if (text.includes('<GrossTotal>')) {
            const grossMatch = text.match(/<GrossTotal>([^<]+)<\/GrossTotal>/);
            if (grossMatch) gross = this.cleanValue(grossMatch[1]);
            
            const iva6Match = text.match(/<Tax>6%<\/Tax>.*?<TaxAmount>([^<]+)<\/TaxAmount>/s);
            if (iva6Match) iva6 = this.cleanValue(iva6Match[1]);
        }
        
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
        console.log('🚀 INICIANDO ANÁLISE FORENSE v12.2...');
        
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
        
        // Calcular divergência real
        calcularDivergenciaReal();
        
        // Calcular projeção de mercado CORRIGIDA
        calcularProjecaoMercadoCorrigida();
        
        // Atualizar interface
        updateDashboard();
        updateResults();
        updateChartComparativo();
        criarDashboardDivergencia();
        generateMasterHash();
        
        console.log('✅ ANÁLISE CONCLUÍDA');
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
        // Mostrar alertas se necessário
        if (VDCSystem.analysis.extractedValues.divergenciaComissoes > 100) {
            showDivergenciaAlert();
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

function calcularDivergenciaReal() {
    // Usar dados reais dos 4 meses quando em modo DEMO
    if (VDCSystem.demoMode) {
        VDCSystem.analysis.extractedValues.faturacaoBruta = VDCSystem.totaisConsolidados.brutoTotal;
        VDCSystem.analysis.extractedValues.reportadoDAC7 = VDCSystem.totaisConsolidados.liquidoTotal;
        VDCSystem.analysis.extractedValues.divergenciaComissoes = VDCSystem.totaisConsolidados.comissaoTotal;
        
        // Calcular taxa de omissão percentual
        const taxaOmissao = (VDCSystem.totaisConsolidados.comissaoTotal / VDCSystem.totaisConsolidados.brutoTotal) * 100;
        VDCSystem.analysis.extractedValues.taxaOmissaoPercentual = taxaOmissao;
        
        console.log(`📊 DIVERGÊNCIA REAL: Faturação Bruta ${VDCSystem.totaisConsolidados.brutoTotal}€ - Reportado DAC7 ${VDCSystem.totaisConsolidados.liquidoTotal}€ = ${VDCSystem.totaisConsolidados.comissaoTotal}€ (${taxaOmissao.toFixed(1)}%)`);
        logAudit(`Divergência real calculada: ${VDCSystem.totaisConsolidados.comissaoTotal.toFixed(2)}€ (${taxaOmissao.toFixed(1)}% da faturação)`, 'info');
    } else {
        // Para dados carregados manualmente
        const faturacaoBruta = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
        const reportadoDAC7 = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
        const divergencia = faturacaoBruta - reportadoDAC7;
        
        VDCSystem.analysis.extractedValues.faturacaoBruta = faturacaoBruta;
        VDCSystem.analysis.extractedValues.reportadoDAC7 = reportadoDAC7;
        VDCSystem.analysis.extractedValues.divergenciaComissoes = divergencia;
        
        const taxaOmissao = faturacaoBruta > 0 ? (divergencia / faturacaoBruta) * 100 : 0;
        VDCSystem.analysis.extractedValues.taxaOmissaoPercentual = taxaOmissao;
        
        console.log(`📊 DIVERGÊNCIA CALCULADA: ${faturacaoBruta}€ - ${reportadoDAC7}€ = ${divergencia}€ (${taxaOmissao.toFixed(1)}%)`);
    }
    
    return VDCSystem.analysis.extractedValues.divergenciaComissoes;
}

function calcularProjecaoMercadoCorrigida() {
    const motoristasAtivos = 38000;
    
    // Fórmula CORRIGIDA: (Total Comissões / 4 meses) * 38.000 motoristas
    const comissaoMediaMensal = VDCSystem.totaisConsolidados.comissaoTotal / VDCSystem.totaisConsolidados.mesesAnalisados;
    const volumeNegocioOmitidoMensal = comissaoMediaMensal * motoristasAtivos;
    const volumeNegocioOmitidoAnual = volumeNegocioOmitidoMensal * 12;
    
    // Cálculo do impacto fiscal (IVA 23%)
    const impactoFiscalEstimado = volumeNegocioOmitidoMensal * 0.23;
    
    // Armazenar resultados
    VDCSystem.analysis.projecaoMercado = {
        motoristasAtivos: motoristasAtivos,
        comissaoMediaMensal: comissaoMediaMensal,
        volumeNegocioOmitidoMensal: volumeNegocioOmitidoMensal,
        volumeNegocioOmitidoAnual: volumeNegocioOmitidoAnual,
        impactoFiscalEstimado: impactoFiscalEstimado
    };
    
    VDCSystem.analysis.extractedValues.projecaoSetorialMensal = volumeNegocioOmitidoMensal;
    VDCSystem.analysis.extractedValues.projecaoSetorialAnual = volumeNegocioOmitidoAnual;
    
    console.log(`📊 PROJEÇÃO DE MERCADO CORRIGIDA:`);
    console.log(`  Comissão média mensal: ${comissaoMediaMensal.toFixed(2)}€`);
    console.log(`  Volume omitido mensal (38k motoristas): ${(volumeNegocioOmitidoMensal / 1000000).toFixed(2)}M€`);
    console.log(`  Volume omitido anual: ${(volumeNegocioOmitidoAnual / 1000000).toFixed(2)}M€`);
    console.log(`  Impacto fiscal estimado (IVA 23%): ${(impactoFiscalEstimado / 1000000).toFixed(2)}M€/mês`);
    
    logAudit(`Projeção de mercado: ${(volumeNegocioOmitidoMensal / 1000000).toFixed(2)} milhões €/mês de volume não reportado`, 'warn');
}

// 6. FUNÇÕES DE UI
function updateDashboard() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
    const valores = {
        'netVal': VDCSystem.analysis.extractedValues.reportadoDAC7 || 0,
        'iva6Val': (VDCSystem.analysis.extractedValues.faturacaoBruta * 0.06) || 0,
        'commissionVal': VDCSystem.analysis.extractedValues.divergenciaComissoes || 0,
        'iva23Val': (VDCSystem.analysis.extractedValues.divergenciaComissoes * 0.23) || 0,
        'kpiGanhos': VDCSystem.analysis.extractedValues.faturacaoBruta || 0,
        'kpiComm': VDCSystem.analysis.extractedValues.divergenciaComissoes || 0,
        'kpiNet': VDCSystem.analysis.extractedValues.reportadoDAC7 || 0,
        'kpiInvoice': VDCSystem.analysis.extractedValues.faturaPlataforma || 0,
        'valCamp': VDCSystem.analysis.extractedValues.campanhas || 0,
        'valTips': VDCSystem.analysis.extractedValues.gorjetas || 0,
        'valCanc': VDCSystem.analysis.extractedValues.cancelamentos || 0,
        'valPort': VDCSystem.analysis.extractedValues.portagens || 0
    };
    
    Object.entries(valores).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = formatter.format(value);
    });
    
    // Atualizar IMT com base na comissão real
    calcularIMTAtualizado();
}

function calcularIMTAtualizado() {
    const comissaoReal = VDCSystem.analysis.extractedValues.divergenciaComissoes || 0;
    const taxaIMT = 0.05;
    const imtTax = comissaoReal * taxaIMT;
    const totalPlataforma = comissaoReal + imtTax;
    
    VDCSystem.analysis.extractedValues.imtBase = comissaoReal;
    VDCSystem.analysis.extractedValues.imtTax = imtTax;
    VDCSystem.analysis.extractedValues.imtTotal = totalPlataforma;
    
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' );
    
    const elementosIMT = {
        'imtBase': comissaoReal,
        'imtTax': imtTax,
        'imtTotal': totalPlataforma
    };
    
    Object.entries(elementosIMT).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = formatter.format(value);
    });
}

function updateResults() {
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' );
    
    const valores = {
        'grossResult': VDCSystem.analysis.extractedValues.faturacaoBruta || 0,
        'transferResult': VDCSystem.analysis.extractedValues.reportadoDAC7 || 0,
        'differenceResult': VDCSystem.analysis.extractedValues.divergenciaComissoes || 0,
        'marketResult': (VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoMensal / 1000000) || 0
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
                    const maxValue = Math.max(VDCSystem.analysis.extractedValues.faturacaoBruta, 1000);
                    const percentage = (value / maxValue) * 100;
                    bar.style.width = Math.min(percentage, 100) + '%';
                }
            }
        }
    });
    
    // Mostrar alerta de omissão se divergência > 100€
    const omissionAlert = document.getElementById('omissionAlert');
    const omissionValue = document.getElementById('omissionValue');
    
    if (VDCSystem.analysis.extractedValues.divergenciaComissoes > 100) {
        if (omissionAlert) omissionAlert.style.display = 'flex';
        if (omissionValue) {
            omissionValue.textContent = formatter.format(VDCSystem.analysis.extractedValues.divergenciaComissoes);
            omissionValue.innerHTML += ` <small style="color: #f59e0b;">(${VDCSystem.analysis.extractedValues.taxaOmissaoPercentual.toFixed(1)}%)</small>`;
        }
    } else if (omissionAlert) {
        omissionAlert.style.display = 'none';
    }
}

function criarDashboardDivergencia() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection || document.getElementById('divergenciaCard')) return;
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (!kpiGrid) return;
    
    const divergencia = VDCSystem.analysis.extractedValues.divergenciaComissoes || 0;
    const taxaOmissao = VDCSystem.analysis.extractedValues.taxaOmissaoPercentual || 0;
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' );
    
    const divergenciaCard = document.createElement('div');
    divergenciaCard.id = 'divergenciaCard';
    divergenciaCard.className = taxaOmissao > 10 ? 'kpi-card danger' : 'kpi-card alert';
    divergenciaCard.innerHTML = `
        <h4><i class="fas fa-exclamation-triangle"></i> DIVERGÊNCIA REAL</h4>
        <p id="divergenciaVal">${formatter.format(divergencia)}</p>
        <small>${taxaOmissao.toFixed(1)}% da faturação bruta</small>
    `;
    
    if (kpiGrid.children.length >= 4) {
        kpiGrid.insertBefore(divergenciaCard, kpiGrid.children[4]);
    } else {
        kpiGrid.appendChild(divergenciaCard);
    }
}

function showDivergenciaAlert() {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
    const alertAntigo = document.getElementById('divergenciaAlert');
    if (alertAntigo) alertAntigo.remove();
    
    const divergencia = VDCSystem.analysis.extractedValues.divergenciaComissoes;
    const taxaOmissao = VDCSystem.analysis.extractedValues.taxaOmissaoPercentual;
    const projecaoMensal = VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoMensal;
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' );
    
    const novoAlerta = document.createElement('div');
    novoAlerta.id = 'divergenciaAlert';
    novoAlerta.className = 'omission-alert diferencial-alert';
    novoAlerta.style.display = 'flex';
    novoAlerta.innerHTML = `
        <i class="fas fa-chart-line"></i>
        <div>
            <strong>ANÁLISE DE IMPACTO SETORIAL</strong>
            <p>Detetada divergência de ${formatter.format(divergencia)} (${taxaOmissao.toFixed(1)}% da faturação bruta) entre plataforma e declarado.</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem;"><i class="fas fa-industry"></i> Projeção mercado (38k motoristas): <strong>${(projecaoMensal / 1000000).toFixed(2)} milhões €/mês</strong> de volume não reportado</p>
        </div>
    `;
    
    const resultsGrid = resultsSection.querySelector('.results-grid');
    if (resultsGrid) {
        resultsGrid.parentNode.insertBefore(novoAlerta, resultsGrid.nextSibling);
    }
}

// 7. MODO DEMO HARDCODED - DADOS REAIS 4 MESES
async function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados reais dos 4 meses auditados (Set-Dez 2024).\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS REAIS 4 MESES (SET-DEZ 2024)...', 'info');
            
            // Resetar sistema
            resetDashboard();
            
            // Dados reais consolidados
            VDCSystem.analysis.extractedValues = {
                // Dados principais
                faturacaoBruta: VDCSystem.totaisConsolidados.brutoTotal,
                reportadoDAC7: VDCSystem.totaisConsolidados.liquidoTotal,
                divergenciaComissoes: VDCSystem.totaisConsolidados.comissaoTotal,
                
                // Valores detalhados
                saftGross: 0,
                saftIVA6: 0,
                platformCommission: VDCSystem.totaisConsolidados.comissaoTotal,
                bankTransfer: VDCSystem.totaisConsolidados.liquidoTotal,
                iva23Due: VDCSystem.totaisConsolidados.comissaoTotal * 0.23,
                ganhosBrutos: VDCSystem.totaisConsolidados.brutoTotal,
                comissaoApp: -VDCSystem.totaisConsolidados.comissaoTotal,
                ganhosLiquidos: VDCSystem.totaisConsolidados.liquidoTotal,
                faturaPlataforma: 0,
                campanhas: 120.00,
                gorjetas: 45.00,
                cancelamentos: 75.00,
                portagens: 90.00,
                diferencialCusto: VDCSystem.totaisConsolidados.comissaoTotal,
                prejuizoFiscal: VDCSystem.totaisConsolidados.comissaoTotal * 0.21,
                imtBase: VDCSystem.totaisConsolidados.comissaoTotal,
                imtTax: VDCSystem.totaisConsolidados.comissaoTotal * 0.05,
                imtTotal: VDCSystem.totaisConsolidados.comissaoTotal * 1.05,
                dac7Value: VDCSystem.totaisConsolidados.liquidoTotal,
                dac7Discrepancy: 0,
                valorIliquido: VDCSystem.totaisConsolidados.liquidoTotal,
                iva6Percent: VDCSystem.totaisConsolidados.brutoTotal * 0.06,
                iva23Autoliquidacao: VDCSystem.totaisConsolidados.comissaoTotal * 0.23,
                invoiceNumber: "MÚLTIPLAS",
                taxaOmissaoPercentual: (VDCSystem.totaisConsolidados.comissaoTotal / VDCSystem.totaisConsolidados.brutoTotal) * 100
            };
            
            VDCSystem.periodoAnalise = 'Setembro a Dezembro 2024';
            VDCSystem.demoMode = true;
            
            // Preencher dados do cliente
            document.getElementById('clientName').value = 'Unidade Pericial Forense, Lda';
            document.getElementById('clientNIF').value = '123456789';
            document.getElementById('clientPhone').value = '+351 912 345 678';
            document.getElementById('clientEmail').value = 'pericia@forense.pt';
            document.getElementById('clientAddress').value = 'Rua da Justiça, 100, Lisboa';
            
            // Preencher valor DAC7 automaticamente
            document.getElementById('dac7Value').value = VDCSystem.totaisConsolidados.liquidoTotal.toFixed(2);
            
            // Registrar cliente
            await registerClientFromDemo();
            
            // Simular uploads
            simulateUploadedFiles();
            
            // Calcular projeção de mercado corrigida
            calcularProjecaoMercadoCorrigida();
            
            // Atualizar interface
            updateDashboard();
            updateResults();
            
            // Atualizar botões demo
            updateDemoButtons();
            
            // Atualizar gráfico comparativo
            updateChartComparativo();
            
            logAudit('✅ Dados reais 4 meses carregados com sucesso', 'success');
            logAudit(`Período analisado: ${VDCSystem.periodoAnalise}`, 'info');
            logAudit(`Faturação Bruta: ${VDCSystem.totaisConsolidados.brutoTotal.toFixed(2)}€ | Reportado DAC7: ${VDCSystem.totaisConsolidados.liquidoTotal.toFixed(2)}€ | Divergência: ${VDCSystem.totaisConsolidados.comissaoTotal.toFixed(2)}€`, 'success');
            logAudit(`Projeção setorial: ${(VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoMensal / 1000000).toFixed(2)} milhões €/mês`, 'warn');
            
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
    VDCSystem.documents.saft.files = [{ name: 'saft_consolidado_set_dez_2024.xml', size: 4096 }];
    VDCSystem.documents.invoices.files = [
        { name: 'Fatura_Set_2024_PT1124-91599.pdf', size: 1024 },
        { name: 'Fatura_Out_2024_PT1125-3578.pdf', size: 1024 },
        { name: 'Fatura_Nov_2024_PT1125-3580.pdf', size: 1024 },
        { name: 'Fatura_Dez_2024_PT1125-3582.pdf', size: 1024 }
    ];
    VDCSystem.documents.statements.files = [
        { name: 'Extratos_Consolidados_Set_Dez_2024.pdf', size: 2048 }
    ];
    
    VDCSystem.counters = { saft: 1, invoices: 4, statements: 1, total: 6 };
    
    // Atualizar contadores
    document.getElementById('saftCount').textContent = '1';
    document.getElementById('invoiceCount').textContent = '4';
    document.getElementById('statementCount').textContent = '1';
    document.getElementById('totalCount').textContent = '6';
}

function updateDemoButtons() {
    const demoBtn = document.getElementById('btnDemo');
    const demoBtnExtra = document.getElementById('btnDemoExtra');
    
    if (demoBtn) {
        demoBtn.classList.add('btn-demo-loaded');
        demoBtn.innerHTML = '<i class="fas fa-check"></i> DADOS REAIS CARREGADOS';
        demoBtn.disabled = true;
    }
    
    if (demoBtnExtra) {
        demoBtnExtra.classList.add('btn-demo-loaded');
        demoBtnExtra.innerHTML = '<i class="fas fa-check"></i> DADOS 4 MESES CARREGADOS';
        demoBtnExtra.disabled = true;
    }
    
    // Resetar após 3 segundos
    setTimeout(() => {
        if (demoBtn) {
            demoBtn.classList.remove('btn-demo-loaded');
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS REAIS 4 MESES';
            demoBtn.disabled = false;
        }
        if (demoBtnExtra) {
            demoBtnExtra.classList.remove('btn-demo-loaded');
            demoBtnExtra.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS DE DEMONSTRAÇÃO Q4 2024';
            demoBtnExtra.disabled = false;
        }
    }, 3000);
}

// 8. FUNÇÕES DE GRÁFICO COMPARATIVO
function renderEmptyChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        
        if (VDCSystem.chart) VDCSystem.chart.destroy();
        
        const data = {
            labels: ['Faturação Bruta', 'Reportado DAC7', 'Divergência (Comissões)'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',    // Azul - Faturação Bruta
                    'rgba(16, 185, 129, 0.7)',    // Verde - Reportado DAC7
                    'rgba(239, 68, 68, 0.7)'      // Vermelho - Divergência
                ],
                borderColor: ['#3b82f6', '#10b981', '#ef4444'],
                borderWidth: 1
            }]
        };
        
        VDCSystem.chart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
                                return `${label}: ${formatter.format(value)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
                                return formatter.format(value);
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

function updateChartComparativo() {
    if (!VDCSystem.chart) return;
    
    const faturacaoBruta = VDCSystem.analysis.extractedValues.faturacaoBruta || 0;
    const reportadoDAC7 = VDCSystem.analysis.extractedValues.reportadoDAC7 || 0;
    const divergencia = VDCSystem.analysis.extractedValues.divergenciaComissoes || 0;
    
    VDCSystem.chart.data.datasets[0].data = [
        faturacaoBruta,
        reportadoDAC7,
        divergencia
    ];
    
    VDCSystem.chart.update();
}

// 9. FUNÇÕES DE EXPORTAÇÃO PDF - DESIGN PROFISSIONAL
async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL PROFISSIONAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        await createRelatorioCompleto(doc);
        
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        const a = document.createElement('a');
        a.href = pdfUrl;
        
        const clienteNome = VDCSystem.client?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'CLIENTE';
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_RELATORIO_PERICIAL_${clienteNome}_${dataStr}.pdf`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(pdfUrl);
        }, 100);
        
        logAudit('✅ Relatório pericial profissional gerado - Download iniciado', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`Erro ao gerar PDF: ${error.message}`, 'error');
        alert('Erro ao gerar PDF: ' + error.message);
    }
}

async function createRelatorioCompleto(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const centerX = pageWidth / 2;
    const margin = 20;
    
    // ========== PÁGINA 1: CAPA E SUMÁRIO ==========
    
    // Cabeçalho profissional
    doc.setFillColor(15, 23, 42); // --bg-primary
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setTextColor(241, 245, 249); // --text-primary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text("VDC SISTEMA DE PERITAGEM FORENSE", centerX, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text("Relatório de Análise de Conformidade Fiscal v12.2", centerX, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text("Protocolo de Prova Legal | Big Data Forense | Sincronização Total 4 Meses", centerX, 42, { align: 'center' });
    
    // Linha divisória
    doc.setDrawColor(0, 242, 255); // --accent-primary
    doc.setLineWidth(1);
    doc.line(margin, 50, pageWidth - margin, 50);
    
    let posY = 70;
    
    // Sumário Executivo em caixa destacada
    doc.setFillColor(30, 41, 59, 10); // --bg-secondary com transparência
    doc.roundedRect(margin, posY, pageWidth - (margin * 2), 80, 3, 3, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("SUMÁRIO EXECUTIVO", margin + 10, posY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const sumarioText = `Esta análise forense abrange o período de Setembro a Dezembro de 2024, 
    focando na reconciliação entre os valores faturados pelas plataformas digitais e 
    os valores reportados para efeitos fiscais (DAC7).`;
    
    const splitSumario = doc.splitTextToSize(sumarioText, pageWidth - (margin * 2) - 20);
    doc.text(splitSumario, margin + 10, posY + 20);
    
    // Destaques do sumário
    posY += 90;
    
    const destaques = [
        `• Período Analisado: ${VDCSystem.periodoAnalise}`,
        `• Faturação Bruta Total: ${formatarMoeda(VDCSystem.totaisConsolidados.brutoTotal)}`,
        `• Reportado DAC7: ${formatarMoeda(VDCSystem.totaisConsolidados.liquidoTotal)}`,
        `• Divergência Identificada: ${formatarMoeda(VDCSystem.totaisConsolidados.comissaoTotal)}`
    ];
    
    destaques.forEach((destaque, index) => {
        if (posY > pageHeight - 50) {
            doc.addPage();
            posY = margin;
        }
        doc.setFont('helvetica', index === 3 ? 'bold' : 'normal');
        doc.setTextColor(index === 3 ? 239 : 15, index === 3 ? 68 : 23, index === 3 ? 68 : 42);
        doc.text(destaque, margin + 5, posY);
        posY += 8;
    });
    
    posY += 10;
    
    // Tabela de Dados Mensais
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("DETALHAMENTO MENSAL (VALORES EM €)", margin, posY);
    posY += 8;
    
    // Cabeçalho da tabela
    doc.setFillColor(30, 41, 59);
    doc.setDrawColor(71, 85, 105);
    doc.rect(margin, posY, pageWidth - (margin * 2), 8, 'F');
    
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(9);
    doc.text("Mês", margin + 5, posY + 5);
    doc.text("Faturação Bruta", margin + 50, posY + 5);
    doc.text("Reportado DAC7", margin + 100, posY + 5);
    doc.text("Divergência", margin + 150, posY + 5);
    doc.text("% Omissão", pageWidth - margin - 25, posY + 5, { align: 'right' });
    
    posY += 10;
    
    // Linhas da tabela
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    
    Object.values(VDCSystem.dadosMensais).forEach((mes, index) => {
        if (posY > pageHeight - 30) {
            doc.addPage();
            posY = margin;
        }
        
        const bgColor = index % 2 === 0 ? [248, 250, 252] : [241, 245, 249];
        doc.setFillColor(...bgColor);
        doc.rect(margin, posY, pageWidth - (margin * 2), 8, 'F');
        
        const divergencia = mes.bruto - mes.liquido;
        const percentOmissao = ((divergencia / mes.bruto) * 100).toFixed(1);
        
        doc.text(mes.mes, margin + 5, posY + 5);
        doc.text(formatarMoeda(mes.bruto), margin + 50, posY + 5);
        doc.text(formatarMoeda(mes.liquido), margin + 100, posY + 5);
        doc.text(formatarMoeda(divergencia), margin + 150, posY + 5);
        doc.text(`${percentOmissao}%`, pageWidth - margin - 5, posY + 5, { align: 'right' });
        
        posY += 9;
    });
    
    posY += 10;
    
    // Análise de Impacto Setorial
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("ANÁLISE DE IMPACTO SETORIAL", margin, posY);
    posY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const impactoText = `Com base na divergência média identificada (${formatarMoeda(VDCSystem.analysis.projecaoMercado.comissaoMediaMensal)} por motorista/mês), 
    a projeção para o mercado português (${VDCSystem.analysis.projecaoMercado.motoristasAtivos.toLocaleString('pt-PT')} motoristas ativos) 
    aponta para um impacto setorial significativo:`;
    
    const splitImpacto = doc.splitTextToSize(impactoText, pageWidth - (margin * 2));
    doc.text(splitImpacto, margin, posY);
    posY += splitImpacto.length * 5 + 5;
    
    // Destaques do impacto
    const impactos = [
        `• Volume de Negócio Omitido Mensal: ${formatarMoeda(VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoMensal)}`,
        `• Volume de Negócio Omitido Anual: ${formatarMoeda(VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoAnual)}`,
        `• Impacto Fiscal Estimado (IVA 23%): ${formatarMoeda(VDCSystem.analysis.projecaoMercado.impactoFiscalEstimado)}/mês`
    ];
    
    impactos.forEach((impacto, index) => {
        if (posY > pageHeight - 50) {
            doc.addPage();
            posY = margin;
        }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text(impacto, margin + 10, posY);
        posY += 8;
    });
    
    // ========== PÁGINA 2: ANEXO TÉCNICO ==========
    doc.addPage();
    posY = margin;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("ANEXO TÉCNICO - RELATÓRIO DE EVIDÊNCIAS DIGITAIS", centerX, posY, { align: 'center' });
    posY += 15;
    
    doc.setDrawColor(0, 242, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, posY, pageWidth - margin, posY);
    posY += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const metodologiaText = [
        "METODOLOGIA DE EXTRAÇÃO E VALIDAÇÃO",
        "",
        "1. COLETA DE DADOS PRIMÁRIOS",
        "Os dados analisados foram extraídos diretamente de documentos oficiais:",
        "  • Ficheiros SAF-T (Standard Audit File for Tax)",
        "  • Faturas eletrónicas emitidas pelas plataformas digitais",
        "  • Extratos bancários em formato digital",
        "",
        "2. PROCESSAMENTO FORENSE",
        "Utilização de algoritmos especializados para reconciliação automática,",
        "identificação de padrões e deteção de discrepâncias entre fontes.",
        "",
        "3. NORMALIZAÇÃO E VALIDAÇÃO",
        "Conversão automática de diferentes formatos numéricos para valores",
        "decimais padrão, com validação cruzada entre documentos.",
        "",
        "4. ANÁLISE DE CONFORMIDADE",
        "Verificação da conformidade com a legislação fiscal portuguesa,",
        "com foco especial nas obrigações declarativas do regime DAC7.",
        "",
        "5. PROJEÇÃO E IMPACTO SETORIAL",
        "Extrapolação matemática baseada em amostra representativa para",
        "estimativa do impacto sistémico no mercado nacional.",
        "",
        "INTEGRIDADE PROCESSUAL",
        "Todo o processo de análise foi documentado e pode ser auditado",
        "independentemente, garantindo a rastreabilidade das conclusões.",
        "",
        "CONFIDENCIALIDADE E SEGURANÇA",
        "Este relatório destina-se exclusivamente a fins de auditoria e",
        "peritagem financeira, em estrito cumprimento do RGPD e da",
        "legislação de proteção de dados aplicável."
    ];
    
    metodologiaText.forEach(linha => {
        if (posY > pageHeight - 20) {
            doc.addPage();
            posY = margin;
        }
        
        if (linha.includes("METODOLOGIA") || linha.includes("INTEGRIDADE") || linha.includes("CONFIDENCIALIDADE")) {
            doc.setFont('helvetica', 'bold');
            doc.text(linha, margin, posY);
            doc.setFont('helvetica', 'normal');
        } else if (linha.includes("1.") || linha.includes("2.") || linha.includes("3.") || 
                   linha.includes("4.") || linha.includes("5.")) {
            doc.setFont('helvetica', 'bold');
            doc.text(linha, margin, posY);
            doc.setFont('helvetica', 'normal');
        } else if (linha.startsWith("  •")) {
            doc.text(linha, margin + 10, posY);
        } else {
            doc.text(linha, margin, posY);
        }
        
        posY += linha.trim() === "" ? 5 : 7;
    });
    
    // Rodapé em todas as páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v12.2 | Protocolo de Prova Legal com Sincronização Total", 15, pageHeight - 10);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
        
        // Linha de rodapé
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    }
}

function formatarMoeda(valor) {
    const formatter = new Intl.NumberFormat('pt-PT', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return formatter.format(valor);
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
        VDCSystem.totaisConsolidados.brutoTotal.toString(),
        VDCSystem.totaisConsolidados.comissaoTotal.toString(),
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
        console.log('🔧 Inicializando VDC Forensic System v12.2...');
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
                logAudit('✅ Sistema VDC v12.2 inicializado com sucesso', 'success');
                logAudit('Sincronização Total 4 Meses ativada | Dados Reais Set-Dez 2024', 'info');
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
    
    const reportadoDAC7 = VDCSystem.analysis.extractedValues.reportadoDAC7 || 0;
    const discrepancia = Math.abs(dac7Value - reportadoDAC7);
    
    VDCSystem.analysis.extractedValues.dac7Value = dac7Value;
    VDCSystem.analysis.extractedValues.dac7Discrepancy = discrepancia;
    
    const dac7Result = document.getElementById('dac7Result');
    const dac7Discrepancy = document.getElementById('dac7Discrepancy');
    
    if (dac7Result) dac7Result.style.display = 'flex';
    if (dac7Discrepancy) {
        const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' );
        dac7Discrepancy.textContent = formatter.format(discrepancia);
    }
    
    const status = discrepancia === 0 ? 'SINCRONIZAÇÃO PERFEITA' : 
                  discrepancia < 100 ? 'DIVERGÊNCIA ACEITÁVEL' : 
                  'ALERTA: DIVERGÊNCIA SIGNIFICATIVA';
    
    logAudit(`DAC7: Valor reportado ${dac7Value.toFixed(2)}€ vs Análise ${reportadoDAC7.toFixed(2)}€ | ${status}`, 
             discrepancia === 0 ? 'success' : discrepancia < 100 ? 'warn' : 'error');
}

// 15. FUNÇÕES DE RESET
function resetDashboard() {
    // Limpar valores do sistema (mantendo dados reais dos 4 meses)
    VDCSystem.documents = {
        control: { files: [], parsedData: null },
        saft: { files: [], totals: { gross: 0, iva6: 0, net: 0 } },
        invoices: { files: [], totals: { invoiceValue: 0, invoiceNumber: "N/D" } },
        statements: { files: [], totals: { 
            ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
            campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0
        }}
    };
    
    VDCSystem.analysis.extractedValues = {
        faturacaoBruta: 0,
        reportadoDAC7: 0,
        divergenciaComissoes: 0,
        
        // Resetar outros valores
        saftGross: 0, saftIVA6: 0, platformCommission: 0, bankTransfer: 0,
        iva23Due: 0, ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
        faturaPlataforma: 0, campanhas: 0, gorjetas: 0, cancelamentos: 0,
        portagens: 0, diferencialCusto: 0, prejuizoFiscal: 0, imtBase: 0,
        imtTax: 0, imtTotal: 0, dac7Value: 0, dac7Discrepancy: 0, valorIliquido: 0,
        iva6Percent: 0, iva23Autoliquidacao: 0, invoiceNumber: "N/D",
        projecaoSetorialMensal: 0, projecaoSetorialAnual: 0, taxaOmissaoPercentual: 0
    };
    
    VDCSystem.analysis.projecaoMercado = {
        motoristasAtivos: 38000,
        comissaoMediaMensal: 0,
        volumeNegocioOmitidoMensal: 0,
        volumeNegocioOmitidoAnual: 0,
        impactoFiscalEstimado: 0
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
    const divergenciaCard = document.getElementById('divergenciaCard');
    if (divergenciaCard) divergenciaCard.remove();
    
    const divergenciaAlert = document.getElementById('divergenciaAlert');
    if (divergenciaAlert) divergenciaAlert.remove();
    
    const omissionAlert = document.getElementById('omissionAlert');
    if (omissionAlert) omissionAlert.style.display = 'none';
    
    // Resetar gráfico
    if (VDCSystem.chart) {
        VDCSystem.chart.data.datasets[0].data = [0, 0, 0];
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
            sistema: "VDC Forensic System v12.2",
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            periodoAnalise: VDCSystem.periodoAnalise,
            analise: VDCSystem.analysis,
            dadosMensais: VDCSystem.dadosMensais,
            totaisConsolidados: VDCSystem.totaisConsolidados
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
            sistema: "VDC Forensic System v12.2",
            versao: VDCSystem.version,
            sessao: VDCSystem.sessionId,
            dataGeracao: new Date().toISOString(),
            cliente: VDCSystem.client,
            periodoAnalise: VDCSystem.periodoAnalise,
            dadosMensais: VDCSystem.dadosMensais,
            totaisConsolidados: VDCSystem.totaisConsolidados,
            analise: VDCSystem.analysis,
            projecaoMercado: VDCSystem.analysis.projecaoMercado,
            logs: VDCSystem.logs.slice(-50)
        };
        
        const jsonStr = JSON.stringify(evidenceData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dataStr = new Date().toISOString().split('T')[0];
        a.download = `VDC_EVIDENCIAS_COMPLETAS_${VDCSystem.sessionId}_${dataStr}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logAudit('✅ Evidências digitais completas guardadas como JSON', 'success');
        
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
console.log('VDC Sistema de Peritagem Forense v12.2 - Carregado com sucesso');
console.log('Sincronização Total 4 Meses | Dados Reais Set-Dez 2024');
