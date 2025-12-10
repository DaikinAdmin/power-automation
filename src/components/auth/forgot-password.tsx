"use client"
import { useForm } from 'react-hook-form'
import CardWrapper from '../card-wrapper'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import FormError from '../form-error'
import { FormSuccess } from '../form-success'
import { useAuthState } from '@/hooks/useAuthState'
import { authClient } from '@/lib/auth-client'
import { ForgotPasswordSchema } from '@/helpers/zod/forgot-password-schema'
import { useTranslations } from 'next-intl'


const ForgotPassword = () => {
  const t = useTranslations('auth.forgotPassword');
  const { error, success, loading, setError, setSuccess, setLoading, resetState } = useAuthState()

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: '',
    }
  })

  const onSubmit = async (values: z.infer<typeof ForgotPasswordSchema>) => {
    try {
      await authClient.forgetPassword({
        email: values.email,
        redirectTo: "/reset-password"
      }, {
        onResponse: () => {
          setLoading(false)
        },
        onRequest: () => {
          resetState()
          setLoading(true)
        },
        onSuccess: () => {
          setSuccess("Reset password link has been sent")
        },
        onError: (ctx) => {
          setError(ctx.error.message);
        },
      });

    } catch (error) {
      // console.log(error)
      setError("Something went wrong")
    }
  }

  return (
    <CardWrapper
      cardTitle={t('title')}
      cardDescription={t('subtitle')}
      cardFooterDescription={t('backToSignIn')}
      cardFooterLink='/signin'
      cardFooterLinkTitle={t('backToSignIn')}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          <FormError message={error} />
          <FormSuccess message={success} />
          <Button disabled={loading} type="submit" className='w-full'>{t('sendResetLink')}</Button>
        </form>
      </Form>

    </CardWrapper>
  )
}

export default ForgotPassword