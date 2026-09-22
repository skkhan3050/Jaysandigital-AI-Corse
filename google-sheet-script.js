/**
 * =========================================================================
 * JAYSAN DIGITAL - PRODUCTION RAZORPAY WEBHOOK APPS SCRIPT
 * =========================================================================
 * Target Google Sheet:
 * Spreadsheet ID: 1E7Z1G3bcATI0NrIZryYGClfvFr1lq5f9_vp1nhZjfg
 * Sheet Name: Sheet1
 * 
 * Direct Sheet Link:
 * https://docs.google.com/spreadsheets/d/1E7Z1G3bcATI0NrIZryYGClfvFr1lq5f9_vp1nhZjfg/edit?usp=sharing
 * 
 * Webhook Secret:
 * JaysanRazorpayWebhook@2026#Secure91
 * =========================================================================
 */

// Configuration Constants
var CONFIG = {
  SPREADSHEET_ID: "1E7Z1G3bcATI0NrIZryYGClfvFr1lq5f9_vp1nhZjfg",
  SHEET_NAME: "Sheet1",
  WEBHOOK_SECRET: "JaysanRazorpayWebhook@2026#Secure91",
  TIMEZONE: "Asia/Kolkata",
  DATE_FORMAT: "dd MMM yyyy, hh:mm:ss a"
};

/**
 * Main Webhook POST Handler
 * Receives Razorpay webhook events (e.g. payment.captured, payment.failed)
 */
function doPost(e) {
  return handleWebhookEvent(e);
}

/**
 * GET Handler for Health Checks & Endpoint Validation
 */
function doGet(e) {
  // Test connection or verify secret
  var incomingSecret = (e && e.parameter && e.parameter.secret) ? e.parameter.secret : "";
  var isAuthorized = (incomingSecret === CONFIG.WEBHOOK_SECRET);

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "JaySan Digital Razorpay Webhook Handler",
    authenticated: isAuthorized,
    spreadsheet_id: CONFIG.SPREADSHEET_ID,
    sheet_name: CONFIG.SHEET_NAME,
    timestamp: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT)
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Core Webhook Processing Engine
 */
function handleWebhookEvent(e) {
  var lock = LockService.getScriptLock();
  // Acquire a lock for up to 15 seconds to prevent race conditions & duplicate writes
  var hasLock = lock.tryLock(15000);
  
  if (!hasLock) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Lock timeout: Another webhook transaction is currently processing."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    // 1. Authenticate Request via Secret Token Parameter
    var incomingSecret = (e && e.parameter && e.parameter.secret) ? e.parameter.secret : "";
    if (CONFIG.WEBHOOK_SECRET && incomingSecret && incomingSecret !== CONFIG.WEBHOOK_SECRET) {
      Logger.log("[Security Alert] Unauthorized webhook attempt with invalid secret.");
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Unauthorized: Webhook secret mismatch."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Parse Incoming Webhook Payload
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Empty payload received."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      Logger.log("[Parse Error] Failed to parse JSON body: " + parseErr);
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Invalid JSON format: " + parseErr.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Extract Razorpay Event & Entity Data
    var eventType = payload.event || (payload.status ? "lead_capture" : "unknown");
    var paymentEntity = null;

    if (payload.payload && payload.payload.payment && payload.payload.payment.entity) {
      paymentEntity = payload.payload.payment.entity;
    } else if (payload.entity) {
      paymentEntity = payload.entity;
    } else {
      // Direct frontend payload fallback
      paymentEntity = payload;
    }

    // 4. Access Google Spreadsheet & Sheet1
    var ss;
    try {
      ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (ssErr) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      throw new Error("Unable to open Spreadsheet with ID: " + CONFIG.SPREADSHEET_ID);
    }

    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    }

    // 5. Initialize Required Header Schema if Sheet is Empty
    var requiredHeaders = [
      "Timestamp",
      "Event",
      "Payment ID",
      "Order ID",
      "Amount",
      "Currency",
      "Status",
      "Customer Name",
      "Email",
      "Phone",
      "Payment Method",
      "Created At",
      "Razorpay Order ID",
      "Description",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "UTM Content",
      "UTM Term"
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(requiredHeaders);
      var headerRange = sheet.getRange(1, 1, 1, requiredHeaders.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0F52BA"); // Sapphire Blue
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 38);
      sheet.setFrozenRows(1);
    }

    // 6. Extract and Format Payment Values Safely
    var notes = paymentEntity.notes || {};
    
    var paymentId = paymentEntity.id || paymentEntity.payment_id || paymentEntity.txnId || "";
    var orderId = paymentEntity.order_id || (notes.order_id || "");
    var razorpayOrderId = paymentEntity.order_id || (notes.razorpay_order_id || notes.order_id || "");
    
    // Amount conversion: Razorpay passes amount in Paise (e.g., 9900 -> 99.00)
    var rawAmount = paymentEntity.amount;
    var formattedAmount = "0.00";
    if (typeof rawAmount === "number") {
      formattedAmount = (rawAmount / 100).toFixed(2);
    } else if (typeof rawAmount === "string") {
      var numericAmount = parseFloat(rawAmount.replace(/[^0-9.]/g, ""));
      if (!isNaN(numericAmount)) {
        formattedAmount = (rawAmount.indexOf("₹") !== -1 || rawAmount.indexOf(".") !== -1) 
          ? numericAmount.toFixed(2) 
          : (numericAmount > 500 ? (numericAmount / 100).toFixed(2) : numericAmount.toFixed(2));
      }
    }

    var currency = paymentEntity.currency || "INR";
    var status = paymentEntity.status || (eventType === "payment.captured" ? "captured" : "initiated");
    var customerName = (notes.customer_name || notes.name || notes.fullName || paymentEntity.name || "").trim();
    var email = (paymentEntity.email || notes.email || "").trim();
    var contactRaw = (paymentEntity.contact || paymentEntity.phone || notes.phone || notes.contact || "").toString().trim();
    var phone = contactRaw ? (contactRaw.startsWith("'") ? contactRaw : "'" + contactRaw) : "";
    var paymentMethod = paymentEntity.method || (notes.method || "online");
    var description = paymentEntity.description || notes.description || "AI Creator Community Membership";

    // Created At Timestamp (Razorpay sends Unix Epoch Seconds)
    var createdAtFormatted = "";
    if (paymentEntity.created_at) {
      try {
        var createdDate = new Date(paymentEntity.created_at * 1000);
        createdAtFormatted = Utilities.formatDate(createdDate, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
      } catch (dateErr) {
        createdAtFormatted = paymentEntity.created_at.toString();
      }
    } else {
      createdAtFormatted = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
    }

    // Processed Timestamp
    var timestampNow = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);

    // UTM Parameters from Notes
    var utmSource = notes.utm_source || "";
    var utmMedium = notes.utm_medium || "";
    var utmCampaign = notes.utm_campaign || "";
    var utmContent = notes.utm_content || "";
    var utmTerm = notes.utm_term || "";

    // 7. Duplicate Detection Check: Payment ID + Event
    if (paymentId && sheet.getLastRow() > 1) {
      var lastRow = sheet.getLastRow();
      // Read Event (Col 2) and Payment ID (Col 3)
      var existingRecords = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
      for (var i = 0; i < existingRecords.length; i++) {
        var existingEvent = existingRecords[i][0];
        var existingPaymentId = existingRecords[i][1];
        
        if (existingPaymentId === paymentId && existingEvent === eventType) {
          Logger.log("[Duplicate Prevented] Payment ID " + paymentId + " with event " + eventType + " already exists at row " + (i + 2));
          return ContentService.createTextOutput(JSON.stringify({
            status: "success",
            duplicate: true,
            message: "Duplicate event detected and ignored.",
            payment_id: paymentId,
            event: eventType,
            existing_row: (i + 2)
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    // 8. Append New Row to Sheet1
    var rowData = [
      timestampNow,         // 1. Timestamp
      eventType,            // 2. Event
      paymentId,            // 3. Payment ID
      orderId,              // 4. Order ID
      "₹" + formattedAmount,// 5. Amount
      currency,             // 6. Currency
      status,               // 7. Status
      customerName,         // 8. Customer Name
      email,                // 9. Email
      phone,                // 10. Phone
      paymentMethod,        // 11. Payment Method
      createdAtFormatted,   // 12. Created At
      razorpayOrderId,      // 13. Razorpay Order ID
      description,          // 14. Description
      utmSource,            // 15. UTM Source
      utmMedium,            // 16. UTM Medium
      utmCampaign,          // 17. UTM Campaign
      utmContent,           // 18. UTM Content
      utmTerm               // 19. UTM Term
    ];

    sheet.appendRow(rowData);
    var newRowIndex = sheet.getLastRow();

    // 9. Row Formatting & Visual Highlights
    sheet.getRange(newRowIndex, 1).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 2).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 3).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 5).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 6).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 7).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 10).setHorizontalAlignment("center");
    sheet.getRange(newRowIndex, 12).setHorizontalAlignment("center");

    var statusCell = sheet.getRange(newRowIndex, 7);
    statusCell.setFontWeight("bold");
    if (status === "captured" || status === "success" || eventType === "payment.captured") {
      statusCell.setFontColor("#008000"); // Success Green
    } else if (status === "failed" || eventType === "payment.failed") {
      statusCell.setFontColor("#D90429"); // Failure Red
    } else {
      statusCell.setFontColor("#E67E22"); // Warning Orange
    }

    // Auto-fit columns
    for (var col = 1; col <= requiredHeaders.length; col++) {
      sheet.autoResizeColumn(col);
    }

    Logger.log("[Success] Successfully saved webhook event " + eventType + " for Payment ID " + paymentId + " at row " + newRowIndex);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Webhook processed and saved to Sheet1.",
      payment_id: paymentId,
      event: eventType,
      row: newRowIndex
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("[Webhook Error] Exception: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
