-- Caixa da Família · administração geral do sistema
-- Toda conta tem um perfil com CPF, status e validade. Conta nova fica "pendente" até um administrador geral liberar.
-- Acesso vencido: só consulta (lê e exporta, não grava). Pendente ou bloqueado: não vê nada.
-- Administradores gerais (João Lucas e Emanoella) são fixados pelo usuário + CPF e enxergam todas as famílias.

-- ---------- CPF ----------
create or replace function public.cpf_valido(p text) returns boolean
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g'); s int; r int; i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if; if r <> substr(d, 10, 1)::int then return false; end if;
  s := 0; for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if; return r = substr(d, 11, 1)::int;
end $$;

-- ---------- tabelas ----------
create table if not exists public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text not null default '',
  cpf text unique check (cpf is null or (cpf ~ '^\d{11}$' and public.cpf_valido(cpf))),
  status text not null default 'pendente' check (status in ('pendente', 'ativo', 'bloqueado')),
  valido_ate date,
  obs text not null default '',
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  aprovado_por text,
  ultimo_acesso timestamptz
);

create table if not exists public.superadmins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cpf text,                      -- fica preso ao primeiro CPF que o administrador cadastrar
  criado_em timestamptz not null default now()
);

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  admin text not null,
  alvo text not null default '',
  acao text not null,
  det text not null default ''
);

alter table public.perfis enable row level security;
alter table public.superadmins enable row level security;
alter table public.admin_log enable row level security;

-- ---------- quem pode o quê ----------
create or replace function public.hoje_br() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create or replace function public.sou_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.superadmins s join public.perfis p on p.user_id = s.user_id
                where s.user_id = auth.uid() and p.cpf is not null and s.cpf = p.cpf)
$$;

-- lê: ativo (mesmo vencido) ou administrador geral
create or replace function public.pode_ler() returns boolean
language sql stable security definer set search_path = public as $$
  select public.sou_superadmin() or exists(select 1 from public.perfis where user_id = auth.uid() and status = 'ativo')
$$;

-- grava: ativo e dentro da validade, ou administrador geral
create or replace function public.pode_escrever() returns boolean
language sql stable security definer set search_path = public as $$
  select public.sou_superadmin() or exists(select 1 from public.perfis where user_id = auth.uid() and status = 'ativo'
                                           and (valido_ate is null or valido_ate >= public.hoje_br()))
$$;

create or replace function public.status_efetivo(p public.perfis) returns text
language sql stable as $$
  select case when p.status = 'ativo' and p.valido_ate is not null and p.valido_ate < public.hoje_br() then 'vencido' else p.status end
$$;

-- ---------- perfil criado junto com a conta ----------
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text := regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g');
begin
  if not public.cpf_valido(c) or exists(select 1 from public.perfis where cpf = c) then c := null; end if;
  insert into public.perfis(user_id, nome, email, cpf) values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), coalesce(new.email, ''), c)
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.novo_usuario();

-- ---------- funções do próprio usuário ----------
create or replace function public.meu_acesso() returns json
language plpgsql security definer set search_path = public as $$
declare p public.perfis; u auth.users;
begin
  if auth.uid() is null then return null; end if;
  select * into p from public.perfis where user_id = auth.uid();
  if not found then
    select * into u from auth.users where id = auth.uid();
    insert into public.perfis(user_id, nome, email) values (u.id, coalesce(u.raw_user_meta_data->>'nome', ''), coalesce(u.email, '')) returning * into p;
  end if;
  update public.perfis set ultimo_acesso = now() where user_id = auth.uid();
  return json_build_object('status', public.status_efetivo(p), 'valido_ate', p.valido_ate, 'cpf_ok', p.cpf is not null,
    'super', public.sou_superadmin(), 'super_pendente', exists(select 1 from public.superadmins where user_id = auth.uid()) and not public.sou_superadmin(),
    'nome', p.nome, 'obs', p.obs);
end $$;

create or replace function public.definir_meu_cpf(p_cpf text) returns json
language plpgsql security definer set search_path = public as $$
declare c text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
begin
  if auth.uid() is null then raise exception 'Sem login'; end if;
  perform public.meu_acesso();
  if not public.cpf_valido(c) then raise exception 'CPF inválido. Confira os números.'; end if;
  if exists(select 1 from public.perfis where user_id = auth.uid() and cpf is not null) then raise exception 'Seu CPF já está cadastrado. Para trocar, fale com os administradores.'; end if;
  if exists(select 1 from public.perfis where cpf = c) then raise exception 'Este CPF já está em outra conta. Fale com os administradores.'; end if;
  if exists(select 1 from public.superadmins where user_id = auth.uid() and cpf is not null and cpf <> c) then raise exception 'Este CPF não confere com o cadastro de administrador.'; end if;
  update public.perfis set cpf = c where user_id = auth.uid();
  update public.superadmins set cpf = c where user_id = auth.uid() and cpf is null;
  return public.meu_acesso();
end $$;

-- ---------- funções dos administradores gerais ----------
create or replace function public.admin_usuarios() returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  return coalesce((select json_agg(x order by x.criado_em desc) from (
    select p.user_id, p.nome, p.email, p.cpf, p.status, public.status_efetivo(p) as efetivo, p.valido_ate, p.obs, p.criado_em, p.aprovado_em, p.aprovado_por,
           greatest(p.ultimo_acesso, u.last_sign_in_at) as ultimo_acesso, u.email_confirmed_at is not null as email_confirmado,
           m.familia_id, f.nome as familia, m.papel, m.nome as nome_na_familia,
           exists(select 1 from public.superadmins s where s.user_id = p.user_id) as superadmin
    from public.perfis p join auth.users u on u.id = p.user_id
    left join public.membros m on m.user_id = p.user_id left join public.familias f on f.id = m.familia_id) x), '[]'::json);
end $$;

create or replace function public.admin_familias() returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  return coalesce((select json_agg(x order by x.criado_em desc) from (
    select f.id, f.nome, f.inicio, f.criado_em,
      (select json_agg(json_build_object('user_id', m.user_id, 'nome', m.nome, 'email', m.email, 'papel', m.papel) order by m.criado_em) from public.membros m where m.familia_id = f.id) as membros,
      (select count(*) from public.convites c where c.familia_id = f.id) as convites,
      (select count(*) from public.lancamentos l where l.familia_id = f.id) as lancamentos,
      (select count(*) from public.contas c where c.familia_id = f.id) as contas,
      (select count(*) from public.cartoes c where c.familia_id = f.id) as cartoes,
      (select count(*) from public.recorrencias r where r.familia_id = f.id) as recorrencias,
      (select max(a.ts) from public.auditoria a where a.familia_id = f.id) as ultima_atividade
    from public.familias f) x), '[]'::json);
end $$;

create or replace function public.admin_definir_acesso(p_user uuid, p_status text, p_valido_ate date, p_obs text) returns void
language plpgsql security definer set search_path = public as $$
declare antes public.perfis; quem text := coalesce(auth.jwt()->>'email', '');
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  if p_status not in ('pendente', 'ativo', 'bloqueado') then raise exception 'Status inválido'; end if;
  select * into antes from public.perfis where user_id = p_user;
  if not found then raise exception 'Usuário não encontrado'; end if;
  if exists(select 1 from public.superadmins where user_id = p_user) and (p_status <> 'ativo' or p_valido_ate is not null) then
    raise exception 'Administradores gerais não podem ser bloqueados nem ter prazo';
  end if;
  update public.perfis set status = p_status, valido_ate = p_valido_ate, obs = coalesce(p_obs, obs),
    aprovado_em = case when p_status = 'ativo' and antes.status <> 'ativo' then now() else aprovado_em end,
    aprovado_por = case when p_status = 'ativo' and antes.status <> 'ativo' then quem else aprovado_por end
  where user_id = p_user;
  insert into public.admin_log(admin, alvo, acao, det) values (quem, antes.email,
    case when p_status = 'ativo' and antes.status = 'pendente' then 'Liberou acesso'
         when p_status = 'ativo' and antes.status = 'bloqueado' then 'Desbloqueou'
         when p_status = 'bloqueado' then 'Bloqueou'
         when p_status = 'pendente' then 'Voltou para pendente'
         else 'Alterou acesso' end,
    'status ' || public.status_efetivo(antes) || ' → ' || p_status || ', validade ' || coalesce(to_char(antes.valido_ate, 'DD/MM/YYYY'), 'sem prazo') || ' → ' || coalesce(to_char(p_valido_ate, 'DD/MM/YYYY'), 'sem prazo')
      || case when coalesce(p_obs, antes.obs) <> antes.obs then ', obs: ' || p_obs else '' end);
end $$;

create or replace function public.admin_corrigir_cpf(p_user uuid, p_cpf text) returns void
language plpgsql security definer set search_path = public as $$
declare c text := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), ''); e text;
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  if exists(select 1 from public.superadmins where user_id = p_user) then raise exception 'O CPF de administrador geral só muda direto no banco'; end if;
  if c is not null and not public.cpf_valido(c) then raise exception 'CPF inválido'; end if;
  if c is not null and exists(select 1 from public.perfis where cpf = c and user_id <> p_user) then raise exception 'Este CPF já está em outra conta'; end if;
  update public.perfis set cpf = c where user_id = p_user returning email into e;
  insert into public.admin_log(admin, alvo, acao, det) values (coalesce(auth.jwt()->>'email', ''), coalesce(e, ''), 'Corrigiu CPF', coalesce('***.' || substr(c, 4, 3) || '.***-**', 'removido'));
end $$;

-- registra no histórico geral quando um administrador abre os dados de outra família
create or replace function public.admin_registrar(p_acao text, p_alvo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  insert into public.admin_log(admin, alvo, acao) values (coalesce(auth.jwt()->>'email', ''), left(coalesce(p_alvo, ''), 200), left(coalesce(p_acao, ''), 200));
end $$;

-- ---------- regras por linha ----------
drop policy if exists perfis_ler on public.perfis;
drop policy if exists superadmins_ler on public.superadmins;
drop policy if exists admin_log_ler on public.admin_log;
create policy perfis_ler on public.perfis for select using (user_id = auth.uid() or (select public.sou_superadmin()));
create policy superadmins_ler on public.superadmins for select using (user_id = auth.uid());
create policy admin_log_ler on public.admin_log for select using ((select public.sou_superadmin()));

-- família, membros e convites
drop policy if exists familia_ler on public.familias;
drop policy if exists familia_editar on public.familias;
create policy familia_ler on public.familias for select using ((public.sou_membro(id) and (select public.pode_ler())) or (select public.sou_superadmin()));
create policy familia_editar on public.familias for update using (public.sou_admin(id) and (select public.pode_escrever())) with check (public.sou_admin(id) and (select public.pode_escrever()));
drop policy if exists membros_ler on public.membros;
drop policy if exists membros_admin on public.membros;
create policy membros_ler on public.membros for select using ((public.sou_membro(familia_id) and (select public.pode_ler())) or (select public.sou_superadmin()));
create policy membros_admin on public.membros for delete using (public.sou_admin(familia_id) and user_id <> auth.uid() and (select public.pode_escrever()));
drop policy if exists convites_ler on public.convites;
drop policy if exists convites_criar on public.convites;
drop policy if exists convites_apagar on public.convites;
create policy convites_ler on public.convites for select using ((public.sou_membro(familia_id) and (select public.pode_ler())) or (select public.sou_superadmin()));
create policy convites_criar on public.convites for insert with check (public.sou_admin(familia_id) and (select public.pode_escrever()));
create policy convites_apagar on public.convites for delete using (public.sou_admin(familia_id) and (select public.pode_escrever()));

-- dados financeiros: ler (membro ativo/vencido ou administrador geral), gravar (membro dentro da validade)
do $$
declare t text;
begin
  foreach t in array array['pessoas','contas','cartoes','categorias','regras','lancamentos','parcelamentos','recorrencias','ajustes','pagamentos','manuais','dividas','provisoes','provisao_movs','investimentos','invest_movs','importacoes']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_membros', t);
    execute format('drop policy if exists %I on public.%I', t || '_ler', t);
    execute format('drop policy if exists %I on public.%I', t || '_incluir', t);
    execute format('drop policy if exists %I on public.%I', t || '_alterar', t);
    execute format('drop policy if exists %I on public.%I', t || '_excluir', t);
    execute format('create policy %I on public.%I for select using ((public.sou_membro(familia_id) and (select public.pode_ler())) or (select public.sou_superadmin()))', t || '_ler', t);
    execute format('create policy %I on public.%I for insert with check (public.sou_membro(familia_id) and (select public.pode_escrever()))', t || '_incluir', t);
    execute format('create policy %I on public.%I for update using (public.sou_membro(familia_id) and (select public.pode_escrever())) with check (public.sou_membro(familia_id) and (select public.pode_escrever()))', t || '_alterar', t);
    execute format('create policy %I on public.%I for delete using (public.sou_membro(familia_id) and (select public.pode_escrever()))', t || '_excluir', t);
  end loop;
end $$;

drop policy if exists auditoria_ler on public.auditoria;
drop policy if exists auditoria_incluir on public.auditoria;
create policy auditoria_ler on public.auditoria for select using ((public.sou_membro(familia_id) and (select public.pode_ler())) or (select public.sou_superadmin()));
create policy auditoria_incluir on public.auditoria for insert with check (public.sou_membro(familia_id) and (select public.pode_escrever()));

drop policy if exists mensagens_ler on public.mensagens;
drop policy if exists mensagens_enviar on public.mensagens;
drop policy if exists mensagens_apagar_propria on public.mensagens;
create policy mensagens_ler on public.mensagens for select using ((public.sou_membro(familia_id) and (select public.pode_ler())) or (select public.sou_superadmin()));
create policy mensagens_enviar on public.mensagens for insert with check (public.sou_membro(familia_id) and user_id = auth.uid() and (select public.pode_escrever()));
create policy mensagens_apagar_propria on public.mensagens for update
  using (user_id = auth.uid() and public.sou_membro(familia_id) and (select public.pode_escrever()))
  with check (user_id = auth.uid() and public.sou_membro(familia_id) and (select public.pode_escrever()));

-- criar família, aceitar convite e apagar dados exigem acesso liberado
create or replace function public.criar_familia(p_nome text, p_pessoa text, p_inicio date) returns uuid
language plpgsql security definer set search_path = public as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'Sem login'; end if;
  if not public.pode_escrever() then raise exception 'Seu acesso ainda não foi liberado pelos administradores'; end if;
  if exists(select 1 from public.membros where user_id = auth.uid()) then raise exception 'Você já faz parte de uma família'; end if;
  insert into public.familias(nome, inicio) values (p_nome, p_inicio) returning id into f;
  insert into public.membros(familia_id, user_id, nome, email, papel)
    values (f, auth.uid(), p_pessoa, coalesce(auth.jwt()->>'email',''), 'admin');
  return f;
end $$;

create or replace function public.aceitar_convite() returns uuid
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then return null; end if;
  if exists(select 1 from public.membros where user_id = auth.uid()) then return public.minha_familia(); end if;
  if not public.pode_escrever() then return null; end if;
  select * into c from public.convites where lower(email) = lower(auth.jwt()->>'email') order by criado_em limit 1;
  if c is null then return null; end if;
  insert into public.membros(familia_id, user_id, nome, email, papel) values (c.familia_id, auth.uid(), c.nome, c.email, c.papel);
  delete from public.convites where id = c.id;
  return c.familia_id;
end $$;

create or replace function public.apagar_dados() returns void
language plpgsql security definer set search_path = public as $$
declare f uuid := public.minha_familia();
begin
  if not public.sou_admin(f) or not public.pode_escrever() then raise exception 'Só administradores com acesso em dia podem apagar os dados'; end if;
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

-- ---------- permissões da API ----------
revoke all on public.perfis, public.superadmins, public.admin_log from anon;
grant select on public.perfis, public.superadmins, public.admin_log to authenticated;
revoke insert, update, delete on public.perfis, public.superadmins, public.admin_log from authenticated;
do $$
declare fn text;
begin
  foreach fn in array array['meu_acesso()', 'definir_meu_cpf(text)', 'admin_usuarios()', 'admin_familias()', 'admin_definir_acesso(uuid, text, date, text)', 'admin_corrigir_cpf(uuid, text)', 'admin_registrar(text, text)', 'sou_superadmin()', 'pode_ler()', 'pode_escrever()']
  loop
    execute 'revoke execute on function public.' || fn || ' from public, anon';
    execute 'grant execute on function public.' || fn || ' to authenticated';
  end loop;
end $$;
revoke execute on function public.novo_usuario() from public, anon, authenticated;

-- ---------- quem já existe ----------
-- contas atuais continuam liberadas, sem prazo
insert into public.perfis(user_id, nome, email, status, aprovado_em, aprovado_por)
select u.id, coalesce(m.nome, u.raw_user_meta_data->>'nome', ''), coalesce(u.email, ''), 'ativo', now(), 'migração'
from auth.users u left join public.membros m on m.user_id = u.id
on conflict (user_id) do nothing;

-- administradores gerais: João Lucas e Emanoella (Família Pujol). O CPF fica preso no primeiro cadastro de cada um.
insert into public.superadmins(user_id)
select distinct u.id from auth.users u left join public.membros m on m.user_id = u.id left join public.familias f on f.id = m.familia_id
where lower(u.email) = 'joaol.pujol@gmail.com' or f.nome = 'Família Pujol'
on conflict (user_id) do nothing;
