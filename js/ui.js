// ================= INTERFACE =================
let S = null, SB = null, FAM = null, ME = null;
const save = () => { if (!(S && FAM && ui.screen === "app")) return; if (somenteLeitura()) return descartarLeitura(); DB.sync(S); };
// devolve "revertido" quando o modo consulta desfez uma alteração
// acesso vencido ou administrador geral olhando outra família: pode consultar e exportar, nada é gravado
const somenteLeitura = () => ui.screen === "app" && (!!ui.adminVendo || !!(ui.acesso && ui.acesso.status === "vencido"));
const msgLeitura = () => ui.adminVendo ? "Você está vendo outra família como administrador geral. Nada é alterado aqui." : `Seu acesso venceu${ui.acesso && ui.acesso.valido_ate ? " em " + br(ui.acesso.valido_ate) : ""}. Você pode consultar e exportar; para lançar, peça a renovação a João Lucas ou Emanoella.`;
// formulários que não alteram dados e continuam valendo no modo consulta
const FORMS_LEITURA = new Set(["periodo", "senha", "mfaok"]);
function descartarLeitura() {
  S.audit.forEach(a => a._s = 1);
  if (!DB.temMudanca(S)) return;
  setTimeout(() => toast(msgLeitura()), 0);
  DB.carregar(FAM, S.user).then(n => { S = n; render(); }).catch(() => {});
  return "revertido";
}

const ui = { screen: "carregando", msg: "", view: "painel", hz: "mes", lf: { mes: CUR, conta: "", cat: "", resp: "", tipo: "", q: "" }, card: null, cardKey: null, compMes: CUR, compTab: "pagar", plan: "previsto", varMes: null, simOrc: null, aj: "contas", more: false, userMenu: false, impDone: null, salvando: "ok", membros: [], convites: [], fatores: null, enroll: null };
try { const h = location.hash.slice(1); if (/^[a-z]+$/.test(h)) ui.view = h; } catch (e) {}

const nowTs = () => { const d = new Date(); return TODAY + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const tsBr = ts => { if (!ts) return "—"; if (ts.length > 16 && /[Z+]/.test(ts.slice(16))) { const d = new Date(ts); return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d).replace(",", ""); } return br(ts.slice(0, 10)) + " " + ts.slice(11, 16); };
function audit(acao, alvo, det = "", ref = null) { S.audit.unshift({ ts: nowTs(), user: S.user, acao, alvo, det, ref }); }
const uid = p => rid(p);
const nomeDe = id => { if (!id) return "—"; const c = S.contas.find(x => x.id === id) || S.cartoes.find(x => x.id === id) || S.invest.find(x => x.id === id); return c ? c.nome : id; };
const catsDesp = () => S.categorias.filter(c => c[1] !== "receita").map(c => c[0]);
const catsRec = () => S.categorias.filter(c => c[1] === "receita").map(c => c[0]);
const opts = (arr, sel) => arr.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`; }).join("");
const VIEWS = [["painel", "Painel"], ["lancamentos", "Lançamentos"], ["cartoes", "Cartões"], ["contas", "Contas a pagar"], ["planejamento", "Planejamento"], ["dividas", "Dívidas e provisões"], ["investimentos", "Investimentos"], ["importar", "Importar"], ["ajustes", "Configurações"]];
if (!VIEWS.some(v => v[0] === ui.view)) ui.view = "painel";

const IC = {
  painel: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>',
  lancamentos: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  cartoes: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  contas: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16M8 14h3M8 17h6"/>',
  planejamento: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>',
  dividas: '<path d="M12 3v18M17 7.5C17 5.6 14.8 4.5 12 4.5S7 5.6 7 7.5s2.2 3 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3"/>',
  investimentos: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  importar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  mais: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

const PILL = { prevista: ["p-info", "Prevista"], pendente: ["p-warn", "Pendente"], parcial: ["p-crit", "Parcialmente paga"], paga: ["p-good", "Paga"], recebida: ["p-good", "Recebida"], cancelada: ["p-mute", "Cancelada"], reagendada: ["p-mute", "Reagendada"], renegociada: ["p-mute", "Renegociada"], aberta: ["p-info", "Aberta"], fechada: ["p-warn", "Fechada"], vazia: ["p-mute", "Sem lançamentos"] };
const pill = (s, extra = "") => { const [c, l] = PILL[s] || ["p-mute", s]; return `<span class="pill ${c}">${l}${extra}</span>`; };

// ---------- horizonte do saldo livre ----------
const HZ = { mes: ["Até o fim do mês", () => mk(CUR, 31)], d30: ["Próximos 30 dias", () => addDays(TODAY, 30)], d60: ["Próximos 60 dias", () => addDays(TODAY, 60)], d90: ["Próximos 90 dias", () => addDays(TODAY, 90)], periodo: ["Período personalizado", () => ui.hzFim] };
ui.hzIni = TODAY; ui.hzFim = mk(addYM(CUR, 1), 31);
const hzIni = () => ui.hz === "periodo" ? ui.hzIni : TODAY;
const hzTexto = () => ui.hz === "periodo" ? `de ${br(ui.hzIni)} a ${br(ui.hzFim)}` : `até ${br(hzDate())}`;
const hzDate = () => HZ[ui.hz][1]();

// ---------- gráficos ----------
function barChart(data, { h = 220, money = true, onClick = "", hi = 0 } = {}) {
  if (!data.length) return `<p class="note">Sem dados para o gráfico ainda.</p>`;
  hi = Math.min(Math.max(0, hi), data.length - 1);
  const W = 760, L = 64, R = 12, T = 22, B = 30;
  const vals = data.map(d => d.v), max0 = Math.max(1, ...vals), min0 = Math.min(0, ...vals);
  const step = niceStep((max0 - min0) / 4), max = Math.ceil(max0 / step) * step, min = Math.floor(min0 / step) * step;
  const x = i => L + (i + .5) * (W - L - R) / data.length, bw = Math.min(46, (W - L - R) / data.length * .6);
  const y = v => T + (max - v) / (max - min) * (h - T - B);
  let s = `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="Gráfico de barras">`;
  for (let t = min; t <= max + 1; t += step) s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${money ? fmtK(t).replace("R$ ", "") : t}</text>`;
  data.forEach((d, i) => {
    const top = y(Math.max(0, d.v)), bot = y(Math.min(0, d.v));
    s += `<g ${onClick ? `data-act="${onClick}" data-arg="${esc(d.k)}" class="clk"` : ""}><rect x="${x(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(1, bot - top)}" rx="3" fill="${d.v < 0 ? "var(--crit)" : "var(--accent)"}" opacity="${i === hi ? 1 : .5}"><title>${esc(d.l)}: ${fmt(d.v)}</title></rect><text x="${x(i)}" y="${h - 10}" text-anchor="middle">${esc(d.l)}</text></g>`;
  });
  [hi, data.length - 1].filter((v, i, a) => a.indexOf(v) === i).forEach(i => { const d = data[i]; s += `<text x="${x(i)}" y="${y(Math.max(0, d.v)) - 7}" text-anchor="middle" class="lbl">${fmtK(d.v)}</text>`; });
  return s + "</svg>";
}
function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function groupChart(groups, series) {
  const W = 760, h = 220, L = 64, R = 12, T = 18, B = 30, max0 = Math.max(1, ...groups.flatMap(g => g.v)), step = niceStep(max0 / 4), max = Math.ceil(max0 / step) * step;
  const gw = (W - L - R) / groups.length, bw = Math.min(40, gw * .3), y = v => T + (max - v) / max * (h - T - B);
  let s = `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="Receitas e despesas por mês">`;
  for (let t = 0; t <= max; t += step) s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fmtK(t).replace("R$ ", "")}</text>`;
  groups.forEach((g, gi) => {
    const cx = L + gw * (gi + .5);
    g.v.forEach((v, si) => { const bx = cx + (si - (g.v.length - 1) / 2) * (bw + 6) - bw / 2; s += `<rect x="${bx}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="3" fill="${series[si].c}"><title>${esc(g.l)} · ${series[si].n}: ${fmt(v)}</title></rect><text x="${bx + bw / 2}" y="${y(v) - 6}" text-anchor="middle" class="lbl">${fmtK(v).replace("R$ ", "")}</text>`; });
    s += `<text x="${cx}" y="${h - 10}" text-anchor="middle">${esc(g.l)}</text>`;
  });
  return s + "</svg>";
}
function lineChart(points) {
  const W = 760, h = 200, L = 72, R = 20, T = 20, B = 30, vals = points.map(p => p.v);
  const lo0 = Math.min(...vals), hi0 = Math.max(...vals), step = niceStep((hi0 - lo0) / 3 || hi0 / 4), lo = Math.floor(lo0 / step) * step - step, hi = Math.ceil(hi0 / step) * step;
  const x = i => L + i * (W - L - R) / (points.length - 1), y = v => T + (hi - v) / (hi - lo) * (h - T - B);
  let s = `<svg viewBox="0 0 ${W} ${h}" role="img" aria-label="Evolução do patrimônio investido">`;
  for (let t = lo; t <= hi; t += step) s += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${fmtK(t).replace("R$ ", "")}</text>`;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.v)}`).join("");
  s += `<path d="${path} L${x(points.length - 1)} ${y(lo)} L${x(0)} ${y(lo)}Z" fill="var(--accent)" opacity=".1"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>`;
  points.forEach((p, i) => { s += `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === points.length - 1 ? 4.5 : 3}" fill="var(--accent)"><title>${p.l}: ${fmt(p.v)}</title></circle><text x="${x(i)}" y="${h - 10}" text-anchor="middle">${p.l}</text>`; });
  const lp = points[points.length - 1]; s += `<text x="${x(points.length - 1)}" y="${y(lp.v) - 10}" text-anchor="end" class="lbl">${fmt(lp.v)}</text>`;
  return s + "</svg>";
}
const hbars = (rows, act) => { const m = Math.max(1, ...rows.map(r => r.v)); return rows.map(r => `<button class="cat" ${act ? `data-act="${act}" data-arg="${esc(r.k)}"` : ""}><span class="cat-n">${esc(r.l)}</span><span class="bar"><span class="a" style="width:${(Math.max(0, r.v) / m * 100).toFixed(1)}%"></span></span><span class="num">${fmt(r.v)}</span></button>`).join(""); };

// ---------- moldura ----------
function topbar(title, sub = "") {
  return `<header class="topbar"><div class="tt"><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
    <label class="search">${icon("busca")}<input id="busca" type="search" placeholder="Buscar lançamentos" aria-label="Buscar lançamentos" value="${esc(ui.lf.q)}"></label>
    <button class="btn primary" data-act="novo">+ Lançamento</button>
    <div class="user"><button class="avatar" data-act="usermenu" aria-label="Menu do usuário">${S.user[0]}</button>${ui.userMenu ? `<div class="menu"><div class="sub">Conectado como <b>${esc(S.user)}</b><br>${esc(ME ? ME.email : "")}<br>${ME && ME.papel === "admin" ? "Administrador" : "Membro"}</div><button data-go="ajustes" data-aj="seguranca">Segurança</button><button data-act="sair">Sair</button></div>` : ""}</div></header>`;
}
const head = (h2, right = "") => `<div class="panel-head"><h2>${h2}</h2>${right}</div>`;

// ================= TELAS =================
function vPainel() {
  const sl = saldoLivre(S, hzDate()), res = S.cartoes.map(c => ({ c, r: cardResumo(S, c) }));
  const devCart = sum(res, x => x.r.deve), divSaldo = sum(S.dividas, d => d.saldo), patr = sum(S.invest, i => investSaldo(i));
  const recPrev = sum(compromissos(S, CUR, CUR).filter(c => c.tipo === "receita"), c => c.valor), recReal = receitasMes(S, CUR);
  const pagoMes = sum(S.lanc.filter(l => !l.excluido && ymOf(l.data) === CUR && ((l.tipo === "despesa" && !l.cartao) || (l.tipo === "transferencia" && S.cartoes.some(c => c.id === l.destino)))), l => l.valor);
  const contasPend = sum(sl.comps.filter(c => c.kind !== "fat"), c => c.restante), fatAbertas = sum(res, x => x.r.atual.saldo), futuras = sum(res, x => x.r.futuras), reservado = sum(S.provisoes, p => provReservado(S, p));
  const maxL = Math.max(1, ...S.cartoes.map(c => c.limite));
  const gm = {}; gastosMes(S, CUR).forEach(r => gm[r.cat] = (gm[r.cat] || 0) + r.valor);
  const cats = Object.entries(gm).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ k, l: k, v }));
  const proj = projecao(S, ui.varMes);
  const prox = compromissos(S, CUR, addYM(CUR, 1)).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0).slice(0, 7);
  const meses = [addYM(CUR, -1), CUR].map(ym => ({ l: ymLabel(ym) + (ym === CUR ? " (até hoje)" : ""), v: [receitasMes(S, ym), sum(gastosMes(S, ym), r => r.valor)] }));
  const passos = [[S.contas.length > 0, "Cadastre as contas e o dinheiro em espécie", "ajustes", "contas"], [S.cartoes.length > 0, "Cadastre os cartões com fechamento e vencimento", "ajustes", "cartoes"], [S.rec.length > 0, "Registre as contas fixas e os salários", "contas", "rec"], [S.lanc.length > 0 || S.parc.length > 0, "Importe um extrato ou fatura (CSV/OFX)", "importar", ""]];
  const bemvindo = passos.every(p => p[0]) ? "" : `<section class="panel start">${head("Primeiros passos", `<span class="hint">${passos.filter(p => p[0]).length} de ${passos.length}</span>`)}<ol class="steps">${passos.map(([ok, t, v, a]) => `<li class="${ok ? "ok" : ""}"><span>${t}</span>${ok ? '<span class="pill p-good">Feito</span>' : `<button class="mini primary" data-go="${v}" ${v === "ajustes" ? `data-aj="${a}"` : ""} ${v === "contas" ? 'data-act="comptab" data-arg="rec"' : ""}>Fazer agora</button>`}</li>`).join("")}</ol></section>`;
  return `${topbar("Painel", "Hoje, " + br(TODAY))}${bemvindo}
  <section class="kpis" aria-label="Indicadores principais">
    <div class="kpi hero">
      <div class="hero-top"><span class="eyebrow">Saldo livre estimado</span><select id="hz" aria-label="Período">${opts(Object.entries(HZ).map(([k, v]) => [k, v[0]]), ui.hz)}</select></div>
      ${ui.hz === "periodo" ? `<form class="hz-form" data-form="periodo"><label class="sr" for="hz-ini">Data inicial</label><input id="hz-ini" name="ini" type="date" value="${ui.hzIni}" required><span>a</span><label class="sr" for="hz-fim">Data final</label><input id="hz-fim" name="fim" type="date" value="${ui.hzFim}" required><button class="mini primary">Aplicar</button></form>` : ""}
      <button class="v num" data-calc="livre">${fmt(sl.livre)}</button>
      <span class="s">Quanto dá para gastar ${hzTexto()} sem faltar para os compromissos${ui.hz === "periodo" && ui.hzIni > TODAY ? " do período e os que vencem antes dele" : ""}. Não conta os ${fmt(sl.aReceber)} que ainda vão entrar.${ui.hz === "periodo" && ui.hzFim < TODAY ? " <b>Período já encerrado:</b> só entram contas que ficaram sem pagar. Para ver o que aconteceu, use Planejamento → Realizado." : ""}</span>
      <button class="how" data-calc="livre">Ver memória de cálculo →</button>
    </div>
    <button class="kpi" data-calc="caixa"><span class="eyebrow">Saldo de caixa</span><span class="v num">${fmt(sl.caixa)}</span><span class="s">${S.contas.filter(c => c.caixa).length} contas disponíveis</span></button>
    <button class="kpi" data-calc="comp"><span class="eyebrow">Comprometido</span><span class="v num">${fmt(sl.comprometido)}</span><span class="s">${sl.comps.length} compromissos até ${br(hzDate())}</span></button>
    <button class="kpi" data-go="cartoes"><span class="eyebrow">Devemos nos cartões</span><span class="v num">${fmt(devCart)}</span><span class="s">Faturas + parcelas futuras</span></button>
    <button class="kpi" data-calc="receitas"><span class="eyebrow">Receitas de ${MESL[+CUR.slice(5) - 1]}</span><span class="v num">${fmt(recReal)}</span><span class="s">de ${fmt(recPrev)} previstas</span></button>
    <button class="kpi" data-go="dividas"><span class="eyebrow">Saldo devedor das dívidas</span><span class="v num">${fmt(divSaldo)}</span><span class="s">${S.dividas.length} dívidas ativas</span></button>
    <button class="kpi" data-go="investimentos"><span class="eyebrow">Patrimônio investido</span><span class="v num">${fmt(patr)}</span><span class="s">Valores informados</span></button>
  </section>
  <section class="strip" aria-label="Outros indicadores">
    <button data-calc="pago"><span>Pago no mês</span><b class="num">${fmt(pagoMes)}</b></button>
    <button data-go="contas"><span>Contas pendentes</span><b class="num">${fmt(contasPend)}</b></button>
    <button data-go="cartoes"><span>Faturas em aberto</span><b class="num">${fmt(fatAbertas)}</b></button>
    <button data-go="cartoes"><span>Parcelas futuras</span><b class="num">${fmt(futuras)}</b></button>
    <button data-go="dividas"><span>Reservado em provisões</span><b class="num">${fmt(reservado)}</b></button>
  </section>
  <div class="grid2">
    <section class="panel">
      ${head("Cartões de crédito", `<span class="hint">Barra no tamanho do limite</span>`)}
      <div class="cards">${res.length ? "" : `<p class="note">Nenhum cartão cadastrado. <button class="linkbtn" data-go="ajustes" data-aj="cartoes">Cadastrar cartão</button></p>`}${res.map(({ c, r }) => `
        <button class="cardrow" data-go="cartoes" data-card="${c.id}">
          <span class="cr-n"><b>${esc(c.nome)}</b><span class="meta">Fatura ${ymLabel(r.atual.key)} ${pill(r.atual.status)} · vence ${brs(r.atual.vence)}</span></span>
          <span class="barcell"><span class="bar" style="width:${(c.limite / maxL * 100).toFixed(1)}%"><span class="a" style="width:${(r.atual.saldo / c.limite * 100).toFixed(1)}%"></span><span class="b" style="width:${(r.futuras / c.limite * 100).toFixed(1)}%"></span></span>
            <span class="meta">Disponível estimado ${fmt(r.disponivel)} de ${fmt(c.limite)}</span></span>
          <span class="amt"><b class="num">${fmt(r.atual.saldo)}</b><span class="meta num">+ ${fmt(r.futuras)} futuras</span></span>
        </button>`).join("")}</div>
      <div class="legend"><span><i></i>Fatura atual</span><span><i class="b"></i>Parcelas e faturas seguintes</span></div>
    </section>
    <section class="panel">
      ${head("Próximos compromissos", `<button class="mini" data-go="contas">Contas a pagar</button>`)}
      <div class="list">${prox.length ? "" : `<p class="note">Nada pendente nos próximos dois meses.</p>`}${prox.map(c => `<div class="li"><span class="d num">${brs(c.venc)}</span><span class="t">${esc(c.desc)}${c.venc < TODAY ? ' <span class="pill p-crit">Vencida</span>' : ""}<span class="sub">${c.status === "parcial" ? "restante de " + fmt(c.valor) : c.origem}</span></span><span class="num">${fmt(c.restante)}</span></div>`).join("")}</div>
    </section>
  </div>
  <div class="grid2">
    <section class="panel">
      ${head("Gastos por categoria · " + MESL[+CUR.slice(5) - 1], `<span class="hint">Cartão pela fatura do mês</span>`)}
      ${cats.length ? hbars(cats, "catmes") : `<p class="note">Nenhum gasto registrado neste mês.</p>`}
    </section>
    <section class="panel chart">
      ${head("Receitas × gastos", `<span class="legend inl"><span><i></i>Receitas</span><span><i class="c2"></i>Gastos</span></span>`)}
      ${groupChart(meses, [{ n: "Receitas", c: "var(--accent)" }, { n: "Gastos", c: "var(--c2)" }])}
    </section>
  </div>
  <section class="panel chart">
    ${head("Saldo livre projetado · próximos 12 meses", `<span class="hint">Inclui receitas previstas e ${fmt(ui.varMes)}/mês de gastos variáveis estimados</span>`)}
    ${barChart(proj.meses.map(m => ({ k: m.ym, l: ymLabel(m.ym).slice(0, 3), v: m.fim })), { onClick: "projmes" })}
  </section>`;
}

// ---------- lançamentos ----------
function linhas(ym) {
  const out = [];
  for (const l of S.lanc) {
    if (l.excluido || l.cartao) continue;
    if (ym !== "todos" && ymOf(l.data) !== ym) continue;
    const signed = l.tipo === "receita" ? l.valor : l.tipo === "transferencia" ? 0 : -l.valor;
    out.push({ id: l.id, data: l.data, desc: l.desc, tipo: l.tipo, valor: l.valor, signed, cat: l.tipo === "transferencia" ? "Transferência" : l.cat, sub: l.sub, conta: l.conta, contaN: l.tipo === "transferencia" ? nomeDe(l.conta) + " → " + nomeDe(l.destino) : nomeDe(l.conta), resp: l.resp, origem: l.origem });
  }
  for (const c of S.cartoes) {
    const keys = ym === "todos" ? faturasDo(S, c, ymOf(S.inicio), addYM(CUR, 2)).map(f => f.key) : [ym];
    for (const k of keys) for (const i of fatura(S, c, k).itens)
      out.push({ id: i.ref, data: i.data, desc: i.desc, tipo: i.estorno ? "estorno" : "despesa", valor: Math.abs(i.valor), signed: -i.valor, cat: i.cat, sub: i.sub, conta: c.id, contaN: c.nome + " · fatura " + ymLabel(k), resp: i.resp, origem: i.origem, parc: i.parc });
  }
  return out.sort((a, b) => a.data > b.data ? -1 : a.data < b.data ? 1 : 0);
}
function vLanc() {
  const f = ui.lf, ym = f.q ? "todos" : f.mes;
  let rows = linhas(ym);
  if (f.conta) rows = rows.filter(r => r.conta === f.conta || (r.tipo === "transferencia" && S.lanc.find(l => l.id === r.id)?.destino === f.conta));
  if (f.cat) rows = rows.filter(r => r.cat === f.cat);
  if (f.resp) rows = rows.filter(r => r.resp === f.resp);
  if (f.tipo) rows = rows.filter(r => f.tipo === "despesa" ? (r.tipo === "despesa" || r.tipo === "estorno") : r.tipo === f.tipo);
  if (f.q) { const q = norm(f.q); rows = rows.filter(r => norm(r.desc + " " + r.cat + " " + r.contaN).includes(q)); }
  const rec = sum(rows.filter(r => r.tipo === "receita"), r => r.valor), desp = -sum(rows.filter(r => r.tipo === "despesa" || r.tipo === "estorno"), r => r.signed), tr = rows.filter(r => r.tipo === "transferencia").length;
  const meses = []; for (let m = primeiroMes(); m <= addYM(CUR, 3); m = addYM(m, 1)) meses.push([m, ymLabel(m)]);
  const contasOpt = [["", "Todas as contas e cartões"], ...S.contas.map(c => [c.id, c.nome]), ...S.cartoes.map(c => [c.id, c.nome])];
  return `${topbar("Lançamentos", f.q ? `Resultado da busca por “${esc(f.q)}” em todos os meses` : "Cartão pela fatura do mês · contas pela data")}
  <section class="filters">
    <select id="f-mes" aria-label="Mês" ${f.q ? "disabled" : ""}>${opts(meses, f.mes)}</select>
    <select id="f-conta" aria-label="Conta ou cartão">${opts(contasOpt, f.conta)}</select>
    <select id="f-cat" aria-label="Categoria">${opts([["", "Todas as categorias"], ...S.categorias.map(c => c[0]), "Transferência"], f.cat)}</select>
    <select id="f-resp" aria-label="Responsável">${opts([["", "Todas as pessoas"], ...S.pessoas.map(p => p.nome), "Casa"], f.resp)}</select>
    <select id="f-tipo" aria-label="Tipo">${opts([["", "Todos os tipos"], ["despesa", "Despesas e estornos"], ["receita", "Receitas"], ["transferencia", "Transferências"]], f.tipo)}</select>
    ${f.q || f.conta || f.cat || f.resp || f.tipo ? `<button class="mini" data-act="limpar">Limpar filtros</button>` : ""}
  </section>
  <section class="totals">
    <div><span>Receitas</span><b class="num pos">${fmt(rec)}</b></div><div><span>Despesas</span><b class="num">${fmt(desp)}</b></div><div><span>Resultado</span><b class="num">${fmt(rec - desp)}</b></div><div><span>Transferências</span><b class="num">${tr}</b><span class="sub">não entram no resultado</span></div>
  </section>
  <section class="panel flush">
    ${rows.length ? `<div class="tbl-wrap"><table class="rows">
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta ou cartão</th><th>Resp.</th><th>Origem</th><th class="r">Valor</th></tr></thead>
      <tbody>${rows.map(r => `<tr data-open="${r.id}" tabindex="0"><td class="num">${brs(r.data)}</td><td>${esc(r.desc)}${r.parc ? `<span class="tag-parc">${pad(r.parc[0])}/${pad(r.parc[1])}</span>` : ""}${r.tipo === "estorno" ? ' <span class="pill p-good">Estorno</span>' : ""}</td><td>${esc(r.cat)}${r.sub ? `<span class="sub"> · ${esc(r.sub)}</span>` : ""}</td><td class="sub">${esc(r.contaN)}</td><td>${esc(r.resp)}</td><td class="sub">${esc(r.origem)}</td><td class="r num ${r.tipo === "receita" ? "pos" : r.tipo === "estorno" ? "pos" : r.tipo === "transferencia" ? "muted" : ""}">${r.tipo === "transferencia" ? "↔ " + fmt(r.valor) : fmt(r.signed)}</td></tr>`).join("")}</tbody>
    </table></div>` : `<div class="empty"><b>Nenhum lançamento encontrado</b><span>Ajuste os filtros ou registre um novo lançamento.</span><button class="btn" data-act="limpar">Limpar filtros</button></div>`}
  </section>`;
}

// ---------- cartões ----------
// mês mais antigo com algum lançamento (compras importadas de meses antes do início do controle)
function primeiroMes() { let m = ymOf(S.inicio); for (const l of S.lanc) if (!l.excluido && l.data && ymOf(l.data) < m) m = ymOf(l.data); for (const p of S.parc) if (p.data && ymOf(p.data) < m) m = ymOf(p.data); return m; }
// faturas com movimento + a atual e as 2 seguintes (mesmo vazias), para cartão sem compras não ficar sem tela
function faturasTela(card, r = cardResumo(S, card)) {
  let de = ymOf(S.inicio) < r.atual.key ? ymOf(S.inicio) : r.atual.key;
  for (const l of S.lanc) if (l.cartao === card.id && !l.excluido && l.data) { const k = l.fatura || keyOf(card, l.data); if (k < de) de = k; }
  for (const p of S.parc) if (p.cartao === card.id) { const k = p.k0 || keyOf(card, p.data); if (k < de) de = k; }
  const fs = [];
  for (let k = de; k <= "2028-12"; k = addYM(k, 1)) { const fx = fatura(S, card, k); if (fx.itens.length || fx.pago || (k >= r.atual.key && k <= addYM(r.atual.key, 2))) fs.push(fx); }
  return fs;
}
function vCartoes() {
  if (!S.cartoes.length) return `${topbar("Cartões")}<section class="panel empty"><b>Nenhum cartão cadastrado</b><span>Cadastre o cartão com o dia de fechamento e de vencimento. A partir daí, cada compra cai na fatura certa.</span><button class="btn primary" data-act="novocartao">Cadastrar cartão</button></section>`;
  const card = cardOf(S, ui.card) || S.cartoes[0], r = cardResumo(S, card);
  const fs = faturasTela(card, r);
  if (!ui.cardKey || !fs.some(f => f.key === ui.cardKey)) ui.cardKey = r.atual.key;
  const f = fatura(S, card, ui.cardKey), idx = fs.findIndex(x => x.key === f.key);
  const pags = S.lanc.filter(l => !l.excluido && l.tipo === "transferencia" && l.destino === card.id && l.fatura === f.key);
  const parcs = S.parc.filter(p => p.cartao === card.id).map(p => { const k = ymDiff(p.k0 || keyOf(card, p.data), r.atual.key) + 1; return { p, k, rest: p.n - Math.max(0, Math.min(p.n, k)) }; }).filter(x => x.k <= x.p.n && !(x.p.cancelDe && x.k >= x.p.cancelDe));
  const evo = fs.map(x => ({ k: x.key, l: ymLabel(x.key).slice(0, 3), v: x.total }));
  return `${topbar("Cartões", "Faturas por ciclo · competência pelo mês de vencimento")}
  <div class="tabs" role="tablist">${S.cartoes.map(c => { const rr = cardResumo(S, c); return `<button class="tab" role="tab" aria-selected="${c.id === card.id}" data-card="${c.id}"><b>${esc(c.nome)}</b><span class="num">${fmt(rr.deve)} a pagar</span></button>`; }).join("")}<button class="tab add" data-go="ajustes" data-aj="cartoes">+ Cartão</button></div>
  <section class="facts">
    <div><span class="eyebrow">Limite</span><b class="num">${fmt(card.limite)}</b></div>
    <div><span class="eyebrow">Disponível estimado</span><b class="num">${fmt(r.disponivel)}</b></div>
    <div><span class="eyebrow">Ciclo</span><b class="num">fecha ${pad(card.fecha)} · vence ${pad(card.vence)}</b></div>
    <div><span class="eyebrow">Paga com</span><b>${esc(nomeDe(card.pagaCom))}</b></div>
    <div><span class="eyebrow">Final</span><b class="num">•••• ${card.final}</b></div>
  </section>
  <section class="panel">
    <div class="fat-nav">
      <button class="mini" data-act="fatnav" data-arg="-1" ${idx <= 0 ? "disabled" : ""} aria-label="Fatura anterior">‹</button>
      <div class="fat-chips">${fs.slice(Math.max(0, idx - 2), idx + 4).map(x => `<button class="chip ${x.key === f.key ? "on" : ""}" data-act="fatkey" data-arg="${x.key}">${ymLabel(x.key)}<span class="dot s-${x.status}"></span></button>`).join("")}</div>
      <button class="mini" data-act="fatnav" data-arg="1" ${idx >= fs.length - 1 ? "disabled" : ""} aria-label="Próxima fatura">›</button>
    </div>
    <div class="fat-head">
      <div><h2>Fatura de ${ymLong(f.key)} ${pill(f.status)}</h2><div class="sub">Fecha em ${br(f.fecha)} · vence em ${br(f.vence)}${f.status === "aberta" ? " · ainda recebe compras" : ""}</div></div>
      <div class="fat-sum"><div><span>Total</span><b class="num">${fmt(f.total)}</b></div><div><span>Pago</span><b class="num">${fmt(f.pago)}</b></div><div><span>Saldo</span><b class="num">${fmt(f.saldo)}</b></div>
      ${f.saldo > 0 ? `<button class="btn primary" data-act="pagarfat" data-arg="${card.id}|${f.key}">Pagar fatura</button>` : ""}</div>
    </div>
    <div class="tbl-wrap"><table class="rows">
      <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Responsável</th><th>Origem</th><th class="r">Valor</th></tr></thead>
      <tbody>${f.itens.map(i => `<tr data-open="${i.ref}" tabindex="0"><td class="num">${brs(i.data)}</td><td>${esc(i.desc)}${i.parc ? `<span class="tag-parc">${pad(i.parc[0])}/${pad(i.parc[1])}</span>` : ""}${i.estornoDe ? `<span class="sub"> · estorno da compra de ${brs(S.lanc.find(l => l.id === i.estornoDe)?.data || "")}</span>` : ""}</td><td>${esc(i.cat)}</td><td>${esc(i.resp)}</td><td class="sub">${esc(i.origem)}</td><td class="r num ${i.valor < 0 ? "pos" : ""}">${fmt(i.valor)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="5">Total da fatura</td><td class="r num">${fmt(f.total)}</td></tr>
      ${pags.map(p => `<tr class="payrow"><td class="num">${brs(p.data)}</td><td colspan="4">Pagamento · ${esc(nomeDe(p.conta))} <span class="sub">(transferência, não é despesa)</span></td><td class="r num pos">${fmt(-p.valor)}</td></tr>`).join("")}</tfoot>
    </table></div>
  </section>
  <div class="grid2">
    <section class="panel">
      ${head("Parcelamentos em andamento", `<span class="hint num">${fmt(r.futuras)} nas próximas faturas</span>`)}
      ${parcs.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Compra</th><th>Data</th><th>Parcela atual</th><th class="r">Parcela</th><th class="r">Ainda vai cair</th></tr></thead><tbody>
      ${parcs.map(({ p, k, rest }) => `<tr data-open="${p.id}" tabindex="0"><td>${esc(p.desc)}</td><td class="num">${brs(p.data)}</td><td class="num">${Math.max(1, k)}/${p.n}</td><td class="r num">${fmt(parcVal(p, 2))}</td><td class="r num">${fmt(rest * parcVal(p, 2))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="note">Nenhum parcelamento ativo neste cartão.</p>`}
    </section>
    <section class="panel chart">
      ${head("Total por fatura", `<span class="hint">Faturas futuras só com parcelas já conhecidas</span>`)}
      ${barChart(evo, { h: 200, onClick: "fatkey", hi: Math.max(0, idx) })}
    </section>
  </div>`;
}

// ---------- contas a pagar ----------
function vContas() {
  const ym = ui.compMes, all = compromissos(S, ym, ym), desp = all.filter(c => c.tipo === "despesa"), rec = all.filter(c => c.tipo === "receita");
  const venc = desp.filter(c => ativo(c) && c.venc < TODAY);
  const tab = ui.compTab;
  const acoes = c => {
    if (c.kind === "fat") return ativo(c) ? `<button class="mini" data-go="cartoes" data-card="${c.ref.card.id}" data-key="${c.ref.key}">Abrir fatura</button>` : "";
    if (!ativo(c)) return "";
    return `<span class="actions"><button class="mini primary" data-act="pagar" data-arg="${c.key}">${c.tipo === "receita" ? "Registrar recebimento" : "Registrar pagamento"}</button>${c.tipo === "despesa" ? `<button class="mini" data-act="saldo" data-arg="${c.key}">${c.status === "parcial" ? "Decidir saldo" : "Outras ações"}</button>` : ""}</span>`;
  };
  const tabela = list => `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Origem</th><th>Status</th><th class="r">Previsto</th><th class="r">Pago</th><th class="r">Restante</th><th></th></tr></thead><tbody>
    ${list.map(c => `<tr class="${c.status === "cancelada" || c.status === "reagendada" || c.status === "renegociada" ? "dim" : ""}"><td class="num">${br(c.venc)}${ativo(c) && c.venc < TODAY ? '<div><span class="pill p-crit">Vencida</span></div>' : ""}</td><td>${esc(c.desc)}<div class="sub">${esc(c.cat)}${c.estimado ? " · valor estimado" : ""}${c.inst?.motivo ? " · " + esc(c.inst.motivo) : ""}</div></td><td class="sub">${esc(c.origem)}</td><td>${pill(c.status)}</td><td class="r num">${fmt(c.valor)}${c.desconto ? `<div class="sub">− ${fmt(c.desconto)} desconto</div>` : ""}</td><td class="r num">${c.pago ? fmt(c.pago) : "—"}</td><td class="r num"><b>${ativo(c) ? fmt(c.restante) : "—"}</b></td><td class="r">${acoes(c)}</td></tr>`).join("")}
    </tbody></table></div>`;
  const meses = []; for (let m = ymOf(S.inicio); m <= addYM(CUR, 12); m = addYM(m, 1)) meses.push(m);
  return `${topbar("Contas a pagar", "Nenhuma conta muda de mês ou some sem uma decisão sua")}
  <div class="bar-row">
    <div class="monthnav"><button class="mini" data-act="compmes" data-arg="-1" aria-label="Mês anterior">‹</button><select id="compmes" aria-label="Mês">${opts(meses.map(m => [m, ymLong(m)]), ym)}</select><button class="mini" data-act="compmes" data-arg="1" aria-label="Próximo mês">›</button></div>
    <div class="seg" role="tablist">${[["pagar", "A pagar"], ["receber", "A receber"], ["rec", "Recorrências"]].map(([k, l]) => `<button role="tab" aria-pressed="${tab === k}" data-act="comptab" data-arg="${k}">${l}</button>`).join("")}</div>
  </div>
  ${tab === "pagar" ? `
  <section class="totals">
    <div><span>Previsto no mês</span><b class="num">${fmt(sum(desp.filter(c => c.status !== "cancelada" && c.status !== "reagendada" && c.status !== "renegociada"), c => c.valor - c.desconto))}</b></div>
    <div><span>Já pago</span><b class="num pos">${fmt(sum(desp, c => c.pago))}</b></div>
    <div><span>Falta pagar</span><b class="num">${fmt(sum(desp.filter(ativo), c => c.restante))}</b></div>
    <div><span>Vencidas</span><b class="num ${venc.length ? "neg" : ""}">${venc.length}</b><span class="sub">${venc.length ? fmt(sum(venc, c => c.restante)) : "nenhuma"}</span></div>
  </section>
  <section class="panel flush">${tabela(desp)}</section>
  <p class="note">Previstas viram pendentes no mês do vencimento. Pagamento menor que o previsto deixa a conta parcialmente paga até você decidir o destino do saldo.</p>` : ""}
  ${tab === "receber" ? `<section class="panel flush">${tabela(rec)}</section><p class="note">Receitas previstas não entram no saldo de caixa nem no saldo livre até serem recebidas.</p>` : ""}
  ${tab === "rec" ? `<section class="panel flush">${head("Recorrências", `<button class="btn" data-act="novarec">+ Nova recorrência</button>`).replace('class="panel-head"', 'class="panel-head pad"')}
    <div class="tbl-wrap"><table class="rows"><thead><tr><th>Descrição</th><th>Tipo</th><th>Natureza</th><th class="r">Valor</th><th>Dia</th><th>Período</th><th>Conta</th><th></th></tr></thead><tbody>
    ${S.rec.map(r => `<tr><td>${esc(r.desc)}<div class="sub">${esc(r.cat)}${r.sub ? " · " + esc(r.sub) : ""}</div></td><td>${r.tipo === "receita" ? "Receita" : "Despesa"}</td><td>${r.natureza}</td><td class="r num">${fmt(r.valor)}</td><td class="num">${pad(r.dia)}</td><td class="sub">${r.parcTotal ? `${r.parcTotal} parcelas · ${pad(Math.max(1, r.parcIni || 1))}/${pad(r.parcTotal)} a ${pad(r.parcTotal)}/${pad(r.parcTotal)}<br>${ymLabel(r.inicio)} a ${ymLabel(r.fim)}` : `mensal · ${ymLabel(r.inicio)} a ${r.fim ? ymLabel(r.fim) : "sem fim"}`}</td><td class="sub">${esc(nomeDe(r.conta))}</td><td class="r"><button class="mini" data-act="editrec" data-arg="${r.id}">Editar</button></td></tr>`).join("")}
    </tbody></table></div></section><p class="note">Editar uma recorrência muda só os meses a partir do escolhido. Meses já pagos ficam como estão.</p>` : ""}`;
}

// ---------- planejamento ----------
function realizado(ym) {
  const L = S.lanc.filter(l => !l.excluido && ymOf(l.data) === ym && l.data <= TODAY);
  const isCard = id => S.cartoes.some(c => c.id === id), isInv = id => String(id || "").startsWith("inv") || S.contas.some(c => c.id === id && !c.caixa);
  return {
    rec: sum(L.filter(l => l.tipo === "receita"), l => l.valor),
    fixas: sum(L.filter(l => l.tipo === "despesa" && !l.cartao && l.origem === "recorrência"), l => l.valor),
    div: sum(L.filter(l => l.tipo === "despesa" && !l.cartao && l.origem === "dívida"), l => l.valor),
    fat: sum(L.filter(l => l.tipo === "transferencia" && isCard(l.destino)), l => l.valor),
    outras: sum(L.filter(l => l.tipo === "despesa" && !l.cartao && l.origem !== "recorrência" && l.origem !== "dívida"), l => l.valor),
    guardado: sum(L.filter(l => l.tipo === "transferencia" && isInv(l.destino)), l => l.valor) - sum(L.filter(l => l.tipo === "transferencia" && isInv(l.conta) && !isInv(l.destino)), l => l.valor),
  };
}
// de onde sai o valor inicial da previsão, parte por parte, com avisos quando faltam dados
function pontoPartida(p) {
  const b = saldoLivre(S, mk(CUR, 31)), mes = MESL[+CUR.slice(5) - 1];
  const contas = S.contas.filter(c => c.caixa);
  const semSaldo = contas.length && contas.every(c => saldoConta(S, c) === 0);
  const lista = (itens, f) => itens.length ? `<div class="pp-det">${itens.map(f).join("")}</div>` : "";
  const linha = (rotulo, valor, det, cls = "") => `<div class="pp-l ${cls}"><div><span>${rotulo}</span>${det}</div><b class="num">${valor}</b></div>`;
  return `<section class="panel pp">${head("De onde vem o ponto de partida", `<span class="hint">${fmt(p.inicio)}</span>`)}
    ${linha("Dinheiro nas contas hoje", fmt(b.caixa), lista(contas, c => `<span>${esc(c.nome)}: ${fmt(saldoConta(S, c))}</span>`))}
    ${linha(`Contas de ${mes} ainda a pagar`, fmt(-b.comprometido), lista(b.comps, c => `<span>${brs(c.venc)} · ${esc(c.desc)}: ${fmt(c.restante)}</span>`), "neg")}
    ${b.prov ? linha("Reservas planejadas", fmt(-b.prov), lista(b.provs, x => `<span>${esc(x.nome)}: ${fmt(x.reservado)}</span>`), "neg") : ""}
    ${linha(`Receitas de ${mes} que ainda vão entrar`, fmt(b.aReceber), lista(b.receitas.filter(r => r.restante > 0), r => `<span>${brs(r.venc)} · ${esc(r.desc)}: ${fmt(r.restante)}</span>`), "pos")}
    ${linha("= Ponto de partida da previsão", fmt(p.inicio), "", "tot")}
    ${semSaldo ? `<div class="check bad"><b>As contas estão com saldo R$ 0,00.</b> A previsão está considerando que não há dinheiro nenhum nelas hoje. Informe o saldo real de cada conta (em ${br(S.inicio)}, início do controle) em Configurações → Contas → Editar → Saldo inicial. <button class="mini" data-go="ajustes" data-aj="contas">Abrir contas</button></div>` : ""}
    ${!ui.varMes ? `<div class="check bad"><b>Gastos do dia a dia estão em R$ 0,00.</b> Sem uma estimativa no campo "Gastos variáveis estimados por mês" (acima, à direita), a previsão sobe todo mês como se vocês só pagassem as contas fixas e as faturas já lançadas.</div>` : ""}
  </section>`;
}
function vPlan() {
  const p = projecao(S, ui.varMes), m = ui.plan;
  let body = "";
  if (m === "previsto") body = `${pontoPartida(p)}
    <section class="panel chart">${head("Saldo livre ao fim de cada mês", `<span class="hint">Começa em ${fmt(p.inicio)} (veja a composição acima)</span>`)}${barChart(p.meses.map(x => ({ k: x.ym, l: ymLabel(x.ym).slice(0, 3), v: x.fim })), { onClick: "projmes" })}</section>
    <section class="panel flush"><div class="tbl-wrap"><table class="rows"><thead><tr><th>Mês</th><th class="r">Receitas previstas</th><th class="r">Contas fixas e variáveis</th><th class="r">Dívidas</th><th class="r">Faturas conhecidas</th><th class="r">Gastos variáveis estim.</th><th class="r">Saldo livre ao fim</th></tr></thead><tbody>
    ${p.meses.map(x => `<tr data-act="projmes" data-arg="${x.ym}" tabindex="0"><td>${ymLong(x.ym)}</td><td class="r num pos">${fmt(x.rec)}</td><td class="r num">${fmt(-x.fixas)}</td><td class="r num">${fmt(-x.div)}</td><td class="r num">${fmt(-x.fat)}</td><td class="r num muted">${fmt(-x.variaveis)}</td><td class="r num"><b class="${x.fim < 0 ? "neg" : ""}">${fmt(x.fim)}</b></td></tr>`).join("")}
    </tbody></table></div></section>
    <p class="note">Projeção não é transação: muda sozinha quando você altera recorrências, parcelamentos ou dívidas. Faturas futuras só têm as parcelas já conhecidas; compras novas estão nos gastos variáveis estimados. Provisões planejadas já foram descontadas do saldo livre de hoje e não são descontadas de novo no mês de uso.</p>`;
  if (m === "realizado") { const ms = [addYM(CUR, -1), CUR]; const rs = ms.map(realizado); body = `
    <section class="panel flush"><div class="tbl-wrap"><table class="rows"><thead><tr><th>Mês</th><th class="r">Recebido</th><th class="r">Contas pagas</th><th class="r">Dívidas pagas</th><th class="r">Faturas pagas</th><th class="r">Outras despesas</th><th class="r">Guardado / investido</th><th class="r">Sobrou no caixa</th></tr></thead><tbody>
    ${ms.map((ym, i) => { const r = rs[i], sobra = r.rec - r.fixas - r.div - r.fat - r.outras - r.guardado; return `<tr><td>${ymLong(ym)}${ym === CUR ? '<div class="sub">até ' + brs(TODAY) + "</div>" : ""}</td><td class="r num pos">${fmt(r.rec)}</td><td class="r num">${fmt(-r.fixas)}</td><td class="r num">${fmt(-r.div)}</td><td class="r num">${fmt(-r.fat)}</td><td class="r num">${fmt(-r.outras)}</td><td class="r num">${fmt(-r.guardado)}</td><td class="r num"><b>${fmt(sobra)}</b></td></tr>`; }).join("")}
    </tbody></table></div></section><p class="note">Realizado conta só o dinheiro que saiu ou entrou nas contas. Compras no cartão aparecem quando a fatura é paga; para ver o consumo por categoria, use o Painel ou Lançamentos.</p>`; }
  if (m === "comparativo") {
    const comps = compromissos(S, CUR, CUR), r = realizado(CUR);
    const prevV = (f) => sum(comps.filter(f).filter(c => c.status !== "cancelada"), c => c.valor - c.desconto);
    const rows = [
      ["Receitas", prevV(c => c.tipo === "receita"), r.rec, true],
      ["Contas fixas e variáveis", prevV(c => c.kind === "rec" && c.tipo === "despesa"), r.fixas],
      ["Dívidas", prevV(c => c.kind === "div"), r.div],
      ["Faturas de cartão", prevV(c => c.kind === "fat"), r.fat],
    ];
    body = `<section class="panel flush"><div class="tbl-wrap"><table class="rows"><thead><tr><th>${ymLong(CUR)}</th><th class="r">Previsto</th><th class="r">Realizado até ${brs(TODAY)}</th><th class="r">Falta</th><th>Andamento</th></tr></thead><tbody>
    ${rows.map(([n, pv, rv, isRec]) => `<tr><td>${n}</td><td class="r num">${fmt(pv)}</td><td class="r num ${isRec ? "pos" : ""}">${fmt(rv)}</td><td class="r num">${fmt(Math.max(0, pv - rv))}</td><td><span class="bar prog"><span class="a" style="width:${Math.min(100, pv ? rv / pv * 100 : 0).toFixed(0)}%"></span></span><span class="sub num"> ${pv ? Math.round(rv / pv * 100) : 0}%</span></td></tr>`).join("")}
    </tbody></table></div></section><p class="note">Diferenças entre previsto e realizado ficam visíveis aqui. Uma conta paga por valor diferente do previsto não muda sozinha o previsto dos meses seguintes.</p>`;
  }
  return `${topbar("Planejamento", "Previsões nunca são tratadas como dinheiro já movimentado")}
  <div class="bar-row">
    <div class="seg" role="tablist">${[["previsto", "Previsto · 12 meses"], ["realizado", "Realizado"], ["comparativo", "Comparativo do mês"]].map(([k, l]) => `<button role="tab" aria-pressed="${m === k}" data-act="plan" data-arg="${k}">${l}</button>`).join("")}</div>
    ${m === "previsto" ? `<label class="inline-field">Gastos variáveis estimados por mês <input id="varmes" inputmode="decimal" value="${(ui.varMes / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}"></label>` : ""}
  </div>${body}`;
}

// ---------- dívidas e provisões ----------
function vDividas() {
  const sims = [["juros", "Maiores juros primeiro"], ["saldo", "Menores saldos primeiro"]].map(([k, l]) => ({ k, l, r: simular(S, ui.simOrc, k) }));
  const semDiv = !S.dividas.some(d => d.saldo > 0);
  const quita = n => n === null ? "—" : ymLong(addYM(CUR, n));
  return `${topbar("Dívidas e provisões")}
  <section class="panel flush">
    ${head("Dívidas", `<button class="btn" data-act="novadiv">+ Dívida</button>`).replace('class="panel-head"', 'class="panel-head pad"')}
    <div class="tbl-wrap"><table class="rows"><thead><tr><th>Dívida</th><th>Credor</th><th class="r">Saldo devedor</th><th class="r">Parcela</th><th>Juros</th><th>Restam</th><th>Prioridade</th><th>Situação</th></tr></thead><tbody>
    ${S.dividas.map(d => { const pagas = ymDiff(d.primeiro, CUR) + 1 - (ativo(compromissos(S, CUR, CUR).find(c => c.key === d.id + "|" + CUR) || { status: "paga" }) ? 1 : 0); return `<tr data-act="verdiv" data-arg="${d.id}" tabindex="0"><td><b>${esc(d.nome)}</b><div class="sub">vence dia ${pad(d.dia)}</div></td><td>${esc(d.credor)}</td><td class="r num">${fmt(d.saldo)}</td><td class="r num">${fmt(d.parcela)}</td><td>${d.taxa ? d.taxa.toLocaleString("pt-BR") + "% a.m." : '<span class="pill p-warn">Não informada</span>'}</td><td class="num">${d.total - pagas} de ${d.total}</td><td>${d.prioridade}</td><td>${pill(d.situacao === "Em dia" ? "paga" : "pendente").replace(/Paga|Pendente/, d.situacao)}</td></tr>`; }).join("")}
    </tbody><tfoot><tr><td colspan="2">Total</td><td class="r num">${fmt(sum(S.dividas, d => d.saldo))}</td><td class="r num">${fmt(sum(S.dividas, d => d.parcela))}</td><td colspan="4"></td></tr></tfoot></table></div>
  </section>
  ${semDiv ? "" : `<section class="panel">
    ${head("Planejador de quitação", `<label class="inline-field">Quanto podem pagar por mês <input id="simorc" inputmode="decimal" value="${(ui.simOrc / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}"></label>`)}
    ${sims[0].r.insuf ? `<div class="check bad">O valor mensal é menor que a soma das parcelas mínimas (${fmt(sims[0].r.minTot)}). Com ele, alguma dívida atrasa.</div>` : ""}
    <div class="sims">${sims.map(({ k, l, r }) => `<div class="sim ${k === (sims[0].r.juros <= sims[1].r.juros ? "juros" : "saldo") ? "best" : ""}">
      <div class="sim-h"><b>${l}</b>${k === (sims[0].r.juros <= sims[1].r.juros ? "juros" : "saldo") ? '<span class="pill p-good">Menos juros</span>' : ""}</div>
      <div class="sim-n"><div><span>Tudo quitado em</span><b>${r.meses} meses</b><span class="sub">${quita(r.meses)}</span></div><div><span>Juros estimados</span><b class="num">${fmt(r.juros)}</b></div></div>
      <ol class="order">${[...r.ds].sort((a, b) => a.quita - b.quita).map(d => `<li><span>${esc(d.nome)}</span><span class="sub">${quita(d.quita)}${d.taxa ? "" : " · estimada sem juros"}</span></li>`).join("")}</ol></div>`).join("")}</div>
    <p class="note">Simulação apenas: nenhum pagamento é feito. A dívida sem taxa informada é projetada sem juros, e a projeção dela é uma estimativa.</p>
  </section>`}
  <section class="panel flush">
    ${head("Provisões para obrigações futuras", `<button class="btn" data-act="novaprov">+ Provisão</button>`).replace('class="panel-head"', 'class="panel-head pad"')}
    <div class="tbl-wrap"><table class="rows"><thead><tr><th>Objetivo</th><th>Onde está o dinheiro</th><th>Uso previsto</th><th>Reservado</th><th class="r">Falta</th><th></th></tr></thead><tbody>
    ${S.provisoes.map(p => { const r = provReservado(S, p); return `<tr><td><b>${esc(p.nome)}</b></td><td>${p.conta ? `<span class="pill p-good">Separada</span> <span class="sub">${esc(nomeDe(p.conta))}</span>` : '<span class="pill p-info">Planejada</span> <span class="sub">dentro do caixa</span>'}</td><td>${ymLong(p.uso)}</td><td><span class="bar prog"><span class="a" style="width:${Math.min(100, r / p.alvo * 100).toFixed(0)}%"></span></span><span class="sub num"> ${fmt(r)} de ${fmt(p.alvo)}</span></td><td class="r num">${fmt(Math.max(0, p.alvo - r))}</td><td class="r"><span class="actions"><button class="mini" data-act="aporte" data-arg="${p.id}">Reservar mais</button><button class="mini" data-act="verprov" data-arg="${p.id}">Histórico</button></span></td></tr>`; }).join("")}
    </tbody></table></div>
  </section>
  <p class="note">Provisão separada já está numa conta fora do caixa, então não é descontada de novo do saldo livre. Provisão planejada é descontada do saldo livre, porque o dinheiro ainda está misturado no caixa.</p>`;
}

// ---------- investimentos ----------
function vInvest() {
  const tot = sum(S.invest, i => investSaldo(i)), apo = sum(S.invest, investAportado), ren = sum(S.invest, investRend);
  if (!S.invest.length) return `${topbar("Investimentos")}<section class="panel empty"><b>Nenhuma aplicação cadastrada</b><span>Cadastre cada aplicação com o saldo de hoje. Depois, registre aportes, resgates e os rendimentos que o banco informar.</span><button class="btn primary" data-act="novoinv">Cadastrar aplicação</button></section>`;
  const meses = []; for (let m = addYM(CUR, -5); m <= CUR; m = addYM(m, 1)) meses.push(m);
  const evo = meses.map(m => ({ l: ymLabel(m).slice(0, 3), v: sum(S.invest, i => investSaldo(i, mk(m, 31))) }));
  const tipos = {}; S.invest.forEach(i => tipos[i.tipo] = (tipos[i.tipo] || 0) + investSaldo(i));
  return `${topbar("Investimentos", "Valores informados manualmente por vocês · sem integração com corretoras")}
  <section class="facts f3">
    <div><span class="eyebrow">Patrimônio investido</span><b class="num big">${fmt(tot)}</b></div>
    <div><span class="eyebrow">Total aportado</span><b class="num">${fmt(apo)}</b><span class="sub">saldos iniciais + aportes − resgates</span></div>
    <div><span class="eyebrow">Rendimentos informados</span><b class="num pos">${fmt(ren)}</b><span class="sub">não entram como receita de caixa</span></div>
  </section>
  <div class="grid2">
    <section class="panel chart">${head("Evolução mensal", `<span class="hint">Saldo no fim de cada mês</span>`)}${lineChart(evo)}</section>
    <section class="panel">${head("Distribuição por tipo")}${hbars(Object.entries(tipos).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, l: k + " · " + (tot ? Math.round(v / tot * 100) : 0) + "%", v })))}</section>
  </div>
  <section class="panel flush">
    ${head("Aplicações", `<span class="actions"><button class="btn" data-act="novoinv">+ Aplicação</button><button class="btn" data-act="novomov">+ Movimentação</button></span>`).replace('class="panel-head"', 'class="panel-head pad"')}
    <div class="tbl-wrap"><table class="rows"><thead><tr><th>Aplicação</th><th>Tipo</th><th>Instituição</th><th class="r">Aportado</th><th class="r">Rendimentos</th><th class="r">Saldo informado</th><th>Atualizado em</th></tr></thead><tbody>
    ${S.invest.map(i => `<tr data-act="verinv" data-arg="${i.id}" tabindex="0"><td><b>${esc(i.nome)}</b></td><td>${esc(i.tipo)}</td><td>${esc(i.inst)}</td><td class="r num">${fmt(investAportado(i))}</td><td class="r num pos">${fmt(investRend(i))}</td><td class="r num"><b>${fmt(investSaldo(i))}</b></td><td class="num">${i.mov.length ? br(i.mov[i.mov.length - 1].data) : "—"}</td></tr>`).join("")}
    </tbody></table></div>
  </section>`;
}

// ---------- importar ----------
const IMP_ST = { ok: ["p-good", "Novo"], estorno: ["p-good", "Estorno"], comp: ["p-info", "Quita compromisso"], link: ["p-info", "Já registrado"], dup: ["p-crit", "Possível duplicata"], parc: ["p-warn", "Confirmar parcelamento"], skip: ["p-mute", "Ignorado"], keep: ["p-good", "Novo · compra diferente"], parcok: ["p-good", "Parcelamento confirmado"], avista: ["p-good", "Novo · à vista"] };
function vImport() {
  const P = S.pend, done = ui.impDone;
  const todos = P ? P.arquivos.flatMap(a => a.itens) : [];
  const incompletos = todos.filter(i => IMP_GRAVA.includes(i.st) && (!(i.v > 0) || !i.desc || !i.d)).length;
  const semAlvo = P ? P.arquivos.filter(a => !a.erro && !a.lendo && !a.destino).length : 0, lendo = P ? P.arquivos.some(a => a.lendo) : false;
  const pendentes = todos.filter(i => IMP_PEND.includes(i.st)).length + incompletos + semAlvo + (lendo ? 1 : 0), gravaveis = todos.filter(i => IMP_GRAVA.includes(i.st)).length;
  const destOpts = [...S.contas.map(c => [c.id, "Conta · " + c.nome]), ...S.cartoes.map(c => [c.id, "Cartão · " + c.nome])];
  const semDestino = !destOpts.length;
  return `${topbar("Importar", "Extratos e faturas em CSV, OFX ou print da tela · PDF na próxima etapa")}
  ${semDestino ? `<div class="check bad"><b>Cadastre primeiro uma conta ou um cartão.</b> Cada arquivo importado precisa de um destino. <button class="mini" data-go="ajustes" data-aj="contas">Cadastrar conta</button></div>` : `
  <label class="drop" for="arquivos" id="dropzone">
    <span class="drop-i">${icon("importar")}</span>
    <span class="drop-t"><b>Arraste os arquivos aqui ou clique para escolher</b><span class="sub">CSV, OFX ou <b>print/foto</b> da fatura ou do extrato. Vários de uma vez. Nada é gravado sem a sua confirmação, e um arquivo enviado de novo é reconhecido.</span></span>
    <input id="arquivos" type="file" multiple accept=".csv,.ofx,.txt,.pdf,image/*" class="sr">
  </label>
  <div class="paste-bar"><button class="btn" data-act="colarprint">${icon("importar")}<span>Colar print</span></button><span class="sub">Copiou um print? Aperte <b>Ctrl+V</b> aqui na tela (no celular, escolha a imagem pela área acima). A leitura do print é feita no seu aparelho; a imagem não é enviada para nenhum servidor.</span></div>`}
  ${done ? `<section class="panel done"><h2>Importação ${done.id} gravada</h2><div class="totals in"><div><span>Incluídos</span><b class="num">${done.incl}</b></div><div><span>Vinculados a registros existentes</span><b class="num">${done.vinc}</b></div><div><span>Ignorados</span><b class="num">${done.ign}</b></div></div><div class="actions"><button class="btn primary" data-go="lancamentos">Ver lançamentos</button><button class="btn" data-act="okdone">Fechar</button></div></section>` : ""}
  ${P ? P.arquivos.map((a, fi) => {
    const card = cardOf(S, a.destino), fats = card ? (() => { const r = []; for (let k = addYM(CUR, -3); k <= addYM(CUR, 2); k = addYM(k, 1)) r.push([k, "Fatura de " + ymLong(k)]); return r; })() : [];
    return `<section class="panel flush">
    <div class="panel-head pad imp-head"><div><h2><span class="file"><span class="ext">${esc(a.formato)}</span>${esc(a.nome)}</span></h2>
      <div class="sub">${a.erro || a.lendo ? "" : `${a.img ? a.raw.length : a.itens.length} lançamento${(a.img ? a.raw.length : a.itens.length) === 1 ? "" : "s"} lido${(a.img ? a.raw.length : a.itens.length) === 1 ? "" : "s"}${a.img ? " no print" : ""}${a.ignorados ? `, ${a.ignorados} linhas sem data ou valor ignoradas` : ""}${a.colunas ? ` · colunas: ${esc(a.colunas.data)}, ${esc(a.colunas.descricao)}, ${esc(a.colunas.valor)}` : ""}`}</div></div>
      ${a.erro || a.lendo ? "" : `<div class="imp-dest">${a.destino ? `<label>Destino <select data-impfile-dest="${fi}">${opts(destOpts, a.destino)}</select></label>` : ""}${card ? `<label>Esta é a <select data-impfile-fat="${fi}">${opts(fats, a.fatura)}</select></label>` : ""}<button class="mini ${a.destino ? "" : "primary"}" data-act="impcartoes" data-arg="${fi}" aria-expanded="${!!a.escolher}">${a.destino ? "Trocar cartão ou conta" : "Escolher cartão ou conta"}</button></div>`}</div>
    ${a.lendo ? `<div class="ocr-prog pad-x"><div><b>Lendo o print…</b> <span class="sub" id="ocr-p-${fi}">${a.etapa || "preparando"}</span></div><div class="bar"><i id="ocr-b-${fi}" style="width:${Math.round((a.progresso || 0) * 100)}%"></i></div><span class="sub">Na primeira vez o leitor é baixado (alguns segundos). Depois fica guardado no aparelho.</span></div>` : ""}
    ${a.img && !a.lendo ? `<div class="pad-x imp-img"><span class="sub">${a.banco ? `Banco reconhecido no print: <b>${esc(a.banco)}</b>${a.ehCartao ? " · parece fatura de cartão" : ""}` : "Não reconheci o banco no print."}</span> <button class="linkbtn" data-act="impverprint" data-arg="${fi}">${a.verPrint ? "Esconder print" : "Ver print ao lado"}</button></div>` : ""}
    ${!a.erro && !a.lendo && (a.escolher || !a.destino) ? `<div class="pad-x vinc">${a.destino ? "" : `<div class="check bad"><b>Não identifiquei o banco ou o cartão${a.img ? " neste print" : ""}.</b> Escolha abaixo onde lançar estes itens.</div>`}
      ${S.cartoes.length ? `<div class="vinc-t">Cartões</div><div class="vinc-l">${S.cartoes.map(c => `<button class="vinc-c ${a.destino === c.id ? "on" : ""}" data-act="impvincular" data-arg="${fi}|${c.id}">${icon("cartoes")}<span><b>${esc(c.nome)}</b><span class="sub">${esc(c.inst || "")}${c.final ? " · final " + esc(c.final) : ""} · fecha ${pad(c.fecha)}, vence ${pad(c.vence)}</span></span></button>`).join("")}</div>` : `<p class="sub">Nenhum cartão cadastrado. <button class="linkbtn" data-go="ajustes" data-aj="cartoes">Cadastrar cartão</button></p>`}
      ${S.contas.length ? `<div class="vinc-t">Contas</div><div class="vinc-l">${S.contas.map(c => `<button class="vinc-c ${a.destino === c.id ? "on" : ""}" data-act="impvincular" data-arg="${fi}|${c.id}">${icon("contas")}<span><b>${esc(c.nome)}</b><span class="sub">${esc(c.inst || c.tipo || "")}</span></span></button>`).join("")}</div>` : ""}</div>` : ""}
    ${a.repetido ? `<div class="check bad pad-x">Este arquivo já foi importado em ${tsBr(a.repetido.data)} (lote ${esc(a.repetido.id)}). Os itens já registrados aparecem como duplicatas ou vinculados.</div>` : ""}
    ${a.erro ? `<div class="check bad pad-x">${esc(a.erro)}</div>` : a.lendo || !a.destino ? "" : `${a.aviso ? `<div class="check bad pad-x">${esc(a.aviso)}</div>` : ""}${a.img ? `<div class="check info pad-x">Confira cada linha com o print: data, descrição e valor podem ser corrigidos aqui mesmo. ${card ? "Compra é valor positivo; estorno ou pagamento, negativo (com −)." : "Saída é valor negativo (com −); entrada, positivo."}</div>` : ""}
    <div class="${a.img && a.verPrint ? "imp-lado" : ""}">${a.img && a.verPrint ? `<a href="${a.preview}" target="_blank" rel="noopener" class="imp-thumb"><img src="${a.preview}" alt="Print enviado"></a>` : ""}<div class="tbl-wrap"><table class="rows imp"><thead><tr><th>${a.img ? "Data da compra" : "Data"}</th><th>Descrição lida</th>${a.img ? "<th>Parcela</th>" : ""}<th>Categoria</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
    ${a.itens.map((it, i) => { const [pc, pl] = IMP_ST[it.st] || ["p-mute", it.st]; const ed = IMP_GRAVA.includes(it.st) || IMP_PEND.includes(it.st); const k = fi + ":" + i;
      const cats = it.tipo === "receita" ? catsRec() : catsDesp();
      const r = a.raw[i] || {};
      return `<tr class="${it.st === "parc" ? "flag" : it.st === "dup" ? "dup" : it.st === "skip" ? "skip" : ""}">
      ${a.img ? `<td><input type="date" class="imp-ed ${r.d ? "" : "falta"}" data-impimg="${k}:d" value="${esc(r.d || "")}" aria-label="Data da compra">${r.d ? "" : '<div class="sub neg">Preencha a data</div>'}</td><td><input class="imp-ed wide ${r.desc ? "" : "falta"}" data-impimg="${k}:desc" value="${esc(r.desc || "")}" placeholder="Descrição" aria-label="Descrição">${it.note ? `<div class="sub">${esc(it.note)}</div>` : ""}</td>
      <td><input class="imp-ed parc" data-impimg="${k}:parc" value="${r.parc ? pad(r.parc.k) + "/" + pad(r.parc.n) : ""}" placeholder="à vista" inputmode="numeric" aria-label="Parcela (ex.: 07/08)">${r.fat ? `<div class="sub">fatura ${ymLabel(r.fat)}</div>` : ""}</td>`
        : `<td class="num">${brs(it.d)}</td><td><b>${esc(it.desc)}</b>${it.note ? `<div class="sub">${esc(it.note)}</div>` : ""}</td>`}
      <td>${ed && it.tipo !== "transferencia" ? `<select data-imp-cat="${k}" aria-label="Categoria">${opts(cats, it.cat)}</select>` : `<span class="sub">${esc(it.cat || "—")}</span>`}</td>
      <td class="r num ${it.tipo === "receita" || it.tipo === "estorno" ? "pos" : ""}">${a.img ? `<input class="imp-ed num r ${r.vs ? "" : "falta"}" inputmode="decimal" data-impimg="${k}:vs" value="${r.vs ? (r.vs < 0 ? "-" : "") + (Math.abs(r.vs) / 100).toFixed(2).replace(".", ",") : ""}" placeholder="0,00" aria-label="Valor">${it.st === "parc" || it.st === "parcok" ? `<div class="sub">${it.n} × ${fmt(it.v)}</div>` : ""}` : it.st === "parc" || it.st === "parcok" ? `${it.n} × ${fmt(it.v)}` : (it.tipo === "receita" || it.tipo === "estorno" ? "+ " : "") + fmt(it.v)}</td>
      <td><span class="pill ${pc}">${pl}</span></td>
      <td class="r"><span class="actions">${it.st === "dup" ? `<button class="mini" data-imp="${k}" data-to="skip">É o mesmo · ignorar</button><button class="mini" data-imp="${k}" data-to="keep">São diferentes</button>`
        : it.st === "parc" ? `<button class="mini" data-imp="${k}" data-to="parcok">Confirmar ${it.n}×</button><button class="mini" data-imp="${k}" data-to="avista">É à vista</button>`
        : it.st === "comp" ? `<button class="mini ghost" data-imp="${k}" data-to="ok">Não é essa conta</button><button class="mini ghost" data-imp="${k}" data-to="skip">Não importar</button>`
        : it.st === "parcok" && a.img ? `<button class="mini ghost" data-imp="${k}" data-to="avista">É à vista</button><button class="mini ghost" data-imp="${k}" data-to="skip">Não importar</button>`
        : IMP_GRAVA.includes(it.st) ? `<button class="mini ghost" data-imp="${k}" data-to="skip">Não importar</button>`
        : it.st === "skip" && !["link", "info"].includes(it.orig) ? `<button class="mini ghost" data-imp="${k}" data-to="${it.orig || "ok"}">Desfazer</button>` : ""}${a.img ? `<button class="mini ghost" data-act="impremover" data-arg="${k}" aria-label="Remover linha">✕</button>` : ""}</span></td></tr>`; }).join("")}
    </tbody></table></div></div>${a.img ? `<div class="pad-x"><button class="mini" data-act="impadd" data-arg="${fi}">+ Adicionar linha que faltou</button></div>` : ""}`}</section>`; }).join("") : ""}
  ${P ? `<div class="check ${pendentes ? "bad" : "ok"}">${lendo ? `<b>Lendo o print…</b> Aguarde terminar para revisar.` : semAlvo ? `<b>Escolha o cartão ou a conta</b> ${semAlvo > 1 ? "dos arquivos marcados" : "do arquivo marcado"} acima para continuar.` : incompletos ? `<b>${incompletos} ${incompletos > 1 ? "linhas estão" : "linha está"} sem data, descrição ou valor.</b> Complete ou remova para gravar.` : pendentes ? `<b>${pendentes} ${pendentes > 1 ? "itens precisam" : "item precisa"} da sua decisão.</b> A gravação fica bloqueada até que tudo esteja resolvido.` : `<b>Tudo conferido.</b> Nenhum valor foi completado por suposição, e nenhuma parcela já existente será criada de novo.`}</div>
    <div class="footer-bar"><span class="sub">Duplicatas nunca são apagadas sozinhas: você decide cada uma.</span><span class="actions"><button class="btn" data-act="descartar">Descartar</button><button class="btn primary" data-act="gravarimp" ${pendentes || !gravaveis ? "disabled" : ""}>Gravar ${gravaveis} lançamento${gravaveis === 1 ? "" : "s"}</button></span></div>`
  : !semDestino ? `<section class="panel"><h2>Onde conseguir os arquivos</h2><ul class="tips"><li><b>Nubank:</b> no app, abra a fatura e toque em “Exportar fatura” (CSV); para a conta, “Pedir extrato” em OFX ou CSV.</li><li><b>Itaú, Bradesco, Santander, Banco do Brasil, Caixa:</b> no internet banking, extrato → salvar como OFX (Money) ou CSV.</li><li><b>Inter:</b> extrato → exportar em OFX ou CSV.</li><li><b>Só tem o print?</b> Tire um print da fatura ou do extrato (de preferência com as datas visíveis) e cole aqui com Ctrl+V ou escolha a imagem. Confira os valores lidos antes de gravar.</li><li>PDF: a leitura chega na próxima etapa.</li></ul></section>` : ""}
  <section class="panel flush">${head("Histórico de importações").replace('class="panel-head"', 'class="panel-head pad"')}
    ${S.importacoes.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Lote</th><th>Data</th><th>Arquivos</th><th>Quem</th><th class="r">Incluídos</th><th class="r">Vinculados</th><th class="r">Ignorados</th><th></th></tr></thead><tbody>
    ${S.importacoes.map(h => `<tr><td class="num">${esc(h.id)}</td><td class="num">${tsBr(h.data)}</td><td class="sub">${esc(h.arquivos)}</td><td>${esc(h.user)}</td><td class="r num">${h.incl}</td><td class="r num">${h.vinc}</td><td class="r num">${h.ign}</td><td class="r"><button class="mini" data-act="desfazerimp" data-arg="${esc(h.id)}">Desfazer</button></td></tr>`).join("")}
    </tbody></table></div>` : `<p class="note pad-x pad-b">Nenhuma importação ainda.</p>`}</section>`;
}

const lerBuffer = f => f.arrayBuffer ? f.arrayBuffer() : new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => erro(r.error); r.readAsArrayBuffer(f); });
async function sha256(buf) { try { const h = await crypto.subtle.digest("SHA-256", buf); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""); } catch (e) { return ""; } }
function decodifica(buf) { const u = new TextDecoder("utf-8", { fatal: false }).decode(buf); return u.includes("�") ? new TextDecoder("windows-1252").decode(buf) : u; }
function adivinhaDestino(nome, lido) {
  const n = norm(nome);
  const its = lido.itens || [], positivos = its.filter(i => i.vs > 0).length;
  const pareceCartao = lido.cartao || /FATURA|CARTAO|CARD/.test(n) || (lido.formato === "CSV" && its.length >= 3 && positivos / its.length > 0.7 && S.cartoes.length);
  if (pareceCartao) { const c = S.cartoes.find(k => n.includes(norm(k.inst)) || n.includes(norm(k.nome))) || S.cartoes[0]; if (c) return c.id; }
  const c = S.contas.find(k => k.caixa && (n.includes(norm(k.inst)) || n.includes(norm(k.nome)))) || S.contas.find(k => k.caixa) || S.contas[0] || S.cartoes[0];
  return c ? c.id : null;
}
function adivinhaFatura(card, itens) {
  const fs = itens.map(i => i.fat).filter(Boolean); if (fs.length) { const c = {}; fs.forEach(f => c[f] = (c[f] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; }
  const cont = {}; itens.filter(i => i.vs > 0 && i.d && !i.parc && !achaParcela(i.desc)).forEach(i => { const k = keyOf(card, i.d); cont[k] = (cont[k] || 0) + 1; });
  const best = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : keyOf(card, TODAY);
}
function reanalisa(a) { a.itens = analisar(S, a.raw, a.destino, a.fatura); if (a.img) a.itens.forEach((it, i) => { if (it.st === "parc" && a.raw[i] && a.raw[i].parc) it.st = "parcok"; }); }
const ehImagem = f => /^image\//.test(f.type || "") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name || "");
// reconhecimento de texto no próprio navegador (Tesseract, português). Baixado só quando o primeiro print chega.
const OCR = Object.assign({ lib: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js", workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js", corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1", langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/por@1.0.0/4.0.0_best_int" }, window.CAIXA_OCR || {});
let ocrWorker = null, ocrAviso = () => {};
function carregaScript(src) { return new Promise((ok, erro) => { if (window.Tesseract) return ok(); const el = document.createElement("script"); el.src = src; el.onload = ok; el.onerror = () => erro(new Error("Não consegui baixar o leitor de imagens. Confira a internet e tente de novo.")); document.head.appendChild(el); }); }
async function preparaImagem(blob) {
  const bmp = await createImageBitmap(blob);
  const esc2 = Math.max(1, Math.min(3, 1600 / Math.max(bmp.width, 1)));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * esc2); cv.height = Math.round(bmp.height * esc2);
  const cx = cv.getContext("2d", { willReadFrequently: true }); cx.imageSmoothingQuality = "high"; cx.drawImage(bmp, 0, 0, cv.width, cv.height);
  const img = cx.getImageData(0, 0, cv.width, cv.height), px = img.data; let soma = 0;
  for (let i = 0; i < px.length; i += 4) { const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; px[i] = px[i + 1] = px[i + 2] = y; soma += y; }
  if (soma / (px.length / 4) < 115) for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 255 - px[i]; // tela escura: inverte
  cx.putImageData(img, 0, 0); return cv;
}
async function lerImagem(blob, aviso) {
  ocrAviso = aviso;
  await carregaScript(OCR.lib);
  if (!ocrWorker) { aviso(0, "baixando o leitor"); ocrWorker = await Tesseract.createWorker("por", 1, { workerPath: OCR.workerPath, corePath: OCR.corePath, langPath: OCR.langPath, logger: m => { if (m.status === "recognizing text") ocrAviso(m.progress, "lendo o texto"); } }); }
  aviso(0.02, "preparando a imagem");
  const cv = await preparaImagem(blob);
  const { data } = await ocrWorker.recognize(cv);
  return data.text || "";
}
function destinoDoPrint(lido) {
  const b = norm(lido.banco || ""), achou = k => b && (norm(k.inst || "").includes(b) || b.includes(norm(k.inst || "x")) || norm(k.nome).includes(b));
  const cards = S.cartoes.filter(achou), contas = S.contas.filter(achou);
  if (lido.cartao && cards.length === 1) return cards[0].id;
  if (!lido.cartao && contas.length === 1 && !cards.length) return contas[0].id;
  if (cards.length === 1 && !contas.length) return cards[0].id;
  return null; // não deu para ter certeza: a pessoa escolhe
}
async function lerPrint(a, f) {
  const atual = () => S.pend && S.pend.arquivos.includes(a);
  try {
    const texto = await lerImagem(f, (p, etapa) => { a.progresso = p; a.etapa = etapa; const fi = S.pend ? S.pend.arquivos.indexOf(a) : -1; const b = document.getElementById("ocr-b-" + fi), t = document.getElementById("ocr-p-" + fi); if (b) b.style.width = Math.round(p * 100) + "%"; if (t) t.textContent = etapa + (p > 0.03 ? " · " + Math.round(p * 100) + "%" : ""); });
    if (!atual()) return;
    const lido = lerTextoImagem(texto, TODAY);
    Object.assign(a, { lendo: false, texto, banco: lido.banco, ehCartao: lido.cartao, raw: lido.itens, ignorados: lido.ignorados });
    if (!lido.itens.length) a.aviso = "Não encontrei lançamentos neste print. Confira se os valores aparecem com vírgula (ex.: 120,00) e as datas estão visíveis, ou adicione as linhas à mão abaixo.";
    a.destino = destinoDoPrint(lido); a.escolher = !a.destino;
    if (a.destino) { const c = cardOf(S, a.destino); a.fatura = c ? adivinhaFatura(c, a.raw) : null; reanalisa(a); }
    render(); toast(lido.itens.length ? `${lido.itens.length} lançamento${lido.itens.length > 1 ? "s" : ""} lido${lido.itens.length > 1 ? "s" : ""} no print. Confira antes de gravar.` : "Não encontrei lançamentos no print.");
  } catch (e) { console.error(e); if (!atual()) return; Object.assign(a, { lendo: false, erro: e.message || "Não foi possível ler o print." }); render(); }
}
async function lerArquivos(files) {
  const lista = [], prints = [];
  for (const f of files) {
    if (ehImagem(f)) {
      const buf = await lerBuffer(f), hash = await sha256(buf);
      const a = { nome: f.name, hash, formato: "PRINT", img: true, lendo: true, progresso: 0, raw: [], itens: [], ignorados: 0, colunas: null, preview: URL.createObjectURL(f) };
      a.repetido = hash ? S.importacoes.find(h => (h.hashes || []).includes(hash)) : null;
      lista.push(a); prints.push([a, f]); continue;
    }
    const buf = await lerBuffer(f), hash = await sha256(buf), ext = (f.name.split(".").pop() || "").toLowerCase();
    const lido = ["pdf", "jpg", "jpeg", "png"].includes(ext) ? lerArquivo(f.name, "") : lerArquivo(f.name, decodifica(buf));
    const a = { nome: f.name, hash, formato: lido.formato, erro: lido.erro || (!lido.itens.length ? "Nenhum lançamento encontrado neste arquivo." : null), raw: lido.itens || [], ignorados: lido.ignorados || 0, colunas: lido.colunas || null, itens: [] };
    a.repetido = hash ? S.importacoes.find(h => (h.hashes || []).includes(hash)) : null;
    if (!a.erro) { a.destino = adivinhaDestino(f.name, lido); const c = cardOf(S, a.destino); a.fatura = c ? adivinhaFatura(c, a.raw) : null; reanalisa(a); }
    lista.push(a);
  }
  if (!S.pend) S.pend = { arquivos: [] };
  S.pend.arquivos.push(...lista); ui.impDone = null; render();
  const ok = lista.filter(a => !a.erro && !a.img).length; if (ok || !prints.length) toast(ok ? `${ok} arquivo${ok > 1 ? "s" : ""} lido${ok > 1 ? "s" : ""}. Revise antes de gravar.` : "Nenhum arquivo pôde ser lido.");
  for (const [a, f] of prints) await lerPrint(a, f);
}
function gravarImportacao() {
  const P = S.pend; let incl = 0, vinc = 0, ign = 0;
  const num = Math.max(0, ...S.importacoes.map(h => +String(h.id).replace(/\D/g, "") || 0), ...S.audit.filter(a => a.acao === "Desfez importação").map(a => +String(a.alvo).replace(/\D/g, "") || 0), ...S.lanc.map(l => +String(l.imp || "").replace(/\D/g, "") || 0)) + 1, id = "#" + String(num).padStart(4, "0");
  for (const a of P.arquivos) for (const it of a.itens) {
    if (it.st === "link") { vinc++; continue; }
    if (!IMP_GRAVA.includes(it.st)) { ign++; continue; }
    const card = cardOf(S, it.alvo), resp = card ? card.resp : (S.contas.find(c => c.id === it.alvo) || {}).resp || S.user;
    const base = { data: it.d, desc: it.desc, valor: it.v, cat: it.cat, sub: it.sub || "", origem: "importação", imp: id, resp, fitid: it.fitid || undefined };
    if (it.st === "parcok") { S.parc.push({ id: uid("p"), cartao: it.alvo, desc: it.desc, cat: it.cat, sub: it.sub || "", data: it.d, total: it.v * it.n, n: it.n, resp, origem: "importação", k0: it.k0, imp: id }); incl++; continue; }
    if (card) { lancar({ ...base, tipo: it.tipo === "estorno" ? "estorno" : "despesa", cartao: it.alvo, estornoDe: it.estornoDe || undefined, fatura: it.fat || undefined }); incl++; continue; }
    if (it.tipo === "transferencia") { lancar({ ...base, tipo: "transferencia", conta: it.alvo, destino: it.cartaoDestino, fatura: it.fatura, cat: undefined }); incl++; continue; }
    const l = lancar({ ...base, tipo: it.tipo, conta: it.alvo });
    if (it.st === "comp") {
      const c = findComp(it.comp);
      if (c) {
        l.comp = c.key; l.origem = c.kind === "div" ? "dívida" : "importação";
        const inst = c.kind === "man" ? c.ref : (S.inst[c.key] = S.inst[c.key] || {});
        if (c.kind !== "man" && inst.valor === undefined) inst.valor = c.valor;
        (inst.pag = inst.pag || []).push({ id: uid("pg"), lanc: l.id, valor: it.v, data: it.d });
        if (c.estimado && it.v !== c.restante) inst.valor = c.pago + c.desconto + it.v;
        if (c.kind === "div") { const d = c.ref, j = d.taxa ? Math.round(d.saldo * d.taxa / 100) : 0; d.saldo = Math.max(0, d.saldo - Math.max(0, it.v - j)); }
      }
    }
    incl++;
  }
  S.importacoes.unshift({ id, data: new Date().toISOString(), arquivos: P.arquivos.map(a => a.nome).join(", "), hashes: P.arquivos.map(a => a.hash).filter(Boolean), incl, vinc, ign, user: S.user });
  audit("Confirmou importação", id, `${incl} incluídos, ${vinc} vinculados, ${ign} ignorados`);
  ui.impDone = { id, incl, vinc, ign }; S.pend = null;
}

// ---------- configurações ----------
function vAjustes() {
  const T = [["contas", "Contas"], ["cartoes", "Cartões"], ["categorias", "Categorias"], ["regras", "Regras de classificação"], ["pessoas", "Pessoas e acesso"], ["seguranca", "Segurança"], ["dados", "Backup e dados"], ["auditoria", "Auditoria"]];
  const t = ui.aj, admin = ME && ME.papel === "admin"; let b = "";
  const pad_ = h => h.replace('class="panel-head"', 'class="panel-head pad"');
  if (t === "contas") b = `<section class="panel flush">${pad_(head("Contas e dinheiro em espécie", `<button class="btn" data-act="novaconta">+ Conta</button>`))}${S.contas.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Nome</th><th>Tipo</th><th>Instituição</th><th>Responsável</th><th>Entra no caixa</th><th class="r">Saldo inicial</th><th class="r">Saldo hoje</th><th></th></tr></thead><tbody>
    ${S.contas.map(c => `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.tipo)}</td><td>${esc(c.inst)}</td><td>${esc(c.resp)}</td><td>${c.caixa ? "Sim" : "Não · reserva separada"}</td><td class="r num">${fmt(c.saldoIni)}<div class="sub">em ${br(c.dataIni)}</div></td><td class="r num"><b>${fmt(saldoConta(S, c))}</b></td><td class="r"><button class="mini" data-act="novaconta" data-arg="${c.id}">Editar</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><b>Nenhuma conta cadastrada</b><span>Cadastre as contas bancárias, a carteira (dinheiro em espécie) e contas de reserva.</span><button class="btn primary" data-act="novaconta">Cadastrar primeira conta</button></div>`}</section>
    <p class="note">Saldo hoje = saldo inicial + recebimentos − pagamentos. Ele nunca é digitado; para corrigir uma diferença com o banco, registre um lançamento de ajuste.</p>`;
  if (t === "cartoes") b = `<section class="panel flush">${pad_(head("Cartões de crédito", `<button class="btn" data-act="novocartao">+ Cartão</button>`))}${S.cartoes.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Nome</th><th>Instituição</th><th>Responsável</th><th class="r">Limite</th><th>Fecha</th><th>Vence</th><th>Paga com</th><th>Final</th><th></th></tr></thead><tbody>
    ${S.cartoes.map(c => `<tr><td><b>${esc(c.nome)}</b></td><td>${esc(c.inst)}</td><td>${esc(c.resp)}</td><td class="r num">${fmt(c.limite)}</td><td class="num">dia ${c.fecha}</td><td class="num">dia ${c.vence}</td><td class="sub">${esc(nomeDe(c.pagaCom))}</td><td class="num">${esc(c.final)}</td><td class="r"><button class="mini" data-act="novocartao" data-arg="${c.id}">Editar</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty"><b>Nenhum cartão cadastrado</b><span>Com o dia de fechamento e de vencimento, o sistema sabe em que fatura cada compra cai.</span><button class="btn primary" data-act="novocartao">Cadastrar primeiro cartão</button></div>`}</section>
    <p class="note">Compra antes do dia de fechamento entra na fatura do ciclo; no dia do fechamento ou depois, na seguinte. A fatura leva o nome do mês em que vence.</p>`;
  if (t === "categorias") b = `<section class="panel">${head("Categorias e subcategorias")}<div class="catgrid">${S.categorias.map(c => `<div class="catcard"><b>${esc(c[0])}</b><span class="sub">${c[1] === "receita" ? "Receita" : esc(c[1] || "Sem subcategorias")}</span></div>`).join("")}</div>
    <form class="inline-form" data-form="novacat"><input name="nome" placeholder="Nova categoria" required aria-label="Nova categoria"><input name="subs" placeholder="Subcategorias, separadas por vírgula" aria-label="Subcategorias"><select name="tipo" aria-label="Tipo">${opts([["despesa", "Despesa"], ["receita", "Receita"]])}</select><button class="btn">Adicionar</button></form></section>`;
  if (t === "regras") b = `<section class="panel flush">${pad_(head("Regras de classificação", `<button class="btn" data-act="retro">Aplicar às já registradas…</button>`))}<div class="tbl-wrap"><table class="rows"><thead><tr><th>Prioridade</th><th>Se a descrição contém</th><th>Categoria</th><th>Subcategoria</th><th class="r">Lançamentos que combinam</th><th></th></tr></thead><tbody>
    ${[...S.regras].sort((a, b) => a.prio - b.prio).map(r => `<tr><td class="num">${r.prio}</td><td><code>${esc(r.trecho)}</code></td><td>${esc(r.cat)}</td><td>${esc(r.sub || "—")}</td><td class="r num">${S.lanc.filter(l => !l.excluido && norm(l.desc).includes(norm(r.trecho))).length}</td><td class="r"><button class="mini ghost" data-act="delregra" data-arg="${esc(r.trecho)}">Remover</button></td></tr>`).join("")}</tbody></table></div>
    <form class="inline-form pad" data-form="novaregra"><input name="trecho" placeholder="Trecho da descrição (ex.: ZAFFARI)" required aria-label="Trecho"><select name="cat" aria-label="Categoria">${opts(catsDesp())}</select><input name="sub" placeholder="Subcategoria (opcional)" aria-label="Subcategoria"><input name="prio" type="number" min="0" value="10" aria-label="Prioridade" style="width:80px"><button class="btn">Adicionar regra</button></form></section>
    <p class="note">Regras valem para lançamentos e importações novos. Para mudar os já registrados, use “Aplicar às já registradas”: você vê a lista antes de confirmar. Menor número = maior prioridade.</p>`;
  if (t === "pessoas") b = `<section class="panel flush">${pad_(head("Quem tem acesso", admin ? `<button class="btn" data-act="convite">Convidar pessoa</button>` : ""))}<div class="tbl-wrap"><table class="rows"><thead><tr><th>Pessoa</th><th>E-mail</th><th>Acesso</th><th></th></tr></thead><tbody>
    ${ui.membros.map(m => `<tr><td><b>${esc(m.nome)}</b>${m.user_id === ME.id ? ' <span class="pill p-good">Você</span>' : ""}</td><td class="sub">${esc(m.email)}</td><td>${m.papel === "admin" ? "Administrador" : "Membro"}</td><td class="r">${admin && m.user_id !== ME.id ? `<button class="mini ghost" data-act="remmembro" data-arg="${m.user_id}">Remover acesso</button>` : ""}</td></tr>`).join("")}
    ${ui.convites.map(c => `<tr><td><b>${esc(c.nome)}</b> <span class="pill p-warn">Convite pendente</span></td><td class="sub">${esc(c.email)}</td><td>${c.papel === "admin" ? "Administrador" : "Membro"}</td><td class="r">${admin ? `<button class="mini ghost" data-act="remconvite" data-arg="${c.id}">Cancelar convite</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div></section>
    <section class="panel flush">${pad_(head("Responsáveis financeiros", `<button class="btn" data-act="novapessoa">+ Responsável</button>`))}<div class="tbl-wrap"><table class="rows"><thead><tr><th>Nome</th><th>Uso</th></tr></thead><tbody>${S.pessoas.map(p => `<tr><td><b>${esc(p.nome)}</b></td><td class="sub">Aparece como responsável em contas, cartões e lançamentos</td></tr>`).join("")}</tbody></table></div></section>
    <p class="note">Administrador gerencia contas, pessoas e dados. Membro lança, importa e paga. Todos veem todos os dados da família. Responsáveis não precisam ter login (ex.: um filho com cartão adicional).</p>`;
  if (t === "seguranca") {
    if (ui.fatores === null) setTimeout(carregaFatores, 0);
    const ativo2 = (ui.fatores || []).find(f => f.status === "verified");
    b = `<div class="grid2"><section class="panel">${head("Verificação em duas etapas")}
      ${ui.fatores === null ? `<p class="sub">Verificando…</p>` : ativo2 ? `<p>${pill("paga").replace("Paga", "Ativa")} Um código do aplicativo autenticador é pedido a cada novo acesso.</p><button class="btn danger" data-act="mfaoff" data-arg="${ativo2.id}">Desativar</button>`
      : ui.enroll ? `<p class="sub">1. Abra o Google Authenticator, Microsoft Authenticator ou 1Password e leia o QR code. 2. Digite o código de 6 dígitos.</p><div class="qr"><img src="${ui.enroll.qr}" alt="QR code para o aplicativo autenticador" width="180" height="180"></div><p class="sub">Sem câmera? Use a chave <code>${esc(ui.enroll.secret)}</code></p><form class="form" data-form="mfaok">${field("Código", `<input id="mf-c" name="code" inputmode="numeric" maxlength="6" required autocomplete="one-time-code" class="otp">`, true, "mf-c")}<div class="field full row-actions"><button class="btn primary">Ativar</button></div></form>`
      : `<p class="sub">Protege a conta mesmo que alguém descubra a senha. Recomendado para todos da família.</p><button class="btn primary" data-act="mfaon">Ativar verificação em duas etapas</button>`}</section>
    <section class="panel">${head("Trocar senha")}<form class="form" data-form="senha"><div class="field"><label for="s2">Nova senha</label><input id="s2" name="s2" type="password" required minlength="10" autocomplete="new-password"></div><div class="field"><label for="s3">Repetir</label><input id="s3" name="s3" type="password" required minlength="10" autocomplete="new-password"></div><div class="field full"><button class="btn primary">Salvar nova senha</button></div></form></section></div>
    <section class="panel">${head("Outros dispositivos")}<p class="sub">Encerra o acesso em todos os outros navegadores e celulares onde sua conta está aberta.</p><button class="btn" data-act="sairoutros">Sair dos outros dispositivos</button></section>`;
  }
  if (t === "dados") { let ult = null; try { ult = localStorage.getItem("caixa-ultimo-export"); } catch (e) {}
    b = `<div class="grid2"><section class="panel">${head("Backup")}<p>O plano gratuito do Supabase <b>não faz backup automático</b>. Exporte os dados toda semana e guarde o arquivo num lugar seguro (por exemplo, uma pasta do Google Drive).</p><p class="sub">Última exportação neste navegador: ${ult ? tsBr(ult) : "nunca"}.</p><div class="stack"><button class="btn primary" data-act="exportar">Exportar todos os dados (JSON)</button><button class="btn" data-act="exportarcsv">Exportar lançamentos (CSV para planilha)</button></div></section>
    <section class="panel">${head("Recomeçar")}<div class="stack"><button class="btn danger" data-act="apagar" ${admin ? "" : "disabled"}>Apagar todos os dados financeiros…</button></div><p class="note">Remove tudo o que foi lançado e mantém categorias, regras e pessoas. Só administradores podem usar.</p></section></div>`; }
  if (t === "auditoria") b = `<section class="panel flush"><div class="tbl-wrap"><table class="rows"><thead><tr><th>Quando</th><th>Quem</th><th>O que fez</th><th>Em</th><th>Detalhe</th></tr></thead><tbody>
    ${S.audit.map(a => `<tr><td class="num">${tsBr(a.ts)}</td><td>${esc(a.user)}</td><td>${esc(a.acao)}</td><td>${esc(a.alvo)}</td><td class="sub">${esc(a.det)}</td></tr>`).join("") || `<tr><td colspan="5" class="sub">Nenhum registro ainda.</td></tr>`}</tbody></table></div></section><p class="note">O registro de auditoria só recebe entradas novas; o banco não permite editar nem apagar. Aqui aparecem as 500 mais recentes.</p>`;
  return `${topbar("Configurações", FAM ? esc(FAM.nome) : "")}<div class="subnav">${T.map(([k, l]) => `<button aria-pressed="${t === k}" data-act="aj" data-arg="${k}">${l}</button>`).join("")}</div>${b}`;
}
async function carregaFatores() { const { data, error } = await SB.auth.mfa.listFactors(); ui.fatores = error ? [] : (data.totp || []); if (ui.view === "ajustes") render(); }

// ================= JANELAS =================
const layer = () => document.getElementById("layer");
const closeLayer = () => { layer().innerHTML = ""; };
function modal(title, body, wide = false) { layer().innerHTML = `<div class="scrim" data-close></div><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h3>${title}</h3><button class="mini" data-close aria-label="Fechar">Fechar</button></div>${body}</div>`; const f = layer().querySelector("input:not([type=hidden]):not([disabled]),select"); if (f) f.focus(); }
function drawer(title, eyebrow, body) { layer().innerHTML = `<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="drawer-top"><span class="eyebrow">${eyebrow}</span><button class="mini" data-close>Fechar</button></div><h3>${title}</h3>${body}</aside>`; }
let toastT;
function toast(msg) { let t = document.getElementById("toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3600); }
const field = (lab, inner, full = false, id = "") => `<div class="field ${full ? "full" : ""}"><label ${id ? `for="${id}"` : ""}>${lab}</label>${inner}</div>`;
const money = (name, val = "", id = name) => `<span class="money"><span>R$</span><input id="${id}" name="${name}" inputmode="decimal" required placeholder="0,00" value="${val ? (val / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}"></span>`;

// memória de cálculo
function calcDrawer(kind) {
  const sl = saldoLivre(S, hzDate()), rows = [], R = (t, v, cls = "") => rows.push(`<div class="row ${cls}"><span>${t}</span><span class="num">${fmt(v)}</span></div>`), Hd = t => rows.push(`<div class="row h"><span>${t}</span><span></span></div>`);
  let title, formula, note = "";
  if (kind === "caixa" || kind === "livre") {
    title = kind === "caixa" ? "Saldo de caixa" : "Saldo livre estimado";
    formula = kind === "caixa" ? "saldo inicial + recebimentos efetivos − pagamentos efetivos<br>somado nas contas marcadas como caixa disponível" : `saldo de caixa<br>− compromissos pendentes ${hzTexto()}${ui.hz === "periodo" && ui.hzIni > TODAY ? " (e os que vencem antes do período)" : ""}<br>− provisões planejadas ainda não separadas`;
    Hd("Contas de caixa disponível"); S.contas.filter(c => c.caixa).forEach(c => R(esc(c.nome), saldoConta(S, c), "ind"));
    R("Saldo de caixa", sl.caixa, kind === "caixa" ? "total" : "sub");
    if (kind === "livre") {
      const linha = c => R(`${brs(c.venc)} · ${esc(c.desc)}${c.pago ? " <i>(restante)</i>" : ""}`, -c.restante, "ind");
      if (ui.hz === "periodo" && ui.hzIni > TODAY) { const antes = sl.comps.filter(c => c.venc < ui.hzIni), dentro = sl.comps.filter(c => c.venc >= ui.hzIni); Hd("− Compromissos que vencem antes do período"); antes.forEach(linha); if (!antes.length) rows.push('<div class="row ind"><span>Nenhum</span><span></span></div>'); Hd("− Compromissos do período"); dentro.forEach(linha); if (!dentro.length) rows.push('<div class="row ind"><span>Nenhum</span><span></span></div>'); }
      else { Hd("− Compromissos pendentes"); sl.comps.forEach(linha); }
      Hd("− Provisões planejadas"); sl.provs.forEach(p => R(esc(p.nome), -p.reservado, "ind"));
      R("Saldo livre estimado", sl.livre, "total");
      const sep = S.provisoes.filter(p => p.conta);
      note = `Ficam de fora de propósito: ${sep.map(p => `${esc(p.nome)} (${fmt(provReservado(S, p))}), que já está separada fora do caixa`).join("; ")}; faturas e contas que vencem depois de ${br(hzDate())}; e ${fmt(sl.aReceber)} de receitas previstas que ainda não entraram.`;
    } else note = "Contas de reserva ficam fora do caixa disponível. Investimentos aparecem no patrimônio, não aqui.";
  } else if (kind === "comp") {
    title = "Comprometido"; formula = `Σ (previsto − descontos − já pago)<br>dos compromissos ativos que vencem até ${br(hzDate())}`;
    sl.comps.forEach(c => R(`${brs(c.venc)} · ${esc(c.desc)}`, c.restante, "ind")); R("Total", sl.comprometido, "total");
    note = "Pagamentos parciais entram só pelo restante. Faturas entram pelo saldo ainda não pago.";
  } else if (kind === "receitas") {
    title = "Receitas do mês"; formula = "Σ receitas efetivamente recebidas no mês";
    compromissos(S, CUR, CUR).filter(c => c.tipo === "receita").forEach(c => R(`${brs(c.venc)} · ${esc(c.desc)} · ${c.status === "recebida" ? "recebida" : "prevista"}`, c.pago, "ind"));
    R("Recebido", receitasMes(S, CUR), "total"); note = "Receitas previstas só passam a contar no caixa quando o recebimento é registrado.";
  } else if (kind === "pago") {
    title = "Pago no mês"; formula = "despesas pagas em conta ou espécie + pagamentos de fatura no mês";
    S.lanc.filter(l => !l.excluido && ymOf(l.data) === CUR && ((l.tipo === "despesa" && !l.cartao) || (l.tipo === "transferencia" && S.cartoes.some(c => c.id === l.destino)))).sort((a, b) => a.data < b.data ? -1 : 1).forEach(l => R(`${brs(l.data)} · ${esc(l.desc)}`, l.valor, "ind"));
    note = "Pagamento de fatura aparece aqui como saída de dinheiro, mas não é somado de novo nos gastos por categoria: as compras já foram contadas uma vez.";
  }
  drawer(title, "Memória de cálculo", `<div class="formula">${formula}</div><div class="calc">${rows.join("")}</div><p class="note">${note}</p>`);
}

// detalhe de lançamento ou parcelamento
function openItem(id) {
  const l = S.lanc.find(x => x.id === id), p = S.parc.find(x => x.id === id);
  const hist = S.audit.filter(a => a.ref === id);
  const histHtml = `<h4>Histórico</h4><div class="hist">${hist.length ? hist.map(a => `<div><span class="num">${tsBr(a.ts)}</span> · ${esc(a.user)} · ${esc(a.acao)}${a.det ? `<div class="sub">${esc(a.det)}</div>` : ""}</div>`).join("") : `<div class="sub">Criado por ${l ? (l.origem === "manual" ? "lançamento manual" : l.origem) : "importação"}. Nenhuma alteração desde então.</div>`}</div>`;
  if (p) {
    const card = cardOf(S, p.cartao), k0 = p.k0 || keyOf(card, p.data);
    const parcs = Array.from({ length: p.n }, (_, i) => { const key = addYM(k0, i), f = fatura(S, card, key), canc = p.cancelDe && i + 1 >= p.cancelDe; return `<tr class="${canc ? "dim" : ""}"><td class="num">${i + 1}/${p.n}</td><td>${ymLabel(key)}</td><td class="r num">${fmt(parcVal(p, i + 1))}</td><td>${canc ? pill("cancelada") : pill(f.status === "vazia" ? "prevista" : f.status)}</td></tr>`; }).join("");
    const atual = ymDiff(k0, cardResumo(S, card).atual.key) + 1;
    drawer(esc(p.desc), "Parcelamento · " + esc(card.nome), `<div class="kv"><span>Data da compra</span><b>${br(p.data)}</b><span>Valor total</span><b class="num">${fmt(p.total)}</b><span>Parcelas</span><b class="num">${p.n} × ${fmt(parcVal(p, 2))}${parcVal(p, 1) !== parcVal(p, 2) ? ` (1ª de ${fmt(parcVal(p, 1))})` : ""}</b><span>Categoria</span><b>${esc(p.cat)}</b><span>Responsável</span><b>${esc(p.resp)}</b><span>Origem</span><b>${esc(p.origem)}</b></div>
      <div class="tbl-wrap"><table class="rows"><thead><tr><th>Parcela</th><th>Fatura</th><th class="r">Valor</th><th>Status</th></tr></thead><tbody>${parcs}</tbody></table></div>
      <form class="form" data-form="editparc" data-id="${p.id}">${field("Categoria (vale para todas as parcelas)", `<select name="cat" id="pc-cat">${opts(catsDesp(), p.cat)}</select>`, true, "pc-cat")}<div class="field full"><button class="btn primary">Salvar categoria</button></div></form>
      ${!p.cancelDe && atual < p.n ? `<div class="confirm-zone" id="cz"><button class="btn danger" data-act="askcancelparc">Cancelar parcelas a partir da ${Math.max(atual + 1, 1)}ª…</button></div>` : ""}
      ${histHtml}`);
    layer().querySelector(".drawer").dataset.parc = p.id; layer().querySelector(".drawer").dataset.from = Math.max(atual + 1, 1);
    return;
  }
  if (!l) return;
  const est = l.estornoDe ? S.lanc.find(x => x.id === l.estornoDe) : null, temEst = S.lanc.find(x => x.estornoDe === l.id);
  const tipoL = { despesa: "Despesa", receita: "Receita", transferencia: "Transferência", estorno: "Estorno" }[l.tipo];
  drawer(esc(l.desc), tipoL + (l.cartao ? " no cartão" : ""), `
    ${est ? `<div class="check ok">Estorno da compra <b>${esc(est.desc)}</b> de ${br(est.data)} (${fmt(est.valor)}).</div>` : ""}${temEst ? `<div class="check ok">Esta compra tem um estorno vinculado em ${br(temEst.data)}.</div>` : ""}
    ${l.tipo === "transferencia" ? `<div class="check info">Transferência entre contas próprias: não entra em receitas nem despesas.${l.fatura ? " Liquida a fatura de " + ymLong(l.fatura) + "." : ""}</div>` : ""}
    <form class="form" data-form="editlanc" data-id="${l.id}">
      ${field("Descrição", `<input id="e-desc" name="desc" value="${esc(l.desc)}" required>`, true, "e-desc")}
      ${field("Valor", money("valor", l.valor, "e-valor"), false, "e-valor")}
      ${field("Data", `<input id="e-data" name="data" type="date" value="${l.data}" required>`, false, "e-data")}
      ${l.tipo !== "transferencia" ? field("Categoria", `<select id="e-cat" name="cat">${opts(l.tipo === "receita" ? catsRec() : catsDesp(), l.cat)}</select>`, false, "e-cat") + field("Subcategoria", `<input id="e-sub" name="sub" value="${esc(l.sub || "")}">`, false, "e-sub") : ""}
      ${field("Responsável", `<select id="e-resp" name="resp">${opts([...S.pessoas.map(p => p.nome), "Casa"], l.resp)}</select>`, false, "e-resp")}
      ${field(l.cartao ? "Cartão" : "Conta", `<input value="${esc(l.tipo === "transferencia" ? nomeDe(l.conta) + " → " + nomeDe(l.destino) : nomeDe(l.cartao || l.conta))}" disabled>`)}
      ${field("Observações", `<textarea id="e-obs" name="obs" rows="2">${esc(l.obs || "")}</textarea>`, true, "e-obs")}
      <div class="field full row-actions"><button class="btn primary">Salvar alterações</button><span class="sub">Origem: ${esc(l.origem)}${l.comp ? " · paga um compromisso" : ""}</span></div>
    </form>
    <div class="confirm-zone" id="cz"><button class="btn danger" data-act="askdel" data-arg="${l.id}">Excluir lançamento…</button></div>
    ${histHtml}`);
}

// novo lançamento
function novoModal(pre = {}) {
  if (!S.contas.length && !S.cartoes.length) { toast("Cadastre primeiro uma conta ou um cartão em Configurações."); return; }
  const tipo = pre.tipo || "despesa";
  const contasOpt = tipo === "despesa" ? [...S.cartoes.map(c => [c.id, "Cartão · " + c.nome]), ...S.contas.filter(c => c.caixa).map(c => [c.id, c.nome])] : S.contas.map(c => [c.id, c.nome]);
  modal("Novo lançamento", `<form class="form" data-form="novo" id="fnovo">
    <div class="field full"><div class="seg wide" role="radiogroup" aria-label="Tipo">${[["despesa", "Despesa"], ["receita", "Receita"], ["transferencia", "Transferência"]].map(([k, l]) => `<button type="button" role="radio" aria-pressed="${tipo === k}" aria-checked="${tipo === k}" data-act="novotipo" data-arg="${k}">${l}</button>`).join("")}</div><input type="hidden" name="tipo" value="${tipo}"></div>
    ${field("Descrição", `<input id="n-desc" name="desc" required placeholder="${tipo === "receita" ? "Ex.: Freela de design" : tipo === "transferencia" ? "Ex.: Guardar para viagem" : "Ex.: Supermercado Dia"}" value="${esc(pre.desc || "")}" autocomplete="off">`, true, "n-desc")}
    ${field("Valor", money("valor", pre.valor, "n-valor"), false, "n-valor")}
    ${field("Data", `<input id="n-data" name="data" type="date" value="${pre.data || TODAY}" required>`, false, "n-data")}
    ${field(tipo === "transferencia" ? "Sai de" : tipo === "despesa" ? "Conta ou cartão" : "Entra em", `<select id="n-conta" name="conta">${opts(contasOpt, pre.conta || (tipo === "despesa" && S.cartoes[0] ? S.cartoes[0].id : (S.contas.find(c => c.caixa) || S.contas[0] || {}).id))}</select>`, false, "n-conta")}
    ${tipo === "transferencia" ? field("Vai para", `<select id="n-dest" name="destino">${opts(S.contas.map(c => [c.id, c.nome]), (S.contas.find(c => !c.caixa) || S.contas[1] || {}).id)}</select>`, false, "n-dest") : field("Categoria", `<select id="n-cat" name="cat">${opts(tipo === "receita" ? catsRec() : catsDesp(), pre.cat || "")}</select>`, false, "n-cat")}
    ${tipo === "despesa" ? field("Parcelas no cartão", `<select id="n-parc" name="n">${opts(Array.from({ length: 24 }, (_, i) => [i + 1, i ? (i + 1) + "×" : "À vista"]), 1)}</select>`, false, "n-parc") : ""}
    ${field("Responsável", `<select id="n-resp" name="resp">${opts([...S.pessoas.map(p => p.nome), "Casa"], S.user)}</select>`, false, "n-resp")}
    <div class="field full"><div class="hint-box" id="n-hint">${tipo === "transferencia" ? "Transferências entre contas próprias não contam como receita nem despesa." : "A categoria é sugerida pelas regras de classificação ao digitar a descrição."}</div></div>
    ${field("Observações", `<textarea id="n-obs" name="obs" rows="2"></textarea>`, true, "n-obs")}
    <div class="field full row-actions"><button class="btn primary">Salvar lançamento</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`);
}
function novoHint() {
  const f = document.getElementById("fnovo"); if (!f) return;
  const h = document.getElementById("n-hint"), tipo = f.elements.tipo.value; if (tipo === "transferencia") return;
  const sug = sugerirCat(S, f.elements.desc.value), msgs = [];
  if (sug && f.elements.cat && f.elements.cat.dataset.touched !== "1" && [...f.elements.cat.options].some(o => o.value === sug.cat)) { f.elements.cat.value = sug.cat; msgs.push(`Categoria <b>${esc(sug.cat)}</b> sugerida pela regra “${esc(sug.regra)}”.`); }
  const card = cardOf(S, f.elements.conta.value), v = parseBRL(f.elements.valor.value), n = f.elements.n ? +f.elements.n.value : 1, d = f.elements.data.value || TODAY;
  if (card && tipo === "despesa") { const k = keyOf(card, d); msgs.push(`Entra na fatura de <b>${ymLong(k)}</b> (fecha ${brs(closeOf(card, k))}).`); if (n > 1 && v > 0) { const base = Math.floor(v / n); msgs.push(`${n} parcelas de <b>${fmt(base)}</b>${v - base * n ? `, a 1ª de ${fmt(v - base * (n - 1))}` : ""}: de ${ymLabel(k)} a ${ymLabel(addYM(k, n - 1))}.`); } }
  else if (n > 1 && f.elements.n) msgs.push("Parcelamento só vale para cartão de crédito.");
  h.innerHTML = msgs.join(" ") || "A categoria é sugerida pelas regras de classificação ao digitar a descrição.";
}

// pagamento de compromisso
function findComp(key) { const ym = key.includes("|") ? key.split("|").pop() : null; if (ym) return compromissos(S, ym, ym).find(c => c.key === key); const m = S.manuais.find(x => x.id === key); return m ? compromissos(S, ymOf(m.venc), ymOf(m.venc)).find(c => c.key === key) : null; }
function pagarModal(key) {
  const c = findComp(key); if (!c) return; const rec = c.tipo === "receita";
  modal(rec ? "Registrar recebimento" : "Registrar pagamento", `<div class="kv"><span>${esc(c.desc)}</span><b class="num">${fmt(c.valor)}</b>${c.pago ? `<span>Já pago</span><b class="num">${fmt(c.pago)}</b>` : ""}<span>Restante</span><b class="num">${fmt(c.restante)}</b><span>Vencimento</span><b>${br(c.venc)}</b></div>
    <form class="form" data-form="pagar" data-key="${esc(key)}">
      ${field(rec ? "Valor recebido" : "Valor pago", money("valor", c.restante, "p-valor"), false, "p-valor")}
      ${field("Data", `<input id="p-data" name="data" type="date" value="${TODAY}" required>`, false, "p-data")}
      ${field(rec ? "Recebido em" : "Pago com", `<select id="p-conta" name="conta">${opts(S.contas.filter(x => x.caixa).map(x => [x.id, x.nome]), c.conta)}</select>`, true, "p-conta")}
      ${!rec && c.estimado ? `<label class="check-line full"><input type="checkbox" name="final" checked> Valor estimado: usar o valor pago como valor final desta conta</label>` : ""}
      <div class="field full"><div class="hint-box">${rec ? "O valor passa a contar no caixa a partir da data do recebimento." : "Se pagar menos que o restante, a conta fica parcialmente paga e você decide depois o destino do saldo."}</div></div>
      <div class="field full row-actions"><button class="btn primary">Confirmar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`);
}
function saldoModal(key) {
  const c = findComp(key); if (!c) return;
  const op = (v, t, d, extra = "") => `<label class="opt"><input type="radio" name="op" value="${v}" ${v === "manter" ? "checked" : ""}><span><b>${t}</b><span class="sub">${d}</span>${extra ? `<span class="opt-x">${extra}</span>` : ""}</span></label>`;
  modal(c.status === "parcial" ? "O que fazer com o saldo?" : "Outras ações", `<div class="kv"><span>${esc(c.desc)}</span><b class="num">${fmt(c.valor)}</b><span>Pago</span><b class="num">${fmt(c.pago)}</b><span>Restante</span><b class="num">${fmt(c.restante)}</b></div>
    <form class="form" data-form="saldo" data-key="${esc(key)}"><div class="field full opts">
      ${op("manter", "Manter pendente", "Continua neste mês, contando no comprometido.")}
      ${op("reagendar", "Agendar para outra data", "Cria um novo vencimento com o restante.", `<input type="date" name="data" value="${mk(addYM(CUR, 1), +c.venc.slice(8))}" aria-label="Nova data">`)}
      ${op("dividir", "Dividir em novos vencimentos", "Divide o restante em parcelas mensais.", `<select name="n" aria-label="Parcelas">${opts([2, 3, 4, 5, 6].map(n => [n, n + " vezes"]), 2)}</select>`)}
      ${op("negociar", "Negociar", "Registra um novo valor e vencimento acordados.", `<span class="money sm"><span>R$</span><input name="novo" inputmode="decimal" placeholder="novo valor" aria-label="Novo valor"></span><input type="date" name="dataneg" value="${addDays(TODAY, 15)}" aria-label="Novo vencimento">`)}
      ${op("desconto", "Registrar abatimento ou desconto", "Reduz o valor devido sem gerar pagamento.", `<span class="money sm"><span>R$</span><input name="desc" inputmode="decimal" placeholder="0,00" aria-label="Desconto"></span>`)}
      ${op("cancelar", "Cancelar", "A conta deixa de contar, mas fica no histórico.", `<input name="motivo" placeholder="Motivo (obrigatório)" aria-label="Motivo">`)}
    </div><div class="field full row-actions"><button class="btn primary">Aplicar</button><button type="button" class="btn" data-close>Voltar</button></div></form>`);
}

// pagar fatura
function pagarFatModal(arg) {
  const [cid, key] = arg.split("|"), card = cardOf(S, cid), f = fatura(S, card, key);
  modal("Pagar fatura " + esc(card.nome), `<div class="kv"><span>Fatura de ${ymLong(key)}</span><b class="num">${fmt(f.total)}</b><span>Já pago</span><b class="num">${fmt(f.pago)}</b><span>Saldo</span><b class="num">${fmt(f.saldo)}</b><span>Vencimento</span><b>${br(f.vence)}</b></div>
    <form class="form" data-form="pagarfat" data-arg="${arg}">
      ${field("Valor", money("valor", f.saldo, "pf-valor"), false, "pf-valor")}${field("Data", `<input id="pf-data" name="data" type="date" value="${TODAY}" required>`, false, "pf-data")}
      ${field("Pagar com", `<select id="pf-conta" name="conta">${opts(S.contas.filter(c => c.caixa).map(c => [c.id, c.nome + " · " + fmt(saldoConta(S, c))]), card.pagaCom)}</select>`, true, "pf-conta")}
      <div class="field full"><div class="hint-box">Registrado como transferência da conta para o cartão. O caixa diminui, a dívida do cartão diminui, e as compras da fatura não são contadas de novo como despesa.</div></div>
      <div class="field full row-actions"><button class="btn primary">Confirmar pagamento</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`);
}

// ================= AÇÕES =================
function lancar(o) { o.id = uid("l"); o.origem = o.origem || "manual"; S.lanc.push(o); return o; }
const forms = {
  novo(f) {
    const tipo = f.elements.tipo.value, valor = parseBRL(f.elements.valor.value), data = f.elements.data.value, desc = f.elements.desc.value.trim();
    if (!(valor > 0)) return toast("Informe um valor maior que zero."), false;
    if (tipo === "transferencia") {
      if (f.elements.conta.value === f.elements.destino.value) return toast("Escolha contas diferentes para a transferência."), false;
      const l = lancar({ data, desc, tipo, valor, conta: f.elements.conta.value, destino: f.elements.destino.value, resp: f.elements.resp.value, obs: f.elements.obs.value });
      const pv = S.provisoes.find(p => p.conta === l.destino); if (pv) pv.mov.push({ data, tipo: "Aporte", valor });
      audit("Criou transferência", desc, fmt(valor) + " · " + nomeDe(l.conta) + " → " + nomeDe(l.destino), l.id); return "Transferência salva. Receitas e despesas não mudaram.";
    }
    const card = cardOf(S, f.elements.conta.value), n = f.elements.n ? +f.elements.n.value : 1, sug = sugerirCat(S, desc);
    if (card && n > 1) { const p = { id: uid("p"), cartao: card.id, desc, cat: f.elements.cat.value, data, total: valor, n, resp: f.elements.resp.value, origem: "manual" }; S.parc.push(p); audit("Criou parcelamento", desc, `${n} × ${fmt(Math.floor(valor / n))} no ${card.nome}`, p.id); return `Parcelamento salvo: ${n} parcelas a partir da fatura de ${ymLong(keyOf(card, data))}.`; }
    const l = lancar({ data, desc, tipo, valor, cat: f.elements.cat.value, sub: sug && sug.cat === f.elements.cat.value ? sug.sub : "", resp: f.elements.resp.value, obs: f.elements.obs.value, [card ? "cartao" : "conta"]: f.elements.conta.value });
    audit("Criou lançamento", desc, fmt(valor) + " · " + nomeDe(f.elements.conta.value), l.id);
    return card ? `Compra salva na fatura de ${ymLong(keyOf(card, data))}.` : "Lançamento salvo.";
  },
  editlanc(f) {
    const l = S.lanc.find(x => x.id === f.dataset.id), ch = [];
    const nv = { desc: f.elements.desc.value.trim(), valor: parseBRL(f.elements.valor.value), data: f.elements.data.value, resp: f.elements.resp.value, obs: f.elements.obs.value };
    if (f.elements.cat) { nv.cat = f.elements.cat.value; nv.sub = f.elements.sub.value; }
    if (!(nv.valor > 0)) return toast("Informe um valor maior que zero."), false;
    for (const k in nv) if ((l[k] || "") !== nv[k]) { ch.push(`${{ desc: "descrição", valor: "valor", data: "data", resp: "responsável", obs: "observações", cat: "categoria", sub: "subcategoria" }[k]}: ${k === "valor" ? fmt(l[k]) + " → " + fmt(nv[k]) : k === "data" ? br(l[k]) + " → " + br(nv[k]) : (l[k] || "vazio") + " → " + (nv[k] || "vazio")}`); l[k] = nv[k]; }
    if (!ch.length) return "Nada foi alterado.";
    if (l.comp) { const i = S.inst[l.comp] || S.manuais.find(m => m.id === l.comp); const pg = i && (i.pag || []).find(p => p.lanc === l.id); if (pg) pg.valor = l.valor; }
    audit("Editou lançamento", l.desc, ch.join("; "), l.id); closeLayer(); return "Alterações salvas e registradas no histórico.";
  },
  editparc(f) { const p = S.parc.find(x => x.id === f.dataset.id); if (p.cat === f.elements.cat.value) return "Nada foi alterado."; audit("Alterou categoria do parcelamento", p.desc, p.cat + " → " + f.elements.cat.value, p.id); p.cat = f.elements.cat.value; closeLayer(); return "Categoria alterada em todas as parcelas."; },
  pagar(f) {
    const c = findComp(f.dataset.key), v = parseBRL(f.elements.valor.value), data = f.elements.data.value;
    if (!(v > 0)) return toast("Informe um valor maior que zero."), false;
    const isRec = c.tipo === "receita";
    const l = lancar({ data, desc: c.desc, tipo: isRec ? "receita" : "despesa", valor: v, conta: f.elements.conta.value, cat: c.cat, sub: c.sub, origem: c.kind === "div" ? "dívida" : c.kind === "man" ? "manual" : "recorrência", comp: c.key, resp: S.user });
    const inst = c.kind === "man" ? c.ref : (S.inst[c.key] = S.inst[c.key] || {});
    if (c.kind !== "man" && inst.valor === undefined) inst.valor = c.valor;
    (inst.pag = inst.pag || []).push({ lanc: l.id, valor: v, data });
    if (f.elements.final && f.elements.final.checked && v < c.restante) inst.valor = c.pago + c.desconto + v;
    if (c.kind === "div") { const d = c.ref, juros = d.taxa ? Math.round(d.saldo * d.taxa / 100) : 0; d.saldo = Math.max(0, d.saldo - Math.max(0, v - juros)); }
    const rest = c.restante - v; audit(isRec ? "Registrou recebimento" : rest > 0 && !(f.elements.final && f.elements.final.checked) ? "Registrou pagamento parcial" : "Registrou pagamento", c.desc, fmt(v) + (rest > 0 ? " de " + fmt(c.restante) : ""), l.id);
    return isRec ? "Recebimento registrado. O caixa foi atualizado." : rest > 0 && !(f.elements.final && f.elements.final.checked) ? `Pagamento parcial registrado. Restam ${fmt(rest)} — a conta continua pendente até você decidir.` : "Pagamento registrado.";
  },
  saldo(f) {
    const c = findComp(f.dataset.key), op = f.elements.op.value, inst = c.kind === "man" ? c.ref : (S.inst[c.key] = S.inst[c.key] || {});
    if (c.kind !== "man" && inst.valor === undefined) inst.valor = c.valor;
    const novoMan = (desc, valor, venc, origem) => S.manuais.push({ id: uid("m"), desc, cat: c.cat, valor, venc, origem, conta: c.conta, pag: [], de: c.key });
    if (op === "manter") return "Nada mudou: a conta continua pendente.";
    if (op === "reagendar") { if (!f.elements.data.value) return toast("Escolha a nova data."), false; inst.reag = "reagendada"; inst.motivo = "restante agendado para " + br(f.elements.data.value); novoMan(c.desc + " (restante)", c.restante, f.elements.data.value, "reagendamento"); audit("Reagendou saldo", c.desc, fmt(c.restante) + " para " + br(f.elements.data.value)); return `Restante de ${fmt(c.restante)} agendado para ${br(f.elements.data.value)}.`; }
    if (op === "dividir") { const n = +f.elements.n.value, base = Math.floor(c.restante / n); inst.reag = "reagendada"; inst.motivo = "dividido em " + n + " vezes"; for (let i = 0; i < n; i++) novoMan(`${c.desc} (${i + 1}/${n})`, i ? base : c.restante - base * (n - 1), mk(addYM(ymOf(c.venc), i + 1), +c.venc.slice(8)), "divisão"); audit("Dividiu saldo", c.desc, `${fmt(c.restante)} em ${n} vezes`); return `Restante dividido em ${n} vencimentos mensais.`; }
    if (op === "negociar") { const v = parseBRL(f.elements.novo.value); if (!(v > 0) || !f.elements.dataneg.value) return toast("Informe o novo valor e o vencimento."), false; inst.reag = "renegociada"; inst.motivo = "acordo de " + fmt(v); novoMan(c.desc + " (acordo)", v, f.elements.dataneg.value, "negociação"); audit("Negociou dívida", c.desc, fmt(c.restante) + " → " + fmt(v) + " em " + br(f.elements.dataneg.value)); return "Negociação registrada com novo vencimento."; }
    if (op === "desconto") { const v = parseBRL(f.elements.desc.value); if (!(v > 0) || v > c.restante) return toast("O desconto precisa ser maior que zero e até " + fmt(c.restante) + "."), false; inst.desconto = (inst.desconto || 0) + v; audit("Registrou desconto", c.desc, fmt(v)); return `Desconto de ${fmt(v)} registrado.`; }
    if (op === "cancelar") { if (!f.elements.motivo.value.trim()) return toast("Informe o motivo do cancelamento."), false; inst.cancel = true; inst.motivo = f.elements.motivo.value.trim(); audit("Cancelou conta", c.desc, inst.motivo); return "Conta cancelada. Ela continua visível no histórico."; }
  },
  pagarfat(f) {
    const [cid, key] = f.dataset.arg.split("|"), card = cardOf(S, cid), v = parseBRL(f.elements.valor.value), fat = fatura(S, card, key);
    if (!(v > 0)) return toast("Informe um valor maior que zero."), false;
    if (v > fat.saldo) return toast("O valor passa do saldo da fatura (" + fmt(fat.saldo) + ")."), false;
    const l = lancar({ data: f.elements.data.value, desc: "Pagamento fatura " + card.nome, tipo: "transferencia", valor: v, conta: f.elements.conta.value, destino: card.id, fatura: key, resp: S.user });
    audit("Pagou fatura", card.nome + " · " + ymLabel(key), fmt(v) + " com " + nomeDe(f.elements.conta.value), l.id);
    return v < fat.saldo ? `Pagamento parcial de ${fmt(v)}. Restam ${fmt(fat.saldo - v)} nesta fatura.` : "Fatura paga. O caixa diminuiu e nenhuma despesa nova foi criada.";
  },
  rec(f) {
    const r = f.dataset.id ? S.rec.find(x => x.id === f.dataset.id) : null, v = parseBRL(f.elements.valor.value), dia = +f.elements.dia.value, a = f.elements.apartir.value;
    let desc = f.elements.desc.value.trim(), tot = +f.elements.parc.value || 0, pn = +f.elements.pn.value || 1, fim = f.elements.fim.value || null;
    if (!(v > 0) || dia < 1 || dia > 31) return toast("Confira o valor e o dia do vencimento."), false;
    if (!a) return toast("Informe o mês."), false;
    const sp = separaParcela(desc);
    if (!tot && !r && sp) { tot = sp.total; pn = sp.n; }               // "Empréstimo (07/10)" vira parcelado 7 de 10
    if (tot && sp && sp.total === tot) desc = sp.desc;                  // o número da parcela passa a ser mostrado por mês
    if (tot) { if (pn < 1 || pn > tot) return toast(`A parcela tem que estar entre 1 e ${tot}.`), false; fim = addYM(a, tot - pn); }
    if (fim && fim < a) return toast("O mês de fim é antes do início."), false;
    const resumo = tot ? `parcelas ${pad(pn)}/${pad(tot)} a ${pad(tot)}/${pad(tot)} (${ymLabel(a)} a ${ymLabel(fim)})` : fim ? `até ${ymLabel(fim)}` : "sem fim";
    if (r) {
      for (let ym = r.inicio; ym < a; ym = addYM(ym, 1)) { const k = r.id + "|" + ym; if (ym >= ymOf(S.inicio)) { S.inst[k] = S.inst[k] || {}; if (S.inst[k].valor === undefined) S.inst[k].valor = r.valor; if (!S.inst[k].venc) S.inst[k].venc = mk(ym, r.dia); } }
      for (const k in S.inst) if (k.startsWith(r.id + "|") && (S.inst[k].pag || []).length && S.inst[k].valor === undefined) S.inst[k].valor = r.valor;
      const antes = r.parcTotal ? `parcelado em ${r.parcTotal}` : `fim ${r.fim ? ymLabel(r.fim) : "nenhum"}`;
      const ch = `${fmt(r.valor)} → ${fmt(v)}, dia ${r.dia} → ${dia}, ${antes} → ${resumo}, a partir de ${ymLabel(a)}`;
      Object.assign(r, { valor: v, dia, fim, desc, parcTotal: tot || null, parcIni: tot ? pn - ymDiff(r.inicio, a) : null });
      audit("Editou recorrência", r.desc, ch); return "Recorrência atualizada: " + resumo + ".";
    }
    const n = { id: uid("r-"), desc, tipo: f.elements.tipo.value, cat: f.elements.cat.value, sub: "", valor: v, dia, conta: f.elements.conta.value, inicio: a, fim, resp: S.user, natureza: f.elements.natureza.value, parcTotal: tot || null, parcIni: tot ? pn : null };
    S.rec.push(n); audit("Criou recorrência", n.desc, fmt(v) + " todo dia " + dia + " · " + resumo); return "Recorrência criada: " + resumo + ".";
  },
  aporte(f) {
    const p = S.provisoes.find(x => x.id === f.dataset.id), v = parseBRL(f.elements.valor.value); if (!(v > 0)) return toast("Informe um valor."), false;
    if (p.conta) { const l = lancar({ data: TODAY, desc: "Aporte · " + p.nome, tipo: "transferencia", valor: v, conta: f.elements.conta.value, destino: p.conta, resp: S.user }); p.mov.push({ data: TODAY, tipo: "Aporte", valor: v, lanc: l.id }); }
    else { p.reservado += v; p.mov.push({ data: TODAY, tipo: "Planejado", valor: v }); }
    audit("Aporte em provisão", p.nome, fmt(v)); return p.conta ? "Dinheiro separado na conta de reserva. O caixa diminuiu, o saldo livre não muda duas vezes." : "Reserva planejada aumentou. O saldo livre diminuiu no mesmo valor.";
  },
  novaprov(f) { const v = parseBRL(f.elements.alvo.value), r = parseBRL(f.elements.res.value) || 0; if (!(v > 0)) return toast("Informe o valor pretendido."), false; S.provisoes.push({ id: uid("pv"), nome: f.elements.nome.value.trim(), alvo: v, reservado: f.elements.conta.value ? 0 : r, conta: f.elements.conta.value || null, uso: f.elements.uso.value, mov: r ? [{ data: TODAY, tipo: "Planejado", valor: r }] : [] }); audit("Criou provisão", f.elements.nome.value, fmt(v)); return "Provisão criada."; },
  novadiv(f) { const s = parseBRL(f.elements.saldo.value), p = parseBRL(f.elements.parcela.value), t = f.elements.taxa.value ? Number(f.elements.taxa.value.replace(",", ".")) : null, n = +f.elements.restam.value; if (!(s > 0) || !(p > 0) || !(n > 0)) return toast("Confira saldo, parcela e parcelas restantes."), false; S.dividas.push({ id: uid("d-"), nome: f.elements.nome.value.trim(), credor: f.elements.credor.value.trim(), saldo: s, parcela: p, taxa: t, dia: +f.elements.dia.value, primeiro: addYM(CUR, 1), total: n, prioridade: f.elements.prio.value, conta: (S.contas.find(c => c.caixa) || {}).id || null, situacao: "Em dia", obs: "" }); audit("Cadastrou dívida", f.elements.nome.value, fmt(s)); return "Dívida cadastrada. As parcelas já aparecem em Contas a pagar."; },
  novoinv(f) { const E = f.elements, v = parseBRL(E.saldo.value); if (!(v >= 0)) return toast("Informe o saldo."), false; const i = { id: uid("inv"), nome: E.nome.value.trim(), tipo: E.tipo.value, inst: E.inst.value.trim(), mov: [{ id: uid("im"), data: E.data.value, tipo: "Saldo inicial", valor: v }] }; S.invest.push(i); audit("Cadastrou aplicação", i.nome, fmt(v)); return "Aplicação cadastrada."; },
  mov(f) {
    const i = S.invest.find(x => x.id === f.elements.inv.value), v = parseBRL(f.elements.valor.value), t = f.elements.tipo.value, data = f.elements.data.value; if (!(v > 0)) return toast("Informe um valor."), false;
    if (t === "Saldo informado") { const diff = v - investSaldo(i, data); i.mov.push({ data, tipo: "Rendimento", valor: diff, nota: "ajuste para saldo informado de " + fmt(v) }); }
    else { const m = { data, tipo: t, valor: v }; if ((t === "Aporte" || t === "Resgate") && f.elements.conta.value) { const l = lancar({ data, desc: t + " · " + i.nome, tipo: "transferencia", valor: v, conta: t === "Aporte" ? f.elements.conta.value : i.id, destino: t === "Aporte" ? i.id : f.elements.conta.value, resp: S.user }); m.lanc = l.id; } i.mov.push(m); }
    i.mov.sort((a, b) => a.data < b.data ? -1 : 1); audit("Movimentou investimento", i.nome, t + " " + fmt(v)); return t === "Rendimento" || t === "Saldo informado" ? "Saldo do investimento atualizado. Rendimento não entra como receita de caixa." : "Movimentação registrada como transferência entre contas próprias.";
  },
  novaconta(f) { const v = parseBRL(f.elements.saldo.value) || 0; S.contas.push({ id: uid("c"), nome: f.elements.nome.value.trim(), tipo: f.elements.tipo.value, inst: f.elements.inst.value.trim() || "—", resp: f.elements.resp.value, caixa: f.elements.caixa.checked, saldoIni: v, dataIni: TODAY }); audit("Criou conta", f.elements.nome.value, "saldo inicial " + fmt(v)); return "Conta criada."; },
  novocartao(f) { const l = parseBRL(f.elements.limite.value); if (!(l > 0)) return toast("Informe o limite."), false; S.cartoes.push({ id: uid("k"), nome: f.elements.nome.value.trim(), inst: f.elements.inst.value.trim(), resp: f.elements.resp.value, limite: l, fecha: +f.elements.fecha.value, vence: +f.elements.vence.value, pagaCom: f.elements.paga.value, final: f.elements.final.value, status: "Ativo" }); audit("Criou cartão", f.elements.nome.value, "fecha " + f.elements.fecha.value + " · vence " + f.elements.vence.value); return "Cartão criado."; },
  novacat(f) { if (S.categorias.some(c => norm(c[0]) === norm(f.elements.nome.value))) return toast("Essa categoria já existe."), false; S.categorias.push([f.elements.nome.value.trim(), f.elements.tipo.value === "receita" ? "receita" : f.elements.subs.value.trim()]); audit("Criou categoria", f.elements.nome.value); return "Categoria adicionada."; },
  novaregra(f) { S.regras.push({ trecho: f.elements.trecho.value.trim().toUpperCase(), cat: f.elements.cat.value, sub: f.elements.sub.value.trim(), prio: +f.elements.prio.value }); audit("Criou regra", f.elements.trecho.value.toUpperCase(), "→ " + f.elements.cat.value); return "Regra criada. Vale para lançamentos e importações novos."; },
  retro(f) { const ids = [...f.querySelectorAll("input[name=l]:checked")].map(i => i.value); ids.forEach(id => { const l = S.lanc.find(x => x.id === id), s = sugerirCat(S, l.desc); audit("Reclassificou por regra", l.desc, l.cat + " → " + s.cat, id); l.cat = s.cat; l.sub = s.sub; }); return ids.length ? ids.length + " lançamentos reclassificados." : "Nada foi alterado."; },
  senha(f) { if (f.elements.s2.value !== f.elements.s3.value) return toast("As senhas novas não são iguais."), false; audit("Trocou a senha", "Conta de " + S.user); return "Senha alterada. As outras sessões foram encerradas."; },
  apagar(f) { if (f.elements.conf.value !== "APAGAR") return toast("Digite APAGAR para confirmar."), false; return "No protótipo, apagar está desativado. Na versão real, os dados seriam removidos após esta confirmação."; },
  periodo(f) { const ini = f.elements.ini.value, fim = f.elements.fim.value; if (!ini || !fim) return toast("Informe as duas datas."), false; if (fim < ini) return toast("A data final precisa ser igual ou posterior à inicial."), false; ui.hzIni = ini; ui.hzFim = fim; return `Período aplicado: ${br(ini)} a ${br(fim)}.`; },
};

const acts = {
  novo: () => novoModal(),
  novotipo: a => { const f = document.getElementById("fnovo"); novoModal({ tipo: a, desc: f.elements.desc.value, valor: parseBRL(f.elements.valor.value) || "", data: f.elements.data.value }); },
  usermenu: () => { ui.userMenu = !ui.userMenu; render(); },
  limpar: () => { ui.lf = { mes: ui.lf.mes, conta: "", cat: "", resp: "", tipo: "", q: "" }; render(); },
  catmes: a => { ui.lf = { mes: CUR, conta: "", cat: a, resp: "", tipo: "", q: "" }; go("lancamentos"); },
  projmes: a => { ui.compMes = a; ui.compTab = "pagar"; go("contas"); },
  fatkey: a => { ui.cardKey = a; render(); },
  fatnav: a => { const card = cardOf(S, ui.card), fs = faturasTela(card), i = fs.findIndex(f => f.key === ui.cardKey) + +a; if (fs[i]) { ui.cardKey = fs[i].key; render(); } },
  pagarfat: a => pagarFatModal(a),
  compmes: a => { ui.compMes = addYM(ui.compMes, +a); if (ui.compMes < ymOf(S.inicio)) ui.compMes = ymOf(S.inicio); render(); },
  comptab: a => { ui.compTab = a; render(); },
  pagar: a => pagarModal(a),
  saldo: a => saldoModal(a),
  plan: a => { ui.plan = a; render(); },
  aj: a => { ui.aj = a; render(); },
  toast: a => toast(a),
  editrec: a => recModal(a), novarec: () => recModal(null),
  verdiv: a => { const d = S.dividas.find(x => x.id === a), comps = compromissos(S, ymOf(S.inicio), addYM(CUR, 3)).filter(c => c.kind === "div" && c.ref.id === a); drawer(esc(d.nome), "Dívida", `<div class="kv"><span>Credor</span><b>${esc(d.credor)}</b><span>Saldo devedor informado</span><b class="num">${fmt(d.saldo)}</b><span>Parcela</span><b class="num">${fmt(d.parcela)} · dia ${d.dia}</b><span>Juros</span><b>${d.taxa ? d.taxa.toLocaleString("pt-BR") + "% ao mês" : "Não informados"}</b><span>Prioridade</span><b>${d.prioridade}</b></div><p class="note">${esc(d.obs)}</p><h4>Parcelas</h4><div class="list">${comps.map(c => `<div class="li"><span class="d num">${brs(c.venc)}</span><span class="t">${esc(c.desc)}</span><span>${pill(c.status)}</span></div>`).join("")}</div>`); },
  verprov: a => { const p = S.provisoes.find(x => x.id === a); drawer(esc(p.nome), "Provisão", `<div class="kv"><span>Valor pretendido</span><b class="num">${fmt(p.alvo)}</b><span>Reservado</span><b class="num">${fmt(provReservado(S, p))}</b><span>Uso previsto</span><b>${ymLong(p.uso)}</b><span>Onde está</span><b>${p.conta ? esc(nomeDe(p.conta)) : "Planejada, dentro do caixa"}</b></div><h4>Aportes e usos</h4><div class="list">${p.mov.map(m => `<div class="li"><span class="d num">${brs(m.data)}</span><span class="t">${m.tipo}</span><span class="num">${fmt(m.valor)}</span></div>`).join("")}</div>`); },
  aporte: a => { const p = S.provisoes.find(x => x.id === a); modal("Reservar mais · " + esc(p.nome), `<form class="form" data-form="aporte" data-id="${a}">${field("Valor", money("valor", "", "ap-v"), false, "ap-v")}${p.conta ? field("Sai de", `<select id="ap-c" name="conta">${opts(S.contas.filter(c => c.caixa).map(c => [c.id, c.nome]))}</select>`, false, "ap-c") : ""}<div class="field full"><div class="hint-box">${p.conta ? "Separada: o dinheiro é transferido para " + esc(nomeDe(p.conta)) + " e sai do caixa disponível." : "Planejada: o dinheiro continua na conta, mas o saldo livre passa a descontar esta reserva."}</div></div><div class="field full row-actions"><button class="btn primary">Reservar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`); },
  novaprov: () => modal("Nova provisão", `<form class="form" data-form="novaprov">${field("Objetivo", `<input id="np-n" name="nome" required placeholder="Ex.: Matrícula escolar 2027">`, true, "np-n")}${field("Valor pretendido", money("alvo", "", "np-a"), false, "np-a")}${field("Já reservado", money("res", "", "np-r").replace(" required", ""), false, "np-r")}${field("Mês de uso", `<input id="np-u" name="uso" type="month" value="${addYM(CUR, 3)}" required>`, false, "np-u")}${field("Onde fica o dinheiro", `<select id="np-c" name="conta">${opts([["", "Planejada, dentro do caixa"], ...S.contas.filter(c => !c.caixa).map(c => [c.id, "Separada em " + c.nome])])}</select>`, false, "np-c")}<div class="field full row-actions"><button class="btn primary">Criar provisão</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  novadiv: () => modal("Nova dívida", `<form class="form" data-form="novadiv">${field("Nome", `<input id="nd-n" name="nome" required placeholder="Ex.: Acordo Vivo">`, false, "nd-n")}${field("Credor", `<input id="nd-c" name="credor" required>`, false, "nd-c")}${field("Saldo devedor", money("saldo", "", "nd-s"), false, "nd-s")}${field("Parcela", money("parcela", "", "nd-p"), false, "nd-p")}${field("Juros ao mês (%)", `<input id="nd-t" name="taxa" inputmode="decimal" placeholder="Deixe vazio se não souber">`, false, "nd-t")}${field("Parcelas restantes", `<input id="nd-r" name="restam" type="number" min="1" required>`, false, "nd-r")}${field("Dia do vencimento", `<input id="nd-d" name="dia" type="number" min="1" max="31" value="10" required>`, false, "nd-d")}${field("Prioridade", `<select id="nd-pr" name="prio">${opts(["Alta", "Média", "Baixa"], "Média")}</select>`, false, "nd-pr")}<div class="field full"><div class="hint-box">Sem a taxa, o planejador projeta sem juros e marca a projeção como estimada. Nenhuma taxa é inventada.</div></div><div class="field full row-actions"><button class="btn primary">Cadastrar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  novoinv: () => modal("Nova aplicação", `<form class="form" data-form="novoinv">${field("Nome", `<input id="ni-n" name="nome" required placeholder="Ex.: Tesouro Selic 2029">`, true, "ni-n")}${field("Tipo", `<select id="ni-t" name="tipo">${opts(["Tesouro Direto", "CDB", "LCI/LCA", "Poupança", "Fundo", "Ações", "Previdência", "Cripto", "Outro"])}</select>`, false, "ni-t")}${field("Instituição", `<input id="ni-i" name="inst">`, false, "ni-i")}${field("Saldo hoje", money("saldo", "", "ni-s"), false, "ni-s")}${field("Data do saldo", `<input id="ni-d" name="data" type="date" value="${TODAY}" required>`, false, "ni-d")}<div class="field full"><div class="hint-box">O saldo informado não sai do caixa: é o ponto de partida desta aplicação. Aportes futuros saem de uma conta.</div></div><div class="field full row-actions"><button class="btn primary">Cadastrar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  verinv: a => { const i = S.invest.find(x => x.id === a); drawer(esc(i.nome), i.tipo + " · " + i.inst, `<div class="kv"><span>Saldo informado</span><b class="num">${fmt(investSaldo(i))}</b><span>Total aportado</span><b class="num">${fmt(investAportado(i))}</b><span>Rendimentos informados</span><b class="num">${fmt(investRend(i))}</b></div><h4>Movimentações</h4><div class="list">${[...i.mov].reverse().map(m => `<div class="li"><span class="d num">${brs(m.data)}</span><span class="t">${m.tipo}${m.nota ? `<span class="sub">${esc(m.nota)}</span>` : m.lanc ? '<span class="sub">transferência da conta</span>' : ""}</span><span class="num">${m.tipo === "Resgate" ? fmt(-m.valor) : fmt(m.valor)}</span></div>`).join("")}</div><p class="note">Valores informados manualmente. Sem integração, não são saldos confirmados pela instituição.</p>`); },
  novomov: () => modal("Nova movimentação", `<form class="form" data-form="mov">${field("Aplicação", `<select id="mv-i" name="inv">${opts(S.invest.map(i => [i.id, i.nome]))}</select>`, true, "mv-i")}${field("Tipo", `<select id="mv-t" name="tipo">${opts(["Aporte", "Resgate", "Rendimento", "Saldo informado"])}</select>`, false, "mv-t")}${field("Data", `<input id="mv-d" name="data" type="date" value="${TODAY}" required>`, false, "mv-d")}${field("Valor", money("valor", "", "mv-v"), false, "mv-v")}${field("Conta (aporte ou resgate)", `<select id="mv-c" name="conta">${opts([["", "Sem movimentar conta"], ...S.contas.filter(c => c.caixa).map(c => [c.id, c.nome])], (S.contas.find(c => c.caixa) || {}).id)}</select>`, false, "mv-c")}<div class="field full"><div class="hint-box">Aporte e resgate são transferências entre contas próprias. “Saldo informado” calcula o rendimento pela diferença.</div></div><div class="field full row-actions"><button class="btn primary">Registrar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  askdel: a => { document.getElementById("cz").innerHTML = `<div class="check bad"><b>Excluir este lançamento?</b> Ele sai dos saldos e relatórios, mas fica registrado na auditoria.<div class="actions"><button class="btn danger" data-act="del" data-arg="${a}">Excluir</button><button class="btn" data-close>Manter</button></div></div>`; },
  del: a => { const l = S.lanc.find(x => x.id === a); l.excluido = true; audit("Excluiu lançamento", l.desc, fmt(l.valor), a); closeLayer(); commit("Lançamento excluído."); },
  askcancelparc: () => { const d = layer().querySelector(".drawer"); document.getElementById("cz").innerHTML = `<div class="check bad"><b>Cancelar as parcelas a partir da ${d.dataset.from}ª?</b> Parcelas de faturas já pagas não mudam.<div class="actions"><button class="btn danger" data-act="cancelparc">Cancelar parcelas</button><button class="btn" data-close>Voltar</button></div></div>`; },
  cancelparc: () => { const d = layer().querySelector(".drawer"), p = S.parc.find(x => x.id === d.dataset.parc); p.cancelDe = +d.dataset.from; audit("Cancelou parcelas", p.desc, "a partir da " + p.cancelDe + "ª", p.id); closeLayer(); commit("Parcelas futuras canceladas. Só as faturas afetadas foram recalculadas."); },
  delregra: a => { S.regras = S.regras.filter(r => r.trecho !== a); audit("Removeu regra", a); commit("Regra removida. Classificações antigas não mudaram."); },
  retro: () => { const cand = S.lanc.filter(l => !l.excluido && l.tipo === "despesa").map(l => ({ l, s: sugerirCat(S, l.desc) })).filter(x => x.s && x.s.cat !== "Transferência" && x.s.cat !== x.l.cat);
    modal("Aplicar regras aos lançamentos registrados", cand.length ? `<form class="form" data-form="retro"><div class="field full"><p class="sub">Estes lançamentos têm categoria diferente da que as regras sugerem. Marque os que devem mudar.</p>${cand.map(x => `<label class="check-line"><input type="checkbox" name="l" value="${x.l.id}" checked> ${br(x.l.data)} · ${esc(x.l.desc)}: ${esc(x.l.cat)} → <b>${esc(x.s.cat)}</b></label>`).join("")}</div><div class="field full row-actions"><button class="btn primary">Reclassificar marcados</button><button type="button" class="btn" data-close>Cancelar</button></div></form>` : `<p>Todos os lançamentos já estão de acordo com as regras. Nada para mudar.</p><div class="row-actions"><button class="btn" data-close>Fechar</button></div>`); },
  convite: () => modal("Convidar pessoa", `<form class="form" data-form="convite">${field("Nome", `<input id="cv-n" name="nome" required>`, false, "cv-n")}${field("Acesso", `<select id="cv-a" name="acesso">${opts(["Membro", "Administrador"])}</select>`, false, "cv-a")}${field("E-mail", `<input id="cv-e" name="email" type="email" required>`, true, "cv-e")}<div class="field full row-actions"><button class="btn primary">Enviar convite</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  novaconta: () => modal("Nova conta", `<form class="form" data-form="novaconta">${field("Nome", `<input id="nc-n" name="nome" required placeholder="Ex.: Despesas da casa">`, true, "nc-n")}${field("Tipo", `<select id="nc-t" name="tipo">${opts(["Conta corrente", "Poupança", "Espécie", "Reserva"])}</select>`, false, "nc-t")}${field("Instituição", `<input id="nc-i" name="inst">`, false, "nc-i")}${field("Responsável", `<select id="nc-r" name="resp">${opts([...S.pessoas.map(p => p.nome), "Casa"])}</select>`, false, "nc-r")}${field("Saldo inicial hoje", money("saldo", "", "nc-s"), false, "nc-s")}<label class="check-line full"><input type="checkbox" name="caixa" checked> Entra no saldo de caixa disponível</label><div class="field full row-actions"><button class="btn primary">Criar conta</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  novocartao: () => modal("Novo cartão", `<form class="form" data-form="novocartao">${field("Nome", `<input id="nk-n" name="nome" required placeholder="Ex.: C6 - Manu">`, false, "nk-n")}${field("Instituição", `<input id="nk-i" name="inst" required>`, false, "nk-i")}${field("Responsável", `<select id="nk-r" name="resp">${opts(S.pessoas.map(p => p.nome))}</select>`, false, "nk-r")}${field("Limite", money("limite", "", "nk-l"), false, "nk-l")}${field("Dia de fechamento", `<input id="nk-f" name="fecha" type="number" min="1" max="31" required>`, false, "nk-f")}${field("Dia de vencimento", `<input id="nk-v" name="vence" type="number" min="1" max="31" required>`, false, "nk-v")}${field("Paga com", `<select id="nk-p" name="paga">${opts(S.contas.filter(c => c.caixa).map(c => [c.id, c.nome]))}</select>`, false, "nk-p")}${field("Final do cartão", `<input id="nk-x" name="final" maxlength="4" inputmode="numeric">`, false, "nk-x")}<div class="field full row-actions"><button class="btn primary">Criar cartão</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  exportar: () => { const json = JSON.stringify({ exportado: nowTs(), familia: "João e Manu", contas: S.contas, cartoes: S.cartoes, lancamentos: S.lanc, parcelamentos: S.parc, recorrencias: S.rec, compromissos: S.inst, manuais: S.manuais, dividas: S.dividas, provisoes: S.provisoes, investimentos: S.invest, auditoria: S.audit }, null, 2); modal("Exportar dados", `<p class="sub">Na versão real, o arquivo é baixado. Aqui você pode copiar o conteúdo.</p><textarea class="code" readonly rows="14" id="exp">${esc(json)}</textarea><div class="row-actions"><button class="btn primary" data-act="copiar">Copiar</button><button class="btn" data-close>Fechar</button></div>`, true); },
  copiar: () => { const t = document.getElementById("exp"), fb = () => { t.select(); toast("Texto selecionado. Use Ctrl+C para copiar."); }; try { navigator.clipboard.writeText(t.value).then(() => toast("Copiado."), fb); } catch (e) { fb(); } },
  apagar: () => modal("Apagar todos os dados", `<form class="form" data-form="apagar"><div class="field full"><div class="check bad">Esta ação remove contas, lançamentos, anexos e histórico, e não pode ser desfeita. Exporte os dados antes.</div></div>${field("Digite APAGAR para confirmar", `<input id="ap-conf" name="conf" autocomplete="off">`, true, "ap-conf")}<div class="field full row-actions"><button class="btn danger">Apagar definitivamente</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  mais: () => { ui.more = !ui.more; render(); },
};
forms.convite = f => { S.pessoas.push({ id: uid("u"), nome: f.elements.nome.value.trim(), acesso: f.elements.acesso.value + " · convite enviado", login: f.elements.email.value }); audit("Convidou pessoa", f.elements.nome.value, f.elements.email.value); return "Convite registrado para " + f.elements.email.value + "."; };

function recModal(id) {
  const r = id ? S.rec.find(x => x.id === id) : null;
  const a0 = r ? (r.inicio > CUR ? r.inicio : CUR) : addYM(CUR, 1);
  const tot = r && r.parcTotal ? r.parcTotal : "", pn0 = r && r.parcTotal ? Math.min(r.parcTotal, Math.max(1, recParcela(r, a0))) : 1;
  const parcOpts = [["", "Não é parcelado"], ...Array.from({ length: 119 }, (_, k) => [String(k + 2), (k + 2) + " parcelas"])];
  modal(r ? "Editar recorrência" : "Nova recorrência", `<form class="form" data-form="rec" id="frec" ${r ? `data-id="${r.id}"` : ""}>
    ${field("Descrição", `<input id="rc-d" name="desc" required value="${esc(r ? r.desc : "")}" placeholder="Ex.: Empréstimo Pernambucanas">`, true, "rc-d")}
    ${r ? "" : field("Tipo", `<select id="rc-t" name="tipo">${opts([["despesa", "Despesa"], ["receita", "Receita"]])}</select>`, false, "rc-t") + field("Natureza", `<select id="rc-n" name="natureza">${opts(["Fixa", "Variável"])}</select>`, false, "rc-n") + field("Categoria", `<select id="rc-c" name="cat">${opts(S.categorias.map(c => c[0]))}</select>`, false, "rc-c") + field("Conta", `<select id="rc-co" name="conta">${opts(S.contas.filter(c => c.caixa).map(c => [c.id, c.nome]))}</select>`, false, "rc-co")}
    ${field("Valor" + (r ? "" : " (de cada mês)"), money("valor", r ? r.valor : "", "rc-v"), false, "rc-v")}
    ${field("Dia do vencimento", `<input id="rc-dia" name="dia" type="number" min="1" max="31" value="${r ? r.dia : 10}" required>`, false, "rc-dia")}
    ${field("Parcelas", `<select id="rc-p" name="parc">${opts(parcOpts, String(tot))}</select>`, false, "rc-p")}
    <div class="field" id="rc-pn-wrap" ${tot ? "" : "hidden"}><label for="rc-pn">${r ? "Parcela no mês escolhido abaixo" : "Parcela do primeiro mês"}</label><input id="rc-pn" name="pn" type="number" min="1" max="360" value="${pn0}"></div>
    ${field(r ? "Aplicar a partir de" : "Começa em", `<input id="rc-a" name="apartir" type="month" value="${a0}" required>`, false, "rc-a")}
    ${field("Termina em" + (tot ? " (calculado pelas parcelas)" : " (opcional)"), `<input id="rc-f" name="fim" type="month" value="${r && r.fim ? r.fim : ""}" ${tot ? "readonly" : ""}>`, false, "rc-f")}
    <div class="field full"><div class="hint-box" id="rc-hint"></div></div>
    <div class="field full row-actions"><button class="btn primary">${r ? "Salvar" : "Criar"}</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`);
  recAtualiza();
}
// mantém "Termina em", o campo de parcela e o resumo coerentes enquanto a pessoa preenche
function recAtualiza(origem) {
  const f = document.getElementById("frec"); if (!f) return;
  const E = f.elements, wrap = document.getElementById("rc-pn-wrap"), hint = document.getElementById("rc-hint"), edit = !!f.dataset.id;
  if (origem === "desc" && !E.parc.value) { const sp = separaParcela(E.desc.value); if (sp) { E.parc.value = String(sp.total); E.pn.value = sp.n; } }
  const tot = +E.parc.value || 0, a = E.apartir.value;
  wrap.hidden = !tot; E.fim.readOnly = !!tot;
  const lbl = f.querySelector('label[for="rc-f"]'); if (lbl) lbl.textContent = "Termina em" + (tot ? " (calculado pelas parcelas)" : " (opcional)");
  let txt = "Periodicidade mensal. ";
  if (tot) {
    const pn = Math.min(tot, Math.max(1, +E.pn.value || 1)); E.pn.max = tot;
    if (a) { const fim = addYM(a, tot - pn); E.fim.value = fim; txt += `Parcelas ${pad(pn)}/${pad(tot)} a ${pad(tot)}/${pad(tot)}: ${tot - pn + 1} ${tot - pn ? "meses" : "mês"}, de ${ymLong(a)} a ${ymLong(fim)}. Cada mês aparece com o número da parcela e depois da última ela some sozinha.`; }
  } else txt += E.fim.value && a ? `De ${ymLong(a)} a ${ymLong(E.fim.value)}.` : "Sem data de fim: continua todo mês até você encerrar.";
  hint.textContent = txt + " " + (edit ? "Meses anteriores e meses já pagos ficam como estão." : "Previsões não contam como pagas.");
}
document.addEventListener("input", e => { if (e.target.form && e.target.form.id === "frec") recAtualiza(e.target.name); });
document.addEventListener("change", e => { if (e.target.form && e.target.form.id === "frec") recAtualiza(e.target.name); });

// ================= LOGIN, FAMÍLIA, NAVEGAÇÃO E EVENTOS =================
const URL_APP = () => location.origin + location.pathname;
function vAuth() {
  const s = ui.screen, msg = ui.msg ? `<div class="hint-box ${ui.msgErro ? "erro" : ""}">${ui.msg}</div>` : "";
  const card = (inner, wide) => `<div class="login"><div class="login-card ${wide ? "wide" : ""}"><div class="brand big"><i>R$</i>Caixa da Família</div>${inner}</div></div>`;
  if (s === "carregando") return card(`<p class="sub">Carregando seus dados…</p>`);
  if (s === "config") return card(`<h1>Configuração pendente</h1><p class="sub">Falta colar a chave pública (anon) do Supabase no arquivo <code>js/config.js</code> do repositório. Depois de salvar, aguarde cerca de 1 minuto e recarregue esta página.</p>`);
  if (s === "login") return card(`<h1>Entrar</h1>${msg}<form class="form one" data-form="entrar">${field("E-mail", `<input id="lg-e" name="email" type="email" required autocomplete="username" value="${esc(ui.authEmail || "")}">`, true, "lg-e")}${field("Senha", `<input id="lg-s" name="senha" type="password" required autocomplete="current-password">`, true, "lg-s")}<button class="btn primary block">Entrar</button></form><div class="auth-links"><button class="linkbtn" data-act="tela" data-arg="cadastro">Criar conta</button><button class="linkbtn" data-act="tela" data-arg="esqueci">Esqueci minha senha</button></div>`);
  if (s === "cadastro") return card(`<h1>Criar conta</h1>${msg}<form class="form one" data-form="cadastro">${field("Seu nome", `<input id="cd-n" name="nome" required autocomplete="given-name">`, true, "cd-n")}${field("CPF", `<input id="cd-c" name="cpf" required inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14" data-cpf>`, true, "cd-c")}${field("E-mail", `<input id="cd-e" name="email" type="email" required autocomplete="email" value="${esc(ui.authEmail || "")}">`, true, "cd-e")}${field("Senha (mínimo 10 caracteres)", `<input id="cd-s" name="senha" type="password" required minlength="10" autocomplete="new-password">`, true, "cd-s")}<button class="btn primary block">Criar conta</button></form><p class="sub">Depois de criar a conta, ela fica aguardando liberação pelos administradores do sistema. Se alguém da família já te convidou, use o mesmo e-mail do convite.</p><div class="auth-links"><button class="linkbtn" data-act="tela" data-arg="login">Já tenho conta</button></div>`);
  if (s === "esqueci") return card(`<h1>Recuperar senha</h1>${msg}<form class="form one" data-form="esqueci">${field("E-mail", `<input id="rs-e" name="email" type="email" required autocomplete="email" value="${esc(ui.authEmail || "")}">`, true, "rs-e")}<button class="btn primary block">Enviar link</button></form><div class="auth-links"><button class="linkbtn" data-act="tela" data-arg="login">Voltar</button></div>`);
  if (s === "novasenha") return card(`<h1>Nova senha</h1>${msg}<form class="form one" data-form="novasenha">${field("Nova senha (mínimo 10 caracteres)", `<input id="ns-s" name="senha" type="password" required minlength="10" autocomplete="new-password">`, true, "ns-s")}<button class="btn primary block">Salvar e entrar</button></form>`);
  if (s === "mfa") return card(`<h1>Verificação em duas etapas</h1>${msg}<p class="sub">Digite o código de 6 dígitos do seu aplicativo autenticador.</p><form class="form one" data-form="mfa">${field("Código", `<input id="mf-l" name="code" inputmode="numeric" maxlength="6" required autocomplete="one-time-code" class="otp">`, true, "mf-l")}<button class="btn primary block">Entrar</button></form><div class="auth-links"><button class="linkbtn" data-act="sair">Usar outra conta</button></div>`);
  const sairLink = `<div class="auth-links"><button class="linkbtn" data-act="reverificar">Verificar de novo</button><button class="linkbtn" data-act="sair">Sair</button></div>`;
  const quem = ME ? `<p class="sub">Conectado como <b>${esc(ME.nome || ME.email)}</b> · ${esc(ME.email)}</p>` : "";
  if (s === "cpf") return card(`<h1>Complete seu cadastro</h1>${msg}<p class="sub">${ui.acesso && ui.acesso.super_pendente ? "Para ativar a administração geral, cadastre o seu CPF. Ele fica vinculado ao seu acesso de administrador e não pode ser trocado depois por aqui." : "Para continuar usando o sistema, informe o seu CPF. Ele identifica a sua conta para os administradores."}</p>
    <form class="form one" data-form="cpf">${field("CPF", `<input id="cp-c" name="cpf" required inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" maxlength="14" data-cpf>`, true, "cp-c")}<button class="btn primary block">Salvar CPF</button></form>${quem}<div class="auth-links"><button class="linkbtn" data-act="sair">Sair</button></div>`);
  if (s === "pendente") return card(`<h1>Aguardando liberação</h1>${msg}<div class="hint-box">Sua conta foi criada e está na fila de aprovação. Assim que João Lucas ou Emanoella liberarem o acesso, você entra direto por aqui.</div>${quem}${sairLink}`);
  if (s === "bloqueado") return card(`<h1>Acesso bloqueado</h1>${msg}<div class="hint-box erro">O acesso desta conta está bloqueado pelos administradores do sistema. Fale com João Lucas ou Emanoella.</div>${ui.acesso && ui.acesso.obs ? `<p class="sub">Observação: ${esc(ui.acesso.obs)}</p>` : ""}${quem}${sairLink}`);
  if (s === "vencido") return card(`<h1>Acesso vencido</h1>${msg}<div class="hint-box erro">Seu acesso venceu${ui.acesso && ui.acesso.valido_ate ? " em " + br(ui.acesso.valido_ate) : ""}. Peça a renovação a João Lucas ou Emanoella.</div>${quem}${sairLink}`);
  if (s === "familia") return card(`<h1>Bem-vindo${ME && ME.nome ? ", " + esc(ME.nome) : ""}</h1>${msg}<p class="sub">Crie o espaço da sua família. Ele começa vazio, com categorias e regras de classificação prontas. Depois você convida as outras pessoas, que entram com o próprio e-mail.</p>
    <form class="form one" data-form="criarfam">${field("Nome da família", `<input id="cf-f" name="familia" required value="Família ${esc(ME && ME.nome ? ME.nome : "")}">`, true, "cf-f")}${field("Seu nome", `<input id="cf-n" name="nome" required value="${esc(ME && ME.nome ? ME.nome : "")}">`, true, "cf-n")}${field("Começar o controle em", `<input id="cf-i" name="inicio" type="month" required value="${CUR}">`, true, "cf-i")}
    <button class="btn primary block">Criar família</button></form><p class="sub">Recebeu convite? Saia e entre com o e-mail convidado. Conectado como ${esc(ME ? ME.email : "")}. <button class="linkbtn" data-act="sair">Sair</button></p>`, true);
  return card("");
}
function syncBadge() { const s = ui.salvando; return `<span id="syncst" class="sync ${s}">${s === "salvando" ? "Salvando…" : s === "erro" ? "Erro ao salvar" : "Tudo salvo"}</span>`; }
function estimativas() {
  if (ui.varMes === null) { const ym = addYM(CUR, -1); const v = sum(gastosMes(S, ym).filter(r => !(r.l && (r.l.origem === "recorrência" || r.l.origem === "dívida")) && !(r.i && r.i.parc)), r => r.valor); ui.varMes = Math.max(0, Math.round(v / 1000) * 1000); }
  if (ui.simOrc === null) { const m = sum(S.dividas, d => d.parcela); ui.simOrc = Math.max(10000, Math.round(m * 1.25 / 1000) * 1000); }
  if (!ui.card || !cardOf(S, ui.card)) ui.card = S.cartoes[0] ? S.cartoes[0].id : null;
}
const VIEWFN = { painel: vPainel, lancamentos: vLanc, cartoes: vCartoes, contas: vContas, planejamento: vPlan, dividas: vDividas, investimentos: vInvest, importar: vImport, ajustes: vAjustes };
if (!VIEWFN[ui.view]) ui.view = "painel";
function go(v) { ui.view = v; ui.more = false; ui.userMenu = false; closeLayer(); render(); window.scrollTo(0, 0); }
function render() {
  const app = document.getElementById("app");
  if (ui.screen !== "app") { app.className = "app-login"; app.innerHTML = vAuth(); return; }
  estimativas();
  app.className = "app";
  const primary = ["painel", "lancamentos", "cartoes", "contas"];
  app.innerHTML = `<aside class="rail"><div class="brand"><i>R$</i>Caixa da Família</div>
    <nav class="nav" aria-label="Principal">${VIEWS.map(([k, l]) => `<button data-go="${k}" class="${primary.includes(k) ? "" : "sec"}" ${k === ui.view ? 'aria-current="page"' : ""}>${icon(k)}<span>${l}</span></button>`).join("")}<button class="more-btn" data-act="mais" aria-expanded="${ui.more}">${icon("mais")}<span>Mais</span></button></nav>
    <div class="who"><b>${esc(FAM.nome)}</b><span>${esc(ME.nome)} · hoje ${br(TODAY)}</span>${syncBadge()}</div></aside>
    <main><div class="wrap">${avisoAcesso()}${VIEWFN[ui.view]()}</div></main>
    ${ui.more ? `<div class="scrim" data-act="mais"></div><div class="sheet" role="menu">${VIEWS.filter(v => !primary.includes(v[0])).map(([k, l]) => `<button data-go="${k}">${icon(k)}<span>${l}</span></button>`).join("")}</div>` : ""}`;
}
function avisoAcesso() {
  if (ui.adminVendo) return `<div class="aviso info"><span>Você está vendo a <b>${esc(ui.adminVendo)}</b> como administrador geral. Somente leitura.</span><button class="mini" data-act="adminvoltar">Voltar para a minha família</button></div>`;
  const a = ui.acesso; if (!a || a.super) return "";
  if (a.status === "vencido") return `<div class="aviso crit"><span>${msgLeitura()}</span><button class="mini" data-act="exportar">Exportar meus dados</button></div>`;
  if (a.valido_ate) { const d = diasAte(TODAY, a.valido_ate); if (d <= 7) return `<div class="aviso warn"><span>Seu acesso vence ${d === 0 ? "hoje" : d === 1 ? "amanhã" : "em " + d + " dias"} (${br(a.valido_ate)}). Peça a renovação a João Lucas ou Emanoella.</span></div>`; }
  return "";
}
function commit(msg) { const r = save(); render(); if (msg && r !== "revertido") toast(msg); }

// ---------- sessão ----------
async function boot() {
  const cfg = window.CAIXA_CONFIG || {};
  if (!cfg.url || !cfg.chave || /COLE_AQUI/.test(cfg.chave) || !window.supabase) { ui.screen = "config"; return render(); }
  SB = window.supabase.createClient(cfg.url, cfg.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  DB.sb = SB;
  DB.onEstado = (e, m) => { ui.salvando = e; const el = document.getElementById("syncst"); if (el) el.outerHTML = syncBadge(); if (e === "erro") toast("Não foi possível salvar (" + m + "). Confira a internet; a próxima alteração tenta de novo."); };
  SB.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") { ui.screen = "novasenha"; ui.msg = ""; render(); } });
  const { data } = await SB.auth.getSession();
  if (ui.screen === "novasenha") return;
  if (!data.session) { ui.screen = "login"; return render(); }
  await entrar();
}
async function entrar() {
  ui.screen = "carregando"; render();
  try {
    const { data: aal } = await SB.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") { ui.screen = "mfa"; ui.msg = ""; return render(); }
    const { data: { user } } = await SB.auth.getUser();
    ME = { id: user.id, email: user.email, nome: (user.user_metadata && user.user_metadata.nome) || "" };
    const { data: ac, error: ea } = await SB.rpc("meu_acesso"); if (ea) throw ea;
    ui.acesso = ac || {}; ui.adminVendo = null; if (ui.acesso.nome && !ME.nome) ME.nome = ui.acesso.nome;
    if (!ui.acesso.cpf_ok) { ui.screen = "cpf"; ui.msg = ""; return render(); }
    if (ui.acesso.status === "pendente" || ui.acesso.status === "bloqueado") { ui.screen = ui.acesso.status; ui.msg = ""; return render(); }
    const { data: fid, error } = await SB.rpc("aceitar_convite"); if (error) throw error;
    if (!fid) { ui.screen = ui.acesso.status === "vencido" ? "vencido" : "familia"; ui.msg = ""; return render(); }
    await carregarFamilia(fid);
  } catch (e) { console.error(e); ui.screen = "login"; ui.msg = "Não foi possível carregar: " + esc(e.message || e); ui.msgErro = true; render(); }
}
async function carregarFamilia(fid) {
  const [{ data: fam, error: e1 }, { data: mem, error: e2 }, { data: conv }] = await Promise.all([SB.from("familias").select("*").eq("id", fid).single(), SB.from("membros").select("*").eq("familia_id", fid), SB.from("convites").select("*").eq("familia_id", fid)]);
  if (e1 || e2) throw (e1 || e2);
  FAM = fam; ui.membros = mem || []; ui.convites = conv || [];
  const eu = ui.membros.find(m => m.user_id === ME.id); ME.nome = eu.nome; ME.papel = eu.papel;
  S = await DB.carregar(fam, eu.nome);
  ui.screen = "app"; ui.msg = ""; ui.varMes = null; ui.simOrc = null; render();
}
async function substituirDados(novo, acao) {
  // recarrega o que está no banco (para saber o que apagar) e grava o novo estado por cima
  S = await DB.carregar(FAM, ME.nome);
  const keepAudit = S.audit;
  novo.user = ME.nome; novo.audit = keepAudit; S = novo;
  audit(acao, FAM.nome, "");
  await DB.sync(S);
  ui.varMes = null; ui.simOrc = null; ui.impDone = null; render();
}

// ---------- ações que dependem do servidor ----------
const acao = fn => async (...a) => { try { await fn(...a); } catch (e) { console.error(e); toast("Erro: " + (e.message || e)); } };
Object.assign(acts, {
  tela: a => { ui.screen = a; ui.msg = ""; render(); },
  reverificar: () => entrar(),
  sair: acao(async () => { await SB.auth.signOut(); S = null; FAM = null; ME = null; ui.acesso = null; ui.adminVendo = null; ui.screen = "login"; ui.msg = ""; ui.userMenu = false; ui.fatores = null; ui.enroll = null; closeLayer(); render(); }),
  sairoutros: acao(async () => { const { error } = await SB.auth.signOut({ scope: "others" }); if (error) throw error; toast("Os outros dispositivos foram desconectados."); }),
  mfaon: acao(async () => { const { data, error } = await SB.auth.mfa.enroll({ factorType: "totp", friendlyName: "Autenticador " + new Date().toISOString().slice(0, 10) }); if (error) throw error; ui.enroll = { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret }; render(); }),
  mfaoff: acao(async a => { const { error } = await SB.auth.mfa.unenroll({ factorId: a }); if (error) throw error; audit("Desativou verificação em duas etapas", ME.email); ui.fatores = null; commit("Verificação em duas etapas desativada."); }),
  convite: () => modal("Convidar pessoa", `<form class="form" data-form="convite">${field("Nome", `<input id="cv-n" name="nome" required>`, false, "cv-n")}${field("Acesso", `<select id="cv-a" name="acesso">${opts([["membro", "Membro"], ["admin", "Administrador"]])}</select>`, false, "cv-a")}${field("E-mail", `<input id="cv-e" name="email" type="email" required>`, true, "cv-e")}<div class="field full"><div class="hint-box">Depois de convidar, envie para a pessoa o endereço <b>${esc(URL_APP())}</b>. Ela cria a conta com este e-mail e entra direto na família.</div></div><div class="field full row-actions"><button class="btn primary">Convidar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  remconvite: acao(async a => { const { error } = await SB.from("convites").delete().eq("id", a); if (error) throw error; ui.convites = ui.convites.filter(c => c.id !== a); audit("Cancelou convite", a); commit("Convite cancelado."); }),
  remmembro: a => { const m = ui.membros.find(x => x.user_id === a); modal("Remover acesso de " + esc(m.nome) + "?", `<p>${esc(m.nome)} deixa de ver os dados da família. Os lançamentos feitos por essa pessoa continuam registrados.</p><div class="row-actions"><button class="btn danger" data-act="remmembrook" data-arg="${a}">Remover acesso</button><button class="btn" data-close>Cancelar</button></div>`); },
  remmembrook: acao(async a => { const { error } = await SB.from("membros").delete().eq("familia_id", FAM.id).eq("user_id", a); if (error) throw error; const m = ui.membros.find(x => x.user_id === a); ui.membros = ui.membros.filter(x => x.user_id !== a); audit("Removeu acesso", m ? m.nome : a); closeLayer(); commit("Acesso removido."); }),
  novapessoa: () => modal("Novo responsável", `<form class="form" data-form="novapessoa">${field("Nome", `<input id="np-nome" name="nome" required>`, true, "np-nome")}<div class="field full row-actions"><button class="btn primary">Adicionar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  novaconta: a => { const c = a ? S.contas.find(x => x.id === a) : null; modal(c ? "Editar conta" : "Nova conta", `<form class="form" data-form="novaconta" ${c ? `data-id="${c.id}"` : ""}>${field("Nome", `<input id="nc-n" name="nome" required placeholder="Ex.: Despesas da casa" value="${esc(c ? c.nome : "")}">`, true, "nc-n")}${field("Tipo", `<select id="nc-t" name="tipo">${opts(["Conta corrente", "Poupança", "Espécie", "Reserva"], c ? c.tipo : "")}</select>`, false, "nc-t")}${field("Instituição", `<input id="nc-i" name="inst" value="${esc(c ? c.inst : "")}" placeholder="Ex.: Itaú">`, false, "nc-i")}${field("Responsável", `<select id="nc-r" name="resp">${opts([...S.pessoas.map(p => p.nome), "Casa"], c ? c.resp : ME.nome)}</select>`, false, "nc-r")}${field("Saldo inicial", money("saldo", c ? c.saldoIni || "" : "", "nc-s").replace(" required", ""), false, "nc-s")}${field("Na data", `<input id="nc-d" name="data" type="date" required value="${c ? c.dataIni : S.inicio}">`, false, "nc-d")}<label class="check-line full"><input type="checkbox" name="caixa" ${!c || c.caixa ? "checked" : ""}> Entra no saldo de caixa disponível (desmarque para contas de reserva)</label><div class="field full"><div class="hint-box">Informe o saldo que a conta tinha na data inicial do controle. A partir daí o saldo é calculado pelos lançamentos.</div></div><div class="field full row-actions"><button class="btn primary">${c ? "Salvar" : "Criar conta"}</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`); },
  novocartao: a => { if (!S.contas.length) return toast("Cadastre antes a conta que paga o cartão."); const c = a ? cardOf(S, a) : null; modal(c ? "Editar cartão" : "Novo cartão", `<form class="form" data-form="novocartao" ${c ? `data-id="${c.id}"` : ""}>${field("Nome", `<input id="nk-n" name="nome" required placeholder="Ex.: Nubank - Gil" value="${esc(c ? c.nome : "")}">`, false, "nk-n")}${field("Instituição", `<input id="nk-i" name="inst" required value="${esc(c ? c.inst : "")}">`, false, "nk-i")}${field("Responsável", `<select id="nk-r" name="resp">${opts(S.pessoas.map(p => p.nome), c ? c.resp : ME.nome)}</select>`, false, "nk-r")}${field("Limite", money("limite", c ? c.limite : "", "nk-l"), false, "nk-l")}${field("Dia de fechamento", `<input id="nk-f" name="fecha" type="number" min="1" max="31" required value="${c ? c.fecha : ""}">`, false, "nk-f")}${field("Dia de vencimento", `<input id="nk-v" name="vence" type="number" min="1" max="31" required value="${c ? c.vence : ""}">`, false, "nk-v")}${field("Paga com", `<select id="nk-p" name="paga">${opts(S.contas.filter(x => x.caixa).map(x => [x.id, x.nome]), c ? c.pagaCom : "")}</select>`, false, "nk-p")}${field("Final do cartão", `<input id="nk-x" name="final" maxlength="4" inputmode="numeric" value="${esc(c ? c.final : "")}">`, false, "nk-x")}${c ? `<div class="field full"><div class="hint-box">Mudar o fechamento ou o vencimento recalcula em que fatura cada compra cai. Faturas já pagas continuam pagas.</div></div>` : ""}<div class="field full row-actions"><button class="btn primary">${c ? "Salvar" : "Criar cartão"}</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`); },
  exportar: () => { const json = JSON.stringify({ exportado_em: new Date().toISOString(), familia: FAM.nome, versao: 1, dados: { pessoas: S.pessoas, contas: S.contas, cartoes: S.cartoes, categorias: S.categorias, regras: S.regras, lancamentos: S.lanc, parcelamentos: S.parc, recorrencias: S.rec, ajustes: S.inst, manuais: S.manuais, dividas: S.dividas, provisoes: S.provisoes, investimentos: S.invest, importacoes: S.importacoes, auditoria: S.audit } }, null, 2);
    baixar(json, `caixa-familia-${TODAY}.json`, "application/json"); try { localStorage.setItem("caixa-ultimo-export", new Date().toISOString()); } catch (e) {} audit("Exportou dados", "JSON"); commit("Arquivo baixado. Guarde-o num lugar seguro."); },
  exportarcsv: () => { const linhasCsv = [["Data", "Descrição", "Tipo", "Valor", "Categoria", "Subcategoria", "Conta ou cartão", "Responsável", "Origem"].join(";")];
    for (const l of S.lanc.filter(x => !x.excluido).sort((a, b) => a.data < b.data ? -1 : 1)) linhasCsv.push([br(l.data), l.desc, l.tipo, (l.valor / 100).toFixed(2).replace(".", ","), l.cat || "", l.sub || "", nomeDe(l.cartao || l.conta) + (l.destino ? " → " + nomeDe(l.destino) : ""), l.resp || "", l.origem].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    baixar("﻿" + linhasCsv.join("\r\n"), `lancamentos-${TODAY}.csv`, "text/csv"); toast("Planilha baixada. Parcelas de cartão aparecem como compras parceladas na exportação completa (JSON)."); },
  apagar: () => modal("Apagar todos os dados financeiros", `<form class="form" data-form="apagar"><div class="field full"><div class="check bad">Remove contas, cartões, lançamentos, parcelamentos, contas a pagar, dívidas, provisões e investimentos. Não pode ser desfeito. Exporte os dados antes.</div></div>${field("Digite APAGAR para confirmar", `<input id="ap-conf" name="conf" autocomplete="off">`, true, "ap-conf")}<div class="field full row-actions"><button class="btn danger">Apagar definitivamente</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
  descartar: () => { (S.pend ? S.pend.arquivos : []).forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); }); S.pend = null; render(); toast("Importação descartada. Nada foi gravado."); },
  desfazerimp: id => {
    const ls = S.lanc.filter(l => l.imp === id && !l.excluido), ps = S.parc.filter(p => p.imp === id), h = S.importacoes.find(x => x.id === id);
    modal("Desfazer a importação " + esc(id) + "?", `<p>Remove o que entrou por este lote${h ? ` (${esc(h.arquivos)})` : ""}: <b>${ls.length} lançamento${ls.length === 1 ? "" : "s"}</b>${ps.length ? ` e <b>${ps.length} parcelamento${ps.length === 1 ? "" : "s"}</b> (com todas as parcelas futuras)` : ""}, somando ${fmt(sum(ls, l => l.valor) + sum(ps, p => p.total))}. Pagamentos de contas a pagar ligados a eles voltam a ficar em aberto.</p><p class="sub">Depois você pode importar o mesmo arquivo de novo, já corrigido.</p><div class="row-actions"><button class="btn danger" data-act="desfazerimpok" data-arg="${esc(id)}">Desfazer importação</button><button class="btn" data-close>Cancelar</button></div>`);
  },
  desfazerimpok: id => {
    const ids = new Set(S.lanc.filter(l => l.imp === id).map(l => l.id)), nl = ids.size, np = S.parc.filter(p => p.imp === id).length;
    S.lanc = S.lanc.filter(l => !ids.has(l.id)); S.parc = S.parc.filter(p => p.imp !== id);
    for (const k in S.inst) if (S.inst[k].pag) S.inst[k].pag = S.inst[k].pag.filter(pg => !ids.has(pg.lanc));
    S.importacoes = S.importacoes.filter(x => x.id !== id);
    audit("Desfez importação", id, `${nl} lançamentos e ${np} parcelamentos removidos`);
    if (S.pend) S.pend.arquivos.forEach(a => { if (a.repetido && a.repetido.id === id) a.repetido = null; if (a.destino && !a.erro && !a.lendo) reanalisa(a); });
    closeLayer(); commit(`Importação ${id} desfeita: ${nl} lançamento${nl === 1 ? "" : "s"}${np ? ` e ${np} parcelamento${np === 1 ? "" : "s"}` : ""} removido${nl + np === 1 ? "" : "s"}.`);
  },
  impcartoes: fi => { const a = S.pend.arquivos[+fi]; a.escolher = !a.escolher || !a.destino; render(); },
  impvincular: arg => { const [fi, id] = arg.split("|"), a = S.pend.arquivos[+fi]; a.destino = id; a.escolher = false; const c = cardOf(S, id); a.fatura = c ? adivinhaFatura(c, a.raw) : null; reanalisa(a); render(); toast("Vinculado a " + nomeDe(id) + (c ? ", fatura de " + ymLong(a.fatura) + ". Confira a fatura acima." : ".")); },
  impverprint: fi => { const a = S.pend.arquivos[+fi]; a.verPrint = !a.verPrint; render(); },
  impremover: k => { const [fi, i] = k.split(":").map(Number), a = S.pend.arquivos[fi]; a.raw.splice(i, 1); reanalisa(a); render(); },
  impadd: fi => { const a = S.pend.arquivos[+fi]; a.raw.push({ d: a.raw.length ? a.raw[a.raw.length - 1].d : TODAY, desc: "", vs: 0, fitid: null }); reanalisa(a); render(); const ins = document.querySelectorAll(`[data-impimg^="${fi}:${a.raw.length - 1}:desc"]`); if (ins[0]) ins[0].focus(); },
  colarprint: async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) throw new Error("sem acesso");
      const itens = await navigator.clipboard.read(), files = [];
      for (const it of itens) { const t = it.types.find(x => x.startsWith("image/")); if (t) { const b = await it.getType(t); files.push(new File([b], nomePrint(t), { type: t })); } }
      if (!files.length) return toast("Não há imagem copiada. Tire o print, copie e tente de novo (ou aperte Ctrl+V).");
      lerArquivos(files);
    } catch (e) { toast("O navegador não deixou ler a área de transferência. Aperte Ctrl+V nesta tela ou escolha a imagem na área acima."); }
  },
  okdone: () => { ui.impDone = null; render(); },
  gravarimp: () => { gravarImportacao(); commit("Importação gravada."); },
});
const nomePrint = tipo => { const p = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date()).map(x => [x.type, x.value])); return `Print colado ${p.day}-${p.month} ${p.hour}h${p.minute}m${p.second}.${(tipo.split("/")[1] || "png").replace("jpeg", "jpg")}`; };
function baixar(conteudo, nome, tipo) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo + ";charset=utf-8" })); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

const authForm = fn => async f => { ui.msg = ""; ui.msgErro = false; try { return await fn(f); } catch (e) { ui.msg = esc(traduzErro(e)); ui.msgErro = true; render(); return false; } };
function traduzErro(e) { const m = String(e && e.message || e); if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos."; if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar."; if (/already registered|already been registered/i.test(m)) return "Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”."; if (/Invalid TOTP|invalid.*code/i.test(m)) return "Código inválido. Confira o horário do celular e tente o código atual."; if (/rate limit/i.test(m)) return "Muitas tentativas. Aguarde alguns minutos."; if (/Password should/i.test(m)) return "A senha precisa ter pelo menos 10 caracteres."; return m; }
Object.assign(forms, {
  entrar: authForm(async f => { ui.authEmail = f.elements.email.value.trim(); const { error } = await SB.auth.signInWithPassword({ email: ui.authEmail, password: f.elements.senha.value }); if (error) throw error; await entrar(); return false; }),
  cadastro: authForm(async f => { const cpf = soDigitos(f.elements.cpf.value); if (!cpfValido(cpf)) throw new Error("CPF inválido. Confira os números."); ui.authEmail = f.elements.email.value.trim(); const { data, error } = await SB.auth.signUp({ email: ui.authEmail, password: f.elements.senha.value, options: { data: { nome: f.elements.nome.value.trim(), cpf }, emailRedirectTo: URL_APP() } }); if (error) throw error; if (data.session) { await entrar(); return false; } ui.screen = "login"; ui.msg = `Enviamos um link de confirmação para <b>${esc(ui.authEmail)}</b>. Abra o e-mail, confirme e volte para entrar.`; render(); return false; }),
  cpf: authForm(async f => { const cpf = soDigitos(f.elements.cpf.value); if (!cpfValido(cpf)) throw new Error("CPF inválido. Confira os números."); const { error } = await SB.rpc("definir_meu_cpf", { p_cpf: cpf }); if (error) throw error; await entrar(); return false; }),
  esqueci: authForm(async f => { ui.authEmail = f.elements.email.value.trim(); const { error } = await SB.auth.resetPasswordForEmail(ui.authEmail, { redirectTo: URL_APP() }); if (error) throw error; ui.screen = "login"; ui.msg = "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha."; render(); return false; }),
  novasenha: authForm(async f => { const { error } = await SB.auth.updateUser({ password: f.elements.senha.value }); if (error) throw error; history.replaceState(null, "", location.pathname); await entrar(); return false; }),
  mfa: authForm(async f => { const { data: fs, error: e1 } = await SB.auth.mfa.listFactors(); if (e1) throw e1; const fator = (fs.totp || []).find(x => x.status === "verified"); const { error } = await SB.auth.mfa.challengeAndVerify({ factorId: fator.id, code: f.elements.code.value.trim() }); if (error) throw error; await entrar(); return false; }),
  criarfam: authForm(async f => {
    const nome = f.elements.nome.value.trim(), inicio = f.elements.inicio.value + "-01";
    const { data: fid, error } = await SB.rpc("criar_familia", { p_nome: f.elements.familia.value.trim(), p_pessoa: nome, p_inicio: inicio }); if (error) throw error;
    ME.nome = nome; await carregarFamilia(fid);
    const novo = vazio(nome, inicio); novo.pend = null; novo.pessoas[0].login = ME.email;
    await substituirDados(novo, "Criou a família");
    toast("Família criada. Comece cadastrando suas contas."); return false;
  }),
  senha: authForm(async f => { if (f.elements.s2.value !== f.elements.s3.value) { toast("As senhas novas não são iguais."); return false; } const { error } = await SB.auth.updateUser({ password: f.elements.s2.value }); if (error) throw error; audit("Trocou a senha", ME.email); f.reset(); return "Senha alterada."; }),
  mfaok: authForm(async f => { const { error } = await SB.auth.mfa.challengeAndVerify({ factorId: ui.enroll.id, code: f.elements.code.value.trim() }); if (error) throw error; ui.enroll = null; ui.fatores = null; audit("Ativou verificação em duas etapas", ME.email); return "Verificação em duas etapas ativada."; }),
  apagar: async f => { if (f.elements.conf.value !== "APAGAR") { toast("Digite APAGAR para confirmar."); return false; } closeLayer(); const n = vazio(ME.nome, FAM.inicio); n.categorias = S.categorias; n.regras = S.regras; n.pessoas = S.pessoas; await substituirDados(n, "Apagou todos os dados financeiros"); return "Dados financeiros apagados."; },
  convite: async f => { const email = f.elements.email.value.trim().toLowerCase(), nome = f.elements.nome.value.trim(); if (ui.membros.some(m => m.email.toLowerCase() === email)) { toast("Essa pessoa já tem acesso."); return false; } const { data, error } = await SB.from("convites").insert({ familia_id: FAM.id, email, nome, papel: f.elements.acesso.value }).select().single(); if (error) { toast("Erro: " + error.message); return false; } ui.convites.push(data); if (!S.pessoas.some(p => norm(p.nome) === norm(nome))) S.pessoas.push({ id: uid("ps"), nome, acesso: "Convidado", login: email }); audit("Convidou pessoa", nome, email); return `Convite criado. Envie o endereço ${URL_APP()} para ${nome}.`; },
  novapessoa: f => { const nome = f.elements.nome.value.trim(); if (S.pessoas.some(p => norm(p.nome) === norm(nome))) { toast("Já existe."); return false; } S.pessoas.push({ id: uid("ps"), nome, acesso: "Sem login", login: "" }); audit("Adicionou responsável", nome); return "Responsável adicionado."; },
  novaconta: f => { const E = f.elements, v = parseBRL(E.saldo.value) || 0, id = f.dataset.id;
    if (id) { const c = S.contas.find(x => x.id === id); Object.assign(c, { nome: E.nome.value.trim(), tipo: E.tipo.value, inst: E.inst.value.trim(), resp: E.resp.value, caixa: E.caixa.checked, saldoIni: v, dataIni: E.data.value }); audit("Editou conta", c.nome); return "Conta atualizada."; }
    S.contas.push({ id: uid("c"), nome: E.nome.value.trim(), tipo: E.tipo.value, inst: E.inst.value.trim(), resp: E.resp.value, caixa: E.caixa.checked, saldoIni: v, dataIni: E.data.value }); audit("Criou conta", E.nome.value, "saldo inicial " + fmt(v)); return "Conta criada."; },
  novocartao: f => { const E = f.elements, l = parseBRL(E.limite.value), fe = +E.fecha.value, ve = +E.vence.value; if (!(l > 0)) { toast("Informe o limite."); return false; } if (fe === ve) { toast("Fechamento e vencimento precisam ser em dias diferentes."); return false; }
    const dados = { nome: E.nome.value.trim(), inst: E.inst.value.trim(), resp: E.resp.value, limite: l, fecha: fe, vence: ve, pagaCom: E.paga.value, final: E.final.value };
    if (f.dataset.id) { const c = cardOf(S, f.dataset.id); Object.assign(c, dados); audit("Editou cartão", c.nome, `fecha ${fe} · vence ${ve}`); return "Cartão atualizado."; }
    const c = { id: uid("k"), status: "Ativo", ...dados }; S.cartoes.push(c); ui.card = c.id; audit("Criou cartão", c.nome, `fecha ${fe} · vence ${ve}`); return "Cartão criado."; },
});

// ---------- eventos ----------
document.addEventListener("click", e => {
  const el = e.target.closest("[data-go],[data-act],[data-calc],[data-close],[data-open],[data-imp],[data-card]");
  if (!el) { if (ui.userMenu && !e.target.closest(".user")) { ui.userMenu = false; render(); } return; }
  const d = el.dataset;
  if ("close" in d) { closeLayer(); return; }
  if (d.imp !== undefined) { const [fi, i] = d.imp.split(":").map(Number), it = S.pend.arquivos[fi].itens[i]; if (d.to === "skip" && it.st !== "skip") it.orig = it.st; if (d.to === "ok" && it.st === "comp") { it.comp = null; it.note = ""; } it.st = d.to; render(); return; }
  if (d.go) { if (d.card) { ui.card = d.card; ui.cardKey = d.key || null; } if (d.aj) ui.aj = d.aj; go(d.go); return; }
  if (d.card) { ui.card = d.card; ui.cardKey = null; render(); return; }
  if (d.calc) { calcDrawer(d.calc); return; }
  if (d.open) { openItem(d.open); return; }
  if (d.act && acts[d.act]) { e.preventDefault(); acts[d.act](d.arg); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeLayer(); if (ui.more || ui.userMenu) { ui.more = ui.userMenu = false; render(); } }
  if (e.key === "Enter" && e.target.matches("tr[data-open],tr[data-act]")) e.target.click();
  if (e.key === "Enter" && e.target.id === "busca") { ui.lf.q = e.target.value.trim(); go("lancamentos"); setTimeout(() => { const b = document.getElementById("busca"); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 0); }
});
document.addEventListener("submit", async e => {
  const f = e.target, name = f.dataset.form; if (!name || !forms[name]) return;
  e.preventDefault();
  if (somenteLeitura() && !FORMS_LEITURA.has(name)) { toast(msgLeitura()); return; }
  const btn = f.querySelector("button:not([type=button])"); if (btn) btn.disabled = true;
  let msg;
  try { msg = await forms[name](f); } catch (err) { console.error(err); toast("Erro: " + (err.message || err)); msg = false; }
  if (btn && document.body.contains(btn)) btn.disabled = false;
  if (msg === false) return;
  if (name !== "editlanc" && name !== "editparc") closeLayer();
  commit(msg);
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "hz") { ui.hz = t.value; render(); if (t.value === "periodo") document.getElementById("hz-ini")?.focus(); }
  else if (t.id && t.id.startsWith("f-")) { ui.lf[t.id.slice(2)] = t.value; render(); }
  else if (t.id === "compmes") { ui.compMes = t.value; render(); }
  else if (t.id === "varmes") { const v = parseBRL(t.value); if (v >= 0) { ui.varMes = v; render(); } }
  else if (t.id === "simorc") { const v = parseBRL(t.value); if (v > 0) { ui.simOrc = v; render(); } }
  else if (t.dataset.impimg !== undefined) {
    const [fi, i, campo] = t.dataset.impimg.split(":"), a = S.pend.arquivos[+fi], r = a.raw[+i]; if (!r) return;
    if (campo === "d") r.d = t.value || ""; else if (campo === "desc") r.desc = t.value.trim();
    else if (campo === "parc") { const m = t.value.match(/(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i); r.parc = m && +m[1] >= 1 && +m[2] >= 2 && +m[2] <= 48 && +m[1] <= +m[2] ? { k: +m[1], n: +m[2] } : null; if (t.value.trim() && !r.parc) toast("Parcela no formato 07/08 (parcela atual / total, até 48)."); }
    else { const v = parseValor(t.value); r.vs = isNaN(v) ? 0 : v; }
    reanalisa(a); render();
  }
  else if (t.dataset.impCat !== undefined) { const [fi, i] = t.dataset.impCat.split(":").map(Number); S.pend.arquivos[fi].itens[i].cat = t.value; }
  else if (t.dataset.impfileDest !== undefined) { const a = S.pend.arquivos[+t.dataset.impfileDest]; a.destino = t.value; const c = cardOf(S, a.destino); a.fatura = c ? adivinhaFatura(c, a.raw) : null; reanalisa(a); render(); }
  else if (t.dataset.impfileFat !== undefined) { const a = S.pend.arquivos[+t.dataset.impfileFat]; a.fatura = t.value; if (a.img) a.raw.forEach(r => r.fat = t.value); reanalisa(a); render(); }
  else if (t.id === "arquivos" && t.files.length) { lerArquivos([...t.files]); t.value = ""; }
  else if (t.form && t.form.id === "fnovo") { if (t.name === "cat") t.dataset.touched = "1"; novoHint(); }
});
document.addEventListener("input", e => { const t = e.target; if (t.dataset && "cpf" in t.dataset) { const d = soDigitos(t.value).slice(0, 11); t.value = d.length > 9 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d.length > 6 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}.${d.slice(3)}` : d; t.setCustomValidity(d.length === 11 && !cpfValido(d) ? "CPF inválido" : ""); } });
document.addEventListener("input", e => { if (e.target.form && e.target.form.id === "fnovo" && (e.target.name === "desc" || e.target.name === "valor")) novoHint(); });
document.addEventListener("paste", e => {
  if (ui.screen !== "app" || !e.clipboardData) return;
  const files = [...e.clipboardData.items].filter(i => i.kind === "file" && i.type.startsWith("image/")).map(i => { const f = i.getAsFile(); return f && new File([f], nomePrint(i.type), { type: i.type }); }).filter(Boolean);
  if (!files.length) return;
  if (e.target.matches && e.target.matches("textarea, input:not([type=file])") && ui.view !== "importar") return;
  e.preventDefault();
  if (somenteLeitura()) return toast(msgLeitura());
  if (!S.contas.length && !S.cartoes.length) return toast("Cadastre primeiro uma conta ou um cartão em Configurações.");
  if (ui.view !== "importar") go("importar");
  lerArquivos(files);
});
document.addEventListener("dragover", e => { const z = e.target.closest && e.target.closest("#dropzone"); if (z) { e.preventDefault(); z.classList.add("over"); } });
document.addEventListener("dragleave", e => { const z = e.target.closest && e.target.closest("#dropzone"); if (z) z.classList.remove("over"); });
document.addEventListener("drop", e => { const z = e.target.closest && e.target.closest("#dropzone"); if (z) { e.preventDefault(); z.classList.remove("over"); if (e.dataTransfer.files.length) lerArquivos([...e.dataTransfer.files]); } });
window.addEventListener("focus", () => { if (ui.screen === "app" && ui.salvando === "ok" && !document.querySelector("#layer .modal,#layer .drawer") && !S.pend && Date.now() - (window._ultimaCarga || 0) > 120000) { window._ultimaCarga = Date.now(); DB.carregar(FAM, ME.nome).then(n => { n.pend = S.pend; S = n; render(); }).catch(() => {}); } });
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
// começa depois que todos os scripts (conversa, administração) carregaram
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
