export function middleEllipsis(path: string, maxChars: number): string {
  if (path.length <= maxChars) return path;
  const head = Math.ceil((maxChars - 1) / 2);
  const tail = Math.floor((maxChars - 1) / 2);
  return path.slice(0, head) + '…' + path.slice(path.length - tail);
}
