"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "../components/ui/button.jsx";
import { EmptyState } from "../components/ui/empty-state.jsx";

export default function ErrorPage({ error, reset }) {
    const digest = error?.digest;

    return (
        <section className="max-w-page px-gutter py-section mx-auto flex w-full flex-col">
            <EmptyState
                icon={TriangleAlert}
                title="Algo deu errado"
                description="Não foi possível carregar esta página. Tente novamente em instantes."
                action={
                    <div className="flex flex-col items-center gap-2">
                        <Button onClick={() => reset()}>
                            Tentar novamente
                        </Button>
                        {digest && (
                            <p className="text-muted-foreground text-xs">
                                Código do erro: {digest}
                            </p>
                        )}
                    </div>
                }
            />
        </section>
    );
}
