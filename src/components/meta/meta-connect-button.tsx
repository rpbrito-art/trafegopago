import { connectMetaAction } from "@/app/actions/meta";

/**
 * Inicia a conexão Meta.
 *
 * `<form>` com Server Action, não link: iniciar a autorização cria uma intenção
 * OAuth persistida — é mutação, e precisa chegar por POST com a verificação de
 * origem que o Next aplica a Server Actions (`SECURITY_MODEL.md` §18).
 *
 * `organizationId` viaja em campo oculto por conveniência da UI, mas não é
 * confiado: o gateway reconfere a membership antes de criar a intenção.
 */
export function MetaConnectButton({
  organizationId,
  rotulo = "Conectar a Meta",
}: {
  organizationId: string;
  rotulo?: string;
}) {
  return (
    <form action={connectMetaAction}>
      <input type="hidden" name="organizationId" value={organizationId} />
      <button
        type="submit"
        className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
      >
        {rotulo}
      </button>
    </form>
  );
}
