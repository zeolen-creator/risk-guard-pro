-- Baseline shared HIRA taxonomy for a fresh project. These are reference categories,
-- not scored findings; organizations can tailor their assessment selections.
INSERT INTO public.consequences (category, category_number, description) VALUES
  ('Fatalities', 1, 'Death and life-threatening harm resulting from a hazard.'),
  ('Injuries/Illness', 2, 'Physical injury, acute illness, or chronic health effects.'),
  ('Displacement', 3, 'People displaced or separated from homes, services, or workplaces.'),
  ('Psychosocial', 4, 'Mental health, stress, trauma, and community wellbeing effects.'),
  ('Support Systems', 5, 'Disruption to essential care, social support, and protective services.'),
  ('Property Damage', 6, 'Damage to buildings, equipment, supplies, and personal property.'),
  ('Infrastructure', 7, 'Interruption or damage to utilities, transport, communications, or facilities.'),
  ('Environmental', 8, 'Harm to air, water, land, ecosystems, or environmental health.'),
  ('Economic', 9, 'Direct costs, lost income, service interruption, or recovery costs.'),
  ('Reputational', 10, 'Loss of public trust, confidence, or stakeholder relationships.');
INSERT INTO public.hazards (category, category_number, description, hazards_list, tags) VALUES
  ('Natural Hazards', 1, 'Natural events that can affect people, facilities, and services.', '["Earthquake","Flood","Severe storm","Extreme heat or cold","Wildfire","Drought","Landslide","Severe winter weather"]'::jsonb, ARRAY['natural','weather','geological']),
  ('Biological Hazards', 2, 'Infectious disease and biological exposure risks.', '["Communicable disease outbreak","Pandemic","Foodborne illness","Waterborne illness","Healthcare-associated infection","Biological exposure"]'::jsonb, ARRAY['biological','health','infection']),
  ('Infrastructure and Utility Hazards', 3, 'Failure or disruption of essential systems and facilities.', '["Power outage","Water supply failure","Heating or cooling failure","Telecommunications outage","Building system failure","Transportation disruption"]'::jsonb, ARRAY['infrastructure','utilities','operations']),
  ('Technology and Cybersecurity Hazards', 4, 'Technology, information security, and equipment failure risks.', '["Cyberattack or ransomware","Data breach","Critical equipment failure","IT system outage","Loss of electronic records","Medical device or control system failure"]'::jsonb, ARRAY['technology','cybersecurity','equipment']),
  ('Human and Security Hazards', 5, 'Intentional or accidental human-caused threats.', '["Workplace violence or aggression","Unauthorized access","Theft or vandalism","Missing or abducted person","Insider threat","Crowd disturbance"]'::jsonb, ARRAY['security','people','safety']),
  ('Hazardous Materials and Environmental Hazards', 6, 'Exposure to hazardous substances or environmental contamination.', '["Chemical spill or release","Hazardous material exposure","Air quality incident","Water contamination","Radiological exposure","Medical or hazardous waste incident"]'::jsonb, ARRAY['environmental','chemical','exposure']),
  ('Operational and Supply Hazards', 7, 'Disruptions to staffing, suppliers, and continuity of operations.', '["Staffing shortage","Supplier or supply chain failure","Medication or critical supply shortage","Fire or smoke incident","Food service interruption","Emergency evacuation"]'::jsonb, ARRAY['operations','continuity','supply']),
  ('Regulatory and Financial Hazards', 8, 'Compliance, funding, and financial risks that may disrupt services.', '["Regulatory non-compliance","Privacy or confidentiality breach","Funding interruption","Fraud or financial loss","Contractor or partner failure","Insurance or liability exposure"]'::jsonb, ARRAY['compliance','financial','governance']);
