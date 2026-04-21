-- =========================================================================
-- Tienthuenha - Schema
-- MySQL 8.0+, charset utf8mb4
-- =========================================================================

CREATE DATABASE IF NOT EXISTS Tienthuenha
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE Tienthuenha;

-- -------------------------------------------------------------------------
-- Drop in reverse dependency order (an toàn khi re-run)
-- -------------------------------------------------------------------------
DROP TABLE IF EXISTS extra_fees;
DROP TABLE IF EXISTS monthly_bills;
DROP TABLE IF EXISTS room_pricing;
DROP TABLE IF EXISTS room_assignments;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS admin_users;

-- -------------------------------------------------------------------------
-- 1. Admin (chỉ 1 tài khoản)
-- -------------------------------------------------------------------------
CREATE TABLE admin_users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 2. Phòng (cố định 5 phòng, có thể bật/tắt)
-- -------------------------------------------------------------------------
CREATE TABLE rooms (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  floor       TINYINT      NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 3. Người thuê
-- -------------------------------------------------------------------------
CREATE TABLE tenants (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NULL,
  note        TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 4. Lịch sử ai thuê phòng nào
--    end_date = NULL  ⇒ hiện đang thuê
-- -------------------------------------------------------------------------
CREATE TABLE room_assignments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id     INT UNSIGNED NOT NULL,
  tenant_id   INT UNSIGNED NOT NULL,
  start_date  DATE         NOT NULL,
  end_date    DATE         NULL,
  note        VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_assign_room   FOREIGN KEY (room_id)   REFERENCES rooms(id),
  CONSTRAINT fk_assign_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  INDEX idx_assign_room   (room_id, start_date),
  INDEX idx_assign_active (room_id, end_date)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 5. Bảng giá theo thời gian
--    Khi giá thay đổi => INSERT dòng mới với effective_from mới
-- -------------------------------------------------------------------------
CREATE TABLE room_pricing (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id             INT UNSIGNED NOT NULL,
  rent_amount         INT          NOT NULL,
  water_fee           INT          NOT NULL,
  electric_unit_price INT          NOT NULL DEFAULT 4000,
  effective_from      DATE         NOT NULL,
  note                VARCHAR(255) NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pricing_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  INDEX idx_pricing_room_date (room_id, effective_from)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 6. Hoá đơn từng tháng từng phòng
--    Snapshot giá tại thời điểm tạo bill (không phụ thuộc room_pricing tương lai)
--    UNIQUE(room_id, month) ⇒ mỗi phòng/tháng chỉ 1 bill
-- -------------------------------------------------------------------------
CREATE TABLE monthly_bills (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  room_id              INT UNSIGNED NOT NULL,
  tenant_id            INT UNSIGNED NULL,
  month                CHAR(7)      NOT NULL COMMENT 'YYYY-MM',
  electric_prev        INT          NOT NULL,
  electric_current     INT          NOT NULL,
  electric_unit_price  INT          NOT NULL,
  water_fee            INT          NOT NULL,
  rent_amount          INT          NOT NULL,
  note                 TEXT         NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bill_room   FOREIGN KEY (room_id)   REFERENCES rooms(id),
  CONSTRAINT fk_bill_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE KEY uq_bill_room_month (room_id, month),
  INDEX idx_bill_month (month)
) ENGINE=InnoDB;

-- -------------------------------------------------------------------------
-- 7. Phí phát sinh (0..n cho mỗi bill)
-- -------------------------------------------------------------------------
CREATE TABLE extra_fees (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bill_id     INT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount      INT          NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_extra_bill FOREIGN KEY (bill_id) REFERENCES monthly_bills(id) ON DELETE CASCADE,
  INDEX idx_extra_bill (bill_id)
) ENGINE=InnoDB;
