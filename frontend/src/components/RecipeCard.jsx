import { useState } from 'react'
import { Clock, Users, Heart, ChevronRight, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const RecipeCard = ({ recipe, onClick, userIngredients = [] }) => {
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    return favorites.some(fav => fav.id === recipe.id)
  })

  const toggleFavorite = (e) => {
    e.stopPropagation()
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    
    if (isFavorite) {
      const newFavorites = favorites.filter(fav => fav.id !== recipe.id)
      localStorage.setItem('favorites', JSON.stringify(newFavorites))
      setIsFavorite(false)
      toast.success('Removed from favorites')
    } else {
      favorites.push({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        matchPercentage: recipe.matchPercentage
      })
      localStorage.setItem('favorites', JSON.stringify(favorites))
      setIsFavorite(true)
      toast.success('Added to favorites!')
    }
  }

  const matchColor = recipe.matchPercentage >= 80 ? 'bg-green-500' 
    : recipe.matchPercentage >= 60 ? 'bg-yellow-500' 
    : 'bg-orange-500'

  return (
    <div 
      className="recipe-card cursor-pointer group"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden">
        <img 
          src={recipe.image} 
          alt={recipe.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = `https://source.unsplash.com/featured/312x231/?food,${recipe.title.split(' ')[0]}`
          }}
        />
        
        {/* Match Badge */}
        <div className={`absolute top-4 right-4 ${matchColor} text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg`}>
          {recipe.matchPercentage}% Match
        </div>
        
        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-4 left-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart 
            size={20} 
            className={isFavorite ? "fill-food-red text-food-red" : "text-gray-600"} 
          />
        </button>
        
        {/* Quick Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span className="text-sm font-medium">{recipe.readyInMinutes} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span className="text-sm font-medium">{recipe.servings} servings</span>
              </div>
            </div>
            {recipe.veryPopular && (
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">Popular</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-food-orange transition-colors">
          {recipe.title}
        </h3>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.cheap && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Budget
            </span>
          )}
          {recipe.vegetarian && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Vegetarian
            </span>
          )}
          {recipe.vegan && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Vegan
            </span>
          )}
          {recipe.glutenFree && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Gluten-Free
            </span>
          )}
          {recipe.veryHealthy && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Healthy
            </span>
          )}
        </div>

        {/* Match Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Ingredient match</span>
            <span className="font-bold">{recipe.matchPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${matchColor} transition-all duration-500`}
              style={{ width: `${Math.min(recipe.matchPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between">
          <button className="text-food-orange hover:text-orange-600 font-medium flex items-center gap-1 group">
            View Recipe
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="text-xs text-gray-500">
            {userIngredients.length > 0 && (
              <span>{Math.min(recipe.matchPercentage, 100)}% of your ingredients</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipeCard