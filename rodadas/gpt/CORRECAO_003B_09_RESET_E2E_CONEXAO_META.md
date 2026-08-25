# CORREÇÃO 003B-09 — RESET E2E DA CONEXÃO META

Status: **AUTORIZADA — EXECUTAR**

Rodada-mãe: **003B — Meta Asset Discovery & Selection**
Branch: `claude/rodada-003b-meta-asset-discovery-selection`
PR: #12

## 1. Objetivo

Deixar o fluxo de conexão Meta utilizável para teste repetível do zero:

`desconectar de verdade → estado local limpo → conectar novamente → autorização nova → estado coerente na tela`.

O fundador relatou que **Conectar novamente** e **Desconectar** aparentam não funcionar e pediu explicitamente que o fluxo fique funcional para reiniciar os testes do zero.

## 2. Fatos já auditados antes desta correção

### 2.1 Reconexão está chegando ao backend

Snapshot independente do Supabase em 2026-08-25 mostrou várias novas `meta_oauth_intents` criadas pelo teste real do fundador entre aproximadamente 10h09 e 10h12 BRT. Quatro voltaram e foram consumidas.

A conexão `655da6e6-9056-456d-a81d-5e2570da5faf` foi novamente ativada em `2026-08-25T13:12:06.063762+00:00`, permanecendo `ACTIVE` com os seis scopes USER já conhecidos.

Portanto, o problema observado como “Conectar novamente não funciona” **não é ausência de POST/Server Action**. O OAuth chega ao servidor e pelo menos uma reconexão concluiu. O problema é o ciclo de estado/UX posterior e a incapacidade prática de voltar a um estado realmente limpo.

### 2.2 Defeito concreto na desconexão USER

O código já possui o caminho correto para USER:

`DELETE /{user-id}/permissions`

em `revokeUserPermissions()`.

Evidência primária: o SDK oficial `facebook/facebook-nodejs-business-sdk`, objeto `User`, expõe `deletePermissions()` usando o edge `/permissions`.

Problema do parser atual:

```ts
const corpo = (await resposta.json()) as { success?: unknown };
if (corpo.success === true || corpo.success === "true") return { ok: true };
```

Esse parser só aceita objeto com `success`. O contrato histórico/documentado desse endpoint também pode responder sucesso como JSON booleano literal `true`. Nesse caso a Meta pode ter concluído a revogação e nosso código classifica o resultado como `SEM_SUCCESS`, preservando localmente uma conexão que o provider já invalidou.

A forma exata retornada pelo ambiente atual deve ser **provada no E2E real desta correção**, registrando somente a forma segura do payload (boolean/object), nunca token, URL ou `message`.

### 2.3 UX contraditória

Hoje a página renderiza separadamente:

- `MetaSection` a partir do estado persistido (`ACTIVE` → cartão verde “Meta conectada”);
- `MetaAssetsSection` a partir de uma chamada real de descoberta.

Se o token for recusado pela Meta durante a descoberta, a mesma página pode simultaneamente dizer:

- “Meta conectada”; e
- “A conexão precisa da sua atenção”.

Esse estado contraditório foi observado pelo fundador e precisa ser eliminado.

## 3. Delta autorizado

Claude deve executar esta correção de ponta a ponta, sem abrir nova rodada.

### 3.1 Corrigir a revogação USER

Em `src/lib/meta/gateway.ts`:

1. manter a classificação credential-aware já auditada;
2. manter BISU no caminho externo já existente — **não inventar endpoint de revogação BISU**;
3. no caminho USER, corrigir `revokeUserPermissions()` para aceitar somente sucessos explícitos compatíveis com a resposta real:
   - JSON literal `true`;
   - e, se preservado por compatibilidade, objeto com `success === true`;
4. qualquer outra forma continua falhando fechada;
5. preferir `Authorization: Bearer <token>` para o token USER no `DELETE`, sem colocá-lo na URL, desde que a chamada real confirme compatibilidade;
6. nunca logar token, App Secret, URL completa ou `message` da Meta;
7. manter pós-condição: só limpar localmente quando houver evidência suficiente de que a credencial não continua ativa.

### 3.2 Tornar o estado recusado coerente

Quando a descoberta real classificar a credencial como `conexao-recusada`:

- não mostrar simultaneamente o cartão verde “Meta conectada” como se estivesse tudo saudável;
- apresentar **um único estado acionável** em linguagem simples;
- ação principal: **Conectar novamente**;
- ação secundária: **Desconectar e começar de novo**;
- a ação secundária deve usar o mesmo `disconnectMetaAction` canônico, sem rota paralela e sem reset inseguro de banco.

A implementação pode ajustar `ContaPage`, `MetaSection` e/ou `MetaAssetsSection`, escolhendo o menor delta coerente. Não duplicar lógica de autorização.

### 3.3 Estado pós-desconexão

Após uma desconexão USER realmente comprovada:

- `meta_connections.status` deve virar `REVOKED`;
- `token_secret_reference` deve ficar nulo;
- `token_expires_at` nulo;
- `granted_scopes` vazio;
- `disconnected_at` preenchido;
- nenhum ativo antigo pode aparecer como ativo/selecionável sobre uma conexão revogada;
- a página `/conta` deve mostrar apenas o estado de **Conectar a Meta**, sem cartão verde residual e sem “conexão precisa da sua atenção”.

Não apagar histórico válido de OAuth/intents apenas para “ficar bonito”. Estado terminal pode permanecer histórico.

## 4. Provas obrigatórias

### 4.1 Testes automatizados

Adicionar/ajustar testes para provar pelo menos:

1. `DELETE /permissions` com corpo JSON literal `true` é sucesso;
2. `{ success: true }`, se mantido, é sucesso;
3. `false`, objeto sem sucesso e corpo ilegível não limpam localmente;
4. BISU continua sem usar o endpoint USER;
5. token USER não aparece na URL do DELETE se migrado para Authorization header;
6. estado `conexao-recusada` oferece **Conectar novamente** e **Desconectar e começar de novo**;
7. nessa condição não existe mensagem simultânea de “Meta conectada” saudável;
8. depois de `REVOKED`, a UI volta a **Conectar a Meta**.

Rodar suíte Meta/actions/componentes, typecheck e lint.

### 4.2 E2E REAL DE DESCONEXÃO — AUTORIZADO PELO FUNDADOR

O fundador pediu explicitamente para “testar do zero”. Portanto está autorizada **uma desconexão real da conexão USER atual** como prova desta correção.

Conexão alvo:

`655da6e6-9056-456d-a81d-5e2570da5faf`

Organização:

`a8f79c4b-b10a-4e01-b12d-2d8e62917009`

Usuário/membership esperado:

`d4ed915a-2fe8-4990-9e73-9a68fbbd1f9d`

Regras da prova:

- usar o mesmo caminho de backend da aplicação, não mutação SQL direta para simular sucesso;
- é permitido um harness/script mínimo que invoque a função canônica `disconnectMeta()` com a identidade/organização de teste para conseguir exercitar o backend sem depender da sessão do navegador;
- não duplicar a lógica de revogação no script;
- o script não pode imprimir token, secret ou URL;
- registrar somente classe da credencial, HTTP/código/subcode seguros, formato do corpo de sucesso e estado final;
- depois da chamada, consultar Supabase e provar o estado `REVOKED` e a limpeza do segredo/referência;
- não reconectar automaticamente após a prova: deixar o ambiente **desconectado e pronto para o fundador iniciar um teste do zero pela UI**.

Se a Meta devolver uma resposta diferente da hipótese acima, Claude pode corrigir o parser **dentro deste mesmo mandato**, desde que:

- a correção continue restrita ao contrato de desconexão USER;
- a evidência real seja registrada;
- nenhum comportamento BISU seja adivinhado;
- não haja fallback “apagar local mesmo sem prova”.

## 5. E2E de reconexão depois do reset

Claude não deve completar o OAuth em nome do fundador após o reset.

Critério de saída desta correção:

- ambiente local/remoto de dados fica comprovadamente **desconectado**;
- UI e backend ficam prontos para o fundador clicar **Conectar a Meta** e fazer uma autorização nova do zero;
- esse próximo OAuth real será o teste humano imediatamente posterior à auditoria GPT.

## 6. Não autorizado

- mudar `.env.local`;
- alterar Meta App ou Business Login Configuration;
- adicionar/remover scopes;
- criar/excluir/mover Business Portfolio;
- mexer em Bizzman5po, BizzManiq1 ou Quoron;
- transferir Page/Instagram/Ad Account;
- usar terceiro;
- Page Access Token;
- campanha, anúncio ou gasto;
- importar conteúdo;
- promover/mergear 003B;
- iniciar Fase 4;
- tratar o E2E USER como prova do BISU.

## 7. Entrega

Claude deve:

1. implementar;
2. executar testes/typecheck/lint;
3. executar a desconexão USER real autorizada e deixar a conexão `REVOKED`;
4. provar o estado final no Supabase;
5. publicar novo HEAD na branch da 003B;
6. obter CI verde do PR #12;
7. escrever `rodadas/claude/RELATORIO_CORRECAO_003B_09_RESET_E2E_CONEXAO_META.md`;
8. parar em **AGUARDANDO AUDITORIA GPT**.
