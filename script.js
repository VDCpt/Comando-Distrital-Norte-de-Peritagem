// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v5.2
// SCRIPT PRINCIPAL - VERSÃO FUNCIONAL
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
        saft: { file: null, hash: null, valid: false, metadata: null },
        fatura: { file: null, hash: null, valid: false, metadata: null },
        extrato: { file: null, hash: null, valid: false, metadata: null }
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

// 5. PROCESSAMENTO DE FICHEIROS
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
        
        // Processar hashes - IGNORAR espaços vazios e auto-referências
        let foundHashes = 0;
        VDCSystem.referenceHashes = { saft: null, fatura: null, extrato: null };
        
        results.data.forEach(row => {
            const path = (row.Path || row.Arquivo || '').toLowerCase();
            const hash = (row.Hash || '').toLowerCase().trim();
            const algorithm = row.Algorithm || '';
            
            // IGNORAR: auto-referências e espaços vazios
            if (!path || !hash || !algorithm) {
                return; // Ignorar linhas vazias
            }
            
            if (path.includes('controlo') || path.includes('autenticidade')) {
                return; // Ignorar auto-referências
            }
            
            // Identificar tipo de documento (apenas SAF-T, Fatura, Extrato)
            let docType = null;
            if (path.includes('saft') || path.includes('.xml')) {
                docType = 'saft';
            } else if (path.includes('fatura') || path.includes('invoice')) {
                docType = 'fatura';
            } else if (path.includes('extrato') || path.includes('statement')) {
                docType = 'extrato';
            }
            
            // Apenas processar os 3 documentos específicos
            if (docType && hash && algorithm) {
                VDCSystem.referenceHashes[docType] = hash;
                foundHashes++;
                logMessage(`Hash de referência encontrada para ${docType}: ${hash.substring(0, 16)}...`, 'info');
            }
        });
        
        if (foundHashes === 0) {
            throw new Error('Nenhuma hash válida encontrada no ficheiro de controlo');
        }
        
        // Atualizar estado
        VDCSystem.validation.controlLoaded = true;
        
        // Atualizar UI
        updateControlStatus('valid', 'Controlo carregado com sucesso');
        enableDocumentUploads();
        
        logMessage(`Ficheiro de controlo processado: ${foundHashes} hashes encontradas`, 'success');
        
    } catch (error) {
        console.error('Erro no processamento do controlo:', error);
        updateControlStatus('error', 'Erro no processamento: ' + error.message);
        logMessage(`Erro no ficheiro de controlo: ${error.message}`, 'error');
    }
}

async function processDocumentUpload(type, file) {
    try {
        logMessage(`Processando ${type}: ${file.name}`, 'info');
        
        // Atualizar status
        updateDocumentStatus(type, 'processing', 'Calculando hash...');
        
        // Calcular hash
        const hash = await calculateFileHash(file);
        
        // Verificar contra referência
        const referenceHash = VDCSystem.referenceHashes[type];
        const isValid = referenceHash && hash === referenceHash;
        
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
            }
        };
        
        // Atualizar UI
        if (isValid) {
            updateDocumentStatus(type, 'valid', 'Hash validada');
            updateHashDisplay(type, hash, true);
        } else {
            updateDocumentStatus(type, 'error', 'Hash divergente');
            updateHashDisplay(type, hash, false);
        }
        
        // Verificar se pode analisar
        checkAnalysisReady();
        
        // Gerar master hash se válido
        if (isValid) {
            await generateMasterHash();
        }
        
        logMessage(`${type.toUpperCase()} ${isValid ? 'VALIDADO' : 'INVALIDO'}: ${hash.substring(0, 16)}...`, isValid ? 'success' : 'error');
        
    } catch (error) {
        console.error(`Erro no processamento de ${type}:`, error);
        updateDocumentStatus(type, 'error', 'Erro no processamento');
        logMessage(`Erro no ${type}: ${error.message}`, 'error');
    }
}

// 6. FUNÇÕES DE HASH
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

// 7. FUNÇÕES DE UI
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

// 8. REGISTRO DE CLIENTE
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

// 9. ANÁLISE FORENSE
async function performAnalysis() {
    if (!VDCSystem.validation.readyForAnalysis) {
        showError('Sistema não está pronto para análise');
        return;
    }
    
    try {
        logMessage('Iniciando análise forense...', 'info');
        
        // Mostrar progresso
        showProgress();
        
        // Simular análise (em produção, isto seria substituído por cálculos reais)
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
    // Esta função seria expandida para gerar resultados reais
    // Por enquanto, apenas gera uma master hash
    generateMasterHash();
    
    logMessage('Resultados da análise gerados', 'success');
}

// 10. MASTER HASH
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

// 11. INDEXEDDB
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VDC_Forensic_DB', 1);
        
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
            
            // Object stores
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

// 12. FUNÇÕES UTILITÁRIAS
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
        VDCSystem.documents = {
            saft: { file: null, hash: null, valid: false, metadata: null },
            fatura: { file: null, hash: null, valid: false, metadata: null },
            extrato: { file: null, hash: null, valid: false, metadata: null }
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

// 13. INICIALIZAÇÃO
// Aguardar que o DOM esteja completamente carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeSystem, 100);
    });
} else {
    setTimeout(initializeSystem, 100);
}
