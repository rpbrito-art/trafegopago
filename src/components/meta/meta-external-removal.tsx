import { checkMetaDisconnectionAction } from "@/app/actions/meta";

/**
 * O que fazer quando a Meta é quem encerra o acesso.
 *
 * A autorização que a Meta concede ao nosso produto não se desfaz por aqui: ela
 * é removida no ambiente de configurações do negócio. Em vez de esconder isso
 * atrás de um botão que não funcionaria, a tela diz o passo e depois confere o
 * resultado.
 *
 * Enquanto a Meta não confirmar a remoção, mantemos a conexão como está — é o
 * que permite conferir de novo mais tarde. Nada aqui mostra token, permissão,
 * identificador externo ou nome de API (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 */
export function MetaExternalRemoval({
  organizationId,
  aviso,
}: {
  organizationId: string;
  /** Resultado da última verificação, quando já houve uma. */
  aviso?: "ainda-ativo" | "nao-verificado";
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-700">
        Para encerrar o acesso, a Meta pede que você faça a remoção no ambiente
        dela. É rápido:
      </p>

      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-neutral-700">
        <li>abra as configurações do seu negócio na Meta;</li>
        <li>
          procure <strong>Integrações</strong> e depois{" "}
          <strong>Aplicativos conectados</strong>;
        </li>
        <li>remova o Tráfego Pago da lista.</li>
      </ol>

      <p className="text-sm text-neutral-600">
        Até a Meta confirmar a remoção, mantemos a sua conexão guardada e
        protegida aqui. Quando terminar, volte e confirme abaixo.
      </p>

      {aviso === "ainda-ativo" ? (
        <p role="alert" className="text-sm text-amber-900">
          A Meta ainda mostra o acesso como ativo. Confira se a remoção foi
          concluída no ambiente dela e tente de novo.
        </p>
      ) : null}

      {aviso === "nao-verificado" ? (
        <p role="alert" className="text-sm text-red-800">
          Não conseguimos confirmar agora. Nada foi alterado — tente novamente
          em instantes.
        </p>
      ) : null}

      <form action={checkMetaDisconnectionAction}>
        <input type="hidden" name="organizationId" value={organizationId} />
        <button
          type="submit"
          className="self-start rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          Já removi — verificar
        </button>
      </form>
    </div>
  );
}
