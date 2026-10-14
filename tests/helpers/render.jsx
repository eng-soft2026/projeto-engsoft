import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export function renderWithUser(ui, options) {
    return {
        user: userEvent.setup(),
        ...render(ui, options),
    };
}
