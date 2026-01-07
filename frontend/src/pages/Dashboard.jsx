import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import { Search, X, Filter, ChefHat, Clock, TrendingUp } from 'lucide-react'

const Dashboard = () => {
  const [ingredients, setIngredients] = useState('')
  const [ingredientTags, setIngredientTags] = useState(['chicken', 'rice', 'tomato'])
  const [selectedFilter, setSelectedFilter] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [userIngredients, setUserIngredients] = useState([])

  // Sample recipes for initial load
  const sampleRecipes = [
    {
      id: 1,
      title: "Chicken Fried Rice",
      image: "https://spoonacular.com/recipeImages/1-312x231.jpg",
      readyInMinutes: 25,
      servings: 4,
      matchPercentage: 92,
      cheap: true,
      dairyFree: true,
      glutenFree: false,
      vegan: false,
      vegetarian: false,
      veryHealthy: true,
      veryPopular: true
    },
    {
      id: 2,
      title: "Tomato Basil Pasta",
      image: "https://spoonacular.com/recipeImages/2-312x231.jpg",
      readyInMinutes: 20,
      servings: 2,
      matchPercentage: 85,
      cheap: true,
      dairyFree: true,
      glutenFree: false,
      vegan: true,
      vegetarian: true,
      veryHealthy: true,
      veryPopular: true
    },
    {
      id: 3,
      title: "Vegetable Stir Fry",
      image: "https://spoonacular.com/recipeImages/3-312x231.jpg",
      readyInMinutes: 30,
      servings: 3,
      matchPercentage: 78,
      cheap: true,
      dairyFree: true,
      glutenFree: true,
      vegan: true,
      vegetarian: true,
      veryHealthy: true,
      veryPopular: false
    }
  ]

  const filters = [
    { key: 'quick', label: 'Quick', icon: '⚡', description: 'Under 30 mins' },
    { key: 'healthy', label: 'Healthy', icon: '🥗', description: 'Nutritious choices' },
    { key: 'comfort', label: 'Comfort', icon: '🍲', description: 'Hearty & cozy' },
    { key: 'spicy', label: 'Spicy', icon: '🌶️', description: 'Hot & flavorful' },
    { key: 'vegetarian', label: 'Vegetarian', icon: '🥦', description: 'Plant-based' },
    { key: 'sweet', label: 'Sweet', icon: '🍰', description: 'Desserts & treats' }
  ]

  const handleAddIngredient = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = ingredients.trim()
      if (value && !ingredientTags.includes(value)) {
        setIngredientTags([...ingredientTags, value])
        setIngredients('')
        toast.success(`Added ${value}`)
      }
    }
  }

  const removeIngredient = (index) => {
    const newTags = [...ingredientTags]
    newTags.splice(index, 1)
    setIngredientTags(newTags)
  }

  const clearAll = () => {
    if (ingredientTags.length > 0) {
      setIngredientTags([])
      toast('All ingredients cleared', { icon: '🗑️' })
    }
  }

  const handleSearch = async () => {
    if (ingredientTags.length === 0) {
      toast.error('Please add at least one ingredient')
      return
    }

    setLoading(true)
    setUserIngredients([...ingredientTags])
    
    try {
      const response = await axios.get('/api/recipes/search', {
        params: {
          ingredients: ingredientTags.join(','),
          filter: selectedFilter,
          number: 15
        }
      })
      
      if (response.data.recipes && response.data.recipes.length > 0) {
        setRecipes(response.data.recipes)
        toast.success(`Found ${response.data.recipes.length} recipes!`)
      } else {
        // Show sample recipes if no results
        setRecipes(sampleRecipes)
        toast('Showing sample recipes. Try different ingredients!', { icon: '👨‍🍳' })
      }
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to sample recipes
      setRecipes(sampleRecipes)
      toast('Using sample recipes. Backend connection issue.', { icon: '⚠️' })
    } finally {
      setLoading(false)
    }
  }

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe)
    setModalOpen(true)
  }

  // Load initial sample recipes
  useEffect(() => {
    setRecipes(sampleRecipes)
  }, [])

  // Load saved ingredients from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lastIngredients')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setIngredientTags(parsed)
        }
      } catch (e) {
        console.error('Error loading saved ingredients:', e)
      }
    }
  }, [])

  // Save ingredients to localStorage
  useEffect(() => {
    if (ingredientTags.length > 0) {
      localStorage.setItem('lastIngredients', JSON.stringify(ingredientTags))
    }
  }, [ingredientTags])

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="lg:w-1/4">
          <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
            {/* Logo/Title */}
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold mb-2 flex items-center gap-3">
                <ChefHat className="text-food-orange" />
                Recipe Finder
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Enter what you have, find what to cook
              </p>
            </div>

            {/* Ingredients Input */}
            <div className="mb-8">
              <label className="block text-lg font-semibold mb-4 flex items-center gap-2">
                <Search size={20} />
                Your Ingredients
              </label>
              <input
                type="text"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                onKeyDown={handleAddIngredient}
                placeholder="e.g., chicken, rice, tomatoes, onion..."
                className="input-field"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Press Enter or comma to add ingredients
              </p>
            </div>

            {/* Ingredient Tags */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Added Ingredients</span>
                {ingredientTags.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X size={16} />
                    Clear all
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3">
                {ingredientTags.map((tag, index) => (
                  <div
                    key={index}
                    className="tag-chip group"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => removeIngredient(index)}
                      className="text-orange-500 hover:text-orange-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${tag}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                
                {ingredientTags.length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400 text-center w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    No ingredients added yet. Start typing above!
                  </div>
                )}
              </div>
            </div>

            {/* Mood Filters */}
            <div className="mb-8">
              <label className="block text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter size={20} />
                Mood Filter
              </label>
              <div className="space-y-3">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedFilter(selectedFilter === filter.key ? null : filter.key)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      selectedFilter === filter.key
                        ? 'bg-food-orange text-white shadow-lg'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{filter.icon}</span>
                      <div className="text-left">
                        <div className="font-medium">{filter.label}</div>
                        <div className="text-sm opacity-75">{filter.description}</div>
                      </div>
                    </div>
                    {selectedFilter === filter.key && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={loading || ingredientTags.length === 0}
              className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search />
                  Find Recipes
                  <TrendingUp size={20} />
                </>
              )}
            </button>

            {/* Tips */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock size={16} />
                Pro Tips
              </h4>
              <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Start with main ingredients (chicken, rice, pasta)</li>
                <li>• Add spices and herbs for better matches</li>
                <li>• Try "quick" filter for 30-min meals</li>
                <li>• Click any recipe card for detailed view</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-4">
              Recipe Ideas {ingredientTags.length > 0 && `with ${ingredientTags.join(', ')}`}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {ingredientTags.length > 0 
                ? `Found ${recipes.length} recipes matching your ingredients.`
                : 'Add ingredients to see personalized recipe recommendations.'}
            </p>
          </div>

          {/* Recipe Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="recipe-card p-4">
                  <div className="skeleton h-48 w-full rounded-xl mb-4"></div>
                  <div className="skeleton h-6 w-3/4 mb-2"></div>
                  <div className="skeleton h-4 w-1/2 mb-4"></div>
                  <div className="skeleton h-4 w-full mb-2"></div>
                  <div className="skeleton h-4 w-2/3"></div>
                </div>
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onClick={() => handleRecipeClick(recipe)}
                  userIngredients={ingredientTags}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <Search className="w-12 h-12 text-food-orange" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No recipes found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Try adding more ingredients or using different combinations. Even simple ingredients can make amazing meals!
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {['pasta', 'eggs', 'cheese', 'bread', 'potato', 'onion'].map((ing) => (
                  <button
                    key={ing}
                    onClick={() => {
                      if (!ingredientTags.includes(ing)) {
                        setIngredientTags([...ingredientTags, ing])
                        toast.success(`Added ${ing}`)
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    + {ing}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {recipes.length > 0 && !loading && (
            <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <h3 className="text-xl font-bold mb-4">Search Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-orange-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-2xl font-bold text-food-orange">{recipes.length}</div>
                  <div className="text-gray-600 dark:text-gray-400">Recipes Found</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-2xl font-bold text-food-green">
                    {Math.round(recipes.reduce((acc, r) => acc + r.matchPercentage, 0) / recipes.length)}%
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Avg Match</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-2xl font-bold text-blue-500">
                    {Math.round(recipes.reduce((acc, r) => acc + r.readyInMinutes, 0) / recipes.length)} min
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Avg Time</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-gray-700 rounded-xl">
                  <div className="text-2xl font-bold text-purple-500">
                    {ingredientTags.length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Your Ingredients</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Modal */}
      {modalOpen && selectedRecipe && (
        <RecipeModal
          recipeId={selectedRecipe.id}
          onClose={() => setModalOpen(false)}
          userIngredients={userIngredients}
        />
      )}
    </div>
  )
}

export default Dashboard