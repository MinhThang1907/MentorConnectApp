'use client';

import {createContext, useContext, useState, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import auth from '@react-native-firebase/auth';
import sessionService from '../services/sessionService';

const SessionContext = createContext({});

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider = ({children}) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [sessionValid, setSessionValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const activityInterval = useRef(null);

  useEffect(() => {
    initializeSession();

    // Set up app state change listener
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
      clearActivityInterval();
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async user => {
      if (user) {
        await initializeSession();
      } else {
        clearSession();
      }
    });

    return unsubscribe;
  }, []);

  const initializeSession = async () => {
    try {
      setLoading(true);

      // Initialize device ID
      const deviceId = await sessionService.initializeDeviceId();
      setDeviceId(deviceId);

      const user = auth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Validate existing session
      const isValid = await sessionService.validateSession();

      if (isValid) {
        // Update session activity
        await sessionService.updateSessionActivity();
        setSessionValid(true);
        setCurrentSession(sessionService.getCurrentSession());
      } else {
        // Create new session
        const newSession = await sessionService.createOrUpdateSession();
        setCurrentSession(newSession);
        setSessionValid(!!newSession);
      }

      // Start activity tracking
      startActivityTracking();
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    setCurrentSession(null);
    setSessionValid(false);
    clearActivityInterval();
  };

  const startActivityTracking = () => {
    // Update session activity every 5 minutes
    activityInterval.current = setInterval(async () => {
      const user = auth().currentUser;
      if (user && sessionValid) {
        await sessionService.updateSessionActivity();
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  const clearActivityInterval = () => {
    if (activityInterval.current) {
      clearInterval(activityInterval.current);
      activityInterval.current = null;
    }
  };

  const handleAppStateChange = async nextAppState => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App has come to the foreground
      const user = auth().currentUser;
      if (user) {
        // Validate session when app becomes active
        const isValid = await sessionService.validateSession();
        setSessionValid(isValid);

        if (isValid) {
          // Update session activity
          await sessionService.updateSessionActivity();
          setCurrentSession(sessionService.getCurrentSession());
        } else {
          // Session is invalid, sign out
          await auth().signOut();
          clearSession();
        }
      }
    } else if (
      nextAppState.match(/inactive|background/) &&
      appState.current === 'active'
    ) {
      // App is going to background
      const user = auth().currentUser;
      if (user && sessionValid) {
        // Update session activity before going to background
        await sessionService.updateSessionActivity();
      }
    }

    appState.current = nextAppState;
  };

  const getUserSessions = async () => {
    const user = auth().currentUser;
    if (!user) return [];
    return await sessionService.getUserSessions(user.uid);
  };

  const getActiveSessions = async () => {
    const user = auth().currentUser;
    if (!user) return [];
    return await sessionService.getActiveSessions(user.uid);
  };

  const logoutDevice = async deviceId => {
    const user = auth().currentUser;
    if (!user) return;
    await sessionService.logoutDevice(deviceId);
  };

  const logoutAllDevices = async () => {
    const user = auth().currentUser;
    if (!user) return;
    await sessionService.logoutAllDevices();

    // Sign out current user
    await auth().signOut();
    clearSession();
  };

  const signOut = async () => {
    try {
      const user = auth().currentUser;
      if (!user) return;

      // Deactivate current session
      await sessionService.deactivateSession();

      // Sign out from Firebase
      await auth().signOut();

      clearSession();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    currentSession,
    deviceId,
    sessionValid,
    loading,
    getUserSessions,
    getActiveSessions,
    logoutDevice,
    logoutAllDevices,
    signOut,
    refreshSession: initializeSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};
