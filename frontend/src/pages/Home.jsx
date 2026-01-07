import { Link } from 'react-router-dom'
import { ChefHat, Sparkles, Clock, Heart, Users, Award } from 'lucide-react'

const Home = () => {
  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="text-center py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 bg-orange-50 dark:bg-gray-800 rounded-full">
            <Sparkles className="text-food-orange" />
            <span className="text-food-orange font-semibold">No Sign-Up Required • 100% Free</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
            Cook something{' '}
            <span className="relative">
              <span className="relative z-10">great</span>
              <span className="absolute bottom-2 left-0 w-full h-4 bg-yellow-200 dark:bg-yellow-900 opacity-60 -z-0"></span>
            </span>
            <br />
            with what you have
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop wondering what to cook. Just tell us what's in your kitchen, 
            and we'll show you delicious recipes you can make right now.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link 
              to="/dashboard" 
              className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-3 group"
            >
              <ChefHat className="group-hover:rotate-12 transition-transform" />
              Start Cooking Now
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link 
              to="/planner" 
              className="btn-outline text-lg px-8 py-4"
            >
              Plan Your Meals
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <Clock className="w-12 h-12 text-food-orange mx-auto mb-4" />
              <div className="text-3xl font-bold">15 min</div>
              <div className="text-gray-500 dark:text-gray-400">Average cook time</div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <Users className="w-12 h-12 text-food-green mx-auto mb-4" />
              <div className="text-3xl font-bold">10,000+</div>
              <div className="text-gray-500 dark:text-gray-400">Recipes available</div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <Heart className="w-12 h-12 text-food-red mx-auto mb-4" />
              <div className="text-3xl font-bold">0%</div>
              <div className="text-gray-500 dark:text-gray-400">Sign-up required</div>
            </div>
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              <Award className="w-12 h-12 text-food-yellow mx-auto mb-4" />
              <div className="text-3xl font-bold">100%</div>
              <div className="text-gray-500 dark:text-gray-400">Practical & useful</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-4">How it works</h2>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-12 max-w-2xl mx-auto">
            Three simple steps from empty fridge to delicious meal
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="text-5xl font-bold text-food-orange mb-6">1</div>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-10 h-10 text-food-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Enter Ingredients</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Type what's in your fridge, pantry, or garden. Separate with commas or press Enter.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="text-5xl font-bold text-food-orange mb-6">2</div>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-10 h-10 text-food-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Find Recipes</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get personalized recipe matches with percentage scores. Filter by mood or diet.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="text-5xl font-bold text-food-orange mb-6">3</div>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-10 h-10 text-food-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-4">Cook & Enjoy</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Follow step-by-step instructions, scale servings, and save favorites for later.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-food-orange to-food-yellow rounded-3xl p-12 text-white">
          <h2 className="text-4xl font-display font-bold mb-6">
            Ready to transform your ingredients into amazing meals?
          </h2>
          <p className="text-xl mb-10 opacity-90">
            Join thousands of home cooks who save time, reduce food waste, and discover new favorite recipes.
          </p>
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-3 bg-white text-food-orange hover:bg-gray-100 font-bold text-lg py-4 px-10 rounded-full transition-all duration-300 transform hover:scale-105"
          >
            <ChefHat />
            Start Your Cooking Journey
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home