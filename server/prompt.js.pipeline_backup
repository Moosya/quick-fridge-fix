function buildPrompt(ingredients, servings) {
  return [
    {
      role: 'system',
      content: `You are a friendly chef. Your task is to generate exactly 3 dinner recipes based on the provided ingredients and serving count.\n\nYou must output ONLY valid JSON matching this exact schema:\n{\n  "recipes": [\n    {\n      "name": "Recipe Name",\n      "cookTime": "25 minutes",\n      "servings": 2,\n      "ingredients_used": ["chicken", "garlic"],\n      "ingredients_missing": ["lemon"],\n      "steps": ["Step 1 text", "Step 2 text", "Step 3 text"]\n    }\n  ]\n}\n\nRules:\n1. Always return exactly 3 recipes.\n2. Steps should be clear and beginner-friendly.\n3. ingredients_used should list items found in the user's input that are used in the recipe.\n4. ingredients_missing should list essential items not provided by the user to complete the dish (if any).\n5. Do NOT include markdown formatting around the output.`
    },
    {
      role: 'user',
      content: `Ingredients available: "${ingredients}". Number of servings needed: ${servings}. Create 3 dinner recipes.`
    }
  ];
}

module.exports = { buildPrompt };
