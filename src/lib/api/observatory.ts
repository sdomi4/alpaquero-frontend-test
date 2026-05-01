import { PUBLIC_API_BASE } from '$env/static/public';

const DEVICE_ENDPOINTS: Record<string, string> = {
	dome: 'dome',
	telescope: 'telescope',
	camera: 'camera',
	cover: 'cover',
	filterwheel: 'filterwheel',
	switch: 'switch',
	observing_conditions: 'conditions',
	safety_monitor: 'safety'
};

export async function runDeviceLifecycleAction(
	deviceType: string,
	deviceId: string,
	action: 'startup' | 'shutdown'
) {
	const endpoint = DEVICE_ENDPOINTS[deviceType];

	if (!endpoint) {
		throw new Error(`No endpoint mapping for device type "${deviceType}"`);
	}

	const res = await fetch(
		`${PUBLIC_API_BASE}/${endpoint}/${encodeURIComponent(deviceId)}/${action}`,
		{
			method: 'POST'
		}
	);

	if (!res.ok) {
		throw new Error(`${action} failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function moveFilterWheel(filterwheelId: string, position: number) {
	const res = await fetch(
		`${PUBLIC_API_BASE}/filterwheel/${encodeURIComponent(filterwheelId)}/move/${position}`,
		{
			method: 'POST'
		}
	);

	if (!res.ok) {
		throw new Error(`Filter wheel move failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function runSequence(sequenceName: string) {
	const res = await fetch(
		`${PUBLIC_API_BASE}/observatory/sequences/${encodeURIComponent(sequenceName)}/run`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(null)
		}
	);

	if (!res.ok) {
		throw new Error(`Sequence start failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function pauseSequence(contextId: string) {
	const res = await fetch(
		`${PUBLIC_API_BASE}/observatory/sequences/${encodeURIComponent(contextId)}/pause`,
		{
			method: 'POST'
		}
	);

	if (!res.ok) {
		throw new Error(`Sequence pause failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function resumeSequence(contextId: string) {
	const res = await fetch(
		`${PUBLIC_API_BASE}/observatory/sequences/${encodeURIComponent(contextId)}/resume`,
		{
			method: 'POST'
		}
	);

	if (!res.ok) {
		throw new Error(`Sequence resume failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function abortSequence(contextId: string) {
	const res = await fetch(
		`${PUBLIC_API_BASE}/observatory/sequences/${encodeURIComponent(contextId)}/abort`,
		{
			method: 'POST'
		}
	);

	if (!res.ok) {
		throw new Error(`Sequence abort failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function uploadSequence(file: File, dryRun = false) {
	const form = new FormData();
	form.append('file', file);

	const res = await fetch(`${PUBLIC_API_BASE}/observatory/sequences/parse?dry_run=${dryRun}`, {
		method: 'POST',
		body: form
	});

	if (!res.ok) {
		throw new Error(`Sequence upload failed: ${res.status} ${res.statusText}`);
	}

	return res.json().catch(() => null);
}

export async function listSequences() {
	const res = await fetch(`${PUBLIC_API_BASE}/observatory/sequences`);

	if (!res.ok) {
		throw new Error(`Sequence list failed: ${res.status} ${res.statusText}`);
	}

	return res.json();
}