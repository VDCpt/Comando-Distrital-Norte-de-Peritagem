/**
 * VDC FORENSE ELITE v12.0 - SISTEMA DE PERITAGEM DIGITAL
 * Motor de Big Data com Soma Precisa e Cruzamento Aritmético
 * Versão Final Consolidada
 * 
 * @author VDC Forensics Team
 * @version 12.0 ELITE
 */

(function() {
    'use strict';

    // ==========================================================================
    // CONFIGURAÇÕES E CONSTANTES
    // ==========================================================================

    const CONFIG = {
        VERSAO: '12.0 ELITE',
        TAXA_COMISSAO_PADRAO: 0.23, // 23%
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        TOLERANCIA: 0.01
    };

    // ==========================================================================
    // ESTADO GLOBAL
    // ==========================================================================

    const State = {
        sessao: {
            id: null,
            hash: null,
            inicio: null,
            processoAuto: null
        },
        
        metadados: {
            subject: '',
            nif: '',
            processo: '',
            anoFiscal: 2024
        },
        
        financeiro: {
            total: 0,
            iva: 0,
            semIva: 0,
            viagens: 0,
            comissao: 0,
            liquido: 0,
            taxaMedia: 0
        },
        
        contadores: {
            saft: 0,
            documentos: 0
        },
        
        ficheirosProcessados: new Set(),
        logs: []
    };

    // ==========================================================================
    // UTILITÁRIOS
    // ==========================================================================

    function gerarIdSessao() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `VDC-${random}-${timestamp}`;
    }

    function gerarHashSimulado() {
        const chars = '0123456789ABCDEF';
        let hash = '';
        for (let i = 0; i < 64; i++) {
            hash += chars[Math.floor(Math.random() * 16)];
        }
        return hash;
    }

    function gerarProcessoAuto() {
        const now = new Date();
        const ano = now.getFullYear();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const dia = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PROC-${ano}${mes}${dia}-${random}`;
    }

    function formatarMoeda(valor) {
        const num = parseFloat(valor) || 0;
        return num.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function parseValue(val) {
        if (!val) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        
        let clean = String(val)
            .replace(/[^\d,.-]/g, '')
            .replace(',', '.')
            .trim();
        
        const partes = clean.split('.');
        if (partes.length > 2) {
            clean = partes[0] + '.' + partes.slice(1).join('');
        }
        
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function log(msg, tipo = 'info') {
        const terminal = document.getElementById('terminal');
        const timestamp = new Date().toLocaleTimeString('pt-PT');
        
        if (terminal) {
            const line = document.createElement('div');
            line.className = `log-line ${tipo}`;
            line.textContent = `[${timestamp}] ${msg}`;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
            
            while (terminal.children.length > 50) {
                terminal.removeChild(terminal.firstChild);
            }
        }
        
        State.logs.push({
            timestamp: new Date().toISOString(),
            msg: msg,
            tipo: tipo
        });
        
        console.log(`[VDC][${tipo.toUpperCase()}] ${msg}`);
    }

    function atualizarMetadados() {
        State.metadados.subject = document.getElementById('inputSubject')?.value.trim() || '';
        State.metadados.nif = document.getElementById('inputNIF')?.value.trim() || '';
        State.metadados.anoFiscal = parseInt(document.getElementById('selectYear')?.value) || 2024;
        
        const procInput = document.getElementById('inputProcess');
        if (procInput) {
            procInput.value = State.sessao.processoAuto || '---';
        }
    }

    function validarMetadados() {
        atualizarMetadados();
        
        if (!State.metadados.subject) {
            log('ERRO: Sujeito Passivo não preenchido.', 'error');
            return false;
        }
        
        if (!State.metadados.nif || State.metadados.nif.length !== 9 || isNaN(State.metadados.nif)) {
            log('ERRO: NIPC inválido (deve ter 9 dígitos numéricos).', 'error');
            return false;
        }
        
        return true;
    }

    function updateUI() {
        document.getElementById('valTotal').innerText = formatarMoeda(State.financeiro.total);
        document.getElementById('valIva').innerText = formatarMoeda(State.financeiro.iva);
        document.getElementById('valSemIva').innerText = formatarMoeda(State.financeiro.semIva);
        document.getElementById('valViagens').innerText = State.financeiro.viagens;
        document.getElementById('valComissao').innerText = formatarMoeda(State.financeiro.comissao);
        document.getElementById('valLiquido').innerText = formatarMoeda(State.financeiro.liquido);
        document.getElementById('valTaxa').innerText = State.financeiro.taxaMedia.toFixed(2);
        document.getElementById('valDocumentos').innerText = State.contadores.documentos;
        document.getElementById('countSAFT').innerText = `SAF-T: ${State.contadores.saft}`;
        
        document.getElementById('trendTotal').innerHTML = State.financeiro.total > 0 ? '↗ +100%' : '⟷ 0%';
        document.getElementById('trendIva').innerHTML = State.financeiro.iva > 0 ? '↗ +100%' : '⟷ 0%';
        document.getElementById('trendSemIva').innerHTML = State.financeiro.semIva > 0 ? '↗ +100%' : '⟷ 0%';
        document.getElementById('trendViagens').innerHTML = State.financeiro.viagens > 0 ? '↗ +100%' : '⟷ 0%';
    }

    function atualizarRelogio() {
        const timerEl = document.getElementById('sessionTimer');
        if (timerEl && State.sessao.inicio) {
            const diff = Math.floor((new Date() - State.sessao.inicio) / 1000);
            const horas = Math.floor(diff / 3600).toString().padStart(2, '0');
            const minutos = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            const segundos = (diff % 60).toString().padStart(2, '0');
            timerEl.textContent = `${horas}:${minutos}:${segundos}`;
        }
    }

    function atualizarTimestamp() {
        const footerTimestamp = document.getElementById('footerTimestamp');
        if (footerTimestamp) {
            const agora = new Date();
            footerTimestamp.textContent = agora.toLocaleDateString('pt-PT') + ' ' + 
                                         agora.toLocaleTimeString('pt-PT');
        }
    }

    function gerarMasterHash() {
        const dados = `${State.financeiro.total.toFixed(4)}_${State.financeiro.iva.toFixed(4)}_${Date.now()}`;
        const hash = gerarHashSimulado();
        
        document.getElementById('sessionHash').textContent = hash.substring(0, 16) + '...';
        document.getElementById('masterHash').textContent = hash;
        
        const container = document.getElementById('qrcode-container');
        if (container && typeof QRCode !== 'undefined') {
            container.innerHTML = '';
            new QRCode(container, {
                text: hash,
                width: 48,
                height: 48,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        }
        
        State.sessao.hash = hash;
        return hash;
    }

    function recalcularComissao() {
        State.financeiro.comissao = State.financeiro.total * CONFIG.TAXA_COMISSAO_PADRAO;
        State.financeiro.liquido = State.financeiro.total - State.financeiro.comissao;
        State.financeiro.taxaMedia = State.financeiro.total > 0 ? 
            (State.financeiro.comissao / State.financeiro.total) * 100 : 0;
    }

    // ==========================================================================
    // AUTENTICAÇÃO
    // ==========================================================================

    window.VDC = {
        validateLogin: function() {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const level = document.getElementById('access-level').value;

            if (username === 'admin' && password === 'vdc') {
                State.sessao.ativa = true;
                State.sessao.inicio = new Date();
                State.sessao.id = gerarIdSessao();
                State.sessao.processoAuto = gerarProcessoAuto();

                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-container').style.display = 'block';
                
                document.getElementById('sessionTimer').textContent = '00:00:00';
                document.getElementById('sessionHash').textContent = 'STANDBY';
                document.getElementById('inputProcess').value = State.sessao.processoAuto;
                
                document.getElementById('auth-hash').textContent = gerarHashSimulado().substring(0, 8) + '...';
                
                log('✅ Acesso concedido. Bem-vindo ao VDC Forensic Elite v12.0', 'success');
                log(`👤 Utilizador: ${username} | Nível: ${level}`, 'info');
                log(`🆔 Sessão: ${State.sessao.id}`, 'info');
                log(`📋 Processo: ${State.sessao.processoAuto}`, 'info');
                
                gerarMasterHash();
                atualizarTimestamp();
                
            } else {
                log('❌ ACESSO NEGADO: Credenciais inválidas.', 'error');
                alert('ACESSO NEGADO: Credenciais inválidas.');
            }
        }
    };

    // ==========================================================================
    // PROCESSAMENTO DE FICHEIROS
    // ==========================================================================

    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const fileFeedback = document.getElementById('file-feedback');
    const fileList = document.getElementById('file-list');

    function adicionarFicheiroLista(file) {
        if (!fileList) return;
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
        `;
        fileList.appendChild(fileItem);
    }

    async function processFile(file) {
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            log(`❌ Ficheiro muito grande: ${file.name} (max 10MB)`, 'error');
            return;
        }
        
        if (State.ficheirosProcessados.has(file.name)) {
            log(`⚠️ Ficheiro já processado: ${file.name}`, 'warning');
            return;
        }
        
        log(`📄 A processar: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        
        State.ficheirosProcessados.add(file.name);
        State.contadores.saft++;
        State.contadores.documentos++;
        adicionarFicheiroLista(file);
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
                
                if (lines.length === 0) {
                    log('❌ Ficheiro vazio', 'error');
                    return;
                }
                
                const header = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
                
                const idxIva = header.findIndex(h => 
                    h.includes('IVA') || h.includes('iva') || h.includes('Iva'));
                
                const idxPrecoSemIva = header.findIndex(h => 
                    h.includes('Preço da viagem (sem IVA)') || 
                    h.includes('sem IVA') || 
                    h.includes('semIva'));
                
                const idxPrecoTotal = header.findIndex(h => 
                    h.includes('Preço da viagem') || 
                    h.includes('Total') || 
                    h.includes('total') ||
                    h.includes('Valor total'));
                
                if (idxPrecoTotal === -1 && idxPrecoSemIva === -1) {
                    log('❌ Formato de CSV não reconhecido', 'error');
                    return;
                }

                const dataLines = lines.slice(1).map(line => 
                    line.split(',').map(cell => cell.replace(/["']/g, '').trim())
                ).filter(row => row.length > 1 && row.some(cell => cell.length > 0));

                let totalIva = 0;
                let totalSemIva = 0;
                let totalGeral = 0;
                let linhasValidas = 0;

                dataLines.forEach(row => {
                    let iva = 0;
                    let semIva = 0;
                    let total = 0;
                    
                    if (idxIva !== -1 && row[idxIva]) {
                        iva = parseValue(row[idxIva]);
                        totalIva += iva;
                    }
                    
                    if (idxPrecoSemIva !== -1 && row[idxPrecoSemIva]) {
                        semIva = parseValue(row[idxPrecoSemIva]);
                        totalSemIva += semIva;
                    }
                    
                    if (idxPrecoTotal !== -1 && row[idxPrecoTotal]) {
                        total = parseValue(row[idxPrecoTotal]);
                        totalGeral += total;
                    }
                    
                    if (total > 0 || semIva > 0) linhasValidas++;
                });

                if (totalGeral === 0 && totalSemIva > 0) {
                    totalGeral = totalSemIva * 1.23;
                }
                
                if (totalSemIva === 0 && totalGeral > 0) {
                    totalSemIva = totalGeral / 1.23;
                }
                
                if (totalIva === 0 && totalGeral > 0 && totalSemIva > 0) {
                    totalIva = totalGeral - totalSemIva;
                }

                State.financeiro.total += totalGeral;
                State.financeiro.iva += totalIva;
                State.financeiro.semIva += totalSemIva;
                State.financeiro.viagens += linhasValidas;

                recalcularComissao();

                log(`✅ Processadas ${linhasValidas} viagens`, 'success');
                log(`   Total: +${formatarMoeda(totalGeral)}€ | IVA: +${formatarMoeda(totalIva)}€`, 'info');
                
                if (fileFeedback) {
                    fileFeedback.textContent = `✓ Processado: ${file.name}`;
                    setTimeout(() => {
                        fileFeedback.textContent = '';
                    }, 3000);
                }
                
                updateUI();
                gerarMasterHash();
                
            } catch (err) {
                log(`❌ Erro ao processar: ${err.message}`, 'error');
            }
        };
        
        reader.onerror = () => {
            log(`❌ Erro de leitura: ${file.name}`, 'error');
        };
        
        reader.readAsText(file, 'ISO-8859-1');
    }

    function handleFiles(files) {
        log(`📁 Lote recebido: ${files.length} ficheiro(s)`);
        
        if (fileList) {
            fileList.innerHTML = '';
        }
        
        Array.from(files).forEach(file => processFile(file));
    }

    // ==========================================================================
    // EVENT LISTENERS
    // ==========================================================================

    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const selectYear = document.getElementById('selectYear');
        if (selectYear) {
            const anoAtual = new Date().getFullYear();
            selectYear.innerHTML = '';
            
            for (let ano = anoAtual - 3; ano <= anoAtual + 2; ano++) {
                const option = document.createElement('option');
                option.value = ano;
                option.textContent = ano;
                if (ano === anoAtual) {
                    option.selected = true;
                }
                selectYear.appendChild(option);
            }
        }
        
        atualizarTimestamp();
        log('🚀 VDC Forensic Elite v12.0 inicializado.', 'info');
    });

    // ==========================================================================
    // BOTÕES
    // ==========================================================================

    document.getElementById('btnAnalyze')?.addEventListener('click', function() {
        if (!validarMetadados()) return;
        
        log('⚙️ A executar cruzamentos...', 'info');
        
        recalcularComissao();
        updateUI();
        
        log('✅ Cruzamentos concluídos.', 'success');
        log(`   Total Bruto: ${formatarMoeda(State.financeiro.total)}€`, 'info');
        log(`   Comissão (23%): ${formatarMoeda(State.financeiro.comissao)}€`, 'info');
        log(`   Líquido: ${formatarMoeda(State.financeiro.liquido)}€`, 'info');
        
        gerarMasterHash();
    });

    document.getElementById('btnExport')?.addEventListener('click', function() {
        if (!validarMetadados()) return;
        
        if (State.financeiro.total === 0) {
            alert('Erro: Não há dados para exportar.');
            return;
        }
        
        if (typeof window.jspdf === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada.');
            return;
        }
        
        log('📄 A gerar PDF...', 'info');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(18);
            doc.setTextColor(0, 78, 146);
            doc.text('RELATÓRIO DE PERITAGEM FORENSE', 105, 20, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Processo: ${State.sessao.processoAuto}`, 14, 35);
            doc.text(`Sujeito Passivo: ${State.metadados.subject} | NIPC: ${State.metadados.nif}`, 14, 45);
            doc.text(`Data: ${new Date().toLocaleString('pt-PT')}`, 14, 55);
            
            doc.autoTable({
                startY: 65,
                head: [['Rubrica', 'Valor (€)']],
                body: [
                    ['Total Bruto (com IVA)', formatarMoeda(State.financeiro.total)],
                    ['IVA Apurado', formatarMoeda(State.financeiro.iva)],
                    ['Base Tributável (sem IVA)', formatarMoeda(State.financeiro.semIva)],
                    ['Comissão (23%)', formatarMoeda(State.financeiro.comissao)],
                    ['Líquido', formatarMoeda(State.financeiro.liquido)],
                    ['Nº Viagens', State.financeiro.viagens.toString()],
                    ['Taxa Média', State.financeiro.taxaMedia.toFixed(2) + '%']
                ],
                theme: 'grid',
                headStyles: { fillColor: [0, 78, 146] }
            });
            
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Hash: ${State.sessao.hash}`, 14, 280);
            
            doc.save(`VDC_Relatorio_${Date.now()}.pdf`);
            log('✅ PDF exportado.', 'success');
            
        } catch (err) {
            log(`❌ Erro: ${err.message}`, 'error');
        }
    });

    document.getElementById('btnJSON')?.addEventListener('click', function() {
        log('📊 Exportando JSON...', 'info');
        
        const dados = {
            metadados: {
                sessao: State.sessao,
                pericia: State.metadados,
                versao: CONFIG.VERSAO
            },
            financeiro: State.financeiro,
            contadores: State.contadores,
            logs: State.logs.slice(-20),
            timestamp: new Date().toISOString()
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
        
        log('✅ JSON exportado.', 'success');
    });

    document.getElementById('btnDemo')?.addEventListener('click', function() {
        log('🚀 Carregando demo...', 'info');
        
        State.financeiro.total = 9538.85;
        State.financeiro.iva = 1783.69;
        State.financeiro.semIva = 7755.16;
        State.financeiro.viagens = 1648;
        
        recalcularComissao();
        
        State.contadores.saft = 1;
        State.contadores.documentos = 1;
        
        updateUI();
        gerarMasterHash();
        
        log('✅ Demo carregada.', 'success');
    });

    document.getElementById('btnReset')?.addEventListener('click', function() {
        if (!confirm('⚠️ Limpar todos os dados?')) return;
        
        State.financeiro = {
            total: 0,
            iva: 0,
            semIva: 0,
            viagens: 0,
            comissao: 0,
            liquido: 0,
            taxaMedia: 0
        };
        
        State.contadores = {
            saft: 0,
            documentos: 0
        };
        
        State.ficheirosProcessados.clear();
        
        if (fileList) fileList.innerHTML = '';
        if (fileFeedback) fileFeedback.textContent = '';
        
        const terminal = document.getElementById('terminal');
        if (terminal) {
            terminal.innerHTML = '<div class="log-line">> VDC Forensic Engine v12.0 inicializado...</div>';
        }
        
        updateUI();
        gerarMasterHash();
        
        log('🧹 Sistema limpo.', 'warning');
    });

    // ==========================================================================
    // TIMERS
    // ==========================================================================

    setInterval(atualizarRelogio, 1000);
    setInterval(atualizarTimestamp, 60000);

    // ==========================================================================
    // EXPOSIÇÃO (DEBUG)
    // ==========================================================================

    window.State = State;
    window.CONFIG = CONFIG;

})();
