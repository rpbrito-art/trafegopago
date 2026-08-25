import type { DeclaredContextReview } from "@/lib/ai/tasks/declared-context-review";

import type { DeclaredContextSnapshot } from "./snapshot";

/**
 * Critérios da eval dos 12 casos sintéticos (Correção 004E-02 §5).
 *
 * Vive num módulo importável, e não dentro do script, por um motivo prático: o
 * avaliador precisa ser exercitável em CI **sem provider real**. Um avaliador
 * que só roda junto com a chamada paga é um avaliador que ninguém consegue
 * provar — e a reauditoria mostrou que o anterior deixava passar exatamente as
 * omissões que ele deveria pegar.
 *
 * O que mudou em relação à versão auditada:
 *
 * - ausência esperada com `gaps` vazio agora **falha**. Antes, a verificação
 *   era condicionada a `gaps.length > 0`, então devolver zero lacunas escapava
 *   de toda a checagem — justamente o pior caso;
 * - tensão esperada passou a ser um metadado explícito da fixture
 *   (`esperaTensao`), e não uma inferência a partir do nome do caso.
 */

/** O que a fixture afirma que a revisão precisa reconhecer. */
export type ExpectativaDoCaso = {
  /** Tópicos que devem aparecer como lacuna. */
  ausentesEsperados?: string[];
  refsEsperadas?: string[];
  refsProibidas?: string[];
  /** O caso tem tensão declarada plausível e a revisão deve apontá-la. */
  esperaTensao?: boolean;
  /**
   * Refs às quais uma tensão esperada precisa estar ancorada.
   *
   * Sem isto, "tensão" poderia ser qualquer coisa: o que se quer é que ela
   * compare os pontos que de fato divergem no caso.
   */
  refsDaTensao?: string[];
};

/**
 * Afirmações que a task não pode fazer.
 *
 * A rodada não observou mercado, público nem desempenho. Qualquer uma destas
 * frases seria invenção apresentada como leitura do negócio.
 */
export const FATOS_EXTERNOS_PROIBIDOS: readonly RegExp[] = [
  /\b(o|seu)\s+p[úu]blico\s+(?:[a-zà-ú]+\s+){0,2}(prefere|busca|procura|quer|valoriza)\b/i,
  // Verbo de ligação no meio é o caso comum — "o preço **está** alto" —, e
  // exigir adjacência deixava justamente essa forma passar. A classe precisa
  // incluir acentuadas: `\w` não casa "está", que é o verbo mais provável.
  /\bpre[çc]o\s+(?:[a-zà-ú]+\s+){0,2}(alto|baixo|caro|barato|competitiv|acima|abaixo)/i,
  /\b(converte|convers[ãa]o)\s+(?:[a-zà-ú]+\s+){0,2}(melhor|mais|bem)\b/i,
  /\b(o\s+)?mercado\s+(mostra|indica|est[áa]|prefere)\b/i,
  /\bconcorr[êe]ncia\b/i,
  /\b(alta|baixa|boa|grande)\s+demanda\b/i,
  /\b(vai|deve)\s+(vender|performar|converter)\b/i,
  /\b\d+\s*%/,
];

/** Todo o texto que a revisão mostra ao usuário, num só lugar. */
export function textoDaRevisao(review: DeclaredContextReview): string {
  return [
    review.summary,
    ...review.declaredFacts.map((f) => f.statement),
    ...review.gaps.map((g) => `${g.topic} ${g.whyItMatters}`),
    ...review.tensions.map((t) => `${t.statement} ${t.interpretation}`),
    review.nextQuestion
      ? `${review.nextQuestion.question} ${review.nextQuestion.whyItMatters}`
      : "",
    ...review.limitations,
  ].join(" ");
}

/**
 * Avalia uma revisão contra o que o caso sintético espera.
 *
 * Devolve a lista de problemas — vazia quando o caso passa. Não usa frase
 * literal como critério: o que se verifica são invariantes.
 */
export function avaliarCaso(input: {
  expectativa: ExpectativaDoCaso;
  snapshot: DeclaredContextSnapshot;
  review: DeclaredContextReview;
}): string[] {
  const { expectativa, snapshot, review } = input;
  const problemas: string[] = [];

  const refsConhecidas = new Set(snapshot.facts.map((fato) => fato.ref));

  const todasRefs = [
    ...review.declaredFacts.flatMap((f) => f.evidenceRefs),
    ...review.gaps.flatMap((g) => g.evidenceRefs),
    ...review.tensions.flatMap((t) => t.evidenceRefs),
  ];

  for (const ref of todasRefs) {
    if (!refsConhecidas.has(ref)) problemas.push(`ref inexistente: ${ref}`);
  }

  const texto = textoDaRevisao(review);

  for (const padrao of FATOS_EXTERNOS_PROIBIDOS) {
    if (padrao.test(texto)) {
      problemas.push(`afirmação externa proibida: ${padrao}`);
    }
  }

  // Ausência esperada precisa virar lacuna. **Sem condicionar a `gaps` não
  // estar vazio**: devolver zero lacunas quando falta informação é a omissão
  // mais grave, não a que escapa da verificação.
  for (const ausente of expectativa.ausentesEsperados ?? []) {
    if (!lacunaCobreTopico(review, ausente)) {
      problemas.push(`ausência não reportada como lacuna: ${ausente}`);
    }
  }

  if (expectativa.esperaTensao) {
    if (review.tensions.length === 0) {
      problemas.push("tensão esperada não foi apontada");
    } else if (expectativa.refsDaTensao && expectativa.refsDaTensao.length > 0) {
      const ancorada = review.tensions.some((tensao) =>
        expectativa.refsDaTensao!.some((ref) => tensao.evidenceRefs.includes(ref)),
      );

      if (!ancorada) {
        problemas.push("tensão apontada não está ancorada nas refs pertinentes");
      }
    }
  }

  // Tensão é sempre hipótese que pede confirmação humana — em qualquer caso,
  // esperada ou não.
  for (const tensao of review.tensions) {
    if (tensao.needsHumanConfirmation !== true) {
      problemas.push("tensão sem confirmação humana");
    }
  }

  // Português utilizável: critério objetivo simples, sem exigir frase literal.
  if (review.summary.trim().length < 20) problemas.push("resumo curto demais");
  if (!/[áéíóúâêôãõç]/i.test(texto)) problemas.push("texto não parece português");

  return problemas;
}

/**
 * A lacuna fala do tópico esperado?
 *
 * Comparação por palavras significativas, e não por igualdade: o modelo
 * escreve "Diferenciais do negócio" ou "diferenciais", e exigir a frase exata
 * transformaria a eval num teste de redação.
 */
function lacunaCobreTopico(
  review: DeclaredContextReview,
  topicoEsperado: string,
): boolean {
  const palavras = topicoEsperado
    .toLowerCase()
    .split(/\s+/)
    .filter((palavra) => palavra.length >= 5);

  if (palavras.length === 0) return review.gaps.length > 0;

  return review.gaps.some((lacuna) => {
    const texto = `${lacuna.topic} ${lacuna.whyItMatters}`.toLowerCase();
    return palavras.some((palavra) => texto.includes(palavra));
  });
}
