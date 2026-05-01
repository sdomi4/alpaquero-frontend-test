<script lang="ts">
	import DeviceShell from './DeviceShell.svelte';
	import { moveFilterWheel } from '$lib/api/observatory';

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

	let targetPosition = $state(0);
	let pending = $state(false);
	let error = $state<string | null>(null);

	const currentPosition = $derived(
		Number(
			device.state?.position ??
				device.state?.filter_position ??
				device.state?.filterPosition ??
				device.state?.Position ??
				NaN
		)
	);

    const positionLabel = $derived(
        currentPosition === -1 ? 'moving' : Number.isNaN(currentPosition) ? '—' : String(currentPosition)
    );

	const filterNames = $derived(
		Array.isArray(device.state?.names)
			? (device.state.names as unknown[]).map(String)
			: Array.isArray(device.state?.filter_names)
				? (device.state.filter_names as unknown[]).map(String)
				: []
	);

	const positionCount = $derived(filterNames.length > 0 ? filterNames.length : 8);

	async function moveToPosition(position: number) {
		if (pending || !device.connected) return;

		pending = true;
		error = null;

		try {
			await moveFilterWheel(device.id, position);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Filter wheel move failed';
		} finally {
			pending = false;
		}
	}
</script>

<DeviceShell {device} {onLifecycleComplete} showStatus={false}>
	<div class="grid gap-3">
        <div class="border-2 border-neutral-600 bg-neutral-900 p-2">
            <p class="text-xs uppercase text-neutral-400">Current</p>
            <p class="text-2xl font-black">
                {positionLabel}
            </p>
        </div>

        <div class="border-2 border-neutral-600 bg-neutral-900 p-2">
            <p class="text-xs uppercase text-neutral-400">Target</p>
            <input
                type="number"
                min="0"
                max={positionCount - 1}
                bind:value={targetPosition}
                disabled={!device.connected || pending || currentPosition === -1}
                class="mt-1 w-full border-2 border-neutral-500 bg-neutral-950 px-2 py-1 font-mono text-xl font-black text-neutral-100 outline-none focus:border-neutral-100"
            />
        </div>

        <button
            type="button"
            disabled={!device.connected || pending || currentPosition === -1}
            onclick={() => moveToPosition(targetPosition)}
            class="border-4 border-neutral-100 bg-neutral-800 px-3 py-2 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
        >
            {pending || currentPosition === -1 ? 'moving' : 'move wheel'}
        </button>

		<div class="grid grid-cols-2 gap-2">
			{#each Array.from({ length: positionCount }) as _, position}
                <button
                    type="button"
                    disabled={!device.connected || pending || currentPosition === -1}
                    onclick={() => moveToPosition(position)}
                    class="border-2 border-neutral-500 px-2 py-2 text-left font-mono text-sm font-black uppercase shadow-[3px_3px_0_#525252] transition-transform hover:border-neutral-100 hover:bg-neutral-800 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-800 disabled:text-neutral-600 disabled:shadow-none disabled:hover:bg-neutral-950"
                    class:border-yellow-300={position === currentPosition}
                    class:bg-yellow-300={position === currentPosition}
                    class:text-neutral-950={position === currentPosition}
                    class:bg-neutral-950={position !== currentPosition}
                    class:text-neutral-200={position !== currentPosition}
                >
                    <span class="block text-xs opacity-70">pos {position}</span>
                    <span>{filterNames[position] ?? `Filter ${position}`}</span>
                </button>
			{/each}
		</div>

		{#if error}
			<p class="border-2 border-red-500 bg-red-950 p-2 font-mono text-sm text-red-100">
				{error}
			</p>
		{/if}
	</div>
</DeviceShell>