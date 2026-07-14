# Deploying acadianaconstructionsolutions.com

This site is a static front end (`index.html`, `style.css`, `script.js`,
`hero-excavator.webp`) plus one Vercel serverless function
(`api/submit-lead.js`) that emails contact-form leads to the business inbox
via [Resend](https://resend.com). The domain is registered at Hostinger; the
site is hosted on Vercel and the Hostinger domain points at it.

There are three one-time setup steps: **Resend** (email), **Vercel**
(hosting), and **Hostinger DNS** (pointing the domain).

---

## 1. Resend — so the contact form can send email

1. Create a free account at <https://resend.com>.
2. **Add and verify the domain** `acadianaconstructionsolutions.com`:
   - Resend → **Domains** → **Add Domain**.
   - It shows a set of DNS records (SPF, DKIM). Add each one in Hostinger
     (hPanel → **Domains → DNS / Nameservers**), then click **Verify** in
     Resend. Verification lets you send from your own domain and keeps
     messages out of spam.
3. Create an **API key** (Resend → **API Keys → Create**). Copy it — you'll
   paste it into Vercel in the next step.

> **Want to test before verifying the domain?** Resend lets you send from
> `onboarding@resend.dev` immediately, but only to the email address you
> signed up with. That's what the code defaults to. For real use, verify the
> domain and set `LEAD_FROM_EMAIL` (below).

## 2. Vercel — host the site

1. Sign in at <https://vercel.com> with the GitHub account that owns this repo.
2. **Add New… → Project** → import `rbelaire/kl_website`.
3. Framework preset: **Other** (it's a static site — no build step needed).
   Leave build/output settings empty. Click **Deploy**.
4. After the first deploy, open **Settings → Environment Variables** and add:

   | Name              | Value                                                                 |
   |-------------------|-----------------------------------------------------------------------|
   | `RESEND_API_KEY`  | *(the API key from step 1)*                                           |
   | `LEAD_TO_EMAIL`   | `Kleger@ACS.com`                                                       |
   | `LEAD_FROM_EMAIL` | `Acadiana Construction Solutions <leads@acadianaconstructionsolutions.com>` |

   (`LEAD_FROM_EMAIL` must use the domain you verified in Resend. Skip it to
   fall back to the `onboarding@resend.dev` test sender.)

   **Optional** — to also log leads to a Google Sheet, add `SHEETS_WEBHOOK_URL`
   and `SHEETS_WEBHOOK_TOKEN` as well. See
   [`GOOGLE_SHEETS_SETUP.md`](GOOGLE_SHEETS_SETUP.md).
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables take effect.

## 3. Hostinger — point the domain at Vercel

1. In Vercel: **Settings → Domains → Add** `acadianaconstructionsolutions.com`
   (add `www.acadianaconstructionsolutions.com` too). Vercel will display the
   exact DNS records it wants.
2. In Hostinger hPanel → **Domains → DNS / Nameservers → DNS records**, set:
   - **A** record, host `@`, value **`76.76.21.21`** (Vercel's IP — confirm
     against what Vercel shows).
   - **CNAME** record, host `www`, value **`cname.vercel-dns.com`**.
   - Remove any conflicting existing `@`/`www` A or CNAME records.
3. Back in Vercel, wait for the domains to show **Valid Configuration**
   (DNS can take a few minutes to a few hours). Vercel issues the HTTPS
   certificate automatically.

> Keeping Hostinger as the DNS host (rather than switching nameservers to
> Vercel) leaves any Hostinger-managed records — like email — untouched.

---

## Testing the form

After deploy, submit the contact form on the live site. You should receive an
email at `Kleger@ACS.com` within a few seconds. Replying to it goes straight
to the customer (the code sets `reply_to` to their address). If nothing
arrives, check **Vercel → your project → Logs** for the `submit-lead`
function and **Resend → Emails** for delivery status.

## Local note

`api/submit-lead.js` only runs on Vercel (or `vercel dev`), not from opening
`index.html` as a file. Opening the HTML directly still renders the whole
site; only the live form submission needs the deployed function.
