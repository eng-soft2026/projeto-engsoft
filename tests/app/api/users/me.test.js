import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "../../../../src/app/api/users/me/route.js";
import { ERROR_CODES, UnauthorizedError } from "../../../../src/lib/errors.js";

const { requireAuth, updateProfile } = vi.hoisted(() => ({
    requireAuth: vi.fn(),
    updateProfile: vi.fn(),
}));

vi.mock("../../../../src/modules/auth/guards.js", () => ({ requireAuth }));
vi.mock("../../../../src/services/user-service.js", () => ({
    userService: { updateProfile },
}));

const USER = Object.freeze({
    id: "user-1",
    name: "Ana Souza",
    email: "ana@example.com",
    cpf: "52998224725",
    role: "CUSTOMER",
    isActive: true,
});

function createPatchRequest(body) {
    return new Request("http://localhost/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("/api/users/me", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireAuth.mockResolvedValue(USER);
        updateProfile.mockImplementation(async (id, changes) => ({
            ...USER,
            ...changes,
        }));
    });

    describe("GET", () => {
        it("returns the authenticated user", async () => {
            const response = await GET(
                new Request("http://localhost/api/users/me"),
            );

            expect(response.status).toBe(200);
            expect(await response.json()).toEqual({
                success: true,
                data: USER,
            });
        });

        it("returns 401 UNAUTHORIZED without a session", async () => {
            requireAuth.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );

            const response = await GET(
                new Request("http://localhost/api/users/me"),
            );

            expect(response.status).toBe(401);
            expect((await response.json()).error.code).toBe("UNAUTHORIZED");
        });
    });

    describe("PATCH", () => {
        it("updates the profile of the authenticated user", async () => {
            const response = await PATCH(createPatchRequest({ name: " Bia " }));

            expect(response.status).toBe(200);
            expect((await response.json()).data.name).toBe("Bia");
            expect(updateProfile).toHaveBeenCalledWith("user-1", {
                name: "Bia",
            });
        });

        it("ignores an attempt to change the CPF", async () => {
            await PATCH(
                createPatchRequest({ name: "Bia", cpf: "111.444.777-35" }),
            );

            expect(updateProfile).toHaveBeenCalledWith("user-1", {
                name: "Bia",
            });
        });

        it("does not accept a role change", async () => {
            const response = await PATCH(createPatchRequest({ role: "ADMIN" }));

            expect(response.status).toBe(400);
            expect(updateProfile).not.toHaveBeenCalled();
        });

        it("returns 400 when the new password comes without the current one", async () => {
            const response = await PATCH(
                createPatchRequest({ newPassword: "novaSenha1" }),
            );

            expect(response.status).toBe(400);
            expect((await response.json()).error.message).toBe(
                "Informe a senha atual para alterar a senha.",
            );
        });

        it("returns 401 INVALID_CREDENTIALS for a wrong current password", async () => {
            updateProfile.mockRejectedValueOnce(
                new UnauthorizedError(
                    "Senha atual incorreta.",
                    ERROR_CODES.INVALID_CREDENTIALS,
                ),
            );

            const response = await PATCH(
                createPatchRequest({
                    newPassword: "novaSenha1",
                    currentPassword: "errada123",
                }),
            );

            expect(response.status).toBe(401);
            expect((await response.json()).error.code).toBe(
                "INVALID_CREDENTIALS",
            );
        });

        it("returns 401 without a session and does not read the body", async () => {
            requireAuth.mockRejectedValueOnce(
                new UnauthorizedError("Faça login para continuar."),
            );

            const response = await PATCH(createPatchRequest({ name: "Bia" }));

            expect(response.status).toBe(401);
            expect(updateProfile).not.toHaveBeenCalled();
        });
    });
});
