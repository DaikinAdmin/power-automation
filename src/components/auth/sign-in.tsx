"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import CardWrapper from "../card-wrapper";
import FormError from "../form-error";
import { FormSuccess } from "../form-success";

import { useAuthState } from "@/hooks/useAuthState";
import { signIn, useSession } from "@/lib/auth-client";
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

const SignIn = () => {
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
                                setSuccess("OTP has been sent to your email")
                                router.push("/two-factor")
                            } else if (response?.error) {
                                setError(response.error.message)
                            }
                        } else {
                            setSuccess("Logged in successfully.");
                            
                            // Small delay to ensure session is updated, then redirect based on role
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
            cardTitle="Sign In"
            cardDescription="Enter your details below to login to your account"
            cardFooterDescription="Don't have an account?"
            cardFooterLink="/signup"
            cardFooterLinkTitle="Sign up"
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
                                    {'Email'}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder={"Enter your email"}
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
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="password"
                                        placeholder="********"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                <Link
                                    href="/forgot-password"
                                    className="text-xs underline ml-60"
                                >
                                    Forgot Password?
                                </Link>
                            </FormItem>
                        )}
                    />
                    {/* Error & Success Messages */}
                    <FormError message={error} />
                    <FormSuccess message={success} />

                    {/* Submit Button */}
                    <Button disabled={loading} type="submit" className="w-full">
                        {"Login"}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    );
};

export default SignIn;