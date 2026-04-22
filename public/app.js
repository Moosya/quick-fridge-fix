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
      const recipeBody = { ingredients, servings };
      const activeProfiles = householdProfiles.filter(p => activeProfileIds.has(p.id));
      if (householdActive && activeProfiles.length > 0) recipeBody.householdProfiles = activeProfiles;

      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (!data.recipes || data.recipes.length === 0) {
        throw new Error('No recipes returned. Try different ingredients!');
      }

      const usingHousehold = householdActive && activeProfiles.length > 0;
      renderRecipes(data.recipes, usingHousehold);
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
  let householdProfiles = [];       // loaded from API
  let activeProfileIds = new Set(); // toggled on/off temporarily
  let householdActive = false;      // true when user is logged in + profiles loaded

  function renderRecipes(recipes, showWorksForAll = false) {
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

      const worksForAllBadge = showWorksForAll
        ? `<span class="badge badge-household">✓ Works for everyone</span>`
        : '';

      card.innerHTML = `
        <h3>${escapeHtml(recipe.name)}</h3>
        ${chefNote}
        <span class="badge">⏱ ${escapeHtml(recipe.cookTime)}</span>${worksForAllBadge}
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
          const activeProfiles = householdProfiles.filter(p => activeProfileIds.has(p.id));
          if (householdActive && activeProfiles.length > 0) body.householdProfiles = activeProfiles;

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

          const usingHousehold = householdActive && activeProfiles.length > 0;
          renderRecipes(data.recipes, usingHousehold);
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

  // ── QFF-006: Household / Who's eating ──────────────────────────────────

  const VALID_FLAGS = ['vegetarian','vegan','gluten-free','dairy-free','nut-free','halal','kosher','pescatarian','low-carb','picky-eater'];
  const FLAG_LABELS = {
    'vegetarian': '🌿 Vegetarian', 'vegan': '🌱 Vegan', 'gluten-free': '🌾 Gluten-free',
    'dairy-free': '🥛 Dairy-free', 'nut-free': '🥜 Nut-free', 'halal': '☪️ Halal',
    'kosher': '✡️ Kosher', 'pescatarian': '🐟 Pescatarian', 'low-carb': '🥑 Low-carb',
    'picky-eater': '😤 Picky eater'
  };

  const householdSection = document.getElementById('household-section');
  const householdNudge = document.getElementById('household-nudge');
  const profileChipsContainer = document.getElementById('profile-chips');
  const addPersonBtn = document.getElementById('add-person-btn');
  const addPersonForm = document.getElementById('add-person-form');
  const personNameInput = document.getElementById('person-name');
  const flagCheckboxesDiv = document.getElementById('flag-checkboxes');
  const savePersonBtn = document.getElementById('save-person-btn');
  const cancelPersonBtn = document.getElementById('cancel-person-btn');
  const signinNudgeLink = document.getElementById('signin-nudge-link');

  // Build flag checkboxes
  VALID_FLAGS.forEach(flag => {
    const label = document.createElement('label');
    label.className = 'flag-checkbox-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = flag;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(FLAG_LABELS[flag]));
    flagCheckboxesDiv.appendChild(label);
  });

  function renderProfileChips() {
    profileChipsContainer.innerHTML = '';
    householdProfiles.forEach(profile => {
      const chip = document.createElement('span');
      chip.className = 'profile-chip' + (activeProfileIds.has(profile.id) ? '' : ' inactive');
      const flagStr = profile.dietary_flags && profile.dietary_flags.length > 0
        ? profile.dietary_flags.join(', ')
        : 'no restrictions';
      chip.innerHTML = `<span class="chip-name">${escapeHtml(profile.name)} · ${escapeHtml(flagStr)}</span>`
        + ` <span class="chip-remove" data-id="${profile.id}" title="Remove">×</span>`;

      // Toggle active on chip body click
      chip.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip-remove')) return;
        if (activeProfileIds.has(profile.id)) {
          activeProfileIds.delete(profile.id);
        } else {
          activeProfileIds.add(profile.id);
        }
        renderProfileChips();
      });

      // Remove profile on × click
      chip.querySelector('.chip-remove').addEventListener('click', async () => {
        await fetch(`/api/household/${profile.id}`, { method: 'DELETE' });
        await loadHouseholdProfiles();
      });

      profileChipsContainer.appendChild(chip);
    });
  }

  async function loadHouseholdProfiles() {
    try {
      const res = await fetch('/api/household');
      if (res.status === 401) return;
      const data = await res.json();
      householdProfiles = data.profiles || [];
      // Add new profiles to activeSet by default
      householdProfiles.forEach(p => activeProfileIds.add(p.id));
      renderProfileChips();
    } catch (e) { /* silent */ }
  }

  addPersonBtn.addEventListener('click', () => {
    addPersonForm.classList.toggle('hidden');
    personNameInput.focus();
  });

  cancelPersonBtn.addEventListener('click', () => {
    addPersonForm.classList.add('hidden');
    personNameInput.value = '';
    flagCheckboxesDiv.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
  });

  savePersonBtn.addEventListener('click', async () => {
    const name = personNameInput.value.trim();
    if (!name) { personNameInput.focus(); return; }
    const flags = Array.from(flagCheckboxesDiv.querySelectorAll('input:checked')).map(cb => cb.value);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dietary_flags: flags })
      });
      if (res.ok) {
        personNameInput.value = '';
        flagCheckboxesDiv.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
        addPersonForm.classList.add('hidden');
        await loadHouseholdProfiles();
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to add person');
      }
    } catch (e) {
      showError('Failed to add person');
    }
  });

  if (signinNudgeLink) {
    signinNudgeLink.addEventListener('click', (e) => {
      e.preventDefault();
      const email = prompt('Enter your email to sign in:');
      if (!email) return;
      fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(r => r.json()).then(d => {
        if (d.sent) alert('Check your email for a magic link!');
        else alert(d.error || 'Failed to send magic link');
      });
    });
  }

  // Init: check auth status and show/hide household section
  async function initHousehold() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        householdActive = true;
        householdSection.classList.remove('hidden');
        await loadHouseholdProfiles();
      } else {
        householdNudge.classList.remove('hidden');
      }
    } catch (e) { /* silent */ }
  }

  initHousehold();

  // QFF-008: Build version footer
  fetch('/api/version')
    .then(r => r.json())
    .then(d => {
      const el = document.getElementById('build-version');
      if (el) el.textContent = 'build: ' + d.build;
    })
    .catch(() => {});
});
