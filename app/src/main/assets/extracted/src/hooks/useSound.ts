import { useCallback } from 'react';

export const useSound = (isMuted: boolean = false) => {
  const playOscillator = useCallback((type: OscillatorType, freqs: number[], duration: number, gainSequence: number[] = [1, 0]) => {
    if (isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else {
        freqs.forEach((f, idx) => {
          osc.frequency.setValueAtTime(f, now + (duration * idx) / freqs.length);
        });
      }
      
      gain.gain.setValueAtTime(gainSequence[0], now);
      if (gainSequence.length > 1) {
        gain.gain.exponentialRampToValueAtTime(Math.max(gainSequence[1], 0.0001), now + duration);
      }
      
      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Sound error", e);
    }
  }, [isMuted]);

  const playNoise = useCallback((duration: number, type: 'white' | 'skid' | 'whoosh' | 'explosion', gainVal: number = 0.5) => {
    if (isMuted) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      
      if (type === 'skid') {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(1000, now + duration);
        filter.Q.setValueAtTime(5, now);
      } else if (type === 'whoosh') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + duration);
      } else if (type === 'explosion') {
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(10, now + duration);
      } else {
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
      }
      
      source.start(now);
      source.stop(now + duration);
    } catch (e) {
      console.warn(e);
    }
  }, [isMuted]);

  const playClickSound = useCallback(() => {
    playOscillator('sine', [800], 0.05, [0.3, 0.01]);
  }, [playOscillator]);

  const playPopSound = useCallback(() => {
    playOscillator('triangle', [150], 0.15, [0.4, 0.01]);
  }, [playOscillator]);

  const playWinSound = useCallback(() => {
    playOscillator('sine', [523.25, 659.25, 783.99, 1046.50], 0.6, [0.4, 0.01]);
  }, [playOscillator]);

  const playWhooshSound = useCallback(() => {
    playNoise(0.4, 'whoosh', 0.3);
  }, [playNoise]);

  const playTick = useCallback(() => {
    playOscillator('sine', [600], 0.03, [0.15, 0.01]);
  }, [playOscillator]);

  const playSuccess = useCallback(() => {
    playOscillator('triangle', [523, 659, 784, 1047], 0.5, [0.4, 0.01]);
  }, [playOscillator]);

  const playBoing = useCallback(() => {
    playOscillator('sine', [150, 350], 0.3, [0.4, 0.01]);
  }, [playOscillator]);

  const playBalloonPop = useCallback(() => {
    playNoise(0.2, 'explosion', 0.5);
  }, [playNoise]);

  const playF1Beep = useCallback(() => {
    playOscillator('sine', [1000], 0.15, [0.3, 0.01]);
  }, [playOscillator]);

  const playF1Go = useCallback(() => {
    playOscillator('sine', [1500], 0.4, [0.4, 0.01]);
  }, [playOscillator]);

  const playEngineTurbo = useCallback(() => {
    playOscillator('sawtooth', [100, 800], 1.2, [0.2, 0.001]);
  }, [playOscillator]);

  const playCarSkid = useCallback(() => {
    playNoise(0.8, 'skid', 0.15);
  }, [playNoise]);

  const playBeeBuzz = useCallback(() => {
    playOscillator('sawtooth', [180, 220, 180, 220], 0.8, [0.12, 0.01]);
  }, [playOscillator]);

  const playCoin = useCallback(() => {
    playOscillator('sine', [987.77, 1318.51], 0.3, [0.3, 0.01]);
  }, [playOscillator]);

  const playCardFlip = useCallback(() => {
    playOscillator('sine', [400], 0.04, [0.1, 0.01]);
  }, [playOscillator]);

  const playSpaceBeep = useCallback(() => {
    playOscillator('sine', [600, 1200], 0.25, [0.2, 0.01]);
  }, [playOscillator]);

  const playRocketLaunch = useCallback(() => {
    playNoise(1.5, 'whoosh', 0.4);
  }, [playNoise]);

  const playSpaceTurbo = useCallback(() => {
    playOscillator('triangle', [200, 1500], 0.8, [0.3, 0.01]);
  }, [playOscillator]);

  const playAsteroidHit = useCallback(() => {
    playNoise(0.6, 'explosion', 0.45);
  }, [playNoise]);

  return {
    playWinSound,
    playPopSound,
    playClickSound,
    playWhooshSound,
    playTick,
    playSuccess,
    playBoing,
    playBalloonPop,
    playF1Beep,
    playF1Go,
    playEngineTurbo,
    playCarSkid,
    playBeeBuzz,
    playCoin,
    playCardFlip,
    playSpaceBeep,
    playRocketLaunch,
    playSpaceTurbo,
    playAsteroidHit
  };
};
