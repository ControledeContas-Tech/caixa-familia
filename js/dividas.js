// ================= DÍVIDAS POR ETAPAS =================
// 1. A negociar: a dívida existe, mas fica FORA das contas (saldo livre, comprometido, projeção).
// 2. Em pagamento: vocês decidiram como pagar (à vista, acordo ou parcelamento); as parcelas
//    entram em Contas a pagar e passam a contar no saldo livre.
// 3. Quitada: some das contas; fica só o histórico do que foi pago.

(function () {
  const iv = VIEWS.findIndex(v => v[0] === "dividas"); if (iv >= 0) VIEWS[iv][1] = "Dívidas";
  const css = document.createElement("style");
  css.textContent = `
.etapas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-bottom:16px}
.etapa{background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:0}
.etapa .n{font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:flex;gap:8px;align-items:center}
.etapa .n i{font-style:normal;width:20px;height:20px;border-radius:50%;display:inline-grid;place-items:center;background:var(--sunken);color:var(--ink);font-size:11px;letter-spacing:0}
.etapa .v{font:500 21px/1.2 var(--f-num);font-variant-numeric:tabular-nums}
.etapa .s{font-size:12px;color:var(--muted)}
.etapa.neg{background:var(--warn-soft)} .etapa.neg .n i{background:var(--warn);color:#fff}
.etapa.pag .n i{background:var(--accent);color:var(--accent-ink)}
.etapa.qt .n i{background:var(--good);color:#fff}
.div-prog{display:flex;flex-direction:column;gap:4px;min-width:110px}
.div-prog .bar{height:6px}
.xdel{font-size:13px;line-height:1;padding:5px 8px;color:var(--muted)}
.xdel:hover{color:var(--crit);border-color:var(--crit)}
.forma-help{font-size:12.5px;color:var(--muted);margin-top:-4px}
@media (max-width:760px){.etapas{grid-template-columns:1fr}}`;
  document.head.appendChild(css);

  const reais = v => v ? (v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  const desde = iso => { if (!iso) return "—"; const m = ymDiff(ymOf(iso), CUR); return br(iso) + `<div class="sub">${m <= 0 ? "este mês" : m < 12 ? `há ${m} ${m > 1 ? "meses" : "mês"}` : `há ${Math.floor(m / 12)} ano${m >= 24 ? "s" : ""}${m % 12 ? ` e ${m % 12} ${m % 12 > 1 ? "meses" : "mês"}` : ""}`}</div>`; };
  const PRIO = { Alta: 0, Média: 1, Baixa: 2 };
  const prioPill = p => `<span class="pill ${p === "Alta" ? "p-crit" : p === "Baixa" ? "p-mute" : "p-warn"}">${esc(p || "Média")}</span>`;
  const formaPill = d => `<span class="pill p-info">${esc(DECISOES[d.decisao] || DECISOES.contrato)}</span>`;
  const contasOpts = sel => opts(S.contas.map(c => [c.id, c.nome]), sel || (S.contas.find(c => c.caixa) || {}).id);
  const temPagamento = d => Object.keys(S.inst).some(k => k.startsWith(d.id + "|") && (S.inst[k].pag || []).length);
  const limparParcelas = d => { for (const k of Object.keys(S.inst)) if (k.startsWith(d.id + "|") && !(S.inst[k].pag || []).length) delete S.inst[k]; };
  const achar = id => S.dividas.find(x => x.id === id);

  // ---------- tela ----------
  function vDividas() {
    const neg = S.dividas.filter(d => divEtapa(d) === "negociar").sort((a, b) => (PRIO[a.prioridade] ?? 1) - (PRIO[b.prioridade] ?? 1) || b.saldo - a.saldo);
    const pag = S.dividas.filter(d => divEtapa(d) === "pagamento").map(d => ({ d, r: divResumo(S, d) }));
    const qt = S.dividas.filter(d => divEtapa(d) === "quitada").map(d => ({ d, r: divResumo(S, d) }));
    const totNeg = sum(neg, d => d.saldo), totPag = sum(pag, x => x.r.falta);
    const parcMes = sum(compromissos(S, CUR, CUR).filter(c => c.kind === "div" && ativo(c)), c => c.restante);
    const economia = sum(S.dividas.filter(d => divEtapa(d) !== "negociar" && d.valorOriginal > d.saldo), d => d.valorOriginal - d.saldo);
    const sims = [["juros", "Maiores juros primeiro"], ["saldo", "Menores saldos primeiro"]].map(([k, l]) => ({ k, l, r: simular(S, ui.simOrc, k) }));
    const quita = n => n === null ? "—" : ymLong(addYM(CUR, n));
    const melhor = sims[0].r.juros <= sims[1].r.juros ? "juros" : "saldo";

    return `${topbar("Dívidas", "Dívida a negociar existe, mas só entra nas contas quando vocês decidem como pagar.")}
    <section class="etapas" aria-label="Etapas">
      <div class="etapa neg"><span class="n"><i>1</i>A negociar</span><span class="v">${fmt(totNeg)}</span><span class="s">${neg.length} ${neg.length === 1 ? "dívida" : "dívidas"} · fora das contas</span></div>
      <div class="etapa pag"><span class="n"><i>2</i>Em pagamento</span><span class="v">${fmt(totPag)}</span><span class="s">falta pagar em ${pag.length} ${pag.length === 1 ? "dívida" : "dívidas"} · ${fmt(parcMes)} em ${MESL[+CUR.slice(5) - 1]}</span></div>
      <div class="etapa qt"><span class="n"><i>3</i>Quitadas</span><span class="v">${qt.length}</span><span class="s">${economia ? `economia de ${fmt(economia)} nas negociações` : "dívidas encerradas"}</span></div>
    </section>

    <section class="panel flush">
      ${head("1 · A negociar", `<button class="btn" data-act="divnova">+ Dívida a negociar</button>`).replace('class="panel-head"', 'class="panel-head pad"')}
      ${neg.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Dívida</th><th class="r">Valor devido</th><th>Desde</th><th>Prioridade</th><th>Observação</th><th></th></tr></thead><tbody>
      ${neg.map(d => `<tr><td><b>${esc(d.nome)}</b><div class="sub">${esc(d.credor || "—")}</div></td><td class="r num">${fmt(d.saldo)}${d.valorOriginal && d.valorOriginal !== d.saldo ? `<div class="sub">original ${fmt(d.valorOriginal)}</div>` : ""}</td><td>${desde(d.desde)}</td><td>${prioPill(d.prioridade)}</td><td class="sub">${esc(d.obs || "")}</td>
        <td class="r"><span class="actions"><button class="mini primary" data-act="divdecidir" data-arg="${d.id}">Decidir pagamento</button><button class="mini" data-act="diveditar" data-arg="${d.id}">Editar</button><button class="mini ghost xdel" data-act="divexcluir" data-arg="${d.id}" title="Excluir dívida" aria-label="Excluir dívida">✕</button></span></td></tr>`).join("")}
      </tbody><tfoot><tr><td>Total</td><td class="r num">${fmt(totNeg)}</td><td colspan="4"></td></tr></tfoot></table></div>`
      : `<p class="note pad">Nenhuma dívida a negociar. Cadastre aqui o que vocês devem e ainda não sabem quando vão conseguir pagar: fica registrado, mas não mexe no saldo livre.</p>`}
    </section>

    <section class="panel flush">
      ${head("2 · Em pagamento", `<button class="btn" data-act="divnovapag">+ Dívida já em pagamento</button>`).replace('class="panel-head"', 'class="panel-head pad"')}
      ${pag.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Dívida</th><th class="r">Parcela</th><th>Andamento</th><th class="r">Falta pagar</th><th>Próxima</th><th></th></tr></thead><tbody>
      ${pag.map(({ d, r }) => `<tr><td><b>${esc(d.nome)}</b><div class="sub">${esc(d.credor || "—")} · ${formaPill(d)}</div></td><td class="r num">${fmt(d.parcela)}<div class="sub">dia ${pad(d.dia)}</div></td>
        <td><div class="div-prog"><span class="bar prog"><span class="a" style="width:${(d.total ? r.pagas / d.total * 100 : 0).toFixed(0)}%"></span></span><span class="sub num">${r.pagas} de ${d.total} pagas</span></div></td>
        <td class="r num">${fmt(r.falta)}${d.valorOriginal > d.saldo ? `<div class="sub">economia ${fmt(d.valorOriginal - d.saldo)}</div>` : ""}</td>
        <td>${r.proxima ? `<span class="num">${br(r.proxima.venc)}</span>${r.proxima.venc < TODAY ? ' <span class="pill p-crit">Vencida</span>' : ""}${r.atrasadas > 1 ? `<div class="sub">${r.atrasadas} parcelas atrasadas</div>` : ""}` : '<span class="pill p-good">Tudo pago</span>'}</td>
        <td class="r"><span class="actions"><button class="mini" data-act="verdiv" data-arg="${d.id}">Parcelas</button>${r.falta <= 0 || r.pagas >= d.total ? `<button class="mini primary" data-act="divquitar" data-arg="${d.id}">Encerrar</button>` : `<button class="mini" data-act="divquitar" data-arg="${d.id}">Quitar</button>`}<button class="mini" data-act="diveditar" data-arg="${d.id}">Editar</button>${r.pago ? "" : `<button class="mini ghost" data-act="divvoltar" data-arg="${d.id}">Voltar a negociar</button>`}<button class="mini ghost xdel" data-act="divexcluir" data-arg="${d.id}" title="Excluir dívida" aria-label="Excluir dívida">✕</button></span></td></tr>`).join("")}
      </tbody><tfoot><tr><td>Total</td><td class="r num">${fmt(sum(pag, x => x.d.parcela))}</td><td></td><td class="r num">${fmt(totPag)}</td><td colspan="2"></td></tr></tfoot></table></div>`
      : `<p class="note pad">Nenhuma dívida em pagamento. Quando decidirem como pagar uma dívida a negociar, ela vem para cá e as parcelas entram em Contas a pagar.</p>`}
    </section>

    ${qt.length ? `<section class="panel flush">
      ${head("3 · Quitadas").replace('class="panel-head"', 'class="panel-head pad"')}
      <div class="tbl-wrap"><table class="rows"><thead><tr><th>Dívida</th><th>Forma</th><th>Quitada em</th><th class="r">Pago pelo app</th><th class="r">Economia</th><th></th></tr></thead><tbody>
      ${qt.map(({ d, r }) => `<tr><td><b>${esc(d.nome)}</b><div class="sub">${esc(d.credor || "—")}</div></td><td>${formaPill(d)}</td><td class="num">${d.quitadaEm ? br(d.quitadaEm) : "—"}</td><td class="r num">${fmt(r.pago)}</td><td class="r num">${d.valorOriginal > d.saldo ? fmt(d.valorOriginal - d.saldo) : "—"}</td><td class="r"><span class="actions"><button class="mini" data-act="verdiv" data-arg="${d.id}">Histórico</button><button class="mini ghost" data-act="divreabrir" data-arg="${d.id}">Reabrir</button><button class="mini ghost xdel" data-act="divexcluir" data-arg="${d.id}" title="Excluir dívida" aria-label="Excluir dívida">✕</button></span></td></tr>`).join("")}
      </tbody></table></div></section>` : ""}

    ${sims[0].r.ds.length ? `<section class="panel">
      ${head("Planejador de quitação", `<label class="inline-field">Quanto podem pagar por mês <input id="simorc" inputmode="decimal" value="${(ui.simOrc / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}"></label>`)}
      <p class="note">Simula pagar todas as dívidas em aberto (em pagamento e a negociar) com esse valor por mês. As a negociar não têm parcela mínima: recebem o que sobrar.</p>
      ${sims[0].r.insuf ? `<div class="check bad">O valor mensal é menor que a soma das parcelas das dívidas em pagamento (${fmt(sims[0].r.minTot)}). Com ele, alguma parcela atrasa.</div>` : ""}
      <div class="sims">${sims.map(({ k, l, r }) => `<div class="sim ${k === melhor ? "best" : ""}">
        <div class="sim-h"><b>${l}</b>${k === melhor ? '<span class="pill p-good">Menos juros</span>' : ""}</div>
        <div class="sim-n"><div><span>Tudo quitado em</span><b>${r.meses} ${r.meses === 1 ? "mês" : "meses"}</b><span class="sub">${quita(r.meses)}</span></div><div><span>Juros estimados</span><b class="num">${fmt(r.juros)}</b></div></div>
        <ol class="order">${[...r.ds].sort((a, b) => a.quita - b.quita).map(x => `<li><span>${esc(x.nome)}${x.etapa === "negociar" ? ' <span class="pill p-warn">a negociar</span>' : ""}</span><span class="sub">${quita(x.quita)}${x.taxa ? "" : " · sem juros informados"}</span></li>`).join("")}</ol></div>`).join("")}</div>
      <p class="note">Simulação apenas: nenhum pagamento é feito e nada muda nas contas.</p>
    </section>` : ""}`;
  }
  VIEWFN.dividas = vDividas;

  // ---------- formulários ----------
  const fNeg = (d = {}) => `<form class="form" data-form="divneg" ${d.id ? `data-id="${d.id}"` : ""}>
    ${field("Nome", `<input id="dn-n" name="nome" required value="${esc(d.nome || "")}" placeholder="Ex.: Cartão Itaú atrasado">`, false, "dn-n")}
    ${field("Credor", `<input id="dn-c" name="credor" value="${esc(d.credor || "")}" placeholder="Ex.: Itaú">`, false, "dn-c")}
    ${field("Valor devido hoje", money("saldo", d.saldo, "dn-s"), false, "dn-s")}
    ${field("Valor original (opcional)", `<span class="money"><span>R$</span><input id="dn-o" name="original" inputmode="decimal" placeholder="0,00" value="${reais(d.valorOriginal)}"></span>`, false, "dn-o")}
    ${field("Em aberto desde", `<input id="dn-d" name="desde" type="date" value="${d.desde || ""}">`, false, "dn-d")}
    ${field("Prioridade", `<select id="dn-p" name="prio">${opts(["Alta", "Média", "Baixa"], d.prioridade || "Média")}</select>`, false, "dn-p")}
    ${field("Observação", `<input id="dn-ob" name="obs" value="${esc(d.obs || "")}" placeholder="Ex.: ligar no SAC e pedir proposta">`, true, "dn-ob")}
    <div class="field full"><div class="hint-box">Fica registrada, mas <b>não entra</b> no saldo livre, no comprometido nem no planejamento até vocês decidirem como pagar.</div></div>
    <div class="full row-actions"><button class="btn primary">${d.id ? "Salvar" : "Cadastrar"}</button><button type="button" class="btn" data-close>Cancelar</button>${d.id ? `<button type="button" class="btn danger" data-act="divexcluir" data-arg="${d.id}">Excluir dívida</button>` : ""}</div></form>`;

  const fDecidir = d => `<form class="form" data-form="divdecidir" data-id="${d.id}">
    ${field("Como vão pagar", `<select id="dd-f" name="forma">${opts([["acordo", "Acordo negociado (valor combinado)"], ["parcelar", "Parcelamento do valor devido"], ["quitar", "Quitação à vista (uma vez)"]], "acordo")}</select>`, true, "dd-f")}
    ${field("Valor total a pagar", money("total", d.saldo, "dd-t"), false, "dd-t")}
    ${field("Número de parcelas", `<input id="dd-n" name="n" type="number" min="1" max="360" value="1" required>`, false, "dd-n")}
    ${field("Vencimento da 1ª parcela", `<input id="dd-v" name="venc" type="date" required value="${addDays(TODAY, 7)}">`, false, "dd-v")}
    ${field("Pagar com", `<select id="dd-c" name="conta">${contasOpts(d.conta)}</select>`, false, "dd-c")}
    ${field("Juros ao mês (opcional)", `<input id="dd-j" name="taxa" inputmode="decimal" placeholder="Ex.: 1,99">`, false, "dd-j")}
    <div class="field full"><div class="hint-box">Valor devido hoje: <b>${fmt(d.saldo)}</b>. Depois de confirmar, as parcelas entram em <b>Contas a pagar</b> e passam a contar no saldo livre. Se ainda não pagaram nada, dá para voltar atrás.</div></div>
    <div class="full row-actions"><button class="btn primary">Confirmar decisão</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`;

  const fPag = (d = {}) => `<form class="form" data-form="divpag" ${d.id ? `data-id="${d.id}"` : ""}>
    ${field("Nome", `<input id="dp-n" name="nome" required value="${esc(d.nome || "")}" placeholder="Ex.: Empréstimo Pernambucanas">`, false, "dp-n")}
    ${field("Credor", `<input id="dp-c" name="credor" value="${esc(d.credor || "")}">`, false, "dp-c")}
    ${d.id ? "" : `${field("Forma", `<select id="dp-f" name="forma">${opts(Object.entries(DECISOES).filter(([k]) => k !== "quitar"), "contrato")}</select>`, false, "dp-f")}
    ${field("Valor da parcela", money("parcela", "", "dp-p"), false, "dp-p")}
    ${field("Total de parcelas", `<input id="dp-t" name="total" type="number" min="1" max="360" required>`, false, "dp-t")}
    ${field("Próxima parcela a pagar é a nº", `<input id="dp-a" name="atual" type="number" min="1" max="360" value="1" required>`, false, "dp-a")}
    ${field("Vencimento da próxima parcela", `<input id="dp-v" name="venc" type="date" required>`, false, "dp-v")}`}
    ${field("Pagar com", `<select id="dp-k" name="conta">${contasOpts(d.conta)}</select>`, false, "dp-k")}
    ${field("Juros ao mês (opcional)", `<input id="dp-j" name="taxa" inputmode="decimal" value="${d.taxa ? String(d.taxa).replace(".", ",") : ""}">`, false, "dp-j")}
    ${field("Prioridade", `<select id="dp-pr" name="prio">${opts(["Alta", "Média", "Baixa"], d.prioridade || "Média")}</select>`, false, "dp-pr")}
    ${field("Observação", `<input id="dp-o" name="obs" value="${esc(d.obs || "")}">`, true, "dp-o")}
    <div class="full row-actions"><button class="btn primary">${d.id ? "Salvar" : "Cadastrar"}</button><button type="button" class="btn" data-close>Cancelar</button>${d.id ? `<button type="button" class="btn danger" data-act="divexcluir" data-arg="${d.id}">Excluir dívida</button>` : ""}</div></form>`;

  const taxaDe = v => { v = String(v || "").trim().replace(",", "."); return v ? Number(v) : null; };

  Object.assign(forms, {
    divneg(f) {
      const E = f.elements, s = parseBRL(E.saldo.value), o = parseBRL(E.original.value) || null;
      if (!(s > 0)) return toast("Informe o valor devido."), false;
      const dados = { nome: E.nome.value.trim(), credor: E.credor.value.trim(), saldo: s, valorOriginal: o, desde: E.desde.value || undefined, prioridade: E.prio.value, obs: E.obs.value.trim() };
      if (f.dataset.id) { const d = achar(f.dataset.id); Object.assign(d, dados); audit("Editou dívida a negociar", d.nome, fmt(s)); return "Dívida atualizada."; }
      S.dividas.push({ id: uid("d-"), ...dados, etapa: "negociar", parcela: 0, taxa: null, dia: 1, primeiro: CUR, total: 1, conta: null, situacao: "Em dia" });
      audit("Cadastrou dívida a negociar", dados.nome, fmt(s)); return "Dívida cadastrada como a negociar. Ela não entra nas contas até vocês decidirem como pagar.";
    },
    divdecidir(f) {
      const E = f.elements, d = achar(f.dataset.id), forma = E.forma.value, total = parseBRL(E.total.value), venc = E.venc.value;
      let n = forma === "quitar" ? 1 : Math.round(+E.n.value);
      if (!(total > 0)) return toast("Informe o valor total a pagar."), false;
      if (!(n >= 1 && n <= 360)) return toast("O número de parcelas vai de 1 a 360."), false;
      if (!venc) return toast("Escolha o vencimento da 1ª parcela."), false;
      if (ymOf(venc) < ymOf(S.inicio)) return toast("O 1º vencimento precisa ser a partir de " + ymLong(ymOf(S.inicio)) + ", quando o controle começou."), false;
      limparParcelas(d);
      const parcela = Math.floor(total / n), primeiro = ymOf(venc);
      Object.assign(d, { etapa: "pagamento", decisao: forma, decididoEm: TODAY, valorOriginal: d.valorOriginal || d.saldo, saldo: total, total: n, parcela, primeiro, dia: +venc.slice(8, 10), conta: E.conta.value || null, taxa: taxaDe(E.taxa.value), situacao: "Em dia" });
      if (total - parcela * n) S.inst[d.id + "|" + primeiro] = Object.assign(S.inst[d.id + "|" + primeiro] || {}, { valor: total - parcela * (n - 1) }); // diferença de centavos na 1ª parcela
      audit("Decidiu pagamento de dívida", d.nome, `${DECISOES[forma]}: ${n}× ${fmt(parcela)} a partir de ${br(venc)}`);
      return n === 1 ? `Decidido: pagamento de ${fmt(total)} em ${br(venc)}. Agora ele está em Contas a pagar.` : `Decidido: ${n} parcelas de ${fmt(parcela)} a partir de ${br(venc)}. Agora elas estão em Contas a pagar e contam no saldo livre.`;
    },
    divpag(f) {
      const E = f.elements, conta = E.conta.value || null, taxa = taxaDe(E.taxa.value);
      if (f.dataset.id) { const d = achar(f.dataset.id); Object.assign(d, { nome: E.nome.value.trim(), credor: E.credor.value.trim(), conta, taxa, prioridade: E.prio.value, obs: E.obs.value.trim() }); audit("Editou dívida", d.nome); return "Dívida atualizada."; }
      const p = parseBRL(E.parcela.value), tot = Math.round(+E.total.value), at = Math.round(+E.atual.value), venc = E.venc.value;
      if (!(p > 0) || !(tot >= 1) || !(at >= 1 && at <= tot) || !venc) return toast("Confira parcela, total de parcelas, a próxima parcela e o vencimento."), false;
      const primeiro = addYM(ymOf(venc), -(at - 1));
      S.dividas.push({ id: uid("d-"), nome: E.nome.value.trim(), credor: E.credor.value.trim(), etapa: "pagamento", decisao: E.forma.value, decididoEm: TODAY, saldo: p * (tot - at + 1), parcela: p, total: tot, primeiro, dia: +venc.slice(8, 10), conta, taxa, prioridade: E.prio.value, obs: E.obs.value.trim(), situacao: "Em dia" });
      audit("Cadastrou dívida em pagamento", E.nome.value.trim(), `${tot - at + 1} de ${tot} parcelas de ${fmt(p)}`);
      return "Dívida cadastrada. As parcelas que faltam já aparecem em Contas a pagar.";
    },
  });

  // ---------- ações ----------
  const confirma = (titulo, texto, act, id, botao, perigo) => modal(titulo, `<p>${texto}</p><div class="row-actions"><button class="btn ${perigo ? "danger" : "primary"}" data-act="${act}" data-arg="${id}">${botao}</button><button class="btn" data-close>Cancelar</button></div>`);
  const feito = msg => { closeLayer(); commit(msg); };
  Object.assign(acts, {
    divnova: () => modal("Nova dívida a negociar", fNeg()),
    divnovapag: () => modal("Dívida já em pagamento", fPag()),
    divdecidir: id => { const d = achar(id); modal("Decidir pagamento · " + esc(d.nome), fDecidir(d)); const sel = document.getElementById("dd-f"), n = document.getElementById("dd-n"); const ajusta = () => { n.disabled = sel.value === "quitar"; if (n.disabled) n.value = 1; }; sel.addEventListener("change", ajusta); ajusta(); },
    diveditar: id => { const d = achar(id); divEtapa(d) === "negociar" ? modal("Editar dívida a negociar", fNeg(d)) : modal("Editar dívida · " + esc(d.nome), fPag(d)); },
    divexcluir: id => { const d = achar(id), pagos = temPagamento(d), r = divResumo(S, d); confirma("Excluir dívida", `Excluir <b>${esc(d.nome)}</b>? Use quando ela foi lançada errado. ${divEtapa(d) === "negociar" ? "Ela sai da lista de dívidas a negociar." : "A dívida e as parcelas em aberto saem de Contas a pagar."}${pagos ? `<br><br><b>Atenção:</b> já há ${fmt(r.pago)} pagos nela. Esses pagamentos continuam em Lançamentos (o dinheiro saiu da conta); só deixam de estar ligados a esta dívida.` : ""} Não dá para desfazer.`, "divexcluirok", id, "Excluir", true); },
    divexcluirok: id => { const d = achar(id); for (const k of Object.keys(S.inst)) if (k.startsWith(d.id + "|")) delete S.inst[k]; S.dividas = S.dividas.filter(x => x.id !== id); audit("Excluiu dívida", d.nome, fmt(d.saldo) + " · " + ({ negociar: "a negociar", pagamento: "em pagamento", quitada: "quitada" })[divEtapa(d)]); feito("Dívida excluída."); },
    divquitar: id => { const d = achar(id), r = divResumo(S, d); confirma("Marcar como quitada", r.falta > 0 ? `Ainda faltam <b>${fmt(r.falta)}</b> em parcelas de <b>${esc(d.nome)}</b>. Marcar como quitada tira essas parcelas de Contas a pagar (use quando pagaram de outro jeito, por exemplo à vista com desconto). O que já foi pago fica no histórico.` : `Todas as parcelas de <b>${esc(d.nome)}</b> estão pagas. Encerrar move a dívida para Quitadas.`, "divquitarok", id, "Marcar como quitada"); },
    divquitarok: id => { const d = achar(id), r = divResumo(S, d); d.etapa = "quitada"; d.quitadaEm = TODAY; audit("Quitou dívida", d.nome, r.falta > 0 ? "encerrada com " + fmt(r.falta) + " em parcelas não registradas" : "todas as parcelas pagas"); feito("Dívida quitada. As parcelas restantes saíram de Contas a pagar."); },
    divvoltar: id => { const d = achar(id); if (temPagamento(d)) return toast("Já existe pagamento registrado nessa dívida, então ela não pode voltar a negociar."); confirma("Voltar a negociar", `<b>${esc(d.nome)}</b> volta para a etapa A negociar e as parcelas saem de Contas a pagar e do saldo livre.`, "divvoltarok", id, "Voltar a negociar"); },
    divvoltarok: id => { const d = achar(id); limparParcelas(d); Object.assign(d, { etapa: "negociar", saldo: d.valorOriginal || d.saldo, decisao: undefined, decididoEm: undefined, parcela: 0, total: 1, primeiro: CUR }); audit("Voltou dívida para negociação", d.nome); feito("A dívida voltou para A negociar e saiu das contas."); },
    divreabrir: id => { const d = achar(id); d.etapa = "pagamento"; d.quitadaEm = undefined; audit("Reabriu dívida", d.nome); closeLayer(); commit("Dívida reaberta: as parcelas em aberto voltaram para Contas a pagar."); },
    verdiv: id => {
      const d = achar(id), r = divResumo(S, d);
      drawer(esc(d.nome), divEtapa(d) === "quitada" ? "Dívida quitada" : "Dívida em pagamento", `<div class="kv"><span>Credor</span><b>${esc(d.credor || "—")}</b><span>Forma</span><b>${esc(DECISOES[d.decisao] || DECISOES.contrato)}</b>${d.decididoEm ? `<span>Decidido em</span><b>${br(d.decididoEm)}</b>` : ""}${d.valorOriginal ? `<span>Valor original</span><b class="num">${fmt(d.valorOriginal)}</b>` : ""}<span>Total combinado</span><b class="num">${fmt(d.saldo)}</b><span>Parcela</span><b class="num">${fmt(d.parcela)} · dia ${d.dia}</b><span>Falta pagar</span><b class="num">${fmt(r.falta)}</b><span>Pagar com</span><b>${esc(nomeDe(d.conta))}</b><span>Juros</span><b>${d.taxa ? d.taxa.toLocaleString("pt-BR") + "% ao mês" : "Não informados"}</b>${d.quitadaEm ? `<span>Quitada em</span><b>${br(d.quitadaEm)}</b>` : ""}</div>${d.obs ? `<p class="note">${esc(d.obs)}</p>` : ""}
        <h4>Parcelas</h4><div class="list">${r.parcelas.length ? r.parcelas.map(c => `<div class="li"><span class="d num">${brs(c.venc)}</span><span class="t">${esc(c.desc)}</span><span class="num">${fmt(c.valor)}</span><span>${pill(c.status)}</span></div>`).join("") : '<p class="note">Nenhuma parcela dentro do período do controle.</p>'}</div>
        <p class="note">Para registrar o pagamento de uma parcela, use Contas a pagar.</p>`);
    },
  });
})();
