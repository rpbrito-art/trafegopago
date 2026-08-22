# ESTADO — Tráfego Pago

Atualizado: 2026-08-22

Este é o **estado operacional canônico** do projeto. GPT e Claude Code devem lê-lo no início de cada nova rodada ou correção.

## 1. Repositório autorizado

- GitHub: `rpbrito-art/trafegopago`
- Pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`
- Repositório `rpbrito-art/business-weaver`: **fora de escopo e proibido para este projeto**.

## 2. Infraestrutura conhecida

- Repositório GitHub criado e populado com documentação canônica.
- Projeto Supabase já criado pelo fundador.
- Pasta local já vinculada ao Supabase pelo comando:
  `supabase link --project-ref cbnxdoxpyioxjwgjhbtq`
- Ainda não há aplicação Next.js implementada.
- Ainda não há schema de domínio aplicado.
- Ainda não há integração Meta, workers, IA, CI ou deploy.

## 3. Etapas concluídas

- Etapa 1 — definição inicial do MVP: concluída.
- Etapa 2A — pesquisa técnica: concluída.
- Etapa 2B — revisão adversarial: concluída.
- Etapa 3 — consolidação canônica e estruturação documental: concluída.

## 4. Etapa corrente

**RODADA 000 — BOOTSTRAP TÉCNICO**

Status: **EXECUTADA — AGUARDANDO AUDITORIA GPT**.

Mandato vigente:

`rodadas/gpt/RODADA_000_BOOTSTRAP_TECNICO.md`

Relatório esperado do Claude:

`rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`

### Registro de execução

Preenchido pelo Claude Code. Não constitui aprovação.

- Executado em: 2026-08-22.
- Branch: `claude/bootstrap-tecnico` (a partir da `main`, sem merge).
- Commit de implementação: `1d5d86fc550b74d75e924f2046e1cfe410dd7d62`.
- Relatório entregue: `rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`.
- Gates: lint, typecheck, testes (11/11) e build aprovados localmente.
- Migrations de domínio: nenhuma. Projeto `cbnxdoxpyioxjwgjhbtq` com zero migrations.
- Secrets versionados: nenhum.
- Bloqueios: nenhum.
- Pendências registradas no relatório (§8), com destaque para o middleware de
  refresh de sessão Supabase, que deve entrar no escopo da Fase 1.

## 5. Objetivo da rodada corrente

Criar a base executável do aplicativo sem antecipar domínio:

- Next.js + TypeScript;
- App Router;
- lint, typecheck, testes e build;
- estrutura modular inicial;
- preparação segura do cliente Supabase;
- `.env.example` e proteção de secrets;
- CI mínima;
- smoke test;
- nenhuma migration de domínio.

## 6. Regras de handoff

### GPT

Ao planejar uma rodada ou correção:

1. atualizar este `estado.md`;
2. criar o mandato em `rodadas/gpt/`;
3. nunca depender de texto solto no chat como única fonte de instrução;
4. após execução, ler o relatório em `rodadas/claude/` e auditar branch/diff/código/provas.

### Claude Code

Ao iniciar:

1. ler `estado.md`;
2. ler `.gpt/PROJECT_PROMPT.md`;
3. abrir o mandato exato indicado em `estado.md`;
4. executar somente o escopo autorizado;
5. escrever o relatório final no caminho indicado em `estado.md`;
6. atualizar `estado.md` apenas no bloco de execução quando o mandato autorizar, sem promover a próxima fase;
7. não iniciar nova rodada sem mandato em `rodadas/gpt/`.

## 7. Estado Git esperado antes da Rodada 000

A sessão do Claude deve começar dentro de `trafegopago` e validar:

- diretório raiz correto;
- remote `rpbrito-art/trafegopago`;
- branch inicial coerente;
- working tree conhecida;
- Supabase vinculado ao projeto correto.

Se qualquer verificação falhar, parar sem alterar arquivos.

## 8. Próxima transição permitida

Após o Claude concluir a Rodada 000:

1. Claude cria/pusha `claude/bootstrap-tecnico`;
2. Claude grava relatório em `rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`;
3. GPT audita a execução;
4. correções, se necessárias, recebem novo mandato em `rodadas/gpt/`;
5. somente após aprovação será planejada a Fundação Supabase/Auth/Tenancy/RLS.

## 9. Regra contra ambiguidade

Se houver conflito entre este arquivo e um relatório antigo, vale o `estado.md` mais recente.

Se houver conflito entre uma rodada em `rodadas/gpt/` e documentos canônicos de produto/arquitetura, o executor deve parar e reportar a inconsistência; não deve escolher silenciosamente uma interpretação.
