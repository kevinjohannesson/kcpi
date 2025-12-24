// src/lib/utils/price-data.svelte.ts
// $state and $derived are built-in runes, no import needed

import { SvelteDate } from 'svelte/reactivity';

// Configuration
export const config = {
	coinName: 'KingCryps',
	ticker: 'KCRY',
	startingPrice: 16.0,
	currentPrice: 104.0,
	holdings: 28.3783,
	startDate: new SvelteDate('2024-10-01') // When the "investment" started
};

// Generate fake historical price data
function generatePriceHistory() {
	const data = [];
	const startDate = config.startDate;
	const endDate = new Date(); // Today
	const startPrice = config.startingPrice;
	const endPrice = config.currentPrice;

	// Calculate total days
	const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

	// We want exponential-ish growth with some noise
	// Using a modified exponential curve: price = start * (end/start)^(t/T) + noise
	const growthFactor = endPrice / startPrice;

	const currentDate = new SvelteDate(startDate);
	let prevPrice = startPrice;

	for (let day = 0; day <= totalDays; day++) {
		// Base exponential growth
		const progress = day / totalDays;
		const basePrice = startPrice * Math.pow(growthFactor, progress);

		// Add some realistic volatility (more volatility as price increases)
		const volatility = basePrice * 0.03; // 3% daily volatility
		const noise = (Math.random() - 0.5) * 2 * volatility;

		// Smooth it a bit by averaging with previous price
		let price = basePrice + noise;
		price = prevPrice * 0.3 + price * 0.7; // Smoothing

		// Ensure we don't go below starting price too much
		price = Math.max(price, startPrice * 0.9);

		// For every hour of the last 24 hours, generate hourly data
		if (day === totalDays) {
			// Generate today's hourly data
			for (let hour = 0; hour < 24; hour++) {
				const hourDate = new SvelteDate(currentDate);
				hourDate.setHours(hour, 0, 0, 0);

				if (hourDate <= new Date()) {
					const hourProgress = hour / 24;
					const hourPrice =
						prevPrice + (price - prevPrice) * hourProgress + (Math.random() - 0.5) * 2;

					data.push({
						timestamp: hourDate.getTime(),
						date: hourDate,
						price: Math.round(hourPrice * 100) / 100
					});
				}
			}
		} else {
			data.push({
				timestamp: currentDate.getTime(),
				date: new Date(currentDate),
				price: Math.round(price * 100) / 100
			});
		}

		prevPrice = price;
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Ensure the last data point is exactly the current price
	if (data.length > 0) {
		data[data.length - 1].price = config.currentPrice;
	}

	return data;
}

// Generate minute-by-minute data for "LIVE" view (last 60 minutes)
function generateLiveData(basePrice: number) {
	const data = [];
	const now = new Date();

	let price = basePrice - 2 + Math.random() * 2; // Start slightly lower

	for (let min = 60; min >= 0; min--) {
		const timestamp = new Date(now.getTime() - min * 60 * 1000);

		// Small random walk
		price += (Math.random() - 0.48) * 0.3; // Slight upward bias
		price = Math.max(price, basePrice - 5);
		price = Math.min(price, basePrice + 2);

		data.push({
			timestamp: timestamp.getTime(),
			date: timestamp,
			price: Math.round(price * 100) / 100
		});
	}

	// Ensure last point is current price
	data[data.length - 1].price = basePrice;

	return data;
}

// Create a class to hold all reactive state and computed values
// Using class properties with $derived - TypeScript may see them as functions,
// but Svelte will handle them correctly at runtime
class PriceDataState {
	allPriceData = $state(generatePriceHistory());
	selectedPeriod = $state('ALL');

	// Filtered data based on selected period - using $derived for computed values
	filteredPriceData = $derived.by(() => {
		const now = new SvelteDate();

		switch (this.selectedPeriod) {
			case 'LIVE':
				// Last 60 minutes (generate fresh)
				return generateLiveData(config.currentPrice);

			case '1D': {
				// Last 24 hours
				const oneDayAgo = new SvelteDate(now.getTime() - 24 * 60 * 60 * 1000);
				return this.allPriceData.filter((d) => d.date >= oneDayAgo);
			}

			case '1W': {
				// Last 7 days
				const oneWeekAgo = new SvelteDate(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				return this.allPriceData.filter((d) => d.date >= oneWeekAgo);
			}

			case '1M': {
				// Last 30 days
				const oneMonthAgo = new SvelteDate(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				return this.allPriceData.filter((d) => d.date >= oneMonthAgo);
			}

			case 'ALL':
			default:
				return this.allPriceData;
		}
	});

	// Chart-ready data (formatted for ECharts) - using $derived for computed values
	chartData = $derived.by(() => {
		return {
			xAxis: this.filteredPriceData.map((d) => d.timestamp),
			yAxis: this.filteredPriceData.map((d) => d.price),
			// For ECharts line chart, you typically want [timestamp, value] pairs
			series: this.filteredPriceData.map((d) => [d.timestamp, d.price])
		};
	});

	// Computed stats for display - using $derived for computed values
	priceStats = $derived.by(() => {
		if (this.filteredPriceData.length === 0) {
			return { min: 0, max: 0, start: 0, end: 0, change: 0, changePercent: 0 };
		}

		const prices = this.filteredPriceData.map((d) => d.price);
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
}

// Export a singleton instance - access all state through this instance
export const priceDataState = new PriceDataState();
