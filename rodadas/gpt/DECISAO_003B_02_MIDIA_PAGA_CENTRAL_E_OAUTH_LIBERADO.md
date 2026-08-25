# DECISÃO 003B-02 — MÍDIA PAGA CENTRAL E OAUTH LIBERADO

Status: **DECISÃO DE PRODUTO AUTORIZADA PELO FUNDADOR — OAUTH 003B LIBERADO**
Data: 2026-08-24

## 1. Contexto observado

No OAuth real da 003B, após selecionar:

- portfólio empresarial: Quoron;
- Página do Facebook: Quoron;
- conta profissional do Instagram: `goquoron`;
- nenhuma conta de anúncios como ativo selecionado;

a tela final da Meta informou também capacidade para gerenciar anúncios e acessar anúncios/estatísticas relacionadas.

O gate anterior `GATE_003B_OAUTH_BLOQUEADO_PERMISSOES_ANUNCIOS.md` bloqueou a confirmação com base na interpretação documental de que mídia paga deveria permanecer uma capacidade opcional/periférica no login base.

## 2. Correção explícita do fundador

O fundador corrigiu essa interpretação.

A intenção ao ampliar espaço para o modo orgânico era garantir que:

- orgânico também produza valor e aprendizagem;
- o usuário não seja obrigado a gastar desde o primeiro uso;
- o produto não reduza todo conteúdo a anúncio.

A intenção **não** era retirar centralidade estratégica da mídia paga.

Decisão correta:

**todo usuário deve ter acesso à trajetória de crescimento por tráfego pago; mídia paga é pilar central do produto, ainda que um usuário possa não ativá-la imediatamente ou possa operar organicamente por algum período.**

Canônico criado:

`docs/01-produto/PAID_MEDIA_CANONICAL.md`

## 3. Consequência arquitetural

A existência de permissão técnica relacionada a Ads no token não equivale a autorização de gasto.

Separar obrigatoriamente:

`permissão técnica → seleção/configuração de Ad Account → recomendação → aprovação financeira humana → comando de domínio → operação Meta`

Permissão técnica não pode, sozinha:

- criar campanha;
- alterar orçamento;
- ativar anúncio;
- gerar gasto.

As travas de `SECURITY_MODEL.md` e da futura Financial Approval Foundation permanecem integralmente vigentes.

## 4. Decisão para o OAuth atual

A presença, na tela de consentimento, de capacidade coerente com gerenciamento/leitura de anúncios **não bloqueia mais o OAuth 003B** apenas por ser relacionada a mídia paga.

O OAuth atual está autorizado a prosseguir porque:

- a capacidade pertence ao produto planejado;
- a Meta a apresentou dentro do fluxo oficial da configuração real;
- não houve seleção de Ad Account neste gate;
- não existe código autorizado nesta rodada que gere gasto;
- qualquer futura mutação onerosa continuará condicionada a approval persistida.

O fundador pode clicar **Confirmar** na tela atual da Meta.

## 5. O que continua proibido

Esta decisão não autoriza:

- criar campanha manualmente por teste;
- gerar gasto;
- ampliar permissões adicionais por tentativa fora do fluxo apresentado;
- persistir Page Access Token sem decisão arquitetural;
- iniciar Fase 4 antes do fechamento da 003B;
- promover a 003B antes do E2E, sondas e auditoria final.

## 6. Documento anterior superado

`rodadas/gpt/GATE_003B_OAUTH_BLOQUEADO_PERMISSOES_ANUNCIOS.md` permanece como evidência histórica da hipótese anterior, mas sua decisão de bloquear o OAuth está **SUPERADA** por esta decisão e pelo `PAID_MEDIA_CANONICAL.md`.

## 7. Harmonização documental

Antes da próxima rodada substantiva depois da 003B, harmonizar diretamente as formulações conflitantes em:

- `.gpt/PROJECT_PROMPT.md`;
- `docs/01-produto/GROWTH_INTELLIGENCE_CANONICAL.md`;
- `docs/01-produto/MVP_CANONICAL.md`;
- `docs/00-governanca/IMPLEMENTATION_ROADMAP.md`;
- outros canônicos que repetirem a interpretação antiga.

Não criar uma rodada artificial apenas para alinhar numeração; fazer a harmonização antes de autorizar a próxima etapa substantiva.
