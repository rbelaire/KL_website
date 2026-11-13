// api/submit-lead.js
//
// Vercel serverless function that handles each quote-form lead. Every lead is:
//   1. Emailed to the business inbox via Resend (https://resend.com), and
//   2. Saved as a record in the "Leads" table in Airtable (https://airtable.com).
//
// Both run in parallel. The customer sees success as long as at least one of
// them worked, so a lead is never lost because of a single outage; any failure
// is logged to Vercel's runtime logs. It only uses fetch, so there are no npm
// dependencies to install.
//
// Environment variables (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY     Resend API key.
//   LEAD_TO_EMAIL      Where leads are delivered.  Default: Kleger@geauxacs.com
//   LEAD_FROM_EMAIL    Verified Resend sender, e.g. "GeauxACS <leads@geauxacs.com>".
//   AIRTABLE_TOKEN     Airtable personal access token (data.records:write on the base).
//   AIRTABLE_BASE_ID   The base ID, starts with "app".
//   AIRTABLE_TABLE     Table name. Default: Leads

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

// Save the lead as a record in the Airtable "Leads" table. Rejects if it
// wasn't stored. See AIRTABLE_SETUP.md for the table's fields.
async function storeLead({ name, phone, email, serviceLabel, details }) {
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const table = process.env.AIRTABLE_TABLE || 'Leads';
    if (!token || !baseId) {
        throw new Error('missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID environment variable');
    }

    const response = await fetch(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: [{
                    fields: {
                        'Name': name,
                        'Phone': phone,
                        'Email': email,
                        'Service': serviceLabel,
                        'Details': details,
                        'Status': 'New',
                    },
                }],
                typecast: true, // adds new Service/Status options automatically
            }),
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        },
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable ${response.status}: ${errorText.slice(0, 300)}`);
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

    const [emailOutcome, storeOutcome] = await Promise.allSettled([
        sendLeadEmail(lead),
        storeLead(lead),
    ]);

    const emailed = emailOutcome.status === 'fulfilled';
    const stored = storeOutcome.status === 'fulfilled';

    if (!emailed) console.error('Lead email FAILED:', emailOutcome.reason);
    if (!stored) console.error('Lead storage FAILED:', storeOutcome.reason);
    console.log(`Lead received: emailed=${emailed} stored=${stored}`);

    if (!emailed && !stored) {
        return res.status(500).json({
            error: 'Sorry, we could not send your request. Please call us at (337) 967-3880.',
        });
    }

    return res.status(200).json({ success: true, message: 'Lead received!' });
}
