# 10 — API e Contratos

## Padrão de resposta

### Sucesso

```json
{
    "success": true,
    "data": {}
}
```

### Listas paginadas

As rotas `GET /api/hotels`, `GET /api/admin/hotels`, `GET /api/hotels/:id/units`, `GET /api/hotels/:id/room-types`, `GET /api/units/:id/rooms` e `GET /api/amenities` aceitam os parâmetros opcionais de query:

- `page`: número inteiro positivo da página; padrão `1`.
- `pageSize`: número inteiro positivo de itens por página; padrão `20`, máximo `100`.

Valores não inteiros, menores que `1` ou `pageSize` maior que `100` são inválidos e respondem `400 VALIDATION_ERROR`. Em caso de sucesso, essas rotas retornam:

```json
{
    "success": true,
    "data": {
        "items": [],
        "page": 1,
        "pageSize": 20,
        "total": 0
    }
}
```

`items` contém os registros da página solicitada; `page` e `pageSize` informam os valores aplicados (incluindo os padrões quando omitidos); `total` é a quantidade total de registros que correspondem aos filtros da consulta, antes da paginação.

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
HOTEL_MANAGER_NOT_FOUND
HOTEL_MANAGER_ALREADY_EXISTS
UNIT_NOT_FOUND
AMENITY_NOT_FOUND
AMENITY_ALREADY_EXISTS
POLICY_NOT_FOUND
ROOM_TYPE_NOT_FOUND
ROOM_NOT_FOUND
ROOM_INACTIVE
ROOM_NUMBER_ALREADY_EXISTS
ROOM_TYPE_INACTIVE
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
SERVICE_UNAVAILABLE
RATE_LIMITED
INVALID_RESET_TOKEN
INVALID_MEDIA_TYPE
MEDIA_TOO_LARGE
VIDEO_TOO_LONG
MEDIA_NOT_FOUND
MEDIA_IN_USE
HOTEL_IMAGE_NOT_FOUND
HOTEL_IMAGE_LIMIT_REACHED
UNIT_IMAGE_NOT_FOUND
PRICE_PERIOD_NOT_FOUND
PRICE_PERIOD_OVERLAP
PRICE_PERIOD_PAST
GEOCODING_NOT_FOUND
```

- `VALIDATION_ERROR`: entrada inválida (Zod). A `message` é a do primeiro problema encontrado. CPF com formato ou dígitos verificadores inválidos usa `INVALID_CPF`, e CNPJ, `INVALID_CNPJ`.
- `INVALID_CNPJ`: CNPJ com formato ou dígitos verificadores inválidos. Aceita o formato numérico e o alfanumérico (RN119).
- `INVALID_HOTEL_STATUS`: a ação não é permitida para o status atual do hotel (por exemplo, editar um hotel que não está em `DRAFT` ou aprovar um hotel que não está em `UNDER_REVIEW`). Também é devolvido quando outro usuário muda o status durante a requisição. Responde `409`.
- `USER_ALREADY_EXISTS`: e-mail ou CPF já cadastrado. Um único código para os dois casos, para não revelar qual dado já existe.
- `INTERNAL_ERROR`: erro inesperado. A `message` é genérica; detalhes ficam apenas no log do servidor (sem dados sensíveis).
- `SERVICE_UNAVAILABLE`: uma dependência obrigatória (MySQL, Redis, Nominatim) não respondeu. Usado por `GET /api/health/ready` e pela geocodificação, com status `503`.
- `RATE_LIMITED`: muitas tentativas seguidas. Usado por `POST /api/auth/login` depois de 5 falhas na mesma combinação de IP e e-mail em 15 min (doc 15). Responde `429` com o header `Retry-After` (segundos até a janela expirar) e a mensagem "Muitas tentativas de login. Tente novamente em alguns minutos.". Também usado por `POST /api/auth/forgot-password` (5 pedidos por IP e e-mail em 15 min, existindo a conta ou não) e por `POST /api/auth/reset-password` (10 tokens inválidos por IP em 15 min).
- `INVALID_RESET_TOKEN`: token de recuperação de senha inexistente, expirado, já usado, substituído por um pedido mais novo ou de usuário inativo. Um único código e a mesma mensagem ("Link de recuperação inválido ou expirado. Solicite um novo.") para todos os casos. Responde `400`.
- `INVALID_MEDIA_TYPE`, `MEDIA_TOO_LARGE` e `VIDEO_TOO_LONG`: arquivo com MIME, extensão, tamanho ou duração fora do doc 22. Respondem `400`.
- `MEDIA_NOT_FOUND`: o Cloudinary não tem o asset pedido. Responde `404`.
- `MEDIA_IN_USE`: o asset já está gravado numa tabela de imagem e só sai pela rota da galeria. Responde `409`.
- `GEOCODING_NOT_FOUND`: o Nominatim não encontrou o endereço no Brasil. Responde `404`.
- `HOTEL_IMAGE_NOT_FOUND`: a foto não existe na galeria do hotel. Responde `404`.
- `HOTEL_IMAGE_LIMIT_REACHED`: o hotel já tem 10 fotos (RN085). Responde `409`.
- `UNIT_IMAGE_NOT_FOUND`: a foto não existe na galeria da unidade. Responde `404`.

## Status HTTP

O status é derivado da classe do erro de domínio (`src/lib/route-response.js`):

```text
ValidationError     -> 400
UnauthorizedError   -> 401   (UNAUTHORIZED, INVALID_CREDENTIALS)
ForbiddenError      -> 403
NotFoundError       -> 404
ConflictError       -> 409
RateLimitError      -> 429   (RATE_LIMITED, com Retry-After)
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
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET /api/users/me
PATCH /api/users/me
```

- `register`: `name`, `email`, `cpf` (com ou sem máscara), `password` e `role` opcional (`CUSTOMER` padrão ou `MANAGER`, RN116). Responde `201` com o usuário, sem hash de senha.
- `login`: `email` e `password`. Delega ao Auth.js (`signIn` com o provider de credenciais), que grava o cookie de sessão. Responde `200` com o usuário, `401 INVALID_CREDENTIALS` ou, depois de 5 falhas seguidas, `429 RATE_LIMITED` com `Retry-After` (doc 15).
- `logout`: encerra a sessão do Auth.js e responde `200` com `data: null`.
- `forgot-password`: `email`. Responde sempre `200` com `data: null`, exista a conta ou não, esteja ela ativa ou não (RF004, sem enumerar e-mails). Para usuário ativo, gera um token de uso único válido por 1 hora (só o hash vai para `PASSWORD_RESET_TOKEN`, doc 25 §3), invalida os tokens anteriores do usuário e publica `PASSWORD_RESET_REQUESTED` com o token para o e-mail de recuperação (doc 24). Depois de 5 pedidos na mesma combinação de IP e e-mail em 15 min responde `429 RATE_LIMITED`.
- `reset-password`: `token` e `newPassword` (mesma política de senha do cadastro). Responde `200` com `data: null` e grava a nova senha; o token passa a usado e os demais tokens ativos do usuário são invalidados. Token inválido, expirado ou já usado responde `400 INVALID_RESET_TOKEN`; depois de 10 tokens inválidos do mesmo IP em 15 min, `429 RATE_LIMITED`. Sessões já abertas não são encerradas (o JWT não é revogável, doc 15).
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
GET /api/hotels/:id/acceptances
PUT /api/hotels/:id/acceptances
GET /api/hotels/:id/policies
POST /api/hotels/:id/policies
GET /api/hotels/:id/images
POST /api/hotels/:id/images
PATCH /api/hotels/:id/images/:imageId
DELETE /api/hotels/:id/images/:imageId
```

- `POST /api/hotels`: apenas `MANAGER`. Corpo: `name`, `description`, `category`, `cnpj` (com ou sem máscara, numérico ou alfanumérico, RN119) e `email`. O proprietário é o usuário da sessão e o status inicial é sempre `DRAFT`; `status`, `ownerUserId` e `isActive` enviados no corpo são ignorados. Responde `201` com o hotel.
- `GET /api/hotels?page=&pageSize=`: apenas `MANAGER`. Lista os hotéis de que o usuário é proprietário ou gestor adicional, do mais recente ao mais antigo, com paginação conforme o contrato de listas paginadas.
- `GET /api/hotels/:id`: `MANAGER` proprietário, `MANAGER` gestor adicional ou `ADMIN`. Devolve o hotel, o resumo do proprietário (`id`, `name`, `email`) e as `reviewNotes` (`id`, `fromStatus`, `toStatus`, `notes`, `createdAt`), da mais recente para a mais antiga e sem o id do administrador. `managers` (`id`, `name`, `email` dos gestores adicionais) só vai para o proprietário e para o `ADMIN`. Hotel de quem não é gestor responde `404 HOTEL_NOT_FOUND`, sem revelar que ele existe.
- `PATCH /api/hotels/:id`: o `MANAGER` proprietário ou gestor adicional e somente com o hotel em `DRAFT` (RN120); em outro status responde `409 INVALID_HOTEL_STATUS`. Aceita os campos do cadastro, ao menos um.
- `POST /api/hotels/:id/submit-review`: proprietário ou gestor adicional; `DRAFT` → `UNDER_REVIEW`. Não recebe corpo.
- `POST /api/hotels/:id/managers`: apenas o `MANAGER` proprietário (RN110, RF136). Corpo: `email` do gestor. O usuário deve existir (`404 USER_NOT_FOUND`), estar ativo e ter o papel `MANAGER` (`400 VALIDATION_ERROR`). O proprietário ou quem já é gestor adicional responde `409 HOTEL_MANAGER_ALREADY_EXISTS`. Responde `201` com `id`, `name` e `email`. Gestor adicional, outro gestor e hotel inexistente respondem `404 HOTEL_NOT_FOUND`.
- `DELETE /api/hotels/:id/managers/:userId`: apenas o `MANAGER` proprietário. Remove o vínculo e responde `200` com `{ "removed": true }`; quem não é gestor adicional do hotel responde `404 HOTEL_MANAGER_NOT_FOUND`. O proprietário não pode ser removido porque não está na lista.
- `PUT /api/hotels/:id/acceptances`: substitui todas as regras de aceitação do hotel (RF137). Corpo: `acceptances`, lista (até 30) de `{ type, customLabel, isAllowed, details }`, com `type` em `PETS | SMOKING | CHILDREN | VISITORS | EVENTS | OTHER`. `OTHER` exige `customLabel` e os demais tipos o proíbem; um tipo padronizado aparece uma vez e os rótulos de `OTHER` não se repetem, sem diferenciar maiúsculas (RN113); caso contrário `400 VALIDATION_ERROR`. Lista vazia remove todas. Responde `200` com as regras (`id`, `type`, `typeName`, `customLabel`, `isAllowed`, `details`). `GET` devolve a mesma lista. Só com o hotel em `DRAFT` (RN120, RN135); em outro status responde `409 INVALID_HOTEL_STATUS`.
- `GET /api/hotels/:id/policies` (`MANAGER` proprietário, adicional ou `ADMIN`) lista as políticas, ativas e inativas. `POST` (proprietário ou adicional, hotel em `DRAFT`) recebe `type` (`CANCELLATION | QUIET_HOURS | PARKING | OTHER`), `title` e `description` e responde `201`. `isSystem` enviado no corpo é ignorado (RN136). O texto de `CANCELLATION` apenas complementa a política fixa da plataforma (RN114).
- `/api/hotels/:id/images` (RF110, RN085, doc 22): `GET` para o `MANAGER` proprietário, adicional ou `ADMIN`, ordenado por `position`; `POST`, `PATCH` e `DELETE` só para o proprietário ou adicional e com o hotel em `DRAFT` (`409 INVALID_HOTEL_STATUS`). Cada foto devolve `id`, `hotelId`, `url`, `isCover`, `position`, `format`, `bytes`, `width`, `height`, `createdAt` e `updatedAt`. `POST` recebe `assetId` (do `sign-upload`) e `isCover` opcional; o servidor lê `bytes`, `format`, `width`, `height` e a URL segura no Cloudinary, sem aceitar metadados do cliente (`404 MEDIA_NOT_FOUND` se o arquivo não foi enviado; formato diferente de JPG/JPEG ou tamanho acima do limite apagam o asset e respondem `400 INVALID_MEDIA_TYPE` ou `MEDIA_TOO_LARGE`), recusa a 11ª foto (`409 HOTEL_IMAGE_LIMIT_REACHED`) e um asset já registrado (`409 MEDIA_IN_USE`), põe a foto no fim e responde `201`. A primeira foto vira capa. `PATCH` aceita `position` (0 até o número de fotos menos 1, as demais se deslocam) e `isCover: true` (troca a capa); `isCover: false` responde `400`, porque sempre há uma capa. `DELETE` apaga a linha, compacta as posições, promove a primeira foto restante quando a removida era a capa e, depois do commit, apaga o asset no Cloudinary (falha ali só vai para o log); responde `{ id, removed: true }`. Foto de outro hotel responde `404 HOTEL_IMAGE_NOT_FOUND`.
- `GET|PATCH /api/policies/:id`: `PATCH` aceita ao menos um campo entre `type`, `title`, `description` e `isActive` (a política é desativada, nunca apagada). Política de hotel alheio responde `404 POLICY_NOT_FOUND`.

### Amenities

```text
GET /api/amenities
POST /api/amenities
GET /api/hotels/:id/amenities
PUT /api/hotels/:id/amenities
GET /api/units/:id/amenities
PUT /api/units/:id/amenities
GET /api/room-types/:id/amenities
PUT /api/room-types/:id/amenities
GET /api/rooms/:id/amenities
PUT /api/rooms/:id/amenities
```

- `GET /api/amenities?page=&pageSize=` (`MANAGER`): comodidades ativas globais e as criadas pelo próprio gestor, em ordem alfabética, com paginação conforme o contrato de listas paginadas.
- `POST /api/amenities` (`MANAGER`) recebe `name` (2 a 100 caracteres) e cria uma comodidade própria (`isGlobal: false`, RF027). Nome já usado por uma global ou pelo próprio gestor responde `409 AMENITY_ALREADY_EXISTS`. Comodidades globais só entram por seed (RN137).
- `PUT` substitui o conjunto de comodidades do hotel, da unidade, do tipo ou do quarto (RF023-026). Corpo: `amenityIds`, lista (até 100) de UUIDs; repetidos são unidos e a lista vazia limpa o conjunto. Cada comodidade deve estar ativa e ser global ou criada pelo proprietário ou por um gestor adicional do hotel; senão `404 AMENITY_NOT_FOUND`. Só o `MANAGER` proprietário ou adicional, com o hotel em `DRAFT` (RN120, RN135). `GET` aceita também o `ADMIN`. Item de hotel alheio responde `404` (`HOTEL_NOT_FOUND`, `UNIT_NOT_FOUND`, `ROOM_TYPE_NOT_FOUND` ou `ROOM_NOT_FOUND`).

### Units

```text
GET /api/hotels/:hotelId/units
GET /api/units/:id
POST /api/hotels/:hotelId/units
PATCH /api/units/:id
POST /api/units/:id/blocks
GET /api/units/:id/images
POST /api/units/:id/images
PATCH /api/units/:id/images/:imageId
DELETE /api/units/:id/images/:imageId
```

- No código, o segmento dinâmico de `/api/hotels/...` chama-se `[id]`, porque o Next não aceita dois nomes diferentes no mesmo nível. Ele continua sendo o id do hotel.
- `POST /api/hotels/:hotelId/units`: o `MANAGER` proprietário ou gestor adicional e somente com o hotel em `DRAFT` (RN124); em outro status responde `409 INVALID_HOTEL_STATUS`. Corpo: `name`, `email`, `checkInTime` e `checkOutTime` (`HH:mm`, RN022), `overbookingPercentage` (inteiro de 0 a 10, padrão 0, RN046-048), `address` (`zipCode`, `street`, `number`, `complement` opcional, `neighborhood`, `city`, `state`) e `phones` (1 a 5, RN125). `latitude` e `longitude` enviadas no corpo são ignoradas (RN126). Unidade, endereço e telefones são gravados na mesma transação. Responde `201` com a unidade.
- `GET /api/hotels/:hotelId/units?page=&pageSize=`: `MANAGER` proprietário, gestor adicional ou `ADMIN`. Lista as unidades do hotel, da mais antiga à mais recente, com paginação conforme o contrato de listas paginadas. Hotel de outro gestor responde `404 HOTEL_NOT_FOUND`.
- `GET /api/units/:id`: `MANAGER` proprietário, gestor adicional ou `ADMIN`. Devolve a unidade com `address` (com `latitude` e `longitude`, hoje `null`) e `phones` (`id`, `phone`). Unidade de hotel alheio responde `404 UNIT_NOT_FOUND`.
- `PATCH /api/units/:id`: o `MANAGER` proprietário ou gestor adicional e somente com o hotel em `DRAFT`. Aceita os campos do cadastro, ao menos um. `address` é enviado completo e `phones` substitui a lista (RN125, RN126). `isActive: false` desativa a unidade de forma definitiva; `isActive: true` responde `400`. Não há `DELETE` (RN127).
- Um overbooking acima de 10, ou acima de `MAX_OVERBOOKING_PERCENT` quando ele é menor, responde `400 VALIDATION_ERROR`.
- Os horários voltam como `HH:mm`.
- `/api/units/:id/images` (RF111, RN086, doc 22): mesmo contrato da galeria do hotel (`/api/hotels/:id/images`), com a foto devolvendo `unitId` no lugar de `hotelId`, sem limite de quantidade (nenhum `HOTEL_IMAGE_LIMIT_REACHED`; `position` vai de 0 até o número de fotos menos 1) e exatamente uma capa. Unidade inexistente ou de hotel alheio responde `404 UNIT_NOT_FOUND`; foto fora da unidade, `404 UNIT_IMAGE_NOT_FOUND`. Escrita só com o hotel em `DRAFT` (RN124).

### Room types e rooms

```text
GET /api/hotels/:hotelId/room-types
POST /api/hotels/:hotelId/room-types
GET /api/room-types/:id
PATCH /api/room-types/:id
DELETE /api/room-types/:id
GET /api/room-types/:id/images
POST /api/room-types/:id/images
PATCH /api/room-types/:id/images/:imageId
DELETE /api/room-types/:id/images/:imageId
GET /api/units/:unitId/rooms
POST /api/units/:unitId/rooms
GET /api/rooms/:id
PATCH /api/rooms/:id
DELETE /api/rooms/:id
GET /api/rooms/:id/price-periods
POST /api/rooms/:id/price-periods
PATCH /api/price-periods/:id
DELETE /api/price-periods/:id
POST /api/rooms/:id/blocks
```

- No código, o segmento dinâmico é `[id]` em todas as rotas (`/api/hotels/[id]/room-types`, `/api/units/[id]/rooms`), como nas unidades. Em `/api/units/:unitId/rooms`, `unitId` é o id da unidade. `POST /api/rooms/:id/blocks` não foi implementada (RF020).
- Acesso: criar, alterar e apagar são do `MANAGER` proprietário ou adicional do hotel; as leituras (`GET`) também aceitam `ADMIN`. Hotel, unidade, tipo ou quarto de outro gestor responde `404`, sem revelar que existe. As regras de status do hotel estão no RN129.
- `GET /api/hotels/:hotelId/room-types?page=&pageSize=`: lista os tipos de acomodação do hotel em ordem de criação crescente, com paginação conforme o contrato de listas paginadas.
- `GET /api/units/:unitId/rooms?page=&pageSize=`: lista os quartos da unidade em ordem crescente pelo número do quarto, com paginação conforme o contrato de listas paginadas.
- `POST /api/hotels/:hotelId/room-types`: `name`, `description`, `maxGuests` (1 a 50), `areaM2` e `defaultPrice` (positivos, até 2 casas decimais, aceitos como número ou texto) e `beds` (1 a 10 itens `{ bedType, quantity }`, `bedType` em `SINGLE | DOUBLE | QUEEN | KING | SOFA_BED`, sem repetir, RN128). Responde `201`; valores monetários e área voltam como texto com 2 casas (`"350.00"`).
- `PATCH /api/room-types/:id`: ao menos um campo; `beds` substitui a lista; `isActive: false` desativa de forma definitiva e `isActive: true` responde `400`. Tipo desativado responde `409 ROOM_TYPE_INACTIVE`.
- `POST /api/units/:unitId/rooms`: `roomTypeId` (do mesmo hotel da unidade, RN009, RN132), `number` (até 20 caracteres, único na unidade, RN008), `floor` (inteiro de -5 a 200), `isAccessible` (padrão `false`), `administrativeNotes` (opcional), `status` (`AVAILABLE`, `UNAVAILABLE` ou `MAINTENANCE`, padrão `AVAILABLE`, RN130) e `price` (opcional, preço do quarto, RN010). Responde `201`.
- O quarto devolve `price` (preço do quarto ou `null`), `effectivePrice` (`price` ou, sem ele, o preço padrão do tipo) e o resumo do tipo (`id`, `name`, `defaultPrice`).
- `PATCH /api/rooms/:id`: ao menos um campo entre `roomTypeId`, `number`, `floor`, `isAccessible`, `administrativeNotes`, `status`, `price` e `isActive`. `price: null` remove o preço do quarto (RN131). `isActive: false` desativa (`status` passa a `INACTIVE`) e não pode vir junto com `status`. Quarto desativado responde `409 ROOM_INACTIVE`.
- `DELETE /api/rooms/:id` e `DELETE /api/room-types/:id`: respondem `200` com `{ id, outcome }`, em que `outcome` é `DELETED` (sem histórico) ou `DEACTIVATED` (com histórico, RN011, RN133).
- `/api/room-types/:id/images` (RF016, doc 22): mesmo contrato da galeria da unidade (`/api/units/:id/images`), com a foto devolvendo `roomTypeId` no lugar de `unitId`, sem capa (nenhum `isCover` na resposta; `POST` recebe só `assetId` e `PATCH` só `position`, obrigatório) e sem limite de quantidade. Escrita só com o hotel em `DRAFT` e o tipo ativo (`409 ROOM_TYPE_INACTIVE`); a leitura também mostra a galeria de um tipo desativado. Tipo inexistente ou de hotel alheio responde `404 ROOM_TYPE_NOT_FOUND`; foto fora do tipo, `404 ROOM_TYPE_IMAGE_NOT_FOUND`. Os quartos físicos exibem as fotos do tipo.
- Preço por período (RF057, RN025, doc 25 §10): `POST /api/rooms/:id/price-periods` recebe `startDate` e `endDate` (`AAAA-MM-DD`, inclusivas, `startDate <= endDate`) e `price` (positivo, até 2 casas). O `GET` devolve os períodos do quarto por `startDate` crescente, sem paginação, cada um com `{ id, roomId, startDate, endDate, price, createdAt, updatedAt }`. O `PATCH` aceita qualquer subconjunto desses campos (ao menos um). O `DELETE` remove o período e responde `{ id }`. Escrita com o hotel em `DRAFT` ou `PUBLISHED` (RN129) e o quarto ativo (`409 ROOM_INACTIVE`). `startDate` anterior a hoje responde `400`. Período já iniciado (`startDate` anterior a hoje) não é alterado nem excluído: `409 PRICE_PERIOD_PAST`. Datas sobrepostas a outro período do quarto respondem `409 PRICE_PERIOD_OVERLAP`; períodos encostados (um termina no dia 10, o outro começa no 11) são aceitos. Período inexistente ou de hotel alheio responde `404 PRICE_PERIOD_NOT_FOUND`. Não há período por tipo de quarto.
- O corpo de `POST /api/units/:unitId/rooms` informa `roomTypeId`, que deve pertencer ao mesmo hotel da unidade. Número repetido na unidade responde `409 ROOM_NUMBER_ALREADY_EXISTS`.

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

- `GET /api/admin/hotels?status=&page=&pageSize=`: apenas `ADMIN`. Lista hotéis (`updatedAt` decrescente) com o resumo do proprietário (sem CPF), usando a paginação do contrato de listas paginadas. O filtro `status` (`DRAFT`, `UNDER_REVIEW`, `PUBLISHED` ou `BLOCKED`) é opcional e combina-se com a paginação; `total` considera somente os hotéis que correspondem ao status informado. Sem `status`, lista todos os status.
- As quatro ações de hotel são exclusivas do `ADMIN`, exigem corpo JSON com `reason` (1 a 1000 caracteres, RN108), gravam o `AUDIT_LOG` na mesma transação da mudança de status (RN070, RN122) e respondem `200` com o hotel atualizado. Um status de origem incompatível responde `409 INVALID_HOTEL_STATUS`.
    - `approve`: `UNDER_REVIEW` → `PUBLISHED`.
    - `request-changes`: `UNDER_REVIEW` → `DRAFT`, com `HOTEL_REVIEW_NOTE` (RN105).
    - `block`: `PUBLISHED` ou `UNDER_REVIEW` → `BLOCKED`, com `HOTEL_REVIEW_NOTE` (RN121).
    - `unblock`: `BLOCKED` → `PUBLISHED` ou `DRAFT`, conforme o `targetStatus` do corpo, obrigatório e sem valor padrão (RN106), com `HOTEL_REVIEW_NOTE`.
- O `AUDIT_LOG` guarda o IP, o `User-Agent` e o `x-request-id` da requisição quando disponíveis. O IP vem de `x-forwarded-for` (primeiro endereço) ou `x-real-ip` e é apenas informativo, pois o cliente pode forjá-lo (doc 15).

### Health

```text
GET /api/health
GET /api/health/ready
```

- Rotas públicas, sem cache (`Cache-Control: no-store`), usadas como healthcheck do container e do deploy. Seguem o envelope acima.
- `health` (liveness): não consulta nenhuma dependência e responde `200` com `data: { "status": "ok" }`.
- `health/ready` (readiness): checa o MySQL (`SELECT 1`) e o Redis (`PING`) em paralelo, cada um com timeout de 2 s. Com tudo `up`, responde `200` com `data: { "status": "ready", "components": { "mysql": "up", "redis": "up" } }`. Com algum componente `down`, responde `503` com `error.code = SERVICE_UNAVAILABLE` e, como exceção ao envelope de erro, também `data: { "status": "not_ready", "components": {...} }`. A resposta nunca traz URL, host, credencial ou mensagem do erro; o componente que falhou vai para o log do servidor (`warn`). O RabbitMQ entra na lista quando existir.

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

- Só o `MANAGER` proprietário ou adicional do hotel do alvo (RN110). Alvo de outro hotel ou inexistente responde `404` (`HOTEL_NOT_FOUND`, `UNIT_NOT_FOUND` ou `ROOM_TYPE_NOT_FOUND`); outro papel, `403`. Nenhum binário passa pela API (RNF029): o cliente envia o arquivo direto ao Cloudinary.
- `sign-upload`: corpo `scope` (`HOTEL`, `UNIT` ou `ROOM_TYPE`; `REVIEW` entra na BE-61), `targetId`, `fileName`, `mimeType`, `bytes` e `durationSeconds` (só vídeo). Exige o hotel em `DRAFT` (`409 INVALID_HOTEL_STATUS`). Valida MIME, extensão e tamanho declarados (doc 22) e responde `200` com `assetId`, `publicId` (`{pasta}/{targetId}/{assetId}`, gerado pela aplicação), `folder`, `resourceType`, `allowedFormats`, `maxBytes`, `uploadUrl`, `cloudName`, `apiKey`, `timestamp`, `signature` e `expiresAt` (`timestamp` + 1 h, validade da assinatura no Cloudinary). Nunca devolve o `CLOUDINARY_API_SECRET`.
- `DELETE /api/media/:id?scope=...&targetId=...`: `:id` é o `assetId` devolvido pelo `sign-upload`; a rota remonta o `publicId` e apaga o asset do Cloudinary só se ele ainda não estiver numa tabela de imagem (senão `409 MEDIA_IN_USE`). Serve para limpar um upload cujo cadastro falhou. Responde `200` com `assetId` e `publicId`, ou `404 MEDIA_NOT_FOUND`.

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

- Só `MANAGER`. O corpo tem só os campos do endereço da unidade (`zipCode`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, mesmas regras de `POST /api/hotels/:id/units`); campos extras são ignorados e não há busca em texto livre. O complemento não é enviado ao Nominatim (doc 15).
- `200` com `data: { latitude, longitude }`, strings com 6 casas decimais. Endereço não encontrado: `404 GEOCODING_NOT_FOUND`. Nominatim indisponível, sem `NOMINATIM_USER_AGENT` ou fila de 1 req/s ocupada por mais de 2 s: `503 SERVICE_UNAVAILABLE`.
- Limite: 10 chamadas por usuário em 10 min, contando toda chamada; `429 RATE_LIMITED` com `Retry-After`.

## Search metrics

```text
POST /api/search/impressions
POST /api/search/clicks
```

Endpoints de métricas deverão validar IDs existentes e possuir proteção contra abuso/bots simples.
