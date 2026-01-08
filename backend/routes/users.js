const express = require('express');
const router = express.Router();

// Mock database
const users = [];

// Middleware to authenticate user
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // In production, verify JWT token
  // For now, we'll use a simple mock
  const userId = parseInt(token);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid user'
    });
  }
  
  req.user = user;
  next();
};

// Get user favorites
router.get('/favorites', authenticate, (req, res) => {
  res.json({
    success: true,
    favorites: req.user.favorites || []
  });
});

// Add to favorites
router.post('/favorites', authenticate, (req, res) => {
  try {
    const { recipe } = req.body;
    
    if (!recipe || !recipe.id) {
      return res.status(400).json({
        success: false,
        error: 'Recipe data is required'
      });
    }
    
    // Check if already favorited
    const exists = req.user.favorites.some(fav => fav.id === recipe.id);
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Recipe already in favorites'
      });
    }
    
    req.user.favorites.push({
      ...recipe,
      addedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Added to favorites',
      favorites: req.user.favorites
    });
    
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite'
    });
  }
});

// Remove from favorites
router.delete('/favorites/:recipeId', authenticate, (req, res) => {
  try {
    const { recipeId } = req.params;
    
    req.user.favorites = req.user.favorites.filter(fav => fav.id !== parseInt(recipeId));
    
    res.json({
      success: true,
      message: 'Removed from favorites',
      favorites: req.user.favorites
    });
    
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite'
    });
  }
});

// Get meal plans
router.get('/meal-plans', authenticate, (req, res) => {
  res.json({
    success: true,
    mealPlans: req.user.mealPlans || {}
  });
});

// Save meal plan
router.post('/meal-plans', authenticate, (req, res) => {
  try {
    const { week, meals } = req.body;
    
    if (!week || !meals) {
      return res.status(400).json({
        success: false,
        error: 'Week and meals data required'
      });
    }
    
    req.user.mealPlans[week] = {
      meals,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Meal plan saved',
      mealPlans: req.user.mealPlans
    });
    
  } catch (error) {
    console.error('Error saving meal plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save meal plan'
    });
  }
});

module.exports = router;