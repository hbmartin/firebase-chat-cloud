'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Update all participants' inboxes on new message
exports.sayhi = functions.database.ref('/conversations/{conversationid}').onCreate(event => {
  if (event.data.exists() && !event.data.previous.exists()) {
    const conversationRef = event.data.ref;
    const conversation = event.data.val();
    const conversationId = event.params.conversationid;
    const messageRef = conversationRef.child("data").push();
	const messageId = messageRef.key;
	const messageText = "Hi! Welcome to " + conversation.meta.name;
    const message = {
		"conversationId": conversationId,
		"id": messageId,
		"text": messageText,
		"userAvatar": "https://dl.dropboxusercontent.com/u/7468399/coach.png?raw=1",
		"userId": "__bot",
		"userName": "Coach",
		"timestamp": admin.database.ServerValue.TIMESTAMP,
    	"type": "TEXT"
    };
    
    return messageRef.set(message);
  }
});

// Update all participants' inboxes on new message
exports.updateinboxes = functions.database.ref('/conversations/{conversationid}/data/{msgid}').onCreate(event => {
  if (event.data.exists()) {
    const inboxes = admin.database().ref("inbox");
    const conversationId = event.params.conversationid;
    const message = event.data.val();
    const collectionRef = event.data.ref.parent.parent;
    const participantsRef = collectionRef.child('meta').child('participants');
    
    return participantsRef.once('value').then(snapshot => {
        const participants = snapshot.val();
        const promises = [];
        Object.keys(participants).forEach(userId => {
            promises.push(inboxes.child(userId).child("data").child(conversationId).set(message));
        });
        return Promise.all(promises);
      });
  }
});

// Keeps track of the length of the 'data' child list in a separate property.
exports.counttotalchange = functions.database.ref('/conversations/{conversationid}/data/{msgid}').onCreate(event => {
  const collectionRef = event.data.ref.parent.parent;
  const countRef = collectionRef.child('meta').child('total');

  // Return the promise from countRef.transaction() so our function 
  // waits for this async event to complete before it exits.
  return countRef.transaction(current => {
    if (event.data.exists() && !event.data.previous.exists()) {
      return (current || 0) + 1;
    }
    else if (!event.data.exists() && event.data.previous.exists()) {
      return (current || 0) - 1;
    }
  }).then(() => {
    console.log('Counter updated.');
  });
});

// If the total gets deleted, recount the number of data
exports.recounttotal = functions.database.ref('/conversations/{conversationid}/meta/total').onDelete(event => {
  const collectionRef = event.data.ref.parent.parent;
  if (!event.data.exists()) {
    const countRef = event.data.ref;
    const collectionRef = countRef.parent.parent.child('data');
    
    // Return the promise from countRef.set() so our function 
    // waits for this async event to complete before it exits.
    return collectionRef.once('value')
        .then(messagesData => {
            const numChildren = messagesData.numChildren();
            if (numChildren > 0) {
                countRef.set();
            }
		});
  }
});
