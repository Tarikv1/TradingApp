// Marketstack API Integration for StockWizard

class MarketstackAPI {
  constructor() {
    // You'll need to get your API key from https://marketstack.com/
    this.apiKey = "YOUR_MARKETSTACK_API_KEY"
    this.baseUrl = "http://api.marketstack.com/v1"
    this.cache = new Map()
    this.cacheTimeout = 60000 // 1 minute cache
  }

  async makeRequest(endpoint, params = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }

    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.append("access_key", this.apiKey)

    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key])
    })

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Cache the response
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now(),
      })

      return data
    } catch (error) {
      console.error("Marketstack API error:", error)
      throw error
    }
  }

  async getStockQuote(symbol) {
    try {
      const data = await this.makeRequest("/eod/latest", {
        symbols: symbol,
        limit: 1,
      })

      if (data.data && data.data.length > 0) {
        const stock = data.data[0]
        return {
          symbol: stock.symbol,
          price: stock.close,
          change: stock.close - stock.open,
          changePercent: ((stock.close - stock.open) / stock.open) * 100,
          volume: stock.volume,
          date: stock.date,
        }
      }

      throw new Error("No data found for symbol")
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }

  async getMultipleQuotes(symbols) {
    try {
      const symbolString = Array.isArray(symbols) ? symbols.join(",") : symbols
      const data = await this.makeRequest("/eod/latest", {
        symbols: symbolString,
        limit: symbols.length || 1,
      })

      if (data.data) {
        return data.data.map((stock) => ({
          symbol: stock.symbol,
          price: stock.close,
          change: stock.close - stock.open,
          changePercent: ((stock.close - stock.open) / stock.open) * 100,
          volume: stock.volume,
          date: stock.date,
        }))
      }

      return []
    } catch (error) {
      console.error("Error fetching multiple quotes:", error)
      return []
    }
  }

  async getHistoricalData(symbol, dateFrom, dateTo = null) {
    try {
      const params = {
        symbols: symbol,
        date_from: dateFrom,
      }

      if (dateTo) {
        params.date_to = dateTo
      }

      const data = await this.makeRequest("/eod", params)

      if (data.data) {
        return data.data.map((item) => ({
          date: item.date,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume,
        }))
      }

      return []
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error)
      return []
    }
  }

  async searchStocks(query) {
    try {
      const data = await this.makeRequest("/tickers", {
        search: query,
        limit: 10,
      })

      if (data.data) {
        return data.data.map((ticker) => ({
          symbol: ticker.symbol,
          name: ticker.name,
          exchange: ticker.stock_exchange?.name || "Unknown",
        }))
      }

      return []
    } catch (error) {
      console.error("Error searching stocks:", error)
      return []
    }
  }

  async getMarketIndices() {
    // Get major market indices
    const indices = ["SPY", "QQQ", "DIA", "IWM"] // ETFs representing major indices
    return await this.getMultipleQuotes(indices)
  }

  // Demo data for when API key is not available
  getDemoData() {
    return {
      stocks: [
        {
          symbol: "AAPL",
          name: "Apple Inc.",
          price: 175.5,
          change: 2.3,
          changePercent: 1.33,
          volume: 45678900,
        },
        {
          symbol: "GOOGL",
          name: "Alphabet Inc.",
          price: 2750.8,
          change: -15.2,
          changePercent: -0.55,
          volume: 1234567,
        },
        {
          symbol: "MSFT",
          name: "Microsoft Corporation",
          price: 335.2,
          change: 5.8,
          changePercent: 1.76,
          volume: 23456789,
        },
        {
          symbol: "TSLA",
          name: "Tesla Inc.",
          price: 245.6,
          change: 12.4,
          changePercent: 5.32,
          volume: 34567890,
        },
        {
          symbol: "AMZN",
          name: "Amazon.com Inc.",
          price: 3285.5,
          change: -25.3,
          changePercent: -0.76,
          volume: 3456789,
        },
      ],
      indices: [
        {
          symbol: "SPY",
          name: "S&P 500 ETF",
          price: 415.2,
          change: 2.45,
          changePercent: 0.59,
        },
        {
          symbol: "QQQ",
          name: "NASDAQ 100 ETF",
          price: 365.8,
          change: -1.2,
          changePercent: -0.33,
        },
      ],
    }
  }

  // Check if API is configured
  isConfigured() {
    return this.apiKey && this.apiKey !== "YOUR_MARKETSTACK_API_KEY"
  }
}

// Initialize Marketstack API
window.marketstackAPI = new MarketstackAPI()

// Enhanced StockWizard methods for real data
if (window.app) {
  // Override the loadSampleData method to use real data when available
  const originalLoadSampleData = window.app.loadSampleData

  window.app.loadSampleData = async function () {
    if (window.marketstackAPI.isConfigured()) {
      try {
        this.showLoading(true)
        const stocks = await window.marketstackAPI.getMultipleQuotes(["AAPL", "GOOGL", "MSFT", "TSLA"])

        if (stocks.length > 0) {
          // Add company names
          const stocksWithNames = stocks.map((stock) => ({
            ...stock,
            name: this.getCompanyName(stock.symbol),
          }))

          this.displayWatchlist(stocksWithNames)
        } else {
          // Fallback to demo data
          const demoData = window.marketstackAPI.getDemoData()
          this.displayWatchlist(demoData.stocks)
        }
      } catch (error) {
        console.error("Error loading real stock data:", error)
        // Fallback to demo data
        const demoData = window.marketstackAPI.getDemoData()
        this.displayWatchlist(demoData.stocks)
      } finally {
        this.showLoading(false)
      }
    } else {
      // Use demo data
      const demoData = window.marketstackAPI.getDemoData()
      this.displayWatchlist(demoData.stocks)
    }
  }

  // Helper method to get company names
  window.app.getCompanyName = (symbol) => {
    const companyNames = {
      AAPL: "Apple Inc.",
      GOOGL: "Alphabet Inc.",
      MSFT: "Microsoft Corporation",
      TSLA: "Tesla Inc.",
      AMZN: "Amazon.com Inc.",
      META: "Meta Platforms Inc.",
      NVDA: "NVIDIA Corporation",
      NFLX: "Netflix Inc.",
    }

    return companyNames[symbol] || symbol
  }
}
