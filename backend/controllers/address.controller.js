function clean(v) { return String(v ?? '').trim(); }
function validateAddress(a) {
  const errors = [];
  if (clean(a.fullName).length < 2) errors.push('Full name is required.');
  if (!/^\+?\d[\d\s\-().]{7,17}$/.test(clean(a.phone))) errors.push('Valid phone number is required.');
  if (clean(a.house).length < 1) errors.push('House/flat number is required.');
  if (clean(a.street).length < 3) errors.push('Street/locality is required.');
  if (clean(a.city).length < 2) errors.push('City is required.');
  if (clean(a.state).length < 2) errors.push('State is required.');
  if (!/^[A-Za-z0-9][A-Za-z0-9 \-]{3,11}$/.test(clean(a.pincode))) errors.push('Valid PIN/postal code is required.');
  return errors;
}
function orderAddresses(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return (plain.addresses || []).map((x) => ({ ...x, _id: String(x._id), id: String(x._id) }));
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
      country: clean(body.country) || 'India', isDefault: Boolean(body.isDefault),
    };
    const mongoose = (await import('mongoose')).default;
    const { Customer } = await import('../models/customer.model.js');
    if (mongoose.connection?.readyState === 1) {
      if (entry.isDefault) await Customer.updateOne({ _id: req.customer.id }, { $set: { 'addresses.$[].isDefault': false } });
      const doc = await Customer.findByIdAndUpdate(req.customer.id, { $push: { addresses: entry } }, { new: true, runValidators: true }).lean();
      const list = orderAddresses(doc);
      return res.status(201).json({ success: true, data: list[list.length - 1], addresses: list });
    }
    const arr = req.customerDb.addresses || (req.customerDb.addresses = []);
    if (entry.isDefault) arr.forEach((x) => { x.isDefault = false; });
    if (!arr.length) entry.isDefault = true;
    entry._id = `addr-${Date.now()}`; entry.id = entry._id;
    arr.push(entry);
    return res.status(201).json({ success: true, data: entry, addresses: arr });
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
      if (body.isDefault === true) await Customer.updateOne({ _id: req.customer.id }, { $set: { 'addresses.$[].isDefault': false } });
      const set = {};
      for (const k of ['label','fullName','phone','house','street','landmark','city','state','pincode','country']) if (body[k] !== undefined) set[`addresses.$.${k}`] = clean(body[k]) || (k === 'country' ? 'India' : undefined);
      if (body.isDefault !== undefined) set['addresses.$.isDefault'] = Boolean(body.isDefault);
      await Customer.updateOne({ _id: req.customer.id, 'addresses._id': id }, { $set: set });
      const doc = await Customer.findById(req.customer.id).lean();
      const list = orderAddresses(doc);
      return res.status(200).json({ success: true, data: list.find((x) => x.id === id) || null, addresses: list });
    }
    const addr = (req.customerDb.addresses || []).find((x) => String(x._id || x.id) === id);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });
    for (const k of ['label','fullName','phone','house','street','landmark','city','state','pincode','country']) if (body[k] !== undefined) addr[k] = clean(body[k]) || addr[k];
    if (body.isDefault === true) req.customerDb.addresses.forEach((x) => { x.isDefault = String(x._id || x.id) === id; });
    return res.status(200).json({ success: true, data: addr, addresses: req.customerDb.addresses });
  }
  async remove(req, res) {
    const id = String(req.params?.id || '');
    const mongoose = (await import('mongoose')).default;
    const { Customer } = await import('../models/customer.model.js');
    if (mongoose.connection?.readyState === 1) {
      await Customer.updateOne({ _id: req.customer.id }, { $pull: { addresses: { _id: id } } });
      const doc = await Customer.findById(req.customer.id).lean();
      return res.status(200).json({ success: true, addresses: orderAddresses(doc) });
    }
    req.customerDb.addresses = (req.customerDb.addresses || []).filter((x) => String(x._id || x.id) !== id);
    return res.status(200).json({ success: true, addresses: req.customerDb.addresses });
  }
  async setDefault(req, res) {
    const id = String(req.params?.id || '');
    const mongoose = (await import('mongoose')).default;
    const { Customer } = await import('../models/customer.model.js');
    if (mongoose.connection?.readyState === 1) {
      await Customer.updateOne({ _id: req.customer.id }, { $set: { 'addresses.$[].isDefault': false } });
      await Customer.updateOne({ _id: req.customer.id, 'addresses._id': id }, { $set: { 'addresses.$.isDefault': true } });
      const doc = await Customer.findById(req.customer.id).lean();
      return res.status(200).json({ success: true, addresses: orderAddresses(doc) });
    }
    (req.customerDb.addresses || []).forEach((x) => { x.isDefault = String(x._id || x.id) === id; });
    return res.status(200).json({ success: true, addresses: req.customerDb.addresses || [] });
  }
}

export const addressController = new AddressController();
export const __addrHelpers = { clean, validateAddress, orderAddresses };
