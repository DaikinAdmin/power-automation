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
import { SignupSchema } from '@/helpers/zod/signup-schema'
import { signUp } from '@/lib/auth-client'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { countryCodes } from '@/helpers/country-codes'

const SignUp = () => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
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
            companyName: '',
            companyWebpage: '',
            companyRole: '',
            countryCode: '+48',
            role: 'USER',
            userAgreement: false
        }
    })

    const handleUserAgreementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAcceptTerms(e.target.checked);
        form.setValue('userAgreement', e.target.checked);
    };

    const onSubmit = async (values: z.infer<typeof SignupSchema>) => {
        setIsLoading(true);
        try {
            await signUp.email({
                name: values.name,
                email: values.email,
                password: values.password,
                // @ts-ignore 
                companyName: values.companyName,
                companyWebpage: values.companyWebpage,
                companyRole: values.companyRole,
                phoneNumber: values.phoneNumber,
                countryCode: values.countryCode,
                userAgreement: values.userAgreement,
                role: values.role,
                callbackURL: '/'
            }, {
                onResponse: () => {
                    setLoading(false)
                },
                onRequest: () => {
                    resetState()
                    setLoading(true)
                },
                onSuccess: () => {
                    setSuccess("Verification link has been sent to your mail")
                },
                onError: (ctx) => {
                    setError(ctx.error.message);
                },
            });
        } catch (error) {
            console.error(error)
            setError("Something went wrong")
        }
        setIsLoading(false);
    }

    function handleSelectCountryCode(e: React.ChangeEvent<HTMLSelectElement>): void {
        const selectedCode = e.target.value;
        form.setValue('countryCode', selectedCode);
    }
    return (
        <CardWrapper
            cardTitle='SignUp'
            cardDescription='Create an new account'
            cardFooterLink='/signin'
            cardFooterDescription='Already have an account?'
            cardFooterLinkTitle='Signin'
        >
            <Form {...form}>
                <form className='space-y-4' onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="text"
                                        placeholder='John Doe'
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        disabled={loading}
                                        type="email"
                                        placeholder='example@gmail.com'
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <div className="flex">
                        <select
                          defaultValue={form.getValues('countryCode')}
                          onChange={(e) => handleSelectCountryCode(e)}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          {countryCodes.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.code} ({item.country})
                            </option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          defaultValue={form.getValues('phoneNumber')}
                          onChange={(e) => form.setValue('phoneNumber', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="123-456-7890"
                          required
                        />
                      </div>
                    </div>
            <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          defaultValue={form.getValues("password")}
                          onChange={(e) => form.setValue('password', e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff size={20} className="text-gray-400" /> : <Eye size={20} className="text-gray-400" />}
                        </button>
                      </div>
                    </div>
            <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                            <Input
                                disabled={loading}
                                type="text"
                                placeholder='ABC Limited'
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="companyWebpage"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company WebPage</FormLabel>
                        <FormControl>
                            <Input
                                disabled={loading}
                                type="text"
                                placeholder='https://www.abc.com'
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="companyRole"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Company Role</FormLabel>
                        <FormControl>
                            <Input
                                disabled={loading}
                                type="text"
                                placeholder='e.g. Delivery Manager'
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="userAgreement"
                render={({ field }) => (
                    <FormItem>
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                id="userAgreement"
                                checked={acceptTerms}
                                onChange={(e) => handleUserAgreementChange(e)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                                
                            />
                            <label htmlFor="userAgreement" className="ml-2 text-sm text-gray-700">
                                I accept the{' '}
                                <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">
                                    Terms of Service
                                </Link>
                                {' '}and{' '}
                                <Link href="/privacy" className="text-blue-600 hover:text-blue-800 underline">
                                    User Agreement
                                </Link>
                            </label>
                        </div>
                    </FormItem>
                )}
            />
            <FormError message={error} />
            <FormSuccess message={success} />
            <Button disabled={loading || !acceptTerms} type="submit" className='w-full'>Submit</Button>
        </form>
            </Form >
        </CardWrapper >
    )
}

export default SignUp