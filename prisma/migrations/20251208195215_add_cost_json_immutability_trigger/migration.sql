-- Add immutability constraint for cost_json column
-- This trigger prevents any updates to the cost_json column after it has been set

-- Create a function that prevents cost_json updates
CREATE OR REPLACE FUNCTION prevent_cost_json_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates only if cost_json is not being changed
    -- IS DISTINCT FROM handles NULL comparisons correctly
    IF OLD.cost_json IS DISTINCT FROM NEW.cost_json THEN
        RAISE EXCEPTION 'cost_json is immutable and cannot be updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before any UPDATE on campaign_plans
CREATE TRIGGER enforce_cost_json_immutability
    BEFORE UPDATE ON campaign_plans
    FOR EACH ROW
    EXECUTE FUNCTION prevent_cost_json_update();

-- Add comment for documentation
COMMENT ON TRIGGER enforce_cost_json_immutability ON campaign_plans IS 
    'Prevents updates to the cost_json column to maintain immutability. This ensures cost data cannot be modified after initial creation, even through direct database access.';

COMMENT ON FUNCTION prevent_cost_json_update() IS 
    'Trigger function that enforces immutability of the cost_json column in campaign_plans table.';
