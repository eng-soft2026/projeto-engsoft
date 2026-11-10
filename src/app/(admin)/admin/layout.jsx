import { AreaLayout } from "../../../components/layout/area-layout.jsx";
import { ADMIN_AREA_NAVIGATION } from "../../../components/layout/navigation-links.js";
import { USER_ROLES } from "../../../constants/user-roles.js";
import { requirePageRole } from "../../../modules/auth/guards.js";

export default async function AdminLayout({ children }) {
    await requirePageRole([USER_ROLES.ADMIN]);

    return (
        <AreaLayout title="Painel admin" items={ADMIN_AREA_NAVIGATION}>
            {children}
        </AreaLayout>
    );
}
