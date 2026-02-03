// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v5.2
// LÓGICA DE VALIDAÇÃO ASSÍNCRONA - HARD FIX
// ============================================

// 1. CONFIGURAÇÃO DO SISTEMA
const SYSTEM_CONFIG = {
    VERSION: 'VDC v5.2 - Terminal de Prova Legal',
    HASH_ALGORITHM: 'SHA-256',
    VALIDATION_MODE: 'SELECTIVE_INTEGRITY',
    DB_NAME: 'VDC_FORENSIC_DB_v2',
    DB_VERSION: 3
};

// 2. ESTADO GLOBAL DO SISTEMA
const VDCState = {
    // Identificação
    session: {
        id: null,
        timestamp: null,
        clientId: null,
        status: 'INITIALIZING'
    },
    
    // Referência de Hashes (CSV de controlo)
    referenceMap: new Map(), // Map<filename, {hash, algorithm, path}>
    
    // Documentos carregados
    documents: {
        saft: { loaded: false, validated: false, hash: '', file: null, metadata: {} },
        fatura: { loaded: false, validated: false, hash: '', file: null, metadata: {} },
        extrato: { loaded: false, validated: false, hash: '', file: null, metadata: {} }
    },
    
    // Validação seletiva
    validation: {
        totalLoaded: 0,
        validCount: 0,
        invalidCount: 0,
        allowsPartialReport: false,
        allowsFullReport: false
    },
    
    // Master Hash
    masterHash: {
        value: '',
        timestamp: null,
        includedDocuments: [],
        sessionId: null,
        sealed: false
    },
    
    // IndexedDB
    db: null,
    
    // Auditoria
    auditLogs: []
};

// 3. WORKER PARA CÁLCULO DE HASH (EVITA BLOQUEIO DA THREAD)
class HashWorkerManager {
    constructor() {
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestId = 0;
        
        this.initWorker();
    }
    
    initWorker() {
        // Criar worker inline para evitar arquivo externo
        const workerCode = `
            self.onmessage = function(e) {
                const { id, fileBuffer, fileName } = e.data;
                
                // Importar CryptoJS dinamicamente
                importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');
                
                try {
                    // Converter ArrayBuffer para WordArray
                    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);
                    
                    // Calcular SHA-256
                    const hash = CryptoJS.SHA256(wordArray).toString();
                    
                    self.postMessage({
                        id,
                        success: true,
                        hash: hash.toLowerCase().trim(),
                        fileName
                    });
                } catch (error) {
                    self.postMessage({
                        id,
                        success: false,
                        error: error.message,
                        fileName
                    });
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        
        this.worker.onmessage = (e) => {
            const { id, success, hash, error, fileName } = e.data;
            const callback = this.pendingRequests.get(id);
            
            if (callback) {
                if (success) {
                    callback.resolve(hash);
                } else {
                    callback.reject(new Error(error));
                }
                this.pendingRequests.delete(id);
            }
        };
        
        this.worker.onerror = (error) => {
            console.error('Hash Worker error:', error);
            this.pendingRequests.forEach((callback, id) => {
                callback.reject(error);
            });
            this.pendingRequests.clear();
        };
    }
    
    async calculateHash(file) {
        return new Promise((resolve, reject) => {
            const requestId = ++this.requestId;
            
            // Ler o arquivo como ArrayBuffer
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const fileBuffer = e.target.result;
                
                this.pendingRequests.set(requestId, { resolve, reject });
                
                this.worker.postMessage({
                    id: requestId,
                    fileBuffer,
                    fileName: file.name
                });
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingRequests.clear();
    }
}

// Inicializar worker manager
const hashWorker = new HashWorkerManager();

// 4. FUNÇÃO ASSÍNCRONA PARA CÁLCULO DE HASH
async function calculateFileHash(file) {
    try {
        logAudit('INFO', `Calculando hash para: ${file.name}`);
        
        // Usar worker para evitar bloqueio
        const hash = await hashWorker.calculateHash(file);
        
        logAudit('SUCCESS', `Hash calculada para ${file.name}: ${hash.substring(0, 16)}...`);
        return hash;
        
    } catch (error) {
        logAudit('ERROR', `Erro ao calcular hash para ${file.name}: ${error.message}`);
        
        // Fallback: usar CryptoJS diretamente (menos eficiente mas funcional)
        try {
            logAudit('WARN', 'Usando fallback para cálculo de hash');
            return await calculateHashFallback(file);
        } catch (fallbackError) {
            throw new Error(`Hash calculation failed: ${fallbackError.message}`);
        }
    }
}

async function calculateHashFallback(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const wordArray = CryptoJS.lib.WordArray.create(e.target.result);
                const hash = CryptoJS.SHA256(wordArray).toString();
                resolve(hash.toLowerCase().trim());
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsArrayBuffer(file);
    });
}

// 5. PROCESSAMENTO DO CSV DE CONTROLO COM FILTRO DE RUÍDO
async function processControlFile(file) {
    logAudit('INFO', `Processando ficheiro de controlo: ${file.name}`);
    
    // Limpar mapa anterior
    VDCState.referenceMap.clear();
    
    // Atualizar UI
    updateStep1Status('PROCESSING', 'Processando CSV de controlo...');
    
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            encoding: 'UTF-8',
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            complete: function(results) {
                try {
                    let validHashes = 0;
                    
                    results.data.forEach(row => {
                        const path = (row.Path || row.Arquivo || '').toLowerCase().trim();
                        const hash = (row.Hash || '').trim().toLowerCase();
                        const algorithm = (row.Algorithm || '').trim();
                        
                        // FILTRO DE RUÍDO RIGOROSO
                        if (!path || !hash || !algorithm) return;
                        
                        if (path.includes('controlo') || 
                            path.includes('controle') || 
                            path.includes('autenticidade') ||
                            path.includes('verificacao') ||
                            path.match(/hash.*\.csv$/i) ||
                            path.match(/control.*\.csv$/i)) {
                            logAudit('DEBUG', `Filtro de ruído: ignorando ${path}`);
                            return;
                        }
                        
                        // Determinar tipo de documento
                        let docType = null;
                        if (path.includes('.xml') || path.includes('saft') || path.includes('131509')) {
                            docType = 'saft';
                        } else if (path.includes('fatura') || path.includes('invoice') || path.includes('pt1126')) {
                            docType = 'fatura';
                        } else if (path.includes('extrato') || path.includes('statement') || path.includes('ganhos')) {
                            docType = 'extrato';
                        }
                        
                        if (docType) {
                            VDCState.referenceMap.set(docType, {
                                hash: hash,
                                algorithm: algorithm,
                                path: path,
                                valid: true
                            });
                            validHashes++;
                            
                            logAudit('DEBUG', `Hash de referência carregada: ${docType} = ${hash.substring(0, 16)}...`);
                        }
                    });
                    
                    if (validHashes === 0) {
                        throw new Error('Nenhuma hash válida encontrada no ficheiro de controlo');
                    }
                    
                    logAudit('SUCCESS', `CSV processado: ${validHashes} hashes de referência carregadas`);
                    updateStep1Status('VALID', 'Registo de autenticidade carregado');
                    
                    // Habilitar uploads de documentos
                    enableDocumentUploads();
                    
                    resolve(validHashes);
                    
                } catch (error) {
                    logAudit('ERROR', `Erro no processamento do CSV: ${error.message}`);
                    updateStep1Status('ERROR', 'Erro no processamento');
                    reject(error);
                }
            },
            error: function(error) {
                logAudit('ERROR', `Erro de parsing CSV: ${error.message}`);
                updateStep1Status('ERROR', 'Erro de leitura do CSV');
                reject(error);
            }
        });
    });
}

// 6. VALIDAÇÃO DE DOCUMENTOS COM FEEDBACK IMEDIATO
async function validateUploadedDocument(type, file) {
    logAudit('INFO', `Validando ${type}: ${file.name}`);
    
    // Atualizar estado do cartão
    updateDocumentCard(type, 'PROCESSING', 'Calculando hash...');
    
    try {
        // 1. Calcular hash do ficheiro
        const fileHash = await calculateFileHash(file);
        
        // 2. Obter hash de referência
        const reference = VDCState.referenceMap.get(type);
        
        if (!reference) {
            throw new Error(`Nenhuma hash de referência encontrada para ${type}`);
        }
        
        // 3. Comparar hashes
        const isValid = fileHash === reference.hash;
        
        // 4. Atualizar estado
        VDCState.documents[type] = {
            loaded: true,
            validated: isValid,
            hash: fileHash,
            file: file,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                uploadTime: new Date().toISOString()
            }
        };
        
        // 5. Atualizar validação seletiva
        updateValidationCount();
        
        // 6. Atualizar UI com feedback imediato
        if (isValid) {
            updateDocumentCard(type, 'VALID', 'Hash validada com sucesso');
            updateHashDisplay(type, fileHash, reference.hash, true);
            logAudit('SUCCESS', `${type.toUpperCase()} VALIDADO: ${fileHash.substring(0, 16)}...`);
        } else {
            updateDocumentCard(type, 'ERROR', 'HASH DIVERGENTE');
            updateHashDisplay(type, fileHash, reference.hash, false);
            logAudit('ERROR', `${type.toUpperCase()} INVALIDO: Hash divergente`);
        }
        
        // 7. Gerar master hash se houver documentos válidos
        if (isValid) {
            await generateMasterHash();
        }
        
        // 8. Atualizar botões de relatório
        updateReportButtons();
        
    } catch (error) {
        logAudit('ERROR', `Erro na validação de ${type}: ${error.message}`);
        updateDocumentCard(type, 'ERROR', `Erro: ${error.message.substring(0, 50)}...`);
    }
}

// 7. GERAÇÃO DA MASTER HASH (ASSINATURA DIGITAL)
async function generateMasterHash() {
    // Coletar hashes dos documentos válidos
    const validDocuments = [];
    const hashData = [];
    
    ['saft', 'fatura', 'extrato'].forEach(type => {
        const doc = VDCState.documents[type];
        if (doc.loaded && doc.validated && doc.hash) {
            validDocuments.push(type);
            hashData.push(doc.hash);
        }
    });
    
    if (validDocuments.length === 0) {
        VDCState.masterHash = {
            value: '',
            timestamp: null,
            includedDocuments: [],
            sessionId: VDCState.session.id,
            sealed: false
        };
        return;
    }
    
    // Adicionar metadados da sessão
    hashData.push(VDCState.session.id);
    hashData.push(new Date().toISOString());
    hashData.push(SYSTEM_CONFIG.VERSION);
    
    // Concatenar e calcular hash
    const concatenated = hashData.join('|');
    const masterHash = CryptoJS.SHA256(concatenated).toString().toLowerCase();
    
    // Atualizar estado
    VDCState.masterHash = {
        value: masterHash,
        timestamp: new Date().toISOString(),
        includedDocuments: validDocuments,
        sessionId: VDCState.session.id,
        sealed: true
    };
    
    // Atualizar UI
    updateMasterHashDisplay();
    
    // Persistir no IndexedDB
    await saveSessionToIndexedDB();
    
    logAudit('SUCCESS', `Master Hash gerada: ${masterHash.substring(0, 32)}... (${validDocuments.length} documentos)`);
}

// 8. INDEXEDDB - PERSISTÊNCIA FORENSE
async function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SYSTEM_CONFIG.DB_NAME, SYSTEM_CONFIG.DB_VERSION);
        
        request.onerror = (event) => {
            logAudit('ERROR', `Falha ao abrir IndexedDB: ${event.target.error}`);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            VDCState.db = event.target.result;
            logAudit('SUCCESS', 'IndexedDB inicializado');
            resolve(VDCState.db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Object Store para sessões
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
                sessionStore.createIndex('clientId', 'clientId', { unique: false });
            }
            
            // Object Store para documentos
            if (!db.objectStoreNames.contains('documents')) {
                const docStore = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
                docStore.createIndex('sessionId', 'sessionId', { unique: false });
                docStore.createIndex('documentType', 'documentType', { unique: false });
            }
            
            // Object Store para master hashes
            if (!db.objectStoreNames.contains('master_hashes')) {
                const hashStore = db.createObjectStore('master_hashes', { keyPath: 'sessionId' });
                hashStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function saveSessionToIndexedDB() {
    if (!VDCState.db) return;
    
    return new Promise((resolve, reject) => {
        const transaction = VDCState.db.transaction(['sessions', 'documents', 'master_hashes'], 'readwrite');
        
        // Salvar sessão
        const sessionData = {
            sessionId: VDCState.session.id,
            timestamp: VDCState.session.timestamp,
            clientId: VDCState.session.clientId,
            status: VDCState.session.status,
            validation: VDCState.validation,
            createdAt: new Date().toISOString()
        };
        
        transaction.objectStore('sessions').put(sessionData);
        
        // Salvar documentos
        ['saft', 'fatura', 'extrato'].forEach(type => {
            const doc = VDCState.documents[type];
            if (doc.loaded) {
                const docData = {
                    sessionId: VDCState.session.id,
                    documentType: type,
                    validated: doc.validated,
                    hash: doc.hash,
                    metadata: doc.metadata,
                    uploadedAt: new Date().toISOString()
                };
                
                transaction.objectStore('documents').add(docData);
            }
        });
        
        // Salvar master hash
        if (VDCState.masterHash.sealed) {
            transaction.objectStore('master_hashes').put({
                sessionId: VDCState.session.id,
                hash: VDCState.masterHash.value,
                timestamp: VDCState.masterHash.timestamp,
                includedDocuments: VDCState.masterHash.includedDocuments,
                sealedAt: new Date().toISOString()
            });
        }
        
        transaction.oncomplete = () => {
            logAudit('INFO', 'Sessão persistida no IndexedDB');
            resolve();
        };
        
        transaction.onerror = (event) => {
            logAudit('ERROR', 'Erro ao persistir sessão', event.target.error);
            reject(event.target.error);
        };
    });
}

// 9. FUNÇÃO DE LIMPEZA DE SESSÃO
async function clearSession() {
    logAudit('WARN', 'Iniciando limpeza de sessão...');
    
    // 1. Limpar estados
    VDCState.referenceMap.clear();
    VDCState.documents = {
        saft: { loaded: false, validated: false, hash: '', file: null, metadata: {} },
        fatura: { loaded: false, validated: false, hash: '', file: null, metadata: {} },
        extrato: { loaded: false, validated: false, hash: '', file: null, metadata: {} }
    };
    VDCState.validation = {
        totalLoaded: 0,
        validCount: 0,
        invalidCount: 0,
        allowsPartialReport: false,
        allowsFullReport: false
    };
    VDCState.masterHash = {
        value: '',
        timestamp: null,
        includedDocuments: [],
        sessionId: null,
        sealed: false
    };
    
    // 2. Resetar UI
    resetAllCardStates();
    updateStep1Status('PENDING', 'Aguardando ficheiro de controlo');
    clearMasterHashDisplay();
    clearAuditConsole();
    
    // 3. Limpar IndexedDB (opcional - apenas sessão atual)
    await clearCurrentSessionFromDB();
    
    // 4. Nova sessão
    VDCState.session.id = generateSessionId();
    VDCState.session.timestamp = new Date().toISOString();
    
    logAudit('SUCCESS', 'Sessão limpa com sucesso. Nova sessão iniciada.');
    updateSessionDisplay();
}

async function clearCurrentSessionFromDB() {
    if (!VDCState.db || !VDCState.session.id) return;
    
    return new Promise((resolve, reject) => {
        const transaction = VDCState.db.transaction(['sessions', 'documents', 'master_hashes'], 'readwrite');
        
        // Remover sessão atual
        transaction.objectStore('sessions').delete(VDCState.session.id);
        transaction.objectStore('master_hashes').delete(VDCState.session.id);
        
        // Remover documentos da sessão
        const docStore = transaction.objectStore('documents');
        const index = docStore.index('sessionId');
        const request = index.openCursor(IDBKeyRange.only(VDCState.session.id));
        
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
        
        transaction.oncomplete = () => {
            logAudit('INFO', 'Sessão removida do IndexedDB');
            resolve();
        };
        
        transaction.onerror = (event) => {
            logAudit('ERROR', 'Erro ao remover sessão', event.target.error);
            reject(event.target.error);
        };
    });
}

// 10. FUNÇÕES DE UI
function updateStep1Status(state, message) {
    const statusElement = document.getElementById('step1-status');
    const stepContainer = document.querySelector('.step-1-container');
    
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.setAttribute('data-state', state.toLowerCase());
    }
    
    if (stepContainer) {
        stepContainer.setAttribute('data-state', state.toLowerCase());
    }
}

function updateDocumentCard(type, state, message) {
    const card = document.querySelector(`.document-card[data-type="${type}"]`);
    const statusElement = card?.querySelector('.card-status');
    
    if (card) {
        card.setAttribute('data-state', state.toLowerCase());
    }
    
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.setAttribute('data-state', state.toLowerCase());
    }
}

function updateHashDisplay(type, calculatedHash, referenceHash, isValid) {
    const hashElement = document.querySelector(`.document-card[data-type="${type}"] .hash-value`);
    
    if (hashElement) {
        hashElement.textContent = calculatedHash;
        hashElement.className = `hash-value ${isValid ? 'valid' : 'invalid'}`;
        
        // Tooltip com comparação
        hashElement.title = `Local: ${calculatedHash}\nReferência: ${referenceHash}`;
    }
}

function updateMasterHashDisplay() {
    const hashElement = document.getElementById('master-hash-value');
    const sessionElement = document.getElementById('session-id');
    
    if (hashElement && VDCState.masterHash.sealed) {
        hashElement.textContent = VDCState.masterHash.value;
        hashElement.className = 'master-hash-display';
    }
    
    if (sessionElement && VDCState.session.id) {
        sessionElement.textContent = VDCState.session.id;
    }
}

function clearMasterHashDisplay() {
    const hashElement = document.getElementById('master-hash-value');
    if (hashElement) {
        hashElement.textContent = 'AGUARDANDO GERAÇÃO...';
        hashElement.className = 'master-hash-display pending';
    }
}

function enableDocumentUploads() {
    const cards = document.querySelectorAll('.document-card[data-state="locked"]');
    cards.forEach(card => {
        card.setAttribute('data-state', 'pending');
        card.querySelector('.file-upload-area')?.setAttribute('data-state', 'ready');
    });
    
    logAudit('INFO', 'Uploads de documentos habilitados');
}

function resetAllCardStates() {
    const cards = document.querySelectorAll('.document-card');
    cards.forEach(card => {
        card.setAttribute('data-state', 'locked');
        const status = card.querySelector('.card-status');
        if (status) {
            status.textContent = 'AGUARDANDO';
            status.setAttribute('data-state', 'pending');
        }
        
        const hashValue = card.querySelector('.hash-value');
        if (hashValue) {
            hashValue.textContent = 'Nenhum ficheiro carregado';
            hashValue.className = 'hash-value pending';
        }
    });
}

function updateValidationCount() {
    const docs = VDCState.documents;
    
    VDCState.validation.totalLoaded = 0;
    VDCState.validation.validCount = 0;
    VDCState.validation.invalidCount = 0;
    
    Object.values(docs).forEach(doc => {
        if (doc.loaded) {
            VDCState.validation.totalLoaded++;
            if (doc.validated) {
                VDCState.validation.validCount++;
            } else {
                VDCState.validation.invalidCount++;
            }
        }
    });
    
    VDCState.validation.allowsPartialReport = VDCState.validation.validCount > 0;
    VDCState.validation.allowsFullReport = VDCState.validation.validCount === 3;
}

function updateReportButtons() {
    const fullBtn = document.getElementById('full-report-btn');
    const partialBtn = document.getElementById('partial-report-btn');
    
    if (fullBtn) {
        fullBtn.disabled = !VDCState.validation.allowsFullReport;
        fullBtn.setAttribute('data-state', VDCState.validation.allowsFullReport ? 'ready' : 'locked');
    }
    
    if (partialBtn) {
        partialBtn.disabled = !VDCState.validation.allowsPartialReport;
        partialBtn.setAttribute('data-state', VDCState.validation.allowsPartialReport ? 'ready' : 'locked');
    }
}

// 11. LOGS DE AUDITORIA
function logAudit(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        data,
        sessionId: VDCState.session.id
    };
    
    VDCState.auditLogs.push(logEntry);
    
    // Limitar logs a 1000 entradas
    if (VDCState.auditLogs.length > 1000) {
        VDCState.auditLogs = VDCState.auditLogs.slice(-1000);
    }
    
    updateAuditConsole(logEntry);
    console.log(`[VDC:${level}] ${message}`, data || '');
}

function updateAuditConsole(logEntry) {
    const consoleOutput = document.getElementById('console-output');
    if (!consoleOutput) return;
    
    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    
    const time = new Date(logEntry.timestamp).toLocaleTimeString('pt-PT', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    logElement.innerHTML = `
        <span class="log-timestamp">[${time}]</span>
        <span class="log-level ${logEntry.level.toLowerCase()}">${logEntry.level}</span>
        <span class="log-message">${logEntry.message}</span>
    `;
    
    consoleOutput.appendChild(logElement);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearAuditConsole() {
    const consoleOutput = document.getElementById('console-output');
    if (consoleOutput) {
        consoleOutput.innerHTML = '';
    }
}

// 12. FUNÇÕES UTILITÁRIAS
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function normalizeHash(hash) {
    if (!hash) return '';
    return hash.toString()
        .replace(/"/g, '')
        .replace(/\s+/g, '')
        .toLowerCase()
        .trim();
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 13. INICIALIZAÇÃO DO SISTEMA
async function initializeSystem() {
    try {
        logAudit('INFO', '=== INICIALIZANDO SISTEMA VDC v5.2 ===');
        
        // Gerar ID de sessão
        VDCState.session.id = generateSessionId();
        VDCState.session.timestamp = new Date().toISOString();
        VDCState.session.status = 'ACTIVE';
        
        // Inicializar IndexedDB
        await initIndexedDB();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Atualizar UI
        updateSessionDisplay();
        
        logAudit('SUCCESS', 'Sistema inicializado com sucesso');
        
    } catch (error) {
        logAudit('ERROR', 'Falha crítica na inicialização', error);
        alert('ERRO: Falha na inicialização do sistema. Por favor, recarregue a página.');
    }
}

function setupEventListeners() {
    // Ficheiro de controlo
    const controlFileInput = document.getElementById('control-file-input');
    if (controlFileInput) {
        controlFileInput.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await processControlFile(e.target.files[0]);
            }
        });
    }
    
    // Uploads de documentos
    ['saft', 'fatura', 'extrato'].forEach(type => {
        const input = document.getElementById(`${type}-file-input`);
        const uploadArea = document.querySelector(`.document-card[data-type="${type}"] .file-upload-area`);
        
        if (input && uploadArea) {
            // Click na área de upload
            uploadArea.addEventListener('click', () => {
                if (uploadArea.getAttribute('data-state') !== 'locked') {
                    input.click();
                }
            });
            
            // Alteração do input
            input.addEventListener('change', async (e) => {
                if (e.target.files[0]) {
                    await validateUploadedDocument(type, e.target.files[0]);
                }
            });
        }
    });
    
    // Botão de limpeza
    const clearBtn = document.getElementById('clear-session-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar a sessão atual? Todos os dados serão perdidos.')) {
                clearSession();
            }
        });
    }
    
    // Botões de relatório
    const fullReportBtn = document.getElementById('full-report-btn');
    const partialReportBtn = document.getElementById('partial-report-btn');
    
    if (fullReportBtn) {
        fullReportBtn.addEventListener('click', () => generateReport('FULL'));
    }
    
    if (partialReportBtn) {
        partialReportBtn.addEventListener('click', () => generateReport('PARTIAL'));
    }
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => performForensicAnalysis());
    }
}

// 14. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    // Carregar fontes monoespaçadas
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
    
    // Inicializar sistema
    setTimeout(() => {
        initializeSystem().catch(console.error);
    }, 100);
});

// Limpar recursos ao sair
window.addEventListener('beforeunload', () => {
    if (hashWorker) {
        hashWorker.destroy();
    }
});
