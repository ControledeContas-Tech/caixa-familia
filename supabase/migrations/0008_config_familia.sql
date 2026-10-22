-- 0008: ajustes compartilhados pela família (análises, gastos variáveis estimados, planejador de quitação)
-- Pode rodar mais de uma vez.
alter table public.familias add column if not exists config jsonb not null default '{}'::jsonb;

create or replace function public.salvar_config(p_familia uuid, p_chave text, p_valor jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.sou_membro(p_familia) and public.pode_escrever()) then raise exception 'sem permissão para alterar esta família'; end if;
  if p_chave not in ('analises', 'varMes', 'simOrc') then raise exception 'ajuste desconhecido: %', p_chave; end if;
  update public.familias set config = jsonb_set(coalesce(config, '{}'::jsonb), array[p_chave], coalesce(p_valor, 'null'::jsonb), true) where id = p_familia;
  insert into public.familia_versao as v (familia_id, versao, por, em) values (p_familia, 1, auth.uid(), now())
  on conflict (familia_id) do update set versao = v.versao + 1, por = auth.uid(), em = now();
end $$;
revoke all on function public.salvar_config(uuid, text, jsonb) from public;
grant execute on function public.salvar_config(uuid, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
