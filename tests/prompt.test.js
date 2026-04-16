const { buildPrompt } = require('../server/prompt');

describe('buildPrompt', () => {
  test('returns array with system and user message objects', () => {
    const result = buildPrompt('chicken, rice', 2);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    const roles = result.map(m => m.role);
    expect(roles).toContain('system');
    expect(roles).toContain('user');
  });

  test('user message includes the ingredients string', () => {
    const result = buildPrompt('tomatoes, basil', 2);
    const userMsg = result.find(m => m.role === 'user');
    expect(userMsg.content).toContain('tomatoes, basil');
  });

  test('user message includes the servings number', () => {
    const result = buildPrompt('pasta', 4);
    const userMsg = result.find(m => m.role === 'user');
    expect(userMsg.content).toContain('4');
  });

  test('system message instructs JSON output with required schema keys', () => {
    const result = buildPrompt('stuff', 1);
    const sysMsg = result.find(m => m.role === 'system');
    expect(sysMsg.content).toContain('JSON');
    expect(sysMsg.content).toContain('recipes');
    expect(sysMsg.content).toContain('ingredients_used');
    expect(sysMsg.content).toContain('3 recipes');
  });
});
