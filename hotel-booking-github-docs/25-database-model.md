# Banco de Dados — Sistema de Reservas de Hotel

## 1. Objetivo

Este documento consolida a modelagem lógica do banco MySQL do sistema. O acesso será feito preferencialmente via Prisma ORM.

Princípios:
- MySQL é a fonte de verdade.
- Redis serve apenas para cache, holds e apoio à concorrência.
- Valores financeiros usam `DECIMAL`, nunca `FLOAT`.
- Registros históricos não devem ser sobrescritos.
- Exclusão física só é permitida quando não existe histórico relacionado.
- Reservas armazenam snapshots de dados e preços relevantes.

## 2. Convenções

Todas as entidades principais usam `id` como PK. Recomenda-se UUID.

Campos temporais padrão:

```text
created_at
updated_at
```

Valores financeiros:

```text
DECIMAL(12,2)
```

Arredondamento financeiro: duas casas decimais, sempre para baixo.

No Prisma, models usam PascalCase e campos usam camelCase, mapeados com `@@map`/`@map` para tabelas e colunas em snake_case no singular (por exemplo `HotelUnit` → `hotel_unit`, `overbookingPercentage` → `overbooking_percentage`). IDs são `CHAR(36)` com `@default(uuid())`. Chaves estrangeiras usam `ON DELETE RESTRICT`; a desativação lógica é preferida à exclusão (§28).

Restrições que o Prisma não representa, como `CHECK`, são escritas em SQL na própria migration. O MySQL não possui índice parcial: unicidades condicionais combinam o índice único possível com validação no service.

## 3. Usuários

### USER

```text
USER
- id PK
- name
- email UNIQUE
- cpf UNIQUE
- password_hash
- role
- is_active
- created_at
- updated_at
```

`role`:

```text
CUSTOMER
MANAGER
ADMIN
```

Cada usuário possui apenas um role.

`email` é gravado em minúsculas e `cpf` com 11 dígitos, sem máscara (RN117). O cadastro público só cria `CUSTOMER` ou `MANAGER`; `ADMIN` vem do seed (RN116). `password_hash` nunca é selecionado nas consultas que alimentam respostas da API.

## 4. Hotéis e gestores

### HOTEL

```text
HOTEL
- id PK
- owner_user_id FK -> USER.id
- name
- description
- category
- cnpj
- email
- status
- is_active
- created_at
- updated_at
```

Status:

```text
DRAFT
UNDER_REVIEW
PUBLISHED
BLOCKED
```

Regras:
- cada hotel possui um único proprietário;
- o proprietário deve ser `MANAGER`;
- CNPJ é obrigatório, gravado normalizado (14 caracteres em maiúsculas, numérico ou alfanumérico, RN119) e sem unicidade entre hotéis;
- `description`, `category` e `email` também são obrigatórios: o rascunho é criado já com todos os campos preenchidos;
- publicação exige aprovação administrativa;
- `category` é texto livre (até 50 caracteres) enquanto os valores não forem definidos.

### HOTEL_MANAGER

```text
HOTEL_MANAGER
- hotel_id PK/FK -> HOTEL.id
- user_id PK/FK -> USER.id
- created_at
```

Permite vários gestores adicionais, todos com o role `MANAGER`. Gestores adicionais têm os mesmos poderes operacionais entre si. O proprietário é superior: apenas ele adiciona ou remove gestores adicionais, e ele não precisa estar duplicado nesta tabela.

### HOTEL_REVIEW_NOTE

```text
HOTEL_REVIEW_NOTE
- id PK
- hotel_id FK -> HOTEL.id
- admin_user_id FK -> USER.id
- from_status
- to_status
- notes
- created_at
```

Registra as observações administrativas quando um hotel `UNDER_REVIEW` volta para `DRAFT`, quando um hotel `PUBLISHED` ou `UNDER_REVIEW` é bloqueado e quando um hotel `BLOCKED` é movido para `DRAFT` ou `PUBLISHED` (RN123). `notes` recebe o mesmo motivo gravado em `AUDIT_LOG.reason`.

## 5. Regras simples de aceitação

Regras como pets, cigarro, crianças, visitantes e eventos não ficam como colunas booleanas em `HOTEL`.

### ACCEPTANCE_TYPE

```text
ACCEPTANCE_TYPE
- id PK
- code UNIQUE
- name
- description
- is_system
- created_at
```

Tipos iniciais:

```text
PETS
SMOKING
CHILDREN
VISITORS
EVENTS
OTHER
```

Os tipos oficiais da plataforma terão `is_system = true` e são criados pelo seed.

### HOTEL_ACCEPTANCE

```text
HOTEL_ACCEPTANCE
- id PK
- hotel_id FK -> HOTEL.id
- acceptance_type_id FK -> ACCEPTANCE_TYPE.id
- custom_label nullable
- is_allowed
- details nullable
- created_at
- updated_at
```

Regras:
- se `acceptance_type != OTHER`, `custom_label = NULL`;
- se `acceptance_type = OTHER`, `custom_label` é obrigatório;
- `OTHER` representa especificidades criadas pelo gestor;
- cada hotel possui no máximo uma regra por tipo padronizado; para `OTHER`, `custom_label` é único dentro do hotel (RN113);
- o banco possui índice único em `(hotel_id, acceptance_type_id, custom_label)`, que garante a unicidade do `custom_label` em `OTHER`. Como o MySQL aceita vários `NULL` em índice único, a regra de uma por tipo padronizado e a obrigatoriedade de `custom_label` apenas em `OTHER` são validadas no service.

Exemplo:

```text
PETS
is_allowed = true
```

Exemplo customizado:

```text
OTHER
custom_label = "Uso de caixas de som nas áreas externas"
is_allowed = false
details = "Não permitido após as 22h."
```

## 6. Políticas do hotel

### HOTEL_POLICY

```text
HOTEL_POLICY
- id PK
- hotel_id FK
- type
- title
- description
- is_system
- is_active
- created_at
- updated_at
```

Usada para políticas textuais completas, como cancelamento, silêncio, estacionamento e regras adicionais.

`type`:

```text
CANCELLATION
QUIET_HOURS
PARKING
OTHER
```

A política de cancelamento da plataforma (RN039 a RN045 e RN077) é fixa. Um `HOTEL_POLICY` do tipo `CANCELLATION` apenas exibe texto complementar e nunca altera prazos ou reembolsos (RN114).

Diferença:

```text
HOTEL_ACCEPTANCE -> aceita/não aceita algo
HOTEL_POLICY -> regra textual mais completa
```

## 7. Unidades

### HOTEL_UNIT

```text
HOTEL_UNIT
- id PK
- hotel_id FK
- name
- email
- check_in_time
- check_out_time
- overbooking_percentage
- is_active
- created_at
- updated_at
```

Cada unidade pertence a apenas um hotel.

Overbooking configurável entre 0% e 10%. `overbooking_percentage` é inteiro (`TINYINT UNSIGNED`, padrão 0) com `CHECK (overbooking_percentage BETWEEN 0 AND 10)` criado em SQL na migration; o service também valida o valor contra `MAX_OVERBOOKING_PERCENT`. Bloqueios temporários são feitos por `UNIT_BLOCK`; `is_active` desativa a unidade definitivamente.

### ADDRESS

```text
ADDRESS
- id PK
- unit_id FK UNIQUE
- zip_code
- street
- number
- complement nullable
- neighborhood
- city
- state
- latitude nullable
- longitude nullable
- created_at
- updated_at
```

`latitude` e `longitude` são `DECIMAL(9,6)` anuláveis. Quem as preenche é a geocodificação (Fase 3, RN088), nunca o cliente; até lá ficam `NULL`, em vez de um valor falso como `0,0`, que é um ponto válido no oceano. Ao alterar o endereço, o service volta as duas colunas a `NULL`, porque a coordenada antiga deixou de valer. Pesquisa e mapa devem ignorar unidades sem coordenadas, e a Fase 3 deve exigi-las antes de publicar o hotel.

Cardinalidade:

```text
HOTEL_UNIT 1:1 ADDRESS
```

### UNIT_PHONE

```text
UNIT_PHONE
- id PK
- unit_id FK
- phone
- created_at
```

Cardinalidade:

```text
HOTEL_UNIT 1:N UNIT_PHONE
```

## 8. Tipos de quarto

### ROOM_TYPE

O tipo pertence ao hotel, não à unidade. Só pode ser associado a quartos de unidades do mesmo hotel.

```text
ROOM_TYPE
- id PK
- hotel_id FK
- name
- description
- max_guests
- area_m2
- default_price
- is_active
- created_at
- updated_at
```

### BED_CONFIGURATION

```text
BED_CONFIGURATION
- id PK
- room_type_id FK
- bed_type
- quantity
```

`bed_type`:

```text
SINGLE
DOUBLE
QUEEN
KING
SOFA_BED
```

## 9. Quartos físicos

### ROOM

```text
ROOM
- id PK
- unit_id FK
- room_type_id FK
- number
- floor
- status
- is_accessible
- administrative_notes nullable
- is_active
- created_at
- updated_at
```

Status:

```text
AVAILABLE
UNAVAILABLE
MAINTENANCE
BLOCKED
INACTIVE
```

Restrição:

```text
UNIQUE(unit_id, number)
```

O `room_type_id` deve pertencer ao hotel da unidade (RN009).

Tipos e restrições implementados (migração `add_room_types_and_rooms`):

```text
ROOM_TYPE: max_guests SMALLINT UNSIGNED, area_m2 DECIMAL(7,2), default_price DECIMAL(10,2)
BED_CONFIGURATION: quantity TINYINT UNSIGNED, UNIQUE(room_type_id, bed_type)
ROOM: floor SMALLINT, number VARCHAR(20), administrative_notes VARCHAR(1000)
CHECK max_guests >= 1, area_m2 > 0, default_price > 0, quantity >= 1
CHECK (status = 'INACTIVE') equivale a (is_active = 0)
```

`ROOM.status = BLOCKED` só será definido pelos bloqueios por período (RF020); o gestor escolhe apenas `AVAILABLE`, `UNAVAILABLE` e `MAINTENANCE` (RN130).

## 10. Histórico de categoria e preço

### ROOM_TYPE_HISTORY

```text
ROOM_TYPE_HISTORY
- id PK
- room_id FK
- room_type_id FK
- valid_from
- valid_until nullable
```

### ROOM_PRICE_HISTORY

```text
ROOM_PRICE_HISTORY
- id PK
- room_id FK
- price
- valid_from
- valid_until nullable
- created_at
```

`valid_from` e `valid_until` são `DATETIME(0)`. A linha aberta (`valid_until` nulo) é a vigente; as duas tabelas têm `CHECK (valid_until IS NULL OR valid_until >= valid_from)`, e `ROOM_PRICE_HISTORY.price` tem `CHECK (price > 0)` e é `DECIMAL(10,2)`. O cadastro do quarto grava a primeira linha de `ROOM_TYPE_HISTORY` (e a de `ROOM_PRICE_HISTORY`, se o quarto tiver preço). `ROOM` não tem coluna de preço (RN131).

### ROOM_PRICE_PERIOD

```text
ROOM_PRICE_PERIOD
- id PK
- room_id FK
- start_date
- end_date
- price
- created_at
- updated_at
```

Prioridade:

```text
1. preço específico do período
2. preço atual específico do quarto
3. preço padrão do ROOM_TYPE
```

## 11. Comodidades

### AMENITY

```text
AMENITY
- id PK
- created_by_user_id FK nullable
- name
- is_global
- is_active
- created_at
```

Relacionamentos:

```text
HOTEL_AMENITY
UNIT_AMENITY
ROOM_TYPE_AMENITY
ROOM_AMENITY
```

Cada tabela associativa deve impedir duplicidade do mesmo par.

## 12. Imagens

Cloudinary será usado para armazenamento. Todas as tabelas de imagem e `REVIEW_MEDIA` incluem também `format`, `bytes`, `width` e `height` (e `duration_seconds` nos vídeos de `REVIEW_MEDIA`). `url` guarda a URL segura.

### HOTEL_IMAGE

```text
HOTEL_IMAGE
- id PK
- hotel_id FK
- cloudinary_public_id
- url
- is_cover
- position
- created_at
```

Regras:
- máximo de 10 imagens;
- exatamente uma capa.

### UNIT_IMAGE

```text
UNIT_IMAGE
- id PK
- unit_id FK
- cloudinary_public_id
- url
- is_cover
- position
- created_at
```

Sem limite funcional definido, mas com exatamente uma capa.

### ROOM_TYPE_IMAGE

```text
ROOM_TYPE_IMAGE
- id PK
- room_type_id FK
- cloudinary_public_id
- url
- position
- created_at
```

Quartos físicos não possuem galeria própria.

## 13. Bloqueios de disponibilidade

### UNIT_BLOCK

```text
UNIT_BLOCK
- id PK
- unit_id FK
- start_at
- end_at
- reason
- created_by_user_id FK
- created_at
```

### ROOM_BLOCK

```text
ROOM_BLOCK
- id PK
- room_id FK
- start_at
- end_at
- reason
- created_by_user_id FK
- created_at
```

## 14. Reservas

### RESERVATION

```text
RESERVATION
- id PK
- user_id FK
- code UNIQUE
- check_in
- check_out
- status
- subtotal_amount
- discount_amount
- gross_amount
- service_fee
- platform_commission
- total_amount
- hold_expires_at nullable
- created_at
- updated_at
```

Status:

```text
PENDING_PAYMENT
CONFIRMED
PARTIALLY_CANCELLED
CANCELLED
COMPLETED
NO_SHOW
```

Os valores financeiros da reserva são a soma dos itens `RESERVATION_ROOM` (RN111). `hold_expires_at` é preenchido enquanto a reserva está em `PENDING_PAYMENT` e permite ao job `reservation.expiration` cancelar tentativas expiradas.

### RESERVATION_ROOM

```text
RESERVATION_ROOM
- id PK
- reservation_id FK
- room_id FK
- room_type_name_snapshot
- room_number_snapshot
- unit_name_snapshot
- base_price_snapshot
- subtotal_amount
- promotion_id FK nullable
- promotion_name_snapshot nullable
- discount_type_snapshot nullable
- discount_value_snapshot nullable
- discount_amount
- gross_amount
- service_fee
- platform_commission
- total_price
- status
- created_at
- updated_at
```

Status:

```text
PENDING_PAYMENT
CONFIRMED
CANCELLED
COMPLETED
NO_SHOW
```

Cálculo do item (RN111, ver `12-payments-and-billing.md`):

```text
subtotal_amount = soma das diárias do item (RESERVATION_ROOM_NIGHT)
gross_amount    = subtotal_amount - discount_amount
service_fee     = floor2(gross_amount x 10%)
platform_commission = floor2(gross_amount x 10%)
total_price     = gross_amount + service_fee
```

`total_price` é o valor reembolsável do quarto (RN112). `base_price_snapshot` guarda a diária base vigente no momento da reserva; o detalhamento por noite fica em `RESERVATION_ROOM_NIGHT`.

### RESERVATION_ROOM_NIGHT

```text
RESERVATION_ROOM_NIGHT
- id PK
- reservation_room_id FK
- stay_date
- applied_price
- price_source
```

`price_source`:

```text
PERIOD
ROOM
ROOM_TYPE
```

Restrição:

```text
UNIQUE(reservation_room_id, stay_date)
```

`applied_price` é o preço da diária antes de promoção, conforme a prioridade de preço (RN026 e RN028).

## 15. Hóspedes

### GUEST

```text
GUEST
- id PK
- reservation_room_id FK
- full_name
- cpf
- birth_date
- created_at
```

Regras:
- CPF obrigatório;
- hóspede pertence ao quarto reservado;
- registro novo a cada reserva;
- criança: até 12 anos;
- bebê é tratado como criança.

## 16. Pagamentos

### PAYMENT

```text
PAYMENT
- id PK
- reservation_id FK
- method
- status
- amount
- installments
- stripe_payment_intent_id nullable
- created_at
- updated_at
```

Métodos:

```text
CREDIT_CARD
DEBIT_CARD
PIX
```

Status:

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Uma reserva pode possuir vários pagamentos. Cada tentativa de pagamento gera um novo registro `PAYMENT`; tentativas `FAILED` são preservadas.

`amount` é o valor total cobrado na tentativa (`RESERVATION.total_amount` vigente). `installments` maior que 1 só é permitido quando `RESERVATION.gross_amount` for maior que R$ 1.500,00.

### STRIPE_WEBHOOK_EVENT

```text
STRIPE_WEBHOOK_EVENT
- id PK
- stripe_event_id UNIQUE
- type
- payload JSON
- status
- processed_at nullable
- created_at
```

`status`:

```text
RECEIVED
PROCESSED
FAILED
```

Garante o processamento idempotente dos webhooks.

## 17. Reembolsos

### REFUND

```text
REFUND
- id PK
- payment_id FK
- reservation_room_id FK
- amount
- status
- stripe_refund_id nullable
- created_at
- updated_at
```

Status:

```text
REQUESTED
PROCESSING
COMPLETED
FAILED
```

Regras:
- ligado simultaneamente ao pagamento e ao quarto reservado;
- cancelamento com pelo menos 24h de antecedência: reembolso integral;
- com menos de 24h: sem reembolso;
- cancelamento parcial reembolsa apenas o quarto cancelado;
- `amount` é sempre maior que zero e no máximo o `total_price` do item (valor bruto + taxa de serviço do item);
- quando o reembolso é R$ 0,00 (cancelamento do cliente com menos de 24h), nenhum registro `REFUND` é criado;
- o estorno do pagamento anterior em uma alteração de reserva gera um `REFUND` para cada `RESERVATION_ROOM` pago.

## 18. Avaliações

### REVIEW

```text
REVIEW
- id PK
- reservation_room_id FK UNIQUE
- user_id FK
- overall_score
- comment
- is_hidden
- created_at
```

Uma `RESERVATION_ROOM` gera no máximo uma avaliação.

### REVIEW_SCORE

```text
REVIEW_SCORE
- id PK
- review_id FK
- criterion
- score
```

Critérios:

```text
CLEANLINESS
LOCATION
SERVICE
COMFORT
VALUE_FOR_MONEY
```

### REVIEW_MEDIA

```text
REVIEW_MEDIA
- id PK
- review_id FK
- review_comment_id FK nullable
- type
- cloudinary_public_id
- url
- format
- bytes
- width nullable
- height nullable
- duration_seconds nullable
- created_at
```

`type`:

```text
IMAGE
VIDEO
```

Máximo de 4 mídias (imagens e/ou vídeos) por avaliação e por comentário do autor. `review_comment_id` fica `NULL` nas mídias da avaliação original e é preenchido nas mídias de um comentário `AUTHOR_COMMENT`. Respostas `MANAGER_REPLY` não aceitam mídia.

### REVIEW_COMMENT

```text
REVIEW_COMMENT
- id PK
- review_id FK
- author_user_id FK
- type
- content
- created_at
```

Thread livre. Comentários não podem ser excluídos.

`type`:

```text
AUTHOR_COMMENT
MANAGER_REPLY
```

`AUTHOR_COMMENT` é escrito pelo autor da avaliação. `MANAGER_REPLY` é a resposta pública de um gestor do hotel.

### REVIEW_REPORT

```text
REVIEW_REPORT
- id PK
- review_id FK
- reported_by_user_id FK
- reason
- status
- reviewed_by_user_id FK nullable
- created_at
- reviewed_at nullable
```

`status`:

```text
PENDING
REVIEWED
ACCEPTED
REJECTED
```

Se a denúncia for aceita, a avaliação é ocultada, não apagada.

## 19. Favoritos

Uma lista contém somente hotéis ou somente quartos; por isso existem tabelas separadas.

### FAVORITE_HOTEL_LIST

```text
FAVORITE_HOTEL_LIST
- id PK
- user_id FK
- name
- created_at
```

### FAVORITE_HOTEL_ITEM

```text
FAVORITE_HOTEL_ITEM
- id PK
- list_id FK
- hotel_id FK
- created_at
```

Restrição:

```text
UNIQUE(list_id, hotel_id)
```

### FAVORITE_ROOM_LIST

```text
FAVORITE_ROOM_LIST
- id PK
- user_id FK
- name
- created_at
```

### FAVORITE_ROOM_ITEM

```text
FAVORITE_ROOM_ITEM
- id PK
- list_id FK
- room_id FK
- created_at
```

Restrição:

```text
UNIQUE(list_id, room_id)
```

## 20. Promoções

### PROMOTION

```text
PROMOTION
- id PK
- created_by_user_id FK
- name
- discount_type
- discount_value
- valid_from
- valid_until
- stay_from
- stay_until
- minimum_nights
- minimum_subtotal_amount nullable
- usage_limit nullable
- usage_count
- is_active
- created_at
- updated_at
```

Tipo:

```text
PERCENTAGE
FIXED_AMOUNT
```

Alvos (tabelas associativas, com PK composta):

```text
PROMOTION_HOTEL (promotion_id, hotel_id)
PROMOTION_UNIT (promotion_id, unit_id)
PROMOTION_ROOM_TYPE (promotion_id, room_type_id)
PROMOTION_ROOM (promotion_id, room_id)
```

Regras:
- promoções não cumulativas;
- a promoção é avaliada por quarto da reserva e aplica-se a que gerar o menor preço do item;
- um quarto é elegível quando ele, a sua unidade, o seu tipo ou o seu hotel for alvo da promoção;
- período de validade (`valid_from` e `valid_until`) obrigatório;
- período de hospedagem elegível (`stay_from` e `stay_until`) obrigatório; todas as noites devem estar dentro dele;
- `minimum_nights` obrigatório (use 1 quando não houver mínimo);
- `minimum_subtotal_amount` opcional, comparado ao subtotal do quarto antes do desconto;
- `usage_limit` opcional; `usage_count` aumenta na confirmação do pagamento (1 por quarto) e é devolvido no cancelamento do quarto (RN115);
- a promoção aplicada é registrada em `RESERVATION_ROOM` como snapshot.

## 21. Notificações

### NOTIFICATION

```text
NOTIFICATION
- id PK
- user_id FK
- type
- title
- message
- metadata JSON
- is_read
- created_at
```

### EMAIL_DELIVERY

```text
EMAIL_DELIVERY
- id PK
- user_id FK
- notification_id FK nullable
- recipient
- subject
- status
- attempt_count
- last_error nullable
- sent_at nullable
- created_at
- updated_at
```

Status:

```text
PENDING
SENT
FAILED
```

## 22. Jobs

### JOB_EXECUTION

```text
JOB_EXECUTION
- id PK
- type
- reference_type
- reference_id
- status
- attempts
- payload JSON
- last_error nullable
- scheduled_at
- executed_at nullable
- created_at
```

Status:

```text
PENDING
PROCESSING
COMPLETED
RETRY_SCHEDULED
DEAD_LETTERED
```

RabbitMQ:
- máximo 3 tentativas;
- retry após 30 minutos;
- falha final vai para DLQ.

## 23. Pesquisa

### SEARCH_HISTORY

```text
SEARCH_HISTORY
- id PK
- user_id FK
- destination
- check_in
- check_out
- guests
- filters JSON
- created_at
```

Manter apenas as últimas 10 pesquisas por usuário.

### SEARCH_IMPRESSION

```text
SEARCH_IMPRESSION
- id PK
- user_id FK nullable
- unit_id FK
- search_id FK nullable
- created_at
```

### SEARCH_CLICK

```text
SEARCH_CLICK
- id PK
- user_id FK nullable
- unit_id FK
- search_id FK nullable
- created_at
```

`SEARCH_IMPRESSION` e `SEARCH_CLICK` são a fonte de verdade das métricas de relevância. Contadores no Redis são apenas cache.

## 24. Analytics

### DAILY_METRIC

```text
DAILY_METRIC
- id PK
- date
- hotel_id FK nullable
- unit_id FK nullable
- room_type_id FK nullable
- gross_revenue
- net_revenue
- platform_commission
- service_fee_revenue
- refunds_amount
- reservations_count
- cancellations_count
- no_show_count
- completed_stays
- occupancy_rate
- created_at
- updated_at
```

## 25. Auditoria

### AUDIT_LOG

```text
AUDIT_LOG
- id PK
- user_id FK nullable
- action
- entity_type
- entity_id
- before_data JSON
- after_data JSON
- reason nullable
- result
- request_id nullable
- ip_address nullable
- user_agent nullable
- created_at
```

Ações auditáveis incluem:

```text
CREATE
UPDATE
DELETE
BLOCK
APPROVE
CANCEL
REFUND
PRICE_CHANGE
AVAILABILITY_CHANGE
REQUEST_CHANGES
UNBLOCK
HIDE_REVIEW
RELOCATE
```

Logs são imutáveis. `user_id` fica `NULL` quando o ator é o sistema (webhooks e jobs). `reason` é obrigatório nas ações administrativas (RN108). A conta de banco usada pela aplicação não deve possuir permissão de `UPDATE` ou `DELETE` em `AUDIT_LOG`.

Definições da implementação:

```text
id            CHAR(36) UUID
user_id       CHAR(36) nullable, FK -> USER.id ON DELETE RESTRICT
action        VARCHAR(50), uma das ações acima (lista aberta, constantes em src/constants/audit.js)
entity_type   VARCHAR(50), HOTEL por enquanto
entity_id     CHAR(36)
before_data   JSON nullable
after_data    JSON nullable
reason        VARCHAR(1000) nullable
result        ENUM('SUCCESS', 'FAILURE')
request_id    VARCHAR(64) nullable
ip_address    VARCHAR(45) nullable
user_agent    VARCHAR(255) nullable
created_at    DATETIME(3), sem updated_at
```

- `result`: só `SUCCESS` é gravado por enquanto, porque uma ação que falha desfaz a transação inteira, inclusive o log. `FAILURE` fica reservado para o registro de tentativas negadas ou com erro.
- `before_data` e `after_data` guardam apenas os campos que mudaram (nas ações de hotel, `{ "status": ... }`), nunca CNPJ, e-mail, CPF ou outros dados pessoais.
- O log é gravado na mesma transação da mudança que ele descreve (RN122).
- Índices: `(entity_type, entity_id, created_at)` e `(user_id, created_at)`, para as consultas por entidade e por ator (doc 14).
- A aplicação só insere: `audit-log-repository.js` expõe apenas `create`, e um teste (`tests/architecture`) falha se algum código alterar ou apagar linhas. A garantia no banco, a conta da aplicação com apenas `SELECT` e `INSERT` em `audit_log`, é configurada na implantação (doc 15).

## 26. Configurações globais

### SYSTEM_SETTING

```text
SYSTEM_SETTING
- id PK
- key UNIQUE
- value
- value_type
- updated_by_user_id FK nullable
- updated_at
```

Exemplos:

```text
PLATFORM_COMMISSION_PERCENT = 10
SERVICE_FEE_PERCENT = 10
MAX_OVERBOOKING_PERCENT = 10
RESERVATION_HOLD_MINUTES = 15
MAX_BOOKING_ADVANCE_DAYS = 365
JOB_RETRY_MINUTES = 30
MAX_JOB_ATTEMPTS = 3
```

`value` é texto (`VARCHAR(255)`) interpretado conforme `value_type`:

```text
INTEGER
DECIMAL
BOOLEAN
STRING
```

Os valores acima são criados pelo seed sem autor (`updated_by_user_id = NULL`). O seed cria apenas as chaves ausentes e nunca sobrescreve valores alterados pelo administrador. `MAX_OVERBOOKING_PERCENT` só pode reduzir o teto da plataforma (RN047): o banco recusa overbooking acima de 10%.

## 27. Índices recomendados

```text
RESERVATION(user_id)
RESERVATION(check_in, check_out)
RESERVATION(status)

ROOM(unit_id)
ROOM(room_type_id)
ROOM(status)

ROOM_BLOCK(room_id, start_at, end_at)
UNIT_BLOCK(unit_id, start_at, end_at)

ADDRESS(city, state)

PAYMENT(reservation_id)
PAYMENT(status)

REFUND(payment_id)
REFUND(reservation_room_id)

REVIEW(reservation_room_id)
REVIEW(user_id)

SEARCH_IMPRESSION(unit_id, created_at)
SEARCH_CLICK(unit_id, created_at)

RESERVATION(status, hold_expires_at)
RESERVATION_ROOM(room_id)
RESERVATION_ROOM_NIGHT(reservation_room_id, stay_date) UNIQUE
STRIPE_WEBHOOK_EVENT(stripe_event_id) UNIQUE
HOTEL_ACCEPTANCE(hotel_id, acceptance_type_id)
PROMOTION(is_active, valid_from, valid_until)

AUDIT_LOG(entity_type, entity_id, created_at)
AUDIT_LOG(user_id, created_at)
```

## 28. Exclusão lógica

Pode haver exclusão física apenas quando não existe histórico.

Usar inativação para:

```text
USER
HOTEL
HOTEL_UNIT
ROOM_TYPE
ROOM
PROMOTION
AMENITY
```

quando houver histórico.

Nunca apagar registros históricos importantes de:

```text
RESERVATION
RESERVATION_ROOM
PAYMENT
REFUND
REVIEW
AUDIT_LOG
```

## 29. Redis fora do DER

Redis não é entidade relacional.

Usos:

```text
reservation hold de 15 minutos
cache de pesquisa
cache de disponibilidade
cache de hotéis
cache de dashboard
locks temporários
```

MySQL continua sendo a fonte de verdade.

## 30. Regras de integridade principais

```text
check_out > check_in
```

```text
check_in <= data atual + 1 ano
```

Reserva no mesmo dia é permitida se criada pelo menos 1 hora antes do check-in.

Conflito de datas:

```text
new_check_in < existing_check_out
AND
new_check_out > existing_check_in
```

Um quarto nunca pode ter duas reservas confirmadas conflitantes.

Hold:

```text
15 minutos
```

Pagamento recusado não reinicia o hold.

Parcelamento:

```text
valor bruto > R$ 1.500
-> até 12x sem juros
```

## 31. Cardinalidades principais

```text
USER 1:N HOTEL
```

como proprietário.

```text
USER N:N HOTEL
```

via `HOTEL_MANAGER`.

```text
HOTEL 1:N HOTEL_UNIT
HOTEL_UNIT 1:1 ADDRESS
HOTEL 1:N ROOM_TYPE
HOTEL_UNIT 1:N ROOM
ROOM_TYPE 1:N ROOM
USER 1:N RESERVATION
RESERVATION 1:N RESERVATION_ROOM
ROOM 1:N RESERVATION_ROOM
RESERVATION_ROOM 1:N GUEST
RESERVATION 1:N PAYMENT
PAYMENT 1:N REFUND
RESERVATION_ROOM 1:N REFUND
RESERVATION_ROOM 1:0..1 REVIEW
REVIEW 1:N REVIEW_SCORE
REVIEW 1:N REVIEW_MEDIA
REVIEW 1:N REVIEW_COMMENT
REVIEW 1:N REVIEW_REPORT
HOTEL 1:N HOTEL_ACCEPTANCE
ACCEPTANCE_TYPE 1:N HOTEL_ACCEPTANCE
HOTEL 1:N HOTEL_REVIEW_NOTE
RESERVATION_ROOM 1:N RESERVATION_ROOM_NIGHT
REVIEW_COMMENT 1:N REVIEW_MEDIA
USER 1:N FAVORITE_HOTEL_LIST
USER 1:N FAVORITE_ROOM_LIST
PROMOTION N:N HOTEL, HOTEL_UNIT, ROOM_TYPE, ROOM
```

## 32. Próximos passos

Ordem recomendada:

1. criar DER visual;
2. revisar cardinalidades;
3. gerar modelo lógico;
4. definir enums finais;
5. gerar `schema.prisma`;
6. criar migrations;
7. criar seeds;
8. criar índices;
9. implementar repositories;
10. implementar services;
11. testar integridade e concorrência.
