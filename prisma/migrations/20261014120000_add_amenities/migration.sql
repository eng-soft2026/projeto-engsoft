-- CreateTable
CREATE TABLE `amenity` (
    `id` CHAR(36) NOT NULL,
    `created_by_user_id` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `is_global` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `amenity_created_by_user_id_name_key`(`created_by_user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hotel_amenity` (
    `hotel_id` CHAR(36) NOT NULL,
    `amenity_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`hotel_id`, `amenity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unit_amenity` (
    `unit_id` CHAR(36) NOT NULL,
    `amenity_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`unit_id`, `amenity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_type_amenity` (
    `room_type_id` CHAR(36) NOT NULL,
    `amenity_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`room_type_id`, `amenity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_amenity` (
    `room_id` CHAR(36) NOT NULL,
    `amenity_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`room_id`, `amenity_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `amenity` ADD CONSTRAINT `amenity_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_amenity` ADD CONSTRAINT `hotel_amenity_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hotel_amenity` ADD CONSTRAINT `hotel_amenity_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_amenity` ADD CONSTRAINT `unit_amenity_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `hotel_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_amenity` ADD CONSTRAINT `unit_amenity_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_type_amenity` ADD CONSTRAINT `room_type_amenity_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_type_amenity` ADD CONSTRAINT `room_type_amenity_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_amenity` ADD CONSTRAINT `room_amenity_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_amenity` ADD CONSTRAINT `room_amenity_amenity_id_fkey` FOREIGN KEY (`amenity_id`) REFERENCES `amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
