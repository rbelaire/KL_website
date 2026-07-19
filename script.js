// script.js
document.addEventListener('DOMContentLoaded', () => {
    /* -------------------------------------------------------------------
       Mobile navigation toggle
    ------------------------------------------------------------------- */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');

    if (navToggle && navLinks) {
        const closeMenu = () => {
            navLinks.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
        };

        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', String(isOpen));
        });

        // Close the menu after tapping any nav link (in-page anchors)
        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeMenu);
        });

        // Close on Escape for keyboard users
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenu();
        });
    }

    /* -------------------------------------------------------------------
       Roll-off dumpster rental estimator
       NOTE: placeholder pricing — update the values below with real rates.
    ------------------------------------------------------------------- */
    const estimator = document.getElementById('dumpster-estimator');
    if (estimator) {
        // ---- Placeholder pricing ----
        const SIZES = {
            '10': { base: 325, tons: 2 },
            '20': { base: 395, tons: 3 },
            '30': { base: 475, tons: 4 },
            '40': { base: 550, tons: 5 },
        };
        const INCLUDED_DAYS = 7;
        const EXTRA_DAY_FEE = 12;   // per day beyond the included days
        const EXTRA_TON_FEE = 65;   // per ton beyond the size's allowance
        const HEAVY_FEE = 75;       // concrete / dirt / brick
        const SAMEDAY_FEE = 50;     // same-day / next-day delivery
        const MAX_DAYS = 60;
        const MAX_TONS = 20;

        const state = { size: '10', days: 7, tons: SIZES['10'].tons };

        const linesEl = estimator.querySelector('#est-lines');
        const totalEl = estimator.querySelector('#est-total');
        const daysOut = estimator.querySelector('#days-value');
        const tonsOut = estimator.querySelector('#tons-value');
        const tonsHint = estimator.querySelector('#tons-hint');
        const heavyEl = estimator.querySelector('#opt-heavy');
        const samedayEl = estimator.querySelector('#opt-sameday');

        const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

        const buildLines = () => {
            const size = SIZES[state.size];
            const extraDays = Math.max(0, state.days - INCLUDED_DAYS);
            const extraTons = Math.max(0, state.tons - size.tons);
            const lines = [
                { label: `${state.size} yd dumpster · ${INCLUDED_DAYS} days`, amount: size.base },
            ];
            if (extraDays > 0) {
                lines.push({ label: `+${extraDays} extra day${extraDays > 1 ? 's' : ''}`, amount: extraDays * EXTRA_DAY_FEE });
            }
            if (extraTons > 0) {
                lines.push({ label: `+${extraTons} ton${extraTons > 1 ? 's' : ''} over ${size.tons}`, amount: extraTons * EXTRA_TON_FEE });
            }
            if (heavyEl.checked) lines.push({ label: 'Heavy debris', amount: HEAVY_FEE });
            if (samedayEl.checked) lines.push({ label: 'Same-day delivery', amount: SAMEDAY_FEE });
            return lines;
        };

        const render = () => {
            const size = SIZES[state.size];
            daysOut.textContent = state.days;
            tonsOut.textContent = state.tons;
            tonsHint.textContent = `Up to ${size.tons} tons included with the ${state.size} yd.`;

            const lines = buildLines();
            const total = lines.reduce((sum, l) => sum + l.amount, 0);
            linesEl.innerHTML = lines.map((l) =>
                `<div class="est-line"><dt>${l.label}</dt><dd>${money(l.amount)}</dd></div>`
            ).join('');
            totalEl.textContent = money(total);

            // Disable steppers at their limits
            estimator.querySelector('[data-stepper="days"] [data-step="-1"]').disabled = state.days <= 1;
            estimator.querySelector('[data-stepper="days"] [data-step="1"]').disabled = state.days >= MAX_DAYS;
            estimator.querySelector('[data-stepper="tons"] [data-step="-1"]').disabled = state.tons <= 1;
            estimator.querySelector('[data-stepper="tons"] [data-step="1"]').disabled = state.tons >= MAX_TONS;
        };

        // Size selection — reset the weight to the new size's included allowance
        estimator.querySelectorAll('input[name="size"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                state.size = radio.value;
                state.tons = SIZES[state.size].tons;
                render();
            });
        });

        // Steppers
        estimator.querySelectorAll('.step-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.closest('[data-stepper]').dataset.stepper;
                const delta = Number(btn.dataset.step);
                const max = key === 'days' ? MAX_DAYS : MAX_TONS;
                state[key] = Math.min(max, Math.max(1, state[key] + delta));
                render();
            });
        });

        // Options
        [heavyEl, samedayEl].forEach((el) => el.addEventListener('change', render));

        // "Reserve" — prefill and jump to the quote form
        const cta = estimator.querySelector('#est-cta');
        cta.addEventListener('click', () => {
            const size = SIZES[state.size];
            const extras = [];
            if (state.days > INCLUDED_DAYS) extras.push(`${state.days} days`);
            if (state.tons > size.tons) extras.push(`~${state.tons} tons`);
            if (heavyEl.checked) extras.push('heavy debris');
            if (samedayEl.checked) extras.push('same-day delivery');
            const total = buildLines().reduce((sum, l) => sum + l.amount, 0);
            const summary = `Roll-off rental request: ${state.size} yd dumpster`
                + (extras.length ? ` (${extras.join(', ')})` : ` (${INCLUDED_DAYS} days, up to ${size.tons} tons)`)
                + `. Estimated total ${money(total)}.`;

            const serviceSelect = document.getElementById('service-type');
            const messageField = document.getElementById('message');
            if (serviceSelect) serviceSelect.value = 'demolition';
            if (messageField) messageField.value = summary;

            document.getElementById('quote-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
            const nameField = document.getElementById('name');
            if (nameField) window.setTimeout(() => nameField.focus({ preventScroll: true }), 400);
        });

        render();
    }

    /* -------------------------------------------------------------------
       Recent Work gallery lightbox
    ------------------------------------------------------------------- */
    const lightbox = document.getElementById('lightbox');
    const grid = document.getElementById('work-grid');
    if (lightbox && grid) {
        const tiles = Array.from(grid.querySelectorAll('.work-tile'));
        const lbImg = document.getElementById('lb-img');
        const lbCaption = document.getElementById('lb-caption');
        let current = 0;
        let lastFocused = null;

        const show = (i) => {
            current = (i + tiles.length) % tiles.length;
            const img = tiles[current].querySelector('img');
            lbImg.src = img.src;
            lbImg.alt = img.alt;
            lbCaption.textContent = tiles[current].dataset.caption || '';
        };

        const open = (i) => {
            lastFocused = document.activeElement;
            show(i);
            lightbox.hidden = false;
            document.body.style.overflow = 'hidden';
            document.getElementById('lb-close').focus();
        };

        const close = () => {
            lightbox.hidden = true;
            document.body.style.overflow = '';
            if (lastFocused) lastFocused.focus();
        };

        tiles.forEach((tile, i) => tile.addEventListener('click', () => open(i)));
        document.getElementById('lb-close').addEventListener('click', close);
        document.getElementById('lb-prev').addEventListener('click', () => show(current - 1));
        document.getElementById('lb-next').addEventListener('click', () => show(current + 1));

        // Click the dark backdrop (but not the image/controls) to close
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lb-figure')) close();
        });

        document.addEventListener('keydown', (e) => {
            if (lightbox.hidden) return;
            if (e.key === 'Escape') close();
            else if (e.key === 'ArrowLeft') show(current - 1);
            else if (e.key === 'ArrowRight') show(current + 1);
        });
    }

    /* -------------------------------------------------------------------
       Lead capture form submission
    ------------------------------------------------------------------- */
    const form = document.querySelector('#quote-form form');
    if (!form) return;

    const submitBtn = form.querySelector('.submit-btn');
    const statusEl = form.querySelector('#form-status');

    const setStatus = (message, type) => {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.className = 'form-status' + (type ? ' ' + type : '');
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Use native validation before attempting a submission
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        setStatus('', null);

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            let result = {};
            try {
                result = await response.json();
            } catch (_) {
                // response had no/invalid JSON body
            }

            if (response.ok && result.success) {
                setStatus(`Thank you, ${data.name}! Your request has been received. We'll contact you shortly.`, 'success');
                form.reset();
            } else {
                setStatus(result.error || 'Something went wrong. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Submission Error:', error);
            setStatus('Network error. Please check your connection and try again.', 'error');
        } finally {
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});
