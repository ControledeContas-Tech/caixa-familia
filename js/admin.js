// ================= ADMINISTRAÇÃO GERAL (João Lucas e Emanoella) =================
// Controle de todas as contas do sistema: liberar, renovar com prazo, bloquear, ver qualquer família (só leitura).
// Tudo passa por funções do banco que conferem se quem pede é administrador geral (usuário + CPF).
(function () {
  const ADM = { tab: "usuarios", filtro: null, q: "", users: null, fams: null, log: null, carregando: false, erro: "" };
  const ehSuper = () => !!(ui.acesso && ui.acesso.super);

  IC.admin = '<path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>';
  Object.assign(PILL, { "u-pendente": ["p-warn", "Aguardando"], "u-ativo": ["p-good", "Ativo"], "u-vencido": ["p-crit", "Vencido"], "u-bloqueado": ["p-mute", "Bloqueado"] });
  const pillU = st => pill("u-" + st);

  const css = document.createElement("style");
  css.textContent = `
  .aviso{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:13.5px}
  .aviso.info{background:var(--info-soft);color:var(--info)} .aviso.warn{background:var(--warn-soft);color:var(--warn)} .aviso.crit{background:var(--crit-soft);color:var(--crit)}
  .aviso b{color:inherit}
  .adm-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 14px}
  .adm-bar input[type=search]{flex:1 1 220px;min-width:0;max-width:360px}
  .adm-user b{display:block} .adm-user .sub{word-break:break-all}
  .tag-adm{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--accent);border:1px solid currentColor;border-radius:4px;padding:0 4px;margin-left:6px;vertical-align:1px}
  .adm-acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
  .adm-membros{font-size:12.5px;color:var(--muted)}
  .adm-log td{font-size:13px;vertical-align:top}
  .totals.adm{grid-template-columns:repeat(6,minmax(0,1fr));margin:0 0 14px} @media (max-width:760px){.totals.adm{grid-template-columns:repeat(3,minmax(0,1fr))}}
  `;
  document.head.appendChild(css);

  // ---------- dados ----------
  async function carregar() {
    if (ADM.carregando) return; ADM.carregando = true; ADM.erro = "";
    try {
      const [u, f, l] = await Promise.all([SB.rpc("admin_usuarios"), SB.rpc("admin_familias"), SB.from("admin_log").select("*").order("id", { ascending: false }).limit(300)]);
      if (u.error || f.error || l.error) throw (u.error || f.error || l.error);
      ADM.users = u.data || []; ADM.fams = f.data || []; ADM.log = l.data || [];
      if (ADM.filtro === null) ADM.filtro = ADM.users.some(x => x.efetivo === "pendente") ? "pendente" : "todos";
    } catch (e) { console.error(e); ADM.erro = e.message || String(e); }
    ADM.carregando = false; if (ui.view === "admin") render();
  }
  const diasPara = d => d ? diasAte(TODAY, d) : null;
  const vencendo = u => u.efetivo === "ativo" && u.valido_ate && diasPara(u.valido_ate) <= 7;
  const FILTROS = [["pendente", "Aguardando liberação", u => u.efetivo === "pendente"], ["ativo", "Ativos", u => u.efetivo === "ativo"], ["vencendo", "Vencem em 7 dias", vencendo], ["vencido", "Vencidos", u => u.efetivo === "vencido"], ["bloqueado", "Bloqueados", u => u.efetivo === "bloqueado"], ["todos", "Todos", () => true]];
  const quando = ts => ts ? br(String(ts).slice(0, 10)) + " " + String(new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })) : "—";
  const validade = u => {
    if (u.superadmin) return `<span class="sub">sem prazo</span>`;
    if (!u.valido_ate) return u.efetivo === "pendente" ? "—" : `<span class="sub">sem prazo</span>`;
    const d = diasPara(u.valido_ate);
    return `${br(u.valido_ate)}<div class="sub ${d < 0 ? "neg" : d <= 7 ? "low" : ""}">${d < 0 ? "venceu há " + -d + (d === -1 ? " dia" : " dias") : d === 0 ? "vence hoje" : "faltam " + d + (d === 1 ? " dia" : " dias")}</div>`;
  };

  // ---------- telas ----------
  function vAdmin() {
    if (!ehSuper()) return `${topbar("Administração")}<section class="panel empty"><b>Acesso restrito</b><span>Esta área é só dos administradores gerais do sistema.</span></section>`;
    if (!ADM.users && !ADM.carregando && !ADM.erro) setTimeout(carregar, 0);
    const top = `${topbar("Administração geral", "Controle interno de todas as contas · visível só para João Lucas e Emanoella")}
    <div class="bar-row"><div class="seg" role="tablist">${[["usuarios", "Usuários"], ["familias", "Famílias"], ["historico", "Histórico"]].map(([k, l]) => `<button role="tab" aria-pressed="${ADM.tab === k}" data-act="admtab" data-arg="${k}">${l}</button>`).join("")}</div>
    <button class="btn" data-act="admrecarregar">${ADM.carregando ? "Atualizando…" : "Atualizar"}</button></div>`;
    if (ADM.erro) return top + `<section class="panel"><div class="hint-box erro">Não foi possível carregar: ${esc(ADM.erro)}</div></section>`;
    if (!ADM.users) return top + `<section class="panel"><p class="sub">Carregando…</p></section>`;
    if (ADM.tab === "familias") return top + vFamilias();
    if (ADM.tab === "historico") return top + vHistorico();
    return top + vUsuarios();
  }

  function vUsuarios() {
    const U = ADM.users, cont = k => U.filter(FILTROS.find(f => f[0] === k)[2]).length;
    const [, , fn] = FILTROS.find(f => f[0] === ADM.filtro) || FILTROS[5];
    const q = norm(ADM.q), qd = soDigitos(ADM.q);
    const lista = U.filter(fn).filter(u => !q || norm(u.nome + " " + u.email + " " + (u.familia || "")).includes(q) || (qd.length >= 3 && (u.cpf || "").includes(qd)));
    return `<section class="totals adm">${FILTROS.map(([k, l]) => `<div><span>${l}</span><b class="num ${k === "pendente" && cont(k) ? "neg" : ""}">${cont(k)}</b></div>`).join("")}</section>
    <div class="adm-bar"><div class="seg" role="tablist">${FILTROS.map(([k, l]) => `<button role="tab" aria-pressed="${ADM.filtro === k}" data-act="admfiltro" data-arg="${k}">${l.replace("Aguardando liberação", "Aguardando")}</button>`).join("")}</div>
    <input type="search" id="adm-q" placeholder="Buscar nome, e-mail, CPF ou família" value="${esc(ADM.q)}" aria-label="Buscar usuário"></div>
    <section class="panel flush">${lista.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Pessoa</th><th>CPF</th><th>Família</th><th>Status</th><th>Validade</th><th>Último acesso</th><th>Criada em</th><th></th></tr></thead><tbody>
    ${lista.map(u => `<tr><td class="adm-user"><b>${esc(u.nome || u.nome_na_familia || "—")}${u.superadmin ? '<span class="tag-adm">admin geral</span>' : ""}</b><div class="sub">${esc(u.email)}${u.email_confirmado ? "" : " · e-mail não confirmado"}</div></td>
      <td class="num">${u.cpf ? cpfFmt(u.cpf) : '<span class="sub">não informado</span>'}</td>
      <td>${u.familia ? `${esc(u.familia)}<div class="sub">${u.papel === "admin" ? "administrador" : "membro"}</div>` : '<span class="sub">sem família</span>'}</td>
      <td>${pillU(u.efetivo)}</td><td class="num">${validade(u)}</td><td class="num sub">${quando(u.ultimo_acesso)}</td><td class="num sub">${br(String(u.criado_em).slice(0, 10))}</td>
      <td><div class="adm-acts">${acoes(u)}</div></td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty"><b>Ninguém aqui</b><span>${ADM.q ? "Nenhum usuário encontrado para essa busca." : "Nenhum usuário neste filtro."}</span></div>`}</section>
    <p class="note">Conta nova fica aguardando até vocês liberarem. Acesso vencido só consulta e exporta. Bloqueado não vê nada. Administradores gerais não podem ser bloqueados nem ter prazo.</p>`;
  }
  function acoes(u) {
    const b = (act, l, cls = "") => `<button class="mini ${cls}" data-act="${act}" data-arg="${u.user_id}">${l}</button>`;
    const out = [];
    if (!u.superadmin) {
      if (u.efetivo === "pendente") out.push(b("admprazo", "Liberar", "primary"));
      if (u.efetivo === "ativo" || u.efetivo === "vencido") out.push(b("admprazo", "Renovar", u.efetivo === "vencido" || vencendo(u) ? "primary" : ""));
      if (u.efetivo === "bloqueado") out.push(b("admdesbloquear", "Desbloquear"));
      else out.push(b("admbloquear", "Bloquear"));
    }
    if (u.familia_id) out.push(`<button class="mini" data-act="admver" data-arg="${u.familia_id}">Ver família</button>`);
    out.push(b("admdetalhe", "Detalhes"));
    return out.join("");
  }

  function vFamilias() {
    const F = ADM.fams;
    return `<section class="panel flush">${F.length ? `<div class="tbl-wrap"><table class="rows"><thead><tr><th>Família</th><th>Membros</th><th class="r">Lançamentos</th><th class="r">Contas</th><th class="r">Cartões</th><th class="r">Recorrências</th><th>Criada em</th><th>Última atividade</th><th></th></tr></thead><tbody>
    ${F.map(f => `<tr><td><b>${esc(f.nome)}</b><div class="sub">controle desde ${br(f.inicio)}</div></td>
      <td class="adm-membros">${(f.membros || []).map(m => `${esc(m.nome)} <span class="sub">(${m.papel === "admin" ? "admin" : "membro"})</span>`).join("<br>") || "—"}${f.convites ? `<div class="sub">${f.convites} convite(s) pendente(s)</div>` : ""}</td>
      <td class="r num">${f.lancamentos}</td><td class="r num">${f.contas}</td><td class="r num">${f.cartoes}</td><td class="r num">${f.recorrencias}</td>
      <td class="num sub">${br(String(f.criado_em).slice(0, 10))}</td><td class="num sub">${quando(f.ultima_atividade)}</td>
      <td class="r"><button class="mini primary" data-act="admver" data-arg="${f.id}">Ver finanças</button></td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty"><b>Nenhuma família criada</b></div>`}</section>
    <p class="note">"Ver finanças" abre a família inteira (painel, lançamentos, cartões, contas, conversa) em modo somente leitura. Cada abertura fica registrada no histórico.</p>`;
  }

  function vHistorico() {
    const L = ADM.log;
    return `<section class="panel flush">${L.length ? `<div class="tbl-wrap"><table class="rows adm-log"><thead><tr><th>Quando</th><th>Administrador</th><th>Ação</th><th>Usuário ou família</th><th>Detalhe</th></tr></thead><tbody>
    ${L.map(l => `<tr><td class="num">${quando(l.ts)}</td><td>${esc(l.admin)}</td><td><b>${esc(l.acao)}</b></td><td>${esc(l.alvo)}</td><td class="sub">${esc(l.det)}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty"><b>Nada registrado ainda</b><span>Liberações, renovações, bloqueios e aberturas de famílias aparecem aqui.</span></div>`}</section>`;
  }

  // ---------- integração com o app ----------
  VIEWFN.admin = vAdmin;
  const renderOriginal = render;
  render = function () {
    const i = VIEWS.findIndex(v => v[0] === "admin");
    if (ehSuper() && i < 0) VIEWS.push(["admin", "Administração"]);
    if (!ehSuper() && i >= 0) VIEWS.splice(i, 1);
    if (!ehSuper() && ui.view === "admin") ui.view = "painel";
    if (ui.screen !== "app") { ADM.users = ADM.fams = ADM.log = null; ADM.filtro = null; }
    renderOriginal();
  };
  ["admacesso", "admcpf"].forEach(n => FORMS_LEITURA.add(n));

  const user = id => ADM.users.find(u => u.user_id === id);
  const definir = async (u, status, valido, obs) => { const { error } = await SB.rpc("admin_definir_acesso", { p_user: u.user_id, p_status: status, p_valido_ate: valido, p_obs: obs ?? null }); if (error) throw error; await carregar(); };
  const addDias = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const addMeses = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); const ult = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, ult)); return t.toISOString().slice(0, 10); };
  const PRAZOS = [["30d", "30 dias"], ["3m", "3 meses"], ["6m", "6 meses"], ["12m", "1 ano"], ["data", "Até uma data específica"], ["sem", "Sem prazo"]];
  function calcPrazo(base, p, data) { if (p === "sem") return null; if (p === "data") return data || ""; if (p === "30d") return addDias(base, 30); return addMeses(base, parseInt(p)); }
  function prazoPreview() {
    const f = document.getElementById("fadm"); if (!f) return;
    const E = f.elements, ate = calcPrazo(f.dataset.base, E.prazo.value, E.data.value);
    document.getElementById("adm-data-wrap").hidden = E.prazo.value !== "data";
    document.getElementById("adm-prev").innerHTML = ate === null ? "Acesso <b>sem data de vencimento</b>. Vocês podem bloquear a qualquer momento." : ate ? `Acesso liberado até <b>${br(ate)}</b> (${diasAte(TODAY, ate)} dias a partir de hoje). Depois disso a conta fica só consultando até vocês renovarem.` : "Escolha a data.";
  }
  document.addEventListener("change", e => { if (e.target.form && e.target.form.id === "fadm") prazoPreview(); });
  document.addEventListener("input", e => {
    if (e.target.form && e.target.form.id === "fadm") prazoPreview();
    if (e.target.id === "adm-q") { ADM.q = e.target.value; const pos = e.target.selectionStart; render(); const b = document.getElementById("adm-q"); if (b) { b.focus(); b.setSelectionRange(pos, pos); } }
  });

  Object.assign(acts, {
    admtab: t => { ADM.tab = t; render(); },
    admfiltro: f => { ADM.filtro = f; render(); },
    admrecarregar: () => { carregar(); render(); },
    admprazo: id => {
      const u = user(id), renovar = u.efetivo !== "pendente";
      const base = renovar && u.valido_ate && u.valido_ate > TODAY ? u.valido_ate : TODAY;
      modal((renovar ? "Renovar acesso de " : "Liberar acesso de ") + esc(u.nome || u.email), `<form class="form" data-form="admacesso" id="fadm" data-uid="${u.user_id}" data-base="${base}">
        <div class="field full"><div class="hint-box"><b>${esc(u.nome || "—")}</b> · ${esc(u.email)} · CPF ${u.cpf ? cpfFmt(u.cpf) : "não informado"}${renovar && u.valido_ate ? `<br>Validade atual: ${br(u.valido_ate)}. ${u.valido_ate > TODAY ? "A renovação conta a partir dessa data." : "A renovação conta a partir de hoje."}` : ""}</div></div>
        ${field("Prazo", `<select id="adm-p" name="prazo">${opts(PRAZOS, "30d")}</select>`, false, "adm-p")}
        <div class="field" id="adm-data-wrap" hidden><label for="adm-d">Data</label><input id="adm-d" name="data" type="date" min="${TODAY}"></div>
        ${field("Observação (opcional)", `<input id="adm-o" name="obs" value="${esc(u.obs || "")}" placeholder="Ex.: pagou o plano anual">`, true, "adm-o")}
        <div class="field full"><div class="hint-box" id="adm-prev"></div></div>
        <div class="field full row-actions"><button class="btn primary">${renovar ? "Renovar" : "Liberar acesso"}</button><button type="button" class="btn" data-close>Cancelar</button></div></form>`);
      prazoPreview();
    },
    admbloquear: id => { const u = user(id); modal("Bloquear " + esc(u.nome || u.email) + "?", `<p>A pessoa deixa de ver qualquer dado assim que abrir o app de novo. A família e os lançamentos dela continuam guardados, e vocês podem desbloquear depois.</p><div class="row-actions"><button class="btn danger" data-act="admbloquearok" data-arg="${id}">Bloquear</button><button class="btn" data-close>Cancelar</button></div>`); },
    admbloquearok: acao(async id => { const u = user(id); await definir(u, "bloqueado", u.valido_ate, null); closeLayer(); toast((u.nome || u.email) + " foi bloqueado."); }),
    admdesbloquear: acao(async id => { const u = user(id); await definir(u, "ativo", u.valido_ate, null); toast((u.nome || u.email) + " foi desbloqueado" + (u.valido_ate && u.valido_ate < TODAY ? ", mas o prazo já venceu: use Renovar." : ".")); }),
    admdetalhe: id => {
      const u = user(id), hist = ADM.log.filter(l => l.alvo === u.email);
      modal(esc(u.nome || u.email), `<div class="hint-box">${[["E-mail", esc(u.email) + (u.email_confirmado ? "" : " (não confirmado)")], ["Família", u.familia ? esc(u.familia) + " · " + (u.papel === "admin" ? "administrador" : "membro") : "sem família"], ["Status", pillU(u.efetivo) + (u.superadmin ? ' <span class="tag-adm">admin geral</span>' : "")], ["Validade", u.superadmin || !u.valido_ate ? "sem prazo" : br(u.valido_ate)], ["Liberado em", u.aprovado_em ? quando(u.aprovado_em) + " por " + esc(u.aprovado_por || "") : "—"], ["Conta criada", quando(u.criado_em)], ["Último acesso", quando(u.ultimo_acesso)], ["Observação", esc(u.obs || "—")]].map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join("")}</div>
        ${u.superadmin ? "" : `<form class="form" data-form="admcpf" data-uid="${u.user_id}" style="margin-top:12px">${field("CPF", `<input id="adm-c" name="cpf" inputmode="numeric" maxlength="14" data-cpf value="${u.cpf ? cpfFmt(u.cpf) : ""}" placeholder="000.000.000-00">`, false, "adm-c")}<div class="field" style="align-self:end"><button class="btn">Corrigir CPF</button></div></form>`}
        <h4 style="margin:16px 0 6px">Histórico desta pessoa</h4>${hist.length ? `<ul class="sub" style="margin:0;padding-left:18px">${hist.map(l => `<li>${quando(l.ts)} · <b>${esc(l.acao)}</b> por ${esc(l.admin)}${l.det ? " · " + esc(l.det) : ""}</li>`).join("")}</ul>` : `<p class="sub">Nenhuma ação registrada.</p>`}
        <div class="row-actions" style="margin-top:14px"><button class="btn" data-close>Fechar</button></div>`, true);
    },
    admver: acao(async fid => {
      if (!ui.adminVendo) ui.adminMinhaFam = FAM ? FAM.id : null;
      if (fid === ui.adminMinhaFam) return acts.adminvoltar();
      const [{ data: fam, error: e1 }, { data: mem, error: e2 }] = await Promise.all([SB.from("familias").select("*").eq("id", fid).single(), SB.from("membros").select("*").eq("familia_id", fid)]);
      if (e1 || e2) throw (e1 || e2);
      const novo = await DB.carregar(fam, ME.nome);
      S = novo; FAM = fam; ui.membros = mem || []; ui.convites = []; ui.adminVendo = fam.nome;
      ui.varMes = null; ui.simOrc = null; ui.card = null; ui.cardKey = null; ui.compMes = CUR; ui.lf.conta = "";
      SB.rpc("admin_registrar", { p_acao: "Abriu os dados da família", p_alvo: fam.nome }).then(() => { ADM.log = null; ADM.users = null; });
      go("painel"); toast("Abrindo " + fam.nome + " em modo somente leitura.");
    }),
    adminvoltar: acao(async () => {
      const fid = ui.adminMinhaFam; ui.adminVendo = null; ui.adminMinhaFam = null;
      if (fid) { await carregarFamilia(fid); go("admin"); } else entrar();
    }),
  });

  Object.assign(forms, {
    admacesso: async f => {
      const u = user(f.dataset.uid), E = f.elements, ate = calcPrazo(f.dataset.base, E.prazo.value, E.data.value);
      if (ate === "") { toast("Escolha a data."); return false; }
      if (ate && ate < TODAY) { toast("A data precisa ser hoje ou depois."); return false; }
      await definir(u, "ativo", ate, E.obs.value.trim());
      return `${u.nome || u.email}: acesso ${ate ? "até " + br(ate) : "sem prazo"}.`;
    },
    admcpf: async f => {
      const u = user(f.dataset.uid), c = soDigitos(f.elements.cpf.value);
      if (c && !cpfValido(c)) { toast("CPF inválido."); return false; }
      const { error } = await SB.rpc("admin_corrigir_cpf", { p_user: u.user_id, p_cpf: c || null }); if (error) { toast("Erro: " + error.message); return false; }
      await carregar(); return "CPF atualizado.";
    },
  });
})();
