import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../../../src/app/login/page.jsx";
import RegisterPage from "../../../src/app/register/page.jsx";
import { LoginForm } from "../../../src/modules/auth/components/login-form.jsx";
import { RegisterForm } from "../../../src/modules/auth/components/register-form.jsx";

const { redirectSignedInUser } = vi.hoisted(() => ({
    redirectSignedInUser: vi.fn(),
}));

vi.mock("../../../src/modules/auth/redirect-signed-in-user.js", () => ({
    redirectSignedInUser,
}));

const PAGES = [
    {
        name: "LoginPage",
        Page: LoginPage,
        Form: LoginForm,
        footerHref: "/register?callbackUrl=%2Freservations",
    },
    {
        name: "RegisterPage",
        Page: RegisterPage,
        Form: RegisterForm,
        footerHref: "/login?callbackUrl=%2Freservations",
    },
];

function findElementByType(element, type) {
    if (!element || typeof element !== "object") {
        return null;
    }
    if (element.type === type) {
        return element;
    }
    const children = [element.props?.children].flat();
    for (const child of children) {
        const match = findElementByType(child, type);
        if (match) {
            return match;
        }
    }
    return null;
}

describe.each(PAGES)("$name", ({ Page, Form, footerHref }) => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects a signed-in user before rendering", async () => {
        redirectSignedInUser.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(
            Page({ searchParams: Promise.resolve({ callbackUrl: "/x" }) }),
        ).rejects.toThrow("NEXT_REDIRECT");
        expect(redirectSignedInUser).toHaveBeenCalledWith("/x");
    });

    it("renders the form with the callback URL for a visitor", async () => {
        redirectSignedInUser.mockResolvedValue(undefined);

        const element = await Page({
            searchParams: Promise.resolve({ callbackUrl: "/reservations" }),
        });

        expect(element.props.footerHref).toBe(footerHref);
        expect(findElementByType(element, Form).props.callbackUrl).toBe(
            "/reservations",
        );
    });
});
