import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormError } from "../../../src/components/ui/form-error.jsx";

describe("FormError", () => {
    it("renders the message as an alert", () => {
        render(<FormError message="E-mail ou senha inválidos." />);

        expect(screen.getByRole("alert")).toHaveTextContent(
            "E-mail ou senha inválidos.",
        );
    });

    it("renders nothing without a message", () => {
        const { container } = render(<FormError message={null} />);

        expect(container).toBeEmptyDOMElement();
    });
});
