// api/submit-lead.js

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

    // Environment variables managed securely in Vercel
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('Database Error: missing Supabase environment variables');
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    try {
        // Direct REST API call to Supabase to keep the function lightweight (no npm installs needed)
        const response = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                name,
                phone,
                email,
                service_type: serviceType,
                message
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to insert into Supabase');
        }

        return res.status(200).json({ success: true, message: 'Lead saved successfully!' });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
