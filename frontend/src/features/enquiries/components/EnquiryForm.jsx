import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { createEnquiry } from '../api/enquiries.api';
import { validateEnquiryForm } from '../../../shared/utils/validators';
import TextInput from '../../../shared/components/TextInput';
import TextArea from '../../../shared/components/TextArea';
import Select from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';
import { LuCircleCheck, LuCircleAlert } from 'react-icons/lu';
import { useReducedMotion } from '../../../shared/hooks/useReducedMotion';
import { fadeUpProps } from '../../../shared/animations/reveal';
import { servicesData } from '../../services/data/services.data';

// Reuse the studio's existing service categories as Project Type options.
const projectTypeOptions = servicesData.services.map((s) => ({
  value: s.title,
  label: s.title,
}));

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  projectType: '',
  message: '',
};

export const EnquiryForm = ({ title = 'Send Us a Message', subtitle, className = '' }) => {
  const location = useLocation();
  const reduce = useReducedMotion();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear a field's error as soon as the user edits it.
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Validate a single field on blur, using the shared validator so rules stay in one place.
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fieldErrors = validateEnquiryForm({ ...formData, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions
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
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        projectType: formData.projectType,
        message: formData.message.trim(),
        sourceRoute: location.pathname || '/',
      };

      const res = await createEnquiry(payload);
      // STRICT: success UI only when backend confirms DB save + email delivery.
      // Any success:false body (email/config/validation/database failure) → error UI.
      if (res && res.success === true && res.code !== 'EMAIL_FAILURE' && res.code !== 'EMAIL_CONFIG_MISSING') {
        setSubmitSuccess(true);
        setFormData(EMPTY_FORM);
        setErrors({});
      } else {
        setServerError(res?.message || 'Submission failed. Please try again.');
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
    <motion.div
      {...fadeUpProps(reduce)}
      className={`bg-white border border-border p-8 sm:p-12 rounded-md w-full ${className}`}
    >
      <div className="max-w-2xl mx-auto">
      {submitSuccess ? (
        <div
          role="status"
          className="p-8 bg-surface border border-success/30 rounded-md text-ink space-y-4"
        >
          <div className="flex items-center space-x-3 text-success">
            <LuCircleCheck className="w-6 h-6 shrink-0" />
            <h4 className="font-abhaya text-2xl font-medium">
              Inquiry Successfully Received
            </h4>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Thank you for reaching out to Sabr Studio. Our principal designer will review your brief and contact you within two business days.
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
        <>
          {title && (
            <motion.h3
              {...fadeUpProps(reduce)}
              className="font-abhaya text-3xl sm:text-4xl text-ink font-medium tracking-tight mb-2 text-center"
            >
              {title}
            </motion.h3>
          )}
          {subtitle && (
            <p className="text-sm sm:text-base text-muted mb-8 leading-relaxed text-center">
              {subtitle}
            </p>
          )}
          {!subtitle && <div className="mb-6" />}

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
              type="text"
              label="Full Name"
              required
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your name"
              error={errors.name}
              autoComplete="name"
            />

            <TextInput
              id="enquiry-phone"
              name="phone"
              type="tel"
              label="Phone Number"
              required
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your phone number"
              error={errors.phone}
              autoComplete="tel"
            />

            <TextInput
              id="enquiry-email"
              name="email"
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your email"
              error={errors.email}
              autoComplete="email"
            />

            <Select
              id="enquiry-projectType"
              name="projectType"
              label="Project Type"
              required
              options={projectTypeOptions}
              placeholder="Select project type"
              value={formData.projectType}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.projectType}
            />

            <TextArea
              id="enquiry-message"
              name="message"
              label="Message"
              rows={5}
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about your project..."
              error={errors.message}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="Primary"
                label="Submit Inquiry"
                loading={submitting}
                className="w-full"
              />
            </div>
          </form>
        </>
      )}
      </div>
    </motion.div>
  );
};

export default EnquiryForm;
