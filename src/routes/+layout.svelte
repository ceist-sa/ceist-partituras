<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Partituras · CEIST</title>
	<meta name="description" content="As partituras da Camerata de Estudantes do Instituto Superior Técnico, por temporada e programa." />
</svelte:head>

<header class="border-b border-ink/15">
	<div class="mx-auto flex max-w-6xl items-center px-4 py-3">
		<a href="/" class="flex items-center gap-3">
			<img src="/icon.svg" alt="CEIST" class="size-8" />
			<span class="label text-lg">Partituras</span>
		</a>
	</div>
</header>

<main class="mx-auto max-w-6xl px-4 pt-6 pb-16">
	{@render children()}
</main>
