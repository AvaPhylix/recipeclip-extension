import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveRecipe, parseHtml, checkDuplicate } from '../src/shared/api';
import type { ParsedRecipe } from '../src/shared/types';

const mockRecipe: ParsedRecipe = {
  title: 'Test Recipe',
  description: 'A test',
  servings: '4',
  prep_time: '15 min',
  cook_time: '30 min',
  source_book_title: '',
  source_page_number: '',
  ingredients: [{ name: 'flour', quantity: '2', unit: 'cups', raw: '2 cups flour' }],
  steps: ['Mix ingredients', 'Bake at 350F'],
  notes: '',
  video_url: '',
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

describe('saveRecipe', () => {
  it('sends correct headers and body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'recipe-123' }),
    } as Response);

    const result = await saveRecipe(mockRecipe, 'https://example.com/photo.jpg', 'https://example.com/recipe', 'test-token');

    expect(fetch).toHaveBeenCalledWith(
      'https://recipeclip.app/api/recipes',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Authorization': 'Bearer test-token' }),
      })
    );
    expect(result.id).toBe('recipe-123');
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    await expect(saveRecipe(mockRecipe, null, '', 'bad-token')).rejects.toThrow('401');
  });
});

describe('parseHtml', () => {
  it('sends html and sourceUrl', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipe: mockRecipe, source_url: 'https://example.com', image_url: null, step_photos: [], video_url: null }),
    } as Response);

    const result = await parseHtml('<html>test</html>', 'https://example.com', 'token');
    expect(result.recipe?.title).toBe('Test Recipe');
  });
});

describe('checkDuplicate', () => {
  it('returns exists: false when no match', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ recipes: [] }),
    } as Response);

    const result = await checkDuplicate('https://example.com/recipe', 'token');
    expect(result.exists).toBe(false);
  });
});
