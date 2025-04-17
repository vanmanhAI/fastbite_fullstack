// This file would connect to the Python ML service
// In a real application, this would make API calls to the FastAPI service

import type { Product } from "@/types/product"

// Sample product data (in a real app, this would come from the database)
const products: Product[] = [
  {
    id: 1,
    name: "Classic Cheeseburger",
    description: "Juicy beef patty with melted cheese, lettuce, tomato, and our special sauce",
    price: 8.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["popular", "beef"],
    category: "burger",
    rating: 4.5,
  },
  {
    id: 2,
    name: "Spicy Chicken Burger",
    description: "Crispy chicken fillet with spicy sauce, lettuce and pickles",
    price: 7.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["spicy", "chicken"],
    category: "burger",
    rating: 4.2,
  },
  {
    id: 3,
    name: "Vegetarian Pizza",
    description: "Fresh vegetables, mushrooms and mozzarella cheese on our signature crust",
    price: 12.99,
    image: "/placeholder.svg?height=300&width=300",
    tags: ["vegetarian", "pizza"],
    category: "pizza",
    rating: 4.0,
  },
  // More products would be here in a real app
]

interface UserPreferences {
  favoriteCategories: string[]
  dietaryRestrictions: string[]
  spicePreference: string
  previousOrders: number[] // product IDs
}

// Sample user preferences (in a real app, this would come from the database)
const sampleUserPreferences: UserPreferences = {
  favoriteCategories: ["burger", "pizza"],
  dietaryRestrictions: [],
  spicePreference: "medium",
  previousOrders: [1, 3, 1, 2], // User ordered product 1 twice, 3 once, and 2 once
}

/**
 * Get personalized recommendations for a user
 * In a real app, this would call the Python ML service
 */
export async function getRecommendations(userId: string, count = 3): Promise<Product[]> {
  // Simulate an API call to the ML service
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Get user preferences (in a real app, this would be fetched from the database)
  const userPrefs = sampleUserPreferences

  // Simple recommendation algorithm (in a real app, this would be a more sophisticated ML model)
  const recommendations = products
    .filter((product) => {
      // Filter out products that don't match dietary restrictions
      if (userPrefs.dietaryRestrictions.includes("vegetarian") && !product.tags.includes("vegetarian")) {
        return false
      }
      return true
    })
    .map((product) => {
      // Calculate a simple score based on user preferences
      let score = 0

      // Boost score for products in favorite categories
      if (userPrefs.favoriteCategories.includes(product.category)) {
        score += 2
      }

      // Boost score for products with matching spice preference
      if (
        (userPrefs.spicePreference === "spicy" && product.tags.includes("spicy")) ||
        (userPrefs.spicePreference === "mild" && !product.tags.includes("spicy"))
      ) {
        score += 1
      }

      // Boost score for previously ordered products
      const orderCount = userPrefs.previousOrders.filter((id) => id === product.id).length
      if (orderCount > 0) {
        score += orderCount * 1.5
      }

      // Boost score for popular products
      if (product.tags.includes("popular")) {
        score += 1
      }

      return { ...product, score }
    })
    .sort((a, b) => b.score - a.score) // Sort by score (highest first)
    .slice(0, count) // Take only the requested number of recommendations

  return recommendations
}

/**
 * Process user message to extract food preferences
 * In a real app, this would call the NLP service
 */
export async function processUserMessage(message: string): Promise<{
  intent: string
  preferences: {
    foodType: string[]
    dietary: string[]
    spiceLevel: string
  }
}> {
  // Simulate an API call to the NLP service
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Simple keyword matching (in a real app, this would use a proper NLP model)
  const lowerMessage = message.toLowerCase()

  // Extract intent
  let intent = "other"
  if (
    lowerMessage.includes("recommend") ||
    lowerMessage.includes("suggestion") ||
    lowerMessage.includes("what should i") ||
    lowerMessage.includes("what do you recommend")
  ) {
    intent = "asking_for_recommendations"
  } else if (
    lowerMessage.includes("hungry") ||
    lowerMessage.includes("want to eat") ||
    lowerMessage.includes("looking for")
  ) {
    intent = "looking_for_food"
  } else if (
    lowerMessage.includes("menu") ||
    lowerMessage.includes("what do you have") ||
    lowerMessage.includes("what's available")
  ) {
    intent = "asking_about_menu"
  }

  // Extract food preferences
  const foodTypes = []
  if (lowerMessage.includes("burger")) foodTypes.push("burger")
  if (lowerMessage.includes("pizza")) foodTypes.push("pizza")
  if (lowerMessage.includes("chicken")) foodTypes.push("chicken")
  if (lowerMessage.includes("drink") || lowerMessage.includes("beverage")) foodTypes.push("drink")
  if (lowerMessage.includes("dessert") || lowerMessage.includes("sweet")) foodTypes.push("dessert")

  // Extract dietary preferences
  const dietary = []
  if (lowerMessage.includes("vegetarian")) dietary.push("vegetarian")
  if (lowerMessage.includes("vegan")) dietary.push("vegan")
  if (lowerMessage.includes("gluten-free") || lowerMessage.includes("gluten free")) dietary.push("gluten-free")

  // Extract spice preference
  let spiceLevel = "medium"
  if (lowerMessage.includes("spicy") || lowerMessage.includes("hot")) {
    spiceLevel = "hot"
  } else if (lowerMessage.includes("mild") || lowerMessage.includes("not spicy")) {
    spiceLevel = "mild"
  }

  return {
    intent,
    preferences: {
      foodType: foodTypes,
      dietary,
      spiceLevel,
    },
  }
}

