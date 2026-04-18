/**
 * QFF-006: buildPrompt household profiles tests
 */
process.env.DB_PATH = ':memory:';

const { buildPrompt } = require('../server/prompt');

describe('buildPrompt household profiles', () => {
  test('no householdProfiles option → user message has no household text', () => {
    const msgs = buildPrompt('chicken', 2);
    const userMsg = msgs.find(m => m.role === 'user').content;
    expect(userMsg).not.toContain('This meal is for');
  });

  test('empty householdProfiles array → user message has no household text', () => {
    const msgs = buildPrompt('chicken', 2, { householdProfiles: [] });
    const userMsg = msgs.find(m => m.role === 'user').content;
    expect(userMsg).not.toContain('This meal is for');
  });

  test('one profile with no flags → includes name + "no restrictions"', () => {
    const msgs = buildPrompt('chicken', 2, { householdProfiles: [{ name: 'John', dietary_flags: [] }] });
    const userMsg = msgs.find(m => m.role === 'user').content;
    expect(userMsg).toContain('This meal is for');
    expect(userMsg).toContain('John (no restrictions)');
  });

  test('one profile with flags → includes name and flags', () => {
    const msgs = buildPrompt('chicken', 2, { householdProfiles: [{ name: 'Mia', dietary_flags: ['vegetarian', 'nut-free'] }] });
    const userMsg = msgs.find(m => m.role === 'user').content;
    expect(userMsg).toContain('Mia (vegetarian, nut-free)');
  });

  test('two profiles → includes both names', () => {
    const msgs = buildPrompt('chicken', 2, {
      householdProfiles: [
        { name: 'John', dietary_flags: ['vegetarian'] },
        { name: 'Jane', dietary_flags: [] }
      ]
    });
    const userMsg = msgs.find(m => m.role === 'user').content;
    expect(userMsg).toContain('John (vegetarian)');
    expect(userMsg).toContain('Jane (no restrictions)');
    expect(userMsg).toContain('All recipes must work for everyone listed');
  });

  test('picky-eater flag → includes hiding/swapping language', () => {
    const msgs = buildPrompt('pasta', 4, { householdProfiles: [{ name: 'Jake', dietary_flags: ['picky-eater'] }] });
    const userMsg = msgs.find(m => m.role === 'user').content;
    expect(userMsg).toContain('picky eater');
    expect(userMsg).toMatch(/hide or swap/i);
  });
});
