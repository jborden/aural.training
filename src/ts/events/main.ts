
export function publishEvent(type: string, detail?: any, ) {
  const event = new CustomEvent(type, {detail: detail});
  dispatchEvent(event);
}

export function listenForEvent(type: string) {
  console.log(`Event Logger: ${type}`)
  addEventListener(
    type,
    (event: Event) => {
      // Print the name of the event
      console.log(`${type}: `, event);

      // Print the contents of the event (event object)
      // console.log('Event Contents:', event);
    },
    false // UseCapture set to false
  );
}
