import { Card } from "../../../../../components/ui/card.jsx";
import { CreateHotelForm } from "../../../../../modules/hotels/components/create-hotel-form.jsx";

export const metadata = { title: "Cadastrar hotel | Reserva de Hotéis" };

export default function CreateHotelPage() {
    return (
        <>
            <header className="flex flex-col gap-1">
                <h1 className="text-foreground text-2xl font-semibold">
                    Cadastrar hotel
                </h1>
                <p className="text-muted-foreground text-sm">
                    O hotel começa como rascunho. Depois de cadastrar unidades,
                    acomodações e fotos, envie-o para análise.
                </p>
            </header>
            <Card className="max-w-2xl">
                <CreateHotelForm />
            </Card>
        </>
    );
}
