import { Chart } from "@/components/ui/chart"
// StockWizard App - Main JavaScript File with Firebase Integration

class StockWizardApp {
  constructor() {
    this.currentUser = null
    this.authMode = "signin"
    this.marketChart = null
    this.watchlist = []
    this.firebaseManager = null
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.waitForFirebase()
    console.log("StockWizard App initialized")
  }

  // Wait for Firebase to be ready
  async waitForFirebase() {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    const checkFirebase = () => {
      if (window.firebaseManager && window.firebaseManager.initialized) {
        this.firebaseManager = window.firebaseManager
        console.log("Firebase Manager connected")
        return true
      }

      attempts++
      if (attempts < maxAttempts) {
        setTimeout(checkFirebase, 100)
      } else {
        console.warn("Firebase Manager not available, using demo mode")
      }
      return false
    }

    checkFirebase()
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
      if (this.firebaseManager) {
        const result = await this.firebaseManager.signInWithEmail(email, password)

        if (result.success) {
          this.showAlert("Sign in successful!", "success")
          // Dashboard will be shown automatically by auth state listener
        } else {
          this.showAlert(result.error, "error")
        }
      } else {
        // Demo mode fallback
        setTimeout(() => {
          this.currentUser = { email, displayName: email.split("@")[0] }
          this.showDashboard()
          this.showAlert("Demo mode: Sign in successful!", "success")
        }, 1000)
      }
    } catch (error) {
      console.error("Sign in error:", error)
      this.showAlert("Sign in failed. Please try again.", "error")
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
      if (this.firebaseManager) {
        const result = await this.firebaseManager.signUpWithEmail(email, password, name)

        if (result.success) {
          this.showAlert("Account created successfully!", "success")
          // Dashboard will be shown automatically by auth state listener
        } else {
          this.showAlert(result.error, "error")
        }
      } else {
        // Demo mode fallback
        setTimeout(() => {
          this.currentUser = { email, displayName: name }
          this.showDashboard()
          this.showAlert("Demo mode: Account created successfully!", "success")
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
      if (this.firebaseManager) {
        const result = await this.firebaseManager.signInWithGoogle()

        if (result.success) {
          this.showAlert("Google sign in successful!", "success")
          // Dashboard will be shown automatically by auth state listener
        } else {
          this.showAlert(result.error, "error")
        }
      } else {
        // Demo mode fallback
        setTimeout(() => {
          this.currentUser = { email: "demo@google.com", displayName: "Google User" }
          this.showDashboard()
          this.showAlert("Demo mode: Google sign in successful!", "success")
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
      if (this.firebaseManager) {
        const result = await this.firebaseManager.signOut()

        if (result.success) {
          this.showAlert("Logged out successfully", "success")
          // Auth view will be shown automatically by auth state listener
        } else {
          this.showAlert("Logout failed", "error")
        }
      } else {
        // Demo mode fallback
        this.currentUser = null
        this.showAuth()
        this.showAlert("Demo mode: Logged out successfully", "success")
      }
    } catch (error) {
      console.error("Logout error:", error)
      this.showAlert("Logout failed", "error")
    }
  }

  showAuth() {
    document.getElementById("authContainer").style.display = "flex"
    document.getElementById("dashboard").style.display = "none"

    // Clear form fields
    document.getElementById("signInForm").reset()
    document.getElementById("signUpForm").reset()
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

  async initializeDashboard() {
    this.initializeChart()
    await this.loadPortfolioData()
    await this.loadWatchlist()
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

  async loadPortfolioData() {
    try {
      if (this.firebaseManager && this.currentUser) {
        const result = await this.firebaseManager.getUserData(this.currentUser.uid)

        if (result.success && result.data.portfolio) {
          const portfolio = result.data.portfolio
          document.getElementById("portfolioValue").textContent = `$${portfolio.totalValue.toLocaleString()}`
          document.getElementById("todaysGain").textContent = `+$${portfolio.todaysGain.toLocaleString()}`
          document.getElementById("activeStocks").textContent = portfolio.activeStocks.toString()
          return
        }
      }

      // Fallback to sample data
      document.getElementById("portfolioValue").textContent = "$12,450.00"
      document.getElementById("todaysGain").textContent = "+$245.50"
      document.getElementById("activeStocks").textContent = "8"
    } catch (error) {
      console.error("Error loading portfolio data:", error)
    }
  }

  async loadWatchlist() {
    try {
      if (this.firebaseManager && this.currentUser) {
        const result = await this.firebaseManager.getUserData(this.currentUser.uid)

        if (result.success && result.data.watchlist && result.data.watchlist.length > 0) {
          // Load real watchlist data
          this.watchlist = result.data.watchlist
          await this.displayWatchlistFromSymbols(this.watchlist)
          return
        }
      }

      // Show empty state
      this.showEmptyWatchlist()
    } catch (error) {
      console.error("Error loading watchlist:", error)
      this.showEmptyWatchlist()
    }
  }

  showEmptyWatchlist() {
    const container = document.getElementById("watchlistContainer")
    if (container) {
      container.innerHTML = `
        <div class="empty-state text-center py-4">
          <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
          <p class="text-muted">No stocks in your watchlist yet.</p>
          <button class="btn btn-primary" onclick="app.loadSampleData()">Load Sample Data</button>
        </div>
      `
    }
  }

  async displayWatchlistFromSymbols(symbols) {
    // This would normally fetch real data from Marketstack API
    // For now, using sample data
    const sampleStocks = symbols.map((symbol) => ({
      symbol: symbol,
      name: this.getCompanyName(symbol),
      price: (Math.random() * 500 + 50).toFixed(2),
      change: (Math.random() * 20 - 10).toFixed(2),
      changePercent: (Math.random() * 10 - 5).toFixed(2),
    }))

    this.displayWatchlist(sampleStocks)
  }

  loadSampleData() {
    // Sample stocks data
    const sampleStocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: 175.5, change: +2.3, changePercent: +1.33 },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: 2750.8, change: -15.2, changePercent: -0.55 },
      { symbol: "MSFT", name: "Microsoft Corp.", price: 335.2, change: +5.8, changePercent: +1.76 },
      { symbol: "TSLA", name: "Tesla Inc.", price: 245.6, change: +12.4, changePercent: +5.32 },
    ]

    this.displayWatchlist(sampleStocks)

    // Save to Firebase if available
    if (this.firebaseManager && this.currentUser) {
      const symbols = sampleStocks.map((stock) => stock.symbol)
      this.firebaseManager.updateUserData(this.currentUser.uid, {
        watchlist: symbols,
      })
    }
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
              <div class="price">$${Number.parseFloat(stock.price).toFixed(2)}</div>
              <small class="${Number.parseFloat(stock.change) >= 0 ? "text-success" : "text-danger"}">
                ${Number.parseFloat(stock.change) >= 0 ? "+" : ""}${Number.parseFloat(stock.change).toFixed(2)} (${Number.parseFloat(stock.changePercent).toFixed(2)}%)
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

  getCompanyName(symbol) {
    const companyNames = {
      AAPL: "Apple Inc.",
      GOOGL: "Alphabet Inc.",
      MSFT: "Microsoft Corp.",
      TSLA: "Tesla Inc.",
      AMZN: "Amazon.com Inc.",
      META: "Meta Platforms Inc.",
      NVDA: "NVIDIA Corp.",
      NFLX: "Netflix Inc.",
    }

    return companyNames[symbol] || `${symbol} Corp.`
  }

  showLoading(show) {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.style.display = show ? "flex" : "none"
    }
  }

  showAlert(message, type = "info") {
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
