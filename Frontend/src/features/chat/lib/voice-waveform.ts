export function generateVoiceWaveform(seed: string, barCount = 42): number[] {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  const bars: number[] = []

  for (let index = 0; index < barCount; index += 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0
    const normalized = (hash % 100) / 100
    bars.push(0.2 + normalized * 0.8)
  }

  return bars
}
