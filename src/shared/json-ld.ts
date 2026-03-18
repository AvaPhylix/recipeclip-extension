import type { ParsedRecipe } from './types';

// ISO 8601 duration → human readable string
export function parseDuration(iso: string): string {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return iso;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return parts.join(' ') || '';
}

const UNITS = [
  'teaspoons', 'teaspoon', 'tablespoons', 'tablespoon',
  'cups', 'cup', 'ounces', 'ounce', 'oz', 'pounds', 'pound', 'lb', 'lbs',
  'grams', 'gram', 'g', 'kilograms', 'kilogram', 'kg',
  'milliliters', 'milliliter', 'ml', 'liters', 'liter', 'l',
  'pinch', 'pinches', 'dash', 'dashes', 'handful', 'handfuls',
  'cloves', 'clove', 'slices', 'slice', 'cans', 'can',
  'tsp', 'tbsp', 'fl oz', 'pt', 'qt', 'gal',
];

// Parse "2 cups flour" → {name, quantity, unit, raw}
export function parseIngredientString(raw: string): { name: string; quantity: string; unit: string; raw: string } {
  const trimmed = raw.trim();

  // Normalize fractions like 1/4, 2 1/4
  const fractionMap: Record<string, string> = {
    '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
    '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
  };
  let normalized = trimmed;
  for (const [sym, val] of Object.entries(fractionMap)) {
    normalized = normalized.replace(new RegExp(sym, 'g'), val);
  }

  // Match quantity: whole numbers, decimals, fractions, mixed (e.g. "2 1/4")
  const qtyPattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/;
  const qtyMatch = normalized.match(qtyPattern);
  const quantity = qtyMatch ? qtyMatch[1].trim() : '';
  const rest = quantity ? normalized.slice(quantity.length).trim() : normalized;

  // Match unit
  const unitPattern = new RegExp(`^(${UNITS.join('|')})\\b\\.?`, 'i');
  const unitMatch = rest.match(unitPattern);
  const unit = unitMatch ? unitMatch[1].toLowerCase() : '';
  const name = unit ? rest.slice(unit.length).trim().replace(/^,\s*/, '') : rest;

  return { name: name || trimmed, quantity, unit, raw: trimmed };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractStepsFromInstructions(instructions: any): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') return [instructions.trim()].filter(Boolean);

  if (Array.isArray(instructions)) {
    const steps: string[] = [];
    for (const item of instructions) {
      if (typeof item === 'string') {
        steps.push(item.trim());
      } else if (item && typeof item === 'object') {
        const type = item['@type'];
        if (type === 'HowToStep') {
          const text = item.text || item.name || '';
          if (text) steps.push(text.trim());
        } else if (type === 'HowToSection') {
          // Recurse into section steps
          const sectionSteps = extractStepsFromInstructions(item.itemListElement || item.steps || []);
          steps.push(...sectionSteps);
        } else {
          // Unknown object type — try text/name
          const text = item.text || item.name || '';
          if (text) steps.push(text.trim());
        }
      }
    }
    return steps.filter(Boolean);
  }

  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractImageUrl(img: any): string | null {
  if (!img) return null;
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) {
    for (const item of img) {
      const url = extractImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof img === 'object') {
    return img.url || img.contentUrl || null;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNutrition(nut: any): string {
  if (!nut || typeof nut !== 'object') return '';
  const parts: string[] = [];
  if (nut.calories) parts.push(nut.calories);
  if (nut.fatContent) parts.push(`Fat: ${nut.fatContent}`);
  if (nut.carbohydrateContent) parts.push(`Carbs: ${nut.carbohydrateContent}`);
  if (nut.proteinContent) parts.push(`Protein: ${nut.proteinContent}`);
  if (nut.fiberContent) parts.push(`Fiber: ${nut.fiberContent}`);
  if (nut.sugarContent) parts.push(`Sugar: ${nut.sugarContent}`);
  if (nut.sodiumContent) parts.push(`Sodium: ${nut.sodiumContent}`);
  return parts.join(' | ');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractFromRecipeObject(item: any): ParsedRecipe | null {
  if (!item || item['@type'] !== 'Recipe') return null;

  const title = item.name || '';
  if (!title) return null;

  const description = item.description || '';
  const servings = item.recipeYield
    ? (Array.isArray(item.recipeYield) ? item.recipeYield[0] : item.recipeYield).toString()
    : '';
  const prep_time = parseDuration(item.prepTime || '');
  const cook_time = parseDuration(item.cookTime || '');

  const ingredients = Array.isArray(item.recipeIngredient)
    ? item.recipeIngredient.map((raw: string) => parseIngredientString(String(raw)))
    : [];

  const steps = extractStepsFromInstructions(item.recipeInstructions);

  const nutritionStr = extractNutrition(item.nutrition);
  const notes = nutritionStr ? `Nutrition: ${nutritionStr}` : '';

  // Video URL
  let video_url = '';
  if (item.video) {
    if (typeof item.video === 'string') video_url = item.video;
    else if (item.video.contentUrl) video_url = item.video.contentUrl;
    else if (item.video.embedUrl) video_url = item.video.embedUrl;
  }

  return {
    title,
    description,
    servings,
    prep_time,
    cook_time,
    source_book_title: '',
    source_page_number: '',
    ingredients,
    steps,
    notes,
    video_url,
  };
}

// Extract JSON-LD script tags from HTML and find Recipe
export function extractRecipeFromJsonLd(html: string): ParsedRecipe | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonText = match[1].trim();
    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      continue;
    }

    // Handle @graph
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = data as any;
    if (obj && obj['@graph'] && Array.isArray(obj['@graph'])) {
      for (const item of obj['@graph']) {
        const recipe = extractFromRecipeObject(item);
        if (recipe) return recipe;
      }
    }

    // Handle array of objects
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const recipe = extractFromRecipeObject(item);
        if (recipe) return recipe;
      }
    }

    // Handle single object
    const recipe = extractFromRecipeObject(obj);
    if (recipe) return recipe;
  }

  return null;
}

export function extractImageFromJsonLd(html: string): string | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    const jsonText = match[1].trim();
    let data: unknown;
    try {
      data = JSON.parse(jsonText);
    } catch {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = data as any;

    // Check @graph
    if (obj && obj['@graph'] && Array.isArray(obj['@graph'])) {
      for (const item of obj['@graph']) {
        if (item['@type'] === 'Recipe' && item.image) {
          const url = extractImageUrl(item.image);
          if (url) return url;
        }
      }
    }

    // Check array
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item['@type'] === 'Recipe' && item.image) {
          const url = extractImageUrl(item.image);
          if (url) return url;
        }
      }
    }

    // Check single
    if (obj && obj['@type'] === 'Recipe' && obj.image) {
      const url = extractImageUrl(obj.image);
      if (url) return url;
    }
  }

  return null;
}
