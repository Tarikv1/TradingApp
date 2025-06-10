// Enhanced Watchlist JavaScript with search functionality
const MARKETSTACK_API_KEY = "aff861cd9cdcdcf341ad67f992b608e3";


let currentUser = null;
let userWatchlist = [];

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
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return new Intl.NumberFormat('en-US').format(num);
}

// Categorize stocks by type
function categorizeStock(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    console.warn('Invalid symbol passed to categorizeStock:', symbol);
    return "stock"; // Default to stock
  }
  
  const cryptos = ["BTC", "ETH", "XRP", "SOL", "DOGE", "AVAX", "SUI", "ADA", "DOT", "LINK"];
  const commodities = ["USOIL", "GOLD", "SILVER", "PALLADIUM", "PLATINUM", "COPPER", "NATURAL_GAS"];
  
  const upperSymbol = symbol.toUpperCase();
  
  if (cryptos.includes(upperSymbol)) return "crypto";
  if (commodities.includes(upperSymbol)) return "commodity";
  return "stock";
}

// Get container ID for stock category
function getContainerForCategory(category) {
  switch (category) {
    case 'crypto': return 'cryptoCards';
    case 'commodity': return 'commodityCards';
    default: return 'stockCards';
  }
}

// Update category counts
function updateCategoryCounts() {
  const counts = {
    crypto: 0,
    stock: 0,
    commodity: 0
  };

  userWatchlist.forEach(symbol => {
    const category = categorizeStock(symbol);
    counts[category]++;
  });

  document.getElementById('crypto-count').textContent = counts.crypto;
  document.getElementById('stocks-count').textContent = counts.stock;
  document.getElementById('commodities-count').textContent = counts.commodity;
}

// Create empty state for category
function createEmptyState(category) {
  const categoryNames = {
    crypto: 'cryptocurrency',
    stock: 'stocks',
    commodity: 'commodities'
  };

  return `
    <div class="empty-state">
      <i class="fas fa-inbox"></i>
      <h3>No ${categoryNames[category]} in watchlist</h3>
      <p>Search and add some ${categoryNames[category]} to get started</p>
      <button class="add-stocks-btn" onclick="document.getElementById('searchInput').focus()">
        <i class="fas fa-plus"></i>
        Add ${categoryNames[category]}
      </button>
    </div>
  `;
}

// Fetch stock data from API
async function fetchStockData(symbols = []) {
  console.log("📊 Fetching stock data for:", symbols);
  
  // Clear all containers first
  ['cryptoCards', 'stockCards', 'commodityCards'].forEach(id => {
    document.getElementById(id).innerHTML = "";
  });

  if (symbols.length === 0) {
    displayEmptyStates();
    updateCategoryCounts();
    return;
  }

  // Filter out any invalid symbols
  const validSymbols = symbols.filter(symbol => symbol && typeof symbol === 'string' && symbol.trim().length > 0);
  
  if (validSymbols.length === 0) {
    console.warn("No valid symbols to fetch");
    displayEmptyStates();
    updateCategoryCounts();
    return;
  }

  const query = validSymbols.join(",");
  const url = `http://api.marketstack.com/v1/eod/latest?access_key=${MARKETSTACK_API_KEY}&symbols=${query}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API error');
    }
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("📈 Received stock data:", data.data);
      updateWatchlistCards(data.data);
    } else {
      console.warn("❌ No stock data received or empty data array:", data);
      displayEmptyStates();
      showToast("No stock data available", 'info');
    }
  } catch (error) {
    console.error("❌ Error fetching stock data:", error);
    displayEmptyStates();
    showToast(`Failed to load stock data: ${error.message}`, 'error');
  }
  
  updateCategoryCounts();
}

// Display empty states for all categories
function displayEmptyStates() {
  const categories = ['crypto', 'stock', 'commodity'];
  
  categories.forEach(category => {
    const containerId = getContainerForCategory(category);
    const container = document.getElementById(containerId);
    
    // Check if this category has any stocks
    const categoryStocks = userWatchlist.filter(symbol => categorizeStock(symbol) === category);
    
    if (categoryStocks.length === 0) {
      container.innerHTML = createEmptyState(category);
    }
  });
}

// Update watchlist cards
function updateWatchlistCards(stocks) {
  // Group stocks by category
  const categorizedStocks = {
    crypto: [],
    stock: [],
    commodity: []
  };

  stocks.forEach(stock => {
    // Validate stock data
    if (!stock || !stock.symbol) {
      console.warn('Invalid stock data:', stock);
      return;
    }
    
    const category = categorizeStock(stock.symbol);
    categorizedStocks[category].push(stock);
  });

  // Update each category
  Object.keys(categorizedStocks).forEach(category => {
    const containerId = getContainerForCategory(category);
    const container = document.getElementById(containerId);
    
    if (categorizedStocks[category].length === 0) {
      container.innerHTML = createEmptyState(category);
      return;
    }

    container.innerHTML = "";
    
    categorizedStocks[category].forEach(stock => {
      // Ensure we have valid price data
      const currentPrice = stock.close || stock.price || 0;
      const openPrice = stock.open || currentPrice;
      const volume = stock.volume || 0;
      
      const change = currentPrice - openPrice;
      const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${stock.name || stock.symbol || 'Unknown'}</h3>
        <ul>
          <li>
            <span>Symbol</span>
            <span>${stock.symbol || 'N/A'}</span>
          </li>
          <li>
            <span>Price</span>
            <span>${formatCurrency(currentPrice)}</span>
          </li>
          <li>
            <span>Change</span>
            <span class="${trend}">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%</span>
          </li>
          <li>
            <span>Volume</span>
            <span class="neutral">${formatNumber(volume)}</span>
          </li>
        </ul>
      `;
      
      // Add click event to view stock details
      card.addEventListener('click', () => {
        if (stock.symbol) {
          window.location.href = `../indv-stocks-page/indv-stocks-page.html?symbol=${stock.symbol}`;
        }
      });
      
      container.appendChild(card);
    });
  });
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
          li.innerHTML = `
            <div class="search-result-info">
              <div class="search-result-symbol">No results found</div>
              <div class="search-result-name">Try a different search term</div>
            </div>
          `;
          li.style.cursor = 'default';
          searchDropdown.appendChild(li);
        } else {
          results.forEach(stock => {
            const li = document.createElement("li");
            const isInWatchlist = userWatchlist.includes(stock.symbol.toUpperCase());
            
            li.innerHTML = `
              <div class="search-result-info">
                <div class="search-result-symbol">${stock.symbol}</div>
                <div class="search-result-name">${stock.name}</div>
              </div>
              <div class="search-result-action">
                ${!isInWatchlist ? `<button class="search-action-btn add-btn" onclick="addToWatchlistFromSearch('${stock.symbol}', event)">Add</button>` : '<span style="color: var(--accent-green); font-size: 0.8rem;">✓ Added</span>'}
                <button class="search-action-btn view-btn" onclick="viewStock('${stock.symbol}', event)">View</button>
              </div>
            `;
            
            searchDropdown.appendChild(li);
          });
        }
        
        searchDropdown.classList.add("show");
      } catch (error) {
        console.error("Search error:", error);
        searchDropdown.innerHTML = `
          <li style="cursor: default;">
            <div class="search-result-info">
              <div class="search-result-symbol">Search failed</div>
              <div class="search-result-name">Please try again</div>
            </div>
          </li>
        `;
        searchDropdown.classList.add("show");
      }
    }, 300);
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      searchDropdown.classList.remove("show");
    }
  });

  // Clear search on escape
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      searchDropdown.classList.remove("show");
    }
  });
}

// Add stock to watchlist from search
async function addToWatchlistFromSearch(symbol, event) {
  event.stopPropagation();
  
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
    
    // Clear search and refresh watchlist
    searchInput.value = "";
    searchDropdown.classList.remove("show");
    
    // Refresh the watchlist display
    fetchStockData(userWatchlist);
    
  } catch (error) {
    console.error("❌ Error adding to watchlist:", error);
    showToast("Failed to add to watchlist", 'error');
    userWatchlist.pop(); // Remove from local array if save failed
  }
}

// View stock details
function viewStock(symbol, event) {
  event.stopPropagation();
  window.location.href = `../indv-stocks-page/indv-stocks-page.html?symbol=${symbol}`;
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
      
      // Update avatar
      const avatar = document.getElementById("user-avatar");
      if (data.avatarBase64) {
        avatar.src = data.avatarBase64;
      } else {
        avatar.src = "https://i.pravatar.cc/150?u=default";
      }
      
      // Load stock data
      fetchStockData(userWatchlist);
      
      console.log("📦 User data loaded:", { watchlist: userWatchlist.length });
    }
  } catch (error) {
    console.error("❌ Error loading user data:", error);
    showToast("Failed to load user data", 'error');
  }
}

// Setup navigation
function setupNavigation() {
  const avatar = document.getElementById("user-avatar");
  
  avatar.addEventListener("click", () => {
    window.location.href = "../profile/profile.html";
  });
}

// Initialize page
function initializePage() {
  // Set current year in footer
  document.getElementById("year").textContent = new Date().getFullYear();
  
  // Setup functionality
  setupSearch();
  setupNavigation();
}

// Main initialization
document.addEventListener("DOMContentLoaded", () => {
  initializePage();

  // Firebase auth state change handler
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
    } else {
      // No user signed in
      currentUser = null;
      userWatchlist = [];
      displayEmptyStates();
      updateCategoryCounts();
    }
  });
});

// Add loading animations
document.addEventListener('DOMContentLoaded', () => {
  // Stagger section animations
  const sections = document.querySelectorAll('.category');
  sections.forEach((section, index) => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    setTimeout(() => {
      section.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      section.style.opacity = '1';
      section.style.transform = 'translateY(0)';
    }, index * 150);
  });
});

// Expose global functions for onclick handlers
window.addToWatchlistFromSearch = addToWatchlistFromSearch;
window.viewStock = viewStock;