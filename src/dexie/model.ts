import { Note } from "../guitar/model"
import { AudioMonitorEventDetail } from "../audioMonitor"
import { Dexie } from 'dexie';

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

export function newGuitarNoteTrainerEvent(detail: GuitarNoteTrainerEvent) {
  return(db.table("guitarNoteTrainerEvent").put(detail));
}
