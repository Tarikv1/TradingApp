import { firebaseReady, showAlert } from "./firebase-utils.js"

export async function createUserDocument(user) {
  try {
    if (!firebaseReady || !window.firebaseDb || !window.firebaseModules) {
      console.log("❌ Firebase not ready, cannot create user document")
      return false
    }

    const { doc, setDoc, getDoc } = window.firebaseModules
    const userRef = doc(window.firebaseDb, "users", user.uid)

    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) {
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
      return true
    } else {
      await setDoc(
        userRef,
        {
          lastLoginAt: new Date().toISOString(),
          email: user.email,
          displayName: user.displayName || userSnap.data().displayName,
        },
        { merge: true }
      )
      return true
    }
  } catch (error) {
    console.error("❌ Error creating/updating user document:", error)
    return false
  }
}

export function showSuccess(user, isNewUser = false) {
  document.getElementById("authContainer").style.display = "none"
  document.getElementById("successContainer").style.display = "flex"

  document.getElementById("successMessage").textContent = isNewUser
    ? "Your account has been created successfully!"
    : "Welcome back! You have signed in successfully."

  document.getElementById("userInfo").innerHTML = `
    <div class="user-details p-3 bg-dark rounded">
      <p class="mb-2"><strong>Name:</strong> ${user.displayName || "Not provided"}</p>
      <p class="mb-2"><strong>Email:</strong> ${user.email}</p>
      <p class="mb-0"><strong>User ID:</strong> ${user.uid}</p>
    </div>`
}
