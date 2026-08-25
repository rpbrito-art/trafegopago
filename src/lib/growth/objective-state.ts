import "server-only";

import { resolveOrganizationContext } from "@/lib/business/organization-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  isDestinationType,
  isFocusType,
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
 *
 * Qual negócio está sendo lido vem de `resolveOrganizationContext()`, e não de
 * `ativas[0]`. Em contexto ambíguo o objetivo **não é consultado**: mostrar o
 * objetivo de um negócio escolhido pela ordem do banco é pior do que não
 * mostrar nada (auditoria 004B §6.1).
 */

export type ObjectiveState =
  /** Sem organização ainda: o próximo passo é criar o negócio, não o objetivo. */
  | { kind: "sem-organizacao" }
  /** O negócio existe, mas não está acessível agora. */
  | { kind: "negocio-indisponivel" }
  /** Mais de um negócio: sem seletor, nenhuma escolha implícita. */
  | { kind: "multiplos-negocios"; quantidade: number }
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

  const contexto = await resolveOrganizationContext({ supabase });

  if (contexto.kind === "erro-tecnico") return { kind: "erro-tecnico" };
  if (contexto.kind === "sem-organizacao") return { kind: "sem-organizacao" };
  if (contexto.kind === "organizacao-indisponivel") {
    return { kind: "negocio-indisponivel" };
  }
  if (contexto.kind === "multiplas-organizacoes") {
    // Nenhuma consulta a `growth_objectives` acontece aqui: sem contexto
    // inequívoco, qualquer objetivo exibido seria o de um negócio que o
    // usuário não escolheu.
    return { kind: "multiplos-negocios", quantidade: contexto.membershipCount };
  }

  const { organizationId } = contexto;

  // A UI esconde o botão para quem não pode; a autorização de verdade está na
  // RPC, que lê papel e status do banco. Esconder não é autorizar.
  const podeDefinir = PAPEIS_QUE_DEFINEM.includes(contexto.role);

  const { data, error } = await supabase
    .from("growth_objectives")
    .select(
      "id, objective_type, objective_detail, destination_type, success_event_type, success_event_detail, focus_type, focus_offer_id, created_at",
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

  // Foco ausente é `null` — estado legítimo de objetivo ainda não priorizado.
  // Já um valor presente e desconhecido é dado inconsistente, e vira erro
  // visível em vez de virar "sem foco", que mandaria o usuário decidir de novo
  // algo que ele talvez já tenha decidido.
  if (data.focus_type !== null && !isFocusType(data.focus_type)) {
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
      focusType: data.focus_type,
      focusOfferId: texto(data.focus_offer_id),
      createdAt: data.created_at as string,
    },
  };
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}
