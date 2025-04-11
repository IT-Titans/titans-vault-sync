<script setup lang="ts">
import {type MergedSecrets, MergeState} from "~~/types/types";
import type {TableColumn} from "#ui/types";
import type {Row} from "@tanstack/table-core";
import {useRefetchTrigger} from "~/composables/useRefetchTrigger";

const props = defineProps<{
  data?: Array<MergedSecrets>;
  isLoading: boolean;
  leftVaultName?: string;
  rightVaultName?: string;
}>()

const refetchTrigger = useRefetchTrigger();

const UIcon = resolveComponent('UIcon');
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast();

const columns: TableColumn<MergedSecrets>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: {
      class: {
        td: "text-md"
      }
    }
  },
  {
    accessorKey: 'leftVault',
    header: "Left Vault",
    cell: ({row}) => (row.getValue('leftVault') ? h(UIcon, { name: "i-lucide-circle-check", class: "!size-6 text-green-500"}) : h(UIcon, { name: "i-lucide-circle-x", class: "!size-5 text-red-500"}))
  },
  {
    accessorKey: 'rightVault',
    header: "Right Vault",
    cell: ({row}) => (row.getValue('rightVault') ? h(UIcon, { name: "i-lucide-circle-check", class: "!size-6 text-green-500"}) : h(UIcon, { name: "i-lucide-circle-x", class: "!size-6 text-red-500"}))
  },
  {
    accessorKey: 'enabled',
    header: "Enabled",
    cell: ({row}) => (row.getValue('enabled') ? h(UIcon, { name: "i-lucide-circle-check", class: "!size-6 text-green-500"}) : h(UIcon, { name: "i-lucide-circle-x", class: "!size-6 text-red-500"}))
  },
  {
    accessorKey: 'conflicts',
    header: "Conflicts",
    cell: ({row}) => (row.getValue('conflicts') ? h(UIcon, { name: "i-lucide-circle-check", class: "!size-6 text-green-500"}) : h(UIcon, { name: "i-lucide-circle-x", class: "!size-6 text-red-500"}))
  },
  {
    accessorKey: "mergeState",
    header: "Status",
    cell: ({row}) => {
      const color = {
        merged: 'success' as const,
        mergeable: 'warning' as const,
        conflict: 'error' as const,
        disabled: 'neutral' as const
      }[row.getValue('mergeState') as string]

      return h(UBadge, {class: 'capitalize', size:'lg', variant: 'subtle', color}, () => row.getValue('mergeState'))
    }
  },
  {
    id: 'actions',
    cell: ({row}) => {
      return h(
          'div',
          {class: 'text-right'},
          h(
              UDropdownMenu,
              {
                content: {
                  align: 'end'
                },
                size: 'xl',
                items: getRowItems(row),
                'aria-label': 'Actions dropdown'
              },
              () =>
                  h(UButton, {
                    icon: 'i-lucide-ellipsis-vertical',
                    color: 'neutral',
                    variant: 'ghost',
                    class: 'ml-auto',
                    'aria-label': 'Actions dropdown'
                  })
          )
      )
    }
  }
];
function reFetch() {
  refetchTrigger.value++;
}

async function updateSecret(leftVaultName: string, rightVaultName:string, secretName:string, direction: 'leftToRight' | 'rightToLeft') {
  try {
    const _res = await $fetch('/api/key-vaults/update', {
      method: 'POST',
      body: {
        leftVaultName: leftVaultName,
        rightVaultName: rightVaultName,
        secretName,
        direction
      }
    })

    reFetch();
    toast.add({title: `Successfully Updated ${direction === 'leftToRight' ? 'Right' : 'Left' } Vault`, description: `Merged ${direction === 'leftToRight' ? 'left' : 'right '} vault secret into ${direction === 'leftToRight' ? 'right' : 'left'} vault.`, color: 'success'})
  } catch (e) {
    console.error(e);
    toast.add({title: `Can't Updated ${direction === 'leftToRight' ? 'Right' : 'Left' } Vault`, description: `Merge of ${direction === 'leftToRight' ? 'left' : 'right '} vault secret into ${direction === 'leftToRight' ? 'right' : 'left'} vault failed. Please try later again.`, color: 'error'})
  }
}

function getRowItems(row: Row<MergedSecrets>) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: `Copy to ${props.leftVaultName}`,
      disabled: !row.getValue('enabled') || row.getValue('mergeState') === MergeState.merged || !row.getValue('rightVault'),
      async onSelect() {
        await updateSecret(props.leftVaultName as string, props.rightVaultName as string,row.getValue('name'), 'rightToLeft')
      }
    },
    {
      label: `Copy to ${props.rightVaultName}`,
      disabled: !row.getValue('enabled') || row.getValue('mergeState') === MergeState.merged || !row.getValue('leftVault'),
      async onSelect(){
        await updateSecret(props.leftVaultName as string, props.rightVaultName as string,row.getValue('name'), 'leftToRight')
      }
    },
  ]
}



</script>

<template>
  <UTable sticky  :data="data" :columns="columns" :loading="isLoading" class="max-h-[calc(100vh-555px)]" />
</template>

<style scoped>
</style>
