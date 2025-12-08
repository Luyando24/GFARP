-- Update Free Plan player limit to 3
UPDATE subscription_plans 
SET 
    player_limit = 3,
    features = jsonb_set(
        features::jsonb, 
        '{0}', 
        '"Up to 3 players"'
    )
WHERE name = 'Free Plan' OR is_free = true;
