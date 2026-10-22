// Testes das regras financeiras com dados fictícios. Rodar: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// carrega os scripts do app num contexto isolado, com "hoje" fixo
function carregar(hoje = "2026-10-19") {
  const ctx = { console, Intl, Date, Math, JSON, Number, String, Array, Object, Set, Map, crypto: require("node:crypto").webcrypto, __TODAY: hoje };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const codigo = ["core.js", "importar.js", "db.js"].map(f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8").replace(/if \(typeof module[^\n]*\n?/g, "")).join("\n;\n");
  vm.runInContext(codigo + "\n;Object.assign(globalThis, { divEtapa, divResumo, seed, vazio, saldoLivre, cardResumo, fatura, fatItens, keyOf, closeOf, parcVal, compromissos, caixa, gastosMes, receitasMes, projecao, simular, saldoConta, parseValor, parseDataBR, parseCSV, parseOFX, analisar, achaParcela, TABELAS, ORDEM, montarEstado, garanteIds, fmt, CUR, TODAY, recParcela, separaParcela, cpfValido, cpfFmt, diasAte, lerTextoImagem });", ctx);
  return ctx;
}
const C = carregar();
const igual = (a, b, m) => assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m);
const card = (S, id) => S.cartoes.find(c => c.id === id);

test("valores em centavos: parcelas sempre somam o total, diferença na 1ª", () => {
  assert.equal(C.parcVal({ total: 10000, n: 3 }, 1), 3334);
  assert.equal(C.parcVal({ total: 10000, n: 3 }, 2), 3333);
  for (let i = 0; i < 2000; i++) {
    const total = 1 + Math.floor(Math.random() * 5_000_000), n = 1 + Math.floor(Math.random() * 24), p = { total, n };
    let s = 0; for (let k = 1; k <= n; k++) s += C.parcVal(p, k);
    assert.equal(s, total);
  }
});

test("leitura de valores e datas brasileiras", () => {
  assert.equal(C.parseValor("1.234,56"), 123456);
  assert.equal(C.parseValor("-12.34"), -1234);
  assert.equal(C.parseValor("R$ -1.234,56"), -123456);
  assert.equal(C.parseValor("(12,34)"), -1234);
  assert.equal(C.parseValor("0,10"), 10);
  assert.equal(C.parseValor("1234.5"), 123450);
  assert.equal(C.parseDataBR("05/10/2026"), "2026-10-05");
  assert.equal(C.parseDataBR("2026-10-05"), "2026-10-05");
  assert.equal(C.parseDataBR("5/1/26"), "2026-01-05");
  assert.equal(C.parseDataBR("20261005120000[-3:BRT]"), "2026-10-05");
});

test("fechamento do cartão decide a fatura (competência = mês do vencimento)", () => {
  const S = C.seed(), inter = card(S, "inter"), nu = card(S, "nubank");
  assert.equal(C.keyOf(inter, "2026-10-17"), "2026-10"); // fecha dia 18
  assert.equal(C.keyOf(inter, "2026-10-18"), "2026-11"); // no dia do fechamento vai para a próxima
  assert.equal(C.keyOf(nu, "2026-10-28"), "2026-11");    // fecha 29, vence 5 do mês seguinte
  assert.equal(C.keyOf(nu, "2026-10-29"), "2026-12");
});

test("fatura do Inter de outubro com parcelas e estorno vinculado", () => {
  const S = C.seed(), f = C.fatura(S, card(S, "inter"), "2026-10");
  assert.equal(f.total, 112645);
  assert.equal(f.status, "fechada");
  assert.ok(f.itens.some(i => i.parc && i.parc[0] === 3 && i.parc[1] === 10));
  assert.ok(f.itens.some(i => i.estorno && i.estornoDe));
});

test("compra parcelada aparece uma vez por fatura, sem duplicar o total", () => {
  const S = C.seed(), nu = card(S, "nubank");
  const leroy = S.parc.find(p => p.desc.startsWith("Leroy"));
  let total = 0;
  for (let k = "2026-11", i = 0; i < 6; i++) { const f = C.fatura(S, nu, k); const it = f.itens.filter(x => x.ref === leroy.id); assert.equal(it.length, 1); total += it[0].valor; k = addYM(k, 1); }
  assert.equal(total, leroy.total);
  function addYM(ym, n) { let [y, m] = ym.split("-").map(Number); m += n; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12) + 1; return y + "-" + String(m).padStart(2, "0"); }
});

test("pagar a fatura reduz o caixa mas não cria despesa de consumo", () => {
  const S = C.seed();
  const gastoAntes = C.gastosMes(S, "2026-10").reduce((t, r) => t + r.valor, 0), caixaAntes = C.caixa(S), livreAntes = C.saldoLivre(S, "2026-10-31").livre;
  S.lanc.push({ id: "t1", data: "2026-10-19", desc: "Pagamento fatura Inter", tipo: "transferencia", valor: 112645, conta: "nuconta", destino: "inter", fatura: "2026-10" });
  assert.equal(C.gastosMes(S, "2026-10").reduce((t, r) => t + r.valor, 0), gastoAntes);
  assert.equal(C.caixa(S), caixaAntes - 112645);
  assert.equal(C.fatura(S, card(S, "inter"), "2026-10").status, "paga");
  assert.equal(C.saldoLivre(S, "2026-10-31").livre, livreAntes); // sai do caixa e do comprometido ao mesmo tempo
});

test("transferência entre contas próprias não é receita nem despesa", () => {
  const S = C.seed(), rec = C.receitasMes(S, "2026-10"), gas = C.gastosMes(S, "2026-10").length, cx = C.caixa(S);
  S.lanc.push({ id: "t2", data: "2026-10-19", desc: "Para a conta da Manu", tipo: "transferencia", valor: 50000, conta: "itau", destino: "nuconta" });
  assert.equal(C.receitasMes(S, "2026-10"), rec);
  assert.equal(C.gastosMes(S, "2026-10").length, gas);
  assert.equal(C.caixa(S), cx);
});

test("pagamento parcial deixa a conta parcialmente paga, com o restante no comprometido", () => {
  const S = C.seed(), agua = C.compromissos(S, "2026-10", "2026-10").find(c => c.key === "r-agua|2026-10");
  assert.equal(agua.status, "parcial");
  assert.equal(agua.restante, 15640 - 9800);
  assert.ok(C.saldoLivre(S, "2026-10-31").comps.some(c => c.key === "r-agua|2026-10" && c.restante === 5840));
});

test("recorrências geram 12 meses de previsões e nenhuma vira pagamento sozinha", () => {
  const S = C.seed(), lancAntes = S.lanc.length;
  const futuras = C.compromissos(S, "2026-11", "2027-10").filter(c => c.key.startsWith("r-cond|"));
  assert.equal(futuras.length, 12);
  assert.ok(futuras.every(c => c.status === "prevista" && c.pago === 0));
  C.projecao(S, 500000);
  assert.equal(S.lanc.length, lancAntes);
});

test("provisão separada não é descontada duas vezes; planejada é", () => {
  const S = C.seed(), sl = C.saldoLivre(S, "2026-10-31");
  assert.equal(sl.prov, 90000 + 40000); // só as planejadas
  assert.ok(!S.contas.find(c => c.id === "reserva").caixa); // separada fica fora do caixa
  assert.equal(sl.livre, sl.caixa - sl.comprometido - sl.prov);
  assert.equal(sl.livre, 602900);
});

test("cancelar parcelas futuras recalcula só as faturas afetadas", () => {
  const S = C.seed(), nu = card(S, "nubank"), amazon = S.parc.find(p => p.desc.startsWith("Amazon"));
  const nov = C.fatura(S, nu, "2026-11").total, dez = C.fatura(S, nu, "2026-12").total;
  amazon.cancelDe = 6;
  assert.equal(C.fatura(S, nu, "2026-11").total, nov);
  assert.equal(C.fatura(S, nu, "2026-12").total, dez - C.parcVal(amazon, 6));
});

test("simulador de dívidas: sem taxa, projeta sem juros", () => {
  const S = C.seed(), r = C.simular(S, 150000, "juros");
  assert.ok(r.meses > 0 && r.meses < 40);
  assert.equal(r.ds.find(d => d.id === "d-rosa").juros, 0);
  assert.ok(r.ds.find(d => d.id === "d-consig").juros > 0);
});

test("CSV de fatura (formato Nubank) e OFX de conta", () => {
  const csv = "date,title,amount\n2026-10-17,Outback,286.60\n2026-10-18,Droga Raia,54.90\n2026-10-13,Leroy Merlin - Parcela 1/6,412.50\n2026-10-05,Pagamento recebido,-1492.55\n";
  const r = C.parseCSV(csv);
  assert.equal(r.itens.length, 4);
  igual(r.itens.map(i => i.vs), [28660, 5490, 41250, -149255]);
  const ofx = "OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>341<ACCTID>12345</BANKACCTFROM><BANKTRANLIST>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261018120000[-3:BRT]<TRNAMT>-132.45<FITID>A1<MEMO>SUPERMERCADO DIA 112</STMTTRN>\n<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261005<TRNAMT>-1492.55<FITID>A2<MEMO>PAG FATURA NUBANK</STMTTRN>\n</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>";
  const o = C.parseOFX(ofx);
  assert.equal(o.itens.length, 2);
  assert.equal(o.itens[0].d, "2026-10-18");
  assert.equal(o.itens[0].vs, -13245);
  assert.equal(o.itens[1].fitid, "A2");
});

test("importar de novo não duplica: compra igual vira duplicata, parcela já projetada é vinculada", () => {
  const S = C.seed();
  const itens = C.parseCSV("date,title,amount\n2026-10-17,OUTBACK STEAKHOUSE,286.60\n2026-10-13,LEROY MERLIN ARMARIO 01/06,412.50\n2026-10-18,DROGA RAIA,54.90\n2026-10-18,MERCADOLIVRE 01/03,79.90\n").itens;
  const a = C.analisar(S, itens, "nubank", "2026-11");
  assert.equal(a[0].st, "dup");
  assert.equal(a[1].st, "link");
  assert.equal(a[2].st, "ok");
  assert.equal(a[2].cat, "Saúde");
  assert.equal(a[3].st, "parc");
  assert.equal(a[3].k0, "2026-11");
});

test("extrato: pagamento de fatura vira transferência e conta prevista é quitada, não somada", () => {
  const S = C.seed();
  const itens = [
    { d: "2026-10-05", desc: "PAG FATURA NUBANK", vs: -149255, fitid: "X1" },
    { d: "2026-10-25", desc: "CONDOMINIO ED AURORA", vs: -78000, fitid: "X2" },
    { d: "2026-10-18", desc: "SUPERMERCADO DIA 112", vs: -13245, fitid: "X3" },
  ];
  const a = C.analisar(S, itens, "itau", null);
  assert.equal(a[0].st, "link");
  assert.equal(a[1].st, "comp");
  assert.equal(a[1].comp, "r-cond|2026-10");
  assert.equal(a[2].st, "ok");
  assert.equal(a[2].cat, "Mercado");
  S.lanc.push({ id: "f1", data: "2026-10-18", desc: "SUPERMERCADO DIA 112", tipo: "despesa", valor: 13245, conta: "itau", fitid: "X3" });
  assert.equal(C.analisar(S, itens, "itau", null)[2].st, "link"); // mesmo identificador do banco
});

test("gravar e ler do banco preserva todos os números", () => {
  const S = C.seed(); C.garanteIds(S);
  const R = {}; for (const t of C.ORDEM) R[t] = JSON.parse(JSON.stringify(C.TABELAS[t].rows(S))).map(r => ({ ...r, familia_id: "f" }));
  R.auditoria = [];
  const S2 = C.montarEstado({ id: "f", inicio: S.inicio }, R, "João");
  assert.equal(C.caixa(S2), C.caixa(S));
  assert.equal(C.saldoLivre(S2, "2026-10-31").livre, C.saldoLivre(S, "2026-10-31").livre);
  igual(S2.cartoes.map(c => C.cardResumo(S2, c).deve), S.cartoes.map(c => C.cardResumo(S, c).deve));
  igual(C.projecao(S2, 500000).meses.map(m => m.fim), C.projecao(S, 500000).meses.map(m => m.fim));
  for (const t of C.ORDEM) igual(C.TABELAS[t].rows(S2), C.TABELAS[t].rows(S), "tabela " + t);
});

test("recorrência parcelada: 07/10 a 10/10 de out/26 a jan/27, depois some", () => {
  const S = C.vazio("João", "2026-10-01");
  S.rec.push({ id: "r-emp", desc: "Empréstimo Pernambucanas", tipo: "despesa", cat: "Dívidas", sub: "", valor: 50618, dia: 25, conta: "c1", inicio: "2026-10", fim: "2027-01", resp: "João", natureza: "Fixa", parcTotal: 10, parcIni: 7 });
  const cs = C.compromissos(S, "2026-10", "2027-12").filter(c => c.ref.id === "r-emp");
  igual(cs.map(c => c.desc), ["Empréstimo Pernambucanas 07/10", "Empréstimo Pernambucanas 08/10", "Empréstimo Pernambucanas 09/10", "Empréstimo Pernambucanas 10/10"]);
  igual(cs.map(c => c.venc), ["2026-10-25", "2026-11-25", "2026-12-25", "2027-01-25"]);
  // mesmo se o fim gravado estiver errado, nunca passa da última parcela
  S.rec[0].fim = null;
  assert.equal(C.compromissos(S, "2026-10", "2027-12").filter(c => c.ref.id === "r-emp").length, 4);
  // projeção não conta nada depois de janeiro
  const pj = C.projecao(S, 0).meses.filter(m => m.ym > "2027-01");
  assert.ok(pj.every(m => m.fixas === 0));
});

test("recorrência parcelada criada depois de já existir: meses antigos ficam, sem número", () => {
  const S = C.vazio("João", "2026-08-01");
  S.rec.push({ id: "r-x", desc: "Curso", tipo: "despesa", cat: "Educação", sub: "", valor: 1000, dia: 5, conta: "c1", inicio: "2026-08", fim: "2026-12", resp: "João", natureza: "Fixa", parcTotal: 3, parcIni: -1 });
  igual(C.compromissos(S, "2026-08", "2027-03").filter(c => c.ref.id === "r-x").map(c => c.desc), ["Curso", "Curso", "Curso 01/03", "Curso 02/03", "Curso 03/03"]);
});

test("separa '(07/10)' da descrição", () => {
  igual(C.separaParcela("Pernambucanas Empréstimo (07/10)"), { desc: "Pernambucanas Empréstimo", n: 7, total: 10 });
  igual(C.separaParcela("Geladeira - 3/12"), { desc: "Geladeira", n: 3, total: 12 });
  igual(C.separaParcela("Carro 5 de 48"), { desc: "Carro", n: 5, total: 48 });
  assert.equal(C.separaParcela("IPTU 2026"), null);
  assert.equal(C.separaParcela("Aluguel 10/2026"), null);
  assert.equal(C.separaParcela("Conta 11/10"), null);
});

test("banco: parcelas da recorrência vão e voltam iguais", () => {
  const S = C.vazio("João", "2026-10-01");
  S.rec.push({ id: "r-emp", desc: "Empréstimo", tipo: "despesa", cat: "Dívidas", sub: "", valor: 50618, dia: 25, conta: null, inicio: "2026-10", fim: "2027-01", resp: "João", natureza: "Fixa", parcTotal: 10, parcIni: 0 });
  const row = C.TABELAS.recorrencias.rows(S)[0];
  assert.equal(row.parc_total, 10); assert.equal(row.parc_ini, 0);
});

test("CPF: dígitos verificadores e formatação", () => {
  assert.equal(C.cpfValido("123.456.789-09"), true);
  assert.equal(C.cpfValido("52998224725"), true);
  assert.equal(C.cpfValido("123.456.789-00"), false);
  assert.equal(C.cpfValido("111.111.111-11"), false);
  assert.equal(C.cpfValido("1234567890"), false);
  assert.equal(C.cpfFmt("52998224725"), "529.982.247-25");
  assert.equal(C.diasAte("2026-10-20", "2026-11-19"), 30);
  assert.equal(C.diasAte("2026-10-20", "2026-10-19"), -1);
});

test("print de fatura (texto reconhecido): datas por dia, parcela na linha de baixo, pagamento negativo, resumo ignorado", () => {
  const t = "Nubank\nFatura atual\nR$ 1.332,22\nLimite disponível R$ 3.200,00\n20 OUT\nMercado Livre R$ 120,00\nParcela 2/10\niFood R$ 45,90\n19 OUT\nUber *Trip R$ 23,40\nPagamento recebido —R$ 800,00\n18 OUT\nNetflix.com R$ 55,90";
  const r = C.lerTextoImagem(t, "2026-10-21");
  assert.equal(r.banco, "Nubank"); assert.equal(r.cartao, true);
  igual(r.itens.map(i => [i.d, i.desc, i.vs, i.parc]), [["2026-10-20", "Mercado Livre", 12000, { k: 2, n: 10 }], ["2026-10-20", "iFood", 4590, null], ["2026-10-19", "Uber *Trip", 2340, null], ["2026-10-19", "Pagamento recebido", -80000, null], ["2026-10-18", "Netflix.com", 5590, null]]);
});
test("print de extrato: data na linha, sinal de saída, saldo ignorado, parcela 03/12 não vira valor", () => {
  const r = C.lerTextoImagem("itaú extrato\n14/10/2026 PIX ENVIADO MARIA -150,00\n16/10/2026 SALARIO EMPRESA 5.200,00\nSALDO DO DIA 4.616,78\n17/10 MAGAZINE LUIZA 03/12 199,90", "2026-10-21");
  assert.equal(r.banco, "Itaú");
  igual(r.itens.map(i => [i.d, i.desc, i.vs, i.parc]), [["2026-10-14", "PIX ENVIADO MARIA", -15000, null], ["2026-10-16", "SALARIO EMPRESA", 520000, null], ["2026-10-17", "MAGAZINE LUIZA", 19990, { k: 3, n: 12 }]]);
});
test("print sem banco e datas de dezembro lidas em janeiro ficam no ano anterior", () => {
  const r = C.lerTextoImagem("28/12 Farmácia 89,90\nHoje\nPadaria 12,00", "2027-01-05");
  assert.equal(r.banco, null);
  igual(r.itens.map(i => [i.d, i.desc, i.vs]), [["2026-12-28", "Farmácia", 8990], ["2027-01-05", "Padaria", 1200]]);
});

test("print em tabela (data da compra, estabelecimento, parcela, valor, vencimento): parcela em campo próprio, vencimento define a fatura, linha sem data fica em branco", () => {
  const t = "Data da compra Estabelecimento Parcela Valor Vencimento\n06/04/2026 PICPAY*EMANOELLA LOP 07/08 R$ 128,52 05/11/2026\n22/04/2026 ANUIDADE DIFERENCIADA 07/12 R$ 25,00 05/11/2026\n14/05/2026 PICPAY*EMANOELLA LOP — 06/06 R$ 51,35 05/11/2026\nAyumi 01/02 R$ 150,10 05/11/2026";
  const r = C.lerTextoImagem(t, "2026-10-21");
  assert.equal(r.banco, null, "PICPAY* é loja, não banco do cartão");
  igual(r.itens.map(i => [i.d, i.desc, i.vs, i.parc, i.fat]), [
    ["2026-04-06", "PICPAY*EMANOELLA LOP", 12852, { k: 7, n: 8 }, "2026-11"],
    ["2026-04-22", "ANUIDADE DIFERENCIADA", 2500, { k: 7, n: 12 }, "2026-11"],
    ["2026-05-14", "PICPAY*EMANOELLA LOP", 5135, { k: 6, n: 6 }, "2026-11"],
    ["", "Ayumi", 15010, { k: 1, n: 2 }, "2026-11"]]);
  // na análise para um cartão, cada parcela vira parcelamento com a 1ª parcela no mês certo
  const S = C.vazio("João", "2026-10-01");
  S.cartoes.push({ id: "k1", nome: "Casas Bahia", inst: "Casas Bahia", resp: "Gil", limite: 300000, fecha: 31, vence: 5, pagaCom: "c1", final: "9999" });
  const a = C.analisar(S, r.itens, "k1", "2026-11");
  igual(a.map(x => [x.st, x.n, x.k0]), [["parc", 8, "2026-05"], ["parc", 12, "2026-05"], ["parc", 6, "2026-06"], ["parc", 2, "2026-11"]]);
});
test("compra de cartão com fatura informada cai nessa fatura, não na da data", () => {
  const S = C.vazio("João", "2026-10-01");
  const card = { id: "k1", nome: "X", inst: "X", resp: "J", limite: 100000, fecha: 31, vence: 5, pagaCom: "c1", final: "1" };
  S.cartoes.push(card);
  S.lanc.push({ id: "l1", data: "2026-04-06", desc: "Compra antiga", tipo: "despesa", valor: 1000, cartao: "k1", fatura: "2026-11", origem: "importação" });
  assert.equal(C.fatura(S, card, "2026-11").total, 1000);
  assert.equal(C.fatura(S, card, "2026-05").total, 0);
});

test("dívida a negociar fica fora das contas até decidir; decisão gera parcelas; quitada some", () => {
  const S = C.seed(), base = C.saldoLivre(S, "2026-12-31");
  const d = { id: "d-neg", nome: "Itaú atrasado", credor: "Itaú", etapa: "negociar", saldo: 300000, parcela: 0, taxa: null, dia: 1, primeiro: "2026-10", total: 1, prioridade: "Alta", conta: null, situacao: "Em dia", obs: "" };
  S.dividas.push(d);
  assert.equal(C.saldoLivre(S, "2026-12-31").livre, base.livre, "a negociar não mexe no saldo livre");
  assert.ok(!C.compromissos(S, "2026-10", "2027-12").some(c => c.ref === d));
  assert.equal(C.divResumo(S, d).falta, 300000);
  // decide: acordo de R$ 1.200,00 em 3x a partir de 11/2026
  Object.assign(d, { etapa: "pagamento", decisao: "acordo", valorOriginal: 300000, saldo: 120000, total: 3, parcela: 40000, primeiro: "2026-11", dia: 10 });
  const cs = C.compromissos(S, "2026-10", "2027-03").filter(c => c.ref === d);
  igual(cs.map(c => c.venc), ["2026-11-10", "2026-12-10", "2027-01-10"]);
  assert.equal(C.saldoLivre(S, "2026-12-31").livre, base.livre - 80000, "duas parcelas até dezembro entram no comprometido");
  assert.equal(C.divResumo(S, d).falta, 120000);
  // paga a 1ª
  S.inst["d-neg|2026-11"] = { pag: [{ id: "pg1", lanc: null, valor: 40000, data: "2026-11-10" }] };
  const r = C.divResumo(S, d); assert.equal(r.falta, 80000); assert.equal(r.pagas, 1); assert.equal(r.proxima.venc, "2026-12-10");
  // quitada: parcelas abertas somem, a paga fica no histórico
  d.etapa = "quitada"; d.quitadaEm = "2026-11-15";
  const depois = C.compromissos(S, "2026-10", "2027-03").filter(c => c.ref === d);
  assert.equal(depois.length, 1); assert.equal(depois[0].status, "paga");
  assert.equal(C.divResumo(S, d).falta, 0);
  assert.equal(C.saldoLivre(S, "2026-12-31").livre, base.livre);
});

test("simulador inclui dívida a negociar sem parcela mínima", () => {
  const S = C.seed();
  S.dividas.push({ id: "d-n2", nome: "Pendência", etapa: "negociar", saldo: 50000, parcela: 0, taxa: null, dia: 1, primeiro: "2026-10", total: 1 });
  const r = C.simular(S, 1000000, "saldo"), x = r.ds.find(d => d.id === "d-n2");
  assert.ok(x); assert.equal(x.min, 0); assert.ok(x.quita >= 1);
});
