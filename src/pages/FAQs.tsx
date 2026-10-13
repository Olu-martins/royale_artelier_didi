import React from 'react';
import Layout from '@/components/layout/Layout';
import PageBreadcrumbs from '@/components/layout/PageBreadcrumbs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQs = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <PageBreadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'FAQs' },
          ]}
        />
        <h1 className="text-4xl font-display font-bold mb-8">Frequently Asked Questions</h1>
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How long does shipping take?</AccordionTrigger>
              <AccordionContent>
                Standard shipping typically takes 3-5 business days within the continental US.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What is your return policy?</AccordionTrigger>
              <AccordionContent>
                You can return any unworn, unwashed items with original tags within 30 days.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How do I track my order?</AccordionTrigger>
              <AccordionContent>
                Once your order ships, you'll receive an email with a tracking link.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Layout>
  );
};

export default FAQs;
