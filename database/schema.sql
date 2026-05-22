-- LefimovArt Database Schema
-- Merge cu baza de date existentă r133813iton_ai_video

-- Extensie tabel users (dacă nu există)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    google_id VARCHAR(255) NULL UNIQUE,
    verification_code VARCHAR(6) NULL,
    is_verified TINYINT(1) DEFAULT 0,
    credits INT DEFAULT 40,
    name VARCHAR(255) NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- Tabel pentru video-uri generate (extinde videos existentă)
CREATE TABLE IF NOT EXISTS videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    prompt TEXT NULL,
    image_path VARCHAR(255) NULL,
    model_used VARCHAR(50) NOT NULL,
    resolution VARCHAR(20) NOT NULL,
    duration INT NOT NULL,
    format VARCHAR(20) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    credits_deducted INT NOT NULL,
    status VARCHAR(20) DEFAULT 'processing',
    queue_id VARCHAR(255) NULL,
    status_url VARCHAR(512) NULL,
    response_url VARCHAR(512) NULL,
    api_endpoint VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_email (user_email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
