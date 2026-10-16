import pino from "pino";
import { DomainError } from "./errors.js";

const DEFAULT_LOG_LEVEL = "info";
const LOGGER_METHODS = ["debug", "info", "warn", "error"];
const REDACTED_VALUE = "[REDACTED]";
const CIRCULAR_VALUE = "[Circular]";
const SENSITIVE_KEY_FRAGMENTS = [
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
];
const SENSITIVE_KEY_PREFIXES = ["stripe"];
const MASKED_KEY_FRAGMENTS = ["cpf"];
const VISIBLE_CPF_DIGITS = 2;

export function isProductionEnvironment() {
    return process.env.NODE_ENV === "production";
}

export function resolveLogLevel(level = process.env.LOG_LEVEL) {
    const normalizedLevel = String(level ?? "")
        .trim()
        .toLowerCase();
    const isKnownLevel =
        normalizedLevel === "silent" ||
        Object.hasOwn(pino.levels.values, normalizedLevel);
    return isKnownLevel ? normalizedLevel : DEFAULT_LOG_LEVEL;
}

export function serializeError(
    error,
    { isProduction = isProductionEnvironment() } = {},
) {
    const serialized = { name: error?.name ?? "UnknownError" };
    if (error?.code !== undefined) {
        serialized.code = error.code;
    }
    const shouldIncludeMessage = !isProduction || error instanceof DomainError;
    if (shouldIncludeMessage && error?.message) {
        serialized.message = error.message;
    }
    if (!isProduction && error?.stack) {
        serialized.stack = error.stack;
    }
    return serialized;
}

function isSensitiveKey(normalizedKey) {
    return (
        SENSITIVE_KEY_FRAGMENTS.some((fragment) =>
            normalizedKey.includes(fragment),
        ) ||
        SENSITIVE_KEY_PREFIXES.some((prefix) =>
            normalizedKey.startsWith(prefix),
        )
    );
}

function isMaskedKey(normalizedKey) {
    return MASKED_KEY_FRAGMENTS.some((fragment) =>
        normalizedKey.includes(fragment),
    );
}

export function maskCpf(value) {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (digits.length <= VISIBLE_CPF_DIGITS) {
        return REDACTED_VALUE;
    }
    const hiddenLength = digits.length - VISIBLE_CPF_DIGITS;
    return "*".repeat(hiddenLength) + digits.slice(hiddenLength);
}

function isPlainObject(value) {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function redactEntry(key, value, options, visited) {
    const normalizedKey = key.toLowerCase();
    if (isSensitiveKey(normalizedKey)) {
        return REDACTED_VALUE;
    }
    if (isMaskedKey(normalizedKey) && value !== null && value !== undefined) {
        return maskCpf(value);
    }
    return redactValue(value, options, visited);
}

function redactValue(value, options, visited) {
    if (value instanceof Error) {
        return serializeError(value, options);
    }
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) {
        return value;
    }
    if (visited.has(value)) {
        return CIRCULAR_VALUE;
    }
    visited.add(value);
    const redacted = Array.isArray(value)
        ? value.map((item) => redactValue(item, options, visited))
        : Object.fromEntries(
              Object.entries(value).map(([key, entryValue]) => [
                  key,
                  redactEntry(key, entryValue, options, visited),
              ]),
          );
    visited.delete(value);
    return redacted;
}

export function redactLogData(
    data,
    { isProduction = isProductionEnvironment() } = {},
) {
    return redactValue(data, { isProduction }, new WeakSet());
}

function formatTimeOfDay(isoTime) {
    return String(isoTime ?? "").slice(11, 19);
}

export function formatReadableLine(jsonLine) {
    const { level, time, msg, ...context } = JSON.parse(jsonLine);
    const label = String(level).toUpperCase().padEnd(5);
    const hasContext = Object.keys(context).length > 0;
    const contextText = hasContext ? ` ${JSON.stringify(context)}` : "";
    return `${formatTimeOfDay(time)} ${label} ${msg ?? ""}${contextText}\n`;
}

function createReadableDestination(destination) {
    return {
        write(jsonLine) {
            destination.write(formatReadableLine(jsonLine));
        },
    };
}

export function createLogger({
    level = resolveLogLevel(),
    isProduction = isProductionEnvironment(),
    destination = process.stdout,
} = {}) {
    const output = isProduction
        ? destination
        : createReadableDestination(destination);
    const instance = pino(
        {
            level: resolveLogLevel(level),
            base: null,
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label }),
            },
        },
        output,
    );

    return Object.fromEntries(
        LOGGER_METHODS.map((method) => [
            method,
            (message, context = {}) => {
                instance[method](
                    redactLogData(context, { isProduction }),
                    message,
                );
            },
        ]),
    );
}

export const logger = createLogger();
