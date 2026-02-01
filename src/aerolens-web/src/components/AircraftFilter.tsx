import { useState, useCallback, useEffect } from 'react'
import { useHaptic } from '../hooks/useHaptic'

export type AircraftCategory = 'commercial' | 'cargo' | 'military' | 'private' | 'ground'

export interface AircraftFilterState {
  commercial: boolean
  cargo: boolean
  military: boolean
  private: boolean
  ground: boolean
}

interface Props {
  filters: AircraftFilterState
  onChange: (filters: AircraftFilterState) => void
  visible: boolean
  onClose: () => void
}

const MILITARY_PREFIXES = [
  'RCH', 'REACH', 'EVAC', 'NAVY', 'ARMY', 'USAF', 'DUKE', 'KING',
  'SPAR', 'SAM', 'EXEC', 'VAPOR', 'TOPCT', 'JULIET', 'TANGO', 'HAWK',
  'COBRA', 'VIPER', 'RAPTOR', 'EAGLE', 'MAGIC', 'IRON', 'STEEL',
  'RRR', 'CNV', 'CFC', 'PAT', 'MMF', 'AFR',
]

const CARGO_PREFIXES = [
  'FDX', 'UPS', 'GTI', 'ABX', 'ATN', 'POE', 'KFS', 'CLX', 'MPH',
  'CKS', 'BOX', 'DHK', 'QTR', 'ETD', 'SQC', 'CAO', 'LCO', 'NCR',
  'ASA', 'GEC', 'ANA',
]

const COMMERCIAL_PREFIXES = [
  'AAL', 'UAL', 'DAL', 'SWA', 'JBU', 'ASA', 'SKW', 'NKS', 'FFT',
  'BAW', 'AFR', 'DLH', 'KLM', 'UAE', 'SIA', 'CPA', 'QFA', 'ANA',
  'JAL', 'RYR', 'EZY', 'VLG', 'EJU', 'WZZ', 'THY', 'THA', 'EVA',
  'ACA', 'WJA', 'ALK', 'RAM', 'SAA', 'ETH', 'KQA', 'MSR', 'GIA',
]

export function categorizeAircraft(callsign: string | null, onGround: boolean): AircraftCategory {
  if (onGround) return 'ground'
  if (!callsign) return 'private'

  const upperCallsign = callsign.toUpperCase().trim()

  if (MILITARY_PREFIXES.some(prefix => upperCallsign.startsWith(prefix))) {
    return 'military'
  }

  if (CARGO_PREFIXES.some(prefix => upperCallsign.startsWith(prefix))) {
    return 'cargo'
  }

  const prefix = upperCallsign.substring(0, 3)
  if (COMMERCIAL_PREFIXES.includes(prefix)) {
    return 'commercial'
  }

  if (upperCallsign.match(/^N\d/) || upperCallsign.length <= 5) {
    return 'private'
  }

  if (upperCallsign.match(/^[A-Z]{3}\d/)) {
    return 'commercial'
  }

  return 'private'
}

const FILTER_STORAGE_KEY = 'aerolens_aircraft_filters'

const filterOptions: { key: AircraftCategory; label: string; icon: React.ReactNode; color: string }[] = [
  {
    key: 'commercial',
    label: 'Commercial',
    color: '#0ea5e9',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
      </svg>
    ),
  },
  {
    key: 'cargo',
    label: 'Cargo',
    color: '#f59e0b',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 5v5h-3" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'military',
    label: 'Military',
    color: '#22c55e',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    key: 'private',
    label: 'Private',
    color: '#a855f7',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </svg>
    ),
  },
  {
    key: 'ground',
    label: 'On Ground',
    color: '#64748b',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
]

export function AircraftFilter({ filters, onChange, visible, onClose }: Props) {
  const { tap } = useHaptic()
  const [localFilters, setLocalFilters] = useState(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const toggleFilter = useCallback((key: AircraftCategory) => {
    tap()
    const newFilters = {
      ...localFilters,
      [key]: !localFilters[key],
    }
    setLocalFilters(newFilters)
    onChange(newFilters)
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters))
  }, [localFilters, onChange, tap])

  const selectAll = useCallback(() => {
    tap()
    const newFilters: AircraftFilterState = {
      commercial: true,
      cargo: true,
      military: true,
      private: true,
      ground: true,
    }
    setLocalFilters(newFilters)
    onChange(newFilters)
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters))
  }, [onChange, tap])

  const selectNone = useCallback(() => {
    tap()
    const newFilters: AircraftFilterState = {
      commercial: false,
      cargo: false,
      military: false,
      private: false,
      ground: false,
    }
    setLocalFilters(newFilters)
    onChange(newFilters)
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(newFilters))
  }, [onChange, tap])

  const activeCount = Object.values(localFilters).filter(Boolean).length

  if (!visible) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 80,
        zIndex: 1000,
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(12px)',
        borderRadius: 14,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        padding: 16,
        minWidth: 200,
        animation: 'scaleIn 150ms ease-out',
      }}
      role="dialog"
      aria-label="Aircraft filters"
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#f8fafc',
        }}>
          Filter Aircraft
        </div>
        <div style={{
          fontSize: 11,
          color: '#64748b',
          padding: '2px 8px',
          background: 'rgba(148, 163, 184, 0.1)',
          borderRadius: 10,
        }}>
          {activeCount}/{filterOptions.length}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filterOptions.map(option => (
          <button
            key={option.key}
            onClick={() => toggleFilter(option.key)}
            aria-pressed={localFilters[option.key]}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: localFilters[option.key]
                ? `${option.color}15`
                : 'transparent',
              border: localFilters[option.key]
                ? `1px solid ${option.color}40`
                : '1px solid transparent',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{
              color: localFilters[option.key] ? option.color : '#64748b',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 150ms ease',
            }}>
              {option.icon}
            </span>
            <span style={{
              fontSize: 13,
              fontWeight: 500,
              color: localFilters[option.key] ? '#f8fafc' : '#94a3b8',
              flex: 1,
              transition: 'color 150ms ease',
            }}>
              {option.label}
            </span>
            {localFilters[option.key] && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={option.color} strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
      }}>
        <button
          onClick={selectAll}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          All
        </button>
        <button
          onClick={selectNone}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: 6,
            color: '#94a3b8',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms ease',
          }}
        >
          None
        </button>
      </div>

      <button
        onClick={onClose}
        aria-label="Close filters"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          color: '#64748b',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export function loadFilterPreferences(): AircraftFilterState {
  try {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore parse errors
  }
  return {
    commercial: true,
    cargo: true,
    military: true,
    private: true,
    ground: true,
  }
}
