# crop_recommender.py

import pandas as pd
import random
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import json
import sys

# Himalayan crop realistic ranges
crops_info = {
    'Wheat':     {'alt': (1400,1800), 'temp': (10,20), 'rain': (80,150), 'moisture': (30,60)},
    'Maize':     {'alt': (1200,1700), 'temp': (15,22), 'rain': (70,130), 'moisture': (40,70)},
    'Barley':    {'alt': (1500,2200), 'temp': (8,18),  'rain': (50,120), 'moisture': (20,50)},
    'Potato':    {'alt': (1600,2200), 'temp': (10,18),'rain': (60,200), 'moisture': (30,70)},
    'Buckwheat': {'alt': (1700,2500), 'temp': (10,17),'rain': (50,180), 'moisture': (25,60)}
}

# Step 1: Generate synthetic realistic data
rows = []
for crop, info in crops_info.items():
    for _ in range(100):  # 100 samples per crop
        altitude = random.randint(*info['alt'])
        temp = random.randint(*info['temp'])
        rainfall = random.randint(*info['rain'])
        moisture = random.randint(*info['moisture'])
        soil_N = random.randint(30,70)
        soil_P = random.randint(15,45)
        soil_K = random.randint(20,60)
        pH = round(random.uniform(5.8,7.0),1)
        yield_kg = (soil_N*1.2 + soil_P*0.8 + soil_K*0.5 + moisture*0.7 + rainfall*0.3)/2
        rows.append([soil_N, soil_P, soil_K, pH, moisture, rainfall, temp, altitude, 10, crop, yield_kg])

df = pd.DataFrame(rows, columns=['soil_N','soil_P','soil_K','pH','moisture','rainfall','temperature','altitude','slope','crop','yield_kg'])

# Step 2: Train ML Models
X = df[['soil_N','soil_P','soil_K','pH','moisture','rainfall','temperature','altitude','slope']]
y_crop = df['crop']
y_yield = df['yield_kg']

clf_crop = RandomForestClassifier(n_estimators=100, random_state=42)
clf_crop.fit(X, y_crop)

reg_yield = RandomForestRegressor(n_estimators=100, random_state=42)
reg_yield.fit(X, y_yield)

# Step 3: Function to get predictions
def get_recommendations(moisture, rainfall):
    altitude = random.randint(1400,2200)
    temp = random.randint(10,20)
    slope = random.randint(5,25)
    soil_N = random.randint(30,70)
    soil_P = random.randint(15,45)
    soil_K = random.randint(20,60)
    pH = round(random.uniform(5.8,7.0),1)
    
    farmer_data = pd.DataFrame([[soil_N, soil_P, soil_K, pH, moisture, rainfall, temp, altitude, slope]],
                               columns=X.columns)

    recommended_crop = clf_crop.predict(farmer_data)[0]
    expected_yield = reg_yield.predict(farmer_data)[0]
    
    return {
        'recommended_crop': recommended_crop,
        'expected_yield': expected_yield
    }

# Main execution for API
if __name__ == '__main__':
    # Read input from stdin (sent by the API endpoint)
    input_data = json.loads(sys.stdin.read())
    moisture = float(input_data['moisture'])
    rainfall = float(input_data['rainfall'])
    
    # Get predictions
    result = get_recommendations(moisture, rainfall)
    
    # Print the result as a JSON string to stdout
    print(json.dumps(result))