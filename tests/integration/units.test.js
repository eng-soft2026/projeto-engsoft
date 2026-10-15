import { beforeEach, describe, expect, it } from "vitest";
import { SYSTEM_SETTING_KEYS } from "../../src/constants/system-settings.js";
import { getPrisma } from "../../src/lib/prisma.js";
import { parseWithSchema } from "../../src/lib/validation.js";
import { updateUnitSchema } from "../../src/schemas/unit-schemas.js";
import { hotelService } from "../../src/services/hotel-service.js";
import { unitService } from "../../src/services/unit-service.js";
import { resetDatabase, seedBaseData } from "./helpers/database.js";
import {
    buildUnitInput,
    createAdmin,
    createDraftHotel,
    createHotelWithUnit,
    createManager,
    createUnit,
} from "./helpers/fixtures.js";
import { flushRedis } from "./helpers/redis.js";

function findStoredUnit(id) {
    return getPrisma().hotelUnit.findUnique({
        where: { id },
        include: { address: true, phones: true },
    });
}

async function updateUnit(manager, unitId, changes) {
    return unitService.updateUnit(
        manager,
        unitId,
        parseWithSchema(updateUnitSchema, changes),
    );
}

async function geocodeAddress(unitId) {
    await getPrisma().address.update({
        where: { unitId },
        data: { latitude: "-23.550520", longitude: "-46.633308" },
    });
}

describe("hotel units against MySQL", () => {
    let owner;

    beforeEach(async () => {
        await resetDatabase();
        await seedBaseData();
        await flushRedis();
        owner = await createManager();
    });

    it("creates the unit with one address, its phones and the times", async () => {
        const hotel = await createDraftHotel(owner);

        const unit = await createUnit(owner, hotel.id, {
            phones: ["(11) 3333-4444", "(11) 99999-8888"],
        });

        expect(unit).toMatchObject({
            checkInTime: "14:00",
            checkOutTime: "12:00",
            overbookingPercentage: 5,
        });
        const stored = await findStoredUnit(unit.id);
        expect(stored.address).toMatchObject({
            zipCode: "01001000",
            city: "São Paulo",
            state: "SP",
            latitude: null,
            longitude: null,
        });
        expect(stored.phones.map(({ phone }) => phone).sort()).toEqual([
            "1133334444",
            "11999998888",
        ]);
        expect(stored.checkInTime.toISOString()).toBe(
            "1970-01-01T14:00:00.000Z",
        );
    });

    it("rejects a second address for the same unit", async () => {
        const { unit } = await createHotelWithUnit(owner);

        await expect(
            getPrisma().address.create({
                data: {
                    unitId: unit.id,
                    zipCode: "01001000",
                    street: "Rua B",
                    number: "1",
                    neighborhood: "Centro",
                    city: "São Paulo",
                    state: "SP",
                },
            }),
        ).rejects.toMatchObject({ code: "P2002" });
    });

    it("resets the coordinates when the address changes", async () => {
        const { unit } = await createHotelWithUnit(owner);
        await geocodeAddress(unit.id);

        await updateUnit(owner, unit.id, {
            address: {
                zipCode: "20040-002",
                street: "Avenida Rio Branco",
                number: "1",
                neighborhood: "Centro",
                city: "Rio de Janeiro",
                state: "RJ",
            },
        });

        const stored = await findStoredUnit(unit.id);
        expect(stored.address).toMatchObject({
            zipCode: "20040002",
            city: "Rio de Janeiro",
            latitude: null,
            longitude: null,
        });
        await expect(
            getPrisma().address.count({ where: { unitId: unit.id } }),
        ).resolves.toBe(1);
    });

    it("keeps the coordinates when only other fields change", async () => {
        const { unit } = await createHotelWithUnit(owner);
        await geocodeAddress(unit.id);

        await updateUnit(owner, unit.id, { name: "Unidade Nova" });

        const stored = await findStoredUnit(unit.id);
        expect(stored.name).toBe("Unidade Nova");
        expect(stored.address.latitude.toString()).toBe("-23.55052");
    });

    it("replaces the phones and removes the old rows", async () => {
        const { unit } = await createHotelWithUnit(owner);

        await updateUnit(owner, unit.id, {
            phones: ["(21) 2222-3333", "(21) 98888-7777"],
        });

        const phones = await getPrisma().unitPhone.findMany({
            where: { unitId: unit.id },
        });
        expect(phones.map(({ phone }) => phone).sort()).toEqual([
            "2122223333",
            "21988887777",
        ]);
    });

    it("deactivates a unit", async () => {
        const { unit } = await createHotelWithUnit(owner);

        const updated = await updateUnit(owner, unit.id, { isActive: false });

        expect(updated.isActive).toBe(false);
        const stored = await findStoredUnit(unit.id);
        expect(stored.isActive).toBe(false);
    });

    it("honors a lower MAX_OVERBOOKING_PERCENT setting", async () => {
        const hotel = await createDraftHotel(owner);
        await getPrisma().systemSetting.update({
            where: { key: SYSTEM_SETTING_KEYS.MAX_OVERBOOKING_PERCENT },
            data: { value: "3" },
        });

        await expect(
            unitService.createUnit(
                owner,
                hotel.id,
                buildUnitInput({ overbookingPercentage: 5 }),
            ),
        ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
        await expect(
            createUnit(owner, hotel.id, { overbookingPercentage: 3 }),
        ).resolves.toMatchObject({ overbookingPercentage: 3 });
    });

    it("enforces the overbooking CHECK in MySQL", async () => {
        const { unit } = await createHotelWithUnit(owner);

        await expect(
            getPrisma().$executeRawUnsafe(
                "UPDATE hotel_unit SET overbooking_percentage = 11 WHERE id = ?",
                unit.id,
            ),
        ).rejects.toThrow();
    });

    it("refuses unit writes after submit-review", async () => {
        const { hotel, unit } = await createHotelWithUnit(owner);
        await hotelService.submitForReview(owner, hotel.id);

        await expect(
            unitService.createUnit(owner, hotel.id, buildUnitInput()),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        await expect(
            updateUnit(owner, unit.id, { name: "Outro nome" }),
        ).rejects.toMatchObject({ code: "INVALID_HOTEL_STATUS" });
        await expect(
            getPrisma().hotelUnit.count({ where: { hotelId: hotel.id } }),
        ).resolves.toBe(1);
    });

    it("lets the admin read but not write and hides the unit from other managers", async () => {
        const { hotel, unit } = await createHotelWithUnit(owner);
        const admin = await createAdmin();
        const stranger = await createManager();

        await expect(
            unitService.getUnit(admin, unit.id),
        ).resolves.toMatchObject({ id: unit.id });
        await expect(
            unitService.createUnit(admin, hotel.id, buildUnitInput()),
        ).rejects.toMatchObject({ code: "HOTEL_NOT_FOUND" });
        await expect(
            unitService.getUnit(stranger, unit.id),
        ).rejects.toMatchObject({ code: "UNIT_NOT_FOUND" });
    });
});
