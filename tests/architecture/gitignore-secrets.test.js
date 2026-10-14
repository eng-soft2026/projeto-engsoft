import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SECRET_ENV_FILES = [
    ".env",
    ".env.test",
    ".env.local",
    ".env.test.local",
    ".env.production.local",
];
const EXAMPLE_ENV_FILES = [".env.example", ".env.test.example"];
const ENV_FILE_NAME = /(^|\/)\.env(\.[^/]+)?$/;
const EXAMPLE_SUFFIX = ".example";

function isIgnoredByGit(path) {
    try {
        execFileSync("git", ["check-ignore", "--quiet", "--no-index", path]);
        return true;
    } catch (error) {
        if (error.status === 1) {
            return false;
        }
        throw error;
    }
}

function listTrackedFiles() {
    return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
        .split("\0")
        .filter(Boolean);
}

describe(".gitignore keeps secret env files out of git (doc 15)", () => {
    it.each(SECRET_ENV_FILES)("ignores %s", (path) => {
        expect(isIgnoredByGit(path)).toBe(true);
    });

    it.each(EXAMPLE_ENV_FILES)("keeps %s tracked", (path) => {
        expect(isIgnoredByGit(path)).toBe(false);
    });

    it("tracks no env file other than the examples", () => {
        const trackedEnvFiles = listTrackedFiles().filter(
            (path) =>
                ENV_FILE_NAME.test(path) && !path.endsWith(EXAMPLE_SUFFIX),
        );

        expect(trackedEnvFiles).toEqual([]);
    });
});
