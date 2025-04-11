<script setup lang="ts"></script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-2xl self-center">Login with your Microsoft Account</h2>
    <UButton
        to="api/auth/microsoft"
        icon="i-simple-icons-microsoft"
        label="Login with Microsoft"
        color="neutral"
        size="md"
        external
        class="self-center"
    />
  </div>
</template>

<style scoped></style>
