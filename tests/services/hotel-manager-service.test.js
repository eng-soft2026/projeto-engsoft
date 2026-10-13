import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from "../../src/lib/errors.js";
import { createHotelManagerService } from "../../src/services/hotel-manager-service.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

const OWNER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const COMANAGER = Object.freeze({ id: "manager-3", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });

const CANDIDATE = Object.freeze({
    id: "manager-4",
    name: "Gestor Quatro",
    email: "quatro@marazul.example.com",
    cpf: "52998224725",
    role: "MANAGER",
    isActive: true,
});

describe("hotelManagerService", () => {
    let hotelRepository;
    let hotelManagerRepository;
    let userRepository;
    let service;

    beforeEach(() => {
        hotelRepository = {
            findById: vi.fn(async () => ({
                id: HOTEL_ID,
                ownerUserId: OWNER.id,
                managers: [{ userId: COMANAGER.id }],
            })),
        };
        hotelManagerRepository = {
            exists: vi.fn(async () => false),
            create: vi.fn(async () => ({})),
            delete: vi.fn(async () => true),
        };
        userRepository = { findByEmail: vi.fn(async () => ({ ...CANDIDATE })) };
        service = createHotelManagerService({
            hotelRepository,
            hotelManagerRepository,
            userRepository,
        });
    });

    describe("addManager", () => {
        it("links a MANAGER user and returns only id, name and e-mail", async () => {
            const manager = await service.addManager(OWNER, HOTEL_ID, {
                email: CANDIDATE.email,
            });

            expect(hotelManagerRepository.create).toHaveBeenCalledWith(
                HOTEL_ID,
                CANDIDATE.id,
            );
            expect(manager).toEqual({
                id: CANDIDATE.id,
                name: CANDIDATE.name,
                email: CANDIDATE.email,
            });
        });

        it.each([
            ["an additional manager", COMANAGER],
            ["another manager", OTHER_MANAGER],
        ])(
            "answers HOTEL_NOT_FOUND to %s: only the owner changes the list (RN110)",
            async (label, user) => {
                const add = service.addManager(user, HOTEL_ID, {
                    email: CANDIDATE.email,
                });

                await expect(add).rejects.toThrow(NotFoundError);
                await expect(add).rejects.toMatchObject({
                    code: "HOTEL_NOT_FOUND",
                });
                expect(hotelManagerRepository.create).not.toHaveBeenCalled();
            },
        );

        it("answers HOTEL_NOT_FOUND for an unknown hotel", async () => {
            hotelRepository.findById.mockResolvedValue(null);

            await expect(
                service.addManager(OWNER, HOTEL_ID, { email: CANDIDATE.email }),
            ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
        });

        it("answers USER_NOT_FOUND for an unknown e-mail", async () => {
            userRepository.findByEmail.mockResolvedValue(null);

            const add = service.addManager(OWNER, HOTEL_ID, {
                email: "nobody@example.com",
            });

            await expect(add).rejects.toThrow(NotFoundError);
            await expect(add).rejects.toMatchObject({
                code: "USER_NOT_FOUND",
            });
        });

        it.each([
            ["a CUSTOMER", { role: "CUSTOMER" }],
            ["an ADMIN", { role: "ADMIN" }],
            ["an inactive manager", { isActive: false }],
        ])(
            "rejects %s: the user must be an active MANAGER",
            async (label, patch) => {
                userRepository.findByEmail.mockResolvedValue({
                    ...CANDIDATE,
                    ...patch,
                });

                const add = service.addManager(OWNER, HOTEL_ID, {
                    email: CANDIDATE.email,
                });

                await expect(add).rejects.toThrow(ValidationError);
                expect(hotelManagerRepository.create).not.toHaveBeenCalled();
            },
        );

        it("does not duplicate the owner in the list", async () => {
            userRepository.findByEmail.mockResolvedValue({
                ...CANDIDATE,
                id: OWNER.id,
            });

            const add = service.addManager(OWNER, HOTEL_ID, {
                email: CANDIDATE.email,
            });

            await expect(add).rejects.toThrow(ConflictError);
            await expect(add).rejects.toMatchObject({
                code: "HOTEL_MANAGER_ALREADY_EXISTS",
            });
            expect(hotelManagerRepository.create).not.toHaveBeenCalled();
        });

        it("rejects a user who is already an additional manager", async () => {
            hotelManagerRepository.exists.mockResolvedValue(true);

            await expect(
                service.addManager(OWNER, HOTEL_ID, { email: CANDIDATE.email }),
            ).rejects.toMatchObject({
                code: "HOTEL_MANAGER_ALREADY_EXISTS",
            });
        });

        it("turns a unique violation from a parallel request into the same conflict", async () => {
            hotelManagerRepository.create.mockRejectedValue(
                Object.assign(new Error("duplicate"), { code: "P2002" }),
            );

            await expect(
                service.addManager(OWNER, HOTEL_ID, { email: CANDIDATE.email }),
            ).rejects.toMatchObject({
                code: "HOTEL_MANAGER_ALREADY_EXISTS",
            });
        });

        it("rethrows unexpected persistence errors", async () => {
            const failure = new Error("connection lost");
            hotelManagerRepository.create.mockRejectedValue(failure);

            await expect(
                service.addManager(OWNER, HOTEL_ID, { email: CANDIDATE.email }),
            ).rejects.toBe(failure);
        });
    });

    describe("removeManager", () => {
        it("unlinks the additional manager", async () => {
            await service.removeManager(OWNER, HOTEL_ID, COMANAGER.id);

            expect(hotelManagerRepository.delete).toHaveBeenCalledWith(
                HOTEL_ID,
                COMANAGER.id,
            );
        });

        it.each([
            ["an additional manager", COMANAGER],
            ["another manager", OTHER_MANAGER],
        ])("answers HOTEL_NOT_FOUND to %s", async (label, user) => {
            await expect(
                service.removeManager(user, HOTEL_ID, COMANAGER.id),
            ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
            expect(hotelManagerRepository.delete).not.toHaveBeenCalled();
        });

        it("answers HOTEL_MANAGER_NOT_FOUND when the user is not an additional manager", async () => {
            hotelManagerRepository.delete.mockResolvedValue(false);

            const remove = service.removeManager(OWNER, HOTEL_ID, OWNER.id);

            await expect(remove).rejects.toThrow(NotFoundError);
            await expect(remove).rejects.toMatchObject({
                code: "HOTEL_MANAGER_NOT_FOUND",
            });
        });
    });
});
