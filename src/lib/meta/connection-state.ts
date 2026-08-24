import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { isMetaConfigured } from "./config";

/**
 * Estado da conexão Meta para a UI.
 *
 * Lê pelo cliente **autenticado**, não pelo privilegiado: o que a tela mostra
 * passa por RLS e pelo grant por coluna de `meta_connections` — e é assim que
 * `token_secret_reference` fica fora do alcance mesmo se esta função tentasse
 * selecioná-lo.
 *
 * Os estados são de produto, não de protocolo. A tela nunca mostra escopo,
 * versão de Graph API ou id externo (`GROWTH_INTELLIGENCE_CANONICAL.md` §2.1).
 */

export type MetaConnectionState =
  /** A integração ainda não foi configurada neste ambiente. */
  | { kind: "nao-configurado" }
  /** Sem organização: o usuário ainda não criou o negócio. */
  | { kind: "sem-organizacao" }
  /** Nunca conectou, ou desconectou. */
  | { kind: "desconectado"; organizationId: string }
  /** Conexão em andamento — autorizou mas ainda não concluiu. */
  | { kind: "conectando"; organizationId: string }
  | { kind: "conectado"; organizationId: string; conectadaEm: string | null }
  /**
   * Desconexão pedida; falta remover a integração no ambiente da Meta.
   *
   * Estado de processo, e por isso persistido: o intervalo pode durar dias e
   * atravessar logout. Enquanto ele vale, a conexão continua viva de propósito
   * — é o token que ainda permite verificar se a remoção surtiu efeito.
   */
  | {
      kind: "remocao-externa-pendente";
      organizationId: string;
      pedidaEm: string;
    }
  /** Precisa de ação humana: permissão revogada, token expirado etc. */
  | {
      kind: "acao-necessaria";
      organizationId: string;
      motivo: string | null;
    }
  | { kind: "erro-tecnico" };

export async function getMetaConnectionState(): Promise<MetaConnectionState> {
  if (!isMetaConfigured()) return { kind: "nao-configurado" };

  const supabase = await createSupabaseServerClient();

  const { data: membership, error: erroMembership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (erroMembership) return { kind: "erro-tecnico" };
  if (!membership) return { kind: "sem-organizacao" };

  const organizationId = membership.organization_id as string;

  // Só as colunas que o grant permite. Pedir `token_secret_reference` aqui
  // resultaria em erro de privilégio — a fronteira não depende deste código.
  const { data: conexao, error } = await supabase
    .from("meta_connections")
    .select(
      "status, connected_at, action_required_reason, external_disconnect_pending_at",
    )
    .eq("organization_id", organizationId)
    .in("status", ["PENDING", "ACTIVE", "ACTION_REQUIRED"])
    .maybeSingle();

  if (error) return { kind: "erro-tecnico" };
  if (!conexao) return { kind: "desconectado", organizationId };

  const remocaoPedidaEm = conexao.external_disconnect_pending_at as
    | string
    | null;

  if (conexao.status === "ACTIVE") {
    // A remoção pendente vence a leitura de "conectado": tecnicamente a
    // conexão está viva, mas a pessoa já pediu para encerrá-la e o que ela
    // precisa ver é o passo que falta.
    if (remocaoPedidaEm) {
      return {
        kind: "remocao-externa-pendente",
        organizationId,
        pedidaEm: remocaoPedidaEm,
      };
    }

    return {
      kind: "conectado",
      organizationId,
      conectadaEm: conexao.connected_at as string | null,
    };
  }

  if (conexao.status === "ACTION_REQUIRED") {
    return {
      kind: "acao-necessaria",
      organizationId,
      motivo: conexao.action_required_reason as string | null,
    };
  }

  return { kind: "conectando", organizationId };
}
