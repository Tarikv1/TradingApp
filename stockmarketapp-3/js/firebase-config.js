// Firebase Configuration and Setup for StockWizard
// This file contains Firebase initialization and helper functions

class FirebaseManager {
  constructor() {
    this.auth = null
    this.db = null
    this.currentUser = null
    this.initialized = false
  }

  // Initialize Firebase services
  async initialize() {
    try {
      // Wait for Firebase modules to be available
      if (!window.firebaseAuth || !window.firebaseDb) {
        throw new Error("Firebase not initialized")
      }

      this.auth = window.firebaseAuth
      this.db = window.firebaseDb
      this.initialized = true

      // Set up auth state listener
      this.setupAuthStateListener()

      console.log("Firebase Manager initialized successfully")
      return true
    } catch (error) {
      console.error("Firebase initialization failed:", error)
      return false
    }
  }

  // Set up authentication state listener
  setupAuthStateListener() {
    const { onAuthStateChanged } = window.firebaseModules

    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user

      if (user) {
        console.log("User signed in:", user.email)
        this.onUserSignedIn(user)
      } else {
        console.log("User signed out")
        this.onUserSignedOut()
      }
    })
  }

  // Handle user sign in
  async onUserSignedIn(user) {
    try {
      // Create or update user document in Firestore
      await this.createUserDocument(user)

      // Update UI
      if (window.app) {
        window.app.currentUser = user
        window.app.showDashboard()
      }
    } catch (error) {
      console.error("Error handling user sign in:", error)
    }
  }

  // Handle user sign out
  onUserSignedOut() {
    if (window.app) {
      window.app.currentUser = null
      window.app.showAuth()
    }
  }

  // Create or update user document in Firestore
  async createUserDocument(user) {
    try {
      const { doc, setDoc, getDoc } = window.firebaseModules
      const userRef = doc(this.db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        // Create new user document
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
        console.log("User document created:", userData)
      } else {
        // Update last login time
        await setDoc(
          userRef,
          {
            lastLoginAt: new Date().toISOString(),
          },
          { merge: true },
        )
        console.log("User document updated")
      }
    } catch (error) {
      console.error("Error creating/updating user document:", error)
    }
  }

  // Sign up with email and password
  async signUpWithEmail(email, password, displayName) {
    try {
      const { createUserWithEmailAndPassword, updateProfile } = window.firebaseModules

      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password)

      // Update display name
      if (displayName) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        })
      }

      return { success: true, user: userCredential.user }
    } catch (error) {
      console.error("Sign up error:", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  // Sign in with email and password
  async signInWithEmail(email, password) {
    try {
      const { signInWithEmailAndPassword } = window.firebaseModules
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password)

      return { success: true, user: userCredential.user }
    } catch (error) {
      console.error("Sign in error:", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const { signInWithPopup } = window.firebaseModules
      const result = await signInWithPopup(this.auth, window.googleProvider)

      return { success: true, user: result.user }
    } catch (error) {
      console.error("Google sign in error:", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  // Sign out
  async signOut() {
    try {
      const { signOut } = window.firebaseModules
      await signOut(this.auth)
      return { success: true }
    } catch (error) {
      console.error("Sign out error:", error)
      return { success: false, error: this.getErrorMessage(error) }
    }
  }

  // Get user data from Firestore
  async getUserData(uid) {
    try {
      const { doc, getDoc } = window.firebaseModules
      const userRef = doc(this.db, "users", uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        return { success: true, data: userSnap.data() }
      } else {
        return { success: false, error: "User document not found" }
      }
    } catch (error) {
      console.error("Error getting user data:", error)
      return { success: false, error: error.message }
    }
  }

  // Update user data in Firestore
  async updateUserData(uid, data) {
    try {
      const { doc, setDoc } = window.firebaseModules
      const userRef = doc(this.db, "users", uid)

      await setDoc(
        userRef,
        {
          ...data,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      return { success: true }
    } catch (error) {
      console.error("Error updating user data:", error)
      return { success: false, error: error.message }
    }
  }

  // Add stock to watchlist
  async addToWatchlist(uid, symbol) {
    try {
      const { doc, updateDoc, arrayUnion } = window.firebaseModules
      const userRef = doc(this.db, "users", uid)

      await updateDoc(userRef, {
        watchlist: arrayUnion(symbol.toUpperCase()),
      })

      return { success: true }
    } catch (error) {
      console.error("Error adding to watchlist:", error)
      return { success: false, error: error.message }
    }
  }

  // Remove stock from watchlist
  async removeFromWatchlist(uid, symbol) {
    try {
      const { doc, updateDoc, arrayRemove } = window.firebaseModules
      const userRef = doc(this.db, "users", uid)

      await updateDoc(userRef, {
        watchlist: arrayRemove(symbol.toUpperCase()),
      })

      return { success: true }
    } catch (error) {
      console.error("Error removing from watchlist:", error)
      return { success: false, error: error.message }
    }
  }

  // Get friendly error messages
  getErrorMessage(error) {
    switch (error.code) {
      case "auth/user-not-found":
        return "No account found with this email address."
      case "auth/wrong-password":
        return "Incorrect password. Please try again."
      case "auth/email-already-in-use":
        return "An account with this email already exists."
      case "auth/weak-password":
        return "Password should be at least 6 characters long."
      case "auth/invalid-email":
        return "Please enter a valid email address."
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later."
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again."
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled. Please try again."
      default:
        return error.message || "An error occurred. Please try again."
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser
  }
}

// Create global Firebase manager instance
window.firebaseManager = new FirebaseManager()

// Initialize Firebase manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for Firebase modules to load
  setTimeout(() => {
    window.firebaseManager.initialize()
  }, 100)
})
