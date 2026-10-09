import React, { useState, useEffect } from 'react';
import TextInput from '../../../shared/components/TextInput';
import Select from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { LuX } from 'react-icons/lu';

const EMPTY = { label: 'Home', fullName: '', phone: '', house: '', street: '', landmark: '', city: '', state: '', pincode: '', country: 'India' };
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Jammu and Kashmir','Ladakh','Chandigarh','Puducherry','Andaman and Nicobar Islands'];

export const AddressModal = ({ open, initial, saving, error, onClose, onSave }) => {
  const [form, setForm] = useState(EMPTY);
  const [localError, setLocalError] = useState('');
  useEffect(() => {
    if (open) { setForm({ ...EMPTY, ...(initial || {}) }); setLocalError(''); }
  }, [open]);
  if (!open) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    const req = [['fullName','Full name'],['phone','Phone'],['house','House/flat'],['street','Street/locality'],['city','City'],['state','State'],['pincode','PIN code']];
    for (const [k, label] of req) {
      if (!String(form[k] || '').trim()) { setLocalError(`${label} is required.`); return; }
    }
    if (!/^\+?\d[\d\s\-().]{7,17}$/.test(String(form.phone).trim())) { setLocalError('Please enter a valid phone number.'); return; }
    onSave?.(form);
  };
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 py-8">
        <div className="relative bg-white border border-border rounded-md w-full max-w-lg p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-abhaya text-2xl text-ink font-medium">{initial?._id || initial?.id ? 'Edit Address' : 'Add Delivery Address'}</h3>
            <button type="button" onClick={onClose} className="p-2 text-muted hover:text-ink" aria-label="Close address form"><LuX className="w-5 h-5" /></button>
          </div>
          {(localError || error) && (
            <div role="alert" className="p-3 bg-error/5 border border-error/20 text-error text-xs rounded-sm">{localError || error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput id="addr-name" label="Full Name" required value={form.fullName} onChange={set('fullName')} placeholder="Aarav Sharma" autoComplete="name" />
              <TextInput id="addr-phone" label="Phone" required value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" autoComplete="tel" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput id="addr-house" label="House / Flat No." required value={form.house} onChange={set('house')} placeholder="B-42, 2nd Floor" />
              <TextInput id="addr-street" label="Street / Locality" required value={form.street} onChange={set('street')} placeholder="Defence Colony" />
            </div>
            <TextInput id="addr-landmark" label="Landmark (Optional)" value={form.landmark} onChange={set('landmark')} placeholder="Near main market" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput id="addr-city" label="City" required value={form.city} onChange={set('city')} placeholder="New Delhi" autoComplete="address-level2" />
              <Select id="addr-state" label="State" required value={form.state} onChange={set('state')} options={STATES} placeholder="Select state" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput id="addr-pin" label="PIN Code" required value={form.pincode} onChange={set('pincode')} placeholder="110024" autoComplete="postal-code" />
              <TextInput id="addr-country" label="Country" value={form.country} onChange={set('country')} placeholder="India" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="Secondary-Outline" label="Cancel" onClick={onClose} />
              <Button type="submit" variant="Primary" loading={saving} label={initial?._id || initial?.id ? 'Save Changes' : 'Save Address'} />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default AddressModal;
