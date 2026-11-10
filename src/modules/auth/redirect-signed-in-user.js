import { redirect } from "next/navigation";
import { resolveCallbackUrl } from "./callback-url.js";
import { getCurrentUser } from "./guards.js";

export async function redirectSignedInUser(callbackUrl) {
    const user = await getCurrentUser();
    if (user) {
        redirect(resolveCallbackUrl(callbackUrl));
    }
}
