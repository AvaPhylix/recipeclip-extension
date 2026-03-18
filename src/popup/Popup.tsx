import React, { useEffect, useState } from 'react';
import { getAuth } from '../shared/auth';
import { saveRecipe, checkDuplicate } from '../shared/api';
import type { ParsedRecipe, AuthState } from '../shared/types';

type State =
  | 'loading'
  | 'not-signed-in'
  | 'no-recipe'
  | 'preview'
  | 'saving'
  | 'saved'
  | 'error';

export function Popup() {
  const [state, setState] = useState<State>('loading');
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [recipe, setRecipe] = useState<ParsedRecipe | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [savedId, setSavedId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string>('');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const authData = await getAuth();
    if (!authData) {
      setState('not-signed-in');
      return;
    }
    setAuthState(authData);

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id;
    const url = tab?.url || '';
    setSourceUrl(url);

    if (!tabId) {
      setState('no-recipe');
      return;
    }

    // Execute script in current tab to extract recipe
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractRecipeFromPage,
      });

      const result = results?.[0]?.result;
      if (result?.recipe) {
        setRecipe(result.recipe);
        setImageUrl(result.imageUrl);

        // Check for duplicate
        const dupCheck = await checkDuplicate(url, authData.access_token);
        if (dupCheck.exists && dupCheck.recipeId) {
          setIsDuplicate(true);
          setDuplicateId(dupCheck.recipeId);
        }

        setState('preview');
      } else {
        setState('no-recipe');
      }
    } catch (err) {
      console.error('Script injection failed:', err);
      setState('no-recipe');
    }
  }

  async function handleSave() {
    if (!recipe || !auth) return;
    setState('saving');
    try {
      const result = await saveRecipe(recipe, imageUrl, sourceUrl, auth.access_token);
      setSavedId(result.id);
      setState('saved');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }

  function handleEditBeforeSaving() {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    window.close();
  }

  function handleSignIn() {
    const extensionId = chrome.runtime.id;
    chrome.tabs.create({
      url: `https://recipeclip.app/auth?extension=1&extensionId=${extensionId}`,
    });
    window.close();
  }

  function handleRetry() {
    setState('loading');
    init();
  }

  if (state === 'loading') {
    return (
      <div className="w-[360px] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Detecting recipe…</p>
        </div>
      </div>
    );
  }

  if (state === 'not-signed-in') {
    return (
      <div className="w-[360px] p-6 flex flex-col items-center gap-4">
        <div className="text-3xl">📎</div>
        <div className="text-center">
          <h2 className="font-bold text-slate-800 text-lg">RecipeClip</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in to save recipes from any website</p>
        </div>
        <button
          onClick={handleSignIn}
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
        >
          Sign in to RecipeClip
        </button>
      </div>
    );
  }

  if (state === 'no-recipe') {
    return (
      <div className="w-[360px] p-6 flex flex-col items-center gap-4">
        <div className="text-3xl">🍽️</div>
        <div className="text-center">
          <h2 className="font-semibold text-slate-700">No recipe found on this page</h2>
          <p className="text-sm text-slate-500 mt-1">This page doesn't have structured recipe data.</p>
        </div>
        <a
          href="https://recipeclip.app/add/url"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:text-brand-700 underline"
        >
          Try importing the URL manually →
        </a>
      </div>
    );
  }

  if (state === 'preview' && recipe) {
    return (
      <div className="w-[360px] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">📎</span>
            <span className="font-bold text-slate-800 text-sm">RecipeClip</span>
          </div>
        </div>

        {/* Recipe preview */}
        <div className="p-4 flex flex-col gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={recipe.title}
              className="w-full h-40 object-cover rounded-lg"
            />
          )}

          <div>
            <h2 className="font-bold text-slate-800 leading-tight">{recipe.title}</h2>
            {recipe.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{recipe.description}</p>
            )}
          </div>

          {/* Meta */}
          <div className="flex gap-3 text-xs text-slate-600">
            {recipe.prep_time && (
              <span>⏱ Prep: {recipe.prep_time}</span>
            )}
            {recipe.cook_time && (
              <span>🔥 Cook: {recipe.cook_time}</span>
            )}
            {recipe.servings && (
              <span>👥 {recipe.servings}</span>
            )}
          </div>

          <div className="flex gap-3 text-xs text-slate-500">
            {recipe.ingredients.length > 0 && (
              <span>{recipe.ingredients.length} ingredients</span>
            )}
            {recipe.steps.length > 0 && (
              <span>{recipe.steps.length} steps</span>
            )}
          </div>

          {/* Duplicate warning */}
          {isDuplicate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠️ This recipe is already in your library.{' '}
              <a
                href={`https://recipeclip.app/recipes/${duplicateId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                View it →
              </a>
            </div>
          )}

          {/* Actions */}
          <button
            onClick={handleSave}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
          >
            Save to RecipeClip
          </button>

          <button
            onClick={handleEditBeforeSaving}
            className="w-full py-2 px-4 border border-slate-200 hover:border-brand-600 hover:text-brand-600 text-slate-600 font-medium rounded-lg transition-colors text-sm"
          >
            Edit before saving
          </button>
        </div>
      </div>
    );
  }

  if (state === 'saving') {
    return (
      <div className="w-[360px] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Saving…</p>
        </div>
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <div className="w-[360px] p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="font-bold text-slate-800">Recipe saved!</h2>
          <p className="text-sm text-slate-500 mt-1">{recipe?.title}</p>
        </div>
        <a
          href={`https://recipeclip.app/recipes/${savedId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          View Recipe →
        </a>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-[360px] p-6 flex flex-col items-center gap-4">
        <div className="text-3xl">❌</div>
        <div className="text-center">
          <h2 className="font-semibold text-slate-700">Something went wrong</h2>
          <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={handleRetry}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return null;
}

// This function runs inside the page context (injected via executeScript)
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
