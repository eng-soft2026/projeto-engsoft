import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthPageLayout } from "../../../src/modules/auth/components/auth-page-layout.jsx";

describe("AuthPageLayout", () => {
    it("renders the title, the content and the link to the other page", () => {
        render(
            <AuthPageLayout
                title="Entrar"
                description="Acesse sua conta."
                footerText="Ainda não tem conta?"
                footerLinkLabel="Cadastre-se"
                footerHref="/register?callbackUrl=%2Freservations"
            >
                <p>conteúdo</p>
            </AuthPageLayout>,
        );

        expect(
            screen.getByRole("heading", { level: 1, name: "Entrar" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Acesse sua conta.")).toBeInTheDocument();
        expect(screen.getByText("conteúdo")).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Cadastre-se" }),
        ).toHaveAttribute("href", "/register?callbackUrl=%2Freservations");
    });
});
