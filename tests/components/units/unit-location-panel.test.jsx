import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UnitLocationPanel } from "../../../src/modules/units/components/unit-location-panel.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

vi.mock("next/dynamic", () => ({
    default: () =>
        function UnitLocationMapStub({ latitude, longitude, isEditable }) {
            return (
                <div
                    data-testid="unit-location-map"
                    data-position={`${latitude},${longitude}`}
                    data-editable={String(isEditable)}
                />
            );
        },
}));

function buildUnit(latitude, longitude) {
    return { id: "unit-1", address: { latitude, longitude } };
}

describe("UnitLocationPanel", () => {
    it("asks for the address when the unit has no coordinates", () => {
        renderWithUser(
            <UnitLocationPanel unit={buildUnit(null, null)} isEditable />,
        );

        expect(
            screen.getByText("Localização ainda não definida"),
        ).toBeInTheDocument();
        expect(screen.queryByTestId("unit-location-map")).toBeNull();
    });

    it("renders an editable map in DRAFT", () => {
        renderWithUser(
            <UnitLocationPanel unit={buildUnit(-23.5, -46.6)} isEditable />,
        );

        const map = screen.getByTestId("unit-location-map");
        expect(map).toHaveAttribute("data-position", "-23.5,-46.6");
        expect(map).toHaveAttribute("data-editable", "true");
        expect(
            screen.getByText(
                "Arraste o marcador para corrigir a posição da unidade.",
            ),
        ).toBeInTheDocument();
    });

    it("renders a read-only map outside DRAFT", () => {
        renderWithUser(
            <UnitLocationPanel
                unit={buildUnit(-23.5, -46.6)}
                isEditable={false}
            />,
        );

        expect(screen.getByTestId("unit-location-map")).toHaveAttribute(
            "data-editable",
            "false",
        );
        expect(
            screen.getByText(
                "A posição só pode ser corrigida com o hotel em rascunho.",
            ),
        ).toBeInTheDocument();
    });
});
