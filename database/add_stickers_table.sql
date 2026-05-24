-- Migration: Add stickers table
-- Run on existing databases that were created before this feature

CREATE TABLE IF NOT EXISTS stickers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT '',
    url VARCHAR(512) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Custom',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
