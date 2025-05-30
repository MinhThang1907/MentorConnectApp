import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />
      
      {/* Header Section */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Icon name="school" size={40} color="#fff" />
          </View>
          <Text style={styles.logoText}>MentorConnect</Text>
        </View>
        
        <Text style={styles.tagline}>
          Connect, Learn, and Grow Together
        </Text>
      </Animated.View>

      {/* Features Section */}
      <Animated.View 
        style={[
          styles.featuresContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Icon name="people" size={24} color="#6366f1" />
          </View>
          <Text style={styles.featureTitle}>Find Mentors</Text>
          <Text style={styles.featureDescription}>
            Connect with experienced professionals in your field
          </Text>
        </View>

        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Icon name="schedule" size={24} color="#10b981" />
          </View>
          <Text style={styles.featureTitle}>Book Sessions</Text>
          <Text style={styles.featureDescription}>
            Schedule one-on-one mentoring sessions at your convenience
          </Text>
        </View>

        <View style={styles.feature}>
          <View style={styles.featureIcon}>
            <Icon name="chat" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.featureTitle}>Real-time Chat</Text>
          <Text style={styles.featureDescription}>
            Stay connected with instant messaging and video calls
          </Text>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View 
        style={[
          styles.actionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Icon name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.View 
        style={[
          styles.footer,
          { opacity: fadeAnim }
        ]}
      >
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.footerLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: '#6366f1',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  feature: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    flex: 1,
  },
  featureDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    flex: 1,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#6366f1',
    fontWeight: '500',
  },
});