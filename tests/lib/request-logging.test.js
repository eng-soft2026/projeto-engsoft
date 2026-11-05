import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/lib/logger.js";
import {
    REQUEST_LOG_MESSAGE,
    withRequestIdHeader,
    withRequestLogging,
} from "../../src/lib/request-logging.js";
import {
    getCurrentRequestId,
    setRequestUserId,
} from "../../src/lib/request-store.js";

const ROUTE = "/api/hotels/[id]";
const HOTEL_ID = "3f1c2a4e-8b7d-4c6a-9e21-5d0b7a1c9f33";
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function createMemoryLogger() {
    const lines = [];
    const logger = createLogger({
        level: "debug",
        isProduction: true,
        destination: { write: (line) => lines.push(line) },
    });
    const readEntries = () => lines.map((line) => JSON.parse(line));
    return { logger, lines, readEntries };
}

function createSteppingClock(...times) {
    const queue = [...times];
    return () => queue.shift();
}

function createRequest(headers = {}, init = {}) {
    return new Request(
        `http://localhost/api/hotels/${HOTEL_ID}?cpf=12345678909&email=ana@example.com`,
        { headers, ...init },
    );
}

function wrap(handler, options = {}) {
    const memory = createMemoryLogger();
    const wrapped = withRequestLogging(ROUTE, handler, {
        logger: memory.logger,
        ...options,
    });
    return { wrapped, ...memory };
}

function findRequestLines(entries) {
    return entries.filter((entry) => entry.msg === REQUEST_LOG_MESSAGE);
}

describe("withRequestLogging", () => {
    it("generates a request id when the header is missing and returns it in the response", async () => {
        const { wrapped, readEntries } = wrap(async () =>
            Response.json({ success: true }),
        );

        const response = await wrapped(createRequest());

        const requestId = response.headers.get("x-request-id");
        expect(requestId).toMatch(UUID_PATTERN);
        expect(findRequestLines(readEntries())[0].requestId).toBe(requestId);
    });

    it("propagates a valid incoming request id", async () => {
        const { wrapped, readEntries } = wrap(async () =>
            Response.json({ success: true }),
        );

        const response = await wrapped(
            createRequest({ "x-request-id": "req-1" }),
        );

        expect(response.headers.get("x-request-id")).toBe("req-1");
        expect(findRequestLines(readEntries())[0].requestId).toBe("req-1");
    });

    it("replaces an invalid incoming request id", async () => {
        const { wrapped, lines } = wrap(async () => new Response(null));

        const response = await wrapped(
            createRequest({ "x-request-id": "forged\tline" }),
        );

        expect(response.headers.get("x-request-id")).toMatch(UUID_PATTERN);
        expect(lines.join("")).not.toContain("forged");
    });

    it("exposes the request id to the handler through the request store", async () => {
        let seenRequestId;
        const { wrapped } = wrap(async () => {
            seenRequestId = getCurrentRequestId();
            return new Response(null, { status: 204 });
        });

        await wrapped(createRequest({ "x-request-id": "req-1" }));

        expect(seenRequestId).toBe("req-1");
        expect(getCurrentRequestId()).toBeNull();
    });

    it("writes one line with the method, the route label, the status and the duration", async () => {
        const { wrapped, readEntries } = wrap(
            async () => Response.json({ success: true }, { status: 201 }),
            { now: createSteppingClock(1000, 1042.4) },
        );

        await wrapped(
            createRequest({ "x-request-id": "req-1" }, { method: "POST" }),
        );

        const lines = findRequestLines(readEntries());
        expect(lines).toHaveLength(1);
        expect(lines[0]).toEqual({
            level: "info",
            time: expect.any(String),
            msg: REQUEST_LOG_MESSAGE,
            requestId: "req-1",
            route: ROUTE,
            method: "POST",
            status: 201,
            durationMs: 42,
        });
    });

    it("keeps dynamic ids, the query string, the body and the headers out of the line", async () => {
        const { wrapped, lines } = wrap(async () => Response.json({}));

        await wrapped(
            createRequest(
                {
                    authorization: "Bearer secret-token",
                    cookie: "authjs.session-token=abc",
                    "content-type": "application/json",
                },
                {
                    method: "POST",
                    body: JSON.stringify({ password: "senhaSegura1" }),
                },
            ),
        );

        const output = lines.join("");
        expect(output).not.toContain(HOTEL_ID);
        expect(output).not.toContain("12345678909");
        expect(output).not.toContain("ana@example.com");
        expect(output).not.toContain("?");
        expect(output).not.toContain("secret-token");
        expect(output).not.toContain("authjs.session-token");
        expect(output).not.toContain("senhaSegura1");
    });

    it("adds the request id, the user id and the route to the logs written by the handler", async () => {
        const { logger, readEntries } = createMemoryLogger();
        const wrapped = withRequestLogging(
            ROUTE,
            async () => {
                setRequestUserId("user-1");
                logger.warn("hotel not found");
                return new Response(null, { status: 404 });
            },
            { logger },
        );

        await wrapped(createRequest({ "x-request-id": "req-1" }));

        const [handlerEntry, requestEntry] = readEntries();
        expect(handlerEntry).toMatchObject({
            msg: "hotel not found",
            requestId: "req-1",
            userId: "user-1",
            route: ROUTE,
        });
        expect(requestEntry).toMatchObject({
            msg: REQUEST_LOG_MESSAGE,
            userId: "user-1",
            status: 404,
        });
    });

    it("logs status 500 and rethrows when the handler throws", async () => {
        const failure = new Error("boom");
        const { wrapped, readEntries } = wrap(async () => {
            throw failure;
        });

        await expect(wrapped(createRequest())).rejects.toBe(failure);
        expect(findRequestLines(readEntries())[0].status).toBe(500);
    });

    it("passes the request and the route context to the handler", async () => {
        const received = [];
        const { wrapped } = wrap(async (request, context) => {
            received.push(request, context);
            return new Response(null);
        });
        const request = createRequest();
        const context = { params: Promise.resolve({ id: HOTEL_ID }) };

        await wrapped(request, context);

        expect(received).toEqual([request, context]);
    });

    it("keeps the status, the body and the other headers of the response", async () => {
        const { wrapped } = wrap(async () =>
            Response.json(
                { success: false },
                { status: 409, headers: { "set-cookie": "a=1; Path=/" } },
            ),
        );

        const response = await wrapped(createRequest());

        expect(response.status).toBe(409);
        expect(response.headers.get("set-cookie")).toBe("a=1; Path=/");
        expect(await response.json()).toEqual({ success: false });
    });
});

describe("withRequestIdHeader", () => {
    it("adds the header to a response with immutable headers", () => {
        const redirect = Response.redirect("http://localhost/login", 302);

        const response = withRequestIdHeader(redirect, "req-1");

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("http://localhost/login");
        expect(response.headers.get("x-request-id")).toBe("req-1");
    });
});
