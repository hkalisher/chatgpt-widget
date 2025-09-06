(() => {
  const WIDGET_CLASS = 'nice-faq';
  const sel = (root, q) => root.querySelector(q);

  function mdLite(text) {
    // Lightweight formatting: **bold** + paragraph breaks
    return text
      .replace(/(\*\*)(.+?)\1/g, '<strong>$2</strong>')
      .replace(/\n{2,}/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  function build(container) {
    const endpoint = container.dataset.endpoint;
    if (!endpoint) {
      container.innerHTML = '<div class="nice-error">Missing data-endpoint on widget.</div>';
      return;
    }

    // Questions config (array of {label, prompt})
    let questions = [];
    try { questions = JSON.parse(container.dataset.questions || '[]'); }
    catch { /* ignore */ }

    if (!questions.length) {
      // Safe defaults (replace with your own!)
      questions = [
        { label: 'Where is my order?', prompt: 'Where is my order? Keep it concise and friendly.' },
        { label: 'Return policy', prompt: 'What is your return policy? Summarize in 3-4 lines.' },
        { label: 'Shipping times', prompt: 'How long does shipping take within the US?' }
      ];
    }

    // Cache answers in-memory + localStorage for this session
    const cacheKey = (label) => `niceFaq:${label}`;
    const getCached = (label) => localStorage.getItem(cacheKey(label));
    const setCached = (label, val) => localStorage.setItem(cacheKey(label), val);

    container.classList.add('nice-faq-widget');
    container.innerHTML = `
      <div class="${WIDGET_CLASS}" role="region" aria-label="NICE FAQ Assistant">
        <div class="nice-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3c-4.97 0-9 3.58-9 8 0 2.53 1.37 4.77 3.5 6.22V21l3.2-1.77c.72.13 1.47.2 2.3.2 4.97 0 9-3.58 9-8S16.97 3 12 3z" stroke="currentColor" stroke-width="1.5"/></svg>
          <span>Need help?</span>
        </div>
        <div class="nice-qs" role="list"></div>
        <div class="nice-body">
          <div class="nice-answer nice-muted" aria-live="polite">Pick a question to see the answer.</div>
        </div>
        <div class="nice-footer">
          <button class="nice-clear" type="button" aria-label="Clear answer">Clear</button>
          <button class="nice-copy" type="button" aria-label="Copy answer">Copy</button>
        </div>
      </div>
    `;

    const qsWrap = sel(container, '.nice-qs');
    const answer = sel(container, '.nice-answer');
    const copyBtn = sel(container, '.nice-copy');
    const clearBtn = sel(container, '.nice-clear');

    function setLoading(on) {
      const btns = [...qsWrap.querySelectorAll('button')];
      btns.forEach(b => b.disabled = !!on);
      if (on) answer.innerHTML = `<span class="nice-spinner"></span><span>Thinking…</span>`;
      else if (!answer.textContent.trim()) answer.innerHTML = `<span class="nice-muted">Pick a question to see the answer.</span>`;
    }

    async function ask(q) {
      const cached = getCached(q.label);
      if (cached) {
        answer.classList.remove('nice-muted');
        answer.innerHTML = mdLite(cached);
        return;
      }
      setLoading(true);
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: q.prompt })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Request failed');
        const text = (data?.reply || '').trim();
        setCached(q.label, text);
        answer.classList.remove('nice-muted');
        answer.innerHTML = mdLite(text || 'No answer.');
      } catch (e) {
        answer.innerHTML = `<div class="nice-error">Sorry, we couldn’t fetch that right now. Please try again.</div>`;
      } finally {
        setLoading(false);
      }
    }

    // Render question “chips”
    questions.forEach(q => {
      const b = document.createElement('button');
      b.className = 'nice-btn';
      b.type = 'button';
      b.textContent = q.label;
      b.addEventListener('click', () => ask(q));
      qsWrap.appendChild(b);
    });

    copyBtn.addEventListener('click', async () => {
      const text = answer.textContent.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 900);
      } catch { /* ignore */ }
    });

    clearBtn.addEventListener('click', () => {
      answer.classList.add('nice-muted');
      answer.textContent = 'Pick a question to see the answer.';
    });
  }

  // Auto-init all widgets found on the page
  function initAll() {
    document.querySelectorAll('#nice-faq-widget, .nice-faq-widget-host').forEach(build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
