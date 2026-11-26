import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminHotelDetailPage, {
    metadata,
} from "../../../src/app/(admin)/admin/hotels/[id]/page.jsx";
import { HOTEL_STATUSES } from "../../../src/constants/hotel-statuses.js";
import { MEDIA_SCOPES } from "../../../src/constants/media.js";
import { USER_ROLES } from "../../../src/constants/user-roles.js";
import { NotFoundError } from "../../../src/lib/errors.js";
import { AdminHotelActions } from "../../../src/modules/hotels/components/admin-hotel-actions.jsx";
import {
    AdminReviewNoteHistory,
    AdminUnitsSection,
} from "../../../src/modules/hotels/components/admin-hotel-detail.jsx";
import { HotelPoliciesPanel } from "../../../src/modules/hotels/components/hotel-policies-panel.jsx";
import { MediaGallery } from "../../../src/modules/media/components/media-gallery.jsx";

const { requirePageRole, loadAdminHotelDetail, notFound } = vi.hoisted(() => ({
    requirePageRole: vi.fn(),
    loadAdminHotelDetail: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("next/navigation", () => ({
    notFound,
    useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../../../src/modules/auth/guards.js", () => ({ requirePageRole }));
vi.mock("../../../src/modules/hotels/admin-hotel-detail-data.js", () => ({
    loadAdminHotelDetail,
}));

const ADMIN = Object.freeze({ id: "admin-1", role: USER_ROLES.ADMIN });
const HOTEL_ID = "5b0c2a9e-4f1d-4c3a-9b8e-1f2d3c4b5a69";
const NOTES = Object.freeze([{ id: "note-1" }]);
const DETAIL = Object.freeze({
    hotel: {
        id: HOTEL_ID,
        name: "Pousada Serra Azul",
        status: HOTEL_STATUSES.BLOCKED,
        reviewNotes: NOTES,
    },
    units: [{ id: "unit-1", rooms: [] }],
    roomTypes: [],
    policies: [{ id: "policy-1" }],
    acceptances: [],
    amenities: [],
    gallery: { images: [], maxBytes: 1024 },
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

function renderPage(id = HOTEL_ID) {
    return AdminHotelDetailPage({ params: Promise.resolve({ id }) });
}

describe("AdminHotelDetailPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requirePageRole.mockResolvedValue(ADMIN);
        loadAdminHotelDetail.mockResolvedValue(DETAIL);
    });

    it("loads the hotel as the admin and renders it read-only", async () => {
        const element = await renderPage();

        expect(metadata.title).toBe("Detalhe do hotel | Reserva de Hotéis");
        expect(requirePageRole).toHaveBeenCalledWith([USER_ROLES.ADMIN]);
        expect(loadAdminHotelDetail).toHaveBeenCalledWith(ADMIN, HOTEL_ID);
        expect(findElementByType(element, AdminHotelActions).props).toEqual({
            hotelId: HOTEL_ID,
            status: HOTEL_STATUSES.BLOCKED,
        });
        expect(
            findElementByType(element, AdminReviewNoteHistory).props,
        ).toEqual({ notes: NOTES });
        expect(findElementByType(element, AdminUnitsSection).props).toEqual({
            units: DETAIL.units,
        });
        expect(findElementByType(element, MediaGallery).props).toEqual({
            scope: MEDIA_SCOPES.HOTEL,
            targetId: HOTEL_ID,
            isEditable: false,
            images: [],
            maxBytes: 1024,
        });
        expect(
            findElementByType(element, HotelPoliciesPanel).props.isEditable,
        ).toBe(false);
    });

    it("answers not found for an invalid id without loading", async () => {
        await expect(renderPage("not-a-uuid")).rejects.toThrow(
            "NEXT_NOT_FOUND",
        );
        expect(loadAdminHotelDetail).not.toHaveBeenCalled();
    });

    it("answers not found when the hotel does not exist", async () => {
        loadAdminHotelDetail.mockRejectedValue(
            new NotFoundError("HOTEL_NOT_FOUND", "Hotel não encontrado."),
        );

        await expect(renderPage()).rejects.toThrow("NEXT_NOT_FOUND");
    });

    it("rethrows unexpected errors", async () => {
        loadAdminHotelDetail.mockRejectedValue(new Error("boom"));

        await expect(renderPage()).rejects.toThrow("boom");
    });

    it("does not load the hotel when the role guard refuses the user", async () => {
        requirePageRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

        await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");
        expect(loadAdminHotelDetail).not.toHaveBeenCalled();
    });
});
