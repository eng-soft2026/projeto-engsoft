import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { USER_ROLES } from "../src/constants/user-roles.js";
import { fillLoginForm, loginAs } from "./support/auth.js";

test("home page loads", async ({ page }) => {
    await page.goto("/");

    await expect(
        page.getByRole("heading", { level: 1, name: "Reserva de Hotéis" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
});

test("failed login shows the error message", async ({ page }) => {
    await fillLoginForm(page, {
        email: `desconhecido-${randomUUID()}@example.com`,
        password: "senha-errada-1",
    });

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
        "E-mail ou senha inválidos.",
    );
    await expect(page).toHaveURL(/\/login$/);
});

test("customer signs in through the role helper", async ({ page }) => {
    const user = await loginAs(page, USER_ROLES.CUSTOMER);

    await expect(
        page.getByText(`Olá, ${user.name.split(" ")[0]}`),
    ).toBeVisible();
});
