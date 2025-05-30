'use client';

import {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSession} from '../contexts/SessionContext';

export default function SessionManager({visible, onClose}) {
  const {getUserSessions, logoutDevice, logoutAllDevices, deviceId} =
    useSession();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchSessions();
    }
  }, [visible]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const userSessions = await getUserSessions();
      setSessions(userSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  };

  const handleLogoutDevice = async session => {
    Alert.alert(
      'Logout Device',
      `Are you sure you want to logout from this ${session.deviceInfo.platform} device?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutDevice(session.deviceInfo.deviceId);
              await fetchSessions();
              Alert.alert('Success', 'Device logged out successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout device');
            }
          },
        },
      ],
    );
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Logout All Devices',
      'This will sign you out from all devices. You will need to sign in again.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              await logoutAllDevices();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout all devices');
            }
          },
        },
      ],
    );
  };

  const formatLastActivity = timestamp => {
    if (!timestamp) return 'Unknown';

    const date = timestamp.toDate();
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getDeviceIcon = platform => {
    switch (platform?.toLowerCase()) {
      case 'ios':
        return 'phone-iphone';
      case 'android':
        return 'phone-android';
      default:
        return 'devices';
    }
  };

  const renderSessionItem = ({item}) => {
    const isCurrentDevice = item.deviceInfo?.deviceId === deviceId;

    return (
      <View
        style={[styles.sessionItem, isCurrentDevice && styles.currentSession]}>
        <View style={styles.sessionIcon}>
          <Icon
            name={getDeviceIcon(item.deviceInfo?.platform)}
            size={24}
            color="#6366f1"
          />
        </View>

        <View style={styles.sessionInfo}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionPlatform}>
              {item.deviceInfo?.brand} {item.deviceInfo?.model}
            </Text>
            {isCurrentDevice && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>

          <Text style={styles.sessionDetails}>
            {item.deviceInfo?.platform} {item.deviceInfo?.version}
          </Text>

          <Text style={styles.sessionActivity}>
            Last active: {formatLastActivity(item.lastActivity)}
          </Text>
        </View>

        {!isCurrentDevice && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => handleLogoutDevice(item)}>
            <Icon name="logout" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Active Sessions</Text>
          <TouchableOpacity onPress={fetchSessions}>
            <Icon name="refresh" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Manage your active sessions across different devices
          </Text>

          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.sessionsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="devices" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No active sessions</Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.logoutAllButton}
            onPress={handleLogoutAllDevices}>
            <Icon name="logout" size={20} color="#fff" />
            <Text style={styles.logoutAllText}>Logout All Devices</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  sessionsList: {
    flexGrow: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentSession: {
    backgroundColor: '#ede9fe',
    borderColor: '#6366f1',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionPlatform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  currentBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  sessionDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  sessionActivity: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  logoutAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  logoutAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
