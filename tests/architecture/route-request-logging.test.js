import { describe, expect, it } from "vitest";
import { readSourceFiles } from "../helpers/source-files.js";

const HTTP_METHODS = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";
const ROUTE_FILE = /^src\/app(\/.*)?\/route\.js$/;
const EXPORTED_METHOD = new RegExp(
    `export\\s+(?:async\\s+function|function|const|let|var)\\s+(${HTTP_METHODS})\\b`,
    "g",
);
const EXPORT_LIST = /export\s*(?:const\s*)?\{([^}]*)\}/g;

function toRouteLabel(path) {
    const directory = path.replace(/^src\/app/, "").replace(/\/route\.js$/, "");
    return directory || "/";
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findUnloggedRouteExports({ path, content }) {
    const label = toRouteLabel(path);
    const exportedMethods = [...content.matchAll(EXPORTED_METHOD)].map(
        (match) => match[1],
    );
    const unwrapped = exportedMethods.filter((method) => {
        const wrapped = new RegExp(
            `export\\s+const\\s+${method}\\s*=\\s*withRequestLogging\\(\\s*"${escapeRegExp(label)}"\\s*,`,
        );
        return !wrapped.test(content);
    });
    const listed = [...content.matchAll(EXPORT_LIST)]
        .flatMap((match) => match[1].split(","))
        .map((name) =>
            name
                .trim()
                .split(/\s+as\s+/)
                .pop(),
        )
        .filter((name) => new RegExp(`^(${HTTP_METHODS})$`).test(name));
    return [...unwrapped, ...listed].map((method) => `${path}: ${method}`);
}

describe("route request logging", () => {
    const routeFiles = readSourceFiles(["src/app"]).filter((file) =>
        ROUTE_FILE.test(file.path),
    );

    it("finds the route handlers", () => {
        expect(routeFiles.length).toBeGreaterThan(0);
    });

    it("wraps every exported HTTP method with withRequestLogging and the route path as label", () => {
        const violations = routeFiles.flatMap(findUnloggedRouteExports);

        expect(violations).toEqual([]);
    });

    it.each([
        [
            "a plain async function",
            "export async function GET(request) {\n    return new Response();\n}",
        ],
        ["a re-exported handler", "export const { GET, POST } = handlers;"],
        ["an export list", "export { handler as GET };"],
        [
            "a wrapper with a label that is not the route path",
            'export const GET = withRequestLogging("/api/hotels", handler);',
        ],
        ["an unwrapped constant", "export const PUT = handlers.PUT;"],
    ])("flags %s", (_label, content) => {
        const file = { path: "src/app/api/hotels/[id]/route.js", content };

        expect(findUnloggedRouteExports(file)).not.toEqual([]);
    });

    it("accepts a wrapped handler labeled with the route path", () => {
        const file = {
            path: "src/app/api/hotels/[id]/route.js",
            content:
                'export const GET = withRequestLogging(\n    "/api/hotels/[id]",\n    handler,\n);',
        };

        expect(findUnloggedRouteExports(file)).toEqual([]);
    });
});
