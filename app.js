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
  
  // Optional Razorpay API Key ID (Leave blank to use simulate mode, or enter your live/test key)
  razorpayKeyId: "",

  // Razorpay Hosted Payment Page link. Set to "" to run in simulation mode. 
  // Paste your active Razorpay Payment Page URL here when going live.
  razorpayPageLink: "https://razorpay.me/@jaysandigital?amount=CVDUr6Uxp2FOGZGwAHntNg%3D%3D",
};

document.addEventListener("DOMContentLoaded", () => {
  initSneakerGallery();
  initPaymentModal();
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
    } else if (eventName === 'initiate_checkout') {
      fbq('track', 'InitiateCheckout', { value: eventData.value || 99, currency: 'INR' });
    }
  }

  console.log(`[GTM Event Manager] Fired: ${eventName}`, eventData);
}

/**
 * 3. Checkout & Payment Modal Flow
 */
function initPaymentModal() {
  const modal = document.getElementById("payment-modal");
  const closeBtn = document.getElementById("modal-close");
  const joinButtons = document.querySelectorAll(".btn-join-now");
  
  const upiTab = document.getElementById("tab-upi");
  const cardTab = document.getElementById("tab-card");
  const upiPanel = document.getElementById("panel-upi");
  const cardPanel = document.getElementById("panel-card");
  
  const upiIdText = document.getElementById("upi-id-text");
  const upiQrImage = document.getElementById("upi-qr-image");
  const qrSpinner = document.getElementById("qr-spinner");
  const btnCopyUpi = document.getElementById("btn-copy-upi");
  
  const btnVerifyUpi = document.getElementById("btn-verify-upi-payment");
  const btnStartCard = document.getElementById("btn-start-card-payment");
  
  const processingOverlay = document.getElementById("processing-overlay");
  const successOverlay = document.getElementById("success-overlay");
  const progressBar = document.getElementById("progress-bar");
  const btnWhatsappDirect = document.getElementById("btn-whatsapp-direct");
  
  if (!modal) return;

  // Trigger Checkout: Fire GTM InitiateCheckout tracking event and open checkout
  joinButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      trackEvent('initiate_checkout', {
        value: CONFIG.ticketPrice,
        currency: "INR",
        item_name: "AI Creator Community Membership"
      });

      if (CONFIG.razorpayPageLink) {
        window.location.href = CONFIG.razorpayPageLink;
      } else if (CONFIG.razorpayKeyId) {
        launchRazorpay("", "", "");
      } else {
        openModal();
      }
    });
  });

  // Close Modal
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // Tab Toggle Logic
  upiTab.addEventListener("click", () => switchTab(upiTab, upiPanel));
  cardTab.addEventListener("click", () => switchTab(cardTab, cardPanel));

  // Copy UPI ID to Clipboard
  btnCopyUpi.addEventListener("click", () => {
    navigator.clipboard.writeText(CONFIG.upiId).then(() => {
      const originalHtml = btnCopyUpi.innerHTML;
      btnCopyUpi.innerHTML = '<i class="fa-solid fa-check" style="color: #2ed573;"></i>';
      setTimeout(() => {
        btnCopyUpi.innerHTML = originalHtml;
      }, 1500);
    });
  });

  // Verify UPI Payment Flow
  btnVerifyUpi.addEventListener("click", () => {
    startVerificationFlow();
  });

  // Razorpay Checkout / Form Submission Flow
  btnStartCard.addEventListener("click", () => {
    const name = document.getElementById("payer-name").value;
    const phone = document.getElementById("payer-phone").value;
    const email = document.getElementById("payer-email").value;

    if (!name || !phone || !email) {
      alert("Please fill in all details to initiate transaction securely.");
      return;
    }

    if (CONFIG.razorpayPageLink) {
      // Redirect directly to the user's hosted Razorpay payment page
      window.location.href = CONFIG.razorpayPageLink;
    } else if (CONFIG.razorpayKeyId) {
      launchRazorpay(name, email, phone);
    } else {
      // Simulate Razorpay Gateway Modal
      startVerificationFlow();
    }
  });

  // Direct WhatsApp Button click override
  btnWhatsappDirect.addEventListener("click", () => {
    window.location.href = CONFIG.whatsappLink;
  });

  // Auto-trigger WhatsApp redirect modal if returning from payment redirect with success status
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("payment") === "success" || urlParams.get("status") === "success" || urlParams.get("paid") === "true") {
    showSuccessModal(urlParams.get("txnid") || ("TXN_" + Date.now()));
  }

  function openModal() {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    generateUpiQR();
  }

  function closeModal() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }

  function switchTab(activeTab, activePanel) {
    [upiTab, cardTab].forEach(t => t.classList.remove("active"));
    [upiPanel, cardPanel].forEach(p => p.classList.remove("active"));
    
    activeTab.classList.add("active");
    activePanel.classList.add("active");
  }

  // Generates dynamic UPI Intent payment QR Code
  function generateUpiQR() {
    upiIdText.textContent = CONFIG.upiId;
    qrSpinner.style.opacity = "1";
    
    // Construct UPI Deep Link Payload (simplified to P2P standard to avoid NPCI/PhonePe security blocks)
    const upiPayload = `upi://pay?pa=${encodeURIComponent(CONFIG.upiId)}&pn=${encodeURIComponent(CONFIG.payeeName)}`;
    
    // Dynamically retrieve QR code using the dynamic qrserver api
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiPayload)}`;
    
    upiQrImage.onload = () => {
      qrSpinner.style.opacity = "0";
    };
    upiQrImage.src = qrUrl;
  }

  // Handles simulated security checks and redirect trigger
  function startVerificationFlow() {
    closeModal();
    processingOverlay.classList.add("active");

    // Simulate Secure bank server verification delay (2.5 seconds)
    setTimeout(() => {
      processingOverlay.classList.remove("active");
      showSuccessModal();
    }, 2500);
  }

  function showSuccessModal(txnId = null) {
    // Fire Purchase event to GTM & Meta Pixel Event Manager
    trackEvent('purchase', {
      value: CONFIG.ticketPrice,
      currency: "INR",
      transaction_id: txnId || ("TXN_" + Date.now()),
      item_name: "AI Creator Community Membership",
      redirect_url: CONFIG.whatsappLink
    });

    successOverlay.classList.add("active");
    
    // Initialize loading progress animation
    setTimeout(() => {
      progressBar.style.width = "100%";
    }, 100);

    // Redirect to WhatsApp Community after loading bar (3 seconds)
    setTimeout(() => {
      window.location.href = CONFIG.whatsappLink;
    }, 3200);
  }

  // Integrates the official Razorpay SDK client payment
  function launchRazorpay(name, email, phone) {
    // Dynamic loading of Razorpay library
    if (typeof Razorpay === "undefined") {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => initiateCheckout(name, email, phone);
      document.body.appendChild(script);
    } else {
      initiateCheckout(name, email, phone);
    }
  }

  function initiateCheckout(name, email, phone) {
    const options = {
      key: CONFIG.razorpayKeyId,
      amount: CONFIG.ticketPrice * 100, // Razorpay amount in paise
      currency: "INR",
      name: CONFIG.payeeName,
      description: "AI Creator Community Membership",
      image: "assets/logo (1).png",
      handler: function (response) {
        // Payment success callback
        if (response.razorpay_payment_id) {
          startVerificationFlow();
        }
      },
      prefill: {
        name: name,
        email: email,
        contact: phone,
      },
      theme: {
        color: "#003884",
      },
    };
    const rzp = new Razorpay(options);
    rzp.open();
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
