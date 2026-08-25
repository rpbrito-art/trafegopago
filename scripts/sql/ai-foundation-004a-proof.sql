-- Prova do delta da Rodada 004A + Correção 004A-01 — fundação de IA.
--
-- Transacional: tudo roda dentro de `begin … rollback`, então não há resíduo a
-- limpar e nenhuma fixture sobrevive. As fixtures são sintéticas — nenhum
-- provider real, nenhum preço real, nenhum segredo, nenhuma PII.
--
-- Os casos negativos rodam dentro de blocos com `exception`, capturando o
-- SQLSTATE em vez de abortar o script. Assim tudo executa numa passagem e o
-- resultado final é uma única tabela de veredictos.
--
-- Uso:
--   npx supabase db query --linked --file scripts/sql/ai-foundation-004a-proof.sql

begin;

create temporary table prova_004a (
  ordem serial,
  nome text,
  esperado text,
  obtido text,
  passou boolean
) on commit drop;

do $$
declare
  org_a uuid;
  org_b uuid;
  prov_1 uuid; prov_2 uuid;
  mod_1 uuid; mod_2 uuid; mod_expirado uuid;
  price_1 uuid; price_2 uuid;
  run_a uuid;
  achados int;
begin
  -- ---------------------------------------------------------------- fixtures
  select id into org_a from public.organizations order by created_at limit 1;
  insert into public.organizations (name) values ('FIXTURE 004A PROVA') returning id into org_b;

  insert into public.ai_providers (key, name) values ('fixture-004a-1','Fixture 1') returning id into prov_1;
  insert into public.ai_providers (key, name) values ('fixture-004a-2','Fixture 2') returning id into prov_2;

  insert into public.ai_models (provider_id, model_key, tier, capability_tags, supports_structured_output)
    values (prov_1,'fx-mini',1,array['TEXT_CLASSIFICATION'],true) returning id into mod_1;
  insert into public.ai_models (provider_id, model_key, tier, capability_tags, supports_structured_output)
    values (prov_2,'fx-outro',2,array['REASONING'],true) returning id into mod_2;

  -- Modelo ACTIVE cuja vigência já terminou: status descreve saúde, vigência
  -- descreve se ainda deve ser usado.
  insert into public.ai_models (provider_id, model_key, tier, capability_tags, status,
      effective_from, effective_to)
    values (prov_1,'fx-expirado',1,array['TEXT_CLASSIFICATION'],'ACTIVE',
      now() - interval '30 days', now() - interval '1 day')
    returning id into mod_expirado;

  insert into public.ai_price_versions (ai_model_id, input_price_per_million, output_price_per_million, currency, effective_from)
    values (mod_1, 0.15, 0.60, 'USD', now() - interval '1 day') returning id into price_1;
  insert into public.ai_price_versions (ai_model_id, input_price_per_million, output_price_per_million, currency, effective_from)
    values (mod_2, 1.00, 2.00, 'USD', now() - interval '1 day') returning id into price_2;

  -- ------------------------------------------------------------- catálogo
  begin
    insert into public.ai_models (provider_id, model_key, tier, capability_tags)
      values (prov_1,'fx-tier0',0,array['LOW_COST']);
    insert into prova_004a (nome,esperado,obtido,passou) values ('tier 0 recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('tier 0 recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.ai_models (provider_id, model_key, tier, status)
      values (prov_1,'fx-status',1,'LIGADO');
    insert into prova_004a (nome,esperado,obtido,passou) values ('status de modelo invalido recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('status de modelo invalido recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.ai_models (provider_id, model_key, tier, capability_tags)
      values (prov_1,'fx-blank',1,array['']);
    insert into prova_004a (nome,esperado,obtido,passou) values ('capability vazia recusada','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('capability vazia recusada','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.ai_providers (key, name, status) values ('fixture-004a-3','Fixture 3','QUEBRADO');
    insert into prova_004a (nome,esperado,obtido,passou) values ('status de provider invalido recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('status de provider invalido recusado','23514',sqlstate,sqlstate='23514');
  end;

  -- ---------------------------------------------------------------- preços
  begin
    insert into public.ai_price_versions (ai_model_id, input_price_per_million, output_price_per_million, currency, effective_from)
      values (mod_1, -0.1, 0.6, 'USD', now());
    insert into prova_004a (nome,esperado,obtido,passou) values ('preco negativo recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('preco negativo recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.ai_price_versions (ai_model_id, input_price_per_million, output_price_per_million, currency, effective_from)
      values (mod_1, 0.1, 0.6, 'dolar', now());
    insert into prova_004a (nome,esperado,obtido,passou) values ('moeda fora de ISO 4217 recusada','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('moeda fora de ISO 4217 recusada','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.ai_price_versions (ai_model_id, input_price_per_million, output_price_per_million, currency, effective_from, effective_to)
      values (mod_1, 0.1, 0.6, 'USD', now(), now() - interval '1 day');
    insert into prova_004a (nome,esperado,obtido,passou) values ('vigencia invertida recusada','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('vigencia invertida recusada','23514',sqlstate,sqlstate='23514');
  end;

  -- Sem isto, "o preço vigente" seria ambíguo e o custo viraria uma escolha.
  begin
    insert into public.ai_price_versions (ai_model_id, input_price_per_million, output_price_per_million, currency, effective_from)
      values (mod_1, 0.2, 0.7, 'USD', now());
    insert into prova_004a (nome,esperado,obtido,passou) values ('segunda price version aberta recusada','23505','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('segunda price version aberta recusada','23505',sqlstate,sqlstate='23505');
  end;

  -- Grants, verificados na ACL e não por tentativa.
  --
  -- Este script roda como owner, que ignora grant: um `update` bem-sucedido
  -- aqui não provaria nada sobre o que `service_role` pode fazer. O que prova é
  -- a ACL da tabela.
  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) x
    join pg_roles r on r.oid = x.grantee
   where n.nspname = 'public'
     and c.relname = 'ai_price_versions'
     and r.rolname = 'service_role'
     and x.privilege_type in ('UPDATE','DELETE');

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('service_role sem UPDATE/DELETE em ai_price_versions','0',achados::text,achados=0);

  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) x
    join pg_roles r on r.oid = x.grantee
   where n.nspname = 'public'
     and c.relname = 'ai_runs'
     and r.rolname = 'service_role'
     and x.privilege_type = 'DELETE';

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('service_role sem DELETE em ai_runs','0',achados::text,achados=0);

  -- Browser não alcança nenhuma das quatro tabelas, nem para leitura.
  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) x
    join pg_roles r on r.oid = x.grantee
   where n.nspname = 'public'
     and c.relname in ('ai_providers','ai_models','ai_price_versions','ai_runs')
     and r.rolname in ('anon','authenticated');

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('anon/authenticated sem grant algum nas quatro tabelas','0',achados::text,achados=0);

  -- RLS habilitado e zero policies nas quatro.
  select count(*) into achados
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('ai_providers','ai_models','ai_price_versions','ai_runs')
     and c.relrowsecurity;

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('RLS habilitado nas quatro tabelas','4',achados::text,achados=4);

  select count(*) into achados
    from pg_policies
   where schemaname = 'public'
     and tablename in ('ai_providers','ai_models','ai_price_versions','ai_runs');

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('zero policies: browser nao le nem com grant','0',achados::text,achados=0);

  -- ------------------------------------------------------------------ runs
  insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
      ai_price_version_id, tier, prompt_version, schema_version)
    values (org_a,'fixture.prova','1',prov_1,mod_1,price_1,1,'p1','s1') returning id into run_a;
  insert into prova_004a (nome,esperado,obtido,passou) values ('run STARTED valido aceito','ok','ok',true);

  begin
    insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
        ai_price_version_id, tier, prompt_version, schema_version)
      values (org_a,'fixture.prova','1',prov_2,mod_1,price_1,1,'p1','s1');
    insert into prova_004a (nome,esperado,obtido,passou) values ('provider de outro modelo recusado','23503','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('provider de outro modelo recusado','23503',sqlstate,sqlstate='23503');
  end;

  begin
    insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
        ai_price_version_id, tier, prompt_version, schema_version)
      values (org_a,'fixture.prova','1',prov_1,mod_1,price_2,1,'p1','s1');
    insert into prova_004a (nome,esperado,obtido,passou) values ('preco de outro modelo recusado','23503','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('preco de outro modelo recusado','23503',sqlstate,sqlstate='23503');
  end;

  begin
    insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
        tier, prompt_version, schema_version)
      values (org_a,'fixture.prova','1',prov_1,mod_1,1,'p1','s1');
    insert into prova_004a (nome,esperado,obtido,passou) values ('run sem price version recusado','23502','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('run sem price version recusado','23502',sqlstate,sqlstate='23502');
  end;

  begin
    update public.ai_runs set input_tokens = -5 where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('tokens negativos recusados','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('tokens negativos recusados','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set estimated_cost = -1, currency = 'USD' where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('custo negativo recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('custo negativo recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set estimated_cost = 0.0001 where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('custo sem moeda recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('custo sem moeda recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set tier = 0 where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('tier 0 em run recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('tier 0 em run recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set confidence = 1.5 where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('confidence fora de 0..1 recusada','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('confidence fora de 0..1 recusada','23514',sqlstate,sqlstate='23514');
  end;

  -- --------------------------------------------------- invariantes de estado
  begin
    update public.ai_runs set status='SUCCEEDED', completed_at=now() where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('SUCCEEDED sem custo recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('SUCCEEDED sem custo recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set status='FAILED', error_class='UNKNOWN' where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('terminal sem completed_at recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('terminal sem completed_at recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set completed_at=now() where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('STARTED com completed_at recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('STARTED com completed_at recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set status='FAILED', completed_at=now() where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('FAILED sem error_class recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('FAILED sem error_class recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set status='SUCCEEDED', completed_at=now(), estimated_cost=0.0001,
      currency='USD', error_class='UNKNOWN' where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('SUCCEEDED com error_class recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('SUCCEEDED com error_class recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    update public.ai_runs set error_class = 'DEU_RUIM' where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('error_class fora da taxonomia recusada','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('error_class fora da taxonomia recusada','23514',sqlstate,sqlstate='23514');
  end;

  -- Conclusão legítima, para provar que o caminho feliz passa.
  begin
    update public.ai_runs set status='SUCCEEDED', completed_at=now(),
      estimated_cost=0.000525300000, currency='USD', input_tokens=1234, output_tokens=567
      where id = run_a;
    insert into prova_004a (nome,esperado,obtido,passou) values ('SUCCEEDED com custo e moeda aceito','ok','ok',true);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('SUCCEEDED com custo e moeda aceito','ok',sqlstate,false);
  end;

  -- ------------------------------------------------------------- tenancy
  begin
    insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
        ai_price_version_id, tier, prompt_version, schema_version, fallback_from_run_id)
      values (org_b,'fixture.prova','1',prov_1,mod_1,price_1,1,'p1','s1', run_a);
    insert into prova_004a (nome,esperado,obtido,passou) values ('fallback cross-tenant recusado','23503','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('fallback cross-tenant recusado','23503',sqlstate,sqlstate='23503');
  end;

  begin
    insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
        ai_price_version_id, tier, prompt_version, schema_version, fallback_from_run_id)
      values (null,'fixture.prova','1',prov_1,mod_1,price_1,1,'p1','s1', run_a);
    insert into prova_004a (nome,esperado,obtido,passou) values ('fallback em run global recusado','23514','ACEITOU',false);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('fallback em run global recusado','23514',sqlstate,sqlstate='23514');
  end;

  begin
    insert into public.ai_runs (organization_id, task_type, task_version, provider_id, ai_model_id,
        ai_price_version_id, tier, prompt_version, schema_version, fallback_from_run_id)
      values (org_a,'fixture.prova','1',prov_1,mod_1,price_1,1,'p1','s1', run_a);
    insert into prova_004a (nome,esperado,obtido,passou) values ('fallback no mesmo tenant aceito','ok','ok',true);
  exception when others then
    insert into prova_004a (nome,esperado,obtido,passou) values ('fallback no mesmo tenant aceito','ok',sqlstate,false);
  end;

  -- ------------------------------------------------------------- vigência
  select count(*) into achados
    from public.ai_models m
   where m.id = mod_expirado
     and m.effective_from <= now()
     and (m.effective_to is null or m.effective_to > now());

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('modelo ACTIVE expirado fora da janela vigente','0',achados::text,achados=0);

  select count(*) into achados
    from public.ai_models m
   where m.id = mod_1
     and m.effective_from <= now()
     and (m.effective_to is null or m.effective_to > now());

  insert into prova_004a (nome,esperado,obtido,passou)
    values ('modelo vigente dentro da janela','1',achados::text,achados=1);
end $$;

-- ---------------------------------------------------------------------------
-- Veredicto — um único resultado, porque o CLI imprime apenas o último.
-- ---------------------------------------------------------------------------

select
  count(*) as casos,
  count(*) filter (where passou) as passaram,
  count(*) filter (where not passou) as falharam,
  string_agg(
    format('%s %s (esperado %s, obtido %s)',
      case when passou then '[OK]' else '[FALHOU]' end, nome, esperado, obtido),
    E'
' order by ordem
  ) as detalhe
from prova_004a;

-- Nada sobrevive: o rollback desfaz fixtures e escritas. A ausência de resíduo
-- é conferida por leitura separada, depois desta transação.
rollback;
