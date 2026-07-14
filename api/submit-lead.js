// api/submit-lead.js
//
// Vercel serverless function that emails each contact-form lead straight to
// the business inbox using Resend (https://resend.com). It only uses fetch,
// so there are no npm dependencies to install.
//
// Required environment variables (set these in the Vercel dashboard):
//   RESEND_API_KEY   Your Resend API key.
//   LEAD_TO_EMAIL    Where leads are delivered.   Default: Kleger@ACS.com
//   LEAD_FROM_EMAIL  Verified Resend sender.       Default: onboarding@resend.dev
//                    For production, verify acadianaconstructionsolutions.com
//                    in Resend and use e.g. "ACS Website <leads@acadianaconstructionsolutions.com>".

// Human-readable labels for the form's service-type values.
const SERVICE_LABELS = {
    'dirt-work': 'Dirt Work & House Pads',
    'site-development': 'Site Development & Driveways',
    'ponds-excavation': 'Ponds & Excavation',
    'culverts': 'Culvert Installation',
    'grading': 'Yard Leveling & Grading',
    'demolition': 'Demolition & Dumpster Rental',
    'outdoor-living': 'Fencing, Decks & Patios',
    'other': 'Other / Custom Project',
};

// Escape user input before embedding it in the HTML email body.
function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, phone, email, 'service-type': serviceType, message } = req.body || {};

    // Basic server-side validation of required fields
    if (!name || !phone || !email || !serviceType) {
        return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO_EMAIL = process.env.LEAD_TO_EMAIL || 'Kleger@ACS.com';
    const FROM_EMAIL = process.env.LEAD_FROM_EMAIL || 'Acadiana Construction Solutions <onboarding@resend.dev>';

    if (!RESEND_API_KEY) {
        console.error('Email Error: missing RESEND_API_KEY environment variable');
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;
    const details = message && message.trim() ? message.trim() : '(none provided)';

    const html = `
        <h2 style="margin:0 0 16px">New Website Lead</h2>
        <p style="margin:4px 0"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:4px 0"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p style="margin:4px 0"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:4px 0"><strong>Service:</strong> ${escapeHtml(serviceLabel)}</p>
        <p style="margin:12px 0 4px"><strong>Project details:</strong></p>
        <p style="margin:0;white-space:pre-line">${escapeHtml(details)}</p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #ddd">
        <p style="color:#888;font-size:12px;margin:0">Sent from the acadianaconstructionsolutions.com contact form.</p>
    `;

    const text = `New Website Lead

Name: ${name}
Phone: ${phone}
Email: ${email}
Service: ${serviceLabel}

Project details:
${details}

Sent from the acadianaconstructionsolutions.com contact form.`;

    try {
        // Direct REST call to Resend to keep the function lightweight (no npm installs needed)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [TO_EMAIL],
                reply_to: email, // replying to the notification reaches the customer directly
                subject: `New Lead: ${name} — ${serviceLabel}`,
                html,
                text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to send email');
        }

        return res.status(200).json({ success: true, message: 'Lead sent successfully!' });
    } catch (error) {
        console.error('Email Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
