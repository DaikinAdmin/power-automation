'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { INVENTORY_COLUMNS } from './column-defs';
import type { InventoryColumnKey } from '@/types/analytics';

interface ColumnConfigModalProps {
  visible: Set<InventoryColumnKey>;
  onChange: (visible: Set<InventoryColumnKey>) => void;
}

const GROUPS = ['identifiers', 'names', 'warehouse', 'stock', 'pricing'] as const;
type Group = (typeof GROUPS)[number];

export function ColumnConfigModal({ visible, onChange }: ColumnConfigModalProps) {
  const t = useTranslations('adminDashboard.analytics.inventory');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<InventoryColumnKey>>(new Set(visible));

  const handleOpenChange = (val: boolean) => {
    if (val) setDraft(new Set(visible));
    setOpen(val);
  };

  const toggle = (key: InventoryColumnKey) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (group: Group) => {
    const keys = INVENTORY_COLUMNS.filter((c) => c.group === group).map((c) => c.key);
    const allOn = keys.every((k) => draft.has(k));
    setDraft((prev) => {
      const next = new Set(prev);
      if (allOn) keys.forEach((k) => next.delete(k));
      else keys.forEach((k) => next.add(k));
      return next;
    });
  };

  const resetDefaults = () => {
    setDraft(
      new Set(INVENTORY_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
    );
  };

  const apply = () => {
    onChange(new Set(draft));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="h-4 w-4 mr-2" />
          {t('columnConfig.title')}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('columnConfig.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{t('columnConfig.description')}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
          {GROUPS.map((group) => {
            const cols = INVENTORY_COLUMNS.filter((c) => c.group === group);
            const allOn = cols.every((c) => draft.has(c.key));
            const someOn = cols.some((c) => draft.has(c.key));
            return (
              <div key={group} className="space-y-2">
                {/* Group header with select-all toggle */}
                <div className="flex items-center gap-2 pb-1 border-b">
                  <Checkbox
                    id={`grp-${group}`}
                    checked={allOn}
                    data-state={someOn && !allOn ? 'indeterminate' : undefined}
                    onCheckedChange={() => toggleGroup(group)}
                  />
                  <label
                    htmlFor={`grp-${group}`}
                    className="text-sm font-semibold cursor-pointer"
                  >
                    {t(`columnConfig.groups.${group}`)}
                  </label>
                </div>

                {/* Column checkboxes */}
                <div className="space-y-1.5 pl-2">
                  {cols.map((col) => (
                    <div key={col.key} className="flex items-center gap-2">
                      <Checkbox
                        id={col.key}
                        checked={draft.has(col.key)}
                        onCheckedChange={() => toggle(col.key)}
                      />
                      <label htmlFor={col.key} className="text-sm cursor-pointer">
                        {t(`columns.${col.key}`)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={resetDefaults}>
            {t('columnConfig.resetDefaults')}
          </Button>
          <Button size="sm" onClick={apply}>
            {t('columnConfig.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
