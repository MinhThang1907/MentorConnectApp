'use client';

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/screens/LoadingScreen';
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';
import {SessionProvider, useSession} from './src/contexts/SessionContext';
import SessionGuard from './src/components/SessionGuard';

const Stack = createStackNavigator();

function AppContent() {
  const [initializing, setInitializing] = React.useState(true);
  const [user, setUser] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const [userListener, setUserListener] = React.useState(null);
  const {sessionValid, loading: sessionLoading} = useSession();

  // Handle user state changes
  function onAuthStateChanged(user) {
    setUser(user);

    if (user) {
      // Set up a real-time listener for the user document
      const unsubscribe = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(
          doc => {
            if (doc.exists()) {
              const userData = doc.data();
              setUserRole(userData.role || null);
            } else {
              setUserRole(null);
            }

            if (initializing) setInitializing(false);
          },
          error => {
            console.error('Error listening to user document:', error);
            if (initializing) setInitializing(false);
          },
        );

      // Save the unsubscribe function
      setUserListener(() => unsubscribe);
    } else {
      // Clean up the listener if user is null
      if (userListener) {
        userListener();
        setUserListener(null);
      }

      setUserRole(null);
      if (initializing) setInitializing(false);
    }
  }

  React.useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);

    // Clean up on unmount
    return () => {
      subscriber();
      if (userListener) {
        userListener();
      }
    };
  }, []);

  if (initializing || sessionLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {!user ? (
          // User is not logged in
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : userRole === null ? (
          // User is logged in but hasn't selected a role yet
          <Stack.Screen
            name="RoleSelection"
            component={RoleSelectionScreen}
            options={{gestureEnabled: false}}
          />
        ) : (
          // User is logged in and has a role
          <Stack.Screen name="App">
            {() => (
              <SessionGuard>
                <AppNavigator />
              </SessionGuard>
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
