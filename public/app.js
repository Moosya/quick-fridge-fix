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
    findBtn.textContent = 'Finding recipes…';

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
      renderRefinePanel();

    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      skeletonContainer.classList.add('hidden');
      findBtn.disabled = false;
      findBtn.textContent = 'Find Recipes';
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

  let currentStyles = new Set();
  let currentCuisine = null;
  let currentAvoid = '';

  function renderRecipes(recipes) {
    function renderIngredient(ing) {
      if (typeof ing === 'string') return escapeHtml(ing);
      const qty = ing.quantity ? ` <span class="chip-qty">${escapeHtml(ing.quantity)}</span>` : '';
      return escapeHtml(ing.item) + qty;
    }
    function renderStep(step) {
      if (typeof step === 'string') return `<li>${escapeHtml(step)}</li>`;
      let badges = '';
      if (step.temp) badges += ` <span class="step-badge step-badge-temp">🌡 ${escapeHtml(step.temp)}</span>`;
      if (step.duration) badges += ` <span class="step-badge step-badge-time">⏱ ${escapeHtml(step.duration)}</span>`;
      return `<li>${escapeHtml(step.instruction)}${badges}</li>`;
    }
    recipes.forEach((recipe, index) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.style.animationDelay = `${index * 0.08}s`;

      const usedChips = (recipe.ingredients_used || [])
        .map(item => `<span class="chip chip-have">${renderIngredient(item)}</span>`)
        .join('');

      const chefNote = recipe.chefNote
        ? `<p class="chef-note">${escapeHtml(recipe.chefNote)}</p>`
        : '';

      const missingSection = recipe.ingredients_missing && recipe.ingredients_missing.length > 0
        ? `<span class="section-title">Shopping list</span>
           <div class="chips-container">
             ${recipe.ingredients_missing.map(item => `<span class="chip chip-missing">${renderIngredient(item)}</span>`).join('')}
           </div>`
        : '';

      const stepsHtml = recipe.steps && recipe.steps.length > 0
        ? `<span class="section-title">How to make it</span>
           <ol class="steps-list">
             ${recipe.steps.map(step => renderStep(step)).join('')}
           </ol>`
        : '';

      card.innerHTML = `
        <h3>${escapeHtml(recipe.name)}</h3>
        ${chefNote}
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

  function renderRefinePanel() {
    // If panel already exists, just re-attach it (survives resultsContainer wipes)
    let panel = document.getElementById('refine-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'refine-panel';
      panel.className = 'refine-panel';
      panel.innerHTML = `
        <span class="section-title">Tweak it</span>
        <div style="margin-bottom: 12px;">
          <span class="section-title" style="margin-top:0;">Style (pick any):</span>
          <button class="style-btn" data-style="spicier">🌶️ Spicier</button>
          <button class="style-btn" data-style="healthier">🥗 Healthier</button>
          <button class="style-btn" data-style="heartier">🍝 Heartier</button>
        </div>
        <div style="margin-bottom: 12px;">
          <span class="section-title" style="margin-top:0;">Cuisine:</span>
          <button class="cuisine-btn" data-cuisine="italian">🇮🇹 Italian</button>
          <button class="cuisine-btn" data-cuisine="asian">🥢 Asian</button>
          <button class="cuisine-btn" data-cuisine="mexican">🌮 Mexican</button>
          <button class="cuisine-btn" data-cuisine="mediterranean">🫒 Mediterranean</button>
          <button class="cuisine-btn" data-cuisine="indian">🫙 Indian</button>
          <button class="cuisine-btn" data-cuisine="surprise">🎲 Surprise me</button>
        </div>
        <div style="margin-bottom: 12px;">
          <span class="section-title" style="margin-top:0;">Avoid:</span>
          <input type="text" id="avoid-input" class="avoid-input" placeholder="e.g. cilantro, nuts, dairy" maxlength="200">
        </div>
        <button id="regenerate-btn" class="regenerate-btn">↻ Try again</button>
      `;

      // Style buttons — multi-select toggle
      const styleBtns = panel.querySelectorAll('.style-btn');
      styleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const style = btn.dataset.style;
          if (currentStyles.has(style)) {
            currentStyles.delete(style);
            btn.classList.remove('active');
          } else {
            currentStyles.add(style);
            btn.classList.add('active');
          }
        });
      });

      // Cuisine buttons — single-select toggle
      const cuisineBtns = panel.querySelectorAll('.cuisine-btn');
      cuisineBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentCuisine === btn.dataset.cuisine) {
            currentCuisine = null;
            btn.classList.remove('active');
          } else {
            cuisineBtns.forEach(b => b.classList.remove('active'));
            currentCuisine = btn.dataset.cuisine;
            btn.classList.add('active');
          }
        });
      });

      // Avoid input handler
      const avoidInput = panel.querySelector('#avoid-input');
      avoidInput.addEventListener('input', (e) => {
        currentAvoid = e.target.value;
      });

      // Regenerate button handler
      panel.querySelector('#regenerate-btn').addEventListener('click', async () => {
        const ingredients = ingredientsInput.value.trim();
        const servings = parseInt(servingsInput.value, 10);

        errorMsgDiv.classList.add('hidden');
        findBtn.disabled = true;

        if (!ingredients) {
          showError('Please enter some ingredients to get started!');
          findBtn.disabled = false;
          return;
        }

        // Remove recipe cards but keep panel detached so it survives
        const existingPanel = document.getElementById('refine-panel');
        if (existingPanel) existingPanel.remove();
        resultsContainer.innerHTML = '';
        skeletonContainer.classList.remove('hidden');

        try {
          const body = { ingredients, servings };
          if (currentStyles.size > 0) body.styles = Array.from(currentStyles);
          if (currentCuisine) body.cuisine = currentCuisine;
          if (currentAvoid) body.avoid = currentAvoid;

          const response = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Request failed');
          }

          if (!data.recipes || data.recipes.length === 0) {
            throw new Error('No recipes returned. Try different ingredients!');
          }

          renderRecipes(data.recipes);
          renderRefinePanel();
        } catch (err) {
          showError(err.message || 'Something went wrong. Please try again.');
          renderRefinePanel();
        } finally {
          skeletonContainer.classList.add('hidden');
          findBtn.disabled = false;
        }
      });
    }

    resultsContainer.appendChild(panel);

    // Restore active state on style buttons after re-attach
    panel.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', currentStyles.has(btn.dataset.style));
    });
    panel.querySelectorAll('.cuisine-btn').forEach(btn => {
      btn.classList.toggle('active', currentCuisine === btn.dataset.cuisine);
    });
    const avoidInput = panel.querySelector('#avoid-input');
    if (avoidInput) avoidInput.value = currentAvoid || '';
  }
});
