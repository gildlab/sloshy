<script lang="ts" type="module">
  import Header from "./layout/Header.svelte";
  import Footer from "./layout/Footer.svelte";

  import { defaultEvmStores, signerAddress } from "svelte-ethers-store";
  import Router from "svelte-spa-router";
  import Modal from "svelte-simple-modal";
    
  import AddSlosh from "$routes/order-book/SloshSetup.svelte";
  import SloshBalance from "$routes/order-book/SloshBalance.svelte";
  import Sloshes from "$routes/order-book/Sloshes.svelte";
  import Orderbook from "$routes/order-book/Orderbook.svelte";
  import SloshComic from "$routes/order-book/SloshComic.svelte";
  import Web3Modal from "web3modal";
  import { onMount } from "svelte";
  import { networks, providerOptions } from "./constants";
  import { ethers } from "ethers";
  import { selectedNetwork } from "$src/stores";
  import NotFound from "$routes/order-book/NotFound.svelte";
    import Privacy from "$routes/order-book/Privacy.svelte";
    import SloshHistory from "$routes/order-book/SloshHistory.svelte";
   
  let routes = {};

  routes = {

    "/": Orderbook,
    "/sloshes" : Sloshes,
    "/addslosh": AddSlosh,
    "/slosh/*": SloshBalance, 
    "/slosh-history/*": SloshHistory, 
    "/slosh-comic": SloshComic,
    "/privacy" : Privacy,
    
    // "/vaultbalance/*": VaultBalance,

    // Catch-all
    // This is optional, but if present it must be the last
    '*': NotFound,
  };

  let providers,
    oldNetName,
    library,
    networkName

    onMount(() => {
     
     onMountLoad()
     }) 
 
     const onMountLoad = async () => {
       const provider = new ethers.providers.Web3Provider(window.ethereum);
       // const webLibrary = new ethers.providers.Web3Provider(webProvider);
       defaultEvmStores.setProvider(provider); 
 
       const network = await provider.getNetwork();
 
       library = provider;
       // networkName = network.name;
 
       networks.forEach((element) => {
         if (parseInt(element.config.chainId) === network.chainId) {
           networkName = element.config.chainName;
           $selectedNetwork = element;
         }
       });
     }

  const web3Modal = new Web3Modal({
    cacheProvider: false, // optional
    providerOptions, // required
  }); 

  const connectWallet = async () => {
    try {
      await web3Modal.clearCachedProvider();
      const webProvider = await web3Modal.connect();
      const webLibrary = new ethers.providers.Web3Provider(webProvider);
      defaultEvmStores.setProvider(webProvider);
      const network = await webLibrary.getNetwork();

      library = webLibrary;
      // networkName = network.name;

      networks.forEach((element) => {
        if (parseInt(element.config.chainId) === network.chainId) {
          networkName = element.config.chainName;
          oldNetName = element.config.chainName;
          $selectedNetwork = element;
        }
      });
    } catch (err) {
      console.log("err", err);
    }
  };


</script>

<Modal
  unstyled={true}
  closeButton={false}
  classWindow="relative max-w-full max-h-full my-2 mx-auto text-white rounded-xl shadow-md bg-gray-800 "
  classBg="fixed top-0 left-0 w-screen h-screen flex flex-col justify-center bg-gray-900 bg-opacity-75 z-50 backdrop-blur"
  classWindowWrap="relative m-2 max-h-full flex flex-col"
  classContent="p-6"
>
  <Header />
    <main class="relative flex flex-col font-light text-gray-50 image">
      {#if $signerAddress}
        <div class="w-full py-5 px-8 height flex flex-col  items-center">
          <Router {routes} />
        </div>
        {:else}
        <div class="w-full py-5 px-8 height flex flex-col justify-center items-center">
          <div class="flex flex-col justify-center items-center h-full">
            <span class="text-xl font-semibold text-black">To use the app:</span>
            <div class="mt-4">
              <button
                class="rounded-full border-none px-14 py-3 text-white"
                style="background-color: #2C2C54;"
                on:click={connectWallet}>Connect Wallet</button
              >
            </div>
          </div>
        </div>
        {/if}
      <Footer />
    </main>
</Modal>

<style global lang="postcss">
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  main{
    z-index: 1;
  }
  .image{
    background-image: url("/assets/sloshylines_extended.svg");
    background-repeat: no-repeat;
    background-size: cover;
  }
  .height{
    min-height: 74vh;
    /* min-height: 104vh; */
  }
</style>
