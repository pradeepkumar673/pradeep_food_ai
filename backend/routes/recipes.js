const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize APIs
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

// Initialize Gemini AI
let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_REAL_GEMINI_KEY_HERE') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized successfully');
  } catch (error) {
    console.error('❌ Gemini AI initialization failed:', error.message);
  }
}

// Cache
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Helper functions
const normalizeIngredient = (ingredient) => {
  return ingredient.toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(?:chopped|diced|sliced|minced|grated|fresh|dried|ground|powdered)\b/gi, '')
    .trim();
};

// Calculate match percentage
const calculateMatchPercentage = (userIngredients, recipeIngredients) => {
  if (!recipeIngredients || recipeIngredients.length === 0) return 0;
  
  const userIngSet = new Set(userIngredients.map(normalizeIngredient));
  const recipeIngSet = new Set(recipeIngredients.map(normalizeIngredient));
  
  let matchCount = 0;
  recipeIngSet.forEach(recipeIng => {
    if (userIngSet.has(recipeIng)) {
      matchCount++;
    } else {
      for (const userIng of userIngSet) {
        if (recipeIng.includes(userIng) || userIng.includes(recipeIng)) {
          matchCount += 0.5;
          break;
        }
      }
    }
  });
  
  const percentage = Math.round((matchCount / recipeIngSet.size) * 100);
  return Math.min(Math.max(percentage, 0), 100);
};

// Generate AI recipes (FIXED MODEL NAME)
const generateAIRecipe = async (ingredients, filter = null) => {
  if (!genAI) return null;
  
  try {
    // Use the correct model name for your API version
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Updated model name
    
    const prompt = `Create a simple recipe using ONLY these ingredients: ${ingredients.join(', ')}. 
    ${filter ? `Make it ${filter}.` : ''}
    
    Format response as JSON with:
    - title
    - description
    - prepTime (in minutes)
    - servings
    - instructions (array of steps)
    - tips (optional)`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (jsonError) {
      console.log('JSON parsing failed, creating from text');
    }
    
    // Fallback if JSON parsing fails
    return {
      title: `Simple ${ingredients[0] || 'Ingredient'} Recipe`,
      description: `Made with ${ingredients.join(', ')}`,
      prepTime: 20,
      servings: 2,
      instructions: [
        `Prepare ${ingredients.join(' and ')}`,
        'Combine all ingredients',
        'Mix well and serve'
      ]
    };
  } catch (error) {
    console.error('AI generation error details:', error.message);
    return null;
  }
};

// Simple fallback recipes database
const FALLBACK_RECIPES = {
  // Recipes for common ingredient combinations
  'pasta,egg': [
    {
      id: 1001,
      title: "Spaghetti Carbonara",
      description: "Classic Italian pasta with eggs and cheese",
      image: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=312&h=231&fit=crop",
      prepTime: 20,
      servings: 2,
      matchPercentage: 95,
      ingredients: ["pasta", "egg", "cheese", "black pepper"],
      instructions: ["Cook pasta", "Mix egg and cheese", "Combine with hot pasta", "Add pepper"]
    },
    {
      id: 1002,
      title: "Pasta with Fried Egg",
      description: "Simple protein-packed meal",
      image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 1,
      matchPercentage: 90,
      ingredients: ["pasta", "egg", "oil", "salt"],
      instructions: ["Cook pasta", "Fry egg", "Combine", "Season with salt"]
    }
  ],
  'rice,egg': [
    {
      id: 1003,
      title: "Egg Fried Rice",
      description: "Quick and easy fried rice",
      image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 2,
      matchPercentage: 95,
      ingredients: ["rice", "egg", "oil", "soy sauce"],
      instructions: ["Cook rice", "Scramble egg", "Combine and fry", "Add soy sauce"]
    }
  ],
  'chicken,rice': [
    {
      id: 1004,
      title: "Chicken and Rice",
      description: "Simple protein and carb combo",
      image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=312&h=231&fit=crop",
      prepTime: 30,
      servings: 2,
      matchPercentage: 90,
      ingredients: ["chicken", "rice", "salt", "pepper"],
      instructions: ["Cook rice", "Cook chicken", "Combine", "Season"]
    }
  ],
  'water,lemon,salt,strawberry': [
    {
      id: 1005,
      title: "Lemon-Strawberry Infused Water",
      description: "Refreshing infused water",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=312&h=231&fit=crop",
      prepTime: 5,
      servings: 4,
      matchPercentage: 100,
      ingredients: ["water", "lemon", "strawberry", "salt"],
      instructions: ["Slice lemon and strawberries", "Add to water with pinch of salt", "Refrigerate for 1 hour", "Serve chilled"]
    },
    {
      id: 1006,
      title: "Seasoned Lemon Wedges",
      description: "Tangy seasoned lemon snacks",
      image: "https://images.unsplash.com/photo-1574885788587-12d8c57dafda?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 2,
      matchPercentage: 100,
      ingredients: ["lemon", "salt"],
      instructions: ["Slice lemon into wedges", "Sprinkle with salt", "Let sit for 5 minutes", "Serve as snack"]
    }
  ]
};

// GET /api/recipes/search - MAIN ENDPOINT
router.get('/search', async (req, res) => {
  try {
    const { ingredients, filter, number = 10 } = req.query;
    
    if (!ingredients) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients parameter is required'
      });
    }

    // Parse ingredients
    const ingredientsArray = ingredients.split(',').map(i => i.trim()).filter(i => i);
    const normalizedIngredients = ingredientsArray.map(normalizeIngredient);
    const ingredientsKey = normalizedIngredients.join(',');
    
    console.log(`🔍 Searching recipes for: ${ingredientsKey}`);
    
    let recipes = [];
    let usingFallback = false;
    let source = 'spoonacular';
    
    // ====== TRY SPOONACULAR API (If key is valid) ======
    if (SPOONACULAR_API_KEY && SPOONACULAR_API_KEY !== 'YOUR_REAL_SPOONACULAR_KEY_HERE') {
      try {
        console.log('📡 Calling Spoonacular API...');
        
        const params = {
          apiKey: SPOONACULAR_API_KEY,
          ingredients: normalizedIngredients.join(','),
          number: 5,
          ranking: 2,
          ignorePantry: true
        };
        
        // Add filters
        if (filter) {
          switch(filter) {
            case 'quick': params.maxReadyTime = 30; break;
            case 'healthy': params.maxCalories = 500; break;
            case 'vegetarian': params.diet = 'vegetarian'; break;
          }
        }
        
        const response = await axios.get(
          `${SPOONACULAR_BASE_URL}/recipes/findByIngredients`,
          { params, timeout: 8000 }
        );
        
        if (response.data && response.data.length > 0) {
          console.log(`✅ Spoonacular returned ${response.data.length} recipes`);
          
          // Process Spoonacular recipes
          recipes = response.data.map(recipe => {
            const usedIngs = (recipe.usedIngredients || []).map(i => i.name.toLowerCase());
            const missedIngs = (recipe.missedIngredients || []).map(i => i.name.toLowerCase());
            const allRecipeIngredients = [...usedIngs, ...missedIngs];
            
            const matchPercentage = calculateMatchPercentage(normalizedIngredients, allRecipeIngredients);
            
            // Only include if good match
            if (matchPercentage < 50) return null;
            
            return {
              id: recipe.id,
              title: recipe.title,
              image: recipe.image || `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
              readyInMinutes: 30,
              servings: recipe.servings || 4,
              matchPercentage,
              cheap: false,
              dairyFree: false,
              glutenFree: false,
              vegan: false,
              vegetarian: recipe.vegetarian || false,
              veryHealthy: false,
              veryPopular: false,
              summary: `Uses ${recipe.usedIngredientCount || 0} of your ingredients.`,
              source: 'spoonacular',
              usedIngredients: recipe.usedIngredientCount || 0,
              missedIngredients: recipe.missedIngredientCount || 0
            };
          }).filter(recipe => recipe !== null);
          
          if (recipes.length > 0) {
            recipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
          }
        }
        
      } catch (spoonacularError) {
        console.log(`❌ Spoonacular API error: ${spoonacularError.message}`);
        
        // Check if it's an authentication error
        if (spoonacularError.response && spoonacularError.response.status === 401) {
          console.log('⚠️ Spoonacular API key appears invalid');
        }
      }
    } else {
      console.log('⚠️ Spoonacular API key not configured or using placeholder');
    }
    
    // ====== IF NO SPOONACULAR RESULTS, USE FALLBACK ======
    if (recipes.length === 0) {
      usingFallback = true;
      source = 'fallback';
      
      console.log('📋 Using fallback recipes...');
      
      // Try to get pre-defined fallback recipes
      let fallbackRecipes = [];
      
      // Check for exact match in fallback database
      if (FALLBACK_RECIPES[ingredientsKey]) {
        fallbackRecipes = FALLBACK_RECIPES[ingredientsKey];
      } else {
        // Try partial matches
        for (const [key, recipeList] of Object.entries(FALLBACK_RECIPES)) {
          const keyIngredients = key.split(',');
          const commonIngredients = normalizedIngredients.filter(ing => 
            keyIngredients.some(keyIng => keyIng.includes(ing) || ing.includes(keyIng))
          );
          
          if (commonIngredients.length >= Math.min(normalizedIngredients.length, keyIngredients.length) - 1) {
            fallbackRecipes = [...fallbackRecipes, ...recipeList];
          }
        }
      }
      
      // If still no recipes, generate simple ones
      if (fallbackRecipes.length === 0) {
        fallbackRecipes = normalizedIngredients.map((ingredient, index) => ({
          id: 2000 + index,
          title: `${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)} Simple Preparation`,
          description: `Easy way to use ${ingredient}`,
          image: `https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80`,
          prepTime: 10,
          servings: 1,
          matchPercentage: 95,
          ingredients: [ingredient],
          instructions: [`Prepare ${ingredient}`, 'Season to taste', 'Serve']
        }));
      }
      
      // Convert to standard format
      recipes = fallbackRecipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image || `https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80`,
        readyInMinutes: recipe.prepTime || 15,
        servings: recipe.servings || 2,
        matchPercentage: recipe.matchPercentage || 85,
        cheap: true,
        dairyFree: true,
        glutenFree: true,
        vegan: true,
        vegetarian: true,
        veryHealthy: true,
        veryPopular: false,
        summary: recipe.description || `Simple preparation using ${normalizedIngredients.join(', ')}`,
        source: 'fallback'
      }));
    }
    
    // ====== TRY AI AS LAST RESORT (only if we have Gemini and want alternative) ======
    if (recipes.length === 0 && genAI && normalizedIngredients.length > 0) {
      try {
        console.log('🤖 Trying AI generation...');
        const aiRecipe = await generateAIRecipe(normalizedIngredients, filter);
        
        if (aiRecipe) {
          recipes = [{
            id: 3000,
            title: aiRecipe.title || "AI Generated Recipe",
            image: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
            readyInMinutes: aiRecipe.prepTime || 20,
            servings: aiRecipe.servings || 2,
            matchPercentage: 90,
            cheap: true,
            dairyFree: true,
            glutenFree: true,
            vegan: true,
            vegetarian: true,
            veryHealthy: true,
            veryPopular: false,
            summary: aiRecipe.description || `AI-generated recipe using ${normalizedIngredients.join(', ')}`,
            source: 'ai_generated'
          }];
          source = 'ai';
        }
      } catch (aiError) {
        console.log('⚠️ AI generation skipped or failed');
      }
    }
    
    // Limit results
    const finalRecipes = recipes.slice(0, Math.min(number, 15));
    
    const result = {
      success: true,
      count: finalRecipes.length,
      ingredients: ingredientsArray,
      source: source,
      usingFallback: usingFallback,
      recipes: finalRecipes,
      timestamp: new Date().toISOString(),
      message: usingFallback ? 
        "Using fallback recipes (API limit may be reached)" : 
        "Recipes fetched successfully"
    };
    
    console.log(`✅ Returning ${finalRecipes.length} recipes from ${source}`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Fatal error in search:', error);
    
    // Final emergency fallback
    const ingredientsArray = req.query.ingredients ? 
      req.query.ingredients.split(',').map(i => i.trim()).filter(i => i) : 
      ['food'];
    
    res.json({
      success: true,
      count: 3,
      ingredients: ingredientsArray,
      source: 'emergency',
      usingFallback: true,
      recipes: [
        {
          id: 9991,
          title: 'Quick Kitchen Creation',
          image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80',
          readyInMinutes: 20,
          servings: 2,
          matchPercentage: 80,
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: 'Create something delicious with what you have!',
          source: 'emergency'
        }
      ]
    });
  }
});

// GET /api/recipes/ingredients/suggest
router.get('/ingredients/suggest', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    // If we have Spoonacular API key, use it
    if (SPOONACULAR_API_KEY && SPOONACULAR_API_KEY !== 'YOUR_REAL_SPOONACULAR_KEY_HERE') {
      try {
        const response = await axios.get(
          `${SPOONACULAR_BASE_URL}/food/ingredients/autocomplete`,
          {
            params: {
              apiKey: SPOONACULAR_API_KEY,
              query: query,
              number: 8,
              metaInformation: false
            },
            timeout: 3000
          }
        );
        
        if (response.data && response.data.length > 0) {
          return res.json({
            success: true,
            suggestions: response.data.map(item => item.name)
          });
        }
      } catch (error) {
        console.log('Spoonacular suggestions API failed');
      }
    }
    
    // Fallback suggestions
    const popularIngredients = [
      'chicken', 'rice', 'pasta', 'tomato', 'onion', 'garlic', 'egg', 'cheese',
      'potato', 'carrot', 'broccoli', 'spinach', 'mushroom', 'bell pepper',
      'lemon', 'lime', 'ginger', 'soy sauce', 'olive oil', 'butter', 'milk',
      'flour', 'sugar', 'honey', 'bread', 'beans', 'lentils', 'tofu', 'fish',
      'salt', 'pepper', 'oil', 'water', 'strawberry', 'apple', 'banana',
      'chocolate', 'yogurt', 'cucumber', 'avocado', 'bacon', 'sausage'
    ];
    
    const filtered = popularIngredients
      .filter(ing => ing.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
    
    res.json({
      success: true,
      suggestions: filtered
    });
    
  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({ 
      success: true,
      suggestions: [] 
    });
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // If it's a fallback recipe ID
    if (id >= 1000 && id < 2000) {
      // Find in fallback recipes
      for (const recipes of Object.values(FALLBACK_RECIPES)) {
        const recipe = recipes.find(r => r.id === parseInt(id));
        if (recipe) {
          return res.json({
            success: true,
            recipe: {
              id: recipe.id,
              title: recipe.title,
              image: recipe.image,
              readyInMinutes: recipe.prepTime || 20,
              servings: recipe.servings || 2,
              summary: recipe.description,
              extendedIngredients: recipe.ingredients.map((ing, idx) => ({
                id: idx + 1,
                name: ing,
                original: ing,
                amount: 1,
                unit: 'as needed'
              })),
              analyzedInstructions: [{
                steps: recipe.instructions.map((step, idx) => ({
                  number: idx + 1,
                  step: step
                }))
              }],
              source: 'fallback'
            }
          });
        }
      }
    }
    
    // Try Spoonacular for detailed recipe
    if (SPOONACULAR_API_KEY && SPOONACULAR_API_KEY !== 'YOUR_REAL_SPOONACULAR_KEY_HERE') {
      try {
        const response = await axios.get(
          `${SPOONACULAR_BASE_URL}/recipes/${id}/information`,
          {
            params: {
              apiKey: SPOONACULAR_API_KEY,
              includeNutrition: false
            },
            timeout: 5000
          }
        );
        
        return res.json({
          success: true,
          recipe: response.data
        });
      } catch (error) {
        console.log('Spoonacular details failed');
      }
    }
    
    // Fallback details
    res.json({
      success: true,
      recipe: {
        id: parseInt(id),
        title: 'Recipe Details',
        image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=556&h=370&fit=crop&q=80',
        readyInMinutes: 30,
        servings: 4,
        summary: 'Detailed recipe instructions',
        extendedIngredients: [
          { id: 1, name: 'ingredients', original: 'Your ingredients', amount: 1, unit: 'portion' }
        ],
        analyzedInstructions: [{
          steps: [
            { number: 1, step: 'Prepare your ingredients' },
            { number: 2, step: 'Combine and cook as desired' },
            { number: 3, step: 'Season to taste' },
            { number: 4, step: 'Serve and enjoy' }
          ]
        }],
        source: 'fallback'
      }
    });
    
  } catch (error) {
    console.error('Error in recipe details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipe details'
    });
  }
});

module.exports = router;