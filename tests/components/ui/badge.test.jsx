import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../../../src/components/ui/badge.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Badge", () => {
    it("renders the neutral tone by default", () => {
        renderWithUser(<Badge>Rascunho</Badge>);

        expect(screen.getByText("Rascunho")).toHaveClass("bg-muted");
    });

    it.each([
        ["info", "bg-primary-soft"],
        ["success", "bg-success-soft"],
        ["warning", "bg-warning-soft"],
        ["danger", "bg-danger-soft"],
    ])("renders the %s tone", (tone, expectedClass) => {
        renderWithUser(
            <Badge tone={tone} className="uppercase">
                Status
            </Badge>,
        );

        expect(screen.getByText("Status")).toHaveClass(
            expectedClass,
            "uppercase",
        );
    });
});
