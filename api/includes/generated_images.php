<?php

function ensure_generated_images_flagged_column(PDO $pdo): void {
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?'
    );
    $stmt->execute([DB_NAME, 'generated_images', 'flagged']);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE generated_images ADD COLUMN flagged TINYINT(1) NOT NULL DEFAULT 0');
    }

    $stmt->execute([DB_NAME, 'generated_images', 'flagged_reason']);
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec('ALTER TABLE generated_images ADD COLUMN flagged_reason VARCHAR(120) NULL DEFAULT NULL');
    }
}
