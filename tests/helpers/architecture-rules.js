import { Linter } from "eslint";

const SOURCE_ROOTS = ["src"];
const DATABASE_ROOTS = ["src", "prisma"];
const MONEY_PATH = /(pricing|payment|money)/i;
const ESLINT_DIRECTIVE = /^\s*eslint-(disable|enable)\b/;

const linter = new Linter();

const commentCollector = {
    meta: { type: "problem" },
    create(context) {
        return {
            Program() {
                for (const comment of context.sourceCode.getAllComments()) {
                    context.report({
                        loc: comment.loc,
                        message: `${comment.type}:${comment.value}`,
                    });
                }
            },
        };
    },
};

const COMMENT_LINTER_CONFIG = [
    {
        files: ["**/*.{js,jsx,mjs}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { architecture: { rules: { comments: commentCollector } } },
        rules: { "architecture/comments": "error" },
    },
];

function findLinesMatching(pattern) {
    return (content) =>
        content
            .split("\n")
            .flatMap((line, index) => (pattern.test(line) ? [index + 1] : []));
}

function findLineCommentLines(content, path) {
    const messages = linter.verify(content, COMMENT_LINTER_CONFIG, {
        filename: path,
    });
    const fatal = messages.find((message) => message.fatal);
    if (fatal) {
        throw new Error(`Cannot parse ${path}: ${fatal.message}`);
    }
    return messages
        .filter((message) => message.message.startsWith("Line:"))
        .filter(
            (message) =>
                !ESLINT_DIRECTIVE.test(message.message.slice("Line:".length)),
        )
        .map((message) => message.line);
}

export const PENDING_LOGGER_MIGRATION = [
    "src/lib/redis.js",
    "src/lib/route-response.js",
    "src/services/hotel-service.js",
];

export const ARCHITECTURE_RULES = [
    {
        id: "prisma-client-singleton",
        description: "new PrismaClient only in src/lib/prisma.js",
        roots: DATABASE_ROOTS,
        allowed: ["src/lib/prisma.js"],
        findLines: findLinesMatching(/\bnew\s+PrismaClient\b/),
    },
    {
        id: "transaction-runner",
        description: "$transaction only in src/lib/transaction.js and the seed",
        roots: DATABASE_ROOTS,
        allowed: ["src/lib/transaction.js", "prisma/seed.js", "prisma/seeds/"],
        findLines: findLinesMatching(/\$transaction\b/),
    },
    {
        id: "route-without-repository",
        description: "src/app never imports a repository",
        roots: ["src/app"],
        allowed: [],
        findLines: findLinesMatching(
            /\b(from|import)\s*\(?\s*["'][^"']*\brepositories\//,
        ),
    },
    {
        id: "money-without-number",
        description: "money modules never convert to a JavaScript number",
        roots: SOURCE_ROOTS,
        isInScope: (path) => MONEY_PATH.test(path),
        allowed: [],
        findLines: findLinesMatching(/\bparseFloat\s*\(|\bNumber\s*\(/),
    },
    {
        id: "money-without-to-fixed",
        description:
            "money modules never call toFixed outside the Decimal formatter",
        roots: SOURCE_ROOTS,
        isInScope: (path) => MONEY_PATH.test(path),
        allowed: ["src/utils/money.js"],
        findLines: findLinesMatching(/\.toFixed\s*\(/),
    },
    {
        id: "console-through-logger",
        description: "console is only used by the logger",
        roots: SOURCE_ROOTS,
        allowed: PENDING_LOGGER_MIGRATION,
        findLines: findLinesMatching(/\bconsole\s*\.\s*\w+/),
    },
    {
        id: "environment-in-config",
        description: "process.env is only read in src/config and src/lib",
        roots: SOURCE_ROOTS,
        allowed: ["src/config/", "src/lib/"],
        findLines: findLinesMatching(/\bprocess\s*\.\s*env\b/),
    },
    {
        id: "no-line-comments",
        description:
            "no // comments in src (DT012), except the legacy src/domain",
        roots: SOURCE_ROOTS,
        allowed: ["src/domain/"],
        findLines: findLineCommentLines,
    },
];

function isUnderRoot(path, root) {
    return path === root || path.startsWith(`${root}/`);
}

function isAllowed(path, allowed) {
    return allowed.some((entry) =>
        entry.endsWith("/") ? path.startsWith(entry) : path === entry,
    );
}

function isChecked(rule, path) {
    if (!rule.roots.some((root) => isUnderRoot(path, root))) {
        return false;
    }
    if (rule.isInScope && !rule.isInScope(path)) {
        return false;
    }
    return !isAllowed(path, rule.allowed);
}

export function findViolations(rule, files) {
    return files
        .filter((file) => isChecked(rule, file.path))
        .flatMap((file) =>
            rule
                .findLines(file.content, file.path)
                .map((line) => `${file.path}:${line}`),
        );
}

export function findRule(id) {
    return ARCHITECTURE_RULES.find((rule) => rule.id === id);
}
