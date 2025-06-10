import { waitForFirebase, showLoading, showAlert } from "../shared/firebase-utils.js"
import { createUserDocument, showSuccess } from "../shared/auth-helpers.js"

document.addEventListener("DOMContentLoaded", async () => {
  showLoading(true)

  const firebaseReady = await waitForFirebase()
  if (!firebaseReady) {
    showAlert("Firebase failed to load. Running in demo mode.", "warning")
    showLoading(false)
    return
  }

  const auth = window.firebaseAuth
  const { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } =
    window.firebaseModules

  // 🟢 Common Handlers
  const handleAuthSuccess = async (userCredential, isNewUser = false) => {
    const user = userCredential.user
    const created = await createUserDocument(user)
    if (created) showSuccess(user, isNewUser)
    else showAlert("Failed to save user data.", "error")
  }

  // 🔵 Google Auth
  document.getElementById("googleSignInBtn")?.addEventListener("click", async () => {
    showLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      await handleAuthSuccess(result, result._tokenResponse?.isNewUser)
    } catch (err) {
      console.error("❌ Google Sign-In Error:", err)
      showAlert("Google sign-in failed.", "error")
    } finally {
      showLoading(false)
    }
  })

  // 🟡 Email Sign-Up
  document.getElementById("signupForm")?.addEventListener("submit", async (e) => {
    e.preventDefault()
    showLoading(true)

    const email = document.getElementById("signupEmail")?.value
    const password = document.getElementById("signupPassword")?.value

    if (!email || !password) {
      showAlert("Please provide email and password.", "warning")
      showLoading(false)
      return
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await handleAuthSuccess(userCredential, true)
    } catch (err) {
      console.error("❌ Sign-Up Error:", err)
      showAlert("Sign-up failed: " + err.message, "error")
    } finally {
      showLoading(false)
    }
  })

  // 🔴 Email Login
  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault()
    showLoading(true)

    const email = document.getElementById("loginEmail")?.value
    const password = document.getElementById("loginPassword")?.value

    if (!email || !password) {
      showAlert("Please provide email and password.", "warning")
      showLoading(false)
      return
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      await handleAuthSuccess(userCredential, false)
    } catch (err) {
      console.error("❌ Login Error:", err)
      showAlert("Login failed: " + err.message, "error")
    } finally {
      showLoading(false)
    }
  })

  showLoading(false)
})
