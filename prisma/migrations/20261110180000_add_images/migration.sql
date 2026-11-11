-- CreateTable
CREATE TABLE `hotel_image` (
    `id` CHAR(36) NOT NULL,
    `hotel_id` CHAR(36) NOT NULL,
    `cloudinary_public_id` VARCHAR(255) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `is_cover` BOOLEAN NOT NULL DEFAULT false,
    `position` SMALLINT UNSIGNED NOT NULL,
    `format` VARCHAR(20) NOT NULL,
    `bytes` INTEGER UNSIGNED NOT NULL,
    `width` INTEGER UNSIGNED NOT NULL,
    `height` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hotel_image_cloudinary_public_id_key`(`cloudinary_public_id`),
    INDEX `hotel_image_hotel_id_position_idx`(`hotel_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_image` (
    `id` CHAR(36) NOT NULL,
    `unit_id` CHAR(36) NOT NULL,
    `cloudinary_public_id` VARCHAR(255) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `is_cover` BOOLEAN NOT NULL DEFAULT false,
    `position` SMALLINT UNSIGNED NOT NULL,
    `format` VARCHAR(20) NOT NULL,
    `bytes` INTEGER UNSIGNED NOT NULL,
    `width` INTEGER UNSIGNED NOT NULL,
    `height` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unit_image_cloudinary_public_id_key`(`cloudinary_public_id`),
    INDEX `unit_image_unit_id_position_idx`(`unit_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_type_image` (
    `id` CHAR(36) NOT NULL,
    `room_type_id` CHAR(36) NOT NULL,
    `cloudinary_public_id` VARCHAR(255) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `position` SMALLINT UNSIGNED NOT NULL,
    `format` VARCHAR(20) NOT NULL,
    `bytes` INTEGER UNSIGNED NOT NULL,
    `width` INTEGER UNSIGNED NOT NULL,
    `height` INTEGER UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `room_type_image_cloudinary_public_id_key`(`cloudinary_public_id`),
    INDEX `room_type_image_room_type_id_position_idx`(`room_type_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hotel_image` ADD CONSTRAINT `hotel_image_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_image` ADD CONSTRAINT `unit_image_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `hotel_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_type_image` ADD CONSTRAINT `room_type_image_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `hotel_image` ADD CONSTRAINT `hotel_image_bytes_check` CHECK (`bytes` > 0);
ALTER TABLE `hotel_image` ADD CONSTRAINT `hotel_image_dimensions_check` CHECK (`width` > 0 AND `height` > 0);
ALTER TABLE `unit_image` ADD CONSTRAINT `unit_image_bytes_check` CHECK (`bytes` > 0);
ALTER TABLE `unit_image` ADD CONSTRAINT `unit_image_dimensions_check` CHECK (`width` > 0 AND `height` > 0);
ALTER TABLE `room_type_image` ADD CONSTRAINT `room_type_image_bytes_check` CHECK (`bytes` > 0);
ALTER TABLE `room_type_image` ADD CONSTRAINT `room_type_image_dimensions_check` CHECK (`width` > 0 AND `height` > 0);
