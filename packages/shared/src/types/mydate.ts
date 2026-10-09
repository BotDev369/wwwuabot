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

/**
 * Параметр системи: реєстр дає `key` і `label`, а пояснення (`about`) дописує
 * сервер із довідника — у реєстрі його немає, тож і тут воно необов'язкове.
 */
export interface MyDateSystemParameter {
  key: string;
  label: string;
  about?: string;
}

export interface MyDateSystem {
  id: string;
  name: string;
  description: string;
  /** Звідки взялася система: дописує сервер із довідника, як і `about`. */
  history?: string;
  implemented: boolean;
  parameters: MyDateSystemParameter[];
}

export interface SystemAnalysisResult {
  parameters?: Array<{ key: string; label?: string; value: unknown }>;
  comingSoon?: string[];
  [key: string]: unknown;
}
