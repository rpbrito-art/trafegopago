# DECISÃO — NOME CANÔNICO DO PRODUTO: QUORON

Status: **APROVADA PELO FUNDADOR**
Data: 2026-08-25

## 1. Decisão

O nome canônico do software passa a ser **Quoron**.

`Tráfego Pago` deixa de ser nome de produto e passa a ser tratado apenas como nome técnico/histórico provisório onde ainda existir até a migração controlada.

A partir desta decisão:

- novos textos de produto devem usar **Quoron**;
- novas telas devem usar **Quoron**;
- novos documentos canônicos substantivos devem usar **Quoron**;
- `Tráfego Pago` não deve continuar sendo introduzido como marca em código novo.

## 2. Momento de execução da renomeação

A Rodada 004A — AI Foundation Core já está em execução. Não interromper nem alterar a branch em andamento apenas para renomear marca.

A renomeação técnica deve ser incorporada **imediatamente após a auditoria da 004A, no início da próxima rodada substantiva**, antes de expandir novas superfícies de produto/UI.

Motivos:

1. hoje a marca ainda está pouco espalhada no runtime, portanto o custo de troca é baixo;
2. interromper a 004A criaria conflito e retrabalho desnecessário;
3. esperar mais fases aumentaria a quantidade de telas, testes e documentação a migrar;
4. a troca pode ser feita de forma auditável junto da próxima mudança substantiva, sem rodada de housekeeping apenas para alinhamento documental.

## 3. Escopo da primeira migração

Na primeira rodada substantiva após a 004A, substituir o nome de produto em:

- metadata/título do aplicativo;
- Home e demais textos visíveis ao usuário;
- constante(s) de nome da aplicação;
- README atual;
- package name quando seguro (`trafegopago` → `quoron`);
- documentação canônica ativa de produto e arquitetura quando o nome aparecer como marca atual;
- `PROJECT_PROMPT.md`, `CLAUDE.md`, `estado.md` e documentos de governança ativos, sem alterar a semântica técnica.

Não fazer busca/substituição cega em migrations, hashes, ids, nomes históricos, evidências ou relatórios antigos.

## 4. O que NÃO deve ser renomeado nessa primeira migração

### Histórico promovido e evidências antigas

Rodadas, relatórios, auditorias, commits e documentos históricos que registram fatos do período em que o projeto se chamava `Tráfego Pago` não devem ser reescritos retroativamente apenas por branding.

### Repositório GitHub

O repositório `rpbrito-art/trafegopago` **não deve ser renomeado enquanto houver branches/PRs ativos que ainda dependem do caminho atual**, especialmente:

- PR #12 / trilha 003B Meta estacionada;
- branch/PR da 004A enquanto estiver em execução/auditoria.

A troca do nome do repositório pode ocorrer em uma janela própria, depois de estabilizar as branches ativas, com atualização coordenada de remote local, documentação e automações.

### Pasta local

`C:\Users\rpbri\Documents\trafegopago` pode permanecer temporariamente como caminho técnico. Renomear pasta local no meio de branches ativas não agrega valor ao usuário e pode quebrar scripts/sessões do Claude.

### Supabase

O project ref `cbnxdoxpyioxjwgjhbtq` é identificador técnico e não precisa mudar por branding. O nome visível do projeto no painel pode ser avaliado depois, sem recriar projeto nem alterar ref.

### Meta

Não alterar agora nomes de Meta App, Business Login Configuration, portfolios ou ativos externos. A trilha Meta está estacionada e esses recursos fazem parte de uma investigação ainda não promovida. Quando a integração Meta for retomada e estabilizada, nomes visíveis poderão ser harmonizados para Quoron sem alterar ids nem ownership por tentativa.

## 5. Regra de não regressão

Depois da primeira migração substantiva:

- `Quoron` é a marca exibida ao usuário;
- novos textos não devem voltar a usar `Tráfego Pago` como nome do software;
- identificadores técnicos antigos podem sobreviver temporariamente quando a troca não produzir valor funcional e trouxer risco operacional;
- qualquer identificador externo deve ser renomeado apenas quando sua identidade e impacto estiverem comprovados.

## 6. Estado

- decisão de nome: **APROVADA**;
- produto canônico: **Quoron**;
- renomeação de runtime/docs ativos: **PLANEJADA PARA A PRIMEIRA RODADA SUBSTANTIVA APÓS A 004A**;
- renomeação do repositório/pasta/recursos externos: **ADIADA PARA JANELA SEGURA**;
- 004A: **não deve ser interrompida por esta decisão**.
