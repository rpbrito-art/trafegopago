# AUDITORIA — RODADA 001E — BOOTSTRAP DE NEGÓCIO

Data: 2026-08-23
Classificação: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**
Mandato: `rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`
Relatório executor: `rodadas/claude/RELATORIO_RODADA_001E_BUSINESS_BOOTSTRAP.md`
PR: #6
Head técnico original: `5fe60ea3ea56db7c1c5fc53d6a9f97a848d72466`
Head reconciliado: `f2695300e99db3ca5b61a88160c0d94b0a30198f`
Merge: `7cf7786320f49c1d5b3f486f4ba8ca4919fa2ffd`
CI final reconciliada: run `32638010339` — success
Supabase: `cbnxdoxpyioxjwgjhbtq`

## 1. Escopo auditado

A auditoria verificou independentemente:

- diff e commit da branch;
- migration `20260823111051_create_business_profiles_and_bootstrap.sql`;
- schema, constraints, grants e RLS efetivos no Supabase remoto;
- ACL e propriedades da RPC de bootstrap;
- cliente Supabase privilegiado server-only;
- identidade verificada e fronteira da Server Action;
- prevenção de dupla submissão;
- script real de Auth/JWT/Data API;
- estado final sem fixtures;
- segredo fora do código/bundle público;
- Security Advisor;
- CI limpa no conjunto reconciliado com a `main`;
- aderência ao `GROWTH_INTELLIGENCE_CANONICAL.md`, respeitando a cláusula de transição que proíbe ampliar retroativamente a 001E.

## 2. Banco e isolamento

Confirmado no remoto:

- cinco migrations registradas, incluindo `20260823111051`;
- `public.business_profiles` existe, owned por `postgres`, RLS habilitado e zero linhas residuais;
- PK/FK e CHECKs previstos estão presentes;
- `anon` não possui SELECT/INSERT/UPDATE/DELETE;
- `authenticated` possui somente SELECT;
- `service_role` possui grants explícitos necessários;
- policy `business_profiles_select_by_active_membership` exige membership própria ACTIVE e organização ACTIVE;
- policies promovidas de `organizations` e `organization_members` permanecem intactas;
- zero objetos `public` owned por `supabase_admin`;
- defaults endurecidos da 001D permanecem intactos;
- `ensure_rls` continua ativo;
- ACL de `public.rls_auto_enable()` continua `{postgres, service_role}`.

## 3. RPC de bootstrap

`public.bootstrap_organization_business_profile(...)` foi confirmada como:

- `SECURITY INVOKER` (`prosecdef=false`);
- owner `postgres`;
- `search_path` fechado;
- sem EXECUTE para `PUBLIC`, `anon` ou `authenticated`;
- EXECUTE explícito para `service_role`;
- criação atômica de organization + owner membership + business_profile;
- `owner` e `ACTIVE` definidos no servidor/banco, não recebidos do browser;
- bloqueio por advisory lock transacional por usuário;
- recusa quando já existe qualquer membership do usuário.

O desenho evita usar `SECURITY DEFINER` como atalho e mantém a operação privilegiada estreita.

## 4. Aplicação e segredo

Confirmado:

- `src/lib/supabase/privileged.ts` é `server-only`;
- usa `SUPABASE_SECRET_KEY`, sem prefixo público;
- cria cliente sem persistência de sessão, auto-refresh ou sessão do visitante;
- a identidade não é derivada do cliente privilegiado;
- `createInitialBusinessAction` exige `requireUser()`/`getClaims()` antes da mutação;
- FormData não aceita `user_id`, `organization_id`, `role` ou `status` como autoridade;
- erros PostgREST não são devolvidos integralmente à UI;
- leitura de `/conta` usa o cliente do usuário sob RLS, não `service_role`;
- nenhuma ocorrência de valor `sb_secret_...` foi encontrada no repositório;
- não há variável privilegiada `NEXT_PUBLIC_*` conhecida.

A observação do Claude sobre valor da secret em cache local Turbopack `.next/cache` é não bloqueante: esse cache é local/ignorado e não é bundle servido nem conteúdo versionado.

## 5. Provas

O script `scripts/business-bootstrap-001e.mjs` implementa prova real contra Auth e Data API:

- bootstrap server-side cria exatamente 1 org + 1 membership owner ACTIVE + 1 profile;
- falha de constraint posterior prova rollback atômico;
- duas chamadas concorrentes resultam em apenas um tenant;
- segundo bootstrap é recusado;
- usuário A lê seu profile;
- usuário B não lê o de A, mesmo conhecendo `organization_id`;
- `anon` não lê;
- owner não ganha escrita direta nas três tabelas;
- RPC é negada a `anon` e `authenticated`, inclusive com `p_user_id` forjado;
- INACTIVE em membership ou organização retira leitura;
- reativação restaura leitura;
- cascades e limpeza deixam zero fixture.

Executor reportou **24/24**. A auditoria confirmou de forma independente o estado remoto resultante: `organizations=0`, `organization_members=0`, `business_profiles=0`, mantendo somente o usuário real já existente.

## 6. CI e reconciliação

A branch nasceu de `052a3d8`, antes dos seis commits documentais que consolidaram Growth Intelligence na `main`.

A auditoria reconciliou a branch sem mudar o código funcional da 001E:

- Growth Intelligence, Project Charter, Project Prompt e Active Docs atuais foram incorporados;
- após a reconciliação, a branch ficou 0 commits atrás da `main`;
- o diff real contra `main` permaneceu restrito aos 20 arquivos da 001E;
- CI final reconciliada `32638010339`: install, lint, typecheck, test e build — todos success.

## 7. Growth Intelligence / simplicidade guiada

O gate canônico foi aplicado na auditoria e o documento foi lido integralmente.

A 001E é compatível estruturalmente com o novo modelo: `business_profile` é explicitamente definido como primeira camada do contexto progressivo do negócio e a fundação construída não impõe funil rígido, número fixo de candidatos, obrigatoriedade de Ads ou persona fabricada.

Ressalvas de UX **não bloqueantes**, porque o próprio canônico contém cláusula de transição que impede ampliar retroativamente a 001E:

1. o formulário ainda usa linguagem paga-first em `Objetivo de aquisição`/“marketing pago agora”;
2. o primeiro onboarding apresenta vários campos de uma vez, enquanto a direção futura é perfil progressivo/trilha guiada.

Esses pontos devem ser harmonizados na próxima etapa substantiva de produto, sem reabrir a fundação segura promovida aqui.

## 8. Advisor e dívidas

Security Advisor final: apenas o WARN conhecido `auth_leaked_password_protection`.

Permanecem como dívidas não bloqueantes:

- proteção de senha vazada antes de clientes reais/produção;
- SMTP/domínio de produção;
- configuração de `SUPABASE_SECRET_KEY` no ambiente quando houver deploy;
- tratamento mais amigável de falha técnica de leitura em `/conta` pode ser aprimorado futuramente;
- recovery e gestão de membros continuam fora da 001E;
- harmonização dos canônicos antigos com Growth Intelligence deve ocorrer na próxima etapa substantiva apropriada.

## 9. Decisão

**Rodada 001E APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA.**

O primeiro fluxo real de domínio está incorporado com atomicidade, isolamento tenant, privilégio mínimo e proteção de segredo adequados ao estágio atual.

A 001E não encerra automaticamente toda a Fase 1 e **não autoriza 001F**. O próximo passo deve ser planejado explicitamente a partir do estado promovido e do Growth Intelligence canônico.