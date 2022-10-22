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

// export function getContact(id: number) {
//   db.transaction('r', [db.contacts], async () => {
//     //return await db.contacts.where({first: "Baz", last: "Qux"}).toArray()
//     return await db.contacts.get({id: id});
//   }).then((result) => console.log(result));
// }

// this is a sample from
// https://dexie.org/docs/Syncable/db.syncable.connect()
export function showEvents() {
  db.transaction('r', [db.guitarNoteTrainerEvent], async () => {
    return await db.guitarNoteTrainerEvent.where({type:"guitar-note-trainer/guess-note"}).toArray()
    //return await db.guitarNoteTrainerEvent.get();
  }).then((result) => console.log(result));
}

export function newGuitarNoteTrainerEvent(detail: GuitarNoteTrainerEvent) {
  return(db.table("guitarNoteTrainerEvent").put(detail));
}

Dexie.Syncable.registerSyncProtocol("myProtocol", {
    sync: function () {}; // An ISyncProtocol implementation.
});


db.syncable.connect(
  "myProtocol",
  "http://localhost:3000/dexie-sync",
  {})
  .catch(err => {
    console.error (`Failed to connect: ${err.stack || err}`);
  });

// need to look at
// https://dexie.org/docs/Syncable/Dexie.Syncable.js
// long polling
// https://github.com/dexie/Dexie.js/blob/master/samples/remote-sync/ajax/AjaxSyncProtocol.js
// websocket
// https://github.com/dexie/Dexie.js/blob/master/samples/remote-sync/websocket/WebSocketSyncProtocol.js
// https://dexie.org/docs/Syncable/db.syncable.connect()
