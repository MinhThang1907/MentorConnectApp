import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

class TokenService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.deviceId = null;
    this.tokenRefreshPromise = null;
  }

  // Initialize device ID
  async initializeDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = await DeviceInfo.getUniqueId();
        await AsyncStorage.setItem('device_id', deviceId);
      }
      this.deviceId = deviceId;
      return deviceId;
    } catch (error) {
      console.error('Error initializing device ID:', error);
      return null;
    }
  }

  // Generate JWT token (this would typically be done on your backend)
  generateAccessToken(user, expiresIn = '30m') {
    const payload = {
      uid: user.uid,
      email: user.email,
      role: user.role,
      deviceId: this.deviceId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiration(expiresIn),
    };

    // In a real app, this would be signed by your backend
    return this.createMockJWT(payload);
  }

  generateRefreshToken(user, expiresIn = '7d') {
    const payload = {
      uid: user.uid,
      deviceId: this.deviceId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.parseExpiration(expiresIn),
    };

    return this.createMockJWT(payload);
  }

  // Mock JWT creation (replace with proper JWT library in production)
  createMockJWT(payload) {
    const header = {alg: 'HS256', typ: 'JWT'};
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.createSignature(
      encodedHeader + '.' + encodedPayload,
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  base64UrlEncode(str) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  createSignature(data) {
    // Mock signature - use proper HMAC in production
    return this.base64UrlEncode(data + 'secret_key');
  }

  parseExpiration(expiration) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 1800; // Default 30 minutes

    const [, value, unit] = match;
    return Number.parseInt(value) * units[unit];
  }

  // Decode JWT payload
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8'),
      );
      return payload;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Check if token is expired
  isTokenExpired(token) {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
  }

  // Store tokens securely
  async storeTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        ['access_token', accessToken],
        ['refresh_token', refreshToken],
        ['token_timestamp', Date.now().toString()],
      ]);

      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      // Store session in Firestore
      await this.storeSession(accessToken, refreshToken);
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  // Store session information in Firestore
  async storeSession(accessToken, refreshToken) {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const deviceInfo = {
        deviceId: this.deviceId,
        platform: Platform.OS,
        version: Platform.Version,
        appVersion: DeviceInfo.getVersion(),
      };

      const sessionData = {
        userId: user.uid,
        deviceInfo,
        accessToken: this.hashToken(accessToken),
        refreshToken: this.hashToken(refreshToken),
        createdAt: firestore.FieldValue.serverTimestamp(),
        lastActivity: firestore.FieldValue.serverTimestamp(),
        isActive: true,
      };

      await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .set(sessionData, {merge: true});
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  // Simple hash function for storing token hashes
  hashToken(token) {
    // In production, use a proper hashing algorithm
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Retrieve stored tokens
  async getStoredTokens() {
    try {
      const tokens = await AsyncStorage.multiGet([
        'access_token',
        'refresh_token',
        'token_timestamp',
      ]);

      const accessToken = tokens[0][1];
      const refreshToken = tokens[1][1];
      const timestamp = tokens[2][1];

      if (!accessToken || !refreshToken) {
        return null;
      }

      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      return {
        accessToken,
        refreshToken,
        timestamp: Number.parseInt(timestamp),
      };
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken() {
    try {
      // If we have a refresh in progress, wait for it
      if (this.tokenRefreshPromise) {
        await this.tokenRefreshPromise;
      }

      // Check if current token is valid
      if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
        return this.accessToken;
      }

      // Try to refresh token
      return await this.refreshAccessToken();
    } catch (error) {
      console.error('Error getting valid access token:', error);
      throw error;
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (this.tokenRefreshPromise) {
        return await this.tokenRefreshPromise;
      }

      this.tokenRefreshPromise = this._performTokenRefresh();
      const result = await this.tokenRefreshPromise;
      this.tokenRefreshPromise = null;

      return result;
    } catch (error) {
      this.tokenRefreshPromise = null;
      throw error;
    }
  }

  async _performTokenRefresh() {
    try {
      if (!this.refreshToken || this.isTokenExpired(this.refreshToken)) {
        throw new Error('Refresh token is invalid or expired');
      }

      // Verify refresh token with Firestore
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const sessionDoc = await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .get();

      if (!sessionDoc.exists() || !sessionDoc.data().isActive) {
        throw new Error('Session is not active');
      }

      // Get updated user data
      const userDoc = await firestore().collection('users').doc(user.uid).get();

      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();

      // Generate new tokens
      const newAccessToken = this.generateAccessToken({
        uid: user.uid,
        email: user.email,
        role: userData.role,
      });

      const newRefreshToken = this.generateRefreshToken({
        uid: user.uid,
      });

      // Store new tokens
      await this.storeTokens(newAccessToken, newRefreshToken);

      // Update last activity
      await this.updateSessionActivity();

      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // If refresh fails, clear tokens and require re-login
      await this.clearTokens();
      throw error;
    }
  }

  // Update session activity
  async updateSessionActivity() {
    try {
      const user = auth().currentUser;
      if (!user) return;

      await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .update({
          lastActivity: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  // Clear all tokens
  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'token_timestamp',
      ]);

      this.accessToken = null;
      this.refreshToken = null;

      // Mark session as inactive
      await this.deactivateSession();
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Deactivate current session
  async deactivateSession() {
    try {
      const user = auth().currentUser;
      if (!user) return;

      await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .update({
          isActive: false,
          deactivatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error deactivating session:', error);
    }
  }

  // Get all user sessions
  async getUserSessions(userId) {
    try {
      const sessionsSnapshot = await firestore()
        .collection('userSessions')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('lastActivity', 'desc')
        .get();

      return sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Logout from specific device
  async logoutDevice(userId, deviceId) {
    try {
      await firestore()
        .collection('userSessions')
        .doc(`${userId}_${deviceId}`)
        .update({
          isActive: false,
          deactivatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error logging out device:', error);
      throw error;
    }
  }

  // Logout from all devices
  async logoutAllDevices(userId) {
    try {
      const sessionsSnapshot = await firestore()
        .collection('userSessions')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .get();

      const batch = firestore().batch();

      sessionsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          isActive: false,
          deactivatedAt: firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error logging out all devices:', error);
      throw error;
    }
  }

  // Check if session is still valid
  async validateSession() {
    try {
      const user = auth().currentUser;
      if (!user) return false;

      const sessionDoc = await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .get();

      return sessionDoc.exists() && sessionDoc.data().isActive;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }
}

export default new TokenService();
