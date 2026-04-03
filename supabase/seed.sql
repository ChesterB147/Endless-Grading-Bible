-- ============================================
-- Seed Data
-- ============================================

-- Commodities
INSERT INTO public.commodities (name, slug, sort_order) VALUES
  ('Brass', 'brass', 1),
  ('Electric Motors', 'electric-motors', 2);

-- Brass grades
INSERT INTO public.grades (commodity_id, name, slug, isri_code, sort_order)
SELECT c.id, 'Clean yellow brass', 'clean-yellow-brass', 'Honey', 1
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, isri_code, dispute_flag, sort_order)
SELECT c.id, 'Dirty brass', 'dirty-brass', 'Ebony', true, 2
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, isri_code, sort_order)
SELECT c.id, 'Red brass', 'red-brass', 'Candy', 3
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, isri_code, sort_order)
SELECT c.id, 'Brass radiators (auto)', 'brass-radiators-auto', 'Oceanside', 4
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, isri_code, sort_order)
SELECT c.id, 'Brass turnings', 'brass-turnings', 'Night', 5
FROM public.commodities c WHERE c.slug = 'brass';

INSERT INTO public.grades (commodity_id, name, slug, isri_code, sort_order)
SELECT c.id, 'Mixed low brass', 'mixed-low-brass', 'Drink', 6
FROM public.commodities c WHERE c.slug = 'brass';

-- Electric Motor grades
INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Whole motors — small', 'whole-motors-small', 1
FROM public.commodities c WHERE c.slug = 'electric-motors';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Whole motors — large', 'whole-motors-large', 2
FROM public.commodities c WHERE c.slug = 'electric-motors';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Stripped motor ends', 'stripped-motor-ends', 3
FROM public.commodities c WHERE c.slug = 'electric-motors';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Copper windings', 'copper-windings', 4
FROM public.commodities c WHERE c.slug = 'electric-motors';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Alternators / generators', 'alternators-generators', 5
FROM public.commodities c WHERE c.slug = 'electric-motors';

INSERT INTO public.grades (commodity_id, name, slug, sort_order)
SELECT c.id, 'Transformers', 'transformers', 6
FROM public.commodities c WHERE c.slug = 'electric-motors';

-- Sample product for dirty brass
INSERT INTO public.products (grade_id, name, description, search_terms)
SELECT g.id, 'Brass faucet / tap', 'Common plumbing fitting — high dispute item',
  ARRAY['tap', 'faucet', 'mixer', 'basin tap', 'kitchen tap', 'chrome tap', 'basin mixer']
FROM public.grades g WHERE g.slug = 'dirty-brass';

-- Field tips for dirty brass
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'test', 'Magnet test',
  'Run a magnet over every load. Any iron that sticks is priced out of the dirty brass rate. Heavy iron content = downgrade to mixed metals.', 1
FROM public.grades g WHERE g.slug = 'dirty-brass';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'test', 'Grind test for chrome',
  'If surface looks silver or chrome, grind a small area. Brass underneath = acceptable. Chrome-plated zinc (pot metal) = reject entirely.', 2
FROM public.grades g WHERE g.slug = 'dirty-brass';

INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Pot metal warning',
  'Pot metal (zinc die-cast) is commonly mixed in with faucets. It looks like brass but is not. Snap test — pot metal snaps, brass bends.', 3
FROM public.grades g WHERE g.slug = 'dirty-brass';

-- Field tip for transformers (warning)
INSERT INTO public.field_tips (grade_id, tip_type, title, body, sort_order)
SELECT g.id, 'warning', 'Hazmat — oil-filled units',
  'Oil-filled transformers may contain PCB oil. Do not accept without confirming oil type. Requires special handling and disposal under NZ HSNO Act.', 1
FROM public.grades g WHERE g.slug = 'transformers';
