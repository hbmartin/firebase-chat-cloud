'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Update all participants' inboxes on new message
exports.updateinboxes = functions.database.ref('/conversations/{conversationid}/data/{msgid}').onWrite(event => {
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

// Keeps track of the length of the 'data' child list in a separate property.
exports.counttotalchange = functions.database.ref('/conversations/{conversationid}/data/{msgid}').onWrite(event => {
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
exports.recounttotal = functions.database.ref('/conversations/{conversationid}/meta/total').onWrite(event => {
  if (!event.data.exists()) {
    const countRef = event.data.ref;
    const collectionRef = countRef.parent.parent.child('data');
    
    // Return the promise from countRef.set() so our function 
    // waits for this async event to complete before it exits.
    return collectionRef.once('value')
        .then(messagesData => countRef.set(messagesData.numChildren()));
  }
});
