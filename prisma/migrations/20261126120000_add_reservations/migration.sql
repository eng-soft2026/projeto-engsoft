-- CreateTable
CREATE TABLE `reservation` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `check_in` DATE NOT NULL,
    `check_out` DATE NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'CONFIRMED', 'PARTIALLY_CANCELLED', 'CANCELLED', 'COMPLETED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `subtotal_amount` DECIMAL(12, 2) NOT NULL,
    `discount_amount` DECIMAL(12, 2) NOT NULL,
    `gross_amount` DECIMAL(12, 2) NOT NULL,
    `service_fee` DECIMAL(12, 2) NOT NULL,
    `platform_commission` DECIMAL(12, 2) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `hold_expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reservation_code_key`(`code`),
    INDEX `reservation_user_id_idx`(`user_id`),
    INDEX `reservation_check_in_check_out_idx`(`check_in`, `check_out`),
    INDEX `reservation_status_idx`(`status`),
    INDEX `reservation_status_hold_expires_at_idx`(`status`, `hold_expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_room` (
    `id` CHAR(36) NOT NULL,
    `reservation_id` CHAR(36) NOT NULL,
    `room_id` CHAR(36) NOT NULL,
    `room_type_name_snapshot` VARCHAR(150) NOT NULL,
    `room_number_snapshot` VARCHAR(20) NOT NULL,
    `unit_name_snapshot` VARCHAR(150) NOT NULL,
    `base_price_snapshot` DECIMAL(12, 2) NOT NULL,
    `subtotal_amount` DECIMAL(12, 2) NOT NULL,
    `promotion_id` CHAR(36) NULL,
    `promotion_name_snapshot` VARCHAR(150) NULL,
    `discount_type_snapshot` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NULL,
    `discount_value_snapshot` DECIMAL(12, 2) NULL,
    `discount_amount` DECIMAL(12, 2) NOT NULL,
    `gross_amount` DECIMAL(12, 2) NOT NULL,
    `service_fee` DECIMAL(12, 2) NOT NULL,
    `platform_commission` DECIMAL(12, 2) NOT NULL,
    `total_price` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reservation_room_reservation_id_idx`(`reservation_id`),
    INDEX `reservation_room_room_id_idx`(`room_id`),
    INDEX `reservation_room_promotion_id_idx`(`promotion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reservation_room_night` (
    `id` CHAR(36) NOT NULL,
    `reservation_room_id` CHAR(36) NOT NULL,
    `stay_date` DATE NOT NULL,
    `applied_price` DECIMAL(12, 2) NOT NULL,
    `price_source` ENUM('PERIOD', 'ROOM', 'ROOM_TYPE') NOT NULL,

    UNIQUE INDEX `reservation_room_night_reservation_room_id_stay_date_key`(`reservation_room_id`, `stay_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `reservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_room_night` ADD CONSTRAINT `reservation_room_night_reservation_room_id_fkey` FOREIGN KEY (`reservation_room_id`) REFERENCES `reservation_room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_dates_check` CHECK (`check_in` < `check_out`);
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_amounts_check` CHECK (`subtotal_amount` >= 0 AND `discount_amount` >= 0 AND `gross_amount` >= 0 AND `service_fee` >= 0 AND `platform_commission` >= 0 AND `total_amount` >= 0);
ALTER TABLE `reservation` ADD CONSTRAINT `reservation_totals_check` CHECK (`gross_amount` = `subtotal_amount` - `discount_amount` AND `total_amount` = `gross_amount` + `service_fee`);
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_amounts_check` CHECK (`base_price_snapshot` >= 0 AND `subtotal_amount` >= 0 AND `discount_amount` >= 0 AND `gross_amount` >= 0 AND `service_fee` >= 0 AND `platform_commission` >= 0 AND `total_price` >= 0);
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_totals_check` CHECK (`gross_amount` = `subtotal_amount` - `discount_amount` AND `total_price` = `gross_amount` + `service_fee`);
ALTER TABLE `reservation_room` ADD CONSTRAINT `reservation_room_discount_snapshot_check` CHECK ((`discount_type_snapshot` IS NULL AND `discount_value_snapshot` IS NULL) OR (`discount_type_snapshot` IS NOT NULL AND `discount_value_snapshot` > 0));
ALTER TABLE `reservation_room_night` ADD CONSTRAINT `reservation_room_night_price_check` CHECK (`applied_price` >= 0);
