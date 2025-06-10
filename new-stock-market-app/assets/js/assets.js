// Enhanced Assets JavaScript with complete functionality
const db = firebase.firestore();
let currentUser = null;
let userAssets = [];
let assetsChart = null;

// Toast function
function showToast(message, type = 'info') {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Format currency
function formatCurrency(value, currency = 'EUR') {
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

// Format date
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

// Generate asset icon
function generateAssetIcon(name) {
  return name.charAt(0).toUpperCase();
}

// Generate random color for asset
function generateAssetColor(index) {
  const colors = [
    '#4f7cff', '#8b5cf6', '#00d4aa', '#ff6b6b', '#ff8c42',
    '#36b9cc', '#6f42c1', '#fd7e14', '#20c997', '#dc3545',
    '#007bff', '#28a745', '#ffc107', '#e83e8c', '#6c757d'
  ];
  return colors[index % colors.length];
}

// Calculate portfolio metrics
function calculatePortfolioMetrics() {
  if (userAssets.length === 0) {
    return {
      totalValue: 0,
      totalGains: 0,
      totalPercentage: 0,
      assetCount: 0,
      bestPerformer: null,
      avgReturn: 0,
      riskLevel: 'Low'
    };
  }

  let totalValue = 0;
  let totalCost = 0;
  let bestPerformer = null;
  let bestPerformance = -Infinity;

  userAssets.forEach(asset => {
    const value = asset.value || 0;
    const cost = (asset.quantity || 0) * (asset.purchasePrice || 0);
    const profit = value - cost;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;

    totalValue += value;
    totalCost += cost;

    if (profitPercent > bestPerformance) {
      bestPerformance = profitPercent;
      bestPerformer = asset.name;
    }
  });

  const totalGains = totalValue - totalCost;
  const totalPercentage = totalCost > 0 ? (totalGains / totalCost) * 100 : 0;
  const avgReturn = userAssets.length > 0 ? totalPercentage / userAssets.length : 0;

  // Simple risk assessment based on portfolio diversity and volatility
  let riskLevel = 'Low';
  if (userAssets.length < 3) riskLevel = 'High';
  else if (userAssets.length < 6) riskLevel = 'Medium';

  return {
    totalValue,
    totalGains,
    totalPercentage,
    assetCount: userAssets.length,
    bestPerformer,
    avgReturn,
    riskLevel
  };
}

// Update wealth overview
function updateWealthOverview() {
  const metrics = calculatePortfolioMetrics();

  // Update total wealth
  document.getElementById('total-wealth').textContent = formatCurrency(metrics.totalValue);
  
  // Update total change
  const changeElement = document.getElementById('total-change');
  const profitElement = document.getElementById('total-profit');
  const percentElement = document.getElementById('total-percent');

  profitElement.textContent = `${metrics.totalGains >= 0 ? '+' : ''}${formatCurrency(metrics.totalGains)}`;
  percentElement.textContent = `(${metrics.totalPercentage >= 0 ? '+' : ''}${metrics.totalPercentage.toFixed(2)}%)`;

  // Update change styling
  changeElement.className = `wealth-change ${metrics.totalGains >= 0 ? 'positive' : 'negative'}`;

  // Update stats
  document.getElementById('total-gains').textContent = formatCurrency(Math.abs(metrics.totalGains));
  document.getElementById('asset-count').textContent = metrics.assetCount;
  document.getElementById('performance').textContent = `${metrics.totalPercentage >= 0 ? '+' : ''}${metrics.totalPercentage.toFixed(2)}%`;

  // Update analytics
  document.getElementById('best-performer').textContent = metrics.bestPerformer || '-';
  document.getElementById('avg-return').textContent = `${metrics.avgReturn.toFixed(2)}%`;
  document.getElementById('risk-level').textContent = metrics.riskLevel;
  document.getElementById('investment-period').textContent = calculateAverageHoldPeriod();
}

// Calculate average hold period
function calculateAverageHoldPeriod() {
  if (userAssets.length === 0) return '-';

  const now = new Date();
  const totalDays = userAssets.reduce((sum, asset) => {
    if (!asset.purchaseDate) return sum;
    const purchaseDate = asset.purchaseDate.toDate ? asset.purchaseDate.toDate() : new Date(asset.purchaseDate);
    const daysDiff = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
    return sum + daysDiff;
  }, 0);

  const avgDays = Math.floor(totalDays / userAssets.length);
  
  if (avgDays < 30) return `${avgDays} days`;
  if (avgDays < 365) return `${Math.floor(avgDays / 30)} months`;
  return `${Math.floor(avgDays / 365)} years`;
}

// Create or update chart
function updateChart() {
  const ctx = document.getElementById('assetsChart');
  const chartEmpty = document.getElementById('chart-empty');

  if (userAssets.length === 0) {
    ctx.style.display = 'none';
    chartEmpty.style.display = 'block';
    if (assetsChart) {
      assetsChart.destroy();
      assetsChart = null;
    }
    return;
  }

  ctx.style.display = 'block';
  chartEmpty.style.display = 'none';

  const chartType = document.querySelector('.chart-btn.active').dataset.chart;
  const labels = userAssets.map(asset => asset.name);
  const data = userAssets.map(asset => asset.value || 0);
  const colors = userAssets.map((_, index) => generateAssetColor(index));

  if (assetsChart) {
    assetsChart.destroy();
  }

  assetsChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#cbd5e1',
            padding: 20,
            usePointStyle: true,
            font: {
              family: 'Inter',
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(28, 32, 40, 0.9)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
            }
          }
        }
      },
      cutout: chartType === 'doughnut' ? '60%' : 0
    }
  });
}

// Update assets table
function updateAssetsTable() {
  const tbody = document.getElementById('assets-body');
  const tableEmpty = document.getElementById('table-empty');
  const table = document.querySelector('.assets-table');

  if (userAssets.length === 0) {
    table.style.display = 'none';
    tableEmpty.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  tableEmpty.style.display = 'none';
  tbody.innerHTML = '';

  const totalValue = userAssets.reduce((sum, asset) => sum + (asset.value || 0), 0);

  userAssets.forEach((asset, index) => {
    const cost = (asset.quantity || 0) * (asset.purchasePrice || 0);
    const profit = (asset.value || 0) - cost;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    const allocation = totalValue > 0 ? ((asset.value || 0) / totalValue) * 100 : 0;
    const lastUpdated = asset.lastUpdated ? 
      (asset.lastUpdated.toDate ? asset.lastUpdated.toDate() : new Date(asset.lastUpdated)) : 
      new Date();

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="asset-name">
          <div class="asset-icon" style="background: ${generateAssetColor(index)}">
            ${generateAssetIcon(asset.name)}
          </div>
          <div class="asset-info">
            <div>${asset.name}</div>
            <div class="asset-symbol">${asset.symbol || 'N/A'}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="holdings-info">
          <div class="holdings-value">${formatCurrency(asset.value || 0)}</div>
          <div class="holdings-quantity">${formatNumber(asset.quantity || 0)} shares</div>
        </div>
      </td>
      <td>
        <div class="allocation-bar">
          <div class="allocation-progress">
            <div class="allocation-fill" style="width: ${allocation}%; background: ${generateAssetColor(index)}"></div>
          </div>
          <div class="allocation-percent">${allocation.toFixed(1)}%</div>
        </div>
      </td>
      <td>
        <div class="profit-info">
          <div class="profit-value ${profit >= 0 ? 'positive' : 'negative'}">
            ${profit >= 0 ? '+' : ''}${formatCurrency(profit)}
          </div>
          <div class="profit-percent ${profitPercent >= 0 ? 'positive' : 'negative'}">
            ${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%
          </div>
        </div>
      </td>
      <td class="last-updated">${formatDate(lastUpdated)}</td>
      <td>
        <div class="asset-actions">
          <button class="action-btn edit" onclick="editAsset('${asset.id}')" title="Edit Asset">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="deleteAsset('${asset.id}')" title="Delete Asset">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Load user assets
async function loadUserAssets() {
  if (!currentUser) return;

  try {
    const assetsRef = db.collection('users').doc(currentUser.uid).collection('assets');
    const snapshot = await assetsRef.get();

    userAssets = [];
    snapshot.forEach(doc => {
      userAssets.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('📊 Loaded assets:', userAssets);
    
    updateWealthOverview();
    updateChart();
    updateAssetsTable();
    
  } catch (error) {
    console.error('❌ Error loading assets:', error);
    showToast('Failed to load assets', 'error');
  }
}

// Add new asset
async function addAsset(assetData) {
  if (!currentUser) {
    showToast('Please sign in to add assets', 'error');
    return;
  }

  try {
    const assetsRef = db.collection('users').doc(currentUser.uid).collection('assets');
    const docRef = await assetsRef.add({
      ...assetData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('Asset added successfully!', 'success');
    await loadUserAssets();
    closeModal();
    
  } catch (error) {
    console.error('❌ Error adding asset:', error);
    showToast('Failed to add asset', 'error');
  }
}

// Delete asset
async function deleteAsset(assetId) {
  if (!currentUser) return;

  if (!confirm('Are you sure you want to delete this asset?')) return;

  try {
    await db.collection('users').doc(currentUser.uid).collection('assets').doc(assetId).delete();
    showToast('Asset deleted successfully!', 'success');
    await loadUserAssets();
    
  } catch (error) {
    console.error('❌ Error deleting asset:', error);
    showToast('Failed to delete asset', 'error');
  }
}

// Edit asset (placeholder - would open modal with current data)
function editAsset(assetId) {
  const asset = userAssets.find(a => a.id === assetId);
  if (!asset) return;

  // Fill form with current data
  document.getElementById('asset-name').value = asset.name || '';
  document.getElementById('asset-symbol').value = asset.symbol || '';
  document.getElementById('asset-quantity').value = asset.quantity || '';
  document.getElementById('asset-price').value = asset.purchasePrice || '';
  
  if (asset.purchaseDate) {
    const date = asset.purchaseDate.toDate ? asset.purchaseDate.toDate() : new Date(asset.purchaseDate);
    document.getElementById('asset-date').value = date.toISOString().split('T')[0];
  }

  // Store the asset ID for updating
  document.getElementById('add-asset-form').dataset.editId = assetId;
  
  // Change modal title and button text
  document.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-edit"></i> Edit Asset';
  document.querySelector('.submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Asset';
  
  openModal();
}

// Update existing asset
async function updateAsset(assetId, assetData) {
  if (!currentUser) return;

  try {
    await db.collection('users').doc(currentUser.uid).collection('assets').doc(assetId).update({
      ...assetData,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast('Asset updated successfully!', 'success');
    await loadUserAssets();
    closeModal();
    
  } catch (error) {
    console.error('❌ Error updating asset:', error);
    showToast('Failed to update asset', 'error');
  }
}

// Modal functions
function openModal() {
  document.getElementById('add-asset-modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('add-asset-modal').classList.remove('show');
  document.body.style.overflow = '';
  
  // Reset form
  document.getElementById('add-asset-form').reset();
  delete document.getElementById('add-asset-form').dataset.editId;
  
  // Reset modal title and button
  document.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-plus-circle"></i> Add New Asset';
  document.querySelector('.submit-btn').innerHTML = '<i class="fas fa-plus"></i> Add Asset';
}

// Setup modal event listeners
function setupModal() {
  const modal = document.getElementById('add-asset-modal');
  const openBtn = document.getElementById('add-asset-btn');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('cancel-btn');
  const form = document.getElementById('add-asset-form');

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('asset-name').value.trim();
    const symbol = document.getElementById('asset-symbol').value.trim().toUpperCase();
    const quantity = parseFloat(document.getElementById('asset-quantity').value);
    const purchasePrice = parseFloat(document.getElementById('asset-price').value);
    const purchaseDate = new Date(document.getElementById('asset-date').value);

    // Validation
    if (!name || !symbol || !quantity || !purchasePrice) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (quantity <= 0 || purchasePrice <= 0) {
      showToast('Quantity and price must be greater than 0', 'error');
      return;
    }

    // Calculate current value (in real app, would fetch from API)
    const currentPrice = purchasePrice * (1 + (Math.random() - 0.5) * 0.2); // Simulate price change
    const value = quantity * currentPrice;

    const assetData = {
      name,
      symbol,
      quantity,
      purchasePrice,
      currentPrice,
      value,
      purchaseDate: firebase.firestore.Timestamp.fromDate(purchaseDate)
    };

    // Check if editing or adding
    const editId = form.dataset.editId;
    if (editId) {
      await updateAsset(editId, assetData);
    } else {
      await addAsset(assetData);
    }
  });
}

// Setup chart controls
function setupChartControls() {
  document.querySelectorAll('.chart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateChart();
    });
  });
}

// Setup table controls
function setupTableControls() {
  const sortSelect = document.getElementById('sort-select');
  const exportBtn = document.getElementById('export-btn');

  sortSelect.addEventListener('change', () => {
    sortAssets(sortSelect.value);
  });

  exportBtn.addEventListener('click', exportAssets);
}

// Sort assets
function sortAssets(sortBy) {
  const [field, direction] = sortBy.split('-');
  
  userAssets.sort((a, b) => {
    let aVal, bVal;
    
    switch (field) {
      case 'name':
        aVal = a.name || '';
        bVal = b.name || '';
        break;
      case 'value':
        aVal = a.value || 0;
        bVal = b.value || 0;
        break;
      case 'profit':
        aVal = (a.value || 0) - ((a.quantity || 0) * (a.purchasePrice || 0));
        bVal = (b.value || 0) - ((b.quantity || 0) * (b.purchasePrice || 0));
        break;
      default:
        return 0;
    }
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  updateAssetsTable();
}

// Export assets to CSV
function exportAssets() {
  if (userAssets.length === 0) {
    showToast('No assets to export', 'info');
    return;
  }

  const headers = ['Name', 'Symbol', 'Quantity', 'Purchase Price', 'Current Value', 'Profit/Loss', 'Purchase Date'];
  const csvContent = [
    headers.join(','),
    ...userAssets.map(asset => {
      const cost = (asset.quantity || 0) * (asset.purchasePrice || 0);
      const profit = (asset.value || 0) - cost;
      const purchaseDate = asset.purchaseDate ? 
        (asset.purchaseDate.toDate ? asset.purchaseDate.toDate() : new Date(asset.purchaseDate)).toLocaleDateString() : 
        '';
      
      return [
        `"${asset.name || ''}"`,
        asset.symbol || '',
        asset.quantity || 0,
        asset.purchasePrice || 0,
        asset.value || 0,
        profit,
        purchaseDate
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stockwizard-assets-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  showToast('Assets exported successfully!', 'success');
}

// Setup refresh functionality
function setupRefresh() {
  const refreshBtn = document.getElementById('refresh-btn');
  
  refreshBtn.addEventListener('click', async () => {
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    // Simulate API calls to update asset prices
    try {
      for (let asset of userAssets) {
        // In real app, would fetch current price from API
        const priceChange = (Math.random() - 0.5) * 0.1; // ±10% change
        asset.currentPrice = asset.purchasePrice * (1 + priceChange);
        asset.value = asset.quantity * asset.currentPrice;
        
        // Update in Firestore
        await db.collection('users').doc(currentUser.uid).collection('assets').doc(asset.id).update({
          currentPrice: asset.currentPrice,
          value: asset.value,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      updateWealthOverview();
      updateChart();
      updateAssetsTable();
      showToast('Asset prices updated!', 'success');
      
    } catch (error) {
      console.error('❌ Error refreshing assets:', error);
      showToast('Failed to refresh asset prices', 'error');
    } finally {
      refreshBtn.innerHTML = originalHTML;
      refreshBtn.disabled = false;
    }
  });
}

// Setup time period filters
function setupTimeFilters() {
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const period = btn.dataset.period;
      // In real app, would filter data by time period
      showToast(`Showing ${period} performance data`, 'info');
    });
  });
}

// Setup navigation
function setupNavigation() {
  const avatar = document.getElementById('user-avatar');
  
  avatar.addEventListener('click', () => {
    window.location.href = '../profile/profile.html';
  });
}

// Load user avatar
async function loadUserAvatar() {
  if (!currentUser) return;

  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      const avatar = document.getElementById('user-avatar');
      
      if (data.avatarBase64) {
        avatar.src = data.avatarBase64;
      } else {
        avatar.src = 'https://i.pravatar.cc/150?u=default';
      }
    }
  } catch (error) {
    console.error('❌ Error loading user avatar:', error);
  }
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  // Setup all functionality
  setupModal();
  setupChartControls();
  setupTableControls();
  setupRefresh();
  setupTimeFilters();
  setupNavigation();

  // Firebase auth state change handler
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserAvatar();
      await loadUserAssets();
    } else {
      // No user signed in, redirect to auth
      window.location.href = '../auth/auth.html';
    }
  });
});

// Add some demo data for new users (optional)
async function addDemoAssets() {
  if (!currentUser || userAssets.length > 0) return;

  const demoAssets = [
    {
      name: 'Apple Inc.',
      symbol: 'AAPL',
      quantity: 10,
      purchasePrice: 150,
      currentPrice: 175,
      purchaseDate: new Date('2024-01-15')
    },
    {
      name: 'Tesla Inc.',
      symbol: 'TSLA',
      quantity: 5,
      purchasePrice: 200,
      currentPrice: 180,
      purchaseDate: new Date('2024-02-01')
    },
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      quantity: 0.5,
      purchasePrice: 45000,
      currentPrice: 67000,
      purchaseDate: new Date('2024-01-01')
    }
  ];

  try {
    const assetsRef = db.collection('users').doc(currentUser.uid).collection('assets');
    
    for (const asset of demoAssets) {
      asset.value = asset.quantity * asset.currentPrice;
      asset.purchaseDate = firebase.firestore.Timestamp.fromDate(asset.purchaseDate);
      asset.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      asset.lastUpdated = firebase.firestore.FieldValue.serverTimestamp();
      
      await assetsRef.add(asset);
    }
    
    showToast('Demo assets added! You can edit or delete them.', 'success');
    await loadUserAssets();
    
  } catch (error) {
    console.error('❌ Error adding demo assets:', error);
  }
}

// Add staggered animations for cards
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const cards = document.querySelectorAll('.wealth-card, .stat-card, .metric-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }, 500);
});

// Expose functions to global scope for onclick handlers
window.editAsset = editAsset;
window.deleteAsset = deleteAsset;
window.addDemoAssets = addDemoAssets;