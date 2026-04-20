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
import { SignupFormSchema, CompanySignupFormSchema, PrivateSignupFormSchema } from '@/helpers/zod/signup-schema'
import { signUp, authClient } from '@/lib/auth-client'
import { Eye, EyeOff, Building2, User } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { europeanCountries } from '@/helpers/country-codes'
import { useLocale, useTranslations } from 'next-intl'
import { formatAddress } from '@/helpers/address'
import { useDomainKey } from '@/hooks/useDomain'

/**
 * When Google OAuth is initiated from a non-primary domain (.com.ua), the state
 * cookie would be set on .com.ua but the OAuth callback always lands on .pl
 * (set by BETTER_AUTH_URL). This causes a state_mismatch error.
 *
 * Fix: route the callbackURL through the SSO bridge on .pl so the session is
 * transferred back to the origin domain after OAuth completes.
 */
function buildGoogleCallbackURL(callbackURL: string): string {
    if (typeof window === 'undefined') return callbackURL;

    const primaryUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!primaryUrl) return callbackURL;

    // Same domain — no bridge needed
    if (window.location.hostname === new URL(primaryUrl).hostname) return callbackURL;

    // Cross-domain: point callbackURL at the SSO bridge on the primary domain.
    const absoluteDest = new URL(callbackURL, window.location.origin).toString();
    return `${primaryUrl}/api/auth/sso-callback?dest=${encodeURIComponent(absoluteDest)}`;
}

type UserType = 'company' | 'private' | null;

interface SignUpProps {
    hideFooter?: boolean;
    className?: string;
    callbackURL?: string;
}

const SignUp = ({ hideFooter = false, className, callbackURL = "/" }: SignUpProps) => {
    const locale = useLocale();
    const t = useTranslations('auth.signUp');
    const [showPassword, setShowPassword] = React.useState(false);
    const [userType, setUserType] = React.useState<UserType>(null);
    const { error, success, loading, setLoading, setError, setSuccess, resetState } = useAuthState();
    const [acceptTerms, setAcceptTerms] = React.useState(false);

    const domainKey = useDomainKey();
    const domainCountry = domainKey === 'ua' ? 'UA' : 'PL';

    const form = useForm<z.infer<typeof SignupFormSchema>>({
        resolver: zodResolver(SignupFormSchema),
        mode: "onBlur",
        defaultValues: {
            name: '',
            email: '',
            password: '',
            phoneNumber: '',
            country: domainCountry,
            city: '',
            street: '',
            postalCode: '',
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
            country: domainCountry,
            city: '',
            street: '',
            postalCode: '',
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

    const onSubmit = async (values: z.infer<typeof SignupFormSchema>) => {
        const country = europeanCountries.find(c => c.countryCode === values.country);
        const countryCode = country?.phoneCode ?? '+48';

        const addressLine = formatAddress({
            country: values.country,
            city: (values as any).city ?? '',
            street: (values as any).street ?? '',
            postalCode: (values as any).postalCode ?? '',
        });

        const signUpPayload: any = {
            name: values.name,
            email: values.email,
            password: values.password,
            phoneNumber: values.phoneNumber,
            countryCode,
            country: values.country,
            addressLine,
            userType: values.userType,
            userAgreement: values.userAgreement,
            companyName: values.userType === 'company' ? (values as any).companyName : '',
            vatNumber: values.userType === 'company' ? (values as any).vatNumber : '',
            companyPosition: values.userType === 'company' ? (values as any).companyPosition : '',
            callbackURL: '/signin',
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
        const handleGoogleSignUp = async () => {
            resetState();
            setLoading(true);
            try {
                await authClient.signIn.social({
                    provider: 'google',
                    callbackURL: buildGoogleCallbackURL(callbackURL),
                });
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        return (
            <CardWrapper
                cardTitle={t('title')}
                cardDescription={t('selectTypeTitle')}
                cardFooterLink={hideFooter ? undefined : `/signin`}
                cardFooterDescription={hideFooter ? undefined : t('haveAccount')}
                cardFooterLinkTitle={hideFooter ? undefined : t('signInLink')}
                className={className}
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

                {/* Divider */}
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {t('orContinueWith')}
                        </span>
                    </div>
                </div>

                {/* Google Sign Up */}
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={handleGoogleSignUp}
                >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {t('googleButton')}
                </Button>
            </CardWrapper>
        );
    }

    // Step 2: Form fields
    return (
        <CardWrapper
            cardTitle={t('title')}
            cardDescription={userType === 'company' ? t('asCompany') : t('asPrivate')}
            cardFooterLink={hideFooter ? undefined : `/signin`}
            cardFooterDescription={hideFooter ? undefined : t('haveAccount')}
            cardFooterLinkTitle={hideFooter ? undefined : t('signInLink')}
            className={className}
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

                    {/* City */}
                    <FormField
                        control={form.control}
                        name={"city" as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t('cityLabel')}
                                    {userType === 'private' && (
                                        <span className="ml-1 text-xs text-gray-400 font-normal">({t('optional')})</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={t('cityPlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Street and number */}
                    <FormField
                        control={form.control}
                        name={"street" as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t('streetLabel')}
                                    {userType === 'private' && (
                                        <span className="ml-1 text-xs text-gray-400 font-normal">({t('optional')})</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={t('streetPlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Postal code */}
                    <FormField
                        control={form.control}
                        name={"postalCode" as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t('postalCodeLabel')}
                                    {userType === 'private' && (
                                        <span className="ml-1 text-xs text-gray-400 font-normal">({t('optional')})</span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={t('postalCodePlaceholder')}
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
                                        <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                                            {t('termsOfService')}
                                        </Link>
                                        {' '}{t('and')}{' '}
                                        <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
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

                    {/* Divider */}
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                {t('orContinueWith')}
                            </span>
                        </div>
                    </div>

                    {/* Google Sign Up */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                        onClick={async () => {
                            resetState();
                            setLoading(true);
                            try {
                                await authClient.signIn.social({
                                    provider: 'google',
                                    callbackURL: buildGoogleCallbackURL(callbackURL),
                                });
                            } catch (err) {
                                console.error(err);
                                setError('Something went wrong. Please try again.');
                                setLoading(false);
                            }
                        }}
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {t('googleButton')}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    );
};

export default SignUp;
