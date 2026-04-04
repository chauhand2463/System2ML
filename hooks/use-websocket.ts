'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  url?: string
  channel?: string
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnectInterval?: number
  enabled?: boolean
}

interface TrainingUpdate {
  type: 'training_update'
  run_id: string
  status: string
  progress: number
  metrics: {
    loss?: number
    epoch?: number
    step?: number
    total_steps?: number
    learning_rate?: number
    gpu_memory?: number
    carbon_kg?: number
    cost_usd?: number
  }
}

export function useWebSocket({
  url,
  channel = 'training',
  onMessage,
  onConnect,
  onDisconnect,
  reconnectInterval = 5000,
  enabled = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messageHandlersRef = useRef<Set<(data: any) => void>>(new Set())

  const connect = useCallback(() => {
    if (!url || !enabled) return

    const wsUrl = url.includes('ws') ? url : `ws://${url}/ws/${channel}`
    
    try {
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        setConnected(true)
        setError(null)
        onConnect?.()
        ws.send(JSON.stringify({ type: 'ping' }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
          messageHandlersRef.current.forEach(handler => handler(data))
        } catch (e) {
          console.error('WebSocket message parse error:', e)
        }
      }

      ws.onerror = () => {
        setError('Connection error')
      }

      ws.onclose = () => {
        setConnected(false)
        onDisconnect?.()
        
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      wsRef.current = ws
    } catch (e) {
      setError('Failed to connect')
    }
  }, [url, channel, enabled, onConnect, onDisconnect, onMessage, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }, [])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const subscribe = useCallback((handler: (data: any) => void) => {
    messageHandlersRef.current.add(handler)
    return () => { messageHandlersRef.current.delete(handler) }
  }, [])

  useEffect(() => {
    connect()
    return () => { 
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setConnected(false)
    }
  }, [])

  return { connected, error, send, subscribe, reconnect: connect, disconnect }
}

export function useTrainingUpdates(projectId: string | null) {
  const [updates, setUpdates] = useState<TrainingUpdate['metrics']>({})
  const [status, setStatus] = useState<string>('pending')
  const [progress, setProgress] = useState(0)
  const [lossHistory, setLossHistory] = useState<number[]>([])

  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.host}/ws/training`
    : undefined

  const { connected, subscribe } = useWebSocket({
    url: wsUrl,
    channel: 'training',
    enabled: !!projectId,
  })

  useEffect(() => {
    const unsubscribe = subscribe((data: TrainingUpdate) => {
      if (data.run_id === projectId || data.type === 'training_update') {
        setStatus(data.status)
        setProgress(data.progress)
        
        if (data.metrics) {
          setUpdates(prev => ({ ...prev, ...data.metrics }))
          
          if (data.metrics.loss !== undefined) {
            const loss = data.metrics.loss
            setLossHistory(prev => [...prev.slice(-50), loss])
          }
        }
      }
    })

    return unsubscribe
  }, [subscribe, projectId])

  return {
    connected,
    status,
    progress,
    metrics: updates,
    lossHistory,
  }
}
