/**
 * JaySan Digital Skill Academy Landing Page - Logic & Payments
 * 
 * Custom configurations for payments and community redirects are located in
 * the CONFIG object below.
 */

const CONFIG = {
  // The WhatsApp Community group link users join after payment.
  whatsappLink: "https://chat.whatsapp.com/DsQdAzZRgFU8bI6BQzmnLm",
  
  // Payee UPI ID for generating the dynamic QR code
  upiId: "9178405636@ybl",
  
  // Payee Name displayed on UPI checkout
  payeeName: "Sanjaya Kumar Patro",
  
  // Community Join Fee in INR
  ticketPrice: 99,
  
  // Optional Razorpay API Key ID (Leave blank when using Hosted Payment Page)
  razorpayKeyId: "",

  // Razorpay Hosted Payment Page link.
  razorpayPageLink: "https://rzp.io/rzp/pUF7Ssh2",

  // Google Sheet URL for your reference
  googleSheetUrl: "https://docs.google.com/spreadsheets/d/1E7Z1G3bcATI0NrIZryYGClfvFr1lq5f9_vp1nhZjfg/edit?usp=sharing",

  // Google Apps Script Webhook URL for real-time Google Sheet sync
  googleSheetScriptUrl: "https://script.google.com/macros/s/AKfycbzAHDKix4xCIcpX-tQdvs7rz4GrJ8eH7mp6Fc8GD17kb_wZhZh_i9-pY4L1w4JBN_7-/exec",
};

/**
 * UTM & Click ID Tracking Manager
 * Preserves utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid
 */
function getTrackingParams() {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  const tracking = {};

  utmKeys.forEach(key => {
    const val = params.get(key) || sessionStorage.getItem("saved_" + key) || localStorage.getItem("saved_" + key) || "";
    if (val) {
      tracking[key] = val;
      try {
        sessionStorage.setItem("saved_" + key, val);
        localStorage.setItem("saved_" + key, val);
      } catch (e) {}
    } else {
      tracking[key] = "";
    }
  });

  return tracking;
}

document.addEventListener("DOMContentLoaded", () => {
  // Capture URL tracking parameters on initial load
  getTrackingParams();
  initSneakerGallery();
  initDirectCheckout();
  initCollageFrameInteractivity();
  initStickyCTA();
  initWorkshopCountdown();
  initFAQAccordion();
});

/**
 * 1. Sneaker Gallery Interactivity
 */
function initSneakerGallery() {
  const mainImage = document.getElementById("main-product-image");
  const thumbnails = document.querySelectorAll("#shoe-thumbnails .thumb-wrapper");
  
  if (!mainImage || thumbnails.length === 0) return;

  thumbnails.forEach(thumb => {
    thumb.addEventListener("click", () => {
      // Remove active class from all thumbnails
      thumbnails.forEach(t => t.classList.remove("active"));
      
      // Add active class to clicked thumbnail
      thumb.classList.add("active");
      
      // Apply style transform matching the perspective crop
      const styleType = thumb.getAttribute("data-style");
      
      // Reset image classes
      mainImage.className = "product-main-view";
      
      // Apply custom class to main preview depending on view clicked
      if (styleType === "crop-toe") {
        mainImage.classList.add("crop-toe-img");
      } else if (styleType === "crop-heel") {
        mainImage.classList.add("crop-heel-img");
      } else if (styleType === "rotate") {
        mainImage.classList.add("rotate-img");
      }
      
      // Add animation trigger
      mainImage.style.transform = "scale(0.9)";
      setTimeout(() => {
        mainImage.style.transform = "";
      }, 50);
    });
  });
}

/**
 * 2. Circular Collage Frame Orbit Interaction
 * Highlights the main image or zooms in when satellite items are hovered
 */
function initCollageFrameInteractivity() {
  const orbits = document.querySelectorAll(".collage-circle-orbit");
  const mainCircle = document.querySelector(".collage-circle-main");
  
  if (!mainCircle || orbits.length === 0) return;

  orbits.forEach(orbit => {
    orbit.addEventListener("mouseenter", () => {
      mainCircle.style.borderColor = "var(--color-accent-yellow)";
      mainCircle.style.boxShadow = "0 10px 30px rgba(243, 156, 18, 0.4)";
    });
    
    orbit.addEventListener("mouseleave", () => {
      mainCircle.style.borderColor = "var(--color-primary)";
      mainCircle.style.boxShadow = "0 10px 30px rgba(58, 134, 240, 0.4)";
    });
  });
}

/**
 * Helper function for Google Tag Manager & Meta Pixel Event Tracking
 */
function trackEvent(eventName, eventData = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...eventData,
    timestamp: new Date().toISOString()
  });

  // Meta Pixel / Facebook Event Manager fallback if active
  if (typeof fbq === 'function') {
    if (eventName === 'purchase' || eventName === 'payment_success') {
      fbq('track', 'Purchase', { value: eventData.value || 99, currency: 'INR' });
    } else if (eventName === 'initiate_checkout' || eventName === 'lead_capture') {
      fbq('track', 'InitiateCheckout', { value: eventData.value || 99, currency: 'INR' });
    }
  }

  console.log(`[GTM Event Manager] Fired: ${eventName}`, eventData);
}

/**
 * Helper function to send lead and payment data to Google Sheets
 */
async function sendDataToGoogleSheet(formData) {
  if (!CONFIG.googleSheetScriptUrl) {
    console.log("[Google Sheets] Note: Webhook URL not set in CONFIG.googleSheetScriptUrl. Storing in local cache.");
    return false;
  }

  try {
    // Mode no-cors enables sending data directly from static browser pages to Google Apps Script
    await fetch(CONFIG.googleSheetScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });
    console.log("[Google Sheets] Lead successfully sent to Google Sheet!", formData);
    return true;
  } catch (error) {
    console.error("[Google Sheets Sync Error]", error);
    return false;
  }
}

/**
 * 3. Direct Razorpay Checkout Flow
 * Redirects user directly to the Razorpay checkout page with tracking parameters.
 */
function initDirectCheckout() {
  const joinButtons = document.querySelectorAll(".btn-join-now, .btn-workshop-join, #btn-join-sticky, .faq-orange-banner, #btn-join-workshop-hero");

  joinButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      // Retrieve preserved UTM and click tracking parameters
      const tracking = getTrackingParams();

      // Track initiate_checkout event in Google Tag Manager & Meta Pixel
      trackEvent("initiate_checkout", {
        value: CONFIG.ticketPrice,
        currency: "INR",
        item_name: "AI Creator Community Membership",
        ...tracking
      });

      // Build target Razorpay redirect URL with notes/tracking params
      try {
        const redirectUrl = new URL(CONFIG.razorpayPageLink);
        if (tracking.utm_source) redirectUrl.searchParams.set("notes[utm_source]", tracking.utm_source);
        if (tracking.utm_medium) redirectUrl.searchParams.set("notes[utm_medium]", tracking.utm_medium);
        if (tracking.utm_campaign) redirectUrl.searchParams.set("notes[utm_campaign]", tracking.utm_campaign);
        if (tracking.utm_content) redirectUrl.searchParams.set("notes[utm_content]", tracking.utm_content);
        if (tracking.utm_term) redirectUrl.searchParams.set("notes[utm_term]", tracking.utm_term);
        if (tracking.gclid) redirectUrl.searchParams.set("notes[gclid]", tracking.gclid);
        if (tracking.fbclid) redirectUrl.searchParams.set("notes[fbclid]", tracking.fbclid);

        window.location.href = redirectUrl.toString();
      } catch (err) {
        window.location.href = CONFIG.razorpayPageLink;
      }
    });
  });

  // Auto-redirect to dedicated payment-success.html if returning from payment query string
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("payment") === "success" || urlParams.get("status") === "success" || urlParams.get("paid") === "true") {
    window.location.href = "payment-success.html";
  }
}

/**
 * 5. Sticky Bottom CTA Bar
 * Shows a sticky footer banner when scrolling down past the hero section.
 */
function initStickyCTA() {
  const stickyBar = document.getElementById("sticky-cta-bar");
  if (!stickyBar) return;

  window.addEventListener("scroll", () => {
    // Show the sticky bar when scrolled past 400px, otherwise hide it
    if (window.scrollY > 400) {
      stickyBar.classList.add("show");
    } else {
      stickyBar.classList.remove("show");
    }
  });
}

/**
 * 6. Workshop Live Countdown Timer
 * Sets a real-time countdown timer that keeps users motivated by showing remaining time.
 * Automatically saves state in localStorage to persist the countdown.
 */
function initWorkshopCountdown() {
  const countdownElements = document.querySelectorAll("#workshop-countdown, .workshop-countdown, .countdown-highlight, .cd, #ot_y636riqox");
  if (countdownElements.length === 0) return;

  const DEFAULT_SECONDS = 38 * 60 + 42; // 38 minutes 42 seconds (38:42)

  // Try to load remaining time from localStorage to make it persistent
  let remainingTime = localStorage.getItem("workshop_timer_seconds");
  
  if (remainingTime) {
    remainingTime = parseInt(remainingTime, 10);
    if (isNaN(remainingTime) || remainingTime <= 0) {
      remainingTime = DEFAULT_SECONDS;
    }
  } else {
    remainingTime = DEFAULT_SECONDS;
  }

  const updateDisplay = () => {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    const minStr = minutes.toString().padStart(2, '0');
    const secStr = seconds.toString().padStart(2, '0');
    
    // Update all matching elements
    countdownElements.forEach(el => {
      el.textContent = `${minStr}:${secStr}`;
    });
  };

  updateDisplay();

  const interval = setInterval(() => {
    remainingTime--;
    
    if (remainingTime <= 0) {
      remainingTime = DEFAULT_SECONDS; // Reset countdown once it expires
    }
    
    localStorage.setItem("workshop_timer_seconds", remainingTime.toString());
    updateDisplay();
  }, 1000);
}

/**
 * 7. Custom Smooth FAQ Accordion
 */
function initFAQAccordion() {
  const accordionItems = document.querySelectorAll(".accordion-item");
  
  accordionItems.forEach(item => {
    const header = item.querySelector(".accordion-header");
    const content = item.querySelector(".accordion-content");
    
    header.addEventListener("click", (e) => {
      e.preventDefault();
      const isActive = item.classList.contains("active");
      
      // Close all other accordion items
      accordionItems.forEach(otherItem => {
        otherItem.classList.remove("active");
        const otherContent = otherItem.querySelector(".accordion-content");
        otherContent.style.maxHeight = null;
      });
      
      // Toggle current active state
      if (!isActive) {
        item.classList.add("active");
        content.style.maxHeight = content.scrollHeight + "px";
      } else {
        item.classList.remove("active");
        content.style.maxHeight = null;
      }
    });
  });
}

/**
 * 7. Curriculum Tab and Accordion Toggle Handlers
 */
function switchCurriculumTab(tabName) {
  const syllabusTab = document.getElementById('curr-tab-syllabus');
  const projectsTab = document.getElementById('curr-tab-projects');
  const syllabusPanel = document.getElementById('curr-panel-syllabus');
  const projectsPanel = document.getElementById('curr-panel-projects');

  if (!syllabusTab || !projectsTab || !syllabusPanel || !projectsPanel) return;

  if (tabName === 'syllabus') {
    syllabusTab.style.backgroundColor = '#ffffff';
    syllabusTab.style.color = '#800080';
    projectsTab.style.backgroundColor = 'transparent';
    projectsTab.style.color = '#ffffff';
    syllabusPanel.style.display = 'block';
    projectsPanel.style.display = 'none';
  } else {
    projectsTab.style.backgroundColor = '#ffffff';
    projectsTab.style.color = '#800080';
    syllabusTab.style.backgroundColor = 'transparent';
    syllabusTab.style.color = '#ffffff';
    projectsPanel.style.display = 'block';
    syllabusPanel.style.display = 'none';
  }
}

function toggleModuleAccordion(btn) {
  const body = btn.nextElementSibling;
  const arrow = btn.querySelector('.module-arrow');
  if (!body) return;
  
  const isExpanded = body.style.display === 'block';

  if (isExpanded) {
    body.style.display = 'none';
    btn.style.backgroundColor = '#ffffff';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'block';
    btn.style.backgroundColor = '#FCF4FC';
    if (arrow) arrow.style.transform = 'rotate(180deg)';
  }
}

/**
 * 8. Certificate Proof Interactive Slider
 */
let currentCertSlideIndex = 0;

function moveCertSlide(direction) {
  const slides = document.querySelectorAll('.cert-slide');
  if (!slides || slides.length === 0) return;
  
  currentCertSlideIndex += direction;
  if (currentCertSlideIndex < 0) {
    currentCertSlideIndex = slides.length - 1;
  } else if (currentCertSlideIndex >= slides.length) {
    currentCertSlideIndex = 0;
  }
  
  updateCertSlider();
}

function goToCertSlide(index) {
  currentCertSlideIndex = index;
  updateCertSlider();
}

function updateCertSlider() {
  const track = document.getElementById('cert-slider-track');
  const dots = document.querySelectorAll('.cert-dot');
  if (!track) return;
  
  track.style.transform = `translateX(-${currentCertSlideIndex * 100}%)`;
  
  dots.forEach((dot, idx) => {
    if (idx === currentCertSlideIndex) {
      dot.style.backgroundColor = '#800080';
      dot.style.width = '28px';
    } else {
      dot.style.backgroundColor = '#D9D9D9';
      dot.style.width = '12px';
    }
  });
}
