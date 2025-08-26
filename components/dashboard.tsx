"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SensorMap } from "@/components/sensor-map"
import { SensorChart } from "@/components/sensor-chart"
import { NotificationSystem } from "@/components/notification-system"
import { AIRecommendations } from "@/components/ai-recommendations"
import { Droplets, Thermometer, Gauge, Zap, MapPin, Activity, Brain } from "lucide-react"

interface Sensor {
  id: string
  name: string
  type: string
  location_lat: number
  location_lng: number
  status: string
  latest_reading?: {
    value: number
    unit: string
    timestamp: string
  }
  historical_data: {
    timestamp: string
    value: number
    unit: string
  }[]
}

interface SensorReading {
  id: string
  sensor_id: string
  value: number
  unit: string
  timestamp: string
}

interface AIRecommendation {
  id: string
  recommendation_type: string
  message: string
  confidence_score: number
  status: string
  created_at: string
  sensor?: {
    name: string
  }
}

const generateESP8266Data = (sensorType: string, baseValue: number) => {
  const data = []
  const now = new Date()

  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    let value = baseValue + (Math.random() - 0.5) * 10

    // Add realistic variations based on sensor type
    if (sensorType === "temperature") {
      value = Math.max(15, Math.min(40, value))
    } else if (sensorType === "soil_moisture") {
      value = Math.max(0, Math.min(100, value))
    } else if (sensorType === "humidity") {
      value = Math.max(30, Math.min(90, value))
    } else if (sensorType === "air_quality") {
      value = Math.max(0, Math.min(500, value))
    } else if (sensorType === "pir_motion") {
      value = Math.random() > 0.9 ? 1 : 0 // 10% chance of motion detection
    }

    data.push({
      timestamp: timestamp.toISOString(),
      value: Number.parseFloat(value.toFixed(1)),
      unit:
        sensorType === "temperature"
          ? "°C"
          : sensorType === "air_quality"
            ? "AQI"
            : sensorType === "pir_motion"
              ? "detected"
              : "%",
    })
  }

  return data
}

const mockESP8266Sensors: Sensor[] = [
  {
    id: "esp8266_001",
    name: "Soil Moisture Sensor 1",
    type: "soil_moisture",
    location_lat: 29.375055,
    location_lng: 79.5313,
    status: "low", // Critical moisture level
    latest_reading: {
      value: 25.2,
      unit: "%",
      timestamp: new Date().toISOString(),
    },
    historical_data: generateESP8266Data("soil_moisture", 25),
  },
  {
    id: "esp8266_002",
    name: "Temperature Sensor 1",
    type: "temperature",
    location_lat: 29.375155,
    location_lng: 79.5314,
    status: "normal",
    latest_reading: {
      value: 28.5,
      unit: "°C",
      timestamp: new Date().toISOString(),
    },
    historical_data: generateESP8266Data("temperature", 28),
  },
  {
    id: "esp8266_003",
    name: "Air Quality Monitor",
    type: "air_quality",
    location_lat: 29.374955,
    location_lng: 79.5312,
    status: "high", // Poor air quality warning
    latest_reading: {
      value: 165.3,
      unit: "AQI",
      timestamp: new Date().toISOString(),
    },
    historical_data: generateESP8266Data("air_quality", 160),
  },
  {
    id: "esp8266_004",
    name: "PIR Motion Detector",
    type: "pir_motion",
    location_lat: 29.375255,
    location_lng: 79.5315,
    status: "normal",
    latest_reading: {
      value: 0,
      unit: "detected",
      timestamp: new Date().toISOString(),
    },
    historical_data: generateESP8266Data("pir_motion", 0),
  },
  {
    id: "esp8266_005",
    name: "Humidity Sensor 1",
    type: "humidity",
    location_lat: 29.375355,
    location_lng: 79.5316,
    status: "normal",
    latest_reading: {
      value: 68.3,
      unit: "%",
      timestamp: new Date().toISOString(),
    },
    historical_data: generateESP8266Data("humidity", 65),
  },
]

export function Dashboard() {
  const [isPumpActive, setIsPumpActive] = useState(false)
  const [sensors, setSensors] = useState<Sensor[]>(mockESP8266Sensors)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const simulateESP8266Updates = () => {
    setSensors((prevSensors) =>
      prevSensors.map((sensor) => ({
        ...sensor,
        latest_reading: {
          ...sensor.latest_reading!,
          value: sensor.latest_reading!.value + (Math.random() - 0.5) * 2,
          timestamp: new Date().toISOString(),
        },
        // Update historical data by adding new reading and removing oldest
        historical_data: [
          ...sensor.historical_data.slice(1),
          {
            timestamp: new Date().toISOString(),
            value: sensor.latest_reading!.value + (Math.random() - 0.5) * 2,
            unit: sensor.latest_reading!.unit,
          },
        ],
      })),
    )
  }

  const processChartData = () => {
    const chartData = []

    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, "0") + ":00"
      const moistureSensor = sensors.find((s) => s.type === "soil_moisture")
      const tempSensor = sensors.find((s) => s.type === "temperature")

      chartData.push({
        time: hour,
        moisture: moistureSensor?.historical_data[i]?.value || 0,
        temperature: tempSensor?.historical_data[i]?.value || 0,
      })
    }

    setChartData(chartData)
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      processChartData()
      setLoading(false)
    }

    loadData()

    const interval = setInterval(() => {
      simulateESP8266Updates()
      processChartData()
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    processChartData()
  }, [sensors])

  const avgSoilMoisture =
    sensors
      .filter((s) => s.type === "soil_moisture" && s.latest_reading)
      .reduce((acc, s) => acc + (s.latest_reading?.value || 0), 0) /
    Math.max(sensors.filter((s) => s.type === "soil_moisture" && s.latest_reading).length, 1)

  const avgTemperature =
    sensors
      .filter((s) => s.type === "temperature" && s.latest_reading)
      .reduce((acc, s) => acc + (s.latest_reading?.value || 0), 0) /
    Math.max(sensors.filter((s) => s.type === "temperature" && s.latest_reading).length, 1)

  const airQualityIndex = sensors.find((s) => s.type === "air_quality" && s.latest_reading)?.latest_reading?.value || 0

  const pirIntrusionDetected =
    sensors.find((s) => s.type === "pir_motion" && s.latest_reading)?.latest_reading?.value || 0

  const getMoistureRisk = (moisture: number) => {
    if (moisture < 30) return { level: "Critical", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" }
    if (moisture < 50) return { level: "High", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" }
    if (moisture < 70) return { level: "Medium", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" }
    return { level: "Low", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" }
  }

  const getAQIStatus = (aqi: number) => {
    if (aqi <= 50) return { level: "Good", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" }
    if (aqi <= 100) return { level: "Moderate", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" }
    if (aqi <= 150)
      return { level: "Unhealthy for Sensitive", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" }
    return { level: "Unhealthy", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "low":
        return "destructive"
      case "high":
        return "secondary"
      default:
        return "default"
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "soil_moisture":
        return <Droplets className="h-4 w-4" />
      case "temperature":
        return <Thermometer className="h-4 w-4" />
      case "air_quality":
        return <Gauge className="h-4 w-4" />
      case "pir_motion":
        return <Zap className="h-4 w-4" />
      case "humidity":
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading ESP8266 sensors...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aura_Grow Dashboard</h1>
            <p className="text-muted-foreground">ESP8266 IoT Sensor Monitoring System</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationSystem sensors={sensors} />
            <Badge variant="outline" className="text-sm">
              <Activity className="h-3 w-3 mr-1" />
              ESP8266 Live Data
            </Badge>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgSoilMoisture.toFixed(1)}%</div>
              <div className={`text-xs px-2 py-1 rounded-full mt-2 ${getMoistureRisk(avgSoilMoisture).bg}`}>
                <span className={`font-medium ${getMoistureRisk(avgSoilMoisture).color}`}>
                  Risk: {getMoistureRisk(avgSoilMoisture).level}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTemperature.toFixed(1)}°C</div>
              <p className="text-xs text-muted-foreground">ESP8266 real-time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Air Quality</CardTitle>
              <Gauge className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{airQualityIndex.toFixed(0)} AQI</div>
              <div className={`text-xs px-2 py-1 rounded-full mt-2 ${getAQIStatus(airQualityIndex).bg}`}>
                <span className={`font-medium ${getAQIStatus(airQualityIndex).color}`}>
                  {getAQIStatus(airQualityIndex).level}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PIR Motion</CardTitle>
              <Zap className={`h-4 w-4 ${pirIntrusionDetected ? "text-red-500" : "text-green-500"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pirIntrusionDetected ? "DETECTED" : "CLEAR"}</div>
              <div
                className={`text-xs px-2 py-1 rounded-full mt-2 ${
                  pirIntrusionDetected ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20"
                }`}
              >
                <span className={`font-medium ${pirIntrusionDetected ? "text-red-600" : "text-green-600"}`}>
                  {pirIntrusionDetected ? "Intrusion Alert" : "Secure"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pump Status</CardTitle>
              <Zap className={`h-4 w-4 ${isPumpActive ? "text-green-500" : "text-gray-400"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isPumpActive ? "ON" : "OFF"}</div>
              <Button
                size="sm"
                variant={isPumpActive ? "destructive" : "default"}
                onClick={() => setIsPumpActive(!isPumpActive)}
                className="mt-2"
              >
                {isPumpActive ? "Turn OFF" : "Turn ON"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="map">Sensor Map</TabsTrigger>
            <TabsTrigger value="sensors">Sensor Data</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  ESP8266 Sensor Locations
                </CardTitle>
                <CardDescription>Real-time ESP8266 sensor locations and status across your farm</CardDescription>
              </CardHeader>
              <CardContent>
                <SensorMap sensors={sensors} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sensors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sensors.map((sensor) => (
                <Card key={sensor.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getIcon(sensor.type)}
                      {sensor.name}
                    </CardTitle>
                    <Badge variant={getStatusColor(sensor.status)}>{sensor.status}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sensor.latest_reading?.value?.toFixed(1) || "N/A"}
                      {sensor.latest_reading?.unit || ""}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lat: {sensor.location_lat?.toFixed(6)}, Lng: {sensor.location_lng?.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last reading:{" "}
                      {sensor.latest_reading?.timestamp
                        ? new Date(sensor.latest_reading.timestamp).toLocaleString()
                        : "No data"}
                    </p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">24-Hour Historical Data</h4>
                        <Badge variant="outline" className="text-xs">
                          {sensor.historical_data.length} readings
                        </Badge>
                      </div>

                      {/* Latest 5 readings in a clean table format */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Recent Readings
                        </h5>
                        <div className="space-y-1">
                          {sensor.historical_data
                            .slice(-5)
                            .reverse()
                            .map((reading, index) => (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(reading.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="font-mono font-medium">
                                  {reading.value.toFixed(1)}
                                  {reading.unit}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-2 text-center">
                          <div className="font-medium text-blue-700 dark:text-blue-300">
                            {Math.min(...sensor.historical_data.map((r) => r.value)).toFixed(1)}
                          </div>
                          <div className="text-blue-600 dark:text-blue-400">Min</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 text-center">
                          <div className="font-medium text-green-700 dark:text-green-300">
                            {(
                              sensor.historical_data.reduce((acc, r) => acc + r.value, 0) /
                              sensor.historical_data.length
                            ).toFixed(1)}
                          </div>
                          <div className="text-green-600 dark:text-green-400">Avg</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded p-2 text-center">
                          <div className="font-medium text-orange-700 dark:text-orange-300">
                            {Math.max(...sensor.historical_data.map((r) => r.value)).toFixed(1)}
                          </div>
                          <div className="text-orange-600 dark:text-orange-400">Max</div>
                        </div>
                      </div>

                      {/* Expandable full JSON data */}
                      <details className="group">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2 py-2">
                          <span className="group-open:rotate-90 transition-transform">▶</span>
                          View Full JSON Data
                        </summary>
                        <div className="mt-2 bg-slate-950 dark:bg-slate-900 rounded-lg p-3 max-h-64 overflow-y-auto">
                          <pre className="text-xs text-green-400 font-mono leading-relaxed">
                            {JSON.stringify(
                              {
                                sensor_id: sensor.id,
                                sensor_name: sensor.name,
                                sensor_type: sensor.type,
                                location: {
                                  latitude: sensor.location_lat,
                                  longitude: sensor.location_lng,
                                },
                                current_status: sensor.status,
                                latest_reading: sensor.latest_reading,
                                historical_data: sensor.historical_data,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ESP8266 Sensor Trends</CardTitle>
                <CardDescription>24-hour ESP8266 sensor data trends</CardDescription>
              </CardHeader>
              <CardContent>
                <SensorChart data={chartData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
                <CardDescription>AI-powered recommendations based on ESP8266 sensor data</CardDescription>
              </CardHeader>
              <CardContent>
                <AIRecommendations/>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}