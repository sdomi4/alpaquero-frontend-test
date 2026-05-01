import { PUBLIC_API_BASE } from '$env/static/public';
import type { PageLoad } from './$types';

export type ConfiguredDevice = {
	type: string;
	id: string;
	name: string;
};

export const load: PageLoad = async ({ fetch }) => {
	const [devicesRes, sequencesRes] = await Promise.all([
		fetch(`${PUBLIC_API_BASE}/observatory/devices`),
		fetch(`${PUBLIC_API_BASE}/observatory/sequences`)
	]);

	return {
		devices: devicesRes.ok ? ((await devicesRes.json()) as ConfiguredDevice[]) : [],
		sequences: sequencesRes.ok ? await sequencesRes.json() : [],
		error: !devicesRes.ok
			? `Failed to load devices: ${devicesRes.status} ${devicesRes.statusText}`
			: null
	};
};