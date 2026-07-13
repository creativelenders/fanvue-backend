BEGIN;

CREATE TABLE IF NOT EXISTS ppv_price_bandits (
    bandit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_tier VARCHAR(50) NOT NULL, -- e.g., 'Standard', 'VIP', 'Whale'
    price_point NUMERIC(5, 2) NOT NULL,    -- e.g., 14.99, 19.99, 24.99, 29.99
    impressions INT DEFAULT 0 NOT NULL,
    conversions INT DEFAULT 0 NOT NULL,
    total_revenue_usd NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(subscriber_tier, price_point)
);

-- Seed initial test arms for VIPs and Standards
INSERT INTO ppv_price_bandits (subscriber_tier, price_point) VALUES 
('Standard', 14.99), ('Standard', 19.99), ('Standard', 24.99), ('Standard', 29.99),
('VIP', 14.99), ('VIP', 19.99), ('VIP', 24.99), ('VIP', 29.99)
ON CONFLICT DO NOTHING;

COMMIT;
