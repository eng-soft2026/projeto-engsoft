import { FormError } from "../../components/ui/form-error.jsx";
import { AuthPageLayout } from "../../modules/auth/components/auth-page-layout.jsx";
import { ResetPasswordForm } from "../../modules/auth/components/reset-password-form.jsx";
import { MISSING_RESET_TOKEN_MESSAGE } from "../../modules/auth/password-reset-messages.js";

export const metadata = {
    title: "Redefinir senha | Reserva de Hotéis",
    referrer: "no-referrer",
};

function readToken(token) {
    return typeof token === "string" ? token.trim() : "";
}

export default async function ResetPasswordPage({ searchParams }) {
    const token = readToken((await searchParams).token);

    return (
        <AuthPageLayout
            title="Redefinir senha"
            description="Escolha uma nova senha para a sua conta."
            footerText="Link expirado?"
            footerLinkLabel="Pedir novo link"
            footerHref="/forgot-password"
        >
            {token ? (
                <ResetPasswordForm token={token} />
            ) : (
                <FormError message={MISSING_RESET_TOKEN_MESSAGE} />
            )}
        </AuthPageLayout>
    );
}
