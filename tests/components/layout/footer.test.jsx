import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "../../../src/components/layout/footer.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

describe("Footer", () => {
    it("renders the content info landmark with the given year", () => {
        renderWithUser(<Footer year={2026} />);

        expect(screen.getByRole("contentinfo")).toHaveTextContent("© 2026");
    });

    it("uses the current year by default", () => {
        renderWithUser(<Footer />);

        expect(screen.getByRole("contentinfo")).toHaveTextContent(
            `© ${new Date().getFullYear()}`,
        );
    });
});
