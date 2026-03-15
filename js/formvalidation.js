/* ============================================================
   FormValidation — Lightweight form validation helpers
   ============================================================ */

const FormValidation = {
  /**
   * Validate a form element or set of inputs.
   * @param {string} formSelector - CSS selector for the form/container
   * @param {object} rules - { fieldId: { required, minLength, maxLength, pattern, patternMsg, custom } }
   * @returns {{ valid: boolean, errors: {fieldId: string}[] }}
   */
  validate(formSelector, rules) {
    const form = document.querySelector(formSelector);
    if (!form) return { valid: true, errors: [] };

    const errors = [];

    // Clear previous errors
    form.querySelectorAll('.form-error-msg').forEach(el => el.remove());
    form.querySelectorAll('.form-input-error').forEach(el => el.classList.remove('form-input-error'));

    Object.entries(rules).forEach(([fieldId, rule]) => {
      const input = form.querySelector(`#${fieldId}`) || form.querySelector(`[name="${fieldId}"]`);
      if (!input) return;

      const value = (input.value || '').trim();
      let errorMsg = null;

      if (rule.required && !value) {
        errorMsg = rule.requiredMsg || 'This field is required';
      } else if (value && rule.minLength && value.length < rule.minLength) {
        errorMsg = `Must be at least ${rule.minLength} characters`;
      } else if (value && rule.maxLength && value.length > rule.maxLength) {
        errorMsg = `Must be at most ${rule.maxLength} characters`;
      } else if (value && rule.pattern && !rule.pattern.test(value)) {
        errorMsg = rule.patternMsg || 'Invalid format';
      } else if (value && rule.custom) {
        errorMsg = rule.custom(value);
      }

      if (errorMsg) {
        errors.push({ fieldId, message: errorMsg });
        input.classList.add('form-input-error');

        const errEl = document.createElement('div');
        errEl.className = 'form-error-msg';
        errEl.style.cssText = 'color:var(--danger);font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;';
        errEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${errorMsg}`;

        const group = input.closest('.form-group');
        if (group) {
          group.appendChild(errEl);
        } else {
          input.parentNode.insertBefore(errEl, input.nextSibling);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  },

  /**
   * Add real-time validation to an input.
   * @param {string} inputId - Input element ID
   * @param {Function} validator - (value) => errorMsg|null
   */
  live(inputId, validator) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const check = () => {
      const value = (input.value || '').trim();
      const error = validator(value);

      // Remove previous error
      const prev = input.parentNode.querySelector('.form-error-msg');
      if (prev) prev.remove();
      input.classList.remove('form-input-error');

      if (error) {
        input.classList.add('form-input-error');
        const errEl = document.createElement('div');
        errEl.className = 'form-error-msg';
        errEl.style.cssText = 'color:var(--danger);font-size:11px;margin-top:4px;';
        errEl.textContent = error;
        const group = input.closest('.form-group');
        if (group) group.appendChild(errEl);
        else input.parentNode.insertBefore(errEl, input.nextSibling);
      }
    };

    input.addEventListener('blur', check);
    input.addEventListener('input', () => {
      // Clear error on typing
      input.classList.remove('form-input-error');
      const prev = input.parentNode?.querySelector('.form-error-msg') || input.closest('.form-group')?.querySelector('.form-error-msg');
      if (prev) prev.remove();
    });
  }
};
