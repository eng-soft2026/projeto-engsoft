import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "../../../src/app/(admin)/admin/layout.jsx";
import CustomerLayout from "../../../src/app/(customer)/layout.jsx";
import ManagerLayout from "../../../src/app/(manager)/manager/layout.jsx";
import { AreaLayout } from "../../../src/components/layout/area-layout.jsx";
import {
    ADMIN_AREA_NAVIGATION,
    MANAGER_AREA_NAVIGATION,
} from "../../../src/components/layout/navigation-links.js";
import { LOGIN_PATH } from "../../../src/modules/auth/guards.js";

const { auth, findActiveUser, redirect, notFound } = vi.hoisted(() => ({
    auth: vi.fn(),
    findActiveUser: vi.fn(),
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
    }),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("../../../src/modules/auth/auth.js", () => ({ auth }));
vi.mock("../../../src/services/auth-service.js", () => ({
    authService: { findActiveUser },
}));
vi.mock("next/navigation", () => ({ redirect, notFound }));

const USERS = Object.freeze({
    CUSTOMER: { id: "user-customer", name: "Ana Souza", role: "CUSTOMER" },
    MANAGER: { id: "user-manager", name: "Bruno Lima", role: "MANAGER" },
    ADMIN: { id: "user-admin", name: "Carla Dias", role: "ADMIN" },
});

const CHILDREN = <p>conteúdo</p>;

function signInAs(user) {
    auth.mockResolvedValue({ user: { id: user.id, role: user.role } });
    findActiveUser.mockResolvedValue(user);
}

function renderLayout(Layout) {
    return Layout({ children: CHILDREN });
}

describe("protected area layouts", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        auth.mockResolvedValue(null);
        findActiveUser.mockResolvedValue(null);
    });

    describe.each([
        ["customer", CustomerLayout],
        ["manager", ManagerLayout],
        ["admin", AdminLayout],
    ])("%s layout", (_name, Layout) => {
        it("redirects a visitor to the login page", async () => {
            await expect(renderLayout(Layout)).rejects.toThrow("NEXT_REDIRECT");
            expect(redirect).toHaveBeenCalledWith(LOGIN_PATH);
        });

        it("redirects a user whose session no longer matches an active account", async () => {
            auth.mockResolvedValue({ user: { id: "user-gone" } });

            await expect(renderLayout(Layout)).rejects.toThrow("NEXT_REDIRECT");
            expect(redirect).toHaveBeenCalledWith(LOGIN_PATH);
        });
    });

    describe.each([
        ["customer", CustomerLayout, ["MANAGER", "ADMIN"]],
        ["manager", ManagerLayout, ["CUSTOMER", "ADMIN"]],
        ["admin", AdminLayout, ["CUSTOMER", "MANAGER"]],
    ])("%s layout with a wrong role", (_name, Layout, wrongRoles) => {
        it.each(wrongRoles)("answers not found to %s", async (role) => {
            signInAs(USERS[role]);

            await expect(renderLayout(Layout)).rejects.toThrow(
                "NEXT_NOT_FOUND",
            );
            expect(notFound).toHaveBeenCalled();
        });
    });

    it("ignores the role stored in the session and uses the database one", async () => {
        auth.mockResolvedValue({
            user: { id: USERS.MANAGER.id, role: "ADMIN" },
        });
        findActiveUser.mockResolvedValue(USERS.MANAGER);

        await expect(renderLayout(AdminLayout)).rejects.toThrow(
            "NEXT_NOT_FOUND",
        );
    });

    it("renders the customer pages for a customer", async () => {
        signInAs(USERS.CUSTOMER);

        await expect(renderLayout(CustomerLayout)).resolves.toBe(CHILDREN);
    });

    it.each([
        [
            ManagerLayout,
            USERS.MANAGER,
            "Painel do gestor",
            MANAGER_AREA_NAVIGATION,
        ],
        [AdminLayout, USERS.ADMIN, "Painel admin", ADMIN_AREA_NAVIGATION],
    ])(
        "renders the area menu and the page for the area role",
        async (Layout, user, title, items) => {
            signInAs(user);

            const element = await renderLayout(Layout);

            expect(element.type).toBe(AreaLayout);
            expect(element.props.title).toBe(title);
            expect(element.props.items).toBe(items);
            expect(element.props.children).toBe(CHILDREN);
        },
    );
});
