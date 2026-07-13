BEGIN;

CREATE TYPE content_exploration_state AS ENUM ('exploring', 'exploiting', 'retired');

CREATE TABLE IF NOT EXISTS platform_content_ranking (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL,
    comfyui_job_id VARCHAR(255),
    elo_rating NUMERIC(10, 2) DEFAULT 1200.00 NOT NULL,
    total_matches INT DEFAULT 0 NOT NULL,
    wins INT DEFAULT 0 NOT NULL,
    losses INT DEFAULT 0 NOT NULL,
    state content_exploration_state DEFAULT 'exploring' NOT NULL,
    exploration_budget INT DEFAULT 100 NOT NULL,
    impressions INT DEFAULT 0 NOT NULL,
    positive_swipes INT DEFAULT 0 NOT NULL,
    negative_swipes INT DEFAULT 0 NOT NULL,
    total_dwell_time_ms BIGINT DEFAULT 0 NOT NULL,
    empirical_reward_mean NUMERIC(5, 4) DEFAULT 0.0000 NOT NULL,
    upper_confidence_bound NUMERIC(8, 4) DEFAULT 1.0000 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS community_rating_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_subscriber_id UUID NOT NULL,
    target_asset_id UUID NOT NULL REFERENCES platform_content_ranking(asset_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    dwell_time_ms INT NOT NULL,
    is_positive_signal BOOLEAN NOT NULL,
    pre_event_elo NUMERIC(10, 2) NOT NULL,
    post_event_elo NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_ranking_state_budget ON platform_content_ranking(state, exploration_budget) WHERE state = 'exploring';
CREATE INDEX idx_ranking_elo_sort ON platform_content_ranking(elo_rating DESC) WHERE state = 'exploiting';
CREATE INDEX idx_rating_events_target ON community_rating_events(target_asset_id);

CREATE OR REPLACE FUNCTION update_ranking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_ranking_timestamp
    BEFORE UPDATE ON platform_content_ranking
    FOR EACH ROW
    EXECUTE FUNCTION update_ranking_timestamp();

COMMIT;
