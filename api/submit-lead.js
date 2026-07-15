// api/submit-lead.js
//
// Vercel serverless function that handles each contact-form lead. It emails
// the lead to the business inbox via Resend (https://resend.com) and, if a
// Google Sheets webhook is configured, also appends it as a row to a Google
// Sheet. It only uses fetch, so there are no npm dependencies to install.
//
// Required environment variables (set these in the Vercel dashboard):
//   RESEND_API_KEY   Your Resend API key.
//   LEAD_TO_EMAIL    Where leads are delivered.   Default: Kleger@geauxacs.com
//   LEAD_FROM_EMAIL  Verified Resend sender.       Default: onboarding@resend.dev
//                    For production, verify geauxacs.com in Resend and use
//                    e.g. "GeauxACS <leads@geauxacs.com>".
//
// Optional (for Google Sheets logging — see GOOGLE_SHEETS_SETUP.md):
//   SHEETS_WEBHOOK_URL    The Apps Script web-app URL for your leads sheet.
//   SHEETS_WEBHOOK_TOKEN  A shared secret that must match the script's token.

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

// Email the lead via Resend. Rejects if the send fails.
async function sendLeadEmail({ name, phone, email, serviceLabel, details }) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
        throw new Error('missing RESEND_API_KEY environment variable');
    }
    const TO_EMAIL = process.env.LEAD_TO_EMAIL || 'Kleger@geauxacs.com';
    const FROM_EMAIL = process.env.LEAD_FROM_EMAIL || 'Acadiana Construction Solutions <onboarding@resend.dev>';

    const html = `
        <h2 style="margin:0 0 16px">New Website Lead</h2>
        <p style="margin:4px 0"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:4px 0"><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p style="margin:4px 0"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:4px 0"><strong>Service:</strong> ${escapeHtml(serviceLabel)}</p>
        <p style="margin:12px 0 4px"><strong>Project details:</strong></p>
        <p style="margin:0;white-space:pre-line">${escapeHtml(details)}</p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #ddd">
        <p style="color:#888;font-size:12px;margin:0">Sent from the geauxacs.com contact form.</p>
    `;

    const text = `New Website Lead

Name: ${name}
Phone: ${phone}
Email: ${email}
Service: ${serviceLabel}

Project details:
${details}

Sent from the geauxacs.com contact form.`;

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
}

// Append the lead as a row to a Google Sheet via an Apps Script web app.
// Resolves silently (no-op) when the webhook isn't configured.
async function appendLeadToSheet({ name, phone, email, serviceLabel, details }) {
    const url = process.env.SHEETS_WEBHOOK_URL;
    if (!url) return; // sheet logging is optional

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: process.env.SHEETS_WEBHOOK_TOKEN || '',
            name,
            phone,
            email,
            service: serviceLabel,
            message: details,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to append to sheet');
    }
    // Apps Script returns HTTP 200 even for handled errors, so check the body too.
    const data = await response.json().catch(() => ({}));
    if (data && data.error) {
        throw new Error(data.error);
    }
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

    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;
    const details = message && message.trim() ? message.trim() : '(none provided)';
    const lead = { name, phone, email, serviceLabel, details };

    // Email is the primary delivery channel; the sheet is a best-effort backup.
    // Run both in parallel so a slow sheet write never delays the email.
    const [emailOutcome, sheetOutcome] = await Promise.allSettled([
        sendLeadEmail(lead),
        appendLeadToSheet(lead),
    ]);

    if (emailOutcome.status === 'rejected') {
        console.error('Email Error:', emailOutcome.reason);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    // A failed sheet append shouldn't fail the request — the email already went out.
    if (sheetOutcome.status === 'rejected') {
        console.error('Sheet Error (non-fatal):', sheetOutcome.reason);
    }

    return res.status(200).json({ success: true, message: 'Lead sent successfully!' });
}
