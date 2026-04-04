-- Fix seed data: correct slugs and product name
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. Fix grade descriptions (correct slugs)
-- =============================================

-- Update Irony (Dirty) Brass grade (slug = 'irony-dirty-brass', NOT 'dirty-brass')
UPDATE grades SET
  description_bold = 'Brass is a non-ferrous metal made from a copper-zinc alloy. It is yellow to gold in colour.',
  description_body = 'Brass is graded based on its cleanliness and contamination level. Dirty brass contains non-brass attachments or contamination that must be processed at destination.',
  key_property = 'non-magnetic',
  key_property_type = 'negative',
  upgrade_statement = 'Deliver the brass body and handle only — remove all fittings, ceramic cartridges, rubber seals, and chrome collars before arrival. A stripped brass body with no attachments grades as clean yellow brass and attracts our best brass rate.'
WHERE slug = 'irony-dirty-brass';

-- Update Clean Brass grade (slug = 'clean-brass', NOT 'clean-yellow-brass')
UPDATE grades SET
  description_bold = 'Brass is a non-ferrous metal made from a copper-zinc alloy. It is yellow to gold in colour.',
  description_body = 'Brass is graded based on its cleanliness and contamination level. Clean yellow brass has no attachments, no contamination, and no plating.',
  key_property = 'non-magnetic',
  key_property_type = 'negative'
WHERE slug = 'clean-brass';

-- =============================================
-- 2. Fix product: rename "New Product" to "Brass faucet / tap"
--    and add watch_out_items
-- =============================================

-- Find the first product under irony-dirty-brass and rename it + add watch out items
UPDATE products SET
  name = 'Brass faucet / tap',
  description = 'Standard brass mixer tap with ceramic cartridge, chrome collar, and rubber seals.',
  watch_out_items = '[
    "Pot metal (zinc die-cast) is commonly passed off as brass faucets. Snap test — pot metal breaks, brass bends.",
    "Check handle weight. Steel weights are sometimes hidden inside hollow handles to inflate the weigh-in.",
    "Chrome-plated zinc bodies look identical to brass. Grind a small area — brass shows yellow underneath."
  ]'::jsonb
WHERE id = (
  SELECT p.id FROM products p
  JOIN grades g ON p.grade_id = g.id
  WHERE g.slug = 'irony-dirty-brass'
  ORDER BY p.sort_order
  LIMIT 1
);

-- =============================================
-- 3. Fix product components: rename "New Component" if it exists
-- =============================================

UPDATE product_components SET
  name = 'Brass body',
  status = 'acceptable'
WHERE id = (
  SELECT pc.id FROM product_components pc
  JOIN products p ON pc.product_id = p.id
  JOIN grades g ON p.grade_id = g.id
  WHERE g.slug = 'irony-dirty-brass'
  ORDER BY pc.sort_order
  LIMIT 1
);

-- =============================================
-- 4. Replace grading check groups and checks
--    Delete old empty groups, insert proper ones
-- =============================================

DO $$
DECLARE
  v_product_id uuid;
  v_group1_id uuid;
  v_group2_id uuid;
  v_group3_id uuid;
BEGIN
  -- Get the product ID (the one we just renamed to "Brass faucet / tap")
  SELECT p.id INTO v_product_id
  FROM products p
  JOIN grades g ON p.grade_id = g.id
  WHERE g.slug = 'irony-dirty-brass'
  ORDER BY p.sort_order
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'No product found under irony-dirty-brass, skipping.';
    RETURN;
  END IF;

  -- Delete existing grading check groups (and their checks via CASCADE)
  DELETE FROM grading_check_groups WHERE product_id = v_product_id;

  -- Insert Magnetic group
  INSERT INTO grading_check_groups (product_id, label, group_type, sort_order)
    VALUES (v_product_id, 'Magnetic', 'magnetic', 1) RETURNING id INTO v_group1_id;
  INSERT INTO grading_checks (group_id, label, result, explain_text, sort_order) VALUES
    (v_group1_id, 'Sticks to magnet', 'good',
     'Steel and iron cannot be separated from brass at the smelter. A non-magnetic result confirms this load is free of ferrous contamination — exactly what we need to see.', 1);

  -- Insert Brass content group
  INSERT INTO grading_check_groups (product_id, label, group_type, sort_order)
    VALUES (v_product_id, 'Brass content', 'brass_content', 2) RETURNING id INTO v_group2_id;
  INSERT INTO grading_checks (group_id, label, result, explain_text, sort_order) VALUES
    (v_group2_id, '100% brass', 'not_selected',
     '100% brass with no attachments grades as clean yellow brass — our highest brass rate. This product has non-brass components attached so it does not qualify at that level.', 1),
    (v_group2_id, '~70% brass', 'selected',
     'Once the ceramic cartridge, rubber seal, and chrome fittings are removed at destination, this product yields approximately 70% recoverable brass — the threshold for dirty brass grade.', 2),
    (v_group2_id, '~40% brass', 'not_selected',
     '40% brass describes mixed low brass — lower-grade mixed fittings. This product is above that threshold so it qualifies for dirty brass, not the lower mixed grade.', 3);

  -- Insert Contamination group
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

  RAISE NOTICE 'Successfully inserted 3 grading check groups with 9 checks for product %', v_product_id;
END $$;
