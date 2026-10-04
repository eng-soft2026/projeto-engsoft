# 19 — Decisões Técnicas

## DT001 — Next.js full-stack

O projeto utilizará Next.js tanto para interface quanto para endpoints e lógica de servidor.

## DT002 — JavaScript

Não utilizar TypeScript inicialmente.

## DT003 — Prisma + MySQL

Prisma será a camada de acesso principal ao banco.

## DT004 — Redis como apoio

Redis não substituirá o MySQL.

## DT005 — Quarto físico escolhido pelo cliente

O cliente sempre seleciona um quarto real e identificável.

## DT006 — Overbooking sem duplicação física

Mesmo com overbooking configurado, duas reservas não podem compartilhar o mesmo quarto no mesmo período.

O percentual funciona como limite operacional/comercial da unidade e indicador de risco, sem violar a unicidade do quarto físico.

## DT007 — Hold de 15 minutos

Hold será controlado com Redis e revalidado no backend.

## DT008 — Alteração gera novo pagamento

Qualquer alteração de reserva deve estornar o pagamento anterior e abrir novo fluxo de pagamento.

## DT009 — Reserva com múltiplos quartos

A reserva principal terá itens de quarto independentes para suportar cancelamento parcial.

## DT010 — Histórico preservado

Dados históricos relevantes não serão apagados fisicamente quando isso quebrar rastreabilidade.

## DT011 — Pagamentos por último

Módulo Stripe será implementado na fase final, com abstrações que permitam simulação antes da integração.

## DT012 — Sem comentários inline

O projeto dependerá de nomes claros e organização estrutural para legibilidade.

## DT013 — 4 espaços

Indentação obrigatória em todo o código.


## DT014 — Cloudinary para mídia

Arquivos serão armazenados no Cloudinary; MySQL armazenará apenas referências e metadados.

## DT015 — Leaflet + OpenStreetMap

Mapas utilizarão Leaflet/React Leaflet e dados cartográficos do OpenStreetMap.

## DT016 — Nominatim somente para geocodificação controlada

Chamadas serão server-side, cacheadas e executadas apenas quando endereço for criado/alterado. Não implementar autocomplete diretamente no serviço público.

## DT017 — Nodemailer + SMTP

E-mail será enviado com Nodemailer por SMTP configurável.

## DT018 — RabbitMQ

RabbitMQ será a fila principal. Falhas transitórias terão retry em 30 minutos, com até 3 tentativas e DLQ.

## DT019 — Promoções não cumulativas

Quando várias promoções forem válidas, usar apenas a que produzir o menor valor final de hospedagem.

## DT020 — Arredondamento financeiro para baixo

Todos os valores monetários derivados serão truncados/arredondados para baixo em duas casas decimais usando tipo decimal apropriado.

## DT021 — Relevância simples e explicável

A primeira versão do ranking usará fórmula determinística baseada em avaliação, hospedagens concluídas, CTR e favoritos, evitando modelos de ML.

## DT022 — Auditoria append-only

Logs de auditoria não poderão ser alterados ou apagados pela aplicação.

## DT023 — Tipo de acomodação pertence ao hotel

`ROOM_TYPE` pertence ao hotel e é reutilizado por quartos de qualquer unidade desse hotel. O quarto físico pertence à unidade.

## DT024 — Favoritos separados por tipo

Listas de hotéis e listas de quartos são entidades distintas (`FAVORITE_HOTEL_LIST` e `FAVORITE_ROOM_LIST`).

## DT025 — Cálculo financeiro por item

Preço, desconto, comissão, taxa de serviço e valor reembolsável são calculados e gravados por `RESERVATION_ROOM`. Os totais da reserva são a soma dos itens.

## DT026 — Tentativas de pagamento como registros

Cada tentativa de pagamento é um registro de `PAYMENT`. Eventos de webhook do Stripe são registrados em `STRIPE_WEBHOOK_EVENT` para idempotência.

## DT027 — Padrão de branches

Branches de trabalho usam `<type>/<ticket-id>-<short-description>`, em que `<ticket-id>` é o número da issue.

## DT028 — Métricas de pesquisa no MySQL

Impressões e cliques são persistidos em `SEARCH_IMPRESSION` e `SEARCH_CLICK`. Redis guarda apenas cache de agregados.
