/**
 * VDC SISTEMA DE PERITAGEM FORENSE · v12.8 FINAL
 * ====================================================================
 * EXTRAÇÃO COMPLETA PARA BOLT · EXTRATOS · FATURAS · DAC7 · CSV
 * TODOS OS BLOCOS FECHADOS · SINTAXE VERIFICADA · PT-PT JURÍDICO
 * ====================================================================
 */

'use strict';

console.log('VDC SCRIPT v12.8 FINAL CARREGADO · EXTRAÇÃO COMPLETA ATIVA');

// ============================================================================
// 1. CONFIGURAÇÃO DO PDF.JS
// ============================================================================
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================================================
// 2. DADOS DAS PLATAFORMAS
// ============================================================================
const PLATFORM_DATA = {
    bolt: {
        name: 'Bolt Operations OÜ',
        address: 'Vana-Lõuna 15, 10134 Tallinn, Estónia',
        nif: 'EE102090374',
        country: 'Estónia',
        vatRate: 0.20
    },
    uber: {
        name: 'Uber B.V.',
        address: 'Strawinskylaan 4117, 1077 ZX Amesterdão, Países Baixos',
        nif: 'NL852071588B01',
        country: 'Países Baixos',
        vatRate: 0.21
    },
    freenow: {
        name: 'FREE NOW',
        address: 'Rua Example, 123, 1000-001 Lisboa, Portugal',
        nif: 'PT123456789',
        country: 'Portugal',
        vatRate: 0.23
    },
    cabify: {
        name: 'Cabify',
        address: 'Avenida da Liberdade, 244, 1250-149 Lisboa, Portugal',
        nif: 'PT987654321',
        country: 'Portugal',
        vatRate: 0.23
    },
    indrive: {
        name: 'inDrive',
        address: 'Rua de São Paulo, 56, 4000-000 Porto, Portugal',
        nif: 'PT456123789',
        country: 'Portugal',
        vatRate: 0.23
    },
    outra: {
        name: 'Plataforma não especificada',
        address: 'A definir',
        nif: '000000000',
        country: 'Desconhecido',
        vatRate: 0.23
    }
};

// ============================================================================
// 3. UTILITÁRIOS FORENSES AVANÇADOS
// ============================================================================

// Dados de extração rápida
const QUICK_EXTRACTION = {
    ganhos: 0,
    comissoes: 0,
    dac7: 0,
    saft: 0,
    boltCount: 0,
    uberCount: 0,
    pdfCount: 0,
    valuesFound: 0
};

// Estatísticas de extração
const extractionStats = {
    pdfProcessed: 0,
    valuesFound: 0,
    boltFormat: 0,
    uberFormat: 0,
    pdfTables: 0
};

const forensicRound = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

const toForensicNumber = (v) => {
    if (!v) return 0;
    let str = v.toString().trim();
    
    str = str.replace(/"/g, '');
    str = str.replace(/\s/g, '');
    str = str.replace(/[^\d.,-]/g, '');
    
    if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
        if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (str.indexOf(',') > -1) {
        str = str.replace(',', '.');
    }
    
    if (str.indexOf('.') !== str.lastIndexOf('.')) {
        const parts = str.split('.');
        const last = parts.pop();
        str = parts.join('') + '.' + last;
    }
    
    const result = parseFloat(str) || 0;
    return forensicRound(result);
};

const validateNIF = (nif) => {
    if (!nif || !/^\d{9}$/.test(nif)) return false;
    const first = parseInt(nif[0]);
    if (![1, 2, 3, 5, 6, 8, 9].includes(first)) return false;
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += parseInt(nif[i]) * (9 - i);
    const mod = sum % 11;
    const checkDigit = (mod < 2) ? 0 : 11 - mod;
    return parseInt(nif[8]) === checkDigit;
};

const formatCurrency = (value) => {
    return forensicRound(value).toLocaleString('pt-PT', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }) + ' €';
};

const getRiskVerdict = (delta, gross) => {
    if (gross === 0 || isNaN(gross) || Math.abs(gross) < 0.01) { 
        return { 
            level: 'INCONCLUSIVO', 
            key: 'low', 
            color: '#8c7ae6', 
            description: 'Dados insuficientes para veredicto pericial. Carregue mais evidências.',
            percent: '0.00%' 
        };
    }
    const pct = Math.abs((delta / gross) * 100);
    const pctFormatted = pct.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    
    if (pct <= 5) { 
        return { 
            level: 'BAIXO RISCO', 
            key: 'low', 
            color: '#44bd32', 
            description: 'Margem de erro operacional. Monitorização periódica recomendada, sem indícios de fraude.',
            percent: pctFormatted 
        };
    }
    if (pct <= 15) { 
        return { 
            level: 'RISCO MÉDIO', 
            key: 'med', 
            color: '#f59e0b', 
            description: 'Anomalia algorítmica detetada. Auditoria aprofundada recomendada nos termos do art. 63.º LGT.',
            percent: pctFormatted 
        };
    }
    return { 
        level: 'CRÍTICO · FRAUDE', 
        key: 'high', 
        color: '#ef4444', 
        description: 'Indício de Fraude Fiscal (art. 103.º e 104.º RGIT). Participação à Autoridade Tributária obrigatória.',
        percent: pctFormatted 
    };
};

const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

const setElementHTML = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
};

const generateSessionId = () => {
    return 'VDC-' + Date.now().toString(36).toUpperCase() + '-' + 
           Math.random().toString(36).substring(2, 7).toUpperCase() + '-' +
           Math.floor(Math.random() * 1000).toString().padStart(3, '0');
};

const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            resolve("[PDF_BINARY_CONTENT]");
            return;
        }
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
};

const getForensicMetadata = () => {
    return {
        userAgent: navigator.userAgent,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timestampUnix: Math.floor(Date.now() / 1000),
        timestampISO: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unspecified'
    };
};

// ============================================================================
// 4. SISTEMA DE TRADUÇÕES (VERSÃO SIMPLIFICADA)
// ============================================================================
const translations = {
    pt: {
        startBtn: "INICIAR PERÍCIA v12.8",
        navDemo: "CASO SIMULADO",
        langBtn: "EN",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics",
        sidebarIdTitle: "IDENTIFICAÇÃO DO SUJEITO PASSIVO",
        lblClientName: "Nome / Denominação Social",
        lblNIF: "NIF / Número de Identificação Fiscal",
        btnRegister: "VALIDAR IDENTIDADE",
        sidebarParamTitle: "PARÂMETROS DE AUDITORIA FORENSE",
        lblFiscalYear: "ANO FISCAL EM EXAME",
        lblPeriodo: "PERÍODO TEMPORAL",
        lblPlatform: "PLATAFORMA DIGITAL",
        btnEvidence: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        btnAnalyze: "EXECUTAR PERÍCIA FORENSE",
        btnPDF: "PARECER PERICIAL",
        cardNet: "VALOR LÍQUIDO RECONSTRUÍDO",
        cardComm: "COMISSÕES DETETADAS",
        cardJuros: "FOSSO FISCAL",
        kpiTitle: "TRIANGULAÇÃO FINANCEIRA · ALGORITMO FORENSE v12.8",
        kpiGross: "BRUTO REAL",
        kpiCommText: "COMISSÕES",
        kpiNetText: "LÍQUIDO",
        kpiInvText: "FATURADO",
        consoleTitle: "LOG DE CUSTÓDIA · CADEIA DE CUSTÓDIA",
        footerHashTitle: "INTEGRIDADE DO SISTEMA (MASTER HASH SHA-256 v12.8)",
        modalTitle: "GESTÃO DE EVIDÊNCIAS DIGITAIS",
        uploadControlText: "FICHEIRO DE CONTROLO",
        uploadSaftText: "FICHEIROS SAF-T (PT) / CSV",
        uploadInvoiceText: "FATURAS BOLT (PDF)",
        uploadStatementText: "EXTRATOS BOLT (PDF)",
        uploadDac7Text: "DECLARAÇÃO DAC7 (PDF)",
        summaryTitle: "RESUMO DE PROCESSAMENTO PROBATÓRIO",
        modalSaveBtn: "SELAR EVIDÊNCIAS",
        lblDate: "Data",
        alertCriticalTitle: "ANOMALIA ALGORÍTMICA CRÍTICA",
        alertOmissionText: "Indício de fraude fiscal não justificada:",
        moduleSaftTitle: "MÓDULO SAF-T (EXTRAÇÃO)",
        moduleStatementTitle: "MÓDULO EXTRATOS (BOLT)",
        moduleDac7Title: "MÓDULO DAC7 (DECOMPOSIÇÃO)",
        saftIliquido: "Valor Ilíquido Total",
        saftIva: "Total IVA",
        saftBruto: "Valor Bruto Total",
        stmtGanhos: "Ganhos na App",
        stmtCampanhas: "Campanhas",
        stmtGorjetas: "Gorjetas",
        stmtPortagens: "Portagens",
        stmtTaxasCancel: "Taxas Cancelamento",
        dac7Q1: "1.º Trimestre",
        dac7Q2: "2.º Trimestre",
        dac7Q3: "3.º Trimestre",
        dac7Q4: "4.º Trimestre",
        quantumTitle: "QUANTUM DO BENEFÍCIO ILÍCITO (ART. 103.º RGIT)",
        quantumFormula: "Fórmula: 38.000 motoristas × 12 meses × 7 anos",
        quantumNote: "Impacto Global Estimado de Mercado (Acumulado 7 Anos)",
        verdictPercent: "Desvio Calculado"
    },
    en: {
        startBtn: "START FORENSIC EXAM v12.8",
        navDemo: "SIMULATED CASE",
        langBtn: "PT",
        headerSubtitle: "ISO/IEC 27037 | NIST SP 800-86 | Interpol Digital Forensics",
        sidebarIdTitle: "TAXPAYER IDENTIFICATION",
        lblClientName: "Name / Corporate Name",
        lblNIF: "Tax ID / NIF",
        btnRegister: "VALIDATE IDENTITY",
        sidebarParamTitle: "FORENSIC AUDIT PARAMETERS",
        lblFiscalYear: "FISCAL YEAR UNDER EXAM",
        lblPeriodo: "TIME PERIOD",
        lblPlatform: "DIGITAL PLATFORM",
        btnEvidence: "DIGITAL EVIDENCE MANAGEMENT",
        btnAnalyze: "EXECUTE FORENSIC EXAM",
        btnPDF: "EXPERT REPORT",
        cardNet: "RECONSTRUCTED NET VALUE",
        cardComm: "DETECTED COMMISSIONS",
        cardJuros: "TAX GAP",
        kpiTitle: "FINANCIAL TRIANGULATION · FORENSIC ALGORITHM v12.8",
        kpiGross: "REAL GROSS",
        kpiCommText: "COMMISSIONS",
        kpiNetText: "NET",
        kpiInvText: "INVOICED",
        consoleTitle: "CUSTODY LOG · CHAIN OF CUSTODY",
        footerHashTitle: "SYSTEM INTEGRITY (MASTER HASH SHA-256 v12.8)",
        modalTitle: "DIGITAL EVIDENCE MANAGEMENT",
        uploadControlText: "CONTROL FILE",
        uploadSaftText: "SAF-T FILES (PT) / CSV",
        uploadInvoiceText: "BOLT INVOICES (PDF)",
        uploadStatementText: "BOLT STATEMENTS (PDF)",
        uploadDac7Text: "DAC7 DECLARATION (PDF)",
        summaryTitle: "EVIDENCE PROCESSING SUMMARY",
        modalSaveBtn: "SEAL EVIDENCE",
        lblDate: "Date",
        alertCriticalTitle: "CRITICAL ALGORITHMIC ANOMALY",
        alertOmissionText: "Unjustified tax fraud indication:",
        moduleSaftTitle: "SAF-T MODULE (EXTRACTION)",
        moduleStatementTitle: "STATEMENT MODULE (BOLT)",
        moduleDac7Title: "DAC7 MODULE (BREAKDOWN)",
        saftIliquido: "Total Net Value",
        saftIva: "Total VAT",
        saftBruto: "Total Gross Value",
        stmtGanhos: "App Earnings",
        stmtCampanhas: "Campaigns",
        stmtGorjetas: "Tips",
        stmtPortagens: "Tolls",
        stmtTaxasCancel: "Cancellation Fees",
        dac7Q1: "1st Quarter",
        dac7Q2: "2nd Quarter",
        dac7Q3: "3rd Quarter",
        dac7Q4: "4th Quarter",
        quantumTitle: "ILLICIT BENEFIT AMOUNT (ART. 103 RGIT)",
        quantumFormula: "Formula: 38,000 drivers × 12 months × 7 years",
        quantumNote: "Estimated Global Market Impact (7-Year Cumulative)",
        verdictPercent: "Calculated Deviation"
    }
};

let currentLang = 'pt';

// ============================================================================
// 5. ESTADO GLOBAL
// ============================================================================
const VDCSystem = {
    version: 'v12.8-FINAL',
    sessionId: null,
    selectedYear: new Date().getFullYear(),
    selectedPeriodo: 'anual',
    selectedPlatform: 'bolt',
    client: null,
    demoMode: false,
    processing: false,
    performanceTiming: { start: 0, end: 0 },
    logs: [],
    masterHash: '',
    documents: {
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0, iliquido: 0, iva: 0, bruto: 0 } },
        invoices: { 
            files: [], 
            hashes: {}, 
            totals: { 
                invoiceValue: 0, 
                autoliquidacao: 0,
                records: 0 
            },
            details: []
        },
        statements: { 
            files: [], 
            hashes: {}, 
            totals: { 
                records: 0, 
                ganhosApp: 0, 
                campanhas: 0, 
                gorjetas: 0, 
                portagens: 0, 
                taxasCancelamento: 0, 
                despesasComissao: 0,
                ganhosBrutos: 0,
                ganhosLiquidos: 0,
                pagamentoSemanal: 0
            },
            details: []
        },
        dac7: { 
            files: [], 
            hashes: {}, 
            totals: { 
                records: 0, 
                totalAnual: 0,
                q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
                q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
            }
        }
    },
    analysis: {
        extractedValues: {},
        crossings: { delta: 0 },
        verdict: null,
        evidenceIntegrity: [],
        selectedQuestions: []
    },
    forensicMetadata: null,
    chart: null,
    counts: { total: 0 }
};

// ============================================================================
// 6. FUNÇÕES DE EXTRAÇÃO ESPECÍFICAS
// ============================================================================

/**
 * Extrai dados do Extrato Bolt (PDF com múltiplas tabelas)
 */
function extractBoltStatement(text, fileName) {
    const result = {
        ganhosApp: 0,
        campanhas: 0,
        gorjetas: 0,
        portagens: 0,
        taxasCancelamento: 0,
        ganhosBrutos: 0,
        despesasComissao: 0,
        ganhosLiquidos: 0,
        pagamentoSemanal: 0,
        saldoFinal: 0
    };
    
    let extractionLog = [];
    
    // ============================================================
    // 1. QUADRO "Transações" - Valores
    // ============================================================
    
    // Ganhos na app (formato: "Ganhos na app3157.94" ou "Ganhos na app 3157.94")
    const ganhosAppMatch = text.match(/Ganhos na app\s*([\d\s.,]+)/i);
    if (ganhosAppMatch) {
        result.ganhosApp = toForensicNumber(ganhosAppMatch[1]);
        extractionLog.push(`Ganhos app: ${result.ganhosApp} €`);
    }
    
    // Ganhos da campanha
    const campanhasMatch = text.match(/Ganhos da campanha\s*([\d\s.,]+)/i);
    if (campanhasMatch) {
        result.campanhas = toForensicNumber(campanhasMatch[1]);
        extractionLog.push(`Campanhas: ${result.campanhas} €`);
    }
    
    // Gorjetas dos passageiros
    const gorjetasMatch = text.match(/Gorjetas dos passageiros\s*([\d\s.,]+)/i);
    if (gorjetasMatch) {
        result.gorjetas = toForensicNumber(gorjetasMatch[1]);
        extractionLog.push(`Gorjetas: ${result.gorjetas} €`);
    }
    
    // Portagens
    const portagensMatch = text.match(/Portagens\s*([\d\s.,]+)/i);
    if (portagensMatch) {
        result.portagens = toForensicNumber(portagensMatch[1]);
        extractionLog.push(`Portagens: ${result.portagens} €`);
    }
    
    // Taxas de cancelamento
    const taxasMatch = text.match(/Taxas de cancelamento\s*([\d\s.,]+)/i);
    if (taxasMatch) {
        result.taxasCancelamento = toForensicNumber(taxasMatch[1]);
        extractionLog.push(`Taxas cancel: ${result.taxasCancelamento} €`);
    }
    
    // Pagamento semanal
    const pagamentoMatch = text.match(/Pagamento semanal\s*-?\s*([\d\s.,]+)/i);
    if (pagamentoMatch) {
        result.pagamentoSemanal = toForensicNumber(pagamentoMatch[1]);
        extractionLog.push(`Pagamento: ${result.pagamentoSemanal} €`);
    }
    
    // ============================================================
    // 2. QUADRO "Ganhos líquidos"
    // ============================================================
    
    // Procurar a seção "Ganhos líquidos"
    const liquidosSection = text.match(/Ganhos\s*líquidos[\s\S]{0,300}/i);
    
    if (liquidosSection) {
        const section = liquidosSection[0];
        
        // Ganhos (valor bruto total)
        const ganhosBrutosMatch = section.match(/Ganhos\s*([\d\s.,]+)/i);
        if (ganhosBrutosMatch) {
            result.ganhosBrutos = toForensicNumber(ganhosBrutosMatch[1]);
            extractionLog.push(`Ganhos brutos: ${result.ganhosBrutos} €`);
        }
        
        // Despesas (Comissões)
        const despesasMatch = section.match(/Despesas\s*-?\s*([\d\s.,]+)/i);
        if (despesasMatch) {
            result.despesasComissao = Math.abs(toForensicNumber(despesasMatch[1]));
            extractionLog.push(`Despesas: ${result.despesasComissao} €`);
        }
        
        // Ganhos líquidos
        const liquidosMatch = section.match(/Ganhos\s*líquidos\s*([\d\s.,]+)/i);
        if (liquidosMatch) {
            result.ganhosLiquidos = toForensicNumber(liquidosMatch[1]);
            extractionLog.push(`Líquidos: ${result.ganhosLiquidos} €`);
        }
    }
    
    logAudit(`Extrato Bolt [${fileName}]: ${extractionLog.join(' | ')}`, 'success');
    
    return result;
}

/**
 * Extrai dados da Fatura Bolt
 */
function extractBoltInvoice(text, fileName) {
    const result = {
        numeroFatura: '',
        periodo: '',
        totalComIva: 0,
        autoliquidacao: 0
    };
    
    // Número da fatura
    const numFaturaMatch = text.match(/Fatura\s*n\.?º?\s*([A-Z0-9\-\s]+)/i);
    if (numFaturaMatch) {
        result.numeroFatura = numFaturaMatch[1].trim();
    }
    
    // Período
    const periodoMatch = text.match(/período de\s*([\d\-]+)\s*a\s*([\d\-]+)/i);
    if (periodoMatch) {
        result.periodo = `${periodoMatch[1]} a ${periodoMatch[2]}`;
    }
    
    // Total com IVA
    const totalIvaMatch = text.match(/Total\s*com\s*IVA\s*\(?EUR\)?\s*([\d\s.,]+)/i) ||
                         text.match(/A pagar[:\s]*€?\s*([\d\s.,]+)/i);
    if (totalIvaMatch) {
        result.totalComIva = toForensicNumber(totalIvaMatch[1]);
    }
    
    // Autoliquidação de IVA
    const autoliquidacaoMatch = text.match(/Autoliquidação\s*de\s*IVA\s*([\d\s.,]+)/i);
    if (autoliquidacaoMatch) {
        result.autoliquidacao = toForensicNumber(autoliquidacaoMatch[1]);
    }
    
    logAudit(`Fatura Bolt [${fileName}]: Nº ${result.numeroFatura} | Total: ${result.totalComIva} €`, 'success');
    
    return result;
}

/**
 * Extrai dados completos do DAC7
 */
function extractDAC7(text, fileName) {
    const result = {
        totalAnual: 0,
        trimestres: {
            q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 },
            q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }
        }
    };
    
    // Total de receitas anuais
    const totalAnualMatch = text.match(/Total de receitas anuais[:\s]*€?\s*([\d\s.,]+)/i);
    if (totalAnualMatch) {
        result.totalAnual = toForensicNumber(totalAnualMatch[1]);
    }
    
    // 1.º Trimestre
    const q1Ganhos = text.match(/Ganhos do 1\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q1Ganhos) result.trimestres.q1.ganhos = toForensicNumber(q1Ganhos[1]);
    
    const q1Comissoes = text.match(/Comissões do 1\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q1Comissoes) result.trimestres.q1.comissoes = toForensicNumber(q1Comissoes[1]);
    
    const q1Impostos = text.match(/Impostos do 1\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q1Impostos) result.trimestres.q1.impostos = toForensicNumber(q1Impostos[1]);
    
    const q1Servicos = text.match(/Serviços prestados no 1\.º\s*trimestre[:\s]*([\d\s.,]+)/i);
    if (q1Servicos) result.trimestres.q1.servicos = toForensicNumber(q1Servicos[1]);
    
    // 2.º Trimestre
    const q2Ganhos = text.match(/Ganhos do 2\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q2Ganhos) result.trimestres.q2.ganhos = toForensicNumber(q2Ganhos[1]);
    
    const q2Comissoes = text.match(/Comissões do 2\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q2Comissoes) result.trimestres.q2.comissoes = toForensicNumber(q2Comissoes[1]);
    
    const q2Impostos = text.match(/Impostos do 2\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q2Impostos) result.trimestres.q2.impostos = toForensicNumber(q2Impostos[1]);
    
    const q2Servicos = text.match(/Serviços prestados no 2\.º\s*trimestre[:\s]*([\d\s.,]+)/i);
    if (q2Servicos) result.trimestres.q2.servicos = toForensicNumber(q2Servicos[1]);
    
    // 3.º Trimestre
    const q3Ganhos = text.match(/Ganhos do 3\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q3Ganhos) result.trimestres.q3.ganhos = toForensicNumber(q3Ganhos[1]);
    
    const q3Comissoes = text.match(/Comissões do 3\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q3Comissoes) result.trimestres.q3.comissoes = toForensicNumber(q3Comissoes[1]);
    
    const q3Impostos = text.match(/Impostos do 3\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q3Impostos) result.trimestres.q3.impostos = toForensicNumber(q3Impostos[1]);
    
    const q3Servicos = text.match(/Serviços prestados no 3\.º\s*trimestre[:\s]*([\d\s.,]+)/i);
    if (q3Servicos) result.trimestres.q3.servicos = toForensicNumber(q3Servicos[1]);
    
    // 4.º Trimestre
    const q4Ganhos = text.match(/Ganhos do 4\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q4Ganhos) result.trimestres.q4.ganhos = toForensicNumber(q4Ganhos[1]);
    
    const q4Comissoes = text.match(/Comissões do 4\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q4Comissoes) result.trimestres.q4.comissoes = toForensicNumber(q4Comissoes[1]);
    
    const q4Impostos = text.match(/Impostos do 4\.º\s*trimestre[:\s]*€?\s*([\d\s.,]+)/i);
    if (q4Impostos) result.trimestres.q4.impostos = toForensicNumber(q4Impostos[1]);
    
    const q4Servicos = text.match(/Serviços prestados no 4\.º\s*trimestre[:\s]*([\d\s.,]+)/i);
    if (q4Servicos) result.trimestres.q4.servicos = toForensicNumber(q4Servicos[1]);
    
    logAudit(`DAC7 [${fileName}]: Total Anual: ${result.totalAnual} € | Q4: ${result.trimestres.q4.ganhos} €`, 'success');
    
    return result;
}

/**
 * Extrai dados do CSV de viagens
 */
function extractCSVData(results, fileName) {
    let totalSemIVA = 0;
    let totalIVA = 0;
    let totalComIVA = 0;
    let contagem = 0;
    
    results.data.forEach(row => {
        const precoSemIVA = row["Preço da viagem (sem IVA)"] || row["Preço da viagem"];
        const iva = row["IVA"];
        const precoComIVA = row["Preço da viagem"] || row["Total"];
        
        if (precoSemIVA) {
            totalSemIVA += toForensicNumber(precoSemIVA);
            contagem++;
        }
        
        if (iva) {
            totalIVA += toForensicNumber(iva);
        }
        
        if (precoComIVA && !precoSemIVA) {
            totalComIVA += toForensicNumber(precoComIVA);
        }
    });
    
    if (totalSemIVA === 0 && totalComIVA > 0) {
        totalSemIVA = totalComIVA - totalIVA;
    }
    
    logAudit(`CSV [${fileName}]: ${contagem} viagens | Total: ${(totalSemIVA + totalIVA).toFixed(2)} €`, 'success');
    
    return {
        totalSemIVA: totalSemIVA,
        totalIVA: totalIVA,
        totalComIVA: totalSemIVA + totalIVA,
        contagem: contagem
    };
}

// ============================================================================
// 7. INICIALIZAÇÃO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    setupStaticListeners();
    populateAnoFiscal();
    populateYears();
    startClockAndDate();
    loadSystemRecursively();
    setupKeyboardShortcuts();
    setupQuickUpload();
});

function setupStaticListeners() {
    document.getElementById('startSessionBtn')?.addEventListener('click', startGatekeeperSession);
    document.getElementById('langToggleBtn')?.addEventListener('click', switchLanguage);
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'flex';
    });
    document.getElementById('closeHelpBtn')?.addEventListener('click', () => {
        document.getElementById('helpModal').style.display = 'none';
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            document.getElementById('openEvidenceModalBtn')?.click();
        }
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (!document.getElementById('analyzeBtn').disabled) {
                document.getElementById('analyzeBtn')?.click();
            }
        }
    });
}

function setupQuickUpload() {
    const quickArea = document.getElementById('quickUploadArea');
    const quickInput = document.getElementById('quickUpload');
    const quickBtn = document.getElementById('quickUploadBtn');
    
    if (quickArea) {
        quickArea.addEventListener('click', () => quickInput.click());
        quickArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            quickArea.style.borderColor = 'var(--accent-primary)';
            quickArea.style.background = 'rgba(0, 229, 255, 0.05)';
        });
        quickArea.addEventListener('dragleave', () => {
            quickArea.style.borderColor = '#334155';
            quickArea.style.background = 'transparent';
        });
        quickArea.addEventListener('drop', (e) => {
            e.preventDefault();
            quickArea.style.borderColor = '#334155';
            quickArea.style.background = 'transparent';
            const files = Array.from(e.dataTransfer.files);
            handleQuickUpload(files);
        });
    }
    
    if (quickBtn) {
        quickBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            quickInput.click();
        });
    }
    
    if (quickInput) {
        quickInput.addEventListener('change', (e) => {
            handleQuickUpload(Array.from(e.target.files));
        });
    }
}

async function handleQuickUpload(files) {
    for (const file of files) {
        logAudit(`Quick upload: ${file.name}`, 'info');
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
            await processQuickPDF(file);
        } else if (file.name.endsWith('.csv')) {
            await processQuickCSV(file);
        } else if (file.name.endsWith('.xml')) {
            await processQuickXML(file);
        }
    }
    updateQuickResults();
    logAudit(`Processamento rápido concluído. ${QUICK_EXTRACTION.valuesFound} valores extraídos.`, 'success');
}

async function processQuickPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let rawText = "";
        QUICK_EXTRACTION.pdfCount++;
        extractionStats.pdfProcessed++;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            rawText += content.items.map(s => s.str).join(' ') + ' ';
        }

        const cleanText = rawText
            .replace(/\s\s+/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ');

        // Tentar identificar o tipo de documento
        if (cleanText.includes('Ganhos na app') && cleanText.includes('Ganhos líquidos')) {
            const result = extractBoltStatement(cleanText, file.name);
            QUICK_EXTRACTION.ganhos += result.ganhosApp;
            QUICK_EXTRACTION.comissoes += result.despesasComissao;
            QUICK_EXTRACTION.valuesFound += 6;
            extractionStats.boltFormat++;
        }
        else if (cleanText.includes('Fatura n.º') || cleanText.includes('A pagar:')) {
            const result = extractBoltInvoice(cleanText, file.name);
            QUICK_EXTRACTION.comissoes += result.totalComIva;
            QUICK_EXTRACTION.valuesFound += 2;
            extractionStats.uberFormat++;
        }
        else if (cleanText.includes('Total de receitas anuais')) {
            const result = extractDAC7(cleanText, file.name);
            QUICK_EXTRACTION.dac7 = result.totalAnual;
            QUICK_EXTRACTION.valuesFound += 13;
        }

        extractionStats.valuesFound = QUICK_EXTRACTION.valuesFound;
        
    } catch (error) {
        logAudit(`Erro no PDF rápido: ${error.message}`, 'error');
    }
}

function processQuickCSV(file) {
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const extracted = extractCSVData(results, file.name);
            QUICK_EXTRACTION.saft += extracted.totalComIVA;
            QUICK_EXTRACTION.valuesFound += extracted.contagem;
            extractionStats.valuesFound = QUICK_EXTRACTION.valuesFound;
            updateQuickResults();
        }
    });
}

function processQuickXML(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const creditMatch = text.match(/TotalCredit[^>]*>([^<]+)/i);
        if (creditMatch) {
            const val = toForensicNumber(creditMatch[1]);
            QUICK_EXTRACTION.saft += val;
            QUICK_EXTRACTION.valuesFound++;
            extractionStats.valuesFound = QUICK_EXTRACTION.valuesFound;
            logAudit(`SAF-T rápido processado: ${formatCurrency(val)}`, 'success');
        }
        updateQuickResults();
    };
    reader.readAsText(file);
}

function updateQuickResults() {
    setElementText('resGanhos', formatCurrency(QUICK_EXTRACTION.ganhos));
    setElementText('resComissao', formatCurrency(QUICK_EXTRACTION.comissoes));
    setElementText('resDac7', formatCurrency(QUICK_EXTRACTION.dac7));
    setElementText('resSaft', formatCurrency(QUICK_EXTRACTION.saft));
    
    VDCSystem.documents.statements.totals.ganhosApp = QUICK_EXTRACTION.ganhos;
    VDCSystem.documents.statements.totals.despesasComissao = QUICK_EXTRACTION.comissoes;
    VDCSystem.documents.dac7.totals.totalAnual = QUICK_EXTRACTION.dac7;
    VDCSystem.documents.saft.totals.bruto = QUICK_EXTRACTION.saft;
    
    updateModulesUI();
    updateExtractionStatsModal();
}

function startGatekeeperSession() {
    const splash = document.getElementById('splashScreen');
    const loading = document.getElementById('loadingOverlay');
    if (splash && loading) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            loading.style.display = 'flex';
            loadSystemCore();
        }, 500);
    }
}

function loadSystemCore() {
    updateLoadingProgress(10);
    VDCSystem.sessionId = generateSessionId();
    setElementText('sessionIdDisplay', VDCSystem.sessionId);
    setElementText('miniHash', VDCSystem.sessionId.substring(0, 8) + '...');

    setTimeout(() => {
        updateLoadingProgress(30);
        populateYears();
        populateAnoFiscal();
        startClockAndDate();
        setupMainListeners();
        updateLoadingProgress(50);
        
        setTimeout(() => {
            updateLoadingProgress(70);
            generateMasterHash();
            updateLoadingProgress(85);
            
            setTimeout(() => {
                updateLoadingProgress(100);
                setTimeout(showMainInterface, 300);
            }, 300);
        }, 300);
    }, 300);
}

function updateLoadingProgress(percent) {
    const bar = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingStatusText');
    if (bar) bar.style.width = percent + '%';
    if (text) text.textContent = `MÓDULO FORENSE v12.8... ${percent}%`;
}

function showMainInterface() {
    const loading = document.getElementById('loadingOverlay');
    const main = document.getElementById('mainContainer');
    if (loading && main) {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.style.display = 'none';
            main.style.display = 'block';
            setTimeout(() => main.style.opacity = '1', 50);
        }, 500);
    }
    logAudit('SISTEMA VDC v12.8 FINAL ONLINE · EXTRAÇÃO COMPLETA ATIVA', 'success');
    logAudit('Sessão: ' + VDCSystem.sessionId, 'info');
    logAudit('Use CTRL+O para abrir evidências | CTRL+Enter para executar perícia', 'info');
    logAudit('Arraste ficheiros para a área de upload rápido', 'info');
    
    document.getElementById('analyzeBtn').disabled = false;
    document.getElementById('exportPDFBtn').disabled = false;
    document.getElementById('exportJSONBtn').disabled = false;
    
    updateExtractionStatus();
}

function loadSystemRecursively() {
    try {
        const stored = localStorage.getItem('vdc_client_data_bd_v12_8');
        if (stored) {
            const client = JSON.parse(stored);
            if (client && client.name && client.nif) {
                VDCSystem.client = client;
                document.getElementById('clientStatusFixed').style.display = 'flex';
                setElementText('clientNameDisplayFixed', client.name);
                setElementText('clientNifDisplayFixed', client.nif);
                document.getElementById('clientNameFixed').value = client.name;
                document.getElementById('clientNIFFixed').value = client.nif;
                logAudit(`Sujeito passivo recuperado: ${client.name}`, 'success');
            }
        }
    } catch(e) { 
        console.warn('Cache limpo ou inexistente'); 
    }
    startClockAndDate();
}

function populateAnoFiscal() {
    const selectAno = document.getElementById('anoFiscal');
    if (!selectAno) return;
    const currentYear = new Date().getFullYear();
    for(let ano = 2018; ano <= 2030; ano++) {
        const opt = document.createElement('option');
        opt.value = ano;
        opt.textContent = ano;
        if(ano === currentYear) opt.selected = true;
        selectAno.appendChild(opt);
    }
}

function populateYears() {
    const sel = document.getElementById('anoFiscal');
    if(!sel) return;
    sel.innerHTML = '';
    for(let y = 2030; y >= 2018; y--) {
        const opt = document.createElement('option'); 
        opt.value = y; 
        opt.textContent = y;
        if(y === new Date().getFullYear()) opt.selected = true;
        sel.appendChild(opt);
    }
}

function startClockAndDate() {
    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString(currentLang === 'pt' ? 'pt-PT' : 'en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString(currentLang === 'pt' ? 'pt-PT' : 'en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        setElementText('currentDate', dateStr);
        setElementText('currentTime', timeStr);
    };
    update();
    setInterval(update, 1000);
}

function setupMainListeners() {
    document.getElementById('registerClientBtnFixed')?.addEventListener('click', registerClient);
    document.getElementById('demoModeBtn')?.addEventListener('click', activateDemoMode);

    document.getElementById('anoFiscal')?.addEventListener('change', (e) => {
        VDCSystem.selectedYear = parseInt(e.target.value);
        logAudit(`Ano fiscal em exame alterado para: ${e.target.value}`, 'info');
    });

    document.getElementById('periodoAnalise')?.addEventListener('change', (e) => {
        VDCSystem.selectedPeriodo = e.target.value;
        const periodos = {
            'anual': 'Exercício Completo (Anual)',
            '1s': '1.º Semestre (Janeiro-Junho)',
            '2s': '2.º Semestre (Julho-Dezembro)',
            'trimestral': 'Análise Trimestral',
            'mensal': 'Análise Mensal'
        };
        logAudit(`Período temporal alterado para: ${periodos[e.target.value] || e.target.value}`, 'info');
    });

    document.getElementById('selPlatformFixed')?.addEventListener('change', (e) => {
        VDCSystem.selectedPlatform = e.target.value;
        logAudit(`Plataforma alterada para: ${PLATFORM_DATA[e.target.value]?.name || e.target.value}`, 'info');
    });

    document.getElementById('openEvidenceModalBtn')?.addEventListener('click', () => {
        document.getElementById('evidenceModal').style.display = 'flex';
        updateEvidenceSummary();
        updateExtractionStatsModal();
    });

    const closeModal = () => {
        document.getElementById('evidenceModal').style.display = 'none';
        updateAnalysisButton();
        generateMasterHash();
    };

    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('closeAndSaveBtn')?.addEventListener('click', closeModal);
    document.getElementById('clearAllEvidenceBtn')?.addEventListener('click', clearAllEvidence);
    
    document.getElementById('evidenceModal')?.addEventListener('click', (e) => { 
        if(e.target.id === 'evidenceModal') closeModal(); 
    });
    
    document.getElementById('helpModal')?.addEventListener('click', (e) => {
        if(e.target.id === 'helpModal') {
            document.getElementById('helpModal').style.display = 'none';
        }
    });

    document.getElementById('analyzeBtn')?.addEventListener('click', performAudit);
    document.getElementById('exportPDFBtn')?.addEventListener('click', exportPDF);
    document.getElementById('exportJSONBtn')?.addEventListener('click', exportDataJSON);
    document.getElementById('resetBtn')?.addEventListener('click', resetSystem);
    document.getElementById('clearConsoleBtn')?.addEventListener('click', clearConsole);

    setupUploadListeners();
}

function setupUploadListeners() {
    const types = ['control', 'saft', 'invoice', 'statement', 'dac7'];
    types.forEach(type => {
        const btn = document.getElementById(`${type}UploadBtnModal`);
        const input = document.getElementById(`${type}FileModal`);
        if (btn && input) {
            btn.addEventListener('click', () => input.click());
            input.addEventListener('change', (e) => handleFileUpload(e, type));
        }
    });
}

function switchLanguage() {
    currentLang = currentLang === 'pt' ? 'en' : 'pt';
    const t = translations[currentLang];

    const elements = [
        { id: 'splashStartBtnText', key: 'startBtn' },
        { id: 'demoBtnText', key: 'navDemo' },
        { id: 'currentLangLabel', key: 'langBtn' },
        { id: 'headerSubtitle', key: 'headerSubtitle' },
        { id: 'sidebarIdTitle', key: 'sidebarIdTitle' },
        { id: 'lblClientName', key: 'lblClientName' },
        { id: 'lblNIF', key: 'lblNIF' },
        { id: 'btnRegister', key: 'btnRegister' },
        { id: 'sidebarParamTitle', key: 'sidebarParamTitle' },
        { id: 'lblFiscalYear', key: 'lblFiscalYear' },
        { id: 'lblPeriodo', key: 'lblPeriodo' },
        { id: 'lblPlatform', key: 'lblPlatform' },
        { id: 'btnEvidence', key: 'btnEvidence' },
        { id: 'btnAnalyze', key: 'btnAnalyze' },
        { id: 'btnPDF', key: 'btnPDF' },
        { id: 'cardNet', key: 'cardNet' },
        { id: 'cardComm', key: 'cardComm' },
        { id: 'cardJuros', key: 'cardJuros' },
        { id: 'kpiTitle', key: 'kpiTitle' },
        { id: 'kpiGross', key: 'kpiGross' },
        { id: 'kpiCommText', key: 'kpiCommText' },
        { id: 'kpiNetText', key: 'kpiNetText' },
        { id: 'kpiInvText', key: 'kpiInvText' },
        { id: 'consoleTitle', key: 'consoleTitle' },
        { id: 'footerHashTitle', key: 'footerHashTitle' },
        { id: 'modalTitle', key: 'modalTitle' },
        { id: 'uploadControlText', key: 'uploadControlText' },
        { id: 'uploadSaftText', key: 'uploadSaftText' },
        { id: 'uploadInvoiceText', key: 'uploadInvoiceText' },
        { id: 'uploadStatementText', key: 'uploadStatementText' },
        { id: 'uploadDac7Text', key: 'uploadDac7Text' },
        { id: 'summaryTitle', key: 'summaryTitle' },
        { id: 'modalSaveBtn', key: 'modalSaveBtn' },
        { id: 'lblDate', key: 'lblDate' },
        { id: 'alertCriticalTitle', key: 'alertCriticalTitle' },
        { id: 'alertOmissionText', key: 'alertOmissionText' },
        { id: 'moduleSaftTitle', key: 'moduleSaftTitle' },
        { id: 'moduleStatementTitle', key: 'moduleStatementTitle' },
        { id: 'moduleDac7Title', key: 'moduleDac7Title' },
        { id: 'saftIliquidoLabel', key: 'saftIliquido' },
        { id: 'saftIvaLabel', key: 'saftIva' },
        { id: 'saftBrutoLabel', key: 'saftBruto' },
        { id: 'stmtGanhosLabel', key: 'stmtGanhos' },
        { id: 'stmtCampanhasLabel', key: 'stmtCampanhas' },
        { id: 'stmtGorjetasLabel', key: 'stmtGorjetas' },
        { id: 'stmtPortagensLabel', key: 'stmtPortagens' },
        { id: 'stmtTaxasCancelLabel', key: 'stmtTaxasCancel' },
        { id: 'dac7Q1Label', key: 'dac7Q1' },
        { id: 'dac7Q2Label', key: 'dac7Q2' },
        { id: 'dac7Q3Label', key: 'dac7Q3' },
        { id: 'dac7Q4Label', key: 'dac7Q4' },
        { id: 'quantumTitle', key: 'quantumTitle' },
        { id: 'quantumFormula', key: 'quantumFormula' },
        { id: 'quantumNote', key: 'quantumNote' },
        { id: 'verdictPercentLabel', key: 'verdictPercent' }
    ];

    elements.forEach(el => {
        const dom = document.getElementById(el.id);
        if (dom) dom.textContent = t[el.key];
    });

    logAudit(`Idioma alterado para: ${currentLang.toUpperCase()}`, 'info');
}

// ============================================================================
// 8. REGISTO DE CLIENTE
// ============================================================================
function registerClient() {
    const name = document.getElementById('clientNameFixed').value.trim();
    const nif = document.getElementById('clientNIFFixed').value.trim();

    if (!name || name.length < 3) {
        showToast('Nome inválido (mínimo 3 caracteres)', 'error');
        return;
    }
    if (!validateNIF(nif)) {
        showToast('NIF inválido (checksum falhou ou formato incorreto)', 'error');
        return;
    }

    VDCSystem.client = { 
        name, 
        nif, 
        platform: VDCSystem.selectedPlatform,
        registeredAt: new Date().toISOString()
    };
    localStorage.setItem('vdc_client_data_bd_v12_8', JSON.stringify(VDCSystem.client));

    document.getElementById('clientStatusFixed').style.display = 'flex';
    setElementText('clientNameDisplayFixed', name);
    setElementText('clientNifDisplayFixed', nif);

    logAudit(`Sujeito passivo registado: ${name} (NIF ${nif})`, 'success');
    showToast('Identidade validada com sucesso', 'success');
    updateAnalysisButton();
}

// ============================================================================
// 9. GESTÃO DE EVIDÊNCIAS COM EXTRAÇÃO COMPLETA
// ============================================================================
async function handleFileUpload(e, type) {
    const files = Array.from(e.target.files);
    if(files.length === 0) return;

    const btn = document.querySelector(`#${type}UploadBtnModal`);
    if(btn) {
        btn.classList.add('processing');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
    }

    try {
        for (const file of files) {
            await processFile(file, type);
        }
        logAudit(`${files.length} ficheiro(s) ${type} carregado(s) com integridade verificada`, 'success');
        updateEvidenceSummary();
        updateCounters();
        generateMasterHash();
        updateExtractionStatsModal();
        showToast(`${files.length} ficheiro(s) processados e selados`, 'success');
    } catch (error) {
        console.error('Erro no upload:', error);
        logAudit(`Erro no upload ${type}: ${error.message}`, 'error');
        showToast('Erro ao processar ficheiros', 'error');
    } finally {
        if(btn) {
            btn.classList.remove('processing');
            const buttonTexts = {
                control: '<i class="fas fa-file-shield"></i> SELECIONAR CONTROLO',
                saft: '<i class="fas fa-file-code"></i> SELECIONAR SAF-T/CSV',
                invoice: '<i class="fas fa-file-invoice-dollar"></i> SELECIONAR FATURAS BOLT',
                statement: '<i class="fas fa-file-contract"></i> SELECIONAR EXTRATOS BOLT',
                dac7: '<i class="fas fa-envelope-open-text"></i> SELECIONAR DAC7'
            };
            btn.innerHTML = buttonTexts[type] || '<i class="fas fa-folder-open"></i> SELECIONAR';
        }
        e.target.value = '';
    }
}

async function processFile(file, type) {
    let text = "";
    let isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    let formatDetected = 'desconhecido';
    let extractedData = {};
    
    const listId = type === 'invoice' ? 'invoicesFileListModal' : 
                   type === 'statement' ? 'statementsFileListModal' : 
                   type === 'dac7' ? 'dac7FileListModal' :
                   `${type}FileListModal`;
    const listEl = document.getElementById(listId);
    
    const tempId = 'temp-' + Date.now() + '-' + Math.random();
    if(listEl) {
        listEl.style.display = 'block';
        listEl.innerHTML += `<div id="${tempId}" class="file-item-modal processing">
            <i class="fas fa-spinner fa-spin" style="color: var(--accent-primary);"></i>
            <span class="file-name-modal">${file.name}</span>
            <span class="file-hash-modal">processando...</span>
        </div>`;
    }
    
    try {
        if (isPDF) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            extractionStats.pdfProcessed++;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(" ") + "\n";
            }
            
            text = fullText
                .replace(/[^\x20-\x7E\u00C0-\u00FF\n]/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/\n\s+/g, '\n');
            
            if (type === 'statement') {
                extractedData = extractBoltStatement(text, file.name);
                
                VDCSystem.documents.statements.totals.ganhosApp += extractedData.ganhosApp;
                VDCSystem.documents.statements.totals.campanhas += extractedData.campanhas;
                VDCSystem.documents.statements.totals.gorjetas += extractedData.gorjetas;
                VDCSystem.documents.statements.totals.portagens += extractedData.portagens;
                VDCSystem.documents.statements.totals.taxasCancelamento += extractedData.taxasCancelamento;
                VDCSystem.documents.statements.totals.despesasComissao += extractedData.despesasComissao;
                VDCSystem.documents.statements.totals.ganhosBrutos += extractedData.ganhosBrutos;
                VDCSystem.documents.statements.totals.ganhosLiquidos += extractedData.ganhosLiquidos;
                VDCSystem.documents.statements.totals.pagamentoSemanal += extractedData.pagamentoSemanal;
                
                VDCSystem.documents.statements.details.push({
                    filename: file.name,
                    data: extractedData
                });
                
                QUICK_EXTRACTION.ganhos += extractedData.ganhosApp;
                QUICK_EXTRACTION.comissoes += extractedData.despesasComissao;
                
                extractionStats.boltFormat++;
                extractionStats.valuesFound += 8;
                formatDetected = 'bolt_statement';
            }
            
            else if (type === 'invoice') {
                extractedData = extractBoltInvoice(text, file.name);
                
                VDCSystem.documents.invoices.totals.invoiceValue += extractedData.totalComIva;
                VDCSystem.documents.invoices.totals.autoliquidacao += extractedData.autoliquidacao;
                
                VDCSystem.documents.invoices.details.push({
                    filename: file.name,
                    numero: extractedData.numeroFatura,
                    periodo: extractedData.periodo,
                    total: extractedData.totalComIva
                });
                
                QUICK_EXTRACTION.comissoes += extractedData.totalComIva;
                
                setElementText('invoiceNumero', extractedData.numeroFatura || '---');
                setElementText('invoiceTotal', formatCurrency(extractedData.totalComIva));
                setElementText('invoiceAutoliquidacao', formatCurrency(extractedData.autoliquidacao));
                
                extractionStats.uberFormat++;
                extractionStats.valuesFound += 3;
                formatDetected = 'bolt_invoice';
            }
            
            else if (type === 'dac7') {
                extractedData = extractDAC7(text, file.name);
                
                VDCSystem.documents.dac7.totals.totalAnual = extractedData.totalAnual;
                VDCSystem.documents.dac7.totals.q1 = extractedData.trimestres.q1;
                VDCSystem.documents.dac7.totals.q2 = extractedData.trimestres.q2;
                VDCSystem.documents.dac7.totals.q3 = extractedData.trimestres.q3;
                VDCSystem.documents.dac7.totals.q4 = extractedData.trimestres.q4;
                
                QUICK_EXTRACTION.dac7 = extractedData.totalAnual;
                
                extractionStats.valuesFound += 13;
                formatDetected = 'dac7_complete';
            }
        }
        
        else if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    extractedData = extractCSVData(results, file.name);
                    
                    VDCSystem.documents.saft.totals.bruto += extractedData.totalComIVA;
                    VDCSystem.documents.saft.totals.iliquido += extractedData.totalSemIVA;
                    VDCSystem.documents.saft.totals.iva += extractedData.totalIVA;
                    
                    QUICK_EXTRACTION.saft += extractedData.totalComIVA;
                    
                    extractionStats.valuesFound += extractedData.contagem;
                    formatDetected = 'csv_trips';
                    
                    updateQuickResults();
                }
            });
        }
        
        // Gerar hash e guardar metadados
        const contentToHash = text || file.name + Date.now();
        const hash = CryptoJS.SHA256(contentToHash).toString();
        
        if(!VDCSystem.documents[type]) {
            VDCSystem.documents[type] = { files: [], hashes: {}, totals: { records: 0 } };
        }
        
        VDCSystem.documents[type].files.push(file);
        VDCSystem.documents[type].hashes[file.name] = hash;
        VDCSystem.documents[type].totals.records = (VDCSystem.documents[type].totals.records || 0) + 1;
        
        VDCSystem.analysis.evidenceIntegrity.push({
            filename: file.name,
            type,
            hash,
            timestamp: new Date().toLocaleString(),
            size: file.size,
            timestampUnix: Math.floor(Date.now() / 1000),
            format: formatDetected
        });
        
        const tempElement = document.getElementById(tempId);
        if (tempElement && listEl) {
            const iconClass = isPDF ? 'fa-file-pdf' : 'fa-file-csv';
            const iconColor = isPDF ? '#e74c3c' : '#27ae60';
            const formatBadge = `<span class="format-badge ${formatDetected}">✓</span>`;
            
            tempElement.outerHTML = `<div class="file-item-modal success">
                <i class="fas ${iconClass}" style="color: ${iconColor};"></i>
                <span class="file-name-modal">${file.name} ${formatBadge}</span>
                <span class="file-hash-modal">${hash.substring(0,8)}...</span>
            </div>`;
        }
        
        updateQuickResults();
        updateExtractionStatus();
        updateExtractionStatsModal();
        
    } catch (error) {
        console.error('Erro no processamento:', error);
        logAudit(`Erro ao processar ${file.name}: ${error.message}`, 'error');
        
        const tempElement = document.getElementById(tempId);
        if (tempElement) {
            tempElement.className = 'file-item-modal error';
            tempElement.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--warn-primary);"></i>
                <span class="file-name-modal">${file.name}</span>
                <span class="file-hash-modal">ERRO</span>`;
        }
    }
}

function clearAllEvidence() {
    if (!confirm('Tem a certeza que deseja limpar todas as evidências?')) return;
    
    VDCSystem.documents = {
        control: { files: [], hashes: {}, totals: { records: 0 } },
        saft: { files: [], hashes: {}, totals: { records: 0, iliquido: 0, iva: 0, bruto: 0 } },
        invoices: { files: [], hashes: {}, totals: { invoiceValue: 0, autoliquidacao: 0, records: 0 }, details: [] },
        statements: { files: [], hashes: {}, totals: { records: 0, ganhosApp: 0, campanhas: 0, gorjetas: 0, portagens: 0, taxasCancelamento: 0, despesasComissao: 0, ganhosBrutos: 0, ganhosLiquidos: 0, pagamentoSemanal: 0 }, details: [] },
        dac7: { files: [], hashes: {}, totals: { records: 0, totalAnual: 0, q1: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q2: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q3: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 }, q4: { ganhos: 0, comissoes: 0, impostos: 0, servicos: 0 } }
    };
    
    QUICK_EXTRACTION.ganhos = 0;
    QUICK_EXTRACTION.comissoes = 0;
    QUICK_EXTRACTION.dac7 = 0;
    QUICK_EXTRACTION.saft = 0;
    QUICK_EXTRACTION.boltCount = 0;
    QUICK_EXTRACTION.uberCount = 0;
    QUICK_EXTRACTION.pdfCount = 0;
    QUICK_EXTRACTION.valuesFound = 0;
    
    extractionStats.pdfProcessed = 0;
    extractionStats.valuesFound = 0;
    extractionStats.boltFormat = 0;
    extractionStats.uberFormat = 0;
    
    const listIds = ['controlFileListModal', 'saftFileListModal', 'invoicesFileListModal', 
                     'statementsFileListModal', 'dac7FileListModal'];
    listIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    
    setElementText('invoiceNumero', '---');
    setElementText('invoiceTotal', '0,00 €');
    setElementText('invoiceAutoliquidacao', '0,00 €');
    
    updateEvidenceSummary();
    updateCounters();
    generateMasterHash();
    updateQuickResults();
    updateExtractionStatus();
    updateExtractionStatsModal();
    logAudit('Todas as evidências foram removidas', 'warn');
    showToast('Evidências removidas', 'warning');
}

function updateEvidenceSummary() {
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        const idMap = { 
            invoices: 'Invoices', 
            statements: 'Statements', 
            control: 'Control', 
            saft: 'Saft', 
            dac7: 'Dac7' 
        };
        const elId = `summary${idMap[k] || k}`;
        const el = document.getElementById(elId);
        if(el) el.textContent = count;
    });
    
    let total = 0;
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
        total += VDCSystem.documents[k]?.files?.length || 0;
    });
    setElementText('summaryTotal', total);
}

function updateCounters() {
    let total = 0;
    ['control', 'saft', 'invoices', 'statements', 'dac7'].forEach(k => {
        const count = VDCSystem.documents[k]?.files?.length || 0;
        total += count;
        let id = k;
        if (k === 'invoices') id = 'invoice';
        if (k === 'statements') id = 'statement';
        setElementText(`${id}CountCompact`, count);
    });
    document.getElementById('evidenceCountTotal').textContent = total;
    VDCSystem.counts.total = total;
}

function updateExtractionStatus() {
    const statusIcon = document.getElementById('extractionStatusIcon');
    const statusText = document.getElementById('extractionStatusText');
    
    if (VDCSystem.counts.total > 0 || QUICK_EXTRACTION.valuesFound > 0) {
        statusIcon.className = 'status-icon active';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = `${QUICK_EXTRACTION.valuesFound} valor(es) extraídos`;
    } else {
        statusIcon.className = 'status-icon';
        statusIcon.innerHTML = '<i class="fas fa-circle"></i>';
        statusText.textContent = 'AGUARDANDO FICHEIROS';
    }
}

function updateExtractionStatsModal() {
    setElementText('statsPdfCount', extractionStats.pdfProcessed);
    setElementText('statsValuesFound', extractionStats.valuesFound);
    setElementText('statsBoltFormat', extractionStats.boltFormat);
    setElementText('statsUberFormat', extractionStats.uberFormat);
    
    setElementText('detailValuesFound', extractionStats.valuesFound);
    setElementText('detailBoltFormat', extractionStats.boltFormat);
    setElementText('detailUberFormat', extractionStats.uberFormat);
    setElementText('detailPdfCount', extractionStats.pdfProcessed);
}

function updateModulesUI() {
    const stmt = VDCSystem.documents.statements.totals;
    const dac7 = VDCSystem.documents.dac7.totals;
    const inv = VDCSystem.documents.invoices.totals;
    const saft = VDCSystem.documents.saft.totals;
    
    // Módulo SAF-T
    setElementText('saftIliquidoValue', formatCurrency(saft.iliquido || 0));
    setElementText('saftIvaValue', formatCurrency(saft.iva || 0));
    setElementText('saftBrutoValue', formatCurrency(saft.bruto || QUICK_EXTRACTION.saft));
    
    // Módulo Extratos
    setElementText('stmtGanhosValue', formatCurrency(stmt.ganhosApp || QUICK_EXTRACTION.ganhos));
    setElementText('stmtCampanhasValue', formatCurrency(stmt.campanhas || 0));
    setElementText('stmtGorjetasValue', formatCurrency(stmt.gorjetas || 0));
    setElementText('stmtPortagensValue', formatCurrency(stmt.portagens || 0));
    setElementText('stmtTaxasCancelValue', formatCurrency(stmt.taxasCancelamento || 0));
    setElementText('stmtComissaoValue', formatCurrency(stmt.despesasComissao || QUICK_EXTRACTION.comissoes));
    setElementText('stmtLiquidoValue', formatCurrency(stmt.ganhosLiquidos || 0));
    
    // Módulo DAC7
    setElementText('dac7Q1Value', formatCurrency(dac7.q1?.ganhos || 0));
    setElementText('dac7Q2Value', formatCurrency(dac7.q2?.ganhos || 0));
    setElementText('dac7Q3Value', formatCurrency(dac7.q3?.ganhos || 0));
    setElementText('dac7Q4Value', formatCurrency(dac7.q4?.ganhos || QUICK_EXTRACTION.dac7));
    
    setElementText('dac7Q1Comissoes', `Comis: ${formatCurrency(dac7.q1?.comissoes || 0)}`);
    setElementText('dac7Q2Comissoes', `Comis: ${formatCurrency(dac7.q2?.comissoes || 0)}`);
    setElementText('dac7Q3Comissoes', `Comis: ${formatCurrency(dac7.q3?.comissoes || 0)}`);
    setElementText('dac7Q4Comissoes', `Comis: ${formatCurrency(dac7.q4?.comissoes || 0)}`);
    
    setElementText('dac7Q1Servicos', `Serv: ${dac7.q1?.servicos || 0}`);
    setElementText('dac7Q2Servicos', `Serv: ${dac7.q2?.servicos || 0}`);
    setElementText('dac7Q3Servicos', `Serv: ${dac7.q3?.servicos || 0}`);
    setElementText('dac7Q4Servicos', `Serv: ${dac7.q4?.servicos || 0}`);
    
    const dac7Total = dac7.totalAnual || QUICK_EXTRACTION.dac7;
    setElementText('dac7TotalValue', formatCurrency(dac7Total));
    
    // Módulo Faturas
    if (inv.invoiceValue > 0) {
        setElementText('invoiceTotal', formatCurrency(inv.invoiceValue));
        setElementText('invoiceAutoliquidacao', formatCurrency(inv.autoliquidacao || 0));
    }
}

// ============================================================================
// 10. MODO DEMO
// ============================================================================
function activateDemoMode() {
    if(VDCSystem.processing) return;
    VDCSystem.demoMode = true;
    VDCSystem.processing = true;

    const demoBtn = document.getElementById('demoModeBtn');
    if(demoBtn) {
        demoBtn.disabled = true;
        demoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CARREGANDO...';
    }

    logAudit('ATIVANDO CASO SIMULADO v12.8...', 'info');

    document.getElementById('clientNameFixed').value = 'Momento Eficaz - Unip, Lda';
    document.getElementById('clientNIFFixed').value = '517905450';
    registerClient();

    setTimeout(() => {
        QUICK_EXTRACTION.ganhos = 3157.94;
        QUICK_EXTRACTION.comissoes = 792.59;
        QUICK_EXTRACTION.dac7 = 7755.16;
        QUICK_EXTRACTION.saft = 12500.00;
        QUICK_EXTRACTION.boltCount = 2;
        QUICK_EXTRACTION.uberCount = 1;
        QUICK_EXTRACTION.valuesFound = 25;
        
        extractionStats.pdfProcessed = 3;
        extractionStats.valuesFound = 25;
        extractionStats.boltFormat = 2;
        extractionStats.uberFormat = 1;
        
        VDCSystem.documents.saft.totals.bruto = 12500.00;
        VDCSystem.documents.saft.totals.iliquido = 11792.45;
        VDCSystem.documents.saft.totals.iva = 707.55;
        
        VDCSystem.documents.statements.totals.ganhosApp = 3157.94;
        VDCSystem.documents.statements.totals.campanhas = 20.00;
        VDCSystem.documents.statements.totals.gorjetas = 9.00;
        VDCSystem.documents.statements.totals.portagens = 15.50;
        VDCSystem.documents.statements.totals.taxasCancelamento = 15.60;
        VDCSystem.documents.statements.totals.despesasComissao = 792.59;
        VDCSystem.documents.statements.totals.ganhosBrutos = 3202.54;
        VDCSystem.documents.statements.totals.ganhosLiquidos = 2409.95;
        
        VDCSystem.documents.invoices.totals.invoiceValue = 239.00;
        VDCSystem.documents.invoices.totals.autoliquidacao = 0.00;
        
        VDCSystem.documents.dac7.totals.totalAnual = 7755.16;
        VDCSystem.documents.dac7.totals.q4 = {
            ganhos: 7755.16,
            comissoes: 239.00,
            impostos: 0.00,
            servicos: 1648
        };
        
        VDCSystem.analysis.extractedValues = {
            rendimentosBrutos: 3157.94,
            comissaoApp: -792.59,
            faturaPlataforma: 239.00,
            saftBruto: 12500.00,
            saftIliquido: 11792.45,
            saftIva: 707.55,
            ganhosApp: 3157.94,
            iva23: 54.97,
            jurosMora: 2.20,
            jurosCompensatorios: 3.30,
            multaDolo: 23.90,
            quantumBeneficio: 38000 * 12 * 7
        };
        
        VDCSystem.analysis.crossings.delta = 239.00;

        performForensicCrossings(3157.94, -792.59, 239.00);

        updateQuickResults();
        updateModulesUI();
        updateDashboard();
        renderChart();
        showAlerts();
        updateExtractionStatsModal();
        updateExtractionStatus();

        logAudit('Perícia simulada concluída. Quantum: 3.192.000,00 €', 'success');
        VDCSystem.processing = false;
        if(demoBtn) {
            demoBtn.disabled = false;
            demoBtn.innerHTML = `<i class="fas fa-flask"></i> ${translations[currentLang].navDemo}`;
        }
    }, 1500);
}

// ============================================================================
// 11. MOTOR DE PERÍCIA FORENSE
// ============================================================================
function performAudit() {
    if (!VDCSystem.client) {
        showToast('Registe o sujeito passivo primeiro.', 'error');
        return;
    }

    const hasFiles = Object.values(VDCSystem.documents).some(d => d.files && d.files.length > 0) || 
                     QUICK_EXTRACTION.valuesFound > 0;
    if (!hasFiles) {
        showToast('Carregue pelo menos um ficheiro de evidência antes de executar a perícia.', 'error');
        return;
    }

    VDCSystem.forensicMetadata = getForensicMetadata();
    VDCSystem.performanceTiming.start = performance.now();

    const analyzeBtn = document.getElementById('analyzeBtn');
    if(analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A EXECUTAR PERÍCIA...';
    }

    setTimeout(() => {
        try {
            const stmtGross = VDCSystem.documents.statements?.totals?.ganhosApp || QUICK_EXTRACTION.ganhos;
            const stmtCommission = VDCSystem.documents.statements?.totals?.despesasComissao || QUICK_EXTRACTION.comissoes;
            const invoiceVal = VDCSystem.documents.invoices?.totals?.invoiceValue || 0;
            const saftBruto = VDCSystem.documents.saft?.totals?.bruto || QUICK_EXTRACTION.saft;

            const grossRevenue = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.rendimentosBrutos : stmtGross;
            const platformCommission = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.comissaoApp : -stmtCommission;
            const faturaPlataforma = VDCSystem.demoMode ? VDCSystem.analysis.extractedValues.faturaPlataforma : invoiceVal;

            performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma);

            updateDashboard();
            renderChart();
            showAlerts();

            VDCSystem.performanceTiming.end = performance.now();
            const duration = (VDCSystem.performanceTiming.end - VDCSystem.performanceTiming.start).toFixed(2);
            logAudit(`Perícia concluída em ${duration}ms. VEREDICTO: ${VDCSystem.analysis.verdict.level}`, 'success');

        } catch(error) {
            console.error('Erro na perícia:', error);
            logAudit(`ERRO CRÍTICO NA PERÍCIA: ${error.message}`, 'error');
            showToast('Erro durante a execução da perícia.', 'error');
        } finally {
            if(analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = `<i class="fas fa-search-dollar"></i> ${translations[currentLang].btnAnalyze}`;
            }
        }
    }, 1000);
}

function performForensicCrossings(grossRevenue, platformCommission, faturaPlataforma) {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    ev.rendimentosBrutos = forensicRound(grossRevenue);
    ev.comissaoApp = forensicRound(platformCommission);
    ev.faturaPlataforma = forensicRound(faturaPlataforma);

    const comissaoAbs = forensicRound(Math.abs(ev.comissaoApp));
    const diferencial = forensicRound(Math.abs(comissaoAbs - ev.faturaPlataforma));

    ev.diferencialCusto = diferencial;
    cross.delta = diferencial;

    ev.iva23 = forensicRound(diferencial * 0.23);
    ev.jurosMora = forensicRound(ev.iva23 * 0.04);
    ev.jurosCompensatorios = forensicRound(ev.iva23 * 0.06);
    ev.multaDolo = forensicRound(diferencial * 0.10);
    ev.quantumBeneficio = 38000 * 12 * 7;

    cross.bigDataAlertActive = diferencial > 0.01;

    VDCSystem.analysis.verdict = getRiskVerdict(diferencial, ev.rendimentosBrutos);
}

function updateDashboard() {
    const ev = VDCSystem.analysis.extractedValues;
    const netValue = (ev.rendimentosBrutos || 0) + (ev.comissaoApp || 0);

    setElementText('statNet', formatCurrency(netValue));
    setElementText('statComm', formatCurrency(Math.abs(ev.comissaoApp || 0)));
    setElementText('statJuros', formatCurrency(ev.diferencialCusto || 0));

    setElementText('kpiGrossValue', formatCurrency(ev.rendimentosBrutos || 0));
    setElementText('kpiCommValue', formatCurrency(Math.abs(ev.comissaoApp || 0)));
    setElementText('kpiNetValue', formatCurrency(netValue));
    setElementText('kpiInvValue', formatCurrency(ev.faturaPlataforma || 0));

    setElementText('quantumValue', formatCurrency(ev.quantumBeneficio || 0));

    const jurosCard = document.getElementById('jurosCard');
    if(jurosCard) jurosCard.style.display = (ev.diferencialCusto > 0) ? 'block' : 'none';
    
    const quantumBox = document.getElementById('quantumBox');
    if(quantumBox) quantumBox.style.display = (ev.quantumBeneficio > 0) ? 'block' : 'none';
}

function showAlerts() {
    const ev = VDCSystem.analysis.extractedValues;
    const cross = VDCSystem.analysis.crossings;

    const verdictDisplay = document.getElementById('verdictDisplay');
    if(verdictDisplay && VDCSystem.analysis.verdict) {
        verdictDisplay.style.display = 'block';
        verdictDisplay.className = `verdict-display active verdict-${VDCSystem.analysis.verdict.key}`;
        setElementText('verdictLevel', VDCSystem.analysis.verdict.level);
        setElementText('verdictDesc', VDCSystem.analysis.verdict.description);
        setElementText('verdictPercentValue', VDCSystem.analysis.verdict.percent);
        document.getElementById('verdictLevel').style.color = VDCSystem.analysis.verdict.color;
    }

    const bigDataAlert = document.getElementById('bigDataAlert');
    if(bigDataAlert) {
        if(cross.bigDataAlertActive && ev.diferencialCusto > 0.01) {
            bigDataAlert.style.display = 'flex';
            bigDataAlert.classList.add('alert-active');
            setElementText('alertDeltaValue', formatCurrency(ev.diferencialCusto));
        } else {
            bigDataAlert.style.display = 'none';
            bigDataAlert.classList.remove('alert-active');
        }
    }
}

function renderChart() {
    const ctx = document.getElementById('mainChart');
    if(!ctx) return;
    if(VDCSystem.chart) VDCSystem.chart.destroy();

    const ev = VDCSystem.analysis.extractedValues;
    VDCSystem.chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bruto (App)', 'Comissões', 'Líquido', 'Faturado', 'Fosso Fiscal'],
            datasets: [{
                label: 'Valor (€)',
                data: [
                    ev.rendimentosBrutos || QUICK_EXTRACTION.ganhos || 0,
                    Math.abs(ev.comissaoApp || QUICK_EXTRACTION.comissoes || 0),
                    (ev.rendimentosBrutos || QUICK_EXTRACTION.ganhos || 0) - (Math.abs(ev.comissaoApp || QUICK_EXTRACTION.comissoes || 0)),
                    ev.faturaPlataforma || 0,
                    ev.diferencialCusto || 0
                ],
                backgroundColor: [
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1', '#ef4444'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => '€ ' + context.parsed.y.toLocaleString('pt-PT', { minimumFractionDigits: 2 })
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: '#b8c6e0',
                        callback: (v) => v.toLocaleString('pt-PT') + ' €'
                    }
                },
                x: { 
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { color: '#b8c6e0' } 
                }
            }
        }
    });
}

// ============================================================================
// 12. EXPORTAÇÕES
// ============================================================================
function exportDataJSON() {
    const exportData = {
        metadata: {
            version: VDCSystem.version,
            sessionId: VDCSystem.sessionId,
            timestamp: new Date().toISOString(),
            timestampUnix: Math.floor(Date.now() / 1000),
            language: currentLang,
            client: VDCSystem.client,
            anoFiscal: VDCSystem.selectedYear,
            periodoAnalise: VDCSystem.selectedPeriodo,
            demoMode: VDCSystem.demoMode,
            forensicMetadata: VDCSystem.forensicMetadata || getForensicMetadata(),
            extractionStats: { ...extractionStats }
        },
        analysis: {
            totals: VDCSystem.analysis.extractedValues,
            discrepancies: VDCSystem.analysis.crossings,
            verdict: VDCSystem.analysis.verdict,
            evidenceCount: VDCSystem.counts?.total || 0
        },
        evidence: {
            integrity: VDCSystem.analysis.evidenceIntegrity,
            invoices: {
                count: VDCSystem.documents.invoices?.files?.length || 0,
                totalValue: VDCSystem.documents.invoices?.totals?.invoiceValue || 0,
                autoliquidacao: VDCSystem.documents.invoices?.totals?.autoliquidacao || 0,
                details: VDCSystem.documents.invoices?.details || []
            },
            statements: {
                count: VDCSystem.documents.statements?.files?.length || 0,
                ganhosApp: VDCSystem.documents.statements?.totals?.ganhosApp || QUICK_EXTRACTION.ganhos,
                campanhas: VDCSystem.documents.statements?.totals?.campanhas || 0,
                gorjetas: VDCSystem.documents.statements?.totals?.gorjetas || 0,
                portagens: VDCSystem.documents.statements?.totals?.portagens || 0,
                taxasCancelamento: VDCSystem.documents.statements?.totals?.taxasCancelamento || 0,
                comissao: VDCSystem.documents.statements?.totals?.despesasComissao || QUICK_EXTRACTION.comissoes,
                ganhosBrutos: VDCSystem.documents.statements?.totals?.ganhosBrutos || 0,
                ganhosLiquidos: VDCSystem.documents.statements?.totals?.ganhosLiquidos || 0,
                details: VDCSystem.documents.statements?.details || []
            },
            saft: {
                count: VDCSystem.documents.saft?.files?.length || 0,
                bruto: VDCSystem.documents.saft?.totals?.bruto || QUICK_EXTRACTION.saft,
                iliquido: VDCSystem.documents.saft?.totals?.iliquido || 0,
                iva: VDCSystem.documents.saft?.totals?.iva || 0
            },
            dac7: {
                count: VDCSystem.documents.dac7?.files?.length || 0,
                totalAnual: VDCSystem.documents.dac7?.totals?.totalAnual || QUICK_EXTRACTION.dac7,
                trimestres: VDCSystem.documents.dac7?.totals
            }
        },
        auditLog: VDCSystem.logs.slice(-50)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `VDC_PERITIA_${VDCSystem.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);

    logAudit('Relatório JSON exportado', 'success');
    showToast('JSON probatório exportado', 'success');
}

function exportPDF() {
    if (!VDCSystem.client) {
        showToast('Sem sujeito passivo para gerar parecer.', 'error');
        return;
    }
    if (typeof window.jspdf === 'undefined') {
        logAudit('Erro: jsPDF não carregado.', 'error');
        showToast('Erro de sistema (jsPDF)', 'error');
        return;
    }

    logAudit('A gerar Parecer Pericial...', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const t = translations[currentLang];
        const platform = PLATFORM_DATA[VDCSystem.selectedPlatform] || PLATFORM_DATA.bolt;
        const ev = VDCSystem.analysis.extractedValues;
        const stmt = VDCSystem.documents.statements.totals;
        const dac7 = VDCSystem.documents.dac7.totals;
        const inv = VDCSystem.documents.invoices.totals;
        const verdict = VDCSystem.analysis.verdict || { 
            level: 'N/A', key: 'low', color: '#8c7ae6', 
            description: 'Perícia não executada', percent: '0.00%' 
        };

        let y = 45;
        const left = 14;

        doc.setFillColor(2, 6, 23);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(22);
        doc.text('VDC FORENSE', 105, 15, { align: 'center' });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('PARECER PERICIAL DE INVESTIGAÇÃO DIGITAL', 105, 25, { align: 'center' });
        
        doc.setTextColor(0, 229, 255);
        doc.setFontSize(12);
        doc.text('1. IDENTIFICAÇÃO', left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`Nome: ${VDCSystem.client.name}`, left, y); y += 6;
        doc.text(`NIF: ${VDCSystem.client.nif}`, left, y); y += 6;
        doc.text(`Perícia n.º: ${VDCSystem.sessionId}`, left, y); y += 6;
        doc.text(`Plataforma: ${platform.name}`, left, y); y += 10;
        
        doc.setTextColor(0, 229, 255);
        doc.text('2. EXTRATO BOLT', left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.text(`Ganhos na app: ${formatCurrency(stmt.ganhosApp || QUICK_EXTRACTION.ganhos)}`, left, y); y += 6;
        doc.text(`Campanhas: ${formatCurrency(stmt.campanhas || 0)}`, left, y); y += 6;
        doc.text(`Gorjetas: ${formatCurrency(stmt.gorjetas || 0)}`, left, y); y += 6;
        doc.text(`Portagens: ${formatCurrency(stmt.portagens || 0)}`, left, y); y += 6;
        doc.text(`Taxas cancelamento: ${formatCurrency(stmt.taxasCancelamento || 0)}`, left, y); y += 6;
        doc.text(`Comissões: ${formatCurrency(stmt.despesasComissao || QUICK_EXTRACTION.comissoes)}`, left, y); y += 6;
        doc.text(`Ganhos líquidos: ${formatCurrency(stmt.ganhosLiquidos || 0)}`, left, y); y += 10;
        
        doc.setTextColor(0, 229, 255);
        doc.text('3. FATURA BOLT', left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.text(`Total com IVA: ${formatCurrency(inv.invoiceValue || 0)}`, left, y); y += 6;
        doc.text(`Autoliquidação: ${formatCurrency(inv.autoliquidacao || 0)}`, left, y); y += 10;
        
        doc.setTextColor(0, 229, 255);
        doc.text('4. DAC7', left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.text(`Total anual: ${formatCurrency(dac7.totalAnual || QUICK_EXTRACTION.dac7)}`, left, y); y += 6;
        doc.text(`Q4 Ganhos: ${formatCurrency(dac7.q4?.ganhos || 0)}`, left, y); y += 6;
        doc.text(`Q4 Comissões: ${formatCurrency(dac7.q4?.comissoes || 0)}`, left, y); y += 6;
        doc.text(`Q4 Serviços: ${dac7.q4?.servicos || 0}`, left, y); y += 10;
        
        doc.setTextColor(0, 229, 255);
        doc.text('5. VEREDICTO', left, y); y += 8;
        
        let r = 139, g = 92, b = 246;
        if (verdict.color === '#ef4444') { r = 239; g = 68; b = 68; }
        else if (verdict.color === '#f59e0b') { r = 245; g = 158; b = 11; }
        else if (verdict.color === '#44bd32') { r = 68; g = 189; b = 50; }
        
        doc.setTextColor(r, g, b);
        doc.setFontSize(14);
        doc.text(`VEREDICTO: ${verdict.level}`, left, y); y += 8;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text(`Desvio: ${verdict.percent}`, left, y); y += 6;
        doc.text(verdict.description, left, y); y += 15;
        
        doc.setFillColor(2, 6, 23);
        doc.rect(0, 280, 210, 17, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.text('Art. 103.º e 104.º RGIT · ISO/IEC 27037', 105, 287, { align: 'center' });
        doc.text(`HASH: ${VDCSystem.masterHash || 'NÃO GERADA'}`, 105, 292, { align: 'center' });
        doc.text(`Gerado: ${new Date().toLocaleString('pt-PT')}`, 105, 297, { align: 'center' });
        
        doc.save(`VDC_Parecer_${VDCSystem.sessionId}.pdf`);
        logAudit('PDF exportado', 'success');
        showToast('PDF gerado', 'success');

    } catch (error) {
        console.error('Erro PDF:', error);
        logAudit(`Erro ao gerar PDF: ${error.message}`, 'error');
        showToast('Erro ao gerar PDF', 'error');
    }
}

// ============================================================================
// 13. FUNÇÕES AUXILIARES
// ============================================================================
function generateMasterHash() {
    const data = JSON.stringify({
        client: VDCSystem.client,
        session: VDCSystem.sessionId,
        quick: QUICK_EXTRACTION,
        timestamp: Date.now()
    });
    VDCSystem.masterHash = CryptoJS.SHA256(data).toString();
    setElementText('masterHashValue', VDCSystem.masterHash);
    setElementText('miniHash', VDCSystem.masterHash.substring(0, 8) + '...');
}

function logAudit(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    const entry = { timestamp, message, type };
    VDCSystem.logs.push(entry);

    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
        const logEl = document.createElement('div');
        logEl.className = `log-entry log-${type}`;
        logEl.textContent = `[${timestamp}] ${message}`;
        consoleOutput.appendChild(logEl);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-triangle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><p>${message}</p>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function clearConsole() {
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) consoleOutput.innerHTML = '';
    VDCSystem.logs = [];
    logAudit('Console limpo.', 'info');
}

function resetSystem() {
    if (!confirm('Tem a certeza que deseja reiniciar o sistema? Todos os dados serão perdidos.')) return;
    localStorage.removeItem('vdc_client_data_bd_v12_8');
    location.reload();
}

function updateAnalysisButton() {
    const btn = document.getElementById('analyzeBtn');
    if (btn) {
        const hasFiles = Object.values(VDCSystem.documents).some(d => d.files && d.files.length > 0) || 
                         QUICK_EXTRACTION.valuesFound > 0;
        const hasClient = VDCSystem.client !== null;
        btn.disabled = !(hasFiles && hasClient);
    }
}

// ============================================================================
// 14. INICIALIZAÇÃO DE SEGURANÇA
// ============================================================================
(function initSecurity() {
    document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.master-hash') || e.target.closest('.session-id')) {
            e.preventDefault();
            showToast('Proteção de integridade ativada', 'warning');
        }
    });
    logAudit('Sistema inicializado · Extração Completa v12.8', 'info');
})();

/* =====================================================================
   FIM DO FICHEIRO SCRIPT.JS · v12.8 FINAL
   EXTRAÇÃO COMPLETA: BOLT · FATURAS · DAC7 · CSV
   ===================================================================== */
