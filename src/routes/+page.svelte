<script lang="ts">
	// +page.svelte - Complete example with svelte-echarts
	import { Chart } from 'svelte-echarts';
	import type { EChartsOption } from 'echarts';
	import { init, use } from 'echarts/core';
	import { BarChart, LineChart } from 'echarts/charts';
	import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import { config, priceDataState } from '$lib/utils/price-data.svelte';

	// now with tree-shaking
	use([BarChart, LineChart, GridComponent, CanvasRenderer, TitleComponent, TooltipComponent]);

	const periods = ['LIVE', '1D', '1W', '1M', 'ALL'];
	const { coinName, ticker, currentPrice, startingPrice, holdings } = config;
	const totalValue = (holdings * currentPrice).toFixed(2);
	const overallGain = (((currentPrice - startingPrice) / startingPrice) * 100).toFixed(2);

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
					if (priceDataState.selectedPeriod === 'LIVE' || priceDataState.selectedPeriod === '1D') {
						return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
					}
					return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
				}
			},
			splitLine: { show: false }
		},
		yAxis: {
			type: 'value',
			show: false,
			scale: true
		},
		series: [
			// {
			// 	data: [120, 200, 150],
			// 	type: 'line'
			// },
			{
				type: 'line',
				data: priceDataState.chartData.series,
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
						priceDataState.selectedPeriod === 'LIVE' || priceDataState.selectedPeriod === '1D'
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

<!-- <Chart {init} {options} /> -->

<div class="min-h-screen bg-gray-50">
	<div class="mx-auto max-w-md px-4 py-6 md:max-w-4xl md:py-12">
		<!-- Header -->
		<div class="mb-6 text-center">
			<div class="mb-2 text-5xl">👑</div>
			<h1 class="text-2xl font-bold text-gray-900 md:text-3xl">{coinName}</h1>

			<div class="mt-4">
				<span class="text-4xl font-bold text-gray-900 md:text-5xl">€ {fmt(currentPrice)}</span>
			</div>

			<div class="mt-3 flex items-center justify-center gap-3">
				<span
					class="inline-flex items-center rounded-md bg-green-100 px-3 py-1 text-sm font-semibold text-green-700"
				>
					+{overallGain.replace('.', ',')}%
				</span>
				<span class="text-sm text-gray-500">vanaf € {fmt(startingPrice)}</span>
			</div>
		</div>

		<!-- Chart -->
		<div class="mb-4 rounded-2xl bg-white p-4 shadow-sm md:p-6">
			<div class="mb-2 flex justify-between text-sm">
				<span class="text-gray-500">€ {fmt(priceDataState.priceStats.start)}</span>
				<span
					class="font-medium {priceDataState.priceStats.change >= 0
						? 'text-green-600'
						: 'text-red-600'}"
				>
					{priceDataState.priceStats.change >= 0 ? '+' : ''}{priceDataState.priceStats.changePercent
						.toFixed(2)
						.replace('.', ',')}%
				</span>
				<span class="font-medium text-gray-900">€ {fmt(priceDataState.priceStats.end)}</span>
			</div>

			<div class="h-48 md:h-72">
				<Chart {init} {options} />
			</div>

			<!-- Period buttons -->
			<div class="mt-4 flex items-center justify-center gap-2">
				{#each periods as period}
					<button
						class="rounded-lg px-4 py-2 text-sm font-medium transition-colors
                   {priceDataState.selectedPeriod === period
							? 'bg-gray-900 text-white'
							: 'text-gray-600 hover:bg-gray-100'}"
						onclick={() => {
							priceDataState.selectedPeriod = period;
							console.log('period', period);
						}}
					>
						{period}
					</button>
				{/each}
			</div>
		</div>

		<!-- Balance -->
		<div class="mb-4 rounded-2xl bg-white p-4 shadow-sm md:p-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="text-3xl">👑</span>
					<div>
						<h3 class="font-semibold text-gray-900">Saldo</h3>
						<p class="text-sm text-gray-500">Totaal</p>
					</div>
				</div>
				<div class="text-right">
					<p class="text-xl font-bold text-gray-900">€ {totalValue.replace('.', ',')}</p>
					<p class="text-sm text-gray-500">{holdings.toFixed(7).replace('.', ',')} {ticker}</p>
				</div>
			</div>
		</div>

		<!-- Disabled buttons -->
		<div class="mb-4 grid grid-cols-2 gap-3">
			<button
				disabled
				class="cursor-not-allowed rounded-xl bg-blue-200 py-4 font-semibold text-blue-400"
				>Kopen</button
			>
			<button
				disabled
				class="cursor-not-allowed rounded-xl bg-blue-200 py-4 font-semibold text-blue-400"
				>Verkopen</button
			>
		</div>

		<!-- Notice -->
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
			<p class="text-sm text-amber-800">
				⏰ Het investeringsvenster is gesloten.
				<span class="mt-1 block font-medium">Uitbetaling volgt met Kerst! 🎄</span>
			</p>
		</div>
	</div>
</div>
