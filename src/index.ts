import { freelizer } from 'freelizer';

let start: Function, stop: Function, subscribe: Function;
export async function startAudio() {
  try {
    if (typeof start == "undefined") {
      ({start, stop, subscribe} = await freelizer());
    }
    start();
    subscribe(console.log);
  } catch (error){
    console.log("There was an error trying to start the audio");
    console.log(error);
  }
}

export async function stopAudio() {
  try {
    console.log(stop);
    stop()
  } catch (error){
    console.log("There was an error trying to stop the audio");
    console.log(error);
  }
}
