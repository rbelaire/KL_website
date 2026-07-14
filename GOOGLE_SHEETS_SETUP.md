# Logging leads to a Google Sheet (optional)

Leads are always emailed to `Kleger@ACS.com`. This adds a **second copy** of
every lead as a row in a Google Sheet, so you have a running, searchable list.
It uses a small Google Apps Script "web app" — no Google Cloud project, no
service-account keys, no cost.

If the Sheet ever fails or isn't set up, the email still goes through — the
sheet is a best-effort backup, never a blocker.

You'll do three things: create the **Sheet**, add the **Script**, then paste
two values into **Vercel**.

---

## 1. Create the Sheet

1. Go to <https://sheets.google.com> → **Blank spreadsheet**.
2. Name it something like **"ACS Website Leads"**.
3. Rename the first tab (bottom-left) to **`Leads`**.
   *(The script also works if you leave the default tab name — it falls back
   to the first tab — but `Leads` keeps it tidy.)*

## 2. Add the Script

1. In the Sheet: **Extensions → Apps Script**. A code editor opens in a new tab.
2. Delete whatever is in the editor, then paste the entire contents of
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs) from this repo.
3. Near the top, replace `PASTE_YOUR_TOKEN_HERE` with your own long random
   string (any 20+ random characters). **Keep this value** — you'll paste the
   same one into Vercel in step 3.
4. Click the **Save** icon (💾).
5. Click **Deploy → New deployment**.
   - Click the gear ⚙️ next to "Select type" → choose **Web app**.
   - **Description:** anything (e.g. "Leads webhook").
   - **Execute as:** **Me**.
   - **Who has access:** **Anyone**.
   - Click **Deploy**.
6. Google asks you to **authorize** — click through, choose your account, and
   on the "Google hasn't verified this app" screen click **Advanced → Go to
   … (unsafe)** → **Allow**. (This warning is normal for your own scripts.)
7. Copy the **Web app URL** it gives you (ends in `/exec`). You'll need it in
   step 3.

## 3. Connect it to the site (Vercel)

1. In Vercel → your project → **Settings → Environment Variables**, add:

   | Name                   | Value                                             |
   |------------------------|---------------------------------------------------|
   | `SHEETS_WEBHOOK_URL`   | *(the Web app URL from step 2, ending in `/exec`)*|
   | `SHEETS_WEBHOOK_TOKEN` | *(the same random string you set in the script)*  |

2. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables take effect.

---

## Test it

Submit the contact form on the live site. You should get the email **and** see
a new row appear in the Sheet within a few seconds. If the row doesn't show up
(but the email did), check **Vercel → your project → Logs** for a
`Sheet Error (non-fatal)` message — it's usually a token mismatch between the
script and the `SHEETS_WEBHOOK_TOKEN` value, or a deployment set to the wrong
access level.

## Changing the script later

If you edit `Code.gs`, you must redeploy for changes to take effect:
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The Web app URL stays the same, so you don't need to update Vercel.
