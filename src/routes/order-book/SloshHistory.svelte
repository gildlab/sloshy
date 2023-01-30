<script lang="ts">
    import Button from "$components/Button.svelte";
    import IconLibrary from "$components/IconLibrary.svelte";
    import Section from "$routes/order-book/Section.svelte";
    import { selectedNetwork } from "$src/stores";  

    import { client } from "$src/stores";
    import { queryStore } from "@urql/svelte"; 
    import { provider , signer , signerAddress } from "svelte-ethers-store";
    import { BigNumber, ethers } from "ethers"; 
    import orderABI from "./orderbookABI.json" 
    import { getContext } from "svelte";
    import { hex_to_ascii } from "./opcodes";
    import {BigNumber as FloatBigNum} from 'bignumber.js'
    const { open } = getContext("simple-modal");
    import * as Sentry from "@sentry/svelte";
    import { Logger } from "ethers/lib/utils";
    import { push } from "svelte-spa-router"; 
    import erc20ABI from "./erc20ABI.json" 
    import TokenList from "./TokenList.svelte";
    import dayjs from "dayjs";


    enum TxStatus {
        None,
        AwaitingConfirmation,
        Error,
    }

    export let params: {
        wild: string;
    };   
      
    
    let orderBookContract

    $: if($signer){
        orderBookContract = new ethers.Contract('0x757cc6205f8f1d92879d1e119481f265938660bf',orderABI , $signer )   
    }

    let txStatus = TxStatus.None, errorMsg;
    let sloshId = params.wild
    let temp
    let ownerAddress
    let threshold

    let takeOrders_  = []

    $: getOrder = queryStore({
        client: $client,
        query: `
            query ($id: Bytes!) { 
                 
                order(id: $id){ 
                    data
                    id
                    timestamp
                    orderLive
                    interpreter 
                    dispatch
    				handleIODispatch
                    transactionHash
                    owner
                    stateConfig{
                        constants
                    }
                    validInputs{
                        tokenVault{  
                            vaultId
                            token{
                                id
                                name
                                decimals
                                symbol
                            } 
                            balance
                        }
                    } 
                    validOutputs{
                        tokenVault{ 
                            token{
                                name          
                            }
                            balance
                        }
                    }
                } 
   
            }`,
        variables: { id : sloshId },
        requestPolicy: "network-only",
        
    });   
    
    $: takeOrders = queryStore({
        client: $client,
        query: `
            query ($id: Bytes!) { 
                takeOrderEntities(where: {order_: {id :$id }}) {
                    id
                    timestamp
                    input
                    output
                    order {
                        id
                        orderLive
                    }
                    inputToken {
                        id 
                        decimals 
                        name
                    }
                    outputToken {
                        id 
                        decimals 
                        name
                    }
                    inputIOIndex
                    outputIOIndex 
                } 
            }`,
        variables: { id : sloshId }
    });  

    $: order = $getOrder?.data?.order;
    $: if(order){
        order.validInputs.map(async (token) =>{
            let tokenContract = new ethers.Contract(token.tokenVault.token.id, erc20ABI, $signer)
            token.userBal = await tokenContract.balanceOf($signerAddress?.toLowerCase())
            
        })
    }

    $: if ($getOrder.data != undefined && $signerAddress ) {  
        let order_ = $getOrder.data.order     

        let ratio = new FloatBigNum(order_.stateConfig.constants[1]) 
        let ONE = new FloatBigNum("1000000000000000000")   
        let HUNDRED = new FloatBigNum("100")   
        threshold = (ratio.minus(ONE)).times(HUNDRED).dividedBy(ONE)   

    } 

    $: if ($takeOrders.data && $signerAddress ) {  
        takeOrders_ = $takeOrders.data.takeOrderEntities 

        for(let i = 0 ; i < takeOrders_.length ; i++){
            takeOrders_[i].input = ethers.utils.formatUnits(BigNumber.from(takeOrders_[i].input) , takeOrders_[i].outputToken.decimals) 
            takeOrders_[i].output = ethers.utils.formatUnits(BigNumber.from(takeOrders_[i].output) , takeOrders_[i].inputToken.decimals)
        }
     }

    $: if($signer) {
            ownerAddress = $signerAddress?.toLowerCase()
        }

    
    
    const refresh = async () => {
        temp = sloshId;
        sloshId = undefined;
        if (await !$getOrder.fetching) {
            sloshId = temp;
        }
    };

</script> 

  
<div class="flex flex-col items-center justify-center">  
    <Section>
        <div class="py-4 flex justify-center">
            {#if txStatus == TxStatus.None}
                {#if $getOrder.fetching}
                <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 300px;" loop autoplay></lottie-player>
                {:else if $getOrder.error}
                    <div class="text-red-400 font-medium text-xl px-4 py-4">
                        Please connect your wallet<br />
                        to get vault Ids
                    </div>
                {:else}
                    <div class="flex flex-col gap-y-2 pt-2" style="min-width: 58rem;">
                        <div class="grid grid-cols-3 grid-flow-col justify-between px-6">
                            <div class="flex">
                                <span class="cursor-pointer text-black" on:click={() =>{history.back()}} ><IconLibrary icon="back" width={14} />
                                </span>
                                <div class="pl-10 pt-1 text-black font-normal">Vault: <a class="items-center text-gray-700 underline hover:text-blue-500" target="_blank"
                                    href={`${$selectedNetwork.blockExplorer}/tx/${sloshId}`}>{sloshId.substring(0,15)}...</a>
                                </div>
                            </div>
                            <div class="flex flex-col justify-center items-center pb-2">
                                <span class="font-semibold text-black ">Slosh History</span>
                                    <!-- {#if !order.orderLive} <span class="text-red-500">(deactivated)</span> {/if} -->
                                <span class="font-normal text-gray-700 ">
                                    {#if hex_to_ascii(order.data).isValid}
                                        {#if hex_to_ascii(order.data).asciiString}
                                            <span class="font-semibold">
                                                {hex_to_ascii(order.data).asciiString}
                                            </span>
                                            {"(" + sloshId.substring(0,15) + '.....' + sloshId.substring(sloshId.length - 5, sloshId.length) + ")"}
                                        {:else}
                                           {"(" + sloshId.substring(0,15) + '.....' + sloshId.substring(sloshId.length - 5, sloshId.length) + ")"}
                                        {/if}
                                    {/if}
                                </span>
                            </div>
                            <div class="flex justify-end">
                                <button class="my-2 rounded-full text-base px-5 font-medium text-black" style="background-color: #FDA742;  box-shadow: inset 0px 2px 6px 0px #ffffff;" on:click={()=>{push(`/slosh/${sloshId}`)}}>Slosh Balances</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 mb-10 pt-2">
                            <div class="py-2 gap-x-4 rounded-r-2xl" style="background-color: #949494;">
                                <div class="w-full text-base flex justify-center items-center text-white font-medium">Threshold : {threshold} %</div>
                            </div>
                            <div />
                        </div>
                        <!-- <div class="pl-8 text-black font-normal">Vault: <a class="items-center text-gray-700 underline hover:text-blue-500" target="_blank"
                            href={`${$selectedNetwork.blockExplorer}/tx/${sloshId}`}>{sloshId.substring(0,15)}...</a>
                        </div> -->
                        
                        <table class="table-auto block w-full px-5 py-2 pt-8">
                            <thead class="block items-center py-1 rounded-t-lg" style="background-color: #949494; ">
                                <tr class="font-semibold flex w-full text-white">
                                    <th class="text-center w-1/4 text-sm">History</th>
                                    <th class="text-center w-1/4 text-sm">What was sold</th>
                                    <th class="text-center w-1/4 text-sm">What was bought</th>
                                    <th class="text-center w-1/4 text-sm">Date/time of transaction</th>
                                </tr>  
                            </thead>
                            <tbody class="block items-center py-1 history text-black"> 
                                {#if takeOrders_.length == 0}
                                    <tr class="font-normal flex py-1 w-full justify-center">
                                        Any tokens that you have deposited will automatically slosh once the threshold is met and show here
                                    </tr>
                                {:else}    
                                    {#each takeOrders_ as takeOrder_}
                                        <tr class="font-normal flex py-1 w-full"> 
                                            <td class="text-center w-1/4 text-sm">{takeOrder_.id.substring(0,12)}...</td>
                                            <td class="text-center w-1/4 text-sm">
                                                {takeOrder_.outputToken.name}  {takeOrder_.output}
                                            </td>
                                            <td class="text-center w-1/4 text-sm">
                                                {takeOrder_.inputToken.name}  {takeOrder_.input}
                                            </td>
                                            <td class="text-center w-1/4 text-sm">{dayjs.unix(takeOrder_.timestamp).toISOString().slice(0,10)}</td>
                                        </tr>
                                    {/each} 
                                {/if}
                            </tbody>
                        </table>
                    </div>
                {/if}
            {/if}

            {#if txStatus == TxStatus.AwaitingConfirmation}
                <div class="flex flex-col items-center gap-y-5 p-6">
                    <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 200px;" loop autoplay></lottie-player>
                    <span class="text-lg text-black">Transaction confirming...</span>
                </div>
            {/if}
            {#if txStatus == TxStatus.Error}
                <div class="flex flex-col items-center gap-y-5 p-6">
                    <span class="text-lg text-black">Something went wrong.</span>
                    <span class="text-lg text-red-400">{errorMsg}</span>
                </div>
            {/if}
        </div>
    </Section>   
</div>

<style>
    ::-webkit-scrollbar {
        width: 2px;
    }
    .bgColor{
        background-color: #FDA742;
    }
    button:disabled{
        background-color: #D2D2D2;
    }  
    .history tr:nth-child(even) {
        background-color: #F0EFF1;
    }
</style>