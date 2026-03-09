/**
 * Period selection composable
 * Manages the selected time period for dashboard views
 */

export interface Period {
  from: string // ISO date string YYYY-MM-DD
  to: string // ISO date string YYYY-MM-DD
}

export interface PeriodPreset {
  label: string
  value: string
  getDates: () => Period
}

export const PERIOD_PRESETS: PeriodPreset[] = [
  {
    label: '7 derniers jours',
    value: '7d',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 7)
      return {
        from: formatDateISO(from),
        to: formatDateISO(to)
      }
    }
  },
  {
    label: '30 derniers jours',
    value: '30d',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 30)
      return {
        from: formatDateISO(from),
        to: formatDateISO(to)
      }
    }
  },
  {
    label: 'Ce mois',
    value: 'this-month',
    getDates: () => {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        from: formatDateISO(from),
        to: formatDateISO(now)
      }
    }
  },
  {
    label: 'Mois dernier',
    value: 'last-month',
    getDates: () => {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const to = new Date(now.getFullYear(), now.getMonth(), 0)
      return {
        from: formatDateISO(from),
        to: formatDateISO(to)
      }
    }
  },
  {
    label: '3 derniers mois',
    value: '3m',
    getDates: () => {
      const to = new Date()
      const from = new Date()
      from.setMonth(from.getMonth() - 3)
      return {
        from: formatDateISO(from),
        to: formatDateISO(to)
      }
    }
  }
]

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function usePeriod() {
  // Default to 30 days
  const period = useState<Period>('selected-period', () => {
    return PERIOD_PRESETS[1].getDates() // 30d
  })

  const selectedPreset = useState<string>('selected-preset', () => '30d')

  function setPeriod(from: string, to: string) {
    period.value = { from, to }
    selectedPreset.value = 'custom'
  }

  function setPreset(presetValue: string) {
    const preset = PERIOD_PRESETS.find(p => p.value === presetValue)
    if (preset) {
      period.value = preset.getDates()
      selectedPreset.value = presetValue
    }
  }

  function getPreviousPeriod(): Period {
    const { from, to } = period.value
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const durationMs = toDate.getTime() - fromDate.getTime()

    const prevTo = new Date(fromDate.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - durationMs)

    return {
      from: formatDateISO(prevFrom),
      to: formatDateISO(prevTo)
    }
  }

  return {
    period: readonly(period),
    selectedPreset: readonly(selectedPreset),
    setPeriod,
    setPreset,
    getPreviousPeriod,
    presets: PERIOD_PRESETS
  }
}
