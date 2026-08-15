import { useMemo, useState } from 'react';
import Icon from '../components/Icons';
import './Suppliers.css';

const SUPPLIERS = [
  {
    id: 'ayur-care',
    name: 'Ayur Care Distributors',
    email: 'orders@ayurcare.in',
    phone: '+91 98765 24011',
    leadTimeDays: 3,
    lastSupplied: '12 Aug 2026',
    products: ['Bathing Soap', 'Hand Wash'],
  },
  {
    id: 'freshglow',
    name: 'FreshGlow Personal Care',
    email: 'supply@freshglow.co.in',
    phone: '+91 99887 45120',
    leadTimeDays: 4,
    lastSupplied: '09 Aug 2026',
    products: ['Body Lotion', 'Face Wash'],
  },
  {
    id: 'cleanline',
    name: 'Cleanline Home Essentials',
    email: 'procurement@cleanline.in',
    phone: '+91 91234 77890',
    leadTimeDays: 2,
    lastSupplied: '14 Aug 2026',
    products: ['Dishwash Liquid', 'Floor Cleaner'],
  },
  {
    id: 'sudsmore',
    name: 'SudsMore Wholesale',
    email: 'partners@sudsmore.in',
    phone: '+91 90045 66231',
    leadTimeDays: 5,
    lastSupplied: '07 Aug 2026',
    products: ['Laundry Detergent', 'Toilet Cleaner'],
  },
  {
    id: 'urban-hygiene',
    name: 'Urban Hygiene Supply Co.',
    email: 'hello@urbanhygiene.in',
    phone: '+91 98112 30744',
    leadTimeDays: 7,
    lastSupplied: '02 Aug 2026',
    products: ['Shampoo', 'Toothpaste'],
  },
  {
    id: 'metro-care',
    name: 'Metro Care Logistics',
    email: 'dispatch@metrocare.in',
    phone: '+91 97022 11864',
    leadTimeDays: 4,
    lastSupplied: '11 Aug 2026',
    products: ['Bathing Soap', 'Body Lotion', 'Hand Wash', 'Laundry Detergent'],
  },
];

export default function Suppliers() {
  const [search, setSearch] = useState('');

  const totalProductsSupplied = useMemo(() => {
    const products = new Set();
    SUPPLIERS.forEach((supplier) => supplier.products.forEach((product) => products.add(product)));
    return products.size;
  }, []);

  const averageLeadTime = useMemo(() => {
    const totalLeadTime = SUPPLIERS.reduce((total, supplier) => total + supplier.leadTimeDays, 0);
    return Math.round(totalLeadTime / SUPPLIERS.length);
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return SUPPLIERS;

    return SUPPLIERS.filter((supplier) => (
      supplier.name.toLowerCase().includes(query)
      || supplier.email.toLowerCase().includes(query)
      || supplier.phone.toLowerCase().includes(query)
      || supplier.products.some((product) => product.toLowerCase().includes(query))
    ));
  }, [search]);

  return (
    <div className="sup-page">
      <section className="sup-summary-grid" aria-label="Supplier summary">
        <div className="sup-summary-card">
          <span>Total Suppliers</span>
          <strong>{SUPPLIERS.length}</strong>
        </div>
        <div className="sup-summary-card">
          <span>Total Products Supplied</span>
          <strong>{totalProductsSupplied}</strong>
        </div>
        <div className="sup-summary-card">
          <span>Average Lead Time</span>
          <strong>{averageLeadTime}d</strong>
        </div>
      </section>

      <section className="sup-card">
        <div className="sup-toolbar">
          <div className="sup-search-wrap">
            <Icon name="search" size={16} className="sup-search-icon" />
            <input
              type="text"
              className="sup-search"
              placeholder="Search suppliers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <span className="sup-result-count">{filteredSuppliers.length} of {SUPPLIERS.length} suppliers</span>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="sup-empty">
            <Icon name="inbox" size={32} />
            <p>No suppliers found matching your search.</p>
          </div>
        ) : (
          <div className="sup-grid">
            {filteredSuppliers.map((supplier) => (
              <article className="sup-supplier-card" key={supplier.id}>
                <div className="sup-card-top">
                  <div className="sup-avatar">
                    <Icon name="truck" size={18} />
                  </div>
                </div>

                <div className="sup-info">
                  <h3>{supplier.name}</h3>
                  <a href={`mailto:${supplier.email}`}>{supplier.email}</a>
                  <a href={`tel:${supplier.phone.replaceAll(' ', '')}`}>{supplier.phone}</a>
                </div>

                <div className="sup-products">
                  <h4>Products Supplied</h4>
                  <ul>
                    {supplier.products.map((product) => (
                      <li key={product}>{product}</li>
                    ))}
                  </ul>
                </div>

                <div className="sup-meta-grid">
                  <div>
                    <span>Lead Time</span>
                    <strong>{supplier.leadTimeDays} days</strong>
                  </div>
                  <div>
                    <span>Products</span>
                    <strong>{supplier.products.length}</strong>
                  </div>
                  <div>
                    <span>Last Supplied</span>
                    <strong>{supplier.lastSupplied}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
