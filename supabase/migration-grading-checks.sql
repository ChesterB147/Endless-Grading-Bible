-- ============================================
-- Migration: Grading Checks Feature
-- Run against Supabase — additive only, no drops
-- ============================================

-- 1. Add new columns to existing tables
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS watch_out_items jsonb DEFAULT '[]';
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS overview_image_url text;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS upgrade_statement text;

-- 2. Create grading_check_groups table
CREATE TABLE IF NOT EXISTS public.grading_check_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  group_type text CHECK (group_type IN ('magnetic','brass_content','contamination','custom')),
  sort_order integer DEFAULT 0
);

-- 3. Create grading_checks table
CREATE TABLE IF NOT EXISTS public.grading_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.grading_check_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  result text CHECK (result IN ('selected','not_selected','contam_present','contam_clear','good')),
  explain_text text,
  sort_order integer DEFAULT 0
);

-- 4. Update grade_photos status constraint
-- Drop old constraint and add new one with 'downgrade' replacing 'reference'
ALTER TABLE public.grade_photos DROP CONSTRAINT IF EXISTS grade_photos_status_check;
ALTER TABLE public.grade_photos ADD CONSTRAINT grade_photos_status_check
  CHECK (status IN ('acceptable','downgrade','reject'));

-- Update any existing 'reference' photos to 'acceptable'
UPDATE public.grade_photos SET status = 'acceptable' WHERE status = 'reference';

-- 5. Enable RLS on new tables
ALTER TABLE public.grading_check_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_checks ENABLE ROW LEVEL SECURITY;

-- RLS policies for grading_check_groups
CREATE POLICY "Authenticated users can view grading_check_groups"
  ON public.grading_check_groups FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage grading_check_groups"
  ON public.grading_check_groups FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin','editor')
    )
  );

-- RLS policies for grading_checks
CREATE POLICY "Authenticated users can view grading_checks"
  ON public.grading_checks FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage grading_checks"
  ON public.grading_checks FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('super_admin','editor')
    )
  );

-- ============================================
-- Seed data additions
-- ============================================

-- Update dirty brass upgrade statement
UPDATE public.grades
SET upgrade_statement = 'Deliver the brass body and handle only — remove all fittings, ceramic cartridges, rubber seals, and chrome collars before arrival. A stripped brass body with no attachments grades as clean yellow brass and attracts our best brass rate.'
WHERE slug = 'irony-dirty-brass';

-- Update brass faucet / tap watch_out_items
UPDATE public.products
SET watch_out_items = '[
  "Pot metal (zinc die-cast) is commonly passed off as brass faucets. Snap test — pot metal breaks, brass bends.",
  "Check handle weight. Steel weights are sometimes hidden inside hollow handles to inflate the weigh-in.",
  "Chrome-plated zinc bodies look identical to brass. Grind a small area — brass shows yellow underneath."
]'::jsonb
WHERE name = 'Brass faucet / tap';

-- Insert grading check groups for brass faucet / tap
-- Group 1: Magnetic test
INSERT INTO public.grading_check_groups (product_id, label, group_type, sort_order)
SELECT p.id, 'Magnetic test', 'magnetic', 1
FROM public.products p WHERE p.name = 'Brass faucet / tap';

-- Group 2: Brass content
INSERT INTO public.grading_check_groups (product_id, label, group_type, sort_order)
SELECT p.id, 'Brass content', 'brass_content', 2
FROM public.products p WHERE p.name = 'Brass faucet / tap';

-- Group 3: Contamination
INSERT INTO public.grading_check_groups (product_id, label, group_type, sort_order)
SELECT p.id, 'Contamination', 'contamination', 3
FROM public.products p WHERE p.name = 'Brass faucet / tap';

-- Group 1 checks: Magnetic test
INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Body is non-magnetic', 'good', 'Brass is non-magnetic. If the body attracts a magnet, it is steel or iron — reject or downgrade to mixed metals.', 1
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Magnetic test';

INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Handle is non-magnetic', 'good', 'Handles should also be brass. Magnetic handles indicate steel inserts or iron construction — remove and price out.', 2
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Magnetic test';

INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Screws / fittings magnetic', 'selected', 'Small steel screws are common and acceptable — they are priced out of the dirty brass rate. Heavy iron content = downgrade.', 3
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Magnetic test';

-- Group 2 checks: Brass content
INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Body confirmed brass (grind test)', 'good', 'Grind a small area on the body. Yellow brass underneath confirms genuine brass. Silver/white underneath = chrome-plated zinc — reject.', 1
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Brass content';

INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Handle confirmed brass', 'good', 'Same grind test on handle. Some faucets have zinc handles on a brass body — the handle would be rejected, body accepted.', 2
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Brass content';

INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Cartridge present', 'selected', 'Ceramic cartridges inside the faucet body add dead weight with no brass value. Must be removed for clean brass upgrade.', 3
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Brass content';

-- Group 3 checks: Contamination
INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Chrome collar attached', 'contam_present', 'Chrome collars are plated zinc or steel. They add contamination weight and must be removed before grading as clean brass.', 1
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Contamination';

INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Rubber seals / O-rings', 'contam_present', 'Rubber seals add contamination. Remove all rubber before grading. Acceptable in dirty brass but must be removed for clean brass upgrade.', 2
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Contamination';

INSERT INTO public.grading_checks (group_id, label, result, explain_text, sort_order)
SELECT g.id, 'Plastic / nylon fittings', 'contam_clear', 'No plastic fittings detected. If present, they must be removed — they add dead weight and contamination.', 3
FROM public.grading_check_groups g
JOIN public.products p ON g.product_id = p.id
WHERE p.name = 'Brass faucet / tap' AND g.label = 'Contamination';
