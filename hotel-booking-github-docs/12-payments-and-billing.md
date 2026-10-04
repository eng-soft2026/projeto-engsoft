# 12 — Pagamentos, Comissão e Reembolsos

## Stripe

Usar Stripe exclusivamente em ambiente de testes/sandbox para o trabalho.

A integração deverá seguir os fluxos recomendados pelo Stripe, utilizando Payment Intents/Checkout conforme o fluxo escolhido na implementação e webhooks assinados como confirmação de servidor.

## Formas representadas

- cartão de crédito;
- cartão de débito, conforme disponibilidade do fluxo de teste;
- PIX, conforme disponibilidade do fluxo de teste.

## Definições monetárias

### Subtotal antes de desconto

Soma das diárias dos quartos selecionados antes de promoções.

### Desconto

Valor da melhor promoção válida aplicada. Promoções não são cumulativas.

### Valor bruto da hospedagem

```text
valorBruto = subtotalHospedagem - desconto
```

É o valor da hospedagem após promoções e antes da taxa de serviço.

### Comissão da plataforma

```text
comissao = floor2(valorBruto × 10%)
```

É descontada do valor pertencente ao gestor/hotel.

### Taxa de serviço do cliente

```text
taxaServico = floor2(valorBruto × 10%)
```

### Total pago pelo cliente

```text
totalCliente = valorBruto + taxaServico
```

### Valor líquido do hotel

```text
valorLiquidoHotel = valorBruto - comissao
```

## Cálculo por item

Todos os valores acima são calculados por quarto reservado (`RESERVATION_ROOM`) e gravados como snapshot no item. Os totais da reserva (`RESERVATION`) são a soma dos itens, de modo que comissão, taxa de serviço e valor reembolsável de cada quarto são exatos e a soma dos itens sempre fecha com o total da reserva.

A promoção é avaliada por quarto: aplica-se a elegível que gerar o menor preço final para aquele item.

## Arredondamento

Toda operação monetária deverá utilizar duas casas decimais e arredondamento sempre para baixo.

Exemplo:

```text
R$ 12,349 → R$ 12,34
```

Nunca utilizar `Number`/ponto flutuante binário como fonte de verdade para dinheiro. Preferir `Decimal` do Prisma/MySQL e uma biblioteca decimal ou operações em centavos quando apropriado.

## Parcelamento

Permitido quando:

```text
valor bruto > R$ 1.500,00
```

Limite:

```text
até 12x sem juros
```

A condição usa o valor bruto da reserva (soma dos itens), não o total com taxa de serviço.

## Estados de pagamento

```text
PENDING
PROCESSING
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

## Estados de reembolso

```text
REQUESTED
PROCESSING
COMPLETED
FAILED
```

## Cancelamento pelo cliente

### 24 horas ou mais antes do check-in

```text
cancelamento permitido
reembolso = 100% do valor reembolsável do item cancelado
```

### Menos de 24 horas antes do check-in

```text
cancelamento pode ser registrado
reembolso = R$ 0,00
```

Não existe crédito interno substitutivo.

## Cancelamento pelo gestor/administrador

Quando a regra autorizar reembolso, o sistema deverá sempre iniciar o reembolso financeiro correspondente.

A intervenção administrativa deverá preservar auditoria e notificar o cliente.

## Alteração de reserva

Não cobrar ou devolver apenas a diferença.

Fluxo:

```text
validar nova configuração
→ reservar nova configuração de forma segura
→ solicitar estorno do pagamento anterior
→ gerar novo pagamento
→ confirmar alteração após novo pagamento
```

O estorno do pagamento anterior gera um `Refund` para cada `ReservationRoom` pago, cada um com o respectivo `total_price`.

## Reembolso parcial

Reserva com múltiplos quartos deve permitir reembolso apenas do `ReservationRoom` cancelado.

O valor reembolsável de um quarto é o `total_price` do `ReservationRoom` (valor bruto do item + taxa de serviço do item), já calculado por item e gravado como snapshot.

## Webhooks

- validar assinatura;
- processar de forma idempotente;
- armazenar `stripeEventId` (único) na tabela `STRIPE_WEBHOOK_EVENT`;
- evitar duplicação de pagamento, reserva ou reembolso;
- confirmar pagamento somente após evento confiável do servidor.

## Identificadores externos

```text
stripePaymentIntentId
stripeRefundId
stripeEventId
```

## Histórico

Nunca sobrescrever tentativas antigas. Cada tentativa de pagamento é um registro próprio em `PAYMENT`; tentativas com falha permanecem com status FAILED.

Preservar:

- pagamentos;
- tentativas;
- reembolsos;
- estornos;
- falhas.
