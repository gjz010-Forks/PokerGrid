export const SUITS = ['heart', 'diamond', 'spade', 'club'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export const SUIT_SYMBOLS = {
  'heart': '♥',
  'diamond': '♦',
  'spade': '♠',
  'club': '♣'
};

export const RANK_VALUES = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

export const SCORE_VALUES = {
  'flush': 50,
  'straight': 100,
  'threeOfAKind': 100,
  'straightFlush': 200
};

export const COMBO_MULTIPLIERS = {
  2: 2,  // Double elimination x2
  3: 4,  // Triple elimination x4
  4: 8   // Quadruple elimination x8
};