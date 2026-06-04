-- LHMS e-Doc — MySQL Schema
-- Import: mysql -u root -p < database/mysql-schema.sql
-- Then:   mysql -u root -p lhms_edoc < database/mysql-documents-seed.sql

CREATE DATABASE IF NOT EXISTS lhms_edoc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lhms_edoc;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  fullname VARCHAR(255) DEFAULT NULL,
  department VARCHAR(255) DEFAULT NULL,
  role VARCHAR(32) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY,
  doc_number VARCHAR(64) NOT NULL UNIQUE,
  doc_date DATE DEFAULT NULL,
  doc_time TIME DEFAULT NULL,
  subject TEXT,
  recipient VARCHAR(255) DEFAULT NULL,
  doc_type VARCHAR(64) DEFAULT NULL,
  details TEXT,
  department VARCHAR(255) DEFAULT NULL,
  requester_dept VARCHAR(255) DEFAULT '',
  approved_by VARCHAR(255) DEFAULT '',
  created_by VARCHAR(64) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_docs_dept (department),
  INDEX idx_docs_type (doc_type),
  INDEX idx_docs_date (doc_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS approvers (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO departments (id, name) VALUES
  ('29dc7cdb-d1d0-464c-b07e-5944be57fef1', 'ພະແນກບຸກຄະລາກອນ'),
  ('04a81312-5343-4985-9bf6-a0e8fe63e400', 'ພະແນກບັນຊີການເງິນ'),
  ('ae52221b-eb07-4e2f-b932-fcc9c2bd1d6f', 'ພະແນກບໍລິຫານຫ້ອງການ'),
  ('050ed058-863e-4d12-8bf7-c6c7e43fd86a', 'ພະແນກສາງ'),
  ('91f425f7-e9e1-4e78-90eb-31634914f789', 'ພະແນກBanding'),
  ('6b539f37-d1a1-432d-88f2-89596c81ab79', 'ພະແນກໄອທີ');

INSERT IGNORE INTO departments (id, name)
SELECT UUID(), 'ພະແນກພັດທະນາທຸລະກິດ' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'ພະແນກພັດທະນາທຸລະກິດ');
INSERT IGNORE INTO departments (id, name)
SELECT UUID(), 'ຝ່າຍການແພດ' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'ຝ່າຍການແພດ');
INSERT IGNORE INTO departments (id, name)
SELECT UUID(), 'ຝາຍບໍລິຫານ' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'ຝາຍບໍລິຫານ');
INSERT IGNORE INTO departments (id, name)
SELECT UUID(), 'ພະແນກຈັດຊື້' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'ພະແນກຈັດຊື້');
INSERT IGNORE INTO departments (id, name)
SELECT UUID(), 'Partnership' WHERE NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Partnership');

INSERT IGNORE INTO users (id, username, password, fullname, department, role) VALUES
  ('5e276094-79a3-4a74-951f-5b13e7ff22ef', 'admin', '$2a$10$DtLvDTE0LuZ9/IH9H9JC2u2HBTlVXUy8T2H3u5m.Xb4WsVWYK9Ih6', 'Administrator', 'ALL', 'admin'),
  ('8f20e2dd-51df-4d6b-98b7-9eeee4b8430a', 'HR', '$2a$10$Ozi.R8my1O/qVyrizjNnWO6Gly/pdRrKZcoU0ftHZwWcEhliLo4Im', 'ພະແນກບຸກຄະລາກອນ', 'ພະແນກບຸກຄະລາກອນ', 'user'),
  ('d2eeaca0-1ef3-4e8f-bf33-bbc0ddea48ed', 'MK', '$2a$10$bltEgTfvva/rVZQhrAt/HuuR/ZhYA47P9Qr72z1XxmbSC0pCG7TlK', 'Maketting', 'ພະແນກພັດທະນາທຸລະກິດ', 'user'),
  ('f5f75bff-40cb-43f2-9a19-4ceed6411a69', 'AD', '$2a$10$TEhOYTGMZkEI1.rgGk6kLefVtY9xXFUQBjC86J9nJah8D.zhTuDuq', 'Admin', 'ພະແນກບໍລິຫານຫ້ອງການ', 'user'),
  ('7b3b03ec-102c-497b-9a6f-b3a0da5bcf43', 'DC', '$2a$10$cca2LgU7V5UDLG6uksudJetN3BbxgVkCFVR5yauzgiRdvAW1NU8Wu', 'Doctor', 'ຝ່າຍການແພດ', 'user'),
  ('7230ea12-88ab-48a8-828a-1c6882f9d8e1', 'FN', '$2a$10$d2.1BLFK.QHo281vsl859u7PS9eN7lcTvXFb0LlkCB6c.hytkBrgy', 'Finance', 'ພະແນກບັນຊີການເງິນ', 'user'),
  ('3d44256f-a793-45c8-9fd5-6d3deae49bab', 'ST', '$2a$10$cu/4p7B5XSB7pQKWQ19G3Ov9U.dUbNdfgiFmdP6iNtgMAMy.OWgo6', 'Stock', 'ພະແນກສາງ', 'user'),
  ('9b7b9f37-d1a1-432d-88f2-89596c81ab79', 'IT', '$2a$10$4erQbv22gtNaDWlObdJk9uZ7p2E0p1v0EpzQ9X2itJ5NRb.TUmW2q', 'ພະແນກໄອທີ', 'ພະແນກໄອທີ', 'user');

INSERT IGNORE INTO approvers (id, name, department, is_active) VALUES
  (UUID(), 'ທ່ານ ວาເລັນທາຍ', 'ພະແນກໄອທີ', 1),
  (UUID(), 'ທ່ານ ສຸກລາຕີ', 'ພະແນກໄອທີ', 1),
  (UUID(), 'ທ່ານ ນາງ ໂຕ້', 'ພະແນກບໍລິຫານຫ້ອງການ', 1),
  (UUID(), 'ທ່ານ ນາງ ແອນນາ', 'ພະແນກບໍລິຫານຫ້ອງການ', 1),
  (UUID(), 'ທ່ານ ນາງ ໂຕ້', 'ຝາຍບໍລິຫານ', 1),
  (UUID(), 'ທ່ານ ນາງ ແອນນາ', 'ຝາຍບໍລິຫານ', 1),
  (UUID(), 'ທ່ານ ນາງ ອ້ອຍ', 'ພະແນກບຸກຄະລາກອນ', 1),
  (UUID(), 'ທ່ານ ນາງ ວິພາດາ', 'ພະແນກສາງ', 1),
  (UUID(), 'ທ່ານ ນາງ ຄູນຄຳ', 'ພະແນກສາງ', 1),
  (UUID(), 'ທ່ານ ນາງ ວິພາດາ', 'ພະແນກຈັດຊື້', 1),
  (UUID(), 'ທ່ານ ນາງ ຄູນຄຳ', 'ພະແນກຈັດຊື້', 1),
  (UUID(), 'ທ່ານ ນາງ ຕາດຳ', 'ພະແນກພັດທະນາທຸລະກິດ', 1),
  (UUID(), 'ທ່ານ ນາງ ອາເບ່', 'ພະແນກພັດທະນາທຸລະກິດ', 1),
  (UUID(), 'ທ່ານ ນາງ ຕາດຳ', 'ພະແນກBanding', 1),
  (UUID(), 'ທ່ານ ນາງ ອາເບ່', 'ພະແນກBanding', 1),
  (UUID(), 'ທ່ານ ນາງ ຕາດຳ', 'Partnership', 1),
  (UUID(), 'ທ່ານ ນາງ ອາເບ່', 'Partnership', 1),
  (UUID(), 'ດຣ ສຸກສະຫວັດ', 'ຝ່າຍການແພດ', 1),
  (UUID(), 'ທ່ານ ນາງ ຄູນຄຳ', 'ພະແນກບັນຊີການເງິນ', 1),
  (UUID(), 'ທ່ານ ນາງ ດາລີວັນ', 'ພະແນກບັນຊີການເງິນ', 1),
  (UUID(), 'ທ່ານ ນາງ ສຸດສະຫວັນ', 'ພະແນກບັນຊີການເງິນ', 1);
