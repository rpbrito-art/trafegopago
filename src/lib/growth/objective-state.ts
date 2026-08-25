import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  isDestinationType,
  isObjectiveType,
  isSuccessEventType,
  type GrowthObjective,
} from "./objectives";

/**
 * Leitura do objetivo atual, pelo caminho do usuário.
 *
 * Usa o cliente com a sessão do visitante — nunca o privilegiado. A RLS é a
 * autorização: se uma linha chega aqui, é porque o usuário pode vê-la. Ler com
 * `service_role` e filtrar em TypeScript trocaria uma garantia do banco por uma
 * condição que qualquer refatoração futura pode apagar sem erro visível
 * (`SECURITY_MODEL.md` §4, §5) — mesmo raciocínio de `business/account.ts`.
 */

export type ObjectiveState =
  /** Sem organização ainda: o próximo passo é criar o negócio, não o objetivo. */
  | { kind: "sem-organizacao" }
  /** Estado válido de produto, não erro: orienta o próximo passo. */
  | { kind: "sem-objetivo"; organizationId: string; podeDefinir: boolean }
  | {
      kind: "definido";
      organizationId: string;
      objetivo: GrowthObjective;
      podeAlterar: boolean;
    }
  | { kind: "erro-tecnico" };

/** Papéis que podem definir a direção do negócio. */
const PAPEIS_QUE_DEFINEM = ["owner", "admin"];

export async function getObjectiveState(): Promise<ObjectiveState> {
  const supabase = await createSupabaseServerClient();

  const { data: memberships, error: erroMembership } = await supabase
    .from("organization_members")
    .select("organization_id, role, status");

  // Falha técnica vira estado próprio, nunca lista vazia: confundir "não deu
  // para saber" com "não existe" faria a tela oferecer criar um negócio a quem
  // já tem um.
  if (erroMembership) return { kind: "erro-tecnico" };

  const ativas = (memberships ?? []).filter((m) => m.status === "ACTIVE");

  if (ativas.length === 0) return { kind: "sem-organizacao" };

  const membership = ativas[0];
  const organizationId = membership.organization_id as string;

  // A UI esconde o botão para quem não pode; a autorização de verdade está na
  // RPC, que lê papel e status do banco. Esconder não é autorizar.
  const podeDefinir = PAPEIS_QUE_DEFINEM.includes(String(membership.role));

  const { data, error } = await supabase
    .from("growth_objectives")
    .select(
      "id, objective_type, objective_detail, destination_type, success_event_type, success_event_detail, created_at",
    )
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  // `maybeSingle()` não trata ausência de linha como erro: o que chega aqui é
  // falha de verdade e não pode virar "ainda não definiu".
  if (error) return { kind: "erro-tecnico" };

  if (!data) return { kind: "sem-objetivo", organizationId, podeDefinir };

  // Taxonomia desconhecida não vira `as ObjectiveType`. Um cast aqui faria a
  // tela renderizar `undefined` como rótulo; devolver erro técnico é honesto e
  // visível.
  if (
    !isObjectiveType(data.objective_type) ||
    !isDestinationType(data.destination_type) ||
    !isSuccessEventType(data.success_event_type)
  ) {
    return { kind: "erro-tecnico" };
  }

  return {
    kind: "definido",
    organizationId,
    podeAlterar: podeDefinir,
    objetivo: {
      id: data.id as string,
      objectiveType: data.objective_type,
      objectiveDetail: texto(data.objective_detail),
      destinationType: data.destination_type,
      successEventType: data.success_event_type,
      successEventDetail: texto(data.success_event_detail),
      createdAt: data.created_at as string,
    },
  };
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}
