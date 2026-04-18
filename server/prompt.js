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
  const { styles = [], cuisine, avoid } = options;

  const styleText = styles.length > 0
    ? ` Style preferences: make the recipes ${styles.map(s => STYLE_MAP[s]).filter(Boolean).join(' and ')}.`
    : '';

  const cuisineText = cuisine && CUISINE_MAP[cuisine]
    ? ` Cuisine direction: lean toward ${CUISINE_MAP[cuisine]} cuisine.`
    : '';

  const avoidText = avoid ? ` Do not use these ingredients: ${avoid}.` : '';

  return [
    {
      role: 'system',
      content: `You are a friendly chef. Your task is to generate exactly 3 dinner recipes based on the provided ingredients and serving count.\n\nYou must output ONLY valid JSON matching this exact schema:\n{\n  "recipes": [\n    {\n      "name": "Recipe Name",\n      "cookTime": "25 minutes",\n      "servings": 2,\n      "ingredients_used": ["chicken", "garlic"],\n      "ingredients_missing": ["lemon"],\n      "steps": ["Step 1 text", "Step 2 text", "Step 3 text"]\n    }\n  ]\n}\n\nRules:\n1. Always return exactly 3 recipes.\n2. Steps should be clear and beginner-friendly.\n3. ingredients_used should list items found in the user's input that are used in the recipe.\n4. ingredients_missing should list essential items not provided by the user to complete the dish (if any).\n5. Do NOT include markdown formatting around the output.`
    },
    {
      role: 'user',
      content: `Ingredients available: "${ingredients}". Number of servings needed: ${servings}. Create 3 dinner recipes.${styleText}${cuisineText}${avoidText}`
    }
  ];
}

module.exports = { buildPrompt, STYLE_MAP, CUISINE_MAP };
