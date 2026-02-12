import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Ionicons } from '@expo/vector-icons';
import { ProUpgradeModal } from '@/components/ProUpgradeModal';
import { useRouter } from 'expo-router';
import { SoundEffect, triggerSound } from '@/utils/soundEffects';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBottomContentPadding } from '@/utils/layout';
import { useUser as useAppUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

interface GamesHubProps {
  userId: Id<"users">;
  onClose: () => void;
}

import {
  Zap, Activity, Search, List, ArrowUpCircle, Waves, Repeat, Eye,
  Files, MousePointer, Droplets, Palette, Coffee, Grid, Type,
  Hash, PenTool, Hand, Compass, Mic
} from 'lucide-react-native';

type GameDef = {
  id: string;
  name: string;
  icon: any; // Icon component
  color: string;
  description: string;
  implemented?: boolean;
  emoji?: string;
};

const games: GameDef[] = [
  { id: 'reaction', name: 'Wait for Green', icon: Zap, color: '#10b981', description: 'Test reaction time', implemented: true },
  { id: 'balance', name: 'Balance', icon: Activity, color: '#f97316', description: 'Keep centered', implemented: true },
  { id: 'spot-difference', name: 'Spot Difference', icon: Search, color: '#6366f1', description: 'Find changes', implemented: true },
  { id: 'sequence-recall', name: 'Sequence Recall', icon: List, color: '#14b8a6', description: 'Remember numbers', implemented: true },
  { id: 'focus-frenzy', name: 'Focus Frenzy', icon: ArrowUpCircle, color: '#ec4899', description: 'Click targets fast', implemented: true },
  { id: 'wave-rider', name: 'Wave Rider', icon: Waves, color: '#3b82f6', description: 'Breathe with waves', implemented: true },
  { id: 'focus-shift', name: 'Focus Shift', icon: Repeat, color: '#06b6d4', description: 'Switch tasks', implemented: true },
  { id: 'visual-filter', name: 'Visual Filter', icon: Eye, color: '#8b5cf6', description: 'Find patterns', implemented: true },
  { id: 'task-switcher', name: 'Task Switcher', icon: Files, color: '#6366f1', description: 'Quick switching', implemented: true },
  { id: 'attention-trainer', name: 'Attention Trainer', icon: MousePointer, color: '#ec4899', description: 'Click targets', implemented: true },
  { id: 'relaxing-ripples', name: 'Relaxing Ripples', icon: Droplets, color: '#06b6d4', description: 'Create ripples', implemented: true },
  { id: 'calm-colors', name: 'Calm Colors', icon: Palette, color: '#ec4899', description: 'Color breathing', implemented: true },
  { id: 'mindful-moments', name: 'Mindful Moments', icon: Coffee, color: '#6366f1', description: 'Present moment' },
  { id: 'memory-matrix-2', name: 'Memory Matrix', icon: Grid, color: '#a855f7', description: 'Grid memory', implemented: true },
  { id: 'word-scramble', name: 'Word Scramble', icon: Type, color: '#f97316', description: 'Unscramble words', implemented: true },
  { id: 'math-bingo-2', name: 'Math Bingo', icon: Hash, color: '#10b981', description: 'Solve math', implemented: true },
  { id: 'anagram-challenge', name: 'Anagram', icon: PenTool, color: '#3b82f6', description: 'Solve anagrams', implemented: true },
  { id: 'finger-tapping', name: 'Finger Tap', icon: Hand, color: '#ec4899', description: 'Tap sequence', implemented: true },
  { id: 'maze-runner-2', name: 'Maze Runner', icon: Compass, color: '#a855f7', description: 'Navigate maze' },
  { id: 'rhythm-tap-2', name: 'Rhythm Tap', icon: Mic, color: '#3b82f6', description: 'Tap to beat', implemented: true },
  { id: 'balance-challenge', name: 'Balance Challenge', icon: Activity, color: '#f97316', description: 'Virtual balance' },
];

export default function GamesHub({ userId, onClose }: GamesHubProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const appUser = useAppUser();
  const user = useQuery(api.users.getUserById, { userId });
  const gamesProgress = useQuery(api.wellness.getGamesProgress, { userId }) || [];
  const completeGameSession = useMutation(api.wellness.completeGameSession);

  useEffect(() => {
    triggerSound(SoundEffect.ENTER_GAMES_HUB);
  }, []);

  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const playsToday = gamesProgress.reduce((acc: number, p: any) => {
    if (p.lastResetDate === today) return acc + (p.playsToday ?? 0);
    return acc;
  }, 0);
  const isPro = appUser.isPro || appUser.isAdmin;
  const remainingPlays = isPro ? Infinity : Math.max(0, 2 - playsToday);

  const handleGameSelect = (gameId: string) => {
    if (!isPro && playsToday >= 2) {
      setShowUpgrade(true);
      return;
    }
    setActiveGame(gameId);
  };

  const activeGameDef = useMemo(() => games.find((g) => g.id === activeGame) ?? null, [activeGame]);

  const handleGameComplete = async (result: { gameId: string; gameName: string; score?: number; reactionMs?: number }) => {
    try {
      await completeGameSession({
        userId,
        gameId: result.gameId,
        gameName: result.gameName,
        score: result.score,
        reactionMs: result.reactionMs,
        date: today,
      });
    } catch (e) {
      if (!isPro) {
        setShowUpgrade(true);
      } else {
        Alert.alert('Error', 'Something went wrong saving the result.');
      }
    } finally {
      setTimeout(() => setActiveGame(null), 800);
    }
  };

  return (
    <Modal visible={true} animationType="slide">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <View>
            <Text style={styles.headerTitle}>🎮 Mind Games Hub</Text>
            <Text style={styles.headerSubtitle}>Train focus & mindfulness</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom) }}
          showsVerticalScrollIndicator={false}
        >
          {activeGame === 'reaction' ? (
            <ReactionTestGame
              onBack={() => setActiveGame(null)}
              onComplete={(reactionMs) => handleGameComplete({ gameId: 'reaction', gameName: 'Wait for Green', reactionMs, score: 0 })}
            />

          ) : activeGame === 'balance' ? (
            <BalanceGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'balance', gameName: 'Balance', score })}
            />
          ) : activeGame === 'spot-difference' ? (
            <SpotDifferenceGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'spot-difference', gameName: 'Spot Difference', score })}
            />
          ) : activeGame === 'sequence-recall' ? (
            <SequenceRecallGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'sequence-recall', gameName: 'Sequence Recall', score })}
            />
          ) : activeGame === 'focus-frenzy' ? (
            <FocusFrenzyGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'focus-frenzy', gameName: 'Focus Frenzy', score })}
            />
          ) : activeGame === 'wave-rider' ? (
            <WaveRiderGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'wave-rider', gameName: 'Wave Rider', score })}
            />
          ) : activeGame === 'visual-filter' ? (
            <VisualFilterGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'visual-filter', gameName: 'Visual Filter', score })}
            />
          ) : activeGame === 'task-switcher' ? (
            <TaskSwitcherGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'task-switcher', gameName: 'Task Switcher', score })}
            />
          ) : activeGame === 'attention-trainer' ? (
            <AttentionTrainerGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'attention-trainer', gameName: 'Attention Trainer', score })}
            />

          ) : activeGame === 'focus-shift' ? (
            <FocusShiftGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'focus-shift', gameName: 'Focus Shift', score })}
            />
          ) : activeGame === 'memory-matrix-2' ? (
            <MemoryMatrixGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'memory-matrix-2', gameName: 'Memory Matrix', score })}
            />
          ) : activeGame === 'word-scramble' ? (
            <WordScrambleGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'word-scramble', gameName: 'Word Scramble', score })}
            />
          ) : activeGame === 'math-bingo-2' ? (
            <MathBingoGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'math-bingo-2', gameName: 'Math Bingo', score })}
            />
          ) : activeGame === 'anagram-challenge' ? (
            <AnagramChallengeGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'anagram-challenge', gameName: 'Anagram Challenge', score })}
            />
          ) : activeGame === 'finger-tapping' ? (
            <FingerTapGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'finger-tapping', gameName: 'Finger Tap', score })}
            />
          ) : activeGame === 'rhythm-tap-2' ? (
            <RhythmTapGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'rhythm-tap-2', gameName: 'Rhythm Tap', score })}
            />
          ) : activeGame === 'relaxing-ripples' ? (
            <RelaxingRipplesGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'relaxing-ripples', gameName: 'Relaxing Ripples', score })}
            />
          ) : activeGame === 'calm-colors' ? (
            <CalmColorsGame
              onBack={() => setActiveGame(null)}
              onComplete={(score) => handleGameComplete({ gameId: 'calm-colors', gameName: 'Calm Colors', score })}
            />
          ) : activeGameDef ? (
            <ComingSoonGame
              game={activeGameDef}
              remainingPlays={remainingPlays}
              onBack={() => setActiveGame(null)}
              onComplete={() =>
                handleGameComplete({
                  gameId: activeGameDef.id,
                  gameName: activeGameDef.name,
                  score: 0,
                })
              }
            />
          ) : (
            <>
              {/* Beta banner */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 12, marginBottom: 14, gap: 10 }}>
                <Text style={{ fontSize: 22 }}>🚀</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <View style={{ backgroundColor: '#3b82f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>BETA</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e40af' }}>Games are being improved</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>We're actively enhancing game quality and adding new ones!</Text>
                </View>
              </View>

              <View style={styles.limitRow}>
                <Text style={styles.limitText}>
                  {isPro ? 'Premium: unlimited games' : `Free: ${Math.min(2, playsToday)}/2 games today`}
                </Text>
              </View>
              <View style={styles.gamesGrid}>
                {games.map((game) => (
                  <TouchableOpacity
                    key={game.id}
                    onPress={() => handleGameSelect(game.id)}
                    style={[styles.gameCard, { backgroundColor: game.color }]}
                    activeOpacity={0.85}
                  >
                    <View style={{ marginBottom: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                      <game.icon size={26} color="#fff" />
                    </View>
                    <Text style={styles.gameName}>{game.name}</Text>
                    <Text style={styles.gameDescription}>{game.description}</Text>
                    {!game.implemented && (
                      <View style={styles.soonPill}>
                        <Text style={styles.soonPillText}>Coming soon</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <ProUpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgrade={() => {
          setShowUpgrade(false);
          onClose();
          router.push('/premium');
        }}
        title="Upgrade to Pro"
        message="Free users can play 2 games per day. Upgrade to Pro for unlimited games and progress tracking."
        upgradeLabel="View Pro Plans"
        soundEffect={SoundEffect.UPGRADE_MORE_GAMES}
      />
    </Modal>
  );
}

function ReactionTestGame({ onBack, onComplete }: { onBack: () => void; onComplete: (reactionMs: number) => void }) {
  const [state, setState] = useState<'ready' | 'waiting' | 'now'>('ready');
  const [message, setMessage] = useState('Tap Start to begin');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  const startGame = () => {
    setState('waiting');
    setMessage('Wait for green...');
    setReactionTime(null);
    const delay = 1000 + Math.random() * 2000;
    timerRef.current = setTimeout(() => {
      setState('now');
      setMessage('Tap Now!');
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleTap = () => {
    if (state === 'waiting') {
      timerRef.current && clearTimeout(timerRef.current);
      setState('ready');
      setMessage('Too soon! Try again');
      return;
    }
    if (state === 'now' && startTimeRef.current) {
      const reaction = Math.round(Date.now() - startTimeRef.current);
      setReactionTime(reaction);
      setState('ready');
      setMessage(`Reaction: ${reaction}ms`);
      onComplete(reaction);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleTap} activeOpacity={0.9} style={[styles.reactionBox, { backgroundColor: state === 'now' ? '#86efac' : state === 'waiting' ? '#fef08a' : '#f3f4f6' }]}>
        <Text style={styles.reactionMessage}>{message}</Text>
        {reactionTime !== null && <Text style={styles.reactionTime}>Your reaction: {reactionTime}ms</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={startGame} style={[styles.gameButton, { backgroundColor: '#10b981' }]}>
        <Text style={styles.gameButtonText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}





function BalanceGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [balance, setBalance] = useState(0);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<any>(null);
  const driftRef = useRef<any>(null);

  useEffect(() => () => { timerRef.current && clearInterval(timerRef.current); driftRef.current && clearInterval(driftRef.current); }, []);

  const end = (finalTime: number) => {
    setIsPlaying(false);
    triggerSound(SoundEffect.GAME_LOSS);
    setGameOver(true);
    timerRef.current && clearInterval(timerRef.current);
    driftRef.current && clearInterval(driftRef.current);
    onComplete(Math.floor(finalTime * 10));
  };

  const start = () => {
    setBalance(0);
    setTime(0);
    setGameOver(false);
    setIsPlaying(true);
    driftRef.current = setInterval(() => {
      setBalance((prev) => Math.max(-50, Math.min(50, prev + (Math.random() - 0.5) * 2)));
    }, 50);
    timerRef.current = setInterval(() => {
      setTime((prev) => {
        const next = prev + 1;
        if (next >= 30) { end(next); return 30; }
        return next;
      });
    }, 1000);
  };

  const adjust = (dir: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    setBalance((prev) => {
      const next = Math.max(-50, Math.min(50, prev + (dir === 'left' ? -3 : 3)));
      if (Math.abs(next) >= 45) end(time);
      return next;
    });
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Balance</Text>
      <Text style={styles.gameSubtitle}>Keep the ball centered</Text>
      {!isPlaying && !gameOver && (
        <TouchableOpacity onPress={start} style={[styles.gameButton, { backgroundColor: '#f97316' }]}>
          <Text style={styles.gameButtonText}>Start</Text>
        </TouchableOpacity>
      )}
      <View style={styles.balanceBar}>
        <View style={[styles.balanceBall, { left: `${50 + balance}%` }]} />
      </View>
      <Text style={styles.limitText}>Time: {time}s</Text>
      {isPlaying && (
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => adjust('left')} style={[styles.gameButton, { backgroundColor: '#3b82f6', flex: 1 }]}>
            <Text style={styles.gameButtonText}>← Left</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => adjust('right')} style={[styles.gameButton, { backgroundColor: '#3b82f6', flex: 1 }]}>
            <Text style={styles.gameButtonText}>Right →</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameOver && <Text style={styles.warningText}>Done! Score: {Math.floor(time * 10)}</Text>}
    </View>
  );
}

function SpotDifferenceGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const EMOJIS = ['🍎', '🍊', '🍇', '🍓', '🍌', '🥝', '🍍', '🍒'];
  const [round, setRound] = useState(1);
  const [targetIndex, setTargetIndex] = useState(0);
  const [grid, setGrid] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<string>('Find the odd one out!');

  const startRound = useMemo(() => {
    return () => {
      const base = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      let diff = base;
      while (diff === base) diff = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      const idx = Math.floor(Math.random() * 16);
      const g = Array.from({ length: 16 }, () => base);
      g[idx] = diff;
      setGrid(g);
      setTargetIndex(idx);
      setStatus(`Round ${round}/5: Tap the different emoji`);
    };
  }, [round]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  const tap = (idx: number) => {
    if (idx === targetIndex) {
      setScore((s) => s + 1);
      if (round >= 5) {
        onComplete(score + 1);
      } else {
        setRound((r) => r + 1);
      }
    } else {
      setStatus('Wrong — try again!');
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Spot Difference</Text>
      <Text style={styles.gameSubtitle}>{status}</Text>
      <Text style={styles.limitText}>Score: {score}</Text>
      <View style={styles.grid16}>
        {grid.map((e, i) => (
          <TouchableOpacity key={i} style={styles.gridCell} onPress={() => tap(i)} activeOpacity={0.8}>
            <Text style={styles.gridEmoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function SequenceRecallGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [sequence, setSequence] = useState('');
  const [input, setInput] = useState('');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const timerRef = useRef<any>(null);

  const makeSequence = () => {
    const len = 4 + round; // 5..7
    const s = Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
    setSequence(s);
    setInput('');
    setPhase('show');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase('input'), 2000);
  };

  useEffect(() => {
    makeSequence();
    return () => timerRef.current && clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const submit = () => {
    const ok = input.trim() === sequence;
    const nextScore = ok ? score + 1 : score;
    setScore(nextScore);
    if (round >= 3) {
      onComplete(nextScore);
      return;
    }
    setRound((r) => r + 1);
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Sequence Recall</Text>
      <Text style={styles.gameSubtitle}>Round {round}/3</Text>

      {phase === 'show' ? (
        <View style={styles.bigCard}>
          <Text style={styles.bigCardTitle}>Memorize</Text>
          <Text style={styles.bigCardValue}>{sequence}</Text>
          <Text style={styles.limitText}>Hiding in 2s…</Text>
        </View>
      ) : (
        <View style={styles.bigCard}>
          <Text style={styles.bigCardTitle}>Type the sequence</Text>
          <TextInput
            value={input}
            onChangeText={setInput}
            keyboardType="number-pad"
            style={styles.inputBox}
            placeholder="Enter numbers"
          />
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#14b8a6' }]} onPress={submit}>
            <Text style={styles.gameButtonText}>Submit</Text>
          </TouchableOpacity>
          <Text style={styles.limitText}>Score: {score}</Text>
        </View>
      )}
    </View>
  );
}

function FocusFrenzyGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const intervalRef = useRef<any>(null);

  const randomize = () => {
    const x = 20 + Math.random() * (width - 120);
    const y = 40 + Math.random() * 300;
    setPos({ x, y });
  };

  useEffect(() => {
    randomize();
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          onComplete(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    setScore((s) => s + 1);
    randomize();
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Focus Frenzy</Text>
      <Text style={styles.gameSubtitle}>Tap the target as many times as you can</Text>
      <Text style={styles.limitText}>Time: {timeLeft}s • Score: {score}</Text>
      <View style={styles.playfield}>
        <TouchableOpacity style={[styles.targetDot, { left: pos.x, top: pos.y }]} onPress={tap} activeOpacity={0.85}>
          <Text style={styles.targetDotText}>👆</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function WaveRiderGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cycle, setCycle] = useState(0);
  const [score, setScore] = useState(0);
  const timerRef = useRef<any>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    timerRef.current = setInterval(() => {
      setPhase((p) => (p === 'inhale' ? 'exhale' : 'inhale'));
      setCycle((c) => {
        const next = c + 0.5;
        if (next >= 5) {
          clearInterval(timerRef.current);
          onComplete(score);
        }
        return next;
      });
    }, 2000);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    setScore((s) => s + 1);
  };

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] });

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Wave Rider</Text>
      <Text style={styles.gameSubtitle}>Breathe with the wave. Tap “Sync” each phase.</Text>
      <Text style={styles.limitText}>Cycles: {Math.floor(cycle)}/5 • Score: {score}</Text>
      <View style={styles.waveBox}>
        <Animated.View style={[styles.waveCircle, { transform: [{ scale }] }]}>
          <Text style={styles.waveEmoji}>🌊</Text>
        </Animated.View>
        <Text style={styles.breathingPhase}>{phase === 'inhale' ? 'Inhale' : 'Exhale'}</Text>
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#3b82f6' }]} onPress={sync}>
          <Text style={styles.gameButtonText}>Sync</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FocusShiftGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [task, setTask] = useState<'math' | 'word'>('math');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState('');

  const generateMathTask = () => {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operations = ['+', '-', '×'];
    const op = operations[Math.floor(Math.random() * operations.length)];

    let result = 0;
    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '×': result = a * b; break;
    }

    setQuestion(`${a} ${op} ${b} = ?`);
    setAnswer(result.toString());
  };

  const generateWordTask = () => {
    const words = ['focus', 'shift', 'task', 'mind', 'brain', 'quick', 'switch', 'change'];
    const word = words[Math.floor(Math.random() * words.length)];
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    setQuestion(`Unscramble: ${scrambled}`);
    setAnswer(word);
  };

  const generateTask = () => {
    const newTask = task === 'math' ? 'word' : 'math';
    setTask(newTask);
    setUserInput('');
    setFeedback('');

    if (newTask === 'math') {
      generateMathTask();
    } else {
      generateWordTask();
    }
  };

  useEffect(() => {
    generateTask();
  }, []);

  const submitAnswer = () => {
    if (userInput.toLowerCase().trim() === answer.toLowerCase()) {
      setScore(s => s + 1);
      setFeedback('Correct! 🎯');
      setTimeout(() => {
        if (round >= 8) {
          onComplete(score + 1);
        } else {
          setRound(r => r + 1);
          generateTask();
        }
      }, 1000);
    } else {
      setFeedback(`Wrong! Answer: ${answer}`);
      setTimeout(() => {
        generateTask();
      }, 2000);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Focus Shift</Text>
      <Text style={styles.gameSubtitle}>Quickly switch between math and word tasks</Text>
      <Text style={styles.limitText}>Round: {round}/8 • Score: {score}</Text>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>{task === 'math' ? '🧮 Math Task' : '📝 Word Task'}</Text>
        <Text style={styles.bigCardValue}>{question}</Text>
        <TextInput
          value={userInput}
          onChangeText={setUserInput}
          style={styles.inputBox}
          placeholder="Your answer"
          onSubmitEditing={submitAnswer}
        />
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#06b6d4' }]} onPress={submitAnswer}>
          <Text style={styles.gameButtonText}>Submit</Text>
        </TouchableOpacity>
        {feedback && <Text style={feedback.includes('Correct') ? styles.limitText : styles.warningText}>{feedback}</Text>}
      </View>
    </View>
  );
}

function MemoryMatrixGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [grid, setGrid] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [showingPattern, setShowingPattern] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gridSize = 4;

  const generatePattern = (size: number) => {
    const pattern = Array(size * size).fill(false);
    const cellsToReveal = Math.min(3 + level, 8);

    for (let i = 0; i < cellsToReveal; i++) {
      let index;
      do {
        index = Math.floor(Math.random() * (size * size));
      } while (pattern[index]);
      pattern[index] = true;
    }

    return pattern;
  };

  const startLevel = () => {
    const pattern = generatePattern(gridSize);
    setGrid(pattern);
    setRevealed(Array(gridSize * gridSize).fill(false));
    setShowingPattern(true);

    setTimeout(() => {
      setShowingPattern(false);
    }, 1500 + level * 200);
  };

  const handleCellPress = (index: number) => {
    if (showingPattern || gameOver) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (grid[index]) {
      setScore(s => s + 1);
    } else {
      triggerSound(SoundEffect.GAME_LOSS);
      setGameOver(true);
      setTimeout(() => onComplete(score), 1500);
      return;
    }

    if (newRevealed.filter((r, i) => grid[i] && r).length === grid.filter(g => g).length) {
      setTimeout(() => {
        setLevel(l => l + 1);
        if (level >= 5) {
          onComplete(score + 1);
        } else {
          startLevel();
        }
      }, 1000);
    }
  };

  useEffect(() => {
    startLevel();
  }, []);

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Memory Matrix</Text>
      <Text style={styles.gameSubtitle}>Remember and repeat the pattern</Text>
      <Text style={styles.limitText}>Level: {level}/5 • Score: {score}</Text>

      <View style={styles.memoryGrid}>
        {Array.from({ length: gridSize * gridSize }).map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleCellPress(index)}
            disabled={showingPattern || gameOver}
            style={[
              styles.memoryColor,
              {
                backgroundColor: showingPattern && grid[index] ? '#10b981' :
                  revealed[index] ? (grid[index] ? '#10b981' : '#ef4444') :
                    '#e5e7eb'
              },
              (showingPattern || gameOver) && styles.memoryColorDisabled
            ]}
          >
            {revealed[index] && (
              <Text style={{ fontSize: 24, color: '#fff' }}>
                {grid[index] ? '✓' : '✗'}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {showingPattern && <Text style={styles.limitText}>Watch the pattern...</Text>}
      {gameOver && <Text style={styles.warningText}>Game Over! Final Score: {score}</Text>}
    </View>
  );
}

function WordScrambleGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [word, setWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState('');

  const words = [
    'focus', 'mind', 'brain', 'quick', 'smart', 'sharp', 'alert', 'think',
    'logic', 'memory', 'speed', 'power', 'skill', 'sense', 'vision', 'clarity'
  ];

  const scrambleWord = (word: string) => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.join('');
  };

  const generateWord = () => {
    const newWord = words[Math.floor(Math.random() * words.length)];
    const scrambledWord = scrambleWord(newWord);

    // Make sure it's actually scrambled
    let attempts = 0;
    while (scrambledWord === newWord && attempts < 10) {
      attempts++;
      const rescrambled = scrambleWord(newWord);
      if (rescrambled !== newWord) {
        setScrambled(rescrambled);
        break;
      }
    }

    setWord(newWord);
    setScrambled(scrambledWord);
    setUserInput('');
    setFeedback('');
  };

  useEffect(() => {
    generateWord();
  }, []);

  const checkAnswer = () => {
    if (userInput.toLowerCase().trim() === word) {
      setScore(s => s + 1);
      setFeedback('Correct! 🎉');
      setTimeout(() => {
        if (round >= 6) {
          onComplete(score + 1);
        } else {
          setRound(r => r + 1);
          generateWord();
        }
      }, 1200);
    } else {
      setFeedback('Try again! Hint: ' + word.length + ' letters');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Word Scramble</Text>
      <Text style={styles.gameSubtitle}>Unscramble the word</Text>
      <Text style={styles.limitText}>Round: {round}/6 • Score: {score}</Text>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>🔀 Unscramble this word:</Text>
        <Text style={styles.bigCardValue}>{scrambled}</Text>
        <TextInput
          value={userInput}
          onChangeText={setUserInput}
          style={styles.inputBox}
          placeholder="Type your answer"
          onSubmitEditing={checkAnswer}
          autoCapitalize="none"
        />
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#f97316' }]} onPress={checkAnswer}>
          <Text style={styles.gameButtonText}>Check Answer</Text>
        </TouchableOpacity>
        {feedback && <Text style={feedback.includes('Correct') ? styles.limitText : styles.warningText}>{feedback}</Text>}
      </View>
    </View>
  );
}

function MathBingoGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [grid, setGrid] = useState<number[]>([]);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameOver, setGameOver] = useState(false);
  const intervalRef = useRef<any>(null);

  const generateGrid = () => {
    const numbers = [];
    for (let i = 0; i < 25; i++) {
      numbers.push(Math.floor(Math.random() * 50) + 1);
    }
    setGrid(numbers);

    // Generate a target that exists in the grid
    const targetNumber = numbers[Math.floor(Math.random() * numbers.length)];
    setTarget(targetNumber);
  };

  useEffect(() => {
    generateGrid();

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          triggerSound(SoundEffect.GAME_LOSS);
          setGameOver(true);
          setTimeout(() => onComplete(score), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const handleCellPress = (number: number) => {
    if (gameOver) return;

    if (number === target) {
      setScore(s => s + 1);
      if (round >= 5) {
        setGameOver(true);
        setTimeout(() => onComplete(score + 1), 1500);
      } else {
        setRound(r => r + 1);
        generateGrid();
      }
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Math Bingo</Text>
      <Text style={styles.gameSubtitle}>Find the target number</Text>
      <Text style={styles.limitText}>Round: {round}/5 • Score: {score} • Time: {timeLeft}s</Text>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>🎯 Find this number:</Text>
        <Text style={styles.bigCardValue}>{target}</Text>
      </View>

      <View style={styles.grid16}>
        {grid.map((number, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleCellPress(number)}
            disabled={gameOver}
            style={[
              styles.gridCell,
              { backgroundColor: gameOver && number === target ? '#10b981' : '#fff' }
            ]}
          >
            <Text style={styles.gridEmoji}>{number}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {gameOver && <Text style={styles.warningText}>Game Over! Final Score: {score}</Text>}
    </View>
  );
}

function AnagramChallengeGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [word, setWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [hints, setHints] = useState(3);

  const words = [
    { word: 'focus', hint: 'Attention' },
    { word: 'brain', hint: 'Organ' },
    { word: 'quick', hint: 'Fast' },
    { word: 'smart', hint: 'Intelligent' },
    { word: 'sharp', hint: 'Pointed' },
    { word: 'alert', hint: 'Awake' },
    { word: 'think', hint: 'Mental process' },
    { word: 'logic', hint: 'Reasoning' },
    { word: 'memory', hint: 'Recall' },
    { word: 'speed', hint: 'Velocity' },
    { word: 'power', hint: 'Strength' },
    { word: 'skill', hint: 'Ability' },
    { word: 'sense', hint: 'Perception' },
    { word: 'vision', hint: 'Sight' },
    { word: 'clarity', hint: 'Clearness' }
  ];

  const scrambleWord = (word: string) => {
    const letters = word.split('');
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    return letters.join('');
  };

  const generateWord = () => {
    const wordObj = words[Math.floor(Math.random() * words.length)];
    const scrambledWord = scrambleWord(wordObj.word);

    // Make sure it's actually scrambled
    let attempts = 0;
    let finalScrambled = scrambledWord;
    while (finalScrambled === wordObj.word && attempts < 10) {
      attempts++;
      finalScrambled = scrambleWord(wordObj.word);
    }

    setWord(wordObj.word);
    setScrambled(finalScrambled);
    setUserInput('');
    setFeedback('');
  };

  useEffect(() => {
    generateWord();
  }, []);

  const checkAnswer = () => {
    if (userInput.toLowerCase().trim() === word) {
      setScore(s => s + 1);
      setFeedback('Perfect! 🎉');
      setTimeout(() => {
        if (round >= 6) {
          onComplete(score + 1);
        } else {
          setRound(r => r + 1);
          generateWord();
        }
      }, 1200);
    } else {
      setFeedback('Not quite right. Try again!');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const useHint = () => {
    if (hints > 0) {
      const wordObj = words.find(w => w.word === word);
      setFeedback(`Hint: ${wordObj?.hint}`);
      setHints(h => h - 1);
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Anagram Challenge</Text>
      <Text style={styles.gameSubtitle}>Rearrange letters to form a word</Text>
      <Text style={styles.limitText}>Round: {round}/6 • Score: {score} • Hints: {hints}</Text>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>✍️ Rearrange these letters:</Text>
        <Text style={styles.bigCardValue}>{scrambled}</Text>
        <TextInput
          value={userInput}
          onChangeText={setUserInput}
          style={styles.inputBox}
          placeholder="Type your answer"
          onSubmitEditing={checkAnswer}
          autoCapitalize="none"
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#3b82f6', flex: 1 }]} onPress={checkAnswer}>
            <Text style={styles.gameButtonText}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.gameButton, { backgroundColor: hints > 0 ? '#f59e0b' : '#9ca3af', flex: 1 }]}
            onPress={useHint}
            disabled={hints === 0}
          >
            <Text style={styles.gameButtonText}>Hint ({hints})</Text>
          </TouchableOpacity>
        </View>
        {feedback && <Text style={feedback.includes('Perfect') ? styles.limitText : styles.warningText}>{feedback}</Text>}
      </View>
    </View>
  );
}

function FingerTapGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [activeFinger, setActiveFinger] = useState<number | null>(null);

  const fingers = ['👆', '👉', '👇', '👈']; // Up, Right, Down, Left

  const generateSequence = (length: number) => {
    const newSequence = [];
    for (let i = 0; i < length; i++) {
      newSequence.push(Math.floor(Math.random() * 4));
    }
    return newSequence;
  };

  const showSequence = () => {
    setShowingSequence(true);
    setUserSequence([]);

    sequence.forEach((finger, index) => {
      setTimeout(() => {
        setActiveFinger(finger);
        setTimeout(() => setActiveFinger(null), 400);
      }, index * 600);
    });

    setTimeout(() => {
      setShowingSequence(false);
      setActiveFinger(null);
    }, sequence.length * 600 + 500);
  };

  const startLevel = () => {
    const newSequence = generateSequence(3 + level);
    setSequence(newSequence);
    setTimeout(() => showSequence(), 1000);
  };

  useEffect(() => {
    startLevel();
  }, []);

  const handleFingerPress = (fingerIndex: number) => {
    if (showingSequence || gameOver) return;

    const newUserSequence = [...userSequence, fingerIndex];
    setUserSequence(newUserSequence);

    // Check if the pressed finger is correct
    if (sequence[newUserSequence.length - 1] !== fingerIndex) {
      triggerSound(SoundEffect.GAME_LOSS);
      setGameOver(true);
      setTimeout(() => onComplete(score), 2000);
      return;
    }

    // Check if sequence is complete
    if (newUserSequence.length === sequence.length) {
      setScore(s => s + 1);
      setTimeout(() => {
        if (level >= 5) {
          onComplete(score + 1);
        } else {
          setLevel(l => l + 1);
          startLevel();
        }
      }, 1000);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Finger Tap</Text>
      <Text style={styles.gameSubtitle}>Repeat the finger sequence</Text>
      <Text style={styles.limitText}>Level: {level}/5 • Score: {score}</Text>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>
          {showingSequence ? 'Watch the sequence...' : 'Repeat the sequence!'}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20 }}>
          {sequence.map((finger, index) => (
            <Text key={index} style={{ fontSize: 32, marginHorizontal: 4 }}>
              {fingers[finger]}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
          {fingers.map((finger, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleFingerPress(index)}
              disabled={showingSequence || gameOver}
              style={[
                {
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: activeFinger === index ? '#ec4899' : '#f3f4f6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: 10,
                  borderWidth: 2,
                  borderColor: activeFinger === index ? '#ec4899' : '#e5e7eb'
                }
              ]}
            >
              <Text style={{ fontSize: 36 }}>{finger}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {gameOver && <Text style={styles.warningText}>Game Over! Final Score: {score}</Text>}
    </View>
  );
}

function RhythmTapGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [beats, setBeats] = useState<boolean[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [userTaps, setUserTaps] = useState<boolean[]>([]);
  const intervalRef = useRef<any>(null);

  const generatePattern = (length: number) => {
    const pattern = [];
    for (let i = 0; i < length; i++) {
      pattern.push(Math.random() > 0.5);
    }
    return pattern;
  };

  const startRound = () => {
    const pattern = generatePattern(4 + round);
    setBeats(pattern);
    setUserTaps(Array(pattern.length).fill(false));
    setCurrentBeat(0);
    setPlaying(true);

    // Play the pattern
    let beatIndex = 0;
    intervalRef.current = setInterval(() => {
      if (beatIndex >= pattern.length) {
        clearInterval(intervalRef.current);
        setPlaying(false);
        return;
      }
      setCurrentBeat(beatIndex);
      beatIndex++;
    }, 600);
  };

  useEffect(() => {
    startRound();
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const handleTap = () => {
    if (playing || gameOver) return;

    const newUserTaps = [...userTaps];
    const tapIndex = newUserTaps.findIndex(tap => !tap);

    if (tapIndex === -1) return; // Already tapped for all beats

    newUserTaps[tapIndex] = true;
    setUserTaps(newUserTaps);

    // Check if tap matches the pattern
    if (beats[tapIndex]) {
      setScore(s => s + 1);
    }

    // Check if round is complete
    if (newUserTaps.every(tap => tap)) {
      setTimeout(() => {
        if (round >= 5) {
          setGameOver(true);
          setTimeout(() => onComplete(score), 1500);
        } else {
          setRound(r => r + 1);
          startRound();
        }
      }, 1000);
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Rhythm Tap</Text>
      <Text style={styles.gameSubtitle}>Tap to the rhythm</Text>
      <Text style={styles.limitText}>Round: {round}/5 • Score: {score}</Text>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>
          {playing ? 'Listen to the rhythm...' : 'Tap the rhythm!'}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20 }}>
          {beats.map((beat, index) => (
            <View
              key={index}
              style={[
                {
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: playing && currentBeat === index ? '#3b82f6' :
                    beat ? '#10b981' : '#e5e7eb',
                  marginHorizontal: 4,
                  borderWidth: 2,
                  borderColor: userTaps[index] ? '#10b981' : '#d1d5db'
                }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={handleTap}
          disabled={playing || gameOver}
          style={[
            styles.gameButton,
            {
              backgroundColor: playing || gameOver ? '#9ca3af' : '#3b82f6',
              marginTop: 20
            }
          ]}
        >
          <Text style={styles.gameButtonText}>
            {playing ? 'Listening...' : 'TAP!'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.limitText, { marginTop: 10 }]}>
          Green = Tap, Gray = Don't Tap
        </Text>
      </View>

      {gameOver && <Text style={styles.warningText}>Game Over! Final Score: {score}</Text>}
    </View>
  );
}

function CalmColorsGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [currentColor, setCurrentColor] = useState('');
  const [colorName, setColorName] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [animValue] = useState(new Animated.Value(1));

  const colors = [
    { name: 'Blue', hex: '#3b82f6', feeling: 'Calm' },
    { name: 'Green', hex: '#10b981', feeling: 'Peace' },
    { name: 'Purple', hex: '#a855f7', feeling: 'Relax' },
    { name: 'Pink', hex: '#ec4899', feeling: 'Love' },
    { name: 'Orange', hex: '#f97316', feeling: 'Energy' },
    { name: 'Teal', hex: '#14b8a6', feeling: 'Balance' }
  ];

  const generateRound = () => {
    const correctColor = colors[Math.floor(Math.random() * colors.length)];
    const wrongOptions = colors
      .filter(c => c.name !== correctColor.name)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    const allOptions = [correctColor, ...wrongOptions]
      .sort(() => Math.random() - 0.5)
      .map(c => c.name);

    setCurrentColor(correctColor.hex);
    setColorName(correctColor.name);
    setOptions(allOptions);
    setBreathingPhase('inhale');

    // Start breathing animation
    Animated.sequence([
      Animated.timing(animValue, { toValue: 1.3, duration: 2000, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 1, duration: 2000, useNativeDriver: true })
    ]).start();
  };

  useEffect(() => {
    generateRound();
  }, []);

  const handleColorSelect = (selectedColor: string) => {
    if (selectedColor === colorName) {
      setScore(s => s + 1);
      setTimeout(() => {
        if (round >= 6) {
          onComplete(score + 1);
        } else {
          setRound(r => r + 1);
          generateRound();
        }
      }, 1500);
    } else {
      setTimeout(() => {
        generateRound();
      }, 1000);
    }
  };

  const scale = animValue.interpolate({
    inputRange: [1, 1.3],
    outputRange: [1, 1.3]
  });

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Calm Colors</Text>
      <Text style={styles.gameSubtitle}>Breathe with the colors</Text>
      <Text style={styles.limitText}>Round: {round}/6 • Score: {score}</Text>

      <View style={styles.breathingContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              backgroundColor: currentColor,
              transform: [{ scale }]
            }
          ]}
        />
        <Text style={styles.breathingPhase}>
          {breathingPhase === 'inhale' ? 'Breathe In...' : 'Breathe Out...'}
        </Text>
      </View>

      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>What color do you see?</Text>
        <View style={styles.buttonRow}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.gameButton,
                {
                  backgroundColor: colors.find(c => c.name === option)?.hex || '#6b7280',
                  flex: 1,
                  marginHorizontal: 4
                }
              ]}
              onPress={() => handleColorSelect(option)}
            >
              <Text style={styles.gameButtonText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function RelaxingRipplesGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          triggerSound(SoundEffect.GAME_LOSS);
          setGameOver(true);
          setTimeout(() => onComplete(score), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, []);

  const createRipple = (event: any) => {
    if (gameOver) return;

    const { locationX, locationY } = event.nativeEvent;
    const newRipple = {
      id: Date.now(),
      x: locationX,
      y: locationY,
      size: 20
    };

    setRipples(prev => [...prev, newRipple]);
    setScore(s => s + 1);

    // Animate ripple growth and fade
    setTimeout(() => {
      setRipples(prev => prev.map(r =>
        r.id === newRipple.id ? { ...r, size: 100 } : r
      ));
    }, 100);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 2000);
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Relaxing Ripples</Text>
      <Text style={styles.gameSubtitle}>Create peaceful ripples</Text>
      <Text style={styles.limitText}>Time: {timeLeft}s • Score: {score}</Text>

      <TouchableOpacity
        style={styles.playfield}
        onPress={createRipple}
        activeOpacity={0.9}
      >
        {ripples.map(ripple => (
          <Animated.View
            key={ripple.id}
            style={[
              {
                position: 'absolute',
                left: ripple.x - ripple.size / 2,
                top: ripple.y - ripple.size / 2,
                width: ripple.size,
                height: ripple.size,
                borderRadius: ripple.size / 2,
                backgroundColor: 'rgba(6, 182, 212, 0.3)',
                borderWidth: 2,
                borderColor: 'rgba(6, 182, 212, 0.6)'
              }
            ]}
          />
        ))}
        <Text style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: [{ translateX: -50 }, { translateY: -50 }],
          fontSize: 18,
          color: '#64748b',
          textAlign: 'center'
        }}>
          Tap to create ripples
        </Text>
      </TouchableOpacity>

      {gameOver && <Text style={styles.warningText}>Time's up! Final Score: {score}</Text>}
    </View>
  );
}

function ComingSoonGame({
  game,
  remainingPlays,
  onBack,
  onComplete,
}: {
  game: GameDef;
  remainingPlays: number;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <View style={[styles.comingSoonCard, { borderColor: game.color }]}>
        <Text style={styles.comingSoonEmoji}>{game.emoji}</Text>
        <Text style={styles.gameTitle}>{game.name}</Text>
        <Text style={styles.gameSubtitle}>{game.description}</Text>
        <Text style={styles.limitText}>
          This game is in the backlog to port next (from the old repo).
        </Text>
        <Text style={[styles.limitText, { marginTop: 8 }]}>
          {remainingPlays === Infinity ? 'Premium: unlimited plays' : `Free plays remaining today: ${remainingPlays}`}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onComplete}
        style={[styles.gameButton, { backgroundColor: game.color }]}
        activeOpacity={0.9}
      >
        <Text style={styles.gameButtonText}>Mark as Played</Text>
      </TouchableOpacity>
    </View>
  );
}

function VisualFilterGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const emojis = ['🔺', '🔷', '🟡', '🟣', '🟢', '🟠'];
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState('🔷');
  const [grid, setGrid] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('Find the target');

  const setup = () => {
    const t = emojis[Math.floor(Math.random() * emojis.length)];
    const distractors = emojis.filter((e) => e !== t);
    const g = Array.from({ length: 20 }, () => distractors[Math.floor(Math.random() * distractors.length)]);
    const idx = Math.floor(Math.random() * g.length);
    g[idx] = t;
    setTarget(t);
    setGrid(g);
    setStatus(`Round ${round}/5: Tap ${t}`);
  };

  useEffect(() => {
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const tap = (e: string) => {
    if (e === target) {
      const nextScore = score + 1;
      setScore(nextScore);
      if (round >= 5) onComplete(nextScore);
      else setRound((r) => r + 1);
    } else {
      setStatus('Not that one—try again!');
    }
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Visual Filter</Text>
      <Text style={styles.gameSubtitle}>{status}</Text>
      <Text style={styles.limitText}>Score: {score}</Text>
      <View style={styles.grid20}>
        {grid.map((e, i) => (
          <TouchableOpacity key={i} style={styles.gridCell20} onPress={() => tap(e)} activeOpacity={0.85}>
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TaskSwitcherGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [rule, setRule] = useState<'parity' | 'threshold'>('parity');
  const [n, setN] = useState(0);
  const intervalRef = useRef<any>(null);

  const next = () => {
    setRule((r) => (r === 'parity' ? 'threshold' : 'parity'));
    setN(1 + Math.floor(Math.random() * 9));
  };

  useEffect(() => {
    next();
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          onComplete(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => intervalRef.current && clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = (choice: 'left' | 'right') => {
    const correct =
      rule === 'parity' ? (choice === 'left' ? n % 2 === 1 : n % 2 === 0) : choice === 'left' ? n < 5 : n >= 5;
    if (correct) setScore((s) => s + 1);
    next();
  };

  const ruleText = rule === 'parity' ? 'LEFT=Odd • RIGHT=Even' : 'LEFT=<5 • RIGHT≥5';

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Task Switcher</Text>
      <Text style={styles.gameSubtitle}>Rules switch every turn</Text>
      <Text style={styles.limitText}>Time: {timeLeft}s • Score: {score}</Text>
      <View style={styles.bigCard}>
        <Text style={styles.bigCardTitle}>{ruleText}</Text>
        <Text style={styles.bigCardValue}>{n}</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#6366f1', flex: 1 }]} onPress={() => answer('left')}>
          <Text style={styles.gameButtonText}>LEFT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#6366f1', flex: 1 }]} onPress={() => answer('right')}>
          <Text style={styles.gameButtonText}>RIGHT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AttentionTrainerGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [trial, setTrial] = useState(0);
  const [score, setScore] = useState(0);
  const [shown, setShown] = useState<'target' | 'distractor'>('distractor');
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<any>(null);

  const next = () => {
    const isTarget = Math.random() < 0.35;
    setShown(isTarget ? 'target' : 'distractor');
    setLocked(false);
  };

  useEffect(() => {
    next();
    timerRef.current = setInterval(() => {
      setTrial((t) => {
        const nt = t + 1;
        if (nt >= 15) {
          clearInterval(timerRef.current);
          onComplete(score);
        } else {
          next();
        }
        return nt;
      });
    }, 900);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = () => {
    if (locked) return;
    setLocked(true);
    if (shown === 'target') setScore((s) => s + 1);
    else setScore((s) => Math.max(0, s - 1));
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Attention Trainer</Text>
      <Text style={styles.gameSubtitle}>Tap only when the target appears</Text>
      <Text style={styles.limitText}>Trial: {Math.min(trial + 1, 15)}/15 • Score: {score}</Text>
      <TouchableOpacity onPress={tap} activeOpacity={0.9} style={[styles.reactionBox, { backgroundColor: shown === 'target' ? '#fce7f3' : '#f3f4f6' }]}>
        <Text style={styles.reactionMessage}>{shown === 'target' ? 'TAP!' : 'Do NOT tap'}</Text>
        <Text style={{ fontSize: 44, marginTop: 8 }}>{shown === 'target' ? '👆' : '✋'}</Text>
      </TouchableOpacity>
      <Text style={styles.limitText}>+1 for correct tap • -1 for false tap</Text>
    </View>
  );
}

function ConcentrationChallengeGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [holding, setHolding] = useState(false);
  const [best, setBest] = useState(0);
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (holding) {
      intervalRef.current = setInterval(() => {
        setCurrent((c) => c + 1);
      }, 1000);
    } else {
      intervalRef.current && clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [holding]);

  useEffect(() => {
    setBest((b) => Math.max(b, current));
  }, [current]);

  const finish = () => {
    setHolding(false);
    onComplete(best);
  };

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Concentration</Text>
      <Text style={styles.gameSubtitle}>Press & hold to stay focused</Text>
      <Text style={styles.limitText}>Current: {current}s • Best: {best}s</Text>
      <TouchableOpacity
        onPressIn={() => setHolding(true)}
        onPressOut={() => {
          setHolding(false);
          setCurrent(0);
        }}
        activeOpacity={0.9}
        style={[styles.comingSoonCard, { borderColor: '#f59e0b', backgroundColor: holding ? '#fef3c7' : '#fff' }]}
      >
        <Text style={styles.gameTitle}>{holding ? 'Hold…' : 'Hold to Focus'}</Text>
        <Text style={styles.gameSubtitle}>Don’t release!</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={finish} style={[styles.gameButton, { backgroundColor: '#f59e0b' }]}>
        <Text style={styles.gameButtonText}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
}

function BreatheMountainGame({ onBack, onComplete }: { onBack: () => void; onComplete: (score: number) => void }) {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [running, setRunning] = useState(false);
  const timerRef = useRef<any>(null);
  const anim = useRef(new Animated.Value(0)).current;

  const start = () => {
    setCycle(0);
    setPhase('inhale');
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setPhase((p) => (p === 'inhale' ? 'hold' : p === 'hold' ? 'exhale' : 'inhale'));
      setCycle((c) => {
        const next = phase === 'exhale' ? c + 1 : c;
        if (next >= 5) {
          setRunning(false);
          onComplete(5);
        }
        return next;
      });
    };
    timerRef.current = setInterval(tick, 2000);
    return () => timerRef.current && clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase]);

  useEffect(() => {
    if (!running) return;
    Animated.timing(anim, { toValue: phase === 'inhale' ? 1 : 0, duration: 1800, useNativeDriver: true }).start();
  }, [phase, running, anim]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });
  const phaseText = phase === 'inhale' ? 'Inhale' : phase === 'hold' ? 'Hold' : 'Exhale';

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Games</Text>
      </TouchableOpacity>
      <Text style={styles.gameTitle}>Breathe Mountain</Text>
      <Text style={styles.gameSubtitle}>5 calm breathing cycles</Text>
      <Text style={styles.limitText}>Cycle: {cycle}/5</Text>
      <View style={styles.waveBox}>
        <Animated.View style={[styles.waveCircle, { transform: [{ scale }], backgroundColor: '#dcfce7' }]}>
          <Text style={styles.waveEmoji}>⛰️</Text>
        </Animated.View>
        <Text style={styles.breathingPhase}>{running ? phaseText : 'Ready'}</Text>
        {!running ? (
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#10b981' }]} onPress={start}>
            <Text style={styles.gameButtonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.gameButton, { backgroundColor: '#9ca3af' }]} onPress={() => { setRunning(false); onComplete(cycle); }}>
            <Text style={styles.gameButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  limitRow: { marginBottom: 10 },
  limitText: { color: '#64748b', fontWeight: '600' },
  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gameCard: { width: (width - 60) / 2, padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  gameEmoji: { fontSize: 32, marginBottom: 8 },
  gameName: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  gameDescription: { fontSize: 11, color: '#ffffff', opacity: 0.9, textAlign: 'center' },

  // Game screens
  gameContainer: { paddingVertical: 8 },
  backButton: { marginBottom: 12 },
  backButtonText: { fontSize: 16, color: '#6366f1', fontWeight: '700' },
  gameTitle: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  gameSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  gameButton: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', marginVertical: 8 },
  gameButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  warningText: { color: '#ef4444', fontWeight: '700', textAlign: 'center', marginTop: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },

  reactionBox: { padding: 28, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  reactionMessage: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 6, textAlign: 'center' },
  reactionTime: { fontSize: 14, color: '#64748b' },

  breathingContainer: { alignItems: 'center', marginVertical: 18 },
  breathingCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  breathingPhase: { marginTop: 12, fontSize: 18, fontWeight: '800', color: '#1e293b' },

  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 },
  memoryColor: { width: 110, height: 110, borderRadius: 14, margin: 8 },
  memoryColorActive: { transform: [{ scale: 1.08 }], borderWidth: 3, borderColor: '#fff' },
  memoryColorDisabled: { opacity: 0.6 },

  balanceBar: { height: 16, backgroundColor: '#e5e7eb', borderRadius: 8, marginVertical: 18, position: 'relative' },
  balanceBall: { width: 20, height: 20, borderRadius: 10, position: 'absolute', top: -2, backgroundColor: '#10b981', transform: [{ translateX: -10 }] },

  soonPill: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  soonPillText: { color: '#fff', fontWeight: '800', fontSize: 10 },
  comingSoonCard: { borderWidth: 2, borderRadius: 16, padding: 16, alignItems: 'center', backgroundColor: '#fff' },
  comingSoonEmoji: { fontSize: 44, marginBottom: 8 },

  grid16: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' },
  gridCell: { width: (width - 80) / 4, height: (width - 80) / 4, borderRadius: 14, backgroundColor: '#fff', margin: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  gridEmoji: { fontSize: 28 },
  grid20: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' },
  gridCell20: { width: (width - 80) / 5, height: (width - 80) / 5, borderRadius: 12, backgroundColor: '#fff', margin: 5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  bigCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  bigCardTitle: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  bigCardValue: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginTop: 8, letterSpacing: 2, textAlign: 'center' },
  inputBox: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 18 },
  playfield: { height: 360, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  targetDot: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: '#ec4899', alignItems: 'center', justifyContent: 'center' },
  targetDotText: { fontSize: 28 },
  waveBox: { marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  waveCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  waveEmoji: { fontSize: 56 },
});
