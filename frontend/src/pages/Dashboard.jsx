import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import RecipeCard from '../components/RecipeCard'
import RecipeModal from '../components/RecipeModal'
import { Search, X, Filter, ChefHat, Clock, TrendingUp, Sparkles, Loader } from 'lucide-react'

const Dashboard = () => {
  const [ingredients, setIngredients] = useState('')
  const [ingredientTags, setIngredientTags] = useState(['chicken', 'rice', 'tomato'])
  const [suggestions, setSuggestions] = useState([])
  const [selectedFilter, setSelectedFilter] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [userIngredients, setUserIngredients] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const suggestionTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  // Filters with improved descriptions
  const filters = [
    { key: 'quick', label: 'Quick', icon: '⚡', description: 'Under 30 mins', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { key: 'healthy', label: 'Healthy', icon: '🥗', description: 'Nutritious choices', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { key: 'comfort', label: 'Comfort', icon: '🍲', description: 'Hearty & cozy', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    { key: 'spicy', label: 'Spicy', icon: '🌶️', description: 'Hot & flavorful', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    { key: 'vegetarian', label: 'Vegetarian', icon: '🥦', description: 'Plant-based', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    { key: 'vegan', label: 'Vegan', icon: '🌱', description: 'No animal products', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
    { key: 'glutenfree', label: 'Gluten-Free', icon: '🌾', description: 'No gluten', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { key: 'sweet', label: 'Sweet', icon: '🍰', description: 'Desserts & treats', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' }
  ]

  // Popular ingredient suggestions
  const popularIngredients = [
    'chicken', 'rice', 'pasta', 'tomato', 'onion', 'garlic', 'egg', 'cheese',
    'potato', 'carrot', 'broccoli', 'spinach', 'mushroom', 'bell pepper',
    'lemon', 'lime', 'ginger', 'soy sauce', 'olive oil', 'butter', 'milk',
    'flour', 'sugar', 'honey', 'bread', 'beans', 'lentils', 'tofu', 'fish'
  ]

  // Get ingredient suggestions from API
  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await axios.get('/api/recipes/ingredients/suggest', {
        params: { query }
      })
      
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSuggestions(response.data.suggestions)
      } else {
        // Fallback to local matching
        const filtered = popularIngredients.filter(ing =>
          ing.toLowerCase().includes(query.toLowerCase()) &&
          !ingredientTags.includes(ing)
        )
        setSuggestions(filtered.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      // Local fallback
      const filtered = popularIngredients.filter(ing =>
        ing.toLowerCase().includes(query.toLowerCase()) &&
        !ingredientTags.includes(ing)
      )
      setSuggestions(filtered.slice(0, 5))
    }
  }

  // Handle ingredient input with debouncing
  const handleIngredientChange = (e) => {
    const value = e.target.value
    setIngredients(value)
    
    // Clear previous timeout
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }
    
    // Set new timeout for suggestions
    suggestionTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        fetchSuggestions(value.trim())
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
  }

  const handleAddIngredient = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = ingredients.trim().toLowerCase()
      
      if (value && value.length > 1 && !ingredientTags.includes(value)) {
        setIngredientTags([...ingredientTags, value])
        setIngredients('')
        setSuggestions([])
        setShowSuggestions(false)
        toast.success(`Added ${value}`)
      }
    }
  }

  const addIngredient = (ingredient) => {
    const value = ingredient.trim().toLowerCase()
    if (value && !ingredientTags.includes(value)) {
      setIngredientTags([...ingredientTags, value])
      setIngredients('')
      setSuggestions([])
      setShowSuggestions(false)
      toast.success(`Added ${value}`)
      inputRef.current?.focus()
    }
  }

  const removeIngredient = (index) => {
    const newTags = [...ingredientTags]
    const removed = newTags.splice(index, 1)
    setIngredientTags(newTags)
    toast(`Removed ${removed[0]}`, { icon: '🗑️' })
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
    setSearching(true)
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
        
        if (response.data.usingFallback) {
          toast(
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-500" />
              <span>Using AI-powered suggestions for your ingredients!</span>
            </div>,
            { duration: 4000 }
          )
        } else {
          toast.success(`Found ${response.data.recipes.length} recipes!`)
        }
      } else {
        toast('No recipes found. Try different ingredients!', { icon: '👨‍🍳' })
        setRecipes([])
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
      setRecipes([])
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleRecipeClick = (recipe) => {
    setSelectedRecipe(recipe)
    setModalOpen(true)
  }

  // Load initial sample recipes
  useEffect(() => {
    const fetchInitialRecipes = async () => {
      try {
        const response = await axios.get('/api/recipes/search', {
          params: {
            ingredients: 'chicken,rice,tomato',
            number: 3
          }
        })
        
        if (response.data.recipes && response.data.recipes.length > 0) {
          setRecipes(response.data.recipes.slice(0, 3))
        }
      } catch (error) {
        console.log('Using sample recipes')
      }
    }
    
    fetchInitialRecipes()
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

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
            <div className="mb-8 relative" ref={inputRef}>
              <label className="block text-lg font-semibold mb-4 flex items-center gap-2">
                <Search size={20} />
                Your Ingredients
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={ingredients}
                  onChange={handleIngredientChange}
                  onKeyDown={handleAddIngredient}
                  placeholder="e.g., chicken, rice, tomatoes, onion..."
                  className="input-field pr-10"
                />
                {ingredients && (
                  <button
                    onClick={() => {
                      setIngredients('')
                      setSuggestions([])
                      setShowSuggestions(false)
                    }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => addIngredient(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Search size={16} className="text-gray-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Press Enter or comma to add ingredients
              </p>
            </div>

            {/* Ingredient Tags */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Added Ingredients ({ingredientTags.length})</span>
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
              
              <div className="flex flex-wrap gap-2 min-h-[60px]">
                {ingredientTags.map((tag, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-food-orange dark:text-orange-300 px-3 py-2 rounded-full font-medium group"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => removeIngredient(index)}
                      className="text-orange-500 hover:text-orange-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${tag}`}
                    >
                      <X size={14} />
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

            {/* Popular Ingredients */}
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">
                Popular Ingredients
              </label>
              <div className="flex flex-wrap gap-2">
                {popularIngredients.slice(0, 8).map((ing) => (
                  <button
                    key={ing}
                    onClick={() => addIngredient(ing)}
                    disabled={ingredientTags.includes(ing)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      ingredientTags.includes(ing)
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    + {ing}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood Filters */}
            <div className="mb-8">
              <label className="block text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter size={20} />
                Filter by Mood
              </label>
              <div className="grid grid-cols-2 gap-3">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setSelectedFilter(selectedFilter === filter.key ? null : filter.key)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 ${
                      selectedFilter === filter.key
                        ? `${filter.color} border-2 border-food-orange shadow-lg`
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                    title={filter.description}
                  >
                    <span className="text-2xl mb-1">{filter.icon}</span>
                    <span className="text-sm font-medium">{filter.label}</span>
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
                  <Loader className="animate-spin" size={20} />
                  Searching...
                </>
              ) : searching ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Processing...
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
                <Sparkles size={16} className="text-blue-500" />
                Pro Tips
              </h4>
              <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Start with 2-3 main ingredients</li>
                <li>• Add spices (garlic, onion, herbs) for better matches</li>
                <li>• Try the "quick" filter for 30-min meals</li>
                <li>• Click any recipe for detailed view & customization</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold mb-2">
                  Recipe Ideas {ingredientTags.length > 0 && `with ${ingredientTags.slice(0, 3).join(', ')}${ingredientTags.length > 3 ? '...' : ''}`}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {ingredientTags.length > 0 
                    ? `Found ${recipes.length} recipes matching your ingredients.`
                    : 'Add ingredients to see personalized recipe recommendations.'}
                </p>
              </div>
              
              {selectedFilter && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Active filter:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    filters.find(f => f.key === selectedFilter)?.color || 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {filters.find(f => f.key === selectedFilter)?.icon} {filters.find(f => f.key === selectedFilter)?.label}
                  </span>
                  <button
                    onClick={() => setSelectedFilter(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recipe Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="recipe-card p-4 animate-pulse">
                  <div className="skeleton h-48 w-full rounded-xl mb-4"></div>
                  <div className="skeleton h-6 w-3/4 mb-2"></div>
                  <div className="skeleton h-4 w-1/2 mb-4"></div>
                  <div className="skeleton h-4 w-full mb-2"></div>
                  <div className="skeleton h-4 w-2/3"></div>
                </div>
              ))}
            </div>
          ) : recipes.length > 0 ? (
            <>
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
              
              {/* AI Notice */}
              {recipes.some(r => r.source === 'gemini_ai' || r.source === 'ai_generated') && (
                <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-purple-500" size={24} />
                    <div>
                      <h4 className="font-bold text-purple-700 dark:text-purple-300">AI-Powered Suggestions</h4>
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        Some recipes were generated by AI based on your ingredients. Feel free to customize them!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : !loading && searching ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <Loader className="w-12 h-12 text-food-orange animate-spin" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Finding recipes...</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Searching through thousands of recipes to find the perfect match for your ingredients.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <Search className="w-12 h-12 text-food-orange" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No recipes found yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Try adding more ingredients or using different combinations. Even simple ingredients can make amazing meals!
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {['pasta', 'eggs', 'cheese', 'bread', 'potato', 'onion'].map((ing) => (
                  <button
                    key={ing}
                    onClick={() => addIngredient(ing)}
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
              <h3 className="text-xl font-bold mb-4">Search Results</h3>
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