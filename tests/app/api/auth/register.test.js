import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../../../src/lib/logger.js";
import { POST } from "../../../../src/app/api/auth/register/route.js";
import { ConflictError, ERROR_CODES } from "../../../../src/lib/errors.js";

const { createUser } = vi.hoisted(() => ({ createUser: vi.fn() }));

vi.mock("../../../../src/services/user-service.js", () => ({
    userService: { createUser },
}));

const VALID_BODY = Object.freeze({
    name: "Ana Souza",
    email: "ANA@example.com",
    cpf: "529.982.247-25",
    password: "senhaSegura1",
});

const CREATED_USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    role: "CUSTOMER",
    isActive: true,
});

function createRequest(body, contentType = "application/json") {
    return new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": contentType },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

describe("POST /api/auth/register", () => {
    beforeEach(() => {
        createUser.mockReset();
        createUser.mockResolvedValue(CREATED_USER);
    });

    it("creates the user and returns 201 with the success envelope", async () => {
        const response = await POST(createRequest(VALID_BODY));

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({
            success: true,
            data: CREATED_USER,
        });
    });

    it("passes normalized data with the default CUSTOMER role", async () => {
        await POST(createRequest(VALID_BODY));

        expect(createUser).toHaveBeenCalledWith({
            name: "Ana Souza",
            email: "ana@example.com",
            cpf: "52998224725",
            password: "senhaSegura1",
            role: "CUSTOMER",
        });
    });

    it("lets a manager register", async () => {
        await POST(createRequest({ ...VALID_BODY, role: "MANAGER" }));

        expect(createUser).toHaveBeenCalledWith(
            expect.objectContaining({ role: "MANAGER" }),
        );
    });

    it("refuses self-registration as ADMIN", async () => {
        const response = await POST(
            createRequest({ ...VALID_BODY, role: "ADMIN" }),
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(createUser).not.toHaveBeenCalled();
    });

    it("returns 400 INVALID_CPF for a CPF with wrong check digits", async () => {
        const response = await POST(
            createRequest({ ...VALID_BODY, cpf: "529.982.247-26" }),
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            success: false,
            error: { code: "INVALID_CPF", message: "CPF inválido." },
        });
    });

    it("returns 400 VALIDATION_ERROR for a weak password", async () => {
        const response = await POST(
            createRequest({ ...VALID_BODY, password: "12345678" }),
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for a body that is not JSON", async () => {
        const response = await POST(
            createRequest("name=Ana", "application/x-www-form-urlencoded"),
        );

        expect(response.status).toBe(400);
        expect(createUser).not.toHaveBeenCalled();
    });

    it("returns 409 USER_ALREADY_EXISTS for a taken e-mail or CPF", async () => {
        createUser.mockRejectedValueOnce(
            new ConflictError(
                ERROR_CODES.USER_ALREADY_EXISTS,
                "Já existe uma conta com este e-mail ou CPF.",
            ),
        );

        const response = await POST(createRequest(VALID_BODY));

        expect(response.status).toBe(409);
        expect((await response.json()).error.code).toBe("USER_ALREADY_EXISTS");
    });

    it("returns 500 INTERNAL_ERROR without details for unexpected errors", async () => {
        vi.spyOn(logger, "error").mockImplementation(() => {});
        createUser.mockRejectedValueOnce(new Error("connection refused"));

        const response = await POST(createRequest(VALID_BODY));
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error.code).toBe("INTERNAL_ERROR");
        expect(JSON.stringify(body)).not.toContain("connection refused");
        vi.restoreAllMocks();
    });

    it("never echoes the password in the response", async () => {
        const response = await POST(createRequest(VALID_BODY));

        expect(JSON.stringify(await response.json())).not.toContain(
            "senhaSegura1",
        );
    });
});
