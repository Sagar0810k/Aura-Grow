"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SensorMap } from "@/components/sensor-map"
import { SensorChart } from "@/components/sensor-chart"
import { NotificationSystem } from "@/components/notification-system"
import { AIRecommendations } from "@/components/ai-recommendations"
import { Droplets, Thermometer, Gauge, Zap, MapPin, Activity, Brain, Wifi, WifiOff, Settings } from "lucide-react"

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
  device_info?: {
    ip: string
    mac: string
    rssi: number
    uptime: number
  }
  connection_status: 'connected' | 'disconnected' | 'error'
  last_updated: string
}

interface SensorReading {
  sensor_id: string
  value: number
  unit: string
  timestamp: string
  status: string
  raw_reading?: number
}

interface DeviceInfo {
  device_id: string
  device_name: string
  device_type: string
  firmware_version: string
  ip_address: string
  mac_address: string
  wifi_ssid: string
  wifi_rssi: number
  uptime_ms: number
  free_heap: number
  chip_id: number
}

export function Dashboard() {
  const [isPumpActive, setIsPumpActive] = useState(false)
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ESP8266 Configuration
  const [esp8266IPs, setEsp8266IPs] = useState<string[]>(['192.168.122.79']) // Updated to your ESP IP
  const [newIP, setNewIP] = useState('')
  const [refreshInterval, setRefreshInterval] = useState(5000) // 5 seconds
  const [showSettings, setShowSettings] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  
  // Add debug logging
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugInfo(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]) // Keep last 10 logs
  }

  // Fetch data from a single ESP8266 device
  const fetchESP8266Data = async (ip: string): Promise<Sensor | null> => {
    addDebugLog(`Attempting to fetch data from ${ip}`)
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 8000) // Increased to 8 seconds for better reliability

      addDebugLog(`Making HTTP request to http://${ip}/`)
      
      const response = await fetch(`http://${ip}/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
      })

      clearTimeout(timeoutId)
      
      addDebugLog(`Response received from ${ip}: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      addDebugLog(`Successfully parsed JSON data from ${ip}`)
      
      // Create historical data array (ESP8266 only provides current reading)
      const currentTime = new Date().toISOString()
      const historical_data = []
      
      // Generate some mock historical data for the chart
      // In a real implementation, you'd store this data in a database
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
        const variation = (Math.random() - 0.5) * 10
        let historicalValue = data.latest_reading.value + variation
        
        if (data.type === 'soil_moisture') {
          historicalValue = Math.max(0, Math.min(100, historicalValue))
        }
        
        historical_data.push({
          timestamp,
          value: Number(historicalValue.toFixed(1)),
          unit: data.latest_reading.unit
        })
      }

      const sensorData = {
        id: data.id,
        name: data.name,
        type: data.type,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        status: data.status,
        latest_reading: {
          value: data.latest_reading.value,
          unit: data.latest_reading.unit,
          timestamp: data.latest_reading.timestamp
        },
        historical_data,
        device_info: data.device_info,
        connection_status: 'connected' as const,
        last_updated: currentTime
      }
      
      addDebugLog(`Successfully created sensor object for ${ip}`)
      return sensorData

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      addDebugLog(`Error fetching from ${ip}: ${errorMessage}`)
      
      // Don't log AbortError as error since it's expected for timeouts
      if (error instanceof Error && error.name === 'AbortError') {
        addDebugLog(`Request to ${ip} timed out after 8 seconds`)
      }
      
      // Return a sensor with error status
      return {
        id: `esp8266_${ip.replace(/\./g, '_')}`,
        name: `ESP8266 (${ip})`,
        type: 'soil_moisture',
        location_lat: 29.375055,
        location_lng: 79.5313,
        status: 'error',
        historical_data: [],
        connection_status: 'disconnected' as const,
        last_updated: new Date().toISOString()
      }
    }
  }

  // Fetch detailed sensor reading
  const fetchSensorReading = async (ip: string): Promise<SensorReading | null> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 5000)

      const response = await fetch(`http://${ip}/sensor`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn(`Failed to fetch sensor reading from ${ip}:`, error.message)
      }
      return null
    }
  }

  // Fetch device information
  const fetchDeviceInfo = async (ip: string): Promise<DeviceInfo | null> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 5000)

      const response = await fetch(`http://${ip}/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn(`Failed to fetch device info from ${ip}:`, error.message)
      }
      return null
    }
  }

  // Load all ESP8266 sensors
  const loadESP8266Sensors = async () => {
    addDebugLog(`Starting sensor load for ${esp8266IPs.length} devices: ${esp8266IPs.join(', ')}`)
    setLoading(true)
    setError(null)

    try {
      const sensorPromises = esp8266IPs.map(ip => fetchESP8266Data(ip))
      const sensorResults = await Promise.allSettled(sensorPromises)
      
      addDebugLog(`Completed ${sensorResults.length} sensor requests`)
      
      const validSensors = sensorResults
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((sensor): sensor is Sensor => sensor !== null)

      addDebugLog(`Found ${validSensors.length} valid sensors`)

      if (validSensors.length === 0) {
        setError('No ESP8266 devices could be reached. Please check:\n• IP addresses are correct\n• Devices are powered on\n• Network connectivity\n• CORS/HTTPS mixed content restrictions')
        addDebugLog('No valid sensors found')
      } else {
        setSensors(validSensors)
        processChartData(validSensors)
        
        // Clear error if we have some connected devices
        const connectedCount = validSensors.filter(s => s.connection_status === 'connected').length
        addDebugLog(`${connectedCount} sensors connected successfully`)
        
        if (connectedCount > 0) {
          setError(null)
        } else {
          setError('All ESP8266 devices are disconnected. Check network connectivity.')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load ESP8266 sensor data: ${errorMessage}`)
      addDebugLog(`Load sensors error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Test connection to ESP8266
  const testConnection = async (ip: string) => {
    addDebugLog(`Testing connection to ${ip}`)
    try {
      const response = await fetch(`http://${ip}/`, {
        method: 'GET',
        mode: 'no-cors', // Try no-cors mode for testing
      })
      addDebugLog(`Test connection to ${ip}: ${response.status || 'no-cors mode'}`)
      return true
    } catch (error) {
      addDebugLog(`Test connection failed for ${ip}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  // Process chart data
  const processChartData = (sensorData: Sensor[]) => {
    const chartData = []

    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0') + ':00'
      const moistureSensor = sensorData.find(s => s.type === 'soil_moisture')
      const tempSensor = sensorData.find(s => s.type === 'temperature')

      chartData.push({
        time: hour,
        moisture: moistureSensor?.historical_data[i]?.value || 0,
        temperature: tempSensor?.historical_data[i]?.value || 0,
      })
    }

    setChartData(chartData)
  }

  // Add new ESP8266 IP
  const addESP8266IP = () => {
    if (newIP && !esp8266IPs.includes(newIP)) {
      setEsp8266IPs([...esp8266IPs, newIP])
      setNewIP('')
    }
  }

  // Remove ESP8266 IP
  const removeESP8266IP = (ip: string) => {
    setEsp8266IPs(esp8266IPs.filter(existingIP => existingIP !== ip))
  }

  // Initial load and periodic updates
  useEffect(() => {
    loadESP8266Sensors()

    const interval = setInterval(() => {
      loadESP8266Sensors()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [esp8266IPs, refreshInterval])

  // Calculate averages and status
  const avgSoilMoisture = sensors
    .filter(s => s.type === 'soil_moisture' && s.latest_reading && s.connection_status === 'connected')
    .reduce((acc, s) => acc + (s.latest_reading?.value || 0), 0) /
    Math.max(sensors.filter(s => s.type === 'soil_moisture' && s.latest_reading && s.connection_status === 'connected').length, 1)

  const avgTemperature = sensors
    .filter(s => s.type === 'temperature' && s.latest_reading && s.connection_status === 'connected')
    .reduce((acc, s) => acc + (s.latest_reading?.value || 0), 0) /
    Math.max(sensors.filter(s => s.type === 'temperature' && s.latest_reading && s.connection_status === 'connected').length, 1)

  const connectedSensors = sensors.filter(s => s.connection_status === 'connected').length
  const totalSensors = sensors.length

  const getMoistureRisk = (moisture: number) => {
    if (moisture < 30) return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' }
    if (moisture < 50) return { level: 'High', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20' }
    if (moisture < 70) return { level: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' }
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low':
        return 'destructive'
      case 'high':
        return 'secondary'
      case 'error':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-400" />
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'soil_moisture':
        return <Droplets className="h-4 w-4" />
      case 'temperature':
        return <Thermometer className="h-4 w-4" />
      case 'air_quality':
        return <Gauge className="h-4 w-4" />
      case 'pir_motion':
        return <Zap className="h-4 w-4" />
      case 'humidity':
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
          <p className="text-muted-foreground">Connecting to ESP8266 sensors...</p>
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
              {connectedSensors}/{totalSensors} Connected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={loadESP8266Sensors} size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-destructive mb-1">Connection Issues</h4>
                  <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
                  <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-2">Troubleshooting Tips:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• Ensure ESP8266 is connected to same network</li>
                      <li>• Check if running on HTTPS (may block HTTP requests)</li>
                      <li>• Verify ESP8266 web server is running</li>
                      <li>• Test direct access: <code className="bg-background px-1 rounded">http://[IP_ADDRESS]/</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle>ESP8266 Configuration</CardTitle>
              <CardDescription>Manage ESP8266 device IP addresses and refresh settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newIP">Add ESP8266 IP Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newIP"
                      placeholder="192.168.122.79"
                      value={newIP}
                      onChange={(e) => setNewIP(e.target.value)}
                    />
                    <Button onClick={addESP8266IP}>Add</Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="refreshInterval">Refresh Interval (ms)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div>
                <Label>Current ESP8266 Devices</Label>
                <div className="space-y-2 mt-2">
                  {esp8266IPs.map((ip) => (
                    <div key={ip} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <span>{ip}</span>
                        {sensors.find(s => s.device_info?.ip === ip) && 
                          getConnectionIcon(sensors.find(s => s.device_info?.ip === ip)?.connection_status || 'disconnected')
                        }
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConnection(ip)}
                        >
                          Test
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`http://${ip}/`, '_blank')}
                        >
                          Open
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeESP8266IP(ip)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Debug Information */}
              <div>
                <Label>Debug Log</Label>
                <div className="mt-2 bg-slate-950 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {debugInfo.length === 0 ? (
                    <p className="text-slate-400 text-sm">No debug information yet...</p>
                  ) : (
                    <div className="space-y-1">
                      {debugInfo.map((log, index) => (
                        <div key={index} className="text-xs text-green-400 font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setDebugInfo([])}
                >
                  Clear Debug Log
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isNaN(avgSoilMoisture) ? '--' : avgSoilMoisture.toFixed(1)}%
              </div>
              {!isNaN(avgSoilMoisture) && (
                <div className={`text-xs px-2 py-1 rounded-full mt-2 ${getMoistureRisk(avgSoilMoisture).bg}`}>
                  <span className={`font-medium ${getMoistureRisk(avgSoilMoisture).color}`}>
                    Risk: {getMoistureRisk(avgSoilMoisture).level}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Temperature</CardTitle>
              <Thermometer className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isNaN(avgTemperature) ? '--' : avgTemperature.toFixed(1)}°C
              </div>
              <p className="text-xs text-muted-foreground">ESP8266 real-time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              {connectedSensors === totalSensors ? 
                <Wifi className="h-4 w-4 text-green-500" /> : 
                <WifiOff className="h-4 w-4 text-red-500" />
              }
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedSensors}/{totalSensors}</div>
              <p className="text-xs text-muted-foreground">Devices online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pump Status</CardTitle>
              <Zap className={`h-4 w-4 ${isPumpActive ? 'text-green-500' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isPumpActive ? 'ON' : 'OFF'}</div>
              <Button
                size="sm"
                variant={isPumpActive ? 'destructive' : 'default'}
                onClick={() => setIsPumpActive(!isPumpActive)}
                className="mt-2"
              >
                {isPumpActive ? 'Turn OFF' : 'Turn ON'}
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
                <Card key={sensor.id} className={sensor.connection_status === 'error' ? 'border-destructive' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getIcon(sensor.type)}
                      {sensor.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {getConnectionIcon(sensor.connection_status)}
                      <Badge variant={getStatusColor(sensor.status)}>{sensor.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sensor.latest_reading?.value?.toFixed(1) || 'N/A'}
                      {sensor.latest_reading?.unit || ''}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Lat: {sensor.location_lat?.toFixed(6)}, Lng: {sensor.location_lng?.toFixed(6)}</p>
                      <p>
                        Last reading: {sensor.latest_reading?.timestamp ? 
                          new Date(sensor.latest_reading.timestamp).toLocaleString() : 
                          'No data'
                        }
                      </p>
                      {sensor.device_info && (
                        <>
                          <p>IP: {sensor.device_info.ip} | RSSI: {sensor.device_info.rssi}dBm</p>
                          <p>MAC: {sensor.device_info.mac}</p>
                          <p>Uptime: {Math.floor(sensor.device_info.uptime / 1000 / 60)} minutes</p>
                        </>
                      )}
                    </div>

                    {sensor.connection_status === 'connected' && sensor.historical_data.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">24-Hour Historical Data</h4>
                          <Badge variant="outline" className="text-xs">
                            {sensor.historical_data.length} readings
                          </Badge>
                        </div>

                        {/* Latest 5 readings */}
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
                                    {reading.value.toFixed(1)}{reading.unit}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-2 text-center">
                            <div className="font-medium text-blue-700 dark:text-blue-300">
                              {Math.min(...sensor.historical_data.map(r => r.value)).toFixed(1)}
                            </div>
                            <div className="text-blue-600 dark:text-blue-400">Min</div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 text-center">
                            <div className="font-medium text-green-700 dark:text-green-300">
                              {(sensor.historical_data.reduce((acc, r) => acc + r.value, 0) / sensor.historical_data.length).toFixed(1)}
                            </div>
                            <div className="text-green-600 dark:text-green-400">Avg</div>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-950/20 rounded p-2 text-center">
                            <div className="font-medium text-orange-700 dark:text-orange-300">
                              {Math.max(...sensor.historical_data.map(r => r.value)).toFixed(1)}
                            </div>
                            <div className="text-orange-600 dark:text-orange-400">Max</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {sensor.connection_status === 'error' && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Connection failed. Check device network connectivity.
                        </p>
                      </div>
                    )}
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
                {chartData.length > 0 ? (
                  <SensorChart data={chartData} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No data available for analytics
                  </div>
                )}
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
                <AIRecommendations />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}