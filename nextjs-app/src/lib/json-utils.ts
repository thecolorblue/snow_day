export function stringifyBigInts(obj: any): any {
  for (const key in obj) {
    if (typeof obj[key] === 'bigint') {
      obj[key] = obj[key].toString();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = stringifyBigInts(obj[key]);
    }
  }
  return obj;
}