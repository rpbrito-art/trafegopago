# SECURITY MODEL — Quoron MVP

Status: canônico.

## 1. Objetivo

Garantir que uma aplicação que opera dados de clientes, tokens Meta, leads e ações com impacto financeiro seja segura por desenho, não por correções posteriores.

## 2. Ameaças prioritárias

- vazamento cross-tenant;
- exposição de tokens Meta ou service credentials;
- execução duplicada de campanha/orçamento;
- escalada de privilégio entre membros;
- webhook forjado/replay;
- OAuth hijack/redirect indevido;
- uso indevido de endpoint público de survey;
- PII em logs;
- prompt injection/entrada maliciosa afetando decisões de IA;
- ação financeira originada diretamente de output de LLM;
- falha de exclusão/revogação de dados externos.

## 3. Trust boundaries

### Browser

Não confiável. Recebe somente credenciais públicas apropriadas e dados autorizados por sessão/RLS.

### Server/Workers

Ambiente confiável para segredos e operações privilegiadas, mas toda entrada externa deve ser validada.

### Meta

Provider externo confiável como origem protocolar, mas payloads continuam sujeitos a validação, campos inesperados e replay.

### LLM providers

Serviço externo. Nunca enviar segredos. Minimizar PII e conteúdo desnecessário.

## 4. Multi-tenancy

Autorização baseia-se em `organization_members`.

Regras:

- tabela tenant-scoped contém `organization_id`;
- políticas RLS verificam membership;
- operações privilegiadas server-side recebem organization explicitamente e validam membership/role antes de agir;
- relações cross-tenant devem ser bloqueadas por constraints sempre que possível;
- testes usam ao menos duas organizações e dois usuários distintos.

## 5. RLS

Ativar RLS em toda tabela exposta à Data API que contenha dados tenant.

Evitar política ampla do tipo "authenticated pode tudo".

Matriz mínima:

- SELECT própria org;
- INSERT somente própria org e campos permitidos;
- UPDATE própria org + role adequada;
- DELETE restrito conforme entidade;
- tabelas sensíveis internas sem acesso direto do browser quando não necessário.

## 6. Credenciais Supabase

- publishable/anon apropriada no cliente;
- secret/service-role somente no servidor;
- nunca embutir secret em bundle, variável `NEXT_PUBLIC_*`, logs ou resposta de API;
- rotação quando houver suspeita de exposição.

## 7. Tokens Meta

- nunca armazenar senha;
- token fica server-side em mecanismo seguro aprovado;
- guardar apenas metadados necessários para health/expiry no domínio;
- não retornar token à UI;
- não logar token;
- least-privilege scopes;
- desconexão deve revogar/remover acesso quando suportado e eliminar referência secreta local;
- expiração/revogação coloca integração em `ACTION_REQUIRED`.

## 8. OAuth

Implementação deve seguir o fluxo oficial vigente e incluir proteções aplicáveis:

- `state` imprevisível e associado à sessão/intenção;
- allowlist de redirect URIs;
- callback server-side;
- proteção contra replay do callback;
- validação do tenant que iniciou a conexão;
- não confiar em organization id vindo apenas de querystring;
- erros de autorização não devem vazar tokens/códigos.

## 9. Webhooks

- endpoint separado por provider/tipo quando útil;
- challenge/verification oficial;
- validar assinatura/autenticidade quando disponível;
- limitar payload;
- raw body preservado apenas quando necessário para verificação;
- dedupe/replay protection;
- inbox persistente;
- resposta rápida;
- processamento assíncrono;
- eventos inválidos não entram no domínio.

## 10. Operações financeiras

Regra fundamental:

`LLM output -> Recommendation -> Human Approval -> Domain Command -> Idempotent Operation -> Meta`

Nunca:

`LLM -> Meta spend`.

Aprovação deve guardar snapshot de valor, moeda, alvo e escopo. Command deve falhar se exceder aprovação.

## 11. Idempotência financeira

Toda mutação potencialmente onerosa precisa de idempotency key interna e operação persistida antes da chamada externa.

Retry após timeout deve primeiro reconciliar se recurso já foi criado.

Teste obrigatório: simular timeout depois de criação externa e provar que retry não duplica campanha/gasto.

## 12. Roles

Papéis iniciais: `owner`, `admin`, `member`.

Até definição mais granular:

- somente owner pode alterar ownership e configurações financeiras máximas;
- aprovação de gasto deve exigir role explicitamente autorizada;
- member não deve ganhar poder por manipular request/UI;
- autorização sempre server/domain-side, não apenas esconder botão.

## 13. PII de leads

Princípios:

- coletar apenas dados necessários;
- acesso tenant-scoped;
- não duplicar PII em queue payloads/logs;
- não enviar PII à IA sem necessidade clara;
- políticas de retenção e exclusão documentadas antes de produção;
- exportação e exclusão auditáveis.

## 14. IA e prompt injection

Conteúdo de posts, comentários, formulários e surveys é dado não confiável.

A IA nunca deve receber ferramentas financeiras diretas. Outputs usados pela aplicação devem ser schema-validated.

Prompts devem instruir o modelo a tratar conteúdo do usuário como dados, não instruções de sistema.

Decisões críticas usam regras determinísticas e gates humanos.

## 15. Secrets e logs

Redaction obrigatória para:

- access tokens;
- refresh tokens;
- service keys;
- authorization codes;
- cookies/sessions;
- senhas;
- PII desnecessária.

Logs técnicos devem usar IDs internos/correlation ids quando possível.

### 15.1 Matriz de secrets por runtime

Cada runtime recebe a credencial de menor poder que resolve seu trabalho. A
regra que atravessa toda a matriz: **credencial privilegiada nunca cruza a
fronteira do browser**, em nenhuma forma — bundle, `NEXT_PUBLIC_*`, resposta de
API ou log.

| runtime | credencial permitida | proibido |
| --- | --- | --- |
| Browser | publishable/anon key e dados autorizados por sessão/RLS | qualquer secret key, service role, token de provider |
| Next.js server (Server Components, Server Actions, rotas) | secret key lida somente server-side, via `server-only` | expor a chave em bundle, `NEXT_PUBLIC_*`, log ou resposta |
| Scripts de prova server-side | secret key a partir de `.env.local`, nunca versionada | imprimir chave, URL com token ou PII em log/relatório |
| Edge Functions / workers | secrets injetados pelo runtime do próprio Supabase (`SUPABASE_*`), autorizados pelo wrapper oficial | criar segredo humano novo, aceitar chamada anônima, logar payload bruto |
| Provider externo (Meta, quando existir) | token guardado server-side, referenciado por id | token em browser, em log, em `audit_events.metadata_json` ou em payload de fila |

Regras que valem para todas as linhas:

- **Supabase Vault apenas quando o próprio Postgres precisar consumir o
  segredo.** Guardar no Vault um token que só a aplicação usa acrescenta uma
  superfície de acesso sem remover nenhuma.
- **Segredos distintos por ambiente** antes de qualquer uso com dados reais;
  desenvolvimento e produção não compartilham credencial.
- **Rotação/revogação** diante de exposição suspeita, de substituição de
  provedor ou do fim do propósito que criou a credencial.
- **Redaction** conforme §15 em qualquer log, prova ou relatório.
- **Pinning/lockfile** em dependências que executam com privilégio — Edge
  Functions incluídas —, para que a versão auditada seja a versão executada.

## 16. Storage

- buckets privados por padrão para materiais não públicos;
- acesso via policy tenant-scoped;
- signed URLs com duração limitada quando apropriado;
- validar MIME/tamanho/extensão, sem confiar no nome do arquivo;
- varredura/controles adicionais se risco de uploads aumentar.

## 17. Endpoints públicos de survey

- token aleatório de alta entropia;
- preferir armazenar hash do token;
- escopo a uma survey request;
- expiração quando aplicável;
- rate limit;
- não revelar nome/e-mail/telefone do lead sem necessidade;
- proteção contra submissão duplicada conforme regra;
- validação de tamanho/conteúdo.

## 18. CSRF/XSS/input

- usar mecanismos seguros do framework para sessão/cookies;
- mutações autenticadas protegidas contra CSRF conforme arquitetura;
- escape/sanitização na renderização;
- Markdown/HTML gerado por IA tratado como não confiável;
- validação de schemas em boundaries.

## 19. Rate limiting e abuso

Aplicar limites prioritariamente em:

- login/recovery onde não coberto suficientemente pelo provider;
- OAuth callbacks anômalos;
- webhooks contra abuso de volume;
- survey público;
- endpoints de geração por IA;
- ações que disparam publicação/campanha.

## 20. Auditoria

Eventos sensíveis append-oriented:

- membership/roles;
- Meta connect/disconnect;
- aprovações;
- comandos financeiros;
- exclusão/exportação;
- alterações de limites;
- estados críticos de lead quando relevantes.

Audit metadata não contém segredo.

## 21. Data deletion e disconnect

O produto deve oferecer operações reais para:

- desconectar Meta;
- apagar dados Meta conforme obrigação/configuração;
- excluir conta/organização quando aplicável;
- responder a callbacks/processos de exclusão exigidos pela Meta;
- remover secrets e jobs pendentes relacionados;
- registrar auditoria sem manter PII proibida.

## 22. Backups e ambientes

Antes de produção:

- separar dev/staging/prod;
- secrets distintos;
- não usar dados reais em fixtures;
- backup/recovery do Postgres configurado conforme plano;
- migrations promovidas de forma controlada.

## 23. Dependências

- pinning/lockfile;
- atualização regular;
- evitar pacote obscuro para funções sensíveis quando biblioteca oficial/madura existe;
- secret scanning e dependency scanning na CI quando configurada.

## 24. Security gates antes de cliente pagante

Obrigatórios:

1. prova RLS 2 tenants;
2. busca no bundle por secrets;
3. teste OAuth state/replay/redirect;
4. webhook duplicate/invalid signature;
5. idempotência de gasto;
6. role bypass por API;
7. survey brute-force/rate-limit básico;
8. PII/log review;
9. disconnect/delete flow;
10. dependency/security scan;
11. revisão manual dos endpoints públicos.

## 25. Regra de mudança

Qualquer feature que introduza novo segredo, provider externo, PII, permission scope ou capacidade de gastar dinheiro deve atualizar este documento ou registrar explicitamente por que o modelo atual já a cobre antes da implementação.
