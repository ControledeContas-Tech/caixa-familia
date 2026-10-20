-- Caixa da Família · esquema inicial
-- Valores em centavos (bigint). Datas sem hora (date). Competências como 'AAAA-MM' (text).
-- Toda tabela pertence a uma família e só é visível para os membros dela (RLS).

create extension if not exists pgcrypto;

-- ---------- família e acesso ----------
create table public.familias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  inicio date not null,
  criado_em timestamptz not null default now()
);

create table public.membros (
  familia_id uuid not null references public.familias(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null check (papel in ('admin','membro')),
  criado_em timestamptz not null default now(),
  primary key (familia_id, user_id)
);
create unique index membros_um_por_usuario on public.membros(user_id);

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references public.familias(id) on delete cascade,
  email text not null,
  nome text not null,
  papel text not null default 'membro' check (papel in ('admin','membro')),
  criado_em timestamptz not null default now(),
  unique (familia_id, email)
);

create or replace function public.minha_familia() returns uuid
language sql stable security definer set search_path = public as $$
  select familia_id from public.membros where user_id = auth.uid() limit 1
$$;

create or replace function public.sou_membro(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.membros where familia_id = f and user_id = auth.uid())
$$;

create or replace function public.sou_admin(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.membros where familia_id = f and user_id = auth.uid() and papel = 'admin')
$$;

-- cria a família do usuário logado (uma por usuário)
create or replace function public.criar_familia(p_nome text, p_pessoa text, p_inicio date) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'Sem login'; end if;
  if exists(select 1 from public.membros where user_id = auth.uid()) then raise exception 'Você já faz parte de uma família'; end if;
  insert into public.familias(nome, inicio) values (p_nome, p_inicio) returning id into f;
  insert into public.membros(familia_id, user_id, nome, email, papel)
    values (f, auth.uid(), p_pessoa, coalesce(auth.jwt()->>'email',''), 'admin');
  return f;
end $$;

-- entra na família se houver convite para o e-mail do usuário
create or replace function public.aceitar_convite() returns uuid
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then return null; end if;
  if exists(select 1 from public.membros where user_id = auth.uid()) then return public.minha_familia(); end if;
  select * into c from public.convites where lower(email) = lower(auth.jwt()->>'email') order by criado_em limit 1;
  if c is null then return null; end if;
  insert into public.membros(familia_id, user_id, nome, email, papel) values (c.familia_id, auth.uid(), c.nome, c.email, c.papel);
  delete from public.convites where id = c.id;
  return c.familia_id;
end $$;

-- apaga todos os dados financeiros da família (só administrador)
create or replace function public.apagar_dados() returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public.minha_familia();
begin
  if not public.sou_admin(f) then raise exception 'Só administradores podem apagar os dados'; end if;
  delete from public.lancamentos where familia_id = f;
  delete from public.parcelamentos where familia_id = f;
  delete from public.recorrencias where familia_id = f;
  delete from public.ajustes where familia_id = f;
  delete from public.pagamentos where familia_id = f;
  delete from public.manuais where familia_id = f;
  delete from public.dividas where familia_id = f;
  delete from public.provisoes where familia_id = f;
  delete from public.provisao_movs where familia_id = f;
  delete from public.investimentos where familia_id = f;
  delete from public.invest_movs where familia_id = f;
  delete from public.importacoes where familia_id = f;
  delete from public.contas where familia_id = f;
  delete from public.cartoes where familia_id = f;
  delete from public.pessoas where familia_id = f;
  insert into public.auditoria(familia_id, usuario, acao, alvo, det) values (f, coalesce(auth.jwt()->>'email',''), 'Apagou todos os dados', 'Família', '');
end $$;

-- ---------- cadastros ----------
create table public.pessoas (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, acesso text not null default 'Sem login', login text not null default ''
);
create table public.contas (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, tipo text not null, inst text not null default '', resp text not null default '',
  caixa boolean not null default true, saldo_ini bigint not null default 0, data_ini date not null
);
create table public.cartoes (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, inst text not null default '', resp text not null default '', limite bigint not null check (limite >= 0),
  fecha int not null check (fecha between 1 and 31), vence int not null check (vence between 1 and 31),
  paga_com text, final text not null default '', status text not null default 'Ativo'
);
create table public.categorias (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, subs text not null default '', receita boolean not null default false
);
create table public.regras (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  trecho text not null, cat text not null, sub text not null default '', prio int not null default 10
);

-- ---------- movimento efetivo ----------
create table public.lancamentos (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  data date not null, descricao text not null,
  tipo text not null check (tipo in ('despesa','receita','transferencia','estorno')),
  valor bigint not null check (valor > 0),
  conta text, cartao text, destino text, cat text, sub text, resp text,
  origem text not null default 'manual', fatura text, comp text, estorno_de text, obs text,
  importacao text, fitid text, excluido boolean not null default false,
  criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  check (conta is not null or cartao is not null),
  check (tipo <> 'transferencia' or destino is not null)
);
create unique index lanc_fitid_unico on public.lancamentos(familia_id, coalesce(conta, cartao), fitid) where fitid is not null and not excluido;
create index lanc_familia_data on public.lancamentos(familia_id, data);

create table public.parcelamentos (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  cartao text not null, descricao text not null, cat text, sub text, data date not null,
  total bigint not null check (total > 0), n int not null check (n between 1 and 48),
  resp text, origem text not null default 'manual', cancel_de int, k0 text
);

-- ---------- previsto ----------
create table public.recorrencias (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  descricao text not null, tipo text not null check (tipo in ('despesa','receita')), cat text, sub text,
  valor bigint not null check (valor > 0), dia int not null check (dia between 1 and 31), conta text,
  inicio text not null, fim text, resp text, natureza text not null default 'Fixa'
);
-- ajustes de uma ocorrência (recorrência ou parcela de dívida) num mês: chave = '<id>|AAAA-MM'
create table public.ajustes (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  valor bigint, venc date, desconto bigint not null default 0, cancel boolean not null default false,
  reag text, motivo text
);
create table public.pagamentos (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  chave text not null, lanc text not null, valor bigint not null check (valor > 0), data date not null
);
create table public.manuais (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  descricao text not null, cat text, valor bigint not null check (valor > 0), venc date not null,
  origem text, conta text, de text, desconto bigint not null default 0, cancel boolean not null default false, reag text, motivo text
);
create table public.dividas (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, credor text not null default '', saldo bigint not null check (saldo >= 0), parcela bigint not null check (parcela > 0),
  taxa numeric, dia int not null check (dia between 1 and 31), primeiro text not null, total int not null check (total > 0),
  prioridade text not null default 'Média', conta text, situacao text not null default 'Em dia', obs text not null default ''
);
create table public.provisoes (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, alvo bigint not null check (alvo > 0), reservado bigint not null default 0, conta text, uso text not null
);
create table public.provisao_movs (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  provisao_id text not null, data date not null, tipo text not null, valor bigint not null, lanc text
);
create table public.investimentos (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  nome text not null, tipo text not null, inst text not null default ''
);
create table public.invest_movs (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  investimento_id text not null, data date not null, tipo text not null, valor bigint not null, lanc text, nota text
);
create table public.importacoes (
  id text not null, familia_id uuid not null references public.familias(id) on delete cascade,
  data timestamptz not null default now(), arquivos text not null, hashes text[] not null default '{}',
  incl int not null default 0, vinc int not null default 0, ign int not null default 0, usuario text not null default ''
);
create table public.auditoria (
  id bigint generated always as identity primary key,
  familia_id uuid not null references public.familias(id) on delete cascade,
  ts timestamptz not null default now(), usuario text not null, acao text not null, alvo text not null default '', det text not null default '', ref text
);
create index auditoria_familia_ts on public.auditoria(familia_id, ts desc);

-- ---------- segurança por linha ----------
alter table public.familias enable row level security;
alter table public.membros enable row level security;
alter table public.convites enable row level security;
create policy familia_ler on public.familias for select using (public.sou_membro(id));
create policy familia_editar on public.familias for update using (public.sou_admin(id)) with check (public.sou_admin(id));
create policy membros_ler on public.membros for select using (public.sou_membro(familia_id));
create policy membros_admin on public.membros for delete using (public.sou_admin(familia_id) and user_id <> auth.uid());
create policy convites_ler on public.convites for select using (public.sou_membro(familia_id));
create policy convites_criar on public.convites for insert with check (public.sou_admin(familia_id));
create policy convites_apagar on public.convites for delete using (public.sou_admin(familia_id));

do $$
declare t text;
begin
  foreach t in array array['pessoas','contas','cartoes','categorias','regras','lancamentos','parcelamentos','recorrencias','ajustes','pagamentos','manuais','dividas','provisoes','provisao_movs','investimentos','invest_movs','importacoes']
  loop
    execute format('alter table public.%I add primary key (familia_id, id)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all using (public.sou_membro(familia_id)) with check (public.sou_membro(familia_id))', t || '_membros', t);
  end loop;
end $$;

-- auditoria: só leitura e inclusão; ninguém edita nem apaga
alter table public.auditoria enable row level security;
create policy auditoria_ler on public.auditoria for select using (public.sou_membro(familia_id));
create policy auditoria_incluir on public.auditoria for insert with check (public.sou_membro(familia_id));

grant execute on function public.criar_familia(text, text, date) to authenticated;
grant execute on function public.aceitar_convite() to authenticated;
grant execute on function public.apagar_dados() to authenticated;
grant execute on function public.minha_familia() to authenticated;
revoke execute on function public.criar_familia(text, text, date) from anon;
revoke execute on function public.aceitar_convite() from anon;
revoke execute on function public.apagar_dados() from anon;

-- permissões explícitas para a API (o acesso real continua limitado pelas políticas acima)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;
