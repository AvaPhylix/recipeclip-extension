import React, { useEffect, useState } from 'react';
import { getAuth } from '../shared/auth';
import { saveRecipe } from '../shared/api';
import type { ParsedRecipe, AuthState } from '../shared/types';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  raw: string;
}

export function SidePanel() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [error, setError] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  // Recipe fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const authData = await getAuth();
    setAuth(authData);

    // Get active tab info and recipe from content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    setSourceUrl(tab?.url || '');

    if (tab?.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractRecipeFromPage,
        });
        const result = results?.[0]?.result;
        if (result?.recipe) {
          populateFromRecipe(result.recipe);
          if (result.imageUrl) setImageUrl(result.imageUrl);
        }
      } catch (err) {
        console.error('Script injection failed:', err);
      }
    }

    setLoading(false);
  }

  function populateFromRecipe(recipe: ParsedRecipe) {
    setTitle(recipe.title || '');
    setDescription(recipe.description || '');
    setPrepTime(recipe.prep_time || '');
    setCookTime(recipe.cook_time || '');
    setServings(recipe.servings || '');
    setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: '', quantity: '', unit: '', raw: '' }]);
    setSteps(recipe.steps.length > 0 ? recipe.steps : ['']);
    setNotes(recipe.notes || '');
  }

  async function handleSave() {
    if (!auth) {
      setError('Please sign in first');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const recipe: ParsedRecipe = {
        title,
        description,
        servings,
        prep_time: prepTime,
        cook_time: cookTime,
        source_book_title: '',
        source_page_number: '',
        ingredients,
        steps: steps.filter(s => s.trim()),
        notes,
        video_url: '',
      };
      const result = await saveRecipe(recipe, imageUrl || null, sourceUrl, auth.access_token);
      setSavedId(result.id);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  }

  // Ingredient helpers
  function addIngredient() {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '', raw: '' }]);
  }

  function removeIngredient(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i));
  }

  function updateIngredient(i: number, field: keyof Ingredient, value: string) {
    const updated = [...ingredients];
    updated[i] = { ...updated[i], [field]: value };
    setIngredients(updated);
  }

  // Step helpers
  function addStep() {
    setSteps([...steps, '']);
  }

  function removeStep(i: number) {
    setSteps(steps.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, value: string) {
    const updated = [...steps];
    updated[i] = value;
    setSteps(updated);
  }

  function moveStep(i: number, dir: -1 | 1) {
    const updated = [...steps];
    const target = i + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[i], updated[target]] = [updated[target], updated[i]];
    setSteps(updated);
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500';
  const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <p className="text-slate-600 text-sm">Sign in to use RecipeClip</p>
        <button
          onClick={() => chrome.tabs.create({ url: `https://recipeclip.app/auth?extension=1&extensionId=${chrome.runtime.id}` })}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-bold text-slate-800">Recipe saved!</h2>
        <a
          href={`https://recipeclip.app/recipes/${savedId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 hover:text-brand-700 font-medium text-sm"
        >
          View Recipe →
        </a>
        <button
          onClick={() => setSaved(false)}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Edit again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xl">📎</span>
        <span className="font-bold text-slate-800">RecipeClip Editor</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Thumbnail */}
        <div>
          <label className={labelCls}>Thumbnail URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={e => { setImageUrl(e.target.value); setImageError(false); }}
            placeholder="https://example.com/image.jpg"
            className={inputCls}
          />
          {imageUrl && !imageError && (
            <img
              src={imageUrl}
              alt="Thumbnail preview"
              className="mt-2 w-full h-40 object-cover rounded-lg"
              onError={() => setImageError(true)}
            />
          )}
        </div>

        {/* Title */}
        <div>
          <label className={labelCls}>Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Recipe title"
            className={inputCls}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of the recipe"
            className={inputCls}
          />
        </div>

        {/* Times + servings */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Prep time</label>
            <input
              type="text"
              value={prepTime}
              onChange={e => setPrepTime(e.target.value)}
              placeholder="15 min"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cook time</label>
            <input
              type="text"
              value={cookTime}
              onChange={e => setCookTime(e.target.value)}
              placeholder="30 min"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Servings</label>
            <input
              type="text"
              value={servings}
              onChange={e => setServings(e.target.value)}
              placeholder="4"
              className={inputCls}
            />
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls + ' mb-0'}>Ingredients</label>
            <button
              onClick={addIngredient}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={ing.quantity}
                  onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                  placeholder="Qty"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-16 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="text"
                  value={ing.unit}
                  onChange={e => updateIngredient(i, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm w-20 focus:outline-none focus:border-brand-500"
                />
                <input
                  type="text"
                  value={ing.name}
                  onChange={e => updateIngredient(i, 'name', e.target.value)}
                  placeholder="Ingredient name"
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={() => removeIngredient(i)}
                  className="text-slate-400 hover:text-red-500 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls + ' mb-0'}>Steps</label>
            <button
              onClick={addStep}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              + Add step
            </button>
          </div>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs font-bold text-slate-400 mt-2 w-5 flex-shrink-0">{i + 1}.</span>
                <textarea
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  rows={2}
                  placeholder={`Step ${i + 1}`}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm flex-1 focus:outline-none focus:border-brand-500 resize-none"
                />
                <div className="flex flex-col gap-0.5 mt-1">
                  <button
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs"
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeStep(i)}
                    className="text-slate-400 hover:text-red-500 text-sm leading-none mt-0.5"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Tips, variations, storage info…"
            className={inputCls}
          />
        </div>

        {/* Tags */}
        <div>
          <label className={labelCls}>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="dessert, cookies, quick (comma-separated)"
            className={inputCls}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* Save button */}
      <div className="flex-shrink-0 p-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save to RecipeClip'}
        </button>
      </div>
    </div>
  );
}

// Injected into page context
function extractRecipeFromPage(): { recipe: unknown; imageUrl: string | null } | null {
  const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');

  function parseDuration(iso: string): string {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractImageUrl(img: any): string | null {
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (Array.isArray(img)) return extractImageUrl(img[0]);
    if (typeof img === 'object') return img.url || img.contentUrl || null;
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractSteps(instructions: any): string[] {
    if (!instructions) return [];
    if (typeof instructions === 'string') return [instructions];
    if (Array.isArray(instructions)) {
      return instructions.flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (item?.['@type'] === 'HowToStep') return [item.text || item.name || ''];
        if (item?.['@type'] === 'HowToSection') return extractSteps(item.itemListElement || item.steps || []);
        return [item?.text || item?.name || ''];
      }).filter(Boolean);
    }
    return [];
  }

  const UNITS = ['teaspoons','teaspoon','tablespoons','tablespoon','cups','cup','ounces','ounce','oz','pounds','pound','lb','lbs','grams','gram','g','kg','ml','liters','liter','l','pinch','cloves','clove','tsp','tbsp'];

  function parseIngredient(raw: string) {
    const qtyMatch = raw.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)/);
    const quantity = qtyMatch ? qtyMatch[1].trim() : '';
    const rest = quantity ? raw.slice(quantity.length).trim() : raw;
    const unitPattern = new RegExp(`^(${UNITS.join('|')})\\b`, 'i');
    const unitMatch = rest.match(unitPattern);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : '';
    const name = unit ? rest.slice(unit.length).trim().replace(/^,\s*/, '') : rest;
    return { name: name || raw, quantity, unit, raw };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function processRecipe(item: any) {
    if (!item || item['@type'] !== 'Recipe') return null;
    const title = item.name || '';
    if (!title) return null;
    return {
      title,
      description: item.description || '',
      servings: Array.isArray(item.recipeYield) ? item.recipeYield[0] : (item.recipeYield || ''),
      prep_time: parseDuration(item.prepTime || ''),
      cook_time: parseDuration(item.cookTime || ''),
      source_book_title: '',
      source_page_number: '',
      ingredients: Array.isArray(item.recipeIngredient) ? item.recipeIngredient.map((r: string) => parseIngredient(String(r))) : [],
      steps: extractSteps(item.recipeInstructions),
      notes: '',
      video_url: '',
    };
  }

  for (const tag of Array.from(scriptTags)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = JSON.parse(tag.textContent || '') as any;
      let recipe = null;
      let imageItem = null;

      if (data?.['@graph']) {
        for (const item of data['@graph']) {
          const r = processRecipe(item);
          if (r) { recipe = r; imageItem = item; break; }
        }
      } else if (Array.isArray(data)) {
        for (const item of data) {
          const r = processRecipe(item);
          if (r) { recipe = r; imageItem = item; break; }
        }
      } else {
        recipe = processRecipe(data);
        imageItem = data;
      }

      if (recipe) {
        const imageUrl = imageItem ? extractImageUrl(imageItem.image) : null;
        return { recipe, imageUrl };
      }
    } catch {
      // skip
    }
  }

  return null;
}
