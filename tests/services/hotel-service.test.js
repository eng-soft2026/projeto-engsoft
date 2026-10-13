import { afterEach, describe, expect, it, vi } from "vitest";
import { HOTEL_STATUSES } from "../../src/constants/hotel-statuses.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from "../../src/lib/errors.js";
import { createHotelService } from "../../src/services/hotel-service.js";

const { DRAFT, UNDER_REVIEW, PUBLISHED, BLOCKED } = HOTEL_STATUSES;

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const TRANSACTION_CLIENT = Object.freeze({ id: "transaction-client" });

const MANAGER = Object.freeze({ id: "manager-1", role: "MANAGER" });
const OTHER_MANAGER = Object.freeze({ id: "manager-2", role: "MANAGER" });
const ADMIN = Object.freeze({ id: "admin-1", role: "ADMIN" });
const CUSTOMER = Object.freeze({ id: "customer-1", role: "CUSTOMER" });

const HOTEL_INPUT = Object.freeze({
    name: "Hotel Mar Azul",
    description: "Hotel à beira-mar com café da manhã incluso.",
    category: "4 estrelas",
    cnpj: "11222333000181",
    email: "contato@marazul.example.com",
});

const REQUEST_CONTEXT = Object.freeze({
    requestId: "req-1",
    ipAddress: "203.0.113.7",
    userAgent: "Mozilla/5.0",
});

const REASON = "Motivo da decisão.";

function buildHotel(status) {
    return {
        id: HOTEL_ID,
        ownerUserId: MANAGER.id,
        ...HOTEL_INPUT,
        status,
        isActive: true,
    };
}

function definedFields(data) {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
    );
}

function createWorld(initialHotel) {
    const state = { hotel: initialHotel, reviewNotes: [], auditEntries: [] };
    const order = [];

    function hasHotelWithStatus(id, status) {
        return state.hotel?.id === id && state.hotel.status === status;
    }

    const hotelRepository = {
        create: vi.fn(async (data) => ({
            id: HOTEL_ID,
            isActive: true,
            ...data,
        })),
        findById: vi.fn(async (id) =>
            state.hotel?.id === id ? { ...state.hotel } : null,
        ),
        findByIdWithReviewNotes: vi.fn(async (id) =>
            state.hotel?.id === id
                ? { ...state.hotel, reviewNotes: [...state.reviewNotes] }
                : null,
        ),
        listByOwner: vi.fn(async () =>
            state.hotel ? [{ ...state.hotel }] : [],
        ),
        listForReview: vi.fn(async () =>
            state.hotel ? [{ ...state.hotel }] : [],
        ),
        updateFieldsIfStatus: vi.fn(async (id, expectedStatus, data) => {
            if (!hasHotelWithStatus(id, expectedStatus)) {
                return false;
            }
            state.hotel = { ...state.hotel, ...definedFields(data) };
            return true;
        }),
        updateStatusIfCurrent: vi.fn(async (id, expectedStatus, nextStatus) => {
            if (!hasHotelWithStatus(id, expectedStatus)) {
                return false;
            }
            state.hotel = { ...state.hotel, status: nextStatus };
            return true;
        }),
    };

    const hotelReviewNoteRepository = {
        create: vi.fn(async (note) => {
            state.reviewNotes.push(note);
            return { id: `note-${state.reviewNotes.length}` };
        }),
    };

    const auditLogger = {
        recordAdminAction: vi.fn(async (entry) => {
            state.auditEntries.push(entry);
        }),
    };

    const transactionRunner = {
        run: vi.fn(async (work) => {
            const snapshot = {
                hotel: state.hotel,
                reviewNotes: [...state.reviewNotes],
                auditEntries: [...state.auditEntries],
            };
            try {
                const result = await work(TRANSACTION_CLIENT);
                order.push("commit");
                return result;
            } catch (error) {
                Object.assign(state, snapshot);
                throw error;
            }
        }),
    };

    const hotelEvents = {
        publish: vi.fn(async () => {
            order.push("publish");
        }),
    };

    const service = createHotelService({
        hotelRepository,
        hotelReviewNoteRepository,
        auditLogger,
        transactionRunner,
        hotelEvents,
    });

    return {
        state,
        order,
        hotelRepository,
        hotelReviewNoteRepository,
        auditLogger,
        transactionRunner,
        hotelEvents,
        service,
    };
}

describe("hotelService", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createHotel (RF007, RF008)", () => {
        it("creates the hotel as a DRAFT owned by the manager", async () => {
            const { service, hotelRepository } = createWorld(null);

            const hotel = await service.createHotel(MANAGER, HOTEL_INPUT);

            expect(hotelRepository.create).toHaveBeenCalledWith({
                ownerUserId: "manager-1",
                ...HOTEL_INPUT,
                status: "DRAFT",
            });
            expect(hotel).toMatchObject({
                ownerUserId: "manager-1",
                status: "DRAFT",
            });
        });

        it("takes the owner and the status from the session, never from the input", async () => {
            const { service, hotelRepository } = createWorld(null);

            await service.createHotel(MANAGER, {
                ...HOTEL_INPUT,
                ownerUserId: "someone-else",
                status: "PUBLISHED",
                isActive: false,
            });

            expect(hotelRepository.create).toHaveBeenCalledWith({
                ownerUserId: "manager-1",
                ...HOTEL_INPUT,
                status: "DRAFT",
            });
        });

        it.each([
            ["CUSTOMER", CUSTOMER],
            ["ADMIN", ADMIN],
        ])(
            "refuses a user with the %s role: the owner must be a MANAGER (RN109)",
            async (role, user) => {
                const { service, hotelRepository } = createWorld(null);

                await expect(
                    service.createHotel(user, HOTEL_INPUT),
                ).rejects.toThrow(ForbiddenError);

                expect(hotelRepository.create).not.toHaveBeenCalled();
            },
        );
    });

    describe("listOwnHotels", () => {
        it("lists only the hotels owned by the manager", async () => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));

            const hotels = await service.listOwnHotels(MANAGER);

            expect(hotelRepository.listByOwner).toHaveBeenCalledWith(
                "manager-1",
            );
            expect(hotels).toHaveLength(1);
        });
    });

    describe("listHotelsForReview", () => {
        it("lists hotels for the administrator, filtered by status", async () => {
            const { service, hotelRepository } = createWorld(
                buildHotel(UNDER_REVIEW),
            );

            const hotels = await service.listHotelsForReview(ADMIN, {
                status: "UNDER_REVIEW",
            });

            expect(hotelRepository.listForReview).toHaveBeenCalledWith({
                status: "UNDER_REVIEW",
            });
            expect(hotels).toHaveLength(1);
        });

        it("lists every status without a filter", async () => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));

            await service.listHotelsForReview(ADMIN);

            expect(hotelRepository.listForReview).toHaveBeenCalledWith({
                status: undefined,
            });
        });

        it.each([
            ["MANAGER", MANAGER],
            ["CUSTOMER", CUSTOMER],
        ])("refuses a %s", async (role, user) => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));

            await expect(service.listHotelsForReview(user, {})).rejects.toThrow(
                ForbiddenError,
            );

            expect(hotelRepository.listForReview).not.toHaveBeenCalled();
        });
    });

    describe("getHotel", () => {
        it("returns the hotel and its review notes to the owner", async () => {
            const { service, state } = createWorld(buildHotel(DRAFT));
            state.reviewNotes.push({ notes: "Corrigir o CNPJ." });

            const hotel = await service.getHotel(MANAGER, HOTEL_ID);

            expect(hotel).toMatchObject({ id: HOTEL_ID, status: "DRAFT" });
            expect(hotel.reviewNotes).toEqual([{ notes: "Corrigir o CNPJ." }]);
        });

        it("lets the administrator read any hotel (doc 15)", async () => {
            const { service } = createWorld(buildHotel(UNDER_REVIEW));

            await expect(
                service.getHotel(ADMIN, HOTEL_ID),
            ).resolves.toMatchObject({
                id: HOTEL_ID,
            });
        });

        it.each([
            ["another manager", OTHER_MANAGER],
            ["a customer", CUSTOMER],
        ])(
            "answers HOTEL_NOT_FOUND to %s, hiding that the hotel exists",
            async (label, user) => {
                const { service } = createWorld(buildHotel(DRAFT));

                const read = service.getHotel(user, HOTEL_ID);

                await expect(read).rejects.toThrow(NotFoundError);
                await expect(read).rejects.toMatchObject({
                    code: "HOTEL_NOT_FOUND",
                });
            },
        );

        it("answers HOTEL_NOT_FOUND for a hotel that does not exist", async () => {
            const { service } = createWorld(null);

            await expect(
                service.getHotel(MANAGER, HOTEL_ID),
            ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
        });
    });

    describe("updateHotel (RF007)", () => {
        it("updates a DRAFT hotel and returns the fresh data", async () => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));

            const hotel = await service.updateHotel(MANAGER, HOTEL_ID, {
                name: "Hotel Novo Nome",
                cnpj: "12ABC34501DE35",
            });

            expect(hotelRepository.updateFieldsIfStatus).toHaveBeenCalledWith(
                HOTEL_ID,
                "DRAFT",
                { name: "Hotel Novo Nome", cnpj: "12ABC34501DE35" },
            );
            expect(hotel).toMatchObject({
                name: "Hotel Novo Nome",
                cnpj: "12ABC34501DE35",
                status: "DRAFT",
                category: "4 estrelas",
            });
        });

        it("ignores fields that are not editable", async () => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));

            await service.updateHotel(MANAGER, HOTEL_ID, {
                name: "Hotel Novo Nome",
                status: "PUBLISHED",
                ownerUserId: "someone-else",
            });

            const [, , data] =
                hotelRepository.updateFieldsIfStatus.mock.calls[0];
            expect(definedFields(data)).toEqual({ name: "Hotel Novo Nome" });
        });

        it.each([
            ["another manager", OTHER_MANAGER],
            ["a customer", CUSTOMER],
        ])(
            "answers HOTEL_NOT_FOUND to %s and writes nothing",
            async (label, user) => {
                const { service, hotelRepository } = createWorld(
                    buildHotel(DRAFT),
                );

                await expect(
                    service.updateHotel(user, HOTEL_ID, { name: "Invasor" }),
                ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });

                expect(
                    hotelRepository.updateFieldsIfStatus,
                ).not.toHaveBeenCalled();
            },
        );

        it("answers HOTEL_NOT_FOUND for a hotel that does not exist", async () => {
            const { service } = createWorld(null);

            await expect(
                service.updateHotel(MANAGER, HOTEL_ID, { name: "Hotel" }),
            ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
        });

        it.each([UNDER_REVIEW, PUBLISHED, BLOCKED])(
            "does not edit a %s hotel: only a DRAFT is editable",
            async (status) => {
                const { service, hotelRepository } = createWorld(
                    buildHotel(status),
                );

                const update = service.updateHotel(MANAGER, HOTEL_ID, {
                    name: "Outro nome",
                });

                await expect(update).rejects.toThrow(ConflictError);
                await expect(update).rejects.toMatchObject({
                    code: "INVALID_HOTEL_STATUS",
                });
                expect(
                    hotelRepository.updateFieldsIfStatus,
                ).not.toHaveBeenCalled();
            },
        );

        it("answers INVALID_HOTEL_STATUS when the status changes during the update", async () => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));
            hotelRepository.updateFieldsIfStatus.mockResolvedValueOnce(false);

            await expect(
                service.updateHotel(MANAGER, HOTEL_ID, { name: "Outro nome" }),
            ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        });
    });

    describe("submitForReview (RF009)", () => {
        it("moves a DRAFT hotel to UNDER_REVIEW and publishes HOTEL_SUBMITTED", async () => {
            const { service, hotelRepository, hotelEvents, order } =
                createWorld(buildHotel(DRAFT));

            const hotel = await service.submitForReview(MANAGER, HOTEL_ID);

            expect(hotelRepository.updateStatusIfCurrent).toHaveBeenCalledWith(
                HOTEL_ID,
                "DRAFT",
                "UNDER_REVIEW",
            );
            expect(hotel).toMatchObject({
                id: HOTEL_ID,
                status: "UNDER_REVIEW",
            });
            expect(hotelEvents.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "HOTEL_SUBMITTED",
                    hotelId: HOTEL_ID,
                    actorUserId: "manager-1",
                    fromStatus: "DRAFT",
                    toStatus: "UNDER_REVIEW",
                    reason: null,
                }),
            );
            expect(order).toEqual(["publish"]);
        });

        it.each([UNDER_REVIEW, PUBLISHED, BLOCKED])(
            "does not submit a %s hotel",
            async (status) => {
                const { service, hotelRepository, hotelEvents } = createWorld(
                    buildHotel(status),
                );

                await expect(
                    service.submitForReview(MANAGER, HOTEL_ID),
                ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });

                expect(
                    hotelRepository.updateStatusIfCurrent,
                ).not.toHaveBeenCalled();
                expect(hotelEvents.publish).not.toHaveBeenCalled();
            },
        );

        it("answers HOTEL_NOT_FOUND to another manager", async () => {
            const { service, hotelRepository } = createWorld(buildHotel(DRAFT));

            await expect(
                service.submitForReview(OTHER_MANAGER, HOTEL_ID),
            ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });

            expect(
                hotelRepository.updateStatusIfCurrent,
            ).not.toHaveBeenCalled();
        });

        it("answers INVALID_HOTEL_STATUS and publishes nothing when the status changes during the update", async () => {
            const { service, hotelRepository, hotelEvents } = createWorld(
                buildHotel(DRAFT),
            );
            hotelRepository.updateStatusIfCurrent.mockResolvedValueOnce(false);

            await expect(
                service.submitForReview(MANAGER, HOTEL_ID),
            ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });

            expect(hotelEvents.publish).not.toHaveBeenCalled();
        });

        it("still succeeds when the event publisher fails, logging only the error name and code", async () => {
            const consoleError = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const { service, hotelEvents } = createWorld(buildHotel(DRAFT));
            hotelEvents.publish.mockRejectedValueOnce(new Error("queue down"));

            const hotel = await service.submitForReview(MANAGER, HOTEL_ID);

            expect(hotel.status).toBe("UNDER_REVIEW");
            expect(consoleError).toHaveBeenCalledWith(
                "Failed to publish hotel event",
                { type: "HOTEL_SUBMITTED", name: "Error", code: undefined },
            );
        });
    });

    describe("administrator actions (RF010, RF011, RN070, RN105, RN106, RN108)", () => {
        const ACTIONS = [
            {
                method: "approveHotel",
                from: UNDER_REVIEW,
                to: PUBLISHED,
                extra: {},
                auditAction: "APPROVE",
                eventType: "HOTEL_APPROVED",
                hasReviewNote: false,
            },
            {
                method: "requestHotelChanges",
                from: UNDER_REVIEW,
                to: DRAFT,
                extra: {},
                auditAction: "REQUEST_CHANGES",
                eventType: "HOTEL_CHANGES_REQUESTED",
                hasReviewNote: true,
            },
            {
                method: "blockHotel",
                from: PUBLISHED,
                to: BLOCKED,
                extra: {},
                auditAction: "BLOCK",
                eventType: "HOTEL_BLOCKED",
                hasReviewNote: true,
            },
            {
                method: "blockHotel",
                from: UNDER_REVIEW,
                to: BLOCKED,
                extra: {},
                auditAction: "BLOCK",
                eventType: "HOTEL_BLOCKED",
                hasReviewNote: true,
            },
            {
                method: "unblockHotel",
                from: BLOCKED,
                to: PUBLISHED,
                extra: { targetStatus: PUBLISHED },
                auditAction: "UNBLOCK",
                eventType: "HOTEL_UNBLOCKED",
                hasReviewNote: true,
            },
            {
                method: "unblockHotel",
                from: BLOCKED,
                to: DRAFT,
                extra: { targetStatus: DRAFT },
                auditAction: "UNBLOCK",
                eventType: "HOTEL_UNBLOCKED",
                hasReviewNote: true,
            },
        ];

        const METHODS = [
            "approveHotel",
            "requestHotelChanges",
            "blockHotel",
            "unblockHotel",
        ];

        const ALLOWED_SOURCES = {
            approveHotel: [UNDER_REVIEW],
            requestHotelChanges: [UNDER_REVIEW],
            blockHotel: [PUBLISHED, UNDER_REVIEW],
            unblockHotel: [BLOCKED],
        };

        const FORBIDDEN = METHODS.flatMap((method) =>
            Object.values(HOTEL_STATUSES)
                .filter((status) => !ALLOWED_SOURCES[method].includes(status))
                .map((status) => [method, status]),
        );

        function inputFor(extra = {}) {
            return { reason: `  ${REASON}  `, ...extra };
        }

        it.each(ACTIONS)(
            "$method moves a $from hotel to $to",
            async ({
                method,
                from,
                to,
                extra,
                auditAction,
                eventType,
                hasReviewNote,
            }) => {
                const world = createWorld(buildHotel(from));

                const hotel = await world.service[method](
                    ADMIN,
                    HOTEL_ID,
                    inputFor(extra),
                    REQUEST_CONTEXT,
                );

                expect(hotel).toMatchObject({ id: HOTEL_ID, status: to });
                expect(world.state.hotel.status).toBe(to);
                expect(
                    world.hotelRepository.updateStatusIfCurrent,
                ).toHaveBeenCalledWith(HOTEL_ID, from, to, TRANSACTION_CLIENT);
                expect(
                    world.auditLogger.recordAdminAction,
                ).toHaveBeenCalledWith(
                    {
                        admin: ADMIN,
                        action: auditAction,
                        entityType: "HOTEL",
                        entityId: HOTEL_ID,
                        beforeData: { status: from },
                        afterData: { status: to },
                        reason: REASON,
                        context: REQUEST_CONTEXT,
                    },
                    TRANSACTION_CLIENT,
                );
                if (hasReviewNote) {
                    expect(
                        world.hotelReviewNoteRepository.create,
                    ).toHaveBeenCalledWith(
                        {
                            hotelId: HOTEL_ID,
                            adminUserId: "admin-1",
                            fromStatus: from,
                            toStatus: to,
                            notes: REASON,
                        },
                        TRANSACTION_CLIENT,
                    );
                } else {
                    expect(
                        world.hotelReviewNoteRepository.create,
                    ).not.toHaveBeenCalled();
                }
                expect(world.hotelEvents.publish).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: eventType,
                        hotelId: HOTEL_ID,
                        actorUserId: "admin-1",
                        fromStatus: from,
                        toStatus: to,
                        reason: REASON,
                    }),
                );
            },
        );

        it.each(ACTIONS)(
            "$method publishes its event only after the transaction commits",
            async ({ method, from, extra }) => {
                const world = createWorld(buildHotel(from));

                await world.service[method](ADMIN, HOTEL_ID, inputFor(extra));

                expect(world.order).toEqual(["commit", "publish"]);
            },
        );

        it.each(FORBIDDEN)(
            "%s rejects a %s hotel and writes nothing",
            async (method, status) => {
                const world = createWorld(buildHotel(status));

                const action = world.service[method](
                    ADMIN,
                    HOTEL_ID,
                    inputFor({ targetStatus: PUBLISHED }),
                );

                await expect(action).rejects.toThrow(ConflictError);
                await expect(action).rejects.toMatchObject({
                    code: "INVALID_HOTEL_STATUS",
                });
                expect(world.state.hotel.status).toBe(status);
                expect(world.state.reviewNotes).toEqual([]);
                expect(world.state.auditEntries).toEqual([]);
                expect(world.hotelEvents.publish).not.toHaveBeenCalled();
            },
        );

        it.each([undefined, UNDER_REVIEW, BLOCKED])(
            "unblockHotel needs an explicit PUBLISHED or DRAFT target, not %s (RN106)",
            async (targetStatus) => {
                const world = createWorld(buildHotel(BLOCKED));

                await expect(
                    world.service.unblockHotel(
                        ADMIN,
                        HOTEL_ID,
                        inputFor({ targetStatus }),
                    ),
                ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });

                expect(world.state.hotel.status).toBe(BLOCKED);
                expect(world.state.auditEntries).toEqual([]);
            },
        );

        it.each(METHODS)(
            "%s refuses a manager and opens no transaction",
            async (method) => {
                const world = createWorld(buildHotel(UNDER_REVIEW));

                await expect(
                    world.service[method](
                        MANAGER,
                        HOTEL_ID,
                        inputFor({ targetStatus: PUBLISHED }),
                    ),
                ).rejects.toThrow(ForbiddenError);

                expect(world.transactionRunner.run).not.toHaveBeenCalled();
            },
        );

        it.each(METHODS)(
            "%s refuses a customer and opens no transaction",
            async (method) => {
                const world = createWorld(buildHotel(UNDER_REVIEW));

                await expect(
                    world.service[method](
                        CUSTOMER,
                        HOTEL_ID,
                        inputFor({ targetStatus: PUBLISHED }),
                    ),
                ).rejects.toThrow(ForbiddenError);

                expect(world.transactionRunner.run).not.toHaveBeenCalled();
            },
        );

        it.each(METHODS)(
            "%s answers HOTEL_NOT_FOUND for a missing hotel",
            async (method) => {
                const world = createWorld(null);

                await expect(
                    world.service[method](
                        ADMIN,
                        HOTEL_ID,
                        inputFor({ targetStatus: PUBLISHED }),
                    ),
                ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });

                expect(world.state.auditEntries).toEqual([]);
            },
        );

        it.each(
            METHODS.flatMap((method) =>
                [undefined, "", "   "].map((reason) => [method, reason]),
            ),
        )(
            "%s rejects the reason %j before opening a transaction (RN108)",
            async (method, reason) => {
                const world = createWorld(buildHotel(UNDER_REVIEW));

                const action = world.service[method](ADMIN, HOTEL_ID, {
                    reason,
                    targetStatus: PUBLISHED,
                });

                await expect(action).rejects.toThrow(ValidationError);
                expect(world.transactionRunner.run).not.toHaveBeenCalled();
                expect(world.state.hotel.status).toBe(UNDER_REVIEW);
            },
        );

        it("answers INVALID_HOTEL_STATUS and writes nothing when another admin changed the hotel first", async () => {
            const world = createWorld(buildHotel(UNDER_REVIEW));
            world.hotelRepository.updateStatusIfCurrent.mockResolvedValueOnce(
                false,
            );

            await expect(
                world.service.requestHotelChanges(ADMIN, HOTEL_ID, inputFor()),
            ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });

            expect(
                world.hotelReviewNoteRepository.create,
            ).not.toHaveBeenCalled();
            expect(world.auditLogger.recordAdminAction).not.toHaveBeenCalled();
            expect(world.hotelEvents.publish).not.toHaveBeenCalled();
        });

        it("rolls the whole action back when the audit log cannot be written (RN070)", async () => {
            const world = createWorld(buildHotel(UNDER_REVIEW));
            const failure = new Error("audit table unavailable");
            world.auditLogger.recordAdminAction.mockRejectedValueOnce(failure);

            await expect(
                world.service.requestHotelChanges(ADMIN, HOTEL_ID, inputFor()),
            ).rejects.toBe(failure);

            expect(world.state.hotel.status).toBe(UNDER_REVIEW);
            expect(world.state.reviewNotes).toEqual([]);
            expect(world.state.auditEntries).toEqual([]);
            expect(world.hotelEvents.publish).not.toHaveBeenCalled();
        });

        it("rolls the status back and skips the audit when the review note cannot be written", async () => {
            const world = createWorld(buildHotel(PUBLISHED));
            const failure = new Error("note insert failed");
            world.hotelReviewNoteRepository.create.mockRejectedValueOnce(
                failure,
            );

            await expect(
                world.service.blockHotel(ADMIN, HOTEL_ID, inputFor()),
            ).rejects.toBe(failure);

            expect(world.state.hotel.status).toBe(PUBLISHED);
            expect(world.auditLogger.recordAdminAction).not.toHaveBeenCalled();
        });

        it("still succeeds when the event publisher fails, logging only the error name and code", async () => {
            const consoleError = vi
                .spyOn(console, "error")
                .mockImplementation(() => {});
            const world = createWorld(buildHotel(UNDER_REVIEW));
            world.hotelEvents.publish.mockRejectedValueOnce(
                new Error("queue down"),
            );

            const hotel = await world.service.approveHotel(
                ADMIN,
                HOTEL_ID,
                inputFor(),
            );

            expect(hotel.status).toBe(PUBLISHED);
            expect(consoleError).toHaveBeenCalledWith(
                "Failed to publish hotel event",
                { type: "HOTEL_APPROVED", name: "Error", code: undefined },
            );
        });

        it("works without a request context", async () => {
            const world = createWorld(buildHotel(UNDER_REVIEW));

            await world.service.approveHotel(ADMIN, HOTEL_ID, inputFor());

            expect(world.auditLogger.recordAdminAction).toHaveBeenCalledWith(
                expect.objectContaining({ context: undefined }),
                TRANSACTION_CLIENT,
            );
        });
    });

    describe("full lifecycle (RN002, RN105, RN106)", () => {
        it("requires a new review after the administrator requests changes or unblocks to DRAFT", async () => {
            const world = createWorld(buildHotel(DRAFT));
            const { service, state } = world;

            await service.submitForReview(MANAGER, HOTEL_ID);
            await service.requestHotelChanges(ADMIN, HOTEL_ID, {
                reason: "Corrigir o CNPJ.",
            });
            expect(state.hotel.status).toBe(DRAFT);

            await service.updateHotel(MANAGER, HOTEL_ID, {
                cnpj: "12ABC34501DE35",
            });
            await service.submitForReview(MANAGER, HOTEL_ID);
            await service.approveHotel(ADMIN, HOTEL_ID, {
                reason: "Tudo certo.",
            });
            expect(state.hotel.status).toBe(PUBLISHED);

            await service.blockHotel(ADMIN, HOTEL_ID, { reason: "Denúncia." });
            await service.unblockHotel(ADMIN, HOTEL_ID, {
                reason: "Dados a corrigir.",
                targetStatus: DRAFT,
            });
            expect(state.hotel.status).toBe(DRAFT);

            await service.submitForReview(MANAGER, HOTEL_ID);
            expect(state.hotel.status).toBe(UNDER_REVIEW);

            expect(state.auditEntries.map(({ action }) => action)).toEqual([
                "REQUEST_CHANGES",
                "APPROVE",
                "BLOCK",
                "UNBLOCK",
            ]);
            expect(
                state.reviewNotes.map(({ fromStatus, toStatus }) => [
                    fromStatus,
                    toStatus,
                ]),
            ).toEqual([
                [UNDER_REVIEW, DRAFT],
                [PUBLISHED, BLOCKED],
                [BLOCKED, DRAFT],
            ]);
        });
    });
});
