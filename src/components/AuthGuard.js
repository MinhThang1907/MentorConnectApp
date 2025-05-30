import {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import {useTokenRefresh} from '../hooks/useTokenRefresh';
import LoadingScreen from '../screens/LoadingScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function AuthGuard({children, requiredRole = null}) {
  const {user, userRole, loading, sessionValid} = useAuth();
  const [validating, setValidating] = useState(true);

  // Set up token refresh
  useTokenRefresh();

  useEffect(() => {
    // Add a small delay to ensure all auth checks are complete
    const timer = setTimeout(() => {
      setValidating(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, sessionValid]);

  if (loading || validating) {
    return <LoadingScreen />;
  }

  if (!user || !sessionValid) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="lock" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Authentication Required</Text>
        <Text style={styles.errorMessage}>
          Please sign in to access this feature
        </Text>
      </View>
    );
  }

  if (requiredRole && userRole !== requiredRole) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="block" size={48} color="#f59e0b" />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorMessage}>
          You don't have permission to access this feature
        </Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
