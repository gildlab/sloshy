<script lang="ts">
    import IconLibrary from "$components/IconLibrary.svelte";
    import Input from "$components/Input.svelte";
    import Switch from "$components/Switch.svelte";
    import { selectedNetwork } from "$src/stores"; 
    import { ethers } from "ethers";
    import { signer } from "svelte-ethers-store";
    import orderABI from "./orderbookABI.json"
    import Section from "$routes/order-book/Section.svelte";
    import { defaultValidator, required } from "$src/validation";
    import { validateFields } from "$src/utils";
    import { op , Opcode ,max_uint32,max_uint256 , memoryOperand , MemoryType   } from './opcodes.ts'
    import {tokenAddressess } from "$src/constants" 
    import { concat } from "ethers/lib/utils"; 
    import { push } from "svelte-spa-router"; 
    import { Logger } from "ethers/lib/utils";
    import TokenList from "./TokenList.svelte";

    import * as Sentry from "@sentry/svelte";
    import { img } from "$routes/assets";

    enum TxStatus {
        None,
        AwaitingConfirmation,
        Complete,
        Error,
    }

    let txStatus = TxStatus.None, errorMsg, txHash;
    let fields: any = {};
    let orderBookContract, thresholdVal, sloshName, sloshId = '0x4d643d39264f51d05e04aeb58979fb21b72af8537c36a785a3274b23c830fa2a'
    let checkedTokens = []

    $: if($signer){
        orderBookContract = new ethers.Contract('0x757cc6205f8f1d92879d1e119481f265938660bf',orderABI , $signer )
    }
    
    const handleClick = async () => {
        const { validationResult } = await validateFields(fields);

        if (!validationResult) return;
        addOrder()
    };

    const getTokens = (event) => {
        checkedTokens = event.detail        
    }

    const addOrder = async () => { 
        try{
        let x = 1 + ((1 * thresholdVal)/100) 

        let askPrice = ethers.utils.parseEther(x.toString()) 
        const askConstants = [max_uint256, askPrice ]; 

        const vAskOutputMax = op(Opcode.READ_MEMORY,memoryOperand(MemoryType.Constant, 0)); 
        const vAskPrice = op(Opcode.READ_MEMORY, memoryOperand(MemoryType.Constant, 1));

        const askSource = concat([ vAskOutputMax,vAskPrice]);  
        let tokenInput = []
        let tokenOutput = [] 
        const nonce = new Uint8Array(32); 
        let val = crypto.getRandomValues(nonce);  
        let randomNumber = ethers.BigNumber.from(ethers.utils.hexlify(val)).toString() // random number later can be changed .

        checkedTokens.forEach(token => {
            tokenInput.push({"token" : token.tokenAddress, "vaultId" : randomNumber, decimals : token.decimals})
            tokenOutput.push({"token" : token.tokenAddress, "vaultId" : randomNumber, decimals : token.decimals})
        })
        

        let aliceAskOrder = sloshName != "" ? ethers.utils.toUtf8Bytes(sloshName) : []

        let askOrderConfig = { 
            expressionDeployer : "0x2676D242308D1E5bA37A9433B9Cd5105BcfEa6cB" ,
            interpreter : "0x9EbC179Ccbf0C68475dDDf22F00F02E65a285D24" ,
            validInputs: tokenInput,
            validOutputs: tokenOutput,
            interpreterStateConfig: {
                sources: [askSource , []],
                constants: askConstants,  
            }, 
            data : aliceAskOrder
        }  

        console.log("askOrderConfig : " , askOrderConfig )
        
            let txAskOrderLive = await orderBookContract.addOrder(askOrderConfig );
            txHash = txAskOrderLive
            txStatus = TxStatus.AwaitingConfirmation;
            
            let receipt = await txAskOrderLive.wait()
            console.log("receipt.events", receipt.events.filter(e => e.event == 'AddOrder'));
            
            sloshId = receipt.events.filter(e => e.event == 'AddOrder')[0].args[3].toHexString()
            
            setTimeout(5000)
            txStatus = TxStatus.Complete;
            // push(`/sloshes`)
        }catch(error){  
            console.log("error setup", error);
            
            Sentry.captureException(error);
            if (error.code === Logger.errors.TRANSACTION_REPLACED) {
                if (error.cancelled) {
                    errorMsg = "Transaction Cancelled";
                    txStatus = TxStatus.Error;
                    return;
                } else {
                    await error.replacement.wait();
                }
            } else if(error.code === -32603){
                errorMsg = 'Transaction Underpriced , please try again'
                txStatus = TxStatus.Error;
                return;
            }else if(error.code == Logger.errors.ACTION_REJECTED){
                errorMsg = 'Transaction Rejected'
                txStatus = TxStatus.Error;
                return;
            }else { 
                errorMsg = error.error?.data?.message  ||
                error.error?.message ||
                error.data?.message ||
                error?.message || 
                error?.code 
                txStatus = TxStatus.Error;
                return;
            }
        }
    }  

    const handleTry = () =>{
        txStatus = TxStatus.None
    }

</script>

<div>
    <Section>
        {#if txStatus == TxStatus.None}
            <div class="pt-4">
                <div class="flex flex-col gap-y-2 px-4 pt-2 ">
                    <div class="flex justify-between pb-1">
                        <span class="pl-2 cursor-pointer text-black" on:click={() =>{history.back()}}><IconLibrary icon="back" width={14} /></span>
                        <div class="flex flex-col justify-center items-center pb-2">
                            <span class="font-semibold text-black mr-5">Slosh Setup</span>
                        </div>
                        <div />
                    </div>
                    <div class="w-full p-2 px-2 flex flex-col justify-center items-start">
                        <div class="w-full flex">
                            <span class="w-max font-semibold text-black ml-2 mr-2 pt-1">Slosh name:</span>
                            <span class="w-3/5">
                                <Input bind:value={sloshName} padLeft="pl-3" type="text" validator={defaultValidator} bind:this={fields.sloshName} >
                                </Input>
                            </span>
                        </div>
                        <span class="text-xs text-black pl-7 mt-1 font-extralight">Tip: Shorter names cost less gas :D P.s Names are public and permanent</span>
                    </div>
                    <!-- <div class="flex justify-center mx-3">
                        <buttom class="w-full rounded-lg text-base py-3 px-5 text-black justify-between flex items-center" 
                        style = "background-color: #ECECEC;" 
                        on:click={() => (visible = true)}
                        bind:this={anchor}>
                            <span class="pl-8">Choose tokens</span>
                            <span class="pr-2"><IconLibrary icon="down-open-arrow" /></span>
                        </buttom>
                    </div> -->
                    <TokenList on:tokensList={getTokens} tokenLs={tokenAddressess} />
                    <div class="px-16 pt-2">
                        {#if checkedTokens.length != 0 }
                            {#each checkedTokens as token}
                                <span class="flex items-center gap-x-3 leading-8">
                                    <img src={token.logo} alt="Rain Logo" class="w-5" />
                                    <span class=" text-black">{token.tokenName}</span>
                                </span>
                            {/each}
                        {/if}
                    </div>
                </div>
                <div class="mr-10">
                    <div class="w-full p-2 flex rounded-r-2xl gap-x-1 items-center my-4" style="background-color: #949494;">
                        <div class="w-2/3 pl-16 text-white">Choose a threshold :</div>
                        <span class="w-1/3 flex items-center gap-x-2 text-black pr-9"><Input bgColor="bg-white" bind:value={thresholdVal} type="number" validator={required} bind:this={fields.tiers1} />%</span>  
                    </div>
                </div>
                <div class="w-full flex px-16 py-4 justify-center">
                    {#if $signer}
                        <button class="w-full rounded-full text-base py-3 px-5 text-black font-semibold" style="background-color: #FDA742;  box-shadow: inset 0px 2px 6px 0px #ffffff;" disabled={!$signer} on:click={handleClick}>Ok</button>
                    {/if}
                </div>
            </div>
        {/if}
        {#if txStatus == TxStatus.AwaitingConfirmation}
          <div class="flex flex-col items-center p-6">
            <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 200px;" loop autoplay></lottie-player>
            <span class="text-lg text-black font-medium pt-5">Transaction on chain</span>
            <span class="text-base text-black font-medium underline"><a href={`${$selectedNetwork.blockExplorer}/tx/${txHash?.hash}`} target="_blank">Verify Transaction <IconLibrary icon="link" width={26}/> </a></span>
          </div>
        {/if}
        {#if txStatus == TxStatus.Complete}
            <div class="flex flex-col items-center justify-center w-96 h-80">
                <span class="text-lg text-black font-medium pt-5 pb-2">Transaction Successful!</span>
                <img src={img['true_circle']} alt="Success" />
                <span class="text-base font-normal text-black pt-3">The slosh has been created.</span>
                <span class="text-base cursor-pointer font-normal text-black">You can now <a href="/#/slosh/{sloshId}" class="underline">deposit tokens.</a> </span>
                <span class="text-base cursor-pointer font-medium text-black underline pt-5"><a href={`${$selectedNetwork.blockExplorer}/tx/${txHash?.hash}`} target="_blank">Verify Transaction <IconLibrary icon="link" width={26}/></a></span>
            </div>
        {/if}
        {#if txStatus == TxStatus.Error}
            <div class="flex flex-col items-center justify-center w-96 h-80">
                <span class="text-lg text-black font-medium pt-5 pb-2">Transaction Unsuccessful</span>
                <img src={img['false_circle']} alt="Error" />
                <span class="text-base font-normal text-black pt-3">The slosh hasn't been created.</span>
                <span class="text-base cursor-pointer font-normal text-black"><a on:click={handleTry} class="underline">Try again here</a> </span>
                <span class="text-base cursor-pointer font-medium text-black underline pt-5"><a href={`${$selectedNetwork.blockExplorer}/tx/${txHash?.hash}`} target="_blank">Verify Transaction <IconLibrary icon="link" width={26}/></a></span>
            </div>
        {/if}
    </Section>
</div>

