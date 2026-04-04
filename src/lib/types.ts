export interface Commodity {
  id: string;
  name: string;
  slug: string;
  icon_svg: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  grade_count?: number;
  product_count?: number;
}

export interface Grade {
  id: string;
  commodity_id: string;
  name: string;
  slug: string;
  dispute_flag: boolean;
  active: boolean;
  description_bold: string | null;
  description_body: string | null;
  key_property: string | null;
  key_property_type: "positive" | "negative" | null;
  spec_json: Record<string, string>;
  buyer_notes_json: Record<string, string>;
  price_impact_json: Record<string, string>;
  overview_image_url: string | null;
  upgrade_statement: string | null;
  sort_order: number;
  created_at: string;
  commodities?: Commodity;
}

export interface Tag {
  id: string;
  category: string;
  name: string;
  colour: string;
  created_by: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  grade_id: string;
  name: string;
  description: string | null;
  search_terms: string[];
  exploded_image_url: string | null;
  annotation_pins_json: AnnotationPin[];
  watch_out_items: string[];
  sort_order: number;
  created_at: string;
  product_components?: ProductComponent[];
  grading_check_groups?: GradingCheckGroup[];
}

export interface AnnotationPin {
  x: number;
  y: number;
  component_name: string;
  status: "acceptable" | "remove" | "price_out" | "review";
  note: string;
}

export interface ProductComponent {
  id: string;
  product_id: string;
  name: string;
  status: "acceptable" | "remove" | "price_out" | "review";
  note: string | null;
  sort_order: number;
}

export interface FieldTip {
  id: string;
  grade_id: string;
  title: string;
  body: string | null;
  tip_type: "test" | "rule" | "warning" | "info";
  sort_order: number;
  created_at: string;
}

export interface GradePhoto {
  id: string;
  grade_id: string;
  url: string;
  caption: string | null;
  status: "acceptable" | "downgrade" | "reject";
  sort_order: number;
  created_at: string;
}

export interface GradingCheckGroup {
  id: string;
  product_id: string;
  label: string;
  group_type: "magnetic" | "brass_content" | "contamination" | "custom";
  sort_order: number;
  grading_checks?: GradingCheck[];
}

export interface GradingCheck {
  id: string;
  group_id: string;
  label: string;
  result: "selected" | "not_selected" | "contam_present" | "contam_clear" | "good";
  explain_text: string | null;
  sort_order: number;
}

export interface EdgeCase {
  id: string;
  grade_id: string;
  yard: string | null;
  submitted_by: string | null;
  submitted_at: string;
  scenario: string;
  decision: string | null;
  outcome: "accepted" | "rejected" | "escalated" | "resolved" | null;
  photo_url: string | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
}

export interface UserProfile {
  id: string;
  name: string | null;
  role: "super_admin" | "editor" | "contributor";
  yard: string | null;
  active: boolean;
  created_at: string;
  email?: string;
}

export interface SearchLog {
  id: string;
  query: string;
  results_count: number;
  searched_at: string;
}
