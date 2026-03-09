<template>
  <UDashboardPanel id="health">
    <template #header>
      <UDashboardNavbar title="Santé système">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-activity" class="size-12 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Santé système — Collecteurs
          </p>
          <p class="mt-1 text-[var(--ui-text-muted)]">
            En cours de développement
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
