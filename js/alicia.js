// ================= ALÍCIA · assistente de IA do Caixa da Família =================
// Botão flutuante em todas as telas. A pergunta vai para a Edge Function "alicia" (Supabase), que confere o login
// e chama a IA com a chave secreta do servidor. Junto com a pergunta vão o manual do sistema (js/alicia-manual.js),
// o que está na tela agora e um resumo dos dados da família, para ela responder sobre qualquer coisa do app.

(function () {
  const AL = { aberta: false, msgs: [], enviando: false, ctrl: null, rascunho: "" };
  const MAX_HIST = 40, MANDA = 12;
  const chave = () => "caixa-alicia-" + (ME ? ME.id : "");
  const carrega = () => { try { AL.msgs = JSON.parse(localStorage.getItem(chave()) || "[]"); } catch (e) { AL.msgs = []; } AL._k = chave(); };
  const guarda = () => { try { localStorage.setItem(chave(), JSON.stringify(AL.msgs.filter(m => !m.erro).slice(-MAX_HIST))); } catch (e) {} };

  // ---------- estilos ----------
  const css = document.createElement("style");
  css.textContent = `
.al-fab{position:fixed;right:max(20px,env(safe-area-inset-right,0px));bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:45;width:58px;height:58px;border-radius:50%;border:0;background:#19c9dc;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 20px rgba(0,120,140,.35),0 2px 6px rgba(0,0,0,.15);transition:transform .15s,box-shadow .15s}
.al-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 10px 26px rgba(0,120,140,.42),0 2px 6px rgba(0,0,0,.15)}
.al-fab:focus-visible{outline:3px solid #0b7f8c;outline-offset:3px}
.al-fab svg{width:30px;height:30px}
.al-fab .al-dica{position:absolute;right:68px;white-space:nowrap;background:var(--ink);color:var(--surface);font:500 12.5px/1 var(--f-body);padding:8px 10px;border-radius:8px;opacity:0;pointer-events:none;transition:opacity .15s}
.al-fab:hover .al-dica{opacity:1}
.al-painel{position:fixed;right:max(20px,env(safe-area-inset-right,0px));bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:46;width:min(420px,calc(100vw - 32px));height:min(640px,calc(100vh - 120px));background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden}
.al-top{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 14px;background:linear-gradient(135deg,#19c9dc,#0fa3b8);color:#fff}
.al-av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font:600 17px/1 var(--f-body);flex:none}
.al-top .t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.al-top b{font-size:15.5px}
.al-top span{font-size:12px;opacity:.9}
.al-top button{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:8px;height:32px;min-width:32px;padding:0 9px;font:500 12.5px var(--f-body);cursor:pointer;display:grid;place-items:center}
.al-top button:hover{background:rgba(255,255,255,.28)}
.al-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain;background:var(--bg)}
.al-m{max-width:92%;line-height:1.5;font-size:14px;word-break:break-word}
.al-m.eu{align-self:flex-end;background:#19c9dc;color:#06343a;padding:9px 12px;border-radius:14px 14px 4px 14px;white-space:pre-wrap}
.al-m.ela{align-self:flex-start;background:var(--surface);border:1px solid var(--line);padding:10px 13px;border-radius:14px 14px 14px 4px}
.al-m.ela p{margin:0 0 8px}.al-m.ela p:last-child{margin-bottom:0}
.al-m.ela ul,.al-m.ela ol{margin:4px 0 8px;padding-left:20px}.al-m.ela li{margin:2px 0}
.al-m.ela h4{margin:10px 0 4px;font-size:14px}
.al-m.ela code{background:var(--sunken);padding:1px 5px;border-radius:5px;font-size:12.5px}
.al-m.ela table{border-collapse:collapse;font-size:12.5px;margin:6px 0;display:block;overflow-x:auto;max-width:100%}
.al-m.ela th,.al-m.ela td{border:1px solid var(--line);padding:4px 7px;text-align:left;white-space:nowrap}
.al-m.ela th{background:var(--sunken)}
.al-m.erro{border-color:var(--crit);color:var(--crit)}
.al-ir{display:inline-flex;align-items:center;gap:4px;border:1px solid #19c9dc;color:#0b7f8c;background:transparent;border-radius:99px;padding:2px 10px;margin:2px 2px;font:500 12.5px var(--f-body);cursor:pointer}
.al-ir:hover{background:#19c9dc;color:#fff}
.al-dots{display:inline-flex;gap:4px;padding:4px 2px}.al-dots i{width:7px;height:7px;border-radius:50%;background:#19c9dc;animation:alb 1s infinite ease-in-out}.al-dots i:nth-child(2){animation-delay:.15s}.al-dots i:nth-child(3){animation-delay:.3s}
@keyframes alb{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.al-oi{display:flex;flex-direction:column;gap:10px;color:var(--ink)}
.al-oi p{margin:0;color:var(--muted);font-size:13.5px;line-height:1.5}
.al-sug{display:flex;flex-wrap:wrap;gap:6px}
.al-sug button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:7px 10px;font:13px/1.3 var(--f-body);text-align:left;cursor:pointer}
.al-sug button:hover{border-color:#19c9dc}
.al-form{display:flex;gap:8px;align-items:flex-end;padding:10px;border-top:1px solid var(--line);background:var(--surface)}
.al-form textarea{flex:1;resize:none;min-height:42px;max-height:130px;border-radius:12px;padding:10px 12px;background:var(--bg);line-height:1.4;font:14px var(--f-body);color:var(--ink);border:1px solid var(--line)}
.al-form textarea:focus{outline:2px solid #19c9dc;outline-offset:-1px}
.al-form button{height:42px;min-width:42px;border-radius:12px;border:0;background:#19c9dc;color:#fff;display:grid;place-items:center;cursor:pointer}
.al-form button:disabled{opacity:.5;cursor:default}
.al-form button svg{width:20px;height:20px}
.al-rodape{font-size:11px;color:var(--muted);text-align:center;padding:0 10px 8px;background:var(--surface)}
@media (max-width:760px){
  .al-fab{bottom:calc(84px + env(safe-area-inset-bottom,0px));right:14px;width:54px;height:54px}
  .al-fab .al-dica{display:none}
  .al-painel{inset:0;width:auto;height:auto;border-radius:0;border:0;bottom:0;padding-bottom:env(safe-area-inset-bottom,0px)}
}
@media print{.al-fab,.al-painel{display:none}}`;
  document.head.appendChild(css);

  const ICONE = '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M13 5C7.5 5 3 8.6 3 13.1c0 2.4 1.3 4.6 3.4 6.1l-1 3.6c-.1.4.3.7.7.5l4.2-2.1c.9.2 1.8.3 2.7.3 5.5 0 10-3.6 10-8.1S18.5 5 13 5z"/><path d="M27.6 22.5c1.5-1.2 2.4-2.8 2.4-4.6 0-2.4-1.6-4.6-4-5.9 0 .4.1.7.1 1.1 0 5.4-5.3 9.7-11.9 9.9 1.8 1.6 4.5 2.6 7.5 2.6.7 0 1.4-.1 2.1-.2l3.2 1.6c.4.2.8-.1.7-.5l-.1-4z" opacity=".85"/></svg>';
  const ENVIAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // ---------- texto da resposta: markdown simples, sempre escapado ----------
  const VALIDAS = () => VIEWS.map(v => v[0]);
  function inline(t) {
    return t.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>")
      .replace(/\[([^\]]{1,60})\]\(#ir:([a-z]+)(?:\/([a-z]+))?\)/g, (m, txt, v, aj) => VALIDAS().includes(v) ? `<button class="al-ir" data-al-ir="${v}" ${aj ? `data-al-aj="${aj}"` : ""}>${txt} →</button>` : txt);
  }
  function md(src) {
    const L = esc(src).split("\n"), out = []; let lista = null, tab = null;
    const fecha = () => { if (lista) { out.push(`</${lista}>`); lista = null; } if (tab) { out.push(tabela(tab)); tab = null; } };
    const tabela = rows => { const cel = r => r.replace(/^\||\|$/g, "").split("|").map(c => inline(c.trim())); const h = cel(rows[0]), corpo = rows.slice(1).filter(r => !/^\|?\s*:?-{2,}/.test(r)); return `<table><thead><tr>${h.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${corpo.map(r => `<tr>${cel(r).map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`; };
    for (const raw of L) {
      const l = raw.trimEnd();
      if (/^\s*\|.*\|\s*$/.test(l)) { if (lista) { out.push(`</${lista}>`); lista = null; } (tab = tab || []).push(l.trim()); continue; }
      if (tab) { out.push(tabela(tab)); tab = null; }
      let m;
      if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (lista !== "ul") { fecha(); out.push("<ul>"); lista = "ul"; } out.push(`<li>${inline(m[1])}</li>`); continue; }
      if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (lista !== "ol") { fecha(); out.push("<ol>"); lista = "ol"; } out.push(`<li>${inline(m[1])}</li>`); continue; }
      fecha();
      if ((m = l.match(/^#{1,4}\s+(.*)/))) { out.push(`<h4>${inline(m[1])}</h4>`); continue; }
      if (l.trim()) out.push(`<p>${inline(l)}</p>`);
    }
    fecha();
    return out.join("");
  }

  // ---------- contexto: o que está na tela + resumo dos dados ----------
  const nome = id => (S.contas.find(c => c.id === id) || S.cartoes.find(c => c.id === id) || S.invest.find(i => i.id === id) || {}).nome || id || "—";
  const telaAtual = () => (VIEWS.find(v => v[0] === ui.view) || [, ui.view])[1];
  const limpa = (s, n) => String(s || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
  function contexto() {
    const o = [];
    const sec = (t, linhas) => { if (linhas && linhas.length) o.push(`### ${t}\n${linhas.join("\n")}`); };
    o.push(`Hoje: ${br(TODAY)} (${["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][new Date(TODAY + "T12:00:00Z").getUTCDay()]}). Quem pergunta: ${ME.nome} (${ME.papel === "admin" ? "administrador" : "membro"}). Família: ${FAM.nome}. Início do controle: ${br(S.inicio)}.`);
    o.push(`Tela aberta agora: ${telaAtual()}${ui.view === "lancamentos" ? ` (filtros: mês ${ui.lf.mes}${ui.lf.conta ? ", " + nome(ui.lf.conta) : ""}${ui.lf.cat ? ", " + ui.lf.cat : ""}${ui.lf.q ? `, busca "${ui.lf.q}"` : ""})` : ui.view === "cartoes" && ui.card ? ` (cartão ${nome(ui.card)}, fatura ${ui.cardKey || "atual"})` : ui.view === "contas" ? ` (mês ${ui.compMes})` : ""}.`);
    o.push(`Telas para link (#ir:chave): ${VIEWS.map(v => v[0] + " = " + v[1]).join("; ")}. Abas de Configurações: #ir:ajustes/contas, /cartoes, /categorias, /regras, /pessoas, /seguranca, /dados, /auditoria.`);
    const main = document.querySelector("#app main"), camada = document.querySelector(".modal, .drawer");
    if (main) o.push(`### Texto visível na tela agora\n${limpa(main.innerText, 9000)}`);
    if (camada && camada.innerText.trim()) o.push(`### Janela aberta sobre a tela\n${limpa(camada.innerText, 3000)}`);

    sec("Pessoas", S.pessoas.map(p => `- ${p.nome} · ${p.acesso || "responsável"}`));
    sec("Contas (saldo de hoje)", S.contas.map(c => `- ${c.nome} · ${c.tipo} · ${c.inst || "—"} · resp. ${c.resp || "—"} · ${c.caixa ? "entra no caixa" : "fora do caixa"} · saldo inicial ${fmt(c.saldoIni || 0)} · saldo hoje ${fmt(saldoConta(S, c))}`));
    try { const sl = saldoLivre(S, mk(CUR, 31)); o.push(`### Saldo livre até o fim deste mês\nCaixa hoje ${fmt(sl.caixa)} − falta pagar até ${br(mk(CUR, 31))} ${fmt(sl.comprometido)} − reservas planejadas ${fmt(sl.prov)} = saldo livre ${fmt(sl.livre)}. Receitas ainda a receber neste mês (não incluídas): ${fmt(sl.aReceber)}.`); } catch (e) {}

    for (const c of S.cartoes) {
      const r = cardResumo(S, c), at = r.atual.key, fs = [];
      for (let k = addYM(at, -3); k <= addYM(at, 8); k = addYM(k, 1)) { const f = fatura(S, c, k); if (f.itens.length || f.pago) fs.push(`  - fatura de ${ymLong(k)}: ${f.status}, fecha ${br(f.fecha)}, vence ${br(f.vence)}, total ${fmt(f.total)}, pago ${fmt(f.pago)}, saldo ${fmt(f.saldo)}, ${f.itens.length} itens`); }
      sec(`Cartão ${c.nome}`, [`- final ${c.final || "—"} · fecha dia ${c.fecha} · vence dia ${c.vence} · limite ${fmt(c.limite || 0)} · paga com ${nome(c.pagaCom)} · resp. ${c.resp || "—"} · em aberto ${fmt(r.deve)} · disponível estimado ${fmt(r.disponivel)} · fatura atual: ${ymLong(at)} · compras de hoje cairiam na fatura de ${ymLong(keyOf(c, TODAY))}`, ...fs]);
    }
    const parcs = S.parc.map(p => { const c = cardOf(S, p.cartao); if (!c) return null; const k0 = p.k0 || keyOf(c, p.data), k = ymDiff(k0, keyOf(c, TODAY)) + 1; if (k > p.n || (p.cancelDe && k >= p.cancelDe)) return null; return `- ${p.desc} · ${c.nome} · compra ${br(p.data)} · ${fmt(p.total)} em ${p.n}× de ${fmt(parcVal(p, 2))} · 1ª na fatura de ${ymLabel(k0)} · agora na ${Math.max(1, k)}/${p.n} · última em ${ymLabel(addYM(k0, p.n - 1))}${p.cancelDe ? ` · canceladas a partir da ${p.cancelDe}ª` : ""}`; }).filter(Boolean);
    sec("Parcelamentos em andamento no cartão", parcs);

    const cm = []; for (let ym = addYM(CUR, -2); ym <= addYM(CUR, 3); ym = addYM(ym, 1)) for (const c of compromissos(S, ym, ym)) cm.push(`- ${br(c.venc)} · ${c.desc} · ${c.tipo}${c.kind === "fat" ? " (fatura)" : c.kind === "div" ? " (dívida)" : c.kind === "man" ? " (avulsa)" : c.tipo === "receita" ? " (receita prevista)" : " (recorrência)"} · previsto ${fmt(c.valor)}${c.desconto ? ` (desconto ${fmt(c.desconto)})` : ""} · pago ${fmt(c.pago)} · restante ${fmt(Math.max(0, c.restante))} · ${c.status}${ativo(c) && c.venc < TODAY ? " · VENCIDA" : ""}${c.estimado ? " · valor estimado" : ""}`);
    sec(`Contas a pagar e a receber (${ymLong(addYM(CUR, -2))} a ${ymLong(addYM(CUR, 3))})`, cm);
    sec("Recorrências", S.rec.map(r => `- ${r.desc} · ${r.tipo} · ${r.natureza || "Fixa"} · ${r.cat}${r.sub ? "/" + r.sub : ""} · ${fmt(r.valor)} · dia ${r.dia} · ${nome(r.conta)} · ${ymLabel(r.inicio)} a ${r.fim ? ymLabel(r.fim) : "sem fim"}${r.parcTotal ? ` · ${r.parcTotal} parcelas` : ""} · resp. ${r.resp || "—"}`));
    sec("Avulsas (contas lançadas à mão)", S.manuais.map(m => `- ${m.desc} · vence ${br(m.venc)} · ${fmt(m.valor)} · ${m.cat || ""}`));
    sec("Dívidas", S.dividas.map(d => { const r = divResumo(S, d); return `- ${d.nome} · credor ${d.credor || "—"} · etapa ${{ negociar: "A negociar (fora das contas)", pagamento: "Em pagamento", quitada: "Quitada" }[r.etapa]}${d.decisao ? " · " + (DECISOES[d.decisao] || d.decisao) : ""} · saldo ${fmt(d.saldo || 0)}${d.valorOriginal ? ` · original ${fmt(d.valorOriginal)}` : ""}${r.etapa !== "negociar" ? ` · parcela ${fmt(d.parcela || 0)} · ${r.pagas}/${d.total} pagas · falta ${fmt(r.falta)}${r.proxima ? ` · próxima ${br(r.proxima.venc)} ${fmt(r.proxima.restante)}` : ""}${r.atrasadas ? ` · ${r.atrasadas} atrasada(s)` : ""} · dia ${d.dia} · juros ${d.taxa != null ? d.taxa + "% a.m." : "não informado"}` : ""} · prioridade ${d.prioridade || "Média"}${d.desde ? ` · desde ${br(d.desde)}` : ""}${d.obs ? ` · obs: ${d.obs}` : ""}`; }));
    try { const p = projecao(S, ui.varMes || 0); sec(`Previsão 12 meses (gastos variáveis estimados ${fmt(ui.varMes || 0)}/mês)`, [`ponto de partida ${fmt(p.inicio)}`, ...p.meses.map(x => `- ${ymLabel(x.ym)}: receitas ${fmt(x.rec)}, fixas ${fmt(x.fixas)}, dívidas ${fmt(x.div)}, faturas ${fmt(x.fat)}, variáveis ${fmt(x.variaveis)} → saldo livre ao fim ${fmt(x.fim)}`)]); } catch (e) {}
    sec("Investimentos", S.invest.map(i => `- ${i.nome} · ${i.tipo} · ${i.inst || "—"} · saldo ${fmt(investSaldo(i))} · aportado ${fmt(investAportado(i))} · rendimentos ${fmt(investRend(i))}`));
    sec("Provisões", S.provisoes.map(p => `- ${p.nome} · alvo ${fmt(p.alvo)} · reservado ${fmt(provReservado(S, p))} · uso ${p.uso}${p.conta ? " · em " + nome(p.conta) : " · planejada no caixa"}`));
    for (let ym = addYM(CUR, -2); ym <= CUR; ym = addYM(ym, 1)) { const g = {}; gastosMes(S, ym).forEach(r => g[r.cat || "Sem categoria"] = (g[r.cat || "Sem categoria"] || 0) + r.valor); const t = Object.values(g).reduce((a, b) => a + b, 0); sec(`Gastos por categoria em ${ymLong(ym)} (cartão pela fatura do mês; conta pela data) · total ${fmt(t)} · receitas lançadas ${fmt(receitasMes(S, ym))}`, Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${fmt(v)}`)); }
    sec("Categorias", S.categorias.map(c => `- ${c[0]}${c[1] && c[1] !== "receita" ? ": " + c[1] : c[1] === "receita" ? " (receita)" : ""}`));
    sec("Regras de classificação", [...S.regras].sort((a, b) => a.prio - b.prio).map(r => `- "${r.trecho}" → ${r.cat}${r.sub ? "/" + r.sub : ""} (prioridade ${r.prio})`));

    // lançamentos: os mais recentes primeiro (inclui compras de cartão com a fatura em que caem)
    const desde = addDays(TODAY, -150);
    const ls = S.lanc.filter(l => !l.excluido && l.data >= desde).sort((a, b) => a.data < b.data ? 1 : -1);
    const linhaL = l => { const c = l.cartao && cardOf(S, l.cartao); return `${br(l.data)} | ${l.desc} | ${l.tipo} | ${fmt(l.valor)} | ${l.tipo === "transferencia" ? nome(l.conta) + " → " + nome(l.destino) + (l.fatura ? " (fatura " + ymLabel(l.fatura) + ")" : "") : c ? "cartão " + c.nome + " · fatura " + ymLabel(l.fatura || keyOf(c, l.data)) : nome(l.conta)} | ${l.cat || ""}${l.sub ? "/" + l.sub : ""} | ${l.resp || ""} | ${l.origem || ""}${l.obs ? " | obs: " + l.obs : ""}`; };
    const lim = 900;
    sec(`Lançamentos de ${br(desde)} até hoje (${ls.length}${ls.length > lim ? `, mostrando os ${lim} mais recentes` : ""}) — data | descrição | tipo | valor | onde | categoria | responsável | origem`, ls.slice(0, lim).map(linhaL));
    const antigos = S.lanc.filter(l => !l.excluido && l.data < desde).length;
    if (antigos) o.push(`(Há mais ${antigos} lançamentos anteriores a ${br(desde)} que não foram enviados; para eles, oriente a usar a busca ou os filtros de Lançamentos.)`);
    sec("Importações recentes", S.importacoes.slice(0, 10).map(i => `- ${i.id} · ${String(i.data).slice(0, 10)} · ${i.arquivos} · ${i.incl} incluídos, ${i.vinc} vinculados, ${i.ign} ignorados · ${i.user}`));
    sec("Auditoria recente", S.audit.slice(0, 25).map(a => `- ${String(a.ts).slice(0, 16).replace("T", " ")} · ${a.user} · ${a.acao} · ${a.alvo}${a.det ? " · " + a.det : ""}`));
    o.push(`Instruções de resposta: seja direta (respostas curtas por padrão; detalhe quando pedirem). Valores sempre em R$ com vírgula. Quando ajudar, inclua um link para a tela no formato [Abrir Cartões](#ir:cartoes) ou [Abrir cadastro de cartões](#ir:ajustes/cartoes). Se a pergunta depende de algo que não está nos dados enviados, diga o que falta e onde ver.`);
    return o.join("\n\n");
  }

  // ---------- conversa ----------
  async function enviar(texto) {
    texto = String(texto || "").trim(); if (!texto || AL.enviando) return;
    AL.msgs = AL.msgs.filter(m => !m.erro);
    AL.msgs.push({ role: "user", content: texto, ts: Date.now() });
    const resp = { role: "assistant", content: "", ts: Date.now(), lendo: true }; AL.msgs.push(resp);
    AL.enviando = true; AL.rascunho = ""; desenha(true);
    try {
      const cfg = window.CAIXA_CONFIG || {}, { data } = await SB.auth.getSession(), tok = data && data.session && data.session.access_token;
      if (!tok) throw new Error("Sua sessão expirou. Entre no app de novo.");
      AL.ctrl = new AbortController();
      const r = await fetch(cfg.url + "/functions/v1/alicia", { method: "POST", signal: AL.ctrl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, apikey: cfg.chave },
        body: JSON.stringify({ manual: window.ALICIA_MANUAL || "", contexto: contexto(), mensagens: AL.msgs.filter(m => !m.lendo && !m.erro).slice(-MANDA).map(m => ({ role: m.role, content: m.content })) }) });
      if (!r.ok) { let e = ""; try { e = (await r.json()).erro; } catch (x) {} throw new Error(e || (r.status === 404 ? "A Alícia ainda não foi instalada no servidor." : "Falha ao falar com a Alícia (erro " + r.status + ").")); }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "", quando = 0;
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n")) >= 0) {
          const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!ln.startsWith("data:")) continue;
          let ev; try { ev = JSON.parse(ln.slice(5)); } catch (e) { continue; }
          if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") { resp.content += ev.delta.text; resp.lendo = false; if (Date.now() - quando > 60) { quando = Date.now(); atualizaUltima(); } }
          else if (ev.type === "error") throw new Error(ev.error && /overload/i.test(ev.error.type || "") ? "O serviço da IA está sobrecarregado agora. Tente de novo em instantes." : "A resposta foi interrompida.");
        }
      }
      if (!resp.content.trim()) throw new Error("A Alícia não respondeu. Tente de novo.");
    } catch (e) {
      if (e.name === "AbortError") { if (!resp.content) AL.msgs.pop(); }
      else { if (resp.content) resp.content += "\n\n*(resposta interrompida)*"; else { AL.msgs.pop(); AL.msgs.push({ role: "assistant", content: e.message || String(e), erro: true, pergunta: texto }); } }
    }
    resp.lendo = false; AL.enviando = false; AL.ctrl = null; guarda(); desenha(true);
  }

  // ---------- tela ----------
  const sugestoes = () => {
    const base = { painel: ["O que falta pagar este mês e quanto vai sobrar?", "Como é calculado o saldo livre?"], lancamentos: ["Quanto gastamos com alimentação este mês?", "Como lanço uma compra parcelada?"], cartoes: ["Quanto está a fatura atual de cada cartão?", "Por que essa compra caiu nessa fatura?"], contas: ["Quais contas estão vencidas?", "O que faço se paguei menos que o previsto?"], planejamento: ["Vamos fechar algum mês no negativo?", "O que são os gastos variáveis estimados?"], dividas: ["Qual dívida vale quitar primeiro?", "Qual a diferença entre 'a negociar' e 'em pagamento'?"], importar: ["Como importo os prints do app do cartão?", "Como o app evita lançamento duplicado?"], investimentos: ["Quanto rendeu nossos investimentos?"], ajustes: ["Para que serve o campo 'Paga com' do cartão?", "Como funcionam as regras de classificação?"] };
    return [...(base[ui.view] || []), "Explique o que estou vendo nesta tela", "Onde encontro o histórico do que cada um alterou?"].slice(0, 4);
  };
  const htmlMsg = (m, i) => m.role === "user" ? `<div class="al-m eu">${esc(m.content)}</div>`
    : `<div class="al-m ela ${m.erro ? "erro" : ""}" ${i === AL.msgs.length - 1 ? 'id="al-ult"' : ""}>${m.lendo && !m.content ? '<span class="al-dots" aria-label="Alícia está escrevendo"><i></i><i></i><i></i></span>' : md(m.content)}${m.erro ? `<p><button class="al-ir" data-al="tentar">Tentar de novo</button></p>` : ""}</div>`;
  function desenha(rolar, soGarante) {
    let fab = document.getElementById("al-fab"), pn = document.getElementById("al-painel");
    const visivel = typeof ui !== "undefined" && ui.screen === "app" && typeof ME !== "undefined" && ME;
    if (!visivel) { if (fab) fab.remove(); if (pn) pn.remove(); return; }
    if (AL._k !== chave()) carrega();
    if (!fab) { fab = document.createElement("button"); fab.id = "al-fab"; fab.className = "al-fab"; fab.setAttribute("aria-label", "Falar com a Alícia, assistente do app"); fab.dataset.al = "abrir"; fab.innerHTML = ICONE + '<span class="al-dica">Dúvidas? Fale com a Alícia</span>'; document.body.appendChild(fab); }
    fab.style.display = AL.aberta && matchMedia("(max-width:760px)").matches ? "none" : "";
    fab.setAttribute("aria-expanded", AL.aberta);
    if (!AL.aberta) { if (pn) pn.remove(); return; }
    if (soGarante && pn) return; // o app redesenhou (sincronização etc.): não mexe na conversa nem no que está sendo digitado
    const ta = document.getElementById("al-txt"); if (ta) AL.rascunho = ta.value;
    if (!pn) { pn = document.createElement("section"); pn.id = "al-painel"; pn.className = "al-painel"; pn.setAttribute("role", "dialog"); pn.setAttribute("aria-label", "Conversa com a Alícia"); document.body.appendChild(pn); }
    pn.innerHTML = `<div class="al-top"><div class="al-av">A</div><div class="t"><b>Alícia</b><span>Assistente do Caixa da Família</span></div>${AL.msgs.length ? `<button data-al="nova" title="Começar uma conversa nova">Nova</button>` : ""}<button data-al="fechar" aria-label="Fechar">✕</button></div>
      <div class="al-log" id="al-log" aria-live="polite">${AL.msgs.length ? AL.msgs.map(htmlMsg).join("") : `<div class="al-oi"><div class="al-m ela"><p>Oi, ${esc((ME.nome || "").split(" ")[0])}! Eu sou a <b>Alícia</b>. Conheço cada tela, campo e regra do Caixa e enxergo os dados de vocês: lançamentos, faturas, contas a pagar, dívidas, previsões.</p><p>Pergunte qualquer coisa, do jeito que vier à cabeça.</p></div><div class="al-sug">${sugestoes().map(s => `<button data-al="sug">${esc(s)}</button>`).join("")}</div></div>`}</div>
      <form class="al-form" id="al-form"><textarea id="al-txt" rows="1" placeholder="Pergunte para a Alícia…" aria-label="Sua pergunta">${esc(AL.rascunho)}</textarea>${AL.enviando ? `<button type="button" data-al="parar" aria-label="Parar resposta" title="Parar">■</button>` : `<button aria-label="Enviar">${ENVIAR}</button>`}</form>
      <div class="al-rodape">A Alícia lê os dados da família para responder e pode errar: confira valores importantes.</div>`;
    const log = document.getElementById("al-log"); if (rolar && log) log.scrollTop = log.scrollHeight;
    const t = document.getElementById("al-txt"); if (t) { ajusta(t); if (!AL.enviando && !matchMedia("(max-width:760px)").matches) t.focus(); }
  }
  function atualizaUltima() { const el = document.getElementById("al-ult"), m = AL.msgs[AL.msgs.length - 1], log = document.getElementById("al-log"); if (!el || !m) return desenha(true); const perto = log.scrollHeight - log.scrollTop - log.clientHeight < 80; el.innerHTML = md(m.content); if (perto) log.scrollTop = log.scrollHeight; }
  const ajusta = t => { t.style.height = "auto"; t.style.height = Math.min(130, t.scrollHeight) + "px"; };

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-al],[data-al-ir]"); if (!b) return;
    if (b.dataset.alIr) { e.preventDefault(); e.stopPropagation(); if (b.dataset.alAj) ui.aj = b.dataset.alAj; if (matchMedia("(max-width:760px)").matches) AL.aberta = false; go(b.dataset.alIr); desenha(); return; }
    const a = b.dataset.al; e.preventDefault();
    if (a === "abrir") { AL.aberta = !AL.aberta; desenha(true); }
    else if (a === "fechar") { AL.aberta = false; desenha(); }
    else if (a === "nova") { if (AL.ctrl) AL.ctrl.abort(); AL.msgs = []; guarda(); desenha(true); }
    else if (a === "sug") enviar(b.textContent);
    else if (a === "parar") { if (AL.ctrl) AL.ctrl.abort(); }
    else if (a === "tentar") { const m = AL.msgs[AL.msgs.length - 1]; if (m && m.erro) { AL.msgs.pop(); const p = AL.msgs[AL.msgs.length - 1]; if (p && p.role === "user") AL.msgs.pop(); enviar(m.pergunta); } }
  });
  document.addEventListener("submit", e => { if (e.target.id !== "al-form") return; e.preventDefault(); const t = document.getElementById("al-txt"); enviar(t.value); });
  document.addEventListener("keydown", e => {
    if (e.target.id === "al-txt" && e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(e.target.value); }
    else if (e.key === "Escape" && AL.aberta && e.target.closest && e.target.closest("#al-painel")) { AL.aberta = false; desenha(); document.getElementById("al-fab")?.focus(); }
  });
  document.addEventListener("input", e => { if (e.target.id === "al-txt") { AL.rascunho = e.target.value; ajusta(e.target); } });

  // aparece junto com o app (login, troca de usuário, saída)
  const renderOriginal = render;
  render = function () { const r = renderOriginal.apply(this, arguments); try { desenha(false, true); } catch (e) { console.error(e); } return r; };
  window.addEventListener("resize", () => { const f = document.getElementById("al-fab"); if (f) f.style.display = AL.aberta && matchMedia("(max-width:760px)").matches ? "none" : ""; });
  window.alicia = { abrir: () => { AL.aberta = true; desenha(true); }, perguntar: t => { AL.aberta = true; enviar(t); }, contexto };
  try { desenha(); } catch (e) {}
})();
