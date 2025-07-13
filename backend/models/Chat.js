const { FIREBASE_DB } = require('../config/firebase');
// IMPORTANT: Ensure 'Timestamp' is imported here
const { collection, doc, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, Timestamp } = require('firebase/firestore');

const chatsCollection = collection(FIREBASE_DB, 'chats');

class Chat {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.message = data.message;
    this.sender = data.sender; // 'user' or 'admin'
    // --- THIS SECTION IS CRITICAL FOR READING TIMESTAMPS CORRECTLY ---
    // Firestore returns timestamp as a Firebase Timestamp object.
    // Convert it to a JavaScript Date object for consistent use within the backend.
    // Provide a fallback to `new Date()` if `data.timestamp` is unexpectedly missing (e.g., old malformed data).
    this.timestamp = data.timestamp instanceof Timestamp
                     ? data.timestamp.toDate() 
                     : (data.timestamp || new Date()); 
  }

  async save() {
    // Prepare data for Firestore.
    // If this.timestamp is already a JS Date object (from a fetched instance being re-saved/updated),
    // convert it back to a Firestore Timestamp.
    // If it's a new instance without an explicitly set timestamp (i.e., created from incoming request data),
    // use `serverTimestamp()` so Firestore sets the timestamp on the server.
    const chatData = {
      userId: this.userId,
      message: this.message,
      sender: this.sender,
      timestamp: this.timestamp instanceof Date ? Timestamp.fromDate(this.timestamp) : serverTimestamp(),
    };

    if (this.id) {
      // If it's an existing document, update it.
      await updateDoc(doc(chatsCollection, this.id), chatData);
    } else {
      // If it's a new document, always use serverTimestamp to ensure consistency and server-side generation.
      chatData.timestamp = serverTimestamp(); 
      const newChatRef = await addDoc(chatsCollection, chatData);
      this.id = newChatRef.id;
    }
    return this;
  }

  static async findByUserId(userId) {
    // Query messages for a specific user, ordered by timestamp.
    // The orderBy clause relies on a valid timestamp field in Firestore documents.
    const q = query(chatsCollection, where('userId', '==', userId), orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    // Map raw Firestore data (including Firebase Timestamp objects) to Chat instances.
    // The Chat constructor will then correctly convert `data.timestamp` to a JavaScript Date object.
    return querySnapshot.docs.map(doc => new Chat({ id: doc.id, ...doc.data() }));
  }

  static async findActiveSessions() {
    // Retrieve all chat messages, ordered by timestamp descending to find the most recent message for each user.
    const q = query(chatsCollection, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const sessions = {};
    querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Create a temporary Chat object to ensure the timestamp is a normalized JavaScript Date object.
        const tempChat = new Chat({ ...data, id: doc.id }); 
        
        // Only consider the most recent message for each user's session.
        if (!sessions[data.userId]) {
            sessions[data.userId] = {
                userId: data.userId,
                // Assuming username needs to be fetched from User model or available here if stored in chat messages.
                // For this context, we rely on the controller to add username from the User model.
                lastMessage: data.message,
                lastMessageTimestamp: tempChat.timestamp, // This will be a JavaScript Date object.
            };
        }
    });
    return Object.values(sessions);
  }
}

module.exports = Chat;