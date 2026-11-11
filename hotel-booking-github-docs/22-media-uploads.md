# 22 — Mídia e Uploads

## Provedor

Cloudinary será responsável por armazenamento, transformação e entrega de imagens e vídeos.

## Persistência

MySQL deverá guardar somente metadados, por exemplo:

```text
publicId
secureUrl
resourceType
format
bytes
width
height
duration
createdAt
```

Nas tabelas de imagem, `secureUrl` é gravado na coluna `url` e `publicId` em `cloudinary_public_id`. Todas incluem também `format`, `bytes`, `width` e `height`. `REVIEW_MEDIA` inclui `duration_seconds` e usa a coluna `type` (IMAGE ou VIDEO) no lugar de `resourceType`.

## Limites por contexto

### Hotel

- máximo de 10 fotos no cadastro principal;
- exatamente uma foto de capa.

### Unidade

- sem limite funcional fixo definido pelo domínio;
- sujeita à cota do Cloudinary e às proteções gerais contra abuso;
- exatamente uma foto de capa.

### Avaliação e comentário do autor

- máximo de 4 arquivos de mídia no total (imagens e/ou vídeos) por avaliação e por comentário;
- respostas públicas do gestor não aceitam mídia;
- imagens JPG ou JPEG;
- vídeos MP4, WebM ou MOV;
- duração máxima do vídeo: 10 segundos.

## Tamanho de imagem

A regra de produto admite até 50 MB por imagem.

No ambiente acadêmico usando o plano gratuito atual do Cloudinary, o limite técnico efetivo deve ser reduzido ao máximo aceito pelo plano. A aplicação deverá expor o limite efetivo configurado, em vez de permitir um upload que o provedor recusará.

Configuração sugerida:

```env
MAX_IMAGE_UPLOAD_MB=10
MAX_VIDEO_UPLOAD_MB=50
MAX_REVIEW_VIDEO_SECONDS=10
```

Se o plano for alterado futuramente, `MAX_IMAGE_UPLOAD_MB` poderá ser elevado até 50 sem alterar a regra de domínio.

## Vídeos

Vídeos são limitados a 50 MB (`MAX_VIDEO_UPLOAD_MB`) e 10 segundos (`MAX_REVIEW_VIDEO_SECONDS`), respeitando também o limite técnico do plano Cloudinary ativo.

## Segurança

- validar MIME e extensão;
- validar tamanho;
- validar duração de vídeo;
- gerar `publicId` controlado pela aplicação;
- não expor `CLOUDINARY_API_SECRET`;
- apagar asset do Cloudinary apenas após validação de autorização;
- limpar uploads órfãos quando uma operação de cadastro falhar.

## Upload assinado

Implementado em `src/modules/media/` (`media-service.js`, `media-rules.js`, `cloudinary-gateway.js`) e nas rotas `POST /api/media/sign-upload` e `DELETE /api/media/:id` (doc 10).

- O cliente pede a assinatura e envia o arquivo direto ao Cloudinary; nenhum binário passa pela API nem pelo MySQL (RNF029).
- A aplicação gera o `publicId` (`{pasta}/{targetId}/{uuid}`) e ignora o nome original do arquivo, que serve só para conferir a extensão.
- A assinatura cobre `public_id`, `timestamp` e `allowed_formats`; o Cloudinary recusa outro formato e qualquer troca desses campos. Ela vale 1 hora a partir do `timestamp` ([Cloudinary, Authentication signatures](https://cloudinary.com/documentation/authentication_signatures)), e a resposta traz esse prazo em `expiresAt`.
- O upload direto assinado não aceita um limite de tamanho (a referência do upload não tem esse parâmetro: [Upload API](https://cloudinary.com/documentation/image_upload_api_reference_upload)). Por isso o tamanho e a duração são validados pelo valor declarado no pedido de assinatura, e o valor real (`bytes`, `duration`) é conferido de novo quando a mídia é gravada na tabela de imagem ou em `REVIEW_MEDIA`.
- 1 MB = 1.048.576 bytes. As variáveis `MAX_IMAGE_UPLOAD_MB`, `MAX_VIDEO_UPLOAD_MB` e `MAX_REVIEW_VIDEO_SECONDS` só reduzem os tetos do domínio (50 MB, 50 MB e 10 s); valor inválido usa o padrão.
- Galerias de hotel, unidade e tipo aceitam só imagens JPG/JPEG; vídeo só em avaliação (a partir da BE-61). A assinatura exige o hotel em `DRAFT`, como a edição da galeria.
- O `DELETE` apaga do Cloudinary apenas asset ainda não gravado em tabela de imagem, depois de autorizar pelo hotel do alvo. Imagem já gravada sai pela rota da galeria.

## Galerias do hotel e da unidade

As regras ficam num núcleo comum (`src/modules/media/image-gallery.js`), usado por `src/services/hotel-image-service.js` (rotas `/api/hotels/:id/images`) e `src/services/unit-image-service.js` (rotas `/api/units/:id/images`, doc 10). A unidade segue as mesmas regras, sem o limite de 10 fotos (RN086), e também trava a linha do hotel dela.

- O cliente registra a foto só com o `assetId`. O servidor remonta o `publicId` e lê os metadados reais pela Admin API do Cloudinary (`resource`), que é a conferência do tamanho e do formato prevista acima; uma imagem fora do limite ou que não seja JPG/JPEG é apagada do Cloudinary e recusada. Cada registro gasta uma chamada da cota da Admin API.
- O limite de 10 fotos (só no hotel), a capa única e as posições contíguas (0..n-1) são conferidos numa transação que trava a linha do hotel (`SELECT ... FOR UPDATE`), então pedidos simultâneos não passam de 10 fotos nem criam duas capas.
- A primeira foto vira capa; remover a capa promove a primeira foto restante. Uma galeria vazia não tem capa.
- Remover uma foto apaga a linha e, depois do commit, o asset no Cloudinary; se o Cloudinary falhar, o asset vira órfão e fica para a limpeza de órfãos.

## Pastas sugeridas

```text
hotels/{hotelId}
units/{unitId}
room-types/{roomTypeId}
reviews/{reviewId}
reviews/{reviewId}/comments/{commentId}
```

Quartos físicos não possuem galeria própria; as fotos exibidas vêm do tipo de acomodação.
