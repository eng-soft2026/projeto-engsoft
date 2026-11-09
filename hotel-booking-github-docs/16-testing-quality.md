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
- No CI, o job `integration` (`.github/workflows/ci.yml`) roda em todo push e PR para `main` com os services `mysql:8.4` e `redis:7`, aplica as migrações com `npm run prisma:migrate:deploy` e executa `npm run test:integration`, com `DATABASE_URL` e `REDIS_URL` definidos no job (banco `_test`, Redis no índice 15).

## Cobertura

- `npm run test:coverage` roda os projetos `unit` e `dom` com `@vitest/coverage-v8` sobre `src/**`, exceto `src/generated/**`, `src/domain/**` (legado) e os `page.jsx`/`layout.jsx` de `src/app`. Os testes de integração não entram na medição.
- Relatórios: texto no log e `coverage/lcov.info`, publicado como artefato `coverage-lcov` pelo job `ci`, que roda `npm run test:coverage` no lugar de `npm test`.
- Limiares globais: 97% de statements, functions e lines e 96% de branches. Em `src/modules/{availability,reservations,pricing}/**`: 98% nas quatro métricas. Os valores vieram do baseline medido em 2026-11-09 (global 99,23/98,1/99,56/99,22; módulos críticos em 100%) menos 2 pontos percentuais, arredondados para baixo.
- Cobertura abaixo de qualquer limiar faz o comando falhar e derruba o job `ci`.
- Os limiares só sobem. `tests/architecture/coverage-thresholds.test.js` guarda o piso de cada métrica, então baixar um limiar exige alterar também esse teste, o que fica visível no review.

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
