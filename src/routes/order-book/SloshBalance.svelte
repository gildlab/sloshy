<script lang="ts">
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
    import TokenTransaction from "./tokenTransaction.svelte";
    import Input from "$components/Input.svelte";
    import { required } from "$src/validation";
    import dayjs from "dayjs";

    enum TxStatus {
        None,
        AwaitingConfirmation,
        Error,
    }

    export let params: {
        wild: string;
    };     
    
    let orderBookContract, oldRow;
    let txStatus = TxStatus.None, errorMsg;
    let sloshId = params.wild
    let temp, firstToken
    let ownerAddress, toggle = false
    let threshold, tokenD, isWithdrawable
    let allowance, depositVal, withdrawVal 
    let depositsAndWithdrawals = []

    let takeOrders_  = []

    $: if($signer){
        orderBookContract = new ethers.Contract('0x757cc6205f8f1d92879d1e119481f265938660bf',orderABI , $signer )   
    }

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
                        vault{
                          deposits(orderBy: timestamp, orderDirection :desc){
                            sender
                            token {
                              name 
                              decimals
                            }
                            amount
                            timestamp
                          }  
                          withdraws(orderBy: timestamp, orderDirection :desc){
                            sender
                            token{
                              name 
                              decimals
                            }
                            amount
                            timestamp
                          }
                    
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
        firstToken = order.validInputs[0]  

        let vault = order.validInputs[0].vault
        console.log(vault) 
        vault.deposits.map(e => {
            let obj = e 
            obj['type'] = 'Deposit' 
            depositsAndWithdrawals.push(obj)
            return e
        }) 
        vault.withdraws.map(e => {
            let obj = e 
            obj['type'] = 'Withdrawal'
            depositsAndWithdrawals.push(obj)
            return e
        })
        
        depositsAndWithdrawals = depositsAndWithdrawals.sort((a, b) => {
            if (a.timestamp < b.timestamp) {
                return 1;
            }
            if (a.timestamp > b.timestamp) {
                return -1;
            }
            return 0;
        }); 

        console.log("depositsAndWithdrawals : " , depositsAndWithdrawals) 


        
    }

    $: if ($getOrder.data != undefined && $signerAddress ) {  
        let order_ = $getOrder.data.order     
        console.log("order_ : " ,order_ )
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

    const handleClick = async () =>{  
        try {
            let order_ = $getOrder.data.order 

            let tx  = await $provider.getTransactionReceipt(order_.transactionHash)  
            let byteData = tx.logs.filter(e => {return e.topics[0] == '0xf2d122ec0221a265ba577c8d1cbc391d998c133e1214815df3c68e66d8ee3858' })  

            let data = await ethers.utils.defaultAbiCoder.decode([
                "address","address","tuple(address,address,uint256,uint256,tuple(address,uint8,uint256)[],tuple(address,uint8,uint256)[],bytes)","uint256"] ,
                    byteData[0].data)   

            console.log("data : " ,data)
            let IO = data[2][4].map(e => { 
                let vaultId = e[2].toString() 
                return{
                    token : e[0] ,
                    decimals : e[1] ,
                    vaultId : vaultId ,
                }
            })

            let deleteOrderConfig  = { 
                owner : order_.owner , 
                interpreter:  order_.interpreter,
                dispatch:order_.dispatch ,
                handleIODispatch:order_.handleIODispatch ,
                validInputs: IO,
                validOutputs: IO ,
                data : order_.data
            }  

            const txAskRemoveOrder = await orderBookContract.removeOrder(deleteOrderConfig);  
            txStatus = TxStatus.AwaitingConfirmation;

            let receipt = await txAskRemoveOrder.wait()   

            txStatus = TxStatus.None;
            push(`/sloshes`)
            
        } catch (error) {   
            console.log("error : " , error)
             Sentry.captureException(error);
            if (error.code === Logger.errors.TRANSACTION_REPLACED) {
                if (error.cancelled) {
                    errorMsg = "Transaction Cancelled";
                    // txStatus = TxStatus.Error;
                    return;
                } else {
                    await error.replacement.wait();
                }
            } else if(error.code === -32603){
                errorMsg = 'Transaction Underpriced , please try again'
                // txStatus = TxStatus.Error;
                return;
            }else if(error.code == Logger.errors.ACTION_REJECTED){
                errorMsg = 'Transaction Rejected'
                // txStatus = TxStatus.Error;
                return;
            }else { 
                errorMsg = error.error?.data?.message  ||
                error.error?.message ||
                error.data?.message ||
                error?.message || 
                error?.code 
                // txStatus = TxStatus.Error;
                return;
            }
        }      
    }
    
    // const refresh = async () => {
    //     temp = sloshId;
    //     sloshId = undefined;
    //     if (await !$getOrder.fetching) {
    //         sloshId = temp;
    //     }
    // };

    const handleRowClick = async (i, token) =>{
            
        let row = document.getElementById(token?.tokenVault?.token?.id)
        if(oldRow){
            oldRow.getElementsByTagName('td')[0].style.textDecorationLine = "underline"
        }
        if(row){
            row.style.backgroundColor = "#ECECEC"
            row.style.borderRadius = "0 30px 30px 0"
            row.getElementsByTagName('td')[0].style.textDecorationLine = "none"
            if(oldRow && oldRow != row){
                oldRow.style.backgroundColor = "white"
                oldRow.style.borderRadius = "0 0 0 0"
            }
            oldRow = row;
            let tokenC = new ethers.Contract(token?.tokenVault?.token.id, erc20ABI, $signer)
            allowance = await tokenC.allowance($signerAddress.toLowerCase(), orderBookContract.address);
            if(!toggle){                
                tokenD = token
                toggle = true
            }
        }
    }
    $: toggleT = toggle
    
    const onload = () =>{
        handleRowClick(0, firstToken)
    }

</script> 

<div class="flex flex-col items-center justify-center">  
    <Section>
        <div class="py-4">
            {#if txStatus == TxStatus.None}
                {#if $getOrder.fetching}
                <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 300px;" loop autoplay></lottie-player>
                {:else if $getOrder.error}
                    <div class="text-red-400 font-medium text-xl px-4 py-4">
                        Please connect your wallet<br />
                        to get vault Ids
                    </div>
                {:else}
                    <div class="flex flex-col gap-y-2 pt-2" style="min-width: 54rem;">
                        <div class="px-6">
                            <div class="grid grid-cols-3 grid-flow-col justify-between px-6">
                                <!-- <span class="cursor-pointer pl-8 text-black" on:click={() =>{history.back()}} ><IconLibrary icon="back" width={14} /> -->
                                <span class="text-black font-normal">Vault: <a class="items-center text-gray-700 underline hover:text-blue-500" target="_blank"
                                    href={`${$selectedNetwork.blockExplorer}/tx/${sloshId}`}>{sloshId.substring(0,15)}...</a>
                                </span>
                                <div class="flex flex-col justify-center items-center pb-2">
                                    <span class="font-semibold text-black ">{hex_to_ascii(order.data).isValid && hex_to_ascii(order.data).asciiString ? hex_to_ascii(order.data).asciiString + "-" : ''}Slosh Balances</span>
                                    <span class="font-normal text-gray-700 ">{"(" + sloshId.substring(0,15) + '.....' + sloshId.substring(sloshId.length - 5, sloshId.length) + ")"}</span>
                                </div>
                                <div class="flex justify-end">
                                        <button class="my-2 rounded-full text-base px-5 py-2 font-medium text-black" style="background-color: #FDA742;  box-shadow: inset 0px 2px 6px 0px #ffffff;"
                                        on:click={()=>{push(`/slosh-history/${order.id}`)}}>Slosh History</button>
                                </div>
                            </div>
                        </div>
                        <div class="w-1/2">
                                <table class="table-auto block w-full pb-2" id="tb">
                                    <thead class=" w-full inline-block">
                                    <tr class="font-semibold w-full flex pb-2 items-center pl-28">
                                        <th class="text-left  w-4/6 text-black">Token</th>
                                        <th class="text-left  w-2/6 text-black">Balances</th>
                                    </tr>  
                                    </thead>
                                    <tbody class=" w-full inline-block">
                                        {#each order.validInputs as token, i}
                                            <!-- <div class="hidden">{i == 0 ? handleRowClick(i, token) : ''}</div> -->
                                            <tr class="flex w-full items-center pl-28 p-1 cursor-pointer currRow" id={token?.tokenVault?.token?.id}
                                            on:click={() => {
                                                    toggle = false
                                                    handleRowClick(i, token)
                                                }}
                                            use:onload
                                           >
                                                <td class="w-4/6 text-gray-700 underline font-normal" id="firstTd{i}">{token?.tokenVault?.token?.name}</td>
                                                <td class="w-2/6 text-gray-700">
                                                    {ethers.utils.formatUnits(token?.tokenVault?.balance , token?.tokenVault?.token?.decimals)}
                                                </td>
                                            </tr>
                                        {/each}
                                </table>
                            </div>
                            <div />
                            {#key toggle}
                                <TokenTransaction toggleToken={toggleT} token={tokenD} orderBookContract={orderBookContract} />
                            {/key }

                        <div class="py-6">
                            <div class="w-full text-lg flex justify-center items-center text-black font-medium">Deposit/Withdrawal History</div>
                        </div>
                        <table class="table-auto block w-full px-8 pb-2">
                            <thead class="block items-center py-1 rounded-t-lg" style="background-color: #949494; ">
                                <tr class="font-semibold flex w-full text-white">
                                    <th class="text-center w-1/4 text-sm">Type</th>
                                    <th class="text-center w-1/4 text-sm">Token</th>
                                    <th class="text-center w-1/4 text-sm">Amount</th>
                                    <th class="text-center w-1/4 text-sm">Date</th>
                                </tr>  
                            </thead>
                            <tbody class="block items-center py-1 history text-black">
                                {#if depositsAndWithdrawals.length == 0}
                                <tr class="font-normal flex py-1 w-full justify-center">
                                    Deposit some tokens to see the Deposit/ Withdrawal History show here
                                </tr>
                                {:else}
                                    {#each depositsAndWithdrawals as tx}
                                        <tr class="font-normal flex py-1 w-full">
                                            <td class="text-center w-1/4 text-sm">{tx.type}</td>
                                            <td class="text-center w-1/4 text-sm">{tx.token.name}</td>
                                            <td class="text-center w-1/4 text-sm">{ethers.utils.formatUnits(tx?.amount , tx.token?.decimals)}</td>
                                            <td class="text-center w-1/4 text-sm">{dayjs.unix(tx.timestamp).toISOString().slice(0,10)}</td>
                                        </tr>
                                    {/each}
                                {/if}
                            </tbody>
                        </table>
                    </div>
                    
                    <span class="grid justify-start px-6 pt-6">
                        {#if order.orderLive}
                        <button class="w-full transition-colors underline text-base leading-none py-2 px-5 text-red-500 font-normal" on:click={handleClick}>Deactivate Slosh</button>
                        {/if}
                    </span>
                {/if}
            {/if}
            {#if txStatus == TxStatus.AwaitingConfirmation}
                <div class="flex flex-col items-center gap-y-5 p-6">
                    <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 200px;" loop autoplay></lottie-player>
                    <span class="text-lg text-black">Deactivating Slosh...</span>
                </div>
            {/if}
            <!-- {#if txStatus == TxStatus.Error}
                <div class="flex flex-col items-center gap-y-5 p-6">
                    <span class="text-lg text-black">Something went wrong.</span>
                    <span class="text-lg text-red-400">{errorMsg}</span>
                </div>
            {/if} -->
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
    tbody:first-child{
        background-color: #ECECEC;
        /* border-radius: 0 0 50% 50%; */
    }
</style>