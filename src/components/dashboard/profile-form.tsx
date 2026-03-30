"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { parseAddress, formatAddress, type AddressFields } from "@/helpers/address";
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("email")}
            </label>
            <Input value={user.email} readOnly className="bg-gray-50 text-gray-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("name")} *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("countryCode")}
              </label>
              <Input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+48"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("phone")}
              </label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="123-456-7890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("vatNumber")}
            </label>
            <Input
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="PL1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("companyName")}
            </label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("companyPosition")}
            </label>
            <Input
              value={companyPosition}
              onChange={(e) => setCompanyPosition(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>{t("addressTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("address.country")}
              </label>
              <Input
                value={address.country}
                onChange={(e) => handleAddressChange("country", e.target.value)}
                placeholder="Польща"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("address.postalCode")}
              </label>
              <Input
                value={address.postalCode}
                onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                placeholder="00-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("address.city")}
            </label>
            <Input
              value={address.city}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              placeholder="Варшава"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("address.street")}
            </label>
            <Input
              value={address.street}
              onChange={(e) => handleAddressChange("street", e.target.value)}
              placeholder="вул. Прикладна 12/3"
            />
          </div>
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
