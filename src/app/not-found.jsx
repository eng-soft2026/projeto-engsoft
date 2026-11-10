import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "../components/ui/empty-state.jsx";

export const metadata = { title: "Página não encontrada | Reserva de Hotéis" };

export default function NotFound() {
    return (
        <section className="max-w-page px-gutter py-section mx-auto flex w-full flex-col">
            <EmptyState
                icon={SearchX}
                title="Página não encontrada"
                description="O endereço não existe ou você não tem acesso a ele."
                action={
                    <Link
                        href="/"
                        className="rounded-control bg-primary text-primary-foreground hover:bg-primary-hover px-4 py-2 text-sm font-medium"
                    >
                        Voltar para o início
                    </Link>
                }
            />
        </section>
    );
}
