import React, { useState, useEffect } from 'react';
import { getRetailProducts } from '../api/retail.api';
import ProductCard from '../components/ProductCard';
import SectionHeading from '../../../shared/components/SectionHeading';
import Skeleton from '../../../shared/components/Skeleton';
import EmptyState from '../../../shared/components/EmptyState';
import ErrorState from '../../../shared/components/ErrorState';
import Seo from '../../../shared/components/Seo';

const categories = ['All', 'Chairs', 'Tables', 'Lighting', 'Storage', 'Sofas', 'Objects'];

export const RetailListing = () => {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRetailProducts();
      if (res.success && Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve retail catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory.endsWith('s') &&
        p.category?.toLowerCase() === selectedCategory.slice(0, -1).toLowerCase());

    const matchesStock = !inStockOnly || (p.inStock !== false && p.stock !== 0);

    return matchesCategory && matchesStock;
  });

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setInStockOnly(false);
  };

  return (
    <div className="w-full bg-white">
      <Seo
        title="Retail Catalog · Bespoke Furniture & Objects"
        description="Limited-edition monolithic dining tables, sculptural seating, and artisan lighting designed by Sabr Studio and handcrafted in New Delhi."
      />

      <section className="py-20 sm:py-28 border-b border-border" aria-label="Retail Catalog">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <SectionHeading
              eyebrow="Editions & Objects"
              title="Bespoke Furniture & Objects"
              description="Studio-designed monolithic tables, sculptural lounge seating, and hand-thrown ceramic luminaires fabricated to order in our New Delhi workshop."
              as="h1"
            />
          </div>

          {/* Filters Bar: Category Pills + In-Stock Toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-border mb-12">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs uppercase tracking-wider px-4 py-2 transition-colors font-medium border rounded-full ${
                    selectedCategory === cat
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-muted border-border hover:text-black hover:border-black'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* In-Stock Only Toggle */}
            <label className="flex items-center space-x-2.5 cursor-pointer text-xs uppercase tracking-wider text-muted font-medium select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded-none accent-black border-border cursor-pointer"
              />
              <span>In Stock Only</span>
            </label>
          </div>

          {/* Grid / Skeletons / States */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4 border border-border p-6 rounded-md">
                  <Skeleton height="280px" />
                  <Skeleton width="40%" height="20px" />
                  <Skeleton width="70%" height="24px" />
                  <Skeleton width="30%" height="20px" />
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState
              title="Unable to load retail catalog"
              message={error}
              retryAction={fetchProducts}
            />
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              title="No objects matched your criteria"
              message="Try resetting your category or availability filters to browse our full studio collection."
              actionLabel="Reset Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id || product.slug} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RetailListing;
