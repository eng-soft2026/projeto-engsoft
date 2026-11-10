export const GUEST_NAVIGATION_LINKS = [
    { href: "/login", label: "Entrar" },
    { href: "/register", label: "Cadastrar" },
];

export const SIGNED_IN_NAVIGATION_LINKS = [
    { href: "/profile", label: "Meu perfil" },
];

export function getDefaultNavigationLinks(user) {
    return user ? SIGNED_IN_NAVIGATION_LINKS : GUEST_NAVIGATION_LINKS;
}
