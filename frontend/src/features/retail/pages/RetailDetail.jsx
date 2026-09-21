import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuCheck, LuShoppingBag, LuMessageSquare } from 'react-icons/lu';
import { getRetailProductBySlug } from '../api/retail.api';
import { useCart } from '../../../shared/hooks/useCart';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import { Button } from '../../../shared/components/Button';
import Badge from '../../../shared/components/Badge';
import Skeleton from '../../../shared/components/Skeleton';
import NotFoundState from '../../../shared/components/NotFoundState';
import ErrorState from '../../../shared/components/ErrorState';
import Seo from '../../../shared/components/Seo';

export const RetailDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, openDrawer } = useCart();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRetailProductBySlug(slug);
      if (res.success && res.data) {
        setProduct(res.data);
        const initialImg =
          (res.data.images && res.data.images[0]) || res.data.image || '';
        setSelectedImage(initialImg);
      } else if (res.data) {
        setProduct(res.data);
        const initialImg =
          (res.data.images && res.data.images[0]) || res.data.image || '';
        setSelectedImage(initialImg);
      } else {
        setProduct(null);
      }
    } catch (err) {
      if (err.status === 404) {
        setProduct(null);
      } else {
        setError(err.message || 'Failed to load catalog edition.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full py-16 sm:py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-8">
          <Skeleton width="140px" height="20px" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7">
              <Skeleton height="560px" />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <Skeleton width="30%" height="24px" />
              <Skeleton width="80%" height="40px" />
              <Skeleton width="40%" height="32px" />
              <Skeleton height="100px" />
              <Skeleton height="200px" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <ErrorState
            title="Failed to Load Edition"
            message={error}
            retryAction={fetchProduct}
          />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full py-24 bg-white">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12">
          <NotFoundState
            title="Object Not Found"
            message="The requested edition could not be located in our active retail catalog."
            backTo="/retail"
            backLabel="Back to Retail Catalog"
          />
        </div>
      </div>
    );
  }

  const isOutOfStock = product.inStock === false || product.stock === 0;
  const imageGallery =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.image].filter(Boolean);

  const mainImageUrl = buildCloudinaryUrl(selectedImage || product.image, {
    width: 900,
    height: 900,
  });

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity);
    setJustAdded(true);
    openDrawer();
    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleDirectInquiry = () => {
    navigate('/contact');
  };

  return (
    <div className="w-full bg-white">
      <Seo
        title={`${product.title} · Bespoke Edition`}
        description={product.description || `Bespoke furniture edition by Sabr Studio: ${product.title}.`}
        image={selectedImage || product.image}
      />

      <article className="py-12 sm:py-20 border-b border-border">
        <div className="max-w-container-wide mx-auto px-5 sm:px-8 lg:px-12 space-y-10">
          {/* Back link */}
          <div>
            <Link
              to="/retail"
              className="inline-flex items-center text-xs uppercase tracking-widest text-muted hover:text-ink transition-colors font-medium"
            >
              <LuArrowLeft className="mr-2 w-4 h-4" />
              Back to Catalog
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left: Main Image (aspect 1/1, cream/surface bg) + thumbnail strip */}
            <div className="lg:col-span-7 space-y-4">
              <div className="aspect-square bg-surface border border-border rounded-md overflow-hidden p-8 sm:p-12 flex items-center justify-center">
                <img
                  src={mainImageUrl}
                  alt={product.title}
                  loading="eager"
                  fetchpriority="high"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Thumbnail Strip */}
              {imageGallery.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  {imageGallery.map((img, idx) => {
                    const isSelected = img === selectedImage;
                    const thumbUrl = buildCloudinaryUrl(img, { width: 160, height: 160 });
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImage(img)}
                        className={`w-20 h-20 shrink-0 border rounded-sm overflow-hidden p-1 bg-surface transition-all ${
                          isSelected
                            ? 'border-black ring-1 ring-black'
                            : 'border-border opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={thumbUrl}
                          alt={`${product.title} thumb ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Category, Title, Price, Specs, Add to Bag */}
            <div className="lg:col-span-5 space-y-8">
              {/* Heading and Price */}
              <div className="space-y-4 pb-6 border-b border-border">
                <div className="flex items-center space-x-2.5">
                  <Badge variant="default">{product.category}</Badge>
                  {isOutOfStock ? (
                    <Badge variant="error">Sold Out</Badge>
                  ) : product.madeToOrder ? (
                    <Badge variant="brown">Made to Order</Badge>
                  ) : (
                    <Badge variant="success">In Stock</Badge>
                  )}
                </div>

                <h1 className="font-abhaya text-4xl sm:text-5xl font-medium text-ink leading-tight">
                  {product.title}
                </h1>

                <div className="font-inter text-2xl sm:text-3xl font-medium text-ink">
                  {formatPrice(product.price)}
                </div>

                <p className="font-inter text-xs text-muted">
                  Includes applicable GST. White-glove installation and regional freight calculated at dispatch.
                </p>
              </div>

              {/* Description */}
              <div className="font-inter text-sm sm:text-base text-muted leading-relaxed">
                <p>{product.description}</p>
              </div>

              {/* Specifications Table */}
              <div className="bg-surface border border-border p-6 rounded-md space-y-3 text-xs">
                <div className="uppercase tracking-widest font-semibold text-ink pb-2 border-b border-border">
                  Craft & Dimensions
                </div>
                <div className="space-y-2.5 divide-y divide-border">
                  {product.dimensions && (
                    <div className="flex justify-between items-baseline pt-2">
                      <span className="text-muted">Dimensions</span>
                      <span className="font-medium text-ink text-right">{product.dimensions}</span>
                    </div>
                  )}
                  {product.materials && (
                    <div className="flex justify-between items-baseline pt-2">
                      <span className="text-muted">Primary Materials</span>
                      <span className="font-medium text-ink text-right max-w-[200px]">{product.materials}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-muted">Lead Time</span>
                    <span className="font-medium text-ink text-right">
                      {product.madeToOrder ? '6–8 Weeks (Made to Order)' : 'Dispatches within 5–7 Days'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-muted">Care Guidelines</span>
                    <span className="font-medium text-ink text-right">Natural beeswax or dry cloth</span>
                  </div>
                </div>
              </div>

              {/* Quantity Selector & Action Buttons */}
              <div className="space-y-4 pt-2">
                {!isOutOfStock && (
                  <div className="flex items-center space-x-4">
                    <span className="text-xs uppercase tracking-wider text-muted font-medium">
                      Quantity:
                    </span>
                    <div className="inline-flex items-center border border-border bg-white rounded-none">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="px-3 py-1.5 text-ink hover:bg-surface text-sm"
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 font-inter text-sm font-medium text-ink select-none">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="px-3 py-1.5 text-ink hover:bg-surface text-sm"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    variant="Primary"
                    fullWidth
                    size="default"
                    icon={justAdded ? LuCheck : LuShoppingBag}
                    iconPosition="left"
                    label={
                      isOutOfStock
                        ? 'Currently Unavailable'
                        : justAdded
                        ? 'Added to Bag'
                        : 'Add to Bag'
                    }
                  />

                  <Button
                    onClick={handleDirectInquiry}
                    variant="Secondary-Outline"
                    fullWidth
                    size="default"
                    icon={LuMessageSquare}
                    iconPosition="left"
                    label="Direct Studio Inquiry"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default RetailDetail;
