import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export const ROOT_DIR = join(import.meta.dirname, "../..");

const EXCLUDED_DIRS = new Set(["src/generated"]);
const SCRIPT_FILE = /\.(js|jsx|mjs)$/;

export function toPortablePath(path) {
    return relative(ROOT_DIR, path).replaceAll("\\", "/");
}

function listScriptFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (EXCLUDED_DIRS.has(toPortablePath(path))) {
            return [];
        }
        if (entry.isDirectory()) {
            return listScriptFiles(path);
        }
        return SCRIPT_FILE.test(entry.name) ? [path] : [];
    });
}

export function readSourceFiles(roots) {
    return roots
        .flatMap((root) => listScriptFiles(join(ROOT_DIR, root)))
        .map((path) => ({
            path: toPortablePath(path),
            content: readFileSync(path, "utf8"),
        }));
}
