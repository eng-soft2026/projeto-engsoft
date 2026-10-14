import { useState } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithUser } from "../helpers/render.jsx";

function Counter() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <p>Cliques: {count}</p>
            <button type="button" onClick={() => setCount(count + 1)}>
                Incrementar
            </button>
        </div>
    );
}

describe("component test setup", () => {
    it("renders a component in jsdom", () => {
        renderWithUser(<Counter />);

        expect(screen.getByText("Cliques: 0")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Incrementar" }),
        ).toBeVisible();
    });

    it("updates the component after a user click", async () => {
        const { user } = renderWithUser(<Counter />);

        await user.click(screen.getByRole("button", { name: "Incrementar" }));
        await user.click(screen.getByRole("button", { name: "Incrementar" }));

        expect(screen.getByText("Cliques: 2")).toBeInTheDocument();
    });

    it("unmounts the previous render between tests", () => {
        expect(document.body).toBeEmptyDOMElement();
    });
});
