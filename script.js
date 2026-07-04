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
