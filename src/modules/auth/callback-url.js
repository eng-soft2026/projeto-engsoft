export const DEFAULT_CALLBACK_URL = "/";

const AUTH_PAGE_PATHS = ["/login", "/register"];
const SAFE_PATH_PATTERN = /^\/(?![/\\])[^\s\\]*$/;

function readPathname(path) {
    return path.split(/[?#]/)[0];
}

function isAuthPage(path) {
    const pathname = readPathname(path);
    return AUTH_PAGE_PATHS.some(
        (authPath) => pathname === authPath || pathname === `${authPath}/`,
    );
}

export function resolveCallbackUrl(value) {
    if (typeof value !== "string" || !SAFE_PATH_PATTERN.test(value)) {
        return DEFAULT_CALLBACK_URL;
    }
    if (isAuthPage(value)) {
        return DEFAULT_CALLBACK_URL;
    }
    return value;
}

export function buildAuthPageHref(path, callbackUrl) {
    const safeCallbackUrl = resolveCallbackUrl(callbackUrl);
    if (safeCallbackUrl === DEFAULT_CALLBACK_URL) {
        return path;
    }
    return `${path}?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;
}
