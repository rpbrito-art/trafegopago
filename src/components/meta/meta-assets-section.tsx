import type { ReactNode } from "react";

import {
  selectAdAccountAction,
  selectInstagramAccountAction,
} from "@/app/actions/meta-assets";
import { MetaConnectButton } from "@/components/meta/meta-connect-button";
import { MetaDisconnectButton } from "@/components/meta/meta-disconnect-button";
import type {
  MetaAdsState,
  MetaAssetState,
  InstagramOpcao,
} from "@/lib/meta/asset-state";

/**
 * Escolha do Instagram do negócio — e, opcionalmente, da conta de anúncios.
 *
 * Duas leis de produto governam o que aparece aqui:
 *
 * 1. **Linguagem de negócio.** Nenhum ramo mostra escopo, versão de API,
 *    identificador de Página ou de conta de anúncios. A pessoa reconhece a
 *    própria conta pelo `@` e pelo nome (`GROWTH_INTELLIGENCE_CANONICAL.md`
 *    §2.1, mandato 003B §5).
 * 2. **Anunciar é opcional.** Nenhum texto sugere que a conta de anúncios seja
 *    necessária, e a ausência dela nunca aparece como problema — o modo
 *    orgânico entrega valor sozinho (§7 e §12 do canônico).
 */
export type AtivoResultado = "ok" | "nao-encontrado" | "sem-permissao" | "erro";

export function MetaAssetsSection({
  state,
  resultado,
}: {
  state: MetaAssetState;
  resultado?: AtivoResultado;
}) {
  if (state.kind === "sem-conexao") return null;

  if (state.kind === "instagram-selecionado") {
    const { username, nome, selecionadoEm } = state.instagram;

    return (
      <Bloco tom="ok" titulo="Instagram do negócio">
        <Aviso resultado={resultado} />
        <p className="text-sm text-neutral-700">
          Vamos acompanhar{" "}
          <strong>{username ? `@${username}` : (nome ?? "a conta escolhida")}</strong>
          {username && nome ? ` (${nome})` : null}.
          {selecionadoEm
            ? ` Escolhida em ${new Date(selecionadoEm).toLocaleDateString("pt-BR")}.`
            : null}
        </p>
        <p className="text-sm text-neutral-600">
          Ainda não trazemos publicações nem métricas — isso vem na próxima
          etapa.
        </p>

        <ContaDeAnuncios state={state.ads} organizationId={state.organizationId} />
      </Bloco>
    );
  }

  if (state.kind === "escolher-instagram") {
    return (
      <Bloco titulo="Escolha o Instagram do negócio">
        <Aviso resultado={resultado} />
        <p className="text-sm text-neutral-600">
          {state.opcoes.length === 1
            ? "Encontramos esta conta profissional na sua conta da Meta."
            : "Encontramos mais de uma conta profissional. Escolha a do seu negócio."}
        </p>

        <ul className="flex flex-col gap-2">
          {state.opcoes.map((opcao) => (
            <li key={opcao.valor}>
              <OpcaoInstagram
                opcao={opcao}
                organizationId={state.organizationId}
              />
            </li>
          ))}
        </ul>
      </Bloco>
    );
  }

  if (state.kind === "sem-pagina") {
    return (
      <Bloco tom="atencao" titulo="Falta a Página do seu negócio">
        <p className="text-sm text-amber-900">
          A sua conta da Meta não tem nenhuma Página do Facebook à qual possamos
          associar o Instagram do negócio. Crie ou peça acesso a uma Página e
          volte aqui.
        </p>
      </Bloco>
    );
  }

  if (state.kind === "sem-instagram-vinculado") {
    return (
      <Bloco tom="atencao" titulo="Falta conectar o Instagram à sua Página">
        <p className="text-sm text-amber-900">
          Encontramos a sua Página, mas nenhuma conta profissional do Instagram
          está vinculada a ela. Faça essa ligação nas configurações da Página e
          volte aqui.
        </p>
      </Bloco>
    );
  }

  // Conexão viva, capacidade incompleta.
  //
  // Não é caso de desconectar: `begin_meta_connection` retoma a linha viva e
  // preserva o token atual até a nova autorização ser trocada com sucesso, e
  // `activate_meta_connection` substitui segredo, escopos e status numa única
  // transação. Mandar desconectar primeiro destruiria uma credencial que ainda
  // funciona para trocá-la por uma que talvez nem seja concedida
  // (Correção 003B-03 §2).
  if (state.kind === "permissao-faltando") {
    return (
      <Bloco tom="atencao" titulo="Falta liberar o acesso ao Instagram">
        <Aviso resultado={resultado} />
        <p className="text-sm text-amber-900">
          Sua conta da Meta está conectada, mas ainda falta liberar o acesso
          necessário ao Instagram. Atualize a autorização para continuar.
        </p>
        <p className="text-sm text-neutral-600">
          Você não perde a conexão atual: ela continua valendo até a nova
          autorização ser concluída.
        </p>
        <MetaConnectButton
          organizationId={state.organizationId}
          rotulo="Atualizar autorização"
        />
      </Bloco>
    );
  }

  // Pelo mesmo motivo do ramo acima, reconectar não passa por desconectar: a
  // credencial persistida só é substituída quando a nova autorização conclui.
  // O que faltava aqui era a ação — a tela mandava conectar novamente e não
  // oferecia por onde (Correção 003B-08 §1).
  if (state.kind === "conexao-recusada") {
    return (
      <Bloco tom="atencao" titulo="A conexão precisa da sua atenção">
        <p className="text-sm text-amber-900">
          A Meta não aceitou mais a autorização atual. Conecte novamente para
          retomar de onde parou.
        </p>
        <MetaConnectButton
          organizationId={state.organizationId}
          rotulo="Conectar novamente"
        />
        <p className="text-sm text-neutral-600">
          Se preferir recomeçar do zero, encerre a conexão atual e conecte
          depois.
        </p>
        <MetaDisconnectButton
          organizationId={state.organizationId}
          rotulo="Desconectar e começar de novo"
        />
      </Bloco>
    );
  }

  return (
    <Bloco tom="erro" titulo="Não foi possível carregar suas contas">
      <p className="text-sm text-red-800">
        Isto é um problema nosso, não da sua conta. Nada foi alterado — atualize
        a página em instantes.
      </p>
    </Bloco>
  );
}

function OpcaoInstagram({
  opcao,
  organizationId,
}: {
  opcao: InstagramOpcao;
  organizationId: string;
}) {
  const titulo = opcao.username ? `@${opcao.username}` : (opcao.nome ?? "Conta do Instagram");

  return (
    <form
      action={selectInstagramAccountAction}
      className="flex items-center justify-between gap-4 rounded border border-neutral-200 p-3"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="instagramAccountId" value={opcao.valor} />

      <div className="flex flex-col">
        <span className="text-sm font-medium">{titulo}</span>
        {opcao.nome && opcao.username ? (
          <span className="text-xs text-neutral-600">{opcao.nome}</span>
        ) : null}
        {opcao.pagina ? (
          <span className="text-xs text-neutral-500">
            Ligada à página {opcao.pagina}
          </span>
        ) : null}
      </div>

      <button
        type="submit"
        className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
      >
        Usar esta conta
      </button>
    </form>
  );
}

/**
 * Ramo secundário.
 *
 * Não autorizado e sem contas são silêncio deliberado: mostrar "você não tem
 * conta de anúncios" transformaria uma escolha legítima em pendência.
 */
function ContaDeAnuncios({
  state,
  organizationId,
}: {
  state: MetaAdsState;
  organizationId: string;
}) {
  if (state.kind === "nao-autorizado" || state.kind === "sem-contas") return null;
  if (state.kind === "indisponivel") return null;

  if (state.kind === "selecionada") {
    return (
      <p className="text-sm text-neutral-600">
        Conta de anúncios ligada:{" "}
        <strong>{state.conta.nome ?? "conta escolhida"}</strong>
        {state.conta.moeda ? ` (${state.conta.moeda})` : null}. Nada será
        investido sem a sua aprovação.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3">
      <p className="text-sm text-neutral-600">
        Se um dia quiser investir em anúncios, podemos usar uma destas contas.
        Isso é opcional e não gera nenhum gasto agora.
      </p>

      <ul className="flex flex-col gap-2">
        {state.opcoes.map((opcao) => (
          <li key={opcao.valor}>
            <form
              action={selectAdAccountAction}
              className="flex items-center justify-between gap-4 rounded border border-neutral-200 p-3"
            >
              <input type="hidden" name="organizationId" value={organizationId} />
              <input type="hidden" name="adAccountId" value={opcao.valor} />

              <span className="text-sm">
                {opcao.nome ?? "Conta de anúncios"}
                {opcao.moeda ? (
                  <span className="text-neutral-600"> · {opcao.moeda}</span>
                ) : null}
              </span>

              <button
                type="submit"
                className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
              >
                Usar esta conta
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Aviso({ resultado }: { resultado?: AtivoResultado }) {
  if (!resultado || resultado === "ok") return null;

  if (resultado === "nao-encontrado") {
    return (
      <p role="alert" className="text-sm text-red-800">
        Essa conta não está entre as que você liberou para o Tráfego Pago. Nada
        foi alterado — escolha uma das opções acima.
      </p>
    );
  }

  if (resultado === "sem-permissao") {
    // Mesmo vocabulário do ramo `permissao-faltando`: a conexão não caiu, o
    // que falta é ampliar o que ela pode fazer.
    return (
      <p role="alert" className="text-sm text-amber-900">
        Falta liberar o acesso necessário para concluir. Atualize a autorização
        e mantenha as opções sugeridas marcadas.
      </p>
    );
  }

  return (
    <p role="alert" className="text-sm text-red-800">
      Não foi possível concluir agora. Nada foi alterado — tente de novo em
      instantes.
    </p>
  );
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
