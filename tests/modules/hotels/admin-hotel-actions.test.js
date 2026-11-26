import { describe, expect, it } from "vitest";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    ADMIN_ACTION_REASON_MAX_LENGTH,
    ADMIN_HOTEL_ACTIONS,
    UNBLOCK_TARGET_OPTIONS,
    buildAdminActionRequest,
    getAvailableAdminActions,
    validateAdminActionInput,
} from "../../../src/modules/hotels/admin-hotel-actions.js";
import { HOTEL_ACTIONS } from "../../../src/modules/hotels/hotel-status-machine.js";

const { DRAFT, UNDER_REVIEW, PUBLISHED, BLOCKED } = HOTEL_STATUSES;
const APPROVE = ADMIN_HOTEL_ACTIONS[HOTEL_ACTIONS.APPROVE];
const UNBLOCK = ADMIN_HOTEL_ACTIONS[HOTEL_ACTIONS.UNBLOCK];

describe("getAvailableAdminActions", () => {
    it.each([
        [DRAFT, []],
        [
            UNDER_REVIEW,
            [
                HOTEL_ACTIONS.APPROVE,
                HOTEL_ACTIONS.REQUEST_CHANGES,
                HOTEL_ACTIONS.BLOCK,
            ],
        ],
        [PUBLISHED, [HOTEL_ACTIONS.BLOCK]],
        [BLOCKED, [HOTEL_ACTIONS.UNBLOCK]],
    ])("offers the admin actions allowed from %s", (status, actions) => {
        expect(
            getAvailableAdminActions(status).map(({ action }) => action),
        ).toEqual(actions);
    });

    it("never offers the manager submission to the admin", () => {
        expect(getAvailableAdminActions(DRAFT)).toEqual([]);
    });

    it("asks for a target status only when unblocking", () => {
        const actionsRequiringTarget = Object.values(ADMIN_HOTEL_ACTIONS)
            .filter(({ requiresTargetStatus }) => requiresTargetStatus)
            .map(({ action }) => action);

        expect(actionsRequiringTarget).toEqual([HOTEL_ACTIONS.UNBLOCK]);
    });
});

describe("UNBLOCK_TARGET_OPTIONS", () => {
    it("offers published and draft as unblock targets", () => {
        expect(UNBLOCK_TARGET_OPTIONS).toEqual([
            { value: PUBLISHED, label: "Publicar novamente" },
            { value: DRAFT, label: "Devolver para rascunho" },
        ]);
    });
});

describe("validateAdminActionInput", () => {
    it.each(["", "   ", undefined])(
        "refuses an empty reason (%j)",
        (reason) => {
            expect(validateAdminActionInput(APPROVE, { reason })).toBe(
                "Informe o motivo da ação.",
            );
        },
    );

    it("refuses a reason longer than the limit", () => {
        const reason = "a".repeat(ADMIN_ACTION_REASON_MAX_LENGTH + 1);

        expect(validateAdminActionInput(APPROVE, { reason })).toBe(
            `O motivo deve ter no máximo ${ADMIN_ACTION_REASON_MAX_LENGTH} caracteres.`,
        );
    });

    it("accepts a reason at the limit", () => {
        const reason = "a".repeat(ADMIN_ACTION_REASON_MAX_LENGTH);

        expect(validateAdminActionInput(APPROVE, { reason })).toBeNull();
    });

    it.each(["", BLOCKED, UNDER_REVIEW])(
        "refuses an unblock without a valid target (%j)",
        (targetStatus) => {
            expect(
                validateAdminActionInput(UNBLOCK, {
                    reason: "Documentação regularizada",
                    targetStatus,
                }),
            ).toBe("Escolha o status de destino.");
        },
    );

    it("accepts an unblock with reason and target", () => {
        expect(
            validateAdminActionInput(UNBLOCK, {
                reason: "Documentação regularizada",
                targetStatus: DRAFT,
            }),
        ).toBeNull();
    });
});

describe("buildAdminActionRequest", () => {
    it("posts the trimmed reason to the action route", () => {
        expect(
            buildAdminActionRequest("hotel-1", APPROVE, {
                reason: "  Cadastro completo  ",
                targetStatus: PUBLISHED,
            }),
        ).toEqual({
            path: "/api/admin/hotels/hotel-1/approve",
            options: { method: "POST", body: { reason: "Cadastro completo" } },
        });
    });

    it("sends the target status when unblocking", () => {
        expect(
            buildAdminActionRequest("hotel-1", UNBLOCK, {
                reason: "Corrigir fotos",
                targetStatus: DRAFT,
            }),
        ).toEqual({
            path: "/api/admin/hotels/hotel-1/unblock",
            options: {
                method: "POST",
                body: { reason: "Corrigir fotos", targetStatus: DRAFT },
            },
        });
    });

    it.each([
        [HOTEL_ACTIONS.REQUEST_CHANGES, "request-changes"],
        [HOTEL_ACTIONS.BLOCK, "block"],
    ])("targets the %s route", (action, path) => {
        expect(
            buildAdminActionRequest("hotel-1", ADMIN_HOTEL_ACTIONS[action], {
                reason: "Motivo",
            }).path,
        ).toBe(`/api/admin/hotels/hotel-1/${path}`);
    });
});
