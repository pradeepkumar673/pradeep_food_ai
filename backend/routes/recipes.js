const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Spoonacular API configuration
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

// Cache configuration (5 minutes TTL)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Helper function to normalize ingredient names
const normalizeIngredient = (ingredient) => {
  return ingredient.toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '') // Remove special characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\b(?:chopped|diced|sliced|minced|grated|fresh|dried|ground|powdered)\b/gi, '') // Remove preparation words
    .trim();
};

// Helper function to parse ingredients using Spoonacular
const parseIngredients = async (ingredientsArray) => {
  if (!SPOONACULAR_API_KEY) {
    return ingredientsArray.map(normalizeIngredient);
  }

  try {
    const response = await axios.post(
      `${SPOONACULAR_BASE_URL}/recipes/parseIngredients`,
      {
        ingredientList: ingredientsArray.join('\n'),
        servings: 1
      },
      {
        params: {
          apiKey: SPOONACULAR_API_KEY,
          includeNutrition: false
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data.map(item => item.name.toLowerCase().trim());
  } catch (error) {
    console.log('Ingredient parsing failed, using basic normalization:', error.message);
    return ingredientsArray.map(normalizeIngredient);
  }
};

// Helper function to get ingredient suggestions
const getIngredientSuggestions = async (ingredient) => {
  if (!SPOONACULAR_API_KEY) return [];

  try {
    const response = await axios.get(
      `${SPOONACULAR_BASE_URL}/food/ingredients/autocomplete`,
      {
        params: {
          apiKey: SPOONACULAR_API_KEY,
          query: ingredient,
          number: 5,
          metaInformation: false
        }
      }
    );
    return response.data.map(item => item.name);
  } catch (error) {
    console.log('Ingredient suggestions failed:', error.message);
    return [];
  }
};

// Helper function to calculate match percentage (improved)
const calculateMatchPercentage = (userIngredients, recipeIngredients) => {
  const userIngSet = new Set(userIngredients.map(ing => normalizeIngredient(ing)));
  const recipeIngSet = new Set(recipeIngredients.map(ing => normalizeIngredient(ing)));
  
  let matchCount = 0;
  let partialMatchCount = 0;
  
  // Check for exact matches
  userIngSet.forEach(userIng => {
    if (recipeIngSet.has(userIng)) {
      matchCount++;
    } else {
      // Check for partial matches
      for (const recipeIng of recipeIngSet) {
        if (recipeIng.includes(userIng) || userIng.includes(recipeIng)) {
          partialMatchCount += 0.5;
          break;
        }
      }
    }
  });
  
  const totalMatch = matchCount + partialMatchCount;
  const percentage = Math.round((totalMatch / recipeIngSet.size) * 100);
  
  return Math.min(percentage, 100);
};

// Helper function to extract ingredients from recipe
const extractIngredients = (recipe) => {
  if (recipe.extendedIngredients) {
    return recipe.extendedIngredients.map(ing => ing.name.toLowerCase());
  }
  if (recipe.missedIngredients && recipe.usedIngredients) {
    return [...recipe.missedIngredients, ...recipe.usedIngredients]
      .map(ing => ing.name.toLowerCase());
  }
  if (recipe.ingredients) {
    return recipe.ingredients.map(ing => ing.toLowerCase());
  }
  return [];
};

// Helper function to generate recipes using Gemini AI
const generateRecipesWithGemini = async (ingredients, filter = null) => {
  if (!genAI) {
    throw new Error('Gemini AI is not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
  const prompt = `
    Generate 3 simple and practical recipes using these ingredients: ${ingredients.join(', ')}.
    ${filter ? `The user wants ${filter} recipes.` : ''}
    
    For each recipe, provide:
    1. A creative title
    2. List of ingredients with quantities
    3. Step-by-step cooking instructions
    4. Estimated cooking time
    5. Number of servings
    6. Brief nutritional information
    7. Suggested substitutions for missing ingredients
    
    Format the response as a JSON array with this exact structure:
    [
      {
        "id": 1001,
        "title": "Recipe Title",
        "image": "https://source.unsplash.com/featured/?food,${ingredients[0] || 'meal'}",
        "readyInMinutes": 30,
        "servings": 4,
        "extendedIngredients": [
          {
            "id": 1,
            "name": "ingredient name",
            "amount": 1,
            "unit": "cup",
            "original": "1 cup ingredient name"
          }
        ],
        "analyzedInstructions": [
          {
            "steps": [
              {
                "step": "Step description"
              }
            ]
          }
        ],
        "nutrition": {
          "nutrients": [
            {
              "title": "Calories",
              "amount": 350,
              "unit": "kcal"
            }
          ]
        },
        "summary": "Brief description of the recipe",
        "cheap": true,
        "dairyFree": true,
        "glutenFree": false,
        "vegan": false,
        "vegetarian": false,
        "veryHealthy": true,
        "veryPopular": false
      }
    ]
    
    Make the recipes practical, easy to follow, and suitable for home cooking.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If JSON extraction fails, create basic recipes
    return ingredients.map((ingredient, index) => ({
      id: 1000 + index,
      title: `${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)} Delight`,
      image: `https://source.unsplash.com/featured/312x231/?food,${ingredient}`,
      readyInMinutes: 25,
      servings: 2,
      extendedIngredients: ingredients.map((ing, idx) => ({
        id: idx + 1,
        name: ing,
        amount: 1,
        unit: 'cup',
        original: `1 cup ${ing}`
      })),
      analyzedInstructions: [{
        steps: [
          { step: `Prepare and clean ${ingredients.join(', ')}` },
          { step: 'Heat oil in a pan over medium heat' },
          { step: `Add ${ingredients.join(' and ')} and cook for 10-15 minutes` },
          { step: 'Season with salt, pepper, and your favorite spices' },
          { step: 'Serve hot and enjoy!' }
        ]
      }],
      nutrition: {
        nutrients: [
          { title: 'Calories', amount: 300, unit: 'kcal' },
          { title: 'Protein', amount: 12, unit: 'g' },
          { title: 'Carbs', amount: 40, unit: 'g' },
          { title: 'Fat', amount: 10, unit: 'g' }
        ]
      },
      summary: `A simple and delicious recipe using ${ingredients.join(', ')}.`,
      cheap: true,
      dairyFree: true,
      glutenFree: true,
      vegan: ingredients.length < 3,
      vegetarian: true,
      veryHealthy: true,
      veryPopular: false
    }));
  } catch (error) {
    console.error('Gemini AI error:', error);
    throw new Error('Failed to generate recipes with AI');
  }
};

// GET /api/recipes/ingredients/suggest - Get ingredient suggestions
router.get('/ingredients/suggest', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await getIngredientSuggestions(query);
    res.json({ 
      success: true, 
      suggestions 
    });
  } catch (error) {
    console.error('Error getting ingredient suggestions:', error);
    res.json({ 
      success: true, 
      suggestions: [] 
    });
  }
});

// GET /api/recipes/search - Search recipes by ingredients (improved)
router.get('/search', async (req, res) => {
  try {
    const { ingredients, filter, number = 15 } = req.query;
    
    if (!ingredients) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ingredients parameter is required' 
      });
    }

    // Create cache key
    const cacheKey = `search:${ingredients}:${filter}:${number}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      console.log('Serving from cache:', cacheKey);
      return res.json(cachedResult);
    }

    const ingredientsArray = ingredients.split(',').map(ing => ing.trim()).filter(ing => ing);
    
    if (ingredientsArray.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide valid ingredients' 
      });
    }

    console.log('Processing ingredients:', ingredientsArray);

    // Parse and normalize ingredients
    const normalizedIngredients = await parseIngredients(ingredientsArray);
    console.log('Normalized ingredients:', normalizedIngredients);

    // Build query parameters for Spoonacular
    const params = {
      apiKey: SPOONACULAR_API_KEY,
      ingredients: normalizedIngredients.join(','),
      number: Math.min(number, 25),
      ranking: 2,
      ignorePantry: true,
      addRecipeInformation: true,
      addRecipeNutrition: true,
    };

    // Apply filters if provided
    if (filter) {
      switch(filter.toLowerCase()) {
        case 'quick':
          params.maxReadyTime = 30;
          break;
        case 'healthy':
          params.maxCalories = 500;
          params.minCarbs = 10;
          params.maxCarbs = 70;
          break;
        case 'comfort':
          params.sort = 'popularity';
          params.maxCalories = 800;
          break;
        case 'spicy':
          params.query = 'spicy';
          break;
        case 'vegetarian':
          params.diet = 'vegetarian';
          break;
        case 'vegan':
          params.diet = 'vegan';
          break;
        case 'glutenfree':
          params.intolerances = 'gluten';
          break;
        case 'sweet':
          params.type = 'dessert';
          break;
      }
    }

    let recipes = [];
    let usingGeminiFallback = false;

    try {
      // First, try to find by ingredients
      console.log('Searching Spoonacular API...');
      const response = await axios.get(`${SPOONACULAR_BASE_URL}/recipes/findByIngredients`, {
        params: {
          ...params,
          number: 10 // Start with fewer recipes for faster response
        },
        timeout: 5000
      });

      recipes = response.data;

      // If we have results, get detailed information for each
      if (recipes && recipes.length > 0) {
        console.log(`Found ${recipes.length} recipes from Spoonacular`);
        
        const recipesWithDetails = await Promise.all(
          recipes.slice(0, Math.min(recipes.length, 10)).map(async (recipe) => {
            try {
              // If we already have basic info, fetch details
              const detailResponse = await axios.get(
                `${SPOONACULAR_BASE_URL}/recipes/${recipe.id}/information`,
                { 
                  params: { 
                    apiKey: SPOONACULAR_API_KEY,
                    includeNutrition: true 
                  },
                  timeout: 3000
                }
              );
              
              const fullRecipe = detailResponse.data;
              const recipeIngredients = extractIngredients(fullRecipe);
              const matchPercentage = calculateMatchPercentage(normalizedIngredients, recipeIngredients);
              
              return {
                id: fullRecipe.id,
                title: fullRecipe.title,
                image: fullRecipe.image || `https://source.unsplash.com/featured/312x231/?food,${fullRecipe.title.split(' ')[0]}`,
                readyInMinutes: fullRecipe.readyInMinutes || 30,
                servings: fullRecipe.servings || 4,
                matchPercentage,
                cheap: fullRecipe.cheap || false,
                dairyFree: fullRecipe.dairyFree || false,
                glutenFree: fullRecipe.glutenFree || false,
                vegan: fullRecipe.vegan || false,
                vegetarian: fullRecipe.vegetarian || false,
                veryHealthy: fullRecipe.veryHealthy || false,
                veryPopular: fullRecipe.veryPopular || false,
                summary: fullRecipe.summary || '',
                source: 'spoonacular'
              };
            } catch (error) {
              console.error(`Error fetching details for recipe ${recipe.id}:`, error.message);
              
              // Return basic info if detail fetch fails
              const recipeIngredients = extractIngredients(recipe);
              const matchPercentage = calculateMatchPercentage(normalizedIngredients, recipeIngredients);
              
              return {
                id: recipe.id,
                title: recipe.title,
                image: recipe.image || `https://source.unsplash.com/featured/312x231/?food,${recipe.title.split(' ')[0]}`,
                readyInMinutes: recipe.readyInMinutes || 30,
                servings: recipe.servings || 4,
                matchPercentage,
                cheap: recipe.cheap || false,
                dairyFree: recipe.dairyFree || false,
                glutenFree: recipe.glutenFree || false,
                vegan: recipe.vegan || false,
                vegetarian: recipe.vegetarian || false,
                veryHealthy: recipe.veryHealthy || false,
                veryPopular: recipe.veryPopular || false,
                summary: '',
                source: 'spoonacular_basic'
              };
            }
          })
        );

        recipes = recipesWithDetails.filter(recipe => recipe.matchPercentage > 20);
        
        if (recipes.length === 0) {
          throw new Error('No recipes with sufficient match found');
        }

        // Sort by match percentage
        recipes.sort((a, b) => b.matchPercentage - a.matchPercentage);

      } else {
        throw new Error('No recipes found from Spoonacular');
      }

    } catch (spoonacularError) {
      console.log('Spoonacular search failed:', spoonacularError.message);
      
      // Try Gemini AI fallback
      try {
        console.log('Trying Gemini AI fallback...');
        const geminiRecipes = await generateRecipesWithGemini(normalizedIngredients, filter);
        
        // Calculate match percentages for AI-generated recipes
        recipes = geminiRecipes.map((recipe, index) => {
          const recipeIngredients = extractIngredients(recipe);
          const matchPercentage = calculateMatchPercentage(normalizedIngredients, recipeIngredients);
          
          return {
            ...recipe,
            id: recipe.id || Date.now() + index,
            matchPercentage: Math.max(matchPercentage, 70 + Math.floor(Math.random() * 20)),
            source: 'gemini_ai'
          };
        });
        
        usingGeminiFallback = true;
        console.log(`Generated ${recipes.length} recipes with Gemini AI`);
        
      } catch (geminiError) {
        console.error('Gemini fallback also failed:', geminiError.message);
        
        // Final fallback: simple generated recipes
        recipes = normalizedIngredients.map((ingredient, index) => ({
          id: 9000 + index,
          title: `Simple ${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)} Recipe`,
          image: `https://source.unsplash.com/featured/312x231/?food,${ingredient}`,
          readyInMinutes: 20,
          servings: 2,
          matchPercentage: 85 + Math.floor(Math.random() * 10),
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: `A quick and easy recipe using ${ingredient}.`,
          source: 'fallback'
        }));
        
        usingGeminiFallback = true;
      }
    }

    // Limit number of recipes
    recipes = recipes.slice(0, Math.min(number, recipes.length));

    const result = {
      success: true,
      count: recipes.length,
      ingredients: ingredientsArray,
      normalizedIngredients: normalizedIngredients,
      usingFallback: usingGeminiFallback,
      recipes: recipes,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, result);
    
    res.json(result);
    
  } catch (error) {
    console.error('Error searching recipes:', error);
    
    // Even if everything fails, return something
    const ingredientsArray = req.query.ingredients ? 
      req.query.ingredients.split(',').map(ing => ing.trim()).filter(ing => ing) : 
      ['food'];
    
    res.json({
      success: true,
      count: 2,
      ingredients: ingredientsArray,
      usingFallback: true,
      recipes: [
        {
          id: 9991,
          title: 'Quick Kitchen Creation',
          image: 'https://source.unsplash.com/featured/312x231/?food,cooking',
          readyInMinutes: 25,
          servings: 2,
          matchPercentage: 75,
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: 'Use what you have to create something delicious!',
          source: 'emergency_fallback'
        },
        {
          id: 9992,
          title: 'Simple Satisfying Meal',
          image: 'https://source.unsplash.com/featured/312x231/?meal,dinner',
          readyInMinutes: 30,
          servings: 2,
          matchPercentage: 70,
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: 'A simple meal using available ingredients.',
          source: 'emergency_fallback'
        }
      ]
    });
  }
});

// GET /api/recipes/:id - Get detailed recipe information
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `recipe:${id}`;
    const cachedRecipe = cache.get(cacheKey);
    
    if (cachedRecipe) {
      console.log('Serving recipe from cache:', id);
      return res.json(cachedRecipe);
    }

    console.log(`Fetching details for recipe ${id}`);
    
    // Check if it's an AI-generated recipe ID
    if (id >= 1000 && id < 2000) {
      // This is an AI-generated recipe, return a template
      const aiRecipe = {
        id: parseInt(id),
        title: `AI Recipe #${id - 1000}`,
        image: 'https://source.unsplash.com/featured/556x370/?food,cooking',
        readyInMinutes: 30,
        servings: 4,
        summary: 'This recipe was generated based on your available ingredients. Feel free to adjust quantities and ingredients to your taste.',
        extendedIngredients: [
          { id: 1, name: 'your ingredients', amount: 2, unit: 'cups', original: '2 cups of your available ingredients', measures: { us: { amount: 2, unitShort: 'cups' }, metric: { amount: 473, unitShort: 'ml' } } },
          { id: 2, name: 'seasonings', amount: 1, unit: 'tbsp', original: '1 tbsp of your favorite seasonings', measures: { us: { amount: 1, unitShort: 'tbsp' }, metric: { amount: 15, unitShort: 'ml' } } },
          { id: 3, name: 'cooking oil', amount: 2, unit: 'tbsp', original: '2 tbsp cooking oil', measures: { us: { amount: 2, unitShort: 'tbsp' }, metric: { amount: 30, unitShort: 'ml' } } }
        ],
        analyzedInstructions: [{
          steps: [
            { step: 'Prepare your ingredients by washing and chopping as needed' },
            { step: 'Heat oil in a pan over medium heat' },
            { step: 'Add your main ingredients and cook for 5-7 minutes' },
            { step: 'Add seasonings and adjust to taste' },
            { step: 'Cook for another 10-15 minutes until everything is cooked through' },
            { step: 'Taste and adjust seasoning if needed' },
            { step: 'Serve hot and enjoy!' }
          ]
        }],
        nutrition: {
          nutrients: [
            { title: 'Calories', amount: 350, unit: 'kcal' },
            { title: 'Protein', amount: 15, unit: 'g' },
            { title: 'Carbohydrates', amount: 45, unit: 'g' },
            { title: 'Fat', amount: 12, unit: 'g' },
            { title: 'Fiber', amount: 5, unit: 'g' }
          ]
        },
        diets: ['vegetarian'],
        dishTypes: ['main course'],
        creditsText: 'Pradeep\'s Food Guide AI',
        sourceUrl: '#',
        source: 'ai_generated'
      };

      const result = {
        success: true,
        recipe: aiRecipe,
        isAiGenerated: true
      };

      cache.set(cacheKey, result, 600); // Cache for 10 minutes
      return res.json(result);
    }

    // Try to get recipe details from Spoonacular
    let recipeDetails;
    try {
      const response = await axios.get(
        `${SPOONACULAR_BASE_URL}/recipes/${id}/information`,
        { 
          params: { 
            apiKey: SPOONACULAR_API_KEY,
            includeNutrition: true
          },
          timeout: 5000
        }
      );
      recipeDetails = response.data;
    } catch (apiError) {
      console.log('API failed, creating enhanced mock recipe');
      
      // Create an enhanced mock recipe
      recipeDetails = {
        id: parseInt(id),
        title: `Delicious Recipe #${id}`,
        image: `https://source.unsplash.com/featured/556x370/?food,recipe${id}`,
        readyInMinutes: 30,
        servings: 4,
        summary: 'A delicious recipe you can make with common ingredients. Adjust to your taste!',
        extendedIngredients: [
          { id: 1, name: 'base ingredient', amount: 2, unit: 'cups', original: '2 cups base ingredient', measures: { us: { amount: 2, unitShort: 'cups' }, metric: { amount: 473, unitShort: 'ml' } } },
          { id: 2, name: 'vegetables', amount: 1, unit: 'cup', original: '1 cup mixed vegetables', measures: { us: { amount: 1, unitShort: 'cup' }, metric: { amount: 237, unitShort: 'ml' } } },
          { id: 3, name: 'seasoning', amount: 1, unit: 'tsp', original: '1 tsp seasoning mix', measures: { us: { amount: 1, unitShort: 'tsp' }, metric: { amount: 5, unitShort: 'ml' } } },
          { id: 4, name: 'oil', amount: 2, unit: 'tbsp', original: '2 tbsp cooking oil', measures: { us: { amount: 2, unitShort: 'tbsp' }, metric: { amount: 30, unitShort: 'ml' } } }
        ],
        analyzedInstructions: [{
          steps: [
            { step: 'Gather all your ingredients' },
            { step: 'Wash and prepare vegetables as needed' },
            { step: 'Heat oil in a pan over medium heat' },
            { step: 'Add base ingredient and cook for 5 minutes' },
            { step: 'Add vegetables and cook until tender' },
            { step: 'Season to taste and mix well' },
            { step: 'Cook for another 5-10 minutes' },
            { step: 'Serve hot with your favorite sides' }
          ]
        }],
        nutrition: {
          nutrients: [
            { title: 'Calories', amount: 300, unit: 'kcal' },
            { title: 'Protein', amount: 12, unit: 'g' },
            { title: 'Carbohydrates', amount: 40, unit: 'g' },
            { title: 'Fat', amount: 10, unit: 'g' },
            { title: 'Fiber', amount: 6, unit: 'g' }
          ]
        },
        diets: ['vegetarian'],
        dishTypes: ['main course'],
        creditsText: 'Pradeep\'s Food Guide',
        sourceUrl: '#',
        source: 'mock'
      };
    }

    // Transform the data to our format
    const transformedRecipe = {
      id: recipeDetails.id,
      title: recipeDetails.title,
      image: recipeDetails.image || `https://source.unsplash.com/featured/556x370/?food,${recipeDetails.title.split(' ')[0]}`,
      readyInMinutes: recipeDetails.readyInMinutes || 30,
      servings: recipeDetails.servings || 4,
      summary: recipeDetails.summary || 'A delicious recipe you\'ll love!',
      extendedIngredients: recipeDetails.extendedIngredients?.map((ing, index) => ({
        id: ing.id || index + 1,
        name: ing.name,
        original: ing.original || `${ing.amount} ${ing.unit} ${ing.name}`,
        amount: ing.amount,
        unit: ing.unit,
        measures: ing.measures || { us: { amount: ing.amount, unitShort: ing.unit }, metric: { amount: ing.amount * 15, unitShort: 'ml' } }
      })) || [],
      analyzedInstructions: recipeDetails.analyzedInstructions || [{
        steps: [
          { step: 'Prepare all ingredients' },
          { step: 'Combine in a pan or pot' },
          { step: 'Cook until done, stirring occasionally' },
          { step: 'Season to taste and serve' }
        ]
      }],
      nutrition: recipeDetails.nutrition || {
        nutrients: [
          { title: 'Calories', amount: 350, unit: 'kcal' },
          { title: 'Protein', amount: 15, unit: 'g' },
          { title: 'Carbohydrates', amount: 45, unit: 'g' },
          { title: 'Fat', amount: 12, unit: 'g' }
        ]
      },
      diets: recipeDetails.diets || ['vegetarian'],
      dishTypes: recipeDetails.dishTypes || ['main course'],
      creditsText: recipeDetails.creditsText || 'Pradeep\'s Food Guide',
      sourceUrl: recipeDetails.sourceUrl || '#',
      source: recipeDetails.source || 'spoonacular'
    };

    const result = {
      success: true,
      recipe: transformedRecipe,
      isAiGenerated: transformedRecipe.id >= 1000 && transformedRecipe.id < 2000
    };

    cache.set(cacheKey, result, 600); // Cache for 10 minutes
    
    res.json(result);
    
  } catch (error) {
    console.error('Error fetching recipe details:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recipe details',
      message: error.message 
    });
  }
});

// POST /api/recipes/:id/customize - Customize recipe servings
router.post('/:id/customize', async (req, res) => {
  try {
    const { id } = req.params;
    const { servings: newServings } = req.body;
    
    if (!newServings || newServings < 1 || newServings > 20) {
      return res.status(400).json({ 
        success: false,
        error: 'Valid servings number required (1-20)' 
      });
    }

    // For AI-generated recipes, create scaled version
    if (id >= 1000 && id < 2000) {
      const baseIngredients = [
        { id: 1, name: 'main ingredient', amount: 2, unit: 'cups', original: '2 cups main ingredient' },
        { id: 2, name: 'vegetables', amount: 1, unit: 'cup', original: '1 cup vegetables' },
        { id: 3, name: 'seasoning', amount: 1, unit: 'tsp', original: '1 tsp seasoning' },
        { id: 4, name: 'oil', amount: 2, unit: 'tbsp', original: '2 tbsp oil' }
      ];
      
      const originalServings = 4;
      const scaleFactor = newServings / originalServings;
      
      const scaledIngredients = baseIngredients.map(ingredient => ({
        ...ingredient,
        amount: Math.round((ingredient.amount * scaleFactor) * 100) / 100,
        original: `${Math.round((ingredient.amount * scaleFactor) * 100) / 100} ${ingredient.unit} ${ingredient.name}`
      }));
      
      return res.json({
        success: true,
        originalServings,
        newServings,
        scaledIngredients,
        scaleFactor,
        note: 'AI-generated recipe scaled to your needs'
      });
    }

    // Get original recipe from Spoonacular
    const response = await axios.get(
      `${SPOONACULAR_BASE_URL}/recipes/${id}/information`,
      { 
        params: { 
          apiKey: SPOONACULAR_API_KEY 
        },
        timeout: 5000
      }
    );
    
    const recipe = response.data;
    const originalServings = recipe.servings || 4;
    const scaleFactor = newServings / originalServings;
    
    // Scale ingredients
    const scaledIngredients = recipe.extendedIngredients.map(ingredient => ({
      ...ingredient,
      amount: Math.round((ingredient.amount * scaleFactor) * 100) / 100,
      original: `${Math.round((ingredient.amount * scaleFactor) * 100) / 100} ${ingredient.unit} ${ingredient.name}`
    }));
    
    res.json({
      success: true,
      originalServings,
      newServings,
      scaledIngredients,
      scaleFactor,
    });
    
  } catch (error) {
    console.error('Error customizing recipe:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to customize recipe',
      message: error.message 
    });
  }
});

// POST /api/recipes/generate - Generate recipes with AI
router.post('/generate', async (req, res) => {
  try {
    const { ingredients, dietaryPreferences, cuisine, maxTime } = req.body;
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of ingredients'
      });
    }

    if (!genAI) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not available',
        recipes: []
      });
    }

    console.log('Generating AI recipes for:', ingredients);
    
    const recipes = await generateRecipesWithGemini(
      ingredients,
      dietaryPreferences || null
    );

    // Add match percentages
    const enhancedRecipes = recipes.map((recipe, index) => {
      const recipeIngredients = extractIngredients(recipe);
      const matchPercentage = calculateMatchPercentage(ingredients, recipeIngredients);
      
      return {
        ...recipe,
        id: recipe.id || Date.now() + index,
        matchPercentage: Math.max(matchPercentage, 75),
        source: 'gemini_ai',
        isAiGenerated: true
      };
    });

    res.json({
      success: true,
      count: enhancedRecipes.length,
      ingredients: ingredients,
      recipes: enhancedRecipes,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating AI recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recipes with AI',
      message: error.message
    });
  }
});

module.exports = router;