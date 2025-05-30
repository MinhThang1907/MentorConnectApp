import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function SearchScreen({navigation}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    role: 'all', // 'mentor', 'mentee', 'all'
    skills: [],
    rating: 0,
    priceRange: [0, 1000],
  });

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
  ];

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, filters]);

  const fetchCurrentUser = async () => {
    try {
      const user = auth().currentUser;
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      setCurrentUser(userDoc.data());
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await firestore()
        .collection('users')
        .where('role', '!=', null)
        .get();

      const usersData = await Promise.all(
        usersSnapshot.docs.map(async doc => {
          const reviewsSnapshot = await firestore()
            .collection('reviews')
            .where('revieweeId', '==', doc.id)
            .get();

          const reviews = reviewsSnapshot.docs.map(doc => doc.data());
          const totalRating = reviews.reduce(
            (sum, review) => sum + review.rating,
            0,
          );
          const averageRating =
            reviews.length > 0 ? totalRating / reviews.length : 0;

          return {id: doc.id, rating: averageRating.toFixed(1), ...doc.data()};
        }),
      );

      setUsers(usersData.filter(user => user.id !== auth().currentUser.uid));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  const filterUsers = async () => {
    let filtered = users;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        user =>
          `${user.firstName} ${user.lastName}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (user.title &&
            user.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (user.skills &&
            user.skills.some(skill =>
              skill.toLowerCase().includes(searchQuery.toLowerCase()),
            )),
      );
    }

    // Filter by role
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Filter by skills
    if (filters.skills.length > 0) {
      filtered = filtered.filter(
        user =>
          user.skills &&
          filters.skills.some(skill => user.skills.includes(skill)),
      );
    }

    // Filter by rating
    if (filters.rating > 0) {
      filtered = filtered.filter(user => (user.rating || 0) >= filters.rating);
    }

    setFilteredUsers(filtered);
  };

  const renderUserCard = ({item}) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('UserProfile', {userId: item.id})}>
      <Image
        source={{
          uri:
            item.profileImage ||
            'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png',
        }}
        style={styles.userImage}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.userTitle}>{item.title || `${item.role}`}</Text>
        <Text style={styles.userBio} numberOfLines={2}>
          {item.bio}
        </Text>

        {item.skills && (
          <View style={styles.skillsContainer}>
            {item.skills.slice(0, 3).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
            {item.skills.length > 3 && (
              <Text style={styles.moreSkills}>+{item.skills.length - 3}</Text>
            )}
          </View>
        )}

        <View style={styles.userMeta}>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#fbbf24" />
            <Text style={styles.rating}>{item.rating || '5.0'}</Text>
          </View>
          {item.role === 'mentor' && item.hourlyRate && (
            <Text style={styles.price}>${item.hourlyRate}/hr</Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => handleConnect(item)}>
        <Icon name="chat" size={20} color="#6366f1" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleConnect = user => {
    navigation.navigate('Chat', {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
    });
  };

  const toggleSkillFilter = skill => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const clearFilters = () => {
    setFilters({
      role: 'all',
      skills: [],
      rating: 0,
      priceRange: [0, 1000],
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Find {currentUser?.role === 'mentor' ? 'Mentees' : 'Mentors'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon
            name="search"
            size={20}
            color="#6b7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, skills, or title..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}>
          <Icon name="tune" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(filters.role !== 'all' ||
        filters.skills.length > 0 ||
        filters.rating > 0) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            style={styles.activeFiltersScroll}
            showsHorizontalScrollIndicator={false}>
            {filters.role !== 'all' && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>{filters.role}</Text>
                <TouchableOpacity
                  onPress={() => setFilters(prev => ({...prev, role: 'all'}))}>
                  <Icon name="close" size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            )}
            {filters.skills.map((skill, index) => (
              <View key={index} style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>{skill}</Text>
                <TouchableOpacity onPress={() => toggleSkillFilter(skill)}>
                  <Icon name="close" size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            ))}
            {filters.rating > 0 && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  {filters.rating}+ stars
                </Text>
                <TouchableOpacity
                  onPress={() => setFilters(prev => ({...prev, rating: 0}))}>
                  <Icon name="close" size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={clearFilters}>
              <Text style={styles.clearAllButton}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Results */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.usersList}
        refreshing={loading}
        onRefresh={fetchUsers}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="search-off" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No users found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Icon name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Role Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Role</Text>
              <View style={styles.roleFilters}>
                {['all', 'mentor', 'mentee'].map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleFilter,
                      filters.role === role && styles.roleFilterActive,
                    ]}
                    onPress={() => setFilters(prev => ({...prev, role}))}>
                    <Text
                      style={[
                        styles.roleFilterText,
                        filters.role === role && styles.roleFilterTextActive,
                      ]}>
                      {role === 'all'
                        ? 'All'
                        : role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skills Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Skills</Text>
              <View style={styles.skillsGrid}>
                {skills.map(skill => (
                  <TouchableOpacity
                    key={skill}
                    style={[
                      styles.skillFilter,
                      filters.skills.includes(skill) &&
                        styles.skillFilterActive,
                    ]}
                    onPress={() => toggleSkillFilter(skill)}>
                    <Text
                      style={[
                        styles.skillFilterText,
                        filters.skills.includes(skill) &&
                          styles.skillFilterTextActive,
                      ]}>
                      {skill}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rating Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Minimum Rating</Text>
              <View style={styles.ratingFilters}>
                {[0, 3, 4, 4.5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingFilter,
                      filters.rating === rating && styles.ratingFilterActive,
                    ]}
                    onPress={() => setFilters(prev => ({...prev, rating}))}>
                    <Icon
                      name="star"
                      size={16}
                      color={filters.rating === rating ? '#fff' : '#fbbf24'}
                    />
                    <Text
                      style={[
                        styles.ratingFilterText,
                        filters.rating === rating &&
                          styles.ratingFilterTextActive,
                      ]}>
                      {rating === 0 ? 'Any' : `${rating}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
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
  header: {
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFiltersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  activeFiltersScroll: {
    paddingHorizontal: 16,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 14,
    color: '#374151',
    marginRight: 4,
  },
  removeFilterButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  usersList: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userTitle: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 16,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillTag: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  skillText: {
    fontSize: 10,
    color: '#374151',
  },
  moreSkills: {
    fontSize: 10,
    color: '#6b7280',
    alignSelf: 'center',
  },
  userMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  price: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  connectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
  clearText: {
    fontSize: 16,
    color: '#ef4444',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  roleFilters: {
    flexDirection: 'row',
  },
  roleFilter: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    alignItems: 'center',
  },
  roleFilterActive: {
    backgroundColor: '#6366f1',
  },
  roleFilterText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  roleFilterTextActive: {
    color: '#fff',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    marginBottom: 8,
  },
  skillFilterActive: {
    backgroundColor: '#6366f1',
  },
  skillFilterText: {
    fontSize: 12,
    color: '#374151',
  },
  skillFilterTextActive: {
    color: '#fff',
  },
  ratingFilters: {
    flexDirection: 'row',
  },
  ratingFilter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  ratingFilterActive: {
    backgroundColor: '#6366f1',
  },
  ratingFilterText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 4,
  },
  ratingFilterTextActive: {
    color: '#fff',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applyButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
