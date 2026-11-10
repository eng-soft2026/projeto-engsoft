import { describe, expect, it } from "vitest";
import { joinClassNames } from "../../src/utils/class-names.js";

describe("joinClassNames", () => {
    it("joins the truthy class names with a space", () => {
        expect(joinClassNames("a", false, null, undefined, "", "b")).toBe(
            "a b",
        );
    });

    it("returns an empty string without class names", () => {
        expect(joinClassNames()).toBe("");
    });
});
