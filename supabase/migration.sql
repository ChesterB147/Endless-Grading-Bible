-- ============================================
-- endless metals® Grading Bible — Full Schema
-- ============================================

-- Commodities
CREATE TABLE IF NOT EXISTS public.commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_svg text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Grades
CREATE TABLE IF NOT EXISTS public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id uuid REFERENCES public.commodities(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  isri_code text,
  dispute_flag boolean DEFAULT false,
  active boolean DEFAULT true,
  spec_json jsonb DEFAULT '{}',
  buyer_notes_json jsonb DEFAULT '{}',
  price_impact_json jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  colour text DEFAULT '#12b3c3',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Grade Tags (junction)
CREATE TABLE IF NOT EXISTS public.grade_tags (
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (grade_id, tag_id)
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  search_terms text[] DEFAULT '{}',
  exploded_image_url text,
  annotation_pins_json jsonb DEFAULT '[]',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Product Components
CREATE TABLE IF NOT EXISTS public.product_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text CHECK (status IN ('acceptable','remove','price_out','review')),
  note text,
  sort_order integer DEFAULT 0
);

-- Field Tips
CREATE TABLE IF NOT EXISTS public.field_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  tip_type text CHECK (tip_type IN ('test','rule','warning','info')) DEFAULT 'info',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Grade Photos
CREATE TABLE IF NOT EXISTS public.grade_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  status text CHECK (status IN ('acceptable','reject','reference')) DEFAULT 'reference',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Edge Cases
CREATE TABLE IF NOT EXISTS public.edge_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  yard text,
  submitted_by uuid REFERENCES auth.users(id),
  submitted_at timestamptz DEFAULT now(),
  scenario text NOT NULL,
  decision text,
  outcome text CHECK (outcome IN ('accepted','rejected','escalated','resolved')),
  photo_url text,
  approved boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz
);

-- User Profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  name text,
  role text CHECK (role IN ('super_admin','editor','contributor')) DEFAULT 'contributor',
  yard text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Search Logs
CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  results_count integer DEFAULT 0,
  searched_at timestamptz DEFAULT now()
);

-- Grade Views (for analytics)
CREATE TABLE IF NOT EXISTS public.grade_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid REFERENCES public.grades(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_views ENABLE ROW LEVEL SECURITY;

-- Helper function: check user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() AND active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Commodities policies
CREATE POLICY "commodities_select" ON public.commodities FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "commodities_insert" ON public.commodities FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "commodities_update" ON public.commodities FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "commodities_delete" ON public.commodities FOR DELETE TO authenticated USING (public.get_user_role() = 'super_admin');

-- Grades policies
CREATE POLICY "grades_select" ON public.grades FOR SELECT TO authenticated USING (active = true);
CREATE POLICY "grades_insert" ON public.grades FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "grades_update" ON public.grades FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "grades_delete" ON public.grades FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- Tags policies
CREATE POLICY "tags_select" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags_insert" ON public.tags FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "tags_update" ON public.tags FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "tags_delete" ON public.tags FOR DELETE TO authenticated USING (public.get_user_role() = 'super_admin');

-- Grade Tags policies
CREATE POLICY "grade_tags_select" ON public.grade_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "grade_tags_insert" ON public.grade_tags FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "grade_tags_delete" ON public.grade_tags FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- Products policies
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- Product Components policies
CREATE POLICY "components_select" ON public.product_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "components_insert" ON public.product_components FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "components_update" ON public.product_components FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "components_delete" ON public.product_components FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- Field Tips policies
CREATE POLICY "tips_select" ON public.field_tips FOR SELECT TO authenticated USING (true);
CREATE POLICY "tips_insert" ON public.field_tips FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "tips_update" ON public.field_tips FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "tips_delete" ON public.field_tips FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- Grade Photos policies
CREATE POLICY "photos_select" ON public.grade_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos_insert" ON public.grade_photos FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "photos_update" ON public.grade_photos FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "photos_delete" ON public.grade_photos FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- Edge Cases policies
CREATE POLICY "edge_cases_select" ON public.edge_cases FOR SELECT TO authenticated
  USING (approved = true OR submitted_by = auth.uid());
CREATE POLICY "edge_cases_insert" ON public.edge_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "edge_cases_update" ON public.edge_cases FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "edge_cases_delete" ON public.edge_cases FOR DELETE TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));

-- User Profiles policies
CREATE POLICY "profiles_select" ON public.user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (public.get_user_role() IN ('super_admin','editor') OR id = auth.uid());
CREATE POLICY "profiles_update" ON public.user_profiles FOR UPDATE TO authenticated USING (public.get_user_role() IN ('super_admin','editor') OR id = auth.uid());
CREATE POLICY "profiles_delete" ON public.user_profiles FOR DELETE TO authenticated USING (public.get_user_role() = 'super_admin');

-- Search Logs policies (anyone can insert, admins can read)
CREATE POLICY "logs_select" ON public.search_logs FOR SELECT TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "logs_insert" ON public.search_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Grade Views policies
CREATE POLICY "views_select" ON public.grade_views FOR SELECT TO authenticated USING (public.get_user_role() IN ('super_admin','editor'));
CREATE POLICY "views_insert" ON public.grade_views FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- Storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('grading-media', 'grading-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "grading_media_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'grading-media');
CREATE POLICY "grading_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'grading-media' AND (SELECT public.get_user_role()) IN ('super_admin','editor'));
CREATE POLICY "grading_media_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'grading-media' AND (SELECT public.get_user_role()) IN ('super_admin','editor'));
CREATE POLICY "grading_media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'grading-media' AND (SELECT public.get_user_role()) IN ('super_admin','editor'));
