export function formatMinutes(totalMinutes: number) {
  const rounded = Math.round(totalMinutes);
  if (rounded <= 0) {
    return "0m";
  }

  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}
