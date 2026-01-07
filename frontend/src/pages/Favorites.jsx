import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ChefHat, Clock, Users, Trash2, ExternalLink, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

const Favorites = () => {
  const [favorites, setFavorites] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = () => {
    const saved = JSON.parse(localStorage.getItem('favorites') || '[]')
    setFavorites(saved)
  }

  const removeFavorite = (id) => {
    const updated = favorites.filter(fav => fav.id !== id)
    setFavorites(updated)
    localStorage.setItem('favorites', JSON.stringify(updated))
    toast.success('Removed from favorites')
  }

  const clearAllFavorites = () => {
    if (favorites.length === 0) return
    if (window.confirm('Remove all favorites?')) {
      setFavorites([])
      localStorage.setItem('favorites', '[]')
      toast.success('All favorites cleared')
    }
  }

  const filteredFavorites = favorites.filter(fav => {
    if (filter === 'all') return true
    if (filter === 'quick' && fav.readyInMinutes <= 30) return true
    if (filter === 'healthy' && fav.veryHealthy) return true
    return false
  })

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16 animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <Heart className="w-12 h-12 text-food-red" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-4">No favorites yet</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          You haven't saved any recipes to your favorites. Start exploring recipes and click the heart icon to save them here!
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 btn-primary"
        >
          <ChefHat />
          Find Recipes to Save
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">My Favorite Recipes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {favorites.length} saved recipe{favorites.length !== 1 ? 's' : ''} • All stored in your browser
          </p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-food-orange"
            >
              <option value="all">All Favorites</option>
              <option value="quick">Quick (≤30 min)</option>
              <option value="healthy">Healthy Choices</option>
            </select>
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
          </div>
          
          <button
            onClick={clearAllFavorites}
            className="px-4 py-2 text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <div className="text-2xl font-bold text-food-red">{favorites.length}</div>
          <div className="text-gray-600 dark:text-gray-400">Total Saved</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <div className="text-2xl font-bold text-green-500">
            {favorites.filter(f => f.readyInMinutes <= 30).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">Quick Recipes</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <div className="text-2xl font-bold text-blue-500">
            {Math.round(favorites.reduce((acc, f) => acc + f.readyInMinutes, 0) / favorites.length)} min
          </div>
          <div className="text-gray-600 dark:text-gray-400">Avg Time</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <div className="text-2xl font-bold text-purple-500">
            {favorites.filter(f => f.matchPercentage >= 80).length}
          </div>
          <div className="text-gray-600 dark:text-gray-400">High Matches</div>
        </div>
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFavorites.map((recipe) => (
          <div key={recipe.id} className="recipe-card group">
            <div className="relative overflow-hidden">
              <img 
                src={recipe.image} 
                alt={recipe.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              
              {/* Remove Button */}
              <button
                onClick={() => removeFavorite(recipe.id)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                aria-label="Remove from favorites"
              >
                <Trash2 size={18} className="text-red-500" />
              </button>
              
              {/* Match Badge */}
              {recipe.matchPercentage && (
                <div className="absolute bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                  {recipe.matchPercentage}% Match
                </div>
              )}
            </div>
            
            <div className="p-5">
              <h3 className="font-bold text-lg mb-3 line-clamp-2">{recipe.title}</h3>
              
              <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {recipe.readyInMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Users size={16} />
                  {recipe.servings} servings
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <Link
                  to={`/dashboard?recipe=${recipe.id}`}
                  className="text-food-orange hover:text-orange-600 font-medium flex items-center gap-1 group"
                >
                  View Recipe
                  <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                
                <button
                  onClick={() => removeFavorite(recipe.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty filter state */}
      {filteredFavorites.length === 0 && favorites.length > 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No favorites match this filter</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try changing your filter criteria or view all favorites
          </p>
          <button
            onClick={() => setFilter('all')}
            className="btn-outline"
          >
            Show All Favorites
          </button>
        </div>
      )}
    </div>
  )
}

export default Favorites