"use client"

import { createContext, useContext, useEffect, useState } from "react"
import auth from "@react-native-firebase/auth"
import firestore from "@react-native-firebase/firestore"
import tokenService from "../services/tokenService"

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tokens, setTokens] = useState(null)
  const [sessionValid, setSessionValid] = useState(false)

  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      // Initialize device ID
      await tokenService.initializeDeviceId()

      // Check for stored tokens
      const storedTokens = await tokenService.getStoredTokens()

      if (storedTokens) {
        // Validate session
        const isValid = await tokenService.validateSession()

        if (isValid) {
          // Try to get valid access token (will refresh if needed)
          try {
            const validToken = await tokenService.getValidAccessToken()
            setTokens({
              accessToken: validToken,
              refreshToken: storedTokens.refreshToken,
            })
            setSessionValid(true)
          } catch (error) {
            console.log("Token refresh failed, requiring re-login")
            await tokenService.clearTokens()
          }
        } else {
          // Session is invalid, clear tokens
          await tokenService.clearTokens()
        }
      }

      // Set up Firebase auth listener
      const unsubscribe = auth().onAuthStateChanged(onAuthStateChanged)

      return unsubscribe
    } catch (error) {
      console.error("Error initializing auth:", error)
      setLoading(false)
    }
  }

  const onAuthStateChanged = async (firebaseUser) => {
    try {
      if (firebaseUser) {
        // Set up user document listener
        const unsubscribeUser = firestore()
          .collection("users")
          .doc(firebaseUser.uid)
          .onSnapshot(
            async (doc) => {
              if (doc.exists) {
                const userData = doc.data()
                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  ...userData,
                })
                setUserRole(userData.role || null)

                // Generate tokens if we don't have valid ones
                if (!sessionValid) {
                  await generateTokens(firebaseUser, userData)
                }
              } else {
                setUser(null)
                setUserRole(null)
                await tokenService.clearTokens()
                setTokens(null)
                setSessionValid(false)
              }
              setLoading(false)
            },
            (error) => {
              console.error("Error listening to user document:", error)
              setLoading(false)
            },
          )

        return unsubscribeUser
      } else {
        // User is signed out
        setUser(null)
        setUserRole(null)
        await tokenService.clearTokens()
        setTokens(null)
        setSessionValid(false)
        setLoading(false)
      }
    } catch (error) {
      console.error("Error in auth state change:", error)
      setLoading(false)
    }
  }

  const generateTokens = async (firebaseUser, userData) => {
    try {
      const accessToken = tokenService.generateAccessToken({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        role: userData.role,
      })

      const refreshToken = tokenService.generateRefreshToken({
        uid: firebaseUser.uid,
      })

      await tokenService.storeTokens(accessToken, refreshToken)

      setTokens({ accessToken, refreshToken })
      setSessionValid(true)
    } catch (error) {
      console.error("Error generating tokens:", error)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const userCredential = await auth().signInWithEmailAndPassword(email, password)

      // Tokens will be generated in the auth state change listener
      return userCredential
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email, password, userData) => {
    try {
      setLoading(true)
      const userCredential = await auth().createUserWithEmailAndPassword(email, password)

      // Create user document
      await firestore()
        .collection("users")
        .doc(userCredential.user.uid)
        .set({
          ...userData,
          email,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        })

      return userCredential
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)

      // Deactivate current session
      await tokenService.deactivateSession()

      // Clear tokens
      await tokenService.clearTokens()

      // Sign out from Firebase
      await auth().signOut()

      setTokens(null)
      setSessionValid(false)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOutAllDevices = async () => {
    try {
      if (!user) return

      setLoading(true)

      // Logout from all devices
      await tokenService.logoutAllDevices(user.uid)

      // Clear local tokens
      await tokenService.clearTokens()

      // Sign out from Firebase
      await auth().signOut()

      setTokens(null)
      setSessionValid(false)
    } catch (error) {
      console.error("Error signing out all devices:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const getValidToken = async () => {
    try {
      return await tokenService.getValidAccessToken()
    } catch (error) {
      console.error("Error getting valid token:", error)
      // If token refresh fails, sign out user
      await signOut()
      throw error
    }
  }

  const getUserSessions = async () => {
    if (!user) return []
    return await tokenService.getUserSessions(user.uid)
  }

  const logoutDevice = async (deviceId) => {
    if (!user) return
    await tokenService.logoutDevice(user.uid, deviceId)
  }

  const updateUserRole = async (role) => {
    try {
      if (!user) return

      await firestore().collection("users").doc(user.uid).update({
        role,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      })

      // Regenerate tokens with new role
      await generateTokens(auth().currentUser, { ...user, role })
    } catch (error) {
      console.error("Error updating user role:", error)
      throw error
    }
  }

  const value = {
    user,
    userRole,
    loading,
    tokens,
    sessionValid,
    signIn,
    signUp,
    signOut,
    signOutAllDevices,
    getValidToken,
    getUserSessions,
    logoutDevice,
    updateUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
