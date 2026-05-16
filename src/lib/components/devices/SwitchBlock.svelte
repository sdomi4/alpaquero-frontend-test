<script lang="ts">
	import DeviceShell from './DeviceShell.svelte';
	import { getSwitchControls, setSwitchControl } from '$lib/api/observatory';

	type Device = {
		id: string;
		type: string;
		name: string;
		connected: boolean;
		status?: string;
		state: Record<string, unknown> | null;
	};

	type SwitchControlType = 'toggle' | 'range';

	type SwitchControl = {
		id: number;
		label: string;
		description: string;
		writeable: boolean;
		can_async: boolean;
		control_type: SwitchControlType;
		value: boolean | number;
		key: string;
		min_value?: number;
		max_value?: number;
		step?: number;
	};

	type Props = {
		device: Device;
		onLifecycleComplete?: (deviceId: string, action: 'startup' | 'shutdown') => void;
	};

	let { device, onLifecycleComplete }: Props = $props();

	let controls = $state<SwitchControl[]>([]);
	let pending = $state<number | null>(null);
	let error = $state<string | null>(null);
	let controlsLoadedForDevice = $state<string | null>(null);
	let localValues = $state<Record<number, number>>({});

	function normalizeControls(raw: unknown): SwitchControl[] {
		if (!raw || typeof raw !== 'object') return [];

		const controls = (raw as { controls?: unknown }).controls;

		if (!Array.isArray(controls)) return [];

		return controls.map((control) => control as SwitchControl);
	}

	function valueFor(control: SwitchControl) {
		const fromDeviceState =
			device.state?.[control.key] ??
			device.state?.[`switch_${control.id}`] ??
			device.state?.[String(control.id)];

		if (typeof fromDeviceState === 'boolean') return fromDeviceState ? 1 : 0;
		if (typeof fromDeviceState === 'number') return fromDeviceState;

		if (typeof localValues[control.id] === 'number') return localValues[control.id];

		if (typeof control.value === 'boolean') return control.value ? 1 : 0;
		if (typeof control.value === 'number') return control.value;

		return control.control_type === 'toggle' ? 0 : (control.min_value ?? 0);
	}

	function clamp(control: SwitchControl, value: number) {
		const min = control.min_value ?? 0;
		const max = control.max_value ?? 1;
		const cleanValue = Number.isFinite(value) ? value : min;

		return Math.max(min, Math.min(max, cleanValue));
	}

	async function loadControls() {
		if (!device.connected) {
			controls = [];
			return;
		}

		error = null;

		try {
			controls = normalizeControls(await getSwitchControls(device.id));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load switch controls';
		}
	}

	async function setControl(control: SwitchControl, value: number) {
		if (!device.connected || pending !== null || !control.writeable) return;

		const next =
			control.control_type === 'toggle'
				? value > 0
					? 1
					: 0
				: clamp(control, value);

		pending = control.id;
		error = null;

		try {
			await setSwitchControl(device.id, control.id, next);

			localValues = {
				...localValues,
				[control.id]: next
			};
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to set switch';
		} finally {
			pending = null;
		}
	}

	$effect(() => {
		if (!device.connected) {
			controls = [];
			controlsLoadedForDevice = null;
			localValues = {};
			return;
		}

		if (controlsLoadedForDevice === device.id) return;

		controlsLoadedForDevice = device.id;
		loadControls();
	});
</script>

<DeviceShell {device} {onLifecycleComplete} showStatus={false}>
	<div class="grid gap-3">
		{#if !device.connected}
			<div class="border-2 border-dashed border-neutral-700 p-3 font-mono text-sm text-neutral-500">
				Connect switch device to load controls.
			</div>
		{:else if controls.length === 0}
			<div class="border-2 border-dashed border-neutral-700 p-3 font-mono text-sm text-neutral-500">
				No switch controls reported.
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
				{#each controls as control}
					{@const value = valueFor(control)}
					{@const active = value > 0}

					<div
						class="border-2 border-neutral-600 bg-neutral-950 p-2 font-mono shadow-[3px_3px_0_#525252]"
						class:border-amber-300={control.control_type === 'toggle' && active}
					>
						<div class="mb-2 flex items-start justify-between gap-2">
							<div class="min-w-0">
								<p class="truncate text-xs font-black uppercase">
									{control.label}
								</p>

								{#if control.description}
									<p class="mt-1 truncate text-[0.7rem] text-neutral-500">
										{control.description}
									</p>
								{/if}

								<p class="mt-1 text-[0.65rem] uppercase text-neutral-600">
									switch {control.id} · {control.control_type}
									{#if control.control_type === 'range'}
										· {control.min_value ?? 0}–{control.max_value ?? 1}
									{/if}
								</p>
							</div>

							<span
								class="shrink-0 border-2 border-neutral-500 px-2 py-1 text-[0.65rem] font-black uppercase"
							>
								{pending === control.id ? 'work' : value}
							</span>
						</div>

						{#if control.control_type === 'toggle'}
							<button
								type="button"
								disabled={pending !== null || !control.writeable}
								onclick={() => setControl(control, active ? 0 : 1)}
								class="w-full border-2 border-neutral-100 px-2 py-2 text-left text-xs font-black uppercase shadow-[3px_3px_0_#525252] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
								class:bg-amber-300={active}
								class:text-neutral-950={active}
								class:bg-neutral-800={!active}
								class:text-neutral-100={!active}
							>
								{pending === control.id ? 'working' : active ? 'on' : 'off'}
							</button>
						{:else}
							<div class="grid gap-2">
								<input
									type="range"
									min={control.min_value ?? 0}
									max={control.max_value ?? 1}
									step={control.step ?? 1}
									value={value}
									disabled={pending !== null || !control.writeable}
									onchange={(event) => setControl(control, Number(event.currentTarget.value))}
									class="w-full accent-neutral-200 disabled:opacity-40"
								/>

								<div class="flex items-center gap-2">
									<input
										type="number"
										min={control.min_value ?? 0}
										max={control.max_value ?? 1}
										step={control.step ?? 1}
										value={value}
										disabled={pending !== null || !control.writeable}
										onchange={(event) => setControl(control, Number(event.currentTarget.value))}
										class="w-full border-2 border-neutral-600 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-neutral-100 disabled:text-neutral-600"
									/>

									<button
										type="button"
										disabled={pending !== null || !control.writeable}
										onclick={() => setControl(control, value)}
										class="border-2 border-neutral-100 bg-neutral-800 px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0_#525252] hover:bg-neutral-700 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:text-neutral-600 disabled:shadow-none"
									>
										set
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if error}
			<p class="border-2 border-red-500 bg-red-950 p-2 font-mono text-sm text-red-100">
				{error}
			</p>
		{/if}
	</div>
</DeviceShell>