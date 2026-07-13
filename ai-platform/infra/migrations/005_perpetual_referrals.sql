-- Migration: 005_perpetual_referrals.sql
BEGIN;

CREATE TABLE IF NOT EXISTS platform_pod_referrals (
    referral_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_subscriber_id UUID NOT NULL,
    new_user_id UUID NOT NULL UNIQUE,
    royalty_percentage NUMERIC(4, 3) DEFAULT 0.010 NOT NULL, -- 1% perpetual
    total_volume_generated_usd NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    total_royalties_paid_usdc NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_referrer_tracking ON platform_pod_referrals(referrer_subscriber_id);

COMMIT;
