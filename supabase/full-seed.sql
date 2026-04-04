-- ============================================
-- Full Seed from Master Index v3.0
-- ============================================

-- Add introduction column to commodities
ALTER TABLE public.commodities ADD COLUMN IF NOT EXISTS introduction text;

-- Clear existing seed data (order matters for FK constraints)
DELETE FROM public.field_tips;
DELETE FROM public.products;
DELETE FROM public.grades;
DELETE FROM public.commodities;

-- ============================================
-- 1. COMMODITIES (10 sections)
-- ============================================

INSERT INTO public.commodities (name, slug, sort_order, introduction) VALUES
('Ferrous Steel', 'ferrous-steel', 1,
 'Ferrous metals contain iron and are magnetic. They include heavy melt steel (HMS), cast iron, plate & structural, and light gauge materials. Ferrous is the highest-volume commodity we handle, used primarily in steelmaking via electric arc furnaces. Grading accuracy is critical — contamination with non-ferrous metals, concrete, or dirt reduces value and can result in rejected shipments.'),

('Copper', 'copper', 2,
 'Copper is one of the most valuable non-ferrous metals we buy, prized for its electrical and thermal conductivity. Used in wiring, plumbing, motors, and heat exchangers. Scrap copper is graded by purity — Bright & Shiny commands the highest price. Insulated wire is graded by copper recovery rate after chopping. Always check for tin/solder contamination and separate radiator types.'),

('Brass', 'brass', 3,
 'Brass is a copper-zinc alloy, typically 60-70% copper and 30-40% zinc, with a distinctive yellow colour. Used in plumbing fittings, valves, ammunition casings, and decorative items. Gunmetal is a copper-tin-zinc alloy used in marine and industrial applications. Bronze is copper-tin. All brass grades are non-magnetic — always use a magnet test. Never mix with aluminium or zinc.'),

('Aluminium', 'aluminium', 4,
 'Aluminium is lightweight, corrosion-resistant, and highly recyclable — recycling uses only 5% of the energy needed for primary production. Common sources include extrusions (window frames, scaffolding), cast components (engine blocks, wheels), beverage cans, and sheet/plate. Grading depends on alloy, cleanliness, and form. Always check for thermal break (rubber inserts in extrusion) and irony contamination.'),

('Stainless Steel', 'stainless-steel', 5,
 'Stainless steel is an iron-based alloy containing at least 10.5% chromium, giving it corrosion resistance. The most common grades are 304 (18% Cr, 8% Ni — non-magnetic) and 316 (18% Cr, 8% Ni, 2-3% Mo — premium, used in marine/chemical). Correct identification using XRF or chemical testing is critical — the price difference between 304 and 316 is significant. Magnetic response varies by grade and cannot be relied on alone.'),

('Lead', 'lead', 6,
 'Lead is a dense, soft, malleable metal with a low melting point (327°C). It is toxic — always wear gloves and wash hands after handling. Primary sources include roofing/flashing, wheel weights, cable sheathing, and old pipes. Graded by purity — Grade A soft lead (99%+ pure) commands the best price. Irony lead contains 20-40% steel contamination. Never mix with zinc — they look similar but values are very different.'),

('Batteries', 'batteries', 7,
 'Lead-acid batteries are a significant source of recyclable lead. Auto batteries (12V) are the most common. They contain lead plates, sulphuric acid, and polypropylene casings — all recyclable. Steel-cased batteries (industrial/forklift) are priced differently due to the steel weight penalty. Lithium-ion batteries are a REJECT at Endless — fire and explosion risk. Never puncture, crush, or stack batteries on their side.'),

('Motors & Electrical', 'motors-electrical', 8,
 'Electric motors contain valuable copper or aluminium windings inside a steel casing. Value depends on winding type (copper vs aluminium), motor size, and whether dismantled. Starters and alternators from vehicles contain copper windings. Fridge compressor motors are sealed units bought whole. Transformers may contain PCBs (pre-1980) — hazardous, do not dismantle. Ballasts are small sealed electrical units, also a PCB risk pre-1980.'),

('Catalytic Converters & PGM', 'catalytic-converters-pgm', 9,
 'Catalytic converters contain platinum group metals (PGM) — platinum, palladium, and rhodium — which are among the most valuable elements on earth. Cats are priced by assay, not by weight alone. Full cats, half cats, and quarter cats are graded by substrate size. DPF (diesel particulate filter) units have a different substrate and must be kept separate from cats. Always handle cats carefully to avoid damaging the honeycomb.'),

('Specialty & High-Value', 'specialty-high-value', 10,
 'This section covers specialty and high-value items that don''t fit neatly into other categories. Titanium is used in aerospace and medical applications and commands very high prices — always verify with XRF. Clean zinc is used in galvanising and die-casting. Whiteware and AC units must be certified de-gassed before processing. E-waste (phones, laptops, circuit boards) is a growing category requiring specialist handling.');

-- ============================================
-- 2. GRADES — Ferrous Steel
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'HMS In-Size', 'hms-in-size', 1
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'HMS Oversize', 'hms-oversize', 2
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Plate & Structural (P&S)', 'plate-structural', 3
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Rebar', 'rebar', 4
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Steel Swarf', 'steel-swarf', 5
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'LMS Bales', 'lms-bales', 6
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Cast Iron', 'cast-iron', 7
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Light Gauge Clean', 'light-gauge-clean', 8
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Light Gauge Dirty', 'light-gauge-dirty', 9
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Vehicle Panels', 'vehicle-panels', 10
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Shredded Steel', 'shredded-steel', 11
FROM public.commodities c WHERE c.slug = 'ferrous-steel';

-- ============================================
-- 3. GRADES — Copper
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Bright & Shiny', 'bright-shiny', 1
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, '#1 Copper', '1-copper', 2
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, '#2 Copper', '2-copper', 3
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Copper Domestic (mixed household)', 'copper-domestic', 4
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Copper Granules', 'copper-granules', 5
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'PVC Copper Cable 80%', 'pvc-copper-cable-80', 6
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'PVC Copper Cable 65%', 'pvc-copper-cable-65', 7
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'PVC Copper Cable 42%', 'pvc-copper-cable-42', 8
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'PVC Copper Cable 30%', 'pvc-copper-cable-30', 9
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'PVC Copper Cable with Plugs', 'pvc-copper-cable-plugs', 10
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Car Looms', 'car-looms', 11
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Steel Coated Copper Cable', 'steel-coated-copper-cable', 12
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Lead Sheath Copper Cables', 'lead-sheath-copper-cables', 13
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Copper Radiators', 'copper-radiators', 14
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony Copper Radiators', 'irony-copper-radiators', 15
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Brass Copper Radiators', 'brass-copper-radiators', 16
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Copper Radiators', 'aluminium-copper-radiators', 17
FROM public.commodities c WHERE c.slug = 'copper';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony Aluminium Copper Radiators', 'irony-aluminium-copper-radiators', 18
FROM public.commodities c WHERE c.slug = 'copper';

-- ============================================
-- 4. GRADES — Brass
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Clean Brass', 'clean-brass', 1
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony (Dirty) Brass', 'irony-dirty-brass', 2
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Mixed Metals Brass', 'mixed-metals-brass', 3
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Brass Swarf', 'brass-swarf', 4
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Brass Bullets', 'brass-bullets', 5
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Gunmetal', 'gunmetal', 6
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Gunmetal Swarf', 'gunmetal-swarf', 7
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Bronze', 'bronze', 8
FROM public.commodities c WHERE c.slug = 'brass';

-- ============================================
-- 5. GRADES — Aluminium
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Extrusion', 'aluminium-extrusion', 1
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Domestic', 'aluminium-domestic', 2
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Clip', 'aluminium-clip', 3
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Cast', 'aluminium-cast', 4
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Litho Sheet', 'aluminium-litho-sheet', 5
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony Aluminium', 'irony-aluminium', 6
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Engines and Gearboxes', 'aluminium-engines-gearboxes', 7
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Mag Wheels', 'aluminium-mag-wheels', 8
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Truck Rims', 'aluminium-truck-rims', 9
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Cans (baled and loose)', 'aluminium-cans', 10
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Swarf', 'aluminium-swarf', 11
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Zorba', 'aluminium-zorba', 12
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Ali Cable', 'ali-cable', 13
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Ali Cable PVC', 'ali-cable-pvc', 14
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'ACSR', 'acsr', 15
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Aluminium Radiators', 'aluminium-radiators', 16
FROM public.commodities c WHERE c.slug = 'aluminium';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony Aluminium Radiators', 'irony-aluminium-radiators', 17
FROM public.commodities c WHERE c.slug = 'aluminium';

-- ============================================
-- 6. GRADES — Stainless Steel
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, '304 Stainless', '304-stainless', 1
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, '304 Stainless Swarf', '304-stainless-swarf', 2
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, '316 Stainless', '316-stainless', 3
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, '316 Stainless Swarf', '316-stainless-swarf', 4
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony Stainless', 'irony-stainless', 5
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Oversized Stainless Steel', 'oversized-stainless-steel', 6
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Cupronickel', 'cupronickel', 7
FROM public.commodities c WHERE c.slug = 'stainless-steel';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Inconel', 'inconel', 8
FROM public.commodities c WHERE c.slug = 'stainless-steel';

-- ============================================
-- 7. GRADES — Lead
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Soft Lead', 'soft-lead', 1
FROM public.commodities c WHERE c.slug = 'lead';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Irony Lead', 'irony-lead', 2
FROM public.commodities c WHERE c.slug = 'lead';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Lead Wheel Weights', 'lead-wheel-weights', 3
FROM public.commodities c WHERE c.slug = 'lead';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Lead Head Nails', 'lead-head-nails', 4
FROM public.commodities c WHERE c.slug = 'lead';

-- ============================================
-- 8. GRADES — Batteries
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Auto Lead-Acid (12V)', 'auto-lead-acid-12v', 1
FROM public.commodities c WHERE c.slug = 'batteries';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Other Lead-Acid (24-48V)', 'other-lead-acid-24-48v', 2
FROM public.commodities c WHERE c.slug = 'batteries';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Steel-Cased Lead-Acid', 'steel-cased-lead-acid', 3
FROM public.commodities c WHERE c.slug = 'batteries';

INSERT INTO public.grades (commodity_id, name, slug, dispute_flag, sort_order)
SELECT c.id, 'Lithium-Ion Batteries', 'lithium-ion-batteries', true, 4
FROM public.commodities c WHERE c.slug = 'batteries';

-- ============================================
-- 9. GRADES — Motors & Electrical
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Fridge Motors', 'fridge-motors', 1
FROM public.commodities c WHERE c.slug = 'motors-electrical';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Starters & Alternators', 'starters-alternators', 2
FROM public.commodities c WHERE c.slug = 'motors-electrical';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Electric Motors (<25kg)', 'electric-motors-small', 3
FROM public.commodities c WHERE c.slug = 'motors-electrical';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Other Electric Motors (>25kg)', 'electric-motors-large', 4
FROM public.commodities c WHERE c.slug = 'motors-electrical';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Transformers', 'transformers', 5
FROM public.commodities c WHERE c.slug = 'motors-electrical';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Ballasts & Sealed Units', 'ballasts-sealed-units', 6
FROM public.commodities c WHERE c.slug = 'motors-electrical';

-- ============================================
-- 10. GRADES — Catalytic Converters & PGM
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Full Cat', 'full-cat', 1
FROM public.commodities c WHERE c.slug = 'catalytic-converters-pgm';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Half Cat', 'half-cat', 2
FROM public.commodities c WHERE c.slug = 'catalytic-converters-pgm';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Quarter Cat', 'quarter-cat', 3
FROM public.commodities c WHERE c.slug = 'catalytic-converters-pgm';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Diesel Particulate Filters', 'diesel-particulate-filters', 4
FROM public.commodities c WHERE c.slug = 'catalytic-converters-pgm';

-- ============================================
-- 11. GRADES — Specialty & High-Value
-- ============================================

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Titanium', 'titanium', 1
FROM public.commodities c WHERE c.slug = 'specialty-high-value';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Clean Zinc / Zinc Wheel Weights', 'clean-zinc', 2
FROM public.commodities c WHERE c.slug = 'specialty-high-value';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Whiteware / AC Units (de-gassed)', 'whiteware-ac-units', 3
FROM public.commodities c WHERE c.slug = 'specialty-high-value';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'E-Waste', 'e-waste', 4
FROM public.commodities c WHERE c.slug = 'specialty-high-value';

-- ============================================
-- FIELD TIPS — Safety-critical warnings
-- ============================================

-- Lithium-Ion Batteries — safety warning
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'REJECT — Fire and explosion risk',
  'Lithium-ion batteries are a REJECT at Endless. Fire and explosion risk. Never puncture, crush, or stack batteries on their side. If a customer brings these in, refuse them and direct to appropriate e-waste facility.', 1
FROM public.grades g WHERE g.slug = 'lithium-ion-batteries';

-- Transformers — PCB warning
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Hazmat — oil-filled units',
  'Oil-filled transformers may contain PCB oil (pre-1980 units). Do not accept without confirming oil type. Requires special handling and disposal under NZ HSNO Act. Do not dismantle.', 1
FROM public.grades g WHERE g.slug = 'transformers';

-- Ballasts — PCB warning
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Pre-1980 PCB risk',
  'Ballasts manufactured before 1980 may contain PCBs. Do not open or dismantle. Handle as hazardous if manufacture date is unknown.', 1
FROM public.grades g WHERE g.slug = 'ballasts-sealed-units';

-- Lead — safety warning
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Toxic — wear PPE',
  'Lead is toxic. Always wear gloves and wash hands after handling. Never eat or drink while handling lead products.', 1
FROM public.grades g WHERE g.slug = 'soft-lead';

-- Lead Head Nails — collection note
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Collect separately',
  'Collect lead head nails separately — do not lose to the HMS bin. They have significantly higher value than ferrous.', 1
FROM public.grades g WHERE g.slug = 'lead-head-nails';

-- Vehicle Panels — gap note
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Depollution and HazMat',
  'Vehicle panels require depollution assessment. Consider HazMat content, whole vs dismantled pricing. Full grading standard in development.', 1
FROM public.grades g WHERE g.slug = 'vehicle-panels';

-- Whiteware / AC Units — de-gas requirement
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'AC units must be certified de-gassed',
  'Air conditioning units must be certified de-gassed before processing. Do not accept uncertified AC units. Refrigerant release is illegal and carries heavy fines.', 1
FROM public.grades g WHERE g.slug = 'whiteware-ac-units';

-- Titanium — XRF verification
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Always verify with XRF',
  'Titanium commands very high prices. Always verify with XRF testing before accepting. Visual identification alone is not reliable — titanium can look like stainless steel.', 1
FROM public.grades g WHERE g.slug = 'titanium';

-- Clean Zinc — never mix with lead
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Never mix with lead',
  'Zinc and lead look very similar but values are very different. Never mix zinc with lead. When in doubt, use a density test — lead is significantly heavier.', 1
FROM public.grades g WHERE g.slug = 'clean-zinc';

-- Catalytic Converters — assay pricing
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'rule', 'Priced by assay — handle carefully',
  'Catalytic converters are priced by PGM assay (Platinum, Palladium, Rhodium), not by weight alone. Handle carefully to avoid damaging the honeycomb substrate — damaged substrate loses PGM content and value.', 1
FROM public.grades g WHERE g.slug = 'full-cat';

-- Inconel — gap note
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'info', 'Grading standard in development',
  'Full grading standard for Inconel is in development. Key considerations: size penalties and cutting requirements. Contact management for pricing guidance.', 1
FROM public.grades g WHERE g.slug = 'inconel';
