<template>
  <UDashboardPanel id="security">
    <template #header>
      <UDashboardNavbar title="Sécurité">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <UIcon name="i-lucide-lock" class="size-12 text-[var(--ui-text-muted)]" />
          <p class="mt-4 text-lg font-medium">
            Sécurité — Dependabot
          </p>
          <p class="mt-1 text-[var(--ui-text-muted)]">
            En cours de développement
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
