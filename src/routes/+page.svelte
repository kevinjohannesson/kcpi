<script lang="ts">
	import logo from '$lib/assets/logo.png';
	import PriceChart from '$lib/components/PriceChart.svelte';
	import { config } from '$lib/utils/price-data.svelte.js';
	import { createPriceQuery } from '$lib/queries/prices';
	import { createWalletQuery } from '$lib/queries/wallet';

	let { data } = $props();

	const { coinName, ticker } = config;
	const priceQuery = createPriceQuery();
	const walletQuery = createWalletQuery();

	// Get wallet balance (fallback to config if not loaded)
	const walletBalance = $derived(walletQuery.data?.kcry_balance ?? config.holdings);

	// Calculate actual values from price data
	const priceData = $derived.by(() => {
		if (!priceQuery.data || priceQuery.data.length === 0) {
			return {
				currentPrice: config.currentPrice,
				startingPrice: config.startingPrice,
				totalValue: (walletBalance * config.currentPrice).toFixed(2),
				overallGain: (
					((config.currentPrice - config.startingPrice) / config.startingPrice) *
					100
				).toFixed(2)
			};
		}

		// Get prices sorted by date (ascending)
		const prices = priceQuery.data
			.map((item: any) => ({
				date: new Date(item.price_date),
				price: item.price
			}))
			.sort(
				(a: { date: Date; price: number }, b: { date: Date; price: number }) =>
					a.date.getTime() - b.date.getTime()
			);

		const startingPrice = prices[0].price;
		const currentPrice = prices[prices.length - 1].price;
		const totalValue = (walletBalance * currentPrice).toFixed(2);
		const overallGain = (((currentPrice - startingPrice) / startingPrice) * 100).toFixed(2);

		return {
			currentPrice,
			startingPrice,
			totalValue,
			overallGain
		};
	});

	function fmt(n: number) {
		return n.toFixed(2).replace('.', ',');
	}
</script>

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-md px-4 py-6 md:max-w-4xl md:py-12">
		<!-- Header -->
		<div class="mb-6 text-center">
			<div class="mb-2 text-5xl">
				<!-- 👑 -->

				<img src={logo} alt="KingCryps Logo" class="mx-auto h-24" />
			</div>
			<h1 class="text-2xl font-bold text-gray-900 md:text-3xl">{coinName}</h1>
			{#if data.authenticated}
				<a href="/admin" class="mt-2 inline-block text-sm text-blue-600 hover:underline"
					>⚙️ Admin dashboard</a
				>
			{/if}

			<div class="mt-4">
				{#if priceQuery.isLoading}
					<span class="text-4xl font-bold text-gray-900 md:text-5xl">Laden...</span>
				{:else if priceQuery.isError}
					<span class="text-4xl font-bold text-red-500 md:text-5xl">Fout</span>
				{:else}
					<span class="text-4xl font-bold text-gray-900 md:text-5xl"
						>€ {fmt(priceData.currentPrice)}</span
					>
				{/if}
			</div>

			<div class="mt-3 flex items-center justify-center gap-3">
				{#if priceQuery.isLoading}
					<span class="text-sm text-gray-500">Laden...</span>
				{:else if priceQuery.isError}
					<span class="text-sm text-red-500">Fout bij laden</span>
				{:else}
					<span
						class="inline-flex items-center rounded-md bg-green-100 px-3 py-1 text-sm font-semibold text-green-700"
					>
						{priceData.overallGain.startsWith('-') ? '' : '+'}{priceData.overallGain.replace(
							'.',
							','
						)}%
					</span>
					<span class="text-sm text-gray-500">vanaf € {fmt(priceData.startingPrice)}</span>
				{/if}
			</div>
		</div>

		<!-- Chart -->
		<PriceChart />

		<!-- Balance -->
		<div class="mb-4 rounded-2xl bg-white p-4 shadow-sm md:p-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="text-3xl">💰</span>
					<div>
						<h3 class="font-semibold text-gray-900">Saldo</h3>
						<p class="text-sm text-gray-500">Totaal</p>
					</div>
				</div>
				<div class="text-right">
					{#if priceQuery.isLoading || walletQuery.isLoading}
						<p class="text-xl font-bold text-gray-900">Laden...</p>
					{:else if priceQuery.isError || walletQuery.isError}
						<p class="text-xl font-bold text-red-500">Fout</p>
					{:else}
						<p class="text-xl font-bold text-gray-900">
							€ {priceData.totalValue.replace('.', ',')}
						</p>
						<p class="text-sm text-gray-500">
							{walletBalance.toFixed(7).replace('.', ',')}
							{ticker}
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Disabled buttons -->
		<div class="mb-4 grid grid-cols-2 gap-3">
			<button
				disabled
				class="cursor-not-allowed rounded-xl bg-blue-200 py-4 font-semibold text-blue-400"
				>🛒 Kopen</button
			>
			<button
				disabled
				class="cursor-not-allowed rounded-xl bg-blue-200 py-4 font-semibold text-blue-400"
				>💸 Verkopen</button
			>
		</div>

		<!-- Notice -->
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
			<p class="text-sm text-amber-800">
				⏰ Het investeringsvenster is gesloten.
				<span class="mt-1 block font-medium">Uitbetaling volgt met Oud en Nieuw! 🎉</span>
			</p>
		</div>
	</div>
</div>
