import { useEffect, useState, useCallback, useRef } from 'react'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export interface UseRealtimeOptions {
  table: string
  event?: RealtimeEvent
  filter?: string
  schema?: string
}

export interface RealtimeData<T = any> {
  eventType: RealtimeEvent
  new: T | null
  old: T | null
  errors: string[] | null
}

/**
 * Hook for subscribing to real-time database changes
 */
export const useRealtime = <T = any>(
  options: UseRealtimeOptions,
  callback?: (payload: RealtimeData<T>) => void
) => {
  const [data, setData] = useState<RealtimeData<T> | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const { table, event = '*', filter, schema = 'public' } = options

  useEffect(() => {
    // Create channel name
    const channelName = `realtime:${schema}:${table}${filter ? `:${filter}` : ''}`
    
    // Create channel
    const channel = supabase.channel(channelName)

    // Configure postgres changes listener
    let changesConfig: any = {
      event,
      schema,
      table
    }

    if (filter) {
      changesConfig.filter = filter
    }

    channel
      .on('postgres_changes', changesConfig, (payload: RealtimePostgresChangesPayload<T>) => {
        const realtimeData: RealtimeData<T> = {
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new || null,
          old: payload.old || null,
          errors: payload.errors || null
        }

        setData(realtimeData)
        
        if (callback) {
          callback(realtimeData)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
        setError(null)
      })
      .on('presence', { event: 'join' }, () => {
        setIsConnected(true)
      })
      .on('presence', { event: 'leave' }, () => {
        setIsConnected(false)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError('Failed to connect to real-time channel')
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          setError('Real-time connection timed out')
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
      setData(null)
      setError(null)
    }
  }, [table, event, filter, schema, callback])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsConnected(false)
      setData(null)
      setError(null)
    }
  }, [])

  return {
    data,
    isConnected,
    error,
    unsubscribe
  }
}

/**
 * Hook for subscribing to notifications table changes
 */
export const useNotificationsRealtime = (
  userId?: string,
  callback?: (notification: any) => void
) => {
  const filter = userId ? `user_id=eq.${userId}` : undefined
  
  return useRealtime(
    {
      table: 'notifications',
      event: 'INSERT',
      filter
    },
    callback
  )
}

/**
 * Hook for subscribing to player updates
 */
export const usePlayersRealtime = (
  academyId?: string,
  callback?: (player: any) => void
) => {
  const filter = academyId ? `academy_id=eq.${academyId}` : undefined
  
  return useRealtime(
    {
      table: 'players',
      event: '*',
      filter
    },
    callback
  )
}

/**
 * Hook for subscribing to academy updates
 */
export const useAcademiesRealtime = (callback?: (academy: any) => void) => {
  return useRealtime(
    {
      table: 'academies',
      event: '*'
    },
    callback
  )
}

/**
 * Hook for subscribing to support tickets
 */
export const useSupportTicketsRealtime = (
  userId?: string,
  callback?: (ticket: any) => void
) => {
  const filter = userId ? `user_id=eq.${userId}` : undefined
  
  return useRealtime(
    {
      table: 'support_tickets',
      event: '*',
      filter
    },
    callback
  )
}

/**
 * Hook for presence tracking (who's online)
 */
export const usePresence = (channelName: string, userId?: string) => {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({})
  const [isOnline, setIsOnline] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(channelName)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPresenceState(state)
        setIsOnline(true)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresenceState(prev => ({
          ...prev,
          [key]: newPresences
        }))
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setPresenceState(prev => {
          const newState = { ...prev }
          delete newState[key]
          return newState
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setPresenceState({})
      setIsOnline(false)
    }
  }, [channelName, userId])

  const updatePresence = useCallback(async (data: Record<string, any>) => {
    if (channelRef.current && userId) {
      await channelRef.current.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...data
      })
    }
  }, [userId])

  return {
    presenceState,
    isOnline,
    updatePresence,
    onlineUsers: Object.keys(presenceState).length
  }
}

/**
 * Hook for broadcasting messages to a channel
 */
export const useBroadcast = (channelName: string) => {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const channel = supabase.channel(channelName)

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [channelName])

  const broadcast = useCallback(async (event: string, payload: any) => {
    if (channelRef.current && isConnected) {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      })
    }
  }, [isConnected])

  const subscribe = useCallback((event: string, callback: (payload: any) => void) => {
    if (channelRef.current) {
      channelRef.current.on('broadcast', { event }, callback)
    }
  }, [])

  return {
    broadcast,
    subscribe,
    isConnected
  }
}