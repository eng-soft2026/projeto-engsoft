import { describe, expect, it } from "vitest";
import {
    ARCHITECTURE_RULES,
    findRule,
    findViolations,
} from "../helpers/architecture-rules.js";
import { readSourceFiles } from "../helpers/source-files.js";

const sourceFiles = readSourceFiles(["src", "prisma"]);

const FIXTURES = {
    "prisma-client-singleton": {
        violating: {
            path: "src/repositories/user-repository.js",
            content: "const prisma = new PrismaClient({ adapter });",
        },
        passing: {
            path: "src/repositories/user-repository.js",
            content: "const prisma = getPrisma();",
        },
        allowed: {
            path: "src/lib/prisma.js",
            content: "return new PrismaClient({ adapter });",
        },
    },
    "transaction-runner": {
        violating: {
            path: "src/services/hotel-service.js",
            content:
                "await prisma.$transaction(async (client) => work(client));",
        },
        passing: {
            path: "src/services/hotel-service.js",
            content:
                "await transactionRunner.run(async (client) => work(client));",
        },
        allowed: {
            path: "prisma/seeds/seed-database.js",
            content: "await prisma.$transaction([first, second]);",
        },
    },
    "route-without-repository": {
        violating: {
            path: "src/app/api/hotels/route.js",
            content: [
                "import {",
                "    hotelRepository,",
                '} from "../../../repositories/hotel-repository.js";',
            ].join("\n"),
        },
        passing: {
            path: "src/app/api/hotels/route.js",
            content:
                'import { hotelService } from "../../../services/hotel-service.js";',
        },
        allowed: {
            path: "src/services/hotel-service.js",
            content:
                'import { hotelRepository } from "../repositories/hotel-repository.js";',
        },
    },
    "money-without-number": {
        violating: {
            path: "src/modules/pricing/price-calculator.js",
            content: "const total = Number(price) * nights;",
        },
        passing: {
            path: "src/modules/pricing/price-calculator.js",
            content: "const total = new Decimal(price).times(nights);",
        },
        allowed: {
            path: "src/services/unit-service.js",
            content: "const percent = Number(setting.value);",
        },
    },
    "money-without-to-fixed": {
        violating: {
            path: "src/modules/payments/refund.js",
            content: "const amount = refund.toFixed(2);",
        },
        passing: {
            path: "src/modules/payments/refund.js",
            content: "const amount = toDecimalString(refund);",
        },
        allowed: {
            path: "src/utils/money.js",
            content: "return new Decimal(value).toFixed(MONEY_DECIMAL_PLACES);",
        },
    },
    "console-through-logger": {
        violating: {
            path: "src/services/room-service.js",
            content: 'console.log("room created", room.id);',
        },
        passing: {
            path: "src/services/room-service.js",
            content: 'logger.info("room created", { roomId: room.id });',
        },
        allowed: {
            path: "src/lib/logger.js",
            content: 'console.error("logger destination failed");',
        },
    },
    "environment-in-config": {
        violating: {
            path: "src/services/payment-service.js",
            content: "const key = process.env.STRIPE_SECRET_KEY;",
        },
        passing: {
            path: "src/services/payment-service.js",
            content: "const key = config.stripeSecretKey;",
        },
        allowed: {
            path: "src/config/stripe.js",
            content:
                "export const stripeSecretKey = process.env.STRIPE_SECRET_KEY;",
        },
    },
    "no-line-comments": {
        violating: {
            path: "src/components/hotel-card.jsx",
            content: [
                "export function HotelCard() {",
                "    // render the card",
                "    return <div>{'https://example.com'}</div>;",
                "}",
            ].join("\n"),
        },
        passing: {
            path: "src/components/hotel-card.jsx",
            content: [
                "export function HotelCard() {",
                '    const url = "https://example.com";',
                "    // eslint-disable-next-line no-console",
                "    return <a href={url}>site</a>;",
                "}",
            ].join("\n"),
        },
        allowed: {
            path: "src/domain/reserva.js",
            content: "// legacy entity\nexport class Reserva {}",
        },
    },
};

describe("architecture guard rules", () => {
    it("has fixtures for every rule", () => {
        expect(Object.keys(FIXTURES).sort()).toEqual(
            ARCHITECTURE_RULES.map((rule) => rule.id).sort(),
        );
    });

    describe.each(ARCHITECTURE_RULES)("$id: $description", (rule) => {
        const fixtures = FIXTURES[rule.id];

        it("finds no violation in the source tree", () => {
            expect(findViolations(rule, sourceFiles)).toEqual([]);
        });

        it("flags the violating fixture", () => {
            expect(findViolations(rule, [fixtures.violating])).not.toEqual([]);
        });

        it("accepts the passing fixture", () => {
            expect(findViolations(rule, [fixtures.passing])).toEqual([]);
        });

        it("accepts the allowlisted fixture", () => {
            expect(findViolations(rule, [fixtures.allowed])).toEqual([]);
        });
    });

    it("reports the file and line of each violation", () => {
        const rule = findRule("route-without-repository");
        const file = FIXTURES["route-without-repository"].violating;

        expect(findViolations(rule, [file])).toEqual([`${file.path}:3`]);
    });

    it("lets the eslint directives through but flags the other line comments", () => {
        const rule = findRule("no-line-comments");
        const file = {
            path: "src/lib/example.js",
            content: [
                "// eslint-disable-next-line no-undef",
                "const value = 1;",
                "// eslint is not a directive here, but the next one is a note",
                "/* block comments are outside this rule */",
            ].join("\n"),
        };

        expect(findViolations(rule, [file])).toEqual(["src/lib/example.js:3"]);
    });
});
