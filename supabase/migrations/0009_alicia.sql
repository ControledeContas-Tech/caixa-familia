-- 0009: Alícia (assistente de IA do app) — contador de uso por pessoa e por dia, para não haver gasto descontrolado.
-- A chave da IA fica só no servidor (segredo da Edge Function "alicia"), nunca no navegador.
-- Pode rodar mais de uma vez.
create table if not exists public.alicia_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null default public.hoje_br(),
  n int not null default 0,
  primary key (user_id, dia)
);
alter table public.alicia_uso enable row level security;
drop policy if exists alicia_uso_ler on public.alicia_uso;
create policy alicia_uso_ler on public.alicia_uso for select using (user_id = auth.uid());

-- registra uma pergunta e devolve quantas a pessoa já fez hoje; recusa quem não é membro de uma família ou passou do limite
create or replace function public.alicia_registrar_uso(p_limite int default 150) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if auth.uid() is null or public.minha_familia() is null then raise exception 'sem família vinculada'; end if;
  if not public.pode_ler() then raise exception 'acesso inativo'; end if;
  insert into public.alicia_uso as u (user_id, dia, n) values (auth.uid(), public.hoje_br(), 1)
  on conflict (user_id, dia) do update set n = u.n + 1
  returning n into v;
  if v > greatest(1, least(p_limite, 500)) then raise exception 'limite diário de perguntas atingido'; end if;
  return v;
end $$;
revoke all on function public.alicia_registrar_uso(int) from public;
grant execute on function public.alicia_registrar_uso(int) to authenticated;
notify pgrst, 'reload schema';
