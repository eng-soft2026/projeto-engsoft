import { describe, expect, it } from "vitest";
import { Linter } from "eslint";
import { readSourceFiles } from "../helpers/source-files.js";
import { ROUTE_ACCESS_TABLE } from "./route-access.table.js";

const HTTP_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
];
const ACCESS_TYPES = new Set(["public", "authenticated", "roles", "authjs"]);
const linter = new Linter();

const astCaptureRule = {
    meta: { type: "problem" },
    create(context) {
        return {
            Program() {
                context.settings.routeAccessCaptureAst(context.sourceCode.ast);
            },
        };
    },
};

const AST_CAPTURE_CONFIG = [
    {
        languageOptions: { ecmaVersion: "latest", sourceType: "module" },
        plugins: {
            routeAccess: {
                rules: { "capture-ast": astCaptureRule },
            },
        },
        rules: { "routeAccess/capture-ast": "error" },
    },
];

function parseModule(content, path) {
    let ast;
    const messages = linter.verify(
        content,
        AST_CAPTURE_CONFIG.map((config) => ({
            ...config,
            settings: {
                routeAccessCaptureAst(parsedAst) {
                    ast = parsedAst;
                },
            },
        })),
        { filename: path },
    );
    const fatal = messages.find((message) => message.fatal);

    if (fatal) {
        throw new Error(`Cannot parse ${path}: ${fatal.message}`);
    }
    if (!ast) {
        throw new Error(`Could not read the module syntax tree for ${path}`);
    }
    return ast;
}

function getExportedHttpMethods(ast) {
    return ast.body.flatMap((statement) => {
        if (statement.type !== "ExportNamedDeclaration") {
            return [];
        }

        const methodNames = [];
        const declaration = statement.declaration;

        if (declaration?.type === "FunctionDeclaration") {
            methodNames.push(declaration.id?.name);
        } else if (declaration?.type === "VariableDeclaration") {
            methodNames.push(
                ...declaration.declarations.map(
                    (item) => item.id.type === "Identifier" && item.id.name,
                ),
            );
        }

        methodNames.push(
            ...statement.specifiers.map((specifier) =>
                specifier.type === "ExportSpecifier"
                    ? specifier.exported.name
                    : null,
            ),
        );

        return methodNames
            .filter((name) => HTTP_METHODS.includes(name))
            .map((method) => ({ method }));
    });
}

function discoverRouteMethods(files) {
    return files
        .filter(
            ({ path }) =>
                path.startsWith("src/app/api/") && path.endsWith("/route.js"),
        )
        .flatMap(({ path, content }) => {
            const routePath = path
                .slice("src/app".length, -"/route.js".length)
                .replace(/\[([^\]]+)\]/g, (segment, parameter) =>
                    parameter.startsWith("...")
                        ? `[${parameter}]`
                        : `:${parameter}`,
                );

            return getExportedHttpMethods(parseModule(content, path)).map(
                ({ method }) => ({ path: routePath, method }),
            );
        });
}

function pairKey({ path, method }) {
    return `${method} ${path}`;
}

const routeFiles = readSourceFiles(["src/app/api"]);
const discoveredRoutes = discoverRouteMethods(routeFiles);
const declaredRoutes = ROUTE_ACCESS_TABLE;

describe("API route access matrix", () => {
    it.each(HTTP_METHODS)(
        "discovers %s from a named route handler declaration",
        (method) => {
            const routes = discoverRouteMethods([
                {
                    path: "src/app/api/example/route.js",
                    content: `export const ${method} = () => {};`,
                },
            ]);

            expect(routes).toEqual([{ path: "/api/example", method }]);
        },
    );

    it("discovers function declarations, named exports, and aliases", () => {
        const routes = discoverRouteMethods([
            {
                path: "src/app/api/example/route.js",
                content: [
                    "export async function GET() {}",
                    "const handler = () => {};",
                    "export { handler as POST };",
                    "const update = () => {};",
                    "export { update as PATCH };",
                    "const remove = () => {};",
                    "export { remove as DELETE };",
                ].join("\n"),
            },
        ]);

        expect(routes.map(({ method }) => method)).toEqual([
            "GET",
            "POST",
            "PATCH",
            "DELETE",
        ]);
    });

    it("uses exported alias names and discovers multiple aliases together", () => {
        const routes = discoverRouteMethods([
            {
                path: "src/app/api/example/route.js",
                content: [
                    "const GET = () => {};",
                    "const handler = () => {};",
                    "export { handler as GET, GET as POST, handler as PATCH };",
                ].join("\n"),
            },
        ]);

        expect(routes.map(({ method }) => method)).toEqual([
            "GET",
            "POST",
            "PATCH",
        ]);
    });

    it("ignores export-like text inside comments and strings", () => {
        const routes = discoverRouteMethods([
            {
                path: "src/app/api/example/route.js",
                content: [
                    "// export const GET = () => {};",
                    "/* export { handler as POST }; */",
                    'const text = "export const DELETE = () => {}";',
                    "export const OPTIONS = () => {};",
                ].join("\n"),
            },
        ]);

        expect(routes).toEqual([{ path: "/api/example", method: "OPTIONS" }]);
    });

    it("identifies a newly exported method so the matrix comparison rejects it", () => {
        const routes = discoverRouteMethods([
            {
                path: "src/app/api/example/route.js",
                content: "export const OPTIONS = () => {};",
            },
        ]);
        const declaredKeys = declaredRoutes.map(pairKey);
        const missingDeclarations = routes
            .map(pairKey)
            .filter((key) => !declaredKeys.includes(key));

        expect(missingDeclarations).toEqual(["OPTIONS /api/example"]);
    });

    it("declares a supported access policy for every route method", () => {
        for (const entry of declaredRoutes) {
            expect(ACCESS_TYPES.has(entry.access), pairKey(entry)).toBe(true);
            if (entry.access === "roles") {
                expect(entry.roles?.length, pairKey(entry)).toBeGreaterThan(0);
                expect(
                    entry.roles?.every((role) =>
                        ["CUSTOMER", "MANAGER", "ADMIN"].includes(role),
                    ),
                    pairKey(entry),
                ).toBe(true);
            } else {
                expect(entry.roles, pairKey(entry)).toBeUndefined();
            }
        }
    });

    it("has no duplicate route-method declarations", () => {
        const declarationKeys = declaredRoutes.map(pairKey);
        const duplicates = declarationKeys.filter(
            (key, index) => declarationKeys.indexOf(key) !== index,
        );

        expect(duplicates).toEqual([]);
    });

    it("declares every discovered route method and no nonexistent method", () => {
        const discoveredKeys = discoveredRoutes.map(pairKey);
        const declaredKeys = declaredRoutes.map(pairKey);
        const missingDeclarations = discoveredKeys.filter(
            (key) => !declaredKeys.includes(key),
        );
        const nonexistentDeclarations = declaredKeys.filter(
            (key) => !discoveredKeys.includes(key),
        );

        expect(missingDeclarations).toEqual([]);
        expect(nonexistentDeclarations).toEqual([]);
    });
});
