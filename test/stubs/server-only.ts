/**
 * Stub de `server-only` para o ambiente de teste.
 *
 * O pacote `server-only` lança erro ao ser importado fora da condição de
 * resolução `react-server`. Ele é um guarda de build — impede que um módulo de
 * servidor entre no bundle do browser — e não tem comportamento a ser testado.
 *
 * O alias está declarado em `vitest.config.mts` e é restrito a este pacote, de
 * modo que a condição `react-server` não seja aplicada globalmente (o que
 * mudaria a resolução do próprio React nos testes).
 */
export {};
