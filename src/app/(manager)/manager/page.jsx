import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "../../../components/ui/empty-state.jsx";

export const metadata = { title: "Painel do gestor | Reserva de Hotéis" };

export default function ManagerDashboardPage() {
    return (
        <>
            <h1 className="text-foreground text-2xl font-semibold">
                Painel do gestor
            </h1>
            <EmptyState
                icon={LayoutDashboard}
                title="Em construção"
                description="Os indicadores dos seus hotéis aparecerão aqui. Use o menu para acessar as áreas do painel."
            />
        </>
    );
}
