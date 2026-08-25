import { disconnectMetaAction } from "@/app/actions/meta";

/**
 * Desconecta a Meta.
 *
 * Remove o token do Vault e marca a conexão como revogada. A linha permanece
 * como histórico — o que some é o segredo.
 */
export function MetaDisconnectButton({
  organizationId,
  rotulo = "Desconectar",
}: {
  organizationId: string;
  /** O que a ação significa naquela tela. O caminho é sempre o mesmo. */
  rotulo?: string;
}) {
  return (
    <form action={disconnectMetaAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <button
        type="submit"
        className="self-start rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
      >
        {rotulo}
      </button>
    </form>
  );
}
