<script lang="ts">
	import { Chart } from 'svelte-echarts';
	import type { EChartsOption } from 'echarts';
	import { init, use } from 'echarts/core';
	import { BarChart, LineChart } from 'echarts/charts';
	import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
	import { CanvasRenderer } from 'echarts/renderers';
	import { priceDataState } from '$lib/utils/price-data.svelte.js';

	// Tree-shaking setup
	use([BarChart, LineChart, GridComponent, CanvasRenderer, TitleComponent, TooltipComponent]);

	const periods = ['LIVE', '1D', '1W', '1M', 'ALL'];

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

<!-- Chart Section -->
<div class="mb-4 rounded-2xl bg-white p-4 shadow-sm md:p-6">
	<!-- Stats Display: Start value, percentage change, end value -->
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

	<!-- Chart -->
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
