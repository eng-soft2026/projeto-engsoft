import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "../../../components/ui/empty-state.jsx";

export const metadata = { title: "Painel admin | Reserva de Hotéis" };

export default function AdminDashboardPage() {
    return (
        <>
            <h1 className="text-foreground text-2xl font-semibold">
                Painel admin
            </h1>
            <EmptyState
                icon={LayoutDashboard}
                title="Em construção"
                description="Os indicadores da plataforma aparecerão aqui. Use o menu para acessar as áreas administrativas."
            />
        </>
    );
}
