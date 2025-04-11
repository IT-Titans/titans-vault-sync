<script setup lang="ts">
import {z} from "zod";
import type {FormSubmitEvent} from "#ui/types";
import {useRefetchTrigger} from "~/composables/useRefetchTrigger";


definePageMeta({
  middleware: ["auth"],
});

const refetchTrigger = useRefetchTrigger();

const UButton = resolveComponent('UButton')

const toast = useToast();

const vaultFormSchema = z.object({
  vaultA: z.string(),
  vaultB: z.string(),
})

type VaultFormSchema = z.output<typeof vaultFormSchema>
const vaults = reactive({
  vaultA: '',
  vaultB: ''
})

const {data, status, execute} = useFetch('/api/key-vaults', {
  params: vaults,
  immediate: false,
  watch: false,
})

watch(refetchTrigger, async () => {
  await execute()
  toast.add({title: "Success", description: "Successfully reload loaded vault merge summary", color: "success"})
})

const leftVaultCount = computed(() => {
  if (!data.value) {
    return 0;
  }
  return data.value.filter(vault => vault.leftVault).length
})

const rightVaultCount = computed(() => {
  if (!data.value) {
    return 0;
  }
  return data.value.filter(vault => vault.rightVault).length
})

async function onSubmit(_event: FormSubmitEvent<VaultFormSchema>) {
  try {
    await execute()
    toast.add({title: "Success", description: "Successfully loaded vaults", color: "success"})
  } catch (e) {
    console.error(e)
    toast.add({
      title: "Error fetching Vaults",
      description: `Cant fetch Vaults: Vault A = ${vaults.vaultA} and Vault B = ${vaults.vaultB}`,
      color: "error"
    })
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <p>Before using the tool, please make sure that a backup of the key vaults has been created so that the respective
        key vaults can be restored in an emergency.</p>
    </UCard>
    <div class="flex flex-col w-full gap-4">
      <div class="flex flex-col w-full gap-4">
        <UForm :schema="vaultFormSchema" :state="vaults" class="flex flex-col w-full gap-4" @submit="onSubmit">
          <div class="w-full flex gap-4">
            <UFormField label="Left Vault" name="vaultA" class="w-full text-lg">
              <UInput v-model="vaults.vaultA" type="text" size="lg" placeholder="Name of Left Vault" class="w-full"/>
            </UFormField>
            <UFormField label="Right Vault" name="vaultB" class="w-full text-lg">
              <UInput v-model="vaults.vaultB" type="text" size="lg" placeholder="Name of Right Vault" class="w-full"/>
            </UFormField>
          </div>

          <UButton type="submit" class="self-center" :loading="status === 'pending'">
            Load Vaults
          </UButton>
        </UForm>
      </div>

      <div v-if="data && vaults"  class="flex flex-col gap-2">
        <h3 class="text-xl font-bold">Merge Overview</h3>
        <p>{{ leftVaultCount }} Secrets in Vault: {{vaults.vaultA}} - {{ rightVaultCount }} Secrets in Vault: {{ vaults.vaultB }}</p>
      </div>
        <VaultMergeTable :data="data" :is-loading="status === 'pending'" :left-vault-name="vaults.vaultA" :right-vault-name="vaults.vaultB" />
    </div>
  </div>
</template>

<style scoped></style>
