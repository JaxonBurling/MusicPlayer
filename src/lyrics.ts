/**
 * LRC / KRC 歌词解析
 *
 * 支持：
 * - 标准 LRC 时间标签 [mm:ss.xx] / [mm:ss.xxx]
 * - 一行多个时间标签
 * - [offset:+/-ms] 全局偏移
 * - 没有时间标签的纯文本歌词（降级为静态展示）
 */
export interface LyricLine {
  /** 秒 */
  time: number
  text: string
}

export interface ParsedLyrics {
  /** 带时间轴的行，按时间升序 */
  lines: LyricLine[]
  /** 无时间轴时的纯文本行 */
  plain: string[]
}

const TIME_TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
const META_TAG = /^\[(ti|ar|al|by|offset|length|re|ve|kana|language):.*\]$/i

function parseTimeTag(minute: string, second: string, fraction = '0'): number {
  return Number(minute) * 60 + Number(second) + Number(`0.${fraction}`)
}

export function parseLyrics(raw: string): ParsedLyrics {
  const text = (raw || '').replace(/\r\n?/g, '\n').trim()
  if (!text) return { lines: [], plain: [] }

  const offsetMatch = /\[offset:([+-]?\d+)\]/i.exec(text)
  const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0

  const lines: LyricLine[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line || META_TAG.test(line)) continue

    TIME_TAG.lastIndex = 0
    const times: number[] = []
    let match: RegExpExecArray | null
    while ((match = TIME_TAG.exec(line))) {
      times.push(parseTimeTag(match[1], match[2], match[3]))
    }
    if (times.length === 0) continue

    const content = line.replace(TIME_TAG, '').trim()
    if (!content) continue
    for (const time of times) lines.push({ time: Math.max(0, time + offset), text: content })
  }

  lines.sort((a, b) => a.time - b.time)
  const deduped = lines.filter(
    (line, index) =>
      index === 0 ||
      line.time !== lines[index - 1].time ||
      line.text !== lines[index - 1].text,
  )

  if (deduped.length > 0) return { lines: deduped, plain: [] }

  // 没有时间轴：过滤元数据标签后按纯文本展示
  const plain = text
    .split('\n')
    .map((line) => line.replace(TIME_TAG, '').trim())
    .filter((line) => line && !META_TAG.test(line))
  return { lines: [], plain }
}

/** 二分查找当前时间对应的歌词行下标，未开始时返回 -1 */
export function findActiveLine(lines: LyricLine[], time: number): number {
  if (lines.length === 0) return -1
  const target = time + 0.05
  let low = 0
  let high = lines.length - 1
  let result = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (lines[mid].time <= target) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}
