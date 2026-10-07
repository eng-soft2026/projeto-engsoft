# 02 — Stack e Dependências

## Stack principal

### Aplicação

- JavaScript
- Next.js
- React
- Tailwind CSS

### Banco e dados

- MySQL
- Prisma ORM
- Redis

### Autenticação

- Auth.js / NextAuth

### Validação

- Zod
- React Hook Form
- @hookform/resolvers

### Segurança de senha

- bcryptjs

### Datas

- date-fns

### Ícones

- lucide-react

### Gráficos

- recharts

### Feedbacks

- sonner

### Pagamentos

- Stripe

### Mídia, mapas, e-mail e filas

- Cloudinary
- Leaflet
- React Leaflet
- Nodemailer
- RabbitMQ
- amqplib

## Dependências sugeridas

```bash
npm install next react react-dom
npm install prisma @prisma/client
npm install mysql2
npm install redis
npm install next-auth
npm install zod
npm install bcryptjs
npm install react-hook-form @hookform/resolvers
npm install lucide-react
npm install recharts
npm install date-fns
npm install sonner
npm install stripe
npm install @stripe/stripe-js
npm install cloudinary
npm install leaflet react-leaflet
npm install nodemailer
npm install amqplib
```

## Dependências de desenvolvimento

```bash
npm install -D prettier prettier-plugin-tailwindcss
```

## Regras de instalação

- Instalar dependências conforme os módulos forem implementados.
- Evitar dependências redundantes.
- Usar somente uma biblioteca Redis no projeto.
- Evitar acessar MySQL diretamente se Prisma resolver o caso.
- Não adicionar biblioteca sem necessidade clara.

## Decisões de infraestrutura complementares

- Cloudinary será utilizado para armazenamento e entrega de imagens e vídeos.
- Leaflet será a biblioteca de mapa no front-end.
- OpenStreetMap será a fonte cartográfica.
- Nominatim poderá ser usado para geocodificação de baixo volume, sempre pelo backend e com cache.
- Nodemailer será utilizado como cliente SMTP.
- RabbitMQ será utilizado para filas e processamento assíncrono.
- Redis continuará responsável por cache e reservation holds; não será usado como fila principal.
