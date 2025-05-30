import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function LoadingScreen() {
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start fade and scale animation
    Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Start spinning animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => {
      spinAnimation.stop();
    };
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeValue,
            transform: [{ scale: scaleValue }]
          }
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Animated.View 
            style={[
              styles.logoIcon,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <Icon name="school" size={40} color="#fff" />
          </Animated.View>
          <Text style={styles.logoText}>MentorConnect</Text>
        </View>

        {/* Loading Indicator */}
        <View style={styles.loadingContainer}>
          <Animated.View 
            style={[
              styles.spinner,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <View style={styles.spinnerInner} />
          </Animated.View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Connecting mentors and mentees worldwide
        </Text>
      </Animated.View>

      {/* Background Elements */}
      <View style={styles.backgroundElements}>
        <Animated.View 
          style={[
            styles.backgroundCircle,
            styles.circle1,
            { transform: [{ rotate: spin }] }
          ]} 
        />
        <Animated.View 
          style={[
            styles.backgroundCircle,
            styles.circle2,
            { transform: [{ rotate: spin }] }
          ]} 
        />
        <Animated.View 
          style={[
            styles.backgroundCircle,
            styles.circle3,
            { transform: [{ rotate: spin }] }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
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
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    marginBottom: 16,
  },
  spinnerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  loadingText: {
    fontSize: 16,
    color: '#e0e7ff',
    fontWeight: '500',
  },
  tagline: {
    fontSize: 14,
    color: '#c7d2fe',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle1: {
    width: width * 1.5,
    height: width * 1.5,
    top: -width * 0.5,
    left: -width * 0.25,
  },
  circle2: {
    width: width * 1.2,
    height: width * 1.2,
    bottom: -width * 0.4,
    right: -width * 0.3,
  },
  circle3: {
    width: width * 0.8,
    height: width * 0.8,
    top: '20%',
    right: -width * 0.2,
  },
});