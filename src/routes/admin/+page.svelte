<script lang="ts">
	import { enhance } from '$app/forms';
	import PriceChart from '$lib/components/PriceChart.svelte';
	import {
		createPriceQuery,
		createAddPriceMutation,
		createDeletePriceMutation
	} from '$lib/queries/prices';
	import { createWalletQuery, createUpdateWalletMutation } from '$lib/queries/wallet';

	const priceQuery = createPriceQuery();
	const addPrice = createAddPriceMutation();
	const deletePrice = createDeletePriceMutation();
	const walletQuery = createWalletQuery();
	const updateWallet = createUpdateWalletMutation();

	// Form state
	let newPrice = $state('');
	let priceInputMode: 'coin' | 'wallet' = $state('coin'); // Toggle between coin price and wallet value
	let dateValue = $state(formatDateForInput(new Date()));
	let timeValue = $state(formatTimeForInput(new Date()));
	// Wallet state
	let walletInput = $state('');
	let walletInputMode: 'kry' | 'eur' = $state('kry'); // Toggle between KCRY and €

	// Message feedback
	let message = $state('');
	let messageTimeout: ReturnType<typeof setTimeout>;

	function showMessage(msg: string) {
		message = msg;
		clearTimeout(messageTimeout);
		messageTimeout = setTimeout(() => (message = ''), 3000);
	}

	// Format helpers for native inputs
	function formatDateForInput(date: Date): string {
		return date.toISOString().split('T')[0];
	}

	function formatTimeForInput(date: Date): string {
		return date.toTimeString().slice(0, 5);
	}

	function formatDisplayDate(dateStr: string): string {
		return new Date(dateStr).toLocaleString('nl-NL', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Combine date + time inputs into a Date object
	function getSelectedDateTime(): Date {
		const [year, month, day] = dateValue.split('-').map(Number);
		const [hours, minutes] = timeValue.split(':').map(Number);
		return new Date(year, month - 1, day, hours, minutes);
	}

	// Quick time presets
	function setToNow() {
		const now = new Date();
		dateValue = formatDateForInput(now);
		timeValue = formatTimeForInput(now);
	}

	function addOneDay() {
		const current = getSelectedDateTime();
		current.setDate(current.getDate() + 1);
		dateValue = formatDateForInput(current);
		timeValue = formatTimeForInput(current);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		let price: number;

		if (priceInputMode === 'coin') {
			price = parseFloat(newPrice);
		} else {
			// Convert wallet value to coin price
			const walletValue = parseFloat(newPrice);
			if (currentBalance <= 0) {
				showMessage('❌ Geen saldo beschikbaar om te converteren');
				return;
			}
			price = walletValue / currentBalance;
		}

		if (isNaN(price) || price < 0) {
			showMessage('❌ Voer een geldig bedrag in');
			return;
		}

		const priceDate = getSelectedDateTime();

		try {
			await addPrice.mutateAsync({ price, priceDate });
			const displayValue =
				priceInputMode === 'coin'
					? `€ ${price.toFixed(2)}`
					: `€ ${parseFloat(newPrice).toFixed(2)} (wallet) → € ${price.toFixed(2)} per coin`;
			showMessage(`✅ Prijs ${displayValue} toegevoegd!`);
			// newPrice = '';
			// addOneDay();
		} catch (err) {
			showMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('Weet je zeker dat je deze prijs wilt verwijderen?')) return;

		try {
			await deletePrice.mutateAsync(id);
			showMessage('✅ Verwijderd');
		} catch (err) {
			showMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	// Sort prices by date descending for display (newest first)
	const sortedPrices = $derived(
		[...(priceQuery.data ?? [])].sort(
			(a, b) => new Date(b.price_date).getTime() - new Date(a.price_date).getTime()
		)
	);

	// Count future prices
	const futurePricesCount = $derived(
		sortedPrices.filter((p) => new Date(p.price_date) > new Date()).length
	);

	function isFuture(dateStr: string): boolean {
		return new Date(dateStr) > new Date();
	}

	// Random range settings
	let randomMinMinutes = $state(5);
	let randomMaxMinutes = $state(30);
	let randomMinPriceChange = $state(-0.5);
	let randomMaxPriceChange = $state(1);
	let randomMinPrice = $state(1);
	let randomMaxPrice = $state(10);

	// Time presets
	function addMinutes(mins: number) {
		const current = getSelectedDateTime();
		current.setMinutes(current.getMinutes() + mins);
		dateValue = formatDateForInput(current);
		timeValue = formatTimeForInput(current);
	}

	function addRandomTime() {
		const mins = Math.floor(
			Math.random() * (randomMaxMinutes - randomMinMinutes + 1) + randomMinMinutes
		);
		addMinutes(mins);
	}

	// Convert price input value between modes
	function togglePriceInputMode() {
		const currentValue = parseFloat(newPrice) || 0;

		if (priceInputMode === 'coin') {
			// Switching from coin price to wallet value
			const walletValue = currentValue * currentBalance;
			newPrice = walletValue.toFixed(2);
			priceInputMode = 'wallet';
		} else {
			// Switching from wallet value to coin price
			if (currentBalance > 0) {
				const coinPrice = currentValue / currentBalance;
				newPrice = coinPrice.toFixed(2);
			} else {
				newPrice = '';
			}
			priceInputMode = 'coin';
		}
	}

	// Price presets
	function adjustPrice(amount: number) {
		const current = parseFloat(newPrice) || 0;
		if (priceInputMode === 'coin') {
			newPrice = Math.max(0, current + amount).toFixed(2);
		} else {
			// In wallet mode, adjust the wallet value
			newPrice = Math.max(0, current + amount).toFixed(2);
		}
	}

	function addRandomPriceChange() {
		const change =
			Math.random() * (randomMaxPriceChange - randomMinPriceChange) + randomMinPriceChange;
		adjustPrice(change);
	}

	function setRandomPrice() {
		const price = Math.random() * (randomMaxPrice - randomMinPrice) + randomMinPrice;
		newPrice = price.toFixed(2);
	}

	let { data, form } = $props();

	let password = $state('');
	let showPassword = $state(false);

	// Current balance for calculations
	const currentBalance = $derived(walletQuery.data?.kcry_balance ?? 0);

	// Get latest price for wallet value calculations
	const latestPrice = $derived.by(() => {
		if (!priceQuery.data?.length) return 0;
		const now = new Date();
		const prices = priceQuery.data
			.map((item: any) => ({
				date: new Date(item.price_date),
				price: item.price
			}))
			.filter((p: { date: Date; price: number }) => p.date <= now)
			.sort(
				(a: { date: Date; price: number }, b: { date: Date; price: number }) =>
					b.date.getTime() - a.date.getTime()
			);
		return prices[0]?.price ?? 0;
	});

	// Sync input when wallet data loads or mode changes
	$effect(() => {
		if (walletQuery.data) {
			if (walletInputMode === 'kry') {
				if (!walletInput || walletInput === '0') {
					walletInput = walletQuery.data.kcry_balance.toString();
				}
			} else {
				// € mode - calculate wallet value
				const walletValue = currentBalance * latestPrice;
				if (!walletInput || walletInput === '0') {
					walletInput = walletValue.toFixed(2);
				}
			}
		}
	});

	// Convert input value between modes
	function toggleInputMode() {
		const currentValue = parseFloat(walletInput) || 0;

		if (walletInputMode === 'kry') {
			// Switching from KCRY to €
			const walletValue = currentValue * latestPrice;
			walletInput = walletValue.toFixed(2);
			walletInputMode = 'eur';
		} else {
			// Switching from € to KCRY
			if (latestPrice > 0) {
				const kryAmount = currentValue / latestPrice;
				walletInput = kryAmount.toFixed(8);
			} else {
				walletInput = currentBalance.toString();
			}
			walletInputMode = 'kry';
		}
	}

	// Wallet actions
	function adjustBalance(amount: number) {
		const current = parseFloat(walletInput) || 0;
		if (walletInputMode === 'kry') {
			walletInput = Math.max(0, current + amount).toFixed(8);
		} else {
			// In € mode, adjust the wallet value
			walletInput = Math.max(0, current + amount).toFixed(2);
		}
	}

	async function handleWalletUpdate() {
		let balance: number;

		if (walletInputMode === 'kry') {
			balance = parseFloat(walletInput);
		} else {
			// Convert € to KCRY
			const walletValue = parseFloat(walletInput);
			if (latestPrice <= 0) {
				showMessage('❌ Geen prijs beschikbaar om te converteren');
				return;
			}
			balance = walletValue / latestPrice;
		}

		if (isNaN(balance) || balance < 0) {
			showMessage('❌ Voer een geldig aantal in');
			return;
		}

		try {
			await updateWallet.mutateAsync(balance);
			const displayValue =
				walletInputMode === 'kry'
					? `${balance.toFixed(4)} KCRY`
					: `€ ${(balance * latestPrice).toFixed(2).replace('.', ',')}`;
			showMessage(`✅ Saldo bijgewerkt naar ${displayValue}`);
		} catch (err) {
			showMessage(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}
</script>

{#if !data.authenticated}
	<!-- Login gate -->
	<div class="flex min-h-screen items-center justify-center bg-gray-100 px-4">
		<div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
			<div class="mb-6 text-center">
				<span class="text-4xl">👑</span>
				<h1 class="mt-2 text-xl font-bold text-gray-900">KingCryps Admin</h1>
				<p class="text-sm text-gray-500">Voer het wachtwoord in</p>
			</div>

			<form method="POST" action="?/login" use:enhance class="space-y-4">
				<div>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							name="password"
							bind:value={password}
							placeholder="Wachtwoord"
							class="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
							required
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							{showPassword ? '🙈' : '👁️'}
						</button>
					</div>
					{#if form?.incorrect}
						<p class="mt-2 text-sm text-red-600">❌ Onjuist wachtwoord</p>
					{/if}
				</div>

				<button
					type="submit"
					class="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
				>
					Inloggen
				</button>
			</form>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-100">
		<div class="mx-auto max-w-2xl px-4 py-8">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-2xl font-bold text-gray-900">KingCryps Admin</h1>
				<p class="mt-1 text-gray-600">Beheer de koers van KingCryps</p>
				<a href="/" class="text-sm text-blue-600 hover:underline">← Terug naar dashboard</a>
			</div>

			<!-- Add new price -->
			<div class="mb-6 rounded-xl bg-white p-6 shadow-sm">
				<h2 class="mb-4 font-semibold text-gray-900">💰 Nieuwe prijs toevoegen</h2>

				<form onsubmit={handleSubmit} class="space-y-4">
					<!-- Price input -->
					<div>
						<div class="mb-2 flex items-center justify-between">
							<label for="price" class="block text-sm font-medium text-gray-700">Prijs</label>
							<!-- Toggle between coin price and wallet value -->
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => {
										if (priceInputMode !== 'coin') togglePriceInputMode();
									}}
									class="rounded-md px-3 py-1 text-xs font-medium transition-colors
										{priceInputMode === 'coin'
										? 'bg-gray-900 text-white'
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
								>
									Per coin
								</button>
								<button
									type="button"
									onclick={() => {
										if (priceInputMode !== 'wallet') togglePriceInputMode();
									}}
									class="rounded-md px-3 py-1 text-xs font-medium transition-colors
										{priceInputMode === 'wallet'
										? 'bg-gray-900 text-white'
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
								>
									Wallet waarde
								</button>
							</div>
						</div>
						<div class="relative">
							<span class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">€</span>
							<input
								id="price"
								type="number"
								step="0.01"
								min="0"
								bind:value={newPrice}
								placeholder={priceInputMode === 'coin' ? '1.23' : '123.00'}
								class="w-full rounded-lg border border-gray-300 py-3 pr-4 pl-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								disabled={addPrice.isPending}
							/>
						</div>
						{#if priceInputMode === 'wallet'}
							<p class="mt-1 text-xs text-gray-500">
								Huidige saldo: € {(currentBalance * latestPrice).toFixed(2).replace('.', ',')}
							</p>
						{/if}
					</div>

					<!-- Date/Time inputs -->
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="date" class="mb-1 block text-sm font-medium text-gray-700">Datum</label>
							<input
								id="date"
								type="date"
								bind:value={dateValue}
								class="w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								disabled={addPrice.isPending}
							/>
						</div>
						<div>
							<label for="time" class="mb-1 block text-sm font-medium text-gray-700">Tijd</label>
							<input
								id="time"
								type="time"
								bind:value={timeValue}
								class="w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
								disabled={addPrice.isPending}
							/>
						</div>
					</div>

					<!-- Quick presets -->
					<div class="space-y-4">
						<!-- Time presets -->
						<div>
							<label class="mb-1.5 block text-sm font-medium text-gray-700">Tijd aanpassen</label>
							<div class="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onclick={setToNow}
									class="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
								>
									Nu
								</button>
								<button
									type="button"
									onclick={() => addMinutes(5)}
									class="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
								>
									+5 min
								</button>
								<button
									type="button"
									onclick={() => addMinutes(15)}
									class="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
								>
									+15 min
								</button>
								<button
									type="button"
									onclick={() => addMinutes(60)}
									class="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
								>
									+1 uur
								</button>
								<button
									type="button"
									onclick={addRandomTime}
									class="rounded-md bg-purple-100 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-200"
								>
									+🎲
								</button>
								<div class="flex items-center gap-1 text-xs text-gray-500">
									<input
										type="number"
										bind:value={randomMinMinutes}
										class="w-12 rounded border border-gray-300 px-1.5 py-1 text-center text-xs"
										min="1"
									/>
									<span>-</span>
									<input
										type="number"
										bind:value={randomMaxMinutes}
										class="w-12 rounded border border-gray-300 px-1.5 py-1 text-center text-xs"
										min="1"
									/>
									<span>min</span>
								</div>
							</div>
						</div>

						<!-- Price adjustment presets -->
						<div>
							<label class="mb-1.5 block text-sm font-medium text-gray-700">Prijs aanpassen</label>
							<div class="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onclick={() => adjustPrice(-1)}
									class="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
								>
									-€1
								</button>
								<button
									type="button"
									onclick={() => adjustPrice(-0.5)}
									class="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
								>
									-€0,50
								</button>
								<button
									type="button"
									onclick={() => adjustPrice(0.1)}
									class="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
								>
									+10ct
								</button>
								<button
									type="button"
									onclick={() => adjustPrice(0.5)}
									class="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
								>
									+50ct
								</button>
								<button
									type="button"
									onclick={() => adjustPrice(1)}
									class="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
								>
									+€1
								</button>
								<button
									type="button"
									onclick={addRandomPriceChange}
									class="rounded-md bg-purple-100 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-200"
								>
									±🎲
								</button>
								<div class="flex items-center gap-1 text-xs text-gray-500">
									<input
										type="number"
										bind:value={randomMinPriceChange}
										step="0.1"
										class="w-14 rounded border border-gray-300 px-1.5 py-1 text-center text-xs"
									/>
									<span>-</span>
									<input
										type="number"
										bind:value={randomMaxPriceChange}
										step="0.1"
										class="w-14 rounded border border-gray-300 px-1.5 py-1 text-center text-xs"
									/>
									<span>€</span>
								</div>
							</div>
						</div>

						<!-- Random price (absolute) -->
						<div>
							<label class="mb-1.5 block text-sm font-medium text-gray-700"
								>Willekeurige prijs</label
							>
							<div class="flex flex-wrap items-center gap-2">
								<button
									type="button"
									onclick={setRandomPrice}
									class="rounded-md bg-purple-100 px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-200"
								>
									🎲 Genereer prijs
								</button>
								<div class="flex items-center gap-1 text-xs text-gray-500">
									<span>€</span>
									<input
										type="number"
										bind:value={randomMinPrice}
										step="1"
										min="0"
										class="w-16 rounded border border-gray-300 px-1.5 py-1 text-center text-xs"
									/>
									<span>-</span>
									<span>€</span>
									<input
										type="number"
										bind:value={randomMaxPrice}
										step="1"
										min="0"
										class="w-16 rounded border border-gray-300 px-1.5 py-1 text-center text-xs"
									/>
								</div>
							</div>
						</div>
					</div>

					<!-- Submit -->
					<button
						type="submit"
						disabled={addPrice.isPending}
						class="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{addPrice.isPending ? 'Bezig...' : 'Toevoegen'}
					</button>
				</form>

				{#if message}
					<p class="mt-3 text-sm {message.startsWith('✅') ? 'text-green-600' : 'text-red-600'}">
						{message}
					</p>
				{/if}
			</div>

			<!-- Wallet Management Section -->
			<div class="mb-6 rounded-xl bg-white p-6 shadow-sm">
				<h2 class="mb-4 font-semibold text-gray-900">💰 Wallet beheren</h2>

				{#if walletQuery.isPending}
					<p class="text-gray-500">Laden...</p>
				{:else if walletQuery.isError}
					<p class="text-red-500">Error: {walletQuery.error?.message}</p>
				{:else}
					<div class="space-y-4">
						<!-- Current balance display -->
						<div class="rounded-lg bg-gray-50 p-4">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm text-gray-500">Huidig saldo</p>
									<p class="text-2xl font-bold text-gray-900">
										{currentBalance.toFixed(4)} <span class="text-lg text-gray-500">KCRY</span>
									</p>
								</div>
								{#if latestPrice > 0}
									<div class="text-right">
										<p class="text-sm text-gray-500">Waarde</p>
										<p class="text-2xl font-bold text-green-600">
											€ {(currentBalance * latestPrice).toFixed(2).replace('.', ',')}
										</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Balance input -->
						<div>
							<div class="mb-2 flex items-center justify-between">
								<label for="wallet" class="block text-sm font-medium text-gray-700">
									Nieuw saldo
								</label>
								<!-- Toggle between KCRY and € -->
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => {
											if (walletInputMode !== 'kry') toggleInputMode();
										}}
										class="rounded-md px-3 py-1 text-xs font-medium transition-colors
											{walletInputMode === 'kry'
											? 'bg-gray-900 text-white'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
									>
										KCRY
									</button>
									<button
										type="button"
										onclick={() => {
											if (walletInputMode !== 'eur') toggleInputMode();
										}}
										class="rounded-md px-3 py-1 text-xs font-medium transition-colors
											{walletInputMode === 'eur'
											? 'bg-gray-900 text-white'
											: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
									>
										€
									</button>
								</div>
							</div>
							<div class="flex gap-2">
								<div class="relative flex-1">
									<input
										id="wallet"
										type="number"
										step={walletInputMode === 'kry' ? '0.0001' : '0.01'}
										min="0"
										bind:value={walletInput}
										placeholder={walletInputMode === 'kry' ? '28.3783' : '2950.00'}
										class="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
										disabled={updateWallet.isPending}
									/>
									<span class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
										{walletInputMode === 'kry' ? 'KCRY' : '€'}
									</span>
								</div>
								<button
									type="button"
									onclick={handleWalletUpdate}
									disabled={updateWallet.isPending}
									class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{updateWallet.isPending ? '...' : 'Opslaan'}
								</button>
							</div>
						</div>

						<!-- Quick adjust buttons -->
						<div>
							<label class="mb-1.5 block text-sm font-medium text-gray-700">Snel aanpassen</label>
							<div class="flex flex-wrap gap-2">
								<button
									type="button"
									onclick={() => adjustBalance(-5)}
									class="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
								>
									-5
								</button>
								<button
									type="button"
									onclick={() => adjustBalance(-1)}
									class="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
								>
									-1
								</button>
								<button
									type="button"
									onclick={() => adjustBalance(1)}
									class="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
								>
									+1
								</button>
								<button
									type="button"
									onclick={() => adjustBalance(5)}
									class="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
								>
									+5
								</button>
								<button
									type="button"
									onclick={() => adjustBalance(10)}
									class="rounded-md bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
								>
									+10
								</button>
							</div>
						</div>

						<!-- Story hint -->
						<p class="text-xs text-gray-400">
							💡 Tip: Verlaag het saldo als je "verkoopt", verhoog als je "koopt"
						</p>
					</div>
				{/if}
			</div>

			<!-- Chart -->
			<PriceChart showFuture={true} />

			<!-- Price history -->
			<div class="rounded-xl bg-white p-6 shadow-sm">
				<h2 class="mb-4 font-semibold text-gray-900">📊 Prijsgeschiedenis</h2>

				{#if priceQuery.isPending}
					<p class="text-gray-500">Laden...</p>
				{:else if priceQuery.isError}
					<p class="text-red-500">Error: {priceQuery.error?.message}</p>
				{:else if sortedPrices.length === 0}
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
								{#each sortedPrices as item (item.id)}
									<tr class="border-b border-gray-100 hover:bg-gray-50">
										<td class="px-2 py-3 text-sm text-gray-600">
											<span class="flex items-center gap-2">
												{formatDisplayDate(item.price_date)}
												{#if isFuture(item.price_date)}
													<span class="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
														Gepland
													</span>
												{/if}
											</span>
										</td>
										<td class="px-2 py-3 text-right font-mono text-sm font-medium text-gray-900">
											€ {parseFloat(String(item.price)).toFixed(2).replace('.', ',')}
										</td>
										<td class="px-2 py-3 text-right">
											<button
												onclick={() => handleDelete(item.id)}
												disabled={deletePrice.isPending}
												class="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
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
						{sortedPrices.length} prijzen totaal
						{#if futurePricesCount > 0}
							· {futurePricesCount} gepland
						{/if}
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
