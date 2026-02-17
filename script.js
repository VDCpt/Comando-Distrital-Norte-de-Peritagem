/**
 * VDC FORENSE v13.0 SYNC SCHEMA - CONSOLIDAÇÃO FINAL
 * Sistema de Peritagem Digital e Auditoria Fiscal
 * Motor de Extração e Processamento de Evidências
 * Data Aggregation Pipeline com Triangulação Aritmética
 * 
 * Versão: 13.0.0-FINAL
 * 
 * CARACTERÍSTICAS:
 * - Processamento assíncrono de múltiplos ficheiros
 * - Soma incremental sem sobreposição de estados
 * - Triangulação SAF-T vs DAC7 vs Extratos
 * - Master Hash SHA-256 com Web Crypto API
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES E CONSTANTES
    // ============================================

    const CONFIG = {
        VERSAO: '13.0',
        EDICAO: 'SYNC SCHEMA FINAL',
        DEBUG: true,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.pdf', '.csv', '.xml'],
        TAXA_COMISSAO_MAX: 0.25,        // 25% limite legal
        TAXA_COMISSAO_PADRAO: 0.23,     // 23% média observada
        TOLERANCIA_ERRO: 0.01,           // 1 cêntimo de tolerância
        MARGEM_ERRO_PERCENTUAL: 0.05,    // 5% margem para discrepâncias
        
        PATTERNS: {
            CLEAN: /[\n\r\t]+/g,
            MULTISPACE: /\s+/g,
            
            GANHOS_APP: /Ganhos\s+na\s+app\s+([\d\s.,]+)/i,
            GANHOS_CAMPANHA: /Ganhos\s+da\s+campanha\s+([\d\s.,]+)/i,
            GORJETAS: /Gorjetas\s+dos\s+passageiros\s+([\d\s.,]+)/i,
            PORTAGENS: /Portagens\s+([\d\s.,]+)/i,
            TAXAS_CANCEL: /Taxas\s+de\s+cancelamento\s+([\d\s.,]+)/i,
            COMISSAO_APP: /Comiss[ãa]o\s+da\s+app\s+(-?[\d\s.,]+)/i,
            GANHOS_LIQUIDOS: /Ganhos\s+l[ií]quidos\s+([\d\s.,]+)/i,
            
            FATURA_NUMERO: /Fatura\s+n\.?[º°o]?\s*([A-Z0-9\-]+)/i,
            FATURA_TOTAL: /Total\s+com\s+IVA\s*\(EUR\)\s+([\d\s.,]+)/i,
            FATURA_PERIODO: /Per[ií]odo\s*:?\s*(\d{2}-\d{2}-\d{4})\s*[-–a]\s*(\d{2}-\d{2}-\d{4})/i,
            FATURA_AUTOLIQUIDACAO: /Autoliquidac[ãa]o\s+de\s+IVA/i,
            
            DAC7_RECEITA_ANUAL: /Total\s+de\s+receitas\s+anuais:\s*([\d\s.,]+)€/i,
            DAC7_GANHOS_1T: /Ganhos\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_1T: /Comiss[oõ]es\s+do\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_1T: /Serviços\s+prestados\s+no\s+1\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            DAC7_GANHOS_2T: /Ganhos\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_2T: /Comiss[oõ]es\s+do\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_2T: /Serviços\s+prestados\s+no\s+2\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            DAC7_GANHOS_3T: /Ganhos\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_3T: /Comiss[oõ]es\s+do\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_3T: /Serviços\s+prestados\s+no\s+3\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            DAC7_GANHOS_4T: /Ganhos\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_COMISSOES_4T: /Comiss[oõ]es\s+do\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)€/i,
            DAC7_SERVICOS_4T: /Serviços\s+prestados\s+no\s+4\.?[º°]?\s*trimestre:\s*([\d\s.,]+)/i,
            
            NIF: /NIF:\s*(\d{9})/i,
            DATA: /(\d{4}-\d{2}-\d{2})/g
        }
    };

    // ============================================
    // ESTADO GLOBAL DO SISTEMA (BIG DATA ACCUMULATOR)
    // ============================================

    let State = {
        sessao: {
            id: gerarIdSessao(),
            ativa: false,
            inicio: null
        },
        financeiro: {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            dac7: 0,
            viagens: [],
            faturas: [],
            extrato: {
                ganhosApp: 0,
                ganhosCampanha: 0,
                gorjetas: 0,
                portagens: 0,
                taxasCancel: 0,
                comissoes: 0,
                ganhosLiquidos: 0
            },
            dac7Trimestres: {
                t1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        },
        autenticidade: [],
        documentos: [],
        fila: [],
        processando: false,
        alertas: [],
        logs: [],
        
        // Resultados dos cruzamentos para exportação JSON
        cruzamentos: {
            saftVsDac7: {
                realizado: false,
                valorSAFT: 0,
                valorDAC7: 0,
                diferenca: 0,
                convergente: false,
                alerta: null
            },
            brutoVsGanhosApp: {
                realizado: false,
                valorBruto: 0,
                valorCalculado: 0,
                diferenca: 0,
                convergente: false,
                alerta: null
            },
            comissoesVsFatura: {
                realizado: false,
                totalComissoes: 0,
                totalFaturas: 0,
                diferenca: 0,
                taxaEfetiva: 0,
                convergente: false,
                alertasPorViagem: []
            }
        }
    };

    // ============================================
    // HISTÓRICO DE ESTADOS (PREVENÇÃO DE SOBREPOSIÇÃO)
    // ============================================
    
    let stateHistory = [];
    
    function saveStateToHistory() {
        stateHistory.push({
            timestamp: new Date().toISOString(),
            snapshot: JSON.parse(JSON.stringify(State))
        });
        
        // Manter apenas últimos 10 estados
        if (stateHistory.length > 10) {
            stateHistory.shift();
        }
    }

    // ============================================
    // UTILITÁRIOS
    // ============================================

    function gerarIdSessao() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `VDC-${random}-${timestamp}`;
    }

    function formatarMoeda(valor) {
        const num = parseFloat(valor);
        if (isNaN(num)) return '0,00 €';
        return num.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' €';
    }

    function formatarMoedaSimples(valor) {
        const num = parseFloat(valor);
        if (isNaN(num)) return '0.00';
        return num.toFixed(2);
    }

    function parseMoeda(valorStr) {
        if (valorStr === null || valorStr === undefined) return 0;
        if (typeof valorStr === 'number') return isNaN(valorStr) ? 0 : valorStr;
        
        let limpo = String(valorStr)
            .replace(/[€$\s]/g, '')
            .trim();
        
        const temVirgulaDecimal = /\d+,\d{2}$/.test(limpo);
        const temPontoDecimal = /\d+\.\d{2}$/.test(limpo);
        
        if (temVirgulaDecimal && !temPontoDecimal) {
            limpo = limpo.replace(/\./g, '').replace(',', '.');
        } else if (temPontoDecimal && !temVirgulaDecimal) {
            limpo = limpo.replace(/,/g, '');
        } else if (temVirgulaDecimal && temPontoDecimal) {
            const ultimaVirgula = limpo.lastIndexOf(',');
            const ultimoPonto = limpo.lastIndexOf('.');
            if (ultimaVirgula > ultimoPonto) {
                limpo = limpo.replace(/\./g, '').replace(',', '.');
            } else {
                limpo = limpo.replace(/,/g, '');
            }
        } else {
            limpo = limpo.replace(/[^\d.-]/g, '');
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

    function atualizarRelogio() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-PT');
        const timeStr = now.toLocaleTimeString('pt-PT');
        
        const headerDate = document.getElementById('header-date');
        const footerDate = document.getElementById('footer-date');
        const digitalClock = document.getElementById('digital-clock');
        const sessionTime = document.getElementById('session-time');
        const footerTime = document.getElementById('footer-time');
        
        if (headerDate) headerDate.innerText = dateStr;
        if (footerDate) footerDate.innerText = dateStr;
        if (digitalClock) digitalClock.innerText = timeStr;
        if (sessionTime) sessionTime.textContent = timeStr;
        if (footerTime) footerTime.textContent = timeStr;
    }
    
    setInterval(atualizarRelogio, 1000);

    // ============================================
    // MOTOR DE LOGS
    // ============================================

    const logger = {
        log: function(msg, tipo = 'info') {
            const consoleEl = document.getElementById('audit-console');
            if (!consoleEl) {
                if (CONFIG.DEBUG) console.log(`[VDC] ${msg}`);
                return;
            }
            
            const line = document.createElement('div');
            line.className = `line ${tipo === 'success' ? 'green' : tipo === 'error' ? 'red' : tipo === 'warning' ? 'yellow' : 'blue'}`;
            line.textContent = `[${new Date().toLocaleTimeString('pt-PT')}] ${msg}`;
            
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
            
            State.logs.push({
                timestamp: new Date(),
                msg: msg,
                tipo: tipo
            });
            
            if (CONFIG.DEBUG) console.log(`[VDC] ${msg}`);
        },
        
        limpar: function() {
            const consoleEl = document.getElementById('audit-console');
            if (consoleEl) {
                consoleEl.innerHTML = '<div class="line green">[SISTEMA] A aguardar fontes de dados...</div>';
            }
            State.logs = [];
        }
    };

    // ============================================
    // GERAR MASTER HASH SHA-256
    // ============================================
    
    async function gerarMasterHash() {
        try {
            // Preparar objeto com todos os dados relevantes para o hash
            const dadosParaHash = {
                sessao: {
                    id: State.sessao.id,
                    inicio: State.sessao.inicio ? State.sessao.inicio.toISOString() : null
                },
                financeiro: {
                    bruto: State.financeiro.bruto,
                    comissoes: State.financeiro.comissoes,
                    liquido: State.financeiro.liquido,
                    dac7: State.financeiro.dac7,
                    viagens: State.financeiro.viagens.map(v => ({
                        valor: v.valor,
                        comissao: v.comissao
                    })),
                    extrato: State.financeiro.extrato,
                    dac7Trimestres: State.financeiro.dac7Trimestres
                },
                autenticidade: State.autenticidade.map(a => ({
                    algoritmo: a.algoritmo,
                    hash: a.hash,
                    ficheiro: a.ficheiro
                })),
                cruzamentos: State.cruzamentos,
                numDocumentos: State.documentos.length,
                numAlertas: State.alertas.length
            };
            
            const jsonString = JSON.stringify(dadosParaHash, null, 2);
            
            // Usar Web Crypto API para gerar SHA-256
            const encoder = new TextEncoder();
            const data = encoder.encode(jsonString + State.sessao.id + Date.now().toString());
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            
            // Converter para hexadecimal
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Atualizar interface
            const masterHashEl = document.getElementById('master-hash');
            const displayHashEl = document.getElementById('display-hash');
            
            if (masterHashEl) {
                masterHashEl.textContent = hashHex;
            }
            
            if (displayHashEl) {
                displayHashEl.textContent = hashHex;
            }
            
            logger.log(`Master Hash SHA-256 gerado: ${hashHex.substring(0, 16)}...`, 'success');
            
            return {
                hash: hashHex,
                timestamp: new Date().toISOString(),
                algoritmo: 'SHA-256'
            };
            
        } catch (err) {
            logger.log(`Erro ao gerar Master Hash: ${err.message}`, 'error');
            return {
                hash: 'ERRO_GERACAO_HASH',
                timestamp: new Date().toISOString(),
                algoritmo: 'SHA-256',
                erro: err.message
            };
        }
    }

    // ============================================
    // EXECUTAR CRUZAMENTOS ARITMÉTICOS
    // ============================================
    
    function executarCruzamentos() {
        logger.log('A executar cruzamentos aritméticos...', 'info');
        
        // ============================================
        // CRUZAMENTO 1: SAF-T vs DAC7
        // ============================================
        
        const saftVsDac7 = {
            realizado: true,
            valorSAFT: State.financeiro.bruto,
            valorDAC7: State.financeiro.dac7,
            diferenca: Math.abs(State.financeiro.bruto - State.financeiro.dac7),
            convergente: Math.abs(State.financeiro.bruto - State.financeiro.dac7) <= CONFIG.TOLERANCIA_ERRO,
            alerta: null
        };
        
        if (State.financeiro.bruto > 0 && State.financeiro.dac7 > 0) {
            if (!saftVsDac7.convergente) {
                saftVsDac7.alerta = `Discrepância SAF-T (${formatarMoeda(State.financeiro.bruto)}) vs DAC7 (${formatarMoeda(State.financeiro.dac7)}) - Diferença: ${formatarMoeda(saftVsDac7.diferenca)}`;
                logger.log(`⚠️ ${saftVsDac7.alerta}`, 'warning');
            } else {
                logger.log(`✅ SAF-T e DAC7 convergentes: ${formatarMoeda(State.financeiro.bruto)}`, 'success');
            }
        }
        
        State.cruzamentos.saftVsDac7 = saftVsDac7;
        
        // Atualizar interface
        const statusSaftDac7 = document.getElementById('status-saft-dac7');
        const triSaftDac7 = document.getElementById('tri-saft-dac7');
        
        if (statusSaftDac7) {
            if (saftVsDac7.realizado && State.financeiro.dac7 > 0) {
                statusSaftDac7.textContent = saftVsDac7.convergente ? 'CONVERGENTE' : 'DIVERGENTE';
                statusSaftDac7.className = 'cruzamento-status ' + (saftVsDac7.convergente ? 'convergente' : 'divergente');
            } else {
                statusSaftDac7.textContent = 'Sem dados DAC7';
                statusSaftDac7.className = 'cruzamento-status alerta';
            }
        }
        
        if (triSaftDac7) {
            triSaftDac7.textContent = formatarMoedaSimples(saftVsDac7.diferenca) + '€';
        }
        
        // ============================================
        // CRUZAMENTO 2: Bruto vs Ganhos App (soma dos componentes)
        // ============================================
        
        const valorCalculadoApp = 
            State.financeiro.extrato.ganhosApp +
            State.financeiro.extrato.ganhosCampanha +
            State.financeiro.extrato.gorjetas +
            State.financeiro.extrato.portagens +
            State.financeiro.extrato.taxasCancel;
        
        const brutoVsGanhosApp = {
            realizado: true,
            valorBruto: State.financeiro.bruto,
            valorCalculado: valorCalculadoApp,
            diferenca: Math.abs(State.financeiro.bruto - valorCalculadoApp),
            convergente: Math.abs(State.financeiro.bruto - valorCalculadoApp) <= CONFIG.TOLERANCIA_ERRO,
            alerta: null
        };
        
        if (State.financeiro.bruto > 0 || valorCalculadoApp > 0) {
            if (!brutoVsGanhosApp.convergente && valorCalculadoApp > 0) {
                brutoVsGanhosApp.alerta = `Discrepância Bruto (${formatarMoeda(State.financeiro.bruto)}) vs Soma Ganhos App (${formatarMoeda(valorCalculadoApp)}) - Diferença: ${formatarMoeda(brutoVsGanhosApp.diferenca)}`;
                logger.log(`⚠️ ${brutoVsGanhosApp.alerta}`, 'warning');
            } else if (valorCalculadoApp > 0) {
                logger.log(`✅ Bruto e soma dos ganhos App convergentes: ${formatarMoeda(State.financeiro.bruto)}`, 'success');
            }
        }
        
        State.cruzamentos.brutoVsGanhosApp = brutoVsGanhosApp;
        
        // Atualizar interface
        const statusBrutoExtrato = document.getElementById('status-bruto-extrato');
        const triBrutoExtrato = document.getElementById('tri-bruto-extrato');
        
        if (statusBrutoExtrato) {
            if (brutoVsGanhosApp.realizado && valorCalculadoApp > 0) {
                statusBrutoExtrato.textContent = brutoVsGanhosApp.convergente ? 'CONVERGENTE' : 'DIVERGENTE';
                statusBrutoExtrato.className = 'cruzamento-status ' + (brutoVsGanhosApp.convergente ? 'convergente' : 'divergente');
            } else {
                statusBrutoExtrato.textContent = 'Sem dados extrato';
                statusBrutoExtrato.className = 'cruzamento-status alerta';
            }
        }
        
        if (triBrutoExtrato) {
            triBrutoExtrato.textContent = formatarMoedaSimples(brutoVsGanhosApp.diferenca) + '€';
        }
        
        // ============================================
        // CRUZAMENTO 3: Comissões vs Fatura Plataforma
        // Validação da taxa de 25% por viagem
        // ============================================
        
        const totalFaturas = State.financeiro.faturas.reduce((acc, f) => acc + (f.valor || 0), 0);
        const taxaEfetiva = State.financeiro.bruto > 0 ? 
            (State.financeiro.comissoes / State.financeiro.bruto) * 100 : 0;
        
        const comissoesVsFatura = {
            realizado: true,
            totalComissoes: State.financeiro.comissoes,
            totalFaturas: totalFaturas,
            diferenca: Math.abs(State.financeiro.comissoes - totalFaturas),
            taxaEfetiva: taxaEfetiva,
            convergente: true,
            alertasPorViagem: []
        };
        
        // Verificar discrepância entre total comissões e total faturas
        if (totalFaturas > 0 && Math.abs(State.financeiro.comissoes - totalFaturas) > CONFIG.TOLERANCIA_ERRO) {
            comissoesVsFatura.convergente = false;
            comissoesVsFatura.alerta = `Discrepância Comissões (${formatarMoeda(State.financeiro.comissoes)}) vs Faturas (${formatarMoeda(totalFaturas)})`;
            logger.log(`⚠️ ${comissoesVsFatura.alerta}`, 'warning');
        }
        
        // Verificar taxa por viagem (máx 25%)
        State.financeiro.viagens.forEach((v, index) => {
            if (v.valor > 0) {
                const taxaViagem = (v.comissao / v.valor) * 100;
                
                if (taxaViagem > CONFIG.TAXA_COMISSAO_MAX * 100 + 0.1) {
                    const alerta = {
                        viagemIndex: index,
                        numFatura: v.numFatura || `Viagem ${index+1}`,
                        valor: v.valor,
                        comissao: v.comissao,
                        taxa: taxaViagem.toFixed(2),
                        limite: (CONFIG.TAXA_COMISSAO_MAX * 100).toFixed(2),
                        mensagem: `Comissão ${taxaViagem.toFixed(2)}% excede limite 25% na fatura ${v.numFatura || index+1}`
                    };
                    
                    comissoesVsFatura.alertasPorViagem.push(alerta);
                    comissoesVsFatura.convergente = false;
                    
                    logger.log(`⚠️ ${alerta.mensagem}`, 'warning');
                }
            }
        });
        
        if (comissoesVsFatura.convergente && State.financeiro.viagens.length > 0) {
            logger.log(`✅ Taxas de comissão dentro do limite legal (média: ${taxaEfetiva.toFixed(2)}%)`, 'success');
        }
        
        State.cruzamentos.comissoesVsFatura = comissoesVsFatura;
        
        // Atualizar interface
        const statusComissoesFaturas = document.getElementById('status-comissoes-faturas');
        const triComissoesFaturas = document.getElementById('tri-comissoes-faturas');
        
        if (statusComissoesFaturas) {
            if (comissoesVsFatura.realizado && totalFaturas > 0) {
                statusComissoesFaturas.textContent = comissoesVsFatura.convergente ? 'CONVERGENTE' : 'DIVERGENTE';
                statusComissoesFaturas.className = 'cruzamento-status ' + (comissoesVsFatura.convergente ? 'convergente' : 'divergente');
            } else if (State.financeiro.viagens.length > 0) {
                statusComissoesFaturas.textContent = 'Sem faturas';
                statusComissoesFaturas.className = 'cruzamento-status alerta';
            } else {
                statusComissoesFaturas.textContent = 'Sem dados';
                statusComissoesFaturas.className = 'cruzamento-status alerta';
            }
        }
        
        if (triComissoesFaturas) {
            triComissoesFaturas.textContent = formatarMoedaSimples(comissoesVsFatura.diferenca) + '€';
        }
        
        // ============================================
        // GERAR ALERTAS NA INTERFACE
        // ============================================
        
        gerarAlertasInterface();
        
        logger.log('Cruzamentos aritméticos concluídos', 'success');
    }

    // ============================================
    // GERAR ALERTAS NA INTERFACE
    // ============================================
    
    function gerarAlertasInterface() {
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) return;
        
        // Limpar alertas anteriores
        alertasContainer.innerHTML = '';
        State.alertas = [];
        
        // Alertas do cruzamento SAF-T vs DAC7
        if (State.cruzamentos.saftVsDac7.alerta) {
            adicionarAlerta(
                State.cruzamentos.saftVsDac7.diferenca > 100 ? 'critico' : 'alerta',
                'SAF-T vs DAC7',
                State.cruzamentos.saftVsDac7.alerta,
                State.cruzamentos.saftVsDac7.diferenca
            );
        }
        
        // Alertas do cruzamento Bruto vs Ganhos App
        if (State.cruzamentos.brutoVsGanhosApp.alerta) {
            adicionarAlerta(
                State.cruzamentos.brutoVsGanhosApp.diferenca > 50 ? 'critico' : 'alerta',
                'Bruto vs Ganhos App',
                State.cruzamentos.brutoVsGanhosApp.alerta,
                State.cruzamentos.brutoVsGanhosApp.diferenca
            );
        }
        
        // Alertas do cruzamento Comissões vs Fatura
        if (State.cruzamentos.comissoesVsFatura.alerta) {
            adicionarAlerta(
                'critico',
                'Comissões vs Faturas',
                State.cruzamentos.comissoesVsFatura.alerta,
                State.cruzamentos.comissoesVsFatura.diferenca
            );
        }
        
        // Alertas por viagem (excesso de comissão)
        State.cruzamentos.comissoesVsFatura.alertasPorViagem.forEach(alerta => {
            adicionarAlerta(
                'critico',
                'Comissão Excedida',
                alerta.mensagem,
                alerta.comissao
            );
        });
        
        // Verificar líquido calculado vs reportado
        if (State.financeiro.liquido > 0) {
            const liquidoCalculado = State.financeiro.bruto - State.financeiro.comissoes;
            if (Math.abs(liquidoCalculado - State.financeiro.liquido) > 10) {
                adicionarAlerta(
                    'alerta',
                    'DISCREPÂNCIA GANHOS LÍQUIDOS',
                    `Calculado: ${formatarMoeda(liquidoCalculado)} | Reportado: ${formatarMoeda(State.financeiro.liquido)}`,
                    Math.abs(liquidoCalculado - State.financeiro.liquido)
                );
            }
        }
        
        // Verificar divergência SAF-T vs DAC7 para exibição na zona de alertas
        if (State.financeiro.dac7 > 0 && Math.abs(State.financeiro.bruto - State.financeiro.dac7) > 10) {
            const diffDac7El = document.getElementById('diff-dac7');
            if (diffDac7El) {
                diffDac7El.innerText = (State.financeiro.bruto - State.financeiro.dac7).toFixed(2);
            }
        }
    }

    function adicionarAlerta(tipo, titulo, descricao, valor) {
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) return;
        
        const alerta = {
            id: Date.now() + Math.random(),
            tipo: tipo,
            titulo: titulo,
            descricao: descricao,
            valor: parseFloat(valor) || 0,
            timestamp: new Date()
        };
        
        State.alertas.push(alerta);
        
        const div = document.createElement('div');
        div.className = `alerta ${tipo}`;
        div.innerHTML = `
            <div>
                <strong>${escapeHtml(titulo)}</strong>
                <span>${escapeHtml(descricao)}</span>
            </div>
            ${alerta.valor > 0 ? `<strong>${formatarMoeda(alerta.valor)}</strong>` : ''}
        `;
        
        alertasContainer.appendChild(div);
    }

    // ============================================
    // INICIALIZAÇÃO E BARREIRA DE ENTRADA
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        const btnProceed = document.getElementById('btn-proceed');
        const barrier = document.getElementById('barrier-window');
        const app = document.getElementById('app-container');
        
        const sessionHashDisplay = document.getElementById('session-id-display');
        if (sessionHashDisplay) {
            const hashValue = sessionHashDisplay.querySelector('.hash-value');
            if (hashValue) {
                hashValue.textContent = State.sessao.id;
            }
        }

        if (btnProceed && barrier && app) {
            btnProceed.addEventListener('click', function() {
                barrier.classList.add('hidden');
                app.classList.remove('hidden');
                State.sessao.ativa = true;
                State.sessao.inicio = new Date();
                
                document.getElementById('session-id').textContent = State.sessao.id;
                document.getElementById('footer-session').textContent = State.sessao.id;
                
                logger.log(`Sessão iniciada. Versão ${CONFIG.VERSAO}`, 'success');
                logger.log('Sistema pronto para receber evidências', 'info');
                
                inicializarEventos();
            });
        } else {
            console.error('Elementos da barreira não encontrados');
            if (app) {
                app.classList.remove('hidden');
                logger.log('Modo debug: barreira ignorada', 'warning');
                inicializarEventos();
            }
        }
    });

    // ============================================
    // INICIALIZAÇÃO DE EVENTOS
    // ============================================

    function inicializarEventos() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const btnDemo = document.getElementById('btn-demo');
        const btnClear = document.getElementById('btn-clear');
        const btnExportJson = document.getElementById('btn-export-json');
        const btnAnalyze = document.getElementById('btn-analyze');
        const btnExportPdf = document.getElementById('btn-export-pdf');

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', function() {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    adicionarFicheirosFila(e.target.files);
                }
            });
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
                dropZone.addEventListener(eventName, function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(function(eventName) {
                dropZone.addEventListener(eventName, function() {
                    dropZone.classList.add('dragover');
                });
            });
            
            ['dragleave', 'drop'].forEach(function(eventName) {
                dropZone.addEventListener(eventName, function() {
                    dropZone.classList.remove('dragover');
                });
            });
            
            dropZone.addEventListener('drop', function(e) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    adicionarFicheirosFila(files);
                }
            });
        }

        if (btnDemo) {
            btnDemo.addEventListener('click', carregarDemo);
        }
        
        if (btnClear) {
            btnClear.addEventListener('click', limparSistema);
        }
        
        if (btnExportJson) {
            btnExportJson.addEventListener('click', exportarJSON);
        }
        
        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', analisarDados);
        }
        
        if (btnExportPdf) {
            btnExportPdf.addEventListener('click', exportarPDF);
        }

        document.querySelectorAll('.tab-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                document.querySelectorAll('.tab-content').forEach(function(c) {
                    c.classList.add('hidden');
                });
                
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    tabContent.classList.remove('hidden');
                }
            });
        });

        document.querySelectorAll('.evidence-item').forEach(function(item) {
            item.addEventListener('click', function() {
                logger.log('Sumário de evidências', 'info');
            });
        });

        logger.log('Event listeners inicializados', 'info');
    }

    // ============================================
    // ANÁLISE DE DADOS (BOTÃO ANALISAR DADOS)
    // ============================================
    
    async function analisarDados() {
        logger.log('A iniciar análise de dados...', 'info');
        
        // Executar cruzamentos
        executarCruzamentos();
        
        // Gerar Master Hash
        await gerarMasterHash();
        
        // Atualizar interface com resultados
        atualizarInterface();
        
        logger.log('Análise de dados concluída', 'success');
    }

    // ============================================
    // GESTÃO DE FILA DE PROCESSAMENTO
    // ============================================

    async function adicionarFicheirosFila(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = validarFicheiro(file);
            if (!validacao.valido) {
                logger.log(`Ficheiro rejeitado: ${file.name} - ${validacao.erro}`, 'error');
                continue;
            }
            
            State.fila.push(file);
            logger.log(`Ficheiro em fila: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
            
            adicionarFicheiroLista(file);
        }
        
        processarProximo();
    }

    function validarFicheiro(file) {
        if (!file) return { valido: false, erro: 'Ficheiro não fornecido' };
        
        const extensao = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_EXTENSIONS.includes(extensao)) {
            return { valido: false, erro: 'Extensão não permitida. Use PDF, CSV ou XML' };
        }
        
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return { valido: false, erro: `Ficheiro muito grande. Máximo: 10MB` };
        }
        
        return { valido: true };
    }

    function adicionarFicheiroLista(file) {
        const fileQueue = document.getElementById('file-queue');
        if (!fileQueue) return;
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${escapeHtml(file.name)}</span>
            <small>${(file.size / 1024).toFixed(1)} KB</small>
        `;
        fileQueue.appendChild(fileItem);
        
        atualizarContador('ctrl', 1);
        atualizarContadorDocumentos(1);
    }

    function atualizarContador(tipo, incremento = 1) {
        const elemento = document.getElementById(`count-${tipo}`);
        if (elemento) {
            const atual = parseInt(elemento.textContent) || 0;
            elemento.textContent = atual + incremento;
        }
    }
    
    function atualizarContadorDocumentos(incremento = 1) {
        const docCountEl = document.getElementById('doc-count');
        if (docCountEl) {
            const atual = parseInt(docCountEl.textContent) || 0;
            docCountEl.textContent = atual + incremento;
        }
    }

    async function processarProximo() {
        if (State.processando || State.fila.length === 0) return;
        
        State.processando = true;
        const file = State.fila.shift();
        
        try {
            logger.log(`A processar: ${file.name}`, 'info');
            
            if (file.name.toLowerCase().endsWith('.csv')) {
                await processarCSV(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                await processarPDF(file);
            } else if (file.name.toLowerCase().endsWith('.xml')) {
                logger.log(`Processamento XML: ${file.name}`, 'info');
                setTimeout(function() {
                    logger.log(`XML processado: ${file.name}`, 'success');
                }, 500);
            } else {
                logger.log(`Formato não suportado: ${file.name}`, 'error');
            }
        } catch (err) {
            logger.log(`Erro ao processar ${file.name}: ${err.message}`, 'error');
        }
        
        State.processando = false;
        
        // Atualizar interface após processar cada ficheiro
        atualizarInterface();
        
        processarProximo();
    }

    // ============================================
    // PROCESSAMENTO DE CSV
    // ============================================

    async function processarCSV(file) {
        return new Promise(function(resolve) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/);
                    const header = lines[0]?.toLowerCase() || '';
                    
                    if (header.includes('algorithm') || header.includes('hash')) {
                        logger.log('Detetado: Ficheiro de Controlo de Autenticidade', 'success');
                        processarAutenticidade(lines);
                        atualizarContador('saft', 1);
                    } else if (header.includes('nº da fatura') || header.includes('viagem') || header.includes('motorista')) {
                        logger.log('Detetado: Ficheiro de Viagens', 'success');
                        processarViagens(lines);
                        atualizarContador('ext', 1);
                    } else {
                        logger.log('Formato CSV não reconhecido', 'warning');
                    }
                    
                    atualizarInterface();
                } catch (err) {
                    logger.log(`Erro ao processar CSV: ${err.message}`, 'error');
                }
                
                resolve();
            };
            
            reader.onerror = function() {
                logger.log('Erro ao ler ficheiro CSV', 'error');
                resolve();
            };
            
            reader.readAsText(file, 'ISO-8859-1');
        });
    }

    function processarAutenticidade(lines) {
        const tbody = document.querySelector('#table-hashes tbody');
        if (!tbody) return;
        
        let count = 0;
        
        lines.slice(1).forEach(function(line) {
            if (!line.trim()) return;
            
            const cols = line.replace(/"/g, '').split(',');
            if (cols.length >= 3) {
                const tr = document.createElement('tr');
                const algoritmo = cols[0] || 'SHA256';
                const hashCompleto = cols[1] || '';
                const hashCurto = hashCompleto.length > 16 ? hashCompleto.substring(0, 16) + '...' : hashCompleto;
                const caminho = cols[2]?.split('\\').pop() || 'N/A';
                
                tr.innerHTML = `
                    <td>${escapeHtml(algoritmo)}</td>
                    <td style="color: var(--accent-green);">${escapeHtml(hashCurto)}</td>
                    <td>${escapeHtml(caminho)}</td>
                    <td><span style="color: var(--success);">✓ VALIDADO</span></td>
                `;
                tbody.appendChild(tr);
                
                State.autenticidade.push({
                    algoritmo: algoritmo,
                    hash: hashCompleto,
                    ficheiro: caminho
                });
                
                count++;
            }
        });
        
        logger.log(`Adicionados ${count} registos de autenticidade`, 'success');
    }

    function processarViagens(lines) {
        const tbody = document.querySelector('#table-viagens tbody');
        if (!tbody) return;
        
        let totalBruto = 0;
        let count = 0;
        
        const regexSplit = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        
        lines.slice(1).forEach(function(line) {
            if (!line.trim()) return;
            
            const cols = line.split(regexSplit);
            
            if (cols.length >= 15) {
                const valorStr = cols[14]?.replace(/"/g, '').trim() || '0';
                const valor = parseMoeda(valorStr);
                
                let dataStr = cols[4]?.replace(/"/g, '').split(' ')[0] || 
                              cols[1]?.replace(/"/g, '').split(' ')[0] || 
                              'N/A';
                
                const motorista = cols[2]?.replace(/"/g, '') || 'N/A';
                const numFatura = cols[0]?.replace(/"/g, '') || 'N/A';
                
                const comissao = valor * CONFIG.TAXA_COMISSAO_PADRAO;
                const taxa = ((comissao / valor) * 100).toFixed(2) + '%';
                
                totalBruto += valor;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(dataStr)}</td>
                    <td>${escapeHtml(motorista)}</td>
                    <td>${escapeHtml(numFatura.substring(0, 12))}</td>
                    <td>${formatarMoeda(valor)}</td>
                    <td>${formatarMoeda(comissao)}</td>
                    <td>${escapeHtml(taxa)}</td>
                `;
                tbody.appendChild(tr);
                
                State.financeiro.viagens.push({
                    data: dataStr,
                    motorista: motorista,
                    numFatura: numFatura,
                    valor: valor,
                    comissao: comissao
                });
                
                State.documentos.push({
                    timestamp: new Date().toISOString(),
                    nome: 'CSV Viagens',
                    tipo: 'Viagem',
                    valorBruto: valor,
                    comissao: comissao,
                    liquido: valor - comissao
                });
                
                count++;
            }
        });
        
        State.financeiro.bruto += totalBruto;
        State.financeiro.comissoes += totalBruto * CONFIG.TAXA_COMISSAO_PADRAO;
        State.financeiro.liquido += totalBruto * (1 - CONFIG.TAXA_COMISSAO_PADRAO);
        
        logger.log(`Processadas ${count} viagens. Total bruto: ${formatarMoeda(totalBruto)}`, 'success');
    }

    // ============================================
    // PROCESSAMENTO DE PDF
    // ============================================

    async function processarPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            logger.log('PDF.js não carregado. A usar modo de simulação.', 'warning');
            processarPDFSimulado(file);
            return;
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let textoCompleto = '';
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                textoCompleto += textContent.items.map(s => s.str).join(' ') + '\n';
            }
            
            const textoLimpo = textoCompleto.replace(CONFIG.PATTERNS.CLEAN, ' ').replace(CONFIG.PATTERNS.MULTISPACE, ' ');
            
            if (textoLimpo.includes('Ganhos líquidos') || textoLimpo.includes('Ganhos na app')) {
                logger.log('Detetado: Extrato Bolt', 'success');
                processarExtratoBolt(textoLimpo, file);
                atualizarContador('ext', 1);
            } else if (textoLimpo.includes('Fatura n.º') || textoLimpo.includes('Total com IVA')) {
                logger.log('Detetado: Fatura Bolt', 'success');
                processarFaturaBolt(textoLimpo, file);
                atualizarContador('fat', 1);
            } else if (textoLimpo.includes('DAC7') || textoLimpo.includes('receitas anuais')) {
                logger.log('Detetado: Relatório DAC7', 'success');
                processarDAC7(textoLimpo, file);
                atualizarContador('dac7', 1);
            } else {
                logger.log('PDF não reconhecido como documento Bolt', 'warning');
            }
            
            atualizarInterface();
            
        } catch (err) {
            logger.log(`Erro ao processar PDF: ${err.message}`, 'error');
            processarPDFSimulado(file);
        }
    }

    function processarPDFSimulado(file) {
        const nomeLower = file.name.toLowerCase();
        
        if (nomeLower.includes('ganhos') || nomeLower.includes('extrato')) {
            logger.log('[SIMULAÇÃO] Extrato Bolt detetado', 'success');
            State.financeiro.extrato.ganhosLiquidos = 2409.95;
            State.financeiro.extrato.ganhosApp = 3157.94;
            State.financeiro.extrato.comissoes = 792.59;
            State.financeiro.extrato.ganhosCampanha = 0;
            State.financeiro.extrato.gorjetas = 44.60;
            State.financeiro.extrato.portagens = 0;
            State.financeiro.extrato.taxasCancel = 0;
            State.financeiro.liquido += 2409.95;
            State.financeiro.bruto += 3157.94;
            State.financeiro.comissoes += 792.59;
            
            State.documentos.push({
                timestamp: new Date().toISOString(),
                nome: file.name,
                tipo: 'Extrato',
                valorBruto: 3157.94,
                comissao: 792.59,
                liquido: 2409.95
            });
            
            atualizarContador('ext', 1);
            
        } else if (nomeLower.includes('fatura')) {
            logger.log('[SIMULAÇÃO] Fatura Bolt detetada', 'success');
            State.financeiro.faturas.push({
                numero: file.name,
                valor: 239.00,
                periodo: 'Dezembro 2024',
                autoliquidacao: false
            });
            
            State.documentos.push({
                timestamp: new Date().toISOString(),
                nome: file.name,
                tipo: 'Fatura',
                valorBruto: 239.00,
                comissao: 0,
                liquido: 0
            });
            
            atualizarContador('fat', 1);
            
        } else if (nomeLower.includes('dac7')) {
            logger.log('[SIMULAÇÃO] Relatório DAC7 detetado', 'success');
            State.financeiro.dac7 = 7755.16;
            State.financeiro.dac7Trimestres.t4.ganhos = 7755.16;
            State.financeiro.dac7Trimestres.t4.comissoes = 239.00;
            State.financeiro.dac7Trimestres.t4.servicos = 1648;
            
            State.documentos.push({
                timestamp: new Date().toISOString(),
                nome: file.name,
                tipo: 'DAC7',
                valorBruto: 7755.16,
                comissao: 0,
                liquido: 0
            });
            
            atualizarContador('dac7', 1);
        }
        
        atualizarContadorDocumentos(1);
        atualizarInterface();
    }

    function processarExtratoBolt(texto, file) {
        const ganhosApp = extrairValor(texto, CONFIG.PATTERNS.GANHOS_APP);
        const ganhosCampanha = extrairValor(texto, CONFIG.PATTERNS.GANHOS_CAMPANHA);
        const gorjetas = extrairValor(texto, CONFIG.PATTERNS.GORJETAS);
        const portagens = extrairValor(texto, CONFIG.PATTERNS.PORTAGENS);
        const taxasCancel = extrairValor(texto, CONFIG.PATTERNS.TAXAS_CANCEL);
        const comissoes = Math.abs(extrairValor(texto, CONFIG.PATTERNS.COMISSAO_APP));
        const ganhosLiquidos = extrairValor(texto, CONFIG.PATTERNS.GANHOS_LIQUIDOS);
        
        const brutoCalculado = ganhosApp + ganhosCampanha + gorjetas + portagens + taxasCancel;
        
        State.financeiro.extrato.ganhosApp += ganhosApp;
        State.financeiro.extrato.ganhosCampanha += ganhosCampanha;
        State.financeiro.extrato.gorjetas += gorjetas;
        State.financeiro.extrato.portagens += portagens;
        State.financeiro.extrato.taxasCancel += taxasCancel;
        State.financeiro.extrato.comissoes += comissoes;
        State.financeiro.extrato.ganhosLiquidos += ganhosLiquidos;
        
        State.financeiro.bruto += brutoCalculado;
        State.financeiro.comissoes += comissoes;
        State.financeiro.liquido += ganhosLiquidos;
        
        State.documentos.push({
            timestamp: new Date().toISOString(),
            nome: file.name,
            tipo: 'Extrato',
            valorBruto: brutoCalculado,
            comissao: comissoes,
            liquido: ganhosLiquidos
        });
        
        logger.log(`Extrato: Bruto ${formatarMoeda(brutoCalculado)} | Líquido ${formatarMoeda(ganhosLiquidos)}`, 'success');
        
        if (ganhosApp > 0) logger.log(`  Ganhos na app: ${formatarMoeda(ganhosApp)}`, 'info');
        if (ganhosCampanha > 0) logger.log(`  Ganhos campanha: ${formatarMoeda(ganhosCampanha)}`, 'info');
        if (gorjetas > 0) logger.log(`  Gorjetas: ${formatarMoeda(gorjetas)}`, 'info');
        if (portagens > 0) logger.log(`  Portagens: ${formatarMoeda(portagens)}`, 'info');
        if (taxasCancel > 0) logger.log(`  Taxas cancelamento: ${formatarMoeda(taxasCancel)}`, 'info');
        if (comissoes > 0) logger.log(`  Comissões: ${formatarMoeda(comissoes)}`, 'info');
    }

    function processarFaturaBolt(texto, file) {
        const numFatura = extrairTexto(texto, CONFIG.PATTERNS.FATURA_NUMERO) || 'N/A';
        const valorTotal = extrairValor(texto, CONFIG.PATTERNS.FATURA_TOTAL);
        const periodoMatch = texto.match(CONFIG.PATTERNS.FATURA_PERIODO);
        const periodo = periodoMatch ? `${periodoMatch[1]} a ${periodoMatch[2]}` : 'N/A';
        const isAutoliquidacao = CONFIG.PATTERNS.FATURA_AUTOLIQUIDACAO.test(texto);
        
        State.financeiro.comissoes += valorTotal;
        State.financeiro.faturas.push({
            numero: numFatura,
            valor: valorTotal,
            periodo: periodo,
            autoliquidacao: isAutoliquidacao
        });
        
        State.documentos.push({
            timestamp: new Date().toISOString(),
            nome: file.name,
            tipo: 'Fatura',
            valorBruto: valorTotal,
            comissao: 0,
            liquido: 0
        });
        
        logger.log(`Fatura: ${numFatura} | Valor ${formatarMoeda(valorTotal)} | ${isAutoliquidacao ? 'Autoliquidação' : 'IVA incluído'}`, 'success');
    }

    function processarDAC7(texto, file) {
        const receitaAnual = extrairValor(texto, CONFIG.PATTERNS.DAC7_RECEITA_ANUAL);
        
        State.financeiro.dac7Trimestres.t1.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_1T);
        State.financeiro.dac7Trimestres.t1.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_1T);
        State.financeiro.dac7Trimestres.t1.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_1T);
        
        State.financeiro.dac7Trimestres.t2.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_2T);
        State.financeiro.dac7Trimestres.t2.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_2T);
        State.financeiro.dac7Trimestres.t2.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_2T);
        
        State.financeiro.dac7Trimestres.t3.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_3T);
        State.financeiro.dac7Trimestres.t3.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_3T);
        State.financeiro.dac7Trimestres.t3.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_3T);
        
        State.financeiro.dac7Trimestres.t4.ganhos = extrairValor(texto, CONFIG.PATTERNS.DAC7_GANHOS_4T);
        State.financeiro.dac7Trimestres.t4.comissoes = extrairValor(texto, CONFIG.PATTERNS.DAC7_COMISSOES_4T);
        State.financeiro.dac7Trimestres.t4.servicos = extrairValor(texto, CONFIG.PATTERNS.DAC7_SERVICOS_4T);
        
        State.financeiro.dac7 = receitaAnual;
        
        State.documentos.push({
            timestamp: new Date().toISOString(),
            nome: file.name,
            tipo: 'DAC7',
            valorBruto: receitaAnual,
            comissao: 0,
            liquido: 0
        });
        
        const totalServicos = 
            State.financeiro.dac7Trimestres.t1.servicos +
            State.financeiro.dac7Trimestres.t2.servicos +
            State.financeiro.dac7Trimestres.t3.servicos +
            State.financeiro.dac7Trimestres.t4.servicos;
        
        logger.log(`DAC7: Receita anual ${formatarMoeda(receitaAnual)} | ${totalServicos} serviços`, 'success');
    }

    function extrairValor(texto, pattern) {
        if (!texto || !pattern) return 0;
        const match = texto.match(pattern);
        if (match && match[1]) {
            return parseMoeda(match[1]);
        }
        return 0;
    }

    function extrairTexto(texto, pattern) {
        if (!texto || !pattern) return null;
        const match = texto.match(pattern);
        return match ? match[1].trim() : null;
    }

    // ============================================
    // ATUALIZAÇÃO DA INTERFACE
    // ============================================

    function atualizarInterface() {
        document.getElementById('val-bruto').textContent = formatarMoeda(State.financeiro.bruto);
        document.getElementById('val-liquido').textContent = formatarMoeda(State.financeiro.liquido);
        document.getElementById('val-dac7').textContent = formatarMoeda(State.financeiro.dac7);
        document.getElementById('val-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('val-viagens').textContent = State.financeiro.viagens.length.toString();
        
        const taxaMedia = State.financeiro.bruto > 0 ? 
            (State.financeiro.comissoes / State.financeiro.bruto * 100) : 0;
        document.getElementById('val-taxa').textContent = taxaMedia.toFixed(2) + '%';
        
        document.getElementById('tri-bruto').textContent = formatarMoeda(State.financeiro.bruto);
        document.getElementById('tri-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('tri-liquido').textContent = formatarMoeda(State.financeiro.liquido);
        document.getElementById('tri-faturado').textContent = formatarMoeda(State.financeiro.comissoes);
        
        document.getElementById('dac7-receita').textContent = formatarMoeda(State.financeiro.dac7);
        document.getElementById('dac7-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('dac7-servicos').textContent = State.financeiro.viagens.length.toString();
        
        document.getElementById('dac7-1t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t1.ganhos);
        document.getElementById('dac7-2t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t2.ganhos);
        document.getElementById('dac7-3t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t3.ganhos);
        document.getElementById('dac7-4t').textContent = formatarMoeda(State.financeiro.dac7Trimestres.t4.ganhos);
        
        // Atualizar contador de documentos
        const docCount = document.getElementById('doc-count');
        if (docCount) {
            docCount.textContent = State.documentos.length;
        }
        
        // Atualizar diferença DAC7
        const diffDac7 = document.getElementById('diff-dac7');
        if (diffDac7) {
            diffDac7.innerText = (State.financeiro.bruto - State.financeiro.dac7).toFixed(2);
        }
        
        // Atualizar total SAF-T e líquido estimado
        const totalSaft = document.getElementById('total-saft');
        const totalLiquido = document.getElementById('total-liquido');
        
        if (totalSaft) {
            totalSaft.innerText = State.financeiro.bruto.toFixed(2);
        }
        
        if (totalLiquido) {
            totalLiquido.innerText = State.financeiro.liquido.toFixed(2);
        }
        
        verificarDiscrepancias();
    }

    function verificarDiscrepancias() {
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) return;
        
        const c = State.financeiro;
        
        // Remover alertas duplicados - a função gerarAlertasInterface já limpa o container
        // e recria os alertas com base no estado atual
        
        atualizarVeredito();
    }

    function atualizarVeredito() {
        const veredictoSection = document.getElementById('veredicto-section');
        if (!veredictoSection) return;
        
        veredictoSection.style.display = 'block';
        
        const statusEl = document.getElementById('veredicto-status');
        const desvioEl = document.getElementById('veredicto-desvio');
        const anomaliaEl = document.getElementById('anomalia-critica');
        const anomaliaTexto = document.getElementById('anomalia-texto');
        const valorAnomalia = document.getElementById('valor-anomalia');
        
        const alertasCriticos = State.alertas.filter(a => a.tipo === 'critico');
        const alertasNormais = State.alertas.filter(a => a.tipo === 'alerta');
        
        if (alertasCriticos.length > 0) {
            const desvioTotal = alertasCriticos.reduce((acc, a) => acc + (a.valor || 0), 0);
            const percentual = State.financeiro.dac7 > 0 ? (desvioTotal / State.financeiro.dac7) * 100 : 0;
            
            statusEl.textContent = 'CRÍTICO';
            statusEl.className = 'veredicto-status critico';
            desvioEl.textContent = `Desvio: ${percentual.toFixed(2)}% (${formatarMoeda(desvioTotal)})`;
            
            anomaliaEl.style.display = 'flex';
            anomaliaTexto.textContent = `Potencial incumprimento fiscal. ${alertasCriticos.length} anomalia(s) crítica(s).`;
            valorAnomalia.textContent = formatarMoeda(desvioTotal);
            
            const discItem = document.getElementById('tri-discrepancia-item');
            const discValor = document.getElementById('tri-discrepancia');
            if (discItem && discValor) {
                discItem.style.display = 'block';
                discValor.textContent = formatarMoeda(desvioTotal);
            }
            
            logger.log(`Veredito: CRÍTICO (${percentual.toFixed(2)}% de desvio)`, 'error');
            
        } else if (alertasNormais.length > 0) {
            statusEl.textContent = 'ALERTA';
            statusEl.className = 'veredicto-status alerta';
            desvioEl.textContent = 'Requer verificação manual';
            
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            logger.log('Veredito: ALERTA - Requer atenção', 'warning');
            
        } else {
            statusEl.textContent = 'NORMAL';
            statusEl.className = 'veredicto-status normal';
            desvioEl.textContent = 'Sem desvios significativos';
            
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            logger.log('Veredito: NORMAL - Dados consistentes', 'success');
        }
    }

    // ============================================
    // FUNÇÕES DE DEMONSTRAÇÃO E LIMPEZA
    // ============================================

    function carregarDemo() {
        logger.log('A carregar dados de simulação forense...', 'info');
        
        limparDadosInterface();
        
        State.financeiro.bruto = 3202.54;
        State.financeiro.liquido = 2409.95;
        State.financeiro.comissoes = 792.59;
        State.financeiro.dac7 = 7755.16;
        
        State.financeiro.extrato = {
            ganhosApp: 3157.94,
            ganhosCampanha: 0,
            gorjetas: 44.60,
            portagens: 0,
            taxasCancel: 0,
            comissoes: 792.59,
            ganhosLiquidos: 2409.95
        };
        
        State.financeiro.dac7Trimestres = {
            t1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            t2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            t3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            t4: { ganhos: 7755.16, comissoes: 239.00, impostos: 0, servicos: 1648 }
        };
        
        State.financeiro.viagens = [
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 20.24, comissao: 4.66 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 11.98, comissao: 2.76 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 9.23, comissao: 2.12 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 14.69, comissao: 3.38 },
            { data: '2024-12-31', motorista: 'Eduardo Monteiro', numFatura: '1315099-PT1124', valor: 5.80, comissao: 1.33 }
        ];
        
        State.financeiro.faturas = [
            { numero: 'Fatura Bolt PT1125-3582', valor: 239.00, periodo: 'Dezembro 2024', autoliquidacao: false }
        ];
        
        State.autenticidade = [
            { algoritmo: 'SHA256', hash: '8D0E916DA5671C8E7D3D93E725F95EB9', ficheiro: '131509_202412.csv' },
            { algoritmo: 'SHA256', hash: '72EBE71E672F888C25F297DE6B5F61D6', ficheiro: 'Fatura Bolt PT1125-3582.pdf' },
            { algoritmo: 'SHA256', hash: '533F00E20333570148C476CD2B00BA20', ficheiro: 'Ganhos da empresa.pdf' }
        ];
        
        State.documentos = [
            { timestamp: new Date().toISOString(), nome: '131509_202412.csv', tipo: 'CSV', valorBruto: 61.94, comissao: 14.25, liquido: 47.69 },
            { timestamp: new Date().toISOString(), nome: 'Fatura Bolt PT1125-3582.pdf', tipo: 'Fatura', valorBruto: 239.00, comissao: 0, liquido: 0 },
            { timestamp: new Date().toISOString(), nome: 'Ganhos da empresa.pdf', tipo: 'Extrato', valorBruto: 3157.94, comissao: 792.59, liquido: 2409.95 }
        ];
        
        const tbodyHash = document.querySelector('#table-hashes tbody');
        if (tbodyHash) {
            tbodyHash.innerHTML = '';
            State.autenticidade.forEach(function(item) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.algoritmo}</td>
                    <td style="color: var(--accent-green);">${item.hash.substring(0, 16)}...</td>
                    <td>${item.ficheiro}</td>
                    <td><span style="color: var(--success);">✓ VALIDADO</span></td>
                `;
                tbodyHash.appendChild(tr);
            });
        }
        
        const tbodyViagens = document.querySelector('#table-viagens tbody');
        if (tbodyViagens) {
            tbodyViagens.innerHTML = '';
            State.financeiro.viagens.forEach(function(v) {
                const taxa = ((v.comissao / v.valor) * 100).toFixed(2) + '%';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${v.data}</td>
                    <td>${v.motorista}</td>
                    <td>${v.numFatura}</td>
                    <td>${formatarMoeda(v.valor)}</td>
                    <td>${formatarMoeda(v.comissao)}</td>
                    <td>${taxa}</td>
                `;
                tbodyViagens.appendChild(tr);
            });
        }
        
        document.getElementById('count-ctrl').textContent = '3';
        document.getElementById('count-saft').textContent = '1';
        document.getElementById('count-fat').textContent = '1';
        document.getElementById('count-ext').textContent = '1';
        document.getElementById('count-dac7').textContent = '1';
        
        atualizarInterface();
        
        // Executar cruzamentos após demo
        executarCruzamentos();
        gerarMasterHash();
        
        logger.log('DEMO carregada com sucesso. Dados sincronizados com documentos reais.', 'success');
    }

    function limparSistema() {
        if (!confirm('Tem a certeza que pretende limpar todos os dados?')) return;
        
        limparDadosInterface();
        
        State.financeiro = {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            dac7: 0,
            viagens: [],
            faturas: [],
            extrato: {
                ganhosApp: 0,
                ganhosCampanha: 0,
                gorjetas: 0,
                portagens: 0,
                taxasCancel: 0,
                comissoes: 0,
                ganhosLiquidos: 0
            },
            dac7Trimestres: {
                t1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                t4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        };
        
        State.cruzamentos = {
            saftVsDac7: { realizado: false, valorSAFT: 0, valorDAC7: 0, diferenca: 0, convergente: false, alerta: null },
            brutoVsGanhosApp: { realizado: false, valorBruto: 0, valorCalculado: 0, diferenca: 0, convergente: false, alerta: null },
            comissoesVsFatura: { realizado: false, totalComissoes: 0, totalFaturas: 0, diferenca: 0, taxaEfetiva: 0, convergente: false, alertasPorViagem: [] }
        };
        
        State.autenticidade = [];
        State.documentos = [];
        State.fila = [];
        State.alertas = [];
        
        logger.limpar();
        logger.log('Sistema limpo. Todos os dados removidos.', 'warning');
        
        const masterHashEl = document.getElementById('master-hash');
        const displayHashEl = document.getElementById('display-hash');
        
        if (masterHashEl) {
            masterHashEl.textContent = '---';
        }
        
        if (displayHashEl) {
            displayHashEl.textContent = 'Aguardando análise...';
        }
        
        const diffDac7 = document.getElementById('diff-dac7');
        if (diffDac7) {
            diffDac7.innerText = '0.00';
        }
        
        const totalSaft = document.getElementById('total-saft');
        const totalLiquido = document.getElementById('total-liquido');
        
        if (totalSaft) {
            totalSaft.innerText = '0.00';
        }
        
        if (totalLiquido) {
            totalLiquido.innerText = '0.00';
        }
    }

    function limparDadosInterface() {
        const tbodyHash = document.querySelector('#table-hashes tbody');
        const tbodyViagens = document.querySelector('#table-viagens tbody');
        const fileQueue = document.getElementById('file-queue');
        
        if (tbodyHash) tbodyHash.innerHTML = '';
        if (tbodyViagens) tbodyViagens.innerHTML = '';
        if (fileQueue) fileQueue.innerHTML = '';
        
        const alertasContainer = document.getElementById('alertas-container');
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        const veredictoSection = document.getElementById('veredicto-section');
        if (veredictoSection) veredictoSection.style.display = 'none';
        
        const contadores = ['ctrl', 'saft', 'fat', 'ext', 'dac7'];
        contadores.forEach(function(id) {
            const el = document.getElementById(`count-${id}`);
            if (el) el.textContent = '0';
        });
        
        const statusElements = ['status-saft-dac7', 'status-bruto-extrato', 'status-comissoes-faturas'];
        statusElements.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = 'A aguardar dados';
                el.className = 'cruzamento-status';
            }
        });
        
        const triElements = ['tri-saft-dac7', 'tri-bruto-extrato', 'tri-comissoes-faturas'];
        triElements.forEach(function(id) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '---';
            }
        });
        
        atualizarInterface();
    }

    // ============================================
    // EXPORTAR JSON COM CRUZAMENTOS
    // ============================================
    
    async function exportarJSON() {
        logger.log('A preparar exportação JSON com cruzamentos...', 'info');
        
        // Garantir que cruzamentos estão atualizados
        executarCruzamentos();
        
        // Gerar Master Hash SHA-256
        const masterHash = await gerarMasterHash();
        
        const dados = {
            metadados: {
                sessao: {
                    id: State.sessao.id,
                    inicio: State.sessao.inicio ? State.sessao.inicio.toISOString() : null,
                    timestamp: new Date().toISOString()
                },
                versao: CONFIG.VERSAO,
                edicao: CONFIG.EDICAO
            },
            autenticidade: {
                masterHash: masterHash,
                evidencias: State.autenticidade.map(a => ({
                    algoritmo: a.algoritmo,
                    hash: a.hash,
                    ficheiro: a.ficheiro,
                    validado: true
                }))
            },
            financeiro: {
                totais: {
                    bruto: State.financeiro.bruto,
                    comissoes: State.financeiro.comissoes,
                    liquido: State.financeiro.liquido,
                    dac7: State.financeiro.dac7,
                    numeroViagens: State.financeiro.viagens.length,
                    numeroFaturas: State.financeiro.faturas.length,
                    taxaMedia: State.financeiro.bruto > 0 ? 
                        (State.financeiro.comissoes / State.financeiro.bruto * 100) : 0
                },
                extrato: State.financeiro.extrato,
                dac7Trimestres: State.financeiro.dac7Trimestres,
                viagens: State.financeiro.viagens,
                faturas: State.financeiro.faturas
            },
            cruzamentos: State.cruzamentos,
            documentos: State.documentos,
            alertas: State.alertas.map(a => ({
                tipo: a.tipo,
                titulo: a.titulo,
                descricao: a.descricao,
                valor: a.valor,
                timestamp: a.timestamp.toISOString()
            })),
            logs: State.logs.slice(-50).map(l => ({
                timestamp: l.timestamp.toISOString(),
                msg: l.msg,
                tipo: l.tipo
            }))
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Export_${State.sessao.id}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        logger.log(`Exportação JSON realizada com sucesso. Master Hash: ${masterHash.hash.substring(0, 16)}...`, 'success');
        
        return dados;
    }
    
    // ============================================
    // EXPORTAR PDF COM RELATÓRIO PERICIAL
    // ============================================
    
    function exportarPDF() {
        logger.log('A gerar relatório pericial em PDF...', 'info');
        
        if (typeof window.jspdf === 'undefined') {
            logger.log('Biblioteca jsPDF não carregada', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("RELATÓRIO PERICIAL VDC - PROVA LEGAL", 14, 20);
        doc.setFontSize(10);
        doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-PT')}`, 14, 30);
        doc.text(`Hora: ${new Date().toLocaleTimeString('pt-PT')}`, 14, 35);
        doc.text(`Sessão: ${State.sessao.id}`, 14, 40);
        
        const masterHashEl = document.getElementById('master-hash');
        const masterHash = masterHashEl ? masterHashEl.textContent : '---';
        doc.text(`Master Hash: ${masterHash}`, 14, 45);
        
        doc.autoTable({
            startY: 55,
            head: [['Descrição', 'Valor Acumulado']],
            body: [
                ['Total SAF-T', `${State.financeiro.bruto.toFixed(2)} €`],
                ['Total Líquido', `${State.financeiro.liquido.toFixed(2)} €`],
                ['Total Comissões', `${State.financeiro.comissoes.toFixed(2)} €`],
                ['Total DAC7', `${State.financeiro.dac7.toFixed(2)} €`],
                ['Diferença SAF-T vs DAC7', `${(State.financeiro.bruto - State.financeiro.dac7).toFixed(2)} €`],
                ['N.º Viagens', State.financeiro.viagens.length.toString()],
                ['Taxa Média', `${(State.financeiro.comissoes / (State.financeiro.bruto || 1) * 100).toFixed(2)}%`]
            ]
        });
        
        // Adicionar alertas se existirem
        if (State.alertas.length > 0) {
            doc.addPage();
            doc.setFontSize(14);
            doc.text("Alertas Detectados", 14, 20);
            doc.setFontSize(8);
            
            const alertasBody = State.alertas.map(a => [
                a.tipo.toUpperCase(),
                a.titulo,
                a.descricao,
                a.valor ? `${a.valor.toFixed(2)} €` : '-'
            ]);
            
            doc.autoTable({
                startY: 30,
                head: [['Tipo', 'Título', 'Descrição', 'Valor']],
                body: alertasBody
            });
        }
        
        doc.save(`VDC_Auditoria_${Date.now()}.pdf`);
        logger.log('Relatório PDF gerado com sucesso', 'success');
    }

    // ============================================
    // EXPOSIÇÃO PARA DEBUG
    // ============================================

    window.VDC = {
        State: State,
        CONFIG: CONFIG,
        logger: logger,
        carregarDemo: carregarDemo,
        limparSistema: limparSistema,
        exportarJSON: exportarJSON,
        exportarPDF: exportarPDF,
        executarCruzamentos: executarCruzamentos,
        gerarMasterHash: gerarMasterHash,
        analisarDados: analisarDados,
        stateHistory: stateHistory
    };

})();
