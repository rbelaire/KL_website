# Storing leads in a Google Sheet

Every quote-form lead is emailed to `Kleger@geauxacs.com` **and** saved as a
row in a Google Sheet, so there's a permanent, searchable list of every
request. It uses a small Google Apps Script "web app": no Google Cloud
project, no service-account keys, no cost.

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
   - **Who has access:** **Anyone** *(not "Anyone with Google account" —
     the website isn't signed in to Google).*
   - Click **Deploy**.
6. Google asks you to **authorize** — click through, choose your account, and
   on the "Google hasn't verified this app" screen click **Advanced → Go to
   … (unsafe)** → **Allow**. (This warning is normal for your own scripts.)
7. Copy the **Web app URL** it gives you. It must look like
   `https://script.google.com/macros/s/…/exec`. Don't use the editor's URL or a
   URL ending in `/dev`.

## 3. Connect it to the site (Vercel)

1. In Vercel → your project → **Settings → Environment Variables**, set
   (for **Production**):

   | Name                   | Value                                             |
   |------------------------|---------------------------------------------------|
   | `SHEETS_WEBHOOK_URL`   | *(the Web app URL from step 2, ending in `/exec`)*|
   | `SHEETS_WEBHOOK_TOKEN` | *(the same random string you set in the script)*  |

2. **Redeploy** (Deployments → ⋯ → Redeploy) so the new values take effect.

---

## Test it

Submit the contact form on the live site. You should get the email **and** see
a new row appear in the Sheet within a few seconds. Then check
**Vercel → your project → Logs** for `Lead received: emailed=true stored=true`.

If it says `stored=false`, the `Lead sheet FAILED` line above it tells you why:

| Log message contains                | Fix                                                        |
|-------------------------------------|------------------------------------------------------------|
| `unauthorized`                      | Token in Code.gs ≠ `SHEETS_WEBHOOK_TOKEN` in Vercel.       |
| `non-JSON` / `HTTP 401/403` / a Google page title | Access isn't **Anyone**, or the URL is wrong. Redo step 2.5–2.7 and update `SHEETS_WEBHOOK_URL`. |
| `HTTP 404`                          | The deployment was archived or the URL is wrong. Make a new deployment and update the URL. |
| `missing SHEETS_WEBHOOK_URL`        | The variable isn't set for Production.                     |

## Changing the script later

If you edit `Code.gs`, you must redeploy for changes to take effect:
**Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
The Web app URL stays the same, so you don't need to update Vercel.
