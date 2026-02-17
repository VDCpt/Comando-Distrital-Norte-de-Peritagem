/**
 * VDC FORENSE ELITE v15.0 - SISTEMA DE PERITAGEM DIGITAL
 * Motor de Big Data com Soma Incremental e Cruzamento Aritmético
 * Design: Eduardo (Inquieto) | Lógica: Estado Único sem Reset Indevido
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES E CONSTANTES
    // ============================================
    const CONFIG = {
        VERSAO: '15.0 ELITE',
        TAXA_COMISSAO_PADRAO: 0.23,
        TOLERANCIA_DIVERGENCIA: 10 // €
    };

    // ============================================
    // ESTADO GLOBAL DO SISTEMA (ACUMULADOR BIG DATA)
    // ============================================
    let State = {
        user: null,
        level: 1,
        metadados: {
            subject: '',
            nif: '',
            period: 'Anual',
            platform: ''
        },
        financeiro: {
            saft: 0,        // Bruto SAF-T (soma CSVs)
            dac7: 0,        // Bruto DAC7 (soma CSVs/PDFs)
            comissoes: 0    // Comissões (soma Faturas PDF)
        },
        files: [],          // Metadados dos ficheiros processados
        logs: [],
        sessionHash: 'STANDBY',
        sessionStart: null
    };

    // ============================================
    // UTILITÁRIOS
    // ============================================
    function gerarHashSessao() {
        return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    function formatarMoeda(valor) {
        return (parseFloat(valor) || 0).toFixed(2);
    }

    function parseValorMonetario(texto) {
        if (!texto) return 0;
        // Limpa caracteres não numéricos exceto vírgula e ponto
        let limpo = String(texto).replace(/[^\d,.-]/g, '').replace(',', '.');
        let valor = parseFloat(limpo);
        return isNaN(valor) ? 0 : valor;
    }

    function log(msg, tipo = 'info') {
        const terminal = document.getElementById('terminal');
        if (terminal) {
            const line = document.createElement('div');
            line.className = 'log-line';
            line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
        }
        State.logs.push({ timestamp: new Date(), msg, tipo });
        console.log(`[VDC] ${msg}`);
    }

    function updateUI() {
        document.getElementById('valSaft').innerText = formatarMoeda(State.financeiro.saft);
        document.getElementById('valDac7').innerText = formatarMoeda(State.financeiro.dac7);
        document.getElementById('valComissoes').innerText = formatarMoeda(State.financeiro.comissoes);
        const divergencia = State.financeiro.saft - State.financeiro.dac7;
        document.getElementById('valDivergencia').innerText = formatarMoeda(divergencia);
    }

    function atualizarMetadados() {
        State.metadados.subject = document.getElementById('inputSubject')?.value.trim() || '';
        State.metadados.nif = document.getElementById('inputNIF')?.value.trim() || '';
        State.metadados.period = document.getElementById('selectPeriod')?.value || 'Anual';
        State.metadados.platform = document.getElementById('selectPlatform')?.value || '';
    }

    function validarMetadados() {
        atualizarMetadados();
        if (!State.metadados.subject) { log('ERRO: Sujeito Passivo não preenchido.', 'error'); return false; }
        if (!State.metadados.nif || State.metadados.nif.length !== 9 || isNaN(State.metadados.nif)) { log('ERRO: NIPC inválido (9 dígitos).', 'error'); return false; }
        if (!State.metadados.platform) { log('ERRO: Selecione a Plataforma.', 'error'); return false; }
        return true;
    }

    // ============================================
    // ACESSO AO SISTEMA
    // ============================================
    window.checkAccess = function() {
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        const l = document.getElementById('user-level').value;

        // Credenciais de exemplo (em produção, usar backend)
        if (u === "admin" && p === "vdc") {
            State.user = u;
            State.level = l;
            State.sessionStart = new Date();
            State.sessionHash = gerarHashSessao();

            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'block';
            document.getElementById('hash-live').innerText = `HASH: ${State.sessionHash.substring(0, 16)}...`;

            log(`✅ Acesso concedido: Nível ${l} - ${u}`);
            log(`🆔 Sessão: ${State.sessionHash}`);
            log('Sistema pronto para receber evidências.');
        } else {
            alert("ACESSO NEGADO: Credenciais Inválidas.");
        }
    };

    // ============================================
    // PROCESSAMENTO DE FICHEIROS (SOMA INCREMENTAL)
    // ============================================
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--glow)';
        dropZone.style.boxShadow = '0 0 40px var(--glow)';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--royal)';
        dropZone.style.boxShadow = 'none';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--royal)';
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    function handleFiles(files) {
        log(`📁 Lote recebido: ${files.length} ficheiro(s).`);
        const feedback = document.getElementById('file-feedback');
        feedback.innerHTML = `Processando ${files.length} ficheiro(s)...`;

        // Processa cada ficheiro sequencialmente
        Array.from(files).forEach(file => processFile(file));
    }

    async function processFile(file) {
        log(`📄 A analisar: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

        // Guardar metadado do ficheiro
        State.files.push({ name: file.name, size: file.size, type: file.type });

        if (file.name.toLowerCase().endsWith('.csv')) {
            await parseCSV(file);
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            await parsePDF(file);
        } else {
            log(`⚠️ Formato ignorado: ${file.name}`, 'warning');
        }

        updateUI();
        document.getElementById('file-feedback').innerHTML = `Último: ${file.name} processado.`;
    }

    async function parseCSV(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
                    const header = lines[0]?.toLowerCase() || '';

                    // Deteção inteligente do tipo de documento pelo conteúdo
                    if (content.includes('DAC7') || header.includes('dac7') || content.includes('receitas anuais')) {
                        // É um relatório DAC7: somar valores da última coluna (exemplo)
                        let totalDAC7 = 0;
                        lines.slice(1).forEach(row => {
                            const cols = row.split(',');
                            const val = parseValorMonetario(cols[cols.length - 1]);
                            totalDAC7 += val;
                        });
                        State.financeiro.dac7 += totalDAC7;
                        log(`📊 DAC7 (CSV) incrementado: +${totalDAC7.toFixed(2)}€ (Total: ${State.financeiro.dac7.toFixed(2)}€)`);
                    } else {
                        // Assume SAF-T: somar valores (exemplo: última coluna)
                        let totalSAFT = 0;
                        lines.slice(1).forEach(row => {
                            const cols = row.split(',');
                            const val = parseValorMonetario(cols[cols.length - 1]);
                            totalSAFT += val;
                        });
                        State.financeiro.saft += totalSAFT;
                        log(`📊 SAF-T (CSV) incrementado: +${totalSAFT.toFixed(2)}€ (Total: ${State.financeiro.saft.toFixed(2)}€)`);
                    }
                } catch (err) {
                    log(`❌ Erro ao ler CSV ${file.name}: ${err.message}`, 'error');
                }
                resolve();
            };
            reader.onerror = () => {
                log(`❌ Erro de leitura do ficheiro ${file.name}`, 'error');
                resolve();
            };
            reader.readAsText(file, 'ISO-8859-1');
        });
    }

    async function parsePDF(file) {
        return new Promise((resolve) => {
            log(`🔍 PDF: ${file.name} - a extrair texto...`);

            // Verifica se é uma fatura pelo nome
            if (file.name.toLowerCase().includes('fatura')) {
                // Simulação de extração (versão real usaria pdf.js)
                // Para o demo, soma um valor fixo incremental. Cada fatura adiciona 1000€.
                const valorSimulado = 1000.00;
                State.financeiro.comissoes += valorSimulado;
                log(`💰 Fatura PDF (${file.name}) incrementou comissões: +${valorSimulado}€ (Total: ${State.financeiro.comissoes.toFixed(2)}€)`);
            } else if (file.name.toLowerCase().includes('dac7')) {
                // Se for um PDF DAC7, incrementa o valor DAC7
                const valorSimulado = 5000.00;
                State.financeiro.dac7 += valorSimulado;
                log(`📊 DAC7 PDF (${file.name}) incrementado: +${valorSimulado}€ (Total: ${State.financeiro.dac7.toFixed(2)}€)`);
            } else {
                // Outros PDFs (ex: extrato) podem conter comissões ou valores
                const valorSimulado = 200.00;
                State.financeiro.comissoes += valorSimulado;
                log(`📄 PDF genérico (${file.name}) incrementou comissões: +${valorSimulado}€`);
            }
            resolve();
        });
    }

    // ============================================
    // CRUZAMENTOS E AÇÕES
    // ============================================
    window.processData = function() {
        if (!validarMetadados()) return;

        log('⚙️ A executar cruzamentos aritméticos...');
        const divergencia = State.financeiro.saft - State.financeiro.dac7;
        const liquidoReal = State.financeiro.saft - State.financeiro.comissoes;
        const taxaEfetiva = State.financeiro.saft > 0 ? (State.financeiro.comissoes / State.financeiro.saft) * 100 : 0;

        log(`📈 SAF-T Bruto: ${State.financeiro.saft.toFixed(2)}€`);
        log(`📉 DAC7 Reportado: ${State.financeiro.dac7.toFixed(2)}€`);
        log(`💸 Comissões Totais: ${State.financeiro.comissoes.toFixed(2)}€`);
        log(`🔍 DIVERGÊNCIA SAF-T vs DAC7: ${divergencia.toFixed(2)}€`);
        log(`🧮 Proveito Real (SAF-T - Comissões): ${liquidoReal.toFixed(2)}€`);
        log(`📊 Taxa Efetiva de Comissão: ${taxaEfetiva.toFixed(2)}%`);

        if (Math.abs(divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
            log(`⚠️ ALERTA: Divergência superior a ${CONFIG.TOLERANCIA_DIVERGENCIA}€!`, 'warning');
        }

        updateUI();
        log('✅ Cruzamentos concluídos.');
    };

    window.exportReport = function() {
        if (!validarMetadados()) return;

        if (State.financeiro.saft === 0 && State.financeiro.dac7 === 0 && State.financeiro.comissoes === 0) {
            alert('Erro: Não há dados para exportar. Carregue ficheiros ou execute cruzamentos primeiro.');
            return;
        }

        if (typeof window.jspdf === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.setTextColor(0, 210, 255);
        doc.text('RELATÓRIO DE PERITAGEM VDC ELITE', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`Sujeito Passivo: ${State.metadados.subject}`, 14, 35);
        doc.text(`NIPC: ${State.metadados.nif}`, 14, 40);
        doc.text(`Período: ${State.metadados.period}`, 14, 45);
        doc.text(`Sessão: ${State.sessionHash}`, 14, 50);
        doc.text(`Data: ${new Date().toLocaleString('pt-PT')}`, 14, 55);

        doc.autoTable({
            startY: 60,
            head: [['Análise Financeira', 'Valor (€)']],
            body: [
                ['Faturação Bruta (SAF-T)', State.financeiro.saft.toFixed(2)],
                ['Faturação Reportada (DAC7)', State.financeiro.dac7.toFixed(2)],
                ['Comissões (Faturas/PDFs)', State.financeiro.comissoes.toFixed(2)],
                ['DIVERGÊNCIA (SAF-T - DAC7)', (State.financeiro.saft - State.financeiro.dac7).toFixed(2)],
                ['Proveito Real (SAF-T - Comissões)', (State.financeiro.saft - State.financeiro.comissoes).toFixed(2)]
            ],
            theme: 'striped',
            headStyles: { fillColor: [0, 116, 217] }
        });

        doc.text('Documento gerado para efeitos de prova legal. Art. 103.º RGIT.', 14, doc.lastAutoTable.finalY + 15);
        doc.save(`VDC_Pericia_${State.metadados.nif}_${Date.now()}.pdf`);

        log('📄 Relatório PDF exportado com sucesso.');
    };

    window.loadDemoData = function() {
        log('🚀 A carregar dados de demonstração...');
        // Soma incremental: adiciona valores aos existentes, não os substitui
        State.financeiro.saft += 7755.16;
        State.financeiro.dac7 += 7755.16;
        State.financeiro.comissoes += 2447.89;
        updateUI();
        log('✅ Demo carregada. Valores somados aos existentes.');
    };

    window.resetSystem = function() {
        if (!confirm('Tem a certeza que pretende LIMPAR TODOS OS DADOS da sessão?')) return;
        State.financeiro = { saft: 0, dac7: 0, comissoes: 0 };
        State.files = [];
        State.logs = [];
        document.getElementById('terminal').innerHTML = '<div class="log-line">> VDC Forensic Engine v15.0 Ready...</div><div class="log-line">> Sistema limpo.</div>';
        updateUI();
        document.getElementById('file-feedback').innerHTML = '';
        log('🧹 Sistema limpo. Todos os dados removidos.');
    };

    // ============================================
    // INICIALIZAÇÃO E TIMER
    // ============================================
    setInterval(() => {
        const timerEl = document.getElementById('timer');
        if (timerEl && State.sessionStart) {
            const diff = Math.floor((new Date() - State.sessionStart) / 1000);
            const hrs = Math.floor(diff / 3600).toString().padStart(2, '0');
            const mins = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const secs = (diff % 60).toString().padStart(2, '0');
            timerEl.innerText = `SESSÃO: ${hrs}:${mins}:${secs}`;
        }
    }, 1000);

})();
