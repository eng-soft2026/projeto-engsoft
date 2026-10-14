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

## Testes de integração

- Ficam em `tests/integration/**` e rodam com `npm run test:integration` (`vitest.integration.config.js`), fora do `npm test`.
- Usam MySQL e Redis reais (`npm run db:up`) com variáveis de `.env.test` (copiado de `.env.test.example`, nunca versionado) ou do ambiente. O nome do banco precisa terminar em `_test` e o `REDIS_URL` precisa apontar para um banco lógico dedicado (índice maior que 0); caso contrário a execução aborta.
- O `globalSetup` roda `prisma migrate deploy` uma vez, criando o banco de teste se ele não existir.
- Helpers em `tests/integration/helpers/`: `resetDatabase()` apaga todas as tabelas (exceto `_prisma_migrations`) em ordem de FK lida do `information_schema`, `seedBaseData()` reaplica o seed base e `flushRedis()` limpa o banco lógico de teste com `FLUSHDB`.
- Os arquivos rodam em série (`fileParallelism: false`), porque compartilham o mesmo banco.

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
