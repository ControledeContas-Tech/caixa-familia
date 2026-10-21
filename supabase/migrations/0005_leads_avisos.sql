-- Caixa da Família · leads (novos cadastros) com aviso no app e por e-mail
-- Cada conta nova vira um "lead" destacado na Administração até um administrador geral agir ou marcar como visto.
-- E-mail: enviado pelo Brevo (plano gratuito) a partir do próprio banco, com a chave guardada no Vault do Supabase:
--   select vault.create_secret('<chave da API do Brevo>', 'brevo_api_key');
--   select vault.create_secret('<e-mail remetente verificado no Brevo>', 'email_remetente');
-- Sem essas duas chaves o cadastro funciona normalmente; só o e-mail fica registrado como "não configurado".

create extension if not exists pg_net;

alter table public.perfis add column if not exists visto_admin boolean not null default false;
update public.perfis set visto_admin = true where status <> 'pendente' or criado_em < now() - interval '1 day';

create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  para text not null default '',
  assunto text not null default '',
  req_id bigint,
  erro text
);
alter table public.email_log enable row level security;
drop policy if exists email_log_ler on public.email_log;
create policy email_log_ler on public.email_log for select using ((select public.sou_superadmin()));
revoke all on public.email_log from anon;
grant select on public.email_log to authenticated;

-- ---------- envio de e-mail ----------
create or replace function public.segredo(p_nome text) returns text
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v using p_nome;
  exception when others then v := null;
  end;
  return nullif(btrim(coalesce(v, '')), '');
end $$;
revoke execute on function public.segredo(text) from public, anon, authenticated;

create or replace function public.html_seguro(t text) returns text
language sql immutable as $$ select replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;') $$;

create or replace function public.enviar_email_admins(p_assunto text, p_html text) returns text
language plpgsql security definer set search_path = public as $$
declare k text := public.segredo('brevo_api_key'); rem text := public.segredo('email_remetente'); dest jsonb; para text; req bigint;
begin
  select jsonb_agg(jsonb_build_object('email', u.email)), string_agg(u.email, ', ')
    into dest, para from public.superadmins s join auth.users u on u.id = s.user_id where coalesce(u.email, '') <> '';
  if dest is null then
    insert into public.email_log(assunto, erro) values (p_assunto, 'Nenhum administrador geral com e-mail'); return 'sem destinatário';
  end if;
  if k is null or rem is null then
    insert into public.email_log(para, assunto, erro) values (para, p_assunto, 'Envio de e-mail não configurado (falta a chave do Brevo no Vault)'); return 'não configurado';
  end if;
  begin
    select net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      body := jsonb_build_object('sender', jsonb_build_object('name', 'Caixa da Família', 'email', rem), 'to', dest, 'subject', p_assunto, 'htmlContent', p_html),
      headers := jsonb_build_object('api-key', k, 'Content-Type', 'application/json', 'accept', 'application/json'),
      timeout_milliseconds := 8000) into req;
    insert into public.email_log(para, assunto, req_id) values (para, p_assunto, req);
    return 'enviado';
  exception when others then
    insert into public.email_log(para, assunto, erro) values (para, p_assunto, left(sqlerrm, 300)); return 'erro';
  end;
end $$;
revoke execute on function public.enviar_email_admins(text, text) from public, anon, authenticated;

-- ao criar perfil (conta nova): e-mail para os administradores gerais. Nunca impede o cadastro.
create or replace function public.avisar_novo_cadastro() returns trigger
language plpgsql security definer set search_path = public as $$
declare cpf_m text := case when new.cpf is null then 'não informado' else '***.' || substr(new.cpf, 4, 3) || '.' || substr(new.cpf, 7, 3) || '-**' end;
begin
  if new.status <> 'pendente' then return new; end if;
  begin
    perform public.enviar_email_admins(
      'Novo cadastro no Caixa da Família: ' || coalesce(nullif(new.nome, ''), new.email),
      '<div style="font-family:Arial,sans-serif;font-size:15px;color:#1d2420">'
      || '<h2 style="margin:0 0 12px">Nova conta aguardando liberação</h2>'
      || '<p><b>Nome:</b> ' || public.html_seguro(coalesce(nullif(new.nome, ''), '—')) || '<br><b>E-mail:</b> ' || public.html_seguro(new.email)
      || '<br><b>CPF:</b> ' || cpf_m || '<br><b>Criada em:</b> ' || to_char(new.criado_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || '</p>'
      || '<p>Abra o app, vá em <b>Administração → Leads</b> e escolha Liberar (com prazo) ou Bloquear.</p>'
      || '<p><a href="https://controledecontas-tech.github.io/caixa-familia/" style="background:#0f6b55;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir o Caixa da Família</a></p>'
      || '<p style="color:#6b746f;font-size:12px">Aviso automático enviado só para os administradores gerais.</p></div>');
  exception when others then null;
  end;
  return new;
end $$;
revoke execute on function public.avisar_novo_cadastro() from public, anon, authenticated;
drop trigger if exists ao_criar_perfil on public.perfis;
create trigger ao_criar_perfil after insert on public.perfis for each row execute function public.avisar_novo_cadastro();

-- ---------- funções da Administração ----------
create or replace function public.admin_usuarios() returns json
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  return coalesce((select json_agg(x order by x.criado_em desc) from (
    select p.user_id, p.nome, p.email, p.cpf, p.status, public.status_efetivo(p) as efetivo, p.valido_ate, p.obs, p.criado_em, p.aprovado_em, p.aprovado_por,
           p.visto_admin, greatest(p.ultimo_acesso, u.last_sign_in_at) as ultimo_acesso, u.email_confirmed_at is not null as email_confirmado,
           m.familia_id, f.nome as familia, m.papel, m.nome as nome_na_familia,
           exists(select 1 from public.superadmins s where s.user_id = p.user_id) as superadmin
    from public.perfis p join auth.users u on u.id = p.user_id
    left join public.membros m on m.user_id = p.user_id left join public.familias f on f.id = m.familia_id) x), '[]'::json);
end $$;

-- contagem leve para o aviso no menu (consultada a cada minuto)
create or replace function public.admin_leads_resumo() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then return null; end if;
  return (select json_build_object('novos', count(*) filter (where not visto_admin and status = 'pendente'), 'pendentes', count(*) filter (where status = 'pendente'),
    'ultimos', (select json_agg(json_build_object('user_id', user_id, 'nome', nome, 'email', email, 'criado_em', criado_em) order by criado_em desc)
                from (select * from public.perfis where status = 'pendente' and not visto_admin order by criado_em desc limit 5) z))
    from public.perfis);
end $$;

create or replace function public.admin_marcar_vistos(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  update public.perfis set visto_admin = true where (p_user is null or user_id = p_user) and not visto_admin;
end $$;

-- liberar ou bloquear também tira o destaque de "novo"
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
  update public.perfis set status = p_status, valido_ate = p_valido_ate, obs = coalesce(p_obs, obs), visto_admin = true,
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

-- situação do e-mail: configurado? últimos envios e resposta do Brevo
create or replace function public.admin_email_status() returns json
language plpgsql security definer set search_path = public as $$
declare r json;
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  begin
    select json_agg(x order by x.ts desc) into r from (
      select e.ts, e.para, e.assunto, coalesce(e.erro, h.error_msg) as erro, h.status_code
      from public.email_log e left join net._http_response h on h.id = e.req_id order by e.id desc limit 10) x;
  exception when others then
    select json_agg(x order by x.ts desc) into r from (select e.ts, e.para, e.assunto, e.erro, null::int as status_code from public.email_log e order by e.id desc limit 10) x;
  end;
  return json_build_object('configurado', public.segredo('brevo_api_key') is not null and public.segredo('email_remetente') is not null, 'envios', coalesce(r, '[]'::json));
end $$;

create or replace function public.admin_email_teste() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not public.sou_superadmin() then raise exception 'Acesso restrito aos administradores gerais'; end if;
  insert into public.admin_log(admin, alvo, acao) values (coalesce(auth.jwt()->>'email', ''), '', 'Enviou e-mail de teste');
  return public.enviar_email_admins('Teste de aviso · Caixa da Família',
    '<div style="font-family:Arial,sans-serif;font-size:15px">Este é um e-mail de teste. Quando alguém criar conta no Caixa da Família, o aviso chega assim, para os dois administradores gerais.</div>');
end $$;

do $$
declare fn text;
begin
  foreach fn in array array['admin_leads_resumo()', 'admin_marcar_vistos(uuid)', 'admin_email_status()', 'admin_email_teste()', 'admin_usuarios()', 'admin_definir_acesso(uuid, text, date, text)']
  loop
    execute 'revoke execute on function public.' || fn || ' from public, anon';
    execute 'grant execute on function public.' || fn || ' to authenticated';
  end loop;
end $$;

-- aviso em tempo real no app (só quem pode ler perfis recebe: o próprio usuário e os administradores gerais)
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'perfis') then
    alter publication supabase_realtime add table public.perfis;
  end if;
end $$;
