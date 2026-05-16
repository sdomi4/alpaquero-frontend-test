<script lang="ts">
	import DeviceShell from './DeviceShell.svelte';
    import { closeCover, openCover, turnCalibratorOff, turnCalibratorOn } from '$lib/api/observatory';

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

	let coverPending = $state<'open' | 'close' | null>(null);
	let calibratorPending = $state<'on' | 'off' | null>(null);
	let error = $state<string | null>(null);
	let safetyOverride = $state(false);
	let targetBrightness = $state(100);

	const coverStatus = $derived(Number(device.state?.cover_status ?? NaN));
	const calibratorStatus = $derived(Number(device.state?.calibrator_status ?? NaN));
	const brightness = $derived(Number(device.state?.brightness ?? NaN));

	const coverLabel = $derived(getCoverLabel(coverStatus));
	const calibratorLabel = $derived(getCalibratorLabel(calibratorStatus));

	const coverMoving = $derived(coverStatus === 2);
	const coverClosed = $derived(coverStatus === 1);
	const coverOpen = $derived(coverStatus === 3);
	const coverError = $derived(coverStatus === 5);

	const calibratorOff = $derived(calibratorStatus === 1);
	const calibratorReady = $derived(calibratorStatus === 3);
	const calibratorError = $derived(calibratorStatus === 5);

	function getCoverLabel(value: number) {
		switch (value) {
			case 0:
				return 'not present';
			case 1:
				return 'closed';
			case 2:
				return 'moving';
			case 3:
				return 'open';
			case 4:
				return 'unknown';
			case 5:
				return 'error';
			default:
				return 'unknown';
		}
	}

	function getCalibratorLabel(value: number) {
		switch (value) {
			case 0:
				return 'not present';
			case 1:
				return 'off';
			case 2:
				return 'not ready';
			case 3:
				return 'ready';
			case 4:
				return 'unknown';
			case 5:
				return 'error';
			default:
				return 'unknown';
		}
	}

    function clampBrightness(value: number) {
        return Math.max(0, Math.min(100, Math.round(value)));
    }

	async function runCover(action: 'open' | 'close') {
		if (!device.connected || coverPending || coverMoving) return;

		coverPending = action;
		error = null;

		try {
			if (action === 'open') {
				await openCover(device.id, safetyOverride);
			} else {
				await closeCover(device.id, safetyOverride);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : `Cover ${action} failed`;
		} finally {
			coverPending = null;
		}
	}

    async function setCalibrator(action: 'on' | 'off') {
        if (!device.connected || calibratorPending) return;

        calibratorPending = action;
        error = null;

        try {
            if (action === 'on') {
                await turnCalibratorOn(device.id, clampBrightness(targetBrightness));
            } else {
                await turnCalibratorOff(device.id);
            }
        } catch (err) {
            error = err instanceof Error ? err.message : `Calibrator ${action} failed`;
        } finally {
            calibratorPending = null;
        }
    }
</script>

<DeviceShell {device} {onLifecycleComplete} showStatus={false}>
	<div class="grid gap-3">
		<div class="grid grid-cols-2 gap-2 font-mono">
			<div
				class="border-2 bg-neutral-900 p-3"
				class:border-neutral-500={!coverError}
				class:border-red-500={coverError}
				class:bg-red-950={coverError}
			>
				<p class="text-xs uppercase text-neutral-400">Cover</p>
				<p class="text-2xl font-black uppercase">{coverLabel}</p>
			</div>

			<div
				class="border-2 bg-neutral-900 p-3"
				class:border-neutral-500={!calibratorError}
				class:border-red-500={calibratorError}
				class:bg-red-950={calibratorError}
			>
				<p class="text-xs uppercase text-neutral-400">Calibrator</p>
				<p class="text-2xl font-black uppercase">{calibratorLabel}</p>
			</div>
		</div>

        <div class="grid gap-3 border-2 border-neutral-600 bg-neutral-900 p-3 font-mono">
            <div class="flex items-end justify-between gap-3">
                <div>
                    <p class="text-xs uppercase text-neutral-400">Brightness</p>
                    <p class="text-2xl font-black">
                        {Number.isNaN(brightness) ? '—' : brightness}
                    </p>
                </div>

                <div class="w-24">
                    <label class="text-xs uppercase text-neutral-500" for={`brightness-number-${device.id}`}>
                        Target
                    </label>

                    <input
                        id={`brightness-number-${device.id}`}
                        type="number"
                        min="0"
                        max="100"
                        bind:value={targetBrightness}
                        onchange={() => {
                            targetBrightness = clampBrightness(targetBrightness);
                        }}
                        disabled={!device.connected || calibratorPending !== null}
                        class="mt-1 w-full border-2 border-neutral-500 bg-neutral-950 px-2 py-1 text-neutral-100 outline-none focus:border-neutral-100 disabled:border-neutral-700 disabled:text-neutral-600"
                    />
                </div>
            </div>

            <input
                id={`brightness-slider-${device.id}`}
                type="range"
                min="0"
                max="100"
                step="1"
                bind:value={targetBrightness}
                disabled={!device.connected || calibratorPending !== null}
                class="w-full accent-neutral-200 disabled:opacity-40"
            />

            <p class="text-xs uppercase text-neutral-500">
                Target is applied with Cal On / Update Brightness.
            </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
            <button
                type="button"
                disabled={!device.connected || calibratorPending !== null}
                onclick={() => setCalibrator('on')}
                class="border-4 border-neutral-100 bg-neutral-800 px-3 py-3 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
            >
                {#if calibratorPending === 'on'}
                    setting
                {:else if calibratorReady}
                    update brightness
                {:else}
                    cal on
                {/if}
            </button>

            <button
                type="button"
                disabled={!device.connected || calibratorPending !== null || calibratorOff}
                onclick={() => setCalibrator('off')}
                class="border-4 border-neutral-100 bg-neutral-800 px-3 py-3 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
            >
                {calibratorPending === 'off' ? 'stopping' : 'cal off'}
            </button>
        </div>

		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				disabled={!device.connected || coverPending !== null || coverMoving || coverOpen}
				onclick={() => runCover('open')}
				class="border-4 border-neutral-100 bg-neutral-800 px-3 py-3 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
			>
				{coverPending === 'open' || coverMoving ? 'opening' : 'open'}
			</button>

			<button
				type="button"
				disabled={!device.connected || coverPending !== null || coverMoving || coverClosed}
				onclick={() => runCover('close')}
				class="border-4 border-neutral-100 bg-neutral-800 px-3 py-3 font-mono text-sm font-black uppercase text-neutral-100 shadow-[4px_4px_0_#737373] transition-transform hover:bg-neutral-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:border-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:shadow-none"
			>
				{coverPending === 'close' || coverMoving ? 'closing' : 'close'}
			</button>
		</div>

		<label
			class="flex cursor-pointer items-center justify-between gap-3 border-2 border-neutral-700 bg-neutral-950 p-2 font-mono text-sm"
		>
			<span class="uppercase text-neutral-400">Safety override</span>

			<input type="checkbox" bind:checked={safetyOverride} class="h-5 w-5 accent-red-600" />
		</label>

		{#if error}
			<p class="border-2 border-red-500 bg-red-950 p-2 font-mono text-sm text-red-100">
				{error}
			</p>
		{/if}
	</div>
</DeviceShell>