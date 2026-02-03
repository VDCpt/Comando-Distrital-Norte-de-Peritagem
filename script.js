// Variáveis globais
let hashReferences = [];
let csvLoaded = false;
let documents = {
    saft: null,
    invoice: null,
    extract: null
};

// Elementos DOM
const elements = {
    csvFile: document.getElementById('csvFile'),
    saftFile: document.getElementById('saftFile'),
    invoiceFile: document.getElementById('invoiceFile'),
    extractFile: document.getElementById('extractFile'),
    csvStatus: document.getElementById('csvStatus'),
    saftStatus: document.getElementById('saftStatus'),
    invoiceStatus: document.getElementById('invoiceStatus'),
    extractStatus: document.getElementById('extractStatus'),
    csvContent: document.getElementById('csvContent'),
    hashTable: document.querySelector('#hashTable tbody'),
    validationSummary: document.getElementById('validationSummary'),
    finalStatus: document.getElementById('finalStatus'),
    finalMessage: document.getElementById('finalMessage'),
    eventLog: document.getElementById('eventLog')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // CSV File Upload
    elements.csvFile.addEventListener('change', handleCSVUpload);
    
    // Document Uploads
    elements.saftFile.addEventListener('change', (e) => handleDocumentUpload(e, 'saft'));
    elements.invoiceFile.addEventListener('change', (e) => handleDocumentUpload(e, 'invoice'));
    elements.extractFile.addEventListener('change', (e) => handleDocumentUpload(e, 'extract'));
    
    logEvent('Sistema inicializado. Carregue o CSV e os documentos.');
});

// Manipulação de CSV
async function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    logEvent(`CSV carregado: ${file.name}`);
    
    try {
        const text = await file.text();
        const rows = parseCSV(text);
        
        // Limpar dados anteriores
        hashReferences = [];
        elements.hashTable.innerHTML = '';
        
        // Processar cada linha
        rows.forEach((row, index) => {
            // Ignorar linhas vazias ou sem hash
            if (!row.Algorithm || !row.Hash || !row.Path) {
                logEvent(`Linha ${index + 1} ignorada (dados incompletos)`);
                return;
            }
            
            // Normalizar dados
            const ref = {
                algorithm: row.Algorithm.trim().toUpperCase(),
                hash: row.Hash.trim().toUpperCase(),
                path: row.Path.trim(),
                documentType: detectDocumentType(row.Path)
            };
            
            hashReferences.push(ref);
            
            // Adicionar à tabela
            const rowElement = document.createElement('tr');
            rowElement.innerHTML = `
                <td>${ref.algorithm}</td>
                <td class="hash-cell">${ref.hash.substring(0, 50)}...</td>
                <td title="${ref.path}">${ref.path.substring(0, 30)}...</td>
                <td><i class="fas fa-clock"></i> Aguardando</td>
            `;
            elements.hashTable.appendChild(rowElement);
        });
        
        csvLoaded = true;
        updateCSVStatus(`Controlo carregado com sucesso - ${hashReferences.length} hashes válidas`);
        elements.csvContent.classList.remove('hidden');
        
        logEvent(`${hashReferences.length} referências de hash carregadas`);
        
        // Validar automaticamente se já houver documentos carregados
        validateAll();
        
    } catch (error) {
        updateCSVStatus('Erro ao processar CSV', false);
        logEvent(`ERRO no CSV: ${error.message}`);
    }
}

// Função para analisar CSV
function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];
    
    if (lines.length === 0) return result;
    
    // Detetar cabeçalho
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Processar linhas
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const obj = {};
        const currentLine = lines[i].split(',');
        
        headers.forEach((header, index) => {
            obj[header] = currentLine[index] ? currentLine[index].trim().replace(/"/g, '') : '';
        });
        
        result.push(obj);
    }
    
    return result;
}

// Detetar tipo de documento pelo path
function detectDocumentType(path) {
    const lowerPath = path.toLowerCase();
    if (lowerPath.includes('saf') || lowerPath.includes('audit')) return 'saft';
    if (lowerPath.includes('fatur') || lowerPath.includes('invoice')) return 'invoice';
    if (lowerPath.includes('extrat') || lowerPath.includes('statement')) return 'extract';
    return 'unknown';
}

// Manipulação de upload de documentos
async function handleDocumentUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    documents[type] = {
        file: file,
        name: file.name,
        hash: await calculateHash(file)
    };
    
    logEvent(`${type.toUpperCase()} carregado: ${file.name}`);
    updateDocumentStatus(type, 'pending', 'Aguardando validação');
    
    // Validar automaticamente se CSV já estiver carregado
    if (csvLoaded) {
        validateDocument(type);
    }
}

// Calcular hash SHA-256
async function calculateHash(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const buffer = e.target.result;
                const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                resolve(hashHex.toUpperCase());
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Validar documento específico
async function validateDocument(type) {
    if (!documents[type] || !csvLoaded) return;
    
    const doc = documents[type];
    const ref = hashReferences.find(ref => ref.documentType === type);
    
    if (!ref) {
        updateDocumentStatus(type, 'invalid', 'Hash de referência não encontrada no CSV');
        return;
    }
    
    // Calcular hash atual
    const currentHash = await calculateHash(doc.file);
    doc.hash = currentHash;
    
    // Comparar hashes (case insensitive)
    const isValid = currentHash.toUpperCase() === ref.hash.toUpperCase();
    
    if (isValid) {
        updateDocumentStatus(type, 'valid', 'Hash válida');
        logEvent(`${type.toUpperCase()} validado com sucesso`);
    } else {
        updateDocumentStatus(type, 'invalid', 
            `Hash divergente<br>
             Hash Calculada: ${currentHash}<br>
             Hash Esperada: ${ref.hash}`);
        logEvent(`${type.toUpperCase()} - HASH DIVERGENTE: ${currentHash.substring(0, 20)}...`);
    }
    
    updateValidationSummary();
}

// Validar todos os documentos
async function validateAll() {
    if (!csvLoaded) {
        alert('Por favor, carregue primeiro o ficheiro CSV de controlo.');
        return;
    }
    
    logEvent('Iniciando validação completa...');
    
    const promises = [];
    if (documents.saft) promises.push(validateDocument('saft'));
    if (documents.invoice) promises.push(validateDocument('invoice'));
    if (documents.extract) promises.push(validateDocument('extract'));
    
    await Promise.all(promises);
    
    logEvent('Validação completa concluída');
    updateFinalStatus();
}

// Atualizar status do CSV
function updateCSVStatus(message, success = true) {
    elements.csvStatus.innerHTML = `
        <div class="status-box ${success ? 'status-valid' : 'status-invalid'}">
            <i class="fas fa-${success ? 'check-circle' : 'exclamation-triangle'}"></i>
            ${message}
        </div>
    `;
}

// Atualizar status do documento
function updateDocumentStatus(type, status, message) {
    const element = elements[`${type}Status`];
    const icon = status === 'valid' ? 'check-circle' : 
                 status === 'invalid' ? 'times-circle' : 'hourglass-half';
    
    element.innerHTML = `
        <div class="status-box status-${status}">
            <i class="fas fa-${icon}"></i>
            ${message}
        </div>
    `;
}

// Atualizar resumo da validação
function updateValidationSummary() {
    const summary = [];
    
    if (documents.saft) {
        const status = elements.saftStatus.querySelector('.status-valid') ? '✓' : '✗';
        summary.push(`SAF-T: ${status}`);
    }
    
    if (documents.invoice) {
        const status = elements.invoiceStatus.querySelector('.status-valid') ? '✓' : '✗';
        summary.push(`Fatura: ${status}`);
    }
    
    if (documents.extract) {
        const status = elements.extractStatus.querySelector('.status-valid') ? '✓' : '✗';
        summary.push(`Extrato: ${status}`);
    }
    
    elements.validationSummary.innerHTML = `
        <p>${summary.length ? summary.join(' | ') : 'Nenhum documento carregado'}</p>
    `;
}

// Atualizar status final
function updateFinalStatus() {
    const allDocs = [documents.saft, documents.invoice, documents.extract].filter(Boolean);
    const validDocs = allDocs.filter((_, index) => {
        const type = ['saft', 'invoice', 'extract'][index];
        return elements[`${type}Status`].querySelector('.status-valid');
    });
    
    if (allDocs.length === 0) {
        elements.finalStatus.classList.add('hidden');
        return;
    }
    
    elements.finalStatus.classList.remove('hidden');
    
    if (validDocs.length === allDocs.length) {
        elements.finalMessage.innerHTML = `
            <div class="status-valid" style="padding: 15px; border-radius: 8px;">
                <i class="fas fa-shield-alt"></i>
                TODOS OS DOCUMENTOS VALIDADOS COM SUCESSO
            </div>
        `;
    } else {
        elements.finalMessage.innerHTML = `
            <div class="status-invalid" style="padding: 15px; border-radius: 8px;">
                <i class="fas fa-exclamation-triangle"></i>
                ${validDocs.length} de ${allDocs.length} documentos validados
            </div>
        `;
    }
}

// Resetar tudo
function resetAll() {
    // Resetar variáveis
    hashReferences = [];
    csvLoaded = false;
    documents = { saft: null, invoice: null, extract: null };
    
    // Resetar inputs de arquivo
    elements.csvFile.value = '';
    elements.saftFile.value = '';
    elements.invoiceFile.value = '';
    elements.extractFile.value = '';
    
    // Resetar status
    elements.csvStatus.innerHTML = '';
    elements.saftStatus.innerHTML = '<i class="fas fa-hourglass-half"></i> Aguardando validação';
    elements.invoiceStatus.innerHTML = '<i class="fas fa-hourglass-half"></i> Aguardando validação';
    elements.extractStatus.innerHTML = '<i class="fas fa-hourglass-half"></i> Aguardando validação';
    
    // Resetar tabela
    elements.hashTable.innerHTML = '';
    elements.csvContent.classList.add('hidden');
    
    // Resetar resumo
    elements.validationSummary.innerHTML = 
        '<p>Carregue os documentos e o ficheiro CSV para iniciar a validação.</p>';
    elements.finalStatus.classList.add('hidden');
    
    logEvent('Sistema reiniciado. Pronto para nova análise.');
}

// Log de eventos
function logEvent(message) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-PT', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const eventItem = document.createElement('div');
    eventItem.className = 'event-item';
    eventItem.innerHTML = `<span class="event-time">[${timeString}]</span> ${message}`;
    
    elements.eventLog.prepend(eventItem);
    
    // Manter apenas os últimos 50 eventos
    const events = elements.eventLog.querySelectorAll('.event-item');
    if (events.length > 50) {
        events[events.length - 1].remove();
    }
}

// Exportar para debug
window.debugSystem = {
    hashReferences,
    documents,
    csvLoaded,
    calculateHash,
    validateAll,
    resetAll
};
