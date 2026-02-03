// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v5.2
// SCRIPT PRINCIPAL - CORREÇÃO DE UPLOADS
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
    
    // Todos os hashes do control file (nova propriedade)
    allReferenceHashes: null,
    
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
        console.log('🔧 Inicializando sistema VDC v5.2...');
        
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
        
        // Inicializar IndexedDB (VERSÃO ALTERADA: 1 → 3)
        await initializeDatabase();
        updateLoadingProgress(70);
        
        // Atualizar timestamp
        startClock();
        updateLoadingProgress(90);
        
        // Finalizar carregamento
        setTimeout(() => {
            updateLoadingProgress(100);
            showMainInterface();
            logMessage('Sistema inicializado com sucesso', 'success');
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

// 4. EVENT LISTENERS (CORRIGIDO)
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
    
    // Document files (CORRIGIDO - IDs corretos)
    setupDocumentUpload('saft', 'saftFile');
    setupDocumentUpload('fatura', 'invoiceFile'); // ID correto para Fatura
    setupDocumentUpload('extrato', 'statementFile'); // ID correto para Extrato
}

function setupDocumentUpload(type, inputId) {
    const uploadArea = document.getElementById(`${type}UploadArea`);
    const fileInput = document.getElementById(inputId); // Usar ID correto passado como parâmetro
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => {
            if (!fileInput.disabled) {
                fileInput.click();
            }
        });
        
        // Configurar drag and drop para cada área
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#3b82f6';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                processDocumentUpload(type, e.dataTransfer.files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processDocumentUpload(type, e.target.files[0]);
            }
        });
    } else {
        console.warn(`Elemento não encontrado: ${type}UploadArea ou ${inputId}`);
    }
}

// 5. PROCESSAMENTO DE FICHEIROS (CORRIGIDO - Match Direto por Hash)
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
        VDCSystem.allReferenceHashes = {}; // INICIALIZAR CORRETAMENTE
        let foundHashes = 0;
        
        // Processar hashes com MATCH DIRETO POR HASH
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
            
            // LÓGICA FLEXÍVEL DE ATRIBUIÇÃO POR HASH
            if (hash && algorithm) {
                // Armazenar hash para match posterior
                if (!VDCSystem.allReferenceHashes) {
                    VDCSystem.allReferenceHashes = {};
                }
                
                // Registrar hash com informações do caminho
                VDCSystem.allReferenceHashes[hash] = {
                    hash: hash,
                    path: path,
                    algorithm: algorithm,
                    rowIndex: index + 1
                };
                
                // Tentativa inteligente de atribuição baseada no path (mas não obrigatória)
                let suggestedType = null;
                if (path.includes('saft') || path.includes('saf-t') || path.includes('.xml')) {
                    suggestedType = 'saft';
                } else if (path.includes('fatura') || path.includes('invoice')) {
                    suggestedType = 'fatura';
                } else if (path.includes('extrato') || path.includes('statement') || path.includes('bank')) {
                    suggestedType = 'extrato';
                }
                
                if (suggestedType) {
                    // Atribuir apenas se ainda não estiver atribuído
                    if (!VDCSystem.referenceHashes[suggestedType]) {
                        VDCSystem.referenceHashes[suggestedType] = hash;
                        logMessage(`[LINHA ${index + 1}] Hash atribuída a ${suggestedType.toUpperCase()}: ${hash.substring(0, 16)}...`, 'info');
                    } else {
                        logMessage(`[LINHA ${index + 1}] Hash adicional para ${suggestedType.toUpperCase()}: ${hash.substring(0, 16)}...`, 'info');
                    }
                } else {
                    logMessage(`[LINHA ${index + 1}] Hash registada para match posterior: ${hash.substring(0, 16)}...`, 'info');
                }
                
                foundHashes++;
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
        
        logMessage(`Ficheiro de controlo processado: ${foundHashes} hashes registadas`, 'success');
        
    } catch (error) {
        console.error('Erro no processamento do controlo:', error);
        updateControlStatus('error', 'Erro no processamento: ' + error.message);
        logMessage(`Erro no ficheiro de controlo: ${error.message}`, 'error');
    }
}

async function processDocumentUpload(type, file) {
    try {
        logMessage(`Processando upload para ${type.toUpperCase()}: ${file.name}`, 'info');
        
        // Atualizar status
        updateDocumentStatus(type, 'processing', 'Calculando hash...');
        
        // Calcular hash do ficheiro carregado
        const hash = await calculateFileHash(file);
        
        // DETERMINAR FORMATO DO FICHEIRO
        const fileFormat = determineFileFormat(file);
        
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
                parsedData = { content: await readFileAsText(file), format: fileFormat };
            }
            
        } catch (parseError) {
            logMessage(`AVISO: Erro no parse do conteúdo: ${parseError.message}`, 'warn');
        }
        
        // VALIDAÇÃO POR HASH - LÓGICA FLEXÍVEL
        let isValid = false;
        let referenceMatch = null;
        let validationSource = '';
        
        // 1. Primeiro, verificar match exato com hashes registadas
        if (VDCSystem.allReferenceHashes && VDCSystem.allReferenceHashes[hash]) {
            referenceMatch = VDCSystem.allReferenceHashes[hash];
            isValid = true;
            validationSource = 'match_hash_exato';
            logMessage(`✅ Hash encontrada no controlo (${referenceMatch.path})`, 'success');
        }
        // 2. Verificar contra referência específica para o tipo
        else if (VDCSystem.referenceHashes[type] && VDCSystem.referenceHashes[type] === hash) {
            isValid = true;
            validationSource = 'referencia_especifica';
            logMessage(`✅ Hash validada contra referência específica para ${type.toUpperCase()}`, 'success');
        }
        // 3. Fallback: verificar se hash existe em qualquer referência (flexibilidade máxima)
        else if (VDCSystem.allReferenceHashes) {
            // Procurar hash em todas as referências (caso nome não corresponda exatamente)
            const foundHash = Object.values(VDCSystem.allReferenceHashes).find(ref => ref.hash === hash);
            if (foundHash) {
                referenceMatch = foundHash;
                isValid = true;
                validationSource = 'match_hash_flexivel';
                logMessage(`✅ Hash validada (nome diferente: ${foundHash.path})`, 'success');
            }
        }
        
        // Atualizar estado do documento
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
            format: fileFormat,
            validationSource: validationSource,
            referenceMatch: referenceMatch
        };
        
        // Atualizar UI
        if (isValid) {
            updateDocumentStatus(type, 'valid', `Validado ✓ (${fileFormat.toUpperCase()})`);
            updateHashDisplay(type, hash, true);
            
            // Exibir dados extraídos se disponíveis
            if (parsedData) {
                displayExtractedData(type, parsedData);
            }
        } else {
            updateDocumentStatus(type, 'error', 'Hash não encontrada ✗');
            updateHashDisplay(type, hash, false);
            
            // Log informativo para debug
            logMessage(`Hash do ${type.toUpperCase()}: ${hash.substring(0, 16)}...`, 'info');
            if (VDCSystem.allReferenceHashes) {
                const availableHashes = Object.keys(VDCSystem.allReferenceHashes).length;
                logMessage(`${availableHashes} hashes disponíveis no controlo`, 'info');
            }
        }
        
        // Verificar se pode analisar
        checkAnalysisReady();
        
        // Gerar master hash se válido
        if (isValid) {
            await generateMasterHash();
        }
        
        logMessage(`${type.toUpperCase()} ${isValid ? 'VALIDADO ✓' : 'INVALIDO ✗'}: ${hash.substring(0, 16)}...`, isValid ? 'success' : 'error');
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        updateDocumentStatus(type, 'error', 'Erro no processamento');
        logMessage(`Erro no ${type}: ${error.message}`, 'error');
    }
}

// 6. FUNÇÕES AUXILIARES
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
    } else {
        return file.name.split('.').pop() || 'unknown';
    }
}

async function parseSAFTXML(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
                
                const extractedData = {
                    format: 'saft-xml',
                    fileName: file.name,
                    extractionDate: new Date().toISOString()
                };
                
                resolve(extractedData);
                
            } catch (error) {
                resolve({
                    format: 'xml',
                    fileName: file.name,
                    note: 'Conteúdo XML (parse limitado)'
                });
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
                        rowCount: results.data.length,
                        columns: results.meta.fields || []
                    };
                    
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
    return new Promise((resolve) => {
        resolve({
            format: 'pdf',
            fileName: file.name,
            fileSize: file.size,
            note: 'Conteúdo PDF'
        });
    });
}

function displayExtractedData(type, parsedData) {
    if (!parsedData) return;
    
    const format = parsedData.format || 'unknown';
    
    logMessage(`Dados extraídos (${type.toUpperCase()} - ${format.toUpperCase()}):`, 'info');
    logMessage(`• Ficheiro: ${parsedData.fileName || 'N/A'}`, 'info');
    logMessage(`• Formato: ${format.toUpperCase()}`, 'info');
    
    if (format === 'csv' && parsedData.rowCount) {
        logMessage(`• Linhas: ${parsedData.rowCount}`, 'info');
    }
}

// 7. FUNÇÕES DE HASH
async function calculateFileHash(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
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

// 8. FUNÇÕES DE UI
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
    // Habilitar inputs com IDs CORRETOS
    const inputs = [
        { id: 'saftFile', type: 'saft' },
        { id: 'invoiceFile', type: 'fatura' }, // ID correto
        { id: 'statementFile', type: 'extrato' } // ID correto
    ];
    
    inputs.forEach(input => {
        const element = document.getElementById(input.id);
        if (element) {
            element.disabled = false;
            logMessage(`Input habilitado: ${input.id} para ${input.type}`, 'info');
        } else {
            console.warn(`Input não encontrado: ${input.id}`);
        }
    });
    
    // Habilitar grid
    const grid = document.getElementById('documentsGrid');
    if (grid) {
        grid.style.opacity = '1';
        grid.style.pointerEvents = 'auto';
        logMessage('Grid de documentos habilitado', 'info');
    }
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

// 9. REGISTRO DE CLIENTE
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

// 10. ANÁLISE FORENSE
async function performAnalysis() {
    if (!VDCSystem.validation.readyForAnalysis) {
        showError('Sistema não está pronto para análise');
        return;
    }
    
    try {
        logMessage('Iniciando análise forense...', 'info');
        
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
                    logMessage('Análise forense concluída com sucesso', 'success');
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
    
    logMessage('Resultados da análise gerados', 'success');
}

// 11. MASTER HASH
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
            sessionId: VDCSystem.sessionId
        });
        
    } catch (error) {
        console.error('Erro ao gerar Master Hash:', error);
        logMessage(`Erro ao gerar Master Hash: ${error.message}`, 'error');
    }
}

// 12. INDEXEDDB (VERSÃO ALTERADA: 1 → 3)
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VDC_Forensic_DB', 3); // ALTERADO: versão 1 para 3
        
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            VDCSystem.db = event.target.result;
            console.log('✅ IndexedDB inicializado');
            resolve();
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            if (!db.objectStoreNames.contains('sessions')) {
                db.createObjectStore('sessions', { keyPath: 'id' });
            }
            
            if (!db.objectStoreNames.contains('documents')) {
                db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
            }
            
            if (!db.objectStoreNames.contains('analysis')) {
                db.createObjectStore('analysis', { keyPath: 'sessionId' });
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

// 13. FUNÇÕES UTILITÁRIAS
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSystem, 100);
    });
} else {
    setTimeout(initializeSystem, 100);
}
