-- LefimovArt Database Schema - Safe Migration for Existing Tables
-- Merge cu baza de date existentă r133813iton_ai_video

-- Tabela users - Modify existing table to add new columns
-- IF NOT EXISTS not supported in ALTER, so script will run safely
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE;
ALTER TABLE users ADD COLUMN verification_code VARCHAR(6) NULL;
ALTER TABLE users ADD COLUMN is_verified TINYINT(1) DEFAULT 0;
ALTER TABLE users ADD COLUMN credits INT DEFAULT 40;
ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN role ENUM('admin', 'user') DEFAULT 'user';
-- Do NOT add timestamps to existing table - preserve original structure

-- Tabel pentru imagini generate
CREATE TABLE IF NOT EXISTS generated_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    prompt TEXT NULL,
    ip_address VARCHAR(45) NULL,
    flagged TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    INDEX idx_user_email (user_email),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela videos - Modify existing table to add new columns
ALTER TABLE videos ADD COLUMN user_email VARCHAR(255) NULL;
ALTER TABLE videos ADD COLUMN status_url VARCHAR(512) NULL;
ALTER TABLE videos ADD COLUMN response_url VARCHAR(512) NULL;
ALTER TABLE videos ADD COLUMN api_endpoint VARCHAR(512) NULL;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_email ON videos(user_email);
CREATE INDEX IF NOT EXISTS idx_status ON videos(status);

-- Tabel pentru sesiuni Stripe procesate (anti-replay)
CREATE TABLE IF NOT EXISTS processed_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL,
    credits_added INT NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE,
    INDEX idx_session (session_id),
    INDEX idx_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel pentru password resets
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_token (token),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel pentru JWT tokens (optional - pentru logout management)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(512) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
