// ================= PERSISTÊNCIA: Supabase (Postgres + login) =================
// O estado em memória (S) é o mesmo usado pelas regras. Cada alteração é sincronizada
// comparando as linhas atuais com as últimas gravadas: grava só o que mudou.

const slug = s => norm(s).replace(/[^A-Z0-9]+/g, "-").toLowerCase();
const nn = v => v === undefined || v === "" ? null : v;
function garanteIds(S) {
  for (const r of S.regras) if (!r.id) r.id = rid("rg");
  for (const k in S.inst) for (const p of S.inst[k].pag || []) if (!p.id) p.id = rid("pg");
  for (const m of S.manuais) for (const p of m.pag || []) if (!p.id) p.id = rid("pg");
  for (const p of S.provisoes) for (const m of p.mov || []) if (!m.id) m.id = rid("pm");
  for (const i of S.invest) for (const m of i.mov || []) if (!m.id) m.id = rid("im");
}
const TABELAS = {
  pessoas: { rows: S => S.pessoas.map(p => ({ id: p.id, nome: p.nome, acesso: p.acesso || "Sem login", login: p.login || "" })) },
  contas: { rows: S => S.contas.map(c => ({ id: c.id, nome: c.nome, tipo: c.tipo, inst: c.inst || "", resp: c.resp || "", caixa: !!c.caixa, saldo_ini: c.saldoIni || 0, data_ini: c.dataIni || S.inicio })) },
  cartoes: { rows: S => S.cartoes.map(c => ({ id: c.id, nome: c.nome, inst: c.inst || "", resp: c.resp || "", limite: c.limite, fecha: c.fecha, vence: c.vence, paga_com: nn(c.pagaCom), final: c.final || "", status: c.status || "Ativo" })) },
  categorias: { rows: S => S.categorias.map(c => ({ id: "cat-" + slug(c[0]), nome: c[0], subs: c[1] === "receita" ? "" : c[1] || "", receita: c[1] === "receita" })) },
  regras: { rows: S => S.regras.map(r => ({ id: r.id, trecho: r.trecho, cat: r.cat, sub: r.sub || "", prio: r.prio })) },
  lancamentos: { rows: S => S.lanc.map(l => ({ id: l.id, data: l.data, descricao: l.desc, tipo: l.tipo, valor: l.valor, conta: nn(l.conta), cartao: nn(l.cartao), destino: nn(l.destino), cat: nn(l.cat), sub: nn(l.sub), resp: nn(l.resp), origem: l.origem || "manual", fatura: nn(l.fatura), comp: nn(l.comp), estorno_de: nn(l.estornoDe), obs: nn(l.obs), importacao: nn(l.imp), fitid: nn(l.fitid), excluido: !!l.excluido })) },
  parcelamentos: { rows: S => S.parc.map(p => ({ id: p.id, cartao: p.cartao, descricao: p.desc, cat: nn(p.cat), sub: nn(p.sub), data: p.data, total: p.total, n: p.n, resp: nn(p.resp), origem: p.origem || "manual", cancel_de: p.cancelDe || null, k0: nn(p.k0) })) },
  recorrencias: { rows: S => S.rec.map(r => ({ id: r.id, descricao: r.desc, tipo: r.tipo, cat: nn(r.cat), sub: nn(r.sub), valor: r.valor, dia: r.dia, conta: nn(r.conta), inicio: r.inicio, fim: nn(r.fim), resp: nn(r.resp), natureza: r.natureza || "Fixa", parc_total: r.parcTotal || null, parc_ini: r.parcTotal ? (r.parcIni ?? 1) : null })) },
  ajustes: { rows: S => Object.entries(S.inst).map(([k, i]) => ({ id: k, valor: i.valor ?? null, venc: nn(i.venc), desconto: i.desconto || 0, cancel: !!i.cancel, reag: nn(i.reag), motivo: nn(i.motivo) })) },
  pagamentos: { rows: S => [...Object.entries(S.inst).flatMap(([k, i]) => (i.pag || []).map(p => ({ id: p.id, chave: k, lanc: p.lanc, valor: p.valor, data: p.data }))), ...S.manuais.flatMap(m => (m.pag || []).map(p => ({ id: p.id, chave: m.id, lanc: p.lanc, valor: p.valor, data: p.data })))] },
  manuais: { rows: S => S.manuais.map(m => ({ id: m.id, descricao: m.desc, cat: nn(m.cat), valor: m.valor, venc: m.venc, origem: nn(m.origem), conta: nn(m.conta), de: nn(m.de), desconto: m.desconto || 0, cancel: !!m.cancel, reag: nn(m.reag), motivo: nn(m.motivo) })) },
  dividas: { rows: S => S.dividas.map(d => ({ id: d.id, nome: d.nome, credor: d.credor || "", saldo: d.saldo, parcela: d.parcela, taxa: d.taxa ?? null, dia: d.dia, primeiro: d.primeiro, total: d.total, prioridade: d.prioridade || "Média", conta: nn(d.conta), situacao: d.situacao || "Em dia", obs: d.obs || "" })) },
  provisoes: { rows: S => S.provisoes.map(p => ({ id: p.id, nome: p.nome, alvo: p.alvo, reservado: p.reservado || 0, conta: nn(p.conta), uso: p.uso })) },
  provisao_movs: { rows: S => S.provisoes.flatMap(p => (p.mov || []).map(m => ({ id: m.id, provisao_id: p.id, data: m.data, tipo: m.tipo, valor: m.valor, lanc: nn(m.lanc) }))) },
  investimentos: { rows: S => S.invest.map(i => ({ id: i.id, nome: i.nome, tipo: i.tipo, inst: i.inst || "" })) },
  invest_movs: { rows: S => S.invest.flatMap(i => (i.mov || []).map(m => ({ id: m.id, investimento_id: i.id, data: m.data, tipo: m.tipo, valor: m.valor, lanc: nn(m.lanc), nota: nn(m.nota) }))) },
  importacoes: { rows: S => S.importacoes.map(h => ({ id: h.id, data: h.data, arquivos: h.arquivos, hashes: h.hashes || [], incl: h.incl, vinc: h.vinc, ign: h.ign, usuario: h.user || "" })) },
};
const ORDEM = Object.keys(TABELAS);

function montarEstado(f, R, user) {
  const S = { v: 4, user, inicio: f.inicio, pessoas: [], contas: [], cartoes: [], categorias: [], regras: [], lanc: [], parc: [], rec: [], inst: {}, manuais: [], dividas: [], provisoes: [], invest: [], audit: [], importacoes: [], pend: null };
  S.pessoas = R.pessoas.map(r => ({ id: r.id, nome: r.nome, acesso: r.acesso, login: r.login }));
  S.contas = R.contas.map(r => ({ id: r.id, nome: r.nome, tipo: r.tipo, inst: r.inst, resp: r.resp, caixa: r.caixa, saldoIni: +r.saldo_ini, dataIni: r.data_ini }));
  S.cartoes = R.cartoes.map(r => ({ id: r.id, nome: r.nome, inst: r.inst, resp: r.resp, limite: +r.limite, fecha: r.fecha, vence: r.vence, pagaCom: r.paga_com, final: r.final, status: r.status }));
  S.categorias = R.categorias.map(r => [r.nome, r.receita ? "receita" : r.subs]);
  S.regras = R.regras.map(r => ({ id: r.id, trecho: r.trecho, cat: r.cat, sub: r.sub, prio: r.prio }));
  const und = v => v === null ? undefined : v;
  S.lanc = R.lancamentos.map(r => { const l = { id: r.id, data: r.data, desc: r.descricao, tipo: r.tipo, valor: +r.valor, origem: r.origem }; for (const [a, b] of [["conta", "conta"], ["cartao", "cartao"], ["destino", "destino"], ["cat", "cat"], ["sub", "sub"], ["resp", "resp"], ["fatura", "fatura"], ["comp", "comp"], ["estornoDe", "estorno_de"], ["obs", "obs"], ["imp", "importacao"], ["fitid", "fitid"]]) if (r[b] !== null) l[a] = r[b]; if (r.excluido) l.excluido = true; return l; });
  S.parc = R.parcelamentos.map(r => ({ id: r.id, cartao: r.cartao, desc: r.descricao, cat: r.cat, sub: und(r.sub), data: r.data, total: +r.total, n: r.n, resp: r.resp, origem: r.origem, cancelDe: und(r.cancel_de), k0: und(r.k0) }));
  S.rec = R.recorrencias.map(r => ({ id: r.id, desc: r.descricao, tipo: r.tipo, cat: r.cat, sub: r.sub || "", valor: +r.valor, dia: r.dia, conta: r.conta, inicio: r.inicio, fim: r.fim, resp: r.resp, natureza: r.natureza, parcTotal: r.parc_total || null, parcIni: r.parc_ini ?? null }));
  const manuaisIds = new Set(R.manuais.map(m => m.id));
  S.manuais = R.manuais.map(r => ({ id: r.id, desc: r.descricao, cat: r.cat, valor: +r.valor, venc: r.venc, origem: r.origem, conta: r.conta, de: r.de, desconto: +r.desconto || 0, cancel: r.cancel || undefined, reag: und(r.reag), motivo: und(r.motivo), pag: [] }));
  for (const r of R.ajustes) { const i = {}; if (r.valor !== null) i.valor = +r.valor; if (r.venc) i.venc = r.venc; if (+r.desconto) i.desconto = +r.desconto; if (r.cancel) i.cancel = true; if (r.reag) i.reag = r.reag; if (r.motivo) i.motivo = r.motivo; S.inst[r.id] = i; }
  for (const r of R.pagamentos) { const p = { id: r.id, lanc: r.lanc, valor: +r.valor, data: r.data }; if (manuaisIds.has(r.chave)) S.manuais.find(m => m.id === r.chave).pag.push(p); else (S.inst[r.chave] = S.inst[r.chave] || {}, S.inst[r.chave].pag = S.inst[r.chave].pag || []).push(p); }
  S.dividas = R.dividas.map(r => ({ id: r.id, nome: r.nome, credor: r.credor, saldo: +r.saldo, parcela: +r.parcela, taxa: r.taxa === null ? null : Number(r.taxa), dia: r.dia, primeiro: r.primeiro, total: r.total, prioridade: r.prioridade, conta: r.conta, situacao: r.situacao, obs: r.obs }));
  S.provisoes = R.provisoes.map(r => ({ id: r.id, nome: r.nome, alvo: +r.alvo, reservado: +r.reservado, conta: r.conta, uso: r.uso, mov: R.provisao_movs.filter(m => m.provisao_id === r.id).sort((a, b) => a.data < b.data ? -1 : 1).map(m => ({ id: m.id, data: m.data, tipo: m.tipo, valor: +m.valor, lanc: und(m.lanc) })) }));
  S.invest = R.investimentos.map(r => ({ id: r.id, nome: r.nome, tipo: r.tipo, inst: r.inst, mov: R.invest_movs.filter(m => m.investimento_id === r.id).sort((a, b) => a.data < b.data ? -1 : 1).map(m => ({ id: m.id, data: m.data, tipo: m.tipo, valor: +m.valor, lanc: und(m.lanc), nota: und(m.nota) })) }));
  S.importacoes = R.importacoes.sort((a, b) => a.data < b.data ? 1 : -1).map(r => ({ id: r.id, data: r.data.slice(0, 16), arquivos: r.arquivos, hashes: r.hashes, incl: r.incl, vinc: r.vinc, ign: r.ign, user: r.usuario }));
  S.audit = (R.auditoria || []).map(a => ({ ts: a.ts, user: a.usuario, acao: a.acao, alvo: a.alvo, det: a.det, ref: a.ref, _s: 1 }));
  return S;
}

const DB = {
  sb: null, F: null, snap: {}, fila: Promise.resolve(), estado: "ok", onEstado: () => {},
  async carregar(familia, user) {
    const sb = this.sb, F = familia.id;
    const R = {};
    await Promise.all([...ORDEM.map(async t => { const { data, error } = await sb.from(t).select("*").eq("familia_id", F).range(0, 49999); if (error) throw error; R[t] = data; }),
      (async () => { const { data, error } = await sb.from("auditoria").select("*").eq("familia_id", F).order("ts", { ascending: false }).limit(500); if (error) throw error; R.auditoria = data; })()]);
    this.F = F;
    const S = montarEstado(familia, R, user);
    // a foto inicial é a própria serialização do estado montado
    garanteIds(S);
    for (const t of ORDEM) this.snap[t] = new Map(TABELAS[t].rows(S).map(r => [r.id, JSON.stringify(r)]));
    return S;
  },
  // há alteração em alguma tabela desde a última gravação/carga? (não olha a auditoria)
  temMudanca(S) {
    garanteIds(S);
    for (const t of ORDEM) { const atual = TABELAS[t].rows(S), ant = this.snap[t] || new Map(); if (atual.length !== ant.size) return true; for (const r of atual) if (ant.get(r.id) !== JSON.stringify(r)) return true; }
    return false;
  },
  sync(S) {
    this.fila = this.fila.then(() => this._sync(S)).catch(() => {});
    return this.fila;
  },
  async _sync(S) {
    garanteIds(S);
    const sb = this.sb, F = this.F; let mudou = false;
    this.onEstado("salvando");
    try {
      for (const t of ORDEM) {
        const atual = TABELAS[t].rows(S), ant = this.snap[t] || new Map(), ids = new Set();
        const up = [];
        for (const r of atual) { ids.add(r.id); const j = JSON.stringify(r); if (ant.get(r.id) !== j) up.push(r); }
        const del = [...ant.keys()].filter(id => !ids.has(id));
        if (up.length) { mudou = true; for (let i = 0; i < up.length; i += 500) { const { error } = await sb.from(t).upsert(up.slice(i, i + 500).map(r => ({ ...r, familia_id: F })), { onConflict: "familia_id,id" }); if (error) throw new Error(t + ": " + error.message); } }
        if (del.length) { mudou = true; for (let i = 0; i < del.length; i += 200) { const { error } = await sb.from(t).delete().eq("familia_id", F).in("id", del.slice(i, i + 200)); if (error) throw new Error(t + ": " + error.message); } }
        this.snap[t] = new Map(atual.map(r => [r.id, JSON.stringify(r)]));
      }
      const novos = S.audit.filter(a => !a._s);
      if (novos.length) { const { error } = await sb.from("auditoria").insert(novos.reverse().map(a => ({ familia_id: F, ts: new Date().toISOString(), usuario: a.user, acao: a.acao, alvo: a.alvo || "", det: a.det || "", ref: a.ref || null }))); if (error) throw new Error("auditoria: " + error.message); novos.forEach(a => a._s = 1); }
      this.onEstado("ok");
    } catch (e) {
      console.error(e); this.onEstado("erro", e.message);
    }
    return mudou;
  },
};
if (typeof module !== "undefined") module.exports = { TABELAS, montarEstado, garanteIds, ORDEM };
