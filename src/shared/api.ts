import type { ParsedRecipe, ImportResult } from './types';

const BASE_URL = 'https://recipeclip.app';

export async function parseHtml(html: string, sourceUrl: string, token: string): Promise<ImportResult> {
  const res = await fetch(`${BASE_URL}/api/parse-html`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ html: html.slice(0, 2_000_000), sourceUrl }),
  });
  if (!res.ok) throw new Error(`parse-html failed: ${res.status}`);
  return res.json();
}

export async function saveRecipe(recipe: ParsedRecipe, imageUrl: string | null, sourceUrl: string, token: string): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/api/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      notes: recipe.notes,
      video_url: recipe.video_url || null,
      image_url: imageUrl || null,
      source_url: sourceUrl || null,
      tags: [],
      is_public: false,
    }),
  });
  if (!res.ok) throw new Error(`save recipe failed: ${res.status}`);
  return res.json();
}

export async function checkDuplicate(url: string, token: string): Promise<{ exists: boolean; recipeId?: string }> {
  const res = await fetch(`${BASE_URL}/api/recipes?source_url=${encodeURIComponent(url)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return { exists: false };
  const data = await res.json();
  const recipes = data.recipes || data || [];
  const found = Array.isArray(recipes) ? recipes.find((r: { source_url?: string }) => r.source_url === url) : null;
  return { exists: !!found, recipeId: found?.id };
}
