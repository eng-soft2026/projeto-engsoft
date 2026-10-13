# Plano 3 — Front-end (Next.js App Router, Tailwind 4, React 19)

Regras comuns: Server Components por padrão; `"use client"` só para estado local, eventos, formulários interativos, mapa e gráficos; páginas protegidas usam `requirePageAuth()`/`requirePageRole([...])` (redirect `/login` ou `notFound()`), **nunca** autorizar pelo papel do JWT; mobile-first e responsivo (RNF001/002); componentes pequenos e reutilizáveis (RNF021) em `src/components/`, lógica de tela em `src/modules/<domínio>/components` quando específica; textos de UI em português, identificadores em inglês; erros da API exibidos por `error.message` (envelope do doc 10); sem segredos no client; acessibilidade básica (labels, foco, `aria-*`, contraste). Mapa de rotas (definido em FE-05 e registrado no doc 18): `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile`, `/search`, `/hotels/[id]`, `/units/[id]`, `/rooms/[id]`, `/checkout`, `/reservations[/id]`, `/favorites`, `/notifications`, `/manager/**`, `/admin/**`. Teste padrão: componentes client com Testing Library em `tests/components/**` (setup em QA-01) e funções puras (formatadores, mapeadores de erro, builders de query string) em `tests/utils/**`/`tests/modules/**`; telas inteiras cobertas por e2e (QA-07/QA-08). Todas as tarefas FE dependem de QA-01 para testes de componente.

## FE-A · Fundação (F0)

#### FE-01 · Design tokens, base components and app shell (#132)
- Milestone: F0 · Labels: area:frontend, priority:must, type:feat · Depende: QA-01
- Ler: doc 18, 01 (visão), 03 (padrões); `src/app/layout.jsx`, `src/app/globals.css`.
- Escopo: tokens Tailwind 4 (cores, espaçamento, raio) em `globals.css`; componentes base em `src/components/ui/`: `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `FormField` (label+erro), `Card`, `Badge`, `ConfirmDialog` (usado nas ações críticas do admin), `Spinner`, `EmptyState`, `Pagination`; `Header`/`Footer` responsivos; dependências `lucide-react` (ícones) e `sonner` (toasts). Home continua placeholder.
- Teste: um teste por componente (renderiza, `getByRole`, estados disabled/erro, foco do modal e fechamento com Esc).
- Aceite: build passa; uso dos componentes documentado em `docs/progresso.md`.

#### FE-02 · API client, error mapping and form pattern (#133)
- Milestone: F0 · Labels: area:frontend, priority:must, type:feat · Depende: FE-01
- Ler: doc 10 (envelope e códigos de erro), CLAUDE.md (Route Handler pattern), 02 (react-hook-form).
- Escopo: dependências `react-hook-form` e `@hookform/resolvers` (Zod dos mesmos schemas de `src/schemas/` quando reutilizáveis no client); `src/lib/api-client.js` (`apiFetch` lê o envelope, lança `ApiError{code,message,status}`, same-origin, sem tokens no JS); `src/hooks/use-api-form.js` (submit + erro global + erros por campo + toast); `src/lib/error-messages.js` (código→mensagem amigável). **Decidir e registrar** em `docs/progresso.md`: formulários usam Server Actions ou `fetch` para `/api` (recomendação: `fetch` para as rotas existentes, Server Actions só onde simplificar leitura).
- Teste: `apiFetch` (sucesso, erro do envelope, rede caída, 401 redireciona), `useApiForm` (erro por campo, duplo submit bloqueado).
- Aceite: nenhum formulário futuro reimplementa tratamento de erro.

#### FE-03 · Login and register screens (RF001-003) (#134)
- Milestone: F0 · Labels: area:frontend, priority:must, type:feat · Depende: FE-02, BE-01
- Ler: doc 18 (Login, Cadastro), 05 RF001-003, 15 (sessão); `src/modules/auth/*`.
- Escopo: `/login`, `/register` (nome, e‑mail, senha 8–72 bytes com letra+número, demais campos conforme `10-api-spec.md`; papel CUSTOMER/MANAGER conforme doc), logout no `Header`; `callbackUrl`; exibe 429 com tempo de espera; usuário logado é redirecionado.
- Teste: formulário (validação client, `INVALID_CREDENTIALS`, e‑mail já cadastrado, 429), redirecionamento.
- Aceite: fluxo register→login→logout funcional contra a API real (seed DB-19).

#### FE-04 · Profile and password recovery screens (RF004-005) (#135)
- Milestone: F0 · Labels: area:frontend, priority:should, type:feat · Depende: FE-03, BE-02
- Ler: doc 18 (Perfil), RF004-005, `GET/PATCH /api/users/me`.
- Escopo: `/profile` (editar dados), `/forgot-password` (mensagem genérica sempre), `/reset-password?token=`.
- Teste: formulários (token inválido/expirado, mensagem genérica, sucesso).
- Aceite: não revela se o e‑mail existe.

#### FE-05 · Role-aware navigation, route map and protected layouts (#136)
- Milestone: F0 · Labels: area:frontend, priority:must, type:feat · Depende: FE-03
- Ler: doc 18, 15 (autorização de páginas), `src/modules/auth/guards.js`.
- Escopo: layouts `src/app/(customer)/`, `(manager)/manager/`, `(admin)/admin/` com `requirePageRole`; menu por papel (itens do doc 18); `not-found.jsx` e `error.jsx` sem expor stack; registrar o mapa de rotas no doc 18.
- Teste: função pura `getNavigationItems(role)`; layout (papel errado ⇒ `notFound`, sem sessão ⇒ redirect) com guards injetados.
- Aceite: MANAGER não vê rotas de ADMIN nem acessa por URL.

## FE-B · Painel do gestor — hotel e catálogo (F2)

#### FE-10 · My hotels list and create hotel (#137)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-05, BE-03
- Ler: doc 18 (Meus hotéis, Criar hotel), RF007-009; `GET/POST /api/hotels`.
- Escopo: `/manager/hotels` (lista paginada com badge de status), `/manager/hotels/new` (nome, descrição, CNPJ com máscara e validação reaproveitando `src/utils/cnpj.js` via schema compartilhado; aceita alfanumérico).
- Teste: formulário (CNPJ inválido, sucesso redireciona), lista (vazio, status).
- Aceite: hotel nasce `DRAFT`.

#### FE-11 · Edit hotel, submit for review and status feedback (#138)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-10
- Ler: doc 18 (Editar hotel), 07 RN003/105/120-123, 14 (revisão); `PATCH /api/hotels/:id`, `POST .../submit-review`.
- Escopo: `/manager/hotels/[id]` com abas (Dados, Unidades, Tipos, Quartos, Gestores, Políticas…); formulário só editável em `DRAFT` (demais status: leitura + aviso); "Enviar para análise" com confirmação; exibe a última nota de revisão do admin.
- Teste: helper puro `isHotelEditable(status)` espelhando `canEditHotel`; UI desabilita campos; confirmação de envio.
- Aceite: `UNDER_REVIEW/PUBLISHED/BLOCKED` não permitem edição estrutural.

#### FE-12 · Additional managers screen (RF136) (#139)
- Milestone: F2 · Labels: area:frontend, priority:should, type:feat · Depende: FE-11
- Ler: doc 18 (Gestores do hotel), RN110; `/api/hotels/:id/managers`.
- Escopo: lista, adicionar por e‑mail, remover; **só o dono** vê a aba (adicional não vê, RN110).
- Teste: visibilidade por `isOwner`, erros (usuário inexistente, duplicado).
- Aceite: aba ausente para gestor adicional.

#### FE-13 · Acceptance rules and policies screens (RF028-029, RF137) (#140)
- Milestone: F2 · Labels: area:frontend, priority:should, type:feat · Depende: FE-11
- Ler: doc 18, RN113/136; `/api/hotels/:id/acceptances`, `/policies`, `/api/policies/:id`.
- Escopo: editor de regras de aceitação (pets, fumo, crianças, visitas, eventos, `OTHER` com rótulo; um por tipo padrão; rótulos únicos ignorando caixa) com `PUT` do conjunto inteiro; políticas próprias (criar/editar/desativar — não excluir).
- Teste: validação RN113 no client, envio do conjunto completo.
- Aceite: erros do servidor por campo.

#### FE-14 · Units CRUD with address and phones (RF012-013) (#141)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-11
- Ler: doc 18 (Unidades, Criar unidade), CLAUDE.md (Units); `/api/hotels/:id/units`, `/api/units/:id`.
- Escopo: lista e formulário (endereço com CEP, telefones BR com máscara, horários `HH:mm`, overbooking inteiro 0–10); o formulário **não envia** latitude/longitude; só `DRAFT`.
- Teste: máscaras/normalização (CEP, telefone), faixa de overbooking, horários.
- Aceite: dados enviados no formato da API (dígitos).

#### FE-15 · Leaflet map selector/preview with manual marker correction (RF126-127) (#142)
- Milestone: F2 · Labels: area:frontend, priority:should, type:feat · Depende: FE-14, BE-21
- Ler: doc 23 (Maps), 18 (Leaflet), RF126-127; `PATCH /api/units/:id/location`.
- Escopo: dependências `leaflet` e `react-leaflet` (client component, import dinâmico `ssr: false`); preview do mapa da unidade com atribuição OSM visível (RF127); arrastar o marcador corrige lat/lng; **nenhuma** chamada ao Nominatim a partir do browser.
- Teste: atribuição presente; `onChange` do marcador chama a API com as coordenadas; desabilitado fora de `DRAFT` (mapa mockado).
- Aceite: atribuição OSM sempre exibida.

#### FE-16 · Room types screen (RF015-016) (#143)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-11
- Ler: doc 18 (Tipos de acomodação), RN007-012; `/api/hotels/:id/room-types`, `/api/room-types/:id`; `src/utils/money.js`.
- Escopo: lista/formulário (nome, capacidade, camas por tipo de `BED_CONFIGURATION`, área em m², preço padrão); dinheiro e área como string com **no máximo 2 casas** (erro, nunca arredonda); `defaultPrice` editável também em `PUBLISHED`.
- Teste: input monetário (3 casas rejeitadas, vírgula/ponto), camas dinâmicas.
- Aceite: preço enviado como string de 2 casas.

#### FE-17 · Rooms screen (RF017-022) (#144)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-14, FE-16
- Ler: doc 18 (Quartos), RN007-012, CLAUDE.md (Rooms); `/api/units/:id/rooms`, `/api/rooms/:id`.
- Escopo: lista por unidade, criar/editar (número, andar, acessibilidade, observações, status, preço próprio ou "usar do tipo"), operação diária em `PUBLISHED` (status, notas, preço, desativar), remover; o `outcome` (removido vs. desativado) é explicado ao usuário; 409 `ROOM_NUMBER_ALREADY_EXISTS` no campo.
- Teste: mensagem por `outcome`, preço `null` fecha o preço próprio, campos habilitados por status do hotel.
- Aceite: ação destrutiva pede confirmação.

#### FE-18 · Amenity picker (hotel, unit, room type, room) (RF023-027) (#145)
- Milestone: F2 · Labels: area:frontend, priority:should, type:feat · Depende: FE-14, FE-16, DB-02
- Ler: doc 18, CLAUDE.md (Amenities); `/api/amenities`, `/api/{hotels,units,room-types,rooms}/:id/amenities`.
- Escopo: componente `AmenityPicker` genérico (alvo parametrizado como `AMENITY_TARGETS`), busca, criar amenidade própria; `PUT` substitui o conjunto inteiro.
- Teste: seleção/limpeza, envio do conjunto completo, criar nova (nome global existente ⇒ erro).
- Aceite: o mesmo componente nos 4 alvos.

#### FE-19 · Image upload component and galleries (RF109-111) (#146)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: BE-11, BE-12, BE-13
- Ler: doc 22 (limites), 15 (uploads); `POST /api/media/sign-upload`, rotas de imagens.
- Escopo: `MediaUploader` que pede a assinatura e envia **direto ao Cloudinary**; valida formato/tamanho no client antes (JPG; 10 MB), progresso, reordenar, definir capa, remover; hotel máx. 10; unidade sem teto; só assinatura no client, nunca segredo.
- Teste: validação client (formato, tamanho, 11ª foto), fluxo assinatura→upload→registro (fetch mockado), capa única.
- Aceite: erro de upload não deixa item fantasma na UI.

#### FE-20 · Price periods screen (RF019, RF057) (#147)
- Milestone: F2 · Labels: area:frontend, priority:should, type:feat · Depende: FE-17, BE-14
- Ler: doc 12, 18 (Preços); `/api/rooms/:id/price-periods`, `/api/room-types/:id/price-periods`.
- Escopo: tabela de períodos por tipo ou quarto; formulário com datas e preço; `PRICE_PERIOD_OVERLAP` destacado; períodos passados somente leitura.
- Teste: validação de datas, overlap exibido, passado bloqueado.
- Aceite: preço em string de 2 casas.

## FE-C · Disponibilidade no painel (F4)

#### FE-21 · Availability calendar and blocks (RF014, RF020) (#148)
- Milestone: F4 · Labels: area:frontend, priority:must, type:feat · Depende: FE-17, BE-23
- Ler: doc 18 (Calendário de disponibilidade), 11; `/api/availability`, blocks.
- Escopo: calendário mensal por unidade/quarto com reservado/bloqueado/livre; criar e remover bloqueios com motivo; conflito com reserva ⇒ mensagem de `BLOCK_CONFLICTS_WITH_RESERVATION`; dependência `date-fns`.
- Teste: função pura `buildCalendarDays(range, occupancy)` (bordas de mês, check-out livre), formulário de bloqueio.
- Aceite: o dia de check-out aparece livre para novo check-in.

## FE-D · Painel do admin (F2/F6)

#### FE-30 · Hotels under review list (admin) (#149)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-05, BE-03
- Ler: doc 18 (Hotéis em análise), 14; `GET /api/admin/hotels?status=`.
- Escopo: `/admin/hotels` com filtro de status e paginação.
- Teste: filtro por status gera a query correta; vazio.
- Aceite: só ADMIN acessa.

#### FE-31 · Hotel detail with approve / request changes / block / unblock (admin) (#150)
- Milestone: F2 · Labels: area:frontend, priority:must, type:feat · Depende: FE-30, FE-01
- Ler: doc 18 (Hotel detalhado), 14, RN105-108, RN120-123; `/api/admin/hotels/:id/{approve,request-changes,block,unblock}`.
- Escopo: detalhe somente leitura do hotel inteiro (unidades, quartos, políticas) + ações com `ConfirmDialog` e **motivo obrigatório**; ações exibidas conforme a máquina de status (helper puro `getAvailableAdminActions(status)` espelhando `hotel-status-machine.js`); `unblock` exige `targetStatus` (`PUBLISHED` ou `DRAFT`).
- Teste: helper de ações por status, motivo vazio bloqueia envio, `INVALID_HOTEL_STATUS` exibido.
- Aceite: nenhuma ação sem motivo.

#### FE-32 · Blocked hotels screen (#151)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: FE-31
- Ler: doc 18 (Hotéis bloqueados).
- Escopo: lista filtrada de `BLOCKED` com último motivo e desbloqueio (reusa FE-31).
- Teste: render + ação.
- Aceite: reutiliza componentes de FE-31.

#### FE-33 · Audit log screen (#152)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: BE-55, FE-30
- Ler: doc 18 (Auditoria), 14.
- Escopo: `/admin/audit` com filtros (ator, ação, entidade, período), paginação; somente leitura.
- Teste: filtros → query, vazio, formatação de data.
- Aceite: nenhuma ação de escrita na tela.

#### FE-34 · Users and managers screens (admin) (#153)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: BE-53, FE-31
- Ler: doc 18 (Usuários, Gestores).
- Escopo: `/admin/users` com busca/papel e ações desativar/reativar (motivo obrigatório).
- Teste: motivo obrigatório, auto-desativação desabilitada.
- Aceite: a ação confirma e recarrega a lista.

#### FE-35 · Admin dashboard (#154)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: BE-52, FE-30
- Ler: doc 18 (Dashboard global), RF100/106.
- Escopo: cartões (novos usuários, gestores, hotéis em análise, denúncias, bloqueios) com links para as telas.
- Teste: render dos cartões, erro da API, links.
- Aceite: loading/erro tratados.

#### FE-36 · Review reports moderation screen (#155)
- Milestone: F7 · Labels: area:frontend, priority:should, type:feat · Depende: BE-56, FE-31
- Ler: doc 18 (Denúncias), 14.
- Escopo: lista de denúncias, ver a avaliação, decidir (manter/ocultar) com motivo.
- Teste: decisão exige motivo.
- Aceite: refletido na página pública.

#### FE-37 · Admin reservations, payments and refunds screens (#156)
- Milestone: F10 · Labels: area:frontend, priority:could, type:feat · Depende: BE-54, BE-93, FE-35
- Ler: doc 18 (Reservas, Pagamentos, Reembolsos), 14.
- Escopo: listas e detalhe (somente leitura + ação de BE-54 com motivo), status e falhas de reembolso.
- Teste: render por status, motivo obrigatório.
- Aceite: dinheiro em BRL sem float.

#### FE-38 · Failed jobs (DLQ) screen (#157)
- Milestone: F9 · Labels: area:frontend, priority:could, type:feat · Depende: BE-89, FE-35
- Ler: doc 18 (jobs falhos), 24.
- Escopo: lista de jobs falhos com tentativas/erro e "reenfileirar" (motivo).
- Teste: ação reenfileirar, 403 tratado.
- Aceite: invisível a não-ADMIN.

## FE-E · Pesquisa e páginas públicas (F3)

#### FE-40 · Home (RF082-086) (#158)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: FE-01, BE-35
- Ler: doc 18 (Home), RF082-086; `GET /api/home`, `GET /api/search/recent`.
- Escopo: barra de busca (destino, datas, hóspedes/quartos), destinos populares, mais bem avaliados, ofertas (vazio até F11), buscas recentes (logado); Server Component + `SearchForm` client.
- Teste: `SearchForm` (check-out ≤ check-in, máx. 1 ano), serialização dos parâmetros.
- Aceite: o submit leva a `/search` com query string válida.

#### FE-41 · Search results list (RF030-033, lista de RF047-048) (#159)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: FE-40, BE-30, BE-34
- Ler: doc 18 (Pesquisa, Resultados), 23.
- Escopo: `/search` (estado na URL), cartões de hotel (capa, nota, preço total/noite, amenidades), paginação, loading/vazio/erro; envia impressões em lote e cliques (BE-34) sem bloquear a navegação.
- Teste: builder/parser de query string (ida e volta), cartão (preço, nota), impressões enviadas uma vez por página.
- Aceite: URL compartilhável reproduz a busca.

#### FE-42 · Search filters panel (RF034-041) (#160)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: FE-41, BE-31
- Ler: RF034-041.
- Escopo: painel (drawer no mobile) com preço, nota, amenidades, acessibilidade, pets, camas, área, distância; chips de filtros ativos; "limpar".
- Teste: cada filtro atualiza a URL, limpar, drawer mobile.
- Aceite: filtros preservados ao paginar.

#### FE-43 · Sorting control (RF042-046) (#161)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: FE-41, BE-32
- Ler: RF042-046.
- Escopo: seletor (menor preço, maior preço, nota, distância, relevância); "distância" pede localização do usuário (permissão do browser) ou endereço.
- Teste: mudança de ordenação na URL, distância sem permissão ⇒ mensagem.
- Aceite: padrão = relevância.

#### FE-44 · Results map with markers and mini-card (RF047-048) (#162)
- Milestone: F3 · Labels: area:frontend, priority:should, type:feat · Depende: FE-41, FE-15
- Ler: doc 18 (Mapa), 23.
- Escopo: alternância lista/mapa; marcadores dos resultados com coordenadas; clique abre mini‑card (foto, nome, nota, preço) com link; atribuição OSM.
- Teste: marcadores só para itens com lat/lng, mini‑card ao clicar (mapa mockado).
- Aceite: item sem coordenada aparece na lista, não no mapa.

#### FE-45 · Hotel page (public) (#163)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: BE-15, FE-41
- Ler: doc 18 (Página do hotel).
- Escopo: `/hotels/[id]` (galeria, descrição, unidades, amenidades, políticas, regras de aceite, avaliações resumidas); `generateMetadata`; 404 para não publicado.
- Teste: formatação de políticas/aceites, 404, galeria acessível.
- Aceite: renderiza sem login.

#### FE-46 · Unit page (public) (#164)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: FE-45
- Ler: doc 18 (Página da unidade).
- Escopo: `/units/[id]` com endereço, mapa (preview de FE-15), telefones, horários, quartos disponíveis para as datas da busca, link para o quarto.
- Teste: horários formatados, telefones, quartos indisponíveis ocultos.
- Aceite: datas da busca preservadas na navegação.

#### FE-47 · Room page (public) (#165)
- Milestone: F3 · Labels: area:frontend, priority:must, type:feat · Depende: FE-46
- Ler: doc 18 (Página do quarto).
- Escopo: `/rooms/[id]` (fotos do tipo, camas, capacidade, área, amenidades, preço por noite com resumo, botão "Reservar" que adiciona ao carrinho de checkout; favoritar após FE-54).
- Teste: resumo de preço (noites × preço), botão desabilitado se indisponível.
- Aceite: estado "no carrinho" visível.

## FE-F · Reserva do cliente (F5/F7/F9/F10)

#### FE-48 · Checkout: rooms, summary and guests form (RF049-053) (#166)
- Milestone: F5 · Labels: area:frontend, priority:must, type:feat · Depende: FE-47, BE-42, BE-43
- Ler: doc 18 (Checkout), 07 RN013-038, 12 (resumo de preço); `POST /api/reservation-holds`, `POST /api/reservations`.
- Escopo: `/checkout` com carrinho (vários quartos, tipos diferentes), resumo de preço **vindo do servidor** (por noite, total, taxas; nada calculado só no client), formulário de hóspedes por quarto (CPF validado, capacidade), cria hold e reserva; `ROOM_NOT_AVAILABLE` volta ao carrinho com aviso.
- Teste: validação de CPF/capacidade, hóspede ligado a quarto, erro de indisponibilidade, resumo renderiza valores do servidor.
- Aceite: sem divergência entre resumo e valor cobrado.

#### FE-49 · Hold countdown (15 minutes) (#167)
- Milestone: F5 · Labels: area:frontend, priority:must, type:feat · Depende: FE-48, BE-41
- Ler: RF054-055, doc 11.
- Escopo: `HoldCountdown` baseado no `expiresAt` do servidor (relógio local só para exibir), aviso aos 2 min, expirado ⇒ bloqueia o pagamento e volta à busca; não reinicia após pagamento recusado.
- Teste: timers falsos (expira, aviso, não reinicia).
- Aceite: o servidor continua a autoridade do prazo.

#### FE-50 · Payment screen (Stripe test mode) (RF087-091) (#168)
- Milestone: F10 · Labels: area:frontend, priority:must, type:feat · Depende: FE-49, BE-90
- Ler: doc 12, 15, 18 (Pagamento).
- Escopo: dependência `@stripe/stripe-js`; Stripe Elements (crédito/débito, PIX), seletor de parcelas (até 12× só se bruto > R$ 1.500, informado pela API); chave pública via `NEXT_PUBLIC_*` (nunca a secreta); estado final só após confirmação do servidor.
- Teste: seletor de parcelas (1.500,00 vs 1.500,01), cartão recusado mantém o contador, componente com Stripe mockado.
- Aceite: dados de cartão nunca passam pelo nosso servidor.

#### FE-51 · Confirmation screen (RF060) (#169)
- Milestone: F10 · Labels: area:frontend, priority:must, type:feat · Depende: FE-50, BE-91
- Ler: doc 18 (Confirmação).
- Escopo: `/reservations/[id]/confirmation` mostra confirmada/pendente/recusada conforme o servidor; polling curto até o webhook confirmar.
- Teste: estados por status, polling com timers falsos.
- Aceite: não afirma "confirmada" antes do servidor.

#### FE-52 · My reservations list and detail (#170)
- Milestone: F5 · Labels: area:frontend, priority:must, type:feat · Depende: BE-44, FE-05
- Ler: doc 18 (Minhas reservas, Detalhe).
- Escopo: `/reservations` (abas próximas/passadas/canceladas, paginação) e `/reservations/[id]` (quartos, hóspedes, preços, status, política de cancelamento aplicável com prazo).
- Teste: agrupamento por status/data (helper puro), formatação BRL.
- Aceite: reserva alheia ⇒ 404.

#### FE-53 · Change reservation and cancel room (RF061-066) (#171)
- Milestone: F5 · Labels: area:frontend, priority:must, type:feat · Depende: FE-52, BE-45, BE-46
- Ler: doc 18 (Alterar reserva, Cancelar quarto), 07 RN039-045/112.
- Escopo: cancelar por quarto com resumo do reembolso (100% até 24 h antes, 0% depois) e confirmação; alterar datas/hóspedes até 24 h antes; mensagens de `CHANGE_NOT_ALLOWED`.
- Teste: helper `getRefundPreview(checkIn, now)` (23h59/24h00/24h01), confirmação obrigatória.
- Aceite: o usuário vê o reembolso antes de confirmar.

#### FE-54 · Favorites and lists (RF079-081) (#172)
- Milestone: F7 · Labels: area:frontend, priority:should, type:feat · Depende: BE-65, BE-66, FE-45
- Ler: doc 18 (Favoritos, Listas).
- Escopo: botão coração (hotel e quarto) com seletor de lista/criar lista; `/favorites` com abas hotéis/quartos; remover itens.
- Teste: toggle otimista com rollback em erro, lista criada.
- Aceite: deslogado ⇒ pede login.

#### FE-55 · Reviews: write, display, replies (RF071-078) (#173)
- Milestone: F7 · Labels: area:frontend, priority:should, type:feat · Depende: BE-60, BE-61, BE-62, BE-63, FE-19
- Ler: doc 18 (Avaliações), 22.
- Escopo: formulário (estrelas 1–5 + 5 critérios + comentário + até 4 mídias validadas), lista no hotel (resposta do gestor, comentário do autor, mídia), avaliação original sem botão de editar.
- Teste: validação (5ª mídia, vídeo > 10 s), estrelas acessíveis, sem edição do original.
- Aceite: só reservas concluídas exibem o formulário.

#### FE-56 · Notification center (RF095) (#174)
- Milestone: F9 · Labels: area:frontend, priority:should, type:feat · Depende: BE-82, FE-05
- Ler: doc 18 (Notificações), 13.
- Escopo: sino no `Header` com contador de não lidas, `/notifications` paginada, marcar lida/todas; polling leve (sem websocket).
- Teste: contador, marcar lida atualiza, polling com timers falsos.
- Aceite: aparece para todos os papéis.

## FE-G · Painel do gestor — operação (F6/F8/F11)

#### FE-60 · Manager dashboard (#175)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: BE-50, FE-10
- Ler: doc 18 (Dashboard), RF099/101.
- Escopo: `/manager` com filtros hotel/unidade/período/tipo e cartões (check-ins do dia, ocupação, pendências).
- Teste: filtros → query, vazio/erro.
- Aceite: dados só dos hotéis do gestor.

#### FE-61 · Manager reservations list and detail (#176)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: BE-44, FE-60
- Ler: doc 18 (Reservas).
- Escopo: `/manager/reservations` com filtros e detalhe (hóspedes, quartos, pagamento).
- Teste: filtros, detalhe.
- Aceite: paginada.

#### FE-62 · Manager reservation actions (cancel up to 48 h, no-show, complete) (#177)
- Milestone: F6 · Labels: area:frontend, priority:should, type:feat · Depende: BE-51, FE-61
- Ler: doc 07 RN065.
- Escopo: ações com confirmação e motivo; cancelar só habilitado até 48 h antes (helper puro alinhado à regra).
- Teste: habilitação por janela de 48 h, confirmação.
- Aceite: erro do servidor sobrepõe o estado local.

#### FE-63 · Manager reviews and reports screens (RF075-076) (#178)
- Milestone: F7 · Labels: area:frontend, priority:should, type:feat · Depende: BE-62, BE-64, FE-61
- Ler: doc 18 (Avaliações, Denúncias).
- Escopo: responder (só texto), denunciar com motivo, status da denúncia.
- Teste: resposta sem mídia, denúncia duplicada.
- Aceite: uma resposta por avaliação.

#### FE-64 · Manager financial screen (#179)
- Milestone: F8 · Labels: area:frontend, priority:could, type:feat · Depende: BE-70, FE-60
- Ler: doc 18 (Financeiro), 12.
- Escopo: bruto, comissão, líquido por período/hotel.
- Teste: formatação BRL, soma das linhas = total.
- Aceite: valores idênticos aos do endpoint.

#### FE-70 · Manager analytics charts (RF102-105) (#180)
- Milestone: F8 · Labels: area:frontend, priority:should, type:feat · Depende: BE-70, FE-60
- Ler: doc 18 (Analytics), 14.
- Escopo: dependência `recharts` (client); gráficos de receita, ocupação, cancelamentos, ticket médio; acessíveis (tabela alternativa).
- Teste: transformadores de dados puros (séries vazias, datas faltantes).
- Aceite: gráfico vazio tratado.

#### FE-71 · Admin analytics charts (#181)
- Milestone: F8 · Labels: area:frontend, priority:should, type:feat · Depende: BE-71, FE-70
- Ler: doc 18 (Analytics global).
- Escopo: reutiliza os componentes de FE-70 com escopo global/por hotel.
- Teste: transformadores com escopo global.
- Aceite: sem duplicar componentes.

#### FE-72 · Manager promotions screen (RF117-123) (#182)
- Milestone: F11 · Labels: area:frontend, priority:could, type:feat · Depende: BE-100, FE-60
- Ler: doc 18 (Promoções), 23.
- Escopo: lista/criar/editar/ativar/desativar; alvo (hotel/unidade/tipo/quarto), percentual 1–70% ou valor fixo ≥ R$ 1,00, períodos; o desconto aparece separado no resumo (FE-47/FE-48).
- Teste: limites, resumo com desconto separado.
- Aceite: coerente com BE-101.
