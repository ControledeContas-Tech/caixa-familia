// ================= IMPORTAÇÃO: leitura de CSV e OFX + análise contra o que já existe =================
// Funções puras: recebem texto e o estado, devolvem propostas. Nada é gravado aqui.

const IMP_PEND = ["dup", "parc"]; // situações que exigem decisão antes de gravar
const IMP_GRAVA = ["ok", "keep", "parcok", "avista", "comp", "estorno"];

function parseDataBR(s) {
  s = String(s || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${pad(+m[2])}-${pad(+m[1])}`; }
  m = s.match(/^(\d{4})(\d{2})(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
// valor com sinal, em centavos: "1.234,56", "-12.34", "R$ -1.234,56", "(12,34)", "12,34 D"
function parseValor(s) {
  s = String(s ?? "").trim(); if (!s) return NaN;
  let neg = /^\(.*\)$/.test(s) || /-/.test(s) || /\bD$/i.test(s);
  s = s.replace(/[^\d,.]/g, "");
  if (!s) return NaN;
  const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
  if (lc > ld) s = s.replace(/\./g, "").replace(",", ".");
  else if (ld > lc && lc >= 0) s = s.replace(/,/g, "");
  else if (lc === -1 && ld >= 0 && s.length - ld - 1 === 3 && s.split(".").length > 2) s = s.replace(/\./g, "");
  const v = Math.round(Number(s) * 100);
  return isFinite(v) ? (neg ? -v : v) : NaN;
}
function splitCSV(linha, sep) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (q) { if (ch === '"' && linha[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out.map(c => c.trim());
}
function parseCSV(texto) {
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim());
  if (!linhas.length) return { itens: [], erro: "Arquivo vazio." };
  const sep = [";", ",", "\t"].map(s => [s, splitCSV(linhas[0], s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = linhas.map(l => splitCSV(l, sep));
  const cab = rows[0].map(h => norm(h));
  const acha = re => cab.findIndex(h => re.test(h));
  let iData = acha(/^(DATA|DATE|DT)\b|DATA (DA )?(COMPRA|LANC|TRANS|MOV)/), iDesc = acha(/DESCRI|TITLE|HISTOR|LANCAMENTO|ESTABELEC|MEMO|DETALHE/), iVal = acha(/^VALOR|AMOUNT|VALUE|QUANTIA|VALOR \(R\$\)/);
  let corpo = rows.slice(1);
  if (iData < 0 || iVal < 0) { // sem cabeçalho reconhecível: adivinha pelas colunas
    corpo = rows; const r0 = rows[0];
    iData = r0.findIndex(c => parseDataBR(c)); iVal = r0.findIndex((c, i) => i !== iData && /\d/.test(c) && !isNaN(parseValor(c)) && !parseDataBR(c));
    iDesc = r0.findIndex((c, i) => i !== iData && i !== iVal && /[a-z]/i.test(c));
    if (iData < 0 || iVal < 0) return { itens: [], erro: "Não reconheci as colunas de data e valor neste CSV." };
  }
  if (iDesc < 0) iDesc = rows[0].findIndex((_, i) => i !== iData && i !== iVal);
  const iId = acha(/IDENTIFICADOR|^ID$|FITID|DOCUMENTO/);
  const itens = []; let ignorados = 0;
  for (const r of corpo) {
    const d = parseDataBR(r[iData]), v = parseValor(r[iVal]);
    if (!d || isNaN(v) || v === 0) { ignorados++; continue; }
    itens.push({ d, desc: (r[iDesc] || "").replace(/\s+/g, " ").trim() || "(sem descrição)", vs: v, fitid: iId >= 0 ? r[iId] || null : null });
  }
  return { itens, ignorados, colunas: { data: rows[0][iData], descricao: rows[0][iDesc], valor: rows[0][iVal] } };
}
function parseOFX(texto) {
  const tag = (bloco, t) => { const m = bloco.match(new RegExp("<" + t + ">([^<\\r\\n]*)", "i")); return m ? m[1].trim() : ""; };
  const blocos = texto.split(/<STMTTRN>/i).slice(1).map(b => b.split(/<\/STMTTRN>/i)[0]);
  const itens = blocos.map(b => {
    const d = parseDataBR(tag(b, "DTPOSTED")), v = parseValor(tag(b, "TRNAMT").replace(",", "."));
    const nome = tag(b, "NAME"), memo = tag(b, "MEMO");
    return { d, desc: (memo && nome && !norm(memo).includes(norm(nome)) ? nome + " " + memo : memo || nome || "(sem descrição)").replace(/\s+/g, " "), vs: v, fitid: tag(b, "FITID") || null };
  }).filter(i => i.d && !isNaN(i.vs) && i.vs !== 0);
  return { itens, cartao: /<CCSTMTRS>/i.test(texto), banco: tag(texto, "ORG") || tag(texto, "BANKID"), conta: tag(texto, "ACCTID") };
}
// ---------- print / foto de fatura ou extrato (texto vindo do reconhecimento de imagem) ----------
const BANCOS_IMG = [["NUBANK", "Nubank"], ["NU PAGAMENTOS", "Nubank"], ["ITAU", "Itaú"], ["ITAUCARD", "Itaú"], ["BRADESCO", "Bradesco"], ["SANTANDER", "Santander"], ["BANCO INTER", "Inter"], ["INTER ", "Inter"], ["C6 BANK", "C6"], ["C6 ", "C6"], ["CAIXA", "Caixa"], ["BANCO DO BRASIL", "Banco do Brasil"], ["OUROCARD", "Banco do Brasil"], ["CARREFOUR", "Carrefour"], ["CASAS BAHIA", "Casas Bahia"], ["PERNAMBUCANAS", "Pernambucanas"], ["MERCADO PAGO", "Mercado Pago"], ["PICPAY", "PicPay"], ["NEON", "Neon"], ["BANCO PAN", "Pan"], ["XP ", "XP"], ["BTG", "BTG"], ["SICREDI", "Sicredi"], ["SICOOB", "Sicoob"], ["WILL BANK", "Will Bank"], ["PORTO SEGURO", "Porto Seguro"], ["RIACHUELO", "Riachuelo"], ["RENNER", "Renner"], ["AMERICANAS", "Americanas"], ["MAGALU", "Magalu"], ["MAGAZINE LUIZA", "Magalu"]];
const MESES_IMG = { JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6, JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12 };
// linhas de resumo da fatura/extrato que não são lançamentos
const RESUMO_IMG = /\b(TOTAL|SALDO|LIMITE|PAGAMENTO MINIMO|VALOR MINIMO|MINIMO|VENCIMENTO|VENCE EM|FECHAMENTO|FECHA EM|FATURA ATUAL|FATURA FECHADA|FATURA ABERTA|VALOR DA FATURA|PROXIMA FATURA|JUROS|ENCARGOS|IOF|CET|DISPONIVEL|PARCELAR FATURA|RESUMO)\b/;
function anoProvavel(m, d, hoje) {
  const [hy, hm] = hoje.split("-").map(Number);
  let y = hy; if (m > hm + 1) y--; // print de fatura: datas futuras distantes são do ano anterior
  return `${y}-${pad(m)}-${pad(d)}`;
}
function dataDaLinha(L, hoje) {
  let m = L.match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);
  if (m) { const d = +m[1], mm = +m[2]; if (d >= 1 && d <= 31 && mm >= 1 && mm <= 12) { const iso = m[3] ? `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(mm)}-${pad(d)}` : anoProvavel(mm, d, hoje); return { iso, resto: L.slice(m[0].length) }; } }
  m = L.match(/^(?:[A-Z]{3,9},?\s+)?(\d{1,2})\s*(?:DE\s+)?(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z]*\.?(?:\s*(?:DE\s+)?(\d{4}))?/);
  if (m) { const d = +m[1], mm = MESES_IMG[m[2]]; if (d >= 1 && d <= 31) return { iso: m[3] ? `${m[3]}-${pad(mm)}-${pad(d)}` : anoProvavel(mm, d, hoje), resto: L.slice(m.index + m[0].length) }; }
  if (/^HOJE\b/.test(L)) return { iso: hoje, resto: L.replace(/^HOJE\b/, "") };
  if (/^ONTEM\b/.test(L)) { const t = new Date(hoje + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() - 1); return { iso: t.toISOString().slice(0, 10), resto: L.replace(/^ONTEM\b/, "") }; }
  return null;
}
// valor no formato brasileiro (exige vírgula com 2 casas para não confundir com datas e parcelas)
const VALOR_IMG = /([+\-−–—](?=R|\d))?(?:R\s?\$\s*)?([+\-−–—](?=\d))?(?<![\d\/])(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/g;
// data em qualquer lugar da linha (dd/mm/aaaa, dd/mm/aa ou dd/mm)
const DATA_IMG = /(?<![\d\/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d\/])/g;
// parcela "07/08", "Parcela 2 de 10", "Parc 3/12" (sem ano: não é data)
const PARC_IMG = /(?:\bPARCELA\s*|\bPARC\.?\s*)?(?<![\d\/])(\d{1,2})\s*(?:\/|\bDE\b)\s*(\d{1,2})(?![\d\/])/g;
// parcela escrita de vários jeitos: "07/08", "7 de 8", "07-08", "7x8", "parcela 7 de 8", "parc. 07/08"
function lerParcela(t) {
  const m = norm(String(t || "")).match(/(?:PARCELA|PARC\.?)?\s*(\d{1,2})\s*(?:\/|\bDE\b|-|X|\s)\s*(\d{1,2})\b/);
  if (!m) return null; const k = +m[1], n = +m[2];
  return k >= 1 && n >= 2 && n <= 48 && k <= n ? { k, n } : null;
}
// "Parcela 1 de 2", "Parc 01/02" com a palavra parcela (vale em qualquer lugar da linha)
const PARC_PALAVRA = /\b(?:PARCELA|PARC\.?)\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/;
const isoDe = (d, m, y, hoje) => y ? `${y.length === 2 ? "20" + y : y}-${pad(+m)}-${pad(+d)}` : anoProvavel(+m, +d, hoje);
const dataValida = (d, m) => +d >= 1 && +d <= 31 && +m >= 1 && +m <= 12;
function limpaDesc(t) {
  return String(t || "").replace(/\*\s+/g, "*").replace(/\bR\s?\$\s*/gi, " ").replace(/(?<![\d\/])\d{1,2}\/\d{1,2}\/(\d{4}|\d{2})(?![\d\/])/g, " ")
    .replace(/[|]+/g, " ").replace(/\s+/g, " ").replace(/^[\s\-–—−•·:.,;]+|[\s\-–—−•·:.,;+]+$/g, "").replace(/\s+[\-–—−]\s*$/, "").trim();
}
function lerTextoImagem(texto, hoje = TODAY) {
  const brutas = String(texto || "").split(/\r?\n/).map(l => l.replace(/[_“”"'`~]+/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const N = norm(brutas.join(" \n "));
  const NB = N.replace(/\b[A-Z0-9]{2,}\s?\*\s?\S*/g, " "); // "PICPAY*LOJA", "MP *LOJA" são lojas, não o banco do cartão
  const banco = (BANCOS_IMG.find(([k]) => (" " + NB + " ").includes(" " + k)) || [])[1] || null;
  const cartao = /FATURA|CARTAO|LIMITE (DISPONIVEL|TOTAL)|FINAL \d{4}|VENCIMENTO|PARCELA/.test(N);
  const itens = []; let dataAtual = null, descPend = "", ignorados = 0, ultimaLinhaItem = false;
  for (const bruta of brutas) {
    const L0 = norm(bruta), B = bruta.length === L0.length ? bruta : L0; // mesmo comprimento: dá para recortar o texto original
    const dt = dataDaLinha(L0, hoje);
    const ini = dt ? L0.length - dt.resto.length : 0;
    const L = L0.slice(ini);
    const valores = [...L.matchAll(VALOR_IMG)];
    if (!valores.length) {
      // "Parcela 2/10" na linha de baixo do valor: pertence à compra anterior
      const pm = L.trim().match(/^(?:PARCELA|PARC\.?)?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})(?:\s*PARCELAS?)?$/);
      if (!dt && pm && itens.length && ultimaLinhaItem && !itens[itens.length - 1].parc && +pm[1] >= 1 && +pm[1] <= +pm[2] && +pm[2] >= 2) { itens[itens.length - 1].parc = { k: +pm[1], n: +pm[2] }; ultimaLinhaItem = false; continue; }
      ultimaLinhaItem = false;
      if (dt && !L.replace(/[^A-Z]/g, "")) { dataAtual = dt.iso; descPend = ""; continue; } // cabeçalho de dia ("20 OUT")
      if (dt) dataAtual = dt.iso;
      if (RESUMO_IMG.test(L) || /\b(DATA|ESTABELECIMENTO|DESCRICAO|HISTORICO|LANCAMENTO)\b.*\b(VALOR|PARCELA)\b/.test(L)) { descPend = ""; continue; } // resumo ou cabeçalho de tabela
      if (/[A-Z]{3,}/.test(L)) descPend = (descPend && descPend.length < 40 && !dt ? descPend + " " : "") + limpaDesc(B.slice(ini));
      continue;
    }
    if (RESUMO_IMG.test(L) && !/[A-Z]{3,}.*\d{1,2}\/\d{1,2}/.test(L.replace(RESUMO_IMG, ""))) { descPend = ""; ignorados++; continue; }
    { const pw = L.match(PARC_PALAVRA), ult = itens[itens.length - 1];
      if (pw && !dt && ult && ultimaLinhaItem && !ult.parc && !/[A-Z]{4,}/.test(L.replace(PARC_PALAVRA, "").replace(/\b(DE|EM|R)\b/g, "")) && +pw[1] >= 1 && +pw[2] >= 2 && +pw[1] <= +pw[2]) { ult.parc = { k: +pw[1], n: +pw[2] }; ultimaLinhaItem = false; continue; } }
    const vm = valores[valores.length - 1];
    const v = parseValor(vm[3]); if (!(v > 0)) { ignorados++; continue; }
    const antes = L.slice(0, vm.index), depois = L.slice(vm.index + vm[0].length);
    const sinal = vm[1] || vm[2] || ""; // só vale sinal colado no valor ("−R$ 800,00", "-150,00"); "— R$" é borda de tabela
    const neg = /[\-−–—]/.test(sinal) || /\b(ESTORNO|CREDITO|PAGAMENTO RECEBIDO|DEVOLUCAO)\b/.test(L);
    // vencimento: data depois do valor (coluna "Vencimento") → fatura daquele mês
    let venc = null, parcDepois = null;
    const pwd = depois.match(PARC_PALAVRA); if (pwd && +pwd[1] >= 1 && +pwd[2] >= 2 && +pwd[1] <= +pwd[2]) parcDepois = { k: +pwd[1], n: +pwd[2] };
    for (const m of depois.matchAll(DATA_IMG)) {
      if (pwd && m.index >= pwd.index && m.index < pwd.index + pwd[0].length) continue;
      const pk = !m[3] && +m[1] >= 1 && +m[2] >= 2 && +m[2] <= 48 && +m[1] <= +m[2] ? { k: +m[1], n: +m[2] } : null;
      if (dataValida(m[1], m[2])) {
        const iso = isoDe(m[1], m[2], m[3], hoje), ref = (dt && dt.iso) || hoje, dif = (Date.parse(iso) - Date.parse(ref)) / 864e5;
        if (m[3] || !pk || (dif >= -5 && dif <= 75)) { if (!venc) venc = iso; continue; } // perto da compra: é o vencimento
      }
      if (pk && !parcDepois) parcDepois = pk; // "1/2" depois do valor que não pode ser vencimento: é a parcela
    }
    // compra: data no começo da linha; se não houver, uma data com ano antes da descrição
    let d = dt ? dt.iso : null;
    let antesB = B.slice(ini, ini + vm.index);
    if (!d) { const m = [...antes.matchAll(DATA_IMG)].find(x => x[3] && dataValida(x[1], x[2])); if (m) d = isoDe(m[1], m[2], m[3], hoje); }
    // parcela: último "k/n" sem ano antes do valor
    let parc = null;
    const pcs = [...antes.matchAll(PARC_IMG)].filter(m => +m[1] >= 1 && +m[2] >= 2 && +m[2] <= 48 && +m[1] <= +m[2]);
    if (pcs.length) { const m = pcs[pcs.length - 1]; parc = { k: +m[1], n: +m[2] }; antesB = antesB.slice(0, m.index) + " " + antesB.slice(m.index + m[0].length); }
    if (!parc && parcDepois) parc = parcDepois;
    let desc = limpaDesc(antesB);
    if (!/[A-Za-zÀ-ú]{2,}/.test(desc)) desc = descPend;
    if (!parc) { const pd = norm(desc).match(PARC_PALAVRA); if (pd && +pd[1] >= 1 && +pd[2] >= 2 && +pd[1] <= +pd[2]) { parc = { k: +pd[1], n: +pd[2] }; desc = limpaDesc(desc.replace(new RegExp(PARC_PALAVRA.source, "i"), " ")); } } // "Parcela 1 de 2" na linha de cima
    descPend = "";
    if (!d && !dt) d = dataAtual; // prints agrupados por dia ("20 OUT"); em tabela fica em branco para preencher
    if (!desc && !d) { ignorados++; continue; } // linha de total sem descrição
    itens.push({ d: d || "", desc: desc.slice(0, 120), vs: neg ? -v : v, fitid: null, parc, venc, fat: venc ? venc.slice(0, 7) : null });
    ultimaLinhaItem = true;
  }
  // vencimento da fatura escrito no documento ("Vencimento: 06/11/2026") → mês da fatura
  const vg = N.match(/VENCIMENTO[^0-9\n]{0,25}(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/);
  const vencimento = vg && dataValida(vg[1], vg[2]) ? isoDe(vg[1], vg[2], vg[3], hoje) : null;
  return { itens, ignorados, banco, cartao, vencimento, linhas: brutas.length };
}
function lerArquivo(nome, texto) {
  const ext = (nome.split(".").pop() || "").toLowerCase();
  if (ext === "ofx" || /<OFX>/i.test(texto.slice(0, 2000))) return { formato: "OFX", ...parseOFX(texto) };
  if (ext === "csv" || ext === "txt") return { formato: "CSV", ...parseCSV(texto) };
  return { formato: ext.toUpperCase(), itens: [], erro: "Leitura de " + ext.toUpperCase() + " (PDF e imagens) chega na próxima etapa. Por enquanto, exporte o extrato ou a fatura em CSV ou OFX no app do banco." };
}

// palavras significativas de uma descrição
const toks = s => norm(s).replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(w => w.length >= 3 && !/^\d+$/.test(w) && !["PARCELA", "PARC", "COMPRA", "PAG", "PGTO"].includes(w));
function parecido(a, b) { const A = toks(a), B = toks(b); if (!A.length || !B.length) return norm(a) === norm(b); const c = A.filter(w => B.some(x => x.startsWith(w) || w.startsWith(x))).length; return c / Math.min(A.length, B.length) >= 0.5; }
const diasEntre = (a, b) => Math.abs((Date.parse(a) - Date.parse(b)) / 864e5);
function achaParcela(desc) {
  const m = desc.match(/(?:PARCELA\s*|PARC\.?\s*)?\b(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\s*$/i) || desc.match(/PARCELA\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})/i);
  if (!m) return null; const k = +m[1], n = +m[2];
  return n >= 2 && n <= 48 && k >= 1 && k <= n ? { k, n, limpa: desc.replace(m[0], "").replace(/[-–\s]+$/, "").trim() } : null;
}
function faturaMaisProxima(S, card, valor) {
  const r = cardResumo(S, card); if (!r.abertas.length) return null;
  return [...r.abertas].sort((a, b) => Math.abs(a.saldo - valor) - Math.abs(b.saldo - valor))[0];
}

// analisa os itens lidos de um arquivo para um destino (conta ou cartão)
function analisar(S, itens, destino, faturaKey) {
  const card = cardOf(S, destino), conta = S.contas.find(c => c.id === destino);
  const desp = catsDespesa(S), outrasD = desp.includes("Outras despesas") ? "Outras despesas" : desp[0] || "", outrasR = catsReceita(S)[0] || "";
  const existentes = S.lanc.filter(l => !l.excluido && (card ? l.cartao === destino : l.conta === destino || l.destino === destino));
  const ativos = conta ? compromissos(S, addYM(CUR, -2), addYM(CUR, 1)).filter(c => ativo(c) && c.kind !== "fat" && c.restante > 0) : [];
  const usados = new Set();
  return itens.map(it => {
    const o = { d: it.d, desc: it.desc, v: Math.abs(it.vs), fitid: it.fitid, alvo: destino, st: "ok", note: "", tipo: "despesa", fat: card && it.fat ? it.fat : null };
    if (it.fitid && existentes.some(l => l.fitid === it.fitid)) return { ...o, st: "link", note: "Já importado antes (mesmo identificador do banco)" };
    const sug = sugerirCat(S, it.desc);
    if (card) {
      if (it.vs < 0) {
        if (/PAGAMENTO|PGTO|PAG FAT|PAGTO/i.test(norm(it.desc))) return { ...o, st: "skip", orig: "info", note: "Pagamento da fatura: é registrado a partir do extrato da conta" };
        const orig = existentes.find(l => l.tipo === "despesa" && l.valor === o.v && parecido(l.desc, it.desc));
        return { ...o, tipo: "estorno", st: "estorno", cat: orig ? orig.cat : sug ? sug.cat : outrasD, sub: orig ? orig.sub : "", estornoDe: orig ? orig.id : null, note: orig ? `Estorno da compra de ${brs(orig.data)}` : "Crédito na fatura (estorno), sem compra original encontrada" };
      }
      const pc = it.parc ? { k: it.parc.k, n: it.parc.n, limpa: it.desc } : achaParcela(it.desc);
      if (pc) {
        const ex = S.parc.find(p => p.cartao === destino && p.n === pc.n && Math.abs(parcVal(p, 2) - o.v) <= 1 && parecido(p.desc, pc.limpa || it.desc));
        if (ex) return { ...o, st: "link", note: `Parcela ${pc.k}/${pc.n} de “${ex.desc}” já projetada · não será recriada` };
        const base = it.fat || faturaKey || keyOf(card, it.d);
        return { ...o, st: "parc", n: pc.n, k: pc.k, desc: pc.limpa || it.desc, k0: addYM(base, -(pc.k - 1)), cat: sug ? sug.cat : outrasD, sub: sug ? sug.sub : "", note: `Parcela ${pc.k}/${pc.n} encontrada: cria parcelamento de ${pc.n} × ${fmt(o.v)} = ${fmt(o.v * pc.n)}, 1ª na fatura de ${ymLabel(addYM(base, -(pc.k - 1)))}` };
      }
      const dup = existentes.find(l => (l.tipo === "despesa") && l.valor === o.v && diasEntre(l.data, it.d) <= 2 && parecido(l.desc, it.desc));
      if (dup) return { ...o, st: "dup", cat: dup.cat, note: `Parecido com “${dup.desc}” de ${brs(dup.data)}, já registrado` };
      return { ...o, cat: sug && sug.cat !== "Transferência" ? sug.cat : outrasD, sub: sug ? sug.sub : "", note: [o.fat ? `Fatura de ${ymLabel(o.fat)}` : "", sug ? `Categoria pela regra “${sug.regra}”` : ""].filter(Boolean).join(" · ") };
    }
    // conta bancária
    const ehFatura = /PAG(AMENTO|TO)?\s*(DE\s*)?FAT|FATURA\s*CART|PGTO\s*CART/i.test(norm(it.desc)) || (sug && sug.cat === "Transferência");
    if (it.vs < 0 && ehFatura && S.cartoes.length) {
      const c = S.cartoes.find(k => norm(it.desc).includes(norm(k.inst))) || S.cartoes.find(k => k.pagaCom === destino) || S.cartoes[0];
      const jaPago = S.lanc.find(l => !l.excluido && l.tipo === "transferencia" && l.destino === c.id && l.valor === o.v && diasEntre(l.data, it.d) <= 3);
      if (jaPago) return { ...o, st: "link", tipo: "transferencia", cat: "Transferência", note: `Já registrado como pagamento da fatura ${c.nome}` };
      const f = faturaMaisProxima(S, c, o.v);
      return { ...o, tipo: "transferencia", cat: "Transferência", cartaoDestino: c.id, fatura: f ? f.key : keyOf(c, it.d), note: `Pagamento de fatura → transferência para ${c.nome}${f ? ", fatura de " + ymLabel(f.key) : ""}. Não conta como despesa.` };
    }
    const tipo = it.vs < 0 ? "despesa" : "receita";
    const dup = existentes.find(l => (l.tipo === tipo || l.tipo === "transferencia") && l.valor === o.v && diasEntre(l.data, it.d) <= 2 && (parecido(l.desc, it.desc) || l.tipo === "transferencia"));
    if (dup) return { ...o, tipo, st: "dup", cat: dup.cat || "", note: `Parecido com “${dup.desc}” de ${brs(dup.data)}, já registrado` };
    const comp = ativos.find(c => !usados.has(c.key) && c.tipo === tipo && (c.restante === o.v || (c.estimado && Math.abs(c.restante - o.v) <= c.restante * 0.2)) && diasEntre(c.venc, it.d) <= 6);
    if (comp) { usados.add(comp.key); return { ...o, tipo, st: "comp", comp: comp.key, cat: comp.cat, sub: comp.sub, note: `${tipo === "receita" ? "Recebe" : "Quita"} “${comp.desc}” (previsto ${fmt(comp.restante)}, vence ${brs(comp.venc)})` }; }
    const cats = tipo === "receita" ? catsReceita(S) : desp;
    return { ...o, tipo, cat: sug && cats.includes(sug.cat) ? sug.cat : tipo === "receita" ? outrasR : outrasD, sub: sug ? sug.sub : "", note: sug && cats.includes(sug.cat) ? `Categoria pela regra “${sug.regra}”` : "" };
  });
}
const catsDespesa = S => S.categorias.filter(c => c[1] !== "receita").map(c => c[0]);
const catsReceita = S => S.categorias.filter(c => c[1] === "receita").map(c => c[0]);

if (typeof module !== "undefined") module.exports = { lerParcela, lerTextoImagem, dataDaLinha, parseCSV, parseOFX, parseValor, parseDataBR, lerArquivo, analisar, achaParcela, parecido, IMP_PEND, IMP_GRAVA };
