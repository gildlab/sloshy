<script lang="ts">
    import IconLibrary from "$components/IconLibrary.svelte";
    import Switch from "$components/Switch.svelte";
    import { tokenAddressess } from "$src/constants";
    import { signer } from "svelte-ethers-store";
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let tokenLs

    let checkedTokens = []
    
    let anchor: HTMLButtonElement | undefined = undefined;
    let visible = false
    let bottom: number;
    let left: number;

    const initPosition = () =>
    ({ bottom, left } = anchor?.getBoundingClientRect() ?? { bottom: 0, left: 0 });

    $: anchor, initPosition();
    $: visible ? document.getElementsByClassName('height')[0].style.minHeight = '100vh' : document.getElementsByClassName('height')[0].style.minHeight = '74vh'

    const handleClick = () =>{
        let tokens = []
        for(let i = 0; i < tokenLs.length; i++ ){
            if(checkedTokens[i] == true){
                tokens.push(tokenLs[i])
            }
        } 
        
        dispatch('tokensList', tokens)
        visible = false
    }

    function filterFunction() {
        let input, filter, div, a, i;
        input = document.getElementById("myInput");
        filter = input.value.toUpperCase();
        
        div = document.getElementById("myDropdown");
        
        a = div.getElementsByClassName("tokenName");
        
        for (i = 0; i < a.length; i++) {
            let txtValue = a[i].textContent || a[i].innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
            a[i].style.display = "";
            } else {
            a[i].style.display = "none";
            }
        }
    }

</script>

<svelte:window on:resize={initPosition} />

{#if visible}
    <div
        role="dialog"
        aria-labelledby="Title"
        aria-describedby="Description"
        aria-orientation="vertical"
        class="popover"
        on:click|stopPropagation
        >
        <div class="blocker" on:click|stopPropagation={handleClick} />
        <div class="wrapper rounded-2xl">
            <div class="grid ht gap-y-2.5  pb-3" id="myDropdown">
                <input type="text" class="w-full rounded-md bg-gray-200 p-1 font-light text-black border-gray-500 depth" placeholder="Search token" id="myInput" on:keyup={filterFunction} />
                <hr class="hrborder">
                <div class="max-h-80 min-h-fit overflow-y-scroll pr-2">
                {#each tokenAddressess as token, i}
                    <div class="grid items-stretch border border-orange-400 w-96 my-2 rounded-full tokenName">
                        <div class="grid grid-cols-2 items-center px-10 py-3 border-orange-400"> 
                            <span class="flex items-center gap-x-2">
                                <img src={token.logo} alt="Rain Logo" class="w-5" />
                                <span class=" text-black ">{token.tokenName}</span>
                            </span>
                            <span class="flex justify-end"><Switch color="#418be4" bind:checked={checkedTokens[i]} /></span>
                        </div>
                    </div>
                {/each}
            </div>
            </div>    
            <div class="pt-3 w-full">
                <button class="w-full rounded-full text-base py-3 px-5 text-black font-bold" style="background-color: #FDA742;  box-shadow: inset 0px 2px 6px 0px #ffffff;" disabled={!$signer} on:click|stopPropagation={handleClick}>Ok</button>
            </div>
        </div>
    </div>
{/if}

<div class="flex justify-center mx-3">
    <button class="w-full rounded-xl text-base py-3 px-5 text-black justify-between flex items-center" 
    style = "background-color: #ECECEC;" 
    on:click={() => (visible = true)}
    bind:this={anchor}>
        <span class="pl-8">Choose tokens</span>
        <span class="pr-2"><IconLibrary icon="down-open-arrow" /></span>
    </button>
</div>

<style>
    .popover {
      position: relative;
      inset: 0;
      display: inline-flex;
      justify-content: center;
      z-index: 2;
    }
    .blocker {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        content: ' ';
        background: transparent;
    }
  
    .wrapper {
      position: absolute;
      min-width: 455px;
      padding: 20px;
      min-height: 100px;
      width: fit-content;
      height: auto;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: white;
      color: black;
      box-shadow: 0px 4px 23px rgb(0, 0, 0, 0.5)
    }
    ::-webkit-scrollbar {
        overflow-y: scroll;
        width: 6px;
    }
    ::-webkit-scrollbar-thumb {
        background: #949494; 
        border-radius: 10px;
    }
    main{
        height: 80vh !important;
    }
  
    .depth{
        box-shadow: 2px 1px 150px rgb(176, 176, 176, 0.5), inset 1px 3px 5px rgb(176, 176, 176, 0.5)
    }
    #myInput{
        background-image: url('/assets/search.png');
        background-position: 8px 4px;
        background-repeat: no-repeat;
        font-size: 16px;
        box-sizing: border-box;
        padding-left: 42px;
    }
    .hrborder{
        border: 1px solid #D8D8D8;
    }
</style>