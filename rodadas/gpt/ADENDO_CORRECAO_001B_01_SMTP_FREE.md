# ADENDO — CORREÇÃO 001B-01 — SMTP GRATUITO DE DESENVOLVIMENTO

Status: **AUTORIZADO**
Data: 2026-08-22
Branch: `claude/rodada-001b-auth-real`

## 1. Motivo

Durante o gate humano da correção 001B-01, o Dashboard confirmou uma mudança atual do Supabase: projetos Free criados a partir de 2026-06-03 que usam o SMTP padrão do Supabase não podem editar templates de Auth. A personalização volta a ser permitida quando o projeto usa SMTP próprio.

Não assinar Supabase Pro apenas para fechar esta rodada.

## 2. Decisão provisória de desenvolvimento

Usar **Brevo Free** como SMTP provisório para a passagem E2E local da Rodada 001B.

Razões:

- plano gratuito sem necessidade de cartão segundo a documentação atual;
- inclui e-mails transacionais;
- inclui relay SMTP;
- permite verificar um remetente individual por código enviado ao próprio endereço;
- evita comprar/configurar domínio agora apenas para o teste local.

Isto **não define o provedor de produção**. Antes do deploy de produção, escolher/configurar domínio autenticado e política definitiva de e-mail transacional.

## 3. Restrições

- Não contratar plano pago.
- Não comprar domínio apenas para esta correção.
- Não enviar SMTP key, senha, token ou qualquer segredo ao GPT/Claude/chat/Git.
- A chave SMTP deve ser inserida somente pelo fundador diretamente no Dashboard do Supabase.
- Não versionar a chave em `.env`, `config.toml`, relatório ou qualquer arquivo.
- Não usar `supabase config push` amplo.
- Não alterar banco, migrations, organizations, tenancy ou escopo da 001C.

Se Brevo bloquear SMTP Free ou exigir pagamento/domínio obrigatório para concluir este teste, **parar e reportar**; não contornar silenciosamente.

## 4. Gate humano revisado

### 4.1 Criar conta Brevo Free

O fundador cria conta gratuita em Brevo.

### 4.2 Criar/verificar remetente

No Brevo:

- criar um remetente com um endereço de e-mail que o fundador controle;
- concluir a verificação do remetente pelo código recebido;
- domínio autenticado é desejável para produção, mas não é requisito desta passagem local se o Brevo aceitar o remetente verificado individualmente.

### 4.3 Obter credenciais SMTP

No Brevo, abrir a área SMTP/API e criar/copiar uma **SMTP key** (não API key).

Valores esperados pela documentação atual:

- host: `smtp-relay.brevo.com`;
- porta: preferir `587` com TLS/STARTTLS ou `465` com SSL/TLS conforme o formulário do Supabase;
- username: o SMTP login mostrado pelo Brevo;
- password: a SMTP key criada.

### 4.4 Configurar somente Custom SMTP no Supabase

No projeto Supabase `cbnxdoxpyioxjwgjhbtq`:

Authentication → E-mails → Configurar SMTP.

Preencher diretamente no Dashboard:

- sender name: `Tráfego Pago`;
- sender email: o remetente verificado no Brevo;
- host/porta/login/password conforme Brevo.

Salvar.

Não expor a password/SMTP key no relatório ou chat.

### 4.5 Aplicar template de confirmação

Com Custom SMTP ativo, voltar a Authentication → E-mails → Confirm signup e verificar se os campos ficaram editáveis.

Aplicar o template versionado em `supabase/templates/confirmation.html`, usando o padrão vigente:

`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

Assunto:

`Confirme seu e-mail — Tráfego Pago`

Salvar.

### 4.6 Site URL

Confirmar que, para esta passagem local, a Site URL é:

`http://localhost:3000`

Não alterar Redirect URLs se o `signUp()` continuar sem `emailRedirectTo`.

## 5. E2E humano real

Executar uma única passagem:

1. `/cadastro` pela UI real;
2. UI informa para verificar o e-mail;
3. e-mail real chega via Brevo;
4. clicar em “Confirmar meu e-mail”;
5. chegar a `/conta` autenticado;
6. URL final sem `token_hash`/token;
7. logout pela UI;
8. `/conta` redireciona para `/entrar`;
9. login novamente pela UI;
10. `/conta` acessível novamente.

Usar senha de teste não reutilizada e não revelá-la.

## 6. Evidência e fechamento

Claude deve:

- registrar somente resultados não sensíveis;
- cruzar com logs de Auth/Supabase/Brevo quando útil, sem copiar conteúdo sensível;
- manter o relatório compacto;
- atualizar `estado.md` para `001B EXECUTADA COM CORREÇÃO — AGUARDANDO AUDITORIA GPT` apenas se todos os passos passarem;
- commit + push na mesma branch;
- não iniciar 001C.

## 7. Fontes atuais revalidadas

- Supabase changelog 2026-06-03: novos projetos Free com SMTP padrão não podem customizar templates; SMTP próprio reabilita customização.
- Supabase Auth SMTP: SMTP padrão é apenas para exploração e possui restrições; SMTP próprio é o caminho para entrega real.
- Brevo Free: inclui e-mail transacional e SMTP; limite atual de 300 envios/dia.
- Brevo SMTP: usar SMTP key, não API key; host `smtp-relay.brevo.com`.
