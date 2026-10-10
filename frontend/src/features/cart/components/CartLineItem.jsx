import React from 'react';
import { LuTrash2, LuMinus, LuPlus } from 'react-icons/lu';
import { useCart } from '../../../shared/hooks/useCart';
import { formatPrice } from '../../../shared/utils/formatPrice';
import { buildCloudinaryUrl } from '../../../shared/utils/buildCloudinaryUrl';
import { Button } from '../../../shared/components/Button';

export const CartLineItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  const imageUrl = buildCloudinaryUrl(item.image || item.images?.[0] || item.coverImage, {
    width: 160,
    height: 160,
  });

  return (
    <div className="flex flex-col xs:flex-row items-start gap-3 sm:gap-4 py-4 border-b border-border">
      {/* Product Image */}
      <div className="w-full xs:w-20 sm:w-24 h-28 xs:h-20 sm:h-24 bg-cream rounded-sm border border-border/60 overflow-hidden shrink-0 p-1 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={item.name || item.title}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      {/* Product Info + Controls */}
      <div className="flex-1 min-w-0 w-full space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-abhaya text-base sm:text-lg text-ink font-medium line-clamp-2 break-words">
              {item.name || item.title}
            </h4>
            <div className="text-xs text-muted mt-0.5">
              {formatPrice(item.price)} each
            </div>
          </div>
          {/* Line total — always visible */}
          <div className="text-sm sm:text-base font-medium text-ink text-right shrink-0 whitespace-nowrap">
            {formatPrice(item.price * item.quantity)}
          </div>
        </div>

        {/* Quantity + Remove */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center border border-border rounded-sm">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-2 sm:p-1.5 text-muted hover:text-ink focus:outline-none touch-manipulation"
              aria-label="Decrease quantity"
            >
              <LuMinus className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 sm:px-2 text-xs font-medium text-ink min-w-[28px] text-center select-none">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-2 sm:p-1.5 text-muted hover:text-ink focus:outline-none touch-manipulation"
              aria-label="Increase quantity"
            >
              <LuPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => removeFromCart(item.id)}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-error transition-colors p-1 touch-manipulation"
            aria-label={`Remove ${item.name || item.title} from bag`}
          >
            <LuTrash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartLineItem;
