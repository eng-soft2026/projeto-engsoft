-- CreateTable
CREATE TABLE `room_type` (
    `id` CHAR(36) NOT NULL,
    `hotel_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `max_guests` SMALLINT UNSIGNED NOT NULL,
    `area_m2` DECIMAL(7, 2) NOT NULL,
    `default_price` DECIMAL(10, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_type_hotel_id_idx`(`hotel_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bed_configuration` (
    `id` CHAR(36) NOT NULL,
    `room_type_id` CHAR(36) NOT NULL,
    `bed_type` ENUM('SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'SOFA_BED') NOT NULL,
    `quantity` TINYINT UNSIGNED NOT NULL,

    UNIQUE INDEX `bed_configuration_room_type_id_bed_type_key`(`room_type_id`, `bed_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room` (
    `id` CHAR(36) NOT NULL,
    `unit_id` CHAR(36) NOT NULL,
    `room_type_id` CHAR(36) NOT NULL,
    `number` VARCHAR(20) NOT NULL,
    `floor` SMALLINT NOT NULL,
    `status` ENUM('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'BLOCKED', 'INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
    `is_accessible` BOOLEAN NOT NULL DEFAULT false,
    `administrative_notes` VARCHAR(1000) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_room_type_id_idx`(`room_type_id`),
    UNIQUE INDEX `room_unit_id_number_key`(`unit_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_type_history` (
    `id` CHAR(36) NOT NULL,
    `room_id` CHAR(36) NOT NULL,
    `room_type_id` CHAR(36) NOT NULL,
    `valid_from` DATETIME(0) NOT NULL,
    `valid_until` DATETIME(0) NULL,

    INDEX `room_type_history_room_id_valid_from_idx`(`room_id`, `valid_from`),
    INDEX `room_type_history_room_type_id_idx`(`room_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_price_history` (
    `id` CHAR(36) NOT NULL,
    `room_id` CHAR(36) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `valid_from` DATETIME(0) NOT NULL,
    `valid_until` DATETIME(0) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_price_history_room_id_valid_from_idx`(`room_id`, `valid_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_type` ADD CONSTRAINT `room_type_hotel_id_fkey` FOREIGN KEY (`hotel_id`) REFERENCES `hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bed_configuration` ADD CONSTRAINT `bed_configuration_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `hotel_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room` ADD CONSTRAINT `room_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_type_history` ADD CONSTRAINT `room_type_history_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_type_history` ADD CONSTRAINT `room_type_history_room_type_id_fkey` FOREIGN KEY (`room_type_id`) REFERENCES `room_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_price_history` ADD CONSTRAINT `room_price_history_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `room_type` ADD CONSTRAINT `room_type_max_guests_check` CHECK (`max_guests` >= 1);
ALTER TABLE `room_type` ADD CONSTRAINT `room_type_area_m2_check` CHECK (`area_m2` > 0);
ALTER TABLE `room_type` ADD CONSTRAINT `room_type_default_price_check` CHECK (`default_price` > 0);
ALTER TABLE `bed_configuration` ADD CONSTRAINT `bed_configuration_quantity_check` CHECK (`quantity` >= 1);
ALTER TABLE `room` ADD CONSTRAINT `room_status_is_active_check` CHECK ((`status` = 'INACTIVE' AND `is_active` = 0) OR (`status` <> 'INACTIVE' AND `is_active` = 1));
ALTER TABLE `room_price_history` ADD CONSTRAINT `room_price_history_price_check` CHECK (`price` > 0);
ALTER TABLE `room_price_history` ADD CONSTRAINT `room_price_history_validity_check` CHECK (`valid_until` IS NULL OR `valid_until` >= `valid_from`);
ALTER TABLE `room_type_history` ADD CONSTRAINT `room_type_history_validity_check` CHECK (`valid_until` IS NULL OR `valid_until` >= `valid_from`);
