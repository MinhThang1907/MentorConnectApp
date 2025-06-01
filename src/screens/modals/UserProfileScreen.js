'use client';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getOptimizedImageUrl} from '../../utils/cloudinaryConfig';

export default function UserProfileScreen({navigation, route}) {
  const {userId} = route.params;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [newReview, setNewReview] = useState({rating: 5, comment: ''});
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageRating: 0,
    totalReviews: 0,
    totalHours: 0,
  });

  useEffect(() => {
    fetchUserData();
    fetchUserStats();
    fetchReviews();
    checkFollowStatus();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists()) {
        setUser({id: userId, ...userDoc.data()});
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user profile');
    }
    setLoading(false);
  };

  const fetchUserStats = async () => {
    try {
      // Fetch sessions data
      const sessionsSnapshot = await firestore()
        .collection('sessions')
        .where('participants', 'array-contains', userId)
        .get();

      const sessions = sessionsSnapshot.docs.map(doc => doc.data());
      const completedSessions = sessions.filter(
        session => session.status === 'completed',
      );

      // Fetch reviews data
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('revieweeId', '==', userId)
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
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
        totalHours: Math.round(totalHours * 10) / 10,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const reviewsSnapshot = await firestore()
        .collection('reviews')
        .where('revieweeId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const reviewsData = [];
      for (const doc of reviewsSnapshot.docs) {
        const review = {id: doc.id, ...doc.data()};

        // Fetch reviewer info
        const reviewerDoc = await firestore()
          .collection('users')
          .doc(review.reviewerId)
          .get();

        if (reviewerDoc.exists()) {
          review.reviewer = reviewerDoc.data();
        }

        reviewsData.push(review);
      }

      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const currentUser = auth().currentUser;
      const followDoc = await firestore()
        .collection('follows')
        .doc(`${currentUser.uid}_${userId}`)
        .get();

      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const currentUser = auth().currentUser;
      const followId = `${currentUser.uid}_${userId}`;

      if (isFollowing) {
        await firestore().collection('follows').doc(followId).delete();
        setIsFollowing(false);
      } else {
        await firestore().collection('follows').doc(followId).set({
          followerId: currentUser.uid,
          followeeId: userId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        setIsFollowing(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleMessage = () => {
    navigation.navigate('Chat', {
      userId: userId,
      userName: `${user.firstName} ${user.lastName}`,
    });
  };

  const handleBookSession = () => {
    navigation.navigate('Booking', {
      mentorId: userId,
      mentorName: `${user.firstName} ${user.lastName}`,
    });
  };

  const submitReview = async () => {
    if (!newReview.comment.trim()) {
      Alert.alert('Error', 'Please write a comment');
      return;
    }

    try {
      const currentUser = auth().currentUser;

      await firestore().collection('reviews').add({
        reviewerId: currentUser.uid,
        revieweeId: userId,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      setReviewModalVisible(false);
      setNewReview({rating: 5, comment: ''});
      fetchReviews();
      fetchUserStats();
      Alert.alert('Success', 'Review submitted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const getProfileImageUrl = userData => {
    if (userData?.profileImagePublicId) {
      // Use Cloudinary optimized URL
      return getOptimizedImageUrl(userData.profileImagePublicId, {
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
      });
    }
    return (
      userData?.profileImage ||
      'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'
    );
  };

  const getReviewerImageUrl = reviewerData => {
    if (reviewerData?.profileImagePublicId) {
      return getOptimizedImageUrl(reviewerData.profileImagePublicId, {
        width: 64,
        height: 64,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
      });
    }
    return (
      reviewerData?.profileImage ||
      'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'
    );
  };

  const renderStars = (rating, size = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-border'}
          size={size}
          color="#fbbf24"
        />,
      );
    }
    return stars;
  };

  const renderReviewItem = ({item}) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Image
          source={{uri: getReviewerImageUrl(item.reviewer)}}
          style={styles.reviewerAvatar}
        />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>
            {item.reviewer?.firstName} {item.reviewer?.lastName}
          </Text>
          <View style={styles.reviewRating}>
            {renderStars(item.rating, 12)}
            <Text style={styles.reviewDate}>
              {item.createdAt?.toDate().toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
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

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={48} color="#ef4444" />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="more-vert" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image
            source={{uri: getProfileImageUrl(user)}}
            style={styles.avatar}
          />

          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>

          <View style={styles.roleContainer}>
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor:
                    user.role === 'mentor' ? '#10b981' : '#6366f1',
                },
              ]}>
              <Text style={styles.roleText}>
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </Text>
            </View>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#fbbf24" />
              <Text style={styles.rating}>{stats.averageRating}</Text>
              <Text style={styles.reviewCount}>({stats.totalReviews})</Text>
            </View>
          </View>

          <Text style={styles.userTitle}>{user.title}</Text>

          {user.location && (
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={14} color="#6b7280" />
              <Text style={styles.locationText}>{user.location}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleMessage}>
            <Icon name="chat" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Message</Text>
          </TouchableOpacity>

          {user.role === 'mentor' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBookSession}>
              <Icon name="event" size={20} color="#6366f1" />
              <Text style={styles.secondaryButtonText}>Book Session</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollow}>
            <Icon
              name={isFollowing ? 'favorite' : 'favorite-border'}
              size={20}
              color={isFollowing ? '#fff' : '#6366f1'}
            />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.averageRating}</Text>
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

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{user.bio || 'No bio available'}</Text>
        </View>

        {/* Skills Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills & Expertise</Text>
          <View style={styles.skillsContainer}>
            {(user.skills || []).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {(!user.skills || user.skills.length === 0) && (
              <Text style={styles.noSkillsText}>No skills listed</Text>
            )}
          </View>
        </View>

        {/* Experience Section */}
        {user.experience && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.bioText}>{user.experience}</Text>
          </View>
        )}

        {/* Pricing Section */}
        {user.role === 'mentor' && user.hourlyRate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <Text style={styles.pricingText}>${user.hourlyRate}/hour</Text>
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>
              Reviews ({stats.totalReviews})
            </Text>
            <TouchableOpacity
              style={styles.addReviewButton}
              onPress={() => setReviewModalVisible(true)}>
              <Icon name="add" size={16} color="#6366f1" />
              <Text style={styles.addReviewText}>Add Review</Text>
            </TouchableOpacity>
          </View>

          {reviews.length > 0 ? (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <TouchableOpacity onPress={submitReview}>
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.ratingLabel}>Rating</Text>
            <View style={styles.starRating}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() =>
                    setNewReview(prev => ({...prev, rating: star}))
                  }>
                  <Icon
                    name={star <= newReview.rating ? 'star' : 'star-border'}
                    size={32}
                    color="#fbbf24"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.commentLabel}>Comment</Text>
            <TextInput
              style={styles.commentInput}
              value={newReview.comment}
              onChangeText={text =>
                setNewReview(prev => ({...prev, comment: text}))
              }
              placeholder="Share your experience..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 8,
    borderBottomColor: '#f3f4f6',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    marginRight: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  followButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#ef4444',
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
  noSkillsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  pricingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10b981',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addReviewText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
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
  submitText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  starRating: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
