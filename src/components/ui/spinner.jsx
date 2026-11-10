import { LoaderCircle } from "lucide-react";
import { joinClassNames } from "../../utils/class-names.js";

export function Spinner({ label = "Carregando", className }) {
    return (
        <span role="status" className="inline-flex items-center">
            <LoaderCircle
                aria-hidden="true"
                className={joinClassNames("size-4 animate-spin", className)}
            />
            <span className="sr-only">{label}</span>
        </span>
    );
}
