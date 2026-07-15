# Deploying GeauxACS.com

This site is a static front end (`index.html`, `style.css`, `script.js`,
`hero-excavator.webp`) plus one Vercel serverless function
(`api/submit-lead.js`) that emails contact-form leads to the business inbox
via [Resend](https://resend.com). The primary domain is **geauxacs.com**
(registered at Hostinger); the site is hosted on Vercel.

The domain does three jobs, each using **different DNS records** that do not
conflict:

| Job | DNS record type | Points to |
|-----|-----------------|-----------|
| Website | A / CNAME | Vercel |
| Receiving email (your inbox) | MX | Hostinger mail |
| Sending email (form → Resend) | TXT (SPF/DKIM) | Resend |

Setup steps: **email mailbox** (Hostinger), **Resend** (form sending),
**Vercel** (hosting), and **DNS** (point everything).

---

## 1. Create the work email — `Kleger@geauxacs.com` (Hostinger)

1. In Hostinger hPanel → **Emails** → select `geauxacs.com` → **Set up / Manage**.
   (Hostinger plans include free email; if prompted, choose the free "Hostinger
   Email" tier — Titan/Google Workspace are optional paid upgrades.)
2. **Create mailbox** → account `Kleger`, domain `geauxacs.com`, set a password.
   You now have `Kleger@geauxacs.com`. (Optionally add `info@geauxacs.com` too.)
3. Hostinger adds the required **MX** records automatically since the domain is
   registered there. Read webmail at <https://webmail.hostinger.com> or connect
   the account to your phone/Outlook.

## 2. Resend — so the contact form can send email

1. Create a free account at <https://resend.com>.
2. **Add and verify the domain** `geauxacs.com`:
   - Resend → **Domains → Add Domain**.
   - It shows DNS records (SPF, DKIM). Add each in Hostinger (hPanel →
     **Domains → DNS / Nameservers**), then click **Verify** in Resend.
     These are **TXT/CNAME** records and won't disturb the MX records from
     step 1 — sending and receiving coexist.
3. Create an **API key** (Resend → **API Keys → Create**) and copy it.

> **Test before verifying?** Resend can send from `onboarding@resend.dev`
> immediately, but only to the address you signed up with. For real use, verify
> the domain and set `LEAD_FROM_EMAIL` (below).

## 3. Vercel — host the site

1. Sign in at <https://vercel.com> with the GitHub account that owns this repo.
2. **Add New… → Project** → import `rbelaire/kl_website`.
3. Framework preset: **Other** (static site — no build step). Leave build/output
   empty. Click **Deploy**.
4. Open **Settings → Environment Variables** and add:

   | Name              | Value                                             |
   |-------------------|---------------------------------------------------|
   | `RESEND_API_KEY`  | *(the API key from step 2)*                       |
   | `LEAD_TO_EMAIL`   | `Kleger@geauxacs.com`                             |
   | `LEAD_FROM_EMAIL` | `GeauxACS <leads@geauxacs.com>`                   |

   (`LEAD_FROM_EMAIL` must use the domain you verified in Resend. Skip it to
   fall back to the `onboarding@resend.dev` test sender.)

   **Optional** — to also log leads to a Google Sheet, add `SHEETS_WEBHOOK_URL`
   and `SHEETS_WEBHOOK_TOKEN`. See [`GOOGLE_SHEETS_SETUP.md`](GOOGLE_SHEETS_SETUP.md).
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the variables take effect.

## 4. Point the domain(s) at Vercel

1. In Vercel: **Settings → Domains → Add** `geauxacs.com` (and
   `www.geauxacs.com`). Vercel shows the exact DNS records it wants.
2. In Hostinger hPanel → **Domains → DNS / Nameservers → DNS records**, set:
   - **A** record, host `@`, value **`76.76.21.21`** (confirm against Vercel).
   - **CNAME** record, host `www`, value **`cname.vercel-dns.com`**.
   - Remove any conflicting existing `@`/`www` A or CNAME records.
   - **Leave the MX records alone** — those are your email.
3. Wait for Vercel to show **Valid Configuration** (minutes to a few hours).
   HTTPS is issued automatically.

### Keep the old domain working (optional)
If `acadianaconstructionsolutions.com` is still registered, add it in Vercel
too and set it to **redirect to geauxacs.com** (Vercel → Domains → the domain →
Redirect). Anyone visiting the long address lands on the short one.

---

## Testing the form

Submit the contact form on the live site. You should receive an email at
`Kleger@geauxacs.com` within a few seconds; replying goes straight to the
customer (the code sets `reply_to`). If nothing arrives, check
**Vercel → your project → Logs** for `submit-lead` and **Resend → Emails**.

## Local note

`api/submit-lead.js` only runs on Vercel (or `vercel dev`), not from opening
`index.html` as a file. Opening the HTML directly still renders the whole
site; only the live form submission needs the deployed function.
