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
import HotelManagersPage, {
    metadata as hotelManagersMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/managers/page.jsx";
import HotelPoliciesPage, {
    metadata as hotelPoliciesMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/policies/page.jsx";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    ERROR_CODES,
    ForbiddenError,
    NotFoundError,
} from "../../../src/lib/errors.js";
import { CreateHotelForm } from "../../../src/modules/hotels/components/create-hotel-form.jsx";
import { EditHotelForm } from "../../../src/modules/hotels/components/edit-hotel-form.jsx";
import { HotelAcceptancesForm } from "../../../src/modules/hotels/components/hotel-acceptances-form.jsx";
import { HotelManagersPanel } from "../../../src/modules/hotels/components/hotel-managers-panel.jsx";
import { HotelPoliciesPanel } from "../../../src/modules/hotels/components/hotel-policies-panel.jsx";
import { HotelTabs } from "../../../src/modules/hotels/components/hotel-tabs.jsx";
import { ManagedHotelHeader } from "../../../src/modules/hotels/components/managed-hotel-header.jsx";
import {
    ManagedHotelList,
    NewHotelLink,
} from "../../../src/modules/hotels/components/managed-hotel-list.jsx";

const {
    requirePageRole,
    listManagedHotels,
    getHotel,
    listAcceptances,
    listPolicies,
    notFound,
} = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    listManagedHotels: vi.fn(),
    getHotel: vi.fn(),
    listAcceptances: vi.fn(),
    listPolicies: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageRole }));
vi.mock("../../../src/services/hotel-service.js", () => ({
    hotelService: { listManagedHotels, getHotel },
}));
vi.mock("../../../src/services/acceptance-service.js", () => ({
    acceptanceService: { listAcceptances },
}));
vi.mock("../../../src/services/policy-service.js", () => ({
    policyService: { listPolicies },
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
            hotel: { ...HOTEL, isOwner: true },
        });
        expect(findElementByType(element, HotelTabs).props).toEqual({
            hotelId: HOTEL_ID,
            isOwner: true,
        });
    });

    it("hides the owner tabs from an additional manager", async () => {
        getHotel.mockResolvedValue({ ...HOTEL, ownerUserId: "manager-9" });

        const element = await ManagedHotelLayout({
            children: "content",
            params: buildParams(),
        });

        expect(findElementByType(element, HotelTabs).props.isOwner).toBe(false);
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

describe("HotelManagersPage", () => {
    const OWNER = Object.freeze({
        id: "manager-1",
        name: "Ana Dona",
        email: "ana@exemplo.com",
    });
    const MANAGERS = Object.freeze([
        { id: "manager-2", name: "Bruno", email: "bruno@exemplo.com" },
    ]);

    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
    });

    it("renders the managers panel for the owner", async () => {
        getHotel.mockResolvedValue({
            ...HOTEL,
            owner: OWNER,
            managers: MANAGERS,
        });

        const element = await HotelManagersPage({ params: buildParams() });

        expect(hotelManagersMetadata.title).toBe(
            "Gestores do hotel | Reserva de Hotéis",
        );
        expect(findElementByType(element, HotelManagersPanel).props).toEqual({
            hotelId: HOTEL_ID,
            owner: OWNER,
            managers: MANAGERS,
        });
    });

    it("answers not found for an additional manager", async () => {
        getHotel.mockResolvedValue({
            ...HOTEL,
            ownerUserId: "manager-9",
            owner: { ...OWNER, id: "manager-9" },
        });

        await expect(
            HotelManagersPage({ params: buildParams() }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(notFound).toHaveBeenCalled();
    });
});

describe("HotelPoliciesPage", () => {
    const ACCEPTANCES = Object.freeze([
        {
            id: "acceptance-1",
            type: "PETS",
            typeName: "Animais de estimação",
            customLabel: null,
            isAllowed: true,
            details: null,
        },
    ]);
    const POLICIES = Object.freeze([
        {
            id: "policy-1",
            type: "PARKING",
            title: "Estacionamento",
            description: "Vagas cobertas.",
            isSystem: false,
            isActive: true,
        },
    ]);

    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
        listAcceptances.mockResolvedValue(ACCEPTANCES);
        listPolicies.mockResolvedValue(POLICIES);
    });

    it("renders the acceptances form and the policies panel", async () => {
        getHotel.mockResolvedValue(HOTEL);

        const element = await HotelPoliciesPage({ params: buildParams() });

        expect(hotelPoliciesMetadata.title).toBe(
            "Regras e políticas do hotel | Reserva de Hotéis",
        );
        expect(listAcceptances).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
        expect(listPolicies).toHaveBeenCalledWith(MANAGER, HOTEL_ID);
        expect(findElementByType(element, HotelAcceptancesForm).props).toEqual({
            hotelId: HOTEL_ID,
            isEditable: true,
            acceptances: ACCEPTANCES,
        });
        expect(findElementByType(element, HotelPoliciesPanel).props).toEqual({
            hotelId: HOTEL_ID,
            isEditable: true,
            policies: POLICIES,
        });
    });

    it("renders read-only sections outside draft", async () => {
        getHotel.mockResolvedValue({
            ...HOTEL,
            status: HOTEL_STATUSES.PUBLISHED,
        });

        const element = await HotelPoliciesPage({ params: buildParams() });

        expect(
            findElementByType(element, HotelAcceptancesForm).props.isEditable,
        ).toBe(false);
        expect(
            findElementByType(element, HotelPoliciesPanel).props.isEditable,
        ).toBe(false);
    });
});
