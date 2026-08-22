# RODADA 001C — ORGANIZATIONS + MEMBERSHIP

Status: **AUTORIZADA**
Data: 2026-08-22

Branch esperada:

`claude/rodada-001c-organizations-membership`

Relatório esperado:

`rodadas/claude/RELATORIO_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`

## 0. Objetivo

Criar a fundação relacional mínima de tenancy do Tráfego Pago:

- `public.organizations`;
- `public.organization_members`;
- constraints, FKs e índices essenciais;
- RLS explicitamente habilitado nas duas tabelas;
- acesso de `anon`/`authenticated` fechado nesta rodada;
- migration versionada e aplicada no Supabase autorizado.

Esta rodada **define estrutura**, não autorização de domínio. Policies e provas adversariais 2 usuários × 2 organizações pertencem à 001D e continuam não autorizadas.

---

# 1. PRECONDIÇÕES

Antes de escrever:

- repo único: `rpbrito-art/trafegopago`;
- pasta local esperada: `C:\Users\rpbri\Documents\trafegopago`;
- Supabase único: project ref `cbnxdoxpyioxjwgjhbtq`;
- partir da `main` atualizada e limpa;
- criar/usar somente a branch esperada;
- não tocar `rpbrito-art/business-weaver` nem outro projeto Supabase.

Preflight mínimo:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status -sb
git fetch --all --prune
supabase --version
```

Confirmar também o project ref linkado antes de qualquer operação remota mutável. Se houver mismatch, parar.

---

# 2. READ SET — OBRIGATÓRIO E MÍNIMO

Ler integralmente:

1. `estado.md`
2. `.gpt/PROJECT_PROMPT.md`
3. `docs/00-governanca/ACTIVE_DOCS.md`
4. este mandato
5. `docs/03-canonical/DATA_MODEL.md` — seções 1, 2, 16, 17 e 18
6. `docs/03-canonical/SECURITY_MODEL.md` — seções 4, 5, 6, 12, 15, 18, 20, 22 e 24

Leitura dirigida:

- `docs/03-canonical/TECHNICAL_SPEC.md` — módulos Organizations, multi-tenancy e segurança;
- migration já promovida da 001A apenas para entender o baseline de RLS/privileges;
- `supabase/config.toml` e migration history atual.

Sob demanda:

- `docs/00-governanca/HISTORY_SUMMARY.md`;
- documentação oficial vigente de Supabase para migrations, RLS e FKs com `auth.users`.

Não ler relatórios antigos completos por padrão.

---

# 3. CONTRATO SQL DA 001C

A migration deve criar exatamente a fundação abaixo, salvo impedimento técnico real documentado e aprovado pelo GPT.

## 3.1 `public.organizations`

Campos mínimos:

- `id uuid primary key default gen_random_uuid()`;
- `name text not null`;
- `status text not null default 'ACTIVE'` com `CHECK` limitado a `ACTIVE|INACTIVE`;
- `timezone text not null default 'America/Sao_Paulo'`;
- `default_currency text not null default 'BRL'` com `CHECK` de três letras maiúsculas ISO-like (`^[A-Z]{3}$`);
- `created_at timestamptz not null default now()`;
- `updated_at timestamptz not null default now()`.

Regras mínimas:

- `name` não pode ser vazio após trim;
- limitar tamanho de `name` de forma razoável (por exemplo até 160 caracteres), sem criar regra comercial excessiva;
- `slug` permanece opcional no modelo conceitual e **não precisa ser criado nesta rodada**.

## 3.2 `public.organization_members`

Campos mínimos:

- `organization_id uuid not null references public.organizations(id) on delete cascade`;
- `user_id uuid not null references auth.users(id) on delete cascade`;
- `role text not null default 'member'` com `CHECK` em `owner|admin|member`;
- `status text not null default 'ACTIVE'` com `CHECK` em `ACTIVE|INACTIVE`;
- `created_at timestamptz not null default now()`.

Chave:

- primary key composta `(organization_id, user_id)` — satisfaz a unicidade canônica.

Índice obrigatório:

- índice por `user_id` para lookup de memberships do usuário.

Não criar convite, ownership transfer, role mutation API ou lifecycle adicional nesta rodada.

## 3.3 RLS e grants

A migration deve **explicitamente** executar:

- `ENABLE ROW LEVEL SECURITY` em `organizations`;
- `ENABLE ROW LEVEL SECURITY` em `organization_members`.

Não depender apenas do event trigger `ensure_rls`; ele permanece defesa em profundidade.

Nesta 001C:

- não criar policies;
- não conceder acesso funcional de domínio a `anon` ou `authenticated`;
- se defaults existentes concederem privilégios de tabela a esses papéis, revogar o necessário para manter a fundação fechada até a 001D;
- não alterar privilégios globais além do estritamente necessário para estas tabelas.

A 001D definirá grants + policies juntos e provará isolamento.

## 3.4 Funções/triggers

**Não criar funções Postgres próprias, `SECURITY DEFINER` ou triggers de domínio nesta rodada.**

Motivos:

- evita antecipar autorização;
- preserva a pendência de default privileges para ser resolvida imediatamente antes da primeira função própria sensível;
- `updated_at` será atualizado explicitamente pelo domínio quando houver mutação; não criar trigger apenas para isso agora.

---

# 4. MIGRATION E APLICAÇÃO

Antes de DDL:

- consultar `supabase --help` e subcomandos relevantes vigentes;
- confirmar migration history local/remoto;
- criar migration usando o comando oficial atual (`supabase migration new ...` ou substituto vigente descoberto pela CLI), sem inventar timestamp manualmente.

DDL persistente só via migration versionada.

Aplicar pelo caminho oficial de migration da CLI no project ref autorizado.

Se o classificador do Claude bloquear `supabase db push`, **não contornar por SQL ad hoc nem MCP**. Finalizar antes todas as provas não destrutivas possíveis e concentrar em um único gate humano para o fundador executar o comando exato da CLI. Depois continuar as provas.

Não liberar permissão ampla permanente apenas para eliminar esse gate.

---

# 5. PROVAS OBRIGATÓRIAS PÓS-MIGRATION

Agrupar consultas remotas quando possível.

Provar no Supabase real:

1. migration local/remota alinhadas;
2. apenas as duas tabelas de tenancy esperadas foram criadas em `public` nesta rodada;
3. colunas, defaults, PKs, CHECKs, FKs e índice correspondem ao contrato;
4. `relrowsecurity = true` nas duas tabelas;
5. zero policies nas duas tabelas ao final da 001C;
6. `anon` e `authenticated` não possuem caminho funcional de leitura/escrita dessas tabelas nesta etapa;
7. `ensure_rls` continua ativo;
8. Security Advisor não ganhou novo achado de banco causado pela migration.

O WARN já conhecido `auth_leaked_password_protection` pode permanecer e deve ser registrado como hardening de Auth não causado pela 001C. Qualquer novo WARN/ERROR relevante de banco deve ser explicado e pode bloquear a rodada.

## 5.1 Teste transacional de constraints

Sem deixar resíduos, provar pelo menos:

- inserir organização válida funciona;
- nome vazio é rejeitado;
- moeda inválida é rejeitada;
- role fora de `owner|admin|member` é rejeitada;
- membership para `user_id` inexistente é rejeitada pela FK;
- membership duplicada `(organization_id,user_id)` é rejeitada;
- remoção da organização elimina memberships associadas por cascade.

Pode usar o usuário Auth já existente apenas como referência técnica, sem registrar e-mail/PII no relatório. Preferir transação com rollback.

Não criar fixtures permanentes ainda.

---

# 6. FORA DE ESCOPO

Expressamente proibido nesta 001C:

- RLS policies de membership;
- grants funcionais finais para browser/Data API;
- prova adversarial 2 usuários × 2 organizações;
- `business_profiles`;
- onboarding;
- endpoint/action para criar organização;
- convite de membros;
- alterar papéis pela aplicação;
- ownership transfer;
- UI de organizações;
- recuperação de senha/MFA/social login;
- Meta/Instagram;
- campaigns/leads;
- IA;
- payments;
- deploy;
- funções `SECURITY DEFINER`.

Não iniciar 001D.

---

# 7. GATES DE ENGENHARIA — EFICIENTES

Como a rodada deve alterar apenas SQL + documentação de handoff:

- não rodar `npm ci` local;
- não rodar lint/typecheck/test/build local por ritual, salvo se algum arquivo TS/JS for alterado inesperadamente;
- executar verificações SQL/Supabase e `git diff --check`;
- a CI remota completa sobre o head final continua obrigatória e é o gate limpo do repositório.

Se código executável mudar, isso é desvio de escopo: justificar antes e rodar gates proporcionais completos.

---

# 8. GIT E HANDOFF

- não trabalhar na `main`;
- não force push;
- não mergear/promover;
- preferir um único push final auditável;
- relatório compacto, alvo ≤150 linhas/15 KB;
- não copiar outputs extensos;
- registrar `prova | fonte/comando | resultado`.

Atualizar `estado.md` ao final para:

`RODADA 001C — EXECUTADA — AGUARDANDO AUDITORIA GPT`

sem autorizar 001D.

Relatório:

`rodadas/claude/RELATORIO_RODADA_001C_ORGANIZATIONS_MEMBERSHIP.md`

---

# 9. CRITÉRIO DE CONCLUSÃO

A 001C só pode ser entregue para auditoria se:

- migration versionada estiver aplicada ao project ref correto;
- `organizations` e `organization_members` existirem com contrato e constraints esperados;
- RLS estiver explicitamente habilitado nas duas;
- zero policies de domínio tiverem sido criadas;
- acesso browser ainda estiver fechado;
- constraints tiverem prova real sem resíduos;
- não houver tabela/feature fora de escopo;
- migration history estiver coerente;
- Advisor não apresentar nova regressão de banco não explicada;
- CI final do head estiver verde;
- relatório compacto e `estado.md` estiverem entregues.

Ao concluir, **pare aguardando auditoria GPT**. A Rodada 001D continua não autorizada.