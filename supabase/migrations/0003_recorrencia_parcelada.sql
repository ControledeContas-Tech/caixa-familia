-- Caixa da Família · recorrência parcelada (ex.: empréstimo em 10 parcelas)
-- parc_total: número total de parcelas; parc_ini: número da parcela no mês de início (pode ser < 1 se a recorrência já existia antes da 1ª parcela).
alter table public.recorrencias add column if not exists parc_total int check (parc_total between 2 and 360);
alter table public.recorrencias add column if not exists parc_ini int;
