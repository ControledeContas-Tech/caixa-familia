# Caixa da Família

Sistema web de gestão financeira pessoal e familiar: contas, cartões e faturas, parcelamentos, contas a pagar, dívidas, provisões, investimentos, importação de extratos e projeção de caixa de 12 meses.

- **Site:** publicado pelo GitHub Pages a cada alteração na branch `main`, depois que os testes passam.
- **Dados e login:** Supabase (Postgres + Auth). Cada família só enxerga os próprios dados (Row Level Security).
- **Custo:** zero (planos gratuitos do GitHub e do Supabase).

## Regras que o sistema garante

- Valores guardados e calculados em centavos inteiros, sem ponto flutuante.
- Compra no cartão conta como despesa uma vez; pagar a fatura é transferência, não despesa.
- Transferências entre contas próprias não são receita nem despesa.
- O dia de fechamento do cartão decide a fatura; a fatura leva o nome do mês do vencimento.
- Parcelas não são recriadas ao importar a mesma fatura de novo.
- Conta não paga não some nem muda de mês sozinha; pagamento parcial deixa saldo até você decidir o destino.
- Saldo livre = saldo de caixa − compromissos pendentes no período − provisões planejadas (as já separadas em conta não são descontadas de novo).
- Previsões nunca são tratadas como dinheiro movimentado.

As regras ficam em `js/core.js` e são testadas em `tests/regras.test.js` (`node --test tests/*.test.js`).

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `index.html` | Página única do app (estilos incluídos) |
| `js/core.js` | Regras financeiras puras (sem tela, sem banco) |
| `js/importar.js` | Leitura de CSV/OFX e análise de duplicidades, parcelas e pagamentos de fatura |
| `js/db.js` | Sincronização com o Supabase (grava só o que mudou) |
| `js/ui.js` | Telas, formulários e login |
| `js/config.js` | Endereço e chave pública do Supabase |
| `supabase/migrations/` | Esquema do banco e regras de acesso |

## Configuração (uma vez)

1. Rodar `supabase/migrations/0001_inicial.sql` no projeto Supabase (SQL Editor).
2. Em **Authentication → URL Configuration**, colocar o endereço do site em **Site URL** e em **Redirect URLs**.
3. Preencher `js/config.js` com a URL do projeto e a chave `anon`/publishable.
4. No GitHub: **Settings → Pages → Source: GitHub Actions**.

## Backup

O plano gratuito do Supabase não faz backup automático. Use **Configurações → Backup e dados → Exportar todos os dados** toda semana. O projeto gratuito pausa após 7 dias sem uso; para reativar, abra o painel do Supabase.

## Próximas etapas

- Leitura de PDF de fatura/extrato e de prints (OCR).
- Detecção de transferências entre contas próprias em extratos diferentes.
