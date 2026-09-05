export interface MyDate {
  id: string;
  user_id: number;
  date: string;
  type: string;
  name: string;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  alias?: string;
  category?: string;
}

export interface MyDateSystem {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  parameters: Array<{ key: string; label: string }>;
}

export interface SystemAnalysisResult {
  parameters?: Array<{ key: string; label?: string; value: unknown }>;
  comingSoon?: string[];
  [key: string]: unknown;
}
