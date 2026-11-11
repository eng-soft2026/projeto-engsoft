import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../../src/lib/api-client.js";
import { ERROR_CODES } from "../../../src/lib/errors.js";
import {
    OSM_ATTRIBUTION,
    OSM_TILE_URL,
    UnitLocationMap,
} from "../../../src/modules/units/components/unit-location-map.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

const { router, markerProps, tileLayerProps } = vi.hoisted(() => ({
    router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
    markerProps: { current: null },
    tileLayerProps: { current: null },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../../src/lib/api-client.js", async (importOriginal) => ({
    ...(await importOriginal()),
    apiFetch: vi.fn(),
}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet", () => ({ divIcon: vi.fn(() => ({})) }));
vi.mock("react-leaflet", () => ({
    MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
    TileLayer: (props) => {
        tileLayerProps.current = props;
        return null;
    },
    Marker: (props) => {
        markerProps.current = props;
        return null;
    },
}));

const UNIT_ID = "unit-1";
const LATITUDE = -23.55052;
const LONGITUDE = -46.633308;

function renderMap({ isEditable = true } = {}) {
    return renderWithUser(
        <UnitLocationMap
            unitId={UNIT_ID}
            latitude={LATITUDE}
            longitude={LONGITUDE}
            isEditable={isEditable}
        />,
    );
}

function createDragEvent(lat, lng) {
    const marker = { getLatLng: () => ({ lat, lng }), setLatLng: vi.fn() };
    return { target: marker };
}

describe("UnitLocationMap", () => {
    afterEach(() => {
        vi.clearAllMocks();
        markerProps.current = null;
        tileLayerProps.current = null;
    });

    it("shows the OpenStreetMap attribution", () => {
        renderMap();

        expect(tileLayerProps.current).toEqual({
            url: OSM_TILE_URL,
            attribution: OSM_ATTRIBUTION,
        });
        expect(OSM_ATTRIBUTION).toContain("OpenStreetMap");
        expect(
            screen.getByRole("link", { name: "OpenStreetMap" }),
        ).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    });

    it("places the marker at the unit coordinates", () => {
        renderMap();

        expect(markerProps.current.position).toEqual([LATITUDE, LONGITUDE]);
        expect(markerProps.current.draggable).toBe(true);
    });

    it("saves the dragged marker position", async () => {
        apiFetch.mockResolvedValue({ id: UNIT_ID });
        renderMap();

        await markerProps.current.eventHandlers.dragend(
            createDragEvent(-23.5612345678, -46.6401234567),
        );

        expect(apiFetch).toHaveBeenCalledWith(
            `/api/units/${UNIT_ID}/location`,
            {
                method: "PATCH",
                body: { latitude: -23.561235, longitude: -46.640123 },
            },
        );
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                "Localização atualizada.",
            );
        });
        expect(router.refresh).toHaveBeenCalled();
    });

    it("moves the marker back when the server refuses", async () => {
        apiFetch.mockRejectedValue(
            new ApiError({
                status: 409,
                code: ERROR_CODES.INVALID_HOTEL_STATUS,
                message: "O hotel não pode ser editado.",
            }),
        );
        renderMap();
        const event = createDragEvent(-23.56, -46.64);

        await markerProps.current.eventHandlers.dragend(event);

        expect(event.target.setLatLng).toHaveBeenCalledWith([
            LATITUDE,
            LONGITUDE,
        ]);
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
        expect(router.refresh).not.toHaveBeenCalled();
    });

    it("keeps the marker fixed outside DRAFT", () => {
        renderMap({ isEditable: false });

        expect(markerProps.current.draggable).toBe(false);
        expect(markerProps.current.eventHandlers).toEqual({});
        expect(apiFetch).not.toHaveBeenCalled();
    });
});
