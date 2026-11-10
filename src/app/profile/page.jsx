import { Card, CardTitle } from "../../components/ui/card.jsx";
import { requirePageAuth } from "../../modules/auth/guards.js";
import { ChangePasswordForm } from "../../modules/users/components/change-password-form.jsx";
import { ProfileDetailsForm } from "../../modules/users/components/profile-details-form.jsx";
import { getUserRoleLabel } from "../../modules/users/user-role-labels.js";
import { formatCpf } from "../../utils/cpf.js";

export const metadata = { title: "Meu perfil | Reserva de Hotéis" };

export default async function ProfilePage() {
    const user = await requirePageAuth();

    return (
        <section className="max-w-page px-gutter py-section mx-auto flex w-full flex-col gap-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-foreground text-2xl font-semibold">
                    Meu perfil
                </h1>
                <p className="text-muted-foreground text-sm">
                    Atualize seu nome, e-mail e senha. CPF e tipo de conta não
                    podem ser alterados.
                </p>
            </header>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="flex flex-col gap-4">
                    <CardTitle>Dados pessoais</CardTitle>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-muted-foreground">CPF</dt>
                            <dd className="text-foreground">
                                {formatCpf(user.cpf)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                Tipo de conta
                            </dt>
                            <dd className="text-foreground">
                                {getUserRoleLabel(user.role)}
                            </dd>
                        </div>
                    </dl>
                    <ProfileDetailsForm
                        user={{ name: user.name, email: user.email }}
                    />
                </Card>
                <Card className="flex flex-col gap-4">
                    <CardTitle>Alterar senha</CardTitle>
                    <ChangePasswordForm />
                </Card>
            </div>
        </section>
    );
}
