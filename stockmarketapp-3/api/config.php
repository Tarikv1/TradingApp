<?php
// Database configuration for StockWizard with Firebase integration
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
    
    // Firebase configuration
    const FIREBASE_PROJECT_ID = 'stock-market-app-56215';
    const FIREBASE_API_KEY = 'AIzaSyCVlSQati-LvVgwx-LSAv5JLUCNEHAYWt8';
    const FIREBASE_AUTH_DOMAIN = 'stock-market-app-56215.firebaseapp.com';
    
    // CORS headers for API responses
    public static function setCORSHeaders() {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Firebase-Auth');
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
    
    // Verify Firebase ID token
    public static function verifyFirebaseToken($idToken) {
        // In a production environment, you would verify the Firebase ID token
        // using the Firebase Admin SDK or by calling the Firebase Auth REST API
        // For now, we'll implement a basic verification
        
        if (empty($idToken)) {
            return false;
        }
        
        // This is a simplified verification - in production, use proper Firebase token verification
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (strpos($authHeader, 'Bearer ') === 0) {
            $token = substr($authHeader, 7);
            // Here you would verify the token with Firebase
            // For demo purposes, we'll accept any non-empty token
            return !empty($token);
        }
        
        return false;
    }
}

// Database schema setup with Firebase integration
function setupDatabase() {
    try {
        $db = new DatabaseConfig();
        $pdo = $db->getConnection();
        
        // Users table - now includes Firebase UID
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                firebase_uid VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                display_name VARCHAR(255),
                photo_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login_at TIMESTAMP NULL,
                INDEX idx_firebase_uid (firebase_uid),
                INDEX idx_email (email)
            )
        ");
        
        // User preferences table
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                theme VARCHAR(20) DEFAULT 'dark',
                notifications BOOLEAN DEFAULT TRUE,
                currency VARCHAR(3) DEFAULT 'USD',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
                UNIQUE KEY unique_user_symbol (user_id, symbol),
                INDEX idx_user_symbol (user_id, symbol)
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_portfolio (user_id, symbol)
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
        
        // User sessions table for additional security
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                session_token VARCHAR(255) NOT NULL,
                firebase_token_hash VARCHAR(255),
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_session_token (session_token),
                INDEX idx_user_sessions (user_id, expires_at)
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
        error_log("Database initialized successfully");
    } else {
        error_log("Database initialization failed");
    }
}

// Helper function to get user by Firebase UID
function getUserByFirebaseUID($firebaseUID) {
    try {
        $db = new DatabaseConfig();
        $pdo = $db->getConnection();
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE firebase_uid = ?");
        $stmt->execute([$firebaseUID]);
        
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log("Error getting user by Firebase UID: " . $e->getMessage());
        return false;
    }
}

// Helper function to create or update user from Firebase
function createOrUpdateFirebaseUser($firebaseUID, $email, $displayName = null, $photoURL = null) {
    try {
        $db = new DatabaseConfig();
        $pdo = $db->getConnection();
        
        // Check if user exists
        $existingUser = getUserByFirebaseUID($firebaseUID);
        
        if ($existingUser) {
            // Update existing user
            $stmt = $pdo->prepare("
                UPDATE users 
                SET email = ?, display_name = ?, photo_url = ?, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE firebase_uid = ?
            ");
            $stmt->execute([$email, $displayName, $photoURL, $firebaseUID]);
            
            return $existingUser['id'];
        } else {
            // Create new user
            $stmt = $pdo->prepare("
                INSERT INTO users (firebase_uid, email, display_name, photo_url, last_login_at) 
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$firebaseUID, $email, $displayName, $photoURL]);
            
            $userId = $pdo->lastInsertId();
            
            // Create default preferences
            $stmt = $pdo->prepare("
                INSERT INTO user_preferences (user_id) VALUES (?)
            ");
            $stmt->execute([$userId]);
            
            return $userId;
        }
    } catch (Exception $e) {
        error_log("Error creating/updating Firebase user: " . $e->getMessage());
        return false;
    }
}
?>
