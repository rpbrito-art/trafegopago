"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import {
  checkMetaDisconnection,
  disconnectMeta,
  startMetaAuthorization,
} from "@/lib/meta/gateway";

/**
 * Ações de conexão Meta.
 *
 * Ambas terminam em `redirect`, e o desfecho volta pelo mesmo marcador pobre
 * que o callback usa (`?meta=ok|erro`). Um único vocabulário de retorno evita
 * que a UI precise distinguir "falhou ao iniciar" de "falhou ao voltar" — e
 * impede que a razão real da recusa vire informação na barra de endereços.
 */

/**
 * Desfechos que a conta sabe mostrar.
 *
 * Continuam sendo marcadores pobres — nenhum dado do request, do provider ou
 * da credencial atravessa a URL. O que cresceu foi o vocabulário de produto:
 * "remover na Meta" e "ainda ativo" não são erros, e tratá-los como erro
 * deixaria a pessoa sem saber o que fazer.
 */
type Desfecho =
  | "ok"
  | "erro"
  | "externo"
  | "desconectado"
  | "ainda-ativo"
  | "nao-verificado";

/** Destino com o desfecho, sem eco de nenhum dado do request. */
function voltarPara(resultado: Desfecho): string {
  return `${ROUTES.account}?meta=${resultado}`;
}

/**
 * Inicia a conexão.
 *
 * `organizationId` chega por campo oculto, mas não é confiado: o gateway
 * reconfere a membership ativa antes de criar a intenção OAuth. Um id de
 * organização alheia não conecta nada — e a recusa não diz se aquela
 * organização existe.
 */
export async function connectMetaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));

  if (!organizationId) redirect(voltarPara("erro"));

  const resultado = await startMetaAuthorization({
    userId: user.id,
    organizationId,
  });

  if (!resultado.ok) redirect(voltarPara("erro"));

  redirect(resultado.authorizationUrl);
}

/**
 * Pede a desconexão.
 *
 * Para a credencial que a Meta emite ao nosso produto, o encerramento acontece
 * no ambiente dela — não há endpoint que faça isso daqui. Nesse caso a ação não
 * falha nem finge sucesso: devolve o desfecho que leva a tela a explicar o que
 * fazer e a oferecer a verificação.
 */
export async function disconnectMetaAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));

  if (!organizationId) redirect(voltarPara("erro"));

  const resultado = await disconnectMeta({
    userId: user.id,
    organizationId,
  });

  if (resultado.ok) redirect(voltarPara("ok"));

  redirect(
    voltarPara(
      resultado.reason === "EXTERNAL_ACTION_REQUIRED" ? "externo" : "erro",
    ),
  );
}

/**
 * Confere se a remoção feita na Meta valeu.
 *
 * Três desfechos, três frases diferentes na tela: caiu de fato, ainda está de
 * pé, ou não deu para conferir agora. Só o primeiro apaga alguma coisa.
 */
export async function checkMetaDisconnectionAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));

  if (!organizationId) redirect(voltarPara("erro"));

  const resultado = await checkMetaDisconnection({
    userId: user.id,
    organizationId,
  });

  if (resultado.ok) redirect(voltarPara("desconectado"));

  // Falha de verificação não é falha de desconexão: a remoção externa
  // continua pendente, e a tela precisa manter o passo à vista.
  redirect(
    voltarPara(
      resultado.reason === "STILL_ACTIVE" ? "ainda-ativo" : "nao-verificado",
    ),
  );
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
