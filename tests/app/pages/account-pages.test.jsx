import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "../../../src/app/forgot-password/page.jsx";
import ProfilePage, {
    metadata as profileMetadata,
} from "../../../src/app/profile/page.jsx";
import ResetPasswordPage, {
    metadata as resetPasswordMetadata,
} from "../../../src/app/reset-password/page.jsx";
import { FormError } from "../../../src/components/ui/form-error.jsx";
import { ForgotPasswordForm } from "../../../src/modules/auth/components/forgot-password-form.jsx";
import { ResetPasswordForm } from "../../../src/modules/auth/components/reset-password-form.jsx";
import { MISSING_RESET_TOKEN_MESSAGE } from "../../../src/modules/auth/password-reset-messages.js";
import { ChangePasswordForm } from "../../../src/modules/users/components/change-password-form.jsx";
import { ProfileDetailsForm } from "../../../src/modules/users/components/profile-details-form.jsx";

const { requirePageAuth } = vi.hoisted(() => ({ requirePageAuth: vi.fn() }));

vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageAuth }));

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

function collectText(element) {
    if (element === null || element === undefined || element === false) {
        return "";
    }
    if (typeof element !== "object") {
        return String(element);
    }
    return [element.props?.children].flat().map(collectText).join("");
}

function renderResetPage(query) {
    return ResetPasswordPage({ searchParams: Promise.resolve(query) });
}

describe("ForgotPasswordPage", () => {
    it("renders the form with a link back to the login", () => {
        const element = ForgotPasswordPage();

        expect(element.props.footerHref).toBe("/login");
        expect(findElementByType(element, ForgotPasswordForm)).not.toBeNull();
    });
});

describe("ResetPasswordPage", () => {
    it("never sends the token in the Referer header", () => {
        expect(resetPasswordMetadata.referrer).toBe("no-referrer");
    });

    it("passes the trimmed token to the form and links to a new request", async () => {
        const element = await renderResetPage({
            token: "  token-de-recuperacao ",
        });

        expect(findElementByType(element, ResetPasswordForm).props.token).toBe(
            "token-de-recuperacao",
        );
        expect(element.props.footerHref).toBe("/forgot-password");
    });

    it.each([
        ["no token", {}],
        ["a blank token", { token: "   " }],
        ["a repeated token", { token: ["a", "b"] }],
    ])("shows a message without the form for %s", async (_, query) => {
        const element = await renderResetPage(query);

        expect(findElementByType(element, ResetPasswordForm)).toBeNull();
        expect(findElementByType(element, FormError).props.message).toBe(
            MISSING_RESET_TOKEN_MESSAGE,
        );
        expect(element.props.footerHref).toBe("/forgot-password");
    });
});

describe("ProfilePage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("has a title", () => {
        expect(profileMetadata.title).toBe("Meu perfil | Reserva de Hotéis");
    });

    it("lets the guard redirect a visitor before rendering", async () => {
        requirePageAuth.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");
    });

    it("shows CPF and role read-only and passes only name and e-mail to the form", async () => {
        requirePageAuth.mockResolvedValue({
            id: "user-1",
            name: "Ana Souza",
            email: "ana@example.com",
            cpf: "52998224725",
            role: "MANAGER",
        });

        const element = await ProfilePage();
        const text = collectText(element);

        expect(text).toContain("529.982.247-25");
        expect(text).toContain("Gestor de hotel");
        expect(
            findElementByType(element, ProfileDetailsForm).props.user,
        ).toEqual({ name: "Ana Souza", email: "ana@example.com" });
        expect(findElementByType(element, ChangePasswordForm)).not.toBeNull();
    });
});
