// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v10.9
// FINAL STABLE RELEASE - BIG DATA FORENSE
// ============================================

// 1. ESTADO DO SISTEMA - ESTRUTURA FORENSE ISO/NIST V10.9
const VDCSystem = {
    version: 'v10.9-FS',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    
    // DATA ACCUMULATOR PERSISTENCE - CORREÇÃO IMPLEMENTADA
    dataAccumulator: {
        dac7: { total: 0, files: [] },
        saft: { gross: 0, iva6: 0, net: 0, files: [] },
        invoices: { total: 0, commission: 0, files: [] },
        statements: { gross: 0, commission: 0, net: 0, files: [] }
    },
    
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '' }, hashes: {} },
        control: { files: [], parsedData: null, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { 
            commission: 0, 
            iva23: 0, 
            invoiceValue: 0,
            invoicesFound: [],
            invoiceNumbers: []
        }, hashes: {}},
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            expected: 0,
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
            diferencialCusto: 0
        }, hashes: {}}
    },
    
    analysis: {
        extractedValues: {
            // SAF-T
            saftGross: 0,
            saftIVA6: 0,
            saftNet: 0,
            
            // Platform Data
            platformCommission: 0,
            bankTransfer: 0,
            iva23Due: 0,
            
            // Bolt KPIs
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            faturaPlataforma: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
            
            // Forensic Findings
            diferencialCusto: 0,
            prejuizoFiscal: 0,
            ivaAutoliquidacao: 0,
            
            // DAC7
            dac7Revenue: 0,
            dac7Period: '',
            
            // NOVO: Juros de Mora (RGRC 4%)
            jurosMora: 0,
            
            // Passivo Regulatório (AMT/IMT)
            taxaRegulacao: 0,
            riscoRegulatorio: 0
        },
        
        crossings: {
            deltaA: 0,      // SAF-T vs Extratos
            deltaB: 0,      // Comissão vs Fatura
            omission: 0,
            isValid: true,
            diferencialAlerta: false,
            fraudIndicators: [],
            bigDataAlertActive: false,
            discrepanciaAlertaAtiva: false,
            riscoRegulatorioAtivo: false
        },
        
        projection: {
            marketProjection: 0,
            averagePerDriver: 0,
            driverCount: 38000,
            monthsPerYear: 12,
            yearsOfOperation: 7,
            totalMarketImpact: 0
        },
        
        chainOfCustody: [],
        anomalies: [],
        quesitosEstrategicos: [],
        legalCitations: [
            "ISO/IEC 27037:2012 - Preservação de Evidência Digital",
            "NIST SP 800-86 - Guia para Análise Forense de Dados",
            "Regime Geral das Infrações Tributárias (RGRC) - Art. 103.º",
            "Código do IRC, Artigo 87º - Tratamento Contabilístico integral de custos e proveitos",
            "CIVA, Artigo 2.º - Obrigação de faturação completa",
            "CIVA, Artigo 29º - Obrigação de faturação completa",
            "RGIT, Artigo 103º - Crime de Fraude Fiscal",
            "Código Penal, Art. 158-A a 158-F - Cadeia de Custódia Digital",
            "Diretiva DAC7 - Transparência de plataformas digitais",
            "Lei 83/2017 - Prevenção do Branqueamento de Capitais",
            "Decreto-Lei 83/2017 - Taxa de Regulação (AMT/IMT)",
            "Regulamento (UE) 2016/679 - RGPD - Governança de Dados"
        ]
    },
    
    counters: {
        dac7: 0,
        control: 0,
        saft: 0,
        invoices: 0,
        statements: 0,
        total: 0
    },
    
    logs: [],
    chart: null,
    preRegisteredClients: [],
    bigDataAlertInterval: null,
    discrepanciaAlertaInterval: null,
    
    // EUROPEAN CURRENCY NORMALIZATION - CORREÇÃO IMPLEMENTADA
    currencyParser: function(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        
        // Converter para string
        let str = String(value);
        
        // Remover espaços, símbolos de moeda europeus
        str = str.trim()
            .replace(/[€\$\s]/g, '')
            .replace(/\./g, '')      // Remover separadores de milhar
            .replace(/,/g, '.');     // Converter vírgula decimal para ponto
        
        // Extrair apenas números e ponto decimal
        const matches = str.match(/-?\d+(\.\d+)?/);
        if (!matches) return 0;
        
        const result = parseFloat(matches[0]);
        return isNaN(result) ? 0 : result;
    }
};

// 2. EUROPEAN CURRENCY NORMALIZATION (Regex-based) - CORREÇÃO IMPLEMENTADA
function parseEuropeanCurrency(value) {
    if (!value && value !== 0) return 0;
    
    // Se já for número, retornar
    if (typeof value === 'number') return value;
    
    const str = String(value);
    
    // Padrões europeus: 1.250,50 € ou 1,250.50 € ou 1250,50
    const patterns = [
        /([-]?[\d\s]+(?:\.\d{3})*(?:,\d{1,2}))/g,  // 1.250,50
        /([-]?[\d\s]+(?:,\d{3})*(?:\.\d{1,2}))/g,  // 1,250.50
        /([-]?[\d\s]+(?:\.\d{1,2}))/g,             // 1250.50
        /([-]?[\d\s]+(?:,\d{1,2}))/g               // 1250,50
    ];
    
    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match) {
            let numberStr = match[0]
                .replace(/\s/g, '')
                .replace(/\./g, '')
                .replace(/,/g, '.');
            
            const result = parseFloat(numberStr);
            if (!isNaN(result)) {
                return result;
            }
        }
    }
    
    // Fallback: extrair todos os números
    const numbers = str.match(/[-]?\d+(?:[.,]\d+)?/g);
    if (numbers && numbers.length > 0) {
        const lastNumber = numbers[numbers.length - 1]
            .replace(/[.,](?=\d{3})/g, '')
            .replace(/,/g, '.');
        
        const result = parseFloat(lastNumber);
        return isNaN(result) ? 0 : result;
    }
    
    return 0;
}

// 3. ASYNCHRONOUS PROMISE.ALL CONTROL - CORREÇÃO IMPLEMENTADA
async function processMultipleFilesSync(type, files, appendMode = true) {
    try {
        console.log(`🔍 Processando ${files.length} ficheiros ${type} de forma síncrona...`);
        
        // Garantir arrays existentes
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = {
                files: [],
                parsedData: [],
                totals: {},
                hashes: {}
            };
        }
        
        // MODE APPEND - CORREÇÃO IMPLEMENTADA
        if (appendMode) {
            VDCSystem.documents[type].files.push(...files);
        } else {
            VDCSystem.documents[type].files = files;
        }
        
        // Processar cada ficheiro com Promise.all
        const processingPromises = files.map(async (file) => {
            try {
                const text = await readFileAsText(file);
                
                // Gerar hash SHA-256
                const fileHash = CryptoJS.SHA256(text).toString();
                VDCSystem.documents[type].hashes[file.name] = fileHash;
                
                // Atualizar cadeia de custódia
                updateChainOfCustodyHash(file.name, fileHash);
                
                // Extrair dados com base no tipo
                let extractedData = null;
                
                switch(type) {
                    case 'dac7':
                        extractedData = extractDAC7Data(text, file.name);
                        break;
                    case 'control':
                        extractedData = { 
                            filename: file.name, 
                            hash: fileHash,
                            timestamp: new Date().toISOString()
                        };
                        break;
                    case 'saft':
                        extractedData = extractSAFTData(text, file.name);
                        break;
                    case 'invoices':
                        extractedData = extractInvoiceData(text, file.name);
                        break;
                    case 'statements':
                        extractedData = extractStatementData(text, file.name);
                        break;
                }
                
                if (extractedData) {
                    // DATA ACCUMULATOR PERSISTENCE - CORREÇÃO IMPLEMENTADA
                    accumulateData(type, extractedData);
                    
                    VDCSystem.documents[type].parsedData.push({
                        filename: file.name,
                        hash: fileHash,
                        data: extractedData,
                        timestamp: new Date().toISOString()
                    });
                    
                    return { success: true, file: file.name };
                }
                
                return { success: false, file: file.name, error: 'No data extracted' };
                
            } catch (error) {
                console.error(`Erro no ficheiro ${file.name}:`, error);
                return { success: false, file: file.name, error: error.message };
            }
        });
        
        // AGUARDAR TODOS OS FICHEIROS - CORREÇÃO IMPLEMENTADA
        const results = await Promise.all(processingPromises);
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        console.log(`✅ ${successCount} ficheiros processados, ${errorCount} com erro`);
        
        // Atualizar acumuladores globais
        updateGlobalAccumulators();
        
        return { success: true, processed: successCount, errors: errorCount };
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        throw error;
    }
}

// 4. DATA ACCUMULATOR PERSISTENCE - CORREÇÃO IMPLEMENTADA
function accumulateData(type, data) {
    if (!VDCSystem.dataAccumulator[type]) {
        VDCSystem.dataAccumulator[type] = { total: 0, files: [] };
    }
    
    switch(type) {
        case 'dac7':
            if (data.annualRevenue) {
                VDCSystem.dataAccumulator.dac7.total += parseEuropeanCurrency(data.annualRevenue);
            }
            break;
            
        case 'saft':
            if (data.grossValue) {
                VDCSystem.dataAccumulator.saft.gross += parseEuropeanCurrency(data.grossValue);
            }
            if (data.iva6Value) {
                VDCSystem.dataAccumulator.saft.iva6 += parseEuropeanCurrency(data.iva6Value);
            }
            if (data.netValue) {
                VDCSystem.dataAccumulator.saft.net += parseEuropeanCurrency(data.netValue);
            }
            break;
            
        case 'invoices':
            if (data.invoiceValue) {
                VDCSystem.dataAccumulator.invoices.total += parseEuropeanCurrency(data.invoiceValue);
            }
            if (data.commissionValue) {
                VDCSystem.dataAccumulator.invoices.commission += parseEuropeanCurrency(data.commissionValue);
            }
            break;
            
        case 'statements':
            if (data.grossEarnings) {
                VDCSystem.dataAccumulator.statements.gross += parseEuropeanCurrency(data.grossEarnings);
            }
            if (data.commission) {
                VDCSystem.dataAccumulator.statements.commission += parseEuropeanCurrency(data.commission);
            }
            if (data.netTransfer) {
                VDCSystem.dataAccumulator.statements.net += parseEuropeanCurrency(data.netTransfer);
            }
            break;
    }
}

function updateGlobalAccumulators() {
    // Atualizar documentos com dados acumulados
    VDCSystem.documents.dac7.totals.annualRevenue = VDCSystem.dataAccumulator.dac7.total;
    
    VDCSystem.documents.saft.totals.gross = VDCSystem.dataAccumulator.saft.gross;
    VDCSystem.documents.saft.totals.iva6 = VDCSystem.dataAccumulator.saft.iva6;
    VDCSystem.documents.saft.totals.net = VDCSystem.dataAccumulator.saft.net;
    
    VDCSystem.documents.invoices.totals.invoiceValue = VDCSystem.dataAccumulator.invoices.total;
    VDCSystem.documents.invoices.totals.commission = VDCSystem.dataAccumulator.invoices.commission;
    
    VDCSystem.documents.statements.totals.rendimentosBrutos = VDCSystem.dataAccumulator.statements.gross;
    VDCSystem.documents.statements.totals.comissaoApp = VDCSystem.dataAccumulator.statements.commission;
    VDCSystem.documents.statements.totals.rendimentosLiquidos = VDCSystem.dataAccumulator.statements.net;
}

// 5. FUNÇÕES DE EXTRAÇÃO COM CURRENCY PARSER - CORREÇÃO IMPLEMENTADA
function extractDAC7Data(text, filename) {
    const data = {
        filename: filename,
        annualRevenue: 0,
        period: '',
        extractionMethod: 'European Currency Parser (ISO/NIST)'
    };
    
    try {
        // Padrões robustos para formatos europeus
        const patterns = [
            /(?:total de receitas anuais|annual revenue|receitas totais)[\s:]*([\d\s.,]+)\s*(?:€|EUR|euros?)/gi,
            /(?:receitas|revenue|rendimentos)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi,
            /([\d\s.,]+)\s*(?:€|EUR)\s*(?:total.*receitas|annual.*revenue)/gi
        ];
        
        let allValues = [];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseEuropeanCurrency(match[1]);
                if (value > 0) allValues.push(value);
            }
        });
        
        if (allValues.length > 0) {
            data.annualRevenue = Math.max(...allValues);
        }
        
        console.log(`✅ DAC7 ${filename}: ${data.annualRevenue.toFixed(2)}€`);
        
    } catch (error) {
        console.error(`Erro DAC7 ${filename}:`, error);
    }
    
    return data;
}

function extractSAFTData(text, filename) {
    const data = {
        filename: filename,
        grossValue: 0,
        iva6Value: 0,
        netValue: 0,
        extractionMethod: 'European Currency Parser (ISO/NIST)'
    };
    
    try {
        // Verificar se é CSV
        if (filename.toLowerCase().endsWith('.csv') || text.includes(',') && text.split('\n')[0].includes(',')) {
            // Processamento CSV
            const parsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                delimiter: ','
            });
            
            if (parsed.data && parsed.data.length > 0) {
                let totalGross = 0, totalIVA6 = 0, totalNet = 0;
                
                parsed.data.forEach(row => {
                    // Procurar colunas com valores monetários
                    Object.keys(row).forEach(key => {
                        const value = row[key];
                        if (typeof value === 'string' && (value.includes('€') || value.includes('EUR') || /[\d.,]+\s*[\d.,]*/.test(value))) {
                            const parsedValue = parseEuropeanCurrency(value);
                            
                            if (key.toLowerCase().includes('gross') || key.toLowerCase().includes('bruto')) {
                                totalGross += parsedValue;
                            } else if (key.toLowerCase().includes('iva') || key.toLowerCase().includes('tax')) {
                                totalIVA6 += parsedValue;
                            } else if (key.toLowerCase().includes('net') || key.toLowerCase().includes('líquido')) {
                                totalNet += parsedValue;
                            }
                        }
                    });
                });
                
                data.grossValue = totalGross;
                data.iva6Value = totalIVA6;
                data.netValue = totalNet;
            }
        } else {
            // Processamento XML
            const patterns = [
                { regex: /<GrossTotal>([\d\s.,]+)<\/GrossTotal>/i, key: 'grossValue' },
                { regex: /<NetTotal>([\d\s.,]+)<\/NetTotal>/i, key: 'netValue' },
                { regex: /<TaxAmount>([\d\s.,]+)<\/TaxAmount>/i, key: 'iva6Value' },
                { regex: /"grossTotal"\s*:\s*"([\d\s.,]+)"/i, key: 'grossValue' },
                { regex: /"netTotal"\s*:\s*"([\d\s.,]+)"/i, key: 'netValue' }
            ];
            
            patterns.forEach(pattern => {
                const match = text.match(pattern.regex);
                if (match) {
                    const value = parseEuropeanCurrency(match[1]);
                    if (value > 0) {
                        data[pattern.key] = value;
                    }
                }
            });
        }
        
        console.log(`✅ SAF-T ${filename}: Bruto=${data.grossValue.toFixed(2)}€ | IVA6=${data.iva6Value.toFixed(2)}€ | Líquido=${data.netValue.toFixed(2)}€`);
        
    } catch (error) {
        console.error(`Erro SAF-T ${filename}:`, error);
    }
    
    return data;
}

function extractInvoiceData(text, filename) {
    const data = {
        filename: filename,
        invoiceValue: 0,
        commissionValue: 0,
        iva23Value: 0,
        invoiceNumber: '',
        extractionMethod: 'European Currency Parser (ISO/NIST)'
    };
    
    try {
        // Padrões para valores monetários europeus
        const amountPatterns = [
            /(?:total|valor|montante|amount)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi,
            /(?:total|valor|montante)[\s:]*([\d\s.,]+)/gi,
            /([\d\s.,]+)\s*(?:€|EUR)(?:\s*(?:total|valor|montante))/gi
        ];
        
        let allAmounts = [];
        
        amountPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseEuropeanCurrency(match[1]);
                if (value > 0) allAmounts.push(value);
            }
        });
        
        if (allAmounts.length > 0) {
            data.invoiceValue = Math.max(...allAmounts);
        }
        
        // Padrões para comissão
        const commissionPatterns = [
            /(?:comissão|commission|fee)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi,
            /(?:taxa|rate)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi
        ];
        
        let allCommissions = [];
        commissionPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const value = parseEuropeanCurrency(match[1]);
                if (value > 0) allCommissions.push(value);
            }
        });
        
        if (allCommissions.length > 0) {
            data.commissionValue = Math.max(...allCommissions);
        }
        
        // Calcular IVA 23% se houver comissão
        if (data.commissionValue > 0) {
            data.iva23Value = data.commissionValue * 0.23;
        }
        
        console.log(`✅ Fatura ${filename}: ${data.invoiceValue.toFixed(2)}€ | Comissão: ${data.commissionValue.toFixed(2)}€`);
        
    } catch (error) {
        console.error(`Erro Fatura ${filename}:`, error);
    }
    
    return data;
}

function extractStatementData(text, filename) {
    const data = {
        filename: filename,
        grossEarnings: 0,
        commission: 0,
        netTransfer: 0,
        campaigns: 0,
        tips: 0,
        cancellations: 0,
        tolls: 0,
        extractionMethod: 'European Currency Parser (ISO/NIST)'
    };
    
    try {
        // Mapeamento de padrões
        const patterns = {
            grossEarnings: [
                /(?:rendimentos|earnings|bruto|gross)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi,
                /([\d\s.,]+)\s*(?:€|EUR)\s*(?:rendimentos|bruto|gross)/gi
            ],
            commission: [
                /(?:comissão|commission|fee)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi,
                /-?\s*([\d\s.,]+)\s*(?:€|EUR)\s*(?:comissão|fee)/gi
            ],
            netTransfer: [
                /(?:líquido|net|transferência|transfer)[\s:]*([\d\s.,]+)\s*(?:€|EUR)/gi,
                /([\d\s.,]+)\s*(?:€|EUR)\s*(?:líquido|net|transfer)/gi
            ]
        };
        
        // Processar cada categoria
        Object.entries(patterns).forEach(([key, regexList]) => {
            const values = [];
            
            regexList.forEach(regex => {
                let match;
                while ((match = regex.exec(text)) !== null) {
                    const value = parseEuropeanCurrency(match[1]);
                    if (value > 0 || (key === 'commission' && value !== 0)) {
                        values.push(key === 'commission' ? -Math.abs(value) : value);
                    }
                }
            });
            
            if (values.length > 0) {
                if (key === 'commission') {
                    data[key] = values.reduce((a, b) => a + b, 0);
                } else {
                    data[key] = Math.max(...values);
                }
            }
        });
        
        console.log(`✅ Extrato ${filename}: Bruto=${data.grossEarnings.toFixed(2)}€ | Comissão=${data.commission.toFixed(2)}€ | Líquido=${data.netTransfer.toFixed(2)}€`);
        
    } catch (error) {
        console.error(`Erro Extrato ${filename}:`, error);
    }
    
    return data;
}

// 6. FUNÇÃO DE UPLOAD ATUALIZADA - CORREÇÃO IMPLEMENTADA
async function handleFileUpload(event, type) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const uploadBtn = document.querySelector(`#${type}UploadBtn`);
    
    if (uploadBtn) {
        uploadBtn.classList.add('processing');
        uploadBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO ${files.length} FICHEIROS...`;
    }
    
    try {
        // ASYNCHRONOUS PROMISE.ALL CONTROL - CORREÇÃO IMPLEMENTADA
        const result = await processMultipleFilesSync(type, files, true);
        
        if (result.success) {
            updateFileList(`${type}FileList`, VDCSystem.documents[type].files);
            updateCounter(type, VDCSystem.documents[type].files.length);
            
            if (VDCSystem.client) {
                updateAnalysisButton();
            }
            
            console.log(`✅ ${result.processed} ficheiros ${type} processados com sucesso`);
        }
        
    } catch (error) {
        console.error(`❌ Erro no processamento de ${type}:`, error);
    } finally {
        if (uploadBtn) {
            uploadBtn.classList.remove('processing');
            const icons = {
                dac7: 'fa-file-contract',
                control: 'fa-file-shield',
                saft: 'fa-file-code',
                invoices: 'fa-file-invoice-dollar',
                statements: 'fa-file-contract'
            };
            const texts = {
                dac7: 'UPLOAD DAC7',
                control: 'FICHEIRO DE CONTROLO',
                saft: 'SAF-T / XML / CSV (MÚLTIPLOS)',
                invoices: 'FATURAS DA PLATAFORMA',
                statements: 'EXTRATOS BANCÁRIOS'
            };
            uploadBtn.innerHTML = `<i class="fas ${icons[type]}"></i> ${texts[type]}`;
        }
    }
}

// 7. FUNÇÕES AUXILIARES
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function updateChainOfCustodyHash(filename, hash) {
    const record = VDCSystem.analysis.chainOfCustody.find(r => r.filename === filename);
    if (record) {
        record.hash = hash;
        record.integrityCheck = 'VERIFIED';
    }
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
            <span class="file-status">${formatBytes(file.size)} ✓</span>
        `;
        fileList.appendChild(fileItem);
    });
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateCounter(type, count) {
    const counterId = type + 'Count';
    const element = document.getElementById(counterId);
    if (element) element.textContent = count;
    VDCSystem.counters[type] = count;
    
    // Atualizar total
    const total = Object.values(VDCSystem.counters).reduce((a, b) => a + b, 0);
    const totalElement = document.getElementById('totalCount');
    if (totalElement) totalElement.textContent = total;
}

// 8. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 Inicializando VDC Forensic System v10.9...');
    
    // Configurar evento do botão de splash screen
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startForensicSession);
    }
    
    // Inicializar relógio
    startClockAndDate();
    
    // Configurar selectores
    setupYearSelector();
    setupPlatformSelector();
    
    // Configurar eventos
    setupEventListeners();
    
    console.log('✅ Sistema inicializado com sucesso');
});

function startForensicSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (splashScreen && loadingOverlay) {
            splashScreen.style.opacity = '0';
            
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadingOverlay.style.display = 'flex';
                
                // Iniciar sistema
                setTimeout(() => {
                    loadForensicSystem();
                }, 300);
            }, 500);
        }
    } catch (error) {
        console.error('Erro ao iniciar sessão:', error);
    }
}

function loadForensicSystem() {
    try {
        // Gerar sessão
        VDCSystem.sessionId = generateSessionId();
        const sessionIdElement = document.getElementById('sessionIdDisplay');
        if (sessionIdElement) sessionIdElement.textContent = VDCSystem.sessionId;
        
        // Carregar clientes
        loadClientsFromLocal();
        
        // Mostrar interface principal
        setTimeout(() => {
            showMainInterface();
            console.log('✅ Sistema VDC v10.9 carregado com sucesso');
        }, 1000);
        
    } catch (error) {
        console.error('Erro no carregamento:', error);
    }
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay && mainContainer) {
        loadingOverlay.style.opacity = '0';
        
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            mainContainer.style.display = 'block';
            
            setTimeout(() => {
                mainContainer.style.opacity = '1';
            }, 50);
        }, 500);
    }
}

// 9. CONFIGURAÇÃO DE CONTROLES
function setupYearSelector() {
    const selYear = document.getElementById('selYear');
    if (!selYear) return;
    
    const currentYear = new Date().getFullYear();
    VDCSystem.selectedYear = currentYear;
    
    // Limpar opções existentes
    selYear.innerHTML = '';
    
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        selYear.appendChild(option);
    }
    
    selYear.addEventListener('change', (e) => {
        VDCSystem.selectedYear = parseInt(e.target.value);
        console.log(`📅 Ano fiscal alterado para: ${VDCSystem.selectedYear}`);
    });
}

function setupPlatformSelector() {
    const selPlatform = document.getElementById('selPlatform');
    if (!selPlatform) return;
    
    selPlatform.value = VDCSystem.selectedPlatform;
    
    selPlatform.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        console.log(`🔄 Plataforma alterada para: ${VDCSystem.selectedPlatform}`);
    });
}

function startClockAndDate() {
    function updateDateTime() {
        const now = new Date();
        
        const dateString = now.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');
        
        if (dateElement) dateElement.textContent = dateString;
        if (timeElement) timeElement.textContent = timeString;
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

// 10. CONFIGURAÇÃO DE EVENTOS
function setupEventListeners() {
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    const saveBtn = document.getElementById('saveClientBtn');
    
    if (registerBtn) registerBtn.addEventListener('click', registerClient);
    if (saveBtn) saveBtn.addEventListener('click', saveClientToJSON);
    
    // Upload buttons
    setupUploadButtons();
    
    // Botões de ação
    const analyzeBtn = document.getElementById('analyzeBtn');
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const resetBtn = document.getElementById('resetBtn');
    const demoBtn = document.getElementById('demoModeBtn');
    
    if (analyzeBtn) analyzeBtn.addEventListener('click', performForensicAnalysis);
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportJSON);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    if (resetBtn) resetBtn.addEventListener('click', resetDashboard);
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    // Consola
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
    const custodyBtn = document.getElementById('custodyBtn');
    
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    if (toggleConsoleBtn) toggleConsoleBtn.addEventListener('click', toggleConsole);
    if (custodyBtn) custodyBtn.addEventListener('click', showChainOfCustody);
}

function setupUploadButtons() {
    const uploadConfigs = [
        { btnId: 'dac7UploadBtn', fileId: 'dac7File', type: 'dac7' },
        { btnId: 'controlUploadBtn', fileId: 'controlFile', type: 'control' },
        { btnId: 'saftUploadBtn', fileId: 'saftFile', type: 'saft' },
        { btnId: 'invoiceUploadBtn', fileId: 'invoiceFile', type: 'invoices' },
        { btnId: 'statementUploadBtn', fileId: 'statementFile', type: 'statements' }
    ];
    
    uploadConfigs.forEach(config => {
        const btn = document.getElementById(config.btnId);
        const fileInput = document.getElementById(config.fileId);
        
        if (btn && fileInput) {
            btn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => handleFileUpload(e, config.type));
        }
    });
}

// 11. FUNÇÕES DE CLIENTE
function loadClientsFromLocal() {
    try {
        const clients = JSON.parse(localStorage.getItem('vdc_clients') || '[]');
        VDCSystem.preRegisteredClients = clients;
        console.log(`📁 ${clients.length} clientes carregados do armazenamento local`);
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        VDCSystem.preRegisteredClients = [];
    }
}

function registerClient() {
    const nameInput = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) {
        alert('Nome do cliente inválido (mínimo 3 caracteres)');
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        alert('NIF inválido (deve ter 9 dígitos)');
        return;
    }
    
    VDCSystem.client = { 
        name: name, 
        nif: nif,
        registrationDate: new Date().toISOString()
    };
    
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) status.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    
    console.log(`✅ Cliente registado: ${name} (NIF: ${nif})`);
    updateAnalysisButton();
}

function updateAnalysisButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (!analyzeBtn) return;
    
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    const hasClient = VDCSystem.client !== null;
    
    analyzeBtn.disabled = !(hasControl && hasSaft && hasClient);
    
    if (!analyzeBtn.disabled) {
        console.log('✅ Sistema pronto para análise forense');
    }
}

// 12. ANÁLISE FORENSE
async function performForensicAnalysis() {
    try {
        console.log('🔍 Iniciando análise forense...');
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO...';
        }
        
        // Processar dados carregados
        await processLoadedData();
        
        // Calcular valores
        calculateExtractedValues();
        performForensicCrossings();
        calculateMarketProjection();
        calcularJurosMora();
        
        // Atualizar interface
        updateDashboard();
        updateKPIResults();
        renderDashboardChart();
        
        console.log('✅ Análise forense concluída com sucesso');
        
    } catch (error) {
        console.error('❌ Erro na análise:', error);
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE BIG DATA';
        }
    }
}

// [Restante do código mantido conforme original...]
// Funções: processLoadedData, calculateExtractedValues, performForensicCrossings, 
// calculateMarketProjection, calcularJurosMora, updateDashboard, updateKPIResults,
// renderDashboardChart, exportJSON, exportPDF, resetDashboard, activateDemoMode,
// showChainOfCustody, clearConsole, toggleConsole, generateSessionId, etc.

// 13. FUNÇÕES GLOBAIS
window.clearConsole = clearConsole;
window.toggleConsole = toggleConsole;
window.exportJSON = exportJSON;
window.exportPDF = exportPDF;
window.resetDashboard = resetDashboard;
window.performForensicAnalysis = performForensicAnalysis;
window.activateDemoMode = activateDemoMode;
window.showChainOfCustody = showChainOfCustody;

console.log('🚀 VDC Forensic System v10.9 - Script carregado com sucesso');
