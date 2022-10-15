import { Note } from "../guitar/model"

export interface GuessNoteEvent {
  noteAsked: Note,
  noteGiven: Note,
  timestamp: number,
  correctGuess: boolean,
  uuid: string,
  type: string
}
