import { describe, expect, it } from "vitest";
import {
    addHotelManagerSchema,
    createHotelSchema,
    hotelManagerParamsSchema,
    hotelParamsSchema,
    hotelReviewActionSchema,
    listHotelsQuerySchema,
    unblockHotelSchema,
    updateHotelSchema,
} from "../../src/schemas/hotel-schemas.js";

const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

const VALID_HOTEL = Object.freeze({
    name: "Hotel Mar Azul",
    description: "Hotel à beira-mar com café da manhã incluso.",
    category: "4 estrelas",
    cnpj: "11.222.333/0001-81",
    email: "contato@marazul.example.com",
});

function firstIssue(schema, input) {
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    return result.error.issues[0];
}

describe("createHotelSchema", () => {
    it("normalizes name, e-mail and CNPJ", () => {
        const data = createHotelSchema.parse({
            ...VALID_HOTEL,
            name: "  Hotel Mar Azul  ",
            email: "  CONTATO@MarAzul.example.com ",
        });

        expect(data).toEqual({
            ...VALID_HOTEL,
            cnpj: "11222333000181",
        });
    });

    it("accepts an alphanumeric CNPJ and stores it in uppercase", () => {
        const data = createHotelSchema.parse({
            ...VALID_HOTEL,
            cnpj: "12.abc.345/01de-35",
        });

        expect(data.cnpj).toBe("12ABC34501DE35");
    });

    it("rejects an invalid CNPJ with the INVALID_CNPJ code", () => {
        const issue = firstIssue(createHotelSchema, {
            ...VALID_HOTEL,
            cnpj: "11.222.333/0001-82",
        });

        expect(issue.message).toBe("CNPJ inválido.");
        expect(issue.params).toEqual({ errorCode: "INVALID_CNPJ" });
    });

    it("requires the CNPJ (RN004)", () => {
        const withoutCnpj = { ...VALID_HOTEL };
        delete withoutCnpj.cnpj;

        const issue = firstIssue(createHotelSchema, withoutCnpj);

        expect(issue.path).toEqual(["cnpj"]);
        expect(issue.message).toBe("Informe o CNPJ.");
    });

    it.each(["name", "description", "category", "email"])(
        "requires the %s",
        (field) => {
            const incomplete = { ...VALID_HOTEL };
            delete incomplete[field];

            const issue = firstIssue(createHotelSchema, incomplete);

            expect(issue.path).toEqual([field]);
        },
    );

    it.each([
        ["name", "A"],
        ["name", "A".repeat(151)],
        ["description", "   "],
        ["description", "d".repeat(5001)],
        ["category", "   "],
        ["category", "c".repeat(51)],
        ["email", "contato.marazul.example.com"],
    ])("rejects %s %j", (field, value) => {
        const issue = firstIssue(createHotelSchema, {
            ...VALID_HOTEL,
            [field]: value,
        });

        expect(issue.path).toEqual([field]);
    });

    it("ignores fields the client must not set: status, owner and active flag", () => {
        const data = createHotelSchema.parse({
            ...VALID_HOTEL,
            status: "PUBLISHED",
            ownerUserId: "someone-else",
            isActive: false,
            id: "forced-id",
        });

        expect(Object.keys(data).sort()).toEqual([
            "category",
            "cnpj",
            "description",
            "email",
            "name",
        ]);
    });

    it("rejects a body that is not an object", () => {
        const issue = firstIssue(createHotelSchema, "hotel");

        expect(issue.message).toBe("Envie os dados do hotel.");
    });
});

describe("updateHotelSchema", () => {
    it("accepts a single field and normalizes it", () => {
        expect(updateHotelSchema.parse({ cnpj: "11.222.333/0001-81" })).toEqual(
            {
                cnpj: "11222333000181",
            },
        );
    });

    it("accepts every editable field together", () => {
        const data = updateHotelSchema.parse(VALID_HOTEL);

        expect(data).toMatchObject({ name: "Hotel Mar Azul" });
        expect(Object.keys(data)).toHaveLength(5);
    });

    it("rejects an empty update", () => {
        const issue = firstIssue(updateHotelSchema, {});

        expect(issue.message).toBe("Informe ao menos um campo para atualizar.");
    });

    it("rejects an update that only carries ignored fields", () => {
        const issue = firstIssue(updateHotelSchema, {
            status: "PUBLISHED",
            ownerUserId: "someone-else",
        });

        expect(issue.message).toBe("Informe ao menos um campo para atualizar.");
    });

    it("rejects an invalid CNPJ with the INVALID_CNPJ code", () => {
        const issue = firstIssue(updateHotelSchema, { cnpj: "123" });

        expect(issue.params).toEqual({ errorCode: "INVALID_CNPJ" });
    });
});

describe("hotelReviewActionSchema", () => {
    it("trims the reason", () => {
        expect(
            hotelReviewActionSchema.parse({ reason: "  Dados conferidos.  " }),
        ).toEqual({ reason: "Dados conferidos." });
    });

    it.each([undefined, "", "   "])(
        "requires a reason, not %j (RN108)",
        (reason) => {
            const issue = firstIssue(hotelReviewActionSchema, { reason });

            expect(issue.path).toEqual(["reason"]);
            expect(issue.message).toBe("Informe o motivo da ação.");
        },
    );

    it("limits the reason to the size of the audit column", () => {
        const issue = firstIssue(hotelReviewActionSchema, {
            reason: "m".repeat(1001),
        });

        expect(issue.message).toBe(
            "O motivo deve ter no máximo 1000 caracteres.",
        );
    });
});

describe("unblockHotelSchema", () => {
    it.each(["PUBLISHED", "DRAFT"])("accepts the target %s", (targetStatus) => {
        expect(
            unblockHotelSchema.parse({ reason: "Regularizado.", targetStatus }),
        ).toEqual({ reason: "Regularizado.", targetStatus });
    });

    it.each([undefined, "UNDER_REVIEW", "BLOCKED", "published", ""])(
        "rejects the target %j",
        (targetStatus) => {
            const issue = firstIssue(unblockHotelSchema, {
                reason: "Regularizado.",
                targetStatus,
            });

            expect(issue.path).toEqual(["targetStatus"]);
        },
    );

    it("requires the reason", () => {
        const issue = firstIssue(unblockHotelSchema, {
            targetStatus: "PUBLISHED",
        });

        expect(issue.path).toEqual(["reason"]);
    });
});

describe("listHotelsQuerySchema", () => {
    it("accepts a query without filters", () => {
        expect(listHotelsQuerySchema.parse({})).toEqual({});
    });

    it.each(["DRAFT", "UNDER_REVIEW", "PUBLISHED", "BLOCKED"])(
        "accepts the status %s",
        (status) => {
            expect(listHotelsQuerySchema.parse({ status })).toEqual({ status });
        },
    );

    it.each(["", "ARCHIVED", "draft"])("rejects the status %j", (status) => {
        const issue = firstIssue(listHotelsQuerySchema, { status });

        expect(issue.path).toEqual(["status"]);
    });
});

describe("hotelParamsSchema", () => {
    it("accepts a UUID", () => {
        expect(hotelParamsSchema.parse({ id: HOTEL_ID })).toEqual({
            id: HOTEL_ID,
        });
    });

    it.each(["hotel-1", "", "3f1c2a4e", "../etc/passwd"])(
        "rejects the id %j",
        (id) => {
            const issue = firstIssue(hotelParamsSchema, { id });

            expect(issue.path).toEqual(["id"]);
            expect(issue.message).toBe("Identificador de hotel inválido.");
        },
    );
});

describe("addHotelManagerSchema", () => {
    it("normalizes the e-mail", () => {
        expect(
            addHotelManagerSchema.parse({ email: " Gestor@Example.com " }),
        ).toEqual({ email: "gestor@example.com" });
    });

    it.each([{}, { email: "x" }, { userId: "abc" }])("rejects %j", (input) => {
        expect(addHotelManagerSchema.safeParse(input).success).toBe(false);
    });
});

describe("hotelManagerParamsSchema", () => {
    const UUID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";

    it("accepts two UUIDs", () => {
        expect(
            hotelManagerParamsSchema.safeParse({ id: UUID, userId: UUID })
                .success,
        ).toBe(true);
    });

    it("rejects a malformed user id", () => {
        expect(
            hotelManagerParamsSchema.safeParse({ id: UUID, userId: "x" })
                .success,
        ).toBe(false);
    });
});
