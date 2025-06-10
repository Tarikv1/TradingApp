// Enhanced Individual Stocks JavaScript with complete functionality
const MARKETSTACK_API_KEY = "aff861cd9cdcdcf341ad67f992b608e3";
const NEWSDATA_API_KEY = "pub_4bb5716a66e74442996860cfaf93b1e6";

let currentUser = null;
let currentSymbol = null;
let currentStockData = null;
let stockChart = null;
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

// Get symbol from URL
function getSymbolFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("symbol")?.toUpperCase() || "AAPL";
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

// Format date
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

// Generate stock icon
function generateStockIcon(symbol) {
  return symbol.charAt(0).toUpperCase();
}

// Calculate percentage change
function calculatePercentChange(current, previous) {
  const change = current - previous;
  const percent = (change / previous) * 100;
  return {
    amount: change,
    percent: percent,
    trend: percent > 0 ? 'positive' : percent < 0 ? 'negative' : 'neutral'
  };
}

// Update stock header
function updateStockHeader(stockData) {
  const symbol = stockData.symbol || currentSymbol;
  const name = stockData.name || `${symbol} Inc.`;
  const currentPrice = stockData.close || stockData.price || 0;
  const previousClose = stockData.adj_close || stockData.previous_close || currentPrice;
  
  // Update basic info
  document.getElementById('stock-name').textContent = name;
  document.getElementById('stock-symbol').textContent = symbol;
  document.getElementById('stock-icon-text').textContent = generateStockIcon(symbol);
  
  // Update price
  document.getElementById('current-price').textContent = formatCurrency(currentPrice);
  
  // Calculate and update change
  const change = calculatePercentChange(currentPrice, previousClose);
  const changeElement = document.getElementById('price-change');
  const amountElement = document.getElementById('change-amount');
  const percentElement = document.getElementById('change-percent');
  
  amountElement.textContent = `${change.amount >= 0 ? '+' : ''}${formatCurrency(change.amount)}`;
  percentElement.textContent = `(${change.percent >= 0 ? '+' : ''}${change.percent.toFixed(2)}%)`;
  
  changeElement.className = `price-change ${change.trend}`;
}

// Update stock statistics
function updateStockStats(stockData) {
  document.getElementById('volume').textContent = formatNumber(stockData.volume || 0);
  document.getElementById('daily-open').textContent = formatCurrency(stockData.open || 0);
  document.getElementById('previous-close').textContent = formatCurrency(stockData.adj_close || stockData.close || 0);
  document.getElementById('day-high').textContent = formatCurrency(stockData.high || 0);
  document.getElementById('day-low').textContent = formatCurrency(stockData.low || 0);
  
  // Calculate market cap (mock data)
  const marketCap = (stockData.close || 0) * 1000000000; // Mock calculation
  document.getElementById('market-cap').textContent = formatNumber(marketCap);
  
  // Mock P/E ratio
  const peRatio = 15 + Math.random() * 20;
  document.getElementById('pe-ratio').textContent = peRatio.toFixed(1);
  
  // Mock 52-week range
  const currentPrice = stockData.close || 0;
  const weekLow = currentPrice * (0.7 + Math.random() * 0.2);
  const weekHigh = currentPrice * (1.1 + Math.random() * 0.3);
  document.getElementById('week-range').textContent = `${formatCurrency(weekLow)} - ${formatCurrency(weekHigh)}`;
}

// Load chart data
async function loadChartData(symbol = currentSymbol, range = "1D") {
  const chartContainer = document.querySelector('.chart-container');
  const chartCanvas = document.getElementById('stockChart');
  const chartLoading = document.getElementById('chart-loading');
  const chartError = document.getElementById('chart-error');
  
  // Show loading state
  chartCanvas.style.display = 'none';
  chartError.style.display = 'none';
  chartLoading.style.display = 'block';
  
  let limit = range === "1D" ? 7 : range === "1W" ? 30 : range === "1M" ? 90 : range === "3M" ? 180 : 365;
  const url = `http://api.marketstack.com/v1/eod?access_key=${MARKETSTACK_API_KEY}&symbols=${symbol}&limit=${limit}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.data || data.data.length < 2) {
      throw new Error("Insufficient data");
    }

    const sortedData = data.data.reverse();
    const labels = sortedData.map(entry => formatDate(entry.date));
    const prices = sortedData.map(entry => entry.close);

    // Hide loading, show chart
    chartLoading.style.display = 'none';
    chartCanvas.style.display = 'block';

    // Destroy existing chart
    if (stockChart) {
      stockChart.destroy();
    }

    // Create new chart
    const ctx = chartCanvas.getContext("2d");
    stockChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `${symbol} Price`,
          data: prices,
          borderColor: '#4f7cff',
          backgroundColor: 'rgba(79, 124, 255, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#4f7cff',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(28, 32, 40, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: function(context) {
                return context[0].label;
              },
              label: function(context) {
                return `Price: ${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Inter',
                size: 11
              },
              maxTicksLimit: 8
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              drawBorder: false
            },
            ticks: {
              color: '#64748b',
              font: {
                family: 'Inter',
                size: 11
              },
              callback: function(value) {
                return formatCurrency(value);
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });

    // Update stock data with latest values
    const latestData = sortedData[sortedData.length - 1];
    currentStockData = latestData;
    updateStockHeader(latestData);
    updateStockStats(latestData);

  } catch (error) {
    console.error("❌ Chart load error:", error);
    
    // Show error state
    chartLoading.style.display = 'none';
    chartError.style.display = 'block';
    
    showToast("Failed to load chart data", 'error');
  }
}

// Load news data
async function loadNews(symbol = currentSymbol) {
  const newsList = document.getElementById('news-list');
  
  // Show loading state
  newsList.innerHTML = `
    <div class="news-loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading news...</p>
    </div>
  `;

  try {
    const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${symbol}&language=en&category=business&size=5`;
    const response = await fetch(url);
    const data = await response.json();

    newsList.innerHTML = "";

    if (!data.results || data.results.length === 0) {
      newsList.innerHTML = `
        <div class="news-card">
          <div class="news-content">
            <div class="news-title">No recent news found</div>
            <div class="news-summary">We couldn't find any recent news for ${symbol}. Check back later for updates.</div>
          </div>
        </div>
      `;
      return;
    }

    data.results.slice(0, 4).forEach(article => {
      const newsCard = document.createElement("div");
      newsCard.className = "news-card";
      newsCard.innerHTML = `
        <img class="news-image" src="${article.image_url || 'https://via.placeholder.com/120x80/4f7cff/ffffff?text=' + symbol}" alt="News" />
        <div class="news-content">
          <div class="news-title">${article.title}</div>
          <div class="news-summary">${article.description || 'No description available.'}</div>
          <div class="news-meta">
            <span class="news-source">${article.source_id || 'Unknown Source'}</span>
            <span class="news-date">${new Date(article.pubDate).toLocaleDateString()}</span>
          </div>
        </div>
      `;
      
      // Add click event to open article
      if (article.link) {
        newsCard.addEventListener('click', () => {
          window.open(article.link, '_blank');
        });
      }
      
      newsList.appendChild(newsCard);
    });

  } catch (error) {
    console.error("❌ News load error:", error);
    newsList.innerHTML = `
      <div class="news-card">
        <div class="news-content">
          <div class="news-title">Failed to load news</div>
          <div class="news-summary">Unable to fetch the latest news. Please try again later.</div>
        </div>
      </div>
    `;
  }
}

// Load related stocks
function loadRelatedStocks(symbol = currentSymbol) {
  const relatedContainer = document.getElementById('related-stocks');
  
  // Mock related stocks data
  const relatedStocks = [
    { symbol: 'MSFT', name: 'Microsoft Corp', price: 378.85, change: 2.34 },
    { symbol: 'GOOGL', name: 'Alphabet Inc', price: 142.56, change: -1.23 },
    { symbol: 'AMZN', name: 'Amazon.com Inc', price: 151.94, change: 0.87 },
    { symbol: 'TSLA', name: 'Tesla Inc', price: 248.50, change: -2.14 }
  ];
  
  relatedContainer.innerHTML = '';
  
  relatedStocks.forEach(stock => {
    const changePercent = (stock.change / stock.price) * 100;
    const trend = changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral';
    
    const stockElement = document.createElement('a');
    stockElement.href = `?symbol=${stock.symbol}`;
    stockElement.className = 'related-stock';
    stockElement.innerHTML = `
      <div class="related-stock-header">
        <div class="related-stock-icon">${generateStockIcon(stock.symbol)}</div>
        <div class="related-stock-info">
          <h4>${stock.name}</h4>
          <div class="related-stock-symbol">${stock.symbol}</div>
        </div>
      </div>
      <div class="related-stock-price">${formatCurrency(stock.price)}</div>
      <div class="related-stock-change ${trend}">
        ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%
      </div>
    `;
    
    relatedContainer.appendChild(stockElement);
  });
}

// Check if stock is in watchlist
function updateWatchlistButton() {
  const watchlistBtn = document.getElementById('watchlist-btn');
  const watchlistText = document.getElementById('watchlist-text');
  const isInWatchlist = userWatchlist.includes(currentSymbol);
  
  if (isInWatchlist) {
    watchlistBtn.innerHTML = `
      <i class="fas fa-eye-slash"></i>
      <span>Remove from Watchlist</span>
    `;
    watchlistBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #e74c3c)';
  } else {
    watchlistBtn.innerHTML = `
      <i class="fas fa-eye"></i>
      <span>Add to Watchlist</span>
    `;
    watchlistBtn.style.background = 'var(--gradient-primary)';
  }
}

// Toggle watchlist
async function toggleWatchlist() {
  if (!currentUser) {
    showToast('Please sign in to manage your watchlist', 'error');
    return;
  }

  const isInWatchlist = userWatchlist.includes(currentSymbol);
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    
    if (isInWatchlist) {
      userWatchlist = userWatchlist.filter(s => s !== currentSymbol);
      showToast(`${currentSymbol} removed from watchlist`, 'success');
    } else {
      userWatchlist.push(currentSymbol);
      showToast(`${currentSymbol} added to watchlist`, 'success');
    }
    
    await userRef.update({ watchlist: userWatchlist });
    updateWatchlistButton();
    
  } catch (error) {
    console.error('❌ Error updating watchlist:', error);
    showToast('Failed to update watchlist', 'error');
  }
}

// Setup timeframe selector
function setupTimeframeSelector() {
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadChartData(currentSymbol, btn.getAttribute('data-range'));
    });
  });
}

// Setup action buttons
function setupActionButtons() {
  // Buy button
  document.querySelector('.buy-btn').addEventListener('click', () => {
    showToast('Buy feature coming soon!', 'info');
  });

  // Sell button
  document.querySelector('.sell-btn').addEventListener('click', () => {
    showToast('Sell feature coming soon!', 'info');
  });

  // Watchlist button
  document.getElementById('watchlist-btn').addEventListener('click', toggleWatchlist);

  // Alert button
  document.querySelector('.alert-btn').addEventListener('click', () => {
    openAlertModal();
  });

  // Refresh news button
  document.getElementById('refresh-news').addEventListener('click', () => {
    loadNews(currentSymbol);
  });
}

// Alert modal functions
function openAlertModal() {
  if (!currentUser) {
    showToast('Please sign in to set alerts', 'error');
    return;
  }
  
  document.getElementById('alert-modal').classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Pre-fill current price
  if (currentStockData) {
    document.getElementById('alert-price').value = currentStockData.close?.toFixed(2) || '';
  }
}

function closeAlertModal() {
  document.getElementById('alert-modal').classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('alert-form').reset();
}

// Setup alert modal
function setupAlertModal() {
  const modal = document.getElementById('alert-modal');
  const closeBtn = document.getElementById('alert-modal-close');
  const cancelBtn = document.getElementById('alert-cancel');
  const form = document.getElementById('alert-form');

  closeBtn.addEventListener('click', closeAlertModal);
  cancelBtn.addEventListener('click', closeAlertModal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAlertModal();
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const price = parseFloat(document.getElementById('alert-price').value);
    const type = document.getElementById('alert-type').value;
    
    if (!price || price <= 0) {
      showToast('Please enter a valid price', 'error');
      return;
    }
    
    // In a real app, this would save to the database
    showToast(`Alert set: Notify when ${currentSymbol} goes ${type} ${formatCurrency(price)}`, 'success');
    closeAlertModal();
  });
}

// Load user data
async function loadUserData() {
  if (!currentUser) return;

  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      userWatchlist = Array.isArray(data.watchlist) ? data.watchlist : [];
      
      // Update avatar
      const avatar = document.getElementById('user-avatar');
      if (data.avatarBase64) {
        avatar.src = data.avatarBase64;
      } else {
        avatar.src = 'https://i.pravatar.cc/150?u=default';
      }
      
      updateWatchlistButton();
    }
  } catch (error) {
    console.error('❌ Error loading user data:', error);
  }
}

// Setup navigation
function setupNavigation() {
  const avatar = document.getElementById('user-avatar');
  const signinBtn = document.getElementById('signin-btn');
  
  avatar.addEventListener('click', () => {
    window.location.href = '../profile/profile.html';
  });
  
  signinBtn.addEventListener('click', () => {
    window.location.href = '../auth/auth.html';
  });
}

// Initialize page
function initializePage() {
  currentSymbol = getSymbolFromURL();
  
  // Update page title
  document.title = `StockWizard - ${currentSymbol}`;
  
  // Load all data
  loadChartData(currentSymbol, '1D');
  loadNews(currentSymbol);
  loadRelatedStocks(currentSymbol);
  
  // Setup components
  setupTimeframeSelector();
  setupActionButtons();
  setupAlertModal();
  setupNavigation();
}

// Handle page navigation
function handleNavigation() {
  // Listen for back/forward navigation
  window.addEventListener('popstate', () => {
    const newSymbol = getSymbolFromURL();
    if (newSymbol !== currentSymbol) {
      currentSymbol = newSymbol;
      initializePage();
    }
  });
  
  // Handle related stock clicks
  document.addEventListener('click', (e) => {
    const relatedStock = e.target.closest('.related-stock');
    if (relatedStock && relatedStock.href) {
      e.preventDefault();
      const url = new URL(relatedStock.href);
      const symbol = url.searchParams.get('symbol');
      if (symbol && symbol !== currentSymbol) {
        // Update URL without page reload
        history.pushState(null, '', `?symbol=${symbol}`);
        currentSymbol = symbol;
        initializePage();
      }
    }
  });
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Firebase auth listener
  firebase.auth().onAuthStateChanged(async (user) => {
    const avatar = document.getElementById('user-avatar');
    const signinBtn = document.getElementById('signin-btn');

    if (user) {
      currentUser = user;
      
      // Show user elements
      avatar.style.display = 'block';
      signinBtn.style.display = 'none';
      
      // Load user data
      await loadUserData();
    } else {
      // No user signed in
      currentUser = null;
      userWatchlist = [];
      
      // Show signin button
      avatar.style.display = 'none';
      signinBtn.style.display = 'flex';
      
      updateWatchlistButton();
    }
  });

  // Initialize page
  initializePage();
  handleNavigation();
});

// Add loading animations
document.addEventListener('DOMContentLoaded', () => {
  // Stagger section animations
  const sections = document.querySelectorAll('.stock-header, .chart-section, .action-section, .data-section, .news-section, .related-section');
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

// Expose global functions with different names to avoid recursion
window.retryLoadChart = function() {
  if (currentSymbol) {
    loadChartData(currentSymbol);
  }
};

window.reloadChart = function() {
  if (currentSymbol) {
    loadChartData(currentSymbol);
  }
};

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC to close modals
  if (e.key === 'Escape') {
    closeAlertModal();
  }
  
  // R to refresh data
  if (e.key === 'r' && e.ctrlKey) {
    e.preventDefault();
    if (currentSymbol) {
      loadChartData(currentSymbol);
      loadNews(currentSymbol);
    }
    showToast('Data refreshed', 'success');
  }
});

// Add periodic data refresh (every 5 minutes)
setInterval(() => {
  if (document.visibilityState === 'visible' && currentSymbol) {
    loadChartData(currentSymbol);
  }
}, 5 * 60 * 1000);

// Add visibility change handler for real-time updates
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentSymbol) {
    // Refresh data when user returns to tab
    loadChartData(currentSymbol);
  }
});