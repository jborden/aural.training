
export function publishEvent(type: string, detail: any, ) {
  const event = new CustomEvent(type, {detail: detail});
  dispatchEvent(event);
}

