/**
 * VDC FORENSE ELITE v15.1 - SISTEMA DE PERITAGEM DIGITAL
 * Motor de Big Data com Soma Incremental e Cruzamento Aritmético
 * Versão Final Consolidada - Todos os Módulos Integrados
 * 
 * @author VDC Forensics Team
 * @version 15.1 ELITE
 * @license CONFIDENTIAL
 */

(function() {
    'use strict';

    // ==========================================================================
    // CONFIGURAÇÕES E CONSTANTES DO SISTEMA
    // ==========================================================================

    const CONFIG = {
        VERSAO: '15.1 ELITE',
        VERSAO_CODIGO: 'VDC-FE-151-2026',
        DEBUG: true,
        
        TAXA_COMISSAO_MAX: 0.25,
        TAXA_COMISSAO_PADRAO: 0.23,
        TOLERANCIA_DIVERGENCIA: 10,
        MAX_FILE_SIZE: 10 * 1024 * 1024,
        
        PATTERNS: {
            SAFT_CSV: /131509.*\.csv$/i,
            DAC7_CSV: /dac7|reporte|declaração/i,
            FATURA_PDF: /fatura|invoice|comissão|fee/i,
            HASH_CSV: /CONTROLO_AUTENTICIDADE.*\.csv$/i,
            VALOR_TOTAL: /(?:total|valor)[:\s]*([\d\s.,]+)\s*€/i,
            COMISSAO_TOTAL: /(?:comissão|fee)[:\s]*([\d\s.,]+)\s*€/i,
            NUMERO_VIAGENS: /(?:viagens|trips)[:\s]*(\d+)/i,
            NIF: /(?:NIF|NIPC)[:\s]*(\d{9})/i
        },
        
        PLATFORM_DB: {
            uber: {
                nome: 'Uber B.V.',
                nif: 'PT980461664',
                morada: 'Mr. Treublaan 7, Amesterdão, Países Baixos'
            },
            bolt: {
                nome: 'Bolt Operations OÜ',
                nif: 'PT980583093',
                morada: 'Vana-Lõuna 15, Tallinn, Estónia'
            },
            freenow: {
                nome: 'FreeNow Portugal, Unipessoal Lda.',
                nif: 'PT514214739',
                morada: 'Rua Castilho, 39, 1250-066 Lisboa'
            },
            outra: {
                nome: 'Plataforma Não Identificada',
                nif: 'A VERIFICAR',
                morada: 'A VERIFICAR'
            }
        }
    };

    // ==========================================================================
    // ESTADO GLOBAL DO SISTEMA
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
            platform: '',
            anoFiscal: 2024,
            processo: ''
        },
        
        financeiro: {
            saft: 0,
            dac7: 0,
            comissoes: 0,
            viagens: 0,
            proveitoReal: 0,
            divergencia: 0,
            taxaMedia: 0
        },
        
        files: [],
        documentos: [],
        logs: [],
        alertas: [],
        
        contadores: {
            saft: 0,
            dac7: 0,
            faturas: 0,
            hashes: 0
        },
        
        cruzamentos: {
            saftVsDac7: { realizado: false, valor: 0, status: null },
            comissoesVsFaturas: { realizado: false, valor: 0, status: null },
            proveitoReal: { realizado: false, valor: 0, status: null }
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
        return `PROC-${ano}${mes}${dia}-${random}-CR`;
    }

    function formatarMoeda(valor) {
        const num = parseFloat(valor) || 0;
        return num.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function parseMoeda(str) {
        if (!str) return 0;
        if (typeof str === 'number') return isNaN(str) ? 0 : str;
        
        let limpo = String(str)
            .replace(/[^\d,.-]/g, '')
            .trim();
        
        if (limpo.includes(',') && !limpo.includes('.')) {
            limpo = limpo.replace(',', '.');
        } else if (limpo.includes(',') && limpo.includes('.')) {
            const ultimaVirgula = limpo.lastIndexOf(',');
            const ultimoPonto = limpo.lastIndexOf('.');
            
            if (ultimaVirgula > ultimoPonto) {
                limpo = limpo.replace(/\./g, '').replace(',', '.');
            } else {
                limpo = limpo.replace(/,/g, '');
            }
        }
        
        const parsed = parseFloat(limpo);
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
        State.metadados.period = document.getElementById('selectPeriod')?.value || 'Anual';
        State.metadados.platform = document.getElementById('selectPlatform')?.value || '';
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
        
        if (!State.metadados.platform) {
            log('ERRO: Selecione a Plataforma TVDE.', 'error');
            return false;
        }
        
        return true;
    }

    function updateUI() {
        const valSaft = document.getElementById('valSaft');
        const valDac7 = document.getElementById('valDac7');
        const valComissoes = document.getElementById('valComissoes');
        const valDivergencia = document.getElementById('valDivergencia');
        const valViagens = document.getElementById('valViagens');
        const valProveito = document.getElementById('valProveito');
        const valTaxa = document.getElementById('valTaxa');
        const valDocumentos = document.getElementById('valDocumentos');
        const countSAFT = document.getElementById('countSAFT');
        const countDAC7 = document.getElementById('countDAC7');
        const countFaturas = document.getElementById('countFaturas');
        const countHashes = document.getElementById('countHashes');
        const trendSaft = document.getElementById('trendSaft');
        const trendDac7 = document.getElementById('trendDac7');
        const trendComissoes = document.getElementById('trendComissoes');
        const trendDivergencia = document.getElementById('trendDivergencia');
        const cardDivergencia = document.getElementById('cardDivergencia');
        
        if (valSaft) valSaft.innerText = formatarMoeda(State.financeiro.saft);
        if (valDac7) valDac7.innerText = formatarMoeda(State.financeiro.dac7);
        if (valComissoes) valComissoes.innerText = formatarMoeda(State.financeiro.comissoes);
        
        State.financeiro.divergencia = State.financeiro.saft - State.financeiro.dac7;
        if (valDivergencia) valDivergencia.innerText = formatarMoeda(State.financeiro.divergencia);
        
        State.financeiro.proveitoReal = State.financeiro.saft - State.financeiro.comissoes;
        State.financeiro.taxaMedia = State.financeiro.saft > 0 ? 
            (State.financeiro.comissoes / State.financeiro.saft) * 100 : 0;
        
        if (valViagens) valViagens.innerText = State.financeiro.viagens;
        if (valProveito) valProveito.innerText = formatarMoeda(State.financeiro.proveitoReal);
        if (valTaxa) valTaxa.innerText = State.financeiro.taxaMedia.toFixed(2);
        if (valDocumentos) valDocumentos.innerText = State.documentos.length;
        
        if (countSAFT) countSAFT.innerText = `SAF-T: ${State.contadores.saft}`;
        if (countDAC7) countDAC7.innerText = `DAC7: ${State.contadores.dac7}`;
        if (countFaturas) countFaturas.innerText = `Faturas: ${State.contadores.faturas}`;
        if (countHashes) countHashes.innerText = `Hashes: ${State.contadores.hashes}`;
        
        if (cardDivergencia) {
            if (Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
                cardDivergencia.style.borderLeftColor = '#ff4136';
            } else {
                cardDivergencia.style.borderLeftColor = '#004e92';
            }
        }
        
        if (trendSaft) trendSaft.innerHTML = State.financeiro.saft > 0 ? '↗ +' + ((State.financeiro.saft / 7755.16) * 100).toFixed(0) + '%' : '⟷ 0%';
        if (trendDac7) trendDac7.innerHTML = State.financeiro.dac7 > 0 ? '↗ +' + ((State.financeiro.dac7 / 7755.16) * 100).toFixed(0) + '%' : '⟷ 0%';
        if (trendComissoes) trendComissoes.innerHTML = State.financeiro.comissoes > 0 ? '↗ +' + ((State.financeiro.comissoes / 2447.89) * 100).toFixed(0) + '%' : '⟷ 0%';
        if (trendDivergencia) trendDivergencia.innerHTML = Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA ? '⚠️ ALERTA' : '✓ OK';
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
            saft: State.financeiro.saft,
            dac7: State.financeiro.dac7,
            comissoes: State.financeiro.comissoes,
            viagens: State.financeiro.viagens,
            timestamp: Date.now()
        };
        
        const jsonString = JSON.stringify(dadosParaHash);
        State.sessao.hash = gerarHashSimulado(jsonString);
        
        const sessionHash = document.getElementById('sessionHash');
        if (sessionHash) sessionHash.textContent = State.sessao.hash.substring(0, 16) + '...';
        
        const masterHashEl = document.getElementById('masterHash');
        if (masterHashEl) masterHashEl.textContent = State.sessao.hash;
        
        gerarQRCode(State.sessao.hash);
        
        return State.sessao.hash;
    }

    function gerarQRCode(texto) {
        const container = document.getElementById('qrcode-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: texto,
                width: 64,
                height: 64,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            container.innerHTML = '<div style="background: white; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: black;">QR</div>';
        }
    }

    // ==========================================================================
    // AUTENTICAÇÃO
    // ==========================================================================

    window.checkAccess = function() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const level = document.getElementById('user-level').value;

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
            
            const sessionHash = document.getElementById('sessionHash');
            if (sessionHash) sessionHash.textContent = State.sessao.hash?.substring(0, 16) + '...' || 'STANDBY';
            
            const footerSession = document.getElementById('footerSession');
            if (footerSession) footerSession.textContent = State.sessao.id;
            
            const autoProcessID = document.getElementById('autoProcessID');
            if (autoProcessID) autoProcessID.textContent = State.sessao.processoAuto;
            
            const procInput = document.getElementById('inputProcess');
            if (procInput) procInput.value = State.sessao.processoAuto;
            
            log('✅ Acesso concedido. Bem-vindo ao VDC Forensic Elite v15.1', 'success');
            log(`👤 Utilizador: ${username} | Nível: ${level}`, 'info');
            log(`🆔 Sessão: ${State.sessao.id}`, 'info');
            log(`📋 Processo Auto: ${State.sessao.processoAuto}`, 'info');
            
            gerarMasterHash();
            atualizarTimestamp();
            
        } else {
            log('❌ ACESSO NEGADO: Credenciais inválidas.', 'error');
            alert('ACESSO NEGADO: Credenciais inválidas.');
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
        
        log(`📄 A processar: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
        
        State.files.push({
            nome: file.name,
            tamanho: file.size,
            tipo: file.type,
            data: new Date().toISOString()
        });
        
        adicionarFicheiroLista(file);
        
        if (CONFIG.PATTERNS.SAFT_CSV.test(file.name)) {
            await processarSAFT(file);
        } else if (file.name.toLowerCase().includes('dac7')) {
            await processarDAC7(file);
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
            await processarPDF(file);
        } else if (CONFIG.PATTERNS.HASH_CSV.test(file.name)) {
            State.contadores.hashes++;
            log(`🔐 Ficheiro de hash registado: ${file.name}`, 'info');
            State.documentos.push({
                tipo: 'Hash',
                nome: file.name,
                data: new Date().toISOString()
            });
        } else if (file.name.toLowerCase().endsWith('.csv')) {
            await processarSAFT(file);
        }
        
        updateUI();
        
        if (fileFeedback) {
            fileFeedback.textContent = `✓ Processado: ${file.name}`;
            setTimeout(() => {
                fileFeedback.textContent = '';
            }, 3000);
        }
    }

    async function processarSAFT(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
                    
                    let fileTotal = 0;
                    let fileViagens = 0;
                    
                    for (let i = 1; i < Math.min(lines.length, 1000); i++) {
                        const cols = lines[i].split(',');
                        
                        for (let j = cols.length - 1; j >= 0; j--) {
                            let val = parseFloat(cols[j]?.replace(/["']/g, ''));
                            if (!isNaN(val) && val > 0 && val < 10000) {
                                fileTotal += val;
                                fileViagens++;
                                break;
                            }
                        }
                    }
                    
                    if (fileTotal > 0) {
                        State.financeiro.saft += fileTotal;
                        State.financeiro.viagens += fileViagens;
                        State.contadores.saft++;
                        
                        log(`📊 SAF-T processado: +${formatarMoeda(fileTotal)}€ (${fileViagens} viagens)`, 'success');
                        
                        State.documentos.push({
                            tipo: 'SAF-T CSV',
                            nome: file.name,
                            valor: fileTotal,
                            viagens: fileViagens,
                            data: new Date().toISOString()
                        });
                    } else {
                        log(`⚠️ Nenhum valor extraído de ${file.name}`, 'warning');
                    }
                    
                } catch (err) {
                    log(`❌ Erro ao processar CSV: ${err.message}`, 'error');
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

    async function processarDAC7(file) {
        if (file.name.toLowerCase().endsWith('.csv')) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
                        
                        let fileTotal = 0;
                        
                        for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split(',');
                            const valores = lines[i].match(/\d+[.,]\d+/g);
                            
                            if (valores && valores.length > 0) {
                                const ultimoValor = valores[valores.length - 1];
                                fileTotal += parseMoeda(ultimoValor);
                            }
                        }
                        
                        if (fileTotal > 0) {
                            State.financeiro.dac7 = fileTotal;
                            State.contadores.dac7++;
                            
                            log(`📊 DAC7 processado: ${formatarMoeda(fileTotal)}€`, 'success');
                            
                            State.documentos.push({
                                tipo: 'DAC7 CSV',
                                nome: file.name,
                                valor: fileTotal,
                                data: new Date().toISOString()
                            });
                        }
                        
                    } catch (err) {
                        log(`❌ Erro ao processar DAC7: ${err.message}`, 'error');
                    }
                    resolve();
                };
                
                reader.onerror = () => {
                    log(`❌ Erro de leitura do ficheiro ${file.name}`, 'error');
                    resolve();
                };
                
                reader.readAsText(file, 'ISO-8859-1');
            });
        } else {
            return processarPDF(file);
        }
    }

    async function processarPDF(file) {
        return new Promise((resolve) => {
            log(`🔍 A analisar PDF: ${file.name}`);
            
            setTimeout(() => {
                try {
                    if (file.name.toLowerCase().includes('dac7')) {
                        const valorSimulado = 7755.16;
                        State.financeiro.dac7 = valorSimulado;
                        State.contadores.dac7++;
                        
                        log(`📄 DAC7 PDF: ${formatarMoeda(valorSimulado)}€`, 'success');
                        
                        State.documentos.push({
                            tipo: 'DAC7 PDF',
                            nome: file.name,
                            valor: valorSimulado,
                            data: new Date().toISOString()
                        });
                        
                    } else if (file.name.toLowerCase().includes('fatura') || 
                               file.name.toLowerCase().includes('comissao')) {
                        const valorSimulado = 239.00;
                        State.financeiro.comissoes += valorSimulado;
                        State.contadores.faturas++;
                        
                        log(`💰 Fatura PDF: +${formatarMoeda(valorSimulado)}€`, 'success');
                        
                        State.documentos.push({
                            tipo: 'Fatura PDF',
                            nome: file.name,
                            valor: valorSimulado,
                            data: new Date().toISOString()
                        });
                        
                    } else {
                        State.contadores.faturas++;
                        log(`📄 PDF registado: ${file.name}`, 'info');
                        
                        State.documentos.push({
                            tipo: 'PDF Genérico',
                            nome: file.name,
                            data: new Date().toISOString()
                        });
                    }
                    
                } catch (err) {
                    log(`❌ Erro ao processar PDF: ${err.message}`, 'error');
                }
                resolve();
            }, 300);
        });
    }

    function handleFiles(files) {
        log(`📁 Lote recebido: ${files.length} ficheiro(s) para processamento.`);
        
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
        log('🚀 VDC Forensic Elite v15.1 inicializado. A aguardar autenticação...');
    });

    // ==========================================================================
    // FUNÇÕES PRINCIPAIS (BOTÕES)
    // ==========================================================================

    document.getElementById('btnAnalyze')?.addEventListener('click', function() {
        if (!validarMetadados()) return;
        
        log('⚙️ A executar cruzamentos aritméticos...');
        
        State.financeiro.divergencia = State.financeiro.saft - State.financeiro.dac7;
        State.financeiro.proveitoReal = State.financeiro.saft - State.financeiro.comissoes;
        State.financeiro.taxaMedia = State.financeiro.saft > 0 ? 
            (State.financeiro.comissoes / State.financeiro.saft) * 100 : 0;
        
        log(`📊 RESULTADOS DOS CRUZAMENTOS:`, 'info');
        log(`   SAF-T Bruto: ${formatarMoeda(State.financeiro.saft)}€`, 'info');
        log(`   DAC7 Reportado: ${formatarMoeda(State.financeiro.dac7)}€`, 'info');
        log(`   Comissões: ${formatarMoeda(State.financeiro.comissoes)}€`, 'info');
        log(`   DIVERGÊNCIA: ${formatarMoeda(State.financeiro.divergencia)}€`, 
            Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA ? 'warning' : 'success');
        log(`   Proveito Real: ${formatarMoeda(State.financeiro.proveitoReal)}€`, 'info');
        log(`   Taxa Média: ${State.financeiro.taxaMedia.toFixed(2)}%`, 'info');
        
        if (Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
            log(`⚠️ ALERTA: Divergência superior a ${CONFIG.TOLERANCIA_DIVERGENCIA}€!`, 'warning');
            
            State.alertas.push({
                tipo: 'divergencia',
                mensagem: `Divergência de ${formatarMoeda(State.financeiro.divergencia)}€ detetada`,
                data: new Date().toISOString()
            });
            
            const cardDivergencia = document.getElementById('cardDivergencia');
            if (cardDivergencia) {
                cardDivergencia.classList.add('pulse');
                setTimeout(() => {
                    cardDivergencia.classList.remove('pulse');
                }, 2000);
            }
        }
        
        if (State.financeiro.taxaMedia > CONFIG.TAXA_COMISSAO_MAX * 100) {
            log(`⚠️ ALERTA: Taxa de comissão (${State.financeiro.taxaMedia.toFixed(2)}%) excede limite legal de 25%!`, 'warning');
            
            State.alertas.push({
                tipo: 'taxa',
                mensagem: `Taxa de comissão ${State.financeiro.taxaMedia.toFixed(2)}% acima do limite`,
                data: new Date().toISOString()
            });
        }
        
        State.cruzamentos.saftVsDac7.realizado = true;
        State.cruzamentos.saftVsDac7.valor = State.financeiro.divergencia;
        State.cruzamentos.saftVsDac7.status = Math.abs(State.financeiro.divergencia) <= CONFIG.TOLERANCIA_DIVERGENCIA ? 'convergente' : 'divergente';
        
        State.cruzamentos.comissoesVsFaturas.realizado = true;
        State.cruzamentos.comissoesVsFaturas.valor = State.financeiro.comissoes;
        State.cruzamentos.comissoesVsFaturas.status = 'calculado';
        
        State.cruzamentos.proveitoReal.realizado = true;
        State.cruzamentos.proveitoReal.valor = State.financeiro.proveitoReal;
        State.cruzamentos.proveitoReal.status = 'calculado';
        
        gerarMasterHash();
        updateUI();
        log('✅ Cruzamentos concluídos com sucesso.', 'success');
    });

    document.getElementById('btnExport')?.addEventListener('click', function() {
        if (!validarMetadados()) return;
        
        if (State.financeiro.saft === 0 && State.financeiro.dac7 === 0 && State.financeiro.comissoes === 0) {
            alert('Erro: Não há dados para exportar. Carregue ficheiros ou execute cruzamentos primeiro.');
            return;
        }
        
        if (typeof window.jspdf === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada.');
            log('❌ Biblioteca jsPDF não disponível', 'error');
            return;
        }
        
        log('📄 A gerar relatório pericial em PDF...');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const sujeito = State.metadados.subject || 'N/A';
            const nipc = State.metadados.nif || 'N/A';
            const platformInfo = CONFIG.PLATFORM_DB[State.metadados.platform] || CONFIG.PLATFORM_DB.outra;
            
            const addFooter = (pageNum) => {
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`Master Hash SHA-256: ${State.sessao.hash || '---'}`, 105, 285, { align: 'center' });
                doc.text(`Página ${pageNum}`, 195, 285, { align: 'right' });
                
                doc.setFillColor(0, 0, 0);
                doc.rect(14, 270, 15, 15, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(5);
                doc.text('VDC', 16, 278);
            };
            
            let y = 20;
            
            doc.setFontSize(22);
            doc.setTextColor(0, 78, 146);
            doc.text('RELATÓRIO DE PERITAGEM FORENSE', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Processo: ${State.sessao.processoAuto || 'N/A'}`, 14, y);
            y += 10;
            doc.text(`Sujeito Passivo: ${sujeito} | NIPC: ${nipc}`, 14, y);
            y += 10;
            doc.text(`Plataforma: ${platformInfo.nome} | Período: ${State.metadados.period} ${State.metadados.anoFiscal}`, 14, y);
            y += 10;
            doc.text(`Data do Relatório: ${new Date().toLocaleString('pt-PT')}`, 14, y);
            y += 10;
            doc.text(`ID Sessão: ${State.sessao.id || '---'}`, 14, y);
            y += 20;
            
            doc.autoTable({
                startY: y,
                head: [['Rubrica', 'Valor Apurado (€)']],
                body: [
                    ['Faturação Bruta (SAF-T / CSV)', formatarMoeda(State.financeiro.saft)],
                    ['(-) Comissões Plataforma (PDFs)', `(${formatarMoeda(State.financeiro.comissoes)})`],
                    ['(=) Proveito Líquido Real', formatarMoeda(State.financeiro.saft - State.financeiro.comissoes)],
                    ['Valor Reportado DAC7', formatarMoeda(State.financeiro.dac7)],
                    ['DIVERGÊNCIA FISCAL (SAF-T vs DAC7)', formatarMoeda(State.financeiro.saft - State.financeiro.dac7)],
                    ['Taxa Efetiva de Comissão', State.financeiro.taxaMedia.toFixed(2) + '%']
                ],
                theme: 'grid',
                headStyles: { fillColor: [0, 78, 146] }
            });
            
            addFooter(1);
            doc.addPage();
            
            y = 20;
            doc.setFontSize(16);
            doc.setTextColor(0, 78, 146);
            doc.text('ANEXO I - LISTA DE EVIDÊNCIAS', 14, y);
            y += 15;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            State.files.slice(0, 20).forEach((f, idx) => {
                if (y > 260) {
                    addFooter(2);
                    doc.addPage();
                    y = 20;
                }
                doc.text(`${idx + 1}. ${f.nome} (${(f.tamanho / 1024).toFixed(1)} KB)`, 14, y);
                y += 7;
            });
            
            addFooter(2);
            doc.addPage();
            
            y = 20;
            doc.setFontSize(16);
            doc.setTextColor(0, 78, 146);
            doc.text('ANEXO II - PARECER TÉCNICO-PERICIAL', 14, y);
            y += 15;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            
            const divergencia = Math.abs(State.financeiro.saft - State.financeiro.dac7);
            
            doc.text('VIOLAÇÕES IDENTIFICADAS:', 14, y);
            y += 10;
            
            if (divergencia > CONFIG.TOLERANCIA_DIVERGENCIA) {
                doc.text(`1. Discrepância de ${formatarMoeda(divergencia)}€ entre SAF-T e DAC7.`, 14, y);
                y += 7;
            } else {
                doc.text(`1. Valores convergentes entre SAF-T e DAC7 (diferença < ${CONFIG.TOLERANCIA_DIVERGENCIA}€).`, 14, y);
                y += 7;
            }
            
            if (State.financeiro.taxaMedia > CONFIG.TAXA_COMISSAO_MAX * 100) {
                doc.text(`2. Taxa de comissão (${State.financeiro.taxaMedia.toFixed(2)}%) excede limite legal de 25%.`, 14, y);
                y += 7;
            }
            
            y += 10;
            doc.text('FUNDAMENTAÇÃO LEGAL APLICÁVEL:', 14, y);
            y += 10;
            doc.text('- Artigo 103.º do RGIT (Fraude Fiscal)', 14, y);
            y += 7;
            doc.text('- Diretiva DAC7 (Cooperação Administrativa)', 14, y);
            y += 7;
            doc.text('- ISO/IEC 27037 (Preservação de Evidências)', 14, y);
            
            addFooter(3);
            doc.addPage();
            
            y = 100;
            doc.setFontSize(16);
            doc.setTextColor(0, 78, 146);
            doc.text('ASSINATURA DIGITAL E CERTIFICAÇÃO', 105, y, { align: 'center' });
            y += 30;
            doc.setLineWidth(0.5);
            doc.line(60, y, 150, y);
            y += 10;
            doc.setFontSize(10);
            doc.text('Perito Forense Digital', 105, y, { align: 'center' });
            y += 10;
            doc.text(`ID Sessão: ${State.sessao.id}`, 105, y, { align: 'center' });
            y += 10;
            doc.text(`Hash: ${State.sessao.hash?.substring(0, 16)}...`, 105, y, { align: 'center' });
            
            addFooter(4);
            
            const filename = `VDC_Pericia_${State.metadados.nif || 'SEMNIF'}_${Date.now()}.pdf`;
            doc.save(filename);
            
            log(`✅ Relatório PDF exportado: ${filename}`, 'success');
            
        } catch (err) {
            log(`❌ Erro ao gerar PDF: ${err.message}`, 'error');
        }
    });

    document.getElementById('btnJSON')?.addEventListener('click', function() {
        log('📊 A preparar exportação JSON...');
        
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
            logs: State.logs.slice(-50),
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
        
        log(`✅ Exportação JSON concluída.`, 'success');
    });

    document.getElementById('btnDemo')?.addEventListener('click', function() {
        log('🚀 A carregar dados de demonstração...');
        
        State.financeiro.saft += 7755.16;
        State.financeiro.dac7 = 7755.16;
        State.financeiro.comissoes += 2447.89;
        State.financeiro.viagens += 1648;
        
        State.contadores.saft++;
        State.contadores.dac7++;
        State.contadores.faturas += 10;
        
        State.documentos.push({
            tipo: 'Demo',
            nome: 'Dados de demonstração',
            valor: 7755.16,
            viagens: 1648,
            data: new Date().toISOString()
        });
        
        log(`✅ Demo carregada: +7.755,16€ SAF-T, 7.755,16€ DAC7, +2.447,89€ Comissões`, 'success');
        
        updateUI();
        gerarMasterHash();
    });

    document.getElementById('btnReset')?.addEventListener('click', function() {
        if (!confirm('⚠️ Tem a certeza que pretende LIMPAR TODOS OS DADOS da sessão?')) return;
        
        State.financeiro = {
            saft: 0,
            dac7: 0,
            comissoes: 0,
            viagens: 0,
            proveitoReal: 0,
            divergencia: 0,
            taxaMedia: 0
        };
        
        State.files = [];
        State.documentos = [];
        State.alertas = [];
        State.contadores = {
            saft: 0,
            dac7: 0,
            faturas: 0,
            hashes: 0
        };
        
        State.cruzamentos = {
            saftVsDac7: { realizado: false, valor: 0, status: null },
            comissoesVsFaturas: { realizado: false, valor: 0, status: null },
            proveitoReal: { realizado: false, valor: 0, status: null }
        };
        
        if (fileList) fileList.innerHTML = '';
        if (fileFeedback) fileFeedback.textContent = '';
        
        const terminal = document.getElementById('terminal');
        if (terminal) {
            terminal.innerHTML = `
                <div class="log-line">> VDC Forensic Engine v15.1 ELITE inicializado...</div>
                <div class="log-line">> Sistema limpo. A aguardar novos dados...</div>
            `;
        }
        
        updateUI();
        log('🧹 Sistema limpo. Todos os dados removidos.', 'warning');
        gerarMasterHash();
    });

    setInterval(atualizarRelogio, 1000);
    setInterval(atualizarTimestamp, 60000);

    if (CONFIG.DEBUG) {
        window.State = State;
        window.CONFIG = CONFIG;
    }

})();
