import { useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { formatDate } from '../lib/scoring'

const W = 720
const H = 260
const M = { l: 34, r: 16, t: 10, b: 26 }

// Joongraafik: iga mängija libisev keskmine ajas, hiirega näeb kuupäeva väärtusi
export default function TrendChart({ series }) {
  const { t, locale } = useI18n()
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const all = series.flatMap((s) => s.points)
  const dates = [...new Set(all.map((p) => p.date))].sort()
  if (dates.length < 2) return null
  const t0 = Date.parse(dates[0])
  const t1 = Date.parse(dates.at(-1))
  const avgs = all.map((p) => p.avg).filter((v) => v != null)
  const y0 = Math.floor((Math.min(...avgs) - 5) / 10) * 10
  const y1 = Math.ceil((Math.max(...avgs) + 5) / 10) * 10
  const x = (date) => M.l + ((Date.parse(date) - t0) / (t1 - t0)) * (W - M.l - M.r)
  const y = (v) => M.t + (1 - (v - y0) / (y1 - y0)) * (H - M.t - M.b)
  const yTicks = []
  for (let v = y0; v <= y1; v += 10) yTicks.push(v)

  // Kuu algused x-teljel
  const months = []
  const d = new Date(dates[0] + 'T12:00:00')
  d.setDate(1)
  d.setMonth(d.getMonth() + 1)
  while (d.getTime() <= t1) {
    months.push({ date: d.toLocaleDateString('sv-SE'), label: d.toLocaleDateString(locale, { month: 'short' }) })
    d.setMonth(d.getMonth() + 1)
  }

  function handleMove(e) {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse())
    const date = dates.reduce((best, dt) => (Math.abs(x(dt) - loc.x) < Math.abs(x(best) - loc.x) ? dt : best))
    const rect = svg.getBoundingClientRect()
    setHover({ date, left: (x(date) / W) * rect.width, width: rect.width })
  }

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
        {series.map((s) => (
          <span key={s.player.id} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: s.player.color }} />
            {s.player.name}
          </span>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={t('stats.trendTitle')}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#e7e5e4" />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#a8a29e">{v}</text>
          </g>
        ))}
        {months.map((m) => (
          <text key={m.date} x={x(m.date)} y={H - 6} textAnchor="middle" fontSize="11" fill="#a8a29e">{m.label}</text>
        ))}
        {series.map((s) => {
          const pts = s.points.filter((p) => p.avg != null)
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join('')
          const end = pts.at(-1)
          return (
            <g key={s.player.id}>
              <path d={d} fill="none" stroke={s.player.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {end && <circle cx={x(end.date)} cy={y(end.avg)} r="3.5" fill={s.player.color} stroke="#fff" strokeWidth="1.5" />}
            </g>
          )
        })}
        {hover && <line x1={x(hover.date)} x2={x(hover.date)} y1={M.t} y2={H - M.b} stroke="#a8a29e" strokeDasharray="3 3" />}
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" />
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-40 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
          style={hover.left > hover.width / 2 ? { right: hover.width - hover.left + 12 } : { left: hover.left + 12 }}
        >
          <div className="mb-1 font-semibold">{formatDate(hover.date, locale)}</div>
          {series.map((s) => {
            const upto = s.points.filter((p) => p.date <= hover.date && p.avg != null).at(-1)
            return (
              <div key={s.player.id} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.player.color }} />
                  {s.player.name}
                </span>
                <span className="font-medium tabular-nums">{upto ? upto.avg.toFixed(1) : '–'}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
