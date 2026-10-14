import { randomInt, randomUUID } from "node:crypto";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SMOKE_PASSWORD = `Smoke${randomUUID().slice(0, 8)}1`;
const VALID_CNPJ = "11222333000181";

class SmokeFailure extends Error {}

function calculateCpfDigit(digits) {
    const weightStart = digits.length + 1;
    const sum = digits.reduce(
        (total, digit, index) => total + digit * (weightStart - index),
        0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
}

function generateCpf() {
    const base = Array.from({ length: 9 }, () => randomInt(0, 10));
    if (new Set(base).size === 1) {
        base[0] = (base[0] + 1) % 10;
    }
    const firstDigit = calculateCpfDigit(base);
    const secondDigit = calculateCpfDigit([...base, firstDigit]);
    return [...base, firstDigit, secondDigit].join("");
}

function createSession(label) {
    const cookies = new Map();

    function storeCookies(response) {
        for (const header of response.headers.getSetCookie()) {
            const [pair, ...attributes] = header.split(";");
            const separatorIndex = pair.indexOf("=");
            const name = pair.slice(0, separatorIndex).trim();
            const value = pair.slice(separatorIndex + 1).trim();
            const isExpired = attributes.some((attribute) =>
                /^\s*max-age=0\s*$/i.test(attribute),
            );
            if (value === "" || isExpired) {
                cookies.delete(name);
                continue;
            }
            cookies.set(name, value);
        }
    }

    function buildCookieHeader() {
        return [...cookies]
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
    }

    async function request(method, path, body) {
        const headers = { cookie: buildCookieHeader() };
        if (body !== undefined) {
            headers["content-type"] = "application/json";
        }
        const response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            redirect: "manual",
        });
        storeCookies(response);
        const payload = await response.json().catch(() => null);
        return { status: response.status, payload };
    }

    return Object.freeze({ label, request });
}

function describeError(payload) {
    const error = payload?.error;
    return error ? `${error.code}: ${error.message}` : "no error envelope";
}

async function step(name, session, { method, path, body, status, errorCode }) {
    const { status: actualStatus, payload } = await session.request(
        method,
        path,
        body,
    );
    const isExpectedSuccess = errorCode === undefined;
    const hasEnvelope = payload?.success === isExpectedSuccess;
    const hasErrorCode =
        isExpectedSuccess || payload?.error?.code === errorCode;

    if (actualStatus !== status || !hasEnvelope || !hasErrorCode) {
        throw new SmokeFailure(
            `${name} [${session.label}]: expected ${status}${errorCode ? ` ${errorCode}` : ""}, got ${actualStatus} (${describeError(payload)})`,
        );
    }
    console.log(`PASS ${name}`);
    return payload.data;
}

function readAdminCredentials() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        throw new SmokeFailure(
            "ADMIN_EMAIL and ADMIN_PASSWORD must be set (run with --env-file=.env).",
        );
    }
    return { email, password };
}

function buildManagerAccount() {
    const tag = randomUUID().slice(0, 8);
    return {
        name: `Smoke Manager ${tag}`,
        email: `smoke-manager-${tag}@example.com`,
        cpf: generateCpf(),
        password: SMOKE_PASSWORD,
        role: "MANAGER",
    };
}

function buildUnit(overrides = {}) {
    return {
        name: "Unidade Centro",
        email: "centro@example.com",
        checkInTime: "14:00",
        checkOutTime: "12:00",
        overbookingPercentage: 5,
        address: {
            zipCode: "01001-000",
            street: "Praça da Sé",
            number: "100",
            neighborhood: "Sé",
            city: "São Paulo",
            state: "SP",
        },
        phones: ["(11) 3333-4444"],
        ...overrides,
    };
}

async function runManagerFlow(manager) {
    const account = buildManagerAccount();

    await step("register manager", manager, {
        method: "POST",
        path: "/api/auth/register",
        body: account,
        status: 201,
    });
    await step("register duplicate is rejected", manager, {
        method: "POST",
        path: "/api/auth/register",
        body: account,
        status: 409,
        errorCode: "USER_ALREADY_EXISTS",
    });
    await step("login manager", manager, {
        method: "POST",
        path: "/api/auth/login",
        body: { email: account.email, password: account.password },
        status: 200,
    });
    await step("read own profile", manager, {
        method: "GET",
        path: "/api/users/me",
        status: 200,
    });

    const hotel = await step("create hotel", manager, {
        method: "POST",
        path: "/api/hotels",
        body: {
            name: "Hotel Smoke",
            description: "Hotel criado pelo smoke test.",
            category: "HOTEL",
            cnpj: VALID_CNPJ,
            email: account.email,
        },
        status: 201,
    });
    await step("overbooking above 10% is rejected", manager, {
        method: "POST",
        path: `/api/hotels/${hotel.id}/units`,
        body: buildUnit({ overbookingPercentage: 11 }),
        status: 400,
        errorCode: "VALIDATION_ERROR",
    });
    const unit = await step("create unit", manager, {
        method: "POST",
        path: `/api/hotels/${hotel.id}/units`,
        body: buildUnit(),
        status: 201,
    });
    const roomType = await step("create room type", manager, {
        method: "POST",
        path: `/api/hotels/${hotel.id}/room-types`,
        body: {
            name: "Standard",
            description: "Quarto padrão.",
            maxGuests: 2,
            areaM2: "20.50",
            defaultPrice: "250.00",
            beds: [{ bedType: "DOUBLE", quantity: 1 }],
        },
        status: 201,
    });
    const room = await step("create room", manager, {
        method: "POST",
        path: `/api/units/${unit.id}/rooms`,
        body: {
            roomTypeId: roomType.id,
            number: "101",
            floor: 1,
            price: "300.00",
        },
        status: 201,
    });
    await step("duplicate room number is rejected", manager, {
        method: "POST",
        path: `/api/units/${unit.id}/rooms`,
        body: { roomTypeId: roomType.id, number: "101", floor: 1 },
        status: 409,
        errorCode: "ROOM_NUMBER_ALREADY_EXISTS",
    });
    const amenity = await step("create amenity", manager, {
        method: "POST",
        path: "/api/amenities",
        body: { name: `Wi-Fi ${randomUUID().slice(0, 8)}` },
        status: 201,
    });
    for (const [target, id] of [
        ["hotels", hotel.id],
        ["units", unit.id],
        ["room-types", roomType.id],
        ["rooms", room.id],
    ]) {
        await step(`attach amenity to ${target}`, manager, {
            method: "PUT",
            path: `/api/${target}/${id}/amenities`,
            body: { amenityIds: [amenity.id] },
            status: 200,
        });
    }
    await step("create policy", manager, {
        method: "POST",
        path: `/api/hotels/${hotel.id}/policies`,
        body: {
            type: "QUIET_HOURS",
            title: "Silêncio",
            description: "Silêncio das 22h às 7h.",
        },
        status: 201,
    });
    await step("replace acceptances", manager, {
        method: "PUT",
        path: `/api/hotels/${hotel.id}/acceptances`,
        body: {
            acceptances: [
                { type: "PETS", isAllowed: true, details: "Até 10 kg." },
                { type: "SMOKING", isAllowed: false },
                { type: "OTHER", customLabel: "Festas", isAllowed: false },
            ],
        },
        status: 200,
    });
    await step("submit hotel for review", manager, {
        method: "POST",
        path: `/api/hotels/${hotel.id}/submit-review`,
        status: 200,
    });
    await step("unit creation under review is rejected", manager, {
        method: "POST",
        path: `/api/hotels/${hotel.id}/units`,
        body: buildUnit({ name: "Unidade Bloqueada" }),
        status: 409,
        errorCode: "INVALID_HOTEL_STATUS",
    });

    return hotel;
}

async function runAdminFlow(admin, hotel) {
    await step("login admin", admin, {
        method: "POST",
        path: "/api/auth/login",
        body: readAdminCredentials(),
        status: 200,
    });
    const underReview = await step("list hotels under review", admin, {
        method: "GET",
        path: "/api/admin/hotels?status=UNDER_REVIEW",
        status: 200,
    });
    if (!underReview.some((candidate) => candidate.id === hotel.id)) {
        throw new SmokeFailure("list hotels under review: hotel is missing");
    }

    const approval = {
        method: "POST",
        path: `/api/admin/hotels/${hotel.id}/approve`,
        body: { reason: "Aprovado pelo smoke test." },
    };
    const results = await Promise.all([
        admin.request(approval.method, approval.path, approval.body),
        admin.request(approval.method, approval.path, approval.body),
    ]);
    const statuses = results.map((result) => result.status).sort();
    const conflict = results.find((result) => result.status === 409);
    if (
        statuses.join(",") !== "200,409" ||
        conflict.payload?.error?.code !== "INVALID_HOTEL_STATUS"
    ) {
        throw new SmokeFailure(
            `parallel approve: expected one 200 and one 409 INVALID_HOTEL_STATUS, got ${statuses.join(",")}`,
        );
    }
    console.log("PASS parallel approve (one 200, one 409)");

    const published = await step("read approved hotel", admin, {
        method: "GET",
        path: `/api/hotels/${hotel.id}`,
        status: 200,
    });
    if (published.status !== "PUBLISHED") {
        throw new SmokeFailure(
            `read approved hotel: expected PUBLISHED, got ${published.status}`,
        );
    }
    console.log("PASS hotel is PUBLISHED");

    await step("logout admin", admin, {
        method: "POST",
        path: "/api/auth/logout",
        status: 200,
    });
    await step("profile without session is rejected", admin, {
        method: "GET",
        path: "/api/users/me",
        status: 401,
        errorCode: "UNAUTHORIZED",
    });
}

try {
    console.log(`Smoke test against ${BASE_URL}`);
    const hotel = await runManagerFlow(createSession("manager"));
    await runAdminFlow(createSession("admin"), hotel);
    console.log("Smoke test passed.");
} catch (error) {
    const message =
        error instanceof SmokeFailure
            ? error.message
            : `unexpected error: ${error?.message ?? error}`;
    console.error(`FAIL ${message}`);
    process.exit(1);
}
