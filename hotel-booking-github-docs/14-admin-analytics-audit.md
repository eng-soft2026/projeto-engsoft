# 14 — Administração, Analytics e Auditoria

## Dashboard do gestor

Indicadores:

- faturamento bruto;
- comissão da plataforma;
- valor líquido;
- número de reservas;
- ticket médio;
- taxa de ocupação;
- cancelamentos;
- no-show;
- quartos mais reservados;
- avaliações;
- overbooking.

Filtros:

- hotel;
- unidade;
- período;
- tipo de acomodação.

## Dashboard global

Indicadores:

- faturamento bruto total;
- receita de comissão;
- receita de taxa de serviço;
- reservas totais;
- ticket médio;
- reembolsos;
- cancelamentos;
- novos usuários;
- novos gestores;
- hotéis aguardando aprovação;
- hotéis publicados;
- hotéis bloqueados;
- denúncias pendentes;
- ocupação;
- overbooking;
- no-shows.

## Controle administrativo

Administrador pode:

- visualizar;
- alterar;
- cancelar;
- reembolsar;
- realocar;
- corrigir dados;
- intervir em pagamentos.

## Auditoria

Registrar:

- ator;
- ação;
- entidade;
- data/hora;
- motivo;
- estado anterior;
- estado posterior.

Operações críticas não devem ser apagadas do histórico.


## Estratégia de revisão de hotel

### Solicitação de correções

Quando o administrador identificar problemas em `UNDER_REVIEW`:

```text
UNDER_REVIEW
→ DRAFT
```

Deverá registrar uma observação de revisão com itens que precisam ser corrigidos. A observação é gravada em `HOTEL_REVIEW_NOTE`, vinculada ao hotel e ao administrador. O gestor corrige e submete novamente.

### Aprovação e bloqueio

- Aprovar: `UNDER_REVIEW` → `PUBLISHED`.
- Bloquear: `PUBLISHED` ou `UNDER_REVIEW` → `BLOCKED` (RN121). Hotel `DRAFT` não é bloqueado.

As duas ações exigem motivo e geram `AUDIT_LOG` na mesma transação (RN122). O bloqueio grava também `HOTEL_REVIEW_NOTE`, para que o gestor veja o motivo (RN123); a aprovação não grava nota.

### Desbloqueio

Um hotel `BLOCKED` não será desbloqueado automaticamente.

- Se o problema puder ser resolvido administrativamente, o administrador poderá restaurar `PUBLISHED`, registrando motivo.
- Se exigir alteração de dados pelo gestor, o administrador moverá para `DRAFT` com observação em `HOTEL_REVIEW_NOTE`; depois o hotel deverá passar novamente por `UNDER_REVIEW` e aprovação.

O administrador informa o destino de forma explícita (`PUBLISHED` ou `DRAFT`), sem valor padrão, e os dois casos gravam `HOTEL_REVIEW_NOTE` (RN123).

## Auditoria

Logs serão append-only e mantidos durante toda a vida do projeto.

Consultas administrativas deverão suportar:

- ator;
- tipo de ação;
- entidade;
- ID da entidade;
- intervalo de datas;
- resultado;
- correlação/request ID quando disponível.

A interface poderá paginar e filtrar logs, mas nunca editar ou excluir registros pela aplicação.

## Ações perigosas

Ações como cancelar reserva, reembolsar, bloquear hotel, modificar pagamento ou remover conteúdo deverão exigir:

- confirmação explícita;
- motivo obrigatório;
- auditoria;
- notificação da parte afetada quando aplicável.
