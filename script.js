// script.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#quote-form form');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            // Gather form data into a neat object
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Optional: Change button text to show loading state
            const submitBtn = form.querySelector('.submit-btn');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = "Sending...";
            submitBtn.disabled = true;

            try {
                // Post data directly to your Vercel serverless function endpoint
                const response = await fetch('/api/submit-lead', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert(`Thank you, ${data.name}! Your request has been received. Our team will contact you shortly.`);
                    form.reset();
                } else {
                    alert(`Oops! ${result.error || 'Something went wrong. Please try again.'}`);
                }
            } catch (error) {
                console.error('Submission Error:', error);
                alert('Network error. Please check your connection and try again.');
            } finally {
                // Restore button state
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});