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

Se o mandato pedir mais de 7 documentos obrigatórios, registre a justificativa existente; não amplie ainda mais sem necessidade.

## 4. Executar o delta

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

Quando houver Supabase, confirme o project ref indicado por `estado.md` antes de mutar. Migration aplicada não pode ser reescrita.

## 5. Gate humano

Se indispensável e resolvível na sessão:

1. conclua antes tudo que puder sozinho;
2. declare `GATE HUMANO ATIVO`;
3. explique em linguagem simples o que precisa ser feito e por quê;
4. peça somente a ação/dado indispensável;
5. aguarde;
6. retome e conclua a rodada.

Não peça segredo no chat.

## 6. Handoff

Ao concluir:

- execute somente os gates previstos pelo delta;
- deixe a suíte completa para a CI final, salvo exigência explícita diferente;
- produza relatório compacto no caminho de `estado.md`;
- rodada normal: ≤100 linhas/~10 KB; microcorreção: ≤60 linhas/~6 KB;
- atualize `estado.md` apenas com fatos de execução;
- prefira um único commit/push final;
- abra PR draft se o mandato exigir;
- pare em `EXECUTADA — AGUARDANDO AUDITORIA GPT`.

Nunca autoaprove, autopromova ou inicie a rodada seguinte.

## Resultado esperado

### Com autorização

`preflight → estado → mandato → READ SET obrigatório → executar delta → provas proporcionais → CI final → relatório compacto → handoff GPT`

### Sem autorização

`preflight → estado → nenhuma mutação → informar status e quem deve agir a seguir`
