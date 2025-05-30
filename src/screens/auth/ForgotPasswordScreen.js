import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function ForgotPasswordScreen({navigation}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email);
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        'Password reset email has been sent to your email address. Please check your inbox and follow the instructions.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      let errorMessage = 'Failed to send reset email';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later';
      }

      Alert.alert('Error', errorMessage);
    }
    setLoading(false);
  };

  const handleResendEmail = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert('Success', 'Password reset email sent again');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend email');
    }
    setLoading(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="lock-reset" size={64} color="#6366f1" />
        </View>

        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.subtitle}>
          No worries! Enter your email address and we'll send you a link to
          reset your password.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Icon
                name="email"
                size={20}
                color="#6b7280"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailSent}
              />
            </View>
          </View>

          {!emailSent ? (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Icon name="check-circle" size={24} color="#10b981" />
              </View>
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                We've sent a password reset link to {email}
              </Text>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendEmail}
                disabled={loading}>
                <Text style={styles.resendButtonText}>
                  {loading ? 'Sending...' : 'Resend Email'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need more help?</Text>
          <Text style={styles.helpText}>
            If you don't receive the email within a few minutes, check your spam
            folder or contact our support team.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    marginBottom: 16,
  },
  resendButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 8,
  },
});
