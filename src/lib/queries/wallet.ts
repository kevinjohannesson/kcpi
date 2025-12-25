import { supabase } from '$lib/utils/supabase';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';

// Wallet types and queries
export type Wallet = {
	id: number;
	kcry_balance: number;
	updated_at: string;
};

export const createWalletQuery = () =>
	createQuery<Wallet>(() => ({
		queryKey: ['wallet'],
		queryFn: async () => {
			const { data, error } = await supabase.from('wallet').select('*').single();

			if (error) throw error;
			return data;
		}
	}));

export const createUpdateWalletMutation = () => {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async (newBalance: number) => {
			const { data, error } = await supabase
				.from('wallet')
				.update({
					kcry_balance: newBalance,
					updated_at: new Date().toISOString()
				})
				.eq('id', 1)
				.select()
				.single();

			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['wallet'] });
		}
	}));
};
