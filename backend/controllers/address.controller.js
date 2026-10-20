function clean(v) { return String(v ?? '').trim(); }
function validateAddress(a) {
  const errors = [];
  if (clean(a.fullName).length < 2) errors.push('Full name is required.');
  if (!/^\+?\d[\d\s\-().]{7,17}$/.test(clean(a.phone))) errors.push('Valid phone number is required.');
  if (clean(a.house).length < 1) errors.push('House/flat number is required.');
  if (clean(a.street).length < 3) errors.push('Street/locality is required.');
  if (clean(a.city).length < 2) errors.push('City is required.');
  if (clean(a.state).length < 2) errors.push('State is required.');
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{3,11}$/.test(clean(a.pincode))) errors.push('Valid PIN/postal code is required.');
  return errors;
}
function orderAddresses(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const all = (plain.addresses || []).map((x) => ({ ...x, _id: String(x._id), id: String(x._id) }));
  // ONE address per customer. Legacy documents may hold more than one from the
  // old multi-address era; surface only the primary (default, else first) so the
  // UI shows a single saved address WITHOUT a destructive migration. Extra
  // records stay in the database untouched; new creates are blocked outright.
  const primary = all.find((x) => x.isDefault) || all[0] || null;
  return primary ? [primary] : [];
}
class AddressController {
  async list(req, res) {
    return res.status(200).json({ success: true, data: orderAddresses(req.customerDb) });
  }
  async create(req, res) {
    const body = req.body || {};
    const errors = validateAddress(body);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });
    const entry = {
      label: clean(body.label) || 'Home', fullName: clean(body.fullName), phone: clean(body.phone),
      house: clean(body.house), street: clean(body.street), landmark: clean(body.landmark),
      city: clean(body.city), state: clean(body.state), pincode: clean(body.pincode),
      country: clean(body.country) || 'India', isDefault: true,
    };
    const mongoose = (await import('mongoose')).default;
    const { Customer } = await import('../models/customer.model.js');
    if (mongoose.connection?.readyState === 1) {
      // Single-address rule enforced ATOMICALLY: the update only matches when
      // the addresses array is empty, so two concurrent duplicate submissions
      // can never both insert (MongoDB locks the document per update).
      const doc = await Customer.findOneAndUpdate(
        { _id: req.customer.id, $or: [{ addresses: { $size: 0 } }, { addresses: { $exists: false } }] },
        { $push: { addresses: entry } },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) {
        return res.status(409).json({
          success: false,
          message: 'You already have a saved address. Edit it instead of adding another.',
          code: 'ADDRESS_ALREADY_EXISTS',
        });
      }
      const list = orderAddresses(doc);
      return res.status(201).json({ success: true, data: list[list.length - 1], addresses: list });
    }
    const arr = req.customerDb.addresses || (req.customerDb.addresses = []);
    if (arr.length) {
      return res.status(409).json({
        success: false,
        message: 'You already have a saved address. Edit it instead of adding another.',
        code: 'ADDRESS_ALREADY_EXISTS',
      });
    }
    entry.isDefault = true;
    entry._id = `addr-${Date.now()}`; entry.id = entry._id;
    arr.push(entry);
    return res.status(201).json({ success: true, data: entry, addresses: [entry] });
  }
  async update(req, res) {
    const id = String(req.params?.id || '');
    const body = req.body || {};
    const existing = (req.customerDb.addresses || []).find((x) => String(x._id || x.id) === id);
    const merged = { ...(existing && typeof existing.toObject === 'function' ? existing.toObject() : { ...existing }), ...body };
    const errors = validateAddress(merged);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });
    const mongoose = (await import('mongoose')).default;
    const { Customer } = await import('../models/customer.model.js');
    if (mongoose.connection?.readyState === 1) {
      const set = { 'addresses.$.isDefault': true };
      for (const k of ['label','fullName','phone','house','street','landmark','city','state','pincode','country']) if (body[k] !== undefined) set[`addresses.$.${k}`] = clean(body[k]) || (k === 'country' ? 'India' : undefined);
      // Editing must target the ONE saved address; an unknown id is a 404 and
      // can never create a second record (there is no $push on this path).
      const r = await Customer.updateOne({ _id: req.customer.id, 'addresses._id': id }, { $set: set });
      if (!r.matchedCount) {
        return res.status(404).json({ success: false, message: 'Address not found', code: 'ADDRESS_NOT_FOUND' });
      }
      const doc = await Customer.findById(req.customer.id).lean();
      const full = (doc.addresses || []).map((x) => ({ ...x, _id: String(x._id), id: String(x._id) }));
      return res.status(200).json({ success: true, data: full.find((x) => x.id === id) || null, addresses: orderAddresses(doc) });
    }
    const addr = (req.customerDb.addresses || []).find((x) => String(x._id || x.id) === id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found', code: 'ADDRESS_NOT_FOUND' });
    for (const k of ['label','fullName','phone','house','street','landmark','city','state','pincode','country']) if (body[k] !== undefined) addr[k] = clean(body[k]) || addr[k];
    addr.isDefault = true;
    return res.status(200).json({ success: true, data: addr, addresses: [addr] });
  }
  async remove(req, res) {
    // ONE address per customer and it cannot be deleted through the API.
    // The only way to change the saved address is to edit it (PUT), which
    // keeps checkout always addressable. Kept as a registered route so the
    // API contract stays stable — it just refuses with a clear error.
    return res.status(403).json({
      success: false,
      message: 'Your saved address cannot be deleted. Edit it instead.',
      code: 'ADDRESS_DELETE_NOT_ALLOWED',
    });
  }
  async setDefault(req, res) {
    const id = String(req.params?.id || '');
    const mongoose = (await import('mongoose')).default;
    const { Customer } = await import('../models/customer.model.js');
    if (mongoose.connection?.readyState === 1) {
      await Customer.updateOne({ _id: req.customer.id, 'addresses._id': id }, { $set: { 'addresses.$.isDefault': true } });
      const doc = await Customer.findById(req.customer.id).lean();
      if (!(doc.addresses || []).some((x) => String(x._id) === id)) {
        return res.status(404).json({ success: false, message: 'Address not found', code: 'ADDRESS_NOT_FOUND' });
      }
      return res.status(200).json({ success: true, addresses: orderAddresses(doc) });
    }
    const memAddr = (req.customerDb.addresses || []).find((x) => String(x._id || x.id) === id);
    if (!memAddr) return res.status(404).json({ success: false, message: 'Address not found', code: 'ADDRESS_NOT_FOUND' });
    (req.customerDb.addresses || []).forEach((x) => { x.isDefault = String(x._id || x.id) === id; });
    return res.status(200).json({ success: true, addresses: orderAddresses(req.customerDb) });
  }
}

export const addressController = new AddressController();
export const __addrHelpers = { clean, validateAddress, orderAddresses };
