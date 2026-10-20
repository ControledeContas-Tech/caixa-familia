// ================= NÚCLEO: utilidades, dados de exemplo e regras =================
// Dinheiro sempre em centavos inteiros. Datas sempre "AAAA-MM-DD" (sem hora).
const TODAY = (typeof globalThis !== "undefined" && globalThis.__TODAY) || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const rid = (p = "") => p + (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2, 12) + Date.now().toString(36));
const pad = n => String(n).padStart(2, "0");
const ymOf = iso => iso.slice(0, 7);
const addYM = (ym, k) => { let [y, m] = ym.split("-").map(Number); m += k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1; return y + "-" + pad(m); };
const ymDiff = (a, b) => { const [ay, am] = a.split("-").map(Number), [by, bm] = b.split("-").map(Number); return (by - ay) * 12 + (bm - am); };
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const mk = (ym, day) => { const [y, m] = ym.split("-").map(Number); return ym + "-" + pad(Math.min(day, lastDay(y, m))); };
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const br = iso => iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "—";
const brs = iso => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ymLabel = ym => MES[+ym.slice(5) - 1] + "/" + ym.slice(2, 4);
const ymLong = ym => MESL[+ym.slice(5) - 1] + " de " + ym.slice(0, 4);
const CUR = ymOf(TODAY);
const fmt = c => { const s = c < 0 ? "−" : ""; c = Math.abs(Math.round(c)); return s + "R$ " + Math.floor(c / 100).toLocaleString("pt-BR") + "," + pad(c % 100); };
const fmtK = c => (c < 0 ? "−" : "") + "R$ " + Math.round(Math.abs(c) / 100).toLocaleString("pt-BR");
const parseBRL = s => { s = String(s || "").trim().replace(/[^\d,.-]/g, ""); if (!s) return NaN; if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const v = Number(s); return isFinite(v) ? Math.round(v * 100) : NaN; };
const sum = (a, f = x => x) => a.reduce((t, x) => t + f(x), 0);
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- família nova, sem dados ----------
const CATEGORIAS_PADRAO = [
  ["Moradia", "Aluguel, Condomínio, Água, Energia, Gás, Internet"], ["Mercado", ""], ["Alimentação", "Restaurantes, Delivery, Padaria"], ["Transporte", "Combustível, Aplicativos, Manutenção, Estacionamento"],
  ["Saúde", "Farmácia, Plano de saúde, Consultas, Academia"], ["Casa", "Móveis, Eletrônicos, Manutenção"], ["Vestuário", ""], ["Assinaturas", "Streaming, Música, Aplicativos"],
  ["Educação", "Cursos, Escola, Livros"], ["Lazer", "Viagens, Passeios"], ["Pets", ""], ["Presentes", ""], ["Impostos e taxas", "IPTU, IPVA, Tarifas bancárias"],
  ["Dívidas", "Empréstimos"], ["Encargos financeiros", "Juros, IOF, Multas"], ["Outras despesas", ""],
  ["Salário", "receita"], ["Rendimentos", "receita"], ["Outras receitas", "receita"],
];
const REGRAS_PADRAO = [
  ["PAG FATURA", "Transferência", "Pagamento de fatura", 0], ["PAGAMENTO DE FATURA", "Transferência", "Pagamento de fatura", 0],
  ["IFOOD", "Alimentação", "Delivery", 1], ["IFD*", "Alimentação", "Delivery", 1], ["RAPPI", "Alimentação", "Delivery", 1],
  ["UBER", "Transporte", "Aplicativos", 2], ["99APP", "Transporte", "Aplicativos", 2], ["POSTO", "Transporte", "Combustível", 2], ["SHELL", "Transporte", "Combustível", 2], ["IPIRANGA", "Transporte", "Combustível", 2],
  ["DROGA", "Saúde", "Farmácia", 3], ["DROGASIL", "Saúde", "Farmácia", 3], ["PAGUE MENOS", "Saúde", "Farmácia", 3], ["SMART FIT", "Saúde", "Academia", 3],
  ["NETFLIX", "Assinaturas", "Streaming", 4], ["SPOTIFY", "Assinaturas", "Música", 4], ["AMAZON PRIME", "Assinaturas", "Streaming", 4], ["DISNEY", "Assinaturas", "Streaming", 4],
  ["CARREFOUR", "Mercado", "", 5], ["PAO DE ACUCAR", "Mercado", "", 5], ["ASSAI", "Mercado", "", 5], ["ATACADAO", "Mercado", "", 5], ["SUPERMERCADO", "Mercado", "", 6], ["MERCADO", "Mercado", "", 7],
  ["SALARIO", "Salário", "", 1], ["IOF", "Encargos financeiros", "IOF", 1], ["JUROS", "Encargos financeiros", "Juros", 1],
].map(([trecho, cat, sub, prio]) => ({ trecho, cat, sub, prio }));
function vazio(user = "Eu", inicio = ymOf(TODAY) + "-01") {
  return { v: 4, user, inicio, pessoas: [{ id: rid("ps"), nome: user, acesso: "Administrador", login: "" }], contas: [], cartoes: [], categorias: CATEGORIAS_PADRAO.map(c => c.slice()), regras: REGRAS_PADRAO.map(r => ({ ...r })),
    lanc: [], parc: [], rec: [], inst: {}, manuais: [], dividas: [], provisoes: [], invest: [], audit: [], importacoes: [], pend: null };
}

// ---------- dados fictícios ----------
function seed() {
  const S = {
    v: 4, seq: 1000, user: "João",
    pessoas: [
      { id: "joao", nome: "João", acesso: "Administrador", login: "joao@exemplo.com" },
      { id: "manu", nome: "Manu", acesso: "Membro", login: "manu@exemplo.com" },
      { id: "gil", nome: "Gil", acesso: "Sem login", login: "" },
    ],
    contas: [
      { id: "itau", nome: "Conta principal · Itaú", tipo: "Conta corrente", inst: "Itaú", resp: "João", caixa: true, alvo: 842035 },
      { id: "nuconta", nome: "Nubank conta · Manu", tipo: "Conta corrente", inst: "Nubank", resp: "Manu", caixa: true, alvo: 218000 },
      { id: "especie", nome: "Dinheiro em espécie", tipo: "Espécie", inst: "—", resp: "Casa", caixa: true, alvo: 35000 },
      { id: "reserva", nome: "Reserva IPVA · Itaú", tipo: "Reserva", inst: "Itaú", resp: "Casa", caixa: false, alvo: 120000 },
    ],
    cartoes: [
      { id: "nubank", nome: "Nubank - João", inst: "Nubank", resp: "João", limite: 800000, fecha: 29, vence: 5, pagaCom: "itau", final: "7310", status: "Ativo" },
      { id: "inter", nome: "Inter - Manu", inst: "Inter", resp: "Manu", limite: 450000, fecha: 18, vence: 28, pagaCom: "nuconta", final: "4821", status: "Ativo" },
      { id: "pern", nome: "Pernambucanas - Gil", inst: "Pernambucanas", resp: "Gil", limite: 120000, fecha: 20, vence: 30, pagaCom: "itau", final: "0952", status: "Ativo" },
    ],
    inicio: "2026-09-01", // início do controle: o que vem antes é histórico quitado
    categorias: [
      ["Moradia", "Condomínio, Água, Energia, Internet"], ["Mercado", ""], ["Alimentação", "Restaurantes, Delivery"], ["Transporte", "Combustível, Aplicativos"],
      ["Saúde", "Farmácia, Academia, Dentista"], ["Casa", "Móveis, Eletrônicos, Manutenção"], ["Vestuário", ""], ["Assinaturas", "Streaming, Música"],
      ["Lazer", ""], ["Educação", ""], ["Dívidas", "Empréstimos"], ["Encargos financeiros", "Juros, IOF"],
      ["Salário", "receita"], ["Outras receitas", "receita"],
    ],
    regras: [
      { trecho: "IFOOD", cat: "Alimentação", sub: "Delivery", prio: 1 }, { trecho: "IFD*", cat: "Alimentação", sub: "Delivery", prio: 1 },
      { trecho: "UBER", cat: "Transporte", sub: "Aplicativos", prio: 2 }, { trecho: "POSTO", cat: "Transporte", sub: "Combustível", prio: 2 },
      { trecho: "DROGA", cat: "Saúde", sub: "Farmácia", prio: 3 }, { trecho: "SMART FIT", cat: "Saúde", sub: "Academia", prio: 3 },
      { trecho: "NETFLIX", cat: "Assinaturas", sub: "Streaming", prio: 4 }, { trecho: "SPOTIFY", cat: "Assinaturas", sub: "Música", prio: 4 },
      { trecho: "CARREFOUR", cat: "Mercado", sub: "", prio: 5 }, { trecho: "PAO DE ACUCAR", cat: "Mercado", sub: "", prio: 5 }, { trecho: "SUPERMERCADO", cat: "Mercado", sub: "", prio: 6 },
      { trecho: "PAG FATURA", cat: "Transferência", sub: "Pagamento de fatura", prio: 0 },
    ],
    lanc: [], parc: [], rec: [], inst: {}, manuais: [], dividas: [], provisoes: [], invest: [], audit: [], importacoes: [], pend: null,
  };
  const L = (o) => { o.id = "l" + (S.seq++); o.origem = o.origem || "manual"; o.resp = o.resp || "João"; S.lanc.push(o); return o.id; };

  // receitas e despesas recorrentes
  S.rec = [
    { id: "r-cond", desc: "Condomínio Ed. Aurora", tipo: "despesa", cat: "Moradia", sub: "Condomínio", valor: 78000, dia: 25, conta: "itau", inicio: "2026-01", fim: null, resp: "Casa", natureza: "Fixa" },
    { id: "r-enel", desc: "Enel · energia", tipo: "despesa", cat: "Moradia", sub: "Energia", valor: 21460, dia: 27, conta: "itau", inicio: "2026-01", fim: null, resp: "Casa", natureza: "Variável" },
    { id: "r-agua", desc: "Sabesp · água", tipo: "despesa", cat: "Moradia", sub: "Água", valor: 15640, dia: 15, conta: "itau", inicio: "2026-01", fim: null, resp: "Casa", natureza: "Variável" },
    { id: "r-net", desc: "Vivo Fibra · internet", tipo: "despesa", cat: "Moradia", sub: "Internet", valor: 11990, dia: 10, conta: "itau", inicio: "2026-01", fim: null, resp: "Casa", natureza: "Fixa" },
    { id: "r-plano", desc: "Unimed · plano de saúde", tipo: "despesa", cat: "Saúde", sub: "Plano de saúde", valor: 118000, dia: 8, conta: "itau", inicio: "2026-01", fim: null, resp: "Casa", natureza: "Fixa" },
    { id: "r-diarista", desc: "Diarista · Sônia", tipo: "despesa", cat: "Moradia", sub: "Serviços", valor: 64000, dia: 30, conta: "itau", inicio: "2026-01", fim: null, resp: "Casa", natureza: "Fixa" },
    { id: "r-iptu", desc: "IPTU 2026", tipo: "despesa", cat: "Moradia", sub: "Impostos", valor: 32000, dia: 15, conta: "itau", inicio: "2026-02", fim: "2026-11", resp: "João", natureza: "Fixa" },
    { id: "r-escola", desc: "Curso de inglês · Manu", tipo: "despesa", cat: "Educação", sub: "", valor: 34900, dia: 12, conta: "nuconta", inicio: "2026-11", fim: "2027-06", resp: "Manu", natureza: "Fixa" },
    { id: "r-sal-j", desc: "Salário João", tipo: "receita", cat: "Salário", sub: "", valor: 760000, dia: 5, conta: "itau", inicio: "2026-01", fim: null, resp: "João", natureza: "Fixa" },
    { id: "r-sal-m", desc: "Salário Manu", tipo: "receita", cat: "Salário", sub: "", valor: 520000, dia: 20, conta: "nuconta", inicio: "2026-01", fim: null, resp: "Manu", natureza: "Fixa" },
  ];
  const pay = (recId, ym, data, valor, conta, extra = {}) => {
    const r = S.rec.find(x => x.id === recId);
    const id = L({ data, desc: r.desc, tipo: r.tipo, valor, conta, cat: r.cat, sub: r.sub, resp: r.resp, origem: "recorrência", comp: recId + "|" + ym });
    const k = recId + "|" + ym; S.inst[k] = Object.assign(S.inst[k] || { valor: r.valor }, extra); (S.inst[k].pag = S.inst[k].pag || []).push({ lanc: id, valor, data });
  };
  pay("r-sal-j", "2026-09", "2026-09-05", 760000, "itau");
  pay("r-sal-m", "2026-09", "2026-09-20", 520000, "nuconta");
  pay("r-sal-j", "2026-10", "2026-10-05", 760000, "itau");
  pay("r-net", "2026-09", "2026-09-10", 11990, "itau");
  pay("r-agua", "2026-09", "2026-09-15", 14980, "itau", { valor: 14980 });
  pay("r-cond", "2026-09", "2026-09-25", 78000, "itau");
  pay("r-enel", "2026-09", "2026-09-27", 20890, "itau", { valor: 20890 });
  pay("r-net", "2026-10", "2026-10-10", 11990, "itau");
  pay("r-plano", "2026-09", "2026-09-08", 118000, "itau");
  pay("r-plano", "2026-10", "2026-10-08", 118000, "itau");
  pay("r-iptu", "2026-09", "2026-09-15", 32000, "itau");
  pay("r-iptu", "2026-10", "2026-10-15", 32000, "itau");
  pay("r-diarista", "2026-09", "2026-09-30", 64000, "itau");
  pay("r-agua", "2026-10", "2026-10-15", 9800, "itau");

  // dívidas (parcelas viram compromissos)
  S.dividas = [
    { id: "d-consig", nome: "Empréstimo consignado", credor: "Banco do Brasil", saldo: 918000, parcela: 61200, taxa: 1.85, dia: 20, primeiro: "2025-09", total: 30, prioridade: "Alta", conta: "itau", situacao: "Em dia", obs: "Contrato 88213-4" },
    { id: "d-rosa", nome: "Empréstimo da tia Rosa", credor: "Rosa (família)", saldo: 180000, parcela: 30000, taxa: null, dia: 10, primeiro: "2026-05", total: 12, prioridade: "Média", conta: "nuconta", situacao: "Em dia", obs: "Sem juros combinados; valor por Pix" },
  ];
  const payD = (dId, ym, data) => {
    const d = S.dividas.find(x => x.id === dId);
    const id = L({ data, desc: d.nome + " " + (ymDiff(d.primeiro, ym) + 1) + "/" + d.total, tipo: "despesa", valor: d.parcela, conta: d.conta, cat: "Dívidas", sub: "Empréstimos", origem: "dívida", comp: dId + "|" + ym, resp: d.conta === "itau" ? "João" : "Manu" });
    const k = dId + "|" + ym; S.inst[k] = S.inst[k] || {}; (S.inst[k].pag = S.inst[k].pag || []).push({ lanc: id, valor: d.parcela, data });
  };
  payD("d-consig", "2026-09", "2026-09-20");
  payD("d-rosa", "2026-09", "2026-09-10");
  payD("d-rosa", "2026-10", "2026-10-10");

  // gastos à vista em conta e espécie
  L({ data: "2026-09-14", desc: "Feira de domingo", tipo: "despesa", valor: 9200, conta: "especie", cat: "Mercado" });
  L({ data: "2026-10-12", desc: "Feira de domingo", tipo: "despesa", valor: 8500, conta: "especie", cat: "Mercado" });
  L({ data: "2026-10-16", desc: "Padaria Estrela", tipo: "despesa", valor: 3200, conta: "especie", cat: "Alimentação", sub: "Restaurantes" });
  L({ data: "2026-10-03", desc: "Saque para espécie", tipo: "transferencia", valor: 20000, conta: "itau", destino: "especie" });
  L({ data: "2026-09-19", desc: "Oficina Mecânica Bento · revisão", tipo: "despesa", valor: 185000, conta: "itau", cat: "Transporte", sub: "Manutenção" });
  L({ data: "2026-09-21", desc: "Divisão das despesas da casa", tipo: "transferencia", valor: 300000, conta: "nuconta", destino: "itau", resp: "Manu" });

  L({ data: "2026-09-22", desc: "Mercado Dia", tipo: "despesa", valor: 18740, conta: "nuconta", cat: "Mercado", resp: "Manu" });
  L({ data: "2026-10-08", desc: "Cabeleireiro", tipo: "despesa", valor: 12000, conta: "nuconta", cat: "Lazer", resp: "Manu" });

  // parcelamentos no cartão
  const P = (o) => { o.id = "p" + (S.seq++); o.origem = o.origem || "importação"; S.parc.push(o); };
  P({ cartao: "nubank", desc: "Amazon · aspirador robô", cat: "Casa", sub: "Eletrônicos", data: "2026-06-03", total: 224940, n: 12, resp: "João" });
  P({ cartao: "nubank", desc: "Clínica Sorriso", cat: "Saúde", sub: "Dentista", data: "2026-09-18", total: 218400, n: 3, resp: "João" });
  P({ cartao: "nubank", desc: "Leroy Merlin · armário", cat: "Casa", sub: "Móveis", data: "2026-10-13", total: 247500, n: 6, resp: "João" });
  P({ cartao: "inter", desc: "Magazine Luiza · geladeira", cat: "Casa", sub: "Eletrodomésticos", data: "2026-08-09", total: 249900, n: 10, resp: "Manu" });
  P({ cartao: "inter", desc: "Renner", cat: "Vestuário", data: "2026-09-16", total: 88720, n: 4, resp: "Manu" });
  P({ cartao: "pern", desc: "Pernambucanas · roupas de cama", cat: "Casa", data: "2026-04-15", total: 189900, n: 10, resp: "Gil" });

  // compras à vista no cartão
  const C = (cartao, data, desc, cat, valor, extra = {}) => L(Object.assign({ data, desc, tipo: "despesa", valor, cartao, cat, origem: "importação", resp: S.cartoes.find(c => c.id === cartao).resp }, extra));
  C("nubank", "2026-08-30", "Smart Fit", "Saúde", 12990, { sub: "Academia" });
  C("nubank", "2026-09-12", "Pão de Açúcar", "Mercado", 41230);
  C("nubank", "2026-09-12", "Spotify", "Assinaturas", 3490, { sub: "Música" });
  C("nubank", "2026-09-30", "Smart Fit", "Saúde", 12990, { sub: "Academia" });
  C("nubank", "2026-10-06", "Carrefour", "Mercado", 49832);
  C("nubank", "2026-10-10", "Uber", "Transporte", 6410, { sub: "Aplicativos" });
  C("nubank", "2026-10-12", "Spotify", "Assinaturas", 3490, { sub: "Música" });
  C("nubank", "2026-10-17", "Outback", "Alimentação", 28660, { sub: "Restaurantes" });
  C("inter", "2026-09-02", "Posto Shell", "Transporte", 18000, { sub: "Combustível" });
  C("inter", "2026-09-07", "Netflix", "Assinaturas", 5590, { sub: "Streaming" });
  C("inter", "2026-10-02", "Pão de Açúcar", "Mercado", 31248);
  const drog = C("inter", "2026-10-05", "Drogasil", "Saúde", 8990, { sub: "Farmácia" });
  C("inter", "2026-10-07", "Netflix", "Assinaturas", 5590, { sub: "Streaming" });
  C("inter", "2026-10-11", "Posto Shell", "Transporte", 21000, { sub: "Combustível" });
  C("inter", "2026-10-14", "iFood", "Alimentação", 7637, { sub: "Delivery" });
  L({ data: "2026-10-15", desc: "Estorno Drogasil", tipo: "estorno", valor: 8990, cartao: "inter", cat: "Saúde", sub: "Farmácia", estornoDe: drog, origem: "importação", resp: "Manu" });

  // pagamentos de faturas anteriores (transferência conta → cartão)
  L({ data: "2026-09-28", desc: "Pagamento fatura Inter - Manu", tipo: "transferencia", valor: 70760, conta: "nuconta", destino: "inter", fatura: "2026-09", resp: "Manu" });
  L({ data: "2026-09-30", desc: "Pagamento fatura Pernambucanas - Gil", tipo: "transferencia", valor: 18990, conta: "itau", destino: "pern", fatura: "2026-09" });
  L({ data: "2026-10-05", desc: "Pagamento fatura Nubank - João", tipo: "transferencia", valor: 149255, conta: "itau", destino: "nubank", fatura: "2026-10" });

  // provisões e investimentos
  L({ data: "2026-10-06", desc: "Aporte na reserva do IPVA", tipo: "transferencia", valor: 60000, conta: "itau", destino: "reserva" });
  S.provisoes = [
    { id: "pv-ipva", nome: "IPVA 2027", alvo: 340000, reservado: 0, conta: "reserva", uso: "2027-01", mov: [{ data: "2026-08-06", tipo: "Aporte", valor: 60000 }, { data: "2026-10-06", tipo: "Aporte", valor: 60000 }] },
    { id: "pv-seguro", nome: "Seguro do carro", alvo: 90000, reservado: 90000, conta: null, uso: "2026-12", mov: [{ data: "2026-09-02", tipo: "Planejado", valor: 90000 }] },
    { id: "pv-natal", nome: "Presentes de Natal", alvo: 150000, reservado: 40000, conta: null, uso: "2026-12", mov: [{ data: "2026-10-01", tipo: "Planejado", valor: 40000 }] },
  ];
  const aportes = [["inv-tesouro", "2026-09-06", 50000, "itau"], ["inv-tesouro", "2026-10-06", 50000, "itau"], ["inv-prev", "2026-09-30", 20000, "nuconta"]];
  S.invest = [
    { id: "inv-tesouro", nome: "Tesouro Selic 2029", tipo: "Tesouro Direto", inst: "Tesouro Nacional", mov: [
      { data: "2026-06-30", tipo: "Saldo inicial", valor: 1720000 }, { data: "2026-07-06", tipo: "Aporte", valor: 50000 }, { data: "2026-07-31", tipo: "Rendimento", valor: 16000 },
      { data: "2026-08-06", tipo: "Aporte", valor: 50000 }, { data: "2026-08-31", tipo: "Rendimento", valor: 17000 }, { data: "2026-09-30", tipo: "Rendimento", valor: 17500 }] },
    { id: "inv-cdb", nome: "CDB Inter 110% do CDI", tipo: "CDB", inst: "Inter", mov: [
      { data: "2026-06-30", tipo: "Saldo inicial", valor: 600000 }, { data: "2026-07-31", tipo: "Rendimento", valor: 6200 }, { data: "2026-08-31", tipo: "Rendimento", valor: 6400 },
      { data: "2026-09-15", tipo: "Resgate", valor: 30000 }, { data: "2026-09-30", tipo: "Rendimento", valor: 6300 }] },
    { id: "inv-prev", nome: "Previdência PGBL · Manu", tipo: "Previdência", inst: "Bradesco", mov: [
      { data: "2026-06-30", tipo: "Saldo inicial", valor: 410000 }, { data: "2026-07-31", tipo: "Aporte", valor: 20000 }, { data: "2026-08-31", tipo: "Aporte", valor: 20000 }, { data: "2026-09-30", tipo: "Rendimento", valor: 3100 }] },
  ];
  aportes.forEach(([inv, data, valor, conta]) => {
    const id = L({ data, desc: "Aporte · " + S.invest.find(i => i.id === inv).nome, tipo: "transferencia", valor, conta, destino: inv, resp: conta === "itau" ? "João" : "Manu" });
    S.invest.find(i => i.id === inv).mov.push({ data, tipo: "Aporte", valor, lanc: id });
  });
  L({ data: "2026-09-15", desc: "Resgate · CDB Inter", tipo: "transferencia", valor: 30000, conta: "inv-cdb", destino: "nuconta", resp: "Manu" });
  S.invest.forEach(i => i.mov.sort((a, b) => a.data < b.data ? -1 : 1));

  // saldo inicial em 01/09 calculado para fechar com o saldo atual desejado
  S.contas.forEach(c => { c.saldoIni = c.alvo - netConta(S, c.id); c.dataIni = S.inicio; delete c.alvo; });

  S.importacoes = [
    { id: "#0041", data: "2026-10-05T08:12", arquivos: "extrato_itau_set.ofx", incl: 14, vinc: 3, ign: 1, user: "João" },
    { id: "#0040", data: "2026-10-02T21:40", arquivos: "fatura_inter_set.pdf, print_nubank_1.png", incl: 9, vinc: 4, ign: 2, user: "Manu" },
    { id: "#0039", data: "2026-09-29T19:05", arquivos: "fatura_pernambucanas_set.pdf", incl: 1, vinc: 1, ign: 0, user: "João" },
  ];
  S.pend = null;
  S.audit = [
    { ts: "2026-10-19T08:02", user: "João", acao: "Entrou no sistema", alvo: "Sessão", det: "Chrome · Windows" },
    { ts: "2026-10-18T22:14", user: "Manu", acao: "Alterou categoria", alvo: "Cabeleireiro", det: "Outras → Lazer" },
    { ts: "2026-10-15T19:30", user: "João", acao: "Registrou pagamento parcial", alvo: "Sabesp · água", det: "R$ 98,00 de R$ 156,40" },
    { ts: "2026-10-06T07:50", user: "João", acao: "Aporte em provisão", alvo: "IPVA 2027", det: "R$ 600,00 para Reserva IPVA" },
    { ts: "2026-10-05T08:12", user: "João", acao: "Confirmou importação", alvo: "#0041", det: "14 incluídos, 3 vinculados, 1 ignorado" },
  ];
  return S;
}
function sampleImport() {
  return { id: "#0042", arquivos: [["PNG", "print_nubank_out.png"], ["OFX", "extrato_itau_out.ofx"]], itens: [
    { d: "2026-10-17", desc: "OUTBACK STEAKHOUSE", cat: "Alimentação", v: 28660, alvo: "nubank", src: "Print", st: "dup", note: "Já existe: Outback, 17/10, R$ 286,60 no Nubank - João" },
    { d: "2026-10-18", desc: "DROGA RAIA 0231", cat: "Saúde", sub: "Farmácia", v: 5490, alvo: "nubank", src: "Print", st: "ok", note: "Categoria pela regra “DROGA”" },
    { d: "2026-10-18", desc: "IFOOD *RESTAURANTE", cat: "Alimentação", sub: "Delivery", v: 7637, alt: 7837, alvo: "nubank", src: "Print", st: "low", note: "Valor lido com baixa confiança" },
    { d: "2026-10-13", desc: "LEROY MERLIN 01/06", cat: "Casa", v: 41250, alvo: "nubank", src: "Print", st: "link", note: "Parcela 1/6 já projetada · não será recriada" },
    { d: "2026-10-18", desc: "MERCADOLIVRE*3PARC 01/03", cat: "Casa", v: 7990, n: 3, alvo: "nubank", src: "Print", st: "parc", note: "Parcelamento detectado: 3 × R$ 79,90 = R$ 239,70" },
    { d: "2026-10-05", desc: "PAG FATURA NUBANK", cat: "Transferência", v: 149255, alvo: "itau", src: "OFX", st: "link", note: "Já registrado como pagamento da fatura de outubro" },
    { d: "2026-10-18", desc: "SUPERMERCADO DIA 112", cat: "Mercado", v: 13245, alvo: "itau", src: "OFX", st: "ok", note: "Categoria pela regra “SUPERMERCADO”" },
  ] };
}

// ---------- regras de cálculo ----------
function netConta(S, id, ate = TODAY) {
  let t = 0;
  for (const l of S.lanc) {
    if (l.data > ate || l.excluido) continue;
    if (l.conta === id) t += l.tipo === "receita" ? l.valor : -l.valor;
    if (l.destino === id && l.tipo === "transferencia") t += l.valor;
  }
  return t;
}
const saldoConta = (S, c, ate = TODAY) => c.saldoIni + netConta(S, c.id, ate);
const caixa = S => sum(S.contas.filter(c => c.caixa), c => saldoConta(S, c));

// cartão: competência da fatura = mês de vencimento
const cardOf = (S, id) => S.cartoes.find(c => c.id === id);
function keyOf(card, d) { const cm = +d.slice(8, 10) < card.fecha ? ymOf(d) : addYM(ymOf(d), 1); return card.vence > card.fecha ? cm : addYM(cm, 1); }
const closeOf = (card, key) => mk(card.vence > card.fecha ? key : addYM(key, -1), card.fecha);
const dueOf = (card, key) => mk(key, card.vence);
const parcVal = (p, k) => { const base = Math.floor(p.total / p.n); return k === 1 ? p.total - base * (p.n - 1) : base; };
function fatItens(S, card, key) {
  const out = [];
  for (const l of S.lanc) if (l.cartao === card.id && !l.excluido && (l.tipo === "despesa" || l.tipo === "estorno") && keyOf(card, l.data) === key)
    out.push({ data: l.data, desc: l.desc, cat: l.cat, sub: l.sub, resp: l.resp, valor: l.tipo === "estorno" ? -l.valor : l.valor, ref: l.id, estorno: l.tipo === "estorno", estornoDe: l.estornoDe, origem: l.origem });
  for (const p of S.parc) if (p.cartao === card.id) {
    const k = ymDiff(p.k0 || keyOf(card, p.data), key) + 1;
    if (k >= 1 && k <= p.n && !(p.cancelDe && k >= p.cancelDe)) out.push({ data: p.data, desc: p.desc, cat: p.cat, sub: p.sub, resp: p.resp, valor: parcVal(p, k), parc: [k, p.n], ref: p.id, origem: "parcela" });
  }
  return out.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
}
const fatPagos = (S, card, key) => sum(S.lanc.filter(l => !l.excluido && l.tipo === "transferencia" && l.destino === card.id && l.fatura === key), l => l.valor);
function fatura(S, card, key) {
  const itens = fatItens(S, card, key), total = sum(itens, i => i.valor), pago = fatPagos(S, card, key);
  const fecha = closeOf(card, key), vence = dueOf(card, key), hist = key < keyOf(card, S.inicio);
  let status = hist ? "paga" : total <= 0 && !itens.length ? "vazia" : pago >= total && total > 0 ? "paga" : TODAY < fecha ? "aberta" : pago > 0 ? "parcial" : "fechada";
  return { card, key, itens, total, pago: hist ? total : pago, saldo: hist ? 0 : Math.max(0, total - pago), fecha, vence, status };
}
function faturasDo(S, card, from = "2026-04", to = "2028-12") { const r = []; for (let k = from; k <= to; k = addYM(k, 1)) { const f = fatura(S, card, k); if (f.itens.length || f.pago) r.push(f); } return r; }
function cardResumo(S, card) {
  const fs = faturasDo(S, card), unpaid = fs.filter(f => f.saldo > 0);
  const atual = unpaid[0] || fatura(S, card, keyOf(card, TODAY));
  const futuras = sum(unpaid.filter(f => f.key > atual.key), f => f.saldo);
  const deve = sum(unpaid, f => f.saldo);
  return { atual, futuras, deve, disponivel: card.limite - deve, abertas: unpaid };
}

// compromissos: recorrências, parcelas de dívidas, faturas e lançamentos manuais
function compStatus(c) {
  if (c.cancel) return "cancelada";
  if (c.reag) return c.reag;
  if (c.restante <= 0) return "paga";
  if (c.pago > 0) return "parcial";
  return ymOf(c.venc) <= CUR ? "pendente" : "prevista";
}
function compromissos(S, from, to) {
  const out = [];
  for (let ym = from; ym <= to; ym = addYM(ym, 1)) {
    for (const r of S.rec) {
      if (ym < r.inicio || (r.fim && ym > r.fim) || ym < ymOf(S.inicio)) continue;
      const k = r.id + "|" + ym, i = S.inst[k] || {}, valor = i.valor ?? r.valor, pago = sum(i.pag || [], p => p.valor), desc = i.desconto || 0;
      const c = { key: k, kind: "rec", ref: r, desc: r.desc, cat: r.cat, sub: r.sub, tipo: r.tipo, valor, pago, desconto: desc, restante: valor - desc - pago, venc: i.venc || mk(ym, r.dia), origem: r.tipo === "receita" ? "receita recorrente" : "recorrência", estimado: !i.valor && r.natureza === "Variável", inst: i, conta: r.conta, resp: r.resp };
      c.status = compStatus(Object.assign({}, c, i)); if (r.tipo === "receita" && c.status === "paga") c.status = "recebida";
      out.push(c);
    }
    for (const d of S.dividas) {
      const n = ymDiff(d.primeiro, ym) + 1; if (n < 1 || n > d.total || ym < ymOf(S.inicio)) continue;
      const k = d.id + "|" + ym, i = S.inst[k] || {}, valor = i.valor ?? d.parcela, pago = sum(i.pag || [], p => p.valor), desc = i.desconto || 0;
      const c = { key: k, kind: "div", ref: d, desc: d.nome + " " + n + "/" + d.total, cat: "Dívidas", tipo: "despesa", valor, pago, desconto: desc, restante: valor - desc - pago, venc: i.venc || mk(ym, d.dia), origem: "dívida", inst: i, conta: d.conta };
      c.status = compStatus(Object.assign({}, c, i)); out.push(c);
    }
    for (const card of S.cartoes) {
      const f = fatura(S, card, ym); if (!f.itens.length || ym < keyOf(card, S.inicio)) continue;
      const c = { key: "fat|" + card.id + "|" + ym, kind: "fat", ref: f, desc: "Fatura " + card.nome, cat: "Cartão", tipo: "despesa", valor: f.total, pago: f.pago, desconto: 0, restante: f.saldo, venc: f.vence, origem: "fatura " + f.status, conta: card.pagaCom };
      c.status = f.status === "paga" ? "paga" : f.pago > 0 ? "parcial" : ymOf(f.vence) <= CUR ? "pendente" : "prevista";
      out.push(c);
    }
  }
  for (const m of S.manuais) {
    if (ymOf(m.venc) < from || ymOf(m.venc) > to) continue;
    const pago = sum(m.pag || [], p => p.valor), desc = m.desconto || 0;
    const c = { key: m.id, kind: "man", ref: m, desc: m.desc, cat: m.cat, tipo: "despesa", valor: m.valor, pago, desconto: desc, restante: m.valor - desc - pago, venc: m.venc, origem: m.origem, inst: m, conta: m.conta };
    c.status = compStatus(Object.assign({}, c, m)); out.push(c);
  }
  return out.sort((a, b) => a.venc < b.venc ? -1 : a.venc > b.venc ? 1 : 0);
}
const ativo = c => !["paga", "cancelada", "recebida", "reagendada", "renegociada"].includes(c.status);

// saldo livre estimado (R8–R10)
function saldoLivre(S, horizonte) {
  const cx = caixa(S);
  const comps = compromissos(S, ymOf(S.inicio), ymOf(horizonte)).filter(c => c.tipo === "despesa" && ativo(c) && c.venc <= horizonte && c.restante > 0);
  const comprometido = sum(comps, c => c.restante);
  const provs = S.provisoes.filter(p => !p.conta && p.reservado > 0);
  const prov = sum(provs, p => p.reservado);
  const receitas = compromissos(S, CUR, ymOf(horizonte)).filter(c => c.tipo === "receita" && ativo(c) && c.venc <= horizonte);
  return { caixa: cx, comps, comprometido, provs, prov, livre: cx - comprometido - prov, receitas, aReceber: sum(receitas, r => r.restante) };
}
const provReservado = (S, p) => p.conta ? saldoConta(S, S.contas.find(c => c.id === p.conta)) : p.reservado;
function investSaldo(i, ate = "9999") { let s = 0; for (const m of i.mov) { if (m.data > ate) continue; s += m.tipo === "Resgate" ? -m.valor : m.valor; } return s; }
const investAportado = i => sum(i.mov, m => m.tipo === "Saldo inicial" || m.tipo === "Aporte" ? m.valor : m.tipo === "Resgate" ? -m.valor : 0);
const investRend = i => sum(i.mov.filter(m => m.tipo === "Rendimento"), m => m.valor);

// gastos por categoria no mês (cartão pela fatura do mês, conta pela data)
function gastosMes(S, ym) {
  const rows = [];
  for (const l of S.lanc) if (!l.excluido && l.conta && !l.cartao && l.tipo === "despesa" && ymOf(l.data) === ym && !String(l.conta).startsWith("inv")) rows.push({ cat: l.cat, valor: l.valor, l });
  for (const c of S.cartoes) for (const i of fatura(S, c, ym).itens) rows.push({ cat: i.cat, valor: i.valor, i, card: c });
  return rows;
}
const receitasMes = (S, ym) => sum(S.lanc.filter(l => !l.excluido && l.tipo === "receita" && ymOf(l.data) === ym), l => l.valor);

// projeção 12 meses (inclui receitas previstas; não são transações)
function projecao(S, varMes) {
  const base = saldoLivre(S, mk(CUR, 31)), out = [];
  let s = base.livre + base.aReceber;
  for (let k = 1; k <= 12; k++) {
    const ym = addYM(CUR, k), comps = compromissos(S, ym, ym);
    const rec = sum(comps.filter(c => c.tipo === "receita" && c.status !== "cancelada"), c => c.restante);
    const fixas = sum(comps.filter(c => c.kind === "rec" && c.tipo === "despesa" && ativo(c)), c => c.restante) + sum(comps.filter(c => c.kind === "man" && ativo(c)), c => c.restante);
    const div = sum(comps.filter(c => c.kind === "div" && ativo(c)), c => c.restante);
    const fat = sum(comps.filter(c => c.kind === "fat" && ativo(c)), c => c.restante);
    const variaveis = k === 1 ? Math.round(varMes / 2) : varMes; // em novembro metade das compras novas já está na fatura de nov.
    s = s + rec - fixas - div - fat - variaveis;
    out.push({ ym, rec, fixas, div, fat, variaveis, fim: s });
  }
  return { inicio: base.livre + base.aReceber, meses: out };
}

// simulador de quitação
function simular(S, orcamento, estrategia) {
  const ds = S.dividas.filter(d => d.saldo > 0).map(d => ({ id: d.id, nome: d.nome, saldo: d.saldo, taxa: d.taxa, min: d.parcela, quita: null, juros: 0 }));
  let mes = 0, insuf = false;
  const minTot = sum(ds, d => d.min);
  if (orcamento < minTot) insuf = true;
  while (ds.some(d => d.saldo > 0) && mes < 600) {
    mes++;
    let caixaM = orcamento;
    for (const d of ds) if (d.saldo > 0 && d.taxa) { const j = Math.round(d.saldo * d.taxa / 100); d.saldo += j; d.juros += j; }
    for (const d of ds) if (d.saldo > 0) { const p = Math.min(d.min, d.saldo, caixaM); d.saldo -= p; caixaM -= p; }
    const ordem = ds.filter(d => d.saldo > 0).sort(estrategia === "juros" ? (a, b) => (b.taxa || 0) - (a.taxa || 0) || a.saldo - b.saldo : (a, b) => a.saldo - b.saldo);
    for (const d of ordem) { const p = Math.min(d.saldo, caixaM); d.saldo -= p; caixaM -= p; }
    for (const d of ds) if (d.saldo <= 0 && d.quita === null) d.quita = mes;
    if (insuf && mes > 360) break;
  }
  return { ds, meses: mes, juros: sum(ds, d => d.juros), insuf, minTot };
}

// sugestão de categoria pelas regras explícitas
function sugerirCat(S, desc) { const n = norm(desc); const r = [...S.regras].sort((a, b) => a.prio - b.prio).find(r => n.includes(norm(r.trecho))); return r ? { cat: r.cat, sub: r.sub, regra: r.trecho } : null; }

if (typeof module !== "undefined") module.exports = { vazio, rid, parcVal, fatItens, ativo, sugerirCat, closeOf, dueOf, parseBRL, norm, ymOf, ymDiff, addDays, investAportado, investRend, netConta, seed, saldoLivre, cardResumo, fatura, cardOf, caixa, compromissos, projecao, simular, gastosMes, saldoConta, investSaldo, keyOf, fmt, TODAY, CUR, mk, addYM, receitasMes, provReservado };
