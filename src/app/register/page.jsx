import { AuthPageLayout } from "../../modules/auth/components/auth-page-layout.jsx";
import { RegisterForm } from "../../modules/auth/components/register-form.jsx";
import { buildAuthPageHref } from "../../modules/auth/callback-url.js";
import { redirectSignedInUser } from "../../modules/auth/redirect-signed-in-user.js";

export const metadata = { title: "Criar conta | Reserva de Hotéis" };

export default async function RegisterPage({ searchParams }) {
    const { callbackUrl } = await searchParams;
    await redirectSignedInUser(callbackUrl);

    return (
        <AuthPageLayout
            title="Criar conta"
            description="Cadastre-se como cliente para reservar ou como gestor para anunciar seu hotel."
            footerText="Já tem conta?"
            footerLinkLabel="Entrar"
            footerHref={buildAuthPageHref("/login", callbackUrl)}
        >
            <RegisterForm callbackUrl={callbackUrl} />
        </AuthPageLayout>
    );
}
