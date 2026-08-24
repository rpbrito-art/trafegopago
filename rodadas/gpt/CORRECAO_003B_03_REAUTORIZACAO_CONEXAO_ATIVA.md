# CORREÇÃO 003B-03 — REAUTORIZAÇÃO DE CONEXÃO META ATIVA

Status: **PLANEJADA — AGUARDANDO AUTORIZAÇÃO EXPLÍCITA DO FUNDADOR**
Data: 2026-08-24
Rodada pai: **003B — Meta Asset Discovery & Selection**

## 1. Fato observado no E2E real

A conexão real atual está `ACTIVE`, mas foi emitida antes de a configuração Meta expor/conceder os escopos de Instagram necessários.

Escopos efetivamente persistidos no token atual:

- `pages_show_list`;
- `pages_read_engagement`;
- `public_profile`.

Ausentes no token atual:

- `instagram_basic`;
- `instagram_manage_insights`.

No painel Meta, o caso de uso correto **Instagram API setup with Facebook Login** foi habilitado e, em seguida, `instagram_basic` e `instagram_manage_insights` foram adicionados à configuração `Quoron Instagram Dev Login` (`config_id=38307908848822330`).

Logo, a configuração externa está preparada, mas o token já emitido não ganha novos escopos retroativamente.

## 2. Diagnóstico técnico

O backend já suporta reautorização sobre conexão viva:

- `startMetaAuthorization()` cria nova intenção OAuth sem destruir a conexão atual;
- `completeMetaAuthorization()` só chama `begin_meta_connection` depois de trocar o `code` por um novo token;
- `begin_meta_connection` retoma a linha `PENDING|ACTIVE|ACTION_REQUIRED`, muda para `PENDING` e **preserva o token anterior**;
- `activate_meta_connection` substitui segredo, escopos, identidade e `ACTIVE` atomicamente;
- se a troca do `code` falhar antes de `begin_meta_connection`, a conexão anterior permanece `ACTIVE` intacta.

Portanto, **não há motivo para desconectar antes de ampliar autorização**.

A lacuna está na UI: `MetaAssetsSection`, no estado `permissao-faltando`, mostra apenas texto dizendo para conectar novamente, mas não renderiza `MetaConnectButton`.

## 3. Objetivo da correção

Permitir que uma conexão Meta já `ACTIVE`, porém com capacidade incompleta, seja reautorizada pelo mesmo fluxo seguro já existente, sem revogação/desconexão prévia.

## 4. Delta autorizado se o fundador aprovar

### 4.1 UI

No ramo `state.kind === "permissao-faltando"` de `src/components/meta/meta-assets-section.tsx`:

- manter linguagem de negócio, sem expor nome de escopo ao usuário final;
- explicar que a conexão existe, mas precisa ampliar a autorização para acessar o Instagram;
- renderizar `MetaConnectButton` com `organizationId` vigente e rótulo **`Atualizar autorização`**.

Texto sugerido, podendo ser ajustado sem mudar sentido:

> Sua conta da Meta está conectada, mas ainda falta liberar o acesso necessário ao Instagram. Atualize a autorização para continuar.

### 4.2 Não alterar o backend por conveniência

Não criar endpoint novo, RPC nova ou migration apenas para esse botão. Reutilizar `connectMetaAction` + `startMetaAuthorization` + callback existentes.

Se durante a execução o Claude provar um bloqueio real no backend que impeça reautorizar conexão `ACTIVE`, deve parar com:

`DECISÃO ARQUITETURAL NECESSÁRIA — AGUARDANDO GPT`

Não improvisar outra estratégia de token.

### 4.3 Testes obrigatórios

Cobrir, no mínimo:

1. `permissao-faltando` renderiza **Atualizar autorização**;
2. o botão usa a organização do estado e a action canônica de conexão;
3. os demais estados não ganham botão indevido;
4. regressão da UI de seleção continua verde;
5. testes existentes de gateway/atomicidade continuam verdes.

Executar lint, typecheck, testes focados e suíte/CI conforme protocolo vigente da 003B.

## 5. Gate humano após implementação + auditoria GPT

Somente depois de o GPT auditar e aprovar esta correção:

1. fundador clica **Atualizar autorização** no localhost;
2. no Facebook Login for Business seleciona o portfólio Quoron, Página Quoron e Instagram @goquoron;
3. conclui o consentimento;
4. GPT audita imediatamente o novo token no Supabase;
5. escopos mínimos esperados para prosseguir:
   - `pages_show_list`;
   - `instagram_basic`;
6. para preparar a F4/Insights, também esperamos:
   - `pages_read_engagement`;
   - `instagram_manage_insights`;
7. nenhuma campanha/gasto é criado por esse gate;
8. descoberta real deve então oferecer `@goquoron` para seleção.

## 6. Preservações e proibições

Até nova autorização explícita:

- **não desconectar** a conexão real atual;
- não remover integração em Apps conectados;
- não apagar token/Vault;
- não repetir OAuth manualmente fora do botão corrigido;
- não criar novo Meta App;
- não migrar para Instagram Login/`instagram_business_*`;
- não criar campanha nem gasto;
- não promover a 003B.

## 7. Critério de conclusão da correção

A correção só pode ser considerada executada quando código + testes estiverem prontos. Só pode ser considerada auditada após revisão independente do GPT. O E2E real de reautorização é gate posterior e continua necessário para fechar a 003B.
