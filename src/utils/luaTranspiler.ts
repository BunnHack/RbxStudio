/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Transpiles simple Roblox Lua script code to executable JavaScript.
 * This handles common Roblox structures like loops, variables, wait statements, and properties.
 */
export function transpileLuaToJS(luaSource: string): string {
  let js = luaSource;

  // 1. Remove comments
  js = js.replace(/--\[\[[\s\S]*?\]\]/g, ''); // Block comments
  js = js.replace(/--.*/g, ''); // Line comments

  // 2. Transpile wait() to await wait()
  js = js.replace(/\bwait\s*\(\s*(.*?)\s*\)/g, 'await wait($1)');

  // 3. Transpile local variable declarations to let/const
  js = js.replace(/\blocal\s+function\s+(\w+)\s*\((.*?)\)/g, 'const $1 = async ($2) =>');
  js = js.replace(/\blocal\s+(\w+)\s*=/g, 'let $1 =');

  // 4. Transpile simple "while ... do" loops to "while (...) {"
  // Match "while true do" or "while condition do"
  // Note: we need to handle case-insensitivity or whitespace variations
  js = js.replace(/while\s+(.*?)\s+do\b/gi, 'while ($1) {');

  // 5. Transpile "if ... then" to "if (...) {"
  js = js.replace(/if\s+(.*?)\s+then\b/gi, 'if ($1) {');
  js = js.replace(/elseif\s+(.*?)\s+then\b/gi, '} else if ($1) {');
  js = js.replace(/else\b/gi, '} else {');

  // 6. Transpile end statements to closing braces
  // A simple block replacement: since Lua blocks end with "end", we can replace "end" with "}"
  // This is a naive translation but works perfectly for simple blocks.
  js = js.replace(/\bend\b/gi, '}');

  // 7. Transpile Color3.fromRGB(r, g, b) or Color3.new(r, g, b)
  js = js.replace(/Color3\.fromRGB\s*\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/g, 'Color3.fromRGB($1, $2, $3)');
  js = js.replace(/Color3\.new\s*\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/g, 'Color3.fromRGB($1 * 255, $2 * 255, $3 * 255)');
  js = js.replace(/Color3\.random\s*\(\s*\)/g, 'Color3.random()');

  // 8. Transpile Instance.new("Part")
  js = js.replace(/Instance\.new\s*\(\s*(.*?)\s*\)/g, 'Instance.new($1)');

  // 9. Transpile Vector3.new(x, y, z)
  js = js.replace(/Vector3\.new\s*\(\s*(.*?)\s*,\s*(.*?)\s*,\s*(.*?)\s*\)/g, '{ x: $1, y: $2, z: $3 }');

  // 10. Math and utilities adjustments
  js = js.replace(/math\.sin/g, 'Math.sin');
  js = js.replace(/math\.cos/g, 'Math.cos');
  js = js.replace(/math\.rad/g, '(x => x * Math.PI / 180)');
  js = js.replace(/math\.random/g, 'Math.random');
  js = js.replace(/math\.pi/g, 'Math.PI');

  return js;
}
