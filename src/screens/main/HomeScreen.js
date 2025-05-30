import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function HomeScreen({navigation}) {
  const [user, setUser] = useState(null);
  const [featuredMentors, setFeaturedMentors] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
    fetchFeaturedMentors();
    fetchUpcomingSessions();
  }, []);

  const fetchUserData = async () => {
    try {
      const currentUser = auth().currentUser;
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      setUser(userDoc.data());
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchFeaturedMentors = async () => {
    try {
      const mentorsSnapshot = await firestore()
        .collection('users')
        .where('role', '==', 'mentor')
        .limit(5)
        .get();

      const mentors = mentorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeaturedMentors(mentors);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    }
  };

  const fetchUpcomingSessions = async () => {
    try {
      const currentUser = auth().currentUser;
      const sessionsSnapshot = await firestore()
        .collection('sessions')
        .where('participants', 'array-contains', currentUser.uid)
        .where('status', '==', 'confirmed')
        .orderBy('scheduledAt', 'asc')
        .limit(3)
        .get();

      const sessions = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUpcomingSessions(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMentorCard = ({item}) => (
    <TouchableOpacity
      style={styles.mentorCard}
      onPress={() => navigation.navigate('MentorProfile', {mentorId: item.id})}>
      <Image
        source={{
          uri:
            item.profileImage ||
            'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png',
        }}
        style={styles.mentorImage}
      />
      <Text style={styles.mentorName}>
        {item.firstName} {item.lastName}
      </Text>
      <Text style={styles.mentorTitle}>{item.title || 'Mentor'}</Text>
      <View style={styles.ratingContainer}>
        <Icon name="star" size={14} color="#fbbf24" />
        <Text style={styles.rating}>{item.rating || '5.0'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSessionCard = ({item}) => (
    <TouchableOpacity style={styles.sessionCard}>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle}>{item.title}</Text>
        <Text style={styles.sessionTime}>
          {new Date(item.scheduledAt?.toDate()).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity style={styles.joinButton}>
        <Text style={styles.joinButtonText}>Join</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}
          </Text>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="notifications" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Search')}>
          <Icon name="search" size={24} color="#6366f1" />
          <Text style={styles.actionText}>Find Mentor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Calendar')}>
          <Icon name="event" size={24} color="#10b981" />
          <Text style={styles.actionText}>My Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Messages')}>
          <Icon name="chat" size={24} color="#f59e0b" />
          <Text style={styles.actionText}>Messages</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={upcomingSessions}
            renderItem={renderSessionCard}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Featured Mentors */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Mentors</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={featuredMentors}
          renderItem={renderMentorCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mentorsList}
        />
      </View>

      {/* Learning Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learning Resources</Text>
        <View style={styles.resourcesGrid}>
          <TouchableOpacity style={styles.resourceCard}>
            <Icon name="book" size={32} color="#6366f1" />
            <Text style={styles.resourceTitle}>Articles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceCard}>
            <Icon name="play-circle-filled" size={32} color="#10b981" />
            <Text style={styles.resourceTitle}>Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceCard}>
            <Icon name="headset" size={32} color="#f59e0b" />
            <Text style={styles.resourceTitle}>Podcasts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resourceCard}>
            <Icon name="quiz" size={32} color="#ef4444" />
            <Text style={styles.resourceTitle}>Quizzes</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  mentorsList: {
    paddingLeft: 20,
  },
  mentorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mentorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  mentorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  mentorTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 2,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  joinButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resourcesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
