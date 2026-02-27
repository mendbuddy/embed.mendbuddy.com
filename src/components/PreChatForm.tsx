// ============================================================================
// Pre-Chat Form Component - Collects user info before chat
// ============================================================================

import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { PreChatField } from '../types';

interface PreChatFormProps {
  fields: PreChatField[];
  onSubmit: (data: Record<string, string>) => void;
  isLoading: boolean;
  primaryColor: string;
}

export function PreChatForm({
  fields,
  onSubmit,
  isLoading,
  primaryColor,
}: PreChatFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((f) => (initial[f.name] = ''));
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      const value = values[field.name]?.trim() || '';

      if (field.required && !value) {
        newErrors[field.name] = `${field.label} is required`;
        continue;
      }

      if (value) {
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid email';
        } else if (field.type === 'phone' && !/^[+]?[\d\s()-]{7,}$/.test(value)) {
          newErrors[field.name] = 'Please enter a valid phone number';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  };

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  return (
    <form class="mb-prechat" onSubmit={handleSubmit}>
      <div class="mb-prechat-title">Before we start</div>
      <div class="mb-prechat-subtitle">Please fill in your details to continue</div>

      {fields.map((field) => (
        <div key={field.name} class="mb-prechat-field">
          <label class="mb-prechat-label">
            {field.label}
            {field.required && <span class="mb-required">*</span>}
          </label>
          {field.type === 'select' && field.options ? (
            <select
              class="mb-prechat-input"
              value={values[field.name]}
              onChange={(e) =>
                handleChange(field.name, (e.target as HTMLSelectElement).value)
              }
              disabled={isLoading}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
              class="mb-prechat-input"
              value={values[field.name]}
              onInput={(e) =>
                handleChange(field.name, (e.target as HTMLInputElement).value)
              }
              placeholder={field.placeholder}
              disabled={isLoading}
            />
          )}
          {errors[field.name] && (
            <div class="mb-prechat-error">{errors[field.name]}</div>
          )}
        </div>
      ))}

      <button
        type="submit"
        class="mb-prechat-submit"
        style={{ backgroundColor: primaryColor }}
        disabled={isLoading}
      >
        {isLoading ? 'Submitting...' : 'Start Chat'}
      </button>
    </form>
  );
}
