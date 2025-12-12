-- Update Free Plan player limit to 3
UPDATE subscription_plans 
SET player_limit = 3 
WHERE name = 'Free Plan';
