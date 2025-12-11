"use client"

import { Button } from '../ui/button'
import { authClient, signOut } from '@/lib/auth-client'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

const SignOut = () => {
  const locale = useLocale();
    const router = useRouter()
    const session = authClient.useSession()

    if(!session.data) {
      return (
        <Button variant="ghost" onClick={() => {router.push(`/${locale}/signin`)}}>
          Login
        </Button>
      )
    }

  return (
    <Button variant="ghost" className="text-red-500"
    onClick={async() => {await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push(`/${locale}/signin`)
        }
      }
    })}}
    >Logout</Button>
  )
}

export default SignOut