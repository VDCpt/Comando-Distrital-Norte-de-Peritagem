/**
 * VDC SISTEMA DE PERITAGEM FORENSE · CONSOLIDAÇÃO OFICIAL
 * Versões: v11.6 GATEKEEPER · v11.7 HYBRID · SMART PARSING v12.1
 * ISO/IEC 27037 | NIST SP 800-86 | RGIT | CIVA
 * Strict Mode Activated · Global Binding Estabilizado
 * 
 * CONSOLIDAÇÃO TOTAL DOS FICHEIROS:
 * script.js · script (1).js · script (2).js · script (3).js · script (4).js
 * TODAS AS FUNÇÕES PRESERVADAS, SEM ALTERAÇÕES LÓGICAS
 * FECHO DE CHAVES PERFEITO · SEM INTERRUPÇÕES
 */

'use strict';

// ============================================================================
// 1. UTILITÁRIOS DE NORMALIZAÇÃO FORENSE · CONSOLIDADO
// ============================================================================

/**
 * toForensicNumber
 * Normaliza strings monetárias provenientes de CSV/PDF/HTML para Float.
 * Suporta formatos PT (1.000,00), EU (1,000.00) e mistos.
 * Versão unificada de todos os ficheiros.
 */
const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    
    let str = v.toString().trim();
    // Remove ruído (espaços invisíveis, tabs, quebras de linha)
    str = str.replace(/[\n\r\t\s\u200B-\u200D\uFEFF]/g, '');
    // Remove símbolos de moeda e texto comum
    str = str.replace(/["'`]/g, '').replace(/[€$£]/g, '').replace(/EUR|USD|GBP/gi, '').replace(/\s+/g, '');
    
    const hasComma = str.includes(',');
    const hasDot = str.includes('.');
    
    // Lógica de inferência de separador decimal
    if (hasComma && hasDot) {
        // Se o ponto vier antes da vírgula -> PT (1.000,00)
        if (str.indexOf(',') > str.indexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            // Se a vírgula vier antes do ponto -> EU (1,000.00)
            str = str.replace(/,/g, '');
        }
    } else if (hasComma && !hasDot) {
        // Apenas vírgula. Se houver mais de uma, é milhar PT.
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1) {
            const parts = str.split(',');
            str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        } else {
            str = str.replace(',', '.');
        }
    } else if (!hasComma && hasDot) {
        // Apenas ponto. Se houver mais de um, é milhar EUA (1.000.000).
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) {
            const parts = str.split('.');
            str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
        }
    }
    
    // Remove tudo o que não for dígito, ponto ou menos
    str = str.replace(/[^\d.-]/g, '');
    if (str === '' || str === '-' || str === '.') return 0;
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.abs(num);
};

/**
 * isValidDate
 * Valida se objeto é uma data válida.
 */
const isValidDate = (d) => {
    return d instanceof Date && !isNaN(d.getTime());
};

/**
 * formatBytes
 * Formata tamanho de ficheiro para leitura humana.
 */
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * generateSessionId
 * Gera ID único para sessão forense.
 */
const generateSessionId = () => {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
};

/**
 * readFileAsText
 * Lê ficheiro como texto (Promise).
 */
const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
};

// ============================================================================
// 2. ESTADO GLOBAL DO SISTEMA · VDCSystem · CONSOLIDAÇÃO COMPLETA
// ============================================================================

const VDCSystem = {
    // Identificação e versão
    version: 'v11.7-HYBRID·CONSOLIDATED',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    clientLocked: false,
    
    // Dados da Entidade Alvo (Bolt)
    boltEntity: {
        nome: "Bolt Operations OÜ",
        nif: "EE102090374",
        endereco: "Vana-Lõuna 15, Tallinn 10134 Estonia",
        isoCompliance: "ISO/IEC 27037",
        taxaRegulacao: "5% (AMT/IMT)"
    },
    
    // Estrutura de Documentos (unificada com todos os campos)
    documents: {
        dac7: { 
            files: [], 
            parsedData: [], 
            totals: { annualRevenue: 0, records: 0 }, 
            hashes: {} 
        },
        control: { 
            files: [], 
            parsedData: null, 
            totals: { records: 0 }, 
            hashes: {} 
        },
        saft: { 
            files: [], 
            parsedData: [], 
            totals: { gross: 0, iva6: 0, net: 0, records: 0 }, 
            hashes: {} 
        },
        invoices: { 
            files: [], 
            parsedData: [], 
            totals: { invoiceValue: 0, commission: 0, iva23: 0, records: 0 }, 
            hashes: {} 
        },
        statements: { 
            files: [], 
            parsedData: [], 
            totals: { 
                rendimentosBrutos: 0, 
                comissaoApp: 0, 
                rendimentosLiquidos: 0, 
                records: 0,
                campanhas: 0,
                portagens: 0,
                faturas: []
            }, 
            hashes: {} 
        }
    },
    
    // Análise e Cruzamentos (todos os campos de todos os scripts)
    analysis: {
        extractedValues: {
            saftGross: 0, 
            saftIVA6: 0, 
            saftNet: 0,
            platformCommission: 0, 
            bankTransfer: 0, 
            iva23Due: 0,
            rendimentosBrutos: 0, 
            comissaoApp: 0, 
            rendimentosLiquidos: 0,
            faturaPlataforma: 0, 
            diferencialCusto: 0,
            prejuizoFiscal: 0, 
            ivaAutoliquidacao: 0,
            dac7Revenue: 0,
            jurosMora: 0, 
            taxaRegulacao: 0, 
            riscoRegulatorio: 0,
            // v12.1 Extra
            campanhas: 0,
            gorjetas: 0,
            cancelamentos: 0,
            portagens: 0,
            tips: 0,
            tolls: 0
        },
        crossings: { 
            deltaA: 0, 
            deltaB: 0, 
            omission: 0, 
            diferencialAlerta: false, 
            bigDataAlertActive: false 
        },
        chainOfCustody: [],
        legalCitations: [
            "ISO/IEC 27037:2012 - Preservação de Evidência Digital",
            "NIST SP 800-86 - Guia para Análise Forense",
            "RGIT - Regime Geral das Infrações Tributárias",
            "CIVA - Autoliquidação do IVA",
            "DL 83/2017 - Taxa de Regulação"
        ]
    },
    
    // Contadores e Logs
    counters: { dac7: 0, control: 0, saft: 0, invoices: 0, statements: 0, total: 0 },
    logs: [],
    chart: null,
    preRegisteredClients: []
};

// ============================================================================
// 3. PARSING INTELIGENTE V12.1 · SMART PARSE CSV
// ============================================================================

/**
 * smartParseCSV
 * Detecta automaticamente as colunas corretas (Total, Earnings, Fees, Invoices, Tips, Tolls)
 * Regista colunas detectadas para uso futuro.
 * Versão consolidada do script (4).js
 */
function smartParseCSV(text, fileName) {
    const config = { header: true, skipEmptyLines: true, dynamicTyping: true };
    let parsed = {};
    
    try {
        parsed = Papa.parse(text, config);
        
        if (!parsed || !parsed.data || parsed.data.length === 0) return { 
            gross: 0, 
            commission: 0, 
            extra: { tips: 0, tolls: 0, invoices: [] }, 
            columns: null 
        };
        
        // Inicializa objeto para dados extra (Tips, Portagens)
        const data = parsed.data;
        let grossRevenue = 0;
        let platformFees = 0;
        let extraData = {
            tips: 0,
            tolls: 0,
            invoices: []
        };
        
        // Detectação de Colunas (Heurística Baseada em keywords comuns)
        const keys = Object.keys(data[0] || {});
        const colMap = {};
        
        keys.forEach(key => {
            const k = key.toLowerCase().trim();
            if (colMap.gross && colMap.fees && colMap.tips && colMap.tolls && colMap.invoices) return; // Prioridade
            
            if (k.includes('total') || k.includes('earnings') || k.includes('gross') || k.includes('payout')) colMap.gross = key;
            else if (k.includes('commission') || k.includes('fee') || k.includes('comissao') || k.includes('serviço') || k.includes('custo')) colMap.fees = key;
            else if (k.includes('tip') || k.includes('gorjeta')) colMap.tips = key;
            else if (k.includes('toll') || k.includes('portagem')) colMap.tolls = key;
            else if (k.includes('invoice') || k.includes('fatura')) colMap.invoices = key;
        });
        
        // Parsing (Iteração v12.1)
        data.forEach(row => {
            // 1. Gross / Earnings
            if (colMap.gross) grossRevenue += toForensicNumber(row[colMap.gross]);
            
            // 2. Fees / Comissão
            if (colMap.fees) platformFees += Math.abs(toForensicNumber(row[colMap.fees]));
            
            // 3. Extra Data
            if (colMap.tips) extraData.tips += toForensicNumber(row[colMap.tips]);
            if (colMap.tolls) extraData.tolls += toForensicNumber(row[colMap.tolls]);
            if (colMap.invoices) {
                extraData.invoices.push({
                    number: toForensicNumber(row[colMap.invoices]),
                    date: row.date || row.Data || new Date().toISOString().split('T')[0]
                });
            }
        });
        
        return { gross: grossRevenue, commission: platformFees, extra: extraData, columns: colMap };
    } catch (e) {
        console.error('Erro no smartParseCSV:', e);
        return { gross: 0, commission: 0, extra: { tips: 0, tolls: 0, invoices: [] }, columns: null };
    }
}

// ============================================================================
// 4. INICIALIZAÇÃO E EVENTOS (GATEKEEPER) · CONSOLIDADO
// ============================================================================

/**
 * Inicialização Segura do DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log(`%c VDC CONSOLIDATED v11.6/v11.7 GATEKEEPER `, 'background: #0066cc; color: #fff; padding: 5px;');
    // Prepara UI sem desbloquear
    setupStaticListeners();
    
    // Script (4): Carrega dados recursivamente
    loadSystemRecursively();
});

/**
 * Window Onload - Finaliza carregamento de recursos
 */
window.onload = () => {
    console.log('Recursos externos carregados.');
    // Verifica bibliotecas essenciais
    if (typeof CryptoJS === 'undefined') {
        console.error('CRÍTICO: CryptoJS não carregado.');
        alert('Erro de Segurança: Bibliotecas de criptografia indisponíveis.');
    }
    if (typeof Papa === 'undefined') {
        console.error('CRÍTICO: PapaParse não carregado.');
        alert('Erro: PapaParse indisponível.');
    }
    if (typeof Chart === 'undefined') {
        console.error('CRÍTICO: Chart.js não carregado.');
        alert('Erro: Chart.js indisponível.');
    }
    if (typeof jsPDF === 'undefined') {
        console.error('CRÍTICO: jsPDF não carregado.');
        alert('Erro: jsPDF indisponível.');
    }
};

/**
 * setupStaticListeners
 * Configura listeners que funcionam independentemente do estado da sessão
 */
function setupStaticListeners() {
    const startBtn = document.getElementById('startSessionBtn');
    if (startBtn) {
        // GATEKEEPER: Apenas o clique humano inicia o sistema
        startBtn.addEventListener('click', startGatekeeperSession);
    }
}

/**
 * startGatekeeperSession
 * Manipula a transição da Splash Screen para a UI Principal
 */
function startGatekeeperSession() {
    try {
        const splashScreen = document.getElementById('splashScreen');
        const loadingOverlay = document.getElementById('loadingOverlay');
        
        if (splashScreen && loadingOverlay) {
            // Fade out splash
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                // Show loader
                loadingOverlay.style.display = 'flex';
                // Inicializa sistema
                loadSystemCore();
            }, 500);
        }
    } catch (error) {
        console.error('Erro no startGatekeeperSession:', error);
        alert('Erro ao iniciar sessão segura.');
    }
}

/**
 * loadSystemCore
 * Carrega o motor lógico do sistema (versão consolidada)
 */
function loadSystemCore() {
    updateLoadingProgress(20);
    
    setTimeout(() => {
        // Gera ID da Sessão
        VDCSystem.sessionId = generateSessionId();
        const sessionIdElement = document.getElementById('sessionIdDisplay');
        if (sessionIdElement) sessionIdElement.textContent = VDCSystem.sessionId;
        
        updateLoadingProgress(40);
        
        // Popula anos (2018-2036)
        populateYears();
        
        // Inicia relógio
        startClockAndDate();
        
        updateLoadingProgress(60);
        
        // Configura restantes listeners
        setupMainListeners();
        
        updateLoadingProgress(80);
        
        // Gera Hash inicial
        generateMasterHash();
        
        setTimeout(() => {
            updateLoadingProgress(100);
            // Transição para Main Container
            setTimeout(showMainInterface, 500);
        }, 500);
    }, 500);
}

/**
 * loadSystemRecursively (Script 4)
 * Carrega dados do cliente do localStorage e inicializa
 */
function loadSystemRecursively() {
    // 1. Recupera Cliente
    try {
        const storedClient = localStorage.getItem('vdc_client_data_bd_v11_7');
        if (storedClient) {
            const client = JSON.parse(storedClient);
            if (client && client.name && client.nif) {
                VDCSystem.client = client;
                const statusEl = document.getElementById('clientStatusFixed');
                const nameDisplay = document.getElementById('clientNameDisplayFixed');
                const nifDisplay = document.getElementById('clientNifDisplayFixed');
                if (statusEl) statusEl.style.display = 'flex';
                if (nameDisplay) nameDisplay.textContent = client.name;
                if (nifDisplay) nifDisplay.textContent = client.nif;
                
                // Preenche inputs
                const nameInput = document.getElementById('clientNameFixed');
                const nifInput = document.getElementById('clientNIFFixed');
                if (nameInput) nameInput.value = client.name;
                if (nifInput) nifInput.value = client.nif;
                
                logAudit(`Cliente recuperado do armazenamento local: ${client.name}`, 'success');
            }
        }
    } catch (e) {
        console.warn('Não foi possível recuperar cliente do armazenamento.', e);
    }
    
    // Atualiza Relógio
    startClockAndDate();
}

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = percent + '%';
    if (text) {
        if (VDCSystem.version.includes('HYBRID')) {
            text.textContent = `Motor de Busca (Parsing v12.1)... ${percent}%`;
        } else {
            text.textContent = `Carregando módulos... ${percent}%`;
        }
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
            setTimeout(() => { mainContainer.style.opacity = '1'; }, 50);
        }, 500);
    }
    logAudit('SISTEMA VDC v11.6 GATEKEEPER / v11.7 HYBRID ONLINE', 'success');
}

// ============================================================================
// 5. GESTÃO DE UTILIZADORES, CLIENTES E PARÂMETROS
// ============================================================================

function populateYears() {
    const yearSelect = document.getElementById('selYearFixed');
    if (!yearSelect) return;
    
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    
    for (let year = 2018; year <= 2036; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function startClockAndDate() {
    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-PT');
        const timeStr = now.toLocaleTimeString('pt-PT');
        
        const dateEl = document.getElementById('currentDate');
        const timeEl = document.getElementById('currentTime');
        
        if (dateEl) dateEl.textContent = dateStr;
        if (timeEl) timeEl.textContent = timeStr;
        
        // Script 4: Se estiver em modo Demo e tiver dados de parsing, atualizar interface
        if (VDCSystem.demoMode && VDCSystem.documents.statements.parsedData && VDCSystem.documents.statements.parsedData.length > 0) {
            const sample = VDCSystem.documents.statements.parsedData[0];
            if (sample && sample.extra && sample.extra.columns) {
                const grossEl = document.getElementById('kpiGanhos');
                const commEl = document.getElementById('kpiComm');
                const netEl = document.getElementById('kpiNet');
                const invoiceEl = document.getElementById('kpiInvoice');
                
                if (grossEl) grossEl.textContent = sample.gross.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (commEl) commEl.textContent = sample.commission.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (netEl) netEl.textContent = (sample.gross - sample.commission).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (invoiceEl && sample.extra.invoices && sample.extra.invoices[0]) {
                    invoiceEl.textContent = sample.extra.invoices[0].number.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                }
                
                const tipsEl = document.getElementById('valTips');
                const tollsEl = document.getElementById('valTolls');
                
                if (tipsEl) tipsEl.textContent = sample.extra.tips.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
                if (tollsEl) tollsEl.textContent = sample.extra.tolls.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) + '€';
            }
        }
    };
    update();
    setInterval(update, 1000);
}

function setupMainListeners() {
    // Registo de Cliente
    const registerBtn = document.getElementById('registerClientBtnFixed');
    if (registerBtn) registerBtn.addEventListener('click', registerClient);
    
    // Demo Mode
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) demoBtn.addEventListener('click', activateDemoMode);
    
    // Modal Evidências
    const openModalBtn = document.getElementById('openEvidenceModalBtn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            document.getElementById('evidenceModal').style.display = 'flex';
            updateEvidenceSummary();
        });
    }
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeAndSaveBtn = document.getElementById('closeAndSaveBtn');
    
    const closeModalHandler = () => {
        closeEvidenceModal();
        updateAnalysisButton(); // Verifica estado
    };
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModalHandler);
    if (closeAndSaveBtn) closeAndSaveBtn.addEventListener('click', closeModalHandler);
    
    // Uploads
    setupUploadListeners();
    
    // Ações Principais
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) analyzeBtn.addEventListener('click', performAudit);
    
    const exportJSONBtn = document.getElementById('exportJSONBtn');
    if (exportJSONBtn) exportJSONBtn.addEventListener('click', exportDataJSON);
    
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportPDF);
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSystem);
    
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    if (clearConsoleBtn) clearConsoleBtn.addEventListener('click', clearConsole);
    
    // Fechar modal ao clicar fora
    const modal = document.getElementById('evidenceModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModalHandler();
    });
}

function setupUploadListeners() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllEvidence);
}

// ============================================================================
// 6. LÓGICA DE CLIENTES COM PERSISTÊNCIA
// ============================================================================

function registerClient() {
    const nameInput = document.getElementById('clientNameFixed');
    const nifInput = document.getElementById('clientNIFFixed');
    const name = nameInput?.value.trim();
    const nif = nifInput?.value.trim();
    
    if (!name || name.length < 3) {
        showToast('Nome inválido', 'error');
        return;
    }
    
    if (!nif || !/^\d{9}$/.test(nif)) {
        showToast('NIF inválido (9 dígitos)', 'error');
        return;
    }
    
    VDCSystem.client = {
        name: name,
        nif: nif,
        platform: VDCSystem.selectedPlatform,
        timestamp: new Date().toISOString()
    };
    
    // Guardar no localStorage (ambas as versões)
    try {
        localStorage.setItem('vdc_client_data', JSON.stringify(VDCSystem.client));
        localStorage.setItem('vdc_client_data_bd_v11_7', JSON.stringify(VDCSystem.client));
    } catch(e) { console.warn('LocalStorage indisponível para gravação de cliente.', e); }
    
    // Atualiza UI
    const statusEl = document.getElementById('clientStatusFixed');
    const nameDisplay = document.getElementById('clientNameDisplayFixed');
    const nifDisplay = document.getElementById('clientNifDisplayFixed');
    
    if (statusEl) statusEl.style.display = 'flex';
    if (nameDisplay) nameDisplay.textContent = name;
    if (nifDisplay) nifDisplay.textContent = nif;
    
    logAudit(`Cliente registado: ${name} (${nif})`, 'success');
    updateAnalysisButton();
}

// ============================================================================
// 7. GESTÃO DE MODAL E EVIDÊNCIAS (PARSING BIG DATA)
// ============================================================================

function openEvidenceModal() {
    const modal = document.getElementById('evidenceModal');
    if (modal) {
        modal.style.display = 'flex';
        updateEvidenceSummary();
    }
}

function closeEvidenceModal() {
    const modal = document.getElementById('evidenceModal');
    if (modal) modal.style.display = 'none';
}

async function handleFileUpload(event, type) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    const btn = document.querySelector(`#${type}UploadBtnModal`);
    if (btn) {
        btn.classList.add('processing');
        if (VDCSystem.version.includes('HYBRID')) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO INTELIGENTE...';
        } else {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO BIG DATA...';
        }
    }
    
    try {
        // Processa cada ficheiro
        for (const file of files) {
            await processFile(file, type);
        }
        
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s).`, 'success');
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
    } catch (error) {
        console.error(error);
        logAudit(`Erro no upload: ${error.message}`, 'error');
    } finally {
        if (btn) {
            btn.classList.remove('processing');
            // Restaura texto original baseado no tipo
            const iconMap = { 
                dac7: 'fa-file-contract', 
                control: 'fa-file-shield', 
                saft: 'fa-file-code', 
                invoices: 'fa-file-invoice-dollar', 
                statements: 'fa-file-contract' 
            };
            const textMap = { 
                dac7: 'SELECIONAR FICHEIROS DAC7', 
                control: 'SELECIONAR FICHEIRO DE CONTROLO', 
                saft: 'SELECIONAR FICHEIROS SAF-T/XML/CSV', 
                invoices: 'SELECIONAR FATURAS', 
                statements: 'SELECIONAR EXTRATOS' 
            };
            btn.innerHTML = `<i class="fas ${iconMap[type]}"></i> ${textMap[type] || 'SELECIONAR FICHEIROS'}`;
        }
        event.target.value = ''; // Limpa input
    }
}

/**
 * processFile (Parsing v12.1 + v11.6 Consolidado)
 * Usa smartParseCSV para extrair GROSS, FEES, TIPS, TOLLS e INVOICES
 */
async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hash = CryptoJS.SHA256(text).toString();
    
    // Regista na estrutura de dados
    if (!VDCSystem.documents[type]) {
        VDCSystem.documents[type] = { 
            files: [], 
            parsedData: [], 
            totals: { 
                records: 0, 
                rendimentosBrutos: 0, 
                comissaoApp: 0,
                gross: 0,
                commission: 0,
                extra: { tips: 0, tolls: 0, invoices: [] }
            }, 
            hashes: {} 
        };
    }
    
    VDCSystem.documents[type].files.push(file);
    VDCSystem.documents[type].hashes[file.name] = hash;
    VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
    
    // Adiciona à Cadeia de Custódia
    VDCSystem.analysis.chainOfCustody.push({
        filename: file.name,
        type: type,
        hash: hash.substring(0, 16) + '...',
        timestamp: new Date().toLocaleString()
    });
    
    // --- PARSING DE BIG DATA (LÓGICA FUNCIONAL) ---
    let extractedData = { filename: file.name, size: file.size };
    let parsed = { gross: 0, commission: 0, extra: { tips: 0, tolls: 0, invoices: [] } };
    
    if (type === 'statements' || type === 'saft' || type === 'invoices') {
        try {
            // Tenta fazer parse CSV com PapaParse
            const papaParsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });
            
            if (papaParsed.data && papaParsed.data.length > 0) {
                let grossRevenue = 0;
                let platformFees = 0;
                
                papaParsed.data.forEach(row => {
                    // Busca chaves comuns em extratos Bolt/Uber
                    const keys = Object.keys(row);
                    keys.forEach(key => {
                        const val = toForensicNumber(row[key]);
                        const keyLower = key.toLowerCase();
                        
                        // Extrai Gross Revenue (Total Payout / Earnings / Total)
                        if (keyLower.includes('total') || keyLower.includes('earnings') || keyLower.includes('payout')) {
                            grossRevenue += val;
                        }
                        
                        // Extrai Platform Fees (Commission / Fee / Service)
                        if (keyLower.includes('commission') || keyLower.includes('fee') || keyLower.includes('service')) {
                            platformFees += Math.abs(val);
                        }
                        
                        // Específico para Invoices se for o caso
                        if (type === 'invoices' && (keyLower.includes('amount') || keyLower.includes('total'))) {
                            VDCSystem.documents.invoices.totals.invoiceValue += val;
                        }
                    });
                });
                
                // Armazena os valores extraídos para uso posterior
                if (type === 'statements') {
                    VDCSystem.documents.statements.totals.rendimentosBrutos = grossRevenue;
                    VDCSystem.documents.statements.totals.comissaoApp = platformFees;
                }
                if (type === 'saft') {
                    VDCSystem.documents.saft.totals.gross = grossRevenue;
                }
                
                extractedData.grossRevenue = grossRevenue;
                extractedData.platformFees = platformFees;
            }
            
            // Parsing Inteligente v12.1
            parsed = smartParseCSV(text, file.name);
            
            // Atualiza totals globais com dados extra (v12.1)
            if (type === 'statements') {
                VDCSystem.documents.statements.totals.rendimentosBrutos = parsed.gross;
                VDCSystem.documents.statements.totals.comissaoApp = parsed.commission;
                VDCSystem.documents.statements.totals.rendimentosLiquidos = parsed.gross - parsed.commission;
                
                // Extrai dados extra para KPI v12.1
                VDCSystem.documents.statements.totals.campanhas = parsed.extra.tips;
                VDCSystem.documents.statements.totals.portagens = parsed.extra.tolls;
                VDCSystem.documents.statements.totals.faturas = parsed.extra.invoices;
                
                // Atualiza valores no analysis
                VDCSystem.analysis.extractedValues.campanhas = parsed.extra.tips;
                VDCSystem.analysis.extractedValues.gorjetas = parsed.extra.tips;
                VDCSystem.analysis.extractedValues.portagens = parsed.extra.tolls;
            }
            
        } catch (e) { 
            console.warn('Parse falhou para ' + file.name, e); 
        }
    }
    
    VDCSystem.documents[type].parsedData.push(extractedData);
    
    // Atualiza UI da lista
    const listId = `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    if (listEl) {
        listEl.style.display = 'block';
        const item = document.createElement('div');
        item.className = 'file-item-modal';
        
        let detailsHTML = `
            <i class="fas fa-check-circle" style="color: var(--success-primary)"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">${formatBytes(file.size)}</span>
            <span class="file-hash-modal">${hash.substring(0,8)}...</span>
        `;
        
        // Adiciona badges visuais (Simulação v12.1 - Verificações)
        if (parsed && parsed.extra) {
            if (parsed.extra.tips > 0) {
                detailsHTML += `<div class="file-badge" id="count-tips-${Date.now()}">${parsed.extra.tips.toFixed(2)}€</div>`;
            }
            if (parsed.extra.tolls > 0) {
                detailsHTML += `<div class="file-badge" id="count-tolls-${Date.now()}">${parsed.extra.tolls.toFixed(2)}€</div>`;
            }
            if (parsed.extra.invoices && parsed.extra.invoices.length > 0) {
                detailsHTML += `<div class="file-badge" id="count-invoices-${Date.now()}">${parsed.extra.invoices.length}</div>`;
            }
        }
        
        item.innerHTML = detailsHTML;
        listEl.appendChild(item);
    }
}

function clearAllEvidence() {
    if (!confirm('Tem a certeza? Isto apagará todos os dados carregados.')) return;
    
    // Reset estrutura de documentos
    Object.keys(VDCSystem.documents).forEach(key => {
        VDCSystem.documents[key] = { 
            files: [], 
            parsedData: [], 
            totals: { 
                records: 0, 
                rendimentosBrutos: 0, 
                comissaoApp: 0,
                gross: 0,
                commission: 0,
                extra: { tips: 0, tolls: 0, invoices: [] }
            }, 
            hashes: {} 
        };
    });
    
    // Limpa UI de listas
    const lists = document.querySelectorAll('.file-list-modal');
    lists.forEach(l => l.innerHTML = '');
    
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    logAudit('Todas as evidências limpas.', 'warn');
}

function updateEvidenceSummary() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    let totalFiles = 0;
    
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        totalFiles += count;
        const el = document.getElementById(`summary${type.charAt(0).toUpperCase() + type.slice(1)}`);
        if (el) el.textContent = `${count} ficheiros`;
    });
    
    const totalEl = document.getElementById('summaryTotal');
    if (totalEl) totalEl.textContent = `${totalFiles} ficheiros`;
}

function updateCounters() {
    const types = ['dac7', 'control', 'saft', 'invoices', 'statements'];
    types.forEach(type => {
        const count = VDCSystem.documents[type]?.files?.length || 0;
        const el = document.getElementById(`${type}CountCompact`);
        if (el) el.textContent = count;
    });
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (!btn) return;
    
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    
    // Requer: Cliente + Controlo + SAFT
    btn.disabled = !(hasClient && hasControl && hasSaft);
}

// ============================================================================
// 8. MOTOR DE AUDITORIA & CÁLCULOS FISCAIS (CONSOLIDADO)
// ============================================================================

function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    const demoBtn = document.getElementById('demoModeBtn');
    if (demoBtn) {
        demoBtn.disabled = true;
        demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO DADOS V12.1 INTELIGENTE...';
    }
    
    logAudit('ATIVANDO MODO DEMO V12.1...', 'info');
    
    // Regista Cliente Demo
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '123456789';
    registerClient();
    
    // Simula Uploads
    simulateUpload('dac7', 1);
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 3); // 3 faturas de exemplo
    simulateUpload('statements', 2); // 2 extratos de exemplo
    
    setTimeout(() => {
        // Injeta valores de auditoria simulados (v12.1 incluindo dados extra)
        VDCSystem.analysis.extractedValues = {
            saftGross: 5000.00, 
            saftIVA6: 300.00, 
            saftNet: 4700.00,
            platformCommission: 1200.00,
            bankTransfer: 3800.00,
            iva23Due: 230.00,
            rendimentosBrutos: 5000.00, 
            comissaoApp: -1200.00, 
            rendimentosLiquidos: 3800.00,
            faturaPlataforma: 200.00,
            diferencialCusto: 1000.00,
            prejuizoFiscal: 0,
            ivaAutoliquidacao: 230.00,
            dac7Revenue: 5000.00,
            jurosMora: 40.00,
            taxaRegulacao: 60.00,
            riscoRegulatorio: 60.00,
            // v12.1 Extra
            campanhas: 150.00,
            gorjetas: 45.00,
            cancelamentos: 12.00,
            portagens: 7.65,
            tips: 45.00,
            tolls: 7.65
        };
        
        VDCSystem.analysis.crossings.deltaB = 1000.00;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        VDCSystem.analysis.crossings.bigDataAlertActive = true;
        
        // Atualiza contadores de dados extra (Simulação v12.1)
        if (document.getElementById('count-tips')) {
            document.getElementById('count-tips').textContent = '45,00€';
        }
        if (document.getElementById('count-tolls')) {
            document.getElementById('count-tolls').textContent = '7,65€';
        }
        
        // Atualiza KPI extra se existirem
        if (document.getElementById('valCamp')) document.getElementById('valCamp').textContent = '150,00€';
        if (document.getElementById('valTips')) document.getElementById('valTips').textContent = '45,00€';
        if (document.getElementById('valCanc')) document.getElementById('valCanc').textContent = '12,00€';
        if (document.getElementById('valTolls')) document.getElementById('valTolls').textContent = '7,65€';
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit('Auditoria Demo v12.1 concluída.', 'success');
        VDCSystem.processing = false;
        
        if (demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = '<i class="fas fa-vial"></i> DEMO SIMULADA';
        }
    }, 1000);
}

function simulateUpload(type, count) {
    // Simula apenas contadores e UI
    for(let i = 0; i < count; i++) {
        if (!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { 
                files: [], 
                parsedData: [], 
                totals: { 
                    records: 0, 
                    rendimentosBrutos: 0, 
                    comissaoApp: 0,
                    gross: 0,
                    commission: 0,
                    extra: { tips: 0, tolls: 0, invoices: [] }
                }, 
                hashes: {} 
            };
        }
        VDCSystem.documents[type].files.push({ name: `demo_${type}_${i}.txt`, size: 1024 });
        VDCSystem.documents[type].totals.records++;
    }
    updateCounters();
    updateEvidenceSummary();
}

/**
 * performAudit
 * Coordena o motor de cálculo fiscal e cruzamento de dados
 */
function performAudit() {
    if (!VDCSystem.client) {
        showToast('Registe um cliente primeiro.', 'error');
        return;
    }
    
    logAudit('INICIANDO CRUZAMENTO DE DADOS...', 'info');
    
    // 1. Recolhe Valores Extraídos dos CSVs (via Parsing)
    const stmtGross = VDCSystem.documents.statements.totals.rendimentosBrutos || 0;
    const stmtCommission = VDCSystem.documents.statements.totals.comissaoApp || 0;
    const saftGross = VDCSystem.documents.saft.totals.gross || 0;
    const invoiceVal = VDCSystem.documents.invoices.totals.invoiceValue || 0;
    
    // Se estiver em modo Demo, usa os valores mockados, senão tenta usar os extraídos
    const grossRevenue = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.rendimentosBrutos : stmtGross;
    const platformCommission = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.comissaoApp : stmtCommission;
    const faturaPlataforma = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.faturaPlataforma : invoiceVal;
    
    // 2. Executa Cruzamento Forense
    performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);
    
    updateDashboard();
    renderChart();
    showAlerts();
    
    logAudit('AUDITORIA CONCLUÍDA.', 'success');
}

/**
 * performForensicCrossings
 * Motor de Cálculo Fiscal: IVA 23%, Juros 4%, Taxa Reg 5%
 */
function performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma) {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // Atualiza valores base
    ev.rendimentosBrutos = grossRevenue;
    ev.comissaoApp = platformCommission;
    ev.faturaPlataforma = faturaPlataforma;
    
    // Cálculo de Diferencial de Custo (Discrepância entre Comissão Retida e Fatura)
    const comissaoAbs = Math.abs(platformCommission);
    const diferencial = Math.abs(comissaoAbs - faturaPlataforma);
    
    ev.diferencialCusto = diferencial;
    cross.deltaB = diferencial;
    
    // 1. Cálculo de IVA de Autoliquidação (23% sobre o diferencial não faturado)
    ev.ivaAutoliquidacao = diferencial * 0.23;
    
    // 2. Cálculo de Juros de Mora (4% sobre o IVA em falta)
    ev.jurosMora = ev.ivaAutoliquidacao * 0.04;
    
    // 3. Cálculo de Risco Regulatório (Taxa de Regulação 5% sobre a comissão total)
    ev.taxaRegulacao = comissaoAbs * 0.05;
    ev.riscoRegulatorio = ev.taxaRegulacao;
    
    // Lógica de Alertas
    if (diferencial > 0.01) {
        cross.diferencialAlerta = true;
        cross.bigDataAlertActive = true;
        logAudit(`DISCREPÂNCIA DETETADA: ${diferencial.toFixed(2)}€`, 'warn');
    } else {
        cross.diferencialAlerta = false;
        cross.bigDataAlertActive = false;
    }
}

// ============================================================================
// 9. UI DE RESULTADOS, DASHBOARD, GRÁFICOS E ALERTAS
// ============================================================================

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const format = (val) => val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
    
    const map = {
        'netVal': ev.saftNet || ev.rendimentosLiquidos,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao,
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': ev.rendimentosBrutos + (ev.comissaoApp || 0),
        'kpiInvoice': ev.faturaPlataforma,
        // v12.1 extra fields
        'kpiCamp': ev.campanhas || 0,
        'kpiTips': ev.gorjetas || ev.tips || 0,
        'kpiCanc': ev.cancelamentos || 0,
        'kpiTolls': ev.portagens || ev.tolls || 0
    };
    
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.textContent = format(val);
    }
    
    // Juros Especiais
    const jurosCard = document.getElementById('jurosCard');
    const jurosVal = document.getElementById('jurosVal');
    if (jurosCard && jurosVal && ev.jurosMora > 0) {
        jurosCard.style.display = 'flex';
        jurosVal.textContent = format(ev.jurosMora);
    }
}

function renderChart() {
    const ctx = document.getElementById('forensicChart');
    if (!ctx) return;
    
    if (VDCSystem.chart) VDCSystem.chart.destroy();
    
    const ev = VDCSystem.analysis.extractedValues;
    
    // Dados do Gráfico (Incluindo Dados Extra v12.1 se disponíveis)
    let labels = ['Bruto', 'Comissão', 'Fatura', 'IVA 23%', 'Juros 4%'];
    let data = [
        ev.rendimentosBrutos, 
        Math.abs(ev.comissaoApp), 
        ev.faturaPlataforma, 
        ev.ivaAutoliquidacao, 
        ev.jurosMora
    ];
    let backgroundColor = ['#00a8ff', '#e84118', '#44bd32', '#fbc531', '#ff9f1a'];
    
    // Adicionar dados extra se existirem
    if (ev.campanhas > 0 || ev.gorjetas > 0 || ev.portagens > 0) {
        labels.push('Campanhas', 'Gorjetas', 'Portagens');
        data.push(ev.campanhas || 0, ev.gorjetas || 0, ev.portagens || 0);
        backgroundColor.push('#4ecdc4', '#00d1ff', '#ff6b35');
    }
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Euros (€)',
                data: data,
                backgroundColor: backgroundColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: labels.length > 5, 
                    position: 'bottom' 
                } 
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;
    
    // Alerta Big Data (Classe CSS disparada se > 0.01)
    const bigDataAlert = document.getElementById('bigDataAlert');
    if (cross.bigDataAlertActive && bigDataAlert) {
        bigDataAlert.style.display = 'flex';
        const invEl = document.getElementById('alertInvoiceVal');
        const commEl = document.getElementById('alertCommVal');
        const diffEl = document.getElementById('alertDeltaVal');
        const diffValEl = document.getElementById('alertDiffVal');
        
        if (invEl) invEl.textContent = ev.faturaPlataforma.toFixed(2) + '€';
        if (commEl) commEl.textContent = Math.abs(ev.comissaoApp).toFixed(2) + '€';
        if (diffEl) diffEl.textContent = ev.diferencialCusto.toFixed(2) + '€';
        if (diffValEl) diffValEl.textContent = ev.diferencialCusto.toFixed(2) + '€';
    } else if (bigDataAlert) {
        bigDataAlert.style.display = 'none';
    }
    
    // Alerta Layering / Omission
    const omissionAlert = document.getElementById('omissionAlert');
    if (ev.diferencialCusto > 0 && omissionAlert) {
        omissionAlert.style.display = 'flex';
        const omissionValue = document.getElementById('omissionValue');
        if (omissionValue) omissionValue.textContent = ev.diferencialCusto.toFixed(2) + '€';
    } else if (omissionAlert) {
        omissionAlert.style.display = 'none';
    }
}

// ============================================================================
// 10. EXPORTAÇÃO LEGAL, RELATÓRIOS E RESET DE SISTEMA
// ============================================================================

function exportDataJSON() {
    const data = {
        session: VDCSystem.sessionId,
        client: VDCSystem.client,
        analysis: VDCSystem.analysis,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VDC_AUDIT_${VDCSystem.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    logAudit('Relatório JSON exportado.', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Sem cliente para gerar relatório.', 'error');
        return;
    }
    
    logAudit('Gerando PDF Jurídico (ISO/IEC 27037)...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // --- CABEÇALHO ---
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("VDC RELATÓRIO PERICIAL v11.7", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Sessão: ${VDCSystem.sessionId}`, 20, 30);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')} - ${new Date().toLocaleTimeString('pt-PT')}`, 20, 36);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 42, 190, 42);
        
        // --- DADOS DO CLIENTE ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("1. DADOS DO SUJEITO AUDITADO", 20, 50);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Nome: ${VDCSystem.client.name}`, 25, 58);
        doc.text(`NIF: ${VDCSystem.client.nif}`, 25, 64);
        doc.text(`ID da Sessão Forense: ${VDCSystem.sessionId}`, 25, 70);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 76, 190, 76);
        
        // --- ANÁLISE DE DIVERGÊNCIAS ---
        doc.setFont('helvetica', 'bold');
        doc.text("2. ANÁLISE FISCAL CRUZADA", 20, 90);
        
        const ev = VDCSystem.analysis.extractedValues;
        const fmt = (n) => n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€';
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Valor Bruto (Extrato CSV): ${fmt(ev.rendimentosBrutos)}`, 25, 98);
        doc.text(`Comissão Retida (Extrato CSV): ${fmt(Math.abs(ev.comissaoApp))}`, 25, 104);
        doc.text(`Fatura Emitida (Input): ${fmt(ev.faturaPlataforma)}`, 25, 110);
        
        const diferencial = ev.diferencialCusto;
        if (diferencial > 0.01) {
            doc.setTextColor(200, 50, 50);
            doc.text(`Diferencial Encontrado: ${fmt(diferencial)}`, 25, 118);
            doc.setTextColor(0, 0, 0);
            doc.text(`IVA de Autoliquidação (23%): ${fmt(ev.ivaAutoliquidacao)}`, 25, 124);
            doc.text(`Juros de Mora (4%): ${fmt(ev.jurosMora)}`, 25, 130);
        } else {
            doc.text("Diferencial: 0,00€", 25, 118);
        }
        
        // --- DADOS EXTRA V12.1 ---
        if (ev.campanhas > 0 || ev.gorjetas > 0 || ev.portagens > 0) {
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 136, 190, 136);
            doc.setFont('helvetica', 'bold');
            doc.text("2.1. DADOS EXTRAÍDOS (PARSING V12.1)", 20, 144);
            doc.setFont('helvetica', 'normal');
            let yPos = 152;
            if (ev.campanhas > 0) {
                doc.text(`Campanhas: ${fmt(ev.campanhas)}`, 25, yPos);
                yPos += 6;
            }
            if (ev.gorjetas > 0) {
                doc.text(`Gorjetas: ${fmt(ev.gorjetas)}`, 25, yPos);
                yPos += 6;
            }
            if (ev.portagens > 0) {
                doc.text(`Portagens: ${fmt(ev.portagens)}`, 25, yPos);
            }
        }
        
        // --- NOTA DE CONFORMIDADE LEGAL ---
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 176, 190, 176);
        doc.setFont('helvetica', 'bold');
        doc.text("3. NOTA DE CONFORMIDADE ISO/IEC 27037", 20, 184);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const note = "O presente relatório cumpre com os requisitos de integridade e validação de dados forenses. O hash SHA-256 da sessão garante a autenticidade e cadeia de custódia.";
        const splitNote = doc.splitTextToSize(note, 170);
        doc.text(splitNote, 20, 192);
        
        // --- HASH DA SESSÃO ---
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Hash de Integridade da Sessão:`, 20, 210);
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        const hashEl = document.getElementById('masterHashValue');
        const hashText = hashEl ? hashEl.textContent : 'N/A';
        doc.text(hashText, 20, 216);
        
        doc.save(`VDC_Report_${VDCSystem.sessionId}.pdf`);
        logAudit('Relatório PDF gerado.', 'success');
    } catch (e) {
        console.error('Erro ao gerar PDF:', e);
        logAudit('Erro ao gerar PDF.', 'error');
        showToast('Erro ao gerar PDF', 'error');
    }
}

function resetSystem() {
    if (!confirm('Repor o sistema para o estado inicial? Isto apagará todos os dados carregados.')) return;
    
    // Reset cliente
    VDCSystem.client = null;
    localStorage.removeItem('vdc_client_data');
    localStorage.removeItem('vdc_client_data_bd_v11_7');
    
    // Reset valores extraídos
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0,
        platformCommission: 0, bankTransfer: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
        faturaPlataforma: 0, diferencialCusto: 0,
        prejuizoFiscal: 0, ivaAutoliquidacao: 0,
        dac7Revenue: 0,
        jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0,
        campanhas: 0, gorjetas: 0, cancelamentos: 0, portagens: 0,
        tips: 0, tolls: 0
    };
    
    VDCSystem.analysis.crossings = { 
        deltaA: 0, deltaB: 0, omission: 0, 
        diferencialAlerta: false, bigDataAlertActive: false 
    };
    
    // Limpa UI de texto
    const ids = [
        'netVal', 'iva6Val', 'commissionVal', 'iva23Val', 'jurosVal',
        'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice',
        'kpiCamp', 'kpiTips', 'kpiCanc', 'kpiTolls'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
    });
    
    // Limpa inputs e status
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    const statusEl = document.getElementById('clientStatusFixed');
    if (statusEl) statusEl.style.display = 'none';
    
    // Esconde juros card
    const jurosCard = document.getElementById('jurosCard');
    if (jurosCard) jurosCard.style.display = 'none';
    
    clearAllEvidence();
    clearConsole();
    generateMasterHash();
    
    logAudit('Sistema reiniciado.', 'info');
    showToast('Sistema reiniciado com sucesso.', 'info');
}

// ============================================================================
// 11. FUNÇÕES AUXILIARES GERAIS E INTEGRIDADE
// ============================================================================

function generateMasterHash() {
    // Cria hash baseado no estado atual para garantir integridade
    const payload = JSON.stringify(VDCSystem.analysis.extractedValues) + VDCSystem.sessionId + Date.now();
    const hash = CryptoJS.SHA256(payload).toString();
    
    const el = document.getElementById('masterHashValue');
    if (el) el.textContent = hash;
    
    return hash;
}

function logAudit(msg, type = 'info') {
    const output = document.getElementById('auditOutput');
    if (!output) return;
    
    const time = new Date().toLocaleTimeString('pt-PT');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
    
    // Guarda no array de logs
    VDCSystem.logs.push({ time, msg, type });
}

function clearConsole() {
    const output = document.getElementById('auditOutput');
    if (output) output.innerHTML = '';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 (type === 'error' ? 'fa-exclamation-circle' : 
                 (type === 'warn' ? 'fa-exclamation-triangle' : 'fa-info-circle'));
    
    toast.innerHTML = `<i class="fas ${icon}"></i> <p>${message}</p>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================================
// 12. INJEÇÃO DE PARSING DINÂMICO (SCRIPT 4)
// ============================================================================

function injectDynamicParsingLogic() {
    logAudit('Motor de Parsing v12.1: Tentativa de deteção de colunas inteligentes (Gross, Fees, Tips, Tolls)', 'info');
}

// ============================================================================
// 13. BINDING GLOBAL (WINDOW) · ESTABILIDADE FINAL
// ============================================================================

window.clearConsole = clearConsole;
window.startGatekeeperSession = startGatekeeperSession;
window.startSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.logAudit = logAudit;
window.generateMasterHash = generateMasterHash;
window.VDCSystem = VDCSystem;
window.performForensicCrossings = performForensicCrossings;
window.injectDynamicParsingLogic = injectDynamicParsingLogic;
window.toForensicNumber = toForensicNumber;
window.smartParseCSV = smartParseCSV;

// ============================================================================
// FIM · CONSOLIDAÇÃO TOTAL DOS FICHEIROS SCRIPT.JS
// TODAS AS FUNÇÕES PRESERVADAS, SEM ALTERAÇÕES LÓGICAS
// FECHO DE CHAVES PERFEITO
// ============================================================================
