-- ============================================
-- Populate Battery Grades from Training Module V5
-- ============================================

-- ============================================
-- 7.1 AUTO LEAD-ACID (12V)
-- ============================================

-- Update spec_json
UPDATE public.grades SET spec_json = '{
  "Grade Name": "Auto Lead-Acid (12V)",
  "Purchasing Grade": "AUTO BATTERIES",
  "Typical Weight": "11–27 kg",
  "Key Hazard": "Sulphuric acid burn",
  "Purchased By": "Weight — heavier = more lead = more value",
  "Preferred Condition": "Drained batteries preferred — lower hazard, lower shipping cost",
  "Required Condition": "Pb marking visible, complete batteries only, standing upright, kept apart from other scrap metal",
  "Chemistry": "Six lead-oxide cells in diluted sulphuric acid, connected in series to produce 12 volts",
  "Identification": "Look for Pb symbol stamped on battery — confirms lead-acid and recyclable"
}'::jsonb WHERE slug = 'auto-lead-acid-12v';

-- Field tips for Auto 12V
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Check the Pb stamp',
  'Confirms it''s lead-acid and recyclable. No Pb = investigate further before buying. If no Pb stamp and unknown chemistry, refuse at gate.', 1
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Buy by weight',
  'Batteries are purchased based on their weight. Heavier = more lead = more value. Drained batteries are preferred — lower hazard, lower shipping cost.', 2
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'test', 'Check the case condition',
  'Ensure the battery hasn''t been opened or damaged. A cracked case means acid spill risk. Check for swelling (bulging sides) which indicates hydrogen gas buildup — risk of rupture or explosion.', 3
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Acid spill = immediate action',
  'If any battery leaks acid, place it in a leak-proof plastic bin with kitty litter or acid absorbent material, label it HAZARDOUS, and notify your supervisor at once. Do not touch the spill — acid burns skin, eyes, and metal. Wear PPE: gloves, eye protection, and an apron.', 4
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Lead is toxic — always wear PPE',
  'Lead is a toxic metal. Inhalation of lead dust or direct contact causes nerve damage, anaemia, kidney failure, and brain damage. Always wear nitrile gloves and wash hands thoroughly after handling. Never eat or drink while handling batteries.', 5
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'info', 'Common examples',
  'Car starter batteries, truck and HV batteries, motorcycle batteries, small engine batteries, agricultural / machine batteries.', 6
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

-- Products for Auto 12V — rejects/downgrades
INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'No Pb marking / unknown chemistry', 'Could be lithium, NiCad, or NiMH — all unacceptable. REJECT. Do not accept unidentified batteries.',
  ARRAY['unknown battery', 'no pb', 'unidentified battery'], 1
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'Active leak or visible acid', 'Immediate hazard to skin, eyes, and metal surfaces. REJECT. Contain in bin with absorbent. Notify supervisor.',
  ARRAY['leaking battery', 'acid leak', 'spill'], 2
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'Cracked or split case', 'Acid will leak and contaminate the yard; burn injury risk. REJECT. Place in HAZMAT bin with absorbent material.',
  ARRAY['cracked battery', 'split case', 'damaged battery'], 3
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'Swollen case (bulging sides)', 'Hydrogen gas buildup inside; risk of rupture or explosion. REJECT immediately. Do not touch. Use HAZMAT protocols.',
  ARRAY['swollen battery', 'bulging battery', 'expanded battery'], 4
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

-- ============================================
-- 7.2 OTHER LEAD-ACID (24-48V)
-- ============================================

UPDATE public.grades SET spec_json = '{
  "Grade Name": "Other Lead-Acid (24–48V)",
  "Purchasing Grade": "OTHER BATTERIES",
  "Typical Weight": "5–225 kg",
  "Key Hazard": "Acid + heavy weight",
  "Purchased By": "Weight",
  "Types Included": "Deep cycle, gel cell, AGM, alarm/security, UPS, marine, golf cart, forklift (plastic cased)",
  "Identification": "Look for Pb symbol. Voltage ratings 6V, 24V, 36V, or 48V. Heavier than auto batteries.",
  "Special Note": "Forklift batteries must be stripped of steel casing before acceptance. Steel-cased units are a separate grade."
}'::jsonb WHERE slug = 'other-lead-acid-24-48v';

-- Field tips for Other LA
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'All lead-acid types accepted',
  'This grade covers all non-automotive lead-acid batteries: deep cycle, gel cell, AGM, alarm/security, UPS, marine, golf cart, and plastic-cased forklift batteries. All must have Pb stamp or confirmed lead-acid chemistry.', 1
FROM public.grades g WHERE g.slug = 'other-lead-acid-24-48v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Heavy weight hazard',
  'These batteries can weigh up to 225 kg (forklift units). Use mechanical handling for anything over 25 kg. Two-person lift minimum for medium units. Back injuries are common with battery handling.', 2
FROM public.grades g WHERE g.slug = 'other-lead-acid-24-48v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Forklift batteries — strip steel casing',
  'Forklift batteries must be stripped of their steel casing before we accept them. We should not be buying forklift batteries with the steel casing attached. Steel-cased units are priced under the Steel-Cased Lead-Acid grade.', 3
FROM public.grades g WHERE g.slug = 'other-lead-acid-24-48v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Same acid hazards as auto batteries',
  'All lead-acid batteries contain sulphuric acid. Same PPE and handling rules apply: nitrile gloves, safety glasses, apron. If leaking, contain with absorbent and notify supervisor.', 4
FROM public.grades g WHERE g.slug = 'other-lead-acid-24-48v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'info', 'Common examples',
  'Deep cycle (caravans, boats, solar), gel cell / AGM (sealed maintenance-free), alarm and security system batteries, UPS and data centre batteries, marine batteries, golf cart batteries, plastic-cased forklift batteries.', 5
FROM public.grades g WHERE g.slug = 'other-lead-acid-24-48v';

-- ============================================
-- 7.3 STEEL-CASED LEAD-ACID
-- ============================================

UPDATE public.grades SET spec_json = '{
  "Grade Name": "Steel-Cased Lead-Acid",
  "Purchasing Grade": "OTHER BATTERIES",
  "Typical Weight": "27–135 kg",
  "Key Hazard": "Acid + steel casing",
  "Purchased By": "Weight — steel casing is a weight penalty",
  "Price Impact": "Lower than plastic-cased due to steel weight deduction. The steel casing adds dead weight that has no lead value.",
  "Identification": "Metal outer casing instead of plastic. Usually industrial/forklift origin. Very heavy.",
  "Special Note": "Priced differently from plastic-cased batteries due to the steel weight penalty."
}'::jsonb WHERE slug = 'steel-cased-lead-acid';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Steel casing = weight penalty',
  'Steel-cased batteries are priced lower than plastic-cased because the steel casing adds dead weight with no lead value. The buyer deducts steel weight from the total. Always grade these separately from plastic-cased units.', 1
FROM public.grades g WHERE g.slug = 'steel-cased-lead-acid';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Extreme weight — use mechanical handling',
  'Steel-cased batteries weigh 27–135 kg. Never attempt to lift manually. Use forklift or pallet jack. Dropping a steel-cased battery can crack the internal cells and cause acid spill.', 2
FROM public.grades g WHERE g.slug = 'steel-cased-lead-acid';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'info', 'Common examples',
  'Industrial forklift batteries (steel cased), large UPS systems with metal housings, industrial standby power units.', 3
FROM public.grades g WHERE g.slug = 'steel-cased-lead-acid';

-- ============================================
-- 7.4 LITHIUM-ION BATTERIES (Unacceptable)
-- ============================================

UPDATE public.grades SET spec_json = '{
  "Grade Name": "Lithium-Ion Batteries",
  "Purchasing Grade": "DO NOT BUY",
  "Status": "REJECT AT GATE — NO EXCEPTIONS",
  "Key Hazard": "Thermal runaway — fire and explosion risk",
  "Thermal Runaway Temperature": "600°C+",
  "Fire Behaviour": "Fire reignites hours later. Cannot be extinguished by water or foam. One battery can ignite an entire yard.",
  "Action If Found": "Isolate immediately. Do not stack, compress, puncture, or expose to heat. Place in fireproof container away from other materials. Notify supervisor. Arrange certified disposal."
}'::jsonb,
dispute_flag = true
WHERE slug = 'lithium-ion-batteries';

-- Delete existing tip and re-insert with complete info
DELETE FROM public.field_tips WHERE grade_id = (SELECT id FROM public.grades WHERE slug = 'lithium-ion-batteries');

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'REJECT — Fire and explosion risk',
  'Lithium-ion batteries are an absolute REJECT at Endless. Thermal runaway at 600°C+. Fire reignites hours later. Cannot be extinguished by water or foam. One battery can ignite an entire yard. REFUSE AT GATE — NO EXCEPTIONS.', 1
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'If found in the yard',
  'Isolate immediately. Do not stack, compress, puncture, or expose to heat. Place in a fireproof container away from other materials. Notify your supervisor. Arrange certified disposal. Never attempt to process.', 2
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Your job: check every battery at the gate',
  'Look for the Pb stamp. If it''s not there, it doesn''t come in. No Pb stamp and unknown chemistry = refuse until positively identified as lead-acid.', 3
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

-- Banned battery types as products (for searchability)
INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'Laptop / phone / tablet batteries', 'All lithium-ion. REFUSE AT GATE. Advise customer to use council e-waste drop-off.',
  ARRAY['laptop battery', 'phone battery', 'tablet battery', 'iphone', 'samsung', 'macbook'], 1
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'Power tool battery packs', 'All modern power tool batteries are lithium-ion. REFUSE AT GATE. No exceptions.',
  ARRAY['power tool battery', 'drill battery', 'makita', 'dewalt', 'milwaukee', 'ryobi', 'bosch'], 2
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'E-bike / e-scooter batteries', 'Lithium-ion. High energy density. REFUSE AT GATE. Advise council e-waste drop-off.',
  ARRAY['e-bike battery', 'ebike', 'e-scooter', 'electric bike', 'electric scooter'], 3
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'EV / hybrid battery modules', 'Lithium-ion. Extremely high energy. Extreme fire risk. REFUSE AT GATE. Customer must contact certified EV recycler.',
  ARRAY['ev battery', 'hybrid battery', 'tesla battery', 'electric vehicle', 'prius'], 4
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'NiCad batteries', 'Contains cadmium — Group 1 carcinogen. Causes kidney damage, bone disease, and cancer. Requires hazmat handling. REFUSE AT GATE. Advise council drop-off.',
  ARRAY['nicad', 'nickel cadmium', 'ni-cad', 'nicd'], 5
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'NiMH batteries', 'Contains potassium hydroxide — strong alkali causing chemical burns. Reacts violently with some metals. REFUSE AT GATE. Advise council drop-off.',
  ARRAY['nimh', 'nickel metal hydride', 'ni-mh', 'rechargeable aa'], 6
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

INSERT INTO public.products (grade_id, name, description, search_terms, sort_order)
SELECT g.id, 'AA / AAA / C / D / 9V household batteries', 'No scrap lead value. Alkaline, NiCad, NiMH, or lithium. REFUSE. Advise council battery recycling bin.',
  ARRAY['aa battery', 'aaa battery', '9v battery', 'duracell', 'energizer', 'household battery'], 7
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

-- ============================================
-- PACKING FIELD TIPS (applies to all battery grades)
-- Add to Auto 12V as the primary reference
-- ============================================

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Packing for export — stacking order',
  'Stack batteries in layers with corrugated cardboard between each row. Bottom to top: wooden pallet → cardboard sheet → first row upright (terminals up) → cardboard → second row → cardboard → final row. Wrap with clear stretch wrap (3–4 times around). Strap securely — batteries must not shift during transport.', 7
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Never mix battery types on a pallet',
  'Pack by battery type — never mix. Auto batteries together, alarm batteries separate (with cardboard between each unit to prevent terminal contact), deep cycle/gel on their own pallet, forklift batteries individually due to size and weight.', 8
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Always store and pack upright',
  'Keep batteries upright at all times. Do not tip on side or upside down. Do not store in barrels, drums, or bins. Place carefully — never throw or drop. Use wooden pallets only (plastic crack under weight).', 9
FROM public.grades g WHERE g.slug = 'auto-lead-acid-12v';
