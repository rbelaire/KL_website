/* ==========================================================================
   KL Dirt Co. - Interactive Scripts
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#quote-form form');

    if (form) {
        form.addEventListener('submit', (event) => {
            // Prevent the default browser form submission behavior
            event.preventDefault();

            // Grab the input data
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const service = document.getElementById('service-type').value;

            // Basic front-end validation check
            if (!name || !phone || !email || !service) {
                alert('Please fill out all required fields.');
                return;
            }

            // Success feedback (Simulating a lead generation dispatch)
            alert(`Thank you, ${name}! Your request for "${form.elements['service-type'].options[form.elements['service-type'].selectedIndex].text}" has been received. Our team will contact you shortly.`);
            
            // Reset the form layout after submission
            form.reset();
        });
    }
});
