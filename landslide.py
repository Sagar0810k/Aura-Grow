import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# ---------- Load dataset ----------
df = pd.read_csv("bhimtal_landslide_prediction.csv")

# Features and target
X = df[['soil_moisture', 'slope_deg', 'rainfall_mm']]
y = df['status']  # Safe, Moderate, High

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ---------- Train model ----------
clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# ---------- Evaluate ----------
y_pred = clf.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# ---------- Predict for new data ----------
# Example: soil_moisture=450, slope=28, rainfall=20
sample = pd.DataFrame([[450, 28, 20]], columns=['soil_moisture', 'slope_deg', 'rainfall_mm'])
predicted_status = clf.predict(sample)[0]
predicted_prob = clf.predict_proba(sample)[0]
print(f"\nPredicted status: {predicted_status}")
print(f"Predicted probabilities (Safe, Moderate, High): {predicted_prob}")
