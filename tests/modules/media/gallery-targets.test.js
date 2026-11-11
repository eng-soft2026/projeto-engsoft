import { describe, expect, it } from "vitest";
import {
    MAX_HOTEL_IMAGES,
    MEDIA_SCOPES,
} from "../../../src/constants/media.js";
import {
    buildGalleryImagePath,
    buildGalleryImagesPath,
    buildMediaAssetPath,
    getGalleryTarget,
} from "../../../src/modules/media/gallery-targets.js";

describe("gallery targets", () => {
    it("caps only the hotel gallery and has no room type cover", () => {
        expect(getGalleryTarget(MEDIA_SCOPES.HOTEL)).toMatchObject({
            maxImages: MAX_HOTEL_IMAGES,
            hasCover: true,
        });
        expect(getGalleryTarget(MEDIA_SCOPES.UNIT)).toMatchObject({
            maxImages: null,
            hasCover: true,
        });
        expect(getGalleryTarget(MEDIA_SCOPES.ROOM_TYPE)).toMatchObject({
            maxImages: null,
            hasCover: false,
        });
    });

    it("refuses an unknown scope", () => {
        expect(() => getGalleryTarget("REVIEW")).toThrow(TypeError);
    });

    it.each([
        [MEDIA_SCOPES.HOTEL, "/api/hotels/id-1/images"],
        [MEDIA_SCOPES.UNIT, "/api/units/id-1/images"],
        [MEDIA_SCOPES.ROOM_TYPE, "/api/room-types/id-1/images"],
    ])("builds the %s gallery paths", (scope, path) => {
        expect(buildGalleryImagesPath(scope, "id-1")).toBe(path);
        expect(buildGalleryImagePath(scope, "id-1", "image-1")).toBe(
            `${path}/image-1`,
        );
    });

    it("builds the media asset path with the target query", () => {
        expect(
            buildMediaAssetPath(MEDIA_SCOPES.UNIT, "unit-1", "asset-1"),
        ).toBe("/api/media/asset-1?scope=UNIT&targetId=unit-1");
    });
});
