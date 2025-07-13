const { FIREBASE_DB } = require('../config/firebase');
const { collection, doc, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } = require('firebase/firestore');

const chatsCollection = collection(FIREBASE_DB, 'chats');

class Chat {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.message = data.message;
    this.sender = data.sender; // 'user' or 'admin'
    this.timestamp = data.timestamp || serverTimestamp();
  }

  async save() {
    const chatData = {
      userId: this.userId,
      message: this.message,
      sender: this.sender,
      timestamp: this.timestamp,
    };
    const newChatRef = await addDoc(chatsCollection, chatData);
    this.id = newChatRef.id;
    return this;
  }

  static async findByUserId(userId) {
    const q = query(chatsCollection, where('userId', '==', userId), orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => new Chat({ id: doc.id, ...doc.data() }));
  }

  static async findActiveSessions() {
    const q = query(chatsCollection, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const sessions = {};
    querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!sessions[data.userId]) {
            sessions[data.userId] = {
                userId: data.userId,
                lastMessage: data.message,
                lastMessageTimestamp: data.timestamp,
            };
        }
    });

    return Object.values(sessions);
  }
}

module.exports = Chat;
