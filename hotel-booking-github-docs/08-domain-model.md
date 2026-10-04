# 08 — Modelo de Domínio

Este documento apresenta a visão conceitual das entidades. Os nomes definitivos de tabelas, colunas e restrições estão em `25-database-model.md`, que prevalece em caso de divergência.

## Entidades principais

### Usuários

- User (possui um único role: CUSTOMER, MANAGER ou ADMIN)

### Hotelaria

- Hotel
- HotelManager
- HotelUnit
- Address
- UnitPhone
- HotelImage
- UnitImage
- HotelPolicy
- AcceptanceType
- HotelAcceptance
- HotelReviewNote
- Amenity
- HotelAmenity
- UnitAmenity

### Acomodações

- RoomType (pertence ao hotel)
- BedConfiguration
- RoomTypeImage
- RoomTypeAmenity
- Room (pertence à unidade e a um tipo do mesmo hotel)
- RoomAmenity
- RoomTypeHistory
- RoomPriceHistory
- RoomPricePeriod
- RoomBlock
- UnitBlock

### Reserva

- Reservation
- ReservationRoom
- ReservationRoomNight
- Guest

### Promoções

- Promotion
- PromotionHotel
- PromotionUnit
- PromotionRoomType
- PromotionRoom

### Avaliação

- Review
- ReviewScore
- ReviewMedia
- ReviewComment
- ReviewReport

### Favoritos

- FavoriteHotelList
- FavoriteHotelItem
- FavoriteRoomList
- FavoriteRoomItem

### Financeiro

- Payment (cada tentativa de pagamento é um registro próprio)
- Refund
- StripeWebhookEvent

Comissão e taxa de serviço não são entidades: são valores gravados em Reservation e ReservationRoom.

### Comunicação e jobs

- Notification
- EmailDelivery
- JobExecution

### Pesquisa e analytics

- SearchHistory
- SearchImpression
- SearchClick
- DailyMetric

### Administração

- AuditLog
- SystemSetting

## Relações principais

```text
User 1 ── N Hotel (proprietário)
User N ── N Hotel (gestores adicionais, via HotelManager)
Hotel 1 ── N HotelUnit
Hotel 1 ── N RoomType
HotelUnit 1 ── N Room
RoomType 1 ── N Room
RoomType 1 ── N BedConfiguration
Hotel 1 ── N HotelAcceptance
AcceptanceType 1 ── N HotelAcceptance
Reservation 1 ── N ReservationRoom
ReservationRoom N ── 1 Room
ReservationRoom 1 ── N ReservationRoomNight
ReservationRoom 1 ── N Guest
Reservation 1 ── N Payment
Payment 1 ── N Refund
ReservationRoom 1 ── N Refund
ReservationRoom 1 ── 0..1 Review
Review 1 ── N ReviewScore
Review 1 ── N ReviewMedia
Review 1 ── N ReviewComment
ReviewComment 1 ── N ReviewMedia
Review 1 ── N ReviewReport
User 1 ── N FavoriteHotelList
User 1 ── N FavoriteRoomList
FavoriteHotelList 1 ── N FavoriteHotelItem
FavoriteRoomList 1 ── N FavoriteRoomItem
Promotion N ── N Hotel / HotelUnit / RoomType / Room (via tabelas de alvo)
```

## Estados

### HotelStatus

```text
DRAFT
UNDER_REVIEW
PUBLISHED
BLOCKED
```

### RoomOperationalStatus

```text
AVAILABLE
UNAVAILABLE
MAINTENANCE
BLOCKED
INACTIVE
```

### ReservationStatus

```text
PENDING_PAYMENT
CONFIRMED
PARTIALLY_CANCELLED
CANCELLED
COMPLETED
NO_SHOW
```

### ReservationRoomStatus

```text
PENDING_PAYMENT
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
```

### PaymentStatus

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

### RefundStatus

```text
REQUESTED
PROCESSING
COMPLETED
FAILED
```

### ReviewReportStatus

```text
PENDING
REVIEWED
ACCEPTED
REJECTED
```

### ReviewCommentType

```text
AUTHOR_COMMENT
MANAGER_REPLY
```

### EmailDeliveryStatus

```text
PENDING
SENT
FAILED
```
