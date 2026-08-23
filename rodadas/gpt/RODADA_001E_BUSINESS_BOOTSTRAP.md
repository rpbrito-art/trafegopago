# RODADA 001E — BOOTSTRAP DE NEGÓCIO

Status: **AUTORIZADA**
Data: 2026-08-23
Branch esperada: `claude/rodada-001e-business-bootstrap`
Relatório esperado: `rodadas/claude/RELATORIO_RODADA_001E_BUSINESS_BOOTSTRAP.md`

## 1. Objetivo

Transformar a fundação Auth + tenancy já promovida em um primeiro fluxo real de produto:

`conta autenticada → criar organização inicial → criar membership owner → criar business_profile → visualizar organização/perfil em /conta`

A criação deve ser atômica, server-side, com identidade verificada e sem abrir escrita direta insegura ao browser.

Esta rodada NÃO fecha toda a Fase 1. Recuperação de senha, gestão de membros, edição ampla, múltiplas organizações e exclusão ficam posteriores.

## 2. READ SET obrigatório

Ler somente o necessário, nesta ordem:

1. `estado.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `docs/00-governanca/ACTIVE_DOCS.md`;
4. este mandato;
5. `docs/00-governanca/HISTORY_SUMMARY.md`;
6. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md` — Fase 1;
7. `docs/01-produto/MVP_CANONICAL.md` — §§4 e 20;
8. `docs/03-canonical/DATA_MODEL.md` — §§1, 2, 16, 17;
9. `docs/03-canonical/SECURITY_MODEL.md` — §§3–6, 12, 15, 18, 20;
10. migrations 001C/001D vigentes;
11. `src/lib/auth/session.ts`, `src/lib/supabase/server.ts`, `src/lib/env/public.ts`, `src/lib/env/server.ts`, `src/app/conta/page.tsx`;
12. documentação oficial Supabase vigente sobre RLS, grants, service role/secret key, funções e Data API.

Não reler relatórios completos de 000–001D salvo dependência concreta.

## 3. Baseline obrigatório antes de mutar

Confirmar no project ref `cbnxdoxpyioxjwgjhbtq`:

- migration history com 4 migrations promovidas;
- `organizations` e `organization_members` existem;
- RLS ativo;
- policies SELECT da 001D presentes;
- `authenticated` somente SELECT nas duas tabelas;
- `anon` sem acesso;
- `service_role` com grants explícitos;
- default privileges de `postgres` endurecidos;
- default global de funções de `postgres` sem PUBLIC EXECUTE;
- `ensure_rls` ativo;
- `rls_auto_enable()` com ACL segura;
- zero objetos `public` owned por `supabase_admin`;
- Advisor sem regressão além do WARN conhecido `auth_leaked_password_protection`.

Se o baseline material divergir, parar antes de mutation e reportar ao GPT.

## 4. Banco — `business_profiles`

Criar por migration nova via CLI oficial vigente:

`public.business_profiles`

Campos mínimos:

- `organization_id uuid primary key references public.organizations(id) on delete cascade`;
- `segment text not null`;
- `location_summary text not null`;
- `primary_offer text not null`;
- `average_ticket_minor bigint null`;
- `currency text not null default 'BRL'`;
- `target_audience text not null`;
- `differentiators text null`;
- `known_objections text null`;
- `acquisition_goal text not null`;
- `commercial_goal_json jsonb null`;
- `created_at timestamptz not null default now()`;
- `updated_at timestamptz not null default now()`.

Constraints obrigatórias:

- textos obrigatórios não vazios após `btrim`;
- limites de tamanho razoáveis e explícitos;
- `average_ticket_minor >= 0` quando não nulo;
- `currency ~ '^[A-Z]{3}$'`;
- `commercial_goal_json` nulo ou objeto JSON.

RLS explicitamente habilitado, mesmo com `ensure_rls` ativo.

## 5. Grants e RLS de `business_profiles`

Princípio: leitura pelo browser; escrita somente pelo caminho privilegiado desta rodada.

- `anon`: nenhum privilégio;
- `authenticated`: somente SELECT;
- `service_role`: grants explícitos necessários;
- nenhuma policy INSERT/UPDATE/DELETE para browser.

Policy SELECT deve permitir somente perfil cuja organização esteja ACTIVE e para a qual o usuário tenha membership própria ACTIVE.

Não usar `user_metadata`/JWT custom claim como fonte de autorização. Basear-se em `organization_members` e `auth.uid()`.

Provar cross-tenant com dois usuários/two orgs.

## 6. Bootstrap atômico da organização inicial

Criar uma função estreita para uso exclusivamente server-side, preferencialmente:

`public.bootstrap_organization_business_profile(...) returns uuid`

Requisitos obrigatórios:

- `SECURITY INVOKER`, não `SECURITY DEFINER`;
- usar nomes de objetos qualificados;
- executar como `service_role` pelo cliente privilegiado do servidor;
- `REVOKE EXECUTE` de `PUBLIC`, `anon` e `authenticated`;
- `GRANT EXECUTE` explícito somente a `service_role` (e owner técnico conforme Postgres);
- não aceitar role enviada pelo browser; membership criada sempre como `owner`, `ACTIVE`;
- criar na mesma transação lógica da função:
  1. `organizations` ACTIVE;
  2. `organization_members` do usuário autenticado como `owner` ACTIVE;
  3. `business_profiles` correspondente;
- qualquer falha deve deixar zero criação parcial;
- função não recebe nem deriva autorização de `user_metadata`;
- `p_user_id` vem exclusivamente da identidade verificada server-side;
- rejeitar bootstrap quando o usuário já possuir qualquer membership existente, evitando duplicação acidental do onboarding inicial;
- proteger contra dupla submissão concorrente de modo reprodutível. Pode usar lock transacional/advisory por `user_id` ou técnica equivalente; provar que duas chamadas concorrentes não criam dois tenants. Se não for possível provar com segurança no ambiente atual, parar e reportar ao GPT em vez de remover a proteção.

O fato de a função estar em `public` não autoriza exposição: o teste deve provar RPC negado para `anon` e `authenticated`.

## 7. Cliente Supabase privilegiado server-only

Introduzir somente agora o cliente prometido em `src/lib/supabase/server.ts`.

Requisitos:

- arquivo `server-only` separado, por exemplo `src/lib/supabase/privileged.ts`;
- usar `SUPABASE_SECRET_KEY` exclusivamente server-side;
- nunca `NEXT_PUBLIC_*`;
- cliente sem cookies/sessão do usuário, sem persistência e sem auto-refresh;
- não reutilizar cliente privilegiado global entre requests se isso puder carregar estado de auth;
- schema de env server-side validado;
- nenhum segredo em logs, erros, testes ou relatório;
- busca estática/teste deve provar que `SUPABASE_SECRET_KEY` não aparece em código client-side/bundle público.

A documentação oficial vigente deve ser revalidada antes de codar, especialmente porque um cliente inicializado com chave privilegiada não deve receber Authorization/cookies do usuário.

## 8. Caso de uso server-side

Criar um application service/Server Action estreito para `CreateInitialBusiness`.

Fluxo obrigatório:

1. verificar identidade com o mecanismo promovido (`requireUser`/`getClaims`), não confiar em campos de identidade do formulário;
2. validar input com Zod;
3. não aceitar `user_id`, `organization_id`, `role`, `status` ou qualquer credencial privilegiada do browser;
4. verificar se já existe membership do usuário; se existir, não criar novo tenant pelo onboarding inicial;
5. chamar a RPC somente com o cliente privilegiado e o `user.id` verificado;
6. tratar conflito/dupla submissão sem criar duplicata;
7. redirecionar para `/conta` após sucesso.

Defaults desta rodada:

- timezone: `America/Sao_Paulo`;
- moeda: `BRL`.

Ticket médio vindo da UI deve ser convertido de forma determinística para unidade menor inteira; não persistir float monetário.

## 9. `/conta` — fluxo mínimo

Preservar proteção server-side e logout promovidos.

Comportamento:

- zero memberships: mostrar formulário simples de criação inicial do negócio;
- exatamente uma membership utilizável: mostrar resumo da organização e do `business_profile`;
- membership existente mas organização indisponível/inativa: não oferecer novo bootstrap silenciosamente; mostrar estado explícito e seguro;
- mais de uma membership: não escolher tenant silenciosamente; mostrar estado explícito informando que seleção multi-org ainda não foi implementada.

Campos do formulário:

- nome da empresa;
- segmento;
- cidade/região;
- produto/serviço/oferta principal;
- ticket médio opcional;
- público-alvo;
- diferenciais opcionais;
- objeções conhecidas opcionais;
- objetivo de aquisição;
- meta comercial opcional.

UI funcional e simples. Não transformar esta rodada em redesign.

## 10. Provas obrigatórias

### 10.1 Banco / segurança

Com fixtures temporárias e limpeza final:

1. usuário A sem membership executa o fluxo privilegiado e cria exatamente 1 org + 1 membership owner + 1 profile;
2. falha de profile/constraint prova atomicidade: zero org/membership residual;
3. chamada concorrente/double-submit para o mesmo usuário produz no máximo um tenant;
4. A lê seu profile pela Data API autenticada;
5. usuário B não lê profile de A;
6. `anon` não lê `business_profiles`;
7. A não consegue INSERT/UPDATE/DELETE direto em `business_profiles`;
8. A não consegue escrever diretamente em `organizations`/`organization_members`;
9. RPC de bootstrap chamada como `authenticated` é negada;
10. RPC como `anon` é negada;
11. `service_role` executa o bootstrap pelo caminho server-only;
12. org/membership/profile INACTIVE/ACTIVE respeitam o contrato de leitura aplicável;
13. limpeza deixa zero fixtures;
14. `ensure_rls`, ACL de `rls_auto_enable`, defaults seguros da 001D e count zero de objetos `public` owned por `supabase_admin` permanecem intactos.

### 10.2 Aplicação

Cobrir com testes proporcionais:

- schema Zod e limites;
- parsing monetário sem float persistido;
- action exige usuário autenticado;
- action não aceita IDs/role/status do browser;
- estado sem org mostra onboarding;
- estado com org/profile mostra resumo;
- submissão duplicada não cria segunda organização;
- erro seguro sem vazar secret.

Não instalar framework E2E pesado apenas por ritual. Reusar infraestrutura existente; criar script de integração real se for a forma mais enxuta de provar Auth/Data API/RPC.

## 11. Gates

Como haverá SQL + TS/React:

- `git diff --check`;
- lint;
- typecheck;
- testes relevantes;
- build;
- migration list local/remoto;
- provas reais de banco/Data API;
- Security Advisor;
- CI remota final completa.

`npm ci` local somente se dependências/lockfile mudarem ou ambiente exigir.

## 12. Fora de escopo

Não implementar nesta rodada:

- recuperação/reset de senha;
- editar organização ou business profile após criação;
- convite de membros;
- alterar role/status/ownership;
- remover membro;
- múltiplas organizações / tenant switcher;
- delete account/organization;
- slug;
- limites financeiros;
- Meta/Instagram;
- Operations/Audit/Queues da Fase 2;
- IA;
- redesign visual amplo.

## 13. Handoff

Relatório compacto em:

`rodadas/claude/RELATORIO_RODADA_001E_BUSINESS_BOOTSTRAP.md`

Meta: até ~150 linhas/15 KB salvo incidente real.

Atualizar `estado.md` somente para:

`RODADA 001E — EXECUTADA — AGUARDANDO AUDITORIA GPT`

Fazer um único push final auditável quando tecnicamente possível.

Não abrir, autorizar ou executar 001F.

## 14. Critério de conclusão

A 001E só pode ser entregue ao GPT se:

- `business_profiles` estiver versionado, protegido e tenant-scoped;
- o primeiro negócio puder ser criado atomicamente a partir de uma sessão real;
- browser não ganhar escrita direta nas tabelas de tenancy/perfil;
- função privilegiada não for chamável por `anon`/`authenticated`;
- secret key permanecer exclusivamente server-side;
- double-submit não puder criar dois tenants para o onboarding inicial;
- `/conta` refletir corretamente zero/uma/múltiplas memberships sem escolher tenant silenciosamente;
- provas reais e CI estiverem verdes;
- zero resíduo permanecer no Supabase remoto;
- nenhuma etapa posterior tiver sido antecipada.
