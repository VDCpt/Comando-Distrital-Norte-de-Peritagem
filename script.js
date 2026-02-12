/**
 * VDC SISTEMA DE PERITAGEM FORENSE v11.6 GATEKEEPER
 * Core Logic & Audit Controller
 * Strict Mode Activated
 * Includes: Big Data Parsing, Fiscal Engine, Global Binding
 */

'use strict';

// ==========================================
// 1. UTILITÁRIOS DE NORMALIZAÇÃO FORENSE
// ==========================================

/**
 * toForensicNumber
 * Normaliza strings monetárias provenientes de CSV/PDF/HTML para Float.
 * Suporta formatos PT (1.000,00), EU (1,000.00) e mistos.
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

const isValidDate = (d) => {
    return d instanceof Date && !isNaN(d.getTime());
};

// ==========================================
// 2. ESTADO GLOBAL DO SISTEMA (VDCSystem)
// ==========================================

const VDCSystem = {
    version: 'v11.6-GATEKEEPER',
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
    
    // Estrutura de Documentos
    documents: {
        dac7: { files: [], parsedData: [], totals: { annualRevenue: 0, records: 0 }, hashes: {} },
        control: { files: [], parsedData: null, totals: { records: 0 }, hashes: {} },
        saft: { files: [], parsedData: [], totals: { gross: 0, iva6: 0, net: 0, records: 0 }, hashes: {} },
        invoices: { files: [], parsedData: [], totals: { invoiceValue: 0, commission: 0, iva23: 0, records: 0 }, hashes: {} },
        statements: { files: [], parsedData: [], totals: { rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0, records: 0 }, hashes: {} }
    },
    
    // Análise e Cruzamentos
    analysis: {
        extractedValues: {
            saftGross: 0, saftIVA6: 0, saftNet: 0,
            platformCommission: 0, bankTransfer: 0, iva23Due: 0,
            rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
            faturaPlataforma: 0, diferencialCusto: 0,
            prejuizoFiscal: 0, ivaAutoliquidacao: 0,
            dac7Revenue: 0,
            jurosMora: 0, taxaRegulacao: 0, riscoRegulatorio: 0
        },
        crossings: { deltaA: 0, deltaB: 0, omission: 0, diferencialAlerta: false, bigDataAlertActive: false },
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

// ==========================================
// 3. INICIALIZAÇÃO E EVENTOS (GATEKEEPER)
// ==========================================

/**
 * Inicialização Segura do DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log(`%c VDC v11.6 GATEKEEPER INICIADO `, 'background: #0066cc; color: #fff; padding: 5px;');
    // Prepara UI sem desbloquear
    setupStaticListeners();
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
 * Carrega o motor lógico do sistema
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

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `Carregando módulos... ${percent}%`;
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
    logAudit('SISTEMA VDC v11.6 GATEKEEPER ONLINE', 'success');
}

// ==========================================
// 4. GESTÃO DE UTILIZADORES E DADOS
// ==========================================

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
    if (openModalBtn) openModalBtn.addEventListener('click', openEvidenceModal);
    
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

// ==========================================
// 5. LÓGICA DE CLIENTES
// ==========================================

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

// ==========================================
// 6. GESTÃO DE MODAL E EVIDÊNCIAS
// ==========================================

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
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO BIG DATA...';
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
            const iconMap = { dac7: 'fa-file-contract', control: 'fa-file-shield', saft: 'fa-file-code', invoices: 'fa-file-invoice-dollar', statements: 'fa-file-contract' };
            btn.innerHTML = `<i class="fas ${iconMap[type]}"></i> SELECIONAR FICHEIROS`;
        }
        event.target.value = ''; // Limpa input
    }
}

/**
 * processFile
 * Lógica de Parsing Big Data (PapaParse) e Extração de Valores
 */
async function processFile(file, type) {
    const text = await readFileAsText(file);
    const hash = CryptoJS.SHA256(text).toString();
    
    // Regista na estrutura de dados
    if (!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], parsedData: [], totals: {}, hashes: {} };
    
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
    
    if (type === 'statements' || type === 'saft' || type === 'invoices') {
        try {
            // Tenta fazer parse CSV
            const parsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });
            
            if (parsed.data && parsed.data.length > 0) {
                let grossRevenue = 0;
                let platformFees = 0;
                
                parsed.data.forEach(row => {
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
                        if (type === 'invoices' && keyLower.includes('amount') || keyLower.includes('total')) {
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
        } catch (e) {
            console.error('Erro no parse CSV:', e);
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
        item.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--success-primary)"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-status-modal">${formatBytes(file.size)}</span>
            <span class="file-hash-modal">${hash.substring(0,8)}...</span>
        `;
        listEl.appendChild(item);
    }
}

function clearAllEvidence() {
    if (!confirm('Tem a certeza? Isto apagará todos os dados carregados.')) return;
    
    // Reset estrutura de documentos
    Object.keys(VDCSystem.documents).forEach(key => {
        VDCSystem.documents[key] = { files: [], parsedData: [], totals: { records: 0, rendimentosBrutos: 0, comissaoApp: 0 }, hashes: {} };
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

// ==========================================
// 7. MOTOR DE AUDITORIA & CÁLCULOS FISCAIS
// ==========================================

function activateDemoMode() {
    if (VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;
    
    logAudit('ATIVANDO MODO DEMO...', 'info');
    
    // Regista Cliente Demo
    document.getElementById('clientNameFixed').value = 'Demo Corp, Lda';
    document.getElementById('clientNIFFixed').value = '123456789';
    registerClient();
    
    // Simula Uploads
    simulateUpload('dac7', 1);
    simulateUpload('control', 1);
    simulateUpload('saft', 1);
    simulateUpload('invoices', 1);
    simulateUpload('statements', 1);
    
    setTimeout(() => {
        // Injeta valores de auditoria simulados
        VDCSystem.analysis.extractedValues = {
            saftGross: 5000.00, saftIVA6: 300.00, saftNet: 4700.00,
            rendimentosBrutos: 5000.00, comissaoApp: -1200.00, rendimentosLiquidos: 3800.00,
            faturaPlataforma: 200.00, // Diferencial flagrante
            diferencialCusto: 1000.00,
            ivaAutoliquidacao: 230.00, // 23% de 1000
            jurosMora: 40.00, // 4% de 1000
            taxaRegulacao: 60.00 // 5% de 1200
        };
        
        VDCSystem.analysis.crossings.deltaB = 1000.00;
        VDCSystem.analysis.crossings.diferencialAlerta = true;
        
        updateDashboard();
        renderChart();
        showAlerts();
        
        logAudit('Auditoria Demo concluída.', 'success');
        VDCSystem.processing = false;
    },1000);
}

function simulateUpload(type, count) {
    // Simula apenas contadores e UI
    for(let i=0; i<count; i++) {
        if (!VDCSystem.documents[type]) VDCSystem.documents[type] = { files: [], parsedData: [], totals: { records: 0, rendimentosBrutos: 0, comissaoApp: 0 }, hashes: {} };
        VDCSystem.documents[type].files.push({ name: `demo_${type}_${i}.txt` });
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
    // Para garantir funcionamento visual se o parser for simples:
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
    // Se a plataforma retém 1000€ de comissão, mas só fatura 200€, há 800€ em risco.
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

// ==========================================
// 8. UI DE RESULTADOS & ALERTAS
// ==========================================

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const format = (val) => val.toLocaleString('pt-PT', { minimumFractionDigits:2, maximumFractionDigits:2 }) + '€';
    
    const map = {
        'netVal': ev.saftNet,
        'iva6Val': ev.saftIVA6,
        'commissionVal': ev.comissaoApp,
        'iva23Val': ev.ivaAutoliquidacao,
        'kpiGanhos': ev.rendimentosBrutos,
        'kpiComm': ev.comissaoApp,
        'kpiNet': (ev.rendimentosBrutos + ev.comissaoApp), // Líquido Aproximado
        'kpiInvoice': ev.faturaPlataforma
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
    
    const data = {
        labels: ['Bruto', 'Comissão', 'Fatura', 'IVA 23%', 'Juros 4%'],
        datasets: [{
            label: 'Euros (€)',
            data: [ev.rendimentosBrutos, Math.abs(ev.comissaoApp), ev.faturaPlataforma, ev.ivaAutoliquidacao, ev.jurosMora],
            backgroundColor: ['#00a8ff', '#e84118', '#44bd32', '#fbc531', '#ff9f1a'],
            borderWidth:1
        }]
    };
    
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
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
        document.getElementById('alertInvoiceVal').textContent = ev.faturaPlataforma.toFixed(2) + '€';
        document.getElementById('alertCommVal').textContent = Math.abs(ev.comissaoApp).toFixed(2) + '€';
    } else if (bigDataAlert) {
        bigDataAlert.style.display = 'none';
    }
    
    // Alerta Layering
    const omissionAlert = document.getElementById('omissionAlert');
    if (ev.diferencialCusto > 0 && omissionAlert) {
        omissionAlert.style.display = 'flex';
        document.getElementById('omissionValue').textContent = ev.diferencialCusto.toFixed(2) + '€';
    } else if (omissionAlert) {
        omissionAlert.style.display = 'none';
    }
}

// ==========================================
// 9. EXPORTAÇÃO & RESET
// ==========================================

function exportDataJSON() {
    const data = {
        session: VDCSystem.sessionId,
        client: VDCSystem.client,
        analysis: VDCSystem.analysis,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null,2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VDC_AUDIT_${VDCSystem.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    logAudit('Relatório JSON exportado.', 'success');
}

function exportPDF() {
    logAudit('Gerando PDF...', 'info');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("VDC FORENSIC REPORT", 20, 20);
    doc.setFontSize(12);
    doc.text(`Session ID: ${VDCSystem.sessionId}`, 20, 30);
    doc.text(`Client: ${VDCSystem.client?.name || 'N/A'}`, 20, 40);
    
    doc.save(`VDC_Report_${VDCSystem.sessionId}.pdf`);
    logAudit('PDF gerado.', 'success');
}

function resetSystem() {
    if (!confirm('Repor o sistema para o estado inicial?')) return;
    
    VDCSystem.client = null;
    VDCSystem.analysis.extractedValues = {
        saftGross: 0, saftIVA6: 0, saftNet: 0,
        platformCommission: 0, bankTransfer: 0, iva23Due: 0,
        rendimentosBrutos: 0, comissaoApp: 0, rendimentosLiquidos: 0,
        faturaPlataforma: 0, diferencialCusto: 0,
        prejuizoFiscal: 0, ivaAutoliquidacao: 0,
        dac7Revenue: 0,
        jurosMora: 0, taxaRegulacao: 0
    };
    
    // Limpa UI de texto
    const ids = [
        'netVal', 'iva6Val', 'commissionVal', 'iva23Val',
        'kpiGanhos', 'kpiComm', 'kpiNet', 'kpiInvoice'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0,00€';
    });
    
    // Limpa inputs
    document.getElementById('clientNameFixed').value = '';
    document.getElementById('clientNIFFixed').value = '';
    document.getElementById('clientStatusFixed').style.display = 'none';
    
    clearAllEvidence();
    clearConsole();
    generateMasterHash();
    
    logAudit('Sistema reiniciado.', 'info');
}

// ==========================================
// 10. FUNÇÕES AUXILIARES GERAIS
// ==========================================

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (!btn) return;
    
    const hasClient = VDCSystem.client !== null;
    const hasControl = VDCSystem.documents.control?.files?.length > 0;
    const hasSaft = VDCSystem.documents.saft?.files?.length > 0;
    
    // Requer: Cliente + Controlo + SAFT
    btn.disabled = !(hasClient && hasControl && hasSaft);
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateSessionId() {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

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
    
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    
    toast.innerHTML = `<i class="fas ${icon}"></i> <p>${message}</p>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 11. BINDING GLOBAL (WINDOW)
// Garante o acesso global para debug e integração externa
// ==========================================

window.clearConsole = clearConsole;
window.startSession = startGatekeeperSession;
window.exportPDF = exportPDF;
window.VDCSystem = VDCSystem;
window.performForensicCrossings = performForensicCrossings;
