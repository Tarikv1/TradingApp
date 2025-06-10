// Main application script
console.log("📱 Loading main app script...")

// Global variables
const currentUser = null
let authMode = "signin"
let firebaseReady = false

// Wait for Firebase to be ready
function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.firebaseInitialized) {
      console.log("✅ Firebase already ready")
      firebaseReady = true
      resolve(true)
    } else {
      console.log("⏳ Waiting for Firebase...")
      window.addEventListener("firebaseReady", () => {
        console.log("✅ Firebase ready event received")
        firebaseReady = true
        resolve(true)
      })

      // Timeout fallback
      setTimeout(() => {
        if (!firebaseReady) {
          console.log("⚠️ Firebase timeout, using demo mode")
          resolve(false)
        }
      }, 5000)
    }
  })
}

// Utility functions
function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) {
    overlay.style.display = show ? "flex" : "none"
  }
}

function showAlert(message, type = "info") {
  // Remove existing alerts
  const existingAlerts = document.querySelectorAll(".alert")
  existingAlerts.forEach((alert) => alert.remove())

  const alertClass =
    type === "error"
      ? "alert-danger"
      : type === "success"
        ? "alert-success"
        : type === "warning"
          ? "alert-warning"
          : "alert-info"

  const alertHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 10000; min-width: 300px; max-width: 400px;" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `

  document.body.insertAdjacentHTML("beforeend", alertHTML)

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.querySelector(".alert")
    if (alert) {
      alert.remove()
    }
  }, 5000)
}

// Auth mode switching
function switchAuthMode(mode) {
  console.log("🔄 Switching to mode:", mode)

  authMode = mode
  const signInForm = document.getElementById("signInForm")
  const signUpForm = document.getElementById("signUpForm")
  const signInToggle = document.getElementById("signInToggle")
  const signUpToggle = document.getElementById("signUpToggle")

  if (mode === "signup") {
    signInForm.style.display = "none"
    signUpForm.style.display = "block"
    signInToggle.classList.remove("active")
    signUpToggle.classList.add("active")
    console.log("✅ Switched to sign up mode")
  } else {
    signInForm.style.display = "block"
    signUpForm.style.display = "none"
    signInToggle.classList.add("active")
    signUpToggle.classList.remove("active")
    console.log("✅ Switched to sign in mode")
  }
}

// Database functions
async function createUserDocument(user) {
  try {
    console.log("💾 Creating user document for:", user.email)

    if (!firebaseReady || !window.firebaseDb || !window.firebaseModules) {
      console.log("❌ Firebase not ready, cannot create user document")
      return false
    }

    const { doc, setDoc, getDoc } = window.firebaseModules
    const userRef = doc(window.firebaseDb, "users", user.uid)

    console.log("🔍 Checking if user document exists...")
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      console.log("📝 Creating new user document...")

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        photoURL: user.photoURL || null,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        portfolio: {
          totalValue: 0,
          todaysGain: 0,
          activeStocks: 0,
        },
        watchlist: [],
        preferences: {
          theme: "dark",
          notifications: true,
          currency: "USD",
        },
      }

      await setDoc(userRef, userData)
      console.log("✅ User document created successfully:", userData)
      return true
    } else {
      console.log("🔄 Updating existing user document...")

      await setDoc(
        userRef,
        {
          lastLoginAt: new Date().toISOString(),
          email: user.email,
          displayName: user.displayName || userSnap.data().displayName,
        },
        { merge: true },
      )

      console.log("✅ User document updated successfully")
      return true
    }
  } catch (error) {
    console.error("❌ Error creating/updating user document:", error)
    return false
  }
}

// Show success page
function showSuccess(user, isNewUser = false) {
  console.log("🎉 Showing success page for:", user.email)

  document.getElementById("authContainer").style.display = "none"
  document.getElementById("successContainer").style.display = "flex"

  // Update success message
  const successMessage = document.getElementById("successMessage")
  const userInfo = document.getElementById("userInfo")

  if (isNewUser) {
    successMessage.textContent = "Your account has been created successfully!"
  } else {
    successMessage.textContent = "Welcome back! You have signed in successfully."
  }

  // Show user info
  userInfo.innerHTML = `
        <div class="user-details p-3 bg-dark rounded">
            <p class="mb-2"><strong>Name:</strong> ${user.displayName || "Not provided"}</p>
            <p class="mb-2"><strong>Email:</strong> ${user.email}</p>
            <p class="mb-0"><strong>User ID:</strong> ${user.uid}</p>
        </div>
    `
}

// Sign up function
async function handleSignUp() {
  console.log("📝 Handling sign up...")

  const name = document.getElementById("signUpName").value.trim()
  const email = document.getElementById("signUpEmail").value.trim()
  const password = document.getElementById("signUpPassword").value
  const confirmPassword = document.getElementById("confirmPassword").value

  console.log("📋 Form data:", { name, email, passwordLength: password.length })

  // Validation
  if (!name || !email || !password || !confirmPassword) {
    showAlert("Please fill in all fields", "error")
    return
  }

  if (password !== confirmPassword) {
    showAlert("Passwords do not match", "error")
    return
  }

  if (password.length < 6) {
    showAlert("Password must be at least 6 characters", "error")
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    showAlert("Please enter a valid email address", "error")
    return
  }

  showLoading(true)

  try {
    // Wait for Firebase to be ready
    await waitForFirebase()

    if (firebaseReady && window.firebaseModules && window.firebaseAuth) {
      console.log("🔥 Using Firebase for sign up")

      const { createUserWithEmailAndPassword, updateProfile } = window.firebaseModules

      console.log("👤 Creating Firebase user...")
      const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password)

      console.log("✅ Firebase user created:", userCredential.user.uid)

      console.log("📝 Updating user profile...")
      await updateProfile(userCredential.user, {
        displayName: name,
      })

      console.log("✅ Profile updated")

      // Create user document in Firestore
      const userWithName = {
        ...userCredential.user,
        displayName: name,
      }

      const docCreated = await createUserDocument(userWithName)

      if (docCreated) {
        console.log("🎉 Sign up completed successfully!")
        showSuccess(userWithName, true)
      } else {
        showAlert("Account created but data sync failed", "warning")
        showSuccess(userWithName, true)
      }
    } else {
      console.log("⚠️ Firebase not available, using demo mode")
      showAlert("Demo mode: Firebase not available", "warning")
    }
  } catch (error) {
    console.error("❌ Sign up error:", error)
    let errorMessage = "Sign up failed. Please try again."

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "An account with this email already exists."
        break
      case "auth/weak-password":
        errorMessage = "Password should be at least 6 characters long."
        break
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."
        break
      case "auth/operation-not-allowed":
        errorMessage = "Email/password accounts are not enabled."
        break
      default:
        errorMessage = error.message || errorMessage
    }

    showAlert(errorMessage, "error")
  } finally {
    showLoading(false)
  }
}

// Sign in function
async function handleSignIn() {
  console.log("🔑 Handling sign in...")

  const email = document.getElementById("signInEmail").value.trim()
  const password = document.getElementById("signInPassword").value

  if (!email || !password) {
    showAlert("Please fill in all fields", "error")
    return
  }

  showLoading(true)

  try {
    await waitForFirebase()

    if (firebaseReady && window.firebaseModules && window.firebaseAuth) {
      console.log("🔥 Using Firebase for sign in")

      const { signInWithEmailAndPassword } = window.firebaseModules
      const userCredential = await signInWithEmailAndPassword(window.firebaseAuth, email, password)

      console.log("✅ Firebase sign in successful:", userCredential.user.uid)

      // Update user document
      await createUserDocument(userCredential.user)

      showSuccess(userCredential.user, false)
    } else {
      console.log("⚠️ Firebase not available, using demo mode")
      showAlert("Demo mode: Firebase not available", "warning")
    }
  } catch (error) {
    console.error("❌ Sign in error:", error)
    let errorMessage = "Sign in failed. Please check your credentials."

    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email address."
        break
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again."
        break
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address."
        break
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later."
        break
      default:
        errorMessage = error.message || errorMessage
    }

    showAlert(errorMessage, "error")
  } finally {
    showLoading(false)
  }
}

// Google sign in
async function handleGoogleSignIn() {
  console.log("🔑 Handling Google sign in...")
  showLoading(true)

  try {
    await waitForFirebase()

    if (firebaseReady && window.firebaseModules && window.googleProvider && window.firebaseAuth) {
      console.log("🔥 Using Firebase for Google sign in")

      const { signInWithPopup } = window.firebaseModules

      console.log("🚀 Opening Google popup...")
      const result = await signInWithPopup(window.firebaseAuth, window.googleProvider)

      console.log("✅ Google sign in successful:", result.user)

      // Create/update user document
      await createUserDocument(result.user)

      showSuccess(result.user, false)
    } else {
      console.log("⚠️ Firebase not available, using demo mode")
      showAlert("Demo mode: Firebase not available", "warning")
    }
  } catch (error) {
    console.error("❌ Google sign in error:", error)
    let errorMessage = "Google sign in failed. Please try again."

    switch (error.code) {
      case "auth/popup-closed-by-user":
        errorMessage = "Sign-in popup was closed. Please try again."
        break
      case "auth/popup-blocked":
        errorMessage = "Popup was blocked by browser. Please allow popups and try again."
        break
      case "auth/cancelled-popup-request":
        errorMessage = "Sign-in was cancelled. Please try again."
        break
      case "auth/network-request-failed":
        errorMessage = "Network error. Please check your connection and try again."
        break
      case "auth/unauthorized-domain":
        errorMessage = "This domain is not authorized for Google sign-in."
        break
      default:
        errorMessage = error.message || errorMessage
    }

    showAlert(errorMessage, "error")
  } finally {
    showLoading(false)
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("📱 DOM loaded, setting up event listeners...")

  // Wait for Firebase to be ready
  await waitForFirebase()

  // Toggle buttons
  document.getElementById("signUpToggle").addEventListener("click", () => switchAuthMode("signup"))
  document.getElementById("signInToggle").addEventListener("click", () => switchAuthMode("signin"))
  document.getElementById("registerLink").addEventListener("click", (e) => {
    e.preventDefault()
    switchAuthMode("signup")
  })

  // Form submissions
  document.getElementById("signInForm").addEventListener("submit", (e) => {
    e.preventDefault()
    handleSignIn()
  })

  document.getElementById("signUpForm").addEventListener("submit", (e) => {
    e.preventDefault()
    handleSignUp()
  })

  // Social login buttons
  document.getElementById("googleSignInBtn").addEventListener("click", handleGoogleSignIn)
  document.getElementById("appleSignInBtn").addEventListener("click", () => {
    showAlert("Apple Sign In coming soon!", "info")
  })

  console.log("✅ Event listeners set up successfully!")
})
