"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api-client.js";
import { resolveErrorMessage } from "../../lib/error-messages.js";
import { Button } from "../ui/button.jsx";

export function LogoutButton({ className, onLoggedOut }) {
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function logout() {
        setIsLoggingOut(true);
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            toast.error(resolveErrorMessage(error));
            setIsLoggingOut(false);
            return;
        }

        onLoggedOut?.();
        router.push("/");
        router.refresh();
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            isLoading={isLoggingOut}
            onClick={logout}
            className={className}
        >
            <LogOut aria-hidden="true" className="size-4" />
            Sair
        </Button>
    );
}
