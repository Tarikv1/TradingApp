// Enhanced Upgrade Page JavaScript with complete functionality
let currentUser = null;
let isAnnualBilling = false;

// Initialize Firestore
const db = firebase.firestore();

// Toast function
function showToast(message, type = 'info') {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Update pricing display based on billing period
function updatePricing() {
  const monthlyElements = document.querySelectorAll('.monthly-price, .monthly-period');
  const annualElements = document.querySelectorAll('.annual-price, .annual-period, .annual-note');
  
  if (isAnnualBilling) {
    monthlyElements.forEach(el => el.style.display = 'none');
    annualElements.forEach(el => el.style.display = 'inline');
  } else {
    monthlyElements.forEach(el => el.style.display = 'inline');
    annualElements.forEach(el => el.style.display = 'none');
  }
}

// Setup pricing toggle
function setupPricingToggle() {
  const toggle = document.getElementById('pricing-toggle');
  
  toggle.addEventListener('change', () => {
    isAnnualBilling = toggle.checked;
    updatePricing();
    
    // Add a subtle animation to pricing cards
    document.querySelectorAll('.pricing-card').forEach(card => {
      card.style.transform = 'scale(0.98)';
      setTimeout(() => {
        card.style.transform = '';
      }, 150);
    });
  });
}

// Setup FAQ accordion
function setupFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all other FAQ items
      document.querySelectorAll('.faq-item').forEach(otherItem => {
        otherItem.classList.remove('active');
      });
      
      // Toggle current item
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// Handle upgrade process
async function handleUpgrade() {
  if (!currentUser) {
    showToast('Please sign in to upgrade your account', 'error');
    setTimeout(() => {
      window.location.href = '../auth/auth.html';
    }, 2000);
    return;
  }

  const button = document.getElementById('upgrade-button');
  const originalHTML = button.innerHTML;
  
  try {
    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    button.disabled = true;
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update user's pro status in Firestore
    const userRef = db.collection('users').doc(currentUser.uid);
    await userRef.update({
      proStatus: true,
      upgradeDate: firebase.firestore.FieldValue.serverTimestamp(),
      billingPeriod: isAnnualBilling ? 'annual' : 'monthly'
    });
    
    showToast('🎉 Welcome to StockWizard Pro!', 'success');
    
    // Update button to show success
    button.innerHTML = '<i class="fas fa-check"></i> Upgraded to Pro!';
    button.classList.add('current-plan');
    
    // Redirect to dashboard after delay
    setTimeout(() => {
      window.location.href = '../dashboard/dashboard.html';
    }, 3000);
    
  } catch (error) {
    console.error('❌ Upgrade error:', error);
    showToast('Upgrade failed. Please try again.', 'error');
    
    // Restore button
    button.innerHTML = originalHTML;
    button.disabled = false;
  }
}

// Setup upgrade buttons
function setupUpgradeButtons() {
  // Main upgrade button
  document.getElementById('upgrade-button').addEventListener('click', handleUpgrade);
  
  // CTA upgrade button
  document.getElementById('cta-upgrade').addEventListener('click', handleUpgrade);
  
  // Contact sales buttons
  document.querySelectorAll('.contact-button, #contact-sales').forEach(btn => {
    btn.addEventListener('click', openContactModal);
  });
}

// Contact modal functions
function openContactModal() {
  document.getElementById('contact-modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeContactModal() {
  document.getElementById('contact-modal').classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('contact-form').reset();
}

// Setup contact modal
function setupContactModal() {
  const modal = document.getElementById('contact-modal');
  const closeBtn = document.getElementById('contact-modal-close');
  const cancelBtn = document.getElementById('contact-cancel');
  const form = document.getElementById('contact-form');

  closeBtn.addEventListener('click', closeContactModal);
  cancelBtn.addEventListener('click', closeContactModal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeContactModal();
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      name: document.getElementById('contact-name').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      company: document.getElementById('contact-company').value.trim(),
      teamSize: document.getElementById('contact-size').value,
      message: document.getElementById('contact-message').value.trim(),
      timestamp: new Date().toISOString(),
      userId: currentUser?.uid || null
    };
    
    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    const submitBtn = form.querySelector('.submit-btn');
    const originalHTML = submitBtn.innerHTML;
    
    try {
      // Show loading state
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      submitBtn.disabled = true;
      
      // Save contact request to Firestore
      await db.collection('contact-requests').add(formData);
      
      showToast('Message sent successfully! We\'ll get back to you soon.', 'success');
      closeContactModal();
      
    } catch (error) {
      console.error('❌ Contact form error:', error);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      // Restore button
      submitBtn.innerHTML = originalHTML;
      submitBtn.disabled = false;
    }
  });
}

// Check user's current plan status
async function checkUserPlanStatus() {
  if (!currentUser) return;

  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const userData = doc.data();
      const isProUser = userData.proStatus || false;
      
      if (isProUser) {
        // Update UI for Pro users
        const upgradeButton = document.getElementById('upgrade-button');
        const ctaButton = document.getElementById('cta-upgrade');
        
        upgradeButton.innerHTML = '<i class="fas fa-check"></i> Current Plan';
        upgradeButton.classList.add('current-plan');
        upgradeButton.disabled = true;
        
        ctaButton.innerHTML = '<i class="fas fa-crown"></i> You\'re Pro!';
        ctaButton.classList.remove('primary');
        ctaButton.classList.add('current-plan');
        ctaButton.disabled = true;
        
        // Update free plan button
        const freePlanBtn = document.querySelector('.free-plan .plan-button');
        freePlanBtn.innerHTML = '<i class="fas fa-crown"></i> Upgraded to Pro';
        freePlanBtn.style.background = 'var(--gradient-pro)';
        freePlanBtn.style.color = 'white';
      }
    }
  } catch (error) {
    console.error('❌ Error checking plan status:', error);
  }
}

// Load user avatar
async function loadUserAvatar() {
  if (!currentUser) return;

  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      const avatar = document.getElementById('user-avatar');
      
      if (data.avatarBase64) {
        avatar.src = data.avatarBase64;
      } else {
        avatar.src = 'https://i.pravatar.cc/150?u=default';
      }
    }
  } catch (error) {
    console.error('❌ Error loading user avatar:', error);
  }
}

// Setup navigation
function setupNavigation() {
  const avatar = document.getElementById('user-avatar');
  const signinBtn = document.getElementById('signin-btn');
  
  avatar.addEventListener('click', () => {
    window.location.href = '../profile/profile.html';
  });
  
  signinBtn.addEventListener('click', () => {
    window.location.href = '../auth/auth.html';
  });
}

// Add scroll animations
function setupScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe sections for animations
  document.querySelectorAll('.pricing-card, .testimonial-card, .faq-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
}

// Add floating animations to hero cards
function setupHeroAnimations() {
  const cards = document.querySelectorAll('.floating-card');
  
  cards.forEach((card, index) => {
    // Add mouseover effects
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-20px) scale(1.1)';
      card.style.zIndex = '10';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.zIndex = '';
    });
  });
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
      closeContactModal();
    }
    
    // Enter to trigger focused buttons
    if (e.key === 'Enter' && e.target.tagName === 'BUTTON') {
      e.target.click();
    }
  });
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  // Setup all functionality
  setupPricingToggle();
  setupFAQ();
  setupUpgradeButtons();
  setupContactModal();
  setupNavigation();
  setupScrollAnimations();
  setupHeroAnimations();
  setupKeyboardNavigation();
  
  // Initialize pricing display
  updatePricing();

  // Firebase auth state change handler
  firebase.auth().onAuthStateChanged(async (user) => {
    const avatar = document.getElementById('user-avatar');
    const signinBtn = document.getElementById('signin-btn');

    if (user) {
      currentUser = user;
      
      // Show user elements
      avatar.style.display = 'block';
      signinBtn.style.display = 'none';
      
      // Load user data
      await loadUserAvatar();
      await checkUserPlanStatus();
    } else {
      // No user signed in
      currentUser = null;
      
      // Show signin button
      avatar.style.display = 'none';
      signinBtn.style.display = 'flex';
    }
  });
});

// Add some interactive enhancements
document.addEventListener('DOMContentLoaded', () => {
  // Stagger section animations
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    setTimeout(() => {
      section.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    }, index * 200);
  });
  
  // Add hover effects to pricing cards
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.borderColor = 'rgba(79, 124, 255, 0.3)';
    });
    
    card.addEventListener('mouseleave', function() {
      if (!this.classList.contains('popular')) {
        this.style.borderColor = '';
      }
    });
  });
  
  // Add click ripple effect to buttons
  document.querySelectorAll('button, .cta-button').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('div');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
});

// Add ripple effect styles
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  button, .cta-button {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

// Handle page visibility for analytics
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // User returned to page - could track engagement
    console.log('User returned to upgrade page');
  }
});

// Track scroll depth for analytics
let maxScrollDepth = 0;
window.addEventListener('scroll', () => {
  const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  if (scrollDepth > maxScrollDepth) {
    maxScrollDepth = scrollDepth;
    // Could send analytics event here
    if (scrollDepth === 100) {
      console.log('User scrolled to bottom of upgrade page');
    }
  }
});

// Add performance monitoring
window.addEventListener('load', () => {
  console.log('✅ Upgrade page loaded successfully');
});

// Error handling for failed network requests
window.addEventListener('error', (e) => {
  console.error('❌ Page error:', e.error);
  showToast('Something went wrong. Please refresh the page.', 'error');
});

// Handle offline/online status
window.addEventListener('offline', () => {
  showToast('You\'re offline. Some features may not work.', 'error');
});

window.addEventListener('online', () => {
  showToast('You\'re back online!', 'success');
});