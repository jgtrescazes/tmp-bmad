<template>
  <UDashboardPanel id="stability">
    <template #header>
      <UDashboardNavbar title="Stabilité">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-shield-check" class="size-12 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Stabilité — Métriques Sentry
          </p>
          <p class="mt-1 text-[var(--ui-text-muted)]">
            En cours de développement
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
