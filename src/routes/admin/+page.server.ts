import { ADMIN_PASSWORD } from '$env/static/private';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const authenticated = cookies.get('admin_auth');

	if (authenticated !== 'true') {
		return { authenticated: false };
	}

	return { authenticated: true };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password');

		if (password !== ADMIN_PASSWORD) {
			return fail(401, { incorrect: true });
		}

		cookies.set('admin_auth', 'true', {
			path: '/admin',
			httpOnly: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		return { success: true };
	},

	logout: async ({ cookies }) => {
		cookies.delete('admin_auth', { path: '/admin' });
		return { success: true };
	}
};
