// Variáveis globais do sistema
let currentSession = "VDC-ML9902HI-S1IQKO";
let discrepancyFormula = null; // Fórmula original será preservada

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeSystem();
    setupEventListeners();
    updateDateTime();
    
    // Atualizar hora a cada minuto
    setInterval(updateDateTime, 60000);
});

function initializeSystem() {
    console.log("VDC FORENSIC SYSTEM v10.0 inicializado");
    
    // Preservar a fórmula de cálculo original (não modificada)
    discrepancyFormula = function(dac7Value, platformFactor, yearFactor) {
        // FÓRMULA ORIGINAL - NÃO ALTERAR
        let base = dac7Value * platformFactor;
        let adjustment = base * (yearFactor / 100);
        return base - adjustment;
    };
    
    // Inicializar contadores
    resetCounters();
}

function setupEventListeners() {
    // Botões de Cliente
    document.getElementById('registerClient').addEventListener('click', registerClient);
    document.getElementById('saveClient').addEventListener('click', saveClient);
    
    // Botão de Cálculo
    document.getElementById('calculateDiscrepancy').addEventListener('click', calculateDiscrepancy);
    
    // Botão Demo
    document.getElementById('btnDemo').addEventListener('click', loadDemoData);
    
    // Botão Reset
    document.getElementById('btnReset').addEventListener('click', resetDashboard);
    
    // Botão Gerar PDF
    document.getElementById('generatePDF').addEventListener('click', generatePDF);
    
    // Botões de Upload (simulação)
    const uploadButtons = document.querySelectorAll('.btn-upload');
    uploadButtons.forEach(btn => {
        btn.addEventListener('click', simulateFileUpload);
    });
}

// Atualizar data e hora
function updateDateTime() {
    const now = new Date();
    const formattedDate = now.toLocaleTimeString('pt-PT', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }) + ' ' + now.toLocaleDateString('pt-PT');
    
    document.getElementById('currentTime').textContent = formattedDate;
}

// Registrar Cliente
function registerClient() {
    const name = document.getElementById('clientName').value;
    const nif = document.getElementById('clientNIF').value;
    
    if (!name || !nif) {
        alert('Por favor, preencha todos os campos obrigatórios do cliente.');
        return;
    }
    
    console.log(`Cliente registrado: ${name} (NIF: ${nif})`);
    alert('Cliente registrado com sucesso!');
}

// Guardar Cliente
function saveClient() {
    const name = document.getElementById('clientName').value;
    const nif = document.getElementById('clientNIF').value;
    const phone = document.getElementById('clientPhone').value;
    const email = document.getElementById('clientEmail').value;
    const address = document.getElementById('clientAddress').value;
    
    if (!name || !nif) {
        alert('Nome e NIF são obrigatórios para guardar o cliente.');
        return;
    }
    
    const clientData = {
        nome: name,
        nif: nif,
        telefone: phone,
        email: email,
        morada: address,
        dataRegisto: new Date().toISOString()
    };
    
    console.log('Cliente guardado:', clientData);
    alert('Dados do cliente guardados com sucesso!');
}

// Calcular Discrepância (USANDO FÓRMULA ORIGINAL)
function calculateDiscrepancy() {
    const dac7Value = parseFloat(document.getElementById('dac7Value').value);
    const fiscalYear = document.getElementById('fiscalYear').value;
    const platform = document.getElementById('platform').value;
    
    if (!dac7Value || dac7Value <= 0) {
        alert('Por favor, insira um valor DAC7 válido.');
        return;
    }
    
    // Fatores (não modificados da fórmula original)
    const platformFactors = {
        'bolt': 0.85,
        'uber': 0.88,
        'airbnb': 0.92,
        'glovo': 0.87
    };
    
    const yearFactors = {
        '2026': 12,
        '2025': 10,
        '2024': 8
    };
    
    const platformFactor = platformFactors[platform] || 0.85;
    const yearFactor = yearFactors[fiscalYear] || 10;
    
    // Usar a fórmula original (não modificada)
    const result = discrepancyFormula(dac7Value, platformFactor, yearFactor);
    
    // Exibir resultado
    const resultElement = document.getElementById('calculationResult');
    const discrepancy = dac7Value - result;
    const percentage = ((discrepancy / dac7Value) * 100).toFixed(2);
    
    resultElement.innerHTML = `
        <div style="font-size: 18px; color: #2c3e50; margin-bottom: 10px;">
            Valor DAC7: <strong>${dac7Value.toLocaleString('pt-PT')}€</strong>
        </div>
        <div style="font-size: 16px; color: #e74c3c; margin-bottom: 10px;">
            Discrepância Calculada: <strong>${discrepancy.toLocaleString('pt-PT')}€</strong>
        </div>
        <div style="font-size: 14px; color: #27ae60;">
            (${percentage}% do valor total)
        </div>
        <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 12px; color: #7f8c8d;">
            Fórmula original aplicada: base × fator_plataforma - ajuste_anual
        </div>
    `;
    
    console.log(`Cálculo realizado: DAC7=${dac7Value}, Resultado=${result}, Discrepância=${discrepancy}`);
}

// Carregar Dados Demo
function loadDemoData() {
    console.log("Carregando dados de demonstração...");
    
    // Preencher dados do cliente
    document.getElementById('clientName').value = "Momento Eficaz, Lda";
    document.getElementById('clientNIF').value = "509876543";
    document.getElementById('clientPhone').value = "+351 912 345 678";
    document.getElementById('clientEmail').value = "contato@momentoeficaz.pt";
    document.getElementById('clientAddress').value = "Av. da Liberdade 245, 1250-096 Lisboa";
    
    // Preencher módulo DAC7
    document.getElementById('dac7Value').value = "50000";
    document.getElementById('fiscalYear').value = "2026";
    document.getElementById('platform').value = "bolt";
    
    // Simular carregamento de documentos
    updateDocumentCounters(5, 12, 8);
    
    // Calcular automaticamente
    setTimeout(() => {
        calculateDiscrepancy();
    }, 500);
    
    alert('Dados de demonstração carregados com sucesso!');
}

// Reset do Dashboard
function resetDashboard() {
    console.log("Resetando dashboard...");
    
    // Limpar campos do cliente
    document.getElementById('clientName').value = "";
    document.getElementById('clientNIF').value = "";
    document.getElementById('clientPhone').value = "";
    document.getElementById('clientEmail').value = "";
    document.getElementById('clientAddress').value = "";
    
    // Limpar módulo DAC7
    document.getElementById('dac7Value').value = "";
    document.getElementById('calculationResult').innerHTML = "Aguardando cálculo...";
    
    // Resetar contadores
    resetCounters();
    
    alert('Dashboard limpo com sucesso!');
}

// Resetar contadores
function resetCounters() {
    updateDocumentCounters(0, 0, 0);
}

// Atualizar contadores de documentos
function updateDocumentCounters(saft, invoices, statements) {
    document.getElementById('saftStatus').textContent = saft;
    document.getElementById('invoicesStatus').textContent = invoices;
    document.getElementById('statementsStatus').textContent = statements;
    
    document.getElementById('saftCount').textContent = saft;
    document.getElementById('invoicesCount').textContent = invoices;
    document.getElementById('statementsCount').textContent = statements;
    
    const total = saft + invoices + statements;
    document.getElementById('totalCount').textContent = total;
}

// Simular upload de ficheiro
function simulateFileUpload(event) {
    const button = event.target;
    const documentItem = button.closest('.document-item');
    const statusElement = documentItem.querySelector('.file-status');
    
    // Simular processamento
    button.disabled = true;
    button.textContent = "A PROCESSAR...";
    statusElement.textContent = "⌛";
    statusElement.style.color = "#f39c12";
    
    setTimeout(() => {
        const randomCount = Math.floor(Math.random() * 5) + 1;
        statusElement.textContent = randomCount;
        statusElement.style.color = "#3498db";
        button.textContent = "CARREGAR";
        button.disabled = false;
        
        // Atualizar resumo
        updateSummary();
    }, 1500);
}

// Atualizar resumo baseado nos ficheiros
function updateSummary() {
    const saft = parseInt(document.getElementById('saftStatus').textContent) || 0;
    const invoices = parseInt(document.getElementById('invoicesStatus').textContent) || 0;
    const statements = parseInt(document.getElementById('statementsStatus').textContent) || 0;
    
    updateDocumentCounters(saft, invoices, statements);
}

// Gerar PDF (com estilo correto na página 2)
function generatePDF() {
    console.log("Gerando PDF...");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PÁGINA 1 - Estilo normal
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text("RELATÓRIO VDC FORENSIC SYSTEM", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-PT')}`, 20, 35);
    doc.text(`Sessão: ${currentSession}`, 20, 45);
    
    // Dados do Cliente
    doc.setFontSize(14);
    doc.text("DADOS DO CLIENTE", 20, 65);
    doc.setFontSize(10);
    doc.text(`Nome: ${document.getElementById('clientName').value || 'Não preenchido'}`, 20, 75);
    doc.text(`NIF: ${document.getElementById('clientNIF').value || 'Não preenchido'}`, 20, 85);
    doc.text(`Telefone: ${document.getElementById('clientPhone').value || 'Não preenchido'}`, 20, 95);
    doc.text(`Email: ${document.getElementById('clientEmail').value || 'Não preenchido'}`, 20, 105);
    doc.text(`Morada: ${document.getElementById('clientAddress').value || 'Não preenchido'}`, 20, 115);
    
    // Dados DAC7
    doc.setFontSize(14);
    doc.text("DADOS DAC7", 20, 135);
    doc.setFontSize(10);
    doc.text(`Valor Anual: ${document.getElementById('dac7Value').value || '0'}€`, 20, 145);
    doc.text(`Ano Fiscal: ${document.getElementById('fiscalYear').value}`, 20, 155);
    doc.text(`Plataforma: ${document.getElementById('platform').selectedOptions[0].text}`, 20, 165);
    
    // PÁGINA 2 - ESTILO BOLD APÓS addPage()
    doc.addPage();
    doc.setFont("helvetica", "bold"); // ESTILO CORRETO APLICADO IMEDIATAMENTE
    doc.setFontSize(16);
    doc.text("ANÁLISE FORENSE DETALHADA", 20, 20);
    
    doc.setFontSize(12);
    doc.text("Resumo de Documentos Carregados:", 20, 40);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Ficheiros SAF-T: ${document.getElementById('saftCount').textContent}`, 20, 50);
    doc.text(`Faturas: ${document.getElementById('invoicesCount').textContent}`, 20, 60);
    doc.text(`Extratos Bancários: ${document.getElementById('statementsCount').textContent}`, 20, 70);
    doc.text(`Total Documentos: ${document.getElementById('totalCount').textContent}`, 20, 80);
    
    // Resultado do Cálculo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RESULTADO DO CÁLCULO DE DISCREPÂNCIA", 20, 100);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const resultText = document.getElementById('calculationResult').textContent;
    const lines = doc.splitTextToSize(resultText, 170);
    doc.text(lines, 20, 110);
    
    // Rodapé
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("VDC FORENSIC SYSTEM v10.0 - Relatório gerado automaticamente", 20, 280);
    doc.text("© 2026 - Sistema de Auditoria Fiscal Digital", 20, 285);
    
    // Salvar PDF
    const fileName = `VDC_Relatorio_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fileName);
    
    console.log("PDF gerado com sucesso!");
    alert(`Relatório PDF "${fileName}" gerado com sucesso!`);
}
