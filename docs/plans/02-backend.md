# Plano 2 — Back-end (Services, Repositories, Route Handlers, jobs, integrações)

Regras comuns: toda tarefa segue UI → Route Handler → Zod → Service → Repository → Prisma; envelope `success/data/error` do doc 10; erros de domínio de `src/lib/errors.js` (novo código de erro → registrar em `10-api-spec.md`); autorização por `requireRole` e política de acesso do hotel; dinheiro só `Decimal`/strings de 2 casas; mudanças que afetam admin gravam `AUDIT_LOG` na mesma transação. Teste padrão por tarefa: `tests/schemas/*`, `tests/services/*` (fakes), `tests/repositories/*` + query-shapes, `tests/app/api/**` (usa `tests/helpers/http.js`).

## BE-A · Pendências da fundação (F0)

#### BE-01 · Login rate limiting with Redis (#68)
- Milestone: F0 · Labels: area:backend, priority:must, type:feat · Depende: DB-01
- Ler: doc 15 (rate limit não implementado), 05 RF002; `src/lib/redis.js`, `src/modules/auth/auth-config.js`, `src/services/auth-service.js`.
- Escopo: `src/lib/rate-limiter.js` (janela fixa/deslizante em Redis, chave por IP+e‑mail normalizado; fábrica com Redis injetado); aplicar em `POST /api/auth/login` e no `authorize` do credentials; excesso → `RateLimitError` (novo, HTTP 429, `RATE_LIMITED`, header `Retry-After`) adicionado a `errors.js` e ao mapeamento de `route-response.js`; limites em constantes/`SYSTEM_SETTING`; falha do Redis **não** bloqueia login (fail-open + log).
- Teste: `tests/lib/rate-limiter.test.js` (limite, janela expira, Redis fake que lança), `tests/app/api/auth/login.test.js` (429).
- Aceite: 5 falhas seguidas ⇒ 429 até a janela expirar.

#### BE-02 · Password recovery (RF004) (#69)
- Milestone: F0 · Labels: area:backend, priority:should, type:feat · Depende: BE-01, DB-01
- Ler: doc 05 RF004; 15; 25 §3 (se não houver colunas/tabela de token, **perguntar** antes de criar migration); `src/modules/auth/password-hasher.js`.
- Escopo: `POST /api/auth/forgot-password` (resposta sempre genérica, sem enumerar e‑mails) e `POST /api/auth/reset-password`; token aleatório de alta entropia guardado **só como hash**, expira (ex.: 1 h), uso único; o envio do e‑mail publica `PASSWORD_RESET_REQUESTED` por um publisher injetável (no-op até BE-83); rate limit de BE-01; redefinir invalida o token e grava a nova senha com o hasher.
- Teste: service (token expirado, reutilizado, inválido; resposta idêntica para e‑mail inexistente), rotas, schema de senha (8–72 bytes, letra+número).
- Aceite: fluxo completo sem vazar existência de conta.

#### BE-03 · Pagination helper and list conventions (#70)
- Milestone: F0 · Labels: area:backend, priority:must, type:feat · Depende: —
- Ler: doc 10 (listas/paginação); rotas `GET` de lista existentes.
- Escopo: `src/schemas/pagination.js` (`page`, `pageSize` com teto) e `src/lib/pagination.js` (`buildPageMeta`, `skip/take`); envelope `data: { items, page, pageSize, total }` (definir/registrar no doc 10 se ausente); aplicar a `GET /api/hotels`, `GET /api/admin/hotels`, `/api/hotels/:id/units`, `/room-types`, `/api/units/:id/rooms`, `/api/amenities`.
- Teste: schema (limites), helper, 1 teste de rota por endpoint com `page`/`pageSize`.
- Aceite: todas as listas existentes paginam; contrato documentado.

## BE-B · Hotel e catálogo (F2)

#### BE-10 · MediaService and signed upload (Cloudinary) (#71)
- Milestone: F2 · Labels: area:backend, priority:must, type:feat · Depende: DB-04
- Ler: doc 22, 15 (uploads), 10 (Media), 02 (cloudinary), RF109/RF116, RNF028/029/035.
- Escopo: dependência `cloudinary` (justificar no PR); `src/modules/media/media-service.js` + `cloudinary-gateway.js` (injetado); `POST /api/media/sign-upload` (auth; escopo hotel/unit/room-type/review; `publicId` gerado pelo app; pasta `hotels/{id}` etc.; valida MIME/extensão/tamanho: `MAX_IMAGE_UPLOAD_MB=10`, `MAX_VIDEO_UPLOAD_MB=50`, vídeo de review ≤ `MAX_REVIEW_VIDEO_SECONDS=10`; JPG/JPEG, MP4/WebM/MOV); `DELETE /api/media/:id` (só dono/gestor autorizado). Variáveis em `.env.example` sem segredos.
- Teste: service com gateway fake (limites, formatos, pasta/publicId, autorização), rotas.
- Aceite: nenhum binário trafega pela API; assinatura expira.

#### BE-11 · Hotel images (max 10, exactly 1 cover) (#72)
- Milestone: F2 · Labels: area:backend, priority:must, type:feat · Depende: BE-10, DB-04
- Ler: doc 22, 07 (RN de mídia), RF110; `hotel-access.js`.
- Escopo: `hotel-image-service.js`/repositório; `GET/POST /api/hotels/:id/images`, `PATCH/DELETE /api/hotels/:id/images/:imageId` (reordenar, definir capa); regras em transação: máx. 10, exatamente 1 capa, só em `DRAFT` (`canEditHotel`), gestor dono/adicional escreve, admin lê, outro 404.
- Teste: service (11ª foto, remover capa, trocar capa, hotel fora de DRAFT), rotas, query-shapes.
- Aceite: invariantes verificadas dentro da transação.

#### BE-12 · Unit images (exactly 1 cover, no fixed limit) (#73)
- Milestone: F2 · Labels: area:backend, priority:must, type:feat · Depende: BE-11
- Ler: doc 22, RF111, `unit-service.js`.
- Escopo: mesmo padrão de BE-11 em `/api/units/:id/images[...]`, sem limite fixo (cota do provedor), 1 capa.
- Teste: service + rotas + query-shapes.
- Aceite: igual BE-11 sem teto de quantidade.

#### BE-13 · Room type images (#74)
- Milestone: F2 · Labels: area:backend, priority:should, type:feat · Depende: BE-11
- Ler: doc 22, RF016, `room-type-service.js`.
- Escopo: `/api/room-types/:id/images[...]` seguindo BE-11; as fotos do tipo aparecem na página do quarto.
- Teste: service + rotas.
- Aceite: igual BE-11.

#### BE-14 · Price by period (`ROOM_PRICE_PERIOD`) service and routes (#75)
- Milestone: F2 · Labels: area:backend, priority:must, type:feat · Depende: DB-03
- Ler: doc 12, 07 RN023-028 e RN073-076, RF057; `room-service.js`, `src/utils/money.js`.
- Escopo: `price-period-service.js`/repositório; `GET/POST /api/rooms/:id/price-periods` e `/api/room-types/:id/price-periods`, `PATCH/DELETE /api/price-periods/:id`; Zod com `createPositiveDecimalSchema`; **sem sobreposição** de períodos para o mesmo alvo (checar na transação; conflito → 409 `PRICE_PERIOD_OVERLAP`); `canOperateHotel` (funciona em `PUBLISHED`); períodos passados não editáveis (preserva histórico, RNF018).
- Teste: service (sobreposição, bordas encostando, passado), rotas, query-shapes.
- Aceite: a prioridade período > quarto > tipo é resolvida depois, em BE-40.

#### BE-15 · Public catalog read endpoints (published hotels, units, rooms) (#76)
- Milestone: F3 · Labels: area:backend, priority:must, type:feat · Depende: BE-11, BE-12
- Ler: doc 10 (Hotels/Units; se a rota pública não existir, **perguntar** o caminho e registrar no doc 10 — sugestão `/api/public/...`), 18 (páginas hotel/unidade/quarto), 07 RN003.
- Escopo: leituras **sem login** só de hotel `PUBLISHED`: hotel (+ unidades ativas, imagens, amenidades, políticas, regras de aceite, nota média), unidade (+ endereço, telefones, quartos, mapa) e quarto/tipo (+ camas, capacidade, área, preço-base). Selects públicos nunca incluem dados do gestor, `passwordHash`, notas de revisão ou campos internos. Hotel não publicado/bloqueado ⇒ 404.
- Teste: service (status ≠ PUBLISHED ⇒ 404, campos proibidos ausentes — snapshot de chaves), rotas sem sessão.
- Aceite: FE-45/46/47 renderizam só com estas rotas.

## BE-C · Geocodificação, disponibilidade e bloqueios (F3/F4)

#### BE-20 · GeocodingService (Nominatim via backend, cache and rate limit) (#77)
- Milestone: F3 · Labels: area:backend, priority:must, type:feat · Depende: BE-01
- Ler: doc 23 (Maps), 10 (Geocoding), RF124-127, RNF030/031, 24 (erro permanente).
- Escopo: `src/modules/maps/geocoding-service.js` + `nominatim-gateway.js` (injetado; `User-Agent` identificado; ≤ 1 req/s); cache Redis por endereço normalizado; `POST /api/geocoding/resolve-address` (autenticado, rate limit por usuário, **não** é proxy genérico: só aceita os campos de endereço do Brasil via Zod); retorna `{ latitude, longitude }` ou `GEOCODING_NOT_FOUND`.
- Teste: service com gateway fake (cache hit/miss, não encontrado, indisponível), rota (401, 429, validação).
- Aceite: nenhuma chamada do browser ao Nominatim.

#### BE-21 · Geocode on unit address create/change and manual marker correction (#78)
- Milestone: F3 · Labels: area:backend, priority:must, type:feat · Depende: BE-20
- Ler: CLAUDE.md (Units: lat/lng só pelo geocoding, `replaceAddress` zera), RF124-126; `unit-service.js`.
- Escopo: após criar/alterar endereço, geocodificar e gravar lat/lng (falha não derruba a criação: lat/lng ficam `NULL` + log); `PATCH /api/units/:id/location` para correção manual do marcador (gestor; só em `DRAFT`; valida faixa do Brasil); o cliente continua sem poder enviar lat/lng em `POST/PATCH` da unidade.
- Teste: service (sucesso, falha do gateway, correção manual, fora do Brasil), rota.
- Aceite: a busca por distância (BE-31) tem coordenadas.

#### BE-22 · AvailabilityService (conflict query) (#79)
- Milestone: F4 · Labels: area:backend, priority:must, type:feat · Depende: DB-05, DB-06
- Ler: doc 11, 07 RN018-022/037/072, 25 §13/§30, CLAUDE.md (conflito `newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn`); `src/modules/availability/date-range.js`.
- Escopo: `availability-service.js` + `availabilityRepository.findUnavailableRoomIds(unitId|hotelId, checkIn, checkOut, client)` considerando reservas confirmadas **e** holds ativos, `ROOM_BLOCK`, `UNIT_BLOCK`, quarto `MAINTENANCE/INACTIVE`; datas coladas permitidas; `GET /api/availability?unitId&checkIn&checkOut&guests` retorna quartos livres (com preço depois de BE-40); expõe `assertRoomsAvailable(roomIds, range, client)` para o checkout revalidar **dentro da transação** (nunca confiar em Redis/front).
- Teste: matriz de conflito (livre, reservado, manutenção, bloqueio de quarto, bloqueio de unidade, encostando, sobreposto, hold ativo) — base de QA-09.
- Aceite: regra de conflito num único lugar.

#### BE-23 · Unit blocks and room blocks (RF014, RF020) (#80)
- Milestone: F4 · Labels: area:backend, priority:must, type:feat · Depende: BE-22
- Ler: doc 10 (blocks — o doc marca bloqueio de quarto como não implementado), 07 RN018-022, RF014/RF020.
- Escopo: `POST/GET /api/units/:id/blocks`, `POST/GET /api/rooms/:id/blocks`, `DELETE /api/blocks/:id` (rota nova → registrar no doc 10); `canOperateHotel`; bloquear período com reserva confirmada ⇒ 409 `BLOCK_CONFLICTS_WITH_RESERVATION`; invalidar o cache de disponibilidade (BE-24).
- Teste: service (conflito com reserva, período inválido, autorização), rotas.
- Aceite: bloqueios aparecem como indisponíveis em BE-22.

#### BE-24 · Availability cache in Redis with invalidation (#81)
- Milestone: F4 · Labels: area:backend, priority:should, type:feat · Depende: BE-22
- Ler: doc 11, RNF004/023, 25 §29.
- Escopo: `availability-cache.js` (chave por unidade+intervalo, TTL curto) usado **só** em leitura de busca/calendário; invalidar em bloqueio, reserva, cancelamento, mudança de status/preço; a revalidação transacional (BE-22) nunca lê cache.
- Teste: hit/miss/invalidação com Redis fake; teste garantindo que `assertRoomsAvailable` ignora o cache.
- Aceite: cache nunca decide confirmação.

## BE-D · Pesquisa (F3)

#### BE-30 · SearchService: name, location, dates, guests (RF030-033) (#82)
- Milestone: F3 · Labels: area:backend, priority:must, type:feat · Depende: BE-15, BE-22
- Ler: doc 05 RF030-033, 23, 10 (Search), 11.
- Escopo: `search-service.js`/`searchRepository`; `GET /api/search?q&city&state&neighborhood&checkIn&checkOut&adults&children&rooms&page&pageSize` (público); só hotéis `PUBLISHED`; filtra por disponibilidade (BE-22) e capacidade; retorna cartões de hotel/unidade com menor preço total e nota; Zod com datas válidas (máx. 1 ano à frente).
- Teste: service (cada filtro isolado e combinado), schema (datas inválidas), query-shapes, rota.
- Aceite: resultados paginados; sem hotel não publicado.

#### BE-31 · Search filters (RF034-041) (#83)
- Milestone: F3 · Labels: area:backend, priority:must, type:feat · Depende: BE-30
- Ler: RF034-041, doc 23.
- Escopo: filtros de preço, nota mínima, amenidades (todas), acessibilidade, pets (via `HOTEL_ACCEPTANCE`), tipo de cama, área do quarto, distância (raio a partir de lat/lng).
- Teste: um teste por filtro + combinação; query-shapes.
- Aceite: filtros combináveis sem N+1.

#### BE-32 · Search sorting and distance (RF042-046) (#84)
- Milestone: F3 · Labels: area:backend, priority:must, type:feat · Depende: BE-31
- Ler: RF042-046, doc 23 (relevância).
- Escopo: `sort=price_asc|price_desc|rating|distance|relevance`; distância por Haversine (sem dependência); `relevance` usa BE-35 (até lá, nota).
- Teste: ordenação determinística com empate (desempata por id).
- Aceite: ordenação estável e paginada.

#### BE-33 · Search cache and recent searches (RF086) (#85)
- Milestone: F3 · Labels: area:backend, priority:should, type:feat · Depende: BE-30, DB-16
- Ler: doc 11, 23, RF086, 25 §23/§29.
- Escopo: cache Redis do resultado por hash dos parâmetros (TTL curto, invalidação junto com BE-24); gravar `SEARCH_HISTORY` do usuário logado; `GET /api/search/recent`.
- Teste: hit/miss, histórico só para logado, limite de itens.
- Aceite: busca repetida não repete a query pesada.

#### BE-34 · Search impressions and clicks (RF132-133) (#86)
- Milestone: F3 · Labels: area:backend, priority:should, type:feat · Depende: DB-16, BE-30
- Ler: RF132-133, doc 10 (Search metrics), 23.
- Escopo: `POST /api/search/impressions` (lote de hotéis exibidos) e `POST /api/search/clicks`; públicos com rate limit; Zod com teto de lote; id de sessão anônimo opcional.
- Teste: service + rotas (lote grande rejeitado, 429).
- Aceite: registros usados por BE-35.

#### BE-35 · Relevance score, popular destinations and home data (RF083-085, RF134-135) (#87)
- Milestone: F3 · Labels: area:backend, priority:should, type:feat · Depende: BE-34
- Ler: doc 23 (0,35·nota + 0,30·estadias + 0,20·CTR + 0,15·favoritos; destinos por check-ins concluídos), RF083-085.
- Escopo: `relevance-calculator.js` **puro**; `GET /api/home` com destinos populares (cidades por check-ins concluídos), hotéis mais bem avaliados e ofertas (vazio até F11); normalização documentada; ligar em `sort=relevance` (BE-32).
- Teste: calculador puro (pesos, normalização, zeros), destinos populares (empates), rota.
- Aceite: fórmula do doc 23 aplicada exatamente.

## BE-E · Reserva (F5)

#### BE-40 · PricingService (per night, priority, commission, rounding) (#88)
- Milestone: F5 · Labels: area:backend, priority:must, type:feat · Depende: BE-14, DB-06
- Ler: doc 12, 07 RN023-028/073-076/111/115, DT020, 25 §10/§14.
- Escopo: `pricing-service.js` **puro + repositório de preços**: preço por noite = período > quarto > tipo; total por `ReservationRoom` = soma das noites; total da reserva = soma dos itens; arredondamento para baixo a 2 casas (DT020) em todo valor derivado; comissão e taxa de serviço 10% do valor bruto; ponto de extensão `applyPromotion` (no-op até BE-101); retorna o snapshot de preço por noite que o checkout grava.
- Teste: tabela de casos (período cobre parte da estadia, prioridade, centavos arredondando para baixo, várias noites, vários quartos/tipos).
- Aceite: nenhum float; strings de 2 casas nas respostas.

#### BE-41 · Reservation hold in Redis (15 min) (#89)
- Milestone: F5 · Labels: area:backend, priority:must, type:feat · Depende: BE-22
- Ler: doc 11, 07 RN013-038, RF054-055, 25 §29; `src/lib/redis.js`.
- Escopo: `hold-service.js`: `SET NX EX 900` por quarto+noites (todos os quartos ou nenhum), id de hold; `POST /api/reservation-holds` (CUSTOMER) com quartos e datas, revalida disponibilidade (BE-22) e devolve `holdId` + `expiresAt`; `DELETE` libera; pagamento recusado **não reinicia** o prazo; o hold é efêmero (a verdade continua no MySQL: BE-42 grava a reserva `PENDING_PAYMENT` com `holdExpiresAt`).
- Teste: dois usuários no mesmo quarto (só um ganha), hold parcial desfeito, expiração (relógio injetado), liberação.
- Aceite: sem lock órfão após falha parcial.

#### BE-42 · ReservationService.create (transaction, revalidation) (#90)
- Milestone: F5 · Labels: area:backend, priority:must, type:feat · Depende: BE-40, BE-41, BE-43
- Ler: doc 07 RN013-038, 11, 10 (Reservations), 25 §14/§30, RF049-060; `stay-rules.js`.
- Escopo: `reservation-service.js` + `reservationRepository`; `POST /api/reservations` (CUSTOMER, idempotente por `holdId`/chave de idempotência): dentro de `transactionRunner.run` revalida disponibilidade (BE-22), valida regras da estadia (`stay-rules`: mesmo dia quando permitido, ≤ 1 ano), calcula preço (BE-40), grava `RESERVATION` (`PENDING_PAYMENT`), `RESERVATION_ROOM(s)` com snapshot e `RESERVATION_ROOM_NIGHT`; vários quartos de tipos diferentes; quarto físico escolhido pelo cliente; publica `RESERVATION_CREATED` por publisher injetável.
- Teste: sucesso multi-quarto; quarto indisponível ⇒ 409 `ROOM_NOT_AVAILABLE` e nada gravado (rollback); hold expirado; mesma chave devolve a mesma reserva; totais = soma dos itens.
- Aceite: nenhuma reserva confirmada em conflito.

#### BE-43 · Guests validation and linking (RF052-053) (#91)
- Milestone: F5 · Labels: area:backend, priority:must, type:feat · Depende: DB-07
- Ler: doc 07 (hóspedes), RF052-053; `src/utils/cpf.js`.
- Escopo: `src/schemas/guest.js` + `guest-rules.js`: dados de **todos** os hóspedes, CPF válido e normalizado (obrigatoriedade conforme RN), cada hóspede ligado a um `RESERVATION_ROOM`, respeitando a capacidade do quarto e adultos/crianças; usado por BE-42 e BE-46.
- Teste: capacidade excedida, CPF inválido/ausente, hóspede sem quarto.
- Aceite: mensagens em português por campo.

#### BE-44 · Reservation read endpoints (customer, manager) (#92)
- Milestone: F5 · Labels: area:backend, priority:must, type:feat · Depende: BE-42
- Ler: doc 10, RF099-101, 15 (autorização).
- Escopo: `GET /api/reservations/:id` (dono, gestor do hotel ou ADMIN; outro 404), `GET /api/reservations` (cliente: as suas; paginada, filtro por status) e `GET /api/hotels/:id/reservations` (gestor dono/adicional; filtros unidade/período/status).
- Teste: matriz de autorização (cliente alheio ⇒ 404), filtros, paginação.
- Aceite: nenhum dado de outro hóspede vaza.

#### BE-45 · Cancel a room of a reservation (RF061, RF064-066) (#93)
- Milestone: F5 · Labels: area:backend, priority:must, type:feat · Depende: BE-42
- Ler: doc 07 RN039-045/077-078/112, 12, 25 §16-17; `cancellation-rules.js`.
- Escopo: `POST /api/reservations/:id/cancel-room` (`reservationRoomId`, motivo): cliente — reembolso total até 24 h antes do check-in, nenhum depois; gestor — só até 48 h antes; cancela **por quarto** (parcial) e a reserva vira `CANCELLED` quando o último quarto sai; libera disponibilidade (invalida cache); sem crédito interno; calcula o valor a reembolsar e publica `REFUND_REQUESTED` (executado em BE-93; antes disso fica registrado como pendente); idempotente.
- Teste: 23 h 59/24 h 00/24 h 01, 47 h/49 h gestor, cancelamento parcial e total, segundo cancelamento do mesmo quarto, quarto de outra reserva.
- Aceite: usa `cancellation-rules.js` sem duplicar a regra.

#### BE-46 · Change a reservation (RF062-063) (#94)
- Milestone: F5 · Labels: area:backend, priority:should, type:feat · Depende: BE-45, BE-43
- Ler: doc 07 RN112 e regras de alteração, 12 ("alterar reembolsa o pagamento anterior e cria um novo"), RF062-063.
- Escopo: `PATCH /api/reservations/:id` até 24 h antes do check-in: trocar datas/quartos/hóspedes; revalida disponibilidade na transação; recalcula preço; conforme doc 12 cria novo pagamento e dispara reembolso do anterior; mudar só hóspedes não mexe em preço.
- Teste: mudança conflitante ⇒ 409, depois de 24 h ⇒ 409 `CHANGE_NOT_ALLOWED`, só hóspedes, preço novo.
- Aceite: histórico da reserva preservado (RNF019).

#### BE-47 · OverbookingService (RF067-070) (#95)
- Milestone: F5 · Labels: area:backend, priority:should, type:feat · Depende: BE-42
- Ler: doc 07 RN046-051, 19 (DT006), 25 §7.
- Escopo: `overbooking-service.js`: limite comercial 0–10% por unidade (campo da unidade + `MAX_OVERBOOKING_PERCENT`), **nunca** divide quarto físico (DT006); bloqueia novas reservas ao atingir o limite; alerta admin (evento `OVERBOOKING_LIMIT_REACHED`); chamado dentro da transação de BE-42.
- Teste: 0%, 10%, limite exato, limite+1, alerta emitido uma vez.
- Aceite: invariante DT006 coberta por teste.

#### BE-48 · Reservation status lifecycle (no-show, completed) (#96)
- Milestone: F5 · Labels: area:backend, priority:should, type:feat · Depende: BE-42
- Ler: doc 07 (status de reserva), 25 §14, 14 (no-show).
- Escopo: máquina de estados pura em `src/modules/reservations/reservation-status-machine.js` (modelo: `hotel-status-machine.js`) com transições `PENDING_PAYMENT → CONFIRMED → COMPLETED/NO_SHOW`, `→ CANCELLED/EXPIRED` (nomes finais conforme §14); endpoints do gestor para no-show e conclusão (nomes conforme doc 10; se ausentes, registrar); atualização condicional (`updateMany` no status esperado).
- Teste: tabela completa de transições válidas/inválidas.
- Aceite: transição inválida ⇒ 409.

## BE-F · Gestor e Admin (F6)

#### BE-50 · Manager dashboard API (RF099, RF101) (#97)
- Milestone: F6 · Labels: area:backend, priority:should, type:feat · Depende: BE-44
- Ler: doc 14, RF099/101/105.
- Escopo: `GET /api/manager/dashboard?hotelId&unitId&from&to&roomTypeId` com contadores (reservas, check-ins do dia, ocupação, pendências) por repositório agregador; cache curto Redis.
- Teste: service com fixtures (filtros isolados/combinados), autorização (só hotéis do gestor).
- Aceite: não mistura hotéis de outros gestores.

#### BE-51 · Manager reservation actions (#98)
- Milestone: F6 · Labels: area:backend, priority:should, type:feat · Depende: BE-45, BE-48
- Ler: doc 07 RN065, doc 14.
- Escopo: expor ao gestor do hotel (dono/adicional) cancelar até 48 h, marcar no-show/concluída, com autorização e eventos; usado por FE-62; sem duplicar BE-45/BE-48.
- Teste: autorização (gestor adicional vs. alheio), limite de 48 h.
- Aceite: alinhado a BE-45/BE-48.

#### BE-52 · Admin dashboard API (RF100, RF106) (#99)
- Milestone: F6 · Labels: area:backend, priority:should, type:feat · Depende: BE-44
- Ler: doc 14, doc 10 (`GET /api/admin/dashboard`), RF100/106.
- Escopo: novos usuários, gestores, hotéis em análise, denúncias abertas, bloqueios; `requireRole([ADMIN])`.
- Teste: service + rota (403 para MANAGER/CUSTOMER).
- Aceite: contrato documentado no doc 10.

#### BE-53 · Admin: list users and managers, deactivate a user (#100)
- Milestone: F6 · Labels: area:backend, priority:should, type:feat · Depende: BE-03
- Ler: doc 14, 07 RN116-118, 25 §3, 15.
- Escopo: `GET /api/admin/users?role&q`, `POST /api/admin/users/:id/deactivate|reactivate` com motivo obrigatório + `AUDIT_LOG` na mesma transação (`normalizeAuditReason`); os guards já recarregam o usuário do MySQL, então a sessão do desativado deixa de valer; admin não desativa a si mesmo.
- Teste: motivo ausente, auto-desativação, auditoria gravada/rollback.
- Aceite: ação auditada e reversível.

#### BE-54 · Admin modifies a reservation (RF107) (#101)
- Milestone: F6 · Labels: area:backend, priority:could, type:feat · Depende: BE-46, DB-20
- Ler: doc 14, RF107/108, RN107-108.
- Escopo: `PATCH /api/admin/reservations/:id` (RF107 não está em nenhuma fase do doc 17: **confirmar o escopo permitido** antes de implementar); motivo obrigatório; mesma transação com `AUDIT_LOG`; reutiliza BE-46.
- Teste: sem motivo ⇒ 400, auditoria atômica.
- Aceite: ação auditada com antes/depois.

#### BE-55 · Audit log query API (#102)
- Milestone: F6 · Labels: area:backend, priority:should, type:feat · Depende: BE-03
- Ler: doc 14, 15 (audit), 25 §25; `audit-log-repository.js` (hoje só `create`).
- Escopo: `GET /api/admin/audit-logs?actor&action&entity&from&to` (ADMIN), paginada; o repositório ganha **só leitura** (`list`) — `tests/architecture/audit-log-append-only.test.js` continua passando.
- Teste: filtros, paginação, teste de arquitetura intacto.
- Aceite: nenhuma escrita além de `create`.

#### BE-56 · Admin review reports (moderation) (#103)
- Milestone: F6 · Labels: area:backend, priority:should, type:feat · Depende: BE-64
- Ler: doc 14, doc 10 (`GET /api/admin/review-reports`), 07 RN079-087.
- Escopo: listar denúncias e resolvê-las (manter/ocultar avaliação) com motivo e auditoria.
- Teste: service + rota.
- Aceite: avaliação oculta some dos endpoints públicos.

## BE-G · Avaliações e favoritos (F7)

#### BE-60 · Create a review (RF071-073, RF078) (#104)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: DB-10, BE-48
- Ler: doc 07 RN052-057, 10 (`POST /api/reviews`).
- Escopo: só quem concluiu a estadia (reserva `COMPLETED`), uma por reserva, nota 1–5 + 5 critérios, comentário; **não editável** depois; recalcula a nota média do hotel.
- Teste: sem estadia concluída ⇒ 403/409, duplicada, nota fora de faixa, média atualizada.
- Aceite: original imutável.

#### BE-61 · Review media (RF074, RF112-116) (#105)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: BE-60, BE-10, DB-11
- Ler: doc 22.
- Escopo: anexar até 4 mídias por avaliação (fotos JPG; vídeo ≤ 10 s) validadas no servidor e no provedor.
- Teste: 5ª mídia, vídeo > 10 s, formato inválido.
- Aceite: limites do doc 22.

#### BE-62 · Manager public reply (RF075) (#106)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: BE-60
- Ler: doc 10 (`/replies`), RN.
- Escopo: `POST /api/reviews/:id/replies` (gestor do hotel; **só texto**; uma resposta pública).
- Teste: gestor alheio ⇒ 404, mídia rejeitada, resposta duplicada.
- Aceite: dispara `REVIEW_REPLIED` (publisher).

#### BE-63 · Author comment on own review (RF077) (#107)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: BE-61
- Ler: doc 10 (`/comments`), 22.
- Escopo: `POST /api/reviews/:id/comments` (autor; até 4 mídias; original intacto).
- Teste: não autor ⇒ 403, limite de mídia.
- Aceite: comentário aparece sem alterar a avaliação.

#### BE-64 · Report a review (RF076) (#108)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: BE-60
- Ler: doc 10 (`/report`), 07.
- Escopo: `POST /api/reviews/:id/report` (gestor do hotel; motivo; uma denúncia por avaliação/gestor).
- Teste: duplicada, gestor alheio.
- Aceite: aparece em BE-56.

#### BE-65 · Favorite hotel lists (RF079, RF081) (#109)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: DB-12
- Ler: doc 10 (favorite-hotel-lists), 07 RN058-059.
- Escopo: `GET/POST /api/favorite-hotel-lists`, `POST /api/favorite-hotel-lists/:id/items`, `DELETE .../items/:itemId`; listas do próprio usuário; só hotéis `PUBLISHED`.
- Teste: lista alheia ⇒ 404, item duplicado, nome repetido.
- Aceite: usado na relevância (BE-35).

#### BE-66 · Favorite room lists (RF080-081) (#110)
- Milestone: F7 · Labels: area:backend, priority:should, type:feat · Depende: BE-65
- Ler: doc 10 (favorite-room-lists).
- Escopo: as mesmas 4 rotas para quartos (listas separadas das de hotel).
- Teste: espelha BE-65.
- Aceite: listas de hotel e de quarto não se misturam.

## BE-H · Analytics (F8)

#### BE-70 · Manager analytics (RF102-105) (#111)
- Milestone: F8 · Labels: area:backend, priority:should, type:feat · Depende: BE-48, DB-17
- Ler: doc 14, 12 (comissão), RF102-105.
- Escopo: `analytics-service.js`: receita bruta, comissão (10%), valor líquido, nº de reservas, ticket médio, ocupação, cancelamentos, no-show, quartos mais reservados, avaliações, overbooking; filtros hotel/unidade/período/tipo; `GET /api/manager/analytics`.
- Teste: fixtures com valores conhecidos (soma dos itens, arredondamento a 2 casas), filtros.
- Aceite: números batem com o doc 12.

#### BE-71 · Admin global analytics (#112)
- Milestone: F8 · Labels: area:backend, priority:should, type:feat · Depende: BE-70
- Ler: doc 14, RF100.
- Escopo: `GET /api/admin/analytics` (ADMIN), mesmas métricas globais + por hotel.
- Teste: autorização, agregação.
- Aceite: reutiliza o serviço de BE-70.

#### BE-72 · Daily metric aggregation job (#113)
- Milestone: F8 · Labels: area:backend, priority:could, type:feat · Depende: BE-81, DB-17
- Ler: doc 24 (`analytics.aggregate`), 25 §24.
- Escopo: worker `analytics.aggregate` que consolida `DAILY_METRIC` (upsert idempotente) e reconstrói contadores Redis a partir do MySQL.
- Teste: rodar duas vezes não duplica; reconstrução de contadores.
- Aceite: job idempotente (RNF032).

## BE-I · Notificações, filas e e-mail (F9)

#### BE-80 · RabbitMQ infrastructure (publisher, topology) (#114)
- Milestone: F9 · Labels: area:backend, priority:should, type:feat · Depende: DB-15
- Ler: doc 24, 04 (topologia), 02 (amqplib), RF128-130.
- Escopo: serviço `rabbitmq` no `docker-compose.yml` (+ healthcheck); dependência `amqplib`; `src/lib/rabbitmq.js` (conexão lazy, como `redis.js`); `src/modules/jobs/topology.js` declara a exchange `app.events` e, para cada fila (`email.send`, `notifications.dispatch`, `refund.process`, `reservation.expiration`, `checkin.reminder`, `analytics.aggregate`, `media.cleanup`), `X`, `X.retry` (TTL 30 min, DLX de volta a `X`) e `X.dlq`; `job-publisher.js` com envelope `{jobId,type,payload,attempt,correlationId,createdAt}` validado por Zod; `RABBITMQ_URL` em `.env.example`.
- Teste: topologia (nomes/args das filas) com canal fake; publisher valida o envelope.
- Aceite: `npm run db:up` sobe o broker; topologia idempotente.

#### BE-81 · Worker runtime with retry (3 attempts) and DLQ (#115)
- Milestone: F9 · Labels: area:backend, priority:should, type:feat · Depende: BE-80
- Ler: doc 24, RNF032/033.
- Escopo: `src/workers/` com runner genérico (`npm run worker`): consome a fila, valida o payload, grava `JOB_EXECUTION`, em erro transitório reenfileira em `X.retry` (30 min), na 3ª tentativa total vai a `X.dlq`; erro permanente vai direto a estado de erro; handlers recebem dependências injetadas; encerramento gracioso.
- Teste: handler fake que falha 1×/3×/permanente ⇒ transições e `JOB_EXECUTION` corretos; payload inválido rejeitado.
- Aceite: nenhum payload sem validação é processado.

#### BE-82 · In-app NotificationService and endpoints (RF095, RF098) (#116)
- Milestone: F9 · Labels: area:backend, priority:should, type:feat · Depende: DB-14
- Ler: doc 13, 10, 25 §21.
- Escopo: `InAppNotificationService`; `GET /api/notifications` (paginada, filtro não lidas), `POST /api/notifications/:id/read`, `POST /api/notifications/read-all`; só as do próprio usuário.
- Teste: service + rotas (notificação alheia ⇒ 404).
- Aceite: contagem de não lidas disponível.

#### BE-83 · EmailService (Nodemailer) and 13 templates (RF096, RF131) (#117)
- Milestone: F9 · Labels: area:backend, priority:should, type:feat · Depende: BE-81, DB-14
- Ler: doc 24 (e-mail, templates), 13, RF096/131.
- Escopo: dependência `nodemailer`; `email-service.js` (transporte injetado, só o worker o usa) e `src/modules/notifications/templates/*` HTML (CSS inline) + texto para: boas‑vindas, recuperação de senha, reserva criada, pagamento confirmado/recusado, reserva confirmada, alteração, cancelamento, reembolso, lembrete 48 h, resposta em avaliação, hotel aprovado/bloqueado, alerta administrativo; `SMTP_*`/`EMAIL_FROM` em `.env.example`; grava `EMAIL_DELIVERY`; liga BE-02.
- Teste: renderização de cada template (assunto, HTML e texto, escape de HTML nos dados), worker com transporte fake.
- Aceite: HTML e texto para todos.

#### BE-84 · Real publisher for hotel events and notification dispatch (RF098) (#118)
- Milestone: F9 · Labels: area:backend, priority:should, type:feat · Depende: BE-82, BE-83
- Ler: doc 13 (eventos do hotel), `src/modules/hotels/hotel-events.js` (no-op).
- Escopo: implementar o publisher: `HOTEL_SUBMITTED/APPROVED/CHANGES_REQUESTED/BLOCKED/UNBLOCKED` ⇒ fila `notifications.dispatch` + e-mail; falha do publisher **nunca** desfaz a ação (apenas log).
- Teste: cada evento gera notificação para o destinatário correto; publisher que lança não propaga.
- Aceite: `hotelEvents` deixa de ser no-op.

#### BE-85 · Reservation expiration worker (#119)
- Milestone: F9 · Labels: area:backend, priority:must, type:feat · Depende: BE-81, BE-42
- Ler: doc 24 (`reservation.expiration`), 11.
- Escopo: cancela `PENDING_PAYMENT` com `holdExpiresAt` vencido, libera disponibilidade e invalida cache; idempotente; a expiração do hold no Redis continua por TTL.
- Teste: expirada ⇒ `EXPIRED`; já paga/confirmada não é tocada; reexecução sem efeito.
- Aceite: corrida pagamento×expiração resolvida por update condicional.

#### BE-86 · 48 h check-in reminder (RF097) (#120)
- Milestone: F9 · Labels: area:backend, priority:could, type:feat · Depende: BE-81, BE-83
- Ler: doc 24 (`checkin.reminder`).
- Escopo: varredura/agenda que enfileira o lembrete 48 h antes; idempotente por reserva.
- Teste: janela de 48 h, não duplica, reserva cancelada não notifica.
- Aceite: um lembrete por reserva.

#### BE-87 · Reservation and review domain events to notifications (#121)
- Milestone: F9 · Labels: area:backend, priority:should, type:feat · Depende: BE-84
- Ler: doc 13 (gatilhos de cliente/gestor/admin).
- Escopo: ligar os publishers de BE-42/45/46/47/62 (reserva criada, cancelada, alterada, alerta de overbooking, resposta de avaliação) às notificações; pagamentos entram em BE-91/93.
- Teste: cada evento ⇒ destinatários e tipo corretos.
- Aceite: tabela evento→notificação documentada no doc 13 se divergir.

#### BE-88 · Media cleanup worker (#122)
- Milestone: F9 · Labels: area:backend, priority:could, type:feat · Depende: BE-81, BE-10
- Ler: doc 24 (`media.cleanup`), 22.
- Escopo: remove uploads órfãos do Cloudinary (assinados mas nunca registrados em tabela de imagem) após um prazo.
- Teste: órfão removido, referenciado preservado, gateway fake.
- Aceite: idempotente.

#### BE-89 · DLQ inspection API for admins (#123)
- Milestone: F9 · Labels: area:backend, priority:could, type:feat · Depende: BE-81
- Ler: doc 24 (DLQ só admin/operações), 18 (jobs falhos).
- Escopo: `GET /api/admin/jobs?status=failed` (de `JOB_EXECUTION`) e `POST /api/admin/jobs/:id/requeue` com motivo + auditoria.
- Teste: 403 não-admin, requeue gera novo `attempt`, auditoria.
- Aceite: DLQ invisível a não-admin.

## BE-J · Pagamentos (F10)

#### BE-90 · Stripe setup and PaymentService.createIntent (RF087-090) (#124)
- Milestone: F10 · Labels: area:backend, priority:must, type:feat · Depende: DB-08, BE-42
- Ler: doc 12, 15 (Stripe), 10 (`/api/payments/create-intent`), RF087-091, DT011.
- Escopo: dependência `stripe` (modo teste), `stripe-gateway.js` injetado; `POST /api/payments/create-intent` (dono da reserva `PENDING_PAYMENT` dentro do hold): valor **calculado no servidor** a partir da reserva (nunca do cliente), crédito/débito/PIX, parcelas até 12× sem juros só se bruto > R$ 1.500 (RF091), chave de idempotência por reserva; `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` só em env (nunca em log).
- Teste: valor vindo do servidor, parcelas fora da regra ⇒ 400, hold expirado ⇒ 409, gateway fake.
- Aceite: pagamento nunca confirmado pelo front.

#### BE-91 · Stripe webhook (signature + idempotency) and reservation confirmation (#125)
- Milestone: F10 · Labels: area:backend, priority:must, type:feat · Depende: BE-90
- Ler: doc 12, 15, RF094, RNF015/016.
- Escopo: `POST /api/payments/webhook` (corpo bruto, valida assinatura; evento já processado ⇒ 200 sem efeito via unique `stripeEventId`); `payment_intent.succeeded` ⇒ transação: pagamento pago, reserva `CONFIRMED` (se o hold ainda vale; senão reembolso automático), notificações; `payment_failed` ⇒ pagamento recusado **sem reiniciar** o hold.
- Teste: assinatura inválida ⇒ 400, evento duplicado, sucesso após expiração, falha mantém o prazo, ordem invertida de eventos.
- Aceite: processamento exatamente uma vez.

#### BE-92 · Payment methods, installments and fee rules (#126)
- Milestone: F10 · Labels: area:backend, priority:should, type:feat · Depende: BE-90
- Ler: doc 12, 07 RN060-065, RF088-091.
- Escopo: regras de método/parcelas/comissão centralizadas em `payment-rules.js` (puro); PIX com expiração coerente com o hold.
- Teste: tabela de casos (limite R$ 1.500,00 e 1.500,01; parcelas 1–12).
- Aceite: nenhuma regra duplicada fora do módulo.

#### BE-93 · RefundService and `refund.process` worker (RF092) (#127)
- Milestone: F10 · Labels: area:backend, priority:must, type:feat · Depende: BE-91, BE-81, DB-09
- Ler: doc 12, 24, 07 RN060-065, 10 (`POST /api/refunds`).
- Escopo: `refund-service.js` (idempotente por `REFUND`); o worker chama o Stripe, falha ⇒ retry/DLQ, status de falha visível ao admin; conecta o `REFUND_REQUESTED` de BE-45/46.
- Teste: reembolso total, falha transitória ⇒ retry, duplicado não reembolsa 2×.
- Aceite: valor reembolsado = valor calculado em BE-45.

#### BE-94 · Partial refund per room (RF093) (#128)
- Milestone: F10 · Labels: area:backend, priority:must, type:feat · Depende: BE-93
- Ler: doc 12, RF093.
- Escopo: reembolso por `RESERVATION_ROOM` com soma dos reembolsos ≤ pago; arredondamento para baixo.
- Teste: parciais sucessivos, soma acima do pago ⇒ 409.
- Aceite: invariante financeira testada.

## BE-K · Promoções (F11)

#### BE-100 · Promotion CRUD for managers (RF117-119, RF122) (#129)
- Milestone: F11 · Labels: area:backend, priority:could, type:feat · Depende: DB-13
- Ler: doc 23 (Promotions), 10 (`/api/manager/promotions`), RF117-119/122.
- Escopo: `GET/POST /api/manager/promotions`, `PATCH /:id`, `POST /:id/activate|deactivate`; alvo hotel/unidade/tipo/quarto de hotéis do gestor; percentual 1–70% ou fixo ≥ R$ 1,00; período de validade e de estadia; agendamento.
- Teste: limites, alvo de hotel alheio ⇒ 404, datas.
- Aceite: ativar/desativar auditável.

#### BE-101 · Apply the best promotion in PricingService (RF120-121, RF123) (#130)
- Milestone: F11 · Labels: area:backend, priority:could, type:feat · Depende: BE-100, BE-40
- Ler: doc 23, 12, RN091-098/111/115.
- Escopo: no ponto de extensão de BE-40, escolher **uma** promoção (maior desconto válido; sem acumular), desconto antes da comissão e da taxa de 10%; snapshot do desconto por noite; o resumo mostra o desconto separado.
- Teste: duas promoções (vence a melhor), nenhuma válida, fora da estadia, empate determinístico, arredondamento.
- Aceite: totais continuam soma dos itens.

#### BE-102 · Offers on home and search (RF085) (#131)
- Milestone: F11 · Labels: area:backend, priority:could, type:feat · Depende: BE-101, BE-35
- Ler: doc 23, RF085.
- Escopo: `GET /api/home` passa a devolver ofertas ativas; a busca exibe preço com desconto e riscado.
- Teste: oferta expirada some, preço com desconto correto.
- Aceite: coerente com o preço do checkout.
