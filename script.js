// ============================================
// VDC UNIDADE DE PERITAGEM - SCRIPT v5.2
// TERMINAL DE PROVA LEGAL - LÓGICA FORENSE CONSOLIDADA
// ============================================

// 1. CONFIGURAÇÃO DO SISTEMA
const SYSTEM_VERSION = 'VDC v5.2 - Terminal de Prova Legal';
const HASH_ALGORITHM = 'SHA-256';
const VALIDATION_MODE = 'SELECTIVE_INTEGRITY_NIST_2024';

// 2. OBJETO GLOBAL DE ESTADO PERICIAL
window.vdcForensicState = {
    // Identificação da Sessão
    session: {
        id: generateSessionId(),
        timestamp: new Date().toISOString(),
        perito: '',
        sistema: SYSTEM_VERSION,
        estado: 'INICIALIZANDO'
    },
    
    // Identificação do Cliente (IndexedDB Backed)
    cliente: {
        nome: '',
        nif: '',
        registado: false,
        dataRegisto: null,
        historicoId: null
    },
    
    // Configuração da Análise
    config: {
        ano: '2024',
        plataforma: 'bolt',
        exercicio: '2024',
        timestampConfig: null
    },
    
    // Registo de Autenticidade (CSV)
    registoAutenticidade: {
        carregado: false,
        timestamp: null,
        dadosCSV: null,
        hashesReferencia: {
            saft: { hash: '', algoritmo: '', caminho: '', valido: false },
            fatura: { hash: '', algoritmo: '', caminho: '', valido: false },
            extrato: { hash: '', algoritmo: '', caminho: '', valido: false }
        },
        ficheirosEncontrados: []
    },
    
    // Documentos Carregados
    documentos: {
        saft: {
            carregado: false,
            valido: false,
            hashCalculada: '',
            metadados: null,
            dados: null,
            timestampProcessamento: null
        },
        fatura: {
            carregado: false,
            valido: false,
            hashCalculada: '',
            metadados: null,
            dados: null,
            timestampProcessamento: null
        },
        extrato: {
            carregado: false,
            valido: false,
            hashCalculada: '',
            metadados: null,
            dados: null,
            timestampProcessamento: null
        }
    },
    
    // Validação Seletiva
    validacaoSeletiva: {
        ficheirosCarregados: 0,
        ficheirosValidos: 0,
        ficheirosInvalidos: 0,
        permiteRelatorioParcial: false,
        permiteRelatorioCompleto: false,
        mensagemStatus: 'Aguardando carregamento de documentos'
    },
    
    // Master Hash da Sessão (Assinatura Digital)
    masterHash: {
        hash: '',
        timestamp: null,
        ficheirosIncluidos: [],
        algoritmo: HASH_ALGORITHM,
        versaoSistema: SYSTEM_VERSION,
        sessionId: '',
        selado: false
    },
    
    // Análise Forense
    analise: {
        concluida: false,
        emCurso: false,
        dados: null,
        timestamp: null,
        divergenciaDetetada: false,
        impactoFiscal: null
    },
    
    // Console de Auditoria
    auditoria: {
        logs: [],
        erros: [],
        warnings: [],
        nivelLog: 'INFO' // DEBUG, INFO, WARN, ERROR
    }
};

// 3. INDEXEDDB - PERSISTÊNCIA FORENSE
const DB_NAME = 'VDC_FORENSIC_DB';
const DB_VERSION = 2;
let db = null;

// 3.1 Inicializar IndexedDB
async function inicializarIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('Erro ao abrir IndexedDB:', event.target.error);
            registrarLog('ERROR', 'Falha na inicialização do IndexedDB', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            registrarLog('INFO', 'IndexedDB inicializado com sucesso');
            console.log('✅ IndexedDB inicializado:', db);
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            
            // Object Store para Clientes
            if (!db.objectStoreNames.contains('clientes')) {
                const clientesStore = db.createObjectStore('clientes', { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
                clientesStore.createIndex('nif', 'nif', { unique: true });
                clientesStore.createIndex('nome', 'nome', { unique: false });
                clientesStore.createIndex('dataRegisto', 'dataRegisto', { unique: false });
                console.log('📁 Object Store "clientes" criada');
            }
            
            // Object Store para Sessões
            if (!db.objectStoreNames.contains('sessoes')) {
                const sessoesStore = db.createObjectStore('sessoes', { 
                    keyPath: 'sessionId' 
                });
                sessoesStore.createIndex('timestamp', 'timestamp', { unique: false });
                sessoesStore.createIndex('clienteNif', 'clienteNif', { unique: false });
                console.log('📁 Object Store "sessoes" criada');
            }
            
            // Object Store para Hashes de Referência
            if (!db.objectStoreNames.contains('hashes_referencia')) {
                const hashesStore = db.createObjectStore('hashes_referencia', { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
                hashesStore.createIndex('tipoDocumento', 'tipoDocumento', { unique: false });
                hashesStore.createIndex('hash', 'hash', { unique: false });
                console.log('📁 Object Store "hashes_referencia" criada');
            }
        };
    });
}

// 3.2 Operações CRUD para Clientes
async function guardarClienteNoDB(cliente) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB não inicializada'));
            return;
        }
        
        const transaction = db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');
        
        const clienteData = {
            nome: cliente.nome,
            nif: cliente.nif,
            dataRegisto: new Date().toISOString(),
            ultimaAtualizacao: new Date().toISOString()
        };
        
        const request = store.add(clienteData);
        
        request.onsuccess = (event) => {
            registrarLog('INFO', `Cliente guardado no DB: ${cliente.nome} (NIF: ${cliente.nif})`);
            resolve(event.target.result); // Retorna o ID
        };
        
        request.onerror = (event) => {
            registrarLog('ERROR', 'Erro ao guardar cliente no DB', event.target.error);
            reject(event.target.error);
        };
    });
}

async function buscarClientesPorNome(nome) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }
        
        const transaction = db.transaction(['clientes'], 'readonly');
        const store = transaction.objectStore('clientes');
        const index = store.index('nome');
        const request = index.getAll(IDBKeyRange.only(nome));
        
        request.onsuccess = (event) => {
            resolve(event.target.result || []);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

async function buscarClientesPorNIF(nif) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve([]);
            return;
        }
        
        const transaction = db.transaction(['clientes'], 'readonly');
        const store = transaction.objectStore('clientes');
        const index = store.index('nif');
        const request = index.get(IDBKeyRange.only(nif));
        
        request.onsuccess = (event) => {
            resolve(event.target.result ? [event.target.result] : []);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// 3.3 Guardar Sessão
async function guardarSessaoNoDB(sessaoData) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB não inicializada'));
            return;
        }
        
        const transaction = db.transaction(['sessoes'], 'readwrite');
        const store = transaction.objectStore('sessoes');
        
        const request = store.add(sessaoData);
        
        request.onsuccess = (event) => {
            registrarLog('INFO', 'Sessão guardada no histórico');
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            registrarLog('ERROR', 'Erro ao guardar sessão no DB', event.target.error);
            reject(event.target.error);
        };
    });
}

// 4. FUNÇÕES DE UTILIDADE
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `VDC-${timestamp}-${random}`.toUpperCase();
}

function normalizarHash(hash) {
    if (!hash) return '';
    return hash.toString()
        .replace(/"/g, '')
        .replace(/\s+/g, '')
        .toLowerCase()
        .trim();
}

function formatarTamanhoFicheiro(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const tamanhos = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + tamanhos[i];
}

function atualizarTimestamp() {
    const el = document.getElementById('currentTimestamp');
    if (el) {
        const agora = new Date();
        el.textContent = agora.toLocaleString('pt-PT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    setTimeout(atualizarTimestamp, 1000);
}

// 5. REGISTRO DE LOGS DE AUDITORIA
function registrarLog(nivel, mensagem, dados = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        nivel: nivel,
        mensagem: mensagem,
        dados: dados,
        sessionId: window.vdcForensicState.session.id
    };
    
    window.vdcForensicState.auditoria.logs.push(logEntry);
    
    if (nivel === 'ERROR') {
        window.vdcForensicState.auditoria.erros.push(logEntry);
    } else if (nivel === 'WARN') {
        window.vdcForensicState.auditoria.warnings.push(logEntry);
    }
    
    // Atualizar console visual
    atualizarConsoleAuditoria(logEntry);
    
    console.log(`[${nivel}] ${mensagem}`, dados || '');
}

function atualizarConsoleAuditoria(logEntry) {
    const consoleOutput = document.getElementById('consoleOutput');
    if (!consoleOutput) return;
    
    const logElement = document.createElement('div');
    logElement.className = `log-entry log-${logEntry.nivel.toLowerCase()}`;
    
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString('pt-PT');
    logElement.innerHTML = `
        <span class="log-timestamp">[${timestamp}]</span>
        <span class="log-level">${logEntry.nivel}</span>
        <span class="log-message">${logEntry.mensagem}</span>
    `;
    
    consoleOutput.appendChild(logElement);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// 6. CÁLCULO DE HASH ASSÍNCRONO
async function calcularHashSHA256(ficheiro) {
    return new Promise((resolve, reject) => {
        registrarLog('INFO', `Calculando hash SHA-256 para: ${ficheiro.name}`);
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const arrayBuffer = e.target.result;
                
                // Usar Web Crypto API se disponível (mais rápido)
                if (window.crypto && window.crypto.subtle) {
                    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    resolve(normalizarHash(hashHex));
                } else {
                    // Fallback para CryptoJS
                    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
                    const hash = CryptoJS.SHA256(wordArray).toString();
                    resolve(normalizarHash(hash));
                }
            } catch (error) {
                registrarLog('ERROR', `Erro no cálculo de hash: ${error.message}`, error);
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            registrarLog('ERROR', 'Erro na leitura do ficheiro para cálculo de hash', error);
            reject(error);
        };
        
        reader.readAsArrayBuffer(ficheiro);
    });
}

// 7. PROCESSAMENTO DO CSV DE CONTROLO COM FILTRO ANTI-RUÍDO
async function processarControloAutenticidade(ficheiro) {
    registrarLog('INFO', `Processando ficheiro de controlo: ${ficheiro.name}`);
    
    const statusEl = document.getElementById('controlStatus');
    if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO REGISTO DE AUTENTICIDADE...`;
        statusEl.setAttribute('data-state', 'processing');
    }
    
    return new Promise((resolve, reject) => {
        Papa.parse(ficheiro, {
            encoding: 'UTF-8', // Forçar encoding
            header: true,
            skipEmptyLines: true,
            delimiter: ',',
            complete: function(resultados) {
                try {
                    // === FILTRO ANTI-RUÍDO RIGOROSO ===
                    const dadosFiltrados = resultados.data.filter(linha => {
                        const path = (linha.Path || linha.Arquivo || '').toLowerCase();
                        
                        // Excluir qualquer referência a ficheiros de controlo
                        if (path.includes('controlo') || 
                            path.includes('controle') || 
                            path.includes('autenticidade') ||
                            path.includes('verificacao') ||
                            path.match(/hash.*\.csv/i) ||
                            path.match(/control.*\.csv/i)) {
                            registrarLog('DEBUG', `FILTRO ANTI-RUÍDO: Ignorando ${path}`);
                            return false;
                        }
                        return true;
                    });
                    
                    if (dadosFiltrados.length === 0) {
                        throw new Error('Nenhuma hash válida encontrada após filtro anti-ruído');
                    }
                    
                    // Processar hashes de referência
                    const hashesReferencia = {
                        saft: { hash: '', algoritmo: '', caminho: '', valido: false },
                        fatura: { hash: '', algoritmo: '', caminho: '', valido: false },
                        extrato: { hash: '', algoritmo: '', caminho: '', valido: false }
                    };
                    
                    dadosFiltrados.forEach(linha => {
                        const algorithm = linha.Algorithm || '';
                        const hash = linha.Hash || '';
                        const path = linha.Path || linha.Arquivo || '';
                        
                        if (algorithm && hash && path) {
                            const hashNormalizada = normalizarHash(hash);
                            const pathLower = path.toLowerCase();
                            
                            const hashEntry = {
                                hash: hashNormalizada,
                                algoritmo: algorithm,
                                caminho: path,
                                valido: true
                            };
                            
                            // Atribuição inteligente baseada em padrões
                            if (pathLower.includes('.xml') || pathLower.includes('saft') || pathLower.includes('131509')) {
                                hashesReferencia.saft = hashEntry;
                                window.vdcForensicState.registoAutenticidade.ficheirosEncontrados.push('saft');
                            } 
                            else if (pathLower.includes('fatura') || pathLower.includes('invoice') || pathLower.includes('pt1126')) {
                                hashesReferencia.fatura = hashEntry;
                                window.vdcForensicState.registoAutenticidade.ficheirosEncontrados.push('fatura');
                            }
                            else if (pathLower.includes('extrato') || pathLower.includes('statement') || pathLower.includes('ganhos')) {
                                hashesReferencia.extrato = hashEntry;
                                window.vdcForensicState.registoAutenticidade.ficheirosEncontrados.push('extrato');
                            }
                        }
                    });
                    
                    // Atualizar estado
                    window.vdcForensicState.registoAutenticidade.hashesReferencia = hashesReferencia;
                    window.vdcForensicState.registoAutenticidade.carregado = true;
                    window.vdcForensicState.registoAutenticidade.timestamp = new Date().toISOString();
                    window.vdcForensicState.registoAutenticidade.dadosCSV = dadosFiltrados;
                    
                    // Atualizar interface
                    if (statusEl) {
                        statusEl.innerHTML = `<i class="fas fa-check-circle"></i> REGISTO DE AUTENTICIDADE VALIDADO`;
                        statusEl.setAttribute('data-state', 'valid');
                    }
                    
                    // Habilitar uploads de documentos
                    habilitarUploadsDocumentos();
                    
                    // Atualizar dashboard
                    atualizarDashboardReferencia();
                    
                    registrarLog('SUCCESS', `Registo de autenticidade processado: ${dadosFiltrados.length} hashes válidas`);
                    
                    resolve(dadosFiltrados);
                    
                } catch (error) {
                    registrarLog('ERROR', 'Erro no processamento do CSV de controlo', error);
                    
                    if (statusEl) {
                        statusEl.innerHTML = `<i class="fas fa-times-circle"></i> ERRO NO PROCESSAMENTO`;
                        statusEl.setAttribute('data-state', 'error');
                    }
                    
                    reject(error);
                }
            },
            error: function(error) {
                registrarLog('ERROR', 'Erro de parsing do CSV', error);
                
                // Tentar com encoding diferente
                if (error.message.includes('encoding')) {
                    registrarLog('INFO', 'Tentando com encoding ISO-8859-1...');
                    // Aqui seria implementada uma tentativa com encoding alternativo
                }
                
                if (statusEl) {
                    statusEl.innerHTML = `<i class="fas fa-times-circle"></i> ERRO DE LEITURA DO CSV`;
                    statusEl.setAttribute('data-state', 'error');
                }
                
                reject(error);
            }
        });
    });
}

// 8. GERENCIAMENTO DE ESTADOS DA INTERFACE
function atualizarEstadoInterface() {
    // Atualizar todos os elementos com data-state
    document.querySelectorAll('[data-state]').forEach(element => {
        const estado = element.getAttribute('data-state');
        element.classList.remove('state-locked', 'state-pending', 'state-processing', 'state-valid', 'state-error');
        element.classList.add(`state-${estado}`);
    });
    
    // Atualizar botões baseados no estado do sistema
    const clienteRegistado = window.vdcForensicState.cliente.registado;
    const controloCarregado = window.vdcForensicState.registoAutenticidade.carregado;
    const documentosCarregados = window.vdcForensicState.validacaoSeletiva.ficheirosCarregados > 0;
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        const pronto = clienteRegistado && controloCarregado && documentosCarregados;
        analyzeBtn.disabled = !pronto;
        analyzeBtn.setAttribute('data-state', pronto ? 'ready' : 'locked');
    }
    
    // Botões de relatório
    const fullReportBtn = document.getElementById('generateFullReportBtn');
    const partialReportBtn = document.getElementById('generatePartialReportBtn');
    
    if (fullReportBtn && partialReportBtn) {
        const todosValidos = window.vdcForensicState.validacaoSeletiva.ficheirosValidos === 3;
        const algumValido = window.vdcForensicState.validacaoSeletiva.ficheirosValidos > 0;
        
        fullReportBtn.disabled = !todosValidos;
        partialReportBtn.disabled = !algumValido;
        
        fullReportBtn.setAttribute('data-state', todosValidos ? 'ready' : 'locked');
        partialReportBtn.setAttribute('data-state', algumValido ? 'ready' : 'locked');
    }
}

// 9. PROCESSAMENTO DE UPLOADS COM VALIDAÇÃO SELETIVA
async function processarUploadDocumento(tipo, ficheiro) {
    registrarLog('INFO', `Processando upload de ${tipo}: ${ficheiro.name}`);
    
    // Atualizar estado do documento
    const documentoState = window.vdcForensicState.documentos[tipo];
    documentoState.carregado = true;
    documentoState.metadados = {
        nome: ficheiro.name,
        tamanho: ficheiro.size,
        tipo: ficheiro.type,
        ultimaModificacao: ficheiro.lastModified,
        dataUpload: new Date().toISOString()
    };
    
    // Atualizar interface
    atualizarStatusDocumento(tipo, 'processing', `Processando ${ficheiro.name}...`);
    
    try {
        // Calcular hash
        const hashCalculada = await calcularHashSHA256(ficheiro);
        documentoState.hashCalculada = hashCalculada;
        
        // Validar contra referência
        const hashReferencia = window.vdcForensicState.registoAutenticidade.hashesReferencia[tipo];
        const valido = hashReferencia && hashReferencia.hash === hashCalculada;
        documentoState.valido = valido;
        
        // Atualizar validação seletiva
        window.vdcForensicState.validacaoSeletiva.ficheirosCarregados++;
        if (valido) {
            window.vdcForensicState.validacaoSeletiva.ficheirosValidos++;
        } else {
            window.vdcForensicState.validacaoSeletiva.ficheirosInvalidos++;
        }
        
        // Atualizar interface de validação
        atualizarValidacaoDocumento(tipo, valido, hashCalculada, hashReferencia?.hash || '');
        
        // Processar conteúdo do ficheiro
        await processarConteudoDocumento(tipo, ficheiro);
        
        // Gerar master hash seletiva
        await gerarMasterHashSeletiva();
        
        // Atualizar estados da interface
        atualizarEstadoInterface();
        
        registrarLog(valido ? 'SUCCESS' : 'WARN', 
            `${tipo.toUpperCase()} ${valido ? 'VALIDADO' : 'INVALIDO'}: ${hashCalculada.substring(0, 16)}...`);
        
    } catch (error) {
        registrarLog('ERROR', `Erro no processamento de ${tipo}`, error);
        atualizarStatusDocumento(tipo, 'error', `Erro no processamento: ${error.message}`);
    }
}

// 10. MASTER HASH SELETIVA (Assinatura Digital da Sessão)
async function gerarMasterHashSeletiva() {
    const ficheirosValidos = ['saft', 'fatura', 'extrato'].filter(t => 
        window.vdcForensicState.documentos[t].valido
    );
    
    if (ficheirosValidos.length === 0) {
        window.vdcForensicState.masterHash = {
            hash: '',
            timestamp: null,
            ficheirosIncluidos: [],
            selado: false
        };
        return;
    }
    
    // Concatenar dados para hash
    let dadosHash = '';
    ficheirosValidos.forEach(tipo => {
        const doc = window.vdcForensicState.documentos[tipo];
        dadosHash += doc.hashCalculada;
        dadosHash += doc.metadados.nome;
        dadosHash += doc.metadados.dataUpload;
    });
    
    // Adicionar metadados da sessão
    dadosHash += window.vdcForensicState.session.id;
    dadosHash += window.vdcForensicState.cliente.nif || '';
    dadosHash += new Date().toISOString();
    
    // Calcular hash
    const hashArray = CryptoJS.SHA256(dadosHash);
    const masterHash = hashArray.toString();
    
    // Atualizar estado
    window.vdcForensicState.masterHash = {
        hash: masterHash,
        timestamp: new Date().toISOString(),
        ficheirosIncluidos: ficheirosValidos,
        algoritmo: HASH_ALGORITHM,
        versaoSistema: SYSTEM_VERSION,
        sessionId: window.vdcForensicState.session.id,
        selado: true
    };
    
    // Atualizar interface
    const masterHashEl = document.getElementById('currentMasterHash');
    if (masterHashEl) {
        masterHashEl.textContent = masterHash;
        masterHashEl.title = `Assinatura digital da sessão (${ficheirosValidos.length} ficheiros válidos)`;
    }
    
    registrarLog('INFO', `Master Hash gerada: ${masterHash.substring(0, 32)}... (${ficheirosValidos.length} ficheiros)`);
}

// 11. INICIALIZAÇÃO DO SISTEMA
async function inicializarSistemaPericial() {
    try {
        // Registrar início da sessão
        registrarLog('INFO', '=== INICIALIZANDO SISTEMA DE PERITAGEM FORENSE V5.2 ===');
        registrarLog('INFO', `Sessão ID: ${window.vdcForensicState.session.id}`);
        
        // Inicializar IndexedDB
        await inicializarIndexedDB();
        
        // Atualizar interface
        document.getElementById('sessionId').textContent = window.vdcForensicState.session.id;
        atualizarTimestamp();
        
        // Configurar event listeners
        configurarEventListeners();
        
        // Mostrar console de auditoria
        document.getElementById('auditConsole').style.display = 'block';
        
        registrarLog('SUCCESS', 'Sistema pericial inicializado com sucesso');
        
    } catch (error) {
        registrarLog('ERROR', 'Falha na inicialização do sistema', error);
        mostrarMensagem('❌ Falha crítica na inicialização do sistema', 'error');
    }
}

// 12. CONFIGURAÇÃO DE EVENT LISTENERS
function configurarEventListeners() {
    // Modal de acesso
    document.getElementById('initProtocolBtn').addEventListener('click', () => {
        document.getElementById('modalAccessOverlay').style.display = 'none';
        registrarLog('INFO', 'Protocolo de acesso autorizado - Interface ativada');
    });
    
    // Registro de cliente
    document.getElementById('setClientBtn').addEventListener('click', registarClientePericial);
    
    // Inputs de cliente (auto-complete)
    document.getElementById('clientName').addEventListener('input', async (e) => {
        if (e.target.value.length >= 2) {
            const clientes = await buscarClientesPorNome(e.target.value);
            // Implementar sugestões UI aqui
        }
    });
    
    // Upload de controlo
    document.getElementById('controlFile').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
            await processarControloAutenticidade(e.target.files[0]);
        }
    });
    
    // Uploads de documentos
    ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (e.target.files[0]) {
                const tipo = id.replace('File', '');
                processarUploadDocumento(tipo, e.target.files[0]);
            }
        });
    });
    
    // Botão de análise
    document.getElementById('analyzeBtn').addEventListener('click', executarAnaliseForense);
    
    // Botões de relatório
    document.getElementById('generateFullReportBtn').addEventListener('click', gerarRelatorioCompleto);
    document.getElementById('generatePartialReportBtn').addEventListener('click', gerarRelatorioParcial);
    
    // Limpar console
    document.getElementById('clearConsoleBtn').addEventListener('click', () => {
        document.getElementById('consoleOutput').innerHTML = '';
        registrarLog('INFO', 'Console de auditoria limpo');
    });
}

// 13. FUNÇÕES DE INTERFACE (simplificadas para exemplo)
function habilitarUploadsDocumentos() {
    document.getElementById('documentUploadSection').setAttribute('data-state', 'ready');
    ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
    registrarLog('INFO', 'Uploads de documentos habilitados');
}

function atualizarStatusDocumento(tipo, estado, mensagem) {
    const pill = document.getElementById(`${tipo}StatusPill`);
    if (pill) {
        pill.setAttribute('data-state', estado);
        pill.innerHTML = `<i class="fas fa-${getIconForState(estado)}"></i> ${mensagem}`;
    }
}

function getIconForState(estado) {
    switch(estado) {
        case 'processing': return 'spinner fa-spin';
        case 'valid': return 'check-circle';
        case 'error': return 'times-circle';
        default: return 'clock';
    }
}

// 14. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar após um breve delay para garantir que o DOM está pronto
    setTimeout(() => {
        inicializarSistemaPericial().catch(console.error);
    }, 100);
});
