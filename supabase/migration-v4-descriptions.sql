-- Migration v4: Add description fields, key property, and grading checks
-- Run this AFTER existing migrations. Does NOT drop or alter existing data.

-- 1. Add columns to grades table
ALTER TABLE grades ADD COLUMN IF NOT EXISTS description_bold text;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS description_body text;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS key_property text;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS key_property_type text CHECK (key_property_type IN ('positive','negative'));

-- upgrade_statement and overview_image_url may already exist from previous migration
ALTER TABLE grades ADD COLUMN IF NOT EXISTS upgrade_statement text;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS overview_image_url text;

-- 2. Add columns to products table (may already exist)
ALTER TABLE products ADD COLUMN IF NOT EXISTS watch_out_items jsonb DEFAULT '[]';

-- 3. Update grade_photos status constraint
ALTER TABLE grade_photos DROP CONSTRAINT IF EXISTS grade_photos_status_check;
ALTER TABLE grade_photos ADD CONSTRAINT grade_photos_status_check
  CHECK (status IN ('acceptable','downgrade','reject'));

-- 4. Create grading_check_groups table (if not exists)
CREATE TABLE IF NOT EXISTS grading_check_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  label text NOT NULL,
  group_type text CHECK (group_type IN ('magnetic','brass_content','contamination','custom')),
  sort_order integer DEFAULT 0
);
ALTER TABLE grading_check_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated read" ON grading_check_groups FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Editor write" ON grading_check_groups FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','editor')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Create grading_checks table (if not exists)
CREATE TABLE IF NOT EXISTS grading_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES grading_check_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  result text CHECK (result IN ('selected','not_selected','contam_present','contam_clear','good')),
  explain_text text,
  sort_order integer DEFAULT 0
);
ALTER TABLE grading_checks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated read" ON grading_checks FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Editor write" ON grading_checks FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','editor')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- SEED DATA — insert only, do not replace
-- =============================================

-- Update dirty brass grade
UPDATE grades SET
  description_bold = 'Brass is a non-ferrous metal made from a copper-zinc alloy. It is yellow to gold in colour.',
  description_body = 'Brass is graded based on its cleanliness and contamination level. Dirty brass contains non-brass attachments or contamination that must be processed at destination.',
  key_property = 'non-magnetic',
  key_property_type = 'negative',
  upgrade_statement = 'Deliver the brass body and handle only — remove all fittings, ceramic cartridges, rubber seals, and chrome collars before arrival. A stripped brass body with no attachments grades as clean yellow brass and attracts our best brass rate.'
WHERE slug = 'dirty-brass';

-- Update clean yellow brass grade
UPDATE grades SET
  description_bold = 'Brass is a non-ferrous metal made from a copper-zinc alloy. It is yellow to gold in colour.',
  description_body = 'Brass is graded based on its cleanliness and contamination level. Clean yellow brass has no attachments, no contamination, and no plating.',
  key_property = 'non-magnetic',
  key_property_type = 'negative'
WHERE slug = 'clean-yellow-brass';

-- Update brass faucet / tap product — watch out items
UPDATE products SET watch_out_items = '[
  "Pot metal (zinc die-cast) is commonly passed off as brass faucets. Snap test — pot metal breaks, brass bends.",
  "Check handle weight. Steel weights are sometimes hidden inside hollow handles to inflate the weigh-in.",
  "Chrome-plated zinc bodies look identical to brass. Grind a small area — brass shows yellow underneath."
]'::jsonb
WHERE name = 'Brass faucet / tap';

-- Insert grading check groups and checks for brass faucet / tap
-- Only insert if no groups exist for this product yet
DO $$
DECLARE
  v_product_id uuid;
  v_group1_id uuid;
  v_group2_id uuid;
  v_group3_id uuid;
  v_existing_count integer;
BEGIN
  SELECT id INTO v_product_id FROM products WHERE name = 'Brass faucet / tap' LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'Product "Brass faucet / tap" not found, skipping check groups seed.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_existing_count FROM grading_check_groups WHERE product_id = v_product_id;
  IF v_existing_count > 0 THEN
    RAISE NOTICE 'Grading check groups already exist for brass faucet/tap, skipping.';
    RETURN;
  END IF;

  INSERT INTO grading_check_groups (product_id, label, group_type, sort_order)
    VALUES (v_product_id, 'Magnetic', 'magnetic', 1) RETURNING id INTO v_group1_id;
  INSERT INTO grading_checks (group_id, label, result, explain_text, sort_order) VALUES
    (v_group1_id, 'Sticks to magnet', 'good',
     'Steel and iron cannot be separated from brass at the smelter. A non-magnetic result confirms this load is free of ferrous contamination — exactly what we need to see.', 1);

  INSERT INTO grading_check_groups (product_id, label, group_type, sort_order)
    VALUES (v_product_id, 'Brass content', 'brass_content', 2) RETURNING id INTO v_group2_id;
  INSERT INTO grading_checks (group_id, label, result, explain_text, sort_order) VALUES
    (v_group2_id, '100% brass', 'not_selected',
     '100% brass with no attachments grades as clean yellow brass — our highest brass rate. This product has non-brass components attached so it does not qualify at that level.', 1),
    (v_group2_id, '~70% brass', 'selected',
     'Once the ceramic cartridge, rubber seal, and chrome fittings are removed at destination, this product yields approximately 70% recoverable brass — the threshold for dirty brass grade.', 2),
    (v_group2_id, '~40% brass', 'not_selected',
     '40% brass describes mixed low brass — lower-grade mixed fittings. This product is above that threshold so it qualifies for dirty brass, not the lower mixed grade.', 3);

  INSERT INTO grading_check_groups (product_id, label, group_type, sort_order)
    VALUES (v_product_id, 'Contamination', 'contamination', 3) RETURNING id INTO v_group3_id;
  INSERT INTO grading_checks (group_id, label, result, explain_text, sort_order) VALUES
    (v_group3_id, 'Steel contamination', 'contam_present',
     'The chrome collar and steel screws contain ferrous content. These are identified via magnet test and priced out separately — this is why the load cannot achieve clean brass grade.', 1),
    (v_group3_id, 'Plastic contamination', 'contam_present',
     'The ceramic cartridge and rubber seal cannot be smelted with the brass. The cost of removing these at destination is reflected in the dirty brass rate.', 2),
    (v_group3_id, 'Glass contamination', 'contam_clear',
     'No glass present. Glass contamination requires additional sorting at destination and results in a further deduction from the dirty brass rate.', 3),
    (v_group3_id, 'Wood contamination', 'contam_clear',
     'No wood present. Wood and organic matter absorb moisture and add non-recoverable weight — always removed before acceptance.', 4),
    (v_group3_id, 'Rubber contamination', 'contam_present',
     'Rubber O-rings and seals are present on the valve body. These cannot be smelted and must be removed at destination — accounted for in the dirty brass rate.', 5);
END $$;
