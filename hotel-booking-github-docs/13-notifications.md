# 13 — Notificações

## Canais

- in-app;
- e-mail.

## Cliente

Notificar em:

- reserva criada;
- pagamento confirmado;
- pagamento recusado;
- reserva confirmada;
- alteração;
- cancelamento;
- reembolso solicitado;
- reembolso concluído;
- reembolso falhou;
- lembrete de check-in;
- resposta em avaliação;
- intervenção administrativa relevante.

## Gestor

Notificar em:

- nova reserva;
- cancelamento;
- alteração;
- pagamento confirmado;
- reembolso;
- nova avaliação;
- denúncia;
- hotel aprovado;
- hotel bloqueado;
- correções solicitadas pelo administrador (hotel devolvido para rascunho);
- hotel desbloqueado;
- alerta de overbooking;
- conflito causado por bloqueio de quarto.

## Administrador

Notificar em:

- novo hotel para aprovação;
- denúncia de avaliação;
- evento crítico de pagamento;
- alertas de overbooking;
- bloqueios e problemas operacionais.

## Lembrete

Enviar 48 horas antes do check-in.

## Arquitetura

```text
NotificationService
    ├── InAppNotificationService
    └── EmailService
```

O domínio não deve depender diretamente do provedor de e-mail.


## Implementação de e-mail

Utilizar Nodemailer com transporte SMTP configurado por variáveis de ambiente.

O domínio não deverá conhecer host, porta ou credenciais SMTP.

Variáveis esperadas:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
```

## Templates

Cada e-mail deverá possuir:

- assunto específico;
- versão HTML;
- versão em texto puro;
- cabeçalho com identidade visual da plataforma;
- card/resumo da ação principal;
- CTA quando existir ação possível;
- rodapé com informação de envio automático.

CSS deverá ser simples e compatível com clientes de e-mail, preferencialmente inline ou processado para inline. Imagens de branding poderão ser entregues por URL segura do Cloudinary.

## Fila

E-mails serão enfileirados no RabbitMQ.

```text
application
→ email.send
→ EmailWorker
→ Nodemailer
→ SMTP
```

## Retry

Falha transitória:

```text
falha
→ retry em 30 minutos
→ máximo 3 tentativas totais
→ Dead Letter Queue
```

Falhas permanentes conhecidas, como endereço inválido, poderão ir diretamente para estado de erro sem repetir indefinidamente.
