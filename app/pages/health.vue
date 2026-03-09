<script setup lang="ts">
import { formatRelativeTime } from '~/utils/formatters'

const { sources, pending, error, refresh, failedCount } = useCollectionStatus()

const tableColumns = [
  { key: 'displayName', label: 'Source' },
  { key: 'status', label: 'Statut' },
  { key: 'lastSuccess', label: 'Dernier succès' },
  { key: 'lastRunAt', label: 'Dernière exécution' },
  { key: 'rowsCollected', label: 'Lignes' },
  { key: 'durationMs', label: 'Durée' },
  { key: 'errorMessage', label: 'Erreur' }
]

function statusColor(status: string): 'green' | 'red' | 'amber' | 'gray' {
  switch (status) {
    case 'success': return 'green'
    case 'failed': return 'red'
    case 'partial': return 'amber'
    default: return 'gray'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'success': return 'OK'
    case 'failed': return 'Échec'
    case 'partial': return 'Partiel'
    default: return 'Inconnu'
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <UDashboardPanel id="health">
    <template #header>
      <UDashboardNavbar title="Santé des collecteurs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            :loading="pending"
            @click="refresh()"
          >
            Actualiser
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 space-y-6">
        <!-- Summary banner -->
        <UAlert
          v-if="failedCount > 0"
          color="red"
          icon="i-lucide-alert-triangle"
          :title="`${failedCount} source${failedCount > 1 ? 's' : ''} en erreur`"
          description="Vérifiez les logs et la configuration des collecteurs concernés."
        />

        <UAlert
          v-else-if="sources?.length && !pending"
          color="green"
          icon="i-lucide-check-circle"
          title="Tous les collecteurs fonctionnent"
          description="Les données sont collectées normalement."
        />

        <!-- Loading state -->
        <USkeleton v-if="pending" class="h-96 w-full" />

        <!-- Error state -->
        <UAlert
          v-else-if="error"
          color="red"
          :title="'Erreur de chargement'"
          :description="error.message"
          icon="i-lucide-alert-triangle"
        />

        <!-- Data table -->
        <UCard v-else-if="sources?.length">
          <template #header>
            <span class="font-semibold">État des collecteurs</span>
          </template>

          <UTable :rows="sources" :columns="tableColumns">
            <template #displayName-data="{ row }">
              <div class="flex items-center gap-2">
                <div
                  class="size-2 rounded-full"
                  :class="{
                    'bg-green-500': row.currentStatus === 'success',
                    'bg-red-500': row.currentStatus === 'failed',
                    'bg-amber-500': row.currentStatus === 'partial',
                    'bg-gray-400': row.currentStatus === 'unknown'
                  }"
                />
                <span class="font-medium">{{ row.displayName }}</span>
              </div>
            </template>

            <template #status-data="{ row }">
              <UBadge :color="statusColor(row.currentStatus)" variant="subtle">
                {{ statusLabel(row.currentStatus) }}
              </UBadge>
            </template>

            <template #lastSuccess-data="{ row }">
              <span v-if="row.lastSuccess" class="text-sm">
                {{ formatRelativeTime(row.lastSuccess) }}
              </span>
              <span v-else class="text-sm text-[var(--ui-text-muted)]">Jamais</span>
            </template>

            <template #lastRunAt-data="{ row }">
              <span v-if="row.lastRunAt" class="text-sm">
                {{ formatRelativeTime(row.lastRunAt) }}
              </span>
              <span v-else class="text-sm text-[var(--ui-text-muted)]">Jamais</span>
            </template>

            <template #rowsCollected-data="{ row }">
              <span v-if="row.rowsCollected !== null">
                {{ row.rowsCollected.toLocaleString('fr-FR') }}
              </span>
              <span v-else class="text-[var(--ui-text-muted)]">-</span>
            </template>

            <template #durationMs-data="{ row }">
              {{ formatDuration(row.durationMs) }}
            </template>

            <template #errorMessage-data="{ row }">
              <span v-if="row.errorMessage" class="text-sm text-red-500 truncate max-w-xs block">
                {{ row.errorMessage }}
              </span>
              <span v-else class="text-[var(--ui-text-muted)]">-</span>
            </template>
          </UTable>
        </UCard>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <UIcon name="i-lucide-activity" class="size-16 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Aucun collecteur configuré
          </p>
          <p class="mt-2 text-[var(--ui-text-muted)] max-w-md">
            Les collecteurs n'ont pas encore été exécutés.
            Configurez les sources de données pour commencer.
          </p>
        </div>

        <!-- Info section -->
        <UCard>
          <template #header>
            <span class="font-semibold">Fréquence de collecte</span>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]">
              <UIcon name="i-lucide-bug" class="size-5 text-blue-500" />
              <div>
                <p class="font-medium">
                  Sentry
                </p>
                <p class="text-sm text-[var(--ui-text-muted)]">
                  Toutes les 5 min
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]">
              <UIcon name="i-lucide-git-merge" class="size-5 text-purple-500" />
              <div>
                <p class="font-medium">
                  GitHub (déploiements)
                </p>
                <p class="text-sm text-[var(--ui-text-muted)]">
                  Toutes les 15 min
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]">
              <UIcon name="i-lucide-zap" class="size-5 text-green-500" />
              <div>
                <p class="font-medium">
                  DebugBear (CWV)
                </p>
                <p class="text-sm text-[var(--ui-text-muted)]">
                  Hebdomadaire
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]">
              <UIcon name="i-lucide-shield-alert" class="size-5 text-amber-500" />
              <div>
                <p class="font-medium">
                  Dependabot
                </p>
                <p class="text-sm text-[var(--ui-text-muted)]">
                  Quotidien (06:00)
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg-elevated)]">
              <UIcon name="i-lucide-test-tube" class="size-5 text-teal-500" />
              <div>
                <p class="font-medium">
                  PHPUnit Coverage
                </p>
                <p class="text-sm text-[var(--ui-text-muted)]">
                  Quotidien (06:30)
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
