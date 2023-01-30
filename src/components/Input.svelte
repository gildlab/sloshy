<script lang="ts">
  import autoAnimate from "@formkit/auto-animate";
  // import AddressLibrary from "$src/routes/address-library/AddressLibrary.svelte";
  import { createEventDispatcher, getContext } from "svelte";
  import IconLibrary from "./IconLibrary.svelte";
  import { writable } from "svelte/store";
  import Modal, { bind } from "svelte-simple-modal/src/Modal.svelte";
  import Ring from "$components/Ring.svelte";
  const modal2 = writable(null);
  // const showModal = () => modal2.set(bind(AddressLibrary, { onSelectAddress }));

  export let from: string | undefined = undefined;
  export let type:
    | "text"
    | "number"
    | "range"
    | "address"
    | "datetime-local"
    | "textarea" = "text";
  export let value: string | number = "";
  export let placeholder = "";
  export let validator = async (value: any, type: any): Promise<any> => null;
  export let debounce: boolean = false;
  export let debounceTime: number = 750;
  export let min = "";
  export let max = "";
  export let disabled = false;
  export let errorMsg = "";
  export let bgColor = "bg-gray-200";
  export let wid = '';
  export let padLeft = "";
  export let alignAll = "";
  export let lblTxtClr = "text-gray-500";


  let error: string;
  let timer, validating;

  $: _type = type == "address" ? "text" : type;

  $: borderColor = error ? "border-red-500" : "border-gray-500";

  const dispatch = createEventDispatcher();
  const { open } = getContext("simple-modal");

  const handleInput = (e: any) => {
    const v = e.target.value;
    // const v = type.match(/^(number|range)$/) ? +e.target.value : e.target.value;
    if (debounce) {
      doDebounce(v);
    } else {
      value = v;
      dispatch("input", v);
    }
  };

  const doDebounce = (v) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      value = v;
      dispatch("input", v);
    }, debounceTime);
  };

  export const validate = async () => {
    validating = true;
    const validation = await validator(value, type);
    validating = false;
    if (validation?.error) {
      ({ error } = validation);
      return {
        ok: false,
      };
    } else {
      error = null;
      return {
        ok: true,
        value,
      };
    }
  };

  // const openLibrary = () => {
  //   open(AddressLibrary, { onSelectAddress });
  // };

  const onSelectAddress = (address) => {
    value = address;
    validate();
  };
</script>

<div use:autoAnimate class="flex w-full flex-col gap-y-2 {alignAll}">
  {#if $$slots.label}
    <div class="{lblTxtClr}  text-sm font-medium">
      <slot name="label" />
    </div>
  {/if}
  {#if $$slots.description}
    <span class="text-gray-400 text-sm">
      <slot name="description" />
    </span>
  {/if}
  <div class="flex flex-row items-center justify-end gap-x-2 self-stretch {wid}">
    {#if type == "number"}
      <input
        type={_type}
        {value}
        {placeholder}
        on:input={handleInput}
        on:blur={() => {
          console.log("blur");
          validate();
        }}
        {disabled}
        {min}
        {max}
        class="w-10/12 rounded-md {bgColor} p-1 font-light text-black {borderColor}"
      />
    {:else}
      <input
        type={_type}
        {value}
        {placeholder}
        on:input={handleInput}
        on:blur={() => {
          console.log("blur");
          validate();
        }}
        {disabled}
        {min}
        {max}
        class="w-full rounded-md {bgColor} p-1 {padLeft} font-light text-black {borderColor} {type == "text" ? 'depth' : ''}"
      />
    {/if}
    {#if validating}
      <div
        class="absolute right-1 top-0 bottom-0 flex flex-col justify-center"
        class:push-loader={type == "address"}
      >
        <Ring size="30px" color="#FFF" />
      </div>
    {/if}
    <!-- {#if type == "address"}
      {#if from == "depositModal"}
        <Modal
          show={$modal2}
          styleContent={{ color: "rgba(249, 250, 251, 1)" }}
          styleWindow={{
            backgroundColor: "rgba(0, 0, 0, 0) !important",
            width: "fit-content",
          }}
          closeButton={false}
        >
          <span class="flex-shrink cursor-pointer" on:click={showModal}
            ><IconLibrary icon="library" inline /></span
          >
        </Modal>
      {:else}
        <span class="flex-shrink cursor-pointer" on:click={openLibrary}
          ><IconLibrary icon="library" inline /></span
        >
      {/if}
    {/if} -->
  </div>
  {#if $$slots.tip}
    <span class="text-black font-light" style="font-size: 14px;">
      <slot name="tip" />
    </span>
  {/if}
  {#if error}
    <span class="text-red-500">{error}</span>
  {/if}
  {#if errorMsg && errorMsg !== ""}
    <span class="text-red-500">{errorMsg}</span>
  {/if}
</div>


<style>
  .depth{
    /* -moz-box-shadow: inset -1px -1px 2px #CCC;
    -webkit-box-shadow: inset -1px -1px 2px #CCC; */
    box-shadow: 2px 1px 150px rgb(176, 176, 176, 0.5), inset 1px 3px 5px rgb(176, 176, 176, 0.5)
  }
</style>