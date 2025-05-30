"use client"

import { useEffect, useRef } from "react"
import { AppState } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import tokenService from "../services/tokenService"

export const useTokenRefresh = () => {
  const { getValidToken, signOut } = useAuth()
  const appState = useRef(AppState.currentState)
  const refreshInterval = useRef(null)

  useEffect(() => {
    // Set up periodic token refresh
    startTokenRefreshInterval()

    // Handle app state changes
    const subscription = AppState.addEventListener("change", handleAppStateChange)

    return () => {
      subscription?.remove()
      clearTokenRefreshInterval()
    }
  }, [])

  const startTokenRefreshInterval = () => {
    // Refresh token every 25 minutes (5 minutes before expiry)
    refreshInterval.current = setInterval(
      async () => {
        try {
          await getValidToken()
          await tokenService.updateSessionActivity()
        } catch (error) {
          console.error("Background token refresh failed:", error)
          // Don't sign out automatically in background refresh
        }
      },
      25 * 60 * 1000,
    ) // 25 minutes
  }

  const clearTokenRefreshInterval = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current)
      refreshInterval.current = null
    }
  }

  const handleAppStateChange = async (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === "active") {
      // App has come to the foreground
      try {
        // Validate session when app becomes active
        const isValid = await tokenService.validateSession()

        if (!isValid) {
          await signOut()
          return
        }

        // Refresh token if needed
        await getValidToken()
        await tokenService.updateSessionActivity()
      } catch (error) {
        console.error("Error refreshing token on app focus:", error)
        await signOut()
      }
    }

    appState.current = nextAppState
  }

  return {
    refreshToken: getValidToken,
  }
}
