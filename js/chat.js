// ================= CONVERSA DA FAMÍLIA =================
// Módulo carregado depois de ui.js: acrescenta a área "Conversa" ao menu.
// Mensagens ficam na tabela public.mensagens (só membros da família leem/escrevem)
// e chegam em tempo real pelo Supabase Realtime, com verificação periódica de reserva.

(function () {
  const CHAT = { msgs: [], fam: null, canal: null, timer: null, carregando: false, erro: "", enviando: false, rascunho: "", naoLidas: 0, primeiraCarga: false };
  const LIMITE = 300;
  const chaveVista = () => "caixa-chat-visto-" + (ME ? ME.id : "") + "-" + (FAM ? FAM.id : "");
  const lerVisto = () => { try { return localStorage.getItem(chaveVista()) || ""; } catch (e) { return ""; } };
  const gravarVisto = ts => { try { localStorage.setItem(chaveVista(), ts); } catch (e) {} };

  // ---------- menu, ícone e estilos ----------
  IC.chat = '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4.5"/>';
  const iAjustes = VIEWS.findIndex(v => v[0] === "ajustes");
  VIEWS.splice(iAjustes < 0 ? VIEWS.length : iAjustes, 0, ["chat", "Conversa"]);
  const css = document.createElement("style");
  css.textContent = `
.nav button{position:relative}
.nav .badge{margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:var(--crit);color:#fff;font:600 11px/20px var(--f-body);text-align:center}
.chat{display:flex;flex-direction:column;height:calc(100vh - 150px);min-height:420px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.chat-log{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:4px;overscroll-behavior:contain}
.chat-dia{align-self:center;font-size:11.5px;color:var(--muted);background:var(--sunken);border-radius:99px;padding:2px 10px;margin:10px 0 6px}
.msg{display:flex;flex-direction:column;max-width:min(560px,82%);align-self:flex-start;gap:2px}
.msg.minha{align-self:flex-end;align-items:flex-end}
.msg .quem{font-size:11.5px;font-weight:600;color:var(--muted);padding:0 4px;margin-top:6px}
.msg .bolha{background:var(--sunken);border-radius:14px 14px 14px 4px;padding:8px 12px;white-space:pre-wrap;word-break:break-word;line-height:1.45}
.msg.minha .bolha{background:var(--accent);color:var(--accent-ink);border-radius:14px 14px 4px 14px}
.msg.apagada .bolha{background:none;border:1px dashed var(--line);color:var(--muted);font-style:italic}
.msg .meta{font-size:11px;color:var(--muted);padding:0 4px;display:flex;gap:8px;align-items:center}
.msg .meta button{border:0;background:none;color:var(--muted);font-size:11px;padding:0;text-decoration:underline;cursor:pointer;opacity:0;transition:opacity .15s}
.msg:hover .meta button,.msg:focus-within .meta button{opacity:1}
.msg.pendente .bolha{opacity:.6}
.msg.falhou .bolha{outline:2px solid var(--crit)}
.chat-form{display:flex;gap:8px;align-items:flex-end;border-top:1px solid var(--line);padding:10px 12px;padding-bottom:calc(10px + env(safe-area-inset-bottom,0px));background:var(--surface)}
.chat-form textarea{flex:1;resize:none;min-height:42px;max-height:140px;border-radius:12px;padding:10px 12px;background:var(--bg);line-height:1.4}
.chat-form .btn{height:42px}
.chat-vazio{margin:auto;text-align:center;color:var(--muted);display:flex;flex-direction:column;gap:6px;max-width:340px}
.chat-vazio b{color:var(--ink);font-size:15px}
.chat-aviso{font-size:12px;color:var(--muted);padding:6px 18px;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.chat-aviso .ponto{width:8px;height:8px;border-radius:50%;background:var(--good)}
.chat-aviso .ponto.off{background:var(--warn)}
@media (max-width:760px){.chat{height:calc(100vh - 210px);border-radius:0;margin:0 -16px;border-left:0;border-right:0}.msg{max-width:88%}}`;
  document.head.appendChild(css);

  // ---------- dados ----------
  const horaBR = ts => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
  const diaBR = ts => { const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts)); return d === TODAY ? "Hoje" : d === addDays(TODAY, -1) ? "Ontem" : br(d); };
  function contarNaoLidas() { const v = lerVisto(); CHAT.naoLidas = CHAT.msgs.filter(m => m.user_id !== ME.id && !m.apagada && m.criado_em > v).length; atualizarBadge(); }
  function atualizarBadge() {
    document.querySelectorAll('.nav [data-go="chat"] .badge, .more-btn .badge').forEach(b => b.remove());
    if (!CHAT.naoLidas || ui.view === "chat") return;
    const b = `<span class="badge" aria-label="${CHAT.naoLidas} mensagens não lidas">${CHAT.naoLidas > 99 ? "99+" : CHAT.naoLidas}</span>`;
    const bt = document.querySelector('.nav [data-go="chat"]'); if (bt) bt.insertAdjacentHTML("beforeend", b);
    const mais = document.querySelector(".more-btn"); if (mais && window.matchMedia("(max-width:760px)").matches) mais.insertAdjacentHTML("beforeend", b);
    document.title = (CHAT.naoLidas ? `(${CHAT.naoLidas}) ` : "") + "Caixa da Família";
  }
  function juntar(lista) {
    const porId = new Map(CHAT.msgs.map(m => [m.id, m]));
    for (const m of lista) porId.set(m.id, Object.assign(porId.get(m.id) || {}, m, { pendente: false, falhou: false }));
    CHAT.msgs = [...porId.values()].sort((a, b) => a.criado_em < b.criado_em ? -1 : 1).slice(-LIMITE);
  }
  async function carregar() {
    if (!SB || !FAM || CHAT.carregando) return;
    CHAT.carregando = true;
    const { data, error } = await SB.from("mensagens").select("*").eq("familia_id", FAM.id).order("criado_em", { ascending: false }).limit(LIMITE);
    CHAT.carregando = false;
    if (error) { CHAT.erro = /relation|does not exist|schema cache/i.test(error.message) ? "A conversa ainda não foi ativada no banco de dados." : "Não foi possível carregar as mensagens."; if (ui.view === "chat") desenhar(); return; }
    CHAT.erro = ""; juntar(data.reverse()); CHAT.primeiraCarga = true;
    if (ui.view === "chat") { desenhar(); marcarVisto(); } else contarNaoLidas();
  }
  function marcarVisto() { const ult = CHAT.msgs[CHAT.msgs.length - 1]; if (ult) gravarVisto(ult.criado_em); CHAT.naoLidas = 0; atualizarBadge(); }
  function iniciar() {
    if (CHAT.fam === FAM.id) return;
    parar(); CHAT.fam = FAM.id; CHAT.msgs = []; CHAT.primeiraCarga = false;
    carregar();
    try {
      CHAT.canal = SB.channel("chat-" + FAM.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "mensagens", filter: "familia_id=eq." + FAM.id }, p => {
          if (p.new && p.new.id) { juntar([p.new]); if (ui.view === "chat") { desenhar(true); if (document.visibilityState === "visible") marcarVisto(); } else contarNaoLidas(); }
        })
        .subscribe(st => { CHAT.aoVivo = st === "SUBSCRIBED"; const p = document.querySelector(".chat-aviso .ponto"); if (p) { p.classList.toggle("off", !CHAT.aoVivo); p.nextElementSibling.textContent = CHAT.aoVivo ? "Ao vivo" : "Reconectando…"; } });
    } catch (e) { CHAT.aoVivo = false; }
    CHAT.timer = setInterval(() => { if (document.visibilityState === "visible") carregar(); }, 20000);
  }
  function parar() { if (CHAT.canal) { try { SB.removeChannel(CHAT.canal); } catch (e) {} } CHAT.canal = null; clearInterval(CHAT.timer); CHAT.fam = null; }
  async function enviar(texto) {
    texto = texto.replace(/\s+$/, "").replace(/^\s+/, "");
    if (!texto) return;
    if (texto.length > 2000) { toast("A mensagem passou de 2.000 caracteres."); return; }
    const temp = { id: "tmp-" + rid(), familia_id: FAM.id, user_id: ME.id, autor: ME.nome, texto, criado_em: new Date().toISOString(), pendente: true };
    CHAT.msgs.push(temp); CHAT.rascunho = ""; desenhar(true);
    const { data, error } = await SB.from("mensagens").insert({ familia_id: FAM.id, autor: ME.nome, texto }).select().single();
    CHAT.msgs = CHAT.msgs.filter(m => m.id !== temp.id);
    if (error) { temp.pendente = false; temp.falhou = true; CHAT.msgs.push(temp); desenhar(true); toast("Mensagem não enviada. Confira a internet e toque em “Tentar de novo”."); return; }
    juntar([data]); desenhar(true); marcarVisto();
  }
  async function apagar(id) {
    const { data, error } = await SB.from("mensagens").update({ apagada: true }).eq("id", id).select().single();
    if (error) { toast("Não foi possível apagar a mensagem."); return; }
    juntar([data]); desenhar();
  }

  // ---------- tela ----------
  function htmlMensagens() {
    if (!CHAT.msgs.length) return CHAT.primeiraCarga ? `<div class="chat-vazio"><b>Nenhuma mensagem ainda</b><span>Escreva para ${esc(ui.membros.filter(m => m.user_id !== ME.id).map(m => m.nome.split(" ")[0]).join(" e ") || "a família")} sobre contas, compras e planos. Só quem é da família vê esta conversa.</span></div>` : `<div class="chat-vazio"><span>Carregando mensagens…</span></div>`;
    let out = "", diaAnt = "", autorAnt = "", tsAnt = 0;
    for (const m of CHAT.msgs) {
      const dia = diaBR(m.criado_em), minha = m.user_id === ME.id, t = Date.parse(m.criado_em);
      if (dia !== diaAnt) { out += `<div class="chat-dia">${dia}</div>`; diaAnt = dia; autorAnt = ""; }
      const mostraNome = !minha && (m.user_id !== autorAnt || t - tsAnt > 10 * 60000);
      out += `<div class="msg ${minha ? "minha" : ""} ${m.apagada ? "apagada" : ""} ${m.pendente ? "pendente" : ""} ${m.falhou ? "falhou" : ""}" data-msg="${esc(m.id)}">
        ${mostraNome ? `<span class="quem">${esc(m.autor)}</span>` : ""}
        <div class="bolha">${esc(m.texto)}</div>
        <span class="meta">${m.pendente ? "Enviando…" : m.falhou ? `Não enviada <button data-act="chatreenviar" data-arg="${esc(m.id)}">Tentar de novo</button>` : horaBR(m.criado_em)}${minha && !m.apagada && !m.pendente && !m.falhou ? ` <button data-act="chatapagar" data-arg="${esc(m.id)}">Apagar</button>` : ""}</span></div>`;
      autorAnt = m.user_id; tsAnt = t;
    }
    return out;
  }
  function vChat() {
    const outros = ui.membros.filter(m => m.user_id !== ME.id).map(m => m.nome);
    return `${topbar("Conversa", esc(FAM.nome) + " · " + (outros.length ? "com " + esc(outros.join(", ")) : "convide alguém em Configurações para conversar"))}
    <section class="chat" aria-label="Conversa da família">
      <div class="chat-aviso"><span class="ponto ${CHAT.aoVivo ? "" : "off"}"></span><span>${CHAT.aoVivo ? "Ao vivo" : "Conectando…"}</span><span>· Só os membros da família veem estas mensagens.</span></div>
      <div class="chat-log" id="chatlog" role="log" aria-live="polite">${CHAT.erro ? `<div class="chat-vazio"><b>${esc(CHAT.erro)}</b><span>Peça para quem administra o sistema rodar a atualização do banco.</span></div>` : htmlMensagens()}</div>
      <form class="chat-form" data-form="chat" autocomplete="off">
        <label class="sr" for="chat-txt">Mensagem</label>
        <textarea id="chat-txt" name="texto" rows="1" maxlength="2000" placeholder="Escreva uma mensagem" ${CHAT.erro ? "disabled" : ""}>${esc(CHAT.rascunho)}</textarea>
        <button class="btn primary" ${CHAT.erro ? "disabled" : ""}>Enviar</button>
      </form>
    </section>`;
  }
  function desenhar(rolar) {
    if (ui.view !== "chat") return;
    const log = document.getElementById("chatlog"); if (!log) return;
    const noFim = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
    log.innerHTML = CHAT.erro ? log.innerHTML : htmlMensagens();
    if (rolar || noFim) log.scrollTop = log.scrollHeight;
  }
  VIEWFN.chat = vChat;

  // ---------- integração com o app ----------
  const renderOriginal = render;
  render = function () {
    const ta = document.getElementById("chat-txt"); if (ta) CHAT.rascunho = ta.value;
    renderOriginal();
    if (ui.screen === "app" && FAM && SB) {
      iniciar();
      if (ui.view === "chat") {
        const log = document.getElementById("chatlog"); if (log) log.scrollTop = log.scrollHeight;
        marcarVisto();
        const t = document.getElementById("chat-txt"); if (t && window.matchMedia("(min-width:761px)").matches) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
      } else atualizarBadge();
    } else if (ui.screen !== "app") { parar(); CHAT.msgs = []; CHAT.naoLidas = 0; document.title = "Caixa da Família"; }
  };
  forms.chat = f => { const t = f.elements.texto; enviar(t.value); t.value = ""; t.style.height = ""; t.focus(); return false; };
  acts.chatapagar = id => {
    const el = document.querySelector(`[data-msg="${CSS.escape(id)}"] .meta`);
    if (!el) return;
    el.innerHTML = `Apagar para todos? <button data-act="chatapagarok" data-arg="${esc(id)}">Apagar</button> <button data-act="chatcancelar">Cancelar</button>`;
    el.querySelectorAll("button").forEach(b => b.style.opacity = 1);
  };
  acts.chatapagarok = id => apagar(id);
  acts.chatcancelar = () => desenhar();
  acts.chatreenviar = id => { const m = CHAT.msgs.find(x => x.id === id); if (!m) return; CHAT.msgs = CHAT.msgs.filter(x => x.id !== id); enviar(m.texto); };
  document.addEventListener("keydown", e => {
    if (e.target.id === "chat-txt" && e.key === "Enter" && !e.shiftKey && !e.isComposing && window.matchMedia("(min-width:761px)").matches) { e.preventDefault(); e.target.form.requestSubmit(); }
  });
  document.addEventListener("input", e => { if (e.target.id === "chat-txt") { e.target.style.height = "auto"; e.target.style.height = Math.min(140, e.target.scrollHeight) + "px"; } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && ui.view === "chat") { carregar(); marcarVisto(); } });
})();
