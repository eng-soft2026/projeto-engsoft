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
```

## Rotas sugeridas

### Auth

```text
POST /api/auth/register
POST /api/auth/login
```

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
POST /api/admin/hotels/:id/approve
POST /api/admin/hotels/:id/block
POST /api/admin/hotels/:id/request-changes
POST /api/admin/hotels/:id/unblock
GET /api/admin/review-reports
```

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
