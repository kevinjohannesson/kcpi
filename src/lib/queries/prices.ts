import { supabase } from '$lib/utils/supabase';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';

export const createPriceQuery = () =>
	createQuery(() => ({
		queryKey: ['price-data'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('price_history')
				.select('*')
				.order('price_date', { ascending: true });

			if (error) throw error;
			return data;
		}
	}));

type AddPriceParams = {
	price: number;
	priceDate: Date;
};

export const createAddPriceMutation = () => {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async ({ price, priceDate }: AddPriceParams) => {
			const { data, error } = await supabase
				.from('price_history')
				.insert({
					price,
					price_date: priceDate.toISOString()
				})
				.select()
				.single();

			if (error) throw error;
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['price-data'] });
		}
	}));
};

export const createDeletePriceMutation = () => {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: async (id: number) => {
			const { error } = await supabase.from('price_history').delete().eq('id', id);

			if (error) throw error;
			return true;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['price-data'] });
		}
	}));
};
