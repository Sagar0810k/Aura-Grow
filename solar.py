import pandas as pd
import random
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

# Himalayan crop realistic ranges
crops_info = {
    'Wheat':     {'alt': (1400,1800), 'temp': (10,20), 'rain': (80,150), 'moisture': (30,60)},
    'Maize':     {'alt': (1200,1700), 'temp': (15,22), 'rain': (70,130), 'moisture': (40,70)},
    'Barley':    {'alt': (1500,2200), 'temp': (8,18),  'rain': (50,120), 'moisture': (20,50)},
    'Potato':    {'alt': (1600,2200), 'temp': (10,18),'rain': (60,200), 'moisture': (30,70)},
    'Buckwheat': {'alt': (1700,2500), 'temp': (10,17),'rain': (50,180), 'moisture': (25,60)}
}

# -----------------------------
# Step 1: Generate synthetic realistic data
# -----------------------------
rows = []
for crop, info in crops_info.items():
    for _ in range(100):
        altitude = random.randint(*info['alt'])
        temp = random.randint(*info['temp'])
        rainfall = random.randint(*info['rain'])
        moisture = random.randint(*info['moisture'])
        soil_N = random.randint(30,70)
        soil_P = random.randint(15,45)
        soil_K = random.randint(20,60)
        pH = round(random.uniform(5.8,7.0),1)
        solar_azimuth = random.randint(0,360)
        solar_elevation = random.randint(0,90)
        yield_kg = (soil_N*1.2 + soil_P*0.8 + soil_K*0.5 + moisture*0.7 + rainfall*0.3 + solar_elevation*0.5)/2
        rows.append([soil_N, soil_P, soil_K, pH, moisture, rainfall, temp, altitude, 10, solar_azimuth, solar_elevation, crop, yield_kg])

df = pd.DataFrame(rows, columns=['soil_N','soil_P','soil_K','pH','moisture','rainfall','temperature',
                                 'altitude','slope','solar_azimuth','solar_elevation','crop','yield_kg'])

# -----------------------------
# Step 2: Train ML Models
# -----------------------------
X = df[['soil_N','soil_P','soil_K','pH','moisture','rainfall','temperature',
        'altitude','slope','solar_azimuth','solar_elevation']]
y_crop = df['crop']
y_yield = df['yield_kg']

clf_crop = RandomForestClassifier(n_estimators=100, random_state=42)
clf_crop.fit(X, y_crop)

reg_yield = RandomForestRegressor(n_estimators=100, random_state=42)
reg_yield.fit(X, y_yield)

# -----------------------------
# Step 3: Farmer input & prediction
# -----------------------------
print("🌾 Himalayan Crop Recommendation System (Colab Version)")

moisture = float(input("Enter soil moisture %: "))
rainfall = float(input("Enter recent rainfall (mm): "))
solar_azimuth = float(input("Enter solar azimuth (0-360°): "))
solar_elevation = float(input("Enter solar elevation (0-90°): "))

# Auto-generate other realistic Himalayan features
altitude = random.randint(1400,2200)
temp = random.randint(10,20)
slope = random.randint(5,25)
soil_N = random.randint(30,70)
soil_P = random.randint(15,45)
soil_K = random.randint(20,60)
pH = round(random.uniform(5.8,7.0),1)

farmer_data = pd.DataFrame([[soil_N, soil_P, soil_K, pH, moisture, rainfall, temp,
                             altitude, slope, solar_azimuth, solar_elevation]],
                           columns=X.columns)

recommended_crop = clf_crop.predict(farmer_data)[0]
expected_yield = reg_yield.predict(farmer_data)[0]

print(f"\n✅ Recommended Crop: {recommended_crop}")
print(f"📈 Expected Yield: {expected_yield:.2f} kg/hectare")
print(f"🌞 Solar Azimuth: {solar_azimuth}°, Solar Elevation: {solar_elevation}°")
