-- Update Free Plan player limit to 1
UPDATE subscription_plans 
SET player_limit = 1 
WHERE name = 'Free Plan';
