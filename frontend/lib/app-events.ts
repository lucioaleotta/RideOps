export function dispatchRideOpsEvent(name: 'fleet:refresh' | 'services:refresh' | 'absence:refresh') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`rideops:${name}`));
  }
}
