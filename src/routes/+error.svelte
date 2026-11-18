<script lang="ts">
	import { page } from '$app/state';
</script>

<h1 class="text-2xl font-bold">{page.status === 404 ? 'Esta página não existe' : 'Não foi possível carregar as partituras'}</h1>
<p class="mt-2 opacity-70">
	{page.status === 404 ? 'O endereço pode ter mudado.' : 'O Notion ou o GitHub não responderam. Tenta outra vez daqui a um minuto.'}
</p>
<a href="/" class="btn mt-6">Ver as partituras</a>
