# CORREÇÃO 001F-01 — RECOVERY SOB O CONTRATO REAL DO SUPABASE

Status: **AUTORIZADA**
Data: 2026-08-23
Rodada afetada: `001F — Recovery de Acesso + Fechamento da Fase 1`
Branch de execução: `claude/rodada-001f-recovery-fechamento-fase1`

## 1. Motivo da correção

A 001F parou corretamente no critério de parada do mandato. O contrato original exigia que uma sessão criada por `verifyOtp(type=recovery)` contivesse `amr.method = recovery`.

No projeto hospedado atual, isso não ocorre. O executor mediu no JWT e em `auth.mfa_amr_claims`:

- login por senha → `password`;
- `verifyOtp(type=recovery)` → `otp`;
- `verifyOtp(type=signup)` → `otp`.

A evidência externa atual também é inconsistente: a referência de claims do Supabase ainda enumera `recovery`, enquanto o guia vigente de AMR e os tipos atuais de `auth-js` tratam `otp` como o método reconhecido para OTP por e-mail; o código atual do GoTrue usa o método OTP ao emitir sessão no fluxo de verificação.

Conclusão: o requisito literal `amr=recovery` não é implementável com o contrato atual sem introduzir estado aplicativo adicional. Isso é defeito da premissa do mandato, não falha do executor.

## 2. Decisão GPT

**Não introduzir custom access token hook, tabela, cookie HMAC, secret adicional ou consulta privilegiada a `auth.users` apenas para distinguir `recovery` de outros OTPs nesta fase.**

Essas alternativas ampliariam arquitetura e superfície de segurança sem benefício proporcional para o MVP atual.

O produto vigente só expõe autenticação por e-mail/senha; phone OTP, magic link, social login, invite e passkeys não fazem parte da experiência funcional atual. Provar posse recente do e-mail por uma sessão OTP é o fator relevante para permitir redefinição sem senha atual.

O contrato da 001F passa a aceitar uma **sessão de recuperação compatível com o provider real**, obedecendo integralmente ao §3 abaixo.

## 3. Novo predicado obrigatório de autorização da nova senha

A rota/Server Action de redefinição só pode autorizar quando TODAS as condições forem verdadeiras:

1. as claims vierem de `supabase.auth.getClaims()` validado server-side;
2. `sub` for válido;
3. a claim `email` for string não vazia;
4. `amr` for bem formado e contiver uma entrada recente com método `recovery` **ou** `otp`;
5. nenhuma entrada `amr` contiver método `password`;
6. a entrada autorizadora (`recovery`/`otp`) tiver timestamp válido e idade máxima de **15 minutos** no servidor, tolerando no máximo 60 segundos de clock skew futuro;
7. o formulário continuar invisível e a Server Action continuar negando quando o predicado não for satisfeito.

O método literal `recovery`, se o provider passar a emiti-lo no futuro, continua aceito. `hasRecoveryMethod()` pode permanecer como diagnóstico, mas deixa de ser critério obrigatório.

### 3.1 Residual conscientemente aceito

Uma sessão recente nascida de outro OTP de e-mail poderia satisfazer o predicado se o provider também a representar apenas como `otp`. No produto atual isso não cria escalada material: a sessão já prova posse recente da caixa postal do próprio usuário, que é exatamente o fator usado para recovery.

Se futuramente forem habilitados magic link, phone OTP, invite, social login ou outro método de Auth, **este guard deve ser reaberto antes da promoção dessa capacidade**. Não assumir que `otp` continuará significando exclusivamente posse recente do e-mail.

## 4. Confirmação SSR permanece específica de recovery

Nada muda nas regras do endpoint `/auth/confirm`:

- somente `type=recovery` segue para `/redefinir-senha`;
- `next` arbitrário continua descartado nesse ramo;
- token inválido/expirado/reutilizado continua em erro genérico;
- `token_hash` não pode sobreviver no URL final;
- signup/email continuam sem regressão.

A aceitação de `otp` na sessão não autoriza abrir outros tipos de OTP no parser.

## 5. Sessões anteriores após troca de senha

A prova inicial mostrou que `updateUser({ password })` sozinho não revogou uma sessão anterior. Isso é compatível com a necessidade de tratar logout separadamente.

Após a troca bem-sucedida, a implementação deve chamar **explicitamente**:

`supabase.auth.signOut({ scope: "global" })`

Não depender do default implícito.

Regras:

1. verificar o retorno de `signOut`; não ignorar erro silenciosamente;
2. o smoke final deve provar que o **refresh token** da sessão anterior deixa de ser aceito após o logout global;
3. access tokens já emitidos podem continuar válidos até `exp`, conforme contrato do Supabase; isso deve ser registrado como propriedade conhecida e não como falha da 001F, desde que o refresh esteja revogado;
4. se `signOut({scope:"global"})` retornar sucesso e o refresh token anterior continuar válido, **parar e retornar ao GPT** antes de inventar admin API ou mecanismo próprio de sessão;
5. a sessão/cookies do recovery devem ser limpos localmente no fluxo de sucesso.

Não usar `SUPABASE_SECRET_KEY` ou admin API para logout funcional nesta correção.

## 6. Template hosted continua gate humano obrigatório

A correção não elimina o gate já previsto no mandato.

Antes do E2E final, o fundador deve configurar no projeto hospedado o template **Reset Password / Recovery** com o conteúdo versionado em:

`supabase/templates/recovery.html`

O link deve chegar como:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Sem `next`.

Não usar `supabase config push` para empurrar todo o `config.toml` local ao hosted.

## 7. E2E final obrigatório

Depois do gate humano, executar `npm run smoke:recovery` com caixa real de teste e provar:

- resposta anti-enumeração;
- e-mail real recebido pelo SMTP configurado;
- link hosted efetivo no formato versionado;
- confirmação SSR e URL limpa;
- sessão aceita pelo novo predicado temporal (`otp` ou `recovery`, sem `password`);
- sessão password comum recusada;
- senha antiga falha;
- nova senha autentica;
- link é one-time;
- logout global revoga refresh token anterior;
- nenhum token/PII/secret persistido em relatório/log.

Usar identidade de teste removível e zero resíduo.

## 8. Código e testes a ajustar

No mínimo:

- `src/lib/auth/recovery.ts`;
- testes de `recovery.ts`/session/page/Server Action afetados;
- `resetPasswordAction` para `signOut({ scope: "global" })` explícito e tratamento de erro;
- `scripts/recovery-001f.mjs` para provar recência do AMR e revogação do refresh anterior;
- comentários que ainda afirmem literalmente `amr=recovery` como requisito atual;
- relatório 001F e `estado.md` ao final.

Não criar migration/DDL.

## 9. Provas/gates finais

Antes de handoff:

- lint;
- typecheck;
- testes relevantes + suíte completa;
- build;
- CI da branch/PR verde;
- migration history continua em 5;
- Advisor sem nova regressão;
- zero fixtures de teste;
- diff sem segredo;
- harmonização MVP/roadmap já entregue deve permanecer compatível com Growth Intelligence.

## 10. Estado e critério de conclusão corrigido

Se tudo acima passar, a rodada pode terminar como:

`001F EXECUTADA COM CORREÇÃO 001F-01 — CANDIDATA A FECHAMENTO DA FASE 1 — AGUARDANDO AUDITORIA GPT`

A Fase 1 ainda não está encerrada até auditoria e promoção GPT.

Nenhuma Fase 2 ou rodada posterior está autorizada.