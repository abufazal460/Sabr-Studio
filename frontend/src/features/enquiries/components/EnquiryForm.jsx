import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { createEnquiry } from '../api/enquiries.api';
import { validateEnquiryForm } from '../../../shared/utils/validators';
import TextInput from '../../../shared/components/TextInput';
import TextArea from '../../../shared/components/TextArea';
import { Button } from '../../../shared/components/Button';
import { LuCircleCheck, LuCircleAlert } from 'react-icons/lu';

export const EnquiryForm = ({
  title = 'Start a Consultation',
  subtitle = 'Tell us about your space, architectural vision, or retail commission.',
  className = '',
}) => {
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateEnquiryForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        message: formData.message.trim(),
        sourceRoute: location.pathname || '/',
      };

      const res = await createEnquiry(payload);
      if (res.success !== false) {
        setSubmitSuccess(true);
        setFormData({ name: '', email: '', phone: '', message: '' });
        setErrors({});
      } else {
        setServerError(res.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setServerError(
        err.message || 'A network error occurred. Please try again or email us directly.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white border border-border p-8 sm:p-12 lg:p-16 rounded-md ${className}`}
    >
      <div className="max-w-2xl">
        {title && (
          <h3 className="font-abhaya text-3xl sm:text-4xl text-ink font-medium tracking-tight mb-2">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm sm:text-base text-muted mb-8 leading-relaxed">
            {subtitle}
          </p>
        )}

        {submitSuccess ? (
          <div
            role="status"
            className="p-8 bg-surface border border-success/30 rounded-md text-ink space-y-4"
          >
            <div className="flex items-center space-x-3 text-success">
              <LuCircleCheck className="w-6 h-6 shrink-0" />
              <h4 className="font-abhaya text-2xl font-medium">
                Enquiry Successfully Received
              </h4>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Thank you for reaching out to Sabr Studio. Our principal designer will review your architectural brief and contact you within two business days.
            </p>
            <div className="pt-2">
              <Button
                label="Submit Another Inquiry"
                variant="Secondary-Outline"
                size="sm"
                onClick={() => setSubmitSuccess(false)}
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {serverError && (
              <div
                role="alert"
                className="p-4 bg-error/5 border border-error/20 text-error text-xs rounded-sm flex items-start space-x-2.5"
              >
                <LuCircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <TextInput
              id="enquiry-name"
              name="name"
              label="Full Name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Anandita Verma"
              error={errors.name}
              autoComplete="name"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <TextInput
                id="enquiry-email"
                name="email"
                type="email"
                label="Email Address"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="anandita@example.com"
                error={errors.email}
                autoComplete="email"
              />

              <TextInput
                id="enquiry-phone"
                name="phone"
                type="tel"
                label="Phone Number"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98110 00000"
                error={errors.phone}
                autoComplete="tel"
              />
            </div>

            <TextArea
              id="enquiry-message"
              name="message"
              label="Project Scope or Message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about the site location, approximate floor area, and your timeline expectations..."
              error={errors.message}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="Primary"
                label="Submit Inquiry"
                loading={submitting}
                className="w-full sm:w-auto min-w-[200px]"
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EnquiryForm;
