# 09 — Banco de Dados e Prisma

## Banco principal

MySQL será a fonte de verdade.

## ORM

Prisma ORM será utilizado para:

- schema;
- migrations;
- queries;
- relacionamentos;
- transações.

## Regras de modelagem

- IDs em UUID (`@default(uuid())`).
- Datas em UTC no banco.
- Valores monetários com Decimal, nunca float.
- CNPJ e CPF armazenados normalizados.
- Soft delete quando histórico precisar ser preservado.
- Índices em campos de pesquisa e relacionamento.

## Índices importantes

- Hotel.status
- Hotel.cnpj
- Address.city/state
- Room.unitId
- Room.roomTypeId
- Reservation.userId
- ReservationRoom.roomId
- Reservation.checkIn/checkOut
- Payment.reservationId
- Review.reservationRoomId
- Review.userId

## Restrições

- número do quarto único por unidade;
- CNPJ obrigatório;
- CPF obrigatório nos hóspedes;
- checkOut > checkIn;
- percentual de overbooking entre 0 e 10;
- notas entre 1 e 5.

## Transações

Obrigatórias em fluxos como:

- confirmação da reserva;
- cancelamento com atualização financeira;
- alteração de reserva;
- confirmação de pagamento;
- processamento de reembolso.

## Snapshot financeiro

A reserva deve armazenar o preço contratado no momento da criação.

Alterações posteriores de tabela não podem modificar reservas antigas.

## Soft delete

Usar em:

- quartos com histórico;
- entidades críticas que participam de reservas;
- dados necessários para auditoria.


## Entidades adicionais definidas posteriormente

Os nomes definitivos estão em `25-database-model.md`:

```text
HOTEL_IMAGE
UNIT_IMAGE
ROOM_TYPE_IMAGE
REVIEW_MEDIA
PROMOTION
PROMOTION_HOTEL
PROMOTION_UNIT
PROMOTION_ROOM_TYPE
PROMOTION_ROOM
SEARCH_IMPRESSION
SEARCH_CLICK
EMAIL_DELIVERY
JOB_EXECUTION
HOTEL_REVIEW_NOTE
STRIPE_WEBHOOK_EVENT
RESERVATION_ROOM_NIGHT
```

### Mídia

Não existe tabela genérica de mídia. Cada contexto possui a sua tabela (`HOTEL_IMAGE`, `UNIT_IMAGE`, `ROOM_TYPE_IMAGE`, `REVIEW_MEDIA`) com referências ao Cloudinary, sem binário no banco.

### Promoção

Escopo por tabelas de alvo (hotel, unidade, tipo e quarto). Reservas armazenam snapshot suficiente para auditoria do desconto aplicado em `RESERVATION_ROOM`.

### Métricas de pesquisa

`SEARCH_IMPRESSION` e `SEARCH_CLICK` são a fonte de verdade. Favoritos e hospedagens concluídas são calculados a partir das tabelas de favoritos e de `RESERVATION_ROOM`. Contadores no Redis são apenas cache.

## Precisão monetária

Utilizar `Decimal` no Prisma/MySQL para valores financeiros. Definir escala compatível com BRL, mantendo pelo menos duas casas decimais e evitando `Float`.
