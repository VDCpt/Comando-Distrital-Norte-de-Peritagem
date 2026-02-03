// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v5.2
// SCRIPT PRINCIPAL - ATUALIZADO PARA SUPORTE HÍBRIDO
// ============================================

// 1. ESTADO DO SISTEMA
const VDCSystem = {
    // Configuração
    version: 'v5.2',
    sessionId: null,
    client: null,
    
    // Referência de hashes
    referenceHashes: {
        saft: null,
        fatura: null,
        extrato: null
    },
    
    // Documentos carregados
    documents: {
        saft: { file: null, hash: null, valid: false, metadata: null, parsedData: null, format: null },
        fatura: { file: null, hash: null, valid: false, metadata: null, parsedData: null, format: null },
        extrato: { file: null, hash: null, valid: false, metadata: null, parsedData: null, format: null }
    },
    
    // Validação
    validation: {
        controlLoaded: false,
        clientRegistered: false,
        readyForAnalysis: false
    },
    
    // Auditoria
    logs: [],
    
    // IndexedDB
    db: null
};

// 2. INICIALIZAÇÃO DO SISTEMA
async function initializeSystem() {
    try {
        console.log('🔧 Inicializando sistema VDC v5.2 (SUPORTE HÍBRIDO)...');
        
        // Atualizar progresso de carregamento
        updateLoadingProgress(10);
        
        // Gerar ID de sessão
        VDCSystem.sessionId = generateSessionId();
        updateLoadingProgress(20);
        
        // Inicializar UI
        initializeUI();
        updateLoadingProgress(30);
        
        // Configurar event listeners
        setupEventListeners();
        updateLoadingProgress(50);
        
        // Inicializar IndexedDB
        await initializeDatabase();
        updateLoadingProgress(70);
        
        // Atualizar timestamp
        startClock();
        updateLoadingProgress(90);
        
        // Finalizar carregamento
        setTimeout(() => {
            updateLoadingProgress(100);
            showMainInterface();
            logMessage('Sistema com suporte híbrido inicializado com sucesso', 'success');
        }, 500);
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Falha na inicialização do sistema: ' + error.message);
    }
}

function updateLoadingProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function showMainInterface() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const mainContainer = document.getElementById('mainContainer');
    
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 500);
    }
    
    if (mainContainer) {
        mainContainer.style.display = 'block';
        setTimeout(() => {
            mainContainer.classList.add('fade-in');
        }, 100);
    }
}

// 3. INTERFACE DO USUÁRIO
function initializeUI() {
    // Atualizar ID da sessão
    const sessionIdDisplay = document.getElementById('sessionIdDisplay');
    if (sessionIdDisplay && VDCSystem.sessionId) {
        sessionIdDisplay.textContent = VDCSystem.sessionId;
    }
    
    // Atualizar master hash
    const masterHashValue = document.getElementById('masterHashValue');
    if (masterHashValue) {
        masterHashValue.textContent = 'AGUARDANDO GERAÇÃO...';
    }
    
    // Configurar uploads de ficheiro
    setupFileUploads();
}

function startClock() {
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-PT', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

// 4. EVENT LISTENERS
function setupEventListeners() {
    console.log('🔗 Configurando event listeners...');
    
    // Registro de cliente
    const registerBtn = document.getElementById('registerClientBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClient);
    }
    
    // Inputs de cliente (Enter key)
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
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performAnalysis);
    }
    
    // Botão de nova sessão
    const clearBtn = document.getElementById('clearSessionBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSession);
    }
    
    // Botão de limpar console
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
    }
    
    // Botão de exportar logs
    const exportLogsBtn = document.getElementById('exportLogsBtn');
    if (exportLogsBtn) {
        exportLogsBtn.addEventListener('click', exportLogs);
    }
    
    console.log('✅ Event listeners configurados');
}

function setupFileUploads() {
    // Control file
    const controlUploadArea = document.getElementById('controlUploadArea');
    const controlFileInput = document.getElementById('controlFile');
    
    if (controlUploadArea && controlFileInput) {
        controlUploadArea.addEventListener('click', () => controlFileInput.click());
        controlUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            controlUploadArea.style.borderColor = '#3b82f6';
        });
        controlUploadArea.addEventListener('dragleave', () => {
            controlUploadArea.style.borderColor = '';
        });
        controlUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            controlUploadArea.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                controlFileInput.files = e.dataTransfer.files;
                processControlFile(e.dataTransfer.files[0]);
            }
        });
        
        controlFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processControlFile(e.target.files[0]);
            }
        });
    }
    
    // Document files
    setupDocumentUpload('saft');
    setupDocumentUpload('fatura');
    setupDocumentUpload('extrato');
}

function setupDocumentUpload(type) {
    const uploadArea = document.getElementById(`${type}UploadArea`);
    const fileInput = document.getElementById(`${type}File`);
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => {
            if (!fileInput.disabled) {
                fileInput.click();
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processDocumentUpload(type, e.target.files[0]);
            }
        });
    }
}

// 5. PROCESSAMENTO DE FICHEIROS (ATUALIZADO PARA SUPORTE HÍBRIDO)
async function processControlFile(file) {
    try {
        logMessage(`Processando ficheiro de controlo: ${file.name}`, 'info');
        
        // Atualizar status
        updateControlStatus('processing', 'Processando CSV...');
        
        // Ler e parsear CSV
        const text = await readFileAsText(file);
        const results = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8'
        });
        
        // RESET das referências
        VDCSystem.referenceHashes = { saft: null, fatura: null, extrato: null };
        let foundHashes = 0;
        
        // Processar hashes com FILTRAGEM CRÍTICA ATUALIZADA
        results.data.forEach((row, index) => {
            const path = (row.Path || row.path || '').toLowerCase();
            const hash = (row.Hash || row.hash || '').toLowerCase().trim();
            const algorithm = row.Algorithm || row.algorithm || '';
            
            // REGRA DE EXCLUSÃO CRÍTICA 1: Ignorar CONTROLO_AUTENTICIDADE
            if (path.includes('controlo_autenticidade') || 
                path.includes('autenticidade') ||
                path.includes('controlo')) {
                logMessage(`[LINHA ${index + 1}] Ignorado: Ficheiro de controlo (autorreferência)`, 'warn');
                return;
            }
            
            // REGRA DE EXCLUSÃO CRÍTICA 2: Ignorar campos Hash vazios/nulos
            if (!hash || hash === '' || hash === 'null' || hash === 'undefined') {
                logMessage(`[LINHA ${index + 1}] Ignorado: Campo Hash vazio ou nulo`, 'warn');
                return;
            }
            
            // LÓGICA DE VALIDAÇÃO POR HASH (não por palavras-chave)
            // Verificar se esta hash corresponde a algum dos tipos de documento
            // A correspondência será feita pelo hash calculado posteriormente
            
            // Registar todas as hashes válidas encontradas
            // O cruzamento será feito apenas pelo hash
            if (hash && algorithm) {
                // Armazenar todas as hashes válidas para cruzamento posterior
                if (!VDCSystem.allReferenceHashes) {
                    VDCSystem.allReferenceHashes = [];
                }
                VDCSystem.allReferenceHashes.push({
                    hash: hash,
                    path: path,
                    algorithm: algorithm
                });
                foundHashes++;
                logMessage(`[LINHA ${index + 1}] Hash de referência registada: ${hash.substring(0, 16)}...`, 'info');
            }
        });
        
        if (foundHashes === 0) {
            throw new Error('Nenhuma hash válida encontrada no ficheiro de controlo');
        }
        
        // Atualizar estado
        VDCSystem.validation.controlLoaded = true;
        
        // Atualizar UI
        updateControlStatus('valid', `Controlo carregado: ${foundHashes} referências`);
        enableDocumentUploads();
        
        logMessage(`Ficheiro de controlo processado com sucesso: ${foundHashes} referências válidas`, 'success');
        
    } catch (error) {
        console.error('Erro no processamento do controlo:', error);
        updateControlStatus('error', 'Erro no processamento: ' + error.message);
        logMessage(`Erro no ficheiro de controlo: ${error.message}`, 'error');
    }
}

async function processDocumentUpload(type, file) {
    try {
        logMessage(`Processando ${type.toUpperCase()}: ${file.name}`, 'info');
        
        // Atualizar status
        updateDocumentStatus(type, 'processing', 'Calculando hash...');
        
        // Calcular hash do ficheiro carregado
        const hash = await calculateFileHash(file);
        
        // DETERMINAR FORMATO DO FICHEIRO
        const fileFormat = determineFileFormat(file);
        VDCSystem.documents[type].format = fileFormat;
        
        // PROCESSAR CONTEÚDO BASEADO NO FORMATO
        let parsedData = null;
        try {
            if (fileFormat === 'xml') {
                parsedData = await parseSAFTXML(file);
            } else if (fileFormat === 'csv') {
                parsedData = await parseCSVFile(file);
            } else if (fileFormat === 'pdf') {
                parsedData = await parsePDFFile(file);
            } else {
                // Para outros formatos, apenas extrair texto básico
                parsedData = { content: await readFileAsText(file), format: fileFormat };
            }
            
            VDCSystem.documents[type].parsedData = parsedData;
            
            // Log do formato detectado
            logMessage(`Formato detectado: ${fileFormat.toUpperCase()} para ${type.toUpperCase()}`, 'info');
            
        } catch (parseError) {
            logMessage(`AVISO: Erro no parse do conteúdo (hash ainda válida): ${parseError.message}`, 'warn');
            // Continuar mesmo com erro de parse - hash ainda pode ser válida
        }
        
        // VALIDAÇÃO POR HASH (CRUZAMENTO COM FICHEIRO DE CONTROL)
        let isValid = false;
        let referenceMatch = null;
        
        // Procurar hash no ficheiro de controlo
        if (VDCSystem.allReferenceHashes) {
            referenceMatch = VDCSystem.allReferenceHashes.find(ref => ref.hash === hash);
            
            if (referenceMatch) {
                isValid = true;
                // Atribuir automaticamente ao tipo correspondente baseado no match
                VDCSystem.referenceHashes[type] = hash;
                logMessage(`Hash validada contra referência: ${referenceMatch.path}`, 'success');
            } else {
                // Verificar também pelas referências específicas (backward compatibility)
                if (VDCSystem.referenceHashes[type] && VDCSystem.referenceHashes[type] === hash) {
                    isValid = true;
                    logMessage(`Hash validada contra referência específica para ${type.toUpperCase()}`, 'success');
                }
            }
        } else if (VDCSystem.referenceHashes[type] && VDCSystem.referenceHashes[type] === hash) {
            // Fallback para compatibilidade
            isValid = true;
            logMessage(`Hash validada contra referência específica para ${type.toUpperCase()}`, 'success');
        }
        
        // Atualizar estado
        VDCSystem.documents[type] = {
            file: file,
            hash: hash,
            valid: isValid,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            },
            parsedData: parsedData,
            format: fileFormat
        };
        
        // Atualizar UI
        if (isValid) {
            updateDocumentStatus(type, 'valid', `Hash validada ✓ (${fileFormat.toUpperCase()})`);
            updateHashDisplay(type, hash, true);
            
            // Exibir dados extraídos se disponíveis
            if (parsedData) {
                displayExtractedData(type, parsedData);
            }
        } else {
            updateDocumentStatus(type, 'error', 'Hash não encontrada no controlo ✗');
            updateHashDisplay(type, hash, false);
        }
        
        // Verificar se pode analisar
        checkAnalysisReady();
        
        // Gerar master hash se válido
        if (isValid) {
            await generateMasterHash();
        }
        
        logMessage(`${type.toUpperCase()} ${isValid ? 'VALIDADO ✓' : 'INVALIDO ✗'}: ${hash.substring(0, 16)}... (${fileFormat.toUpperCase()})`, isValid ? 'success' : 'error');
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        updateDocumentStatus(type, 'error', 'Erro no processamento');
        logMessage(`Erro no ${type}: ${error.message}`, 'error');
    }
}

// 6. FUNÇÕES AUXILIARES PARA SUPORTE HÍBRIDO
function determineFileFormat(file) {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    if (fileName.endsWith('.xml') || mimeType.includes('xml')) {
        return 'xml';
    } else if (fileName.endsWith('.csv') || mimeType.includes('csv')) {
        return 'csv';
    } else if (fileName.endsWith('.pdf') || mimeType.includes('pdf')) {
        return 'pdf';
    } else if (fileName.endsWith('.txt') || mimeType.includes('text')) {
        return 'txt';
    } else if (fileName.match(/\.(jpg|jpeg|png|gif)$/) || mimeType.includes('image')) {
        return 'image';
    } else {
        return 'unknown';
    }
}

async function parseSAFTXML(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
                
                // Verificar se é um XML válido
                const parserError = xmlDoc.getElementsByTagName("parsererror");
                if (parserError.length > 0) {
                    reject(new Error('XML malformado'));
                    return;
                }
                
                // Extrair dados básicos do SAF-T
                const extractedData = {
                    format: 'saft-xml',
                    fileName: file.name,
                    fileSize: file.size,
                    extractionDate: new Date().toISOString()
                };
                
                // Tentar extrair dados comuns do SAF-T
                try {
                    // Informação da empresa
                    const companyInfo = xmlDoc.getElementsByTagName("CompanyName")[0];
                    if (companyInfo) extractedData.companyName = companyInfo.textContent;
                    
                    const companyNIF = xmlDoc.getElementsByTagName("CompanyTaxID")[0];
                    if (companyNIF) extractedData.companyNIF = companyNIF.textContent;
                    
                    // Período fiscal
                    const periodStart = xmlDoc.getElementsByTagName("StartDate")[0];
                    const periodEnd = xmlDoc.getElementsByTagName("EndDate")[0];
                    if (periodStart) extractedData.periodStart = periodStart.textContent;
                    if (periodEnd) extractedData.periodEnd = periodEnd.textContent;
                    
                    // Número de transações
                    const transactions = xmlDoc.getElementsByTagName("Transaction");
                    extractedData.transactionCount = transactions ? transactions.length : 0;
                    
                    // Total de documentos
                    const documents = xmlDoc.getElementsByTagName("Invoice") || 
                                     xmlDoc.getElementsByTagName("Document");
                    extractedData.documentCount = documents ? documents.length : 0;
                    
                    logMessage(`SAF-T XML parseado: ${extractedData.documentCount || 0} documentos encontrados`, 'info');
                    
                } catch (parseError) {
                    // Se houver erro no parse específico, ainda retornar estrutura básica
                    logMessage(`AVISO: Parse SAF-T parcial - ${parseError.message}`, 'warn');
                }
                
                resolve(extractedData);
                
            } catch (error) {
                reject(new Error('Erro no parse do XML: ' + error.message));
            }
        };
        
        reader.onerror = () => reject(new Error('Erro na leitura do ficheiro XML'));
        reader.readAsText(file, 'UTF-8');
    });
}

async function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: function(results) {
                try {
                    const extractedData = {
                        format: 'csv',
                        fileName: file.name,
                        fileSize: file.size,
                        extractionDate: new Date().toISOString(),
                        rowCount: results.data.length,
                        columns: results.meta.fields || []
                    };
                    
                    // Extrair dados das colunas mapeadas
                    const mappedData = [];
                    
                    results.data.forEach((row, index) => {
                        const dataRow = {
                            linha: index + 1
                        };
                        
                        // Mapeamento flexível de colunas
                        const columnMapping = {
                            'Número da fatura': ['Número', 'Numero', 'Fatura', 'Invoice', 'DocNumber'],
                            'Data': ['Data', 'Date', 'DataFatura', 'InvoiceDate'],
                            'NIPC da empresa': ['NIPC', 'NIF', 'TaxID', 'CompanyID', 'Empresa'],
                            'IVA': ['IVA', 'VAT', 'Tax', 'Imposto'],
                            'Preço da viagem': ['Preço', 'Price', 'Valor', 'Amount', 'Total', 'Viagem']
                        };
                        
                        // Procurar valores nas colunas disponíveis
                        Object.keys(columnMapping).forEach(key => {
                            columnMapping[key].forEach(colName => {
                                if (row[colName] !== undefined && row[colName] !== '') {
                                    dataRow[key] = row[colName];
                                }
                            });
                        });
                        
                        if (Object.keys(dataRow).length > 1) { // Mais que apenas o número da linha
                            mappedData.push(dataRow);
                        }
                    });
                    
                    extractedData.mappedData = mappedData;
                    
                    // Estatísticas
                    if (mappedData.length > 0) {
                        extractedData.summary = {
                            totalRows: mappedData.length,
                            hasInvoiceNumbers: mappedData.some(r => r['Número da fatura']),
                            hasDates: mappedData.some(r => r['Data']),
                            hasNIPC: mappedData.some(r => r['NIPC da empresa']),
                            hasIVA: mappedData.some(r => r['IVA']),
                            hasPrice: mappedData.some(r => r['Preço da viagem'])
                        };
                    }
                    
                    logMessage(`CSV parseado: ${extractedData.rowCount} linhas, ${mappedData.length} mapeadas`, 'info');
                    resolve(extractedData);
                    
                } catch (error) {
                    reject(new Error('Erro no processamento do CSV: ' + error.message));
                }
            },
            error: function(error) {
                reject(new Error('Erro no parse do CSV: ' + error.message));
            }
        });
    });
}

async function parsePDFFile(file) {
    return new Promise((resolve, reject) => {
        // Para PDF, retornamos apenas metadados básicos
        // Em produção, integraria uma biblioteca como pdf.js
        resolve({
            format: 'pdf',
            fileName: file.name,
            fileSize: file.size,
            extractionDate: new Date().toISOString(),
            note: 'Conteúdo PDF requer parser especializado'
        });
    });
}

function displayExtractedData(type, parsedData) {
    // Esta função exibe os dados extraídos no console de auditoria
    if (!parsedData) return;
    
    const format = parsedData.format || 'unknown';
    
    logMessage(`=== DADOS EXTRAÍDOS (${type.toUpperCase()} - ${format.toUpperCase()}) ===`, 'info');
    logMessage(`Ficheiro: ${parsedData.fileName || 'N/A'}`, 'info');
    logMessage(`Tamanho: ${formatFileSize(parsedData.fileSize || 0)}`, 'info');
    logMessage(`Formato: ${format.toUpperCase()}`, 'info');
    
    if (format === 'saft-xml') {
        if (parsedData.companyName) {
            logMessage(`Empresa: ${parsedData.companyName}`, 'info');
        }
        if (parsedData.companyNIF) {
            logMessage(`NIF: ${parsedData.companyNIF}`, 'info');
        }
        if (parsedData.periodStart || parsedData.periodEnd) {
            logMessage(`Período: ${parsedData.periodStart || 'N/A'} a ${parsedData.periodEnd || 'N/A'}`, 'info');
        }
        if (parsedData.transactionCount) {
            logMessage(`Transações: ${parsedData.transactionCount}`, 'info');
        }
        if (parsedData.documentCount) {
            logMessage(`Documentos: ${parsedData.documentCount}`, 'info');
        }
    } else if (format === 'csv' && parsedData.mappedData) {
        logMessage(`Linhas processadas: ${parsedData.mappedData.length}`, 'info');
        
        if (parsedData.summary) {
            const summary = parsedData.summary;
            const fields = [];
            if (summary.hasInvoiceNumbers) fields.push('Faturas');
            if (summary.hasDates) fields.push('Datas');
            if (summary.hasNIPC) fields.push('NIPC');
            if (summary.hasIVA) fields.push('IVA');
            if (summary.hasPrice) fields.push('Preços');
            
            if (fields.length > 0) {
                logMessage(`Campos encontrados: ${fields.join(', ')}`, 'info');
            }
        }
        
        // Mostrar primeiras 3 linhas como exemplo
        const sampleRows = parsedData.mappedData.slice(0, 3);
        sampleRows.forEach((row, index) => {
            const rowInfo = [`Linha ${row.linha}:`];
            if (row['Número da fatura']) rowInfo.push(`Fatura: ${row['Número da fatura']}`);
            if (row['Data']) rowInfo.push(`Data: ${row['Data']}`);
            if (row['NIPC da empresa']) rowInfo.push(`NIPC: ${row['NIPC da empresa']}`);
            if (row['IVA']) rowInfo.push(`IVA: ${row['IVA']}`);
            if (row['Preço da viagem']) rowInfo.push(`Valor: ${row['Preço da viagem']}`);
            
            if (rowInfo.length > 1) {
                logMessage(rowInfo.join(' '), 'info');
            }
        });
        
        if (parsedData.mappedData.length > 3) {
            logMessage(`... mais ${parsedData.mappedData.length - 3} linhas`, 'info');
        }
    }
    
    logMessage(`=== FIM DOS DADOS EXTRAÍDOS ===`, 'info');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 7. FUNÇÕES DE HASH (MANTIDAS)
async function calculateFileHash(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Usar CryptoJS para calcular SHA-256
                const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
                const hash = CryptoJS.SHA256(wordArray).toString();
                resolve(hash.toLowerCase());
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Erro na leitura do ficheiro'));
        reader.readAsArrayBuffer(file);
    });
}

// 8. FUNÇÕES DE UI (MANTIDAS)
function updateControlStatus(state, message) {
    const statusElement = document.getElementById('controlStatus');
    if (!statusElement) return;
    
    const icon = statusElement.querySelector('.status-icon i');
    const text = statusElement.querySelector('.status-text');
    
    statusElement.className = `status-display status-${state}`;
    
    if (icon) {
        const icons = {
            pending: 'fa-clock',
            processing: 'fa-spinner fa-spin',
            valid: 'fa-check-circle',
            error: 'fa-times-circle'
        };
        icon.className = `fas ${icons[state] || 'fa-clock'}`;
    }
    
    if (text) {
        text.textContent = message;
    }
}

function updateDocumentStatus(type, state, message) {
    const statusElement = document.getElementById(`${type}Status`);
    if (!statusElement) return;
    
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('span');
    
    if (indicator) {
        indicator.className = `status-indicator status-${state}`;
    }
    
    if (text) {
        text.textContent = message;
    }
    
    // Atualizar card
    const card = document.querySelector(`.document-card[data-type="${type}"]`);
    if (card) {
        card.classList.remove('file-valid', 'file-invalid', 'file-processing');
        card.classList.add(`file-${state}`);
    }
}

function updateHashDisplay(type, hash, isValid) {
    const display = document.getElementById(`${type}HashDisplay`);
    const value = document.getElementById(`${type}HashValue`);
    
    if (display) display.style.display = 'block';
    if (value) {
        value.textContent = hash;
        value.style.color = isValid ? '#10b981' : '#ef4444';
    }
}

function enableDocumentUploads() {
    // Habilitar inputs
    ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.disabled = false;
    });
    
    // Habilitar grid
    const grid = document.getElementById('documentsGrid');
    if (grid) {
        grid.style.opacity = '1';
        grid.style.pointerEvents = 'auto';
    }
    
    logMessage('Uploads de documentos habilitados', 'info');
}

function checkAnalysisReady() {
    const hasControl = VDCSystem.validation.controlLoaded;
    const hasClient = VDCSystem.validation.clientRegistered;
    
    // Verificar se todos os documentos estão carregados
    const documents = VDCSystem.documents;
    const allLoaded = documents.saft.file && documents.fatura.file && documents.extrato.file;
    
    // Verificar se pelo menos um é válido
    const anyValid = documents.saft.valid || documents.fatura.valid || documents.extrato.valid;
    
    VDCSystem.validation.readyForAnalysis = hasControl && hasClient && allLoaded && anyValid;
    
    // Atualizar botão
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = !VDCSystem.validation.readyForAnalysis;
        
        if (VDCSystem.validation.readyForAnalysis) {
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE FORENSE (PRONTO)';
            analyzeBtn.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
        }
    }
}

// 9. REGISTRO DE CLIENTE (MANTIDO)
function registerClient() {
    const nameInput = document.getElementById('clientName');
    const nifInput = document.getElementById('clientNIF');
    
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    // Validações
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
    
    // Registrar cliente
    VDCSystem.client = { name, nif };
    VDCSystem.validation.clientRegistered = true;
    
    // Atualizar UI
    const status = document.getElementById('clientStatus');
    const nameDisplay = document.getElementById('clientNameDisplay');
    
    if (status) {
        status.style.display = 'flex';
    }
    
    if (nameDisplay) {
        nameDisplay.textContent = name;
    }
    
    // Limpar inputs
    if (nameInput) nameInput.value = '';
    if (nifInput) nifInput.value = '';
    
    // Verificar se pode analisar
    checkAnalysisReady();
    
    logMessage(`Cliente registado: ${name} (NIF: ${nif})`, 'success');
}

// 10. ANÁLISE FORENSE (MANTIDA)
async function performAnalysis() {
    if (!VDCSystem.validation.readyForAnalysis) {
        showError('Sistema não está pronto para análise');
        return;
    }
    
    try {
        logMessage('Iniciando análise forense híbrida...', 'info');
        
        // Mostrar progresso
        showProgress();
        
        // Simular análise
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            updateProgress(progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Gerar resultados
                generateAnalysisResults();
                
                // Esconder progresso
                setTimeout(() => {
                    hideProgress();
                    logMessage('Análise forense híbrida concluída com sucesso', 'success');
                }, 500);
            }
        }, 300);
        
    } catch (error) {
        console.error('Erro na análise:', error);
        hideProgress();
        showError('Erro na análise: ' + error.message);
        logMessage(`Erro na análise: ${error.message}`, 'error');
    }
}

function showProgress() {
    const container = document.getElementById('progressContainer');
    if (container) container.style.display = 'block';
    updateProgress(0);
}

function updateProgress(percent) {
    const bar = document.getElementById('progressBar');
    const text = document.getElementById('progressText');
    
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = percent + '%';
}

function hideProgress() {
    const container = document.getElementById('progressContainer');
    if (container) container.style.display = 'none';
    updateProgress(0);
}

function generateAnalysisResults() {
    // Gerar master hash
    generateMasterHash();
    
    // Exibir resumo da análise híbrida
    displayHybridAnalysisSummary();
    
    logMessage('Resultados da análise híbrida gerados', 'success');
}

function displayHybridAnalysisSummary() {
    logMessage('=== RESUMO DA ANÁLISE HÍBRIDA ===', 'info');
    
    Object.entries(VDCSystem.documents).forEach(([type, doc]) => {
        if (doc.valid && doc.parsedData) {
            logMessage(`${type.toUpperCase()} (${doc.format || 'N/A'}): ${doc.parsedData.fileName || 'N/A'}`, 'info');
            logMessage(`  Hash: ${doc.hash.substring(0, 16)}...`, 'info');
            
            if (doc.parsedData.format === 'saft-xml') {
                if (doc.parsedData.documentCount) {
                    logMessage(`  Documentos no SAF-T: ${doc.parsedData.documentCount}`, 'info');
                }
            } else if (doc.parsedData.format === 'csv') {
                if (doc.parsedData.mappedData) {
                    logMessage(`  Linhas mapeadas: ${doc.parsedData.mappedData.length}`, 'info');
                }
            }
        }
    });
    
    logMessage('=== FIM DO RESUMO ===', 'info');
}

// 11. MASTER HASH (MANTIDA)
async function generateMasterHash() {
    try {
        // Coletar hashes válidas
        const validHashes = [];
        
        Object.entries(VDCSystem.documents).forEach(([type, doc]) => {
            if (doc.valid && doc.hash) {
                validHashes.push(doc.hash);
            }
        });
        
        if (validHashes.length === 0) {
            logMessage('Nenhum documento válido para gerar Master Hash', 'warn');
            return;
        }
        
        // Adicionar metadados
        const data = [
            ...validHashes,
            VDCSystem.sessionId,
            new Date().toISOString(),
            VDCSystem.version
        ].join('|');
        
        // Calcular hash
        const masterHash = CryptoJS.SHA256(data).toString().toLowerCase();
        
        // Atualizar UI
        const display = document.getElementById('masterHashValue');
        if (display) {
            display.textContent = masterHash;
            display.style.color = '#10b981';
        }
        
        logMessage(`Master Hash gerada: ${masterHash.substring(0, 32)}...`, 'success');
        
        // Salvar no IndexedDB
        await saveToDatabase('master_hash', {
            hash: masterHash,
            timestamp: new Date().toISOString(),
            documents: validHashes.length,
            sessionId: VDCSystem.sessionId,
            analysisType: 'hibrida'
        });
        
    } catch (error) {
        console.error('Erro ao gerar Master Hash:', error);
        logMessage(`Erro ao gerar Master Hash: ${error.message}`, 'error');
    }
}

// 12. INDEXEDDB (MANTIDO)
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VDC_Forensic_DB', 2); // Versão atualizada
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            VDCSystem.db = event.target.result;
            console.log('✅ IndexedDB inicializado (v2)');
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            
            // Criar ou atualizar object stores
            if (!db.objectStoreNames.contains('sessions')) {
                db.createObjectStore('sessions', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('documents')) {
                const docStore = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
                docStore.createIndex('sessionId', 'sessionId', { unique: false });
                docStore.createIndex('documentType', 'documentType', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('analysis')) {
                db.createObjectStore('analysis', { keyPath: 'sessionId' });
            }
            
            // Adicionar store para dados extraídos (nova na versão 2)
            if (!db.objectStoreNames.contains('extracted_data')) {
                const dataStore = db.createObjectStore('extracted_data', { keyPath: 'id', autoIncrement: true });
                dataStore.createIndex('sessionId', 'sessionId', { unique: false });
                dataStore.createIndex('documentHash', 'documentHash', { unique: false });
            }
        };
    });
}

async function saveToDatabase(storeName, data) {
    if (!VDCSystem.db) return;
    
    return new Promise((resolve, reject) => {
        const transaction = VDCSystem.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.add(data);
        
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// 13. FUNÇÕES UTILITÁRIAS (MANTIDAS)
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function logMessage(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const logEntry = {
        timestamp,
        level,
        message
    };
    
    VDCSystem.logs.push(logEntry);
    
    // Atualizar console
    updateAuditConsole(logEntry);
    
    // Log no console do navegador
    console.log(`[VDC ${level.toUpperCase()}] ${message}`);
}

function updateAuditConsole(logEntry) {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    entry.innerHTML = `
        <span class="log-time">[${logEntry.timestamp}]</span>
        <span class="log-level ${logEntry.level}">${logEntry.level.toUpperCase()}</span>
        <span class="log-message">${logEntry.message}</span>
    `;
    
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
    logMessage('Console limpo', 'info');
}

function exportLogs() {
    const logs = VDCSystem.logs;
    if (logs.length === 0) {
        showError('Não há logs para exportar');
        return;
    }
    
    const content = logs.map(log => 
        `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vdc-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logMessage('Logs exportados com sucesso', 'success');
}

function clearSession() {
    if (confirm('Tem certeza que deseja iniciar uma nova sessão? Todos os dados não salvos serão perdidos.')) {
        // Resetar estado
        VDCSystem.sessionId = generateSessionId();
        VDCSystem.client = null;
        VDCSystem.referenceHashes = { saft: null, fatura: null, extrato: null };
        VDCSystem.allReferenceHashes = null;
        VDCSystem.documents = {
            saft: { file: null, hash: null, valid: false, metadata: null, parsedData: null, format: null },
            fatura: { file: null, hash: null, valid: false, metadata: null, parsedData: null, format: null },
            extrato: { file: null, hash: null, valid: false, metadata: null, parsedData: null, format: null }
        };
        VDCSystem.validation = {
            controlLoaded: false,
            clientRegistered: false,
            readyForAnalysis: false
        };
        
        // Resetar UI
        document.getElementById('sessionIdDisplay').textContent = VDCSystem.sessionId;
        document.getElementById('clientStatus').style.display = 'none';
        document.getElementById('controlStatus').innerHTML = `
            <div class="status-icon">
                <i class="fas fa-clock"></i>
            </div>
            <div class="status-text">
                Aguardando ficheiro de controlo
            </div>
        `;
        
        // Resetar documentos
        ['saft', 'fatura', 'extrato'].forEach(type => {
            updateDocumentStatus(type, 'pending', 'Aguardando validação');
            const display = document.getElementById(`${type}HashDisplay`);
            if (display) display.style.display = 'none';
        });
        
        // Desabilitar uploads
        const grid = document.getElementById('documentsGrid');
        if (grid) {
            grid.style.opacity = '0.5';
            grid.style.pointerEvents = 'none';
        }
        
        ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.disabled = true;
        });
        
        // Resetar master hash
        document.getElementById('masterHashValue').textContent = 'AGUARDANDO GERAÇÃO...';
        
        // Resetar botão de análise
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE FORENSE';
            analyzeBtn.style.background = 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)';
        }
        
        logMessage('Nova sessão iniciada', 'info');
    }
}

function showError(message) {
    console.error('Erro:', message);
    logMessage(message, 'error');
    
    // Mostrar alerta temporário
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// 14. INICIALIZAÇÃO
// Aguardar que o DOM esteja completamente carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSystem, 100);
    });
} else {
    setTimeout(initializeSystem, 100);
}
