# RODADA 003A — META CONNECTION FOUNDATION

Esta especificação é registrada antecipadamente. **Só pode ser executada quando `estado.md` estiver em AUTORIZADA.**

Fase: 3 — Meta Connection Foundation
Executor: Claude Code
Branch prevista: `claude/rodada-003a-meta-connection-foundation`
Relatório previsto: `rodadas/claude/RELATORIO_RODADA_003A_META_CONNECTION_FOUNDATION.md`

## 1. Objetivo

Entregar a primeira conexão Meta real e segura, sem ainda importar conteúdo, criar anúncios ou gastar dinheiro.

A rodada deve:

1. centralizar a versão Meta vigente;
2. estabelecer o caminho de autorização compatível com Instagram profissional **e** Marketing API;
3. persistir a conexão e o estado OAuth de forma tenant-safe;
4. armazenar token sem expô-lo ao browser/log;
5. concluir uma conexão real de desenvolvimento com conta de teste;
6. permitir desconexão segura;
7. deixar seleção detalhada de Instagram/ad account e leitura de conteúdo para rodada posterior se isso mantiver o escopo controlado.

## 2. Decisões já planejadas

### API

Baseline de planejamento em 2026-08-23: **Graph/Marketing API v26.0**. Antes de implementar, revalidar na documentação oficial Meta. A versão deve ficar centralizada, nunca espalhada por features.

### Login

Usar a família **Facebook Login for Business / fluxo empresarial compatível com Marketing API** como caminho principal do Tráfego Pago.

Motivo: a configuração Instagram Login é útil para contas profissionais, mas a documentação Meta atual informa limitações para Ads; o produto precisa futuramente operar Instagram + Marketing API no mesmo ecossistema.

Se a documentação oficial vigente mostrar mudança material, parar antes de codar e devolver a divergência ao GPT.

## 3. READ SET obrigatório

Além de `estado.md + esta rodada`:

1. `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md` — integral;
2. `docs/03-canonical/TECHNICAL_SPEC.md` — §§3.4, 7, 30–32;
3. `docs/03-canonical/DATA_MODEL.md` — §§3, 16–18;
4. `docs/03-canonical/API_CONTRACTS.md` — §§1–2, 12–13, 17–19;
5. `docs/03-canonical/SECURITY_MODEL.md` — §§3, 6–9, 15.

Sob demanda: roadmap Fase 3 e documentação Supabase Vault/secrets se necessária à implementação concreta.

## 4. Escopo técnico

### 4.1 Configuração Meta

- adicionar `META_APP_ID` e `META_APP_SECRET` somente server-side;
- adicionar `META_GRAPH_API_VERSION` centralizada;
- nenhuma credencial Meta em `NEXT_PUBLIC_*`;
- atualizar `.env.example` apenas com nomes/placeholders seguros, nunca valores reais.

### 4.2 Persistência

Criar migration para, no mínimo:

#### `public.meta_connections`

- id UUID;
- organization_id FK;
- status fechado (`PENDING|ACTIVE|ACTION_REQUIRED|EXPIRED|REVOKED|ERROR` ou contrato final equivalente);
- granted_scopes estruturados;
- token_secret_reference opaco, nunca token;
- token_expires_at quando aplicável;
- api_version_last_verified;
- external identity/business identifiers estritamente necessários;
- connected_by;
- connected_at/disconnected_at;
- last_health_check_at;
- action_required_reason;
- created_at/updated_at.

#### `public.meta_oauth_intents`

Estado OAuth de curta duração, vinculado a usuário + organização, com hash/nonce, expiração e uso único. Server-only.

Não criar `instagram_accounts`/`ad_accounts` nesta rodada se a descoberta/seleção de ativos ampliar demais o gate real; nesse caso ficam expressamente para 003B.

### 4.3 Token secret boundary

Usar mecanismo server-side aprovado, preferencialmente **Supabase Vault com referência opaca**, se a validação técnica atual confirmar acesso mínimo e reproduzível.

Obrigatório:

- token criptografado em repouso;
- browser nunca recebe token nem referência capaz de recuperar segredo;
- acesso de leitura/escrita do segredo restrito ao caminho server-side;
- qualquer função privilegiada necessária deve ter grants mínimos e search_path seguro;
- nenhum segredo em audit log, fila ou relatório.

Se Vault exigir arquitetura privilegiada insegura ou não reproduzível no stack atual, **parar e reportar ao GPT antes de improvisar criptografia própria**.

### 4.4 MetaAuthGateway

Implementar contrato interno, sem chamada Meta espalhada em feature:

- iniciar autorização;
- completar callback;
- validar `state`/intenção;
- trocar código por token pelo fluxo vigente;
- obter identidade/scopes mínimos necessários;
- persistir conexão;
- health mínimo;
- desconectar/revogar conforme mecanismo oficial aplicável.

### 4.5 UX mínima guiada

Uma ação principal simples dentro da área autenticada:

- “Conectar Meta”;
- estado claro da conexão;
- erro em linguagem comum;
- “Desconectar” quando aplicável.

Não expor nomes técnicos de Graph API, tokens, scopes ou hierarquia Ads no fluxo padrão.

## 5. Gate humano esperado

Um único gate concentrado para configuração do Meta App de desenvolvimento e teste OAuth real.

Claude deve:

1. concluir todo código/config local possível antes do gate;
2. orientar o fundador passo a passo no Meta Developers;
3. pedir somente ações indispensáveis;
4. fazer App ID/Secret entrarem **diretamente no ambiente local/server**, nunca no chat ou Git;
5. continuar na mesma sessão após o gate;
6. concluir E2E real de conexão/desconexão.

## 6. Provas — Risco A

Provar somente o delta crítico:

- state OAuth imprevisível, expira e é single-use;
- state de usuário/org A não vale para B;
- callback sem state/expirado/reutilizado falha fechado;
- open redirect não é introduzido;
- token nunca aparece em URL final, browser response, log ou relatório;
- `anon`/`authenticated` não acessam material secreto;
- conexão pertence à organização correta;
- desconexão invalida/remove o segredo conforme contrato;
- erro de auth vira estado `ACTION_REQUIRED`/equivalente, sem retry cego;
- conexão real de desenvolvimento funciona uma vez de ponta a ponta.

Não repetir E2E de Auth/RLS/Fila já promovidos salvo fronteira diretamente tocada.

CI completa uma vez no PR.

## 7. Fora de escopo

- importar mídia/insights Instagram;
- publicar conteúdo;
- criar campanha/ad set/ad/creative;
- gasto/aprovação financeira;
- Lead Ads;
- webhook Meta público;
- cron;
- IA;
- App Review/produção/comercialização.

## 8. Critério de conclusão

A 003A só passa quando uma organização de teste consegue conectar e desconectar a Meta por fluxo real de desenvolvimento, com token fora do browser/log e estado OAuth protegido contra replay/cross-tenant.

Se seleção de ativos ficar para 003B, isso deve estar explicitamente registrado e não ser apresentado como Fase 3 completa.
