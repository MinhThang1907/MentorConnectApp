'use client';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Modal,
  Switch,
  RefreshControl,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  uploadImageToCloudinary,
  getOptimizedImageUrl,
} from '../../utils/cloudinaryConfig';
import SessionManager from '../../components/SessionManager';
import {useSession} from '../../contexts/SessionContext';

export default function ProfileScreen({navigation}) {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsModal, setSettingsModal] = useState(false);
  const [sessionManagerVisible, setSessionManagerVisible] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    totalRating: 0,
    totalReviews: 0,
    totalHours: 0,
  });
  const [notifications, setNotifications] = useState({
    messages: true,
    sessions: true,
    marketing: false,
  });

  // Session management - Thêm giá trị mặc định để tránh lỗi
  const {
    activeSessions = [],
    endSession = () => {},
    endAllOtherSessions = () => {},
  } = useSession() || {};

  const skills = [
    'JavaScript',
    'React',
    'Node.js',
    'Python',
    'Java',
    'Swift',
    'Kotlin',
    'Flutter',
    'React Native',
    'Vue.js',
    'Angular',
    'Machine Learning',
    'Data Science',
    'UI/UX Design',
    'Product Management',
    'DevOps',
    'AWS',
    'Docker',
    'Kubernetes',
    'MongoDB',
    'PostgreSQL',
  ];

  useEffect(() => {
    fetchUserData();
    fetchUserStats();
    fetchNotificationSettings();
  }, []);

  const fetchUserData = async () => {
    try {
      const currentUser = auth().currentUser;
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser(userData);
        setEditData(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
    setLoading(false);
  };

  const fetchUserStats = async () => {
    try {
      const currentUser = auth().currentUser;

      // Fetch sessions data
      const sessionsSnapshot = await firestore()
        .collection('sessions')
        .where('participants', 'array-contains', currentUser.uid)
        .get();

      const sessions = sessionsSnapshot.docs.map(doc => doc.data());
      const completedSessions = sessions.filter(
        session => session.status === 'confirmed',
      );

      // Fetch reviews data
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('revieweeId', '==', currentUser.uid)
        .get();

      const reviews = reviewsSnapshot.docs.map(doc => doc.data());
      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0,
      );
      const averageRating =
        reviews.length > 0 ? totalRating / reviews.length : 0;

      // Calculate total hours
      const totalHours =
        completedSessions.reduce(
          (sum, session) => sum + (session.duration || 60),
          0,
        ) / 60;

      setStats({
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        averageRating: averageRating,
        totalReviews: reviews.length,
        totalHours: Math.round(totalHours * 10) / 10,
      });

      // Update user rating in Firestore if it's different
      if (Math.abs(averageRating - (user?.rating || 0)) > 0.1) {
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .update({
            rating: Math.round(averageRating * 10) / 10,
          });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const currentUser = auth().currentUser;
      const settingsDoc = await firestore()
        .collection('userSettings')
        .doc(currentUser.uid)
        .get();

      if (settingsDoc.exists()) {
        setNotifications(settingsDoc.data().notifications || notifications);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserData(),
      fetchUserStats(),
      fetchNotificationSettings(),
    ]);
    setRefreshing(false);
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to select your profile photo',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Camera',
          onPress: () => {
            const options = {
              mediaType: 'photo',
              includeBase64: false,
              maxHeight: 2000,
              maxWidth: 2000,
              quality: 0.8,
            };

            launchCamera(options, handleImageResponse);
          },
        },
        {
          text: 'Gallery',
          onPress: () => {
            const options = {
              mediaType: 'photo',
              includeBase64: false,
              maxHeight: 2000,
              maxWidth: 2000,
              quality: 0.8,
              selectionLimit: 1,
            };

            launchImageLibrary(options, handleImageResponse);
          },
        },
      ],
    );
  };

  const handleImageResponse = async response => {
    console.log('Image picker response:', response);

    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.error) {
      console.log('ImagePicker Error: ', response.error);
      Alert.alert('Error', 'Failed to select image');
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      console.log('Selected asset:', asset);
      await uploadProfileImage(asset);
    }
  };

  const uploadProfileImage = async asset => {
    setImageUploading(true);
    setUploadProgress(0);

    try {
      const currentUser = auth().currentUser;

      // Validate asset
      if (!asset.uri) {
        throw new Error('Invalid image selected');
      }

      console.log('Starting upload process...');
      console.log('Asset URI:', asset.uri);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Try primary upload method first
      const uploadResult = await uploadImageToCloudinary(
        asset.uri,
        'mentor_connect/profile_images',
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult.success) {
        console.log('Upload successful:', uploadResult);

        // Update user document in Firestore
        const updateData = {
          profileImage: uploadResult.url,
          profileImagePublicId: uploadResult.publicId,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .update(updateData);

        // Update local state
        setUser(prev => ({...prev, ...updateData}));
        setEditData(prev => ({...prev, ...updateData}));

        Alert.alert('Success', 'Profile image updated successfully!');
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);

      let errorMessage = 'Failed to upload image. Please try again.';

      if (error.message.includes('400')) {
        errorMessage =
          'Invalid image or configuration. Please check your Cloudinary settings.';
      } else if (error.message.includes('401')) {
        errorMessage =
          'Authentication failed. Please check your Cloudinary upload preset.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setImageUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    try {
      const currentUser = auth().currentUser;

      // Validate required fields
      if (!editData.firstName?.trim() || !editData.lastName?.trim()) {
        Alert.alert('Error', 'First name and last name are required');
        return;
      }

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update({
          ...editData,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      setUser(editData);
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Kiểm tra endSession tồn tại trước khi gọi
            if (typeof endSession === 'function') {
              await endSession();
            }
            await auth().signOut();
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleSignOutAllDevices = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out from all devices. You will need to sign in again on all devices.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Kiểm tra endAllOtherSessions tồn tại trước khi gọi
              if (typeof endAllOtherSessions === 'function') {
                await endAllOtherSessions();
              }
              await auth().signOut();
              Alert.alert('Success', 'Signed out from all devices');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out from all devices');
            }
          },
        },
      ],
    );
  };

  const updateNotificationSettings = async newSettings => {
    try {
      const currentUser = auth().currentUser;
      await firestore().collection('userSettings').doc(currentUser.uid).set(
        {
          notifications: newSettings,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );

      setNotifications(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const toggleSkill = skill => {
    const currentSkills = editData.skills || [];
    const updatedSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];

    setEditData(prev => ({...prev, skills: updatedSkills}));
  };

  const getProfileImageUrl = () => {
    if (user?.profileImagePublicId) {
      // Use Cloudinary optimized URL
      return getOptimizedImageUrl(user.profileImagePublicId, {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
      });
    }
    return (
      user?.profileImage ||
      'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'
    );
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <Image source={{uri: getProfileImageUrl()}} style={styles.avatar} />
        {editMode && (
          <TouchableOpacity
            style={styles.editAvatarButton}
            onPress={handleImagePicker}
            disabled={imageUploading}>
            <Icon
              name={imageUploading ? 'hourglass-empty' : 'camera-alt'}
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
        )}
        {imageUploading && (
          <View style={styles.uploadOverlay}>
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, {width: `${uploadProgress}%`}]}
              />
            </View>
            <Text style={styles.uploadText}>{uploadProgress}%</Text>
          </View>
        )}
      </View>

      <View style={styles.profileInfo}>
        {editMode ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.editInput}
              value={editData.firstName || ''}
              onChangeText={text =>
                setEditData(prev => ({...prev, firstName: text}))
              }
              placeholder="First Name"
            />
            <TextInput
              style={styles.editInput}
              value={editData.lastName || ''}
              onChangeText={text =>
                setEditData(prev => ({...prev, lastName: text}))
              }
              placeholder="Last Name"
            />
          </View>
        ) : (
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
        )}

        <View style={styles.roleContainer}>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor:
                  user?.role === 'mentor' ? '#10b981' : '#6366f1',
              },
            ]}>
            <Text style={styles.roleText}>
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </Text>
          </View>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#fbbf24" />
            <Text style={styles.rating}>
              {stats.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.reviewCount}>({stats.totalReviews})</Text>
          </View>
        </View>

        {editMode ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.editInput}
              value={editData.title || ''}
              onChangeText={text =>
                setEditData(prev => ({...prev, title: text}))
              }
              placeholder="Professional Title"
            />
          </View>
        ) : (
          <Text style={styles.userTitle}>{user?.title || 'No title set'}</Text>
        )}

        {editMode && (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.editInput, styles.editLocation]}
              value={editData.location || ''}
              onChangeText={text =>
                setEditData(prev => ({...prev, location: text}))
              }
              placeholder="Location (e.g., San Francisco, CA)"
            />
          </View>
        )}

        {!editMode && user?.location && (
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={14} color="#6b7280" />
            <Text style={styles.locationText}>{user.location}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderProfileStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.totalSessions}</Text>
        <Text style={styles.statLabel}>Sessions</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>
          {stats.averageRating?.toFixed(1) || '0.0'}
        </Text>
        <Text style={styles.statLabel}>Rating</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.totalReviews}</Text>
        <Text style={styles.statLabel}>Reviews</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.totalHours}</Text>
        <Text style={styles.statLabel}>Hours</Text>
      </View>
    </View>
  );

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About</Text>
      {editMode ? (
        <TextInput
          style={[styles.editInput, styles.editBio]}
          value={editData.bio || ''}
          onChangeText={text => setEditData(prev => ({...prev, bio: text}))}
          placeholder="Tell us about yourself..."
          multiline
          numberOfLines={4}
        />
      ) : (
        <Text style={styles.bioText}>{user?.bio || 'No bio available'}</Text>
      )}
    </View>
  );

  const renderSkillsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Skills & Expertise</Text>
      {editMode ? (
        <View style={styles.skillsGrid}>
          {skills.map(skill => (
            <TouchableOpacity
              key={skill}
              style={[
                styles.skillChip,
                (editData.skills || []).includes(skill) &&
                  styles.skillChipSelected,
              ]}
              onPress={() => toggleSkill(skill)}>
              <Text
                style={[
                  styles.skillChipText,
                  (editData.skills || []).includes(skill) &&
                    styles.skillChipTextSelected,
                ]}>
                {skill}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.skillsContainer}>
          {(user?.skills || []).map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {(!user?.skills || user.skills.length === 0) && (
            <Text style={styles.noSkillsText}>No skills added yet</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderExperienceSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Experience</Text>
      {editMode ? (
        <TextInput
          style={[styles.editInput, styles.editBio]}
          value={editData.experience || ''}
          onChangeText={text =>
            setEditData(prev => ({...prev, experience: text}))
          }
          placeholder="Describe your professional experience..."
          multiline
          numberOfLines={3}
        />
      ) : (
        <Text style={styles.bioText}>
          {user?.experience || 'No experience information available'}
        </Text>
      )}
    </View>
  );

  const renderPricingSection = () =>
    user?.role === 'mentor' && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        {editMode ? (
          <View style={styles.pricingEdit}>
            <Text style={styles.pricingLabel}>Hourly Rate ($)</Text>
            <TextInput
              style={styles.editInput}
              value={editData.hourlyRate?.toString() || ''}
              onChangeText={text =>
                setEditData(prev => ({
                  ...prev,
                  hourlyRate: Number.parseInt(text) || 0,
                }))
              }
              placeholder="50"
              keyboardType="numeric"
            />
          </View>
        ) : (
          <Text style={styles.pricingText}>${user?.hourlyRate || 50}/hour</Text>
        )}
      </View>
    );

  const renderMenuItems = () => (
    <View style={styles.menuContainer}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('Calendar')}>
        <Icon name="history" size={24} color="#6b7280" />
        <Text style={styles.menuText}>Session History</Text>
        <Icon name="chevron-right" size={20} color="#6b7280" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setSessionManagerVisible(true)}>
        <Icon name="devices" size={24} color="#6b7280" />
        <Text style={styles.menuText}>Active Sessions</Text>
        <View style={styles.sessionBadgeContainer}>
          {/* Kiểm tra activeSessions trước khi truy cập length */}
          {activeSessions && activeSessions.length > 1 && (
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>
                {activeSessions.length}
              </Text>
            </View>
          )}
          <Icon name="chevron-right" size={20} color="#6b7280" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => setSettingsModal(true)}>
        <Icon name="settings" size={24} color="#6b7280" />
        <Text style={styles.menuText}>Settings</Text>
        <Icon name="chevron-right" size={20} color="#6b7280" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuItem, styles.signOutItem]}
        onPress={handleSignOut}>
        <Icon name="logout" size={24} color="#ef4444" />
        <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
        <Icon name="chevron-right" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="hourglass-empty" size={32} color="#6366f1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            if (editMode) {
              handleSave();
            } else {
              setEditMode(true);
            }
          }}>
          <Icon
            name={editMode ? 'check' : 'edit'}
            size={20}
            color={editMode ? '#10b981' : '#6366f1'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {renderProfileHeader()}
        {renderProfileStats()}
        {renderAboutSection()}
        {renderSkillsSection()}
        {renderExperienceSection()}
        {renderPricingSection()}
        {!editMode && renderMenuItems()}
      </ScrollView>

      {/* Session Manager Modal */}
      <SessionManager
        visible={sessionManagerVisible}
        onClose={() => setSessionManagerVisible(false)}
      />

      {/* Settings Modal */}
      <Modal
        visible={settingsModal}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSettingsModal(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Settings</Text>
            <View style={{width: 24}} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Notifications</Text>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Messages</Text>
                  <Text style={styles.settingDescription}>
                    Get notified about new messages
                  </Text>
                </View>
                <Switch
                  value={notifications.messages}
                  onValueChange={value => {
                    const newSettings = {...notifications, messages: value};
                    updateNotificationSettings(newSettings);
                  }}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Sessions</Text>
                  <Text style={styles.settingDescription}>
                    Reminders about upcoming sessions
                  </Text>
                </View>
                <Switch
                  value={notifications.sessions}
                  onValueChange={value => {
                    const newSettings = {...notifications, sessions: value};
                    updateNotificationSettings(newSettings);
                  }}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Marketing</Text>
                  <Text style={styles.settingDescription}>
                    Updates about new features
                  </Text>
                </View>
                <Switch
                  value={notifications.marketing}
                  onValueChange={value => {
                    const newSettings = {...notifications, marketing: value};
                    updateNotificationSettings(newSettings);
                  }}
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Security</Text>

              <TouchableOpacity
                style={styles.settingButton}
                onPress={handleSignOutAllDevices}>
                <Text style={[styles.settingButtonText, {color: '#ef4444'}]}>
                  Sign Out All Devices
                </Text>
                <Icon name="chevron-right" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Privacy</Text>

              <TouchableOpacity style={styles.settingButton}>
                <Text style={styles.settingButtonText}>Privacy Policy</Text>
                <Icon name="chevron-right" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingButton}>
                <Text style={styles.settingButtonText}>Terms of Service</Text>
                <Icon name="chevron-right" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Account</Text>

              <TouchableOpacity style={styles.settingButton}>
                <Text style={styles.settingButtonText}>Change Password</Text>
                <Icon name="chevron-right" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  uploadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  editForm: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
    marginHorizontal: 4,
    flex: 1,
    height: 40,
  },
  editTitle: {
    marginHorizontal: 0,
    marginBottom: 8,
    height: 40,
    fontSize: 14,
  },
  editLocation: {
    marginHorizontal: 0,
    marginBottom: 8,
    height: 40,
    fontSize: 14,
  },
  editBio: {
    textAlignVertical: 'top',
    minHeight: 80,
    marginHorizontal: 0,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 12,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 2,
  },
  userTitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
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
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillTag: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    color: '#374151',
  },
  skillChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  skillChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  skillChipText: {
    fontSize: 12,
    color: '#374151',
  },
  skillChipTextSelected: {
    color: '#fff',
  },
  noSkillsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  pricingEdit: {
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  pricingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  sessionBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sessionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#ef4444',
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
  },
  settingsSection: {
    padding: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#ef4444',
  },
});
