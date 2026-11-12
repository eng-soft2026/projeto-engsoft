import { HOTEL_STATUSES } from "../../constants/hotel-statuses.js";
import { paginationQuerySchema } from "../../schemas/pagination.js";

export const ADMIN_HOTELS_PATH = "/admin/hotels";
export const ALL_STATUSES_FILTER = "ALL";
export const DEFAULT_ADMIN_HOTEL_STATUS = HOTEL_STATUSES.UNDER_REVIEW;

export const ADMIN_HOTEL_STATUS_FILTERS = Object.freeze([
    {
        value: HOTEL_STATUSES.UNDER_REVIEW,
        label: "Em análise",
        emptyTitle: "Nenhum hotel aguardando análise",
    },
    {
        value: HOTEL_STATUSES.PUBLISHED,
        label: "Publicados",
        emptyTitle: "Nenhum hotel publicado",
    },
    {
        value: HOTEL_STATUSES.BLOCKED,
        label: "Bloqueados",
        emptyTitle: "Nenhum hotel bloqueado",
    },
    {
        value: HOTEL_STATUSES.DRAFT,
        label: "Rascunhos",
        emptyTitle: "Nenhum hotel em rascunho",
    },
    {
        value: ALL_STATUSES_FILTER,
        label: "Todos",
        emptyTitle: "Nenhum hotel cadastrado",
    },
]);

const FILTER_VALUES = new Set(
    ADMIN_HOTEL_STATUS_FILTERS.map(({ value }) => value),
);

function readStatusFilter(status) {
    if (FILTER_VALUES.has(status)) {
        return status;
    }
    return DEFAULT_ADMIN_HOTEL_STATUS;
}

function readPage(page) {
    const result = paginationQuerySchema.safeParse({ page });
    if (!result.success) {
        return paginationQuerySchema.parse({});
    }
    return result.data;
}

export function readAdminHotelsQuery(searchParams = {}) {
    const filter = readStatusFilter(searchParams.status);
    const pagination = readPage(searchParams.page);
    return {
        filter,
        status: filter === ALL_STATUSES_FILTER ? undefined : filter,
        ...pagination,
    };
}

export function buildAdminHotelsHref({ filter, page = 1 }) {
    const params = new URLSearchParams({ status: filter });
    if (page > 1) {
        params.set("page", String(page));
    }
    return `${ADMIN_HOTELS_PATH}?${params}`;
}
