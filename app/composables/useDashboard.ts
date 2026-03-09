import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const router = useRouter()

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-s': () => router.push('/stability'),
    'g-p': () => router.push('/performance'),
    'g-e': () => router.push('/security'),
    'g-q': () => router.push('/quality'),
    'g-r': () => router.push('/report'),
    'g-x': () => router.push('/health')
  })

  return {}
}

export const useDashboard = createSharedComposable(_useDashboard)
