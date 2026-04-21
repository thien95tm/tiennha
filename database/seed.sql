-- =========================================================================
-- Tienthuenha - Seed dữ liệu khởi tạo
-- =========================================================================
USE Tienthuenha;

-- ---- Admin (password: admin@123) ----------------------------------------
INSERT INTO admin_users (username, password_hash) VALUES
  ('thienpv', '$2y$10$nVHdwn7PplLtRwaZn8T3YOk6abaWxRDDU0PQQjkZ19sOkogkPLWJa');

-- ---- 5 phòng cố định -----------------------------------------------------
INSERT INTO rooms (code, name, floor, sort_order) VALUES
  ('t4_giua', 'Tầng 4 giữa', 4, 10),
  ('t4_be',   'Tầng 4 bé',   4, 20),
  ('t4_to',   'Tầng 4 to',   4, 30),
  ('t3_giua', 'Tầng 3 giữa', 3, 40),
  ('t3_be',   'Tầng 3 bé',   3, 50);

-- ---- Bảng giá ban đầu (mức cũ áp dụng từ T9-2024) -----------------------
-- Tiền phòng: t4_giua=1.5tr, t4_be=2.2tr, t4_to=2.5tr, t3_giua=1.5tr, t3_be=2.2tr
-- Nước+Rác: 145.000đ - Đơn giá điện: 4.000đ/số
INSERT INTO room_pricing (room_id, rent_amount, water_fee, electric_unit_price, effective_from, note)
SELECT id, 1500000, 145000, 4000, '2024-09-01', 'Mức giá ban đầu' FROM rooms WHERE code='t4_giua'
UNION ALL SELECT id, 2200000, 145000, 4000, '2024-09-01', 'Mức giá ban đầu' FROM rooms WHERE code='t4_be'
UNION ALL SELECT id, 2500000, 145000, 4000, '2024-09-01', 'Mức giá ban đầu' FROM rooms WHERE code='t4_to'
UNION ALL SELECT id, 1500000, 145000, 4000, '2024-09-01', 'Mức giá ban đầu' FROM rooms WHERE code='t3_giua'
UNION ALL SELECT id, 2200000, 145000, 4000, '2024-09-01', 'Mức giá ban đầu' FROM rooms WHERE code='t3_be';

-- ---- Tăng giá tiền phòng từ T6-2025 (mỗi phòng +100k) -------------------
INSERT INTO room_pricing (room_id, rent_amount, water_fee, electric_unit_price, effective_from, note)
SELECT id, 1600000, 145000, 4000, '2025-06-01', 'Tăng tiền phòng +100k' FROM rooms WHERE code='t4_giua'
UNION ALL SELECT id, 2300000, 145000, 4000, '2025-06-01', 'Tăng tiền phòng +100k' FROM rooms WHERE code='t4_be'
UNION ALL SELECT id, 2600000, 145000, 4000, '2025-06-01', 'Tăng tiền phòng +100k' FROM rooms WHERE code='t4_to'
UNION ALL SELECT id, 1600000, 145000, 4000, '2025-06-01', 'Tăng tiền phòng +100k' FROM rooms WHERE code='t3_giua'
UNION ALL SELECT id, 2300000, 145000, 4000, '2025-06-01', 'Tăng tiền phòng +100k' FROM rooms WHERE code='t3_be';

-- ---- Tăng phí nước+rác từ T4-2026 (145k → 154k) -------------------------
INSERT INTO room_pricing (room_id, rent_amount, water_fee, electric_unit_price, effective_from, note)
SELECT id, 1600000, 154000, 4000, '2026-04-01', 'Tăng nước+rác lên 154k' FROM rooms WHERE code='t4_giua'
UNION ALL SELECT id, 2300000, 154000, 4000, '2026-04-01', 'Tăng nước+rác lên 154k' FROM rooms WHERE code='t4_be'
UNION ALL SELECT id, 2600000, 154000, 4000, '2026-04-01', 'Tăng nước+rác lên 154k' FROM rooms WHERE code='t4_to'
UNION ALL SELECT id, 1600000, 154000, 4000, '2026-04-01', 'Tăng nước+rác lên 154k' FROM rooms WHERE code='t3_giua'
UNION ALL SELECT id, 2300000, 154000, 4000, '2026-04-01', 'Tăng nước+rác lên 154k' FROM rooms WHERE code='t3_be';
