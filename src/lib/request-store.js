import { AsyncLocalStorage } from "node:async_hooks";

const LOG_CONTEXT_KEYS = ["requestId", "userId", "route"];

const requestStorage = new AsyncLocalStorage();

export function runWithRequestStore(store, callback) {
    return requestStorage.run({ ...store }, callback);
}

export function getRequestStore() {
    return requestStorage.getStore() ?? null;
}

export function getCurrentRequestId() {
    return getRequestStore()?.requestId ?? null;
}

export function setRequestUserId(userId) {
    const store = getRequestStore();
    if (!store) {
        return;
    }
    store.userId = userId;
}

export function readRequestLogContext() {
    const store = getRequestStore();
    if (!store) {
        return {};
    }
    const presentKeys = LOG_CONTEXT_KEYS.filter((key) => store[key] != null);
    return Object.fromEntries(presentKeys.map((key) => [key, store[key]]));
}
