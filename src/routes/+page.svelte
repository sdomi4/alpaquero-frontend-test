<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_WS_BASE } from '$env/static/public';
	import type { PageData } from './$types';
    import GenericDeviceBlock from '$lib/components/devices/GenericDeviceBlock.svelte';
    import FilterWheelBlock from '$lib/components/devices/FilterWheelBlock.svelte';
    import SequencePanel from '$lib/components/sequences/SequencePanel.svelte';

	let { data }: { data: PageData } = $props();

    type DeviceState = {
        id: string;
        type?: string;
        name?: string | null;
        connected: boolean;
        status?: string;
        state: Record<string, unknown>;
    };

    type ActiveSequence = {
        context_id: string;
        sequence_name: string;
        status: string;
    };

let liveSequences = $state<Record<string, ActiveSequence>>({});

	let liveDevices = $state<Record<string, DeviceState>>({});
	let wsStatus = $state<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

    const mergedDevices = $derived(
        data.devices.map((device) => {
            const live = liveDevices[device.id];
            const connected = Boolean(live?.connected);

            return {
                ...device,
                connected,
                status: connected ? (live?.status ?? 'unknown') : 'disconnected',
                state: connected ? live?.state : null,
                live
            };
        })
    );

	function formatValue(value: unknown) {
		if (value === null) return 'null';
		if (value === undefined) return '—';
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

    function handleLifecycleComplete(deviceId: string, action: 'startup' | 'shutdown') {
        if (action !== 'shutdown') return;

        const next = { ...liveDevices };
        delete next[deviceId];
        liveDevices = next;
    }

	onMount(() => {
		const ws = new WebSocket(`${PUBLIC_WS_BASE}/ws/state`);

		ws.onopen = () => {
			wsStatus = 'connected';
		};

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                console.log('Received websocket message:', payload);
                const devices = payload.devices ?? {};
                liveSequences = payload.sequences ?? {};

                liveDevices = Object.fromEntries(
                    Object.entries(devices).map(([id, raw]) => {
                        const device = raw as Record<string, unknown>;

                        const {
                            id: _ignoredId,
                            device_type,
                            type,
                            name,
                            connected,
                            status,
                            ...state
                        } = device;

                        return [
                            id,
                            {
                                id,
                                type: String(device_type ?? type ?? ''),
                                name: typeof name === 'string' ? name : null,
                                connected: Boolean(connected),
                                status: String(status ?? 'unknown'),
                                state
                            }
                        ];
                    })
                );
            } catch (error) {
                console.error('Invalid websocket payload:', error);
                wsStatus = 'error';
            }
        };

		ws.onerror = () => {
			wsStatus = 'error';
		};

		ws.onclose = () => {
			wsStatus = 'disconnected';
		};

		return () => ws.close();
	});
</script>

<svelte:head>
	<title>Alpaquero / Arriero</title>
</svelte:head>

<main class="min-h-screen bg-neutral-950 p-4 text-neutral-100">
    <section
        class="mb-4 border-4 border-neutral-100 bg-fuchsia-500 p-4 text-neutral-950 shadow-[8px_8px_0_#fbbf24]"
    >
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <p class="text-xs font-black uppercase tracking-[0.35em] text-yellow-200">
                    Observatory Control
                </p>
                <h1 class="text-4xl font-black uppercase leading-none md:text-6xl">
                    Alpaquero / Arriero
                </h1>
            </div>

            <div class="flex flex-wrap gap-2 font-mono text-sm uppercase">
                <span class="border-4 border-neutral-950 bg-yellow-300 px-3 py-1">
                    ws: {wsStatus}
                </span>

                <span class="border-4 border-neutral-950 bg-yellow-300 px-3 py-1">
                    devices: {mergedDevices.length}
                </span>
            </div>
        </div>
    </section>

	{#if data.error}
		<section class="mb-4 border-4 border-red-500 bg-red-950 p-4 text-red-100 shadow-[8px_8px_0_#ef4444]">
			<p class="font-black uppercase">Backend unavailable</p>
			<p class="font-mono">{data.error}</p>
		</section>
	{/if}

	<section class="grid gap-4 xl:grid-cols-[2fr_1fr]">
		<section class="border-4 border-neutral-100 bg-neutral-900 p-4 shadow-[8px_8px_0_#525252]">
			<div class="mb-4 flex items-end justify-between gap-4 border-b-4 border-neutral-100 pb-2">
				<div>
					<p class="font-mono text-xs uppercase text-neutral-400">Configured hardware</p>
					<h2 class="text-2xl font-black uppercase">Devices</h2>
				</div>

				<p class="font-mono text-sm">
					{mergedDevices.filter((device) => device.connected).length}/{mergedDevices.length} online
				</p>
			</div>

			{#if mergedDevices.length === 0}
				<p class="font-mono text-neutral-400">No configured devices reported by backend.</p>
			{:else}
				<div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                    {#each mergedDevices as device}
                        {#if device.type === 'filterwheel'}
                            <FilterWheelBlock {device} onLifecycleComplete={handleLifecycleComplete} />
                        {:else}
                            <GenericDeviceBlock {device} onLifecycleComplete={handleLifecycleComplete} />
                        {/if}
                    {/each}
				</div>
			{/if}
		</section>

		<aside class="grid content-start gap-4">
			<section class="border-4 border-neutral-100 bg-neutral-900 p-4 shadow-[8px_8px_0_#525252]">
                <SequencePanel availableSequences={data.sequences} activeSequences={liveSequences} />
			</section>
		</aside>
	</section>
</main>