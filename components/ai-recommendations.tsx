"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Brain, Lightbulb, Droplets, Leaf, Bug, Calendar, MessageSquare, Sparkles } from "lucide-react"

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

interface AIRecommendationsProps {
  recommendations: AIRecommendation[]
}

export function AIRecommendations({ recommendations }: AIRecommendationsProps) {
  const [chatMessage, setChatMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; message: string }>>([])

  const supabase = createClient()

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "irrigation":
        return <Droplets className="h-4 w-4 text-blue-500" />
      case "fertilization":
        return <Leaf className="h-4 w-4 text-green-500" />
      case "pest_control":
        return <Bug className="h-4 w-4 text-red-500" />
      case "harvest":
        return <Calendar className="h-4 w-4 text-orange-500" />
      default:
        return <Lightbulb className="h-4 w-4 text-yellow-500" />
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const handleApplyRecommendation = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from("ai_recommendations")
        .update({ status: "applied" })
        .eq("id", recommendationId)

      if (error) throw error

      // Refresh recommendations would be handled by parent component's subscription
    } catch (err) {
      console.error("Error applying recommendation:", err)
    }
  }

  const handleDismissRecommendation = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from("ai_recommendations")
        .update({ status: "dismissed" })
        .eq("id", recommendationId)

      if (error) throw error
    } catch (err) {
      console.error("Error dismissing recommendation:", err)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    setIsLoading(true)
    const userMessage = chatMessage
    setChatMessage("")

    // Add user message to chat history
    setChatHistory((prev) => [...prev, { role: "user", message: userMessage }])

    try {
      // Placeholder for AI model integration
      // This is where you would integrate with your AI model
      const aiResponse =
        "AI model integration coming soon! This is a placeholder response for your query: " + userMessage

      setChatHistory((prev) => [...prev, { role: "assistant", message: aiResponse }])
    } catch (err) {
      console.error("Error getting AI response:", err)
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", message: "Sorry, I'm having trouble processing your request right now." },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Chat Interface - Placeholder */}
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Chat Assistant
            <Badge variant="secondary" className="ml-2">
              Coming Soon
            </Badge>
          </CardTitle>
          <CardDescription>
            Ask questions about your farm data, get personalized recommendations, and receive expert advice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat History */}
          <div className="min-h-[200px] max-h-[300px] overflow-y-auto border rounded-lg p-4 bg-muted/10">
            {chatHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start a conversation with your AI assistant</p>
                <p className="text-sm mt-1">Try asking: "What should I do about low soil moisture?"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatHistory.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <Input
              placeholder="Ask your AI assistant anything about your farm..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !chatMessage.trim()}>
              {isLoading ? "..." : "Send"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Recommendations</h3>
          <Badge variant="outline">{recommendations.length} pending</Badge>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Brain className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No active recommendations</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your AI assistant will provide suggestions based on sensor data
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getRecommendationIcon(rec.recommendation_type)}
                      <CardTitle className="text-base capitalize">
                        {rec.recommendation_type.replace("_", " ")}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${getConfidenceColor(rec.confidence_score)}`}>
                        {Math.round(rec.confidence_score * 100)}% confidence
                      </span>
                      {rec.sensor && (
                        <Badge variant="outline" className="text-xs">
                          {rec.sensor.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-4">{rec.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDismissRecommendation(rec.id)}>
                        Dismiss
                      </Button>
                      <Button size="sm" onClick={() => handleApplyRecommendation(rec.id)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

































































































