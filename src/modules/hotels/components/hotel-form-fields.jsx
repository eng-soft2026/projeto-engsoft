"use client";

import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { Textarea } from "../../../components/ui/textarea.jsx";
import { formatCnpj } from "../../../utils/cnpj.js";

export function HotelFormFields({ form }) {
    const { errors } = form.formState;
    const cnpjField = form.register("cnpj");

    function changeCnpj(event) {
        event.target.value = formatCnpj(event.target.value);
        return cnpjField.onChange(event);
    }

    return (
        <>
            <FormField
                label="Nome do hotel"
                error={errors.name?.message}
                isRequired
            >
                <Input autoComplete="organization" {...form.register("name")} />
            </FormField>
            <FormField
                label="Descrição"
                error={errors.description?.message}
                isRequired
            >
                <Textarea rows={5} {...form.register("description")} />
            </FormField>
            <FormField
                label="Categoria"
                hint="Por exemplo: pousada, resort, hotel urbano."
                error={errors.category?.message}
                isRequired
            >
                <Input {...form.register("category")} />
            </FormField>
            <FormField
                label="CNPJ"
                hint="Aceita CNPJ numérico ou alfanumérico."
                error={errors.cnpj?.message}
                isRequired
            >
                <Input
                    inputMode="text"
                    autoCapitalize="characters"
                    placeholder="00.000.000/0000-00"
                    {...cnpjField}
                    onChange={changeCnpj}
                />
            </FormField>
            <FormField
                label="E-mail do hotel"
                error={errors.email?.message}
                isRequired
            >
                <Input
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                />
            </FormField>
        </>
    );
}
