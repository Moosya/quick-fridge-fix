document.addEventListener('DOMContentLoaded', () => {
  const ingredientsInput = document.getElementById('ingredients');
  const servingsInput = document.getElementById('servings');
  const decreaseBtn = document.getElementById('decrease-btn');
  const increaseBtn = document.getElementById('increase-btn');
  const findBtn = document.getElementById('find-btn');
  const skeletonContainer = document.getElementById('skeleton');
  const resultsContainer = document.getElementById('results');
  const errorMsgDiv = document.getElementById('error-msg');

  function updateServings(value) {
    let val = parseInt(value, 10);
    if (isNaN(val)) val = 2;
    if (val < 1) val = 1;
    if (val > 20) val = 20;
    servingsInput.value = val;
  }

  decreaseBtn.addEventListener('click', () => updateServings(parseInt(servingsInput.value, 10) - 1));
  increaseBtn.addEventListener('click', () => updateServings(parseInt(servingsInput.value, 10) + 1));

  findBtn.addEventListener('click', async () => {
    const ingredients = ingredientsInput.value.trim();
    const servings = parseInt(servingsInput.value, 10);

    errorMsgDiv.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    resultsContainer.innerHTML = '';

    if (!ingredients) {
      showError('Please enter some ingredients to get started!');
      return;
    }

    skeletonContainer.classList.remove('hidden');
    findBtn.disabled = true;

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, servings })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (!data.recipes || data.recipes.length === 0) {
        throw new Error('No recipes returned. Try different ingredients!');
      }

      renderRecipes(data.recipes);

    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      skeletonContainer.classList.add('hidden');
      findBtn.disabled = false;
    }
  });

  function showError(msg) {
    errorMsgDiv.textContent = msg;
    errorMsgDiv.classList.remove('hidden');
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function renderRecipes(recipes) {
    recipes.forEach((recipe, index) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.style.animationDelay = `${index * 0.08}s`;

      const usedChips = (recipe.ingredients_used || [])
        .map(item => `<span class="chip chip-have">${escapeHtml(item)}</span>`)
        .join('');

      const missingSection = recipe.ingredients_missing && recipe.ingredients_missing.length > 0
        ? `<span class="section-title">Shopping list</span>
           <div class="chips-container">
             ${recipe.ingredients_missing.map(item => `<span class="chip chip-missing">${escapeHtml(item)}</span>`).join('')}
           </div>`
        : '';

      const stepsHtml = recipe.steps && recipe.steps.length > 0
        ? `<span class="section-title">How to make it</span>
           <ol class="steps-list">
             ${recipe.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
           </ol>`
        : '';

      card.innerHTML = `
        <h3>${escapeHtml(recipe.name)}</h3>
        <span class="badge">⏱ ${escapeHtml(recipe.cookTime)}</span>
        <span class="section-title">Ingredients you have</span>
        <div class="chips-container">${usedChips}</div>
        ${missingSection}
        ${stepsHtml}
      `;

      resultsContainer.appendChild(card);
    });

    resultsContainer.classList.remove('hidden');
  }
});
