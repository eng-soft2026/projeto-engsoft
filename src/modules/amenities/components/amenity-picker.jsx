"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge.jsx";
import { Button } from "../../../components/ui/button.jsx";
import { CardTitle } from "../../../components/ui/card.jsx";
import { Checkbox } from "../../../components/ui/checkbox.jsx";
import { FormError } from "../../../components/ui/form-error.jsx";
import { FormField } from "../../../components/ui/form-field.jsx";
import { Input } from "../../../components/ui/input.jsx";
import { MAX_AMENITIES_PER_TARGET } from "../../../constants/amenity.js";
import { useApiForm } from "../../../hooks/use-api-form.js";
import { apiFetch } from "../../../lib/api-client.js";
import { ERROR_CODES } from "../../../lib/errors.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import { createAmenitySchema } from "../../../schemas/amenity-schemas.js";
import {
    buildAmenityTargetPath,
    filterAmenitiesByName,
    sortAmenitiesByName,
    toPickerAmenity,
} from "../amenity-picker-options.js";

const CREATE_AMENITY_FIELD_ERROR_CODES = {
    [ERROR_CODES.AMENITY_ALREADY_EXISTS]: "name",
};

const TOO_MANY_AMENITIES_MESSAGE = `Selecione no máximo ${MAX_AMENITIES_PER_TARGET} comodidades.`;

function formatSelectedCount(count) {
    if (count === 1) {
        return "1 comodidade selecionada";
    }
    return `${count} comodidades selecionadas`;
}

function CreateAmenityForm({ onCreated }) {
    const { form, onSubmit, formError, isSubmitting } = useApiForm({
        schema: createAmenitySchema,
        defaultValues: { name: "" },
        submit: (values) =>
            apiFetch("/api/amenities", { method: "POST", body: values }),
        successMessage: "Comodidade criada.",
        fieldErrorCodes: CREATE_AMENITY_FIELD_ERROR_CODES,
        onSuccess: (amenity) => {
            form.reset({ name: "" });
            onCreated(amenity);
        },
    });

    return (
        <form
            onSubmit={onSubmit}
            noValidate
            className="border-border flex flex-col gap-3 border-t pt-4"
        >
            <FormError message={formError} />
            <FormField
                label="Nova comodidade"
                hint="Cria uma comodidade própria e já a seleciona."
                error={form.formState.errors.name?.message}
                isRequired
            >
                <Input {...form.register("name")} />
            </FormField>
            <Button
                type="submit"
                variant="secondary"
                className="self-start"
                isLoading={isSubmitting}
            >
                Criar comodidade
            </Button>
        </form>
    );
}

function AmenityOption({ amenity, isChecked, onToggle }) {
    return (
        <li className="flex flex-wrap items-center gap-2">
            <Checkbox
                label={amenity.name}
                checked={isChecked}
                onChange={() => onToggle(amenity.id)}
            />
            {!amenity.isGlobal && <Badge tone="info">Própria</Badge>}
            {!amenity.isActive && <Badge tone="warning">Inativa</Badge>}
        </li>
    );
}

export function AmenityPicker({
    target,
    targetId,
    amenities,
    selectedIds,
    isEditable,
}) {
    const router = useRouter();
    const [options, setOptions] = useState(amenities);
    const [selected, setSelected] = useState(() => new Set(selectedIds));
    const [query, setQuery] = useState("");
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const visibleOptions = filterAmenitiesByName(options, query);

    function toggleAmenity(amenityId) {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(amenityId)) {
                next.delete(amenityId);
            } else {
                next.add(amenityId);
            }
            return next;
        });
    }

    function addCreatedAmenity(amenity) {
        setOptions((current) =>
            sortAmenitiesByName([...current, toPickerAmenity(amenity)]),
        );
        setSelected((current) => new Set(current).add(amenity.id));
    }

    async function saveSelection() {
        if (isSaving) {
            return;
        }
        if (selected.size > MAX_AMENITIES_PER_TARGET) {
            setSaveError(TOO_MANY_AMENITIES_MESSAGE);
            return;
        }

        setIsSaving(true);
        setSaveError(null);
        try {
            const amenityIds = options
                .filter(({ id }) => selected.has(id))
                .map(({ id }) => id);
            const stored = await apiFetch(
                buildAmenityTargetPath(target, targetId),
                { method: "PUT", body: { amenityIds } },
            );
            setSelected(new Set(stored.map(({ id }) => id)));
            toast.success("Comodidades salvas.");
            router.refresh();
        } catch (error) {
            const message = resolveErrorMessage(error);
            setSaveError(message);
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="flex flex-col gap-4">
            <CardTitle>Comodidades</CardTitle>
            <FormError message={saveError} />
            <FormField label="Buscar comodidade">
                <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </FormField>
            <p className="text-muted-foreground text-sm" aria-live="polite">
                {formatSelectedCount(selected.size)}
            </p>
            <fieldset
                disabled={!isEditable}
                className="flex flex-col gap-2 disabled:opacity-70"
            >
                <legend className="sr-only">Comodidades disponíveis</legend>
                {visibleOptions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        Nenhuma comodidade encontrada.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {visibleOptions.map((amenity) => (
                            <AmenityOption
                                key={amenity.id}
                                amenity={amenity}
                                isChecked={selected.has(amenity.id)}
                                onToggle={toggleAmenity}
                            />
                        ))}
                    </ul>
                )}
            </fieldset>
            {isEditable && (
                <div className="flex flex-wrap gap-3">
                    <Button
                        variant="secondary"
                        disabled={selected.size === 0}
                        onClick={() => setSelected(new Set())}
                    >
                        Limpar seleção
                    </Button>
                    <Button isLoading={isSaving} onClick={saveSelection}>
                        Salvar comodidades
                    </Button>
                </div>
            )}
            {isEditable && <CreateAmenityForm onCreated={addCreatedAmenity} />}
        </section>
    );
}
