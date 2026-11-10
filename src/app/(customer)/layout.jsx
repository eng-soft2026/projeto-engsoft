import { USER_ROLES } from "../../constants/user-roles.js";
import { requirePageRole } from "../../modules/auth/guards.js";

export default async function CustomerLayout({ children }) {
    await requirePageRole([USER_ROLES.CUSTOMER]);

    return children;
}
