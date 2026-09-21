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
    <div className="flex items-center space-x-4 py-4 border-b border-border">
      <div className="w-20 h-20 bg-cream rounded-sm border border-border/60 overflow-hidden shrink-0 p-1 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={item.name || item.title}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="font-abhaya text-lg text-ink truncate font-medium">
          {item.name || item.title}
        </h4>
        <div className="text-xs text-muted">
          {formatPrice(item.price)}
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <div className="flex items-center border border-border rounded-sm">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-1 text-muted hover:text-ink focus:outline-none"
              aria-label="Decrease quantity"
            >
              <LuMinus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-medium text-ink min-w-[24px] text-center">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-1 text-muted hover:text-ink focus:outline-none"
              aria-label="Increase quantity"
            >
              <LuPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="Secondary-Text"
            onClick={() => removeFromCart(item.id)}
            className="text-xs text-muted hover:text-error ml-2"
          >
            Remove
          </Button>
        </div>
      </div>

      <div className="text-sm font-medium text-ink text-right shrink-0">
        {formatPrice(item.price * item.quantity)}
      </div>
    </div>
  );
};

export default CartLineItem;
