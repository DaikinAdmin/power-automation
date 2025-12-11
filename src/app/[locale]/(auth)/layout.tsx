import React from 'react'
import LanguageSwitcher from '@/components/languge-switcher'

const AuthLayout = ({children}: {children: React.ReactNode}) => {
  return (
    <div className='relative w-screen min-h-screen'>
      <div className='absolute top-4 right-4 z-10'>
        <LanguageSwitcher />
      </div>
      <div className='flex items-center justify-center w-full min-h-screen p-4'>
        {children}
      </div>
    </div>
  )
}

export default AuthLayout