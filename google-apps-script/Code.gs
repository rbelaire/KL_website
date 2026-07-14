/**
 * Google Apps Script for logging Acadiana Construction Solutions website leads
 * into a Google Sheet. See GOOGLE_SHEETS_SETUP.md for step-by-step setup.
 *
 * Paste this into the Apps Script editor bound to your leads spreadsheet
 * (Extensions -> Apps Script), replace SHARED_TOKEN below with your own long
 * random string, then deploy it as a Web app (Execute as: Me, Who has access:
 * Anyone). Use the SAME token as the SHEETS_WEBHOOK_TOKEN value in Vercel.
 */

// Must match the SHEETS_WEBHOOK_TOKEN environment variable in Vercel.
var SHARED_TOKEN = 'PASTE_YOUR_TOKEN_HERE';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Reject anything that doesn't carry the shared secret.
    if (body.token !== SHARED_TOKEN) {
      return json({ error: 'unauthorized' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Leads') || ss.getSheets()[0];

    // Write a header row the first time.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Phone', 'Email', 'Service', 'Details']);
      sheet.getRange('1:1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      body.name || '',
      body.phone || '',
      body.email || '',
      body.service || '',
      body.message || ''
    ]);

    return json({ success: true });
  } catch (err) {
    return json({ error: String(err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
