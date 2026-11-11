-- CreateTable
CREATE TABLE `room_price_period` (
    `id` CHAR(36) NOT NULL,
    `room_id` CHAR(36) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `room_price_period_room_id_start_date_end_date_idx`(`room_id`, `start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `room_price_period` ADD CONSTRAINT `room_price_period_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `room_price_period` ADD CONSTRAINT `room_price_period_price_check` CHECK (`price` > 0);
ALTER TABLE `room_price_period` ADD CONSTRAINT `room_price_period_dates_check` CHECK (`start_date` <= `end_date`);
