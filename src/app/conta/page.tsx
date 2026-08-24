import { SignOutButton } from "@/components/auth/sign-out-button";
import { BusinessSection } from "@/components/business/business-section";
import {
  MetaAssetsSection,
  type AtivoResultado,
} from "@/components/meta/meta-assets-section";
import { MetaSection, type MetaResultado } from "@/components/meta/meta-section";
import { requireUser } from "@/lib/auth/session";
import { getAccountBusinessState } from "@/lib/business/account";
import { getMetaAssetState, type MetaAssetState } from "@/lib/meta/asset-state";
import { getMetaConnectionState } from "@/lib/meta/connection-state";

export const metadata = {
  title: "Sua conta — Tráfego Pago",
};

/**
 * Nunca pré-renderizar.
 *
 * A página existe em função da sessão de quem a pede. Deixar o Next tentar
 * gerá-la em build seria errado por dois motivos: no build não há request (nem
 * cookies, nem env de runtime), e uma página de sessão prerenderizada é
 * exatamente o tipo de artefato que não pode acabar em cache compartilhado.
 */
export const dynamic = "force-dynamic";

/**
 * Conta: onboarding do negócio inicial ou resumo do que já existe.
 *
 * O guard é `requireUser()`, que verifica o JWT server-side; o redirect do
 * Proxy é apenas a primeira camada. O que a página mostra depois disso vem de
 * `getAccountBusinessState()`, que lê sob RLS — a página não decide o que o
 * usuário pode ver, apenas como mostrar o que chegou.
 */
export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string; ativo?: string }>;
}) {
  const user = await requireUser();
  const state = await getAccountBusinessState();
  const metaState = await getMetaConnectionState();

  // Marcadores pobres de desfecho — nada do provider atravessa a URL. Valor
  // desconhecido é descartado em vez de chegar à tela.
  const DESFECHOS: readonly MetaResultado[] = [
    "ok",
    "erro",
    "externo",
    "desconectado",
    "ainda-ativo",
    "nao-verificado",
  ];

  const RESULTADOS_ATIVO: readonly AtivoResultado[] = [
    "ok",
    "nao-encontrado",
    "sem-permissao",
    "erro",
  ];

  const { meta, ativo } = await searchParams;
  const resultadoMeta = DESFECHOS.find((d) => d === meta);
  const resultadoAtivo = RESULTADOS_ATIVO.find((r) => r === ativo);

  // A escolha do ativo só faz sentido sobre uma conexão realmente ativa. Numa
  // desconexão em curso, oferecer "escolha o seu Instagram" contradiria o passo
  // que a pessoa acabou de pedir.
  const assetState: MetaAssetState =
    metaState.kind === "conectado"
      ? await getMetaAssetState({
          userId: user.id,
          organizationId: metaState.organizationId,
        })
      : { kind: "sem-conexao" };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Sua conta</h1>
        <p className="text-sm text-neutral-600">
          Sessão verificada no servidor.
        </p>
      </div>

      <dl className="flex flex-col gap-2 rounded border border-neutral-200 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">E-mail</dt>
          <dd className="font-medium">{user.email ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Identificador</dt>
          <dd className="font-mono text-xs">{user.id}</dd>
        </div>
      </dl>

      <BusinessSection state={state} />

      <MetaSection state={metaState} resultado={resultadoMeta} />

      <MetaAssetsSection state={assetState} resultado={resultadoAtivo} />

      <SignOutButton />
    </main>
  );
}
