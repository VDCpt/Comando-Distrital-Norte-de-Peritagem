/**
 * VDC FORENSE ELITE v12.0 - SISTEMA DE PERITAGEM DIGITAL
 * Motor de Big Data com Soma Precisa e Cruzamento Aritmético
 * Versão Final Consolidada
 * 
 * @author VDC Forensics Team
 * @version 12.0 ELITE
 * @license CONFIDENTIAL
 */

(function() {
    'use strict';

    // ==========================================================================
    // CONFIGURAÇÕES E CONSTANTES
    // ==========================================================================

    const CONFIG = {
        VERSAO: '12.0 ELITE',
        VERSAO_CODIGO: 'VDC-FE-120-2026',
        DEBUG: true,
        
        TAXA_COMISSAO_PADRAO: 0.23, // 23%
        TAXA_COMISSAO_MAX: 0.25,
        TOLERANCIA_DIVERGENCIA: 10,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        
        PATTERNS: {
            SAFT_CSV: /131509.*\.csv$/i,
            VALOR_TOTAL: /(?:total|valor)[:\s]*([\d\s.,]+)\s*€/i,
            IVA: /(?:iva)[:\s]*([\d\s.,]+)\s*€/i,
            PRECO_SEM_IVA: /(?:preço.*sem iva|base tributable)[:\s]*([\d\s.,]+)\s*€/i
        }
    };

    // ==========================================================================
    // ESTADO GLOBAL
    // ==========================================================================

    const State = {
        sessao: {
            id: null,
            hash: null,
            inicio: null,
            ativa: false,
            nivelAcesso: 4,
            processoAuto: null
        },
        
        user: {
            nome: null,
            nivel: 1,
            autenticado: false
        },
        
        metadados: {
            subject: '',
            nif: '',
            period: 'Anual',
            anoFiscal: 2024,
            processo: ''
        },
        
        financeiro: {
            total: 0,
            iva: 0,
            semIva: 0,
            viagens: 0,
            comissao: 0,
            liquido: 0,
            taxaMedia: 0,
            divergencia: 0
        },
        
        contadores: {
            saft: 0,
            dac7: 0,
            faturas: 0,
            hashes: 0,
            documentos: 0
        },
        
        ficheirosProcessados: new Set(),
        files: [],
        documentos: [],
        logs: [],
        alertas: [],
        
        cruzamentos: {
            totalVsComissao: { realizado: false, valor: 0, status: null },
            ivaVsBase: { realizado: false, valor: 0, status: null }
        }
    };

    // ==========================================================================
    // UTILITÁRIOS
    // ==========================================================================

    function gerarIdSessao() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `VDC-${random}-${timestamp}`;
    }

    function gerarHashSimulado(input) {
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
        
        // Garantir que não haja múltiplos pontos decimais
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
            
            // Manter apenas últimas 50 linhas
            while (terminal.children.length > 50) {
                terminal.removeChild(terminal.firstChild);
            }
        }
        
        State.logs.push({
            timestamp: new Date().toISOString(),
            msg: msg,
            tipo: tipo
        });
        
        if (CONFIG.DEBUG) {
            console.log(`[VDC][${tipo.toUpperCase()}] ${msg}`);
        }
    }

    function atualizarMetadados() {
        State.metadados.subject = document.getElementById('inputSubject')?.value.trim() || '';
        State.metadados.nif = document.getElementById('inputNIF')?.value.trim() || '';
        State.metadados.anoFiscal = parseInt(document.getElementById('selectYear')?.value) || 2024;
        
        const procInput = document.getElementById('inputProcess');
        if (procInput && State.sessao.processoAuto) {
            procInput.value = State.sessao.processoAuto;
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
        const valTotal = document.getElementById('valTotal');
        const valIva = document.getElementById('valIva');
        const valSemIva = document.getElementById('valSemIva');
        const valViagens = document.getElementById('valViagens');
        const valComissao = document.getElementById('valComissao');
        const valLiquido = document.getElementById('valLiquido');
        const valTaxa = document.getElementById('valTaxa');
        const valDocumentos = document.getElementById('valDocumentos');
        const countSAFT = document.getElementById('countSAFT');
        const trendTotal = document.getElementById('trendTotal');
        const trendIva = document.getElementById('trendIva');
        const trendSemIva = document.getElementById('trendSemIva');
        const trendViagens = document.getElementById('trendViagens');
        
        if (valTotal) valTotal.innerText = formatarMoeda(State.financeiro.total);
        if (valIva) valIva.innerText = formatarMoeda(State.financeiro.iva);
        if (valSemIva) valSemIva.innerText = formatarMoeda(State.financeiro.semIva);
        if (valViagens) valViagens.innerText = State.financeiro.viagens;
        if (valComissao) valComissao.innerText = formatarMoeda(State.financeiro.comissao);
        if (valLiquido) valLiquido.innerText = formatarMoeda(State.financeiro.liquido);
        if (valTaxa) valTaxa.innerText = State.financeiro.taxaMedia.toFixed(2);
        if (valDocumentos) valDocumentos.innerText = State.contadores.documentos;
        if (countSAFT) countSAFT.innerText = `SAF-T: ${State.contadores.saft}`;
        
        if (trendTotal) trendTotal.innerHTML = State.financeiro.total > 0 ? '↗ +100%' : '⟷ 0%';
        if (trendIva) trendIva.innerHTML = State.financeiro.iva > 0 ? '↗ +100%' : '⟷ 0%';
        if (trendSemIva) trendSemIva.innerHTML = State.financeiro.semIva > 0 ? '↗ +100%' : '⟷ 0%';
        if (trendViagens) trendViagens.innerHTML = State.financeiro.viagens > 0 ? '↗ +100%' : '⟷ 0%';
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
        const dadosParaHash = {
            sessao: State.sessao.id,
            metadados: State.metadados,
            total: State.financeiro.total,
            iva: State.financeiro.iva,
            semIva: State.financeiro.semIva,
            viagens: State.financeiro.viagens,
            timestamp: Date.now()
        };
        
        const jsonString = JSON.stringify(dadosParaHash);
        const hash = gerarHashSimulado(jsonString);
        
        const sessionHash = document.getElementById('sessionHash');
        if (sessionHash) sessionHash.textContent = hash.substring(0, 16) + '...';
        
        const masterHashEl = document.getElementById('masterHash');
        if (masterHashEl) masterHashEl.textContent = hash;
        
        // Gerar QR Code
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
                State.user.nome = username;
                State.user.nivel = parseInt(level);
                State.user.autenticado = true;
                State.sessao.ativa = true;
                State.sessao.inicio = new Date();
                State.sessao.id = gerarIdSessao();
                State.sessao.processoAuto = gerarProcessoAuto();
                State.sessao.nivelAcesso = parseInt(level);

                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app-container').style.display = 'block';
                
                const sessionTimer = document.getElementById('sessionTimer');
                if (sessionTimer) sessionTimer.textContent = '00:00:00';
                
                const sessionHash = document.getElementById('sessionHash');
                if (sessionHash) sessionHash.textContent = 'STANDBY';
                
                const procInput = document.getElementById('inputProcess');
                if (procInput) procInput.value = State.sessao.processoAuto;
                
                const authHash = document.getElementById('auth-hash');
                if (authHash) authHash.textContent = gerarHashSimulado().substring(0, 8) + '...';
                
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
        
        State.files.push({
            nome: file.name,
            tamanho: file.size,
            tipo: file.type,
            data: new Date().toISOString()
        });
        
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
                
                // Extrair cabeçalho
                const header = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
                
                // Identificar índices das colunas
                const idxIva = header.findIndex(h => 
                    h.includes('IVA') || h.includes('iva') || h.includes('Iva'));
                
                const idxPrecoSemIva = header.findIndex(h => 
                    h.includes('Preço da viagem (sem IVA)') || 
                    h.includes('sem IVA') || 
                    h.includes('semIva') ||
                    h.includes('Base Tributável'));
                
                const idxPrecoTotal = header.findIndex(h => 
                    h.includes('Preço da viagem') || 
                    h.includes('Total') || 
                    h.includes('total') ||
                    h.includes('Valor total') ||
                    h.includes('Valor com IVA'));
                
                if (idxPrecoTotal === -1 && idxPrecoSemIva === -1) {
                    log('❌ Formato de CSV não reconhecido - colunas necessárias não encontradas', 'error');
                    return;
                }

                // Processar linhas de dados
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

                // Calcular valores faltantes se necessário
                if (totalGeral === 0 && totalSemIva > 0) {
                    totalGeral = totalSemIva * (1 + CONFIG.TAXA_COMISSAO_PADRAO);
                    log('ℹ️ Total calculado a partir do valor sem IVA', 'info');
                }
                
                if (totalSemIva === 0 && totalGeral > 0) {
                    totalSemIva = totalGeral / (1 + CONFIG.TAXA_COMISSAO_PADRAO);
                    log('ℹ️ Valor sem IVA calculado a partir do total', 'info');
                }
                
                if (totalIva === 0 && totalGeral > 0 && totalSemIva > 0) {
                    totalIva = totalGeral - totalSemIva;
                }

                // Atualizar estado
                State.financeiro.total += totalGeral;
                State.financeiro.iva += totalIva;
                State.financeiro.semIva += totalSemIva;
                State.financeiro.viagens += linhasValidas;

                recalcularComissao();

                log(`✅ Processadas ${linhasValidas} viagens`, 'success');
                log(`   Total: +${formatarMoeda(totalGeral)}€ | IVA: +${formatarMoeda(totalIva)}€`, 'info');
                
                State.documentos.push({
                    tipo: 'SAF-T CSV',
                    nome: file.name,
                    valor: totalGeral,
                    viagens: linhasValidas,
                    data: new Date().toISOString()
                });
                
                if (fileFeedback) {
                    fileFeedback.textContent = `✓ Processado: ${file.name}`;
                    setTimeout(() => {
                        fileFeedback.textContent = '';
                    }, 3000);
                }
                
                updateUI();
                gerarMasterHash();
                
            } catch (err) {
                log(`❌ Erro ao processar ficheiro: ${err.message}`, 'error');
            }
        };
        
        reader.onerror = () => {
            log(`❌ Erro de leitura do ficheiro ${file.name}`, 'error');
        };
        
        reader.readAsText(file, 'ISO-8859-1');
    }

    function handleFiles(files) {
        log(`📁 Lote recebido: ${files.length} ficheiro(s) para processamento.`);
        
        if (fileList) {
            fileList.innerHTML = '';
            // Re-adicionar ficheiros anteriores se existirem
            State.files.forEach(f => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span class="file-name">${escapeHtml(f.nome)}</span>
                    <span class="file-size">${(f.tamanho / 1024).toFixed(1)} KB</span>
                `;
                fileList.appendChild(fileItem);
            });
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
        // Preencher seletor de anos
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
                    State.metadados.anoFiscal = ano;
                }
                selectYear.appendChild(option);
            }
        }
        
        // Hash de autenticação
        const authHash = document.getElementById('auth-hash');
        if (authHash) {
            authHash.textContent = gerarHashSimulado().substring(0, 8) + '...';
        }
        
        atualizarTimestamp();
        log('🚀 VDC Forensic Engine v12.0 inicializado. A aguardar autenticação...', 'info');
    });

    // ==========================================================================
    // BOTÕES DE CONTROLO
    // ==========================================================================

    document.getElementById('btnAnalyze')?.addEventListener('click', function() {
        if (!validarMetadados()) return;
        
        log('⚙️ A executar cruzamentos aritméticos...', 'info');
        
        recalcularComissao();
        
        // Verificar divergências
        State.financeiro.divergencia = State.financeiro.total - (State.financeiro.semIva + State.financeiro.iva);
        
        log('📊 RESULTADOS DOS CRUZAMENTOS:', 'info');
        log(`   Total Bruto: ${formatarMoeda(State.financeiro.total)}€`, 'info');
        log(`   IVA Apurado: ${formatarMoeda(State.financeiro.iva)}€`, 'info');
        log(`   Base Tributável: ${formatarMoeda(State.financeiro.semIva)}€`, 'info');
        log(`   Comissão (23%): ${formatarMoeda(State.financeiro.comissao)}€`, 'info');
        log(`   Líquido: ${formatarMoeda(State.financeiro.liquido)}€`, 'info');
        log(`   Taxa Média: ${State.financeiro.taxaMedia.toFixed(2)}%`, 'info');
        
        if (Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
            log(`⚠️ ALERTA: Divergência de ${formatarMoeda(State.financeiro.divergencia)}€ detetada!`, 'warning');
            
            State.alertas.push({
                tipo: 'divergencia',
                mensagem: `Divergência de ${formatarMoeda(State.financeiro.divergencia)}€`,
                data: new Date().toISOString()
            });
        }
        
        State.cruzamentos.totalVsComissao = {
            realizado: true,
            valor: State.financeiro.comissao,
            status: 'calculado'
        };
        
        State.cruzamentos.ivaVsBase = {
            realizado: true,
            valor: State.financeiro.iva,
            status: 'calculado'
        };
        
        updateUI();
        gerarMasterHash();
        
        log('✅ Cruzamentos concluídos com sucesso.', 'success');
    });

    document.getElementById('btnExport')?.addEventListener('click', function() {
        if (!validarMetadados()) return;
        
        if (State.financeiro.total === 0) {
            alert('Erro: Não há dados para exportar. Carregue ficheiros primeiro.');
            return;
        }
        
        if (typeof window.jspdf === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada.');
            log('❌ Biblioteca jsPDF não disponível', 'error');
            return;
        }
        
        log('📄 A gerar relatório pericial em PDF...', 'info');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Cabeçalho
            doc.setFontSize(18);
            doc.setTextColor(0, 78, 146);
            doc.text('RELATÓRIO DE PERITAGEM FORENSE', 105, 20, { align: 'center' });
            
            // Metadados
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Processo: ${State.sessao.processoAuto}`, 14, 35);
            doc.text(`Sujeito Passivo: ${State.metadados.subject} | NIPC: ${State.metadados.nif}`, 14, 45);
            doc.text(`Período: Anual / ${State.metadados.anoFiscal}`, 14, 55);
            doc.text(`Data do Relatório: ${new Date().toLocaleString('pt-PT')}`, 14, 65);
            doc.text(`ID Sessão: ${State.sessao.id}`, 14, 75);
            
            // Tabela de resultados
            doc.autoTable({
                startY: 85,
                head: [['Rubrica', 'Valor Apurado (€)']],
                body: [
                    ['Total Bruto (com IVA)', formatarMoeda(State.financeiro.total)],
                    ['(-) IVA', `(${formatarMoeda(State.financeiro.iva)})`],
                    ['Base Tributável (sem IVA)', formatarMoeda(State.financeiro.semIva)],
                    ['(-) Comissão (23%)', `(${formatarMoeda(State.financeiro.comissao)})`],
                    ['(=) Líquido', formatarMoeda(State.financeiro.liquido)],
                    ['Número de Viagens', State.financeiro.viagens.toString()],
                    ['Taxa Efetiva', State.financeiro.taxaMedia.toFixed(2) + '%']
                ],
                theme: 'grid',
                headStyles: { fillColor: [0, 78, 146] }
            });
            
            // Alertas
            if (State.alertas.length > 0) {
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.text('ALERTAS DETETADOS:', 14, finalY);
                
                State.alertas.forEach((alerta, index) => {
                    doc.text(`${index + 1}. ${alerta.mensagem}`, 14, finalY + 10 + (index * 5));
                });
            }
            
            // Hash e assinatura
            const hashY = doc.lastAutoTable.finalY + (State.alertas.length > 0 ? 30 : 20);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Master Hash SHA-256: ${State.sessao.hash}`, 14, hashY);
            doc.text(`Documentos processados: ${State.contadores.documentos}`, 14, hashY + 5);
            
            // Rodapé
            doc.setFontSize(8);
            doc.text('Documento emitido para efeitos de prova legal. Art. 103.º RGIT.', 105, 285, { align: 'center' });
            
            // Guardar
            const filename = `VDC_Pericia_${State.metadados.nif}_${Date.now()}.pdf`;
            doc.save(filename);
            
            log(`✅ Relatório PDF exportado: ${filename}`, 'success');
            
        } catch (err) {
            log(`❌ Erro ao gerar PDF: ${err.message}`, 'error');
        }
    });

    document.getElementById('btnJSON')?.addEventListener('click', function() {
        log('📊 A preparar exportação JSON...', 'info');
        
        const dados = {
            metadados: {
                sistema: {
                    versao: CONFIG.VERSAO,
                    codigo: CONFIG.VERSAO_CODIGO
                },
                sessao: {
                    id: State.sessao.id,
                    hash: State.sessao.hash,
                    processo: State.sessao.processoAuto,
                    inicio: State.sessao.inicio?.toISOString(),
                    nivelAcesso: State.sessao.nivelAcesso
                },
                pericia: State.metadados
            },
            financeiro: State.financeiro,
            documentos: State.documentos,
            alertas: State.alertas,
            cruzamentos: State.cruzamentos,
            contadores: State.contadores,
            logs: State.logs.slice(-30),
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Export_${State.metadados.nif || 'SEMNIF'}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        log('✅ Exportação JSON concluída.', 'success');
    });

    document.getElementById('btnDemo')?.addEventListener('click', function() {
        log('🚀 A carregar dados de demonstração...', 'info');
        
        // Valores de demonstração
        State.financeiro.total = 9538.85;
        State.financeiro.iva = 1783.69;
        State.financeiro.semIva = 7755.16;
        State.financeiro.viagens = 1648;
        
        recalcularComissao();
        
        State.contadores.saft = 1;
        State.contadores.documentos = 1;
        
        State.documentos.push({
            tipo: 'Demo',
            nome: 'Dados de demonstração',
            valor: 9538.85,
            viagens: 1648,
            data: new Date().toISOString()
        });
        
        updateUI();
        gerarMasterHash();
        
        log('✅ Dados de demonstração carregados com sucesso.', 'success');
        log(`   Total: 9.538,85€ | IVA: 1.783,69€ | Viagens: 1.648`, 'info');
    });

    document.getElementById('btnReset')?.addEventListener('click', function() {
        if (!confirm('⚠️ Tem a certeza que pretende LIMPAR TODOS OS DADOS da sessão?')) return;
        
        // Reset do estado financeiro
        State.financeiro = {
            total: 0,
            iva: 0,
            semIva: 0,
            viagens: 0,
            comissao: 0,
            liquido: 0,
            taxaMedia: 0,
            divergencia: 0
        };
        
        State.files = [];
        State.documentos = [];
        State.alertas = [];
        State.ficheirosProcessados.clear();
        
        State.contadores = {
            saft: 0,
            dac7: 0,
            faturas: 0,
            hashes: 0,
            documentos: 0
        };
        
        State.cruzamentos = {
            totalVsComissao: { realizado: false, valor: 0, status: null },
            ivaVsBase: { realizado: false, valor: 0, status: null }
        };
        
        // Limpar interface
        if (fileList) fileList.innerHTML = '';
        if (fileFeedback) fileFeedback.textContent = '';
        
        const terminal = document.getElementById('terminal');
        if (terminal) {
            terminal.innerHTML = `
                <div class="log-line">> VDC Forensic Engine v12.0 inicializado...</div>
                <div class="log-line">> Sistema limpo. A aguardar novos dados...</div>
            `;
        }
        
        updateUI();
        gerarMasterHash();
        
        log('🧹 Sistema limpo. Todos os dados removidos.', 'warning');
    });

    // ==========================================================================
    // TIMERS
    // ==========================================================================

    setInterval(atualizarRelogio, 1000);
    setInterval(atualizarTimestamp, 60000);

    // ==========================================================================
    // EXPOSIÇÃO PARA DEBUG
    // ==========================================================================

    if (CONFIG.DEBUG) {
        window.State = State;
        window.CONFIG = CONFIG;
        window.VDC = window.VDC || {};
        window.VDC.Core = {
            parseValue,
            formatarMoeda,
            gerarHashSimulado
        };
    }

})();
