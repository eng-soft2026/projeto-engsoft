export const ROUTE_ACCESS_TABLE = Object.freeze(
    [
        {
            path: "/api/admin/hotels",
            method: "GET",
            access: "roles",
            roles: ["ADMIN"],
        },
        {
            path: "/api/admin/hotels/:id/approve",
            method: "POST",
            access: "roles",
            roles: ["ADMIN"],
            resourceAccess:
                "Global admin action; hotel status rules still apply.",
        },
        {
            path: "/api/admin/hotels/:id/block",
            method: "POST",
            access: "roles",
            roles: ["ADMIN"],
            resourceAccess:
                "Global admin action; hotel status rules still apply.",
        },
        {
            path: "/api/admin/hotels/:id/request-changes",
            method: "POST",
            access: "roles",
            roles: ["ADMIN"],
            resourceAccess:
                "Global admin action; hotel status rules still apply.",
        },
        {
            path: "/api/admin/hotels/:id/unblock",
            method: "POST",
            access: "roles",
            roles: ["ADMIN"],
            resourceAccess:
                "Global admin action; hotel status rules still apply.",
        },
        {
            path: "/api/amenities",
            method: "GET",
            access: "roles",
            roles: ["MANAGER"],
        },
        {
            path: "/api/amenities",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "A manager creates amenities within their own scope.",
        },
        {
            path: "/api/auth/forgot-password",
            method: "POST",
            access: "public",
            resourceAccess:
                "Always answers the same body, so it never reveals whether the e-mail has an account.",
        },
        {
            path: "/api/auth/login",
            method: "POST",
            access: "public",
        },
        {
            path: "/api/auth/logout",
            method: "POST",
            access: "public",
            resourceAccess:
                "No application role guard; delegates to Auth.js signOut.",
        },
        {
            path: "/api/auth/register",
            method: "POST",
            access: "public",
        },
        {
            path: "/api/auth/reset-password",
            method: "POST",
            access: "public",
            resourceAccess:
                "The single-use reset token identifies the account; no session needed.",
        },
        {
            path: "/api/auth/[...nextauth]",
            method: "GET",
            access: "authjs",
        },
        {
            path: "/api/auth/[...nextauth]",
            method: "POST",
            access: "authjs",
        },
        {
            path: "/api/health",
            method: "GET",
            access: "public",
        },
        {
            path: "/api/health/ready",
            method: "GET",
            access: "public",
        },
        {
            path: "/api/hotels",
            method: "GET",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Lists hotels managed by the authenticated manager.",
        },
        {
            path: "/api/hotels",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
        },
        {
            path: "/api/hotels/:id",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess:
                "MANAGER: own or co-managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may update an editable hotel.",
        },
        {
            path: "/api/hotels/:id/acceptances",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id/acceptances",
            method: "PUT",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may replace acceptances.",
        },
        {
            path: "/api/hotels/:id/amenities",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id/amenities",
            method: "PUT",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may replace amenities.",
        },
        {
            path: "/api/hotels/:id/images",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id/images",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT, may add a hotel photo.",
        },
        {
            path: "/api/hotels/:id/images/:imageId",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT, may reorder a photo or set the cover.",
        },
        {
            path: "/api/hotels/:id/images/:imageId",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT, may remove a hotel photo.",
        },
        {
            path: "/api/hotels/:id/managers",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only the hotel owner may change its manager list.",
        },
        {
            path: "/api/hotels/:id/managers/:userId",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only the hotel owner may change its manager list.",
        },
        {
            path: "/api/hotels/:id/policies",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id/policies",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may create a policy.",
        },
        {
            path: "/api/hotels/:id/room-types",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id/room-types",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may create a room type.",
        },
        {
            path: "/api/hotels/:id/submit-review",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may submit the hotel.",
        },
        {
            path: "/api/hotels/:id/units",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed hotel; ADMIN: global read.",
        },
        {
            path: "/api/hotels/:id/units",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may create a unit.",
        },
        {
            path: "/api/media/:id",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager of the target's hotel may delete an unregistered asset.",
        },
        {
            path: "/api/media/sign-upload",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager of the target's hotel, in DRAFT, may sign an upload.",
        },
        {
            path: "/api/policies/:id",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: policy's hotel; ADMIN: global read.",
        },
        {
            path: "/api/policies/:id",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may update the policy.",
        },
        {
            path: "/api/price-periods/:id",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may update a price period that has not started.",
        },
        {
            path: "/api/price-periods/:id",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may delete a price period that has not started.",
        },
        {
            path: "/api/room-types/:id",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: type's hotel; ADMIN: global read.",
        },
        {
            path: "/api/room-types/:id",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may update the room type.",
        },
        {
            path: "/api/room-types/:id",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may delete the room type.",
        },
        {
            path: "/api/room-types/:id/amenities",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: type's hotel; ADMIN: global read.",
        },
        {
            path: "/api/room-types/:id/amenities",
            method: "PUT",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may replace amenities.",
        },
        {
            path: "/api/room-types/:id/images",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: type's hotel; ADMIN: global read.",
        },
        {
            path: "/api/room-types/:id/images",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT and on an active type, may add a room type photo.",
        },
        {
            path: "/api/room-types/:id/images/:imageId",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT and on an active type, may reorder a room type photo.",
        },
        {
            path: "/api/room-types/:id/images/:imageId",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT and on an active type, may remove a room type photo.",
        },
        {
            path: "/api/rooms/:id",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: room's hotel; ADMIN: global read.",
        },
        {
            path: "/api/rooms/:id",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may update the room.",
        },
        {
            path: "/api/rooms/:id",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may delete the room.",
        },
        {
            path: "/api/rooms/:id/amenities",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: room's hotel; ADMIN: global read.",
        },
        {
            path: "/api/rooms/:id/amenities",
            method: "PUT",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may replace amenities.",
        },
        {
            path: "/api/rooms/:id/price-periods",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: room's hotel; ADMIN: global read.",
        },
        {
            path: "/api/rooms/:id/price-periods",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager may add a price period to an active room.",
        },
        {
            path: "/api/units/:id",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: unit's hotel; ADMIN: global read.",
        },
        {
            path: "/api/units/:id",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may update the unit.",
        },
        {
            path: "/api/units/:id/amenities",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: unit's hotel; ADMIN: global read.",
        },
        {
            path: "/api/units/:id/amenities",
            method: "PUT",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may replace amenities.",
        },
        {
            path: "/api/units/:id/images",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: managed unit hotel; ADMIN: global read.",
        },
        {
            path: "/api/units/:id/images",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT, may add a unit photo.",
        },
        {
            path: "/api/units/:id/images/:imageId",
            method: "PATCH",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT, may reorder a unit photo or set the cover.",
        },
        {
            path: "/api/units/:id/images/:imageId",
            method: "DELETE",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess:
                "Only an authorized manager, in DRAFT, may remove a unit photo.",
        },
        {
            path: "/api/units/:id/rooms",
            method: "GET",
            access: "roles",
            roles: ["MANAGER", "ADMIN"],
            resourceAccess: "MANAGER: unit's hotel; ADMIN: global read.",
        },
        {
            path: "/api/units/:id/rooms",
            method: "POST",
            access: "roles",
            roles: ["MANAGER"],
            resourceAccess: "Only an authorized manager may create a room.",
        },
        {
            path: "/api/users/me",
            method: "GET",
            access: "authenticated",
        },
        {
            path: "/api/users/me",
            method: "PATCH",
            access: "authenticated",
        },
    ].map((entry) =>
        Object.freeze({
            ...entry,
            ...(entry.roles ? { roles: Object.freeze(entry.roles) } : {}),
        }),
    ),
);
