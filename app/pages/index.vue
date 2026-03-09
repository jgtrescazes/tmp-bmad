<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Vue d'ensemble">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-layout-dashboard" class="size-12 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Watchtower
          </p>
          <p class="mt-1 text-[var(--ui-text-muted)]">
            Tableau de bord de monitoring — En cours de développement
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
