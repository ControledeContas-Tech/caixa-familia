-- 0007: dívidas por etapas (a negociar → em pagamento → quitada) e sincronia entre os membros da família
-- Pode rodar mais de uma vez.

-- ---------- dívidas por etapas ----------
alter table public.dividas add column if not exists etapa text not null default 'pagamento';
alter table public.dividas add column if not exists valor_original bigint;
alter table public.dividas add column if not exists desde date;
alter table public.dividas add column if not exists decisao text;
alter table public.dividas add column if not exists decidido_em date;
alter table public.dividas add column if not exists quitada_em date;
alter table public.dividas drop constraint if exists dividas_etapa_check;
alter table public.dividas add constraint dividas_etapa_check check (etapa in ('negociar', 'pagamento', 'quitada'));
-- dívida a negociar ainda não tem parcela definida
alter table public.dividas drop constraint if exists dividas_parcela_check;
alter table public.dividas add constraint dividas_parcela_check check (parcela >= 0);

-- ---------- sincronia: cada alteração nos dados da família sobe a "versão" ----------
create table if not exists public.familia_versao (
  familia_id uuid primary key references public.familias(id) on delete cascade,
  versao bigint not null default 0,
  por uuid,
  em timestamptz not null default now()
);
alter table public.familia_versao enable row level security;
drop policy if exists versao_ler on public.familia_versao;
create policy versao_ler on public.familia_versao for select using ((public.sou_membro(familia_id) and (select public.pode_ler())) or (select public.sou_superadmin()));

create or replace function public.subir_versao() returns trigger
language plpgsql security definer set search_path = public as $$
declare f uuid := coalesce((case when tg_op = 'DELETE' then old.familia_id else new.familia_id end), null);
begin
  if f is not null then
    insert into public.familia_versao as v (familia_id, versao, por, em) values (f, 1, auth.uid(), now())
    on conflict (familia_id) do update set versao = v.versao + 1, por = auth.uid(), em = now();
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['pessoas','contas','cartoes','categorias','regras','lancamentos','parcelamentos','recorrencias','ajustes','pagamentos','manuais','dividas','provisoes','provisao_movs','investimentos','invest_movs','importacoes'] loop
    execute format('drop trigger if exists versao_%1$s on public.%1$I', t);
    execute format('create trigger versao_%1$s after insert or update or delete on public.%1$I for each row execute function public.subir_versao()', t);
  end loop;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'familia_versao') then
    alter publication supabase_realtime add table public.familia_versao;
  end if;
end $$;

insert into public.familia_versao (familia_id) select id from public.familias on conflict do nothing;
notify pgrst, 'reload schema';
