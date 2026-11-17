<script setup lang="ts">
import type { DropdownMenuItem } from "#ui/types";
const { loggedIn, user, clear } = useUserSession();
const colorMode = useColorMode();


watch(loggedIn, () => {
  if (!loggedIn.value) {
    navigateTo("/login");
  }
});

const isDarkMode = computed({
  get: () => colorMode.preference === "dark",
  set: () =>
    (colorMode.preference = colorMode.value === "dark" ? "light" : "dark"),
});

// A named handler returns nothing, which is what the button's click type expects.
function toggleColorMode() {
  isDarkMode.value = !isDarkMode.value;
}

const items = [
  [
    {
      label: "Logout",
      icon: "i-lucide-log-out",
      onSelect: clear,
    },
  ],
] satisfies DropdownMenuItem[][];
</script>

<template>
  <UApp>
    <UContainer class="max-h-screen flex flex-col py-4">
      <div class="mb-2 text-right">
        <UButton
          square
          variant="ghost"
          color="neutral"
          :icon="
            $colorMode.preference === 'dark' ||
            $colorMode.preference === 'system'
              ? 'i-lucide-moon'
              : 'i-lucide-sun'
          "
          @click="toggleColorMode"
        />
      </div>
      <UCard variant="subtle" class="max-h-[calc(100vh-100px)]">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold leading-6">

              <NuxtLink to="/" class="flex items-center gap-4">
                <AppLogo class="w-36"/>
              </NuxtLink>
            </h3>
            <UButton
              v-if="!loggedIn"
              to="api/auth/microsoft"
              icon="i-simple-icons-microsoft"
              label="Login with Microsoft"
              color="neutral"
              size="xs"
              external
            />
            <div v-else class="flex flex-wrap -mx-2 sm:mx-0">
              <UDropdownMenu v-if="user" :items="items">
                <UButton
                  color="neutral"
                  variant="ghost"
                  trailing-icon="i-lucide-chevron-down"
                >
                  {{ user.displayName }}
                </UButton>
              </UDropdownMenu>
            </div>
          </div>
        </template>
        <NuxtPage />
      </UCard>
    </UContainer>
  </UApp>
</template>
