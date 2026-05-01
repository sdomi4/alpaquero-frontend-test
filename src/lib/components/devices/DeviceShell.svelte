<script lang="ts">
	import type { Snippet } from 'svelte';
	import { runDeviceLifecycleAction } from '$lib/api/observatory';

	type Device = {
		id: string;
		type: string;
		name: string;
		connected: boolean;
		status?: string;
	};

    type Props = {
        device: Device;
        children?: Snippet;
        onLifecycleComplete?: (deviceId: string, action: 'startup' | 'shutdown') => void;
        showStatus?: boolean;
    };

    let { device, children, onLifecycleComplete, showStatus = true }: Props = $props();

	let pending = $state(false);
	let error = $state<string | null>(null);

	const displayStatus = $derived(device.connected ? (device.status ?? 'unknown') : 'disconnected');

	async function toggleConnection() {
		if (pending) return;

		pending = true;
		error = null;

		try {
        const action = device.connected ? 'shutdown' : 'startup';

        await runDeviceLifecycleAction(device.type, device.id, action);

        onLifecycleComplete?.(device.id, action);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Device action failed';
		} finally {
			pending = false;
		}
	}
</script>

<article
	class="border-4 border-neutral-100 bg-neutral-950 p-3 shadow-[5px_5px_0_#f5f5f5]"
	class:opacity-60={!device.connected}
>
	<header class="mb-3 flex items-start justify-between gap-3">
		<div>
			<p class="font-mono text-xs uppercase text-neutral-400">{device.type}</p>

			<h3 class="text-xl font-black uppercase leading-tight">
				{device.name}
			</h3>

			<p class="mt-1 font-mono text-xs text-neutral-500">{device.id}</p>
		</div>

		<button
			type="button"
			onclick={toggleConnection}
			disabled={pending}
			class="shrink-0 border-2 border-neutral-100 px-2 py-1 font-mono text-xs font-black uppercase transition-transform active:translate-x-[2px] active:translate-y-[2px]"
			class:bg-green-500={device.connected}
			class:text-neutral-950={device.connected}
			class:bg-red-700={!device.connected}
			class:text-neutral-100={!device.connected}
			class:cursor-wait={pending}
			title={device.connected ? 'Shutdown device' : 'Startup device'}
		>
			{#if pending}
				working
			{:else if device.connected}
				online
			{:else}
				offline
			{/if}
		</button>
	</header>

    {#if showStatus}
        <p class="mb-3 border-2 border-neutral-100 bg-neutral-900 p-2 font-mono text-sm uppercase text-fuchsia-200">
            {displayStatus}
        </p>
    {/if}

	{#if error}
		<p class="mb-3 border-2 border-red-500 bg-red-950 p-2 font-mono text-sm text-red-100">
			{error}
		</p>
	{/if}

	{@render children?.()}
</article>