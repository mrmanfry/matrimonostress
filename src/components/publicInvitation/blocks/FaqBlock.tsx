import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FaqBlock } from "@/lib/invitationBlocks/types";
import { type WeddingPublicData, applyStyle } from "./_shared";

interface Props {
  block: FaqBlock;
  wedding: WeddingPublicData;
}

export function FaqBlockView({ block, wedding }: Props) {
  if (!block.visible || block.config.items.length === 0) return null;
  const { config, style } = block;
  const primaryColor = style?.accentColor || wedding.theme.primaryColor;
  const { containerStyle, padY } = applyStyle(style, { background: "#fafaf9" });

  return (
    <section className={`${padY} px-6`} style={containerStyle}>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-cormorant text-3xl sm:text-4xl font-light" style={{ color: primaryColor }}>
            {config.title}
          </h2>
          <div className="flex justify-center">
            <HelpCircle className="w-8 h-8 text-stone-400" />
          </div>
        </div>
        <Accordion
          type={config.expandBehavior === "multiple" ? "multiple" : "single"}
          collapsible={config.expandBehavior === "single" ? true : undefined}
          className="w-full"
        >
          {config.items.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="border-stone-200">
              <AccordionTrigger className="text-left text-stone-800 font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-stone-600 leading-relaxed whitespace-pre-line">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
