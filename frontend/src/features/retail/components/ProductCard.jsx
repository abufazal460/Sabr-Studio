import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useCart } from '../../../shared/hooks/useCart';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import { Button } from '../../../shared/components/Button';
import Badge from '../../../shared/components/Badge';
import { LuCheck, LuShoppingBag } from 'react-icons/lu';

export const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const reduce = useReducedMotion();
  const [justAdded, setJustAdded] = useState(false);

  const imageUrl = buildCloudinaryUrl(product.image || product.images?.[0], {
    width: 700,
    height: 700,
  });

  const isOutOfStock = product.inStock === false || product.stock === 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="group border border-border bg-white rounded-md flex flex-col justify-between overflow-hidden hover:border-ink hover:shadow-hover transition-[border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none motion-reduce:hover:border-border motion-reduce:hover:shadow-none">
      <Link to={`/retail/${product.slug}`} className="block focus:outline-none">
        {/* Square Image container with subtle cream/surface bg */}
        <div className="aspect-square bg-surface overflow-hidden p-6 flex items-center justify-center border-b border-border/50">
          {imageUrl ? (
            <motion.img
              src={imageUrl}
              alt={product.title}
              loading="lazy"
              whileHover={reduce ? undefined : { scale: 1.04 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full h-full object-cover object-center will-change-transform motion-reduce:transform-none"
            />
          ) : null}
        </div>

        {/* Product Details */}
        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="default">{product.category}</Badge>
            {isOutOfStock ? (
              <Badge variant="error">Sold Out</Badge>
            ) : product.madeToOrder ? (
              <Badge variant="brown">Made to Order</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
          </div>

          <h3 className="font-abhaya text-2xl text-ink font-medium transition-colors duration-200 ease-out group-hover:text-black motion-reduce:transition-none line-clamp-1">
            {product.title}
          </h3>

          <p className="font-inter text-xs text-muted line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <div className="pt-2 flex items-baseline justify-between">
            <span className="font-inter text-lg font-medium text-ink">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>
      </Link>

      {/* Card Action */}
      <div className="p-6 pt-0">
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          variant={justAdded ? 'Primary' : 'Secondary-Outline'}
          size="sm"
          fullWidth
          icon={justAdded ? LuCheck : LuShoppingBag}
          iconPosition="left"
          label={
            isOutOfStock
              ? 'Unavailable'
              : justAdded
              ? 'Added to Bag'
              : 'Add to Bag'
          }
        />
      </div>
    </div>
  );
};

export default ProductCard;
