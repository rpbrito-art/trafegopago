import type { DeclaredContextReview } from "@/lib/ai/tasks/declared-context-review";

/**
 * Aviso epistemológico da rodada.
 *
 * Texto **estático**, renderizado por código e não pelo modelo. Depender do
 * campo `limitations` para dizer isto seria confiar ao próprio modelo a tarefa
 * de declarar os limites dele (mandato §4).
 */
export const AVISO_SOMENTE_DECLARADO =
  "Esta revisão considera apenas as informações que você forneceu ao Quoron. Ainda não analisamos seu Instagram, mercado, leads ou resultados reais.";

/**
 * A revisão, em português simples.
 *
 * Nada de provider, modelo, tokens, uuid, versão de schema ou custo técnico: o
 * usuário lê o que o Quoron entendeu, não como o Quoron funciona
 * (mandato §10).
 */
export function ReviewResult({
  review,
  createdAt,
}: {
  review: DeclaredContextReview;
  createdAt: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded border border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">O que o Quoron entendeu</h2>
        <p className="text-sm text-neutral-700">{review.summary}</p>
        <p className="text-xs text-neutral-500">
          Revisado em {formatarData(createdAt)}
        </p>
      </section>

      {review.declaredFacts.length > 0 ? (
        <Bloco titulo="O que você me contou">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-neutral-700">
            {review.declaredFacts.map((fato, indice) => (
              <li key={indice}>{fato.statement}</li>
            ))}
          </ul>
        </Bloco>
      ) : null}

      {review.gaps.length > 0 ? (
        <Bloco titulo="O que ainda falta esclarecer">
          <ul className="flex flex-col gap-3 text-sm text-neutral-700">
            {review.gaps.map((lacuna, indice) => (
              <li key={indice} className="flex flex-col gap-1">
                <span className="font-medium">{lacuna.topic}</span>
                <span className="text-neutral-600">{lacuna.whyItMatters}</span>
              </li>
            ))}
          </ul>
        </Bloco>
      ) : null}

      {review.tensions.length > 0 ? (
        <Bloco titulo="Pontos que vale confirmar" tom="atencao">
          <ul className="flex flex-col gap-3 text-sm text-amber-900">
            {review.tensions.map((tensao, indice) => (
              <li key={indice} className="flex flex-col gap-1">
                <span className="font-medium">{tensao.statement}</span>
                <span>{tensao.interpretation}</span>
              </li>
            ))}
          </ul>
          {/* A tensão é hipótese, não veredito: quem decide é o negócio. */}
          <p className="text-sm text-amber-900">
            São observações sobre o que você informou, não conclusões. Se for
            intencional, está tudo certo.
          </p>
        </Bloco>
      ) : null}

      {review.nextQuestion ? (
        <Bloco titulo="Uma pergunta que ajudaria" tom="ok">
          <p className="text-sm font-medium text-neutral-800">
            {review.nextQuestion.question}
          </p>
          <p className="text-sm text-neutral-700">
            {review.nextQuestion.whyItMatters}
          </p>
          {/* Responder é decisão do usuário, e a resposta não vira fato
              automaticamente: persistir isso pertence a etapa própria
              (mandato §17). */}
          <p className="text-sm text-neutral-600">
            Você pode atualizar seu negócio, ofertas ou objetivo quando quiser —
            e pedir uma nova revisão depois.
          </p>
        </Bloco>
      ) : null}

      <section className="flex flex-col gap-2 rounded border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold">Limites desta revisão</h2>
        <p className="text-sm text-neutral-700">{AVISO_SOMENTE_DECLARADO}</p>
        {review.limitations.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-neutral-600">
            {review.limitations.map((limite, indice) => (
              <li key={indice}>{limite}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Bloco({
  titulo,
  children,
  tom = "neutro",
}: {
  titulo: string;
  children: React.ReactNode;
  tom?: "neutro" | "ok" | "atencao";
}) {
  const cores = {
    neutro: "border-neutral-200",
    ok: "border-emerald-300 bg-emerald-50",
    atencao: "border-amber-300 bg-amber-50",
  } as const;

  return (
    <section className={`flex flex-col gap-3 rounded border p-4 ${cores[tom]}`}>
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}
