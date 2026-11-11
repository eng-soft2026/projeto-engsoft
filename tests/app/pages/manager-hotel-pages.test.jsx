import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagedHotelsPage, {
    metadata as managedHotelsMetadata,
} from "../../../src/app/(manager)/manager/hotels/page.jsx";
import CreateHotelPage, {
    metadata as createHotelMetadata,
} from "../../../src/app/(manager)/manager/hotels/new/page.jsx";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import ManagedHotelLayout from "../../../src/app/(manager)/manager/hotels/[id]/layout.jsx";
import ManagedHotelPage, {
    metadata as managedHotelMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/page.jsx";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    ERROR_CODES,
    ForbiddenError,
    NotFoundError,
} from "../../../src/lib/errors.js";
import { CreateHotelForm } from "../../../src/modules/hotels/components/create-hotel-form.jsx";
import { EditHotelForm } from "../../../src/modules/hotels/components/edit-hotel-form.jsx";
import { HotelTabs } from "../../../src/modules/hotels/components/hotel-tabs.jsx";
import { ManagedHotelHeader } from "../../../src/modules/hotels/components/managed-hotel-header.jsx";
import {
    ManagedHotelList,
    NewHotelLink,
} from "../../../src/modules/hotels/components/managed-hotel-list.jsx";

const { requirePageRole, listManagedHotels, getHotel, notFound } = vi.hoisted(
    () => ({
        requirePageRole: vi.fn(),
        listManagedHotels: vi.fn(),
        getHotel: vi.fn(),
        notFound: vi.fn(() => {
            throw new Error("NEXT_NOT_FOUND");
        }),
    }),
);

vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageRole }));
vi.mock("../../../src/services/hotel-service.js", () => ({
    hotelService: { listManagedHotels, getHotel },
}));
vi.mock("next/navigation", () => ({ notFound }));

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

const HOTEL_ID = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";

const HOTEL = Object.freeze({
    id: HOTEL_ID,
    ownerUserId: "manager-1",
    name: "Pousada Azul",
    description: "Pousada perto da praia.",
    category: "Pousada",
    cnpj: "11222333000181",
    email: "contato@pousada.com",
    status: HOTEL_STATUSES.DRAFT,
    reviewNotes: [],
});

function buildParams(id = HOTEL_ID) {
    return Promise.resolve({ id });
}

describe("ManagedHotelLayout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
    });

    it("renders the hotel header and section tabs", async () => {
        getHotel.mockResolvedValue(HOTEL);

        const element = await ManagedHotelLayout({
            children: "content",
            params: buildParams(),
        });

        expect(requirePageRole).toHaveBeenCalledWith([USER_ROLES.MANAGER]);
        expect(getHotel).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
        expect(findElementByType(element, ManagedHotelHeader).props).toEqual({
            hotel: HOTEL,
        });
        expect(findElementByType(element, HotelTabs).props).toEqual({
            hotelId: HOTEL_ID,
        });
    });

    it("answers not found for an invalid identifier", async () => {
        await expect(
            ManagedHotelLayout({ children: null, params: buildParams("abc") }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(getHotel).not.toHaveBeenCalled();
    });

    it("answers not found when the manager cannot see the hotel", async () => {
        getHotel.mockRejectedValue(
            new NotFoundError(
                ERROR_CODES.HOTEL_NOT_FOUND,
                "Hotel não encontrado.",
            ),
        );

        await expect(
            ManagedHotelLayout({ children: null, params: buildParams() }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(notFound).toHaveBeenCalled();
    });

    it("rethrows unexpected errors", async () => {
        const error = new ForbiddenError("Sem permissão.");
        getHotel.mockRejectedValue(error);

        await expect(
            ManagedHotelLayout({ children: null, params: buildParams() }),
        ).rejects.toBe(error);
        expect(notFound).not.toHaveBeenCalled();
    });
});

describe("ManagedHotelPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
    });

    it("renders the edit form with the hotel data only", async () => {
        getHotel.mockResolvedValue(HOTEL);

        const element = await ManagedHotelPage({ params: buildParams() });

        expect(managedHotelMetadata.title).toBe(
            "Editar hotel | Reserva de Hotéis",
        );
        expect(findElementByType(element, EditHotelForm).props.hotel).toEqual({
            id: HOTEL_ID,
            status: HOTEL_STATUSES.DRAFT,
            name: "Pousada Azul",
            description: "Pousada perto da praia.",
            category: "Pousada",
            cnpj: "11222333000181",
            email: "contato@pousada.com",
        });
    });
});
