import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function MessagesScreen({navigation}) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = fetchConversations();
    return unsubscribe;
  }, []);

  useEffect(() => {
    filterConversations();
  }, [searchQuery, conversations]);

  const fetchConversations = () => {
    const currentUser = auth().currentUser;

    return firestore()
      .collection('conversations')
      .where('participants', 'array-contains', currentUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(async snapshot => {
        const conversationsData = [];

        for (const doc of snapshot.docs) {
          const conversation = {id: doc.id, ...doc.data()};

          // Get other participant info
          const otherParticipantId = conversation.participants.find(
            id => id !== currentUser.uid,
          );

          if (otherParticipantId) {
            const userDoc = await firestore()
              .collection('users')
              .doc(otherParticipantId)
              .get();

            if (userDoc.exists) {
              conversation.otherUser = {
                id: otherParticipantId,
                ...userDoc.data(),
              };
            }
          }

          conversationsData.push(conversation);
        }

        setConversations(conversationsData);
        setLoading(false);
      });
  };

  const filterConversations = () => {
    if (!searchQuery) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter(
      conversation =>
        conversation.otherUser &&
        `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );

    setFilteredConversations(filtered);
  };

  const formatTime = timestamp => {
    if (!timestamp) return '';

    const now = new Date();
    const messageTime = timestamp.toDate();
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const getUnreadCount = conversation => {
    const currentUser = auth().currentUser;
    return conversation.unreadCount?.[currentUser.uid] || 0;
  };

  const renderConversationItem = ({item}) => {
    const unreadCount = getUnreadCount(item);

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          unreadCount > 0 && styles.unreadConversation,
        ]}
        onPress={() =>
          navigation.navigate('Chat', {
            conversationId: item.id,
            userId: item.otherUser?.id,
            userName: `${item.otherUser?.firstName} ${item.otherUser?.lastName}`,
          })
        }>
        <Image
          source={{
            uri:
              item.otherUser?.profileImage ||
              'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png',
          }}
          style={styles.avatar}
        />

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.userName,
                unreadCount > 0 && styles.unreadUserName,
              ]}>
              {item.otherUser?.firstName} {item.otherUser?.lastName}
            </Text>
            <Text style={styles.timestamp}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>

          <View style={styles.messagePreview}>
            <Text
              style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadMessage,
              ]}
              numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>

          {item.otherUser?.role && (
            <Text style={styles.userRole}>
              {item.otherUser.role.charAt(0).toUpperCase() +
                item.otherUser.role.slice(1)}
            </Text>
          )}
        </View>

        <View style={styles.conversationActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="videocam" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="phone" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="chat-bubble-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No conversations yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start connecting with mentors or mentees to begin chatting
      </Text>
      <TouchableOpacity
        style={styles.startChattingButton}
        onPress={() => navigation.navigate('Search')}>
        <Text style={styles.startChattingText}>Find People to Chat</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
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
            placeholder="Search conversations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.conversationsList}
        refreshing={loading}
        onRefresh={() => {
          setLoading(true);
          // Refresh will be handled by the real-time listener
        }}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Search')}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
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
  conversationsList: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadConversation: {
    backgroundColor: '#fefefe',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  unreadUserName: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
  },
  unreadMessage: {
    color: '#111827',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  conversationActions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  startChattingButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  startChattingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
