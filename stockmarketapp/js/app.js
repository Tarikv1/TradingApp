import { Chart } from "@/components/ui/chart"
// StockWizard App - Main JavaScript File

class StockWizardApp {
  constructor() {
    this.currentUser = null
    this.authMode = "signin"
    this.marketChart = null
    this.watchlist = []
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupFirebaseAuth()
    console.log("StockWizard App initialized")
  }

  setupEventListeners() {
    // Auth form submissions
    document.getElementById("signInForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleSignIn()
    })

    document.getElementById("signUpForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleSignUp()
    })

    // Prevent form submission on Enter key for better UX
    document.querySelectorAll(".auth-input").forEach((input) => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          const form = input.closest("form")
          if (form.style.display !== "none") {
            form.dispatchEvent(new Event("submit"))
          }
        }
      })
    })
  }

  setupFirebaseAuth() {
    if (window.firebaseAuth && window.firebaseModules) {
      const { onAuthStateChanged } = window.firebaseModules
      onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
          this.currentUser = user
          this.showDashboard()
        } else {
          this.currentUser = null
          this.showAuth()
        }
      })
    }
  }

  switchAuthMode(mode) {
    this.authMode = mode
    const signInForm = document.getElementById("signInForm")
    const signUpForm = document.getElementById("signUpForm")
    const signInToggle = document.getElementById("signInToggle")
    const signUpToggle = document.getElementById("signUpToggle")

    if (mode === "signup") {
      signInForm.style.display = "none"
      signUpForm.style.display = "block"
      signInToggle.classList.remove("active")
      signUpToggle.classList.add("active")
    } else {
      signInForm.style.display = "block"
      signUpForm.style.display = "none"
      signInToggle.classList.add("active")
      signUpToggle.classList.remove("active")
    }
  }

  async handleSignIn() {
    const email = document.getElementById("signInEmail").value
    const password = document.getElementById("signInPassword").value

    if (!email || !password) {
      this.showAlert("Please fill in all fields", "error")
      return
    }

    this.showLoading(true)

    try {
      if (window.firebaseModules) {
        const { signInWithEmailAndPassword } = window.firebaseModules
        await signInWithEmailAndPassword(window.firebaseAuth, email, password)
        this.showAlert("Sign in successful!", "success")
      } else {
        // Demo mode
        setTimeout(() => {
          this.currentUser = { email, displayName: email.split("@")[0] }
          this.showDashboard()
        }, 1000)
      }
    } catch (error) {
      console.error("Sign in error:", error)
      this.showAlert("Sign in failed. Please check your credentials.", "error")
    } finally {
      this.showLoading(false)
    }
  }

  async handleSignUp() {
    const name = document.getElementById("signUpName").value
    const email = document.getElementById("signUpEmail").value
    const password = document.getElementById("signUpPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value

    if (!name || !email || !password || !confirmPassword) {
      this.showAlert("Please fill in all fields", "error")
      return
    }

    if (password !== confirmPassword) {
      this.showAlert("Passwords do not match", "error")
      return
    }

    if (password.length < 6) {
      this.showAlert("Password must be at least 6 characters", "error")
      return
    }

    this.showLoading(true)

    try {
      if (window.firebaseModules) {
        const { createUserWithEmailAndPassword, updateProfile } = window.firebaseModules
        const userCredential = await createUserWithEmailAndPassword(window.firebaseAuth, email, password)
        await updateProfile(userCredential.user, { displayName: name })
        this.showAlert("Account created successfully!", "success")
      } else {
        // Demo mode
        setTimeout(() => {
          this.currentUser = { email, displayName: name }
          this.showDashboard()
        }, 1000)
      }
    } catch (error) {
      console.error("Sign up error:", error)
      this.showAlert("Sign up failed. Please try again.", "error")
    } finally {
      this.showLoading(false)
    }
  }

  async signInWithGoogle() {
    this.showLoading(true)

    try {
      if (window.firebaseModules && window.googleProvider) {
        const { signInWithPopup } = window.firebaseModules
        await signInWithPopup(window.firebaseAuth, window.googleProvider)
        this.showAlert("Google sign in successful!", "success")
      } else {
        // Demo mode
        setTimeout(() => {
          this.currentUser = { email: "demo@google.com", displayName: "Google User" }
          this.showDashboard()
        }, 1000)
      }
    } catch (error) {
      console.error("Google sign in error:", error)
      this.showAlert("Google sign in failed. Please try again.", "error")
    } finally {
      this.showLoading(false)
    }
  }

  async signInWithApple() {
    this.showAlert("Apple Sign In coming soon!", "info")
  }

  async logout() {
    try {
      if (window.firebaseModules) {
        const { signOut } = window.firebaseModules
        await signOut(window.firebaseAuth)
      } else {
        this.currentUser = null
        this.showAuth()
      }
      this.showAlert("Logged out successfully", "success")
    } catch (error) {
      console.error("Logout error:", error)
      this.showAlert("Logout failed", "error")
    }
  }

  showAuth() {
    document.getElementById("authContainer").style.display = "flex"
    document.getElementById("dashboard").style.display = "none"
  }

  showDashboard() {
    document.getElementById("authContainer").style.display = "none"
    document.getElementById("dashboard").style.display = "block"

    // Update user welcome message
    const userWelcome = document.getElementById("userWelcome")
    if (userWelcome && this.currentUser) {
      userWelcome.textContent = `Welcome, ${this.currentUser.displayName || this.currentUser.email}!`
    }

    // Initialize dashboard components
    this.initializeDashboard()
  }

  initializeDashboard() {
    this.initializeChart()
    this.loadPortfolioData()
    this.loadWatchlist()
  }

  initializeChart() {
    const ctx = document.getElementById("marketChart")
    if (ctx && window.Chart) {
      // Sample market data
      const data = {
        labels: [
          "9:30",
          "10:00",
          "10:30",
          "11:00",
          "11:30",
          "12:00",
          "12:30",
          "1:00",
          "1:30",
          "2:00",
          "2:30",
          "3:00",
          "3:30",
          "4:00",
        ],
        datasets: [
          {
            label: "S&P 500",
            data: [4150, 4155, 4148, 4162, 4158, 4165, 4170, 4168, 4175, 4172, 4178, 4180, 4185, 4182],
            borderColor: "#27ae60",
            backgroundColor: "rgba(39, 174, 96, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          },
        ],
      }

      const config = {
        type: "line",
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#ffffff",
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: "#bdc3c7",
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
              },
            },
            y: {
              ticks: {
                color: "#bdc3c7",
              },
              grid: {
                color: "rgba(255, 255, 255, 0.1)",
              },
            },
          },
        },
      }

      this.marketChart = new Chart(ctx, config)
    }
  }

  loadPortfolioData() {
    // Sample portfolio data
    document.getElementById("portfolioValue").textContent = "$12,450.00"
    document.getElementById("todaysGain").textContent = "+$245.50"
    document.getElementById("activeStocks").textContent = "8"
  }

  loadWatchlist() {
    // This will be populated with real data from Marketstack API
    const container = document.getElementById("watchlistContainer")
    if (container) {
      // For now, show empty state
      container.innerHTML = `
                <div class="empty-state text-center py-4">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No stocks in your watchlist yet.</p>
                    <button class="btn btn-primary" onclick="app.loadSampleData()">Load Sample Data</button>
                </div>
            `
    }
  }

  loadSampleData() {
    // This will be replaced with real Marketstack API data
    const sampleStocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: 175.5, change: +2.3, changePercent: +1.33 },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: 2750.8, change: -15.2, changePercent: -0.55 },
      { symbol: "MSFT", name: "Microsoft Corp.", price: 335.2, change: +5.8, changePercent: +1.76 },
      { symbol: "TSLA", name: "Tesla Inc.", price: 245.6, change: +12.4, changePercent: +5.32 },
    ]

    this.displayWatchlist(sampleStocks)
  }

  displayWatchlist(stocks) {
    const container = document.getElementById("watchlistContainer")
    if (!container) return

    const stocksHTML = stocks
      .map(
        (stock) => `
            <div class="stock-item d-flex justify-content-between align-items-center py-3 border-bottom border-secondary">
                <div class="stock-info">
                    <h6 class="mb-1">${stock.symbol}</h6>
                    <small class="text-muted">${stock.name}</small>
                </div>
                <div class="stock-price text-end">
                    <div class="price">$${stock.price.toFixed(2)}</div>
                    <small class="${stock.change >= 0 ? "text-success" : "text-danger"}">
                        ${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)} (${stock.changePercent.toFixed(2)}%)
                    </small>
                </div>
            </div>
        `,
      )
      .join("")

    container.innerHTML = stocksHTML
  }

  addStock() {
    this.showAlert("Add stock functionality coming soon!", "info")
  }

  showLoading(show) {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.style.display = show ? "flex" : "none"
    }
  }

  showAlert(message, type = "info") {
    // Simple alert for now - can be enhanced with toast notifications
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
                 style="top: 20px; right: 20px; z-index: 10000; min-width: 300px;" role="alert">
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
}

// Global functions for HTML onclick handlers
function switchAuthMode(mode) {
  if (window.app) {
    window.app.switchAuthMode(mode)
  }
}

function signInWithGoogle() {
  if (window.app) {
    window.app.signInWithGoogle()
  }
}

function signInWithApple() {
  if (window.app) {
    window.app.signInWithApple()
  }
}

function logout() {
  if (window.app) {
    window.app.logout()
  }
}

function addStock() {
  if (window.app) {
    window.app.addStock()
  }
}

function loadSampleData() {
  if (window.app) {
    window.app.loadSampleData()
  }
}

// Initialize app when DOM is loaded
function initializeApp() {
  window.app = new StockWizardApp()
}

// Make initializeApp available globally
window.initializeApp = initializeApp
