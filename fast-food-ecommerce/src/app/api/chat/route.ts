import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// In a real app, this would be stored in a database
const userPreferences = {
  user123: {
    favoriteCategories: ["burger", "pizza"],
    dietaryRestrictions: ["vegetarian"],
    spicePreference: "mild",
  },
}

// Sample product database
const products = [
  {
    id: 1,
    name: "Classic Cheeseburger",
    category: "burger",
    tags: ["beef", "popular"],
    isVegetarian: false,
    spiceLevel: "mild",
    price: 8.99,
  },
  {
    id: 2,
    name: "Spicy Chicken Burger",
    category: "burger",
    tags: ["chicken", "spicy"],
    isVegetarian: false,
    spiceLevel: "hot",
    price: 7.99,
  },
  {
    id: 3,
    name: "Vegetarian Pizza",
    category: "pizza",
    tags: ["vegetarian"],
    isVegetarian: true,
    spiceLevel: "mild",
    price: 12.99,
  },
  // More products would be here in a real app
]

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json()

    // Get user preferences (in a real app, this would come from a database)
    const userPrefs = userPreferences[userId as keyof typeof userPreferences] || {
      favoriteCategories: [],
      dietaryRestrictions: [],
      spicePreference: "medium",
    }

    // Analyze user message to determine intent
    const { text: intent } = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Analyze the following message and determine the user's intent. 
        Possible intents: looking_for_food, asking_for_recommendations, asking_about_menu, other.
        If looking for food or recommendations, extract any food preferences mentioned.
        
        User message: ${message}
        
        Return a JSON object with the following structure:
        {
          "intent": "intent_type",
          "preferences": {
            "foodType": ["burger", "pizza", etc],
            "dietary": ["vegetarian", "vegan", etc],
            "spiceLevel": "mild/medium/hot"
          }
        }
      `,
    })

    let intentData
    try {
      intentData = JSON.parse(intent)
    } catch (e) {
      intentData = { intent: "other", preferences: {} }
    }

    // Generate recommendations based on intent and preferences
    let recommendations = []
    if (intentData.intent === "looking_for_food" || intentData.intent === "asking_for_recommendations") {
      // Combine user message preferences with stored preferences
      const combinedPreferences = {
        categories: [...(intentData.preferences.foodType || []), ...userPrefs.favoriteCategories],
        dietary: [...(intentData.preferences.dietary || []), ...userPrefs.dietaryRestrictions],
        spiceLevel: intentData.preferences.spiceLevel || userPrefs.spicePreference,
      }

      // Filter products based on preferences
      recommendations = products.filter((product) => {
        // If dietary restrictions include vegetarian, only show vegetarian options
        if (combinedPreferences.dietary.includes("vegetarian") && !product.isVegetarian) {
          return false
        }

        // If specific categories are mentioned, filter by those
        if (combinedPreferences.categories.length > 0 && !combinedPreferences.categories.includes(product.category)) {
          return false
        }

        return true
      })

      // Sort by relevance (in a real app, this would be more sophisticated)
      recommendations.sort((a, b) => {
        // Prioritize items that match the user's spice preference
        if (a.spiceLevel === combinedPreferences.spiceLevel && b.spiceLevel !== combinedPreferences.spiceLevel) {
          return -1
        }
        if (b.spiceLevel === combinedPreferences.spiceLevel && a.spiceLevel !== combinedPreferences.spiceLevel) {
          return 1
        }
        return 0
      })

      // Limit to top 3 recommendations
      recommendations = recommendations.slice(0, 3)
    }

    // Generate chatbot response
    const { text: botResponse } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are a friendly food assistant for a fast food restaurant.
        Be helpful, concise, and friendly. If the user is looking for food recommendations,
        acknowledge their preferences and mention you're showing some options.
        If they're asking about the menu or other information, be informative.
        Keep responses under 2 sentences unless more detail is needed.
      `,
      prompt: `
        User preferences: ${JSON.stringify(userPrefs)}
        User message: ${message}
        Detected intent: ${intentData.intent}
        ${recommendations.length > 0 ? `I have ${recommendations.length} recommendations to show them.` : ""}
        
        Respond to the user:
      `,
    })

    return NextResponse.json({
      message: botResponse,
      recommendations: recommendations.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: "/placeholder.svg?height=200&width=200", // In a real app, this would be a real image URL
      })),
    })
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

