# 10 — API e Contratos

## Padrão de resposta

### Sucesso

```json
{
    "success": true,
    "data": {}
}
```

### Erro

```json
{
    "success": false,
    "error": {
        "code": "ROOM_NOT_AVAILABLE",
        "message": "A acomodação não está disponível no período selecionado."
    }
}
```

## Códigos de erro iniciais

```text
INVALID_CREDENTIALS
UNAUTHORIZED
FORBIDDEN
USER_NOT_FOUND
HOTEL_NOT_FOUND
INVALID_HOTEL_STATUS
UNIT_NOT_FOUND
ROOM_TYPE_NOT_FOUND
ROOM_NOT_FOUND
ROOM_NOT_AVAILABLE
INVALID_BOOKING_PERIOD
HOLD_EXPIRED
OVERBOOKING_LIMIT_REACHED
RESERVATION_NOT_FOUND
RESERVATION_CANNOT_BE_CANCELLED
RESERVATION_CANNOT_BE_CHANGED
PAYMENT_FAILED
REFUND_FAILED
INVALID_GUEST_DATA
INVALID_CPF
INVALID_CNPJ
VALIDATION_ERROR
USER_ALREADY_EXISTS
INTERNAL_ERROR
```

- `VALIDATION_ERROR`: entrada inválida (Zod). A `message` é a do primeiro problema encontrado. CPF com formato ou dígitos verificadores inválidos usa `INVALID_CPF`, e CNPJ, `INVALID_CNPJ`.
- `INVALID_CNPJ`: CNPJ com formato ou dígitos verificadores inválidos. Aceita o formato numérico e o alfanumérico (RN119).
- `INVALID_HOTEL_STATUS`: a ação não é permitida para o status atual do hotel (por exemplo, editar um hotel que não está em `DRAFT` ou aprovar um hotel que não está em `UNDER_REVIEW`). Também é devolvido quando outro usuário muda o status durante a requisição. Responde `409`.
- `USER_ALREADY_EXISTS`: e-mail ou CPF já cadastrado. Um único código para os dois casos, para não revelar qual dado já existe.
- `INTERNAL_ERROR`: erro inesperado. A `message` é genérica; detalhes ficam apenas no log do servidor (sem dados sensíveis).

## Status HTTP

O status é derivado da classe do erro de domínio (`src/lib/route-response.js`):

```text
ValidationError     -> 400
UnauthorizedError   -> 401   (UNAUTHORIZED, INVALID_CREDENTIALS)
ForbiddenError      -> 403
NotFoundError       -> 404
ConflictError       -> 409
outro DomainError   -> 400
erro inesperado     -> 500   (INTERNAL_ERROR)
```

Rotas que recebem corpo exigem `Content-Type: application/json`.

## Rotas sugeridas

### Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/users/me
PATCH /api/users/me
```

- `register`: `name`, `email`, `cpf` (com ou sem máscara), `password` e `role` opcional (`CUSTOMER` padrão ou `MANAGER`, RN116). Responde `201` com o usuário, sem hash de senha.
- `login`: `email` e `password`. Delega ao Auth.js (`signIn` com o provider de credenciais), que grava o cookie de sessão. Responde `200` com o usuário ou `401 INVALID_CREDENTIALS`.
- `logout`: encerra a sessão do Auth.js e responde `200` com `data: null`.
- `users/me`: `GET` retorna o perfil do usuário autenticado; `PATCH` aceita `name`, `email`, `newPassword` e `currentPassword` (obrigatória para trocar a senha). CPF e papel não são alteráveis (RN117).

Os endpoints internos do Auth.js ficam em `/api/auth/*` (`session`, `csrf`, `providers`, `signin`, `callback`, `signout`) e não seguem o envelope acima.

### Hotels

```text
GET /api/hotels
GET /api/hotels/:id
POST /api/hotels
PATCH /api/hotels/:id
POST /api/hotels/:id/submit-review
POST /api/hotels/:id/managers
DELETE /api/hotels/:id/managers/:userId
PUT /api/hotels/:id/acceptances
```

- `POST /api/hotels`: apenas `MANAGER`. Corpo: `name`, `description`, `category`, `cnpj` (com ou sem máscara, numérico ou alfanumérico, RN119) e `email`. O proprietário é o usuário da sessão e o status inicial é sempre `DRAFT`; `status`, `ownerUserId` e `isActive` enviados no corpo são ignorados. Responde `201` com o hotel.
- `GET /api/hotels`: apenas `MANAGER`. Lista os hotéis do usuário proprietário, do mais recente ao mais antigo.
- `GET /api/hotels/:id`: `MANAGER` proprietário ou `ADMIN`. Devolve o hotel, o resumo do proprietário (`id`, `name`, `email`) e as `reviewNotes` (`id`, `fromStatus`, `toStatus`, `notes`, `createdAt`), da mais recente para a mais antiga e sem o id do administrador. Hotel de outro gestor responde `404 HOTEL_NOT_FOUND`, sem revelar que ele existe.
- `PATCH /api/hotels/:id`: apenas o `MANAGER` proprietário e somente com o hotel em `DRAFT` (RN120); em outro status responde `409 INVALID_HOTEL_STATUS`. Aceita os campos do cadastro, ao menos um.
- `POST /api/hotels/:id/submit-review`: apenas o proprietário; `DRAFT` → `UNDER_REVIEW`. Não recebe corpo.
- As rotas de gestores adicionais e de regras de aceitação ainda não foram implementadas. Enquanto isso, só o proprietário acessa o hotel (doc 15).

### Units

```text
GET /api/units/:id
POST /api/hotels/:hotelId/units
PATCH /api/units/:id
POST /api/units/:id/blocks
```

### Room types e rooms

```text
POST /api/hotels/:hotelId/room-types
PATCH /api/room-types/:id
POST /api/units/:unitId/rooms
PATCH /api/rooms/:id
POST /api/rooms/:id/blocks
```

O corpo de `POST /api/units/:unitId/rooms` informa `roomTypeId`, que deve pertencer ao mesmo hotel da unidade.

### Search

```text
GET /api/search
GET /api/availability
```

### Reservation

```text
POST /api/reservation-holds
POST /api/reservations
GET /api/reservations/:id
PATCH /api/reservations/:id
POST /api/reservations/:id/cancel-room
```

### Reviews

```text
POST /api/reviews
POST /api/reviews/:id/comments
POST /api/reviews/:id/replies
POST /api/reviews/:id/report
```

`comments` é usado pelo autor da avaliação e aceita mídia. `replies` é usado pelo gestor do hotel e aceita somente texto.

### Favorites

```text
GET /api/favorite-hotel-lists
POST /api/favorite-hotel-lists
POST /api/favorite-hotel-lists/:id/items
DELETE /api/favorite-hotel-lists/:id/items/:itemId
GET /api/favorite-room-lists
POST /api/favorite-room-lists
POST /api/favorite-room-lists/:id/items
DELETE /api/favorite-room-lists/:id/items/:itemId
```

### Admin

```text
GET /api/admin/dashboard
GET /api/admin/hotels
POST /api/admin/hotels/:id/approve
POST /api/admin/hotels/:id/block
POST /api/admin/hotels/:id/request-changes
POST /api/admin/hotels/:id/unblock
GET /api/admin/review-reports
```

- `GET /api/admin/hotels?status=`: apenas `ADMIN`. Lista até 100 hotéis (`updatedAt` decrescente) com o resumo do proprietário (sem CPF). O filtro `status` (`DRAFT`, `UNDER_REVIEW`, `PUBLISHED` ou `BLOCKED`) é opcional; sem ele lista todos os status.
- As quatro ações de hotel são exclusivas do `ADMIN`, exigem corpo JSON com `reason` (1 a 1000 caracteres, RN108), gravam o `AUDIT_LOG` na mesma transação da mudança de status (RN070, RN122) e respondem `200` com o hotel atualizado. Um status de origem incompatível responde `409 INVALID_HOTEL_STATUS`.
    - `approve`: `UNDER_REVIEW` → `PUBLISHED`.
    - `request-changes`: `UNDER_REVIEW` → `DRAFT`, com `HOTEL_REVIEW_NOTE` (RN105).
    - `block`: `PUBLISHED` ou `UNDER_REVIEW` → `BLOCKED`, com `HOTEL_REVIEW_NOTE` (RN121).
    - `unblock`: `BLOCKED` → `PUBLISHED` ou `DRAFT`, conforme o `targetStatus` do corpo, obrigatório e sem valor padrão (RN106), com `HOTEL_REVIEW_NOTE`.
- O `AUDIT_LOG` guarda o IP, o `User-Agent` e o `x-request-id` da requisição quando disponíveis. O IP vem de `x-forwarded-for` (primeiro endereço) ou `x-real-ip` e é apenas informativo, pois o cliente pode forjá-lo (doc 15).

### Payments

```text
POST /api/payments/create-intent
POST /api/payments/webhook
POST /api/refunds
```

## Regra

Rotas não devem conter regra de negócio complexa. Devem validar, autorizar, delegar a services e formatar resposta.


## Media

```text
POST /api/media/sign-upload
DELETE /api/media/:id
```

## Promotions

```text
GET /api/manager/promotions
POST /api/manager/promotions
PATCH /api/manager/promotions/:id
POST /api/manager/promotions/:id/activate
POST /api/manager/promotions/:id/deactivate
```

## Maps / geocoding

```text
POST /api/geocoding/resolve-address
```

Essa rota deverá ser autenticada quando usada no cadastro de unidades, aplicar cache e limitação de taxa. Não expor um proxy genérico para geocodificação pública.

## Search metrics

```text
POST /api/search/impressions
POST /api/search/clicks
```

Endpoints de métricas deverão validar IDs existentes e possuir proteção contra abuso/bots simples.
