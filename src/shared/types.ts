export interface ParsedRecipe {
  title: string;
  description: string;
  servings: string;
  prep_time: string;
  cook_time: string;
  source_book_title: string;
  source_page_number: string;
  ingredients: { name: string; quantity: string; unit: string; raw: string }[];
  steps: string[];
  notes: string;
  video_url: string;
}

export interface ImportResult {
  recipe: ParsedRecipe | null;
  source_url: string;
  image_url: string | null;
  step_photos: string[];
  video_url: string | null;
  error?: string;
}

export interface AuthState {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email: string;
  expires_at: number;
}

export type ExtensionMessage =
  | { type: 'RECIPE_DETECTED'; recipe: ParsedRecipe; imageUrl: string | null; sourceUrl: string }
  | { type: 'NO_RECIPE' }
  | { type: 'AUTH_TOKEN'; access_token: string; refresh_token: string; email: string; user_id: string; expires_at: number }
  | { type: 'GET_AUTH' }
  | { type: 'AUTH_RESPONSE'; auth: AuthState | null }
  | { type: 'SIGN_OUT' }
  | { type: 'OPEN_SIDE_PANEL' };
