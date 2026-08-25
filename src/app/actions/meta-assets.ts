"use server";

import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { selectAdAccount, selectInstagramAccount } from "@/lib/meta/assets";

/**
 * Ações de seleção de ativo Meta.
 *
 * Mesma disciplina das ações de conexão: o desfecho volta por um marcador
 * pobre na URL, sem eco de id externo, resposta do provider ou razão técnica.
 * O parâmetro é `ativo` — separado de `meta` — para que escolher o Instagram
 * não sobrescreva a mensagem da conexão.
 *
 * `organizationId` e o id do ativo chegam por campo oculto e **nenhum dos dois
 * é confiado**: o gateway reconfere a membership e redescobre o ativo contra a
 * Meta antes de gravar (mandato 003B §4.5).
 */

type Desfecho =
  | "ok"
  /** O ativo escolhido não está entre os que esta conexão autoriza. */
  | "nao-encontrado"
  /** A permissão necessária não foi concedida no diálogo da Meta. */
  | "sem-permissao"
  | "erro";

function voltarPara(resultado: Desfecho): string {
  return `${ROUTES.account}?ativo=${resultado}`;
}

export async function selectInstagramAccountAction(
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));
  const externalInstagramAccountId = asString(formData.get("instagramAccountId"));

  if (!organizationId || !externalInstagramAccountId) redirect(voltarPara("erro"));

  const resultado = await selectInstagramAccount({
    userId: user.id,
    organizationId,
    externalInstagramAccountId,
  });

  redirect(voltarPara(traduzir(resultado)));
}

export async function selectAdAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const organizationId = asString(formData.get("organizationId"));
  const externalAdAccountId = asString(formData.get("adAccountId"));

  if (!organizationId || !externalAdAccountId) redirect(voltarPara("erro"));

  const resultado = await selectAdAccount({
    userId: user.id,
    organizationId,
    externalAdAccountId,
  });

  redirect(voltarPara(traduzir(resultado)));
}

/**
 * Só três recusas viram vocabulário próprio.
 *
 * "Não encontrado" e "sem permissão" mudam o que a pessoa pode fazer a
 * seguir; o resto é indistinguível na prática e vira `erro` — inclusive para
 * não ensinar, pela URL, qual defesa recusou a tentativa.
 */
function traduzir(resultado: { ok: boolean; reason?: string }): Desfecho {
  if (resultado.ok) return "ok";
  if (resultado.reason === "ASSET_NOT_FOUND") return "nao-encontrado";
  if (resultado.reason === "MISSING_PERMISSION") return "sem-permissao";
  return "erro";
}

function asString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
