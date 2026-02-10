// ============================================
// VDC FORENSIC SYSTEM v11.8 - BIG DATA UNLEASHED
// Processamento Acumulativo Ilimitado
// ============================================

// 1. ESTADO DO SISTEMA - ARQUITETURA BIG DATA
const VDCSystem = {
    version: 'v11.8-BIG-DATA',
    sessionId: null,
    expertName: 'Dr. Eduardo',
    clientNIF: '517905450',
    expertiseYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    
    // MOTOR DE BIG DATA ACUMULATIVO (MODO APPEND)
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, period: '' }, hashes: {}, totalSize: 0 },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0 }, hashes: {}, totalSize: 0 },
        invoices: { files: [], parsedData: [], totals: { 
            commission: 0, 
            iva23: 0, 
            invoiceValue: 0,
            invoicesFound: [],
            invoiceNumbers: []
        }, hashes: {}, totalSize: 0},
        statements: { files: [], parsedData: [], totals: { 
            transfer: 0, 
            expected: 0,
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0
        }, hashes: {}, totalSize: 0}
    },
    
    analysis: {
        extractedValues: {
            // Valores acumulativos
            saftGross: 0,
            saftIVA6: 0,
            saftNet: 0,
            
            rendimentosBrutos: 0,
            comissaoApp: 0,
            rendimentosLiquidos: 0,
            faturaPlataforma: 0,
            
            diferencialCusto: 0,
            prejuizoFiscal: 0,
            ivaAutoliquidacao: 0,
            
            // Juros RGRC dinâmico (4% baseado no ano)
            jurosRGRC: 0,
            
            // Risco Regulatório
            taxaRegulacao: 0,
            riscoRegulatorioTotal: 0
        },
        
        crossings: {
            deltaA: 0,
            deltaB: 0,
            omission: 0,
            diferencialAlerta: false,
            riscoRegulatorioAtivo: false,
            fraudIndicators: []
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
        logs: [],
        charts: {
            evolution: null,
            distribution: null
        },
        
        // Contadores acumulativos
        totalFiles: 0,
        totalSize: 0,
        processingQueue: []
    }
};

// 2. INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', () => {
    inicializarSistemaBigData();
});

function inicializarSistemaBigData() {
    try {
        console.log('🚀 VDC Forensic System v11.8 Big Data Unleashed - Inicializando...');
        
        // Configurar ano de peritagem (2018-2036)
        const yearSelect = document.getElementById('expertiseYear');
        if (yearSelect) {
            yearSelect.innerHTML = '';
            for (let year = 2018; year <= 2036; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === VDCSystem.expertiseYear) {
                    option.selected = true;
                }
                yearSelect.appendChild(option);
            }
            
            yearSelect.addEventListener('change', (e) => {
                VDCSystem.expertiseYear = parseInt(e.target.value);
                const yearDisplay = document.getElementById('currentYearDisplay');
                if (yearDisplay) yearDisplay.textContent = VDCSystem.expertiseYear;
                logAudit(`📅 Ano de peritagem alterado: ${VDCSystem.expertiseYear}`, 'info');
                calcularJurosRGRCDinamico();
            });
        }
        
        // Configurar plataforma
        const platformSelect = document.getElementById('selPlatform');
        if (platformSelect) {
            platformSelect.value = VDCSystem.selectedPlatform;
            platformSelect.addEventListener('change', (e) => {
                VDCSystem.selectedPlatform = e.target.value;
                logAudit(`🔄 Plataforma alterada: ${e.target.options[e.target.selectedIndex].text}`, 'info');
            });
        }
        
        // Configurar identificação do perito
        const expertNameInput = document.getElementById('expertName');
        if (expertNameInput) {
            expertNameInput.value = VDCSystem.expertName;
            expertNameInput.addEventListener('change', (e) => {
                VDCSystem.expertName = e.target.value.trim();
                logAudit(`👤 Perito atualizado: ${VDCSystem.expertName}`, 'info');
            });
        }
        
        const clientNIFInput = document.getElementById('clientNIF');
        if (clientNIFInput) {
            clientNIFInput.value = VDCSystem.clientNIF;
            clientNIFInput.addEventListener('change', (e) => {
                const nif = e.target.value.trim();
                if (/^\d{9}$/.test(nif)) {
                    VDCSystem.clientNIF = nif;
                    logAudit(`📋 NIF cliente atualizado: ${VDCSystem.clientNIF}`, 'info');
                }
            });
        }
        
        // Configurar relógio
        iniciarRelogio();
        
        // Configurar event listeners para uploads
        configurarEventListenersBigData();
        
        // Gerar sessão
        VDCSystem.sessionId = gerarIdSessaoBigData();
        const sessionDisplay = document.getElementById('sessionIdDisplay');
        if (sessionDisplay) sessionDisplay.textContent = VDCSystem.sessionId;
        
        // Atualizar display do ano atual
        const yearDisplay = document.getElementById('currentYearDisplay');
        if (yearDisplay) yearDisplay.textContent = VDCSystem.expertiseYear;
        
        logAudit('✅ Sistema Big Data Unleashed inicializado', 'success');
        logAudit('🔧 Modo APPEND ativo: Processamento acumulativo ilimitado', 'bigdata');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarErro(`Falha na inicialização: ${error.message}`);
    }
}

// 3. ACESSO AO DASHBOARD (Sem bloqueios)
function acessarDashboard() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (splashScreen && loadingOverlay) {
            splashScreen.style.opacity = '0';
            
            setTimeout(() => {
                splashScreen.style.display = 'none';
                loadingOverlay.style.display = 'flex';
                
                // Iniciar carregamento rápido
                atualizarProgressoCarregamento(30);
                
                setTimeout(() => {
                    atualizarProgressoCarregamento(70);
                    
                    setTimeout(() => {
                        atualizarProgressoCarregamento(100);
                        
                        setTimeout(() => {
                            // Mostrar dashboard
                            loadingOverlay.style.display = 'none';
                            const mainContainer = document.getElementById('mainContainer');
                            if (mainContainer) {
                                mainContainer.style.display = 'block';
                                setTimeout(() => {
                                    mainContainer.classList.add('visible');
                                }, 50);
                            }
                            
                            logAudit('🚀 Dashboard Big Data acessado', 'success');
                            logAudit('📊 Modo APPEND: Os ficheiros serão acumulados', 'bigdata');
                            logAudit('⚡ Pronto para processamento ilimitado', 'info');
                            
                            // Mostrar alerta de Big Data
                            const alertBigData = document.getElementById('alertBigData');
                            if (alertBigData) {
                                alertBigData.style.display = 'flex';
                                setTimeout(() => {
                                    alertBigData.style.display = 'none';
                                }, 5000);
                            }
                            
                        }, 300);
                    }, 300);
                }, 300);
            }, 500);
        }
        
    } catch (error) {
        console.error('Erro ao acessar dashboard:', error);
        mostrarErro(`Erro ao acessar dashboard: ${error.message}`);
    }
}

function atualizarProgressoCarregamento(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

// 4. RELÓGIO
function iniciarRelogio() {
    function atualizarDataHora() {
        const agora = new Date();
        
        const dataString = agora.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const horaString = agora.toLocaleTimeString('pt-PT', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const dataElement = document.getElementById('currentDate');
        const horaElement = document.getElementById('currentTime');
        
        if (dataElement) dataElement.textContent = dataString;
        if (horaElement) horaElement.textContent = horaString;
    }
    
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);
}

// 5. CONFIGURAÇÃO DE EVENT LISTENERS (MODO APPEND)
function configurarEventListenersBigData() {
    // Upload de ficheiros - MODO APPEND
    const dac7File = document.getElementById('dac7File');
    if (dac7File) {
        dac7File.addEventListener('change', (e) => manipularUploadBigData(e, 'dac7'));
    }
    
    const saftFile = document.getElementById('saftFile');
    if (saftFile) {
        saftFile.addEventListener('change', (e) => manipularUploadBigData(e, 'saft'));
    }
    
    const invoiceFile = document.getElementById('invoiceFile');
    if (invoiceFile) {
        invoiceFile.addEventListener('change', (e) => manipularUploadBigData(e, 'invoices'));
    }
    
    const statementFile = document.getElementById('statementFile');
    if (statementFile) {
        statementFile.addEventListener('change', (e) => manipularUploadBigData(e, 'statements'));
    }
    
    // Botão de análise
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', executarAnaliseBigData);
    }
}

// 6. MANIPULAÇÃO DE UPLOADS BIG DATA (MODO APPEND)
function manipularUploadBigData(event, tipo) {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const ficheiros = Array.from(event.target.files);
    const totalAntes = VDCSystem.documents[tipo].files.length;
    
    logAudit(`📁 ${ficheiros.length} novos ficheiros ${tipo.toUpperCase()} para processamento APPEND`, 'bigdata');
    
    // Adicionar à fila de processamento
    ficheiros.forEach(ficheiro => {
        VDCSystem.analysis.processingQueue.push({ ficheiro, tipo });
    });
    
    // Processar em lote assíncrono
    processarFilaBigData();
}

async function processarFilaBigData() {
    if (VDCSystem.analysis.processingQueue.length === 0) return;
    
    const item = VDCSystem.analysis.processingQueue.shift();
    const { ficheiro, tipo } = item;
    
    try {
        // Adicionar à cadeia de custódia
        adicionarCadeiaCustodiaBigData(ficheiro, tipo);
        
        // Adicionar ao array de ficheiros (APPEND)
        VDCSystem.documents[tipo].files.push(ficheiro);
        
        // Atualizar tamanho total
        VDCSystem.documents[tipo].totalSize += ficheiro.size;
        VDCSystem.analysis.totalSize += ficheiro.size;
        VDCSystem.analysis.totalFiles++;
        
        // Processar ficheiro
        const texto = await lerFicheiroComoTexto(ficheiro);
        const hashFicheiro = CryptoJS.SHA256(texto).toString();
        VDCSystem.documents[tipo].hashes[ficheiro.name] = hashFicheiro;
        
        // Extrair dados
        const dadosExtraidos = extrairDadosPorTipo(texto, ficheiro.name, tipo);
        
        if (dadosExtraidos) {
            VDCSystem.documents[tipo].parsedData.push({
                nomeFicheiro: ficheiro.name,
                hash: hashFicheiro,
                dados: dadosExtraidos,
                timestamp: new Date().toISOString()
            });
            
            logAudit(`✅ APPEND: ${ficheiro.name} processado | Hash: ${hashFicheiro.substring(0, 16)}...`, 'success');
        }
        
        // Atualizar contadores em tempo real
        atualizarContadoresBigData();
        
        // Processar próximo item da fila
        if (VDCSystem.analysis.processingQueue.length > 0) {
            setTimeout(() => processarFilaBigData(), 100);
        } else {
            logAudit(`📊 Processamento APPEND concluído | Total: ${VDCSystem.analysis.totalFiles} ficheiros`, 'bigdata');
            gerarMasterHashBigData();
        }
        
    } catch (error) {
        console.error(`Erro no processamento APPEND ${ficheiro.name}:`, error);
        logAudit(`❌ Erro no processamento APPEND ${ficheiro.name}: ${error.message}`, 'error');
        
        // Continuar com próximo item mesmo em erro
        if (VDCSystem.analysis.processingQueue.length > 0) {
            setTimeout(() => processarFilaBigData(), 100);
        }
    }
}

function adicionarCadeiaCustodiaBigData(ficheiro, tipo) {
    const registoCustodia = {
        id: CryptoJS.SHA256(Date.now() + ficheiro.name + tipo).toString().substring(0, 16),
        nomeFicheiro: ficheiro.name,
        tipoFicheiro: tipo,
        tamanho: ficheiro.size,
        dataUpload: new Date().toISOString(),
        perito: VDCSystem.expertName,
        hash: 'em processamento',
        modo: 'APPEND'
    };
    
    VDCSystem.analysis.chainOfCustody.push(registoCustodia);
    return registoCustodia.id;
}

function extrairDadosPorTipo(texto, nomeFicheiro, tipo) {
    try {
        switch(tipo) {
            case 'dac7':
                return extrairDadosDAC7(texto, nomeFicheiro);
            case 'saft':
                return extrairDadosSAFT(texto, nomeFicheiro);
            case 'invoices':
                return extrairDadosFatura(texto, nomeFicheiro);
            case 'statements':
                return extrairDadosExtrato(texto, nomeFicheiro);
            default:
                return null;
        }
    } catch (error) {
        console.error(`Erro na extração ${tipo}:`, error);
        return { erro: error.message };
    }
}

// 7. FUNÇÕES DE EXTRAÇÃO (Otimizadas para Big Data)
function extrairDadosDAC7(texto, nomeFicheiro) {
    const dados = { nomeFicheiro, receitasAnuais: 0, periodo: '' };
    
    try {
        const padraoReceitas = /(?:receitas anuais|annual revenue|total revenue)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi;
        const correspondencia = texto.match(padraoReceitas);
        if (correspondencia) {
            dados.receitasAnuais = parseNumeroBigData(correspondencia[0].match(/[\d\.,]+/)[0]);
        }
    } catch (error) {
        dados.erro = error.message;
    }
    
    return dados;
}

function extrairDadosSAFT(texto, nomeFicheiro) {
    const dados = { nomeFicheiro, valorBruto: 0, valorIVA6: 0, valorLiquido: 0 };
    
    try {
        const padraoBruto = /<GrossTotal>([\d\.,]+)<\/GrossTotal>/i;
        const padraoLiquido = /<NetTotal>([\d\.,]+)<\/NetTotal>/i;
        
        const bruto = texto.match(padraoBruto);
        const liquido = texto.match(padraoLiquido);
        
        if (bruto) dados.valorBruto = parseNumeroBigData(bruto[1]);
        if (liquido) dados.valorLiquido = parseNumeroBigData(liquido[1]);
    } catch (error) {
        dados.erro = error.message;
    }
    
    return dados;
}

function extrairDadosFatura(texto, nomeFicheiro) {
    const dados = { nomeFicheiro, valorFatura: 0, valorComissao: 0 };
    
    try {
        // Padrões genéricos para Big Data
        const padroesValor = [
            /(?:total|valor|amount)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi,
            /Total.*?:.*?([\d\.,]+)\s*(?:€|EUR)/gi
        ];
        
        let todosValores = [];
        padroesValor.forEach(padrao => {
            let correspondencia;
            while ((correspondencia = padrao.exec(texto)) !== null) {
                const valor = parseNumeroBigData(correspondencia[1]);
                if (valor > 0) todosValores.push(valor);
            }
        });
        
        if (todosValores.length > 0) {
            dados.valorFatura = Math.max(...todosValores);
        }
        
        // Comissão
        const padraoComissao = /(?:comissão|commission|fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi;
        let todasComissoes = [];
        let correspondencia;
        while ((correspondencia = padraoComissao.exec(texto)) !== null) {
            const valor = parseNumeroBigData(correspondencia[1]);
            if (valor > 0) todasComissoes.push(valor);
        }
        
        if (todasComissoes.length > 0) {
            dados.valorComissao = Math.max(...todasComissoes);
        }
        
    } catch (error) {
        dados.erro = error.message;
    }
    
    return dados;
}

function extrairDadosExtrato(texto, nomeFicheiro) {
    const dados = { nomeFicheiro, rendimentosBrutos: 0, comissao: 0, transferenciaLiquida: 0 };
    
    try {
        // Rendimentos brutos
        const padraoRendimentos = /(?:rendimentos|earnings|bruto)[\s:]*[€\$\s]*([\d\.,]+)\s*(?:€|EUR)/gi;
        let correspondencia;
        if ((correspondencia = padraoRendimentos.exec(texto)) !== null) {
            dados.rendimentosBrutos = parseNumeroBigData(correspondencia[1]);
        }
        
        // Comissão (negativa)
        const padraoComissao = /(?:comissão|commission|fee)[\s:]*[€\$\s-]*([\d\.,]+)\s*(?:€|EUR)/gi;
        if ((correspondencia = padraoComissao.exec(texto)) !== null) {
            dados.comissao = -parseNumeroBigData(correspondencia[1]);
        }
        
    } catch (error) {
        dados.erro = error.message;
    }
    
    return dados;
}

function parseNumeroBigData(stringNumero) {
    if (!stringNumero) return 0;
    const limpo = stringNumero.toString().replace(/[€\$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : Math.abs(numero);
}

// 8. ATUALIZAÇÃO DE CONTADORES BIG DATA
function atualizarContadoresBigData() {
    // Contadores por tipo
    const contadores = {
        dac7: VDCSystem.documents.dac7.files.length,
        saft: VDCSystem.documents.saft.files.length,
        invoices: VDCSystem.documents.invoices.files.length,
        statements: VDCSystem.documents.statements.files.length
    };
    
    // Atualizar displays
    Object.entries(contadores).forEach(([tipo, quantidade]) => {
        const contadorElement = document.getElementById(`${tipo}Counter`);
        if (contadorElement) {
            contadorElement.textContent = `${quantidade} ficheiros`;
        }
    });
    
    // Total geral
    const totalCount = document.getElementById('totalCount');
    if (totalCount) {
        totalCount.textContent = VDCSystem.analysis.totalFiles;
    }
    
    // Tamanho total
    const totalSize = document.getElementById('totalSize');
    const filesProcessed = document.getElementById('filesProcessed');
    const kpiProcessados = document.getElementById('kpiProcessados');
    
    if (totalSize) {
        const tamanhoMB = (VDCSystem.analysis.totalSize / (1024 * 1024)).toFixed(1);
        totalSize.textContent = `${tamanhoMB} MB`;
    }
    
    if (filesProcessed) {
        filesProcessed.textContent = VDCSystem.analysis.totalFiles;
    }
    
    if (kpiProcessados) {
        const tamanhoMB = (VDCSystem.analysis.totalSize / (1024 * 1024)).toFixed(1);
        kpiProcessados.textContent = `${tamanhoMB} MB`;
    }
    
    // KPIs
    const kpiFaturas = document.getElementById('kpiFaturas');
    if (kpiFaturas) {
        kpiFaturas.textContent = VDCSystem.documents.invoices.files.length;
    }
}

// 9. ANÁLISE BIG DATA ACUMULATIVA
async function executarAnaliseBigData() {
    try {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ANALISANDO BIG DATA...';
        }
        
        logAudit('🚀 INICIANDO ANÁLISE BIG DATA ACUMULATIVA', 'bigdata');
        
        // Processar dados acumulados
        processarDadosAcumulados();
        
        // Calcular valores extraídos
        calcularValoresAcumulados();
        
        // Realizar cruzamentos
        realizarCruzamentosAcumulados();
        
        // Calcular juros RGRC dinâmico
        calcularJurosRGRCDinamico();
        
        // Atualizar interface com requestAnimationFrame
        requestAnimationFrame(() => {
            atualizarDashboardBigData();
            atualizarGraficosBigData();
            gerarMasterHashBigData();
        });
        
        logAudit('✅ ANÁLISE BIG DATA CONCLUÍDA', 'success');
        logAudit(`📊 Total processado: ${VDCSystem.analysis.totalFiles} ficheiros`, 'info');
        logAudit(`💰 Diferencial acumulado: ${VDCSystem.analysis.extractedValues.diferencialCusto.toFixed(2)}€`, 'warn');
        
    } catch (error) {
        console.error('Erro na análise Big Data:', error);
        logAudit(`❌ Erro na análise Big Data: ${error.message}`, 'error');
    } finally {
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-bolt"></i> EXECUTAR ANÁLISE BIG DATA';
        }
    }
}

function processarDadosAcumulados() {
    // Processar SAF-T acumulado
    let totalBruto = 0, totalIVA6 = 0, totalLiquido = 0;
    VDCSystem.documents.saft.parsedData.forEach(item => {
        totalBruto += item.dados.valorBruto || 0;
        totalIVA6 += item.dados.valorIVA6 || 0;
        totalLiquido += item.dados.valorLiquido || 0;
    });
    VDCSystem.documents.saft.totals.gross = totalBruto;
    VDCSystem.documents.saft.totals.iva6 = totalIVA6;
    VDCSystem.documents.saft.totals.net = totalLiquido;
    
    // Processar faturas acumuladas
    let totalValorFatura = 0, totalComissao = 0;
    VDCSystem.documents.invoices.parsedData.forEach(item => {
        totalValorFatura += item.dados.valorFatura || 0;
        totalComissao += item.dados.valorComissao || 0;
    });
    VDCSystem.documents.invoices.totals.invoiceValue = totalValorFatura;
    VDCSystem.documents.invoices.totals.commission = totalComissao;
    VDCSystem.documents.invoices.totals.iva23 = totalComissao * 0.23;
    
    // Processar extratos acumulados
    const totaisExtratos = VDCSystem.documents.statements.totals;
    totaisExtratos.rendimentosBrutos = 0;
    totaisExtratos.comissaoApp = 0;
    totaisExtratos.rend
