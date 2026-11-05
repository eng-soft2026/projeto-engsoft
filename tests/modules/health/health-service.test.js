import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    COMPONENT_STATUS,
    createHealthService,
    DEFAULT_PROBE_TIMEOUT_MS,
    PROBE_FAILURE_LOG_MESSAGE,
} from "../../../src/modules/health/health-service.js";

function createFakeLogger() {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function createNeverSettlingProbe() {
    return vi.fn(() => new Promise(() => {}));
}

describe("createHealthService", () => {
    let logger;

    beforeEach(() => {
        logger = createFakeLogger();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("is ready when every probe succeeds", async () => {
        const service = createHealthService({
            probes: { mysql: vi.fn(), redis: vi.fn() },
            logger,
        });

        const result = await service.checkReadiness();

        expect(result).toEqual({
            isReady: true,
            components: {
                mysql: COMPONENT_STATUS.UP,
                redis: COMPONENT_STATUS.UP,
            },
        });
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("marks a failed probe as down and logs the component", async () => {
        const failure = new Error("Connection refused");
        const service = createHealthService({
            probes: {
                mysql: vi.fn().mockRejectedValue(failure),
                redis: vi.fn(),
            },
            logger,
        });

        const result = await service.checkReadiness();

        expect(result).toEqual({
            isReady: false,
            components: {
                mysql: COMPONENT_STATUS.DOWN,
                redis: COMPONENT_STATUS.UP,
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
            PROBE_FAILURE_LOG_MESSAGE,
            expect.objectContaining({
                component: "mysql",
                error: expect.objectContaining({ name: "Error" }),
            }),
        );
    });

    it("treats a synchronous throw as down", async () => {
        const service = createHealthService({
            probes: {
                mysql: vi.fn(() => {
                    throw new Error("DATABASE_URL is not defined");
                }),
            },
            logger,
        });

        const result = await service.checkReadiness();

        expect(result.components.mysql).toBe(COMPONENT_STATUS.DOWN);
    });

    it("marks a probe that exceeds the timeout as down", async () => {
        vi.useFakeTimers();
        const service = createHealthService({
            probes: { mysql: vi.fn(), redis: createNeverSettlingProbe() },
            timeoutMs: 50,
            logger,
        });

        const pending = service.checkReadiness();
        await vi.advanceTimersByTimeAsync(50);
        const result = await pending;

        expect(result).toEqual({
            isReady: false,
            components: {
                mysql: COMPONENT_STATUS.UP,
                redis: COMPONENT_STATUS.DOWN,
            },
        });
        expect(logger.warn).toHaveBeenCalledWith(
            PROBE_FAILURE_LOG_MESSAGE,
            expect.objectContaining({
                component: "redis",
                error: expect.objectContaining({ name: "ProbeTimeoutError" }),
            }),
        );
    });

    it("runs the probes in parallel, bounded by a single timeout", async () => {
        vi.useFakeTimers();
        const service = createHealthService({
            probes: {
                mysql: createNeverSettlingProbe(),
                redis: createNeverSettlingProbe(),
            },
            logger,
        });

        const pending = service.checkReadiness();
        await vi.advanceTimersByTimeAsync(DEFAULT_PROBE_TIMEOUT_MS);
        const result = await pending;

        expect(result.isReady).toBe(false);
        expect(result.components).toEqual({
            mysql: COMPONENT_STATUS.DOWN,
            redis: COMPONENT_STATUS.DOWN,
        });
    });

    it("uses a short default timeout", () => {
        expect(DEFAULT_PROBE_TIMEOUT_MS).toBeLessThanOrEqual(3000);
    });
});
