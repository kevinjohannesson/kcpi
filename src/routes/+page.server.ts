import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const authenticated = cookies.get('admin_auth');
	return { authenticated: authenticated === 'true' };
};

