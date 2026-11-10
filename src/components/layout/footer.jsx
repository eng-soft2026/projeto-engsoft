export function Footer({ year = new Date().getFullYear() }) {
    return (
        <footer className="border-border bg-surface border-t">
            <div className="max-w-page px-gutter text-muted-foreground mx-auto flex flex-col gap-1 py-6 text-sm sm:flex-row sm:justify-between">
                <p>Reserva de Hotéis · hospedagens no Brasil</p>
                <p>© {year} Projeto de Engenharia de Software · UNIFESP</p>
            </div>
        </footer>
    );
}
