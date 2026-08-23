import type { ReactNode } from "react";

import { MetaConnectButton } from "@/components/meta/meta-connect-button";
import { MetaDisconnectButton } from "@/components/meta/meta-disconnect-button";
import type { MetaConnectionState } from "@/lib/meta/connection-state";

/**
 * Um ramo por estado da conexão Meta.
 *
 * A trilha guiada exige que cada estado diga o que está acontecendo, o que a
 * pessoa pode fazer e por quê (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 * Nenhum ramo mostra escopo, versão de API, id externo ou token: quem opera o
 * produto não precisa aprender o vocabulário da Graph API para conectar.
 */
export function MetaSection({
  state,
  resultado,
}: {
  state: MetaConnectionState;
  /** Desfecho do último callback, se houver. */
  resultado?: "ok" | "erro";
}) {
  if (state.kind === "erro-tecnico") {
    return (
      <Bloco tom="erro" titulo="Não foi possível verificar a conexão">
        <p className="text-sm text-red-800">
          Isto é um problema nosso, não da sua conta. Atualize a página em
          instantes.
        </p>
      </Bloco>
    );
  }

  // Ambiente sem credenciais da integração. Dizer isso é melhor do que oferecer
  // um botão que falharia — e melhor do que quebrar a página.
  if (state.kind === "nao-configurado") {
    return (
      <Bloco titulo="Conectar a Meta">
        <p className="text-sm text-neutral-600">
          A conexão com a Meta ainda não está disponível neste ambiente.
        </p>
      </Bloco>
    );
  }

  if (state.kind === "sem-organizacao") {
    return (
      <Bloco titulo="Conectar a Meta">
        <p className="text-sm text-neutral-600">
          Cadastre o seu negócio primeiro. Depois disso você poderá conectar a
          Meta para trazer os dados do seu Instagram.
        </p>
      </Bloco>
    );
  }

  if (state.kind === "conectado") {
    return (
      <Bloco tom="ok" titulo="Meta conectada">
        <p className="text-sm text-neutral-700">
          Sua conta está conectada.{" "}
          {state.conectadaEm
            ? `Conectada em ${formatarData(state.conectadaEm)}.`
            : null}
        </p>
        <p className="text-sm text-neutral-600">
          Ainda não trazemos publicações nem métricas — isso vem na próxima
          etapa.
        </p>
        <MetaDisconnectButton organizationId={state.organizationId} />
      </Bloco>
    );
  }

  if (state.kind === "acao-necessaria") {
    return (
      <Bloco tom="atencao" titulo="A conexão precisa da sua atenção">
        <p className="text-sm text-amber-900">
          {state.motivo ??
            "A autorização da Meta não está mais válida. Conecte novamente para retomar."}
        </p>
        <MetaConnectButton
          organizationId={state.organizationId}
          rotulo="Conectar novamente"
        />
      </Bloco>
    );
  }

  if (state.kind === "conectando") {
    return (
      <Bloco titulo="Conexão em andamento">
        <p className="text-sm text-neutral-600">
          Começamos a conectar sua conta, mas a autorização não foi concluída.
        </p>
        <MetaConnectButton
          organizationId={state.organizationId}
          rotulo="Concluir conexão"
        />
      </Bloco>
    );
  }

  return (
    <Bloco titulo="Conectar a Meta">
      {resultado === "erro" ? (
        <p role="alert" className="text-sm text-red-800">
          Não foi possível concluir a conexão. Tente novamente.
        </p>
      ) : null}
      <p className="text-sm text-neutral-600">
        Conecte sua conta da Meta para que possamos acompanhar o desempenho do
        seu Instagram. Você escolhe quais contas liberar e pode desconectar
        quando quiser.
      </p>
      <MetaConnectButton organizationId={state.organizationId} />
    </Bloco>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Bloco({
  titulo,
  children,
  tom = "neutro",
}: {
  titulo: string;
  children: ReactNode;
  tom?: "neutro" | "ok" | "atencao" | "erro";
}) {
  const cores = {
    neutro: "border-neutral-200",
    ok: "border-emerald-300 bg-emerald-50",
    atencao: "border-amber-300 bg-amber-50",
    erro: "border-red-300 bg-red-50",
  } as const;

  return (
    <section className={`flex flex-col gap-3 rounded border p-4 ${cores[tom]}`}>
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
