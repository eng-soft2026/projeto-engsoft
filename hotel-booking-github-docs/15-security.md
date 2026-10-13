# 15 — Segurança

## Autenticação

- Auth.js;
- senha com bcryptjs;
- sessão segura;
- autorização no servidor.

### Implementação

- Auth.js v5 (`next-auth@5.0.0-beta.32`, versão fixa) com o provider de credenciais (e-mail e senha). Esse provider só funciona com sessão JWT, então a sessão é um JWT criptografado em cookie `HttpOnly` com `SameSite=Lax`, válido por 24 horas.
- Um JWT não pode ser revogado antes de expirar. Por isso os helpers de autorização (`requireAuth`, `requireRole`) releem o usuário no banco a cada requisição: usuário inativo perde o acesso e mudanças de papel valem na hora (RN118). O papel guardado no token serve apenas para a interface.
- `requireRole` recebe a lista explícita de papéis permitidos. Não há hierarquia implícita: rotas que o administrador também acessa listam `ADMIN`.
- Em Server Components, sem sessão o usuário é redirecionado para `/login`; sem permissão, a página responde 404 (`notFound()`).
- Senha: mínimo de 8 caracteres, máximo de 72 bytes (limite do bcrypt), com pelo menos uma letra e um número. Hash bcrypt com custo 12 (OWASP recomenda no mínimo 10).
- Login com e-mail inexistente também executa uma comparação bcrypt, para não revelar pelo tempo de resposta se o e-mail existe. Usuário inativo recebe o mesmo `INVALID_CREDENTIALS`.
- `POST /api/auth/login` chama o `signIn` do servidor, que não passa pela checagem de CSRF do Auth.js. A rota exige `Content-Type: application/json` (formulários de outro site não conseguem enviar JSON sem preflight de CORS) e o cookie de sessão é `SameSite=Lax`.
- Variáveis: `AUTH_SECRET` (obrigatória em produção) e `AUTH_URL` (necessária fora da Vercel para o Auth.js confiar no host). O usuário `ADMIN` inicial vem de `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_CPF` e `ADMIN_PASSWORD` no seed.
- Ainda não implementado: limite de tentativas de login (o Auth.js deixa isso para a aplicação).

## Dados sensíveis

Nunca retornar:

- hash de senha;
- segredos;
- stack trace;
- credenciais;
- dados internos desnecessários.

## Variáveis de ambiente

Exemplo:

```env
DATABASE_URL=
REDIS_URL=
AUTH_SECRET=
AUTH_URL=
ADMIN_NAME=
ADMIN_EMAIL=
ADMIN_CPF=
ADMIN_PASSWORD=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RABBITMQ_URL=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
MAX_IMAGE_UPLOAD_MB=10
MAX_VIDEO_UPLOAD_MB=50
MAX_REVIEW_VIDEO_SECONDS=10
NOMINATIM_USER_AGENT=
```

`.env` nunca deve ser commitado.

Manter `.env.example` sem segredos reais.

## Validação

Toda entrada deve ser revalidada no servidor.

## Autorização

Cliente não acessa rotas administrativas.

Gestor acessa apenas hotéis sob sua responsabilidade (como proprietário ou gestor adicional).

Administrador possui acesso global.

`canManageHotel` (`src/modules/hotels/hotel-access.js`) aceita o proprietário e os gestores adicionais (RN110), lidos de `HOTEL_MANAGER` junto com o hotel. Só o proprietário (`isHotelOwner`) altera a lista de gestores e a vê na resposta do hotel; o papel `MANAGER` é rechecado a cada chamada, então quem perde o papel perde o acesso. Hotel de outro gestor responde `404 HOTEL_NOT_FOUND`, sem revelar que ele existe, e papel inadequado responde `403`.

## Stripe

- validar webhook;
- idempotência;
- nunca confirmar pagamento apenas pelo front-end.

## CPF e CNPJ

Validar formato e dígitos verificadores.

Armazenar normalizado.

O CNPJ aceita o formato numérico e o alfanumérico. Desde julho de 2026 a Receita Federal emite CNPJ com letras para novas inscrições, e os números já existentes não mudam ([Receita Federal](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico)). Os 12 primeiros caracteres aceitam letras e números e os 2 dígitos verificadores continuam numéricos. O cálculo segue o módulo 11, com pesos de 2 a 9 da direita para a esquerda, e converte cada caractere pelo código ASCII menos 48: `0` a `9` valem 0 a 9 e `A` a `Z` valem 17 a 42 ([tabela da Receita](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf)). O exemplo oficial é `12.ABC.345/01DE-35`. O valor é gravado em maiúsculas e sem máscara (`src/utils/cnpj.js`).

## Auditoria

Ações administrativas e financeiras relevantes devem ser registradas.

- O log é gravado na mesma transação da ação (RN122). Se o `INSERT` falhar, a ação inteira é desfeita: é preferível bloquear a ação a executá-la sem registro.
- Append-only (DT022, RNF034): `audit-log-repository.js` só tem `create`, e `tests/architecture/audit-log-append-only.test.js` falha se algum código em `src/` ou `prisma/` alterar ou apagar linhas de `audit_log`.
- Na implantação, a conta de banco usada pela aplicação deve receber apenas `SELECT` e `INSERT` em `audit_log`, e as migrations devem rodar com outra conta. O ambiente local usa `root` (`.env.example`) e, por isso, não tem essa garantia. Triggers do MySQL contra `UPDATE` e `DELETE` ficaram de fora, por não terem sido validados contra um MySQL real.
- `ip_address` vem do primeiro endereço de `x-forwarded-for` (ou de `x-real-ip`) e é apenas informativo: o cliente pode forjar o cabeçalho, e só endereços acrescentados por um proxy confiável servem para decisões de segurança ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For)). O endereço é validado, e `user_agent` e `request_id` são truncados ou descartados para não estourar as colunas.


## Uploads

- validar MIME type e extensão;
- não confiar no nome original do arquivo;
- gerar identificadores seguros;
- limitar tamanho antes de encaminhar ao Cloudinary sempre que possível;
- armazenar `publicId`, `resourceType`, URL segura e metadados;
- exclusões de mídia deverão validar propriedade/permissão.

## Geocodificação

Nominatim deverá ser chamado apenas pelo backend. Endereços enviados para geocodificação não devem incluir dados pessoais desnecessários.

## RabbitMQ

- conexão por variável de ambiente;
- workers não devem aceitar payload não validado;
- jobs financeiros e notificações críticas devem ser idempotentes;
- Dead Letter Queue deve ser acessível apenas a usuários administrativos/operacionais autorizados.
