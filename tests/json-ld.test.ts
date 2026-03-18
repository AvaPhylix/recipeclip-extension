import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractRecipeFromJsonLd, extractImageFromJsonLd } from '../src/shared/json-ld';

function fixture(name: string) {
  return readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8');
}

describe('extractRecipeFromJsonLd', () => {
  describe('AllRecipes format (flat Recipe object)', () => {
    it('extracts title', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.title).toBe('Best Chocolate Chip Cookies');
    });
    it('extracts ingredients', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.ingredients).toHaveLength(6);
      expect(recipe?.ingredients[0].raw).toContain('flour');
    });
    it('extracts steps from HowToStep array', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.steps).toHaveLength(5);
      expect(recipe?.steps[0]).toContain('375');
    });
    it('converts ISO 8601 prep time', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.prep_time).toBe('15 min');
    });
    it('converts ISO 8601 cook time', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.cook_time).toBe('10 min');
    });
    it('extracts nutrition into notes', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.notes).toContain('150 calories');
    });
    it('extracts servings', () => {
      const recipe = extractRecipeFromJsonLd(fixture('allrecipes-sample.html'));
      expect(recipe?.servings).toBe('48 cookies');
    });
  });

  describe('BBC Good Food format (@graph)', () => {
    it('extracts recipe from @graph', () => {
      const recipe = extractRecipeFromJsonLd(fixture('bbc-goodfood-sample.html'));
      expect(recipe?.title).toBe('Ultimate Spaghetti Carbonara');
    });
    it('extracts ingredients', () => {
      const recipe = extractRecipeFromJsonLd(fixture('bbc-goodfood-sample.html'));
      expect(recipe?.ingredients).toHaveLength(5);
    });
    it('extracts steps', () => {
      const recipe = extractRecipeFromJsonLd(fixture('bbc-goodfood-sample.html'));
      expect(recipe?.steps).toHaveLength(4);
    });
  });

  describe("Sally's Baking format (string instruction array, image array)", () => {
    it('extracts title', () => {
      const recipe = extractRecipeFromJsonLd(fixture('sallys-baking-sample.html'));
      expect(recipe?.title).toBe('Chewy Chocolate Chip Cookies');
    });
    it('extracts steps from plain string array', () => {
      const recipe = extractRecipeFromJsonLd(fixture('sallys-baking-sample.html'));
      expect(recipe?.steps).toHaveLength(5);
      expect(recipe?.steps[3]).toContain('Chill');
    });
    it('handles fractional ingredient quantities', () => {
      const recipe = extractRecipeFromJsonLd(fixture('sallys-baking-sample.html'));
      const flour = recipe?.ingredients.find(i => i.name.includes('flour'));
      expect(flour?.quantity).toBeTruthy();
      expect(flour?.unit).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('returns null for HTML with no JSON-LD', () => {
      expect(extractRecipeFromJsonLd('<html><body>No recipe</body></html>')).toBeNull();
    });
    it('returns null for JSON-LD with no Recipe type', () => {
      const html = '<script type="application/ld+json">{"@type":"WebSite","name":"test"}</script>';
      expect(extractRecipeFromJsonLd(html)).toBeNull();
    });
    it('handles malformed JSON-LD gracefully', () => {
      const html = '<script type="application/ld+json">{invalid json}</script>';
      expect(extractRecipeFromJsonLd(html)).toBeNull();
    });
    it('handles empty ingredients gracefully', () => {
      const html = `<script type="application/ld+json">{"@type":"Recipe","name":"test","recipeIngredient":[],"recipeInstructions":[]}</script>`;
      // Should return null (no usable content) or a recipe with empty arrays — either is acceptable
      const recipe = extractRecipeFromJsonLd(html);
      if (recipe) {
        expect(recipe.ingredients).toHaveLength(0);
      }
    });
  });
});

describe('extractImageFromJsonLd', () => {
  it('extracts image string from flat Recipe', () => {
    const url = extractImageFromJsonLd(fixture('allrecipes-sample.html'));
    expect(url).toBe('https://www.allrecipes.com/photo/cookies.jpg');
  });
  it('extracts image from ImageObject', () => {
    const url = extractImageFromJsonLd(fixture('bbc-goodfood-sample.html'));
    expect(url).toBe('https://www.bbcgoodfood.com/carbonara.jpg');
  });
  it('extracts image from array', () => {
    const url = extractImageFromJsonLd(fixture('sallys-baking-sample.html'));
    expect(url).toBe('https://sallysbakingaddiction.com/cookies.jpg');
  });
  it('returns null when no recipe image', () => {
    expect(extractImageFromJsonLd('<html></html>')).toBeNull();
  });
});
