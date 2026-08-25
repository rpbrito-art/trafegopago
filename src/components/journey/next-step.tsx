import Link from "next/link";

import type { JourneyStep } from "@/lib/growth/journey";

/**
 * O próximo passo, em linguagem de negócio.
 *
 * Uma ação principal por vez, e nunca um mural de cartões: a tela existe para
 * dizer o que fazer agora, não para devolver ao usuário a tarefa de descobrir
 * sozinho por onde começar (`AGENTIC_PRODUCT_CANONICAL.md` §5).
 *
 * Nenhum estado interno, id ou termo de banco aparece — o que a pessoa lê é o
 * passo, por que ele importa e o que muda depois.
 */
export function NextStep({ step }: { step: JourneyStep }) {
  const pronto = step.kind === "BASE_ESTRATEGICA_PRONTA";
  const problema = step.kind === "ERRO_TECNICO";

  return (
    <section
      className={`flex flex-col gap-4 rounded border p-6 ${
        problema
          ? "border-red-300 bg-red-50"
          : pronto
            ? "border-emerald-300 bg-emerald-50"
            : "border-neutral-200"
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {pronto ? "Onde você está" : "Seu próximo passo"}
        </p>
        <h2 className="text-lg font-semibold">{step.titulo}</h2>
      </div>

      <p className="text-sm text-neutral-700">{step.explicacao}</p>

      {/* O ensinamento fica junto do passo, e não numa ajuda escondida: é ele
          que permite ao usuário decidir com soberania em vez de obedecer. */}
      <div className="flex flex-col gap-2 rounded bg-white/60 p-3 text-sm text-neutral-700">
        <p>
          <span className="font-medium">Por que isso importa: </span>
          {step.porqueImporta}
        </p>
        <p>
          <span className="font-medium">O que muda depois: </span>
          {step.oQueMuda}
        </p>
      </div>

      {step.acao ? (
        <Link
          href={step.acao.href}
          className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {step.acao.rotulo}
        </Link>
      ) : null}

      {step.progresso ? (
        <p className="text-sm text-neutral-500">
          {pronto
            ? "As quatro etapas da base inicial estão completas."
            : `Etapa ${step.progresso.etapa} de ${step.progresso.total} da sua base inicial.`}
        </p>
      ) : null}
    </section>
  );
}
