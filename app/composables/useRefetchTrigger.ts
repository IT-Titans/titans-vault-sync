export const useRefetchTrigger = () =>  useState<number>('data-refetch-trigger', () => 0);
