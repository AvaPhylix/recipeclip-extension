import { setAuth, clearAuth } from '../shared/auth';
import type { ExtensionMessage } from '../shared/types';

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'recipeclip-save',
    title: '📎 Save Recipe to RecipeClip',
    contexts: ['page', 'selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'recipeclip-save' && tab?.id) {
    chrome.action.openPopup();
  }
});

// Message handler
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN') {
    setAuth({
      access_token: message.access_token,
      refresh_token: message.refresh_token,
      email: message.email,
      user_id: message.user_id,
      expires_at: message.expires_at,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'SIGN_OUT') {
    clearAuth().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && tabs[0]?.windowId) {
        chrome.sidePanel.open({ windowId: tabs[0].windowId });
      }
    });
    sendResponse({ ok: true });
    return true;
  }
});

// Badge update from content script
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender) => {
  if (message.type === 'RECIPE_DETECTED' && sender.tab?.id) {
    chrome.action.setBadgeText({ text: '✓', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#16a34a', tabId: sender.tab.id });
  }
  if (message.type === 'NO_RECIPE' && sender.tab?.id) {
    chrome.action.setBadgeText({ text: '', tabId: sender.tab.id });
  }
});

// Auth handoff from recipeclip.app web app
chrome.runtime.onMessageExternal.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN') {
    setAuth({
      access_token: message.access_token,
      refresh_token: message.refresh_token,
      email: message.email,
      user_id: message.user_id,
      expires_at: message.expires_at,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
