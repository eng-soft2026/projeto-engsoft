# 03 — Padrões de Código

## Indentação

Todo o projeto usará 4 espaços.

Não usar tabs reais.

```javascript
function calculateTotalPrice(price, nights) {
    return price * nights
}
```

## Comentários

Não utilizar comentários ao longo do código.

A clareza deve vir de:

- nomes descritivos;
- funções pequenas;
- responsabilidades separadas;
- módulos bem definidos;
- abstrações simples.

## Nomenclatura

### Variáveis

Preferir nomes claros:

```javascript
const reservation = await findReservationById(id)
const currentDate = new Date()
```

### Funções

Usar verbos claros:

```text
createReservation
cancelReservation
findAvailableRooms
calculateReservationPrice
validateBookingPeriod
```

### Booleanos

Usar prefixos semânticos:

```text
isAvailable
isAuthenticated
isAdmin
hasReservation
canCancel
shouldAllowOverbooking
```

## Clean Code

- funções com responsabilidade única;
- evitar duplicação;
- early return;
- baixo acoplamento;
- alta coesão;
- validação nas fronteiras;
- regras de negócio centralizadas;
- legibilidade acima de abstração excessiva.

## SOLID

Aplicar quando fizer sentido, principalmente:

- Single Responsibility Principle;
- Open/Closed Principle;
- Dependency Inversion.

Não criar abstrações artificiais apenas para demonstrar padrões.

## Formatação

Prettier deverá respeitar 4 espaços.

## Git

Branches permanentes:

```text
main
develop
```

Branches de trabalho seguem o formato:

```text
<type>/<ticket-id>-<short-description>
```

- `<type>` usa os mesmos tipos dos commits: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`;
- `<ticket-id>` é o número da issue no GitHub;
- `<short-description>` em inglês, minúsculas, separada por hífens.

Exemplos:

```text
feat/12-hotel-search
feat/18-reservation-flow
feat/25-overbooking-limit
fix/31-reservation-validation
docs/40-update-database-model
```

Commits:

```text
feat: add hotel search
feat: create reservation flow
fix: prevent invalid checkout date
refactor: extract availability service
style: adjust hotel card layout
docs: update project requirements
test: add overlapping reservation tests
chore: configure eslint
```
