import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    countPages,
    Pagination,
} from "../../../src/components/ui/pagination.jsx";
import { renderWithUser } from "../../helpers/render.jsx";

function buildHref(page) {
    return `/manager/hotels?page=${page}`;
}

describe("countPages", () => {
    it.each([
        [{ pageSize: 20, total: 0 }, 1],
        [{ pageSize: 20, total: 20 }, 1],
        [{ pageSize: 20, total: 21 }, 2],
        [{ pageSize: 10, total: 95 }, 10],
    ])("counts the pages of %o", (pagination, expected) => {
        expect(countPages(pagination)).toBe(expected);
    });
});

describe("Pagination", () => {
    it("renders nothing for a single page", () => {
        const { container } = renderWithUser(
            <Pagination
                page={1}
                pageSize={20}
                total={5}
                buildHref={buildHref}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("links both neighbours on a middle page", () => {
        renderWithUser(
            <Pagination
                page={2}
                pageSize={20}
                total={60}
                buildHref={buildHref}
            />,
        );

        const navigation = screen.getByRole("navigation", {
            name: "Paginação",
        });

        expect(within(navigation).getByText("Página 2 de 3")).toBeVisible();
        expect(
            screen.getByRole("link", { name: "Página anterior" }),
        ).toHaveAttribute("href", "/manager/hotels?page=1");
        expect(
            screen.getByRole("link", { name: "Próxima página" }),
        ).toHaveAttribute("href", "/manager/hotels?page=3");
    });

    it("disables the previous page on the first page", () => {
        renderWithUser(
            <Pagination
                page={1}
                pageSize={20}
                total={60}
                buildHref={buildHref}
            />,
        );

        expect(
            screen.queryByRole("link", { name: "Página anterior" }),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Anterior")).toHaveAttribute(
            "aria-disabled",
            "true",
        );
        expect(
            screen.getByRole("link", { name: "Próxima página" }),
        ).toHaveAttribute("href", "/manager/hotels?page=2");
    });

    it("disables the next page on the last page", () => {
        renderWithUser(
            <Pagination
                page={3}
                pageSize={20}
                total={60}
                buildHref={buildHref}
            />,
        );

        expect(
            screen.queryByRole("link", { name: "Próxima página" }),
        ).not.toBeInTheDocument();
        expect(screen.getByText("Próxima")).toHaveAttribute(
            "aria-disabled",
            "true",
        );
    });
});
