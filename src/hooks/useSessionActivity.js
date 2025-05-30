"use client"

import { useEffect, useRef } from "react"
import { AppState } from "react-native"
import { useSession } from "../contexts/SessionContext"

export const useSessionActivity = () => {
  const { refreshSession, sessionValid } = useSession()
  const appState = useRef(AppState.currentState)
  const activityTimeout = useRef(null)

  useEffect(() => {
    // Handle app state changes
    const subscription = AppState.addEventListener("change", handleAppStateChange)

    return () => {
      subscription?.remove()
      if (activityTimeout.current) {
        clearTimeout(activityTimeout.current)
      }
    }
  }, [sessionValid])

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      // App has come to the foreground
      if (sessionValid) {
        // Refresh session when app becomes active
        refreshSession()
      }
    }

    appState.current = nextAppState
  }

  return {
    refreshSession,
  }
}
