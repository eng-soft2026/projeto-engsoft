# 23 — Mapas, Pesquisa, Relevância e Promoções

# Mapas

## Stack

- Leaflet / React Leaflet para UI;
- OpenStreetMap para mapa base;
- Nominatim para geocodificação de baixo volume.

## Política de geocodificação

Ao salvar ou alterar endereço da unidade:

```text
normalizar endereço
→ verificar cache
→ geocodificar se necessário
→ persistir latitude/longitude
→ permitir ajuste manual do pin
```

Não geocodificar durante cada renderização ou pesquisa.

O backend deverá respeitar controle de taxa do Nominatim e identificar adequadamente a aplicação.

Autocomplete de endereço não deverá consultar o Nominatim público a cada tecla. Para o trabalho, usar campos estruturados de endereço e executar geocodificação somente ao confirmar o cadastro.

## Distância

Para ordenação/filtro por distância, utilizar coordenadas já persistidas. MySQL poderá usar função geoespacial apropriada ou cálculo Haversine encapsulado no repository.

# Relevância

A primeira versão será simples, determinística e explicável.

Componentes normalizados entre 0 e 1:

```text
ratingScore     = averageRating / 5
ctrScore        = clicks / max(impressions, 1)
favoriteScore   = favorites / max(impressions, 1)
stayScore       = log(1 + completedStays) / log(1 + maxCompletedStays)
```

Score final:

```text
relevance =
    ratingScore   * 0.35 +
    stayScore     * 0.30 +
    ctrScore      * 0.20 +
    favoriteScore * 0.15
```

Origem dos dados:

- `impressions` e `clicks`: contagem de `SEARCH_IMPRESSION` e `SEARCH_CLICK` da unidade;
- `favorites`: itens de `FAVORITE_HOTEL_ITEM` do hotel da unidade somados aos itens de `FAVORITE_ROOM_ITEM` dos quartos da unidade;
- `completedStays`: `RESERVATION_ROOM` com status `COMPLETED` em quartos da unidade;
- `averageRating`: média das avaliações visíveis (`is_hidden = false`) dos quartos da unidade.

Regras adicionais:

- resultado indisponível no período não deve aparecer como reservável;
- hotéis bloqueados ou não publicados não entram no ranking;
- métricas podem ser agregadas por unidade;
- pesos podem ser ajustados depois com dados seedados sem mudar o contrato.

## Destinos populares

Destinos populares serão cidades brasileiras ordenadas pela quantidade de check-ins efetivamente realizados.

Para demonstração, os dados seedados deverão incluir check-ins históricos suficientes para alimentar esse ranking.

# Promoções

## Escopo

O gestor poderá criar promoção para:

- hotel;
- unidade;
- tipo de acomodação;
- quarto físico.

O escopo é definido pelas tabelas de alvo `PROMOTION_HOTEL`, `PROMOTION_UNIT`, `PROMOTION_ROOM_TYPE` e `PROMOTION_ROOM`. Uma promoção possui ao menos um alvo. Um quarto é elegível quando ele, a sua unidade, o seu tipo ou o seu hotel for alvo da promoção.

## Tipos

```text
PERCENTAGE
FIXED_AMOUNT
```

## Campos

Nomes definitivos em `25-database-model.md`:

```text
id
created_by_user_id
name
discount_type
discount_value
valid_from
valid_until
stay_from
stay_until
minimum_nights
minimum_subtotal_amount (opcional)
usage_limit (opcional)
usage_count
is_active
```

## Regras

- percentual entre 1% e 70%;
- desconto fixo é aplicado por diária e não pode reduzir a diária abaixo de R$ 1,00;
- promoções não acumulam;
- a promoção é avaliada por quarto da reserva: aplica-se automaticamente a elegível que gerar o menor preço final do item;
- elegibilidade exige promoção ativa, data atual dentro de `valid_from` e `valid_until`, todas as noites dentro de `stay_from` e `stay_until`, número de noites maior ou igual a `minimum_nights`, subtotal do quarto maior ou igual a `minimum_subtotal_amount` quando definido e `usage_count` menor que `usage_limit` quando definido;
- agendar uma promoção significa definir `valid_from` futuro; ativar e desativar usa `is_active`;
- desconto ocorre antes da comissão e taxa de serviço;
- reserva guarda snapshot da promoção em `RESERVATION_ROOM`;
- alterar uma promoção não altera reservas existentes;
- promoção expirada não pode ser aplicada a novas reservas;
- gestor só pode criar promoção em recursos sob sua gestão (como proprietário ou gestor adicional).

## Ordem de preço

```text
preço de período
→ preço específico do quarto
→ preço padrão do tipo
→ melhor promoção válida
→ valor bruto
→ comissão 10%
→ taxa de serviço 10%
```
