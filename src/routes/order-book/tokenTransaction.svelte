<script lang="ts">
    import { onMount } from "svelte";
    import Section from "./Section.svelte";
    import { img } from "$routes/assets";
    import Button from "$components/Button.svelte";
    import Input from "$components/Input.svelte";
    import { required } from "$src/validation";
    import * as Sentry from "@sentry/svelte";
    import { BigNumber, ethers } from "ethers";
    import { signer, signerAddress } from "svelte-ethers-store";
    import erc20ABI from "./erc20ABI.json" 
    import { Logger, parseUnits } from "ethers/lib/utils";

    export let token, orderBookContract, toggleToken
    let calcAllowance, txReceipt, isWithdrawable
    let depositUnits, withdrawUnits, tokenContract, transCancel = false

    
    
    onMount(async () => { 
        console.log("token : " , token?.tokenVault?.token.id)

        let tokenC = new ethers.Contract(token?.tokenVault?.token.id, erc20ABI, $signer)
        tokenContract = tokenC
        calcAllowance = await checkAllowance(tokenC) 
        console.log("calcAllowance : " , calcAllowance)
    })

    const checkAllowance =async (tokenC) => {
        let priceAllow = await tokenC.allowance($signerAddress.toLowerCase(), orderBookContract.address);

        return {
            priceAllow
        }
    }
    $: if(token){
        isWithdrawable = BigNumber.from(token?.tokenVault?.balance).gt(BigNumber.from(0));
        
    }

    const approve =async () => {
        
        let tx;
        try {
        tx = await tokenContract.approve(orderBookContract.address, ethers.constants.MaxUint256);  
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

            //   txStatus = TxStatus.AwaitingConfirmation;
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

        //   txStatus = TxStatus.AwaitingConfirmation;
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

        return txReceipt;
    };

</script>
<div class="flex justify-center items-center py-10 " style="background-color: #949494;">
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
                        <div class="flex justify-center underline text-white py-2 font-light" style="font-size: 14px;" >{"MAX X.XXXXX("+ token?.tokenVault?.token?.symbol + ")"}</div>
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
                        <div class="flex justify-center underline text-white py-2 font-light" style="font-size: 14px;" >{"MAX X.XXXXX("+ token?.tokenVault?.token?.symbol + ")"}</div>
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
                </div>
            {/if}
        {/await}
    {/if}
</div>
<!--  -->
<style>
    button{
        background-color: #FDA742;
        box-shadow: inset 0px 2px 6px 0px #ffffff;
    }
    button:disabled{
        background-color: #D2D2D2;
    }
</style>