# Sistema de Reservas de Hotel — Documentação Oficial

Esta pasta contém a especificação consolidada do projeto de Engenharia de Software para uma plataforma de reservas de hotéis no Brasil.

## Navegação

1. [Visão do Produto](01-product-vision.md)
2. [Stack e Dependências](02-stack-and-dependencies.md)
3. [Padrões de Código](03-coding-standards.md)
4. [Arquitetura](04-architecture.md)
5. [Requisitos Funcionais](05-functional-requirements.md)
6. [Requisitos Não Funcionais](06-non-functional-requirements.md)
7. [Regras de Negócio](07-business-rules.md)
8. [Modelo de Domínio](08-domain-model.md)
9. [Banco de Dados e Prisma](09-database-and-prisma.md)
10. [API e Contratos](10-api-spec.md)
11. [Cache, Redis e Concorrência](11-redis-cache-concurrency.md)
12. [Pagamentos, Comissão e Reembolsos](12-payments-and-billing.md)
13. [Notificações](13-notifications.md)
14. [Admin, Analytics e Auditoria](14-admin-analytics-audit.md)
15. [Segurança](15-security.md)
16. [Testes e Qualidade](16-testing-quality.md)
17. [Backlog e Fases de Desenvolvimento](17-backlog-roadmap.md)
18. [Mapa de Telas](18-ui-map.md)
19. [Decisões Técnicas](19-technical-decisions.md)
20. [Pontos Ainda Não Definidos](20-open-questions.md)
21. [Glossário](21-glossary.md)
22. [Mídia e Uploads](22-media-uploads.md)
23. [Mapas, Pesquisa, Relevância e Promoções](23-maps-search-promotions.md)
24. [RabbitMQ, Jobs e E-mail](24-jobs-email.md)
25. [Modelo de Banco de Dados](25-database-model.md)

## Fonte de verdade por assunto

Quando dois documentos tratarem do mesmo ponto, vale o documento indicado abaixo. Os demais foram alinhados a ele.

| Assunto | Documento |
|---|---|
| Tabelas, colunas, enums, restrições e cardinalidades | 25 |
| Regras de negócio (RN) | 07 |
| Cálculo financeiro, comissão, taxa, parcelamento e reembolso | 12 |
| Filas, retry, DLQ e e-mail | 24 |
| Fórmula de relevância, geocodificação e regras de promoção | 23 |
| Limites e regras de mídia | 22 |
| Arquitetura e fluxo de camadas | 04 |
| Rotas e contratos de API | 10 |
| Padrões de código, branches e commits | 03 |

## Resumo do projeto

A plataforma será semelhante conceitualmente a Decolar/Booking, porém restrita ao Brasil e usando apenas hotéis fictícios cadastrados manualmente por gestores.

Perfis principais:

- Cliente
- Gestor de hotel (proprietário ou gestor adicional)
- Administrador global

Stack principal:

- JavaScript
- Next.js
- React
- Tailwind CSS
- MySQL
- Prisma ORM
- Redis
- Auth.js
- Stripe em ambiente de testes
- Cloudinary
- Leaflet + OpenStreetMap
- Nodemailer
- RabbitMQ

Princípios centrais:

- Clean Code
- 4 espaços de indentação
- Sem comentários ao longo do código
- Regras de negócio centralizadas
- MySQL como fonte de verdade
- Redis apenas como cache, hold e apoio a concorrência
- Server Components por padrão
- Validação no servidor
- Auditoria de operações administrativas e financeiras
- Branches de trabalho no formato `<type>/<ticket-id>-<short-description>`, em que `<ticket-id>` é o número da issue (ex.: `feat/12-hotel-search`)

## Status da especificação

As seis entrevistas de regras de negócio e a rodada de fechamento de pontos abertos foram incorporadas, e as inconsistências entre os documentos foram resolvidas. Não há decisão pendente que impeça o início do DER e do `schema.prisma`.
