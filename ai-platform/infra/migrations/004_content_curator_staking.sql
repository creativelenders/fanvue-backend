-- Migration: 004_content_curator_staking.sql
BEGIN;

CREATE TABLE IF NOT EXISTS content_curator_stakes (
    stake_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES platform_content_ranking(asset_id) ON DELETE CASCADE,
    staker_subscriber_id UUID NOT NULL,
    
    staked_amount_usdc NUMERIC(10, 2) NOT NULL,
    entry_elo_rating NUMERIC(10, 2) NOT NULL,
    
    -- Status: 'active_exploration', 'won_bounty', 'lost_stake'
    stake_status VARCHAR(50) DEFAULT 'active_exploration' NOT NULL,
    payout_amount_usdc NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_curator_stakes_asset ON content_curator_stakes(asset_id) WHERE stake_status = 'active_exploration';

COMMIT;
