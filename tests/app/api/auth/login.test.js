import { CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../../../src/lib/logger.js";
import { POST } from "../../../../src/app/api/auth/login/route.js";
import { LOGIN_RATE_LIMIT } from "../../../../src/constants/login-rate-limit.js";
import { createRateLimiter } from "../../../../src/lib/rate-limiter.js";
import { createCredentialsAuthorizer } from "../../../../src/modules/auth/auth-config.js";
import { LoginRateLimitedError } from "../../../../src/modules/auth/login-rate-limit.js";
import { createFakeClock } from "../../../helpers/factories/index.js";
import { createFakeRedis } from "../../../helpers/fake-redis.js";

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

    it("returns 429 RATE_LIMITED with Retry-After when the login is limited", async () => {
        signIn.mockRejectedValueOnce(new LoginRateLimitedError(600));

        const response = await POST(
            createRequest({
                email: "ana@example.com",
                password: "senhaSegura1",
            }),
        );

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("600");
        expect(await response.json()).toEqual({
            success: false,
            error: {
                code: "RATE_LIMITED",
                message:
                    "Muitas tentativas de login. Tente novamente em alguns minutos.",
            },
        });
        expect(getProfileByEmail).not.toHaveBeenCalled();
    });
});

describe("POST /api/auth/login rate limiting", () => {
    const WRONG_CREDENTIALS = Object.freeze({
        email: "ana@example.com",
        password: "errada123",
    });
    const VALID_CREDENTIALS = Object.freeze({
        email: "ana@example.com",
        password: "senhaSegura1",
    });
    let clock;

    async function postLogin(credentials) {
        return POST(createRequest(credentials));
    }

    async function failLogins(count) {
        for (let attempt = 0; attempt < count; attempt += 1) {
            const response = await postLogin(WRONG_CREDENTIALS);
            expect(response.status).toBe(401);
        }
    }

    beforeEach(() => {
        vi.clearAllMocks();
        clock = createFakeClock();
        const redis = createFakeRedis({ now: clock.now });
        const authorize = createCredentialsAuthorizer({
            authService: {
                verifyCredentials: async ({ password }) => {
                    return password === VALID_CREDENTIALS.password
                        ? USER
                        : null;
                },
            },
            rateLimiter: createRateLimiter({
                ...LOGIN_RATE_LIMIT,
                getRedis: async () => redis,
            }),
        });
        const authJsRequest = new Request("http://localhost/api/auth", {
            headers: { "x-forwarded-for": "203.0.113.7" },
        });
        signIn.mockImplementation(async (provider, { email, password }) => {
            const user = await authorize({ email, password }, authJsRequest);
            if (!user) {
                throw new CredentialsSignin();
            }
            return "http://localhost/";
        });
        getProfileByEmail.mockResolvedValue(USER);
    });

    it("answers 429 after 5 consecutive failures, even with the right password", async () => {
        await failLogins(5);

        const response = await postLogin(VALID_CREDENTIALS);

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("900");
        expect((await response.json()).error.code).toBe("RATE_LIMITED");
    });

    it("keeps answering 429 until the window expires", async () => {
        await failLogins(5);
        clock.advance({ minutes: 14, seconds: 59 });

        const limited = await postLogin(VALID_CREDENTIALS);
        expect(limited.status).toBe(429);
        expect(limited.headers.get("Retry-After")).toBe("1");

        clock.advance({ seconds: 1 });
        const allowed = await postLogin(VALID_CREDENTIALS);
        expect(allowed.status).toBe(200);
    });

    it("forgets earlier failures after a successful login", async () => {
        await failLogins(4);
        expect((await postLogin(VALID_CREDENTIALS)).status).toBe(200);

        await failLogins(4);

        expect((await postLogin(VALID_CREDENTIALS)).status).toBe(200);
    });
});
