// Enhanced Auth JavaScript with proper functionality
let authMode = 'signin';

// DOM Elements
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const nameFields = document.getElementById("name-fields");
const signInToggle = document.getElementById("signin-toggle");
const signUpToggle = document.getElementById("signup-toggle");
const submitBtn = document.getElementById("submit-btn");
const footerLink = document.getElementById("footer-link");
const googleBtn = document.getElementById("google-btn");
const appleBtn = document.getElementById("apple-btn");

// Initialize Firestore
const db = firebase.firestore();

// Toast function
function showToast(message, type = 'info') {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Update UI based on auth mode
function updateAuthMode(mode) {
  authMode = mode;
  
  if (mode === 'signin') {
    signInToggle.classList.add("active");
    signUpToggle.classList.remove("active");
    nameFields.classList.remove("show");
    submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Sign In</span>';
    footerLink.textContent = "Sign Up";
  } else {
    signUpToggle.classList.add("active");
    signInToggle.classList.remove("active");
    nameFields.classList.add("show");
    submitBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Create Account</span>';
    footerLink.textContent = "Sign In";
  }
}

// Event Listeners
signInToggle.addEventListener("click", () => updateAuthMode('signin'));
signUpToggle.addEventListener("click", () => updateAuthMode('signup'));

footerLink.addEventListener("click", (e) => {
  e.preventDefault();
  updateAuthMode(authMode === 'signin' ? 'signup' : 'signin');
});

// Form validation
function validateForm() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  if (!email || !password) {
    showToast("Please fill in all required fields", 'error');
    return false;
  }
  
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", 'error');
    return false;
  }
  
  if (authMode === 'signup') {
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    
    if (!firstName || !lastName) {
      showToast("Please enter your first and last name", 'error');
      return false;
    }
  }
  
  return true;
}

// Main form submission
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  
  // Show loading state
  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processing...</span>';
  submitBtn.disabled = true;
  
  try {
    if (authMode === "signin") {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      showToast("Welcome back!", 'success');
    } else {
      const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const user = result.user;
      const displayName = `${firstName} ${lastName}`;
      
      // Update user profile
      await user.updateProfile({ displayName });
      
      // Save user data to Firestore
      await db.collection("users").doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName,
        firstName,
        lastName,
        watchlist: [],
        portfolio: [],
        proStatus: false,
        avatarBase64: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showToast("Account created successfully!", 'success');
    }
    
    // Redirect after short delay
    setTimeout(() => {
      window.location.href = "../dashboard/dashboard.html";
    }, 1000);
    
  } catch (err) {
    console.error("Auth error:", err);
    
    // Handle specific error messages
    let errorMessage = "An error occurred. Please try again.";
    
    switch (err.code) {
      case 'auth/user-not-found':
        errorMessage = "No account found with this email.";
        break;
      case 'auth/wrong-password':
        errorMessage = "Incorrect password.";
        break;
      case 'auth/email-already-in-use':
        errorMessage = "An account with this email already exists.";
        break;
      case 'auth/weak-password':
        errorMessage = "Password is too weak.";
        break;
      case 'auth/invalid-email':
        errorMessage = "Invalid email address.";
        break;
      default:
        errorMessage = err.message;
    }
    
    showToast(errorMessage, 'error');
  } finally {
    // Restore button state
    submitBtn.innerHTML = originalHTML;
    submitBtn.disabled = false;
  }
});

// Social login handlers (placeholder functionality)
googleBtn.addEventListener("click", () => {
  showToast("Google sign-in coming soon!", 'info');
});

appleBtn.addEventListener("click", () => {
  showToast("Apple sign-in coming soon!", 'info');
});

// Input animations and interactions
[emailInput, passwordInput, firstNameInput, lastNameInput].forEach(input => {
  input.addEventListener('focus', function() {
    this.parentElement.classList.add('focused');
  });
  
  input.addEventListener('blur', function() {
    if (!this.value) {
      this.parentElement.classList.remove('focused');
    }
  });
});

// Check if user is already logged in
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    // User is already logged in, redirect to dashboard
    window.location.href = "../dashboard/dashboard.html";
  }
});

// Add some visual enhancements
document.addEventListener('DOMContentLoaded', function() {
  // Stagger input animations
  const inputs = document.querySelectorAll('.auth-input');
  inputs.forEach((input, index) => {
    input.style.animationDelay = `${index * 0.1}s`;
  });
  
  // Add floating label effect
  inputs.forEach(input => {
    if (input.value) {
      input.classList.add('has-value');
    }
    
    input.addEventListener('input', function() {
      if (this.value) {
        this.classList.add('has-value');
      } else {
        this.classList.remove('has-value');
      }
    });
  });
});