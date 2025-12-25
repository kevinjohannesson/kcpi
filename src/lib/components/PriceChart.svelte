<script lang="ts">
	import { Chart } from 'svelte-echarts';
	import type { EChartsOption } from 'echarts';
	import { init, use } from 'echarts/core';
	import { BarChart, LineChart } from 'echarts/charts';
	import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import { createPriceQuery } from '$lib/queries/prices';
	import { SvelteDate } from 'svelte/reactivity';

	// Tree-shaking setup
	use([BarChart, LineChart, GridComponent, CanvasRenderer, TitleComponent, TooltipComponent]);

	type Period = 'LIVE' | '1D' | '1W' | '1M' | 'ALL' | 'ALL_NOW';
	type PriceDataPoint = {
		timestamp: number;
		date: Date;
		price: number;
	};

	let { showFuture = false, title } = $props<{ showFuture?: boolean; title?: string }>();

	// Normal periods (always shown)
	const normalPeriods: Period[] = ['LIVE', '1D', '1W', '1M', 'ALL'];
	// Admin-only periods (only shown when showFuture is true)
	const adminPeriods: Period[] = ['ALL_NOW'];

	const priceQuery = createPriceQuery();
	let selectedPeriod: Period = $state('ALL');

	// Transform Supabase data to the expected format
	// This includes all data (future included if showFuture is true)
	const allPriceData = $derived.by((): PriceDataPoint[] => {
		if (!priceQuery.data) return [];

		const now = new Date();

		return priceQuery.data
			.map((item: any) => {
				const date = new Date(item.price_date);
				return {
					timestamp: date.getTime(),
					date: date,
					price: item.price
				};
			})
			.filter((d: PriceDataPoint) => showFuture || d.date <= now); // Filter out future dates unless showFuture is true
	});

	// All data up to now (excluding future) - used for ALL_NOW period
	const allPriceDataUpToNow = $derived.by((): PriceDataPoint[] => {
		if (!priceQuery.data) return [];

		const now = new Date();

		return priceQuery.data
			.map((item: any) => {
				const date = new Date(item.price_date);
				return {
					timestamp: date.getTime(),
					date: date,
					price: item.price
				};
			})
			.filter((d: PriceDataPoint) => d.date <= now); // Always exclude future dates
	});

	// Filtered data based on selected period
	const filteredPriceData = $derived.by((): PriceDataPoint[] => {
		const now = new SvelteDate();

		switch (selectedPeriod) {
			case 'LIVE': {
				// Last 60 minutes - show most recent data points
				const oneHourAgo = new SvelteDate(now.getTime() - 60 * 60 * 1000);
				return allPriceData.filter((d) => d.date >= oneHourAgo);
			}

			case '1D': {
				// Last 24 hours
				const oneDayAgo = new SvelteDate(now.getTime() - 24 * 60 * 60 * 1000);
				return allPriceData.filter((d) => d.date >= oneDayAgo);
			}

			case '1W': {
				// Last 7 days
				const oneWeekAgo = new SvelteDate(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				return allPriceData.filter((d) => d.date >= oneWeekAgo);
			}

			case '1M': {
				// Last 30 days
				const oneMonthAgo = new SvelteDate(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				return allPriceData.filter((d) => d.date >= oneMonthAgo);
			}

			case 'ALL_NOW': {
				// All data up to now (excluding future) - admin only
				return allPriceDataUpToNow;
			}

			case 'ALL':
			default:
				return allPriceData;
		}
	});

	// Chart-ready data (formatted for ECharts)
	const chartData = $derived.by(() => {
		return {
			xAxis: filteredPriceData.map((d) => d.timestamp),
			yAxis: filteredPriceData.map((d) => d.price),
			series: filteredPriceData.map((d) => [d.timestamp, d.price])
		};
	});

	// Computed stats for display
	const priceStats = $derived.by(() => {
		if (filteredPriceData.length === 0) {
			return { min: 0, max: 0, start: 0, end: 0, change: 0, changePercent: 0 };
		}

		const prices = filteredPriceData.map((d) => d.price);
		const start = prices[0];
		const end = prices[prices.length - 1];

		return {
			min: Math.min(...prices),
			max: Math.max(...prices),
			start,
			end,
			change: end - start,
			changePercent: ((end - start) / start) * 100
		};
	});

	let options: EChartsOption = $derived({
		grid: {
			left: 10,
			right: 10,
			top: 10,
			bottom: 30
		},
		xAxis: {
			type: 'time',
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				color: '#9ca3af',
				fontSize: 11,
				formatter: (value) => {
					const date = new Date(value);
					if (selectedPeriod === 'LIVE' || selectedPeriod === '1D') {
						return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
					}
					return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
				}
			},
			splitLine: { show: false }
		},
		yAxis: {
			type: 'value',
			show: true,
			scale: true,
			axisLine: { show: false },
			axisTick: { show: false },
			axisLabel: {
				color: '#9ca3af',
				fontSize: 11,
				formatter: (value: number) => {
					return `€${value.toFixed(2).replace('.', ',')}`;
				}
			},
			splitLine: {
				show: true,
				lineStyle: {
					color: '#f3f4f6',
					type: 'dashed'
				}
			}
		},
		series: [
			{
				type: 'line',
				data: chartData.series,
				smooth: 0.4,
				symbol: 'none',
				lineStyle: {
					color: '#111827',
					width: 2
				},
				areaStyle: {
					color: {
						type: 'linear',
						x: 0,
						y: 0,
						x2: 0,
						y2: 1,
						colorStops: [
							{ offset: 0, color: 'rgba(17, 24, 39, 0.08)' },
							{ offset: 1, color: 'rgba(255, 255, 255, 0)' }
						]
					}
				}
			}
		],
		tooltip: {
			trigger: 'axis',
			backgroundColor: '#111827',
			borderColor: '#111827',
			textStyle: { color: '#fff', fontSize: 12 },
			formatter: (params) => {
				if (Array.isArray(params)) {
					const [ts, price] = params[0].data as [number, number];
					const date = new Date(ts);
					const fmt =
						selectedPeriod === 'LIVE' || selectedPeriod === '1D'
							? date.toLocaleString('nl-NL', {
									day: 'numeric',
									month: 'short',
									hour: '2-digit',
									minute: '2-digit'
								})
							: date.toLocaleDateString('nl-NL', {
									day: 'numeric',
									month: 'short',
									year: 'numeric'
								});
					return `<strong>€ ${price.toFixed(2).replace('.', ',')}</strong><br/>${fmt}`;
				} else {
					return 'Not implemented';
				}
			}
		}
	});

	function fmt(n: number) {
		return n.toFixed(2).replace('.', ',');
	}
</script>

<!-- Chart Section -->
<div class="mb-4 rounded-2xl bg-white p-4 shadow-sm md:p-6">
	{#if title}
		<h2 class="mb-4 font-semibold text-gray-900">{title}</h2>
	{/if}
	<!-- Stats Display: Start value, percentage change, end value -->
	<div class="mb-2 flex justify-between text-sm">
		{#if priceQuery.isLoading}
			<span class="text-gray-500">Laden...</span>
		{:else if priceQuery.isError}
			<span class="text-red-500">Fout bij laden</span>
		{:else if filteredPriceData.length === 0}
			<span class="text-gray-500">Geen data</span>
		{:else}
			<span class="text-gray-500">€ {fmt(priceStats.start)}</span>
			<span class="font-medium {priceStats.change >= 0 ? 'text-green-600' : 'text-red-600'}">
				{priceStats.change >= 0 ? '+' : ''}{priceStats.changePercent.toFixed(2).replace('.', ',')}%
			</span>
			<span class="font-medium text-gray-900">€ {fmt(priceStats.end)}</span>
		{/if}
	</div>

	<!-- Chart -->
	<div class="h-48 md:h-72">
		{#if priceQuery.isLoading}
			<div class="flex h-full items-center justify-center text-gray-500">Laden...</div>
		{:else if priceQuery.isError}
			<div class="flex h-full items-center justify-center text-red-500">
				Fout bij laden van data
			</div>
		{:else if filteredPriceData.length === 0}
			<div class="flex h-full items-center justify-center text-gray-500">Geen data beschikbaar</div>
		{:else}
			<Chart {init} {options} />
		{/if}
	</div>

	<!-- Period buttons -->
	<div class="mt-4 flex items-center justify-center gap-2">
		{#each normalPeriods as period}
			<button
				class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
                   {selectedPeriod === period
					? 'bg-gray-900 text-white'
					: 'text-gray-600 hover:bg-gray-100'}"
				onclick={() => {
					selectedPeriod = period;
				}}
			>
				{period}
			</button>
		{/each}
		{#if showFuture}
			{#each adminPeriods as period}
				<button
					class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
                       {selectedPeriod === period
						? 'bg-gray-900 text-white'
						: 'text-gray-600 hover:bg-gray-100'}"
					onclick={() => {
						selectedPeriod = period;
					}}
				>
					All (up to now)
				</button>
			{/each}
		{/if}
	</div>
</div>
