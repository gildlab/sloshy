<script lang="ts">
    import Section from "$routes/order-book/Section.svelte";
    import { img } from "$routes/assets";
    import FAQs from './faq.json'

    export let params: {
        wild: string;
    }; 
    
</script> 

<div class="flex items-center justify-center" style="max-width: 60rem;">
    <Section>
        <div class="px-12 pt-12 pb-2">
            <img src={img['sloshy_comic']} alt="Sloshy Comic" width="900" height="550" />
        </div>
        <div class="text-black py-2 pb-20 px-20">
            <div class="pb-8 text-xs">(Essentially it’s on you to chose reputable coins).</div>
            <div class="font-semibold text-base pb-2">FAQ</div>
            {#each FAQs as faq}
            <div class="py-4">
                <div class="font-semibold text-base pb-2">{faq.question} </div>
                <div class="text-sm whitespace-pre-line">{faq.answer} </div>
                {#if faq.note}
                    <div class="text-sm whitespace-pre-line pt-4">
                        <span class="font-semibold">Note:</span>
                        {faq.note}
                    </div>
                {/if} 
                {#if faq.listHead}
                    <div class="text-sm whitespace-pre-line pt-4 underline">
                        {faq.listHead}
                    </div>
                {/if} 
                {#if faq.list}
                    {#each faq.list as ls}
                    <div class="text-sm whitespace-pre-line pt-2">
                        <div class="">{ls.data}</div>
                    </div>
                    {/each}
                {/if} 
                {#if faq.remainAnswer}
                    <div class="text-sm whitespace-pre-line pt-2">
                        {faq.remainAnswer}
                    </div>
                {/if} 

            </div>
            {/each}
        </div>
    </Section>
</div> 