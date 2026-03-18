import { extractRecipeFromJsonLd, extractImageFromJsonLd } from '../shared/json-ld';

function detect() {
  const html = document.documentElement.outerHTML;
  const recipe = extractRecipeFromJsonLd(html);
  const imageUrl = extractImageFromJsonLd(html);

  if (recipe?.title) {
    chrome.runtime.sendMessage({
      type: 'RECIPE_DETECTED',
      recipe,
      imageUrl,
      sourceUrl: window.location.href,
    });
  } else {
    chrome.runtime.sendMessage({ type: 'NO_RECIPE' });
  }
}

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detect);
} else {
  detect();
}
