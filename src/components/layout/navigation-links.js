import { USER_ROLES } from "../../constants/user-roles.js";

export const MANAGER_AREA_PATH = "/manager";
export const ADMIN_AREA_PATH = "/admin";

const PROFILE_LINK = { href: "/profile", label: "Meu perfil" };
const NOTIFICATIONS_LINK = { href: "/notifications", label: "Notificações" };

export const GUEST_NAVIGATION_LINKS = Object.freeze([
    { href: "/login", label: "Entrar" },
    { href: "/register", label: "Cadastrar" },
]);

export const CUSTOMER_NAVIGATION_LINKS = Object.freeze([
    { href: "/reservations", label: "Minhas reservas" },
    { href: "/favorites", label: "Favoritos" },
    NOTIFICATIONS_LINK,
    PROFILE_LINK,
]);

export const MANAGER_NAVIGATION_LINKS = Object.freeze([
    { href: MANAGER_AREA_PATH, label: "Painel do gestor" },
    NOTIFICATIONS_LINK,
    PROFILE_LINK,
]);

export const ADMIN_NAVIGATION_LINKS = Object.freeze([
    { href: ADMIN_AREA_PATH, label: "Painel admin" },
    NOTIFICATIONS_LINK,
    PROFILE_LINK,
]);

export const MANAGER_AREA_NAVIGATION = Object.freeze([
    { href: MANAGER_AREA_PATH, label: "Painel", isExact: true },
    { href: "/manager/hotels", label: "Meus hotéis" },
    { href: "/manager/reservations", label: "Reservas" },
    { href: "/manager/reviews", label: "Avaliações" },
    { href: "/manager/promotions", label: "Promoções" },
    { href: "/manager/finance", label: "Financeiro" },
    { href: "/manager/analytics", label: "Analytics" },
]);

export const ADMIN_AREA_NAVIGATION = Object.freeze([
    { href: ADMIN_AREA_PATH, label: "Painel", isExact: true },
    { href: "/admin/hotels", label: "Hotéis" },
    { href: "/admin/users", label: "Usuários" },
    { href: "/admin/reservations", label: "Reservas" },
    { href: "/admin/payments", label: "Pagamentos" },
    { href: "/admin/refunds", label: "Reembolsos" },
    { href: "/admin/reports", label: "Denúncias" },
    { href: "/admin/audit", label: "Auditoria" },
    { href: "/admin/jobs", label: "Jobs com erro" },
    { href: "/admin/analytics", label: "Analytics" },
]);

const NAVIGATION_LINKS_BY_ROLE = Object.freeze({
    [USER_ROLES.CUSTOMER]: CUSTOMER_NAVIGATION_LINKS,
    [USER_ROLES.MANAGER]: MANAGER_NAVIGATION_LINKS,
    [USER_ROLES.ADMIN]: ADMIN_NAVIGATION_LINKS,
});

export function getNavigationItems(role) {
    return NAVIGATION_LINKS_BY_ROLE[role] ?? GUEST_NAVIGATION_LINKS;
}

export function isNavigationItemActive(item, pathname) {
    if (!pathname) {
        return false;
    }
    if (pathname === item.href) {
        return true;
    }
    return !item.isExact && pathname.startsWith(`${item.href}/`);
}
