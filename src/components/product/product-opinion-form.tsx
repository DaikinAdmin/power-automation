'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ProductOpinionFormProps {
  onSubmit: (data: { name: string; email: string; opinion: string }) => void;
}

export function ProductOpinionForm({ onSubmit }: ProductOpinionFormProps) {
  const [formData, setFormData] = useState({ name: '', email: '', opinion: '' });
  const t = useTranslations('product');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', email: '', opinion: '' });
  };

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-lg font-semibold">{t('opinion.title')}</h3>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t('opinion.namePlaceholder')}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder={t('opinion.emailPlaceholder')}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          value={formData.opinion}
          onChange={(e) => setFormData({ ...formData, opinion: e.target.value })}
          placeholder={t('opinion.opinionPlaceholder')}
          rows={3}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded bg-red-600 px-5 py-2 text-white hover:bg-red-700">
          {t('opinion.submit')}
        </button>
      </form>
    </div>
  );
}
