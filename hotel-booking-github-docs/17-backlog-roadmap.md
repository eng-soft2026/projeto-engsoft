# 17 — Backlog e Fases de Desenvolvimento

## Fase 1 — Fundação

- setup Next.js;
- Tailwind;
- Prisma;
- MySQL;
- Redis;
- Auth.js;
- estrutura modular;
- lint/format;
- usuários e papéis.

## Fase 2 — Hotel e catálogo

- hotel;
- aprovação administrativa;
- unidades;
- endereço;
- imagens com Cloudinary;
- políticas;
- regras de aceitação;
- gestores adicionais do hotel;
- comodidades;
- tipos de acomodação (por hotel);
- camas;
- quartos.

## Fase 3 — Pesquisa

- busca;
- filtros;
- ordenações;
- mapa com Leaflet/OpenStreetMap;
- geocodificação e geolocalização;
- métricas de impressão/clique e relevância básica;
- página do hotel/unidade/quarto.

## Fase 4 — Disponibilidade

- bloqueios de unidade;
- bloqueios de quarto;
- calendário;
- regras de conflito;
- preços por período;
- cache.

## Fase 5 — Reserva

- hóspedes;
- múltiplos quartos;
- hold de 15 min;
- criação de reserva;
- alteração;
- cancelamento parcial;
- overbooking;
- concorrência.

## Fase 6 — Gestor e Admin

- dashboard gestor;
- aprovação;
- bloqueios;
- denúncias;
- gestão de reservas;
- auditoria.

## Fase 7 — Avaliações e favoritos

- avaliações;
- critérios;
- fotos e vídeos curtos de avaliação;
- respostas;
- denúncias;
- listas de favoritos.

## Fase 8 — Analytics

- faturamento;
- comissão;
- líquido;
- ocupação;
- ticket médio;
- no-show;
- overbooking;
- filtros.

## Fase 9 — Notificações

- central in-app;
- e-mail com Nodemailer;
- RabbitMQ e workers;
- lembrete 48h;
- eventos de sistema.

## Fase 10 — Pagamentos

- Stripe test mode;
- crédito;
- débito/PIX conforme fluxo adotado;
- parcelamento;
- webhooks;
- idempotência;
- reembolsos.

## Priorização MoSCoW

### Must Have

- autenticação;
- hotéis;
- unidades;
- quartos;
- pesquisa;
- disponibilidade;
- reserva;
- admin básico;
- banco;
- regras críticas.

### Should Have

- dashboard;
- analytics;
- overbooking;
- avaliações;
- favoritos;
- notificações.

### Could Have

- promoções;
- algoritmo sofisticado de relevância além da fórmula inicial;
- recursos extras de experiência.

### Won't Have inicialmente

- IA;
- operação internacional;
- fidelidade;
- voos;
- passeios.


## Fase 11 — Promoções e refinamentos

- promoções percentuais e fixas;
- períodos de validade;
- regra de melhor desconto;
- snapshots de desconto;
- ranking de relevância;
- destinos populares por check-in;
- refinamentos administrativos.
