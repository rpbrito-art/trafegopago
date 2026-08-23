# ACTIVE DOCS — TRÁFEGO PAGO

Atualizado: 2026-08-23
Última reciclagem: fechamento da Fase 1 após promoção da 001F.
Próximo gatilho ordinário: cinco rodadas substantivas promovidas desde essa reciclagem, fechamento da próxima fase macro ou outro gatilho de `DOCUMENTATION_LIFECYCLE.md`.

## Estado corrente

**Fase 1 encerrada e promovida.**

**Fase 2 — Operations, Audit, Queues e Segurança Base: EM ANDAMENTO.**

Última promoção: **002A — Operations + Audit Foundation**.

Status: **APROVADA COM RESSALVAS NÃO BLOQUEANTES E PROMOVIDA**.

O estado incorporado é 000–002A.

Fonte operacional: `estado.md`.

## HOT — ler sempre

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`

Não existe mandato vigente enquanto uma nova rodada não for publicada.

## Resumo histórico preferencial

`docs/00-governanca/HISTORY_SUMMARY.md`

O resumo incorpora Rodadas 000–002A. Mandato, relatório e auditoria da 002A são agora HISTORY / EVIDENCE: abrir somente se surgir dependência concreta.

## Estado técnico promovido relevante

Além da fundação da Fase 1:

- `public.operations` registra intenções técnicas idempotentes;
- unicidade por `(organization_id, operation_type, idempotency_key)` impede duplicação da mesma intenção no mesmo tenant/tipo;
- `public.audit_events` registra histórico append-oriented;
- browser não tem acesso direto às duas tabelas;
- `service_role` tem somente os privilégios internos necessários;
- status, taxonomia de erro e retry estão versionados em TypeScript;
- `correlation_id` está disponível para rastreabilidade futura;
- migration history = 6;
- CI final da 002A: 437 testes, lint/typecheck/build verdes;
- nenhuma fixture residual.

## Ressalvas ativas da 002A

- a primeira tentativa não promovida da migration 002A foi desfeita e reaplicada após a prova detectar CHECK temporal incompatível com skew de relógio; estado final coerente e auditado, mas esse procedimento não deve virar rotina;
- `operations.updated_at` não é automático; decidir junto do worker futuro;
- `audit_events.actor_user_id` sem índice próprio foi INFO de performance, não bloqueante;
- `approval_id` continua fora de `operations` até a fundação financeira posterior;
- dois INFO de Security Advisor `rls_enabled_no_policy` são esperados porque as tabelas são deliberadamente server-only.

## Gate obrigatório de produto

Antes de planejar, refinar, autorizar ou auditar qualquer rodada que afete produto/experiência, ler integralmente:

`docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

Princípio: **a complexidade pertence ao sistema, não ao usuário**.

A próxima sub-rodada de infraestrutura da Fase 2 pode não exigir esse gate se permanecer estritamente interna. Se tocar UX, Meta, jornada, conteúdo, Ads, leads ou outra experiência, o gate volta a ser obrigatório.

## Próxima rodada

**Nenhuma rodada está autorizada neste momento.**

Antes de publicar a próxima sub-rodada da Fase 2, GPT deve:

1. definir o menor próximo bloco útil;
2. apresentar ao fundador, em linguagem simples, um resumo contendo o que será feito, por que é necessário, o que muda na prática, o que fica de fora e se haverá ação manual;
3. obter autorização quando o fluxo exigir;
4. só então publicar mandato, atualizar `estado.md` e liberar `/proxima`.

Candidato natural de planejamento: base de **fila + contrato de processamento em segundo plano**, reutilizando `operations`, retry e correlação já promovidos. Isso é apenas candidato; **não é autorização para 002B**.

## Pendências transversais abertas

- Gmail SMTP é provisório de desenvolvimento; App Password permanece secreta/ativa enquanto necessária;
- leaked password protection antes de clientes reais/produção;
- SMTP/domínio de produção;
- default ACL residual de `supabase_admin` monitorado enquanto inerte;
- funções futuras exigem GRANT EXECUTE explícito;
- gestão avançada de membros, edição de negócio, multi-org switcher e exclusão continuam posteriores;
- rate limiting/observabilidade próprios entram conforme endpoint/risco.

## Canônicos ativos por área

### Governança

- `docs/00-governanca/PROJECT_CHARTER.md`
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`
- `docs/00-governanca/DOCUMENTATION_LIFECYCLE.md`

### Produto

- `docs/01-produto/MVP_CANONICAL.md`
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`

### Arquitetura

- `docs/03-canonical/TECHNICAL_SPEC.md`
- `docs/03-canonical/DATA_MODEL.md`
- `docs/03-canonical/API_CONTRACTS.md`
- `docs/03-canonical/SECURITY_MODEL.md`
- `docs/03-canonical/AI_ARCHITECTURE.md`
