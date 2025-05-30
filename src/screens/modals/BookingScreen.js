import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function BookingScreen({navigation, route}) {
  const {mentorId, mentorName} = route.params || {};

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(60);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Date/Time, 2: Details, 3: Confirmation

  const durations = [30, 60, 90, 120];
  const timeSlots = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
    '20:30',
  ];

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchAvailableSlots = async () => {
    try {
      // Fetch existing sessions for the selected date
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const sessionsSnapshot = await firestore()
        .collection('sessions')
        .where('mentorId', '==', mentorId)
        .where('scheduledAt', '>=', startOfDay)
        .where('scheduledAt', '<=', endOfDay)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();

      const bookedSlots = sessionsSnapshot.docs.map(doc => {
        const session = doc.data();
        return session.scheduledAt.toDate().toTimeString().slice(0, 5);
      });

      const available = timeSlots.filter(slot => !bookedSlots.includes(slot));
      setAvailableSlots(available);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const days = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }

    return days;
  };

  const handleBookSession = async () => {
    if (!selectedTime || !title.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth().currentUser;
      const [hours, minutes] = selectedTime.split(':');
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const sessionData = {
        title: title.trim(),
        description: description.trim(),
        mentorId: mentorId,
        menteeId: currentUser.uid,
        participants: [mentorId, currentUser.uid],
        scheduledAt: scheduledDateTime,
        duration: duration,
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('sessions').add(sessionData);

      Alert.alert(
        'Success',
        'Session booked successfully! The mentor will confirm your request.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to book session. Please try again.');
    }
    setLoading(false);
  };

  const renderDateSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Date</Text>
      <FlatList
        data={generateCalendarDays()}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.toISOString()}
        contentContainerStyle={styles.dateList}
        renderItem={({item}) => {
          const isSelected =
            item.toDateString() === selectedDate.toDateString();
          const isToday = item.toDateString() === new Date().toDateString();

          return (
            <TouchableOpacity
              style={[
                styles.dateItem,
                isSelected && styles.dateItemSelected,
                isToday && styles.dateItemToday,
              ]}
              onPress={() => setSelectedDate(item)}>
              <Text
                style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                {item.toLocaleDateString('en', {weekday: 'short'})}
              </Text>
              <Text
                style={[
                  styles.dateNumber,
                  isSelected && styles.dateTextSelected,
                ]}>
                {item.getDate()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderTimeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Available Times</Text>
      <View style={styles.timeGrid}>
        {availableSlots.map(time => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeSlot,
              selectedTime === time && styles.timeSlotSelected,
            ]}
            onPress={() => setSelectedTime(time)}>
            <Text
              style={[
                styles.timeSlotText,
                selectedTime === time && styles.timeSlotTextSelected,
              ]}>
              {time}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {availableSlots.length === 0 && (
        <Text style={styles.noSlotsText}>No available slots for this date</Text>
      )}
    </View>
  );

  const renderDurationSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Duration</Text>
      <View style={styles.durationGrid}>
        {durations.map(dur => (
          <TouchableOpacity
            key={dur}
            style={[
              styles.durationItem,
              duration === dur && styles.durationItemSelected,
            ]}
            onPress={() => setDuration(dur)}>
            <Text
              style={[
                styles.durationText,
                duration === dur && styles.durationTextSelected,
              ]}>
              {dur} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetailsForm = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Session Details</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Session Title *</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., React Native Development Help"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Description (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you'd like to discuss or learn..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderConfirmation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Confirm Booking</Text>

      <View style={styles.confirmationCard}>
        <View style={styles.confirmationRow}>
          <Icon name="person" size={20} color="#6b7280" />
          <Text style={styles.confirmationText}>Mentor: {mentorName}</Text>
        </View>

        <View style={styles.confirmationRow}>
          <Icon name="event" size={20} color="#6b7280" />
          <Text style={styles.confirmationText}>
            {selectedDate.toLocaleDateString('en', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.confirmationRow}>
          <Icon name="schedule" size={20} color="#6b7280" />
          <Text style={styles.confirmationText}>
            {selectedTime} ({duration} minutes)
          </Text>
        </View>

        <View style={styles.confirmationRow}>
          <Icon name="title" size={20} color="#6b7280" />
          <Text style={styles.confirmationText}>{title}</Text>
        </View>

        {description && (
          <View style={styles.confirmationRow}>
            <Icon name="description" size={20} color="#6b7280" />
            <Text style={styles.confirmationText}>{description}</Text>
          </View>
        )}
      </View>

      <View style={styles.noteContainer}>
        <Icon name="info" size={16} color="#6366f1" />
        <Text style={styles.noteText}>
          Your booking request will be sent to the mentor for confirmation.
        </Text>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            {renderDateSelector()}
            {renderTimeSelector()}
            {renderDurationSelector()}
          </>
        );
      case 2:
        return renderDetailsForm();
      case 3:
        return renderConfirmation();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedDate && selectedTime;
      case 2:
        return title.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleBookSession();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Session</Text>
        <View style={{width: 24}} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map(stepNumber => (
          <View key={stepNumber} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                step >= stepNumber && styles.progressDotActive,
              ]}>
              <Text
                style={[
                  styles.progressDotText,
                  step >= stepNumber && styles.progressDotTextActive,
                ]}>
                {stepNumber}
              </Text>
            </View>
            <Text
              style={[
                styles.progressLabel,
                step >= stepNumber && styles.progressLabelActive,
              ]}>
              {stepNumber === 1
                ? 'Date & Time'
                : stepNumber === 2
                ? 'Details'
                : 'Confirm'}
            </Text>
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
            step === 1 && styles.nextButtonFull,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || loading}>
          <Text style={styles.nextButtonText}>
            {loading ? 'Booking...' : step === 3 ? 'Book Session' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressLabelActive: {
    color: '#6366f1',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  dateList: {
    paddingHorizontal: 4,
  },
  dateItem: {
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    minWidth: 60,
  },
  dateItemSelected: {
    backgroundColor: '#6366f1',
  },
  dateItemToday: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  dateDay: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dateTextSelected: {
    color: '#fff',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeSlot: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  timeSlotSelected: {
    backgroundColor: '#6366f1',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  noSlotsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  durationGrid: {
    flexDirection: 'row',
  },
  durationItem: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'center',
  },
  durationItemSelected: {
    backgroundColor: '#6366f1',
  },
  durationText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  durationTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  confirmationCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    padding: 12,
  },
  noteText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  nextButton: {
    flex: 2,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  nextButtonFull: {
    flex: 1,
    marginRight: 0,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
