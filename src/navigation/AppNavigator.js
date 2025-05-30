import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Main Screens
import SearchScreen from '../screens/main/SearchScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import CalendarScreen from '../screens/main/CalendarScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Modal Screens
import BookingScreen from '../screens/modals/BookingScreen';
import UserProfileScreen from '../screens/modals/UserProfileScreen';

// Chat Screens
import ChatScreen from '../screens/chat/ChatScreen';

// Onboarding Screen
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const MainStack = createStackNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Search') {
            iconName = 'search';
          } else if (route.name === 'Messages') {
            iconName = 'chat';
          } else if (route.name === 'Calendar') {
            iconName = 'event';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}>
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const MainStackNavigator = () => {
  return (
    <MainStack.Navigator screenOptions={{headerShown: false}}>
      <MainStack.Screen name="MainTabs" component={MainTabNavigator} />
      <MainStack.Screen name="Chat" component={ChatScreen} />
      <MainStack.Screen name="UserProfile" component={UserProfileScreen} />
      <MainStack.Screen
        name="Booking"
        component={BookingScreen}
        options={{presentation: 'modal'}}
      />
      <MainStack.Screen
        name="RoleSelection"
        component={RoleSelectionScreen}
        options={{gestureEnabled: false}}
      />
    </MainStack.Navigator>
  );
};

export default MainStackNavigator;
