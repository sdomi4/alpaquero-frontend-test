<script lang="ts">
	import DeviceShell from './DeviceShell.svelte';
	import { closeDome, openDome } from '$lib/api/observatory';

	type Device = {
		id: string;
		type: string;
		name: string;
		connected: boolean;
		status?: string;
		state: Record<string, unknown> | null;
	};

	type Props = {
		device: Device;
		onLifecycleComplete?: (deviceId: string, action: 'startup' | 'shutdown') => void;
	};

	let { device, onLifecycleComplete }: Props = $props();

	let pending = $state<'open' | 'close' | null>(null);
	let error = $state<string | null>(null);
	let safetyOverride = $state(false);

	const shutterStatus = $derived(Number(device.state?.shutter_status ?? device.status ?? NaN));

	const shutterLabel = $derived(getShutterLabel(shutterStatus));

	const isMoving = $derived(shutterStatus === 2 || shutterStatus === 3);
	const isOpen = $derived(shutterStatus === 0);
	const isClosed = $derived(shutterStatus === 1);
	const hasError = $derived(shutterStatus === 4);

	function getShutterLabel(value: number) {
		switch (value) {
			case 0:
				return 'open';
			case 1:
				return 'closed';
			case 2:
				return 'opening';
			case 3:
				return 'closing';
			case 4:
				return 'error';
			default:
				return 'unknown';
		}
	}

	async function run(action: 'open' | 'close') {
		if (!device.connected || pending || isMoving) return;

		pending = action;
		error = null;

		try {
			if (action === 'open') {
				await openDome(device.id, safetyOverride);
			} else {
				await closeDome(device.id, safetyOverride);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : `Dome ${action} failed`;
		} finally {
			pending = null;
		}
	}
</script>

<DeviceShell {device} {onLifecycleComplete} showStatus={false}>
	<div class="grid gap-3">
		<div
			class="border-2 bg-neutral-900 p-3 font-mono"
			class:border-neutral-500={!hasError}
			class:border-red-500={hasError}
			class:bg-red-950={hasError}
		>
			<p class="text-xs uppercase text-neutral-400">Shutter</p>
			<p class="text-3xl font-black uppercase">
				{shutterLabel}
			</p>
		</div>

		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				disabled={!device.connected || pending !== null || isMoving || isOpen}
				onclick={() => run('open')}
				class="border-4 border-neutral-100 bg-neutral-800 px-3 py-3 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
			>
				{pending === 'open' || shutterStatus === 2 ? 'opening' : 'open'}
			</button>

			<button
				type="button"
				disabled={!device.connected || pending !== null || isMoving || isClosed}
				onclick={() => run('close')}
				class="border-4 border-neutral-100 bg-neutral-800 px-3 py-3 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
			>
				{pending === 'close' || shutterStatus === 3 ? 'closing' : 'close'}
			</button>
		</div>

		<label
			class="flex cursor-pointer items-center justify-between gap-3 border-2 border-neutral-700 bg-neutral-950 p-2 font-mono text-sm"
		>
			<span class="uppercase text-neutral-400">Safety override</span>

			<input
				type="checkbox"
				bind:checked={safetyOverride}
				class="h-5 w-5 accent-red-600"
			/>
		</label>

		{#if error}
			<p class="border-2 border-red-500 bg-red-950 p-2 font-mono text-sm text-red-100">
				{error}
			</p>
		{/if}
	</div>
</DeviceShell>