-- Caixa da Família · parcelamento lembra de qual importação veio (para "Desfazer importação")
alter table public.parcelamentos add column if not exists importacao text;
