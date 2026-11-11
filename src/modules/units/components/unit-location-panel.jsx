"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { CardTitle } from "../../../components/ui/card.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { Spinner } from "../../../components/ui/spinner.jsx";
import { hasCoordinates } from "../unit-location.js";

const UnitLocationMap = dynamic(
    () =>
        import("./unit-location-map.jsx").then(
            (module) => module.UnitLocationMap,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-80 items-center justify-center">
                <Spinner />
            </div>
        ),
    },
);

export function UnitLocationPanel({ unit, isEditable }) {
    const { address } = unit;

    return (
        <section className="flex flex-col gap-3">
            <CardTitle>Localização no mapa</CardTitle>
            {!hasCoordinates(address) && (
                <EmptyState
                    icon={MapPin}
                    title="Localização ainda não definida"
                    description="Salve o endereço da unidade para localizá-la no mapa."
                />
            )}
            {hasCoordinates(address) && (
                <>
                    <p className="text-muted-foreground text-sm">
                        {isEditable
                            ? "Arraste o marcador para corrigir a posição da unidade."
                            : "A posição só pode ser corrigida com o hotel em rascunho."}
                    </p>
                    <UnitLocationMap
                        unitId={unit.id}
                        latitude={address.latitude}
                        longitude={address.longitude}
                        isEditable={isEditable}
                    />
                </>
            )}
        </section>
    );
}
