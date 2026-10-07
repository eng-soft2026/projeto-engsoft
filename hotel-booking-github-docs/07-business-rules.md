# 07 — Regras de Negócio

## Usuários e operação

- RN001 — Um gestor pode ser proprietário de vários hotéis. Cada hotel possui um único proprietário e pode possuir gestores adicionais.
- RN002 — Hotel precisa de aprovação do administrador para ser publicado.
- RN003 — Estados do hotel: DRAFT, UNDER_REVIEW, PUBLISHED, BLOCKED.
- RN004 — CNPJ é obrigatório.
- RN005 — Um CNPJ pode estar associado a várias unidades.
- RN006 — O sistema opera apenas no Brasil.

## Quartos

- RN007 — Quartos são controlados individualmente.
- RN008 — Número do quarto é único dentro da unidade.
- RN009 — Quarto pertence a uma unidade e a um tipo de acomodação. O tipo pertence ao hotel e só pode ser usado em quartos de unidades desse mesmo hotel.
- RN010 — Quarto pode sobrescrever o preço padrão do tipo.
- RN011 — Quarto com histórico não deve ser apagado fisicamente.
- RN012 — Gestor pode bloquear quarto mesmo com reserva futura, mas deve receber alerta.

## Hóspedes

- RN013 — Todos os hóspedes devem possuir dados cadastrados.
- RN014 — CPF é obrigatório para todos os hóspedes.
- RN015 — Criança é hóspede com até 12 anos.
- RN016 — Bebê é tratado como criança.
- RN017 — Capacidade do quarto considera total de hóspedes.

## Datas e horários

- RN018 — Check-out deve ser posterior ao check-in.
- RN019 — Reserva pode ser para o mesmo dia.
- RN020 — Reserva do mesmo dia deve ser iniciada pelo menos 1 hora antes do check-in.
- RN021 — Reserva pode ser feita no máximo 1 ano antes do check-in.
- RN022 — Check-in e check-out são configurados por unidade.

## Preços

- RN023 — Tipo de acomodação possui preço padrão.
- RN024 — Quarto pode possuir preço próprio.
- RN025 — Gestor pode definir preço específico por data/período.
- RN026 — Prioridade: preço de período > preço do quarto > preço do tipo.
- RN027 — Reserva deve armazenar snapshot de preço.
- RN028 — Cada diária deve ser calculada individualmente quando houver preço por período.

## Reserva e hold

- RN029 — Cliente sempre escolhe quarto físico.
- RN030 — Reserva pode conter múltiplos quartos.
- RN031 — Reserva pode conter quartos de tipos diferentes.
- RN032 — Hóspedes devem ser associados ao quarto correspondente.
- RN033 — Ao iniciar reserva, quarto entra em hold por 15 minutos.
- RN034 — Pagamento recusado não reinicia hold.
- RN035 — Hold expirado cancela a tentativa pendente.
- RN036 — Antes de confirmar, backend deve revalidar disponibilidade.
- RN037 — Um quarto nunca pode ter duas reservas conflitantes confirmadas.
- RN038 — Mesmo cliente pode ter reservas simultâneas em locais diferentes.

## Cancelamento e alteração

- RN039 — Cliente pode cancelar com reembolso integral até 24h antes do check-in.
- RN040 — Gestor pode cancelar até 48h antes e cliente deve ser notificado.
- RN041 — Cliente pode alterar reserva até 24h antes.
- RN042 — Cliente pode alterar hóspedes até 24h antes.
- RN043 — Alteração de reserva deve estornar o pagamento anterior e criar novo pagamento.
- RN044 — Cancelamento pode ocorrer por quarto.
- RN045 — Cancelamento não pode ocorrer por hóspede individual.

## Overbooking

- RN046 — Overbooking é configurado por unidade.
- RN047 — Percentual máximo da plataforma é 10%.
- RN048 — Gestor pode usar de 0% a 10%.
- RN049 — Overbooking não pode gerar duas reservas no mesmo quarto físico.
- RN050 — Ao atingir capacidade comercial, novas reservas devem ser bloqueadas.
- RN051 — Dashboard deve alertar quando capacidade física for ultrapassada.

## Avaliações

- RN052 — Escala de 1 a 5 estrelas.
- RN053 — Critérios: limpeza, localização, atendimento, conforto e custo-benefício.
- RN054 — Avaliação original não pode ser editada.
- RN055 — Autor pode adicionar comentários posteriores.
- RN056 — Gestor pode responder publicamente.
- RN057 — Gestor não pode apagar avaliação; apenas denunciar.

## Favoritos

- RN058 — Cliente pode favoritar hotéis e quartos.
- RN059 — Cliente pode criar múltiplas listas nomeadas, separadas para hotéis e para quartos. Cada lista contém apenas itens de um tipo.

## Financeiro

- RN060 — Comissão da plataforma é 10% do valor bruto da hospedagem.
- RN061 — Taxa de serviço da plataforma corresponde a 10% do valor bruto da hospedagem e deve ser mostrada separadamente.
- RN062 — Parcelamento em até 12x sem juros somente quando valor bruto > R$ 1.500.
- RN063 — Reserva é confirmada após pagamento confirmado.
- RN064 — Estados de reserva e pagamento são independentes.
- RN065 — Reembolso pode ser parcial por quarto.

## Notificações

- RN066 — Cliente recebe lembrete 48h antes do check-in.
- RN067 — Notificações serão in-app e por e-mail.
- RN068 — Eventos críticos devem notificar partes afetadas.

## Administração

- RN069 — Administrador global pode controlar qualquer reserva.
- RN070 — Intervenções administrativas devem gerar auditoria.
- RN071 — Ações do administrador que afetem cliente devem gerar aviso correspondente.

## Liberação após cancelamento

- RN072 — Após cancelamento, o quarto deverá retornar à disponibilidade depois de 1 hora, desde que não exista outro bloqueio, reserva, manutenção ou impedimento aplicável.


## Financeiro complementar

- RN073 — Valor bruto da hospedagem corresponde ao subtotal da hospedagem após descontos promocionais e antes da taxa de serviço da plataforma.
- RN074 — Comissão da plataforma corresponde a 10% do valor bruto da hospedagem.
- RN075 — Taxa de serviço paga pelo cliente corresponde a 10% do valor bruto da hospedagem.
- RN076 — Valores monetários devem ser arredondados para duas casas decimais sempre para baixo.
- RN077 — Cancelamento solicitado pelo cliente com menos de 24 horas do check-in não gera qualquer reembolso.
- RN078 — Quando um cancelamento ou alteração gerar direito a reembolso, o sistema sempre deverá iniciar o fluxo de reembolso, sem opção de crédito interno substitutivo.

## Avaliações e mídia

- RN079 — Avaliação fica disponível imediatamente após o checkout previsto, desde que a reserva/quarto não esteja cancelado.
- RN080 — Cada avaliação e cada comentário do autor poderá conter no máximo 4 arquivos de mídia no total (imagens e/ou vídeos). Respostas públicas do gestor não aceitam mídia.
- RN081 — Imagens aceitas: JPG e JPEG.
- RN082 — Vídeos aceitos: MP4, WebM e MOV.
- RN083 — Vídeo anexado a avaliação/comentário terá duração máxima de 10 segundos.
- RN084 — A aplicação admite limite de negócio de até 50 MB por imagem, porém o limite efetivo nunca poderá ultrapassar o limite técnico do plano Cloudinary ativo. Vídeos são limitados a 50 MB (`MAX_VIDEO_UPLOAD_MB`), também sujeitos ao limite técnico do plano.
- RN085 — Hotel poderá possuir no máximo 10 fotos no cadastro principal.
- RN086 — Unidade não possuirá limite funcional fixo de fotos, permanecendo sujeita às cotas e limites do Cloudinary.
- RN087 — Avaliação continuará limitada a no máximo 4 arquivos de mídia no total.

## Mapas

- RN088 — Latitude e longitude deverão ser obtidas na criação ou alteração do endereço da unidade e persistidas no banco.
- RN089 — O gestor poderá corrigir manualmente a posição do marcador.
- RN090 — Pesquisas não deverão geocodificar novamente endereços já persistidos.

## Promoções

- RN091 — Gestor poderá criar promoções apenas para hotéis, unidades, tipos ou quartos sob sua gestão.
- RN092 — Promoção poderá ser percentual ou de valor fixo.
- RN093 — Desconto percentual deverá estar entre 1% e 70%.
- RN094 — Desconto fixo nunca poderá tornar a diária negativa ou igual a zero; preço final mínimo será R$ 1,00 por diária.
- RN095 — Promoções não são cumulativas. Quando múltiplas promoções forem válidas, aplicar a que produzir o menor preço final para o cliente.
- RN096 — Promoção poderá definir data de início/fim da oferta, período de hospedagem, mínimo de noites, escopo, limite de usos e valor mínimo do subtotal do quarto.
- RN097 — O desconto será aplicado antes do cálculo da comissão e da taxa de serviço.
- RN098 — Reserva deve armazenar snapshot da promoção e do desconto aplicado.

## Pesquisa e relevância

- RN099 — Relevância utilizará avaliação, hospedagens concluídas, taxa de cliques e taxa de favoritos.
- RN100 — Impressões e cliques deverão ser registrados de forma agregável para cálculo de relevância.
- RN101 — Destinos populares serão cidades com maior quantidade de check-ins concluídos.

## Jobs

- RN102 — Jobs assíncronos serão processados via RabbitMQ.
- RN103 — Uma falha transitória deverá gerar nova tentativa após 30 minutos.
- RN104 — Política padrão terá 3 tentativas totais; após o limite, a mensagem seguirá para Dead Letter Queue.

## Administração

- RN105 — Hotel UNDER_REVIEW que exigir correções deverá voltar para DRAFT acompanhado de observação administrativa.
- RN106 — Hotel BLOCKED somente poderá voltar a PUBLISHED por ação do administrador; quando exigir correções do gestor, deverá retornar primeiro para DRAFT e passar novamente por UNDER_REVIEW.
- RN107 — Logs de auditoria serão imutáveis e mantidos durante toda a vida útil do projeto.
- RN108 — Toda ação administrativa capaz de afetar reserva, pagamento, publicação, bloqueio ou conteúdo do usuário deverá registrar motivo obrigatório.

## Regras complementares

- RN109 — Cada hotel possui um único proprietário (`owner_user_id`), que deve ter o papel MANAGER.
- RN110 — O proprietário pode adicionar e remover gestores adicionais do hotel, que devem ter o papel MANAGER. Gestores adicionais possuem os mesmos poderes operacionais entre si, mas não podem alterar a lista de gestores nem remover o proprietário.
- RN111 — Os cálculos financeiros são feitos por quarto reservado (`ReservationRoom`) e gravados como snapshot no item. Os totais da reserva são a soma dos itens, e a promoção é avaliada por item.
- RN112 — O valor reembolsável de um quarto é o seu `total_price` (valor bruto do item + taxa de serviço do item), inclusive no estorno do pagamento anterior em alterações de reserva.
- RN113 — Cada hotel possui no máximo uma regra de aceitação por tipo padronizado. Para `OTHER`, o `custom_label` deve ser único dentro do hotel.
- RN114 — A política de cancelamento da plataforma (RN039 a RN045 e RN077) é fixa. Políticas textuais do hotel (`HOTEL_POLICY`) apenas complementam a informação exibida e nunca alteram prazos ou reembolsos.
- RN115 — O valor mínimo de uma promoção é comparado ao subtotal do quarto antes do desconto. Cada quarto confirmado com uma promoção que tenha limite de usos consome 1 uso, devolvido se esse quarto for cancelado.

---

# Atualização — Regras de aceitação do hotel

Regras simples como pets, cigarro, crianças, visitantes e eventos não devem ser armazenadas como colunas booleanas dentro de `HOTEL`.

A plataforma deverá possuir tipos padronizados em `ACCEPTANCE_TYPE`, inicialmente:

```text
PETS
SMOKING
CHILDREN
VISITORS
EVENTS
OTHER
```

A configuração de cada hotel deverá ser armazenada em `HOTEL_ACCEPTANCE`, contendo:

```text
hotel_id
acceptance_type_id
custom_label
is_allowed
details
```

Quando o tipo for diferente de `OTHER`, `custom_label` deverá permanecer vazio. Quando o tipo for `OTHER`, o gestor deverá informar um rótulo próprio em `custom_label`.

Exemplo padronizado:

```text
PETS
is_allowed = true
```

Exemplo criado pelo gestor:

```text
OTHER
custom_label = "Uso de caixas de som nas áreas externas"
is_allowed = false
details = "Não permitido após as 22h."
```

`HOTEL_ACCEPTANCE` deverá ser utilizado para regras simples de aceita/não aceita. `HOTEL_POLICY` continuará responsável por políticas textuais mais detalhadas.
