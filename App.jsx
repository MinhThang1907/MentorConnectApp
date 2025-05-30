import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingScreen from './src/screens/LoadingScreen';
import RoleSelectionScreen from './src/screens/auth/RoleSelectionScreen';

const Stack = createStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userListener, setUserListener] = useState(null);

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
            if (doc.exists) {
              const userData = doc.data();
              console.log('User data updated:', userData);
              setUserRole(userData.role || null);
            } else {
              console.log('User document does not exist');
              setUserRole(null);
            }

            if (initializing) setInitializing(false);
            setLoading(false);
          },
          error => {
            console.error('Error listening to user document:', error);
            if (initializing) setInitializing(false);
            setLoading(false);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);

    // Clean up on unmount
    return () => {
      subscriber();
      if (userListener) {
        userListener();
      }
    };
  }, []);

  if (loading) {
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
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
