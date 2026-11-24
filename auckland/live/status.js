export const STATUS_COLOURS = { 'on-time': '#2fbf71', late: '#f2a33a', 'very-late': '#e5533d', early: '#3aa0e8', cancelled: '#55595e', unknown: '#c3c7cc' };
export const statusColour = (s) => (s.status === 'late' && s.minutes >= 10 ? STATUS_COLOURS['very-late'] : STATUS_COLOURS[s.status] || STATUS_COLOURS.unknown);
