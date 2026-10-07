# 16 — Testes e Qualidade

## Prioridade de testes

1. disponibilidade;
2. reserva;
3. concorrência;
4. hold;
5. cálculo de preço;
6. cancelamento;
7. alteração;
8. overbooking;
9. pagamentos;
10. reembolsos;
11. autenticação;
12. autorização.

## Tipos

- unitários;
- integração;
- end-to-end.

## Casos críticos

### Disponibilidade

- quarto livre;
- quarto reservado;
- quarto em manutenção;
- quarto bloqueado por período;
- unidade bloqueada;
- datas encostadas;
- datas conflitantes.

### Hold

- hold criado;
- hold expira;
- pagamento recusado sem reiniciar tempo;
- dois usuários disputando o mesmo quarto.

### Reserva

- múltiplos quartos;
- tipos diferentes;
- limite de hóspedes;
- CPF obrigatório;
- reserva para mesmo dia;
- limite de 1 ano.

### Cancelamento

- cliente antes de 24h;
- cliente depois de 24h;
- gestor antes de 48h;
- cancelamento parcial por quarto.

### Pagamento

- sucesso;
- falha;
- webhook duplicado;
- reembolso parcial;
- reembolso falho.

## Definition of Done

Uma funcionalidade só está concluída quando:

- funciona;
- valida entrada;
- trata erro;
- respeita autorização;
- segue 4 espaços;
- não possui comentários inline;
- não duplica regra;
- possui testes adequados quando crítica;
- é responsiva;
- não expõe dados sensíveis.
