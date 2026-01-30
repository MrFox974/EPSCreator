import { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

// Synth for beeps
let synth = null;

const initSynth = async () => {
  await Tone.start();
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.1
      }
    }).toDestination();
    Tone.Destination.volume.value = 0;
  }
  return synth;
};

// Beep functions using Tone.js
const beepPlot = async () => {
  const s = await initSynth();
  s.triggerAttackRelease('C5', '0.25'); // Normal plot beep
};

const beepLastPlot = async () => {
  const s = await initSynth();
  s.triggerAttackRelease('E6', '0.4'); // Higher pitch (E6 vs C5), longer duration
};

const beepCountdown = async () => {
  const s = await initSynth();
  s.triggerAttackRelease('E5', '0.15');
};

const beepGo = async () => {
  const s = await initSynth();
  s.triggerAttackRelease('G5', '0.5');
};

const beepTest = async () => {
  const s = await initSynth();
  s.triggerAttackRelease('A4', '0.3');
};

const speak = (text, lang = 'fr-FR') => {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.volume = 1;
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
};

const calculateTimePerPlot = (vma, distance) => {
  return (distance * 3.6) / vma;
};

export default function VMATimer() {
  const [plots, setPlots] = useState(6);
  const [distance, setDistance] = useState(20);
  const [restTime, setRestTime] = useState(30);

  const [workoutList, setWorkoutList] = useState([]);
  const [newVMA, setNewVMA] = useState(12);

  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPlot, setCurrentPlot] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [displayTime, setDisplayTime] = useState('00.0');
  const [announcementMade, setAnnouncementMade] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const targetTimeRef = useRef(null);
  const lastSecondRef = useRef(null);
  const beepedSecondsRef = useRef(new Set());

  const initAudio = async () => {
    try {
      await Tone.start();
      await initSynth();
      await beepTest();
      setAudioReady(true);
      console.log('Audio initialized!');
    } catch (e) {
      console.error('Audio init error:', e);
    }
  };

  const addVMA = () => {
    setWorkoutList([...workoutList, { type: 'vma', value: newVMA }]);
  };

  const addPause = () => {
    setWorkoutList([...workoutList, { type: 'pause' }]);
  };

  const removeItem = (index) => {
    setWorkoutList(workoutList.filter((_, i) => i !== index));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    if (mins > 0) {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getNextVMAItem = useCallback((fromIndex) => {
    for (let i = fromIndex; i < workoutList.length; i++) {
      if (workoutList[i].type === 'vma') {
        return workoutList[i];
      }
    }
    return null;
  }, [workoutList]);

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentPhase('idle');
    setCurrentIndex(0);
    setCurrentPlot(0);
    setTimeLeft(0);
    setDisplayTime('00.0');
    setAnnouncementMade(false);
    beepedSecondsRef.current = new Set();
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }
    speechSynthesis.cancel();
    startTimeRef.current = null;
    targetTimeRef.current = null;
    lastSecondRef.current = null;
  };

  const startWorkout = async () => {
    if (workoutList.length === 0) return;

    // Ensure audio is ready
    await Tone.start();
    await initSynth();

    speechSynthesis.cancel();
    setIsRunning(true);
    setCurrentPhase('countdown');
    setCurrentIndex(0);
    setCurrentPlot(0);
    setTimeLeft(30);
    setAnnouncementMade(false);
    beepedSecondsRef.current = new Set();
    startTimeRef.current = null;
    lastSecondRef.current = null;

    speak('Préparation. 30 secondes.');
  };

  const stopWorkout = () => {
    resetTimer();
  };

  const makeAnnouncement = useCallback(async (phase, index) => {
    if (phase === 'countdown') {
      const firstVMA = getNextVMAItem(0);
      if (firstVMA) {
        await speak(`Prochaine course. VMA ${firstVMA.value}`);
      }
    } else if (phase === 'rest') {
      const nextVMA = getNextVMAItem(index + 1);
      if (nextVMA) {
        await speak(`Prochaine course. VMA ${nextVMA.value}`);
      } else {
        await speak('Fin de l\'entraînement');
      }
    }
  }, [getNextVMAItem]);

  const handlePhaseComplete = useCallback(async () => {
    startTimeRef.current = null;
    lastSecondRef.current = null;
    beepedSecondsRef.current = new Set();

    if (currentPhase === 'countdown') {
      let firstVMAIndex = 0;
      while (firstVMAIndex < workoutList.length && workoutList[firstVMAIndex].type !== 'vma') {
        firstVMAIndex++;
      }
      if (firstVMAIndex < workoutList.length) {
        setCurrentIndex(firstVMAIndex);
        const item = workoutList[firstVMAIndex];
        setCurrentPhase('running');
        setCurrentPlot(0);
        const timePerPlot = calculateTimePerPlot(item.value, distance);
        setTimeLeft(timePerPlot);
        setAnnouncementMade(false);
        targetTimeRef.current = timePerPlot;
        startTimeRef.current = performance.now();
        lastSecondRef.current = Math.ceil(timePerPlot);
      }
    } else if (currentPhase === 'running') {
      // Check if this is the LAST plot
      const isLastPlot = currentPlot >= plots - 1;

      // BEEP for completed plot - different sound for last plot
      if (isLastPlot) {
        await beepLastPlot(); // Higher pitch, longer
      } else {
        await beepPlot(); // Normal beep
      }

      if (currentPlot < plots - 1) {
        setCurrentPlot(prev => prev + 1);
        const item = workoutList[currentIndex];
        const timePerPlot = calculateTimePerPlot(item.value, distance);
        setTimeLeft(timePerPlot);
        targetTimeRef.current = timePerPlot;
        startTimeRef.current = performance.now();
        lastSecondRef.current = Math.ceil(timePerPlot);
      } else {
        if (currentIndex < workoutList.length - 1) {
          const nextItem = workoutList[currentIndex + 1];
          if (nextItem.type === 'pause') {
            speak(`Pause. ${restTime} secondes`);
            setCurrentPhase('rest');
            setCurrentIndex(currentIndex + 1);
            setTimeLeft(restTime);
            setAnnouncementMade(false);
            targetTimeRef.current = restTime;
            startTimeRef.current = performance.now();
            lastSecondRef.current = Math.ceil(restTime);
          } else {
            setCurrentIndex(currentIndex + 1);
            setCurrentPhase('running');
            setCurrentPlot(0);
            const timePerPlot = calculateTimePerPlot(nextItem.value, distance);
            setTimeLeft(timePerPlot);
            setAnnouncementMade(false);
            targetTimeRef.current = timePerPlot;
            startTimeRef.current = performance.now();
            lastSecondRef.current = Math.ceil(timePerPlot);
          }
        } else {
          speak('Entraînement terminé. Bravo!');
          setCurrentPhase('finished');
          setIsRunning(false);
        }
      }
    } else if (currentPhase === 'rest') {
      let nextVMAIndex = currentIndex + 1;
      while (nextVMAIndex < workoutList.length && workoutList[nextVMAIndex].type !== 'vma') {
        nextVMAIndex++;
      }

      if (nextVMAIndex < workoutList.length) {
        setCurrentIndex(nextVMAIndex);
        const item = workoutList[nextVMAIndex];
        setCurrentPhase('running');
        setCurrentPlot(0);
        const timePerPlot = calculateTimePerPlot(item.value, distance);
        setTimeLeft(timePerPlot);
        setAnnouncementMade(false);
        targetTimeRef.current = timePerPlot;
        startTimeRef.current = performance.now();
        lastSecondRef.current = Math.ceil(timePerPlot);
      } else {
        speak('Entraînement terminé. Bravo!');
        setCurrentPhase('finished');
        setIsRunning(false);
      }
    }
  }, [currentPhase, currentIndex, currentPlot, plots, workoutList, distance, restTime]);

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      if (!startTimeRef.current) {
        startTimeRef.current = performance.now();
        targetTimeRef.current = timeLeft;
        lastSecondRef.current = Math.ceil(timeLeft);
        beepedSecondsRef.current = new Set();
      }

      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, targetTimeRef.current - elapsed);
      const currentSecond = Math.ceil(remaining);

      setTimeLeft(remaining);
      setDisplayTime(formatTime(remaining));

      if (currentPhase === 'countdown' || currentPhase === 'rest') {
        // Announcement earlier: at 10 seconds (before the 5s countdown beeps)
        if (currentSecond <= 12 && currentSecond > 8 && !announcementMade) {
          setAnnouncementMade(true);
          makeAnnouncement(currentPhase, currentIndex);
        }

        if (currentSecond <= 5 && currentSecond >= 1 && !beepedSecondsRef.current.has(currentSecond)) {
          beepedSecondsRef.current.add(currentSecond);
          if (currentSecond === 1) {
            beepGo();
          } else {
            beepCountdown();
          }
        }
      }

      lastSecondRef.current = currentSecond;

      if (remaining <= 0) {
        startTimeRef.current = null;
        handlePhaseComplete();
        return;
      }

      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, [isRunning, currentPhase, currentIndex, currentPlot, announcementMade, timeLeft, makeAnnouncement, handlePhaseComplete]);

  const getPhaseDisplay = () => {
    switch (currentPhase) {
      case 'idle': return 'Prêt';
      case 'countdown': return 'Préparation';
      case 'running':
        const item = workoutList[currentIndex];
        return `VMA ${item?.value} - Plot ${currentPlot + 1}/${plots}`;
      case 'rest': return 'Repos';
      case 'finished': return 'Terminé !';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'idle': return 'bg-slate-700';
      case 'countdown': return 'bg-amber-600';
      case 'running': return 'bg-green-600';
      case 'rest': return 'bg-blue-600';
      case 'finished': return 'bg-purple-600';
      default: return 'bg-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          VMA Timer
        </h1>

        {/* Audio Test Button - IMPORTANT */}
        <div className="mb-6">
          <button
            onClick={initAudio}
            className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-3 ${
              audioReady
                ? 'bg-green-600 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
            }`}
          >
            <span className="text-3xl">🔊</span>
            {audioReady ? '✅ SON ACTIVÉ - Cliquer pour retester' : '⚠️ APPUYER ICI POUR ACTIVER LE SON ⚠️'}
          </button>
          {!audioReady && (
            <p className="text-center text-red-400 mt-2 text-sm">
              Tu dois cliquer sur ce bouton et entendre un bip avant de commencer !
            </p>
          )}
        </div>

        {/* Dashboard Settings */}
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 backdrop-blur border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">Configuration</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <label className="block text-sm text-slate-400 mb-2">Plots</label>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPlots(Math.max(1, plots - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  disabled={isRunning}
                >-</button>
                <span className="text-2xl font-bold w-12">{plots}</span>
                <button
                  onClick={() => setPlots(plots + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  disabled={isRunning}
                >+</button>
              </div>
            </div>

            <div className="text-center">
              <label className="block text-sm text-slate-400 mb-2">Distance (m)</label>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setDistance(Math.max(5, distance - 5))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  disabled={isRunning}
                >-</button>
                <span className="text-2xl font-bold w-12">{distance}</span>
                <button
                  onClick={() => setDistance(distance + 5)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  disabled={isRunning}
                >+</button>
              </div>
            </div>

            <div className="text-center">
              <label className="block text-sm text-slate-400 mb-2">Repos (s)</label>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setRestTime(Math.max(10, restTime - 5))}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  disabled={isRunning}
                >-</button>
                <span className="text-2xl font-bold w-12">{restTime}</span>
                <button
                  onClick={() => setRestTime(restTime + 5)}
                  className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
                  disabled={isRunning}
                >+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Timer Display */}
        <div className={`rounded-2xl p-8 mb-6 text-center transition-all duration-500 ${getPhaseColor()}`}>
          <div className="text-sm uppercase tracking-wider mb-2 opacity-80">
            {getPhaseDisplay()}
          </div>
          <div className="text-7xl font-mono font-bold tracking-tight">
            {displayTime || '00.0'}
          </div>
          {currentPhase === 'running' && (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: plots }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i < currentPlot ? 'bg-white' :
                    i === currentPlot ? 'bg-white animate-pulse scale-125' :
                    'bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
          {(currentPhase === 'countdown' || currentPhase === 'rest') && timeLeft <= 5 && (
            <div className="mt-4 text-3xl font-bold animate-pulse">
              🔊 {Math.ceil(timeLeft)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          {!isRunning ? (
            <>
              <button
                onClick={startWorkout}
                disabled={workoutList.length === 0 || !audioReady}
                className="px-8 py-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Démarrer
              </button>
              {currentPhase === 'finished' && (
                <button
                  onClick={resetTimer}
                  className="px-8 py-4 bg-slate-600 hover:bg-slate-500 rounded-xl font-semibold text-lg transition flex items-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={stopWorkout}
                className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-lg transition flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z"/>
                </svg>
                Arrêter
              </button>
              <button
                onClick={resetTimer}
                className="px-6 py-4 bg-slate-600 hover:bg-slate-500 rounded-xl font-semibold text-lg transition flex items-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
            </>
          )}
        </div>

        {/* Add VMA/Pause */}
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 backdrop-blur border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">Ajouter</h2>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-slate-700/50 rounded-xl p-3">
              <span className="text-slate-400">VMA:</span>
              <input
                type="number"
                value={newVMA}
                onChange={(e) => setNewVMA(Number(e.target.value))}
                className="w-16 bg-transparent text-center text-xl font-bold focus:outline-none"
                min="8"
                max="25"
                step="0.5"
                disabled={isRunning}
              />
              <button
                onClick={addVMA}
                disabled={isRunning}
                className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 rounded-lg font-medium transition"
              >
                + VMA
              </button>
            </div>
          </div>

          <button
            onClick={addPause}
            disabled={isRunning}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-xl font-medium transition"
          >
            + Pause ({restTime}s)
          </button>
        </div>

        {/* Workout List */}
        <div className="bg-slate-800/50 rounded-2xl p-6 backdrop-blur border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">Programme</h2>

          {workoutList.length === 0 ? (
            <p className="text-slate-500 text-center py-4">
              Ajoutez des VMA et des pauses pour créer votre programme
            </p>
          ) : (
            <div className="space-y-2">
              {workoutList.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl transition ${
                    isRunning && index === currentIndex
                      ? 'bg-white/20 ring-2 ring-white/50'
                      : 'bg-slate-700/50'
                  } ${isRunning && index < currentIndex ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                      {index + 1}
                    </span>
                    {item.type === 'vma' ? (
                      <div>
                        <span className="font-semibold text-green-400">VMA {item.value}</span>
                        <span className="text-sm text-slate-400 ml-2">
                          ({plots} × {calculateTimePerPlot(item.value, distance).toFixed(1)}s)
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-blue-400">Pause {restTime}s</span>
                    )}
                  </div>
                  {!isRunning && (
                    <button
                      onClick={() => removeItem(index)}
                      className="w-8 h-8 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-400 hover:text-white transition flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {workoutList.length > 0 && !isRunning && (
            <button
              onClick={() => setWorkoutList([])}
              className="w-full mt-4 py-2 text-red-400 hover:text-red-300 text-sm transition"
            >
              Tout effacer
            </button>
          )}
        </div>

        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>Distance totale par série: {plots * distance}m</p>
        </div>
      </div>
    </div>
  );
}
