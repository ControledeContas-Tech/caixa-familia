// ================= PAINEL COM PERÍODO POR QUADRO + TELA ANÁLISES =================
// Cada quadro do Painel tem o seu próprio período (lembrado por pessoa, neste aparelho).
// A tela Análises é um quadro livre: vários visuais lado a lado, cada um com seu período.
// Os visuais da Análise são da família (João e Manu veem os mesmos).

(function () {
  // ---------- menu e estilos ----------
  IC.analises = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';
  const iImp = VIEWS.findIndex(v => v[0] === "importar");
  VIEWS.splice(iImp < 0 ? VIEWS.length : iImp, 0, ["analises", "Análises"]);
  IC.cal = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>';
  const css = document.createElement("style");
  css.textContent = `
.pf{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:99px;padding:2px 9px 2px 7px;font-size:11.5px;font-weight:500;white-space:nowrap;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;letter-spacing:0;text-transform:none}
.pf svg{width:13px;height:13px;flex:none}
.pf:hover{border-color:var(--ink);color:var(--ink)}
.pf.on{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}
div.kpi{cursor:default}
.kpi-top{display:flex;justify-content:space-between;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.kpi .v.go{cursor:pointer;color:inherit}
.kpi .v.go:hover{text-decoration:underline}
.strip .si{background:var(--surface);padding:10px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
.strip .si-top{display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap}
.strip .si .si-v{border:0;background:none;padding:0;text-align:left;font:inherit;cursor:pointer;display:block}
.strip .si .pf{flex-direction:row;padding:2px 9px 2px 7px;border:1px solid var(--line);gap:5px;align-items:center;border-radius:99px;font-size:11.5px}
.strip .si .pf.on{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}
.pf-datas input[type=date]{width:auto;flex:1 1 150px}
.strip .si-v:hover b{text-decoration:underline}
.strip .si.aneg{background:var(--warn-soft)}
.painel-barra{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:-4px 0 10px;font-size:12.5px;color:var(--muted)}
.painel-barra .row-actions{gap:6px}
.painel-barra svg,.an-barra svg,.mini svg{width:14px;height:14px;vertical-align:-2px;flex:none}
.pf-opc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.pf-opc label{display:flex;gap:8px;align-items:center;justify-content:flex-start;text-align:left;font-weight:500;color:var(--ink);font-size:13px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;cursor:pointer;font-size:13px}
.form .pf-opc input[type=radio]{width:auto;flex:none;margin:0;padding:0}
.pf-opc label:has(input:checked){border-color:var(--accent);background:var(--accent-soft)}
.pf-datas{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.an-barra{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.an-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.an-card{margin:0}
.an-card .panel-head{flex-wrap:wrap;gap:8px}
.an-card .an-acts{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.an-tot{font:500 20px/1.2 var(--f-num);font-variant-numeric:tabular-nums;margin:0 0 10px}
.an-tot span{font:400 12px var(--f-body);color:var(--muted);margin-left:6px}
@media (max-width:900px){.an-grid{grid-template-columns:1fr}.pf-opc{grid-template-columns:1fr}}`;
  document.head.appendChild(css);
  FORMS_LEITURA.add("pf"); FORMS_LEITURA.add("anovo");

  // ---------- períodos ----------
  const fimMes = ym => mk(ym, 31), iniMes = ym => ym + "-01";
  const PER = {
    mes: ["Este mês", () => [iniMes(CUR), fimMes(CUR)]],
    mesant: ["Mês passado", () => [iniMes(addYM(CUR, -1)), fimMes(addYM(CUR, -1))]],
    prox: ["Próximo mês", () => [iniMes(addYM(CUR, 1)), fimMes(addYM(CUR, 1))]],
    ate_fim: ["Até o fim do mês (com atrasadas)", () => [null, fimMes(CUR)]],
    ate_prox: ["Até o fim do próximo mês (com atrasadas)", () => [null, fimMes(addYM(CUR, 1))]],
    d30: ["Próximos 30 dias", () => [TODAY, addDays(TODAY, 30)]],
    u30: ["Últimos 30 dias", () => [addDays(TODAY, -30), TODAY]],
    m2: ["Mês passado e este", () => [iniMes(addYM(CUR, -1)), fimMes(CUR)]],
    m3: ["Últimos 3 meses", () => [iniMes(addYM(CUR, -2)), fimMes(CUR)]],
    m6: ["Últimos 6 meses", () => [iniMes(addYM(CUR, -5)), fimMes(CUR)]],
    ano: ["Este ano", () => [CUR.slice(0, 4) + "-01-01", CUR.slice(0, 4) + "-12-31"]],
    tudo: ["Tudo", () => [null, null]],
    atual: ["Fatura atual de cada cartão", () => [null, null]],
    custom: ["Personalizado", null],
  };
  const DAT = {
    hoje: ["Hoje", () => TODAY],
    fimmes: ["Fim deste mês", () => fimMes(CUR)],
    fimant: ["Fim do mês passado", () => fimMes(addYM(CUR, -1))],
    fimprox: ["Fim do próximo mês", () => fimMes(addYM(CUR, 1))],
    custom: ["Data escolhida", null],
  };
  // quadros do Painel: tipo (período ou data), padrão e opções
  const Q = {
    caixa: ["data", "hoje", "Saldo de caixa"],
    comp: ["per", "ate_fim", "Comprometido"],
    cartoes: ["per", "tudo", "Devemos nos cartões"],
    receitas: ["per", "mes", "Receitas"],
    divs: ["per", "tudo", "Saldo devedor das dívidas"],
    patr: ["data", "hoje", "Patrimônio investido"],
    pago: ["per", "mes", "Pago"],
    pend: ["per", "ate_fim", "Contas pendentes"],
    fat: ["per", "atual", "Faturas em aberto"],
    futuras: ["per", "tudo", "Parcelas futuras"],
    aneg: ["data", "hoje", "Dívidas a Negociar"],
    ccards: ["per", "atual", "Cartões de crédito"],
    prox: ["per", "ate_prox", "Próximos compromissos"],
    gcat: ["per", "mes", "Gastos por categoria"],
    rxg: ["per", "m2", "Receitas × gastos"],
  };
  const COM_ATUAL = new Set(["fat", "ccards", "cartoes", "futuras"]);
  const opcoesPer = key => Object.keys(PER).filter(k => k !== "atual" || COM_ATUAL.has(key));

  const chavePF = () => "caixa-pf-" + (ME ? ME.id : "anon");
  let PF = null;
  const pfMapa = () => { if (!PF || PF._k !== chavePF()) { try { PF = JSON.parse(localStorage.getItem(chavePF()) || "{}"); } catch (e) { PF = {}; } PF._k = chavePF(); } return PF; };
  const pfGravar = () => { try { const { _k, ...r } = PF; localStorage.setItem(PF._k, JSON.stringify(r)); } catch (e) {} };

  const cm = iso => ymLabel(ymOf(iso));
  // resolve uma configuração {p, ini, fim, data} → { ini, fim, data, atual, rot, texto }
  function resolve(tipo, c) {
    if (tipo === "data") {
      const p = DAT[c.p] ? c.p : "hoje", data = p === "custom" ? (c.data || TODAY) : DAT[p][1]();
      return { data, ini: null, fim: data, rot: data === TODAY ? "hoje" : "em " + br(data), texto: data === TODAY ? "hoje" : "em " + br(data) };
    }
    const p = PER[c.p] ? c.p : "mes";
    let [ini, fim] = p === "custom" ? [c.ini || null, c.fim || null] : PER[p][1]();
    if (ini && fim && fim < ini) [ini, fim] = [fim, ini];
    let rot;
    if (p === "tudo") rot = "Tudo"; else if (p === "atual") rot = "Fatura atual";
    else if (!ini && fim) rot = "até " + br(fim).slice(0, 5);
    else if (ini && !fim) rot = "desde " + br(ini).slice(0, 5);
    else if (ini.slice(8) === "01" && fim === fimMes(ymOf(fim))) rot = ymOf(ini) === ymOf(fim) ? cm(ini) : cm(ini).slice(0, 3) + "–" + cm(fim);
    else rot = br(ini).slice(0, 5) + " a " + br(fim).slice(0, 5);
    const texto = p === "tudo" ? "em todo o período" : p === "atual" ? "na fatura atual" : !ini ? "até " + br(fim) + " (inclui atrasadas)" : "de " + br(ini) + " a " + br(fim);
    return { ini, fim, atual: p === "atual", tudo: p === "tudo", rot, texto };
  }
  const pfDe = key => { const [t, pad] = Q[key]; return resolve(t, pfMapa()[key] || { p: pad }); };
  const chip = (act, arg, r, on) => `<button class="pf ${on ? "on" : ""}" data-act="${act}" data-arg="${arg}" title="Mudar o período deste quadro">${icon("cal")}${esc(r.rot)}</button>`;
  const qchip = key => chip("pf", key, pfDe(key), !!pfMapa()[key]);

  // ---------- cálculos com período ----------
  const dentro = (r, d) => !!d && (!r.ini || d >= r.ini) && (!r.fim || d <= r.fim);
  function compsDe(r) {
    const ini0 = ymOf(S.inicio), from = r.ini && ymOf(r.ini) > ini0 ? ymOf(r.ini) : ini0, to = r.fim ? ymOf(r.fim) : addYM(CUR, 36);
    return to < from ? [] : compromissos(S, from, to).filter(c => dentro(r, c.venc));
  }
  const abertasDe = card => faturasDo(S, card, ymOf(S.inicio) < "2026-04" ? ymOf(S.inicio) : "2026-04", addYM(CUR, 48)).filter(f => f.saldo > 0);
  function gastosDe(r) {
    const rows = [];
    for (const l of S.lanc) if (!l.excluido && l.conta && !l.cartao && l.tipo === "despesa" && dentro(r, l.data) && !String(l.conta).startsWith("inv")) rows.push({ cat: l.cat || "Sem categoria", valor: l.valor, resp: l.resp, onde: nomeDe(l.conta), desc: l.desc, data: l.data });
    const k0 = r.ini ? ymOf(r.ini) : primeiroMes(), k1 = r.fim ? ymOf(r.fim) : CUR;
    for (const c of S.cartoes) for (let k = k0; k <= k1; k = addYM(k, 1)) for (const i of fatura(S, c, k).itens) rows.push({ cat: i.cat || "Sem categoria", valor: i.valor, resp: i.resp, onde: c.nome, desc: i.desc + (i.parc ? ` ${pad(i.parc[0])}/${pad(i.parc[1])}` : ""), data: i.data });
    return rows;
  }
  const mesesDe = (r, max = 12) => { const a = r.ini ? ymOf(r.ini) : primeiroMes(), b = r.fim ? ymOf(r.fim) : CUR, out = []; for (let m = a; m <= b; m = addYM(m, 1)) out.push(m); return out.slice(-max); };
  const agrupa = (rows, campo) => { const g = {}; rows.forEach(x => { const k = x[campo] || (campo === "resp" ? "Sem responsável" : "Outros"); g[k] = (g[k] || 0) + x.valor; }); return Object.entries(g).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]); };

  const M = {
    caixa: r => { const n = S.contas.filter(c => c.caixa).length; return { v: sum(S.contas.filter(c => c.caixa), c => saldoConta(S, c, r.data)), s: `${n} ${n === 1 ? "conta disponível" : "contas disponíveis"} · ${r.texto}` }; },
    comp: r => { const cs = compsDe(r).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0); return { v: sum(cs, c => c.restante), s: `${cs.length} compromissos ${r.texto}` }; },
    cartoes: r => { let v = 0, n = 0; for (const c of S.cartoes) { const fs = r.atual ? [cardResumo(S, c).atual].filter(f => f.saldo > 0) : abertasDe(c).filter(f => dentro(r, f.vence)); v += sum(fs, f => f.saldo); n += fs.length; } return { v, s: `${n} ${n === 1 ? "fatura" : "faturas"} em aberto · ${r.texto}` }; },
    receitas: r => { const real = sum(S.lanc.filter(l => !l.excluido && l.tipo === "receita" && dentro(r, l.data)), l => l.valor), prev = sum(compsDe(r).filter(c => c.tipo === "receita" && c.status !== "cancelada"), c => c.valor); return { v: real, s: `de ${fmt(prev)} previstas · ${r.texto}` }; },
    divs: r => { const pag = S.dividas.filter(d => divEtapa(d) === "pagamento"); if (r.tudo) return { v: sum(pag, d => divResumo(S, d).falta), s: `falta pagar em ${pag.length} ${pag.length === 1 ? "dívida" : "dívidas"}` }; const cs = compsDe(r).filter(c => c.kind === "div" && ativo(c) && c.restante > 0); return { v: sum(cs, c => c.restante), s: `${cs.length} parcelas ${r.texto}` }; },
    patr: r => ({ v: sum(S.invest, i => investSaldo(i, r.data)), s: `${S.invest.length} aplicações · ${r.texto}` }),
    pago: r => ({ v: sum(S.lanc.filter(l => !l.excluido && dentro(r, l.data) && ((l.tipo === "despesa" && !l.cartao && l.conta) || (l.tipo === "transferencia" && S.cartoes.some(c => c.id === l.destino)))), l => l.valor) }),
    pend: r => ({ v: sum(compsDe(r).filter(c => c.kind !== "fat" && c.tipo === "despesa" && ativo(c) && c.restante > 0), c => c.restante) }),
    fat: r => ({ v: sum(S.cartoes, c => r.atual ? cardResumo(S, c).atual.saldo : sum(abertasDe(c).filter(f => dentro(r, f.vence)), f => f.saldo)) }),
    futuras: r => ({ v: sum(S.cartoes, c => { const at = cardResumo(S, c).atual.key; return sum(abertasDe(c).filter(f => f.key > at && (r.tudo || r.atual || dentro(r, f.vence))), f => f.saldo); }) }),
    aneg: r => { const ds = S.dividas.filter(d => divEtapa(d) === "negociar" && (!d.desde || d.desde <= r.data)); return { v: sum(ds, d => d.saldo), n: ds.length }; },
  };

  // ---------- Painel ----------
  function kpi(key, titulo, act) {
    const m = M[key](pfDe(key));
    return `<div class="kpi"><div class="kpi-top"><span class="eyebrow">${titulo}</span>${qchip(key)}</div><button class="v num go" ${act}>${fmt(m.v)}</button><span class="s">${m.s || ""}</span></div>`;
  }
  function si(key, titulo, act, cls = "", extra = "") {
    const m = M[key](pfDe(key));
    return `<div class="si ${cls}"><div class="si-top"><span>${titulo}</span>${qchip(key)}</div><button class="si-v" ${act}><b class="num">${fmt(m.v)}</b>${extra ? `<span class="sub"> ${extra(m)}</span>` : ""}</button></div>`;
  }
  function vPainel2() {
    const sl = saldoLivre(S, hzDate());
    const passos = [[S.contas.length > 0, "Cadastre as contas e o dinheiro em espécie", "ajustes", "contas"], [S.cartoes.length > 0, "Cadastre os cartões com fechamento e vencimento", "ajustes", "cartoes"], [S.rec.length > 0, "Registre as contas fixas e os salários", "contas", "rec"], [S.lanc.length > 0 || S.parc.length > 0, "Importe um extrato ou fatura (CSV/OFX)", "importar", ""]];
    const bemvindo = passos.every(p => p[0]) ? "" : `<section class="panel start">${head("Primeiros passos", `<span class="hint">${passos.filter(p => p[0]).length} de ${passos.length}</span>`)}<ol class="steps">${passos.map(([ok, t, v, a]) => `<li class="${ok ? "ok" : ""}"><span>${t}</span>${ok ? '<span class="pill p-good">Feito</span>' : `<button class="mini primary" data-go="${v}" ${v === "ajustes" ? `data-aj="${a}"` : ""} ${v === "contas" ? 'data-act="comptab" data-arg="rec"' : ""}>Fazer agora</button>`}</li>`).join("")}</ol></section>`;
    const mudados = Object.keys(pfMapa()).filter(k => k !== "_k" && Q[k]).length;
    // cartões
    const rc = pfDe("ccards"), maxL = Math.max(1, ...S.cartoes.map(c => c.limite));
    const linhas = S.cartoes.map(c => {
      const res = cardResumo(S, c), ab = abertasDe(c);
      if (rc.atual) return { c, rot: `Fatura ${ymLabel(res.atual.key)} ${pill(res.atual.status)} · vence ${brs(res.atual.vence)}`, a: res.atual.saldo, b: res.futuras, disp: res.disponivel };
      const sel = ab.filter(f => dentro(rc, f.vence)), depois = ab.filter(f => rc.fim && f.vence > rc.fim);
      return { c, rot: sel.length ? `${sel.length} ${sel.length === 1 ? "fatura" : "faturas"} · ${sel.map(f => ymLabel(f.key)).join(", ")}` : "Nenhuma fatura em aberto no período", a: sum(sel, f => f.saldo), b: sum(depois, f => f.saldo), disp: res.disponivel };
    });
    // próximos compromissos
    const rp = pfDe("prox"), prox = compsDe(rp).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0);
    // gastos por categoria e receitas × gastos
    const rg = pfDe("gcat"), cats = agrupa(gastosDe(rg), "cat").slice(0, 8).map(([k, v]) => ({ k, l: k, v }));
    const rx = pfDe("rxg"), meses = mesesDe(rx).map(ym => ({ l: ymLabel(ym) + (ym === CUR ? " (até hoje)" : ""), v: [receitasMes(S, ym), sum(gastosMes(S, ym), r => r.valor)] }));

    return `${topbar("Painel", "Hoje, " + br(TODAY))}${bemvindo}
    <div class="painel-barra"><span>Cada quadro tem o seu período: toque na data no canto do quadro para mudar.${mudados ? ` <b>${mudados} ${mudados === 1 ? "quadro" : "quadros"} fora do padrão.</b>` : ""}</span><span class="row-actions"><button class="mini" data-act="pftodos">Mesmo período em todos</button>${mudados ? `<button class="mini ghost" data-act="pfpadrao">Voltar ao padrão</button>` : ""}<button class="mini" data-go="analises">${icon("analises")} Análises</button></span></div>
    <section class="kpis" aria-label="Indicadores principais">
      <div class="kpi hero">
        <div class="hero-top"><span class="eyebrow">Saldo livre estimado</span><select id="hz" aria-label="Período do saldo livre">${opts(Object.entries(HZ).map(([k, v]) => [k, v[0]]), ui.hz)}</select></div>
        ${ui.hz === "periodo" ? `<form class="hz-form" data-form="periodo"><label class="sr" for="hz-ini">Data inicial</label><input id="hz-ini" name="ini" type="date" value="${ui.hzIni}" required><span>a</span><label class="sr" for="hz-fim">Data final</label><input id="hz-fim" name="fim" type="date" value="${ui.hzFim}" required><button class="mini primary">Aplicar</button></form>` : ""}
        <button class="v num" data-calc="livre">${fmt(sl.livre)}</button>
        <span class="s">Quanto dá para gastar ${hzTexto()} sem faltar para os compromissos${ui.hz === "periodo" && ui.hzIni > TODAY ? " do período e os que vencem antes dele" : ""}. Não conta os ${fmt(sl.aReceber)} que ainda vão entrar. Este período vale só para este quadro.</span>
        <button class="how" data-calc="livre">Ver memória de cálculo →</button>
      </div>
      ${kpi("caixa", "Saldo de caixa", 'data-calc="caixa"')}
      ${kpi("comp", "Comprometido", 'data-go="contas"')}
      ${kpi("cartoes", "Devemos nos cartões", 'data-go="cartoes"')}
      ${kpi("receitas", "Receitas", 'data-go="contas"')}
      ${kpi("divs", "Saldo devedor das dívidas", 'data-go="dividas"')}
      ${kpi("patr", "Patrimônio investido", 'data-go="investimentos"')}
    </section>
    <section class="strip" aria-label="Outros indicadores">
      ${si("pago", "Pago", 'data-go="lancamentos"')}
      ${si("pend", "Contas pendentes", 'data-go="contas"')}
      ${si("fat", "Faturas em aberto", 'data-go="cartoes"')}
      ${si("futuras", "Parcelas futuras", 'data-go="cartoes"')}
      ${si("aneg", "Dívidas a Negociar", 'data-go="dividas" title="Fora das contas até vocês decidirem como pagar"', "aneg", m => `· ${m.n} fora das contas`)}
    </section>
    <div class="grid2">
      <section class="panel">
        ${head("Cartões de crédito", qchip("ccards"))}
        <div class="cards">${S.cartoes.length ? "" : `<p class="note">Nenhum cartão cadastrado. <button class="linkbtn" data-go="ajustes" data-aj="cartoes">Cadastrar cartão</button></p>`}${linhas.map(x => `
          <button class="cardrow" data-go="cartoes" data-card="${x.c.id}">
            <span class="cr-n"><b>${esc(x.c.nome)}</b><span class="meta">${x.rot}</span></span>
            <span class="barcell"><span class="bar" style="width:${(x.c.limite / maxL * 100).toFixed(1)}%"><span class="a" style="width:${Math.min(100, x.a / x.c.limite * 100).toFixed(1)}%"></span><span class="b" style="width:${Math.min(100, x.b / x.c.limite * 100).toFixed(1)}%"></span></span>
              <span class="meta">Disponível estimado ${fmt(x.disp)} de ${fmt(x.c.limite)}</span></span>
            <span class="amt"><b class="num">${fmt(x.a)}</b><span class="meta num">+ ${fmt(x.b)} ${rc.atual ? "futuras" : "depois"}</span></span>
          </button>`).join("")}</div>
        <div class="legend"><span><i></i>${rc.atual ? "Fatura atual" : "No período"}</span><span><i class="b"></i>${rc.atual ? "Parcelas e faturas seguintes" : "Faturas depois do período"}</span></div>
      </section>
      <section class="panel">
        ${head("Próximos compromissos", `<span class="an-acts">${qchip("prox")}<button class="mini" data-go="contas">Contas a pagar</button></span>`)}
        <div class="list">${prox.length ? "" : `<p class="note">Nada pendente ${rp.texto}.</p>`}${prox.slice(0, 8).map(c => `<div class="li"><span class="d num">${brs(c.venc)}</span><span class="t">${esc(c.desc)}${c.venc < TODAY ? ' <span class="pill p-crit">Vencida</span>' : ""}<span class="sub">${c.status === "parcial" ? "restante de " + fmt(c.valor) : c.origem}</span></span><span class="num">${fmt(c.restante)}</span></div>`).join("")}${prox.length > 8 ? `<p class="note">E mais ${prox.length - 8} (${fmt(sum(prox.slice(8), c => c.restante))}). Total: <b>${fmt(sum(prox, c => c.restante))}</b>.</p>` : ""}</div>
      </section>
    </div>
    <div class="grid2">
      <section class="panel">
        ${head("Gastos por categoria", `<span class="an-acts">${qchip("gcat")}<span class="hint">Cartão pela fatura do mês</span></span>`)}
        ${cats.length ? hbars(cats, ymOf(rg.ini || TODAY) === ymOf(rg.fim || TODAY) && ymOf(rg.fim || TODAY) === CUR ? "catmes" : "") : `<p class="note">Nenhum gasto registrado ${rg.texto}.</p>`}
      </section>
      <section class="panel chart">
        ${head("Receitas × gastos", `<span class="an-acts">${qchip("rxg")}<span class="legend inl"><span><i></i>Receitas</span><span><i class="c2"></i>Gastos</span></span></span>`)}
        ${meses.length ? groupChart(meses, [{ n: "Receitas", c: "var(--accent)" }, { n: "Gastos", c: "var(--c2)" }]) : `<p class="note">Sem meses no período.</p>`}
      </section>
    </div>`;
  }
  VIEWFN.painel = vPainel2;

  // ---------- janela de escolha de período ----------
  function formPF(alvo, titulo, tipo, atual, opcoes) {
    const lista = tipo === "data" ? Object.keys(DAT) : opcoes;
    const tab = tipo === "data" ? DAT : PER, p = atual.p && lista.includes(atual.p) ? atual.p : lista[0];
    return modal("Período · " + esc(titulo), `<form class="form" data-form="pf" data-alvo="${esc(alvo)}" data-tipo="${tipo}">
      <div class="field full"><div class="pf-opc" role="radiogroup">${lista.map(k => `<label><input type="radio" name="p" value="${k}" ${k === p ? "checked" : ""}> ${tab[k][0]}</label>`).join("")}</div></div>
      <div class="field full"><label>${tipo === "data" ? "Data escolhida" : "Personalizado"}</label><div class="pf-datas">${tipo === "data" ? `<input type="date" name="data" value="${atual.data || TODAY}" aria-label="Data">` : `<input type="date" name="ini" value="${atual.ini || iniMes(CUR)}" aria-label="De"><span>a</span><input type="date" name="fim" value="${atual.fim || fimMes(CUR)}" aria-label="Até">`}</div><div class="forma-help">${tipo === "data" ? "Mostra a posição nesse dia." : "As datas valem quando “Personalizado” está marcado."}</div></div>
      <div class="full row-actions"><button class="btn primary">Aplicar</button>${alvo.startsWith("q:") ? `<button type="button" class="btn" data-act="pfreset" data-arg="${esc(alvo.slice(2))}">Padrão deste quadro</button>` : ""}<button type="button" class="btn" data-close>Cancelar</button></div></form>`);
  }
  // escolher uma data/período personalizado já marca "Personalizado"
  document.addEventListener("input", e => { const f = e.target.form; if (f && f.dataset.form === "pf" && e.target.type === "date") { const r = f.querySelector('input[name=p][value=custom]'); if (r) r.checked = true; } });

  Object.assign(forms, {
    pf(f) {
      const E = f.elements, alvo = f.dataset.alvo, tipo = f.dataset.tipo, p = E.p.value;
      const conf = { p };
      if (p === "custom") { if (tipo === "data") { if (!E.data.value) return toast("Escolha a data."), false; conf.data = E.data.value; } else { if (!E.ini.value || !E.fim.value) return toast("Informe as duas datas."), false; conf.ini = E.ini.value; conf.fim = E.fim.value; } }
      closeLayer();
      if (alvo === "todos") { const m = pfMapa(); for (const [k, [t]] of Object.entries(Q)) if (t === "per") m[k] = { ...conf }; pfGravar(); render(); toast("Período aplicado a todos os quadros do Painel (menos o saldo livre, que tem o seu)."); return false; }
      if (alvo.startsWith("q:")) { const k = alvo.slice(2), m = pfMapa(); if (p === Q[k][1]) delete m[k]; else m[k] = conf; pfGravar(); render(); return false; }
      if (alvo.startsWith("a:")) { const v = AN.lista().find(x => x.id === alvo.slice(2)); if (v) { v.pf = conf; AN.gravar(); } render(); return false; }
      return false;
    },
  });
  Object.assign(acts, {
    pf: key => formPF("q:" + key, Q[key][2], Q[key][0], pfMapa()[key] || { p: Q[key][1] }, opcoesPer(key)),
    pfreset: key => { delete pfMapa()[key]; pfGravar(); closeLayer(); render(); },
    pftodos: () => formPF("todos", "todos os quadros", "per", { p: "mes" }, Object.keys(PER).filter(k => k !== "atual")),
    pfpadrao: () => { const m = pfMapa(); for (const k of Object.keys(m)) if (k !== "_k") delete m[k]; pfGravar(); render(); toast("Todos os quadros voltaram ao período padrão."); },
  });

  // ---------- ANÁLISES ----------
  const VIS = {
    gcat: { n: "Gastos por categoria", t: "per", pad: "mes" },
    gresp: { n: "Gastos por responsável", t: "per", pad: "mes" },
    gonde: { n: "Gastos por cartão ou conta", t: "per", pad: "mes" },
    top: { n: "Maiores gastos", t: "per", pad: "mes" },
    rxg: { n: "Receitas × gastos por mês", t: "per", pad: "m6" },
    comp: { n: "Compromissos por tipo", t: "per", pad: "ate_fim" },
    caixa: { n: "Saldo de caixa no fim de cada mês", t: "per", pad: "m6" },
    divs: { n: "Dívidas por etapa", t: "data", pad: "hoje" },
  };
  const PADRAO = [{ id: "a1", tipo: "gcat", pf: { p: "mes" } }, { id: "a2", tipo: "gcat", pf: { p: "mesant" } }, { id: "a3", tipo: "rxg", pf: { p: "m6" } }, { id: "a4", tipo: "top", pf: { p: "mes" } }];
  const AN = {
    _l: null, _fam: null,
    lista() { const fid = FAM && FAM.id; if (this._l && this._fam === fid) return this._l; const c = FAM && FAM.config && Array.isArray(FAM.config.analises) ? FAM.config.analises : null; let l = c; if (!l) { try { l = JSON.parse(localStorage.getItem("caixa-analises-" + fid) || "null"); } catch (e) {} } this._l = (l || PADRAO).filter(v => VIS[v.tipo]).map(v => ({ ...v })); this._fam = fid; return this._l; },
    recarregar() { this._l = null; },
    async gravar() {
      const l = this._l.map(({ id, tipo, pf, titulo }) => ({ id, tipo, pf, titulo }));
      try { localStorage.setItem("caixa-analises-" + FAM.id, JSON.stringify(l)); } catch (e) {}
      if (FAM.config) FAM.config.analises = l; else FAM.config = { analises: l };
      if (ui.adminVendo) return;
      const { error } = await SB.rpc("salvar_config", { p_familia: FAM.id, p_chave: "analises", p_valor: l });
      if (error) toast("A análise ficou só neste aparelho: não foi possível compartilhar com a família.", "erro", explicaErro("analises: " + error.message));
    },
  };
  window.ANALISES = AN;

  const vazioNota = r => `<p class="note">Nada ${r.texto}.</p>`;
  const RENDER = {
    gcat: r => { const g = agrupa(gastosDe(r), "cat"); return g.length ? `<div class="an-tot">${fmt(sum(g, x => x[1]))}<span>${g.length} categorias</span></div>` + hbars(g.slice(0, 10).map(([k, v]) => ({ k, l: k, v }))) : vazioNota(r); },
    gresp: r => { const g = agrupa(gastosDe(r), "resp"); return g.length ? `<div class="an-tot">${fmt(sum(g, x => x[1]))}</div>` + hbars(g.map(([k, v]) => ({ k, l: k, v }))) : vazioNota(r); },
    gonde: r => { const g = agrupa(gastosDe(r), "onde"); return g.length ? `<div class="an-tot">${fmt(sum(g, x => x[1]))}</div>` + hbars(g.map(([k, v]) => ({ k, l: k, v }))) : vazioNota(r); },
    top: r => { const rows = gastosDe(r).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 10); return rows.length ? `<div class="list">${rows.map(x => `<div class="li"><span class="d num">${x.data ? brs(x.data) : ""}</span><span class="t">${esc(x.desc)}<span class="sub">${esc(x.cat)} · ${esc(x.onde)}</span></span><span class="num">${fmt(x.valor)}</span></div>`).join("")}</div>` : vazioNota(r); },
    rxg: r => { const ms = mesesDe(r).map(ym => ({ l: ymLabel(ym), v: [receitasMes(S, ym), sum(gastosMes(S, ym), x => x.valor)] })); return ms.length ? `<span class="legend inl"><span><i></i>Receitas</span><span><i class="c2"></i>Gastos</span></span>` + groupChart(ms, [{ n: "Receitas", c: "var(--accent)" }, { n: "Gastos", c: "var(--c2)" }]) : vazioNota(r); },
    comp: r => { const cs = compsDe(r).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0), NOME = { rec: "Contas fixas", div: "Dívidas em pagamento", fat: "Faturas de cartão", man: "Contas avulsas" }, g = {}; cs.forEach(c => g[NOME[c.kind] || c.kind] = (g[NOME[c.kind] || c.kind] || 0) + c.restante); const e = Object.entries(g).sort((a, b) => b[1] - a[1]); return e.length ? `<div class="an-tot">${fmt(sum(cs, c => c.restante))}<span>${cs.length} compromissos</span></div>` + hbars(e.map(([k, v]) => ({ k, l: k, v }))) : vazioNota(r); },
    caixa: r => { const ms = mesesDe(r).filter(m => m <= CUR), pts = ms.map(ym => ({ l: ymLabel(ym), v: sum(S.contas.filter(c => c.caixa), c => saldoConta(S, c, ym === CUR ? TODAY : fimMes(ym))) })); return !pts.length ? vazioNota(r) : pts.length > 1 ? lineChart(pts) : groupChart(pts.map(p => ({ l: p.l, v: [p.v] })), [{ n: "Saldo", c: "var(--accent)" }]); },
    divs: r => { const neg = S.dividas.filter(d => divEtapa(d) === "negociar" && (!d.desde || d.desde <= r.data)), pag = S.dividas.filter(d => divEtapa(d) === "pagamento"); const rows = [{ k: "n", l: `A negociar (${neg.length})`, v: sum(neg, d => d.saldo) }, { k: "p", l: `Em pagamento · falta (${pag.length})`, v: sum(pag, d => divResumo(S, d).falta) }]; return rows.some(x => x.v) ? hbars(rows) + `<p class="note">A negociar fica fora das contas até vocês decidirem como pagar.</p>` : `<p class="note">Nenhuma dívida em aberto.</p>`; },
  };
  function vAnalises() {
    const l = AN.lista();
    return `${topbar("Análises", "Monte vários visuais lado a lado, cada um com o seu período. Os visuais são da família: João e Manu veem os mesmos.")}
      <div class="an-barra"><button class="btn primary" data-act="annovo">+ Adicionar visual</button><span class="hint">${l.length} ${l.length === 1 ? "visual" : "visuais"}</span></div>
      ${l.length ? `<div class="an-grid">${l.map((v, i) => { const def = VIS[v.tipo], r = resolve(def.t, v.pf || { p: def.pad }); return `<section class="panel an-card">
        ${head(esc(v.titulo || def.n), `<span class="an-acts">${chip("anpf", v.id, r, true)}<button class="mini ghost" data-act="ansubir" data-arg="${v.id}" ${i ? "" : "disabled"} title="Mover para cima" aria-label="Mover para cima">↑</button><button class="mini ghost" data-act="anduplicar" data-arg="${v.id}" title="Duplicar para comparar outro período">Duplicar</button><button class="mini ghost" data-act="anremover" data-arg="${v.id}">Remover</button></span>`)}
        ${RENDER[v.tipo](r)}</section>`; }).join("")}</div>` : `<section class="panel empty"><b>Nenhum visual</b><span>Adicione visuais para comparar períodos diferentes lado a lado.</span><button class="btn primary" data-act="annovo">Adicionar visual</button></section>`}`;
  }
  VIEWFN.analises = vAnalises;

  Object.assign(forms, {
    anovo(f) { const t = f.elements.tipo.value; AN.lista().push({ id: rid("an"), tipo: t, pf: { p: VIS[t].pad } }); AN.gravar(); closeLayer(); render(); toast("Visual adicionado. Toque no período dele para mudar."); return false; },
  });
  Object.assign(acts, {
    annovo: () => modal("Adicionar visual", `<form class="form" data-form="anovo">${field("Visual", `<select id="an-t" name="tipo">${opts(Object.entries(VIS).map(([k, v]) => [k, v.n]), "gcat")}</select>`, true, "an-t")}<div class="full row-actions"><button class="btn primary">Adicionar</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`),
    anpf: id => { const v = AN.lista().find(x => x.id === id), def = VIS[v.tipo]; formPF("a:" + id, v.titulo || def.n, def.t, v.pf || { p: def.pad }, Object.keys(PER).filter(k => k !== "atual")); },
    anduplicar: id => { const l = AN.lista(), i = l.findIndex(x => x.id === id); l.splice(i + 1, 0, { ...l[i], id: rid("an"), pf: { ...(l[i].pf || {}) } }); AN.gravar(); render(); },
    anremover: id => { const l = AN.lista(); l.splice(l.findIndex(x => x.id === id), 1); AN.gravar(); render(); },
    ansubir: id => { const l = AN.lista(), i = l.findIndex(x => x.id === id); if (i > 0) { [l[i - 1], l[i]] = [l[i], l[i - 1]]; AN.gravar(); render(); } },
  });
})();
