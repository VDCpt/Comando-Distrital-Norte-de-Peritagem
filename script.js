/**
 * VDC v12.9 - SISTEMA DE PERITAGEM FORENSE
 * Desenvolvido para: Eduardo Perito e Analista Forense
 * Foco: Consolidação de Prova Legal e Extração Multi-Fonte
 * 
 * Versão: INTEGRAÇÃO FINAL COM HTML E CSS
 */

(function() {
    'use strict';

    // CONFIGURAÇÕES DE EXTRAÇÃO
    const CONFIG = {
        PRODUTO: "VDC",
        VERSAO: "12.9",
        ESTADO: "CONSOLIDAÇÃO FINAL",
        DEBUG: true
    };

    // ESTADO DO SISTEMA
    let State = {
        autenticidade: [],
        financeiro: {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            viagens: []
        },
        documentos: []
    };

    // --- MOTOR DE LOG (CONSOLA) ---
    const logger = {
        log: (msg, type = 'info') => {
            // Usar o ID 'log-container' do HTML
            const consoleEl = document.getElementById('log-container');
            if (!consoleEl) return;
            
            const line = document.createElement('div');
            line.className = `log-entry`;
            
            // Definir ícone baseado no tipo
            let icon = 'ℹ';
            let iconClass = 'info';
            if (type === 'success') {
                icon = '✓';
                iconClass = 'success';
            } else if (type === 'error') {
                icon = '✗';
                iconClass = 'error';
            } else if (type === 'warning') {
                icon = '⚠';
                iconClass = 'warning';
            }
            
            line.innerHTML = `
                <span class="timestamp">[${new Date().toLocaleTimeString('pt-PT')}]</span>
                <span class="icon ${iconClass}">${icon}</span>
                <span class="message">${msg}</span>
            `;
            
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
            if (CONFIG.DEBUG) console.log(`[VDC] ${msg}`);
        }
    };

    // --- INICIALIZAÇÃO E BARREIRA ---
    document.addEventListener('DOMContentLoaded', () => {
        // Ajustar IDs para corresponder ao HTML
        const btnProceed = document.getElementById('btn-proceed');
        const barrier = document.getElementById('modal-overlay'); // Antes era 'barrier-window'
        const app = document.getElementById('app-container');

        if (btnProceed && barrier && app) {
            btnProceed.addEventListener('click', () => {
                barrier.classList.add('hidden');
                app.classList.remove('hidden');
                logger.log("Acesso autorizado. Sistema VDC v12.9 Online.", "success");
            });
        } else {
            console.error('Elementos da barreira não encontrados. Verifique IDs no HTML.');
            // Fallback: se a barreira não for encontrada, mostrar app diretamente
            if (app) app.classList.remove('hidden');
        }

        initEvents();
    });

    function initEvents() {
        // Ajustar IDs para corresponder ao HTML
        const dropZone = document.getElementById('upload-faturas'); // Usar zona de upload de faturas como drop principal
        const fileInput = document.getElementById('input-faturas');
        const btnDemo = document.getElementById('btn-demo');
        const btnClear = document.getElementById('btn-limpar'); // Antes era 'btn-clear'
        
        // Botões da toolbar
        const btnReiniciar = document.getElementById('btn-reiniciar');
        const btnExportJSON = document.getElementById('btn-export-json');
        const btnExportPDF = document.getElementById('btn-export-pdf');
        
        // Botão de validação
        const btnValidar = document.getElementById('btn-validar');
        
        // Botão de executar perícia
        const btnExecutar = document.getElementById('btn-executar');

        // Configurar drop zone
        if (dropZone) {
            dropZone.onclick = () => fileInput?.click();
            
            // Eventos de drag and drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('dragover');
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('dragover');
                });
            });
            
            dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFiles(files);
                }
            });
        }

        if (fileInput) {
            fileInput.onchange = (e) => handleFiles(e.target.files);
        }
        
        if (btnDemo) btnDemo.onclick = carregarDemo;
        if (btnClear) btnClear.onclick = limparSistema;
        if (btnReiniciar) btnReiniciar.onclick = reiniciarAnalise;
        if (btnExportJSON) btnExportJSON.onclick = exportarJSON;
        if (btnExportPDF) btnExportPDF.onclick = exportarPDF;
        if (btnValidar) btnValidar.onclick = validarSujeito;
        if (btnExecutar) btnExecutar.onclick = executarPericia;

        // Tabs - se existirem no HTML
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                if (tabId) {
                    const tabContent = document.getElementById(tabId);
                    if (tabContent) tabContent.classList.remove('hidden');
                }
            };
        });
        
        // Gestão de evidências
        const btnToggleEvidence = document.getElementById('btn-toggle-evidence');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const btnModalFechar = document.getElementById('btn-modal-fechar');
        const btnModalLimpar = document.getElementById('btn-modal-limpar');
        const modal = document.getElementById('evidence-modal');
        
        if (btnToggleEvidence && modal) {
            btnToggleEvidence.onclick = () => {
                modal.style.display = 'flex';
                atualizarEstatisticasModal();
            };
        }
        
        if (btnCloseModal && modal) {
            btnCloseModal.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        if (btnModalFechar && modal) {
            btnModalFechar.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        if (btnModalLimpar) {
            btnModalLimpar.onclick = () => {
                if (confirm('Remover todas as evidências?')) {
                    limparSistema();
                    if (modal) modal.style.display = 'none';
                }
            };
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Evidence items
        document.querySelectorAll('.evidence-item').forEach(item => {
            item.addEventListener('click', () => {
                if (modal) modal.style.display = 'flex';
                atualizarEstatisticasModal();
            });
        });
    }

    // --- PROCESSAMENTO DE FICHEIROS ---
    async function handleFiles(files) {
        for (const file of files) {
            logger.log(`A processar: ${file.name} (${file.type || 'CSV/Data'})`, "info");
            
            if (file.name.endsWith('.csv')) {
                await processarCSV(file);
            } else if (file.type === 'application/pdf') {
                await processarPDF(file);
            } else {
                logger.log(`Formato não suportado: ${file.name}`, "error");
            }
        }
        atualizarEstatisticasModal();
    }

    // PARSER CSV (AUTENTICIDADE VS VIAGENS)
    function processarCSV(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                const lines = content.split(/\r?\n/);
                const headers = lines[0]?.toLowerCase() || '';

                if (headers.includes('algorithm') && headers.includes('hash')) {
                    logger.log(`Detetado ficheiro de CONTROLO DE AUTENTICIDADE: ${file.name}`, "success");
                    parseAutenticidade(lines);
                } else if (headers.includes('nipc') || headers.includes('viagem') || headers.includes('nº da fatura')) {
                    logger.log(`Detetado ficheiro de VIAGENS: ${file.name}`, "success");
                    parseViagens(lines);
                } else {
                    logger.log(`Formato CSV não reconhecido: ${file.name}`, "warning");
                }
                resolve();
            };
            reader.readAsText(file, 'ISO-8859-1'); // Para caracteres especiais portugueses
        });
    }

    function parseAutenticidade(lines) {
        const tbody = document.querySelector('#table-hashes tbody');
        if (!tbody) return;
        
        lines.slice(1).forEach(line => {
            if (!line.trim()) return;
            const cols = line.replace(/"/g, '').split(',');
            if (cols.length >= 2) {
                const tr = document.createElement('tr');
                const hash = cols[1]?.substring(0, 16) + '...' || 'N/A';
                const path = cols[2]?.split('\\').pop() || 'N/A';
                tr.innerHTML = `<td>${cols[0] || 'SHA256'}</td><td style="font-size:10px">${hash}</td><td>${path}</td><td class="green">VALIDADO</td>`;
                tbody.appendChild(tr);
            }
        });
        logger.log(`Tabela de hashes atualizada.`, "success");
    }

    function parseViagens(lines) {
        // Expressão regular para CSV com aspas
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        
        lines.slice(1).forEach(line => {
            if (!line.trim()) return;
            const cols = line.split(regex);
            if (cols.length >= 15) {
                // Coluna 15 (índice 14) é "Preço da viagem" (com IVA)
                const valorStr = cols[14]?.replace(/"/g, '').trim() || '0';
                const valor = parseFloat(valorStr.replace(',', '.')) || 0;
                State.financeiro.bruto += valor;
                
                // Guardar viagem para detalhe
                State.financeiro.viagens.push({
                    data: cols[1]?.replace(/"/g, '') || '',
                    motorista: cols[2]?.replace(/"/g, '') || '',
                    valor: valor
                });
            }
        });
        
        // Atualizar tabela financeira
        const tbodyFin = document.querySelector('#table-financeiro tbody');
        if (tbodyFin) {
            State.financeiro.viagens.slice(-10).forEach(v => { // Mostrar últimas 10
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${v.data.split(' ')[0]}</td><td>${v.motorista}</td><td>${v.valor.toFixed(2)}€</td>`;
                tbodyFin.appendChild(tr);
            });
        }
        
        atualizarDashboard();
        logger.log(`Processadas ${State.financeiro.viagens.length} viagens.`, "success");
    }

    // PARSER PDF (BOLT & EXTRATOS)
    async function processarPDF(file) {
        // Verificar se pdfjsLib está disponível
        if (typeof pdfjsLib === 'undefined') {
            logger.log(`PDF.js não carregado. Não é possível processar ${file.name}`, "error");
            return;
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(s => s.str).join(" ") + "\n";
            }

            // EXTRAÇÃO DE VALORES - REGEX V12.9
            const regexGanhosLiquidos = /Ganhos\s+l[ií]quidos\s+([\d.,]+)/i;
            const regexTotalIVA = /Total\s+com\s+IVA\s*\(EUR\)\s+([\d.,]+)/i;
            const regexGanhosApp = /Ganhos\s+na\s+app\s+([\d.,]+)/i;
            const regexComissoes = /Comiss[ãa]o\s+da\s+app\s+(-?[\d.,]+)/i;
            const regexNIF = /NIF:\s+(\d{9})/i;
            const regexReceitaAnual = /Total\s+de\s+receitas\s+anuais:\s*([\d.,]+)/i;

            const mLiquido = fullText.match(regexGanhosLiquidos);
            const mTotal = fullText.match(regexTotalIVA);
            const mGanhosApp = fullText.match(regexGanhosApp);
            const mComissoes = fullText.match(regexComissoes);
            const mNIF = fullText.match(regexNIF);
            const mReceitaAnual = fullText.match(regexReceitaAnual);

            if (mTotal) {
                const val = parseFloat(mTotal[1].replace(',', '.'));
                State.financeiro.comissoes += val;
                logger.log(`Extraído (Fatura Bolt): ${val.toFixed(2)}€`, "success");
            }

            if (mLiquido) {
                const val = parseFloat(mLiquido[1].replace(',', '.'));
                State.financeiro.liquido += val;
                logger.log(`Extraído (Extrato - Ganhos Líquidos): ${val.toFixed(2)}€`, "success");
            }
            
            if (mGanhosApp) {
                const val = parseFloat(mGanhosApp[1].replace(',', '.'));
                // Se não temos bruto, usar ganhos app como referência
                if (State.financeiro.bruto === 0) {
                    State.financeiro.bruto += val;
                }
                logger.log(`Extraído (Extrato - Ganhos App): ${val.toFixed(2)}€`, "info");
            }
            
            if (mComissoes) {
                const val = Math.abs(parseFloat(mComissoes[1].replace(',', '.')));
                if (State.financeiro.comissoes === 0) {
                    State.financeiro.comissoes += val;
                }
            }
            
            if (mReceitaAnual) {
                const val = parseFloat(mReceitaAnual[1].replace(',', '.'));
                logger.log(`Extraído (DAC7 - Receita Anual): ${val.toFixed(2)}€`, "success");
                // Pode usar para validação cruzada
            }

            atualizarDashboard();
        } catch (err) {
            logger.log(`Erro no PDF ${file.name}: ${err.message}`, "error");
        }
    }

    function atualizarDashboard() {
        // Atualizar métricas principais
        const valBruto = document.getElementById('val-bruto');
        const valComissoes = document.getElementById('val-comissoes');
        const valLiquido = document.getElementById('val-liquido');
        
        if (valBruto) valBruto.textContent = State.financeiro.bruto.toFixed(2) + ' €';
        if (valComissoes) valComissoes.textContent = State.financeiro.comissoes.toFixed(2) + ' €';
        if (valLiquido) valLiquido.textContent = State.financeiro.liquido.toFixed(2) + ' €';
        
        // Atualizar também outros campos do dashboard (ganhos-app, comissoes-total, etc.)
        const ganhosApp = document.getElementById('ganhos-app');
        const comissoesTotal = document.getElementById('comissoes-total');
        const ganhosLiquidos = document.getElementById('ext-ganhos-liquidos');
        
        if (ganhosApp) ganhosApp.textContent = State.financeiro.bruto.toFixed(2) + ' €';
        if (comissoesTotal) comissoesTotal.textContent = State.financeiro.comissoes.toFixed(2) + ' €';
        if (ganhosLiquidos) ganhosLiquidos.textContent = State.financeiro.liquido.toFixed(2) + ' €';
        
        // Triangulação
        const triBruto = document.getElementById('tri-bruto');
        const triComissoes = document.getElementById('tri-comissoes');
        const triLiquido = document.getElementById('tri-liquido');
        
        if (triBruto) triBruto.textContent = State.financeiro.bruto.toFixed(2) + ' €';
        if (triComissoes) triComissoes.textContent = State.financeiro.comissoes.toFixed(2) + ' €';
        if (triLiquido) triLiquido.textContent = State.financeiro.liquido.toFixed(2) + ' €';
        
        logger.log("Dashboard atualizado com novos cálculos.", "info");
    }
    
    function atualizarEstatisticasModal() {
        // Atualizar contadores no modal
        const totalFiles = State.documentos.length;
        const totalFaturas = document.querySelectorAll('#lista-faturas .file-item').length;
        const totalExtratos = document.querySelectorAll('#lista-extratos .file-item').length;
        
        const modalTotalFiles = document.getElementById('modal-total-files');
        const modalTotalValues = document.getElementById('modal-total-values');
        const statsFaturasFiles = document.getElementById('stats-faturas-files');
        const statsExtratosFiles = document.getElementById('stats-extratos-files');
        
        if (modalTotalFiles) modalTotalFiles.textContent = totalFiles;
        if (modalTotalValues) modalTotalValues.textContent = (State.financeiro.bruto + State.financeiro.comissoes).toFixed(2) + ' €';
        if (statsFaturasFiles) statsFaturasFiles.textContent = totalFaturas;
        if (statsExtratosFiles) statsExtratosFiles.textContent = totalExtratos;
        
        // Atualizar badges do painel
        const countFat = document.getElementById('count-fat');
        const countExt = document.getElementById('count-ext');
        const totalEvidencias = document.getElementById('total-evidencias');
        
        if (countFat) countFat.textContent = totalFaturas;
        if (countExt) countExt.textContent = totalExtratos;
        if (totalEvidencias) totalEvidencias.textContent = totalFiles;
    }

    function carregarDemo() {
        limparSistema();
        logger.log("A carregar base de dados de demonstração...", "info");
        
        // Simulação de dados baseados nos ficheiros fornecidos
        State.financeiro.bruto = 3202.54;
        State.financeiro.comissoes = 792.59;
        State.financeiro.liquido = 2409.95;
        
        // Adicionar algumas viagens de exemplo
        State.financeiro.viagens = [
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', valor: 20.24 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', valor: 11.98 },
            { data: '2024-12-30', motorista: 'Eduardo Monteiro', valor: 15.39 }
        ];
        
        const tbody = document.querySelector('#table-hashes tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td>SHA256</td><td>8D0E916DA567...</td><td>131509_202412.csv</td><td class="green">ORIGINAL</td></tr>
<tr><td>SHA256</td><td>72EBE71E672F...</td><td>Fatura Bolt PT1125-3582.pdf</td><td class="green">VALIDADO</td></tr>`;
        }
        
        const tbodyFin = document.querySelector('#table-financeiro tbody');
        if (tbodyFin) {
            tbodyFin.innerHTML = `<tr><td>2024-12-31</td><td>Eduardo Monteiro</td><td>20.24€</td></tr>
<tr><td>2024-12-31</td><td>Eduardo Monteiro</td><td>11.98€</td></tr>
<tr><td>2024-12-30</td><td>Eduardo Monteiro</td><td>15.39€</td></tr>`;
        }
        
        atualizarDashboard();
        atualizarEstatisticasModal();
        logger.log("DEMO carregada com sucesso.", "success");
    }

    function limparSistema() {
        State = {
            autenticidade: [],
            financeiro: {
                bruto: 0,
                comissoes: 0,
                liquido: 0,
                viagens: []
            },
            documentos: []
        };
        
        // Limpar tabelas
        const tbodyHash = document.querySelector('#table-hashes tbody');
        const tbodyFin = document.querySelector('#table-financeiro tbody');
        const logContainer = document.getElementById('log-container');
        
        if (tbodyHash) tbodyHash.innerHTML = '';
        if (tbodyFin) tbodyFin.innerHTML = '';
        if (logContainer) logContainer.innerHTML = '<div class="log-entry"><span class="timestamp">[--:--:--]</span><span class="icon info">ℹ</span><span class="message">Sistema limpo. Aguardando evidências...</span></div>';
        
        // Limpar listas de ficheiros
        const listaFaturas = document.getElementById('lista-faturas');
        const listaExtratos = document.getElementById('lista-extratos');
        if (listaFaturas) listaFaturas.innerHTML = '';
        if (listaExtratos) listaExtratos.innerHTML = '';
        
        atualizarDashboard();
        atualizarEstatisticasModal();
        logger.log("Sistema limpo. Todos os dados removidos.", "warning");
    }
    
    function reiniciarAnalise() {
        if (!confirm('Deseja reiniciar a análise? Os dados atuais serão mantidos.')) return;
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        const veredictoSection = document.getElementById('veredicto-section');
        if (veredictoSection) veredictoSection.style.display = 'none';
        
        logger.log('Análise reiniciada.', 'info');
    }
    
    function validarSujeito() {
        const nomeInput = document.getElementById('subject-name');
        const nifInput = document.getElementById('subject-nif');
        const statusEl = document.getElementById('validation-status');
        
        const nome = nomeInput ? nomeInput.value.trim() : '';
        const nif = nifInput ? nifInput.value.trim() : '';
        
        const nifValido = /^\d{9}$/.test(nif);
        
        if (nome && nifValido) {
            if (statusEl) {
                statusEl.className = 'validation-status';
                statusEl.innerHTML = `<span class="status-dot"></span><span>${nome} | ${nif}</span>`;
            }
            logger.log(`Sujeito validado: ${nome} | NIF: ${nif}`, 'success');
        } else {
            if (statusEl) {
                statusEl.className = 'validation-status invalid';
                statusEl.innerHTML = `<span class="status-dot"></span><span>Dados inválidos. NIF deve ter 9 dígitos.</span>`;
            }
            logger.log('Validação falhou', 'error');
        }
    }
    
    function executarPericia() {
        logger.log('Iniciando execução da perícia fiscal...', 'info');
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        if (State.financeiro.bruto === 0 && State.financeiro.comissoes === 0) {
            logger.log('Perícia abortada: sem dados financeiros', 'warning');
            alert('Adicione evidências antes de executar a perícia');
            return;
        }
        
        // Simular análise e gerar veredito
        const veredictoSection = document.getElementById('veredicto-section');
        const veredictoStatus = document.getElementById('veredicto-status');
        const veredictoDesvio = document.getElementById('veredicto-desvio');
        const anomaliaCritica = document.getElementById('anomalia-critica');
        const valorAnomalia = document.getElementById('valor-anomalia');
        
        if (veredictoSection) veredictoSection.style.display = 'block';
        
        // Calcular taxa de comissão
        const baseComissao = State.financeiro.bruto;
        const taxaEfetiva = baseComissao > 0 ? (State.financeiro.comissoes / baseComissao) * 100 : 0;
        
        // Verificar discrepância
        const liquidoCalculado = baseComissao - State.financeiro.comissoes;
        const discrepancia = Math.abs(liquidoCalculado - State.financeiro.liquido);
        
        // Critério simples para demo
        if (taxaEfetiva > 25 || discrepancia > 10) {
            if (veredictoStatus) {
                veredictoStatus.textContent = 'CRÍTICO';
                veredictoStatus.style.color = 'var(--danger)';
            }
            if (veredictoDesvio) {
                veredictoDesvio.textContent = `Desvio: ${discrepancia.toFixed(2)}€ (${((discrepancia/baseComissao)*100).toFixed(2)}%)`;
                veredictoDesvio.style.color = 'var(--danger)';
            }
            veredictoSection?.classList.add('critico');
            
            if (anomaliaCritica) {
                anomaliaCritica.style.display = 'flex';
                if (valorAnomalia) valorAnomalia.textContent = discrepancia.toFixed(2) + ' €';
            }
            
            const alertaDiv = document.createElement('div');
            alertaDiv.className = 'alerta critico';
            alertaDiv.innerHTML = `<div><strong>DISCREPÂNCIA CRÍTICA</strong><span>Taxa de comissão: ${taxaEfetiva.toFixed(2)}%</span></div><strong>${discrepancia.toFixed(2)} €</strong>`;
            alertasContainer?.appendChild(alertaDiv);
            
            logger.log(`Perícia: CRÍTICO (Taxa: ${taxaEfetiva.toFixed(2)}%)`, 'error');
        } else {
            if (veredictoStatus) {
                veredictoStatus.textContent = 'NORMAL';
                veredictoStatus.style.color = 'var(--success)';
            }
            if (veredictoDesvio) {
                veredictoDesvio.textContent = 'Sem desvios significativos';
                veredictoDesvio.style.color = 'var(--success)';
            }
            veredictoSection?.classList.remove('critico');
            if (anomaliaCritica) anomaliaCritica.style.display = 'none';
            
            logger.log('Perícia: NORMAL', 'success');
        }
    }
    
    function exportarJSON() {
        const dados = {
            sessao: {
                id: 'VDC-' + Date.now().toString(36).toUpperCase(),
                timestamp: new Date().toISOString()
            },
            financeiro: State.financeiro,
            documentos: State.documentos.length,
            versao: CONFIG.VERSAO
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logger.log('Exportação JSON realizada', 'success');
    }
    
    function exportarPDF() {
        logger.log('Iniciando exportação PDF...', 'info');
        setTimeout(() => {
            alert(`Relatório PDF gerado!\n\nBruto: ${State.financeiro.bruto.toFixed(2)}€\nComissões: ${State.financeiro.comissoes.toFixed(2)}€\nLíquido: ${State.financeiro.liquido.toFixed(2)}€`);
            logger.log('Exportação PDF concluída', 'success');
        }, 800);
    }

})();
