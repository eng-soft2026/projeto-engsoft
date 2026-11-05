import { logger as defaultLogger, serializeError } from "../../lib/logger.js";
import { readinessProbes } from "./readiness-probes.js";

export const COMPONENT_STATUS = Object.freeze({
    UP: "up",
    DOWN: "down",
});
export const DEFAULT_PROBE_TIMEOUT_MS = 2000;
export const PROBE_FAILURE_LOG_MESSAGE = "Readiness probe failed";

export class ProbeTimeoutError extends Error {
    constructor(timeoutMs) {
        super(`Probe timed out after ${timeoutMs} ms`);
        this.name = "ProbeTimeoutError";
    }
}

function runWithTimeout(probe, timeoutMs) {
    let timer;
    const timeout = new Promise((resolve, reject) => {
        timer = setTimeout(() => {
            reject(new ProbeTimeoutError(timeoutMs));
        }, timeoutMs);
    });
    const execution = Promise.resolve().then(probe);
    return Promise.race([execution, timeout]).finally(() => {
        clearTimeout(timer);
    });
}

export function createHealthService({
    probes = readinessProbes,
    timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
    logger = defaultLogger,
} = {}) {
    async function checkComponent([component, probe]) {
        try {
            await runWithTimeout(probe, timeoutMs);
            return [component, COMPONENT_STATUS.UP];
        } catch (error) {
            logger.warn(PROBE_FAILURE_LOG_MESSAGE, {
                component,
                error: serializeError(error),
            });
            return [component, COMPONENT_STATUS.DOWN];
        }
    }

    async function checkReadiness() {
        const results = await Promise.all(
            Object.entries(probes).map(checkComponent),
        );
        const isReady = results.every(([, status]) => {
            return status === COMPONENT_STATUS.UP;
        });
        return { isReady, components: Object.fromEntries(results) };
    }

    return { checkReadiness };
}

export const healthService = createHealthService();
