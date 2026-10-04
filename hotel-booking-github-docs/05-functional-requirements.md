# 05 — Requisitos Funcionais

## Autenticação e usuários

- RF001 — Cadastrar usuário.
- RF002 — Autenticar com e-mail e senha.
- RF003 — Encerrar sessão.
- RF004 — Recuperar senha.
- RF005 — Editar perfil.
- RF006 — Controlar perfis Cliente, Gestor e Administrador.

## Hotéis e unidades

- RF007 — Gestor cadastrar hotel.
- RF008 — Hotel iniciar como rascunho.
- RF009 — Gestor enviar hotel para análise.
- RF010 — Administrador aprovar hotel.
- RF011 — Administrador bloquear hotel.
- RF012 — Gestor cadastrar múltiplas unidades.
- RF013 — Unidade possuir endereço, telefone, fotos, horários e geolocalização.
- RF014 — Bloquear unidade por período.

## Tipos e quartos

- RF015 — Criar tipos de acomodação no nível do hotel, reutilizáveis pelas unidades do mesmo hotel.
- RF016 — Configurar camas, capacidade, área, fotos e preço padrão.
- RF017 — Cadastrar quartos físicos individualmente.
- RF018 — Definir andar, acessibilidade, observações e status.
- RF019 — Definir preço específico por quarto.
- RF020 — Bloquear quarto por período.
- RF021 — Excluir quarto sem histórico.
- RF022 — Desativar quarto com histórico.

## Comodidades e políticas

- RF023 — Associar comodidades ao hotel.
- RF024 — Associar comodidades à unidade.
- RF025 — Associar comodidades ao tipo de acomodação.
- RF026 — Associar comodidades ao quarto.
- RF027 — Gestor criar comodidades próprias.
- RF028 — Utilizar políticas padronizadas.
- RF029 — Gestor adicionar políticas próprias.

## Pesquisa

- RF030 — Pesquisar por nome do hotel.
- RF031 — Pesquisar por cidade, estado, bairro e região.
- RF032 — Pesquisar por datas.
- RF033 — Pesquisar por quantidade de hóspedes e quartos.
- RF034 — Filtrar por preço.
- RF035 — Filtrar por avaliação.
- RF036 — Filtrar por comodidades.
- RF037 — Filtrar por acessibilidade.
- RF038 — Filtrar por aceita pets (regra de aceitação PETS permitida).
- RF039 — Filtrar por tipo de cama.
- RF040 — Filtrar por área do quarto.
- RF041 — Filtrar por distância.
- RF042 — Ordenar por menor preço.
- RF043 — Ordenar por maior preço.
- RF044 — Ordenar por avaliação.
- RF045 — Ordenar por distância.
- RF046 — Ordenar por relevância.
- RF047 — Exibir resultados em mapa.
- RF048 — Exibir mini-card ao clicar no marcador.

## Reserva

- RF049 — Cliente selecionar quarto físico.
- RF050 — Reserva conter múltiplos quartos.
- RF051 — Reserva conter tipos diferentes de acomodação.
- RF052 — Cadastrar dados de todos os hóspedes.
- RF053 — Associar hóspedes a quartos.
- RF054 — Criar hold de 15 minutos ao iniciar reserva.
- RF055 — Bloquear quarto durante hold.
- RF056 — Calcular preço por diária.
- RF057 — Aplicar preço específico por período.
- RF058 — Criar reserva para o mesmo dia quando permitido.
- RF059 — Restringir reserva a no máximo 1 ano de antecedência.
- RF060 — Confirmar reserva após pagamento.
- RF061 — Cancelar reserva por quarto.
- RF062 — Alterar reserva até 24h antes.
- RF063 — Alterar hóspedes até 24h antes.
- RF064 — Cancelar pelo cliente antes do check-in, com reembolso integral até 24h antes e sem reembolso com menos de 24h.
- RF065 — Gestor cancelar até 48h antes.
- RF066 — Liberar disponibilidade após regra de cancelamento.

## Overbooking

- RF067 — Configurar percentual por unidade.
- RF068 — Limitar percentual máximo a 10%.
- RF069 — Mostrar alertas administrativos.
- RF070 — Bloquear novas reservas ao atingir limite comercial.

## Avaliações

- RF071 — Cliente avaliar de 1 a 5 estrelas.
- RF072 — Avaliar limpeza, localização, atendimento, conforto e custo-benefício.
- RF073 — Adicionar comentário.
- RF074 — Adicionar fotos.
- RF075 — Gestor responder publicamente.
- RF076 — Gestor denunciar avaliação.
- RF077 — Cliente comentar na própria avaliação.
- RF078 — Impedir edição da avaliação original.

## Favoritos

- RF079 — Favoritar hotel.
- RF080 — Favoritar quarto.
- RF081 — Criar listas de favoritos nomeadas, separadas para hotéis e para quartos.

## Home

- RF082 — Exibir barra de pesquisa.
- RF083 — Exibir destinos populares.
- RF084 — Exibir hotéis mais bem avaliados.
- RF085 — Exibir ofertas.
- RF086 — Exibir pesquisas recentes.

## Pagamentos

- RF087 — Integrar Stripe em ambiente de testes.
- RF088 — Suportar cartão de crédito.
- RF089 — Suportar cartão de débito quando disponível no fluxo definido.
- RF090 — Suportar PIX quando disponível no fluxo definido.
- RF091 — Parcelar em até 12x sem juros quando valor bruto > R$ 1.500.
- RF092 — Criar reembolso integral.
- RF093 — Criar reembolso parcial por quarto.
- RF094 — Processar webhooks do Stripe.

## Notificações

- RF095 — Central interna de notificações.
- RF096 — Enviar e-mails.
- RF097 — Lembrete 48h antes do check-in.
- RF098 — Notificar eventos de reserva, pagamento, alteração, cancelamento, reembolso, avaliação e administração.

## Administração e analytics

- RF099 — Dashboard do gestor.
- RF100 — Dashboard global do administrador.
- RF101 — Filtrar dashboard do gestor por hotel, unidade, período e tipo.
- RF102 — Exibir faturamento bruto.
- RF103 — Exibir comissão.
- RF104 — Exibir valor líquido.
- RF105 — Exibir reservas, ticket médio, ocupação, cancelamentos, no-show, quartos mais reservados, avaliações e overbooking.
- RF106 — Exibir novos usuários, gestores, hotéis em análise, denúncias e bloqueios no admin.
- RF107 — Administrador modificar reservas.
- RF108 — Auditar operações críticas.


## Mídia e uploads

- RF109 — Armazenar mídia no Cloudinary.
- RF110 — Permitir até 10 fotos no cadastro principal do hotel.
- RF111 — Permitir galeria de fotos sem limite funcional fixo por unidade, sujeita às cotas do provedor.
- RF112 — Permitir até 4 arquivos de mídia (imagens e/ou vídeos) por avaliação e por comentário do autor.
- RF113 — Aceitar imagens JPG e JPEG.
- RF114 — Aceitar vídeos em formatos comuns suportados pela política do projeto, incluindo MP4, WebM e MOV.
- RF115 — Limitar vídeos de avaliação a no máximo 10 segundos.
- RF116 — Validar formato, tamanho e duração antes de concluir o upload.

## Promoções

- RF117 — Gestor criar promoções para hospedagens sob sua gestão.
- RF118 — Promoção possuir período de validade e período de hospedagem aplicável.
- RF119 — Permitir desconto percentual ou valor fixo.
- RF120 — Aplicar automaticamente a melhor promoção válida quando houver mais de uma elegível.
- RF121 — Impedir acumulação de promoções.
- RF122 — Permitir ativar, desativar e agendar promoção.
- RF123 — Exibir desconto de forma separada no resumo de preço.

## Mapas e geocodificação

- RF124 — Geocodificar endereço de unidade ao cadastrar ou alterar endereço.
- RF125 — Armazenar latitude e longitude da unidade.
- RF126 — Permitir correção manual da posição do marcador pelo gestor.
- RF127 — Exibir atribuição obrigatória do OpenStreetMap.

## Jobs e e-mails

- RF128 — Enfileirar e-mails e tarefas assíncronas no RabbitMQ.
- RF129 — Reprocessar tarefa transitoriamente falha após 30 minutos.
- RF130 — Encaminhar tarefa definitivamente falha para Dead Letter Queue após 3 tentativas totais.
- RF131 — Enviar e-mail HTML customizado e versão texto.

## Pesquisa e relevância

- RF132 — Registrar impressões de resultados.
- RF133 — Registrar cliques em resultados.
- RF134 — Considerar favoritos, hospedagens concluídas e avaliação na relevância.
- RF135 — Calcular destinos populares pelo número de check-ins realizados.

## Gestores e regras de aceitação

- RF136 — Proprietário do hotel adicionar e remover gestores adicionais.
- RF137 — Gestor configurar regras de aceitação do hotel (pets, cigarro, crianças, visitantes, eventos e regras próprias).
