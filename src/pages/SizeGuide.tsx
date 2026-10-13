import React from 'react';
import Layout from '@/components/layout/Layout';
import PageBreadcrumbs from '@/components/layout/PageBreadcrumbs';

const SizeGuide = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <PageBreadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Size Guide' },
          ]}
        />
        <h1 className="text-4xl font-display font-bold mb-8">Size Guide</h1>
        <div className="max-w-4xl overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border p-4 text-left">Size</th>
                <th className="border p-4 text-left">Bust (in)</th>
                <th className="border p-4 text-left">Waist (in)</th>
                <th className="border p-4 text-left">Hips (in)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-4">XS</td>
                <td className="border p-4">32-33</td>
                <td className="border p-4">24-25</td>
                <td className="border p-4">34-35</td>
              </tr>
              <tr>
                <td className="border p-4">S</td>
                <td className="border p-4">34-35</td>
                <td className="border p-4">26-27</td>
                <td className="border p-4">36-37</td>
              </tr>
              <tr>
                <td className="border p-4">M</td>
                <td className="border p-4">36-37</td>
                <td className="border p-4">28-29</td>
                <td className="border p-4">38-39</td>
              </tr>
              <tr>
                <td className="border p-4">L</td>
                <td className="border p-4">38-40</td>
                <td className="border p-4">30-32</td>
                <td className="border p-4">40-42</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default SizeGuide;
