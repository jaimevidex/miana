export function statusAfterSuccessfulOutbound(currentStatus: string): string {
  return currentStatus === 'novo' ? 'pendente' : currentStatus;
}
