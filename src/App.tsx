import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import './index.css';

// Types
type Suit = 'heart' | 'diamond' | 'spade' | 'club';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type Card = { suit: Suit; rank: Rank };
type Pattern = 'flush' | 'straight' | 'threeOfAKind' | 'straightFlush';
type PatternDetail = { type: Pattern; basePoints: number; points: number; cards: Card[] };
type Language = 'zh-CN' | 'ja' | 'ko' | 'en' | 'fr' | 'de' | 'es' | 'pt';

// Constants
const SUITS: Suit[] = ['heart', 'diamond', 'spade', 'club'];
const SUIT_SYMBOLS = {
  heart: '♥',
  diamond: '♦',
  spade: '♠',
  club: '♣',
};
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
};
const SCORE_VALUES: Record<Pattern, number> = {
  flush: 50,
  straight: 100,
  threeOfAKind: 100,
  straightFlush: 200,
};
const COMBO_MULTIPLIERS = { 2: 2, 3: 4, 4: 8 };
const PATTERNS = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

// Language Support
const LANGUAGES = {
  'zh-CN': {
    name: '中文',
    gameTitle: '九宫牌',
    gameDescription: '形成同花(50分)、顺子(100分)、三条(100分)或同花顺(200分)来消除行、列或对角线',
    comboDescription: '同时消除：2连×2倍、3连×4倍、4连×8倍',
    remainingCards: '剩余牌数',
    score: '得分',
    randomSeed: '随机种子',
    copy: '复制',
    share: '分享',
    restart: '重开',
    newGame: '新游戏',
    enterSeed: '输入种子开始特定游戏',
    start: '开始',
    currentCard: '当前牌',
    remainingDeck: '牌组剩余情况',
    clearingRecord: '消除记录',
    gameOver: '游戏结束!',
    finalScore: '最终得分',
    playAgainPrompt: '再来一局，挑战更高分!',
    replaySameSeed: '重玩本局',
    shareResult: '分享成绩',
    copied: '已复制到剪贴板',
    shareFailed: '分享失败，请手动复制',
    shareText: '我正在{url}玩九宫牌，获得了{score}分的好成绩，随机种子是{seed}，你也来和我一起玩吧！',
    comboClearing: '{count}连消除! ({multiplier}倍分数)',
    patternPoints: '{pattern}! +{points}分',
    cleared: '消除',
    singlePattern: '消除 {pattern} [{cards}] = {points}分',
    multiplePattern: '{count}连消除! ({multiplier}) = {points}分',
    gameOverMessage: '游戏结束！',
    flush: '同花',
    straight: '顺子',
    threeOfAKind: '三条',
    straightFlush: '同花顺',
  },
  // ... other languages would go here (ja, ko, en, fr, de, es, pt)
} as Record<Language, any>;

// Main game component
const PokerGrid = () => {
  // State
  const [currentLanguage, setCurrentLanguage] = createSignal<Language>('zh-CN');
  const [darkMode, setDarkMode] = createSignal(false);
  const [deck, setDeck] = createSignal<Card[]>([]);
  const [grid, setGrid] = createSignal<(Card | null)[]>(Array(9).fill(null));
  const [currentCard, setCurrentCard] = createSignal<Card | null>(null);
  const [score, setScore] = createSignal(0);
  const [currentSeed, setCurrentSeed] = createSignal('');
  const [gameOver, setGameOver] = createSignal(false);
  const [showDeck, setShowDeck] = createSignal(false);
  const [gameMessage, setGameMessage] = createSignal('');
  const [gameLog, setGameLog] = createSignal<string[]>([]);
  const [showResultModal, setShowResultModal] = createSignal(false);
  const [seedInput, setSeedInput] = createSignal('');
  const [showToast, setShowToast] = createSignal(false);
  const [toastMessage, setToastMessage] = createSignal('');
  const [seededRandom, setSeededRandom] = createSignal<(limit?: number) => number>(() => Math.random());

  // Derived values
  const remainingCards = () => deck().length - (currentCard() ? 1 : 0);

  // Translations
  const t = (key: string, replacements: Record<string, any> = {}) => {
    let text = LANGUAGES[currentLanguage()]?.[key] || key;
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(`{${placeholder}}`, value);
    }
    return text;
  };

  // Game functions
  const createDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        newDeck.push({ suit, rank });
      }
    }
    return newDeck;
  };

  const createSeededRandom = (seed: string) => {
    let hash = Array.from(seed).reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
    }, 0);
    return () => {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom()() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const drawCard = (): Card | null => {
    const currentDeck = deck();
    if (currentDeck.length === 0) return null;
    const newDeck = [...currentDeck];
    const card = newDeck.pop()!;
    setDeck(newDeck);
    return card;
  };

  const displayCurrentCard = (card: Card | null) => {
    setCurrentCard(card);
  };

  const placeCard = (index: number) => {
    if (grid()[index] || !currentCard()) return;

    const newGrid = [...grid()];
    newGrid[index] = currentCard()!;
    setGrid(newGrid);

    checkPatterns();

    const nextCard = drawCard();
    displayCurrentCard(nextCard);

    checkGameOver();
  };

  const checkPatterns = () => {
    const validPatterns = PATTERNS
      .map(pattern => ({
        pattern,
        cards: pattern.map(index => grid()[index]).filter(Boolean) as Card[],
      }))
      .filter(({ pattern, cards }) => cards.length === 3 && getPatternType(cards));

    if (validPatterns.length > 0) {
      processPatterns(validPatterns);
    }
  };

  const processPatterns = (validPatterns: { pattern: number[]; cards: Card[] }[]) => {
    const patternsWithType = validPatterns.map(({ pattern, cards }) => ({
      pattern,
      patternType: getPatternType(cards)!,
      cards,
    }));

    // Calculate scores
    const baseTotalPoints = patternsWithType.reduce(
      (sum, { patternType }) => sum + SCORE_VALUES[patternType],
      0
    );
    const multiplier = COMBO_MULTIPLIERS[Math.min(validPatterns.length, 4) as 2 | 3 | 4] || 1;
    const totalPoints = baseTotalPoints * multiplier;

    // Update score
    setScore(prev => prev + totalPoints);

    // Create log messages
    const patternDetails = patternsWithType.map(({ patternType, cards }) => {
      const ratio = SCORE_VALUES[patternType] / baseTotalPoints;
      const points = Math.round(totalPoints * ratio);
      return { type: patternType, basePoints: SCORE_VALUES[patternType], points, cards };
    });

    // Add to game log
    addToGameLog(patternDetails, validPatterns.length, totalPoints);

    // Update message
    if (validPatterns.length >= 2) {
      setGameMessage(
        t('comboClearing', { count: validPatterns.length, multiplier }) + ` +${totalPoints}`
      );
    } else {
      setGameMessage(
        t('patternPoints', { pattern: t(patternsWithType[0].patternType), points: totalPoints })
      );
    }

    // Clear cells
    const cellsToRemove = new Set(validPatterns.flatMap(({ pattern }) => pattern));
    const newGrid = [...grid()];
    cellsToRemove.forEach(index => {
      newGrid[index] = null;
    });
    setGrid(newGrid);

    // Clear message after delay
    setTimeout(() => setGameMessage(''), 2000);
  };

  const addToGameLog = (patternDetails: PatternDetail[], count: number, totalPoints: number) => {
    const formatCards = (cards: Card[]) => {
      return cards.map(card => {
        const colorClass = card.suit === 'heart' ? 'text-red-600 dark:text-red-400' :
          card.suit === 'diamond' ? 'text-orange-500 dark:text-orange-300' :
            card.suit === 'spade' ? 'text-purple-600 dark:text-purple-400' : '';
        return `<span class="${colorClass}">${card.rank}${SUIT_SYMBOLS[card.suit]}</span>`;
      }).join(' ');
    };

    let logEntry = '';
    if (count > 1) {
      const multiplierText = count >= 4 ? '8×' : count === 3 ? '4×' : '2×';
      logEntry = t('multiplePattern', {
        count,
        multiplier: multiplierText,
        points: totalPoints,
      });
      logEntry += patternDetails.map(p => `
        <div class="ml-1 mt-1">
          <span class="font-semibold text-primary">${t(p.type)}</span> 
          [${formatCards(p.cards)}] = 
          <span class="font-bold">${p.points}${t('score').slice(0, 1)}</span>
        </div>
      `).join('');
    } else {
      logEntry = t('singlePattern', {
        pattern: t(patternDetails[0].type),
        cards: formatCards(patternDetails[0].cards),
        points: patternDetails[0].points,
      });
    }

    setGameLog(prev => [
      `<div class="text-sm py-1 border-b border-gray-200 dark:border-gray-700 pb-2 mb-1">${logEntry}</div>`,
      ...prev,
    ]);
  };

  const getPatternType = (cards: Card[]): Pattern | null => {
    if (isStraight(cards) && isFlush(cards)) return 'straightFlush';
    if (isFlush(cards)) return 'flush';
    if (isStraight(cards)) return 'straight';
    if (isThreeOfAKind(cards)) return 'threeOfAKind';
    return null;
  };

  const isFlush = (cards: Card[]) => cards.every(c => c.suit === cards[0].suit);
  const isStraight = (cards: Card[]) => {
    const values = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => a - b);
    // Special cases
    if (values[0] === 1 && values[1] === 12 && values[2] === 13) return true;
    if (values[0] === 1 && values[1] === 2 && values[2] === 3) return true;
    return values[1] === values[0] + 1 && values[2] === values[1] + 1;
  };
  const isThreeOfAKind = (cards: Card[]) => cards.every(c => c.rank === cards[0].rank);

  const checkGameOver = () => {
    const gridFull = grid().every(cell => cell !== null);
    const cardsEmpty = deck().length === 0 && !currentCard();

    if ((gridFull && !hasValidPatterns()) || cardsEmpty) {
      setGameOver(true);
      setShowResultModal(true);
      setGameMessage(t('gameOverMessage'));
    }
  };

  const hasValidPatterns = () => {
    return PATTERNS.some(pattern =>
      pattern.every(index => grid()[index]) &&
      getPatternType(pattern.map(index => grid()[index]!) as Card[])
    );
  };

  const shareGame = () => {
    const shareUrl = window.location.href.split('?')[0] + `?seed=${currentSeed()}`;
    const shareText = t('shareText', {
      score: score(),
      seed: currentSeed(),
      url: shareUrl,
    });

    navigator.clipboard.writeText(shareText)
      .then(() => showToastNotification(t('copied')))
      .catch(() => showToastNotification(t('shareFailed')));
  };

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const startGame = (seed?: string) => {
    const newSeed = seed || crypto.randomUUID();
    setCurrentSeed(newSeed);
    setSeededRandom(() => createSeededRandom(newSeed));

    // Reset game state
    setGrid(Array(9).fill(null));
    setScore(0);
    setGameOver(false);
    setGameMessage('');
    setShowResultModal(false);
    setGameLog([]);

    // Create and shuffle deck
    const newDeck = shuffleDeck(createDeck());
    setDeck(newDeck);

    // Draw first card
    const firstCard = drawCard();
    displayCurrentCard(firstCard);
  };

  // UI Components
  const CardDisplay = ({ card, onClick }: { card: Card | null; onClick?: () => void }) => {
    return (
      <div
        class="card w-16 h-24 md:w-20 md:h-30 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-md flex items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary"
        onClick={onClick}
      >
        {card ? (
          <div class="flex flex-col items-center justify-center">
            <div class="text-xs md:text-sm">{card.rank}</div>
            <div class={`text-lg md:text-xl ${card.suit}`}>
              {SUIT_SYMBOLS[card.suit]}
            </div>
          </div>
        ) : (
          <div>-</div>
        )}
      </div>
    );
  };

  const CardCounter = () => {
    return (
      <div class="grid grid-cols-4 gap-1 text-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 md:p-0 md:shadow-none md:border-0 md:rounded-none">
        {/* Header row */}
        <div class="font-bold mb-1 spade">♠</div>
        <div class="font-bold mb-1 heart">♥</div>
        <div class="font-bold mb-1 club">♣</div>
        <div class="font-bold mb-1 diamond">♦</div>

        {/* Card rows */}
        <For each={['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2']}>
          {rank => (
            <>
              <div class="text-xs py-1 spade"
                classList={{
                  'opacity-20': shouldHideCard('spade', rank as Rank)
                }}>
                {shouldHideCard('spade', rank as Rank) ? '' : rank}
              </div>
              <div class="text-xs py-1 heart"
                classList={{
                  'opacity-20': shouldHideCard('heart', rank as Rank)
                }}>
                {shouldHideCard('heart', rank as Rank) ? '' : rank}
              </div>
              <div class="text-xs py-1 club"
                classList={{
                  'opacity-20': shouldHideCard('club', rank as Rank)
                }}>
                {shouldHideCard('club', rank as Rank) ? '' : rank}
              </div>
              <div class="text-xs py-1 diamond"
                classList={{
                  'opacity-20': shouldHideCard('diamond', rank as Rank)
                }}>
                {shouldHideCard('diamond', rank as Rank) ? '' : rank}
              </div>
            </>
          )}
        </For>
      </div>
    );
  };

  const shouldHideCard = (suit: Suit, rank: Rank) => {
    // If card is in deck, show it (don't hide)
    const inDeck = deck().some(c => c.suit === suit && c.rank === rank);
    // If card is current card or on grid, hide it
    const isCurrentCard = currentCard()?.suit === suit && currentCard()?.rank === rank;
    const isOnGrid = grid().some(c => c?.suit === suit && c?.rank === rank);
    return !inDeck || isCurrentCard || isOnGrid;
  };

  // Initialize game
  onMount(() => {
    // Check for dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    // Check URL for seed
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    startGame(seedParam || undefined);
  });

  return (
    <div class={`min-h-screen ${darkMode() ? 'dark' : ''}`}>
      <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-3xl">
          {/* Language Selector */}
          <div class="flex justify-end mb-4 items-center">
            <label for="language-selector" class="mr-2 text-gray-700 dark:text-gray-300 text-sm">
              {t('Language:')}
            </label>
            <div class="relative w-48">
              <select
                id="language-selector"
                class="block appearance-none w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
                onChange={(e) => setCurrentLanguage(e.currentTarget.value as Language)}
              >
                <For each={Object.entries(LANGUAGES)}>
                  {([langCode, langData]) => (
                    <option value={langCode}>{langData.name}</option>
                  )}
                </For>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Game Header */}
          <div class="text-center mb-4">
            <h1 class="text-3xl font-bold mb-2">{t('gameTitle')}</h1>
            <p class="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1">
              {t('gameDescription')}
            </p>
            <p class="text-xs md:text-sm text-gray-500 dark:text-gray-500 mb-1">
              {t('comboDescription')}
            </p>
          </div>

          {/* Seed Controls */}
          <div class="mb-4 flex justify-center">
            <div class="flex flex-col sm:flex-row items-center text-sm bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
              <span class="mr-2 mb-1 sm:mb-0">{t('randomSeed')}</span>
              <code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs sm:text-sm break-all">
                {currentSeed()}
              </code>
              <button
                class="ml-1 mt-1 sm:mt-0 text-primary hover:text-primary-dark px-1 py-1 rounded text-xs"
                onClick={() => {
                  setSeedInput(crypto.randomUUID());
                  showToastNotification(t('copied'));
                }}>
                🎲
              </button>
              <button
                class="ml-2 mt-1 sm:mt-0 text-primary hover:text-primary-dark px-2 py-1 rounded text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(currentSeed());
                  showToastNotification(t('copied'));
                }}>
                📋 {t('copy')}
              </button>
              <button
                class="ml-2 mt-1 sm:mt-0 text-primary hover:text-primary-dark px-2 py-1 rounded text-xs"
                onClick={shareGame}>
                ↗️ {t('share')}
              </button>
              <button
                class="ml-2 mt-1 sm:mt-0 bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                onClick={() => startGame(currentSeed())}>
                🔄 {t('restart')}
              </button>
              <button
                class="ml-2 mt-1 sm:mt-0 bg-primary hover:bg-primary-600 text-white px-2 py-1 rounded text-xs"
                onClick={() => startGame()}>
                ➕ {t('newGame')}
              </button>
            </div>
          </div>

          {/* Seed Input */}
          <div class="mb-3 flex justify-center">
            <div class="flex flex-col sm:flex-row items-center text-sm">
              <input
                type="text"
                class="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 w-full sm:w-auto mb-2 sm:mb-0"
                placeholder={t('enterSeed')}
                value={seedInput()}
                onInput={(e) => setSeedInput(e.currentTarget.value)}
              />
              <button
                class="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg ml-0 sm:ml-2"
                onClick={() => seedInput() && startGame(seedInput())}>
                {t('start')}
              </button>
            </div>
          </div>

          {/* Score Display */}
          <div class="text-center mb-4">
            <p class="text-sm text-gray-700 dark:text-gray-300 font-semibold">
              {t('remainingCards')}: <span class="font-bold">{remainingCards()}</span> |{' '}
              {t('score')}: <span class="font-bold">{score()}</span>
            </p>
          </div>

          {/* Main Game Area */}
          <div class="flex flex-col md:flex-row mb-6 justify-center items-center md:items-start gap-4">
            <div class="w-full md:w-auto flex flex-col items-center">
              {/* Current Card */}
              <div class="mb-6 w-full flex flex-col items-center justify-center">
                <p class="text-center text-sm mb-2">{t('currentCard')}</p>
                <CardDisplay card={currentCard()} />
              </div>

              {/* Game Grid */}
              <div class="grid grid-cols-3 gap-2 md:gap-3 mb-6 max-w-xs mx-auto">
                <For each={grid()}>
                  {(card, index) => (
                    <CardDisplay
                      card={card}
                      onClick={() => !gameOver() && !card && currentCard() && placeCard(index())}
                    />
                  )}
                </For>
              </div>
            </div>

            {/* Card Counter - Mobile Toggle */}
            <div class="md:block flex-shrink-0 w-full md:w-auto md:bg-white md:dark:bg-gray-800 md:rounded-lg md:p-3 md:shadow-md md:border md:border-gray-300 md:dark:border-gray-700">
              <div class="flex justify-center md:hidden mb-2">
                <button
                  class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-1 px-4 rounded-lg text-sm flex items-center"
                  onClick={() => setShowDeck(!showDeck())}
                >
                  {t('remainingDeck')}
                  <svg
                    class={`w-4 h-4 ml-1 transform transition-transform ${showDeck() ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Deck Content */}
              <div classList={{ hidden: !showDeck() && window.innerWidth < 768 }}>
                <h3 class="text-sm font-semibold mb-2 text-center text-gray-700 dark:text-gray-300 md:block">
                  {t('remainingDeck')}
                </h3>
                <CardCounter />
              </div>
            </div>
          </div>

          {/* Game Messages */}
          <div class="text-center mb-4 h-12 flex items-center justify-center">
            <p
              class="text-sm md:text-base font-medium"
              classList={{
                'text-primary font-bold': gameMessage().length > 0,
              }}
            >
              {gameMessage()}
            </p>
          </div>

          {/* Game Log */}
          <div class="mb-4 max-w-md mx-auto">
            <h3 class="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              {t('clearingRecord')}
            </h3>
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 h-32 overflow-y-auto text-sm">
              <div innerHTML={gameLog().join('')} />
            </div>
          </div>

          {/* Result Modal */}
          <Show when={showResultModal()}>
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold mb-4 text-center">{t('gameOver')}</h2>
                <p class="text-lg mb-2">
                  {t('finalScore')}: <span class="font-bold">{score()}</span>
                </p>
                <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {t('playAgainPrompt')}
                </p>
                <div class="flex flex-wrap justify-center gap-2">
                  <button
                    class="bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg"
                    onClick={() => startGame()}
                  >
                    {t('newGame')}
                  </button>
                  <button
                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg"
                    onClick={() => startGame(currentSeed())}
                  >
                    {t('replaySameSeed')}
                  </button>
                  <button
                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                    onClick={shareGame}
                  >
                    {t('shareResult')}
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* Toast Notification */}
          <div
            class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg transition-opacity duration-300 z-50"
            classList={{ 'opacity-100': showToast(), 'opacity-0': !showToast() }}
          >
            {toastMessage()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Render the app
const root = document.getElementById('root')!;
render(() => <PokerGrid />, root);