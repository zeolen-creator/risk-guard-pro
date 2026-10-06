-- Additional illustrative Monte Carlo templates for a new HIRA project.
-- These starting assumptions must be reviewed and replaced with local data.
INSERT INTO public.simulation_templates
  (hazard_category, hazard_name, region, template_name, description, default_parameters, source_notes)
VALUES
  ('Infrastructure', 'Power Outage', 'Ontario', 'Healthcare Facility - Ontario',
   'Illustrative interruption and recovery costs for an Ontario healthcare facility.',
   '{"frequency_distribution":{"type":"triangular","min":0.2,"mode":0.6,"max":1.5},"direct_cost_distribution":{"type":"triangular","min":25000,"mode":150000,"max":900000},"indirect_cost_distribution":{"type":"triangular","min":10000,"mode":100000,"max":750000},"downtime_distribution":{"type":"triangular","min":1,"mode":8,"max":48}}'::jsonb,
   'Illustrative assumptions only; replace with facility-specific outage history and recovery costs.'),
  ('Natural Disaster', 'Severe Winter Storm', 'Ontario', 'Healthcare Facility - Ontario Winter Storm',
   'Illustrative disruption and repair assumptions for a severe winter storm.',
   '{"frequency_distribution":{"type":"triangular","min":0.1,"mode":0.4,"max":1.2},"direct_cost_distribution":{"type":"triangular","min":20000,"mode":180000,"max":1500000},"indirect_cost_distribution":{"type":"triangular","min":15000,"mode":120000,"max":800000},"downtime_distribution":{"type":"triangular","min":1,"mode":5,"max":30}}'::jsonb,
   'Illustrative assumptions only; tailor to local weather history, facility vulnerability, and continuity plans.'),
  ('Natural Disaster', 'Extreme Heat', 'Ontario', 'Healthcare Facility - Ontario Extreme Heat',
   'Illustrative costs for an extreme-heat event affecting a healthcare facility.',
   '{"frequency_distribution":{"type":"triangular","min":0.1,"mode":0.5,"max":1.5},"direct_cost_distribution":{"type":"triangular","min":10000,"mode":90000,"max":600000},"indirect_cost_distribution":{"type":"triangular","min":10000,"mode":75000,"max":500000},"downtime_distribution":{"type":"triangular","min":0,"mode":2,"max":14}}'::jsonb,
   'Illustrative assumptions only; tailor to local climate, cooling resilience, and facility-specific operating data.'),
  ('Public Health', 'Infectious Disease Outbreak', 'Ontario', 'Healthcare Facility - Ontario Outbreak',
   'Illustrative staffing, infection-control, and service-disruption costs.',
   '{"frequency_distribution":{"type":"triangular","min":0.1,"mode":0.4,"max":1.2},"direct_cost_distribution":{"type":"triangular","min":25000,"mode":250000,"max":2000000},"indirect_cost_distribution":{"type":"triangular","min":50000,"mode":400000,"max":3000000},"downtime_distribution":{"type":"triangular","min":2,"mode":14,"max":90}}'::jsonb,
   'Illustrative assumptions only; tailor to local epidemiology, staffing, and infection-control costs.'),
  ('Environmental', 'Chemical Spill', 'Ontario', 'Healthcare Facility - Ontario Chemical Spill',
   'Illustrative response, cleanup, and service interruption costs.',
   '{"frequency_distribution":{"type":"triangular","min":0.02,"mode":0.1,"max":0.5},"direct_cost_distribution":{"type":"triangular","min":10000,"mode":100000,"max":1000000},"indirect_cost_distribution":{"type":"triangular","min":10000,"mode":80000,"max":700000},"downtime_distribution":{"type":"triangular","min":0,"mode":2,"max":21}}'::jsonb,
   'Illustrative assumptions only; tailor to hazardous materials inventories, response plans, and local costs.'),
  ('Operational', 'Critical Supply Disruption', 'Canada', 'Healthcare Supply Chain Disruption',
   'Illustrative costs for interruption to critical healthcare supplies.',
   '{"frequency_distribution":{"type":"triangular","min":0.1,"mode":0.5,"max":2},"direct_cost_distribution":{"type":"triangular","min":10000,"mode":150000,"max":1200000},"indirect_cost_distribution":{"type":"triangular","min":25000,"mode":200000,"max":1500000},"downtime_distribution":{"type":"triangular","min":1,"mode":7,"max":45}}'::jsonb,
   'Illustrative assumptions only; replace with organization-specific supplier and shortage data.'),
  ('Cybersecurity', 'Data Breach', 'Canada', 'Canadian Healthcare Data Breach',
   'Illustrative response, recovery, and operational costs for a healthcare data breach.',
   '{"frequency_distribution":{"type":"triangular","min":0.05,"mode":0.25,"max":0.8},"direct_cost_distribution":{"type":"triangular","min":100000,"mode":1000000,"max":6000000},"indirect_cost_distribution":{"type":"triangular","min":50000,"mode":750000,"max":5000000},"downtime_distribution":{"type":"triangular","min":1,"mode":10,"max":60}}'::jsonb,
   'Illustrative assumptions only; replace with current Canadian healthcare incident and recovery data.')
ON CONFLICT (hazard_category, hazard_name, region, template_name) DO NOTHING;
