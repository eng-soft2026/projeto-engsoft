import { AuthPageLayout } from "../../modules/auth/components/auth-page-layout.jsx";
import { LoginForm } from "../../modules/auth/components/login-form.jsx";
import { buildAuthPageHref } from "../../modules/auth/callback-url.js";
import { redirectSignedInUser } from "../../modules/auth/redirect-signed-in-user.js";

export const metadata = { title: "Entrar | Reserva de Hotéis" };

export default async function LoginPage({ searchParams }) {
    const { callbackUrl } = await searchParams;
    await redirectSignedInUser(callbackUrl);

    return (
        <AuthPageLayout
            title="Entrar"
            description="Acesse sua conta para reservar e acompanhar suas estadias."
            footerText="Ainda não tem conta?"
            footerLinkLabel="Cadastre-se"
            footerHref={buildAuthPageHref("/register", callbackUrl)}
        >
            <LoginForm callbackUrl={callbackUrl} />
        </AuthPageLayout>
    );
}
