import { ApiError, CLIENT_ERROR_CODES } from "./api-client.js";
import { ERROR_CODES } from "./errors.js";

export const DEFAULT_ERROR_MESSAGE =
    "Ocorreu um erro inesperado. Tente novamente mais tarde.";

export const ERROR_MESSAGES = Object.freeze({
    [ERROR_CODES.INVALID_CREDENTIALS]: "E-mail ou senha inválidos.",
    [ERROR_CODES.UNAUTHORIZED]: "Sua sessão expirou. Entre novamente.",
    [ERROR_CODES.FORBIDDEN]: "Você não tem permissão para realizar esta ação.",
    [ERROR_CODES.USER_NOT_FOUND]: "Usuário não encontrado.",
    [ERROR_CODES.HOTEL_NOT_FOUND]: "Hotel não encontrado.",
    [ERROR_CODES.INVALID_HOTEL_STATUS]:
        "Esta ação não é permitida no status atual do hotel.",
    [ERROR_CODES.HOTEL_MANAGER_NOT_FOUND]: "Gerente não encontrado no hotel.",
    [ERROR_CODES.HOTEL_MANAGER_ALREADY_EXISTS]:
        "Este usuário já é gerente do hotel.",
    [ERROR_CODES.UNIT_NOT_FOUND]: "Unidade não encontrada.",
    [ERROR_CODES.AMENITY_NOT_FOUND]: "Comodidade não encontrada.",
    [ERROR_CODES.AMENITY_ALREADY_EXISTS]:
        "Já existe uma comodidade com este nome.",
    [ERROR_CODES.POLICY_NOT_FOUND]: "Política não encontrada.",
    [ERROR_CODES.ROOM_TYPE_NOT_FOUND]: "Tipo de quarto não encontrado.",
    [ERROR_CODES.ROOM_NOT_FOUND]: "Quarto não encontrado.",
    [ERROR_CODES.ROOM_INACTIVE]: "Este quarto está inativo.",
    [ERROR_CODES.ROOM_NUMBER_ALREADY_EXISTS]:
        "Já existe um quarto com este número na unidade.",
    [ERROR_CODES.ROOM_TYPE_INACTIVE]: "Este tipo de quarto está inativo.",
    [ERROR_CODES.ROOM_NOT_AVAILABLE]:
        "A acomodação não está disponível no período selecionado.",
    [ERROR_CODES.INVALID_BOOKING_PERIOD]: "Período de reserva inválido.",
    [ERROR_CODES.HOLD_EXPIRED]:
        "O tempo para concluir a reserva expirou. Faça uma nova busca.",
    [ERROR_CODES.OVERBOOKING_LIMIT_REACHED]:
        "Não há mais vagas disponíveis para este período.",
    [ERROR_CODES.RESERVATION_NOT_FOUND]: "Reserva não encontrada.",
    [ERROR_CODES.RESERVATION_CANNOT_BE_CANCELLED]:
        "Esta reserva não pode mais ser cancelada.",
    [ERROR_CODES.RESERVATION_CANNOT_BE_CHANGED]:
        "Esta reserva não pode mais ser alterada.",
    [ERROR_CODES.PAYMENT_FAILED]: "Não foi possível processar o pagamento.",
    [ERROR_CODES.REFUND_FAILED]: "Não foi possível processar o reembolso.",
    [ERROR_CODES.INVALID_GUEST_DATA]: "Dados de hóspede inválidos.",
    [ERROR_CODES.INVALID_CPF]: "CPF inválido.",
    [ERROR_CODES.INVALID_CNPJ]: "CNPJ inválido.",
    [ERROR_CODES.VALIDATION_ERROR]: "Verifique os dados informados.",
    [ERROR_CODES.USER_ALREADY_EXISTS]: "E-mail ou CPF já cadastrado.",
    [ERROR_CODES.INTERNAL_ERROR]: DEFAULT_ERROR_MESSAGE,
    [ERROR_CODES.SERVICE_UNAVAILABLE]:
        "Serviço indisponível no momento. Tente novamente em instantes.",
    [ERROR_CODES.RATE_LIMITED]:
        "Muitas tentativas. Tente novamente em alguns minutos.",
    [ERROR_CODES.INVALID_RESET_TOKEN]:
        "Link de recuperação inválido ou expirado. Solicite um novo.",
    [ERROR_CODES.INVALID_MEDIA_TYPE]: "Formato de arquivo não aceito.",
    [ERROR_CODES.MEDIA_TOO_LARGE]:
        "O arquivo excede o tamanho máximo permitido.",
    [ERROR_CODES.VIDEO_TOO_LONG]: "O vídeo excede a duração máxima permitida.",
    [ERROR_CODES.MEDIA_NOT_FOUND]: "Mídia não encontrada.",
    [ERROR_CODES.MEDIA_IN_USE]:
        "A mídia está em uso e não pode ser removida por aqui.",
    [ERROR_CODES.HOTEL_IMAGE_NOT_FOUND]: "Foto não encontrada.",
    [ERROR_CODES.HOTEL_IMAGE_LIMIT_REACHED]:
        "O hotel já tem o número máximo de fotos.",
    [ERROR_CODES.UNIT_IMAGE_NOT_FOUND]: "Foto não encontrada.",
    [ERROR_CODES.ROOM_TYPE_IMAGE_NOT_FOUND]: "Foto não encontrada.",
    [ERROR_CODES.PRICE_PERIOD_NOT_FOUND]: "Período de preço não encontrado.",
    [ERROR_CODES.PRICE_PERIOD_OVERLAP]:
        "Já existe um período de preço nessas datas para este quarto.",
    [ERROR_CODES.PRICE_PERIOD_PAST]:
        "Períodos já iniciados não podem ser alterados nem excluídos.",
    [ERROR_CODES.GEOCODING_NOT_FOUND]:
        "Não encontramos esse endereço no mapa. Confira os dados.",
    [CLIENT_ERROR_CODES.NETWORK_ERROR]:
        "Não foi possível conectar ao servidor. Verifique sua conexão.",
});

export function getErrorMessage(code) {
    if (Object.hasOwn(ERROR_MESSAGES, code)) {
        return ERROR_MESSAGES[code];
    }
    return DEFAULT_ERROR_MESSAGE;
}

const SECONDS_PER_MINUTE = 60;

function formatWaitTime(retryAfterSeconds) {
    const minutes = Math.max(
        1,
        Math.ceil(retryAfterSeconds / SECONDS_PER_MINUTE),
    );
    return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}

function hasRetryAfter(error) {
    return (
        error.code === ERROR_CODES.RATE_LIMITED &&
        Number.isInteger(error.retryAfterSeconds)
    );
}

export function formatRateLimitMessage(retryAfterSeconds) {
    return `Muitas tentativas. Tente novamente em ${formatWaitTime(retryAfterSeconds)}.`;
}

export function resolveErrorMessage(error) {
    if (!(error instanceof ApiError)) {
        return DEFAULT_ERROR_MESSAGE;
    }
    if (hasRetryAfter(error)) {
        return formatRateLimitMessage(error.retryAfterSeconds);
    }
    return error.message || getErrorMessage(error.code);
}
