// api/submit-lead.js
//
// Vercel serverless function that handles each quote-form lead. Every lead is:
//   1. Emailed to the business inbox via Resend (https://resend.com), and
//   2. Stored as a row in the "Leads" Google Sheet via an Apps Script web app
//      (see GOOGLE_SHEETS_SETUP.md and google-apps-script/Code.gs).
//
// Both run in parallel. The customer sees success as long as at least one of
// them worked, so a lead is never lost because of a single outage; any failure
// is logged to Vercel's runtime logs. It only uses fetch, so there are no npm
// dependencies to install.
//
// Environment variables (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY        Resend API key.
//   LEAD_TO_EMAIL         Where leads are delivered.  Default: Kleger@geauxacs.com
//   LEAD_FROM_EMAIL       Verified Resend sender, e.g. "GeauxACS <leads@geauxacs.com>".
//   SHEETS_WEBHOOK_URL    The Apps Script web-app URL (ends in /exec).
//   SHEETS_WEBHOOK_TOKEN  Shared secret; must match SHARED_TOKEN in Code.gs.

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

// Give up on a slow upstream rather than leaving the customer waiting.
const UPSTREAM_TIMEOUT_MS = 15000;

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
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend ${response.status}: ${errorText || 'send failed'}`);
    }
}

// Append the lead as a row in the Google Sheet. Rejects if it wasn't stored.
async function storeLeadInSheet({ name, phone, email, serviceLabel, details }) {
    const url = process.env.SHEETS_WEBHOOK_URL;
    if (!url) {
        throw new Error('missing SHEETS_WEBHOOK_URL environment variable');
    }

    // Apps Script answers with a redirect to googleusercontent.com; fetch
    // follows it and returns the script's JSON reply.
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
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const bodyText = await response.text();
    // Google's error pages are huge HTML documents; the <title> says what went wrong.
    const summary = (bodyText.match(/<title>([^<]*)<\/title>/i)?.[1] || bodyText).slice(0, 200);
    if (!response.ok) {
        throw new Error(`Sheet webhook HTTP ${response.status} (${response.url}): ${summary}`);
    }
    // Apps Script returns HTTP 200 even for handled errors, so check the body.
    let data;
    try {
        data = JSON.parse(bodyText);
    } catch (_) {
        // An HTML page here usually means the web app isn't deployed with
        // "Who has access: Anyone", or the URL is wrong.
        throw new Error(`Sheet webhook returned non-JSON (${response.url}): ${summary}`);
    }
    if (!data.success) {
        throw new Error(`Sheet webhook error: ${data.error || 'unknown'}`);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const clean = (v, max) => String(v ?? '').trim().slice(0, max);
    const name = clean(body.name, 200);
    const phone = clean(body.phone, 50);
    const email = clean(body.email, 200);
    const serviceType = clean(body['service-type'], 100);
    const message = clean(body.message, 5000);

    if (!name || !phone || !email || !serviceType) {
        return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;
    const details = message || '(none provided)';
    const lead = { name, phone, email, serviceLabel, details };

    const [emailOutcome, sheetOutcome] = await Promise.allSettled([
        sendLeadEmail(lead),
        storeLeadInSheet(lead),
    ]);

    const emailed = emailOutcome.status === 'fulfilled';
    const stored = sheetOutcome.status === 'fulfilled';

    if (!emailed) console.error('Lead email FAILED:', emailOutcome.reason);
    if (!stored) console.error('Lead sheet FAILED:', sheetOutcome.reason);
    console.log(`Lead received: emailed=${emailed} stored=${stored}`);

    if (!emailed && !stored) {
        return res.status(500).json({
            error: 'Sorry, we could not send your request. Please call us at (337) 967-3880.',
        });
    }

    return res.status(200).json({ success: true, message: 'Lead received!' });
}
