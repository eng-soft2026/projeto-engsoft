import { describe, expect, it } from "vitest";
import {
    getCurrentRequestId,
    getRequestStore,
    readRequestLogContext,
    runWithRequestStore,
    setRequestUserId,
} from "../../src/lib/request-store.js";

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("request store", () => {
    it("is empty outside a request", () => {
        expect(getRequestStore()).toBeNull();
        expect(getCurrentRequestId()).toBeNull();
        expect(readRequestLogContext()).toEqual({});
    });

    it("ignores the user id outside a request", () => {
        expect(() => setRequestUserId("user-1")).not.toThrow();
        expect(getRequestStore()).toBeNull();
    });

    it("keeps the request id across awaits", async () => {
        const requestId = await runWithRequestStore(
            { requestId: "req-1" },
            async () => {
                await wait(1);
                return getCurrentRequestId();
            },
        );

        expect(requestId).toBe("req-1");
    });

    it("isolates concurrent requests", async () => {
        const readAfterDelay = (requestId, delay) =>
            runWithRequestStore({ requestId }, async () => {
                await wait(delay);
                return getCurrentRequestId();
            });

        const ids = await Promise.all([
            readAfterDelay("req-slow", 5),
            readAfterDelay("req-fast", 1),
        ]);

        expect(ids).toEqual(["req-slow", "req-fast"]);
    });

    it("does not change the store object passed in", () => {
        const store = { requestId: "req-1" };

        runWithRequestStore(store, () => setRequestUserId("user-1"));

        expect(store).toEqual({ requestId: "req-1" });
    });

    it("reads only the request id, the user id and the route for the logs", () => {
        const context = runWithRequestStore(
            { requestId: "req-1", route: "/api/hotels", extra: "ignored" },
            () => {
                setRequestUserId("user-1");
                return readRequestLogContext();
            },
        );

        expect(context).toEqual({
            requestId: "req-1",
            userId: "user-1",
            route: "/api/hotels",
        });
    });
});
