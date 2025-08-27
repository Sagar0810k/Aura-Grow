#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// --- WiFi Credentials ---
const char* ssid = "sagar";
const char* password = "jrmk6427";

// --- Device Configuration ---
const String DEVICE_ID = "esp8266_001";
const String DEVICE_NAME = "Soil Moisture Sensor 1";
const String DEVICE_TYPE = "soil_moisture";
const float DEVICE_LAT = 29.375055;
const float DEVICE_LNG = 79.5313;

// --- Hardware Setup ---
int soilPin = A0;

// --- LCD Setup ---
LiquidCrystal_I2C lcd(0x27, 16, 2);

// --- Soil Moisture Calibration ---
const int dry = 1023;
const int wet = 400;

// --- Web Server Setup ---
ESP8266WebServer server(80);

// --- NTP Client for timestamps ---
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000); // Update every minute

// --- Data Storage ---
struct SensorReading {
  float value;
  String unit;
  String timestamp;
  String status;
};

SensorReading currentReading;
unsigned long lastReadingTime = 0;
const unsigned long READING_INTERVAL = 5000; // 5 seconds

// --- Helper Functions ---
String getCurrentTimestamp() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  
  // Convert to ISO 8601 format
  struct tm *ptm = gmtime((time_t *)&epochTime);
  char buffer[32];
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02dZ", 
          ptm->tm_year + 1900, ptm->tm_mon + 1, ptm->tm_mday,
          ptm->tm_hour, ptm->tm_min, ptm->tm_sec);
  
  return String(buffer);
}

String getStatus(int moisturePercent) {
  if (moisturePercent <= 40) {
    return "safe";
  } else if (moisturePercent <= 60) {
    return "low_risk";
  } else if (moisturePercent <= 80) {
    return "medium_risk";
  } else {
    return "high_alert";
  }
}

void readSensor() {
  int rawReading = analogRead(soilPin);
  int moisturePercent = map(rawReading, dry, wet, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);
  
  currentReading.value = moisturePercent;
  currentReading.unit = "%";
  currentReading.timestamp = getCurrentTimestamp();
  currentReading.status = getStatus(moisturePercent);
}

// --- API Endpoints ---
void handleCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  server.send(200, "text/plain", "");
}

void handleRoot() {
  // Add CORS headers
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  
  // Create JSON response
  StaticJsonDocument<300> doc;
  doc["id"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["location_lat"] = DEVICE_LAT;
  doc["location_lng"] = DEVICE_LNG;
  doc["status"] = currentReading.status;
  
  // Latest reading
  JsonObject latest = doc.createNestedObject("latest_reading");
  latest["value"] = currentReading.value;
  latest["unit"] = currentReading.unit;
  latest["timestamp"] = currentReading.timestamp;
  
  // Device info
  JsonObject device_info = doc.createNestedObject("device_info");
  device_info["ip"] = WiFi.localIP().toString();
  device_info["mac"] = WiFi.macAddress();
  device_info["rssi"] = WiFi.RSSI();
  device_info["uptime"] = millis();
  
  String jsonOutput;
  serializeJson(doc, jsonOutput);
  
  server.send(200, "application/json", jsonOutput);
}

void handleSensorData() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Force a fresh reading
  readSensor();
  
  StaticJsonDocument<200> doc;
  doc["sensor_id"] = DEVICE_ID;
  doc["value"] = currentReading.value;
  doc["unit"] = currentReading.unit;
  doc["timestamp"] = currentReading.timestamp;
  doc["status"] = currentReading.status;
  doc["raw_reading"] = analogRead(soilPin);
  
  String jsonOutput;
  serializeJson(doc, jsonOutput);
  
  server.send(200, "application/json", jsonOutput);
}

void handleDeviceInfo() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  StaticJsonDocument<300> doc;
  doc["device_id"] = DEVICE_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["device_type"] = DEVICE_TYPE;
  doc["firmware_version"] = "1.0.0";
  doc["ip_address"] = WiFi.localIP().toString();
  doc["mac_address"] = WiFi.macAddress();
  doc["wifi_ssid"] = WiFi.SSID();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_ms"] = millis();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["chip_id"] = ESP.getChipId();
  
  String jsonOutput;
  serializeJson(doc, jsonOutput);
  
  server.send(200, "application/json", jsonOutput);
}

void handleNotFound() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(404, "application/json", "{\"error\":\"Endpoint not found\"}");
}

// --- Setup Function ---
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP8266 Soil Moisture Monitor ===");
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Aura_Grow v1.0");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(2000);
  
  // Connect to Wi-Fi
  lcd.clear();
  lcd.print("WiFi Connecting");
  lcd.setCursor(0, 1);
  lcd.print(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Update LCD with dots
    if (attempts % 4 == 0) {
      lcd.setCursor(15, 1);
      lcd.print(" ");
    } else {
      lcd.setCursor(15, 1);
      lcd.print(".");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("MAC address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Display connection info on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(3000);
    
    // Initialize NTP client
    timeClient.begin();
    timeClient.update();
    Serial.println("NTP client initialized");
    
    // Setup mDNS
    if (MDNS.begin("esp8266-soil")) {
      Serial.println("mDNS responder started: http://esp8266-soil.local");
    }
    
  } else {
    Serial.println("\nFailed to connect to WiFi");
    lcd.clear();
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check Settings");
    while(1); // Stop execution
  }
  
  // Setup web server routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/sensor", HTTP_GET, handleSensorData);
  server.on("/info", HTTP_GET, handleDeviceInfo);
  server.on("/", HTTP_OPTIONS, handleCORS);
  server.on("/sensor", HTTP_OPTIONS, handleCORS);
  server.on("/info", HTTP_OPTIONS, handleCORS);
  server.onNotFound(handleNotFound);
  
  // Start web server
  server.begin();
  Serial.println("HTTP server started");
  Serial.println("Available endpoints:");
  Serial.println("  GET  /         - Full sensor data");
  Serial.println("  GET  /sensor   - Current reading only");
  Serial.println("  GET  /info     - Device information");
  
  // Take initial reading
  readSensor();
  Serial.println("Initial sensor reading complete");
  
  lcd.clear();
  lcd.print("System Ready!");
  delay(1000);
}

// --- Main Loop ---
void loop() {
  // Handle web server requests
  server.handleClient();
  
  // Handle mDNS
  MDNS.update();
  
  // Update sensor reading periodically
  if (millis() - lastReadingTime >= READING_INTERVAL) {
    readSensor();
    lastReadingTime = millis();
  }
  
  // Update LCD display
  static unsigned long lastLCDUpdate = 0;
  if (millis() - lastLCDUpdate >= 1000) { // Update LCD every second
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Moisture: ");
    lcd.print((int)currentReading.value);
    lcd.print("%");
    
    lcd.setCursor(0, 1);
    lcd.print("Status:");
    String status = currentReading.status;
    if (status == "safe") {
      lcd.print("Safe");
    } else if (status == "low_risk") {
      lcd.print("Low RisK");
    } else if (status == "medium_risk") {
      lcd.print("Mid Risk");
    } else {
      lcd.print("Red ALERT!");
    }
    
    lastLCDUpdate = millis();
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting to reconnect...");
    WiFi.reconnect();
  }
  
  // Small delay to prevent overwhelming the system
  delay(100);
}