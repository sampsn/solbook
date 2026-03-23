// apps/mobile/components/AlertsContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { supabase } from '@/lib/supabase'
import { getNotifications } from '@/lib/api'

interface AlertsContextValue {
  hasUnseenAlerts: boolean
  refreshAlerts: () => void
}

const AlertsContext = createContext<AlertsContextValue>({
  hasUnseenAlerts: false,
  refreshAlerts: () => {},
})

export function useHasUnseenAlerts() {
  return useContext(AlertsContext).hasUnseenAlerts
}

export function useRefreshAlerts() {
  return useContext(AlertsContext).refreshAlerts
}

export function AlertsContextProvider({ children }: { children: React.ReactNode }) {
  const [hasUnseenAlerts, setHasUnseenAlerts] = useState(false)

  async function check() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('alerts_last_seen_at')
      .eq('id', user.id)
      .single()

    const lastSeen = profile?.alerts_last_seen_at ?? null
    const notifications = await getNotifications()

    if (notifications.length === 0) {
      setHasUnseenAlerts(false)
      return
    }

    if (!lastSeen) {
      setHasUnseenAlerts(true)
      return
    }

    const hasNew = notifications.some((n) => n.createdAt > lastSeen)
    setHasUnseenAlerts(hasNew)
  }

  const appState = useRef(AppState.currentState)

  useEffect(() => {
    check()

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        check()
      }
      appState.current = nextState
    })

    return () => subscription.remove()
  }, [])

  return (
    <AlertsContext.Provider value={{ hasUnseenAlerts, refreshAlerts: check }}>
      {children}
    </AlertsContext.Provider>
  )
}
