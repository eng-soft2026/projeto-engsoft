import { Toaster } from "sonner";
import { Footer } from "../components/layout/footer.jsx";
import { Header } from "../components/layout/header.jsx";
import "./globals.css";

export const metadata = {
    title: "Reserva de Hotéis",
    description: "Plataforma de reservas de hotéis no Brasil.",
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-BR">
            <body className="bg-background text-foreground flex min-h-screen flex-col antialiased">
                <Header />
                <main className="flex flex-1 flex-col">{children}</main>
                <Footer />
                <Toaster position="top-right" richColors closeButton />
            </body>
        </html>
    );
}
