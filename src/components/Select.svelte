<script>
  import { createEventDispatcher } from "svelte";

  export let items = [];
  export let value = items[0];

  const dispatch = createEventDispatcher();

  export const validate = () => {
    return {
      ok: true,
      value,
    };
  };
</script>

<div class="flex w-full flex-col gap-y-2">
  {#if $$slots.label}
    <div class="font-light text-gray-100">
      <slot name="label" />
    </div>
  {/if}
  {#if $$slots.description}
    <span class="text-gray-400">
      <slot name="description" />
    </span>
  {/if}
  <div class="self-start rounded-md text-white">
    <select
      class="text-light outline-none mr-2 border-none bg-transparent px-4 py-2 text-black font-medium"
      bind:value
      on:change={() => {
        dispatch("change");
      }}
    >
        {#each items as item}
          <option class="text-white" value={item}>
            <span><img src={item.icon} />{item.label}</span>
          </option>
        {/each}
    </select>
  </div>
</div>

<style>
  select{
    -moz-appearance:none; /* Firefox */
    -webkit-appearance:none; /* Safari and Chrome */
    appearance:none;
    background-image: url("/assets/down-arrow.png");
    background-repeat: no-repeat;
    background-size: 20px;
    background-position: right;
    padding-right: 35px;
  }
</style>