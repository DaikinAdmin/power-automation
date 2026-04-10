"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { parseAddress, type AddressFields } from "@/helpers/address";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileFormProps {
  user: {
    name: string;
    email: string;
    phoneNumber?: string;
    countryCode?: string;
    vatNumber?: string;
    companyName?: string;
    companyPosition?: string;
    addressLine?: string;
  };
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("dashboard.profile");

  const parsedAddress = parseAddress(user.addressLine);

  const [name, setName] = useState(user.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? "");
  const [countryCode, setCountryCode] = useState(user.countryCode ?? "+48");
  const [vatNumber, setVatNumber] = useState(user.vatNumber ?? "");
  const [companyName, setCompanyName] = useState(user.companyName ?? "");
  const [companyPosition, setCompanyPosition] = useState(user.companyPosition ?? "");
  const [address, setAddress] = useState<AddressFields>(parsedAddress);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleAddressChange = (field: keyof AddressFields, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber, countryCode, vatNumber, companyName, companyPosition, address }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("saveError"));
      }

      setSuccess(true);
      // Refresh session so header etc. reflects new name
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t("email")}>
            <Input value={user.email} readOnly className="bg-gray-50 text-gray-500" />
          </Field>

          <Field label={`${t("name")} *`}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t("countryCode")}>
              <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="+48" />
            </Field>
            <Field label={t("phone")} className="col-span-2">
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="123-456-7890" />
            </Field>
          </div>

          <Field label={t("vatNumber")}>
            <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="PL1234567890" />
          </Field>

          <Field label={t("companyName")}>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>

          <Field label={t("companyPosition")}>
            <Input value={companyPosition} onChange={(e) => setCompanyPosition(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>{t("addressTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("address.country")}>
              <Input value={address.country} onChange={(e) => handleAddressChange("country", e.target.value)} placeholder="Польща" />
            </Field>
            <Field label={t("address.postalCode")}>
              <Input value={address.postalCode} onChange={(e) => handleAddressChange("postalCode", e.target.value)} placeholder="00-001" />
            </Field>
          </div>

          <Field label={t("address.city")}>
            <Input value={address.city} onChange={(e) => handleAddressChange("city", e.target.value)} placeholder="Варшава" />
          </Field>

          <Field label={t("address.street")}>
            <Input value={address.street} onChange={(e) => handleAddressChange("street", e.target.value)} placeholder="вул. Прикладна 12/3" />
          </Field>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600">{t("saveSuccess")}</p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
