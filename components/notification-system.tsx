"use client"

import { useEffect, useState } from "react"
import { Bell, X, AlertTriangle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Notification {
  id: string
  title: string
  message: string
  type: "warning" | "critical"
  timestamp: Date
  sensorId: string
  read: boolean
}

interface NotificationSystemProps {
  sensors: Array<{
    id: string
    name: string
    status: string
    value: number
    unit: string
  }>
}

export function NotificationSystem({ sensors }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          setPermission(perm)
        })
      } else {
        setPermission(Notification.permission)
      }
    }
  }, [])

  // Monitor sensor status changes and create notifications
  useEffect(() => {
    sensors.forEach((sensor) => {
      if (sensor.status === "low" || sensor.status === "high") {
        const existingNotification = notifications.find((n) => n.sensorId === sensor.id && !n.read)

        if (!existingNotification) {
          const notification: Notification = {
            id: `${sensor.id}-${Date.now()}`,
            title: sensor.status === "low" ? "Critical Alert" : "Warning Alert",
            message: `${sensor.name}: ${sensor.value}${sensor.unit} - ${
              sensor.status === "low" ? "Critical low reading" : "High reading detected"
            }`,
            type: sensor.status === "low" ? "critical" : "warning",
            timestamp: new Date(),
            sensorId: sensor.id,
            read: false,
          }

          setNotifications((prev) => [notification, ...prev])

          // Send browser push notification
          if (permission === "granted") {
            new Notification(notification.title, {
              body: notification.message,
              icon: "/favicon.ico",
              tag: sensor.id, // Prevents duplicate notifications for same sensor
            })
          }
        }
      }
    })
  }, [sensors, permission, notifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button variant="outline" size="sm" onClick={() => setShowNotifications(!showNotifications)} className="relative">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {showNotifications && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll}>
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      notification.read
                        ? "bg-muted/50"
                        : notification.type === "critical"
                          ? "bg-red-50 border-red-200"
                          : "bg-amber-50 border-amber-200"
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-2">
                      {notification.type === "critical" ? (
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{notification.title}</p>
                          {!notification.read && <div className="h-2 w-2 bg-blue-500 rounded-full" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}




















































































































































































































































































































































































































































































































































