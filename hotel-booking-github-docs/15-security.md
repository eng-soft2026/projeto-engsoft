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

## Stripe

- validar webhook;
- idempotência;
- nunca confirmar pagamento apenas pelo front-end.

## CPF e CNPJ

Validar formato e dígitos verificadores.

Armazenar normalizado.

## Auditoria

Ações administrativas e financeiras relevantes devem ser registradas.


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
