import { AUDIT_REASON_MAX_LENGTH } from "../../constants/audit.js";
import { HOTEL_STATUSES } from "../../constants/hotel-statuses.js";
import {
    HOTEL_ACTIONS,
    UNBLOCK_TARGET_STATUSES,
    listAvailableActions,
} from "./hotel-status-machine.js";

export const ADMIN_ACTION_REASON_MAX_LENGTH = AUDIT_REASON_MAX_LENGTH;

export const ADMIN_HOTEL_ACTIONS = Object.freeze({
    [HOTEL_ACTIONS.APPROVE]: Object.freeze({
        action: HOTEL_ACTIONS.APPROVE,
        path: "approve",
        label: "Aprovar",
        title: "Aprovar e publicar o hotel?",
        description:
            "O hotel fica visível para os clientes. O motivo vai para o log de auditoria.",
        confirmLabel: "Aprovar e publicar",
        successMessage: "Hotel aprovado e publicado.",
        variant: "primary",
        requiresTargetStatus: false,
    }),
    [HOTEL_ACTIONS.REQUEST_CHANGES]: Object.freeze({
        action: HOTEL_ACTIONS.REQUEST_CHANGES,
        path: "request-changes",
        label: "Solicitar correções",
        title: "Devolver o hotel para correções?",
        description:
            "O hotel volta para rascunho e o gestor vê o motivo como observação para corrigir e reenviar.",
        confirmLabel: "Solicitar correções",
        successMessage: "Hotel devolvido para correções.",
        variant: "secondary",
        requiresTargetStatus: false,
    }),
    [HOTEL_ACTIONS.BLOCK]: Object.freeze({
        action: HOTEL_ACTIONS.BLOCK,
        path: "block",
        label: "Bloquear",
        title: "Bloquear o hotel?",
        description:
            "O hotel deixa de aparecer para os clientes e o gestor vê o motivo como observação.",
        confirmLabel: "Bloquear hotel",
        successMessage: "Hotel bloqueado.",
        variant: "danger",
        requiresTargetStatus: false,
    }),
    [HOTEL_ACTIONS.UNBLOCK]: Object.freeze({
        action: HOTEL_ACTIONS.UNBLOCK,
        path: "unblock",
        label: "Desbloquear",
        title: "Desbloquear o hotel?",
        description:
            "Publique o hotel de novo ou devolva-o para rascunho quando o gestor precisar corrigir dados. O gestor vê o motivo como observação.",
        confirmLabel: "Desbloquear",
        successMessage: "Hotel desbloqueado.",
        variant: "primary",
        requiresTargetStatus: true,
    }),
});

const UNBLOCK_TARGET_LABELS = Object.freeze({
    [HOTEL_STATUSES.PUBLISHED]: "Publicar novamente",
    [HOTEL_STATUSES.DRAFT]: "Devolver para rascunho",
});

export const UNBLOCK_TARGET_OPTIONS = Object.freeze(
    UNBLOCK_TARGET_STATUSES.map((status) =>
        Object.freeze({ value: status, label: UNBLOCK_TARGET_LABELS[status] }),
    ),
);

export function getAvailableAdminActions(status) {
    return listAvailableActions(status)
        .map((action) => ADMIN_HOTEL_ACTIONS[action])
        .filter(Boolean);
}

export function validateAdminActionInput(
    adminAction,
    { reason = "", targetStatus = "" },
) {
    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) {
        return "Informe o motivo da ação.";
    }
    if (trimmedReason.length > ADMIN_ACTION_REASON_MAX_LENGTH) {
        return `O motivo deve ter no máximo ${ADMIN_ACTION_REASON_MAX_LENGTH} caracteres.`;
    }
    if (
        adminAction.requiresTargetStatus &&
        !UNBLOCK_TARGET_STATUSES.includes(targetStatus)
    ) {
        return "Escolha o status de destino.";
    }
    return null;
}

export function buildAdminActionRequest(
    hotelId,
    adminAction,
    { reason, targetStatus },
) {
    const body = { reason: reason.trim() };
    if (adminAction.requiresTargetStatus) {
        body.targetStatus = targetStatus;
    }
    return {
        path: `/api/admin/hotels/${hotelId}/${adminAction.path}`,
        options: { method: "POST", body },
    };
}
