// ================= SINCRONIA ENTRE OS MEMBROS DA FAMÍLIA =================
// Toda alteração nos dados da família sobe a "versão" (tabela familia_versao, por gatilho no banco).
// Este módulo escuta essa versão em tempo real e, quando outra pessoa altera algo,
// recarrega os dados — assim João e Manu sempre veem os mesmos números.
// Reserva: confere a versão a cada 45 s e sempre que a tela volta a ficar visível.
// Também guarda na família os ajustes que mudam números (gastos variáveis estimados,
// valor mensal do planejador de quitação), para os dois verem igual.

(function () {
  const SY = { canal: null, fam: null, versao: null, timer: null, poll: null, espera: null, quem: null, ultimaCarga: 0 };
  window.SINCRONIA = SY;

  const nomeDoMembro = uid => { const m = (ui.membros || []).find(x => x.user_id === uid); return m ? m.nome : "outra pessoa da família"; };
  async function lerVersao() {
    if (!FAM) return null;
    const { data, error } = await SB.from("familia_versao").select("versao,por,em").eq("familia_id", FAM.id).maybeSingle();
    return error ? null : data;
  }

  // ocupado = a pessoa está no meio de algo que uma recarga atrapalharia
  function ocupado() {
    if (ui.screen !== "app" || !S) return true;
    if (S.pend) return true; // importação em revisão
    const l = document.getElementById("layer"); if (l && l.children.length) return true; // janela aberta
    const a = document.activeElement; if (a && a.closest && a.closest("#app") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== "busca") return true;
    if (ui.salvando === "salvando") return true;
    return false;
  }

  function agendar(quem) {
    SY.quem = quem || SY.quem;
    clearTimeout(SY.timer);
    SY.timer = setTimeout(tentar, 1200);
  }
  async function tentar() {
    if (ocupado()) { clearTimeout(SY.espera); SY.espera = setTimeout(tentar, 3000); return; }
    await recarregar();
  }
  async function recarregar() {
    if (!FAM || !S) return;
    try {
      if (DB.temMudanca(S)) await DB.sync(S); // primeiro grava o que é seu, para não perder nada
      const pend = S.pend, user = S.user;
      const [{ data: fam }, novo] = await Promise.all([SB.from("familias").select("*").eq("id", FAM.id).single(), DB.carregar(FAM, user)]);
      if (fam) FAM = fam;
      novo.pend = pend; S = novo;
      aplicarConfig(); if (window.ANALISES) ANALISES.recarregar();
      SY.ultimaCarga = Date.now();
      const v = await lerVersao(); if (v) SY.versao = v.versao;
      render();
      if (SY.quem) toast(`Atualizado com as alterações de ${nomeDoMembro(SY.quem)}.`, "ok");
      SY.quem = null;
    } catch (e) { console.error("sincronia", e); }
  }

  function parar() {
    if (SY.canal) { try { SB.removeChannel(SY.canal); } catch (e) {} }
    SY.canal = null; clearInterval(SY.poll); SY.poll = null; SY.fam = null;
  }
  async function iniciar() {
    if (!FAM || !SB) return;
    if (SY.fam === FAM.id && SY.canal) return;
    parar(); SY.fam = FAM.id;
    const v = await lerVersao(); SY.versao = v ? v.versao : null;
    SY.canal = SB.channel("versao-" + FAM.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "familia_versao", filter: "familia_id=eq." + FAM.id }, p => {
        const n = p.new || {}; if (n.versao !== undefined && n.versao === SY.versao) return;
        if (n.por && ME && n.por === ME.id) { SY.versao = n.versao; return; } // alteração minha
        SY.versao = n.versao; agendar(n.por);
      })
      .subscribe();
    SY.poll = setInterval(conferir, 45000);
  }
  async function conferir() {
    if (!FAM || ui.screen !== "app") return;
    const v = await lerVersao(); if (!v || SY.versao === null) { if (v) SY.versao = v.versao; return; }
    if (v.versao !== SY.versao) { const deOutro = !ME || v.por !== ME.id; SY.versao = v.versao; if (deOutro) agendar(v.por); }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") conferir(); });

  // depois de cada gravação minha, a versão nova é minha: não recarrega à toa
  const syncOriginal = DB.sync.bind(DB);
  DB.sync = function (S0) {
    const r = syncOriginal(S0);
    r.then(async () => { const v = await lerVersao(); if (v && ME && v.por === ME.id) SY.versao = v.versao; }).catch(() => {});
    return r;
  };

  // começa quando a família é carregada (inclusive quando o administrador abre outra família)
  const carregarOriginal = carregarFamilia;
  carregarFamilia = async function (fid) { await carregarOriginal(fid); aplicarConfig(); render(); iniciar(); };

  // ---------- ajustes compartilhados pela família ----------
  function aplicarConfig() {
    const c = (FAM && FAM.config) || {};
    if (typeof c.varMes === "number") ui.varMes = c.varMes;
    if (typeof c.simOrc === "number") ui.simOrc = c.simOrc;
  }
  async function salvarConfig(chave, valor) {
    if (!FAM || ui.adminVendo || somenteLeitura()) return;
    FAM.config = Object.assign({}, FAM.config, { [chave]: valor });
    const { error } = await SB.rpc("salvar_config", { p_familia: FAM.id, p_chave: chave, p_valor: valor });
    if (error) toast("Esse ajuste ficou só neste aparelho.", "erro", explicaErro("config: " + error.message));
  }
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "varmes" && ui.varMes !== null) salvarConfig("varMes", ui.varMes);
    if (t.id === "simorc" && ui.simOrc !== null) salvarConfig("simOrc", ui.simOrc);
  });
})();
