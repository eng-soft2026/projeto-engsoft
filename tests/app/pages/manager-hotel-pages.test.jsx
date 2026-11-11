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
import HotelUnitsPage, {
    metadata as hotelUnitsMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/units/page.jsx";
import CreateUnitPage, {
    metadata as createUnitMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/units/new/page.jsx";
import EditUnitPage, {
    metadata as editUnitMetadata,
} from "../../../src/app/(manager)/manager/hotels/[id]/units/[unitId]/page.jsx";
import { AMENITY_TARGETS } from "../../../src/constants/amenity.js";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import {
    ERROR_CODES,
    ForbiddenError,
    NotFoundError,
} from "../../../src/lib/errors.js";
import { AmenityPicker } from "../../../src/modules/amenities/components/amenity-picker.jsx";
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
import { DeactivateUnitButton } from "../../../src/modules/units/components/deactivate-unit-button.jsx";
import {
    ManagedUnitList,
    NewUnitLink,
} from "../../../src/modules/units/components/managed-unit-list.jsx";
import { UnitForm } from "../../../src/modules/units/components/unit-form.jsx";
import { UnitLocationPanel } from "../../../src/modules/units/components/unit-location-panel.jsx";
import { Decimal } from "../../../src/generated/prisma/internal/prismaNamespace.ts";

const {
    requirePageRole,
    listManagedHotels,
    getHotel,
    listAcceptances,
    listPolicies,
    listUnits,
    getUnit,
    loadAmenityPickerData,
    notFound,
    redirect,
} = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    listManagedHotels: vi.fn(),
    getHotel: vi.fn(),
    listAcceptances: vi.fn(),
    listPolicies: vi.fn(),
    listUnits: vi.fn(),
    getUnit: vi.fn(),
    loadAmenityPickerData: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
    redirect: vi.fn(() => {
        throw new Error("NEXT_REDIRECT");
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
vi.mock("../../../src/services/unit-service.js", () => ({
    unitService: { listUnits, getUnit },
}));
vi.mock("../../../src/modules/amenities/amenity-picker-data.js", () => ({
    loadAmenityPickerData,
}));
vi.mock("next/navigation", () => ({ notFound, redirect }));

const MANAGER = Object.freeze({ id: "manager-1", role: USER_ROLES.MANAGER });
const DEFAULT_PAGE_SIZE = 20;
const AMENITY_PICKER_DATA = Object.freeze({
    amenities: [
        { id: "amenity-1", name: "Wi-Fi", isGlobal: true, isActive: true },
    ],
    selectedIds: ["amenity-1"],
});

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
        loadAmenityPickerData.mockResolvedValue(AMENITY_PICKER_DATA);
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
        expect(loadAmenityPickerData).toHaveBeenCalledWith(
            MANAGER,
            AMENITY_TARGETS.HOTEL,
            HOTEL_ID,
        );
        expect(findElementByType(element, AmenityPicker).props).toEqual({
            target: AMENITY_TARGETS.HOTEL,
            targetId: HOTEL_ID,
            isEditable: true,
            ...AMENITY_PICKER_DATA,
        });
    });

    it("renders the amenity picker read-only outside draft", async () => {
        getHotel.mockResolvedValue({
            ...HOTEL,
            status: HOTEL_STATUSES.PUBLISHED,
        });

        const element = await ManagedHotelPage({ params: buildParams() });

        expect(findElementByType(element, AmenityPicker).props.isEditable).toBe(
            false,
        );
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

describe("HotelUnitsPage", () => {
    const UNITS = Object.freeze([{ id: "unit-1" }]);

    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
    });

    it("lists the hotel units of the requested page", async () => {
        getHotel.mockResolvedValue(HOTEL);
        listUnits.mockResolvedValue({ items: UNITS, total: 21 });

        const element = await HotelUnitsPage({
            params: buildParams(),
            searchParams: Promise.resolve({ page: "2" }),
        });

        expect(hotelUnitsMetadata.title).toBe(
            "Unidades do hotel | Reserva de Hotéis",
        );
        expect(listUnits).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(findElementByType(element, ManagedUnitList).props).toEqual({
            hotelId: HOTEL_ID,
            items: UNITS,
            page: 2,
            pageSize: DEFAULT_PAGE_SIZE,
            total: 21,
            isEditable: true,
        });
        expect(findElementByType(element, NewUnitLink).props).toEqual({
            hotelId: HOTEL_ID,
        });
    });

    it("hides the create link outside draft", async () => {
        getHotel.mockResolvedValue({
            ...HOTEL,
            status: HOTEL_STATUSES.PUBLISHED,
        });
        listUnits.mockResolvedValue({ items: UNITS, total: 1 });

        const element = await HotelUnitsPage({
            params: buildParams(),
            searchParams: Promise.resolve({ page: "abc" }),
        });

        expect(listUnits).toHaveBeenCalledWith(MANAGER, HOTEL_ID, {
            page: 1,
            pageSize: DEFAULT_PAGE_SIZE,
        });
        expect(
            findElementByType(element, ManagedUnitList).props.isEditable,
        ).toBe(false);
        expect(findElementByType(element, NewUnitLink)).toBeNull();
    });
});

describe("CreateUnitPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
    });

    it("renders the create unit form for a draft hotel", async () => {
        getHotel.mockResolvedValue(HOTEL);

        const element = await CreateUnitPage({ params: buildParams() });

        expect(createUnitMetadata.title).toBe(
            "Cadastrar unidade | Reserva de Hotéis",
        );
        expect(findElementByType(element, UnitForm).props).toEqual({
            hotelId: HOTEL_ID,
            isEditable: true,
        });
    });

    it("redirects to the units list outside draft", async () => {
        getHotel.mockResolvedValue({
            ...HOTEL,
            status: HOTEL_STATUSES.UNDER_REVIEW,
        });

        await expect(CreateUnitPage({ params: buildParams() })).rejects.toThrow(
            "NEXT_REDIRECT",
        );
        expect(redirect).toHaveBeenCalledWith(
            `/manager/hotels/${HOTEL_ID}/units`,
        );
    });
});

describe("EditUnitPage", () => {
    const UNIT_ID = "7a2d3c4b-5e6f-4a71-9b8c-0d1e2f3a4b5c";
    const UNIT = Object.freeze({
        id: UNIT_ID,
        hotelId: HOTEL_ID,
        name: "Unidade Centro",
        isActive: true,
        address: Object.freeze({
            city: "São Paulo",
            latitude: new Decimal("-23.550520"),
            longitude: new Decimal("-46.633308"),
        }),
    });
    const CLIENT_UNIT = Object.freeze({
        ...UNIT,
        address: {
            city: "São Paulo",
            latitude: -23.55052,
            longitude: -46.633308,
        },
    });

    function buildUnitParams(unitId = UNIT_ID) {
        return Promise.resolve({ id: HOTEL_ID, unitId });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(MANAGER);
        getHotel.mockResolvedValue(HOTEL);
        loadAmenityPickerData.mockResolvedValue(AMENITY_PICKER_DATA);
    });

    it("renders the edit form and the deactivate action", async () => {
        getUnit.mockResolvedValue(UNIT);

        const element = await EditUnitPage({ params: buildUnitParams() });

        expect(editUnitMetadata.title).toBe(
            "Editar unidade | Reserva de Hotéis",
        );
        expect(getUnit).toHaveBeenCalledWith(MANAGER, UNIT_ID);
        expect(findElementByType(element, UnitForm).props).toEqual({
            hotelId: HOTEL_ID,
            unit: CLIENT_UNIT,
            isEditable: true,
        });
        expect(findElementByType(element, UnitLocationPanel).props).toEqual({
            unit: CLIENT_UNIT,
            isEditable: true,
        });
        expect(findElementByType(element, DeactivateUnitButton).props).toEqual({
            unit: CLIENT_UNIT,
        });
        expect(loadAmenityPickerData).toHaveBeenCalledWith(
            MANAGER,
            AMENITY_TARGETS.UNIT,
            UNIT_ID,
        );
        expect(findElementByType(element, AmenityPicker).props).toEqual({
            target: AMENITY_TARGETS.UNIT,
            targetId: UNIT_ID,
            isEditable: true,
            ...AMENITY_PICKER_DATA,
        });
    });

    it.each([
        ["an inactive unit", HOTEL_STATUSES.DRAFT, false],
        ["a published hotel", HOTEL_STATUSES.PUBLISHED, true],
    ])("renders %s read-only", async (_label, status, isActive) => {
        getHotel.mockResolvedValue({ ...HOTEL, status });
        getUnit.mockResolvedValue({ ...UNIT, isActive });

        const element = await EditUnitPage({ params: buildUnitParams() });

        expect(findElementByType(element, UnitForm).props.isEditable).toBe(
            false,
        );
        expect(
            findElementByType(element, UnitLocationPanel).props.isEditable,
        ).toBe(false);
        expect(findElementByType(element, DeactivateUnitButton)).toBeNull();
        expect(findElementByType(element, AmenityPicker).props.isEditable).toBe(
            false,
        );
    });

    it("answers not found for an invalid unit identifier", async () => {
        await expect(
            EditUnitPage({ params: buildUnitParams("abc") }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
        expect(getUnit).not.toHaveBeenCalled();
    });

    it("answers not found for a unit of another hotel", async () => {
        getUnit.mockResolvedValue({ ...UNIT, hotelId: "hotel-9" });

        await expect(
            EditUnitPage({ params: buildUnitParams() }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("answers not found when the unit is not visible", async () => {
        getUnit.mockRejectedValue(
            new NotFoundError(
                ERROR_CODES.UNIT_NOT_FOUND,
                "Unidade não encontrada.",
            ),
        );

        await expect(
            EditUnitPage({ params: buildUnitParams() }),
        ).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("rethrows unexpected errors", async () => {
        const error = new ForbiddenError("Sem permissão.");
        getUnit.mockRejectedValue(error);

        await expect(EditUnitPage({ params: buildUnitParams() })).rejects.toBe(
            error,
        );
    });
});
