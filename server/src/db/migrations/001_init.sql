-- migrations/001_init.sql

CREATE TABLE receipts (
    id            SERIAL PRIMARY KEY,
    store_name    VARCHAR(255) NOT NULL,
    purchase_date DATE NOT NULL,
    total_amount  NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    currency      CHAR(3) NOT NULL DEFAULT 'EUR',
    category      VARCHAR(50) NOT NULL CHECK (
        category IN ('Ruoka', 'Liikenne', 'Elektroniikka', 'Vapaa-aika', 'Muu')
    ),
    image_path    VARCHAR(500),          -- path to uploaded photo
    raw_ai_json   JSONB,                 -- raw AI response (for debugging)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE receipt_items (
    id         SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    name       VARCHAR(255) NOT NULL,
    quantity   NUMERIC(8, 3) NOT NULL DEFAULT 1,   -- e.g. 0.450 kg bananas
    price      NUMERIC(10, 2) NOT NULL CHECK (price >= 0)
);

-- Indexes for dashboard queries
CREATE INDEX idx_receipts_date     ON receipts(purchase_date);
CREATE INDEX idx_receipts_category ON receipts(category);
CREATE INDEX idx_items_receipt     ON receipt_items(receipt_id);
