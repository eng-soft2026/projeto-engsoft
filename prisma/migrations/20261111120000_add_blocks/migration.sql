-- CreateTable
CREATE TABLE `unit_block` (
    `id` CHAR(36) NOT NULL,
    `unit_id` CHAR(36) NOT NULL,
    `start_at` DATE NOT NULL,
    `end_at` DATE NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `created_by_user_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `unit_block_unit_id_start_at_end_at_idx`(`unit_id`, `start_at`, `end_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_block` (
    `id` CHAR(36) NOT NULL,
    `room_id` CHAR(36) NOT NULL,
    `start_at` DATE NOT NULL,
    `end_at` DATE NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `created_by_user_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_block_room_id_start_at_end_at_idx`(`room_id`, `start_at`, `end_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `unit_block` ADD CONSTRAINT `unit_block_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `hotel_unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unit_block` ADD CONSTRAINT `unit_block_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_block` ADD CONSTRAINT `room_block_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_block` ADD CONSTRAINT `room_block_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK constraints (Prisma cannot express them)
ALTER TABLE `unit_block` ADD CONSTRAINT `unit_block_dates_check` CHECK (`start_at` < `end_at`);
ALTER TABLE `room_block` ADD CONSTRAINT `room_block_dates_check` CHECK (`start_at` < `end_at`);
