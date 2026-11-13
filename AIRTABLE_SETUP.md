# Storing leads in Airtable

Every quote-form lead is emailed to `Kleger@geauxacs.com` **and** saved as a
record in Airtable, so there's a permanent, searchable list of every request.
Airtable works like a spreadsheet, is free for this use (up to 1,000 records
per base), never goes to sleep, and has a phone app.

You'll do three things: create the **account and table**, create a
**token**, then paste three values into **Vercel**.

---

## 1. Create the account and the Leads table

1. Sign up at <https://airtable.com/signup> with **Kleger@geauxacs.com**.
2. **Create → Start from scratch**. Name the base **ACS Website Leads**.
3. Rename the table (top-left tab) to **`Leads`**.
4. Set up these fields. Names must match exactly, including capital letters.
   Rename the default fields and delete any extras.

   | Field name  | Field type                                   |
   |-------------|----------------------------------------------|
   | `Name`      | Single line text *(the first/primary field)* |
   | `Phone`     | Phone number                                 |
   | `Email`     | Email                                        |
   | `Service`   | Single select *(leave options empty)*        |
   | `Details`   | Long text                                    |
   | `Status`    | Single select: New, Contacted, Quoted, Won, Lost |
   | `Submitted` | Created time *(fills in automatically)*      |

   New `Service` and `Status` options are added automatically when a lead
   arrives, so you don't need to type them all in.

5. Copy the **base ID** from the browser's address bar. It's the part that
   starts with `app`, e.g. `airtable.com/`**`appAbC123xyz`**`/tbl...`.

## 2. Create a token for the website

1. Go to <https://airtable.com/create/tokens> → **Create new token**.
2. **Name:** `geauxacs website`.
3. **Scopes:** add only **`data.records:write`**.
4. **Access:** add only the **ACS Website Leads** base.
5. **Create token** and copy it (starts with `pat`). Airtable shows it once.

The token can only add records to this one base. It can't read or delete
anything.

## 3. Connect it to the site (Vercel)

1. In Vercel → your project → **Settings → Environment Variables**, add
   (for **Production** and **Preview**):

   | Name               | Value                                  |
   |--------------------|----------------------------------------|
   | `AIRTABLE_TOKEN`   | *(the token from step 2, `pat…`)*      |
   | `AIRTABLE_BASE_ID` | *(the base ID from step 1, `app…`)*    |

   *(Optional: `AIRTABLE_TABLE` if you named the table something other than `Leads`.)*

2. **Redeploy** (Deployments → ⋯ → Redeploy) so the new values take effect.

---

## Test it

Submit the contact form on the live site. You should get the email **and** see
a new record in Airtable within a few seconds. In **Vercel → your project →
Logs** you'll see `Lead received: emailed=true stored=true`.

If it says `stored=false`, the `Lead storage FAILED` line above it says why:

| Log message contains          | Fix                                                        |
|-------------------------------|------------------------------------------------------------|
| `401` / `AUTHENTICATION_REQUIRED` | Token is wrong or was regenerated. Update `AIRTABLE_TOKEN`. |
| `403` / `INVALID_PERMISSIONS` | Token is missing `data.records:write` or access to the base. |
| `404` / `NOT_FOUND`           | Base ID or table name is wrong.                            |
| `UNKNOWN_FIELD_NAME`          | A field name doesn't match the table in step 1.4.          |
| `missing AIRTABLE_TOKEN…`     | The variables aren't set for this environment.             |

## Tips

- Install the Airtable phone app and turn on notifications for the base to
  get a push alert for each new lead.
- Use the `Status` field to track each lead from **New** to **Won** or **Lost**.
