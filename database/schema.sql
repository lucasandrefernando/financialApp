-- ============================================================
-- Financial App - Complete MySQL Schema
-- ============================================================

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS recurring_transactions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS income_sources;
DROP TABLE IF EXISTS account_invitations;
DROP TABLE IF EXISTS account_members;
DROP TABLE IF EXISTS bank_accounts;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500) NULL,
  currency VARCHAR(10) DEFAULT 'BRL',
  locale VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

-- ============================================================
-- USER SESSIONS (refresh tokens)
-- ============================================================
CREATE TABLE user_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  refresh_token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- BANK ACCOUNTS
-- ============================================================
CREATE TABLE bank_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('checking','savings','investment','cash','digital_wallet') NOT NULL,
  bank_name VARCHAR(255) NULL,
  initial_balance DECIMAL(15,2) DEFAULT 0.00,
  current_balance DECIMAL(15,2) DEFAULT 0.00,
  color VARCHAR(20) DEFAULT '#4F46E5',
  icon VARCHAR(50) DEFAULT 'wallet',
  include_in_total BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ============================================================
-- ACCOUNT MEMBERS (shared accounts)
-- ============================================================
CREATE TABLE account_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
  invited_by INT NULL,
  accepted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_member (account_id, user_id),
  FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ACCOUNT INVITATIONS
-- ============================================================
CREATE TABLE account_invitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account_id INT NOT NULL,
  invited_by INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('editor','viewer') NOT NULL DEFAULT 'viewer',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- ============================================================
-- INCOME SOURCES
-- ============================================================
CREATE TABLE income_sources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  account_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('salary','freelance','rental','pension','dividends','investment','other') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  day_of_month TINYINT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES bank_accounts(id)
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('income','expense','both') NOT NULL DEFAULT 'expense',
  parent_id INT NULL,
  color VARCHAR(20) DEFAULT '#6B7280',
  icon VARCHAR(50) DEFAULT 'tag',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  account_id INT NOT NULL,
  category_id INT NULL,
  type ENUM('income','expense','transfer') NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  competence_date DATE NULL,
  status ENUM('completed','pending','scheduled','cancelled') DEFAULT 'completed',
  expense_type ENUM('essential','variable','leisure','investment') NULL,
  is_installment BOOLEAN DEFAULT FALSE,
  installment_number INT NULL,
  installment_total INT NULL,
  installment_group_id VARCHAR(36) NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_id INT NULL,
  transfer_to_account_id INT NULL,
  tags JSON NULL,
  notes TEXT NULL,
  attachment_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (transfer_to_account_id) REFERENCES bank_accounts(id)
);

-- ============================================================
-- RECURRING TRANSACTIONS
-- ============================================================
CREATE TABLE recurring_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  account_id INT NOT NULL,
  category_id INT NULL,
  type ENUM('income','expense') NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  frequency ENUM('daily','weekly','biweekly','monthly','quarterly','semiannual','yearly') NOT NULL,
  day_of_month TINYINT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  active BOOLEAN DEFAULT TRUE,
  last_generated_date DATE NULL,
  tags JSON NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES bank_accounts(id)
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  period ENUM('weekly','monthly','yearly') DEFAULT 'monthly',
  alert_threshold TINYINT DEFAULT 80,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ============================================================
-- GOALS
-- ============================================================
CREATE TABLE goals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  account_id INT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0.00,
  monthly_contribution DECIMAL(15,2) NULL,
  deadline DATE NULL,
  priority TINYINT DEFAULT 3,
  status ENUM('active','completed','paused','cancelled') DEFAULT 'active',
  icon VARCHAR(50) DEFAULT 'target',
  color VARCHAR(20) DEFAULT '#4F46E5',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- SYSTEM CATEGORIES (seed data)
-- ============================================================
INSERT INTO categories (user_id, name, type, color, icon, is_system) VALUES
(NULL, 'Alimentação', 'expense', '#EF4444', 'utensils', TRUE),
(NULL, 'Transporte', 'expense', '#F97316', 'car', TRUE),
(NULL, 'Moradia', 'expense', '#8B5CF6', 'home', TRUE),
(NULL, 'Saúde', 'expense', '#10B981', 'heart', TRUE),
(NULL, 'Educação', 'expense', '#3B82F6', 'book', TRUE),
(NULL, 'Lazer', 'expense', '#EC4899', 'gamepad', TRUE),
(NULL, 'Roupas', 'expense', '#F59E0B', 'shopping-bag', TRUE),
(NULL, 'Tecnologia', 'expense', '#6366F1', 'smartphone', TRUE),
(NULL, 'Assinaturas', 'expense', '#14B8A6', 'repeat', TRUE),
(NULL, 'Serviços', 'expense', '#84CC16', 'tool', TRUE),
(NULL, 'Impostos', 'expense', '#64748B', 'file-text', TRUE),
(NULL, 'Investimentos', 'expense', '#06B6D4', 'trending-up', TRUE),
(NULL, 'Outros Gastos', 'expense', '#6B7280', 'more-horizontal', TRUE),
(NULL, 'Salário', 'income', '#22C55E', 'briefcase', TRUE),
(NULL, 'Freelance', 'income', '#10B981', 'code', TRUE),
(NULL, 'Aluguel Recebido', 'income', '#84CC16', 'home', TRUE),
(NULL, 'Investimentos', 'income', '#06B6D4', 'trending-up', TRUE),
(NULL, 'Outros Ganhos', 'income', '#6B7280', 'plus-circle', TRUE),
(NULL, 'Transferência', 'both', '#94A3B8', 'arrow-left-right', TRUE);
