-- Add immutability constraint for cost column
-- This trigger prevents any updates to the cost column after it has been set

-- Create a function that prevents cost updates
CREATE OR REPLACE FUNCTION prevent_cost_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow updates only if cost is not being changed
    -- IS DISTINCT FROM handles NULL comparisons correctly
    IF OLD.cost IS DISTINCT FROM NEW.cost THEN
        RAISE EXCEPTION 'cost is immutable and cannot be updated';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before any UPDATE on campaign_plans
CREATE TRIGGER enforce_cost_immutability
    BEFORE UPDATE ON campaign_plans
    FOR EACH ROW
    EXECUTE FUNCTION prevent_cost_update();

-- Add comment for documentation
COMMENT ON TRIGGER enforce_cost_immutability ON campaign_plans IS 
    'Prevents updates to the cost column to maintain immutability. This ensures cost data cannot be modified after initial creation, even through direct database access.';

COMMENT ON FUNCTION prevent_cost_update() IS 
    'Trigger function that enforces immutability of the cost column in campaign_plans table.';
