// ================= ALÍCIA LOCAL · respostas calculadas no próprio aparelho, sem IA paga =================
// Entende a pergunta (intenção + mês, cartão, conta, categoria, pessoa, loja, data), responde com os cálculos do
// próprio sistema e, para dúvidas de uso, procura no manual (js/alicia-manual.js). Nada sai do aparelho.
// AliciaLocal.responder(pergunta, { ocr, ultimo }) → { texto, conf, intent, ent, dados, trechos }

(function () {
  // ---------- texto ----------
  const N = s => norm(s).toLowerCase().replace(/[^a-z0-9$%/,.\- ]+/g, " ").replace(/\s+/g, " ").trim();
  const STOP = new Set("a o as os um uma uns umas de do da dos das no na nos nas em num numa e ou que se por para pra pro com sem ao aos à é eh ser foi era sao esta estao estou tem ter tenho temos ha me mim meu minha meus minhas nosso nossa nossos nossas voce voces vc vcs ele ela eles elas isso isto esse essa este aquele aquela la aqui ai entao tambem ja ainda so mais menos muito pouco qual quais quanto quanta quantos quantas quando onde como porque pq oque o que favor por favor alicia oi ola como onde porque por que pq me diga diga mostra mostre ver veja sobre quero queria gostaria saber preciso pode poderia consegue dar dá eu nos nós".split(" "));
  const SIN = {
    pagar: "pagar pago paga pagos pagas paguei pagamos pagou pagamento pagamentos pagando quitar quitei baixa",
    lancar: "lancar lanco lancei lancamos lancamento lancamentos registrar registro registrei cadastrar cadastro cadastrei adicionar adiciono incluir incluo criar crio inserir anotar colocar coloco",
    excluir: "excluir excluo exclui apagar apago apaguei deletar remover removo tirar tiro exclusao",
    editar: "editar edito alterar altero alterei alteracao alteracoes mudanca mudancas mudar mudo mudei corrigir corrijo trocar troco modificar ajustar",
    fatura: "fatura faturas cartao cartoes credito",
    compromisso: "boleto boletos compromisso compromissos vencimento vencimentos vence vencem vencer vencida vencidas vencido vencidos",
    importar: "importar importo importei importacao importacoes extrato extratos ofx csv pdf print prints foto fotos screenshot arquivo arquivos subir anexar",
    parcela: "parcela parcelas parcelado parcelada parcelados parceladas parcelamento parcelamentos prestacao prestacoes vezes",
    divida: "divida dividas emprestimo emprestimos devendo devemos acordo acordos negociar negociacao negociado quitacao inadimplencia",
    categoria: "categoria categorias classificar classificacao classifica subcategoria subcategorias",
    regra: "regra regras",
    saldo: "saldo saldos caixa dinheiro disponivel",
    receita: "receita receitas salario salarios entrada entradas recebimento recebimentos receber recebi recebemos ganho ganhos renda",
    gasto: "gasto gastos gastei gastamos gastou gastaram despesa despesas compra compras comprei compramos consumo",
    investimento: "investimento investimentos investir investido aplicacao aplicacoes aplicado rendimento rendimentos rendeu render tesouro cdb poupanca",
    previsao: "previsao previsoes projecao projecoes planejamento planejar futuro",
    transferencia: "transferencia transferencias transferir pix saque sacar",
    senha: "senha senhas login entrar acesso seguranca autenticacao",
    convite: "convidar convido convidei convite convites membro membros usuario usuarios",
    duplicado: "duplicado duplicada duplicados duplicadas duplicidade repetido repetida repetidos repetidas dobrado dobrada",
    recorrencia: "recorrencia recorrencias recorrente recorrentes fixa fixas mensal mensais assinatura assinaturas",
    estorno: "estorno estornos devolucao reembolso",
    limite: "limite limites",
    tela: "tela telas pagina",
    notificacao: "notificacao notificacoes aviso avisos erro erros mensagem",
    instalar: "instalar instalo instalado instalacao aplicativo app celular",
  };
  const CANON = {}; for (const [k, v] of Object.entries(SIN)) for (const w of v.split(" ")) CANON[w] = k;
  const stem = w => { if (CANON[w]) return CANON[w]; let s = w; if (s.length > 4) s = s.replace(/(oes|aes)$/, "ao").replace(/ais$/, "al").replace(/eis$/, "el").replace(/(s)$/, ""); if (s.length > 6) s = s.slice(0, 6); return s; };
  const toks = s => N(s).split(" ").filter(w => w && !STOP.has(w) && !/^\d+([.,]\d+)?$/.test(w)).map(stem);

  // ---------- base de conhecimento: o manual em pedaços ----------
  let KB = null;
  const SEC_VIEW = [["Novo lançamento", "lancamentos"], ["Lançamentos", "lancamentos"], ["Painel", "painel"], ["Cartões", "cartoes"], ["Contas a pagar", "contas"], ["Planejamento", "planejamento"], ["Dívidas", "dividas"], ["Investimentos", "investimentos"], ["Análises", "analises"], ["Importar", "importar"], ["Conversa", "chat"], ["Notificações", "notificacoes"], ["Configurações", "ajustes"]];
  const NOME_VIEW = { painel: "Painel", lancamentos: "Lançamentos", cartoes: "Cartões", contas: "Contas a pagar", planejamento: "Planejamento", dividas: "Dívidas", investimentos: "Investimentos", analises: "Análises", importar: "Importar", chat: "Conversa", notificacoes: "Notificações", ajustes: "Configurações" };
  const viewDaSecao = t => (SEC_VIEW.find(([n]) => t.startsWith(n)) || [])[1] || null;
  function montaKB() {
    const linhas = String(window.ALICIA_MANUAL || "").split("\n"), out = [];
    let h2 = "", h3 = "", atual = null;
    const fecha = () => { if (atual && atual.texto.trim()) out.push(atual); atual = null; };
    for (const l of linhas) {
      if (/^## /.test(l)) { fecha(); h2 = l.slice(3).trim(); h3 = ""; continue; }
      if (/^### /.test(l)) { fecha(); h3 = l.slice(4).trim(); continue; }
      if (!l.trim() || /^#\s/.test(l)) { fecha(); continue; }
      const sub = /^\s{2,}-/.test(l);
      if (sub && atual) { atual.texto += "\n" + l; continue; }
      fecha(); atual = { secao: h3 ? h2 + " › " + h3 : h2, texto: l };
    }
    fecha();
    // trechos curtos que só fazem sentido junto do anterior ("Campos:", "Abas:") se unem ao seguinte
    const res = [];
    for (let i = 0; i < out.length; i++) { const c = out[i]; if (c.texto.trim().length < 18 && out[i + 1] && out[i + 1].secao === c.secao) { out[i + 1].texto = c.texto + "\n" + out[i + 1].texto; continue; } res.push(c); }
    res.forEach(c => { c.t = toks(c.texto); c.ts = toks(c.secao); c.view = viewDaSecao(c.secao.split(" › ").pop()) || viewDaSecao(c.secao); });
    const df = {}; res.forEach(c => new Set([...c.t, ...c.ts]).forEach(w => df[w] = (df[w] || 0) + 1));
    const avg = res.reduce((a, c) => a + c.t.length, 0) / Math.max(1, res.length);
    KB = { chunks: res, df, n: res.length, avg };
  }
  function buscaKB(pergunta, extra = "", limite = 4) {
    if (!KB || KB._m !== window.ALICIA_MANUAL) { montaKB(); KB._m = window.ALICIA_MANUAL; }
    const q = [...new Set(toks(pergunta))], qx = [...new Set(toks(extra))].filter(w => !q.includes(w));
    if (!q.length && !qx.length) return { itens: [], cobertura: 0 };
    const idf = w => Math.log(1 + (KB.n - (KB.df[w] || 0) + 0.5) / ((KB.df[w] || 0) + 0.5));
    const sc = KB.chunks.map(c => {
      let s = 0; const vistos = new Set();
      const conta = (w, peso) => { const tf = c.t.filter(x => x === w).length, ts = c.ts.includes(w) ? 1 : 0; if (!tf && !ts) return; vistos.add(w); s += peso * idf(w) * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * c.t.length / KB.avg)) + ts * 0.8); };
      q.forEach(w => conta(w, 1)); qx.forEach(w => conta(w, 0.35));
      if (/perguntas frequentes/i.test(c.secao)) s *= 1.15;
      return { c, s, vistos };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    const top = sc.slice(0, limite), melhor = top[0];
    const cobertura = melhor && q.length ? q.filter(w => melhor.vistos.has(w)).length / q.length : 0;
    return { itens: top, cobertura, score: melhor ? melhor.s : 0 };
  }
  const limpaMd = t => t.replace(/^\s*-\s+/gm, "- ").trim();
  const formataTrecho = c => { const m = c.texto.match(/^-\s*"(.+?)"\s*→\s*([\s\S]*)$/); return m ? `**${m[1]}**\n\n${m[2].trim().replace(/^./, x => x.toUpperCase())}` : limpaMd(c.texto); };
  const ABAS = [["contas", "contas"], ["cartoes", "cartoes"], ["categorias", "categorias"], ["regras", "regras"], ["pessoas", "pessoas"], ["seguranca", "seguranca"], ["backup", "dados"], ["auditoria", "auditoria"]];
  const viewDoTexto = t => { const n = N(t); let best = null, pos = 1e9; for (const [nome, v] of SEC_VIEW) { const i = n.indexOf(N(nome)); if (i >= 0 && i < pos) { pos = i; best = v; } } if (best === "ajustes") { const m = n.match(/configuracoes ?(?:→|->|-|>)? ?([a-z]+)/); const a = m && ABAS.find(([k]) => m[1].startsWith(k.slice(0, 5))); if (a) best = "ajustes/" + a[1]; } return best; };

  // ---------- entidades ----------
  const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function achaMes(q) {
    if (/\b(mes passado|ultimo mes|mes anterior)\b/.test(q)) return addYM(CUR, -1);
    if (/\b(proximo mes|mes que vem|mes seguinte)\b/.test(q)) return addYM(CUR, 1);
    if (/\b(este|esse|neste|nesse|deste|desse) mes\b|\bmes atual\b/.test(q)) return CUR;
    const m = q.match(new RegExp("\\b(" + MESES.join("|") + "|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\\b(?:\\s*(?:de|/)?\\s*(20\\d\\d))?"));
    if (!m) { const n = q.match(/\b(0?[1-9]|1[0-2])\/(20\d\d)\b/); return n ? n[2] + "-" + pad(+n[1]) : null; }
    const i = MESES.findIndex(x => x.startsWith(m[1].slice(0, 3)));
    if (m[2]) return m[2] + "-" + pad(i + 1);
    const y = +CUR.slice(0, 4), cands = [y - 1, y, y + 1].map(a => a + "-" + pad(i + 1));
    return cands.sort((a, b) => Math.abs(ymDiff(CUR, a)) - Math.abs(ymDiff(CUR, b)) || (a > b ? -1 : 1))[0];
  }
  function achaData(q) {
    if (/\bhoje\b/.test(q)) return TODAY;
    if (/\bamanha\b/.test(q)) return addDays(TODAY, 1);
    if (/\bontem\b/.test(q)) return addDays(TODAY, -1);
    let m = q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) { const y = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : CUR.slice(0, 4); return y + "-" + pad(+m[2]) + "-" + pad(+m[1]); }
    m = q.match(/\bdia (\d{1,2})\b/); if (m) { const mes = achaMes(q) || CUR; return mk(mes, +m[1]); }
    return null;
  }
  const palavrasDe = s => N(s).split(" ").filter(w => w.length >= 3 && !STOP.has(w) && !/^(cartao|conta|banco|corrente|principal|credito|debito)$/.test(w));
  function melhor(lista, q, campos) {
    let best = null, bs = 0; const qs = " " + q + " ";
    for (const x of lista) {
      let s = 0;
      for (const f of campos(x)) { if (!f) continue; const fn = N(f); if (fn.length >= 3 && qs.includes(" " + fn + " ")) s += 3; for (const w of palavrasDe(f)) if (qs.includes(" " + w + " ")) s += w.length >= 5 ? 1.2 : 0.8; }
      if (x.final && new RegExp("\\b" + x.final + "\\b").test(q)) s += 4;
      if (s > bs) { bs = s; best = x; }
    }
    return bs >= 0.8 ? best : null;
  }
  const semPessoas = (nome, q, palavra) => { if (new RegExp("\\b" + palavra).test(q)) return nome; let n = N(nome); for (const p of S.pessoas) { const f = N(p.nome).split(" ")[0]; if (f.length >= 3) n = n.replace(new RegExp("\\b" + f + "\\b", "g"), " "); } return n; };
  const achaCartao = q => melhor(S.cartoes, q, c => [semPessoas(c.nome, q, "cartao"), c.inst, /\bcartao d[ao] /.test(q) ? c.resp : ""]);
  const achaConta = q => melhor(S.contas, q, c => [semPessoas(c.nome, q, "conta"), c.inst]);
  function achaCategoria(q) {
    const qs = " " + q + " "; let r = null, bs = 0;
    for (const [cat, subs] of S.categorias) {
      const ls = Array.isArray(subs) ? subs : subs && subs !== "receita" ? String(subs).split(",") : [], cands = [[cat, null], ...ls.map(s => [cat, String(s).trim()])];
      for (const [c, sub] of cands) { const nm = N(sub || c); if (nm.length < 3) continue; const forms = [nm, nm.replace(/cao$/, "coes"), nm + "s", nm.replace(/s$/, "")]; if (forms.some(f => qs.includes(" " + f + " ")) && nm.length > bs) { bs = nm.length; r = { cat: c, sub }; } }
    }
    return r;
  }
  const achaPessoa = q => { const qs = " " + q + " "; for (const p of S.pessoas) { const f = N(p.nome).split(" ")[0]; if (f.length >= 3 && qs.includes(" " + f + " ")) return p.nome; } if (/\b(da|de) casa\b/.test(q)) return "Casa"; return null; };
  // termo de busca (loja ou descrição): o que sobra depois de tirar as palavras de pergunta, mês, categoria etc.
  const GENERICAS = new Set("gasto gastos gastei gastamos gastou despesa despesas compra compras comprei paguei pago pagamos pagar quanto quantos quantas quando foi foram mes mes passado este esse ultimo ultima ultimos ultimas proximo hoje ontem dia dias total valor valores conta contas cartao cartoes fatura faturas lancamento lancamentos lancei achar procura procurar busca buscar encontrar encontra tem teve parcela parcelas parcelado parcelamento acaba termina falta faltam ano semana categoria vez vezes com no na nos nas do da dos das".split(" "));
  function achaTermo(q, ent) {
    const fora = new Set([...MESES, "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]);
    if (ent.cat) palavrasDe(ent.cat.sub || ent.cat.cat).forEach(w => fora.add(w));
    if (ent.cartao) palavrasDe(ent.cartao.nome + " " + ent.cartao.inst).forEach(w => fora.add(w));
    if (ent.conta) palavrasDe(ent.conta.nome).forEach(w => fora.add(w));
    if (ent.pessoa) fora.add(N(ent.pessoa).split(" ")[0]);
    const voc = vocabulario();
    const ws = q.split(" ").filter(w => w.length >= 3 && !STOP.has(w) && !GENERICAS.has(w) && !fora.has(w) && !/^\d/.test(w) && (voc.has(w) || APELIDOS[w]));
    return ws.length ? ws.join(" ") : null;
  }
  const APELIDOS = { luz: "energia enel light cemig copel celesc coelba cpfl eletropaulo", energia: "luz enel light cemig copel", agua: "sabesp saneamento cedae copasa sanepar", internet: "vivo claro net fibra oi tim", gas: "comgas ultragaz liquigas", aluguel: "aluguel imobiliaria", mercado: "supermercado mercado carrefour assai atacadao extra pao de acucar", uber: "uber 99", farmacia: "droga drogasil raia pague menos farmacia", ifood: "ifood ifd" };
  let VOC = null;
  function vocabulario() {
    const k = S.lanc.length + "|" + S.parc.length + "|" + S.audit.length;
    if (VOC && VOC.k === k) return VOC.s;
    const s = new Set(); const add = t => N(t).split(" ").forEach(w => { if (w.length >= 3 && !STOP.has(w)) s.add(w); });
    S.lanc.forEach(l => { if (!l.excluido) add(l.desc + " " + (l.sub || "")); }); S.parc.forEach(p => add(p.desc)); S.rec.forEach(r => add(r.desc)); S.audit.forEach(a => add(a.alvo));
    VOC = { k, s }; return s;
  }
  function casaTermo(desc, termo) {
    const d = " " + N(desc) + " ";
    return termo.split(" ").every(w => { const alts = [w, ...(APELIDOS[w] ? APELIDOS[w].split(" ") : [])]; return alts.some(a => d.includes(" " + a) || (a.length >= 4 && d.includes(a))); });
  }

  // ---------- utilidades de resposta ----------
  const link = (v, txt) => `[${txt || "Abrir " + (NOME_VIEW[v] || v)}](#ir:${v})`;
  const mesNome = ym => ymLong(ym);
  const lista = (itens, f, max = 12) => itens.slice(0, max).map(f).join("\n") + (itens.length > max ? `\n- … e mais ${itens.length - max}` : "");
  const FORA = ["cancelada", "reagendada", "renegociada"];
  function pagosLanc() { const s = new Set(); for (const k in S.inst) for (const p of S.inst[k].pag || []) if (p.lanc) s.add(p.lanc); for (const m of S.manuais) for (const p of m.pag || []) if (p.lanc) s.add(p.lanc); return s; }
  function corte(ym) {
    const ini0 = ymOf(S.inicio), cs = ym >= ini0 ? compromissos(S, ym, ym) : [];
    const rec = cs.filter(c => c.tipo === "receita" && c.status !== "cancelada"), desp = cs.filter(c => c.tipo === "despesa" && !FORA.includes(c.status));
    const atrasadas = ym === CUR && ini0 < CUR ? compromissos(S, ini0, addYM(CUR, -1)).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0) : [];
    const pl = pagosLanc(), avulsos = S.lanc.filter(l => !l.excluido && l.tipo === "despesa" && l.conta && !l.cartao && ymOf(l.data) === ym && !pl.has(l.id) && !String(l.conta).startsWith("inv"));
    const recebido = receitasMes(S, ym), aReceber = sum(rec.filter(ativo), c => Math.max(0, c.restante));
    const totalComp = sum(desp, c => c.valor - (c.desconto || 0)), pagoComp = sum(desp, c => c.pago), gastoAvulso = sum(avulsos, l => l.valor);
    const faltaAtras = sum(atrasadas, c => c.restante), faltaMes = sum(desp.filter(ativo), c => Math.max(0, c.restante));
    const entra = recebido + aReceber, sai = totalComp + gastoAvulso + faltaAtras;
    return { ym, rec, desp, atrasadas, avulsos, recebido, aReceber, faltaMes, faltaAtras, falta: faltaMes + faltaAtras, entra, sai, pago: pagoComp + gastoAvulso, resultado: entra - sai };
  }
  const onde = l => { const c = l.cartao && cardOf(S, l.cartao); return c ? c.nome + " (fatura " + ymLabel(l.fatura || keyOf(c, l.data)) + ")" : (S.contas.find(x => x.id === l.conta) || {}).nome || "—"; };

  // ---------- intenções com dados ----------
  const I = {};
  I.corte = (e, q) => {
    const ym = e.mes || CUR, m = corte(ym), abertas = m.desp.filter(c => ativo(c) && c.restante > 0);
    const so = /\bsobr|\bresult|\bfalta no mes|\bfecha(r)? (no )?(positivo|negativo)/.test(q);
    let t = `**${mesNome(ym)[0].toUpperCase() + mesNome(ym).slice(1)}**\n\n| | |\n|---|---|\n| Entra | **${fmt(m.entra)}** (recebido ${fmt(m.recebido)} · a receber ${fmt(m.aReceber)}) |\n| Sai | **${fmt(m.sai)}** (já pago ${fmt(m.pago)}) |\n| Falta pagar | **${fmt(m.falta)}**${m.faltaAtras ? ` (inclui ${fmt(m.faltaAtras)} atrasado de meses anteriores)` : ""} |\n| ${m.resultado >= 0 ? "Sobra no mês" : "Falta no mês"} | **${fmt(Math.abs(m.resultado))}** |\n`;
    if (!so || abertas.length) t += abertas.length || m.atrasadas.length ? `\nO que ainda falta pagar:\n${lista([...m.atrasadas, ...abertas], c => `- ${br(c.venc)} · ${c.desc}: **${fmt(c.restante)}**${c.venc < TODAY ? " (vencida)" : ""}`, 15)}\n` : `\nNada pendente neste mês.\n`;
    if (ym === CUR) { const sl = saldoLivre(S, mk(CUR, 31)); t += `\nHoje há ${fmt(sl.caixa)} nas contas; depois de pagar o que falta até o fim do mês, o **saldo livre estimado** fica em **${fmt(sl.livre)}** (sem contar os ${fmt(sl.aReceber)} que ainda vão entrar).\n`; }
    t += `\n${link("contas", "Abrir Contas a pagar")} ${link("painel", "Ver o corte mensal no Painel")}`;
    return { texto: t, conf: 0.9, dados: `Corte de ${ym}: entra ${fmt(m.entra)} (recebido ${fmt(m.recebido)}, a receber ${fmt(m.aReceber)}); sai ${fmt(m.sai)}; já pago ${fmt(m.pago)}; falta pagar ${fmt(m.falta)} (atrasado ${fmt(m.faltaAtras)}); resultado ${fmt(m.resultado)}. Pendentes: ${abertas.map(c => `${br(c.venc)} ${c.desc} ${fmt(c.restante)}`).join("; ")}` };
  };
  I.vencidas = () => {
    const vs = compromissos(S, ymOf(S.inicio), CUR).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0 && c.venc < TODAY);
    if (!vs.length) return { texto: `Nenhuma conta vencida. Tudo o que venceu até ontem está pago. ${link("contas")}`, conf: 0.9, dados: "Nenhuma conta vencida." };
    return { texto: `**${vs.length} conta${vs.length > 1 ? "s" : ""} vencida${vs.length > 1 ? "s" : ""}**, somando **${fmt(sum(vs, c => c.restante))}**:\n${lista(vs, c => `- ${br(c.venc)} · ${c.desc}: **${fmt(c.restante)}** (${diasAte(c.venc, TODAY)} dia${diasAte(c.venc, TODAY) > 1 ? "s" : ""} de atraso)`)}\n\nPara dar baixa: Contas a pagar → Registrar pagamento. ${link("contas")}`, conf: 0.92, dados: "Vencidas: " + vs.map(c => `${br(c.venc)} ${c.desc} ${fmt(c.restante)}`).join("; ") };
  };
  I.proximas = (e, q) => {
    let ate = addDays(TODAY, 15), rot = "nos próximos 15 dias";
    if (/\bhoje\b/.test(q)) { ate = TODAY; rot = "hoje"; } else if (/\bamanha\b/.test(q)) { ate = addDays(TODAY, 1); rot = "até amanhã"; } else if (/\bsemana\b/.test(q)) { ate = addDays(TODAY, 7); rot = "nos próximos 7 dias"; } else if (e.mes) { ate = mk(e.mes, 31); rot = "até o fim de " + mesNome(e.mes); }
    const vs = compromissos(S, CUR, ymOf(ate)).filter(c => c.tipo === "despesa" && ativo(c) && c.restante > 0 && c.venc >= TODAY && c.venc <= ate);
    if (!vs.length) return { texto: `Nada a vencer ${rot}. ${link("contas")}`, conf: 0.88, dados: "Nada a vencer " + rot };
    return { texto: `Vence ${rot}: **${fmt(sum(vs, c => c.restante))}** em ${vs.length} conta${vs.length > 1 ? "s" : ""}.\n${lista(vs, c => `- ${br(c.venc)} · ${c.desc}: **${fmt(c.restante)}**`)}\n\n${link("contas")}`, conf: 0.88, dados: "A vencer " + rot + ": " + vs.map(c => `${br(c.venc)} ${c.desc} ${fmt(c.restante)}`).join("; ") };
  };
  const fatTexto = (f, itens) => `**Fatura de ${mesNome(f.key)} · ${f.card.nome}** (${f.status})\n- Fecha em ${br(f.fecha)} e vence em ${br(f.vence)}\n- Total **${fmt(f.total)}** · pago ${fmt(f.pago)} · **falta ${fmt(f.saldo)}**\n- ${f.itens.length} lançamento${f.itens.length === 1 ? "" : "s"}, sendo ${f.itens.filter(i => i.parc).length} parcela${f.itens.filter(i => i.parc).length === 1 ? "" : "s"} de compras anteriores` + (itens ? `\n\n${itens}` : "");
  I.fatura = (e, q) => {
    const card = e.cartao;
    if (!S.cartoes.length) return { texto: `Nenhum cartão cadastrado ainda. ${link("ajustes", "Cadastrar cartão")}`, conf: 0.9, dados: "" };
    if (!card) {
      const rows = S.cartoes.map(c => { const r = cardResumo(S, c), f = e.mes ? fatura(S, c, e.mes) : r.atual; return { c, f, r }; });
      return { texto: `${e.mes ? "Faturas de " + mesNome(e.mes) : "Fatura atual de cada cartão"}:\n\n| Cartão | Fatura | Vence | Total | Falta |\n|---|---|---|---|---|\n${rows.map(({ c, f }) => `| ${c.nome} | ${ymLabel(f.key)} (${f.status}) | ${brs(f.vence)} | ${fmt(f.total)} | ${fmt(f.saldo)} |`).join("\n")}\n\nEm aberto em todos os cartões: **${fmt(sum(rows, x => x.r.deve))}**. ${link("cartoes")}`, conf: 0.88, dados: rows.map(({ c, f }) => `${c.nome}: fatura ${f.key} ${f.status}, vence ${br(f.vence)}, total ${fmt(f.total)}, pago ${fmt(f.pago)}, falta ${fmt(f.saldo)}`).join("; ") };
    }
    const r = cardResumo(S, card), f = e.mes ? fatura(S, card, e.mes) : r.atual;
    const todos = /\b(itens|o que tem|quais|lista|listar|detalh|compras)\b/.test(q);
    const its = [...f.itens].sort((a, b) => b.valor - a.valor);
    const itensTxt = its.length ? (todos ? "Lançamentos:\n" + lista([...f.itens], i => `- ${brs(i.data)} · ${i.desc}${i.parc ? ` (${i.parc[0]}/${i.parc[1]})` : ""}: ${fmt(i.valor)}`, 40) : "Maiores valores:\n" + lista(its, i => `- ${i.desc}${i.parc ? ` (${i.parc[0]}/${i.parc[1]})` : ""}: ${fmt(i.valor)}`, 5)) : "";
    return { texto: fatTexto(f, itensTxt) + `\n\nLimite ${fmt(card.limite)} · em aberto ${fmt(r.deve)} · disponível ${fmt(r.disponivel)}. Compras de hoje caem na fatura de ${mesNome(keyOf(card, TODAY))}.\n${link("cartoes")}`, conf: 0.92, dados: `${card.nome}: fatura ${f.key} ${f.status}, fecha ${br(f.fecha)}, vence ${br(f.vence)}, total ${fmt(f.total)}, pago ${fmt(f.pago)}, falta ${fmt(f.saldo)}; limite ${fmt(card.limite)}, disponível ${fmt(r.disponivel)}; maiores itens: ${its.slice(0, 8).map(i => i.desc + " " + fmt(i.valor)).join("; ")}` };
  };
  I.qualFatura = (e, q) => {
    const d = e.data || TODAY, cs = e.cartao ? [e.cartao] : S.cartoes;
    if (!cs.length) return { texto: `Nenhum cartão cadastrado. ${link("ajustes", "Cadastrar cartão")}`, conf: 0.9 };
    const linhas = cs.map(c => { const k = keyOf(c, d); return `- **${c.nome}**: fatura de **${mesNome(k)}** (fecha ${br(closeOf(c, k))}, vence ${br(dueOf(c, k))})`; });
    return { texto: `Uma compra feita em ${br(d)} entra em:\n${linhas.join("\n")}\n\nRegra: compra antes do dia de fechamento entra na fatura que fecha naquele mês; no dia do fechamento ou depois, vai para a seguinte. A fatura leva o nome do mês do vencimento.`, conf: 0.9, dados: linhas.join("; ") };
  };
  I.limite = (e) => {
    const cs = e.cartao ? [e.cartao] : S.cartoes;
    return { texto: `${cs.map(c => { const r = cardResumo(S, c); return `- **${c.nome}**: limite ${fmt(c.limite)} · em aberto ${fmt(r.deve)} · **disponível ${fmt(r.disponivel)}**`; }).join("\n")}\n\nO disponível é estimado: limite menos tudo o que está em aberto nas faturas (inclusive parcelas futuras). ${link("cartoes")}`, conf: 0.88, dados: cs.map(c => { const r = cardResumo(S, c); return `${c.nome} limite ${fmt(c.limite)} aberto ${fmt(r.deve)} disponível ${fmt(r.disponivel)}`; }).join("; ") };
  };
  I.saldo = (e, q) => {
    if (/\blivre\b/.test(q)) {
      const ate = e.data || mk(e.mes || CUR, 31), sl = saldoLivre(S, ate);
      return { texto: `**Saldo livre estimado até ${br(ate)}: ${fmt(sl.livre)}**\n\n| | |\n|---|---|\n| Dinheiro nas contas hoje | ${fmt(sl.caixa)} |\n| − Falta pagar até ${brs(ate)} | ${fmt(sl.comprometido)} |\n| − Reservas planejadas | ${fmt(sl.prov)} |\n| = Saldo livre | **${fmt(sl.livre)}** |\n\nAinda vão entrar ${fmt(sl.aReceber)} de receitas previstas, que só contam quando forem recebidas.${sl.livre < 0 ? " Saldo negativo quer dizer que o que falta pagar é maior que o dinheiro nas contas hoje." : ""}\n${link("painel", "Ver a memória de cálculo no Painel")}`, conf: 0.92, dados: `Saldo livre até ${ate}: caixa ${fmt(sl.caixa)} − comprometido ${fmt(sl.comprometido)} − reservas ${fmt(sl.prov)} = ${fmt(sl.livre)}; a receber ${fmt(sl.aReceber)}` };
    }
    const cs = e.conta ? [e.conta] : S.contas;
    const t = `${cs.map(c => `- **${c.nome}**: ${fmt(saldoConta(S, c))}${c.caixa ? "" : " (fora do caixa)"}`).join("\n")}\n\n${e.conta ? "" : `**Caixa disponível hoje: ${fmt(caixa(S))}** (soma das contas marcadas para entrar no caixa).\n`}O saldo é calculado: saldo inicial + receitas − despesas ± transferências lançadas até hoje. Se não bater com o banco, confira o saldo inicial em Configurações → Contas. ${link("ajustes/contas", "Abrir cadastro de contas")}`;
    return { texto: t, conf: 0.88, dados: cs.map(c => `${c.nome}: ${fmt(saldoConta(S, c))}`).join("; ") + `; caixa ${fmt(caixa(S))}` };
  };
  function linhasGasto(ym) { return gastosMes(S, ym).map(r => { const l = r.l, i = r.i; return { cat: r.cat || "Sem categoria", sub: (l || i).sub || "", valor: r.valor, desc: (l || i).desc, data: (l || i).data, resp: (l || i).resp, card: r.card ? r.card.id : null, conta: l ? l.conta : null, onde: r.card ? r.card.nome : (S.contas.find(c => c.id === (l || {}).conta) || {}).nome }; }); }
  function filtraGasto(rows, e) {
    return rows.filter(r => (!e.cat || (N(r.cat) === N(e.cat.cat) && (!e.cat.sub || N(r.sub) === N(e.cat.sub)))) && (!e.pessoa || r.resp === e.pessoa) && (!e.cartao || r.card === e.cartao.id) && (!e.conta || r.conta === e.conta.id) && (!e.termo || casaTermo(r.desc + " " + r.sub, e.termo)));
  }
  const descFiltro = e => [e.cat ? (e.cat.sub || e.cat.cat) : "", e.termo ? `"${e.termo}"` : "", e.pessoa ? "de " + e.pessoa : "", e.cartao ? "no " + e.cartao.nome : "", e.conta ? "em " + e.conta.nome : ""].filter(Boolean).join(" ");
  I.gastos = (e, q) => {
    const ym = e.mes || CUR, rows = filtraGasto(linhasGasto(ym), e), tot = sum(rows, r => r.valor), f = descFiltro(e);
    const ant = filtraGasto(linhasGasto(addYM(ym, -1)), e), totA = sum(ant, r => r.valor);
    if (!f) {
      const g = {}; rows.forEach(r => g[r.cat] = (g[r.cat] || 0) + r.valor);
      const cats = Object.entries(g).sort((a, b) => b[1] - a[1]);
      return { texto: `**Gastos de ${mesNome(ym)}: ${fmt(tot)}** (${rows.length} lançamentos; cartão pela fatura do mês, conta pela data).\n\n| Categoria | Valor | % |\n|---|---|---|\n${cats.slice(0, 12).map(([k, v]) => `| ${k} | ${fmt(v)} | ${tot ? Math.round(v / tot * 100) : 0}% |`).join("\n")}\n\nNo mês anterior foram ${fmt(totA)} (${totA ? (tot >= totA ? "+" : "−") + Math.abs(Math.round((tot - totA) / totA * 100)) + "%" : "sem base"}). ${link("analises", "Abrir Análises")}`, conf: 0.85, dados: `Gastos ${ym} total ${fmt(tot)}; por categoria: ${cats.map(([k, v]) => k + " " + fmt(v)).join("; ")}; mês anterior ${fmt(totA)}` };
    }
    let extra = "";
    if (e.termo && !rows.length) { const todos = S.lanc.filter(l => !l.excluido && l.tipo === "despesa" && casaTermo(l.desc + " " + (l.sub || ""), e.termo)); if (todos.length) extra = `\n\nEm todos os meses, "${e.termo}" aparece ${todos.length} vez${todos.length > 1 ? "es" : ""}, somando ${fmt(sum(todos, l => l.valor))}. Última: ${br(todos.sort((a, b) => a.data < b.data ? 1 : -1)[0].data)}.`; }
    return { texto: `**${f[0].toUpperCase() + f.slice(1)} em ${mesNome(ym)}: ${fmt(tot)}** (${rows.length} lançamento${rows.length === 1 ? "" : "s"})${rows.length ? "\n" + lista(rows.sort((a, b) => a.data < b.data ? 1 : -1), r => `- ${brs(r.data)} · ${r.desc} · ${r.onde || ""}: ${fmt(r.valor)}`, 10) : ""}\n\nNo mês anterior: ${fmt(totA)}.${extra}\n${link("lancamentos")}`, conf: rows.length || extra ? 0.86 : 0.7, dados: `Gastos ${f} em ${ym}: ${fmt(tot)} (${rows.length}); mês anterior ${fmt(totA)}; itens: ${rows.slice(0, 15).map(r => `${r.data} ${r.desc} ${fmt(r.valor)}`).join("; ")}` };
  };
  I.maiores = (e) => {
    const ym = e.mes || CUR, rows = filtraGasto(linhasGasto(ym), e).sort((a, b) => b.valor - a.valor);
    return { texto: `**Maiores gastos de ${mesNome(ym)}**${descFiltro(e) ? " (" + descFiltro(e) + ")" : ""}:\n${lista(rows, r => `- ${r.desc} · ${r.cat} · ${r.onde || ""}: **${fmt(r.valor)}**`, 10)}\n${link("analises", "Abrir Análises")}`, conf: 0.86, dados: rows.slice(0, 10).map(r => `${r.desc} ${r.cat} ${fmt(r.valor)}`).join("; ") };
  };
  I.receitas = (e) => {
    const ym = e.mes || CUR, cs = compromissos(S, ym, ym).filter(c => c.tipo === "receita" && c.status !== "cancelada"), rec = receitasMes(S, ym);
    return { texto: `**Receitas de ${mesNome(ym)}**\n- Já recebido: **${fmt(rec)}**\n- Previsto nas recorrências: ${fmt(sum(cs, c => c.valor))}, falta receber **${fmt(sum(cs.filter(ativo), c => Math.max(0, c.restante)))}**\n${cs.length ? lista(cs, c => `- ${br(c.venc)} · ${c.desc}: ${fmt(c.valor)} (${c.status})`) : ""}\n\nReceita prevista só entra no caixa depois de registrada como recebida (Contas a pagar → aba A receber). ${link("contas")}`, conf: 0.88, dados: `Receitas ${ym}: recebido ${fmt(rec)}; previstas ${cs.map(c => `${c.desc} ${fmt(c.valor)} ${c.status}`).join("; ")}` };
  };
  I.buscar = (e) => {
    if (!e.termo) return null;
    const ls = S.lanc.filter(l => !l.excluido && casaTermo(l.desc + " " + (l.sub || "") + " " + (l.obs || ""), e.termo) && (!e.mes || ymOf(l.data) === e.mes)).sort((a, b) => a.data < b.data ? 1 : -1);
    const ps = S.parc.filter(p => casaTermo(p.desc, e.termo));
    if (!ls.length && !ps.length) return { texto: `Não achei nenhum lançamento com "${e.termo}"${e.mes ? " em " + mesNome(e.mes) : ""}. Tente outra palavra da descrição (como aparece no extrato) ou use a busca no topo de Lançamentos. ${link("lancamentos")}`, conf: 0.72, dados: `Nenhum lançamento com "${e.termo}"` };
    return { texto: `${ls.length ? `**${ls.length} lançamento${ls.length > 1 ? "s" : ""} com "${e.termo}"**${e.mes ? " em " + mesNome(e.mes) : ""} · total ${fmt(sum(ls.filter(l => l.tipo === "despesa"), l => l.valor))}\n${lista(ls, l => `- ${br(l.data)} · ${l.desc} · ${onde(l)}: ${l.tipo === "receita" ? "+" : ""}${fmt(l.valor)}${l.tipo === "transferencia" ? " (transferência)" : ""}`, 10)}` : ""}${ps.length ? `\n\nParcelamentos:\n${lista(ps, p => `- ${br(p.data)} · ${p.desc} · ${(cardOf(S, p.cartao) || {}).nome}: ${fmt(p.total)} em ${p.n}×`)}` : ""}\n\n${link("lancamentos")}`, conf: 0.86, dados: ls.slice(0, 15).map(l => `${l.data} ${l.desc} ${l.tipo} ${fmt(l.valor)} ${onde(l)}`).join("; ") };
  };
  I.parcelas = (e) => {
    const at = S.parc.map(p => { const c = cardOf(S, p.cartao); if (!c) return null; const k0 = p.k0 || keyOf(c, p.data), k = ymDiff(k0, keyOf(c, TODAY)) + 1; if (k > p.n || (p.cancelDe && k >= p.cancelDe)) return null; const rest = p.n - Math.max(0, k - 1); return { p, c, k: Math.max(1, k), rest, fim: addYM(k0, p.n - 1), falta: rest * parcVal(p, 2) }; }).filter(Boolean)
      .filter(x => (!e.cartao || x.c.id === e.cartao.id) && (!e.termo || casaTermo(x.p.desc, e.termo)));
    if (!at.length) return { texto: `Nenhum parcelamento em andamento${e.termo ? ` com "${e.termo}"` : ""}${e.cartao ? " no " + e.cartao.nome : ""}. ${link("cartoes")}`, conf: 0.8, dados: "Sem parcelamentos ativos" };
    return { texto: `**${at.length} parcelamento${at.length > 1 ? "s" : ""} em andamento** · ainda vão cair **${fmt(sum(at, x => x.falta))}**\n\n| Compra | Cartão | Parcela | Valor | Última fatura |\n|---|---|---|---|---|\n${at.slice(0, 20).map(x => `| ${x.p.desc} | ${x.c.nome} | ${x.k}/${x.p.n} | ${fmt(parcVal(x.p, 2))} | ${ymLabel(x.fim)} |`).join("\n")}\n\n${link("cartoes")}`, conf: 0.88, dados: at.map(x => `${x.p.desc} ${x.c.nome} ${x.k}/${x.p.n} parcela ${fmt(parcVal(x.p, 2))} termina ${x.fim} falta ${fmt(x.falta)}`).join("; ") };
  };
  I.dividas = () => {
    if (!S.dividas.length) return { texto: `Nenhuma dívida cadastrada. ${link("dividas")}`, conf: 0.85, dados: "Sem dívidas" };
    const ds = S.dividas.map(d => ({ d, r: divResumo(S, d) }));
    const g = et => ds.filter(x => x.r.etapa === et);
    const neg = g("negociar"), pag = g("pagamento"), qt = g("quitada");
    let t = `**Dívidas**\n- A negociar (fora das contas): **${fmt(sum(neg, x => x.d.saldo))}** em ${neg.length}\n- Em pagamento: falta **${fmt(sum(pag, x => x.r.falta))}** em ${pag.length}\n- Quitadas: ${qt.length}\n`;
    if (neg.length) t += `\nA negociar:\n${lista(neg, x => `- ${x.d.nome} (${x.d.credor || "—"}): ${fmt(x.d.saldo)} · prioridade ${x.d.prioridade || "Média"}`)}`;
    if (pag.length) t += `\n\nEm pagamento:\n${lista(pag, x => `- ${x.d.nome}: ${x.r.pagas}/${x.d.total} pagas · falta ${fmt(x.r.falta)}${x.r.proxima ? ` · próxima ${br(x.r.proxima.venc)} (${fmt(x.r.proxima.restante)})` : ""}${x.r.atrasadas ? ` · **${x.r.atrasadas} atrasada(s)**` : ""}`)}`;
    t += `\n\nPara saber qual quitar primeiro, use o Planejador de quitação na tela Dívidas. ${link("dividas")}`;
    return { texto: t, conf: 0.88, dados: ds.map(x => `${x.d.nome} etapa ${x.r.etapa} saldo ${fmt(x.d.saldo)} falta ${fmt(x.r.falta)} parcela ${fmt(x.d.parcela || 0)} juros ${x.d.taxa ?? "?"}%`).join("; ") };
  };
  I.previsao = () => {
    const p = projecao(S, ui.varMes || 0), neg = p.meses.filter(m => m.fim < 0);
    let t = `**Previsão dos próximos 12 meses** (começando em ${fmt(p.inicio)}):\n\n| Mês | Entra | Sai | Saldo ao fim |\n|---|---|---|---|\n${p.meses.map(m => `| ${ymLabel(m.ym)} | ${fmt(m.rec)} | ${fmt(m.fixas + m.div + m.fat + m.variaveis)} | **${fmt(m.fim)}** |`).join("\n")}\n\n`;
    t += neg.length ? `⚠️ Fecha no negativo a partir de **${mesNome(neg[0].ym)}** (${fmt(neg[0].fim)}).` : "Nenhum mês fecha no negativo pelas contas conhecidas.";
    if (!ui.varMes) t += ` Atenção: o campo "Gastos variáveis estimados por mês" está zerado, então a previsão não conta as compras do dia a dia e fica otimista.`;
    t += `\n${link("planejamento")}`;
    return { texto: t, conf: 0.88, dados: "Projeção: " + p.meses.map(m => `${m.ym} receitas ${fmt(m.rec)} saídas ${fmt(m.fixas + m.div + m.fat + m.variaveis)} fim ${fmt(m.fim)}`).join("; ") + `; gastos variáveis estimados ${fmt(ui.varMes || 0)}` };
  };
  I.investimentos = () => {
    if (!S.invest.length) return { texto: `Nenhuma aplicação cadastrada. ${link("investimentos")}`, conf: 0.85 };
    const tot = sum(S.invest, i => investSaldo(i));
    return { texto: `**Patrimônio investido: ${fmt(tot)}** · rendimentos informados ${fmt(sum(S.invest, investRend))}\n${lista(S.invest, i => `- ${i.nome} (${i.tipo}): ${fmt(investSaldo(i))} · aportado ${fmt(investAportado(i))} · rendeu ${fmt(investRend(i))}`)}\n\nOs valores são informados por vocês (não há integração com corretoras). ${link("investimentos")}`, conf: 0.88, dados: S.invest.map(i => `${i.nome} ${fmt(investSaldo(i))}`).join("; ") };
  };
  I.recorrencias = (e, q) => {
    let rs = S.rec.filter(r => !r.fim || r.fim >= CUR);
    if (/assinatura/.test(q)) rs = rs.filter(r => /assinatura/i.test(norm(r.cat)) || /streaming|musica/i.test(norm(r.sub || "")));
    if (/\breceita|salario/.test(q)) rs = rs.filter(r => r.tipo === "receita"); else if (!/receita/.test(q)) rs = rs.filter(r => r.tipo === "despesa");
    if (!rs.length && /assinatura/.test(q)) { const ls = S.lanc.filter(l => !l.excluido && l.tipo === "despesa" && /assinatura/i.test(norm(l.cat || "")) && l.data >= addDays(TODAY, -70)); const u = {}; ls.sort((a, b) => a.data < b.data ? -1 : 1).forEach(l => u[N(l.desc)] = l); const us = Object.values(u); if (us.length) return { texto: `Não há assinaturas cadastradas como recorrência, mas estas cobranças de assinatura apareceram nos últimos 2 meses:\n${lista(us, l => `- ${l.desc} · ${onde(l)}: ${fmt(l.valor)} (última em ${br(l.data)})`)}\n\nTotal por mês: cerca de **${fmt(sum(us, l => l.valor))}**. ${link("lancamentos")}`, conf: 0.84, dados: us.map(l => l.desc + " " + fmt(l.valor)).join("; ") }; }
    if (!rs.length) return { texto: `Nenhuma recorrência desse tipo cadastrada. Cadastre em Contas a pagar → aba Recorrências. ${link("contas")}`, conf: 0.8 };
    return { texto: `**${rs.length} recorrência${rs.length > 1 ? "s" : ""}** · ${fmt(sum(rs, r => r.valor))} por mês\n${lista(rs, r => `- ${r.desc} · dia ${r.dia} · ${fmt(r.valor)}${r.natureza === "Variável" ? " (estimado)" : ""}${r.fim ? " · até " + ymLabel(r.fim) : ""}`, 20)}\n\nPara mudar: Contas a pagar → aba Recorrências → Editar. ${link("contas")}`, conf: 0.85, dados: rs.map(r => `${r.desc} ${fmt(r.valor)} dia ${r.dia}`).join("; ") };
  };
  I.comparar = (e) => {
    const b = e.mes || CUR, a = addYM(b, -1), ga = {}, gb = {};
    linhasGasto(a).forEach(r => ga[r.cat] = (ga[r.cat] || 0) + r.valor); linhasGasto(b).forEach(r => gb[r.cat] = (gb[r.cat] || 0) + r.valor);
    const ta = sum(Object.values(ga)), tb = sum(Object.values(gb));
    const dif = [...new Set([...Object.keys(ga), ...Object.keys(gb)])].map(k => [k, (gb[k] || 0) - (ga[k] || 0)]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
    return { texto: `**${mesNome(b)} × ${mesNome(a)}**: ${fmt(tb)} contra ${fmt(ta)} (${tb >= ta ? "+" : "−"}${fmt(Math.abs(tb - ta))}).\n\nO que mais mudou:\n${lista(dif.filter(d => d[1]), ([k, v]) => `- ${k}: ${v > 0 ? "+" : "−"}${fmt(Math.abs(v))} (${fmt(ga[k] || 0)} → ${fmt(gb[k] || 0)})`, 8)}\n\nReceitas: ${fmt(receitasMes(S, a))} → ${fmt(receitasMes(S, b))}. ${link("analises", "Abrir Análises")}`, conf: 0.86, dados: `Gastos ${a} ${fmt(ta)} vs ${b} ${fmt(tb)}; diferenças: ${dif.slice(0, 10).map(([k, v]) => k + " " + fmt(v)).join("; ")}` };
  };
  I.duplicados = () => {
    let n = null; try { n = typeof gruposDuplicados === "function" ? gruposDuplicados().length : null; } catch (x) {}
    return { texto: `${n === null ? "" : n ? `**Há ${n} grupo${n > 1 ? "s" : ""} de lançamentos que parecem duplicados** (mesmo cartão ou conta, mesma data e mesmo valor). ` : "**Nenhum lançamento parece duplicado** agora. "}Na importação, o app compara cada linha com o que já existe e com os outros arquivos do mesmo lote; o que já está registrado aparece como "Já registrado" e não grava de novo. Para revisar, vá em Importar → "Revisar duplicados". ${link("importar")}`, conf: 0.85, dados: `grupos duplicados: ${n}` };
  };
  I.auditoria = (e) => {
    const as = S.audit.filter(a => (!e.pessoa || a.user === e.pessoa) && (!e.termo || casaTermo(a.alvo + " " + a.acao + " " + (a.det || ""), e.termo))).slice(0, 12);
    return { texto: `${as.length ? `Últimas alterações${e.pessoa ? " de " + e.pessoa : ""}${e.termo ? ` sobre "${e.termo}"` : ""}:\n${lista(as, a => `- ${String(a.ts).slice(8, 10)}/${String(a.ts).slice(5, 7)} ${String(a.ts).slice(11, 16)} · **${a.user}** · ${a.acao}: ${a.alvo}${a.det ? " (" + a.det + ")" : ""}`)}` : "Não achei alterações com esse filtro."}\n\nO histórico completo fica em Configurações → Auditoria. ${link("ajustes/auditoria", "Abrir Auditoria")}`, conf: 0.85, dados: as.map(a => `${a.ts} ${a.user} ${a.acao} ${a.alvo}`).join("; ") };
  };
  I.importacoes = () => {
    const is = S.importacoes.slice(0, 5);
    return { texto: is.length ? `Últimas importações:\n${lista(is, i => `- ${i.id} · ${br(String(i.data).slice(0, 10))} · ${i.user}: ${i.arquivos} → ${i.incl} incluídos, ${i.vinc} vinculados, ${i.ign} ignorados`)}\n${link("importar")}` : `Nenhuma importação ainda. ${link("importar")}`, conf: 0.85, dados: is.map(i => `${i.id} ${i.data} ${i.arquivos}`).join("; ") };
  };
  I.tela = (e, q, ctx) => {
    const v = ui.view, nome = NOME_VIEW[v] || v, kb = buscaKB(nome + " " + (ctx.ocr || ""), "", 6);
    const daTela = kb.itens.filter(x => x.c.view === v || x.c.secao.startsWith(nome)).slice(0, 4);
    return { texto: `**Tela ${nome}**\n\n${(daTela.length ? daTela : kb.itens.slice(0, 3)).map(x => limpaMd(x.c.texto)).join("\n\n")}\n\nPergunte sobre qualquer número ou campo dela que eu explico.`, conf: 0.8, dados: "", trechos: daTela.map(x => x.c) };
  };
  I.resumo = (e) => {
    const c = I.corte({ mes: CUR }, ""), sl = saldoLivre(S, mk(CUR, 31)), venc = I.vencidas();
    return { texto: `**Como estamos hoje (${br(TODAY)})**\n- Dinheiro nas contas: **${fmt(sl.caixa)}**\n- Saldo livre até o fim do mês: **${fmt(sl.livre)}**\n- Em aberto nos cartões: ${fmt(sum(S.cartoes, k => cardResumo(S, k).deve))}\n- ${venc.texto.split("\n")[0].replace(/\*\*/g, "")}\n\n${c.texto}`, conf: 0.85, dados: c.dados };
  };
  I.saudacao = (e, q) => ({ texto: /obrigad|valeu|brigad/.test(q) ? "Por nada! Se surgir outra dúvida, é só chamar. 😊" : `Oi, ${(ME.nome || "").split(" ")[0]}! Pode perguntar sobre qualquer número, tela ou campo do Caixa. Por exemplo: "o que falta pagar este mês?", "quanto está a fatura do ${(S.cartoes[0] || { nome: "cartão" }).nome}?" ou "como lanço uma compra parcelada?".`, conf: 0.95, dados: "" });

  // ---------- quem responde ----------
  // [intenção, padrões (texto já normalizado), peso]
  const REGRAS = [
    ["saudacao", [/^(oi|ola|bom dia|boa tarde|boa noite|e ai|obrigad\w*|valeu|brigad\w*)[ !.?]*$/]],
    ["tela", [/\b(esta|essa|nesta|nessa) (tela|pagina)\b/, /o que (estou|to|eu estou) vendo/, /explica\w* (a |esta |essa )?tela/]],
    ["vencidas", [/\bvencid[ao]s?\b/, /\batrasad[ao]s?\b/, /\bem atraso\b/]],
    ["proximas", [/\b(o que|quais?|que contas?|contas?) (vence|vencem|vai vencer)\b/, /\bproxim[ao]s? (contas?|vencimentos?|compromissos?|pagamentos?)\b/, /\bvence(m)? (hoje|amanha|essa semana|esta semana)\b/]],
    ["qualFatura", [/\b(qual|em que|que) fatura\b.*\b(cai|entra|vai)\b/, /\b(cai|entra|vai) (em|na|para) (qual|que) fatura\b/, /\bcompra (de|feita|hoje).*\bfatura\b/]],
    ["limite", [/\blimite\b/, /\bdisponivel (no|do) cartao\b/]],
    ["fatura", [/\bfaturas?\b/, /\b(quanto|qual) (esta|ta|vai|deu|ficou)? ?(o|no)? ?cartao\b/]],
    ["saldo", [/\bsaldo livre\b/, /\b(saldo|saldos)\b(?!.*\bdivida)/, /\bquanto (tem|tenho|temos) (na|nas|em) conta/, /\bdinheiro (em|nas) conta/, /\bcaixa\b/]],
    ["corte", [/\b(falta|faltam|ainda) (pagar|para pagar)\b/, /\b(tenho|temos|preciso|precisamos) (que |de )?pagar\b/, /\bcontas? (do|deste|desse|de) (mes|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/, /\bo que (pagar|tem pra pagar|tem para pagar)\b/, /\b(vai|vamos|quanto vai) sobrar\b/, /\bsobra\b/, /\bcorte\b/, /\b(entra|entrada).*\b(sai|saida)\b/, /\bquanto (pagar|pago) (esse|este|no) mes\b/]],
    ["receitas", [/\b(receitas?|salarios?|renda)\b/, /\bquanto (entra|entrou|recebemos|vamos receber|vou receber|recebi)\b/]],
    ["previsao", [/\b(negativo|previsao|projecao|proximos meses|proximos 12)\b/, /\bvai faltar\b/, /\bfechar (o ano|no vermelho)\b/]],
    ["maiores", [/\bmaior(es)? (gastos?|despesas?|compras?)\b/, /\bonde (mais )?(gastamos|gastei|gasto)\b/, /\bgastamos mais\b/]],
    ["comparar", [/\bcompar\w*\b/, /\b(aumentou|diminuiu|subiu|caiu)\b.*\b(gasto|despesa|mes)/, /\b(gastamos|gastei) mais (que|do que)\b/]],
    ["parcelas", [/\bparcel\w*\b/, /\bquando (acaba|termina)\b/, /\bprestac\w*\b/]],
    ["dividas", [/\bdividas?\b/, /\bemprestimos?\b/, /\b(quitar|negociar)\b/]],
    ["investimentos", [/\binvest\w*\b/, /\b(rendimento|rendeu|aplicac\w*|tesouro|cdb|previdencia)\b/]],
    ["recorrencias", [/\b(contas? fixas?|recorrenc\w*|assinaturas?|mensalidades?)\b/]],
    ["duplicados", [/\b(duplicad\w*|duplicidade|repetid\w*|em dobro|lancou duas vezes|duas vezes)\b/]],
    ["auditoria", [/\bquem (alterou|mudou|excluiu|apagou|lancou|editou|fez|criou)\b/, /\b(historico de alteracoes|auditoria)\b/]],
    ["importacoes", [/\bultima(s)? importac\w*\b/, /\bhistorico de importac\w*\b/]],
    ["resumo", [/\b(resumo|como estamos|situacao|panorama|visao geral)\b/]],
    ["gastos", [/\b(gast\w*|despesas?|consumo)\b/, /\bquanto (foi|deu|saiu) (de|com|no|na)\b/, /\bquanto (pagamos|paguei|pagou) (de|no|na|com)\b/]],
    ["buscar", [/\bquando (paguei|pagamos|comprei|compramos|foi)\b/, /\b(procura|procurar|achar|acha|encontra|encontrar|busca|buscar)\b/, /\btem (algum|alguma) (lancamento|compra|pagamento)\b/]],
  ];
  const COMO = /^(por que|porque|pq|como|onde|aonde|pra que|para que|para q|o que (e|eh|sao|significa|quer dizer)|qual a diferenca|qual e a diferenca|posso|da pra|da para|consigo|tem como|e possivel|existe|porque|por que|pq|explica|o campo|oque e)\b/;
  const VERBO_USO = /\b(lanc|cadastr|registr|import|exclu|apag|edit|alter|mud|corrig|cri|configur|coloc|adicion|tir|instal|convid|desfaz|cancel|reabr|quit|negoci|decid|transfer|anex|usar|uso|funciona|serve|significa|fazer|faco|faz)\w*/;

  function entidades(q, ctx) {
    const e = { mes: achaMes(q), data: achaData(q), cartao: achaCartao(q), conta: null, cat: achaCategoria(q), pessoa: achaPessoa(q) };
    if (!e.cartao) e.conta = achaConta(q);
    e.termo = achaTermo(q, e);
    return e;
  }
  function responder(pergunta, ctx = {}) {
    const q = N(pergunta);
    if (!q && !ctx.ocr) return { texto: "Escreva sua pergunta.", conf: 1 };
    const e = entidades(q, ctx);
    // intenção pelos padrões
    let intent = null;
    for (const [nome, pads] of REGRAS) if (pads.some(p => p.test(q))) { intent = nome; break; }
    const comoUso = /^(por que|porque|pq)\b/.test(q) || COMO.test(q) && VERBO_USO.test(q) || /^(onde|aonde) (fica|encontro|acho|vejo|esta|estao|vejo)\b/.test(q) || /^(pra|para) (que|q) serve/.test(q) || /^o que (e|eh|sao|significa)\b/.test(q) || /\bqual a diferenca\b/.test(q) || /^(como) (eu |a gente |faco|faz|lanco|cadastro|pago|registro|importo|excluo|edito|mudo|altero|crio|vejo|uso|funciona|configuro|coloco|adiciono|tiro|acho|encontro|instalo|convido|desfaco|cancelo|transfiro|anexo)/.test(q);
    // continuação ("e no mês passado?", "e do nubank?"): repete a última intenção com as novas informações
    if (!intent && !comoUso && ctx.ultimo && ctx.ultimo.intent && /^(e|e no|e na|e do|e da|e em|e o|e a|e para|e pra|agora)\b/.test(q) && (e.mes || e.cartao || e.cat || e.pessoa || e.data || e.conta)) {
      intent = ctx.ultimo.intent; const u = ctx.ultimo.ent || {};
      for (const k of ["mes", "cartao", "cat", "pessoa", "conta", "termo", "data"]) if (e[k] == null && u[k] != null && !(k === "termo")) e[k] = u[k];
    }
    if (!intent && !comoUso && e.cartao && /\b(quanto|qual|valor|total)\b/.test(q)) intent = "fatura";
    if (!intent && !comoUso && e.cat && /\b(quanto|total|valor)\b/.test(q)) intent = "gastos";
    if (!intent && !comoUso && e.termo && /^(quanto|quando)\b/.test(q)) intent = /^quando/.test(q) ? "buscar" : "gastos";

    const kb = buscaKB(pergunta, ctx.ocr || "", 5);
    const kbConf = kb.itens.length ? Math.min(0.92, 0.3 + 0.62 * kb.cobertura + Math.min(0.12, kb.score / 60)) : 0;
    let r = null;
    if (intent && !(comoUso && intent !== "tela" && intent !== "saudacao")) { try { r = I[intent](e, q, ctx); } catch (err) { console.error("Alícia local", intent, err); r = null; } }
    if (r && intent === "buscar" && !r.texto) r = null;
    if (!r || (comoUso && kbConf > 0.45)) {
      if (kb.itens.length) {
        const t0 = kb.itens[0], top = t0.c, faq = /perguntas frequentes/i.test(top.secao);
        const mesmos = faq ? [] : kb.itens.filter(x => x !== t0 && x.c.secao === top.secao && x.s >= t0.s * 0.7).slice(0, 2);
        const outros = [...new Set(kb.itens.filter(x => x.c.secao !== top.secao && !/perguntas frequentes/i.test(x.c.secao)).map(x => x.c.secao))].slice(0, 2);
        const v = faq ? viewDoTexto(top.texto) : top.view || viewDoTexto(top.texto);
        const corpo = [top, ...mesmos.map(x => x.c)].map(formataTrecho).join("\n\n");
        const tx = `${faq ? "" : `**${top.secao}**\n\n`}${corpo}${v ? `\n\n${link(v, "Abrir " + (NOME_VIEW[v.split("/")[0]] || v) + (v.includes("/") ? " › " + ({ contas: "Contas", cartoes: "Cartões", categorias: "Categorias", regras: "Regras", pessoas: "Pessoas e acesso", seguranca: "Segurança", dados: "Backup e dados", auditoria: "Auditoria" }[v.split("/")[1]] || v.split("/")[1]) : ""))}` : ""}${outros.length ? `\n\nVeja também: ${outros.map(x => "*" + x + "*").join(" · ")}` : ""}`;
        const rk = { texto: tx, conf: kbConf, intent: "manual", trechos: kb.itens.map(x => x.c) };
        if (!r || rk.conf >= (r.conf || 0) - 0.1) r = rk;
      }
    }
    if (!r) r = { texto: "", conf: 0 };
    // pedido de opinião/estratégia: os números ajudam, mas a resposta pede raciocínio (IA, se ligada)
    if (/\b(vale a pena|devo|deveria|compensa|recomenda\w*|qual (a )?melhor|o que (voce|vc) (acha|sugere|recomenda)|sugest\w*|dica|dicas|conselho|estrateg\w*|economizar|reduzir|cortar gastos|ajuda a planejar)\b/.test(q)) { r.conf = Math.min(r.conf, 0.5); r.opiniao = true; }
    r.intent = r.intent || intent; r.ent = e;
    r.trechos = r.trechos || kb.itens.map(x => x.c);
    if (ctx.ocr && r.conf < 0.85) r.conf = Math.min(r.conf, 0.6); // com imagem, a IA (se ligada) entende melhor
    return r;
  }
  const sugestoesFalha = () => ["O que falta pagar este mês?", "Quanto está a fatura de cada cartão?", "Quanto gastamos com mercado em " + MESL[+CUR.slice(5) - 1] + "?", "Como lanço uma compra parcelada?", "Onde vejo quem alterou um lançamento?"];

  // resumo compacto (só números, sem descrições de compras) para a IA gratuita entender a situação
  function resumoBase() {
    const sl = saldoLivre(S, mk(CUR, 31)), m = corte(CUR);
    return [`Hoje ${br(TODAY)}. Tela aberta: ${NOME_VIEW[ui.view] || ui.view}.`,
      `Caixa hoje ${fmt(sl.caixa)}; saldo livre até ${br(mk(CUR, 31))} ${fmt(sl.livre)} (comprometido ${fmt(sl.comprometido)}, reservas ${fmt(sl.prov)}, a receber ${fmt(sl.aReceber)}).`,
      `Mês ${CUR}: entra ${fmt(m.entra)}, sai ${fmt(m.sai)}, já pago ${fmt(m.pago)}, falta pagar ${fmt(m.falta)}, resultado ${fmt(m.resultado)}.`,
      `Cartões: ${S.cartoes.map(c => { const r = cardResumo(S, c); return `${c.nome} (fecha dia ${c.fecha}, vence dia ${c.vence}) fatura atual ${r.atual.key} total ${fmt(r.atual.total)} falta ${fmt(r.atual.saldo)}, em aberto ${fmt(r.deve)}, limite ${fmt(c.limite)}`; }).join("; ") || "nenhum"}.`,
      `Contas: ${S.contas.map(c => `${c.nome} ${fmt(saldoConta(S, c))}`).join("; ") || "nenhuma"}.`,
      `Dívidas: ${S.dividas.map(d => `${d.nome} (${divEtapa(d)}) ${fmt(d.saldo || 0)}`).join("; ") || "nenhuma"}.`,
      `Gastos variáveis estimados por mês: ${fmt(ui.varMes || 0)}.`].join("\n");
  }

  window.AliciaLocal = { responder, buscaKB, resumoBase, sugestoesFalha, _N: N, _ent: q => entidades(N(q), {}) };
})();
