# TRÁFEGO PAGO — RODADA 000 — BOOTSTRAP TÉCNICO

## 0. Repositório único autorizado — gate bloqueante

O único repositório autorizado nesta execução é:

`rpbrito-art/trafegopago`

Pasta local esperada:

`C:\Users\rpbri\Documents\trafegopago`

O projeto `rpbrito-art/business-weaver` pertence a outro software e está **fora do escopo**.

É proibido alterar, consultar para execução, migrar, commitar ou fazer push em qualquer outro repositório ou projeto Supabase.

Antes de qualquer escrita, execute e registre:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status
supabase --version
```

A execução só pode continuar se o diretório raiz for `trafegopago` e o remote apontar para `rpbrito-art/trafegopago`. Se houver divergência, pare sem alterar nada.

## 1. Bootstrap documental obrigatório

Leia integralmente, nesta ordem:

1. `ESTADO.md`;
2. `.gpt/PROJECT_PROMPT.md`;
3. `README.md`;
4. `docs/00-governanca/PROJECT_CHARTER.md`;
5. `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
6. `docs/01-produto/MVP_CANONICAL.md`;
7. `docs/02-research/RESEARCH_SYNTHESIS.md`;
8. `docs/03-canonical/TECHNICAL_SPEC.md`;
9. `docs/03-canonical/DATA_MODEL.md`;
10. `docs/03-canonical/API_CONTRACTS.md`;
11. `docs/03-canonical/SECURITY_MODEL.md`;
12. `docs/03-canonical/AI_ARCHITECTURE.md`.

Esses documentos são a fonte de verdade. Não substitua decisões canônicas por preferências próprias.

## 2. Estado conhecido

O projeto Supabase remoto já foi criado pelo fundador e a pasta local foi vinculada por:

`supabase link --project-ref cbnxdoxpyioxjwgjhbtq`

Não execute `supabase link` para outro projeto.

Ainda não existe aplicação funcional nem schema de domínio aplicado.

## 3. Objetivo da rodada

Criar uma base executável, pequena, reproduzível, segura e testável para o aplicativo.

Esta rodada **não implementa ainda o domínio funcional do MVP**.

## 4. Escopo autorizado

### Aplicação

- Next.js atual compatível com a documentação vigente;
- TypeScript;
- App Router;
- estrutura limpa de diretórios;
- lint;
- typecheck;
- build;
- framework mínimo de testes;
- página inicial mínima apenas para provar funcionamento.

### Dependências

Adicionar somente dependências justificadas para a fundação atual. Fixar versões pelo package manager e versionar lockfile.

### Supabase

Pode:

- preservar/validar a pasta `supabase/` existente;
- preparar bibliotecas oficiais adequadas a Next.js/SSR conforme documentação vigente;
- preparar clientes browser/server com separação correta;
- criar `.env.example`;
- definir/validar convenções de variáveis de ambiente.

Não pode:

- criar schema empresarial;
- criar tabelas de domínio;
- aplicar migrations de domínio;
- alterar outro projeto Supabase.

### Segurança

Desde já:

- nenhuma `service_role`/secret key no browser;
- nenhuma credencial privilegiada com prefixo `NEXT_PUBLIC_`;
- secrets reais fora do Git;
- `.env*` sensíveis protegidos;
- somente valores públicos no frontend.

## 5. Fora de escopo

Não implementar nesta rodada:

- organizations;
- organization_members;
- RLS de domínio;
- onboarding;
- login funcional completo;
- integração Meta;
- Instagram API;
- Marketing API;
- OAuth Meta;
- campanhas;
- anúncios;
- experimentos;
- leads;
- CRM;
- pesquisas;
- Conversions API;
- filas de domínio;
- Cron de domínio;
- AI Router;
- provedores de IA;
- pagamentos;
- deploy de produção;
- n8n;
- Make.

## 6. Supabase — regras da rodada

Antes de usar comandos Supabase:

```bash
supabase --version
supabase --help
```

Não assuma sintaxe antiga da CLI.

O projeto já está vinculado. Não executar migrations destrutivas, não criar schema final e não alterar SQL manualmente no Dashboard.

## 7. Git e branch

Não implemente diretamente na `main`.

A partir da `main` atualizada, crie:

`claude/bootstrap-tecnico`

Antes disso, confirme working tree e estado da `main`.

Não force push. Não reescreva histórico. Preserve a documentação canônica.

## 8. Verificações obrigatórias

Ao terminar, devem existir gates conceituais equivalentes a:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

Revise também:

```bash
git status
git diff
```

Confirme:

- nenhum secret incluído;
- nenhuma referência operacional a `business-weaver`;
- nenhuma migration de domínio;
- nenhuma alteração inadvertida em outro Supabase.

## 9. CI

Criar CI mínima no GitHub Actions para:

`install → lint → typecheck → test → build`

Não configurar deploy.

Evitar depender de secrets Supabase para validações estruturais quando isso não for necessário.

## 10. Teste mínimo

Criar pelo menos uma prova automatizada real de que o projeto e o harness de testes funcionam. Não criar testes artificiais em quantidade.

## 11. Handoff obrigatório ao GPT

Ao terminar, crie o arquivo:

`rodadas/claude/RELATORIO_RODADA_000_BOOTSTRAP_TECNICO.md`

O relatório deve conter:

### Preflight

- diretório;
- remote;
- branch inicial;
- estado inicial;
- versão da Supabase CLI;
- confirmação do projeto Supabase vinculado.

### Implementação

- arquivos principais criados/alterados;
- stack/versões relevantes;
- dependências;
- estrutura adotada.

### Supabase

- o que foi configurado;
- confirmação de que nenhuma migration de domínio foi aplicada.

### Segurança

- tratamento de env/secrets;
- confirmação de ausência de credenciais no Git.

### Provas

- lint;
- typecheck;
- testes;
- build;
- CI/configuração.

### Git

- branch;
- commit SHA;
- push;
- working tree final.

### Pendências

Problemas reais encontrados.

### Conclusão

Informar se a base está ou não apta para a próxima rodada: Fundação Supabase — Auth + Organizations + Membership + RLS.

## 12. Atualização do estado

Ao concluir a execução, atualize `ESTADO.md` apenas para registrar:

- status da Rodada 000 como `EXECUTADA — AGUARDANDO AUDITORIA GPT`;
- branch e commit produzidos;
- caminho do relatório entregue;
- qualquer bloqueio encontrado.

**Não marque a rodada como aprovada e não avance a etapa.** Aprovação é responsabilidade do GPT após auditoria.

## 13. Commit e push

Somente após todas as verificações passarem:

- revisar diff;
- commitar na branch `claude/bootstrap-tecnico`;
- usar mensagem descritiva;
- fazer push da branch.

Não fazer merge na `main`.

## 14. Princípio de execução

Não demonstre produtividade implementando além do escopo. O sucesso desta rodada é uma fundação pequena, reproduzível, segura e comprovada.
