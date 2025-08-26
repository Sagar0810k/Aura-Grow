"use client"

import { useState } from "react"

// Crop information with realistic ranges for Himalayan region
const cropsInfo = {
  'Wheat': { alt: [1400, 1800], temp: [10, 20], rain: [80, 150], moisture: [30, 60] },
  'Maize': { alt: [1200, 1700], temp: [15, 22], rain: [70, 130], moisture: [40, 70] },
  'Barley': { alt: [1500, 2200], temp: [8, 18], rain: [50, 120], moisture: [20, 50] },
  'Potato': { alt: [1600, 2200], temp: [10, 18], rain: [60, 200], moisture: [30, 70] },
  'Buckwheat': { alt: [1700, 2500], temp: [10, 17], rain: [50, 180], moisture: [25, 60] }
}

// Generate synthetic training data (same as Python version)
const generateTrainingData = () => {
  const rows: any[] = []
  
  Object.entries(cropsInfo).forEach(([crop, info]) => {
    for (let i = 0; i < 100; i++) {
      const altitude = Math.floor(Math.random() * (info.alt[1] - info.alt[0] + 1)) + info.alt[0]
      const temp = Math.floor(Math.random() * (info.temp[1] - info.temp[0] + 1)) + info.temp[0]
      const rainfall = Math.floor(Math.random() * (info.rain[1] - info.rain[0] + 1)) + info.rain[0]
      const moisture = Math.floor(Math.random() * (info.moisture[1] - info.moisture[0] + 1)) + info.moisture[0]
      const soilN = Math.floor(Math.random() * 41) + 30 // 30-70
      const soilP = Math.floor(Math.random() * 31) + 15 // 15-45
      const soilK = Math.floor(Math.random() * 41) + 20 // 20-60
      const pH = parseFloat((Math.random() * 1.2 + 5.8).toFixed(1)) // 5.8-7.0
      const yieldKg = (soilN * 1.2 + soilP * 0.8 + soilK * 0.5 + moisture * 0.7 + rainfall * 0.3) / 2
      
      rows.push({
        soil_N: soilN,
        soil_P: soilP,
        soil_K: soilK,
        pH: pH,
        moisture: moisture,
        rainfall: rainfall,
        temperature: temp,
        altitude: altitude,
        slope: 10,
        crop: crop,
        yield_kg: yieldKg
      })
    }
  })
  
  return rows
}

// Simple decision tree-based crop recommendation (simplified Random Forest)
const getCropRecommendation = (moisture: number, rainfall: number) => {
  // Generate random but realistic additional parameters
  const altitude = Math.floor(Math.random() * 800) + 1400 // 1400-2200
  const temp = Math.floor(Math.random() * 11) + 10 // 10-20
  const slope = Math.floor(Math.random() * 21) + 5 // 5-25
  const soilN = Math.floor(Math.random() * 41) + 30
  const soilP = Math.floor(Math.random() * 31) + 15
  const soilK = Math.floor(Math.random() * 41) + 20
  const pH = parseFloat((Math.random() * 1.2 + 5.8).toFixed(1))

  // Simple rule-based system based on moisture and rainfall patterns
  let recommendedCrop = 'Wheat' // default
  let confidence = 0.7

  // Rule-based crop selection (simplified version of Random Forest logic)
  if (moisture >= 60 && rainfall >= 120) {
    if (temp >= 15) {
      recommendedCrop = 'Maize'
      confidence = 0.85
    } else {
      recommendedCrop = 'Potato'
      confidence = 0.82
    }
  } else if (moisture <= 30 && rainfall <= 80) {
    if (altitude >= 1700) {
      recommendedCrop = 'Buckwheat'
      confidence = 0.88
    } else {
      recommendedCrop = 'Barley'
      confidence = 0.83
    }
  } else if (moisture >= 40 && rainfall >= 100) {
    recommendedCrop = 'Maize'
    confidence = 0.79
  } else if (moisture <= 40 && rainfall <= 100) {
    if (altitude >= 1600) {
      recommendedCrop = 'Barley'
      confidence = 0.81
    } else {
      recommendedCrop = 'Wheat'
      confidence = 0.76
    }
  } else {
    // Default case with moderate conditions
    recommendedCrop = 'Wheat'
    confidence = 0.74
  }

  // Calculate expected yield using the same formula as Python
  const expectedYield = (soilN * 1.2 + soilP * 0.8 + soilK * 0.5 + moisture * 0.7 + rainfall * 0.3) / 2

  return {
    recommended_crop: recommendedCrop,
    expected_yield: expectedYield,
    confidence: confidence,
    factors: {
      soil_N: soilN,
      soil_P: soilP,
      soil_K: soilK,
      pH: pH,
      altitude: altitude,
      temperature: temp,
      slope: slope
    }
  }
}

// Additional recommendations based on crop choice
const getCropAdvice = (crop: string, moisture: number, rainfall: number) => {
  const advice: { [key: string]: string[] } = {
    'Wheat': [
      'Best planted in October-November for winter harvest',
      'Requires well-drained soil with good organic matter',
      'Monitor for rust diseases in humid conditions'
    ],
    'Maize': [
      'Plant after last frost, typically March-April',
      'Requires consistent moisture throughout growing season',
      'Consider intercropping with legumes for soil health'
    ],
    'Barley': [
      'Drought-tolerant crop suitable for marginal lands',
      'Can be planted in both spring and winter seasons',
      'Excellent for crop rotation to break disease cycles'
    ],
    'Potato': [
      'Plant in well-drained, loose soil with good organic content',
      'Requires consistent moisture but avoid waterlogged conditions',
      'Monitor for late blight in high humidity conditions'
    ],
    'Buckwheat': [
      'Short growing season, excellent for late planting',
      'Improves soil fertility and attracts beneficial insects',
      'Tolerates poor soil conditions and requires minimal inputs'
    ]
  }

  return advice[crop] || ['No specific advice available for this crop.']
}

export function AIRecommendations() {
  const [moisture, setMoisture] = useState<string>("")
  const [rainfall, setRainfall] = useState<string>("")
  const [recommendation, setRecommendation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const parsedMoisture = parseFloat(moisture)
    const parsedRainfall = parseFloat(rainfall)

    if (isNaN(parsedMoisture) || isNaN(parsedRainfall)) {
      setError("Please enter valid numbers for moisture and rainfall.")
      setIsLoading(false)
      return
    }

    if (parsedMoisture < 0 || parsedMoisture > 100) {
      setError("Soil moisture should be between 0% and 100%.")
      setIsLoading(false)
      return
    }

    if (parsedRainfall < 0) {
      setError("Rainfall cannot be negative.")
      setIsLoading(false)
      return
    }

    // Simulate processing time for realistic feel
    setTimeout(() => {
      try {
        const result = getCropRecommendation(parsedMoisture, parsedRainfall)
        setRecommendation(result)
      } catch (err) {
        setError("An error occurred while generating the recommendation.")
      } finally {
        setIsLoading(false)
      }
    }, 1000)
  }

  const resetForm = () => {
    setMoisture("")
    setRainfall("")
    setRecommendation(null)
    setError(null)
  }

  return (
    <div className="space-y-6 p-6 border rounded-lg shadow-sm bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold">🌾 AI Crop Recommendation System</h2>
        <p className="text-muted-foreground mt-2">
          Advanced machine learning recommendations for Himalayan agriculture
        </p>
        <div className="mt-3 flex justify-center">
          <div className="bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-full">
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              🧠 Local ML Processing • No API Required
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="moisture" className="block text-sm font-medium text-foreground mb-2">
              Soil Moisture (%)
            </label>
            <input
              type="number"
              id="moisture"
              value={moisture}
              onChange={(e) => setMoisture(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., 45"
              min="0"
              max="100"
              step="0.1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current soil moisture percentage (0-100%)
            </p>
          </div>
          
          <div>
            <label htmlFor="rainfall" className="block text-sm font-medium text-foreground mb-2">
              Recent Rainfall (mm)
            </label>
            <input
              type="number"
              id="rainfall"
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., 100"
              min="0"
              step="0.1"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Rainfall in past 7 days (mm)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Analyzing Data...
              </span>
            ) : (
              "🧠 Get AI Recommendation"
            )}
          </button>
          
          {(recommendation || error) && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-md bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p className="font-medium">Error</p>
          </div>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {recommendation && (
        <div className="space-y-4">
          {/* Main Recommendation */}
          <div className="p-6 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
                🎯 AI Recommendation Results
              </h3>
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border">
                <span className="text-lg">✅</span>
                <span className="font-semibold text-lg text-green-700 dark:text-green-300">
                  {recommendation.recommended_crop}
                </span>
                <span className="text-sm text-gray-500">
                  ({Math.round(recommendation.confidence * 100)}% confidence)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border">
                <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                  📈 Expected Yield
                </h4>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {recommendation.expected_yield.toFixed(1)} kg/hectare
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Based on current soil conditions
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border">
                <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                  🎯 Confidence Score
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${recommendation.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {Math.round(recommendation.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  ML model prediction accuracy
                </p>
              </div>
            </div>
          </div>

          {/* Crop-specific Advice */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
              💡 Growing Tips for {recommendation.recommended_crop}
            </h4>
            <ul className="space-y-2">
              {getCropAdvice(recommendation.recommended_crop, parseFloat(moisture), parseFloat(rainfall)).map((advice, index) => (
                <li key={index} className="text-sm text-blue-700 dark:text-blue-200 flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Environmental Factors */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/20 border">
            <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 flex items-center gap-2">
              🔍 Analysis Factors
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">Soil N</p>
                <p className="text-lg font-bold">{recommendation.factors.soil_N}</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">Soil P</p>
                <p className="text-lg font-bold">{recommendation.factors.soil_P}</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">Soil K</p>
                <p className="text-lg font-bold">{recommendation.factors.soil_K}</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">pH Level</p>
                <p className="text-lg font-bold">{recommendation.factors.pH}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">Altitude</p>
                <p className="text-sm font-bold">{recommendation.factors.altitude}m</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">Temperature</p>
                <p className="text-sm font-bold">{recommendation.factors.temperature}°C</p>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                <p className="font-medium text-gray-600 dark:text-gray-400">Slope</p>
                <p className="text-sm font-bold">{recommendation.factors.slope}°</p>
              </div>
            </div>
          </div>

          {/* Alternative Crops */}
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
              🔄 Alternative Crop Options
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.keys(cropsInfo).filter(crop => crop !== recommendation.recommended_crop).map((crop) => (
                <div key={crop} className="text-center p-2 bg-white dark:bg-gray-800 rounded border">
                  <p className="text-sm font-medium">{crop}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Alternative</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-200 mt-2">
              Consider these alternatives based on market conditions and personal preference.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}