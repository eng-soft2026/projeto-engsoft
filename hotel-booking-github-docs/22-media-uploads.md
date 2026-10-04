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

## Pastas sugeridas

```text
hotels/{hotelId}
units/{unitId}
room-types/{roomTypeId}
reviews/{reviewId}
reviews/{reviewId}/comments/{commentId}
```

Quartos físicos não possuem galeria própria; as fotos exibidas vêm do tipo de acomodação.
