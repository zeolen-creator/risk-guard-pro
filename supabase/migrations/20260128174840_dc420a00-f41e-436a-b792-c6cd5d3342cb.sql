-- Add columns to support multi-template Monte Carlo simulations
ALTER TABLE monte_carlo_simulations
ADD COLUMN IF NOT EXISTS template_ids TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS combination_method TEXT DEFAULT 'single',
ADD COLUMN IF NOT EXISTS scenario_count INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN monte_carlo_simulations.template_ids IS 'Array of template IDs used in multi-template simulations';
COMMENT ON COLUMN monte_carlo_simulations.combination_method IS 'Method used to combine templates: single, compound, additive, or weighted';
COMMENT ON COLUMN monte_carlo_simulations.scenario_count IS 'Number of scenarios/templates used in simulation';

-- Update existing records to have proper defaults
UPDATE monte_carlo_simulations
SET combination_method = 'single', scenario_count = 1
WHERE combination_method IS NULL;