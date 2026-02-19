"use client"
import React from 'react'
import CardWrapper from '../card-wrapper'
import FormError from '../form-error'
import { FormSuccess } from '../form-success'
import { useAuthState } from '@/hooks/useAuthState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { SignupSchema, CompanySignupSchema, PrivateSignupSchema } from '@/helpers/zod/signup-schema'
import { signUp } from '@/lib/auth-client'
import { Eye, EyeOff, Building2, User } from 'lucide-react'
import Link from 'next/link'
import { europeanCountries } from '@/helpers/country-codes'
import { useLocale, useTranslations } from 'next-intl'

type UserType = 'company' | 'private' | null;

const SignUp = () => {
    const locale = useLocale();
    const t = useTranslations('auth.signUp');
    const [showPassword, setShowPassword] = React.useState(false);
    const [userType, setUserType] = React.useState<UserType>(null);
    const { error, success, loading, setLoading, setError, setSuccess, resetState } = useAuthState();
    const [acceptTerms, setAcceptTerms] = React.useState(false);

    const form = useForm<z.infer<typeof SignupSchema>>({
        resolver: zodResolver(SignupSchema),
        mode: "onBlur",
        defaultValues: {
            name: '',
            email: '',
            password: '',
            phoneNumber: '',
            country: '',
            addressLine: '',
            userType: 'private',
            userAgreement: false,
        } as any
    });

    const selectedCountry = form.watch('country');
    const countryEntry = europeanCountries.find(c => c.countryCode === selectedCountry);
    const phoneCode = countryEntry?.phoneCode ?? '';

    const handleSelectUserType = (type: 'company' | 'private') => {
        setUserType(type);
        form.reset({
            name: '',
            email: '',
            password: '',
            phoneNumber: '',
            country: '',
            addressLine: '',
            userType: type,
            userAgreement: false,
            ...(type === 'company' ? { companyName: '', vatNumber: '', companyPosition: 'owner' } : {}),
        } as any);
        setAcceptTerms(false);
    };

    const handleUserAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAcceptTerms(e.target.checked);
        form.setValue('userAgreement', e.target.checked);
    };

    const onSubmit = async (values: z.infer<typeof SignupSchema>) => {
        const country = europeanCountries.find(c => c.countryCode === values.country);
        const countryCode = country?.phoneCode ?? '+48';

        const signUpPayload: any = {
            name: values.name,
            email: values.email,
            password: values.password,
            phoneNumber: values.phoneNumber,
            countryCode,
            country: values.country,
            addressLine: values.addressLine,
            userType: values.userType,
            userAgreement: values.userAgreement,
            companyName: values.userType === 'company' ? (values as any).companyName : '',
            vatNumber: values.userType === 'company' ? (values as any).vatNumber : '',
            companyPosition: values.userType === 'company' ? (values as any).companyPosition : '',
            callbackURL: '/',
        };

        try {
            await signUp.email(signUpPayload, {
                onResponse: () => {
                    setLoading(false);
                },
                onRequest: () => {
                    resetState();
                    setLoading(true);
                },
                onSuccess: () => {
                    setSuccess("Verification link has been sent to your mail");
                },
                onError: (ctx: any) => {
                    setError(ctx.error.message);
                },
            });
        } catch (err) {
            console.error(err);
            setError("Something went wrong");
        }
    };

    // Step 1: User type selection
    if (userType === null) {
        return (
            <CardWrapper
                cardTitle={t('title')}
                cardDescription={t('selectTypeTitle')}
                cardFooterLink={`/signin`}
                cardFooterDescription={t('haveAccount')}
                cardFooterLinkTitle={t('signInLink')}
            >
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <button
                        type="button"
                        onClick={() => handleSelectUserType('company')}
                        className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-center"
                    >
                        <Building2 size={36} className="text-blue-600" />
                        <div>
                            <p className="font-semibold text-gray-800">{t('asCompany')}</p>
                            <p className="text-xs text-gray-500 mt-1">{t('asCompanyDesc')}</p>
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSelectUserType('private')}
                        className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-center"
                    >
                        <User size={36} className="text-blue-600" />
                        <div>
                            <p className="font-semibold text-gray-800">{t('asPrivate')}</p>
                            <p className="text-xs text-gray-500 mt-1">{t('asPrivateDesc')}</p>
                        </div>
                    </button>
                </div>
            </CardWrapper>
        );
    }

    // Step 2: Form fields
    return (
        <CardWrapper
            cardTitle={t('title')}
            cardDescription={userType === 'company' ? t('asCompany') : t('asPrivate')}
            cardFooterLink={`/signin`}
            cardFooterDescription={t('haveAccount')}
            cardFooterLinkTitle={t('signInLink')}
        >
            <Form {...form}>
                <form className='space-y-4' onSubmit={form.handleSubmit(onSubmit)}>
                    {/* Full Name */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('nameLabel')}</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={t('namePlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Email */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('emailLabel')}</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="email"
                                        placeholder={t('emailPlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('passwordLabel')}</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                {...form.register('password')}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                disabled={loading}
                            >
                                {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                            </button>
                        </div>
                        {form.formState.errors.password && (
                            <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
                        )}
                    </div>

                    {/* Country */}
                    <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('countryLabel')}</FormLabel>
                                <FormControl>
                                    <select
                                        {...field}
                                        disabled={loading}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">{t('countryPlaceholder')}</option>
                                        {europeanCountries.map(c => (
                                            <option key={c.countryCode} value={c.countryCode}>
                                                {c.name} ({c.phoneCode})
                                            </option>
                                        ))}
                                    </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Phone Number (auto-prefixed from country) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('phoneNumberLabel')}</label>
                        <div className="flex">
                            <span className="px-3 py-2 text-sm border border-gray-300 rounded-l-lg bg-gray-100 text-gray-700 min-w-[70px] flex items-center justify-center">
                                {phoneCode || '—'}
                            </span>
                            <input
                                type="tel"
                                {...form.register('phoneNumber')}
                                className="flex-1 px-3 py-2 text-sm border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={t('phoneNumberPlaceholder')}
                                disabled={loading}
                            />
                        </div>
                        {form.formState.errors.phoneNumber && (
                            <p className="text-xs text-red-500 mt-1">{form.formState.errors.phoneNumber.message}</p>
                        )}
                    </div>

                    {/* Address Line */}
                    <FormField
                        control={form.control}
                        name="addressLine"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('addressLineLabel')}</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={t('addressLinePlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Company-only fields */}
                    {userType === 'company' && (
                        <>
                            <FormField
                                control={form.control}
                                name={"companyName" as any}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('companyNameLabel')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                type="text"
                                                placeholder={t('companyNamePlaceholder')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={"vatNumber" as any}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('vatNumberLabel')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                disabled={loading}
                                                type="text"
                                                placeholder={t('vatNumberPlaceholder')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={"companyPosition" as any}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('positionLabel')}</FormLabel>
                                        <FormControl>
                                            <select
                                                {...field}
                                                disabled={loading}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="owner">{t('positionOwner')}</option>
                                                <option value="employee">{t('positionEmployee')}</option>
                                            </select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}

                    {/* Terms checkbox */}
                    <FormField
                        control={form.control}
                        name="userAgreement"
                        render={() => (
                            <FormItem>
                                <div className="flex items-start">
                                    <input
                                        type="checkbox"
                                        id="userAgreement"
                                        checked={acceptTerms}
                                        onChange={handleUserAgreementChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                    />
                                    <label htmlFor="userAgreement" className="ml-2 text-sm text-gray-700">
                                        {t('termsAccept')}{' '}
                                        <Link href={`/${locale}/terms`} className="text-blue-600 hover:text-blue-800 underline">
                                            {t('termsOfService')}
                                        </Link>
                                        {' '}{t('and')}{' '}
                                        <Link href={`/${locale}/privacy`} className="text-blue-600 hover:text-blue-800 underline">
                                            {t('userAgreement')}
                                        </Link>
                                    </label>
                                </div>
                            </FormItem>
                        )}
                    />

                    <FormError message={error} />
                    <FormSuccess message={success} />

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-1/3"
                            onClick={() => setUserType(null)}
                            disabled={loading}
                        >
                            {t('backButton')}
                        </Button>
                        <Button disabled={loading || !acceptTerms} type="submit" className="flex-1">
                            {t('signUpButton')}
                        </Button>
                    </div>
                </form>
            </Form>
        </CardWrapper>
    );
};

export default SignUp;
