import { AreaNavigation } from "./area-navigation.jsx";

export function AreaLayout({ title, items, children }) {
    return (
        <div className="max-w-page px-gutter py-section mx-auto flex w-full flex-1 flex-col gap-6 md:flex-row">
            <AreaNavigation label={title} items={items} />
            <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
        </div>
    );
}
