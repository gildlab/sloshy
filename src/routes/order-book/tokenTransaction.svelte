<script lang="ts">
    import { onMount } from "svelte";
    import Section from "./Section.svelte";
    import { img } from "$routes/assets";
    import Button from "$components/Button.svelte";
    import { selectedNetwork } from "$src/stores"; 
    import Input from "$components/Input.svelte";
    import { required } from "$src/validation";
    import * as Sentry from "@sentry/svelte";
    import { BigNumber, ethers } from "ethers";
    import { signer, signerAddress } from "svelte-ethers-store";
    import erc20ABI from "./erc20ABI.json" 
    import { Logger, parseUnits, formatUnits } from "ethers/lib/utils";
    import IconLibrary from "$components/IconLibrary.svelte";

    export let token, orderBookContract, error
    
    let calcAllowance, txReceipt, isWithdrawable
    let depositUnits, withdrawUnits, tokenContract, transCancel = false
    let awaitingWithdrawCrfn = false, awaitingDepositCrfn = false

    enum TxStatus {
        None,
        AwaitingConfirmation,
        AwaitingToken,
        Complete,
        Error,
    }
    
    let txStatus = TxStatus.None, errorMsg, txHash;
    
    onMount(async () => { 
        txStatus = TxStatus.AwaitingToken
        let tokenC = new ethers.Contract(token?.tokenVault?.token.id, erc20ABI, $signer)
        tokenContract = tokenC
        calcAllowance = await checkAllowance(tokenC) 
        txStatus = TxStatus.None
    })

    const checkAllowance =async (tokenC) => {

        let priceAllow = await tokenC.allowance($signerAddress.toLowerCase(), orderBookContract.address);
        let balance = await tokenC.balanceOf($signerAddress.toLowerCase())
        let decimals = await tokenC.decimals()
        let balanceOf = (+formatUnits(balance, decimals)).toFixed(3)
        
        return {
            priceAllow,
            balanceOf
        }
    }
    $: if(token){
        isWithdrawable = BigNumber.from(token?.tokenVault?.balance).gt(BigNumber.from(0));
        
    }

    const approve =async () => {
        
        let tx;
        try {
        tx = await tokenContract.approve(orderBookContract.address, ethers.constants.MaxUint256);  
        txHash = tx
        txStatus = TxStatus.AwaitingConfirmation
        txReceipt = await tx.wait();
        } catch (error) { 
            Sentry.captureException(error);
            if (error.code === Logger.errors.TRANSACTION_REPLACED) {
                if (error.cancelled) {
                transCancel = true
                return;
                } else {
                txReceipt = await error.replacement.wait();
                }
            } else if(error.code === -32603){
                transCancel = true
                return;
            }else if(error.code == Logger.errors.ACTION_REJECTED){
                transCancel = true
                return;
            }else {  
                transCancel = true
                return;
            }
        }
        txStatus = TxStatus.None
        calcAllowance = checkAllowance(tokenContract)
        
        return txReceipt;
    };

    const Deposit = async () => {
        let tx;
        // txStatus = TxStatus.AwaitingSignature;
        
        const units = parseUnits(
            depositUnits.toString(),
            token?.tokenVault?.token.decimals.toString()
        );
        let vaultId = ethers.BigNumber.from(token?.tokenVault?.vaultId);
        const depositConfigStruct = {
            token: token?.tokenVault?.token.id ,
            vaultId: vaultId,
            amount: units
        }; 
        
        try {
            tx = await orderBookContract.deposit(depositConfigStruct);
            txHash = tx
            awaitingDepositCrfn = true
            txReceipt = await tx.wait();
        } catch (error) { 
            Sentry.captureException(error);
            if (error.code === Logger.errors.TRANSACTION_REPLACED) {
                if (error.cancelled) {  
                //   txStatus = TxStatus.Error;
                return;
                } else {
                txReceipt = await error.replacement.wait();
                }
            } else if(error.code === -32603){
                // errorMsg = 'Transaction Underpriced , please try again'
                // txStatus = TxStatus.Error;
                return;
            }else if(error.code == Logger.errors.ACTION_REJECTED){
                        // errorMsg = 'Transaction Rejected'
                        // txStatus = TxStatus.Error;
                        return;
            }else { 
                // errorMsg = error.error?.data?.message  ||
                // error.error?.message ||
                // error.data?.message ||
                // error?.message || 
                // error?.code 
                // txStatus = TxStatus.Error;
                return;
            }
        }
        awaitingDepositCrfn = false
    };

    const withdraw = async () => {
        let tx;
        // txStatus = TxStatus.AwaitingSignature;
        let vaultId = ethers.BigNumber.from(token?.tokenVault?.vaultId);
        const units = parseUnits(
            withdrawUnits.toString(),
            token?.tokenVault?.token.decimals.toString()
        );

        const withdrawConfigStruct = {
            token: token?.tokenVault?.token.id ,
            vaultId: vaultId,
            amount: units
        }; 

        try {
            tx = await orderBookContract.withdraw(withdrawConfigStruct);
            txHash = tx
            awaitingWithdrawCrfn = true
            txReceipt = await tx.wait();
        } catch (error) { 
            Sentry.captureException(error);
            if (error.code === Logger.errors.TRANSACTION_REPLACED) {
                if (error.cancelled) {
                // errorMsg = "Transaction Cancelled";
                //   txStatus = TxStatus.Error;
                return;
                } else {
                txReceipt = await error.replacement.wait();
                }
            } else if(error.code === -32603){
                // errorMsg = 'Transaction Underpriced , please try again'
                // txStatus = TxStatus.Error;
                return;
            }else if(error.code == Logger.errors.ACTION_REJECTED){
                        // errorMsg = 'Transaction Rejected'
                        // txStatus = TxStatus.Error;
                        return;
            }else { 
                // errorMsg = error.error?.data?.message  ||
                // error.error?.message ||
                // error.data?.message ||
                // error?.message || 
                // error?.code 
                return;
            }
        }
        awaitingWithdrawCrfn = false

        return txReceipt;
    };

</script>
{#if txStatus == TxStatus.None}
    <div class="flex justify-center items-center py-10 " style="background-color: #949494; height:337px">
        {#if calcAllowance}
            {#await calcAllowance}
            {:then result}
                {#if !result.priceAllow.gt(BigNumber.from(0))}   
                    {#if !transCancel}
                        <div class="flex flex-col justify-center items-center bg-white p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
                            <img src={img['shield_good']} alt="shield" />
                            <div class="text-black text-center pb-4 font-normal">
                                Your permission is needed to approve the smart contract
                            </div>
                            <span>
                                <button 
                                class="w-full rounded-full text-base py-2 px-14 text-black font-medium" 
                                style="background-color: #FDA742;  box-shadow: inset 0px 2px 6px 0px #ffffff;" on:click={approve}>Approve</button>
                            </span>
                        </div>
                    {:else}
                        <div class="flex flex-col justify-center items-center bg-white p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
                            <img src={img['clear_circle']} alt="clear_circle"/>
                            <div class="text-black text-center pb-4 font-normal">
                                You cancelled your <span class="font-medium">{token?.tokenVault?.token?.name}</span> approval
                            </div>
                            <span>
                                <button 
                                class="w-full rounded-full text-base py-2 px-14 text-black font-medium" 
                                style="background-color: #FDA742;  box-shadow: inset 0px 2px 6px 0px #ffffff;" on:click={approve}>Retry</button>
                            </span>
                        </div>
                    {/if}
                {:else}
                    <div class="grid grid-cols-2 gap-x-28">
                        {#if awaitingDepositCrfn}
                            <div class="flex flex-col justify-center items-center p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
                                <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 150px;" loop autoplay></lottie-player>
                                <span class="text-lg text-white font-medium pt-5">Transaction on chain</span>
                                <span class="text-base text-white font-medium underline"><a href={`${$selectedNetwork.blockExplorer}/tx/${txHash?.hash}`} target="_blank">Verify Transaction <IconLibrary icon="link" width={16} color="text-white"/> </a></span>
                            </div>
                        {:else}
                            <div>
                                <div class="w-full text-base flex justify-center items-center text-white font-medium pb-5">Deposit {token?.tokenVault?.token?.symbol}</div>
                                <Input
                                    type="text"
                                    wid="px-10"
                                    alignAll='items-center'
                                    lblTxtClr="text-white"
                                    bind:value={depositUnits}
                                    debounce
                                    validator={required}
                                >
                                    <span slot="label">Enter the number of units to deposit:</span>
                                </Input>
                                <div class="flex justify-center underline text-white py-2 font-light cursor-pointer" style="font-size: 16px;" on:click={()=>{depositUnits = result.balanceOf}}>{`MAX ${result.balanceOf}(${token?.tokenVault?.token?.symbol})`}</div>
                                <div class="py-4 flex justify-center text-sm font-medium">
                                    Confirm your Deposit
                                </div>
                                <span class='flex justify-center pt-1'>
                                    <button 
                                        class="rounded-full text-base py-2 px-14 text-black font-medium" 
                                        on:click={Deposit}>Deposit
                                    </button>
                                </span>
                            </div>
                        {/if}
                        {#if awaitingWithdrawCrfn}
                            <div class="flex flex-col justify-center items-center p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
                                <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 150px;" loop autoplay></lottie-player>
                                <span class="text-lg text-white font-medium pt-5">Transaction on chain</span>
                                <span class="text-base text-white font-medium underline"><a href={`${$selectedNetwork.blockExplorer}/tx/${txHash?.hash}`} target="_blank">Verify Transaction <IconLibrary icon="link" width={16} color="white"/> </a></span>
                            </div>
                        {:else}
                            <div>
                                <div class="w-full text-base flex justify-center items-center text-white font-medium pb-5">Withdraw {token?.tokenVault?.token?.symbol}</div>
                                <Input
                                    type="text"
                                    wid="px-10"
                                    alignAll='items-center'
                                    lblTxtClr="text-white"
                                    disabled={!isWithdrawable}
                                    bind:value={withdrawUnits}
                                    debounce
                                    validator={required}
                                >
                                    <span slot="label">Enter the number of units to withdraw:</span>
                                </Input>
                                <div class="flex justify-center underline text-white py-2 font-light cursor-pointer" style="font-size: 16px;" on:click={()=>{withdrawUnits = result.balanceOf}}>{`MAX ${result.balanceOf}(${token?.tokenVault?.token?.symbol})`}</div>
                                <div class="py-4 flex justify-center text-sm font-medium">
                                    Confirm your withdraw
                                </div>
                                <span class='flex justify-center'>
                                    <button 
                                        class="rounded-full text-base py-2 px-14 text-black font-medium"
                                        on:click={withdraw}
                                        disabled={!isWithdrawable}>
                                        Withdrawal
                                    </button>
                                </span>
                            </div>
                        {/if}
                    </div>
                {/if}
            {/await}
        {/if}
    </div>
{/if}
{#if txStatus == TxStatus.AwaitingConfirmation}
    <div class="flex flex-col items-center p-6" style="background-color: #949494;">
        <div class="flex flex-col justify-center items-center bg-white p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
            <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 200px;" loop autoplay></lottie-player>
            <span class="text-lg text-black font-medium pt-5">Transaction on chain</span>
            <span class="text-base text-black font-medium underline"><a href={`${$selectedNetwork.blockExplorer}/tx/${txHash?.hash}`} target="_blank">Verify Transaction <IconLibrary icon="link" width={16}/> </a></span>
        </div>
    </div>
{/if}
{#if txStatus == TxStatus.AwaitingToken}
    <div class="flex flex-col items-center p-6" style="background-color: #949494;">
        <div class="flex flex-col justify-center items-center bg-white p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
            <lottie-player src="https://lottie.host/5f90529b-22d1-4337-8c44-46e3ba7c0c68/pgMhlFIAcQ.json" background="transparent" speed="1" style="width: 300px; height: 200px;" loop autoplay></lottie-player>
            <span class="text-lg text-black font-medium pt-5">Loading Token Methods</span>
        </div>
    </div>
{/if}
{#if error != undefined}
    <div class="flex flex-col items-center p-6" style="background-color: #949494;">
        <div class="flex flex-col justify-center items-center bg-white p-4 px-8" style="max-width: 17rem; border-radius: 20px;">
            <span class="text-lg text-black font-medium pt-5">Transaction on chain</span>
            <span class="text-base text-black font-medium underline">{error}</span>
        </div>
    </div>
{/if}
<style>
    button{
        background-color: #FDA742;
        box-shadow: inset 0px 2px 6px 0px #ffffff;
    }
    button:disabled{
        background-color: #D2D2D2;
    }
</style>