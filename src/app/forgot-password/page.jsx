import { AuthPageLayout } from "../../modules/auth/components/auth-page-layout.jsx";
import { ForgotPasswordForm } from "../../modules/auth/components/forgot-password-form.jsx";

export const metadata = { title: "Recuperar senha | Reserva de Hotéis" };

export default function ForgotPasswordPage() {
    return (
        <AuthPageLayout
            title="Recuperar senha"
            description="Informe o e-mail da sua conta para receber um link de redefinição de senha."
            footerText="Lembrou a senha?"
            footerLinkLabel="Entrar"
            footerHref="/login"
        >
            <ForgotPasswordForm />
        </AuthPageLayout>
    );
}
