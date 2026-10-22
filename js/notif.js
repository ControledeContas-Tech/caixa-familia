// ================= NOTIFICAÇÕES =================
// Tudo o que aparece no aviso da parte de baixo da tela (toast) fica guardado aqui,
// neste aparelho, para ler com calma depois. Erros ficam marcados como "não lidos"
// até a pessoa abrir a tela de Notificações.

(function () {
  const MAX = 300;
  const N = window.NOTIF = { lista: null, k: "", filtro: "todas" };

  // ---------- menu, ícone e estilos ----------
  IC.notificacoes = '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>';
  const iAj = VIEWS.findIndex(v => v[0] === "ajustes");
  VIEWS.splice(iAj < 0 ? VIEWS.length : iAj, 0, ["notificacoes", "Notificações"]);
  const css = document.createElement("style");
  css.textContent = `
.toast{display:flex;align-items:flex-start;gap:12px;line-height:1.4;width:max-content}
.toast .tmsg{flex:1;min-width:0}
.toast button{border:0;background:none;color:inherit;font:inherit;font-weight:600;padding:0;cursor:pointer;white-space:nowrap}
.toast .tver{text-decoration:underline}
.toast .tx{opacity:.7;font-size:16px;line-height:1}
.toast.t-erro{background:var(--crit);color:#fff}
.toast.t-aviso{background:var(--warn);color:#fff}
.sino{position:relative;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--surface);display:inline-grid;place-items:center;color:var(--ink);flex:none}
.sino svg{width:18px;height:18px}
.sino .badge{position:absolute;top:-5px;right:-6px;margin:0}
button.sync{border:0;background:none;padding:0;font:inherit;font-size:11.5px;cursor:pointer;text-decoration:underline}
.nt-barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.nt-barra .seg{margin-right:auto}
.nt-lista{display:flex;flex-direction:column;gap:8px}
.nt{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--line);border-radius:var(--r);padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.nt.erro{border-left-color:var(--crit)} .nt.aviso{border-left-color:var(--warn)} .nt.ok{border-left-color:var(--good)}
.nt.nova{box-shadow:0 0 0 2px var(--crit-soft)}
.nt-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--muted)}
.nt-msg{font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.nt-det summary{cursor:pointer;font-size:12.5px;color:var(--muted)}
.nt-det pre{margin:6px 0 0;padding:10px;background:var(--sunken);border-radius:8px;font-size:12px;white-space:pre-wrap;word-break:break-word}
.nt-vazio{text-align:center;color:var(--muted);padding:40px 16px}
.nt-dia{font-size:12px;font-weight:600;color:var(--muted);margin:10px 2px 0}`;
  document.head.appendChild(css);

  // ---------- dados (localStorage, por usuário) ----------
  const chave = () => "caixa-notif-" + (typeof ME !== "undefined" && ME ? ME.id : "anon");
  function lista() {
    const k = chave(); if (N.lista && N.k === k) return N.lista;
    let l = []; try { l = JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) {}
    N.lista = Array.isArray(l) ? l : []; N.k = k; return N.lista;
  }
  function gravar() { try { localStorage.setItem(N.k, JSON.stringify(N.lista.slice(0, MAX))); } catch (e) {} }
  const ERRO = /^erro\b|não foi possível|não pude|falhou|não enviada|não autorizada|inválid|nenhum arquivo pôde/i;
  const AVISO = /^(informe|escolha|confira|digite|cadastre|preencha|a data|o valor|a parcela|o mês|o desconto|as senhas|já existe|essa categoria|não há|não encontrei|o navegador|seu acesso|você está)/i;
  N.tipo = msg => ERRO.test(msg) ? "erro" : AVISO.test(msg) ? "aviso" : "ok";
  N.naoLidas = () => lista().filter(n => !n.lida).length;
  N.registrar = (msg, tipo, det) => {
    const l = lista(), agora = new Date().toISOString(), ult = l[0];
    if (ult && ult.msg === msg && (ult.det || "") === (det || "") && Date.now() - Date.parse(ult.ts) < 60000) { ult.n = (ult.n || 1) + 1; ult.ts = agora; if (tipo === "erro") ult.lida = false; }
    else {
      const tela = typeof ui !== "undefined" && ui.screen === "app" ? (VIEWS.find(v => v[0] === ui.view) || [, ""])[1] : "";
      l.unshift({ id: rid("nt"), ts: agora, tipo, msg, det: det || "", tela, lida: tipo !== "erro" });
    }
    if (l.length > MAX) l.length = MAX;
    gravar(); badge();
  };

  // ---------- sino e marcadores ----------
  const qtd = n => n > 99 ? "99+" : n;
  window.sinoNotif = () => { const n = N.naoLidas(); return `<button class="sino" data-go="notificacoes" aria-label="Notificações${n ? ` (${n} não lidas)` : ""}" title="Notificações">${icon("notificacoes")}${n ? `<span class="badge">${qtd(n)}</span>` : ""}</button>`; };
  function badge() {
    document.querySelectorAll('.nav [data-go="notificacoes"] .badge').forEach(b => b.remove());
    const n = typeof ui !== "undefined" && ui.view === "notificacoes" ? 0 : N.naoLidas();
    const bt = document.querySelector('.nav [data-go="notificacoes"]'); if (bt && n) bt.insertAdjacentHTML("beforeend", `<span class="badge" aria-label="${n} erros não lidos">${qtd(n)}</span>`);
    const s = document.querySelector(".sino"); if (s) s.outerHTML = sinoNotif();
  }

  // ---------- tela ----------
  const quando = ts => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(ts));
  const diaDe = ts => { const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ts)); return d === TODAY ? "Hoje" : d === addDays(TODAY, -1) ? "Ontem" : br(d); };
  const ROT = { erro: ["Erro", "p-crit"], aviso: ["Aviso", "p-warn"], ok: ["Confirmação", "p-good"] };
  function vNotif() {
    const l = lista(), f = N.filtro;
    const cont = { todas: l.length, erro: l.filter(n => n.tipo === "erro").length, aviso: l.filter(n => n.tipo === "aviso").length, ok: l.filter(n => n.tipo === "ok").length };
    const vis = l.filter(n => f === "todas" || n.tipo === f);
    const pend = ui.salvando === "erro" ? `<div class="aviso crit"><span>Há alterações que ainda <b>não foram salvas</b> no banco de dados. Elas só existem nesta tela até salvar.</span><button class="mini" data-act="notifsalvar">Tentar salvar agora</button></div>` : "";
    let dia = "", corpo = "";
    for (const n of vis) {
      const d = diaDe(n.ts); if (d !== dia) { dia = d; corpo += `<div class="nt-dia">${d}</div>`; }
      const [rot, cls] = ROT[n.tipo] || ROT.ok;
      corpo += `<article class="nt ${n.tipo}${n.lida ? "" : " nova"}"><div class="nt-top"><span class="pill ${cls}">${rot}</span>${n.lida ? "" : '<span class="pill p-crit">Novo</span>'}<span>${quando(n.ts)}</span>${n.tela ? `<span>· em ${esc(n.tela)}</span>` : ""}${n.n > 1 ? `<span>· apareceu ${n.n} vezes</span>` : ""}</div>
        <div class="nt-msg">${esc(n.msg)}</div>${n.det ? `<details class="nt-det"><summary>Detalhes técnicos</summary><pre>${esc(n.det)}</pre></details>` : ""}</article>`;
    }
    // ao abrir a tela, tudo passa a contar como lido (o destaque "Novo" some na próxima visita)
    if (l.some(n => !n.lida)) { l.forEach(n => n.lida = true); gravar(); setTimeout(badge, 0); }
    const seg = [["todas", "Todas"], ["erro", "Erros"], ["aviso", "Avisos"], ["ok", "Confirmações"]].map(([k, t]) => `<button data-act="notiffiltro" data-arg="${k}" aria-pressed="${f === k}">${t} <span class="sub">${cont[k]}</span></button>`).join("");
    return `${topbar("Notificações", "Histórico dos avisos que aparecem na parte de baixo da tela. Fica guardado neste aparelho (últimos " + MAX + ").")}
      ${pend}
      <div class="nt-barra"><div class="seg" role="group" aria-label="Filtrar">${seg}</div>${l.length ? `<button class="mini ghost" data-act="notiflimpar">Limpar histórico</button>` : ""}</div>
      <div class="nt-lista">${corpo || `<div class="nt-vazio">${l.length ? "Nada neste filtro." : "Nenhuma notificação ainda. Quando aparecer um aviso na parte de baixo da tela, ele fica guardado aqui."}</div>`}</div>`;
  }
  VIEWFN.notificacoes = vNotif;

  Object.assign(acts, {
    notiffiltro: k => { N.filtro = k; render(); },
    notiflimpar: () => modal("Limpar histórico de notificações", `<p>Apaga a lista de avisos guardada <b>neste aparelho</b>. Não mexe em nenhum lançamento nem em dados da família.</p><div class="row-actions"><button class="btn primary" data-act="notiflimparok">Limpar</button><button class="btn" data-close>Cancelar</button></div>`),
    notiflimparok: () => { lista().length = 0; gravar(); closeLayer(); render(); },
    notifsalvar: async () => { await DB.sync(S); render(); if (ui.salvando !== "erro") toast("Alterações salvas."); },
  });

  const renderOriginal = render;
  render = function () { renderOriginal(); if (ui.screen === "app") badge(); };
})();
