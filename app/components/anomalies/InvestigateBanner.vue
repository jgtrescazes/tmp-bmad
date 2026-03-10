<script setup lang="ts">
import { useAnomalies } from '~/composables/useAnomalies'

const { period } = usePeriod()
const { data, pending } = useAnomalies(period)

const anomalies = computed(() => data.value?.anomalies ?? [])
const anomalyCount = computed(() => anomalies.value.length)
const hasAnomalies = computed(() => anomalyCount.value > 0)

const isExpanded = ref(false)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

const title = computed(() => {
  if (anomalyCount.value === 1) {
    return '1 anomalie à investiguer'
  }
  return `${anomalyCount.value} anomalies à investiguer`
})
</script>

<template>
  <!-- Skeleton loading state -->
  <USkeleton
    v-if="pending"
    class="h-16 w-full rounded-lg"
  />

  <div v-else-if="hasAnomalies">
    <UAlert
      data-testid="investigate-banner"
      color="warning"
      variant="subtle"
      :title="title"
      icon="i-lucide-alert-triangle"
    >
      <template #description>
        <div class="flex items-center justify-between">
          <span class="text-sm">
            Cliquez pour voir les détails et investiguer.
          </span>
          <UButton
            data-testid="expand-button"
            :icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="toggleExpand"
          />
        </div>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[500px]"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 max-h-[500px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="isExpanded"
            class="mt-4 space-y-2 overflow-hidden"
          >
            <AnomaliesAnomalyCard
              v-for="(anomaly, index) in anomalies"
              :key="`${anomaly.metric}-${anomaly.type}-${index}`"
              :anomaly="anomaly"
            />
          </div>
        </Transition>
      </template>
    </UAlert>
  </div>
</template>
