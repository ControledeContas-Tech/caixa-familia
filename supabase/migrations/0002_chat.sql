-- Caixa da Família · chat da família
-- Mensagens visíveis só para os membros da mesma família (RLS), entregues em tempo real (Realtime).

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  autor text not null,
  texto text not null check (char_length(btrim(texto)) between 1 and 2000),
  criado_em timestamptz not null default now(),
  editado_em timestamptz,
  apagada boolean not null default false
);
create index if not exists mensagens_familia_criado on public.mensagens(familia_id, criado_em desc);

alter table public.mensagens enable row level security;

drop policy if exists mensagens_ler on public.mensagens;
drop policy if exists mensagens_enviar on public.mensagens;
drop policy if exists mensagens_apagar_propria on public.mensagens;

-- lê quem é da família
create policy mensagens_ler on public.mensagens for select
  using (public.sou_membro(familia_id));
-- envia em nome próprio, só para a própria família
create policy mensagens_enviar on public.mensagens for insert
  with check (public.sou_membro(familia_id) and user_id = auth.uid());
-- só o autor pode marcar a própria mensagem como apagada (o texto é substituído)
create policy mensagens_apagar_propria on public.mensagens for update
  using (user_id = auth.uid() and public.sou_membro(familia_id))
  with check (user_id = auth.uid() and public.sou_membro(familia_id));

grant select, insert, update on public.mensagens to authenticated;
revoke all on public.mensagens from anon;

-- impede trocar autor, família ou data numa edição; ao apagar, some o texto
create or replace function public.mensagens_protege() returns trigger
language plpgsql as $$
begin
  if new.user_id <> old.user_id or new.familia_id <> old.familia_id or new.criado_em <> old.criado_em or new.autor <> old.autor then
    raise exception 'Alteração não permitida';
  end if;
  if new.apagada then new.texto := 'Mensagem apagada'; end if;
  new.editado_em := now();
  return new;
end $$;
drop trigger if exists mensagens_protege on public.mensagens;
create trigger mensagens_protege before update on public.mensagens
  for each row execute function public.mensagens_protege();

-- entrega em tempo real
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mensagens') then
    alter publication supabase_realtime add table public.mensagens;
  end if;
end $$;
