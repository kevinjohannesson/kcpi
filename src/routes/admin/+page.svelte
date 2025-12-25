<script lang="ts">
	import { onMount } from 'svelte';
	import { priceDataState } from '$lib/utils/price-data.svelte.js';

	import { createQuery, useQueryClient, createMutation } from '@tanstack/svelte-query';
	import { supabase } from '$lib/utils/supabase';

	type Repo = {
		full_name: string;
		description: string;
		subscribers_count: number;
		stargazers_count: number;
		forks_count: number;
	};

	// const query = createQuery(() => ({
	// 	queryKey: ['price-data'],
	// 	queryFn: async () =>
	// 		await fetch('https://api.github.com/repos/TanStack/query').then((r) => {
	// 			return r.json();
	// 		})
	// }));
	const query = createQuery(() => ({
		queryKey: ['price-data'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('price_history')
				.select('*')
				.order('created_at', { ascending: true });

			if (error) throw error;
			return data;
		}
	}));

	export const createAddPriceMutation = () => {
		const queryClient = useQueryClient();

		return createMutation(() => ({
			mutationFn: async (price: number) => {
				const { data, error } = await supabase
					.from('price_history')
					.insert({ price })
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

	const addPrice = createAddPriceMutation();

	let newPrice = '';
	let submitting = false;
	let message = '';

	onMount(() => {
		// fetchPriceHistory();
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!newPrice || isNaN(parseFloat(newPrice))) {
			message = '❌ Voer een geldig bedrag in';
			return;
		}

		submitting = true;
		message = '';

		console.log('sumitting');
		await addPrice.mutateAsync(parseFloat(newPrice));
		// try {
		//   await addPrice(newPrice);
		//   message = `✅ Prijs € ${parseFloat(newPrice).toFixed(2)} toegevoegd!`;
		//   newPrice = '';
		// } catch (err) {
		//   message = `❌ Error: ${err.message}`;
		// }

		submitting = false;
	}

	async function handleDelete(id: string) {
		if (!confirm('Weet je zeker dat je deze prijs wilt verwijderen?')) return;

		// try {
		//   await priceDataState.deletePrice(id);
		//   message = '✅ Verwijderd';
		// } catch (err) {
		//   message = `❌ Error: ${err.message}`;
		// }
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('nl-NL', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="min-h-screen bg-gray-100">
	<div class="mx-auto max-w-2xl px-4 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-gray-900">👑 KingCryps Admin</h1>
			<p class="mt-1 text-gray-600">Beheer de koers van KingCryps</p>
			<a href="/" class="text-sm text-blue-600 hover:underline">← Terug naar dashboard</a>
		</div>

		<!-- Add new price -->
		<div class="mb-6 rounded-xl bg-white p-6 shadow-sm">
			<h2 class="mb-4 font-semibold text-gray-900">Nieuwe prijs toevoegen</h2>

			<form onsubmit={handleSubmit} class="flex gap-3">
				<div class="flex-1">
					<div class="relative">
						<span class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">€</span>
						<input
							type="number"
							step="0.01"
							min="0"
							bind:value={newPrice}
							placeholder="104.00"
							class="w-full rounded-lg border border-gray-300 py-3 pr-4 pl-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
							disabled={submitting}
						/>
					</div>
				</div>
				<button
					type="submit"
					disabled={submitting}
					class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Bezig...' : 'Toevoegen'}
				</button>
			</form>

			{#if message}
				<p class="mt-3 text-sm {message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}">
					{message}
				</p>
			{/if}
		</div>

		<!-- Price history -->
		<div class="rounded-xl bg-white p-6 shadow-sm">
			<h2 class="mb-4 font-semibold text-gray-900">Prijsgeschiedenis</h2>

			{#if query.isPending}
				<p class="text-gray-500">Laden...</p>
			{/if}
			{#if query.error}
				<p class="text-red-500">Error: {query.error.message}</p>
			{/if}
			{#if query.isSuccess}
				{JSON.stringify(query.data)}
				{#if priceDataState.allPriceData.length === 0}
					<p class="text-gray-500">Nog geen prijzen toegevoegd</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b border-gray-200">
									<th class="px-2 py-3 text-left text-sm font-medium text-gray-500">Datum</th>
									<th class="px-2 py-3 text-right text-sm font-medium text-gray-500">Prijs</th>
									<th class="px-2 py-3 text-right text-sm font-medium text-gray-500">Actie</th>
								</tr>
							</thead>
							<tbody>
								{#each [...priceDataState.allPriceData].reverse() as item}
									<tr class="border-b border-gray-100 hover:bg-gray-50">
										<td class="px-2 py-3 text-sm text-gray-600">
											{formatDate(item.date.toISOString())}
										</td>
										<td class="px-2 py-3 text-right font-mono text-sm font-medium text-gray-900">
											€ {item.price.toFixed(2).replace('.', ',')}
										</td>
										<td class="px-2 py-3 text-right">
											<button
												onclick={() => handleDelete('foobar')}
												class="text-sm text-red-600 hover:text-red-800"
											>
												Verwijder
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<p class="mt-4 text-sm text-gray-500">
						{priceDataState.allPriceData.length} prijzen totaal
					</p>
				{/if}
			{/if}
		</div>
	</div>
</div>
