import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminHotelsPage, {
    metadata,
} from "../../../src/app/(admin)/admin/hotels/page.jsx";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import {
    AdminHotelList,
    AdminHotelStatusFilter,
} from "../../../src/modules/hotels/components/admin-hotel-list.jsx";

const { requirePageRole, listHotelsForReview } = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    listHotelsForReview: vi.fn(),
}));

vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageRole }));
vi.mock("../../../src/services/hotel-service.js", () => ({
    hotelService: { listHotelsForReview },
}));

const ADMIN = Object.freeze({ id: "admin-1", role: USER_ROLES.ADMIN });
const DEFAULT_PAGE_SIZE = 20;

function findElementByType(element, type) {
    if (!element || typeof element !== "object") {
        return null;
    }
    if (element.type === type) {
        return element;
    }
    const children = [element.props?.children].flat();
    for (const child of children) {
        const match = findElementByType(child, type);
        if (match) {
            return match;
        }
    }
    return null;
}

function renderPage(query) {
    return AdminHotelsPage({ searchParams: Promise.resolve(query) });
}

describe("AdminHotelsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(ADMIN);
        listHotelsForReview.mockResolvedValue({ items: [], total: 0 });
    });

    it("lists the hotels under review by default for an admin", async () => {
        const element = await renderPage({});

        expect(metadata.title).toBe("Hotéis | Reserva de Hotéis");
        expect(requirePageRole).toHaveBeenCalledWith([USER_ROLES.ADMIN]);
        expect(listHotelsForReview).toHaveBeenCalledWith(ADMIN, {
            status: HOTEL_STATUSES.UNDER_REVIEW,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(
            findElementByType(element, AdminHotelStatusFilter).props,
        ).toEqual({ filter: HOTEL_STATUSES.UNDER_REVIEW });
    });

    it("passes the chosen status and page to the service and the list", async () => {
        const items = [{ id: "hotel-1" }];
        listHotelsForReview.mockResolvedValue({ items, total: 21 });

        const element = await renderPage({
            status: HOTEL_STATUSES.BLOCKED,
            page: "2",
        });

        expect(listHotelsForReview).toHaveBeenCalledWith(ADMIN, {
            status: HOTEL_STATUSES.BLOCKED,
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(findElementByType(element, AdminHotelList).props).toEqual({
            items,
            filter: HOTEL_STATUSES.BLOCKED,
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 21,
        });
    });

    it("lists every status when the filter is all", async () => {
        await renderPage({ status: "ALL" });

        expect(listHotelsForReview).toHaveBeenCalledWith(ADMIN, {
            status: undefined,
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
    });

    it("does not load hotels when the role guard refuses the user", async () => {
        requirePageRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(renderPage({})).rejects.toThrow("NEXT_REDIRECT");
        expect(listHotelsForReview).not.toHaveBeenCalled();
    });
});
