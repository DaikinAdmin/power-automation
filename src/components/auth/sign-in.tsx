"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";

import CardWrapper from "../card-wrapper";
import FormError from "../form-error";
import { FormSuccess } from "../form-success";

import { useAuthState } from "@/hooks/useAuthState";
import { signIn, authClient } from "@/lib/auth-client";
import { redirectAfterLogin } from "@/helpers/auth/redirect-after-login";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

// Import the schemas (adjusted to match likely export)
import { requestOTP } from "@/helpers/auth/request-otp";
import TraditionalSignInSchema from "@/helpers/zod/login-schema";

/**
 * When Google OAuth is initiated from a non-primary domain (.com.ua), the state
 * cookie would be set on .com.ua but the OAuth callback always lands on .pl
 * (set by BETTER_AUTH_URL). This causes a state_mismatch error.
 *
 * Fix: route the callbackURL through the SSO bridge on .pl so the session is
 * transferred back to the origin domain after OAuth completes.
 */
function buildGoogleCallbackURL(callbackURL: string): string {
    if (typeof window === "undefined") return callbackURL;

    const primaryUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!primaryUrl) return callbackURL;

    // Same domain — no bridge needed
    if (window.location.hostname === new URL(primaryUrl).hostname) return callbackURL;

    // Cross-domain: point callbackURL at the SSO bridge on the primary domain.
    // After OAuth, the bridge redirects to sso-exchange on the origin domain
    // which sets a proper session cookie there.
    const absoluteDest = new URL(callbackURL, window.location.origin).toString();
    return `${primaryUrl}/api/auth/sso-callback?dest=${encodeURIComponent(absoluteDest)}`;
}

interface SignInProps {
    onLoginSuccess?: () => void;
    hideFooter?: boolean;
    className?: string;
    callbackURL?: string;
}

const SignIn = ({ onLoginSuccess, hideFooter = false, className, callbackURL = "/" }: SignInProps) => {
    const locale = useLocale();
    const t = useTranslations('auth.signIn');
    const router = useRouter();
    const {
        error,
        success,
        loading,
        setSuccess,
        setError,
        setLoading,
        resetState
    } = useAuthState();

    // Infer schemas from the union


    // Dynamically select schema based on sign-in method
    const currentSchema = TraditionalSignInSchema;

    const form = useForm<z.infer<typeof currentSchema>>({
        resolver: zodResolver(currentSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleGoogleSignIn = async () => {
        resetState();
        setLoading(true);
        try {
            await authClient.signIn.social({
                provider: "google",
                callbackURL: buildGoogleCallbackURL(callbackURL),
            });
        } catch (err) {
            console.error(err);
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof currentSchema>) => {
        resetState();
        setLoading(true);

        try {
            // Traditional sign-in
            const signInValues = values as z.infer<typeof TraditionalSignInSchema>;
            // Determine if input is email or username
            const response = await signIn.email(
                {
                    email: signInValues.email,
                    password: signInValues.password
                },
                {
                    onRequest: () => setLoading(true),
                    onResponse: () => setLoading(false),
                    onSuccess: async (ctx) => {
                        if (ctx.data.twoFactorRedirect) {
                            const response = await requestOTP()
                            if (response?.data) {
                                setSuccess(t('success.otpSent'))
                                router.push(`/two-factor`)
                            } else if (response?.error) {
                                setError(response.error.message)
                            }
                        } else {
                            setSuccess(t('success.loggedIn'));
                            if (onLoginSuccess) {
                                onLoginSuccess();
                            } else {
                                router.replace(`/`);
                            }
                        }
                    },
                    onError: (ctx) => {
                        setError(
                            ctx.error.message || "Email login failed. Please try again."
                        );
                    },
                }
            );
            setTimeout(() => redirectAfterLogin(response.data?.user.id, router), 100);
        } catch (err) {
            console.error(err);
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <CardWrapper
            cardTitle={t('title')}
            cardDescription={t('subtitle')}
            cardFooterDescription={hideFooter ? undefined : t('noAccount')}
            cardFooterLink={hideFooter ? undefined : `/signup`}
            cardFooterLinkTitle={hideFooter ? undefined : t('signUpLink')}
            showCloseButton={!hideFooter}
            closeButtonLink="/"
            className={className}
        >
            <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                    {/* Email or Username Field */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {t('emailLabel')}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={t('emailPlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Password Field (only for traditional sign-in) */}
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('passwordLabel')}</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="password"
                                        placeholder={t('passwordPlaceholder')}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                <Link
                                    href="/forgot-password"
                                    className="text-xs underline ml-60"
                                >
                                    {t('forgotPassword')}
                                </Link>
                            </FormItem>
                        )}
                    />
                    {/* Error & Success Messages */}
                    <FormError message={error} />
                    <FormSuccess message={success} />

                    {/* Submit Button */}
                    <Button disabled={loading} type="submit" className="w-full">
                        {t('signInButton')}
                    </Button>

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

                    {/* Google Sign In */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                        onClick={handleGoogleSignIn}
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

export default SignIn;