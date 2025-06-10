export let firebaseReady = false

export function waitForFirebase() {
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

      setTimeout(() => {
        if (!firebaseReady) {
          console.log("⚠️ Firebase timeout, using demo mode")
          resolve(false)
        }
      }, 5000)
    }
  })
}

export function showLoading(show) {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) overlay.style.display = show ? "flex" : "none"
}

export function showAlert(message, type = "info") {
  document.querySelectorAll(".alert").forEach((a) => a.remove())

  const classMap = {
    error: "alert-danger",
    success: "alert-success",
    warning: "alert-warning",
    info: "alert-info",
  }

  const alertHTML = `
    <div class="alert ${classMap[type] || "alert-info"} alert-dismissible fade show position-fixed" 
         style="top: 20px; right: 20px; z-index: 10000; min-width: 300px; max-width: 400px;" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`

  document.body.insertAdjacentHTML("beforeend", alertHTML)
  setTimeout(() => {
    const alert = document.querySelector(".alert")
    if (alert) alert.remove()
  }, 5000)
}
