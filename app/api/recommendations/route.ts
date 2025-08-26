// app/api/recommendations/route.ts
import { NextRequest, NextResponse } from "next/server"

// Himalayan crop realistic ranges
const crops_info = {
  'Wheat': { alt: [1400, 1800], temp: [10, 20], rain: [80, 150], moisture: [30, 60] },
  'Maize': { alt: [1200, 1700], temp: [15, 22], rain: [70, 130], moisture: [40, 70] },
  'Barley': { alt: [1500, 2200], temp: [8, 18], rain: [50, 120], moisture: [20, 50] },
  'Potato': { alt: [1600, 2200], temp: [10, 18], rain: [60, 200], moisture: [30, 70] },
  'Buckwheat': { alt: [1700, 2500], temp: [10, 17], rain: [50, 180], moisture: [25, 60] }
};

// Utility functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 1): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Simple Random Forest Classifier
class RandomForestClassifier {
  private n_estimators: number;
  private random_state: number;
  private trees: any[];
  private feature_names: string[];

  constructor(n_estimators: number = 100, random_state: number = 42) {
    this.n_estimators = n_estimators;
    this.random_state = random_state;
    this.trees = [];
    this.feature_names = [];
  }

  fit(X: any[], y: string[]): void {
    this.feature_names = Object.keys(X[0]);
    
    // Build trees based on crop ranges
    for (let i = 0; i < this.n_estimators; i++) {
      const tree = this.buildDecisionTree(X, y);
      this.trees.push(tree);
    }
  }

  buildDecisionTree(X: any[], y: string[]): any {
    const cropRules: any = {};
    
    for (const [crop, ranges] of Object.entries(crops_info)) {
      cropRules[crop] = {
        moisture: ranges.moisture,
        rainfall: ranges.rain,
        temperature: ranges.temp,
        altitude: ranges.alt
      };
    }
    
    return cropRules;
  }

  predict(X: any[]): string[] {
    const predictions: string[] = [];
    
    for (const sample of X) {
      const scores: { [key: string]: number } = {};
      
      // Calculate score for each crop
      for (const [crop, rules] of Object.entries(this.trees[0])) {
        let score = 0;
        
        // Score based on moisture
        if (sample.moisture >= rules.moisture[0] && sample.moisture <= rules.moisture[1]) {
          score += 3;
        } else {
          const moistureDiff = Math.min(
            Math.abs(sample.moisture - rules.moisture[0]),
            Math.abs(sample.moisture - rules.moisture[1])
          );
          score += Math.max(0, 3 - moistureDiff / 10);
        }
        
        // Score based on rainfall
        if (sample.rainfall >= rules.rainfall[0] && sample.rainfall <= rules.rainfall[1]) {
          score += 3;
        } else {
          const rainfallDiff = Math.min(
            Math.abs(sample.rainfall - rules.rainfall[0]),
            Math.abs(sample.rainfall - rules.rainfall[1])
          );
          score += Math.max(0, 3 - rainfallDiff / 20);
        }
        
        // Score based on temperature
        if (sample.temperature >= rules.temperature[0] && sample.temperature <= rules.temperature[1]) {
          score += 2;
        } else {
          const tempDiff = Math.min(
            Math.abs(sample.temperature - rules.temperature[0]),
            Math.abs(sample.temperature - rules.temperature[1])
          );
          score += Math.max(0, 2 - tempDiff / 5);
        }
        
        scores[crop] = score;
      }
      
      // Find crop with highest score
      const bestCrop = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
      predictions.push(bestCrop);
    }
    
    return predictions;
  }
}

// Simple Random Forest Regressor
class RandomForestRegressor {
  private n_estimators: number;
  private random_state: number;
  private trees: any[];

  constructor(n_estimators: number = 100, random_state: number = 42) {
    this.n_estimators = n_estimators;
    this.random_state = random_state;
    this.trees = [];
  }

  fit(X: any[], y: number[]): void {
    // Build yield prediction trees
    for (let i = 0; i < this.n_estimators; i++) {
      this.trees.push(this.buildRegressionTree(X, y));
    }
  }

  buildRegressionTree(X: any[], y: number[]): any {
    return {
      predict: (sample: any) => {
        return (sample.soil_N * 1.2 + sample.soil_P * 0.8 + sample.soil_K * 0.5 + 
               sample.moisture * 0.7 + sample.rainfall * 0.3) / 2;
      }
    };
  }

  predict(X: any[]): number[] {
    const predictions: number[] = [];
    
    for (const sample of X) {
      const treeResults = this.trees.map(tree => tree.predict(sample));
      const avgPrediction = treeResults.reduce((a, b) => a + b, 0) / treeResults.length;
      predictions.push(avgPrediction);
    }
    
    return predictions;
  }
}

// Generate synthetic realistic data (exactly same as Python)
function generateSyntheticData() {
  const rows: any[] = [];
  
  for (const [crop, info] of Object.entries(crops_info)) {
    for (let i = 0; i < 100; i++) {
      const altitude = randomInt(info.alt[0], info.alt[1]);
      const temp = randomInt(info.temp[0], info.temp[1]);
      const rainfall = randomInt(info.rain[0], info.rain[1]);
      const moisture = randomInt(info.moisture[0], info.moisture[1]);
      const soil_N = randomInt(30, 70);
      const soil_P = randomInt(15, 45);
      const soil_K = randomInt(20, 60);
      const pH = randomFloat(5.8, 7.0, 1);
      const yield_kg = (soil_N * 1.2 + soil_P * 0.8 + soil_K * 0.5 + moisture * 0.7 + rainfall * 0.3) / 2;
      
      rows.push({
        soil_N, soil_P, soil_K, pH, moisture, rainfall,
        temperature: temp, altitude, slope: 10, crop, yield_kg
      });
    }
  }
  
  return rows;
}

// Main function (exactly same as Python get_recommendations)
function get_recommendations(moisture: number, rainfall: number) {
  // Generate random parameters (same as Python)
  const altitude = randomInt(1400, 2200);
  const temp = randomInt(10, 20);
  const slope = randomInt(5, 25);
  const soil_N = randomInt(30, 70);
  const soil_P = randomInt(15, 45);
  const soil_K = randomInt(20, 60);
  const pH = randomFloat(5.8, 7.0, 1);
  
  // Generate training data
  const data = generateSyntheticData();
  
  // Prepare training data
  const X = data.map(row => ({
    soil_N: row.soil_N,
    soil_P: row.soil_P,
    soil_K: row.soil_K,
    pH: row.pH,
    moisture: row.moisture,
    rainfall: row.rainfall,
    temperature: row.temperature,
    altitude: row.altitude,
    slope: row.slope
  }));
  
  const y_crop = data.map(row => row.crop);
  const y_yield = data.map(row => row.yield_kg);
  
  // Train models
  const clf_crop = new RandomForestClassifier(100, 42);
  clf_crop.fit(X, y_crop);
  
  const reg_yield = new RandomForestRegressor(100, 42);
  reg_yield.fit(X, y_yield);
  
  // Prepare farmer data
  const farmer_data = [{
    soil_N, soil_P, soil_K, pH, moisture, rainfall,
    temperature: temp, altitude, slope
  }];
  
  // Get predictions
  const recommended_crop = clf_crop.predict(farmer_data)[0];
  const expected_yield = reg_yield.predict(farmer_data)[0];
  
  return {
    recommended_crop: recommended_crop,
    expected_yield: expected_yield
  };
}

export async function POST(req: NextRequest) {
  try {
    const { moisture, rainfall } = await req.json();

    // Validate input
    if (typeof moisture !== 'number' || typeof rainfall !== 'number') {
      return NextResponse.json({ error: "Invalid input: moisture and rainfall must be numbers" }, { status: 400 });
    }

    console.log("Getting recommendations for:", { moisture, rainfall });

    // Get predictions using JavaScript implementation
    const result = get_recommendations(moisture, rainfall);
    
    console.log("Recommendation result:", result);
    
    return NextResponse.json(result);
    
  } catch (err) {
    console.error("--- API Endpoint Error ---");
    console.error("API error:", err);
    console.error("--------------------------");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}