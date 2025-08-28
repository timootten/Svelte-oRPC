<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	import { beforeNavigate, goto, onNavigate, preloadData } from '$app/navigation';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { onMount } from 'svelte';

	type Route = {
		path: string;
		name: string;
		level: number;
		children?: Route[];
		hasPage?: boolean;
	};

	let routes: Route[] = $state([]);

	beforeNavigate((nav) => {
		if (nav.type !== 'goto') {
			nav.cancel();
			if (nav.to?.url.pathname) {
				goto(nav.to?.url.pathname, {
					replaceState: false,
					noScroll: false,
					invalidate: undefined,
					invalidateAll: false
				});
			}
		}
	});

	onMount(async () => {
		const modules = import.meta.glob('/src/routes/**/+page.svelte', { eager: true });
		const actualPaths = new Set(
			Object.keys(modules).map((file) => {
				const path =
					file
						.replace('/src/routes', '')
						.replace('/+page.svelte', '')
						.replace(/\/index$/, '') || '/';
				return path;
			})
		);

		// Create all possible parent paths
		const allPaths = new Set<string>();
		actualPaths.forEach((path) => {
			allPaths.add(path);
			// Add all parent paths
			const segments = path.split('/').filter(Boolean);
			for (let i = 1; i < segments.length; i++) {
				const parentPath = '/' + segments.slice(0, i).join('/');
				allPaths.add(parentPath);
			}
		});

		// Preload only actual pages with Error Handling
		const preloadPromises = Array.from(actualPaths).map(async (p) => {
			try {
				await preloadData(p);
				return p;
			} catch (error) {
				console.warn(`Failed to preload ${p}:`, error);
				return null;
			}
		});

		const loadedPaths = (await Promise.all(preloadPromises)).filter(Boolean) as string[];
		const loadedPathsSet = new Set(loadedPaths);

		// Build hierarchical route structure with all paths
		routes = buildRouteHierarchy(Array.from(allPaths), actualPaths, loadedPathsSet);
	});

	function buildRouteHierarchy(
		allPaths: string[],
		actualPaths: Set<string>,
		loadedPaths: Set<string>
	): Route[] {
		const routeMap = new Map<string, Route>();

		// Sort paths by depth (shallow first)
		allPaths.sort((a, b) => a.split('/').length - b.split('/').length);

		for (const path of allPaths) {
			const segments = path === '/' ? [] : path.split('/').filter(Boolean);
			const level = segments.length;

			const route: Route = {
				path,
				name: formatRouteName(path),
				level,
				children: [],
				hasPage: actualPaths.has(path) && loadedPaths.has(path)
			};

			routeMap.set(path, route);
		}

		// Build parent-child relationships
		for (const [path, route] of routeMap) {
			if (route.level === 0) continue; // Skip root

			const segments = path.split('/').filter(Boolean);
			const parentPath = segments.length === 1 ? '/' : '/' + segments.slice(0, -1).join('/');
			const parent = routeMap.get(parentPath);

			if (parent) {
				parent.children = parent.children || [];
				parent.children.push(route);
			}
		}

		// Return only top-level routes (level 0)
		return Array.from(routeMap.values())
			.filter((route) => route.level === 0)
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	function formatRouteName(path: string): string {
		if (path === '/') return 'Home';

		const segments = path.split('/').filter(Boolean);
		const lastSegment = segments[segments.length - 1];

		// Handle numbered routes like live2, live3
		if (/^(\w+)(\d+)$/.test(lastSegment)) {
			const match = lastSegment.match(/^(\w+)(\d+)$/);
			return match ? `${capitalize(match[1])} ${match[2]}` : capitalize(lastSegment);
		}

		return capitalize(lastSegment.replace(/[-_]/g, ' '));
	}

	function capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	function renderRoutes(routes: Route[], currentLevel = 0): any[] {
		const result: any[] = [];

		for (const route of routes) {
			result.push({
				route,
				level: currentLevel,
				hasChildren: route.children && route.children.length > 0
			});

			if (route.children && route.children.length > 0) {
				result.push(...renderRoutes(route.children, currentLevel + 1));
			}
		}

		return result;
	}

	function getPaddingStyle(level: number): string {
		return `${16 + level * 16}px`; // Base 16px + 16px per level
	}

	const queryClient = new QueryClient();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryClientProvider client={queryClient}>
	<button onclick={() => goto('/tsquery/planets/new')}>test</button>
	<div
		class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100"
		data-sveltekit-preload-data="false"
	>
		<!-- Navigation Header -->
		<header class="border-b border-slate-200 bg-white shadow-sm">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="flex h-16 items-center justify-between">
					<div class="flex items-center space-x-4">
						<h1 class="text-2xl font-bold text-slate-900">My App</h1>
					</div>
				</div>
			</div>
		</header>

		<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="flex flex-col gap-8 lg:flex-row">
				<!-- Sidebar Navigation -->
				<nav class="flex-shrink-0 lg:w-64">
					<div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
						<div class="border-b border-slate-200 bg-slate-50 px-4 py-3">
							<h2 class="text-sm font-semibold tracking-wide text-slate-900 uppercase">
								Navigation
							</h2>
						</div>
						<div class="divide-y divide-slate-200">
							{#each renderRoutes(routes) as { route, level, hasChildren }}
								{@const textSize = level === 0 ? 'text-sm' : 'text-xs'}

								{#if route.hasPage}
									<!-- Clickable route with page -->
									<a
										href={route.path}
										class="block py-3 transition-colors duration-200 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none {textSize}
                                            {$page.url.pathname === route.path
											? 'border-r-2 border-blue-500 bg-blue-50 font-medium text-blue-700'
											: 'text-slate-700 hover:text-slate-900'}"
										style="padding-left: {getPaddingStyle(level)}"
									>
										<div class="flex items-center">
											{#if level > 0}
												<svg
													class="mr-2 h-3 w-3 text-slate-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5l7 7-7 7"
													></path>
												</svg>
											{:else if hasChildren}
												<svg
													class="mr-2 h-4 w-4 text-slate-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
													></path>
												</svg>
											{:else}
												<div class="mr-3 h-2 w-2 rounded-full bg-slate-400"></div>
											{/if}
											{route.name}
										</div>
									</a>
								{:else}
									<!-- Non-clickable parent route without page -->
									<div
										class="bg-slate-25 block cursor-not-allowed py-3 font-medium text-slate-500 {textSize}"
										style="padding-left: {getPaddingStyle(level)}"
									>
										<div class="flex items-center">
											{#if level > 0}
												<svg
													class="mr-2 h-3 w-3 text-slate-300"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
													></path>
												</svg>
											{:else}
												<svg
													class="mr-2 h-4 w-4 text-slate-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
													></path>
												</svg>
											{/if}
											{route.name}
											<span class="ml-2 text-xs text-slate-400">(section)</span>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</nav>

				<!-- Main Content -->
				<main class="min-w-0 flex-1">
					<div class="min-h-96 rounded-lg border border-slate-200 bg-white shadow-sm">
						<svelte:boundary>
							{#snippet failed(error)}
								<div class="p-8 text-center">
									<div
										class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
									>
										<svg
											class="h-6 w-6 text-red-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											></path>
										</svg>
									</div>
									<h3 class="mb-2 text-lg font-semibold text-slate-900">Error Loading Content</h3>
									<p class="text-slate-600">{(error as any).message}</p>
								</div>
							{/snippet}

							<div class="p-6">
								{@render children?.()}
							</div>
						</svelte:boundary>
					</div>
				</main>
			</div>
		</div>
	</div>
</QueryClientProvider>
