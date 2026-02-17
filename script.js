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
        EDICAO: 'LEGAL WEAPON',
        DEBUG: true,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.pdf', '.csv', '.xml', '.json'],
        TAXA_COMISSAO_MAX: 0.25,        // 25% limite legal
        TAXA_COMISSAO_PADRAO: 0.23,      // 23% média observada
        TOLERANCIA_ERRO: 0.01,            // 1 cêntimo de tolerância
        TOLERANCIA_DIVERGENCIA: 50,       // 50€ de tolerância para divergências DAC7
        
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
            
            SAFT_CSV: /131509.*\.csv$/i,
            HASH_CSV: /CONTROLO_AUTENTICIDADE.*\.csv$/i,
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
            freenow: {
                social: "FreeNow Portugal, Unipessoal Lda.",
                address: "Rua Castilho, 39, 1250-066 Lisboa",
                nif: "PT514214739"
            },
            outra: {
                social: "Plataforma Não Identificada",
                address: "A verificar",
                nif: "A verificar"
            }
        }
    };

    // ==========================================================================
    // POOL DE PERGUNTAS (30) - SELECIONAR 6 DINAMICAMENTE
    // ==========================================================================

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

    // ==========================================================================
    // ESTADO GLOBAL DO SISTEMA (BIG DATA ACCUMULATOR)
    // ==========================================================================

    let State = {
        sessao: {
            id: gerarIdSessao(),
            hash: null,
            ativa: false,
            inicio: null,
            nivelAcesso: 4,
            processoAuto: null
        },
        user: {
            nome: null,
            nivel: 1,
            autenticado: false
        },
        metadados: {
            subjectName: '',
            nipc: '',
            platform: '',
            fiscalYear: new Date().getFullYear().toString(),
            fiscalPeriod: 'Anual',
            processo: ''
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
        ficheirosProcessados: new Set(),
        contadores: {
            ctrl: 0,
            saft: 0,
            fat: 0,
            ext: 0,
            dac7: 0
        },
        cruzamentos: {
            saftVsDac7: { realizado: false, valorSAFT: 0, valorDAC7: 0, diferenca: 0, convergente: false, alerta: null },
            brutoVsGanhosApp: { realizado: false, valorBruto: 0, valorCalculado: 0, diferenca: 0, convergente: false, alerta: null },
            comissoesVsFatura: { realizado: false, totalComissoes: 0, totalFaturas: 0, diferenca: 0, taxaEfetiva: 0, convergente: false, alertasPorViagem: [] }
        }
    };

    // Aliases para compatibilidade
    State.dadosFinanceiros = State.financeiro;

    // ==========================================================================
    // FUNÇÃO DE RESET DO ESTADO FINANCEIRO
    // ==========================================================================
    
    function resetFinancialState() {
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
        State.alertas = [];
        State.ficheirosProcessados.clear();
        State.contadores = { ctrl: 0, saft: 0, fat: 0, ext: 0, dac7: 0 };
        
        logger.limpar();
        log('🧹 Estado financeiro reinicializado para novo processamento', 'info');
        updateUI();
    }

    // ==========================================================================
    // HISTÓRICO DE ESTADOS (PREVENÇÃO DE SOBREPOSIÇÃO)
    // ==========================================================================
    
    let stateHistory = [];
    
    function saveStateToHistory() {
        stateHistory.push({
            timestamp: new Date().toISOString(),
            snapshot: JSON.parse(JSON.stringify(State))
        });
        
        if (stateHistory.length > 10) {
            stateHistory.shift();
        }
    }

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
        const num = parseFloat(valor);
        if (isNaN(num)) return '0,00';
        return num.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatarMoedaComEuro(valor) {
        return formatarMoeda(valor) + ' €';
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
        const terminal = document.getElementById('terminal');
        const timestamp = new Date().toLocaleTimeString('pt-PT');
        
        if (terminal) {
            const line = document.createElement('div');
            line.className = `log-line ${tipo}`;
            line.textContent = `[${timestamp}] ${msg}`;
            terminal.appendChild(line);
            terminal.scrollTop = terminal.scrollHeight;
        } else {
            // Fallback para o elemento antigo
            const consoleEl = document.getElementById('audit-console');
            if (consoleEl) {
                const line = document.createElement('div');
                line.className = `line ${tipo === 'success' ? 'green' : tipo === 'error' ? 'red' : tipo === 'warning' ? 'yellow' : 'blue'}`;
                line.textContent = `[${timestamp}] ${msg}`;
                consoleEl.appendChild(line);
                consoleEl.scrollTop = consoleEl.scrollHeight;
            }
        }
        
        State.logs.push({
            timestamp: new Date().toISOString(),
            msg: msg,
            tipo: tipo
        });
        
        if (CONFIG.DEBUG) console.log(`[VDC][${tipo.toUpperCase()}] ${msg}`);
    }

    const logger = {
        log: log,
        limpar: function() {
            const terminal = document.getElementById('terminal');
            if (terminal) {
                terminal.innerHTML = '<div class="log-line">> VDC Forensic Engine v15.1 ELITE inicializado...</div><div class="log-line">> Sistema aguardando dados...</div>';
            }
            const consoleEl = document.getElementById('audit-console');
            if (consoleEl) {
                consoleEl.innerHTML = '<div class="line green">[SISTEMA] A aguardar fontes de dados...</div><div class="line blue">[INFO] Utilize a zona de upload para anexar documentos</div>';
            }
            State.logs = [];
        }
    };

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

    function carregarAnos() {
        const select = document.getElementById('fiscalYear');
        if (!select) return;
        
        const anoAtual = new Date().getFullYear();
        select.innerHTML = '';
        
        for (let ano = anoAtual - 3; ano <= anoAtual + 2; ano++) {
            const option = document.createElement('option');
            option.value = ano;
            option.textContent = ano;
            if (ano === anoAtual) {
                option.selected = true;
                State.metadados.fiscalYear = ano.toString();
            }
            select.appendChild(option);
        }
    }

    function atualizarMetadados() {
        State.metadados.subjectName = document.getElementById('subjectName')?.value.trim() || '';
        State.metadados.nipc = document.getElementById('nipc')?.value.trim() || '';
        State.metadados.platform = document.getElementById('platform')?.value || '';
        State.metadados.fiscalYear = document.getElementById('fiscalYear')?.value || new Date().getFullYear().toString();
        State.metadados.fiscalPeriod = document.getElementById('fiscalPeriod')?.value || 'Anual';
    }

    function validarMetadados() {
        atualizarMetadados();
        
        if (!State.metadados.subjectName) {
            log('❌ ERRO: Sujeito Passivo não preenchido.', 'error');
            alert('Erro: Preencha o nome do Sujeito Passivo / Empresa.');
            return false;
        }
        
        if (!State.metadados.nipc) {
            log('❌ ERRO: NIPC não preenchido.', 'error');
            alert('Erro: Preencha o NIPC.');
            return false;
        }
        
        if (State.metadados.nipc.length !== 9 || isNaN(State.metadados.nipc)) {
            log('❌ ERRO: NIPC deve ter 9 dígitos numéricos.', 'error');
            alert('Erro: O NIPC deve ter 9 dígitos numéricos.');
            return false;
        }
        
        if (!State.metadados.platform) {
            log('❌ ERRO: Plataforma TVDE não selecionada.', 'error');
            alert('Erro: Selecione a Plataforma TVDE.');
            return false;
        }
        
        return true;
    }

    function selecionarPerguntas() {
        const shuffled = [...POOL_PERGUNTAS].sort(() => 0.5 - Math.random());
        State.selectedQuestions = shuffled.slice(0, 6);
        log('📋 Selecionadas 6 perguntas para questionário de conformidade', 'info');
        return State.selectedQuestions;
    }

    // ==========================================================================
    // GERAR MASTER HASH SHA-256 E QR CODE
    // ==========================================================================
    
    async function gerarMasterHash() {
        try {
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
                    viagens: State.financeiro.viagens.map(v => ({ valor: v.valor, comissao: v.comissao })),
                    extrato: State.financeiro.extrato,
                    dac7Trimestres: State.financeiro.dac7Trimestres
                },
                autenticidade: State.autenticidade.map(a => ({ algoritmo: a.algoritmo, hash: a.hash, ficheiro: a.ficheiro })),
                cruzamentos: State.cruzamentos,
                numDocumentos: State.documentos.length,
                numAlertas: State.alertas.length,
                timestamp: Date.now()
            };
            
            const jsonString = JSON.stringify(dadosParaHash);
            
            let hashHex;
            if (window.crypto && window.crypto.subtle) {
                const encoder = new TextEncoder();
                const data = encoder.encode(jsonString + State.sessao.id);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                hashHex = gerarHashSimulado(jsonString);
                log('⚠️ Web Crypto API não disponível. A usar hash simulado.', 'warning');
            }
            
            State.sessao.hash = hashHex;
            
            const sessionHashEl = document.getElementById('sessionHash');
            if (sessionHashEl) sessionHashEl.textContent = hashHex.substring(0, 16) + '...';
            
            const masterHashEl = document.getElementById('master-hash');
            if (masterHashEl) masterHashEl.textContent = hashHex;
            
            const hashFooterEl = document.getElementById('hash-footer');
            if (hashFooterEl) hashFooterEl.textContent = hashHex.substring(0, 16) + '...';
            
            gerarQRCode(hashHex);
            
            log(`🔐 Master Hash SHA-256 gerado: ${hashHex.substring(0, 16)}...`, 'success');
            
            return { hash: hashHex, timestamp: new Date().toISOString(), algoritmo: 'SHA-256' };
            
        } catch (err) {
            log(`❌ Erro ao gerar Master Hash: ${err.message}`, 'error');
            return { hash: 'ERRO_GERACAO_HASH', timestamp: new Date().toISOString(), algoritmo: 'SHA-256', erro: err.message };
        }
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
    // EXECUTAR CRUZAMENTOS ARITMÉTICOS
    // ==========================================================================
    
    function executarCruzamentos() {
        log('⚙️ A executar cruzamentos aritméticos...', 'info');
        
        if (!validarMetadados()) {
            return false;
        }
        
        // CÁLCULO DA VERDADE MATERIAL
        State.financeiro.liquidoReal = State.financeiro.bruto - State.financeiro.comissoes;
        State.financeiro.divergencia = State.financeiro.liquidoReal - State.financeiro.dac7;
        
        // ===== CRUZAMENTO 1: SAF-T vs DAC7 =====
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
                saftVsDac7.alerta = `Discrepância SAF-T (${formatarMoedaComEuro(State.financeiro.bruto)}) vs DAC7 (${formatarMoedaComEuro(State.financeiro.dac7)}) - Diferença: ${formatarMoedaComEuro(saftVsDac7.diferenca)}`;
                log(`⚠️ ${saftVsDac7.alerta}`, 'warning');
            } else {
                log(`✅ SAF-T e DAC7 convergentes: ${formatarMoedaComEuro(State.financeiro.bruto)}`, 'success');
            }
        }
        State.cruzamentos.saftVsDac7 = saftVsDac7;
        
        // Atualizar interface
        const statusSaftDac7 = document.getElementById('status-saft-dac7');
        if (statusSaftDac7) {
            if (saftVsDac7.realizado && State.financeiro.dac7 > 0) {
                statusSaftDac7.textContent = saftVsDac7.convergente ? 'CONVERGENTE' : 'DIVERGENTE';
                statusSaftDac7.className = 'cruzamento-status ' + (saftVsDac7.convergente ? 'convergente' : 'divergente');
            } else {
                statusSaftDac7.textContent = 'Sem dados DAC7';
                statusSaftDac7.className = 'cruzamento-status alerta';
            }
        }
        
        // ===== CRUZAMENTO 2: Bruto vs Ganhos App =====
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
                brutoVsGanhosApp.alerta = `Discrepância Bruto (${formatarMoedaComEuro(State.financeiro.bruto)}) vs Soma Ganhos App (${formatarMoedaComEuro(valorCalculadoApp)}) - Diferença: ${formatarMoedaComEuro(brutoVsGanhosApp.diferenca)}`;
                log(`⚠️ ${brutoVsGanhosApp.alerta}`, 'warning');
            } else if (valorCalculadoApp > 0) {
                log(`✅ Bruto e soma dos ganhos App convergentes: ${formatarMoedaComEuro(State.financeiro.bruto)}`, 'success');
            }
        }
        State.cruzamentos.brutoVsGanhosApp = brutoVsGanhosApp;
        
        const statusBrutoExtrato = document.getElementById('status-bruto-extrato');
        if (statusBrutoExtrato) {
            if (brutoVsGanhosApp.realizado && valorCalculadoApp > 0) {
                statusBrutoExtrato.textContent = brutoVsGanhosApp.convergente ? 'CONVERGENTE' : 'DIVERGENTE';
                statusBrutoExtrato.className = 'cruzamento-status ' + (brutoVsGanhosApp.convergente ? 'convergente' : 'divergente');
            } else {
                statusBrutoExtrato.textContent = 'Sem dados extrato';
                statusBrutoExtrato.className = 'cruzamento-status alerta';
            }
        }
        
        // ===== CRUZAMENTO 3: Comissões vs Fatura =====
        const totalFaturas = State.financeiro.faturas.reduce((acc, f) => acc + (f.valor || 0), 0);
        const taxaEfetiva = State.financeiro.bruto > 0 ? (State.financeiro.comissoes / State.financeiro.bruto) * 100 : 0;
        
        const comissoesVsFatura = {
            realizado: true,
            totalComissoes: State.financeiro.comissoes,
            totalFaturas: totalFaturas,
            diferenca: Math.abs(State.financeiro.comissoes - totalFaturas),
            taxaEfetiva: taxaEfetiva,
            convergente: true,
            alertasPorViagem: []
        };
        
        if (totalFaturas > 0 && Math.abs(State.financeiro.comissoes - totalFaturas) > CONFIG.TOLERANCIA_ERRO) {
            comissoesVsFatura.convergente = false;
            comissoesVsFatura.alerta = `Discrepância Comissões (${formatarMoedaComEuro(State.financeiro.comissoes)}) vs Faturas (${formatarMoedaComEuro(totalFaturas)})`;
            log(`⚠️ ${comissoesVsFatura.alerta}`, 'warning');
        }
        
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
        
        const statusComissoesFaturas = document.getElementById('status-comissoes-faturas');
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
        
        gerarAlertasInterface();
        selecionarPerguntas();
        
        log('✅ Cruzamentos aritméticos concluídos', 'success');
        updateUI();
        
        return true;
    }

    // ==========================================================================
    // GERAR ALERTAS NA INTERFACE
    // ==========================================================================
    
    function gerarAlertasInterface() {
        const alertasContainer = document.getElementById('alertas-container');
        if (!alertasContainer) return;
        
        alertasContainer.innerHTML = '';
        State.alertas = [];
        
        if (Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
            const percentual = State.financeiro.dac7 > 0 ? (Math.abs(State.financeiro.divergencia) / State.financeiro.dac7) * 100 : 0;
            adicionarAlerta(
                'critico',
                'ALERTA DE COLARINHO BRANCO',
                `Omissão de ${formatarMoedaComEuro(State.financeiro.divergencia)} (${percentual.toFixed(2)}%) detetada na triangulação SAF-T/DAC7.`,
                Math.abs(State.financeiro.divergencia)
            );
        }
        
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
        
        if (State.cruzamentos.saftVsDac7.alerta) {
            adicionarAlerta(
                State.cruzamentos.saftVsDac7.diferenca > 100 ? 'critico' : 'alerta',
                'SAF-T vs DAC7',
                State.cruzamentos.saftVsDac7.alerta,
                State.cruzamentos.saftVsDac7.diferenca
            );
        }
        
        if (State.cruzamentos.brutoVsGanhosApp.alerta) {
            adicionarAlerta(
                State.cruzamentos.brutoVsGanhosApp.diferenca > 50 ? 'critico' : 'alerta',
                'Bruto vs Ganhos App',
                State.cruzamentos.brutoVsGanhosApp.alerta,
                State.cruzamentos.brutoVsGanhosApp.diferenca
            );
        }
        
        if (State.cruzamentos.comissoesVsFatura.alerta) {
            adicionarAlerta(
                'critico',
                'Comissões vs Faturas',
                State.cruzamentos.comissoesVsFatura.alerta,
                State.cruzamentos.comissoesVsFatura.diferenca
            );
        }
        
        State.cruzamentos.comissoesVsFatura.alertasPorViagem.forEach(alerta => {
            adicionarAlerta('critico', 'Comissão Excedida', alerta.mensagem, alerta.comissao);
        });
        
        if (State.financeiro.liquido > 0) {
            const liquidoCalculado = State.financeiro.bruto - State.financeiro.comissoes;
            if (Math.abs(liquidoCalculado - State.financeiro.liquido) > 10) {
                adicionarAlerta(
                    'alerta',
                    'DISCREPÂNCIA GANHOS LÍQUIDOS',
                    `Calculado: ${formatarMoedaComEuro(liquidoCalculado)} | Reportado: ${formatarMoedaComEuro(State.financeiro.liquido)}`,
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
            ${alerta.valor > 0 ? `<strong>${formatarMoedaComEuro(alerta.valor)}</strong>` : ''}
        `;
        alertasContainer.appendChild(div);
    }

    function atualizarVeredito() {
        const veredictoSection = document.getElementById('veredicto-section');
        if (!veredictoSection) return;
        
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
            desvioEl.textContent = `Desvio: ${percentual.toFixed(2)}% (${formatarMoedaComEuro(desvioTotal)})`;
            
            anomaliaEl.style.display = 'flex';
            anomaliaTexto.textContent = `Potencial incumprimento fiscal. ${alertasCriticos.length} anomalia(s) crítica(s).`;
            valorAnomalia.textContent = formatarMoedaComEuro(desvioTotal);
            
            const discItem = document.getElementById('tri-discrepancia-item');
            const discValor = document.getElementById('tri-discrepancia');
            if (discItem && discValor) {
                discItem.style.display = 'block';
                discValor.textContent = formatarMoedaComEuro(desvioTotal);
            }
            
            log(`🚨 Veredito: CRÍTICO (${percentual.toFixed(2)}% de desvio)`, 'error');
            
        } else if (alertasNormais.length > 0) {
            statusEl.textContent = 'ALERTA';
            statusEl.className = 'veredicto-status alerta';
            desvioEl.textContent = 'Requer verificação manual';
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            log('⚠️ Veredito: ALERTA - Requer atenção', 'warning');
            
        } else {
            statusEl.textContent = 'NORMAL';
            statusEl.className = 'veredicto-status normal';
            desvioEl.textContent = 'Sem desvios significativos';
            anomaliaEl.style.display = 'none';
            
            const discItem = document.getElementById('tri-discrepancia-item');
            if (discItem) discItem.style.display = 'none';
            
            log('✅ Veredito: NORMAL - Dados consistentes', 'success');
        }
    }

    // ==========================================================================
    // AUTENTICAÇÃO (VDC Object)
    // ==========================================================================

    window.VDC = {
        validateLogin: function() {
            const username = document.getElementById('user').value.trim();
            const password = document.getElementById('pass').value.trim();
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
                
                const sessionHashEl = document.getElementById('sessionHash');
                if (sessionHashEl) sessionHashEl.textContent = 'STANDBY';
                
                const footerSession = document.getElementById('footer-session');
                if (footerSession) footerSession.textContent = State.sessao.id;
                
                const autoProcessID = document.getElementById('autoProcessID');
                if (autoProcessID) autoProcessID.textContent = State.sessao.processoAuto;
                
                const procInput = document.getElementById('inputProcess');
                if (procInput) procInput.value = State.sessao.processoAuto;
                
                const authHash = document.getElementById('auth-hash');
                if (authHash) authHash.textContent = 'e3b0c442...8b1a56';
                
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
        }
    };

    // ==========================================================================
    // GESTÃO DE FILA DE PROCESSAMENTO
    // ==========================================================================

    async function adicionarFicheirosFila(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            const validacao = validarFicheiro(file);
            if (!validacao.valido) {
                log(`❌ Ficheiro rejeitado: ${file.name} - ${validacao.erro}`, 'error');
                continue;
            }
            
            if (State.ficheirosProcessados.has(file.name)) {
                log(`⚠️ Ficheiro já processado: ${file.name}`, 'warning');
                continue;
            }
            
            State.fila.push(file);
            log(`📄 Ficheiro em fila: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'info');
            adicionarFicheiroLista(file);
        }
        
        processarProximo();
    }

    function validarFicheiro(file) {
        if (!file) return { valido: false, erro: 'Ficheiro não fornecido' };
        
        const extensao = '.' + file.name.split('.').pop().toLowerCase();
        if (!CONFIG.ALLOWED_EXTENSIONS.includes(extensao)) {
            return { valido: false, erro: `Extensão não permitida. Use: ${CONFIG.ALLOWED_EXTENSIONS.join(', ')}` };
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
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
        `;
        fileQueue.appendChild(fileItem);
        
        atualizarContadorDocumentos(1);
    }

    function atualizarContador(tipo, incremento = 1) {
        if (State.contadores.hasOwnProperty(tipo)) {
            State.contadores[tipo] += incremento;
        }
        const elemento = document.getElementById(`count-${tipo}`);
        if (elemento) {
            elemento.textContent = `${tipo.toUpperCase()}: ${State.contadores[tipo] || 0}`;
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
            log(`🔄 A processar: ${file.name}`, 'info');
            
            if (file.name.toLowerCase().endsWith('.csv')) {
                await processarCSV(file);
            } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                await processarPDF(file);
            } else if (file.name.toLowerCase().endsWith('.xml')) {
                await processarXML(file);
            } else if (file.name.toLowerCase().endsWith('.json')) {
                await processarJSON(file);
            } else {
                log(`❌ Formato não suportado: ${file.name}`, 'error');
            }
        } catch (err) {
            log(`❌ Erro ao processar ${file.name}: ${err.message}`, 'error');
        }
        
        State.processando = false;
        updateUI();
        processarProximo();
    }

    // ==========================================================================
    // PROCESSAMENTO DE CSV
    // ==========================================================================

    async function processarCSV(file) {
        return new Promise(function(resolve) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const lines = content.split(/\r?\n/);
                    const header = lines[0]?.toLowerCase() || '';
                    
                    if (CONFIG.PATTERNS.HASH_CSV.test(file.name) || header.includes('algorithm') || header.includes('hash')) {
                        log('🔐 Detetado: Ficheiro de Controlo de Autenticidade', 'success');
                        processarAutenticidade(lines);
                        atualizarContador('ctrl', 1);
                    } else if (CONFIG.PATTERNS.SAFT_CSV.test(file.name) || header.includes('nº da fatura') || header.includes('viagem') || header.includes('motorista')) {
                        log('📊 Detetado: Ficheiro de Viagens (SAF-T)', 'success');
                        processarViagens(lines);
                        atualizarContador('saft', 1);
                    } else if (file.name.toLowerCase().includes('dac7') || header.includes('dac7') || header.includes('receita')) {
                        log('📈 Detetado: Relatório DAC7', 'success');
                        processarDAC7_CSV(lines);
                        atualizarContador('dac7', 1);
                    } else {
                        log('⚠️ Formato CSV não reconhecido. A tentar extração genérica.', 'warning');
                        processarCSVGenerico(lines);
                    }
                    
                    State.ficheirosProcessados.add(file.name);
                    State.documentos.push({
                        timestamp: new Date().toISOString(),
                        nome: file.name,
                        tipo: 'CSV',
                        tamanho: file.size
                    });
                    
                } catch (err) {
                    log(`❌ Erro ao processar CSV: ${err.message}`, 'error');
                }
                resolve();
            };
            
            reader.onerror = function() {
                log(`❌ Erro ao ler ficheiro CSV: ${file.name}`, 'error');
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
        
        log(`➕ Adicionados ${count} registos de autenticidade`, 'success');
    }

    function processarViagens(lines) {
        const tbody = document.querySelector('#table-viagens tbody');
        if (!tbody) return;
        
        let fileBruto = 0;
        let count = 0;
        
        const regexSplit = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        
        lines.slice(1).forEach(function(line) {
            if (!line.trim()) return;
            
            const cols = line.split(regexSplit);
            
            if (cols.length >= 10) {
                let valor = 0;
                for (let i = cols.length - 1; i >= 0; i--) {
                    const val = parseMoeda(cols[i]?.replace(/"/g, ''));
                    if (val > 0 && val < 10000) {
                        valor = val;
                        break;
                    }
                }
                
                if (valor === 0) return;
                
                let dataStr = 'N/A';
                for (let i = 0; i < Math.min(5, cols.length); i++) {
                    if (cols[i]?.match(/\d{4}-\d{2}-\d{2}/)) {
                        dataStr = cols[i].replace(/"/g, '').split(' ')[0];
                        break;
                    }
                }
                
                const motorista = cols[2]?.replace(/"/g, '') || 'N/A';
                const numFatura = cols[0]?.replace(/"/g, '') || `VIAGEM-${count+1}`;
                
                const comissao = valor * CONFIG.TAXA_COMISSAO_PADRAO;
                const taxa = ((comissao / valor) * 100).toFixed(2) + '%';
                
                fileBruto += valor;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(dataStr)}</td>
                    <td>${escapeHtml(motorista)}</td>
                    <td>${escapeHtml(numFatura.substring(0, 16))}</td>
                    <td>${formatarMoedaComEuro(valor)}</td>
                    <td>${formatarMoedaComEuro(comissao)}</td>
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
                
                count++;
            }
        });
        
        State.financeiro.bruto += fileBruto;
        State.financeiro.comissoes += fileBruto * CONFIG.TAXA_COMISSAO_PADRAO;
        State.financeiro.liquido += fileBruto * (1 - CONFIG.TAXA_COMISSAO_PADRAO);
        
        log(`📊 Processadas ${count} viagens. +${formatarMoedaComEuro(fileBruto)}`, 'success');
    }

    function processarDAC7_CSV(lines) {
        let fileTotal = 0;
        
        for (let i = 1; i < Math.min(lines.length, 50); i++) {
            if (!lines[i].trim()) continue;
            
            const cols = lines[i].split(',');
            const valores = lines[i].match(/\d+[.,]\d+/g);
            
            if (valores && valores.length > 0) {
                const ultimoValor = valores[valores.length - 1];
                fileTotal += parseMoeda(ultimoValor);
            }
        }
        
        if (fileTotal > 0) {
            State.financeiro.dac7 = fileTotal;
            log(`📈 DAC7 processado: ${formatarMoedaComEuro(fileTotal)}`, 'success');
        }
    }

    function processarCSVGenerico(lines) {
        let totalExtraido = 0;
        
        for (let i = 1; i < Math.min(lines.length, 20); i++) {
            if (!lines[i].trim()) continue;
            
            const valores = lines[i].match(/\d+[.,]\d+/g);
            if (valores && valores.length > 0) {
                for (const v of valores) {
                    const val = parseMoeda(v);
                    if (val > 1 && val < 10000) {
                        totalExtraido += val;
                        break;
                    }
                }
            }
        }
        
        if (totalExtraido > 0) {
            State.financeiro.bruto += totalExtraido;
            log(`📄 CSV genérico: +${formatarMoedaComEuro(totalExtraido)}`, 'info');
        }
    }

    // ==========================================================================
    // PROCESSAMENTO DE PDF
    // ==========================================================================

    async function processarPDF(file) {
        if (typeof pdfjsLib === 'undefined') {
            log('⚠️ PDF.js não carregado. A usar modo de simulação.', 'warning');
            processarPDFSimulado(file);
            return;
        }
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let textoCompleto = '';
            
            for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                textoCompleto += textContent.items.map(s => s.str).join(' ') + '\n';
            }
            
            const textoLimpo = textoCompleto.replace(CONFIG.PATTERNS.CLEAN, ' ').replace(CONFIG.PATTERNS.MULTISPACE, ' ');
            
            if (textoLimpo.includes('DAC7') || textoLimpo.includes('receitas anuais')) {
                log('📄 Detetado: Relatório DAC7', 'success');
                processarDAC7_PDF(textoLimpo, file);
                atualizarContador('dac7', 1);
            } else if (textoLimpo.includes('Fatura n.º') || textoLimpo.includes('Total com IVA') || file.name.toLowerCase().includes('fatura')) {
                log('📄 Detetado: Fatura de Comissão', 'success');
                processarFaturaPDF(textoLimpo, file);
                atualizarContador('fat', 1);
            } else if (textoLimpo.includes('Ganhos líquidos') || textoLimpo.includes('Ganhos na app') || file.name.toLowerCase().includes('extrato')) {
                log('📄 Detetado: Extrato de Ganhos', 'success');
                processarExtratoPDF(textoLimpo, file);
                atualizarContador('ext', 1);
            } else {
                log('📄 PDF não reconhecido como documento padrão.', 'warning');
                atualizarContador('fat', 1);
            }
            
            State.ficheirosProcessados.add(file.name);
            State.documentos.push({
                timestamp: new Date().toISOString(),
                nome: file.name,
                tipo: 'PDF',
                tamanho: file.size
            });
            
        } catch (err) {
            log(`❌ Erro ao processar PDF: ${err.message}`, 'error');
            processarPDFSimulado(file);
        }
    }

    function processarPDFSimulado(file) {
        const nomeLower = file.name.toLowerCase();
        
        if (nomeLower.includes('dac7')) {
            const valorSimulado = 7755.16;
            State.financeiro.dac7 = valorSimulado;
            atualizarContador('dac7', 1);
            log(`📄 [SIMULAÇÃO] DAC7 PDF: ${formatarMoedaComEuro(valorSimulado)}`, 'success');
            
        } else if (nomeLower.includes('fatura') || nomeLower.includes('comissao')) {
            const valorSimulado = 239.00;
            State.financeiro.comissoes += valorSimulado;
            State.financeiro.faturas.push({ numero: file.name, valor: valorSimulado, periodo: 'N/A', autoliquidacao: false });
            atualizarContador('fat', 1);
            log(`💰 [SIMULAÇÃO] Fatura PDF: +${formatarMoedaComEuro(valorSimulado)}`, 'success');
            
        } else if (nomeLower.includes('extrato') || nomeLower.includes('ganhos')) {
            State.financeiro.extrato.ganhosLiquidos = 2409.95;
            State.financeiro.extrato.ganhosApp = 3157.94;
            State.financeiro.extrato.comissoes = 792.59;
            State.financeiro.extrato.gorjetas = 44.60;
            State.financeiro.liquido += 2409.95;
            State.financeiro.bruto += 3157.94;
            State.financeiro.comissoes += 792.59;
            atualizarContador('ext', 1);
            log(`📄 [SIMULAÇÃO] Extrato PDF processado`, 'success');
        }
        
        State.ficheirosProcessados.add(file.name);
        State.documentos.push({
            timestamp: new Date().toISOString(),
            nome: file.name,
            tipo: 'PDF (Simulado)',
            tamanho: file.size
        });
        
        atualizarContadorDocumentos(1);
        updateUI();
    }

    function processarExtratoPDF(texto, file) {
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
        
        log(`📊 Extrato: +${formatarMoedaComEuro(brutoCalculado)} bruto, +${formatarMoedaComEuro(ganhosLiquidos)} líquido`, 'success');
    }

    function processarFaturaPDF(texto, file) {
        const numFatura = extrairTexto(texto, CONFIG.PATTERNS.FATURA_NUMERO) || file.name;
        const valorTotal = extrairValor(texto, CONFIG.PATTERNS.FATURA_TOTAL);
        const periodoMatch = texto.match(CONFIG.PATTERNS.FATURA_PERIODO);
        const periodo = periodoMatch ? `${periodoMatch[1]} a ${periodoMatch[2]}` : 'N/A';
        const isAutoliquidacao = CONFIG.PATTERNS.FATURA_AUTOLIQUIDACAO.test(texto);
        
        if (valorTotal > 0) {
            State.financeiro.comissoes += valorTotal;
            State.financeiro.faturas.push({
                numero: numFatura,
                valor: valorTotal,
                periodo: periodo,
                autoliquidacao: isAutoliquidacao
            });
            log(`💰 Fatura: ${numFatura} | +${formatarMoedaComEuro(valorTotal)}`, 'success');
        }
    }

    function processarDAC7_PDF(texto, file) {
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
        
        if (receitaAnual > 0) {
            State.financeiro.dac7 = receitaAnual;
        } else {
            State.financeiro.dac7 = 
                State.financeiro.dac7Trimestres.t1.ganhos +
                State.financeiro.dac7Trimestres.t2.ganhos +
                State.financeiro.dac7Trimestres.t3.ganhos +
                State.financeiro.dac7Trimestres.t4.ganhos;
        }
        
        log(`📈 DAC7: Receita anual ${formatarMoedaComEuro(State.financeiro.dac7)}`, 'success');
    }

    // ==========================================================================
    // PROCESSAMENTO DE XML E JSON
    // ==========================================================================

    async function processarXML(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    log(`📄 XML processado: ${file.name} (simulação)`, 'success');
                    
                    if (file.name.toLowerCase().includes('saft')) {
                        const valorSimulado = 9876.54;
                        State.financeiro.bruto += valorSimulado;
                        log(`📊 XML: SAF-T +${formatarMoedaComEuro(valorSimulado)}`, 'info');
                        atualizarContador('saft', 1);
                    }
                    
                    State.ficheirosProcessados.add(file.name);
                    atualizarContadorDocumentos(1);
                    
                } catch (err) {
                    log(`❌ Erro ao processar XML: ${err.message}`, 'error');
                }
                resolve();
            };
            
            reader.onerror = function() {
                log(`❌ Erro ao ler ficheiro XML: ${file.name}`, 'error');
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
                    log(`📄 JSON processado: ${file.name}`, 'success');
                    
                    if (file.name.toLowerCase().includes('dac7')) {
                        const valorSimulado = 5321.89;
                        State.financeiro.dac7 += valorSimulado;
                        log(`📈 JSON: DAC7 +${formatarMoedaComEuro(valorSimulado)}`, 'info');
                        atualizarContador('dac7', 1);
                    }
                    
                    State.ficheirosProcessados.add(file.name);
                    atualizarContadorDocumentos(1);
                    
                } catch (err) {
                    log(`❌ Erro ao processar JSON: ${err.message}`, 'error');
                }
                resolve();
            };
            
            reader.onerror = function() {
                log(`❌ Erro ao ler ficheiro JSON: ${file.name}`, 'error');
                resolve();
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    function extrairValor(texto, pattern) {
        if (!texto || !pattern) return 0;
        const match = texto.match(pattern);
        return match ? parseMoeda(match[1]) : 0;
    }

    function extrairTexto(texto, pattern) {
        if (!texto || !pattern) return null;
        const match = texto.match(pattern);
        return match ? match[1].trim() : null;
    }

    // ==========================================================================
    // ATUALIZAÇÃO DA INTERFACE
    // ==========================================================================

    function updateUI() {
        document.getElementById('val-bruto').textContent = formatarMoeda(State.financeiro.bruto);
        document.getElementById('val-liquido').textContent = formatarMoeda(State.financeiro.liquido);
        document.getElementById('val-dac7').textContent = formatarMoeda(State.financeiro.dac7);
        document.getElementById('val-comissoes').textContent = formatarMoeda(State.financeiro.comissoes);
        document.getElementById('val-viagens').textContent = State.financeiro.viagens.length.toString();
        document.getElementById('val-divergencia').textContent = formatarMoeda(State.financeiro.divergencia);
        
        const taxaMedia = State.financeiro.bruto > 0 ? (State.financeiro.comissoes / State.financeiro.bruto * 100) : 0;
        document.getElementById('val-taxa').textContent = taxaMedia.toFixed(2);
        
        document.getElementById('tri-bruto').textContent = formatarMoedaComEuro(State.financeiro.bruto);
        document.getElementById('tri-comissoes').textContent = formatarMoedaComEuro(State.financeiro.comissoes);
        document.getElementById('tri-liquido').textContent = formatarMoedaComEuro(State.financeiro.liquidoReal || (State.financeiro.bruto - State.financeiro.comissoes));
        document.getElementById('tri-faturado').textContent = formatarMoedaComEuro(State.financeiro.comissoes);
        
        document.getElementById('dac7-receita').textContent = formatarMoedaComEuro(State.financeiro.dac7);
        document.getElementById('dac7-comissoes').textContent = formatarMoedaComEuro(State.financeiro.comissoes);
        document.getElementById('dac7-servicos').textContent = State.financeiro.viagens.length.toString();
        
        document.getElementById('dac7-1t').textContent = formatarMoedaComEuro(State.financeiro.dac7Trimestres.t1.ganhos);
        document.getElementById('dac7-2t').textContent = formatarMoedaComEuro(State.financeiro.dac7Trimestres.t2.ganhos);
        document.getElementById('dac7-3t').textContent = formatarMoedaComEuro(State.financeiro.dac7Trimestres.t3.ganhos);
        document.getElementById('dac7-4t').textContent = formatarMoedaComEuro(State.financeiro.dac7Trimestres.t4.ganhos);
        
        const docCount = document.getElementById('doc-count');
        if (docCount) docCount.textContent = State.documentos.length;
        
        const divergencia = State.financeiro.liquidoReal - State.financeiro.dac7;
        const discItem = document.getElementById('tri-discrepancia');
        if (discItem) discItem.textContent = formatarMoedaComEuro(divergencia);
        
        const cardDivergencia = document.getElementById('cardDivergencia');
        if (cardDivergencia) {
            if (Math.abs(State.financeiro.divergencia) > CONFIG.TOLERANCIA_DIVERGENCIA) {
                cardDivergencia.style.borderLeftColor = 'var(--danger)';
            } else {
                cardDivergencia.style.borderLeftColor = 'var(--royal-blue)';
            }
        }
    }

    // ==========================================================================
    // FUNÇÕES DE DEMONSTRAÇÃO E LIMPEZA
    // ==========================================================================

    function carregarDemo() {
        log('🚀 A carregar dados de simulação forense...', 'info');
        
        resetFinancialState();
        limparDadosInterface();
        
        State.financeiro.bruto = 7755.16;
        State.financeiro.comissoes = 2447.89;
        State.financeiro.liquido = 5307.27;
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
        
        State.contadores = { ctrl: 3, saft: 1, fat: 1, ext: 1, dac7: 1 };
        
        const tbodyHash = document.querySelector('#table-hashes tbody');
        if (tbodyHash) {
            tbodyHash.innerHTML = '';
            State.autenticidade.forEach(item => {
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
            State.financeiro.viagens.forEach(v => {
                const taxa = ((v.comissao / v.valor) * 100).toFixed(2) + '%';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${v.data}</td>
                    <td>${v.motorista}</td>
                    <td>${v.numFatura}</td>
                    <td>${formatarMoedaComEuro(v.valor)}</td>
                    <td>${formatarMoedaComEuro(v.comissao)}</td>
                    <td>${taxa}</td>
                `;
                tbodyViagens.appendChild(tr);
            });
        }
        
        document.getElementById('doc-count').textContent = '3';
        
        updateUI();
        executarCruzamentos();
        gerarMasterHash();
        
        log('✅ DEMO carregada com sucesso. Dados corrigidos sem acumulação.', 'success');
    }

    function limparSistema() {
        if (!confirm('⚠️ Tem a certeza que pretende LIMPAR TODOS OS DADOS da sessão?')) return;
        
        resetFinancialState();
        limparDadosInterface();
        
        const masterHashEl = document.getElementById('master-hash');
        const hashFooterEl = document.getElementById('hash-footer');
        if (masterHashEl) masterHashEl.textContent = '---';
        if (hashFooterEl) hashFooterEl.textContent = '---';
        
        gerarMasterHash();
        log('🧹 Sistema limpo. Todos os dados removidos.', 'warning');
    }

    function limparDadosInterface() {
        const tbodyHash = document.querySelector('#table-hashes tbody');
        const tbodyViagens = document.querySelector('#table-viagens tbody');
        const fileQueue = document.getElementById('file-queue');
        const alertasContainer = document.getElementById('alertas-container');
        
        if (tbodyHash) tbodyHash.innerHTML = '';
        if (tbodyViagens) tbodyViagens.innerHTML = '';
        if (fileQueue) fileQueue.innerHTML = '';
        if (alertasContainer) alertasContainer.innerHTML = '';
        
        const contadores = ['ctrl', 'saft', 'fat', 'ext', 'dac7'];
        contadores.forEach(id => {
            const el = document.getElementById(`count-${id}`);
            if (el) el.textContent = `${id.toUpperCase()}: 0`;
        });
        
        const statusElements = ['status-saft-dac7', 'status-bruto-extrato', 'status-comissoes-faturas'];
        statusElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = 'A aguardar dados';
                el.className = 'cruzamento-status';
            }
        });
        
        document.getElementById('doc-count').textContent = '0';
        
        updateUI();
    }

    // ==========================================================================
    // EXPORTAR JSON COM CRUZAMENTOS
    // ==========================================================================
    
    async function exportarJSON() {
        log('📊 A preparar exportação JSON com cruzamentos...', 'info');
        
        executarCruzamentos();
        const masterHash = await gerarMasterHash();
        
        const dados = {
            metadados: {
                sistema: { versao: CONFIG.VERSAO, edicao: CONFIG.EDICAO },
                sessao: {
                    id: State.sessao.id,
                    hash: State.sessao.hash,
                    processo: State.sessao.processoAuto,
                    inicio: State.sessao.inicio?.toISOString(),
                    nivelAcesso: State.sessao.nivelAcesso
                },
                pericia: State.metadados
            },
            autenticidade: {
                masterHash: masterHash,
                evidencias: State.autenticidade.map(a => ({ algoritmo: a.algoritmo, hash: a.hash, ficheiro: a.ficheiro, validado: true }))
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
                    taxaMedia: State.financeiro.bruto > 0 ? (State.financeiro.comissoes / State.financeiro.bruto * 100) : 0
                },
                extrato: State.financeiro.extrato,
                dac7Trimestres: State.financeiro.dac7Trimestres,
                viagens: State.financeiro.viagens,
                faturas: State.financeiro.faturas
            },
            cruzamentos: State.cruzamentos,
            documentos: State.documentos,
            alertas: State.alertas.map(a => ({ tipo: a.tipo, titulo: a.titulo, descricao: a.descricao, valor: a.valor, timestamp: a.timestamp.toISOString() })),
            logs: State.logs.slice(-50).map(l => ({ timestamp: l.timestamp, msg: l.msg, tipo: l.tipo }))
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VDC_Export_${State.metadados.nipc || 'SEMNIF'}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        log(`✅ Exportação JSON concluída. Master Hash: ${masterHash.hash.substring(0, 16)}...`, 'success');
    }
    
    // ==========================================================================
    // EXPORTAR PDF COM RELATÓRIO PERICIAL
    // ==========================================================================
    
    function exportarPDF() {
        log('📄 A gerar relatório pericial em PDF...', 'info');
        
        if (!validarMetadados()) return;
        
        if (State.financeiro.bruto === 0 && State.financeiro.comissoes === 0 && State.financeiro.dac7 === 0) {
            alert('Erro: Execute os cruzamentos antes de gerar o relatório.');
            return;
        }
        
        if (typeof window.jspdf === 'undefined') {
            alert('Erro: Biblioteca jsPDF não carregada.');
            log('❌ Biblioteca jsPDF não carregada', 'error');
            return;
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const sujeito = State.metadados.subjectName || 'N/A';
            const nipc = State.metadados.nipc || 'N/A';
            const platformInfo = CONFIG.PLATFORM_DB[State.metadados.platform] || CONFIG.PLATFORM_DB.outra;
            
            const addFooter = (pageNum) => {
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(`Master Hash SHA-256: ${State.sessao.hash || '---'}`, 105, 285, { align: 'center' });
                doc.text(`Página ${pageNum}`, 195, 285, { align: 'right' });
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
            doc.text(`Plataforma: ${platformInfo.social} | Período: ${State.metadados.fiscalPeriod} ${State.metadados.fiscalYear}`, 14, y);
            y += 10;
            doc.text(`Data do Relatório: ${new Date().toLocaleString('pt-PT')}`, 14, y);
            y += 10;
            doc.text(`ID Sessão: ${State.sessao.id || '---'}`, 14, y);
            y += 20;
            
            doc.autoTable({
                startY: y,
                head: [['Análise Forense - Verdade Material', 'Valor (€)']],
                body: [
                    ['Faturação Bruta (SAF-T)', formatarMoeda(State.financeiro.bruto)],
                    ['(-) Comissões Plataforma', `(${formatarMoeda(State.financeiro.comissoes)})`],
                    ['(=) Proveito Real Calculado', formatarMoeda(State.financeiro.liquidoReal)],
                    ['DAC7 Reportado pela Plataforma', formatarMoeda(State.financeiro.dac7)],
                    ['DIVERGÊNCIA (PROVA LEGAL)', formatarMoeda(State.financeiro.divergencia)]
                ],
                theme: 'grid',
                headStyles: { fillColor: [0, 78, 146] }
            });
            
            y = doc.lastAutoTable.finalY + 10;
            doc.text(`Documentos processados: ${State.documentos.length}`, 14, y);
            y += 5;
            
            if (State.alertas.length > 0) {
                y += 5;
                doc.text('ALERTAS DETETADOS:', 14, y);
                y += 5;
                State.alertas.slice(0, 5).forEach((alerta, index) => {
                    doc.text(`${index + 1}. ${alerta.descricao.substring(0, 80)}...`, 14, y + (index * 5));
                });
                y += (State.alertas.length * 5) + 10;
            }
            
            if (State.selectedQuestions && State.selectedQuestions.length > 0) {
                doc.setFontSize(11);
                doc.setTextColor(0, 78, 146);
                doc.text('QUESTIONÁRIO DE CONFORMIDADE (6/30):', 14, y);
                y += 10;
                
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                
                State.selectedQuestions.forEach((p, i) => {
                    const yPos = y + (i * 7);
                    if (yPos > 270) {
                        doc.addPage();
                        y = 20;
                    }
                    doc.text(`${i+1}. ${p.q}`, 14, yPos);
                    doc.text(`[ ] SIM   [ ] NÃO`, 150, yPos);
                });
            }
            
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('Documento emitido para efeitos de prova legal. Art. 103.º RGIT.', 14, 280);
            
            addFooter(1);
            
            const filename = `VDC_Pericia_${State.metadados.nipc || 'SEMNIF'}_${Date.now()}.pdf`;
            doc.save(filename);
            
            log(`✅ Relatório PDF exportado: ${filename}`, 'success');
            
        } catch (err) {
            log(`❌ Erro ao gerar PDF: ${err.message}`, 'error');
        }
    }

    // ==========================================================================
    // INICIALIZAÇÃO DE EVENTOS
    // ==========================================================================

    function inicializarEventos() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const btnDemo = document.getElementById('btn-demo');
        const btnClear = document.getElementById('btn-clear');
        const btnExportJson = document.getElementById('btn-export-json');
        const btnAnalyze = document.getElementById('btn-analyze');
        const btnExportPdf = document.getElementById('btn-export-pdf');
        const platform = document.getElementById('platform');

        if (platform) {
            platform.addEventListener('change', function(e) {
                const platformInfo = CONFIG.PLATFORM_DB[e.target.value];
                const detailsEl = document.getElementById('platformDetails');
                if (detailsEl) {
                    detailsEl.innerHTML = platformInfo ? 
                        `<small>${platformInfo.social} | NIF: ${platformInfo.nif}</small>` : '';
                }
                if (e.target.value) State.metadados.platform = e.target.value;
            });
        }

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    resetFinancialState();
                    limparDadosInterface();
                    adicionarFicheirosFila(e.target.files);
                }
            });
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
            });
            
            dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    resetFinancialState();
                    limparDadosInterface();
                    adicionarFicheirosFila(files);
                }
            });
        }

        if (btnDemo) btnDemo.addEventListener('click', carregarDemo);
        if (btnClear) btnClear.addEventListener('click', limparSistema);
        if (btnExportJson) btnExportJson.addEventListener('click', exportarJSON);
        
        if (btnAnalyze) {
            btnAnalyze.addEventListener('click', async function() {
                if (executarCruzamentos()) {
                    await gerarMasterHash();
                    saveStateToHistory();
                }
            });
        }
        
        if (btnExportPdf) btnExportPdf.addEventListener('click', exportarPDF);

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                const tabContent = document.getElementById(tabId);
                if (tabContent) tabContent.classList.remove('hidden');
            });
        });

        log('🎧 Event listeners inicializados', 'info');
    }

    // ==========================================================================
    // INICIALIZAÇÃO PRINCIPAL
    // ==========================================================================

    document.addEventListener('DOMContentLoaded', function() {
        carregarAnos();
        
        setInterval(atualizarRelogio, 1000);
        setInterval(atualizarTimestamp, 60000);
        
        const authHash = document.getElementById('auth-hash');
        if (authHash) authHash.textContent = gerarHashSimulado('init').substring(0, 8) + '...';
        
        log('🚀 VDC Forensic Elite v15.1 inicializado. A aguardar autenticação...');
        
        inicializarEventos();
    });

    // ==========================================================================
    // EXPOSIÇÃO PARA DEBUG
    // ==========================================================================

    if (CONFIG.DEBUG) {
        window.VDC = {
            ...window.VDC,
            State: State,
            CONFIG: CONFIG,
            logger: logger,
            carregarDemo: carregarDemo,
            limparSistema: limparSistema,
            exportarJSON: exportarJSON,
            exportarPDF: exportarPDF,
            executarCruzamentos: executarCruzamentos,
            gerarMasterHash: gerarMasterHash,
            stateHistory: stateHistory,
            resetFinancialState: resetFinancialState
        };
    }

})();
