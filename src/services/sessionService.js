import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

class SessionService {
  constructor() {
    this.deviceId = null;
    this.currentSession = null;
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

  // Create or update session
  async createOrUpdateSession() {
    try {
      const user = auth().currentUser;
      if (!user) return null;

      if (!this.deviceId) {
        await this.initializeDeviceId();
      }

      const deviceInfo = {
        deviceId: this.deviceId,
        platform: Platform.OS,
        version: Platform.Version,
        appVersion: DeviceInfo.getVersion(),
        brand: await DeviceInfo.getBrand(),
        model: await DeviceInfo.getModel(),
      };

      const sessionId = `${user.uid}_${this.deviceId}`;
      const sessionRef = firestore().collection('userSessions').doc(sessionId);

      // Check if session exists
      const sessionDoc = await sessionRef.get();

      if (sessionDoc.exists()) {
        // Update existing session
        await sessionRef.update({
          lastActivity: firestore.FieldValue.serverTimestamp(),
          isActive: true,
          deviceInfo, // Update device info in case it changed
        });
      } else {
        // Create new session
        await sessionRef.set({
          userId: user.uid,
          deviceInfo,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastActivity: firestore.FieldValue.serverTimestamp(),
          isActive: true,
        });
      }

      // Get the updated session
      const updatedSession = await sessionRef.get();
      this.currentSession = {
        id: sessionId,
        ...updatedSession.data(),
      };

      return this.currentSession;
    } catch (error) {
      console.error('Error creating/updating session:', error);
      return null;
    }
  }

  // Update session activity
  async updateSessionActivity() {
    try {
      const user = auth().currentUser;
      if (!user || !this.deviceId) return;

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

  // Validate session
  async validateSession() {
    try {
      const user = auth().currentUser;
      if (!user || !this.deviceId) return false;

      const sessionDoc = await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .get();

      if (!sessionDoc.exists()) {
        return false;
      }

      const sessionData = sessionDoc.data();

      // Check if session is active
      if (!sessionData.isActive) {
        return false;
      }

      // Check if session has been inactive for too long (e.g., 30 days)
      if (sessionData.lastActivity) {
        const lastActivity = sessionData.lastActivity.toDate();
        const now = new Date();
        const diffInDays = (now - lastActivity) / (1000 * 60 * 60 * 24);

        if (diffInDays > 30) {
          // Deactivate session if inactive for too long
          await this.deactivateSession();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  // Deactivate session
  async deactivateSession() {
    try {
      const user = auth().currentUser;
      if (!user || !this.deviceId) return;

      await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${this.deviceId}`)
        .update({
          isActive: false,
          deactivatedAt: firestore.FieldValue.serverTimestamp(),
        });

      this.currentSession = null;
    } catch (error) {
      console.error('Error deactivating session:', error);
    }
  }

  // Get all user sessions
  async getUserSessions(userId) {
    try {
      const sessionsSnapshot = await firestore()
        .collection('userSessions')
        .where('userId', '==', userId || auth().currentUser?.uid)
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

  // Get active user sessions
  async getActiveSessions(userId) {
    try {
      const sessionsSnapshot = await firestore()
        .collection('userSessions')
        .where('userId', '==', userId || auth().currentUser?.uid)
        .where('isActive', '==', true)
        .orderBy('lastActivity', 'desc')
        .get();

      return sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  // Logout from specific device
  async logoutDevice(deviceId) {
    try {
      const user = auth().currentUser;
      if (!user) return;

      await firestore()
        .collection('userSessions')
        .doc(`${user.uid}_${deviceId}`)
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
  async logoutAllDevices() {
    try {
      const user = auth().currentUser;
      if (!user) return;

      const sessionsSnapshot = await firestore()
        .collection('userSessions')
        .where('userId', '==', user.uid)
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

  // Get current session
  getCurrentSession() {
    return this.currentSession;
  }

  // Get current device ID
  getDeviceId() {
    return this.deviceId;
  }
}

export default new SessionService();
