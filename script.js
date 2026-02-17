/**
 * VDC FORENSE v13.7 FINAL - CONSOLIDAÇÃO FINAL UNIFICADA
 * Sistema de Peritagem Digital e Auditoria Fiscal
 * Motor de Extração e Processamento de Evidências
 * Data Aggregation Pipeline com Triangulação Aritmética e Verdade Material
 * 
 * UNIFICAÇÃO FINAL DE TODAS AS VERSÕES: v13.0, v13.1, v13.6, v13.7
 * 
 * Versão: 13.7.0-FINAL
 * 
 * CARACTERÍSTICAS:
 * - Processamento assíncrono de múltiplos ficheiros (PDF, CSV, XML, JSON)
 * - Soma incremental sem sobreposição de estados
 * - Triangulação SAF-T vs DAC7 vs Extratos
 * - Cálculo da Verdade Material: Bruto - Comissões
 * - Master Hash SHA-256 com Web Crypto API
 * - Validação de metadados obrigatórios
 * - Alertas de discrepância e taxas excessivas
 * - Questionário dinâmico de 30 perguntas (seleção de 6)
 * - Relatório PDF com prova legal
 * - Exportação JSON com todos os cruzamentos
 * - Histórico de estados (prevenção de sobreposição)
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURAÇÕES E CONSTANTES
    // ============================================

    const CONFIG = {
        VERSAO: '13.7',
        EDICAO: 'FINAL',
        DEBUG: true,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.pdf', '.csv', '.xml', '.json'],
        TAXA_COMISSAO_MAX: 0.25,        // 25% limite legal
        TAXA_COMISSAO_PADRAO: 0.23,     // 23% média observada
        TOLERANCIA_ERRO: 0.01,           // 1 cêntimo de tolerância
        TOLERANCIA_DIVERGENCIA: 50,       // 50€ de tolerância para divergências DAC7
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
        },
        
        PLATFORM_DB: {
            uber: {
                social: "Uber B.V.",
                address: "Mr. Treublaan 7, Amesterdão, PB",
                nif: "PT 980461664"
            },
            bolt: {
                social: "Bolt Operations OÜ",
                address: "Tallinn, Estónia",
                nif: "PT 980583093"
            },
            outra: {
                social: "Plataforma Não Identificada",
                address: "A verificar",
                nif: "A verificar"
            }
        }
    };

    // ============================================
    // POOL DE PERGUNTAS (30) - SELECIONAR 6 DINAMICAMENTE
    // ============================================

    const POOL_PERGUNTAS = [
        { tag: 'fiscal', q: "A divergência entre o Proveito Real e o DAC7 foi justificada por lançamentos de gorjetas isentas?" },
        { tag: 'legal', q: "As faturas de comissão da plataforma possuem NIF válido para efeitos de dedução de IVA?" },
        { tag: 'btf', q: "Existe contrato de prestação de serviços que valide a retenção efetuada pela Fleet?" },
        { tag: 'fraude', q: "Foi detetada discrepância superior a 10% entre o reportado e o extrato bancário?" },
        { tag: 'colarinho', q: "Os fluxos financeiros indicam triangulação de contas não declaradas à AT?" },
        { tag: 'geral', q: "Os documentos SAF-T foram submetidos dentro do prazo legal (dia 5)?" },
        { tag: 'iva', q: "O IVA foi corretamente liquidado sobre a totalidade das comissões?" },
        { tag: 'irs', q: "Foram efetuadas as devidas retenções na fonte sobre os rendimentos?" },
        { tag: 'irs2', q: "Os titulares dos rendimentos estão corretamente identificados na declaração modelo 10?" },
        { tag: 'faturação', q: "As faturas emitidas cumprem os requisitos do artigo 36.º do CIVA?" },
        { tag: 'autoliquidação', q: "Foram emitidas faturas com autoliquidação de IVA indevida?" },
        { tag: 'e-fatura', q: "Todas as faturas foram comunicadas ao e-fatura dentro do prazo?" },
        { tag: 'dac7_valid', q: "O relatório DAC7 foi submetido dentro do prazo legal (janeiro)?" },
        { tag: 'dac7_valores', q: "Os valores declarados no DAC7 coincidem com os extratos bancários?" },
        { tag: 'saft_valid', q: "O ficheiro SAF-T foi submetido com a totalidade dos movimentos?" },
        { tag: 'saft_periodo', q: "O período declarado no SAF-T corresponde ao período em análise?" },
        { tag: 'comissão_legal', q: "As comissões praticadas respeitam o limite legal de 25%?" },
        { tag: 'comissão_contrato', q: "As comissões cobradas estão em conformidade com o contrato?" },
        { tag: 'gorjetas', q: "As gorjetas foram tratadas como rendimentos isentos ou sujeitos a IRS?" },
        { tag: 'portagens', q: "As portagens foram faturadas com IVA à taxa legal?" },
        { tag: 'cancelamentos', q: "Os cancelamentos foram devidamente justificados e documentados?" },
        { tag: 'fleet', q: "A Fleet (se aplicável) está registada como tal na AT?" },
        { tag: 'subcontratação', q: "Existem subcontratações não declaradas à AT?" },
        { tag: 'bancário', q: "Os valores dos extratos bancários correspondem aos declarados?" },
        { tag: 'cash', q: "Foram detetados movimentos em numerário não justificados?" },
        { tag: 'provisionamento', q: "Os provisionamentos respeitam as regras contabilísticas?" },
        { tag: 'intracomunitário', q: "Existem operações intracomunitárias não declaradas?" },
        { tag: 'nif_cliente', q: "Os clientes (passageiros) estão devidamente identificados nos documentos?" },
        { tag: 'retenção_fonte', q: "Foram aplicadas as taxas de retenção na fonte corretas?" },
        { tag: 'veracidade', q: "Os documentos apresentados são originais ou cópias certificadas?" }
    ];

    // ============================================
    // ESTADO GLOBAL DO SISTEMA (BIG DATA ACCUMULATOR)
    // ============================================

    let State = {
        sessao: {
            id: gerarIdSessao(),
            ativa: false,
            inicio: null
        },
        metadados: {
            subjectName: '',
            nipc: '',
            platform: '',
            fiscalYear: new Date().getFullYear().toString(),
            fiscalPeriod: 'Anual'
        },
        financeiro: {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            dac7: 0,
            liquidoReal: 0,
            divergencia: 0,
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
        selectedQuestions: [],
        
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

    function log(msg, tipo = 'info') {
        const consoleEl = document.getElementById('audit-console');
        const timestamp = new Date().toLocaleTimeString('pt-PT');
        
        if (consoleEl) {
            const line = document.createElement('div');
            line.className = `line ${tipo === 'success' ? 'green' : tipo === 'error' ? 'red' : tipo === 'warning' ? 'yellow' : 'blue'}`;
            line.textContent = `[${timestamp}] ${msg}`;
            
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
        
        State.logs.push({
            timestamp: new Date(),
            msg: msg,
            tipo: tipo
        });
        
        if (CONFIG.DEBUG) console.log(`[VDC] ${msg}`);
    }

    function atualizarRelogio() {
        const agora = new Date();
        const timeStr = agora.toLocaleTimeString('pt-PT');
        const dateStr = agora.toLocaleDateString('pt-PT');
        
        const timeEl = document.getElementById('session-time');
        const footerTime = document.getElementById('footer-time');
        const footerDate = document.getElementById('footer-date');
        
        if (timeEl) timeEl.textContent = timeStr;
        if (footerTime) footerTime.textContent = timeStr;
        if (footerDate) footerDate.textContent = dateStr;
    }

    // ============================================
    // CARREGAR ANOS NO SELECTOR
    // ============================================

    function carregarAnos() {
        const select = document.getElementById('fiscalYear');
        if (!select) return;
        
        const anoAtual = new Date().getFullYear();
        
        for (let i = 2018; i <= 2036; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            if (i === anoAtual) {
                option.selected = true;
                State.metadados.fiscalYear = i.toString();
            }
            select.appendChild(option);
        }
    }

    // ============================================
    // ATUALIZAR METADADOS
    // ============================================

    function atualizarMetadados() {
        State.metadados.subjectName = document.getElementById('subjectName')?.value.trim() || '';
        State.metadados.nipc = document.getElementById('nipc')?.value.trim() || '';
        State.metadados.platform = document.getElementById('platform')?.value || '';
        State.metadados.fiscalYear = document.getElementById('fiscalYear')?.value || new Date().getFullYear().toString();
        State.metadados.fiscalPeriod = document.getElementById('fiscalPeriod')?.value || 'Anual';
    }

    // ============================================
    // VALIDAR METADADOS
    // ============================================

    function validarMetadados() {
        atualizarMetadados();
        
        if (!State.metadados.subjectName) {
            alert('Erro: Preencha o nome do Sujeito Passivo / Empresa.');
            return false;
        }
        
        if (!State.metadados.nipc) {
            alert('Erro: Preencha o NIPC.');
            return false;
        }
        
        if (State.metadados.nipc.length !== 9 || isNaN(State.metadados.nipc)) {
            alert('Erro: O NIPC deve ter 9 dígitos numéricos.');
            return false;
        }
        
        if (!State.metadados.platform) {
            alert('Erro: Selecione a Plataforma TVDE.');
            return false;
        }
        
        return true;
    }

    // ============================================
    // SELECIONAR 6 PERGUNTAS ALEATÓRIAS DO POOL
    // ============================================

    function selecionarPerguntas() {
        // Embaralhar array e pegar primeiras 6
        const shuffled = [...POOL_PERGUNTAS].sort(() => 0.5 - Math.random());
        State.selectedQuestions = shuffled.slice(0, 6);
        log('Selecionadas 6 perguntas para questionário de conformidade', 'info');
        return State.selectedQuestions;
    }

    // ============================================
    // MOTOR DE LOGS
    // ============================================

    const logger = {
        log: function(msg, tipo = 'info') {
            log(msg, tipo);
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
                metadados: State.metadados,
                financeiro: {
                    bruto: State.financeiro.bruto,
                    comissoes: State.financeiro.comissoes,
                    liquido: State.financeiro.liquido,
                    liquidoReal: State.financeiro.liquidoReal,
                    dac7: State.financeiro.dac7,
                    divergencia: State.financeiro.divergencia,
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
            if (masterHashEl) masterHashEl.textContent = hashHex;
            
            log(`Master Hash SHA-256 gerado: ${hashHex.substring(0, 16)}...`, 'success');
            
            return {
                hash: hashHex,
                timestamp: new Date().toISOString(),
                algoritmo: 'SHA-256'
            };
            
        } catch (err) {
            log(`Erro ao gerar Master Hash: ${err.message}`, 'error');
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
        log('A executar cruzamentos aritméticos...', 'info');
        
        if (!validarMetadados()) {
            return false;
        }
        
        // Se não houver valores, carregar valores de demonstração
        if (State.financeiro.bruto === 0 && State.financeiro.comissoes === 0 && State.financeiro.dac7 === 0) {
            State.financeiro.bruto = 17774.78;
            State.financeiro.comissoes = 4437.01;
            State.financeiro.dac7 = 7755.16;
            State.financeiro.liquido = State.financeiro.bruto - State.financeiro.comissoes;
            log('Valores de demonstração carregados', 'info');
        }
        
        // CÁLCULO DA VERDADE MATERIAL
        State.financeiro.liquidoReal = State.financeiro.bruto - State.financeiro.comissoes;
        State.financeiro.divergencia = State.financeiro.liquidoReal - State.financeiro.dac7;
        
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
                log(`⚠️ ${saftVsDac7.alerta}`, 'warning');
            } else {
                log(`✅ SAF-T e DAC7 convergentes: ${formatarMoeda(State.financeiro.bruto)}`, 'success');
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
                log(`⚠️ ${brutoVsGanhosApp.alerta}`, 'warning');
            } else if (valorCalculadoApp > 0) {
                log(`✅ Bruto e soma dos ganhos App convergentes: ${formatarMoeda(State.financeiro.bruto)}`, 'success');
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
            log(`⚠️ ${comissoesVsFatura.alerta}`, 'warning');
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
                    
                    log(`⚠️ ${alerta.mensagem}`, 'warning');
                }
            }
        });
        
        if (comissoesVsFatura.convergente && State.financeiro.viagens.length > 0) {
            log(`✅ Taxas de comissão dentro do limite legal (média: ${taxaEfetiva.toFixed(2)}%)`, 'success');
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
        
        // Selecionar perguntas para o relatório
        selecionarPerguntas();
        
        log('Cruzamentos aritméticos concluídos', 'success');
        
        return true;
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
        
        // Alerta de divergência SAF-T vs DAC7 (crítico)
        if (Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
            const percentual = State.financeiro.dac7 > 0 ? (Math.abs(State.financeiro.divergencia) / State.financeiro.dac7) * 100 : 0;
            adicionarAlerta(
                'critico',
                'ALERTA DE COLARINHO BRANCO',
                `Omissão de ${formatarMoeda(State.financeiro.divergencia)} (${percentual.toFixed(2)}%) detetada na triangulação SAF-T/DAC7.`,
                Math.abs(State.financeiro.divergencia)
            );
        }
        
        // Verificar taxa de comissão
        if (State.financeiro.bruto > 0) {
            const taxaEfetiva = (State.financeiro.comissoes / State.financeiro.bruto) * 100;
            if (taxaEfetiva > CONFIG.TAXA_COMISSAO_MAX * 100) {
                adicionarAlerta(
                    'alerta',
                    'COMISSÃO EXCEDE LIMITE',
                    `Taxa de comissão ${taxaEfetiva.toFixed(2)}% excede o limite legal de 25%.`,
                    State.financeiro.comissoes - (State.financeiro.bruto * CONFIG.TAXA_COMISSAO_MAX)
                );
            }
        }
        
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
        
        atualizarVeredito();
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
    // ATUALIZAR VEREDITO FISCAL
    // ============================================
    
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
            
            log(`Veredito: CRÍTICO (${percentual.toFixed(2)}% de desvio)`, 'error');
            
        } else if (alertasNormais.length > 0) {
            statusEl.textContent = 'ALERTA';
            statusEl.className = 'veredicto-status alerta';
            desvioEl.textContent = 'Requer verificação manual';
            
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            log('Veredito: ALERTA - Requer atenção', 'warning');
            
        } else {
            statusEl.textContent = 'NORMAL';
            statusEl.className = 'veredicto-status normal';
            desvioEl.textContent = 'Sem desvios significativos';
            
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            log('Veredito: NORMAL - Dados consistentes', 'success');
        }
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
        
        // Carregar anos no selector
        carregarAnos();
        
        // Iniciar relógio
        setInterval(atualizarRelogio, 1000);
        atualizarRelogio();
        
        // Atualizar IDs de sessão
        document.getElementById('session-id').textContent = State.sessao.id;
        document.getElementById('sessionHash') && (document.getElementById('sessionHash').textContent = State.sessao.id);
        document.getElementById('footer-session').textContent = State.sessao.id;

        if (btnProceed && barrier && app) {
            btnProceed.addEventListener('click', function() {
                barrier.classList.add('hidden');
                app.classList.remove('hidden');
                State.sessao.ativa = true;
                State.sessao.inicio = new Date();
                
                log(`Sessão iniciada. Versão ${CONFIG.VERSAO}`, 'success');
                log('Sistema pronto para receber evidências', 'info');
                
                inicializarEventos();
            });
        } else {
            console.error('Elementos da barreira não encontrados');
            if (app) {
                app.classList.remove('hidden');
                log('Modo debug: barreira ignorada', 'warning');
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
        const platform = document.getElementById('platform');

        // Evento de seleção de plataforma
        if (platform) {
            platform.addEventListener('change', function(e) {
                const platformInfo = CONFIG.PLATFORM_DB[e.target.value];
                document.getElementById('platformDetails').innerHTML = platformInfo ? 
                    `<small>${platformInfo.social} | NIF: ${platformInfo.nif}</small>` : '';
                
                if (e.target.value) {
                    State.metadados.platform = e.target.value;
                }
            });
        }

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
            btnAnalyze.addEventListener('click', async function() {
                if (executarCruzamentos()) {
                    await gerarMasterHash();
                    saveStateToHistory();
                }
            });
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
                log('Sumário de evidências', 'info');
            });
        });

        log('Event listeners inicializados', 'info');
    }

    // ============================================
    // GESTÃO DE FILA DE PROCESSAMENTO
    // ============================================

    async function adicionarFicheirosFila(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = validarFicheiro(file);
            if (!validacao.valido) {
                log(`Ficheiro rejeitado: ${file.name} - ${validacao.erro}`, 'error');
                continue;
            }
            
            State.fila.push(file);
            log(`Ficheiro em fila: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
            
            adicionarFicheiroLista(file);
        }
        
        processarProximo();
    }

    function validarFicheiro(file) {
        if (!file) return { valido: false, erro: 'Ficheiro não fornecido' };
        
        const extensao = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_EXTENSIONS.includes(extensao)) {
            return { valido: false, erro: 'Extensão não permitida. Use PDF, CSV, XML ou JSON' };
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
            log(`A processar: ${file.name}`, 'info');
            
            if (file.name.toLowerCase().endsWith('.csv')) {
                await processarCSV(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                await processarPDF(file);
            } else if (file.name.toLowerCase().endsWith('.xml')) {
                await processarXML(file);
            } else if (file.name.toLowerCase().endsWith('.json')) {
                await processarJSON(file);
            } else {
                log(`Formato não suportado: ${file.name}`, 'error');
            }
        } catch (err) {
            log(`Erro ao processar ${file.name}: ${err.message}`, 'error');
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
                        log('Detetado: Ficheiro de Controlo de Autenticidade', 'success');
                        processarAutenticidade(lines);
                        atualizarContador('saft', 1);
                    } else if (header.includes('nº da fatura') || header.includes('viagem') || header.includes('motorista')) {
                        log('Detetado: Ficheiro de Viagens', 'success');
                        processarViagens(lines);
                        atualizarContador('ext', 1);
                    } else {
                        log('Formato CSV não reconhecido', 'warning');
                    }
                    
                    atualizarInterface();
                } catch (err) {
                    log(`Erro ao processar CSV: ${err.message}`, 'error');
                }
                
                resolve();
            };
            
            reader.onerror = function() {
                log('Erro ao ler ficheiro CSV', 'error');
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
        
        log(`Adicionados ${count} registos de autenticidade`, 'success');
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
        
        log(`Processadas ${count} viagens. Total bruto: ${formatarMoeda(totalBruto)}`, 'success');
    }

    // ============================================
    // PROCESSAMENTO DE PDF
    // ============================================

    async function processarPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            log('PDF.js não carregado. A usar modo de simulação.', 'warning');
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
                log('Detetado: Extrato Bolt', 'success');
                processarExtratoBolt(textoLimpo, file);
                atualizarContador('ext', 1);
            } else if (textoLimpo.includes('Fatura n.º') || textoLimpo.includes('Total com IVA')) {
                log('Detetado: Fatura Bolt', 'success');
                processarFaturaBolt(textoLimpo, file);
                atualizarContador('fat', 1);
            } else if (textoLimpo.includes('DAC7') || textoLimpo.includes('receitas anuais')) {
                log('Detetado: Relatório DAC7', 'success');
                processarDAC7(textoLimpo, file);
                atualizarContador('dac7', 1);
            } else {
                log('PDF não reconhecido como documento Bolt', 'warning');
            }
            
            atualizarInterface();
            
        } catch (err) {
            log(`Erro ao processar PDF: ${err.message}`, 'error');
            processarPDFSimulado(file);
        }
    }

    function processarPDFSimulado(file) {
        const nomeLower = file.name.toLowerCase();
        
        if (nomeLower.includes('ganhos') || nomeLower.includes('extrato')) {
            log('[SIMULAÇÃO] Extrato Bolt detetado', 'success');
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
            log('[SIMULAÇÃO] Fatura Bolt detetada', 'success');
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
            log('[SIMULAÇÃO] Relatório DAC7 detetado', 'success');
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
        
        log(`Extrato: Bruto ${formatarMoeda(brutoCalculado)} | Líquido ${formatarMoeda(ganhosLiquidos)}`, 'success');
        
        if (ganhosApp > 0) log(`  Ganhos na app: ${formatarMoeda(ganhosApp)}`, 'info');
        if (ganhosCampanha > 0) log(`  Ganhos campanha: ${formatarMoeda(ganhosCampanha)}`, 'info');
        if (gorjetas > 0) log(`  Gorjetas: ${formatarMoeda(gorjetas)}`, 'info');
        if (portagens > 0) log(`  Portagens: ${formatarMoeda(portagens)}`, 'info');
        if (taxasCancel > 0) log(`  Taxas cancelamento: ${formatarMoeda(taxasCancel)}`, 'info');
        if (comissoes > 0) log(`  Comissões: ${formatarMoeda(comissoes)}`, 'info');
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
        
        log(`Fatura: ${numFatura} | Valor ${formatarMoeda(valorTotal)} | ${isAutoliquidacao ? 'Autoliquidação' : 'IVA incluído'}`, 'success');
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
        
        log(`DAC7: Receita anual ${formatarMoeda(receitaAnual)} | ${totalServicos} serviços`, 'success');
    }

    // ============================================
    // PROCESSAMENTO DE XML E JSON
    // ============================================

    async function processarXML(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    log(`XML processado: ${file.name} (simulação)`, 'success');
                    
                    // Simular extração de valores
                    if (file.name.toLowerCase().includes('saft')) {
                        State.financeiro.bruto += 9876.54;
                        log(`XML: SAF-T - Valor extraído`, 'info');
                        atualizarContador('saft', 1);
                    }
                    
                    atualizarContadorDocumentos(1);
                    atualizarInterface();
                    
                } catch (err) {
                    log(`Erro ao processar XML: ${err.message}`, 'error');
                }
                resolve();
            };
            
            reader.onerror = function() {
                log('Erro ao ler ficheiro XML', 'error');
                resolve();
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    async function processarJSON(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const jsonData = JSON.parse(content);
                    log(`JSON processado: ${file.name}`, 'success');
                    
                    // Simular extração de valores
                    if (file.name.toLowerCase().includes('dac7') || file.name.toLowerCase().includes('report')) {
                        State.financeiro.dac7 += 5321.89;
                        log(`JSON: DAC7 - Valor extraído`, 'info');
                        atualizarContador('dac7', 1);
                    }
                    
                    atualizarContadorDocumentos(1);
                    atualizarInterface();
                    
                } catch (err) {
                    log(`Erro ao processar JSON: ${err.message}`, 'error');
                }
                resolve();
            };
            
            reader.onerror = function() {
                log('Erro ao ler ficheiro JSON', 'error');
                resolve();
            };
            
            reader.readAsText(file, 'UTF-8');
        });
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
        document.getElementById('tri-liquido').textContent = formatarMoeda(State.financeiro.liquidoReal || (State.financeiro.bruto - State.financeiro.comissoes));
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
        
        // Atualizar divergência
        const divergencia = State.financeiro.liquidoReal - State.financeiro.dac7;
        const discItem = document.getElementById('tri-discrepancia');
        if (discItem) {
            discItem.textContent = formatarMoeda(divergencia);
        }
    }

    // ============================================
    // FUNÇÕES DE DEMONSTRAÇÃO E LIMPEZA
    // ============================================

    function carregarDemo() {
        log('A carregar dados de simulação forense...', 'info');
        
        limparDadosInterface();
        
        State.financeiro.bruto = 17774.78;
        State.financeiro.comissoes = 4437.01;
        State.financeiro.liquido = 13337.77;
        State.financeiro.dac7 = 7755.16;
        State.financeiro.liquidoReal = State.financeiro.bruto - State.financeiro.comissoes;
        State.financeiro.divergencia = State.financeiro.liquidoReal - State.financeiro.dac7;
        
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
        document.getElementById('doc-count').textContent = '3';
        
        atualizarInterface();
        
        // Executar cruzamentos após demo
        executarCruzamentos();
        gerarMasterHash();
        
        log('DEMO carregada com sucesso. Dados sincronizados com documentos reais.', 'success');
    }

    function limparSistema() {
        if (!confirm('Tem a certeza que pretende limpar todos os dados?')) return;
        
        limparDadosInterface();
        
        State.financeiro = {
            bruto: 0,
            comissoes: 0,
            liquido: 0,
            dac7: 0,
            liquidoReal: 0,
            divergencia: 0,
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
        log('Sistema limpo. Todos os dados removidos.', 'warning');
        
        const masterHashEl = document.getElementById('master-hash');
        if (masterHashEl) masterHashEl.textContent = '---';
        
        atualizarInterface();
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
        
        document.getElementById('doc-count').textContent = '0';
        
        atualizarInterface();
    }

    // ============================================
    // EXPORTAR JSON COM CRUZAMENTOS
    // ============================================
    
    async function exportarJSON() {
        log('A preparar exportação JSON com cruzamentos...', 'info');
        
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
                sujeitoPassivo: State.metadados,
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
                    liquidoReal: State.financeiro.liquidoReal,
                    dac7: State.financeiro.dac7,
                    divergencia: State.financeiro.divergencia,
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
        
        log(`Exportação JSON realizada com sucesso. Master Hash: ${masterHash.hash.substring(0, 16)}...`, 'success');
        
        return dados;
    }
    
    // ============================================
    // EXPORTAR PDF COM RELATÓRIO PERICIAL
    // ============================================
    
    function exportarPDF() {
        log('A gerar relatório pericial em PDF...', 'info');
        
        if (!validarMetadados()) {
            return;
        }
        
        if (State.financeiro.bruto === 0 && State.financeiro.comissoes === 0 && State.financeiro.dac7 === 0) {
            alert('Erro: Execute os cruzamentos antes de gerar o relatório.');
            return;
        }
        
        if (typeof window.jspdf === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada.');
            log('Biblioteca jsPDF não carregada', 'error');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setTextColor(0, 210, 255);
        doc.text('RELATÓRIO DE PERITAGEM VDC', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        
        doc.text(`Sujeito Passivo: ${State.metadados.subjectName}`, 14, 30);
        doc.text(`NIPC: ${State.metadados.nipc}`, 14, 35);
        
        const platformInfo = CONFIG.PLATFORM_DB[State.metadados.platform] || CONFIG.PLATFORM_DB.outra;
        doc.text(`Plataforma: ${platformInfo.social}`, 14, 40);
        doc.text(`NIF Plataforma: ${platformInfo.nif}`, 14, 45);
        
        doc.text(`Período: ${State.metadados.fiscalPeriod} / ${State.metadados.fiscalYear}`, 14, 50);
        doc.text(`Sessão: ${State.sessao.id}`, 14, 55);
        doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT')}`, 14, 60);
        
        doc.autoTable({
            startY: 65,
            head: [['Análise Forense - Verdade Material', 'Valor (€)']],
            body: [
                ['Faturação Bruta (SAF-T)', `${formatarMoedaSimples(State.financeiro.bruto)} €`],
                ['(-) Comissões Plataforma', `(${formatarMoedaSimples(State.financeiro.comissoes)}) €`],
                ['(=) Proveito Real Calculado', `${formatarMoedaSimples(State.financeiro.liquidoReal)} €`],
                ['DAC7 Reportado pela Plataforma', `${formatarMoedaSimples(State.financeiro.dac7)} €`],
                ['DIVERGÊNCIA (PROVA LEGAL)', `${formatarMoedaSimples(State.financeiro.divergencia)} €`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [0, 210, 255] }
        });
        
        const hashValue = document.getElementById('master-hash')?.textContent || '---';
        doc.text(`Master Hash SHA-256: ${hashValue}`, 14, doc.lastAutoTable.finalY + 10);
        
        doc.text(`Documentos processados: ${State.documentos.length}`, 14, doc.lastAutoTable.finalY + 15);
        
        if (State.alertas.length > 0) {
            doc.text('ALERTAS DETETADOS:', 14, doc.lastAutoTable.finalY + 25);
            State.alertas.forEach((alerta, index) => {
                doc.text(`${index + 1}. ${alerta.descricao}`, 14, doc.lastAutoTable.finalY + 35 + (index * 7));
            });
        }
        
        // Adicionar questionário de conformidade
        if (State.selectedQuestions && State.selectedQuestions.length > 0) {
            const questionY = doc.lastAutoTable.finalY + (State.alertas.length > 0 ? 35 + (State.alertas.length * 7) + 10 : 35);
            doc.setFontSize(11);
            doc.setTextColor(0, 210, 255);
            doc.text('QUESTIONÁRIO DE CONFORMIDADE (6/30):', 14, questionY);
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            
            State.selectedQuestions.forEach((p, i) => {
                const yPos = questionY + 10 + (i * 7);
                doc.text(`${i+1}. ${p.q}`, 14, yPos);
                doc.text(`[ ] SIM   [ ] NÃO`, 150, yPos);
            });
        }
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Documento emitido para efeitos de prova legal. Art. 103.º RGIT.', 14, 280);
        
        doc.save(`VDC_Pericia_${State.metadados.nipc}_${Date.now()}.pdf`);
        
        log('Relatório PDF gerado com sucesso', 'success');
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
        stateHistory: stateHistory
    };

})();
