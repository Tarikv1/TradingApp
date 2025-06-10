// Enhanced Profile JavaScript with complete functionality
const db = firebase.firestore();
let currentUser = null;
let selectedAvatarBase64 = null;
let originalUserData = {};

// Toast function
function showToast(message, type = 'info') {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Format date
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short'
  }).format(date);
}

// Load user profile data
async function loadUserProfile() {
  if (!currentUser) return;

  try {
    const userRef = db.collection("users").doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      originalUserData = { ...data };
      
      // Populate form fields
      document.getElementById("firstName").value = data.firstName || "";
      document.getElementById("lastName").value = data.lastName || "";
      document.getElementById("displayName").value = data.displayName || "";
      document.getElementById("email").value = currentUser.email || "";
      
      // Update avatar
      const navAvatar = document.getElementById("nav-avatar");
      const profileAvatar = document.getElementById("avatarPreview");
      
      if (data.avatarBase64) {
        navAvatar.src = data.avatarBase64;
        profileAvatar.src = data.avatarBase64;
      } else {
        const defaultAvatar = "https://i.pravatar.cc/150?u=default";
        navAvatar.src = defaultAvatar;
        profileAvatar.src = defaultAvatar;
      }
      
      // Update pro status
      updateProStatus(data.proStatus || false);
      
      // Update stats
      updateAccountStats(data);
      
      // Update member since
      if (data.createdAt) {
        const memberSince = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        document.getElementById("memberSince").textContent = formatDate(memberSince);
      } else {
        document.getElementById("memberSince").textContent = formatDate(new Date());
      }
      
    } else {
      console.log("No user document found");
      showToast("User profile not found", 'error');
    }
  } catch (error) {
    console.error("❌ Error loading user profile:", error);
    showToast("Failed to load profile", 'error');
  }
}

// Update pro status display
function updateProStatus(isProUser) {
  const statusBadge = document.getElementById("proStatusBadge");
  const statusText = document.getElementById("proStatusText");
  const statusDescription = document.getElementById("proStatusDescription");
  const upgradePrompt = document.getElementById("upgradePrompt");
  
  if (isProUser) {
    statusBadge.className = "status-badge pro";
    statusText.innerHTML = '<i class="fas fa-crown"></i> Pro User';
    statusDescription.textContent = "You have access to all premium features";
    upgradePrompt.style.display = "none";
  } else {
    statusBadge.className = "status-badge free";
    statusText.innerHTML = '<i class="fas fa-user"></i> Free User';
    statusDescription.textContent = "Upgrade to unlock premium features";
    upgradePrompt.style.display = "block";
  }
}

// Update account statistics
function updateAccountStats(userData) {
  const watchlistCount = document.getElementById("watchlistCount");
  const portfolioCount = document.getElementById("portfolioCount");
  
  watchlistCount.textContent = (userData.watchlist || []).length;
  portfolioCount.textContent = (userData.portfolio || []).length;
}

// Handle avatar upload
function setupAvatarUpload() {
  const avatarInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarContainer = document.querySelector(".avatar-container");
  
  avatarInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast("Please select a valid image file", 'error');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image size must be less than 5MB", 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      selectedAvatarBase64 = e.target.result;
      avatarPreview.src = selectedAvatarBase64;
      document.getElementById("nav-avatar").src = selectedAvatarBase64;
      showToast("Avatar updated. Don't forget to save changes!", 'info');
    };
    reader.readAsDataURL(file);
  });
  
  // Make the entire avatar container clickable
  avatarContainer.addEventListener("click", () => {
    avatarInput.click();
  });
}

// Save profile changes
async function saveProfile() {
  if (!currentUser) {
    showToast("Please sign in to save changes", 'error');
    return;
  }
  
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const displayName = document.getElementById("displayName").value.trim();
  
  // Validation
  if (!firstName || !lastName) {
    showToast("First name and last name are required", 'error');
    return;
  }
  
  if (!displayName) {
    showToast("Display name is required", 'error');
    return;
  }
  
  // Show loading state
  const saveBtn = document.getElementById("saveProfile");
  const originalHTML = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  saveBtn.disabled = true;
  
  try {
    // Update Firebase Auth profile
    await currentUser.updateProfile({ displayName });
    
    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      displayName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Include avatar if changed
    if (selectedAvatarBase64) {
      updateData.avatarBase64 = selectedAvatarBase64;
    }
    
    // Update Firestore document
    const userRef = db.collection("users").doc(currentUser.uid);
    await userRef.update(updateData);
    
    // Update original data to reflect changes
    originalUserData = { ...originalUserData, ...updateData };
    selectedAvatarBase64 = null; // Reset since it's now saved
    
    showToast("Profile updated successfully!", 'success');
    
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    showToast("Failed to update profile", 'error');
  } finally {
    // Restore button state
    saveBtn.innerHTML = originalHTML;
    saveBtn.disabled = false;
  }
}

// Reset form to original values
function resetForm() {
  document.getElementById("firstName").value = originalUserData.firstName || "";
  document.getElementById("lastName").value = originalUserData.lastName || "";
  document.getElementById("displayName").value = originalUserData.displayName || "";
  
  // Reset avatar
  const avatarPreview = document.getElementById("avatarPreview");
  const navAvatar = document.getElementById("nav-avatar");
  
  if (originalUserData.avatarBase64) {
    avatarPreview.src = originalUserData.avatarBase64;
    navAvatar.src = originalUserData.avatarBase64;
  } else {
    const defaultAvatar = "https://i.pravatar.cc/150?u=default";
    avatarPreview.src = defaultAvatar;
    navAvatar.src = defaultAvatar;
  }
  
  selectedAvatarBase64 = null;
  showToast("Form reset to original values", 'info');
}

// Setup theme toggle
function setupThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");
  const currentTheme = localStorage.getItem("theme") || "dark";
  
  // Set initial theme
  document.body.classList.toggle("light-mode", currentTheme === "light");
  updateThemeButton(currentTheme);
  
  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light-mode");
    const newTheme = isLight ? "dark" : "light";
    
    document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", newTheme);
    updateThemeButton(newTheme);
    
    showToast(`Switched to ${newTheme} mode`, 'info');
  });
}

function updateThemeButton(theme) {
  const themeToggle = document.getElementById("themeToggle");
  if (theme === "light") {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
  }
}

// Setup notifications toggle
function setupNotificationsToggle() {
  const notificationsToggle = document.getElementById("notifications");
  const savedPreference = localStorage.getItem("notifications") !== "false";
  
  notificationsToggle.checked = savedPreference;
  
  notificationsToggle.addEventListener("change", () => {
    localStorage.setItem("notifications", notificationsToggle.checked);
    showToast(`Notifications ${notificationsToggle.checked ? 'enabled' : 'disabled'}`, 'info');
  });
}

// Setup currency selector
function setupCurrencySelector() {
  const currencySelect = document.getElementById("currencySelect");
  const savedCurrency = localStorage.getItem("currency") || "USD";
  
  currencySelect.value = savedCurrency;
  
  currencySelect.addEventListener("change", () => {
    localStorage.setItem("currency", currencySelect.value);
    showToast(`Currency changed to ${currencySelect.value}`, 'info');
  });
}

// Setup logout functionality
function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  
  logoutBtn.addEventListener("click", async () => {
    try {
      await firebase.auth().signOut();
      showToast("Signed out successfully", 'success');
      setTimeout(() => {
        window.location.href = "../auth/auth.html";
      }, 1000);
    } catch (error) {
      console.error("❌ Error signing out:", error);
      showToast("Failed to sign out", 'error');
    }
  });
}

// Setup form event listeners
function setupFormEvents() {
  // Save profile button
  document.getElementById("saveProfile").addEventListener("click", saveProfile);
  
  // Reset form button
  document.getElementById("resetForm").addEventListener("click", resetForm);
  
  // Form submission (Enter key)
  document.querySelectorAll(".form-input").forEach(input => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !input.readOnly) {
        saveProfile();
      }
    });
  });
  
  // Real-time validation feedback
  document.getElementById("firstName").addEventListener("input", validateFirstName);
  document.getElementById("lastName").addEventListener("input", validateLastName);
  document.getElementById("displayName").addEventListener("input", validateDisplayName);
}

// Validation functions
function validateFirstName() {
  const input = document.getElementById("firstName");
  const value = input.value.trim();
  
  if (value.length > 0 && value.length < 2) {
    input.style.borderColor = "var(--accent-red)";
  } else {
    input.style.borderColor = "";
  }
}

function validateLastName() {
  const input = document.getElementById("lastName");
  const value = input.value.trim();
  
  if (value.length > 0 && value.length < 2) {
    input.style.borderColor = "var(--accent-red)";
  } else {
    input.style.borderColor = "";
  }
}

function validateDisplayName() {
  const input = document.getElementById("displayName");
  const value = input.value.trim();
  
  if (value.length > 0 && value.length < 3) {
    input.style.borderColor = "var(--accent-red)";
  } else {
    input.style.borderColor = "";
  }
}

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
  // Setup all functionality
  setupAvatarUpload();
  setupFormEvents();
  setupThemeToggle();
  setupNotificationsToggle();
  setupCurrencySelector();
  setupLogout();
  
  // Firebase auth state change handler
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile();
    } else {
      // No user signed in, redirect to auth
      window.location.href = "../auth/auth.html";
    }
  });
});

// Add some additional animations and interactions
document.addEventListener("DOMContentLoaded", () => {
  // Stagger card animations
  const cards = document.querySelectorAll('.profile-card, .status-card, .settings-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 200);
  });
  
  // Add hover effects to form inputs
  document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.style.transform = 'translateY(0)';
    });
  });
});