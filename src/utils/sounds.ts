'use client'

const soundFiles = {
  click: '/sounds/flip.wav',
  ding: '/sounds/passturn.wav',
  correct: '/sounds/correct.wav',
  wrong: '/sounds/wrong.wav',
  win: '/sounds/win.wav',
  flip: '/sounds/playflip.wav',
  selectSecret: '/sounds/selectsecret.wav',
} as const

type SoundName = keyof typeof soundFiles

const audioCache = new Map<SoundName, HTMLAudioElement>()

const playSound = (name: SoundName) => {
  if (typeof window === 'undefined') return

  let audio = audioCache.get(name)
  if (!audio) {
    audio = new Audio(soundFiles[name])
    audio.preload = 'auto'
    audioCache.set(name, audio)
  }

  audio.currentTime = 0
  void audio.play().catch((error: unknown) => {
    console.warn(`[sounds] unable to play ${name}`, error)
  })
}

export const sounds = {
  playClick: () => playSound('click'),
  playDing: () => playSound('ding'),
  playCorrect: () => playSound('correct'),
  playWrong: () => playSound('wrong'),
  playWin: () => playSound('win'),
  playFlip: () => playSound('flip'),
  playSelectSecret: () => playSound('selectSecret'),
}
