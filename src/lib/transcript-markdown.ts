import { formatTimestampMs } from '@/lib/transcript-time';
import type { YoutubeTranscribeData } from '@/types/youtube-transcribe';

function yamlScalar(value: string): string {
  const t = value.trim();
  if (t === '') return '""';
  if (/^[\w./:-]+$/.test(t) && !t.includes(' ')) return t;
  return JSON.stringify(t);
}

export function buildTranscriptMarkdown(
  data: YoutubeTranscribeData,
  fetchedAtIso: string
): string {
  const lines: string[] = [
    '---',
    `title: ${yamlScalar(data.title)}`,
    `source_url: ${yamlScalar(data.url)}`,
    `platform: ${data.platform}`,
    `video_id: ${data.videoId}`,
    `channel: ${yamlScalar(data.channelTitle)}`,
    `duration_minutes: ${data.durationMinutes}`,
    `fetched_at: ${fetchedAtIso}`,
    '---',
    '',
    '## Transcript',
    '',
  ];

  const cues = data.transcriptCues;
  if (cues && cues.length > 0) {
    for (const c of cues) {
      const t = c.text.trim();
      if (!t) continue;
      lines.push(`${formatTimestampMs(c.startMs)}  ${t}`);
    }
  } else {
    const body = (data.transcript || '').trim();
    lines.push(body || '_No timed captions were available for this video._');
  }
  lines.push('');

  const desc = data.description.trim();
  if (desc) {
    const heading =
      data.platform === 'youtube' ? '## Video description (from YouTube)' : '## Description';
    lines.push(heading, '', desc, '');
  }

  return lines.join('\n');
}
