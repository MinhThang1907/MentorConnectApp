import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function ChatScreen({navigation, route}) {
  const {conversationId, userId, userName} = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchOtherUser();
    setupConversation();
  }, []);

  useEffect(() => {
    if (conversation?.id) {
      const unsubscribe = setupMessagesListener();
      return unsubscribe;
    }
  }, [conversation]);

  const fetchOtherUser = async () => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        setOtherUser({id: userId, ...userDoc.data()});
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const setupConversation = async () => {
    try {
      const currentUser = auth().currentUser;
      let conversationRef;

      if (conversationId) {
        // Use existing conversation
        conversationRef = firestore()
          .collection('conversations')
          .doc(conversationId);
        const conversationDoc = await conversationRef.get();
        if (conversationDoc.exists) {
          setConversation({id: conversationDoc.id, ...conversationDoc.data()});
        }
      } else {
        // Create or find existing conversation
        const existingConversation = await firestore()
          .collection('conversations')
          .where('participants', 'array-contains', currentUser.uid)
          .get();

        let foundConversation = null;
        existingConversation.docs.forEach(doc => {
          const data = doc.data();
          if (data.participants.includes(userId)) {
            foundConversation = {id: doc.id, ...data};
          }
        });

        if (foundConversation) {
          setConversation(foundConversation);
        } else {
          // Create new conversation
          const newConversationData = {
            participants: [currentUser.uid, userId],
            createdAt: firestore.FieldValue.serverTimestamp(),
            lastMessage: '',
            lastMessageAt: firestore.FieldValue.serverTimestamp(),
            unreadCount: {
              [currentUser.uid]: 0,
              [userId]: 0,
            },
          };

          const newConversationRef = await firestore()
            .collection('conversations')
            .add(newConversationData);

          setConversation({
            id: newConversationRef.id,
            ...newConversationData,
          });
        }
      }
    } catch (error) {
      console.error('Error setting up conversation:', error);
    }
    setLoading(false);
  };

  const setupMessagesListener = () => {
    return firestore()
      .collection('conversations')
      .doc(conversation.id)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(messagesData);

        // Mark messages as read
        markMessagesAsRead();
      });
  };

  const markMessagesAsRead = async () => {
    try {
      const currentUser = auth().currentUser;
      await firestore()
        .collection('conversations')
        .doc(conversation.id)
        .update({
          [`unreadCount.${currentUser.uid}`]: 0,
        });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversation?.id) return;

    const currentUser = auth().currentUser;
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Add message to subcollection
      await firestore()
        .collection('conversations')
        .doc(conversation.id)
        .collection('messages')
        .add({
          text: messageText,
          senderId: currentUser.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
          type: 'text',
        });

      // Update conversation with last message
      await firestore()
        .collection('conversations')
        .doc(conversation.id)
        .update({
          lastMessage: messageText,
          lastMessageAt: firestore.FieldValue.serverTimestamp(),
          [`unreadCount.${userId}`]: firestore.FieldValue.increment(1),
        });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageText); // Restore message on error
    }
  };

  const formatTime = timestamp => {
    if (!timestamp) return '';

    const messageTime = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return messageTime.toLocaleDateString();
    }
  };

  const renderMessage = ({item, index}) => {
    const currentUser = auth().currentUser;
    const isMyMessage = item.senderId === currentUser.uid;
    const showAvatar =
      !isMyMessage &&
      (index === 0 || messages[index - 1]?.senderId !== item.senderId);

    return (
      <View
        style={[
          styles.messageContainer,
          isMyMessage
            ? styles.myMessageContainer
            : styles.otherMessageContainer,
        ]}>
        {showAvatar && (
          <Image
            source={{
              uri:
                otherUser?.profileImage ||
                'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png',
            }}
            style={styles.messageAvatar}
          />
        )}

        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
            !showAvatar && !isMyMessage && styles.messageBubbleNoAvatar,
          ]}>
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
            ]}>
            {item.text}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
            ]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Icon name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.headerInfo}>
        <Image
          source={{
            uri:
              otherUser?.profileImage ||
              'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png',
          }}
          style={styles.headerAvatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.headerName}>
            {otherUser?.firstName} {otherUser?.lastName}
          </Text>
          <Text style={styles.headerStatus}>
            {otherUser?.role?.charAt(0).toUpperCase() +
              otherUser?.role?.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerAction}>
          <Icon name="videocam" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Icon name="phone" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerAction}>
          <Icon name="more-vert" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInputBar = () => (
    <View style={styles.inputContainer}>
      <TouchableOpacity style={styles.attachButton}>
        <Icon name="attach-file" size={24} color="#6b7280" />
      </TouchableOpacity>

      <TextInput
        style={styles.textInput}
        value={newMessage}
        onChangeText={setNewMessage}
        placeholder="Type a message..."
        multiline
        maxLength={1000}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          newMessage.trim()
            ? styles.sendButtonActive
            : styles.sendButtonInactive,
        ]}
        onPress={sendMessage}
        disabled={!newMessage.trim()}>
        <Icon
          name="send"
          size={20}
          color={newMessage.trim() ? '#fff' : '#6b7280'}
        />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={{
          uri:
            otherUser?.profileImage ||
            'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png',
        }}
        style={styles.emptyStateAvatar}
      />
      <Text style={styles.emptyStateTitle}>
        Start a conversation with {otherUser?.firstName}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        Send a message to begin your mentoring journey together
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      {renderHeader()}

      {messages.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          inverted
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderInputBar()}
    </KeyboardAvoidingView>
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#e0e7ff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  messagesList: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessageBubble: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageBubbleNoAvatar: {
    marginLeft: 40,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#111827',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#e0e7ff',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#6b7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#6366f1',
  },
  sendButtonInactive: {
    backgroundColor: '#f3f4f6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
