import "./globals.css";

export const metadata = {
    title: "Reserva de Hotéis",
    description: "Plataforma de reservas de hotéis no Brasil.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body className="min-h-screen bg-white text-gray-900 antialiased">
                {children}
            </body>
        </html>
    );
}
