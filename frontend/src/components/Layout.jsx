import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChefHat, Home, Search, Heart, Calendar, Moon, Sun } from 'lucide-react'

const Layout = ({ children }) => {
  const location = useLocation()
  const [darkMode, setDarkMode] = useState(false)
  
  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { path: '/dashboard', label: 'Find Recipes', icon: <Search size={20} /> },
    { path: '/favorites', label: 'Favorites', icon: <Heart size={20} /> },
    { path: '/planner', label: 'Meal Planner', icon: <Calendar size={20} /> },
  ]

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-food-cream text-gray-800'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="p-2 bg-food-orange rounded-full group-hover:rotate-12 transition-transform duration-300">
                <ChefHat size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-food-orange to-food-yellow bg-clip-text text-transparent">
                  Pradeep's Food Guide
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cook with what you have</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-food-orange text-white'
                      : 'hover:bg-orange-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className={`mt-16 py-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t border-gray-200 dark:border-gray-700`}>
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="text-food-orange" />
              <span className="text-xl font-display font-bold">Pradeep's Food Guide</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              A simple, practical recipe recommender that helps you cook amazing meals 
              using ingredients you already have at home. No sign-up required!
            </p>
            <div className="flex gap-6 mt-4">
              <a href="#" className="text-gray-500 hover:text-food-orange transition-colors">
                <i className="fab fa-github text-xl"></i>
              </a>
              <a href="#" className="text-gray-500 hover:text-food-orange transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-gray-500 hover:text-food-orange transition-colors">
                <i className="fab fa-instagram text-xl"></i>
              </a>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
              Made with ❤️ for food lovers everywhere • {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout