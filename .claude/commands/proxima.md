---
description: Tráfego Pago — executa somente a próxima ação formalmente autorizada em estado.md
argument-hint: "[opcional: observação ou restrição adicional]"
disable-model-invocation: true
---

# /proxima — EXECUTOR DETERMINÍSTICO

Idioma: Português do Brasil.

Argumento opcional: $ARGUMENTS

O argumento nunca cria autorização nem sobrepõe `estado.md`.

As regras permanentes do executor já estão em `CLAUDE.md`, carregado automaticamente. **Não releia `.gpt/PROJECT_PROMPT.md`, `ACTIVE_DOCS.md` ou histórico por padrão.**

## 1. Preflight

Execute apenas verificações não destrutivas:

```bash
pwd
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status -sb
git fetch --all --prune
```

Confirme:

- raiz esperada `C:\Users\rpbri\Documents\trafegopago`;
- `origin` = `rpbrito-art/trafegopago`;
- existência de `estado.md` e `CLAUDE.md`.

Se repo errado, conflito/rebase/merge pendente ou working tree tornar a execução insegura: pare e reporte. Não corrija remote, não faça reset/clean/force push.

## 2. Estado e autorização

Leia **integralmente `estado.md`**.

Extraia somente:

- rodada/status;
- mandato/correção vigente;
- branch e relatório esperados;
- próxima ação autorizada.

Se o estado indicar aguardando auditoria/aprovação, bloqueado, concluído ou sem mandato executável: **pare sem implementar**.

## 3. Mandato e READ SET

Abra o mandato/correção apontado por `estado.md` e leia-o integralmente.

Depois leia:

- apenas os itens marcados **OBRIGATÓRIO** no READ SET;
- itens **SOB DEMANDA** somente se surgir dependência concreta.

Não varra `rodadas/`, `docs/02-research/`, histórico ou todos os canônicos “por segurança”.

## 4. Preparar a branch antes de executar

Antes de implementação/mutação:

1. obtenha de `estado.md` a branch exata esperada;
2. crie ou mude para essa branch sem destruir trabalho existente;
3. confirme que não está em `main` nem detached HEAD;
4. se for retomada/handoff incompleto, preserve o working tree e reconcilie sem `reset --hard`/`clean`;
5. publique a branch em `origin` **antes da primeira mutação externa**.

A existência da branch remota é checkpoint de continuidade; como a CI completa roda pelo PR, esse push inicial não deve gerar a bateria completa por si só.

## 5. Executar o delta

Execute somente o escopo autorizado e siga o orçamento de prova do mandato/`CLAUDE.md`.

Princípios:

- estado promovido = baseline;
- provar o que mudou + raio de impacto real;
- correção pequena não repete suíte/E2E anterior sem motivo concreto;
- testes locais apenas novos/afetados;
- suíte completa uma única vez na CI final;
- `npm ci` local somente se dependências/lockfile mudarem ou houver necessidade real;
- agrupar consultas remotas;
- não ampliar permissões para facilitar teste.

### Trava antes de mutação externa

Antes de alterar Supabase remoto, Meta, deploy ou outro estado compartilhado:

- confirme branch correta já existente em `origin`;
- identifique os arquivos que causam a mutação;
- para migration/DDL, **o arquivo exato deve estar commitado e publicado na branch antes de aplicar remotamente**;
- para deploy/configuração externa relevante, versione primeiro o código/config correspondente quando tecnicamente possível;
- agrupe artefatos em um único checkpoint pré-mutação quando seguro.

Nunca aplicar migration que exista apenas localmente sem commit. Migration aplicada não pode ser reescrita, renomeada ou “consertada” por `migration repair` sem mandato explícito.

Se uma mutação externa exigir algo que não pode ser versionado antes com segurança, pare e reporte ao GPT.

## 6. Gate humano

Se indispensável e resolvível na sessão:

1. conclua antes tudo que puder sozinho;
2. declare `GATE HUMANO ATIVO`;
3. explique em linguagem simples o que precisa ser feito e por quê;
4. peça somente a ação/dado indispensável;
5. aguarde;
6. retome e conclua a rodada.

Não peça segredo no chat.

## 7. Handoff — gate obrigatório de conclusão

Ao concluir o delta:

- produza relatório compacto no caminho esperado;
- atualize `estado.md` da branch apenas com fatos de execução;
- faça commit/push final;
- abra PR para `main` se previsto;
- aguarde a CI exigida pelo mandato.

**Antes de dizer que terminou, prove os 8 itens:**

1. branch atual = branch esperada;
2. `origin/<branch>` existe;
3. `HEAD` local = `HEAD` remoto da branch;
4. relatório esperado existe no commit remoto;
5. `estado.md` remoto indica `EXECUTADA — AGUARDANDO AUDITORIA GPT` ou estado final previsto;
6. PR existe, aponta para `main` e usa o `HEAD` correto quando exigido;
7. CI exigida está verde, salvo blocker explicitamente permitido;
8. `git status -sb` não mostra trabalho autorizado esquecido.

Se algum item falhar, **não declare conclusão**. Corrija o handoff na própria sessão; não repita testes já válidos sem motivo.

Rodada normal: relatório ≤100 linhas/~10 KB. Microcorreção: ≤60 linhas/~6 KB.

Nunca autoaprove, autopromova ou inicie a rodada seguinte.

## Resultado esperado

### Com autorização

`preflight → estado → mandato → READ SET → branch remota → implementar → checkpoint pré-mutação quando necessário → mutações/provas → relatório → commit/push → PR/CI → verificar handoff → auditoria GPT`

### Sem autorização

`preflight → estado → nenhuma mutação → informar status e quem deve agir a seguir`
