import { describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import { ERROR_CODES } from "../../src/lib/errors.js";
import { createPolicyService } from "../../src/services/policy-service.js";

const HOTEL_ID = "hotel-1";
const POLICY_ID = "policy-1";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const ADDITIONAL_MANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });

const INPUT = Object.freeze({
    type: "CANCELLATION",
    title: "Cancelamento",
    description: "Texto complementar.",
});

function createWorld({ hotelStatus = HOTEL_STATUSES.DRAFT } = {}) {
    const hotel = {
        ownerUserId: OWNER.id,
        status: hotelStatus,
        managers: [{ userId: ADDITIONAL_MANAGER.id }],
    };
    const stored = {
        id: POLICY_ID,
        hotelId: HOTEL_ID,
        ...INPUT,
        isSystem: false,
        isActive: true,
    };
    const hotelRepository = {
        findById: vi.fn(async (id) => (id === HOTEL_ID ? { ...hotel } : null)),
    };
    const hotelPolicyRepository = {
        create: vi.fn(async (data) => ({ id: POLICY_ID, ...data })),
        findByIdWithHotel: vi.fn(async (id) =>
            id === POLICY_ID ? { ...stored, hotel: { ...hotel } } : null,
        ),
        listByHotel: vi.fn(async () => [stored]),
        updateFields: vi.fn(async () => {}),
    };
    const transactionRunner = {
        run: vi.fn(async (work) => work(TRANSACTION_CLIENT)),
    };
    const service = createPolicyService({
        hotelPolicyRepository,
        hotelRepository,
        transactionRunner,
    });
    return { service, hotelPolicyRepository };
}

describe("policyService.createPolicy", () => {
    it("creates a manager policy in the transaction (RF029)", async () => {
        const { service, hotelPolicyRepository } = createWorld();

        await service.createPolicy(OWNER, HOTEL_ID, INPUT);

        expect(hotelPolicyRepository.create).toHaveBeenCalledWith(
            { hotelId: HOTEL_ID, ...INPUT },
            TRANSACTION_CLIENT,
        );
    });

    it("lets an additional manager create", async () => {
        const { service } = createWorld();

        await expect(
            service.createPolicy(ADDITIONAL_MANAGER, HOTEL_ID, INPUT),
        ).resolves.toMatchObject({ id: POLICY_ID });
    });

    it("refuses when the hotel is not in DRAFT (RN120)", async () => {
        const { service, hotelPolicyRepository } = createWorld({
            hotelStatus: HOTEL_STATUSES.PUBLISHED,
        });

        await expect(
            service.createPolicy(OWNER, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(hotelPolicyRepository.create).not.toHaveBeenCalled();
    });

    it("hides the hotel from other managers and from the admin", async () => {
        const { service } = createWorld();

        await expect(
            service.createPolicy(OTHER_MANAGER, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
        await expect(
            service.createPolicy(ADMIN, HOTEL_ID, INPUT),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
    });
});

describe("policyService reads", () => {
    it("lists the policies for the owner and the admin", async () => {
        const { service } = createWorld();

        await expect(
            service.listPolicies(OWNER, HOTEL_ID),
        ).resolves.toHaveLength(1);
        await expect(
            service.listPolicies(ADMIN, HOTEL_ID),
        ).resolves.toHaveLength(1);
    });

    it("answers 404 to a manager outside the hotel", async () => {
        const { service } = createWorld();

        await expect(
            service.listPolicies(OTHER_MANAGER, HOTEL_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.HOTEL_NOT_FOUND });
        await expect(
            service.getPolicy(OTHER_MANAGER, POLICY_ID),
        ).rejects.toMatchObject({ code: ERROR_CODES.POLICY_NOT_FOUND });
    });

    it("does not leak the hotel access data", async () => {
        const { service } = createWorld();

        const policy = await service.getPolicy(OWNER, POLICY_ID);

        expect(policy).not.toHaveProperty("hotel");
    });
});

describe("policyService.updatePolicy", () => {
    it("writes only the sent fields with a new updatedAt", async () => {
        const { service, hotelPolicyRepository } = createWorld();

        await service.updatePolicy(OWNER, POLICY_ID, {
            title: "Novo título",
            isActive: false,
        });

        expect(hotelPolicyRepository.updateFields).toHaveBeenCalledWith(
            POLICY_ID,
            {
                title: "Novo título",
                isActive: false,
                updatedAt: expect.any(Date),
            },
            TRANSACTION_CLIENT,
        );
    });

    it("refuses when the hotel is not in DRAFT (RN120)", async () => {
        const { service, hotelPolicyRepository } = createWorld({
            hotelStatus: HOTEL_STATUSES.BLOCKED,
        });

        await expect(
            service.updatePolicy(OWNER, POLICY_ID, { title: "Novo" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_HOTEL_STATUS });
        expect(hotelPolicyRepository.updateFields).not.toHaveBeenCalled();
    });

    it("answers 404 POLICY_NOT_FOUND for an unknown policy or a stranger", async () => {
        const { service } = createWorld();

        await expect(
            service.updatePolicy(OWNER, "missing", { title: "Novo" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.POLICY_NOT_FOUND });
        await expect(
            service.updatePolicy(OTHER_MANAGER, POLICY_ID, { title: "Novo" }),
        ).rejects.toMatchObject({ code: ERROR_CODES.POLICY_NOT_FOUND });
    });
});
