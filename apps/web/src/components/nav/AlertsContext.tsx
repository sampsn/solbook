'use client'

import { createContext, useContext } from 'react'

const AlertsContext = createContext(false)

export function AlertsProvider({
  children,
  hasUnseenAlerts,
}: {
  children: React.ReactNode
  hasUnseenAlerts: boolean
}) {
  return (
    <AlertsContext.Provider value={hasUnseenAlerts}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useHasUnseenAlerts() {
  return useContext(AlertsContext)
}
