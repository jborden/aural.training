import { GuitarNote } from "../guitar/model"

export interface GuessNoteEvent {
  noteAsked: GuitarNote,
  noteGiven: GuitarNote,
  timestamp: number,
  correctGuess: boolean,
  uuid: string,
  type: string
}
