'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, Lightbulb, TrendingDown, Zap, Shield, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAISuggestions, AISuggestion } from '@/lib/api'

interface AIAssistantProps {
    projectId: string
    onApply: (suggestion: AISuggestion) => void
}

export function AIAssistant({ projectId, onApply }: AIAssistantProps) {
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadSuggestions() {
            if (!projectId) return
            setLoading(true)
            try {
                const data = await getAISuggestions(projectId)
                setSuggestions(data.suggestions)
            } catch (error) {
                console.error('Error loading AI suggestions:', error)
            } finally {
                setLoading(false)
            }
        }
        loadSuggestions()
    }, [projectId])

    if (loading) {
        return (
            <Card className="bg-brand-500/5 border-brand-500/20 overflow-hidden relative">
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="w-8 h-8 text-brand-400 animate-spin mb-4" />
                    <p className="text-neutral-400 text-sm animate-pulse">Consulting Design Agent...</p>
                </CardContent>
            </Card>
        )
    }

    if (suggestions.length === 0) return null

    return (
        <Card className="bg-brand-500/5 border-brand-500/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
                <Sparkles className="w-20 h-20 text-brand-500/10 -rotate-12 transform translate-x-8 -translate-y-8" />
            </div>

            <CardHeader className="relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-brand-400" />
                    </div>
                    <CardTitle className="text-white text-lg">AI Recommendations</CardTitle>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 relative z-10">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-brand-500/30 transition-all group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1.5 rounded-md bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors">
                                <Lightbulb className="w-4 h-4 text-brand-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-white">
                                        Optimize {suggestion.field.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] bg-brand-500/10 text-brand-400 border-brand-500/20">
                                        Recommended: {suggestion.value}
                                    </Badge>
                                </div>
                                <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                                    {suggestion.reason}
                                </p>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-[11px] text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 p-0"
                                    onClick={() => onApply(suggestion)}
                                >
                                    Apply Recommendation
                                    <Zap className="w-3 h-3 ml-1.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="pt-2">
                    <p className="text-[10px] text-neutral-500 text-center italic">
                        Suggestions are based on your dataset profile and project objectives.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
