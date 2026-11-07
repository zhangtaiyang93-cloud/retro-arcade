import { SOUNDTRACK } from '@/lib/music';

export default function MusicCredit() {
  return <p className="music-credit">Music: <a href={SOUNDTRACK.source} target="_blank" rel="noreferrer">{SOUNDTRACK.artist} — {SOUNDTRACK.title}</a> · {SOUNDTRACK.album} · <a href={SOUNDTRACK.licenseUrl} target="_blank" rel="noreferrer">{SOUNDTRACK.license}</a> · <a href="/audio/CREDITS.txt" target="_blank" rel="noreferrer">Credits</a></p>;
}
