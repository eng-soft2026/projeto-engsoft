# 18 — Mapa de Telas

## Cliente

### Públicas

- Home
- Pesquisa
- Resultados
- Mapa
- Página do hotel
- Página da unidade
- Página do quarto
- Login
- Cadastro

### Autenticadas

- Checkout / reserva
- Pagamento
- Confirmação
- Minhas reservas
- Detalhe da reserva
- Alterar reserva
- Cancelar quarto
- Favoritos
- Listas de favoritos
- Avaliações
- Notificações
- Perfil

## Gestor

- Dashboard
- Meus hotéis
- Criar hotel
- Editar hotel
- Gestores do hotel
- Regras de aceitação e políticas
- Unidades
- Criar unidade
- Tipos de acomodação
- Quartos
- Calendário de disponibilidade
- Preços
- Promoções
- Reservas
- Avaliações
- Denúncias
- Financeiro
- Analytics
- Notificações

## Administrador

- Dashboard global
- Hotéis em análise
- Hotel detalhado
- Hotéis bloqueados
- Usuários
- Gestores
- Reservas
- Pagamentos
- Reembolsos
- Denúncias
- Auditoria
- Analytics global
- Notificações


## Componentes transversais

- Upload de mídia Cloudinary
- Seletor/preview de mapa Leaflet
- Histórico de jobs com erro para administrador
- Confirmação de ações administrativas críticas

## Mapa de rotas

Toda página protegida autoriza no servidor relendo o usuário no banco (doc 15): sem sessão redireciona para `/login`; com papel errado responde 404 (`notFound()`), sem revelar que a rota existe. Não há hierarquia de papéis: o ADMIN só acessa a área do cliente ou do gestor se for listado explicitamente (hoje não é).

| Rota | Quem acessa | Guard |
|---|---|---|
| `/`, `/search`, `/hotels/[id]`, `/units/[id]`, `/rooms/[id]` | Todos | nenhum |
| `/login`, `/register` | Visitante (logado vai para `callbackUrl`) | `redirectSignedInUser` |
| `/forgot-password`, `/reset-password` | Todos | nenhum |
| `/profile`, `/notifications` | Qualquer papel logado | `requirePageAuth()` na página |
| `/checkout`, `/reservations`, `/reservations/[id]`, `/reservations/[id]/confirmation`, `/favorites` | CUSTOMER | layout `src/app/(customer)/layout.jsx` com `requirePageRole([CUSTOMER])` |
| `/manager/**` | MANAGER | layout `src/app/(manager)/manager/layout.jsx` com `requirePageRole([MANAGER])` |
| `/admin/**` | ADMIN | layout `src/app/(admin)/admin/layout.jsx` com `requirePageRole([ADMIN])` |

As páginas autenticadas do cliente ficam dentro do grupo `(customer)`; as públicas ficam fora dele.

### Menu por papel

O `Header` mostra os links de `getNavigationItems(role)` (`src/components/layout/navigation-links.js`); as áreas do gestor e do administrador têm um menu lateral próprio. As telas por hotel (editar hotel, gestores, regras e políticas, unidades, tipos, quartos, calendário, preços) ficam dentro de `/manager/hotels/[id]` e não entram no menu.

- Visitante: Entrar (`/login`), Cadastrar (`/register`).
- Cliente: Minhas reservas (`/reservations`), Favoritos (`/favorites`), Notificações (`/notifications`), Meu perfil (`/profile`).
- Gestor: Painel do gestor (`/manager`), Notificações, Meu perfil. Menu da área: Painel (`/manager`), Meus hotéis (`/manager/hotels`), Reservas (`/manager/reservations`), Avaliações (`/manager/reviews`, inclui denúncias), Promoções (`/manager/promotions`), Financeiro (`/manager/finance`), Analytics (`/manager/analytics`).
- Administrador: Painel admin (`/admin`), Notificações, Meu perfil. Menu da área: Painel (`/admin`), Hotéis (`/admin/hotels`, em análise e bloqueados por filtro de status), Usuários (`/admin/users`, inclui gestores), Reservas (`/admin/reservations`), Pagamentos (`/admin/payments`), Reembolsos (`/admin/refunds`), Denúncias (`/admin/reports`), Auditoria (`/admin/audit`), Jobs com erro (`/admin/jobs`), Analytics (`/admin/analytics`).

Os itens cuja tela ainda não existe levam à página 404 até a tarefa da tela ser entregue. Erros inesperados mostram `src/app/error.jsx` (mensagem genérica e o `digest` como código, nunca a mensagem ou o stack) e rotas inexistentes `src/app/not-found.jsx`.
