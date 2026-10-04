# 15 — Segurança

## Autenticação

- Auth.js;
- senha com bcryptjs;
- sessão segura;
- autorização no servidor.

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
