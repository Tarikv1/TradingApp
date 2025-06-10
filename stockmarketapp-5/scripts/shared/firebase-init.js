console.log("🔌 Initializing Firebase...")

// Firebase configuration and initialization (assumed to be already run before this script)
window.firebaseInitialized = true
window.dispatchEvent(new Event("firebaseReady"))
