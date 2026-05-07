import base from './airtable'

export async function getSongs() {
  const records = await base('Music Library').select({
    view: 'Grid view',
  }).all()

  return records.map((record) => ({
    id: record.id,
    title: record.get('Song Title') as string,
    artist: record.get('Artist') as string,
    genre: (record.get('Genre') as string[] || []).join(', '),
    mood: (record.get('Mood') as string[] || []).join(', '),
    instrument: (record.get('Instrument') as string[] || []).join(', '),
    theme: (record.get('Theme') as string[] || []).join(', '),
    bpm: record.get('BPM') as number,
    key: record.get('Key') as string,
    duration: (() => {
      const d = record.get('Duration')
      if (!d) return 0
      if (typeof d === 'number') return d
      const parts = String(d).split(':')
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    })(),
    audioUrl: record.get('R2 Audio URL') as string,
    vocals: record.get('Vocals') as string,
    instrumental: record.get('Instrumental') as boolean,
    acapella: record.get('Acapella') as boolean,
    waveformPeaks: record.get('Waveform Peaks') as string,
    coverArt: (() => { const a = record.get('Cover Art'); return Array.isArray(a) ? (a[0] as {url: string})?.url ?? null : null })(),  }))
}