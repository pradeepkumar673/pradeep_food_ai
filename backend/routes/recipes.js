const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize APIs
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

// Initialize Gemini AI
let genAI = null;
let geminiAvailable = false;

// Check if Gemini API key is valid (not a placeholder)
if (GEMINI_API_KEY && GEMINI_API_KEY.length > 20) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiAvailable = true;
    console.log('✅ Gemini AI initialized successfully');
  } catch (error) {
    console.error('❌ Gemini AI initialization failed:', error.message);
    geminiAvailable = false;
  }
} else {
  console.log('⚠️ Gemini API key not configured or too short');
}

// Check if Spoonacular API key is valid (not a placeholder)
const spoonacularAvailable = SPOONACULAR_API_KEY && SPOONACULAR_API_KEY.length > 20;

console.log(`
📊 API AVAILABILITY:
${spoonacularAvailable ? '✅ Spoonacular: Available' : '❌ Spoonacular: Unavailable'}
${geminiAvailable ? '✅ Gemini AI: Available' : '❌ Gemini AI: Unavailable'}
🔄 Fallback order: Spoonacular → Gemini → Local Recipes
`);

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
  if (!recipeIngredients || recipeIngredients.length === 0) return 10;
  if (!userIngredients || userIngredients.length === 0) return 0;
  
  const userIngSet = new Set(userIngredients.map(normalizeIngredient));
  
  let matchScore = 0;
  recipeIngredients.forEach(recipeIng => {
    const normalizedRecipeIng = normalizeIngredient(recipeIng);
    
    // Exact match
    if (userIngSet.has(normalizedRecipeIng)) {
      matchScore += 1.0;
    } else {
      // Check for partial matches
      for (const userIng of userIngSet) {
        if (normalizedRecipeIng.includes(userIng) || userIng.includes(normalizedRecipeIng)) {
          matchScore += 0.6;
          break;
        }
      }
    }
  });
  
  let percentage = (matchScore / recipeIngredients.length) * 100;
  
  // Boost for simpler recipes
  if (recipeIngredients.length <= 3) {
    percentage *= 1.2;
  }
  
  return Math.min(Math.max(Math.round(percentage), 15), 98);
};

// Generate AI recipes
// Generate AI recipes - FIXED VERSION
const generateAIRecipe = async (ingredients, filter = null) => {
  if (!genAI || !geminiAvailable) return null;
  
  try {
    console.log('🤖 Generating AI recipe...');
    
    // Updated model names that actually work with Gemini API
    const modelNames = [
      'gemini-1.5-flash',  // Most common working model
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-pro',
      'gemini-1.0-pro'
    ];
    
    let model = null;
    let successfulModel = '';
    
    // Try each model until one works
    for (const modelName of modelNames) {
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        
        // Different initialization for different model types
        if (modelName.includes('flash') || modelName.includes('pro')) {
          model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: 0.7,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 500,
            }
          });
        } else {
          model = genAI.getGenerativeModel({ model: modelName });
        }
        
        // Quick test with simple prompt
        const testResult = await model.generateContent("Hello");
        const testResponse = await testResult.response;
        const testText = testResponse.text();
        
        if (testText && testText.length > 0) {
          successfulModel = modelName;
          console.log(`✅ Success with model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.log(`❌ Model ${modelName} failed: ${err.message}`);
        // Try next model
      }
    }
    
    if (!model) {
      console.log('❌ All Gemini models failed. Falling back to simple recipe.');
      
      // Create a simple recipe without AI
      return {
        title: `Simple Recipe with ${ingredients[0] || 'Ingredients'}`,
        description: `Combine ${ingredients.join(', ')} creatively`,
        prepTime: 20,
        servings: 2,
        ingredients: ingredients,
        instructions: [
          `Clean and prepare ${ingredients.join(' and ')}`,
          'Combine in a bowl or pan',
          'Cook using basic methods (boil, fry, bake)',
          'Season with salt, pepper, or available spices',
          'Serve and enjoy'
        ],
        tips: 'Use your cooking intuition!',
        source: 'simple_fallback'
      };
    }
    
    // Create a better prompt
    const prompt = `Create a simple, practical recipe using ONLY these ingredients: ${ingredients.join(', ')}.
${filter ? `Make it ${filter} (quick, healthy, vegetarian, etc.).` : ''}

IMPORTANT: Return ONLY valid JSON, no other text.

Required JSON format:
{
  "title": "Recipe Name",
  "description": "Brief description (1 sentence)",
  "prepTime": 25,
  "servings": 2,
  "ingredients": ["ingredient1", "ingredient2"],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "tips": "Optional cooking tip"
}

Make it simple, easy to follow, and practical for home cooking.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('📝 AI Response received');
    
    // Try to extract JSON
    let parsedRecipe = null;
    
    // Method 1: Try direct JSON parse
    try {
      parsedRecipe = JSON.parse(text);
      console.log('✅ Direct JSON parse successful');
    } catch (parseError1) {
      // Method 2: Try to find JSON in text
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedRecipe = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted JSON from text');
        }
      } catch (parseError2) {
        console.log('❌ JSON parsing failed:', parseError2.message);
      }
    }
    
    if (parsedRecipe && parsedRecipe.title) {
      return {
        ...parsedRecipe,
        source: 'gemini_ai',
        modelUsed: successfulModel
      };
    }
    
    // If JSON parsing failed, create recipe from text
    console.log('📝 Creating recipe from AI text response');
    
    // Extract title from response
    let title = `Recipe with ${ingredients[0] || 'Ingredients'}`;
    const titleMatch = text.match(/["']?title["']?\s*:\s*["']([^"']+)["']/i) || 
                      text.match(/Recipe Name:\s*(.+)/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Extract instructions
    let instructions = [
      `Prepare ${ingredients.join(' and ')}`,
      'Combine ingredients',
      'Cook as needed',
      'Season and serve'
    ];
    
    const instructionsMatch = text.match(/["']?instructions["']?\s*:\s*\[([^\]]+)\]/i);
    if (instructionsMatch) {
      const steps = instructionsMatch[1].split(',').map(s => s.trim().replace(/["']/g, ''));
      if (steps.length > 0) {
        instructions = steps;
      }
    }
    
    return {
      title: title,
      description: `AI-generated recipe using ${ingredients.join(', ')}`,
      prepTime: 25,
      servings: 2,
      ingredients: ingredients,
      instructions: instructions,
      tips: 'Adjust seasoning to your taste',
      source: 'gemini_ai_text',
      modelUsed: successfulModel
    };
    
  } catch (error) {
    console.error('❌ AI generation error:', error.message);
    
    // Return a simple fallback recipe
    return {
      title: `Quick ${ingredients[0] || 'Ingredient'} Recipe`,
      description: `Simple preparation using ${ingredients.join(', ')}`,
      prepTime: 15,
      servings: 2,
      ingredients: ingredients,
      instructions: [
        `Wash and prepare ${ingredients.join(' and ')}`,
        'Combine in a pan or bowl',
        'Use basic cooking method (fry, boil, bake)',
        'Season with available spices',
        'Serve warm'
      ],
      source: 'ai_fallback'
    };
  }
};

// LOCAL RECIPES DATABASE
const LOCAL_RECIPES = {
  'pasta,egg': [
    {
      id: 1001,
      title: "Pasta with Egg",
      description: "Simple protein pasta",
      image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 1,
      ingredients: ["pasta", "egg", "oil", "salt"],
      instructions: ["Cook pasta", "Fry egg", "Combine", "Season with salt"]
    }
  ],
  
  'pasta,onion,egg': [
    {
      id: 1002,
      title: "Pasta with Onion and Egg",
      description: "Hearty pasta dish with onion and egg",
      image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=312&h=231&fit=crop",
      prepTime: 20,
      servings: 2,
      ingredients: ["pasta", "onion", "egg", "oil", "salt", "pepper"],
      instructions: [
        "Cook pasta until al dente",
        "Slice onion and sauté in oil until soft",
        "Fry eggs sunny side up",
        "Combine pasta with onions",
        "Top with fried eggs and season"
      ]
    }
  ],
  
  'pasta,tomato': [
    {
      id: 1003,
      title: "Simple Tomato Pasta",
      description: "Quick tomato sauce pasta",
      image: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=312&h=231&fit=crop",
      prepTime: 25,
      servings: 2,
      ingredients: ["pasta", "tomato", "garlic", "olive oil", "basil"],
      instructions: ["Cook pasta", "Sauté garlic in olive oil", "Add chopped tomatoes", "Simmer for 10 minutes", "Toss with pasta and basil"]
    }
  ],
  
  'rice,egg': [
    {
      id: 1004,
      title: "Egg Fried Rice",
      description: "Quick and easy fried rice",
      image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 2,
      ingredients: ["rice", "egg", "oil", "soy sauce"],
      instructions: ["Heat oil in pan", "Scramble egg", "Add cooked rice", "Stir fry with soy sauce"]
    }
  ],
  
  'chicken,rice': [
    {
      id: 1005,
      title: "Chicken and Rice",
      description: "Simple protein and carb combo",
      image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=312&h=231&fit=crop",
      prepTime: 30,
      servings: 2,
      ingredients: ["chicken", "rice", "salt", "pepper"],
      instructions: ["Cook rice", "Cook chicken", "Combine", "Season"]
    }
  ],
  
  'water,lemon,salt,strawberry': [
    {
      id: 1006,
      title: "Lemon-Strawberry Infused Water",
      description: "Refreshing infused water",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=312&h=231&fit=crop",
      prepTime: 5,
      servings: 4,
      ingredients: ["water", "lemon", "strawberry", "salt"],
      instructions: ["Slice lemon and strawberries", "Add to water with pinch of salt", "Refrigerate for 1 hour", "Serve chilled"]
    }
  ],
  
  'chicken,garlic': [
    {
      id: 1007,
      title: "Garlic Chicken",
      description: "Simple garlic flavored chicken",
      image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=312&h=231&fit=crop",
      prepTime: 25,
      servings: 2,
      ingredients: ["chicken", "garlic", "oil", "salt", "pepper"],
      instructions: ["Season chicken", "Sauté garlic in oil", "Cook chicken with garlic", "Season to taste", "Serve hot"]
    }
  ],
  
  'strawberry,soda': [
    {
      id: 1008,
      title: "Strawberry Soda",
      description: "Refreshing strawberry soda drink",
      image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=312&h=231&fit=crop",
      prepTime: 5,
      servings: 1,
      ingredients: ["strawberry", "soda"],
      instructions: ["Wash and slice strawberries", "Add to glass", "Pour soda over", "Serve immediately"]
    }
  ],
  
  'water,lemon': [
    {
      id: 1009,
      title: "Fresh Lemon Water",
      description: "Hydrating lemon water",
      image: "https://images.unsplash.com/photo-1523264939339-c89f9dadde2e?w=312&h=231&fit=crop",
      prepTime: 2,
      servings: 1,
      ingredients: ["water", "lemon"],
      instructions: ["Squeeze lemon into water", "Stir well", "Serve immediately"]
    }
  ],
  
  'bread,egg': [
    {
      id: 1010,
      title: "Egg Toast",
      description: "Simple breakfast toast",
      image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 1,
      ingredients: ["bread", "egg", "butter", "salt"],
      instructions: ["Toast bread", "Fry egg", "Place egg on toast", "Season with salt"]
    }
  ],
  
  'bread,cheese': [
    {
      id: 1011,
      title: "Grilled Cheese",
      description: "Simple grilled cheese sandwich",
      image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 1,
      ingredients: ["bread", "cheese", "butter"],
      instructions: ["Butter bread", "Add cheese", "Grill until golden", "Serve hot"]
    }
  ],
  
  'potato,onion': [
    {
      id: 1012,
      title: "Potato Onion Fry",
      description: "Simple vegetable dish",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=312&h=231&fit=crop",
      prepTime: 25,
      servings: 2,
      ingredients: ["potato", "onion", "oil", "salt"],
      instructions: ["Slice potatoes and onions", "Heat oil", "Fry until golden", "Season with salt"]
    }
  ],
  
  'tomato,onion': [
    {
      id: 1013,
      title: "Tomato Onion Salad",
      description: "Fresh vegetable salad",
      image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 2,
      ingredients: ["tomato", "onion", "salt", "lemon"],
      instructions: ["Chop tomatoes and onions", "Mix together", "Add salt and lemon juice", "Serve fresh"]
    }
  ],
  
  'egg,tomato': [
    {
      id: 1014,
      title: "Tomato Egg Scramble",
      description: "Quick breakfast scramble",
      image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 1,
      ingredients: ["egg", "tomato", "oil", "salt"],
      instructions: ["Chop tomato", "Beat eggs", "Scramble with tomato", "Season with salt"]
    }
  ],
  
  'milk,chocolate': [
    {
      id: 1015,
      title: "Hot Chocolate",
      description: "Warm chocolate drink",
      image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 1,
      ingredients: ["milk", "chocolate", "sugar"],
      instructions: ["Heat milk", "Add chocolate", "Stir until melted", "Add sugar to taste"]
    }
  ]
};

// Find matching local recipes
const findLocalRecipes = (ingredients) => {
  const normalizedIngredients = ingredients.map(normalizeIngredient);
  const matchedRecipes = [];
  
  // Exact matches
  const ingredientsKey = normalizedIngredients.join(',');
  if (LOCAL_RECIPES[ingredientsKey]) {
    matchedRecipes.push(...LOCAL_RECIPES[ingredientsKey]);
  }
  
  // Partial matches (at least 50% match)
  for (const [key, recipes] of Object.entries(LOCAL_RECIPES)) {
    if (key === ingredientsKey) continue;
    
    const keyIngredients = key.split(',');
    let matchCount = 0;
    
    normalizedIngredients.forEach(userIng => {
      if (keyIngredients.some(keyIng => {
        return normalizeIngredient(keyIng).includes(userIng) || 
               userIng.includes(normalizeIngredient(keyIng));
      })) {
        matchCount++;
      }
    });
    
    const matchRatio = matchCount / normalizedIngredients.length;
    if (matchRatio >= 0.5) {
      recipes.forEach(recipe => {
        matchedRecipes.push({
          ...recipe,
          matchScore: Math.round(matchRatio * 100)
        });
      });
    }
  }
  
  return matchedRecipes;
};

// GET /api/recipes/search
router.get('/search', async (req, res) => {
  try {
    const { ingredients, filter, number = 10 } = req.query;
    
    if (!ingredients) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients parameter is required'
      });
    }

    const ingredientsArray = ingredients.split(',').map(i => i.trim()).filter(i => i);
    const normalizedIngredients = ingredientsArray.map(normalizeIngredient);
    
    console.log(`🔍 Searching for: ${normalizedIngredients.join(', ')}`);
    
    let recipes = [];
    let source = 'unknown';
    let fallbackLevel = 0;
    
    // STEP 1: Try Spoonacular API
    if (spoonacularAvailable) {
      try {
        console.log('📡 Calling Spoonacular API...');
        
        const params = {
          apiKey: SPOONACULAR_API_KEY,
          ingredients: normalizedIngredients.join(','),
          number: 5,
          ranking: 2,
          ignorePantry: true
        };
        
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
          
          recipes = response.data.map(recipe => {
            const usedIngs = (recipe.usedIngredients || []).map(i => i.name.toLowerCase());
            const missedIngs = (recipe.missedIngredients || []).map(i => i.name.toLowerCase());
            const allRecipeIngredients = [...usedIngs, ...missedIngs];
            
            const matchPercentage = calculateMatchPercentage(normalizedIngredients, allRecipeIngredients);
            
            return {
              id: recipe.id,
              title: recipe.title,
              image: recipe.image || `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
              readyInMinutes: 30,
              servings: 4,
              matchPercentage: matchPercentage,
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
            source = 'spoonacular';
            fallbackLevel = 0;
          }
        }
        
      } catch (spoonacularError) {
        console.log(`❌ Spoonacular API error: ${spoonacularError.message}`);
        fallbackLevel = 1;
      }
    } else {
      console.log('⚠️ Spoonacular API not available');
      fallbackLevel = 1;
    }
    
    // STEP 2: If no Spoonacular results, try Gemini AI
    if (recipes.length === 0 && geminiAvailable) {
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
          fallbackLevel = 2;
        }
      } catch (aiError) {
        console.log('⚠️ AI generation failed:', aiError.message);
        fallbackLevel = 3;
      }
    } else if (recipes.length === 0 && !geminiAvailable) {
      console.log('⚠️ Gemini AI not available, using local recipes');
      fallbackLevel = 3;
    }
    
    // STEP 3: Use local recipes
    if (recipes.length === 0) {
      console.log('📋 Using local recipes...');
      source = 'local';
      
      const matchedRecipes = findLocalRecipes(normalizedIngredients);
      
      if (matchedRecipes.length > 0) {
        recipes = matchedRecipes.map(recipe => ({
          id: recipe.id,
          title: recipe.title,
          image: recipe.image,
          readyInMinutes: recipe.prepTime || 20,
          servings: recipe.servings || 2,
          matchPercentage: recipe.matchScore || calculateMatchPercentage(normalizedIngredients, recipe.ingredients || []),
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: recipe.description || `Local recipe using ${normalizedIngredients.join(', ')}`,
          source: 'local'
        }));
      } else {
        // Create simple recipes
        recipes = normalizedIngredients.map((ingredient, index) => ({
          id: 2000 + index,
          title: `${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)} Simple Prep`,
          image: `https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80`,
          readyInMinutes: 10,
          servings: 1,
          matchPercentage: 90,
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: `Simple preparation using ${ingredient}`,
          source: 'generated'
        }));
      }
      fallbackLevel = 3;
    }
    
    // Ensure we have recipes
    if (recipes.length === 0) {
      recipes = [{
        id: 9999,
        title: 'Simple Kitchen Creation',
        image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80',
        readyInMinutes: 20,
        servings: 2,
        matchPercentage: 70,
        cheap: true,
        dairyFree: true,
        glutenFree: true,
        vegan: true,
        vegetarian: true,
        veryHealthy: true,
        veryPopular: false,
        summary: 'Create something delicious with what you have!',
        source: 'emergency'
      }];
      source = 'emergency';
      fallbackLevel = 4;
    }
    
    // Sort and limit
    recipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const finalRecipes = recipes.slice(0, Math.min(number, 15));
    
    const result = {
      success: true,
      count: finalRecipes.length,
      ingredients: ingredientsArray,
      source: source,
      usingFallback: fallbackLevel > 0,
      recipes: finalRecipes,
      timestamp: new Date().toISOString(),
      message: getMessageBySource(source, finalRecipes.length)
    };
    
    console.log(`✅ Returning ${finalRecipes.length} recipes from ${source}`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Fatal error in search:', error);
    
    // Emergency fallback
    const ingredientsArray = req.query.ingredients ? 
      req.query.ingredients.split(',').map(i => i.trim()).filter(i => i) : 
      ['food'];
    
    res.json({
      success: true,
      count: 1,
      ingredients: ingredientsArray,
      source: 'error_fallback',
      recipes: [{
        id: 99999,
        title: 'Quick Kitchen Solution',
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
      }]
    });
  }
});

// Helper function
function getMessageBySource(source, count) {
  switch(source) {
    case 'spoonacular':
      return `Found ${count} recipes from Spoonacular`;
    case 'ai':
    case 'ai_generated':
      return `AI-generated ${count} recipe${count !== 1 ? 's' : ''}`;
    case 'local':
      return `Found ${count} local recipe${count !== 1 ? 's' : ''}`;
    case 'generated':
      return `Created ${count} simple recipe${count !== 1 ? 's' : ''}`;
    case 'emergency':
      return 'Emergency recipes provided';
    default:
      return `Found ${count} recipes`;
  }
}

// GET /api/recipes/ingredients/suggest
router.get('/ingredients/suggest', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    // Try Spoonacular API
    if (spoonacularAvailable) {
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
    const parsedId = parseInt(id);
    
    // Local recipe
    if (parsedId >= 1000 && parsedId < 2000) {
      for (const recipes of Object.values(LOCAL_RECIPES)) {
        const recipe = recipes.find(r => r.id === parsedId);
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
              source: 'local'
            }
          });
        }
      }
    }
    
    // Spoonacular recipe
    if (spoonacularAvailable) {
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
        id: parsedId,
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
        source: 'generic'
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

// POST endpoint for customization
router.post('/:id/customize', (req, res) => {
  res.json({
    success: true,
    message: 'Customization endpoint',
    scaledIngredients: [],
    note: 'Adjust ingredients proportionally based on servings'
  });
});

module.exports = router;