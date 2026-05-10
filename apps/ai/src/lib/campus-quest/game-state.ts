export interface GameState {
  hasCoffee: boolean;
  shiftComplete: boolean;
}

export interface StationResult {
  state: GameState;
  nudge: string | null;
  toast: string | null;
}

export function createInitialState(): GameState {
  return {
    hasCoffee: false,
    shiftComplete: false,
  };
}

export function getObjective(state: GameState): string {
  return state.hasCoffee
    ? 'Coffee secured. Enjoy the cafe.'
    : 'Walk to the counter and get a coffee.';
}

export function getProgress(state: GameState): string {
  return state.hasCoffee ? '1/1' : '0/1';
}

export function getOutcome(_state: GameState): { title: string; description: string } {
  return {
    title: 'Coffee Secured',
    description: 'You walked through VibeCooking Cafe, reached the counter, and picked up a fresh coffee.',
  };
}

export function processStationChoice(
  state: GameState,
  station: string,
  choiceId: string,
): StationResult {
  if (state.shiftComplete) {
    return { state, nudge: 'You already have your coffee.', toast: null };
  }

  if (station !== 'coffee-counter' || choiceId !== 'order-coffee') {
    return { state, nudge: 'Head to the counter to get your coffee.', toast: null };
  }

  return {
    state: {
      hasCoffee: true,
      shiftComplete: true,
    },
    nudge: null,
    toast: 'Fresh coffee served.',
  };
}
