# 11 — Redis, Cache e Concorrência

## Papel do Redis

Redis será utilizado para:

- cache;
- holds de reserva;
- apoio a locks temporários;
- expiração;
- contadores e dados efêmeros de apoio à pesquisa/relevância.

Redis não será fonte de verdade.

## Holds

Ao iniciar a reserva:

```text
reservation-hold:{roomId}:{dateRange}
```

TTL:

```text
15 minutos
```

O hold deverá guardar contexto mínimo necessário para identificar usuário, quarto, período e tentativa.

## Cache sugerido

```text
hotel:{hotelId}
search:{hash}
destinations:popular
admin:dashboard
availability:{unitId}:{checkIn}:{checkOut}
```

TTL inicial sugerido:

- pesquisa: 5 min;
- hotel: 10 min;
- dashboard: 1 min.

## Invalidação

Invalidar cache quando ocorrerem mudanças relevantes:

- preço;
- quarto;
- bloqueio;
- reserva;
- cancelamento;
- hotel publicado/bloqueado.

## Concorrência

Disponibilidade deve ser revalidada dentro de transação antes de confirmar reserva.

Condição de conflito:

```text
newCheckIn < existingCheckOut
AND
newCheckOut > existingCheckIn
```

Reservas encostadas são permitidas:

```text
10/10 → 12/10
12/10 → 15/10
```

## Regra crítica

Nunca confiar apenas em:

- estado do front-end;
- cache Redis;
- disponibilidade consultada minutos antes.

A confirmação deve revalidar no backend.


## Separação entre Redis e RabbitMQ

Redis não será utilizado como fila principal.

```text
Redis    → cache, hold, locks efêmeros, contadores
RabbitMQ → e-mails, lembretes, reembolsos e tarefas assíncronas
```

## Métricas de pesquisa

Impressões e cliques são persistidos em `SEARCH_IMPRESSION` e `SEARCH_CLICK` no MySQL, que é a fonte de verdade. Os contadores do Redis são cache de agregados usados pela relevância: são incrementados no registro do evento, possuem TTL e podem ser reconstruídos a partir do MySQL pelo job `analytics.aggregate`.

Chaves sugeridas:

```text
search:impressions:{unitId}
search:clicks:{unitId}
search:favorites:{unitId}
```
