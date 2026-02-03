// ============================================
// VDC UNIDADE DE PERITAGEM - SCRIPT v5.1 CORRIGIDO
// VERSÃO FINAL CONSOLIDADA - CORREÇÕES APLICADAS
// ============================================

// 1. OBJETO GLOBAL DE PERSISTÊNCIA
window.vdcStore = {
    // Referências do ficheiro de controlo
    referencia: {
        hashes: {
            saft: '',
            fatura: '',
            extrato: ''
        },
        ficheirosEncontrados: [],
        carregado: false,
        timestamp: '',
        dadosCSV: null
    },
    
    // Documentos do utilizador
    saft: null,
    extrato: null,
    fatura: null,
    
    // Hashes calculadas localmente
    hashesLocais: {
        saft: '',
        extrato: '',
        fatura: ''
    },
    
    // Estado de validação
    validado: {
        saft: false,
        fatura: false,
        extrato: false
    },
    
    // Configuração do cliente
    config: {
        cliente: '',
        nif: '',
        ano: '2025',
        plataforma: 'bolt',
        registado: false
    },
    
    // Análise
    analise: null,
    analiseEmCurso: false,
    analiseConcluida: false,
    timestampSelagem: '',
    
    // Master Hash final (calculada apenas sobre ficheiros carregados válidos)
    masterHash: '',
    masterHashFicheirosValidos: [],
    
    // Status das hashes de referência carregadas
    hashesReferenciaCarregadas: false,
    
    // Controle de validação seletiva
    validacaoSeletiva: {
        ficheirosCarregados: 0,
        ficheirosValidos: 0,
        todosValidos: false,
        mensagemValidacao: ''
    }
};

// 1.1. FUNÇÃO DE LIMPEZA DE ESTADO COMPLETA
function limparEstadoCompleto() {
    console.log('🧹 Executando limpeza completa do estado...');
    
    // Limpar estado de armazenamento global (exceto dados do cliente)
    const clienteBackup = window.vdcStore.config.cliente;
    const nifBackup = window.vdcStore.config.nif;
    const registadoBackup = window.vdcStore.config.registado;
    
    window.vdcStore = {
        referencia: {
            hashes: { saft: '', fatura: '', extrato: '' },
            ficheirosEncontrados: [],
            carregado: false,
            timestamp: '',
            dadosCSV: null
        },
        saft: null,
        extrato: null,
        fatura: null,
        hashesLocais: { saft: '', extrato: '', fatura: '' },
        validado: { saft: false, fatura: false, extrato: false },
        config: {
            cliente: clienteBackup,
            nif: nifBackup,
            ano: '2025',
            plataforma: 'bolt',
            registado: registadoBackup
        },
        analise: null,
        analiseEmCurso: false,
        analiseConcluida: false,
        timestampSelagem: '',
        masterHash: '',
        masterHashFicheirosValidos: [],
        hashesReferenciaCarregadas: false,
        validacaoSeletiva: {
            ficheirosCarregados: 0,
            ficheirosValidos: 0,
            todosValidos: false,
            mensagemValidacao: ''
        }
    };
    
    // Limpar interface
    limparEstadoVisual();
    
    // Resetar file inputs (exceto controlFile para permitir reupload)
    ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });
    
    // Desabilitar uploads de documentos
    desabilitarUploadsDocumentos();
    
    // Resetar dashboard
    const dashboard = document.getElementById('controlHashDashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
    
    // Resetar status messages
    ['saftStatus', 'invoiceStatus', 'statementStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<i class="fas fa-clock"></i> AGUARDANDO FICHEIRO DE CONTROLO...`;
            el.className = 'status-message';
        }
    });
    
    // Resetar previews
    ['saftPreview', 'invoicePreview', 'statementPreview'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Resetar análise
    const analysisSection = document.getElementById('analysisSection');
    const taxSection = document.getElementById('taxSection');
    const parecerTecnico = document.getElementById('parecerTecnico');
    const actionButtons = document.getElementById('actionButtons');
    
    if (analysisSection) analysisSection.style.display = 'none';
    if (taxSection) taxSection.style.display = 'none';
    if (parecerTecnico) parecerTecnico.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';
    
    // Resetar botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> EXECUTAR ANÁLISE FORENSE';
        analyzeBtn.classList.remove('ready');
    }
    
    // Resetar hash containers no dashboard
    ['hash-saft-container', 'hash-fatura-container', 'hash-extrato-container'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = 'none';
        }
    });
    
    const noFilesMsg = document.getElementById('no-files-message');
    if (noFilesMsg) noFilesMsg.style.display = 'block';
    
    mostrarMensagem('Estado limpo com sucesso. Pode iniciar nova análise.', 'info');
}

// 2. INICIALIZAÇÃO DO SISTEMA
function inicializarSistema() {
    console.log('⚖️ VDC SISTEMA DE PERITAGEM FORENSE v5.1 - VALIDAÇÃO SELETIVA');
    
    // Inicializar status messages
    inicializarStatusMessages();
    
    // Inicializar sistema de clientes
    inicializarSistemaClientes();
    
    // Mostrar modal inicial
    const modal = document.getElementById('modalOverlay');
    if (modal) {
        modal.style.display = 'flex';
        
        // Verificar se o botão existe antes de adicionar evento
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
                inicializarInterface();
            });
        } else {
            // Fallback: fechar modal automaticamente após 2 segundos
            setTimeout(function() {
                modal.style.display = 'none';
                inicializarInterface();
            }, 2000);
        }
    } else {
        // Se não houver modal, inicializar diretamente
        inicializarInterface();
    }
}

// 2.1 SISTEMA DE GESTÃO DE CLIENTES (INTEGRAÇÃO COM DIRETÓRIO LOCAL)
function inicializarSistemaClientes() {
    console.log('📁 Inicializando sistema de gestão de clientes...');
    
    // Configurar auto-complete para campos de cliente
    const clientNameInput = document.getElementById('clientName');
    const clientNIFInput = document.getElementById('clientNIF');
    
    if (clientNameInput) {
        clientNameInput.addEventListener('input', function() {
            if (this.value.length >= 2) {
                buscarClientesPorNome(this.value);
            }
        });
    }
    
    if (clientNIFInput) {
        clientNIFInput.addEventListener('input', function() {
            if (this.value.length >= 3) {
                buscarClientesPorNIF(this.value);
            }
        });
    }
    
    // Criar diretório se não existir
    verificarDiretorioClientes();
}

function verificarDiretorioClientes() {
    // Esta função seria implementada com Node.js/Electron
    // Para ambiente web, usamos localStorage como fallback
    console.log('📂 Sistema de clientes inicializado (modo web)');
}

function buscarClientesPorNome(nome) {
    // Implementação simplificada para ambiente web
    // Em produção, esta função faria busca no diretório C:\Peritagens\CLIENTES_VDC
    const clientes = carregarClientesDoStorage();
    const resultados = clientes.filter(cliente => 
        cliente.nome.toLowerCase().includes(nome.toLowerCase())
    );
    
    if (resultados.length > 0) {
        console.log('🔍 Clientes encontrados:', resultados);
        mostrarSugestoesClientes(resultados);
    }
}

function buscarClientesPorNIF(nif) {
    const clientes = carregarClientesDoStorage();
    const resultados = clientes.filter(cliente => 
        cliente.nif.includes(nif)
    );
    
    if (resultados.length > 0) {
        console.log('🔍 Clientes encontrados por NIF:', resultados);
        mostrarSugestoesClientes(resultados);
    }
}

function mostrarSugestoesClientes(clientes) {
    // Implementar interface de sugestões se necessário
    // Por enquanto apenas log
    console.log('💡 Sugestões de clientes:', clientes);
}

function carregarClientesDoStorage() {
    try {
        const clientesJSON = localStorage.getItem('vdc_clientes');
        return clientesJSON ? JSON.parse(clientesJSON) : [];
    } catch (e) {
        console.error('Erro ao carregar clientes:', e);
        return [];
    }
}

function guardarClienteNoStorage(nome, nif) {
    try {
        const clientes = carregarClientesDoStorage();
        
        // Verificar se cliente já existe
        const existe = clientes.some(cliente => 
            cliente.nif === nif || cliente.nome.toLowerCase() === nome.toLowerCase()
        );
        
        if (!existe) {
            clientes.push({
                id: Date.now(),
                nome: nome,
                nif: nif,
                dataRegisto: new Date().toISOString()
            });
            
            localStorage.setItem('vdc_clientes', JSON.stringify(clientes));
            console.log('💾 Cliente guardado no storage:', { nome, nif });
            
            // Em ambiente desktop, aqui seria feita a gravação no diretório C:\Peritagens\CLIENTES_VDC
            // gravarClienteNoDiretorioLocal(nome, nif);
        }
    } catch (e) {
        console.error('Erro ao guardar cliente:', e);
    }
}

function inicializarStatusMessages() {
    const statusIds = ['controlStatus', 'saftStatus', 'invoiceStatus', 'statementStatus'];
    statusIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.innerHTML.trim()) {
            el.innerHTML = `<i class="fas fa-clock"></i> AGUARDANDO PROCESSAMENTO`;
        }
    });
}

function inicializarInterface() {
    console.log('📱 Inicializando interface com validação seletiva...');
    configurarEventListeners();
    atualizarTimestamp();
    limparEstadoVisual();
    atualizarEstadoBotoes();
    
    // Desabilitar todos os uploads exceto o de controlo
    desabilitarUploadsDocumentos();
}

function configurarEventListeners() {
    console.log('🔗 Configurando event listeners...');
    
    // Cliente
    document.getElementById('setClientBtn')?.addEventListener('click', registarCliente);
    document.getElementById('yearSelect')?.addEventListener('change', (e) => {
        window.vdcStore.config.ano = e.target.value;
        document.getElementById('currentYear').textContent = e.target.value;
    });
    document.getElementById('platformSelect')?.addEventListener('change', (e) => {
        window.vdcStore.config.plataforma = e.target.value;
        const texto = e.target.options[e.target.selectedIndex].text;
        document.getElementById('currentPlatform').textContent = texto;
    });
    
    // === CORREÇÃO CRÍTICA 1: Upload do ficheiro de controlo ===
    // Garantir que o listener está sempre ativo, mesmo após registo de cliente
    const controlFileInput = document.getElementById('controlFile');
    if (controlFileInput) {
        // Remover listeners antigos para evitar duplicação
        const newInput = controlFileInput.cloneNode(true);
        controlFileInput.parentNode.replaceChild(newInput, controlFileInput);
        
        // Adicionar novo listener
        newInput.addEventListener('change', function(e) {
            console.log('📁 Ficheiro de controlo selecionado:', e.target.files[0]?.name);
            if (e.target.files[0]) {
                limparEstadoCompleto(); // Limpar estado anterior
                processarControloAutenticidade(e.target.files[0]);
            }
        });
        
        // Habilitar sempre o input de controlo (nunca deve ser disabled)
        newInput.disabled = false;
    }
    
    // Uploads de documentos (INICIALMENTE disabled)
    document.getElementById('saftFile')?.addEventListener('change', function(e) {
        if (e.target.files[0]) processarUpload('saft', e.target.files[0]);
    });
    document.getElementById('invoiceFile')?.addEventListener('change', function(e) {
        if (e.target.files[0]) processarUpload('invoice', e.target.files[0]);
    });
    document.getElementById('statementFile')?.addEventListener('change', function(e) {
        if (e.target.files[0]) processarUpload('statement', e.target.files[0]);
    });
    
    // Análise
    document.getElementById('analyzeBtn')?.addEventListener('click', executarAnaliseForense);
    
    // Botões de ação
    document.getElementById('generateReportBtn')?.addEventListener('click', gerarRelatorioPDFPericial);
    document.getElementById('saveReportBtn')?.addEventListener('click', guardarAnaliseCompletaComDisco);
    
    // Atualização periódica do estado
    setInterval(atualizarEstadoBotoes, 1000);
    
    console.log('✅ Event listeners configurados com sucesso');
}

function desabilitarUploadsDocumentos() {
    ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
    });
    
    const documentUploadSection = document.getElementById('documentUploadSection');
    if (documentUploadSection) {
        documentUploadSection.style.opacity = '0.5';
        documentUploadSection.style.pointerEvents = 'none';
    }
    
    document.querySelectorAll('.file-label.disabled').forEach(label => {
        label.classList.add('disabled');
        const span = label.querySelector('.lock-status');
        if (span) {
            span.innerHTML = '<i class="fas fa-lock"></i> AGUARDANDO CONTROLO';
        }
    });
}

// 3. PROCESSAR FICHEIRO DE CONTROLO DE AUTENTICIDADE - COM FILTRO DE RUÍDO
function processarControloAutenticidade(ficheiro) {
    console.log('📁 Processando ficheiro de controlo de autenticidade:', ficheiro.name);
    
    const statusEl = document.getElementById('controlStatus');
    if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> PROCESSANDO REGISTO DE AUTENTICIDADE (CSV)...`;
        statusEl.className = 'status-message processing';
    }
    
    Papa.parse(ficheiro, {
        header: true,
        skipEmptyLines: true,
        complete: function(resultados) {
            try {
                const dados = resultados.data;
                console.log('📊 Dados do ficheiro de controlo CSV:', dados);
                
                // Limpar referências anteriores
                window.vdcStore.referencia.hashes = { saft: '', fatura: '', extrato: '' };
                window.vdcStore.referencia.ficheirosEncontrados = [];
                window.vdcStore.hashesReferenciaCarregadas = false;
                
                // Processar cada linha do CSV
                dados.forEach(linha => {
                    const algorithm = linha.Algorithm || '';
                    const hash = linha.Hash || '';
                    const path = linha.Path || linha.Arquivo || '';
                    
                    if (algorithm && hash && path) {
                        // Normalização
                        const hashLimpo = normalizarHash(hash);
                        const pathLimpo = (path || '').replace(/"/g, '').toLowerCase().trim();
                        
                        // === FILTRO DE RUÍDO: EXCLUSÃO DE AUTO-REFERÊNCIA ===
                        if (pathLimpo.includes('controlo_autenticidade') || 
                            pathLimpo.includes('controle_autenticidade') ||
                            pathLimpo.includes('autenticidade_vdc')) {
                            console.log(`⏭️ FILTRO DE RUÍDO: Ignorando ficheiro de controlo: ${pathLimpo}`);
                            return; // Não processar auto-referência
                        }
                        
                        // ATRIBUIÇÃO SILENCIOSA
                        if (pathLimpo.includes('.csv') || pathLimpo.includes('131509') || pathLimpo.includes('saft')) {
                            window.vdcStore.referencia.hashes.saft = hashLimpo;
                            window.vdcStore.referencia.ficheirosEncontrados.push('saft');
                        } 
                        else if (pathLimpo.includes('fatura') || pathLimpo.includes('pt1126') || pathLimpo.includes('invoice')) {
                            window.vdcStore.referencia.hashes.fatura = hashLimpo;
                            window.vdcStore.referencia.ficheirosEncontrados.push('fatura');
                        } 
                        else if (pathLimpo.includes('ganhos') || pathLimpo.includes('extrato') || pathLimpo.includes('statement')) {
                            window.vdcStore.referencia.hashes.extrato = hashLimpo;
                            window.vdcStore.referencia.ficheirosEncontrados.push('extrato');
                        }
                    }
                });
                
                console.log('📋 Ficheiros encontrados no controlo:', window.vdcStore.referencia.ficheirosEncontrados);
                
                // Verificar se as 3 hashes foram carregadas
                const todasHashesCarregadas = 
                    window.vdcStore.referencia.hashes.saft !== '' && 
                    window.vdcStore.referencia.hashes.fatura !== '' && 
                    window.vdcStore.referencia.hashes.extrato !== '';
                
                window.vdcStore.hashesReferenciaCarregadas = todasHashesCarregadas;
                window.vdcStore.referencia.carregado = true;
                window.vdcStore.referencia.timestamp = new Date().toISOString();
                window.vdcStore.referencia.dadosCSV = dados;
                
                // Atualizar interface
                if (statusEl) {
                    statusEl.innerHTML = `<i class="fas fa-check-circle"></i> REGISTO DE AUTENTICIDADE CARREGADO (CSV)`;
                    statusEl.className = 'status-message status-success';
                }
                
                // Mostrar dashboard vazio
                const dashboardEl = document.getElementById('controlHashDashboard');
                if (dashboardEl) {
                    dashboardEl.style.display = 'block';
                    const anyLoaded = 
                        window.vdcStore.hashesLocais.saft || 
                        window.vdcStore.hashesLocais.fatura || 
                        window.vdcStore.hashesLocais.extrato;
                    
                    document.getElementById('no-files-message').style.display = 
                        anyLoaded ? 'none' : 'block';
                }
                
                // Habilitar uploads de documentos (DESBLOQUEIO)
                habilitarUploadsDocumentos();
                
                // Mostrar mensagem
                if (todasHashesCarregadas) {
                    mostrarMensagem('✅ Registo de autenticidade carregado com sucesso!', 'success');
                } else {
                    mostrarMensagem(`⚠️ Algumas hashes não foram encontradas no CSV`, 'warning');
                }
                
                atualizarEstadoBotoes();
                
            } catch (erro) {
                console.error('Erro ao processar ficheiro de controlo CSV:', erro);
                mostrarMensagem('❌ Erro no processamento do ficheiro CSV de controlo', 'error');
                if (statusEl) {
                    statusEl.innerHTML = `<i class="fas fa-times-circle"></i> ERRO NO PROCESSAMENTO CSV`;
                    statusEl.className = 'status-message status-error';
                }
            }
        },
        error: function(erro) {
            console.error('Erro PapaParse no ficheiro de controlo CSV:', erro);
            mostrarMensagem('❌ Erro de leitura do ficheiro CSV', 'error');
            const statusEl = document.getElementById('controlStatus');
            if (statusEl) {
                statusEl.innerHTML = `<i class="fas fa-times-circle"></i> ERRO DE LEITURA DO CSV`;
                statusEl.className = 'status-message status-error';
            }
        }
    });
}

function normalizarHash(hash) {
    if (!hash) return '';
    
    return hash.toString()
               .replace(/"/g, '')
               .replace(/\s+/g, '')
               .toLowerCase()
               .trim();
}

function atualizarDashboardFicheiroCarregado(tipo, nomeFicheiro, valido) {
    const containerId = `hash-${tipo}-container`;
    const container = document.getElementById(containerId);
    const statusElement = document.getElementById(`hash-${tipo}-status`);
    const hashElement = document.getElementById(`hash-${tipo}-ref`);
    
    if (container && statusElement && hashElement) {
        container.style.display = 'block';
        document.getElementById('no-files-message').style.display = 'none';
        
        if (valido) {
            statusElement.textContent = '✓ VÁLIDO';
            statusElement.style.backgroundColor = '#10b981';
            statusElement.style.color = 'white';
            hashElement.textContent = nomeFicheiro || 'Hash válida';
            hashElement.style.color = '#10b981';
        } else {
            statusElement.textContent = '✗ INVÁLIDO';
            statusElement.style.backgroundColor = '#ef4444';
            statusElement.style.color = 'white';
            
            const hashReferencia = window.vdcStore.referencia.hashes[tipo];
            const hashLocal = window.vdcStore.hashesLocais[tipo];
            
            if (!hashReferencia) {
                hashElement.textContent = 'Ficheiro não consta no controlo';
                hashElement.style.color = '#f59e0b';
            } else if (hashLocal && hashReferencia) {
                hashElement.textContent = `Hash divergente (${hashLocal.substring(0, 8)}... ≠ ${hashReferencia.substring(0, 8)}...)`;
                hashElement.style.color = '#ef4444';
            } else {
                hashElement.textContent = 'Hash não calculada';
                hashElement.style.color = '#94a3b8';
            }
        }
    }
}

function habilitarUploadsDocumentos() {
    const documentUploadSection = document.getElementById('documentUploadSection');
    
    if (documentUploadSection && window.vdcStore.referencia.carregado) {
        documentUploadSection.style.opacity = '1';
        documentUploadSection.style.pointerEvents = 'auto';
        documentUploadSection.classList.add('active');
        
        ['saftFile', 'invoiceFile', 'statementFile'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = false;
        });
        
        document.querySelectorAll('.file-label.disabled').forEach(label => {
            label.classList.remove('disabled');
            label.style.background = 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)';
            const span = label.querySelector('.lock-status');
            if (span) {
                span.innerHTML = '<i class="fas fa-unlock"></i> PRONTO PARA CARREGAR';
            }
            const icon = label.querySelector('i.fa-cloud-upload-alt');
            if (icon) icon.style.color = 'white';
        });
        
        mostrarMensagem('✅ Registo de autenticidade carregado. Pode agora carregar os documentos fiscais.', 'success');
    }
}

// 4. REGISTO DE CLIENTE - ATUALIZADO COM INTEGRAÇÃO LOCAL
function registarCliente() {
    const nome = document.getElementById('clientName')?.value?.trim() || '';
    const nif = document.getElementById('clientNIF')?.value?.trim() || '';
    
    if (!nome || nome.length < 3) {
        mostrarMensagem('⚠️ Insira um nome de cliente válido', 'warning');
        return;
    }
    
    if (nif && !/^\d{9}$/.test(nif)) {
        mostrarMensagem('⚠️ NIF inválido. Deve conter 9 dígitos.', 'warning');
        return;
    }
    
    window.vdcStore.config.cliente = nome;
    window.vdcStore.config.nif = nif || 'Não especificado';
    window.vdcStore.config.registado = true;
    
    // === CORREÇÃO 2: Guardar cliente no sistema ===
    guardarClienteNoStorage(nome, nif);
    
    const statusEl = document.getElementById('clientStatus');
    const currentEl = document.getElementById('currentClient');
    
    if (statusEl && currentEl) {
        statusEl.style.display = 'block';
        currentEl.textContent = nome;
        statusEl.className = 'status-message status-success';
        statusEl.innerHTML = `<i class="fas fa-user-check"></i> CLIENTE REGISTADO: <strong>${nome}</strong> | NIF: ${nif || 'N/D'}`;
    }
    
    document.getElementById('analysisClient').textContent = nome;
    document.getElementById('taxClient').textContent = nome;
    
    mostrarMensagem(`✅ Cliente "${nome}" registado com sucesso`, 'success');
    
    // NÃO DESABILITAR O INPUT DE CONTROLO - CORREÇÃO CRÍTICA
    // Manter sempre habilitado para permitir upload do CSV
    verificarEstadoPreAnalise();
}

// ... [RESTANTE DO CÓDIGO PERMANECE IDÊNTICO - MANTENDO FUNCIONALIDADES EXISTENTES] ...

// 21. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', inicializarSistema);
if (document.readyState !== 'loading') {
    setTimeout(inicializarSistema, 100);
}
