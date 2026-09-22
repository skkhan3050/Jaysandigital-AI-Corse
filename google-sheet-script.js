/**
 * =========================================================================
 * JAYSAN DIGITAL - GOOGLE APPS SCRIPT AUTOMATION
 * =========================================================================
 * Target Google Sheet:
 * https://docs.google.com/spreadsheets/d/1yRFF7O0RbK8RxTAmRsv9DDTB4HaTBvGcT2nVpVUc25Y/edit?usp=sharing
 * 
 * STEP-BY-STEP SETUP INSTRUCTIONS:
 * -------------------------------------------------------------------------
 * 1. Open your Google Sheet in your browser:
 *    https://docs.google.com/spreadsheets/d/1yRFF7O0RbK8RxTAmRsv9DDTB4HaTBvGcT2nVpVUc25Y/edit?usp=sharing
 * 
 * 2. In Google Sheets top menu, click: Extensions -> Apps Script
 * 
 * 3. Delete any code inside Code.gs and PASTE THIS ENTIRE SCRIPT.
 * 
 * 4. Click the "Save" icon (or Ctrl + S).
 * 
 * 5. Click the blue "Deploy" button (top-right) -> "New deployment"
 * 
 * 6. Click the Gear icon (⚙️) next to "Select type" and select: "Web app"
 * 
 * 7. Fill in the deployment details:
 *    - Description: "Jaysan Digital Lead & Payment Webhook"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone"  <--- (IMPORTANT: Select 'Anyone')
 * 
 * 8. Click "Deploy".
 *    - If asked for permissions, click "Authorize access", choose your Google account,
 *      click "Advanced" -> "Go to Jaysan Digital Webhook (unsafe)" -> "Allow".
 * 
 * 9. Copy the generated "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 
 * 10. Open app.js in your project and paste that Web App URL into:
 *     CONFIG.googleSheetScriptUrl = "YOUR_COPIED_WEB_APP_URL";
 * =========================================================================
 */

function doPost(e) {
  return handleIncomingData(e);
}

function doGet(e) {
  // Allows testing or GET parameters
  if (e && e.parameter && (e.parameter.name || e.parameter.email || e.parameter.phone)) {
    return handleIncomingData(e);
  }
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "Jaysan Digital Google Sheet Webhook is active and connected!"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleIncomingData(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 10 second timeout for concurrent submissions

  try {
    // Get the target active sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 1. If Sheet is brand new or empty, automatically create styled headers
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Date & Time (IST)",
        "Full Name",
        "Phone Number",
        "Email Address",
        "Amount",
        "Status",
        "Source",
        "Notes / Txn Details"
      ];
      
      sheet.appendRow(headers);

      // Style the header row
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0F52BA"); // Sapphire Blue
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 38);
      sheet.setFrozenRows(1);
    }

    // 2. Parse incoming JSON or Form Data payload
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // 3. Prepare formatted fields
    var timestamp = new Date();
    var formattedDate = Utilities.formatDate(timestamp, "Asia/Kolkata", "dd MMM yyyy, hh:mm:ss a");

    var fullName = data.name || data.fullName || "Customer";
    var phone = data.phone || data.phoneNumber || "";
    var email = data.email || "";
    var amount = data.amount || "₹99.00";
    var status = data.status || "Payment Initiated";
    var source = data.source || "Razorpay Modal";
    var notes = data.notes || data.txnId || (data.timestamp ? "Captured on: " + data.timestamp : "Lead captured before payment");

    // 4. Append row to Google Sheet
    sheet.appendRow([
      formattedDate,
      fullName,
      "'" + phone, // Prefix quote to prevent scientific notation formatting on phone numbers
      email,
      amount,
      status,
      source,
      notes
    ]);

    var lastRow = sheet.getLastRow();

    // Format new row styling
    sheet.getRange(lastRow, 1).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 3).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 5).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 6).setHorizontalAlignment("center");
    sheet.getRange(lastRow, 6).setFontWeight("bold");

    // Color code the status
    if (status.indexOf("Success") !== -1 || status.indexOf("Completed") !== -1) {
      sheet.getRange(lastRow, 6).setFontColor("#008000"); // Green
    } else {
      sheet.getRange(lastRow, 6).setFontColor("#E67E22"); // Amber / Orange
    }

    // Auto-fit all columns to content width
    for (var col = 1; col <= 8; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        result: "success",
        row: lastRow,
        message: "Data saved successfully to Google Sheet"
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        result: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
