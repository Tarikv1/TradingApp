# StockWizard 📈

A modern, responsive stock market tracking application built with HTML5, CSS3, Bootstrap 5, JavaScript, PHP, and Firebase.

## Features

- **User Authentication**: Sign up/sign in with email or social providers (Google, Apple)
- **Real-time Stock Data**: Integration with Marketstack API for live market data
- **Interactive Charts**: Beautiful charts powered by Chart.js
- **Portfolio Tracking**: Track your investments and performance
- **Watchlist**: Monitor your favorite stocks
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Dark Theme**: Modern dark UI design

## Tech Stack

### Frontend
- HTML5, CSS3, Bootstrap 5
- JavaScript (ES6+)
- Chart.js for data visualization
- Firebase Authentication

### Backend
- PHP 8.0+
- MySQL Database
- Marketstack API integration

### Mobile (Future)
- Flutter (Dart)
- charts_flutter
- Geolocator

## Setup Instructions

### Prerequisites
- PHP 8.0 or higher
- MySQL 5.7 or higher
- Web server (Apache/Nginx) or PHP built-in server
- Marketstack API key (free tier available)
- Firebase project (for authentication)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/stockwizard.git
   cd stockwizard
   \`\`\`

2. **Configure Database**
   - Create a MySQL database named `stockwizard`
   - Update database credentials in `api/config.php`

3. **Configure APIs**
   - Get your Marketstack API key from [marketstack.com](https://marketstack.com/)
   - Update `APIConfig::MARKETSTACK_API_KEY` in `api/config.php`
   - Update `js/marketstack.js` with your API key

4. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
   - Enable Authentication and choose your sign-in methods
   - Update Firebase configuration in `index.html`

5. **Start the Development Server**
   \`\`\`bash
   php -S localhost:8000
   \`\`\`

6. **Access the Application**
   Open your browser and navigate to `http://localhost:8000`

## API Endpoints

### Stock Data
- `GET /api/stocks.php/quote?symbol=AAPL` - Get stock quote
- `GET /api/stocks.php/search?q=apple` - Search stocks
- `GET /api/stocks.php/watchlist?user_id=USER_ID` - Get user watchlist
- `POST /api/stocks.php/watchlist` - Add stock to watchlist
- `GET /api/stocks.php/portfolio?user_id=USER_ID` - Get user portfolio
- `POST /api/stocks.php/portfolio` - Add stock to portfolio

## File Structure

\`\`\`
stockwizard/
├── index.html              # Main application file
├── css/
│   └── style.css          # Custom styles
├── js/
│   ├── app.js             # Main application logic
│   └── marketstack.js     # Marketstack API integration
├── api/
│   ├── config.php         # Database and API configuration
│   └── stocks.php         # Stock API endpoints
├── assets/
│   └── icons/             # Application icons
├── package.json           # Project metadata
└── README.md             # This file
\`\`\`

## Features in Detail

### Authentication
- Email/password authentication
- Google OAuth integration
- Apple Sign-In support
- Secure session management with Firebase

### Stock Data
- Real-time stock quotes
- Historical price data
- Stock search functionality
- Market indices tracking
- Caching for improved performance

### Portfolio Management
- Add/remove stocks from portfolio
- Track purchase prices and dates
- Calculate gains/losses
- Portfolio performance metrics

### Watchlist
- Add stocks to watchlist
- Real-time price updates
- Quick access to favorite stocks

### Charts and Visualization
- Interactive price charts
- Portfolio performance charts
- Market overview charts
- Responsive chart design

## Configuration

### Marketstack API
1. Sign up at [marketstack.com](https://marketstack.com/)
2. Get your free API key
3. Update the API key in:
   - `api/config.php` (line 25)
   - `js/marketstack.js` (line 6)

### Firebase Setup
1. Create a new Firebase project
2. Enable Authentication
3. Add your domain to authorized domains
4. Copy your Firebase config and update `index.html`

### Database Schema
The application automatically creates the required database tables:
- `users` - User information
- `watchlist` - User watchlists
- `portfolio` - User portfolios
- `stock_cache` - API response caching

## Development

### Running in Development Mode
\`\`\`bash
npm run dev
# or
php -S localhost:8000
\`\`\`

### Building for Production
\`\`\`bash
npm run build
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@stockwizard.com or create an issue on GitHub.

## Roadmap

- [ ] Mobile app development with Flutter
- [ ] Advanced charting features
- [ ] News integration
- [ ] Social trading features
- [ ] Options and futures tracking
- [ ] Cryptocurrency support
- [ ] Advanced portfolio analytics
- [ ] Push notifications
- [ ] Dark/light theme toggle
- [ ] Multi-language support

## Acknowledgments

- [Marketstack](https://marketstack.com/) for stock market data
- [Firebase](https://firebase.google.com/) for authentication
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [Bootstrap](https://getbootstrap.com/) for responsive design
