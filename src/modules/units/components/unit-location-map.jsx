"use client";

import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { toast } from "sonner";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { roundCoordinate } from "../unit-location.js";

export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const MAP_ZOOM = 16;
const MARKER_SIZE = 24;

function createMarkerIcon() {
    return divIcon({
        className: "",
        html: '<span class="bg-primary border-surface block size-6 rounded-full border-4 shadow-md"></span>',
        iconSize: [MARKER_SIZE, MARKER_SIZE],
        iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    });
}

export function UnitLocationMap({ unitId, latitude, longitude, isEditable }) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const markerIcon = useMemo(createMarkerIcon, []);
    const position = [latitude, longitude];

    async function saveMarkerPosition(event) {
        const marker = event.target;
        const { lat, lng } = marker.getLatLng();
        setIsSaving(true);
        try {
            await apiFetch(`/api/units/${unitId}/location`, {
                method: "PATCH",
                body: {
                    latitude: roundCoordinate(lat),
                    longitude: roundCoordinate(lng),
                },
            });
        } catch (error) {
            marker.setLatLng(position);
            toast.error(resolveErrorMessage(error));
            setIsSaving(false);
            return;
        }

        toast.success("Localização atualizada.");
        setIsSaving(false);
        router.refresh();
    }

    return (
        <div aria-busy={isSaving} className="flex flex-col gap-2">
            <MapContainer
                center={position}
                zoom={MAP_ZOOM}
                scrollWheelZoom={false}
                className="rounded-card border-border isolate h-80 w-full border"
            >
                <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
                <Marker
                    position={position}
                    icon={markerIcon}
                    draggable={isEditable && !isSaving}
                    eventHandlers={
                        isEditable ? { dragend: saveMarkerPosition } : {}
                    }
                />
            </MapContainer>
            <p className="text-muted-foreground text-xs">
                Mapa ©{" "}
                <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                >
                    OpenStreetMap
                </a>{" "}
                contributors
            </p>
        </div>
    );
}
