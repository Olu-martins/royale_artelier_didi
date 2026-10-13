import React from 'react';
import Layout from '@/components/layout/Layout';
import PageBreadcrumbs from '@/components/layout/PageBreadcrumbs';

const ShippingReturns = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <PageBreadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Shipping & Returns' },
          ]}
        />
        <h1 className="text-4xl font-display font-bold mb-8">Shipping & Returns</h1>
        <div className="prose max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Shipping Information</h2>
            <p>We offer free standard shipping on all orders over $150.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Standard Shipping: 3-5 business days - $10</li>
              <li>Express Shipping: 1-2 business days - $25</li>
              <li>International Shipping: 7-14 business days - $40</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">Returns Policy</h2>
            <p>We accept returns within 30 days of purchase for items in original condition.</p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default ShippingReturns;
