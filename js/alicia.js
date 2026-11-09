// ================= ALÍCIA · assistente do Caixa da Família =================
// Botão flutuante em todas as telas. Primeiro responde no próprio aparelho, sem custo (js/alicia-local.js: cálculos do
// sistema + manual). Só as perguntas abertas ou difíceis vão, com permissão, para a Edge Function "alicia", que usa uma IA
// gratuita (Google Gemini) e recebe apenas a pergunta, os números ligados a ela e a imagem anexada, se houver.

(function () {
  const AL = { aberta: false, msgs: [], enviando: false, ctrl: null, rascunho: "" };
  const MAX_HIST = 40, MANDA = 12;
  const chave = () => "caixa-alicia-" + (ME ? ME.id : "");
  const carrega = () => { try { AL.msgs = JSON.parse(localStorage.getItem(chave()) || "[]"); } catch (e) { AL.msgs = []; } AL._k = chave(); };
  const guarda = () => { try { localStorage.setItem(chave(), JSON.stringify(AL.msgs.filter(m => !m.erro && !m.perm && !m.lendo).slice(-MAX_HIST))); } catch (e) {} };

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

  // ---------- estilos novos: imagem anexada, origem da resposta, permissão ----------
  const css2 = document.createElement("style");
  css2.textContent = `
.al-form .al-clip{background:transparent;color:var(--muted);border:1px solid var(--line);min-width:42px}
.al-form .al-clip:hover{color:#0b7f8c;border-color:#19c9dc}
.al-anexo{display:flex;align-items:center;gap:8px;padding:8px 10px 0;background:var(--surface)}
.al-anexo img{height:48px;max-width:90px;object-fit:cover;border-radius:8px;border:1px solid var(--line)}
.al-anexo span{font-size:12px;color:var(--muted);flex:1}
.al-anexo button{border:0;background:var(--sunken);color:var(--ink);border-radius:6px;width:26px;height:26px;cursor:pointer}
.al-m.eu img{display:block;max-width:180px;max-height:140px;border-radius:8px;margin-bottom:6px}
.al-fonte{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:11.5px;color:var(--muted)}
.al-fonte .tag{border:1px solid var(--line);border-radius:99px;padding:1px 8px}
.al-fonte .tag.ia{border-color:#19c9dc;color:#0b7f8c}
.al-perm{border:1px solid #19c9dc;background:color-mix(in srgb,#19c9dc 8%,var(--surface));border-radius:12px;padding:10px 12px;font-size:13.5px;line-height:1.45}
.al-perm .acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.al-perm button{border:1px solid #19c9dc;background:#19c9dc;color:#fff;border-radius:10px;padding:6px 12px;font:500 13px var(--f-body);cursor:pointer}
.al-perm button.nao{background:transparent;color:#0b7f8c}
.al-etapa{font-size:12.5px;color:var(--muted)}
.al-rodape button{border:0;background:none;color:#0b7f8c;text-decoration:underline;font:inherit;cursor:pointer;padding:0}`;
  document.head.appendChild(css2);
  const CLIPE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/></svg>';

  // ---------- permissão para usar a IA gratuita (por pessoa, neste aparelho) ----------
  const chavePref = () => "caixa-alicia-ia-" + (ME ? ME.id : "");
  const iaPref = () => { try { return localStorage.getItem(chavePref()); } catch (e) { return null; } }; // "sim" | "nao" | null
  const setIaPref = v => { try { v ? localStorage.setItem(chavePref(), v) : localStorage.removeItem(chavePref()); } catch (e) {} };
  let iaIndisponivel = null; // motivo, quando o servidor disse que a IA não está ligada

  // ---------- imagem ----------
  function carregaImg(blob) { return new Promise((ok, ko) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { ok(im); URL.revokeObjectURL(u); }; im.onerror = () => { ko(new Error("imagem inválida")); URL.revokeObjectURL(u); }; im.src = u; }); }
  async function reduz(blob, max, q) { const im = await carregaImg(blob), k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement("canvas"); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); const c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL("image/jpeg", q); }
  async function anexa(file) {
    if (!file || !/^image\//.test(file.type)) { toast("Anexe uma imagem (print ou foto)."); return; }
    if (file.size > 15e6) { toast("Imagem muito grande (máximo 15 MB)."); return; }
    try { AL.img = { blob: file, thumb: await reduz(file, 220, 0.7), nome: file.name || "imagem colada" }; } catch (e) { toast("Não consegui abrir essa imagem."); return; }
    desenha(true); document.getElementById("al-txt")?.focus();
  }

  // ---------- conversa ----------
  const historicoIA = () => AL.msgs.filter(m => !m.lendo && !m.erro && !m.perm && m.content).slice(-8).map(m => ({ role: m.role, content: m.content }));
  const telaTexto = () => { const main = document.querySelector("#app main"); return main ? main.innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim().slice(0, 2500) : ""; };
  const iaPossivel = () => iaPref() !== "nao" && !iaIndisponivel;

  async function enviar(texto) {
    texto = String(texto || "").trim(); const img = AL.img;
    if ((!texto && !img) || AL.enviando) return;
    if (!texto) texto = "O que é isto na imagem? Me explique.";
    AL.msgs = AL.msgs.filter(m => !m.erro && !m.perm);
    AL.msgs.push({ role: "user", content: texto, img: img ? img.thumb : null, ts: Date.now() });
    const resp = { role: "assistant", content: "", ts: Date.now(), lendo: true, etapa: img ? "Lendo a imagem…" : "" }; AL.msgs.push(resp);
    AL.img = null; AL.enviando = true; AL.rascunho = ""; { const t = document.getElementById("al-txt"); if (t) t.value = ""; } desenha(true);
    let ocr = "";
    try {
      if (img && typeof lerImagem === "function") { ocr = await lerImagem(img.blob, (p, e) => { resp.etapa = `Lendo a imagem… ${Math.round((p || 0) * 100)}%`; atualizaUltima(); }); resp.etapa = ""; }
    } catch (e) { console.warn("OCR", e); resp.etapa = ""; }
    let local = null;
    try { local = AliciaLocal.responder(texto, { ocr, ultimo: AL.ultimo }); } catch (e) { console.error("Alícia local", e); local = { texto: "", conf: 0 }; }
    if (local.intent && local.intent !== "manual" && local.conf >= 0.6) AL.ultimo = { intent: local.intent, ent: local.ent };
    const precisaIA = local.conf < 0.62 || local.opiniao || (img && local.conf < 0.85);
    const payload = { texto, local, img, ocr };
    if (precisaIA && iaPossivel()) {
      if (iaPref() === "sim") { await perguntaIA(payload, resp); }
      else { mostraLocal(resp, local, true); AL.msgs.push({ role: "assistant", perm: true, content: "", ts: Date.now() }); AL.pend = payload; }
    } else mostraLocal(resp, local, false);
    resp.lendo = false; AL.enviando = false; AL.ctrl = null; guarda(); desenha(true);
  }
  function mostraLocal(resp, local, vaiPedirIA, nota) {
    resp.lendo = false; resp.fonte = "app"; resp.podeIA = !vaiPedirIA && iaPossivel() && local.conf < 0.85;
    if (local.texto && local.conf >= 0.35) resp.content = (local.conf < 0.62 && !vaiPedirIA ? "Não tenho certeza se entendi, mas veja se isto ajuda:\n\n" : "") + local.texto;
    else { resp.content = "Não entendi bem essa pergunta só com os dados do app." + (vaiPedirIA ? "" : " Tente de um destes jeitos:"); resp.sugs = vaiPedirIA ? null : AliciaLocal.sugestoesFalha(); }
    if (nota) resp.content += `\n\n*(${nota})*`;
  }
  async function perguntaIA(p, resp) {
    resp.fonte = "ia"; resp.lendo = true; resp.etapa = "Pensando…"; resp.content = ""; atualizaUltima();
    try {
      const cfg = window.CAIXA_CONFIG || {}, { data } = await SB.auth.getSession(), tok = data && data.session && data.session.access_token;
      if (!tok) throw new Error("Sua sessão expirou. Entre no app de novo.");
      let imagem = null; if (p.img) { const d = await reduz(p.img.blob, 1280, 0.82); imagem = { mime: "image/jpeg", data: d.split(",")[1] }; }
      const trechos = (p.local.trechos || []).slice(0, 5).map(c => `[${c.secao}]\n${c.texto}`).join("\n\n");
      const contexto = [AliciaLocal.resumoBase(), p.local.dados ? "Dados ligados à pergunta: " + p.local.dados : "", p.ocr ? "Texto lido da imagem anexada (pode ter erros de leitura):\n" + p.ocr.slice(0, 3000) : "", "Texto visível na tela aberta:\n" + telaTexto()].filter(Boolean).join("\n\n");
      const msgs = historicoIA(); if (!msgs.length || msgs[msgs.length - 1].role !== "user") msgs.push({ role: "user", content: p.texto });
      AL.ctrl = new AbortController();
      const r = await fetch(cfg.url + "/functions/v1/alicia", { method: "POST", signal: AL.ctrl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok, apikey: cfg.chave }, body: JSON.stringify({ manual: trechos, contexto, mensagens: msgs, imagem }) });
      if (!r.ok) { let j = {}; try { j = await r.json(); } catch (x) {} if (r.status === 503 || r.status === 404) iaIndisponivel = j.erro || "IA não instalada"; throw new Error(j.erro || "A IA gratuita não respondeu (erro " + r.status + ")."); }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "", quando = 0;
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n")) >= 0) {
          const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!ln.startsWith("data:")) continue;
          let ev; try { ev = JSON.parse(ln.slice(5)); } catch (e) { continue; }
          if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") { resp.content += ev.delta.text; resp.lendo = false; resp.etapa = ""; if (Date.now() - quando > 60) { quando = Date.now(); atualizaUltima(); } }
          else if (ev.type === "error") throw new Error("A resposta da IA foi interrompida.");
        }
      }
      if (!resp.content.trim()) throw new Error("A IA gratuita não respondeu.");
    } catch (e) {
      if (e.name === "AbortError") { if (!resp.content) mostraLocal(resp, p.local, false, "resposta da IA interrompida"); }
      else if (resp.content) resp.content += "\n\n*(resposta interrompida)*";
      else mostraLocal(resp, p.local, false, e.message || String(e));
    }
    resp.lendo = false; resp.etapa = "";
  }

  // ---------- tela ----------
  const sugestoes = () => {
    const base = { painel: ["O que falta pagar este mês e quanto vai sobrar?", "Como é calculado o saldo livre?"], lancamentos: ["Quanto gastamos com mercado este mês?", "Como lanço uma compra parcelada?"], cartoes: ["Quanto está a fatura de cada cartão?", "Em qual fatura cai uma compra de hoje?"], contas: ["Quais contas estão vencidas?", "Paguei menos que o previsto, e agora?"], planejamento: ["Vamos fechar algum mês no negativo?", "O que são os gastos variáveis estimados?"], dividas: ["Como estão as dívidas?", "Qual a diferença entre a negociar e em pagamento?"], importar: ["Como importo os prints do app do cartão?", "Tem algum lançamento duplicado?"], investimentos: ["Quanto rendeu nossos investimentos?"], ajustes: ["Para que serve o campo 'Paga com' do cartão?", "Como funcionam as regras de classificação?"] };
    return [...(base[ui.view] || []), "Explique o que estou vendo nesta tela", "Resumo de como estamos"].slice(0, 4);
  };
  const htmlMsg = (m, i) => {
    if (m.role === "user") return `<div class="al-m eu">${m.img ? `<img src="${esc(m.img)}" alt="Imagem anexada">` : ""}${esc(m.content)}</div>`;
    if (m.perm) return `<div class="al-perm"><b>Posso pedir ajuda à IA gratuita?</b><br>Essa pergunta precisa de mais raciocínio do que os cálculos do app. Posso enviar a pergunta${AL.pend && AL.pend.img ? ", a imagem" : ""} e só os números ligados a ela para a IA gratuita do Google (Gemini). No plano gratuito, o Google pode usar esse conteúdo para melhorar os produtos dele. Fica valendo para as próximas vezes; dá para mudar no rodapé.<div class="acoes"><button data-al="iasim">Sim, pode usar</button><button class="nao" data-al="ianao">Não, só o app</button></div></div>`;
    const fim = i === AL.msgs.length - 1;
    const corpo = m.lendo && !m.content ? `<span class="al-dots" aria-label="Alícia está escrevendo"><i></i><i></i><i></i></span>${m.etapa ? ` <span class="al-etapa">${esc(m.etapa)}</span>` : ""}` : md(m.content);
    const sugs = m.sugs ? `<div class="al-sug" style="margin-top:8px">${m.sugs.map(s => `<button data-al="sug">${esc(s)}</button>`).join("")}</div>` : "";
    const fonte = !m.lendo && m.content ? `<div class="al-fonte"><span class="tag ${m.fonte === "ia" ? "ia" : ""}">${m.fonte === "ia" ? "Resposta da IA gratuita" : "Resposta do app"}</span>${m.podeIA && fim && !AL.enviando ? `<button class="al-ir" data-al="iaesta">Não era isso? Perguntar à IA</button>` : ""}</div>` : "";
    return `<div class="al-m ela ${m.erro ? "erro" : ""}" ${fim ? 'id="al-ult"' : ""}>${corpo}${sugs}${fonte}</div>`;
  };
  function desenha(rolar, soGarante) {
    let fab = document.getElementById("al-fab"), pn = document.getElementById("al-painel");
    const visivel = typeof ui !== "undefined" && ui.screen === "app" && typeof ME !== "undefined" && ME;
    if (!visivel) { if (fab) fab.remove(); if (pn) pn.remove(); return; }
    if (AL._k !== chave()) { carrega(); AL.ultimo = null; AL.pend = null; }
    if (!fab) { fab = document.createElement("button"); fab.id = "al-fab"; fab.className = "al-fab"; fab.setAttribute("aria-label", "Falar com a Alícia, assistente do app"); fab.dataset.al = "abrir"; fab.innerHTML = ICONE + '<span class="al-dica">Dúvidas? Fale com a Alícia</span>'; document.body.appendChild(fab); }
    fab.style.display = AL.aberta && matchMedia("(max-width:760px)").matches ? "none" : "";
    fab.setAttribute("aria-expanded", AL.aberta);
    if (!AL.aberta) { if (pn) pn.remove(); return; }
    if (soGarante && pn) return; // o app redesenhou (sincronização etc.): não mexe na conversa nem no que está sendo digitado
    const ta = document.getElementById("al-txt"); if (ta) AL.rascunho = ta.value;
    if (!pn) { pn = document.createElement("section"); pn.id = "al-painel"; pn.className = "al-painel"; pn.setAttribute("role", "dialog"); pn.setAttribute("aria-label", "Conversa com a Alícia"); document.body.appendChild(pn); }
    const pref = iaPref();
    pn.innerHTML = `<div class="al-top"><div class="al-av">A</div><div class="t"><b>Alícia</b><span>Assistente do Caixa da Família</span></div>${AL.msgs.length ? `<button data-al="nova" title="Começar uma conversa nova">Nova</button>` : ""}<button data-al="fechar" aria-label="Fechar">✕</button></div>
      <div class="al-log" id="al-log" aria-live="polite">${AL.msgs.length ? AL.msgs.map(htmlMsg).join("") : `<div class="al-oi"><div class="al-m ela"><p>Oi, ${esc((ME.nome || "").split(" ")[0])}! Eu sou a <b>Alícia</b>. Respondo com os números de vocês (faturas, contas a pagar, gastos, dívidas, previsões) e explico qualquer tela, campo ou regra do Caixa.</p><p>Pode perguntar do seu jeito, e anexar um print com o clipe se ajudar.</p></div><div class="al-sug">${sugestoes().map(s => `<button data-al="sug">${esc(s)}</button>`).join("")}</div></div>`}</div>
      ${AL.img ? `<div class="al-anexo"><img src="${esc(AL.img.thumb)}" alt=""><span>${esc(AL.img.nome)} · será lida junto com a pergunta</span><button data-al="tiraimg" aria-label="Remover imagem">✕</button></div>` : ""}
      <form class="al-form" id="al-form"><button type="button" class="al-clip" data-al="clipe" aria-label="Anexar imagem" title="Anexar imagem (ou Ctrl+V)">${CLIPE}</button><input type="file" id="al-arq" accept="image/*" class="sr" hidden><textarea id="al-txt" rows="1" placeholder="Pergunte para a Alícia…" aria-label="Sua pergunta">${esc(AL.rascunho)}</textarea>${AL.enviando ? `<button type="button" data-al="parar" aria-label="Parar resposta" title="Parar">■</button>` : `<button aria-label="Enviar">${ENVIAR}</button>`}</form>
      <div class="al-rodape">Respostas do app usam só os dados deste aparelho. IA gratuita para perguntas difíceis: <b>${iaIndisponivel ? "não instalada" : pref === "sim" ? "ligada" : pref === "nao" ? "desligada" : "pergunta antes"}</b>${iaIndisponivel ? "" : ` · <button data-al="iatroca">${pref === "sim" ? "desligar" : "ligar"}</button>`}</div>`;
    const log = document.getElementById("al-log"); if (rolar && log) log.scrollTop = log.scrollHeight;
    const t = document.getElementById("al-txt"); if (t) { ajusta(t); if (!AL.enviando && !matchMedia("(max-width:760px)").matches) t.focus(); }
  }
  function atualizaUltima() { const el = document.getElementById("al-ult"), log = document.getElementById("al-log"); const i = AL.msgs.length - 1, m = AL.msgs[i]; if (!el || !m || m.perm) return desenha(true); const perto = log.scrollHeight - log.scrollTop - log.clientHeight < 80; el.outerHTML = htmlMsg(m, i); if (perto) log.scrollTop = log.scrollHeight; }
  const ajusta = t => { t.style.height = "auto"; t.style.height = Math.min(130, t.scrollHeight) + "px"; };

  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-al],[data-al-ir]"); if (!b) return;
    if (b.dataset.alIr) { e.preventDefault(); e.stopPropagation(); if (b.dataset.alAj) ui.aj = b.dataset.alAj; if (matchMedia("(max-width:760px)").matches) AL.aberta = false; go(b.dataset.alIr); desenha(); return; }
    const a = b.dataset.al; e.preventDefault();
    if (a === "abrir") { AL.aberta = !AL.aberta; desenha(true); }
    else if (a === "fechar") { AL.aberta = false; desenha(); }
    else if (a === "nova") { if (AL.ctrl) AL.ctrl.abort(); AL.msgs = []; AL.ultimo = null; AL.pend = null; guarda(); desenha(true); }
    else if (a === "sug") enviar(b.textContent);
    else if (a === "parar") { if (AL.ctrl) AL.ctrl.abort(); }
    else if (a === "clipe") document.getElementById("al-arq")?.click();
    else if (a === "tiraimg") { AL.img = null; desenha(); }
    else if (a === "iatroca") { setIaPref(iaPref() === "sim" ? "nao" : "sim"); desenha(); }
    else if (a === "iasim" || a === "ianao") {
      setIaPref(a === "iasim" ? "sim" : "nao"); const p = AL.pend; AL.pend = null;
      AL.msgs = AL.msgs.filter(m => !m.perm);
      if (a === "iasim" && p && !AL.enviando) { const resp = { role: "assistant", content: "", ts: Date.now(), lendo: true }; AL.msgs.push(resp); AL.enviando = true; desenha(true); await perguntaIA(p, resp); AL.enviando = false; AL.ctrl = null; guarda(); }
      desenha(true);
    }
    else if (a === "iaesta" && !AL.enviando) {
      // a última pergunta, de novo, agora para a IA
      const iu = AL.msgs.map(m => m.role).lastIndexOf("user"); if (iu < 0) return;
      const texto = AL.msgs[iu].content, local = AliciaLocal.responder(texto, { ultimo: AL.ultimo });
      if (iaPref() !== "sim") { AL.pend = { texto, local, img: null, ocr: "" }; AL.msgs.push({ role: "assistant", perm: true, content: "", ts: Date.now() }); desenha(true); return; }
      const resp = { role: "assistant", content: "", ts: Date.now(), lendo: true }; AL.msgs.push(resp); AL.enviando = true; desenha(true);
      await perguntaIA({ texto, local, img: null, ocr: "" }, resp); AL.enviando = false; AL.ctrl = null; guarda(); desenha(true);
    }
  });
  document.addEventListener("change", e => { if (e.target.id === "al-arq" && e.target.files[0]) { anexa(e.target.files[0]); e.target.value = ""; } });
  document.addEventListener("paste", e => {
    if (!AL.aberta || !e.target.closest || !e.target.closest("#al-painel")) return;
    const f = [...(e.clipboardData ? e.clipboardData.files : [])].find(x => /^image\//.test(x.type));
    if (f) { e.preventDefault(); e.stopPropagation(); anexa(f); }
  }, true);
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
  window.alicia = { abrir: () => { AL.aberta = true; desenha(true); }, perguntar: t => { AL.aberta = true; enviar(t); } };
  try { desenha(); } catch (e) {}
})();
