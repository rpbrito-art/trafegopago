import { ROUTES } from "@/lib/auth/routes";
import type { OffersState } from "@/lib/offers/offer-catalog";

import type { ObjectiveState } from "./objective-state";

/**
 * Motor determinístico de próximo passo (Rodada 004D §8).
 *
 * A decisão é **regra explícita**, não IA: os estados dependem de fatos
 * estruturados que já existem no banco, e `AI_ARCHITECTURE.md` §2 é direto —
 * regra/cálculo primeiro, IA depois. Nenhuma tarefa determinística chama LLM
 * por conveniência, e "confiança" inventada seria pior do que não ter nenhuma.
 *
 * A função que **decide** é pura e não conhece Supabase: recebe o estado já
 * lido e devolve o passo. Isso mantém a regra testável sem banco e impede que
 * a coleta de dados e o julgamento se misturem — o erro clássico em que uma
 * consulta a mais muda silenciosamente a recomendação.
 */

/** Ordem de condução desta fundação (mandato §8.1). */
export const JOURNEY_STEPS = [
  "SEM_ORGANIZACAO",
  "NEGOCIO_INDISPONIVEL",
  "MULTIPLAS_ORGANIZACOES",
  "DEFINIR_OBJETIVO",
  "ADICIONAR_OFERTA",
  "ESCOLHER_FOCO",
  "REESCOLHER_FOCO",
  "REVISAR_CONTEXTO_DECLARADO",
  "CONTEXTO_DECLARADO_REVISADO",
  "BASE_ESTRATEGICA_PRONTA",
  "ERRO_TECNICO",
] as const;

export type JourneyStepKind = (typeof JOURNEY_STEPS)[number];

/**
 * O passo, já traduzido para o que a tela precisa mostrar.
 *
 * `acao` é `null` quando não existe ação possível **agora** — seja porque o
 * estado é de erro, seja porque quem está olhando não pode executá-la. Fingir
 * um botão que a autorização vai recusar é pior do que dizer quem pode agir.
 */
export type JourneyStep = {
  kind: JourneyStepKind;
  /** Título humano, sem jargão. */
  titulo: string;
  /** O que precisa ser feito. */
  explicacao: string;
  /** Por que isso importa para o crescimento do negócio. */
  porqueImporta: string;
  /** O que muda depois deste passo. */
  oQueMuda: string;
  acao: { rotulo: string; href: string } | null;
  /**
   * Posição na base inicial `negócio → objetivo → ofertas → foco`.
   *
   * Uma frase simples, não um checklist técnico nem porcentagem inventada
   * (mandato §9). `null` quando a conta não está na trilha — erro, múltiplos
   * negócios ou negócio indisponível.
   */
  progresso: { etapa: number; total: number } | null;
};

/** Total de etapas da base inicial. */
const TOTAL_ETAPAS = 4;

export type JourneyInput = {
  objetivo: ObjectiveState;
  ofertas: OffersState;
  /**
   * Existe revisão do contexto **de agora**? (Rodada 004E §11)
   *
   * A decisão é determinística — comparação de fingerprint feita antes de
   * chegar aqui —, e o conteúdo da revisão não participa dela. `undefined`
   * significa que quem chamou não consultou a revisão; o motor então para em
   * `BASE_ESTRATEGICA_PRONTA` em vez de supor ausência.
   */
  revisaoAtual?: boolean;
};

/**
 * Deriva o próximo passo do estado real do negócio.
 *
 * Pura: mesma entrada, mesma saída, sem IO. A ordem das verificações é a ordem
 * de condução — e os estados que impedem qualquer trilha vêm primeiro, porque
 * orientar alguém a "definir o objetivo" quando nem sabemos de qual negócio se
 * trata seria conduzir para o lugar errado.
 */
export function decideJourneyStep({
  objetivo,
  ofertas,
  revisaoAtual,
}: JourneyInput): JourneyStep {
  // Falha de leitura nunca vira estado vazio: "não deu para saber" e "não
  // existe" levariam a telas opostas.
  if (objetivo.kind === "erro-tecnico" || ofertas.kind === "erro-tecnico") {
    return {
      kind: "ERRO_TECNICO",
      titulo: "Não foi possível carregar seu negócio agora",
      explicacao:
        "Isto é um problema nosso, não da sua conta. Nada foi alterado.",
      porqueImporta:
        "Preferimos não sugerir um próximo passo com informação incompleta.",
      oQueMuda: "Atualize a página em instantes para tentar de novo.",
      acao: null,
      progresso: null,
    };
  }

  // Nenhuma organização é escolhida implicitamente. Sem contexto inequívoco,
  // qualquer orientação seria sobre um negócio que a pessoa não escolheu
  // (auditoria 004B §6.1).
  if (
    objetivo.kind === "multiplos-negocios" ||
    ofertas.kind === "multiplos-negocios"
  ) {
    return {
      kind: "MULTIPLAS_ORGANIZACOES",
      titulo: "Sua conta participa de mais de um negócio",
      explicacao:
        "Ainda não é possível escolher com qual deles você quer trabalhar.",
      porqueImporta:
        "Cada negócio tem objetivo, ofertas e prioridade próprios. Mostrar os de um deles por engano levaria você a decidir sobre o negócio errado.",
      oQueMuda:
        "Assim que a escolha existir, você acompanha cada negócio separadamente.",
      acao: null,
      progresso: null,
    };
  }

  if (
    objetivo.kind === "negocio-indisponivel" ||
    ofertas.kind === "negocio-indisponivel"
  ) {
    return {
      kind: "NEGOCIO_INDISPONIVEL",
      titulo: "Seu negócio precisa de atenção",
      explicacao: "Não conseguimos acessar seu negócio agora.",
      porqueImporta:
        "Sem acesso ao negócio não há como orientar o próximo passo com honestidade.",
      oQueMuda: "Verifique sua conta para retomar de onde parou.",
      acao: { rotulo: "Ir para minha conta", href: ROUTES.account },
      progresso: null,
    };
  }

  if (objetivo.kind === "sem-organizacao" || ofertas.kind === "sem-organizacao") {
    return {
      kind: "SEM_ORGANIZACAO",
      titulo: "Comece contando sobre o seu negócio",
      explicacao:
        "São quatro informações curtas: nome, segmento, onde você atende e o que oferece.",
      porqueImporta:
        "É esse contexto que faz o Quoron falar do seu negócio, e não de um negócio genérico.",
      oQueMuda:
        "Com o negócio cadastrado, você define o que quer conseguir agora.",
      acao: { rotulo: "Cadastrar meu negócio", href: ROUTES.account },
      progresso: { etapa: 1, total: TOTAL_ETAPAS },
    };
  }

  if (objetivo.kind === "sem-objetivo") {
    return {
      kind: "DEFINIR_OBJETIVO",
      titulo: "Diga o que você quer conseguir agora",
      explicacao:
        "Três perguntas curtas: o resultado que você quer, para onde levar as pessoas e o que conta como sucesso.",
      porqueImporta:
        "Vender mais, receber agendamentos e crescer audiência pedem caminhos diferentes. Sem saber o que você quer, qualquer recomendação seria chute.",
      oQueMuda:
        "Tudo o que o Quoron recomendar daqui em diante passa a mirar esse resultado.",
      acao: objetivo.podeDefinir
        ? { rotulo: "Definir meu objetivo", href: ROUTES.objective }
        : null,
      progresso: { etapa: 2, total: TOTAL_ETAPAS },
    };
  }

  // A partir daqui existe objetivo definido; `ofertas` está resolvido no mesmo
  // negócio, porque os dois estados vêm do mesmo resolvedor de contexto.
  const catalogo = ofertas.kind === "pronto" ? ofertas : null;

  if (catalogo === null) {
    return {
      kind: "ERRO_TECNICO",
      titulo: "Não foi possível carregar suas ofertas agora",
      explicacao: "Isto é um problema nosso, não da sua conta.",
      porqueImporta:
        "Preferimos não sugerir um próximo passo com informação incompleta.",
      oQueMuda: "Atualize a página em instantes para tentar de novo.",
      acao: null,
      progresso: null,
    };
  }

  if (catalogo.ofertas.length === 0) {
    return {
      kind: "ADICIONAR_OFERTA",
      titulo: "Conte o que você vende",
      explicacao:
        "Cadastre pelo menos uma oferta: o que é, como você cobra e por que escolhem você.",
      porqueImporta:
        "É a oferta que decide a mensagem, o público e o que vale a pena divulgar. Sem ela, o objetivo fica sem o que promover.",
      oQueMuda:
        "Com a oferta cadastrada, você escolhe o que priorizar agora.",
      acao: catalogo.podeGerenciar
        ? { rotulo: "Adicionar uma oferta", href: ROUTES.offers }
        : null,
      progresso: { etapa: 3, total: TOTAL_ETAPAS },
    };
  }

  const { objetivo: atual, podeAlterar } = objetivo;

  if (atual.focusType === null) {
    return {
      kind: "ESCOLHER_FOCO",
      titulo: "Escolha o que priorizar agora",
      explicacao:
        "Você pode priorizar uma oferta específica ou o seu negócio como um todo.",
      porqueImporta:
        "Tentar promover tudo ao mesmo tempo dilui a mensagem e o orçamento. Escolher um foco é o que permite comparar o que funcionou depois.",
      oQueMuda:
        "Com o foco definido, sua base estratégica inicial fica completa.",
      acao: podeAlterar
        ? { rotulo: "Escolher meu foco", href: ROUTES.focus }
        : null,
      progresso: { etapa: 4, total: TOTAL_ETAPAS },
    };
  }

  // Foco em oferta que saiu do catálogo ativo. O `focus_offer_id` **não** é
  // apagado e nenhuma outra oferta é escolhida no lugar: o passado continua
  // auditável e a decisão nova continua humana (mandato §7).
  const focoIndisponivel =
    atual.focusType === "OFFER" &&
    !catalogo.ofertas.some((oferta) => oferta.id === atual.focusOfferId);

  if (focoIndisponivel) {
    return {
      kind: "REESCOLHER_FOCO",
      titulo: "A oferta que você priorizava saiu da sua lista",
      explicacao:
        "Ela foi arquivada. Escolha o que quer priorizar agora — outra oferta ou o negócio como um todo.",
      porqueImporta:
        "Continuar mirando algo que você não oferece mais produziria recomendação sobre uma oferta que saiu do ar.",
      oQueMuda:
        "Com um foco válido, sua base estratégica inicial volta a ficar completa.",
      acao: podeAlterar
        ? { rotulo: "Escolher outro foco", href: ROUTES.focus }
        : null,
      progresso: { etapa: 4, total: TOTAL_ETAPAS },
    };
  }

  // Com a base pronta, o próximo passo passa a ser revisar o que o Quoron
  // entendeu. **Isto não chama IA**: o motor só sabe se existe revisão para o
  // contexto atual; a chamada exige clique explícito em `/revisao`.
  if (revisaoAtual === false) {
    return {
      kind: "REVISAR_CONTEXTO_DECLARADO",
      titulo: "Revise o que o Quoron entendeu do seu negócio",
      explicacao:
        "Você conta, o Quoron organiza e devolve o que entendeu, o que ainda falta e o que vale confirmar.",
      porqueImporta:
        "Antes de recomendar qualquer coisa, o Quoron precisa ter entendido seu negócio do jeito certo — e você precisa poder corrigir se ele entendeu errado.",
      oQueMuda:
        "Você vê em um lugar só o que informou, o que falta esclarecer e os pontos que merecem uma segunda olhada.",
      acao: podeAlterar
        ? { rotulo: "Revisar meu contexto", href: ROUTES.review }
        : null,
      progresso: { etapa: TOTAL_ETAPAS, total: TOTAL_ETAPAS },
    };
  }

  if (revisaoAtual === true) {
    return {
      kind: "CONTEXTO_DECLARADO_REVISADO",
      titulo: "Seu contexto já foi revisado",
      explicacao:
        "O Quoron organizou o que você informou e apontou o que ainda falta esclarecer.",
      porqueImporta:
        "Quanto mais claro o contexto, mais específica fica cada recomendação futura.",
      oQueMuda:
        "Sempre que você mudar objetivo, ofertas ou prioridade, vale pedir uma nova revisão. As próximas camadas — observar sua presença digital e medir resultado — chegam conforme as conexões do produto forem habilitadas.",
      acao: { rotulo: "Ver minha revisão", href: ROUTES.review },
      progresso: { etapa: TOTAL_ETAPAS, total: TOTAL_ETAPAS },
    };
  }

  // Base pronta não fabrica um próximo passo que ainda não existe. Nada de CTA
  // para integração bloqueada nem promessa de análise que o produto ainda não
  // consegue entregar (mandato 004D §§8.2 e 14).
  return {
    kind: "BASE_ESTRATEGICA_PRONTA",
    titulo: "Sua base estratégica inicial está pronta",
    explicacao:
      "O Quoron já sabe qual é o seu negócio, o que você quer conseguir, o que você oferece e o que você está priorizando agora.",
    porqueImporta:
      "É essa base que permite avaliar, mais adiante, se o que você comunica corresponde ao que você decidiu priorizar.",
    oQueMuda:
      "Os próximos módulos — observar sua presença digital e medir resultado — vão sendo liberados conforme as conexões do produto forem habilitadas. Enquanto isso, você pode revisar objetivo, ofertas e foco quando algo mudar no negócio.",
    acao: null,
    progresso: { etapa: TOTAL_ETAPAS, total: TOTAL_ETAPAS },
  };
}
