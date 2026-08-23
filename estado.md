# ESTADO — Tráfego Pago

Atualizado: 2026-08-23

Este é o **estado operacional canônico da execução corrente**. Para histórico promovido, usar `docs/00-governanca/HISTORY_SUMMARY.md`; não reler relatórios antigos por padrão.

## 1. Repositório e ambiente autorizados

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- `rpbrito-art/business-weaver`: **fora de escopo**
- Supabase project ref: `cbnxdoxpyioxjwgjhbtq`

## 2. Estado incorporado à main

Promovido e disponível:

- Rodada 000 — Bootstrap Técnico;
- Rodada 001A — Baseline Supabase e Segurança;
- Rodada 001B — Auth Real;
- Rodada 001C — Organizations + Membership;
- Rodada 001D — Default privileges + Grants + RLS + Isolamento;
- Rodada 001E — Bootstrap de Negócio;
- Auth real por e-mail/senha com confirmação SSR, sessão/cookies e rota protegida;
- `public.organizations`, `public.organization_members` e `public.business_profiles` com RLS;
- isolamento tenant real e grants mínimos;
- criação inicial atômica organization + owner membership + business_profile por caminho server-only;
- RPC `SECURITY INVOKER` executável apenas por `service_role`;
- proteção contra dupla submissão concorrente;
- `/conta` trata zero/uma/múltiplas memberships e organização indisponível sem escolher tenant silenciosamente;
- `SUPABASE_SECRET_KEY` consumida somente server-side;
- default privileges seguros da 001D e `ensure_rls` preservados;
- `GROWTH_INTELLIGENCE_CANONICAL.md` e Lei da Simplicidade Guiada vinculam o planejamento futuro de produto.

Detalhes históricos: `docs/00-governanca/HISTORY_SUMMARY.md`.

## 3. Última rodada promovida

**RODADA 001E — BOOTSTRAP DE NEGÓCIO**

Status: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

Mandato:
`rodadas/gpt/RODADA_001E_BUSINESS_BOOTSTRAP.md`

Relatório Claude:
`rodadas/claude/RELATORIO_RODADA_001E_BUSINESS_BOOTSTRAP.md`

Auditoria GPT:
`rodadas/gpt/AUDITORIA_RODADA_001E_BUSINESS_BOOTSTRAP.md`

PR #6.

Head técnico original:
`5fe60ea3ea56db7c1c5fc53d6a9f97a848d72466`

Head reconciliado:
`f2695300e99db3ca5b61a88160c0d94b0a30198f`

Merge:
`7cf7786320f49c1d5b3f486f4ba8ca4919fa2ffd`

CI final reconciliada:
`32638010339` — success.

Migration incorporada:
`20260823111051_create_business_profiles_and_bootstrap.sql`.

Provas principais:

- 24/24 provas reais Auth/JWT/Data API reportadas pelo executor;
- banco remoto revalidado independentemente pela auditoria;
- zero fixture em organizations/memberships/business_profiles;
- RPC INVOKER e ACL mínima confirmadas;
- Advisor sem regressão além do WARN conhecido de Auth;
- CI final reconciliada verde.

## 4. Estado corrente

**Não há mandato executável pendente.**

`/proxima` deve parar aguardando planejamento e autorização explícita de nova rodada.

Nenhuma 001F está autorizada.

A Fase 1 **não é declarada encerrada automaticamente** pela promoção da 001E. Itens ainda precisam ser avaliados antes desse fechamento, incluindo recovery e o nível mínimo de gestão de conta/membros realmente necessário.

## 5. Gate obrigatório de produto

Antes de formular, refinar, dividir, autorizar ou auditar qualquer rodada que afete produto/experiência, ler integralmente:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

Não basta referência curta.

Todo mandato relevante deve incluí-lo no READ SET; contradição material é bloqueante salvo decisão explícita do fundador.

A próxima etapa substantiva também deve harmonizar, no que for necessário ao seu próprio escopo, formulações antigas de `MVP_CANONICAL.md`, roadmap e data model com Growth Intelligence. Não criar rodada de housekeeping apenas para essa harmonização.

## 6. Ressalvas e dívidas abertas

1. `auth_leaked_password_protection` permanece desabilitado: hardening antes de clientes reais/produção.
2. Brevo Free permanece SMTP provisório de desenvolvimento; produção exige decisão de domínio/provedor.
3. Default ACL residual de `supabase_admin` continua aceito somente enquanto `public` tiver zero objetos owned por essa role.
4. Funções futuras exigem GRANT EXECUTE explícito.
5. `SUPABASE_SECRET_KEY` deverá ser configurada no ambiente de deploy quando houver deploy; nunca pode ir para `NEXT_PUBLIC_*`, browser, logs ou respostas.
6. Recovery/reset de senha ainda não foi implementado.
7. Convite/gestão de membros, edição de negócio, multi-org switcher e exclusão continuam posteriores.
8. A linguagem do onboarding 001E ainda é parcialmente paga-first e o formulário é concentrado; a próxima evolução de produto deve migrar para objetivo/jornada mais geral e perfil progressivo, conforme Growth Intelligence, sem desfazer a fundação segura.
9. O tratamento de erro técnico de leitura em `/conta` pode ganhar UX mais explícita em rodada futura adequada.

## 7. Próxima direção planejável — não autorizada

Antes de entrar em Meta/Instagram, o GPT deve avaliar o fechamento restante da Fase 1 e harmonizar o plano futuro com Growth Intelligence.

Possíveis componentes a avaliar, sem autorização automática:

- recovery de acesso;
- gestão mínima necessária de conta/membership;
- evolução do onboarding para trilha simples e perfil progressivo;
- modelagem futura de objetivo/jornada/resultado desejado versus mensurável;
- atualização proporcional de MVP/roadmap/data model para evitar que fases futuras reintroduzam funil rígido ou paid-first.

A sequência e o recorte da próxima rodada serão definidos em planejamento posterior.

## 8. Continuidade

Branch, relatório ou commit isolado não significam incorporação. Neste momento, 000–001E estão promovidas na `main`.

Descompasso documental temporário deve ser corrigido junto da próxima etapa substantiva quando não houver risco operacional.