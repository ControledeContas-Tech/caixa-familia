// Testes da Alícia local (respostas calculadas no aparelho, sem IA). Rodar: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ctx = { console, Intl, Date, Math, JSON, Number, String, Array, Object, Set, Map, RegExp, crypto: require("node:crypto").webcrypto, __TODAY: "2026-10-20" };
ctx.globalThis = ctx; ctx.window = ctx;
vm.createContext(ctx);
const ler = f => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
vm.runInContext(ler("core.js") + ';\nglobalThis.S = seed(); globalThis.ui = { view: "painel", varMes: 300000 }; globalThis.ME = { nome: "João Lucas" };', ctx);
vm.runInContext(ler("alicia-manual.js"), ctx);
vm.runInContext(ler("alicia-local.js"), ctx);
const R = (q, o) => ctx.AliciaLocal.responder(q, o || {});

test("Alícia: perguntas de números vão para o cálculo certo", () => {
  const casos = [
    ["o que falta pagar este mês?", "corte"], ["quais contas estão vencidas?", "vencidas"], ["o que vence essa semana?", "proximas"],
    ["quanto está a fatura do nubank?", "fatura"], ["em qual fatura cai uma compra feita hoje no nubank?", "qualFatura"],
    ["qual o saldo livre?", "saldo"], ["quanto gastamos com mercado em outubro?", "gastos"], ["quando paguei a luz?", "buscar"],
    ["quando acaba o parcelamento da geladeira?", "parcelas"], ["como estão as dívidas?", "dividas"], ["vamos fechar algum mês no negativo?", "previsao"],
    ["quais os maiores gastos do mês passado?", "maiores"], ["quem alterou a categoria do cabeleireiro?", "auditoria"],
  ];
  for (const [q, intent] of casos) { const r = R(q); assert.equal(r.intent, intent, q); assert.ok(r.conf >= 0.8, q + " conf " + r.conf); assert.ok(r.texto.length > 20, q); }
});

test("Alícia: valores batem com as regras do sistema", () => {
  assert.match(R("quanto está a fatura do nubank?").texto, /Fatura de novembro de 2026 · Nubank - João[\s\S]*R\$ 2\.341,77/);
  assert.match(R("quanto gastamos com mercado em outubro?").texto, /R\$ 809,78/);
  assert.match(R("quais contas estão vencidas?").texto, /Sabesp · água: \*\*R\$ 58,40/);
  const g = R("quando acaba o parcelamento da geladeira?").texto; assert.match(g, /4\/10/); assert.match(g, /Mai\/27/);
  // "Manu" é pessoa, não o cartão Inter - Manu
  const m = R("quanto a manu gastou em outubro?"); assert.equal(m.ent.pessoa, "Manu"); assert.equal(m.ent.cartao, null);
});

test("Alícia: continuação da conversa reaproveita a pergunta anterior", () => {
  const a = R("quanto gastamos com mercado em outubro?");
  const b = R("e em setembro?", { ultimo: { intent: a.intent, ent: a.ent } });
  assert.equal(b.intent, "gastos"); assert.equal(b.ent.mes, "2026-09"); assert.match(b.texto, /Mercado em setembro/);
});

test("Alícia: dúvidas de uso respondem pelo manual", () => {
  const casos = [["como pago a fatura?", /Pagar fatura/], ["para que serve o campo paga com?", /conta de onde sai o dinheiro/], ["onde vejo o histórico de alterações?", /Auditoria/],
    ["qual a diferença entre a negociar e em pagamento?", /fica fora das contas/], ["como lanço uma compra parcelada?", /Parcelas no cartão/], ["como instalo o app no celular?", /Tela de Início|Instalar/]];
  for (const [q, re] of casos) { const r = R(q); assert.equal(r.intent, "manual", q); assert.match(r.texto, re, q); assert.ok(r.conf >= 0.8, q); }
});

test("Alícia: pedido de opinião fica com pouca certeza (vai para a IA, se permitida)", () => {
  const r = R("vale a pena antecipar a fatura?"); assert.ok(r.opiniao); assert.ok(r.conf <= 0.5);
  assert.ok(R("qual a cor do céu em marte?").conf < 0.62);
});
