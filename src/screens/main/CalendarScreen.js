import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function CalendarScreen({navigation}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const [sessionDetailModal, setSessionDetailModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  useEffect(() => {
    fetchCurrentUser();
    fetchSessions();
  }, []);

  useEffect(() => {
    filterSessionsByDate();
  }, [selectedDate, sessions, viewMode]);

  const fetchCurrentUser = async () => {
    try {
      const user = auth().currentUser;
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      setCurrentUser(userDoc.data());
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      const sessionsSnapshot = await firestore()
        .collection('sessions')
        .where('participants', 'array-contains', currentUser.uid)
        .orderBy('scheduledAt', 'asc')
        .get();

      const sessionsData = [];
      for (const doc of sessionsSnapshot.docs) {
        const session = {id: doc.id, ...doc.data()};

        // Get other participant info
        const otherParticipantId = session.participants.find(
          id => id !== currentUser.uid,
        );

        if (otherParticipantId) {
          const userDoc = await firestore()
            .collection('users')
            .doc(otherParticipantId)
            .get();

          if (userDoc.exists()) {
            session.otherUser = {id: otherParticipantId, ...userDoc.data()};
          }
        }

        sessionsData.push(session);
      }

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
    setLoading(false);
  };

  const filterSessionsByDate = () => {
    const filtered = sessions.filter(session => {
      const sessionDate = session.scheduledAt.toDate();

      switch (viewMode) {
        case 'day':
          return isSameDay(sessionDate, selectedDate);
        case 'week':
          return isSameWeek(sessionDate, selectedDate);
        case 'month':
          return isSameMonth(sessionDate, selectedDate);
        default:
          return true;
      }
    });

    setFilteredSessions(filtered);
  };

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  const isSameWeek = (date1, date2) => {
    const startOfWeek = new Date(date2);
    startOfWeek.setDate(date2.getDate() - date2.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return date1 >= startOfWeek && date1 <= endOfWeek;
  };

  const isSameMonth = (date1, date2) => {
    return (
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayData = {
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: isSameDay(currentDate, new Date()),
        isSelected: isSameDay(currentDate, selectedDate),
        sessionsCount: sessions.filter(session =>
          isSameDay(session.scheduledAt.toDate(), currentDate),
        ).length,
      };

      days.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  const handleDateSelect = date => {
    setSelectedDate(date);
    if (viewMode !== 'day') {
      setViewMode('day');
    }
  };

  const navigateDate = direction => {
    const newDate = new Date(selectedDate);

    switch (viewMode) {
      case 'day':
        newDate.setDate(selectedDate.getDate() + direction);
        break;
      case 'week':
        newDate.setDate(selectedDate.getDate() + direction * 7);
        break;
      case 'month':
        newDate.setMonth(selectedDate.getMonth() + direction);
        break;
    }

    setSelectedDate(newDate);
  };

  const getStatusColor = status => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const handleSessionAction = async (sessionId, action) => {
    try {
      await firestore().collection('sessions').doc(sessionId).update({
        status: action,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      fetchSessions();
      setSessionDetailModal(false);

      Alert.alert('Success', `Session ${action} successfully`);
    } catch (error) {
      Alert.alert('Error', `Failed to ${action} session`);
    }
  };

  const renderCalendarDay = ({item}) => (
    <TouchableOpacity
      style={[
        styles.calendarDay,
        !item.isCurrentMonth && styles.calendarDayInactive,
        item.isToday && styles.calendarDayToday,
        item.isSelected && styles.calendarDaySelected,
      ]}
      onPress={() => handleDateSelect(item.date)}>
      <Text
        style={[
          styles.calendarDayText,
          !item.isCurrentMonth && styles.calendarDayTextInactive,
          item.isToday && styles.calendarDayTextToday,
          item.isSelected && styles.calendarDayTextSelected,
        ]}>
        {item.date.getDate()}
      </Text>
      {item.sessionsCount > 0 && (
        <View style={styles.sessionIndicator}>
          <Text style={styles.sessionIndicatorText}>{item.sessionsCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSessionItem = ({item}) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => {
        setSelectedSession(item);
        setSessionDetailModal(true);
      }}>
      <View
        style={[
          styles.sessionStatus,
          {backgroundColor: getStatusColor(item.status)},
        ]}
      />

      <View style={styles.sessionContent}>
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionTime}>
            {item.scheduledAt.toDate().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Text style={styles.sessionParticipant}>
          with {item.otherUser?.firstName} {item.otherUser?.lastName}
        </Text>

        <View style={styles.sessionMeta}>
          <View style={styles.sessionDuration}>
            <Icon name="schedule" size={14} color="#6b7280" />
            <Text style={styles.sessionDurationText}>
              {item.duration || 60} min
            </Text>
          </View>

          <View
            style={[
              styles.sessionStatusBadge,
              {backgroundColor: getStatusColor(item.status)},
            ]}>
            <Text style={styles.sessionStatusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <Text style={styles.headerSubtitle}>
            {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => {
              const modes = ['day', 'week', 'month'];
              const currentIndex = modes.indexOf(viewMode);
              const nextIndex = (currentIndex + 1) % modes.length;
              setViewMode(modes[nextIndex]);
            }}>
            <Text style={styles.viewModeText}>{viewMode}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate(-1)}>
          <Icon name="chevron-left" size={24} color="#6366f1" />
        </TouchableOpacity>

        <Text style={styles.navTitle}>
          {viewMode === 'day' && selectedDate.toLocaleDateString()}
          {viewMode === 'week' &&
            `Week of ${selectedDate.toLocaleDateString()}`}
          {viewMode === 'month' &&
            `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
        </Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate(1)}>
          <Icon name="chevron-right" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid (for month view) */}
      {viewMode === 'month' && (
        <View style={styles.calendarContainer}>
          <View style={styles.weekHeader}>
            {weekDays.map(day => (
              <Text key={day} style={styles.weekHeaderText}>
                {day}
              </Text>
            ))}
          </View>

          <FlatList
            data={generateCalendarDays()}
            renderItem={renderCalendarDay}
            keyExtractor={(item, index) => index.toString()}
            numColumns={7}
            scrollEnabled={false}
            contentContainerStyle={styles.calendarGrid}
          />
        </View>
      )}

      {/* Sessions List */}
      <View style={styles.sessionsContainer}>
        <View style={styles.sessionsHeader}>
          <Text style={styles.sessionsTitle}>
            {viewMode === 'day'
              ? "Today's Sessions"
              : viewMode === 'week'
              ? "This Week's Sessions"
              : "This Month's Sessions"}
          </Text>
          <Text style={styles.sessionsCount}>
            {filteredSessions.length} session
            {filteredSessions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={filteredSessions}
          renderItem={renderSessionItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.sessionsList}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchSessions}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="event-available" size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No sessions scheduled</Text>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => navigation.navigate('Booking')}>
                <Text style={styles.scheduleButtonText}>
                  Schedule a Session
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Session Detail Modal */}
      <Modal
        visible={sessionDetailModal}
        animationType="slide"
        presentationStyle="pageSheet">
        {selectedSession && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSessionDetailModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Session Details</Text>
              <TouchableOpacity>
                {/* <Icon name="edit" size={24} color="#6366f1" /> */}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.sessionDetailTitle}>
                {selectedSession.title}
              </Text>

              <View style={styles.sessionDetailInfo}>
                <View style={styles.sessionDetailRow}>
                  <Icon name="person" size={20} color="#6b7280" />
                  <Text style={styles.sessionDetailText}>
                    {selectedSession.otherUser?.firstName}{' '}
                    {selectedSession.otherUser?.lastName}
                  </Text>
                </View>

                <View style={styles.sessionDetailRow}>
                  <Icon name="schedule" size={20} color="#6b7280" />
                  <Text style={styles.sessionDetailText}>
                    {selectedSession.scheduledAt.toDate().toLocaleString()}
                  </Text>
                </View>

                <View style={styles.sessionDetailRow}>
                  <Icon name="timer" size={20} color="#6b7280" />
                  <Text style={styles.sessionDetailText}>
                    {selectedSession.duration || 60} minutes
                  </Text>
                </View>

                <View style={styles.sessionDetailRow}>
                  <Icon name="info" size={20} color="#6b7280" />
                  <View
                    style={[
                      styles.statusBadge,
                      {backgroundColor: getStatusColor(selectedSession.status)},
                    ]}>
                    <Text style={styles.statusBadgeText}>
                      {selectedSession.status.charAt(0).toUpperCase() +
                        selectedSession.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedSession.description && (
                <View style={styles.sessionDescription}>
                  <Text style={styles.sessionDescriptionTitle}>
                    Description
                  </Text>
                  <Text style={styles.sessionDescriptionText}>
                    {selectedSession.description}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {selectedSession.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() =>
                      handleSessionAction(selectedSession.id, 'confirmed')
                    }>
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() =>
                      handleSessionAction(selectedSession.id, 'cancelled')
                    }>
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}

              {selectedSession.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.joinButton]}
                  onPress={() => {
                    setSessionDetailModal(false);
                    navigation.navigate('Chat', {
                      userId: selectedSession.otherUser?.id,
                      userName: `${selectedSession.otherUser?.firstName} ${selectedSession.otherUser?.lastName}`,
                    });
                  }}>
                  <Text style={styles.actionButtonText}>Join Session</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  viewModeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
    borderRadius: 8,
    position: 'relative',
  },
  calendarDayInactive: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: '#ede9fe',
  },
  calendarDaySelected: {
    backgroundColor: '#6366f1',
  },
  calendarDayText: {
    fontSize: 14,
    color: '#111827',
  },
  calendarDayTextInactive: {
    color: '#9ca3af',
  },
  calendarDayTextToday: {
    color: '#6366f1',
    fontWeight: '600',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  sessionIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionIndicatorText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '600',
  },
  sessionsContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sessionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sessionsCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionsList: {
    flexGrow: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sessionStatus: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  sessionTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  sessionParticipant: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDurationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  sessionStatusBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sessionStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  sessionAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 20,
  },
  scheduleButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  scheduleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  sessionDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  sessionDetailInfo: {
    marginBottom: 20,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDetailText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  sessionDescription: {
    marginBottom: 20,
  },
  sessionDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sessionDescriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  joinButton: {
    backgroundColor: '#6366f1',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
