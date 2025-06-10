// Enhanced Dashboard JavaScript with complete functionality
const MARKETSTACK_API_KEY = "aff861cd9cdcdcf341ad67f992b608e3";

let currentUser = null;
let userWatchlist = [];
let userPortfolio = [];

// Initialize Firestore
const db = firebase.firestore();

// Toast function
function showToast(message, type = 'info') {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Format currency
function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Format number with commas
function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(num);
}

// Calculate percentage change
function calculatePercentChange(current, previous) {
  const change = current - previous;
  const percent = (change / previous) * 100;
  return {
    value: percent,
    formatted: `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`,
    trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral'
  };
}

// Fetch stock data from API
async function fetchStockData(symbols = []) {
  console.log("📊 Fetching stock data for:", symbols);
  
  if (symbols.length === 0) {
    displayEmptyWatchlist();
    return;
  }

  const query = symbols.join(",");
  const url = `http://api.marketstack.com/v1/eod/latest?access_key=${MARKETSTACK_API_KEY}&symbols=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      updateWatchlistCards(data.data);
    } else {
      console.error("❌ No stock data received:", data);
      displayEmptyWatchlist();
    }
  } catch (error) {
    console.error("❌ Error fetching stock data:", error);
    displayEmptyWatchlist();
    showToast("Failed to load stock data", 'error');
  }
}

// Display empty watchlist message
function displayEmptyWatchlist() {
  const container = document.getElementById("watchlistCards");
  container.innerHTML = `
    <div class="empty-message">
      <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-muted);"></i>
      <p>Your watchlist is empty</p>
      <p style="font-size: 0.9rem; margin-top: 0.5rem;">Start by searching and adding stocks to track</p>
    </div>
  `;
}

// Update watchlist cards
function updateWatchlistCards(stocks) {
  const container = document.getElementById("watchlistCards");
  container.innerHTML = "";

  stocks.slice(0, 6).forEach(stock => { // Show max 6 cards on dashboard
    const change = stock.close - stock.open;
    const changePercent = calculatePercentChange(stock.close, stock.open);
    
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${stock.name || stock.symbol}</h3>
      <ul>
        <li>
          <span>Symbol</span>
          <span>${stock.symbol}</span>
        </li>
        <li>
          <span>Price</span>
          <span>${formatCurrency(stock.close)}</span>
        </li>
        <li>
          <span>Change</span>
          <span class="${changePercent.trend}">${changePercent.formatted}</span>
        </li>
        <li>
          <span>Volume</span>
          <span class="neutral">${formatNumber(stock.volume)}</span>
        </li>
      </ul>
      <button class="remove-btn" data-symbol="${stock.symbol}" title="Remove from watchlist">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add click event to view stock details
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-btn')) {
        window.location.href = `../indv-stocks-page/indv-stocks-page.html?symbol=${stock.symbol}`;
      }
    });
    
    container.appendChild(card);
  });

  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromWatchlist(btn.dataset.symbol);
    });
  });
}

// Remove stock from watchlist
async function removeFromWatchlist(symbol) {
  if (!currentUser) return;

  try {
    const userRef = db.collection("users").doc(currentUser.uid);
    userWatchlist = userWatchlist.filter(s => s !== symbol.toUpperCase());
    
    await userRef.update({ watchlist: userWatchlist });
    showToast(`${symbol} removed from watchlist`, 'success');
    
    // Refresh watchlist display
    fetchStockData(userWatchlist);
    updateWatchlistCount();
  } catch (error) {
    console.error("❌ Error removing from watchlist:", error);
    showToast("Failed to remove from watchlist", 'error');
  }
}

// Update watchlist count in header
function updateWatchlistCount() {
  const countElement = document.getElementById("watchlist-count");
  if (countElement) {
    countElement.textContent = userWatchlist.length;
  }
}

// Update portfolio value in header
function updatePortfolioValue() {
  const valueElement = document.getElementById("portfolio-value");
  if (valueElement) {
    // Calculate total portfolio value
    const totalValue = userPortfolio.reduce((sum, asset) => sum + (asset.value || 0), 0);
    valueElement.textContent = formatCurrency(totalValue, 'EUR');
  }
}

// Load user data from Firestore
async function loadUserData() {
  if (!currentUser) return;

  try {
    const userRef = db.collection("users").doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      
      // Load watchlist
      userWatchlist = Array.isArray(data.watchlist) 
        ? data.watchlist.map(s => s.toUpperCase()) 
        : [];
      
      // Load portfolio
      userPortfolio = Array.isArray(data.portfolio) ? data.portfolio : [];
      
      // Update avatar
      const avatar = document.getElementById("user-avatar");
      if (data.avatarBase64) {
        avatar.src = data.avatarBase64;
      } else {
        avatar.src = "https://i.pravatar.cc/150?u=default";
      }
      
      // Update UI
      updateWatchlistCount();
      updatePortfolioValue();
      fetchStockData(userWatchlist);
      
      console.log("📦 User data loaded:", { watchlist: userWatchlist.length, portfolio: userPortfolio.length });
    }
  } catch (error) {
    console.error("❌ Error loading user data:", error);
    showToast("Failed to load user data", 'error');
  }
}

// Search functionality
let searchTimeout;
const searchInput = document.getElementById("searchInput");
const searchDropdown = document.getElementById("searchDropdown");

function setupSearch() {
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();

    if (!query) {
      searchDropdown.innerHTML = "";
      searchDropdown.classList.remove("show");
      return;
    }

    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`http://api.marketstack.com/v1/tickers?access_key=${MARKETSTACK_API_KEY}&search=${query}&limit=8`);
        const data = await response.json();
        
        const results = data.data || [];
        searchDropdown.innerHTML = "";

        if (results.length === 0) {
          const li = document.createElement("li");
          li.textContent = "No results found";
          li.style.color = "var(--text-muted)";
          searchDropdown.appendChild(li);
        } else {
          results.forEach(stock => {
            const li = document.createElement("li");
            li.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><strong>${stock.symbol}</strong> - ${stock.name}</span>
                <i class="fas fa-plus" style="color: var(--accent-green);"></i>
              </div>
            `;
            
            li.addEventListener("click", () => {
              addToWatchlist(stock.symbol);
              searchInput.value = "";
              searchDropdown.classList.remove("show");
            });
            
            searchDropdown.appendChild(li);
          });
        }
        
        searchDropdown.classList.add("show");
      } catch (error) {
        console.error("Search error:", error);
        searchDropdown.innerHTML = "<li style='color: var(--text-muted);'>Search failed</li>";
        searchDropdown.classList.add("show");
      }
    }, 300);
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-bar")) {
      searchDropdown.classList.remove("show");
    }
  });
}

// Add stock to watchlist
async function addToWatchlist(symbol) {
  if (!currentUser) {
    showToast("Please sign in to add stocks to watchlist", 'error');
    return;
  }

  const upperSymbol = symbol.toUpperCase();
  
  if (userWatchlist.includes(upperSymbol)) {
    showToast(`${symbol} is already in your watchlist`, 'info');
    return;
  }

  try {
    userWatchlist.push(upperSymbol);
    const userRef = db.collection("users").doc(currentUser.uid);
    await userRef.update({ watchlist: userWatchlist });
    
    showToast(`${symbol} added to watchlist`, 'success');
    updateWatchlistCount();
    fetchStockData(userWatchlist);
  } catch (error) {
    console.error("❌ Error adding to watchlist:", error);
    showToast("Failed to add to watchlist", 'error');
    userWatchlist.pop(); // Remove from local array if save failed
  }
}

// Setup quick action buttons
function setupQuickActions() {
  document.getElementById("add-stock-btn").addEventListener("click", () => {
    searchInput.focus();
    showToast("Search for stocks to add to your watchlist", 'info');
  });

  document.getElementById("view-portfolio-btn").addEventListener("click", () => {
    window.location.href = "../assets/assets.html";
  });

  document.getElementById("market-news-btn").addEventListener("click", () => {
    showToast("Market news feature coming soon!", 'info');
  });

  document.getElementById("analytics-btn").addEventListener("click", () => {
    showToast("Analytics feature coming soon!", 'info');
  });
}

// Setup navigation
function setupNavigation() {
  const avatar = document.getElementById("user-avatar");
  const signinBtn = document.getElementById("signin-btn");

  avatar.addEventListener("click", () => {
    window.location.href = "../profile/profile.html";
  });

  signinBtn.addEventListener("click", () => {
    window.location.href = "../auth/auth.html";
  });
}

// Initialize market overview with sample data
function initializeMarketOverview() {
  // This would typically fetch real market data
  // For now, we'll use the static data from the HTML
}

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
  // Setup all functionality
  setupSearch();
  setupQuickActions();
  setupNavigation();
  initializeMarketOverview();

  // Firebase auth state change handler
  firebase.auth().onAuthStateChanged(async (user) => {
    const avatar = document.getElementById("user-avatar");
    const signinBtn = document.getElementById("signin-btn");
    const welcomeTitle = document.getElementById("welcome-title");

    if (user) {
      currentUser = user;
      
      // Show user elements
      avatar.style.display = "block";
      signinBtn.style.display = "none";
      
      // Update welcome message
      const firstName = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
      welcomeTitle.textContent = `Welcome back, ${firstName}`;
      
      // Load user data
      await loadUserData();
    } else {
      // No user signed in
      currentUser = null;
      userWatchlist = [];
      userPortfolio = [];
      
      // Show signin button
      avatar.style.display = "none";
      signinBtn.style.display = "flex";
      
      // Update welcome message
      welcomeTitle.textContent = "Welcome to StockWizard";
      
      // Display empty state
      displayEmptyWatchlist();
      updateWatchlistCount();
      updatePortfolioValue();
    }
  });
});

// Add some CSS for the remove button
const style = document.createElement('style');
style.textContent = `
  .card {
    position: relative;
    cursor: pointer;
  }
  
  .card:hover .remove-btn {
    opacity: 1;
  }
  
  .remove-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.3s ease;
    font-size: 0.8rem;
  }
  
  .remove-btn:hover {
    background: var(--accent-red);
    color: white;
    transform: scale(1.1);
  }
  
  .empty-message {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;
document.head.appendChild(style);