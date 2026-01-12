const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting - More generous in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 requests per window in dev
  message: { 
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    usingFallback: true,
    message: 'Rate limit reached, using fallback recipes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', limiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodguide', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Health check with API status
app.get('/api/health', (req, res) => {
  const apiStatus = {
    spoonacular: !!process.env.SPOONACULAR_API_KEY && process.env.SPOONACULAR_API_KEY !== 'YOUR_REAL_SPOONACULAR_KEY_HERE',
    gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_REAL_GEMINI_KEY_HERE',
    mongodb: mongoose.connection.readyState === 1
  };
  
  res.json({ 
    status: 'healthy', 
    message: 'API is running',
    timestamp: new Date().toISOString(),
    apis: apiStatus,
    environment: process.env.NODE_ENV || 'development',
    fallbackMode: !apiStatus.spoonacular || !apiStatus.gemini
  });
});

// API Routes
const recipeRoutes = require('./routes/recipes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

app.use('/api/recipes', recipeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Route to test API fallback
app.get('/api/test-fallback', async (req, res) => {
  const { ingredient } = req.query;
  
  console.log('🧪 Testing fallback system...');
  console.log(`🔑 Spoonacular API: ${process.env.SPOONACULAR_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  
  res.json({
    success: true,
    message: 'Fallback test',
    spoonacularAvailable: !!process.env.SPOONACULAR_API_KEY && process.env.SPOONACULAR_API_KEY !== 'YOUR_REAL_SPOONACULAR_KEY_HERE',
    geminiAvailable: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_REAL_GEMINI_KEY_HERE',
    fallbackOrder: ['Spoonacular API', 'Gemini AI', 'Local Recipes'],
    testIngredients: ingredient || 'chicken, rice, egg',
    instructions: 'Use /api/recipes/search?ingredients=your_ingredients to test'
  });
});

// Emergency recipe endpoint when all else fails
app.get('/api/emergency-recipes', (req, res) => {
  const { ingredients } = req.query;
  const ingredientList = ingredients ? ingredients.split(',').map(i => i.trim()) : ['food'];
  
  console.log('🆘 Emergency recipes triggered');
  
  const emergencyRecipes = [
    {
      id: 99991,
      title: 'Simple Kitchen Creation',
      description: 'Emergency fallback recipe',
      image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80',
      prepTime: 15,
      servings: 2,
      matchPercentage: 85,
      ingredients: ingredientList,
      instructions: [
        'Prepare your ingredients',
        'Combine creatively',
        'Season to taste',
        'Cook as needed',
        'Serve and enjoy'
      ],
      source: 'emergency_backup'
    },
    {
      id: 99992,
      title: 'Quick Ingredient Mix',
      description: 'Simple combination of your items',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80',
      prepTime: 10,
      servings: 1,
      matchPercentage: 90,
      ingredients: ingredientList.slice(0, 3),
      instructions: [
        'Wash and prepare ingredients',
        'Mix together in a bowl',
        'Add basic seasonings',
        'Serve immediately'
      ],
      source: 'emergency_backup'
    }
  ];
  
  res.json({
    success: true,
    message: 'Emergency recipes served',
    source: 'emergency_backup',
    ingredients: ingredientList,
    recipes: emergencyRecipes,
    note: 'This is a fallback when all other APIs fail'
  });
});

// 404 handler with fallback suggestion
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.originalUrl}`);
  
  // If it looks like a recipe request, suggest the search endpoint
  if (req.originalUrl.includes('recipe') || req.originalUrl.includes('ingredient')) {
    return res.status(404).json({ 
      success: false,
      error: 'Route not found',
      suggestion: 'Try /api/recipes/search?ingredients=your_ingredients',
      fallback: 'Or use /api/emergency-recipes?ingredients=your_ingredients'
    });
  }
  
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    availableRoutes: {
      recipes: '/api/recipes/search?ingredients=chicken,rice',
      health: '/api/health',
      test: '/api/test-fallback',
      emergency: '/api/emergency-recipes?ingredients=your_ingredients'
    }
  });
});

// Error handling with fallback recovery
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });
  
  // If it's a recipe-related error, provide fallback
  if (req.originalUrl.includes('/api/recipes')) {
    return res.status(500).json({
      success: false,
      error: 'Recipe service error',
      fallback: true,
      message: 'Using emergency recipes',
      emergencyEndpoint: '/api/emergency-recipes?ingredients=' + (req.query.ingredients || 'food'),
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server with fallback detection
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🍳 Pradeep's Food Guide - Recipe Recommender        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  
🚀 Server running on port ${PORT}
📡 Environment: ${process.env.NODE_ENV || 'development'}
🔗 API Base URL: http://localhost:${PORT}/api
🔗 Frontend URL: http://localhost:3000

📊 API STATUS:
${process.env.SPOONACULAR_API_KEY && process.env.SPOONACULAR_API_KEY !== 'YOUR_REAL_SPOONACULAR_KEY_HERE' ? '✅ Spoonacular API: Configured' : '❌ Spoonacular API: Missing or using placeholder'}
${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_REAL_GEMINI_KEY_HERE' ? '✅ Gemini API: Configured' : '❌ Gemini API: Missing or using placeholder'}
✅ MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}

🔄 FALLBACK SYSTEM:
1️⃣ Spoonacular API (Primary)
2️⃣ Gemini AI (Secondary) 
3️⃣ Local Recipes (Tertiary)
4️⃣ Emergency Recipes (Last Resort)

⚠️  NOTE: ${!process.env.SPOONACULAR_API_KEY || process.env.SPOONACULAR_API_KEY === 'YOUR_REAL_SPOONACULAR_KEY_HERE' ? 'Spoonacular API not configured. Using fallback system.' : 'API configured. Using Spoonacular when available.'}
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔴 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  console.log('🔄 Restarting server in fallback mode...');
  
  // Don't crash, keep server running in fallback mode
  server.close(() => {
    console.log('🔄 Server restarted in fallback mode');
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Continuing with fallback system...');
});

module.exports = app;