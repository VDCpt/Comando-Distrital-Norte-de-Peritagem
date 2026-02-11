// ============================================
// VDC SISTEMA DE PERITAGEM FORENSE v11.6 GATEKEEPER
// AUDITORIA FISCAL BIG DATA - THE CHECKMATE
// CORREÇÃO CIRÚRGICA: SPLASH MANUAL + PARSING BOLT/CSV + EVENTOS ATIVOS
// ============================================

// NÚCLEO DO SISTEMA - ESTADO GLOBAL
const VDCSystem = {
    documents: [],
    currentClient: {
        name: '',
        nif: '',
        year: new Date().getFullYear()
    },
    analysis: {
        gross: 0,
        transfer: 0,
        difference: 0,
        marketValue: 0
    },
    chart: null
};

// ============================================
// MÓDULO 1: GATEKEEPER - CONTROLO DE ACESSO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🔐 VDC v11.6 GATEKEEPER: Sistema Inicializado.");
    
    initializeSystem();
    populateYears();
    setupEventListeners();
    generateMasterHash();
    startClock();
    
    const startBtn = document.getElementById('startSessionBtn');
    const splashScreen = document.getElementById('splashScreen');
    const mainContainer = document.getElementById('mainContainer');
    
    if (startBtn && splashScreen && mainContainer) {
        startBtn.addEventListener('click', () => {
            logAudit("🔓 ACESSO AUTORIZADO: Perito em sessão.", "success");
            splashScreen.style.opacity = '0';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                mainContainer.style.display = 'block';
                mainContainer.style.opacity = '1';
                // Trigger resize para o Chart.js ajustar ao container visível
                window.dispatchEvent(new Event('resize'));
            }, 500);
        });
    }
});

// ============================================
// MÓDULO 2: UTILITÁRIOS E PARSING
// ============================================

const toForensicNumber = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    let str = v.toString().trim().replace(/[€\s]/g, '').replace(',', '.');
    let num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-PT');
        const dateStr = now.toLocaleDateString('pt-PT');
        const clockEl = document.getElementById('liveClock');
        if (clockEl) clockEl.textContent = `${dateStr} ${timeStr}`;
    }, 1000);
}

function populateYears() {
    const yearSelect = document.getElementById('fiscalYear');
    if (!yearSelect) return;
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let i = currentYear; i >= 2020; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
}

// ============================================
// MÓDULO 3: GESTÃO DE EVIDÊNCIAS (DRAG & DROP)
// ============================================

function setupEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (dropZone) {
        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
        dropZone.ondragleave = () => dropZone.classList.remove('dragover');
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        };
    }

    if (fileInput) {
        fileInput.onchange = (e) => handleFiles(e.target.files);
    }
}

async function handleFiles(files) {
    for (let file of files) {
        const content = await file.text();
        const hash = CryptoJS.SHA256(content).toString();
        
        const docEntry = {
            name: file.name,
            size: file.size,
            type: detectFileType(file.name),
            hash: hash,
            content: content
        };
        
        VDCSystem.documents.push(docEntry);
        logAudit(`📄 Ficheiro carregado: ${file.name} [${docEntry.type.toUpperCase()}]`, "info");
    }
    updateEvidenceList();
    generateMasterHash();
}

function detectFileType(fileName) {
    const name = fileName.toLowerCase();
    if (name.includes('saft') || name.includes('.xml')) return 'saft';
    if (name.includes('fatura') || name.includes('invoice')) return 'invoices';
    if (name.includes('extrato') || name.includes('statement')) return 'statements';
    if (name.includes('dac7')) return 'dac7';
    return 'control';
}
