import { CircleAlert } from "lucide-react";

export function FormError({ message }) {
    if (!message) {
        return null;
    }

    return (
        <p
            role="alert"
            className="rounded-control border-danger bg-danger-soft text-danger flex items-start gap-2 border px-3 py-2 text-sm"
        >
            <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
            />
            {message}
        </p>
    );
}
