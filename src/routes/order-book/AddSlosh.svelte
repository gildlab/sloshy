<script lang="ts">
    import IconLibrary from "$components/IconLibrary.svelte";
    import Input from "$components/Input.svelte";
    import Switch from "$components/Switch.svelte";
    import { ethers } from "ethers";
    import { signer } from "svelte-ethers-store";
    import orderABI from "./orderbookABI.json"
    import Section from "$routes/order-book/Section.svelte";
    import { required } from "$src/validation";
    import { validateFields } from "$src/utils";
    import { op , Opcode ,max_uint32,max_uint256 , memoryOperand , MemoryType   } from './opcodes.ts'
    import {tokenAddressess } from "$src/constants" 
    import { concat } from "ethers/lib/utils"; 

    export let params: {
        wild: string;
    }; 

    let fields: any = {};
    let orderBookContract, thresholdVal
    let checkedTokens = []

    $: if($signer){
        orderBookContract = new ethers.Contract('0x75b4A6c9238A5206adBa189221B90ebbFe4ac248',orderABI , $signer )
        console.log("order", orderBookContract);
    }
    
    const handleClick = async () => {
        const { validationResult } = await validateFields(fields);

        if (!validationResult) return;
        addOrder()
    };

const addOrder = async () => { 
    
    let x = 1 + ((1 * thresholdVal)/100) 

    let askPrice = ethers.utils.parseEther(x.toString()) 
    

    const askConstants = [max_uint256, askPrice ,max_uint32 ];
    const vAskOutputMax = op( Opcode.STATE,memoryOperand(MemoryType.Constant, 0));
    const vAskPrice = op(Opcode.STATE, memoryOperand(MemoryType.Constant, 1));
    const vExpiresAfter = op(Opcode.STATE, memoryOperand(MemoryType.Constant, 2));
    const ensure =op(Opcode.ENSURE, 1);

    const askSource = concat([ vAskOutputMax,vAskPrice ,vExpiresAfter ,ensure ]);  
    let tokenInput = []
    let tokenOutput = [] 
    let randomNumber = params.wild // random number later can be changed . 
    

    for(let i = 0; i < tokenAddressess.length; i++ ){
        if(checkedTokens[i] == true){
            tokenInput.push({"token" : tokenAddressess[i].tokenAddress, "vaultId" : randomNumber})
            tokenOutput.push({"token" : tokenAddressess[i].tokenAddress, "vaultId" : randomNumber })
        }
    }
    
    let askOrderConfig = { 
        interpreter: '0x19dd1aF639604544276353d14439eFC0AD3285E4',
        expressionDeployer: '0x84E24EA1c545927D1515CBbB2E567Efe5248c322',
        validInputs: tokenInput,
        validOutputs: tokenOutput,
        interpreterStateConfig: {
        sources: [askSource],
        constants: askConstants,  
        }, 
        expiresAfter: max_uint32,
    } 

    console.log("askOrderConfig : " , askOrderConfig )

    console.log("askSource : " , askSource )

    let  txAskOrderLive = await orderBookContract.addOrder(askOrderConfig); 
    console.log("txAskOrderLive ")
}  
</script>
<div>
    <Section>
    <div class="py-4">
        <div class="flex flex-col gap-y-2 px-4 pt-2 ">
            <div class="flex justify-between pb-6">
                <span class="cursor-pointer" on:click={() =>{history.back()}}><IconLibrary icon="back" width={14} /></span>
                <div class="flex flex-col justify-center items-center pb-2">
                    <span class="font-semibold">Add Slosh</span>
                    <!-- <span class="font-normal">(Ox2413fb3709b0...)</span> -->
                </div>
                <div />
                <!-- <span on:click={() =>{push(`/sloshbalance`)}}><IconLibrary icon="forward" width={14} /></span> -->
            </div>
            {#each tokenAddressess as token, i}
                <div class="grid items-stretch border border-orange-400 w-96 rounded-full ">
                    <div class="grid grid-cols-2 items-center  px-10 py-3 border-orange-400"> 
                        <span class="flex items-center gap-x-2">
                            <img src={token.logo} alt="Rain Logo" class="w-7" />
                            <span>{token.tokenName}</span>
                        </span>
                        <span class="flex justify-end"><Switch color="#22c55e" bind:checked={checkedTokens[i]} /></span>
                    </div>
                </div>
            {/each}      
        </div>
        <div class="w-full bg-gray-300 p-2 flex justify-center items-center gap-x-4 px-6 my-4">
            <div class="w-full text-sm">Choose a threshold :</div>
            <span class="flex items-center gap-x-2"><Input bgColor="bg-white" bind:value={thresholdVal} type="number" validator={required} bind:this={fields.tiers1} />%</span>
            
        </div>
        <div class="w-full flex px-4 justify-center">
            {#if $signer}
                <button class="bg-orange-400 w-full rounded-full text-base py-3 px-5 text-black" disabled={!$signer} on:click={handleClick}>Ok</button>
            {:else}  
                <span class="">Please connect your wallet</span>
            {/if}
        </div>
    </div>
    </Section>
</div>