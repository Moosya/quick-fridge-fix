const STYLE_MAP = {
  spicier: 'spicier and bolder',
  healthier: 'lighter and healthier',
  heartier: 'more filling and hearty',
};

const CUISINE_MAP = {
  italian: 'Italian',
  asian: 'Asian',
  mexican: 'Mexican',
  mediterranean: 'Mediterranean',
  indian: 'Indian',
  surprise: 'a surprising and unexpected',
};

function buildPrompt(ingredients, servings, options = {}) {
  const { styles = [], cuisine, avoid, householdProfiles } = options;

  const styleText = styles.length > 0
    ? ` Style preferences: make the recipes ${styles.map(s => STYLE_MAP[s]).filter(Boolean).join(' and ')}.`
    : '';

  const cuisineText = cuisine && CUISINE_MAP[cuisine]
    ? ` Cuisine direction: lean toward ${CUISINE_MAP[cuisine]} cuisine.`
    : '';

  const avoidText = avoid ? ` Do not use these ingredients: ${avoid}.` : '';

  let householdText = '';
  if (householdProfiles && householdProfiles.length > 0) {
    const profileList = householdProfiles.map(p => {
      const flags = (p.dietary_flags || []);
      const flagStr = flags.length > 0 ? flags.join(', ') : 'no restrictions';
      return `${p.name} (${flagStr})`;
    }).join(', ');
    householdText = ` This meal is for: ${profileList}. All recipes must work for everyone listed.`;
    const hasPickyEater = householdProfiles.some(p => (p.dietary_flags || []).includes('picky-eater'));
    if (hasPickyEater) {
      householdText += ' For picky eaters, suggest ways to hide or swap the problematic ingredient.';
    }
  }

  return [
    {
      role: 'system',
      content: `You are a skilled home cook writing recipes for real people. Generate exactly 3 dinner recipes based on the provided ingredients and serving count.\n\nYou must output ONLY valid JSON matching this exact schema:\n{\n  "recipes": [\n    {\n      "name": "Recipe Name",\n      "cookTime": "25 minutes",\n      "servings": 2,\n      "chefNote": "One practical tip or why this combination works — max 2 sentences.",\n      "ingredients_used": [\n        { "item": "chicken breast", "quantity": "2 pieces (approx. 300g each)" }\n      ],\n      "ingredients_missing": [\n        { "item": "lemon", "quantity": "1, juiced" }\n      ],\n      "steps": [\n        { "instruction": "Season chicken with 1 tsp salt and ½ tsp pepper.", "temp": null, "duration": null },\n        { "instruction": "Heat olive oil in a skillet over medium-high heat.", "temp": "medium-high (180°C / 350°F)", "duration": null },\n        { "instruction": "Cook chicken until golden and cooked through.", "temp": null, "duration": "6–7 min per side" }\n      ]\n    }\n  ]\n}\n\nRules:\n1. Always return exactly 3 recipes.\n2. Every ingredient must have a specific quantity (weight, volume, or count). Never say just "chicken" — say "500g chicken breast".\n3. Every step involving heat must include a temp field with both °C and °F.\n4. Every timed step must include a duration field.\n5. Steps with no heat and no timing should have null for both temp and duration.\n6. chefNote must be 1–2 sentences max — practical insight or flavour tip, not obvious filler.\n7. ingredients_used lists items from the user's input used in the recipe (as objects with item + quantity).\n8. ingredients_missing lists essential items the user didn't provide (as objects with item + quantity).\n9. Do NOT include markdown formatting around the output.`
    },
    {
      role: 'user',
      content: `Ingredients available: "${ingredients}". Number of servings needed: ${servings}. Create 3 dinner recipes.${styleText}${cuisineText}${avoidText}${householdText}`
    }
  ];
}

module.exports = { buildPrompt, STYLE_MAP, CUISINE_MAP };
