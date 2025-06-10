<?php
// Stock API endpoints for StockWizard
require_once 'config.php';

APIConfig::setCORSHeaders();

class StockAPI {
    private $db;
    private $marketstackKey;
    
    public function __construct() {
        $this->db = (new DatabaseConfig())->getConnection();
        $this->marketstackKey = APIConfig::MARKETSTACK_API_KEY;
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        
        // Remove 'api' and 'stocks.php' from path
        $action = end($pathParts);
        
        switch ($method) {
            case 'GET':
                $this->handleGet($action);
                break;
            case 'POST':
                $this->handlePost($action);
                break;
            default:
                APIConfig::errorResponse('Method not allowed', 405);
        }
    }
    
    private function handleGet($action) {
        switch ($action) {
            case 'quote':
                $symbol = $_GET['symbol'] ?? '';
                if (empty($symbol)) {
                    APIConfig::errorResponse('Symbol parameter required');
                }
                $this->getStockQuote($symbol);
                break;
                
            case 'search':
                $query = $_GET['q'] ?? '';
                if (empty($query)) {
                    APIConfig::errorResponse('Query parameter required');
                }
                $this->searchStocks($query);
                break;
                
            case 'watchlist':
                $userId = $_GET['user_id'] ?? '';
                if (empty($userId)) {
                    APIConfig::errorResponse('User ID required');
                }
                $this->getUserWatchlist($userId);
                break;
                
            case 'portfolio':
                $userId = $_GET['user_id'] ?? '';
                if (empty($userId)) {
                    APIConfig::errorResponse('User ID required');
                }
                $this->getUserPortfolio($userId);
                break;
                
            default:
                APIConfig::errorResponse('Invalid endpoint');
        }
    }
    
    private function handlePost($action) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        switch ($action) {
            case 'watchlist':
                $this->addToWatchlist($input);
                break;
                
            case 'portfolio':
                $this->addToPortfolio($input);
                break;
                
            default:
                APIConfig::errorResponse('Invalid endpoint');
        }
    }
    
    private function getStockQuote($symbol) {
        // Check cache first
        $cached = $this->getCachedStock($symbol);
        if ($cached) {
            APIConfig::jsonResponse($cached);
            return;
        }
        
        // Fetch from Marketstack API
        if ($this->marketstackKey && $this->marketstackKey !== 'YOUR_MARKETSTACK_API_KEY') {
            $data = $this->fetchFromMarketstack("/eod/latest", [
                'symbols' => $symbol,
                'limit' => 1
            ]);
            
            if ($data && isset($data['data']) && count($data['data']) > 0) {
                $stock = $data['data'][0];
                $result = [
                    'symbol' => $stock['symbol'],
                    'price' => $stock['close'],
                    'change' => $stock['close'] - $stock['open'],
                    'changePercent' => (($stock['close'] - $stock['open']) / $stock['open']) * 100,
                    'volume' => $stock['volume'],
                    'date' => $stock['date']
                ];
                
                // Cache the result
                $this->cacheStock($symbol, $result);
                APIConfig::jsonResponse($result);
                return;
            }
        }
        
        // Fallback to demo data
        $demoData = $this->getDemoStockData($symbol);
        APIConfig::jsonResponse($demoData);
    }
    
    private function searchStocks($query) {
        if ($this->marketstackKey && $this->marketstackKey !== 'YOUR_MARKETSTACK_API_KEY') {
            $data = $this->fetchFromMarketstack("/tickers", [
                'search' => $query,
                'limit' => 10
            ]);
            
            if ($data && isset($data['data'])) {
                $results = array_map(function($ticker) {
                    return [
                        'symbol' => $ticker['symbol'],
                        'name' => $ticker['name'],
                        'exchange' => $ticker['stock_exchange']['name'] ?? 'Unknown'
                    ];
                }, $data['data']);
                
                APIConfig::jsonResponse($results);
                return;
            }
        }
        
        // Fallback to demo search
        $demoResults = $this->getDemoSearchResults($query);
        APIConfig::jsonResponse($demoResults);
    }
    
    private function getUserWatchlist($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT w.symbol, w.added_at 
                FROM watchlist w 
                JOIN users u ON w.user_id = u.id 
                WHERE u.firebase_uid = ? 
                ORDER BY w.added_at DESC
            ");
            $stmt->execute([$userId]);
            $watchlist = $stmt->fetchAll();
            
            // Get current prices for watchlist items
            $symbols = array_column($watchlist, 'symbol');
            $quotes = [];
            
            foreach ($symbols as $symbol) {
                // This would normally fetch real-time data
                $quotes[] = $this->getDemoStockData($symbol);
            }
            
            APIConfig::jsonResponse($quotes);
        } catch (Exception $e) {
            APIConfig::errorResponse('Failed to fetch watchlist');
        }
    }
    
    private function addToWatchlist($input) {
        $userId = $input['user_id'] ?? '';
        $symbol = $input['symbol'] ?? '';
        
        if (empty($userId) || empty($symbol)) {
            APIConfig::errorResponse('User ID and symbol required');
        }
        
        try {
            // First, get or create user
            $userDbId = $this->getOrCreateUser($userId);
            
            // Add to watchlist
            $stmt = $this->db->prepare("
                INSERT IGNORE INTO watchlist (user_id, symbol) 
                VALUES (?, ?)
            ");
            $stmt->execute([$userDbId, strtoupper($symbol)]);
            
            APIConfig::jsonResponse(['success' => true, 'message' => 'Added to watchlist']);
        } catch (Exception $e) {
            APIConfig::errorResponse('Failed to add to watchlist');
        }
    }
    
    private function getUserPortfolio($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT p.symbol, p.shares, p.purchase_price, p.purchase_date 
                FROM portfolio p 
                JOIN users u ON p.user_id = u.id 
                WHERE u.firebase_uid = ?
            ");
            $stmt->execute([$userId]);
            $portfolio = $stmt->fetchAll();
            
            APIConfig::jsonResponse($portfolio);
        } catch (Exception $e) {
            APIConfig::errorResponse('Failed to fetch portfolio');
        }
    }
    
    private function addToPortfolio($input) {
        $userId = $input['user_id'] ?? '';
        $symbol = $input['symbol'] ?? '';
        $shares = $input['shares'] ?? 0;
        $purchasePrice = $input['purchase_price'] ?? 0;
        $purchaseDate = $input['purchase_date'] ?? date('Y-m-d');
        
        if (empty($userId) || empty($symbol) || $shares <= 0 || $purchasePrice <= 0) {
            APIConfig::errorResponse('All fields required and must be valid');
        }
        
        try {
            $userDbId = $this->getOrCreateUser($userId);
            
            $stmt = $this->db->prepare("
                INSERT INTO portfolio (user_id, symbol, shares, purchase_price, purchase_date) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$userDbId, strtoupper($symbol), $shares, $purchasePrice, $purchaseDate]);
            
            APIConfig::jsonResponse(['success' => truepurchasePrice, $purchaseDate]);
            
            APIConfig::jsonResponse(['success' => true, 'message' => 'Added to portfolio']);
        } catch (Exception $e) {
            APIConfig::errorResponse('Failed to add to portfolio');
        }
    }
    
    private function fetchFromMarketstack($endpoint, $params = []) {
        $url = APIConfig::MARKETSTACK_BASE_URL . $endpoint;
        $params['access_key'] = $this->marketstackKey;
        
        $queryString = http_build_query($params);
        $fullUrl = $url . '?' . $queryString;
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'StockWizard/1.0'
            ]
        ]);
        
        $response = @file_get_contents($fullUrl, false, $context);
        
        if ($response === false) {
            return null;
        }
        
        return json_decode($response, true);
    }
    
    private function getCachedStock($symbol) {
        try {
            $stmt = $this->db->prepare("
                SELECT data FROM stock_cache 
                WHERE symbol = ? AND expires_at > NOW()
            ");
            $stmt->execute([strtoupper($symbol)]);
            $result = $stmt->fetch();
            
            if ($result) {
                return json_decode($result['data'], true);
            }
        } catch (Exception $e) {
            // Cache miss, continue
        }
        
        return null;
    }
    
    private function cacheStock($symbol, $data) {
        try {
            $expiresAt = date('Y-m-d H:i:s', strtotime('+5 minutes'));
            
            $stmt = $this->db->prepare("
                INSERT INTO stock_cache (symbol, data, expires_at) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                data = VALUES(data), 
                cached_at = CURRENT_TIMESTAMP, 
                expires_at = VALUES(expires_at)
            ");
            $stmt->execute([strtoupper($symbol), json_encode($data), $expiresAt]);
        } catch (Exception $e) {
            // Cache write failed, continue
        }
    }
    
    private function getOrCreateUser($firebaseUid) {
        try {
            // Try to find existing user
            $stmt = $this->db->prepare("SELECT id FROM users WHERE firebase_uid = ?");
            $stmt->execute([$firebaseUid]);
            $user = $stmt->fetch();
            
            if ($user) {
                return $user['id'];
            }
            
            // Create new user
            $stmt = $this->db->prepare("
                INSERT INTO users (firebase_uid, email) 
                VALUES (?, ?)
            ");
            $stmt->execute([$firebaseUid, $firebaseUid . '@demo.com']);
            
            return $this->db->lastInsertId();
        } catch (Exception $e) {
            throw new Exception('Failed to get or create user');
        }
    }
    
    private function getDemoStockData($symbol) {
        $demoStocks = [
            'AAPL' => [
                'symbol' => 'AAPL',
                'name' => 'Apple Inc.',
                'price' => 175.50,
                'change' => 2.30,
                'changePercent' => 1.33,
                'volume' => 45678900
            ],
            'GOOGL' => [
                'symbol' => 'GOOGL',
                'name' => 'Alphabet Inc.',
                'price' => 2750.80,
                'change' => -15.20,
                'changePercent' => -0.55,
                'volume' => 1234567
            ],
            'MSFT' => [
                'symbol' => 'MSFT',
                'name' => 'Microsoft Corporation',
                'price' => 335.20,
                'change' => 5.80,
                'changePercent' => 1.76,
                'volume' => 23456789
            ],
            'TSLA' => [
                'symbol' => 'TSLA',
                'name' => 'Tesla Inc.',
                'price' => 245.60,
                'change' => 12.40,
                'changePercent' => 5.32,
                'volume' => 34567890
            ]
        ];
        
        return $demoStocks[strtoupper($symbol)] ?? [
            'symbol' => strtoupper($symbol),
            'name' => strtoupper($symbol) . ' Corp.',
            'price' => rand(50, 500) + (rand(0, 99) / 100),
            'change' => rand(-10, 10) + (rand(0, 99) / 100),
            'changePercent' => rand(-5, 5) + (rand(0, 99) / 100),
            'volume' => rand(1000000, 50000000)
        ];
    }
    
    private function getDemoSearchResults($query) {
        $allStocks = [
            ['symbol' => 'AAPL', 'name' => 'Apple Inc.', 'exchange' => 'NASDAQ'],
            ['symbol' => 'GOOGL', 'name' => 'Alphabet Inc.', 'exchange' => 'NASDAQ'],
            ['symbol' => 'MSFT', 'name' => 'Microsoft Corporation', 'exchange' => 'NASDAQ'],
            ['symbol' => 'TSLA', 'name' => 'Tesla Inc.', 'exchange' => 'NASDAQ'],
            ['symbol' => 'AMZN', 'name' => 'Amazon.com Inc.', 'exchange' => 'NASDAQ'],
            ['symbol' => 'META', 'name' => 'Meta Platforms Inc.', 'exchange' => 'NASDAQ'],
            ['symbol' => 'NVDA', 'name' => 'NVIDIA Corporation', 'exchange' => 'NASDAQ'],
            ['symbol' => 'NFLX', 'name' => 'Netflix Inc.', 'exchange' => 'NASDAQ']
        ];
        
        $query = strtolower($query);
        $results = array_filter($allStocks, function($stock) use ($query) {
            return strpos(strtolower($stock['symbol']), $query) !== false ||
                   strpos(strtolower($stock['name']), $query) !== false;
        });
        
        return array_values($results);
    }
}

// Handle the request
$api = new StockAPI();
$api->handleRequest();
?>
