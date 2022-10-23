import { Note } from "../guitar/model"
import { AudioMonitorEventDetail } from "../audioMonitor"
import { Dexie } from 'dexie';
import 'dexie-observable';
import 'dexie-syncable';

// By defining the interface of table records,
// you get better type safety and code completion
export interface EventDetail {
  uuid: string; // Primary key.
  type: string; // type of event
  timestamp: number; // unix ms
}

export interface GuitarNoteTrainerEvent extends EventDetail {
  noteAsked: Note,
  noteGiven: AudioMonitorEventDetail
}

// // Create your instance
export class MyAppDatabase extends Dexie {
  // how to have relations:
  // https://dexie.org/docs/Version/Version.stores()#detailed-sample
  guitarNoteTrainerEvent!: Dexie.Table<GuitarNoteTrainerEvent>;
  
  constructor() {  
    super("MyAppDatabase");
    
    //
    // Define tables and indexes
    // (Here's where the implicit table props are dynamically created)
    //
    this.version(1).stores({
      guitarNoteTrainerEvent: "uuid, type, timestamp, noteAsked, noteGiven "
    });
  }
}

let db = new MyAppDatabase();


// this is a sample from
// https://dexie.org/docs/Syncable/db.syncable.connect()
export function showEvents() {
  db.transaction('r', [db.guitarNoteTrainerEvent], async () => {
    return await db.guitarNoteTrainerEvent.where({type:"guitar-note-trainer/guess-note"}).toArray()
    //return await db.guitarNoteTrainerEvent.get();
  }).then((result) => console.log(result));
}

export function newGuitarNoteTrainerEvent(detail: GuitarNoteTrainerEvent) {
  console.log("A new event was saved!")
  return(db.table("guitarNoteTrainerEvent").put(detail));
}

// https://github.com/dexie/Dexie.js/blob/master/samples/remote-sync/websocket/WebSocketSyncProtocol.js
var RECONNECT_DELAY = 5000; // Reconnect delay in case of errors such as network down.

Dexie.Syncable.registerSyncProtocol ("websocket", {

  sync: function (context, url, _options, baseRevision, syncedRevision, changes, partial, applyRemoteChanges, onChangesAccepted, onSuccess, onError) {


    // The following vars are needed because we must know which callback to ack when server sends it's ack to us.
    var requestId = 0;
    var acceptCallbacks:any = {};

    // Connect the WebSocket to given url:
    var ws = new WebSocket(url);

    // sendChanges() method:
    function sendChanges(changes: any, baseRevision: any, partial: any, onChangesAccepted:any) {
      console.log("I am sending an event");
      ++requestId;
      acceptCallbacks[requestId.toString()] = onChangesAccepted;

      // In this example, the server expects the following JSON format of the request:
      //  {
      //      type: "changes"
      //      baseRevision: baseRevision,
      //      changes: changes,
      //      partial: partial,
      //      requestId: id
      //  }
      //  To make the sample simplified, we assume the server has the exact same specification of how changes are structured.
      //  In real world, you would have to pre-process the changes array to fit the server specification.
      //  However, this example shows how to deal with the WebSocket to fullfill the API.

      ws.send(JSON.stringify({
        type: 'changes',
        changes: changes,
        partial: partial,
        baseRevision: baseRevision,
        requestId: requestId
      }));
    }

    // When WebSocket opens, send our changes to the server.
    ws.onopen = function (_event) {
      console.log("I am opening a ws");
      // Initiate this socket connection by sending our clientIdentity. If we dont have a clientIdentity yet,
      // server will call back with a new client identity that we should use in future WebSocket connections.
      ws.send(JSON.stringify({
        type: "clientIdentity",
        clientIdentity: context.clientIdentity || null
      }));

      // Send our changes:
      sendChanges(changes, baseRevision, partial, onChangesAccepted);

      // Subscribe to server changes:
      ws.send(JSON.stringify({
        type: "subscribe",
        syncedRevision: syncedRevision
      }));
    }

    // If network down or other error, tell the framework to reconnect again in some time:
    ws.onerror = function (event: any) {
      ws.close();
      onError(event.message, RECONNECT_DELAY);
    }

    // If socket is closed (network disconnected), inform framework and make it reconnect
    ws.onclose = function (event) {
      onError("Socket closed: " + event.reason, RECONNECT_DELAY);
    }


    // isFirstRound: Will need to call onSuccess() only when we are in sync the first time.
    // onSuccess() will unblock Dexie to be used by application code.
    // If for example app code writes: db.friends.where('shoeSize').above(40).toArray(callback), the execution of that query
    // will not run until we have called onSuccess(). This is because we want application code to get results that are as
    // accurate as possible. Specifically when connected the first time and the entire DB is being synced down to the browser,
    // it is important that queries starts running first when db is in sync.
    var isFirstRound = true;
    // When message arrive from the server, deal with the message accordingly:
    ws.onmessage = function (event) {
      try {
        // Assume we have a server that should send JSON messages of the following format:
        // {
        //     type: "clientIdentity", "changes", "ack" or "error"
        //     clientIdentity: unique value for our database client node to persist in the context. (Only applicable if type="clientIdentity")
        //     message: Error message (Only applicable if type="error")
        //     requestId: ID of change request that is acked by the server (Only applicable if type="ack" or "error")
        //     changes: changes from server (Only applicable if type="changes")
        //     lastRevision: last revision of changes sent (applicable if type="changes")
        //     partial: true if server has additionalChanges to send. False if these changes were the last known. (applicable if type="changes")
        // }
        var requestFromServer = JSON.parse(event.data);
        if (requestFromServer.type == "changes") {
          applyRemoteChanges(requestFromServer.changes, requestFromServer.currentRevision, requestFromServer.partial);
          if (isFirstRound && !requestFromServer.partial) {
            // Since this is the first sync round and server sais we've got all changes - now is the time to call onsuccess()
            onSuccess({
              // Specify a react function that will react on additional client changes
              react: function (changes, baseRevision, partial, onChangesAccepted) {
                sendChanges(changes, baseRevision, partial, onChangesAccepted);
              },
              // Specify a disconnect function that will close our socket so that we dont continue to monitor changes.
              disconnect: function () {
                ws.close();
              }
            });
            isFirstRound = false;
          }
        } else if (requestFromServer.type == "ack") {
          var requestId = requestFromServer.requestId;
          var acceptCallback = acceptCallbacks[requestId.toString()];
          acceptCallback(); // Tell framework that server has acknowledged the changes sent.
          delete acceptCallbacks[requestId.toString()];
        } else if (requestFromServer.type == "clientIdentity") {
          context.clientIdentity = requestFromServer.clientIdentity;
          context.save();
        } else if (requestFromServer.type == "error") {
          var requestId = requestFromServer.requestId;
          ws.close();
          onError(requestFromServer.message, Infinity); // Don't reconnect - an error in application level means we have done something wrong.
        }
      } catch (e) {
        ws.close();
        onError(e, Infinity); // Something went crazy. Server sends invalid format or our code is buggy. Dont reconnect - it would continue failing.
      }
    }
  }
});

db.syncable.connect(
  "websocket",
  "ws://localhost:3000/ws")
  .catch(err => {
    console.error (`Failed to connect: ${err.stack || err}`);
  });

db.syncable.on('statusChanged', function (newStatus, url) {
    console.log ("Sync Status changed: " + Dexie.Syncable.StatusTexts[newStatus]);
});

// db.transaction('rw', db.friends, function (friends) {
//     friends.add({name: "Arne", shoeSize: 47});
//     friends.where(shoeSize).above(40).each(function (friend) {
//         console.log("Friend with shoeSize over 40: " + friend.name);
//     });
// });
// need to look at
// https://dexie.org/docs/Syncable/Dexie.Syncable.js
// long polling
// https://github.com/dexie/Dexie.js/blob/master/samples/remote-sync/ajax/AjaxSyncProtocol.js
// websocket
// https://github.com/dexie/Dexie.js/blob/master/samples/remote-sync/websocket/WebSocketSyncProtocol.js
// https://dexie.org/docs/Syncable/db.syncable.connect()
