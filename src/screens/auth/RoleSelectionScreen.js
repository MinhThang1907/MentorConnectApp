import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRoleSelection = async () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    setLoading(true);
    try {
      const user = auth().currentUser;
      console.log('Updating role for user:', user.uid);
      console.log('Selected role:', selectedRole);

      // Update user document with selected role
      await firestore().collection('users').doc(user.uid).update({
        role: selectedRole,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      console.log('Role updated successfully in Firestore');
      // No need to navigate - App.jsx will handle navigation based on user role
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Failed to update role. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Role</Text>
        <Text style={styles.headerSubtitle}>
          Select how you want to use MentorConnect
        </Text>
      </View>

      <View style={styles.rolesContainer}>
        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'mentor' && styles.roleCardSelected,
          ]}
          onPress={() => setSelectedRole('mentor')}>
          <View style={styles.roleIconContainer}>
            <Icon name="school" size={40} color="#6366f1" />
          </View>
          <Text style={styles.roleTitle}>I'm a Mentor</Text>
          <Text style={styles.roleDescription}>
            I want to share my knowledge and expertise with others
          </Text>
          {selectedRole === 'mentor' && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={24} color="#6366f1" />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleCard,
            selectedRole === 'mentee' && styles.roleCardSelected,
          ]}
          onPress={() => setSelectedRole('mentee')}>
          <View style={styles.roleIconContainer}>
            <Icon name="lightbulb" size={40} color="#10b981" />
          </View>
          <Text style={styles.roleTitle}>I'm a Mentee</Text>
          <Text style={styles.roleDescription}>
            I want to learn and grow with guidance from experts
          </Text>
          {selectedRole === 'mentee' && (
            <View style={styles.selectedIndicator}>
              <Icon name="check-circle" size={24} color="#10b981" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedRole || loading) && styles.continueButtonDisabled,
          ]}
          onPress={handleRoleSelection}
          disabled={!selectedRole || loading}>
          <Text style={styles.continueButtonText}>
            {loading ? 'Setting up your account...' : 'Continue'}
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  rolesContainer: {
    flex: 1,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  roleCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f5f3ff',
  },
  roleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  footer: {
    marginTop: 20,
  },
  continueButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
