// ──────────────────────────────────────────────────────────────────
//  Backward-compatibility shim
//  Re-exports from the new service location.
//  Existing imports from this path will continue to work.
//
//  LEGACY SUPPORT: The old callGemini(apiKey, prompt, opts) and
//  testApiKey(apiKey) signatures are maintained here. New code should
//  import directly from "../services/geminiClient" which uses the
//  cleaner callGemini(prompt, opts) signature with automatic key resolution.
// ──────────────────────────────────────────────────────────────────

import {
  callGemini as _callGemini,
  callGeminiJSON,
  parseGeminiJSON,
  testApiKey as _testApiKey,
  getApiKey,
  setApiKey,
  hasApiKey,
} from "../services/geminiClient";

/**
 * Legacy wrapper — accepts (apiKey, prompt, opts) signature.
 * Sets the manual key and delegates to the new service.
 */
export async function callGemini(apiKey, prompt, opts = {}) {
  if (apiKey) setApiKey(apiKey);
  return _callGemini(prompt, opts);
}

/**
 * Legacy wrapper — accepts (apiKey) signature.
 */
export async function testApiKey(apiKey) {
  return _testApiKey(apiKey);
}

// Re-export new utilities directly
export { callGeminiJSON, parseGeminiJSON, getApiKey, setApiKey, hasApiKey };
