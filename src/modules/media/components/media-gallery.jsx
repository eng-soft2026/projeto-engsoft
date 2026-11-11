"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../../components/ui/badge.jsx";
import { Button } from "../../../components/ui/button.jsx";
import { CardTitle } from "../../../components/ui/card.jsx";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog.jsx";
import { EmptyState } from "../../../components/ui/empty-state.jsx";
import { apiFetch } from "../../../lib/api-client.js";
import { resolveErrorMessage } from "../../../lib/error-messages.js";
import {
    ACCEPTED_IMAGE_TYPES,
    formatImageLimitMessage,
    formatMegabytes,
    selectFilesToUpload,
} from "../client-upload.js";
import {
    CloudinaryUploadError,
    uploadToCloudinary,
} from "../cloudinary-upload.js";
import {
    buildGalleryImagePath,
    buildGalleryImagesPath,
    buildMediaAssetPath,
    getGalleryTarget,
} from "../gallery-targets.js";

function sortByPosition(images) {
    return [...images].sort(
        (first, second) => first.position - second.position,
    );
}

function describeUploadError(error) {
    if (error instanceof CloudinaryUploadError) {
        return error.message;
    }
    return resolveErrorMessage(error);
}

function formatImageCount(count, maxImages) {
    const noun = count === 1 ? "foto" : "fotos";
    if (maxImages === null) {
        return `${count} ${noun}`;
    }
    return `${count} de ${maxImages} fotos`;
}

function UploadProgress({ upload }) {
    return (
        <li className="flex flex-col gap-1">
            <span className="text-foreground truncate text-sm">
                {upload.fileName}
            </span>
            <div
                role="progressbar"
                aria-label={`Enviando ${upload.fileName}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={upload.progress}
                className="bg-muted h-2 w-full overflow-hidden rounded-full"
            >
                <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${upload.progress}%` }}
                />
            </div>
        </li>
    );
}

function GalleryItem({
    image,
    index,
    count,
    ownerLabel,
    hasCover,
    isEditable,
    isBusy,
    onMove,
    onSetCover,
    onRemove,
}) {
    const number = index + 1;

    return (
        <li className="rounded-card border-border flex flex-col gap-2 border p-2">
            <div className="relative">
                <Image
                    src={image.url}
                    alt={`Foto ${number} ${ownerLabel}`}
                    width={image.width}
                    height={image.height}
                    unoptimized
                    className="aspect-[4/3] h-auto w-full rounded object-cover"
                />
                {hasCover && image.isCover && (
                    <Badge tone="info" className="absolute top-2 left-2">
                        Capa
                    </Badge>
                )}
            </div>
            {isEditable && (
                <div className="flex flex-wrap gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Mover foto ${number} para cima`}
                        disabled={isBusy || index === 0}
                        onClick={() => onMove(image, index - 1)}
                    >
                        <ArrowUp aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Mover foto ${number} para baixo`}
                        disabled={isBusy || index === count - 1}
                        onClick={() => onMove(image, index + 1)}
                    >
                        <ArrowDown aria-hidden="true" className="size-4" />
                    </Button>
                    {hasCover && !image.isCover && (
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Definir foto ${number} como capa`}
                            disabled={isBusy}
                            onClick={() => onSetCover(image)}
                        >
                            <Star aria-hidden="true" className="size-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remover foto ${number}`}
                        disabled={isBusy}
                        onClick={() => onRemove(image)}
                    >
                        <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                </div>
            )}
        </li>
    );
}

export function MediaGallery({
    scope,
    targetId,
    images: initialImages,
    maxBytes,
    isEditable,
}) {
    const { maxImages, hasCover, ownerLabel } = getGalleryTarget(scope);
    const [images, setImages] = useState(() => sortByPosition(initialImages));
    const [uploads, setUploads] = useState([]);
    const [pendingImageId, setPendingImageId] = useState(null);
    const [imageToRemove, setImageToRemove] = useState(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const inputRef = useRef(null);
    const uploadCounterRef = useRef(0);

    const isUploading = uploads.length > 0;
    const isBusy = isUploading || pendingImageId !== null || isRemoving;
    const imagesPath = buildGalleryImagesPath(scope, targetId);

    async function reloadImages() {
        try {
            const current = await apiFetch(imagesPath);
            setImages(sortByPosition(current));
        } catch (error) {
            toast.error(resolveErrorMessage(error));
        }
    }

    function updateUploadProgress(key, progress) {
        setUploads((current) =>
            current.map((upload) =>
                upload.key === key ? { ...upload, progress } : upload,
            ),
        );
    }

    function removeUpload(key) {
        setUploads((current) => current.filter((upload) => upload.key !== key));
    }

    async function discardAsset(assetId) {
        try {
            await apiFetch(buildMediaAssetPath(scope, targetId, assetId), {
                method: "DELETE",
            });
        } catch {
            return;
        }
    }

    async function uploadFile(file, key) {
        let signed = null;
        let isUploaded = false;
        try {
            signed = await apiFetch("/api/media/sign-upload", {
                method: "POST",
                body: {
                    scope,
                    targetId,
                    fileName: file.name,
                    mimeType: file.type,
                    bytes: file.size,
                },
            });
            await uploadToCloudinary(signed, file, {
                onProgress: (progress) => updateUploadProgress(key, progress),
            });
            isUploaded = true;
            await apiFetch(imagesPath, {
                method: "POST",
                body: { assetId: signed.assetId },
            });
            return true;
        } catch (error) {
            if (isUploaded) {
                await discardAsset(signed.assetId);
            }
            toast.error(`${file.name}: ${describeUploadError(error)}`);
            return false;
        } finally {
            removeUpload(key);
        }
    }

    async function handleFilesSelected(event) {
        const files = Array.from(event.target.files);
        event.target.value = "";
        if (files.length === 0) {
            return;
        }

        const { accepted, rejected, hasReachedLimit } = selectFilesToUpload(
            files,
            { maxBytes, maxImages, usedCount: images.length },
        );
        for (const { file, error } of rejected) {
            toast.error(`${file.name}: ${error}`);
        }
        if (hasReachedLimit) {
            toast.error(formatImageLimitMessage(maxImages, ownerLabel));
        }
        if (accepted.length === 0) {
            return;
        }

        const queued = accepted.map((file) => {
            uploadCounterRef.current += 1;
            return { file, key: `upload-${uploadCounterRef.current}` };
        });
        setUploads(
            queued.map(({ file, key }) => ({
                key,
                fileName: file.name,
                progress: 0,
            })),
        );

        let successCount = 0;
        for (const { file, key } of queued) {
            if (await uploadFile(file, key)) {
                successCount += 1;
            }
        }
        if (successCount > 0) {
            await reloadImages();
            toast.success(
                successCount === 1
                    ? "Foto adicionada."
                    : `${successCount} fotos adicionadas.`,
            );
        }
    }

    async function updateImage(image, changes, successMessage) {
        setPendingImageId(image.id);
        try {
            await apiFetch(buildGalleryImagePath(scope, targetId, image.id), {
                method: "PATCH",
                body: changes,
            });
            await reloadImages();
            toast.success(successMessage);
        } catch (error) {
            toast.error(resolveErrorMessage(error));
        } finally {
            setPendingImageId(null);
        }
    }

    function handleMove(image, position) {
        return updateImage(image, { position }, "Ordem das fotos atualizada.");
    }

    function handleSetCover(image) {
        return updateImage(image, { isCover: true }, "Capa atualizada.");
    }

    async function handleConfirmRemove() {
        setIsRemoving(true);
        try {
            await apiFetch(
                buildGalleryImagePath(scope, targetId, imageToRemove.id),
                { method: "DELETE" },
            );
            setImageToRemove(null);
            await reloadImages();
            toast.success("Foto removida.");
        } catch (error) {
            toast.error(resolveErrorMessage(error));
        } finally {
            setIsRemoving(false);
        }
    }

    const isAtLimit = maxImages !== null && images.length >= maxImages;

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Fotos</CardTitle>
                <span className="text-muted-foreground text-sm">
                    {formatImageCount(images.length, maxImages)}
                </span>
            </div>
            {isEditable && (
                <div className="flex flex-col gap-1">
                    <input
                        ref={inputRef}
                        id={`gallery-input-${scope}-${targetId}`}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES}
                        multiple
                        aria-label="Adicionar fotos"
                        className="sr-only"
                        disabled={isBusy || isAtLimit}
                        onChange={handleFilesSelected}
                    />
                    <div>
                        <Button
                            variant="secondary"
                            disabled={isBusy || isAtLimit}
                            onClick={() => inputRef.current.click()}
                        >
                            <ImagePlus aria-hidden="true" className="size-4" />
                            Adicionar fotos
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {`JPG ou JPEG, até ${formatMegabytes(maxBytes)} MB por foto.`}
                        {hasCover && " A primeira foto vira capa."}
                    </p>
                </div>
            )}
            {isUploading && (
                <ul
                    aria-label="Envios em andamento"
                    className="flex flex-col gap-2"
                >
                    {uploads.map((upload) => (
                        <UploadProgress key={upload.key} upload={upload} />
                    ))}
                </ul>
            )}
            {images.length === 0 && !isUploading ? (
                <EmptyState
                    title="Nenhuma foto"
                    description={
                        isEditable
                            ? "Adicione fotos para apresentar este espaço."
                            : undefined
                    }
                />
            ) : (
                <ul
                    aria-label={`Fotos ${ownerLabel}`}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                    {images.map((image, index) => (
                        <GalleryItem
                            key={image.id}
                            image={image}
                            index={index}
                            count={images.length}
                            ownerLabel={ownerLabel}
                            hasCover={hasCover}
                            isEditable={isEditable}
                            isBusy={isBusy}
                            onMove={handleMove}
                            onSetCover={handleSetCover}
                            onRemove={setImageToRemove}
                        />
                    ))}
                </ul>
            )}
            <ConfirmDialog
                isOpen={imageToRemove !== null}
                title="Remover foto?"
                description="A foto será apagada da galeria."
                confirmLabel="Remover"
                isConfirming={isRemoving}
                onConfirm={handleConfirmRemove}
                onCancel={() => setImageToRemove(null)}
            />
        </section>
    );
}
