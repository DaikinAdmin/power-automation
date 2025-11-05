import ResetPassword from '@/components/auth/reset-password'
import React, { Suspense } from 'react'

const ResetPasswordPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPassword />
    </Suspense>
  )
}

export default ResetPasswordPage