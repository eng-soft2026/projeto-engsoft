import { expect } from "@playwright/test";
import { getE2eUser } from "./test-users.js";

export async function fillLoginForm(page, { email, password }) {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
}

export async function loginAs(page, role) {
    const user = getE2eUser(role);
    await fillLoginForm(page, user);
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
    return user;
}
