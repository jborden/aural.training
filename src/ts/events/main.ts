
export function publishEvent(type: string, detail?: any, ) {
  const event = new CustomEvent(type, {detail: detail});
  dispatchEvent(event);
}

export function listenForEvent(type: string, detailFn?: (detail: any) => any) {
  console.log(`Event Logger: ${type}`)
  console.log("detailFn:", detailFn)
  const defaultFn = (detail: any) => {
    return JSON.stringify(detail, null, 2);
  }
  const chosenFn = detailFn || defaultFn;

  addEventListener(
    type,
    (event: CustomEvent) => {
      const value = chosenFn(event.detail);
      //console.log("choosenFn:",chosenFn)
      // Print the name of the event and the value
      console.log(`${type}: ${value}`);
      // Print the contents of the event (event object)
      // console.log('Event Contents:', event);
    },
    false // UseCapture set to false
  );
}
