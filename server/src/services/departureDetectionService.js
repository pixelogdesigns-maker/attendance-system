// Pure state machine for departure and return detection.
// state: { locationState: 'inside' | 'outside', consecutiveOutside, consecutiveInside }
// Returns the next state and the event to raise, if any.
export function nextDepartureState(state, classification, office) {
  const next = {
    locationState: state.locationState,
    consecutiveOutside: state.consecutiveOutside,
    consecutiveInside: state.consecutiveInside,
  };

  // Uncertain readings and readings in the boundary buffer never change state.
  if (classification === 'uncertain' || classification === 'buffer') {
    return { state: next, event: null };
  }

  if (classification === 'outside') {
    next.consecutiveOutside += 1;
    next.consecutiveInside = 0;
  } else if (classification === 'inside') {
    next.consecutiveInside += 1;
    next.consecutiveOutside = 0;
  }

  if (next.locationState !== 'outside' && next.consecutiveOutside >= office.outsideReadingsRequired) {
    next.locationState = 'outside';
    return { state: next, event: 'departure' };
  }
  if (next.locationState === 'outside' && next.consecutiveInside >= office.insideReadingsRequired) {
    next.locationState = 'inside';
    return { state: next, event: 'return' };
  }
  return { state: next, event: null };
}
