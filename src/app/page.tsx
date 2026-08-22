export const APP_NAME = "Tráfego Pago";

export const BOOTSTRAP_STAGE = "Rodada 000 — Bootstrap técnico";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
      <p className="text-sm text-neutral-600">{BOOTSTRAP_STAGE}</p>
      <p className="text-sm text-neutral-600">
        Fundação técnica ativa. Nenhuma funcionalidade de domínio foi
        implementada nesta etapa.
      </p>
    </main>
  );
}
