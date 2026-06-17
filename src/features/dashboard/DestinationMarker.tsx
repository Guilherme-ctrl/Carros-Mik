import { OverlayView } from '@react-google-maps/api'
import type { RequestWithLeader } from './useAllRequests'

interface Props {
  request: RequestWithLeader
  position: { lat: number; lng: number }
}

function getPixelOffset(w: number, h: number) {
  return { x: -(w / 2), y: -h }
}

export function DestinationMarker({ request, position }: Props) {
  const label =
    request.objective.length > 22
      ? request.objective.slice(0, 22) + '…'
      : request.objective

  const title = [
    request.objective,
    `${request.street}, ${request.street_number}`,
    request.neighborhood,
  ].join(' · ')

  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={getPixelOffset}
    >
      <div className="flex flex-col items-center select-none" title={title}>
        <div className="bg-[#E91E8C] text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg whitespace-nowrap max-w-[140px] truncate">
          {label}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid #E91E8C',
          }}
        />
      </div>
    </OverlayView>
  )
}
