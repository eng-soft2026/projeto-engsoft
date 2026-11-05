import { CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../../../src/lib/logger.js";
import { POST } from "../../../../src/app/api/auth/login/route.js";

const { signIn, getProfileByEmail } = vi.hoisted(() => ({
    signIn: vi.fn(),
    getProfileByEmail: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/auth.js", () => ({ signIn }));
vi.mock("../../../../src/services/user-service.js", () => ({
    userService: { getProfileByEmail },
}));

const USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    role: "CUSTOMER",
    isActive: true,
});

function createRequest(body, headers = {}) {
    return new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

describe("POST /api/auth/login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        signIn.mockResolvedValue("http://localhost/");
        getProfileByEmail.mockResolvedValue(USER);
    });

    it("signs in with credentials and returns the user", async () => {
        const response = await POST(
            createRequest({
                email: " ANA@EXAMPLE.COM ",
                password: "senhaSegura1",
            }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, data: USER });
        expect(signIn).toHaveBeenCalledWith("credentials", {
            email: "ana@example.com",
            password: "senhaSegura1",
            redirect: false,
        });
        expect(getProfileByEmail).toHaveBeenCalledWith("ana@example.com");
    });

    it("returns 401 INVALID_CREDENTIALS when Auth.js rejects the credentials", async () => {
        signIn.mockRejectedValueOnce(new CredentialsSignin());

        const response = await POST(
            createRequest({ email: "ana@example.com", password: "errada123" }),
        );

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "INVALID_CREDENTIALS",
                message: "E-mail ou senha inválidos.",
            },
        });
        expect(getProfileByEmail).not.toHaveBeenCalled();
    });

    it("returns 400 VALIDATION_ERROR without calling Auth.js for invalid input", async () => {
        const response = await POST(
            createRequest({ email: "not-an-email", password: "x" }),
        );

        expect(response.status).toBe(400);
        expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
        expect(signIn).not.toHaveBeenCalled();
    });

    it("rejects a request that is not JSON", async () => {
        const response = await POST(
            new Request("http://localhost/api/auth/login", {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                body: "email=ana%40example.com&password=senhaSegura1",
            }),
        );

        expect(response.status).toBe(400);
        expect(signIn).not.toHaveBeenCalled();
    });

    it("rejects the Auth.js return-redirect header, which hides failed sign ins", async () => {
        const response = await POST(
            createRequest(
                { email: "ana@example.com", password: "senhaSegura1" },
                { "X-Auth-Return-Redirect": "1" },
            ),
        );

        expect(response.status).toBe(400);
        expect(signIn).not.toHaveBeenCalled();
    });

    it("returns 500 INTERNAL_ERROR for other Auth.js failures", async () => {
        vi.spyOn(logger, "error").mockImplementation(() => {});
        signIn.mockRejectedValueOnce(new Error("MissingSecret"));

        const response = await POST(
            createRequest({
                email: "ana@example.com",
                password: "senhaSegura1",
            }),
        );

        expect(response.status).toBe(500);
        expect((await response.json()).error.code).toBe("INTERNAL_ERROR");
        vi.restoreAllMocks();
    });
});
