import { OverlayView } from '@react-google-maps/api'
import type { RequestWithLeader } from './useAllRequests'

interface Props {
  request: RequestWithLeader
  position: { lat: number; lng: number }
}

export function DestinationMarker({ request, position }: Props) {
  const label =
    request.objective.length > 20
      ? request.objective.slice(0, 20) + '…'
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
      getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
    >
      <div style={{ display: 'inline-block', userSelect: 'none', cursor: 'default' }} title={title}>
        <div
          style={{
            backgroundColor: '#E91E8C',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 700,
            lineHeight: '1.3',
            padding: '3px 8px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '130px',
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid #E91E8C',
            margin: '0 auto',
          }}
        />
      </div>
    </OverlayView>
  )
}
