<script lang="ts">
	import DeviceShell from './DeviceShell.svelte';

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

	function formatValue(value: unknown) {
		if (value === null) return 'null';
		if (value === undefined) return '—';
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<DeviceShell {device} {onLifecycleComplete}>
	{#if device.connected && device.state}
		<dl class="grid gap-2 font-mono text-sm">
			{#each Object.entries(device.state) as [key, value]}
				<div class="flex justify-between gap-3 border-b border-neutral-700 pb-1">
					<dt class="text-neutral-400">{key}</dt>
					<dd class="max-w-[55%] overflow-hidden text-ellipsis text-right">
						{formatValue(value)}
					</dd>
				</div>
			{/each}
		</dl>
	{:else}
		<div class="border-2 border-dashed border-neutral-700 p-3 font-mono text-sm text-neutral-500">
			No live state received.
		</div>
	{/if}
</DeviceShell>