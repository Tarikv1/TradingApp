<?php
// Database configuration for StockWizard
// This file handles database connections and API configurations

class DatabaseConfig {
    private $host = 'localhost';
    private $dbname = 'stockwizard';
    private $username = 'root';
    private $password = '';
    private $pdo;
    
    public function __construct() {
        $this->connect();
    }
    
    private function connect() {
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4";
            $this->pdo = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

// API Configuration
class APIConfig {
    const MARKETSTACK_API_KEY = 'YOUR_MARKETSTACK_API_KEY';
    const MARKETSTACK_BASE_URL = 'http://api.marketstack.com/v1';
    
    // Firebase configuration (if using PHP Firebase SDK)
    const FIREBASE_PROJECT_ID = 'stockwizard-demo';
    const FIREBASE_API_KEY = 'demo-api-key';
    
    // CORS headers for API responses
    public static function setCORSHeaders() {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Content-Type: application/json');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }
    
    // Response helper
    public static function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit();
    }
    
    // Error response helper
    public static function errorResponse($message, $status = 400) {
        self::jsonResponse(['error' => $message], $status);
    }
}

// Database schema setup
function setupDatabase() {
    try {
        $db = new DatabaseConfig();
        $pdo = $db->getConnection();
        
        // Users table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                firebase_uid VARCHAR(255) UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                display_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        ");
        
        // Watchlist table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS watchlist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                symbol VARCHAR(10) NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_symbol (user_id, symbol)
            )
        ");
        
        // Portfolio table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS portfolio (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                symbol VARCHAR(10) NOT NULL,
                shares DECIMAL(10, 4) NOT NULL,
                purchase_price DECIMAL(10, 2) NOT NULL,
                purchase_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ");
        
        // Stock cache table for API responses
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS stock_cache (
                id INT AUTO_INCREMENT PRIMARY KEY,
                symbol VARCHAR(10) NOT NULL,
                data JSON NOT NULL,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                INDEX idx_symbol_expires (symbol, expires_at)
            )
        ");
        
        return true;
    } catch (Exception $e) {
        error_log("Database setup failed: " . $e->getMessage());
        return false;
    }
}

// Initialize database if needed
if (!file_exists('database_initialized.flag')) {
    if (setupDatabase()) {
        file_put_contents('database_initialized.flag', date('Y-m-d H:i:s'));
    }
}
?>
