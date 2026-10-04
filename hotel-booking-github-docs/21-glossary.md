# 21 — Glossário

## Hotel

Empreendimento ou marca cadastrada pelo gestor.

## Unidade

Localização física de um hotel, com endereço, telefone, fotos, quartos, horários e regras operacionais próprias.

## Tipo de acomodação

Template que agrupa características compartilhadas por quartos semelhantes, como capacidade, camas, área e preço padrão. Pertence ao hotel e pode ser usado por quartos de qualquer unidade desse hotel.

## Quarto físico

Quarto individual identificável dentro de uma unidade. É o item efetivamente escolhido pelo cliente.

## Reserva

Agrupador principal da operação de hospedagem, podendo conter um ou vários quartos.

## Item de reserva

Relação entre uma reserva e um quarto físico, com preço, status e hóspedes próprios.

## Hold

Bloqueio temporário de 15 minutos aplicado ao quarto enquanto o cliente conclui a reserva e o pagamento.

## Disponibilidade

Resultado da combinação entre estado operacional, bloqueios, reservas existentes, holds ativos e regras da unidade.

## Overbooking

Margem comercial configurável por unidade, limitada a 10% pela plataforma. Não autoriza duas reservas conflitantes para o mesmo quarto físico.

## Valor bruto

Valor da hospedagem após descontos promocionais e antes da taxa de serviço da plataforma. A comissão é calculada sobre ele.

## Comissão

Valor equivalente a 10% do valor bruto da hospedagem, retido pela plataforma e descontado do valor pertencente ao hotel.

## Taxa de serviço

Valor adicional cobrado do cliente pela plataforma, equivalente a 10% do valor bruto da hospedagem, e exibido separadamente.

## Reembolso parcial

Devolução referente somente a um ou mais quartos cancelados dentro de uma reserva maior.

## Soft delete

Desativação lógica de um registro, mantendo-o no banco para preservar histórico.

## Snapshot de preço

Cópia dos valores aplicados no momento da reserva para impedir alterações retroativas quando a tabela de preços mudar.

## Gestor

Usuário com papel MANAGER, responsável por cadastrar e operar hotéis na plataforma. Pode ser proprietário de vários hotéis ou gestor adicional de hotéis de outros gestores.

## Administrador global

Usuário com acesso administrativo a toda a plataforma.

## Proprietário

Gestor que cadastrou o hotel. Cada hotel possui um único proprietário, que administra a lista de gestores adicionais.

## Gestor adicional

Gestor associado a um hotel pelo proprietário. Possui os mesmos poderes operacionais dos demais gestores adicionais.

## Regra de aceitação

Configuração simples de aceita/não aceita de um hotel (pets, cigarro, crianças, visitantes, eventos ou regra própria), distinta das políticas textuais.

## Valor reembolsável

Valor devolvido ao cliente quando um quarto é cancelado com direito a reembolso: valor bruto do item mais a taxa de serviço do item.
