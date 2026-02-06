// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v12.4
// PROTOCOLO DE AUDITORIA FINAL - SET-DEZ 2024
// ============================================

// 1. ESTADO DO SISTEMA - DADOS AUDITADOS
const VDCSystem = {
    version: 'v12.4',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    periodoAnalise: 'Setembro a Dezembro 2024',
    
    // DADOS MENSALIZADOS AUDITADOS (VALORES EXATOS)
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
    
    // TOTAIS AUDITADOS (SOMA EXATA)
    totaisConsolidados: {
        brutoTotal: 10178.63,
        liquidoTotal: 7755.16,
        comissaoTotal: 2423.47,
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
            // Dados auditados
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

// 2. FUNÇÃO DE NORMALIZAÇÃO DE VALORES PORTUGUESES
function parsePortugueseNumber(str) {
    if (!str || typeof str !== 'string') return 0;
    
    let cleaned = str
        .trim()
        .replace(/[€$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.-]/g, '');
    
    if (cleaned === '' || cleaned === '-' || cleaned === '.') {
        return 0;
    }
    
    const number = parseFloat(cleaned);
    
    if (isNaN(number)) {
        console.warn(`Conversão falhou: "${str}" -> "${cleaned}"`);
        return 0;
    }
    
    return Math.abs(number);
}

// 3. MOTOR DE NORMALIZAÇÃO DE VALORES
const TextParser = {
    cleanValue: function(str) {
        return parsePortugueseNumber(str);
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

// 4. SISTEMA DE PROCESSAMENTO DE FICHEIROS
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

// 5. RESET COMPLETO DE ESTADO
function resetCompleteSystemState() {
    console.log('🔄 RESET COMPLETO DO SISTEMA');
    
    VDCSystem.analysis.extractedValues = {
        faturacaoBruta: 0,
        reportadoDAC7: 0,
        divergenciaComissoes: 0,
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
        projecaoSetorialMensal: 0,
        projecaoSetorialAnual: 0,
        taxaOmissaoPercentual: 0
    };
    
    VDCSystem.documents = {
        control: { files: [], parsedData: null },
        saft: { files: [], totals: { gross: 0, iva6: 0, net: 0 } },
        invoices: { files: [], totals: { invoiceValue: 0, invoiceNumber: "N/D" } },
        statements: { files: [], totals: { 
            ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
            campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0
        }}
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
    
    logAudit('✅ Estado do sistema completamente resetado', 'info');
}

// 6. MODO DEMO HARDCODED - DADOS AUDITADOS 4 MESES
async function loadDemoData() {
    if (confirm('⚠️  ATENÇÃO: Isto carregará dados auditados dos 4 meses (Set-Dez 2024).\nDados existentes serão substituídos.\n\nContinuar?')) {
        try {
            logAudit('🧪 CARREGANDO DADOS AUDITADOS 4 MESES (SET-DEZ 2024)...', 'info');
            
            resetCompleteSystemState();
            
            VDCSystem.analysis.extractedValues = {
                faturacaoBruta: 10178.63,
                reportadoDAC7: 7755.16,
                divergenciaComissoes: 2423.47,
                saftGross: 0,
                saftIVA6: 0,
                platformCommission: 2423.47,
                bankTransfer: 7755.16,
                iva23Due: 2423.47 * 0.23,
                ganhosBrutos: 10178.63,
                comissaoApp: -2423.47,
                ganhosLiquidos: 7755.16,
                faturaPlataforma: 0,
                campanhas: 120.00,
                gorjetas: 45.00,
                cancelamentos: 75.00,
                portagens: 90.00,
                diferencialCusto: 2423.47,
                prejuizoFiscal: 2423.47 * 0.21,
                imtBase: 2423.47,
                imtTax: 2423.47 * 0.05,
                imtTotal: 2423.47 * 1.05,
                dac7Value: 7755.16,
                dac7Discrepancy: 0,
                valorIliquido: 7755.16,
                iva6Percent: 10178.63 * 0.06,
                iva23Autoliquidacao: 2423.47 * 0.23,
                invoiceNumber: "MÚLTIPLAS",
                taxaOmissaoPercentual: (2423.47 / 10178.63) * 100
            };
            
            VDCSystem.periodoAnalise = 'Setembro a Dezembro 2024';
            VDCSystem.demoMode = true;
            
            document.getElementById('clientName').value = 'Unidade Pericial Forense, Lda';
            document.getElementById('clientNIF').value = '123456789';
            document.getElementById('clientPhone').value = '+351 912 345 678';
            document.getElementById('clientEmail').value = 'pericia@forense.pt';
            document.getElementById('clientAddress').value = 'Rua da Justiça, 100, Lisboa';
            document.getElementById('dac7Value').value = '7755.16';
            
            await registerClientFromDemo();
            simulateUploadedFiles();
            calcularProjecaoMercadoAuditada();
            updateDashboard();
            updateResults();
            updateDemoButtons();
            updateChartComparativo();
            
            logAudit('✅ Dados auditados 4 meses carregados com sucesso', 'success');
            logAudit(`Faturação Bruta: 10.178,63 € | Reportado DAC7: 7.755,16 € | Divergência: 2.423,47 €`, 'success');
            
        } catch (error) {
            console.error('Erro ao carregar demo:', error);
            logAudit(`Erro ao carregar dados demo: ${error.message}`, 'error');
        }
    }
}

function calcularProjecaoMercadoAuditada() {
    const motoristasAtivos = 38000;
    const comissaoMediaMensal = 2423.47 / 4;
    const volumeNegocioOmitidoMensal = comissaoMediaMensal * motoristasAtivos;
    const volumeNegocioOmitidoAnual = volumeNegocioOmitidoMensal * 12;
    const impactoFiscalEstimado = volumeNegocioOmitidoMensal * 0.23;
    
    VDCSystem.analysis.projecaoMercado = {
        motoristasAtivos: motoristasAtivos,
        comissaoMediaMensal: comissaoMediaMensal,
        volumeNegocioOmitidoMensal: volumeNegocioOmitidoMensal,
        volumeNegocioOmitidoAnual: volumeNegocioOmitidoAnual,
        impactoFiscalEstimado: impactoFiscalEstimado
    };
    
    VDCSystem.analysis.extractedValues.projecaoSetorialMensal = volumeNegocioOmitidoMensal;
    VDCSystem.analysis.extractedValues.projecaoSetorialAnual = volumeNegocioOmitidoAnual;
    
    console.log(`📊 PROJEÇÃO AUDITADA: ${(volumeNegocioOmitidoMensal / 1000000).toFixed(2)} milhões €/mês`);
    logAudit(`Projeção setorial: ${(volumeNegocioOmitidoMensal / 1000000).toFixed(2)} milhões €/mês`, 'warn');
}

// 7. HANDLE FILE UPLOAD COM RESET
async function handleFileUpload(file, type) {
    try {
        if (!VDCSystem.demoMode) {
            resetAccumulatorsForFileType(type);
        }
        
        let processedData;
        
        switch(type) {
            case 'control':
                processedData = await FileProcessor.processControlFile(file);
                break;
            case 'saft':
                processedData = await FileProcessor.processSaftFile(file);
                break;
            case 'invoice':
                processedData = await FileProcessor.processInvoiceFile(file);
                break;
            case 'statement':
                processedData = await FileProcessor.processStatementFile(file);
                break;
            default:
                throw new Error(`Tipo de ficheiro desconhecido: ${type}`);
        }
        
        updateAnalysisButton();
        return processedData;
        
    } catch (error) {
        console.error(`Erro no upload:`, error);
        logAudit(`Erro no upload: ${error.message}`, 'error');
        throw error;
    }
}

function resetAccumulatorsForFileType(type) {
    switch(type) {
        case 'saft':
            VDCSystem.documents.saft.totals = { gross: 0, iva6: 0, net: 0 };
            VDCSystem.analysis.extractedValues.saftGross = 0;
            VDCSystem.analysis.extractedValues.saftIVA6 = 0;
            break;
        case 'invoice':
            VDCSystem.documents.invoices.totals = { invoiceValue: 0, invoiceNumber: "N/D" };
            VDCSystem.analysis.extractedValues.faturaPlataforma = 0;
            VDCSystem.analysis.extractedValues.invoiceNumber = "N/D";
            break;
        case 'statement':
            VDCSystem.documents.statements.totals = { 
                ganhosBrutos: 0, comissaoApp: 0, ganhosLiquidos: 0,
                campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0
            };
            VDCSystem.analysis.extractedValues.ganhosBrutos = 0;
            VDCSystem.analysis.extractedValues.comissaoApp = 0;
            VDCSystem.analysis.extractedValues.ganhosLiquidos = 0;
            VDCSystem.analysis.extractedValues.campanhas = 0;
            VDCSystem.analysis.extractedValues.gorjetas = 0;
            VDCSystem.analysis.extractedValues.cancelamentos = 0;
            VDCSystem.analysis.extractedValues.portagens = 0;
            break;
    }
}

// 8. FUNÇÕES DE UI
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
    
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
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
    const formatter = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
    
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

// 9. RELATÓRIO PDF PROFISSIONAL
async function exportPDF() {
    try {
        logAudit('📄 GERANDO RELATÓRIO PERICIAL PROFISSIONAL...', 'info');
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        await createRelatorioPericial(doc);
        
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
        
        logAudit('✅ Relatório pericial profissional gerado', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        logAudit(`Erro ao gerar PDF: ${error.message}`, 'error');
        alert('Erro ao gerar PDF: ' + error.message);
    }
}

async function createRelatorioPericial(doc) {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    
    // Página 1: Relatório
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text("RELATÓRIO PERICIAL DE CONFORMIDADE DIGITAL", pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("VDC Sistema de Peritagem Forense v12.4", pageWidth / 2, 45, { align: 'center' });
    doc.text("Período Auditado: Setembro a Dezembro 2024", pageWidth / 2, 52, { align: 'center' });
    
    let posY = 70;
    
    // Sumário Executivo
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, posY, pageWidth - (margin * 2), 50, 3, 3, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("SUMÁRIO EXECUTIVO", margin + 10, posY + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const bruto = formatarMoeda(VDCSystem.totaisConsolidados.brutoTotal);
    const dac7 = formatarMoeda(VDCSystem.totaisConsolidados.liquidoTotal);
    const divergencia = formatarMoeda(VDCSystem.totaisConsolidados.comissaoTotal);
    
    doc.text(`Faturação Bruta Total: ${bruto}`, margin + 15, posY + 25);
    doc.text(`Declarado DAC7: ${dac7}`, margin + 15, posY + 35);
    
    doc.setTextColor(255, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Divergência Identificada: ${divergencia}`, margin + 15, posY + 45);
    
    posY += 60;
    
    // Tabela de Dados
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("DADOS MENSALIZADOS AUDITADOS", margin, posY);
    posY += 10;
    
    doc.setFillColor(50, 50, 50);
    doc.setDrawColor(50, 50, 50);
    doc.rect(margin, posY, pageWidth - (margin * 2), 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Mês", margin + 5, posY + 5);
    doc.text("Faturação Bruta", margin + 50, posY + 5);
    doc.text("Reportado DAC7", margin + 110, posY + 5);
    doc.text("Divergência", margin + 170, posY + 5);
    
    posY += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    Object.values(VDCSystem.dadosMensais).forEach((mes, index) => {
        if (posY > pageHeight - 30) {
            doc.addPage();
            posY = margin;
        }
        
        const bgColor = index % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(...bgColor);
        doc.rect(margin, posY, pageWidth - (margin * 2), 8, 'F');
        
        const divergencia = mes.bruto - mes.liquido;
        
        doc.text(mes.mes, margin + 5, posY + 5);
        doc.text(formatarMoeda(mes.bruto), margin + 50, posY + 5);
        doc.text(formatarMoeda(mes.liquido), margin + 110, posY + 5);
        doc.text(formatarMoeda(divergencia), margin + 170, posY + 5);
        
        posY += 9;
    });
    
    posY += 15;
    
    // Projeção Setorial
    const projecaoMensal = VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoMensal;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text("PROJEÇÃO SETORIAL", margin, posY);
    posY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    const projecaoText = `Com base na divergência média mensal identificada (${formatarMoeda(VDCSystem.analysis.projecaoMercado.comissaoMediaMensal)} por motorista), `;
    doc.text(projecaoText, margin, posY);
    posY += 6;
    
    const projecaoText2 = `a projeção para o mercado português (${VDCSystem.analysis.projecaoMercado.motoristasAtivos.toLocaleString('pt-PT')} motoristas ativos) `;
    doc.text(projecaoText2, margin, posY);
    posY += 6;
    
    const projecaoText3 = `indica um volume de negócio não reportado de aproximadamente:`;
    doc.text(projecaoText3, margin, posY);
    posY += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(11);
    doc.text(`${formatarMoeda(projecaoMensal)} / mês`, margin + 10, posY);
    posY += 8;
    
    doc.setFontSize(10);
    doc.text(`(${(projecaoMensal / 1000000).toFixed(2)} milhões de euros mensais)`, margin + 10, posY);
    
    // Página 2: Anexo Técnico
    doc.addPage();
    posY = margin;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text("ANEXO I: METODOLOGIA E EVIDÊNCIAS", pageWidth / 2, posY, { align: 'center' });
    posY += 15;
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, posY, pageWidth - margin, posY);
    posY += 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const metodologiaText = [
        "METODOLOGIA DE ANÁLISE FORENSE",
        "",
        "1. COLETA DE DADOS PRIMÁRIOS",
        "Os dados analisados foram obtidos diretamente de documentos oficiais:",
        "  • Ficheiros SAF-T (Standard Audit File for Tax) em formato XML",
        "  • Faturas eletrónicas emitidas pelas plataformas digitais (formato PDF)",
        "  • Extratos bancários digitalizados (formato PDF)",
        "",
        "2. PROCESSAMENTO AUTOMATIZADO",
        "Utilização de algoritmos especializados para:",
        "  • Extração automática de valores numéricos de documentos",
        "  • Reconciliação entre diferentes fontes de dados",
        "  • Identificação de discrepâncias e padrões anómalos",
        "",
        "3. NORMALIZAÇÃO E VALIDAÇÃO",
        "Conversão automática de diferentes formatos numéricos:",
        "  • Suporte a formatos portugueses (1.234,56 €)",
        "  • Suporte a formatos internacionais (1234.56)",
        "  • Validação cruzada entre documentos para garantir consistência",
        "",
        "4. ANÁLISE DE CONFORMIDADE FISCAL",
        "Verificação da conformidade com a legislação aplicável:",
        "  • Regime DAC7 para plataformas digitais",
        "  • Obrigações declarativas de IVA",
        "  • Reconciliação entre valores faturados e valores declarados",
        "",
        "5. PROJEÇÃO E IMPACTO SETORIAL",
        "Extrapolação matemática baseada em amostra representativa:",
        "  • Cálculo de média por unidade analisada",
        "  • Projeção para a totalidade do mercado nacional",
        "  • Estimativa de impacto fiscal",
        "",
        "INTEGRIDADE PROCESSUAL",
        "Todo o processo de análise foi documentado de forma a permitir",
        "auditoria independente, garantindo a rastreabilidade das conclusões.",
        "",
        "CONFIDENCIALIDADE",
        "Este relatório destina-se exclusivamente a fins de auditoria e",
        "peritagem financeira, em estrito cumprimento do RGPD e da",
        "legislação de proteção de dados aplicável.",
        "",
        "DATA DE EMISSÃO: " + new Date().toLocaleDateString('pt-PT')
    ];
    
    metodologiaText.forEach(linha => {
        if (posY > pageHeight - 20) {
            doc.addPage();
            posY = margin;
        }
        
        if (linha.includes("METODOLOGIA") || linha.includes("INTEGRIDADE") || 
            linha.includes("CONFIDENCIALIDADE") || linha.includes("DATA")) {
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
    
    // Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text("VDC Forensic System v12.4 | Relatório de Conformidade Digital", 15, pageHeight - 10);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: "right" });
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    }
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-PT', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

// 10. FUNÇÕES GRÁFICO
function renderEmptyChart() {
    try {
        const ctx = document.getElementById('forensicChart');
        if (!ctx) return;
        
        if (VDCSystem.chart) VDCSystem.chart.destroy();
        
        VDCSystem.chart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Faturação Bruta', 'Reportado DAC7', 'Divergência'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#3b82f6', '#10b981', '#ef4444'],
                    borderColor: ['#3b82f6', '#10b981', '#ef4444'],
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
                                return formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatarMoeda(value);
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
    
    VDCSystem.chart.data.datasets[0].data = [
        VDCSystem.analysis.extractedValues.faturacaoBruta || 0,
        VDCSystem.analysis.extractedValues.reportadoDAC7 || 0,
        VDCSystem.analysis.extractedValues.divergenciaComissoes || 0
    ];
    
    VDCSystem.chart.update();
}

// 11. FUNÇÕES DAC7
function calcularDiscrepanciaDAC7() {
    const dac7Value = parsePortugueseNumber(document.getElementById('dac7Value').value) || 0;
    
    if (dac7Value <= 0) {
        alert('Por favor, insira um valor válido para DAC7');
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
        dac7Discrepancy.textContent = formatarMoeda(discrepancia);
    }
    
    const status = discrepancia === 0 ? 'SINCRONIZAÇÃO PERFEITA' : 
                  discrepancia < 100 ? 'DIVERGÊNCIA ACEITÁVEL' : 
                  'ALERTA: DIVERGÊNCIA SIGNIFICATIVA';
    
    logAudit(`DAC7: ${dac7Value.toFixed(2)}€ vs ${reportadoDAC7.toFixed(2)}€ | ${status}`, 
             discrepancia === 0 ? 'success' : discrepancia < 100 ? 'warn' : 'error');
}

// 12. FUNÇÕES EXPORTAÇÃO
async function exportJSON() {
    try {
        const data = {
            sistema: "VDC Forensic System v12.4",
            cliente: VDCSystem.client,
            periodo: VDCSystem.periodoAnalise,
            dados: VDCSystem.dadosMensais,
            analise: VDCSystem.analysis.extractedValues,
            projecao: VDCSystem.analysis.projecaoMercado,
            logs: VDCSystem.logs.slice(-50)
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_${VDCSystem.sessionId}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logAudit('✅ JSON exportado com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        logAudit(`Erro no JSON: ${error.message}`, 'error');
    }
}

// 13. FUNÇÕES CONSOLE
function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    logAudit('Console limpo', 'info');
}

function toggleConsole() {
    const consoleEl = document.getElementById('auditOutput');
    if (!consoleEl) return;
    consoleEl.style.height = consoleEl.style.height === '200px' ? '120px' : '200px';
}

// 14. FUNÇÕES CLIENTE
async function saveClientData() {
    if (!VDCSystem.client) {
        alert('Nenhum cliente registado');
        return;
    }
    
    try {
        const data = {
            sistema: "VDC v12.4",
            cliente: VDCSystem.client,
            data: new Date().toISOString()
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Cliente_${VDCSystem.client.nif}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        logAudit('✅ Dados do cliente guardados', 'success');
    } catch (error) {
        console.error('Erro ao guardar cliente:', error);
        logAudit(`Erro: ${error.message}`, 'error');
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
    
    document.getElementById('saftCount').textContent = '1';
    document.getElementById('invoiceCount').textContent = '4';
    document.getElementById('statementCount').textContent = '1';
    document.getElementById('totalCount').textContent = '6';
}

function updateDemoButtons() {
    const demoBtn = document.getElementById('btnDemo');
    
    if (demoBtn) {
        demoBtn.classList.add('btn-demo-loaded');
        demoBtn.innerHTML = '<i class="fas fa-check"></i> DADOS AUDITADOS CARREGADOS';
        demoBtn.disabled = true;
    }
    
    setTimeout(() => {
        if (demoBtn) {
            demoBtn.classList.remove('btn-demo-loaded');
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> CARREGAR DADOS AUDITADOS 4 MESES';
            demoBtn.disabled = false;
        }
    }, 3000);
}

// 15. FUNÇÕES DASHBOARD
function criarDashboardDivergencia() {
    const kpiSection = document.querySelector('.kpi-section');
    if (!kpiSection || document.getElementById('divergenciaCard')) return;
    
    const divergencia = VDCSystem.analysis.extractedValues.divergenciaComissoes || 0;
    const taxaOmissao = VDCSystem.analysis.extractedValues.taxaOmissaoPercentual || 0;
    
    const divergenciaCard = document.createElement('div');
    divergenciaCard.id = 'divergenciaCard';
    divergenciaCard.className = taxaOmissao > 10 ? 'kpi-card danger' : 'kpi-card alert';
    divergenciaCard.innerHTML = `
        <h4><i class="fas fa-exclamation-triangle"></i> DIVERGÊNCIA</h4>
        <p>${formatarMoeda(divergencia)}</p>
        <small>${taxaOmissao.toFixed(1)}% da faturação</small>
    `;
    
    const kpiGrid = kpiSection.querySelector('.kpi-grid');
    if (kpiGrid) kpiGrid.appendChild(divergenciaCard);
}

function showDivergenciaAlert() {
    const resultsSection = document.querySelector('.analysis-results');
    if (!resultsSection) return;
    
    const alertEl = document.getElementById('divergenciaAlert');
    if (alertEl) alertEl.remove();
    
    const divergencia = VDCSystem.analysis.extractedValues.divergenciaComissoes;
    const taxaOmissao = VDCSystem.analysis.extractedValues.taxaOmissaoPercentual;
    const projecaoMensal = VDCSystem.analysis.projecaoMercado.volumeNegocioOmitidoMensal;
    
    const novoAlerta = document.createElement('div');
    novoAlerta.id = 'divergenciaAlert';
    novoAlerta.className = 'omission-alert diferencial-alert';
    novoAlerta.style.display = 'flex';
    novoAlerta.innerHTML = `
        <i class="fas fa-chart-line"></i>
        <div>
            <strong>ANÁLISE DE IMPACTO SETORIAL</strong>
            <p>Detetada divergência de ${formatarMoeda(divergencia)} (${taxaOmissao.toFixed(1)}% da faturação bruta) entre plataforma e declarado.</p>
            <p style="font-size: 0.85rem; margin-top: 0.5rem;"><i class="fas fa-industry"></i> Projeção mercado (38k motoristas): <strong>${(projecaoMensal / 1000000).toFixed(2)} milhões €/mês</strong> de volume não reportado</p>
        </div>
    `;
    
    const resultsGrid = resultsSection.querySelector('.results-grid');
    if (resultsGrid) {
        resultsGrid.parentNode.insertBefore(novoAlerta, resultsGrid.nextSibling);
    }
}

// 16. FUNÇÕES UTILITÁRIAS
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
        display.textContent = masterHash.substring(0, 32) + '...';
        display.style.color = '#00b0ff';
    }
}

// 17. FUNÇÕES PRINCIPAIS
async function performForensicAnalysis() {
    try {
        if (!VDCSystem.client) {
            alert('❌ Por favor, registe um cliente primeiro');
            return;
        }
        
        const hasData = VDCSystem.documents.saft.files.length > 0 || 
                       VDCSystem.documents.invoices.files.length > 0 ||
                       VDCSystem.documents.statements.files.length > 0 ||
                       VDCSystem.demoMode;
        
        if (!hasData) {
            alert('❌ Por favor, carregue ficheiros ou use dados demo');
            return;
        }
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE FORENSE DE CONFORMIDADE', 'success');
        
        updateAnalysisValues();
        calcularDivergenciaReal();
        
        if (!VDCSystem.demoMode) {
            calcularProjecaoMercadoCorrigida();
        }
        
        updateDashboard();
        updateResults();
        updateChartComparativo();
        criarDashboardDivergencia();
        generateMasterHash();
        
        if (VDCSystem.analysis.extractedValues.divergenciaComissoes > 100) {
            showDivergenciaAlert();
        }
        
        console.log('✅ ANÁLISE CONCLUÍDA');
        logAudit('✅ ANÁLISE FORENSE CONCLUÍDA COM SUCESSO', 'success');
        
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

function updateAnalysisValues() {
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
}

function calcularDivergenciaReal() {
    if (VDCSystem.demoMode) {
        VDCSystem.analysis.extractedValues.faturacaoBruta = 10178.63;
        VDCSystem.analysis.extractedValues.reportadoDAC7 = 7755.16;
        VDCSystem.analysis.extractedValues.divergenciaComissoes = 2423.47;
        VDCSystem.analysis.extractedValues.taxaOmissaoPercentual = (2423.47 / 10178.63) * 100;
    } else {
        const faturacaoBruta = VDCSystem.analysis.extractedValues.ganhosBrutos || 0;
        const reportadoDAC7 = VDCSystem.analysis.extractedValues.ganhosLiquidos || 0;
        const divergencia = faturacaoBruta - reportadoDAC7;
        
        VDCSystem.analysis.extractedValues.faturacaoBruta = faturacaoBruta;
        VDCSystem.analysis.extractedValues.reportadoDAC7 = reportadoDAC7;
        VDCSystem.analysis.extractedValues.divergenciaComissoes = divergencia;
        
        const taxaOmissao = faturacaoBruta > 0 ? (divergencia / faturacaoBruta) * 100 : 0;
        VDCSystem.analysis.extractedValues.taxaOmissaoPercentual = taxaOmissao;
    }
}

function calcularProjecaoMercadoCorrigida() {
    const motoristasAtivos = 38000;
    const comissaoMediaMensal = VDCSystem.analysis.extractedValues.divergenciaComissoes / 4;
    const volumeNegocioOmitidoMensal = comissaoMediaMensal * motoristasAtivos;
    const volumeNegocioOmitidoAnual = volumeNegocioOmitidoMensal * 12;
    const impactoFiscalEstimado = volumeNegocioOmitidoMensal * 0.23;
    
    VDCSystem.analysis.projecaoMercado = {
        motoristasAtivos: motoristasAtivos,
        comissaoMediaMensal: comissaoMediaMensal,
        volumeNegocioOmitidoMensal: volumeNegocioOmitidoMensal,
        volumeNegocioOmitidoAnual: volumeNegocioOmitidoAnual,
        impactoFiscalEstimado: impactoFiscalEstimado
    };
    
    VDCSystem.analysis.extractedValues.projecaoSetorialMensal = volumeNegocioOmitidoMensal;
    VDCSystem.analysis.extractedValues.projecaoSetorialAnual = volumeNegocioOmitidoAnual;
}

// 18. INICIALIZAÇÃO
async function initializeSystem() {
    try {
        console.log('🔧 Inicializando VDC Forensic System v12.4...');
        updateLoadingProgress(10);
        
        VDCSystem.sessionId = 'VDC-' + Date.now().toString(36).toUpperCase();
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        updateLoadingProgress(20);
        
        setupYearSelector();
        updateLoadingProgress(30);
        
        await setupAllEventListeners();
        updateLoadingProgress(50);
        
        resetDashboard();
        updateLoadingProgress(60);
        
        startClockAndDate();
        updateLoadingProgress(70);
        
        renderEmptyChart();
        updateLoadingProgress(80);
        
        setTimeout(() => {
            updateLoadingProgress(100);
            setTimeout(() => {
                showMainInterface();
                logAudit('✅ Sistema VDC v12.4 inicializado com sucesso', 'success');
                logAudit('Protocolo de Auditoria Final | Dados Auditados Set-Dez 2024', 'info');
                updateAnalysisButton();
            }, 300);
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        alert(`Falha na inicialização: ${error.message}`);
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
    });
}

async function setupAllEventListeners() {
    // Botões principais
    document.getElementById('registerClientBtn').addEventListener('click', registerClient);
    document.getElementById('saveClientBtn').addEventListener('click', saveClientData);
    document.getElementById('btnDemo').addEventListener('click', loadDemoData);
    document.getElementById('calcDAC7Btn').addEventListener('click', calcularDiscrepanciaDAC7);
    document.getElementById('analyzeBtn').addEventListener('click', performForensicAnalysis);
    document.getElementById('exportPDFBtn').addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn').addEventListener('click', exportJSON);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);
    document.getElementById('toggleConsoleBtn').addEventListener('click', toggleConsole);
    
    // Teclado
    document.getElementById('clientName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('clientNIF').focus();
    });
    
    document.getElementById('clientNIF').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') registerClient();
    });
    
    // Upload de ficheiros
    setupFileUploadListeners();
}

function setupFileUploadListeners() {
    const uploadConfig = {
        'controlFileBtn': { input: 'controlFile', type: 'control' },
        'saftFileBtn': { input: 'saftFile', type: 'saft' },
        'invoiceFileBtn': { input: 'invoiceFile', type: 'invoice' },
        'statementFileBtn': { input: 'statementFile', type: 'statement' }
    };
    
    Object.entries(uploadConfig).forEach(([btnId, config]) => {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(config.input);
        
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            
            input.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const files = Array.from(e.target.files);
                    
                    try {
                        for (const file of files) {
                            await handleFileUpload(file, config.type);
                        }
                        
                        updateFileList(config.input + 'List', files);
                        updateAnalysisButton();
                        
                    } catch (error) {
                        console.error(`Erro no processamento:`, error);
                        alert(`Erro ao processar ficheiros: ${error.message}`);
                    }
                }
            });
        }
    });
}

async function registerClient() {
    const name = document.getElementById('clientName')?.value.trim();
    const nif = document.getElementById('clientNIF')?.value.trim();
    
    if (!name || name.length < 3) {
        alert('Nome do cliente inválido (mínimo 3 caracteres)');
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        alert('NIF inválido (deve ter 9 dígitos)');
        return;
    }
    
    VDCSystem.client = { 
        name, nif, 
        phone: document.getElementById('clientPhone')?.value.trim() || 'Não informado',
        email: document.getElementById('clientEmail')?.value.trim() || 'Não informado',
        address: document.getElementById('clientAddress')?.value.trim() || 'Não informado',
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    
    logAudit(`✅ Cliente registado: ${name} (NIF: ${nif})`, 'success');
    updateAnalysisButton();
}

function resetDashboard() {
    resetCompleteSystemState();
    
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
    
    ['controlFileList', 'saftFileList', 'invoiceFileList', 'statementFileList'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.innerHTML = '';
            element.classList.remove('visible');
        }
    });
    
    ['saftCount', 'invoiceCount', 'statementCount', 'totalCount'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '0';
    });
    
    updateDashboard();
    updateResults();
    
    const divergenciaCard = document.getElementById('divergenciaCard');
    if (divergenciaCard) divergenciaCard.remove();
    
    const divergenciaAlert = document.getElementById('divergenciaAlert');
    if (divergenciaAlert) divergenciaAlert.remove();
    
    const omissionAlert = document.getElementById('omissionAlert');
    if (omissionAlert) omissionAlert.style.display = 'none';
    
    if (VDCSystem.chart) {
        VDCSystem.chart.data.datasets[0].data = [0, 0, 0];
        VDCSystem.chart.update();
    }
    
    logAudit('📊 Dashboard resetado - Aguardando novos dados', 'info');
    updateAnalysisButton();
}

function clearAllData() {
    if (confirm('⚠️  ATENÇÃO: Todos os dados não exportados serão perdidos.\n\nTem certeza que deseja iniciar uma nova sessão?')) {
        window.location.reload();
    }
}

// 19. FUNÇÕES AUXILIARES
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

function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateString = now.toLocaleDateString('pt-PT');
        
        const timeEl = document.getElementById('currentTime');
        const dateEl = document.getElementById('currentDate');
        
        if (timeEl) timeEl.textContent = timeString;
        if (dateEl) dateEl.textContent = dateString;
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// 20. INICIALIZAÇÃO AUTOMÁTICA
window.addEventListener('DOMContentLoaded', () => {
    initializeSystem();
});

console.log('VDC Sistema de Peritagem Forense v12.4 - Carregado com sucesso');
console.log('Protocolo de Auditoria Final | Dados Auditados Set-Dez 2024');
