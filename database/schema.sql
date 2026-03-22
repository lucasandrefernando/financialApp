-- =============================================================================
-- FINANCIAL APP - SCHEMA COMPLETO SUPABASE / POSTGRESQL 15+
-- =============================================================================
-- Execução: Cole diretamente no SQL Editor do Supabase
-- Ordem de execução: Este arquivo único, do início ao fim
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1: EXTENSÕES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- SEÇÃO 2: ENUM TYPES
-- =============================================================================

CREATE TYPE account_type AS ENUM (
    'checking',
    'savings',
    'investment',
    'cash',
    'digital_wallet'
);

CREATE TYPE transaction_type AS ENUM (
    'income',
    'expense',
    'transfer'
);

CREATE TYPE transaction_status AS ENUM (
    'pending',
    'completed',
    'cancelled',
    'scheduled'
);

CREATE TYPE budget_period AS ENUM (
    'weekly',
    'monthly',
    'yearly'
);

CREATE TYPE goal_status AS ENUM (
    'active',
    'completed',
    'cancelled',
    'paused'
);

CREATE TYPE credit_card_brand AS ENUM (
    'visa',
    'mastercard',
    'elo',
    'amex',
    'hipercard',
    'other'
);

CREATE TYPE installment_status AS ENUM (
    'pending',
    'paid',
    'overdue',
    'cancelled'
);

CREATE TYPE recurrence_frequency AS ENUM (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'bimonthly',
    'quarterly',
    'semiannual',
    'yearly'
);

CREATE TYPE notification_type AS ENUM (
    'budget_alert',
    'goal_reached',
    'bill_due',
    'large_expense',
    'low_balance',
    'recurring_created',
    'installment_due',
    'general'
);

CREATE TYPE notification_status AS ENUM (
    'unread',
    'read',
    'dismissed'
);

CREATE TYPE category_type AS ENUM (
    'income',
    'expense',
    'both'
);


-- =============================================================================
-- SEÇÃO 3: TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 profiles
-- Extensão do auth.users do Supabase. Criada via trigger ao registrar usuário.
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT,
    avatar_url          TEXT,
    phone               TEXT,
    currency            CHAR(3)         NOT NULL DEFAULT 'BRL',
    locale              VARCHAR(10)     NOT NULL DEFAULT 'pt-BR',
    timezone            TEXT            NOT NULL DEFAULT 'America/Sao_Paulo',
    monthly_income      NUMERIC(15, 2)  NOT NULL DEFAULT 0,
    onboarding_done     BOOLEAN         NOT NULL DEFAULT FALSE,
    preferences         JSONB           NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

COMMENT ON TABLE profiles IS 'Perfis de usuário estendidos do auth.users';
COMMENT ON COLUMN profiles.preferences IS 'Configurações livres: tema, notificações, etc.';


-- -----------------------------------------------------------------------------
-- 3.2 accounts
-- Contas bancárias, poupanças, carteiras digitais, etc.
-- -----------------------------------------------------------------------------
CREATE TABLE accounts (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    type            account_type    NOT NULL,
    bank_name       TEXT,
    bank_code       TEXT,
    agency          TEXT,
    account_number  TEXT,
    balance         NUMERIC(15, 2)  NOT NULL DEFAULT 0,
    initial_balance NUMERIC(15, 2)  NOT NULL DEFAULT 0,
    color           CHAR(7)         NOT NULL DEFAULT '#6366F1',
    icon            TEXT            NOT NULL DEFAULT 'bank',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    include_in_sum  BOOLEAN         NOT NULL DEFAULT TRUE,
    notes           TEXT,
    metadata        JSONB           NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT accounts_name_not_empty CHECK (TRIM(name) <> '')
);

COMMENT ON TABLE accounts IS 'Contas financeiras do usuário';
COMMENT ON COLUMN accounts.balance IS 'Saldo atual calculado automaticamente via trigger';
COMMENT ON COLUMN accounts.initial_balance IS 'Saldo inicial no momento do cadastro da conta';
COMMENT ON COLUMN accounts.include_in_sum IS 'Se a conta entra no saldo total do dashboard';


-- -----------------------------------------------------------------------------
-- 3.3 categories
-- Categorias de receitas e despesas. Suporte a hierarquia (subcategorias).
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID            REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id   UUID            REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT            NOT NULL,
    type        category_type   NOT NULL DEFAULT 'expense',
    color       CHAR(7)         NOT NULL DEFAULT '#6366F1',
    icon        TEXT            NOT NULL DEFAULT 'tag',
    is_system   BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    sort_order  INTEGER         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,

    CONSTRAINT categories_name_not_empty CHECK (TRIM(name) <> ''),
    CONSTRAINT categories_no_self_parent CHECK (id <> parent_id)
);

COMMENT ON TABLE categories IS 'Categorias de transações. user_id NULL = categoria global do sistema';
COMMENT ON COLUMN categories.is_system IS 'Categorias do sistema não podem ser deletadas pelo usuário';
COMMENT ON COLUMN categories.parent_id IS 'NULL = categoria raiz; preenchido = subcategoria';


-- -----------------------------------------------------------------------------
-- 3.4 credit_cards
-- Cartões de crédito com controle de fatura e limite.
-- -----------------------------------------------------------------------------
CREATE TABLE credit_cards (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id          UUID                REFERENCES accounts(id) ON DELETE SET NULL,
    name                TEXT                NOT NULL,
    brand               credit_card_brand   NOT NULL DEFAULT 'other',
    last_four_digits    CHAR(4),
    credit_limit        NUMERIC(15, 2)      NOT NULL DEFAULT 0,
    available_limit     NUMERIC(15, 2)      NOT NULL DEFAULT 0,
    closing_day         SMALLINT            NOT NULL,
    due_day             SMALLINT            NOT NULL,
    color               CHAR(7)             NOT NULL DEFAULT '#6366F1',
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,
    notes               TEXT,
    metadata            JSONB               NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT credit_cards_name_not_empty CHECK (TRIM(name) <> ''),
    CONSTRAINT credit_cards_closing_day CHECK (closing_day BETWEEN 1 AND 31),
    CONSTRAINT credit_cards_due_day CHECK (due_day BETWEEN 1 AND 31),
    CONSTRAINT credit_cards_limit_positive CHECK (credit_limit >= 0),
    CONSTRAINT credit_cards_available_positive CHECK (available_limit >= 0)
);

COMMENT ON TABLE credit_cards IS 'Cartões de crédito vinculados ao usuário';
COMMENT ON COLUMN credit_cards.available_limit IS 'Limite disponível calculado automaticamente';


-- -----------------------------------------------------------------------------
-- 3.5 transactions
-- Coração do sistema: todas as movimentações financeiras.
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
    id                      UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID                    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id              UUID                    REFERENCES accounts(id) ON DELETE SET NULL,
    credit_card_id          UUID                    REFERENCES credit_cards(id) ON DELETE SET NULL,
    category_id             UUID                    REFERENCES categories(id) ON DELETE SET NULL,
    destination_account_id  UUID                    REFERENCES accounts(id) ON DELETE SET NULL,
    recurring_id            UUID,
    installment_group_id    UUID,
    installment_number      SMALLINT,
    installment_total       SMALLINT,
    type                    transaction_type        NOT NULL,
    status                  transaction_status      NOT NULL DEFAULT 'completed',
    amount                  NUMERIC(15, 2)          NOT NULL,
    description             TEXT                    NOT NULL,
    notes                   TEXT,
    transaction_date        DATE                    NOT NULL DEFAULT CURRENT_DATE,
    competence_date         DATE,
    tags                    TEXT[]                  NOT NULL DEFAULT '{}',
    attachments             JSONB                   NOT NULL DEFAULT '[]',
    metadata                JSONB                   NOT NULL DEFAULT '{}',
    is_reconciled           BOOLEAN                 NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT transactions_amount_positive CHECK (amount > 0),
    CONSTRAINT transactions_description_not_empty CHECK (TRIM(description) <> ''),
    CONSTRAINT transactions_transfer_needs_destination CHECK (
        type <> 'transfer' OR destination_account_id IS NOT NULL
    ),
    CONSTRAINT transactions_installment_consistency CHECK (
        (installment_number IS NULL AND installment_total IS NULL AND installment_group_id IS NULL)
        OR
        (installment_number IS NOT NULL AND installment_total IS NOT NULL AND installment_group_id IS NOT NULL)
    ),
    CONSTRAINT transactions_installment_range CHECK (
        installment_number IS NULL OR (installment_number >= 1 AND installment_number <= installment_total)
    )
);

COMMENT ON TABLE transactions IS 'Todas as movimentações financeiras do usuário';
COMMENT ON COLUMN transactions.competence_date IS 'Data de competência contábil (pode diferir da transaction_date)';
COMMENT ON COLUMN transactions.installment_group_id IS 'UUID que agrupa todas as parcelas de uma mesma compra';
COMMENT ON COLUMN transactions.attachments IS 'Array de URLs de comprovantes/recibos';
COMMENT ON COLUMN transactions.is_reconciled IS 'Indica se foi conferido com extrato bancário';


-- -----------------------------------------------------------------------------
-- 3.6 installments
-- Controle detalhado de parcelamentos de cartão de crédito.
-- -----------------------------------------------------------------------------
CREATE TABLE installments (
    id              UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    credit_card_id  UUID                NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
    transaction_id  UUID                REFERENCES transactions(id) ON DELETE SET NULL,
    description     TEXT                NOT NULL,
    total_amount    NUMERIC(15, 2)      NOT NULL,
    installment_amount NUMERIC(15, 2)   NOT NULL,
    total_installments SMALLINT         NOT NULL,
    current_installment SMALLINT        NOT NULL DEFAULT 1,
    start_date      DATE                NOT NULL,
    next_due_date   DATE                NOT NULL,
    status          installment_status  NOT NULL DEFAULT 'pending',
    category_id     UUID                REFERENCES categories(id) ON DELETE SET NULL,
    notes           TEXT,
    metadata        JSONB               NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT installments_total_positive CHECK (total_amount > 0),
    CONSTRAINT installments_amount_positive CHECK (installment_amount > 0),
    CONSTRAINT installments_total_count CHECK (total_installments >= 1),
    CONSTRAINT installments_current_range CHECK (
        current_installment >= 1 AND current_installment <= total_installments
    )
);

COMMENT ON TABLE installments IS 'Parcelamentos de compras no cartão de crédito';


-- -----------------------------------------------------------------------------
-- 3.7 recurring_transactions
-- Receitas e despesas que se repetem automaticamente.
-- -----------------------------------------------------------------------------
CREATE TABLE recurring_transactions (
    id              UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID                    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id      UUID                    REFERENCES accounts(id) ON DELETE SET NULL,
    category_id     UUID                    REFERENCES categories(id) ON DELETE SET NULL,
    credit_card_id  UUID                    REFERENCES credit_cards(id) ON DELETE SET NULL,
    type            transaction_type        NOT NULL,
    amount          NUMERIC(15, 2)          NOT NULL,
    description     TEXT                    NOT NULL,
    frequency       recurrence_frequency    NOT NULL,
    start_date      DATE                    NOT NULL,
    end_date        DATE,
    next_date       DATE                    NOT NULL,
    last_generated  DATE,
    day_of_month    SMALLINT,
    day_of_week     SMALLINT,
    is_active       BOOLEAN                 NOT NULL DEFAULT TRUE,
    auto_create     BOOLEAN                 NOT NULL DEFAULT TRUE,
    advance_days    SMALLINT                NOT NULL DEFAULT 3,
    tags            TEXT[]                  NOT NULL DEFAULT '{}',
    notes           TEXT,
    metadata        JSONB                   NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT recurring_amount_positive CHECK (amount > 0),
    CONSTRAINT recurring_description_not_empty CHECK (TRIM(description) <> ''),
    CONSTRAINT recurring_end_after_start CHECK (end_date IS NULL OR end_date > start_date),
    CONSTRAINT recurring_day_of_month_range CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31),
    CONSTRAINT recurring_day_of_week_range CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6)
);

COMMENT ON TABLE recurring_transactions IS 'Modelo para geração automática de transações recorrentes';
COMMENT ON COLUMN recurring_transactions.advance_days IS 'Dias de antecedência para criar a transação futura';
COMMENT ON COLUMN recurring_transactions.auto_create IS 'Se TRUE, cria automaticamente via scheduled function';


-- -----------------------------------------------------------------------------
-- 3.8 budgets
-- Orçamentos por categoria e período.
-- -----------------------------------------------------------------------------
CREATE TABLE budgets (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category_id     UUID            REFERENCES categories(id) ON DELETE CASCADE,
    name            TEXT            NOT NULL,
    amount          NUMERIC(15, 2)  NOT NULL,
    spent           NUMERIC(15, 2)  NOT NULL DEFAULT 0,
    period          budget_period   NOT NULL DEFAULT 'monthly',
    start_date      DATE            NOT NULL,
    end_date        DATE,
    alert_threshold SMALLINT        NOT NULL DEFAULT 80,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    rollover        BOOLEAN         NOT NULL DEFAULT FALSE,
    notes           TEXT,
    metadata        JSONB           NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT budgets_amount_positive CHECK (amount > 0),
    CONSTRAINT budgets_spent_non_negative CHECK (spent >= 0),
    CONSTRAINT budgets_name_not_empty CHECK (TRIM(name) <> ''),
    CONSTRAINT budgets_threshold_range CHECK (alert_threshold BETWEEN 1 AND 100),
    CONSTRAINT budgets_end_after_start CHECK (end_date IS NULL OR end_date > start_date)
);

COMMENT ON TABLE budgets IS 'Orçamentos por categoria para controle de gastos';
COMMENT ON COLUMN budgets.spent IS 'Valor gasto calculado automaticamente via trigger';
COMMENT ON COLUMN budgets.alert_threshold IS 'Percentual (1-100) para disparar alerta de orçamento';
COMMENT ON COLUMN budgets.rollover IS 'Se saldo não utilizado passa para o próximo período';


-- -----------------------------------------------------------------------------
-- 3.9 goals
-- Metas financeiras com acompanhamento de progresso.
-- -----------------------------------------------------------------------------
CREATE TABLE goals (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id          UUID            REFERENCES accounts(id) ON DELETE SET NULL,
    name                TEXT            NOT NULL,
    description         TEXT,
    target_amount       NUMERIC(15, 2)  NOT NULL,
    current_amount      NUMERIC(15, 2)  NOT NULL DEFAULT 0,
    monthly_contribution NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deadline            DATE,
    status              goal_status     NOT NULL DEFAULT 'active',
    color               CHAR(7)         NOT NULL DEFAULT '#6366F1',
    icon                TEXT            NOT NULL DEFAULT 'target',
    priority            SMALLINT        NOT NULL DEFAULT 1,
    notes               TEXT,
    metadata            JSONB           NOT NULL DEFAULT '{}',
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT goals_target_positive CHECK (target_amount > 0),
    CONSTRAINT goals_current_non_negative CHECK (current_amount >= 0),
    CONSTRAINT goals_current_lte_target CHECK (current_amount <= target_amount),
    CONSTRAINT goals_name_not_empty CHECK (TRIM(name) <> ''),
    CONSTRAINT goals_priority_range CHECK (priority BETWEEN 1 AND 5)
);

COMMENT ON TABLE goals IS 'Metas financeiras com acompanhamento de progresso';
COMMENT ON COLUMN goals.monthly_contribution IS 'Valor sugerido de contribuição mensal para atingir a meta';


-- -----------------------------------------------------------------------------
-- 3.10 notifications
-- Sistema de notificações internas do aplicativo.
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id          UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID                    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type        notification_type       NOT NULL,
    status      notification_status     NOT NULL DEFAULT 'unread',
    title       TEXT                    NOT NULL,
    message     TEXT                    NOT NULL,
    action_url  TEXT,
    metadata    JSONB                   NOT NULL DEFAULT '{}',
    expires_at  TIMESTAMPTZ,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_title_not_empty CHECK (TRIM(title) <> ''),
    CONSTRAINT notifications_message_not_empty CHECK (TRIM(message) <> '')
);

COMMENT ON TABLE notifications IS 'Notificações e alertas para o usuário';


-- =============================================================================
-- SEÇÃO 4: ÍNDICES
-- =============================================================================

-- profiles
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;

-- accounts
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_user_active ON accounts(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_type ON accounts(type);

-- categories
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_system ON categories(is_system) WHERE is_system = TRUE;

-- transactions
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_credit_card_id ON transactions(credit_card_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_installment_group ON transactions(installment_group_id) WHERE installment_group_id IS NOT NULL;
CREATE INDEX idx_transactions_recurring_id ON transactions(recurring_id) WHERE recurring_id IS NOT NULL;
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_tags ON transactions USING GIN(tags);

-- credit_cards
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_account_id ON credit_cards(account_id);

-- installments
CREATE INDEX idx_installments_user_id ON installments(user_id);
CREATE INDEX idx_installments_credit_card_id ON installments(credit_card_id);
CREATE INDEX idx_installments_next_due ON installments(next_due_date) WHERE status = 'pending';
CREATE INDEX idx_installments_status ON installments(status);

-- recurring_transactions
CREATE INDEX idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_next_date ON recurring_transactions(next_date) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_recurring_account_id ON recurring_transactions(account_id);

-- budgets
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budgets_period ON budgets(user_id, period, start_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_budgets_active ON budgets(user_id, is_active) WHERE deleted_at IS NULL;

-- goals
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_deadline ON goals(deadline) WHERE status = 'active';

-- notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;


-- =============================================================================
-- SEÇÃO 5: FUNCTIONS E TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 Function: updated_at automático
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Aplica o trigger em todas as tabelas relevantes
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles', 'accounts', 'categories', 'transactions',
        'credit_cards', 'installments', 'recurring_transactions',
        'budgets', 'goals', 'notifications'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5.2 Function: criar perfil automaticamente ao registrar usuário
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();


-- -----------------------------------------------------------------------------
-- 5.3 Function: atualizar saldo da conta após transação
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta NUMERIC(15,2);
BEGIN
    -- DELETE: reverte o efeito da transação deletada
    IF TG_OP = 'DELETE' THEN
        IF OLD.deleted_at IS NULL THEN
            RETURN OLD;
        END IF;

        IF OLD.type = 'income' THEN
            UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'expense' THEN
            UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.destination_account_id;
        END IF;

        RETURN OLD;
    END IF;

    -- INSERT: aplica nova transação
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'completed' AND NEW.deleted_at IS NULL THEN
            IF NEW.type = 'income' THEN
                UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'expense' THEN
                UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'transfer' THEN
                UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
                UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.destination_account_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE: reverte antiga e aplica nova
    IF TG_OP = 'UPDATE' THEN
        -- Reverte o estado anterior se estava concluída e não deletada
        IF OLD.status = 'completed' AND OLD.deleted_at IS NULL THEN
            IF OLD.type = 'income' THEN
                UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
            ELSIF OLD.type = 'expense' THEN
                UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
            ELSIF OLD.type = 'transfer' THEN
                UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
                UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.destination_account_id;
            END IF;
        END IF;

        -- Aplica novo estado se está concluída e não deletada
        IF NEW.status = 'completed' AND NEW.deleted_at IS NULL THEN
            IF NEW.type = 'income' THEN
                UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'expense' THEN
                UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'transfer' THEN
                UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
                UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.destination_account_id;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_transactions_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_update_account_balance();


-- -----------------------------------------------------------------------------
-- 5.4 Function: atualizar limite disponível do cartão de crédito
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_credit_card_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'completed' AND NEW.deleted_at IS NULL AND NEW.credit_card_id IS NOT NULL THEN
        UPDATE credit_cards
        SET available_limit = available_limit - NEW.amount
        WHERE id = NEW.credit_card_id;

    ELSIF TG_OP = 'DELETE' AND OLD.status = 'completed' AND OLD.deleted_at IS NULL AND OLD.credit_card_id IS NOT NULL THEN
        UPDATE credit_cards
        SET available_limit = available_limit + OLD.amount
        WHERE id = OLD.credit_card_id;

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.credit_card_id IS NOT NULL AND OLD.status = 'completed' AND OLD.deleted_at IS NULL THEN
            UPDATE credit_cards
            SET available_limit = available_limit + OLD.amount
            WHERE id = OLD.credit_card_id;
        END IF;

        IF NEW.credit_card_id IS NOT NULL AND NEW.status = 'completed' AND NEW.deleted_at IS NULL THEN
            UPDATE credit_cards
            SET available_limit = available_limit - NEW.amount
            WHERE id = NEW.credit_card_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_transactions_card_limit
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_update_credit_card_limit();


-- -----------------------------------------------------------------------------
-- 5.5 Function: atualizar gasto do orçamento
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_update_budget_spent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id   UUID;
    v_cat_id    UUID;
    v_amount    NUMERIC(15,2);
    v_date      DATE;
BEGIN
    -- Determina os valores a processar para rollback/aplicação
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id; v_cat_id := OLD.category_id;
        v_amount  := -OLD.amount; v_date   := OLD.transaction_date;
    ELSIF TG_OP = 'INSERT' THEN
        v_user_id := NEW.user_id; v_cat_id := NEW.category_id;
        v_amount  := NEW.amount;  v_date   := NEW.transaction_date;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverte antigo
        IF OLD.type = 'expense' AND OLD.status = 'completed' AND OLD.deleted_at IS NULL AND OLD.category_id IS NOT NULL THEN
            UPDATE budgets
            SET spent = GREATEST(0, spent - OLD.amount)
            WHERE user_id = OLD.user_id
              AND (category_id = OLD.category_id OR category_id IS NULL)
              AND is_active = TRUE
              AND deleted_at IS NULL
              AND start_date <= OLD.transaction_date
              AND (end_date IS NULL OR end_date >= OLD.transaction_date);
        END IF;
        -- Aplica novo
        IF NEW.type = 'expense' AND NEW.status = 'completed' AND NEW.deleted_at IS NULL AND NEW.category_id IS NOT NULL THEN
            UPDATE budgets
            SET spent = spent + NEW.amount
            WHERE user_id = NEW.user_id
              AND (category_id = NEW.category_id OR category_id IS NULL)
              AND is_active = TRUE
              AND deleted_at IS NULL
              AND start_date <= NEW.transaction_date
              AND (end_date IS NULL OR end_date >= NEW.transaction_date);
        END IF;
        RETURN NEW;
    END IF;

    -- Para INSERT e DELETE de expense completed
    IF TG_OP = 'INSERT' AND NEW.type = 'expense' AND NEW.status = 'completed' AND NEW.deleted_at IS NULL AND v_cat_id IS NOT NULL THEN
        UPDATE budgets
        SET spent = spent + v_amount
        WHERE user_id = v_user_id
          AND (category_id = v_cat_id OR category_id IS NULL)
          AND is_active = TRUE
          AND deleted_at IS NULL
          AND start_date <= v_date
          AND (end_date IS NULL OR end_date >= v_date);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_transactions_budget
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_update_budget_spent();


-- -----------------------------------------------------------------------------
-- 5.6 Function: verificar meta atingida e criar notificação
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_goal_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.current_amount >= NEW.target_amount AND NEW.status = 'active' THEN
        NEW.status      := 'completed';
        NEW.completed_at := NOW();

        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
            NEW.user_id,
            'goal_reached',
            'Meta atingida!',
            format('Parabéns! Você atingiu sua meta "%s" de %s', NEW.name, NEW.target_amount),
            jsonb_build_object('goal_id', NEW.id, 'target_amount', NEW.target_amount)
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_goals_completion
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION fn_check_goal_completion();


-- -----------------------------------------------------------------------------
-- 5.7 Function: alerta de orçamento
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_budget_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_percent NUMERIC;
BEGIN
    IF NEW.amount > 0 THEN
        v_percent := (NEW.spent / NEW.amount) * 100;

        IF v_percent >= NEW.alert_threshold AND
           (OLD.spent / OLD.amount) * 100 < NEW.alert_threshold THEN
            INSERT INTO notifications (user_id, type, title, message, metadata)
            VALUES (
                NEW.user_id,
                'budget_alert',
                'Alerta de orçamento',
                format('Você utilizou %.0f%% do orçamento "%s"', v_percent, NEW.name),
                jsonb_build_object(
                    'budget_id', NEW.id,
                    'percent_used', v_percent,
                    'spent', NEW.spent,
                    'total', NEW.amount
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_budgets_alert
    AFTER UPDATE OF spent ON budgets
    FOR EACH ROW EXECUTE FUNCTION fn_check_budget_alert();


-- -----------------------------------------------------------------------------
-- 5.8 Function: calcular próxima data de recorrência
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_next_recurrence_date(
    p_current_date DATE,
    p_frequency    recurrence_frequency
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_frequency
        WHEN 'daily'      THEN p_current_date + INTERVAL '1 day'
        WHEN 'weekly'     THEN p_current_date + INTERVAL '7 days'
        WHEN 'biweekly'   THEN p_current_date + INTERVAL '14 days'
        WHEN 'monthly'    THEN p_current_date + INTERVAL '1 month'
        WHEN 'bimonthly'  THEN p_current_date + INTERVAL '2 months'
        WHEN 'quarterly'  THEN p_current_date + INTERVAL '3 months'
        WHEN 'semiannual' THEN p_current_date + INTERVAL '6 months'
        WHEN 'yearly'     THEN p_current_date + INTERVAL '1 year'
        ELSE p_current_date + INTERVAL '1 month'
    END;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5.9 Function: gerar transações recorrentes pendentes
-- Deve ser chamada por um cron job ou Edge Function diariamente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_generate_recurring_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec         RECORD;
    v_count     INTEGER := 0;
    v_new_id    UUID;
BEGIN
    FOR rec IN
        SELECT * FROM recurring_transactions
        WHERE is_active = TRUE
          AND deleted_at IS NULL
          AND next_date <= CURRENT_DATE + (advance_days * INTERVAL '1 day')
          AND (end_date IS NULL OR next_date <= end_date)
    LOOP
        INSERT INTO transactions (
            user_id, account_id, category_id, credit_card_id,
            recurring_id, type, status, amount, description,
            transaction_date, tags, metadata
        )
        VALUES (
            rec.user_id, rec.account_id, rec.category_id, rec.credit_card_id,
            rec.id, rec.type, 'scheduled', rec.amount, rec.description,
            rec.next_date, rec.tags,
            jsonb_build_object('generated_by', 'recurring', 'frequency', rec.frequency)
        )
        RETURNING id INTO v_new_id;

        -- Avança para a próxima data
        UPDATE recurring_transactions
        SET last_generated = rec.next_date,
            next_date = fn_next_recurrence_date(rec.next_date, rec.frequency)
        WHERE id = rec.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5.10 Function: resumo financeiro do mês
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_monthly_summary(
    p_user_id   UUID,
    p_year      INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    p_month     INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
    total_income    NUMERIC,
    total_expense   NUMERIC,
    net_balance     NUMERIC,
    transaction_count BIGINT,
    top_expense_category TEXT,
    savings_rate    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start DATE := make_date(p_year, p_month, 1);
    v_end   DATE := (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE;
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
        COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE -t.amount END), 0) AS net_balance,
        COUNT(*) AS transaction_count,
        (
            SELECT c.name
            FROM transactions tx
            JOIN categories c ON c.id = tx.category_id
            WHERE tx.user_id = p_user_id
              AND tx.type = 'expense'
              AND tx.status = 'completed'
              AND tx.deleted_at IS NULL
              AND tx.transaction_date BETWEEN v_start AND v_end
            GROUP BY c.name
            ORDER BY SUM(tx.amount) DESC
            LIMIT 1
        ) AS top_expense_category,
        CASE
            WHEN SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) > 0
            THEN ROUND(
                (SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) -
                 SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)) /
                SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) * 100,
                2
            )
            ELSE 0
        END AS savings_rate
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND t.type IN ('income', 'expense')
      AND t.status = 'completed'
      AND t.deleted_at IS NULL
      AND t.transaction_date BETWEEN v_start AND v_end;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5.11 Function: soft delete helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_soft_delete(
    p_table TEXT,
    p_id    UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows INTEGER;
BEGIN
    EXECUTE format(
        'UPDATE %I SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        p_table
    ) USING p_id, p_user_id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END;
$$;


-- =============================================================================
-- SEÇÃO 6: ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 6.1 profiles
-- -----------------------------------------------------------------------------
CREATE POLICY "profiles: leitura própria"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles: atualização própria"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: inserção via trigger"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);


-- -----------------------------------------------------------------------------
-- 6.2 accounts
-- -----------------------------------------------------------------------------
CREATE POLICY "accounts: acesso próprio"
    ON accounts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.3 categories
-- Usuário vê suas categorias + as do sistema (user_id IS NULL)
-- -----------------------------------------------------------------------------
CREATE POLICY "categories: leitura própria e sistema"
    ON categories FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "categories: escrita própria"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: atualização própria"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id AND is_system = FALSE)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "categories: delete própria"
    ON categories FOR DELETE
    USING (auth.uid() = user_id AND is_system = FALSE);


-- -----------------------------------------------------------------------------
-- 6.4 transactions
-- -----------------------------------------------------------------------------
CREATE POLICY "transactions: acesso próprio"
    ON transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.5 credit_cards
-- -----------------------------------------------------------------------------
CREATE POLICY "credit_cards: acesso próprio"
    ON credit_cards FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.6 installments
-- -----------------------------------------------------------------------------
CREATE POLICY "installments: acesso próprio"
    ON installments FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.7 recurring_transactions
-- -----------------------------------------------------------------------------
CREATE POLICY "recurring_transactions: acesso próprio"
    ON recurring_transactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.8 budgets
-- -----------------------------------------------------------------------------
CREATE POLICY "budgets: acesso próprio"
    ON budgets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.9 goals
-- -----------------------------------------------------------------------------
CREATE POLICY "goals: acesso próprio"
    ON goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6.10 notifications
-- -----------------------------------------------------------------------------
CREATE POLICY "notifications: leitura própria"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "notifications: atualização própria (marcar lida)"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications: delete própria"
    ON notifications FOR DELETE
    USING (auth.uid() = user_id);


-- =============================================================================
-- SEÇÃO 7: VIEWS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7.1 vw_account_summary
-- Resumo das contas com saldo total
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_account_summary AS
SELECT
    a.id,
    a.user_id,
    a.name,
    a.type,
    a.bank_name,
    a.balance,
    a.color,
    a.icon,
    a.is_active,
    a.include_in_sum,
    COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL)        AS transaction_count,
    SUM(t.amount) FILTER (WHERE t.type = 'income'
        AND t.status = 'completed'
        AND t.deleted_at IS NULL
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    )                                                       AS monthly_income,
    SUM(t.amount) FILTER (WHERE t.type = 'expense'
        AND t.status = 'completed'
        AND t.deleted_at IS NULL
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    )                                                       AS monthly_expense
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
WHERE a.deleted_at IS NULL
GROUP BY a.id;


-- -----------------------------------------------------------------------------
-- 7.2 vw_monthly_cash_flow
-- Fluxo de caixa mensal dos últimos 12 meses
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_monthly_cash_flow AS
SELECT
    t.user_id,
    DATE_TRUNC('month', t.transaction_date)::DATE   AS month,
    SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END)  AS total_income,
    SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END)  AS total_expense,
    SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE -t.amount END) AS net
FROM transactions t
WHERE t.type IN ('income', 'expense')
  AND t.status = 'completed'
  AND t.deleted_at IS NULL
  AND t.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY t.user_id, DATE_TRUNC('month', t.transaction_date)
ORDER BY month DESC;


-- -----------------------------------------------------------------------------
-- 7.3 vw_category_spending
-- Gastos por categoria no mês atual
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_category_spending AS
SELECT
    t.user_id,
    c.id                                            AS category_id,
    c.name                                          AS category_name,
    c.color,
    c.icon,
    DATE_TRUNC('month', t.transaction_date)::DATE   AS month,
    COUNT(t.id)                                     AS transaction_count,
    SUM(t.amount)                                   AS total_amount,
    AVG(t.amount)                                   AS avg_amount,
    MAX(t.amount)                                   AS max_amount
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.type = 'expense'
  AND t.status = 'completed'
  AND t.deleted_at IS NULL
GROUP BY t.user_id, c.id, c.name, c.color, c.icon, DATE_TRUNC('month', t.transaction_date);


-- -----------------------------------------------------------------------------
-- 7.4 vw_budget_progress
-- Progresso dos orçamentos ativos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_budget_progress AS
SELECT
    b.id,
    b.user_id,
    b.name,
    b.amount             AS budget_amount,
    b.spent,
    b.amount - b.spent   AS remaining,
    CASE
        WHEN b.amount > 0 THEN ROUND((b.spent / b.amount) * 100, 2)
        ELSE 0
    END                  AS percent_used,
    b.alert_threshold,
    CASE
        WHEN b.amount > 0 AND (b.spent / b.amount) * 100 >= 100 THEN 'exceeded'
        WHEN b.amount > 0 AND (b.spent / b.amount) * 100 >= b.alert_threshold THEN 'alert'
        ELSE 'ok'
    END                  AS alert_level,
    b.period,
    b.start_date,
    b.end_date,
    b.is_active,
    c.name               AS category_name,
    c.color              AS category_color,
    c.icon               AS category_icon,
    c.sort_order
FROM budgets b
LEFT JOIN categories c ON c.id = b.category_id
WHERE b.deleted_at IS NULL;


-- -----------------------------------------------------------------------------
-- 7.5 vw_goal_progress
-- Progresso das metas financeiras
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_goal_progress WITH (security_invoker) AS
SELECT
    g.id, g.user_id, g.name, g.description, g.target_amount, g.current_amount, g.deleted_at, g.priority, g.created_at,
    (g.target_amount - g.current_amount) AS remaining_amount,
    CASE WHEN g.target_amount > 0 THEN ROUND((g.current_amount / g.target_amount) * 100, 2) ELSE 0 END AS percent_complete,
    g.monthly_contribution, g.deadline,
    CASE WHEN g.deadline IS NOT NULL AND g.monthly_contribution > 0 THEN CEIL((g.target_amount - g.current_amount) / g.monthly_contribution) ELSE NULL END AS months_to_complete,
    g.status, g.color, g.icon, g.completed_at,
    a.name AS account_name
FROM goals g
LEFT JOIN accounts a ON a.id = g.account_id
WHERE g.deleted_at IS NULL;


-- -----------------------------------------------------------------------------
-- 7.6 vw_recent_transactions
-- Últimas 100 transações com dados de categoria e conta
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_recent_transactions AS
SELECT
    t.id,
    t.user_id,
    t.type,
    t.status,
    t.amount,
    t.description,
    t.transaction_date,
    t.tags,
    t.is_reconciled,
    t.installment_number,
    t.installment_total,
    a.name          AS account_name,
    a.color         AS account_color,
    c.name          AS category_name,
    c.color         AS category_color,
    c.icon          AS category_icon,
    cc.name         AS credit_card_name,
    da.name         AS destination_account_name,
    t.created_at
FROM transactions t
LEFT JOIN accounts    a  ON a.id  = t.account_id
LEFT JOIN categories  c  ON c.id  = t.category_id
LEFT JOIN credit_cards cc ON cc.id = t.credit_card_id
LEFT JOIN accounts    da ON da.id = t.destination_account_id
WHERE t.deleted_at IS NULL
ORDER BY t.transaction_date DESC, t.created_at DESC;


-- -----------------------------------------------------------------------------
-- 7.7 vw_credit_card_summary
-- Resumo dos cartões com uso do limite
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_credit_card_summary AS
SELECT
    cc.id,
    cc.user_id,
    cc.name,
    cc.brand,
    cc.last_four_digits,
    cc.credit_limit,
    cc.available_limit,
    cc.credit_limit - cc.available_limit    AS used_limit,
    CASE
        WHEN cc.credit_limit > 0
        THEN ROUND((cc.credit_limit - cc.available_limit) / cc.credit_limit * 100, 2)
        ELSE 0
    END                                     AS limit_usage_percent,
    cc.closing_day,
    cc.due_day,
    cc.color,
    cc.is_active,
    COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    )                                       AS current_month_transactions,
    COALESCE(SUM(t.amount) FILTER (WHERE t.deleted_at IS NULL
        AND t.status = 'completed'
        AND DATE_TRUNC('month', t.transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    ), 0)                                   AS current_month_spending
FROM credit_cards cc
LEFT JOIN transactions t ON t.credit_card_id = cc.id
WHERE cc.deleted_at IS NULL
GROUP BY cc.id;


-- =============================================================================
-- SEÇÃO 8: SEED DATA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8.1 Categorias do sistema (globais, is_system = TRUE)
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, user_id, name, type, color, icon, is_system, sort_order) VALUES
-- Receitas
(uuid_generate_v4(), NULL, 'Salário',           'income',  '#22C55E', 'briefcase',     TRUE, 1),
(uuid_generate_v4(), NULL, 'Freelance',          'income',  '#16A34A', 'laptop',        TRUE, 2),
(uuid_generate_v4(), NULL, 'Investimentos',      'income',  '#15803D', 'trending-up',   TRUE, 3),
(uuid_generate_v4(), NULL, 'Aluguel Recebido',   'income',  '#166534', 'home',          TRUE, 4),
(uuid_generate_v4(), NULL, 'Outros Rendimentos', 'income',  '#14532D', 'plus-circle',   TRUE, 5),

-- Despesas - Moradia
(uuid_generate_v4(), NULL, 'Moradia',            'expense', '#EF4444', 'home',          TRUE, 10),
(uuid_generate_v4(), NULL, 'Aluguel',            'expense', '#DC2626', 'key',           TRUE, 11),
(uuid_generate_v4(), NULL, 'Água',               'expense', '#B91C1C', 'droplets',      TRUE, 12),
(uuid_generate_v4(), NULL, 'Energia Elétrica',   'expense', '#991B1B', 'zap',           TRUE, 13),
(uuid_generate_v4(), NULL, 'Internet',           'expense', '#7F1D1D', 'wifi',          TRUE, 14),
(uuid_generate_v4(), NULL, 'Condomínio',         'expense', '#7F1D1D', 'building',      TRUE, 15),

-- Despesas - Alimentação
(uuid_generate_v4(), NULL, 'Alimentação',        'expense', '#F97316', 'utensils',      TRUE, 20),
(uuid_generate_v4(), NULL, 'Supermercado',       'expense', '#EA580C', 'shopping-cart', TRUE, 21),
(uuid_generate_v4(), NULL, 'Restaurante',        'expense', '#C2410C', 'chef-hat',      TRUE, 22),
(uuid_generate_v4(), NULL, 'Delivery',           'expense', '#9A3412', 'bike',          TRUE, 23),

-- Despesas - Transporte
(uuid_generate_v4(), NULL, 'Transporte',         'expense', '#EAB308', 'car',           TRUE, 30),
(uuid_generate_v4(), NULL, 'Combustível',        'expense', '#CA8A04', 'fuel',          TRUE, 31),
(uuid_generate_v4(), NULL, 'Transporte Público', 'expense', '#A16207', 'bus',           TRUE, 32),
(uuid_generate_v4(), NULL, 'Uber / 99',          'expense', '#854D0E', 'navigation',    TRUE, 33),
(uuid_generate_v4(), NULL, 'Manutenção Veículo', 'expense', '#713F12', 'wrench',        TRUE, 34),

-- Despesas - Saúde
(uuid_generate_v4(), NULL, 'Saúde',              'expense', '#EC4899', 'heart-pulse',   TRUE, 40),
(uuid_generate_v4(), NULL, 'Plano de Saúde',     'expense', '#DB2777', 'shield',        TRUE, 41),
(uuid_generate_v4(), NULL, 'Farmácia',           'expense', '#BE185D', 'pill',          TRUE, 42),
(uuid_generate_v4(), NULL, 'Consultas',          'expense', '#9D174D', 'stethoscope',   TRUE, 43),
(uuid_generate_v4(), NULL, 'Academia',           'expense', '#831843', 'dumbbell',      TRUE, 44),

-- Despesas - Educação
(uuid_generate_v4(), NULL, 'Educação',           'expense', '#8B5CF6', 'book-open',     TRUE, 50),
(uuid_generate_v4(), NULL, 'Faculdade / Curso',  'expense', '#7C3AED', 'graduation-cap',TRUE, 51),
(uuid_generate_v4(), NULL, 'Livros',             'expense', '#6D28D9', 'book',          TRUE, 52),

-- Despesas - Lazer
(uuid_generate_v4(), NULL, 'Lazer',              'expense', '#06B6D4', 'smile',         TRUE, 60),
(uuid_generate_v4(), NULL, 'Streaming',          'expense', '#0891B2', 'play-circle',   TRUE, 61),
(uuid_generate_v4(), NULL, 'Viagem',             'expense', '#0E7490', 'plane',         TRUE, 62),
(uuid_generate_v4(), NULL, 'Cinema / Teatro',    'expense', '#155E75', 'film',          TRUE, 63),

-- Despesas - Vestuário
(uuid_generate_v4(), NULL, 'Vestuário',          'expense', '#F59E0B', 'shirt',         TRUE, 70),
(uuid_generate_v4(), NULL, 'Roupas',             'expense', '#D97706', 'shopping-bag',  TRUE, 71),
(uuid_generate_v4(), NULL, 'Calçados',           'expense', '#B45309', 'footprints',    TRUE, 72),

-- Outros
(uuid_generate_v4(), NULL, 'Impostos',           'expense', '#6B7280', 'receipt',       TRUE, 80),
(uuid_generate_v4(), NULL, 'Seguros',            'expense', '#4B5563', 'shield-check',  TRUE, 81),
(uuid_generate_v4(), NULL, 'Transferência',      'both',    '#9CA3AF', 'arrow-left-right', TRUE, 90),
(uuid_generate_v4(), NULL, 'Outros',             'both',    '#D1D5DB', 'circle',        TRUE, 99);


-- =============================================================================
-- 3.11 notification_preferences - Preferências de notificações do usuário
-- =============================================================================

CREATE TABLE notification_preferences (
    id                  UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID                    NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    enabled             BOOLEAN                 NOT NULL DEFAULT TRUE,
    push_enabled        BOOLEAN                 NOT NULL DEFAULT TRUE,
    email_enabled       BOOLEAN                 NOT NULL DEFAULT FALSE,
    in_app_enabled      BOOLEAN                 NOT NULL DEFAULT TRUE,
    sound_enabled       BOOLEAN                 NOT NULL DEFAULT TRUE,
    silent_hours_start  TIME                    NOT NULL DEFAULT '22:00',
    silent_hours_end    TIME                    NOT NULL DEFAULT '07:00',
    max_per_day         INTEGER                 NOT NULL DEFAULT 20 CHECK (max_per_day >= 1 AND max_per_day <= 100),
    budget_alert        BOOLEAN                 NOT NULL DEFAULT TRUE,
    goal_reached        BOOLEAN                 NOT NULL DEFAULT TRUE,
    bill_due            BOOLEAN                 NOT NULL DEFAULT TRUE,
    large_expense       BOOLEAN                 NOT NULL DEFAULT TRUE,
    low_balance         BOOLEAN                 NOT NULL DEFAULT TRUE,
    recurring_created   BOOLEAN                 NOT NULL DEFAULT TRUE,
    installment_due     BOOLEAN                 NOT NULL DEFAULT TRUE,
    general_notif       BOOLEAN                 NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notification_preferences IS 'Preferências de notificações personalizadas por usuário';

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =============================================================================
-- 5.9 Function: fn_check_low_balance - Detectar saldo baixo em contas
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_check_low_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_threshold NUMERIC;
BEGIN
    -- Verifica se o saldo caiu abaixo de 100
    v_threshold := 100;
    
    IF NEW.balance < v_threshold AND OLD.balance >= v_threshold THEN
        INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
        VALUES (
            NEW.user_id,
            'low_balance',
            'Saldo Baixo',
            format('Sua conta "%s" está com saldo baixo: R$ %.2f', NEW.name, NEW.balance),
            jsonb_build_object(
                'account_id', NEW.id,
                'account_name', NEW.name,
                'balance', NEW.balance,
                'threshold', v_threshold
            ),
            '/accounts/' || NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accounts_low_balance
    AFTER UPDATE OF balance ON accounts
    FOR EACH ROW EXECUTE FUNCTION fn_check_low_balance();

-- =============================================================================
-- 5.10 Function: fn_check_large_expense - Detectar gastos acima da média
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_check_large_expense()
RETURNS TRIGGER AS $$
DECLARE
    v_average_expense   NUMERIC;
    v_threshold         NUMERIC := 1.5; -- 150% da média
BEGIN
    -- Calcula a média de gastos do mês anterior
    SELECT AVG(ABS(amount))
    INTO v_average_expense
    FROM transactions
    WHERE user_id = NEW.user_id
        AND type = 'expense'
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
    
    -- Se não há dados, usa 500 como padrão
    v_average_expense := COALESCE(v_average_expense, 500);
    
    -- Notifica se a despesa é 150% maior que a média
    IF NEW.type = 'expense' AND ABS(NEW.amount) > (v_average_expense * v_threshold) THEN
        INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
        VALUES (
            NEW.user_id,
            'large_expense',
            'Gasto Elevado',
            format('Você gastou R$ %.2f em "%s" - Superior à sua média de R$ %.2f', 
                   ABS(NEW.amount), NEW.description, v_average_expense),
            jsonb_build_object(
                'transaction_id', NEW.id,
                'amount', ABS(NEW.amount),
                'average', v_average_expense,
                'description', NEW.description
            ),
            '/transactions/' || NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transactions_large_expense
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_check_large_expense();

-- =============================================================================
-- 5.11 Function: fn_check_bill_due - Verificar contas a vencer
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_check_bill_due()
RETURNS TRIGGER AS $$
DECLARE
    v_days_until_due INTEGER;
BEGIN
    -- Calcula dias até o vencimento
    v_days_until_due := (NEW.next_due_date - CURRENT_DATE)::INTEGER;
    
    -- Notifica se vence nos próximos 3 dias
    IF v_days_until_due > 0 AND v_days_until_due <= 3 AND 
       (OLD.next_due_date IS NULL OR (OLD.next_due_date - CURRENT_DATE) > 3) THEN
        INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
        VALUES (
            NEW.user_id,
            'bill_due',
            format('Conta a Vencer em %d %s', v_days_until_due, CASE WHEN v_days_until_due = 1 THEN 'dia' ELSE 'dias' END),
            format('"%s" vence em %d %s - R$ %.2f', 
                   NEW.name, v_days_until_due, 
                   CASE WHEN v_days_until_due = 1 THEN 'dia' ELSE 'dias' END,
                   NEW.amount),
            jsonb_build_object(
                'recurring_id', NEW.id,
                'amount', NEW.amount,
                'due_date', NEW.next_due_date,
                'days_until_due', v_days_until_due
            ),
            '/transactions'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recurrings_bill_due
    AFTER UPDATE OF next_due_date ON recurrings
    FOR EACH ROW EXECUTE FUNCTION fn_check_bill_due();

-- =============================================================================
-- 5.12 Function: fn_notify_recurring_created - Notificar transação recorrente criada
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_notify_recurring_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
    VALUES (
        NEW.user_id,
        'recurring_created',
        'Transação Recorrente Criada',
        format('Nova transação recorrente "%s" de R$ %.2f criada', NEW.name, NEW.amount),
        jsonb_build_object(
            'recurring_id', NEW.id,
            'name', NEW.name,
            'amount', NEW.amount,
            'frequency', NEW.frequency
        ),
        '/transactions'
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recurrings_created
    AFTER INSERT ON recurrings
    FOR EACH ROW EXECUTE FUNCTION fn_notify_recurring_created();

-- =============================================================================
-- 5.13 Function: fn_check_installment_due - Verificar parcelas vencendo
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_check_installment_due()
RETURNS TRIGGER AS $$
DECLARE
    v_days_until_due INTEGER;
BEGIN
    -- Calcula dias até o vencimento
    v_days_until_due := (NEW.due_date - CURRENT_DATE)::INTEGER;
    
    -- Notifica se vence nos próximos 3 dias e ainda não foi notificada
    IF v_days_until_due > 0 AND v_days_until_due <= 3 AND 
       (OLD.due_date IS NULL OR (OLD.due_date - CURRENT_DATE) > 3) THEN
        INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
        VALUES (
            NEW.user_id,
            'installment_due',
            format('Parcela %d Vencendo em %d %s', NEW.installment_number, v_days_until_due, 
                   CASE WHEN v_days_until_due = 1 THEN 'dia' ELSE 'dias' END),
            format('Parcela %d/%d de R$ %.2f vence em %d %s',
                   NEW.installment_number, NEW.installment_total, NEW.amount,
                   v_days_until_due,
                   CASE WHEN v_days_until_due = 1 THEN 'dia' ELSE 'dias' END),
            jsonb_build_object(
                'transaction_id', NEW.id,
                'installment_number', NEW.installment_number,
                'installment_total', NEW.installment_total,
                'amount', NEW.amount,
                'due_date', NEW.due_date
            ),
            '/transactions/' || NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transactions_installment_due
    AFTER UPDATE OF due_date ON transactions
    FOR EACH ROW EXECUTE FUNCTION fn_check_installment_due();

-- =============================================================================
-- RLS: notification_preferences
-- =============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select"
    ON notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert"
    ON notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update"
    ON notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_delete"
    ON notification_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================================================
-- FIM DO SCRIPT
-- =============================================================================