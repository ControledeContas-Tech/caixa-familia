// ================= FECHAMENTO · a planilha do mês dentro do app =================
// Uma coluna por mês, como na planilha: Entradas, Saídas (conta por conta, com vencimento), Total e Sobra.
// Usa os mesmos dados de Contas a pagar; nada é digitado duas vezes. Tocar numa conta registra o pagamento.

(function () {
  IC.fechamento = '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>';
  VIEWS.unshift(["fechamento", "Fechamento"]);
  // tela inicial: o fechamento (a não ser que o endereço peça outra)
  try { const h = location.hash.slice(1); if (!h || h === "fechamento") ui.view = "fechamento"; } catch (e) { ui.view = "fechamento"; }

  const css = document.createElement("style");
  css.textContent = `
.fe-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.fe-bar .sp{flex:1}
.fe-bar .seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--surface)}
.fe-bar .seg button{border:0;background:none;padding:7px 12px;font:500 13px var(--f-body);color:var(--muted);cursor:pointer}
.fe-bar .seg button[aria-pressed=true]{background:var(--ink);color:var(--surface)}
.fe-grid{display:grid;grid-template-columns:repeat(var(--n),minmax(280px,1fr));gap:14px;align-items:start;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity}
.fe-col{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;min-width:0;scroll-snap-align:start}
.fe-col.atual{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.fe-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:11px 14px;background:var(--accent);color:#fff}
.fe-col:not(.atual) .fe-h{background:var(--sunken);color:var(--ink)}
.fe-h b{font-size:15.5px}
.fe-h span{font-size:11.5px;opacity:.85}
.fe-sec{display:flex;justify-content:space-between;padding:9px 14px 4px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.fe-l{display:grid;grid-template-columns:1fr auto 22px;gap:8px;align-items:center;width:100%;padding:6px 14px;border:0;border-top:1px solid var(--line);background:none;color:var(--ink);font:13.5px var(--f-body);text-align:left;cursor:pointer}
.fe-l:hover{background:var(--sunken)}
.fe-l .d{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fe-l .d small{color:var(--muted);font-size:11.5px;margin-left:4px}
.fe-l .v{font-family:var(--f-num);font-variant-numeric:tabular-nums;white-space:nowrap}
.fe-l .s{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;border:1.5px solid var(--line);color:transparent}
.fe-l.ok .s{background:var(--good);border-color:var(--good);color:#fff}
.fe-l.ok .d,.fe-l.ok .v{color:var(--muted)}
.fe-l.parc .s{border-color:var(--warn);color:var(--warn)}
.fe-l.venc .s{border-color:var(--crit);color:var(--crit)}
.fe-l.venc .d small{color:var(--crit);font-weight:600}
.fe-l.grupo{background:var(--warn-soft);font-weight:600;cursor:default}
.fe-l.sub{padding-left:26px;font-size:12.5px}
.fe-t{display:flex;justify-content:space-between;padding:8px 14px;border-top:2px solid var(--line);font-weight:600;font-size:14px}
.fe-t .v{font-family:var(--f-num);font-variant-numeric:tabular-nums}
.fe-vazio{padding:8px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px}
.fe-sobra{margin:10px;padding:12px 14px;border-radius:12px;background:var(--good-soft)}
.fe-sobra.neg{background:var(--crit-soft)}
.fe-sobra .r1{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.fe-sobra .r1 span{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
.fe-sobra .r1 b{font:600 22px var(--f-num);font-variant-numeric:tabular-nums;color:var(--good)}
.fe-sobra.neg .r1 b{color:var(--crit)}
.fe-sobra .r2{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px;color:var(--muted)}
.fe-prog{height:6px;border-radius:99px;background:color-mix(in srgb,var(--ink) 10%,transparent);margin-top:8px;overflow:hidden}
.fe-prog i{display:block;height:100%;background:var(--good);border-radius:99px}
.fe-det{display:grid;gap:0;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.fe-det div{display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-top:1px solid var(--line);font-size:13.5px}.fe-det div:first-child{border-top:0}.fe-det span{color:var(--muted)}
.fe-ops{display:flex;flex-direction:column;gap:8px;margin-top:14px}.fe-ops .btn{justify-content:center;text-align:center}
.fe-nota{padding:0 14px 12px;font-size:12px;color:var(--muted);line-height:1.45}
.fe-baixo{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.fe-cat{display:grid;grid-template-columns:minmax(90px,150px) 1fr auto;gap:10px;align-items:center;padding:5px 0;font-size:13px}
.fe-cat .b{height:8px;border-radius:99px;background:var(--sunken);overflow:hidden}.fe-cat .b i{display:block;height:100%;background:var(--accent);border-radius:99px}
.fe-div{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--line);font-size:13.5px}
.fe-div:first-of-type{border-top:0}
.fe-div small{display:block;color:var(--muted);font-size:11.5px}
@media (max-width:900px){.fe-baixo{grid-template-columns:1fr}}
@media (max-width:760px){.fe-grid{grid-template-columns:repeat(var(--n),86vw)}}`;
  document.head.appendChild(css);

  const FORA = ["cancelada", "reagendada", "renegociada"];
  const dm = d => d.slice(8, 10) + "/" + d.slice(5, 7);
  function pagosLanc() { const s = new Set(); for (const k in S.inst) for (const p of S.inst[k].pag || []) if (p.lanc) s.add(p.lanc); for (const m of S.manuais) for (const p of m.pag || []) if (p.lanc) s.add(p.lanc); return s; }

  // tudo de um mês: entradas, saídas, atrasadas (só no mês atual), gastos do dia a dia já feitos, totais
  function mesDados(ym) {
    const ini0 = ymOf(S.inicio), cs = ym >= ini0 ? compromissos(S, ym, ym) : [];
    const rec = cs.filter(c => c.tipo === "receita" && c.status !== "cancelada").map(c => ({ c, v: ativo(c) ? Math.max(c.valor, c.pago) : c.pago, ok: !ativo(c) }));
    const recebidoTotal = receitasMes(S, ym), outras = Math.max(0, recebidoTotal - sum(rec, r => r.c.pago));
    const desp = cs.filter(c => c.tipo === "despesa" && !FORA.includes(c.status)).sort((a, b) => a.venc < b.venc ? -1 : a.venc > b.venc ? 1 : 0).map(c => ({ c, v: c.valor - (c.desconto || 0), falta: ativo(c) ? Math.max(0, c.restante) : 0 }));
    const atras = ym === CUR && ini0 < CUR ? compromissos(S, ini0, addYM(CUR, -1)).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0) : [];
    const pl = pagosLanc(), avulsos = S.lanc.filter(l => !l.excluido && l.tipo === "despesa" && l.conta && !l.cartao && ymOf(l.data) === ym && !pl.has(l.id) && !String(l.conta).startsWith("inv"));
    const entra = sum(rec, r => r.v) + outras, aReceber = sum(rec, r => r.ok ? 0 : Math.max(0, r.v - r.c.pago));
    const tAtras = sum(atras, c => c.restante), tAvulso = sum(avulsos, l => l.valor), tDesp = sum(desp, d => d.v);
    const sai = tDesp + tAtras + tAvulso, falta = sum(desp, d => d.falta) + tAtras, pago = sum(desp, d => d.c.pago) + tAvulso;
    return { ym, rec, outras, desp, atras, avulsos, entra, aReceber, tAtras, tAvulso, sai, falta, pago, sobra: entra - sai };
  }
  window.fechamentoMes = mesDados;

  function linhaSaida({ c, v, falta }) {
    const paga = !ativo(c) || falta <= 0, parc = !paga && c.pago > 0, venc = !paga && c.venc < TODAY;
    const attrs = c.kind === "fat" ? `data-go="cartoes" data-card="${c.ref.card.id}" data-key="${c.ref.key}"` : `data-act="feop" data-arg="${c.key}"`;
    return `<button class="fe-l ${paga ? "ok" : parc ? "parc" : venc ? "venc" : ""}" ${attrs} title="${c.kind === "fat" ? "Abrir a fatura" : "Pagar, alterar ou excluir"}">
      <span class="d">${esc(c.desc)}<small>${dm(c.venc)}${venc ? " · vencida" : parc ? ` · pago ${fmt(c.pago)}` : c.estimado ? " · estimado" : ""}</small></span><span class="v">${fmt(v)}</span><span class="s">${paga ? "✓" : parc ? "½" : venc ? "!" : ""}</span></button>`;
  }
  function coluna(ym) {
    const m = mesDados(ym), atual = ym === CUR, passado = ym < CUR;
    const pct = m.sai > 0 ? Math.min(100, Math.round(m.pago / m.sai * 100)) : 0;
    let saldoFim = "";
    if (atual) { const cx = caixa(S), fim = cx + m.aReceber - m.falta; saldoFim = `<div class="fe-nota">Em conta hoje <b class="num">${fmt(cx)}</b>${m.aReceber ? ` + a receber <b class="num">${fmt(m.aReceber)}</b>` : ""} − falta pagar <b class="num">${fmt(m.falta)}</b> = <b class="num ${fim < 0 ? "neg" : "pos"}">${fmt(fim)}</b> no fim do mês.</div>`; }
    return `<article class="fe-col ${atual ? "atual" : ""}">
      <div class="fe-h"><b>${esc(ymLong(ym).replace(/^./, x => x.toUpperCase()))}</b><span>${atual ? "mês atual" : passado ? "fechado" : "previsto"}</span></div>
      <div class="fe-sec"><span>Entradas</span></div>
      ${m.rec.map(r => `<button class="fe-l ${r.ok ? "ok" : ""}" data-act="feop" data-arg="${r.c.key}" title="Receber, alterar ou excluir"><span class="d">${esc(r.c.desc)}<small>${dm(r.c.venc)}</small></span><span class="v">${fmt(r.v)}</span><span class="s">${r.ok ? "✓" : ""}</span></button>`).join("")}
      ${m.outras ? `<button class="fe-l ok" data-go="lancamentos" data-fe-mes="${ym}"><span class="d">Outras entradas</span><span class="v">${fmt(m.outras)}</span><span class="s">✓</span></button>` : ""}
      ${!m.rec.length && !m.outras ? `<div class="fe-vazio">Nenhuma entrada prevista.</div>` : ""}
      <div class="fe-t"><span>Total</span><span class="v">${fmt(m.entra)}</span></div>
      <div class="fe-sec"><span>Saídas</span><span>${m.desp.filter(d => d.falta <= 0).length}/${m.desp.length} pagas</span></div>
      ${m.desp.map(linhaSaida).join("")}
      ${m.atras.length ? `<div class="fe-l grupo"><span class="d">Contas de meses anteriores</span><span class="v">${fmt(m.tAtras)}</span><span></span></div>${m.atras.map(c => `<button class="fe-l sub venc" ${c.kind === "fat" ? `data-go="cartoes" data-card="${c.ref.card.id}" data-key="${c.ref.key}"` : `data-act="feop" data-arg="${c.key}"`}><span class="d">${esc(c.desc)}<small>${dm(c.venc)}</small></span><span class="v">${fmt(c.restante)}</span><span class="s">!</span></button>`).join("")}` : ""}
      ${m.tAvulso ? `<button class="fe-l ok" data-go="lancamentos" data-fe-mes="${ym}" title="Ver nos lançamentos"><span class="d">Gastos do dia a dia<small>débito, Pix e dinheiro · ${m.avulsos.length}</small></span><span class="v">${fmt(m.tAvulso)}</span><span class="s">✓</span></button>` : ""}
      ${!m.desp.length && !m.atras.length && !m.tAvulso ? `<div class="fe-vazio">Nenhuma conta neste mês.</div>` : ""}
      <div class="fe-t"><span>Total</span><span class="v">${fmt(m.sai)}</span></div>
      <div class="fe-sobra ${m.sobra < 0 ? "neg" : ""}"><div class="r1"><span>${m.sobra < 0 ? "Falta" : "Sobra"}</span><b>${m.sobra < 0 ? "−" : ""}${fmt(Math.abs(m.sobra))}</b></div>
        <div class="r2"><span>Já pago ${fmt(m.pago)}</span><span>Falta pagar <b>${fmt(m.falta)}</b></span></div><div class="fe-prog"><i style="width:${pct}%"></i></div></div>
      ${saldoFim}
    </article>`;
  }

  function vFechamento() {
    const n = ui.feN || 3, ini = ui.feIni || CUR, meses = []; for (let i = 0; i < n; i++) meses.push(addYM(ini, i));
    // onde mais gastamos (mês atual) e dívidas no radar
    const g = {}; gastosMes(S, CUR).forEach(r => g[r.cat || "Sem categoria"] = (g[r.cat || "Sem categoria"] || 0) + r.valor);
    const cats = Object.entries(g).sort((a, b) => b[1] - a[1]), tot = sum(cats, c => c[1]), mx = cats.length ? cats[0][1] : 1;
    const neg = S.dividas.filter(d => divEtapa(d) === "negociar").sort((a, b) => (b.saldo || 0) - (a.saldo || 0));
    return `${topbar("Fechamento", "Entradas, saídas e sobra de cada mês")}
      <div class="fe-bar"><div class="seg"><button data-act="femes" data-arg="-1" aria-label="Mês anterior">‹</button><button data-act="femes" data-arg="0" aria-pressed="${ini === CUR}">Mês atual</button><button data-act="femes" data-arg="1" aria-label="Próximo mês">›</button></div>
        <div class="seg">${[1, 3, 6].map(k => `<button data-act="fen" data-arg="${k}" aria-pressed="${n === k}">${k} ${k === 1 ? "mês" : "meses"}</button>`).join("")}</div><span class="sp"></span>
        <button class="btn" data-go="contas">Contas a pagar</button><button class="btn" data-act="novarec">+ Conta fixa ou salário</button></div>
      <div class="fe-grid" style="--n:${n}">${meses.map(coluna).join("")}</div>
      <p class="note" style="margin-top:8px">Toque numa conta para pagar, alterar ou excluir (✓ = paga · ½ = paga em parte · ! = vencida). Faturas de cartão entram pelo mês do vencimento. Os meses seguintes mostram só o que já é conhecido: contas fixas, parcelas e faturas já lançadas.</p>
      <div class="fe-baixo">
        <section class="panel">${head("Onde mais gastamos em " + ymLong(CUR), `<button class="linkbtn" data-go="analises">Ver análises →</button>`)}
          ${cats.length ? cats.slice(0, 7).map(([k, v]) => `<div class="fe-cat"><span>${esc(k)}</span><span class="b"><i style="width:${Math.round(v / mx * 100)}%"></i></span><span class="num">${fmt(v)} <small class="muted">${tot ? Math.round(v / tot * 100) : 0}%</small></span></div>`).join("") : `<p class="note">Nenhum gasto registrado neste mês.</p>`}
        </section>
        <section class="panel">${head("Dívidas no radar · a negociar", `<button class="linkbtn" data-go="dividas">Abrir Dívidas →</button>`)}
          ${neg.length ? `<p class="note" style="margin-top:0">Ficam fora das contas acima até vocês decidirem como pagar. Total: <b class="num">${fmt(sum(neg, d => d.saldo || 0))}</b></p>${neg.map(d => `<div class="fe-div"><span>${esc(d.nome)}<small>${esc(d.credor || "")}${d.desde ? " · desde " + br(d.desde) : ""}${d.prioridade ? " · prioridade " + esc(d.prioridade) : ""}</small></span><b class="num">${fmt(d.saldo || 0)}</b></div>`).join("")}` : `<p class="note">Nenhuma dívida aguardando negociação.</p>`}
        </section>
      </div>`;
  }
  VIEWFN.fechamento = vFechamento;

  // ---------- opções de uma linha: pagar, desfazer, alterar, excluir ----------
  const instDe = c => c.kind === "man" ? c.ref : (S.inst[c.key] = S.inst[c.key] || {});
  function opcoes(key, conf) {
    const c = findComp(key); if (!c) { closeLayer(); return; }
    const rec = c.tipo === "receita", aberto = ativo(c) && c.restante > 0, ym = ymOf(c.venc), fixa = c.kind === "rec";
    const b = (act, txt, cls = "") => `<button class="btn ${cls}" data-act="${act}" data-arg="${esc(key)}">${txt}</button>`;
    let corpo;
    if (conf) {
      const T = { desfaz: [`Desfazer ${rec ? "o recebimento" : "o pagamento"} de ${fmt(c.pago)}?`, `O lançamento ${rec ? "da entrada" : "do pagamento"} é excluído e a conta volta a ficar em aberto.`, "Sim, desfazer"],
        mes: [`Tirar "${esc(c.desc)}" só de ${ymLong(ym)}?`, "Ela continua nos outros meses. Neste mês deixa de contar no total.", "Sim, tirar deste mês"],
        fim: [`Excluir "${esc(c.ref.desc || c.desc)}" de ${ymLong(ym)} em diante?`, ym <= c.ref.inicio ? "A conta fixa é removida por inteiro." : "Os meses anteriores ficam como estão; de " + ymLong(ym) + " em diante ela não aparece mais.", "Sim, excluir"],
        man: [`Excluir "${esc(c.desc)}"?`, "A conta sai do fechamento e de Contas a pagar. Não dá para desfazer.", "Sim, excluir"] }[conf];
      corpo = `<div class="check bad"><b>${T[0]}</b><br>${T[1]}</div><div class="row-actions" style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${b("fesim" + conf, T[2], "danger")}${b("feop", "Voltar")}</div>`;
    } else {
      const linhas = [["Vencimento", br(c.venc)], [rec ? "Previsto" : "Valor", fmt(c.valor - (c.desconto || 0))], [rec ? "Recebido" : "Pago", fmt(c.pago)], [rec ? "Falta receber" : "Falta pagar", fmt(aberto ? c.restante : 0)], ["Origem", esc(c.origem || "")]];
      const bs = [];
      if (aberto) bs.push(b("pagar", rec ? "Registrar recebimento" : "Registrar pagamento", "primary"));
      if (aberto && !rec) bs.push(b("saldo", "Reagendar, desconto ou negociar"));
      if (c.pago > 0) bs.push(b("feconfdesfaz", rec ? "Desfazer recebimento" : "Desfazer pagamento"));
      if (fixa) bs.push(`<button class="btn" data-act="editrec" data-arg="${c.ref.id}">Editar ${rec ? "receita" : "conta"} fixa</button>`);
      if (fixa && !c.pago) bs.push(b("feconfmes", "Tirar só deste mês", "danger"), b("feconffim", "Excluir deste mês em diante", "danger"));
      if (c.kind === "man" && !c.pago) bs.push(b("feconfman", "Excluir esta conta", "danger"));
      if (c.kind === "div") bs.push(`<button class="btn" data-go="dividas">Abrir Dívidas</button>`);
      corpo = `<div class="fe-det">${linhas.map(([k, v]) => `<div><span>${k}</span><b class="num">${v}</b></div>`).join("")}</div>
        ${c.pago > 0 && (fixa || c.kind === "man") ? `<p class="note">Para excluir, desfaça ${rec ? "o recebimento" : "o pagamento"} primeiro.</p>` : ""}
        <div class="fe-ops">${bs.join("")}</div>`;
    }
    modal(esc(c.desc), corpo);
  }
  const fecha = msg => { closeLayer(); commit(msg); };
  Object.assign(acts, {
    feop: k => opcoes(k), feconfdesfaz: k => opcoes(k, "desfaz"), feconfmes: k => opcoes(k, "mes"), feconffim: k => opcoes(k, "fim"), feconfman: k => opcoes(k, "man"),
    fesimdesfaz: k => { const c = findComp(k), i = instDe(c), ids = new Set((i.pag || []).map(p => p.lanc)); S.lanc.forEach(l => { if (ids.has(l.id)) l.excluido = true; }); i.pag = []; audit(c.tipo === "receita" ? "Desfez recebimento" : "Desfez pagamento", c.desc, fmt(c.pago)); fecha(c.tipo === "receita" ? "Recebimento desfeito." : "Pagamento desfeito. A conta voltou a ficar em aberto."); },
    fesimmes: k => { const c = findComp(k), i = instDe(c); if (i.valor === undefined) i.valor = c.valor; i.cancel = true; i.motivo = "retirada deste mês"; audit("Tirou do mês", c.desc, ymLabel(ymOf(c.venc))); fecha("Retirada deste mês."); },
    fesimfim: k => { const c = findComp(k), r = c.ref, ym = k.split("|").pop();
      for (const q in S.inst) if (q.startsWith(r.id + "|") && q.split("|").pop() >= ym && (S.inst[q].pag || []).length) return toast("Há pagamento registrado em " + ymLong(q.split("|").pop()) + ". Desfaça-o antes de excluir.");
      if (ym <= r.inicio) { S.rec = S.rec.filter(x => x.id !== r.id); for (const q in S.inst) if (q.startsWith(r.id + "|")) delete S.inst[q]; } else r.fim = addYM(ym, -1);
      audit("Excluiu conta fixa", r.desc, "de " + ymLabel(ym) + " em diante"); fecha("Excluída de " + ymLong(ym) + " em diante."); },
    fesimman: k => { const c = findComp(k); S.manuais = S.manuais.filter(m => m.id !== c.ref.id); audit("Excluiu conta", c.desc, fmt(c.valor) + " · " + br(c.venc)); fecha("Conta excluída."); },
    femes: a => { ui.feIni = +a === 0 ? CUR : addYM(ui.feIni || CUR, +a); render(); },
    fen: a => { ui.feN = +a; try { localStorage.setItem("caixa-fe-n", a); } catch (e) {} render(); },
  });
  try { const k = +localStorage.getItem("caixa-fe-n"); if ([1, 3, 6].includes(k)) ui.feN = k; } catch (e) {}
  // ao ir do fechamento para Contas a pagar ou Lançamentos, já abre no mês da linha tocada
  document.addEventListener("click", e => { const b = e.target.closest("[data-fe-mes]"); if (!b) return; ui.compMes = b.dataset.feMes; ui.lf.mes = b.dataset.feMes; if (b.dataset.feTab) ui.compTab = b.dataset.feTab; }, true);
})();
