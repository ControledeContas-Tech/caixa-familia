// Manual do sistema usado pela Alícia. Atualize sempre que uma tela, campo ou regra mudar.
window.ALICIA_MANUAL = String.raw`
# Caixa da Família — manual completo

## O que é
App de controle financeiro da família de João Lucas e Emanoella (Manu). Funciona no navegador do computador e do celular (pode ser instalado como app). Os dados ficam no Supabase, protegidos por login; João e Manu veem exatamente os mesmos dados, em tempo real (uma mudança de um aparece para o outro em segundos; há também uma checagem a cada 45 segundos e quando o app volta a ficar visível).
Endereço: https://controledecontas-tech.github.io/caixa-familia/

## Conceitos que valem para o app inteiro
- Valores em reais; datas no formato dd/mm/aaaa. "Hoje" é sempre o dia no fuso de São Paulo.
- Início do controle (data em Configurações): o que vem antes é tratado como histórico já quitado. Contas a pagar, faturas e parcelas de antes dessa data não aparecem como pendentes.
- Tipos de lançamento:
  - Despesa: dinheiro que sai (de conta, espécie ou cartão).
  - Receita: dinheiro que entra numa conta.
  - Transferência: dinheiro que muda de lugar entre contas da própria família (ex.: saque para espécie, guardar na reserva, aporte em investimento, pagamento de fatura). Não é receita nem despesa e não entra no "Resultado".
  - Estorno: devolução de uma compra no cartão; abate da fatura (valor negativo na fatura).
- Conta x cartão:
  - Conta (corrente, poupança, espécie ou reserva): tem saldo. Despesa em conta reduz o saldo na data do lançamento.
  - Cartão de crédito: a compra não tira dinheiro na hora; ela cai numa FATURA. O dinheiro só sai da conta quando a fatura é paga (transferência da conta "Paga com" para o cartão).
- Competência da fatura = mês do VENCIMENTO. "Fatura de novembro" é a que vence em novembro.
  - Regra: compra feita ANTES do dia de fechamento entra na fatura que fecha naquele mês; no dia do fechamento ou depois, vai para a fatura seguinte. Se o vencimento é num dia menor que o fechamento (ex.: fecha 31, vence 5), a fatura vence no mês seguinte ao fechamento.
  - Exemplo: cartão que fecha dia 31 e vence dia 5 → compra de 24/10 entra na fatura de novembro (fecha 31/10, vence 05/11); compra de 01/11 entra na fatura de dezembro.
- Status da fatura: aberta (ainda recebe compras, antes do fechamento), fechada (fechou e não foi paga), parcial (paga em parte), paga, vazia.
- Parcelamento no cartão: compra em N vezes vira N parcelas, uma em cada fatura seguida, a partir da fatura da compra. A 1ª parcela absorve os centavos que sobram da divisão. Parcelas futuras já aparecem nas próximas faturas ("Total por fatura" mostra só o que já é conhecido).
- Caixa (saldo de caixa): soma dos saldos de hoje das contas marcadas "Entra no saldo de caixa disponível". Contas de reserva normalmente ficam fora.
- Saldo de uma conta = saldo inicial (informado no cadastro) + receitas − despesas ± transferências até hoje.
- Compromissos (o que aparece em Contas a pagar): recorrências (contas fixas e salários), parcelas de dívidas em pagamento, faturas de cartão e contas avulsas lançadas à mão.
- Status de um compromisso:
  - prevista: vence num mês futuro;
  - pendente: vence neste mês ou já venceu e não foi paga ("Vencida" quando a data já passou);
  - parcial: pagou só uma parte;
  - paga / recebida;
  - cancelada, reagendada, renegociada: decisões tomadas no botão "Outras ações" ou "Decidir saldo".
- Nenhuma conta muda de mês ou some sozinha: só com uma decisão de vocês.
- Saldo livre estimado = caixa de hoje − tudo o que ainda falta pagar até a data escolhida (contas, parcelas de dívidas, faturas) − reservas planejadas (provisões sem conta própria). Receitas previstas NÃO entram no saldo livre até serem recebidas; aparecem à parte como "a receber".
- Dívida "a negociar" existe mas fica FORA de todas as contas (saldo livre, comprometido, projeção) até vocês decidirem como pagar.

## Menu (telas)
No computador o menu fica à esquerda; no celular, as telas principais ficam na barra de baixo e as demais no botão "Mais". No topo de toda tela: busca de lançamentos, botão "+ Lançamento", sino de notificações e o menu do usuário (Segurança, Sair).
Telas: Painel, Lançamentos, Cartões, Contas a pagar, Planejamento, Dívidas, Investimentos, Análises, Importar, Conversa, Notificações, Configurações e Administração (só para os administradores gerais).

## Painel
Visão geral com UM filtro de período no topo ("Período do painel": Hoje, Este mês, Este ano, Tudo, Personalizado) que vale para todos os quadros. Cada quadro pode, se quiser, ter o seu próprio período ("Mudar o período deste quadro" / "Padrão deste quadro").
Quadros:
- Indicadores principais: Saldo de caixa; Saldo livre estimado (com "Ver memória de cálculo →" mostrando conta por conta o que foi descontado); Comprometido (o que ainda falta pagar no período); Devemos nos cartões; Saldo devedor das dívidas; Dívidas a Negociar (fora das contas).
- Corte mensal · o que entra, o que sai e o que falta pagar: um cartão por mês do período mostrando ENTRA (salários e outras receitas previstas/recebidas), SAI (contas fixas, contas avulsas, parcelas de dívidas, faturas de cartão pelo mês de vencimento, gastos no débito/Pix/dinheiro), quanto já foi pago e quanto FALTA pagar, o que sobra, "Atrasadas de meses anteriores" e o "Saldo previsto no fim do mês". Use para saber o que precisa ser pago em cada mês e se a receita cobre.
- Próximos compromissos: as próximas contas a vencer.
- Cartões de crédito: fatura atual de cada cartão, quanto está aberto e parcelas futuras.
- Gastos por categoria: consumo do período (cartão pela fatura do mês; conta pela data).
- Receitas × gastos: comparação mês a mês.
- Primeiros passos: aparece enquanto faltam cadastros básicos (contas, cartões, contas fixas e salários).

## Lançamentos
Lista do que entrou e saiu. Compras no cartão aparecem pela FATURA do mês (coluna "Conta ou cartão" mostra "Cartão · fatura Mês/aa"); contas pela data.
Filtros: mês, conta ou cartão, categoria, pessoa (responsável), tipo (despesas e estornos, receitas, transferências). A busca do topo procura em todos os meses (descrição, categoria, conta).
Totais: Receitas, Despesas, Resultado (receitas − despesas) e quantidade de Transferências (não entram no resultado).
Clicar numa linha abre os detalhes: dá para editar descrição, valor, data, categoria, responsável e observações, ou "Excluir lançamento…" (pede confirmação). Lançamento de parcela abre o parcelamento, com a opção de cancelar as parcelas a partir de uma delas (faturas já pagas não mudam).

### Novo lançamento (botão "+ Lançamento")
Campos:
- Tipo: Despesa, Receita ou Transferência.
- Descrição: texto livre (ex.: "Supermercado Dia"). Ao digitar, a categoria é sugerida pelas Regras de classificação.
- Valor: em reais, sempre positivo (o tipo define se entra ou sai).
- Data: dia da compra/pagamento. No cartão, define em qual fatura cai (o app mostra "Entra na fatura de ... (fecha dd/mm)").
- Conta ou cartão (despesa) / Entra em (receita) / Sai de (transferência).
- Vai para (só transferência): conta de destino.
- Categoria (despesa e receita).
- Parcelas no cartão (só despesa em cartão): À vista ou 2× a 24×. O app mostra o valor de cada parcela e de qual a qual fatura vai. Parcelamento não vale para conta.
- Responsável: pessoa da família ou "Casa" (despesa comum).
- Observações: opcional.
Dicas: pagamento de fatura deve ser registrado pelo botão "Pagar fatura" em Cartões (vira transferência ligada à fatura certa), não como despesa — senão a despesa seria contada duas vezes. Conta fixa (luz, aluguel) deve ser paga pelo "Registrar pagamento" em Contas a pagar, para dar baixa no compromisso.

## Cartões
Uma aba por cartão (mostra quanto há a pagar em cada um) e "+ Cartão".
Dados do cartão: Limite, Disponível estimado (limite − tudo o que está em aberto nas faturas), Ciclo (fecha dd · vence dd), Paga com (conta que paga a fatura), Final (4 últimos dígitos).
Navegação de faturas (‹ ›) com bolinha de status. Para a fatura escolhida: data de fechamento e vencimento, Total, Pago, Saldo e o botão "Pagar fatura" (registra uma transferência da conta para o cartão; pode ser valor parcial). Tabela com data, descrição, categoria, responsável, origem e valor; estornos aparecem negativos; pagamentos aparecem no rodapé como "Pagamento · conta (transferência, não é despesa)".
"Parcelamentos em andamento": compra, data, parcela atual (ex.: 3/10), valor da parcela, quanto ainda vai cair.
"Total por fatura": gráfico com o total de cada fatura (as futuras só com parcelas já conhecidas).

## Contas a pagar
Navegação por mês e três abas:
- A pagar: Previsto no mês, Já pago, Falta pagar, Vencidas. Tabela: vencimento, descrição (com categoria, "valor estimado" para contas variáveis ainda sem valor real), origem (recorrência, dívida, fatura aberta/fechada, manual), status, previsto, pago, restante e ações:
  - "Registrar pagamento": campos Valor pago, Pago com (conta), Data. Pagamento menor que o previsto deixa a conta "parcial" até decidir o saldo.
  - "Outras ações" / "Decidir saldo" — O que fazer com o saldo?: Manter pendente (continua contando no mês); Agendar para outra data (Nova data); Dividir em novos vencimentos (Parcelas); Registrar abatimento ou desconto (reduz o valor devido sem gerar pagamento); Negociar (novo valor e novo vencimento acordados); Cancelar (deixa de contar, fica no histórico; Motivo obrigatório).
  - Faturas: botão "Abrir fatura" leva para Cartões.
- A receber: receitas previstas (salários etc.) com "Registrar recebimento" (Valor recebido, Recebido em). Receita prevista só entra no caixa depois de recebida.
- Recorrências: contas e receitas que se repetem todo mês. Campos: descrição, tipo (despesa/receita), natureza (Fixa = valor igual todo mês; Variável = valor muda, ex.: luz e água — o valor previsto é estimado até registrar o real), categoria, valor, dia do vencimento, conta, mês de início e fim (ou sem fim), responsável, e opcionalmente número de parcelas (recorrência parcelada, ex.: "Empréstimo 07/10"). "+ Nova recorrência" cria; "Editar" muda só dos meses escolhidos em diante (meses já pagos não mudam).

## Planejamento
- Previsto · 12 meses: "De onde vem o ponto de partida" (dinheiro nas contas hoje − contas do mês ainda a pagar − reservas planejadas + receitas do mês que ainda vão entrar = ponto de partida). Gráfico e tabela do "Saldo livre ao fim de cada mês" com receitas previstas, contas fixas e variáveis, dívidas, faturas conhecidas e gastos variáveis estimados. O campo "Gastos variáveis estimados por mês" (compartilhado pela família) representa as compras do dia a dia que ainda não existem; sem ele a previsão fica otimista. Clicar num mês mostra o detalhe.
- Realizado: o que de fato entrou e saiu das contas no mês passado e neste (recebido, contas pagas, dívidas pagas, faturas pagas, outras despesas, guardado/investido, sobrou). Compras no cartão aparecem aqui só quando a fatura é paga.
- Comparativo do mês: previsto × realizado por grupo, com % de andamento.

## Dívidas (por etapas)
Três etapas no topo com totais:
1. A negociar: dívida existe, mas fica FORA das contas. Campos ao cadastrar ("+ Dívida a negociar"): nome, credor, valor devido, valor original, desde (data), prioridade (Alta/Média/Baixa), observação. Botão "Decidir pagamento" leva para a etapa 2 escolhendo a forma: Quitação à vista, Acordo negociado, Parcelamento ou Contrato/empréstimo — com valor acordado, parcela, nº de parcelas, 1º vencimento, dia, juros ao mês e conta de pagamento.
2. Em pagamento: as parcelas entram em Contas a pagar e passam a contar no saldo livre. Mostra progresso (parcelas pagas/total), quanto falta, próxima parcela, atrasadas. Ações: "Parcelas" (ver cada parcela), Quitar, "Voltar a negociar" (só se nenhuma parcela tiver pagamento registrado). Na etapa 1 também há "Editar".
3. Quitadas: saem das contas; fica o histórico do que foi pago. Ação: Reabrir. Mostra a economia obtida nas negociações (valor original − valor acordado).
Todas as etapas têm o "✕" para excluir uma dívida lançada por engano.
Planejador de quitação: informe quanto podem pagar por mês; compara "Maiores juros primeiro" × "Menores saldos primeiro" (data de quitação de cada dívida e juros totais). Sem taxa informada, projeta sem juros (marcado como estimado; nenhuma taxa é inventada). Dívidas a negociar entram no simulador sem parcela mínima.
Provisões (reservas para gastos futuros, como IPVA ou Natal) já não têm tela própria. Se houver provisões antigas planejadas dentro do caixa, elas ainda são descontadas do saldo livre e aparecem na memória de cálculo.

## Investimentos
Valores informados manualmente (sem integração com corretoras). Patrimônio investido, Total aportado (saldos iniciais + aportes − resgates), Rendimentos informados (não contam como receita de caixa). Gráfico de evolução e distribuição por tipo. "+ Aplicação" (nome, tipo: Tesouro Direto, CDB, LCI/LCA, Poupança, Fundo, Ações, Previdência, Cripto, Outro; instituição; saldo hoje; data do saldo — esse saldo não sai do caixa). "+ Movimentação": Aporte ou Resgate (transferência com uma conta), Rendimento, ou Saldo informado (o app calcula o rendimento pela diferença).

## Análises
Tela para montar vários visuais lado a lado, cada um com o seu período (Hoje, Este mês, Este ano, Tudo, Personalizado). Tipos de visual: Gastos por categoria, Gastos por cartão ou conta, Gastos por responsável, Maiores gastos, Receitas × gastos, Fatura atual de cada cartão, Compromissos por tipo, Contas pendentes, Dívidas por etapa, Parcelas futuras, Outros indicadores. Botões: "Adicionar visual", "Duplicar para comparar outro período", "Mover para cima", remover. Os visuais são da família: João e Manu veem os mesmos.

## Importar
Lê extratos e faturas em PDF (inclusive escaneado e com senha), CSV, OFX ou print/foto da tela. Nada é gravado sem a confirmação de vocês, e um arquivo enviado de novo é reconhecido.
Fluxo: arraste os arquivos ou clique para escolher (ou "Colar print" com Ctrl+V). O app reconhece o banco e se é fatura de cartão, sugere o destino (conta ou cartão, inclusive pelo final do cartão) e a fatura. Na revisão, cada linha pode ter data, descrição, valor, categoria e destino corrigidos. Em cartão: compra é valor positivo; estorno/pagamento é negativo (com −). Em conta: saída negativa, entrada positiva.
Situações de cada linha: Novo; Novo · à vista; Novo · compra diferente; Estorno; Quita compromisso (dá baixa numa conta a pagar); Já registrado (não grava de novo — botão "É outra compra" se for mesmo outra); Possível duplicata (espera sua decisão); Confirmar parcelamento / Parcelamento confirmado; Ignorado.
No PDF de fatura só entram os lançamentos (resumo, totais, limites, encargos informativos e "próximas faturas" ficam de fora).
Proteção contra duplicidade: o app compara com o que já existe e com os outros arquivos da mesma importação (mesmo valor, descrição parecida, mesma data ou até 2 dias). "Revisar duplicados" mostra grupos que parecem repetidos para vocês excluírem.
Prints do app do cartão · passo a passo (para ir lançando a fatura antes de fechar): 1) Qual cartão? 2) Qual fatura? (a aberta vem marcada) 3) Cole os prints — vários de uma vez, em qualquer ordem e com partes repetidas: o app usa os cabeçalhos de dia ("Quarta-feira, 28 de outubro") para as datas, dá data às linhas do topo do print usando a mesma compra em outro print e tira repetições. Quando a fatura fechar, mandem o PDF pela mesma tela: só entra o que tiver faltado. Se as datas indicarem outra fatura, aparece um aviso (confira o dia de fechamento do cartão). "Não é print de fatura" desliga o passo a passo.
Histórico de importações: número, data, arquivos, quantos incluídos, vinculados e ignorados, e quem importou.

## Conversa
Chat da família (João e Manu) em tempo real, com aviso de mensagens não lidas. Diferente da Alícia: lá vocês falam entre si.

## Notificações
Histórico dos avisos que aparecem rapidamente na parte de baixo da tela (sucesso, aviso, erro), guardado neste aparelho, com filtros e detalhes. Em erro de gravação há o botão "Tentar salvar agora".

## Configurações
Abas:
- Contas: "Contas e dinheiro em espécie". Campos: Nome, Tipo (Conta corrente, Poupança, Espécie, Reserva), Instituição, Responsável, Saldo inicial (na data de início do controle) e "Entra no saldo de caixa disponível". Se todas estiverem com saldo R$ 0,00, as previsões consideram que não há dinheiro nenhum.
- Cartões: Nome, Instituição, Responsável, Limite, Dia de fechamento, Dia de vencimento, Paga com (conta), Final do cartão (4 dígitos, ajuda a importar prints e PDFs), Status. O dia de fechamento errado faz as compras caírem na fatura errada.
- Categorias: categorias e subcategorias de despesa e de receita.
- Regras de classificação: trecho do texto → categoria/subcategoria, com prioridade (número menor vence). Ex.: "IFOOD" → Alimentação/Delivery. Regras valem para lançamentos e importações novos. "Aplicar às já registradas" mostra os lançamentos antigos que mudariam de categoria para você escolher quais reclassificar.
- Pessoas e acesso: quem tem login (Administrador ou Membro), convites por e-mail, e "Responsáveis financeiros" (pessoas sem login, como Gil, que podem ser responsáveis por cartões e gastos).
- Segurança: trocar senha, verificação em duas etapas, outros dispositivos.
- Backup e dados: exportar tudo (JSON) ou lançamentos (CSV), "Recomeçar"/apagar todos os dados (pede digitar APAGAR; não tem volta).
- Auditoria: quem fez o quê e quando.

## Instalar como app
No Chrome do computador: ícone de instalar na barra de endereço (ou menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app). No Android: menu ⋮ → Adicionar à tela inicial/Instalar app. No iPhone (Safari): Compartilhar → Adicionar à Tela de Início.

## Perguntas frequentes
- "Por que a compra não está na fatura que eu esperava?" → pela data e pelo dia de fechamento do cartão (regra acima). Confira o fechamento em Configurações → Cartões.
- "Paguei a fatura e o saldo da conta caiu duas vezes" → o pagamento foi lançado como despesa além da fatura. Exclua a despesa e registre pelo "Pagar fatura".
- "O saldo livre está negativo" → significa que o que falta pagar até a data escolhida é maior do que o dinheiro nas contas hoje (receitas previstas não contam até entrarem). Veja a memória de cálculo no Painel.
- "Por que uma dívida não aparece nas contas?" → está "A negociar". Decida a forma de pagamento para ela entrar.
- "Como lanço uma compra parcelada?" → + Lançamento → Despesa → escolha o cartão → Parcelas no cartão. Ou importe a fatura: o app detecta "Parcela 03/10".
- "Como corrijo uma categoria?" → clique no lançamento e altere; para corrigir sempre, crie uma Regra de classificação.
- "Como dou baixa numa conta de luz?" → Contas a pagar → Registrar pagamento (com o valor real; se for menor, decida o saldo).
`;
