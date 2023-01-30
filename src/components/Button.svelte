<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function click() {
    dispatch("click");
  }

  export let label = null;
  export let variant = "primary";
  export let disabled = false;
  export let small = false;
  export let id = "";
  export let shrink = false;
  export let bRadius = "rounded-lg"
  export let tColor = "text-white"
  export let shadow = true
  $: variantCalc = disabled ? "disabled" : variant;
</script>

{#if small}
  <button
    {disabled}
    {id}
    on:click={click}
    class={`transition-colors text-sm leading-none py-3 px-5 ${tColor} ${bRadius} ${variantCalc} shadow`}
  >
    <slot />
    {#if !$$slots.default}
      {label}
    {/if}
  </button>
{:else if shrink}
  <button
    {disabled}
    {id}
    on:click={click}
    class={`transition-colors text-base leading-none py-3 px-5 ${tColor} ${bRadius} ${variantCalc} shadow`}
  >
    <slot />
    {#if !$$slots.default}
      {label}
    {/if}
  </button>
{:else}
  <button
    {disabled}
    {id}
    on:click={click}
    class={`w-full transition-colors text-base leading-none py-3 px-5 ${tColor} ${bRadius} shadow`}
  >
    <slot />
    {#if !$$slots.default}
      {label}
    {/if}
  </button>
{/if}

<style lang="postcss">
  .primary {
    @apply bg-blue-700 hover:bg-blue-600;
  }

  .secondary {
    @apply bg-gray-200;
  }

  .disabled {
    @apply cursor-not-allowed bg-gray-400;
  }
  .shadow{
    box-shadow: inset 0 0 5px 5px #FDA742;
  }
</style>
