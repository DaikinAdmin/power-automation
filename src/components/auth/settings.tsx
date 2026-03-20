"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { authClient, useSession } from "@/lib/auth-client";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useForm } from "react-hook-form";
import { PasswordSchema } from "@/helpers/zod/signup-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormSuccess } from "../form-success";
import FormError from "../form-error";
import { useAuthState } from "@/hooks/useAuthState";
import { SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import type { SupportedCurrency } from "@/helpers/currency";

const CURRENCIES: { code: SupportedCurrency; label: string }[] = [
  { code: "EUR", label: "EUR (€)" },
  { code: "USD", label: "USD ($)" },
  { code: "PLN", label: "PLN (zł)" },
  { code: "UAH", label: "UAH (₴)" },
];

const Settings = () => {
  const { data } = useSession();
  const [open, setOpen] = useState<boolean>(false);
  const {
    error,
    success,
    loading,
    setLoading,
    setSuccess,
    setError,
    resetState,
  } = useAuthState();
  const t = useTranslations("header");
  const ts = useTranslations("settings");
  const { currencyCode, setCurrency } = useCurrency();

  const form = useForm<z.infer<typeof PasswordSchema>>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  if (data?.user.twoFactorEnabled === null) {
    return;
  }

  const onSubmit = async (values: z.infer<typeof PasswordSchema>) => {
    if (data?.user.twoFactorEnabled === false) {
      await authClient.twoFactor.enable(
        { password: values.password },
        {
          onResponse: () => setLoading(false),
          onRequest: () => { resetState(); setLoading(true); },
          onSuccess: () => {
            setSuccess(ts("twoFaEnabled"));
            setTimeout(() => { setOpen(false); resetState(); form.reset(); }, 1000);
          },
          onError: (ctx) => setError(ctx.error.message),
        },
      );
    }
    if (data?.user.twoFactorEnabled === true) {
      await authClient.twoFactor.disable(
        { password: values.password },
        {
          onResponse: () => setLoading(false),
          onRequest: () => { resetState(); setLoading(true); },
          onSuccess: () => {
            setSuccess(ts("twoFaDisabled"));
            setTimeout(() => { setOpen(false); resetState(); form.reset(); }, 1000);
          },
          onError: (ctx) => setError(ctx.error.message),
        },
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ts("confirmTitle")}</DialogTitle>
            <DialogDescription>{ts("confirmDescription")}</DialogDescription>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ts("password")}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormSuccess message={success} />
                <FormError message={error} />
                <Button type="submit" className="w-full mt-4" disabled={loading}>
                  {ts("submit")}
                </Button>
              </form>
            </Form>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {data?.session && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={"ghost"}>
              <SettingsIcon size={16} />
              {t("settings")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{ts("title")}</DialogTitle>
              <DialogDescription>{ts("description")}</DialogDescription>
            </DialogHeader>

            {/* Currency selector */}
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm">{ts("currency")}</CardTitle>
                <CardDescription className="text-xs">{ts("currencyDescription")}</CardDescription>
                <Select
                  value={currencyCode}
                  onValueChange={(value) => setCurrency(value as SupportedCurrency)}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(({ code, label }) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
            </Card>

            {/* 2FA toggle */}
            <Card>
              <CardHeader className="p-4 flex flex-row justify-between">
                <div>
                  <CardTitle className="text-sm">{ts("twoFa")}</CardTitle>
                  <CardDescription className="text-xs">{ts("twoFaDescription")}</CardDescription>
                </div>
                <Switch
                  checked={data?.user.twoFactorEnabled ?? false}
                  onCheckedChange={() => setOpen(true)}
                />
              </CardHeader>
            </Card>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Settings;
