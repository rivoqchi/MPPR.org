import {
  A4_HEIGHT_PX,
  A4_MARGIN_PX,
  A4_RULER_SIZE_PX,
  A4_WIDTH_PX,
  CM_IN_PX,
  MM_IN_PX,
} from '@/features/documents/lib/a4-layout'

interface DocumentA4RulerProps {
  orientation: 'horizontal' | 'vertical'
  length?: number
  pageIndex?: number
}

function buildTicks(length: number) {
  const ticks: Array<{ pos: number; major: boolean; label?: string }> = []
  const maxMm = Math.ceil(length / MM_IN_PX)

  for (let mm = 0; mm <= maxMm; mm += 1) {
    const pos = mm * MM_IN_PX
    if (pos > length) {
      break
    }

    const major = mm % 10 === 0
    ticks.push({
      pos,
      major,
      label: major ? String(mm / 10) : undefined,
    })
  }

  return ticks
}

export function DocumentA4Ruler({ orientation, length, pageIndex = 0 }: DocumentA4RulerProps) {
  const isHorizontal = orientation === 'horizontal'
  const rulerLength = isHorizontal ? A4_WIDTH_PX : (length ?? A4_HEIGHT_PX)
  const ticks = buildTicks(rulerLength)

  return (
    <div
      className={`document-a4-ruler document-a4-ruler--${orientation}`}
      style={
        isHorizontal
          ? { width: A4_WIDTH_PX, height: A4_RULER_SIZE_PX }
          : { width: A4_RULER_SIZE_PX, height: rulerLength }
      }
      aria-hidden
    >
      <svg
        width={isHorizontal ? A4_WIDTH_PX : A4_RULER_SIZE_PX}
        height={isHorizontal ? A4_RULER_SIZE_PX : rulerLength}
        viewBox={
          isHorizontal
            ? `0 0 ${A4_WIDTH_PX} ${A4_RULER_SIZE_PX}`
            : `0 0 ${A4_RULER_SIZE_PX} ${rulerLength}`
        }
      >
        {isHorizontal ? (
          <>
            <rect x={0} y={0} width={A4_MARGIN_PX} height={A4_RULER_SIZE_PX} fill="#e8f0fe" />
            <rect
              x={A4_WIDTH_PX - A4_MARGIN_PX}
              y={0}
              width={A4_MARGIN_PX}
              height={A4_RULER_SIZE_PX}
              fill="#e8f0fe"
            />
            <line
              x1={A4_MARGIN_PX}
              y1={0}
              x2={A4_MARGIN_PX}
              y2={A4_RULER_SIZE_PX}
              stroke="#4a90e2"
              strokeWidth={1}
            />
            <line
              x1={A4_WIDTH_PX - A4_MARGIN_PX}
              y1={0}
              x2={A4_WIDTH_PX - A4_MARGIN_PX}
              y2={A4_RULER_SIZE_PX}
              stroke="#4a90e2"
              strokeWidth={1}
            />
          </>
        ) : (
          <>
            <rect x={0} y={0} width={A4_RULER_SIZE_PX} height={A4_MARGIN_PX} fill="#e8f0fe" />
            <rect
              x={0}
              y={A4_HEIGHT_PX - A4_MARGIN_PX}
              width={A4_RULER_SIZE_PX}
              height={A4_MARGIN_PX}
              fill="#e8f0fe"
            />
            <line
              x1={0}
              y1={A4_MARGIN_PX}
              x2={A4_RULER_SIZE_PX}
              y2={A4_MARGIN_PX}
              stroke="#4a90e2"
              strokeWidth={1}
            />
            <line
              x1={0}
              y1={A4_HEIGHT_PX - A4_MARGIN_PX}
              x2={A4_RULER_SIZE_PX}
              y2={A4_HEIGHT_PX - A4_MARGIN_PX}
              stroke="#4a90e2"
              strokeWidth={1}
            />
          </>
        )}

        {ticks.map((tick) => {
          if (isHorizontal) {
            const tickHeight = tick.major ? 10 : 5
            return (
              <g key={`h-${tick.pos}`}>
                <line
                  x1={tick.pos}
                  y1={A4_RULER_SIZE_PX}
                  x2={tick.pos}
                  y2={A4_RULER_SIZE_PX - tickHeight}
                  stroke="#666"
                  strokeWidth={1}
                />
                {tick.label ? (
                  <text x={tick.pos + 2} y={9} fill="#444" fontSize={8} fontFamily="Inter, sans-serif">
                    {tick.label}
                  </text>
                ) : null}
              </g>
            )
          }

          const tickWidth = tick.major ? 10 : 5
          return (
            <g key={`v-${pageIndex}-${tick.pos}`}>
              <line
                x1={A4_RULER_SIZE_PX}
                y1={tick.pos}
                x2={A4_RULER_SIZE_PX - tickWidth}
                y2={tick.pos}
                stroke="#666"
                strokeWidth={1}
              />
              {tick.label ? (
                <text x={2} y={tick.pos - 2} fill="#444" fontSize={8} fontFamily="Inter, sans-serif">
                  {tick.label}
                </text>
              ) : null}
            </g>
          )
        })}

        {isHorizontal ? (
          <text x={A4_WIDTH_PX - CM_IN_PX * 2.2} y={9} fill="#888" fontSize={7} fontFamily="Inter, sans-serif">
            cm
          </text>
        ) : pageIndex > 0 ? (
          <text x={4} y={12} fill="#888" fontSize={7} fontFamily="Inter, sans-serif">
            {pageIndex + 1}
          </text>
        ) : (
          <text x={4} y={12} fill="#888" fontSize={7} fontFamily="Inter, sans-serif">
            cm
          </text>
        )}
      </svg>
    </div>
  )
}
