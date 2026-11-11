import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagedHotelsPage, {
    metadata as managedHotelsMetadata,
} from "../../../src/app/(manager)/manager/hotels/page.jsx";
import CreateHotelPage, {
    metadata as createHotelMetadata,
} from "../../../src/app/(manager)/manager/hotels/new/page.jsx";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { CreateHotelForm } from "../../../src/modules/hotels/components/create-hotel-form.jsx";
import {
    ManagedHotelList,
    NewHotelLink,
} from "../../../src/modules/hotels/components/managed-hotel-list.jsx";

const { requirePageRole, listManagedHotels } = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    listManagedHotels: vi.fn(),
}));

vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageRole }));
vi.mock("../../../src/services/hotel-service.js", () => ({
    hotelService: { listManagedHotels },
}));

const MANAGER = Object.freeze({ id: "manager-1", role: USER_ROLES.MANAGER });
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

function renderListPage(query) {
    return ManagedHotelsPage({ searchParams: Promise.resolve(query) });
}

describe("ManagedHotelsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
    });

    it("lists the manager hotels of the requested page", async () => {
        const items = [{ id: "hotel-1" }];
        listManagedHotels.mockResolvedValue({ items, total: 21 });

        const element = await renderListPage({ page: "2" });

        expect(managedHotelsMetadata.title).toBe(
            "Meus hotéis | Reserva de Hotéis",
        );
        expect(requirePageRole).toHaveBeenCalledWith([USER_ROLES.MANAGER]);
        expect(listManagedHotels).toHaveBeenCalledWith(MANAGER, {
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(findElementByType(element, ManagedHotelList).props).toEqual({
            items,
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 21,
        });
        expect(findElementByType(element, NewHotelLink)).not.toBeNull();
    });

    it.each([{}, { page: "abc" }, { page: "0" }])(
        "falls back to the first page for %j",
        async (query) => {
            listManagedHotels.mockResolvedValue({ items: [], total: 0 });

            const element = await renderListPage(query);

            expect(listManagedHotels).toHaveBeenCalledWith(MANAGER, {
                page: 1,
                pageSize: DEFAULT_PAGE_SIZE,
            });
            expect(findElementByType(element, NewHotelLink)).toBeNull();
        },
    );
});

describe("CreateHotelPage", () => {
    it("renders the create hotel form", () => {
        const element = CreateHotelPage();

        expect(createHotelMetadata.title).toBe(
            "Cadastrar hotel | Reserva de Hotéis",
        );
        expect(findElementByType(element, CreateHotelForm)).not.toBeNull();
    });
});
