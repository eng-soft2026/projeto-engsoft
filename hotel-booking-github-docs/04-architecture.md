# 04 — Arquitetura

## Estilo arquitetural

Aplicação monolítica modular com Next.js, organizada por domínio.

## Fluxo principal

```text
Interface
    ↓
Route Handler / Server Action
    ↓
Schema Validation
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
MySQL
```

## Estrutura sugerida

```text
src/
    app/
    components/
    modules/
    lib/
    services/
    repositories/
    schemas/
    hooks/
    utils/
    constants/
    config/
```

## Módulos de domínio

```text
auth/
users/
hotels/
units/
room-types/
rooms/
amenities/
policies/
search/
availability/
reservations/
guests/
reviews/
favorites/
pricing/
payments/
refunds/
commissions/
notifications/
admin/
analytics/
audit/
promotions/
media/
maps/
jobs/
```

## Server Components

Usar por padrão.

`"use client"` apenas quando necessário para:

- estado local;
- eventos do navegador;
- formulários altamente interativos;
- gráficos;
- componentes dependentes de APIs do browser.

## Services

Responsáveis por regras de negócio.

Exemplos:

```text
ReservationService
AvailabilityService
PricingService
OverbookingService
HotelService
PaymentService
RefundService
NotificationService
```

## Repositories

Concentrar persistência e queries complexas.

## Schemas

Zod deve validar entrada de usuário, parâmetros e payloads.

## Jobs

Necessários para:

- lembrete de check-in;
- expiração de holds;
- e-mails;
- tarefas de reembolso;
- atualizações periódicas.

RabbitMQ será a infraestrutura de filas.

Exchange e filas (detalhes em `24-jobs-email.md`):

```text
app.events (exchange)
email.send
notifications.dispatch
refund.process
reservation.expiration
checkin.reminder
analytics.aggregate
media.cleanup
```

Cada fila `X` possui uma fila de retry `X.retry` (TTL de 30 minutos) e uma Dead Letter Queue `X.dlq`.

Falhas transitórias deverão ser reenviadas após 30 minutos. A política padrão será de até 3 tentativas totais. Após o limite, a mensagem deverá seguir para uma Dead Letter Queue para inspeção administrativa.

Para o atraso de 30 minutos, preferir uma retry queue com TTL e dead-letter exchange, evitando depender de plugins não essenciais do RabbitMQ.


## Mídia

```text
Client
  ↓
Upload endpoint / signed upload
  ↓
MediaService
  ↓
Cloudinary
  ↓
MySQL armazena apenas metadados e public IDs/URLs
```

O banco não armazenará binários de imagens ou vídeos.

## Mapas e geocodificação

```text
Unit address
  ↓
GeocodingService
  ↓
Nominatim
  ↓
latitude/longitude persistidos no MySQL
  ↓
Leaflet + OpenStreetMap para exibição
```

Geocodificação deverá acontecer na criação ou alteração relevante do endereço, e não a cada pesquisa.

## E-mail

```text
Domain event
  ↓
RabbitMQ
  ↓
EmailWorker
  ↓
Nodemailer
  ↓
SMTP
```

Templates deverão ser HTML com CSS compatível com clientes de e-mail e versão em texto puro.
