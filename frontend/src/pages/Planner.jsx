import { useState, useEffect } from 'react'
import { Calendar, ShoppingCart, Printer, Download, Plus, Trash2, ChefHat, Clock, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const Planner = () => {
  const [planner, setPlanner] = useState({})
  const [favorites, setFavorites] = useState([])
  const [shoppingList, setShoppingList] = useState([])
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [dragItem, setDragItem] = useState(null)

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner']

  useEffect(() => {
    loadPlanner()
    loadFavorites()
  }, [])

  useEffect(() => {
    savePlanner()
  }, [planner])

  const loadPlanner = () => {
    const saved = JSON.parse(localStorage.getItem('mealPlan') || '{}')
    
    // Initialize with empty structure if no data
    if (Object.keys(saved).length === 0) {
      const initialPlanner = {}
      daysOfWeek.forEach(day => {
        initialPlanner[day] = {}
        mealTypes.forEach(meal => {
          initialPlanner[day][meal] = null
        })
      })
      setPlanner(initialPlanner)
    } else {
      setPlanner(saved)
    }
  }

  const loadFavorites = () => {
    const saved = JSON.parse(localStorage.getItem('favorites') || '[]')
    setFavorites(saved)
  }

  const savePlanner = () => {
    localStorage.setItem('mealPlan', JSON.stringify(planner))
  }

  const handleDragStart = (e, recipe) => {
    setDragItem(recipe)
    e.dataTransfer.setData('text/plain', JSON.stringify(recipe))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, day, mealType) => {
    e.preventDefault()
    try {
      const recipe = dragItem || JSON.parse(e.dataTransfer.getData('text/plain'))
      
      setPlanner(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [mealType]: recipe
        }
      }))
      
      toast.success(`Added ${recipe.title} to ${mealType} on ${day}`)
    } catch (error) {
      console.error('Drop error:', error)
    }
    setDragItem(null)
  }

  const clearSlot = (day, mealType) => {
    setPlanner(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: null
      }
    }))
    toast('Slot cleared', { icon: '🗑️' })
  }

  const clearDay = (day) => {
    if (window.confirm(`Clear all meals for ${day}?`)) {
      const newDay = {}
      mealTypes.forEach(meal => {
        newDay[meal] = null
      })
      setPlanner(prev => ({
        ...prev,
        [day]: newDay
      }))
      toast.success(`Cleared ${day}'s meals`)
    }
  }

  const clearAll = () => {
    if (window.confirm('Clear entire meal plan?')) {
      const initialPlanner = {}
      daysOfWeek.forEach(day => {
        initialPlanner[day] = {}
        mealTypes.forEach(meal => {
          initialPlanner[day][meal] = null
        })
      })
      setPlanner(initialPlanner)
      toast.success('Meal plan cleared')
    }
  }

  const generateShoppingList = () => {
    // This would normally fetch ingredient details for each recipe
    // For now, we'll create a mock shopping list based on meal names
    const allMeals = []
    daysOfWeek.forEach(day => {
      mealTypes.forEach(meal => {
        if (planner[day]?.[meal]) {
          allMeals.push(planner[day][meal])
        }
      })
    })

    if (allMeals.length === 0) {
      toast.error('Add some meals to generate a shopping list')
      return
    }

    // Mock ingredients based on recipe titles
    const mockIngredients = [
      { name: 'Chicken Breast', amount: '500g', category: 'Meat' },
      { name: 'Rice', amount: '2 cups', category: 'Grains' },
      { name: 'Tomatoes', amount: '6 pieces', category: 'Vegetables' },
      { name: 'Onions', amount: '3 pieces', category: 'Vegetables' },
      { name: 'Garlic', amount: '1 bulb', category: 'Vegetables' },
      { name: 'Olive Oil', amount: '1 bottle', category: 'Oils' },
      { name: 'Salt', amount: 'To taste', category: 'Seasonings' },
      { name: 'Black Pepper', amount: 'To taste', category: 'Seasonings' },
      { name: 'Mixed Herbs', amount: '1 pack', category: 'Seasonings' },
      { name: 'Eggs', amount: '12 pieces', category: 'Dairy' },
      { name: 'Milk', amount: '1 liter', category: 'Dairy' },
      { name: 'Bread', amount: '1 loaf', category: 'Bakery' },
    ]

    setShoppingList(mockIngredients)
    setShowShoppingList(true)
    toast.success(`Generated shopping list for ${allMeals.length} meals`)
  }

  const printShoppingList = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Shopping List - Pradeep's Food Guide</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
            h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
            .category { margin: 20px 0; }
            .category h3 { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
            .check { margin-right: 10px; }
            @media print {
              .no-print { display: none; }
              body { font-size: 12pt; }
            }
          </style>
        </head>
        <body>
          <h1>Weekly Shopping List</h1>
          <p>Generated from your meal plan • ${new Date().toLocaleDateString()}</p>
          <hr>
          ${shoppingList.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = []
            acc[item.category].push(item)
            return acc
          }, {}).map(([category, items]) => `
            <div class="category">
              <h3>${category}</h3>
              ${items.map(item => `
                <div class="item">
                  <span><input type="checkbox" class="check"> ${item.name}</span>
                  <span>${item.amount}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
          <p class="no-print"><br>From Pradeep's Food Guide - Happy cooking!</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const downloadShoppingList = () => {
    const text = shoppingList.map(item => `[ ] ${item.name} - ${item.amount}`).join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shopping-list.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Shopping list downloaded')
  }

  const getDayColor = (day) => {
    const colors = {
      Monday: 'bg-blue-50 dark:bg-blue-900/20',
      Tuesday: 'bg-green-50 dark:bg-green-900/20',
      Wednesday: 'bg-yellow-50 dark:bg-yellow-900/20',
      Thursday: 'bg-purple-50 dark:bg-purple-900/20',
      Friday: 'bg-pink-50 dark:bg-pink-900/20',
      Saturday: 'bg-orange-50 dark:bg-orange-900/20',
      Sunday: 'bg-red-50 dark:bg-red-900/20'
    }
    return colors[day] || 'bg-gray-50 dark:bg-gray-800'
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
            <Calendar className="text-food-orange" />
            Weekly Meal Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Drag & drop recipes, plan your week, reduce stress
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <button
            onClick={generateShoppingList}
            className="btn-primary flex items-center gap-2"
          >
            <ShoppingCart />
            Generate Shopping List
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 border border-red-200 hover:border-red-300 text-red-500 hover:text-red-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Planner */}
        <div className="lg:w-3/4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <div className="text-2xl font-bold">
                {daysOfWeek.reduce((acc, day) => 
                  acc + mealTypes.filter(meal => planner[day]?.[meal]).length, 0
                )}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Planned Meals</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <div className="text-2xl font-bold text-green-500">
                {daysOfWeek.filter(day => 
                  mealTypes.every(meal => planner[day]?.[meal])
                ).length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Full Days</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <div className="text-2xl font-bold text-blue-500">
                {favorites.length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Available Recipes</div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <div className="text-2xl font-bold text-purple-500">
                {Math.round(daysOfWeek.reduce((acc, day) => 
                  acc + mealTypes.reduce((sum, meal) => 
                    sum + (planner[day]?.[meal]?.readyInMinutes || 0), 0
                  ), 0
                ) / (daysOfWeek.reduce((acc, day) => 
                  acc + mealTypes.filter(meal => planner[day]?.[meal]).length, 0
                ) || 1))}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Avg Time (min)</div>
            </div>
          </div>

          {/* Weekly Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {daysOfWeek.slice(0, 4).map(day => (
              <DayColumn
                key={day}
                day={day}
                planner={planner}
                getDayColor={getDayColor}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                clearSlot={clearSlot}
                clearDay={clearDay}
              />
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {daysOfWeek.slice(4).map(day => (
              <DayColumn
                key={day}
                day={day}
                planner={planner}
                getDayColor={getDayColor}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                clearSlot={clearSlot}
                clearDay={clearDay}
              />
            ))}
          </div>

          {/* Tips */}
          <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">Meal Planning Tips</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Drag recipes from favorites to plan your week</li>
                <li>• Left-click a meal slot to clear it</li>
                <li>• Generate shopping list for the entire week</li>
                <li>• Plan 2-3 days at a time for flexibility</li>
              </ul>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Use leftovers for next day's lunch</li>
                <li>• Batch cook on weekends</li>
                <li>• Keep 1-2 "easy" meals for busy days</li>
                <li>• Plan around your schedule</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-1/4">
          {/* Favorites */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ChefHat className="text-food-orange" />
              Your Favorite Recipes
              <span className="ml-auto text-sm text-gray-500">{favorites.length}</span>
            </h3>
            
            {favorites.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No favorites yet</p>
                <a 
                  href="/dashboard" 
                  className="text-food-orange hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={16} />
                  Find recipes
                </a>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {favorites.map(recipe => (
                  <div
                    key={recipe.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, recipe)}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <img 
                        src={recipe.image} 
                        alt={recipe.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{recipe.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {recipe.readyInMinutes}m
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {recipe.servings}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Drag to meal planner
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={generateShoppingList}
                className="w-full flex items-center justify-center gap-2 bg-food-green hover:bg-green-600 text-white py-3 rounded-lg font-medium"
              >
                <ShoppingCart size={18} />
                Shopping List
              </button>
              
              <button
                onClick={clearAll}
                className="w-full flex items-center justify-center gap-2 border border-red-200 hover:border-red-300 text-red-500 hover:text-red-700 py-3 rounded-lg font-medium"
              >
                <Trash2 size={18} />
                Reset Planner
              </button>
              
              <a
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 border border-food-orange text-food-orange hover:bg-food-orange hover:text-white py-3 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                Add More Recipes
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List Modal */}
      {showShoppingList && shoppingList.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-display font-bold">Shopping List</h2>
                <button
                  onClick={() => setShowShoppingList(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Everything you need for this week's meals
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {shoppingList.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = []
                acc[item.category].push(item)
                return acc
              }, {}).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-bold mb-3 pb-2 border-b">{category}</h3>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="rounded" />
                          <span>{item.name}</span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-400">{item.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <div className="text-gray-600 dark:text-gray-400">
                {shoppingList.length} items total
              </div>
              <div className="flex gap-3">
                <button
                  onClick={printShoppingList}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center gap-2"
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
                  onClick={downloadShoppingList}
                  className="px-4 py-2 bg-food-orange text-white rounded-lg flex items-center gap-2"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DayColumn = ({ day, planner, getDayColor, onDrop, onDragOver, clearSlot, clearDay }) => {
  return (
    <div className={`rounded-2xl shadow-lg overflow-hidden ${getDayColor(day)}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">{day}</h3>
          <button
            onClick={() => clearDay(day)}
            className="text-gray-400 hover:text-red-500 p-1"
            aria-label={`Clear ${day}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {['Breakfast', 'Lunch', 'Dinner'].filter(meal => planner[day]?.[meal]).length} meals planned
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {['Breakfast', 'Lunch', 'Dinner'].map(mealType => {
          const recipe = planner[day]?.[mealType]
          return (
            <div
              key={mealType}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, day, mealType)}
              className={`min-h-[120px] rounded-xl border-2 border-dashed transition-all duration-200 ${
                recipe 
                  ? 'border-transparent bg-white dark:bg-gray-700 p-3' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-food-orange hover:bg-white/50 dark:hover:bg-gray-700/50 p-4'
              }`}
              onClick={recipe ? () => clearSlot(day, mealType) : undefined}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-medium ${recipe ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}`}>
                  {mealType}
                </span>
                {recipe && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      clearSlot(day, mealType)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                    aria-label={`Clear ${mealType}`}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {recipe ? (
                <div className="space-y-2">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title}
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <h4 className="font-medium text-sm line-clamp-2">{recipe.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} />
                    {recipe.readyInMinutes} min
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-sm">Drag recipe here</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Planner